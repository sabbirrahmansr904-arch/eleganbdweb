import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  initialBalance: number;
  balance: number;
  accountType?: string;
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

const DEFAULT_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc_bkash_1',
    bankName: 'bKash Personal',
    accountName: 'Elegan BD Ltd',
    accountNumber: '01712345678',
    branch: 'Online',
    initialBalance: 100000,
    balance: 125750,
    accountType: 'ব্যক্তিগত'
  },
  {
    id: 'acc_sonali_1',
    bankName: 'Sonali Bank',
    accountName: 'Elegan BD Ltd',
    accountNumber: '1234567890',
    branch: 'Motijheel',
    initialBalance: 50000,
    balance: 78420.50,
    accountType: 'ব্যাংক'
  },
  {
    id: 'acc_nagad_1',
    bankName: 'Nagad Personal',
    accountName: 'Elegan BD Ltd',
    accountNumber: '01812345678',
    branch: 'Online',
    initialBalance: 30000,
    balance: 45390.75,
    accountType: 'ব্যক্তিগত'
  }
];

const DEFAULT_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'tx_1',
    accountId: 'acc_bkash_1',
    type: 'deposit',
    amount: 5000,
    date: Date.now() - 3600000 * 2,
    reference: 'Customer Payment - Order #1234',
    notes: 'Paid via bKash Merchant'
  },
  {
    id: 'tx_2',
    accountId: 'acc_sonali_1',
    type: 'withdraw',
    amount: 2450,
    date: Date.now() - 3600000 * 5,
    reference: 'Supplier Payment - Invoice #5678',
    notes: 'Fabric raw materials'
  },
  {
    id: 'tx_3',
    accountId: 'acc_nagad_1',
    type: 'deposit',
    amount: 8750,
    date: Date.now() - 3600000 * 12,
    reference: 'Cash Collection',
    notes: 'Direct collection'
  },
  {
    id: 'tx_4',
    accountId: 'acc_bkash_1',
    type: 'withdraw',
    amount: 1200,
    date: Date.now() - 3600000 * 24,
    reference: 'Office Supplies',
    notes: 'Stationery and tea'
  },
  {
    id: 'tx_5',
    accountId: 'acc_sonali_1',
    type: 'deposit',
    amount: 15000,
    date: Date.now() - 3600000 * 48,
    reference: 'Bank Transfer',
    notes: 'Interbank transfer'
  }
];

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('elegan_bank_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ACCOUNTS;
  });

  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('elegan_bank_transactions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TRANSACTIONS;
  });

  const [loading, setLoading] = useState(false);

  // Recalculate balances whenever transactions change
  useEffect(() => {
    try {
      localStorage.setItem('elegan_bank_accounts', JSON.stringify(bankAccounts));
    } catch (e) {
      console.error(e);
    }
  }, [bankAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem('elegan_bank_transactions', JSON.stringify(bankTransactions));
    } catch (e) {
      console.error(e);
    }
  }, [bankTransactions]);

  // Helper to recalculate all account balances from transactions
  const recalculateBalances = (accounts: BankAccount[], transactions: BankTransaction[]) => {
    return accounts.map(acc => {
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
      return { ...acc, balance: currentBalance };
    });
  };

  const addBankAccount = async (account: Omit<BankAccount, 'id' | 'balance'>) => {
    const newAcc: BankAccount = {
      ...account,
      id: 'acc_' + Date.now(),
      balance: account.initialBalance
    };
    const updatedAccounts = [...bankAccounts, newAcc];
    setBankAccounts(updatedAccounts);
    toast.success('নতুন অ্যাকাউন্ট সফলভাবে যোগ করা হয়েছে!');
  };

  const updateBankAccount = async (updatedAcc: BankAccount) => {
    const updated = bankAccounts.map(acc => acc.id === updatedAcc.id ? { ...acc, ...updatedAcc } : acc);
    setBankAccounts(recalculateBalances(updated, bankTransactions));
    toast.success('অ্যাকাউন্ট সফলভাবে আপডেট করা হয়েছে!');
  };

  const deleteBankAccount = async (id: string) => {
    const updated = bankAccounts.filter(acc => acc.id !== id);
    setBankAccounts(updated);
    toast.success('অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে!');
  };

  const addBankTransaction = async (tx: Omit<BankTransaction, 'id'>, targetAccountId?: string) => {
    const newTx: BankTransaction = {
      ...tx,
      id: 'tx_' + Date.now(),
      targetAccountId: targetAccountId || tx.targetAccountId
    };

    const updatedTxs = [newTx, ...bankTransactions];
    setBankTransactions(updatedTxs);
    setBankAccounts(prev => recalculateBalances(prev, updatedTxs));
  };

  const updateBankTransaction = async (id: string, updatedFields: Partial<BankTransaction>) => {
    const updatedTxs = bankTransactions.map(tx => tx.id === id ? { ...tx, ...updatedFields } : tx);
    setBankTransactions(updatedTxs);
    setBankAccounts(prev => recalculateBalances(prev, updatedTxs));
    toast.success('লেনদেন আপডেট করা হয়েছে!');
  };

  const deleteBankTransaction = async (id: string) => {
    const updatedTxs = bankTransactions.filter(tx => tx.id !== id);
    setBankTransactions(updatedTxs);
    setBankAccounts(prev => recalculateBalances(prev, updatedTxs));
    toast.success('লেনদেন সফলভাবে মুছে ফেলা হয়েছে!');
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
