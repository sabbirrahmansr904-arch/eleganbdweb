/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useExpenses } from '../../contexts/ExpenseContext';
import { formatPrice } from '../../lib/utils';
import { 
  Plus, 
  Trash2, 
  DollarSign, 
  Search, 
  Calendar, 
  Download, 
  X, 
  CreditCard,
  FileSpreadsheet,
  TrendingUp,
  RefreshCw,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminExpenses(): React.JSX.Element {
  const { expenses, loading, addExpense, deleteExpense } = useExpenses();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State for Dollar Purchase
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    dollars: '',
    rate: '',
    bdtAmount: '',
    source: 'Dual Currency Card',
    notes: ''
  });

  // Auto-calculate BDT Amount when Dollars or Rate changes
  const handleDollarsChange = (val: string) => {
    const d = parseFloat(val);
    const r = parseFloat(form.rate);
    const bdt = (!isNaN(d) && !isNaN(r)) ? (d * r).toFixed(2) : form.bdtAmount;
    setForm(prev => ({ ...prev, dollars: val, bdtAmount: bdt }));
  };

  const handleRateChange = (val: string) => {
    const r = parseFloat(val);
    const d = parseFloat(form.dollars);
    const bdt = (!isNaN(d) && !isNaN(r)) ? (d * r).toFixed(2) : form.bdtAmount;
    setForm(prev => ({ ...prev, rate: val, bdtAmount: bdt }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dollarNum = parseFloat(form.dollars);
    const rateNum = parseFloat(form.rate);
    let bdtNum = parseFloat(form.bdtAmount);

    if (isNaN(dollarNum) || dollarNum <= 0) {
      toast.error('দয়া করে সঠিক ডলারের পরিমাণ ইনপুট দিন।');
      return;
    }

    if (isNaN(bdtNum) || bdtNum <= 0) {
      if (!isNaN(dollarNum) && !isNaN(rateNum)) {
        bdtNum = dollarNum * rateNum;
      } else {
        toast.error('দয়া করে মোট টাকার পরিমাণ অথবা ডলার রেট সঠিকভাবে দিন।');
        return;
      }
    }

    const calculatedRate = !isNaN(rateNum) && rateNum > 0 
      ? rateNum 
      : (bdtNum / dollarNum);

    const dateTimestamp = new Date(form.date).getTime();

    await addExpense({
      date: dateTimestamp,
      category: 'Dollar Purchase',
      dollars: dollarNum,
      rate: calculatedRate,
      amount: bdtNum,
      source: form.source,
      notes: form.notes,
      description: form.notes || `$${dollarNum} @ ৳${calculatedRate.toFixed(2)} (${form.source})`
    });

    // Reset Form
    setForm({
      date: new Date().toISOString().split('T')[0],
      dollars: '',
      rate: '',
      bdtAmount: '',
      source: 'Dual Currency Card',
      notes: ''
    });
    setShowModal(false);
  };

  // Filter Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNote = item.notes?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
        const matchesSource = item.source?.toLowerCase().includes(q);
        const matchesDollars = item.dollars?.toString().includes(q);
        const matchesAmount = item.amount?.toString().includes(q);
        if (!matchesNote && !matchesSource && !matchesDollars && !matchesAmount) {
          return false;
        }
      }

      // Date Range Filter
      if (startDate) {
        const startTs = new Date(startDate).setHours(0, 0, 0, 0);
        if (item.date < startTs) return false;
      }
      if (endDate) {
        const endTs = new Date(endDate).setHours(23, 59, 59, 999);
        if (item.date > endTs) return false;
      }

      return true;
    });
  }, [expenses, searchQuery, startDate, endDate]);

  // Calculations
  const totalDollars = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => {
      if (item.dollars && item.dollars > 0) return sum + item.dollars;
      // Fallback estimate if dollars is not stored explicitly
      if (item.rate && item.rate > 0) return sum + (item.amount / item.rate);
      return sum;
    }, 0);
  }, [filteredExpenses]);

  const totalBdtSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [filteredExpenses]);

  const avgExchangeRate = useMemo(() => {
    if (totalDollars > 0) {
      return totalBdtSpent / totalDollars;
    }
    return 0;
  }, [totalDollars, totalBdtSpent]);

  // CSV File Download Function
  const handleDownloadCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error('ডাউনলোড করার জন্য কোনো তথ্য নেই!');
      return;
    }

    try {
      // CSV Headers
      const headers = ['তারিখ (Date)', 'ক্রয়কৃত ডলার ($)', 'ডলার রেট (৳)', 'মোট টাকা (BDT)', 'উৎস / মাধ্যমে (Source)', 'নোট / কারণ (Notes)'];

      // CSV Rows
      const rows = filteredExpenses.map(item => {
        const dateStr = new Date(item.date).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const dollars = item.dollars ? item.dollars.toFixed(2) : (item.rate ? (item.amount / item.rate).toFixed(2) : 'N/A');
        const rateVal = item.rate ? item.rate.toFixed(2) : (item.dollars ? (item.amount / item.dollars).toFixed(2) : 'N/A');
        const amountBdt = item.amount ? item.amount.toFixed(2) : '0.00';
        const source = (item.source || 'General').replace(/,/g, ' ');
        const notes = (item.notes || item.description || '-').replace(/,/g, ' ');

        return [dateStr, dollars, rateVal, amountBdt, source, notes];
      });

      // Add Summary Row
      rows.push([]);
      rows.push(['সর্বমোট (Total)', totalDollars.toFixed(2), avgExchangeRate.toFixed(2), totalBdtSpent.toFixed(2), '', '']);

      // UTF-8 BOM for Bengali & Unicode Support in Excel
      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const todayStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `dollar_purchase_report_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('ডলার হিসেব রিপোর্ট সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('ফাইল ডাউনলোড করতে সমস্যা হয়েছে।');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-2 font-sans bg-[#FBFBFD] rounded-[20px] p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ডলার খরচের হিসাব লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#FBFBFD] min-h-screen text-black antialiased p-4 md:p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            ডলার খরচের হিসাব (Dollar Purchases)
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            কত তারিখে কত ডলার কত টাকা দিয়ে ক্রয় করা হয়েছে তার সম্পূর্ণ হিসাব ও রিপোর্ট ব্যবস্থা
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            রিপোর্ট ডাউনলোড (CSV)
          </button>
          
          <button 
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন ডলার ইনপুট
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Dollars */}
        <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">মোট ক্রয়কৃত ডলার</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">${totalDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">USD Total Purchased</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total BDT Spent */}
        <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">মোট খরচের টাকা (BDT)</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{formatPrice(totalBdtSpent)}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Total Taka Spent</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Average Exchange Rate */}
        <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">গড় ডলার রেট</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">৳{avgExchangeRate.toFixed(2)}</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Average BDT per USD</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Transaction Count */}
        <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">মোট লেনদেন</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{filteredExpenses.length} টি</h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Total Purchase Records</p>
          </div>
          <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-gray-100 rounded-[20px] shadow-xs p-5 space-y-4">
        
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="উৎস, ব্যাংক কার্ড বা নোট দিয়ে খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-400 transition-all" 
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>শুরু:</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="outline-none bg-transparent cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700">
              <span>শেষ:</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="outline-none bg-transparent cursor-pointer"
              />
            </div>

            {(searchQuery || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-xs font-bold cursor-pointer"
                title="ফিল্টার ক্লিয়ার করুন"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-gray-400 border-b border-gray-100 uppercase tracking-wider font-black text-[9px]">
                <th className="py-3.5 px-5">তারিখ (Date)</th>
                <th className="py-3.5 px-5 text-right">ক্রয়কৃত ডলার ($)</th>
                <th className="py-3.5 px-5 text-right">ডলার রেট (৳/$)</th>
                <th className="py-3.5 px-5 text-right">মোট খরচের টাকা (BDT)</th>
                <th className="py-3.5 px-5">উৎস / কার্ড (Source)</th>
                <th className="py-3.5 px-5">নোট / বিবরণ (Notes)</th>
                <th className="py-3.5 px-5 text-center w-20">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
              {filteredExpenses.map(ex => {
                const dollarsVal = ex.dollars || (ex.rate ? ex.amount / ex.rate : 0);
                const rateVal = ex.rate || (ex.dollars ? ex.amount / ex.dollars : 0);

                return (
                  <tr key={ex.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="py-4 px-5 text-gray-500 font-mono text-[11px]">
                      {new Date(ex.date).toLocaleDateString('bn-BD', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-4 px-5 text-right text-emerald-600 font-extrabold text-sm font-mono">
                      ${dollarsVal > 0 ? dollarsVal.toFixed(2) : '-'}
                    </td>
                    <td className="py-4 px-5 text-right text-gray-600 font-mono">
                      {rateVal > 0 ? `৳${rateVal.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-4 px-5 text-right text-gray-900 font-black text-sm">
                      {formatPrice(ex.amount)}
                    </td>
                    <td className="py-4 px-5">
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-indigo-100">
                        {ex.source || 'Dual Currency Card'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-gray-600 font-normal max-w-xs truncate">
                      {ex.notes || ex.description || '-'}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <button 
                        type="button"
                        onClick={async () => {
                          if (window.confirm('আপনি কি এই ডলার ক্রয়ের তথ্যটি মুছে ফেলতে চান?')) {
                            await deleteExpense(ex.id);
                          }
                        }} 
                        className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredExpenses.length === 0 && (
            <div className="py-12 text-center text-xs text-gray-400 space-y-2">
              <Info className="w-6 h-6 mx-auto text-gray-300" />
              <p className="font-bold">কোনো ডলার ক্রয়ের রেকর্ড পাওয়া যায়নি।</p>
              <p className="text-[11px] text-gray-400">নতুন রেকর্ড যোগ করতে "নতুন ডলার ইনপুট" বাটনে ক্লিক করুন।</p>
            </div>
          )}
        </div>

      </div>

      {/* --- ADD DOLLAR PURCHASE MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[24px] max-w-md w-full border border-gray-100 p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight">
                  নতুন ডলার ক্রয়ের হিসাব ইনপুট
                </h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  ডলার পরিমাণ, রেট ও মোট খরচের টাকা লিখুন
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
              
              {/* Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                  তারিখ (Date) *
                </label>
                <input 
                  type="date" 
                  required
                  value={form.date} 
                  onChange={e => setForm({...form, date: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                />
              </div>

              {/* Dollar Amount & Exchange Rate Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                    কত ডলার ($ USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                    <input 
                      type="number" 
                      step="any"
                      required
                      placeholder="100" 
                      value={form.dollars} 
                      onChange={e => handleDollarsChange(e.target.value)} 
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                    ডলার রেট (৳ / $)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">৳</span>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="125" 
                      value={form.rate} 
                      onChange={e => handleRateChange(e.target.value)} 
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* Total BDT Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                  মোট খরচের টাকা (Total BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">৳</span>
                  <input 
                    type="number" 
                    step="any"
                    required
                    placeholder="12500" 
                    value={form.bdtAmount} 
                    onChange={e => setForm({...form, bdtAmount: e.target.value})} 
                    className="w-full pl-8 pr-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 text-xs font-black text-emerald-900 rounded-xl outline-none focus:border-emerald-500 transition-all" 
                  />
                </div>
              </div>

              {/* Source / Card */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                  পেমেন্ট সোর্স / মাধ্যম (Payment Source)
                </label>
                <select 
                  value={form.source} 
                  onChange={e => setForm({...form, source: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Dual Currency Card">Dual Currency Card (ব্যাংক কার্ড)</option>
                  <option value="EBL Visa / Mastercard">EBL Visa / Mastercard</option>
                  <option value="City Bank Card">City Bank Card</option>
                  <option value="Islami Bank Card">Islami Bank Card</option>
                  <option value="Exchanger / Agent">Exchanger / Agent</option>
                  <option value="Payoneer / Wise">Payoneer / Wise</option>
                  <option value="Other Bank">Other Bank / Cash</option>
                </select>
              </div>

              {/* Purpose / Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                  কাজের বিবরণ / নোট (Notes / Purpose)
                </label>
                <textarea 
                  placeholder="যেমন: Meta Ads, Server Hosting, Software subscription ইত্যাদি..." 
                  value={form.notes} 
                  onChange={e => setForm({...form, notes: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all h-20 resize-none" 
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  ক্যানসেল
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} className="stroke-[3]" />
                  সেভ করুন
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
