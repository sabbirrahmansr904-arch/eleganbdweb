import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType, isFirestoreQuotaExceeded, isQuotaError } from '../lib/firestoreUtils';
import { saveDocumentToSupabase, deleteDocumentFromSupabase, fetchDocumentsFromSupabase } from '../lib/supabase';

interface CategoryContextType {
  categories: Category[];
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  loading: boolean;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const getDefaultCategoryImage = (categoryName?: string): string => {
  if (!categoryName) return 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80';
  const lower = categoryName.toLowerCase().trim();

  if (lower.includes('pant') || lower.includes('trouser') || lower.includes('jeans')) {
    return 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('polo') || lower.includes('t-shirt') || lower.includes('tshirt') || lower.includes('tee')) {
    return 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('shirt')) {
    return 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('panjabi') || lower.includes('kurta') || lower.includes('traditional')) {
    return 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('combo') || lower.includes('offer') || lower.includes('bundle')) {
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('winter') || lower.includes('jacket') || lower.includes('hoodie') || lower.includes('blazer')) {
    return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
};

const DEFAULT_CATEGORIES: Category[] = [
  { 
    id: '1', 
    name: 'Formal Shirt', 
    slug: 'formal-shirt', 
    description: 'Premium formal shirts for professionals',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80'
  },
  { 
    id: '2', 
    name: 'Polo T-shirt', 
    slug: 'polo-t-shirt', 
    description: 'Comfortable and stylish polo t-shirts',
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80'
  },
  { 
    id: '3', 
    name: 'Formal Pant', 
    slug: 'formal-pant', 
    description: 'Tailored formal pants',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80'
  },
  { 
    id: '5', 
    name: 'Premium Shirt', 
    slug: 'premium-shirt', 
    description: 'Luxury collection shirts',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80'
  }
];

export const sortCategories = (list: Category[]): Category[] => {
  if (!Array.isArray(list)) return [];
  return [...list].filter(Boolean).sort((a, b) => {
    const aName = ((a && a.name) || '').toLowerCase();
    const bName = ((b && b.name) || '').toLowerCase();
    
    const isAPant = aName.includes('pant') || aName.includes('trouser');
    const isBPant = bName.includes('pant') || bName.includes('trouser');
    
    const isAShirt = aName.includes('shirt') || aName.includes('polo');
    const isBShirt = bName.includes('shirt') || bName.includes('polo');
    
    // Pants first
    if (isAPant && !isBPant) return -1;
    if (!isAPant && isBPant) return 1;
    
    // Shirts second
    if (isAShirt && !isBShirt) return -1;
    if (!isAShirt && isBShirt) return 1;
    
    // Then alphabetical
    return aName.localeCompare(bName);
  });
};

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load from cache to avoid flicker
    const cached = localStorage.getItem('eleganbd_categories');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(sortCategories(parsed));
          setLoading(false);
        }
      } catch (e) {
        localStorage.removeItem('eleganbd_categories');
      }
    } else {
      setCategories(sortCategories(DEFAULT_CATEGORIES));
    }

    // 1. Fetch from Server API (Ultra Fast & Universal for all devices)
    fetch('/api/categories')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.categories) && res.categories.length > 0) {
          const sorted = sortCategories(res.categories);
          setCategories(sorted);
          localStorage.setItem('eleganbd_categories', JSON.stringify(sorted));
        }
      })
      .catch(() => {});

    // 2. Load from Firestore
    getDocs(collection(db, 'categories')).then(snapshot => {
      if (snapshot && !snapshot.empty) {
        const rawData: Category[] = [];
        snapshot.forEach(doc => {
          rawData.push({ ...doc.data() as Category, id: doc.id });
        });
        if (rawData.length > 0) {
          const sorted = sortCategories(rawData);
          setCategories(sorted);
          localStorage.setItem('eleganbd_categories', JSON.stringify(sorted));
        }
      }
    }).catch(() => {});

    // Background secondary load from Supabase
    fetchDocumentsFromSupabase('categories').then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const sorted = sortCategories(data);
        setCategories(prev => prev.length === 0 ? sorted : prev);
      }
    }).catch(() => {}).finally(() => setLoading(false));

    if (isFirestoreQuotaExceeded) {
      setLoading(false);
      return;
    }

    try {
      const categoriesCol = collection(db, 'categories');
      const unsubscribe = onSnapshot(categoriesCol, (snapshot) => {
        const rawData: Category[] = [];
        snapshot.forEach(doc => {
          rawData.push({ ...doc.data() as Category, id: doc.id });
        });

        // Ensure unique categories by id
        const uniqueMap = new Map<string, Category>();
        rawData.forEach(cat => {
          if (cat.id) uniqueMap.set(cat.id, cat);
        });
        const data = Array.from(uniqueMap.values());

        if (data.length > 0) {
          const sortedData = sortCategories(data);
          setCategories(sortedData);
          localStorage.setItem('eleganbd_categories', JSON.stringify(sortedData));
        } else if (!cached) {
          setCategories(sortCategories(DEFAULT_CATEGORIES));
        }
        setLoading(false);
      }, (error) => {
        if (!cached) {
          setCategories(sortCategories(DEFAULT_CATEGORIES));
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      setLoading(false);
    }
  }, []);

  const addCategory = async (category: Category) => {
    // Optimistic update immediately
    const updated = sortCategories([...categories, category]);
    setCategories(updated);
    localStorage.setItem('eleganbd_categories', JSON.stringify(updated));

    // 1. Save via Server API (Bypasses all client restrictions & syncs across all devices)
    fetch('/api/categories/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category })
    }).catch(() => {});

    // 2. Save to Firestore (Direct SDK)
    try {
      await setDoc(doc(db, 'categories', category.id), category);
    } catch (error) {
      console.warn('[CategoryContext] Firestore addCategory notice:', error);
    }

    // 3. Mirror to Supabase in background
    saveDocumentToSupabase('categories', category.id, category).catch(() => {});
  };

  const updateCategory = async (updatedCategory: Category) => {
    const updated = sortCategories(categories.map(c => c.id === updatedCategory.id ? updatedCategory : c));
    setCategories(updated);
    localStorage.setItem('eleganbd_categories', JSON.stringify(updated));

    // 1. Save via Server API (Bypasses all client restrictions & syncs across all devices)
    fetch('/api/categories/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: updatedCategory })
    }).catch(() => {});

    // 2. Save to Firestore (Direct SDK)
    try {
      await setDoc(doc(db, 'categories', updatedCategory.id), updatedCategory, { merge: true });
    } catch (error) {
      console.warn('[CategoryContext] Firestore updateCategory notice:', error);
    }

    // 3. Mirror to Supabase in background
    saveDocumentToSupabase('categories', updatedCategory.id, updatedCategory).catch(() => {});
  };

  const deleteCategory = async (id: string) => {
    const updated = sortCategories(categories.filter(c => c.id !== id));
    setCategories(updated);
    localStorage.setItem('eleganbd_categories', JSON.stringify(updated));

    // 1. Delete from Firestore (Primary)
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      console.warn('[CategoryContext] Firestore deleteCategory notice:', error);
    }

    // 2. Delete from Supabase in background
    deleteDocumentFromSupabase('categories', id).catch(() => {});
  };

  return (
    <CategoryContext.Provider value={{ categories, addCategory, updateCategory, deleteCategory, loading }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};
