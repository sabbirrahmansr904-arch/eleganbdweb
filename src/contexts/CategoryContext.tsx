import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType, isFirestoreQuotaExceeded, isQuotaError } from '../lib/firestoreUtils';

interface CategoryContextType {
  categories: Category[];
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  loading: boolean;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Formal Shirt', slug: 'formal-shirt', description: 'Premium formal shirts for professionals' },
  { id: '2', name: 'Polo T-shirt', slug: 'polo-t-shirt', description: 'Comfortable and stylish polo t-shirts' },
  { id: '3', name: 'Formal Pant', slug: 'formal-pant', description: 'Tailored formal pants' },
  { id: '5', name: 'Premium Shirt', slug: 'premium-shirt', description: 'Luxury collection shirts' }
];

export const sortCategories = (list: Category[]): Category[] => {
  return [...list].sort((a, b) => {
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    
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
        if (Array.isArray(parsed)) {
          setCategories(sortCategories(parsed));
          setLoading(false);
        }
      } catch (e) {
        localStorage.removeItem('eleganbd_categories');
      }
    } else {
      setCategories(sortCategories(DEFAULT_CATEGORIES));
    }

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
        if (!isQuotaError(error)) {
          handleFirestoreError(error, OperationType.GET, 'categories');
        }
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

    try {
      await setDoc(doc(db, 'categories', category.id), category);
    } catch (error) {
      console.warn("Firestore category sync warning:", error);
    }
  };

  const updateCategory = async (updatedCategory: Category) => {
    const updated = sortCategories(categories.map(c => c.id === updatedCategory.id ? updatedCategory : c));
    setCategories(updated);
    localStorage.setItem('eleganbd_categories', JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'categories', updatedCategory.id), updatedCategory, { merge: true });
    } catch (error) {
      console.warn("Firestore category update warning:", error);
    }
  };

  const deleteCategory = async (id: string) => {
    const updated = sortCategories(categories.filter(c => c.id !== id));
    setCategories(updated);
    localStorage.setItem('eleganbd_categories', JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      console.warn("Firestore category delete warning:", error);
    }
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
