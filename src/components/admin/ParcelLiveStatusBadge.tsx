import React, { useState, useEffect } from 'react';
import { Truck, RefreshCw, AlertCircle, CheckCircle2, Clock, PackageCheck, Send } from 'lucide-react';
import { Order } from '../../types';

interface ParcelLiveStatusBadgeProps {
  order: Order;
  showDetails?: boolean;
}

export const ParcelLiveStatusBadge: React.FC<ParcelLiveStatusBadgeProps> = ({ order, showDetails = false }) => {
  const trackingId = (order as any).pathaoConsignmentId || (order as any).trackingCode || order.trackingId || (order as any).steadfastConsignmentId;
  const isSteadfast = (order.courier || '').toLowerCase().includes('steadfast');

  const [status, setStatus] = useState<string | null>((order as any).courierStatus || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const fetchLiveStatus = async () => {
    if (!trackingId) return;
    setLoading(true);
    setError(false);

    try {
      const endpoint = isSteadfast ? '/api/steadfast/track-order' : '/api/pathao/track-order';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consignmentId: trackingId, trackingCode: trackingId })
      });

      const data = await res.json();
      if (res.ok && data.success && data.status) {
        setStatus(data.status);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Error fetching live parcel status:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trackingId && !status) {
      fetchLiveStatus();
    }
  }, [trackingId]);

  if (!trackingId) {
    return null;
  }

  // Format Status badge style
  const getStatusColor = (s: string) => {
    const lower = s.toLowerCase();
    if (lower.includes('deliver')) {
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: PackageCheck, label: s };
    }
    if (lower.includes('pickup') || lower.includes('waiting') || lower.includes('assign')) {
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: s };
    }
    if (lower.includes('transit') || lower.includes('way') || lower.includes('hub')) {
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Send, label: s };
    }
    if (lower.includes('return') || lower.includes('cancel')) {
      return { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle, label: s };
    }
    return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Truck, label: s };
  };

  const statusInfo = status ? getStatusColor(status) : null;
  const Icon = statusInfo ? statusInfo.icon : Truck;

  return (
    <div className="inline-flex items-center gap-1.5" title={`Consignment ID: ${trackingId}`}>
      {loading ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-full bg-slate-100 text-slate-500 border border-slate-200 animate-pulse">
          <RefreshCw size={10} className="animate-spin text-indigo-600" />
          <span className="uppercase tracking-wider">{isSteadfast ? 'SF' : 'Pathao'} Live...</span>
        </span>
      ) : statusInfo ? (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-full border shadow-2xs transition-all ${statusInfo.bg}`}>
          <Icon size={11} className="stroke-[2.5]" />
          <span className="uppercase tracking-wider">
            {isSteadfast ? 'SF' : 'Pathao'}: {statusInfo.label}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); fetchLiveStatus(); }}
            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            title="Refresh Live Status"
          >
            <RefreshCw size={9} />
          </button>
        </span>
      ) : error ? (
        <button 
          onClick={(e) => { e.stopPropagation(); fetchLiveStatus(); }}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold rounded-full bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 cursor-pointer"
          title="Click to fetch live Pathao status"
        >
          <Truck size={10} className="text-slate-400" />
          <span>{isSteadfast ? 'SF' : 'Pathao'}: #{String(trackingId).slice(-6)}</span>
          <RefreshCw size={9} className="text-slate-400" />
        </button>
      ) : null}

      {showDetails && trackingId && (
        <span className="text-[10px] text-slate-400 font-mono font-bold">
          #{trackingId}
        </span>
      )}
    </div>
  );
};
