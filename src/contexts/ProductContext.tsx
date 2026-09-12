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

export const CANONICAL_DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'fp-1',
    sku: 'FP-01',
    name: "Men's Luxury Formal Pant - Deep Black (Code: FP 1)",
    price: 790,
    regularPrice: 1250,
    description: "Premium Gabardine Stretch Woven Cotton formal pant with modern tailored slim fit. Anti-wrinkle, breathable and highly durable for all-day executive and occasion wear.",
    category: 'Formal Pant',
    color: 'Deep Black',
    fabric: 'Gabardine Stretch Cotton',
    fitType: 'Tailored Slim Fit',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['28', '30', '32', '34', '36', '38'],
    stock: 120,
    sizeStock: { '28': 20, '30': 25, '32': 30, '34': 25, '36': 15, '38': 5 },
    newArrival: true,
    featured: true,
    bestSelling: true,
    rating: 5,
    isTopRated: true
  },
  {
    id: 'fp-2',
    sku: 'FP-02',
    name: "Men's Luxury Formal Pant - Navy Blue (Code: FP 2)",
    price: 790,
    regularPrice: 1250,
    description: "Refined Royal Navy Blue Gabardine Stretch formal pant. Perfect pair for formal shirts, blazers and executive office look.",
    category: 'Formal Pant',
    color: 'Navy Blue',
    fabric: 'Gabardine Stretch Cotton',
    fitType: 'Tailored Slim Fit',
    images: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['28', '30', '32', '34', '36', '38'],
    stock: 110,
    sizeStock: { '28': 15, '30': 25, '32': 30, '34': 20, '36': 15, '38': 5 },
    newArrival: true,
    featured: true,
    bestSelling: true,
    rating: 5,
    isTopRated: true
  },
  {
    id: 'fp-3',
    sku: 'FP-03',
    name: "Men's Luxury Formal Pant - Ash Grey (Code: FP 3)",
    price: 790,
    regularPrice: 1250,
    description: "Classic Ash Grey executive formal pant crafted from high-density stretch gabardine fabric. Smooth texture and superior comfort.",
    category: 'Formal Pant',
    color: 'Ash Grey',
    fabric: 'Gabardine Stretch Cotton',
    fitType: 'Tailored Slim Fit',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['28', '30', '32', '34', '36', '38'],
    stock: 95,
    sizeStock: { '28': 15, '30': 20, '32': 25, '34': 20, '36': 10, '38': 5 },
    newArrival: true,
    featured: true,
    bestSelling: true,
    rating: 5,
    isTopRated: true
  },
  {
    id: 'fp-4',
    sku: 'FP-04',
    name: "Men's Luxury Formal Pant - Charcoal Grey (Code: FP 4)",
    price: 790,
    regularPrice: 1250,
    description: "Deep Charcoal Grey formal pant. Premium heavy gabardine stretch with impeccable finish and comfort.",
    category: 'Formal Pant',
    color: 'Charcoal Grey',
    fabric: 'Gabardine Stretch Cotton',
    fitType: 'Tailored Slim Fit',
    images: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['28', '30', '32', '34', '36', '38'],
    stock: 105,
    sizeStock: { '28': 15, '30': 25, '32': 30, '34': 20, '36': 10, '38': 5 },
    newArrival: true,
    featured: true,
    bestSelling: true,
    rating: 5,
    isTopRated: true
  },
  {
    id: 'fp-5',
    sku: 'FP-05',
    name: "Men's Luxury Formal Pant - Olive Green (Code: FP 5)",
    price: 790,
    regularPrice: 1250,
    description: "Distinctive Olive Green formal pant. Elegant earthy tone tailored to perfection for trendsetters.",
    category: 'Formal Pant',
    color: 'Olive Green',
    fabric: 'Gabardine Stretch Cotton',
    fitType: 'Tailored Slim Fit',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['28', '30', '32', '34', '36', '38'],
    stock: 90,
    sizeStock: { '28': 10, '30': 20, '32': 25, '34': 20, '36': 10, '38': 5 },
    newArrival: true,
    featured: true,
    bestSelling: true,
    rating: 5,
    isTopRated: true
  },
  {
    id: 'fp-6',
    sku: 'FP-06',
    name: "Men's Luxury Formal Pant - Coffee Brown (Code: FP 6)",
    price: 790,
    regularPrice: 1250,
    description: "Rich Coffee Brown Gabardine formal pant. Sophisticated warm color palette with excellent stretch recovery.",
    category: 'Formal Pant',
    color: 'Coffee Brown',
    fabric: 'Gabardine Stretch Cotton',
    fitType: 'Tailored Slim Fit',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['28', '30', '32', '34', '36', '38'],
    stock: 85,
    sizeStock: { '28': 10, '30': 20, '32': 25, '34': 15, '36': 10, '38': 5 },
    newArrival: true,
    featured: true,
    bestSelling: true,
    rating: 5,
    isTopRated: true
  },
  {
    id: 'fp-7',
    sku: 'FP-07',
    name: "Men's Luxury Formal Pant - Khaki Beige (Code: FP 7)",
    price: 790,
    regularPrice: 1250,
    description: "Versatile Khaki Beige Gabardine formal pant. An essential staple for smart casual and corporate wear.",
    category: 'Formal Pant',
    color: 'Khaki Beige',
    fabric: 'Gabardine Stretch Cotton',
    fitType: 'Tailored Slim Fit',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['28', '30', '32', '34', '36', '38'],
    stock: 95,
    sizeStock: { '28': 15, '30': 20, '32': 25, '34': 20, '36': 10, '38': 5 },
    newArrival: true,
    featured: true,
    bestSelling: true,
    rating: 5,
    isTopRated: true
  },
  {
    id: 'fs-1',
    sku: 'FS-01',
    name: "Men's Premium Formal Shirt - WHITE",
    price: 699,
    regularPrice: 1050,
    description: "100% Refine Cotton royal executive white formal shirt. Crisp collar, tailored fit, breathable all day.",
    category: 'Formal Shirt',
    color: 'White',
    fabric: 'Refine Cotton 100%',
    fitType: 'Regular Slim Fit',
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['M', 'L', 'XL', 'XXL'],
    stock: 140,
    sizeStock: { 'M': 35, 'L': 45, 'XL': 40, 'XXL': 20 },
    newArrival: true,
    featured: true,
    bestSelling: true,
    rating: 5,
    isTopRated: true
  },
  {
    id: 'fs-2',
    sku: 'FS-02',
    name: "Men's Premium Formal Shirt - BLACK",
    price: 699,
    regularPrice: 1050,
    description: "Premium Midnight Black Refine Cotton formal shirt. Elegant, fade-resistant rich black fabric.",
    category: 'Formal Shirt',
    color: 'Black',
    fabric: 'Refine Cotton 100%',
    fitType: 'Regular Slim Fit',
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['M', 'L', 'XL', 'XXL'],
    stock: 130,
    sizeStock: { 'M': 30, 'L': 45, 'XL': 35, 'XXL': 20 },
    newArrival: true,
    featured: true,
    bestSelling: true,
    rating: 5,
    isTopRated: true
  }
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
  if (!p) return true;
  const deletedSet = getDeletedIds();
  if (p.id && deletedSet.has(String(p.id))) return true;
  
  // STRICT RULE: Only products with a valid SKU are allowed
  const sku = (p.sku || '').trim();
  if (!sku) return true;

  const name = (p.name || '').trim().toLowerCase();
  // Filter out unnamed or corrupt records
  if (!name || name === 'unnamed product' || name === 'untitled product' || name === 'unnamed') {
    return true;
  }

  // Must have a valid price
  if (!p.price || Number(p.price) <= 0) {
    return true;
  }

  return false;
};

