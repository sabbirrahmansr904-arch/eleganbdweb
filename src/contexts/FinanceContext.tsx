import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, deleteDoc, setDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType, isFirestoreQuotaExceeded } from '../lib/firestoreUtils';
import { saveDocumentToSupabase, deleteDocumentFromSupabase, fetchDocumentsFromSupabase } from '../lib/supabase';
import { sanitizeForFirestore } from '../lib/sanitize';
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
  dollarTxId?: string;
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
         name.includes('pyypl') ||
         name.includes('wise') ||
         name.includes('payoneer') ||
         name.includes('binance') ||
         name.includes('dollar') || 
         name.includes('ডলার') || 
         name.includes('usd') ||
         accName.includes('redotpay') ||
         accName.includes('pyypl') ||
         accName.includes('wise') ||
         accName.includes('payoneer') ||
         accName.includes('binance') ||
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
  isSyncing: boolean;
  addBankAccount: (account: Omit<BankAccount, 'id' | 'balance'>) => Promise<void>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  addBankTransaction: (tx: Omit<BankTransaction, 'id'>, targetAccountId?: string) => Promise<void>;
  updateBankTransaction: (id: string, updatedTx: Partial<BankTransaction>) => Promise<void>;
  toggleTransactionStatus: (id: string, currentStatus?: 'unpaid' | 'paid') => Promise<void>;
  deleteBankTransaction: (id: string) => Promise<void>;
  recalculateAllBalances: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
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
    currency: 'BDT',
    logoUrl: 'preset:cash'
  },
  {
    id: 'acc_sonali_main',
    bankName: 'সোনালী ব্যাংক (Sonali Bank)',
    accountName: 'সোনালী ব্যাংক লিমিটেড',
    accountNumber: '4400-0001',
    initialBalance: 0,
    balance: 0,
    accountType: 'bank',
    currency: 'BDT',
    logoUrl: 'preset:sonali'
  },
  {
    id: 'acc_bkash_main',
    bankName: 'bKash (বিকাশ)',
    accountName: 'বিকাশ মার্চেন্ট ওয়ালেট',
    accountNumber: '01619835133',
    initialBalance: 0,
    balance: 0,
    accountType: 'mobile',
    currency: 'BDT',
    logoUrl: 'preset:bkash'
  }
];

