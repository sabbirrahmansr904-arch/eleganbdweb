import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StockTransaction } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType, isQuotaError } from '../lib/firestoreUtils';
import { useAuth } from './AuthContext';

interface InventoryContextType {
  transactions: StockTransaction[];
  addTransaction: (transaction: Omit<StockTransaction, 'id' | 'timestamp'>) => Promise<void>;
  deleteTransaction?: (id: string) => Promise<void>;
  loading: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const CACHE_KEY = 'eleganbd_inventory_transactions';

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [loading, setLoading] = useState(true);

  const { isAdmin, currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    // We listen to real-time inventory transactions for admins and logged-in users
    if (authLoading) return;

    setLoading(true);
    const transCol = collection(db, 'inventory_transactions');
    const q = query(transCol, orderBy('timestamp', 'desc'), limit(500));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transData: StockTransaction[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          transData.push({
            id: d.id,
            type: data.type || 'in',
            sku: data.sku || 'N/A',
            productName: data.productName || 'Unknown Product',
            quantities: data.quantities || {},
            totalQuantity: Number(data.totalQuantity) || 0,
            timestamp: Number(data.timestamp) || Date.now(),
            category: data.category || 'General',
            authorizedBy: data.authorizedBy || 'System',
            notes: data.notes || '',
          });
        });

        // Update state and save to cache
        setTransactions(transData);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(transData));
        } catch {
          // localStorage full or quota exceeded
        }
        setLoading(false);
      },
      (error) => {
        if (isQuotaError(error)) {
          console.warn('[InventoryContext] Firestore quota limit reached. Using cached transactions.');
        } else {
          console.error('[InventoryContext] Real-time listener error:', error);
          handleFirestoreError(error, OperationType.LIST, 'inventory_transactions');
        }
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isAdmin, authLoading]);

  const addTransaction = useCallback(async (trans: Omit<StockTransaction, 'id' | 'timestamp'>) => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();
    const newTrans: StockTransaction = {
      authorizedBy: trans.authorizedBy || (currentUser?.displayName || currentUser?.email || 'Admin'),
      notes: trans.notes || '',
      sku: trans.sku || 'N/A',
      productName: trans.productName || 'Product',
      category: trans.category || 'General',
      quantities: trans.quantities || {},
      totalQuantity: Number(trans.totalQuantity) || 0,
      type: trans.type || 'in',
      id,
      timestamp,
    };

    // 1. Optimistically update local state immediately so UI reflects in real-time
    setTransactions((prev) => {
      const updated = [newTrans, ...prev.filter((t) => t.id !== id)];
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated.slice(0, 500)));
      } catch {
        // ignore
      }
      return updated;
    });

    // 2. Persist to Firestore
    try {
      await setDoc(doc(db, 'inventory_transactions', id), newTrans);
    } catch (error) {
      if (isQuotaError(error)) {
        console.warn('[InventoryContext] Firestore quota exceeded while writing transaction. Saved locally.');
      } else {
        console.error('[InventoryContext] Error creating transaction in Firestore:', error);
        handleFirestoreError(error, OperationType.CREATE, `inventory_transactions/${id}`);
      }
    }
  }, [currentUser]);

  const deleteTransaction = useCallback(async (id: string) => {
    setTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'inventory_transactions', id));
    } catch (error) {
      console.error('[InventoryContext] Error deleting transaction:', error);
    }
  }, []);

  return (
    <InventoryContext.Provider value={{ transactions, addTransaction, deleteTransaction, loading }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

