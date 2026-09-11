import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { supabase, productToSupabaseRow, supabaseRowToProduct } from '../lib/supabase';
import { handleFirestoreError, OperationType, isQuotaError, isFirestoreQuotaExceeded } from '../lib/firestoreUtils';
import { isPantProduct, getCleanProductSizes } from '../utils/productSizeHelper';

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

const DEMO_PRODUCT_IDS = new Set(['1', '2', '3', '4', '5', '6', '8', '9']);
const DEMO_NAMES = [
  'executive white formal shirt',
  'sky blue royal oxford shirt',
  'midnight black slim fit shirt',
  'essential oversized t-shirt',
  'vintage wash graphic tee',
  'classic black formal pant',
  'premium silk blend shirt',
  'ash grey chino pant'
];

// Deleted products memory/localStorage tracking to avoid race condition resurrection
const getDeletedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('eleganbd_deleted_product_ids');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

const addDeletedId = (id: string) => {
  try {
    const set = getDeletedIds();
    set.add(String(id));
    localStorage.setItem('eleganbd_deleted_product_ids', JSON.stringify(Array.from(set)));
  } catch {}
};

const removeDeletedId = (id: string) => {
  try {
    const set = getDeletedIds();
    set.delete(String(id));
    localStorage.setItem('eleganbd_deleted_product_ids', JSON.stringify(Array.from(set)));
  } catch {}
};

export const isDemoProduct = (p: Product | null | undefined): boolean => {
  if (!p) return false;
  const deletedSet = getDeletedIds();
  if (p.id && deletedSet.has(String(p.id))) return true;
  if (p.id && DEMO_PRODUCT_IDS.has(p.id)) return true;
  const name = (p.name || '').trim().toLowerCase();
  if (DEMO_NAMES.some(dn => name === dn || name.includes('essential oversized') || name.includes('executive white') || name.includes('vintage wash graphic'))) return true;
  return false;
};

const deduplicateProducts = (list: Product[]): Product[] => {
  const seen = new Set<string>();
  const deletedSet = getDeletedIds();
  return list.filter(p => {
    if (!p.id) return false;
    const strId = String(p.id);
    if (deletedSet.has(strId)) return false;
    if (seen.has(strId)) return false;
    seen.add(strId);
    return true;
  });
};

function cleanFirestoreData(data: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.keys(data).forEach(key => {
    const val = data[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        cleaned[key] = cleanFirestoreData(val);
      } else {
        cleaned[key] = val;
      }
    }
  });
  return cleaned;
}

