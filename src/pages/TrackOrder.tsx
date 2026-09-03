/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatPrice, cn } from '../lib/utils';
import { Order } from '../types';
import { 
  Search, 
  Package, 
  MapPin, 
  Phone, 
  User, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  ArrowLeft,
  CreditCard,
  AlertCircle,
  HelpCircle,
  Hash,
  MessageCircle,
  Printer,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { trackCourierOrder } from '../utils/apiClient';

export default function TrackOrder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currency, rate } = useCurrency();
  
  const [orderIdInput, setOrderIdInput] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [matchedOrders, setMatchedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Live courier status state
  const [liveCourierStatus, setLiveCourierStatus] = useState<string | null>(null);
  const [liveCourierName, setLiveCourierName] = useState<string>('Pathao');
  const [liveCourierLoading, setLiveCourierLoading] = useState<boolean>(false);
  const [liveTrackingId, setLiveTrackingId] = useState<string>('');

  // Get ID from query parameter if present
  const queryId = searchParams.get('id') || searchParams.get('orderId') || '';

  const fetchLiveCourier = async (targetOrder: Order) => {
    const rawId = (targetOrder as any).pathaoConsignmentId || targetOrder.trackingId || (targetOrder as any).trackingCode || (targetOrder as any).steadfastConsignmentId;
    const cleanId = String(rawId || '').replace(/^#/, '').trim();
    if (!cleanId) {
      setLiveCourierStatus(null);
      setLiveTrackingId('');
      return;
    }

    setLiveTrackingId(cleanId);
    setLiveCourierLoading(true);
    const isSteadfast = Boolean((targetOrder as any).steadfastConsignmentId) || (targetOrder.courier || '').toLowerCase().includes('steadfast');
    setLiveCourierName(isSteadfast ? 'Steadfast' : 'Pathao');

    try {
      const { ok, data } = await trackCourierOrder(cleanId, targetOrder.courier || (isSteadfast ? 'steadfast' : 'pathao'));
      if (ok && data.success && data.status) {
        setLiveCourierStatus(data.status);
        if (data.courier) {
          setLiveCourierName(data.courier);
        }
      } else {
        // Fall back to order.courierStatus if available in Firestore
        setLiveCourierStatus((targetOrder as any).courierStatus || null);
      }
    } catch (e) {
      setLiveCourierStatus((targetOrder as any).courierStatus || null);
    } finally {
      setLiveCourierLoading(false);
    }
  };

  useEffect(() => {
    if (order) {
      setLiveCourierStatus((order as any).courierStatus || null);
      fetchLiveCourier(order);
    } else {
      setLiveCourierStatus(null);
      setLiveTrackingId('');
    }
  }, [order]);

  useEffect(() => {
    if (queryId) {
      setOrderIdInput(queryId);
      fetchOrderDetails(queryId);
    }
  }, [queryId]);

  const fetchOrderDetails = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setSearched(true);
    setOrder(null);
    setMatchedOrders([]);

    // Clean input
    const cleanInput = id.replace('#', '').trim();
    const isNumeric = /^\d+$/.test(cleanInput);

    try {
      let foundOrders: Order[] = [];

      // 1. Try direct doc ID lookup
      try {
        const docRef = doc(db, 'orders', cleanInput);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          foundOrders.push({ id: snapshot.id, ...snapshot.data() } as Order);
        }
      } catch (e) {
        console.warn('Doc lookup fail:', e);
      }

      // 2. If numeric, search by invoiceNo
      if (isNumeric && foundOrders.length === 0) {
        const numVal = Number(cleanInput);
        const qInvoiceNum = query(collection(db, 'orders'), where('invoiceNo', '==', numVal));
        const snapInvoice = await getDocs(qInvoiceNum);
        snapInvoice.forEach((d) => {
          if (!foundOrders.some(o => o.id === d.id)) {
            foundOrders.push({ id: d.id, ...d.data() } as Order);
          }
        });
      }

      // 3. Search by Phone Number (check variants with or without leading zero or +88)
      if (foundOrders.length === 0) {
        const phoneVariants = [
          cleanInput,
          cleanInput.startsWith('0') ? cleanInput.substring(1) : '0' + cleanInput,
          '+88' + cleanInput,
          '88' + cleanInput,
        ];

        for (const phoneVar of phoneVariants) {
          const qPhone = query(collection(db, 'orders'), where('phone', '==', phoneVar));
          const snapPhone = await getDocs(qPhone);
          snapPhone.forEach((d) => {
            if (!foundOrders.some(o => o.id === d.id)) {
              foundOrders.push({ id: d.id, ...d.data() } as Order);
            }
          });
          if (foundOrders.length > 0) break;
        }
      }

      // 4. Search by custom ID field if stored as string
      if (foundOrders.length === 0) {
        const qId = query(collection(db, 'orders'), where('id', '==', cleanInput));
        const snapId = await getDocs(qId);
        snapId.forEach((d) => {
          if (!foundOrders.some(o => o.id === d.id)) {
            foundOrders.push({ id: d.id, ...d.data() } as Order);
          }
        });
      }

      if (foundOrders.length === 1) {
        setOrder(foundOrders[0]);
      } else if (foundOrders.length > 1) {
        // Sort newest first
        foundOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMatchedOrders(foundOrders);
      } else {
        setErrorMsg(`No order found matching "${cleanInput}". Please double-check your Invoice Number or Mobile Phone Number.`);
      }
    } catch (err: any) {
      console.error("Firestore loading error:", err);
      setErrorMsg("Failed to retrieve system records. Please try again or query customer care.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (orderIdInput.trim()) {
      setSearchParams({ id: orderIdInput.trim() });
    }
  };

  // Status mapping for visual timeline progress indicator
  const statuses: Order['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered'];

  const getStatusStepIndex = (status: Order['status']) => {
    const s = (status || '').toUpperCase();
    if (s === 'CANCELLED' || s === 'HOLD' || s === 'RETURNED') return -1;
    if (s === 'PENDING' || s === 'ORDER PLACED') return 0;
    if (s === 'PROCESSING' || s === 'PREPARING') return 1;
    if (s === 'SHIPPED') return 2;
    if (s === 'DELIVERED' || s === 'SUCCESS' || s === 'QC' || s === 'PICK UP CANCEL') return 3;
    return -1;
  };

  const currentStepIndex = order ? getStatusStepIndex(order.status) : -1;

  const getStatusStyle = (status: Order['status']) => {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED' || s === 'SUCCESS' || s === 'QC' || s === 'PICK UP CANCEL') {
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
    if (s === 'SHIPPED') {
      return 'text-amber-700 bg-amber-50 border-amber-200';
    }
    if (s === 'PROCESSING' || s === 'PREPARING') {
      return 'text-blue-700 bg-blue-50 border-blue-200';
    }
    if (s === 'CANCELLED' || s === 'RETURNED') {
      return 'text-rose-700 bg-rose-50 border-rose-200';
    }
    return 'text-indigo-700 bg-indigo-50 border-indigo-200';
  };

  return (
    <div className="pt-32 pb-32 min-h-screen bg-gray-50/60 font-sans text-black">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        
        {/* Back To Home Navigation */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black hover:text-brand-gold transition-colors"
          >
            <ArrowLeft size={14} className="text-black" />
            <span>Back to Storefront</span>
          </Link>
        </div>

        {/* Hero Title Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black/10 text-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={30} className="text-black" />
          </div>
          <h1 className="text-3xl font-black text-black uppercase tracking-tight italic">
            Track Order Status
          </h1>
          <p className="text-xs uppercase tracking-widest font-black text-gray-500 mt-1.5">
            Realtime delivery & logistics verification system
          </p>
        </div>

        {/* Main query input panel - high-contrast layout */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm mb-6">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <label className="block text-[10px] sm:text-xs font-black uppercase tracking-widest text-black mb-1">
              Enter Invoice No or Mobile Phone Number
            </label>
            <div className="relative flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-black text-sm">
                  #
                </span>
                <input 
                  type="text" 
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  placeholder="e.g. 2670001 or 01712345678" 
                  className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl pl-8 pr-4 text-black text-base font-black tracking-tight focus:bg-white focus:border-black transition-all outline-none"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95 disabled:bg-gray-300 shadow-md"
              >
                <Search size={16} strokeWidth={2.5} />
                <span>Track Now</span>
              </button>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>💡 You can search by Invoice No (e.g. 2670001) or Mobile Phone Number</span>
            </p>
          </form>
        </div>

        {/* Loading overlay spinner - high-contrast black loader */}
        {loading && (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-black/10 border-t-black rounded-full animate-spin" />
            <div>
              <p className="text-sm font-black text-black uppercase tracking-wide">Syncing records...</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Searching database records</p>
            </div>
          </div>
        )}

        {/* Multiple Matched Orders Selection List */}
        {!loading && matchedOrders.length > 1 && (
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4 mb-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-black uppercase tracking-wider">Multiple Orders Found ({matchedOrders.length})</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Select an invoice below to view complete tracking details</p>
              </div>
            </div>

            <div className="space-y-3">
              {matchedOrders.map((mo) => (
                <button
                  key={mo.id}
                  onClick={() => {
                    setOrder(mo);
                    setMatchedOrders([]);
                  }}
                  className="w-full p-4 bg-gray-50 hover:bg-blue-50/60 border border-gray-200/80 hover:border-blue-300 rounded-2xl transition-all flex items-center justify-between text-left group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-blue-600 font-mono">
                        Invoice #{mo.invoiceNo ? String(mo.invoiceNo) : mo.id.replace(/^ORD-?/i, '')}
                      </span>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                        getStatusStyle(mo.status)
                      )}>
                        {mo.status}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-600">
                      Placed on {new Date(mo.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} • Total: <span className="font-black text-black">{formatPrice(mo.total, currency, rate)}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 truncate max-w-sm">
                      {mo.items?.map(i => `${i.name} (×${i.quantity})`).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-black text-[#1b49c4] group-hover:translate-x-1 transition-transform">
                    <span>View Details</span>
                    <ChevronRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Notification - high-contrast visible layout */}
        {!loading && errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-[2rem] p-6 text-center text-rose-900 flex flex-col items-center gap-3">
            <AlertCircle size={32} className="text-rose-600" />
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-rose-950">Record Lookup Aborted</p>
              <p className="text-xs font-bold leading-relaxed text-rose-900 mt-1 max-w-md mx-auto">{errorMsg}</p>
            </div>
            <div className="mt-2 text-[10px] font-black uppercase text-rose-900 tracking-wider">
              If you just placed the order, please wait up to 1-2 minutes for the system database to initialize.
            </div>
          </div>
        )}

        {/* Success Details Render - Bold high-contrast black texts! */}
        <AnimatePresence>
          {!loading && order && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="space-y-6"
            >
              
              {/* Dynamic Progress Timeline block */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm">
                
                {/* Header info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5 mb-6">
                  <div>
                    <span className="text-[9px] font-black bg-black text-white px-3 py-1.5 rounded-lg uppercase tracking-wider block w-max mb-1.5">
                      LIVE DISPATCH
                    </span>
                    <h3 className="text-lg font-black text-black tracking-tight uppercase flex items-center gap-1.5">
                      <span>Invoice</span>
                      <span className="text-[#1b49c4] font-mono">#{order.invoiceNo ? String(order.invoiceNo) : order.id.replace(/^ORD-?/i, '')}</span>
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                      Registered on {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </p>
                  </div>

                  <div className={cn(
                    "px-4 py-2 border rounded-2xl text-xs font-black uppercase tracking-widest text-center min-w-[120px]",
                    getStatusStyle(order.status)
                  )}>
                    {order.status === 'Pending' ? 'Placed & Confirmed' : order.status}
                  </div>
                </div>

                {/* Timeline display logic */}
                {order.status === 'Cancelled' ? (
                  <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-950">
                    <XCircle size={32} className="text-rose-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-rose-950">This order has been cancelled</p>
                      <p className="text-[10px] font-bold text-rose-800 leading-relaxed mt-0.5">
                        The order was cancelled on the tracking console or by customer request. Contact our help desk for immediate assistance.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-4">
                    {/* Progress Bar Back Line */}
                    <div className="absolute left-4 sm:left-1/2 top-4 bottom-4 w-0.5 bg-gray-150 -translate-x-[1px] sm:translate-x-0 hidden sm:block" />
                    
                    <div className="space-y-8 relative">
                      {statuses.map((stepStatus, idx) => {
                        const isPast = idx <= currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        
                        let stepTitle = '';
                        let stepDescription = '';
                        
                        switch(stepStatus) {
                          case 'Pending':
                            stepTitle = 'Order Confirmed & Placed';
                            stepDescription = 'We registered your invoice into our logistical pipeline successfully.';
                            break;
                          case 'Processing':
                            stepTitle = 'Quality Control & Secure Packing';
                            stepDescription = 'Elegance garments are being quality inspected and safely boxed.';
                            break;
                          case 'Shipped':
                            stepTitle = 'Dispatched and Handed to Courier';
                            stepDescription = 'Your parcel is in transit with our logistics courier service.';
                            break;
                          case 'Delivered':
                            stepTitle = 'Delivered to Destination';
                            stepDescription = 'Parcel securely delivered and verified at shipping address.';
                            break;
                        }

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row items-start sm:justify-between relative gap-2 sm:gap-0">
                            {/* Mobile visual circle indicator left side */}
                            <div className="flex items-center gap-3.5 sm:hidden">
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 transition-all font-black text-xs",
                                isPast 
                                  ? "bg-black border-black text-white" 
                                  : "bg-white border-gray-200 text-gray-400"
                              )}>
                                {isPast ? <CheckCircle2 size={14} strokeWidth={3} /> : idx + 1}
                              </div>
                              <span className={cn(
                                "text-xs font-black uppercase tracking-wider",
                                isCurrent ? "text-brand-gold" : isPast ? "text-black" : "text-gray-400"
                              )}>
                                {stepTitle}
                              </span>
                            </div>

                            {/* Desktop double column split view */}
                            <div className="hidden sm:block w-[45%] text-right pr-6">
                              <span className={cn(
                                "text-xs font-black uppercase tracking-wider block",
                                isCurrent ? "text-black italic underline decoration-brand-gold decoration-2" : isPast ? "text-black" : "text-gray-400"
                              )}>
                                {stepStatus === 'Pending' ? 'PLACED' : stepStatus.toUpperCase()}
                              </span>
                              <p className={cn(
                                "text-[10px] font-bold leading-relaxed mt-1 max-w-xs ml-auto",
                                isPast ? "text-gray-600" : "text-gray-450"
                              )}>
                                {stepDescription}
                              </p>
                            </div>

                            {/* Desktop middle node indicator */}
                            <div className={cn(
                              "hidden sm:flex w-8 h-8 rounded-full border-2 shrink-0 items-center justify-center transition-all z-10 absolute left-1/2 -ml-4",
                              isPast 
                                ? "bg-black border-black text-white shadow-md scale-102" 
                                : "bg-white border-gray-200 text-gray-400"
                            )}>
                              {isPast ? <CheckCircle2 size={13} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                            </div>

                            {/* Desktop right column details blank placeholder to balance layout */}
                            <div className="hidden sm:block w-[45%] pl-6">
                              <span className={cn(
                                "text-xs font-black tracking-tight uppercase block",
                                isCurrent ? "text-brand-gold" : isPast ? "text-black" : "text-gray-400"
                              )}>
                                {stepTitle}
                              </span>
                              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider mt-1.5 flex items-center gap-1">
                                <Clock size={11} className="text-gray-450" />
                                <span>{isPast ? 'Verified & Standardized' : 'Pending Stage'}</span>
                              </p>
                            </div>

                            {/* Mobile extra paragraph */}
                            <div className="sm:hidden pl-10 border-l border-dashed border-gray-200 ml-3.5 pb-2">
                              <p className="text-[10px] font-bold text-gray-700 leading-normal">
                                {stepDescription}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Live Courier Dispatch & Tracking Info */}
              {(liveTrackingId || (order as any).pathaoConsignmentId || (order as any).trackingCode || order.trackingId || (order as any).steadfastConsignmentId) && (
                <div className="bg-slate-900 text-white rounded-[2rem] p-6 sm:p-7 border border-slate-800 shadow-md relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
                        <Truck size={24} className="text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                            Live Courier Dispatch
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {liveCourierName} Courier
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-black text-white uppercase tracking-tight mt-1 flex items-center gap-2">
                          <span className="text-slate-400 font-medium">Tracking ID:</span>
                          <span className="font-mono text-amber-300 font-bold">#{liveTrackingId || (order as any).pathaoConsignmentId || order.trackingId}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Pill & Refresh */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {liveCourierLoading ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/10 text-xs font-black uppercase tracking-wider text-slate-200 animate-pulse">
                          <RefreshCw size={14} className="animate-spin text-amber-400" />
                          <span>Syncing Status...</span>
                        </div>
                      ) : liveCourierStatus ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
                          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                          <span>{liveCourierStatus.replace(/_/g, ' ')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/10 text-xs font-black uppercase tracking-wider text-slate-300">
                          <Clock size={14} className="text-amber-400" />
                          <span>Dispatched via {liveCourierName}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => fetchLiveCourier(order)}
                        disabled={liveCourierLoading}
                        className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                        title="Refresh Live Status"
                      >
                        <RefreshCw size={14} className={liveCourierLoading ? 'animate-spin text-amber-400' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address and client metadata block - Black text */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Column left: Recipient */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B5915F] border-b border-gray-50 pb-1.5">
                    Shipping Recipient
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <User size={14} className="text-black" />
                      <p className="text-xs font-black uppercase tracking-tight text-black">
                        {order.customerName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Phone size={14} className="text-gray-500" />
                      <p className="text-xs font-extrabold tracking-tight text-black font-mono">
                        {order.phone}
                      </p>
                    </div>
                    {order.email && (
                      <div className="flex items-center gap-2.5 pl-[24px]">
                        <p className="text-[10px] font-bold tracking-tight text-gray-600 truncate w-56">
                          {order.email}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column right: Shipping location */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B5915F] border-b border-gray-50 pb-1.5">
                    Delivery Coordinates
                  </h4>
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex gap-2.5">
                    <MapPin size={15} className="text-[#B5915F] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold text-black uppercase tracking-tight leading-relaxed">
                        {order.address}
                      </p>
                      <p className="text-[10px] font-black text-[#B5915F] uppercase tracking-widest mt-1">
                        {order.city}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Items Summary card */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B5915F] border-b border-gray-50 pb-2">
                  Items Contained in Package ({order.items?.length || 0})
                </h4>

                <div className="space-y-3">
                  {order.items?.map((item, index) => (
                    <div 
                      key={index}
                      className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {item.images && item.images[0] && (
                          <div className="w-12 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-150">
                            <img 
                              src={item.images[0]} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-tight text-black truncate max-w-[220px]">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {item.selectedSize && (
                              <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 rounded uppercase">
                                SIZE: {item.selectedSize}
                              </span>
                            )}
                            <span className="text-[9px] font-bold text-gray-500 uppercase">
                              QTY: ×{item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-black">
                          {formatPrice(item.price * item.quantity, currency, rate)}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 font-mono tracking-tight mt-0.5">
                          {formatPrice(item.price, currency, rate)} / u
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown Details Box - Rich Black Texts */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B5915F] border-b border-gray-50 pb-2">
                  Invoice Financial Clearance
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center text-black">
                    <span className="font-extrabold uppercase text-gray-500 text-[10px]">Gross Goods Subtotal</span>
                    <span className="font-bold">
                      {formatPrice(order.total - order.deliveryCharge, currency, rate)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-black">
                    <span className="font-extrabold uppercase text-gray-500 text-[10px]">Logistics Handling Fee</span>
                    <span className="font-bold">
                      {formatPrice(order.deliveryCharge, currency, rate)}
                    </span>
                  </div>

                  <div className="h-px bg-gray-100 my-1" />

                  <div className="flex justify-between items-center text-black pt-1">
                    <span className="font-black uppercase text-black text-[11px] tracking-tight">Net Total Statement</span>
                    <span className="text-xl font-black text-black tracking-tight italic">
                      {formatPrice(order.total, currency, rate)}
                    </span>
                  </div>
                </div>

                {/* Payment Method Statement Tag */}
                <div className="mt-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CreditCard size={15} className="text-black" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-black">
                      Payment Channel
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-black bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
                    {order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : String(order.paymentMethod || 'Online Payment').toUpperCase()}
                  </span>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Customer Help support banner */}
        <div className="mt-8 bg-white border border-gray-100 rounded-[2rem] p-6 text-center shadow-xs">
          <HelpCircle size={24} className="text-[#B5915F] mx-auto mb-2" />
          <h5 className="text-xs font-black uppercase tracking-tight text-black">Need Logistical Support?</h5>
          <p className="text-[10px] text-gray-500 mt-1 max-w-sm mx-auto font-medium leading-relaxed">
            Please reach our official corporate office hotline or initiate a WhatsApp exchange if you require urgent status modification.
          </p>
          <div className="mt-4 flex gap-2.5 justify-center">
            <Link 
              to="/contact" 
              className="text-[10px] font-black uppercase tracking-widest bg-gray-50 hover:bg-black hover:text-white border border-gray-100 px-4 py-2.5 rounded-xl transition-all"
            >
              Contact Support
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
