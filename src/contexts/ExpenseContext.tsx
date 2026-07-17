import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { Expense } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const list: Expense[] = [];
      snapshot.forEach(doc => {
        list.push({ ...doc.data() as Expense, id: doc.id });
      });
      list.sort((a, b) => b.date - a.date);
      setExpenses(list);
      setLoading(false);
    });

    return () => unsub();
  }, [isAdmin]);

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      await addDoc(collection(db, 'expenses'), expense);
      toast.success('খরচ যোগ করা হয়েছে!');
    } catch (err) {
      console.error('Error adding expense:', err);
      toast.error('খরচ যোগ করতে ব্যর্থ হয়েছে।');
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
      toast.success('খরচ মুছে ফেলা হয়েছে!');
    } catch (err) {
      console.error('Error deleting expense:', err);
      toast.error('খরচ মুছতে ব্যর্থ হয়েছে।');
    }
  };

  return (
    <ExpenseContext.Provider value={{ expenses, loading, addExpense, deleteExpense }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};
