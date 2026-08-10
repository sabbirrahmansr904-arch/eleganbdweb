/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useOrders } from '../../contexts/OrderContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice } from '../../lib/utils';
import { Order } from '../../types';
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
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Check,
  Download,
  Truck,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminFinance(): React.JSX.Element {
  const {
    bankAccounts,
    bankTransactions,
    pathaoPayouts = [],
    loading: financeLoading,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addBankTransaction,
    deleteBankTransaction,
    addPathaoPayout,
    updatePathaoPayoutStatus,
    deletePathaoPayout
  } = useFinance();

  const { orders = [], updateOrder, loading: ordersLoading } = useOrders();
  const { currency, rate } = useCurrency();

  // Active Main Tab State
  const [activeTab, setActiveTab] = useState<'orders' | 'banks' | 'pathao'>('orders');

  // --- ORDER FINANCE & PATHAO SETTLEMENT STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('SUCCESS_DELIVERED');
  const [settlementFilter, setSettlementFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Default Pathao rates (inside / outside dhaka)
  const [dhakaPathaoRate, setDhakaPathaoRate] = useState<number>(60);
  const [outsideDhakaPathaoRate, setOutsideDhakaPathaoRate] = useState<number>(120);

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

  // --- FILTERED ORDERS CALCULATION ---
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!order) return false;

      // Status filter
      if (statusFilter === 'SUCCESS_DELIVERED') {
        const s = (order.status || '').toLowerCase();
        const isSuccess = s === 'delivered' || s === 'success' || s === 'completed';
        if (!isSuccess) return false;
      } else if (statusFilter !== 'ALL') {
        if ((order.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      // Settlement filter
      if (settlementFilter === 'SETTLED' && !(order as any).payoutSettled) return false;
      if (settlementFilter === 'PENDING' && (order as any).payoutSettled) return false;

      // Date range filter
      if (dateRangeFilter !== 'ALL' && order.createdAt) {
        const orderTime = new Date(order.createdAt).getTime();
        const now = Date.now();
        if (dateRangeFilter === 'TODAY') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (orderTime < startOfToday.getTime()) return false;
        } else if (dateRangeFilter === 'LAST_7_DAYS') {
          if (now - orderTime > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateRangeFilter === 'THIS_MONTH') {
          const firstOfMonth = new Date();
          firstOfMonth.setDate(1);
          firstOfMonth.setHours(0, 0, 0, 0);
          if (orderTime < firstOfMonth.getTime()) return false;
        } else if (dateRangeFilter === 'CUSTOM' && customStartDate && customEndDate) {
          const startMs = new Date(customStartDate).setHours(0,0,0,0);
          const endMs = new Date(customEndDate).setHours(23,59,59,999);
          if (orderTime < startMs || orderTime > endMs) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invoiceMatch = order.invoiceNo ? String(order.invoiceNo).includes(q) : false;
        const idMatch = (order.id || '').toLowerCase().includes(q);
        const nameMatch = (order.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (order.phone || '').includes(q);
        const trackingMatch = (order.trackingId || (order as any).pathaoConsignmentId || '').toLowerCase().includes(q);
        if (!invoiceMatch && !idMatch && !nameMatch && !phoneMatch && !trackingMatch) return false;
      }

      return true;
    });
  }, [orders, statusFilter, settlementFilter, dateRangeFilter, customStartDate, customEndDate, searchQuery]);

  // Calculations for Order Finance Summary
  const orderFinanceSummary = useMemo(() => {
    let totalSales = 0;
    let totalAdvance = 0;
    let totalPathaoCharges = 0;
    let totalPathaoNetCodReceivable = 0;
    let totalNetStoreRevenue = 0;

    filteredOrders.forEach(order => {
      const total = Number(order.total) || 0;
      const advance = Number(order.advancePayment) || 0;
      
      const cityLower = (order.city || '').toLowerCase();
      const isDhaka = cityLower.includes('dhaka') || cityLower.includes('ঢাকা');
      
      // Determine Pathao delivery charge (stored or default)
      let pathaoCharge = (order as any).pathaoDeliveryCharge;
      if (pathaoCharge === undefined || pathaoCharge === null || pathaoCharge === '') {
        pathaoCharge = isDhaka ? dhakaPathaoRate : outsideDhakaPathaoRate;
      } else {
        pathaoCharge = Number(pathaoCharge) || 0;
      }

      const codAmount = Math.max(0, total - advance);
      const pathaoNetCod = codAmount - pathaoCharge; // Cash Pathao will send to our bank
      const netRevenue = total - pathaoCharge; // Total net income we get from order

      totalSales += total;
      totalAdvance += advance;
      totalPathaoCharges += pathaoCharge;
      totalPathaoNetCodReceivable += pathaoNetCod;
      totalNetStoreRevenue += netRevenue;
    });

    return {
      orderCount: filteredOrders.length,
      totalSales,
      totalAdvance,
      totalPathaoCharges,
      totalPathaoNetCodReceivable,
      totalNetStoreRevenue
    };
  }, [filteredOrders, dhakaPathaoRate, outsideDhakaPathaoRate]);

  // Handle updating an order's Pathao charge
  const handlePathaoChargeChange = async (orderId: string, newChargeStr: string) => {
    const chargeVal = parseFloat(newChargeStr);
    if (isNaN(chargeVal)) return;
    try {
      await updateOrder(orderId, { pathaoDeliveryCharge: chargeVal });
      toast.success('পাঠাও কুরিয়ার চার্জ আপডেট করা হয়েছে');
    } catch (err) {
      toast.error('আপডেট করতে সমস্যা হয়েছে');
    }
  };

  // Handle toggling payout settlement status
  const handleToggleSettlement = async (order: Order) => {
    const current = (order as any).payoutSettled === true;
    try {
      await updateOrder(order.id, { payoutSettled: !current });
      toast.success(!current ? 'অর্ডারটি পাঠাও পেআউট সম্পন্ন (Settled) সেভ করা হয়েছে' : 'অর্ডারটি পেআউট পেন্ডিং চিহ্নিত করা হয়েছে');
    } catch (err) {
      toast.error('স্ট্যাটাস সেভ করতে সমস্যা হয়েছে');
    }
  };

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

  if (financeLoading || ordersLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-2 font-sans bg-[#FBFBFD] rounded-[20px] p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ফাইনান্স ডেটা লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#FBFBFD] min-h-screen text-black antialiased">
      
      {/* Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            ফাইনান্স & পাঠাও কুরিয়ার পেআউট হিসাব (Finance & Settlement)
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            সফল অর্ডারের হিসাব, পাঠাও ডেলিভারি চার্জ বাদ দিয়ে আমাদের প্রাপ্ত নিট টাকা এবং ব্যাংক একাউন্ট ফান্ড ট্র্যাকার
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAddAccountModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন ব্যাংক একাউন্ট
          </button>
          <button 
            onClick={() => setShowBankTxModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            তহবিল লেনদেন
          </button>
        </div>
      </div>

      {/* Main Sub-Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-gray-150 pb-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>সফল অর্ডার ও পাঠাও সেটেলমেন্ট</span>
          <span className="bg-white/20 text-current px-2 py-0.5 rounded-full text-[10px]">
            {filteredOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('banks')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'banks'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>ব্যাংক একাউন্ট & দৈনিক এনট্রি</span>
          <span className="bg-white/20 text-current px-2 py-0.5 rounded-full text-[10px]">
            {bankAccounts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pathao')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'pathao'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          <Truck className="w-4 h-4 text-orange-400" />
          <span>পাঠাও পেআউট রেজিস্ট্রি</span>
          <span className="bg-white/20 text-current px-2 py-0.5 rounded-full text-[10px]">
            {pathaoPayouts.length}
          </span>
        </button>
      </div>

      {/* --- TAB 1: ORDER FINANCE & PATHAO SETTLEMENT --- */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          
          {/* Summary Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Total Success Sales */}
            <div className="bg-[#F8F9FD] border border-gray-100 p-4.5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">মোট সফল অর্ডার সেলস</span>
                <Receipt className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">{formatPrice(orderFinanceSummary.totalSales)}</h3>
              <p className="text-[10px] text-gray-400 font-medium">
                {orderFinanceSummary.orderCount} টি সফল/ডেলিভার্ড অর্ডার
              </p>
            </div>

            {/* 2. Pathao Delivery Charges Deducted */}
            <div className="bg-[#F8F9FD] border border-gray-100 p-4.5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">পাঠাও মোট কুরিয়ার চার্জ (-)</span>
                <Truck className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-rose-600">-{formatPrice(orderFinanceSummary.totalPathaoCharges)}</h3>
              <p className="text-[10px] text-gray-400 font-medium">
                ডেলিভারি সার্ভিস ফি কেটে রাখা টাকা
              </p>
            </div>

            {/* 3. Pathao Net COD Receivable */}
            <div className="bg-emerald-50/40 border border-emerald-100 p-4.5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">পাঠাও থেকে ক্যাশ ফেরত (COD Net)</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-emerald-700">{formatPrice(orderFinanceSummary.totalPathaoNetCodReceivable)}</h3>
              <p className="text-[10px] text-emerald-600/80 font-medium">
                পাঠাও কুরিয়ার আমাদের ব্যাংকে দিবে
              </p>
            </div>

            {/* 4. Our Real Net Revenue */}
            <div className="bg-indigo-50/40 border border-indigo-100 p-4.5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1">
              <div className="flex items-center justify-between text-indigo-600">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">আমাদের মূল নিট ইনকাম</span>
                <DollarSign className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-indigo-800">{formatPrice(orderFinanceSummary.totalNetStoreRevenue)}</h3>
              <p className="text-[10px] text-indigo-600/80 font-medium">
                অগ্রিম + পাঠাও নিট পেআউট (Total Net)
              </p>
            </div>

          </div>

          {/* Controls, Filters & Default Rates Settings */}
          <div className="bg-[#F8F9FD] border border-gray-100 rounded-[20px] p-5 space-y-4">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ইনভয়েস #, কাস্টমার নাম, ফোন বা ট্র্যাকিং আইডি দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-gray-800 placeholder:text-gray-300 focus:border-indigo-400 outline-none"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 shrink-0">স্ট্যাটাস:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none cursor-pointer"
                >
                  <option value="SUCCESS_DELIVERED">শুধুমাত্র সফল / Delivered Order</option>
                  <option value="ALL">সব স্ট্যাটাসের অর্ডার (All Orders)</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 shrink-0">তারিখ:</span>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none cursor-pointer"
                >
                  <option value="ALL">সবসময় (All Time)</option>
                  <option value="TODAY">আজকে (Today)</option>
                  <option value="LAST_7_DAYS">গত ৭ দিন (Last 7 Days)</option>
                  <option value="THIS_MONTH">চলতি মাস (This Month)</option>
                  <option value="CUSTOM">নির্দিষ্ট তারিখ (Custom Date)</option>
                </select>
              </div>
            </div>

            {/* Custom Date Picker Range if Selected */}
            {dateRangeFilter === 'CUSTOM' && (
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400">শুরু:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400">শেষ:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Default Pathao Rates Settings Bar */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-orange-500" />
                  ডিফল্ট পাঠাও ডেলিভারি চার্জ রেট:
                </span>
                
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] font-bold text-gray-500">ঢাকার ভেতরে: ৳</span>
                  <input
                    type="number"
                    value={dhakaPathaoRate}
                    onChange={(e) => setDhakaPathaoRate(Number(e.target.value) || 0)}
                    className="w-12 text-xs font-black text-gray-900 outline-none text-center bg-gray-50 rounded"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] font-bold text-gray-500">ঢাকার বাইরে: ৳</span>
                  <input
                    type="number"
                    value={outsideDhakaPathaoRate}
                    onChange={(e) => setOutsideDhakaPathaoRate(Number(e.target.value) || 0)}
                    className="w-12 text-xs font-black text-gray-900 outline-none text-center bg-gray-50 rounded"
                  />
                </div>
              </div>

              <div className="text-[10px] text-gray-400 font-medium">
                * কোনো নির্দিষ্ট অর্ডারে পাঠাও আলাদা রেট কাটলে টেবিলের ইনপুট বক্সে সরাসরি এডিট করতে পারবেন।
              </div>
            </div>

          </div>

          {/* Orders Finance Table */}
          <div className="bg-[#F8F9FD] border border-gray-100 rounded-[20px] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/50">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  সফল অর্ডার ও পাঠাও পেআউট খতিয়ান
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">স্বয়ংক্রিয় পাঠাও কুরিয়ার চার্জ বাদ দিয়ে কোন অর্ডারে কত টাকা পাওনা ট্র্যাকার</p>
              </div>

              <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                {filteredOrders.length} টি অর্ডার দেখানো হচ্ছে
              </span>
            </div>

            <div className="overflow-x-auto">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-400 font-bold">কোনো সফল অর্ডার বা ফিল্টার ম্যাচ পাওয়া যায়নি।</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100/60 text-gray-500 border-b border-gray-150 uppercase tracking-wider font-black text-[9px]">
                      <th className="py-3.5 px-4">ইনভয়েস # / তারিখ</th>
                      <th className="py-3.5 px-4">কাস্টমার নাম & ফোন</th>
                      <th className="py-3.5 px-4">গন্তব্য (City)</th>
                      <th className="py-3.5 px-4 text-right">অর্ডার মোট মূল্য (৳)</th>
                      <th className="py-3.5 px-4 text-right">গ্রাহকের অগ্রিম (৳)</th>
                      <th className="py-3.5 px-4 text-center">পাঠাও চার্জ (৳)</th>
                      <th className="py-3.5 px-4 text-right bg-emerald-50/50 text-emerald-800">পাঠাও থেকে প্রাপ্য নিট (৳)</th>
                      <th className="py-3.5 px-4 text-right">স্টোরের মূল নিট আয় (৳)</th>
                      <th className="py-3.5 px-4 text-center">সেটেলমেন্ট স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
                    {filteredOrders.map(order => {
                      const total = Number(order.total) || 0;
                      const advance = Number(order.advancePayment) || 0;
                      const cityLower = (order.city || '').toLowerCase();
                      const isDhaka = cityLower.includes('dhaka') || cityLower.includes('ঢাকা');

                      let pathaoCharge = (order as any).pathaoDeliveryCharge;
                      if (pathaoCharge === undefined || pathaoCharge === null || pathaoCharge === '') {
                        pathaoCharge = isDhaka ? dhakaPathaoRate : outsideDhakaPathaoRate;
                      } else {
                        pathaoCharge = Number(pathaoCharge) || 0;
                      }

                      const codAmount = Math.max(0, total - advance);
                      const pathaoNetCod = codAmount - pathaoCharge; // Cash from Pathao to bank
                      const netRevenue = total - pathaoCharge; // Real total store revenue
                      const isSettled = (order as any).payoutSettled === true;

                      return (
                        <tr key={order.id} className="hover:bg-white transition-colors">
                          {/* Invoice # & Date */}
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-black text-indigo-600 block">
                              #{order.invoiceNo || order.id.replace(/^ORD-?/i, '')}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            </span>
                            <span className="inline-block text-[8px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase mt-0.5">
                              {order.status || 'Pending'}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-bold text-gray-900 block">{order.customerName || 'Walk-in Customer'}</span>
                            <span className="text-[10px] text-gray-400 font-mono block">{order.phone}</span>
                          </td>

                          {/* City */}
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-bold text-gray-700 block">{order.city || 'N/A'}</span>
                            <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-black ${
                              isDhaka ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {isDhaka ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'}
                            </span>
                          </td>

                          {/* Total Price */}
                          <td className="py-3.5 px-4 text-right font-black text-gray-900">
                            {formatPrice(total)}
                          </td>

                          {/* Advance Payment */}
                          <td className="py-3.5 px-4 text-right font-bold text-gray-600">
                            {advance > 0 ? (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] font-black">
                                +{formatPrice(advance)}
                              </span>
                            ) : (
                              <span className="text-gray-300 font-normal">৳0</span>
                            )}
                          </td>

                          {/* Editable Pathao Delivery Charge */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-white border border-rose-200 rounded-lg px-2 py-1 shadow-2xs">
                              <span className="text-rose-500 font-black text-[10px]">-৳</span>
                              <input
                                type="number"
                                defaultValue={pathaoCharge}
                                onBlur={(e) => handlePathaoChargeChange(order.id, e.target.value)}
                                className="w-12 text-xs font-black text-rose-600 outline-none text-center bg-transparent"
                              />
                            </div>
                          </td>

                          {/* Pathao Net COD Receivable (What Pathao remits to Bank) */}
                          <td className="py-3.5 px-4 text-right bg-emerald-50/40">
                            <span className="text-sm font-black text-emerald-700 block">
                              {formatPrice(pathaoNetCod)}
                            </span>
                            <span className="text-[9px] text-emerald-600 font-medium block">
                              (COD: {formatPrice(codAmount)} - {formatPrice(pathaoCharge)})
                            </span>
                          </td>

                          {/* Real Net Store Revenue */}
                          <td className="py-3.5 px-4 text-right font-black text-indigo-700">
                            {formatPrice(netRevenue)}
                          </td>

                          {/* Settlement Status Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleSettlement(order)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 mx-auto ${
                                isSettled
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              }`}
                            >
                              {isSettled ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>পেমেন্ট প্রাপ্ত (Settled)</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                  <span>পেন্ডিং (Mark Settled)</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Summary Footer Row */}
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-800">
                      <td colSpan={3} className="py-4 px-4 uppercase tracking-wider">
                        মোট সর্বমোট ({filteredOrders.length} টি অর্ডারের হিসাব)
                      </td>
                      <td className="py-4 px-4 text-right font-black text-amber-400">
                        {formatPrice(orderFinanceSummary.totalSales)}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-emerald-400">
                        +{formatPrice(orderFinanceSummary.totalAdvance)}
                      </td>
                      <td className="py-4 px-4 text-center font-black text-rose-300">
                        -{formatPrice(orderFinanceSummary.totalPathaoCharges)}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-emerald-300 bg-slate-800">
                        {formatPrice(orderFinanceSummary.totalPathaoNetCodReceivable)}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-indigo-300">
                        {formatPrice(orderFinanceSummary.totalNetStoreRevenue)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        -
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

        </div>
      )}

      {/* --- TAB 2: BANK ACCOUNTS & DAILY DEPOSITS --- */}
      {activeTab === 'banks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            {/* Bank Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#F8F9FD] border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between col-span-1 md:col-span-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">মোট ব্যাংক এবং গেটওয়ে তহবিল</p>
                  <h3 className="text-3xl font-black text-gray-900 mt-1">{formatPrice(totalBankBalance)}</h3>
                  <p className="text-xs text-gray-400 mt-1">সবগুলো সক্রিয় ডিজিটাল ওয়ালেট ও ব্যাংক অ্যাকাউন্টের মোট জমা স্থিতি</p>
                </div>
                <div className="w-16 h-16 bg-indigo-50 rounded-[20px] flex items-center justify-center text-indigo-600">
                  <Wallet className="w-8 h-8" />
                </div>
              </div>

              <div className="bg-[#F8F9FD] border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
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
                <div key={acc.id} className="bg-[#F8F9FD] border border-gray-100 p-5 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4 hover:border-gray-200 transition-all group relative">
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

            {/* Daily Deposit Entry Module */}
            <div className="bg-[#F8F9FD] border border-gray-100 rounded-[20px] shadow-sm p-6 space-y-5">
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
                        className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 placeholder:text-gray-300 outline-none focus:border-emerald-500"
                      />
                      <input 
                        type="text"
                        placeholder="সংক্ষিপ্ত নোট (ঐচ্ছিক)"
                        value={dailyNotes[acc.id] || ''}
                        onChange={(e) => setDailyNotes({ ...dailyNotes, [acc.id]: e.target.value })}
                        className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-1.5 text-[11px] font-medium text-gray-700 placeholder:text-gray-300 outline-none focus:border-indigo-400"
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

            {/* Bank Transactions Table */}
            <div className="bg-[#F8F9FD] border border-gray-100 rounded-[20px] shadow-sm overflow-hidden">
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

          {/* Right Column Help Note */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-[20px] p-5 space-y-3">
              <h4 className="text-xs font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-indigo-600" />
                তহবিল ব্যালেন্স নির্দেশিকা
              </h4>
              <p className="text-xs text-indigo-800/80 leading-relaxed font-medium">
                এখানে আপনার বিকাশ, নগদ, রকেট অথবা ব্যাংক অ্যাকাউন্টের ব্যালেন্স ও লেনদেনের সঠিক হিসাব রাখা সম্ভব। প্রতিদিনের বিক্রীত ক্যাশ এবং পাঠাও পেআউট জমার টাকা সরাসরি এখান থেকে রেকর্ড করা যাবে।
              </p>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB 3: PATHAO PAYOUTS TRACKER --- */}
      {activeTab === 'pathao' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-[#F8F9FD] border border-gray-100 rounded-[20px] p-5 space-y-5">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-orange-500" />
                  পাঠাও কুরিয়ার পেআউট ট্র্যাকার (Pathao Payout Registry)
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">পাঠাও থেকে সরাসরি ব্যাংক অ্যাকাউন্টে জমা হওয়া বাল্ক অ্যামাউন্টের রেকর্ড</p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">পেন্ডিং পেআউট (Pending)</p>
                  <h4 className="text-xl font-black text-amber-700 mt-1">
                    {formatPrice(pathaoPayouts.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0))}
                  </h4>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">প্রাপ্ত পেআউট (Paid)</p>
                  <h4 className="text-xl font-black text-emerald-700 mt-1">
                    {formatPrice(pathaoPayouts.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0))}
                  </h4>
                </div>
              </div>

              {/* Quick Add Form */}
              <form onSubmit={handlePayoutSubmit} className="bg-white border border-gray-150 p-4 rounded-2xl space-y-3 shadow-2xs">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-700">নতুন পাঠাও পেআউট রেকর্ড যোগ</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">প্রাপক ব্যাংক অ্যাকাউন্ট *</label>
                    <select
                      required
                      value={payoutForm.accountId}
                      onChange={(e) => setPayoutForm({ ...payoutForm, accountId: e.target.value })}
                      className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none cursor-pointer"
                    >
                      <option value="">সিলেক্ট করুন...</option>
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">টাকার পরিমাণ (৳) *</label>
                    <input
                      required
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={payoutForm.amount}
                      onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                      className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">তারিখ *</label>
                    <input
                      required
                      type="date"
                      value={payoutForm.date}
                      onChange={(e) => setPayoutForm({ ...payoutForm, date: e.target.value })}
                      className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">রেফারেন্স / ইনভয়েস ID</label>
                    <input
                      type="text"
                      placeholder="Ref ID"
                      value={payoutForm.reference}
                      onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })}
                      className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">সংক্ষিপ্ত নোট</label>
                    <input
                      type="text"
                      placeholder="নোট লিখুন"
                      value={payoutForm.notes}
                      onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                      className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:border-orange-300 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingPayout}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-sm uppercase tracking-wider cursor-pointer"
                >
                  {isSubmittingPayout ? 'যোগ হচ্ছে...' : 'পেআউট রেকর্ড সংরক্ষণ করুন'}
                </button>
              </form>

              {/* Payout list */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500">পেআউট রেজিস্ট্রি তালিকা</h4>
                
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {pathaoPayouts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-150 rounded-2xl">
                      কোনো পাঠাও পেআউট রেকর্ড পাওয়া যায়নি।
                    </div>
                  ) : (
                    pathaoPayouts.map(payout => {
                      const acc = bankAccounts.find(a => a.id === payout.accountId);
                      return (
                        <div key={payout.id} className="bg-white border border-gray-150 rounded-2xl p-4 space-y-2 flex items-center justify-between hover:border-gray-300 transition-all">
                          <div className="space-y-0.5 text-left">
                            <span className="text-[10px] text-gray-400 font-black">
                              {new Date(payout.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <h5 className="text-xs font-black text-gray-900">{acc?.bankName || 'Unknown Wallet'}</h5>
                            <p className="text-[10px] text-gray-400 font-normal">{acc?.accountName}</p>
                            {payout.reference && (
                              <span className="inline-block font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 mr-1">
                                Ref: {payout.reference}
                              </span>
                            )}
                            {payout.notes && (
                              <p className="text-[10px] text-gray-500 mt-0.5 italic font-medium">“{payout.notes}”</p>
                            )}
                          </div>

                          <div className="text-right flex flex-col items-end justify-between h-full">
                            <span className="text-base font-black text-slate-900 block">+{formatPrice(payout.amount)}</span>
                            
                            <div className="mt-2 flex items-center justify-end gap-2">
                              {payout.status === 'Pending' ? (
                                <button
                                  onClick={() => {
                                    if(window.confirm('আপনি কি এই পেআউটটি Paid হিসেবে চিহ্নিত করতে চান? এটি স্বয়ংক্রিয়ভাবে ব্যাংক ব্যালেন্সে যোগ করবে!')){
                                      updatePathaoPayoutStatus(payout.id, 'Paid');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
                                  title="Mark as Paid"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  পেন্ডিং (Mark Paid)
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-black flex items-center gap-1 select-none">
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
                                <Trash2 className="w-4 h-4" />
                              </button>
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
      )}

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Add Bank Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F8F9FD] rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
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
          <div className="bg-[#F8F9FD] rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
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
                আপডেট সেভ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Bank Transaction Modal */}
      {showBankTxModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F8F9FD] rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-xl">
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
