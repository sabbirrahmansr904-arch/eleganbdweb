import React, { createContext, useContext, useState, useEffect } from 'react';
import { StockTransaction } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { useAuth } from './AuthContext';

interface InventoryContextType {
  transactions: StockTransaction[];
  addTransaction: (transaction: Omit<StockTransaction, 'id' | 'timestamp'>) => Promise<void>;
  loading: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !isAdmin) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'inventory_transactions'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transData: StockTransaction[] = [];
      snapshot.forEach(doc => {
        transData.push({ ...doc.data() as StockTransaction, id: doc.id });
      });
      setTransactions(transData);
      setLoading(false);
    }, (error) => {
      // Don't toast for permission errors if they just logged out or similar
      if (!error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'inventory_transactions');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, authLoading]);

  const addTransaction = async (trans: Omit<StockTransaction, 'id' | 'timestamp'>) => {
    const id = Date.now().toString();
    const timestamp = Date.now();
    const newTrans: StockTransaction = {
      ...trans,
      id,
      timestamp
    };

    try {
      await setDoc(doc(db, 'inventory_transactions', id), newTrans);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `inventory_transactions/${id}`);
    }
  };

  return (
    <InventoryContext.Provider value={{ transactions, addTransaction, loading }}>
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
