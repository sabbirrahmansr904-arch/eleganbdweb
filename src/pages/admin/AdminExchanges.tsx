/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  RefreshCw, 
  Search, 
  Calendar, 
  Download, 
  Edit, 
  MessageSquare, 
  Eye, 
  Printer, 
  Clock, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  AlertTriangle,
  DollarSign,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { handleFirestoreError, OperationType, isQuotaError } from '../../lib/firestoreUtils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ExchangeItem {
  name: string;
  size: string;
  quantity: number;
  price: number;
}

interface Exchange {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  phone: string;
  returnedItems: ExchangeItem[];
  sentItems: ExchangeItem[];
  netBalance: number;
  status: 'PENDING' | 'PRINTED' | 'COMPLETED';
  issueActive: boolean;
  notes: string;
  createdAt: string;
}

export default function AdminExchanges() {
  const { isAdmin } = useAuth();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL STATUSES');
  const [issueFilter, setIssueFilter] = useState('ALL ISSUES');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const [activeExchange, setActiveExchange] = useState<Exchange | null>(null);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId) {
      setFormOrderId(orderId);
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  // Form states
  const [formOrderId, setFormOrderId] = useState('');
  const [formExchangeId, setFormExchangeId] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formReturnedItems, setFormReturnedItems] = useState<ExchangeItem[]>([{ name: '', size: '', quantity: 1, price: 0 }]);
  const [formSentItems, setFormSentItems] = useState<ExchangeItem[]>([{ name: '', size: '', quantity: 1, price: 0 }]);
  const [formStatus, setFormStatus] = useState<'PENDING' | 'PRINTED' | 'COMPLETED'>('PENDING');
  const [formIssueActive, setFormIssueActive] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  // Initial Seed Data to match screenshot exactly if database is empty
  const seedExchanges = async () => {
    const mockExchanges: Exchange[] = [
      {
        id: '07200007',
        orderId: '2607130005',
        customerId: 'CUST-001',
        customerName: 'MIRZA AFSIN',
        phone: '01712345678',
        returnedItems: [{ name: 'Tylo 508', size: '5XL', quantity: 1, price: 1000 }],
        sentItems: [{ name: 'Tylo 510', size: '5XL', quantity: 1, price: 1000 }],
        netBalance: 0,
        status: 'PENDING',
        issueActive: false,
        notes: 'Size mismatch replacement.',
        createdAt: '2026-07-20T19:55:00Z'
      },
      {
        id: '07200006',
        orderId: '2607160027',
        customerId: 'CUST-002',
        customerName: 'a k m nasif eftekher',
        phone: '01900112233',
        returnedItems: [{ name: 'CB 302', size: '6XL', quantity: 1, price: 1000 }],
        sentItems: [{ name: 'Cargo 3', size: '56', quantity: 1, price: 1210 }],
        netBalance: 210,
        status: 'PENDING',
        issueActive: false,
        notes: 'Returned item value less than replacement.',
        createdAt: '2026-07-20T19:26:00Z'
      },
      {
        id: '07200005',
        orderId: '2607170017',
        customerId: 'CUST-003',
        customerName: 'Dr shoyeb',
        phone: '01833445566',
        returnedItems: [{ name: 'EP 5', size: '46', quantity: 1, price: 1000 }],
        sentItems: [{ name: 'EP 7', size: '46', quantity: 1, price: 1060 }],
        netBalance: 60,
        status: 'PENDING',
        issueActive: false,
        notes: 'Small adjustment paid via cash.',
        createdAt: '2026-07-20T19:04:00Z'
      },
      {
        id: '07200004',
        orderId: '2607100029',
        customerId: 'CUST-004',
        customerName: 'Rifat',
        phone: '01566778899',
        returnedItems: [{ name: 'BLACK P', size: '44', quantity: 2, price: 2000 }],
        sentItems: [
          { name: 'BLACK P', size: '48', quantity: 1, price: 1000 },
          { name: 'OFF WHITE P', size: '48', quantity: 1, price: 1130 }
        ],
        netBalance: 130,
        status: 'PRINTED',
        issueActive: true,
        notes: 'Customer owes remaining amount.',
        createdAt: '2026-07-20T15:46:00Z'
      },
      {
        id: '07200003',
        orderId: '2607190011',
        customerId: 'CUST-005',
        customerName: 'SAGOR',
        phone: '01611223344',
        returnedItems: [{ name: 'CB 302', size: '2XL', quantity: 1, price: 699 }],
        sentItems: [],
        netBalance: -699,
        status: 'COMPLETED',
        issueActive: false,
        notes: 'Refund pending approval.',
        createdAt: '2026-07-20T15:11:00Z'
      },
      {
        id: '07200002',
        orderId: '2607160017',
        customerId: 'CUST-006',
        customerName: 'তালুকদার বাবু',
        phone: '01799887766',
        returnedItems: [{ name: 'ES 110', size: '2XL', quantity: 1, price: 969 }],
        sentItems: [],
        netBalance: -969,
        status: 'COMPLETED',
        issueActive: false,
        notes: 'Cash refund completed.',
        createdAt: '2026-07-20T14:40:00Z'
      }
    ];

    for (const ex of mockExchanges) {
      await setDoc(doc(db, 'exchanges', ex.id), ex);
    }
  };

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'exchanges'), (snapshot) => {
      const list: Exchange[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data() } as Exchange);
      });

      // Sort by exchange ID descending
      list.sort((a, b) => b.id.localeCompare(a.id));

      setExchanges(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'exchanges');
      if (!isQuotaError(error)) {
        toast.error('Failed to load exchanges.');
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Filter logic
  const filteredExchanges = exchanges.filter((ex) => {
    // Search filter
    const matchesSearch = 
      ex.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.phone.includes(searchTerm);

    // Status filter
    const matchesStatus = 
      statusFilter === 'ALL STATUSES' || 
      ex.status === statusFilter;

    // Issue filter
    const matchesIssue = 
      issueFilter === 'ALL ISSUES' || 
      (issueFilter === 'ISSUE ACTIVE' && ex.issueActive) ||
      (issueFilter === 'NO ISSUES' && !ex.issueActive);

    // Date range filter
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(ex.createdAt) >= new Date(startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(ex.createdAt) <= endOfDay;
    }

    return matchesSearch && matchesStatus && matchesIssue && matchesDate;
  });

  // Calculate Balance Helpers
  const calculateItemsSum = (items: ExchangeItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Status Change directly on row
  const handleStatusChange = async (id: string, newStatus: 'PENDING' | 'PRINTED' | 'COMPLETED') => {
    try {
      await updateDoc(doc(db, 'exchanges', id), { status: newStatus });
      toast.success(`Exchange status updated to ${newStatus}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update status.');
    }
  };

  // Reset/re-sync Completed Exchange
  const handleResetExchange = async (id: string) => {
    try {
      await updateDoc(doc(db, 'exchanges', id), { status: 'PENDING' });
      toast.success('Exchange reset to PENDING');
    } catch (e) {
      console.error(e);
      toast.error('Failed to reset exchange.');
    }
  };

  // Toggle Issue Active directly
  const handleToggleIssue = async (ex: Exchange) => {
    try {
      await updateDoc(doc(db, 'exchanges', ex.id), { issueActive: !ex.issueActive });
      toast.success(ex.issueActive ? 'Issue marked as resolved' : 'Issue flagged as ACTIVE');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update issue status.');
    }
  };

  // Select Row Helpers
  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredExchanges.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExchanges.map((ex) => ex.id));
    }
  };

  // Create Exchange Action
  const handleOpenCreateModal = () => {
    // Generate simple next ID
    const maxId = exchanges.reduce((max, ex) => Math.max(max, parseInt(ex.id) || 0), 7200001);
    setFormExchangeId(String(maxId + 1));
    setFormOrderId('');
    setFormCustomerName('');
    setFormPhone('');
    setFormReturnedItems([{ name: '', size: '', quantity: 1, price: 0 }]);
    setFormSentItems([{ name: '', size: '', quantity: 1, price: 0 }]);
    setFormStatus('PENDING');
    setFormIssueActive(false);
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOrderId || !formCustomerName || !formExchangeId) {
      toast.error('Please fill in Order ID, Customer Name, and Exchange ID.');
      return;
    }

    // Clean empty items
    const filteredReturned = formReturnedItems.filter(item => item.name.trim() !== '');
    const filteredSent = formSentItems.filter(item => item.name.trim() !== '');

    const retTotal = filteredReturned.reduce((acc, x) => acc + (x.price * x.quantity), 0);
    const sentTotal = filteredSent.reduce((acc, x) => acc + (x.price * x.quantity), 0);
    const netBalance = sentTotal - retTotal;

    const newExchange: Exchange = {
      id: formExchangeId,
      orderId: formOrderId,
      customerId: 'CUST-GEN-' + Math.floor(Math.random() * 1000),
      customerName: formCustomerName,
      phone: formPhone,
      returnedItems: filteredReturned,
      sentItems: filteredSent,
      netBalance: netBalance,
      status: formStatus,
      issueActive: formIssueActive,
      notes: formNotes,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'exchanges', newExchange.id), newExchange);
      toast.success('Exchange transaction created successfully!');
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error creating exchange.');
    }
  };

  // Edit Exchange Action
  const handleOpenEditModal = (ex: Exchange) => {
    setActiveExchange(ex);
    setFormExchangeId(ex.id);
    setFormOrderId(ex.orderId);
    setFormCustomerName(ex.customerName);
    setFormPhone(ex.phone);
    setFormReturnedItems(ex.returnedItems.length > 0 ? [...ex.returnedItems] : [{ name: '', size: '', quantity: 1, price: 0 }]);
    setFormSentItems(ex.sentItems.length > 0 ? [...ex.sentItems] : [{ name: '', size: '', quantity: 1, price: 0 }]);
    setFormStatus(ex.status);
    setFormIssueActive(ex.issueActive);
    setFormNotes(ex.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExchange) return;

    // Clean empty items
    const filteredReturned = formReturnedItems.filter(item => item.name.trim() !== '');
    const filteredSent = formSentItems.filter(item => item.name.trim() !== '');

    const retTotal = filteredReturned.reduce((acc, x) => acc + (x.price * x.quantity), 0);
    const sentTotal = filteredSent.reduce((acc, x) => acc + (x.price * x.quantity), 0);
    const netBalance = sentTotal - retTotal;

    const updatedExchange: Exchange = {
      ...activeExchange,
      orderId: formOrderId,
      customerName: formCustomerName,
      phone: formPhone,
      returnedItems: filteredReturned,
      sentItems: filteredSent,
      netBalance: netBalance,
      status: formStatus,
      issueActive: formIssueActive,
      notes: formNotes
    };

    try {
      await setDoc(doc(db, 'exchanges', updatedExchange.id), updatedExchange);
      toast.success('Exchange transaction updated!');
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error updating exchange.');
    }
  };

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [exchangeIdToDelete, setExchangeIdToDelete] = useState<string | null>(null);

  // Delete Exchange Action
  const handleDeleteExchange = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'exchanges', id));
      toast.success('Exchange transaction deleted.');
      setIsDeleteConfirmOpen(false);
      setExchangeIdToDelete(null);
    } catch (e: any) {
      console.error('Delete exchange error:', e);
      if (e.code === 'permission-denied') {
        toast.error('Failed to delete: Permission Denied.');
      } else {
        toast.error('Failed to delete exchange.');
      }
    }
  };

  // Open Notes Modal
  const handleOpenNoteModal = (ex: Exchange) => {
    setActiveExchange(ex);
    setFormNotes(ex.notes || '');
    setFormIssueActive(ex.issueActive);
    setIsNoteModalOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!activeExchange) return;
    try {
      await updateDoc(doc(db, 'exchanges', activeExchange.id), {
        notes: formNotes,
        issueActive: formIssueActive
      });
      toast.success('Notes & Issue status updated!');
      setIsNoteModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Error saving notes.');
    }
  };

  // Print Invoice View Action
  const handlePrint = (ex: Exchange) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const returnedHTML = ex.returnedItems.map(it => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${it.name} (Size: ${it.size})</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${it.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">৳${it.price}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700;">৳${it.price * it.quantity}</td>
      </tr>
    `).join('');

    const sentHTML = ex.sentItems.length > 0 ? ex.sentItems.map(it => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #2563eb;">${it.name} (Size: ${it.size})</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #2563eb;">${it.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #2563eb;">৳${it.price}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #2563eb;">৳${it.price * it.quantity}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #64748b;">No items sent (Refund / Return-only)</td></tr>';

    const netBalanceText = ex.netBalance === 0 
      ? 'BALANCED (৳0)' 
      : ex.netBalance > 0 
        ? `CUSTOMER OWES: ৳${ex.netBalance}` 
        : `WE OWE REFUND: ৳${Math.abs(ex.netBalance)}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Exchange Invoice #${ex.id}</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; }
            .header { display: flex; justify-content: space-between; border-b: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: 900; color: #0f172a; }
            .meta { font-size: 14px; line-height: 1.6; }
            .section-title { font-size: 16px; font-weight: 800; text-transform: uppercase; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #f8fafc; padding: 12px; font-size: 11px; text-transform: uppercase; font-weight: 800; text-align: left; color: #64748b; }
            .balance-box { background-color: #f8fafc; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 16px; border: 1px solid #e2e8f0; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">ELEGAN BD</div>
              <div class="meta">Premium Clothing Store</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: 800;">EXCHANGE INVOICE</div>
              <div class="meta">
                Exchange ID: <strong>#EX-${ex.id}</strong><br/>
                Original Order: <strong>#${ex.orderId}</strong><br/>
                Date: ${format(new Date(ex.createdAt), 'dd MMMM yyyy, hh:mm a')}
              </div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <div style="font-weight: 800; margin-bottom: 5px;">CUSTOMER DETAILS</div>
            <div class="meta">
              Name: ${ex.customerName}<br/>
              Phone: ${ex.phone || 'N/A'}<br/>
            </div>
          </div>

          <div class="section-title">Returned Items (Credit)</div>
          <table>
            <thead>
              <tr>
                <th>Item Details</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${returnedHTML}
            </tbody>
          </table>

          <div class="section-title" style="color: #2563eb;">Sent / Replacement Items (Debit)</div>
          <table>
            <thead>
              <tr>
                <th style="color: #2563eb;">Item Details</th>
                <th style="text-align: center; color: #2563eb;">Qty</th>
                <th style="text-align: right; color: #2563eb;">Unit Price</th>
                <th style="text-align: right; color: #2563eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sentHTML}
            </tbody>
          </table>

          <div class="balance-box">
            <span>NET CALCULATION:</span>
            <span style="color: ${ex.netBalance === 0 ? '#475569' : ex.netBalance > 0 ? '#10b981' : '#f43f5e'}">
              ${netBalanceText}
            </span>
          </div>

          <div style="margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center;">
            Thank you for shopping with ELEGAN BD. System-generated exchange invoice.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export to CSV helper
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Exchange ID,Original Order ID,Customer Name,Phone,Returned Items,Sent Items,Net Balance,Status,Issue Active,Created At\n";

    filteredExchanges.forEach((ex) => {
      const returnedStr = ex.returnedItems.map(it => `${it.name}(${it.size})x${it.quantity}`).join('; ');
      const sentStr = ex.sentItems.map(it => `${it.name}(${it.size})x${it.quantity}`).join('; ');
      const row = [
        ex.id,
        ex.orderId,
        `"${ex.customerName}"`,
        ex.phone,
        `"${returnedStr}"`,
        `"${sentStr}"`,
        ex.netBalance,
        ex.status,
        ex.issueActive ? 'YES' : 'NO',
        ex.createdAt
      ].join(',');
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EleganBD_Exchanges_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exchanges log exported to CSV!');
  };

  return (
    <div className="w-full space-y-4 pb-10 font-sans text-gray-900 px-6">
      
      {/* 1. Header Section exactly like screenshot / AdminOrders */}
      <div className="flex items-center justify-between pt-4 border-b border-gray-100 pb-4">
        <div className="text-left">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Elegan BD</h1>
          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block mt-1">
            Exchange Desk
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-[#4F46E5]/10 active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create Exchange</span>
          </button>
        </div>
      </div>

      {/* White outer container for Search, Pills, and Table */}
      <div className="bg-[#F8F9FD] rounded-[24px] border border-gray-200 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.015)] space-y-6">
        
        {/* Full-width Search Input & Date/CSV actions row */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 stroke-[2]" />
            <input 
              type="text"
              placeholder="Search by Order #, Exchange ID, Phone, or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#F8F9FD] border border-gray-200 text-sm font-medium rounded-xl placeholder-gray-400 text-gray-900 focus:ring-2 focus:ring-[#4F46E5]/15 focus:border-[#4F46E5]/40 outline-none transition-all shadow-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
            <div className="flex items-center gap-2 bg-[#FAFBFD] border border-gray-200 rounded-xl px-3 py-2.5">
              <Calendar size={14} className="text-gray-400" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-[12px] font-bold text-gray-700 outline-none w-28 cursor-pointer focus:ring-0"
              />
              <span className="text-gray-300 font-bold">—</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-[12px] font-bold text-gray-700 outline-none w-28 cursor-pointer focus:ring-0"
              />
            </div>

            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] tracking-wider uppercase rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Status Filter Pills and Issue Dropdown Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'ALL STATUSES', label: 'All Statuses' },
              { key: 'PENDING', label: 'Pending' },
              { key: 'PRINTED', label: 'Printed' },
              { key: 'COMPLETED', label: 'Completed' },
            ].map(status => {
              const isActive = statusFilter === status.key;
              let count = 0;
              if (status.key === 'ALL STATUSES') {
                count = exchanges.length;
              } else {
                count = exchanges.filter(ex => ex.status === status.key).length;
              }

              return (
                <button
                  key={status.key}
                  onClick={() => setStatusFilter(status.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isActive 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-xs" 
                      : "bg-[#F8F9FD] border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
                >
                  <span>{status.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none min-w-[16px] text-center font-bold ${
                    isActive ? "bg-indigo-200/60 text-indigo-800" : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Issues:</span>
            <select 
              value={issueFilter}
              onChange={(e) => setIssueFilter(e.target.value)}
              className="bg-[#F8F9FD] border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-2 rounded-xl outline-none focus:border-indigo-400 shadow-sm cursor-pointer"
            >
              <option value="ALL ISSUES">All Issues</option>
              <option value="ISSUE ACTIVE">Issue Active</option>
              <option value="NO ISSUES">No Issues</option>
            </select>
          </div>
        </div>

        {/* Dynamic bulk highlighted actions bar */}
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-blue-600 text-white rounded-[16px] flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">{selectedIds.length} exchanges highlighted</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  try {
                    const count = selectedIds.length;
                    toast.loading(`Updating ${count} status...`, { id: 'bulk-status' });
                    await Promise.all(selectedIds.map(id => updateDoc(doc(db, 'exchanges', id), { status: 'COMPLETED' })));
                    toast.success(`Completed ${count} exchanges successfully`, { id: 'bulk-status' });
                    setSelectedIds([]);
                  } catch (err) {
                    console.error('[AdminExchanges Bulk] Update failed:', err);
                    toast.error('Failed to update status', { id: 'bulk-status' });
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer"
              >
                Mark Completed
              </button>
              <button 
                onClick={async () => {
                  try {
                    const count = selectedIds.length;
                    toast.loading(`Updating ${count} status...`, { id: 'bulk-status' });
                    await Promise.all(selectedIds.map(id => updateDoc(doc(db, 'exchanges', id), { status: 'PRINTED' })));
                    toast.success(`Printed ${count} exchanges successfully`, { id: 'bulk-status' });
                    setSelectedIds([]);
                  } catch (err) {
                    console.error('[AdminExchanges Bulk] Update failed:', err);
                    toast.error('Failed to update status', { id: 'bulk-status' });
                  }
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer"
              >
                Mark Printed
              </button>
              <button 
                onClick={async () => {
                  if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE ${selectedIds.length} highlighted exchange records?`)) return;
                  try {
                    const count = selectedIds.length;
                    toast.loading(`Deleting ${count} exchanges...`, { id: 'bulk-delete' });
                    await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'exchanges', id))));
                    toast.success(`Deleted ${count} exchanges successfully`, { id: 'bulk-delete' });
                    setSelectedIds([]);
                  } catch (err) {
                    console.error('[AdminExchanges Bulk] Delete failed:', err);
                    toast.error('Failed to delete exchanges', { id: 'bulk-delete' });
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer"
              >
                Delete Selected
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 bg-[#F8F9FD]/10 hover:bg-[#F8F9FD]/20 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}

        {/* Table representation */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="animate-spin text-indigo-600 mx-auto mb-4" size={32} />
            <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Fetching exchanges from Cloud...</p>
          </div>
        ) : filteredExchanges.length === 0 ? (
          <div className="py-20 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <RefreshCw className="text-gray-300 mx-auto mb-4" size={36} />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No matching exchanges found</p>
          </div>
        ) : (
          <div className="overflow-x-auto elegant-scrollbar pb-3">
            <table className="w-full text-left border-collapse min-w-[1500px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50/50">
                  <th className="py-4 px-4 text-center w-[50px]">
                    <input 
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredExchanges.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-200 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-4 font-semibold text-left whitespace-nowrap">Date</th>
                  <th className="py-4 px-4 font-semibold text-left whitespace-nowrap">Time</th>
                  <th className="py-4 px-4 font-semibold text-left whitespace-nowrap">Exchange No</th>
                  <th className="py-4 px-4 font-semibold text-left whitespace-nowrap">Invoice No</th>
                  <th className="py-4 px-4 font-semibold text-left whitespace-nowrap">Customer Name</th>
                  <th className="py-4 px-4 font-semibold text-left whitespace-nowrap">Number</th>
                  <th className="py-4 px-4 font-semibold text-left whitespace-nowrap">Returned Items</th>
                  <th className="py-4 px-4 font-semibold text-left whitespace-nowrap">Sent / Replacement</th>
                  <th className="py-4 px-4 font-semibold text-right whitespace-nowrap">Net Balance</th>
                  <th className="py-4 px-4 font-semibold text-left whitespace-nowrap">Status</th>
                  <th className="py-4 px-6 font-semibold text-center whitespace-nowrap sticky right-0 bg-gray-50/50 z-10 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-[#F8F9FD]">
                {filteredExchanges.map((ex) => {
                  const isSelected = selectedIds.includes(ex.id);
                  const returnedSum = calculateItemsSum(ex.returnedItems);
                  const sentSum = calculateItemsSum(ex.sentItems);

                  return (
                    <tr 
                      key={ex.id}
                      className={`group hover:bg-[#FAFBFD] transition-colors ${
                        isSelected ? "bg-indigo-50/20" : ""
                      }`}
                    >
                      {/* Checkbox column */}
                      <td className="py-4 px-4 text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(ex.id)}
                          className="rounded border-gray-200 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-4 text-xs font-bold text-[#0F172A]">
                        {format(new Date(ex.createdAt), 'M/dd/yyyy')}
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-gray-500">
                        {format(new Date(ex.createdAt), 'hh:mm a')}
                      </td>

                      {/* Exchange No */}
                      <td className="py-4 px-4 text-xs font-extrabold text-[#0F172A]">
                        EX-{ex.id}
                      </td>

                      {/* Order No */}
                      <td className="py-4 px-4 text-xs font-extrabold text-indigo-600">
                        <div className="flex flex-col gap-1">
                          <span>{ex.orderId}</span>
                          {ex.issueActive && (
                            <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-[#FFF0F0] text-[#EB5757] border border-red-200">
                              <AlertTriangle size={10} className="stroke-[3]" />
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td className="py-4 px-4 text-xs font-bold text-gray-900">
                        {ex.customerName}
                      </td>

                      {/* Number (Phone) */}
                      <td className="py-4 px-4 text-xs font-semibold text-gray-500 font-mono">
                        {ex.phone || 'N/A'}
                      </td>

                      {/* Returned Items */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {ex.returnedItems.map((item, idx) => (
                            <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-100 rounded px-2 py-0.5 text-[10px] font-bold uppercase truncate" title={`${item.name} (${item.size})`}>
                              {item.quantity}x {item.name} ({item.size})
                            </span>
                          ))}
                          {ex.returnedItems.length === 0 && <span className="text-gray-400 text-xs">—</span>}
                        </div>
                      </td>

                      {/* Sent / Replacement Items */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {ex.sentItems.map((item, idx) => (
                            <span key={idx} className="bg-blue-50 text-blue-800 border border-blue-100 rounded px-2 py-0.5 text-[10px] font-bold uppercase truncate" title={`${item.name} (${item.size})`}>
                              {item.quantity}x {item.name} ({item.size})
                            </span>
                          ))}
                          {ex.sentItems.length === 0 && <span className="text-gray-400 text-xs">—</span>}
                        </div>
                      </td>

                      {/* Net Balance */}
                      <td className="py-4 px-4 text-right">
                        <div className="text-xs font-extrabold text-[#0F172A]">
                          {ex.netBalance > 0 ? `+৳${ex.netBalance}` : ex.netBalance < 0 ? `-৳${Math.abs(ex.netBalance)}` : '৳0'}
                        </div>
                        <div className="mt-1">
                          {ex.netBalance === 0 ? (
                            <span className="px-1.5 py-0.25 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[8px] font-bold uppercase">
                              BALANCED
                            </span>
                          ) : ex.netBalance > 0 ? (
                            <span className="px-1.5 py-0.25 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[8px] font-bold uppercase">
                              CUST. OWES
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.25 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[8px] font-bold uppercase">
                              OWE REFUND
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <select 
                          value={ex.status}
                          onChange={(e) => handleStatusChange(ex.id, e.target.value as any)}
                          className={`px-2 py-1 border text-[10px] font-black rounded-lg outline-none cursor-pointer uppercase ${
                            ex.status === 'PENDING' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : ex.status === 'PRINTED' 
                                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="PRINTED">PRINTED</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </td>

                      {/* Grouped Actions Container */}
                      <td className="py-4 px-6 text-center sticky right-0 bg-[#F8F9FD] z-10 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-center">
                          <div className="flex items-center gap-0.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#EDF2F7] shadow-sm">
                            {/* View details */}
                            <button 
                              onClick={() => {
                                setActiveExchange(ex);
                                setIsViewModalOpen(true);
                              }}
                              title="View Details"
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-[#F8F9FD] rounded-lg transition-all"
                            >
                              <Eye size={13} className="stroke-[2.2]" />
                            </button>

                            <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />

                            {/* Edit */}
                            <button 
                              onClick={() => handleOpenEditModal(ex)}
                              title="Edit Exchange"
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-[#F8F9FD] rounded-lg transition-all"
                            >
                              <Edit size={13} className="stroke-[2.2]" />
                            </button>

                            <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />

                            {/* Issue / Notes */}
                            <button 
                              onClick={() => handleOpenNoteModal(ex)}
                              title="Notes & Issues"
                              className={`p-1.5 rounded-lg transition-all ${
                                ex.issueActive 
                                  ? 'text-rose-600 hover:bg-rose-50' 
                                  : 'text-gray-500 hover:text-rose-500 hover:bg-[#F8F9FD]'
                              }`}
                            >
                              <MessageSquare size={13} className="stroke-[2.2]" />
                            </button>

                            <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />

                            {/* Print */}
                            <button 
                              onClick={() => handlePrint(ex)}
                              title="Print Invoice"
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-[#F8F9FD] rounded-lg transition-all"
                            >
                              <Printer size={13} className="stroke-[2.2]" />
                            </button>

                            {/* Reset / re-open if Completed */}
                            {ex.status === 'COMPLETED' && (
                              <>
                                <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />
                                <button 
                                  onClick={() => handleResetExchange(ex.id)}
                                  title="Re-open Exchange"
                                  className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-[#F8F9FD] rounded-lg transition-all"
                                >
                                  <RefreshCw size={13} className="stroke-[2.2]" />
                                </button>
                              </>
                            )}

                            {/* Delete */}
                                <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setExchangeIdToDelete(ex.id);
                                    setIsDeleteConfirmOpen(true);
                                  }}
                                  title="Delete Transaction"
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-[#F8F9FD] rounded-lg transition-all pointer-events-auto"
                                >
                                  <Trash2 size={13} className="stroke-[2.2]" />
                                </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Total Summary at bottom */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-extrabold uppercase tracking-widest">
          <span>Showing {filteredExchanges.length} exchange records</span>
          <span className="text-black">ELEGAN BD EXCHANGE DESK</span>
        </div>

      </div>

      {/* ==================== CREATE MODAL ==================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#F8F9FD] rounded-[32px] max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-xl font-black uppercase italic tracking-tight text-[#0F172A]">Create Exchange Log</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Exchange ID</label>
                  <input 
                    type="text" 
                    value={formExchangeId}
                    onChange={(e) => setFormExchangeId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-[#F8F9FD] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Original Order ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 2607130005"
                    value={formOrderId}
                    onChange={(e) => setFormOrderId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-[#F8F9FD] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Customer Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Rifat"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-[#F8F9FD] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 017XXXXXXXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-[#F8F9FD] transition-all"
                  />
                </div>
              </div>

              {/* Returned items dynamic list */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-extrabold text-[#D97706] uppercase tracking-widest">Returned Items (Credit)</label>
                  <button 
                    type="button"
                    onClick={() => setFormReturnedItems([...formReturnedItems, { name: '', size: '', quantity: 1, price: 0 }])}
                    className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>
                {formReturnedItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...formReturnedItems];
                        copy[idx].name = e.target.value;
                        setFormReturnedItems(copy);
                      }}
                      className="col-span-4 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Size"
                      value={item.size}
                      onChange={(e) => {
                        const copy = [...formReturnedItems];
                        copy[idx].size = e.target.value;
                        setFormReturnedItems(copy);
                      }}
                      className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...formReturnedItems];
                        copy[idx].quantity = parseInt(e.target.value) || 1;
                        setFormReturnedItems(copy);
                      }}
                      className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => {
                        const copy = [...formReturnedItems];
                        copy[idx].price = parseFloat(e.target.value) || 0;
                        setFormReturnedItems(copy);
                      }}
                      className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={() => setFormReturnedItems(formReturnedItems.filter((_, i) => i !== idx))}
                      className="col-span-1 p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Sent items dynamic list */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Sent / Replacement Items (Debit)</label>
                  <button 
                    type="button"
                    onClick={() => setFormSentItems([...formSentItems, { name: '', size: '', quantity: 1, price: 0 }])}
                    className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>
                {formSentItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...formSentItems];
                        copy[idx].name = e.target.value;
                        setFormSentItems(copy);
                      }}
                      className="col-span-4 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Size"
                      value={item.size}
                      onChange={(e) => {
                        const copy = [...formSentItems];
                        copy[idx].size = e.target.value;
                        setFormSentItems(copy);
                      }}
                      className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...formSentItems];
                        copy[idx].quantity = parseInt(e.target.value) || 1;
                        setFormSentItems(copy);
                      }}
                      className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => {
                        const copy = [...formSentItems];
                        copy[idx].price = parseFloat(e.target.value) || 0;
                        setFormSentItems(copy);
                      }}
                      className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={() => setFormSentItems(formSentItems.filter((_, i) => i !== idx))}
                      className="col-span-1 p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Status and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Status</label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PRINTED">PRINTED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer mt-4 select-none">
                    <input 
                      type="checkbox"
                      checked={formIssueActive}
                      onChange={(e) => setFormIssueActive(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500/20"
                    />
                    <span className="text-[10px] font-extrabold uppercase text-rose-600 tracking-widest">Flag Active Issue</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Notes / Special Instructions</label>
                <textarea 
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 focus:bg-[#F8F9FD] transition-all"
                  placeholder="Describe exchange terms..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-[#475569] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-blue-500/20"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT MODAL ==================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#F8F9FD] rounded-[32px] max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-xl font-black uppercase italic tracking-tight text-[#0F172A]">Edit Exchange Transaction</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Exchange ID</label>
                  <input 
                    type="text" 
                    value={formExchangeId}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 text-gray-500 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Original Order ID</label>
                  <input 
                    type="text" 
                    value={formOrderId}
                    onChange={(e) => setFormOrderId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-[#F8F9FD] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Customer Name</label>
                  <input 
                    type="text" 
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-[#F8F9FD] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-[#F8F9FD] transition-all"
                  />
                </div>
              </div>

              {/* Returned Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-extrabold text-[#D97706] uppercase tracking-widest">Returned Items (Credit)</label>
                  <button 
                    type="button"
                    onClick={() => setFormReturnedItems([...formReturnedItems, { name: '', size: '', quantity: 1, price: 0 }])}
                    className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>
                {formReturnedItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...formReturnedItems];
                        copy[idx].name = e.target.value;
                        setFormReturnedItems(copy);
                      }}
                      className="col-span-4 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Size"
                      value={item.size}
                      onChange={(e) => {
                        const copy = [...formReturnedItems];
                        copy[idx].size = e.target.value;
                        setFormReturnedItems(copy);
                      }}
                      className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...formReturnedItems];
                        copy[idx].quantity = parseInt(e.target.value) || 1;
                        setFormReturnedItems(copy);
                      }}
                      className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => {
                        const copy = [...formReturnedItems];
                        copy[idx].price = parseFloat(e.target.value) || 0;
                        setFormReturnedItems(copy);
                      }}
                      className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={() => setFormReturnedItems(formReturnedItems.filter((_, i) => i !== idx))}
                      className="col-span-1 p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Sent Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Sent / Replacement Items (Debit)</label>
                  <button 
                    type="button"
                    onClick={() => setFormSentItems([...formSentItems, { name: '', size: '', quantity: 1, price: 0 }])}
                    className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>
                {formSentItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...formSentItems];
                        copy[idx].name = e.target.value;
                        setFormSentItems(copy);
                      }}
                      className="col-span-4 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Size"
                      value={item.size}
                      onChange={(e) => {
                        const copy = [...formSentItems];
                        copy[idx].size = e.target.value;
                        setFormSentItems(copy);
                      }}
                      className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...formSentItems];
                        copy[idx].quantity = parseInt(e.target.value) || 1;
                        setFormSentItems(copy);
                      }}
                      className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => {
                        const copy = [...formSentItems];
                        copy[idx].price = parseFloat(e.target.value) || 0;
                        setFormSentItems(copy);
                      }}
                      className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={() => setFormSentItems(formSentItems.filter((_, i) => i !== idx))}
                      className="col-span-1 p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Status and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Status</label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PRINTED">PRINTED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer mt-4 select-none">
                    <input 
                      type="checkbox"
                      checked={formIssueActive}
                      onChange={(e) => setFormIssueActive(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500/20"
                    />
                    <span className="text-[10px] font-extrabold uppercase text-rose-600 tracking-widest">Flag Active Issue</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Notes / Special Instructions</label>
                <textarea 
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 focus:bg-[#F8F9FD] transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-[#475569] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-blue-500/20"
                >
                  Update Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== NOTE / ISSUE MODAL ==================== */}
      {isNoteModalOpen && activeExchange && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#F8F9FD] rounded-[32px] max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-lg font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2">
                <MessageSquare className="text-rose-500" /> Notes & Issues
              </h2>
              <button onClick={() => setIsNoteModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Exchange ID</p>
                <p className="text-xs font-black text-[#0F172A]">#EX-{activeExchange.id} (Order {activeExchange.orderId})</p>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Exchange Notes</label>
                <textarea 
                  rows={4}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold outline-none focus:border-rose-500 transition-all placeholder:text-gray-300"
                  placeholder="Add exchange remarks here..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={formIssueActive}
                    onChange={(e) => setFormIssueActive(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500/20"
                  />
                  <span className="text-[10px] font-extrabold uppercase text-rose-600 tracking-widest">Flag Active Issue</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-[#475569] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Close
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW DETAILS MODAL ==================== */}
      {isViewModalOpen && activeExchange && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#F8F9FD] rounded-[32px] max-w-lg w-full p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-xl font-black uppercase italic tracking-tight text-[#0F172A]">Exchange Transaction Details</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Exchange ID</p>
                  <p className="font-bold text-[#0F172A]">#EX-{activeExchange.id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Original Order ID</p>
                  <p className="font-bold text-[#0F172A]">#{activeExchange.orderId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Customer Name</p>
                  <p className="font-bold text-[#0F172A]">{activeExchange.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Phone Number</p>
                  <p className="font-bold text-[#0F172A]">{activeExchange.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Returned Items */}
              <div>
                <h4 className="text-[10px] text-amber-700 font-extrabold uppercase tracking-widest border-b border-amber-100 pb-1.5 mb-2">Returned Items (Credit)</h4>
                <div className="space-y-2">
                  {activeExchange.returnedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      <span className="font-bold">{item.name} (Size: {item.size})</span>
                      <span className="font-semibold text-gray-600">Qty: {item.quantity} × ৳{item.price} = ৳{item.price * item.quantity}</span>
                    </div>
                  ))}
                  {activeExchange.returnedItems.length === 0 && (
                    <p className="text-xs text-gray-400">No items returned</p>
                  )}
                </div>
              </div>

              {/* Sent Items */}
              <div>
                <h4 className="text-[10px] text-blue-700 font-extrabold uppercase tracking-widest border-b border-blue-100 pb-1.5 mb-2">Sent / Replacement Items (Debit)</h4>
                <div className="space-y-2">
                  {activeExchange.sentItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                      <span className="font-bold text-blue-800">{item.name} (Size: {item.size})</span>
                      <span className="font-semibold text-blue-600">Qty: {item.quantity} × ৳{item.price} = ৳{item.price * item.quantity}</span>
                    </div>
                  ))}
                  {activeExchange.sentItems.length === 0 && (
                    <p className="text-xs text-gray-400">No replacement items sent (Return-only)</p>
                  )}
                </div>
              </div>

              {/* Ledger Summary */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-500">Returned Value:</span>
                  <span>৳{calculateItemsSum(activeExchange.returnedItems)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-500">Replacement Value:</span>
                  <span>৳{calculateItemsSum(activeExchange.sentItems)}</span>
                </div>
                <div className="flex justify-between font-black text-sm border-t border-gray-200 pt-2">
                  <span>Net Ledger Calculation:</span>
                  <span className={activeExchange.netBalance === 0 ? 'text-gray-700' : activeExchange.netBalance > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {activeExchange.netBalance === 0 
                      ? 'BALANCED (৳0)' 
                      : activeExchange.netBalance > 0 
                        ? `Customer owes +৳${activeExchange.netBalance}` 
                        : `Owe Refund ৳${Math.abs(activeExchange.netBalance)}`
                    }
                  </span>
                </div>
              </div>

              {/* Notes */}
              {activeExchange.notes && (
                <div>
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-1">Administrative Notes</p>
                  <p className="text-xs font-semibold text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                    "{activeExchange.notes}"
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => handlePrint(activeExchange)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-[#475569] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 border border-gray-200"
                >
                  <Printer size={13} /> Print Invoice
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {isDeleteConfirmOpen && exchangeIdToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#F8F9FD] rounded-[32px] max-w-sm w-full p-8 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-lg font-black uppercase tracking-tight text-[#0F172A] mb-4">Confirm Deletion</h2>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete exchange transaction #{exchangeIdToDelete}? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setExchangeIdToDelete(null);
                }}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-[#475569] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleDeleteExchange(exchangeIdToDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
