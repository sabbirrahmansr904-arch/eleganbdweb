import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType, isFirestoreQuotaExceeded, isQuotaError } from '../lib/firestoreUtils';
import { saveDocumentToSupabase, deleteDocumentFromSupabase, fetchDocumentsFromSupabase } from '../lib/supabase';
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

const DEFAULT_STARTER_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc_cash_main',
    bankName: 'ক্যাশ (Cash in Hand)',
    accountName: 'প্রধান ক্যাশ অ্যাকাউন্ট',
    accountNumber: 'CASH-01',
    initialBalance: 0,
    balance: 0,
    accountType: 'cash',
    currency: 'BDT'
  },
  {
    id: 'acc_sonali_main',
    bankName: 'সোনালী ব্যাংক (Sonali Bank)',
    accountName: 'সোনালী ব্যাংক লিমিটেড',
    accountNumber: '4400-0001',
    initialBalance: 0,
    balance: 0,
    accountType: 'bank',
    currency: 'BDT'
  },
  {
    id: 'acc_bkash_main',
    bankName: 'bKash (বিকাশ)',
    accountName: 'বিকাশ মার্চেন্ট ওয়ালেট',
    accountNumber: '01619835133',
    initialBalance: 0,
    balance: 0,
    accountType: 'mobile',
    currency: 'BDT'
  }
];

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_bank_accounts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_STARTER_ACCOUNTS;
  });

  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_bank_transactions');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: authLoading } = useAuth();

  // Helper function to calculate exact balance for all accounts based on paid transactions
  const computeBalances = (accounts: BankAccount[], transactions: BankTransaction[]): BankAccount[] => {
    const updated = accounts.map(acc => {
      let currentBalance = acc.initialBalance || 0;
      transactions.forEach(tx => {
        if (tx.status === 'unpaid') return;

        if (tx.accountId === acc.id) {
          if (tx.type === 'deposit') {
            currentBalance += tx.amount;
          } else if (tx.type === 'withdraw' || tx.type === 'transfer') {
            currentBalance -= tx.amount;
          }
        }
        if (tx.targetAccountId === acc.id && tx.type === 'transfer') {
          currentBalance += tx.amount;
        }
      });
      return { ...acc, balance: currentBalance };
    });
    return sortBankAccounts(updated);
  };

  const recalculateBalances = async (accounts: BankAccount[], transactions: BankTransaction[]) => {
    const sorted = computeBalances(accounts, transactions);
    setBankAccounts(sorted);
    try {
      localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(sorted));
    } catch {}

    for (const acc of sorted) {
      await saveDocumentToSupabase('bank_accounts', acc.id, acc);
      try {
        await setDoc(doc(db, 'bank_accounts', acc.id), acc, { merge: true });
      } catch {}
    }
  };

  // Defensive helper to merge accounts without losing existing ones
  const mergeAccounts = (existing: BankAccount[], incoming: BankAccount[]): BankAccount[] => {
    if (!incoming || incoming.length === 0) return existing;
    const map = new Map<string, BankAccount>();
    existing.forEach(a => { if (a && a.id) map.set(a.id, a); });
    incoming.forEach(a => {
      if (a && a.id) {
        const prev = map.get(a.id);
        map.set(a.id, { ...prev, ...a });
      }
    });
    return Array.from(map.values());
  };

  // Defensive helper to merge transactions
  const mergeTransactions = (existing: BankTransaction[], incoming: BankTransaction[]): BankTransaction[] => {
    if (!incoming || incoming.length === 0) return existing;
    const map = new Map<string, BankTransaction>();
    existing.forEach(t => { if (t && t.id) map.set(t.id, t); });
    incoming.forEach(t => {
      if (t && t.id) {
        const prev = map.get(t.id);
        map.set(t.id, { ...prev, ...t });
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.date || 0) - (a.date || 0));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    // Load bank accounts & transactions from Supabase
    Promise.all([
      fetchDocumentsFromSupabase('bank_accounts'),
      fetchDocumentsFromSupabase('bank_transactions')
    ]).then(([accountsData, txData]) => {
      let currentAccs = bankAccounts;
      let currentTxs = bankTransactions;

      if (Array.isArray(accountsData) && accountsData.length > 0) {
        currentAccs = mergeAccounts(currentAccs, accountsData);
      }
      if (Array.isArray(txData) && txData.length > 0) {
        currentTxs = mergeTransactions(currentTxs, txData);
      }

      const recalculated = computeBalances(currentAccs, currentTxs);
      setBankAccounts(recalculated);
      setBankTransactions(currentTxs);
      try {
        localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated));
        localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(currentTxs));
      } catch {}

      setLoading(false);
    }).catch(() => setLoading(false));

    if (isFirestoreQuotaExceeded) {
      setLoading(false);
      return;
    }

    try {
      const unsubAccounts = onSnapshot(collection(db, 'bank_accounts'), (snapshot) => {
        if (snapshot.docs.length > 0) {
          const incomingAccounts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BankAccount));
          setBankAccounts(prev => {
            const merged = mergeAccounts(prev, incomingAccounts);
            const recalculated = computeBalances(merged, bankTransactions);
            try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}
            return recalculated;
          });
        }
      }, () => setLoading(false));

      const unsubTransactions = onSnapshot(query(collection(db, 'bank_transactions'), orderBy('date', 'desc')), (snapshot) => {
        if (snapshot.docs.length > 0) {
          const incomingTxs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BankTransaction));
          setBankTransactions(prev => {
            const merged = mergeTransactions(prev, incomingTxs);
            try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(merged)); } catch {}
            setBankAccounts(accs => {
              const recalculated = computeBalances(accs, merged);
              try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}
              return recalculated;
            });
            return merged;
          });
        }
        setLoading(false);
      }, () => setLoading(false));

      return () => {
        unsubAccounts();
        unsubTransactions();
      };
    } catch {
      setLoading(false);
    }
  }, [isAdmin, authLoading]);

  const addBankAccount = async (account: Omit<BankAccount, 'id' | 'balance'>) => {
    const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initialBal = account.initialBalance || 0;
    const newAcc: BankAccount = { ...account, id, balance: initialBal, initialBalance: initialBal };

    setBankAccounts(prev => {
      const sorted = sortBankAccounts([newAcc, ...prev]);
      try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(sorted)); } catch {}
      return sorted;
    });

    await saveDocumentToSupabase('bank_accounts', id, newAcc);
    toast.success('নতুন অ্যাকাউন্ট সফলভাবে যোগ করা হয়েছে!');

    try {
      await setDoc(doc(db, 'bank_accounts', id), newAcc);
    } catch (error) {}
  };

  const updateBankAccount = async (updatedAcc: BankAccount) => {
    setBankAccounts(prev => {
      const sorted = sortBankAccounts(prev.map(a => a.id === updatedAcc.id ? updatedAcc : a));
      try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(sorted)); } catch {}
      return sorted;
    });

    await saveDocumentToSupabase('bank_accounts', updatedAcc.id, updatedAcc);
    toast.success('অ্যাকাউন্ট সফলভাবে আপডেট করা হয়েছে!');

    try {
      await updateDoc(doc(db, 'bank_accounts', updatedAcc.id), { ...updatedAcc });
    } catch (error) {}
  };

  const deleteBankAccount = async (id: string) => {
    setBankAccounts(prev => {
      const sorted = sortBankAccounts(prev.filter(a => a.id !== id));
      try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(sorted)); } catch {}
      return sorted;
    });

    await deleteDocumentFromSupabase('bank_accounts', id);
    toast.success('অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে!');

    try {
      await deleteDoc(doc(db, 'bank_accounts', id));
    } catch (error) {}
  };

  const addBankTransaction = async (tx: Omit<BankTransaction, 'id'>, targetAccountId?: string) => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTx: BankTransaction = {
      ...tx,
      id,
      status: tx.status || 'paid',
      targetAccountId: targetAccountId || tx.targetAccountId || undefined,
      date: tx.date || Date.now()
    };

    setBankTransactions(prev => {
      const updated = [newTx, ...prev];
      try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(updated)); } catch {}
      return updated;
    });

    await saveDocumentToSupabase('bank_transactions', id, newTx);
    await recalculateBalances(bankAccounts, [
      ...bankTransactions,
      newTx
    ]);

    try {
      await setDoc(doc(db, 'bank_transactions', id), newTx);
    } catch (error) {}
  };

  const updateBankTransaction = async (id: string, updatedFields: Partial<BankTransaction>) => {
    const updatedList = bankTransactions.map(tx => tx.id === id ? { ...tx, ...updatedFields } : tx);
    setBankTransactions(updatedList);
    try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(updatedList)); } catch {}

    const targetTx = updatedList.find(t => t.id === id);
    if (targetTx) {
      await saveDocumentToSupabase('bank_transactions', id, targetTx);
    }
    await recalculateBalances(bankAccounts, updatedList);
    toast.success('লেনদেন আপডেট করা হয়েছে!');

    try {
      await updateDoc(doc(db, 'bank_transactions', id), updatedFields);
    } catch (error) {}
  };

  const toggleTransactionStatus = async (id: string, currentStatus?: 'unpaid' | 'paid') => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const updatedList = bankTransactions.map(tx => tx.id === id ? { ...tx, status: nextStatus as 'unpaid' | 'paid' } : tx);
    setBankTransactions(updatedList);
    try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(updatedList)); } catch {}

    const targetTx = updatedList.find(t => t.id === id);
    if (targetTx) {
      await saveDocumentToSupabase('bank_transactions', id, targetTx);
    }
    await recalculateBalances(bankAccounts, updatedList);

    if (nextStatus === 'paid') {
      toast.success('লেনদেনটি PAID (পরিশোধিত) করা হয়েছে!');
    } else {
      toast.success('লেনদেনটি UNPAID (বকেয়া) করা হয়েছে!');
    }

    try {
      await updateDoc(doc(db, 'bank_transactions', id), { status: nextStatus });
    } catch (error) {}
  };

  const deleteBankTransaction = async (id: string) => {
    const updatedList = bankTransactions.filter(tx => tx.id !== id);
    setBankTransactions(updatedList);
    try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(updatedList)); } catch {}

    await deleteDocumentFromSupabase('bank_transactions', id);
    await recalculateBalances(bankAccounts, updatedList);
    toast.success('লেনদেন সফলভাবে মুছে ফেলা হয়েছে!');

    try {
      await deleteDoc(doc(db, 'bank_transactions', id));
    } catch (error) {}
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

