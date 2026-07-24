import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { PRODUCTS as INITIAL_PRODUCTS } from '../constants';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  loading: boolean;
  offerProductIds: string[];
  updateOfferProducts: (ids: string[]) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    // Optimistically load from localStorage or constants so the UI doesn't blink
    try {
      const locallySaved = localStorage.getItem('eleganbd_products');
      if (locallySaved !== null) {
        let parsed = JSON.parse(locallySaved);
        if (Array.isArray(parsed)) {
          // Normalize categories
          parsed = parsed.map(p => {
             let category = p.category || '';
             const lowerCategory = category.toLowerCase().trim();
             if (lowerCategory === 'formal shirt' || lowerCategory === 'formal-shirt' || lowerCategory === 'premium formal shirt' || lowerCategory === 'premium-formal-shirt') {
               category = 'Formal Shirt';
             } else if (lowerCategory === 'drop shoulder t-shirt' || lowerCategory === 'drop-shoulder-t-shirt' || lowerCategory === 'panjabi') {
               category = 'Polo T-shirt';
             } else if (lowerCategory === 'polo t-shirt' || lowerCategory === 'polo-t-shirt' || lowerCategory === 'polo t shirt' || lowerCategory === 'polo t-shirt') {
               category = 'Polo T-shirt';
             } else if (lowerCategory === 'casual shirt' || lowerCategory === 'casual-shirt' || lowerCategory === 'woman palazzo' || lowerCategory === 'formal pant' || lowerCategory === 'formal-pant') {
               if (lowerCategory === 'casual shirt' || lowerCategory === 'casual-shirt') {
                 category = 'Formal Pant';
               } else {
                 category = 'Formal Pant';
               }
             } else if (lowerCategory === 'premium shirt' || lowerCategory === 'premium-shirt') {
               category = 'Premium Shirt';
             }
             
             return {
               ...p,
               id: p.id || Math.random().toString(36).substr(2, 9),
               category,
               stock: p.stock || 0,
               images: p.images || [],
               sizes: p.sizes || [],
               sizeStock: p.sizeStock || {}
             };
          });
          return parsed;
        }
      }
    } catch(e) {}
    return INITIAL_PRODUCTS;
  });
  const [loading, setLoading] = useState(true);
  const [offerProductIds, setOfferProductIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_offers');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'offers'));
        if (snap.exists()) {
          const ids = snap.data().productIds || [];
          setOfferProductIds(ids);
          localStorage.setItem('eleganbd_offers', JSON.stringify(ids));
        }
      } catch (err) {
        console.error("Failed to fetch offers config:", err);
      }
    };
    fetchOffers();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      // Check for cache first
      const cached = localStorage.getItem('eleganbd_products');
      const lastFetched = localStorage.getItem('eleganbd_products_last_fetched');
      const ONE_HOUR = 60 * 60 * 1000;
      
      if (cached && lastFetched && (Date.now() - parseInt(lastFetched) < ONE_HOUR)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const productsCol = collection(db, 'products');
        const snapshot = await getDocs(productsCol);
        
        const prodData: Product[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as Product;
          prodData.push({
            ...data,
            id: doc.id,
            stock: data.stock || 0,
            images: data.images || [],
            sizes: data.sizes || [],
            sizeStock: data.sizeStock || {}
          });
        });

        if (prodData.length > 0) {
          const normalizedData = prodData.map(p => {
             let category = p.category || '';
             const lowerCategory = category.toLowerCase().trim();
             if (lowerCategory === 'formal shirt' || lowerCategory === 'formal-shirt' || lowerCategory === 'premium formal shirt' || lowerCategory === 'premium-formal-shirt') {
               category = 'Formal Shirt';
             } else if (lowerCategory === 'drop shoulder t-shirt' || lowerCategory === 'drop-shoulder-t-shirt' || lowerCategory === 'panjabi') {
               category = 'Polo T-shirt';
             } else if (lowerCategory === 'polo t-shirt' || lowerCategory === 'polo-t-shirt' || lowerCategory === 'polo t shirt' || lowerCategory === 'polo t-shirt') {
               category = 'Polo T-shirt';
             } else if (lowerCategory === 'casual shirt' || lowerCategory === 'casual-shirt' || lowerCategory === 'woman palazzo' || lowerCategory === 'formal pant' || lowerCategory === 'formal-pant') {
               if (lowerCategory === 'casual shirt' || lowerCategory === 'casual-shirt') {
                 category = 'Formal Pant';
               } else {
                 category = 'Formal Pant';
               }
             } else if (lowerCategory === 'premium shirt' || lowerCategory === 'premium-shirt') {
               category = 'Premium Shirt';
             }
             return { ...p, category };
          });
          setProducts(normalizedData);
          localStorage.setItem('eleganbd_products', JSON.stringify(normalizedData));
          localStorage.setItem('eleganbd_products_last_fetched', Date.now().toString());
        }
      } catch (err: any) {
        if (!err?.message?.includes('resource-exhausted') && !err?.message?.includes('Quota limit exceeded')) {
          console.error("Product fetch error:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // Still optionally listen for changes if admin to keep UI synced, but only if not on a massive scale
    // For now, let's remove onSnapshot to save quota
  }, [isAdmin]);

  const addProduct = async (product: Product) => {
    try {
      const docRef = doc(db, 'products', product.id);
      const productWithTimestamps = {
        ...product,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(docRef, productWithTimestamps);
      
      setProducts(prev => {
        const next = [productWithTimestamps, ...prev];
        try {
          localStorage.setItem('eleganbd_products', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${product.id}`);
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      const docRef = doc(db, 'products', updatedProduct.id);
      const updatedData = {
        ...updatedProduct,
        updatedAt: Date.now()
      };
      await setDoc(docRef, updatedData, { merge: true });
      
      setProducts(prev => {
        const next = prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedData } : p);
        try {
          localStorage.setItem('eleganbd_products', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updatedProduct.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(prev => {
        const next = prev.filter(p => p.id !== id);
        try {
          localStorage.setItem('eleganbd_products', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
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
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, loading, offerProductIds, updateOfferProducts }}>
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