const normalizeProductCategory = (p: Product): Product => {
  let category = p.category || '';
  const lowerCategory = category.toLowerCase().trim();
  if (lowerCategory === 'formal shirt' || lowerCategory === 'formal-shirt' || lowerCategory === 'premium formal shirt' || lowerCategory === 'premium-formal-shirt') {
    category = 'Formal Shirt';
  } else if (lowerCategory === 'drop shoulder t-shirt' || lowerCategory === 'drop-shoulder-t-shirt' || lowerCategory === 'panjabi' || lowerCategory === 'polo t-shirt' || lowerCategory === 'polo-t-shirt' || lowerCategory === 'polo t shirt') {
    category = 'Polo T-shirt';
  } else if (lowerCategory === 'casual shirt' || lowerCategory === 'casual-shirt') {
    category = 'Casual Shirt';
  } else if (lowerCategory === 'woman palazzo' || lowerCategory === 'formal pant' || lowerCategory === 'formal-pant' || lowerCategory.includes('pant') || lowerCategory.includes('chino') || lowerCategory.includes('trouser') || lowerCategory.includes('jeans')) {
    category = 'Formal Pant';
  } else if (lowerCategory === 'premium shirt' || lowerCategory === 'premium-shirt') {
    category = 'Premium Shirt';
  }

  const isPant = isPantProduct({ ...p, category });

  // Clean sizeStock & sizes
  const rawSizeStock = (p.sizeStock && typeof p.sizeStock === 'object') ? p.sizeStock : {};
  const cleanedSizeStock: Record<string, number> = {};
  
  let validSizes = getCleanProductSizes({ ...p, category });

  if (isPant) {
    // For pants: strictly enforce 28-40 numeric waist sizes and guarantee each has usable stock
    const defaultStockPerSize = Math.max(5, Math.floor((p.stock || 35) / validSizes.length));
    validSizes.forEach(sz => {
      const existingVal = Number(rawSizeStock[sz]);
      cleanedSizeStock[sz] = (!isNaN(existingVal) && existingVal > 0) ? existingVal : defaultStockPerSize;
    });

    // Auto-heal in Firestore if this product previously had invalid letter sizes (M, L, XL, etc.)
    if (p.id && Array.isArray(p.sizes) && p.sizes.some(s => /[a-zA-Z]/.test(String(s)))) {
      try {
        updateDoc(doc(db, 'products', p.id), {
          sizes: validSizes,
          sizeStock: cleanedSizeStock
        }).catch(() => {});
      } catch (e) {}
    }
  } else {
    validSizes.forEach(sz => {
      cleanedSizeStock[sz] = Math.max(0, Number(rawSizeStock[sz]) || 0);
    });
  }

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

const mergeProductsWithLocalCache = (incoming: Product[], local: Product[]): Product[] => {
  const localMap = new Map<string, Product>();
  local.forEach(p => {
    if (p.id) localMap.set(p.id, p);
  });

  const mergedMap = new Map<string, Product>();

  incoming.forEach(inc => {
    const loc = localMap.get(inc.id);
    if (!loc) {
      mergedMap.set(inc.id, inc);
    } else {
      const locUpdatedAt = (loc as any).updatedAt || 0;
      const incUpdatedAt = (inc as any).updatedAt || 0;
      if (locUpdatedAt > incUpdatedAt) {
        mergedMap.set(inc.id, loc);
      } else {
        mergedMap.set(inc.id, { ...loc, ...inc });
      }
    }
  });

  local.forEach(loc => {
    if (!mergedMap.has(loc.id)) {
      mergedMap.set(loc.id, loc);
    }
  });

  return Array.from(mergedMap.values());
};

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const locallySaved = localStorage.getItem('eleganbd_products');
      if (locallySaved !== null) {
        const parsed = JSON.parse(locallySaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonDemo = parsed.filter(p => !isDemoProduct(p));
          return deduplicateProducts(nonDemo.map(normalizeProductCategory));
        }
      }
    } catch (e) {}
    return [];
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [offerProductIds, setOfferProductIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_offers');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      const cached = localStorage.getItem('eleganbd_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonDemo = parsed.filter(p => !isDemoProduct(p));
          setProducts(deduplicateProducts(nonDemo.map(normalizeProductCategory)));
        }
      }
    } catch (e) {}
    setLoading(false);
  }, []);

  // Sync across browser tabs & windows in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eleganbd_products' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const nonDemo = parsed.filter(p => !isDemoProduct(p));
            setProducts(deduplicateProducts(nonDemo.map(normalizeProductCategory)));
          }
        } catch (err) {}
      }
    };

    const handleCustomSync = () => {
      try {
        const cached = localStorage.getItem('eleganbd_products');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const nonDemo = parsed.filter(p => !isDemoProduct(p));
            setProducts(deduplicateProducts(nonDemo.map(normalizeProductCategory)));
          }
        }
      } catch (err) {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('eleganbd_products_updated', handleCustomSync);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('eleganbd_products_updated', handleCustomSync);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // A. Fetch from Supabase
    const loadFromSupabase = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data) && data.length > 0 && isMounted) {
          const mapped: Product[] = data.map(supabaseRowToProduct);
          const nonDemo = mapped.filter(p => !isDemoProduct(p));
          const normalized = deduplicateProducts(nonDemo.map(normalizeProductCategory));
          setProducts(normalized);
          try {
            localStorage.setItem('eleganbd_products', JSON.stringify(normalized));
            localStorage.setItem('eleganbd_products_last_fetched', Date.now().toString());
          } catch (e) {}
        }
      } catch (err) {
        console.warn('[ProductContext] Supabase load notice:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFromSupabase();

    // B. Real-time Supabase subscription
    let supabaseChannel: any = null;
    try {
      supabaseChannel = supabase
        .channel('realtime_products_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = supabaseRowToProduct(payload.new as any);
            if (!isDemoProduct(p)) {
              const norm = normalizeProductCategory(p);
              setProducts(prev => {
                const filtered = prev.filter(item => item.id !== norm.id);
                const next = deduplicateProducts([norm, ...filtered]);
                try { localStorage.setItem('eleganbd_products', JSON.stringify(next)); } catch {}
                return next;
              });
            }
          } else if (payload.eventType === 'DELETE' && payload.old && (payload.old as any).id) {
            const deletedId = String((payload.old as any).id);
            setProducts(prev => {
              const next = deduplicateProducts(prev.filter(p => p.id !== deletedId));
              try { localStorage.setItem('eleganbd_products', JSON.stringify(next)); } catch {}
              return next;
            });
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('[ProductContext] Supabase channel notice:', e);
    }

    if (isFirestoreQuotaExceeded) {
      setLoading(false);
      return () => {
        isMounted = false;
        if (supabaseChannel) {
          try { supabase.removeChannel(supabaseChannel); } catch {}
        }
      };
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

    // 2. Real-time products listener (Firestore fallback)
    const productsCol = collection(db, 'products');
    const unsubProducts = onSnapshot(productsCol, (snapshot) => {
      const prodData: Product[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Product;
        const p = {
          ...data,
          id: docSnap.id
        };
        if (!isDemoProduct(p)) {
          prodData.push(p);
        }
      });

      const normalized = deduplicateProducts(prodData.map(normalizeProductCategory));
      setProducts(normalized);
      try {
        localStorage.setItem('eleganbd_products', JSON.stringify(normalized));
        localStorage.setItem('eleganbd_products_last_fetched', Date.now().toString());
      } catch (e) {}
      setLoading(false);
    }, (err) => {
      if (!isQuotaError(err)) {
        handleFirestoreError(err, OperationType.GET, 'products');
      }
      setLoading(false);
    });

    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubOffers();
      unsubProducts();
      if (supabaseChannel) {
        try { supabase.removeChannel(supabaseChannel); } catch {}
      }
    };
  }, []);

  const addProduct = async (product: Product) => {
    // If this ID was previously marked deleted, unmark it
    if (product.id) {
      removeDeletedId(product.id);
    }

    const productWithTimestamps = cleanFirestoreData({
      ...product,
      createdAt: (product as any).createdAt || Date.now(),
      updatedAt: Date.now()
    }) as Product;

    // 1. Optimistic local state & cache update immediately
    setProducts(prev => {
      const next = deduplicateProducts([productWithTimestamps, ...prev.filter(p => p.id !== productWithTimestamps.id)]);
      try {
        localStorage.setItem('eleganbd_products', JSON.stringify(next));
        window.dispatchEvent(new Event('eleganbd_products_updated'));
      } catch (e) {}
      return next;
    });

    // 2. Direct Server API save (bypasses client security rules & ensures backend persistence)
    try {
      await fetch('/api/products/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productWithTimestamps })
      });
    } catch (apiErr) {
      console.warn('[ProductContext] Server API save notice:', apiErr);
    }

    // 3. Save to Supabase directly
    try {
      const sbRow = productToSupabaseRow(productWithTimestamps);
      const { error: sbError } = await supabase.from('products').upsert(sbRow);
      if (sbError) {
        console.warn('[ProductContext] Supabase product add notice:', sbError.message);
      } else {
        console.log(`[ProductContext] Product "${product.name}" synced to Supabase successfully!`);
      }
    } catch (sbErr) {
      console.warn('[ProductContext] Supabase add product error:', sbErr);
    }

    // 4. Save to Firestore directly
    try {
      const docRef = doc(db, 'products', product.id);
      await setDoc(docRef, productWithTimestamps);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${product.id}`);
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    if (updatedProduct.id) {
      removeDeletedId(updatedProduct.id);
    }

    const updatedData = cleanFirestoreData({
      ...updatedProduct,
      updatedAt: Date.now()
    }) as Product;

    // 1. Optimistic local state update immediately
    setProducts(prev => {
      const next = prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedData } : p);
      const uniqueNext = deduplicateProducts(next);
      try {
        localStorage.setItem('eleganbd_products', JSON.stringify(uniqueNext));
        window.dispatchEvent(new Event('eleganbd_products_updated'));
      } catch (e) {}
      return uniqueNext;
    });

    // 2. Direct Server API save
    try {
      await fetch('/api/products/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: updatedData })
      });
    } catch (apiErr) {
      console.warn('[ProductContext] Server API save notice:', apiErr);
    }

    // 3. Update in Supabase
    try {
      const sbRow = productToSupabaseRow(updatedData);
      const { error: sbError } = await supabase.from('products').upsert(sbRow);
      if (sbError) {
        console.warn('[ProductContext] Supabase product update notice:', sbError.message);
      }
    } catch (sbErr) {
      console.warn('[ProductContext] Supabase update product error:', sbErr);
    }

    // 4. Update in Firestore
    try {
      const docRef = doc(db, 'products', updatedProduct.id);
      await setDoc(docRef, updatedData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updatedProduct.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    const cleanId = String(id);
    
    // Add to deleted blacklist immediately
    addDeletedId(cleanId);

    // 1. Optimistic local state update immediately
    setProducts(prev => {
      const next = prev.filter(p => p.id !== cleanId);
      const uniqueNext = deduplicateProducts(next);
      try {
        localStorage.setItem('eleganbd_products', JSON.stringify(uniqueNext));
        window.dispatchEvent(new Event('eleganbd_products_updated'));
      } catch (e) {}
      return uniqueNext;
    });

    // 2. Direct Server API delete (bypasses client security rules & eliminates database record)
    try {
      await fetch('/api/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId })
      });
    } catch (apiErr) {
      console.warn('[ProductContext] Server API delete notice:', apiErr);
    }

    // 3. Delete in Supabase
    try {
      await supabase.from('products').delete().eq('id', cleanId);
    } catch (sbErr) {
      console.warn('[ProductContext] Supabase delete product error:', sbErr);
    }

    // 4. Delete in Firestore
    try {
      await deleteDoc(doc(db, 'products', cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${cleanId}`);
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
