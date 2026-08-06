import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import InvoiceTemplate from '../../components/admin/InvoiceTemplate';
import { ParcelLiveStatusBadge } from '../../components/admin/ParcelLiveStatusBadge';
import { useOrders } from '../../contexts/OrderContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice, cn } from '../../lib/utils';
import { isDeliveredOrSuccess } from '../../utils/orderUtils';
import { Order } from '../../types';

const normalizeStatus = (status: string): string => {
  const s = (status || '').toUpperCase().trim();
  if (s === 'PENDING') return 'ORDER PLACED';
  if (s === 'PROCESSING') return 'PREPARING';
  if (s === 'DELIVERED' || s === 'QC') return 'SUCCESS';
  return s;
};
import { 
  Search, 
  RefreshCw, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  ShoppingBag,
  ExternalLink,
  DollarSign,
  ChevronDown,
  Eye,
  Truck,
  Trash2,
  Edit2,
  Package,
  Calendar,
  Printer,
  X,
  Plus,
  UserPlus,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvoiceByOptions } from '../../hooks/useInvoiceByOptions';

interface Message {
  sender: 'customer' | 'admin';
  message: string;
  timestamp: string;
}

export default function AdminIssues() {
  const { orders, updateOrder, updateOrderStatus, deleteOrder, loading } = useOrders();
  const { currency, rate } = useCurrency();
  const { currentUser, isSuperAdmin } = useAuth();

  // Selected ticket / issue state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showApprovedCancel, setShowApprovedCancel] = useState(false);

  useEffect(() => {
    setShowApprovedCancel(false);
  }, [selectedOrderId]);

  // Custom Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Invoice Preview Modal States
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);

  // View and Edit Order Modal States
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModalMode, setOrderModalMode] = useState<'view' | 'edit'>('view');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('Dhaka');
  const [editStatus, setEditStatus] = useState<Order['status']>('Pending');
  const [editDeliveryCharge, setEditDeliveryCharge] = useState(100);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editAdvancePayment, setEditAdvancePayment] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editInvoiceBy, setEditInvoiceBy] = useState('');
  const { options: invoiceByOptions, addOption: addInvoiceByOption } = useInvoiceByOptions();
  const [showAddInvoiceByModal, setShowAddInvoiceByModal] = useState(false);
  const [customInvoiceByName, setCustomInvoiceByName] = useState('');

  const handleAddCustomInvoiceBy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customInvoiceByName.trim();
    if (!trimmed) {
      toast.error('Please enter a name');
      return;
    }

    const success = await addInvoiceByOption(trimmed);
    if (success) {
      toast.success(`"${trimmed}" has been added and published for all admins!`);
      setEditInvoiceBy(trimmed);
      setCustomInvoiceByName('');
      setShowAddInvoiceByModal(false);
    } else {
      toast.error('Failed to save name. Please try again.');
    }
  };

  const openOrderModal = (mode: 'view' | 'edit') => {
    if (!selectedIssue?.order) return;
    const order = selectedIssue.order;
    if (mode === 'edit' && isDeliveredOrSuccess(order.status)) {
      toast.error('ডেলিভার্ড বা সাকসেস অর্ডার এডিট করা যাবে না। (Delivered/Success order cannot be edited)');
      return;
    }
    setEditName(order.customerName || '');
    setEditPhone(order.phone || '');
    setEditAddress(order.address || '');
    setEditCity(order.city || 'Dhaka');
    setEditStatus(order.status || 'Pending');
    setEditDeliveryCharge(order.deliveryCharge ?? 100);
    setEditDiscount((order as any).discount ?? 0);
    setEditAdvancePayment((order as any).advancePayment ?? 0);
    setEditNotes((order as any).notes || '');
    setEditInvoiceBy(order.invoiceBy || 'Website order');
    setOrderModalMode(mode);
    setShowOrderModal(true);
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'READY' | 'CANCEL' | 'SOLVED' | 'EDITED'>('ALL');
  const [viewMode, setViewMode] = useState<'MY' | 'ALL'>('ALL');
  const [isFilterOptionsOpen, setIsFilterOptionsOpen] = useState(false);

  // Compute issue type for an order deterministically if not explicitly stored
  const getIssueType = useCallback((order: any) => {
    if (order.issueType) return order.issueType;
    if (order.status === 'Cancelled') return 'Cancel Request';
    return 'REGULAR';
  }, []);

  // Compute issue status deterministically if not explicitly stored
  const getIssueStatus = useCallback((order: any) => {
    if (order.issueStatus) return order.issueStatus;
    if (order.status === 'Cancelled') return 'resolved';
    return 'open';
  }, []);

  const getIssueReplies = useCallback((order: any): Message[] => {
    if (order.issueReplies && order.issueReplies.length > 0) {
      return order.issueReplies;
    }
    const formattedDate = new Date(order.createdAt).toLocaleString();
    return [
      {
        sender: 'customer',
        message: order.notes || 'Hi Admin, I have some questions regarding this order.',
        timestamp: formattedDate
      }
    ];
  }, []);

  const rawIssuesList = useMemo(() => {
    return orders
      .filter(order => {
        if (order.issueStatus) return true;
        if (order.status === 'Cancelled') return true;
        if (order.notes) return true;
        return false;
      })
      .map(order => {
        const type = getIssueType(order);
        const status = getIssueStatus(order);
        const replies = getIssueReplies(order);
        return {
          order,
          id: order.id,
          customerName: order.customerName,
          phone: order.phone,
          address: order.address,
          city: order.city,
          createdAt: order.createdAt,
          type,
          status,
          replies,
          urgency: order.urgency || 'NORMAL'
        };
      });
  }, [orders, getIssueType, getIssueStatus, getIssueReplies]);

  const counts = useMemo(() => {
    const open = rawIssuesList.filter(item => item.status === 'open').length;
    const resolved = rawIssuesList.filter(item => item.status === 'resolved').length;
    return { open, resolved, total: rawIssuesList.length };
  }, [rawIssuesList]);

  const filteredIssues = useMemo(() => {
    return rawIssuesList.filter(item => {
      // 1. View Mode (My Issues vs All Issues)
      if (viewMode === 'MY') {
        const myName = currentUser?.displayName || 'Sabbir';
        if (item.order.invoiceBy !== myName && !(item.order.invoiceBy && item.order.invoiceBy.toLowerCase().includes(myName.toLowerCase()))) return false;
      }

      // 2. Tab filter
      if (activeTab === 'OPEN' && item.status !== 'open') return false;
      if (activeTab === 'SOLVED' && item.status !== 'resolved') return false;
      if (activeTab === 'CANCEL' && item.order.status !== 'Cancelled') return false;
      if (activeTab === 'READY' && item.order.status !== 'QC') return false;
      if (activeTab === 'EDITED' && !item.order.updatedBy) return false;

      // 3. Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.customerName?.toLowerCase().includes(query) ||
          item.phone?.includes(query) ||
          item.id?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [rawIssuesList, activeTab, viewMode, searchQuery, currentUser]);

  // Auto-select first issue on load
  useEffect(() => {
    if (!selectedOrderId && !loading && filteredIssues.length > 0) {
      setSelectedOrderId(filteredIssues[0].id);
    }
  }, [loading, filteredIssues, selectedOrderId]);

  const selectedIssue = useMemo(() => {
    if (!selectedOrderId) return null;
    return rawIssuesList.find(issue => issue.id === selectedOrderId) || null;
  }, [rawIssuesList, selectedOrderId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Issues refreshed');
    }, 600);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedOrderId || !selectedIssue) return;

    try {
      const updatedReplies = [...selectedIssue.replies, {
        sender: 'admin',
        message: replyText.trim(),
        timestamp: new Date().toLocaleString()
      }];

      await updateOrder(selectedOrderId, {
        issueReplies: updatedReplies
      });

      setReplyText('');
    } catch (err) {
      toast.error('Failed to send reply');
    }
  };

  const handleToggleStatus = async (status: 'open' | 'resolved') => {
    if (!selectedOrderId) return;
    try {
      await updateOrder(selectedOrderId, { issueStatus: status });
      toast.success(`Issue marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] font-sans p-4 lg:p-8 animate-in fade-in duration-500">
      {invoiceOrder && createPortal(
        <InvoiceTemplate order={invoiceOrder} preview={false} />,
        document.body
      )}
      {/* Header section matching screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[#0C1421] mb-2 uppercase">Issues</h1>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <span>ORDER ISSUE THREADS</span>
            <span className="text-gray-200">•</span>
            <span className="text-indigo-600">{counts.open} OPEN</span>
            <span className="text-gray-200">•</span>
            <span className="text-emerald-600">{counts.resolved} RESOLVED</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-50 p-1 rounded-2xl border border-gray-100">
            <button 
              onClick={() => setViewMode('MY')}
              className={cn(
                "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                viewMode === 'MY' ? "bg-[#F8F9FD] text-indigo-600 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600"
              )}
            >
              MY ISSUES
            </button>
            <button 
              onClick={() => setViewMode('ALL')}
              className={cn(
                "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                viewMode === 'ALL' ? "bg-[#F8F9FD] text-indigo-600 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600"
              )}
            >
              ALL ISSUES
            </button>
          </div>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-100"
          >
            <RefreshCw size={14} className={cn(isRefreshing ? "animate-spin" : "")} />
            REFRESH
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#F8F9FD] rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order, customer..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm focus:bg-[#F8F9FD] focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex flex-wrap gap-2">
                {['ALL', 'OPEN', 'READY', 'CANCEL', 'SOLVED', 'EDITED'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      activeTab === tab 
                        ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                        : "bg-[#F8F9FD] text-gray-400 border-gray-100 hover:border-gray-200"
                    )}
                  >
                    {tab} {tab === 'ALL' && `(${counts.total})`}
                  </button>
                ))}
              </div>

              {/* Filter Options Accordion */}
              <button 
                onClick={() => setIsFilterOptionsOpen(!isFilterOptionsOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 group hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#F8F9FD] rounded-lg border border-gray-100">
                    <AlertCircle size={14} className="text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0C1421]">Filter Options</span>
                </div>
                <ChevronDown size={16} className={cn("text-gray-400 transition-transform duration-300", isFilterOptionsOpen ? "rotate-180" : "")} />
              </button>

              {isFilterOptionsOpen && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                   {/* Add more specific filters here if needed */}
                </div>
              )}
            </div>

            {/* List */}
            <div className="max-h-[600px] overflow-y-auto no-scrollbar border-t border-gray-50">
              {filteredIssues.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => setSelectedOrderId(issue.id)}
                  className={cn(
                    "w-full p-6 text-left border-b border-gray-50 transition-all flex items-start gap-4 hover:bg-gray-50/50",
                    selectedOrderId === issue.id ? "bg-indigo-50/30 border-l-4 border-l-indigo-600" : ""
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                    <AlertCircle size={20} className={cn(issue.status === 'open' ? "text-rose-500" : "text-emerald-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black text-[#0C1421] tracking-tight">#{issue.id.slice(-10)}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black rounded uppercase text-gray-500">ORDER PLACED</span>
                        <span className={cn(
                          "px-2 py-0.5 text-[8px] font-black rounded uppercase",
                          issue.status === 'open' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                        )}>{issue.status}</span>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-[#0C1421] truncate mb-1">{issue.customerName}</h4>
                    <p className="text-[10px] text-gray-400 italic mb-3 line-clamp-1">
                      {issue.customerName}: {issue.replies[0]?.message}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 bg-indigo-50 text-[9px] font-black rounded-lg text-indigo-600 uppercase tracking-widest">{issue.type}</span>
                      <span className={cn(
                        "px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest",
                        issue.urgency === 'PRIORITY' ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"
                      )}>{issue.urgency}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div className="lg:col-span-8 bg-[#F8F9FD] rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col h-[800px] overflow-hidden">
          {selectedIssue ? (
            <div className="h-full flex flex-col">
              {/* Main Header */}
              <div className="p-8 border-b border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="text-left">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="text-3xl font-black tracking-tighter text-[#0C1421]">Order #{selectedIssue.id.slice(-10)}</h2>
                      <span className="px-3 py-1 bg-gray-50 text-[10px] font-black rounded-xl uppercase tracking-widest text-[#0C1421] border border-gray-100">ORDER PLACED</span>
                      {selectedIssue.order && <ParcelLiveStatusBadge order={selectedIssue.order} showDetails />}
                    </div>
                    <div className="mb-2">
                      <p className="text-xs font-bold text-indigo-600 font-mono">
                        Invoice No: #{selectedIssue.order.invoiceNo || selectedIssue.id.slice(-6)}
                      </p>
                      {(selectedIssue.order.status === 'Ready' || selectedIssue.order.status === 'QC') && (
                        <div className="mt-1">
                          <span className="inline-block px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-lg uppercase tracking-wider shadow-sm border border-emerald-700">
                            Ready
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-bold text-gray-500">{selectedIssue.customerName}</h3>
                      <span className="text-gray-300">•</span>
                      <span className="text-lg font-bold text-gray-500 font-mono tracking-tight">{selectedIssue.phone}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest",
                        selectedIssue.status === 'open' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}>
                        <AlertCircle size={12} />
                        {selectedIssue.status}
                      </div>
                      <div className="bg-[#F8F9FD] border border-gray-100 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0C1421] flex items-center gap-2">
                        <span>TYPE:</span>
                        <span className="text-indigo-600">{selectedIssue.type}</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                        <span>URGENCY:</span>
                        <span>{selectedIssue.urgency}</span>
                      </div>
                      <button 
                        onClick={() => openOrderModal('edit')}
                        title="Edit Order Details"
                        className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-[#0C1421] dark:hover:text-white rounded-xl border border-gray-100 dark:border-gray-700 transition-all cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => openOrderModal('view')}
                      className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-[#0C1421] dark:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
                    >
                      <Eye size={14} />
                      VIEW ORDER
                    </button>
                    <button 
                      onClick={() => {
                        setInvoiceOrder(selectedIssue.order);
                        setShowInvoiceModal(true);
                      }}
                      className="flex items-center gap-2 px-5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-indigo-100 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-400 cursor-pointer"
                    >
                      <Printer size={14} />
                      PRINT INVOICE
                    </button>

                    {(selectedIssue.order.status === 'Ready' || selectedIssue.order.status === 'QC') ? (
                      <button 
                        onClick={async () => {
                          try {
                            toast.loading('Resolving issue...', { id: 'status-update' });
                            await updateOrderStatus(selectedIssue.id, 'Delivered');
                            toast.success('Issue marked as solved!', { id: 'status-update' });
                          } catch (e) {
                            toast.error('Failed to resolve issue', { id: 'status-update' });
                          }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg cursor-pointer font-bold"
                      >
                        <CheckCircle2 size={14} />
                        SOLVE
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={async () => {
                            try {
                              toast.loading('Updating status...', { id: 'status-update' });
                              await updateOrderStatus(selectedIssue.id, 'Ready');
                              toast.success('Order status updated to Ready!', { id: 'status-update' });
                            } catch (e) {
                              toast.error('Failed to update status', { id: 'status-update' });
                            }
                          }}
                          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-100/50 cursor-pointer"
                        >
                          <Truck size={14} />
                          READY TO SHIP
                        </button>
                        {!showApprovedCancel ? (
                          <button 
                            onClick={() => {
                              setShowApprovedCancel(true);
                              toast.info("অর্ডার বাতিল চূড়ান্ত করতে 'APPROVED CANCEL' ক্লিক করুন", { id: 'status-update' });
                            }}
                            className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
                          >
                            <AlertCircle size={14} />
                            CANCEL REQUEST
                          </button>
                        ) : (
                          <button 
                            onClick={async () => {
                              try {
                                toast.loading('Cancelling order...', { id: 'status-update' });
                                await updateOrderStatus(selectedIssue.id, 'Cancelled');
                                setShowApprovedCancel(false);
                                toast.success('Order marked as Cancelled successfully!', { id: 'status-update' });
                              } catch (e) {
                                toast.error('Failed to cancel order', { id: 'status-update' });
                              }
                            }}
                            className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer animate-pulse shadow-lg"
                          >
                            <CheckCircle2 size={14} />
                            APPROVED CANCEL
                          </button>
                        )}
                        <button 
                          onClick={() => openOrderModal('edit')}
                          className="flex items-center gap-2 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
                        >
                          <Edit2 size={14} />
                          EDIT ORDER
                        </button>
                      </>
                    )}
                    {isSuperAdmin && (
                      <button 
                        onClick={() => {
                          if (!selectedIssue) return;
                          const orderId = selectedIssue.id;
                          const shortId = orderId.slice(-6);
                          setDeleteConfirm({
                            isOpen: true,
                            title: `Delete Order #${shortId}?`,
                            message: `Are you sure you want to PERMANENTLY DELETE Order #${shortId}? This will remove it from the database forever and cannot be undone.`,
                            onConfirm: async () => {
                              try {
                                toast.loading('Deleting order...', { id: 'issues-delete' });
                                await deleteOrder(orderId);
                                toast.success('Order deleted successfully', { id: 'issues-delete' });
                                setSelectedOrderId(null);
                              } catch (err: any) {
                                console.error('[AdminIssues] Delete failed:', err);
                                const errMsg = err?.message || 'Check your permissions';
                                toast.error(`Delete failed: ${errMsg}`, { id: 'issues-delete' });
                              } finally {
                                setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                              }
                            }
                          });
                        }}
                        className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-rose-100"
                      >
                        <Trash2 size={14} />
                        DELETE ORDER
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="bg-gray-50/50 border-b border-gray-100 p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">STATUS</span>
                    <span className="text-sm font-black text-[#0C1421] uppercase tracking-tight">ORDER PLACED</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">COURIER</span>
                    <span className="text-sm font-black text-gray-300 uppercase tracking-tight">—</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">ITEMS</span>
                    <span className="text-sm font-black text-indigo-600 uppercase tracking-tight">
                      {selectedIssue.order.items.map(i => `${i.name} (${i.selectedSize || 'F'})`).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">COLLECTABLE</span>
                    <span className="text-lg font-black text-rose-500 tracking-tight">
                      {formatPrice(selectedIssue.order.total, currency, rate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-slate-50/20">
                {selectedIssue.replies.map((msg, i) => (
                  <div key={i} className={cn("flex items-start gap-4 max-w-[80%]", msg.sender === 'admin' ? "ml-auto flex-row-reverse" : "")}>
                    <div className="w-10 h-10 rounded-2xl bg-[#F8F9FD] border border-gray-100 flex items-center justify-center font-black text-[10px] text-gray-400 shrink-0 shadow-sm uppercase">
                      {msg.sender === 'admin' ? 'SA' : msg.sender.slice(0, 2)}
                    </div>
                    <div>
                      <div className={cn("flex items-center gap-3 mb-2", msg.sender === 'admin' ? "justify-end" : "")}>
                        <span className="text-[10px] font-black text-[#0C1421] uppercase tracking-widest">
                          {msg.sender === 'admin' ? 'SABILA' : selectedIssue.customerName.split(' ')[0]}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 font-mono">{msg.timestamp}</span>
                      </div>
                      <div className={cn(
                        "p-5 rounded-[24px] text-lg font-bold leading-relaxed shadow-sm border",
                        msg.sender === 'admin' ? "bg-indigo-600 text-white border-indigo-600" : "bg-[#F8F9FD] text-[#0C1421] border-gray-100"
                      )}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendReply} className="p-8 bg-[#F8F9FD] border-t border-gray-100 flex items-center gap-4">
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-[24px] px-8 py-5 text-lg font-bold outline-none focus:bg-[#F8F9FD] focus:ring-4 focus:ring-indigo-50 transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!replyText.trim()}
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 p-4 rounded-2xl transition-all shadow-lg",
                      replyText.trim() ? "bg-indigo-600 text-white shadow-indigo-100" : "bg-gray-200 text-gray-400"
                    )}
                  >
                    <Send size={24} />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
               <div className="w-24 h-24 rounded-[32px] bg-gray-50 flex items-center justify-center mb-6 border border-gray-100 shadow-sm">
                 <MessageSquare size={40} className="text-gray-300" />
               </div>
               <h3 className="text-xl font-black text-[#0C1421] uppercase tracking-tighter mb-2">Select an Issue</h3>
               <p className="text-sm text-gray-400 font-bold max-w-sm">Pick a conversation from the list to view details and respond.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* View/Edit Order Details Modal */}
      <AnimatePresence>
        {showOrderModal && selectedIssue && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 m-0 font-sans">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrderModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F8F9FD] dark:bg-[#121824] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh] text-left"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gray-50 dark:bg-[#182235] border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-950 dark:text-white text-sm uppercase tracking-wider">
                      {orderModalMode === 'view' ? 'Order Details' : 'Edit Order Record'}
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      Order #{selectedIssue.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-2 text-gray-400 hover:text-black dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto no-scrollbar flex-1 space-y-6">
                {orderModalMode === 'view' ? (
                  // View mode UI
                  <div className="space-y-6">
                    {/* Customer Info Card */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/85">
                      <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Customer Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest block">Name</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedIssue.order.customerName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest block">Phone</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{selectedIssue.order.phone}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest block">Address</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedIssue.order.address}, {selectedIssue.order.city}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Status & Metadata */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-gray-50/50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/85">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest block">Status</span>
                        <div className="mt-1">
                          <span className={cn(
                            "inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border",
                            selectedIssue.order.status === 'QC' ? "bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30" :
                            selectedIssue.order.status === 'Cancelled' ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30" :
                            selectedIssue.order.status === 'Shipped' ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30" :
                            selectedIssue.order.status === 'Delivered' ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" :
                            "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                          )}>
                            {selectedIssue.order.status}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-50/50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/85">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest block">Sales Executive</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block">{selectedIssue.order.invoiceBy || 'Website order'}</span>
                      </div>
                      <div className="bg-gray-50/50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/85 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest block">Order Date</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block">
                          {new Date(selectedIssue.order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/85">
                      <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Items Breakdown</h4>
                      <div className="space-y-3">
                        {selectedIssue.order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                                {item.quantity}
                              </span>
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white">{item.name}</span>
                                <span className="text-gray-400 dark:text-gray-500 ml-1 font-semibold">({item.selectedSize || 'F'})</span>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                              {formatPrice(item.price * item.quantity, currency, rate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Total / Summary */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/85 divide-y divide-gray-100 dark:divide-gray-800 space-y-3">
                      <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 pb-2">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatPrice(selectedIssue.order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), currency, rate)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 py-2">
                        <span>Delivery Charge</span>
                        <span className="font-mono">+{formatPrice(selectedIssue.order.deliveryCharge ?? 100, currency, rate)}</span>
                      </div>
                      {((selectedIssue.order as any).discount || 0) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-rose-500 py-2">
                          <span>Discount</span>
                          <span className="font-mono">-{formatPrice((selectedIssue.order as any).discount, currency, rate)}</span>
                        </div>
                      )}
                      {((selectedIssue.order as any).advancePayment || 0) > 0 && (
                        <div className="flex justify-between text-xs font-bold text-emerald-500 py-2">
                          <span>Advance Payment</span>
                          <span className="font-mono">-{formatPrice((selectedIssue.order as any).advancePayment, currency, rate)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black text-gray-950 dark:text-white pt-3">
                        <span className="uppercase tracking-wider text-xs">Total Collectable</span>
                        <span className="font-mono text-base text-rose-500">
                          {formatPrice(selectedIssue.order.total, currency, rate)}
                        </span>
                      </div>
                    </div>

                    {/* Order Notes */}
                    {selectedIssue.order.notes && (
                      <div className="bg-amber-50/40 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-100/50 dark:border-amber-950/30">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest block">Staff Notes</span>
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mt-1">{selectedIssue.order.notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Edit mode UI
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name input */}
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Customer Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                        />
                      </div>

                      {/* Phone input */}
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Customer Phone</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD] font-mono"
                        />
                      </div>

                      {/* Address input */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Shipping Address</label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                        />
                      </div>

                      {/* City dropdown */}
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1.5 block">City</label>
                        <select
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD] appearance-none cursor-pointer"
                        >
                          <option value="Dhaka">Dhaka (Inside)</option>
                          <option value="Chittagong">Chittagong</option>
                          <option value="Sylhet">Sylhet</option>
                          <option value="Rajshahi">Rajshahi</option>
                          <option value="Khulna">Khulna</option>
                          <option value="Barisal">Barisal</option>
                          <option value="Rangpur">Rangpur</option>
                          <option value="Mymensingh">Mymensingh</option>
                          <option value="Outside Dhaka">Outside Dhaka</option>
                        </select>
                      </div>

                      {/* Order Status dropdown */}
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Order Status</label>
                        <select
                          value={normalizeStatus(editStatus)}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD] appearance-none cursor-pointer uppercase"
                        >
                          <option value="ORDER PLACED">ORDER PLACED</option>
                          <option value="PRINTED">PRINTED</option>
                          <option value="PREPARING">PREPARING</option>
                          <option value="PICK UP CANCEL">PICK UP CANCEL</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="SUCCESS">SUCCESS</option>
                          <option value="PARTIAL DELIVERY">PARTIAL DELIVERY</option>
                          <option value="HOLD">HOLD</option>
                          <option value="RETURNED">RETURNED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>

                      {/* Delivery Charge input */}
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Delivery Charge (৳)</label>
                        <input
                          type="number"
                          value={editDeliveryCharge}
                          onChange={(e) => setEditDeliveryCharge(Number(e.target.value))}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD] font-mono"
                        />
                      </div>

                      {/* Discount input */}
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Discount (৳)</label>
                        <input
                          type="number"
                          value={editDiscount}
                          onChange={(e) => setEditDiscount(Number(e.target.value))}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD] font-mono"
                        />
                      </div>

                      {/* Advance Payment input */}
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Advance Payment (৳)</label>
                        <input
                          type="number"
                          value={editAdvancePayment}
                          onChange={(e) => setEditAdvancePayment(Number(e.target.value))}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD] font-mono"
                        />
                      </div>

                      {/* Invoice By dropdown */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest block">Sales Executive</label>
                          <button
                            type="button"
                            onClick={() => setShowAddInvoiceByModal(true)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                          >
                            <Plus size={11} className="stroke-[3]" />
                            <span>Add</span>
                          </button>
                        </div>
                        <select
                          value={editInvoiceBy}
                          onChange={(e) => setEditInvoiceBy(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD] appearance-none cursor-pointer"
                        >
                          <option value="Website order">Website order</option>
                          {invoiceByOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Notes text area */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1.5 block">Staff Notes</label>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#182235] border border-gray-200 dark:border-gray-850 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                        />
                      </div>
                    </div>

                    {/* Edit calculation preview */}
                    <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/30 flex justify-between items-center text-xs mt-4">
                      <div>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400 block uppercase tracking-wider text-[10px]">Calculated New Total</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">
                          Subtotal (৳{selectedIssue.order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}) + Delivery (৳{editDeliveryCharge}) - Discount (৳{editDiscount})
                        </span>
                      </div>
                      <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-lg">
                        {formatPrice(selectedIssue.order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + editDeliveryCharge - editDiscount, currency, rate)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 dark:bg-[#182235] border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end shrink-0">
                {orderModalMode === 'view' ? (
                  <>
                    <button
                      onClick={() => setShowOrderModal(false)}
                      className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer border-none"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setOrderModalMode('edit')}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md border-none"
                    >
                      <Edit2 size={13} />
                      <span>Edit Order</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setOrderModalMode('view')}
                      className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer border-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (isDeliveredOrSuccess(selectedIssue?.order?.status)) {
                          toast.error('ডেলিভার্ড বা সাকসেস অর্ডার এডিট করা যাবে না। (Delivered/Success order cannot be edited)');
                          return;
                        }
                        const computedSubtotal = selectedIssue.order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                        try {
                          toast.loading('Saving order changes...', { id: 'save-order-changes' });
                          await updateOrder(selectedIssue.id, {
                            customerName: editName,
                            phone: editPhone,
                            address: editAddress,
                            city: editCity,
                            status: editStatus,
                            deliveryCharge: editDeliveryCharge,
                            discount: editDiscount,
                            advancePayment: editAdvancePayment,
                            notes: editNotes,
                            total: computedSubtotal + editDeliveryCharge - editDiscount,
                            invoiceBy: editInvoiceBy
                          });
                          toast.success('Order attributes saved successfully!', { id: 'save-order-changes' });
                          setOrderModalMode('view');
                          setShowOrderModal(false);
                        } catch (e) {
                          toast.error('Failed to save order updates', { id: 'save-order-changes' });
                        }
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md border-none"
                    >
                      <Save size={13} />
                      <span>Save Changes</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Preview Modal */}
      <AnimatePresence>
        {showInvoiceModal && invoiceOrder && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 m-0 font-sans">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowInvoiceModal(false);
                setInvoiceOrder(null);
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F8F9FD] rounded-[20px] w-full max-w-[170mm] overflow-hidden shadow-2xl relative z-10 border border-gray-200 flex flex-col max-h-[92vh]"
            >
              {/* Header with actions */}
              <div className="p-4 px-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer size={16} className="text-gray-700" />
                  <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">Invoice Preview</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const invoiceElement = document.getElementById('invoice-to-print');
                      if (!invoiceElement) {
                        return;
                      }

                      // Create a hidden iframe
                      const iframe = document.createElement('iframe');
                      iframe.style.position = 'fixed';
                      iframe.style.right = '0';
                      iframe.style.bottom = '0';
                      iframe.style.width = '0';
                      iframe.style.height = '0';
                      iframe.style.border = '0';
                      document.body.appendChild(iframe);

                      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
                      if (!iframeDoc) {
                        return;
                      }

                      iframeDoc.open();
                      iframeDoc.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Print Invoice</title>
                            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap">
                            <script src="https://cdn.tailwindcss.com"></script>
                            <script>
                              tailwind.config = {
                                theme: {
                                  extend: {
                                    colors: {
                                      gray: {
                                        150: '#eceff1',
                                      }
                                    }
                                  }
                                }
                              }
                            </script>
                            <style>
                              @page {
                                size: A5 portrait;
                                margin: 0;
                              }
                              body {
                                margin: 0;
                                padding: 0;
                                background-color: #ffffff !important;
                                color: #111827 !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                              }
                              #invoice-to-print {
                                font-family: 'Plus Jakarta Sans', sans-serif !important;
                                width: 148mm !important;
                                min-h-[210mm] !important;
                                padding: 12mm 10mm 10mm 10mm !important;
                                box-sizing: border-box !important;
                                display: block !important;
                              }
                              .font-serif-luxury {
                                font-family: 'Cormorant Garamond', serif !important;
                              }
                              .font-mono-numbers {
                                font-family: 'JetBrains Mono', monospace !important;
                              }
                            </style>
                          </head>
                          <body class="bg-[#F8F9FD]">
                            <div id="invoice-to-print">
                              ${invoiceElement.innerHTML}
                            </div>
                            <script>
                              window.onload = function() {
                                window.focus();
                                setTimeout(function() {
                                  window.print();
                                  setTimeout(function() {
                                    window.parent.document.body.removeChild(window.frameElement);
                                  }, 1500);
                                }, 500);
                              };
                            </script>
                          </body>
                        </html>
                      `);
                      iframeDoc.close();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-lg"
                  >
                    <Printer size={13} />
                    <span>Print Now</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowInvoiceModal(false);
                      setInvoiceOrder(null);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Scrollable body containing the preview sheet */}
              <div className="p-6 overflow-y-auto flex justify-center bg-gray-100/50 max-h-[calc(92vh-70px)]">
                <div className="bg-[#F8F9FD] rounded-lg shadow-lg border border-gray-100">
                  <InvoiceTemplate order={invoiceOrder} preview={true} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-[#F8F9FD] rounded-3xl p-6 shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-4">
                <Trash2 size={24} className="stroke-[2.5]" stroke="currentColor" />
              </div>
              
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                {deleteConfirm.title}
              </h3>
              
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {deleteConfirm.message}
              </p>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteConfirm.onConfirm();
                  }}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-100"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal to add custom Invoice By name */}
      {showAddInvoiceByModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#F8F9FD] dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowAddInvoiceByModal(false);
                setCustomInvoiceByName('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-tight">
                  Add Sales Executive / Dispatcher
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">
                  ইনভয়েস প্রস্তুতকারীর নাম যোগ করুন
                </p>
              </div>
            </div>

            <form onSubmit={handleAddCustomInvoiceBy} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                  Executive Name / নাম
                </label>
                <input
                  type="text"
                  autoFocus
                  value={customInvoiceByName}
                  onChange={(e) => setCustomInvoiceByName(e.target.value)}
                  placeholder="e.g. Tanvir, Rakib, Office Sale..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddInvoiceByModal(false);
                    setCustomInvoiceByName('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Plus size={14} className="stroke-[3]" />
                  Add Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
