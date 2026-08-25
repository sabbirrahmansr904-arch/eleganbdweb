/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFinance } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice } from '../../lib/utils';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Pencil, 
  Trash2, 
  FileText, 
  Check, 
  Clock, 
  Printer, 
  RefreshCw,
  X,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BankLogoBadge } from '../../utils/bankLogos';

export default function AdminTransactionList(): React.JSX.Element {
  const { isSabbirRahman } = useAuth();
  const {
    bankAccounts,
    bankTransactions,
    loading,
    toggleTransactionStatus,
    updateBankTransaction,
    deleteBankTransaction
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'paid' | 'unpaid'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // Modals
  const [showViewTxModal, setShowViewTxModal] = useState(false);
  const [showEditTxModal, setShowEditTxModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [txToDelete, setTxToDelete] = useState<any>(null);

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

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return bankTransactions.filter(tx => {
      const acc = bankAccounts.find(a => a.id === tx.accountId);
      const matchesSearch = 
        (tx.reference?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (tx.notes?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (acc?.bankName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (acc?.accountName?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesAccount = accountFilter === 'ALL' || tx.accountId === accountFilter;
      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || (tx.status || 'paid') === statusFilter;

      return matchesSearch && matchesAccount && matchesType && matchesStatus;
    });
  }, [bankTransactions, bankAccounts, searchQuery, accountFilter, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const isAllFilteredSelected = filteredTransactions.length > 0 && filteredTransactions.every(tx => selectedTxIds.includes(tx.id));
  const isSomeFilteredSelected = filteredTransactions.some(tx => selectedTxIds.includes(tx.id)) && !isAllFilteredSelected;

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(filteredTransactions.map(tx => tx.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedTxIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => setSelectedTxIds([]);

  const handleBulkStatusChange = async (status: 'paid' | 'unpaid') => {
    
    if (selectedTxIds.length === 0) return;
    for (const id of selectedTxIds) {
      const tx = bankTransactions.find(t => t.id === id);
      if (tx && (tx.status || 'paid') !== status) {
        await toggleTransactionStatus(id, tx.status || 'paid');
      }
    }
    toast.success(`${selectedTxIds.length} টি লেনদেনের স্ট্যাটাস আপডেট করা হয়েছে!`);
    setSelectedTxIds([]);
  };

  // Export PDF / Print
  const handleExportReport = (format: 'pdf' | 'print' | 'csv', useSelectedOnly = false) => {
    const listToExport = useSelectedOnly 
      ? filteredTransactions.filter(tx => selectedTxIds.includes(tx.id))
      : filteredTransactions;

    if (listToExport.length === 0) {
      toast.error('এক্সপোর্ট করার মতো কোনো লেনদেন পাওয়া যায়নি।');
      return;
    }

    if (format === 'csv') {
      let csv = 'ID,Date,Account,Type,Reference,Notes,Amount,Status\n';
      listToExport.forEach(tx => {
        const acc = bankAccounts.find(a => a.id === tx.accountId);
        const dateStr = new Date(tx.date).toLocaleDateString('en-GB');
        csv += `"${tx.id}","${dateStr}","${acc?.bankName || ''} - ${acc?.accountName || ''}","${tx.type}","${tx.reference || ''}","${tx.notes || ''}",${tx.amount},"${tx.status || 'paid'}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${Date.now()}.csv`;
      a.click();
      toast.success('CSV ডাউনলোড সফল হয়েছে!');
      return;
    }

    // PDF generation via jsPDF
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ELEGAN BD - Transaction List Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);
    doc.text(`Total Transactions: ${listToExport.length}`, 14, 32);

    const tableData = listToExport.map((tx, idx) => {
      const acc = bankAccounts.find(a => a.id === tx.accountId);
      const dateStr = new Date(tx.date).toLocaleDateString('en-GB');
      return [
        idx + 1,
        dateStr,
        `${acc?.bankName || ''} (${acc?.accountNumber || ''})`,
        tx.type.toUpperCase(),
        tx.reference || '-',
        formatPrice(tx.amount),
        (tx.status || 'paid').toUpperCase()
      ];
    });

    autoTable(doc, {
      startY: 38,
      head: [['#', 'Date', 'Account', 'Type', 'Reference', 'Amount (BDT)', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    if (format === 'print') {
      doc.output('dataurlnewwindow');
      toast.success('প্রিন্ট প্রিভিউ ওপেন হয়েছে!');
    } else {
      doc.save(`elegan_bd_transactions_${Date.now()}.pdf`);
      toast.success('PDF রিপোর্ট ডাউনলোড সফল হয়েছে!');
    }
  };

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
    toast.success('লেনদেন সফলভাবে আপডেট করা হয়েছে!');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="রেফারেন্স, বিবরণ বা অ্যাকাউন্ট দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">সকল অ্যাকাউন্ট ({bankAccounts.length})</option>
              {bankAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">সকল লেনদেন ধরন</option>
              <option value="deposit">ইনকাম (Deposit)</option>
              <option value="withdraw">খরচ (Withdraw)</option>
              <option value="transfer">ট্রান্সফার (Transfer)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">সকল স্ট্যাটাস</option>
              <option value="paid">পেইড (Paid)</option>
              <option value="unpaid">আনপেইড (Unpaid)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedTxIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 md:p-5 shadow-xl border border-indigo-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-4 z-40 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              {selectedTxIds.length}
            </span>
            <div>
              <h4 className="text-sm font-black text-white">
                {selectedTxIds.length} টি লেনদেন সিলেক্ট করা হয়েছে
              </h4>
              <p className="text-xs text-slate-300 font-medium">সিলেক্টেড লেনদেনের PDF ডাউনলোড করুন অথবা স্ট্যাটাস পরিবর্তন করুন</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => handleExportReport('print', true)}
              className="px-3.5 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-300" />
              <span>প্রিন্ট ও প্রিভিউ</span>
            </button>

            <button
              onClick={() => handleExportReport('pdf', true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>সিলেক্টেড PDF ({selectedTxIds.length})</span>
            </button>

            <button
              onClick={() => handleExportReport('csv', true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => handleBulkStatusChange('paid')}
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>সব Paid করুন</span>
            </button>

            <button
              onClick={() => handleBulkStatusChange('unpaid')}
              className="px-3 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Unpaid</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Transaction Table */}
      <div className="bg-white border border-gray-100 rounded-[24px] p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-50 pb-4">
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>লেনদেন তালিকা</span>
              {selectedTxIds.length > 0 && (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full lowercase">
                  ({selectedTxIds.length} টি সিলেক্টেড)
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">নির্দিষ্ট লেনদেনগুলোতে চেকবক্সে টিক দিয়ে সিলেক্ট করে PDF ডাউনলোড বা প্রিন্ট করুন</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSelectAllFiltered}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                ref={el => {
                  if (el) el.indeterminate = isSomeFilteredSelected;
                }}
                onChange={handleSelectAllFiltered}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
              />
              <span>{isAllFilteredSelected ? 'সিলেকশন বাতিল' : 'সব সিলেক্ট করুন'}</span>
            </button>

            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full">
              মোট {filteredTransactions.length} টি ফলাফল
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="p-16 text-center text-xs text-gray-400 font-bold">কোনো লেনদেন রেকর্ড পাওয়া যায়নি।</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-400 border-b border-gray-100 uppercase tracking-widest font-black text-[9px]">
                  <th className="py-4 px-3 text-center w-12">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      ref={el => {
                        if (el) el.indeterminate = isSomeFilteredSelected;
                      }}
                      onChange={handleSelectAllFiltered}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-4">তারিখ</th>
                  <th className="py-4 px-4">হিসাব</th>
                  <th className="py-4 px-4">ধরন</th>
                  <th className="py-4 px-4">বিবরণ</th>
                  <th className="py-4 px-4 text-right">পরিমাণ (৳)</th>
                  <th className="py-4 px-4 text-right">ব্যালেন্স (৳)</th>
                  <th className="py-4 px-4 text-center">স্ট্যাটাস</th>
                  <th className="py-4 px-4 text-center">প্রমাণপত্র</th>
                  <th className="py-4 px-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
                {paginatedTransactions.map(tx => {
                  const acc = bankAccounts.find(a => a.id === tx.accountId);
                  const isDeposit = tx.type === 'deposit';
                  const isTransfer = tx.type === 'transfer';
                  const isUnpaid = tx.status === 'unpaid';
                  const isSelected = selectedTxIds.includes(tx.id);

                  return (
                    <tr 
                      key={tx.id} 
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-indigo-50/60 border-l-4 border-l-indigo-600' 
                          : isUnpaid 
                            ? 'bg-amber-50/20 hover:bg-amber-50/40' 
                            : 'hover:bg-gray-50/50'
                      }`}
                    >
                      <td className="py-4 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(tx.id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-4 px-4 text-gray-400 text-[11px] font-mono whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <BankLogoBadge bankName={acc?.bankName || 'Unknown'} logoUrl={acc?.logoUrl} size="sm" />
                          <div>
                            <span className="text-gray-950 font-black block leading-tight">{acc?.bankName || 'Unknown'}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 block">{acc?.accountName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1 ${
                          isDeposit ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/60' : isTransfer ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/60' : 'bg-rose-50 text-rose-600 border border-rose-100/60'
                        }`}>
                          {isDeposit ? '↑ ইনকাম' : isTransfer ? '⇄ ট্রান্সফার' : '↓ খরচ'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 max-w-xs truncate">
                        {tx.reference && <span className="font-mono text-[10px] bg-gray-150 border border-gray-200 px-1.5 py-0.5 rounded-md mr-1.5 text-gray-700">{tx.reference}</span>}
                        <span>{tx.notes || '-'}</span>
                      </td>
                      <td className={`py-4 px-4 text-right font-black text-sm whitespace-nowrap ${isDeposit ? 'text-emerald-600' : isTransfer ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {isDeposit ? '+' : isTransfer ? '' : '-'}{formatPrice(tx.amount)}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-gray-950 text-xs whitespace-nowrap">
                        {formatPrice(acc?.balance || 0)}
                      </td>
                      
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isUnpaid ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Unpaid</span>
                            </span>
            <button
                              onClick={async () => {
                                await toggleTransactionStatus(tx.id, tx.status);
                                toast.success('লেনদেন Paid হিসেবে আপডেট করা হয়েছে!');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[10px] font-black transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Paid করুন</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 stroke-[3] text-emerald-600 shrink-0" />
                              <span>Paid</span>
                            </span>
            <button
                              onClick={async () => {
                                await toggleTransactionStatus(tx.id, tx.status);
                                toast('লেনদেন Unpaid এ পরিবর্তন করা হয়েছে', { icon: '⏳' });
                              }}
                              className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Unpaid এ পরিবর্তন করুন"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
            <button 
                          onClick={() => toast('সংযুক্ত রশিদ ও প্রমাণপত্র চেক করা হচ্ছে...', { icon: 'ℹ️' })}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
            <button
                            onClick={() => {
                              setSelectedTx(tx);
                              setShowViewTxModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-150 rounded-lg transition-colors cursor-pointer"
                            title="বিস্তারিত"
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

        {/* Pagination Footer */}
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
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg text-gray-700 cursor-pointer"
            >
              পূর্ববর্তী
            </button>
            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-black">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg text-gray-700 cursor-pointer"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {showEditTxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-base font-black text-gray-900">লেনদেন তথ্য সম্পাদনা করুন</h3>
            <button onClick={() => setShowEditTxModal(false)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleEditTxSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400">অ্যাকাউন্ট</label>
                <select
                  value={editTxForm.accountId}
                  onChange={(e) => setEditTxForm({ ...editTxForm, accountId: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700"
                >
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">পরিমাণ (৳)</label>
                  <input
                    type="number"
                    step="any"
                    value={editTxForm.amount}
                    onChange={(e) => setEditTxForm({ ...editTxForm, amount: e.target.value })}
                    className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">তারিখ</label>
                  <input
                    type="date"
                    value={editTxForm.date}
                    onChange={(e) => setEditTxForm({ ...editTxForm, date: e.target.value })}
                    className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400">রেফারেন্স</label>
                <input
                  type="text"
                  value={editTxForm.reference}
                  onChange={(e) => setEditTxForm({ ...editTxForm, reference: e.target.value })}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400">বিবরণ / নোটস</label>
                <textarea
                  value={editTxForm.notes}
                  onChange={(e) => setEditTxForm({ ...editTxForm, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
                  type="button"
                  onClick={() => setShowEditTxModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
            <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && txToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 space-y-5 shadow-2xl text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900">লেনদেন মুছে ফেলতে চান?</h3>
              <p className="text-xs text-gray-500 font-medium">এই লেনদেন স্থায়ীভাবে মুছে ফেলা হবে এবং ব্যালেন্স সামঞ্জস্য করা হবে।</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
            <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
            <button
                onClick={async () => {
                  await deleteBankTransaction(txToDelete.id);
                  setShowDeleteConfirmModal(false);
                  setTxToDelete(null);
                  toast.success('লেনদেন সফলভাবে মুছে ফেলা হয়েছে!');
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Transaction Modal */}
      {showViewTxModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-base font-black text-gray-900">লেনদেনের বিস্তারিত বিবরণ</h3>
            <button onClick={() => setShowViewTxModal(false)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400 font-bold">তারিখ:</span>
                <span className="font-black text-gray-800">{new Date(selectedTx.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400 font-bold">ধরন:</span>
                <span className="font-black text-indigo-600 uppercase">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400 font-bold">পরিমাণ:</span>
                <span className="font-black text-emerald-600 text-sm">{formatPrice(selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400 font-bold">রেফারেন্স:</span>
                <span className="font-mono font-bold text-gray-700">{selectedTx.reference || 'N/A'}</span>
              </div>
              <div className="space-y-1 py-1">
                <span className="text-gray-400 font-bold block">নোটস / বিবরণ:</span>
                <p className="bg-gray-50 p-3 rounded-xl font-medium text-gray-700">{selectedTx.notes || 'কোনো বিবরণ নেই।'}</p>
              </div>
            </div>
            <div className="pt-2">
            <button
                onClick={() => setShowViewTxModal(false)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