export const getCanonicalProductKey = (p: Product): string => {
  if (!p || typeof p !== 'object') return '';
  
  const sku = (p.sku || '').trim().toLowerCase();
  const name = (p.name || '').trim().toLowerCase();
  const color = (p.color || '').trim().toLowerCase();
  const category = (p.category || '').trim().toLowerCase();

  // If SKU is present and unique (e.g. FP-01, FP-02)
  if (sku && sku.length >= 3) {
    return `sku_${sku}`;
  }

  // Check for explicit product code (e.g. Code: FP 1, FP-01, Code 1)
  const fullText = `${name} ${sku} ${color}`;
  const codeMatch = fullText.match(/\b(?:code|fp|fs)[\s-_#]*0*(\d+)\b/i);
  if (codeMatch && codeMatch[1]) {
    const isPant = category.includes('pant') || name.includes('pant');
    const prefix = isPant ? 'pant' : 'shirt';
    return `${prefix}_code_${parseInt(codeMatch[1], 10)}`;
  }

  const normName = name.replace(/[^a-z0-9]/g, '');
  const normColor = color.replace(/[^a-z0-9]/g, '');

  if (normName && normColor) {
    return `nc_${normName}_${normColor}`;
  }

  if (normName) {
    return `n_${normName}`;
  }

  return `id_${String(p.id || '').toLowerCase()}`;
};

const deduplicateProducts = (list: Product[]): Product[] => {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set<string>();
  const seenCanonical = new Set<string>();
  const deletedSet = getDeletedIds();

  return list.filter(p => {
    if (!p || !p.id) return false;
    const strId = String(p.id).trim();
    if (!strId || deletedSet.has(strId)) return false;

    const lowerId = strId.toLowerCase();
    if (seenIds.has(lowerId)) return false;

    const canonicalKey = getCanonicalProductKey(p);
    if (canonicalKey && seenCanonical.has(canonicalKey)) return false;

    seenIds.add(lowerId);
    if (canonicalKey) seenCanonical.add(canonicalKey);
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
  const localMap = new Map<string, Product>();
  local.forEach(p => {
    if (p && p.id) localMap.set(p.id, p);
  });

  const mergedMap = new Map<string, Product>();

  incoming.forEach(inc => {
    const loc = localMap.get(inc.id);
    if (!loc) {
      mergedMap.set(inc.id, inc);
    } else {
      // Incoming (live DB/server product) takes precedence for image and details
      const incImages = (Array.isArray(inc.images) && inc.images.length > 0)
        ? inc.images.filter(Boolean)
        : (inc.image ? [inc.image] : []);

      const locImages = (Array.isArray(loc.images) && loc.images.length > 0)
        ? loc.images.filter(Boolean)
        : (loc.image ? [loc.image] : []);

      // If incoming has images, strictly use incoming images!
      const finalImages = incImages.length > 0 ? incImages : locImages;
      const mainImage = finalImages[0] || inc.image || loc.image || '';

      const mergedProduct: Product = {
        ...loc,
        ...inc,
        images: finalImages,
        image: mainImage,
        updatedAt: Math.max((inc as any).updatedAt || 0, (loc as any).updatedAt || 0, Date.now())
      };
      mergedMap.set(inc.id, mergedProduct);
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
          if (nonDemo.length > 0) {
            return deduplicateProducts(nonDemo.map(normalizeProductCategory));
          }
        }
      }
    } catch (e) {}
    return CANONICAL_DEFAULT_PRODUCTS;
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
          if (nonDemo.length > 0) {
            setProducts(deduplicateProducts(nonDemo.map(normalizeProductCategory)));
            setLoading(false);
            return;
          }
        }
      }
      setProducts(CANONICAL_DEFAULT_PRODUCTS);
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
          setProducts(prev => {
            const merged = mergeProductsWithLocalCache(normalized, prev);
            const finalNormalized = deduplicateProducts(merged.map(normalizeProductCategory));
            try {
              localStorage.setItem('eleganbd_products', JSON.stringify(finalNormalized));
              localStorage.setItem('eleganbd_products_last_fetched', Date.now().toString());
            } catch (e) {}
            return finalNormalized;
          });
        } else if (!error && data && Array.isArray(data) && data.length === 0) {
          // Supabase is empty, push local products to Supabase
          try {
            const locallySaved = localStorage.getItem('eleganbd_products');
            const toPush = locallySaved ? JSON.parse(locallySaved) : CANONICAL_DEFAULT_PRODUCTS;
            if (Array.isArray(toPush) && toPush.length > 0) {
              const rows = toPush.map(productToSupabaseRow);
              supabase.from('products').upsert(rows, { onConflict: 'id' }).then(({ error: upsertErr }) => {
                if (!upsertErr) {
                  console.log(`[ProductContext] Auto-migrated ${rows.length} products to empty Supabase`);
                }
              });
            }
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
      setProducts(prev => {
        const merged = mergeProductsWithLocalCache(normalized, prev);
        const finalNormalized = deduplicateProducts(merged.map(normalizeProductCategory));
        try {
          localStorage.setItem('eleganbd_products', JSON.stringify(finalNormalized));
          localStorage.setItem('eleganbd_products_last_fetched', Date.now().toString());
        } catch (e) {}
        return finalNormalized;
      });
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
