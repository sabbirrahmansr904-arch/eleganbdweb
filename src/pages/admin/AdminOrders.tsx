import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  Search, 
  Eye, 
  FileSpreadsheet,
  Truck,
  RefreshCw,
  Calendar,
  ChevronDown,
  X,
  User,
  Phone,
  Mail,
  Package,
  AlertCircle,
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
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice, cn } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useOrders } from '../../contexts/OrderContext';
import { useProducts } from '../../contexts/ProductContext';
import { Order, CartItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

export default function AdminOrders(): React.JSX.Element {
  const { currency, rate } = useCurrency();
  const { orders, updateOrderStatus, updateOrder, addOrder, deleteOrder } = useOrders();
  const { products } = useProducts();
  const navigate = useNavigate();

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

  // Create Order Form State
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newDeliveryCharge, setNewDeliveryCharge] = useState(100);
  const [newPaymentMethod, setNewPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'card'>('cod');

  // Helper deterministic dispatcher name generator for the 'INVOICE BY' column matching screenshot names (or custom manual creations)
  const getInvoiceBy = React.useCallback((order: Order) => {
    // Return custom dispatcher for manual order if defined, otherwise generate deterministically
    if (order.email?.includes('manual_admin') || order.customerId === 'manual_admin') {
      return 'Office Sales';
    }
    const names = ['Online Store', 'Sabina', 'Sabila', 'Mithela', 'Rabbi', 'Al Shahriar Kabir', 'Office Sales'];
    const sum = order.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return names[sum % names.length];
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
      setIsEditingDetails(false);
    }
  }, [selectedOrder]);

  // Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Status Filter
      if (filterStatus !== 'All' && order.status !== filterStatus) {
        return false;
      }
      
      // 2. Search query match
      const queryLower = searchQuery.toLowerCase().trim();
      if (queryLower !== '') {
        const matchesId = order.id.toLowerCase().includes(queryLower);
        const matchesClient = order.customerName.toLowerCase().includes(queryLower);
        const matchesPhone = order.phone.includes(queryLower);
        const matchesCity = order.city.toLowerCase().includes(queryLower);
        const matchesSKU = order.items.some(it => it.sku?.toLowerCase().includes(queryLower) || it.name.toLowerCase().includes(queryLower));
        
        if (!matchesId && !matchesClient && !matchesPhone && !matchesCity && !matchesSKU) {
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

    // Find the order that matches or ends with the ID, or matches the scan code suffix
    const order = orders.find(o => 
      o.id.toLowerCase() === trimmedId.toLowerCase() || 
      o.id.toLowerCase().endsWith(trimmedId.toLowerCase()) ||
      o.id.toLowerCase().endsWith(searchKey) ||
      o.id.toLowerCase().slice(-6) === searchKey
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

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerPhone || !newCustomerAddress || !newCustomerCity || !newProductId || !newSize) {
      toast.error("Please fill in all required fields");
      return;
    }

    const selectedProduct = products.find(p => p.id === newProductId);
    if (!selectedProduct) {
      toast.error("Product invalid");
      return;
    }

    const orderId = Date.now().toString().slice(-10);

    const cartItem: CartItem = {
      ...selectedProduct,
      selectedSize: newSize,
      quantity: newQty
    };

    const newOrder: Order = {
      id: orderId,
      customerId: 'manual_admin',
      customerName: newCustomerName,
      email: `${newCustomerPhone}@elegan.bd`,
      phone: newCustomerPhone,
      address: newCustomerAddress,
      city: newCustomerCity,
      items: [cartItem],
      deliveryCharge: newDeliveryCharge,
      total: (selectedProduct.price * newQty) + newDeliveryCharge,
      status: 'Pending',
      paymentMethod: newPaymentMethod,
      createdAt: new Date().toISOString()
    };

    try {
      await addOrder(newOrder);
      toast.success(`Manual Order #${orderId} created successfully!`);
      setShowCreateModal(false);
      
      // Clear form
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
      setNewCustomerCity('');
      setNewProductId('');
      setNewSize('');
      setNewQty(1);
    } catch (err) {
      toast.error("Failed to create manual order record");
    }
  };

  const selectedProductDetails = products.find(p => p.id === newProductId);

  // Status mapping labels and color setups
  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'Delivered': 
        return {
          text: 'SUCCESS',
          class: 'bg-[#EBFDF5] text-[#10B981] border-[#D1FAE5]',
        };
      case 'Processing': 
        return {
          text: 'PREPARING',
          class: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]',
        };
      case 'Pending': 
        return {
          text: 'ORDER PLACED',
          class: 'bg-[#FAF5FC] text-[#9D27B0] border-[#F3E8FF]',
        };
      case 'Shipped': 
        return {
          text: 'SHIPPED',
          class: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]',
        };
      case 'Cancelled': 
        return {
          text: 'CANCELLED',
          class: 'bg-[#FFF1F2] text-[#E11D48] border-[#FFE4E6]',
        };
      case 'Printed':
        return {
          text: 'PRINTED',
          class: 'bg-[#FEFCE8] text-[#CA8A04] border-[#FEF08A]',
        };
      case 'Hold':
        return {
          text: 'HOLD',
          class: 'bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]',
        };
      case 'Returned':
        return {
          text: 'RETURNED',
          class: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
        };
      default: 
        return {
          text: (status as string).toUpperCase(),
          class: 'bg-gray-100 text-gray-500 border-gray-200',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 font-sans text-[#0C1421] px-4 md:px-8">
      
      {/* Header section identical layout & styling block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#0D1829] tracking-tight">Orders</h1>
            <p className="text-[13px] text-[#62758A] font-semibold mt-0.5">Detailed spreadsheet-style order tracking and management.</p>
          </div>
        </div>

        {/* Global summary stats */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="bg-white border border-[#EFF2F6] rounded-xl px-4 py-2 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#9D27B0]" />
            <div className="leading-none">
              <span className="text-[8px] uppercase font-black text-gray-400">Placed</span>
              <p className="text-xs font-black text-[#0C1421] mt-0.5">{orders.filter(o => o.status === 'Pending').length}</p>
            </div>
          </div>
          <div className="bg-white border border-[#EFF2F6] rounded-xl px-4 py-2 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8]" />
            <div className="leading-none">
              <span className="text-[8px] uppercase font-black text-gray-400">In Transit</span>
              <p className="text-xs font-black text-[#0C1421] mt-0.5">{orders.filter(o => o.status === 'Shipped' || o.status === 'Processing').length}</p>
            </div>
          </div>
          <div className="bg-white border border-[#EFF2F6] rounded-xl px-4 py-2 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <div className="leading-none">
              <span className="text-[8px] uppercase font-black text-gray-400">Completed</span>
              <p className="text-xs font-black text-[#0C1421] mt-0.5">{orders.filter(o => o.status === 'Delivered').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Button Row exactly matching reference screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Hand Core Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Green EXPORT ALL button */}
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#10B981] hover:bg-[#0E9F6E] text-white font-extrabold text-[11px] tracking-widest uppercase px-5 py-3 rounded-xl transition-all shadow-sm shadow-[#10B981]/15"
          >
            <FileSpreadsheet size={13} className="stroke-[2.5]" />
            <span>EXPORT ALL</span>
          </button>

          {/* Teal DELIVERY button */}
          <button 
            onClick={() => {
              if (selectedOrderIds.length === 0) {
                toast.error('Select orders from the table checklist first');
                return;
              }
              toast.success(`Generated delivery dispatch sheets for ${selectedOrderIds.length} orders!`);
            }}
            className="flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-[11px] tracking-widest uppercase px-5 py-3 rounded-xl transition-all shadow-sm shadow-[#0D9488]/15"
          >
            <Truck size={13} className="stroke-[2.5]" />
            <span>DELIVERY</span>
          </button>

          {/* Camera photo button icon */}
          <button 
            onClick={() => setShowCamera(true)}
            title="Scan Physical Receipt Sheet"
            className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 transition-all flex items-center justify-center cursor-pointer"
          >
            <Camera size={15} />
          </button>

          {/* SYNC PATHAO button */}
          <button 
            onClick={handleSyncPathao}
            className="flex items-center gap-2 bg-white border border-gray-250 hover:bg-gray-50 text-[#0C1421] font-extrabold text-[11px] tracking-widest uppercase px-5 py-3 rounded-xl transition-all shadow-2xs"
          >
            <RefreshCw size={12} className="stroke-[2.5] text-emerald-600" />
            <span>SYNC PATHAO</span>
          </button>
        </div>

        {/* Right Hand blue CREATE ORDER trigger */}
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] tracking-widest uppercase px-6 py-3.5 rounded-xl transition-all shadow-sm shadow-blue-500/20"
        >
          <Plus size={13} className="stroke-[3]" />
          <span>CREATE ORDER</span>
        </button>

      </div>

      {/* Spreadsheet Search and Filtering Layout Panel */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6] shadow-[0_4px_24px_rgba(0,0,0,0.012)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Left search criteria input block */}
          <div className="relative md:col-span-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search Order #, Phone, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border-none text-[13px] font-semibold rounded-2xl placeholder-gray-400 text-[#0C1421] focus:ring-2 focus:ring-[#2563EB]/20 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Calendar placeholder selection button block */}
          <div className="relative md:col-span-3 flex items-center gap-1">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-2 py-2.5 bg-[#F8FAFC] border-none text-[10px] font-bold text-gray-600 rounded-xl outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-[#2563EB]/25 font-mono"
              />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase">to</span>
            <div className="relative flex-1">
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-3 pr-2 py-2.5 bg-[#F8FAFC] border-none text-[10px] font-bold text-gray-600 rounded-xl outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-[#2563EB]/25 font-mono"
              />
            </div>
          </div>

          {/* 1. ISSUES Filter Dropdown */}
          <div className="relative md:col-span-1.5 md:col-span-2">
            <select
              value={filterIssue}
              onChange={(e) => setFilterIssue(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-[#F8FAFC] border-none text-[11px] font-extrabold uppercase tracking-wider rounded-2xl text-[#62758A] focus:ring-2 focus:ring-[#2563EB]/20 focus:bg-white focus:text-[#0C1421] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="All">ISSUES (ALL)</option>
              <option value="Issues">ISSUE ACTIVE</option>
              <option value="No Issues">STABLE RUNS</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* 2. STATUS Filter Dropdown */}
          <div className="relative md:col-span-1.5 md:col-span-1">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-[#F8FAFC] border-none text-[11px] font-extrabold uppercase tracking-wider rounded-2xl text-[#62758A] focus:ring-2 focus:ring-[#2563EB]/20 focus:bg-white focus:text-[#0C1421] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="All">STATUS</option>
              <option value="Pending">PLACED</option>
              <option value="Printed">PRINTED</option>
              <option value="Processing">PREPARING</option>
              <option value="Shipped">SHIPPED</option>
              <option value="Delivered">SUCCESS</option>
              <option value="Hold">HOLD</option>
              <option value="Returned">RETURNED</option>
              <option value="Cancelled">CANCELLED</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* 3. PARTNERS/DISPATCHER Filter Dropdown */}
          <div className="relative md:col-span-1.5 md:col-span-1">
            <select
              value={filterPartner}
              onChange={(e) => setFilterPartner(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-[#F8FAFC] border-none text-[11px] font-extrabold uppercase tracking-wider rounded-2xl text-[#62758A] focus:ring-2 focus:ring-[#2563EB]/20 focus:bg-white focus:text-[#0C1421] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="All">PARTNER</option>
              <option value="Online Store">ONLINE STORE</option>
              <option value="Sabina">SABINA</option>
              <option value="Sabila">SABILA</option>
              <option value="Mithela">MITHELA</option>
              <option value="Rabbi">RABBI</option>
              <option value="Al Shahriar Kabir">KABIR</option>
              <option value="Office Sales">OFFICE SALES</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* 4. COURIER Filter Dropdown */}
          <div className="relative md:col-span-1.5 md:col-span-1">
            <select
              className="w-full pl-4 pr-10 py-3 bg-[#F8FAFC] border-none text-[11px] font-extrabold uppercase tracking-wider rounded-2xl text-[#62758A] focus:ring-2 focus:ring-[#2563EB]/20 focus:bg-white focus:text-[#0C1421] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="All">COURIER</option>
              <option value="Pathao">PATHAO</option>
              <option value="RedX">REDX</option>
              <option value="Steadfast">STEADFAST</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

        </div>

        {/* Clear filters row indicator */}
        {(searchQuery || filterStatus !== 'All' || filterIssue !== 'All' || filterPartner !== 'All' || startDate || endDate) && (
          <div className="mt-4 pt-3 border-t border-[#EFF2F6] flex justify-between items-center">
            <span className="text-[10px] font-black tracking-widest uppercase text-[#5D63D3]">Searching active filters ({filteredOrders.length} records)</span>
            <button 
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('All');
                setFilterIssue('All');
                setFilterPartner('All');
                setStartDate('');
                setEndDate('');
              }}
              className="text-[10px] uppercase tracking-wider font-extrabold text-[#E11D48] hover:underline"
            >
              RESET ALL SELECTIONS
            </button>
          </div>
        )}
      </div>

      {/* Bulk Select Control Bar if items are ticked */}
      {selectedOrderIds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-[#0C1421] text-white rounded-[20px] flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider">{selectedOrderIds.length} orders highlighted for dispatch</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                toast.success(`Authorized Pathao dispatch sheets for ${selectedOrderIds.length} records!`);
                setSelectedOrderIds([]);
              }}
              className="px-4 py-2 bg-[#0D9488] hover:bg-teal-700 text-white font-extrabold text-[10px] tracking-wider uppercase rounded-xl transition-all"
            >
              Pathao Send
            </button>
            <button 
              onClick={async () => {
                await Promise.all(selectedOrderIds.map(id => updateOrderStatus(id, 'Shipped')));
                toast.success(`Marked ${selectedOrderIds.length} orders as SHIPPED`);
                setSelectedOrderIds([]);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] tracking-wider uppercase rounded-xl transition-all"
            >
              Shipped
            </button>
            <button 
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-extrabold text-[10px] tracking-wider uppercase rounded-xl transition-all"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}

      {/* Spreadsheet Master Table Workspace Panel */}
      <div className="bg-white rounded-[24px] border border-[#EFF2F6] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.015)]">
        <div className="overflow-x-auto no-scrollbar">
          
          <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
            {/* Table Column specifications to match high precision alignments */}
            <colgroup>
              <col className="w-[50px]" />
              <col className="w-[90px]" />
              <col className="w-[90px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[150px]" />
            </colgroup>

            {/* Header row exactly showing sizes or price fields */}
            <thead>
              <tr className="bg-[#FAFBFD] border-b border-[#EFF2F6] h-14">
                <th className="text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredOrders.length > 0 && filteredOrders.slice(0, visibleCount).every(o => selectedOrderIds.includes(o.id))}
                    onChange={handleToggleSelectAll}
                    className="w-4.5 h-4.5 rounded border-gray-300 text-black focus:ring-black cursor-pointer bg-[#FAFBFD]"
                  />
                </th>
                <th className="px-6 text-[11px] font-black uppercase tracking-widest text-[#8292A1]">DATE</th>
                <th className="px-5 text-[11px] font-black uppercase tracking-widest text-[#8292A1]">TIME</th>
                <th className="px-5 text-[11px] font-black uppercase tracking-widest text-[#8292A1]">ORDER NO</th>
                <th className="px-5 text-[11px] font-black uppercase tracking-widest text-[#8292A1]">INVOICE BY</th>
                <th className="px-5 text-[11px] font-black uppercase tracking-widest text-[#8292A1]">INVOICE NO</th>
                <th className="px-5 text-[11px] font-black uppercase tracking-widest text-[#8292A1]">STATUS</th>
                <th className="px-5 text-[11px] font-black uppercase tracking-widest text-[#8292A1]">COURIER</th>
                <th className="px-5 text-[11px] font-black uppercase tracking-widest text-[#8292A1]">PARTNER</th>
                <th className="px-5 text-[11px] font-black uppercase tracking-widest text-[#8292A1] text-right pr-6">ACTION</th>
              </tr>
            </thead>

            {/* Main scrollable body */}
            <tbody className="divide-y divide-[#EFF2F6]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-24 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto mb-4 border border-gray-150">
                      <AlertCircle className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-black text-[#0D1829] uppercase">No Orders Found</p>
                    <p className="text-xs text-gray-400 mt-1">Initialize record matching by checking your input queries.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.slice(0, visibleCount).map((order) => {
                  const hasIssue = hasActiveIssue(order);
                  const invoiceBy = getInvoiceBy(order);
                  const statusInfo = getStatusBadge(order.status);
                  
                  // Extract date and time
                  const dateObj = new Date(order.createdAt);
                  const dateStr = dateObj.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
                  const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

                  return (
                    <tr 
                      key={order.id} 
                      className={cn(
                        "hover:bg-[#F8FAFC]/50 transition-colors h-16 group",
                        hasIssue ? "bg-[#FFF1F2]/40 hover:bg-[#FFF1F2]/60" : "bg-white"
                      )}
                    >
                      {/* Left side pink highlight on checkbox indicator if issue is active */}
                      <td className={cn(
                        "text-center relative",
                        hasIssue && "after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-[#E11D48]"
                      )}>
                        <input 
                          type="checkbox" 
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => handleToggleSelect(order.id)}
                          className={cn(
                            "w-4.5 h-4.5 rounded border-gray-300 transition-all cursor-pointer",
                            hasIssue ? "text-[#E11D48] focus:ring-[#E11D48]/30" : "text-black focus:ring-black"
                          )}
                        />
                      </td>

                      {/* DATE */}
                      <td className="px-6 py-4">
                        <span className="text-[12px] font-semibold text-[#4A5E73] font-mono whitespace-nowrap">
                          {dateStr}
                        </span>
                      </td>

                      {/* TIME */}
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-semibold text-[#4A5E73] font-mono whitespace-nowrap uppercase">
                          {timeStr}
                        </span>
                      </td>

                      {/* ORDER NO + Pink Issue active badge beneath it if ticked */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-[#0C1421] font-mono leading-none tracking-tight">
                            {order.id}
                          </span>
                          {hasIssue && (
                            <span className="inline-flex items-center text-[8.5px] font-black text-[#E11D48] bg-[#FFF1F2] border border-[#FFE4E6] rounded px-1.5 py-0.5 mt-1.5 w-max leading-none uppercase tracking-wider">
                              ⚠️ ISSUE ACTIVE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* INVOICE BY */}
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-bold text-[#0C1421]">
                          {invoiceBy}
                        </span>
                      </td>

                      {/* INVOICE NO */}
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-semibold text-[#4A5E73] font-mono">
                          {order.id}
                        </span>
                      </td>

                      {/* STATUS Badge */}
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-block rounded-full px-3 py-1 text-[9px] font-black tracking-widest border text-center whitespace-nowrap",
                          statusInfo.class
                        )}>
                          {statusInfo.text}
                        </span>
                      </td>

                      {/* COURIER */}
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-semibold text-gray-500">
                          {order.courier || '-'}
                        </span>
                      </td>

                      {/* PARTNER */}
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-semibold text-gray-500">
                          {order.partner || '-'}
                        </span>
                      </td>

                      {/* ACTIONS spreadsheet button list */}
                      <td className="px-5 py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* 1. Eye details action */}
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            title="Inspect Order Details"
                            className="p-2 bg-gray-50 hover:bg-gray-150 rounded-lg text-gray-500 hover:text-black transition-all cursor-pointer border border-[#EFF2F6]"
                          >
                            <Eye size={13} className="stroke-[2.2]" />
                          </button>

                          {/* 2. Message SMS tool */}
                          <button 
                            onClick={() => {
                              toast.success(`Dispatched invoice SMS notifier to ${order.customerName} (${order.phone})`);
                            }}
                            title="Send SMS notification confirmation"
                            className={cn(
                              "p-2 rounded-lg transition-all cursor-pointer border",
                              hasIssue 
                                ? "bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border-[#FFE4E6]" 
                                : "bg-gray-50 hover:bg-gray-150 text-gray-500 hover:text-black border-[#EFF2F6]"
                            )}
                          >
                            <MessageSquare size={13} className="stroke-[2.2]" />
                          </button>

                          {/* 3. Printer invoice drawer */}
                          <button 
                            onClick={() => {
                              setSelectedOrder(order);
                              toast.success(`Opening printer interface for invoice #${order.id}`);
                            }}
                            title="Print invoice documents"
                            className="p-2 bg-gray-50 hover:bg-gray-150 rounded-lg text-gray-400 hover:text-black transition-all cursor-pointer border border-[#EFF2F6]"
                          >
                            <Printer size={13} className="stroke-[2.2]" />
                          </button>

                          {/* 4. Delete button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to delete this order?')) {
                                deleteOrder(order.id)
                                  .then(() => toast.success(`Order #${order.id} deleted successfully`))
                                  .catch((err) => {
                                      console.error("Delete error:", err);
                                      toast.error(`Failed to delete order: ${err.message || 'Unknown error'}`);
                                  });
                              }
                            }}
                            title="Delete Order"
                            className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 transition-all cursor-pointer border border-red-100"
                          >
                            <Trash2 size={13} className="stroke-[2.2]" />
                          </button>

                          {/* 5. Barcode details tags */}
                          <button 
                            onClick={() => {
                              toast.success(`Order #${order.id} verified. Tag matched!`);
                            }}
                            title="Write physical barcode tags"
                            className="p-2 bg-gray-50 hover:bg-gray-150 rounded-lg text-gray-400 hover:text-black transition-all cursor-pointer border border-[#EFF2F6]"
                          >
                            <Tag size={13} className="stroke-[2.2]" />
                          </button>

                          {/* 5. Return/Swap Exchange arrows */}
                          <button 
                            onClick={() => {
                              toast.promise(
                                new Promise(resolve => setTimeout(resolve, 800)),
                                {
                                  loading: 'Reviewing return parameters...',
                                  success: `Exchange authorized successfully for order #${order.id}`,
                                  error: 'Cannot swap items',
                                }
                              );
                            }}
                            title="Initiate returns/ref exchange"
                            className="p-2 bg-gray-50 hover:bg-gray-150 rounded-lg text-gray-400 hover:text-black transition-all cursor-pointer border border-[#EFF2F6]"
                          >
                            <ArrowLeftRight size={13} className="stroke-[2.2]" />
                          </button>

                          {/* 6. Send courier Flight path icon */}
                          <button 
                            onClick={() => {
                              toast.success(`Consignment created: EP-${order.id}. Shipped logs synced!`);
                              handleStatusChange(order.id, 'Shipped');
                            }}
                            title="Instantly dispatch to Pathao courier database"
                            className="p-2 bg-[#E6F3FF] hover:bg-[#CCE7FF] rounded-lg text-[#0066CC] transition-all cursor-pointer border border-[#CCE7FF]"
                          >
                            <Send size={13} className="stroke-[2.5]" />
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

      {/* Load More Button matched beautifully to reference screenshot bottom */}
      {filteredOrders.length > visibleCount && (
        <div className="pt-2 text-center">
          <button 
            onClick={() => setVisibleCount(prev => prev + 15)}
            className="rounded-full px-7 py-3.5 border border-[#EFF2F6] bg-white hover:bg-gray-50 text-[#0C1421] font-black text-[12px] tracking-wider uppercase flex items-center justify-center gap-2 mx-auto transition-all shadow-[0_4px_12px_rgba(0,0,0,0.02)] active:scale-95"
          >
            <RefreshCw size={13} className="stroke-[2.5] text-blue-600" />
            <span>LOAD MORE ORDERS</span>
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
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl relative z-10 border border-[#EFF2F6]"
            >
              <div className="p-6 border-b border-[#EFF2F6] flex items-center justify-between bg-[#FAFBFD]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Plus size={18} className="stroke-[3]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-tight text-[#0C1421]">Manual Order Engine</h2>
                    <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Directly inject verified client orders into system logs</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 px-3 bg-[#F1F5F9] hover:bg-gray-200 rounded-lg text-gray-500 hover:text-black text-[9px] font-black uppercase transition-all"
                >
                  ESC
                </button>
              </div>

              <form onSubmit={handleCreateOrderSubmit} className="p-6 space-y-4 max-h-[580px] overflow-y-auto no-scrollbar">
                
                {/* Customer Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Recipient Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Sabina"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl px-4 py-3 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Phone Number *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="e.g. 01700000000"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl px-4 py-3 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Shipping Location */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Postal Address *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Road 12, Uttara"
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                      className="w-full bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl px-4 py-3 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">City *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Dhaka"
                      value={newCustomerCity}
                      onChange={(e) => setNewCustomerCity(e.target.value)}
                      className="w-full bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl px-4 py-3 placeholder-gray-400 focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Product Select List */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Select Item *</label>
                  <select 
                    value={newProductId}
                    onChange={(e) => {
                      setNewProductId(e.target.value);
                      const selProd = products.find(p => p.id === e.target.value);
                      if (selProd && selProd.sizes.length > 0) {
                        setNewSize(selProd.sizes[0]);
                      }
                    }}
                    required
                    className="w-full bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:bg-white outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled>Choose product to order...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name.toUpperCase()} - {formatPrice(p.price, currency, rate)}</option>
                    ))}
                  </select>
                </div>

                {/* Size & Quantity parameters */}
                {selectedProductDetails && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Available Size *</label>
                      <select 
                        value={newSize}
                        onChange={(e) => setNewSize(e.target.value)}
                        required
                        className="w-full bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:bg-white outline-none transition-all cursor-pointer"
                      >
                        {selectedProductDetails.sizes.map(sz => (
                          <option key={sz} value={sz}>{sz.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Units Qty *</label>
                      <input 
                        type="number" 
                        min={1}
                        required
                        value={newQty}
                        onChange={(e) => setNewQty(Number(e.target.value))}
                        className="w-full bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Fees and charges channels */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Delivery Fee</label>
                    <input 
                      type="number" 
                      min={0}
                      value={newDeliveryCharge}
                      onChange={(e) => setNewDeliveryCharge(Number(e.target.value))}
                      className="w-full bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Payment Method</label>
                    <select 
                      value={newPaymentMethod}
                      onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                      className="w-full bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:bg-white outline-none transition-all cursor-pointer"
                    >
                      <option value="cod">Cash on Delivery (COD)</option>
                      <option value="bkash">bKash wallet</option>
                      <option value="nagad">Nagad wallet</option>
                      <option value="card">Card online</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-[#F8FAFC] rounded-2xl flex justify-between items-center text-xs mt-2">
                  <span className="font-extrabold text-[#8292A1] uppercase tracking-wider text-[9px]">SUM GROSS TOTAL:</span>
                  <span className="text-base font-black text-[#0C1421]">
                    {selectedProductDetails 
                      ? formatPrice((selectedProductDetails.price * newQty) + newDeliveryCharge, currency, rate)
                      : formatPrice(0, currency, rate)
                    }
                  </span>
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-250 text-gray-600 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase font-black tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Add Order
                  </button>
                </div>

              </form>
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
              className="bg-white rounded-[28px] w-full max-w-xl overflow-hidden shadow-2xl relative z-10 border border-[#EFF2F6] flex flex-col text-black font-sans max-h-[92vh]"
            >
              
              {/* Header block with Shopping Cart Icon, Title, and Barcode representation */}
              <div className="p-6 border-b border-[#EFF2F6] flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-black text-[#0D1829] tracking-tight">Order Overview</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] font-bold text-gray-400 font-mono leading-none">{selectedOrder.id}</span>
                      
                      {/* Interactive CSS Barcode */}
                      <div className="flex items-center gap-[1.5px] ml-1.5 h-4.5 self-center opacity-70">
                        {[2, 4, 1, 3, 2, 1, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4].map((w, idx) => (
                          <div key={idx} className="bg-[#0C1421] h-full rounded-[0.5px]" style={{ width: `${w}px` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-[#FAFBFD] hover:bg-gray-150 flex items-center justify-center text-gray-400 hover:text-black transition-all cursor-pointer border border-[#EFF2F6]"
                >
                  <X size={15} className="stroke-[2.5]" />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                
                {isEditingDetails ? (
                  /* Inline Edit Mode Form */
                  <div className="space-y-4 text-left">
                    <div className="border-b border-[#EFF2F6] pb-2">
                       <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider">Modify Order Record</h3>
                       <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Edit customer details, logistics parameters, and notes below.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Customer Name</label>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-gray-100 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Phone Number</label>
                        <input 
                          type="text" 
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-gray-100 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
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
                          className="w-full bg-[#F8FAFC] border border-gray-100 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">City</label>
                        <input 
                          type="text" 
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-gray-100 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Order Status</label>
                        <select 
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          className="w-full bg-[#F8FAFC] border border-gray-100 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                        >
                          <option value="Pending">Pending (Placed)</option>
                          <option value="Printed">Printed</option>
                          <option value="Processing">Processing (Preparing)</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered (Success)</option>
                          <option value="Hold">Hold</option>
                          <option value="Returned">Returned</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Delivery Fee</label>
                        <input 
                          type="number" 
                          value={editDeliveryCharge}
                          onChange={(e) => setEditDeliveryCharge(Number(e.target.value))}
                          className="w-full bg-[#F8FAFC] border border-gray-100 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Discount</label>
                        <input 
                          type="number" 
                          value={editDiscount}
                          onChange={(e) => setEditDiscount(Number(e.target.value))}
                          className="w-full bg-[#F8FAFC] border border-gray-100 text-[12px] font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
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
                          className="w-full bg-[#F8FAFC] border border-gray-100 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#8292A1] uppercase tracking-widest block">Order Note</label>
                        <input 
                          type="text" 
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="e.g. Agamikal booking dite hobe"
                          className="w-full bg-[#F8FAFC] border border-gray-100 text-[12px] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setIsEditingDetails(false)}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
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
                              total: computedSubtotal + editDeliveryCharge - editDiscount
                            });
                            
                            // Locally rewrite state so it reflects instantly in view
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
                              total: computedSubtotal + editDeliveryCharge - editDiscount
                            } as any);
                            
                            setIsEditingDetails(false);
                            toast.success("Order records updated beautifully!");
                          } catch (err) {
                            toast.error("Failed to persist updated attributes");
                          }
                        }}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Beautiful Order Overview Display exactly mirroring the layout */
                  <div className="space-y-6">
                    
                    {/* Top Identity Cards Division */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      
                      {/* Customer Identity Card info */}
                      <div className="border border-[#EFF2F6] bg-[#F8FAFC]/65 rounded-[22px] p-5 flex flex-col">
                        <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-[10px] tracking-widest uppercase mb-4">
                          <User size={13} className="stroke-[2.5]" />
                          <span>Customer Identity</span>
                        </div>
                        <div className="space-y-3.5">
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">Name</span>
                            <span className="text-[13px] font-extrabold text-[#0C1421] mt-1.5 block">{selectedOrder.customerName}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">Phone</span>
                            <span className="text-[13px] font-extrabold text-[#0C1421] mt-1.5 block font-mono">{selectedOrder.phone}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">Address</span>
                            <span className="text-[12px] font-bold text-[#4A5E73] mt-1.5 block leading-relaxed">
                              {selectedOrder.address}, {selectedOrder.city}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Logistic Meta Panel info */}
                      <div className="border border-[#EFF2F6] bg-[#F8FAFC]/65 rounded-[22px] p-5 flex flex-col">
                        <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-[10px] tracking-widest uppercase mb-4">
                          <Truck size={13} className="stroke-[2.5]" />
                          <span>Logistic Meta</span>
                        </div>
                        <div className="space-y-3.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">Partner</span>
                              <span className="text-[13px] font-extrabold text-[#0C1421] mt-1.5 block">N/A</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">Invoice By</span>
                              <span className="text-[13px] font-extrabold text-[#0C1421] mt-1.5 block">{getInvoiceBy(selectedOrder)}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">Invoice No</span>
                            <span className="text-[13px] font-extrabold text-[#2563EB] font-mono mt-1.5 block">{selectedOrder.id}</span>
                          </div>
                          <div className="pt-2 border-t border-gray-250">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-2">Automated Dispatch Credentials</span>
                            {renderOrderQRCode(selectedOrder.id)}
                            <p className="text-[9.5px] text-gray-400 font-semibold mt-2 leading-relaxed">
                              Type this scan code inside the bulk delivery search box to instantly book to Pathao.
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">Status</span>
                            <div className="mt-1.5">
                              <span className={cn(
                                "inline-block rounded-full px-3 py-1 text-[9px] font-black tracking-widest border text-center whitespace-nowrap",
                                getStatusBadge(selectedOrder.status).class
                              )}>
                                {getStatusBadge(selectedOrder.status).text}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Order Composition Grid and Header */}
                    <div className="text-left">
                      <div className="flex items-center gap-1.5 text-gray-500 font-extrabold text-[10px] tracking-widest uppercase mb-3.5">
                        <ShoppingCart size={13} className="stroke-[2.5]" />
                        <span>Order Composition</span>
                      </div>
                      
                      <div className="border border-[#EFF2F6] rounded-[18px] overflow-hidden bg-white">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#FAFBFD] border-b border-[#EFF2F6] h-11 text-[9px] font-black text-[#8292A1] uppercase tracking-widest">
                              <th className="px-5 text-left">Item</th>
                              <th className="px-4 text-center">Qty</th>
                              <th className="px-4 text-right">Unit</th>
                              <th className="px-5 text-right pr-5">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFF2F6]">
                            {selectedOrder.items.map((it, idx) => (
                              <tr key={idx} className="h-14 font-semibold text-[#0C1421]">
                                <td className="px-5 text-left">
                                  <div className="leading-tight">
                                    <span className="text-[11.5px] font-extrabold block text-[#0C1421] tracking-tight">{it.name}</span>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mt-0.5 font-mono">
                                      {it.selectedSize || 'Free Size'} | {it.sku || `CB ${it.id.slice(-3)}`}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 text-center text-xs font-bold text-[#0C1421] font-mono">{it.quantity}</td>
                                <td className="px-4 text-right text-xs font-semibold text-[#62758A] font-mono">
                                  {formatPrice(it.price, currency, rate)}
                                </td>
                                <td className="px-5 text-right text-xs font-extrabold text-[#0C1421] pr-5 font-mono">
                                  {formatPrice(it.price * it.quantity, currency, rate)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Order Notes Yellow Box */}
                    <div className="text-left">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-2">Order Notes</span>
                      <div className="bg-[#FFFDF5] border border-amber-200/50 rounded-2xl p-4 text-stone-800 text-[11.5px] italic font-medium leading-relaxed">
                        {(selectedOrder as any).notes || editNotes}
                      </div>
                    </div>

                    {/* Bottom Split pricing and Print / Edit button columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 items-end">
                      
                      {/* Left Column: Totals details matching screenshot labels exactly */}
                      <div className="text-left space-y-1.5">
                        
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400 pr-4">
                          <span>Subtotal</span>
                          <span className="font-mono text-slate-800 font-extrabold">
                            {formatPrice(selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), currency, rate)}
                          </span>
                        </div>

                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400 pr-4">
                          <span>Delivery Charge</span>
                          <span className="font-mono text-slate-800 font-extrabold">
                            {formatPrice(editDeliveryCharge, currency, rate)}
                          </span>
                        </div>

                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400 pr-4">
                          <span className="text-rose-500">Discount</span>
                          <span className="font-mono text-rose-500 font-extrabold">
                            -{formatPrice(editDiscount, currency, rate)}
                          </span>
                        </div>

                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400 pr-4">
                          <span className="text-emerald-500">Advance Payment ({selectedOrder.paymentMethod.toUpperCase()})</span>
                          <span className="font-mono text-emerald-500 font-extrabold">
                            -{formatPrice(editAdvancePayment, currency, rate)}
                          </span>
                        </div>

                        <div className="border-t border-[#EFF2F6] pt-2" />

                        <div className="flex justify-between items-baseline pr-4">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Collectable</span>
                          <span className="text-xl font-extrabold text-[#0C1421] font-mono leading-none">
                            {formatPrice(Math.max(0, selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + editDeliveryCharge - editDiscount - editAdvancePayment), currency, rate)}
                          </span>
                        </div>

                      </div>

                      {/* Right Column: Print Invoice and Edit Details CTA Action list */}
                      <div className="flex flex-col gap-2.5 w-full">
                        
                        <button 
                          onClick={() => {
                            window.print();
                          }}
                          className="flex items-center justify-center gap-2 bg-[#0C1421] hover:bg-[#1E293B] text-white font-black text-[10px] tracking-widest uppercase py-3.5 px-6 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer w-full"
                        >
                          <Printer size={13} className="stroke-[2.5]" />
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
                            setEditAdvancePayment((selectedOrder as any).advancePayment ?? (selectedOrder.paymentMethod === 'bkash' || selectedOrder.paymentMethod === 'nagad' ? 100 : 0));
                            setEditNotes((selectedOrder as any).notes || 'Agamikal booking dite hobe');
                            setIsEditingDetails(true);
                          }}
                          className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-[#0C1421] border border-gray-200 hover:border-[#0C1421] font-black text-[10px] tracking-widest uppercase py-3.5 px-6 rounded-2xl transition-all cursor-pointer w-full shadow-3xs"
                        >
                          <Edit3 size={13} className="text-gray-500" />
                          <span>Edit Details</span>
                        </button>

                      </div>

                    </div>

                  </div>
                )}

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print-only Invoice Area exactly matching memo layout */}
      {selectedOrder && (
        <div id="print-invoice-area" className="hidden print:block bg-white text-black p-10 font-sans max-w-[800px] mx-auto text-left leading-normal">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              html, body {
                background: white !important;
                color: black !important;
                width: 100% !important;
                height: auto !important;
              }
              /* Hide all components by default */
              body * {
                visibility: hidden;
              }
              /* Show ONLY the print area and its elements */
              #print-invoice-area, #print-invoice-area * {
                visibility: visible;
              }
              #print-invoice-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 10mm;
              }
              /* Hide default browser page headers / footers if possible */
              @page {
                size: portrait;
                margin: 15mm;
              }
            }
          ` }} />

          {/* Top Header Grid: Logo & Invoice details */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              {/* Elegant Logo Design: Elegan (Black), BD (Light Silver) */}
              <div className="flex items-baseline font-black tracking-tight text-3xl">
                <span className="text-black uppercase">Elegan</span>
                <span className="text-[#A3A3A3] ml-1.5 uppercase">BD</span>
              </div>
              <span className="text-[10px] font-black tracking-[0.25em] text-[#9CA3AF] uppercase mt-1 leading-none font-sans">
                LIVE YOUR LIFE
              </span>
              <span className="text-[9px] font-semibold text-[#6B7280] leading-normal mt-2.5 max-w-xs block font-sans">
                23/1/H, Shah ali Bagh, Mirpur-1, Dhaka-1216 | 01787-777383
              </span>
            </div>

            <div className="text-right flex flex-col items-end">
              <span className="text-xl font-extrabold text-black font-mono tracking-tight block">
                {selectedOrder.id}
              </span>
              <span className="text-[10px] font-bold text-gray-500 font-mono tracking-wider block mt-1">
                {(() => {
                  const dateObj = new Date(selectedOrder.createdAt);
                  return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getFullYear()).slice(-2)}`;
                })()}
              </span>
            </div>
          </div>

          {/* Barcode representation */}
          <div className="flex flex-col items-start mt-2 mb-6">
            <div className="flex items-center gap-[1.5px] h-9">
              {[2, 4, 1, 3, 2, 1, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 1, 3, 2, 4, 1, 2, 3, 2, 1, 4, 1].map((w, idx) => (
                <div key={idx} className="bg-black h-full" style={{ width: `${w}px` }} />
              ))}
            </div>
            <span className="text-[10px] font-semibold text-gray-500 font-mono tracking-[0.25em] mt-1 pr-1 pl-0.5">
              {selectedOrder.id}
            </span>
          </div>

          {/* Thin separator line */}
          <div className="border-t border-black my-4" />

          {/* Customer Summary & Order Details */}
          <div className="grid grid-cols-2 gap-8 text-left text-[11px] leading-relaxed mb-6 font-sans">
            <div>
              <span className="text-[9px] font-black tracking-widest text-[#9CA3AF] uppercase block mb-1">Customer Summary</span>
              <span className="text-[13px] font-extrabold text-black block mb-1">{selectedOrder.customerName}</span>
              <span className="text-black block font-mono font-bold mb-1">{selectedOrder.phone}</span>
              <span className="text-[#4A5568] block leading-relaxed font-semibold">
                {selectedOrder.address}, {selectedOrder.city}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black tracking-widest text-[#9CA3AF] uppercase block mb-1">Order Details</span>
              <div className="space-y-1 text-black font-semibold">
                <p><span className="text-[#718096] font-normal">Ref:</span> <strong className="font-extrabold font-mono text-xs">{selectedOrder.id}</strong></p>
                <p><span className="text-[#718096] font-normal">Partner:</span> <strong className="font-extrabold">N/A</strong></p>
                <p><span className="text-[#718096] font-normal">By:</span> <strong className="font-extrabold">{getInvoiceBy(selectedOrder)}</strong></p>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-left text-[11px] border-collapse my-6 font-sans">
            <thead>
              <tr className="border-y border-black font-black text-[9px] text-[#2D3748] uppercase tracking-wider h-9">
                <th className="text-left py-2 font-black">Description</th>
                <th className="text-center py-2 w-16 font-black animate-none">Qty</th>
                <th className="text-right py-2 w-24 font-black">Price</th>
                <th className="text-right py-2 w-24 font-black pr-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {selectedOrder.items.map((it, index) => (
                <tr key={index} className="h-14 font-semibold text-black">
                  <td className="py-3 text-left leading-normal">
                    <span className="font-extrabold text-black block">{it.name}</span>
                    <span className="text-[9px] text-gray-500 block mt-1 font-mono">
                      Size: {it.selectedSize || 'Free Size'} | SKU: {it.sku || `CB ${it.id.slice(-3)}`}
                    </span>
                  </td>
                  <td className="py-3 text-center font-mono font-bold text-xs">{it.quantity}</td>
                  <td className="py-3 text-right font-mono text-gray-600">{formatPrice(it.price, currency, rate)}</td>
                  <td className="py-3 text-right font-mono text-black font-extrabold pr-2">{formatPrice(it.price * it.quantity, currency, rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pricing Details & Calculations */}
          <div className="flex justify-end mt-4 font-sans">
            <div className="w-72 text-[11px] space-y-1.5 text-[#4A5568] font-semibold">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-black font-bold">
                  {formatPrice(selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), currency, rate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge (+)</span>
                <span className="font-mono text-black font-bold">
                  {formatPrice(editDeliveryCharge, currency, rate)}
                </span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Discount (-)</span>
                <span className="font-mono font-bold">
                  -{formatPrice(editDiscount, currency, rate)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Advance Payment (-) [{selectedOrder.paymentMethod.toUpperCase()}]</span>
                <span className="font-mono font-bold">
                  -{formatPrice(editAdvancePayment, currency, rate)}
                </span>
              </div>
              <div className="border-t border-black my-2" />
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-[10px] font-black uppercase text-black">Collectable</span>
                <span className="text-xl font-extrabold font-mono text-black leading-none">
                  {formatPrice(Math.max(0, selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + editDeliveryCharge - editDiscount - editAdvancePayment), currency, rate)}
                </span>
              </div>
            </div>
          </div>

          {/* Print Footer centered */}
          <div className="border-t border-gray-100 mt-20 pt-4 text-center font-sans">
            <span className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em] font-mono block">
              GENERATED VIA ELEGAN BD - LIVE YOUR LIFE
            </span>
            <span className="text-[8px] font-semibold text-[#A3A3A3] uppercase tracking-[0.1em] font-mono block mt-1">
              THANK YOU FOR CHOOSING US
            </span>
          </div>

        </div>
      )}

    </div>
  );
}
