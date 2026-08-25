/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Handshake, 
  Plus, 
  Minus, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  DollarSign, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Pencil, 
  Trash2, 
  UserCheck, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Building2, 
  Wallet, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  X, 
  AlertCircle,
  FileSpreadsheet,
  Crown,
  Percent,
  Check,
  Camera,
  Upload,
  User
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { formatPrice } from '../../lib/utils';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useBranding } from '../../contexts/BrandingContext';
import { compressAvatar } from '../../utils/imageCompressor';

export interface PartnerProfile {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  targetShare: number; // percentage e.g. 40
  color: string;
  avatarBg: string;
  badge: string;
  photoURL?: string;
}

export interface PartnerTransaction {
  id: string;
  partnerId: string;
  partnerName: string;
  type: 'investment' | 'withdrawal' | 'profit_share';
  amount: number;
  date: number; // timestamp ms
  timeString?: string;
  paymentMethod: string;
  accountId?: string;
  category: string;
  reference?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: number;
}

const DEFAULT_3_PARTNERS: PartnerProfile[] = [
  {
    id: 'partner_1',
    name: 'Sabbir Rahman',
    role: 'CEO & Managing Partner',
    phone: '01619835133',
    email: 'sabbirrahmansr904@gmail.com',
    targetShare: 40,
    color: '#0284c7', // Sky Blue
    avatarBg: 'bg-sky-500',
    badge: 'CEO & Founder',
    photoURL: ''
  },
  {
    id: 'partner_2',
    name: 'Nasir Uddin',
    role: 'CEO & Operating Partner',
    phone: '+880 1766386293',
    email: 'nasiruddinovi2025@gmail.com',
    targetShare: 30,
    color: '#10b981', // Emerald Green
    avatarBg: 'bg-emerald-500',
    badge: 'Operating Partner',
    photoURL: ''
  },
  {
    id: 'partner_3',
    name: 'Shamiul Islam',
    role: 'CEO & Strategic Director',
    phone: '+880 1620138392',
    email: 'shamiulislamatik@gmail.com',
    targetShare: 30,
    color: '#8b5cf6', // Violet / Purple
    avatarBg: 'bg-purple-500',
    badge: 'Strategic Director',
    photoURL: ''
  }
];

const INVESTMENT_CATEGORIES = [
  'Initial Seed Capital (প্রাথমিক মূলধন)',
  'Working Capital (চলতি মূলধন)',
  'Inventory Purchase (পণ্য ও স্টক ক্রয়)',
  'Marketing & Ads Fund (বিজ্ঞাপন ও বুস্টিং ফান্ড)',
  'Office & Infrastructure (অফিস ও পরিকাঠামো)',
  'Emergency Fund (জরুরি ফান্ড)',
  'Server & Tech Operations (সার্ভার ও সফটওয়্যার)',
  'Capital Return (মূলধন ফেরত)',
  'Profit Payout (মুনাফা বা লাভ বণ্টন)',
  'Other Business Expense (অন্যান্য)'
];

const PAYMENT_METHODS = [
  'Cash (নগদ টাকা)',
  'Sonali Bank (সোনালী ব্যাংক)',
  'City Bank (সিটি ব্যাংক)',
  'bKash (বিকাশ)',
  'Nagad (নগদ)',
  'Bank Transfer (ব্যাংক ট্রান্সফার)',
  'Other / Personal Account (অন্যান্য)'
];

