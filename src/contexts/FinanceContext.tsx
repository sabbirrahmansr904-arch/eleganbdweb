import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  initialBalance: number;
  balance: number;
  accountType?: string;
  logoUrl?: string;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  targetAccountId?: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  date: number;
  reference: string;
  notes?: string;
  attachment?: string;
}

interface FinanceContextType {
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  loading: boolean;
  addBankAccount: (account: Omit<BankAccount, 'id' | 'balance'>) => Promise<void>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  addBankTransaction: (tx: Omit<BankTransaction, 'id'>, targetAccountId?: string) => Promise<void>;
  updateBankTransaction: (id: string, updatedTx: Partial<BankTransaction>) => Promise<void>;
  deleteBankTransaction: (id: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAccounts = onSnapshot(collection(db, 'bank_accounts'), (snapshot) => {
      const accounts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BankAccount));
      setBankAccounts(accounts);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'bank_accounts'));

    const unsubTransactions = onSnapshot(query(collection(db, 'bank_transactions'), orderBy('date', 'desc')), (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BankTransaction));
      setBankTransactions(transactions);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'bank_transactions'));

    return () => {
      unsubAccounts();
      unsubTransactions();
    };
  }, []);

  const recalculateBalances = async (accounts: BankAccount[], transactions: BankTransaction[]) => {
    for (const acc of accounts) {
      let currentBalance = acc.initialBalance || 0;
      transactions.forEach(tx => {
        if (tx.accountId === acc.id) {
          if (tx.type === 'deposit') {
            currentBalance += tx.amount;
          } else if (tx.type === 'withdraw') {
            currentBalance -= tx.amount;
          } else if (tx.type === 'transfer') {
            currentBalance -= tx.amount;
          }
        }
        if (tx.targetAccountId === acc.id && tx.type === 'transfer') {
          currentBalance += tx.amount;
        }
      });
      if (acc.balance !== currentBalance) {
        await updateDoc(doc(db, 'bank_accounts', acc.id), { balance: currentBalance });
      }
    }
  };

  const addBankAccount = async (account: Omit<BankAccount, 'id' | 'balance'>) => {
    try {
      await addDoc(collection(db, 'bank_accounts'), { ...account, balance: 0, initialBalance: 0 });
      toast.success('নতুন অ্যাকাউন্ট সফলভাবে যোগ করা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bank_accounts');
    }
  };

  const updateBankAccount = async (updatedAcc: BankAccount) => {
    try {
      await updateDoc(doc(db, 'bank_accounts', updatedAcc.id), { ...updatedAcc });
      toast.success('অ্যাকাউন্ট সফলভাবে আপডেট করা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bank_accounts/${updatedAcc.id}`);
    }
  };

  const deleteBankAccount = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bank_accounts', id));
      toast.success('অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bank_accounts/${id}`);
    }
  };

  const addBankTransaction = async (tx: Omit<BankTransaction, 'id'>, targetAccountId?: string) => {
    try {
      await addDoc(collection(db, 'bank_transactions'), { ...tx, targetAccountId: targetAccountId || tx.targetAccountId || null, date: Date.now() });
      await recalculateBalances(bankAccounts, [...bankTransactions, { ...tx, targetAccountId: targetAccountId || tx.targetAccountId || null, date: Date.now(), id: 'temp' } as BankTransaction]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bank_transactions');
    }
  };

  const updateBankTransaction = async (id: string, updatedFields: Partial<BankTransaction>) => {
    try {
      await updateDoc(doc(db, 'bank_transactions', id), updatedFields);
      await recalculateBalances(bankAccounts, bankTransactions.map(tx => tx.id === id ? { ...tx, ...updatedFields } : tx));
      toast.success('লেনদেন আপডেট করা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bank_transactions/${id}`);
    }
  };

  const deleteBankTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bank_transactions', id));
      await recalculateBalances(bankAccounts, bankTransactions.filter(tx => tx.id !== id));
      toast.success('লেনদেন সফলভাবে মুছে ফেলা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bank_transactions/${id}`);
    }
  };

  return (
    <FinanceContext.Provider value={{
      bankAccounts,
      bankTransactions,
      loading,
      addBankAccount,
      updateBankAccount,
      deleteBankAccount,
      addBankTransaction,
      updateBankTransaction,
      deleteBankTransaction
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

