import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

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

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const categoriesCol = collection(db, 'categories');
    
    // Initial load from cache to avoid flicker
    const cached = localStorage.getItem('eleganbd_categories');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setCategories(parsed);
          setLoading(false);
        }
      } catch (e) {
        localStorage.removeItem('eleganbd_categories');
      }
    }

    const unsubscribe = onSnapshot(categoriesCol, (snapshot) => {
      const data: Category[] = [];
      snapshot.forEach(doc => {
        data.push({ ...doc.data() as Category, id: doc.id });
      });

      if (data.length > 0) {
        setCategories(data);
        localStorage.setItem('eleganbd_categories', JSON.stringify(data));
      } else if (!cached) {
        setCategories(DEFAULT_CATEGORIES);
      }
      setLoading(false);
    }, (error) => {
      console.error("Category sync error:", error);
      if (!cached) {
        setCategories(DEFAULT_CATEGORIES);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addCategory = async (category: Category) => {
    try {
      await setDoc(doc(db, 'categories', category.id), category);
      // Optimistic update
      setCategories(prev => [...prev, category]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `categories/${category.id}`);
    }
  };

  const updateCategory = async (updatedCategory: Category) => {
    try {
      await setDoc(doc(db, 'categories', updatedCategory.id), updatedCategory, { merge: true });
      // Optimistic update
      setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${updatedCategory.id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      // Optimistic update
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
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