export default function AdminPartnership() {
  const { currentUser, isSabbirRahman } = useAuth();
  const { bankAccounts } = useFinance();
  const { logoUrl } = useBranding();

  // State
  const [partners, setPartners] = useState<PartnerProfile[]>(() => {
    const saved = localStorage.getItem('elegan_partners_profiles_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_3_PARTNERS;
      }
    }
    return DEFAULT_3_PARTNERS;
  });

  const [transactions, setTransactions] = useState<PartnerTransaction[]>(() => {
    const saved = localStorage.getItem('elegan_partner_transactions_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(true);
  const [isLiveSyncing, setIsLiveSyncing] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Filter & Search States
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // all, today, this_month, this_year
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManagePartnersModal, setShowManagePartnersModal] = useState(false);
  const [showPrintStatementModal, setShowPrintStatementModal] = useState(false);
  const [includeLedgerInPrint, setIncludeLedgerInPrint] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<PartnerTransaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Add/Edit Transaction
  const [formData, setFormData] = useState({
    partnerId: 'partner_1',
    type: 'investment' as 'investment' | 'withdrawal' | 'profit_share',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    paymentMethod: 'Bank Transfer (ব্যাংক ট্রান্সফার)',
    accountId: '',
    category: 'Working Capital (চলতি মূলধন)',
    reference: '',
    notes: ''
  });

  // Partner Management Form State
  const [partnerEditForm, setPartnerEditForm] = useState<PartnerProfile[]>(DEFAULT_3_PARTNERS);
  const [adminPhotos, setAdminPhotos] = useState<Record<string, string>>({});

  // Real-time Firestore Listeners
  useEffect(() => {
    // 1. Fetch / Sync Partner Profiles
    const unsubscribePartners = onSnapshot(collection(db, 'partners'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedPartners: PartnerProfile[] = [];
        snapshot.forEach((docSnap) => {
          loadedPartners.push({ id: docSnap.id, ...docSnap.data() } as PartnerProfile);
        });
        // Sort to preserve 3 partner order
        loadedPartners.sort((a, b) => (a.id > b.id ? 1 : -1));
        setPartners(loadedPartners);
        localStorage.setItem('elegan_partners_profiles_v1', JSON.stringify(loadedPartners));
      } else {
        // Initial bootstrap in firestore if empty
        DEFAULT_3_PARTNERS.forEach(async (p) => {
          try {
            await setDoc(doc(db, 'partners', p.id), p);
          } catch (err) {
            console.warn('Initial partner seed error:', err);
          }
        });
      }
    }, (error) => {
      console.error('Error fetching partners from firestore:', error);
    });

    // 2. Fetch / Sync Admin Profiles for live profile pictures
    const unsubscribeAdminProfiles = onSnapshot(collection(db, 'admin_profiles'), (snapshot) => {
      const photosMap: Record<string, string> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.email && data.photoURL) {
          photosMap[data.email.toLowerCase().trim()] = data.photoURL;
        }
        if (data.name && data.photoURL) {
          photosMap[data.name.toLowerCase().trim()] = data.photoURL;
        }
      });
      setAdminPhotos(photosMap);
    }, (error) => {
      console.error('Error fetching admin profiles for partnership photos:', error);
    });

    // 3. Fetch / Sync Partner Transactions in Real-time
    const q = query(collection(db, 'partner_investments'), orderBy('date', 'desc'));
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const txList: PartnerTransaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        txList.push({
          id: docSnap.id,
          partnerId: data.partnerId || 'partner_1',
          partnerName: data.partnerName || 'Unknown Partner',
          type: data.type || 'investment',
          amount: Number(data.amount) || 0,
          date: Number(data.date) || Date.now(),
          timeString: data.timeString || '',
          paymentMethod: data.paymentMethod || 'Cash',
          accountId: data.accountId || '',
          category: data.category || 'Working Capital',
          reference: data.reference || '',
          notes: data.notes || '',
          recordedBy: data.recordedBy || '',
          createdAt: Number(data.createdAt) || Date.now()
        });
      });

      setTransactions(txList);
      localStorage.setItem('elegan_partner_transactions_v1', JSON.stringify(txList));
      setLastSyncTime(new Date());
      setLoading(false);
      setIsLiveSyncing(true);
    }, (error) => {
      console.error('Real-time listener error for partner_investments:', error);
      setLoading(false);
    });

    return () => {
      unsubscribePartners();
      unsubscribeAdminProfiles();
      unsubscribeTransactions();
    };
  }, []);

  // Helper to resolve the correct photo URL for each partner
  const getPartnerAvatar = (partner?: PartnerProfile | null): string => {
    if (!partner) return '';
    if (partner.photoURL && typeof partner.photoURL === 'string' && partner.photoURL.trim().length > 5) {
      return partner.photoURL;
    }
    const emailKey = (partner.email || '').toLowerCase().trim();
    if (emailKey && adminPhotos[emailKey]) {
      return adminPhotos[emailKey];
    }
    const nameKey = (partner.name || '').toLowerCase().trim();
    if (nameKey && adminPhotos[nameKey]) {
      return adminPhotos[nameKey];
    }

    // Specific mapping for Sabbir Rahman, Nasir Uddin, Shamiul Islam
    if (nameKey.includes('sabbir') || emailKey.includes('sabbir')) {
      if (adminPhotos['sabbirrahmansr904@gmail.com']) return adminPhotos['sabbirrahmansr904@gmail.com'];
    }
    if (nameKey.includes('nasir') || emailKey.includes('nasir')) {
      if (adminPhotos['nasiruddinovi2025@gmail.com']) return adminPhotos['nasiruddinovi2025@gmail.com'];
    }
    if (nameKey.includes('shamiul') || emailKey.includes('shamiul')) {
      if (adminPhotos['shamiulislamatik@gmail.com']) return adminPhotos['shamiulislamatik@gmail.com'];
      if (adminPhotos['shamiul.atik@eleganbd.com']) return adminPhotos['shamiul.atik@eleganbd.com'];
    }

    // Check Local Storage elegan_admin_profiles
    try {
      const local = localStorage.getItem('elegan_admin_profiles');
      if (local) {
        const list = JSON.parse(local);
        const match = Array.isArray(list) ? list.find((item: any) => 
          (item.email && item.email.toLowerCase() === emailKey) ||
          (item.name && item.name.toLowerCase() === nameKey) ||
          (nameKey.includes('sabbir') && item.name?.toLowerCase().includes('sabbir')) ||
          (nameKey.includes('nasir') && item.name?.toLowerCase().includes('nasir')) ||
          (nameKey.includes('shamiul') && item.name?.toLowerCase().includes('shamiul'))
        ) : null;
        if (match?.photoURL) return match.photoURL;
      }
    } catch (e) {}

    // Check currently logged in user photo
    if (currentUser?.email && currentUser.email.toLowerCase() === emailKey && currentUser.photoURL) {
      return currentUser.photoURL;
    }

    return '';
  };

  // Compute Aggregates & Metrics
  const partnerStats = useMemo(() => {
    const stats: Record<string, {
      totalInvested: number;
      totalWithdrawn: number;
      totalProfitShare: number;
      netCapital: number;
      txCount: number;
      lastDate: number | null;
      lastTimeString: string | null;
    }> = {};

    partners.forEach(p => {
      stats[p.id] = {
        totalInvested: 0,
        totalWithdrawn: 0,
        totalProfitShare: 0,
        netCapital: 0,
        txCount: 0,
        lastDate: null,
        lastTimeString: null
      };
    });

    // Sort ascending to get proper latest
    const sortedTx = [...transactions].sort((a, b) => a.date - b.date);

    sortedTx.forEach(tx => {
      if (!stats[tx.partnerId]) {
        stats[tx.partnerId] = {
          totalInvested: 0,
          totalWithdrawn: 0,
          totalProfitShare: 0,
          netCapital: 0,
          txCount: 0,
          lastDate: null,
          lastTimeString: null
        };
      }

      stats[tx.partnerId].txCount += 1;
      stats[tx.partnerId].lastDate = tx.date;
      stats[tx.partnerId].lastTimeString = tx.timeString || new Date(tx.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      if (tx.type === 'investment') {
        stats[tx.partnerId].totalInvested += tx.amount;
        stats[tx.partnerId].netCapital += tx.amount;
      } else if (tx.type === 'withdrawal') {
        stats[tx.partnerId].totalWithdrawn += tx.amount;
        stats[tx.partnerId].netCapital -= tx.amount;
      } else if (tx.type === 'profit_share') {
        stats[tx.partnerId].totalProfitShare += tx.amount;
      }
    });

    return stats;
  }, [partners, transactions]);

  // Overall totals
  const overallTotals = useMemo(() => {
    let totalInvested = 0;
    let totalWithdrawn = 0;
    let totalProfitShare = 0;

    transactions.forEach(tx => {
      if (tx.type === 'investment') totalInvested += tx.amount;
      if (tx.type === 'withdrawal') totalWithdrawn += tx.amount;
      if (tx.type === 'profit_share') totalProfitShare += tx.amount;
    });

    const netActiveCapital = totalInvested - totalWithdrawn;

    return {
      totalInvested,
      totalWithdrawn,
      totalProfitShare,
      netActiveCapital,
      totalTxCount: transactions.length
    };
  }, [transactions]);

  // Equity Chart Data
  const chartData = useMemo(() => {
    return partners.map(p => {
      const pStat = partnerStats[p.id] || { netCapital: 0, totalInvested: 0 };
      const val = pStat.netCapital > 0 ? pStat.netCapital : (pStat.totalInvested > 0 ? pStat.totalInvested : 0);
      const totalPool = overallTotals.netActiveCapital > 0 ? overallTotals.netActiveCapital : overallTotals.totalInvested;
      const sharePct = totalPool > 0 ? ((val / totalPool) * 100).toFixed(1) : '0.0';

      return {
        name: p.name,
        role: p.role,
        value: val,
        percentage: sharePct,
        color: p.color
      };
    });
  }, [partners, partnerStats, overallTotals]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Partner filter
      if (selectedPartnerFilter !== 'all' && tx.partnerId !== selectedPartnerFilter) {
        return false;
      }

      // Type filter
      if (selectedTypeFilter !== 'all' && tx.type !== selectedTypeFilter) {
        return false;
      }

      // Date preset filter
      if (dateFilter !== 'all') {
        const txDate = new Date(tx.date);
        const now = new Date();
        if (dateFilter === 'today') {
          if (txDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'this_month') {
          if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'this_year') {
          if (txDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const partnerName = (tx.partnerName || '').toLowerCase();
        const category = (tx.category || '').toLowerCase();
        const notes = (tx.notes || '').toLowerCase();
        const reference = (tx.reference || '').toLowerCase();
        const paymentMethod = (tx.paymentMethod || '').toLowerCase();
        const amountStr = String(tx.amount);

        const match = partnerName.includes(q) ||
          category.includes(q) ||
          notes.includes(q) ||
          reference.includes(q) ||
          paymentMethod.includes(q) ||
          amountStr.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [transactions, selectedPartnerFilter, selectedTypeFilter, dateFilter, searchQuery]);

  // Quick Open Modal with pre-selected partner
  const handleOpenAddForPartner = (partnerId: string, type: 'investment' | 'withdrawal' = 'investment') => {
    setEditingTransaction(null);
    setFormData({
      partnerId,
      type,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      paymentMethod: 'Bank Transfer (ব্যাংক ট্রান্সফার)',
      accountId: '',
      category: type === 'investment' ? 'Working Capital (চলতি মূলধন)' : 'Capital Return (মূলধন ফেরত)',
      reference: '',
      notes: ''
    });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (tx: PartnerTransaction) => {
    setEditingTransaction(tx);
    const d = new Date(tx.date);
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = tx.timeString || d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    setFormData({
      partnerId: tx.partnerId,
      type: tx.type,
      amount: String(tx.amount),
      date: dateStr,
      time: timeStr,
      paymentMethod: tx.paymentMethod || 'Bank Transfer (ব্যাংক ট্রান্সফার)',
      accountId: tx.accountId || '',
      category: tx.category || 'Working Capital',
      reference: tx.reference || '',
      notes: tx.notes || ''
    });
    setShowAddModal(true);
  };

  // Save Transaction (Add or Edit)
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('অনুগ্রহ করে সঠিক টাকার পরিমাণ প্রদান করুন!');
      return;
    }

    const selectedPartner = partners.find(p => p.id === formData.partnerId);
    const partnerName = selectedPartner ? selectedPartner.name : 'Unknown Partner';

    // Parse date and time into timestamp
    let finalTimestamp = Date.now();
    try {
      if (formData.date && typeof formData.date === 'string' && formData.date.includes('-')) {
        const [year, month, day] = formData.date.split('-').map(Number);
        const tempDate = new Date(year, month - 1, day);
        finalTimestamp = tempDate.getTime();
      }
    } catch (err) {
      finalTimestamp = Date.now();
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(editingTransaction ? 'লেনদেন আপডেট করা হচ্ছে...' : 'নতুন বিনিয়োগ সেভ করা হচ্ছে...');

    try {
      const txPayload = {
        partnerId: formData.partnerId,
        partnerName: partnerName,
        type: formData.type,
        amount: numAmount,
        date: finalTimestamp,
        timeString: formData.time,
        paymentMethod: formData.paymentMethod,
        accountId: formData.accountId || '',
        category: formData.category,
        reference: formData.reference.trim(),
        notes: formData.notes.trim(),
        recordedBy: currentUser?.email || 'Admin',
        createdAt: editingTransaction ? editingTransaction.createdAt : Date.now()
      };

      if (editingTransaction) {
        await updateDoc(doc(db, 'partner_investments', editingTransaction.id), txPayload);
        toast.success('বিনিয়োগ রেকর্ড সফলভাবে আপডেট করা হয়েছে!', { id: loadingToast });
      } else {
        await addDoc(collection(db, 'partner_investments'), txPayload);
        toast.success('নতুন বিনিয়োগ রেকর্ড সফলভাবে যোগ করা হয়েছে!', { id: loadingToast });
      }

      setShowAddModal(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error saving partner transaction:', error);
      toast.error('রেকর্ড সেভ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    
    const loadingToast = toast.loading('রেকর্ড মুছে ফেলা হচ্ছে...');
    try {
      await deleteDoc(doc(db, 'partner_investments', id));
      toast.success('বিনিয়োগ রেকর্ড মুছে ফেলা হয়েছে!', { id: loadingToast });
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('ডিলিট করতে সমস্যা হয়েছে!', { id: loadingToast });
    }
  };

  // Avatar upload handler for partner settings
  const handlePartnerPhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('ছবি প্রসেস করা হচ্ছে...');
    try {
      const compressed = await compressAvatar(file);
      const updated = [...partnerEditForm];
      updated[index].photoURL = compressed;
      setPartnerEditForm(updated);
      toast.success('ছবি প্রস্তুত! সেভ বাটনে ক্লিক করুন।', { id: toastId });
    } catch (err) {
      console.error('Error uploading partner avatar:', err);
      toast.error('ছবি আপলোড ব্যর্থ হয়েছে!', { id: toastId });
    }
  };

  // Save Partner Profiles
  const handleSavePartnerProfiles = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    const loadingToast = toast.loading('পার্টনার প্রোফাইল সেভ করা হচ্ছে...');

    try {
      for (const p of partnerEditForm) {
        await setDoc(doc(db, 'partners', p.id), p, { merge: true });
      }
      setPartners(partnerEditForm);
      localStorage.setItem('elegan_partners_profiles_v1', JSON.stringify(partnerEditForm));
      toast.success('পার্টনার তথ্য সফলভাবে আপডেট হয়েছে!', { id: loadingToast });
      setShowManagePartnersModal(false);
    } catch (error) {
      console.error('Error saving partners:', error);
      toast.error('পার্টনার তথ্য সেভ করতে সমস্যা হয়েছে!', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('এক্সপোর্ট করার মতো কোনো ডাটা নেই!');
      return;
    }

    const headers = ['Date', 'Time', 'Partner', 'Type', 'Amount (BDT)', 'Payment Method', 'Category', 'Reference', 'Notes', 'Recorded By'];
    const rows = filteredTransactions.map(tx => {
      const d = new Date(tx.date);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = tx.timeString || d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const typeLabel = tx.type === 'investment' ? 'Investment (+)' : (tx.type === 'withdrawal' ? 'Withdrawal (-)' : 'Profit Share');
      return [
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${tx.partnerName}"`,
        `"${typeLabel}"`,
        tx.amount,
        `"${tx.paymentMethod}"`,
        `"${tx.category}"`,
        `"${tx.reference || ''}"`,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
        `"${tx.recordedBy || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `elegan_partnership_statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV স্টেটমেন্ট ডাউনলোড শুরু হয়েছে!');
  };

  // Helper format date & time
  const formatDateTime = (timestamp: number, timeStr?: string) => {
    const d = new Date(timestamp);
    const formattedDate = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const finalTime = timeStr || d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return { formattedDate, finalTime };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 text-slate-800">
      
      {/* Top Header Section */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Handshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  ৩ পার্টনারশিপ ও ইনভেস্টমেন্ট ট্র্যাকার
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real-time Live Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                ৩ জন পার্টনারের বিনিয়োগ, ক্যাপিটাল রেশিও, তারিখ ও সঠিক সময় রিয়েল-টাইম ট্র্যাকিং
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setPartnerEditForm([...partners]);
              setShowManagePartnersModal(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200"
          >
            <Users className="w-4 h-4 text-slate-600" />
            পার্টনার প্রোফাইল সেটিংস
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-200 shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-600" />
            CSV এক্সপোর্ট
          </button>

          <button
            onClick={() => setShowPrintStatementModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-200 shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            প্রিন্ট স্টেটমেন্ট
          </button>

          {true && (
<button
            onClick={() => handleOpenAddForPartner('partner_1', 'investment')}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all shadow-md shadow-emerald-200 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + নতুন বিনিয়োগ এন্ট্রি
          </button>
)}
        </div>
      </div>

      {/* Top Executive Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invested */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">সর্বমোট পার্টনার বিনিয়োগ</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatPrice(overallTotals.totalInvested)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>৩ জন পার্টনারের মোট মূলধন প্রদান</span>
            </div>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">মোট ক্যাপিটাল উত্তোলন / ফেরত</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatPrice(overallTotals.totalWithdrawn)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-600 font-semibold">
              <span>মূলধন প্রত্যাহার বা লভ্যাংশ সমন্বয়</span>
            </div>
          </div>
        </div>

        {/* Net Active Capital */}
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">বর্তমান কার্যকর মূলধন ফান্ড</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight">
              {formatPrice(overallTotals.netActiveCapital)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-700 font-semibold">
              <span>বিনিয়োগ থেকে উত্তোলন বাদে ব্যালেন্স</span>
            </div>
          </div>
        </div>

        {/* Total Transactions Count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">মোট ট্রানজেকশন লগ</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {overallTotals.totalTxCount} <span className="text-sm font-semibold text-slate-500">টি এন্ট্রি</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>সর্বশেষ আপডেট: {lastSyncTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Dedicated Partner Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {partners.map((partner, index) => {
          const stats = partnerStats[partner.id] || {
            totalInvested: 0,
            totalWithdrawn: 0,
            totalProfitShare: 0,
            netCapital: 0,
            txCount: 0,
            lastDate: null,
            lastTimeString: null
          };

          const totalPool = overallTotals.netActiveCapital > 0 ? overallTotals.netActiveCapital : overallTotals.totalInvested;
          const sharePercentage = totalPool > 0 && stats.netCapital > 0
            ? ((stats.netCapital / totalPool) * 100).toFixed(1)
            : '0.0';

          const { formattedDate: lastDateStr, finalTime: lastTimeStr } = stats.lastDate 
            ? formatDateTime(stats.lastDate, stats.lastTimeString || undefined) 
            : { formattedDate: 'এখনো লেনদেন হয়নি', finalTime: '' };

          return (
            <div 
              key={partner.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              style={{ borderTop: `4px solid ${partner.color}` }}
            >
              <div className="p-5 sm:p-6 space-y-4">
                {/* Partner Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {(() => {
                      const avatarSrc = getPartnerAvatar(partner);
                      return (
                        <div className="relative group/avatar shrink-0">
                          <div 
                            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm border-2 border-white ring-2 ring-slate-100/90 overflow-hidden bg-slate-900"
                            style={{ backgroundColor: avatarSrc ? '#0f172a' : partner.color }}
                          >
                            {avatarSrc ? (
                              <img 
                                src={avatarSrc} 
                                alt={partner.name || 'Partner'} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="tracking-wider">
                                {(partner.name || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || `P${index + 1}`}
                              </span>
                            )}
                          </div>
                          {/* Active Partner Indicator */}
                          <span 
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" 
                            title="Active Partner Account" 
                          />
                        </div>
                      );
                    })()}

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 leading-tight">
                          {partner.name}
                        </h3>
                        {index === 0 && (
                          <span className="p-1 rounded-md bg-amber-50 text-amber-600 shadow-2xs" title="CEO & Founder">
                            <Crown className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 mt-1">
                        {partner.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Capital Amount */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>মোট বিনিয়োগ (Total Invested)</span>
                    <span className="font-bold text-slate-900">{formatPrice(stats.totalInvested)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>উত্তোলন বা সমন্বয় (Withdrawn)</span>
                    <span className="font-bold text-amber-700">-{formatPrice(stats.totalWithdrawn)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">বর্তমান নেট ব্যালেন্স</span>
                    <span className="text-lg font-black tracking-tight text-slate-900" style={{ color: partner.color }}>
                      {formatPrice(stats.netCapital)}
                    </span>
                  </div>

                  {/* Visual Share Bar */}
                  <div className="pt-1">
                    <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, Math.max(0, parseFloat(sharePercentage)))}%`,
                          backgroundColor: partner.color 
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Timing & Transactions metadata */}
                <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      সর্বশেষ লেনদেনের সময়:
                    </span>
                    <span className="font-semibold text-slate-700 text-right">
                      {lastDateStr} {lastTimeStr ? `• ${lastTimeStr}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      মোট লেনদেন সংখ্যা:
                    </span>
                    <span className="font-semibold text-slate-700">
                      {stats.txCount} টি এন্ট্রি
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Quick Actions */}
              {true && (
<div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => handleOpenAddForPartner(partner.id, 'investment')}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 border border-emerald-200/60 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ইনভেস্ট জমা
                </button>

                <button
                  onClick={() => handleOpenAddForPartner(partner.id, 'withdrawal')}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 border border-amber-200/60 shadow-2xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                  উত্তোলন
                </button>
              </div>
)}
            </div>
          );
        })}
      </div>

      {/* Middle Section: Equity Ratio Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Equity Breakdown Pie Chart */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">ইক্যুইটি শেয়ার ডিস্ট্রিবিউশন</h3>
              <p className="text-xs text-slate-500">৩ পার্টনারের মূলধন রেশিও শতাংশ</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <PieChartIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="h-64 flex items-center justify-center relative">
            {overallTotals.totalInvested > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => [`${formatPrice(val)}`, 'মূলধন']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                এখনো কোনো বিনিয়োগ এন্ট্রি নেই
              </div>
            )}

            {overallTotals.netActiveCapital > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-semibold uppercase">নেট ফান্ড</span>
                <span className="text-sm font-black text-slate-800">{formatPrice(overallTotals.netActiveCapital)}</span>
              </div>
            )}
          </div>

          {/* Chart Legends */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-700 truncate max-w-[150px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{formatPrice(item.value)}</span>
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Profile Summary & Transparency Guide */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">পার্টনারশিপ মূলধন ও লেনদেন নীতিমালা</h3>
              <p className="text-xs text-slate-500">৩ পার্টনারের হিসাবের স্বচ্ছতা ও নিয়মাবলী</p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
              ৩ পার্টনার অফিসিয়াল একাউন্ট
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {partners.map((p) => {
              const stats = partnerStats[p.id] || { netCapital: 0, totalInvested: 0 };
              return (
                <div key={p.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="font-bold text-xs text-slate-800 truncate">{p.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <p><span className="font-medium text-slate-600">পদবি:</span> {p.role}</p>
                    <p><span className="font-medium text-slate-600">ফোন:</span> {p.phone || 'N/A'}</p>
                    <p><span className="font-medium text-slate-600">লক্ষ্য রেশিও:</span> {p.targetShare}%</p>
                  </div>
                  <div className="pt-1 border-t border-slate-200/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500">মোট জমা:</span>
                    <span className="font-bold text-slate-900">{formatPrice(stats.totalInvested)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              <span className="font-bold">রিয়েল-টাইম সিঙ্ক সতর্কতা:</span> যেকোনো পার্টনার টাকা বিনিয়োগ করলে বা মূলধন ফেরত নিলে সাথে সাথে এন্ট্রি করুন। এতে প্রত্যেকের সঠিক তারিখ ও সময় (Exact Date & Time) এবং সঠিক পার্সেন্টেজ রিয়েল-টাইমে আপডেট থাকবে।
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Partner Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">পার্টনার:</span>
            <button
              onClick={() => setSelectedPartnerFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedPartnerFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল পার্টনার ({transactions.length})
            </button>
            {partners.map(p => {
              const count = transactions.filter(t => t.partnerId === p.id).length;
              const isSelected = selectedPartnerFilter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPartnerFilter(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={{ backgroundColor: isSelected ? p.color : undefined }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : p.color }} />
                  {(p.name || '').split(' ')[0] || p.id} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="সার্চ (নোট, TrxID, ক্যাটাগরি)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filters: Type & Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-500">লেনদেনের ধরন:</span>
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold ${selectedTypeFilter === 'all' ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              সবগুলো
            </button>
            <button
              onClick={() => setSelectedTypeFilter('investment')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${selectedTypeFilter === 'investment' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              শুধু বিনিয়োগ (+)
            </button>
            <button
              onClick={() => setSelectedTypeFilter('withdrawal')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${selectedTypeFilter === 'withdrawal' ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Minus className="w-3 h-3 text-amber-600" />
              শুধু উত্তোলন (-)
            </button>
            <button
              onClick={() => setSelectedTypeFilter('profit_share')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${selectedTypeFilter === 'profit_share' ? 'bg-indigo-100 text-indigo-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              মুনাফা বণ্টন
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">সময়সীমা:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700 font-medium"
            >
              <option value="all">সর্বদা (All Time)</option>
              <option value="today">আজ (Today)</option>
              <option value="this_month">এই মাস (This Month)</option>
              <option value="this_year">এই বছর (This Year)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Real-time Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              সর্বশেষ বিনিয়োগ ও লেনদেন লগ
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              {filteredTransactions.length} টি রেকর্ড
            </span>
          </div>

          <div className="text-xs text-slate-400">
            রিয়েল-টাইম অটো সেভ ও সিঙ্ক
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200/60">
              <tr>
                <th className="py-3.5 px-4 sm:px-5">তারিখ ও সময়</th>
                <th className="py-3.5 px-4">পার্টনার</th>
                <th className="py-3.5 px-4">ধরন</th>
                <th className="py-3.5 px-4 text-right">টাকার পরিমাণ</th>
                <th className="py-3.5 px-4">পেমেন্ট মাধ্যম</th>
                <th className="py-3.5 px-4">খাত / ক্যাটাগরি</th>
                <th className="py-3.5 px-4">রেফারেন্স ও নোট</th>
                <th className="py-3.5 px-4 text-right">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const partner = partners.find(p => p.id === tx.partnerId);
                  const { formattedDate, finalTime } = formatDateTime(tx.date, tx.timeString);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date & Exact Time */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formattedDate}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{finalTime}</span>
                        </div>
                      </td>

                      {/* Partner */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {(() => {
                            const avatarSrc = partner ? getPartnerAvatar(partner) : '';
                            return (
                              <div 
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden shadow-2xs border border-white"
                                style={{ backgroundColor: avatarSrc ? '#0f172a' : (partner?.color || '#0284c7') }}
                              >
                                {avatarSrc ? (
                                  <img 
                                    src={avatarSrc} 
                                    alt={tx.partnerName || 'Partner'} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer" 
                                  />
                                ) : (
                                  <span>
                                    {(tx.partnerName || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'P'}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          <div>
                            <div className="font-bold text-slate-900">{tx.partnerName}</div>
                            <div className="text-[11px] text-slate-400">{partner?.role || 'Partner'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.type === 'investment' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <Plus className="w-3 h-3 text-emerald-600" />
                            বিনিয়োগ (Inflow)
                          </span>
                        )}
                        {tx.type === 'withdrawal' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            <Minus className="w-3 h-3 text-amber-600" />
                            উত্তোলন (Refund)
                          </span>
                        )}
                        {tx.type === 'profit_share' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            মুনাফা বণ্টন
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`font-black text-sm sm:text-base ${
                          tx.type === 'investment' ? 'text-emerald-700' : (tx.type === 'withdrawal' ? 'text-amber-700' : 'text-indigo-700')
                        }`}>
                          {tx.type === 'investment' ? '+' : (tx.type === 'withdrawal' ? '-' : '')}
                          {formatPrice(tx.amount)}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Wallet className="w-3 h-3 text-slate-500" />
                          {tx.paymentMethod}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-slate-600 font-medium">
                          {tx.category}
                        </span>
                      </td>

                      {/* Reference & Notes */}
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        {tx.reference && (
                          <div className="text-[11px] font-mono text-slate-500">
                            Ref: <span className="font-semibold text-slate-700">{tx.reference}</span>
                          </div>
                        )}
                        <div className="text-xs text-slate-600 truncate" title={tx.notes}>
                          {tx.notes || '—'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="এডিট করুন"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(tx.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="ডিলিট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Handshake className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">কোনো বিনিয়োগ রেকর্ড পাওয়া যায়নি</p>
                      <p className="text-xs text-slate-400">নতুন বিনিয়োগ যুক্ত করতে উপরের "+ নতুন বিনিয়োগ এন্ট্রি" বাটনে ক্লিক করুন</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add / Edit Transaction */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  {formData.type === 'investment' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingTransaction ? 'বিনিয়োগ এন্ট্রি এডিট' : (formData.type === 'investment' ? 'নতুন পার্টনার বিনিয়োগ এন্ট্রি' : 'ক্যাপিটাল / লভ্যাংশ উত্তোলন')}
                  </h3>
                  <p className="text-xs text-slate-500">রিয়েল-টাইমে ডাটাবেসে সেভ হবে</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              {/* Partner Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  পার্টনার নির্বাচন করুন *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {partners.map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setFormData({ ...formData, partnerId: p.id })}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all flex flex-col justify-between ${
                        formData.partnerId === p.id
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{(p.name || '').split(' ')[0] || p.id}</span>
                      <span className={`text-[10px] truncate ${formData.partnerId === p.id ? 'text-slate-300' : 'text-slate-400'}`}>
                        {(p.role || '').split('&')[0] || 'Partner'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  লেনদেনের ধরন (Transaction Type) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'investment', category: 'Working Capital (চলতি মূলধন)' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all ${
                      formData.type === 'investment'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    + মূলধন বিনিয়োগ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'withdrawal', category: 'Capital Return (মূলধন ফেরত)' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all ${
                      formData.type === 'withdrawal'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    - মূলধন উত্তোলন
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'profit_share', category: 'Profit Payout (মুনাফা বা লাভ বণ্টন)' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all ${
                      formData.type === 'profit_share'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ★ মুনাফা গ্রহণ
                  </button>
                </div>
              </div>

              {/* Amount with preset pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  টাকার পরিমাণ (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="যেমন: 50000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-900"
                  />
                </div>

                {/* Quick amount chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">কুইক অ্যামাউন্ট:</span>
                  {[10000, 50000, 100000, 200000, 500000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: String(amt) })}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                    >
                      +৳{amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}K`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Exact Time Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    তারিখ (Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সঠিক সময় (Time) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="04:30 PM"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Payment Method & Bank Account Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    পেমেন্ট মাধ্যম (Payment Method) *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-400 font-medium text-slate-800"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    খাত / ক্যাটাগরি (Category) *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-400 font-medium text-slate-800"
                  >
                    {INVESTMENT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference / TrxID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  রেফারেন্স / ট্রানজেকশন আইডি (TrxID / Cheque #)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: TrxID: BK9284928 বা চেক নং"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নোট বা বিবরণ (Notes / Purpose)
                </label>
                <textarea
                  rows={2}
                  placeholder="বিনিয়োগের উদ্দেশ্য বা বিস্তারিত মন্তব্য..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'সেভ হচ্ছে...' : (editingTransaction ? 'আপডেট সম্পন্ন করুন' : 'বিনিয়োগ রেকর্ড সেভ করুন')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Manage 3 Partner Profiles */}
      {showManagePartnersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">৩ পার্টনার প্রোফাইল ও শেয়ার সেটিংস</h3>
                  <p className="text-xs text-slate-500">পার্টনারদের নাম, পদবি ও চুক্তিভিত্তিক শেয়ার অনুপাত</p>
                </div>
              </div>
              <button 
                onClick={() => setShowManagePartnersModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartnerProfiles} className="space-y-4">
              {partnerEditForm.map((p, index) => {
                const currentAvatar = p.photoURL || getPartnerAvatar(p);
                return (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        পার্টনার #{index + 1} ({p.id})
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {p.badge}
                      </span>
                    </div>

                    {/* Avatar preview and direct upload */}
                    <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200/80">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg overflow-hidden shrink-0 border-2 border-white shadow-sm ring-2 ring-slate-100"
                        style={{ backgroundColor: currentAvatar ? '#0f172a' : p.color }}
                      >
                        {currentAvatar ? (
                          <img 
                            src={currentAvatar} 
                            alt={p.name || 'Partner'} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <span>{(p.name || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'P'}</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>ছবি আপলোড করুন</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePartnerPhotoUpload(index, e)} 
                            />
                          </label>

                          {p.photoURL && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...partnerEditForm];
                                updated[index].photoURL = '';
                                setPartnerEditForm(updated);
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold border border-rose-200 transition-all"
                            >
                              রিমুভ
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          জেপিজি বা পিএনজি ছবি সিলেক্ট করুন (অটোমেটিক অপ্টিমাইজড হবে)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">পূর্ণ নাম *</label>
                        <input
                          type="text"
                          required
                          value={p.name}
                          onChange={(e) => {
                            const updated = [...partnerEditForm];
                            updated[index].name = e.target.value;
                            setPartnerEditForm(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-semibold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">পদবি / রোল *</label>
                        <input
                          type="text"
                          required
                          value={p.role}
                          onChange={(e) => {
                            const updated = [...partnerEditForm];
                            updated[index].role = e.target.value;
                            setPartnerEditForm(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">ফোন নম্বর</label>
                        <input
                          type="text"
                          value={p.phone}
                          onChange={(e) => {
                            const updated = [...partnerEditForm];
                            updated[index].phone = e.target.value;
                            setPartnerEditForm(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">টার্গেট শেয়ার % (Target Share)</label>
                        <input
                          type="number"
                          value={p.targetShare}
                          onChange={(e) => {
                            const updated = [...partnerEditForm];
                            updated[index].targetShare = parseFloat(e.target.value) || 0;
                            setPartnerEditForm(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManagePartnersModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'সেভ হচ্ছে...' : 'পার্টনার সেটিংস সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: A4 Print Statement Modal */}
      {showPrintStatementModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 font-sans">
          
          {/* Top Control Bar (Screen Only - No Print) */}
          <div className="no-print w-full max-w-[210mm] bg-white/95 backdrop-blur-md rounded-2xl p-4 mb-4 shadow-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-2 z-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
                <Printer size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">A4 Partnership Capital Statement</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  A4 পেপারে প্রিন্ট বা PDF ডাউনলোড করার জন্য প্রস্তুত
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-end w-full sm:w-auto">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer select-none hover:bg-slate-200 transition-all">
                <input 
                  type="checkbox" 
                  checked={includeLedgerInPrint} 
                  onChange={(e) => setIncludeLedgerInPrint(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>লেনদেন হিস্ট্রি যুক্ত করুন</span>
              </label>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>A4 প্রিন্ট / Save PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintStatementModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dynamic Print CSS Injection for A4 Paper */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 10mm 8mm 10mm;
              }
              body * {
                visibility: hidden !important;
              }
              #partnership-print-sheet, #partnership-print-sheet * {
                visibility: visible !important;
              }
              #partnership-print-sheet {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: 100% !important;
                margin: 0 !important;
                padding: 4mm 6mm !important;
                box-shadow: none !important;
                border: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          {/* The Exact A4 Document Sheet (Screen Preview & Print Target) */}
          <div 
            id="partnership-print-sheet" 
            className="printable-sheet w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl border border-slate-200 rounded-lg box-border flex flex-col justify-between space-y-6"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {/* Top Accent Strip */}
            <div className="space-y-6">
              
              {/* Document Header with Brand Logo & Metadata */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 p-2 flex items-center justify-center shrink-0 border border-slate-200">
                    <img 
                      src={logoUrl || '/logo.png'} 
                      alt="Elegan BD" 
                      className="w-full h-full object-contain filter invert"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">ELEGAN BD LIMITED</h1>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-900 text-white tracking-wider">
                        Official Record
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      PARTNERSHIP CAPITAL & EQUITY STATEMENT • ৩ পার্টনারের মূলধন স্টেটমেন্ট
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Corporate Office: House #12, Sector #11, Uttara, Dhaka | eleganbd.ltd@gmail.com | +880 1766-386293
                    </p>
                  </div>
                </div>

                {/* Statement Reference Box */}
                <div className="text-right space-y-1 shrink-0 bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 min-w-[170px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Document Ref</div>
                  <div className="text-xs font-black text-slate-900 font-mono">
                    EBD-CAP-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-600 font-medium">
                    তারিখ: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 size={10} /> Verified & Audited
                  </div>
                </div>
              </div>

              {/* 3 Executive High-Contrast Highlight Metric Boxes */}
              <div className="grid grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-center space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-center gap-1">
                    <ArrowUpRight size={13} className="text-emerald-600" />
                    <span>মোট মূলধন বিনিয়োগ</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                    {formatPrice(overallTotals.totalInvested)}
                  </div>
                  <div className="text-[9px] text-emerald-700/80 font-medium">
                    ৩ জন পার্টনারের সর্বমোট মূলধন ডিপোজিট
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-center space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-center gap-1">
                    <ArrowDownRight size={13} className="text-amber-600" />
                    <span>মোট মূলধন উত্তোলন</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
                    {formatPrice(overallTotals.totalWithdrawn)}
                  </div>
                  <div className="text-[9px] text-amber-700/80 font-medium">
                    পার্টনারদের মোট উত্তোলন / ড্রয়িংস
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-center space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center justify-center gap-1">
                    <Wallet size={13} className="text-indigo-600" />
                    <span>বর্তমান কার্যকর মূলধন</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight">
                    {formatPrice(overallTotals.netActiveCapital)}
                  </div>
                  <div className="text-[9px] text-indigo-700/80 font-medium">
                    চলতি সক্রিয় মূলধন ব্যালেন্স
                  </div>
                </div>
              </div>

              {/* Partner-Wise Detailed Equity & Capital Matrix Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-600" />
                    <span>পার্টনারভিত্তিক মূলধন ও ইকুইটি শেয়ার বিবরণী</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    
                  </span>
                </div>

                <table className="w-full text-xs text-left border-collapse border border-slate-300 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[11px]">
                      <th className="p-2.5 border border-slate-700 text-center w-8">#</th>
                      <th className="p-2.5 border border-slate-700">পার্টনারের নাম ও পদবি</th>
                      <th className="p-2.5 border border-slate-700 text-center">টার্গেট শেয়ার</th>
                      <th className="p-2.5 border border-slate-700 text-right">মোট বিনিয়োগ</th>
                      <th className="p-2.5 border border-slate-700 text-right">মোট উত্তোলন</th>
                      <th className="p-2.5 border border-slate-700 text-right">নেট মূলধন ব্যালেন্স</th>
                      <th className="p-2.5 border border-slate-700 text-center">বর্তমান শেয়ার %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {partners.map((p, idx) => {
                      const stats = partnerStats[p.id] || { totalInvested: 0, totalWithdrawn: 0, netCapital: 0 };
                      const actualShare = overallTotals.netActiveCapital > 0 
                        ? ((stats.netCapital / overallTotals.netActiveCapital) * 100).toFixed(1) 
                        : p.targetShare.toFixed(1);
                      const avatarSrc = getPartnerAvatar(p);

                      return (
                        <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                          <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 border border-slate-200">
                            <div className="flex items-center gap-2.5">
                              <div 
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0 overflow-hidden border border-slate-200 shadow-2xs"
                                style={{ backgroundColor: avatarSrc ? '#0f172a' : p.color }}
                              >
                                {avatarSrc ? (
                                  <img 
                                    src={avatarSrc} 
                                    alt={p.name} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span>{(p.name || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'P'}</span>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  {p.id === 'partner_1' && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                      Main
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500">{p.role} • {p.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-700">
                            {p.targetShare}%
                          </td>
                          <td className="p-2.5 border border-slate-200 text-right font-bold text-emerald-700">
                            {formatPrice(stats.totalInvested)}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-right font-bold text-amber-700">
                            -{formatPrice(stats.totalWithdrawn)}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-right font-black text-slate-900 text-[13px]">
                            {formatPrice(stats.netCapital)}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-white">
                              {actualShare}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Table Summary Total Row */}
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={2} className="p-2.5 border border-slate-300 text-right uppercase tracking-wider text-[11px]">
                        সর্বমোট সামারি (Total Grand Summary):
                      </td>
                      <td className="p-2.5 border border-slate-300 text-center">100%</td>
                      <td className="p-2.5 border border-slate-300 text-right text-emerald-800">
                        {formatPrice(overallTotals.totalInvested)}
                      </td>
                      <td className="p-2.5 border border-slate-300 text-right text-amber-800">
                        -{formatPrice(overallTotals.totalWithdrawn)}
                      </td>
                      <td className="p-2.5 border border-slate-300 text-right text-indigo-900 text-[13px]">
                        {formatPrice(overallTotals.netActiveCapital)}
                      </td>
                      <td className="p-2.5 border border-slate-300 text-center">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Optional Recent Transactions Ledger on A4 */}
              {includeLedgerInPrint && transactions.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-600" />
                      <span>সর্বশেষ মূলধন লেনদেন ও ডিপোজিট হিস্ট্রি (Recent Capital Movements)</span>
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      মোট রেকর্ড: {transactions.length} টি
                    </span>
                  </div>

                  <table className="w-full text-[11px] text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-200/90 text-slate-800 font-bold text-[10px]">
                        <th className="p-1.5 border border-slate-300 text-center w-8">#</th>
                        <th className="p-1.5 border border-slate-300">তারিখ ও সময়</th>
                        <th className="p-1.5 border border-slate-300">পার্টনারের নাম</th>
                        <th className="p-1.5 border border-slate-300">ধরণ</th>
                        <th className="p-1.5 border border-slate-300">পদ্ধতি ও ক্যাটাগরি</th>
                        <th className="p-1.5 border border-slate-300 text-right">পরিমাণ (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {transactions.slice(0, 8).map((tx, idx) => (
                        <tr key={tx.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="p-1.5 border border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="p-1.5 border border-slate-200 text-slate-700 whitespace-nowrap text-[10px]">
                            {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {tx.timeString || ''}
                          </td>
                          <td className="p-1.5 border border-slate-200 font-bold text-slate-900">
                            {tx.partnerName}
                          </td>
                          <td className="p-1.5 border border-slate-200">
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              tx.type === 'investment' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {tx.type === 'investment' ? 'মূলধন ডিপোজিট' : 'উত্তোলন'}
                            </span>
                          </td>
                          <td className="p-1.5 border border-slate-200 text-slate-600 text-[10px]">
                            {tx.paymentMethod} {tx.note ? `• ${tx.note}` : ''}
                          </td>
                          <td className={`p-1.5 border border-slate-200 text-right font-black ${
                            tx.type === 'investment' ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {tx.type === 'investment' ? '+' : '-'}{formatPrice(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Official Declaration Note */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900">অফিশিয়াল ঘোষণা ও বিবরণ: </span>
                এই স্টেটমেন্টটি Elegan BD Limited-এর কেন্দ্রীয় ডিজিটাল অ্যাকাউন্টস লেজার থেকে সরাসরি প্রস্তুতকৃত। ৩ জন ম্যানেজিং পার্টনারের পারস্পরিক চুক্তি ও সিদ্ধান্ত অনুসারে প্রতিটি মূলধন ডিপোজিট এবং বর্তমান শেয়ার অংশীদারিত্ব নিরীক্ষিত ও চূড়ান্ত বলে গণ্য হবে।
              </div>
            </div>

            {/* Official 3 Partners Authorization & Signature Block (3 Columns Side by Side) */}
            <div className="pt-6 border-t-2 border-slate-900 mt-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                
                {/* Partner 1 Signature */}
                <div className="space-y-1.5">
                  <div className="h-12 flex items-end justify-center">
                    <div className="border-b-2 border-dashed border-slate-400 w-40" />
                  </div>
                  <div className="font-black text-slate-900 text-xs">Sabbir Rahman</div>
                  <div className="text-[10px] font-bold text-slate-600">Founder & CEO</div>
                  <div className="text-[9px] text-slate-400 pt-1">তারিখ: __________________</div>
                </div>

                {/* Partner 2 Signature */}
                <div className="space-y-1.5">
                  <div className="h-12 flex items-end justify-center">
                    <div className="border-b-2 border-dashed border-slate-400 w-40" />
                  </div>
                  <div className="font-black text-slate-900 text-xs">Nasir Uddin</div>
                  <div className="text-[10px] font-bold text-slate-600">Operating Partner & CEO</div>
                  <div className="text-[9px] text-slate-400 pt-1">তারিখ: __________________</div>
                </div>

                {/* Partner 3 Signature */}
                <div className="space-y-1.5">
                  <div className="h-12 flex items-end justify-center">
                    <div className="border-b-2 border-dashed border-slate-400 w-40" />
                  </div>
                  <div className="font-black text-slate-900 text-xs">Shamiul Islam</div>
                  <div className="text-[10px] font-bold text-slate-600">Strategic Director & CEO</div>
                  <div className="text-[9px] text-slate-400 pt-1">তারিখ: __________________</div>
                </div>
              </div>

              {/* Bottom Footer Watermark */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium pt-5 border-t border-slate-100 mt-4">
                <span>ELEGAN BD LIMITED • CENTRAL PARTNERSHIP LEDGER</span>
                <span>SYSTEM GENERATED DOCUMENT • STRICTLY CONFIDENTIAL</span>
                <span>PAGE 1 OF 1 (A4 PORTRAIT)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">আপনি কি নিশ্চিত?</h3>
              <p className="text-xs text-slate-500">এই বিনিয়োগ এন্ট্রিটি চিরতরে মুছে ফেলা হবে এবং পার্টনার মূলধন সামারিতে পরিবর্তন আসবে।</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                বাতিল
              </button>
              <button
                onClick={() => handleDeleteTransaction(deleteConfirmId)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200"
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
