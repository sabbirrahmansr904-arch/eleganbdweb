import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  PackageCheck, 
  Clock, 
  Send, 
  ArrowRight, 
  X, 
  Search, 
  RotateCcw,
  Check,
  ShieldCheck,
  Pause,
  Play
} from 'lucide-react';
import { Order } from '../../types';
import { useOrders } from '../../contexts/OrderContext';
import { trackCourierOrder } from '../../utils/apiClient';
import { isDeliveredOrSuccess } from '../../utils/orderUtils';
import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';

export interface SyncItemResult {
  orderId: string;
  invoiceNo?: number;
  customerName: string;
  phone: string;
  consignmentId: string;
  courier: string;
  oldStatus: Order['status'];
  newStatus: Order['status'];
  courierStatus: string;
  oldCourierStatus?: string;
  isStatusChanged: boolean;
  isDelivered: boolean;
  isReturned: boolean;
  deliveryFee?: number;
  payoutAmount?: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

interface PathaoSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  selectedOrderIds?: string[];
}

export const PathaoSyncModal: React.FC<PathaoSyncModalProps> = ({
  isOpen,
  onClose,
  orders,
  selectedOrderIds = []
}) => {
  const { updateOrder } = useOrders();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentOrderName, setCurrentOrderName] = useState<string>('');
  const [results, setResults] = useState<SyncItemResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'changed' | 'delivered' | 'intransit' | 'returned' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Filter orders that have tracking/consignment ID
  const getOrdersWithTracking = () => {
    let list = orders;
    if (selectedOrderIds && selectedOrderIds.length > 0) {
      const set = new Set(selectedOrderIds);
      list = orders.filter(o => set.has(o.id));
    }

    return list.filter(ord => {
      const rawId = (ord as any).pathaoConsignmentId || 
                    (ord as any).steadfastConsignmentId || 
                    ord.trackingId || 
                    (ord as any).trackingCode;
      const cleanId = String(rawId || '').replace(/^#/, '').trim();
      return Boolean(cleanId);
    });
  };

  const startSync = async () => {
    const targetOrders = getOrdersWithTracking();
    if (targetOrders.length === 0) {
      toast.info('ট্র্যাকিং কোড বা কনসাইনমেন্ট আইডি সম্বলিত কোনো সক্রিয় অর্ডার পাওয়া যায়নি।');
      return;
    }

    setTotalCount(targetOrders.length);
    setCurrentIndex(0);
    setResults([]);
    setIsRunning(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    let deliveredTotal = 0;
    let returnedTotal = 0;
    let changedTotal = 0;

    for (let i = 0; i < targetOrders.length; i++) {
      if (isCancelledRef.current) break;

      // Handle pause loop
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise(r => setTimeout(r, 300));
      }
      if (isCancelledRef.current) break;

      const ord = targetOrders[i];
      setCurrentIndex(i + 1);
      setCurrentOrderName(`${ord.customerName || 'Customer'} (Invoice #${ord.invoiceNo || ord.id})`);

      const rawId = (ord as any).pathaoConsignmentId || 
                    (ord as any).steadfastConsignmentId || 
                    ord.trackingId || 
                    (ord as any).trackingCode;
      const cleanTrackingId = String(rawId || '').replace(/^#/, '').trim();
      const isSteadfast = Boolean((ord as any).steadfastConsignmentId) || (ord.courier || '').toLowerCase().includes('steadfast');
      const courierToTrack = ord.courier || (isSteadfast ? 'steadfast' : 'pathao');

      const oldStatus = ord.status;
      const oldCourierStatus = (ord as any).courierStatus || '';

      try {
        const { ok, data } = await trackCourierOrder(cleanTrackingId, courierToTrack);

        if (ok && data && data.success && data.status) {
          const liveStatus = data.status;
          const lower = String(liveStatus).toLowerCase();
          const resolvedCourier = data.courier || (isSteadfast ? 'Steadfast' : 'Pathao');

          let newStatus: Order['status'] = oldStatus;
          let isDelivered = false;
          let isReturned = false;

          const isReturnOrCancel = lower.includes('return') || lower.includes('cancel') || lower === 'partial_delivery_return';

          const isTransitOrHubOrAssign = 
            lower.includes('hub') ||
            lower.includes('assign') ||
            lower.includes('transit') ||
            lower.includes('out for') ||
            lower.includes('progress') ||
            lower.includes('hold') ||
            lower.includes('pickup') ||
            lower.includes('pending') ||
            lower.includes('way');

          const isStrictlyDeliveredCourier = 
            !isTransitOrHubOrAssign && 
            (lower === 'delivered' || lower === 'success' || lower === 'successful' || lower === 'delivered / success' || lower === 'delivered/success' || lower === 'delivery_complete');

          if (isReturnOrCancel) {
            newStatus = 'Returned';
            isReturned = true;
            returnedTotal++;
          } else if (isStrictlyDeliveredCourier) {
            newStatus = 'Delivered';
            isDelivered = true;
            deliveredTotal++;
          } else {
            // "kono order sudhu matro only (Delivered) Lekha na utha porjonto order ta success dekhabe na seta shipped hoye thakbe"
            if (oldStatus !== 'Returned' && oldStatus !== 'Cancelled') {
              newStatus = 'Shipped';
            }
          }

          const isStatusChanged = newStatus !== oldStatus || liveStatus !== oldCourierStatus;
          if (isStatusChanged) {
            changedTotal++;
          }

          const courierFee = (data.delivery_fee && data.delivery_fee > 0) ? data.delivery_fee : (ord.courierCharge || 120);
          const payout = Math.max(0, (ord.total || 0) - courierFee);

          // Update in OrderContext & Supabase
          if (updateOrder) {
            try {
              await updateOrder(ord.id, {
                ...ord,
                status: newStatus,
                courierStatus: liveStatus,
                trackingId: cleanTrackingId,
                trackingCode: cleanTrackingId,
                pathaoConsignmentId: resolvedCourier !== 'Steadfast' ? cleanTrackingId : ord.pathaoConsignmentId,
                steadfastConsignmentId: resolvedCourier === 'Steadfast' ? cleanTrackingId : (ord as any).steadfastConsignmentId,
                courier: resolvedCourier,
                courierCharge: courierFee,
                courierPayoutAmount: payout,
                ...(newStatus === 'Delivered' ? { deliveredAt: Date.now() } : {})
              });
            } catch (saveErr) {
              console.warn('[PathaoSyncModal] Save error for order:', ord.id, saveErr);
            }
          }

          const itemResult: SyncItemResult = {
            orderId: ord.id,
            invoiceNo: ord.invoiceNo,
            customerName: ord.customerName || 'Customer',
            phone: ord.phone || '',
            consignmentId: cleanTrackingId,
            courier: resolvedCourier,
            oldStatus,
            newStatus,
            courierStatus: liveStatus,
            oldCourierStatus,
            isStatusChanged,
            isDelivered,
            isReturned,
            deliveryFee: courierFee,
            payoutAmount: payout,
            success: true,
            timestamp: Date.now()
          };

          setResults(prev => [itemResult, ...prev]);
        } else {
          // Failed response
          const itemResult: SyncItemResult = {
            orderId: ord.id,
            invoiceNo: ord.invoiceNo,
            customerName: ord.customerName || 'Customer',
            phone: ord.phone || '',
            consignmentId: cleanTrackingId,
            courier: isSteadfast ? 'Steadfast' : 'Pathao',
            oldStatus,
            newStatus: oldStatus,
            courierStatus: oldCourierStatus || 'Not Found',
            oldCourierStatus,
            isStatusChanged: false,
            isDelivered: false,
            isReturned: false,
            success: false,
            error: data?.error || 'Courier API did not return status',
            timestamp: Date.now()
          };

          setResults(prev => [itemResult, ...prev]);
        }
      } catch (err: any) {
        const itemResult: SyncItemResult = {
          orderId: ord.id,
          invoiceNo: ord.invoiceNo,
          customerName: ord.customerName || 'Customer',
          phone: ord.phone || '',
          consignmentId: cleanTrackingId,
          courier: isSteadfast ? 'Steadfast' : 'Pathao',
          oldStatus,
          newStatus: oldStatus,
          courierStatus: oldCourierStatus || 'Error',
          oldCourierStatus,
          isStatusChanged: false,
          isDelivered: false,
          isReturned: false,
          success: false,
          error: err?.message || 'Network error',
          timestamp: Date.now()
        };

        setResults(prev => [itemResult, ...prev]);
      }

      // Small pacing delay to avoid aggressive rate-limits
      await new Promise(r => setTimeout(r, 200));
    }

    setIsRunning(false);
    setIsPaused(false);
    setCurrentOrderName('');

    if (!isCancelledRef.current) {
      toast.success(`সিঙ্ক সম্পন্ন! ${targetOrders.length}টি অর্ডারের লাইভ ট্র্যাকিং আপডেট সফলভাবে ডাটাবেজে যুক্ত হয়েছে।`);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startSync();
    } else {
      isCancelledRef.current = true;
      setIsRunning(false);
      setIsPaused(false);
    }
  }, [isOpen]);

  // Auto-scroll when new items arrive
  useEffect(() => {
    if (autoScroll && resultsContainerRef.current) {
      resultsContainerRef.current.scrollTop = 0;
    }
  }, [results, autoScroll]);

  if (!isOpen) return null;

  // Filtered results
  const filteredResults = results.filter(item => {
    if (activeFilter === 'changed' && !item.isStatusChanged) return false;
    if (activeFilter === 'delivered' && !item.isDelivered) return false;
    if (activeFilter === 'intransit' && (item.isDelivered || item.isReturned || !item.success)) return false;
    if (activeFilter === 'returned' && !item.isReturned) return false;
    if (activeFilter === 'failed' && item.success) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = item.customerName.toLowerCase().includes(q);
      const matchPhone = item.phone.toLowerCase().includes(q);
      const matchInvoice = String(item.invoiceNo || '').includes(q);
      const matchConsignment = item.consignmentId.toLowerCase().includes(q);
      const matchCourierStatus = item.courierStatus.toLowerCase().includes(q);
      return matchName || matchPhone || matchInvoice || matchConsignment || matchCourierStatus;
    }
    return true;
  });

  // Metric counts
  const deliveredCount = results.filter(r => r.isDelivered).length;
  const returnedCount = results.filter(r => r.isReturned).length;
  const inTransitCount = results.filter(r => r.success && !r.isDelivered && !r.isReturned).length;
  const changedCount = results.filter(r => r.isStatusChanged).length;
  const failedCount = results.filter(r => !r.success).length;

  const progressPercent = totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0;

  const getStatusBadge = (statusStr: string, isDelivered: boolean, isReturned: boolean) => {
    const s = (statusStr || '').replace(/_/g, ' ').toUpperCase();
    if (isDelivered) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: PackageCheck,
        label: s || 'DELIVERED'
      };
    }
    if (isReturned) {
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertCircle,
        label: s || 'RETURNED'
      };
    }
    const lower = (statusStr || '').toLowerCase();
    if (lower.includes('transit') || lower.includes('way') || lower.includes('hub') || lower.includes('sort') || lower.includes('ship')) {
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Send,
        label: s || 'IN TRANSIT'
      };
    }
    if (lower.includes('pickup') || lower.includes('assign') || lower.includes('wait') || lower.includes('pending') || lower.includes('hold')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
        label: s || 'PENDING'
      };
    }
    return {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Truck,
      label: s || 'COURIER'
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-emerald-50/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
              <RefreshCw size={20} className={isRunning && !isPaused ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Pathao & Courier Real-Time Sync
                </h3>
                {isRunning ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                    Live Syncing...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    <ShieldCheck size={11} className="text-emerald-600" />
                    Synced with Supabase
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                সবগুলো পার্সেলের রিয়েল-টাইম কুরিয়ার ট্র্যাকিং স্ট্যাটাস লাইভ ফেচ এবং ডাটাবেজে আপডেট হচ্ছে
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              isCancelledRef.current = true;
              setIsRunning(false);
              onClose();
            }}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Progress Bar Section */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="text-slate-500 font-medium">Progress:</span>
              <span className="font-mono text-emerald-600">{currentIndex}</span>
              <span className="text-slate-400">/</span>
              <span className="font-mono text-slate-700">{totalCount} orders</span>
              {currentOrderName && (
                <span className="hidden sm:inline-block text-[11px] text-slate-500 truncate max-w-[280px]">
                  • Checking <span className="text-slate-800 font-semibold">{currentOrderName}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono font-black text-slate-900">{progressPercent}%</span>
              {isRunning && (
                <button
                  onClick={() => {
                    const next = !isPaused;
                    setIsPaused(next);
                    isPausedRef.current = next;
                  }}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                >
                  {isPaused ? <Play size={10} className="fill-current text-emerald-600" /> : <Pause size={10} className="fill-current text-amber-600" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress track */}
          <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div 
              className="h-full bg-linear-to-r from-emerald-500 via-teal-500 to-indigo-500 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Counter Summary Pills */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2 bg-white shrink-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              activeFilter === 'all' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Parcels ({results.length})
          </button>

          <button
            onClick={() => setActiveFilter('changed')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              activeFilter === 'changed' 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            Status Updated ({changedCount})
          </button>

          <button
            onClick={() => setActiveFilter('delivered')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              activeFilter === 'delivered' 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Delivered / Success ({deliveredCount})
          </button>

          <button
            onClick={() => setActiveFilter('intransit')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              activeFilter === 'intransit' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            In Transit ({inTransitCount})
          </button>

          <button
            onClick={() => setActiveFilter('returned')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              activeFilter === 'returned' 
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            Returned ({returnedCount})
          </button>

          {failedCount > 0 && (
            <button
              onClick={() => setActiveFilter('failed')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                activeFilter === 'failed' 
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
            >
              Failed / Missing ({failedCount})
            </button>
          )}

          {/* Quick Search */}
          <div className="ml-auto relative min-w-[180px] max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input 
              type="text"
              placeholder="Search result..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 text-xs rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Real-Time Live Stream List */}
        <div 
          ref={resultsContainerRef}
          className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-50/50 min-h-[260px] max-h-[480px]"
        >
          {results.length === 0 && isRunning && (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <RefreshCw size={28} className="animate-spin text-emerald-500 mb-3" />
              <p className="text-sm font-bold text-slate-700">Connecting to Pathao Courier Servers...</p>
              <p className="text-xs text-slate-400 mt-1">Fetching live consignment status in real time...</p>
            </div>
          )}

          {filteredResults.map((item, idx) => {
            const badge = getStatusBadge(item.courierStatus, item.isDelivered, item.isReturned);
            const BadgeIcon = badge.icon;

            return (
              <div 
                key={`${item.orderId}-${idx}`}
                className={`p-3.5 rounded-xl border transition-all duration-200 shadow-2xs ${
                  item.isDelivered 
                    ? 'bg-emerald-50/60 border-emerald-200' 
                    : item.isReturned
                    ? 'bg-rose-50/60 border-rose-200'
                    : item.isStatusChanged
                    ? 'bg-indigo-50/60 border-indigo-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Left Column: Order ID & Customer */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-mono font-black text-xs shrink-0">
                      #{item.invoiceNo || String(item.orderId).slice(-4)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">{item.customerName}</span>
                        <span className="text-[11px] font-mono font-bold text-slate-500">{item.phone}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200">
                          {item.courier}: {item.consignmentId}
                        </span>
                      </div>
                      
                      {/* Status Transition Display */}
                      <div className="flex items-center gap-1.5 text-xs mt-1">
                        <span className="text-slate-500 font-medium">Order Status:</span>
                        <span className="font-bold text-slate-600">{item.oldStatus}</span>
                        {item.newStatus !== item.oldStatus ? (
                          <>
                            <ArrowRight size={12} className="text-indigo-600 shrink-0" />
                            <span className={`font-black px-1.5 py-0.5 rounded text-[11px] ${
                              item.isDelivered 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : item.isReturned
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {item.newStatus}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px]">(Unchanged)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Courier Status Pill */}
                  <div className="flex items-center gap-2 sm:self-center shrink-0">
                    {item.success ? (
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-xs shadow-2xs whitespace-nowrap ${badge.bg}`}>
                        <BadgeIcon size={13} className="stroke-[2.5]" />
                        <span className="tracking-wide uppercase">{badge.label}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-xs">
                        <AlertCircle size={13} />
                        <span>{item.error || 'Tracking Failed'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredResults.length === 0 && results.length > 0 && (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs font-bold text-slate-500">এই ফিল্টারে কোনো ফলাফল পাওয়া যায়নি।</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {isRunning ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <RefreshCw size={12} className="animate-spin" />
                রিয়েল-টাইম সিঙ্ক চলমান... অনুকম্পা করে অপেক্ষা করুন।
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                <Check size={14} className="text-emerald-600 stroke-[3]" />
                সর্বমোট {results.length} টি পার্সেল সফলভাবে যাচাই ও আপডেট সম্পন্ন হয়েছে।
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isRunning && (
              <button
                onClick={startSync}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Re-Sync All</span>
              </button>
            )}

            <button
              onClick={() => {
                isCancelledRef.current = true;
                setIsRunning(false);
                onClose();
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold tracking-wide uppercase shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>{isRunning ? 'Stop & Close' : 'Done & View Orders'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
