/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { Partner, PartnerTransaction, BankAccount, BankTransaction, PathaoPayout } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  partners: Partner[];
  partnerTransactions: PartnerTransaction[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  pathaoPayouts: PathaoPayout[];
  loading: boolean;
  
  // Partner Operations
  updatePartner: (partner: Partner) => Promise<void>;
  addPartnerTransaction: (tx: Omit<PartnerTransaction, 'id' | 'date'>) => Promise<void>;
  deletePartnerTransaction: (txId: string) => Promise<void>;
  distributeProfit: (totalProfit: number, splitMethod: 'equal' | 'percentage') => Promise<void>;

  // Bank Operations
  addBankAccount: (acc: Omit<BankAccount, 'id' | 'balance'> & { initialBalance: number }) => Promise<void>;
  updateBankAccount: (acc: BankAccount) => Promise<void>;
  deleteBankAccount: (accId: string) => Promise<void>;
  addBankTransaction: (tx: Omit<BankTransaction, 'id' | 'date'> & { date?: number }, targetAccountId?: string) => Promise<void>;
  deleteBankTransaction: (txId: string) => Promise<void>;

  // Pathao Payout Operations
  addPathaoPayout: (payout: Omit<PathaoPayout, 'id'>) => Promise<void>;
  updatePathaoPayoutStatus: (payoutId: string, status: 'Pending' | 'Paid') => Promise<void>;
  deletePathaoPayout: (payoutId: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerTransactions, setPartnerTransactions] = useState<PartnerTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [pathaoPayouts, setPathaoPayouts] = useState<PathaoPayout[]>([]);
  const [loading, setLoading] = useState(true);

  const { isAdmin } = useAuth();

  // Load Data
  useEffect(() => {
    if (!isAdmin) {
      setPartners([]);
      setPartnerTransactions([]);
      setBankAccounts([]);
      setBankTransactions([]);
      setPathaoPayouts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubPartners = onSnapshot(collection(db, 'partners'), async (snapshot) => {
      if (snapshot.empty) {
        // Initialize 3 default partners as requested
        const defaults: Partner[] = [
          { id: 'partner-1', name: 'Sabbir Rahman', investment: 0, sharePercent: 33.34, withdrawn: 0 },
          { id: 'partner-2', name: 'Partner 2', investment: 0, sharePercent: 33.33, withdrawn: 0 },
          { id: 'partner-3', name: 'Partner 3', investment: 0, sharePercent: 33.33, withdrawn: 0 }
        ];
        for (const p of defaults) {
          await setDoc(doc(db, 'partners', p.id), p);
        }
      } else {
        const list: Partner[] = [];
        snapshot.forEach(doc => {
          list.push({ ...doc.data() as Partner, id: doc.id });
        });
        setPartners(list);
      }
    }, (error) => {
      console.error('Error fetching partners:', error);
    });

    const unsubPartnerTxs = onSnapshot(collection(db, 'partner_transactions'), (snapshot) => {
      const list: PartnerTransaction[] = [];
      snapshot.forEach(doc => {
        list.push({ ...doc.data() as PartnerTransaction, id: doc.id });
      });
      // Sort by date descending
      list.sort((a, b) => b.date - a.date);
      setPartnerTransactions(list);
    }, (error) => {
      console.error('Error fetching partner transactions:', error);
    });

    const unsubBankAccounts = onSnapshot(collection(db, 'bank_accounts'), async (snapshot) => {
      if (snapshot.empty) {
        // Initialize default bank accounts for convenience
        const defaults: BankAccount[] = [
          { id: 'acc-bkash', bankName: 'bKash Merchant', accountName: 'Elegan BD merchant', accountNumber: '01XXXXXXXXX', balance: 0 },
          { id: 'acc-nagad', bankName: 'Nagad Personal', accountName: 'Elegan BD personal', accountNumber: '01XXXXXXXXX', balance: 0 },
          { id: 'acc-dbbl', bankName: 'Sonali Bank', accountName: 'Elegan BD Ltd', accountNumber: '123.456.7890', balance: 0 }
        ];
        for (const a of defaults) {
          await setDoc(doc(db, 'bank_accounts', a.id), a);
        }
      } else {
        const list: BankAccount[] = [];
        let needsMigration = false;
        snapshot.forEach(docSnap => {
          const acc = docSnap.data() as BankAccount;
          if (acc.bankName && (acc.bankName.includes('Dutch-Bangla') || acc.bankName === 'Dutch-Bangla Bank')) {
            needsMigration = true;
            list.push({ ...acc, bankName: 'Sonali Bank', id: docSnap.id });
          } else {
            list.push({ ...acc, id: docSnap.id });
          }
        });
        setBankAccounts(list);

        if (needsMigration) {
          snapshot.forEach(async (docSnap) => {
            const acc = docSnap.data() as BankAccount;
            if (acc.bankName && (acc.bankName.includes('Dutch-Bangla') || acc.bankName === 'Dutch-Bangla Bank')) {
              try {
                await setDoc(doc(db, 'bank_accounts', docSnap.id), {
                  ...acc,
                  bankName: 'Sonali Bank'
                }, { merge: true });
              } catch (e) {
                console.error('Migration failed for bank account:', e);
              }
            }
          });
        }
      }
    }, (error) => {
      console.error('Error fetching bank accounts:', error);
    });

    const unsubBankTxs = onSnapshot(collection(db, 'bank_transactions'), (snapshot) => {
      const list: BankTransaction[] = [];
      snapshot.forEach(doc => {
        list.push({ ...doc.data() as BankTransaction, id: doc.id });
      });
      // Sort by date descending
      list.sort((a, b) => b.date - a.date);
      setBankTransactions(list);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching bank transactions:', error);
      setLoading(false);
    });

    const unsubPathaoPayouts = onSnapshot(collection(db, 'pathao_payouts'), (snapshot) => {
      const list: PathaoPayout[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data() as PathaoPayout, id: docSnap.id });
      });
      list.sort((a, b) => b.date - a.date);
      setPathaoPayouts(list);
    }, (error) => {
      console.error('Error fetching pathao payouts:', error);
    });

    return () => {
      unsubPartners();
      unsubPartnerTxs();
      unsubBankAccounts();
      unsubBankTxs();
      unsubPathaoPayouts();
    };
  }, [isAdmin]);

  // Update Partner Name/Share
  const updatePartner = async (partner: Partner) => {
    try {
      await setDoc(doc(db, 'partners', partner.id), partner);
      toast.success(`${partner.name}-এর বিবরণ সফলভাবে আপডেট হয়েছে`);
    } catch (err) {
      console.error('Error updating partner:', err);
      toast.error('আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  // Add Partner Transaction (Investment or Withdrawal)
  const addPartnerTransaction = async (tx: Omit<PartnerTransaction, 'id' | 'date'>) => {
    try {
      const txRef = doc(collection(db, 'partner_transactions'));
      const fullTx: PartnerTransaction = {
        ...tx,
        id: txRef.id,
        date: Date.now()
      };

      await runTransaction(db, async (transaction) => {
        const partnerRef = doc(db, 'partners', tx.partnerId);
        const partnerSnap = await transaction.get(partnerRef);
        if (!partnerSnap.exists()) {
          throw new Error('Partner does not exist!');
        }

        const partnerData = partnerSnap.data() as Partner;
        let newInvestment = partnerData.investment || 0;
        let newWithdrawn = partnerData.withdrawn || 0;

        if (tx.type === 'investment') {
          newInvestment += tx.amount;
        } else if (tx.type === 'withdrawal') {
          newWithdrawn += tx.amount;
        }

        transaction.set(txRef, fullTx);
        transaction.update(partnerRef, {
          investment: newInvestment,
          withdrawn: newWithdrawn
        });
      });

      toast.success('লেনদেন সফলভাবে সম্পন্ন হয়েছে!');
    } catch (err) {
      console.error('Error adding partner transaction:', err);
      toast.error('লেনদেন যোগ করতে সমস্যা হয়েছে।');
    }
  };

  // Delete Partner Transaction (reverses modifications)
  const deletePartnerTransaction = async (txId: string) => {
    try {
      const txRef = doc(db, 'partner_transactions', txId);
      
      await runTransaction(db, async (transaction) => {
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists()) {
          throw new Error('Transaction does not exist');
        }

        const txData = txSnap.data() as PartnerTransaction;
        const partnerRef = doc(db, 'partners', txData.partnerId);
        const partnerSnap = await transaction.get(partnerRef);

        if (partnerSnap.exists()) {
          const partnerData = partnerSnap.data() as Partner;
          let newInvestment = partnerData.investment || 0;
          let newWithdrawn = partnerData.withdrawn || 0;

          if (txData.type === 'investment') {
            newInvestment = Math.max(0, newInvestment - txData.amount);
          } else if (txData.type === 'withdrawal') {
            newWithdrawn = Math.max(0, newWithdrawn - txData.amount);
          }

          transaction.update(partnerRef, {
            investment: newInvestment,
            withdrawn: newWithdrawn
          });
        }

        transaction.delete(txRef);
      });

      toast.success('লেনদেন মুছে ফেলা হয়েছে!');
    } catch (err) {
      console.error('Error deleting partner transaction:', err);
      toast.error('লেনদেন মুছতে সমস্যা হয়েছে।');
    }
  };

  // Distribute Profit to all 3 partners in one go
  const distributeProfit = async (totalProfit: number, splitMethod: 'equal' | 'percentage') => {
    try {
      if (partners.length === 0) return;

      await runTransaction(db, async (transaction) => {
        const currentPartners: Partner[] = [];
        for (const p of partners) {
          const pSnap = await transaction.get(doc(db, 'partners', p.id));
          if (pSnap.exists()) {
            currentPartners.push({ ...pSnap.data() as Partner, id: pSnap.id });
          }
        }

        for (let i = 0; i < currentPartners.length; i++) {
          const p = currentPartners[i];
          let shareAmount = 0;
          if (splitMethod === 'equal') {
            shareAmount = Math.round((totalProfit / currentPartners.length) * 100) / 100;
          } else {
            shareAmount = Math.round((totalProfit * (p.sharePercent / 100)) * 100) / 100;
          }

          const txRef = doc(collection(db, 'partner_transactions'));
          const newTx: PartnerTransaction = {
            id: txRef.id,
            partnerId: p.id,
            partnerName: p.name,
            type: 'profit_share',
            amount: shareAmount,
            date: Date.now(),
            notes: `লাভ বন্টন (${splitMethod === 'equal' ? 'সমান অংশীদারিত্বে' : 'শেয়ারিং অনুপাতে'})`
          };

          // For profit share, let's add it to their investment account or just increase their profit earned tracking. 
          // Here let's increase 'withdrawn' but negatively (meaning they have more capital receivable) OR just record it as a transaction.
          // Let's keep it recorded as transaction, and to represent receivable we can subtract it from withdrawn or just log it.
          // Let's decrease withdrawn by shareAmount so that their "net withdrawn" decreases, i.e., they are owed this money.
          const newWithdrawn = (p.withdrawn || 0) - shareAmount;

          transaction.set(txRef, newTx);
          transaction.update(doc(db, 'partners', p.id), {
            withdrawn: newWithdrawn
          });
        }
      });

      toast.success('মুনাফা সফলভাবে বন্টন করা হয়েছে!');
    } catch (err) {
      console.error('Error distributing profit:', err);
      toast.error('মুনাফা বন্টন করতে সমস্যা হয়েছে।');
    }
  };

  // Add Bank Account
  const addBankAccount = async (acc: Omit<BankAccount, 'id' | 'balance'> & { initialBalance: number }) => {
    try {
      const accRef = doc(collection(db, 'bank_accounts'));
      const newAcc: BankAccount = {
        id: accRef.id,
        bankName: acc.bankName,
        accountName: acc.accountName,
        accountNumber: acc.accountNumber,
        branch: acc.branch || '',
        balance: acc.initialBalance
      };

      await setDoc(accRef, newAcc);

      // Create an initial deposit transaction if balance > 0
      if (acc.initialBalance > 0) {
        const txRef = doc(collection(db, 'bank_transactions'));
        const tx: BankTransaction = {
          id: txRef.id,
          accountId: accRef.id,
          type: 'deposit',
          amount: acc.initialBalance,
          date: Date.now(),
          reference: 'Initial Setup',
          notes: 'অ্যাকাউন্ট খোলার প্রাথমিক ব্যালেন্স'
        };
        await setDoc(txRef, tx);
      }

      toast.success('ব্যাংক অ্যাকাউন্ট যোগ করা হয়েছে!');
    } catch (err) {
      console.error('Error adding bank account:', err);
      toast.error('অ্যাকাউন্ট যোগ করতে ব্যর্থ হয়েছে।');
    }
  };

  // Update Bank Account Name/Number
  const updateBankAccount = async (acc: BankAccount) => {
    try {
      await setDoc(doc(db, 'bank_accounts', acc.id), acc, { merge: true });
      toast.success('অ্যাকাউন্টের তথ্য আপডেট হয়েছে!');
    } catch (err) {
      console.error('Error updating bank account:', err);
      toast.error('আপডেট করতে ব্যর্থ হয়েছে।');
    }
  };

  // Delete Bank Account
  const deleteBankAccount = async (accId: string) => {
    try {
      await deleteDoc(doc(db, 'bank_accounts', accId));
      toast.success('অ্যাকাউন্টটি মুছে ফেলা হয়েছে!');
    } catch (err) {
      console.error('Error deleting bank account:', err);
      toast.error('অ্যাকাউন্ট মুছতে ব্যর্থ হয়েছে।');
    }
  };

  // Add Bank Transaction (Deposit, Withdraw, Transfer)
  const addBankTransaction = async (tx: Omit<BankTransaction, 'id' | 'date'> & { date?: number }, targetAccountId?: string) => {
    try {
      const txRef = doc(collection(db, 'bank_transactions'));
      const fullTx: BankTransaction = {
        ...tx,
        id: txRef.id,
        date: tx.date || Date.now()
      };

      await runTransaction(db, async (transaction) => {
        const accRef = doc(db, 'bank_accounts', tx.accountId);
        const accSnap = await transaction.get(accRef);
        if (!accSnap.exists()) {
          throw new Error('Account does not exist');
        }

        const accData = accSnap.data() as BankAccount;
        let newBalance = accData.balance || 0;

        if (tx.type === 'deposit') {
          newBalance += tx.amount;
        } else if (tx.type === 'withdraw') {
          if (newBalance < tx.amount) {
            throw new Error('Insufficient balance');
          }
          newBalance -= tx.amount;
        } else if (tx.type === 'transfer' && targetAccountId) {
          if (newBalance < tx.amount) {
            throw new Error('Insufficient balance');
          }
          const targetAccRef = doc(db, 'bank_accounts', targetAccountId);
          const targetSnap = await transaction.get(targetAccRef);
          if (targetSnap.exists()) {
            const targetData = targetSnap.data() as BankAccount;
            const targetNewBalance = (targetData.balance || 0) + tx.amount;
            transaction.update(targetAccRef, { balance: targetNewBalance });
            
            // Also write a secondary record for deposit in target
            const subTxRef = doc(collection(db, 'bank_transactions'));
            const subTx: BankTransaction = {
              id: subTxRef.id,
              accountId: targetAccountId,
              type: 'deposit',
              amount: tx.amount,
              date: Date.now(),
              reference: `Transfer from ${accData.bankName}`,
              notes: tx.notes || 'আন্তঃ অ্যাকাউন্ট ট্রান্সফার'
            };
            transaction.set(subTxRef, subTx);
          }
          newBalance -= tx.amount;
        }

        transaction.set(txRef, fullTx);
        transaction.update(accRef, { balance: newBalance });
      });

      toast.success('ব্যাংক লেনদেন সম্পন্ন হয়েছে!');
    } catch (err: any) {
      console.error('Error adding bank transaction:', err);
      toast.error(err.message === 'Insufficient balance' ? 'অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!' : 'লেনদেন ব্যর্থ হয়েছে।');
    }
  };

  // Delete Bank Transaction
  const deleteBankTransaction = async (txId: string) => {
    try {
      const txRef = doc(db, 'bank_transactions', txId);

      await runTransaction(db, async (transaction) => {
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists()) {
          throw new Error('Transaction does not exist');
        }

        const txData = txSnap.data() as BankTransaction;
        const accRef = doc(db, 'bank_accounts', txData.accountId);
        const accSnap = await transaction.get(accRef);

        if (accSnap.exists()) {
          const accData = accSnap.data() as BankAccount;
          let newBalance = accData.balance || 0;

          if (txData.type === 'deposit') {
            newBalance = Math.max(0, newBalance - txData.amount);
          } else if (txData.type === 'withdraw' || txData.type === 'transfer') {
            newBalance += txData.amount;
          }

          transaction.update(accRef, { balance: newBalance });
        }

        transaction.delete(txRef);
      });

      toast.success('লেনদেন বাতিল করা হয়েছে!');
    } catch (err) {
      console.error('Error deleting bank transaction:', err);
      toast.error('লেনদেন মুছতে সমস্যা হয়েছে।');
    }
  };

  // Add Pathao Payout
  const addPathaoPayout = async (payout: Omit<PathaoPayout, 'id'>) => {
    try {
      const payoutRef = doc(collection(db, 'pathao_payouts'));
      const newPayout: PathaoPayout = {
        ...payout,
        id: payoutRef.id
      };
      await setDoc(payoutRef, newPayout);
      toast.success('নতুন পাঠাও পেআউট এন্ট্রি যোগ করা হয়েছে!');
    } catch (err) {
      console.error('Error adding pathao payout:', err);
      toast.error('পেআউট যোগ করতে ব্যর্থ হয়েছে।');
    }
  };

  // Update Pathao Payout Status (and update corresponding Bank Account Balance)
  const updatePathaoPayoutStatus = async (payoutId: string, status: 'Pending' | 'Paid') => {
    try {
      const payoutRef = doc(db, 'pathao_payouts', payoutId);
      
      await runTransaction(db, async (transaction) => {
        const payoutSnap = await transaction.get(payoutRef);
        if (!payoutSnap.exists()) {
          throw new Error('Payout record does not exist');
        }

        const payoutData = payoutSnap.data() as PathaoPayout;
        if (payoutData.status === status) return; // No change

        const accRef = doc(db, 'bank_accounts', payoutData.accountId);
        const accSnap = await transaction.get(accRef);
        
        if (!accSnap.exists()) {
          throw new Error('Target bank account does not exist');
        }

        const accData = accSnap.data() as BankAccount;
        let newBalance = accData.balance || 0;

        if (status === 'Paid') {
          // Add to bank balance
          newBalance += payoutData.amount;
          transaction.update(accRef, { balance: newBalance });

          // Log bank transaction
          const txRef = doc(collection(db, 'bank_transactions'));
          const tx: BankTransaction = {
            id: txRef.id,
            accountId: payoutData.accountId,
            type: 'deposit',
            amount: payoutData.amount,
            date: Date.now(),
            reference: payoutData.reference || 'Pathao Payout',
            notes: payoutData.notes || 'পাঠাও কুরিয়ার পে-আউট জমা (Paid)'
          };
          transaction.set(txRef, tx);
        } else if (status === 'Pending' && payoutData.status === 'Paid') {
          // Revert: subtract from bank balance
          newBalance = Math.max(0, newBalance - payoutData.amount);
          transaction.update(accRef, { balance: newBalance });

          // Log bank transaction showing reversal / adjustment
          const txRef = doc(collection(db, 'bank_transactions'));
          const tx: BankTransaction = {
            id: txRef.id,
            accountId: payoutData.accountId,
            type: 'withdraw',
            amount: payoutData.amount,
            date: Date.now(),
            reference: 'Payout Reversal',
            notes: 'পাঠাও পেআউট রিভার্সাল / স্ট্যাটাস পরিবর্তন'
          };
          transaction.set(txRef, tx);
        }

        transaction.update(payoutRef, { status });
      });

      toast.success('পেআউট তথ্য ও ব্যাংক সমন্বয় সফল হয়েছে!');
    } catch (err: any) {
      console.error('Error updating pathao payout status:', err);
      toast.error(err.message || 'স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে।');
    }
  };

  // Delete Pathao Payout
  const deletePathaoPayout = async (payoutId: string) => {
    try {
      await deleteDoc(doc(db, 'pathao_payouts', payoutId));
      toast.success('পাঠাও পেআউট এন্ট্রি মুছে ফেলা হয়েছে!');
    } catch (err) {
      console.error('Error deleting pathao payout:', err);
      toast.error('মুছে ফেলতে ব্যর্থ হয়েছে।');
    }
  };

  return (
    <FinanceContext.Provider value={{
      partners,
      partnerTransactions,
      bankAccounts,
      bankTransactions,
      pathaoPayouts,
      loading,
      updatePartner,
      addPartnerTransaction,
      deletePartnerTransaction,
      distributeProfit,
      addBankAccount,
      updateBankAccount,
      deleteBankAccount,
      addBankTransaction,
      deleteBankTransaction,
      addPathaoPayout,
      updatePathaoPayoutStatus,
      deletePathaoPayout
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
