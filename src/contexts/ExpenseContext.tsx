import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Expense } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType, isFirestoreQuotaExceeded, isQuotaError } from '../lib/firestoreUtils';
import { saveDocumentToSupabase, deleteDocumentFromSupabase, fetchDocumentsFromSupabase } from '../lib/supabase';

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_expenses');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    // Load from Supabase
    fetchDocumentsFromSupabase('expenses').then(data => {
      if (Array.isArray(data) && data.length > 0) {
        data.sort((a, b) => b.date - a.date);
        setExpenses(data);
        localStorage.setItem('eleganbd_expenses', JSON.stringify(data));
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    if (isFirestoreQuotaExceeded) {
      setLoading(false);
      return;
    }

    try {
      const unsub = onSnapshot(collection(db, 'expenses'), (snapshot) => {
        const list: Expense[] = [];
        snapshot.forEach(doc => {
          list.push({ ...doc.data() as Expense, id: doc.id });
        });
        list.sort((a, b) => b.date - a.date);
        setExpenses(list);
        try {
          localStorage.setItem('eleganbd_expenses', JSON.stringify(list));
        } catch {}
        setLoading(false);
      }, (error) => {
        setLoading(false);
      });

      return () => unsub();
    } catch {
      setLoading(false);
    }
  }, [isAdmin]);

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    const tempId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newExp = { ...expense, id: tempId };
    
    // Optimistic update
    setExpenses(prev => {
      const next = [newExp, ...prev];
      try {
        localStorage.setItem('eleganbd_expenses', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 1. Save to Supabase
    await saveDocumentToSupabase('expenses', tempId, newExp);
    toast.success('খরচ যোগ করা হয়েছে!');

    // 2. Save to Firestore
    try {
      await setDoc(doc(db, 'expenses', tempId), expense);
    } catch (err) {}
  };

  const deleteExpense = async (id: string) => {
    if (!id) {
      toast.error('রেকর্ড আইডি পাওয়া যায়নি!');
      return;
    }

    // Optimistic update
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      try {
        localStorage.setItem('eleganbd_expenses', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 1. Delete from Supabase
    await deleteDocumentFromSupabase('expenses', id);
    toast.success('রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!');

    // 2. Delete from Firestore
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {}
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
