/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Order } from '../../types';
import { isDeliveredOrSuccess } from '../../utils/orderUtils';
import { 
  BarChart3, 
  Table as TableIcon, 
  Search, 
  HelpCircle,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid 
} from 'recharts';

interface OrderFulfillmentTrackerProps {
  orders: Order[];
}

type PeriodType = '7D' | '15D' | '30D' | 'MONTH';
type ViewMode = 'chart' | 'table';

export default function OrderFulfillmentTracker({ orders = [] }: OrderFulfillmentTrackerProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [period, setPeriod] = useState<PeriodType>('7D');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customRangeActive, setCustomRangeActive] = useState<boolean>(false);

  // Helper to parse order date into a JS Date
  const parseOrderDate = (order: Order): Date | null => {
    if (!order) return null;
    if (order.createdAt) {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    // Fallback parsing for format like '08/12/2026' or '2026-08-12'
    if (order.date) {
      const d = new Date(order.date);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  // Filter orders based on period or custom date range
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    if (customRangeActive && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      return orders.filter(o => {
        const d = parseOrderDate(o);
        return d && d >= start && d <= end;
      });
    }

    // Preset time ranges
    let cutoff = new Date();
    if (period === '7D') {
      cutoff.setDate(now.getDate() - 6);
      cutoff.setHours(0, 0, 0, 0);
    } else if (period === '15D') {
      cutoff.setDate(now.getDate() - 14);
      cutoff.setHours(0, 0, 0, 0);
    } else if (period === '30D') {
      cutoff.setDate(now.getDate() - 29);
      cutoff.setHours(0, 0, 0, 0);
    } else if (period === 'MONTH') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    return orders.filter(o => {
      const d = parseOrderDate(o);
      return d && d >= cutoff && d <= now;
    });
  }, [orders, period, startDate, endDate, customRangeActive]);

  // Overall metric totals
  const metrics = useMemo(() => {
    const totalTaken = filteredOrders.length;
    let deliveredCount = 0;
    let inProcessCount = 0;
    let notDeliveredCount = 0;

    filteredOrders.forEach(o => {
      const st = (o.status || '').toLowerCase().trim();
      if (isDeliveredOrSuccess(st)) {
        deliveredCount++;
      } else if (
        st === 'cancelled' || 
        st === 'hold' || 
        st === 'returned' || 
        st === 'pick up cancel' ||
        st.includes('cancel') ||
        st.includes('return')
      ) {
        notDeliveredCount++;
      } else {
        inProcessCount++;
      }
    });

    const deliveredRate = totalTaken > 0 ? ((deliveredCount / totalTaken) * 100).toFixed(1) : '0.0';
    const inProcessRate = totalTaken > 0 ? ((inProcessCount / totalTaken) * 100).toFixed(1) : '0.0';
    const notDeliveredRate = totalTaken > 0 ? ((notDeliveredCount / totalTaken) * 100).toFixed(1) : '0.0';

    return {
      totalTaken,
      deliveredCount,
      deliveredRate,
      inProcessCount,
      inProcessRate,
      notDeliveredCount,
      notDeliveredRate
    };
  }, [filteredOrders]);

  // Chart data grouped by day
  const chartData = useMemo(() => {
    const map = new Map<string, {
      rawDate: Date;
      dateLabel: string;
      fullDateLabel: string;
      taken: number;
      delivered: number;
      inProcess: number;
      notDelivered: number;
    }>();

    // Determine total days to plot
    let daysCount = 7;
    if (customRangeActive && startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    } else {
      if (period === '7D') daysCount = 7;
      if (period === '15D') daysCount = 15;
      if (period === '30D') daysCount = 30;
      if (period === 'MONTH') {
        const now = new Date();
        daysCount = now.getDate(); // Days so far in this month
      }
    }

    // Pre-populate date slots so chart axis is continuous
    const endDateObj = (customRangeActive && endDate) ? new Date(endDate) : new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(endDateObj);
      d.setDate(endDateObj.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateLabel = `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
      const fullDateLabel = `${monthNames[d.getMonth()].toUpperCase()} ${String(d.getDate()).padStart(2, '0')}`;

      map.set(key, {
        rawDate: d,
        dateLabel,
        fullDateLabel,
        taken: 0,
        delivered: 0,
        inProcess: 0,
        notDelivered: 0
      });
    }

    // Populate actual order data
    filteredOrders.forEach(o => {
      const d = parseOrderDate(o);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let slot = map.get(key);
        if (!slot) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          slot = {
            rawDate: d,
            dateLabel: `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`,
            fullDateLabel: `${monthNames[d.getMonth()].toUpperCase()} ${String(d.getDate()).padStart(2, '0')}`,
            taken: 0,
            delivered: 0,
            inProcess: 0,
            notDelivered: 0
          };
          map.set(key, slot);
        }

        slot.taken += 1;
        const st = (o.status || '').toLowerCase().trim();
        if (isDeliveredOrSuccess(st)) {
          slot.delivered += 1;
        } else if (
          st === 'cancelled' || 
          st === 'hold' || 
          st === 'returned' || 
          st === 'pick up cancel' ||
          st.includes('cancel') ||
          st.includes('return')
        ) {
          slot.notDelivered += 1;
        } else {
          slot.inProcess += 1;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [filteredOrders, period, startDate, endDate, customRangeActive]);

  // Handle custom search trigger
  const handleApplyCustomDate = () => {
    if (startDate && endDate) {
      setCustomRangeActive(true);
    }
  };

  // Custom Dark Tooltip matching reference image
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const successRate = data.taken > 0 ? ((data.delivered / data.taken) * 100).toFixed(1) : '0.0';

      return (
        <div className="bg-[#1E293B] text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 min-w-[200px] z-50">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-3">
            <span className="text-xs font-black tracking-wider uppercase text-slate-200">
              {data.fullDateLabel}
            </span>
            <span className="text-[10px] font-extrabold bg-[#059669]/90 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-500/40">
              {successRate}% Success
            </span>
          </div>

          <div className="space-y-2 text-xs font-bold">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
                Taken
              </span>
              <span className="font-black text-white">{data.taken}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                Delivered
              </span>
              <span className="font-black text-white">{data.delivered}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                In Process
              </span>
              <span className="font-black text-white">{data.inProcess}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                Not Delivered
              </span>
              <span className="font-black text-white">{data.notDelivered}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#E6ECF4] border border-white/90 rounded-[28px] p-5 md:p-6 shadow-[-6px_-6px_16px_rgba(255,255,255,0.95),6px_6px_18px_rgba(165,180,205,0.35)] transition-all">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-white/80">
        
        {/* Title Block */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#E2E8F2] border border-white/90 flex items-center justify-center shrink-0 shadow-[inset_2px_2px_4px_rgba(160,175,200,0.25),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]">
            <BarChart3 className="w-5 h-5 text-[#4F46E5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-800 tracking-tight">
                Order Fulfillment Tracker
              </h2>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-widest">
                FULFILLMENT PIPELINE COMPOSITION
              </p>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
            </div>
          </div>
        </div>

        {/* Top Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* View Mode Toggle Button Group */}
          <div className="bg-[#DCE3EE] p-1 rounded-2xl flex items-center border border-white/80 shadow-[inset_2px_2px_4px_rgba(160,175,200,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]">
            <button
              onClick={() => setViewMode('chart')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'chart'
                  ? 'bg-[#E6ECF4] text-[#4F46E5] shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.35)] border border-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Chart View"
            >
              <BarChart3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#E6ECF4] text-[#4F46E5] shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.35)] border border-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <TableIcon size={16} />
            </button>
          </div>

          {/* Period Preset Pills */}
          <div className="bg-[#DCE3EE] p-1 rounded-2xl flex items-center border border-white/80 shadow-[inset_2px_2px_4px_rgba(160,175,200,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]">
            {(['7D', '15D', '30D', 'MONTH'] as PeriodType[]).map(p => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setCustomRangeActive(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer ${
                  period === p && !customRangeActive
                    ? 'bg-[#6366F1] text-white shadow-[0_2px_8px_rgba(99,102,241,0.35)]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          <div className="bg-[#E2E8F2] border border-white/80 rounded-2xl px-3 py-1.5 flex items-center gap-2 shadow-[inset_2px_2px_4px_rgba(160,175,200,0.25),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]">
            <Calendar size={14} className="text-slate-500 shrink-0" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none w-28 cursor-pointer"
            />
            <span className="text-slate-400 font-black">—</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none w-28 cursor-pointer"
            />
            <button 
              onClick={handleApplyCustomDate}
              className="w-7 h-7 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
              title="Filter by Date"
            >
              <Search size={13} />
            </button>
          </div>

        </div>

      </div>

      {/* 2. STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        
        {/* CARD 1: TOTAL ORDERS TAKEN */}
        <div className="bg-[#E2E8F2] border border-white/90 rounded-2xl p-4 flex flex-col justify-between shadow-[inset_2px_2px_5px_rgba(160,175,200,0.25),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
              TOTAL ORDERS TAKEN
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {metrics.totalTaken}
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-300/50 flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
            <TrendingUp size={12} />
            <span>100% OF PIPELINE</span>
          </div>
        </div>

        {/* CARD 2: DELIVERED RATE */}
        <div className="bg-[#E2E8F2] border border-white/90 rounded-2xl p-4 flex flex-col justify-between shadow-[inset_2px_2px_5px_rgba(160,175,200,0.25),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
              DELIVERED RATE
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {metrics.deliveredCount}
              </span>
              <span className="text-sm font-black text-emerald-600">
                ({metrics.deliveredRate}%)
              </span>
            </div>
            {/* Green Progress Bar */}
            <div className="w-full bg-slate-300/60 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Number(metrics.deliveredRate))}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-300/50 flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
            <CheckCircle2 size={12} />
            <span>FULFILLMENT SUCCESS</span>
          </div>
        </div>

        {/* CARD 3: ACTIVE PROCESSING */}
        <div className="bg-[#E2E8F2] border border-white/90 rounded-2xl p-4 flex flex-col justify-between shadow-[inset_2px_2px_5px_rgba(160,175,200,0.25),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
              ACTIVE PROCESSING
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {metrics.inProcessCount}
              </span>
              <span className="text-sm font-black text-amber-600">
                ({metrics.inProcessRate}%)
              </span>
            </div>
            {/* Yellow Progress Bar */}
            <div className="w-full bg-slate-300/60 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-[#F59E0B] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Number(metrics.inProcessRate))}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-300/50 flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase tracking-widest">
            <Clock size={12} />
            <span>IN TRANSIT / PREPARING</span>
          </div>
        </div>

        {/* CARD 4: UNRESOLVED / CANCELLED */}
        <div className="bg-[#E2E8F2] border border-white/90 rounded-2xl p-4 flex flex-col justify-between shadow-[inset_2px_2px_5px_rgba(160,175,200,0.25),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
              UNRESOLVED / CANCELLED
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {metrics.notDeliveredCount}
              </span>
              <span className="text-sm font-black text-rose-600">
                ({metrics.notDeliveredRate}%)
              </span>
            </div>
            {/* Red Progress Bar */}
            <div className="w-full bg-slate-300/60 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-[#EF4444] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Number(metrics.notDeliveredRate))}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-300/50 flex items-center gap-1 text-[10px] font-black text-rose-600 uppercase tracking-widest">
            <XCircle size={12} />
            <span>CANCELLED / RETURNED / HOLD</span>
          </div>
        </div>

      </div>

      {/* 3. CHART / TABLE SECTION */}
      <div className="pt-2">
        
        {/* Color Legend Row */}
        <div className="flex flex-wrap items-center justify-end gap-5 mb-4 text-[11px] font-black uppercase tracking-wider text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <span>DELIVERED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <span>IN PROCESS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            <span>NOT DELIVERED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
            <span>TAKEN</span>
          </div>
        </div>

        {/* Dynamic Display (Chart or Table) */}
        {viewMode === 'chart' ? (
          <div className="h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,210,225,0.4)" />
                <XAxis 
                  dataKey="dateLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: '700' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: '700' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="taken" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={12} />
                <Bar dataKey="delivered" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={12} />
                <Bar dataKey="inProcess" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={12} />
                <Bar dataKey="notDelivered" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto rounded-2xl border border-white/90 bg-[#E2E8F2] shadow-[inset_2px_2px_5px_rgba(160,175,200,0.25)]">
            <table className="w-full text-left border-collapse text-xs font-bold">
              <thead>
                <tr className="border-b border-white/80 bg-[#DCE3EE] text-[10px] font-black uppercase text-slate-600 tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Orders Taken</th>
                  <th className="py-3 px-4 text-center">Delivered</th>
                  <th className="py-3 px-4 text-center">In Process</th>
                  <th className="py-3 px-4 text-center">Not Delivered</th>
                  <th className="py-3 px-4 text-center">Success Rate %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60">
                {chartData.map((row, idx) => {
                  const rate = row.taken > 0 ? ((row.delivered / row.taken) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={idx} className="hover:bg-[#D8E0ED] transition-colors">
                      <td className="py-3 px-4 font-black text-slate-900">{row.fullDateLabel}</td>
                      <td className="py-3 px-4 text-center font-black text-[#6366F1]">{row.taken}</td>
                      <td className="py-3 px-4 text-center font-black text-[#10B981]">{row.delivered}</td>
                      <td className="py-3 px-4 text-center font-black text-[#F59E0B]">{row.inProcess}</td>
                      <td className="py-3 px-4 text-center font-black text-[#EF4444]">{row.notDelivered}</td>
                      <td className="py-3 px-4 text-center font-black text-slate-800">
                        <span className="bg-[#10B981]/15 text-[#047857] px-2.5 py-1 rounded-full text-[11px]">
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
