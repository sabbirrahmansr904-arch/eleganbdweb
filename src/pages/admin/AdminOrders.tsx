import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
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
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice, cn } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useOrders } from '../../contexts/OrderContext';
import { Order } from '../../types';
import toast from 'react-hot-toast';

export default function AdminOrders() {
  const { currency, rate } = useCurrency();
  const { orders, updateOrderStatus } = useOrders();
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSyncSuccess, setShowSyncSuccess] = useState(true);

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Delivered': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case 'Processing': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'Pending': return "bg-amber-50 text-amber-600 border-amber-100";
      case 'Shipped': return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case 'Cancelled': return "bg-rose-50 text-rose-500 border-rose-100";
      default: return "bg-slate-50 text-slate-500 border-slate-100";
    }
  };

  const handleStatusChange = (id: string, newStatus: Order['status']) => {
    updateOrderStatus(id, newStatus);
    toast.success(`Order #${id} status updated to ${newStatus}`);
  };

  const handleSyncPathao = () => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: 'Syncing with Pathao...',
         success: 'Sync complete - orders updated',
        error: 'Sync failed',
      }
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-2xl">
            <Package size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-brand-ink uppercase italic tracking-tighter">Orders</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">Detailed spreadsheet-style order tracking and management.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => toast.success('Exporting orders to Excel...')}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
          <button 
            className="flex items-center gap-2 px-5 py-3 bg-cyan-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-800 transition-all shadow-lg shadow-cyan-700/10"
          >
            <Truck size={16} />
            Delivery
          </button>
          <button 
            onClick={handleSyncPathao}
            className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            <RefreshCw size={14} />
            Sync Pathao
          </button>
        </div>
      </div>

      {/* Sync Status Alert */}
      <AnimatePresence>
        {showSyncSuccess && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-emerald-700 text-xs font-bold">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="uppercase tracking-widest">Pathao Sync Complete — 0 of 1 order updated</span>
              </div>
              <button 
                onClick={() => setShowSyncSuccess(false)}
                className="p-1 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-400"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-gold transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search Order #, Phone, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="relative">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none pl-6 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all cursor-pointer min-w-[160px]"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
             </div>

             <div className="relative">
                <button className="flex items-center justify-between gap-4 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 min-w-[180px]">
                  <span>All Partners</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
             </div>

             <div className="flex items-center gap-2 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Calendar size={16} />
                <span>mm/dd/yyyy</span>
                <span className="text-slate-300 mx-1">to</span>
                <span>mm/dd/yyyy</span>
                <Calendar size={16} />
             </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="w-12 px-6 py-5 border-b border-slate-100">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-gold focus:ring-brand-gold" />
                </th>
                <th className="w-32 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Date</th>
                <th className="w-40 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Order No</th>
                <th className="w-40 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Invoice By</th>
                <th className="w-40 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Invoice No</th>
                <th className="w-44 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Status</th>
                <th className="w-44 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">Courier Status</th>
                <th className="w-44 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Delivery Partner</th>
                <th className="w-48 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Name</th>
                <th className="w-40 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Phone</th>
                <th className="w-56 px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-5 bg-slate-50 text-slate-300 rounded-full">
                        <Package size={48} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic leading-none">No orders found</p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter mt-2">Try adjusting your filters or search query</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedOrder(order)}>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-gold focus:ring-brand-gold" />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-bold text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-black text-brand-ink uppercase tracking-tighter">{order.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">Online Store</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{order.id}</p>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative group/status w-full">
                      <select 
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                        className={cn(
                          "w-full px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all appearance-none cursor-pointer pr-8",
                          getStatusColor(order.status)
                        )}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {order.status === 'Cancelled' ? (
                       <span className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-rose-100 shadow-sm">
                         Pickup Cancel
                       </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center">
                           <Truck size={10} className="text-slate-400" />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Pathao</span>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate">{order.customerName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-bold text-slate-600 font-mono tracking-tighter">{order.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-bold text-slate-400 truncate lowercase">{order.email}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-brand-ink/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              className="bg-white w-full max-w-2xl h-full absolute right-0 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-brand-gold text-white rounded-xl">
                    <Package size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-brand-ink uppercase italic tracking-tighter">Order Detail</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Transaction Ref: #{selectedOrder.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
                {/* Status Progress */}
                <div className="grid grid-cols-5 gap-2">
                  {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s, i) => {
                    const isCurrent = selectedOrder.status === s;
                    const isPassed = !isCurrent && i < ['Pending', 'Processing', 'Shipped', 'Delivered'].indexOf(selectedOrder.status as string);
                    return (
                      <div key={s} className="flex flex-col items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                          isCurrent ? "bg-brand-gold border-brand-gold text-white shadow-lg shadow-brand-gold/20 scale-110" :
                          isPassed ? "bg-emerald-50 border-emerald-500 text-emerald-500" :
                          "bg-slate-50 border-slate-100 text-slate-300"
                        )}>
                          {isPassed ? <CheckCircle2 size={18} /> : <span className="text-xs font-black">{i + 1}</span>}
                        </div>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          isCurrent ? "text-brand-ink" : "text-slate-400"
                        )}>{s}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Info Sections */}
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] block border-b border-slate-100 pb-2">Customer Context</label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-brand-gold shadow-sm">
                          <User size={14} />
                        </div>
                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{selectedOrder.customerName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Mail size={14} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">{selectedOrder.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Phone size={14} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 font-mono tracking-tighter">{selectedOrder.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] block border-b border-slate-100 pb-2">Delivery Venue</label>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex gap-4">
                        <Truck size={16} className="text-brand-gold mt-1 shrink-0" />
                        <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                          {selectedOrder.address}<br />
                          {selectedOrder.city}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] block border-b border-slate-100 pb-2">Artifacts Requested</label>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-50 hover:border-slate-200 transition-colors items-center group">
                        <div className="w-20 h-24 overflow-hidden rounded-xl border border-slate-200 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                          <img src={item.images[0]} className="w-full h-full object-cover" alt={item.name} referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-brand-ink uppercase tracking-tight">{item.name}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="px-2 py-0.5 bg-white border border-slate-100 rounded text-[9px] font-black text-brand-gold uppercase">Size: {item.selectedSize}</span>
                            <span className="px-2 py-0.5 bg-brand-ink text-white rounded text-[9px] font-black uppercase">Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-brand-ink">{formatPrice(item.price * item.quantity, currency, rate)}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5 font-mono tracking-tighter">{formatPrice(item.price, currency, rate)} / item</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="p-8 bg-brand-ink rounded-[2rem] text-white space-y-4 shadow-xl shadow-brand-ink/20">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                    <span>Subtotal Artifact Value</span>
                    <span>{formatPrice(selectedOrder.total - selectedOrder.deliveryCharge, currency, rate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                    <span>Logistic Premium (Delivery)</span>
                    <span>{formatPrice(selectedOrder.deliveryCharge, currency, rate)}</span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest">Aggregate Total</span>
                    <div className="text-right">
                       <span className="text-3xl font-black italic tracking-tighter text-brand-gold">{formatPrice(selectedOrder.total, currency, rate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                 <button 
                  onClick={() => handleStatusChange(selectedOrder.id, 'Cancelled')}
                  className="flex-1 py-4 border border-rose-100 bg-white text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                >
                  <AlertCircle size={14} />
                  Terminate Order
                </button>
                <button 
                  onClick={() => handleStatusChange(selectedOrder.id, 'Shipped')}
                  className="flex-1 py-4 bg-brand-ink text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Truck size={14} />
                  Dispatch Artifacts
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