// Helper function to calculate exact balance for all accounts based on initialBalance + paid transactions
export const computeBalances = (accounts: BankAccount[], transactions: BankTransaction[]): BankAccount[] => {
  if (!accounts || accounts.length === 0) return [];
  const validTxs = Array.isArray(transactions) ? transactions : [];

  const updated = accounts.map(acc => {
    const initialBal = Number(acc.initialBalance) || 0;
    let currentBalance = initialBal;

    validTxs.forEach(tx => {
      if (!tx || tx.status === 'unpaid') return;
      const txAmt = Number(tx.amount) || 0;
      if (txAmt === 0) return;

      if (tx.accountId === acc.id) {
        if (tx.type === 'deposit') {
          currentBalance += txAmt;
        } else if (tx.type === 'withdraw' || tx.type === 'transfer') {
          currentBalance -= txAmt;
        }
      }
      if (tx.targetAccountId === acc.id && tx.type === 'transfer') {
        currentBalance += txAmt;
      }
    });

    const isUsd = isUsdAccount(acc);
    const roundedBalance = isUsd
      ? Math.round(currentBalance * 100) / 100
      : Math.round(currentBalance * 100) / 100;

    return { 
      ...acc, 
      initialBalance: initialBal,
      balance: roundedBalance 
    };
  });
  return sortBankAccounts(updated);
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_bank_accounts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const { isAdmin, loading: authLoading } = useAuth();

  // Persistent reference tracking
  const bankAccountsRef = useRef<BankAccount[]>(bankAccounts);
  useEffect(() => {
    bankAccountsRef.current = bankAccounts;
  }, [bankAccounts]);

  const bankTransactionsRef = useRef<BankTransaction[]>(bankTransactions);
  useEffect(() => {
    bankTransactionsRef.current = bankTransactions;
  }, [bankTransactions]);

  // Defensive helper to sync accounts directly with incoming cloud state while preserving locally created un-synced accounts
  const mergeAccounts = useCallback((existing: BankAccount[], incoming: BankAccount[]): BankAccount[] => {
    if (!incoming) return existing;
    if (incoming.length === 0) return existing; // Keep existing if cloud is empty momentarily
    
    const incomingMap = new Map<string, BankAccount>();
    incoming.forEach(a => { if (a && a.id) incomingMap.set(a.id, a); });

    const result: BankAccount[] = [];
    // First include all incoming from cloud
    incoming.forEach(a => {
      if (a && a.id) {
        result.push(a);
      }
    });

    // Also include any existing local accounts that might not have arrived from cloud snapshot yet
    existing.forEach(a => {
      if (a && a.id && !incomingMap.has(a.id)) {
        result.push(a);
      }
    });

    return result;
  }, []);

  // Defensive helper to merge transactions
  const mergeTransactions = useCallback((existing: BankTransaction[], incoming: BankTransaction[]): BankTransaction[] => {
    if (!incoming || incoming.length === 0) return existing;
    const map = new Map<string, BankTransaction>();
    existing.forEach(t => { if (t && t.id) map.set(t.id, t); });
    incoming.forEach(t => {
      if (t && t.id) {
        const prev = map.get(t.id);
        map.set(t.id, { 
          ...prev, 
          ...t, 
          amount: Number(t.amount !== undefined ? t.amount : prev?.amount) || 0 
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));
  }, []);

  // Primary Cross-Device Real-time Listener
  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    // Supabase secondary cache backup
    Promise.all([
      fetchDocumentsFromSupabase('bank_accounts'),
      fetchDocumentsFromSupabase('bank_transactions')
    ]).then(([accountsData, txData]) => {
      if (!isSubscribed) return;
      if (Array.isArray(accountsData) && accountsData.length > 0) {
        setBankAccounts(prev => {
          const merged = mergeAccounts(prev, accountsData);
          return computeBalances(merged, bankTransactionsRef.current);
        });
      }
      if (Array.isArray(txData) && txData.length > 0) {
        setBankTransactions(prev => mergeTransactions(prev, txData));
      }
    }).catch(() => {});

    if (isFirestoreQuotaExceeded) {
      setLoading(false);
      return;
    }

    // 1. Live Firestore Accounts Listener
    const unsubAccounts = onSnapshot(collection(db, 'bank_accounts'), async (snapshot) => {
      if (!isSubscribed) return;

      if (snapshot.empty) {
        // Do not wipe out local state if snapshot is empty momentarily; keep existing state
        return;
      } else {
        const cloudAccounts: BankAccount[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            bankName: data.bankName || '',
            accountName: data.accountName || '',
            accountNumber: data.accountNumber || '',
            branch: data.branch || '',
            initialBalance: Number(data.initialBalance) || 0,
            balance: Number(data.balance) || 0,
            accountType: data.accountType || 'bank',
            currency: data.currency || (isUsdAccount(data) ? 'USD' : 'BDT'),
            logoUrl: data.logoUrl || ''
          };
        });

        setBankAccounts(prev => {
          const merged = mergeAccounts(prev, cloudAccounts);
          const recalculated = computeBalances(merged, bankTransactionsRef.current);
          try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}
          return recalculated;
        });
      }
    }, () => setLoading(false));

    // 2. Live Firestore Transactions Listener
    const unsubTransactions = onSnapshot(collection(db, 'bank_transactions'), async (snapshot) => {
      if (!isSubscribed) return;

      const cloudTxs: BankTransaction[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          accountId: data.accountId || '',
          targetAccountId: data.targetAccountId || undefined,
          type: data.type || 'deposit',
          amount: Number(data.amount) || 0,
          date: Number(data.date) || Date.now(),
          reference: data.reference || '',
          notes: data.notes || '',
          attachment: data.attachment || '',
          status: data.status || 'paid',
          dollarTxId: data.dollarTxId || undefined
        };
      });

      // Check if local cache has any transactions not yet synced to Firestore (e.g. from previous offline sessions)
      try {
        const localCachedStr = localStorage.getItem('eleganbd_bank_transactions');
        if (localCachedStr) {
          const localList: BankTransaction[] = JSON.parse(localCachedStr);
          if (Array.isArray(localList)) {
            const cloudIdSet = new Set(cloudTxs.map(t => t.id));
            const missingInCloud = localList.filter(t => t && t.id && !cloudIdSet.has(t.id));
            if (missingInCloud.length > 0) {
              for (const missingTx of missingInCloud) {
                const sanitized = sanitizeForFirestore(missingTx);
                setDoc(doc(db, 'bank_transactions', missingTx.id), sanitized).catch(() => {});
                cloudTxs.push(missingTx);
              }
            }
          }
        }
      } catch (e) {}

      cloudTxs.sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));

      setBankTransactions(cloudTxs);
      try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(cloudTxs)); } catch {}

      // Authoritative recalculation of all balances based on live cloud transactions
      setBankAccounts(prevAccounts => {
        const recalculated = computeBalances(prevAccounts, cloudTxs);
        try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}
        return recalculated;
      });

      setLoading(false);
    }, () => setLoading(false));

    return () => {
      isSubscribed = false;
      unsubAccounts();
      unsubTransactions();
    };
  }, [isAdmin, authLoading, mergeAccounts, mergeTransactions]);

  // Sync / Recalculate with Cloud (guarantees 100% device accuracy)
  const syncWithCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch fresh accounts from Firestore
      const accSnap = await getDocs(collection(db, 'bank_accounts'));
      const txSnap = await getDocs(collection(db, 'bank_transactions'));

      const accounts: BankAccount[] = accSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          bankName: data.bankName || '',
          accountName: data.accountName || '',
          accountNumber: data.accountNumber || '',
          branch: data.branch || '',
          initialBalance: Number(data.initialBalance) || 0,
          balance: Number(data.balance) || 0,
          accountType: data.accountType || 'bank',
          currency: data.currency || (isUsdAccount(data) ? 'USD' : 'BDT'),
          logoUrl: data.logoUrl || ''
        };
      });

      const transactions: BankTransaction[] = txSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          accountId: data.accountId || '',
          targetAccountId: data.targetAccountId || undefined,
          type: data.type || 'deposit',
          amount: Number(data.amount) || 0,
          date: Number(data.date) || Date.now(),
          reference: data.reference || '',
          notes: data.notes || '',
          attachment: data.attachment || '',
          status: data.status || 'paid',
          dollarTxId: data.dollarTxId || undefined
        };
      });

      transactions.sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));

      const mergedAccs = accounts.length > 0 ? accounts : DEFAULT_STARTER_ACCOUNTS;
      const recalculated = computeBalances(mergedAccs, transactions);

      setBankTransactions(transactions);
      setBankAccounts(recalculated);

      try {
        localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(transactions));
        localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated));
      } catch {}

      // Update cloud balances
      for (const acc of recalculated) {
        await setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(acc), { merge: true });
        saveDocumentToSupabase('bank_accounts', acc.id, acc).catch(() => {});
      }

      toast.success('ক্লাউড থেকে সব অ্যাকাউন্টের ব্যালেন্স ও লেনদেন সফলভাবে সিঙ্ক ও আপডেট হয়েছে!');
    } catch (error) {
      console.error('Error syncing finance with cloud:', error);
      toast.error('ক্লাউড সিঙ্ক করতে সমস্যা হয়েছে!');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const addBankAccount = async (account: Omit<BankAccount, 'id' | 'balance'>) => {
    const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initialBal = Number(account.initialBalance) || 0;
    const newAcc: BankAccount = { 
      ...account, 
      id, 
      balance: initialBal, 
      initialBalance: initialBal,
      currency: account.currency || (isUsdAccount(account) ? 'USD' : 'BDT')
    };

    setBankAccounts(prev => {
      const merged = [newAcc, ...prev.filter(a => a.id !== id)];
      const recalculated = computeBalances(merged, bankTransactionsRef.current);
      try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}
      return recalculated;
    });

    const sanitized = sanitizeForFirestore(newAcc);
    try {
      await setDoc(doc(db, 'bank_accounts', id), sanitized);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `bank_accounts/${id}`);
    }

    saveDocumentToSupabase('bank_accounts', id, sanitized).catch(() => {});
    toast.success('নতুন অ্যাকাউন্ট সফলভাবে যোগ করা হয়েছে!');
  };

  const updateBankAccount = async (updatedAcc: BankAccount) => {
    const initialBal = Number(updatedAcc.initialBalance) || 0;
    const cleanAcc: BankAccount = { 
      ...updatedAcc, 
      initialBalance: initialBal,
      currency: updatedAcc.currency || (isUsdAccount(updatedAcc) ? 'USD' : 'BDT')
    };

    let computedAcc = cleanAcc;
    setBankAccounts(prev => {
      const merged = prev.map(a => a.id === cleanAcc.id ? cleanAcc : a);
      const recalculated = computeBalances(merged, bankTransactionsRef.current);
      const found = recalculated.find(a => a.id === cleanAcc.id);
      if (found) computedAcc = found;
      try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}
      return recalculated;
    });

    const sanitized = sanitizeForFirestore(computedAcc);
    try {
      await setDoc(doc(db, 'bank_accounts', updatedAcc.id), sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bank_accounts/${updatedAcc.id}`);
    }

    saveDocumentToSupabase('bank_accounts', updatedAcc.id, sanitized).catch(() => {});
    toast.success('অ্যাকাউন্ট সফলভাবে আপডেট করা হয়েছে!');
  };

  const deleteBankAccount = async (id: string) => {
    setBankAccounts(prev => {
      const sorted = sortBankAccounts(prev.filter(a => a.id !== id));
      try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(sorted)); } catch {}
      return sorted;
    });

    try {
      await deleteDoc(doc(db, 'bank_accounts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bank_accounts/${id}`);
    }

    try {
      const client = getSupabaseClient() || supabase;
      if (client) {
        await client.from('app_documents').delete().eq('id', `bank_accounts_${id}`);
      }
    } catch (e) {}

    deleteDocumentFromSupabase('bank_accounts', id).catch(() => {});
    toast.success('অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে!');
  };

  const addBankTransaction = async (tx: Omit<BankTransaction, 'id'>, targetAccountId?: string) => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const amt = Number(tx.amount) || 0;
    const newTx: BankTransaction = {
      ...tx,
      id,
      amount: amt,
      status: tx.status || 'paid',
      targetAccountId: targetAccountId || tx.targetAccountId || undefined,
      date: tx.date || Date.now(),
      reference: tx.reference || '',
      notes: tx.notes || ''
    };

    const sanitizedTx = sanitizeForFirestore(newTx);

    // Save to Firestore first to guarantee persistence across all devices
    try {
      await setDoc(doc(db, 'bank_transactions', id), sanitizedTx);
    } catch (error) {
      console.error('Failed to save bank transaction to Firestore:', error);
      handleFirestoreError(error, OperationType.CREATE, `bank_transactions/${id}`);
    }

    // Save to Supabase in background
    saveDocumentToSupabase('bank_transactions', id, sanitizedTx).catch(() => {});

    // Update local state and recalculate balances
    setBankTransactions(prev => {
      const updatedList = mergeTransactions(prev, [newTx]);
      try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(updatedList)); } catch {}

      setBankAccounts(accs => {
        const recalculated = computeBalances(accs, updatedList);
        try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}
        
        // Sync affected accounts to Firestore
        (async () => {
          for (const acc of recalculated) {
            if (acc.id === newTx.accountId || (newTx.targetAccountId && acc.id === newTx.targetAccountId)) {
              try {
                await setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(acc), { merge: true });
                saveDocumentToSupabase('bank_accounts', acc.id, acc).catch(() => {});
              } catch {}
            }
          }
        })();

        return recalculated;
      });

      return updatedList;
    });
  };

  const updateBankTransaction = async (id: string, updatedFields: Partial<BankTransaction>) => {
    const cleanFields = {
      ...updatedFields,
      amount: updatedFields.amount !== undefined ? (Number(updatedFields.amount) || 0) : undefined
    };
    const sanitizedFields = sanitizeForFirestore(cleanFields);

    try {
      await setDoc(doc(db, 'bank_transactions', id), sanitizedFields, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bank_transactions/${id}`);
    }

    let targetTx: BankTransaction | undefined;
    setBankTransactions(prev => {
      const updatedList = prev.map(tx => tx.id === id ? { ...tx, ...cleanFields } : tx);
      targetTx = updatedList.find(t => t.id === id);
      try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(updatedList)); } catch {}

      setBankAccounts(accs => {
        const recalculated = computeBalances(accs, updatedList);
        try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}
        
        (async () => {
          for (const acc of recalculated) {
            try {
              await setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(acc), { merge: true });
            } catch {}
          }
        })();

        return recalculated;
      });

      return updatedList;
    });

    if (targetTx) {
      saveDocumentToSupabase('bank_transactions', id, sanitizeForFirestore(targetTx)).catch(() => {});
    }

    toast.success('লেনদেন আপডেট করা হয়েছে!');
  };

  const toggleTransactionStatus = async (id: string, currentStatus?: 'unpaid' | 'paid') => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    
    try {
      await setDoc(doc(db, 'bank_transactions', id), { status: nextStatus }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bank_transactions/${id}`);
    }

    let targetTx: BankTransaction | undefined;
    setBankTransactions(prev => {
      const updatedList = prev.map(tx => tx.id === id ? { ...tx, status: nextStatus as 'unpaid' | 'paid' } : tx);
      targetTx = updatedList.find(t => t.id === id);
      try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(updatedList)); } catch {}

      setBankAccounts(accs => {
        const recalculated = computeBalances(accs, updatedList);
        try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}

        (async () => {
          for (const acc of recalculated) {
            try {
              await setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(acc), { merge: true });
            } catch {}
          }
        })();

        return recalculated;
      });

      return updatedList;
    });

    if (targetTx) {
      saveDocumentToSupabase('bank_transactions', id, sanitizeForFirestore(targetTx)).catch(() => {});
    }

    if (nextStatus === 'paid') {
      toast.success('লেনদেনটি PAID (পরিশোধিত) করা হয়েছে এবং ব্যালেন্স যোগ হয়েছে!');
    } else {
      toast.success('লেনদেনটি UNPAID (বকেয়া) করা হয়েছে এবং ব্যালেন্স সমন্বয় করা হয়েছে!');
    }
  };

  const deleteBankTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bank_transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bank_transactions/${id}`);
    }

    deleteDocumentFromSupabase('bank_transactions', id).catch(() => {});

    setBankTransactions(prev => {
      const updatedList = prev.filter(tx => tx.id !== id);
      try { localStorage.setItem('eleganbd_bank_transactions', JSON.stringify(updatedList)); } catch {}

      setBankAccounts(accs => {
        const recalculated = computeBalances(accs, updatedList);
        try { localStorage.setItem('eleganbd_bank_accounts', JSON.stringify(recalculated)); } catch {}

        (async () => {
          for (const acc of recalculated) {
            try {
              await setDoc(doc(db, 'bank_accounts', acc.id), sanitizeForFirestore(acc), { merge: true });
            } catch {}
          }
        })();

        return recalculated;
      });

      return updatedList;
    });

    toast.success('লেনদেন সফলভাবে মুছে ফেলা হয়েছে এবং ব্যালেন্স সমন্বয় করা হয়েছে!');
  };

  const recalculateAllBalances = async () => {
    await syncWithCloud();
  };

  return (
    <FinanceContext.Provider value={{
      bankAccounts,
      bankTransactions,
      loading,
      isSyncing,
      addBankAccount,
      updateBankAccount,
      deleteBankAccount,
      addBankTransaction,
      updateBankTransaction,
      toggleTransactionStatus,
      deleteBankTransaction,
      recalculateAllBalances,
      syncWithCloud
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

