import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { PRODUCTS as INITIAL_PRODUCTS } from '../constants';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  loading: boolean;
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
             let category = p.category;
             if (category === 'Premium Formal Shirt') category = 'Formal Shirt';
             if (category === 'Drop Shoulder T-shirt') category = 'T-shirt';
             if (category === 'Panjabi') category = 'T-shirt';
             if (category === 'Casual Shirt' || category === 'Woman Palazzo') category = 'Formal Pant'; 
             
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
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Try to fetch from Firestore first
        const productsCol = collection(db, 'products');
        const snapshot = await getDocs(productsCol);
        
        const prodData: Product[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as Product;
          prodData.push({
            ...data,
            id: doc.id, // Ensure ID matches doc ID
            stock: data.stock || 0,
            images: data.images || [],
            sizes: data.sizes || [],
            sizeStock: data.sizeStock || {}
          });
        });

        if (prodData.length > 0) {
          const normalizedData = prodData.map(p => {
             let category = p.category;
             if (category === 'Premium Formal Shirt') category = 'Formal Shirt';
             if (category === 'Drop Shoulder T-shirt') category = 'T-shirt';
             if (category === 'Panjabi') category = 'T-shirt';
             if (category === 'Casual Shirt' || category === 'Woman Palazzo') category = 'Formal Pant'; 
             return { ...p, category };
          });
          setProducts(normalizedData);
          try {
            localStorage.setItem('eleganbd_products', JSON.stringify(normalizedData));
          } catch (e) {
            // Storage full - try clearing it first
            localStorage.clear();
            try {
              localStorage.setItem('eleganbd_products', JSON.stringify(normalizedData));
            } catch (e2) {
              console.warn("Storage quota exceeded even after clear");
            }
          }
        }
      } catch (err: any) {
        if (!err?.message?.includes('resource-exhausted') && !err?.message?.includes('Quota limit exceeded')) {
          console.error("Product fetch error:", err);
        }
        // Fallback to local storage if firestore fails is already handled by initial state
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

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, loading }}>
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
