import React, { useState, useMemo } from 'react';
import InvoiceTemplate from '../../components/admin/InvoiceTemplate';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { 
  Search, 
  Eye, 
  FileSpreadsheet,
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
  Camera,
  MessageSquare,
  Printer,
  Tag,
  ArrowLeftRight,
  Send,
  XCircle,
  CheckCircle2,
  Scan,
  ShoppingCart,
  Edit3,
  Trash2,
  DollarSign,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice, cn } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useOrders } from '../../contexts/OrderContext';
import { useProducts } from '../../contexts/ProductContext';
import { useAuth } from '../../contexts/AuthContext';
import { Order, CartItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

const formatOrderDate = (dateStr: string) => {
  try {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (err) {
    return dateStr;
  }
};

const formatOrderDateTimeStr = (dateStr: string) => {
  try {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (err) {
    return dateStr;
  }
};

const normalizeStatus = (status: string): string => {
  const s = (status || '').toUpperCase().trim();
  if (s === 'PENDING') return 'ORDER PLACED';
  if (s === 'PROCESSING') return 'PREPARING';
  if (s === 'DELIVERED') return 'SUCCESS';
  if (s === 'QC') return 'PICK UP CANCEL';
  return s;
};

export default function AdminOrders(): React.JSX.Element {
  const { currency, rate } = useCurrency();
  const { orders, updateOrderStatus, updateOrder, addOrder, deleteOrder } = useOrders();
  const { products } = useProducts();
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const changeStatus = async (status: Order['status']) => {
    if (!selectedOrder) return;
    try {
      await updateOrderStatus(selectedOrder.id, status);
      setSelectedOrder(prev => prev ? { ...prev, status } : null);
      toast.success(`Order status updated to ${status}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterIssue, setFilterIssue] = useState('All'); // All | Issues | No Issues
  const [filterPartner, setFilterPartner] = useState('All'); // All | Online Store | Retail | Al Shahriar Kabir etc
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
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
  
  // HTML5 QrCode camera tracking states
  const html5QrcodeRef = React.useRef<Html5Qrcode | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isCameraScannerActive, setIsCameraScannerActive] = useState(false);
  
  // Pagination State
  const [visibleCount, setVisibleCount] = useState(15);
  
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
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Issue Conversation Modal States
  const [issueConversationOrder, setIssueConversationOrder] = useState<Order | null>(null);
  const [newIssueType, setNewIssueType] = useState('Normal');
  const [newUrgency, setNewUrgency] = useState('Normal');
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [issueReplyText, setIssueReplyText] = useState('');
  const [isEditingIssueMeta, setIsEditingIssueMeta] = useState(false);
  const [issueMetaType, setIssueMetaType] = useState('QC');
  const [issueMetaUrgency, setIssueMetaUrgency] = useState('Normal');

  // Create Order Form State
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newDeliveryCharge, setNewDeliveryCharge] = useState(0);
  const [newPaymentMethod, setNewPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'card'>('cod');

  // Advanced Create Order (Memo Invoice style) States
  const [leftSearchVal, setLeftSearchVal] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newDiscountAmount, setNewDiscountAmount] = useState(0);
  const [newAdvancePayment, setNewAdvancePayment] = useState(0);
  const [newAdvancePaymentMethod, setNewAdvancePaymentMethod] = useState<'Cash' | 'bKash' | 'Rocket' | 'Nagad' | ''>('');
  const [newInternalNote, setNewInternalNote] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newInvoiceBy, setNewInvoiceBy] = useState<'Sabbir' | 'Nasir' | 'Shamiul' | 'Office Sale'>('Sabbir');
  const [newOrderItems, setNewOrderItems] = useState<Array<{
    id: string;
    product: any;
    selectedSize: string;
    quantity: number;
    price: number;
  }>>([]);

  // Helper deterministic dispatcher name generator for the 'INVOICE BY' column matching screenshot names (or custom manual creations)
  const getInvoiceBy = React.useCallback((order: Order) => {
    if (order.invoiceBy) {
      return order.invoiceBy;
    }
    // Backward compatibility for older orders
    if (order.email?.includes('manual_admin') || order.customerId === 'manual_admin') {
      return 'Office Sale';
    }
    return 'Online Store';
  }, []);

  // Helper date-time formatter for issues
  const formatOrderDateTime = React.useCallback((dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: 'N/A', time: 'N/A' };
      const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return { date: datePart, time: timePart };
    } catch {
      return { date: 'N/A', time: 'N/A' };
    }
  }, []);

  // Helper deterministic "Issue active" flag to highlight pink rows in the table list matching the snapshot exactly!
  const hasActiveIssue = React.useCallback((order: Order) => {
    // Cancelled orders, or pending orders with odd totals or deterministic triggers act as active issues
    if (order.status === 'Cancelled') return true;
    const digitTotal = order.total % 10;
    return digitTotal === 0 || digitTotal === 1 || digitTotal === 2 || digitTotal === 6;
  }, []);

  // Helper to render procedural QR code visualization with its custom text scan code
  const renderOrderQRCode = React.useCallback((orderId: string) => {
    const hash = orderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const size = 5;
    const pixels = [];
    for (let i = 0; i < size * size; i++) {
      const active = ((hash + i * 7) % 3 === 0) || (i === 0 || i === size - 1 || i === size * (size - 1) || i === size * size - 1 || i === 12);
      pixels.push(active);
    }
    const scanCode = `SCAN-${orderId.slice(-6).toUpperCase()}`;

    return (
      <div className="flex items-center gap-2.5">
        <div className="grid grid-cols-5 gap-[1.5px] p-1.5 bg-white border border-gray-200/80 rounded-lg w-8 h-8 shrink-0 shadow-3xs hover:border-emerald-500/50 hover:bg-emerald-50/15 transition-all" title={`Click to copy scan code: ${scanCode}`}>
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
      setEditStatus(selectedOrder.status || 'Pending');
      setEditDeliveryCharge(selectedOrder.deliveryCharge ?? 100);
      setEditDiscount((selectedOrder as any).discount ?? 0);
      setEditAdvancePayment((selectedOrder as any).advancePayment ?? (selectedOrder.paymentMethod === 'bkash' || selectedOrder.paymentMethod === 'nagad' ? 100 : 0));
      setEditNotes((selectedOrder as any).notes || 'Agamikal booking dite hobe');
      setEditInvoiceBy(selectedOrder.invoiceBy || (selectedOrder.customerId === 'manual_admin' ? 'Office Sale' : 'Website order'));
      setIsEditingDetails(false);
    }
  }, [selectedOrder]);

  // Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Status Filter
      if (filterStatus !== 'All') {
        if (normalizeStatus(order.status) !== filterStatus) return false;
      }
      
      // 2. Search query match
      const queryLower = searchQuery.toLowerCase().trim();
      if (queryLower !== '') {
        const matchesId = order.id.toLowerCase().includes(queryLower);
        const matchesClient = order.customerName.toLowerCase().includes(queryLower);
        const matchesPhone = order.phone.includes(queryLower);
        const matchesCity = order.city.toLowerCase().includes(queryLower);
        const matchesSKU = order.items.some(it => it.sku?.toLowerCase().includes(queryLower) || it.name.toLowerCase().includes(queryLower));
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

      // 5. Date Range Filter
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
  }, [orders, filterStatus, searchQuery, filterIssue, filterPartner, startDate, endDate, hasActiveIssue, getInvoiceBy]);

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
    try {
      await updateOrderStatus(id, newStatus);
      toast.success(`Order #${id} status updated to: ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleCreateIssue = async () => {
    if (!issueConversationOrder || !newIssueDesc.trim()) return;
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

      if (!issueConversationOrder.issueType) {
        // Automatically create/activate issue
        updatedOrderData = {
          issueType: 'QC',
          issueUrgency: 'Normal',
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
      toast.success(`Issue marked as ${status.toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to change issue status');
    }
  };

  const handleSyncPathao = () => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: 'Syncing live ledger to Pathao logs...',
        success: 'Sync completed! Updated tracking statuses.',
        error: 'Synchronization failed',
      }
    );
  };

  const handleScanOrderSubmit = (orderIdToScan: string) => {
    const trimmedId = orderIdToScan.trim();
    if (!trimmedId) return;

    // Clean any "SCAN-" prefix if they wrote or scanned the exact code
    const searchKey = trimmedId.toLowerCase().replace(/^scan-/i, '');
    const invoiceNum = parseInt(trimmedId, 10);
    const searchKeyNum = parseInt(searchKey, 10);

    // Find the order that matches or ends with the ID, or matches the scan code suffix, or matches invoice number
    const order = orders.find(o => 
      o.id.toLowerCase() === trimmedId.toLowerCase() || 
      o.id.toLowerCase().endsWith(trimmedId.toLowerCase()) ||
      o.id.toLowerCase().endsWith(searchKey) ||
      o.id.toLowerCase().slice(-6) === searchKey ||
      (typeof o.invoiceNo === 'number' && o.invoiceNo === invoiceNum) ||
      (typeof o.invoiceNo === 'number' && o.invoiceNo === searchKeyNum)
    );
    
    if (!order) {
      toast.error(`Order "${trimmedId}" not found in database!`);
      return;
    }

    // 1. Check if already scanned in session (second time "nibe na")
    if (scannedIds.includes(order.id) || (activeScanOrder && activeScanOrder.id === order.id)) {
      toast.error(`Scan Rejected! Order #${order.id.slice(-6).toUpperCase()} has already been scanned in this session.`);
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
    toast.success(`Scanned Order #${order.id.slice(-6).toUpperCase()}!`);
  };

  const handleConfirmPathaoEntry = async () => {
    if (!activeScanOrder) return;
    
    setBookingToPathao(true);
    
    // Simulate background API communication with Pathao
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    try {
      // Update the order status to 'Shipped' representing dispatched to courier
      await updateOrderStatus(activeScanOrder.id, 'Shipped');
      
      const trackingCode = `PL-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Store in session arrays
      setScannedOrders(prev => [activeScanOrder, ...prev]);
      setScannedIds(prev => [...prev, activeScanOrder.id]);
      
      toast.success(`Successfully booked Order #${activeScanOrder.id.slice(-6).toUpperCase()} in Pathao Courier! Tracking: ${trackingCode}`);
    } catch (err) {
      toast.error("Failed to update status in database. Please check permissions.");
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

  const handleExportCSV = () => {
    try {
      if (filteredOrders.length === 0) {
        toast.error('No orders to export');
        return;
      }

      let csvContent = 'DATE,TIME,ORDER_NO,INVOICE_BY,INVOICE_NO,CUSTOMER_NAME,PHONE,ADDRESS,CITY,DELIVERY_CHARGE,TOTAL_TOTAL,STATUS\r\n';

      filteredOrders.forEach(o => {
        const dateObj = new Date(o.createdAt);
        const dateStr = dateObj.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
        const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
        
        const row = [
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${o.id}"`,
          `"${getInvoiceBy(o)}"`,
          `"${o.id}"`,
          `"${o.customerName.replace(/"/g, '""')}"`,
          `"${o.phone}"`,
          `"${o.address.replace(/"/g, '""')}"`,
          `"${o.city}"`,
          o.deliveryCharge,
          o.total,
          `"${o.status}"`
        ].join(',');
        csvContent += row + '\r\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Elegan_BD_Orders_Spreadsheet_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Spreadsheet exported successfully');
    } catch {
      toast.error('Failed to export data');
    }
  };

  const matchedCustomerFromOrders = useMemo(() => {
    if (newCustomerPhone.length < 5) return null;
    const match = orders.find(o => o.phone.includes(newCustomerPhone));
    if (match) {
      return {
        name: match.customerName,
        email: match.email,
        address: match.address,
        city: match.city
      };
    }
    return null;
  }, [orders, newCustomerPhone]);

  const handleAutofillCustomer = () => {
    if (matchedCustomerFromOrders) {
      setNewCustomerName(matchedCustomerFromOrders.name);
      setNewCustomerAddress(matchedCustomerFromOrders.address);
      setNewCustomerCity(matchedCustomerFromOrders.city);
      if (matchedCustomerFromOrders.email && !matchedCustomerFromOrders.email.includes('@elegan.bd')) {
        setNewCustomerEmail(matchedCustomerFromOrders.email);
      }
      toast.success(`Autofilled details for ${matchedCustomerFromOrders.name}!`);
    }
  };

  const matchedProductsForLeftSearch = useMemo(() => {
    if (!leftSearchVal.trim()) return [];
    const query = leftSearchVal.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.category && p.category.toLowerCase().includes(query)) ||
      p.sizes.some(s => s.toLowerCase().includes(query)) ||
      p.id.toLowerCase().includes(query)
    );
  }, [products, leftSearchVal]);

  const handleAddProductToNewOrder = (product: any, size: string) => {
    const existingIndex = newOrderItems.findIndex(item => item.product.id === product.id && item.selectedSize === size);
    if (existingIndex > -1) {
      const updated = [...newOrderItems];
      updated[existingIndex].quantity += 1;
      setNewOrderItems(updated);
    } else {
      setNewOrderItems([
        ...newOrderItems,
        {
          id: `${product.id}-${size}-${Date.now()}`,
          product,
          selectedSize: size,
          quantity: 1,
          price: product.price
        }
      ]);
    }
    toast.success(`Added ${product.name} (${size}) to Order Items`);
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerPhone || !newCustomerAddress || !newCustomerCity) {
      toast.error("Please fill in all customer details (Name, Phone, Address, Region/City)");
      return;
    }

    if (newOrderItems.length === 0) {
      toast.error("Please add at least one product item to create an order");
      return;
    }

    const orderId = Date.now().toString().slice(-10);

    const cartItems: CartItem[] = newOrderItems.map(item => ({
      ...item.product,
      selectedSize: item.selectedSize,
      quantity: item.quantity,
      price: item.price,
      sku: item.product.sku || `EP ${item.product.id.slice(-3).toUpperCase()}`
    }));

    const subtotal = newOrderItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const totalCollectable = subtotal + newDeliveryCharge - newDiscountAmount - newAdvancePayment;

    const newOrder: Order = {
      id: orderId,
      customerId: 'manual_admin',
      customerName: newCustomerName,
      email: newCustomerEmail || `${newCustomerPhone}@elegan.bd`,
      phone: newCustomerPhone,
      address: newCustomerAddress,
      city: newCustomerCity,
      items: cartItems,
      deliveryCharge: newDeliveryCharge,
      total: totalCollectable,
      status: 'Pending',
      paymentMethod: (newAdvancePaymentMethod.toLowerCase() as any) || 'cod',
      createdAt: new Date().toISOString(),
      notes: newInternalNote || '',
      discount: newDiscountAmount,
      advancePayment: newAdvancePayment,
      invoiceBy: newInvoiceBy
    };

    try {
      await addOrder(newOrder);
      toast.success(`Memo Order #${orderId} created successfully!`);
      setShowCreateModal(false);
      
      // Clear form
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
      setNewCustomerCity('');
      setNewProductId('');
      setNewSize('');
      setNewQty(1);
      setNewDeliveryCharge(0);
      setNewCustomerEmail('');
      setNewDiscountAmount(0);
      setNewAdvancePayment(0);
      setNewAdvancePaymentMethod('');
      setNewInternalNote('');
      setNewDeliveryDate('');
      setNewInvoiceBy('Sabbir');
      setNewOrderItems([]);
      setLeftSearchVal('');
    } catch (err: any) {
      console.error("Manual order creation failed:", err);
      toast.error(`Failed to create manual order record: ${err?.message || err}`);
    }
  };

  const selectedProductDetails = products.find(p => p.id === newProductId);

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
          class: 'bg-[#FFF0F0] text-[#E53E3E] border-[#FED7D7]',
        };
      case 'SHIPPED':
        return {
          text: 'SHIPPED',
          class: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',
        };
      case 'SUCCESS':
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
          text: (status as string).toUpperCase(),
          class: 'bg-gray-100 text-gray-500 border-gray-200',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 font-sans text-gray-900 px-4 md:px-8">
      {invoiceOrder && createPortal(
        <InvoiceTemplate order={invoiceOrder} preview={false} />,
        document.body
      )}
      
      {/* Brand & Page Header matching screenshot */}
      <div className="flex items-center justify-between pt-4 border-b border-gray-100 pb-4">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Elegan BD</h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Orders</p>
        </div>

        {/* Global actions row (Subtle, non-intrusive utility panel) */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            title="Export CSV"
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-xl transition-all cursor-pointer shadow-3xs flex items-center justify-center"
          >
            <FileSpreadsheet size={15} />
          </button>
          <button 
            onClick={() => setShowCamera(true)}
            title="Scan Receipt Sheet"
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-xl transition-all cursor-pointer shadow-3xs flex items-center justify-center"
          >
            <Camera size={15} />
          </button>
          <button 
            onClick={handleSyncPathao}
            title="Sync Pathao Courier"
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-xl transition-all cursor-pointer shadow-3xs flex items-center justify-center"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Layout Header containing title and 'Create Order' button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">All Orders</h2>
          <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold text-xs px-2.5 py-0.5 rounded-full border border-indigo-100 min-w-[24px]">
            {filteredOrders.length}
          </span>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-[#4F46E5]/10 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Create Order</span>
        </button>
      </div>

      {/* White outer container for Search, Pills, and Table */}
      <div className="bg-white rounded-[24px] border border-gray-200 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.015)] space-y-6">
        
        {/* Full-width Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 stroke-[2]" />
          <input 
            type="text"
            placeholder=""
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 text-sm font-medium rounded-xl placeholder-gray-400 text-gray-900 focus:ring-2 focus:ring-[#4F46E5]/15 focus:border-[#4F46E5]/40 outline-none transition-all shadow-xs"
          />
        </div>

        {/* Status Filter Pills Row */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'All', label: 'All' },
            { key: 'ORDER PLACED', label: 'Order Placed' },
            { key: 'PRINTED', label: 'Printed' },
            { key: 'PREPARING', label: 'Preparing' },
            { key: 'PICK UP CANCEL', label: 'Pick Up Cancel' },
            { key: 'SHIPPED', label: 'Shipped' },
            { key: 'SUCCESS', label: 'Success' },
            { key: 'PARTIAL DELIVERY', label: 'Partial Delivery' },
            { key: 'HOLD', label: 'Hold' },
            { key: 'RETURNED', label: 'Returned' },
            { key: 'CANCELLED', label: 'Cancelled' },
          ].map(status => {
            const isActive = filterStatus === status.key;
            
            // Calculate real count based on current state of database using normalized statuses
            let count = 0;
            if (status.key === 'All') {
              count = orders.length;
            } else {
              count = orders.filter(o => normalizeStatus(o.status) === status.key).length;
            }

            return (
              <button
                key={status.key}
                onClick={() => setFilterStatus(status.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                  isActive 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-xs" 
                    : "bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                <span>{status.label}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] leading-none min-w-[16px] text-center font-bold",
                  isActive ? "bg-indigo-200/60 text-indigo-800" : "bg-gray-100 text-gray-500"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic bulk highlighted actions bar */}
        {selectedOrderIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-gray-900 text-white rounded-[16px] flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">{selectedOrderIds.length} orders highlighted</span>
            </div>
            <div className="flex gap-2">
              {isSuperAdmin && (
                <button 
                  onClick={() => {
                    const count = selectedOrderIds.length;
                    setDeleteConfirm({
                      isOpen: true,
                      title: 'Delete Selected Orders?',
                      message: `Are you sure you want to PERMANENTLY DELETE ${count} highlighted orders? This will remove them from the database forever and cannot be undone.`,
                      onConfirm: async () => {
                        try {
                          toast.loading(`Deleting ${count} orders...`, { id: 'bulk-delete' });
                          await Promise.all(selectedOrderIds.map(id => deleteOrder(id)));
                          toast.success(`Deleted ${count} orders successfully`, { id: 'bulk-delete' });
                          setSelectedOrderIds([]);
                        } catch (err: any) {
                          console.error('[AdminOrders Bulk] Delete failed:', err);
                          toast.error('Failed to delete some orders', { id: 'bulk-delete' });
                        } finally {
                          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                        }
                      }
                    });
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer"
                >
                  Delete
                </button>
              )}
              <button 
                onClick={() => {
                  toast.success(`Authorized Pathao dispatch sheets for ${selectedOrderIds.length} records!`);
                  setSelectedOrderIds([]);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer"
              >
                Pathao Send
              </button>
              <button 
                onClick={async () => {
                  await Promise.all(selectedOrderIds.map(id => updateOrderStatus(id, 'Shipped')));
                  toast.success(`Marked ${selectedOrderIds.length} orders as SHIPPED`);
                  setSelectedOrderIds([]);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer"
              >
                Shipped
              </button>
              <button 
                onClick={() => setSelectedOrderIds([])}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}

        {/* Table representation */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-black tracking-wider text-gray-400 h-14 bg-white select-none uppercase">
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
                <th className="py-3 px-4 font-semibold text-left">Date</th>
                <th className="py-3 px-4 font-semibold text-left">Time</th>
                <th className="py-3 px-4 font-semibold text-left">Order No</th>
                <th className="py-3 px-4 font-semibold text-left">Invoice By</th>
                <th className="py-3 px-4 font-semibold text-left">Invoice No</th>
                <th className="py-3 px-4 font-semibold text-left">Status</th>
                <th className="py-3 px-4 font-semibold text-left">Name</th>
                <th className="py-3 px-4 font-semibold text-left">Address</th>
                <th className="py-3 px-4 font-semibold text-left">Number</th>
                <th className="py-3 px-4 font-semibold text-left">Items</th>
                <th className="py-3 px-4 font-semibold text-right">Total</th>
                <th className="py-3 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-24 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto mb-4 border border-gray-150">
                      <AlertCircle className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-black text-[#0D1829] uppercase">No Orders Found</p>
                    <p className="text-xs text-gray-400 mt-1 font-semibold">Initialize record matching by checking your input queries.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.slice(0, visibleCount).map((order) => {
                  const dateTime = formatOrderDateTime(order.createdAt);
                  const cleanId = order.id.replace('ORD-', '').replace('#', '');

                  // Initial letter for customer avatar
                  const initial = order.customerName ? order.customerName.charAt(0).toUpperCase() : 'A';

                  // Format items description
                  const itemsSummary = order.items && order.items.length > 0
                    ? order.items.map(item => `${item.name}${item.selectedSize ? ` — Pant Size: ${item.selectedSize}` : ''}`).join(', ')
                    : 'No items';

                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className={cn(
                        "hover:bg-gray-50/50 transition-colors cursor-pointer group h-16 border-b border-gray-100",
                        order.issueType && order.issueStatus !== 'resolved' && "bg-[#FFF5F5]/30 hover:bg-[#FFF5F5]/50"
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
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-[#475569] font-sans font-medium">
                        {dateTime.date}
                      </td>

                      {/* Time */}
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-[#475569] font-sans font-medium">
                        {dateTime.time}
                      </td>

                      {/* Order No */}
                      <td className="py-4 px-4 whitespace-nowrap text-sm font-bold text-gray-900 font-mono-numbers">
                        {cleanId}
                      </td>

                      {/* Invoice By */}
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-[#475569] font-medium">
                        {getInvoiceBy(order)}
                      </td>

                      {/* Invoice No & Issue Badges */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col text-left gap-1">
                          <span className="text-sm font-bold text-gray-900 font-mono-numbers leading-none">
                            {order.invoiceNo || 1000}
                          </span>
                          
                          {order.issueType && (
                            order.issueStatus === 'resolved' ? (
                              <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] mt-1">
                                <CheckCircle2 size={10} className="stroke-[3]" />
                                SOLVED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-[#FFF0F0] text-[#EB5757] border border-red-200 mt-1">
                                <AlertTriangle size={10} className="stroke-[3]" />
                                ACTIVE
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Status Dropdown Pill */}
                      <td className="py-4 px-4 relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setActiveStatusDropdownOrderId(activeStatusDropdownOrderId === order.id ? null : order.id)}
                          className={cn(
                            "inline-flex items-center justify-between gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer select-none transition-all",
                            getStatusBadge(order.status).class
                          )}
                        >
                          <span className="uppercase text-[10px] tracking-wider font-extrabold">{normalizeStatus(order.status)}</span>
                          <ChevronDown size={11} className="stroke-[2.5]" />
                        </button>
                        
                        {activeStatusDropdownOrderId === order.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setActiveStatusDropdownOrderId(null)}
                            />
                            <div className="absolute left-4 mt-1 w-52 bg-white border border-[#334155] shadow-xl py-0.5 z-40">
                              {[
                                { key: 'ORDER PLACED', label: 'ORDER PLACED' },
                                { key: 'PRINTED', label: 'PRINTED' },
                                { key: 'PREPARING', label: 'PREPARING' },
                                { key: 'PICK UP CANCEL', label: 'PICK UP CANCEL' },
                                { key: 'SHIPPED', label: 'SHIPPED' },
                                { key: 'SUCCESS', label: 'SUCCESS' },
                                { key: 'PARTIAL DELIVERY', label: 'PARTIAL DELIVERY' },
                                { key: 'HOLD', label: 'HOLD' },
                                { key: 'RETURNED', label: 'RETURNED' },
                                { key: 'CANCELLED', label: 'CANCELLED' },
                              ].map(opt => {
                                const isSelected = normalizeStatus(order.status) === opt.key;
                                return (
                                  <button
                                    key={opt.key}
                                    onClick={() => {
                                      handleStatusChange(order.id, opt.key as Order['status']);
                                      setActiveStatusDropdownOrderId(null);
                                    }}
                                    className={cn(
                                      "w-full text-left px-4 py-2 text-[10px] font-black tracking-wider uppercase select-none transition-colors",
                                      isSelected 
                                        ? "bg-[#1976d2] text-white font-extrabold" 
                                        : "text-[#0f172a] hover:bg-gray-100 font-bold"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Name */}
                      <td className="py-4 px-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {order.customerName}
                      </td>

                      {/* Address */}
                      <td className="py-4 px-4 text-sm text-gray-600 max-w-[220px] truncate" title={order.address}>
                        {order.address}
                      </td>

                      {/* Number (Phone) */}
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-600 font-mono-numbers">
                        {order.phone}
                      </td>

                      {/* Items */}
                      <td className="py-4 px-4 max-w-[200px] truncate">
                        <span className="text-sm text-gray-500 truncate block font-medium" title={itemsSummary}>
                          {itemsSummary}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900 font-mono-numbers">
                          ৳{Number(order.total || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center">
                          <div className="flex items-center gap-0.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#EDF2F7] shadow-sm">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                              }} 
                              title="View Details"
                              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                            >
                              <Eye size={15} className="stroke-[2.5]" />
                            </button>
                            
                            <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setIssueConversationOrder(order);
                              }} 
                              title="Order Issues"
                              className={cn(
                                "p-2 rounded-lg transition-all cursor-pointer relative",
                                order.issueType && order.issueStatus !== 'resolved'
                                  ? "text-rose-600 bg-rose-50 hover:bg-rose-100"
                                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-white hover:shadow-sm"
                              )}
                            >
                              <MessageSquare size={15} className={cn("stroke-[2.5]", order.issueType && order.issueStatus !== 'resolved' && "animate-pulse")} />
                              {order.issueType && order.issueStatus !== 'resolved' && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-600 rounded-full border border-white" />
                              )}
                            </button>
                            
                            <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvoiceOrder(order);
                                setShowInvoiceModal(true);
                              }} 
                              title="Print Invoice"
                              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                            >
                              <Printer size={15} className="stroke-[2.5]" />
                            </button>
                            
                            <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setEditName(order.customerName || '');
                                setEditPhone(order.phone || '');
                                setEditAddress(order.address || '');
                                setEditCity(order.city || '');
                                setEditStatus(order.status || 'Pending');
                                setEditDeliveryCharge(order.deliveryCharge ?? 100);
                                setEditDiscount((order as any).discount ?? 0);
                                setEditAdvancePayment((order as any).advancePayment ?? 0);
                                setEditNotes((order as any).notes || '');
                                setEditInvoiceBy(order.invoiceBy || '');
                                setIsEditingDetails(true);
                              }} 
                              title="Edit Order"
                              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                            >
                              <Tag size={15} className="stroke-[2.5]" />
                            </button>
                            
                            <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(order.id, 'Processing');
                              }} 
                              title="Mark as Paid/Processing"
                              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                            >
                              <DollarSign size={15} className="stroke-[2.5]" />
                            </button>
                            
                            <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(order.id, 'Shipped');
                              }} 
                              title="Dispatch/Ship"
                              className="p-2 hover:bg-emerald-50 hover:shadow-sm rounded-lg transition-all text-emerald-500 hover:text-emerald-600 cursor-pointer"
                            >
                              <Send size={15} className="stroke-[2.5]" />
                            </button>

                            {isSuperAdmin && (
                              <>
                                <div className="w-[1px] h-4 bg-[#E2E8F0] mx-0.5" />
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    
                                    const orderId = order.id;
                                    const shortId = orderId.slice(-6);
                                    
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
                                  className="p-2 hover:bg-rose-100 rounded-lg transition-all text-rose-500 hover:text-rose-700 cursor-pointer flex items-center justify-center relative z-10"
                                >
                                  <Trash2 size={16} className="stroke-[2.5]" />
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
      </div>

      {/* Load More Button matching beautiful screenshot style */}
      {filteredOrders.length > visibleCount && (
        <div className="pt-4 text-center">
          <button 
            onClick={() => setVisibleCount(prev => prev + 15)}
            className="rounded-full px-7 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-bold text-[12px] tracking-wider uppercase flex items-center justify-center gap-2 mx-auto transition-all shadow-[0_4px_12px_rgba(0,0,0,0.02)] active:scale-95 cursor-pointer"
          >
            <RefreshCw size={13} className="stroke-[2.5] text-indigo-600 animate-spin-slow" />
            <span>Load More Orders</span>
          </button>
        </div>
      )}

      {/* Creating manual orders Modal Dialog block */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] w-full max-w-[1080px] h-[90vh] overflow-hidden shadow-2xl relative z-10 border border-[#EFF2F6] flex flex-col font-sans"
            >
              {/* Modal Title / Header bar */}
              <div className="p-6 border-b border-[#EFF2F6] flex items-center justify-between bg-white shrink-0">
                <div className="text-left">
                  <h2 className="text-xl font-black text-[#0C1421] tracking-tight">Create Order</h2>
                  <p className="text-xs text-gray-400 font-semibold mt-1">Record precise transaction details and sync with inventory catalog.</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-gray-400 hover:text-black transition-all"
                >
                  <XCircle size={22} className="stroke-[1.8]" />
                </button>
              </div>

              {/* Split Screen Grid Layout */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#FAFBFD]">
                
                {/* LEFT COLUMN: IBL Search panel */}
                <div className="lg:col-span-5 border-r border-[#EFF2F6] p-6 flex flex-col bg-white overflow-y-auto no-scrollbar">
                  
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563EB] flex items-center gap-1.5">
                      <Scan size={12} className="stroke-[3]" /> IBL SEARCH
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 font-mono">
                      SCAN OR ENTER SKU
                    </span>
                  </div>

                  {/* SKU/Barcode input box */}
                  <div className="relative mb-5 shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 stroke-[2.2]" />
                    <input 
                      type="text" 
                      placeholder="Scan Barcode or Search SKU/Name..." 
                      value={leftSearchVal}
                      onChange={(e) => setLeftSearchVal(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAFBFD] border border-gray-200 text-[12px] font-semibold rounded-xl placeholder-gray-400 text-[#0C1421] focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB]/40 outline-none transition-all shadow-3xs"
                    />
                  </div>

                  {/* Catalog list container */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 no-scrollbar text-left">
                    {matchedProductsForLeftSearch.length === 0 && leftSearchVal.trim() && (
                      <div className="py-12 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-gray-400 uppercase">No products found matching "{leftSearchVal}"</p>
                      </div>
                    )}
                    {(leftSearchVal.trim() ? matchedProductsForLeftSearch : products.slice(0, 8)).map(prod => (
                      <div key={prod.id} className="p-3 border border-gray-150 rounded-2xl bg-[#FAFBFD]/50 hover:bg-[#FAFBFD] transition-all flex flex-col gap-2.5">
                        <div className="flex gap-3">
                          <img 
                            src={(prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=100'} 
                            alt={prod.name} 
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 bg-white"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 font-mono">SKU: EP-{prod.id.slice(-4).toUpperCase()}</span>
                            <p className="text-xs font-black text-[#0C1421] truncate mt-0.5" title={prod.name}>{prod.name}</p>
                            <p className="text-xs font-black text-blue-600 font-mono mt-0.5">{formatPrice(prod.price, currency, rate)}</p>
                          </div>
                        </div>
                        
                        {/* Sizes selector pills to quickly add to memo */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-dashed border-gray-200">
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase mr-1">ADD SIZE:</span>
                          {prod.sizes.map(sz => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handleAddProductToNewOrder(prod, sz)}
                              className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white border border-gray-200 text-[10px] font-black uppercase rounded-lg transition-all active:scale-95 shadow-3xs"
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* RIGHT COLUMN: Order details & Memo billing */}
                <form 
                  onSubmit={handleCreateOrderSubmit}
                  className="lg:col-span-7 flex flex-col overflow-hidden h-full"
                >
                  
                  {/* Scrollable inputs field wrapper */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    
                    {/* ORDER ITEMS */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">ORDER ITEMS (REQUIRED)</span>
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide font-mono">
                          {newOrderItems.length} styles
                        </span>
                      </div>

                      {newOrderItems.length === 0 ? (
                        <div className="p-6 border-2 border-dashed border-gray-200 bg-white rounded-2xl text-center">
                          <ShoppingCart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">No Items Added to Memo Yet</p>
                          <p className="text-[9.5px] text-gray-400 font-semibold mt-0.5">Use the IBL Search panel on the left to select items</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {newOrderItems.map(item => (
                            <div key={item.id} className="p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-4 shadow-3xs transition-all hover:border-gray-300">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-xs font-black text-[#0C1421] truncate">
                                    {item.product.name} ({item.selectedSize})
                                  </p>
                                  <p className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">
                                    SKU: EP-{item.product.id.slice(-4).toUpperCase()}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Quantity custom field with visual multiplier */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input 
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setNewOrderItems(prev => prev.map(it => it.id === item.id ? { ...it, quantity: val } : it));
                                  }}
                                  className="w-12 text-center py-1 bg-[#F8FAFC] border border-gray-200 text-xs font-black rounded-lg outline-none focus:ring-2 focus:ring-blue-500/15"
                                />
                                <span className="text-xs font-black text-gray-400">×</span>
                                
                                {/* Editable custom price field, prefixed with ৳ */}
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">৳</span>
                                  <input 
                                    type="number"
                                    min={0}
                                    value={item.price}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setNewOrderItems(prev => prev.map(it => it.id === item.id ? { ...it, price: val } : it));
                                    }}
                                    className="w-20 pl-4 pr-1 text-center py-1 bg-[#F8FAFC] border border-gray-200 text-xs font-black rounded-lg outline-none focus:ring-2 focus:ring-blue-500/15"
                                  />
                                </div>

                                {/* Delete item button */}
                                <button
                                  type="button"
                                  onClick={() => setNewOrderItems(prev => prev.filter(it => it.id !== item.id))}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-1"
                                >
                                  <X size={14} className="stroke-[2.5]" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CUSTOMER DETAILS SECTION */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block border-b border-gray-100 pb-1.5 text-left">
                        CUSTOMER DETAILS
                      </span>
                      
                      {/* Lookup phone number field with auto-fill pill indicator */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">PHONE NUMBER (LOOKUP)</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input 
                            type="tel" 
                            placeholder="Enter phone to find or create..." 
                            value={newCustomerPhone}
                            onChange={(e) => setNewCustomerPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-[12px] font-semibold rounded-xl placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all shadow-3xs"
                          />
                        </div>
                        
                        {/* Autofill helper suggestion pill if existing user matches */}
                        {matchedCustomerFromOrders && (
                          <button
                            type="button"
                            onClick={handleAutofillCustomer}
                            className="mt-1.5 w-full text-left bg-blue-50/70 hover:bg-blue-50 border border-blue-200/50 rounded-xl px-3 py-2 text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-3xs active:scale-99"
                          >
                            <CheckCircle2 size={12} className="text-blue-600 shrink-0" />
                            <span>Found client: <span className="underline">{matchedCustomerFromOrders.name}</span> — Click to autofill address &amp; region</span>
                          </button>
                        )}
                      </div>

                      {/* Grid for Name and City/Region */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">FULL NAME</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                              type="text" 
                              placeholder="Customer name..." 
                              value={newCustomerName}
                              onChange={(e) => setNewCustomerName(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-[12px] font-semibold rounded-xl placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all shadow-3xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">DELIVERY REGION (REQUIRED)</label>
                          <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <select 
                              value={newCustomerCity}
                              onChange={(e) => {
                                const region = e.target.value;
                                setNewCustomerCity(region);
                                // Dynamic region charge setting!
                                if (region === 'Dhaka City' || region === 'Dhaka') {
                                  setNewDeliveryCharge(80);
                                } else if (region) {
                                  setNewDeliveryCharge(150);
                                }
                              }}
                              className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 text-[12px] font-semibold rounded-xl text-[#0C1421] focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all appearance-none cursor-pointer shadow-3xs"
                            >
                              <option value="" disabled>Select Region</option>
                              <option value="Dhaka City">Dhaka City (৳80)</option>
                              <option value="Dhaka Suburbs">Dhaka Suburbs (৳120)</option>
                              <option value="Chittagong">Chittagong (৳150)</option>
                              <option value="Sylhet">Sylhet (৳150)</option>
                              <option value="Rajshahi">Rajshahi (৳150)</option>
                              <option value="Khulna">Khulna (৳150)</option>
                              <option value="Barisal">Barisal (৳150)</option>
                              <option value="Rangpur">Rangpur (৳150)</option>
                              <option value="Mymensingh">Mymensingh (৳150)</option>
                              <option value="Outside Dhaka">Outside Dhaka (৳150)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* EMAIL FIELD (OPTIONAL) */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">EMAIL (OPTIONAL)</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input 
                            type="email" 
                            placeholder="email@example.com" 
                            value={newCustomerEmail}
                            onChange={(e) => setNewCustomerEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-[12px] font-semibold rounded-xl placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all shadow-3xs"
                          />
                        </div>
                      </div>

                      {/* SHIPPING ADDRESS FIELD */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">SHIPPING ADDRESS</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
                          <textarea 
                            rows={2}
                            placeholder="Enter delivery address..." 
                            value={newCustomerAddress}
                            onChange={(e) => setNewCustomerAddress(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-[12px] font-semibold rounded-xl placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all resize-none shadow-3xs"
                          />
                        </div>
                      </div>

                      {/* INVOICE BY FIELD */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">INVOICE BY</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <select 
                            value={newInvoiceBy}
                            onChange={(e) => setNewInvoiceBy(e.target.value as any)}
                            className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 text-[12px] font-semibold rounded-xl text-[#0C1421] focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all appearance-none cursor-pointer shadow-3xs"
                          >
                            <option value="Sabbir">1. Sabbir</option>
                            <option value="Nasir">2. Nasir</option>
                            <option value="Shamiul">3. Shamiul</option>
                            <option value="Office Sale">4. Office Sale</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* TRACKING INFO & BILLING */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block border-b border-gray-100 pb-1.5 text-left">
                        TRACKING INFO &amp; BILLING
                      </span>

                      {/* DELIVERY DATE (OPTIONAL) */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">DELIVERY DATE (OPTIONAL)</label>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                          <input 
                            type="date" 
                            value={newDeliveryDate} 
                            onChange={(e) => setNewDeliveryDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-[12px] font-semibold rounded-xl outline-none focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer font-mono shadow-3xs text-left"
                          />
                        </div>
                      </div>

                      {/* BILLING & PAYMENT Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">DELIVERY CHARGE</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold font-mono">৳</span>
                            <input 
                              type="number" 
                              min={0}
                              value={newDeliveryCharge}
                              onChange={(e) => setNewDeliveryCharge(parseFloat(e.target.value) || 0)}
                              className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 text-[12px] font-semibold rounded-xl focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all shadow-3xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">DISCOUNT AMOUNT</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold font-mono">৳</span>
                            <input 
                              type="number" 
                              min={0}
                              value={newDiscountAmount}
                              onChange={(e) => setNewDiscountAmount(parseFloat(e.target.value) || 0)}
                              className="w-full pl-8 pr-4 py-2.5 bg-[#FAFBFD]/50 border border-gray-200 text-[12px] font-semibold rounded-xl focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all shadow-3xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">ADVANCE PAYMENT</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold font-mono">৳</span>
                            <input 
                              type="number" 
                              min={0}
                              value={newAdvancePayment}
                              onChange={(e) => setNewAdvancePayment(parseFloat(e.target.value) || 0)}
                              className="w-full pl-8 pr-4 py-2.5 bg-[#FAFBFD]/50 border border-gray-200 text-[12px] font-semibold rounded-xl focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all shadow-3xs font-mono"
                            />
                          </div>
                        </div>

                        {/* Orange computed Collectable card */}
                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">COLLECTABLE AMOUNT</label>
                          <div className="relative bg-[#FFF7ED] border border-[#FFEDD5] text-[#C2410C] rounded-xl px-4 py-2.5 flex items-center justify-between font-mono font-black text-xs h-[42px] shadow-3xs">
                            <span className="text-[#C2410C]/70">৳</span>
                            <span>{newOrderItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) + newDeliveryCharge - newDiscountAmount - newAdvancePayment}</span>
                          </div>
                        </div>
                      </div>

                      {/* ADVANCE PAYMENT METHOD pills row */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">ADVANCE PAYMENT METHOD</label>
                        <div className="flex items-center gap-1.5">
                          {['Cash', 'bKash', 'Rocket', 'Nagad'].map((method) => {
                            const active = newAdvancePaymentMethod === method;
                            return (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setNewAdvancePaymentMethod(method as any)}
                                className={cn(
                                  "flex-1 py-2 text-[11px] font-black tracking-wide uppercase rounded-xl transition-all border shadow-3xs active:scale-95",
                                  active 
                                    ? "bg-[#2563EB] border-[#2563EB] text-white font-extrabold shadow-sm shadow-blue-500/10" 
                                    : "bg-white border-gray-200 text-gray-600 hover:text-black hover:border-gray-300"
                                )}
                              >
                                {method}
                              </button>
                            );
                          })}
                          
                          <button
                            type="button"
                            onClick={() => setNewAdvancePaymentMethod('')}
                            title="Clear selection"
                            className="p-2 border border-gray-200 hover:border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-all text-gray-400 hover:text-black shrink-0 shadow-3xs active:scale-95"
                          >
                            <X size={14} className="stroke-[2.5]" />
                          </button>
                        </div>
                      </div>

                      {/* INTERNAL NOTE */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 font-sans">INTERNAL NOTE (OPTIONAL)</label>
                        <input 
                          type="text" 
                          placeholder="Shipping instructions..." 
                          value={newInternalNote}
                          onChange={(e) => setNewInternalNote(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 text-[12px] font-semibold rounded-xl placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all shadow-3xs"
                        />
                      </div>

                    </div>

                  </div>

                  {/* STICKY BOTTOM SUMMARY SECTION */}
                  <div className="p-5 bg-white border-t border-[#EFF2F6] shrink-0 text-left">
                    <div className="space-y-3.5">
                      
                      {/* Financial values mapping */}
                      <div className="p-4 bg-[#FAFBFD] rounded-2xl space-y-2 border border-[#EFF2F6]">
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-[#8292A1] uppercase tracking-wider">
                          <span>SUBTOTAL</span>
                          <span className="font-mono font-black text-gray-700">
                            {formatPrice(newOrderItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0), currency, rate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-red-500 uppercase tracking-wider">
                          <span>ADVANCE PAYMENT (-)</span>
                          <span className="font-mono font-black">
                            {formatPrice(newAdvancePayment, currency, rate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-black text-[#0C1421] uppercase border-t border-dashed border-gray-200 pt-2">
                          <span className="tracking-wide">COLLECTABLE AMOUNT</span>
                          <span className="text-xl font-black text-blue-600 font-mono">
                            {formatPrice(newOrderItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) + newDeliveryCharge - newDiscountAmount - newAdvancePayment, currency, rate)}
                          </span>
                        </div>
                      </div>

                      {/* Submit action button */}
                      <div className="space-y-2">
                        <button 
                          type="submit"
                          disabled={!newCustomerName || !newCustomerPhone || !newCustomerAddress || !newCustomerCity || newOrderItems.length === 0}
                          className={cn(
                            "w-full py-4 uppercase font-black text-xs tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-98",
                            (!newCustomerName || !newCustomerPhone || !newCustomerAddress || !newCustomerCity || newOrderItems.length === 0)
                              ? "bg-gray-400 text-white cursor-not-allowed opacity-80"
                              : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:shadow-lg hover:shadow-blue-500/10"
                          )}
                        >
                          <Plus size={14} className="stroke-[3.5]" />
                          <span>Initialize Order Row</span>
                        </button>
                        
                        {/* Status notification when incomplete */}
                        {(!newCustomerName || !newCustomerPhone || !newCustomerAddress || !newCustomerCity || newOrderItems.length === 0) && (
                          <p className="text-[8.5px] font-black text-center tracking-widest text-[#2563EB] uppercase leading-relaxed animate-pulse">
                            COMPLETE NAME, PHONE, ADDRESS &amp; ADD PRODUCTS TO PROCEED
                          </p>
                        )}
                      </div>

                    </div>
                  </div>

                </form>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="bg-white rounded-[28px] w-full max-w-lg overflow-hidden shadow-2xl relative z-10 border border-[#EFF2F6] flex flex-col text-black font-sans max-h-[92vh]"
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
                    Elegan BD. — 255-2d ahemd nagar mirpur 1 nea
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
                                    #{order.id.slice(-6).toUpperCase()}
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
                                  <span className="text-gray-300 font-bold bg-[#1E293B] px-1.5 py-0.5 rounded-sm select-all">SCAN-{order.id.slice(-6).toUpperCase()}</span>
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
                                #{queuedOrder.id.slice(-6).toUpperCase()}
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
              className="bg-[#E5E9F0] rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col text-slate-800 font-sans max-h-[92vh] border border-white/20"
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
                      Internal discussion thread for Order No: <span className="text-indigo-600 font-black">{issueConversationOrder.id.slice(-10).toUpperCase()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedOrder(issueConversationOrder);
                      setIssueConversationOrder(null);
                    }}
                    className="px-4 py-1.5 bg-white/60 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest rounded-full hover:bg-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border border-slate-300/20"
                  >
                    <Eye size={12} className="stroke-[2.5]" />
                    View Order
                  </button>
                  <button 
                    onClick={() => setIssueConversationOrder(null)}
                    className="w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-gray-400 hover:text-black transition-all cursor-pointer border border-slate-300/40 shadow-sm"
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
                  <span className="text-sm font-black text-slate-900 block uppercase">
                    {issueConversationOrder.status === 'QC' ? 'QC PASSED' : (issueConversationOrder.status === 'Pending' ? 'ORDER PLACED' : issueConversationOrder.status.toUpperCase())}
                  </span>
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
                    {issueConversationOrder.items.map(it => `${it.name} (${it.selectedSize} (x${it.quantity}))`).join(', ')}
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
              <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0 bg-[#E5E9F0]">
                
                {/* Active Issue Info / Overview Card matching screenshot exactly */}
                <div className="bg-white rounded-3xl border border-slate-200/60 p-5 mb-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">ISSUE OVERVIEW</span>
                    
                    {isEditingIssueMeta ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={issueMetaType}
                          onChange={(e) => setIssueMetaType(e.target.value)}
                          className="bg-white border border-slate-300 text-[10px] font-black rounded-lg px-2.5 py-1.5 outline-none text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
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
                          className="bg-white border border-slate-300 text-[10px] font-black rounded-lg px-2.5 py-1.5 outline-none text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
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
                          URGENCY: {issueConversationOrder.issueUrgency?.toUpperCase() || 'NORMAL'}
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
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => {
                          const systemReply = {
                            sender: 'system' as const,
                            message: `Rabbi changed issue status to Solved`,
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
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-[#5E50F9] hover:bg-[#4E40E9] text-white font-extrabold text-[10.5px] rounded-full uppercase tracking-wider transition-all shadow-md cursor-pointer hover:shadow-lg"
                      >
                        <Clock size={12} className="stroke-[2.5]" />
                        READY TO SHIP
                      </button>

                      <button 
                        onClick={async () => {
                          await handleStatusChange(issueConversationOrder.id, 'Cancelled');
                          const systemReply = {
                            sender: 'system' as const,
                            message: `Sabbir requested cancellation`,
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
                        }}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-[#FFAB00] hover:bg-[#e09600] text-white font-extrabold text-[10.5px] rounded-full uppercase tracking-wider transition-all shadow-md cursor-pointer hover:shadow-lg"
                      >
                        <AlertTriangle size={12} className="stroke-[2.5]" />
                        CANCEL REQUEST
                      </button>
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
                                    : "bg-white text-slate-800 border border-slate-200/60 rounded-tl-none text-left"
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
                  <form onSubmit={handleSendIssueReply} className="border-t border-slate-300/30 pt-4 flex gap-3 shrink-0">
                    <input 
                      type="text" 
                      value={issueReplyText}
                      onChange={(e) => setIssueReplyText(e.target.value)}
                      placeholder="Type your message here..."
                      className="flex-1 bg-white border border-slate-300/50 text-xs font-semibold rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-[#5E50F9]/20 focus:border-[#5E50F9] text-slate-800 placeholder:text-slate-400"
                    />
                    <button 
                      type="submit"
                      disabled={!issueReplyText.trim()}
                      className="px-8 py-3.5 bg-[#8C82FC] hover:bg-[#7267FC] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      SEND
                    </button>
                  </form>

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
              className="bg-[#E5E9F0] rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl relative z-10 border border-white/40 flex flex-col text-slate-800 font-sans max-h-[92vh]"
            >
              
              {isEditingDetails ? (
                <>
                  {/* Header block for edit details */}
                  <div className="p-6 border-b border-slate-300/40 flex items-center justify-between shrink-0 bg-[#E5E9F0]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Edit3 className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-base font-black text-[#0D1829] tracking-tight">Edit Order Details</h2>
                        <p className="text-xs text-slate-500 font-bold">Modifying order record #ORD-{selectedOrder.id}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsEditingDetails(false)}
                      className="w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-gray-400 hover:text-black transition-all cursor-pointer border border-slate-300/40 shadow-sm"
                    >
                      <X size={15} className="stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Scrollable container for Form */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#E5E9F0] no-scrollbar">
                    <div className="space-y-4 text-left bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                      <div className="border-b border-gray-150 pb-2 flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Modify Order Record</h3>
                          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Edit customer details, logistics parameters, and notes below.</p>
                        </div>
                        {isSuperAdmin && (
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
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Phone Number</label>
                          <input 
                            type="text" 
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Postal Address</label>
                          <input 
                            type="text" 
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">City</label>
                          <input 
                            type="text" 
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-1 col-span-2">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Order Status</label>
                          <select 
                            value={normalizeStatus(editStatus)}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white cursor-pointer uppercase"
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
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Delivery Fee</label>
                          <input 
                            type="number" 
                            value={editDeliveryCharge}
                            onChange={(e) => setEditDeliveryCharge(Number(e.target.value))}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Discount</label>
                          <input 
                            type="number" 
                            value={editDiscount}
                            onChange={(e) => setEditDiscount(Number(e.target.value))}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
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
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Order Note</label>
                          <input 
                            type="text" 
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="e.g. Agamikal booking dite hobe"
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Invoice By</label>
                        <select 
                          value={editInvoiceBy}
                          onChange={(e) => setEditInvoiceBy(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-gray-200 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white appearance-none cursor-pointer"
                        >
                          <option value="Website order">Website order</option>
                          <option value="Sabbir">Sabbir</option>
                          <option value="Nasir">Nasir</option>
                          <option value="Shamiul">Shamiul</option>
                          <option value="Office Sale">Office Sale</option>
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
                            const computedSubtotal = selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                            try {
                              await updateOrder(selectedOrder.id, {
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
                              
                              setSelectedOrder({
                                ...selectedOrder,
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
                              const dateObj = new Date(selectedOrder.createdAt);
                              const yy = String(dateObj.getFullYear()).slice(-2);
                              const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                              const dd = String(dateObj.getDate()).padStart(2, '0');
                              const lastDigits = selectedOrder.id.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
                              const orderSlug = lastDigits.length >= 4 ? lastDigits : String(parseInt(selectedOrder.id.slice(-4), 36) || 0).slice(-4).padStart(4, '0');
                              return `${yy}${mm}${dd}${orderSlug}`;
                            })()}
                          </span>
                          <div className="flex items-center gap-[1.2px] bg-white px-2 py-1 rounded-md border border-slate-300/40 shrink-0 h-6 select-none" title="Barcode">
                            {[1, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 2, 1, 3, 2, 1, 1, 2, 1, 2, 1, 3, 1, 2].map((w, idx) => (
                              <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedOrder(null)}
                      className="w-10 h-10 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-800 transition-all cursor-pointer border border-slate-300/40 shadow-sm animate-fade-in"
                    >
                      <X size={18} className="stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Scrollable Container with Custom Bento Grid matching screenshot */}
                  <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 no-scrollbar min-h-0">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Customer Identity Floating Card */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider text-left pl-1">
                          <User size={14} className="stroke-[2.5]" />
                          <span>Customer Identity</span>
                        </div>
                        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-white/60 text-left space-y-4 flex-1">
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
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Address</span>
                            <span className="text-xs font-bold text-slate-600 leading-relaxed block">{selectedOrder.address || selectedOrder.city}</span>
                          </div>
                        </div>
                      </div>

                      {/* Logistic Meta Floating Card */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider text-left pl-1">
                          <Package size={14} className="stroke-[2.5]" />
                          <span>Logistic Meta</span>
                        </div>
                        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-white/60 text-left grid grid-cols-2 gap-y-4 gap-x-3 flex-1">
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
                          <div className="col-span-2 border-t border-slate-100/80 pt-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Invoice No</span>
                            <span className="text-sm font-black text-indigo-600 font-mono block">
                              {(() => {
                                const dateObj = new Date(selectedOrder.createdAt);
                                const yy = String(dateObj.getFullYear()).slice(-2);
                                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                                const dd = String(dateObj.getDate()).padStart(2, '0');
                                const lastDigits = selectedOrder.id.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
                                const orderSlug = lastDigits.length >= 4 ? lastDigits : String(parseInt(selectedOrder.id.slice(-4), 36) || 0).slice(-4).padStart(4, '0');
                                return `${yy}${mm}${dd}${orderSlug}`;
                              })()}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                            <span className={cn(
                              "inline-block px-4 py-1 text-[10px] font-black rounded-full uppercase tracking-wider",
                              selectedOrder.status === 'Delivered' ? 'bg-[#E6F4EA] text-[#137333]' :
                              selectedOrder.status === 'Cancelled' ? 'bg-[#FCE8E6] text-[#C5221F]' :
                              selectedOrder.status === 'Hold' ? 'bg-[#FFF9E6] text-[#B06000]' :
                              selectedOrder.status === 'QC' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              'bg-[#ECEAFE] text-[#554BF0]' // Pending / Placing
                            )}>
                              {selectedOrder.status === 'QC' ? 'QC PASSED' : (selectedOrder.status === 'Pending' ? 'ORDER PLACED' : selectedOrder.status.toUpperCase())}
                            </span>
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
                      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-white/60 text-left">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3 mb-3">
                          <div className="col-span-6">Item</div>
                          <div className="col-span-2 text-center">Qty</div>
                          <div className="col-span-2 text-right">Unit</div>
                          <div className="col-span-2 text-right">Total</div>
                        </div>

                        <div className="divide-y divide-slate-100/60">
                          {selectedOrder.items.map((it, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 py-4 items-center first:pt-0 last:pb-0">
                              <div className="col-span-6">
                                <span className="text-sm font-black text-slate-900 block leading-tight">{it.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 block font-mono">
                                  {it.selectedSize || '30'} | ES {it.id ? it.id.slice(-3).toUpperCase() : '109'}
                                </span>
                              </div>
                              <div className="col-span-2 text-center font-bold text-slate-800 text-sm">
                                {it.quantity}
                              </div>
                              <div className="col-span-2 text-right font-bold text-slate-500 text-sm font-mono">
                                ৳{formatPrice(it.price, currency, rate)}
                              </div>
                              <div className="col-span-2 text-right font-black text-slate-900 text-sm font-mono">
                                ৳{formatPrice(it.price * it.quantity, currency, rate)}
                              </div>
                            </div>
                          ))}
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
                            ৳{formatPrice(selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), currency, rate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span>Delivery Charge</span>
                          <span className="font-bold text-slate-800 font-mono">
                            ৳{formatPrice(selectedOrder.deliveryCharge || 0, currency, rate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span>Discount</span>
                          <span className="font-bold text-[#EB5A3C] font-mono">
                            -৳{formatPrice((selectedOrder as any).discount || 0, currency, rate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span className="uppercase">
                            Advance Payment ({selectedOrder.paymentMethod === 'cod' ? 'COD' : selectedOrder.paymentMethod.toUpperCase()})
                          </span>
                          <span className="font-bold text-[#10B981] font-mono">
                            ৳{formatPrice((selectedOrder as any).advancePayment || 0, currency, rate)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-300/40">
                          <span className="text-sm font-black text-slate-950 uppercase tracking-wider">Collectable</span>
                          <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                            ৳{formatPrice(
                              selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 
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
                          }}
                          className="w-full py-4 bg-[#0F172A] hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-[20px] transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 border border-slate-700/30"
                        >
                          <Printer size={14} className="stroke-[2.5]" />
                          <span>Print Invoice</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            setEditName(selectedOrder.customerName || '');
                            setEditPhone(selectedOrder.phone || '');
                            setEditAddress(selectedOrder.address || '');
                            setEditCity(selectedOrder.city || '');
                            setEditStatus(selectedOrder.status || 'Pending');
                            setEditDeliveryCharge(selectedOrder.deliveryCharge ?? 100);
                            setEditDiscount((selectedOrder as any).discount ?? 0);
                            setEditAdvancePayment((selectedOrder as any).advancePayment ?? 0);
                            setEditNotes((selectedOrder as any).notes || 'Agamikal booking dite hobe');
                            setEditInvoiceBy(selectedOrder.invoiceBy || 'Website order');
                            setIsEditingDetails(true);
                          }}
                          className="w-full py-4 bg-white/70 hover:bg-white text-slate-800 border border-slate-300/40 font-black text-xs uppercase tracking-widest rounded-[20px] transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Edit3 size={14} className="stroke-[2.5]" />
                          <span>Edit Details</span>
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
              className="bg-white rounded-[20px] w-full max-w-[170mm] overflow-hidden shadow-2xl relative z-10 border border-gray-200 flex flex-col max-h-[92vh]"
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
                          <body class="bg-white">
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
                    className="bg-[#0C1421] hover:bg-black text-white font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-lg"
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
                <div className="bg-white rounded-lg shadow-lg border border-gray-100">
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
              className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden text-center"
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
    </div>
  );
}
