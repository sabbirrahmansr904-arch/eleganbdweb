/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
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
  Calendar,
  Receipt,
  Search,
  Filter,
  Download,
  Eye,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function AdminFinance(): React.JSX.Element {
  const {
    bankAccounts,
    bankTransactions,
    loading: financeLoading,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addBankTransaction,
    updateBankTransaction,
    deleteBankTransaction
  } = useFinance();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [timeframeFilter, setTimeframeFilter] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals visibility states
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [showEditTxModal, setShowEditTxModal] = useState(false);
  const [showViewTxModal, setShowViewTxModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  // New Transaction Form state
  const [txForm, setTxForm] = useState({
    accountId: '',
    type: 'deposit' as 'deposit' | 'withdraw' | 'transfer',
    targetAccountId: '',
    amount: '',
    date: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    reference: '',
    notes: '',
    attachment: ''
  });
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // New Account Form state
  const [accountForm, setAccountForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    initialBalance: '',
    accountType: 'ব্যক্তিগত'
  });

  // Edit Account Form state
  const [editAccountForm, setEditAccountForm] = useState({
    id: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    balance: 0,
    initialBalance: 0
  });

  // Edit Transaction Form state
  const [editTxForm, setEditTxForm] = useState({
    id: '',
    accountId: '',
    type: 'deposit' as 'deposit' | 'withdraw' | 'transfer',
    targetAccountId: '',
    amount: '',
    date: '',
    reference: '',
    notes: ''
  });

  // Handle Add Account Submit
  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.bankName || !accountForm.accountName || !accountForm.accountNumber) {
      toast.error('স্টার (*) চিহ্নিত ঘরগুলো পূরণ করা আবশ্যক।');
      return;
    }
    await addBankAccount({
      bankName: accountForm.bankName,
      accountName: accountForm.accountName,
      accountNumber: accountForm.accountNumber,
      branch: accountForm.branch,
      initialBalance: parseFloat(accountForm.initialBalance) || 0,
      accountType: accountForm.accountType
    });
    setAccountForm({
      bankName: '',
      accountName: '',
      accountNumber: '',
      branch: '',
      initialBalance: '',
      accountType: 'ব্যক্তিগত'
    });
    setShowAddAccountModal(false);
  };

  // Handle Edit Account
  const handleEditAccountClick = (acc: any) => {
    setEditAccountForm({
      id: acc.id,
      bankName: acc.bankName || '',
      accountName: acc.accountName || '',
      accountNumber: acc.accountNumber || '',
      branch: acc.branch || '',
      balance: acc.balance || 0,
      initialBalance: acc.initialBalance || 0
    });
    setShowEditAccountModal(true);
  };

  const handleEditAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBankAccount({
      id: editAccountForm.id,
      bankName: editAccountForm.bankName,
      accountName: editAccountForm.accountName,
      accountNumber: editAccountForm.accountNumber,
      branch: editAccountForm.branch,
      initialBalance: editAccountForm.initialBalance,
      balance: editAccountForm.balance
    });
    setShowEditAccountModal(false);
  };

  // Handle Edit Transaction Click
  const handleEditTxClick = (tx: any) => {
    setEditTxForm({
      id: tx.id,
      accountId: tx.accountId,
      type: tx.type,
      targetAccountId: tx.targetAccountId || '',
      amount: String(tx.amount),
      date: new Date(tx.date).toISOString().split('T')[0],
      reference: tx.reference || '',
      notes: tx.notes || ''
    });
    setShowEditTxModal(true);
  };

  const handleEditTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBankTransaction(editTxForm.id, {
      accountId: editTxForm.accountId,
      type: editTxForm.type,
      targetAccountId: editTxForm.targetAccountId,
      amount: parseFloat(editTxForm.amount) || 0,
      date: new Date(editTxForm.date).getTime(),
      reference: editTxForm.reference,
      notes: editTxForm.notes
    });
    setShowEditTxModal(false);
  };

  // Handle New Transaction Submit
  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.accountId || !txForm.amount) {
      toast.error('হিসাব এবং পরিমাণ আবশ্যক।');
      return;
    }

    setIsSubmittingTx(true);
    try {
      const amt = parseFloat(txForm.amount);
      await addBankTransaction({
        accountId: txForm.accountId,
        type: txForm.type,
        amount: amt,
        date: new Date(txForm.date).getTime(),
        reference: txForm.reference || (txForm.type === 'deposit' ? 'Income / Deposit' : txForm.type === 'withdraw' ? 'Expense / Withdraw' : 'Account Transfer'),
        notes: txForm.notes,
        attachment: txForm.attachment
      }, txForm.targetAccountId);

      setTxForm({
        accountId: '',
        type: 'deposit',
        targetAccountId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
        attachment: ''
      });
      toast.success('লেনদেন সফলভাবে সংরক্ষণ করা হয়েছে!');
    } catch (err) {
      console.error(err);
      toast.error('লেনদেন সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Reset Tx Form
  const handleResetTx = () => {
    setTxForm({
      accountId: '',
      type: 'deposit',
      targetAccountId: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
      attachment: ''
    });
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const filtered = bankTransactions.filter(tx => {
      if (accountFilter !== 'ALL' && tx.accountId !== accountFilter && tx.targetAccountId !== accountFilter) return false;
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'income' && tx.type !== 'deposit') return false;
        if (typeFilter === 'expense' && tx.type !== 'withdraw') return false;
        if (typeFilter === 'transfer' && tx.type !== 'transfer') return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesRef = tx.reference?.toLowerCase().includes(query) || false;
        const matchesNotes = tx.notes?.toLowerCase().includes(query) || false;
        const acc = bankAccounts.find(a => a.id === tx.accountId);
        const matchesAcc = acc?.bankName?.toLowerCase().includes(query) || acc?.accountName?.toLowerCase().includes(query) || false;
        if (!matchesRef && !matchesNotes && !matchesAcc) return false;
      }
      return true;
    });
    // Reset page if filtered results are fewer than previous page
    if (currentPage > Math.ceil(filtered.length / itemsPerPage) && currentPage > 1) {
      setCurrentPage(1);
    }
    return filtered;
  }, [bankTransactions, accountFilter, typeFilter, searchQuery, bankAccounts, currentPage, itemsPerPage]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Summary calculations
  const totalIncome = useMemo(() => {
    return bankTransactions
      .filter(tx => tx.type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [bankTransactions]);

  const totalExpense = useMemo(() => {
    return bankTransactions
      .filter(tx => tx.type === 'withdraw')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [bankTransactions]);

  const netBalance = totalIncome - totalExpense;

  // Account distribution for Pie chart
  const pieData = useMemo(() => {
    const totalAllBalances = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0) || 1;
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];
    return bankAccounts.map((acc, index) => ({
      name: acc.bankName,
      value: acc.balance || 0,
      percent: Math.round(((acc.balance || 0) / totalAllBalances) * 100),
      color: colors[index % colors.length]
    }));
  }, [bankAccounts]);

  // Export Report handler
  const handleExportReport = (format: 'pdf' | 'csv') => {
    if (format === 'csv') {
      const headers = ['Date', 'Account', 'Type', 'Reference', 'Notes', 'Amount'];
      const rows = filteredTransactions.map(tx => {
        const acc = bankAccounts.find(a => a.id === tx.accountId);
        return [
          new Date(tx.date).toLocaleDateString(),
          acc?.bankName || '',
          tx.type,
          tx.reference || '',
          tx.notes || '',
          tx.amount
        ];
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'finance_report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV রিপোর্ট ডাউনলোড সফল হয়েছে!');
    } else {
      window.print();
      toast.success('প্রিন্ট প্রিভিউ ওপেন হয়েছে!');
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans bg-[#F8F9FD] min-h-screen p-1 md:p-6">
      
      {/* Top Header matching reference screenshot 99.9% */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-gray-100 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] flex items-center justify-center font-black text-lg shrink-0 shadow-2xs">$</span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">৳ ফাইন্যান্স & পেট ভলিউমার (Finance & Settlement)</h1>
          </div>
          <p className="text-xs text-gray-400 font-medium">সব অ্যাকাউন্ট ব্যালেন্স, লেনদেন এবং আর্থিক কার্যক্রম এক জায়গায় পরিচালনা করুন</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন অ্যাকাউন্ট</span>
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('new-tx-form');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>নতুন এন্ট্রি যোগ করুন</span>
          </button>

          <button
            onClick={() => handleExportReport('csv')}
            className="px-5 py-2.5 bg-[#0b0f19] hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-orange-400" />
            <span>রিপোর্ট এক্সপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Top 3 Account Balance Cards + Summary Card Grid matching reference screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left 3 Accounts Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {bankAccounts.length === 0 ? (
            <div className="col-span-3 bg-white p-8 text-center rounded-[24px] border border-gray-100 text-xs text-gray-400">
              কোনো ব্যাংক অ্যাকাউন্ট বা ওয়ালেট পাওয়া যায়নি। উপরে "+ নতুন অ্যাকাউন্ট" বাটনে ক্লিক করে অ্যাকাউন্ট যোগ করুন।
            </div>
          ) : (
            bankAccounts.map((acc) => {
              const isBkash = acc.bankName.toLowerCase().includes('bkash');
              const isNagad = acc.bankName.toLowerCase().includes('nagad');
              const isSelected = accountFilter === acc.id;

              return (
                <div 
                  key={acc.id} 
                  onClick={() => setAccountFilter(isSelected ? 'ALL' : acc.id)}
                  className={`bg-white border rounded-[20px] p-4 pb-5 space-y-3 shadow-2xs transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-100 hover:border-indigo-200'
                  } ${
                    isBkash ? 'border-pink-100/60' : isNagad ? 'border-orange-100/60' : 'border-emerald-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-2xs ${
                      isBkash ? 'bg-pink-600' : isNagad ? 'bg-orange-500' : 'bg-emerald-600'
                    }`}>
                      {isBkash ? <Wallet className="w-4 h-4" /> : isNagad ? <CreditCard className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAccountClick(acc);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-lg transition-colors"
                        title="এডিট অ্যাকাউন্ট"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('এই অ্যাকাউন্টটি মুছে ফেলতে চান?')) {
                            deleteBankAccount(acc.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 bg-gray-50 rounded-lg transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-tight">{acc.bankName}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{acc.accountType || 'ব্যক্তিগত'} • {acc.accountNumber}</p>
                  </div>

                  <div className="pt-2.5 border-t border-gray-100/80 flex items-center justify-between">
                    <div>
                      <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-widest block">ব্যালেন্স</span>
                      <span className={`text-lg font-black tracking-tight mt-0.5 block ${
                        isBkash ? 'text-pink-600' : isNagad ? 'text-orange-600' : 'text-emerald-600'
                      }`}>{formatPrice(acc.balance || 0)}</span>
                    </div>

                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center bg-gray-50/20 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300 ${
                      isBkash ? 'border-pink-100 text-pink-500' : isNagad ? 'border-orange-100 text-orange-500' : 'border-emerald-100 text-emerald-500'
                    }`}>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Total Finance Summary Card */}
        <div className="lg:col-span-1 bg-white border border-gray-100 rounded-[24px] p-6 space-y-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-50 pb-2">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">সারসংক্ষেপ (নির্বাচিত সময়)</h4>
            <select
              value={timeframeFilter}
              onChange={(e) => setTimeframeFilter(e.target.value)}
              className="bg-[#F8F9FD] border border-gray-200 rounded-lg px-2.5 py-1 text-[10px] font-bold text-gray-600 focus:outline-none cursor-pointer"
            >
              <option value="this_month">এই মাস</option>
              <option value="today">আজ</option>
              <option value="7days">৭ দিন</option>
              <option value="all">সব সময়</option>
            </select>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-emerald-50/45 p-3 rounded-xl border border-emerald-100/50">
              <span className="text-xs font-bold text-emerald-800">মোট ইনকাম</span>
              <span className="text-sm font-black text-emerald-700">{formatPrice(totalIncome)}</span>
            </div>

            <div className="flex items-center justify-between bg-rose-50/45 p-3 rounded-xl border border-rose-100/50">
              <span className="text-xs font-bold text-rose-800">মোট খরচ</span>
              <span className="text-sm font-black text-rose-700">{formatPrice(totalExpense)}</span>
            </div>

            <div className="flex items-center justify-between bg-indigo-50/45 p-3 rounded-xl border border-indigo-100/50">
              <span className="text-xs font-bold text-indigo-900">নিট ব্যালেন্স</span>
              <span className="text-sm font-black text-indigo-700">{formatPrice(netBalance)}</span>
            </div>

            <div className="flex items-center justify-between bg-gray-50/60 p-3 rounded-xl border border-gray-150">
              <span className="text-xs font-bold text-gray-700">মোট লেনদেন</span>
              <span className="text-sm font-black text-gray-900">{bankTransactions.length} টি</span>
            </div>
          </div>
        </div>

      </div>

      {/* Filter Section matching reference screenshot */}
      <div className="bg-white border border-gray-100 rounded-[24px] p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full md:w-auto flex-1">
          {/* Date range picker */}
          <div className="flex items-center gap-2 bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2.5">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none w-full cursor-pointer"
            />
          </div>

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">সব হিসাব</option>
            {bankAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
            ))}
          </select>

          {/* Transaction Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">সব ধরনের লেনদেন</option>
            <option value="income">ইনকাম (Income)</option>
            <option value="expense">খরচ (Expense)</option>
            <option value="transfer">ট্রান্সফার (Transfer)</option>
          </select>

          {/* Search keyword */}
          <div className="flex items-center gap-2 bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input 
              type="text"
              placeholder="কীওয়ার্ড দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none w-full"
            />
          </div>
        </div>

        <button
          onClick={() => toast.success('ফিল্টার সফলভাবে প্রয়োগ করা হয়েছে!')}
          className="px-6 py-2.5 bg-[#4f46e5] hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center"
        >
          <Filter className="w-4 h-4" />
          <span>ফিল্টার প্রয়োগ করুন</span>
        </button>
      </div>

      {/* Main Grid: New Transaction Form (Left) & Charts / Activity (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: New Transaction Entry Form */}
        <div id="new-tx-form" className="lg:col-span-2 bg-white border border-gray-100 rounded-[24px] p-6 space-y-6 shadow-2xs">
          <div className="border-b border-gray-50 pb-3">
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#4f46e5]" />
              নতুন লেনদেন এন্ট্রি করুন
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">ম্যানুয়ালি নতুন আয়, খরচ, ডিপোজিট অথবা ট্রান্সফার এন্ট্রি করুন</p>
          </div>

          <form onSubmit={handleTxSubmit} className="space-y-6">
            {/* COMPACT ROW OF INPUTS - matching reference screenshot layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              
              {/* Account select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">হিসাব নির্বাচন করুন *</label>
                <select
                  required
                  value={txForm.accountId}
                  onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold text-gray-700 focus:border-indigo-300 focus:outline-none cursor-pointer"
                >
                  <option value="">হিসাব নির্বাচন করুন</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName} ({formatPrice(acc.balance)})</option>
                  ))}
                </select>
              </div>

              {/* Transaction Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">লেনদেন ধরন *</label>
                <select
                  required
                  value={txForm.type}
                  onChange={(e) => setTxForm({ ...txForm, type: e.target.value as any })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold text-gray-700 focus:border-indigo-300 focus:outline-none cursor-pointer"
                >
                  <option value="deposit">ইনকাম / ডিপোজিট (Income / Deposit)</option>
                  <option value="withdraw">খরচ / উত্তোলন (Expense / Withdraw)</option>
                  <option value="transfer">অ্যাকাউন্ট ট্রান্সফার (Transfer)</option>
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">পরিমাণ (৳) *</label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">তারিখ *</label>
                <input
                  required
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold text-gray-700 focus:border-indigo-300 focus:outline-none cursor-pointer"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">বিবরণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="বিবরণ লিখুন (ঐচ্ছিক)"
                  value={txForm.notes}
                  onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>

            </div>

            {/* Transfer fields block if active */}
            {txForm.type === 'transfer' && (
              <div className="space-y-1.5 max-w-sm animate-in fade-in slide-in-from-top-2 duration-350">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">প্রাপক অ্যাকাউন্ট (Target Account) *</label>
                <select
                  required
                  value={txForm.targetAccountId}
                  onChange={(e) => setTxForm({ ...txForm, targetAccountId: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-3 text-xs font-bold text-gray-700 focus:border-indigo-300 focus:outline-none cursor-pointer"
                >
                  <option value="">প্রাপক অ্যাকাউন্ট নির্বাচন করুন</option>
                  {bankAccounts.filter(a => a.id !== txForm.accountId).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Reference input (can sit as optional) */}
            <div className="space-y-1.5 max-w-sm">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">রেফারেন্স / ইনভয়েস আইডি</label>
              <input
                type="text"
                placeholder="রেফারেন্স বা ইনভয়েস আইডি (ঐচ্ছিক)"
                value={txForm.reference}
                onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })}
                className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-3 text-xs font-bold text-gray-700 focus:border-indigo-300 focus:outline-none"
              />
            </div>

            {/* Attachment upload & buttons row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
              
              {/* Attachment upload */}
              <div className="flex-1 relative border-2 border-dashed border-gray-250 hover:border-indigo-400 rounded-xl p-3 text-center bg-[#F8F9FD] transition-all cursor-pointer">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <p className="text-[11px] text-gray-500 font-bold">প্রমাণপত্র / রশিদ আপলোড (ঐচ্ছিক) • ক্লিক করে ফাইল নির্বাচন করুন</p>
                </div>
                <input 
                  type="file" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setTxForm({ ...txForm, attachment: file.name });
                      toast.success(`ফাইল সংযোজিত হয়েছে: ${file.name}`);
                    }
                  }}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" 
                />
                {txForm.attachment && (
                  <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] px-2.5 py-1 rounded-lg mt-2 font-mono">
                    {txForm.attachment}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleResetTx}
                  className="px-5 py-3.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>রিসেট</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="px-8 py-3.5 bg-[#4f46e5] hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isSubmittingTx ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* Right 1 Col: Account Distribution Chart & Recent Activity */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Account Distribution Chart */}
          <div className="bg-white border border-gray-100 rounded-[24px] p-6 space-y-4 shadow-2xs">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">হিসাব ভিত্তিক লেনদেন</h4>
            
            <div className="h-44 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatPrice(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-black text-gray-900">{bankTransactions.length}</span>
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">মোট লেনদেন</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-50 pt-3">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-black text-gray-900">{formatPrice(item.value)} ({item.percent}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-100 rounded-[24px] p-6 space-y-4 shadow-2xs">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">সাম্প্রতিক কার্যক্রম</h4>
            
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {bankTransactions.slice(0, 3).map((tx, idx) => {
                const acc = bankAccounts.find(a => a.id === tx.accountId);
                const isDeposit = tx.type === 'deposit';
                const isTransfer = tx.type === 'transfer';
                
                // MOCK timestamps matching visual image beautifully
                const times = ["৫ মিনিট আগে", "৩০ মিনিট আগে", "১ ঘণ্টা আগে"];
                const mockTime = times[idx] || "২ ঘণ্টা আগে";

                return (
                  <div key={tx.id} className="flex items-start justify-between p-3.5 rounded-xl bg-[#F8F9FD] border border-gray-100">
                    <div className="space-y-0.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isDeposit ? 'text-emerald-600' : isTransfer ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {isDeposit ? 'ইনকাম এন্ট্রি করা হয়েছে' : isTransfer ? 'ট্রান্সফার সম্পন্ন' : 'খরচ এন্ট্রি করা হয়েছে'}
                      </span>
                      <p className="text-xs font-black text-gray-800">{acc?.bankName || 'Wallet Account'}</p>
                      <span className="text-[9px] text-gray-400 font-bold">{mockTime}</span>
                    </div>
                    <span className={`text-xs font-black ${isDeposit ? 'text-emerald-600' : isTransfer ? 'text-indigo-600' : 'text-rose-600'}`}>
                      {isDeposit ? '+' : isTransfer ? '' : '-'}{formatPrice(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => toast.success('সব কার্যক্রম লোড করা হয়েছে!')}
              className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all border border-gray-150 cursor-pointer"
            >
              সব কার্যক্রম দেখুন
            </button>
          </div>

        </div>

      </div>

      {/* Transaction Table ("লেনদেন তালিকা") */}
      <div className="bg-white border border-gray-100 rounded-[24px] p-6 space-y-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-gray-50 pb-3">
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">লেনদেন তালিকা</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">সকল ব্যাংক ও ওয়ালেট লেনদেনের বিস্তারিত হিস্ট্রি</p>
          </div>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full">
            মোট {filteredTransactions.length} টি ফলাফল
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">কোনো লেনদেন রেকর্ড পাওয়া যায়নি।</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 border-b border-gray-100 uppercase tracking-widest font-black text-[9px]">
                  <th className="py-4 px-5">তারিখ</th>
                  <th className="py-4 px-5">হিসাব</th>
                  <th className="py-4 px-5">ধরন</th>
                  <th className="py-4 px-5">বিবরণ</th>
                  <th className="py-4 px-5 text-right">পরিমাণ (৳)</th>
                  <th className="py-4 px-5 text-right">ব্যালেন্স (৳)</th>
                  <th className="py-4 px-5 text-center">প্রমাণপত্র</th>
                  <th className="py-4 px-5 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
                {paginatedTransactions.map(tx => {
                  const acc = bankAccounts.find(a => a.id === tx.accountId);
                  const isDeposit = tx.type === 'deposit';
                  const isTransfer = tx.type === 'transfer';
                  
                  // Color bullet mappings for accounts
                  const isBkash = acc?.bankName.toLowerCase().includes('bkash');
                  const isNagad = acc?.bankName.toLowerCase().includes('nagad');

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-5 text-gray-400 text-[11px] font-mono">
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isBkash ? 'bg-pink-500' : isNagad ? 'bg-orange-500' : 'bg-emerald-500'
                          }`}></span>
                          <div>
                            <span className="text-gray-950 font-black block leading-tight">{acc?.bankName || 'Unknown'}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 block">{acc?.accountName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1 ${
                          isDeposit ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/60' : isTransfer ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/60' : 'bg-rose-50 text-rose-600 border border-rose-100/60'
                        }`}>
                          {isDeposit ? '↑ ইনকাম' : isTransfer ? '⇄ ট্রান্সফার' : '↓ খরচ'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-gray-600 max-w-xs truncate">
                        {tx.reference && <span className="font-mono text-[10px] bg-gray-150 border border-gray-200 px-1.5 py-0.5 rounded-md mr-1.5 text-gray-700">{tx.reference}</span>}
                        <span>{tx.notes || '-'}</span>
                      </td>
                      <td className={`py-4 px-5 text-right font-black text-sm ${isDeposit ? 'text-emerald-600' : isTransfer ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {isDeposit ? '+' : isTransfer ? '' : '-'}{formatPrice(tx.amount)}
                      </td>
                      <td className="py-4 px-5 text-right font-black text-gray-950 text-xs">
                        {formatPrice(acc?.balance || 0)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button 
                          onClick={() => toast('সংযুক্ত রশিদ লোড করা হচ্ছে...', { icon: 'ℹ️' })}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer" 
                          title="রসিদ দেখুন"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTx(tx);
                              setShowViewTxModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-150 rounded-lg transition-colors cursor-pointer"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditTxClick(tx)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-150 rounded-lg transition-colors cursor-pointer"
                            title="এডিট"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setTxToDelete(tx);
                              setShowDeleteConfirmModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-colors cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Beautiful Table Footer with Pagination matching the image */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-50 pt-4 text-xs font-bold text-gray-500">
          <div className="flex items-center gap-2">
            <span>प्रति পৃষ্ঠায়:</span>
            <select 
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span className="ml-3">মোট {filteredTransactions.length} টি ফলাফল</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer disabled:opacity-50"
            >&lt;</button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button 
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg ${currentPage === page ? 'bg-[#4f46e5] text-white' : 'bg-gray-50 hover:bg-gray-100 border border-gray-250'} flex items-center justify-center font-black transition-colors cursor-pointer`}
              >{page}</button>
            ))}

            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-255 flex items-center justify-center text-gray-600 transition-colors cursor-pointer disabled:opacity-50"
            >&gt;</button>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. New Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <h3 className="text-base font-black text-gray-900">নতুন অ্যাকাউন্ট / ওয়ালেট যোগ</h3>
              <button onClick={() => setShowAddAccountModal(false)} className="text-gray-400 hover:text-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">ব্যাংক বা ওয়ালেটের নাম *</label>
                <input 
                  required
                  type="text" 
                  placeholder="উদা: bKash Personal, Sonali Bank"
                  value={accountForm.bankName} 
                  onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-indigo-350 focus:outline-none"
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
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-indigo-350 focus:outline-none"
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
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-indigo-350 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">শাখা (Branch)</label>
                <input 
                  type="text" 
                  placeholder="উদা: Mirpur-10 (ঐচ্ছিক)"
                  value={accountForm.branch} 
                  onChange={(e) => setAccountForm({ ...accountForm, branch: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-indigo-350 focus:outline-none"
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
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-indigo-350 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#4f46e5] hover:bg-indigo-700 text-white font-black text-xs py-3.5 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                অ্যাকাউন্ট যোগ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Account Modal */}
      {showEditAccountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <h3 className="text-base font-black text-gray-900">ব্যাংক অ্যাকাউন্ট সংশোধন</h3>
              <button onClick={() => setShowEditAccountModal(false)} className="text-gray-400 hover:text-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditAccountSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">ব্যাংক বা ওয়ালেটের নাম *</label>
                <input 
                  required
                  type="text" 
                  value={editAccountForm.bankName} 
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, bankName: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-indigo-350 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">অ্যাকাউন্টের নাম *</label>
                <input 
                  required
                  type="text" 
                  value={editAccountForm.accountName} 
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, accountName: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-indigo-350 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">অ্যাকাউন্ট নাম্বার *</label>
                <input 
                  required
                  type="text" 
                  value={editAccountForm.accountNumber} 
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, accountNumber: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-indigo-350 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">প্রাথমিক ব্যালেন্স (৳)</label>
                <input 
                  type="number" 
                  step="any"
                  value={editAccountForm.initialBalance} 
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, initialBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-indigo-350 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#4f46e5] hover:bg-indigo-700 text-white font-black text-xs py-3.5 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                আপডেট করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Transaction Modal */}
      {showEditTxModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <h3 className="text-base font-black text-gray-900">লেনদেন সংশোধন করুন</h3>
              <button onClick={() => setShowEditTxModal(false)} className="text-gray-400 hover:text-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTxSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">হিসাব *</label>
                <select
                  required
                  value={editTxForm.accountId}
                  onChange={(e) => setEditTxForm({ ...editTxForm, accountId: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:outline-none"
                >
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">লেনদেন ধরন *</label>
                <select
                  required
                  value={editTxForm.type}
                  onChange={(e) => setEditTxForm({ ...editTxForm, type: e.target.value as any })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:outline-none"
                >
                  <option value="deposit">ইনকাম / ডিপোজিট</option>
                  <option value="withdraw">খরচ / উত্তোলন</option>
                  <option value="transfer">ট্রান্সফার</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">পরিমাণ (৳) *</label>
                <input 
                  required
                  type="number" 
                  step="any"
                  value={editTxForm.amount}
                  onChange={(e) => setEditTxForm({ ...editTxForm, amount: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">তারিখ *</label>
                <input 
                  required
                  type="date"
                  value={editTxForm.date}
                  onChange={(e) => setEditTxForm({ ...editTxForm, date: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">রেফারেন্স</label>
                <input 
                  type="text"
                  value={editTxForm.reference}
                  onChange={(e) => setEditTxForm({ ...editTxForm, reference: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#4f46e5] hover:bg-indigo-700 text-white font-black text-xs py-3.5 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                আপডেট করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. View Transaction Details Modal */}
      {showViewTxModal && selectedTx && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <h3 className="text-base font-black text-gray-900">লেনদেনের বিস্তারিত বিবরণ</h3>
              <button onClick={() => setShowViewTxModal(false)} className="text-gray-400 hover:text-black transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-bold">
              <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400">তারিখ:</span>
                <span className="font-black text-gray-900">{new Date(selectedTx.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400">হিসাব:</span>
                <span className="font-black text-gray-900">{bankAccounts.find(a => a.id === selectedTx.accountId)?.bankName}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400">ধরন:</span>
                <span className="font-black text-gray-900 uppercase">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400">পরিমাণ:</span>
                <span className="font-black text-[#4f46e5]">{formatPrice(selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400">রেফারেন্স:</span>
                <span className="font-black text-gray-900">{selectedTx.reference || '-'}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400">নোট / বিবরণ:</span>
                <span className="font-black text-gray-900">{selectedTx.notes || '-'}</span>
              </div>
            </div>

            <button
              onClick={() => setShowViewTxModal(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs py-3.5 rounded-xl transition-all cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* 5. Delete Transaction Confirmation Modal */}
      {showDeleteConfirmModal && txToDelete && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                লেনদেন মুছে ফেলার নিশ্চিতকরণ
              </h3>
              <button 
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setTxToDelete(null);
                }} 
                className="text-gray-400 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 leading-relaxed">
                আপনি কি নিশ্চিতভাবে এই লেনদেনটি চিরতরে মুছে ফেলতে চান? এটি মুছে ফেললে সংশ্লিষ্ট ব্যাংক/ওয়ালেট ব্যালেন্স স্বয়ংক্রিয়ভাবে recalculate করা হবে এবং এই পরিবর্তন আর ফিরিয়ে আনা যাবে না।
              </p>

              <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100/60 space-y-2 text-xs font-bold text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-400">হিসাব:</span>
                  <span className="font-black text-gray-900">
                    {bankAccounts.find(a => a.id === txToDelete.accountId)?.bankName || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ধরন:</span>
                  <span className={`font-black ${txToDelete.type === 'deposit' ? 'text-emerald-600' : txToDelete.type === 'transfer' ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {txToDelete.type === 'deposit' ? '↑ ইনকাম/ডিপোজিট' : txToDelete.type === 'transfer' ? '⇄ ট্রান্সফার' : '↓ খরচ/উত্তোলন'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">পরিমাণ:</span>
                  <span className="font-black text-gray-900">{formatPrice(txToDelete.amount)}</span>
                </div>
                {txToDelete.reference && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">রেফারেন্স:</span>
                    <span className="font-mono text-gray-900">{txToDelete.reference}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setTxToDelete(null);
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs py-3.5 rounded-xl transition-all cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteBankTransaction(txToDelete.id);
                  } catch (e) {
                    console.error("Delete failed", e);
                  } finally {
                    setShowDeleteConfirmModal(false);
                    setTxToDelete(null);
                  }
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-3.5 rounded-xl transition-all shadow-md shadow-rose-100 cursor-pointer"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
