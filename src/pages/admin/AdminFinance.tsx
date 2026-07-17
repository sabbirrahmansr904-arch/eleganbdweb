/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFinance } from '../../contexts/FinanceContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice } from '../../lib/utils';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  CreditCard, 
  ArrowUpDown, 
  Download, 
  Check, 
  X, 
  Percent, 
  DollarSign, 
  Wallet, 
  Building2,
  TrendingUp,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  PiggyBank,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminFinance(): React.JSX.Element {
  const {
    partners,
    partnerTransactions,
    bankAccounts,
    bankTransactions,
    loading,
    updatePartner,
    addPartnerTransaction,
    deletePartnerTransaction,
    distributeProfit,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addBankTransaction,
    deleteBankTransaction
  } = useFinance();

  const { currency, rate } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'partnership' | 'bank') || 'partnership';
  const setActiveTab = (tab: 'partnership' | 'bank') => setSearchParams({ tab });

  // Modals visibility states
  const [showPartnerTxModal, setShowPartnerTxModal] = useState(false);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showBankTxModal, setShowBankTxModal] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);

  // Form states
  const [partnerTxForm, setPartnerTxForm] = useState({
    partnerId: '',
    type: 'investment' as 'investment' | 'withdrawal',
    amount: '',
    notes: ''
  });

  const [profitForm, setProfitForm] = useState({
    totalProfit: '',
    splitMethod: 'equal' as 'equal' | 'percentage'
  });

  const [accountForm, setAccountForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    initialBalance: ''
  });

  const [bankTxForm, setBankTxForm] = useState({
    accountId: '',
    type: 'deposit' as 'deposit' | 'withdraw' | 'transfer',
    targetAccountId: '',
    amount: '',
    reference: '',
    notes: ''
  });

  const [editingPartnerData, setEditingPartnerData] = useState({
    name: '',
    sharePercent: ''
  });

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

  // Calculate Partnership aggregates
  const totalInvestment = partners.reduce((sum, p) => sum + (p.investment || 0), 0);
  const totalWithdrawn = partners.reduce((sum, p) => sum + (p.withdrawn || 0), 0);
  const remainingCapital = totalInvestment - totalWithdrawn;

  // Calculate Bank aggregates
  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Form Submissions
  const handlePartnerTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(partnerTxForm.amount);
    if (!partnerTxForm.partnerId || isNaN(amountNum) || amountNum <= 0) {
      toast.error('দয়া করে সঠিক পার্টনার ও পরিমাণ ইনপুট দিন।');
      return;
    }

    const partner = partners.find(p => p.id === partnerTxForm.partnerId);
    await addPartnerTransaction({
      partnerId: partnerTxForm.partnerId,
      partnerName: partner?.name || 'Unknown',
      type: partnerTxForm.type,
      amount: amountNum,
      notes: partnerTxForm.notes
    });

    setPartnerTxForm({ partnerId: '', type: 'investment', amount: '', notes: '' });
    setShowPartnerTxModal(false);
  };

  const handleProfitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const profitNum = parseFloat(profitForm.totalProfit);
    if (isNaN(profitNum) || profitNum <= 0) {
      toast.error('সঠিক লাভের পরিমাণ ইনপুট দিন।');
      return;
    }

    await distributeProfit(profitNum, profitForm.splitMethod);
    setProfitForm({ totalProfit: '', splitMethod: 'equal' });
    setShowProfitModal(false);
  };

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
        const acc = bankAccounts.find(a => a.id === entry.accId);
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

  const startEditPartner = (p: Partner) => {
    setEditingPartnerId(p.id);
    setEditingPartnerData({
      name: p.name,
      sharePercent: p.sharePercent.toString()
    });
  };

  const handleSavePartnerEdit = async (id: string) => {
    const original = partners.find(p => p.id === id);
    if (!original) return;

    const parsedPercent = parseFloat(editingPartnerData.sharePercent);
    if (!editingPartnerData.name.trim() || isNaN(parsedPercent) || parsedPercent < 0 || parsedPercent > 100) {
      toast.error('দয়া করে সঠিক নাম এবং শতাংশ (০-১০০) প্রদান করুন।');
      return;
    }

    await updatePartner({
      ...original,
      name: editingPartnerData.name,
      sharePercent: parsedPercent
    });

    setEditingPartnerId(null);
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
      
      {/* Upper Navigation & Tabs Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-600" />
            আর্থিক হিসাব-নিকাশ
          </h1>
          <p className="text-xs text-gray-400 font-medium">অংশীদারিত্ব মূলধন খতিয়ান এবং ব্যাংক ও পেমেন্ট গেটওয়ে তহবিল ট্র্যাকার</p>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex bg-gray-100/80 p-1 rounded-xl self-start md:self-auto">
          <button 
            onClick={() => setActiveTab('partnership')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'partnership' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-black'}`}
          >
            <Users className="w-3.5 h-3.5" />
            অংশীদারিত্ব লেজার (৩ জন অংশীদার)
          </button>
          <button 
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'bank' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-black'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            ব্যাংক অ্যাকাউন্ট & তহবিল
          </button>
        </div>
      </div>

      {/* --- PARTNERSHIP TAB CONTENT --- */}
      {activeTab === 'partnership' && (
        <div className="space-y-6">
          
          {/* Stats Summary Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">মোট অংশীদারি মূলধন</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{formatPrice(totalInvestment)}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">পার্টনারদের মোট জমা করা মূলধন</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <PiggyBank className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">মোট উত্তোলিত অর্থ</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{formatPrice(totalWithdrawn)}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">মুনাফা এবং ব্যক্তিগত উত্তোলন</p>
              </div>
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">অবশিষ্ট নেট মূলধন</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{formatPrice(remainingCapital)}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">ব্যবসায় চলমান অংশীদারদের তহবিল</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Core Partnership Actions Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-gray-900">মূলধন এবং লভ্যাংশ বন্টন গেটওয়ে</h4>
              <p className="text-xs text-gray-400">সহজেই পার্টনারদের টাকা ইনভেস্টমেন্ট, উত্তোলন কিংবা লাভ বন্টন (সমান বা অনুপাত অনুযায়ী) হিসাব করুন</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPartnerTxModal(true)}
                className="bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                টাকা জমা / উত্তোলন
              </button>
              <button 
                onClick={() => setShowProfitModal(true)}
                className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Percent className="w-3.5 h-3.5" />
                লাভ বন্টন (Profit Split)
              </button>
            </div>
          </div>

          {/* Partners Table & Inline Editor */}
          <div className="bg-white border border-gray-100 rounded-[20px] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">৩ জন অংশীদারদের তালিকা</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">নাম পরিবর্তন বা শেয়ার পারসেন্টেজ কাস্টমাইজ করতে এডিট করুন</p>
              </div>
              <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
                অংশীদারিত্বের মোট শেয়ার: {partners.reduce((sum, p) => sum + p.sharePercent, 0).toFixed(2)}%
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 border-b border-gray-100 uppercase tracking-wider font-black text-[9px]">
                    <th className="py-4 px-6">নাম (Partner Name)</th>
                    <th className="py-4 px-6 text-center">শেয়ার অংশ (%)</th>
                    <th className="py-4 px-6 text-right">মোট মূলধন জমা (৳)</th>
                    <th className="py-4 px-6 text-right">মোট উত্তোলন/লভ্যাংশ (৳)</th>
                    <th className="py-4 px-6 text-right">নেট অবস্থান (৳)</th>
                    <th className="py-4 px-6 text-center w-24">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
                  {partners.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/20 transition-colors">
                      <td className="py-4 px-6">
                        {editingPartnerId === p.id ? (
                          <input 
                            type="text" 
                            value={editingPartnerData.name} 
                            onChange={(e) => setEditingPartnerData({ ...editingPartnerData, name: e.target.value })}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-indigo-500 w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center text-[10px] text-indigo-600 font-black">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-900">{p.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {editingPartnerId === p.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <input 
                              type="number" 
                              value={editingPartnerData.sharePercent} 
                              onChange={(e) => setEditingPartnerData({ ...editingPartnerData, sharePercent: e.target.value })}
                              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-indigo-500 w-20 text-center"
                              step="any"
                              min="0"
                              max="100"
                            />
                            <span>%</span>
                          </div>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-[10px] font-black">
                            {p.sharePercent.toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right text-indigo-600">{formatPrice(p.investment || 0)}</td>
                      <td className="py-4 px-6 text-right text-rose-600">
                        {p.withdrawn < 0 ? (
                          <span className="text-emerald-600" title="লভ্যাংশ পাওনা">
                            (পাওনা) {formatPrice(Math.abs(p.withdrawn))}
                          </span>
                        ) : (
                          formatPrice(p.withdrawn || 0)
                        )}
                      </td>
                      <td className="py-4 px-6 text-right text-gray-900">
                        {formatPrice((p.investment || 0) - (p.withdrawn || 0))}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {editingPartnerId === p.id ? (
                          <div className="flex justify-center gap-1">
                            <button 
                              onClick={() => handleSavePartnerEdit(p.id)}
                              className="bg-emerald-500 text-white p-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
                              title="সংরক্ষণ করুন"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setEditingPartnerId(null)}
                              className="bg-gray-200 text-gray-500 p-1.5 rounded-lg hover:bg-gray-300 transition-colors"
                              title="বাতিল করুন"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => startEditPartner(p)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-1.5 rounded-lg transition-colors mx-auto block"
                            title="এডিট করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Partnership Transactions History */}
          <div className="bg-white border border-gray-100 rounded-[20px] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">অংশীদারী লেনদেনের ইতিহাস</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">মূলধন জমা এবং লাভ উত্তোলনের বিস্তারিত হিসাব খতিয়ান</p>
            </div>
            
            <div className="overflow-x-auto">
              {partnerTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">কোনো পার্টনার লেনদেন পাওয়া যায়নি।</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-400 border-b border-gray-100 uppercase tracking-wider font-black text-[9px]">
                      <th className="py-4 px-6">তারিখ</th>
                      <th className="py-4 px-6">অংশীদার</th>
                      <th className="py-4 px-6">লেনদেনের ধরন</th>
                      <th className="py-4 px-6">পরিমাণ (৳)</th>
                      <th className="py-4 px-6">নোট / বিবরণ</th>
                      <th className="py-4 px-6 text-center w-24">বাতিল</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
                    {partnerTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50/20 transition-colors">
                        <td className="py-4 px-6 text-gray-400 text-[10px] font-medium">
                          {new Date(tx.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-4 px-6 text-gray-900">{tx.partnerName}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                            tx.type === 'investment' 
                              ? 'bg-indigo-50 text-indigo-600' 
                              : tx.type === 'withdrawal' 
                              ? 'bg-rose-50 text-rose-600' 
                              : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {tx.type === 'investment' ? 'মূলধন জমা' : tx.type === 'withdrawal' ? 'ব্যক্তিগত উত্তোলন' : 'লভ্যাংশ বন্টন'}
                          </span>
                        </td>
                        <td className={`py-4 px-6 text-right font-black ${tx.type === 'investment' ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {tx.type === 'investment' ? '+' : '-'} {formatPrice(tx.amount)}
                        </td>
                        <td className="py-4 px-6 text-gray-400 font-medium">{tx.notes || '-'}</td>
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => {
                              if(window.confirm('এই লেনদেনটি মুছতে চান?')){
                                deletePartnerTransaction(tx.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
        </div>
      )}

      {/* --- BANK ACCOUNTS TAB CONTENT --- */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          
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

            <div className="bg-indigo-600 text-white p-5 rounded-[20px] shadow-[0_4px_12px_rgba(79,70,229,0.15)] flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-200">তহবিল অপারেশন</h4>
                <p className="text-xs text-indigo-100 mt-1">ব্যাংক ও গেটওয়ে ব্যালেন্স জমা, উত্তোলন কিংবা এক অ্যাকাউন্ট থেকে অন্য অ্যাকাউন্টে ট্রান্সফার করুন</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setShowAddAccountModal(true)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  নতুন অ্যাকাউন্ট
                </button>
                <button 
                  onClick={() => setShowBankTxModal(true)}
                  className="flex-1 bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  নতুন লেনদেন
                </button>
              </div>
            </div>
          </div>

          {/* Daily Cash-In/Deposit Entry Section */}
          <div className="bg-[#FAF9F6] border border-indigo-50/70 rounded-[20px] p-6 shadow-[0_2px_12px_rgba(79,70,229,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60">
              <div>
                <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  দৈনিক জমা/ক্যাশ-ইন এন্ট্রি (Daily Cash-In Entry)
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">প্রতিদিন প্রতিটি ব্যাংক বা গেটওয়ে অ্যাকাউন্টে যে টাকা ঢুকছে তা এখানে সহজে লিখে রাখুন</p>
              </div>

              {/* Date Selector */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-150 shadow-xs">
                <span className="text-[10px] font-black text-gray-500">লেনদেনের তারিখ:</span>
                <input 
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="text-xs font-bold text-gray-700 focus:outline-none cursor-pointer bg-transparent"
                />
              </div>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">কোনো সক্রিয় ব্যাংক অ্যাকাউন্ট পাওয়া যায়নি। প্রথমে একটি অ্যাকাউন্ট তৈরি করুন।</div>
            ) : (
              <div className="mt-4 space-y-3.5">
                <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] font-black text-gray-400 uppercase tracking-wider px-2">
                  <div className="col-span-4">ব্যাংক / ওয়ালেট অ্যাকাউন্ট</div>
                  <div className="col-span-3">জমার পরিমাণ (৳)</div>
                  <div className="col-span-5">রেফারেন্স / নোট (ঐচ্ছিক)</div>
                </div>

                {bankAccounts.map((acc) => (
                  <div key={acc.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center bg-white border border-gray-100 rounded-xl p-3 shadow-xs hover:shadow-sm transition-all">
                    <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-50/75 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-black">
                        {acc.bankName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-800">{acc.bankName}</h4>
                        <p className="text-[10px] text-gray-400 font-mono font-medium">{acc.accountName} - {acc.accountNumber}</p>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-3">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">৳</span>
                        <input
                          type="number"
                          placeholder="০.০০"
                          value={dailyAmounts[acc.id] || ''}
                          onChange={(e) => setDailyAmounts({ ...dailyAmounts, [acc.id]: e.target.value })}
                          className="pl-7 pr-3 py-1.5 w-full border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-xl text-xs font-bold text-gray-800 transition-all outline-none bg-gray-50/30"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-5">
                      <input
                        type="text"
                        placeholder="যেমন: দৈনিক ক্যাশ সেলস, কুরিয়ার পেমেন্ট রিসিভ..."
                        value={dailyNotes[acc.id] || ''}
                        onChange={(e) => setDailyNotes({ ...dailyNotes, [acc.id]: e.target.value })}
                        className="px-3 py-1.5 w-full border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-xl text-xs font-bold text-gray-800 transition-all outline-none bg-gray-50/30"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveDailyEntries}
                    disabled={isSubmittingDaily}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black text-xs py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmittingDaily ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        সংরক্ষণ করা হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        সবগুলো জমা সংরক্ষণ করুন
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Accounts Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {bankAccounts.map(acc => (
              <div key={acc.id} className="bg-white border border-gray-100 rounded-[20px] shadow-sm p-5 hover:border-indigo-100 transition-all group relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                      {acc.bankName}
                    </span>
                    <h3 className="text-base font-black text-gray-900 mt-2">{acc.accountName}</h3>
                    <p className="text-xs text-gray-400 font-mono font-bold">{acc.accountNumber}</p>
                    {acc.branch && <p className="text-[10px] text-gray-400">শাখা: {acc.branch}</p>}
                  </div>
                  <div className="text-gray-300 group-hover:text-indigo-100 transition-colors">
                    <Building2 className="w-8 h-8" />
                  </div>
                </div>

                <div className="border-t border-gray-50 mt-4 pt-3 flex items-baseline justify-between">
                  <span className="text-[10px] text-gray-400 font-bold">চলতি স্থিতি (Balance):</span>
                  <span className="text-xl font-black text-gray-900">{formatPrice(acc.balance || 0)}</span>
                </div>

                {/* Delete overlay hover button */}
                <button 
                  onClick={() => {
                    if (window.confirm('এই ব্যাংক অ্যাকাউন্টটি ডিলিট করতে চান? সব ট্রানজেকশন ডেটা নষ্ট হতে পারে।')){
                      deleteBankAccount(acc.id);
                    }
                  }}
                  className="absolute top-3 right-3 text-red-200 hover:text-red-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="অ্যাকাউন্ট ডিলিট"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Bank Transactions History table */}
          <div className="bg-white border border-gray-100 rounded-[20px] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">তহবিল লেনদেনের বিস্তারিত ইতিহাস</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">সবগুলো গেটওয়ে এবং ব্যাংক অ্যাকাউন্টের ক্যাশ ইন এবং ক্যাশ আউট লগ</p>
            </div>
            
            <div className="overflow-x-auto">
              {bankTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">কোনো ব্যাংক লেনদেন লগ পাওয়া যায়নি।</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-400 border-b border-gray-100 uppercase tracking-wider font-black text-[9px]">
                      <th className="py-4 px-6">তারিখ</th>
                      <th className="py-4 px-6">অ্যাকাউন্ট</th>
                      <th className="py-4 px-6">লেনদেনের ধরন</th>
                      <th className="py-4 px-6">পরিমাণ (৳)</th>
                      <th className="py-4 px-6">রেফারেন্স / ট্রানজেকশন আইডি</th>
                      <th className="py-4 px-6">নোট / বিবরণ</th>
                      <th className="py-4 px-6 text-center w-24">বাতিল</th>
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
                          <td className="py-4 px-6 text-gray-900">
                            <div>{acc ? acc.bankName : 'Unknown'}</div>
                            <div className="text-[10px] text-gray-400 font-normal">{acc ? acc.accountName : ''}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                              tx.type === 'deposit' 
                                ? 'bg-emerald-50 text-emerald-600' 
                                : tx.type === 'withdraw' 
                                ? 'bg-rose-50 text-rose-600' 
                                : 'bg-indigo-50 text-indigo-600'
                            }`}>
                              {tx.type === 'deposit' ? 'জমা (Deposit)' : tx.type === 'withdraw' ? 'উত্তোলন (Cashout)' : 'স্থানান্তর (Transfer)'}
                            </span>
                          </td>
                          <td className={`py-4 px-6 text-right font-black ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'deposit' ? '+' : '-'} {formatPrice(tx.amount)}
                          </td>
                          <td className="py-4 px-6 text-gray-900 font-mono font-bold">{tx.reference || '-'}</td>
                          <td className="py-4 px-6 text-gray-400 font-medium">{tx.notes || '-'}</td>
                          <td className="py-4 px-6 text-center">
                            <button 
                              onClick={() => {
                                if(window.confirm('এই লেনদেনটি মুছতে চান?')){
                                  deleteBankTransaction(tx.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
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
      )}

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Partner Transaction Modal */}
      {showPartnerTxModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">অংশীদার টাকা জমা ও উত্তোলন</h3>
              <button onClick={() => setShowPartnerTxModal(false)} className="text-gray-400 hover:text-black transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePartnerTxSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">অংশীদার সিলেক্ট করুন *</label>
                <select 
                  required
                  value={partnerTxForm.partnerId} 
                  onChange={(e) => setPartnerTxForm({ ...partnerTxForm, partnerId: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                >
                  <option value="">সিলেক্ট করুন...</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sharePercent}%)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">লেনদেনের ধরন *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setPartnerTxForm({ ...partnerTxForm, type: 'investment' })}
                    className={`py-3 rounded-xl border text-xs font-black transition-all ${partnerTxForm.type === 'investment' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600' : 'border-gray-200 text-gray-500 bg-[#FCFDFE]'}`}
                  >
                    মূলধন জমা (Investment)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPartnerTxForm({ ...partnerTxForm, type: 'withdrawal' })}
                    className={`py-3 rounded-xl border text-xs font-black transition-all ${partnerTxForm.type === 'withdrawal' ? 'border-rose-600 bg-rose-50/50 text-rose-600' : 'border-gray-200 text-gray-500 bg-[#FCFDFE]'}`}
                  >
                    টাকা উত্তোলন (Withdrawal)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">টাকার পরিমাণ (৳) *</label>
                <input 
                  required
                  type="number" 
                  step="any"
                  placeholder="0.00"
                  value={partnerTxForm.amount} 
                  onChange={(e) => setPartnerTxForm({ ...partnerTxForm, amount: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">বিবরণ / নোট</label>
                <input 
                  type="text" 
                  placeholder="উদা: নতুন কাঁচামাল ক্রয়ের ইনভেস্টমেন্ট"
                  value={partnerTxForm.notes} 
                  onChange={(e) => setPartnerTxForm({ ...partnerTxForm, notes: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-sm uppercase tracking-wider"
              >
                লেনদেন যোগ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Profit Sharing Modal */}
      {showProfitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                <Percent className="w-5 h-5 text-emerald-600" />
                অটো লাভ বন্টন ক্যালকুলেটর (Profit Split)
              </h3>
              <button onClick={() => setShowProfitModal(false)} className="text-gray-400 hover:text-black transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfitSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">বন্টনযোগ্য মোট মুনাফা (৳) *</label>
                <input 
                  required
                  type="number" 
                  step="any"
                  placeholder="উদা: ১০০০০"
                  value={profitForm.totalProfit} 
                  onChange={(e) => setProfitForm({ ...profitForm, totalProfit: e.target.value })}
                  className="w-full bg-[#FCFDFE] border border-gray-150 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">মুনাফা বিভাজনের মাধ্যম *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setProfitForm({ ...profitForm, splitMethod: 'equal' })}
                    className={`py-3 rounded-xl border text-xs font-black transition-all ${profitForm.splitMethod === 'equal' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-600' : 'border-gray-200 text-gray-500 bg-[#FCFDFE]'}`}
                  >
                    সমানভাবে (Equal Split 1/3)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setProfitForm({ ...profitForm, splitMethod: 'percentage' })}
                    className={`py-3 rounded-xl border text-xs font-black transition-all ${profitForm.splitMethod === 'percentage' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-600' : 'border-gray-200 text-gray-500 bg-[#FCFDFE]'}`}
                  >
                    শেয়ার অনুপাতে (Share-Based)
                  </button>
                </div>
              </div>

              {/* Instant Share Live Preview */}
              {parseFloat(profitForm.totalProfit) > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">বন্টনের লাইভ খসড়া:</span>
                  {partners.map(p => {
                    let share = 0;
                    if (profitForm.splitMethod === 'equal') {
                      share = parseFloat(profitForm.totalProfit) / (partners.length || 3);
                    } else {
                      share = parseFloat(profitForm.totalProfit) * (p.sharePercent / 100);
                    }
                    return (
                      <div key={p.id} className="flex justify-between text-xs font-bold text-gray-700">
                        <span>{p.name}:</span>
                        <span>{formatPrice(Math.round(share * 100) / 100)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-sm uppercase tracking-wider"
              >
                মুনাফা বন্টন নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Bank Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">নতুন ব্যাংক অ্যাকাউন্ট / ওয়ালেট যোগ</h3>
              <button onClick={() => setShowAddAccountModal(false)} className="text-gray-400 hover:text-black transition-colors">
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-sm uppercase tracking-wider"
              >
                অ্যাকাউন্ট যোগ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Bank Transaction (Deposit/Withdrawal/Transfer) Modal */}
      {showBankTxModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">তহবিল স্থানান্তর ও লেনদেন</h3>
              <button onClick={() => setShowBankTxModal(false)} className="text-gray-400 hover:text-black transition-colors">
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-sm uppercase tracking-wider"
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
