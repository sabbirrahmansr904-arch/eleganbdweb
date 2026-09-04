import React, { useState, useEffect } from 'react';
import { Truck, PackageCheck, Clock, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { Order } from '../../types';
import { useOrders } from '../../contexts/OrderContext';
import { isDeliveredOrSuccess } from '../../utils/orderUtils';
import toast from 'react-hot-toast';
import { trackCourierOrder } from '../../utils/apiClient';

interface ParcelLiveStatusBadgeProps {
  order: Order;
  showDetails?: boolean;
}

export const ParcelLiveStatusBadge: React.FC<ParcelLiveStatusBadgeProps> = ({ order, showDetails = false }) => {
  const { updateOrder, updateOrderStatus } = useOrders();
  const rawTrackingId = (order as any).pathaoConsignmentId || (order as any).trackingCode || order.trackingId || (order as any).steadfastConsignmentId;
  const cleanTrackingId = String(rawTrackingId || '').replace(/^#/, '').trim();
  const isSteadfastInitial = Boolean((order as any).steadfastConsignmentId) || (order.courier || '').toLowerCase().includes('steadfast');
  const [courierName, setCourierName] = useState<string>(isSteadfastInitial ? 'SF' : 'Pathao');
  const [status, setStatus] = useState<string | null>((order as any).courierStatus || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const fetchLiveStatus = async () => {
    if (!cleanTrackingId) return;
    setLoading(true);
    setError(false);
    try {
      const { ok, data } = await trackCourierOrder(cleanTrackingId, order.courier || (isSteadfastInitial ? 'steadfast' : 'pathao'));
      if (ok && data.success && data.status) {
        setStatus(data.status);
        const resolvedCourier = data.courier === 'Steadfast' ? 'SF' : 'Pathao';
        setCourierName(resolvedCourier);
        const lower = (data.status || '').toLowerCase();

        // Save live courierStatus to Firestore order record
        if (updateOrder) {
          try {
            await updateOrder(order.id, {
              ...order,
              courierStatus: data.status,
              courier: data.courier || order.courier || 'Pathao',
              ...(data.delivery_fee ? { courierCharge: data.delivery_fee } : {})
            });
          } catch (e) {
            console.warn("Could not sync courier status into order:", e);
          }
        }

        // Check if status is a return / cancel first so it never triggers delivery success
        const isReturnOrCancel = lower.includes('return') || lower.includes('cancel') || lower === 'partial_delivery_return';

        if (isReturnOrCancel) {
          if (order.status !== 'Returned' && order.status !== 'Cancelled') {
            try {
              if (updateOrder) {
                await updateOrder(order.id, {
                  ...order,
                  status: 'Returned',
                  courierStatus: data.status
                });
              } else if (updateOrderStatus) {
                await updateOrderStatus(order.id, 'Returned');
              }
              const shortId = order.invoiceNo || order.id.slice(-6);
              toast.success(`অর্ডার #${shortId} রিটার্ন হওয়ায় স্ট্যাটাস Returned করা হয়েছে!`);
            } catch (err) {
              console.warn("Could not auto-update returned status:", err);
            }
          }
        } else if (lower.includes('deliver') || lower.includes('success') || lower === 'delivery_complete' || lower === 'delivered') {
          // Only if strictly delivered and NOT return/cancel
          if (!isDeliveredOrSuccess(order.status)) {
            try {
              if (updateOrder) {
                await updateOrder(order.id, {
                  ...order,
                  status: 'Delivered',
                  courierStatus: data.status,
                  deliveredAt: Date.now()
                });
              } else if (updateOrderStatus) {
                await updateOrderStatus(order.id, 'Delivered');
              }
              const shortId = order.invoiceNo || order.id.slice(-6);
              toast.success(`অর্ডার #${shortId} পার্সেল ডেলিভার্ড হওয়ায় স্ট্যাটাস অটো SUCCESS করা হয়েছে!`);
            } catch (err) {
              console.warn("Could not auto-update delivered order status:", err);
            }
          }
        } else {
          // For any other active/in-progress courier status
          if (!isDeliveredOrSuccess(order.status) && order.status !== 'Returned' && order.status !== 'Cancelled' && order.status !== 'Shipped') {
            try {
              if (updateOrder) {
                await updateOrder(order.id, {
                  ...order,
                  status: 'Shipped',
                  courierStatus: data.status
                });
              }
            } catch (err) {
              console.warn("Could not auto-update shipped status:", err);
            }
          }
        }
      } else {
        setError(true);
      }
    } catch (err: any) {
      console.error("Error fetching live parcel status:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cleanTrackingId && !status) {
      fetchLiveStatus();
    }
  }, [cleanTrackingId]);

  if (!cleanTrackingId) {
    return null;
  }

  const cleanLabel = (s: string) => {
    if (!s) return '';
    return s.replace(/_/g, ' ').replace(/-/g, ' ').trim();
  };

  const getStatusColor = (s: string) => {
    const lower = s.toLowerCase();
    const label = cleanLabel(s);
    if (lower.includes('return') || lower.includes('cancel')) {
      return { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle, label };
    }
    if (lower.includes('deliver') || lower.includes('success')) {
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: PackageCheck, label };
    }
    if (lower.includes('pickup') || lower.includes('waiting') || lower.includes('assign') || lower.includes('hold')) {
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label };
    }
    if (lower.includes('transit') || lower.includes('way') || lower.includes('hub') || lower.includes('sort') || lower.includes('pending') || lower.includes('ship')) {
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Send, label };
    }
    return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Truck, label };
  };

  const statusInfo = status ? getStatusColor(status) : null;
  const Icon = statusInfo ? statusInfo.icon : Truck;

  return (
    <div className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap" title={`Consignment ID: ${cleanTrackingId}`}>
      {loading ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-full bg-slate-100 text-slate-500 border border-slate-200 animate-pulse whitespace-nowrap shrink-0">
          <RefreshCw size={10} className="animate-spin text-indigo-600 shrink-0" />
          <span className="uppercase tracking-wider whitespace-nowrap">{courierName} Live...</span>
        </span>
      ) : statusInfo ? (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-full border shadow-2xs transition-all whitespace-nowrap shrink-0 ${statusInfo.bg}`}>
          <Icon size={11} className="stroke-[2.5] shrink-0" />
          <span className="uppercase tracking-wider whitespace-nowrap">
            {courierName}: {statusInfo.label}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); fetchLiveStatus(); }}
            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
            title="Refresh Live Status"
          >
            <RefreshCw size={9} />
          </button>
        </span>
      ) : (
        <button 
          onClick={(e) => { e.stopPropagation(); fetchLiveStatus(); }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] font-bold rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer shadow-3xs whitespace-nowrap shrink-0 transition-colors"
          title={`Click to fetch live ${courierName} status`}
        >
          <Truck size={10} className="text-slate-400 shrink-0" />
          <span className="whitespace-nowrap font-mono">{courierName}: #{cleanTrackingId.slice(-6)}</span>
          <RefreshCw size={9} className={`text-slate-400 shrink-0 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
      {showDetails && cleanTrackingId && (
        <span className="text-[10px] text-slate-400 font-mono font-bold whitespace-nowrap shrink-0">
          #{cleanTrackingId}
        </span>
      )}
    </div>
  );
};
