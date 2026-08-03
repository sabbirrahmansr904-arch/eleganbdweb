/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice } from '../../lib/utils';
import { 
  Plus, 
  Trash2, 
  Pencil,
  CreditCard, 
  X, 
  Building2,
  Wallet, 
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminFinance(): React.JSX.Element {
  const {
    bankAccounts,
    bankTransactions,
    pathaoPayouts = [],
    loading,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addBankTransaction,
    deleteBankTransaction,
    addPathaoPayout,
    updatePathaoPayoutStatus,
    deletePathaoPayout
  } = useFinance();

  const { currency, rate } = useCurrency();

  // Modals visibility states
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showBankTxModal, setShowBankTxModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    initialBalance: ''
  });

  const [editAccountForm, setEditAccountForm] = useState({
    id: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    balance: 0
  });

  const handleEditClick = (acc: any) => {
    setEditAccountForm({
      id: acc.id,
      bankName: acc.bankName || '',
      accountName: acc.accountName || '',
      accountNumber: acc.accountNumber || '',
      branch: acc.branch || '',
      balance: acc.balance || 0
    });
    setShowEditAccountModal(true);
  };

  const handleEditAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccountForm.bankName || !editAccountForm.accountName || !editAccountForm.accountNumber) {
      toast.error('স্টার (*) চিহ্নিত ঘরগুলো পূরণ করা আবশ্যক।');
      return;
    }

    await updateBankAccount({
      id: editAccountForm.id,
      bankName: editAccountForm.bankName,
      accountName: editAccountForm.accountName,
      accountNumber: editAccountForm.accountNumber,
      branch: editAccountForm.branch,
      balance: editAccountForm.balance
    });

    setShowEditAccountModal(false);
  };

  const [bankTxForm, setBankTxForm] = useState({
    accountId: '',
    type: 'deposit' as 'deposit' | 'withdraw' | 'transfer',
    targetAccountId: '',
    amount: '',
    reference: '',
    notes: ''
  });

  // Pathao payout Form state
  const [payoutForm, setPayoutForm] = useState({
    accountId: '',
    amount: '',
    date: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    reference: '',
    notes: ''
  });
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  // Daily deposits state
  const [dailyDate, setDailyDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [dailyAmounts, setDailyAmounts] = useState<Record<string, string>>({});
  const [dailyNotes, setDailyNotes] = useState<Record<string, string>>({});
  const [isSubmittingDaily, setIsSubmittingDaily] = useState(false);

  // Calculate Bank aggregates
  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Form Submissions
  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.bankName || !accountForm.accountName || !accountForm.accountNumber) {
      toast.error('স্টার (*) চিহ্নিত ঘরগুলো পূরণ করা আবশ্যক।');
      return;
    }

    const initBal = parseFloat(accountForm.initialBalance) || 0;
    await addBankAccount({
      bankName: accountForm.bankName,
      accountName: accountForm.accountName,
      accountNumber: accountForm.accountNumber,
      branch: accountForm.branch,
      initialBalance: initBal
    });

    setAccountForm({ bankName: '', accountName: '', accountNumber: '', branch: '', initialBalance: '' });
    setShowAddAccountModal(false);
  };

  const handleBankTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(bankTxForm.amount);
    if (!bankTxForm.accountId || isNaN(amountNum) || amountNum <= 0) {
      toast.error('দয়া করে সঠিক অ্যাকাউন্ট ও পরিমাণ ইনপুট দিন।');
      return;
    }

    if (bankTxForm.type === 'transfer' && !bankTxForm.targetAccountId) {
      toast.error('দয়া করে প্রাপক (Target) অ্যাকাউন্ট সিলেক্ট করুন।');
      return;
    }

    await addBankTransaction({
      accountId: bankTxForm.accountId,
      type: bankTxForm.type,
      amount: amountNum,
      reference: bankTxForm.reference,
      notes: bankTxForm.notes
    }, bankTxForm.type === 'transfer' ? bankTxForm.targetAccountId : undefined);

    setBankTxForm({
      accountId: '',
      type: 'deposit',
      targetAccountId: '',
      amount: '',
      reference: '',
      notes: ''
    });
    setShowBankTxModal(false);
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutForm.amount);
    if (!payoutForm.accountId || isNaN(amountNum) || amountNum <= 0) {
      toast.error('দয়া করে সঠিক ব্যাংক এবং পরিমাণ ইনপুট দিন।');
      return;
    }

    setIsSubmittingPayout(true);
    try {
      const dateParts = payoutForm.date.split('-');
      const targetDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        12, 0, 0
      );
      const timestamp = targetDate.getTime();

      await addPathaoPayout({
        accountId: payoutForm.accountId,
        amount: amountNum,
        date: timestamp,
        status: 'Pending',
        reference: payoutForm.reference || undefined,
        notes: payoutForm.notes || undefined
      });

      setPayoutForm({
        accountId: '',
        amount: '',
        date: (() => {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        reference: '',
        notes: ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleSaveDailyEntries = async () => {
    const entriesToSave = Object.entries(dailyAmounts)
      .map(([accId, amountStr]) => {
        const amount = parseFloat(amountStr);
        return { accId, amount, notes: dailyNotes[accId] || '' };
      })
      .filter(entry => !isNaN(entry.amount) && entry.amount > 0);

    if (entriesToSave.length === 0) {
      toast.error('অনুগ্রহ করে অন্তত একটি অ্যাকাউন্টে জমার পরিমাণ লিখুন।');
      return;
    }

    setIsSubmittingDaily(true);
    try {
      const dateParts = dailyDate.split('-');
      const targetDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        12, 0, 0
      );
      const timestamp = targetDate.getTime();

      for (const entry of entriesToSave) {
        await addBankTransaction({
          accountId: entry.accId,
          type: 'deposit',
          amount: entry.amount,
          reference: 'Daily Entry',
          notes: entry.notes || 'দৈনিক হিসাব ভুক্তি',
          date: timestamp
        });
      }

      toast.success('সবগুলো দৈনিক জমা সফলভাবে রেকর্ড করা হয়েছে!');
      setDailyAmounts({});
      setDailyNotes({});
    } catch (err) {
      console.error('Error saving daily entries:', err);
      toast.error('দৈনিক জমা সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmittingDaily(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-2 font-sans bg-[#FBFBFD] rounded-[20px] p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ফাইনান্স লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#FBFBFD] min-h-screen text-black antialiased">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            ব্যাংক অ্যাকাউন্ট & তহবিল
          </h1>
          <p className="text-xs text-gray-400 font-medium">ডিজিটাল ওয়ালেট, ব্যাংক অ্যাকাউন্ট ও পেমেন্ট গেটওয়ে তহবিল ট্র্যাকার</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAddAccountModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন অ্যাকাউন্ট যোগ
          </button>
          <button 
            onClick={() => setShowBankTxModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            তহবিল স্থানান্তরিত / লেনদেন
          </button>
        </div>
      </div>

      {/* BANK ACCOUNTS & PATHAO TRACKER DUAL-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: BANK ACCOUNTS AND TRANSACTION HISTORY (Spans 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
        
        {/* Bank Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between col-span-1 md:col-span-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">মোট ব্যাংক এবং গেটওয়ে তহবিল</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{formatPrice(totalBankBalance)}</h3>
              <p className="text-xs text-gray-400 mt-1">সবগুলো সক্রিয় ডিজিটাল ওয়ালেট ও ব্যাংক অ্যাকাউন্টের মোট জমা স্থিতি</p>
            </div>
            <div className="w-16 h-16 bg-indigo-50 rounded-[20px] flex items-center justify-center text-indigo-600">
              <Wallet className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">মোট ব্যাংক অ্যাকাউন্ট</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{bankAccounts.length} টি</h3>
              <p className="text-xs text-gray-400 mt-1">সক্রিয় পেমেন্ট একাউন্ট</p>
            </div>
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Bank Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bankAccounts.map(acc => (
            <div key={acc.id} className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4 hover:border-gray-200 transition-all group relative">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-black text-gray-900">{acc.bankName}</h4>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">{acc.accountName}</p>
                  <p className="text-[10px] text-gray-400 font-mono tracking-wider mt-1">{acc.accountNumber}</p>
                  {acc.branch && <span className="inline-block text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md mt-1 font-semibold">{acc.branch}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleEditClick(acc)}
                    className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="সম্পাদনা করুন"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm('এই ব্যাংক অ্যাকাউন্টটি মুছতে চান?')){
                        deleteBankAccount(acc.id);
                      }
                    }}
                    className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="অ্যাকাউন্ট ডিলিট করুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">বর্তমান ব্যালেন্স</span>
                <span className="text-lg font-black text-indigo-600">{formatPrice(acc.balance || 0)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* --- DAILY MULTI-ACCOUNT DEPOSIT ENTRY MODULE --- */}
        <div className="bg-white border border-gray-100 rounded-[20px] shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-50 pb-4">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                দৈনিক ব্যাংক / ওয়ালেট ব্যালেন্স ইনপুট এনট্রি
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">প্রতিদিনের বিক্রীত বা সংগৃহীত টাকা সরাসরি বিভিন্ন একাউন্টে একবারে এনট্রি করুন</p>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 px-3 py-1.5 rounded-xl outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map(acc => (
              <div key={acc.id} className="bg-gray-50/60 border border-gray-100 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800">{acc.bankName}</span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    বর্তমান: {formatPrice(acc.balance)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 truncate font-mono">{acc.accountName} - {acc.accountNumber}</p>
                
                <div className="space-y-1.5 pt-1">
                  <input 
                    type="number"
                    step="any"
                    placeholder="আজকের জমার পরিমাণ (৳)"
                    value={dailyAmounts[acc.id] || ''}
                    onChange={(e) => setDailyAmounts({ ...dailyAmounts, [acc.id]: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 placeholder:text-gray-300 outline-none focus:border-emerald-500"
                  />
                  <input 
                    type="text"
                    placeholder="সংক্ষিপ্ত নোট (ঐচ্ছিক)"
                    value={dailyNotes[acc.id] || ''}
                    onChange={(e) => setDailyNotes({ ...dailyNotes, [acc.id]: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[11px] font-medium text-gray-700 placeholder:text-gray-300 outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveDailyEntries}
              disabled={isSubmittingDaily}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <PlusCircle className="w-4 h-4" />
              {isSubmittingDaily ? 'সংরক্ষণ হচ্ছে...' : 'সবগুলো দৈনিক জমা সেভ করুন'}
            </button>
          </div>
        </div>

        {/* Bank Transactions History */}
        <div className="bg-white border border-gray-100 rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">ব্যাংক ও ওয়ালেট লেনদেনের ইতিহাস</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">ডিপোজিট, উইথড্র ও ট্রান্সফারের বিস্তারিত খতিয়ান</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {bankTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">কোনো ব্যাংক লেনদেন পাওয়া যায়নি।</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 border-b border-gray-100 uppercase tracking-wider font-black text-[9px]">
                    <th className="py-4 px-6">তারিখ</th>
                    <th className="py-4 px-6">অ্যাকাউন্ট</th>
                    <th className="py-4 px-6">ধরণ</th>
                    <th className="py-4 px-6">রেফারেন্স / নোট</th>
                    <th className="py-4 px-6 text-right">পরিমাণ (৳)</th>
                    <th className="py-4 px-6 text-center w-20">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
                  {bankTransactions.map(tx => {
                    const acc = bankAccounts.find(a => a.id === tx.accountId);
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/20 transition-colors">
                        <td className="py-4 px-6 text-gray-400 text-[10px] font-medium">
                          {new Date(tx.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-900 font-bold">{acc?.bankName || 'Unknown Bank'}</span>
                          <p className="text-[10px] text-gray-400 font-normal">{acc?.accountName}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 w-max ${
                            tx.type === 'deposit' 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : tx.type === 'withdraw' 
                              ? 'bg-rose-50 text-rose-600' 
                              : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {tx.type === 'deposit' && <ArrowDownLeft className="w-3 h-3" />}
                            {tx.type === 'withdraw' && <ArrowUpRight className="w-3 h-3" />}
                            {tx.type === 'transfer' && <RefreshCw className="w-3 h-3" />}
                            {tx.type === 'deposit' ? 'জমা' : tx.type === 'withdraw' ? 'উত্তোলন' : 'ট্রান্সফার'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {tx.reference && <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 mr-2">{tx.reference}</span>}
                          <span>{tx.notes || '-'}</span>
                        </td>
                        <td className={`py-4 px-6 text-right font-black ${
                          tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.type === 'deposit' ? '+' : '-'} {formatPrice(tx.amount)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => {
                              if(window.confirm('এই লেনদেনটি মুছতে চান?')){
                                deleteBankTransaction(tx.id);
                              }
                            }}
                            className="text-gray-300 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: PATHAO PAYOUTS TRACKER (Spans 1 column) */}
      <div className="lg:col-span-1 space-y-6">
        
        <div className="bg-white border border-gray-100 rounded-[20px] shadow-sm p-5 space-y-5">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500 animate-spin-slow" />
              পাঠাও পেআউট ট্র্যাকার (Pathao Payout)
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">পাঠাও কুরিয়ার থেকে ব্যাংক অ্যাকাউন্টে আসা তহবিলের খতিয়ান</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl">
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-600">পেন্ডিং পেআউট (Pending)</p>
              <h4 className="text-base font-black text-amber-700 mt-1">
                {formatPrice(pathaoPayouts.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0))}
              </h4>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">প্রাপ্ত পেআউট (Paid)</p>
              <h4 className="text-base font-black text-emerald-700 mt-1">
                {formatPrice(pathaoPayouts.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0))}
              </h4>
            </div>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handlePayoutSubmit} className="bg-gray-50/50 border border-gray-100 p-4 rounded-2xl space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500">নতুন পেআউট এন্ট্রি</h4>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">প্রাপক ব্যাংক অ্যাকাউন্ট *</label>
              <select
                required
                value={payoutForm.accountId}
                onChange={(e) => setPayoutForm({ ...payoutForm, accountId: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none cursor-pointer"
              >
                <option value="">সিলেক্ট করুন...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">টাকার পরিমাণ (৳) *</label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">তারিখ *</label>
                <input
                  required
                  type="date"
                  value={payoutForm.date}
                  onChange={(e) => setPayoutForm({ ...payoutForm, date: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">রেফারেন্স / ইনভয়েস</label>
                <input
                  type="text"
                  placeholder="Ref ID"
                  value={payoutForm.reference}
                  onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">সংক্ষিপ্ত নোট</label>
                <input
                  type="text"
                  placeholder="নোট লিখুন"
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingPayout}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white font-black text-[10px] py-2.5 rounded-xl transition-all shadow-sm uppercase tracking-wider cursor-pointer"
            >
              {isSubmittingPayout ? 'যোগ হচ্ছে...' : 'পেআউট রেকর্ড যোগ করুন'}
            </button>
          </form>

          {/* Payout list */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500">পেআউট তালিকা (Payout Registry)</h4>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {pathaoPayouts.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-150 rounded-2xl">
                  কোনো পেআউট তালিকা পাওয়া যায়নি।
                </div>
              ) : (
                pathaoPayouts.map(payout => {
                  const acc = bankAccounts.find(a => a.id === payout.accountId);
                  return (
                    <div key={payout.id} className="bg-[#FCFDFE] border border-gray-150 rounded-2xl p-3.5 space-y-2 flex flex-col justify-between hover:border-gray-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5 text-left">
                          <span className="text-[10px] text-gray-400 font-black">
                            {new Date(payout.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <h5 className="text-xs font-black text-gray-900">{acc?.bankName || 'Unknown Wallet'}</h5>
                          <p className="text-[9px] text-gray-400 font-normal">{acc?.accountName}</p>
                          {payout.reference && (
                            <span className="inline-block font-mono text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 mr-1">
                              Ref: {payout.reference}
                            </span>
                          )}
                          {payout.notes && (
                            <p className="text-[9px] text-gray-500 mt-1 italic font-medium">“{payout.notes}”</p>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end justify-between h-full min-h-[60px]">
                          <span className="text-sm font-black text-slate-800 block">+{formatPrice(payout.amount)}</span>
                          
                          <div className="mt-2 flex items-center justify-end gap-1.5">
                            {payout.status === 'Pending' ? (
                              <button
                                onClick={() => {
                                  if(window.confirm('আপনি কি এই পেআউটটি Paid হিসেবে চিহ্নিত করতে চান? এটি স্বয়ংক্রিয়ভাবে ব্যাংক ব্যালেন্সে যোগ করবে!')){
                                    updatePathaoPayoutStatus(payout.id, 'Paid');
                                  }
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 rounded-lg text-[9px] font-black transition-all cursor-pointer flex items-center gap-1"
                                title="Mark as Paid"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                পেন্ডিং (Mark Paid)
                              </button>
                            ) : (
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] font-black flex items-center gap-1 select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                পেইড (Paid)
                              </span>
                            )}

                            <button
                              onClick={() => {
                                if(window.confirm('এই পেআউট এন্ট্রিটি মুছে ফেলতে চান?')){
                                  deletePathaoPayout(payout.id);
                                }
                              }}
                              className="text-gray-300 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

    </div>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Add Bank Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">নতুন ব্যাংক অ্যাকাউন্ট / ওয়ালেট যোগ</h3>
              <button onClick={() => setShowAddAccountModal(false)} className="text-gray-400 hover:text-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">ব্যাংক বা ওয়ালেটের নাম *</label>
                <input 
                  required
                  type="text" 
                  placeholder="উদা: bKash Personal, City Bank"
                  value={accountForm.bankName} 
                  onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">অ্যাকাউন্টের নাম *</label>
                <input 
                  required
                  type="text" 
                  placeholder="উদা: Elegan BD Ltd"
                  value={accountForm.accountName} 
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">অ্যাকাউন্ট নাম্বার / মোবাইল নাম্বার *</label>
                <input 
                  required
                  type="text" 
                  placeholder="উদা: 01XXXXXXXXX"
                  value={accountForm.accountNumber} 
                  onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">শাখা (Branch)</label>
                <input 
                  type="text" 
                  placeholder="উদা: Mirpur-10 (ঐচ্ছিক)"
                  value={accountForm.branch} 
                  onChange={(e) => setAccountForm({ ...accountForm, branch: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">প্রাথমিক ব্যালেন্স (৳)</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="0.00"
                  value={accountForm.initialBalance} 
                  onChange={(e) => setAccountForm({ ...accountForm, initialBalance: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-sm uppercase tracking-wider cursor-pointer"
              >
                অ্যাকাউন্ট যোগ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bank Account Modal */}
      {showEditAccountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">ব্যাংক অ্যাকাউন্ট / ওয়ালেট সংশোধন</h3>
              <button onClick={() => setShowEditAccountModal(false)} className="text-gray-400 hover:text-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditAccountSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">ব্যাংক বা ওয়ালেটের নাম *</label>
                <input 
                  required
                  type="text" 
                  placeholder="উদা: bKash Personal, City Bank"
                  value={editAccountForm.bankName} 
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, bankName: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">অ্যাকাউন্টের নাম *</label>
                <input 
                  required
                  type="text" 
                  placeholder="উদা: Elegan BD Ltd"
                  value={editAccountForm.accountName} 
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, accountName: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">অ্যাকাউন্ট নাম্বার / মোবাইল নাম্বার *</label>
                <input 
                  required
                  type="text" 
                  placeholder="উদা: 01XXXXXXXXX"
                  value={editAccountForm.accountNumber} 
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, accountNumber: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">শাখা (Branch)</label>
                <input 
                  type="text" 
                  placeholder="উদা: Mirpur-10 (ঐচ্ছিক)"
                  value={editAccountForm.branch} 
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, branch: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">ব্যালেন্স (৳)</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="0.00"
                  value={editAccountForm.balance || ''} 
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-sm uppercase tracking-wider cursor-pointer"
              >
                আপডেট করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Bank Transaction (Deposit/Withdrawal/Transfer) Modal */}
      {showBankTxModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">তহবিল স্থানান্তর ও লেনদেন</h3>
              <button onClick={() => setShowBankTxModal(false)} className="text-gray-400 hover:text-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBankTxSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">উৎস অ্যাকাউন্ট (Source Account) *</label>
                <select 
                  required
                  value={bankTxForm.accountId} 
                  onChange={(e) => setBankTxForm({ ...bankTxForm, accountId: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                >
                  <option value="">সিলেক্ট করুন...</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName} ({formatPrice(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">লেনদেনের ধরন *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button"
                    onClick={() => setBankTxForm({ ...bankTxForm, type: 'deposit' })}
                    className={`py-2.5 rounded-xl border text-[10px] font-black transition-all ${bankTxForm.type === 'deposit' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-600' : 'border-gray-200 text-gray-500 bg-[#FCFDFE]'}`}
                  >
                    জমা (Deposit)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBankTxForm({ ...bankTxForm, type: 'withdraw' })}
                    className={`py-2.5 rounded-xl border text-[10px] font-black transition-all ${bankTxForm.type === 'withdraw' ? 'border-rose-600 bg-rose-50/50 text-rose-600' : 'border-gray-200 text-gray-500 bg-[#FCFDFE]'}`}
                  >
                    উত্তোলন (Cashout)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBankTxForm({ ...bankTxForm, type: 'transfer' })}
                    className={`py-2.5 rounded-xl border text-[10px] font-black transition-all ${bankTxForm.type === 'transfer' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600' : 'border-gray-200 text-gray-500 bg-[#FCFDFE]'}`}
                  >
                    ট্রান্সফার (Transfer)
                  </button>
                </div>
              </div>

              {/* If Transfer, show target account selector */}
              {bankTxForm.type === 'transfer' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">প্রাপক অ্যাকাউন্ট (Target Account) *</label>
                  <select 
                    required
                    value={bankTxForm.targetAccountId} 
                    onChange={(e) => setBankTxForm({ ...bankTxForm, targetAccountId: e.target.value })}
                    className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                  >
                    <option value="">সিলেক্ট করুন...</option>
                    {bankAccounts
                      .filter(acc => acc.id !== bankTxForm.accountId)
                      .map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
                      ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">পরিমাণ (৳) *</label>
                <input 
                  required
                  type="number" 
                  step="any"
                  placeholder="0.00"
                  value={bankTxForm.amount} 
                  onChange={(e) => setBankTxForm({ ...bankTxForm, amount: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">রেফারেন্স / ট্রানজেকশন আইডি</label>
                <input 
                  type="text" 
                  placeholder="উদা: TXN8247924, bKash Ref"
                  value={bankTxForm.reference} 
                  onChange={(e) => setBankTxForm({ ...bankTxForm, reference: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">বিবরণ / নোট</label>
                <input 
                  type="text" 
                  placeholder="উদা: কুরিয়ার সার্ভিস থেকে ডেলিভারি পেমেন্ট"
                  value={bankTxForm.notes} 
                  onChange={(e) => setBankTxForm({ ...bankTxForm, notes: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-sm uppercase tracking-wider cursor-pointer"
              >
                লেনদেন যোগ করুন
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
