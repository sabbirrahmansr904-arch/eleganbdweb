/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFinance, sortBankAccounts } from '../../contexts/FinanceContext';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
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
  FileText,
  Check,
  Clock,
  AlertCircle,
  Printer,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BankLogoBadge, getAutoBankLogo } from '../../utils/bankLogos';

export default function AdminFinance(): React.JSX.Element {
  const { isSabbirRahman } = useAuth();
  const {
    bankAccounts,
    bankTransactions,
    loading: financeLoading,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addBankTransaction,
    updateBankTransaction,
    toggleTransactionStatus,
    deleteBankTransaction
  } = useFinance();

  const { orders = [], updateOrder } = useOrders();

  // Sonali Bank detection
  const sonaliAccount = useMemo(() => {
    return bankAccounts.find(a => 
      a.bankName.toLowerCase().includes('sonali') || 
      a.accountName.toLowerCase().includes('sonali') ||
      a.bankName.includes('সোনালী')
    );
  }, [bankAccounts]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'paid' | 'unpaid'>('ALL');
  const [timeframeFilter, setTimeframeFilter] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selection state for transactions (Checkbox select & PDF download)
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // Modals visibility states
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [showEditTxModal, setShowEditTxModal] = useState(false);
  const [showViewTxModal, setShowViewTxModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printTargetList, setPrintTargetList] = useState<any[]>([]);
  const [txToDelete, setTxToDelete] = useState<any>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  // New Transaction Form state (Defaults to UNPAID)
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
    attachment: '',
    status: 'unpaid' as 'unpaid' | 'paid'
  });
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // New Account Form state
  const [accountForm, setAccountForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    initialBalance: '',
    accountType: 'ব্যক্তিগত',
    logoUrl: ''
  });

  // Edit Account Form state
  const [editAccountForm, setEditAccountForm] = useState({
    id: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    balance: 0,
    initialBalance: 0,
    logoUrl: ''
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
    notes: '',
    status: 'unpaid' as 'unpaid' | 'paid'
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
      accountType: accountForm.accountType,
      logoUrl: accountForm.logoUrl
    });
    setAccountForm({
      bankName: '',
      accountName: '',
      accountNumber: '',
      branch: '',
      initialBalance: '',
      accountType: 'ব্যক্তিগত',
      logoUrl: ''
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
      initialBalance: acc.initialBalance || 0,
      logoUrl: acc.logoUrl || ''
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
      balance: editAccountForm.balance,
      logoUrl: editAccountForm.logoUrl
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
      notes: tx.notes || '',
      status: (tx.status as any) || 'paid'
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
      notes: editTxForm.notes,
      status: editTxForm.status
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
        attachment: txForm.attachment,
        status: txForm.status || 'unpaid' // Default is UNPAID as requested
      }, txForm.targetAccountId);

      setTxForm({
        accountId: '',
        type: 'deposit',
        targetAccountId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
        attachment: '',
        status: 'unpaid'
      });
      toast.success(txForm.status === 'unpaid' ? 'নতুন লেনদেন (UNPAID অবস্থায়) সংরক্ষণ করা হয়েছে!' : 'নতুন লেনদেন সফলভাবে সংরক্ষণ করা হয়েছে!');
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
      attachment: '',
      status: 'unpaid'
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
      if (statusFilter !== 'ALL') {
        const isTxUnpaid = tx.status === 'unpaid';
        if (statusFilter === 'unpaid' && !isTxUnpaid) return false;
        if (statusFilter === 'paid' && isTxUnpaid) return false;
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
  }, [bankTransactions, accountFilter, typeFilter, statusFilter, searchQuery, bankAccounts, currentPage, itemsPerPage]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Summary calculations
  const totalIncome = useMemo(() => {
    return bankTransactions
      .filter(tx => tx.type === 'deposit' && tx.status !== 'unpaid')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [bankTransactions]);

  const totalExpense = useMemo(() => {
    return bankTransactions
      .filter(tx => tx.type === 'withdraw' && tx.status !== 'unpaid')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [bankTransactions]);

  const unpaidCount = useMemo(() => {
    return bankTransactions.filter(tx => tx.status === 'unpaid').length;
  }, [bankTransactions]);

  const unpaidTotalAmount = useMemo(() => {
    return bankTransactions
      .filter(tx => tx.status === 'unpaid')
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

  // Selection helpers
  const isAllFilteredSelected = useMemo(() => {
    return filteredTransactions.length > 0 && filteredTransactions.every(tx => selectedTxIds.includes(tx.id));
  }, [filteredTransactions, selectedTxIds]);

  const isSomeFilteredSelected = useMemo(() => {
    return filteredTransactions.some(tx => selectedTxIds.includes(tx.id)) && !isAllFilteredSelected;
  }, [filteredTransactions, selectedTxIds, isAllFilteredSelected]);

  const handleToggleSelect = (id: string) => {
    setSelectedTxIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredTransactions.map(t => t.id));
      setSelectedTxIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredTransactions.map(t => t.id);
      setSelectedTxIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedTxIds([]);
  };

  const handleBulkStatusChange = async (targetStatus: 'paid' | 'unpaid') => {
    
    if (selectedTxIds.length === 0) return;
    try {
      for (const id of selectedTxIds) {
        const tx = bankTransactions.find(t => t.id === id);
        if (tx && tx.status !== targetStatus) {
          await toggleTransactionStatus(id, tx.status);
        }
      }
      toast.success(`${selectedTxIds.length} টি লেনদেন ${targetStatus === 'paid' ? 'Paid' : 'Unpaid'} করা হয়েছে!`);
    } catch (err) {
      console.error(err);
      toast.error('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  // Export Report handler (Supports selected transactions or full list)
  const handleExportReport = (format: 'pdf' | 'csv', onlySelected: boolean = false) => {
    let targetList = filteredTransactions;
    if (onlySelected && selectedTxIds.length > 0) {
      targetList = bankTransactions.filter(tx => selectedTxIds.includes(tx.id));
    } else if (selectedTxIds.length > 0) {
      targetList = bankTransactions.filter(tx => selectedTxIds.includes(tx.id));
    }

    if (targetList.length === 0) {
      toast.error('ডাউনলোড করার মতো কোনো লেনদেন পাওয়া যায়নি।');
      return;
    }

    if (format === 'csv') {
      const headers = ['Date', 'Account', 'Type', 'Reference', 'Notes', 'Status', 'Amount'];
      const rows = targetList.map(tx => {
        const acc = bankAccounts.find(a => a.id === tx.accountId);
        return [
          new Date(tx.date).toLocaleDateString('en-GB'),
          acc?.bankName || '',
          tx.type,
          tx.reference || '',
          tx.notes || '',
          tx.status || 'paid',
          tx.amount
        ];
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', selectedTxIds.length > 0 && onlySelected ? 'selected_finance_report.csv' : 'finance_report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${targetList.length} টি লেনদেনের CSV রিপোর্ট ডাউনলোড সফল হয়েছে!`);
    } else if (format === 'pdf') {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Clean Standard Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('ELEGAN BD - FINANCE STATEMENT & LEDGER', 14, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(`Generated: ${dateStr}  |  Total Entries: ${targetList.length}${selectedTxIds.length > 0 && onlySelected ? ' (Filtered Selection)' : ''}`, 14, 22);

      // Financial Metrics Summary for the report
      const inc = targetList.filter(t => t.type === 'deposit' && t.status !== 'unpaid').reduce((s, t) => s + t.amount, 0);
      const exp = targetList.filter(t => t.type === 'withdraw' && t.status !== 'unpaid').reduce((s, t) => s + t.amount, 0);
      const unp = targetList.filter(t => t.status === 'unpaid').reduce((s, t) => s + t.amount, 0);

      // Summary KPI Badge Strip
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 26, 182, 9, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(`Total Income: BDT ${inc.toLocaleString()}`, 18, 32);
      doc.setTextColor(225, 29, 72);
      doc.text(`Total Expense: BDT ${exp.toLocaleString()}`, 80, 32);
      doc.setTextColor(217, 119, 6);
      doc.text(`Unpaid / Pending: BDT ${unp.toLocaleString()}`, 140, 32);

      autoTable(doc, {
        head: [['#', 'Date', 'Account', 'Type', 'Reference', 'Notes / Description', 'Status', 'Amount (BDT)']],
        body: targetList.map((tx, idx) => {
          const acc = bankAccounts.find(a => a.id === tx.accountId);
          return [
            String(idx + 1),
            new Date(tx.date).toLocaleDateString('en-GB'),
            acc?.bankName || 'Wallet/Bank',
            tx.type === 'deposit' ? 'INCOME' : tx.type === 'withdraw' ? 'EXPENSE' : 'TRANSFER',
            tx.reference || '-',
            tx.notes || '-',
            (tx.status || 'paid').toUpperCase(),
            (tx.type === 'withdraw' ? '-' : '+') + tx.amount.toLocaleString()
          ];
        }),
        startY: 38,
        styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 22 },
          2: { cellWidth: 32 },
          3: { cellWidth: 20 },
          4: { cellWidth: 26 },
          5: { cellWidth: 'auto' },
          6: { cellWidth: 18, halign: 'center' },
          7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
        }
      });

      const filename = selectedTxIds.length > 0 && onlySelected ? `Finance_Selected_${Date.now()}.pdf` : `Finance_Report_${Date.now()}.pdf`;
      doc.save(filename);
      toast.success(`${targetList.length} টি লেনদেনের PDF রিপোর্ট সফলভাবে সেভ হয়েছে!`);
    } else {
      // Open Print & Perfect Bangla PDF Statement Preview Modal
      setPrintTargetList(targetList);
      setShowPrintModal(true);
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
          {true && (
<button
            onClick={() => setShowAddAccountModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন অ্যাকাউন্ট</span>
          </button>
)}

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
            onClick={() => handleExportReport('print')}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
            title="বাংলা ফন্ট সহ স্পষ্ট প্রিভিউ এবং PDF সেভ করুন"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>প্রিন্ট ও PDF প্রিভিউ</span>
          </button>

          <button
            onClick={() => handleExportReport('pdf')}
            className="px-5 py-2.5 bg-[#0b0f19] hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-red-400" />
            <span>PDF ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* Top 4 Account Balance Cards + Summary Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Accounts Cards (1st: Cash, 2nd: Sonali Bank, 3rd: bKash, 4th: Nagad) */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {bankAccounts.length === 0 ? (
            <div className="col-span-full bg-white p-8 text-center rounded-[24px] border border-gray-100 text-xs text-gray-400">
              কোনো ব্যাংক অ্যাকাউন্ট বা ওয়ালেট পাওয়া যায়নি। উপরে "+ নতুন অ্যাকাউন্ট" বাটনে ক্লিক করে অ্যাকাউন্ট যোগ করুন।
            </div>
          ) : (
            sortBankAccounts(bankAccounts).map((acc) => {
              const isBkash = acc.bankName.toLowerCase().includes('bkash');
              const isNagad = acc.bankName.toLowerCase().includes('nagad');
              const isRocket = acc.bankName.toLowerCase().includes('rocket');
              const isProductAccount = (acc.accountType || '').toLowerCase().includes('product') || (acc.bankName || '').toLowerCase().includes('product') || (acc.accountName || '').toLowerCase().includes('product') || (acc.bankName || '').toLowerCase().includes('প্রোডাক্ট') || (acc.accountName || '').toLowerCase().includes('প্রোডাক্ট');
              const isZeroBalance = (acc.balance || 0) === 0;
              const isSelected = accountFilter === acc.id;

              return (
                <div 
                  key={acc.id} 
                  onClick={() => setAccountFilter(isSelected ? 'ALL' : acc.id)}
                  className={`bg-white border rounded-[26px] p-5 sm:p-6 min-h-[265px] flex flex-col justify-between shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-md' : 'border-gray-150 hover:border-indigo-250'
                  } ${
                    isBkash ? 'hover:border-pink-300' : isNagad ? 'hover:border-orange-300' : isRocket ? 'hover:border-purple-300' : 'hover:border-emerald-300'
                  }`}
                >
                  {/* Top Bar: Account Type Badge & Edit/Delete Action Icons */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-50 border border-gray-150 text-gray-600">
                      {acc.accountType || 'ব্যক্তিগত'}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAccountClick(acc);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 bg-gray-50 rounded-lg transition-colors cursor-pointer"
                        title="এডিট অ্যাকাউন্ট"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          
                          deleteBankAccount(acc.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 bg-gray-50 rounded-lg transition-colors cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Middle Center Section: Logo, Bank Name, and Account Number Perfectly Centered */}
                  <div className="flex flex-col items-center justify-center text-center my-3 py-1">
                    <div className="relative mb-3">
                      <BankLogoBadge 
                        bankName={acc.bankName} 
                        logoUrl={acc.logoUrl} 
                        size="xl" 
                        className="shadow-sm ring-4 ring-gray-50 group-hover:scale-105 transition-transform" 
                      />
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight text-center leading-tight">
                      {acc.bankName}
                    </h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1 text-center">
                      {acc.accountNumber}
                    </p>
                    {acc.branch && (
                      <span className="text-[10px] text-indigo-600 font-bold mt-0.5">
                        {acc.branch}
                      </span>
                    )}
                  </div>

                  {/* Bottom Balance Bar */}
                  <div className="pt-3.5 border-t border-gray-100 flex items-center justify-between w-full">
                    <div>
                      <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-widest block">ব্যালেন্স</span>
                      <span className="text-xl font-black tracking-tight mt-0.5 block text-emerald-600">
                        {formatPrice(acc.balance || 0)}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full border border-emerald-100 text-emerald-500 flex items-center justify-center bg-gray-50/60 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300">
                      <ArrowUpRight className="w-4 h-4" />
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
              <span className="text-xs font-bold text-emerald-800">মোট ইনকাম (Paid)</span>
              <span className="text-sm font-black text-emerald-700">{formatPrice(totalIncome)}</span>
            </div>

            <div className="flex items-center justify-between bg-rose-50/45 p-3 rounded-xl border border-rose-100/50">
              <span className="text-xs font-bold text-rose-800">মোট খরচ (Paid)</span>
              <span className="text-sm font-black text-rose-700">{formatPrice(totalExpense)}</span>
            </div>

            <div className="flex items-center justify-between bg-indigo-50/45 p-3 rounded-xl border border-indigo-100/50">
              <span className="text-xs font-bold text-indigo-900">নিট ব্যালেন্স</span>
              <span className="text-sm font-black text-indigo-700">{formatPrice(netBalance)}</span>
            </div>

            <div className="flex items-center justify-between bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-900">বকেয়া (Unpaid)</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-amber-700 block">{unpaidCount} টি লেনদেন</span>
                <span className="text-[10px] text-amber-600 font-bold">{formatPrice(unpaidTotalAmount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50/60 p-3 rounded-xl border border-gray-150">
              <span className="text-xs font-bold text-gray-700">মোট লেনদেন</span>
              <span className="text-sm font-black text-gray-900">{bankTransactions.length} টি</span>
            </div>
          </div>
        </div>

      </div>



      {/* Main Grid: New Transaction Form (Left) & Charts / Activity (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: New Transaction Entry Form */}
        <div id="new-tx-form" className="lg:col-span-2 bg-white border border-gray-100 rounded-[24px] p-6 space-y-6 shadow-2xs">
          <div className="border-b border-gray-50 pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#4f46e5]" />
                নতুন লেনদেন এন্ট্রি করুন
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">ম্যানুয়ালি নতুন আয়, খরচ, ডিপোজিট অথবা ট্রান্সফার এন্ট্রি করুন (ডিফল্ট আনপেইড)</p>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold text-amber-800">নতুন এন্ট্রি প্রথমে <strong>Unpaid</strong> থাকবে</span>
            </div>
          </div>

          <form onSubmit={handleTxSubmit} className="space-y-6">
            {/* COMPACT ROW OF INPUTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              
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

              {/* Payment Status (Unpaid vs Paid) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">স্ট্যাটাস *</label>
                <select
                  value={txForm.status}
                  onChange={(e) => setTxForm({ ...txForm, status: e.target.value as 'unpaid' | 'paid' })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-3 text-xs font-black text-gray-700 focus:border-indigo-300 focus:outline-none cursor-pointer"
                >
                  <option value="unpaid">⏳ Unpaid (বকেয়া/অনিষ্পন্ন)</option>
                  <option value="paid">✓ Paid (পরিশোধিত)</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">বিবরণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="বিবরণ লিখুন"
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
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FD] border border-gray-100 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BankLogoBadge bankName={acc?.bankName || ''} logoUrl={acc?.logoUrl} size="sm" />
                      <div className="space-y-0.5 min-w-0">
                        <span className={`text-[10px] font-black uppercase tracking-wider block truncate ${isDeposit ? 'text-emerald-600' : isTransfer ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {isDeposit ? 'ইনকাম এন্ট্রি' : isTransfer ? 'ট্রান্সফার' : 'খরচ এন্ট্রি'}
                        </span>
                        <p className="text-xs font-black text-gray-800 truncate">{acc?.bankName || 'Wallet Account'}</p>
                        <span className="text-[9px] text-gray-400 font-bold block">{mockTime}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-black whitespace-nowrap ${isDeposit ? 'text-emerald-600' : isTransfer ? 'text-indigo-600' : 'text-rose-600'}`}>
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
              {/* Device Image Upload Zone & Instant Preview */}
              <div className="space-y-2 bg-gradient-to-br from-indigo-50/50 to-slate-50 p-3.5 rounded-2xl border border-indigo-100/80">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ডিভাইস থেকে লোগো / আইকন আপলোড</span>
                  </label>
                  <span className="text-[9.5px] text-indigo-600 font-bold">মোবাইল বা পিসি</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex items-center justify-center">
                    <BankLogoBadge bankName={accountForm.bankName} logoUrl={accountForm.logoUrl} size="md" className="ring-2 ring-white shadow-sm" />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3.5 py-2 bg-[#4f46e5] hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95">
                        <Upload className="w-3.5 h-3.5" />
                        <span>ছবি সিলেক্ট করুন</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setAccountForm({ ...accountForm, logoUrl: reader.result as string });
                                toast.success('ডিভাইস থেকে লোগো সফলভাবে লোড হয়েছে!');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {accountForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setAccountForm({ ...accountForm, logoUrl: '' })}
                          className="px-2.5 py-2 bg-white hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 hover:border-rose-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                        >
                          রিমুভ
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight">PNG, JPG বা SVG ছবি সিলেক্ট করুন</p>
                  </div>
                </div>
              </div>

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
              {/* Device Image Upload Zone & Instant Preview */}
              <div className="space-y-2 bg-gradient-to-br from-indigo-50/50 to-slate-50 p-3.5 rounded-2xl border border-indigo-100/80">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ডিভাইস থেকে লোগো / আইকন পরিবর্তন</span>
                  </label>
                  <span className="text-[9.5px] text-indigo-600 font-bold">মোবাইল বা পিসি</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex items-center justify-center">
                    <BankLogoBadge bankName={editAccountForm.bankName} logoUrl={editAccountForm.logoUrl} size="md" className="ring-2 ring-white shadow-sm" />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3.5 py-2 bg-[#4f46e5] hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95">
                        <Upload className="w-3.5 h-3.5" />
                        <span>নতুন ছবি সিলেক্ট</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditAccountForm({ ...editAccountForm, logoUrl: reader.result as string });
                                toast.success('লোগো ছবি সফলভাবে আপডেট হয়েছে!');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {editAccountForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditAccountForm({ ...editAccountForm, logoUrl: '' })}
                          className="px-2.5 py-2 bg-white hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 hover:border-rose-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                        >
                          রিমুভ
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight">PNG, JPG বা SVG ছবি সিলেক্ট করুন</p>
                  </div>
                </div>
              </div>

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
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">পেমেন্ট স্ট্যাটাস *</label>
                <select 
                  value={editTxForm.status}
                  onChange={(e) => setEditTxForm({ ...editTxForm, status: e.target.value as 'unpaid' | 'paid' })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:outline-none"
                >
                  <option value="unpaid">⏳ Unpaid (বকেয়া/অনিষ্পন্ন)</option>
                  <option value="paid">✓ Paid (পরিশোধিত)</option>
                </select>
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
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400">হিসাব:</span>
                <div className="flex items-center gap-2">
                  <BankLogoBadge bankName={bankAccounts.find(a => a.id === selectedTx.accountId)?.bankName || ''} logoUrl={bankAccounts.find(a => a.id === selectedTx.accountId)?.logoUrl} size="sm" />
                  <span className="font-black text-gray-900">{bankAccounts.find(a => a.id === selectedTx.accountId)?.bankName}</span>
                </div>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400">ধরন:</span>
                <span className="font-black text-gray-900 uppercase">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400">স্ট্যাটাস:</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                    selectedTx.status === 'unpaid' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedTx.status === 'unpaid' ? '⏳ Unpaid' : '✓ Paid'}
                  </span>
                  <button
                    onClick={async () => {
                      await toggleTransactionStatus(selectedTx.id, selectedTx.status);
                      setSelectedTx({ ...selectedTx, status: selectedTx.status === 'unpaid' ? 'paid' : 'unpaid' });
                      toast.success('স্ট্যাটাস আপডেট হয়েছে');
                    }}
                    className="text-[10px] text-indigo-600 hover:underline cursor-pointer font-bold"
                  >
                    (পরিবর্তন করুন)
                  </button>
                </div>
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

      {/* 6. Print & Perfect Bangla PDF Statement Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-slate-100 rounded-[28px] max-w-4xl w-full border border-slate-300 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
            
            {/* Modal Control Bar (Excluded from print) */}
            <div className="no-print bg-slate-900 text-white p-4 px-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">আর্থিক লেনদেন স্টেটমেন্ট ও PDF প্রিভিউ</h3>
                  <p className="text-xs text-slate-400 font-medium">বাংলা ও ইংরেজি সব লেখা সম্পূর্ণ স্পষ্ট ও সুন্দরভাবে প্রিন্ট অথবা PDF হিসেবে সেভ করুন</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                  title="ব্রাউজার থেকে সরাসরি PDF হিসেবে সেভ করুন"
                >
                  <Printer className="w-4 h-4" />
                  <span>PDF প্রিন্ট / সেভ করুন</span>
                </button>

                <button
                  onClick={() => {
                    handleExportReport('pdf', printTargetList.length === selectedTxIds.length && selectedTxIds.length > 0);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="সরাসরি PDF ফাইল ডাউনলোড করুন"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>PDF ফাইল ডাউনলোড</span>
                </button>

                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Statement Sheet */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-slate-200/60 flex justify-center">
              <div className="printable-sheet bg-white p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 max-w-3xl w-full text-slate-800 space-y-6">
                
                {/* Statement Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-indigo-600 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center">৳</span>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">ELEGAN BD</h2>
                    </div>
                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">আর্থিক বিবরণী ও লেজার স্টেটমেন্ট (Finance & Settlement)</p>
                    <p className="text-[11px] text-slate-500 font-medium">অফিশিয়াল হিসাব ও লেনদেন সংক্রান্ত বিস্তারিত প্রতিবেদন</p>
                  </div>

                  <div className="text-left sm:text-right space-y-1 text-xs">
                    <p className="font-bold text-slate-900">
                      <span className="text-slate-400">তারিখ: </span>
                      {new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      <span className="text-slate-400">সময়: </span>
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[11px] font-bold text-indigo-600">
                      মোট রেকর্ড: {printTargetList.length} টি
                    </p>
                  </div>
                </div>

                {/* Financial Summary KPI Cards */}
                {(() => {
                  const inc = printTargetList.filter(t => t.type === 'deposit' && t.status !== 'unpaid').reduce((s, t) => s + t.amount, 0);
                  const exp = printTargetList.filter(t => t.type === 'withdraw' && t.status !== 'unpaid').reduce((s, t) => s + t.amount, 0);
                  const unp = printTargetList.filter(t => t.status === 'unpaid').reduce((s, t) => s + t.amount, 0);
                  const net = inc - exp;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-800 uppercase">মোট ইনকাম (Paid)</p>
                        <p className="text-sm font-black text-emerald-700 mt-0.5">{formatPrice(inc)}</p>
                      </div>

                      <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                        <p className="text-[10px] font-bold text-rose-800 uppercase">মোট খরচ (Paid)</p>
                        <p className="text-sm font-black text-rose-700 mt-0.5">{formatPrice(exp)}</p>
                      </div>

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="text-[10px] font-bold text-amber-800 uppercase">বকেয়া / Unpaid</p>
                        <p className="text-sm font-black text-amber-700 mt-0.5">{formatPrice(unp)}</p>
                      </div>

                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                        <p className="text-[10px] font-bold text-indigo-800 uppercase">নিট ব্যালেন্স</p>
                        <p className={`text-sm font-black mt-0.5 ${net >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                          {formatPrice(net)}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Detailed Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-indigo-600 text-white font-bold text-[11px]">
                        <th className="py-2.5 px-3 text-center w-8">#</th>
                        <th className="py-2.5 px-3">তারিখ</th>
                        <th className="py-2.5 px-3">হিসাব</th>
                        <th className="py-2.5 px-3">ধরন</th>
                        <th className="py-2.5 px-3">রেফারেন্স</th>
                        <th className="py-2.5 px-3">বিবরণ / নোট</th>
                        <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                        <th className="py-2.5 px-3 text-right">পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {printTargetList.map((tx, idx) => {
                        const acc = bankAccounts.find(a => a.id === tx.accountId);
                        const isIncome = tx.type === 'deposit';
                        const isTransfer = tx.type === 'transfer';
                        const isPaid = tx.status !== 'unpaid';

                        return (
                          <tr key={tx.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-700 text-[11px]">
                              {new Date(tx.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 text-[11px]">
                              {acc?.bankName || 'Unknown'}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                isIncome ? 'bg-emerald-100 text-emerald-800' :
                                isTransfer ? 'bg-indigo-100 text-indigo-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {isIncome ? 'ইনকাম' : isTransfer ? 'ট্রান্সফার' : 'খরচ'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-600">
                              {tx.reference || '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px] max-w-[200px] truncate">
                              {tx.notes || '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {isPaid ? 'PAID' : 'UNPAID'}
                              </span>
                            </td>
                            <td className={`py-2 px-3 text-right font-black text-xs ${
                              isIncome ? 'text-emerald-700' : isTransfer ? 'text-indigo-700' : 'text-rose-700'
                            }`}>
                              {isIncome ? '+' : isTransfer ? '' : '-'}{formatPrice(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Statement Signatures & Verification footer */}
                <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-400">
                  <div>
                    <p className="font-bold text-slate-600">ELEGAN BD Management System</p>
                    <p>এই স্টেটমেন্টটি সিস্টেম জেনারেটেড এবং যথাযথ আর্থিক তথ্যের ভিত্তিতে প্রস্তুতকৃত।</p>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-b border-slate-300 mb-1"></div>
                    <p className="font-bold text-slate-600">অনুমোদিত স্বাক্ষর</p>
                  </div>
                </div>

              </div>
            </div>

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
