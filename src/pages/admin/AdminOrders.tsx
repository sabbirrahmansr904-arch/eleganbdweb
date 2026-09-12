import React, { useState, useMemo, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import * as XLSX from 'xlsx';
import InvoiceTemplate from '../../components/admin/InvoiceTemplate';
import { ParcelLiveStatusBadge } from '../../components/admin/ParcelLiveStatusBadge';
import { GoogleSheetImporterModal } from '../../components/admin/GoogleSheetImporterModal';
import { PathaoSyncModal } from '../../components/admin/PathaoSyncModal';
import CreateOrderModal from '../../components/admin/CreateOrderModal';
import { useInvoiceByOptions } from '../../hooks/useInvoiceByOptions';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { 
  Search, 
  Eye, 
  FileSpreadsheet,
  FileText,
  Truck,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronRight,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  AlertCircle,
  AlertTriangle,
  Plus,
  UserPlus,
  Camera,
  MessageSquare,
  Printer,
  Tag,
  Lock,
  ArrowLeftRight,
  Send,
  XCircle,
  CheckCircle2,
  Scan,
  ShoppingCart,
  Edit3,
  Trash2,
  Clock,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice, cn } from '../../lib/utils';
import { 
  isDeliveredOrSuccess, 
  compareOrdersByInvoice, 
  formatInvoiceNumber, 
  canChangeOrderStatus,
  formatOrderDate,
  formatOrderTime,
  formatOrderDateTime,
  formatOrderDateTimeStr
} from '../../utils/orderUtils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useOrders } from '../../contexts/OrderContext';
import { useProducts } from '../../contexts/ProductContext';
import { useAuth } from '../../contexts/AuthContext';
import { Order, CartItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { DISTRICT_THANAS } from '../../data/locations';
import { parseCustomerAddress } from '../../utils/addressParser';
import { Html5Qrcode } from 'html5-qrcode';
import { bookPathaoOrder, bookSteadfastOrder, trackCourierOrder } from '../../utils/apiClient';
import { analyzeCustomerTrust } from '../../utils/fraudDetector';
import AbandonedCheckoutsView from '../../components/admin/orders/AbandonedCheckoutsView';
import { getLocalAbandonedCheckouts } from '../../utils/abandonedCartHelper';
import { isPantProduct } from '../../utils/productSizeHelper';

export const getOrderFreeShippingDetails = (order: Order | null | undefined) => {
  if (!order) return { isFreeShipping: false, isPantPromo: false, pantCount: 0, title: null };
  const pantCount = Array.isArray(order.items) 
    ? order.items.filter(i => isPantProduct(i)).reduce((sum, i) => sum + (i.quantity || 1), 0)
    : 0;

  // Strict check: Only new customer orders with the explicit 3-pants promo tag or new flag
  const hasExplicitPantOffer = Boolean(
    order.freeShippingOffer?.includes('প্যান্ট') ||
    order.freeShippingOffer?.toLowerCase().includes('pant')
  );

  const isPantPromo = Boolean(
    hasExplicitPantOffer ||
    (order.isFreeShipping === true && pantCount >= 3 && order.deliveryCharge === 0 && Boolean(order.freeShippingOffer))
  );

  const isAnyFreeShipping = Boolean(
    order.isFreeShipping === true ||
    (order.deliveryCharge === 0 && Boolean(order.freeShippingOffer))
  );

  return {
    isFreeShipping: isAnyFreeShipping,
    isPantPromo,
    pantCount,
    title: isPantPromo ? '৩টি প্যান্টে ফ্রি ডেলিভারি' : (order.freeShippingOffer || (isAnyFreeShipping ? 'ফ্রি ডেলিভারি' : null))
  };
};

const normalizeStatus = (status: string): string => {
  const s = (status || '').toUpperCase().trim();
  if (s === 'PENDING') return 'ORDER PLACED';
  if (s === 'PROCESSING') return 'PREPARING';
  if (s === 'DELIVERED' || s === 'QC' || s === 'PARTIAL DELIVERY' || s === 'PARTIAL_DELIVERY' || s.includes('PARTIAL') || s === 'EXCHANGE' || s.includes('EXCHANGE')) return 'SUCCESS';
  return s;
};

export default function AdminOrders(): React.JSX.Element {
  const { currency, rate } = useCurrency();
  const { orders, loading, refreshOrders, updateOrderStatus, updateOrder, addOrder, deleteOrder, deleteMultipleOrders, deleteAllOrders, getNextOrderId } = useOrders();
  const { products } = useProducts();
  const { isAdmin, isSuperAdmin, isCEO } = useAuth();
  const navigate = useNavigate();

  const changeStatus = async (status: Order['status']) => {
    if (!selectedOrder) return;
    if (!canChangeOrderStatus(selectedOrder.status)) {
      toast.error('অর্ডারের স্ট্যাটাস পরিবর্তন করা সম্ভব নয় (Status Locked)।');
      return;
    }
    try {
      await updateOrderStatus(selectedOrder.id, status);
      setSelectedOrder(prev => prev ? { ...prev, status } : null);
      toast.success(`Order status updated to ${status}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterIssue, setFilterIssue] = useState('All'); // All | Issues | No Issues
  const [filterPartner, setFilterPartner] = useState('All'); // All | Online Store | Retail | Al Shahriar Kabir etc
  const [filterCourier, setFilterCourier] = useState('All');
  const [filterCreator, setFilterCreator] = useState('All');
  const [filterDelivery, setFilterDelivery] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'invoice' | 'date'>('invoice');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('All');
    setFilterIssue('All');
    setFilterPartner('All');
    setFilterCourier('All');
    setFilterCreator('All');
    setFilterDelivery('All');
    setStartDate('');
    setEndDate('');
    setVisibleCount(10);
  };
  const isAnyFilterActive = searchQuery.trim() !== '' || filterStatus !== 'All' || filterIssue !== 'All' || filterPartner !== 'All' || filterCourier !== 'All' || filterCreator !== 'All' || filterDelivery !== 'All' || startDate !== '' || endDate !== '';
  
  // Custom states matching screenshot behaviors
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Scanned orders / Bulk delivery states
  const [scannedOrders, setScannedOrders] = useState<Order[]>([]);
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [activeScanOrder, setActiveScanOrder] = useState<Order | null>(null);
  const [showLiveCameraSimulator, setShowLiveCameraSimulator] = useState(false);
  const [bookingToPathao, setBookingToPathao] = useState(false);
  
  // Pathao Booking Modal States
  const [pathaoBookingOrder, setPathaoBookingOrder] = useState<Order | null>(null);
  const [pathaoPickupStore, setPathaoPickupStore] = useState('Elegan BD — Ma Villa, House #11, Road #3, Block F, Section #1, Mirpur, Dhaka-1216');
  const [pathaoCity, setPathaoCity] = useState('');
  const [pathaoZone, setPathaoZone] = useState('');
  const [pathaoArea, setPathaoArea] = useState('');
  const [pathaoWeight, setPathaoWeight] = useState('0.5');
  const [pathaoDeliveryType, setPathaoDeliveryType] = useState('48'); // 48: Normal, 12 or 24: Express
  const [pathaoSpecialInstruction, setPathaoSpecialInstruction] = useState('');
  const [pathaoSuccessResult, setPathaoSuccessResult] = useState<{ success: boolean; consignment_id?: string; sms_text?: string } | null>(null);
  const [pathaoDetectedAddressInfo, setPathaoDetectedAddressInfo] = useState<{ districtBangla?: string; isAutoDetected?: boolean }>({});

  // Steadfast Booking Modal States
  const [steadfastBookingOrder, setSteadfastBookingOrder] = useState<Order | null>(null);
  const [isBookingToSteadfast, setIsBookingToSteadfast] = useState(false);
  const [steadfastSuccessResult, setSteadfastSuccessResult] = useState<{ success: boolean; consignment_id: string; tracking_code: string; sms_text: string } | null>(null);
  const [steadfastNote, setSteadfastNote] = useState('');
  
  // HTML5 QrCode camera tracking states
  const html5QrcodeRef = React.useRef<Html5Qrcode | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isCameraScannerActive, setIsCameraScannerActive] = useState(false);
  
  // Pagination State (Show first 10 orders initially, then load more)
  const [visibleCount, setVisibleCount] = useState(10);
  
  // Bulk Selection
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Active status dropdown state to match interactive screenshot behaviors
  const [activeStatusDropdownOrderId, setActiveStatusDropdownOrderId] = useState<string | null>(null);

  // Edit Order States
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editThana, setEditThana] = useState('');
  const [editStatus, setEditStatus] = useState<Order['status']>('Pending');
  const [editDeliveryCharge, setEditDeliveryCharge] = useState(100);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editAdvancePayment, setEditAdvancePayment] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editInvoiceBy, setEditInvoiceBy] = useState<string>('');
  
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
  const [showBulkInvoiceModal, setShowBulkInvoiceModal] = useState(false);
  const [showGoogleSheetModal, setShowGoogleSheetModal] = useState(false);
  const [showPathaoSyncModal, setShowPathaoSyncModal] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Orders vs Abandoned View Mode
  const [ordersViewMode, setOrdersViewMode] = useState<'orders' | 'abandoned'>('orders');
  const [abandonedCount, setAbandonedCount] = useState<number>(0);

  useEffect(() => {
    try {
      const list = getLocalAbandonedCheckouts();
      setAbandonedCount(list.filter(c => c.status === 'abandoned').length);
    } catch (e) {}
  }, [ordersViewMode]);

  // Issue Conversation Modal States
  const [issueConversationOrder, setIssueConversationOrder] = useState<Order | null>(null);
  const [readyToShipClicked, setReadyToShipClicked] = useState(false);
  const [cancelRequestedClicked, setCancelRequestedClicked] = useState(false);

  const [paymentsConfig, setPaymentsConfig] = useState({
    codEnabled: true,
    codLogo: '',
    bkashEnabled: true,
    bkashNumber: '01619835133',
    bkashType: 'Personal',
    bkashLogo: '',
    nagadEnabled: true,
    nagadNumber: '01619835133',
    nagadType: 'Personal',
    nagadLogo: '',
    rocketEnabled: true,
    rocketNumber: '01619835133',
    rocketType: 'Personal',
    rocketLogo: ''
  });

  useEffect(() => {
    setVisibleCount(10);
  }, [searchQuery, filterStatus, filterIssue, filterPartner, filterCourier, filterCreator, filterDelivery, startDate, endDate]);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'payments'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPaymentsConfig({
            codEnabled: data.codEnabled !== undefined ? data.codEnabled : true,
            codLogo: data.codLogo || '',
            bkashEnabled: data.bkashEnabled !== undefined ? data.bkashEnabled : true,
            bkashNumber: data.bkashNumber || '01619835133',
            bkashType: data.bkashType || 'Personal',
            bkashLogo: data.bkashLogo || '',
            nagadEnabled: data.nagadEnabled !== undefined ? data.nagadEnabled : true,
            nagadNumber: data.nagadNumber || '01619835133',
            nagadType: data.nagadType || 'Personal',
            nagadLogo: data.nagadLogo || '',
            rocketEnabled: data.rocketEnabled !== undefined ? data.rocketEnabled : true,
            rocketNumber: data.rocketNumber || '01619835133',
            rocketType: data.rocketType || 'Personal',
            rocketLogo: data.rocketLogo || ''
          });
        }
      } catch (err) {
        console.error("Failed to load payments config in AdminOrders:", err);
      }
    };
    fetchPayments();
  }, []);

  useEffect(() => {
    setReadyToShipClicked(false);
    setCancelRequestedClicked(false);
  }, [issueConversationOrder]);
  const [newIssueType, setNewIssueType] = useState('Normal');
  const [newUrgency, setNewUrgency] = useState('Normal');
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [issueReplyText, setIssueReplyText] = useState('');
  const [isEditingIssueMeta, setIsEditingIssueMeta] = useState(false);
  const [issueMetaType, setIssueMetaType] = useState('QC');
  const [issueMetaUrgency, setIssueMetaUrgency] = useState('Normal');

  // Editing and creating orders modal state
  const [editingOrderForModal, setEditingOrderForModal] = useState<Order | null>(null);

  const openOrderInCreateModal = (order: Order) => {
    setEditingOrderForModal(order);
    setSelectedOrder(null);
    setShowCreateModal(true);
  };

  const [editingTrackingOrderId, setEditingTrackingOrderId] = useState<string | null>(null);
  const [tempTrackingId, setTempTrackingId] = useState('');
  const { options: invoiceByOptions, addOption: addInvoiceByOption } = useInvoiceByOptions();
  const [showAddInvoiceByModal, setShowAddInvoiceByModal] = useState(false);
  const [customInvoiceByName, setCustomInvoiceByName] = useState('');
  const [addingForField, setAddingForField] = useState<'create' | 'edit'>('create');

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
      if (addingForField === 'edit') {
        setEditInvoiceBy(trimmed);
      }
      setCustomInvoiceByName('');
      setShowAddInvoiceByModal(false);
    } else {
      toast.error('Failed to save name. Please try again.');
    }
  };

  // Helper deterministic dispatcher name generator for the 'INVOICE BY' column matching screenshot names (or custom manual creations)
  const getInvoiceBy = React.useCallback((order: Order) => {
    if (order.invoiceBy) {
      return order.invoiceBy;
    }
    // Backward compatibility for older orders
    if (order.email?.includes('manual_admin') || order.customerId === 'manual_admin') {
      return 'Office Sale';
    }
    return 'Website order';
  }, []);

  // Helper issue flag
  const hasActiveIssue = React.useCallback((order: Order) => {
    if (!order) return false;
    if (order.issueType && order.issueStatus !== 'resolved') return true;
    if (order.status === 'Cancelled' || order.status === 'Hold') return true;
    return false;
  }, []);

  // Helper to render procedural QR code visualization with its custom text scan code
  const renderOrderQRCode = React.useCallback((orderId: string) => {
    const idStr = String(orderId || '');
    const hash = idStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const size = 5;
    const pixels = [];
    for (let i = 0; i < size * size; i++) {
      const active = ((hash + i * 7) % 3 === 0) || (i === 0 || i === size - 1 || i === size * (size - 1) || i === size * size - 1 || i === 12);
      pixels.push(active);
    }
    const scanCode = `SCAN-${idStr.slice(-6).toUpperCase()}`;

    return (
      <div className="flex items-center gap-2.5">
        <div className="grid grid-cols-5 gap-[1.5px] p-1.5 bg-[#F8F9FD] border border-gray-200/80 rounded-lg w-8 h-8 shrink-0 shadow-3xs hover:border-emerald-500/50 hover:bg-emerald-50/15 transition-all" title={`Click to copy scan code: ${scanCode}`}>
          {pixels.map((active, i) => (
            <div 
              key={i} 
              className={cn(
                "rounded-[0.5px] transition-colors duration-300",
                active ? "bg-[#0C1421]" : "bg-transparent"
              )} 
            />
          ))}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest leading-none">QR Code</span>
          <span 
            onClick={() => {
              navigator.clipboard.writeText(scanCode);
              toast.success(`Copied Scan Code: ${scanCode}`);
            }}
            className="text-[12px] font-black text-gray-700 font-mono leading-none mt-1 hover:text-black cursor-pointer underline decoration-dotted decoration-gray-300 hover:decoration-emerald-500"
          >
            {scanCode}
          </span>
        </div>
      </div>
    );
  }, []);

  React.useEffect(() => {
    if (selectedOrder) {
      setEditName(selectedOrder.customerName || '');
      setEditPhone(selectedOrder.phone || '');
      setEditAddress(selectedOrder.address || '');
      setEditCity(selectedOrder.city || '');
      setEditThana((selectedOrder as any).thana || '');
      setEditStatus(selectedOrder.status || 'Pending');
      setEditDeliveryCharge(selectedOrder.deliveryCharge ?? 100);
      setEditDiscount((selectedOrder as any).discount ?? 0);
      setEditAdvancePayment((selectedOrder as any).advancePayment ?? (selectedOrder.paymentMethod === 'bkash' || selectedOrder.paymentMethod === 'nagad' || selectedOrder.paymentMethod === 'rocket' ? 100 : 0));
      setEditNotes((selectedOrder as any).notes || '');
      setEditInvoiceBy(selectedOrder.invoiceBy || (selectedOrder.customerId === 'manual_admin' ? 'Office Sale' : 'Website order'));
      setIsEditingDetails(false);
    }
  }, [selectedOrder]);

  // Filter Logic
  const filteredOrders = useMemo(() => {
    const list = (orders || []).filter(order => {
      if (!order) return false;
      // 1. Status Filter
      if (filterStatus !== 'All') {
        if (normalizeStatus(order.status) !== filterStatus) return false;
      }
      
      // 2. Search query match
      const queryLower = searchQuery.toLowerCase().trim();
      if (queryLower !== '') {
        const matchesId = (order.id || '').toLowerCase().includes(queryLower);
        const matchesClient = (order.customerName || '').toLowerCase().includes(queryLower);
        const matchesPhone = (order.phone || '').includes(queryLower);
        const matchesCity = (order.city || '').toLowerCase().includes(queryLower);
        const matchesSKU = Array.isArray(order.items) && order.items.some(it => it.sku?.toLowerCase().includes(queryLower) || it.name?.toLowerCase().includes(queryLower));
        const matchesInvoice = order.invoiceNo !== undefined && String(order.invoiceNo).includes(queryLower);
        
        if (!matchesId && !matchesClient && !matchesPhone && !matchesCity && !matchesSKU && !matchesInvoice) {
          return false;
        }
      }

      // 3. Issue filter
      const activeIssue = hasActiveIssue(order);
      if (filterIssue === 'Issues' && !activeIssue) return false;
      if (filterIssue === 'No Issues' && activeIssue) return false;

      // 4. Partner/Invoice By filter
      if (filterPartner !== 'All') {
        const invoiceBy = getInvoiceBy(order);
        if (invoiceBy !== filterPartner) return false;
      }

      // 5. Courier filter
      if (filterCourier !== 'All') {
        const oCourier = order.courier || (order as any).courierName || 'Pathao';
        if (oCourier.toLowerCase() !== filterCourier.toLowerCase()) return false;
      }

      // 6. Creator filter
      if (filterCreator !== 'All') {
        const oCreator = order.invoiceBy || order.customerId || 'Online Store';
        if (oCreator !== filterCreator) return false;
      }

      // 7. Delivery filter
      if (filterDelivery !== 'All') {
        const cityLower = (order.city || '').toLowerCase();
        const isDhaka = cityLower.includes('dhaka') || cityLower.includes('inside');
        if (filterDelivery === 'Inside Dhaka' && !isDhaka) return false;
        if (filterDelivery === 'Outside Dhaka' && isDhaka) return false;
      }

      // 8. Date Range Filter
      if (startDate) {
        const orderDate = new Date(order.createdAt);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const orderDate = new Date(order.createdAt);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortField === 'invoice') {
        return compareOrdersByInvoice(a, b, sortDirection);
      } else {
        const timeA = new Date(a.createdAt || 0).getTime() || (typeof a.updatedAt === 'number' ? a.updatedAt : 0) || 0;
        const timeB = new Date(b.createdAt || 0).getTime() || (typeof b.updatedAt === 'number' ? b.updatedAt : 0) || 0;
        return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
      }
    });
  }, [orders, sortField, sortDirection, filterStatus, searchQuery, filterIssue, filterPartner, filterCourier, filterCreator, filterDelivery, startDate, endDate, hasActiveIssue, getInvoiceBy]);

  const uniquePartners = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach(order => {
      if (!order) return;
      const val = getInvoiceBy(order);
      if (val) set.add(val);
    });
    return Array.from(set);
  }, [orders, getInvoiceBy]);

  const uniqueCouriers = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach(order => {
      if (!order) return;
      const oCourier = order.courier || (order as any).courierName || 'Pathao';
      if (oCourier) set.add(oCourier);
    });
    return Array.from(set);
  }, [orders]);

  const uniqueCreators = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach(order => {
      if (!order) return;
      const oCreator = order.invoiceBy || order.customerId || 'Online Store';
      if (oCreator) set.add(oCreator);
    });
    return Array.from(set);
  }, [orders]);

  // Bulk actions
  const handleToggleSelect = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter(item => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const handleToggleSelectAll = () => {
    const idsOnPage = filteredOrders.slice(0, visibleCount).map(o => o.id);
    const allSelected = idsOnPage.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(selectedOrderIds.filter(id => !idsOnPage.includes(id)));
    } else {
      setSelectedOrderIds([...new Set([...selectedOrderIds, ...idsOnPage])]);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Order['status']) => {
    const targetOrder = orders.find(o => o.id === id);
    if (targetOrder && !canChangeOrderStatus(targetOrder.status)) {
      toast.error('অর্ডারের স্ট্যাটাস পরিবর্তন করা সম্ভব নয় (Status Locked)।');
      return;
    }
    try {
      await updateOrderStatus(id, newStatus);
      const shortId = id.slice(-6);
      toast.success(`Order #${shortId} status updated to: ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const handleCreateIssue = async () => {
    if (!issueConversationOrder || !newIssueDesc.trim()) return;
    if (isDeliveredOrSuccess(issueConversationOrder.status)) {
      toast.error('ডেলিভার্ড বা সাকসেস অর্ডারে কোনো ইস্যু ক্রিয়েট করা যাবে না। (Delivered/Success orders cannot have issues created)');
      return;
    }
    try {
      const initialReply = {
        sender: 'admin' as const,
        message: newIssueDesc.trim(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
      const updatedData = {
        issueType: newIssueType,
        issueUrgency: newUrgency,
        issueStatus: 'open' as const,
        issueReplies: [initialReply]
      };
      await updateOrder(issueConversationOrder.id, updatedData);
      
      const updatedOrder = {
        ...issueConversationOrder,
        ...updatedData
      };
      setIssueConversationOrder(updatedOrder);
      setNewIssueDesc('');
      toast.success('Internal discussion thread started!');
    } catch (err) {
      toast.error('Failed to create issue');
    }
  };

  const handleSendIssueReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueConversationOrder || !issueReplyText.trim()) return;
    if (isDeliveredOrSuccess(issueConversationOrder.status) && (!issueConversationOrder.issueType || issueConversationOrder.issueStatus === 'resolved')) {
      toast.error('ডেলিভার্ড বা সাকসেস অর্ডারে কোনো ইস্যু ক্রিয়েট করা যাবে না। (Delivered/Success orders cannot have issues created)');
      return;
    }
    try {
      const timestampStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const newReply = {
        sender: 'admin' as const,
        message: issueReplyText.trim(),
        timestamp: timestampStr
      };

      let updatedOrderData: any = {};
      const existingReplies = issueConversationOrder.issueReplies || [];
      const updatedReplies = [...existingReplies, newReply];

      if (!issueConversationOrder.issueType || issueConversationOrder.issueStatus === 'resolved') {
        // Automatically create/activate or re-activate issue
        updatedOrderData = {
          issueType: issueConversationOrder.issueType || 'QC',
          issueUrgency: issueConversationOrder.issueUrgency || 'Normal',
          issueStatus: 'open' as const,
          issueReplies: updatedReplies
        };
      } else {
        updatedOrderData = {
          issueReplies: updatedReplies
        };
      }
      
      await updateOrder(issueConversationOrder.id, updatedOrderData);
      
      const updatedOrder = {
        ...issueConversationOrder,
        ...updatedOrderData
      };
      setIssueConversationOrder(updatedOrder);
      setIssueReplyText('');
      toast.success('Reply submitted & issue activated!');
    } catch (err) {
      toast.error('Failed to send reply');
    }
  };

  const handleToggleIssueStatus = async (status: 'open' | 'resolved') => {
    if (!issueConversationOrder) return;
    try {
      await updateOrder(issueConversationOrder.id, {
        issueStatus: status
      });
      const updatedOrder = {
        ...issueConversationOrder,
        issueStatus: status
      };
      setIssueConversationOrder(updatedOrder);
      toast.success(`Issue marked as ${(status || '').toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to change issue status');
    }
  };

  const handleSyncPathao = () => {
    setShowPathaoSyncModal(true);
  };

  const handleScanOrderSubmit = (orderIdToScan: string) => {
    const trimmedId = orderIdToScan.trim();
    if (!trimmedId) return;

    // Clean any "SCAN-" prefix if they wrote or scanned the exact code
    const searchKey = trimmedId.toLowerCase().replace(/^scan-/i, '');
    const invoiceNum = parseInt(trimmedId, 10);
    const searchKeyNum = parseInt(searchKey, 10);

    // Find the order that matches or ends with the ID, or matches the scan code suffix, or matches invoice number
    const order = orders.find(o => {
      if (!o) return false;
      const orderIdStr = String(o.id || '').toLowerCase();
      return (
        orderIdStr === trimmedId.toLowerCase() || 
        orderIdStr.endsWith(trimmedId.toLowerCase()) ||
        orderIdStr.endsWith(searchKey) ||
        orderIdStr.slice(-6) === searchKey ||
        (typeof o.invoiceNo === 'number' && o.invoiceNo === invoiceNum) ||
        (typeof o.invoiceNo === 'number' && o.invoiceNo === searchKeyNum)
      );
    });
    
    if (!order) {
      toast.error(`Order "${trimmedId}" not found in database!`);
      return;
    }

    // 1. Check if already scanned in session (second time "nibe na")
    if (scannedIds.includes(order.id) || (activeScanOrder && activeScanOrder.id === order.id)) {
      toast.error(`Scan Rejected! Order #${(order.id || '').slice(-6).toUpperCase()} has already been scanned in this session.`);
      return;
    }

    // 2. Check if order has issues ("jdi order tay kono issue thake tahole seta scan nibe na")
    const hasIssue = order.issueType || order.status === 'Cancelled' || order.status === 'Delivered';
    if (hasIssue) {
      let issueReason = "Cancelled or already Delivered";
      if (order.issueType) {
        issueReason = `Sizing/Transit flag: ${order.issueType}`;
      } else if (order.status === 'Cancelled') {
        issueReason = "Order is Cancelled";
      } else if (order.status === 'Delivered') {
        issueReason = "Order is already Delivered";
      }
      toast.error(`Scan Rejected! Order has issues: ${issueReason}`);
      return;
    }

    // Play high-fidelity scanner beep sound!
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio feedback blocked:", e);
    }

    // Set as active pending confirmation
    setActiveScanOrder(order);
    setScanInput('');
    toast.success(`Scanned Order #${(order.id || '').slice(-6).toUpperCase()}!`);
  };

  const handleBookPathao = async () => {
    if (!pathaoBookingOrder) return;
    
    const parsedLoc = parseCustomerAddress(pathaoBookingOrder.address, pathaoBookingOrder.city, pathaoBookingOrder.thana);
    const finalCity = pathaoCity || parsedLoc.city || pathaoBookingOrder.city || 'Dhaka';
    const finalZone = pathaoZone || parsedLoc.zone || pathaoBookingOrder.thana || 'Central';

    setBookingToPathao(true);

    // Build the custom order object to send to the backend
    const updatedOrder = {
      ...pathaoBookingOrder,
      city: finalCity,
      thana: finalZone,
      zone: finalZone,
      areaId: Number(pathaoArea) || undefined,
      orderNote: pathaoSpecialInstruction,
      item_weight: Number(pathaoWeight) || 0.5,
      delivery_type: Number(pathaoDeliveryType) || 48
    };

    const shortCode = pathaoBookingOrder.invoiceNo ? String(pathaoBookingOrder.invoiceNo) : String(pathaoBookingOrder.id || '').replace(/^ORD-?/i, '');
    const loadingToast = toast.loading(`Booking Order #${shortCode} with Pathao API...`);

    try {
      const { ok, data } = await bookPathaoOrder(updatedOrder);
      
      if (ok && data.success) {
        const consignment_id = data.consignment_id || "PL-000000";
        const charge = pathaoBookingOrder.courierCharge || 120;
        const payout = Math.max(0, (pathaoBookingOrder.total || 0) - charge);
        // Update Firestore status
        if (updateOrder) {
          await updateOrder(pathaoBookingOrder.id, { 
            status: 'Shipped', 
            trackingId: consignment_id,
            trackingCode: consignment_id, 
            pathaoConsignmentId: consignment_id,
            courier: 'Pathao',
            partner: 'Pathao',
            courierCharge: charge,
            courierPayoutAmount: payout
          });
        } else {
          await updateOrderStatus(pathaoBookingOrder.id, 'Shipped', true);
        }

        // Display success box and mock SMS send info
        setPathaoSuccessResult({
          success: true,
          consignment_id,
          sms_text: `Dear ${pathaoBookingOrder.customerName || 'Customer'}, your order #${shortCode} has been booked via Pathao Courier. Tracking Consignment ID is ${consignment_id}. Thank you for choosing ELEGAN.`
        });
        toast.success("Successfully booked Pathao courier!", { id: loadingToast });
      } else {
        toast.error(`Pathao Error: ${data.error || 'Failed to book order'}`, { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(`Network Error: ${err.message}`, { id: loadingToast });
    } finally {
      setBookingToPathao(false);
    }
  };

  const handleBookSteadfast = async () => {
    if (!steadfastBookingOrder) return;
    setIsBookingToSteadfast(true);

    const updatedOrder = {
      ...steadfastBookingOrder,
      orderNote: steadfastNote
    };

    const shortCode = (steadfastBookingOrder?.id || '').slice(-6).toUpperCase();
    const loadingToast = toast.loading(`Booking Order #${shortCode} with Steadfast API...`);

    try {
      const { ok, data } = await bookSteadfastOrder(updatedOrder);
      
      if (ok && data.success) {
        const consignmentId = data.consignmentId || "SF000000";
        const trackingCode = data.trackingCode || consignmentId;
        if (updateOrder) {
          await updateOrder(steadfastBookingOrder.id, { 
            status: 'Shipped', 
            trackingCode: trackingCode, 
            steadfastConsignmentId: consignmentId 
          });
        } else {
          await updateOrderStatus(steadfastBookingOrder.id, 'Shipped', true);
        }

        setSteadfastSuccessResult({
          success: true,
          consignment_id: String(consignmentId),
          tracking_code: trackingCode,
          sms_text: `Dear ${steadfastBookingOrder.customerName || 'Customer'}, your order #${shortCode} has been booked via Steadfast Courier. Tracking code is ${trackingCode}. Thank you for choosing ELEGAN.`
        });
        toast.success("Successfully booked Steadfast courier!", { id: loadingToast });
      } else {
        toast.error(`Steadfast Error: ${data.error || 'Failed to book order'}`, { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(`Network Error: ${err.message}`, { id: loadingToast });
    } finally {
      setIsBookingToSteadfast(false);
    }
  };

  const handleConfirmPathaoEntry = async () => {
    if (!activeScanOrder) return;
    
    // Block Pathao entry if order has an active issue
    if (activeScanOrder.issueType && activeScanOrder.issueStatus !== 'resolved') {
      toast.error("Cannot book order with active issue!");
      return;
    }
    
    setBookingToPathao(true);
    const shortCode = (activeScanOrder?.id || '').slice(-6).toUpperCase();
    const loadingToast = toast.loading(`Booking Order #${shortCode} with Pathao API...`);
    
    try {
      const { ok, data } = await bookPathaoOrder(activeScanOrder);

      if (ok && data.success) {
        const consignment_id = data.consignment_id || "PL-000000";
        const charge = activeScanOrder.courierCharge || 120;
        const payout = Math.max(0, (activeScanOrder.total || 0) - charge);
        // Update the order status to 'Shipped' and save consignment ID
        if (updateOrder) {
          await updateOrder(activeScanOrder.id, { 
            status: 'Shipped', 
            trackingId: consignment_id,
            trackingCode: consignment_id, 
            pathaoConsignmentId: consignment_id,
            courier: 'Pathao',
            partner: 'Pathao',
            courierCharge: charge,
            courierPayoutAmount: payout
          });
        } else {
          await updateOrderStatus(activeScanOrder.id, 'Shipped', true);
        }
        
        // Store in session arrays
        setScannedOrders(prev => [activeScanOrder, ...prev]);
        setScannedIds(prev => [...prev, activeScanOrder.id]);
        
        toast.success(`Successfully created parcel in Pathao Merchant Portal! Consignment ID: ${data.consignment_id}`, { id: loadingToast, duration: 8000 });
      } else {
        toast.error(`Pathao API Error: ${data.error || 'Failed to create order'}`, { id: loadingToast, duration: 7000 });
      }
    } catch (err: any) {
      toast.error(`Network Error calling Pathao API: ${err.message}`, { id: loadingToast });
    } finally {
      setActiveScanOrder(null);
      setBookingToPathao(false);
    }
  };

  // Auto-activate native device camera scanning when the Bulk Delivery modal is opened.
  React.useEffect(() => {
    let html5QrcodeInstance: Html5Qrcode | null = null;
    
    if (showCamera) {
      setCameraPermissionError(null);
      setIsCameraScannerActive(false);
      
      // Delay slightly to let the modal mount its DOM elements so element ID exists
      const timer = setTimeout(() => {
        const elementId = "real-device-camera-scanner";
        const element = document.getElementById(elementId);
        if (!element) {
          console.warn("Camera viewport element not found in DOM yet");
          return;
        }
        
        try {
          html5QrcodeInstance = new Html5Qrcode(elementId);
          html5QrcodeRef.current = html5QrcodeInstance;
          
          html5QrcodeInstance.start(
            { facingMode: "environment" }, // Auto rear-camera for Android / iPhone
            {
              fps: 15,
              qrbox: (width, height) => {
                // Return dynamic size for high safety margins on small screens
                const boxSize = Math.min(width, height, 250);
                return { width: boxSize, height: boxSize };
              },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              // On successful scan!
              handleScanOrderSubmit(decodedText);
            },
            (errorMessage) => {
              // Ignore standard frame-by-frame parse noise
            }
          ).then(() => {
            setIsCameraScannerActive(true);
            setCameraPermissionError(null);
          }).catch(err => {
            console.error("Native scanner initiation failed:", err);
            // Attempt to fall back to general camera if facingMode environment gets strict rejection or lack of WebRTC constraints
            html5QrcodeInstance?.start(
              { facingMode: "user" },
              { fps: 15, qrbox: { width: 220, height: 220 } },
              (decodedText) => handleScanOrderSubmit(decodedText),
              () => {}
            ).then(() => {
              setIsCameraScannerActive(true);
              setCameraPermissionError(null);
            }).catch(fallbackErr => {
              console.error("Camera fallback failed too:", fallbackErr);
              setCameraPermissionError(
                "Camera view restricted. Make sure you grant camera access permissions on your browser or open the app in a secure context (HTTPS/new tab). You can still scan by typing or clicking the available codes below!"
              );
            });
          });
        } catch (setupError: any) {
          console.error("Html5Qrcode setup error:", setupError);
          setCameraPermissionError(setupError.message || "Failed to initialize device camera.");
        }
      }, 350);

      return () => {
        clearTimeout(timer);
        if (html5QrcodeInstance) {
          if (html5QrcodeInstance.isScanning) {
            html5QrcodeInstance.stop()
              .then(() => {
                try {
                  html5QrcodeInstance?.clear();
                } catch(e) {}
                console.log("Camera stopped successfully");
              })
              .catch(err => console.warn("Failed to stop scanner cleanly:", err));
          }
        }
      };
    }
  }, [showCamera]);

  const handleExportExcel = () => {
    try {
      const ordersToExport = selectedOrderIds.length > 0
        ? orders.filter(o => selectedOrderIds.includes(o.id))
        : filteredOrders;

      if (ordersToExport.length === 0) {
        toast.error('No orders to export');
        return;
      }

      const exportData = ordersToExport.map(o => {
        const dateObj = new Date(o.createdAt);
        const dateStr = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString('en-GB')
          : (o.createdAt || '');

        const locationStr = [o.city, o.thana].filter(Boolean).join(', ') || o.city || 'Inside Dhaka';

        const productCodeStr = o.items && o.items.length > 0
          ? o.items.map(it => `${it.sku || it.id || it.name}${it.selectedSize ? ' (' + it.selectedSize + ')' : ''}`).join(', ')
          : '';

        const totalQty = o.items && o.items.length > 0
          ? o.items.reduce((sum, it) => sum + (it.quantity || 1), 0)
          : 1;

        const advance = (o as any).advancePayment || o.paidAmount || 0;
        const billTotal = o.total || 0;
        const collectable = Math.max(0, billTotal - advance);

        return {
          'Date': dateStr,
          'Invoice ID': o.id,
          'Name': o.customerName || '',
          'Number': o.phone || '',
          'Address': o.address || '',
          'Location': locationStr,
          'Product Code': productCodeStr,
          'QTY': totalQty,
          'Bill Total': billTotal,
          'Collectable': collectable,
          'STATUS': o.status || 'Pending'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
      XLSX.writeFile(workbook, `Elegan_BD_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${exportData.length} order(s) exported to Excel successfully!`);
    } catch (err) {
      console.error("Export Excel error:", err);
      toast.error('Failed to export Excel file');
    }
  };  const handlePrintSelectedInvoices = () => {
    if (selectedOrderIds.length === 0) {
      toast.error('No orders selected for printing');
      return;
    }
    setShowBulkInvoiceModal(true);
  };

  const executePrintBulkInvoices = async () => {
    try {
      if (selectedOrderIds.length === 0) {
        toast.error('No orders selected for printing');
        return;
      }

      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));

      // Mark the selected orders as PRINTED
      await Promise.all(
        selectedOrders.map(async (o) => {
          if (normalizeStatus(o.status) !== 'PRINTED') {
            await updateOrderStatus(o.id, 'PRINTED');
          }
        })
      );

      // Collect host document styles to preserve Tailwind and custom typography
      const stylesHtml = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      let pagesHtml = '';
      selectedOrders.forEach((order) => {
        // Create a temporary container to render the invoice template HTML string if DOM items are missing
        const div = document.createElement('div');
        div.innerHTML = `<div class="p-4 bg-white text-black"><h1 class="text-xl font-bold">Invoice #${order.invoiceNo || order.id}</h1><p>Customer: ${order.customerName}</p><p>Phone: ${order.phone}</p><p>Address: ${order.address}</p><p>Total: ${order.total}</p></div>`;
        pagesHtml += `
          <div class="bulk-invoice-page">
            ${div.innerHTML}
          </div>
        `;
      });

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        toast.error('Failed to prepare print document');
        return;
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Selected Invoices (${selectedOrders.length})</title>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap">
            ${stylesHtml}
            <style>
              @page {
                size: A5 portrait;
                margin: 0;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: #ffffff !important;
                color: #111827 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .bulk-invoice-page {
                display: block !important;
                page-break-after: always !important;
                page-break-inside: avoid !important;
                width: 148mm !important;
                min-height: 210mm !important;
                padding: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                position: relative !important;
                background: #ffffff !important;
              }
              .bulk-invoice-page > div {
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                padding: 8mm 8mm 6mm 8mm !important;
                margin: 0 !important;
                width: 148mm !important;
                min-height: 210mm !important;
                position: relative !important;
                transform: none !important;
                display: block !important;
                box-sizing: border-box !important;
              }
            </style>
          </head>
          <body class="bg-[#F8F9FD]">
            ${pagesHtml}
            <script>
              window.onload = function() {
                window.focus();
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    if (window.frameElement && window.frameElement.parentNode) {
                      window.frameElement.parentNode.removeChild(window.frameElement);
                    }
                  }, 1500);
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      iframeDoc.close();

      setShowBulkInvoiceModal(false);
      toast.success(`${selectedOrders.length} invoice(s) sent to printer`);
    } catch (err) {
      console.error('[Bulk Print Error]', err);
      toast.error('Failed to launch printer');
    }
  };

  const handleSaveOrderFromModal = async (orderData: Partial<Order>, isEdit: boolean, orderId?: string) => {
    if (isEdit && orderId) {
      await updateOrder(orderId, orderData);
    } else {
      await addOrder(orderData as Order);
    }
  };

  // Status mapping labels and color setups
  const getStatusBadge = (status: Order['status']) => {
    const text = normalizeStatus(status);
    switch (text) {
      case 'ORDER PLACED':
        return {
          text: 'ORDER PLACED',
          class: 'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]',
        };
      case 'PRINTED':
        return {
          text: 'PRINTED',
          class: 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]',
        };
      case 'PREPARING':
        return {
          text: 'PREPARING',
          class: 'bg-[#E3F2FD] text-[#0D47A1] border-[#BBDEFB]',
        };
      case 'PICK UP CANCEL':
        return {
          text: 'PICK UP CANCEL',
          class: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]',
        };
      case 'SHIPPED':
        return {
          text: 'SHIPPED',
          class: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',
        };
      case 'SUCCESS':
      case 'DELIVERED':
        return {
          text: 'SUCCESS',
          class: 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]',
        };
      case 'PARTIAL DELIVERY':
        return {
          text: 'PARTIAL DELIVERY',
          class: 'bg-[#E0F7FA] text-[#006064] border-[#B2EBF2]',
        };
      case 'HOLD':
        return {
          text: 'HOLD',
          class: 'bg-[#FFF5F5] text-[#9B2C2C] border-[#FEB2B2]',
        };
      case 'RETURNED':
        return {
          text: 'RETURNED',
          class: 'bg-[#FFF0F0] text-[#E53E3E] border-[#FED7D7]',
        };
      case 'CANCELLED':
        return {
          text: 'CANCELLED',
          class: 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]',
        };
      default: 
        return {
          text: String(status || '').toUpperCase(),
          class: 'bg-gray-100 text-gray-500 border-gray-200',
        };
    }
  };

  return (
    <div className="w-full max-w-none space-y-4 pb-24 font-sans text-gray-900 px-0">
      {invoiceOrder && createPortal(
        <InvoiceTemplate order={invoiceOrder} preview={false} />,
        document.body
      )}

      {selectedOrderIds.length > 0 && (
        <div id="bulk-invoices-to-print" className="hidden">
          {orders
            .filter(o => selectedOrderIds.includes(o.id))
            .map(order => (
              <div key={order.id} className="bulk-invoice-item">
                <InvoiceTemplate order={order} preview={true} />
              </div>
            ))}
        </div>
      )}
      
      {/* Brand & Page Header matching screenshot EXACTLY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 pb-1">
        <div className="flex items-center gap-3.5">
          <div className="bg-[#EBF5FF] text-[#2563EB] p-3 rounded-2xl shadow-sm border border-[#D0E7FF]/40 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
                Orders
              </h1>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-xs font-black">
                {orders.length} Total
              </span>
              {filteredOrders.length !== orders.length ? (
                <button
                  onClick={resetAllFilters}
                  title="Click to clear all filters and show all orders"
                  className="px-2.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-full text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-3xs"
                >
                  <RotateCcw size={11} className="stroke-[2.5]" />
                  <span>Showing {filteredOrders.length} of {orders.length} (Reset)</span>
                </button>
              ) : (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-black">
                  All Showing
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#64748B] font-semibold mt-0.5">
              Detailed spreadsheet-style order tracking and real-time management.
            </p>
          </div>
        </div>

        {/* Global Actions Bar matching screenshot */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
          >
            <FileSpreadsheet size={13} className="stroke-[2.5]" />
            <span>EXPORT{selectedOrderIds.length > 0 ? ` (${selectedOrderIds.length})` : ''}</span>
          </button>

          <button 
            onClick={() => setShowGoogleSheetModal(true)}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
            title="Scan or Import orders directly from Google Sheet / Excel with original dates"
          >
            <FileSpreadsheet size={13} className="text-emerald-600 stroke-[2.5]" />
            <span>Sheet Import</span>
          </button>

          {selectedOrderIds.length > 0 && (
            <>
              <button 
                onClick={handlePrintSelectedInvoices}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2 animate-fadeIn"
              >
                <Printer size={13} className="stroke-[2.5] text-blue-600" />
                <span>PRINT SELECTED ({selectedOrderIds.length})</span>
              </button>

              <button 
                onClick={() => {
                  const count = selectedOrderIds.length;
                  setDeleteConfirm({
                    isOpen: true,
                    title: `Delete ${count} Selected Orders?`,
                    message: `Are you sure you want to PERMANENTLY DELETE ${count} selected orders? They will be removed completely from both cloud databases and will not return.`,
                    onConfirm: async () => {
                      try {
                        const targetIds = [...selectedOrderIds];
                        setSelectedOrderIds([]);
                        const promise = deleteMultipleOrders(targetIds);
                        toast.promise(promise, {
                          loading: `Deleting ${count} orders...`,
                          success: `${count} orders permanently deleted`,
                          error: (err) => `Failed: ${err.message || 'Error'}`
                        });
                        await promise;
                      } catch (err: any) {
                        console.error('[AdminOrders] Bulk Delete Error:', err);
                      } finally {
                        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                      }
                    }
                  });
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2 animate-fadeIn"
              >
                <Trash2 size={13} className="stroke-[2.5]" />
                <span>DELETE SELECTED ({selectedOrderIds.length})</span>
              </button>
            </>
          )}

          {orders.length > 0 && (
            <button 
              onClick={() => {
                setDeleteConfirm({
                  isOpen: true,
                  title: `Clear & Delete ALL (${orders.length}) Orders?`,
                  message: `Are you sure you want to PERMANENTLY REMOVE ALL ${orders.length} orders to start completely fresh? All orders will be wiped from both Supabase & Firestore databases.`,
                  onConfirm: async () => {
                    try {
                      setSelectedOrderIds([]);
                      const promise = deleteAllOrders();
                      toast.promise(promise, {
                        loading: 'Clearing all orders...',
                        success: 'All orders removed successfully. Ready for new orders!',
                        error: (err) => `Failed: ${err.message || 'Error'}`
                      });
                      await promise;
                    } catch (err: any) {
                      console.error('[AdminOrders] Delete All Error:', err);
                    } finally {
                      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                    }
                  }
                });
              }}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              title="Delete all orders to start fresh"
            >
              <Trash2 size={13} className="stroke-[2.5] text-rose-600" />
              <span>CLEAR ALL ORDERS</span>
            </button>
          )}

          <button 
            onClick={() => setShowCamera(true)}
            className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
          >
            <Truck size={13} className="stroke-[2.5]" />
            <span>Delivery</span>
          </button>

          <button 
            onClick={() => {
              setShowCamera(true);
              setShowLiveCameraSimulator(true);
            }}
            className="p-2.5 bg-[#E6F4EA] hover:bg-[#D4EDDA] text-[#137333] border border-[#CEEAD6] rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center"
            title="Scan Barcode / QR Code"
          >
            <Camera size={14} className="stroke-[2.5]" />
          </button>

          <button 
            onClick={handleSyncPathao}
            className="px-4 py-2.5 bg-[#F8F9FD] hover:bg-slate-50 border border-slate-200 text-slate-800 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
          >
            <RefreshCw size={13} className="text-emerald-500 stroke-[2.5]" />
            <span>Sync Pathao</span>
          </button>

          <button 
            onClick={async () => {
              const toastId = toast.loading('Syncing all orders with database...');
              try {
                await refreshOrders();
                toast.success(`Real-time sync complete! All orders loaded.`, { id: toastId });
              } catch (err: any) {
                toast.error(`Sync failed: ${err?.message || 'Unknown error'}`, { id: toastId });
              }
            }}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
            title="Real-time reload and synchronize all orders directly from database"
          >
            <RefreshCw size={13} className={`text-indigo-600 stroke-[2.5] ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Orders</span>
          </button>

          <button 
            onClick={() => {
              setEditingOrderForModal(null);
              setShowCreateModal(true);
            }}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
          >
            <Plus size={13} className="stroke-[3]" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      {/* Outer container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 p-3.5 md:p-5 shadow-sm space-y-4">
        
        {/* View Mode Switcher: Active Orders vs Abandoned Cart Leads */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrdersViewMode('orders')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer",
                ordersViewMode === 'orders' 
                  ? "bg-[#0C1421] text-white shadow-sm" 
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              )}
            >
              <ShoppingCart size={14} />
              <span>সব অর্ডার ({orders.length})</span>
            </button>

            <button
              onClick={() => setOrdersViewMode('abandoned')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative",
                ordersViewMode === 'abandoned' 
                  ? "bg-amber-600 text-white shadow-sm" 
                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
              )}
            >
              <AlertCircle size={14} className={ordersViewMode === 'abandoned' ? 'text-white' : 'text-amber-600'} />
              <span>হারিয়ে যাওয়া কাস্টমার / Abandoned Carts</span>
              {abandonedCount > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black",
                  ordersViewMode === 'abandoned' ? "bg-white text-amber-900" : "bg-amber-600 text-white"
                )}>
                  {abandonedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {ordersViewMode === 'abandoned' ? (
          <AbandonedCheckoutsView />
        ) : (
          <>
            {/* Interactive Filters Grid / Bar */}
        <div className="flex flex-row items-center gap-1.5 bg-[#F8F9FD] dark:bg-slate-800/90 p-2.5 rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto no-scrollbar whitespace-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] sm:min-w-[300px] max-w-[420px] shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 stroke-[2.2]" />
            <input 
              type="text"
              placeholder="Search Order #, Phone, Name, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[#F8F9FD] border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl placeholder-gray-400 text-slate-800 focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB]/40 outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Date Picker matching mm/dd/yyyy - mm/dd/yyyy in screenshot */}
          <div className="flex items-center gap-1 bg-[#F8F9FD] border border-slate-200 rounded-xl px-2 py-1.5 shadow-3xs shrink-0">
            <div className="relative flex items-center gap-1 text-[11px] text-slate-700 font-semibold">
              <Calendar size={11} className="text-slate-400" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none p-0 text-[11px] font-bold focus:ring-0 focus:outline-none cursor-pointer w-[80px] text-slate-800"
                placeholder="mm/dd/yyyy"
              />
            </div>
            <span className="text-slate-300 font-bold">-</span>
            <div className="relative flex items-center gap-1 text-[11px] text-slate-700 font-semibold">
              <Calendar size={11} className="text-slate-400" />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none p-0 text-[11px] font-bold focus:ring-0 focus:outline-none cursor-pointer w-[80px] text-slate-800"
                placeholder="mm/dd/yyyy"
              />
            </div>
          </div>

          {/* ISSUES Dropdown */}
          <div className="relative shrink-0">
            <select
              value={filterIssue}
              onChange={(e) => setFilterIssue(e.target.value)}
              className="appearance-none bg-[#F8F9FD] hover:bg-slate-50 border border-slate-200 pl-2.5 pr-6 py-1.5 text-[10px] font-extrabold tracking-wider uppercase rounded-xl text-slate-700 cursor-pointer focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/30 outline-none transition-all shadow-3xs"
            >
              <option value="All">⚠️ ISSUES: ALL</option>
              <option value="Issues">⚠️ ISSUES ONLY</option>
              <option value="No Issues">✔️ NO ISSUES</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none stroke-[2]" />
          </div>

          {/* STATUS Dropdown */}
          <div className="relative shrink-0">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-[#F8F9FD] hover:bg-slate-50 border border-slate-200 pl-2.5 pr-6 py-1.5 text-[10px] font-extrabold tracking-wider uppercase rounded-xl text-slate-700 cursor-pointer focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/30 outline-none transition-all shadow-3xs"
            >
              <option value="All">📦 STATUS: ALL</option>
              <option value="ORDER PLACED">ORDER PLACED</option>
              <option value="PRINTED">PRINTED</option>
              <option value="PREPARING">PREPARING</option>
              <option value="Ready">READY TO SHIP</option>
              <option value="PICK UP CANCEL">PICK UP CANCEL</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PARTIAL DELIVERY">PARTIAL DELIVERY</option>
              <option value="HOLD">HOLD</option>
              <option value="RETURNED">RETURNED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none stroke-[2]" />
          </div>

          {/* PARTNER Dropdown */}
          <div className="relative shrink-0">
            <select
              value={filterPartner}
              onChange={(e) => setFilterPartner(e.target.value)}
              className="appearance-none bg-[#F8F9FD] hover:bg-slate-50 border border-slate-200 pl-2.5 pr-6 py-1.5 text-[10px] font-extrabold tracking-wider uppercase rounded-xl text-slate-700 cursor-pointer focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/30 outline-none transition-all shadow-3xs"
            >
              <option value="All">🤝 PARTNER: ALL</option>
              {uniquePartners.map(p => (
                <option key={p} value={p}>{String(p || '').toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none stroke-[2]" />
          </div>

          {/* COURIER Dropdown */}
          <div className="relative shrink-0">
            <select
              value={filterCourier}
              onChange={(e) => setFilterCourier(e.target.value)}
              className="appearance-none bg-[#F8F9FD] hover:bg-slate-50 border border-slate-200 pl-2.5 pr-6 py-1.5 text-[10px] font-extrabold tracking-wider uppercase rounded-xl text-slate-700 cursor-pointer focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/30 outline-none transition-all shadow-3xs"
            >
              <option value="All">🚚 COURIER: ALL</option>
              <option value="Pathao">PATHAO</option>
              <option value="Steadfast">STEADFAST</option>
              {uniqueCouriers.filter(c => c.toLowerCase() !== 'pathao' && c.toLowerCase() !== 'steadfast').map(c => (
                <option key={c} value={c}>{String(c || '').toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none stroke-[2]" />
          </div>

          {/* CREATOR Dropdown */}
          <div className="relative shrink-0">
            <select
              value={filterCreator}
              onChange={(e) => setFilterCreator(e.target.value)}
              className="appearance-none bg-[#F8F9FD] hover:bg-slate-50 border border-slate-200 pl-2.5 pr-6 py-1.5 text-[10px] font-extrabold tracking-wider uppercase rounded-xl text-slate-700 cursor-pointer focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/30 outline-none transition-all shadow-3xs"
            >
              <option value="All">👤 CREATOR: ALL</option>
              {uniqueCreators.map(cr => (
                <option key={cr} value={cr}>{String(cr || '').toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none stroke-[2]" />
          </div>

          {/* DELIVERY Dropdown */}
          <div className="relative shrink-0">
            <select
              value={filterDelivery}
              onChange={(e) => setFilterDelivery(e.target.value)}
              className="appearance-none bg-[#F8F9FD] hover:bg-slate-50 border border-slate-200 pl-2.5 pr-6 py-1.5 text-[10px] font-extrabold tracking-wider uppercase rounded-xl text-slate-700 cursor-pointer focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/30 outline-none transition-all shadow-3xs"
            >
              <option value="All">📍 DELIVERY: ALL</option>
              <option value="Inside Dhaka">INSIDE DHAKA</option>
              <option value="Outside Dhaka">OUTSIDE DHAKA</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none stroke-[2]" />
          </div>

          {/* SORT BY INVOICE SERIAL / DATE */}
          <div className="relative shrink-0">
            <select
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('_') as ['invoice' | 'date', 'desc' | 'asc'];
                setSortField(f);
                setSortDirection(d);
              }}
              className="appearance-none bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 pl-2.5 pr-6 py-1.5 text-[10px] font-black tracking-wider uppercase rounded-xl text-blue-800 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 outline-none transition-all shadow-3xs"
              title="Change list sorting"
            >
              <option value="invoice_desc">🔢 INVOICE: HIGH → LOW (SERIAL)</option>
              <option value="invoice_asc">🔢 INVOICE: LOW → HIGH (SERIAL)</option>
              <option value="date_desc">📅 DATE: NEWEST FIRST</option>
              <option value="date_asc">📅 DATE: OLDEST FIRST</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none stroke-[2.5]" />
          </div>

          {/* RESET FILTERS BUTTON */}
          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 shrink-0"
              title="Reset all search queries and dropdown filters"
            >
              <RotateCcw size={11} className="stroke-[2.5]" />
              <span>RESET FILTERS ({filteredOrders.length}/{orders.length})</span>
            </button>
          )}
        </div>



        {/* Table/Card representation */}
        <div className="overflow-x-auto elegant-scrollbar pb-3">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 px-4">
            {loading && orders.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-150 p-6">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-black text-[#0D1829] uppercase tracking-wide">Loading Orders...</p>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Syncing real-time orders from database</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-150 p-6">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3 border border-slate-200">
                  <AlertCircle className="w-5 h-5 stroke-[1.5]" />
                </div>
                <p className="text-sm font-black text-[#0D1829] uppercase">
                  {orders.length > 0 ? `No Orders Match Active Filters (${orders.length} in database)` : 'No Orders Found'}
                </p>
                {orders.length > 0 ? (
                  <button
                    onClick={resetAllFilters}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition-all inline-flex items-center gap-2"
                  >
                    <RotateCcw size={13} className="stroke-[2.5]" />
                    <span>Show All {orders.length} Orders</span>
                  </button>
                ) : (
                  <button
                    onClick={() => refreshOrders()}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition-all inline-flex items-center gap-2"
                  >
                    <RefreshCw size={13} className="stroke-[2.5]" />
                    <span>Reload Orders</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredOrders.length !== orders.length && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-2 shadow-3xs animate-fadeIn">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                        <RotateCcw size={13} className="stroke-[2.5]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-amber-950 truncate">
                          Showing {filteredOrders.length} of {orders.length} orders
                        </div>
                        <div className="text-[10px] text-amber-700 font-semibold truncate">
                          Filter active • Tap Reset to show all
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={resetAllFilters}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-[11px] rounded-xl shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <span>Show All {orders.length}</span>
                    </button>
                  </div>
                )}
                {filteredOrders.slice(0, visibleCount).map((order) => {
              const s = normalizeStatus(order.status).toUpperCase();
              const isSuccess = s === 'SUCCESS' || s === 'DELIVERED' || isDeliveredOrSuccess(order.status);
              const isCancelledOrReturned = s === 'CANCELLED' || s === 'RETURNED' || s === 'PICK UP CANCEL' || s.includes('CANCEL') || s.includes('RETURN');

              const cardBg = isSuccess
                ? "bg-[#E8F8EE] border-emerald-300/80 shadow-xs hover:border-emerald-400"
                : isCancelledOrReturned
                  ? "bg-[#FEF2F2] border-rose-200 shadow-sm hover:border-rose-300"
                  : "bg-[#EBF1F7] border-slate-200/90 shadow-2xs hover:bg-[#E2E9F1]";

              const itemsBoxBg = isSuccess
                ? "bg-white/90 border border-emerald-200/90 shadow-3xs"
                : isCancelledOrReturned
                  ? "bg-white/85 border border-rose-100/90 shadow-3xs"
                  : "bg-slate-50";

              const dividerClass = isSuccess
                ? "border-emerald-200/80"
                : isCancelledOrReturned
                  ? "border-rose-200/70"
                  : "border-slate-100";

              const buttonClass = isSuccess
                ? "p-2 bg-white/95 border border-emerald-200/90 rounded-lg transition-all text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/80 cursor-pointer shadow-3xs"
                : isCancelledOrReturned
                  ? "p-2 bg-white/90 border border-rose-100/80 rounded-lg transition-all text-rose-800 hover:text-rose-950 hover:bg-rose-100/60 cursor-pointer shadow-3xs"
                  : "p-2 bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-slate-700 cursor-pointer";

              return (
                <div key={order.id} className={cn("rounded-2xl p-4 transition-all border", cardBg)} onClick={() => setSelectedOrder(order)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        checked={selectedOrderIds.includes(order.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => {
                          if (selectedOrderIds.includes(order.id)) {
                            setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                          } else {
                            setSelectedOrderIds([...selectedOrderIds, order.id]);
                          }
                        }}
                      />
                      <span className="font-bold text-slate-800">#{formatInvoiceNumber(order)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-flex items-center">
                        {!canChangeOrderStatus(order.status) ? (
                          <div 
                            title="এই স্ট্যাটাসের অর্ডার পরিবর্তন করা সম্ভব নয় (Status Locked)"
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 text-[9px] font-extrabold rounded-full border shadow-3xs uppercase tracking-wider select-none cursor-not-allowed",
                              getStatusBadge(order.status).class
                            )}
                          >
                            <Lock size={9} className="stroke-[2.5]" />
                            <span>{normalizeStatus(order.status)}</span>
                          </div>
                        ) : (
                          <>
                            <select
                              value={normalizeStatus(order.status)}
                              onChange={(e) => {
                                const newStatus = e.target.value as Order['status'];
                                handleStatusChange(order.id, newStatus);
                              }}
                              className={cn(
                                "appearance-none pr-5 pl-2.5 py-1 text-[9px] font-extrabold rounded-full border cursor-pointer select-none transition-all shadow-3xs uppercase tracking-wider outline-none",
                                getStatusBadge(order.status).class
                              )}
                            >
                              <option value="ORDER PLACED" className="bg-white text-slate-800 font-bold">ORDER PLACED</option>
                              <option value="PRINTED" className="bg-white text-slate-800 font-bold">PRINTED</option>
                              <option value="PREPARING" className="bg-white text-slate-800 font-bold">PREPARING</option>
                              <option value="Ready" className="bg-white text-slate-800 font-bold">READY TO SHIP</option>
                              <option value="PICK UP CANCEL" className="bg-white text-slate-800 font-bold">PICK UP CANCEL</option>
                              <option value="SHIPPED" className="bg-white text-slate-800 font-bold">SHIPPED</option>
                              <option value="SUCCESS" className="bg-white text-slate-800 font-bold">SUCCESS</option>
                              <option value="PARTIAL DELIVERY" className="bg-white text-slate-800 font-bold">PARTIAL DELIVERY</option>
                              <option value="HOLD" className="bg-white text-slate-800 font-bold">HOLD</option>
                              <option value="RETURNED" className="bg-white text-slate-800 font-bold">RETURNED</option>
                              <option value="CANCELLED" className="bg-white text-slate-800 font-bold">CANCELLED</option>
                            </select>
                            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5] opacity-70" />
                          </>
                        )}
                      </div>
                      <ParcelLiveStatusBadge order={order} />
                    </div>
                  </div>
                  {/* Customer Info & Trust Indicator */}
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="text-sm font-black text-slate-850">{order.customerName || 'Anonymous Customer'}</div>
                    {(() => {
                      const trust = analyzeCustomerTrust(order, orders);
                      return (
                        <span 
                          className={cn("px-2 py-0.5 rounded-full text-[10px] font-extrabold border tracking-tight shrink-0", trust.badgeColor)}
                          title={trust.reasons.join('\n')}
                        >
                          {trust.title}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-600 mb-2">{order.phone}</div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-xs text-slate-400 font-medium">{formatOrderDateTimeStr(order.createdAt)}</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50/90 text-indigo-700 border border-indigo-200/80 rounded-lg text-[11px] font-extrabold tracking-tight shadow-3xs">
                      <User size={12} className="stroke-[2.5]" />
                      <span className="text-slate-500 font-semibold">Invoice By:</span>
                      <span className="text-indigo-950 font-black">{getInvoiceBy(order)}</span>
                    </span>
                  </div>
                  
                  <div className={cn("p-3 rounded-xl mb-4 transition-all", itemsBoxBg)}>
                    {(() => {
                      const freeInfo = getOrderFreeShippingDetails(order);
                      if (freeInfo.isPantPromo) {
                        return (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 mb-2.5 shadow-3xs">
                            <Truck size={12} className="text-emerald-700 stroke-[2.5]" />
                            <span>🎉 ৩টি ফরমাল প্যান্টে ফ্রি ডেলিভারি অফার (ডেলিভারি: ৳০)</span>
                          </div>
                        );
                      }
                      if (freeInfo.isFreeShipping) {
                        return (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 mb-2.5 shadow-3xs">
                            <Truck size={12} className="text-emerald-700 stroke-[2.5]" />
                            <span>🎉 ফ্রি ডেলিভারি অফার (ডেলিভারি: ৳০)</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="text-sm font-bold text-slate-800 mb-1">
                      {Array.isArray(order.items) && order.items.length > 0 ? order.items.map(i => i.name).join(', ') : 'No items'}
                    </div>
                    <div className="text-xs text-slate-600">
                      {Array.isArray(order.items) && order.items.length > 0 ? order.items.map(i => `${i.selectedSize || 'M'} (x${i.quantity || 1})`).join(', ') : '—'}
                    </div>
                  </div>
                  
                  <div className={cn("flex justify-between items-center mt-4 pt-4 border-t", dividerClass)}>
                    <div className="text-sm font-black text-indigo-600">{formatPrice(order.total, currency, rate)}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const orderId = order.id;
                          const shortId = formatInvoiceNumber(order);
                          setDeleteConfirm({
                            isOpen: true,
                            title: `Delete Order #${shortId}?`,
                            message: `Are you sure you want to PERMANENTLY DELETE Order #${shortId}? This cannot be undone.`,
                            onConfirm: async () => {
                              try {
                                const deletePromise = deleteOrder(orderId);
                                toast.promise(deletePromise, {
                                  loading: 'Deleting...',
                                  success: 'Order deleted',
                                  error: (err) => `Failed: ${err?.message || 'Permission denied'}`
                                });
                                await deletePromise;
                              } catch (err: any) {
                                toast.error(err?.message || 'Error');
                              } finally {
                                setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                              }
                            }
                          });
                        }}
                        title="Delete Order"
                        className={isSuccess || isCancelledOrReturned ? buttonClass : "p-2 bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-rose-600 cursor-pointer"}
                      >
                        <Trash2 size={18} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} title="View Details" className={buttonClass}><Eye size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setIssueConversationOrder(order); }} title="Order Issues" className={buttonClass}><MessageSquare size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setInvoiceOrder(order); setShowInvoiceModal(true); if (canChangeOrderStatus(order.status) && normalizeStatus(order.status) !== 'PRINTED') { updateOrderStatus(order.id, 'PRINTED'); } }} title="Print Invoice" className={buttonClass}><Printer size={18} /></button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedOrder(order); 
                          setIsEditingDetails(true); 
                        }} 
                        title="Edit Order" 
                        className={buttonClass}
                      >
                        <Tag size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredOrders.length > visibleCount && (
              <div className="pt-2 pb-1 flex flex-col gap-2">
                <button
                  onClick={() => setVisibleCount(prev => prev + 10)}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>More ({filteredOrders.length - visibleCount} Remaining)</span>
                </button>
                <button
                  onClick={() => setVisibleCount(filteredOrders.length)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Show All ({filteredOrders.length})</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

          {/* Desktop Table View */}
          <table className="hidden md:table w-full text-left border-separate border-spacing-y-3 min-w-[1500px]">
            <thead>
              <tr className="text-[11px] font-black tracking-wider text-slate-500 h-10 select-none uppercase">
                <th className="py-3 px-4 font-semibold text-left w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrderIds(filteredOrders.map(o => o.id));
                      } else {
                        setSelectedOrderIds([]);
                      }
                    }}
                  />
                </th>
                <th 
                  className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap cursor-pointer hover:bg-slate-200/50 rounded-lg transition-colors select-none group"
                  onClick={() => {
                    if (sortField === 'date') {
                      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortField('date');
                      setSortDirection('desc');
                    }
                  }}
                  title="Click to sort by Date"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <span className="text-slate-400 group-hover:text-slate-700">
                      {sortField === 'date' ? (
                        sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-blue-600" /> : <ArrowUp className="w-3 h-3 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Time</th>
                <th 
                  className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap cursor-pointer hover:bg-slate-200/50 rounded-lg transition-colors select-none group"
                  onClick={() => {
                    if (sortField === 'invoice') {
                      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortField('invoice');
                      setSortDirection('desc');
                    }
                  }}
                  title="Click to sort by Invoice Serial"
                >
                  <div className="flex items-center gap-1">
                    <span>Invoice No</span>
                    <span className="text-slate-400 group-hover:text-slate-700">
                      {sortField === 'invoice' ? (
                        sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-blue-600" /> : <ArrowUp className="w-3 h-3 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Invoice By</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Status</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Courier</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Name</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Phone</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Email</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Address</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">SKU</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Size</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Qty</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Subtotal</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Advance</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Collectable</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Note</th>
                <th className="py-3 px-4 font-bold text-left text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Tracking ID</th>
                <th className="py-3 px-6 font-bold text-center text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap sticky right-0 z-10">Action</th>
              </tr>
            </thead>
            <tbody className="bg-transparent">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-24 text-center bg-[#EBF1F7] rounded-2xl border border-slate-200">
                    <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm font-black text-[#0D1829] uppercase tracking-wide">Loading Orders...</p>
                    <p className="text-xs text-slate-400 mt-1 font-semibold">Syncing real-time orders from database</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-24 text-center bg-[#EBF1F7] rounded-2xl border border-slate-200">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3 border border-slate-200">
                      <AlertCircle className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-black text-[#0D1829] uppercase">
                      {orders.length > 0 ? `No Orders Match Active Filters (${orders.length} in database)` : 'No Orders Found'}
                    </p>
                    {orders.length > 0 ? (
                      <div className="mt-3">
                        <button
                          onClick={resetAllFilters}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition-all inline-flex items-center gap-2"
                        >
                          <RotateCcw size={13} className="stroke-[2.5]" />
                          <span>Show All {orders.length} Orders</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <button
                          onClick={() => refreshOrders()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition-all inline-flex items-center gap-2"
                        >
                          <RefreshCw size={13} className="stroke-[2.5]" />
                          <span>Reload Orders</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOrders.slice(0, visibleCount).map((order) => {
                  const dateTime = formatOrderDateTime(order.createdAt);
                  const cleanId = formatInvoiceNumber(order);
                  const initial = order.customerName ? order.customerName.charAt(0).toUpperCase() : 'A';
                  const itemsSummary = order.items && order.items.length > 0
                    ? order.items.map(item => `${item.name}${item.selectedSize ? ` — Pant Size: ${item.selectedSize}` : ''}`).join(', ')
                    : 'No items';

                  const rowStatus = normalizeStatus(order.status).toUpperCase();
                  const isRowSuccess = rowStatus === 'SUCCESS' || rowStatus === 'DELIVERED' || isDeliveredOrSuccess(order.status);
                  const isRowCancelledOrReturned = rowStatus === 'CANCELLED' || rowStatus === 'RETURNED' || rowStatus === 'PICK UP CANCEL' || rowStatus.includes('CANCEL') || rowStatus.includes('RETURN');

                  const rowBgClass = order.issueType && order.issueStatus !== 'resolved'
                    ? "[&>td]:bg-[#FFF5F5] hover:[&>td]:bg-[#FFEBEB] [&>td]:border-rose-200"
                    : isRowSuccess
                      ? "[&>td]:bg-[#E8F8EE] hover:[&>td]:bg-[#DCF5E3] [&>td]:border-emerald-200/90"
                      : isRowCancelledOrReturned
                        ? "[&>td]:bg-[#FEF2F2] hover:[&>td]:bg-[#FEE2E2] [&>td]:border-rose-200"
                        : "[&>td]:bg-[#EBF1F7] hover:[&>td]:bg-[#E2E9F1] [&>td]:border-slate-200/80";

                  const stickyActionBg = order.issueType && order.issueStatus !== 'resolved'
                    ? "bg-[#FFF5F5] group-hover:bg-[#FFEBEB]"
                    : isRowSuccess
                      ? "bg-[#E8F8EE] group-hover:bg-[#DCF5E3]"
                      : isRowCancelledOrReturned
                        ? "bg-[#FEF2F2] group-hover:bg-[#FEE2E2]"
                        : "bg-[#EBF1F7] group-hover:bg-[#E2E9F1]";

                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className={cn(
                        "transition-all cursor-pointer group h-16 [&>td]:border-y [&>td]:first:border-l [&>td]:last:border-r [&>td]:first:rounded-l-2xl [&>td]:last:rounded-r-2xl [&>td]:shadow-2xs",
                        rowBgClass
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => {
                            if (selectedOrderIds.includes(order.id)) {
                              setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                            } else {
                              setSelectedOrderIds([...selectedOrderIds, order.id]);
                            }
                          }}
                        />
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-[#475569] font-sans font-semibold">
                        {dateTime.date}
                      </td>

                      {/* Time */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-[#475569] font-sans font-semibold">
                        {dateTime.time}
                      </td>

                      {/* Order No */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs">
                        <div className="flex flex-col text-left gap-1">
                          <span className="font-bold text-slate-900 font-mono-numbers">{cleanId}</span>
                          {(() => {
                            const freeInfo = getOrderFreeShippingDetails(order);
                            if (freeInfo.isPantPromo) {
                              return (
                                <span 
                                  title="৩টি ফরমাল প্যান্ট অর্ডারে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি"
                                  className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-3xs"
                                >
                                  <Truck size={9} className="stroke-[3] text-emerald-600" />
                                  ৩টি প্যান্টে ফ্রি ডেলিভারি
                                </span>
                              );
                            }
                            if (freeInfo.isFreeShipping) {
                              return (
                                <span 
                                  className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200"
                                >
                                  <Truck size={9} className="stroke-[3] text-emerald-600" />
                                  ফ্রি ডেলিভারি
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {order.issueType && (
                            order.issueStatus === 'resolved' ? (
                              <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                                <CheckCircle2 size={10} className="stroke-[3]" />
                                SOLVED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-[#FFF0F0] text-[#EB5757] border border-red-200">
                                <AlertTriangle size={10} className="stroke-[3]" />
                                ACTIVE
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Invoice By */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-[#475569] font-semibold">
                        {getInvoiceBy(order)}
                      </td>

                      {/* Status Dropdown Pill */}
                      <td className="py-4 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                          <div className="relative inline-flex items-center">
                            {!canChangeOrderStatus(order.status) ? (
                              <div 
                                title="এই স্ট্যাটাসের অর্ডার পরিবর্তন করা সম্ভব নয় (Status Locked)"
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold rounded-full border shadow-3xs uppercase tracking-wider select-none cursor-not-allowed",
                                  getStatusBadge(order.status).class
                                )}
                              >
                                <Lock size={10} className="stroke-[2.5]" />
                                <span>{normalizeStatus(order.status)}</span>
                              </div>
                            ) : (
                              <>
                                <select
                                  value={normalizeStatus(order.status)}
                                  onChange={(e) => {
                                    const newStatus = e.target.value as Order['status'];
                                    handleStatusChange(order.id, newStatus);
                                  }}
                                  className={cn(
                                    "appearance-none pr-6 pl-3 py-1.5 text-[10px] font-extrabold rounded-full border cursor-pointer select-none transition-all shadow-3xs uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#2563EB]/20",
                                    getStatusBadge(order.status).class
                                  )}
                                >
                                  <option value="ORDER PLACED" className="bg-white text-slate-800 font-bold py-1.5">ORDER PLACED</option>
                                  <option value="PRINTED" className="bg-white text-slate-800 font-bold py-1.5">PRINTED</option>
                                  <option value="PREPARING" className="bg-white text-slate-800 font-bold py-1.5">PREPARING</option>
                                  <option value="Ready" className="bg-white text-slate-800 font-bold py-1.5">READY TO SHIP</option>
                                  <option value="PICK UP CANCEL" className="bg-white text-slate-800 font-bold py-1.5">PICK UP CANCEL</option>
                                  <option value="SHIPPED" className="bg-white text-slate-800 font-bold py-1.5">SHIPPED</option>
                                  <option value="SUCCESS" className="bg-white text-slate-800 font-bold py-1.5">SUCCESS</option>
                                  <option value="PARTIAL DELIVERY" className="bg-white text-slate-800 font-bold py-1.5">PARTIAL DELIVERY</option>
                                  <option value="HOLD" className="bg-white text-slate-800 font-bold py-1.5">HOLD</option>
                                  <option value="RETURNED" className="bg-white text-slate-800 font-bold py-1.5">RETURNED</option>
                                  <option value="CANCELLED" className="bg-white text-slate-800 font-bold py-1.5">CANCELLED</option>
                                </select>
                                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5] opacity-70" />
                              </>
                            )}
                          </div>

                          <ParcelLiveStatusBadge order={order} />
                        </div>
                      </td>

                      {/* Courier */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-700 font-semibold" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 bg-[#F1F5F9]/60 hover:bg-[#F1F5F9] px-2.5 py-1.5 rounded-lg border border-slate-200/40 w-fit cursor-pointer">
                          <span>{order.courier || 'Pathao'}</span>
                          <ChevronDown size={11} className="text-slate-400 stroke-[2.5]" />
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-4 px-4 text-xs text-slate-800">
                        <div className="font-bold text-slate-850">{order.customerName || 'Anonymous Customer'}</div>
                        {(() => {
                          const trust = analyzeCustomerTrust(order, orders);
                          return (
                            <div className="mt-1">
                              <span 
                                className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border tracking-tight shadow-3xs", trust.badgeColor)}
                                title={trust.reasons.join(' • ')}
                              >
                                {trust.title}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600 font-sans font-semibold">
                        {order.phone || '—'}
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                        {order.email && order.email !== 'manual_admin' ? order.email : '—'}
                      </td>

                      {/* Address */}
                      <td className="py-4 px-4 text-xs text-slate-600 font-medium max-w-[260px]" title={`${order.address || ''}${order.thana ? `, Thana: ${order.thana}` : ''}, ${order.city || ''}`}>
                        <div className="font-semibold text-slate-800 truncate">{order.address || '—'}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {order.city && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                              📍 {order.city}
                            </span>
                          )}
                          {order.thana && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                              🏛️ {order.thana}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-bold text-[#2563EB]">
                        {Array.isArray(order.items) && order.items.length > 0 
                          ? order.items.map(item => item?.sku || (item?.id ? `EP-${String(item.id).slice(-4).toUpperCase()}` : 'EP-ITEM')).join(', ') 
                          : '—'}
                      </td>

                      {/* Size */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(order.items) && order.items.length > 0 ? (
                            order.items.map((item, idx) => (
                              <span key={idx} className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-black text-slate-700 font-mono">
                                {item?.selectedSize || 'Free'}{(item?.quantity || 1) > 1 ? ` (x${item.quantity})` : ' (x1)'}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="py-4 px-4 text-xs font-extrabold text-slate-800">
                        {Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + (item?.quantity || 1), 0) : 0}
                      </td>

                      {/* Subtotal */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-black text-slate-900 font-mono-numbers">
                        {formatPrice(Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + ((item?.price || 0) * (item?.quantity || 1)), 0) : (order.total || 0), currency, rate)}
                      </td>

                      {/* Advance */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-black text-emerald-600 font-mono-numbers">
                        {formatPrice(order.advancePayment || 0, currency, rate)}
                      </td>

                      {/* Collectable */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-black text-orange-600 font-mono-numbers">
                        <div>{formatPrice(order.total, currency, rate)}</div>
                        {getOrderFreeShippingDetails(order).isPantPromo && (
                          <div className="text-[9.5px] font-extrabold text-emerald-600 font-sans tracking-tight">
                            ডেলিভারি: ৳০
                          </div>
                        )}
                      </td>

                      {/* Note */}
                      <td className="py-4 px-4 text-xs text-slate-500 font-medium max-w-[150px] truncate" title={order.notes}>
                        {order.notes || '—'}
                      </td>

                      {/* Tracking ID */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs" onClick={(e) => e.stopPropagation()}>
                        {editingTrackingOrderId === order.id ? (
                          <input
                            type="text"
                            value={tempTrackingId}
                            onChange={(e) => setTempTrackingId(e.target.value)}
                            onBlur={async () => {
                              try {
                                const charge = order.courierCharge || 120;
                                const payout = Math.max(0, (order.total || 0) - charge);
                                await updateOrder(order.id, { 
                                  ...order, 
                                  trackingId: tempTrackingId,
                                  trackingCode: tempTrackingId,
                                  pathaoConsignmentId: (order.courier?.toLowerCase() === 'pathao' || order.partner?.toLowerCase() === 'pathao' || !order.courier) ? tempTrackingId : order.pathaoConsignmentId,
                                  courierCharge: charge,
                                  courierPayoutAmount: payout
                                });
                                toast.success("Tracking ID & Net Payout updated!");
                              } catch (err) {
                                toast.error("Failed to update Tracking ID");
                              }
                              setEditingTrackingOrderId(null);
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                try {
                                  const charge = order.courierCharge || 120;
                                  const payout = Math.max(0, (order.total || 0) - charge);
                                  await updateOrder(order.id, { 
                                    ...order, 
                                    trackingId: tempTrackingId,
                                    trackingCode: tempTrackingId,
                                    pathaoConsignmentId: (order.courier?.toLowerCase() === 'pathao' || order.partner?.toLowerCase() === 'pathao' || !order.courier) ? tempTrackingId : order.pathaoConsignmentId,
                                    courierCharge: charge,
                                    courierPayoutAmount: payout
                                  });
                                  toast.success("Tracking ID & Net Payout updated!");
                                } catch (err) {
                                  toast.error("Failed to update Tracking ID");
                                }
                                setEditingTrackingOrderId(null);
                              } else if (e.key === 'Escape') {
                                setEditingTrackingOrderId(null);
                              }
                            }}
                            autoFocus
                            className="w-24 px-2 py-1 text-xs font-semibold bg-[#F8F9FD] border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingTrackingOrderId(order.id);
                              setTempTrackingId(order.trackingId || '');
                            }}
                            className={cn(
                              "px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all",
                              order.trackingId
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                            )}
                          >
                            {order.trackingId || 'Add ID'}
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className={cn("py-2.5 px-4 sticky right-0 z-10 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)] transition-colors", stickyActionBg)}>
                        <div className="flex items-center justify-center">
                          <div className={cn(
                            "flex items-center gap-0.5 p-0.5 rounded-lg border shadow-sm transition-colors",
                            isRowSuccess ? "bg-white/95 border-emerald-300/80 shadow-3xs" : "bg-[#F8FAFC] border-[#EDF2F7]"
                          )}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                              }} 
                              title="View Details"
                              className="p-1 hover:bg-[#F8F9FD] hover:shadow-sm rounded-md transition-all text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                            >
                              <Eye size={13} className="stroke-[2.5]" />
                            </button>
                            
                            <div className="w-[1px] h-3.5 bg-[#E2E8F0] mx-0.5" />
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setIssueConversationOrder(order);
                              }} 
                              title="Order Issues"
                              className={cn(
                                "p-1 rounded-md transition-all cursor-pointer relative",
                                order.issueType && order.issueStatus !== 'resolved'
                                  ? "text-rose-600 bg-rose-50 hover:bg-rose-100"
                                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8F9FD] hover:shadow-sm"
                              )}
                            >
                              <MessageSquare size={13} className={cn("stroke-[2.5]", order.issueType && order.issueStatus !== 'resolved' && "animate-pulse")} />
                              {order.issueType && order.issueStatus !== 'resolved' && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-600 rounded-full border border-white" />
                              )}
                            </button>
                            
                            <div className="w-[1px] h-3.5 bg-[#E2E8F0] mx-0.5" />
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvoiceOrder(order);
                                setShowInvoiceModal(true);
                                if (canChangeOrderStatus(order.status) && normalizeStatus(order.status) !== 'PRINTED') {
                                  updateOrderStatus(order.id, 'PRINTED');
                                }
                              }} 
                              title="Print Invoice"
                              className="p-1 hover:bg-[#F8F9FD] hover:shadow-sm rounded-md transition-all text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                            >
                              <Printer size={13} className="stroke-[2.5]" />
                            </button>
                            
                            <div className="w-[1px] h-3.5 bg-[#E2E8F0] mx-0.5" />
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setNewCustomerName(order.customerName || '');
                                setNewCustomerPhone(order.phone || '');
                                setNewCustomerAddress(order.address || '');
                                setNewCustomerCity(order.city || '');
                                setEditName(order.customerName || '');
                                setEditPhone(order.phone || '');
                                setEditAddress(order.address || '');
                                setEditCity(order.city || '');
                                setEditThana((order as any).thana || '');
                                setEditStatus(order.status || 'Pending');
                                setEditDeliveryCharge(order.deliveryCharge ?? 100);
                                setEditDiscount((order as any).discount ?? 0);
                                setEditAdvancePayment((order as any).advancePayment ?? 0);
                                setEditNotes((order as any).notes || '');
                                setEditInvoiceBy(order.invoiceBy || '');
                                setIsEditingDetails(true);
                              }} 
                              title="Edit Order"
                              className="p-1 rounded-md transition-all text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8F9FD] hover:shadow-sm cursor-pointer"
                            >
                              <Tag size={13} className="stroke-[2.5]" />
                            </button>
                            
                            <div className="w-[1px] h-3.5 bg-[#E2E8F0] mx-0.5" />
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (order.issueType && order.issueStatus !== 'resolved') {
                                  toast.error("Cannot book order with active issue!");
                                  return;
                                }
                                
                                const parsedLoc = parseCustomerAddress(order.address, order.city, order.thana);

                                setPathaoBookingOrder(order);
                                setPathaoCity(parsedLoc.city || order.city || 'Dhaka');
                                setPathaoZone(parsedLoc.zone || order.thana || '');
                                setPathaoDetectedAddressInfo({
                                  districtBangla: parsedLoc.districtBangla,
                                  isAutoDetected: parsedLoc.isAutoDetected
                                });
                                setPathaoArea('');
                                setPathaoWeight('0.5');
                                setPathaoDeliveryType('48');
                                setPathaoSpecialInstruction(order.notes || '');
                                setPathaoSuccessResult(null);
                              }} 
                              title="Book via Pathao Courier"
                              className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-700 font-extrabold text-[10px] rounded-md transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Send size={11} className="text-emerald-600 stroke-[2.5]" />
                              <span>Pathao</span>
                            </button>

                            {(isAdmin || isSuperAdmin || isCEO) && (
                              <>
                                <div className="w-[1px] h-3.5 bg-[#E2E8F0] mx-0.5" />
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    
                                    const orderId = order.id;
                                    const shortId = formatInvoiceNumber(order);
                                    
                                    setDeleteConfirm({
                                      isOpen: true,
                                      title: `Delete Order #${shortId}?`,
                                      message: `Are you sure you want to PERMANENTLY DELETE Order #${shortId}? This cannot be undone.`,
                                      onConfirm: async () => {
                                        try {
                                          console.log(`[AdminOrders] Triggering delete for: ${orderId}`);
                                          const deletePromise = deleteOrder(orderId);
                                          toast.promise(deletePromise, {
                                            loading: 'Deleting...',
                                            success: 'Order deleted',
                                            error: (err) => `Failed: ${err.message || 'Permission denied'}`
                                          });
                                          await deletePromise;
                                        } catch (err: any) {
                                          console.error(`[AdminOrders] Table Delete Catch:`, err);
                                        } finally {
                                          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                        }
                                      }
                                    });
                                  }} 
                                  title="Delete Order"
                                  className="p-1 hover:bg-rose-100 rounded-md transition-all text-rose-500 hover:text-rose-700 cursor-pointer flex items-center justify-center relative z-10"
                                >
                                  <Trash2 size={13} className="stroke-[2.5]" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

            {/* Centered More & Show All buttons */}
            {filteredOrders.length > visibleCount && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 pb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisibleCount(prev => prev + 10);
                  }}
                  className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>More ({filteredOrders.length - visibleCount} Remaining)</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisibleCount(filteredOrders.length);
                  }}
                  className="px-6 py-3.5 bg-[#F8F9FD] border border-gray-200 hover:border-blue-400 text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Show All ({filteredOrders.length})</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* High-Performance, Isolated Create & Edit Order Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingOrderForModal(null);
        }}
        editingOrder={editingOrderForModal}
        orders={orders}
        products={products}
        currency={currency}
        rate={rate}
        paymentsConfig={paymentsConfig}
        onSaveOrder={handleSaveOrderFromModal}
        getNextOrderId={getNextOrderId}
      />

      {/* Receipt Photo Capture Camera Simulation */}
      <AnimatePresence>
        {showCamera && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 m-0 font-sans overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCamera(false);
                setActiveScanOrder(null);
                setShowLiveCameraSimulator(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F8F9FD] rounded-[28px] w-full max-w-lg overflow-hidden shadow-2xl relative z-10 border border-[#EFF2F6] flex flex-col text-black font-sans max-h-[92vh]"
            >
              
              {/* Header section with scanning icon and styling matching screenshot */}
              <div className="p-6 border-b border-[#EFF2F6] flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white shrink-0">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-2xl bg-[#E6FDF5] text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Scan className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-black text-[#0D1829] tracking-tight">Bulk Delivery</h2>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mt-0.5">
                      Scan invoice barcodes → Book all to Pathao
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setShowCamera(false);
                    setActiveScanOrder(null);
                    setShowLiveCameraSimulator(false);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-150 flex items-center justify-center text-gray-400 hover:text-black transition-all cursor-pointer border border-gray-100"
                >
                  <X size={15} className="stroke-[2.5]" />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar text-left">
                
                {/* PICKUP STORE FIELD */}
                <div className="text-left">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
                    PICKUP STORE
                  </label>
                  <div className="w-full bg-[#FAFBFD] border border-[#EFF2F6] rounded-xl px-4 py-3 text-sm font-bold text-gray-700 select-all leading-relaxed whitespace-nowrap overflow-x-auto text-left">
                    Elegan BD. — Ma Villa, House #11, Road #3, Block F, Section #1, Mirpur, Dhaka-1216
                  </div>
                </div>

                {/* SCAN BARCODE FIELD */}
                <div className="text-left">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-[#10B981] mb-2">
                    SCAN OR TYPE QR CODE NAME
                  </label>
                  <div className="w-full border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60 transition-colors rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs text-left">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Scan size={18} className="text-emerald-600 stroke-[2.5] shrink-0" />
                      <input 
                        type="text"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleScanOrderSubmit(scanInput);
                          }
                        }}
                        placeholder="Scan QR barcode or enter SCAN-XXXX code"
                        className="w-full bg-transparent border-none text-sm text-[#0C1421] font-bold focus:outline-none focus:ring-0 placeholder-gray-450 text-left font-mono"
                      />
                    </div>
                    
                    <button 
                      onClick={() => {
                        toast.success("Smartphone camera initialized successfully.");
                      }}
                      title="Camera Active"
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 bg-emerald-600 text-white shadow-xs"
                    >
                      <Camera size={18} className="stroke-[2.5] animate-pulse" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-semibold mt-2 leading-relaxed text-left">
                    Mobile camera opens automatically. To scan manually, type the QR scan code name (e.g., SCAN-XXXXXX) and press Enter.
                  </p>
                </div>

                {/* REAL DEVICE CAMERA LIVE QR SCANNER VIEWPORT */}
                <div className="overflow-hidden border border-[#EFF2F6] rounded-2xl bg-gray-950 text-left relative shadow-inner">
                  <div className="relative w-full bg-[#0a0f18] flex flex-col items-center justify-center overflow-hidden min-h-[300px]">
                    
                    {/* Native camera video element container */}
                    <div 
                      id="real-device-camera-scanner" 
                      className="absolute inset-0 w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
                    />

                    {/* Scanning feedback line indicator overlay */}
                    {isCameraScannerActive && !cameraPermissionError && (
                      <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_12px_#10b981] animate-bounce z-10" style={{ animationDuration: '3s' }} />
                    )}
                    
                    {/* Decoded Heads Up Display overlay */}
                    <div className="absolute inset-0 p-3 text-[9px] font-mono font-bold text-emerald-500/70 select-none pointer-events-none text-left z-10 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <span>[ACTIVE_CAMERA_SCANNER: {isCameraScannerActive ? "ONLINE" : "INITIALIZING"}]</span>
                        <span>STREAM_MODE: AUTO_REAR</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span>FEED_STATE: {isCameraScannerActive ? "LOCKED" : "CONNECTING"}</span>
                        <span>FPS_MAX: 15</span>
                      </div>
                    </div>

                    {/* Loading/Connecting Overlay while waiting for first WebRTC stream */}
                    {!isCameraScannerActive && !cameraPermissionError && (
                      <div className="relative z-10 text-center max-w-sm px-6">
                        <RefreshCw size={26} className="text-emerald-500 mx-auto animate-spin mb-3" />
                        <p className="text-[11px] font-black text-gray-200 uppercase tracking-wider">Accessing Device Camera...</p>
                        <p className="text-[9.5px] text-gray-400 tracking-wide font-semibold mt-1">
                          Opening smartphone rear camera automatically. Compatible with iPhone &amp; Android.
                        </p>
                      </div>
                    )}

                    {cameraPermissionError && (
                      <div className="relative z-10 text-center max-w-sm px-6 p-4 bg-red-950/20 rounded-xl border border-red-900/30">
                        <AlertCircle size={26} className="text-red-400 mx-auto animate-pulse mb-3" />
                        <p className="text-[11px] font-black text-red-300 uppercase tracking-wider">Camera Access restricted</p>
                        <p className="text-[9.5px] text-gray-400 tracking-wide font-normal mt-1 leading-relaxed">
                          {cameraPermissionError}
                        </p>
                      </div>
                    )}

                    {/* Shimmer overlay grids */}
                    <div className="absolute inset-0 bg-[radial-gradient(#10b981_0.5px,transparent_0.5px)] [background-size:12px_12px] opacity-10 pointer-events-none" />
                  </div>

                  {/* Dropdown container with matching orders & their SCAN CODE lists */}
                  <div className="p-4 border-t border-[#1F2937] bg-[#0E1521] space-y-2 max-h-48 overflow-y-auto no-scrollbar text-left text-white">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8397AB] block mb-2 text-left">
                      Available Orders &amp; QR scan code names
                    </span>
                    {orders.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic text-left">No orders found in database.</p>
                    ) : (
                      <div className="space-y-1.5 text-left">
                        {orders.slice(0, 15).map(order => {
                          const alreadyScanned = scannedIds.includes(order.id) || (activeScanOrder && activeScanOrder.id === order.id);
                          const itemNames = order.items?.map(it => it.name).join(', ') || 'General Order';
                          const isCancelled = order.status === 'Cancelled';
                          const hasSupportIssue = order.issueType;
                          const hasAnyIssue = isCancelled || hasSupportIssue;

                          return (
                            <button
                              key={order.id}
                              onClick={() => handleScanOrderSubmit(order.id)}
                              className={cn(
                                "w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 transition-colors mb-1.5 focus:outline-none",
                                alreadyScanned 
                                  ? "bg-[#111827] border-gray-800 text-gray-500 cursor-not-allowed"
                                  : hasAnyIssue
                                    ? "bg-red-950/20 border-red-900/30 text-red-100 hover:bg-red-950/35 cursor-pointer"
                                    : "bg-[#161F30] border-gray-700/60 text-white hover:bg-[#1E293B] cursor-pointer"
                              )}
                            >
                              <div className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold font-mono text-[10px] text-emerald-400">
                                    #{(order.id || '').slice(-6).toUpperCase()}
                                  </span>
                                  <span className="font-black text-gray-300 truncate">
                                    {order.customerName}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate mt-0.5 font-medium text-left font-sans">
                                  {itemNames}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 font-mono text-[9.5px]">
                                  <span className="text-[#10B981] font-black font-sans">SCAN CODE:</span>
                                  <span className="text-gray-300 font-bold bg-[#1E293B] px-1.5 py-0.5 rounded-sm select-all">SCAN-{(order.id || '').slice(-6).toUpperCase()}</span>
                                </div>
                              </div>
                              
                              <div className="shrink-0 flex items-center gap-1.5 font-black text-[9px] uppercase tracking-wider">
                                {alreadyScanned && (
                                  <span className="text-gray-500 bg-gray-800/60 px-1.5 py-0.5 rounded-sm">
                                    Scanned
                                  </span>
                                )}
                                {isCancelled && (
                                  <span className="text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                                    <AlertCircle size={9} /> CANCELLED
                                  </span>
                                )}
                                {!isCancelled && hasSupportIssue && (
                                  <span className="text-orange-400 bg-orange-950/80 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                                    <AlertCircle size={9} /> ISSUE: {hasSupportIssue}
                                  </span>
                                )}
                                {!alreadyScanned && !hasAnyIssue && (
                                  <span className="text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-sm font-mono font-bold hover:bg-emerald-950/60 transition-colors cursor-pointer">
                                    Click to scan →
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* PATHAO AUTOMATED ENTRY CONFIRMATION (Confirmation option displayed post successful scan) */}
                <AnimatePresence>
                  {activeScanOrder && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="text-left border border-amber-250/50 bg-amber-50/10 rounded-[22px] overflow-hidden shadow-xs text-left"
                    >
                      <div className="bg-amber-500/10 px-5 py-3 border-b border-amber-205/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          <span className="text-xs font-black uppercase text-amber-850 tracking-wider">
                            Pathao Delivery Booking Confirmation
                          </span>
                        </div>
                        <button 
                          onClick={() => setActiveScanOrder(null)}
                          className="text-amber-800 hover:text-black font-extrabold text-[10px] uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="p-5 space-y-4 text-left">
                        <div className="grid grid-cols-2 gap-4 text-xs text-left">
                          <div>
                            <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-left">
                              ORDER NUMBER
                            </p>
                            <p className="font-bold text-gray-900 font-mono mt-0.5">
                              #{activeScanOrder.id}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-left">
                              RECIPIENT CUSTOMER
                            </p>
                            <p className="font-bold text-gray-950 mt-0.5">
                              {activeScanOrder.customerName}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-left">
                              DELIVERY ADDRESS
                            </p>
                            <p className="font-medium text-gray-700 leading-relaxed mt-0.5 text-left">
                              {activeScanOrder.address}, {activeScanOrder.city}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-left">
                              CONTACT PHONE
                            </p>
                            <p className="font-bold text-gray-800 mt-0.5 font-mono">
                              {activeScanOrder.phone}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-left">
                              COD COLLECTABLE AMOUNT
                            </p>
                            <p className="font-black text-brand-gold mt-0.5 font-sans">
                              {formatPrice(activeScanOrder.total)}
                            </p>
                          </div>
                        </div>

                        {/* Confirmation Button with name "Entry" */}
                        <div className="pt-2 text-left">
                          <button 
                            onClick={handleConfirmPathaoEntry}
                            disabled={bookingToPathao}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[12px] tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-sm shadow-emerald-600/10"
                          >
                            {bookingToPathao ? (
                              <>
                                <RefreshCw className="animate-spin text-white" size={13} />
                                <span>COMMUNICATING WITH PATHAO API...</span>
                              </>
                            ) : (
                              <>
                                <Truck size={14} className="stroke-[2.5]" />
                                <span>Entry</span>
                              </>
                            )}
                          </button>
                          <p className="text-[9px] text-gray-400 text-center mt-2 font-medium">
                            Clicking "Entry" will record this dispatch sheet, print invoice labels, and register this status in the Pathao network.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SCANNED DELIVERY QUEUE SECTION OR PLACEHOLDER */}
                <div className="border-t border-[#EFF2F6] pt-6 text-left">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#8397AB] mb-4 text-left">
                    Delivery Queue ({scannedOrders.length} Scanned)
                  </h4>

                  {scannedOrders.length === 0 ? (
                    <div className="py-12 border border-dashed border-[#EFF2F6] rounded-2xl flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 mb-4 shadow-3xs">
                        <Scan size={24} className="stroke-[1.5]" />
                      </div>
                      <h5 className="text-[13px] font-extrabold text-gray-800 uppercase tracking-tight">
                        No orders scanned yet
                      </h5>
                      <p className="text-xs text-gray-400 max-w-xs mt-1 font-semibold leading-relaxed">
                        Scan invoice barcodes to add orders to the delivery queue.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar text-left">
                      {scannedOrders.map((queuedOrder, index) => (
                        <div 
                          key={queuedOrder.id + '-' + index}
                          className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between gap-3 text-xs text-left"
                        >
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#0C1421] font-mono">
                                #{(queuedOrder.id || '').slice(-6).toUpperCase()}
                              </span>
                              <span className="text-gray-500 font-bold font-sans">
                                {queuedOrder.customerName}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#0D9488] font-bold mt-1 uppercase tracking-wider flex items-center gap-1 text-left">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-505 inline-block animate-pulse" />
                              Pathao Registered (Tracking: PL-{Math.floor(123450 + index * 99)})
                            </p>
                          </div>
                          
                          <div className="shrink-0 text-right">
                            <span className="font-black text-brand-gold font-sans block">
                              {formatPrice(queuedOrder.total)}
                            </span>
                            <span className="text-[9px] text-gray-400 font-semibold font-mono uppercase block mt-0.5">
                              {queuedOrder.city}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              
              {/* Footer row with status counts */}
              <div className="p-4 bg-gray-50 border-t border-[#EFF2F6] flex items-center justify-between shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-6">
                <span>Active Ledger: Session</span>
                <span>Ready to Book: {scannedOrders.length} records</span>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* High Fidelity Order Issue Conversation Modal */}
      <AnimatePresence>
        {issueConversationOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 m-0 font-sans transition-all">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIssueConversationOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col text-slate-800 font-sans max-h-[92vh] border border-white/20",
                issueConversationOrder.issueType && issueConversationOrder.issueStatus !== 'resolved'
                  ? "bg-rose-50"
                  : "bg-[#F8F9FD]"
              )}
            >
              
              {/* Header block with chat icon, Title, Subtitle and View Order button */}
              <div className="p-6 border-b border-slate-300/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-transparent flex items-center justify-center shrink-0">
                    <MessageSquare className="w-6 h-6 text-indigo-600 stroke-[2.2]" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-black text-[#0D1829] tracking-tight">Order Issue Conversation</h2>
                    <p className="text-[11px] font-bold text-indigo-600/70 font-mono mt-0.5">
                      Internal discussion thread for Invoice No: <span className="text-indigo-600 font-black">{issueConversationOrder.invoiceNo ? String(issueConversationOrder.invoiceNo) : String(issueConversationOrder.id || '').replace(/^ORD-?/i, '')}</span>
                    </p>
                    {(readyToShipClicked || issueConversationOrder.status === 'Ready' || issueConversationOrder.status === 'QC') && (
                      <div className="mt-1">
                        <span className="inline-block px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider shadow-xs border border-emerald-700">
                          Ready
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedOrder(issueConversationOrder);
                      setIssueConversationOrder(null);
                    }}
                    className="px-4 py-1.5 bg-[#F8F9FD]/60 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest rounded-full hover:bg-[#F8F9FD] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border border-slate-300/20"
                  >
                    <Eye size={12} className="stroke-[2.5]" />
                    View Order
                  </button>
                  <button 
                    onClick={() => setIssueConversationOrder(null)}
                    className="w-8 h-8 rounded-full bg-[#F8F9FD]/60 hover:bg-[#F8F9FD] flex items-center justify-center text-gray-400 hover:text-black transition-all cursor-pointer border border-slate-300/40 shadow-sm"
                  >
                    <X size={15} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Order quick metadata grid */}
              <div className="p-6 border-b border-slate-300/30 grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4 shrink-0 text-left">
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Customer Details</span>
                  <span className="text-sm font-black text-slate-900 block truncate">{issueConversationOrder.customerName}</span>
                  <span className="text-[10px] font-bold text-slate-500 block truncate">
                    {issueConversationOrder.phone} <span className="mx-1 text-slate-300">•</span> {issueConversationOrder.address || issueConversationOrder.city}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Order Status</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900 block uppercase">
                      {readyToShipClicked || issueConversationOrder.status === 'Ready' || issueConversationOrder.status === 'QC' ? (
                        <span className="text-emerald-600 font-bold">Ready</span>
                      ) : issueConversationOrder.status === 'Shipped' ? (
                        <span className="text-blue-600">Shipped</span>
                      ) : (issueConversationOrder.status || '').toLowerCase() === 'delivered' ? (
                        <span className="text-green-600">Delivered</span>
                      ) : (
                        issueConversationOrder.status === 'Pending' ? 'ORDER PLACED' : String(issueConversationOrder.status || '').toUpperCase()
                      )}
                    </span>
                    <ParcelLiveStatusBadge order={issueConversationOrder} showDetails />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase truncate">VIA {issueConversationOrder.paymentMethod || '-'}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Date & Time</span>
                  <span className="text-sm font-black text-slate-900 block font-mono">
                    {formatOrderDateTime(issueConversationOrder.createdAt).date}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 block font-mono">
                    {formatOrderDateTime(issueConversationOrder.createdAt).time}
                  </span>
                </div>

                <div className="col-span-2 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Item Summary</span>
                  <span className="text-sm font-black text-indigo-600 block">
                    {Array.isArray(issueConversationOrder.items) && issueConversationOrder.items.length > 0
                      ? issueConversationOrder.items.map(it => `${it.name} (${it.selectedSize} (x${it.quantity || 1}))`).join(', ')
                      : 'No items recorded'}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Collectable</span>
                  <span className="text-sm font-black text-[#EB5A3C] block font-mono">
                    {formatPrice(issueConversationOrder.total)}
                  </span>
                </div>
              </div>

              {/* Modal Body / Chat container */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0 bg-slate-50">
                
                {/* Active Issue Info / Overview Card matching screenshot exactly */}
                <div className="bg-[#F8F9FD] rounded-3xl border border-slate-200/60 p-5 mb-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">ISSUE OVERVIEW</span>
                    
                    {isEditingIssueMeta ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={issueMetaType}
                          onChange={(e) => setIssueMetaType(e.target.value)}
                          className="bg-[#F8F9FD] border border-slate-300 text-[10px] font-black rounded-lg px-2.5 py-1.5 outline-none text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="QC">QC</option>
                          <option value="Sizing Mismatch">Sizing Mismatch</option>
                          <option value="Delivery Delay">Delivery Delay</option>
                          <option value="Damaged Product">Damaged Product</option>
                          <option value="Payment Issue">Payment Issue</option>
                          <option value="Custom Issue">Custom Issue</option>
                        </select>
                        <select
                          value={issueMetaUrgency}
                          onChange={(e) => setIssueMetaUrgency(e.target.value)}
                          className="bg-[#F8F9FD] border border-slate-300 text-[10px] font-black rounded-lg px-2.5 py-1.5 outline-none text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                        <button
                          onClick={async () => {
                            try {
                              await updateOrder(issueConversationOrder.id, {
                                issueType: issueMetaType,
                                issueUrgency: issueMetaUrgency
                              });
                              setIssueConversationOrder({
                                ...issueConversationOrder,
                                issueType: issueMetaType,
                                issueUrgency: issueMetaUrgency
                              });
                              setIsEditingIssueMeta(false);
                              toast.success("Issue parameters updated!");
                            } catch {
                              toast.error("Failed to update settings");
                            }
                          }}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors cursor-pointer shadow-3xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingIssueMeta(false)}
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-slate-300 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* OPEN ISSUE badge */}
                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-extrabold rounded-full border uppercase tracking-wider flex items-center gap-1.5 shadow-3xs",
                          !issueConversationOrder.issueType 
                            ? 'bg-slate-100 text-slate-500 border-slate-200' 
                            : issueConversationOrder.issueStatus === 'resolved'
                              ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                              : 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0", 
                            !issueConversationOrder.issueType 
                              ? 'bg-slate-400' 
                              : issueConversationOrder.issueStatus === 'resolved' 
                                ? 'bg-[#137333]' 
                                : 'bg-[#C5221F] animate-pulse'
                          )} />
                          {!issueConversationOrder.issueType 
                            ? 'NO ACTIVE ISSUE' 
                            : issueConversationOrder.issueStatus === 'resolved' 
                              ? 'SOLVED' 
                              : 'OPEN ISSUE'}
                        </span>

                        {/* TYPE badge */}
                        <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#FFF9E6] text-[#B06000] border border-[#FCE39E] rounded-full uppercase tracking-wider shadow-3xs">
                          TYPE: {issueConversationOrder.issueType || 'QC'}
                        </span>

                        {/* URGENCY badge */}
                        <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] rounded-full uppercase tracking-wider shadow-3xs">
                          URGENCY: {String(issueConversationOrder.issueUrgency || 'NORMAL').toUpperCase()}
                        </span>

                        {/* Edit / Pencil button */}
                        <button 
                          onClick={() => {
                            setIssueMetaType(issueConversationOrder.issueType || 'QC');
                            setIssueMetaUrgency(issueConversationOrder.issueUrgency || 'Normal');
                            setIsEditingIssueMeta(true);
                          }}
                          className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors border border-slate-200 cursor-pointer shadow-3xs"
                          title="Edit issue settings"
                        >
                          <Edit3 size={11} className="stroke-[2.5]" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right side CTA stack matching exactly the screenshot buttons */}
                  <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                    
                    {(readyToShipClicked || issueConversationOrder.status === 'Ready' || issueConversationOrder.status === 'QC') ? (
                      <div className="flex items-center justify-center p-2 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
                        <button
                          onClick={async () => {
                            const systemReply = {
                              sender: 'system' as const,
                              message: `Admin marked issue status as Solved`,
                              timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                            };
                            const existingReplies = issueConversationOrder.issueReplies || [];
                            const updatedReplies = [...existingReplies, systemReply];
                            await updateOrder(issueConversationOrder.id, {
                              issueReplies: updatedReplies,
                              issueStatus: 'resolved'
                            });
                            setIssueConversationOrder({
                              ...issueConversationOrder,
                              issueStatus: 'resolved',
                              issueReplies: updatedReplies
                            });
                            toast.success("Issue marked as solved!");
                          }}
                          className="flex items-center justify-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-full uppercase tracking-wider transition-all shadow-md cursor-pointer hover:shadow-lg w-full"
                        >
                          <CheckCircle2 size={16} className="stroke-[2.5]" />
                          SOLVE
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              await handleStatusChange(issueConversationOrder.id, 'Ready');
                              setReadyToShipClicked(true);
                              setIssueConversationOrder({
                                ...issueConversationOrder,
                                status: 'Ready'
                              });
                              toast.success("Order marked as Ready!");
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 font-extrabold text-[10.5px] rounded-full uppercase tracking-wider transition-all shadow-md cursor-pointer hover:shadow-lg bg-[#5E50F9] hover:bg-[#4E40E9] text-white"
                          >
                            <Clock size={12} className="stroke-[2.5]" />
                            READY TO SHIP
                          </button>

                          {!cancelRequestedClicked ? (
                            <button 
                              onClick={() => {
                                setCancelRequestedClicked(true);
                                toast("অর্ডার বাতিল চূড়ান্ত করতে 'APPROVED CANCEL' ক্লিক করুন", { icon: 'ℹ️' });
                              }}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-[#FFAB00] hover:bg-[#e09600] text-white font-extrabold text-[10.5px] rounded-full uppercase tracking-wider transition-all shadow-md cursor-pointer hover:shadow-lg"
                            >
                              <AlertTriangle size={12} className="stroke-[2.5]" />
                              CANCEL REQUEST
                            </button>
                          ) : (
                            <button 
                              onClick={async () => {
                                await handleStatusChange(issueConversationOrder.id, 'Cancelled');
                                const systemReply = {
                                  sender: 'system' as const,
                                  message: `Sabbir approved cancellation`,
                                  timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                                };
                                const existingReplies = issueConversationOrder.issueReplies || [];
                                const updatedReplies = [...existingReplies, systemReply];
                                await updateOrder(issueConversationOrder.id, {
                                  issueReplies: updatedReplies,
                                  status: 'Cancelled'
                                });
                                setIssueConversationOrder({
                                  ...issueConversationOrder,
                                  status: 'Cancelled',
                                  issueReplies: updatedReplies
                                });
                                setCancelRequestedClicked(false);
                                toast.success("Order Cancelled Successfully!");
                              }}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10.5px] rounded-full uppercase tracking-wider transition-all shadow-md cursor-pointer hover:shadow-lg animate-pulse"
                            >
                              <CheckCircle2 size={12} className="stroke-[2.5]" />
                              APPROVED CANCEL
                            </button>
                          )}
                        </div>

                        <button 
                          onClick={() => {
                            setSelectedOrder(issueConversationOrder);
                            setIsEditingDetails(true);
                            setIssueConversationOrder(null);
                          }}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0090FF] hover:bg-[#007edb] text-white font-extrabold text-[10.5px] rounded-full uppercase tracking-wider transition-all shadow-md cursor-pointer hover:shadow-lg w-full"
                        >
                          <Edit3 size={12} className="stroke-[2.5]" />
                          EDIT ORDER
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Active issue conversation layout */}
                <div className="flex flex-col flex-1 min-h-0 text-left">
                  
                  {/* Chat log messages list */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 no-scrollbar min-h-[260px] max-h-[360px] flex flex-col justify-end">
                    {/* If there are no messages */}
                    {(!issueConversationOrder.issueReplies || issueConversationOrder.issueReplies.length === 0) ? (
                      <div className="my-auto text-center py-8 px-4 flex flex-col items-center justify-center w-full">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                          <MessageSquare className="text-indigo-500 w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Start Internal Discussion</span>
                        <p className="text-[10px] text-slate-500 font-bold max-w-xs mt-1 text-center">
                          Type your message below and press SEND to activate this order issue thread.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {issueConversationOrder.issueReplies.map((reply: any, rIdx: number) => {
                          const isSystemMsg = reply.sender === 'system' || reply.message.startsWith('[System]') || reply.message.includes('changed issue status') || reply.message.includes('updated Type') || reply.message.includes('requested cancellation');
                          
                          if (isSystemMsg) {
                            const cleanMsg = reply.message.replace('[System]', '').trim();
                            return (
                              <div key={rIdx} className="flex justify-center my-1.5 w-full">
                                <div className="bg-slate-200/50 border border-slate-300/40 text-slate-600 text-[10.5px] font-bold py-1.5 px-4 rounded-full flex items-center gap-1.5 shadow-3xs mx-auto">
                                  <Clock size={11} className="text-slate-400 shrink-0" />
                                  <span>{cleanMsg} • {reply.timestamp}</span>
                                </div>
                              </div>
                            );
                          }

                          const isAdminMsg = reply.sender === 'admin';
                          const senderInitials = isAdminMsg ? 'SA' : (reply.senderName ? reply.senderName.slice(0, 2).toUpperCase() : 'MI');
                          const senderDisplayName = isAdminMsg ? 'SABBIR' : (reply.senderName || 'MITHELA');

                          return (
                            <div 
                              key={rIdx} 
                              className={cn(
                                "flex items-start gap-2.5 w-full",
                                isAdminMsg ? "justify-end text-right" : "justify-start text-left"
                              )}
                            >
                              {/* Left Avatar for incoming */}
                              {!isAdminMsg && (
                                <div className="w-7 h-7 rounded-full bg-slate-300 border border-slate-400/20 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm">
                                  {senderInitials}
                                </div>
                              )}

                              {/* Message bubble */}
                              <div 
                                className={cn(
                                  "flex flex-col max-w-[75%] rounded-[20px] p-3 text-xs leading-relaxed shadow-3xs",
                                  isAdminMsg 
                                    ? "bg-[#5E50F9] text-white rounded-tr-none text-left" 
                                    : "bg-[#F8F9FD] text-slate-800 border border-slate-200/60 rounded-tl-none text-left"
                                )}
                              >
                                <div className="flex items-center gap-3 mb-1">
                                  <span className={cn(
                                    "font-black uppercase tracking-widest text-[8px]",
                                    isAdminMsg ? "text-indigo-100" : "text-slate-400"
                                  )}>
                                    {senderDisplayName}
                                  </span>
                                  <span className={cn(
                                    "text-[8px] font-bold font-mono",
                                    isAdminMsg ? "text-indigo-200" : "text-slate-400"
                                  )}>
                                    {reply.timestamp}
                                  </span>
                                </div>
                                <p className="font-semibold">{reply.message}</p>
                              </div>

                              {/* Right Avatar for outgoing */}
                              {isAdminMsg && (
                                <div className="w-7 h-7 rounded-full bg-[#5E50F9] border border-indigo-400/20 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm">
                                  {senderInitials}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Chat reply typing input and controls */}
                  {isDeliveredOrSuccess(issueConversationOrder.status) && (!issueConversationOrder.issueType || issueConversationOrder.issueStatus === 'resolved') ? (
                    <div className="border-t border-slate-300/30 pt-4 flex items-center justify-center gap-2 p-3 bg-amber-50 border border-amber-200/80 text-amber-900 rounded-2xl text-xs font-bold shrink-0">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                      <span>ডেলিভার্ড বা সাকসেস অর্ডারে নতুন কোনো ইস্যু ক্রিয়েট করা যাবে না।</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSendIssueReply} className="border-t border-slate-300/30 pt-4 flex gap-3 shrink-0">
                      <input 
                        type="text" 
                        value={issueReplyText}
                        onChange={(e) => setIssueReplyText(e.target.value)}
                        placeholder="Type your message here..."
                        className="flex-1 bg-[#F8F9FD] border border-slate-300/50 text-xs font-semibold rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-[#5E50F9]/20 focus:border-[#5E50F9] text-slate-800 placeholder:text-slate-400"
                      />
                      <button 
                        type="submit"
                        disabled={!issueReplyText.trim()}
                        className="px-8 py-3.5 bg-[#8C82FC] hover:bg-[#7267FC] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                      >
                        SEND
                      </button>
                    </form>
                  )}

                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Highly Polished Centered Order Overview Modal matching screenshot exactly */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 m-0 font-sans transition-all">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F8F9FD] rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl relative z-10 border border-slate-200/60 flex flex-col text-slate-800 font-sans max-h-[92vh]"
            >
              
              {isEditingDetails ? (
                <>
                  {/* Header block for edit details */}
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-[#F8F9FD]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Edit3 className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-base font-black text-[#0D1829] tracking-tight">Edit Order Details</h2>
                        <p className="text-xs text-slate-500 font-bold">Modifying order record #{selectedOrder.invoiceNo || String(selectedOrder.id || '').replace(/^ORD-?/i, '')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsEditingDetails(false)}
                      className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-black transition-all cursor-pointer border border-slate-200 shadow-sm"
                    >
                      <X size={15} className="stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Scrollable container for Form */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 no-scrollbar">
                    <div className="space-y-4 text-left bg-[#F8F9FD] rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                      <div className="border-b border-gray-150 pb-2 flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Modify Order Record</h3>
                          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Edit customer details, logistics parameters, and notes below.</p>
                        </div>
                        {(isAdmin || isSuperAdmin || isCEO) && (
                          <button 
                            onClick={() => {
                              const orderId = selectedOrder.id;
                              const shortId = orderId.slice(-6);
                              setDeleteConfirm({
                                isOpen: true,
                                title: `Delete Order #${shortId}?`,
                                message: `Are you sure you want to PERMANENTLY DELETE Order #${shortId}? This will remove it from the database forever and cannot be undone.`,
                                onConfirm: async () => {
                                  try {
                                    const deletePromise = deleteOrder(orderId);
                                    toast.promise(deletePromise, {
                                      loading: 'Deleting order...',
                                      success: 'Order deleted successfully',
                                      error: (err) => `Delete failed: ${err.message || 'Permission denied'}`
                                    });
                                    await deletePromise;
                                    setSelectedOrder(null);
                                  } catch (err: any) {
                                    console.error('[AdminOrders Modal] Delete Catch:', err);
                                  } finally {
                                    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                                  }
                                }
                              });
                            }}
                            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-md"
                          >
                            <Trash2 size={13} />
                            <span>Delete Order</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Customer Name</label>
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Phone Number</label>
                          <input 
                            type="text" 
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Postal Address</label>
                          <input 
                            type="text" 
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Thana</label>
                          <input 
                            type="text" 
                            value={editThana}
                            onChange={(e) => setEditThana(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">City</label>
                          <input 
                            type="text" 
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-1 col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Order Status</label>
                            {selectedOrder && !canChangeOrderStatus(selectedOrder.status) && (
                              <span className="text-[9px] font-bold text-amber-600 flex items-center gap-1">
                                <Lock size={9} /> Status Locked
                              </span>
                            )}
                          </div>
                          <select 
                            value={normalizeStatus(editStatus)}
                            disabled={selectedOrder ? !canChangeOrderStatus(selectedOrder.status) : false}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className={cn(
                              "w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD] uppercase",
                              selectedOrder && !canChangeOrderStatus(selectedOrder.status) ? "opacity-60 cursor-not-allowed bg-slate-100" : "cursor-pointer"
                            )}
                          >
                            <option value="ORDER PLACED">ORDER PLACED</option>
                            <option value="PRINTED">PRINTED</option>
                            <option value="PREPARING">PREPARING</option>
                            <option value="Ready">READY TO SHIP</option>
                            <option value="PICK UP CANCEL">PICK UP CANCEL</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="SUCCESS">SUCCESS</option>
                            <option value="PARTIAL DELIVERY">PARTIAL DELIVERY</option>
                            <option value="HOLD">HOLD</option>
                            <option value="RETURNED">RETURNED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Delivery Fee</label>
                          <input 
                            type="number" 
                            value={editDeliveryCharge}
                            onChange={(e) => setEditDeliveryCharge(Number(e.target.value))}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Discount</label>
                          <input 
                            type="number" 
                            value={editDiscount}
                            onChange={(e) => setEditDiscount(Number(e.target.value))}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Advance Paid</label>
                          <input 
                            type="number" 
                            value={editAdvancePayment}
                            onChange={(e) => setEditAdvancePayment(Number(e.target.value))}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Order Note</label>
                          <input 
                            type="text" 
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Order note (optional)..."
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Invoice By</label>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingForField('edit');
                              setShowAddInvoiceByModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-all cursor-pointer active:scale-95 shadow-3xs"
                            title="Add new name"
                          >
                            <Plus size={12} className="stroke-[3]" />
                            <span>Add</span>
                          </button>
                        </div>
                        <select 
                          value={editInvoiceBy}
                          onChange={(e) => setEditInvoiceBy(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-[#F8F9FD] appearance-none cursor-pointer"
                        >
                          <option value="Website order">Website order</option>
                          {invoiceByOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button 
                          type="button"
                          onClick={() => setIsEditingDetails(false)}
                          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                          Discard
                        </button>
                        <button 
                          type="button"
                          onClick={async () => {
                            const computedSubtotal = Array.isArray(selectedOrder.items) ? selectedOrder.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) : 0;
                            try {
                              await updateOrder(selectedOrder.id, {
                                customerName: editName,
                                phone: editPhone,
                                address: editAddress,
                                city: editCity,
                                thana: editThana,
                                status: editStatus,
                                deliveryCharge: editDeliveryCharge,
                                discount: editDiscount,
                                advancePayment: editAdvancePayment,
                                notes: editNotes,
                                total: computedSubtotal + editDeliveryCharge - editDiscount,
                                invoiceBy: editInvoiceBy
                              });
                              
                              setSelectedOrder({
                                ...selectedOrder,
                                customerName: editName,
                                phone: editPhone,
                                address: editAddress,
                                city: editCity,
                                thana: editThana,
                                status: editStatus,
                                deliveryCharge: editDeliveryCharge,
                                discount: editDiscount,
                                advancePayment: editAdvancePayment,
                                notes: editNotes,
                                total: computedSubtotal + editDeliveryCharge - editDiscount,
                                invoiceBy: editInvoiceBy
                              } as any);
                              
                              setIsEditingDetails(false);
                              toast.success("Order records updated beautifully!");
                            } catch (err) {
                              toast.error("Failed to persist updated attributes");
                            }
                          }}
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Top Header Block matching photo exactly */}
                  <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0 shadow-xs border border-white/40">
                        <ShoppingCart className="w-7 h-7 stroke-[2.2]" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">Order Overview</h2>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-mono font-bold text-slate-500 tracking-wider">
                            {(() => {
                              const dateObj = new Date(selectedOrder.createdAt || Date.now());
                              const yy = isNaN(dateObj.getTime()) ? '26' : String(dateObj.getFullYear()).slice(-2);
                              const mm = isNaN(dateObj.getTime()) ? '09' : String(dateObj.getMonth() + 1).padStart(2, '0');
                              const dd = isNaN(dateObj.getTime()) ? '01' : String(dateObj.getDate()).padStart(2, '0');
                              const orderIdStr = String(selectedOrder.id || '');
                              const lastDigits = orderIdStr.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
                              const orderSlug = lastDigits.length >= 4 ? lastDigits : String(parseInt(orderIdStr.slice(-4), 36) || 0).slice(-4).padStart(4, '0');
                              return `${yy}${mm}${dd}${orderSlug}`;
                            })()}
                          </span>
                          <div className="flex items-center gap-[1.2px] bg-[#F8F9FD] px-2 py-1 rounded-md border border-slate-300/40 shrink-0 h-6 select-none" title="Barcode">
                            {[1, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 2, 1, 3, 2, 1, 1, 2, 1, 2, 1, 3, 1, 2].map((w, idx) => (
                              <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedOrder(null)}
                      className="w-10 h-10 rounded-full bg-[#F8F9FD]/60 hover:bg-[#F8F9FD] flex items-center justify-center text-slate-400 hover:text-slate-800 transition-all cursor-pointer border border-slate-300/40 shadow-sm animate-fade-in"
                    >
                      <X size={18} className="stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Scrollable Container with Custom Bento Grid matching screenshot */}
                  <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 no-scrollbar min-h-0">
                    {(() => {
                      const freeInfo = getOrderFreeShippingDetails(selectedOrder);
                      if (freeInfo.isPantPromo) {
                        return (
                          <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3.5 flex items-center justify-between text-emerald-950 shadow-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                🎁
                              </div>
                              <div className="text-left">
                                <div className="text-xs font-black text-emerald-950">৩টি ফরমাল প্যান্টে ফ্রি ডেলিভারি অফার কার্যকর!</div>
                                <div className="text-[11px] text-emerald-800 font-medium">কাস্টমার ৩টি ফরমাল প্যান্ট অর্ডার করায় ডেলিভারি চার্জ সম্পূর্ণ ফ্রি (৳০) পেয়েছে।</div>
                              </div>
                            </div>
                            <span className="bg-emerald-200/80 text-emerald-900 text-[9.5px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 border border-emerald-300">
                              FREE DELIVERY (3 PANTS)
                            </span>
                          </div>
                        );
                      }
                      if (freeInfo.isFreeShipping) {
                        return (
                          <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3 flex items-center justify-between text-emerald-950 shadow-xs">
                            <div className="flex items-center gap-2">
                              <Truck size={16} className="text-emerald-700" />
                              <span className="text-xs font-black text-emerald-950">এই অর্ডারে ফ্রি ডেলিভারি (৳০) প্রযোজ্য</span>
                            </div>
                            <span className="bg-emerald-200/80 text-emerald-900 text-[9.5px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-300">
                              FREE DELIVERY
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Customer Identity Floating Card */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider text-left pl-1">
                          <User size={14} className="stroke-[2.5]" />
                          <span>Customer Identity</span>
                        </div>
                        <div className="bg-[#F8F9FD] rounded-[24px] p-6 shadow-sm border border-white/60 text-left space-y-4 flex-1">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Name</span>
                            <span className="text-sm font-black text-slate-900 block leading-tight">{selectedOrder.customerName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Phone</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900 block font-mono">{selectedOrder.phone}</span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedOrder.phone);
                                  toast.success("Phone number copied!");
                                }}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer transition-all font-sans font-bold"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Full Delivery Address</span>
                            <span className="text-xs font-semibold text-slate-800 leading-relaxed block bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 mb-3">
                              {selectedOrder.address || '—'}
                            </span>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-2.5">
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider block mb-0.5">District / জেলা</span>
                                <span className="text-xs font-black text-blue-950 block truncate">
                                  {selectedOrder.city || '—'}
                                </span>
                              </div>
                              <div className="bg-purple-50/80 border border-purple-200/80 rounded-xl p-2.5">
                                <span className="text-[9px] font-black text-purple-600 uppercase tracking-wider block mb-0.5">Thana / থানা</span>
                                <span className="text-xs font-black text-purple-950 block truncate">
                                  {(selectedOrder as any).thana || '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Logistic Meta Floating Card */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider text-left pl-1">
                          <Package size={14} className="stroke-[2.5]" />
                          <span>Logistic Meta</span>
                        </div>
                        <div className="bg-[#F8F9FD] rounded-[24px] p-6 shadow-sm border border-white/60 text-left grid grid-cols-2 gap-y-4 gap-x-3 flex-1">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Partner</span>
                            <span className="text-sm font-black text-slate-900 block truncate leading-tight">
                              {selectedOrder.partner || selectedOrder.courier || 'Pathao'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Invoice By</span>
                            <span className="text-sm font-black text-slate-900 block truncate leading-tight">
                              {getInvoiceBy(selectedOrder)}
                            </span>
                          </div>
                          {(selectedOrder.transactionId || (selectedOrder as any).paidAmount) && (
                            <div className="col-span-2 border-t border-slate-100/80 pt-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                Payment Transaction ({String(selectedOrder.paymentMethod || 'COD').toUpperCase()})
                              </span>
                              <div className="flex items-center gap-3">
                                {selectedOrder.transactionId && (
                                  <span className="text-xs font-black text-indigo-600 font-mono bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                    Trx: {selectedOrder.transactionId}
                                  </span>
                                )}
                                {((selectedOrder as any).paidAmount || (selectedOrder as any).advancePayment) && (
                                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                    Sent: ৳{(selectedOrder as any).paidAmount || (selectedOrder as any).advancePayment}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="col-span-2 border-t border-slate-100/80 pt-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Invoice No</span>
                            <span className="text-sm font-black text-indigo-600 font-mono block whitespace-nowrap">
                              {selectedOrder.invoiceNo ? String(selectedOrder.invoiceNo) : (selectedOrder.id || '').replace(/^ORD-?/i, '')}
                            </span>
                          </div>
                          <div className="col-span-2 border-t border-slate-100/80 pt-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Order Placed Date & Time (রিয়েল টাইম)</span>
                            <div className="flex items-center gap-2 text-xs font-black text-slate-800 font-mono">
                              <Calendar size={13} className="text-slate-400 stroke-[2.5]" />
                              <span>{formatOrderDateTime(selectedOrder.createdAt).date}</span>
                              <span className="text-slate-300">•</span>
                              <Clock size={13} className="text-slate-400 stroke-[2.5]" />
                              <span>{formatOrderDateTime(selectedOrder.createdAt).time}</span>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="relative inline-flex items-center">
                                {!canChangeOrderStatus(selectedOrder.status) ? (
                                  <div 
                                    title="এই স্ট্যাটাসের অর্ডার পরিবর্তন করা সম্ভব নয় (Status Locked)"
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold rounded-full border shadow-3xs uppercase tracking-wider select-none cursor-not-allowed",
                                      getStatusBadge(selectedOrder.status).class
                                    )}
                                  >
                                    <Lock size={10} className="stroke-[2.5]" />
                                    <span>{normalizeStatus(selectedOrder.status)} (Locked)</span>
                                  </div>
                                ) : (
                                  <>
                                    <select
                                      value={normalizeStatus(selectedOrder.status)}
                                      onChange={async (e) => {
                                        const newStatus = e.target.value as Order['status'];
                                        await handleStatusChange(selectedOrder.id, newStatus);
                                        setSelectedOrder({ ...selectedOrder, status: newStatus });
                                      }}
                                      className={cn(
                                        "appearance-none pr-6 pl-3 py-1 text-[10px] font-extrabold rounded-full border cursor-pointer select-none transition-all shadow-3xs uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#2563EB]/20",
                                        getStatusBadge(selectedOrder.status).class
                                      )}
                                    >
                                      <option value="ORDER PLACED" className="bg-white text-slate-800 font-bold">ORDER PLACED</option>
                                      <option value="PRINTED" className="bg-white text-slate-800 font-bold">PRINTED</option>
                                      <option value="PREPARING" className="bg-white text-slate-800 font-bold">PREPARING</option>
                                      <option value="Ready" className="bg-white text-slate-800 font-bold">READY TO SHIP</option>
                                      <option value="PICK UP CANCEL" className="bg-white text-slate-800 font-bold">PICK UP CANCEL</option>
                                      <option value="SHIPPED" className="bg-white text-slate-800 font-bold">SHIPPED</option>
                                      <option value="SUCCESS" className="bg-white text-slate-800 font-bold">SUCCESS</option>
                                      <option value="PARTIAL DELIVERY" className="bg-white text-slate-800 font-bold">PARTIAL DELIVERY</option>
                                      <option value="HOLD" className="bg-white text-slate-800 font-bold">HOLD</option>
                                      <option value="RETURNED" className="bg-white text-slate-800 font-bold">RETURNED</option>
                                      <option value="CANCELLED" className="bg-white text-slate-800 font-bold">CANCELLED</option>
                                    </select>
                                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5] opacity-70" />
                                  </>
                                )}
                              </div>
                              <ParcelLiveStatusBadge order={selectedOrder} showDetails />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Order Composition Segment */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider text-left pl-1">
                        <ShoppingCart size={14} className="stroke-[2.5]" />
                        <span>Order Composition</span>
                      </div>
                      <div className="bg-[#F8F9FD] rounded-[24px] p-6 shadow-sm border border-white/60 text-left">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3 mb-3">
                          <div className="col-span-6">Item</div>
                          <div className="col-span-2 text-center">Qty</div>
                          <div className="col-span-2 text-right">Unit</div>
                          <div className="col-span-2 text-right">Total</div>
                        </div>

                        <div className="divide-y divide-slate-100/60">
                          {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                            selectedOrder.items.map((it, idx) => (
                              <div key={idx} className="grid grid-cols-12 gap-2 py-4 items-center first:pt-0 last:pb-0">
                                <div className="col-span-6">
                                  <span className="text-sm font-black text-slate-900 block leading-tight">{it.name}</span>
                                  <span className="text-[10px] font-bold text-slate-400 mt-1 block font-mono">
                                    {it.selectedSize || '30'} | ES {it.id ? it.id.slice(-3).toUpperCase() : '109'}
                                  </span>
                                </div>
                                <div className="col-span-2 text-center font-bold text-slate-800 text-sm">
                                  {it.quantity || 1}
                                </div>
                                <div className="col-span-2 text-right font-bold text-slate-500 text-sm font-mono">
                                  {formatPrice(it.price || 0, currency, rate)}
                                </div>
                                <div className="col-span-2 text-right font-black text-slate-900 text-sm font-mono">
                                  {formatPrice((it.price || 0) * (it.quantity || 1), currency, rate)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center text-xs text-slate-400 font-medium">No order items found</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Finance Totals & Standardized Large Action Trigger block */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-slate-300/40 items-end">
                      
                      {/* Financial Calculations list on Left Column */}
                      <div className="md:col-span-7 space-y-2.5 text-left bg-transparent p-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span>Subtotal</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {formatPrice(Array.isArray(selectedOrder.items) ? selectedOrder.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) : 0, currency, rate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span>Delivery Charge</span>
                          {(() => {
                            const freeInfo = getOrderFreeShippingDetails(selectedOrder);
                            if (freeInfo.isPantPromo) {
                              return (
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-slate-400 line-through text-[11px]">
                                    {formatPrice((selectedOrder as any).originalDeliveryCharge || (selectedOrder.city?.toLowerCase().includes('dhaka') ? 80 : 120), currency, rate)}
                                  </span>
                                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-sans">
                                    ৳০ (৩টি প্যান্টে ফ্রি)
                                  </span>
                                </div>
                              );
                            }
                            if (selectedOrder.deliveryCharge === 0 || selectedOrder.isFreeShipping) {
                              return (
                                <span className="font-bold text-emerald-700 font-mono">
                                  ৳০ (FREE)
                                </span>
                              );
                            }
                            return (
                              <span className="font-bold text-slate-800 font-mono">
                                {formatPrice(selectedOrder.deliveryCharge || 0, currency, rate)}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span>Discount</span>
                          <span className="font-bold text-[#EB5A3C] font-mono">
                            -{formatPrice((selectedOrder as any).discount || 0, currency, rate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span className="uppercase">
                            Advance Payment ({selectedOrder.paymentMethod === 'cod' ? 'COD' : String(selectedOrder.paymentMethod || 'ONLINE').toUpperCase()})
                          </span>
                          <span className="font-bold text-[#10B981] font-mono">
                            {formatPrice((selectedOrder as any).advancePayment || 0, currency, rate)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-300/40">
                          <span className="text-sm font-black text-slate-950 uppercase tracking-wider">Collectable</span>
                          <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                            {formatPrice(
                              (Array.isArray(selectedOrder.items) ? selectedOrder.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) : 0) + 
                              (selectedOrder.deliveryCharge || 0) - 
                              ((selectedOrder as any).discount || 0) - 
                              ((selectedOrder as any).advancePayment || 0),
                              currency,
                              rate
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Large Button Block on Right Column */}
                      <div className="md:col-span-5 flex flex-col gap-3">
                        <button 
                          onClick={() => {
                            setInvoiceOrder(selectedOrder);
                            setShowInvoiceModal(true);
                            if (canChangeOrderStatus(selectedOrder.status) && normalizeStatus(selectedOrder.status) !== 'PRINTED') {
                              updateOrderStatus(selectedOrder.id, 'PRINTED');
                            }
                          }}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-[20px] transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 border border-slate-700/30"
                        >
                          <Printer size={14} className="stroke-[2.5]" />
                          <span>Print Invoice</span>
                        </button>
                        
                        <button 
                          onClick={() => openOrderInCreateModal(selectedOrder)}
                          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-[20px] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Edit3 size={14} className="stroke-[2.5]" />
                          <span>Edit in Order Page (নতুন অর্ডার পেজ)</span>
                        </button>


                      </div>

                    </div>

                  </div>
                </>
              )}

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

                      if (invoiceOrder && canChangeOrderStatus(invoiceOrder.status) && normalizeStatus(invoiceOrder.status) !== 'PRINTED') {
                        updateOrderStatus(invoiceOrder.id, 'PRINTED');
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

      {/* Bulk Invoice Preview Modal */}
      <AnimatePresence>
        {showBulkInvoiceModal && selectedOrderIds.length > 0 && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 m-0 font-sans">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkInvoiceModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F8F9FD] rounded-[20px] w-full max-w-[180mm] overflow-hidden shadow-2xl relative z-10 border border-gray-200 flex flex-col max-h-[92vh]"
            >
              {/* Header with actions */}
              <div className="p-4 px-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Printer size={18} className="text-indigo-600" />
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm">Bulk Invoice Print Preview</h3>
                    <p className="text-xs text-gray-500">{selectedOrderIds.length} orders selected for batch printing</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={executePrintBulkInvoices}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Printer size={14} />
                    <span>Print All ({selectedOrderIds.length} Invoices)</span>
                  </button>
                  <button
                    onClick={() => setShowBulkInvoiceModal(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Scrollable body containing preview sheets */}
              <div className="p-6 overflow-y-auto bg-gray-100/70 space-y-6 max-h-[calc(92vh-80px)]">
                {orders
                  .filter(o => selectedOrderIds.includes(o.id))
                  .map((order, idx) => (
                    <div key={order.id} className="relative group">
                      <div className="flex items-center justify-between bg-[#F8F9FD] px-4 py-2 rounded-t-xl border border-b-0 border-gray-200 text-xs font-bold text-gray-700">
                        <span>Invoice #{idx + 1} of {selectedOrderIds.length} — Order #{order.invoiceNo || order.id} ({order.customerName})</span>
                        <button 
                          onClick={() => {
                            const next = selectedOrderIds.filter(id => id !== order.id);
                            setSelectedOrderIds(next);
                            if (next.length === 0) setShowBulkInvoiceModal(false);
                          }}
                          className="text-red-500 hover:text-red-700 text-[11px] font-bold cursor-pointer"
                        >
                          Remove from Batch
                        </button>
                      </div>
                      <div className="bg-[#F8F9FD] rounded-b-xl shadow-lg border border-gray-200 overflow-hidden flex justify-center p-2">
                        <InvoiceTemplate order={order} preview={true} />
                      </div>
                    </div>
                  ))}
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

      {/* PATHAO BOOKING CUSTOM MODAL */}
      <AnimatePresence>
        {pathaoBookingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 bg-[#E6ECF4] rounded-[28px] w-full max-w-[540px] overflow-hidden shadow-[-8px_-8px_24px_rgba(255,255,255,0.95),8px_8px_24px_rgba(165,180,205,0.4)] border border-white/90 flex flex-col font-sans max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-white/80 flex items-center justify-center bg-[#E6ECF4] relative text-center shrink-0">
                <div className="flex items-center gap-3 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-[#00B074] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Book via Pathao</h2>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">Invoice #{pathaoBookingOrder.invoiceNo || String(pathaoBookingOrder.id || '').replace(/^ORD-?/i, '')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setPathaoBookingOrder(null);
                    setPathaoSuccessResult(null);
                  }}
                  className="w-8 h-8 rounded-full bg-[#E2E8F2] border border-white/90 shadow-[-2px_-2px_5px_rgba(255,255,255,0.95),2px_2px_5px_rgba(165,180,205,0.35)] text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer absolute right-6 top-1/2 -translate-y-1/2"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto bg-[#E6ECF4] p-6 space-y-4 text-left">
                {!pathaoSuccessResult ? (
                  <>
                    {/* Recipient Box */}
                    <div className="bg-[#E2E8F2] border border-white/90 rounded-[20px] p-5 space-y-3 shadow-[inset_2px_2px_5px_rgba(160,175,200,0.25),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-extrabold text-slate-400 tracking-widest uppercase">Recipient</p>
                        {pathaoDetectedAddressInfo?.isAutoDetected && pathaoCity && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100/80 text-emerald-800 border border-emerald-300/60 rounded-full text-[10px] font-bold">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            ঠিকানা থেকে ম্যাচ করা হয়েছে
                          </span>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 text-slate-800">
                          <User size={15} className="text-slate-400 shrink-0" />
                          <span className="text-sm font-black">{pathaoBookingOrder.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <Phone size={15} className="text-slate-400 shrink-0" />
                          <span className="text-xs font-bold font-mono">{pathaoBookingOrder.phone}</span>
                        </div>
                        <div className="flex items-start gap-2.5 text-slate-500 leading-relaxed">
                          <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-xs font-medium">{pathaoBookingOrder.address}{pathaoBookingOrder.city ? `, ${pathaoBookingOrder.city}` : ''}</span>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-bold">COD Amount:</span>
                          <span className="text-sm font-black text-[#FF5A5F]">{formatPrice(pathaoBookingOrder.total)}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-bold">• Items: {Array.isArray(pathaoBookingOrder.items) ? pathaoBookingOrder.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0}</span>
                      </div>
                    </div>

                    {/* Pickup Store Info */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 tracking-widest uppercase ml-1">Pickup Store</label>
                      <input 
                        type="text" 
                        value={pathaoPickupStore}
                        onChange={(e) => setPathaoPickupStore(e.target.value)}
                        className="w-full bg-[#E2E8F0]/50 border border-slate-200/50 hover:border-slate-300 rounded-[14px] px-4 py-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-[#F8F9FD] transition-all"
                      />
                    </div>

                    {/* Location Selection Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 tracking-widest uppercase ml-1">City / District</label>
                        <select
                          value={pathaoCity}
                          onChange={(e) => {
                            const newCity = e.target.value;
                            setPathaoCity(newCity);
                            setPathaoZone('');
                          }}
                          className="w-full bg-[#E2E8F0]/50 border border-slate-200/50 hover:border-slate-300 rounded-[14px] px-3 py-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-[#F8F9FD] transition-all cursor-pointer"
                        >
                          <option value="">Select City / District</option>
                          {Object.keys(DISTRICT_THANAS).map(district => (
                            <option key={district} value={district}>{district}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 tracking-widest uppercase ml-1">Zone / Thana</label>
                        <select
                          value={pathaoZone}
                          onChange={(e) => setPathaoZone(e.target.value)}
                          className="w-full bg-[#E2E8F0]/50 border border-slate-200/50 hover:border-slate-300 rounded-[14px] px-3 py-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-[#F8F9FD] transition-all cursor-pointer"
                        >
                          <option value="">Select Zone / Thana</option>
                          {(DISTRICT_THANAS[pathaoCity] || []).map(thana => (
                            <option key={thana} value={thana}>{thana}</option>
                          ))}
                          {pathaoZone && !(DISTRICT_THANAS[pathaoCity] || []).includes(pathaoZone) && (
                            <option value={pathaoZone}>{pathaoZone}</option>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 tracking-widest uppercase ml-1">Area</label>
                        <input 
                          type="text" 
                          value={pathaoArea}
                          onChange={(e) => setPathaoArea(e.target.value)}
                          placeholder="Area (optional)"
                          className="w-full bg-[#E2E8F0]/50 border border-slate-200/50 hover:border-slate-300 rounded-[14px] px-3 py-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-[#F8F9FD] transition-all"
                        />
                      </div>
                    </div>

                    {/* Weight & Delivery Type Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 tracking-widest uppercase ml-1">Weight (KG)</label>
                        <input 
                          type="text" 
                          value={pathaoWeight}
                          onChange={(e) => setPathaoWeight(e.target.value)}
                          className="w-full bg-[#E2E8F0]/50 border border-slate-200/50 hover:border-slate-300 rounded-[14px] px-4 py-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-[#F8F9FD] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 tracking-widest uppercase ml-1">Delivery Type</label>
                        <select
                          value={pathaoDeliveryType}
                          onChange={(e) => setPathaoDeliveryType(e.target.value)}
                          className="w-full bg-[#E2E8F0]/50 border border-slate-200/50 hover:border-slate-300 rounded-[14px] px-4 py-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-[#F8F9FD] transition-all cursor-pointer"
                        >
                          <option value="48">Normal Delivery (48h)</option>
                          <option value="24">Express Delivery (24h)</option>
                        </select>
                      </div>
                    </div>

                    {/* Special Instructions */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 tracking-widest uppercase ml-1">Special Instruction</label>
                      <textarea 
                        value={pathaoSpecialInstruction}
                        onChange={(e) => setPathaoSpecialInstruction(e.target.value)}
                        placeholder="Handle with care, call before delivery..."
                        className="w-full bg-[#E2E8F0]/50 border border-slate-200/50 hover:border-slate-300 rounded-[14px] px-4 py-3 text-xs text-slate-800 font-bold h-20 focus:outline-none focus:border-emerald-500 focus:bg-[#F8F9FD] transition-all resize-none leading-normal"
                      />
                    </div>

                    {/* Action Button */}
                    <div className="pt-3">
                      <button
                        onClick={handleBookPathao}
                        disabled={bookingToPathao}
                        className="w-full py-4 bg-[#00B074] hover:bg-[#009c66] text-white rounded-[16px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg shadow-emerald-500/10 active:scale-98 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
                      >
                        {bookingToPathao ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Booking parcel...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 fill-white" />
                            <span>Book Pathao Delivery</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Success State Box */
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-pulse">
                      <CheckCircle2 size={56} className="stroke-[2.5]" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-black text-slate-900">Successfully Booked!</h3>
                      <p className="text-xs text-slate-500 font-medium">Your order has been recorded into the Pathao network.</p>
                    </div>

                    {/* Details Box */}
                    <div className="w-full bg-[#F8F9FD] border border-emerald-100 rounded-[20px] p-5 space-y-4 shadow-sm text-left">
                      <div>
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Consignment ID</span>
                        <div className="mt-1 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                          <span className="text-lg font-black text-emerald-800 font-mono tracking-wider">
                            {pathaoSuccessResult.consignment_id}
                          </span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Active tracking
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">SMS Notification Details</span>
                        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed font-mono relative">
                          <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <p className="font-sans pr-4">{pathaoSuccessResult.sms_text}</p>
                        </div>
                      </div>
                    </div>

                    {/* Done Button */}
                    <button
                      onClick={() => {
                        setPathaoBookingOrder(null);
                        setPathaoSuccessResult(null);
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STEADFAST BOOKING CUSTOM MODAL */}
      <AnimatePresence>
        {steadfastBookingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 bg-[#E6ECF4] rounded-[28px] w-full max-w-[540px] overflow-hidden shadow-[-8px_-8px_24px_rgba(255,255,255,0.95),8px_8px_24px_rgba(165,180,205,0.4)] border border-white/90 flex flex-col font-sans max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-white/80 flex items-center justify-center bg-[#E6ECF4] relative text-center shrink-0">
                <div className="flex items-center gap-3 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Book via Steadfast</h2>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">Order {(steadfastBookingOrder?.id || '').slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSteadfastBookingOrder(null);
                    setSteadfastSuccessResult(null);
                  }}
                  className="w-8 h-8 rounded-full bg-[#E2E8F2] border border-white/90 shadow-[-2px_-2px_5px_rgba(255,255,255,0.95),2px_2px_5px_rgba(165,180,205,0.35)] text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer absolute right-6 top-1/2 -translate-y-1/2"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto bg-[#E6ECF4] p-6 space-y-4 text-left">
                {!steadfastSuccessResult ? (
                  <>
                    {/* Recipient Box */}
                    <div className="bg-[#E2E8F2] border border-white/90 rounded-[20px] p-5 space-y-3 shadow-[inset_2px_2px_5px_rgba(160,175,200,0.25),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
                      <p className="text-[9px] font-extrabold text-slate-400 tracking-widest uppercase">Recipient</p>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 text-slate-800">
                          <User size={15} className="text-slate-400 shrink-0" />
                          <span className="text-sm font-black">{steadfastBookingOrder.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <Phone size={15} className="text-slate-400 shrink-0" />
                          <span className="text-xs font-bold font-mono">{steadfastBookingOrder.phone}</span>
                        </div>
                        <div className="flex items-start gap-2.5 text-slate-500 leading-relaxed">
                          <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-xs font-medium">{steadfastBookingOrder.address}, {steadfastBookingOrder.city}</span>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-bold">COD Amount:</span>
                          <span className="text-sm font-black text-[#FF5A5F]">{formatPrice(steadfastBookingOrder.total)}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-bold">• Items: {Array.isArray(steadfastBookingOrder.items) ? steadfastBookingOrder.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0}</span>
                      </div>
                    </div>

                    {/* Note / Special Instructions */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 tracking-widest uppercase ml-1">Special Instruction / Note</label>
                      <textarea 
                        value={steadfastNote}
                        onChange={(e) => setSteadfastNote(e.target.value)}
                        placeholder="Deliver safely, call before delivery..."
                        className="w-full bg-[#E2E8F0]/50 border border-slate-200/50 hover:border-slate-300 rounded-[14px] px-4 py-3 text-xs text-slate-800 font-bold h-24 focus:outline-none focus:border-indigo-500 focus:bg-[#F8F9FD] transition-all resize-none leading-normal"
                      />
                    </div>

                    {/* Action Button */}
                    <div className="pt-3">
                      <button
                        onClick={handleBookSteadfast}
                        disabled={isBookingToSteadfast}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[16px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg shadow-indigo-500/10 active:scale-98 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
                      >
                        {isBookingToSteadfast ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Booking parcel...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 fill-white" />
                            <span>Book Steadfast Delivery</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Success State Box */
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
                      <CheckCircle2 size={56} className="stroke-[2.5]" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-black text-slate-900">Successfully Booked!</h3>
                      <p className="text-xs text-slate-500 font-medium">Your order has been recorded into the Steadfast network.</p>
                    </div>

                    {/* Details Box */}
                    <div className="w-full bg-[#F8F9FD] border border-indigo-100 rounded-[20px] p-5 space-y-4 shadow-sm text-left">
                      <div>
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Consignment ID / Tracking Code</span>
                        <div className="mt-1 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                          <span className="text-lg font-black text-indigo-800 font-mono tracking-wider">
                            {steadfastSuccessResult.tracking_code}
                          </span>
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Active tracking
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">SMS Notification Details</span>
                        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed font-mono relative">
                          <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                          <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <p className="font-sans pr-4">{steadfastSuccessResult.sms_text}</p>
                        </div>
                      </div>
                    </div>

                    {/* Done Button */}
                    <button
                      onClick={() => {
                        setSteadfastBookingOrder(null);
                        setSteadfastSuccessResult(null);
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                )}
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

      {/* Google Sheet / Excel Order Scanner Modal */}
      <GoogleSheetImporterModal
        isOpen={showGoogleSheetModal}
        onClose={() => setShowGoogleSheetModal(false)}
        products={products}
        getNextOrderId={getNextOrderId}
        onImportOrders={async (ordersToSave) => {
          let count = 0;
          for (const order of ordersToSave) {
            try {
              await addOrder(order);
              count++;
            } catch (err) {
              console.error(`Failed to add sheet order ${order.id}:`, err);
            }
          }
          return count;
        }}
      />

      {/* Pathao & Courier Real-Time Live Sync Modal */}
      <PathaoSyncModal
        isOpen={showPathaoSyncModal}
        onClose={() => setShowPathaoSyncModal(false)}
        orders={orders}
        selectedOrderIds={selectedOrderIds}
      />
    </div>
  );
}
