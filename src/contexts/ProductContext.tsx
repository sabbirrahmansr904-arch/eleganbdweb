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

export const CANONICAL_DEFAULT_PRODUCTS: Product[] = [];

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
  if (!p || !p.id) return true;
  const strId = String(p.id).toLowerCase();
  if (strId.startsWith('fp-') || strId.startsWith('fs-') || strId.startsWith('demo-') || strId === 'demo') {
    return true;
  }
  const name = (p.name || '').trim().toLowerCase();
  if (!name || name === 'unnamed product' || name === 'untitled product' || name === 'unnamed') {
    return true;
  }
  // Filter out any template/mock formal shirts that use demo unsplash urls
  if (name.includes("men's premium formal shirt") && Array.isArray(p.images) && p.images.some(img => img.includes('unsplash.com'))) {
    return true;
  }
  return false;
};

export const getCanonicalProductKey = (p: Product): string => {
  if (!p || typeof p !== 'object') return '';
  
  const rawId = String(p.id || '').trim().toLowerCase();
  const rawSku = (p.sku || '').trim().toLowerCase();
  const rawName = (p.name || '').trim().toLowerCase();
  const rawColor = (p.color || '').trim().toLowerCase();
  const rawCat = (p.category || '').trim().toLowerCase();
  
  const isPant = rawCat.includes('pant') || rawName.includes('pant') || rawCat.includes('trouser') || rawName.includes('trouser');
  const isShirt = rawCat.includes('shirt') || rawName.includes('shirt') || rawCat.includes('polo') || rawName.includes('polo');
  const catPrefix = isPant ? 'pant' : isShirt ? 'shirt' : 'other';

  // 1. Explicit Serial Code matching like (Code: FP 1), FP-01, Code-1, FP 1, FS 2, etc.
  const fullSearchStr = `${rawSku} ${rawName} ${rawId} ${rawColor}`;
  const explicitCodeMatch = fullSearchStr.match(/\b(?:code|fp|fs|pant|shirt)[\s:#_-]*0*(\d+)\b/i);
  if (explicitCodeMatch && explicitCodeMatch[1]) {
    return `${catPrefix}_code_${parseInt(explicitCodeMatch[1], 10)}`;
  }

  // 2. Normalized SKU matching
  const cleanSku = rawSku.replace(/[^a-z0-9]/g, '');
  if (cleanSku && cleanSku.length >= 2) {
    const skuCodeMatch = cleanSku.match(/^(?:fp|fs|p|s|pant|shirt)0*(\d+)$/i);
    if (skuCodeMatch && skuCodeMatch[1]) {
      return `${catPrefix}_code_${parseInt(skuCodeMatch[1], 10)}`;
    }
    return `sku_${cleanSku}`;
  }

  // 3. Normalized Name + Color (e.g. Formal Pant Deep Black)
  const cleanName = rawName
    .replace(/\(code:?[^\)]*\)/gi, '')
    .replace(/code:?\s*[a-z0-9_-]+/gi, '')
    .replace(/[^a-z0-9]/g, '');

  const cleanColor = rawColor.replace(/[^a-z0-9]/g, '');

  if (cleanName && cleanColor) {
    return `${catPrefix}_${cleanName}_${cleanColor}`;
  }

  if (cleanName && cleanName.length > 5) {
    return `${catPrefix}_${cleanName}`;
  }

  return rawId ? `id_${rawId}` : '';
};

export const deduplicateProducts = (list: Product[]): Product[] => {
  if (!Array.isArray(list)) return [];
  const canonicalMap = new Map<string, Product>();
  const idMap = new Map<string, Product>();

  for (const p of list) {
    if (!p || !p.id || isDemoProduct(p)) continue;
    const strId = String(p.id).trim().toLowerCase();
    const canonKey = getCanonicalProductKey(p);

    const existingById = idMap.get(strId);
    const existingByCanon = canonKey ? canonicalMap.get(canonKey) : undefined;
    const existing = existingById || existingByCanon;

    if (!existing) {
      if (canonKey) canonicalMap.set(canonKey, p);
      idMap.set(strId, p);
    } else {
      // Determine which product is higher fidelity:
      // Real uploaded/custom images beat demo Unsplash fallback images
      const pHasCustomImg = Array.isArray(p.images) && p.images.some(img => img && !img.includes('unsplash.com') && img.length > 10);
      const exHasCustomImg = Array.isArray(existing.images) && existing.images.some(img => img && !img.includes('unsplash.com') && img.length > 10);

      const pIsDefault = strId.startsWith('fp-') || strId.startsWith('fs-');
      const exIsDefault = String(existing.id).toLowerCase().startsWith('fp-') || String(existing.id).toLowerCase().startsWith('fs-');

      let winner = existing;
      if (pHasCustomImg && !exHasCustomImg) {
        winner = p;
      } else if (!pIsDefault && exIsDefault) {
        winner = p;
      } else {
        const pUpdated = (p as any).updatedAt || (p as any).createdAt ? new Date((p as any).updatedAt || (p as any).createdAt).getTime() : 0;
        const exUpdated = (existing as any).updatedAt || (existing as any).createdAt ? new Date((existing as any).updatedAt || (existing as any).createdAt).getTime() : 0;
        if (pUpdated > exUpdated) {
          winner = p;
        }
      }

      // Merge product metadata to prevent loss of stock, sizes, or descriptions
      const merged: Product = {
        ...existing,
        ...p,
        ...winner,
        images: (winner.images && winner.images.length > 0) ? winner.images : (existing.images || p.images || []),
        image: winner.image || existing.image || p.image || ''
      };

      if (canonKey) canonicalMap.set(canonKey, merged);
      idMap.set(String(merged.id).trim().toLowerCase(), merged);
    }
  }

  return Array.from(idMap.values());
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
  if (!p || typeof p !== 'object') return p;
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

  // Strictly respect the user's selected sizes and allocated quantities
  const rawSizeStock = (p.sizeStock && typeof p.sizeStock === 'object') ? p.sizeStock : {};
  const cleanedSizeStock: Record<string, number> = {};
  
  // Use product's saved sizes if available
  const rawSizes = Array.isArray(p.sizes) ? p.sizes.map(String).filter(Boolean) : [];
  const validSizes = rawSizes.length > 0 ? rawSizes : getCleanProductSizes({ ...p, category });

  validSizes.forEach(sz => {
    const existingVal = rawSizeStock[sz];
    if (existingVal !== undefined && existingVal !== null && !isNaN(Number(existingVal))) {
      cleanedSizeStock[sz] = Math.max(0, Number(existingVal));
    } else {
      cleanedSizeStock[sz] = 0;
    }
  });

  // Calculate total stock directly from the size quantities sum
  let calculatedStock = 0;
  if (validSizes.length > 0) {
    calculatedStock = validSizes.reduce((sum, sz) => sum + (cleanedSizeStock[sz] || 0), 0);
  } else if (Object.keys(rawSizeStock).length > 0) {
    calculatedStock = Object.values(cleanedSizeStock).reduce((sum, v) => sum + (v || 0), 0);
  } else {
    calculatedStock = Math.max(0, Number(p.stock) || 0);
  }

  // Ensure images array and main image string are strictly in sync
  const images = (Array.isArray(p.images) && p.images.length > 0)
    ? p.images.filter(Boolean)
    : (p.image ? [p.image] : []);
  const mainImage = images[0] || p.image || '';

  return {
    ...p,
    category,
    stock: calculatedStock,
    images: images,
    image: mainImage,
    sizes: validSizes,
    sizeStock: cleanedSizeStock
  };
};

const mergeProductsWithLocalCache = (incoming: Product[], local: Product[]): Product[] => {
  const combined = [...incoming.filter(p => !isDemoProduct(p)), ...local.filter(p => !isDemoProduct(p))];
  return deduplicateProducts(combined);
};

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const locallySaved = localStorage.getItem('eleganbd_products');
      let baseList: Product[] = [];
      if (locallySaved !== null) {
        const parsed = JSON.parse(locallySaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed.filter(p => !isDemoProduct(p)).map(normalizeProductCategory);
        }
      }
      
      if (baseList.length === 0) {
        baseList = CANONICAL_DEFAULT_PRODUCTS.filter(p => !isDemoProduct(p)).map(normalizeProductCategory);
      }

      const canonSeen = new Set<string>();
      const map = new Map<string, Product>();
      baseList.forEach(p => {
        if (!isDemoProduct(p)) {
          map.set(String(p.id), p);
          const cKey = getCanonicalProductKey(p);
          if (cKey) canonSeen.add(cKey);
        }
      });

      // Only add canonical default products if not already represented in baseList
      CANONICAL_DEFAULT_PRODUCTS.forEach(can => {
        const canKey = getCanonicalProductKey(can);
        if (!isDemoProduct(can) && !map.has(String(can.id)) && (!canKey || !canonSeen.has(canKey))) {
          map.set(String(can.id), normalizeProductCategory(can));
          if (canKey) canonSeen.add(canKey);
        }
      });

      return deduplicateProducts(Array.from(map.values())).filter(p => !isDemoProduct(p));
    } catch (e) {}
    return deduplicateProducts(CANONICAL_DEFAULT_PRODUCTS.filter(p => !isDemoProduct(p)));
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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data) && data.length > 0) {
        const mapped: Product[] = data.map(supabaseRowToProduct);
        const nonDeleted = mapped.filter(p => !isDemoProduct(p));
        const normalized = deduplicateProducts(nonDeleted.map(normalizeProductCategory));
        setProducts(normalized);
        try {
          localStorage.setItem('eleganbd_products', JSON.stringify(normalized));
          localStorage.setItem('eleganbd_products_last_fetched', Date.now().toString());
        } catch (e) {}
        setLoading(false);
        return;
      }

      const cached = localStorage.getItem('eleganbd_products');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const nonDeleted = parsed.filter(p => !isDemoProduct(p));
          setProducts(deduplicateProducts(nonDeleted.map(normalizeProductCategory)));
          setLoading(false);
          return;
        }
      }
      setProducts(CANONICAL_DEFAULT_PRODUCTS.filter(p => !isDemoProduct(p)));
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
            const nonDeleted = parsed.filter(p => !isDemoProduct(p));
            setProducts(deduplicateProducts(nonDeleted.map(normalizeProductCategory)));
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
            const nonDeleted = parsed.filter(p => !isDemoProduct(p));
            setProducts(deduplicateProducts(nonDeleted.map(normalizeProductCategory)));
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

    // A. Fetch from Supabase and Server API
    const loadFromSupabase = async () => {
      setLoading(true);
      try {
        let loadedProducts: Product[] = [];

        // Try direct backend Server API first (guarantees cross-device availability regardless of client ISP/firewall/CORS)
        try {
          const apiRes = await fetch('/api/products', { cache: 'no-store' });
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (json.success && Array.isArray(json.products) && json.products.length > 0) {
              loadedProducts = json.products.map(supabaseRowToProduct);
            }
          }
        } catch (apiErr) {
          console.warn('[ProductContext] Server API products fetch notice:', apiErr);
        }

        // If server API did not return products, try client-side Supabase query
        if (loadedProducts.length === 0) {
          try {
            const { data, error } = await supabase
              .from('products')
              .select('*')
              .order('created_at', { ascending: false });

            if (!error && data && Array.isArray(data) && data.length > 0) {
              loadedProducts = data.map(supabaseRowToProduct);
            }
          } catch (clientSbErr) {
            // Silently handle Supabase offline/quota limits
          }
        }

        if (loadedProducts.length > 0 && isMounted) {
          const nonDeleted = loadedProducts.filter(p => !isDemoProduct(p));
          const normalized = deduplicateProducts(nonDeleted.map(normalizeProductCategory));
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
      const uniqueSubId = Math.random().toString(36).substring(2, 9);
      supabaseChannel = supabase
        .channel(`realtime_products_${uniqueSubId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = supabaseRowToProduct(payload.new as any);
            if (!isDemoProduct(p)) {
              const norm = normalizeProductCategory(p);
              setProducts(prev => {
                const filtered = prev.filter(item => String(item.id) !== String(norm.id) && !isDemoProduct(item));
                const next = deduplicateProducts([norm, ...filtered]);
                try { localStorage.setItem('eleganbd_products', JSON.stringify(next)); } catch {}
                return next;
              });
            }
          } else if (payload.eventType === 'DELETE' && payload.old && (payload.old as any).id) {
            const deletedId = String((payload.old as any).id);
            addDeletedId(deletedId);
            setProducts(prev => {
              const next = deduplicateProducts(prev.filter(p => String(p.id) !== deletedId && !isDemoProduct(p)));
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

    // 2. Real-time products listener (Firestore primary real-time stream)
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

      if (prodData.length > 0) {
        const normalized = deduplicateProducts(prodData.map(normalizeProductCategory)).filter(p => !isDemoProduct(p));
        setProducts(normalized);
        try {
          localStorage.setItem('eleganbd_products', JSON.stringify(normalized));
          localStorage.setItem('eleganbd_products_last_fetched', Date.now().toString());
        } catch (e) {}
      }
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

    const updatedImages = (Array.isArray(updatedProduct.images) && updatedProduct.images.length > 0)
      ? updatedProduct.images.filter(Boolean)
      : (updatedProduct.image ? [updatedProduct.image] : []);
    const mainImg = updatedImages[0] || updatedProduct.image || '';

    const updatedData = cleanFirestoreData({
      ...updatedProduct,
      images: updatedImages,
      image: mainImg,
      updatedAt: Date.now()
    }) as Product;

    // 1. Optimistic local state update immediately
    setProducts(prev => {
      const next = prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedData } : p);
      const normalizedNext = next.map(normalizeProductCategory);
      const uniqueNext = deduplicateProducts(normalizedNext);
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
