import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType, isFirestoreQuotaExceeded, isQuotaError } from '../lib/firestoreUtils';
import { useAuth } from './AuthContext';

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
  currency?: 'BDT' | 'USD';
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
  status?: 'unpaid' | 'paid';
}

export const isUsdAccount = (acc?: BankAccount | { bankName?: string; accountName?: string; accountType?: string; currency?: string } | null): boolean => {
  if (!acc) return false;
  if (acc.currency === 'USD') return true;
  const name = (acc.bankName || '').toLowerCase();
  const accName = (acc.accountName || '').toLowerCase();
  const accType = (acc.accountType || '').toLowerCase();
  return name.includes('redotpay') || 
         name.includes('redot') || 
         name.includes('রেডটপে') || 
         name.includes('রেডট পে') || 
         name.includes('dollar') || 
         name.includes('ডলার') || 
         name.includes('usd') ||
         accName.includes('redotpay') ||
         accName.includes('dollar') ||
         accName.includes('usd') ||
         accType.includes('usd') ||
         accType.includes('dollar') ||
         accType.includes('ডলার');
};

export const formatAccountBalance = (acc: BankAccount, amount?: number): string => {
  const value = amount !== undefined ? amount : (acc.balance || 0);
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  if (isUsdAccount(acc)) {
    return `${isNegative ? '-' : ''}$${absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${isNegative ? '-' : ''}৳${Math.round(absValue).toLocaleString('en-IN')}`;
};

interface FinanceContextType {
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  loading: boolean;
  addBankAccount: (account: Omit<BankAccount, 'id' | 'balance'>) => Promise<void>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  addBankTransaction: (tx: Omit<BankTransaction, 'id'>, targetAccountId?: string) => Promise<void>;
  updateBankTransaction: (id: string, updatedTx: Partial<BankTransaction>) => Promise<void>;
  toggleTransactionStatus: (id: string, currentStatus?: 'unpaid' | 'paid') => Promise<void>;
  deleteBankTransaction: (id: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const sortBankAccounts = (accounts: BankAccount[]): BankAccount[] => {
  const getRank = (acc: BankAccount): number => {
    const name = (acc.bankName || '').toLowerCase();
    const accName = (acc.accountName || '').toLowerCase();
    const accType = (acc.accountType || '').toLowerCase();
    
    // 1st: Cash
    if (name.includes('cash') || accName.includes('cash') || accType.includes('cash') || name.includes('ক্যাশ') || accName.includes('ক্যাশ')) {
      return 1;
    }
    // 2nd: Sonali Bank
    if (name.includes('sonali') || accName.includes('sonali') || name.includes('সোনালী') || accName.includes('সোনালী')) {
      return 2;
    }
    // 3rd: bKash
    if (name.includes('bkash') || accName.includes('bkash') || name.includes('বিকাশ') || accName.includes('বিকাশ')) {
      return 3;
    }
    // 4th: Nagad
    if (name.includes('nagad') || accName.includes('nagad') || name.includes('নগদ') || accName.includes('নগদ')) {
      return 4;
    }
    // 5th: Rocket
    if (name.includes('rocket') || accName.includes('rocket') || name.includes('রকেট')) {
      return 5;
    }
    // 6th: Redotpay / Dollar USD Wallets
    if (isUsdAccount(acc)) {
      return 6;
    }
    return 10;
  };

  return [...accounts].sort((a, b) => {
    const rankA = getRank(a);
    const rankB = getRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return (a.bankName || '').localeCompare(b.bankName || '');
  });
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_bank_accounts');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_bank_transactions');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (isFirestoreQuotaExceeded) {
      setLoading(false);
      return;
    }

    try {
      const unsubAccounts = onSnapshot(collection(db, 'bank_accounts'), (snapshot) => {
        const accounts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BankAccount));
        const sorted = sortBankAccounts(accounts);
        setBankAccounts(sorted);
        try {
          localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(sorted));
        } catch {}
      }, (error) => {
        if (!isQuotaError(error)) {
          handleFirestoreError(error, OperationType.GET, 'bank_accounts');
        }
        setLoading(false);
      });

      const unsubTransactions = onSnapshot(query(collection(db, 'bank_transactions'), orderBy('date', 'desc')), (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BankTransaction));
        setBankTransactions(transactions);
        try {
          localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(transactions));
        } catch {}
        setLoading(false);
      }, (error) => {
        if (!isQuotaError(error)) {
          handleFirestoreError(error, OperationType.GET, 'bank_transactions');
        }
        setLoading(false);
      });

      return () => {
        unsubAccounts();
        unsubTransactions();
      };
    } catch {
      setLoading(false);
    }
  }, [isAdmin, authLoading]);

  const recalculateBalances = async (accounts: BankAccount[], transactions: BankTransaction[]) => {
    for (const acc of accounts) {
      let currentBalance = acc.initialBalance || 0;
      transactions.forEach(tx => {
        // Unpaid transactions are pending/unsettled and do not alter settled account balance
        if (tx.status === 'unpaid') return;

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
      const newTx = {
        ...tx,
        status: tx.status || 'unpaid', // Defaults to unpaid as requested
        targetAccountId: targetAccountId || tx.targetAccountId || null,
        date: tx.date || Date.now()
      };
      await addDoc(collection(db, 'bank_transactions'), newTx);
      await recalculateBalances(bankAccounts, [
        ...bankTransactions,
        { ...newTx, id: 'temp' } as BankTransaction
      ]);
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

  const toggleTransactionStatus = async (id: string, currentStatus?: 'unpaid' | 'paid') => {
    try {
      const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
      await updateDoc(doc(db, 'bank_transactions', id), { status: nextStatus });
      await recalculateBalances(bankAccounts, bankTransactions.map(tx => tx.id === id ? { ...tx, status: nextStatus } : tx));
      if (nextStatus === 'paid') {
        toast.success('লেনদেনটি PAID (পরিশোধিত) করা হয়েছে!');
      } else {
        toast.success('লেনদেনটি UNPAID (বকেয়া) করা হয়েছে!');
      }
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
      toggleTransactionStatus,
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

