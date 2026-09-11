import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Scan, 
  Search, 
  AlertCircle, 
  XCircle, 
  X, 
  Plus, 
  Phone, 
  User, 
  MapPin, 
  Mail, 
  Calendar, 
  Clock,
  Truck, 
  Tag, 
  FileText, 
  CheckCircle2, 
  ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice, cn } from '../../lib/utils';
import { Order, CartItem, Product } from '../../types';
import { useInvoiceByOptions } from '../../hooks/useInvoiceByOptions';
import toast from 'react-hot-toast';

interface OrderItemEntry {
  id: string;
  product: Product;
  selectedSize: string;
  quantity: number;
  price: number;
}

const getDhakaNow = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const timeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: false });
  return { dateStr, timeStr };
};

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingOrder: Order | null;
  orders: Order[];
  products: Product[];
  currency: string;
  rate: number;
  paymentsConfig: {
    codLogo?: string;
    bkashLogo?: string;
    nagadLogo?: string;
  };
  onSaveOrder: (orderData: Partial<Order>, isEdit: boolean, orderId?: string) => Promise<void>;
  getNextOrderId: () => string;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  editingOrder,
  orders,
  products,
  currency,
  rate,
  paymentsConfig,
  onSaveOrder,
  getNextOrderId
}) => {
  // Local state for fast isolated updates
  const [leftSearchVal, setLeftSearchVal] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerThana, setCustomerThana] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderDate, setOrderDate] = useState(() => getDhakaNow().dateStr);
  const [orderTime, setOrderTime] = useState(() => getDhakaNow().timeStr);
  const [deliveryPartner, setDeliveryPartner] = useState('');
  const [invoiceBy, setInvoiceBy] = useState('Sabbir');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<'Cash' | 'bKash' | 'Nagad' | ''>('');
  const [internalNote, setInternalNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice By Options
  const { options: invoiceByOptions, addOption: addInvoiceByOption } = useInvoiceByOptions();
  const [showAddInvoiceByModal, setShowAddInvoiceByModal] = useState(false);
  const [customInvoiceByName, setCustomInvoiceByName] = useState('');

  // Pre-indexed phone customer map for O(1) instant lookup
  const customerPhoneMap = useMemo(() => {
    const map = new Map<string, { name: string; address: string; city: string; thana: string; email: string }>();
    for (const ord of orders) {
      if (!ord.phone) continue;
      const clean = ord.phone.replace(/[^0-9]/g, '');
      if (clean.length >= 11 && !map.has(clean)) {
        map.set(clean, {
          name: ord.customerName || '',
          address: ord.address || '',
          city: ord.city || '',
          thana: (ord as any).thana || '',
          email: ord.email && !ord.email.includes('@elegan.bd') ? ord.email : ''
        });
      }
    }
    return map;
  }, [orders]);

  // Check matched customer from phone
  const matchedCustomer = useMemo(() => {
    const clean = customerPhone.replace(/[^0-9]/g, '');
    if (clean.length < 11) return null;
    return customerPhoneMap.get(clean) || null;
  }, [customerPhone, customerPhoneMap]);

  const prevIsOpenRef = useRef(false);
  const prevEditingOrderIdRef = useRef<string | null>(null);

  // Synchronize state on modal open / order change
  useEffect(() => {
    const isJustOpened = isOpen && !prevIsOpenRef.current;
    const currentEditingId = editingOrder?.id || null;
    const isEditingOrderChanged = currentEditingId !== prevEditingOrderIdRef.current;

    prevIsOpenRef.current = isOpen;
    prevEditingOrderIdRef.current = currentEditingId;

    if (!isOpen) return;

    // If modal was already open and editing order hasn't changed, preserve user typed input
    if (!isJustOpened && !isEditingOrderChanged) {
      return;
    }

    if (editingOrder) {
      setCustomerName(editingOrder.customerName || '');
      setCustomerPhone(editingOrder.phone || '');
      setCustomerAddress(editingOrder.address || '');
      setCustomerCity(editingOrder.city || '');
      setCustomerThana((editingOrder as any).thana || '');
      setCustomerEmail(editingOrder.email || '');
      setDeliveryCharge(editingOrder.deliveryCharge ?? 100);
      setDiscountAmount((editingOrder as any).discount ?? 0);
      setAdvancePayment((editingOrder as any).advancePayment ?? 0);
      setDeliveryPartner(editingOrder.partner || editingOrder.courier || 'Pathao');
      setTrackingId(editingOrder.trackingId || (editingOrder as any).pathaoConsignmentId || (editingOrder as any).trackingCode || '');
      setInternalNote(editingOrder.notes || '');
      setInvoiceBy((editingOrder.invoiceBy as any) || 'Sabbir');
      if (editingOrder.createdAt) {
        const d = new Date(editingOrder.createdAt);
        if (!isNaN(d.getTime())) {
          setOrderDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }));
          setOrderTime(d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: false }));
        } else {
          const now = getDhakaNow();
          setOrderDate(now.dateStr);
          setOrderTime(now.timeStr);
        }
      } else {
        const now = getDhakaNow();
        setOrderDate(now.dateStr);
        setOrderTime(now.timeStr);
      }
      setInvoiceNo(editingOrder.invoiceNo ? String(editingOrder.invoiceNo) : (editingOrder.id || ''));

      if (editingOrder.items && editingOrder.items.length > 0) {
        setOrderItems(
          editingOrder.items.map((it: any, idx: number) => ({
            id: `${it.id || idx}-${Date.now()}`,
            product: it,
            selectedSize: it.selectedSize || 'M',
            quantity: it.quantity || 1,
            price: it.price || 0
          }))
        );
      } else {
        setOrderItems([]);
      }
    } else {
      // Clean new order state
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerCity('Inside Dhaka');
      setCustomerThana('');
      setCustomerEmail('');
      setDeliveryCharge(80);
      setDiscountAmount(0);
      setAdvancePayment(0);
      setAdvancePaymentMethod('');
      setDeliveryPartner('');
      setTrackingId('');
      setInternalNote('');
      setDeliveryDate('');
      const now = getDhakaNow();
      setOrderDate(now.dateStr);
      setOrderTime(now.timeStr);
      const autoNext = typeof getNextOrderId === 'function' ? getNextOrderId() : '';
      setInvoiceNo(autoNext);
      setOrderItems([]);
      setLeftSearchVal('');
    }
  }, [isOpen, editingOrder]);

  // Pre-cached products with search index for instant filtering
  const searchableProducts = useMemo(() => {
    return products.map(p => ({
      ...p,
      _searchStr: `${p.name} ${p.category || ''} ${(p.sizes || []).join(' ')} ${p.id} ${p.sku || ''}`.toLowerCase()
    }));
  }, [products]);

  // Filter products by search term (capped at 40 results for snappy DOM rendering)
  const matchedProducts = useMemo(() => {
    const q = leftSearchVal.trim().toLowerCase();
    if (!q) return [];
    const filtered = searchableProducts.filter(p => p._searchStr.includes(q));
    return filtered.slice(0, 40);
  }, [searchableProducts, leftSearchVal]);

  const handleAddProduct = useCallback((product: Product, size: string) => {
    setOrderItems(prev => {
      const idx = prev.findIndex(it => it.product.id === product.id && it.selectedSize === size);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      } else {
        return [
          ...prev,
          {
            id: `${product.id}-${size}-${Date.now()}`,
            product,
            selectedSize: size,
            quantity: 1,
            price: product.price
          }
        ];
      }
    });
    toast.success(`Added ${product.name} (${size})`, { id: `add-${product.id}-${size}` });
  }, []);

  const handleAutofillCustomer = useCallback(() => {
    if (matchedCustomer) {
      setCustomerName(matchedCustomer.name);
      setCustomerAddress(matchedCustomer.address);
      setCustomerCity(matchedCustomer.city);
      setCustomerThana(matchedCustomer.thana || '');
      if (matchedCustomer.email) {
        setCustomerEmail(matchedCustomer.email);
      }
      toast.success(`Autofilled for ${matchedCustomer.name}!`);
    }
  }, [matchedCustomer]);

  const calculateCreatedAt = useCallback((fallbackIso?: string): string => {
    if (orderDate) {
      const timeToUse = (orderTime && orderTime.trim()) ? orderTime.trim() : getDhakaNow().timeStr;
      const [hh = '00', mm = '00'] = timeToUse.split(':');
      const constructed = new Date(`${orderDate}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00+06:00`);
      if (!isNaN(constructed.getTime())) {
        return constructed.toISOString();
      }
    }
    return fallbackIso || new Date().toISOString();
  }, [orderDate, orderTime]);

  const handleAddCustomInvoiceBy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customInvoiceByName.trim();
    if (!trimmed) {
      toast.error('Please enter a name');
      return;
    }
    const success = await addInvoiceByOption(trimmed);
    if (success) {
      toast.success(`"${trimmed}" has been added!`);
      setInvoiceBy(trimmed);
      setCustomInvoiceByName('');
      setShowAddInvoiceByModal(false);
    } else {
      toast.error('Failed to save name.');
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return orderItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  }, [orderItems]);

  const collectableAmount = useMemo(() => {
    return Math.max(0, subtotal + deliveryCharge - discountAmount - advancePayment);
  }, [subtotal, deliveryCharge, discountAmount, advancePayment]);

  const isFormValid = Boolean(customerName.trim() && customerPhone.trim() && orderItems.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      toast.error("অনুগ্রহ করে বামপাশের ক্যাটালগ থেকে অন্তত ১টি প্রোডাক্ট সিলেক্ট করুন।");
      return;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      toast.error("অনুগ্রহ করে কাস্টমারের নাম লিখুন।");
      return;
    }

    const trimmedPhone = customerPhone.trim();
    if (!trimmedPhone) {
      toast.error("অনুগ্রহ করে কাস্টমারের ফোন নম্বর লিখুন।");
      return;
    }

    const effectiveAddress = customerAddress.trim() || 'Dhaka';
    const effectiveCity = customerCity.trim() || 'Inside Dhaka';

    setIsSubmitting(true);
    try {
      const cartItems: CartItem[] = orderItems.map(it => ({
        ...it.product,
        selectedSize: it.selectedSize,
        quantity: it.quantity,
        price: it.price,
        sku: it.product?.sku || (it.product?.id ? `EP ${it.product.id.slice(-3).toUpperCase()}` : 'EP 100')
      }));

      const courierChargeToSave = 120;
      const courierPayoutToSave = Math.max(0, collectableAmount - courierChargeToSave);

      if (editingOrder) {
        const trackingToSave = trackingId || editingOrder.trackingId || '';
        const updatedData: Partial<Order> = {
          customerName: trimmedName,
          email: customerEmail || '',
          phone: trimmedPhone,
          address: effectiveAddress,
          city: effectiveCity,
          thana: customerThana,
          items: cartItems,
          deliveryCharge,
          total: collectableAmount,
          notes: internalNote || '',
          discount: discountAmount,
          advancePayment,
          invoiceBy,
          courier: deliveryPartner || 'Pathao',
          partner: deliveryPartner || '',
          trackingId: trackingToSave,
          trackingCode: trackingToSave,
          pathaoConsignmentId: (deliveryPartner === 'Pathao' || !deliveryPartner) ? (trackingToSave || (editingOrder as any).pathaoConsignmentId || '') : (editingOrder as any).pathaoConsignmentId,
          courierCharge: courierChargeToSave,
          courierPayoutAmount: courierPayoutToSave,
          createdAt: calculateCreatedAt(editingOrder.createdAt),
          invoiceNo: invoiceNo ? parseInt(invoiceNo, 10) : (editingOrder.invoiceNo || undefined)
        };

        await onSaveOrder(updatedData, true, editingOrder.id);
        toast.success(`Order #${editingOrder.id.slice(-6)} updated!`);
      } else {
        const nextId = typeof getNextOrderId === 'function' ? getNextOrderId() : '';
        const effectiveInvoiceStr = (invoiceNo && String(invoiceNo).trim() !== '') ? String(invoiceNo).trim() : nextId;
        const finalInvNo = parseInt(effectiveInvoiceStr, 10);
        const newOrder: Order = {
          id: effectiveInvoiceStr || nextId,
          invoiceNo: !isNaN(finalInvNo) ? finalInvNo : undefined,
          customerId: 'manual_admin',
          customerName: trimmedName,
          email: customerEmail || '',
          phone: trimmedPhone,
          address: effectiveAddress,
          city: effectiveCity,
          thana: customerThana,
          items: cartItems,
          deliveryCharge,
          total: collectableAmount,
          status: 'Pending',
          paymentMethod: (advancePaymentMethod.toLowerCase() as any) || 'cod',
          createdAt: calculateCreatedAt(),
          notes: internalNote || '',
          discount: discountAmount,
          advancePayment,
          invoiceBy,
          courier: deliveryPartner || 'Pathao',
          partner: deliveryPartner || '',
          trackingId: trackingId || '',
          trackingCode: trackingId || '',
          pathaoConsignmentId: (deliveryPartner === 'Pathao' || !deliveryPartner) ? (trackingId || '') : undefined,
          courierCharge: courierChargeToSave,
          courierPayoutAmount: courierPayoutToSave
        };

        await onSaveOrder(newOrder, false);
        toast.success(`Order #${newOrder.id} created successfully!`);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to save order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
        {/* Clean, GPU-accelerated backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transform-gpu"
        />

        {/* Modal Dialog container */}
        <motion.div 
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 bg-[#E8EDF5] rounded-[24px] w-full max-w-[1100px] h-[92vh] max-h-[860px] overflow-hidden shadow-2xl border border-white/80 flex flex-col font-sans transform-gpu"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 flex items-center justify-between bg-[#E8EDF5] border-b border-slate-200/80 shrink-0">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {editingOrder ? `Order Details & Edit #${editingOrder.id.slice(-6)}` : 'Create Order'}
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {editingOrder 
                  ? 'View and modify order items, customer details, address, and logistics.' 
                  : 'Record precise transaction details and sync with inventory catalog.'}
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <XCircle size={20} />
            </button>
          </div>

          {/* Split Screen Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#E8EDF5]">
            
            {/* LEFT COLUMN: IBL Search panel */}
            <div className="lg:col-span-5 border-r border-slate-200/80 p-5 flex flex-col bg-[#E8EDF5] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-2.5 shrink-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                  <Scan size={13} className="stroke-[3]" /> IBL SEARCH
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  SCAN OR ENTER SKU
                </span>
              </div>

              {/* SKU/Barcode input box */}
              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 stroke-[2.5]" />
                <input 
                  type="text" 
                  placeholder="Scan Barcode or Search SKU/Name..." 
                  value={leftSearchVal}
                  onChange={(e) => setLeftSearchVal(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl placeholder-slate-400 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                />
                {leftSearchVal && (
                  <button
                    type="button"
                    onClick={() => setLeftSearchVal('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Catalog list container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left">
                {!leftSearchVal.trim() ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/70 border border-slate-200/80 flex items-center justify-center mb-3 text-slate-400 shadow-xs">
                      <Scan size={28} className="animate-pulse" />
                    </div>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Search or scan code to add items</p>
                    <p className="text-[11px] text-slate-400 mt-1.5 max-w-xs leading-relaxed text-center font-medium">
                      Enter SKU, barcode, or product name in the search box above to view details, available sizes, and stock count.
                    </p>
                  </div>
                ) : matchedProducts.length === 0 ? (
                  <div className="py-14 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase">No products found matching "{leftSearchVal}"</p>
                  </div>
                ) : (
                  matchedProducts.map(prod => (
                    <div 
                      key={prod.id} 
                      className="p-3 border border-slate-200/90 rounded-2xl bg-white hover:border-blue-400 transition-all shadow-xs flex flex-col gap-2.5"
                    >
                      <div className="flex gap-3 items-center">
                        <img 
                          src={(prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=100'} 
                          alt={prod.name} 
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                            SKU: EP-{prod?.id ? prod.id.slice(-4).toUpperCase() : '0000'}
                          </span>
                          <p className="text-xs font-black text-slate-900 truncate mt-0.5" title={prod.name}>
                            {prod.name}
                          </p>
                          <p className="text-xs font-black text-blue-600 font-mono mt-0.5">
                            {formatPrice(prod.price, currency, rate)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Sizes selector pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase mr-1">ADD SIZE:</span>
                        {(prod.sizes || []).map(sz => {
                          const stockQty = prod.sizeStock?.[sz] ?? 0;
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handleAddProduct(prod, sz)}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-blue-600 hover:text-white border border-slate-200 text-[10px] font-black uppercase rounded-lg transition-all active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{sz}</span>
                              <span className={cn("text-[9px] font-bold", stockQty <= 5 ? 'text-red-500' : 'text-emerald-600')}>
                                ({stockQty} pcs)
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Order details & Memo billing */}
            <form 
              onSubmit={handleSubmit}
              className="lg:col-span-7 flex flex-col overflow-hidden h-full bg-[#E8EDF5]"
            >
              {/* Scrollable inputs field wrapper */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
                
                {/* ORDER ITEMS */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      ORDER ITEMS (REQUIRED)
                    </span>
                    <span className="bg-white border border-slate-200 text-blue-600 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide font-mono shadow-xs">
                      {orderItems.length} styles
                    </span>
                  </div>

                  {orderItems.length === 0 ? (
                    <div className="py-7 bg-white/60 border border-dashed border-slate-300 rounded-2xl text-center flex items-center justify-center">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                        SELECT PRODUCTS FROM THE LEFT CATALOG
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orderItems.map(item => (
                        <div 
                          key={item.id} 
                          className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-xs font-black text-slate-900 truncate">
                                {item.product.name} ({item.selectedSize})
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                                SKU: EP-{item.product?.id ? item.product.id.slice(-4).toUpperCase() : '0000'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Quantity & Price */}
                          <div className="flex items-center gap-2 shrink-0">
                            <input 
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setOrderItems(prev => prev.map(it => it.id === item.id ? { ...it, quantity: val } : it));
                              }}
                              className="w-12 text-center py-1 bg-slate-50 border border-slate-200 text-xs font-black rounded-lg outline-none focus:border-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-400">×</span>
                            
                            <div className="relative">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">৳</span>
                              <input 
                                type="number"
                                min={0}
                                value={item.price}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setOrderItems(prev => prev.map(it => it.id === item.id ? { ...it, price: val } : it));
                                }}
                                className="w-20 pl-4 pr-1 text-center py-1 bg-slate-50 border border-slate-200 text-xs font-black rounded-lg outline-none focus:border-blue-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => setOrderItems(prev => prev.filter(it => it.id !== item.id))}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CUSTOMER DETAILS SECTION */}
                <div className="space-y-3.5 pt-2 border-t border-slate-200/80">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block text-left">
                    CUSTOMER DETAILS
                  </span>
                  
                  {/* Lookup phone number */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      PHONE NUMBER (LOOKUP)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="tel" 
                        placeholder="e.g., 017XXXXXXXX" 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl placeholder-slate-400 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                      />
                    </div>
                    
                    {/* Autofill helper suggestion */}
                    {matchedCustomer && (
                      <button
                        type="button"
                        onClick={handleAutofillCustomer}
                        className="mt-1.5 w-full text-left bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-xl px-3 py-2 text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-99"
                      >
                        <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                        <span>Found client: <span className="underline font-black">{matchedCustomer.name}</span> — Click to autofill address &amp; region</span>
                      </button>
                    )}

                    {customerPhone.trim().length >= 6 && !matchedCustomer && (
                      <div className="mt-1.5 w-full text-left bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus size={13} className="text-emerald-600 shrink-0" />
                        <span>NEW PROFILE WILL BE CREATED</span>
                      </div>
                    )}
                  </div>

                  {/* Grid for Name and City/Region */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">FULL NAME</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type="text" 
                          placeholder="e.g., John Doe" 
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl placeholder-slate-400 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">DELIVERY REGION (REQUIRED)</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select 
                          value={customerCity}
                          onChange={(e) => {
                            const region = e.target.value;
                            setCustomerCity(region);
                            if (region === 'Inside Dhaka') setDeliveryCharge(80);
                            else if (region === 'Sub Area') setDeliveryCharge(110);
                            else if (region === 'Outside Dhaka') setDeliveryCharge(130);
                            else if (region === 'Store Pickup') setDeliveryCharge(0);
                          }}
                          className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-xs"
                        >
                          <option value="" disabled>Select Region</option>
                          <option value="Inside Dhaka">Inside Dhaka</option>
                          <option value="Sub Area">Sub Area</option>
                          <option value="Outside Dhaka">Outside Dhaka</option>
                          <option value="Store Pickup">Store Pickup</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* EMAIL & ORDER DATE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">EMAIL (OPTIONAL)</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type="email" 
                          placeholder="e.g., john@example.com" 
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl placeholder-slate-400 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">ORDER DATE & TIME (রিয়েল টাইম)</label>
                        <button
                          type="button"
                          onClick={() => {
                            const now = getDhakaNow();
                            setOrderDate(now.dateStr);
                            setOrderTime(now.timeStr);
                            toast.success("Real-time timestamp synced!", { id: "real-time-sync" });
                          }}
                          className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-100"
                          title="এখনকার রিয়েল তারিখ ও সময় সেট করুন"
                        >
                          <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>Real-Time</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                          <input 
                            type="date" 
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                            className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 text-xs font-semibold rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                          />
                        </div>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                          <input 
                            type="time" 
                            value={orderTime}
                            onChange={(e) => setOrderTime(e.target.value)}
                            className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 text-xs font-semibold rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SHIPPING ADDRESS & THANA FIELDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">SHIPPING ADDRESS</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                        <textarea 
                          rows={2}
                          placeholder="e.g., House 12, Road 4, Dhanmondi" 
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 text-xs font-semibold rounded-xl placeholder-slate-400 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">THANA / AREA</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type="text" 
                          placeholder="e.g., Savar" 
                          value={customerThana}
                          onChange={(e) => setCustomerThana(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl placeholder-slate-400 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRACKING & DISPATCH INFO SECTION */}
                <div className="space-y-3.5 pt-2 border-t border-slate-200/80">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block text-left">
                    TRACKING &amp; DISPATCH
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* DELIVERY PARTNER */}
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">DELIVERY PARTNER</label>
                      <div className="relative">
                        <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select 
                          value={deliveryPartner}
                          onChange={(e) => setDeliveryPartner(e.target.value)}
                          className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-xs"
                        >
                          <option value="">Select Partner (Optional)</option>
                          <option value="Pathao">Pathao</option>
                          <option value="Steadfast">Steadfast</option>
                          <option value="RedX">RedX</option>
                          <option value="Paperfly">Paperfly</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>

                    {/* INVOICE BY */}
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">INVOICE BY</label>
                        <button
                          type="button"
                          onClick={() => setShowAddInvoiceByModal(true)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <Plus size={11} className="stroke-[3]" />
                          <span>Add</span>
                        </button>
                      </div>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select 
                          value={invoiceBy}
                          onChange={(e) => setInvoiceBy(e.target.value)}
                          className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-xs"
                        >
                          {invoiceByOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* INVOICE NO */}
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">INVOICE NO (AUTO SERIAL)</label>
                      <div className="relative">
                        <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type="number" 
                          placeholder={typeof getNextOrderId === 'function' ? `Next Serial: #${getNextOrderId()}` : "Auto Serial"} 
                          value={invoiceNo}
                          onChange={(e) => setInvoiceNo(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl placeholder-slate-400 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    {/* TRACKING ID */}
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">TRACKING ID</label>
                      <div className="relative">
                        <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type="text" 
                          placeholder="Tracking Number" 
                          value={trackingId}
                          onChange={(e) => setTrackingId(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl placeholder-slate-400 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DELIVERY DATE */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">DELIVERY DATE (OPTIONAL)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      <input 
                        type="date" 
                        value={deliveryDate} 
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-mono shadow-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* BILLING & PAYMENT SECTION */}
                <div className="space-y-3.5 pt-2 border-t border-slate-200/80">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block text-left">
                    BILLING &amp; PAYMENT
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">DELIVERY CHARGE</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">৳</span>
                        <input 
                          type="number" 
                          min={0}
                          value={deliveryCharge}
                          onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">DISCOUNT</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">৳</span>
                        <input 
                          type="number" 
                          min={0}
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">ADVANCE</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">৳</span>
                        <input 
                          type="number" 
                          min={0}
                          value={advancePayment}
                          onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">COLLECTABLE</label>
                      <div className="relative bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 flex items-center justify-between font-mono font-black text-xs h-[42px] shadow-xs select-all">
                        <span>৳</span>
                        <span>{collectableAmount}</span>
                      </div>
                    </div>
                  </div>

                  {/* ADVANCE PAYMENT METHOD pills row */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">ADVANCE PAYMENT METHOD</label>
                    <div className="flex items-center gap-2">
                      {/* Cash Button */}
                      <button
                        type="button"
                        onClick={() => setAdvancePaymentMethod('Cash')}
                        className={cn(
                          "flex-1 py-2 px-3 text-[11px] font-black uppercase rounded-xl transition-all border shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95",
                          advancePaymentMethod === 'Cash'
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-black"
                            : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-white shrink-0 border border-slate-200 flex items-center justify-center overflow-hidden p-0.5 relative">
                          {paymentsConfig.codLogo ? (
                            <img src={paymentsConfig.codLogo} alt="Cash" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-sm">💵</span>
                          )}
                        </div>
                        <span>Cash</span>
                      </button>

                      {/* bKash Button */}
                      <button
                        type="button"
                        onClick={() => setAdvancePaymentMethod('bKash')}
                        className={cn(
                          "flex-1 py-2 px-3 text-[11px] font-black uppercase rounded-xl transition-all border shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95",
                          advancePaymentMethod === 'bKash'
                            ? "bg-pink-50 border-pink-500 text-pink-700 font-black"
                            : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-white shrink-0 border border-slate-200 flex items-center justify-center overflow-hidden p-0.5 relative">
                          {paymentsConfig.bkashLogo ? (
                            <img 
                              src={paymentsConfig.bkashLogo} 
                              alt="bKash" 
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full rounded bg-[#E2136E] flex items-center justify-center text-white text-[9px] font-black tracking-tighter">
                              bK
                            </div>
                          )}
                        </div>
                        <span>bKash</span>
                      </button>

                      {/* Nagad Button */}
                      <button
                        type="button"
                        onClick={() => setAdvancePaymentMethod('Nagad')}
                        className={cn(
                          "flex-1 py-2 px-3 text-[11px] font-black uppercase rounded-xl transition-all border shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95",
                          advancePaymentMethod === 'Nagad'
                            ? "bg-orange-50 border-orange-500 text-orange-700 font-black"
                            : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-white shrink-0 border border-slate-200 flex items-center justify-center overflow-hidden p-0.5 relative">
                          {paymentsConfig.nagadLogo ? (
                            <img 
                              src={paymentsConfig.nagadLogo} 
                              alt="Nagad" 
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full rounded bg-[#F47216] flex items-center justify-center text-white text-[9px] font-black tracking-tighter">
                              Ng
                            </div>
                          )}
                        </div>
                        <span>Nagad</span>
                      </button>
                      
                      {advancePaymentMethod && (
                        <button
                          type="button"
                          onClick={() => setAdvancePaymentMethod('')}
                          title="Clear selection"
                          className="p-2.5 border border-slate-200 hover:border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-800 shrink-0 shadow-xs cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* INTERNAL NOTE */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">INTERNAL NOTE (OPTIONAL)</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Call before delivery, handle with care..." 
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl placeholder-slate-400 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

              </div>

              {/* STICKY BOTTOM SUMMARY BAR */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 text-left shadow-lg">
                <div className="space-y-3">
                  
                  {/* Totals */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">SUBTOTAL</span>
                        <span className="font-mono font-black text-slate-800 text-sm">
                          {formatPrice(subtotal, currency, rate)}
                        </span>
                      </div>
                      {advancePayment > 0 && (
                        <div>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">ADVANCE (-)</span>
                          <span className="font-mono font-black text-emerald-600 text-sm">
                            {formatPrice(advancePayment, currency, rate)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">COLLECTABLE AMOUNT</span>
                      <span className="text-2xl font-black text-slate-900 font-mono-numbers leading-none">
                        {formatPrice(collectableAmount, currency, rate)}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-3.5 uppercase font-black text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98",
                        isSubmitting
                          ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-blue-500/30"
                      )}
                    >
                      <CheckCircle2 size={16} className="stroke-[3]" />
                      <span>
                        {isSubmitting 
                          ? 'Saving Order...' 
                          : editingOrder 
                            ? `Update Order Record #${editingOrder.id.slice(-6)}` 
                            : 'Save Order / Create Entry'}
                      </span>
                    </button>
                    
                    {(!customerName.trim() || !customerPhone.trim() || orderItems.length === 0) && (
                      <p className="text-[9.5px] font-bold text-center tracking-wide text-amber-600 uppercase mt-1.5">
                        Please enter name, phone number &amp; add products to create order
                      </p>
                    )}
                  </div>

                </div>
              </div>

            </form>

          </div>
        </motion.div>

        {/* Modal: Add Custom Invoice By Name */}
        {showAddInvoiceByModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-200 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Add Invoice By Name</h3>
                <button 
                  type="button"
                  onClick={() => setShowAddInvoiceByModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddCustomInvoiceBy} className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Enter dispatcher / employee name" 
                  value={customInvoiceByName}
                  onChange={(e) => setCustomInvoiceByName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl outline-none focus:border-blue-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddInvoiceByModal(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl"
                  >
                    Add Name
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AnimatePresence>
  );
};
export default CreateOrderModal;
