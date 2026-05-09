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
      case 'Delivered': return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case 'Processing': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case 'Pending': return "bg-brand-gold/10 text-brand-gold border-brand-gold/20";
      case 'Shipped': return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case 'Cancelled': return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default: return "bg-white/5 text-gray-400 border-white/10";
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-black text-white rounded-2xl shadow-lg">
            <Package size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Orders</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Detailed spreadsheet-style order tracking and management.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => toast.success('Exporting orders to Excel...')}
            className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
          <button 
            onClick={handleSyncPathao}
            className="flex items-center gap-2 px-6 py-4 bg-white text-black border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm"
          >
            <RefreshCw size={14} className="text-brand-gold" />
            Sync Courier
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
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-emerald-400 text-xs font-bold">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="uppercase tracking-[0.1em]">Courier Sync Complete — 0 of 1 order updated</span>
              </div>
              <button 
                onClick={() => setShowSyncSuccess(false)}
                className="p-1 hover:bg-white/5 rounded-lg transition-colors text-emerald-400"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Search */}
      <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-gold transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search Order #, Phone, Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-gold text-black transition-all text-sm font-medium"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="relative">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none pl-6 pr-12 py-5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black focus:outline-none focus:border-brand-gold transition-all cursor-pointer min-w-[160px]"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
             </div>

             <div className="flex items-center gap-3 px-6 py-5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">
                <Calendar size={16} className="text-brand-gold" />
                <span>Date Range Selector</span>
             </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-12 px-6 py-6 border-b border-gray-100">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-200 bg-transparent text-black focus:ring-black" />
                </th>
                <th className="w-32 px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Date</th>
                <th className="w-40 px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Order Identity</th>
                <th className="w-40 px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Channel</th>
                <th className="w-44 px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Operation Status</th>
                <th className="w-44 px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 text-center">Logistic Feedback</th>
                <th className="w-44 px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Logistics</th>
                <th className="w-48 px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Customer Details</th>
                <th className="w-40 px-6 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-32 text-center text-black">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-5 bg-gray-50 text-gray-300 rounded-full border border-gray-100">
                        <Package size={48} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic leading-none">No records detected</p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter mt-2">Modify your query parameters</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer group font-sans" onClick={() => setSelectedOrder(order)}>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-200 bg-transparent text-black focus:ring-black" />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-bold text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-black text-black uppercase italic tracking-tighter group-hover:text-brand-gold transition-colors">{order.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase italic">Digital Manifest</p>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative group/status w-full">
                      <select 
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                        className={cn(
                          "w-full px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all appearance-none cursor-pointer pr-8 bg-transparent",
                          getStatusColor(order.status).replace('bg-white/5', 'bg-gray-50')
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
                         Manifest Void
                       </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-200 italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:border-brand-gold transition-all">
                           <Truck size={10} className="text-brand-gold" />
                        </div>
                        <span className="text-[10px] font-black text-black uppercase tracking-tighter">Express Logistic</span>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-black text-black uppercase tracking-tight truncate">{order.customerName}</p>
                  </td>
                  <td className="px-6 py-4 text-black">
                    <p className="text-[11px] font-bold font-mono tracking-tighter">{order.phone}</p>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              className="bg-white border-l border-gray-100 w-full max-w-2xl h-full absolute right-0 shadow-2xl flex flex-col text-black"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-black text-white rounded-xl shadow-lg">
                    <Package size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-black uppercase italic tracking-tighter">Order Specification</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Matrix Ref: #{selectedOrder.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black"
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
                          isCurrent ? "bg-black border-black text-white shadow-lg scale-110" :
                          isPassed ? "bg-emerald-50 border-emerald-500 text-emerald-600" :
                          "bg-gray-50 border-gray-100 text-gray-300"
                        )}>
                          {isPassed ? <CheckCircle2 size={18} /> : <span className="text-xs font-black">{i + 1}</span>}
                        </div>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          isCurrent ? "text-black" : "text-gray-400"
                        )}>{s}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Info Sections */}
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] block border-b border-gray-100 pb-2 italic">Client Context</label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-black border border-gray-100">
                          <User size={14} />
                        </div>
                        <span className="text-sm font-black text-black uppercase tracking-tight">{selectedOrder.customerName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                          <Mail size={14} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500">{selectedOrder.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                          <Phone size={14} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 font-mono tracking-tighter">{selectedOrder.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] block border-b border-gray-100 pb-2 italic">Logistic Hub</label>
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex gap-4">
                        <Truck size={16} className="text-brand-gold mt-1 shrink-0" />
                        <p className="text-xs font-bold text-gray-500 leading-relaxed uppercase tracking-tight italic">
                          {selectedOrder.address}<br />
                          {selectedOrder.city}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] block border-b border-gray-100 pb-2 italic">Order Items</label>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-black transition-all items-center group shadow-sm">
                        <div className="w-20 h-24 overflow-hidden rounded-xl border border-gray-100 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                          <img src={item.images[0]} className="w-full h-full object-cover" alt={item.name} referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-black uppercase tracking-tight">{item.name}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="px-2 py-0.5 bg-black text-white rounded text-[9px] font-black uppercase">Size: {item.selectedSize}</span>
                            <span className="px-2 py-0.5 bg-white text-black border border-gray-100 rounded text-[9px] font-black uppercase">Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-black">{formatPrice(item.price * item.quantity, currency, rate)}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-0.5 font-mono tracking-tighter">{formatPrice(item.price, currency, rate)} / u</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="p-10 bg-gray-50 text-black rounded-[2.5rem] space-y-5 border border-gray-100 relative overflow-hidden group shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-black/10 transition-all duration-1000" />
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    <span>Gross Value</span>
                    <span className="text-black">{formatPrice(selectedOrder.total - selectedOrder.deliveryCharge, currency, rate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    <span>Logistics</span>
                    <span className="text-black">{formatPrice(selectedOrder.deliveryCharge, currency, rate)}</span>
                  </div>
                  <div className="h-px bg-gray-200 my-2" />
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Net Total</span>
                    <div className="text-right">
                       <span className="text-4xl font-black italic tracking-tighter text-black">{formatPrice(selectedOrder.total, currency, rate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
                 <button 
                  onClick={() => handleStatusChange(selectedOrder.id, 'Cancelled')}
                  className="flex-1 py-5 border border-gray-100 bg-white text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <AlertCircle size={14} />
                  Abort Order
                </button>
                <button 
                  onClick={() => handleStatusChange(selectedOrder.id, 'Shipped')}
                  className="flex-1 py-5 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Truck size={14} />
                  Dispatch Package
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
