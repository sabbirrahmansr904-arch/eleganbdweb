/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType, isQuotaError } from '../../lib/firestoreUtils';
import { formatPrice } from '../../lib/utils';
import { useFinance, isUsdAccount, formatAccountBalance } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  DollarSign, 
  Search, 
  Calendar, 
  Download, 
  X, 
  TrendingUp, 
  Info,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Check
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

interface DollarTransaction {
  id: string;
  type: 'buy' | 'spend';
  amount: number;
  rate: number;
  bdtAmount: number;
  date: number; // timestamp
  purpose?: string;
  notes?: string;
  account?: string;
  accountId?: string;
  usdAccountId?: string;
}

export default function AdminDollarExpenses(): React.JSX.Element {
  const { bankAccounts, addBankTransaction } = useFinance();
  const { isSabbirRahman } = useAuth();
  const [transactions, setTransactions] = useState<DollarTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'buy' | 'spend'>('all');
  
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // format: 'YYYY-MM'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection for PDF download
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<DollarTransaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<'buy' | 'spend'>('spend');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    rate: '117.5',
    bdtAmount: '',
    accountId: '',
    usdAccountId: '',
    account: 'bKash',
    purpose: 'Facebook Ads',
    notes: ''
  });

  // Fetch dollar transactions real-time
  useEffect(() => {
    const q = query(collection(db, 'dollar_transactions'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: DollarTransaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          type: data.type,
          amount: Number(data.amount || 0),
          rate: Number(data.rate || 0),
          bdtAmount: Number(data.bdtAmount || 0),
          date: Number(data.date || Date.now()),
          purpose: data.purpose || '',
          notes: data.notes || '',
          account: data.account || 'bKash',
          accountId: data.accountId || '',
          usdAccountId: data.usdAccountId || ''
        });
      });
      setTransactions(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'dollar_transactions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Pre-fill fields for editing
  useEffect(() => {
    if (editingTransaction) {
      setFormType(editingTransaction.type);
      const computedBdt = editingTransaction.bdtAmount 
        ? editingTransaction.bdtAmount.toString() 
        : ((editingTransaction.amount || 0) * (editingTransaction.rate || 117.5)).toFixed(2);
      const computedRate = editingTransaction.rate
        ? editingTransaction.rate.toString()
        : (editingTransaction.amount > 0 && editingTransaction.bdtAmount ? (editingTransaction.bdtAmount / editingTransaction.amount).toFixed(2) : '117.5');

      setForm({
        date: new Date(editingTransaction.date).toISOString().split('T')[0],
        amount: editingTransaction.amount.toString(),
        rate: computedRate,
        bdtAmount: computedBdt,
        accountId: editingTransaction.accountId || '',
        usdAccountId: editingTransaction.usdAccountId || '',
        account: editingTransaction.account || 'bKash',
        purpose: editingTransaction.purpose || 'Facebook Ads',
        notes: editingTransaction.notes || ''
      });
    } else {
      // Set defaults for fresh entry
      setForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        rate: '117.5',
        bdtAmount: '',
        accountId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
        usdAccountId: bankAccounts.filter(a => isUsdAccount(a)).length > 0 ? bankAccounts.filter(a => isUsdAccount(a))[0].id : '',
        account: bankAccounts.length > 0 ? `${bankAccounts[0].bankName} (${bankAccounts[0].accountNumber})` : 'bKash',
        purpose: 'Facebook Ads',
        notes: ''
      });
    }
  }, [editingTransaction, showModal, bankAccounts]);

  // Handle auto-calculating values
  const handleAmountChange = (val: string) => {
    const amt = parseFloat(val);
    const bdt = parseFloat(form.bdtAmount);
    const r = parseFloat(form.rate);

    let nextBdt = form.bdtAmount;
    let nextRate = form.rate;

    if (!isNaN(amt) && amt > 0) {
      if (!isNaN(bdt) && bdt > 0) {
        nextRate = (bdt / amt).toFixed(2);
      } else if (!isNaN(r) && r > 0) {
        nextBdt = (amt * r).toFixed(2);
      }
    }

    setForm(prev => ({
      ...prev,
      amount: val,
      bdtAmount: nextBdt,
      rate: nextRate
    }));
  };

  const handleRateChange = (val: string) => {
    const r = parseFloat(val);
    const amt = parseFloat(form.amount);
    const calculatedBdt = (!isNaN(amt) && !isNaN(r)) ? (amt * r).toFixed(2) : form.bdtAmount;
    setForm(prev => ({
      ...prev,
      rate: val,
      bdtAmount: calculatedBdt
    }));
  };

  const handleBdtAmountChange = (val: string) => {
    const bdt = parseFloat(val);
    const amt = parseFloat(form.amount);
    const calculatedRate = (!isNaN(bdt) && !isNaN(amt) && amt > 0) ? (bdt / amt).toFixed(2) : form.rate;
    setForm(prev => ({
      ...prev,
      bdtAmount: val,
      rate: calculatedRate
    }));
  };

  // List of unique months for filtration
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      monthsSet.add(`${year}-${month}`);
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Overall calculations (All time vs Filtered)
  const stats = useMemo(() => {
    let totalBuyUSD = 0;
    let totalBuyBDT = 0;
    let totalSpendUSD = 0;
    let totalSpendBDT = 0;
    let currentMonthSpendUSD = 0;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (t.type === 'buy') {
        totalBuyUSD += t.amount;
        totalBuyBDT += t.bdtAmount;
      } else if (t.type === 'spend') {
        totalSpendUSD += t.amount;
        totalSpendBDT += t.bdtAmount;
        
        if (tDate.getFullYear() === curYear && tDate.getMonth() === curMonth) {
          currentMonthSpendUSD += t.amount;
        }
      }
    });

    const avgBuyRate = totalBuyUSD > 0 ? (totalBuyBDT / totalBuyUSD) : 117.5;
    const balanceUSD = totalBuyUSD - totalSpendUSD;
    const balanceBDT = balanceUSD * avgBuyRate;

    return {
      totalBuyUSD,
      totalBuyBDT,
      totalSpendUSD,
      totalSpendBDT,
      currentMonthSpendUSD,
      avgBuyRate,
      balanceUSD,
      balanceBDT
    };
  }, [transactions]);

  // Filtered Ledger List
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Type Tab Filter
      if (activeTab === 'buy' && t.type !== 'buy') return false;
      if (activeTab === 'spend' && t.type !== 'spend') return false;

      // Month Filter
      if (selectedMonth !== 'all') {
        const d = new Date(t.date);
        const yMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (yMonth !== selectedMonth) return false;
      }

      // Date Range filter
      if (startDate) {
        const startTs = new Date(startDate).setHours(0, 0, 0, 0);
        if (t.date < startTs) return false;
      }
      if (endDate) {
        const endTs = new Date(endDate).setHours(23, 59, 59, 999);
        if (t.date > endTs) return false;
      }

      // Text Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPurpose = t.purpose?.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        const matchesAmount = t.amount.toString().includes(q);
        const matchesRate = t.rate.toString().includes(q);
        const matchesBdt = t.bdtAmount.toString().includes(q);
        if (!matchesPurpose && !matchesNotes && !matchesAmount && !matchesRate && !matchesBdt) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, activeTab, selectedMonth, startDate, endDate, searchQuery]);

  // Save Transaction Handler
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountVal = parseFloat(form.amount);

    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('দয়া করে সঠিক ডলারের পরিমাণ দিন।');
      return;
    }

    const finalDate = new Date(form.date).getTime();

    const enteredBdt = parseFloat(form.bdtAmount);
    const enteredRate = parseFloat(form.rate);

    let bdtVal = 0;
    let rateVal = 0;

    if (formType === 'buy') {
      if (!isNaN(enteredBdt) && enteredBdt > 0) {
        bdtVal = enteredBdt;
        rateVal = amountVal > 0 ? Number((bdtVal / amountVal).toFixed(4)) : (enteredRate || 117.5);
      } else if (!isNaN(enteredRate) && enteredRate > 0) {
        rateVal = enteredRate;
        bdtVal = Number((amountVal * rateVal).toFixed(2));
      } else {
        rateVal = stats.avgBuyRate || 117.5;
        bdtVal = Number((amountVal * rateVal).toFixed(2));
      }
    } else {
      bdtVal = !isNaN(enteredBdt) && enteredBdt > 0 ? enteredBdt : Number((amountVal * (stats.avgBuyRate || 117.5)).toFixed(2));
      rateVal = 0;
    }

    let selectedAccName = form.account;
    if (form.accountId) {
      const foundAcc = bankAccounts.find(a => a.id === form.accountId);
      if (foundAcc) {
        selectedAccName = `${foundAcc.bankName} (${foundAcc.accountNumber})`;
      }
    }

    const payload = {
      type: formType,
      amount: amountVal,
      rate: formType === 'buy' ? rateVal : 0,
      bdtAmount: bdtVal,
      accountId: form.accountId || '',
      usdAccountId: formType === 'buy' ? form.usdAccountId : '',
      account: selectedAccName,
      date: finalDate,
      purpose: formType === 'spend' ? form.purpose : 'ডলার ক্রয়',
      notes: form.notes || ''
    };

    try {
      if (editingTransaction) {
        await updateDoc(doc(db, 'dollar_transactions', editingTransaction.id), payload);
        toast.success('লেনদেন সফলভাবে আপডেট করা হয়েছে!');
      } else {
        const docRef = await addDoc(collection(db, 'dollar_transactions'), payload);

        // If a real bank account is selected and it's a dollar buy, record it in the finance bank transaction ledger
        if (formType === 'buy') {
          if (form.accountId && bdtVal > 0) {
            try {
              await addBankTransaction({
                accountId: form.accountId,
                type: 'withdraw', // Dollar buy deducts BDT from account
                amount: bdtVal,
                date: finalDate,
                reference: `ডলার ক্রয় ($${amountVal} @ ৳${rateVal})`,
                notes: form.notes ? `ডলার ক্রয় - ${form.notes}` : 'ডলার ক্রয়',
                status: 'paid'
              });
            } catch (bankErr) {
              console.error('Failed to log bank transaction:', bankErr);
            }
          }
          if (form.usdAccountId && amountVal > 0) {
            try {
              await addBankTransaction({
                accountId: form.usdAccountId,
                type: 'deposit', // Dollar buy adds USD to the dollar wallet
                amount: amountVal,
                date: finalDate,
                reference: `ডলার জমা (Purchased)`,
                notes: form.notes ? `ডলার জমা - ${form.notes}` : 'ডলার ক্রয় থেকে জমা',
                status: 'paid'
              });
            } catch (bankErr) {
              console.error('Failed to log bank transaction:', bankErr);
            }
          }
        } else if (formType === 'spend') {
          if (form.accountId && amountVal > 0) {
            // Find if the selected account is actually a USD account
            const acc = bankAccounts.find(a => a.id === form.accountId);
            if (acc) {
              try {
                await addBankTransaction({
                  accountId: form.accountId,
                  type: 'withdraw', // Spend deducts either USD or BDT depending on account type
                  amount: isUsdAccount(acc) ? amountVal : bdtVal,
                  date: finalDate,
                  reference: `ডলার খরচ (${form.purpose})`,
                  notes: form.notes ? `ডলার খরচ - ${form.notes}` : 'ডলার খরচ',
                  status: 'paid'
                });
              } catch (bankErr) {
                console.error('Failed to log bank transaction:', bankErr);
              }
            }
          }
        }

        toast.success('লেনদেন সফলভাবে সংরক্ষণ করা হয়েছে এবং সংশ্লিষ্ট অ্যাকাউন্ট থেকে টাকা সমন্বয় করা হয়েছে!');
      }
      setShowModal(false);
      setEditingTransaction(null);
    } catch (err) {
      handleFirestoreError(err, editingTransaction ? OperationType.UPDATE : OperationType.CREATE, 'dollar_transactions');
      if (isQuotaError(err)) {
        toast.error('Firestore কোটা পূর্ণ হয়ে গেছে! অনুগ্রহ করে পরে আবার চেষ্টা করুন।');
      } else {
        toast.error('সংরক্ষণ করতে সমস্যা হয়েছে!');
      }
    }
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = async (id: string) => {
    
    try {
      await deleteDoc(doc(db, 'dollar_transactions', id));
      toast.success('লেনদেন সফলভাবে ডিলিট হয়েছে!');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `dollar_transactions/${id}`);
      if (isQuotaError(err)) {
        toast.error('Firestore কোটা পূর্ণ হয়ে গেছে! অনুগ্রহ করে পরে আবার চেষ্টা করুন।');
      } else {
        toast.error('ডিলিট করতে সমস্যা হয়েছে!');
      }
    }
  };

  // Selection logic for PDF export
  const isAllSelected = filteredTransactions.length > 0 && filteredTransactions.every(t => selectedIds.includes(t.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };
  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Export selected transactions to PDF using html2pdf.js for clean Bengali font rendering
  const handleDownloadPDF = () => {
    const targetTransactions = selectedIds.length > 0 
      ? filteredTransactions.filter(t => selectedIds.includes(t.id))
      : filteredTransactions;

    if (targetTransactions.length === 0) {
      toast.error('PDF ডাউনলোড করার জন্য অনুগ্রহ করে অন্তত একটি লেনদেন নির্বাচন করুন অথবা ফিল্টার করুন!');
      return;
    }

    const toastId = toast.loading('PDF ফাইল জেনারেট ও ডাউনলোড হচ্ছে...');

    try {
      let totalUSD = 0;
      let totalBuy = 0;
      let totalSpend = 0;

      targetTransactions.forEach(t => {
        if (t.type === 'buy') {
          totalBuy += t.amount;
          totalUSD += t.amount;
        } else {
          totalSpend += t.amount;
          totalUSD -= t.amount;
        }
      });

      // Create a temporary element for PDF rendering
      const container = document.createElement('div');
      container.style.padding = '20px';
      container.style.fontFamily = "Arial, 'SolaimanLipi', sans-serif";
      container.style.color = '#111827';
      container.style.background = '#FFFFFF';
      container.style.width = '750px';

      container.innerHTML = `
        <div style="background: #2563EB; color: #FFFFFF; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">ডলার খরচ ও ক্রয়ের হিসাব স্টেটমেন্ট</h1>
          <p style="margin: 6px 0 0 0; font-size: 12px; opacity: 0.95;">Elegan BD ম্যানেজমেন্ট সিস্টেম • জেনারেটেড তারিখ: ${new Date().toLocaleDateString('bn-BD')}</p>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <div style="flex: 1; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; text-align: center;">
            <span style="font-size: 10px; color: #64748B; font-weight: bold; display: block; text-transform: uppercase;">মোট ক্রয় (TOTAL BUY)</span>
            <strong style="font-size: 16px; color: #047857;">$${totalBuy.toFixed(2)}</strong>
          </div>
          <div style="flex: 1; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; text-align: center;">
            <span style="font-size: 10px; color: #64748B; font-weight: bold; display: block; text-transform: uppercase;">মোট খরচ (TOTAL SPEND)</span>
            <strong style="font-size: 16px; color: #B91C1C;">$${totalSpend.toFixed(2)}</strong>
          </div>
          <div style="flex: 1; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; text-align: center;">
            <span style="font-size: 10px; color: #64748B; font-weight: bold; display: block; text-transform: uppercase;">নেট ব্যালেন্স (BALANCE)</span>
            <strong style="font-size: 16px; color: #1E293B;">$${totalUSD.toFixed(2)}</strong>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
          <thead>
            <tr style="background-color: #0F172A; color: #FFFFFF;">
              <th style="padding: 10px 12px; text-align: left; border: 1px solid #0F172A; font-weight: bold;">তারিখ (Date)</th>
              <th style="padding: 10px 12px; text-align: left; border: 1px solid #0F172A; font-weight: bold;">ধরন (Type)</th>
              <th style="padding: 10px 12px; text-align: right; border: 1px solid #0F172A; font-weight: bold;">পরিমাণ (USD)</th>
              <th style="padding: 10px 12px; text-align: left; border: 1px solid #0F172A; font-weight: bold;">উদ্দেশ্য / মাধ্যম</th>
              <th style="padding: 10px 12px; text-align: left; border: 1px solid #0F172A; font-weight: bold;">নোট (Notes)</th>
            </tr>
          </thead>
          <tbody>
            ${targetTransactions.map((t, idx) => {
              const dateStr = new Date(t.date).toLocaleDateString('en-GB');
              const isBuy = t.type === 'buy';
              const typeStr = isBuy ? 'ডলার ক্রয় (Buy)' : 'ডলার খরচ (Spend)';
              const amountStr = `${isBuy ? '+' : '-'}$${t.amount.toFixed(2)}`;
              const purposeStr = isBuy ? 'ডলার ক্রয়' : (t.purpose || 'ডলার খরচ');
              const notesStr = t.notes || '-';
              const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              return `
                <tr style="background-color: ${bg};">
                  <td style="padding: 9px 12px; border: 1px solid #E2E8F0; color: #334155;">${dateStr}</td>
                  <td style="padding: 9px 12px; border: 1px solid #E2E8F0; font-weight: bold; color: ${isBuy ? '#047857' : '#B91C1C'};">${typeStr}</td>
                  <td style="padding: 9px 12px; border: 1px solid #E2E8F0; text-align: right; font-weight: bold; color: ${isBuy ? '#047857' : '#0F172A'};">${amountStr}</td>
                  <td style="padding: 9px 12px; border: 1px solid #E2E8F0; color: #1E293B; font-weight: 600;">${purposeStr}</td>
                  <td style="padding: 9px 12px; border: 1px solid #E2E8F0; color: #64748B;">${notesStr}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px;">
          স্বয়ংক্রিয়ভাবে জেনারেটেড ডলার হিসাব স্টেটমেন্ট • Elegan BD ম্যানেজমেন্ট সিস্টেম
        </div>
      `;

      document.body.appendChild(container);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `dollar_statement_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      (html2pdf as any)().from(container).set(opt).save().then(() => {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        toast.dismiss(toastId);
        toast.success('PDF ফাইল সফলভাবে ডাউনলোড হয়েছে!', { id: toastId });
      }).catch((e: any) => {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        toast.dismiss(toastId);
        console.error('PDF Error:', e);
        toast.error('PDF তৈরি করতে সমস্যা হয়েছে: ' + (e.message || ''));
      });

    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('ত্রুটি ঘটেছে: ' + err.message);
    }
  };

  // Format Helper for Month String Display
  const formatMonthName = (monthStr: string) => {
    if (monthStr === 'all') return 'সব সময় (All Time)';
    const [year, month] = monthStr.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = dateObj.toLocaleDateString('bn-BD', { month: 'long' });
    const englishYear = dateObj.toLocaleDateString('bn-BD', { year: 'numeric' });
    return `${monthName}, ${englishYear}`;
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-2 font-sans bg-white rounded-3xl p-12 shadow-2xs border border-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">ডলার হিসাবের খাতা লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#F8F9FD] min-h-screen text-black antialiased p-4 md:p-6">
      
      {/* Upper Title and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            ডলার খরচের হিসাব (Dollar Expense & Purchases)
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            ব্যবসায়িক কাজে ডলার কেনা, ফেসবুক অ্যাড ও বিভিন্ন সাবস্ক্রিপশন বাবদ ডলার খরচের হিসাব খাতা
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            PDF ডাউনলোড
          </button>
          
          {true && (
            <button 
              onClick={() => {
                setEditingTransaction(null);
                setShowModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              নতুন ডলার লেনদেন
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        
        {/* Total Dollars Bought */}
        <div className="bg-white border border-gray-100/80 p-4 rounded-[20px] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">মোট ডলার ক্রয়</p>
            <h3 className="text-xl font-black text-gray-900 mt-1">${stats.totalBuyUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">মোট ডলার ক্রয়ের পরিমাণ</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold shadow-2xs">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Total Dollars Spent */}
        <div className="bg-white border border-gray-100/80 p-4 rounded-[20px] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">মোট ডলার খরচ (Spend)</p>
            <h3 className="text-xl font-black text-gray-900 mt-1">${stats.totalSpendUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">বিজ্ঞাপন ও টুলস বাবদ খরচ</p>
          </div>
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-bold shadow-2xs">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white border border-gray-100/80 p-4 rounded-[20px] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">অবশিষ্ট ডলার ব্যালেন্স</p>
            <h3 className={`text-xl font-black mt-1 ${stats.balanceUSD >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              ${stats.balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">বর্তমানে অ্যাকাউন্টে রয়েছে</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-2xs ${stats.balanceUSD >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Current Month Spend */}
        <div className="bg-white border border-gray-100/80 p-4 rounded-[20px] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">চলতি মাসের মোট খরচ</p>
            <h3 className="text-xl font-black text-gray-900 mt-1">${stats.currentMonthSpendUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">চলতি মাসের মোট ডলার খরচ</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold shadow-2xs">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Filters and Navigation */}
      <div className="bg-white border border-gray-100 rounded-[20px] shadow-2xs p-4 space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Segmented Mode Control */}
          <div className="bg-gray-100 p-1 rounded-full flex items-center border border-gray-200/50 self-start">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-all duration-300 ${
                activeTab === 'all' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-gray-500 hover:text-indigo-600'
              }`}
            >
              সকল লেনদেন ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('buy')}
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-all duration-300 ${
                activeTab === 'buy' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-gray-500 hover:text-indigo-600'
              }`}
            >
              ডলার ক্রয় ({transactions.filter(t => t.type === 'buy').length})
            </button>
            <button
              onClick={() => setActiveTab('spend')}
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-all duration-300 ${
                activeTab === 'spend' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-gray-500 hover:text-indigo-600'
              }`}
            >
              ডলার খরচ ({transactions.filter(t => t.type === 'spend').length})
            </button>
          </div>

          {/* Monthly Filter and Search Bar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Month dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span>মাস:</span>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="outline-none bg-transparent cursor-pointer font-bold text-gray-800"
              >
                <option value="all">সব সময় (All Time)</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthName(m)}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || selectedMonth !== 'all' || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMonth('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="ফিল্টার মুছে ফেলুন"
              >
                <X className="w-3.5 h-3.5" />
                <span>রিসেট</span>
              </button>
            )}
          </div>

        </div>

        {/* Date Ranges and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          
          <div className="relative md:col-span-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="নোট, পরিমাণ বা মাধ্যম দিয়ে খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-400 transition-all" 
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <div className="flex-1 flex items-center gap-1.5 bg-gray-50/70 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="shrink-0">শুরু:</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="outline-none bg-transparent cursor-pointer w-full text-gray-800 font-bold"
              />
            </div>

            <div className="flex-1 flex items-center gap-1.5 bg-gray-50/70 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="shrink-0">শেষ:</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="outline-none bg-transparent cursor-pointer w-full text-gray-800 font-bold"
              />
            </div>
          </div>

        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-2xl">
          <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 flex items-center justify-between border-b border-gray-100">
            <span>মোট লেনদেন: {filteredTransactions.length} টি {selectedIds.length > 0 && `(নির্বাচিত: ${selectedIds.length} টি)`}</span>
            {selectedIds.length > 0 && (
              <button 
                onClick={() => setSelectedIds([])}
                className="text-rose-600 hover:underline text-[11px] font-bold cursor-pointer"
              >
                সিলেকশন বাতিল করুন
              </button>
            )}
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FD] border-b border-gray-100 text-[10px] text-[#5E6A83] font-black uppercase tracking-widest">
                <th className="py-3 px-3 w-10 text-center">
                  <input 
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    title="সব সিলেক্ট করুন"
                  />
                </th>
                <th className="py-3 px-4">তারিখ (Date)</th>
                <th className="py-3 px-4">লেনদেনের ধরন</th>
                <th className="py-3 px-4">পেমেন্ট অ্যাকাউন্ট</th>
                <th className="py-3 px-4 text-right">ডলার (USD)</th>
                <th className="py-3 px-4 text-right">হিসাব ও টাকা (BDT)</th>
                <th className="py-3 px-4">উদ্দেশ্য / নোট</th>
                <th className="py-3 px-4 text-center w-24">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-bold italic">
                    কোনো ডলার লেনদেনের রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const dateObj = new Date(t.date);
                  const formattedDate = dateObj.toLocaleDateString('bn-BD', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  const isBuy = t.type === 'buy';
                  const isSelected = selectedIds.includes(t.id);

                  return (
                    <tr key={t.id} className={`hover:bg-gray-50/40 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                      <td className="py-3 px-3 text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(t.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-700">{formattedDate}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isBuy 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {isBuy ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isBuy ? 'ডলার ক্রয়' : 'ডলার খরচ'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold">
                            {t.account || 'bKash'} {isBuy ? '(থেকে)' : ''}
                          </span>
                          {isBuy && t.usdAccountId && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-800 rounded-lg text-[10px] font-bold border border-red-100">
                              <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                              {bankAccounts.find(a => a.id === t.usdAccountId)?.bankName || 'USD Account'} (জমা)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 px-4 font-black text-right ${isBuy ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isBuy ? '+' : '-'}${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-black text-gray-900">
                          ৳{t.bdtAmount ? t.bdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (t.amount * (t.rate || 117.5)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {isBuy && t.rate ? (
                          <div className="text-[10px] text-gray-400 font-bold">
                            Rate: ৳{t.rate}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-800">
                          {isBuy ? 'ডলার ক্রয়' : (t.purpose || 'ডলার খরচ')}
                        </div>
                        {t.notes && (
                          <div className="text-[11px] text-gray-400 font-medium max-w-[180px] truncate" title={t.notes}>
                            {t.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTransaction(t);
                              setShowModal(true);
                            }}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                            title="সম্পাদনা করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(t.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Info Help Message Banner */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-[20px] p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 font-medium space-y-1">
          <p className="font-bold">গুরুত্বপূর্ণ তথ্য এবং কাজের নির্দেশিকা:</p>
          <p>১. ডলার ব্যালেন্স হিসাবের ক্ষেত্রে: ক্রয়কৃত ডলার থেকে খরচকৃত ডলার স্বয়ংক্রিয়ভাবে বিয়োগ করা হয়।</p>
          <p>২. ভিন্ন ভিন্ন এক্সচেঞ্জ রেট বা টাকার পরিমাণ মনে রাখার জন্য আপনি সরাসরি "নোট বা মন্তব্য (Notes)" অপশনে তা লিখে রাখতে পারেন।</p>
          <p>৩. সকল হিসাব ও ডাটা এক্সেল শিট (Excel/CSV) আকারে সরাসরি ডাউনলোড করতে উপরের "এক্সেল ডাউনলোড" বাটনে ক্লিক করুন।</p>
        </div>
      </div>

      {/* Add / Edit Centered Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black text-gray-900">
                  {editingTransaction ? 'ডলার লেনদেন আপডেট করুন' : 'নতুন ডলার লেনদেন যুক্ত করুন'}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                  ডলার হিসাবের খাতা নির্ভুল রাখুন
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setEditingTransaction(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-200/60 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
              
              {/* Type Switcher (only for fresh entries) */}
              {!editingTransaction && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">লেনদেনের ধরন</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormType('spend')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        formType === 'spend' 
                          ? 'bg-indigo-600 text-white shadow-2xs' 
                          : 'text-gray-500 hover:text-indigo-600'
                      }`}
                    >
                      ডলার খরচ (Spend)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('buy')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        formType === 'buy' 
                          ? 'bg-emerald-600 text-white shadow-2xs' 
                          : 'text-gray-500 hover:text-emerald-700'
                      }`}
                    >
                      ডলার ক্রয় (Buy/Purchase)
                    </button>
                  </div>
                </div>
              )}

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">তারিখ (Date)</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="date" 
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>

              {/* Amount (USD) and Total BDT Amount / Rate */}
              {formType === 'buy' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                        ডলার (USD) *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="number" 
                          step="any"
                          required
                          placeholder="e.g. 100"
                          value={form.amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-indigo-400 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-indigo-700 tracking-wider flex items-center justify-between">
                        <span>মোট টাকা (BDT) *</span>
                        <span className="text-[9px] text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">কত টাকা লেগেছে</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-600">৳</span>
                        <input 
                          type="number" 
                          step="any"
                          required
                          placeholder="e.g. 12000"
                          value={form.bdtAmount}
                          onChange={(e) => handleBdtAmountChange(e.target.value)}
                          className="w-full pl-8 pr-3 py-2.5 bg-indigo-50/40 border border-indigo-200 focus:border-indigo-500 rounded-xl text-xs font-black text-indigo-900 outline-none transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optional / Auto-calculated Exchange Rate */}
                  <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-gray-600">
                        ডলার রেট (Rate ৳/USD)
                      </label>
                      <span className="text-[10px] font-bold text-indigo-600">
                        {form.amount && form.bdtAmount && parseFloat(form.amount) > 0 ? (
                          `হিসাবকৃত রেট: ৳${(parseFloat(form.bdtAmount) / parseFloat(form.amount)).toFixed(2)}/USD`
                        ) : (
                          'ঐচ্ছিক / অটো-হিসাব'
                        )}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">৳</span>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="e.g. 117.5"
                        value={form.rate}
                        onChange={(e) => handleRateChange(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:border-indigo-400 transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">খরচকৃত ডলার (USD Amount)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="number" 
                      step="any"
                      required
                      placeholder="e.g. 50"
                      value={form.amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-indigo-400 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Account Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
                  <span>
                    {formType === 'buy' ? 'ফাইন্যান্স অ্যাকাউন্ট (যেখান থেকে টাকা কাটা হবে)' : 'পেমেন্ট মাধ্যম / কার্ড / অ্যাকাউন্ট'}
                  </span>
                  {bankAccounts.length > 0 && (
                    <span className="text-indigo-600 font-bold">{bankAccounts.length} টি অ্যাকাউন্ট যুক্ত আছে</span>
                  )}
                </label>
                <select 
                  value={form.accountId}
                  onChange={(e) => {
                    const accId = e.target.value;
                    const found = bankAccounts.find(a => a.id === accId);
                    setForm({ 
                      ...form, 
                      accountId: accId,
                      account: found ? `${found.bankName} (${found.accountNumber})` : 'bKash'
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-indigo-400 transition-all"
                >
                  <option value="">-- অ্যাকাউন্ট সিলেক্ট করুন --</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountName} ({acc.accountNumber}) ({formatAccountBalance(acc)})
                    </option>
                  ))}
                </select>
                {formType === 'buy' && bankAccounts.length === 0 && (
                  <p className="text-[11px] text-amber-600 font-bold mt-1">
                    ⚠️ ফাইন্যান্স মডিউলে কোনো ব্যাংক অ্যাকাউন্ট বা ওয়ালেট পাওয়া যায়নি। দয়া করে Admin Finance থেকে অ্যাকাউন্ট যোগ করুন।
                  </p>
                )}
              </div>

              {/* Destination USD Account Selection (Only for buy) */}
              {formType === 'buy' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
                    <span>ডলার জমা হওয়ার অ্যাকাউন্ট (কোথায় ডলার যোগ হবে)</span>
                  </label>
                  <select 
                    value={form.usdAccountId}
                    onChange={(e) => setForm({ ...form, usdAccountId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-indigo-400 transition-all"
                  >
                    <option value="">-- ডলার অ্যাকাউন্ট সিলেক্ট করুন (ঐচ্ছিক) --</option>
                    {bankAccounts.filter(a => isUsdAccount(a)).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountName} ({acc.accountNumber}) ({formatAccountBalance(acc)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Calculation Preview Banner (Only for dollar buy) */}
              {formType === 'buy' ? (
                <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-900 font-bold flex items-center justify-between">
                  <span>মোট খরচ (Total BDT):</span>
                  <span className="font-black text-indigo-700">
                    ৳{parseFloat(form.bdtAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({form.account})
                    {form.amount && parseFloat(form.amount) > 0 && form.rate && (
                      <span className="text-[10px] text-indigo-500 font-semibold ml-1.5">
                        (${form.amount} @ ৳{parseFloat(form.rate).toFixed(2)})
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 text-[11px] text-rose-900 font-bold flex items-center justify-between">
                  <span>মোট ডলার খরচ:</span>
                  <span className="font-black text-rose-700">
                    ${form.amount || '0'} USD
                  </span>
                </div>
              )}

              {/* Purpose (Only for spend type) */}
              {formType === 'spend' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">খরচের উদ্দেশ্য (Purpose)</label>
                  <select 
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-indigo-400 transition-all"
                  >
                    <option value="Facebook Ads">ফেসবুক বিজ্ঞাপন (Facebook Ads)</option>
                    <option value="ফেসবুক বুস্টিং">ফেসবুক বুস্টিং (Facebook Boosting)</option>
                    <option value="Google Ads">গুগল বিজ্ঞাপন (Google Ads)</option>
                    <option value="Shopify Subscription">শপিফাই সাবস্ক্রিপশন</option>
                    <option value="Server/Hosting">সার্ভার ও হোস্টিং বিল</option>
                    <option value="Domain Registration">ডোমেন ক্রয়/রিনিউ</option>
                    <option value="Software/Tools">সফটওয়্যার / কাজের টুলস</option>
                    <option value="Other">অন্যান্য খরচ (Other Expense)</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">নোট বা মন্তব্য (Notes)</label>
                <textarea 
                  rows={2}
                  placeholder={formType === 'buy' ? "কার কাছ থেকে, কোন কার্ড বা মাধ্যমে ডলার ক্রয় করা হয়েছে..." : "খরচের বিস্তারিত বিবরণ লিখুন..."}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-indigo-400 transition-all resize-none"
                />
              </div>

              {/* Save Controls */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTransaction(null);
                  }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer text-center"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 text-white rounded-xl text-xs font-bold cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    formType === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>সংরক্ষণ করুন</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Centered Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm shadow-xl overflow-hidden border border-gray-100 p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-gray-900">লেনদেনটি ডিলিট করতে চান?</h3>
              <p className="text-xs text-gray-400 font-medium">
                আপনি কি নিশ্চিত যে এই ডলার লেনদেনটি চিরতরে ডিলিট করতে চান? এই কাজটি আর ফিরিয়ে আনা সম্ভব নয়।
              </p>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-500 hover:text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer text-center"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingId;
                  setDeletingId(null);
                  await handleDeleteTransaction(id);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
