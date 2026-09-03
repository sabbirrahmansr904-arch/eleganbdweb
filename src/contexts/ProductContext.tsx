import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { PRODUCTS as INITIAL_PRODUCTS } from '../constants';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType, isQuotaError, isFirestoreQuotaExceeded } from '../lib/firestoreUtils';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  loading: boolean;
  offerProductIds: string[];
  updateOfferProducts: (ids: string[]) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const deduplicateProducts = (list: Product[]): Product[] => {
  const seen = new Set<string>();
  return list.filter(p => {
    if (!p.id) return false;
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
};

const normalizeProductCategory = (p: Product): Product => {
  let category = p.category || '';
  const lowerCategory = category.toLowerCase().trim();
  if (lowerCategory === 'formal shirt' || lowerCategory === 'formal-shirt' || lowerCategory === 'premium formal shirt' || lowerCategory === 'premium-formal-shirt') {
    category = 'Formal Shirt';
  } else if (lowerCategory === 'drop shoulder t-shirt' || lowerCategory === 'drop-shoulder-t-shirt' || lowerCategory === 'panjabi' || lowerCategory === 'polo t-shirt' || lowerCategory === 'polo-t-shirt' || lowerCategory === 'polo t shirt') {
    category = 'Polo T-shirt';
  } else if (lowerCategory === 'casual shirt' || lowerCategory === 'casual-shirt' || lowerCategory === 'woman palazzo' || lowerCategory === 'formal pant' || lowerCategory === 'formal-pant') {
    category = 'Formal Pant';
  } else if (lowerCategory === 'premium shirt' || lowerCategory === 'premium-shirt') {
    category = 'Premium Shirt';
  }

  // Clean sizeStock & sizes
  const rawSizeStock = (p.sizeStock && typeof p.sizeStock === 'object') ? p.sizeStock : {};
  const cleanedSizeStock: Record<string, number> = {};
  
  let validSizes: string[] = Array.isArray(p.sizes) ? p.sizes.filter(Boolean) : [];
  if (validSizes.length === 0 && Object.keys(rawSizeStock).length > 0) {
    validSizes = Object.keys(rawSizeStock).filter(k => k !== 'stock' && k !== 'total' && k !== 'undefined');
  }

  // Ensure all configured sizes have a non-negative number
  validSizes.forEach(sz => {
    cleanedSizeStock[sz] = Math.max(0, Number(rawSizeStock[sz]) || 0);
  });

  // Calculate actual total stock strictly from size breakdown if sizes exist
  let calculatedStock = 0;
  if (validSizes.length > 0) {
    calculatedStock = validSizes.reduce((sum, sz) => sum + (cleanedSizeStock[sz] || 0), 0);
  } else if (Object.keys(rawSizeStock).length > 0) {
    calculatedStock = Object.values(cleanedSizeStock).reduce((sum, v) => sum + (v || 0), 0);
  } else {
    calculatedStock = Math.max(0, Number(p.stock) || 0);
  }

  return {
    ...p,
    category,
    stock: calculatedStock,
    images: p.images || [],
    sizes: validSizes,
    sizeStock: cleanedSizeStock
  };
};

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const locallySaved = localStorage.getItem('eleganbd_products');
      if (locallySaved !== null) {
        const parsed = JSON.parse(locallySaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return deduplicateProducts(parsed.map(normalizeProductCategory));
        }
      }
    } catch (e) {}
    return INITIAL_PRODUCTS;
  });

  const [loading, setLoading] = useState(false);
  const [offerProductIds, setOfferProductIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_offers');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const { isAdmin } = useAuth();

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      const cached = localStorage.getItem('eleganbd_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(deduplicateProducts(parsed.map(normalizeProductCategory)));
        }
      }
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isFirestoreQuotaExceeded) {
      setLoading(false);
      return;
    }

    // 1. Real-time offers listener
    const unsubOffers = onSnapshot(doc(db, 'config', 'offers'), (snap) => {
      if (snap.exists()) {
        const ids = snap.data().productIds || [];
        setOfferProductIds(ids);
        try {
          localStorage.setItem('eleganbd_offers', JSON.stringify(ids));
        } catch {}
      }
    }, (err) => {
      if (!isQuotaError(err)) {
        console.warn('[ProductContext] Offers listener notice:', err);
      }
    });

    // 2. Real-time products listener (Firestore is primary real-time database)
    const productsCol = collection(db, 'products');
    getDocs(productsCol).then((snapshot) => {
      const prodData: Product[] = [];
      snapshot.forEach(docSnap => {
        prodData.push({
          ...(docSnap.data() as Product),
          id: docSnap.id
        });
      });

      if (prodData.length > 0) {
        const normalized = deduplicateProducts(prodData.map(normalizeProductCategory));
        setProducts(normalized);
        try {
          localStorage.setItem('eleganbd_products', JSON.stringify(normalized));
          localStorage.setItem('eleganbd_products_last_fetched', Date.now().toString());
        } catch (e) {}
      }
      setLoading(false);
    }).catch((err) => {
      if (!isQuotaError(err)) {
        handleFirestoreError(err, OperationType.GET, 'products');
      }
      // If Firestore has temporary quota or network pause, keep local cache
      setLoading(false);
    });

    return () => {
      unsubOffers();
    };
  }, []);

  const addProduct = async (product: Product) => {
    const productWithTimestamps = {
      ...product,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 1. Save to Firestore
    try {
      const docRef = doc(db, 'products', product.id);
      await setDoc(docRef, productWithTimestamps);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${product.id}`);
    }

    // 2. Optimistic local state & cache update
    setProducts(prev => {
      const next = deduplicateProducts([productWithTimestamps, ...prev]);
      try {
        localStorage.setItem('eleganbd_products', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const updateProduct = async (updatedProduct: Product) => {
    const updatedData = {
      ...updatedProduct,
      updatedAt: Date.now()
    };

    // 1. Update in Firestore
    try {
      const docRef = doc(db, 'products', updatedProduct.id);
      await setDoc(docRef, updatedData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updatedProduct.id}`);
    }

    // 2. Optimistic local state update
    setProducts(prev => {
      const next = prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedData } : p);
      const uniqueNext = deduplicateProducts(next);
      try {
        localStorage.setItem('eleganbd_products', JSON.stringify(uniqueNext));
      } catch (e) {}
      return uniqueNext;
    });
  };

  const deleteProduct = async (id: string) => {
    // 1. Delete in Firestore
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }

    // 2. Optimistic local state update
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      const uniqueNext = deduplicateProducts(next);
      try {
        localStorage.setItem('eleganbd_products', JSON.stringify(uniqueNext));
      } catch (e) {}
      return uniqueNext;
    });
  };

  const updateOfferProducts = async (ids: string[]) => {
    try {
      await setDoc(doc(db, 'config', 'offers'), { productIds: ids });
      setOfferProductIds(ids);
      localStorage.setItem('eleganbd_offers', JSON.stringify(ids));
    } catch (error) {
      console.error("Failed to update offers config:", error);
      throw error;
    }
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, loading, offerProductIds, updateOfferProducts, refreshProducts }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
