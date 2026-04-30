import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter,
  MoreHorizontal,
  ChevronRight,
  Clock,
  User,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useInventory } from '../../contexts/InventoryContext';
import { cn } from '../../lib/utils';

export default function AdminInventoryLog() {
  const { transactions, loading } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'in' | 'out'>('all');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.authorizedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || t.type === selectedType;
    return matchesSearch && matchesType;
  });

  const totalIn = transactions
    .filter(t => t.type === 'in')
    .reduce((acc, t) => acc + t.totalQuantity, 0);
  
  const totalOut = transactions
    .filter(t => t.type === 'out')
    .reduce((acc, t) => acc + t.totalQuantity, 0);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-gold/10 text-brand-gold rounded-2xl">
              <History size={24} />
            </div>
            <h1 className="text-3xl font-black text-brand-ink uppercase italic tracking-tighter">Inventory Audit Log</h1>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-14">Track every physical stock movement across your entire store.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-end">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Total Movement In</span>
            <div className="flex items-center gap-2 text-emerald-600">
              <ArrowUpRight size={16} />
              <span className="text-xl font-black">+{totalIn.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col items-end">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1">Total Movement Out</span>
            <div className="flex items-center gap-2 text-rose-600">
              <ArrowDownLeft size={16} />
              <span className="text-xl font-black">-{totalOut.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-gold transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search by product, SKU, user, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-2xl">
              {(['all', 'in', 'out'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedType === type 
                      ? "bg-white text-brand-ink shadow-sm ring-1 ring-slate-100" 
                      : "text-slate-400 hover:text-brand-ink"
                  )}
                >
                  {type === 'all' ? 'All Activity' : type === 'in' ? 'Stock In' : 'Stock Out'}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-2 px-6 py-4 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-tighter text-slate-500 hover:bg-slate-50 transition-colors">
              <Calendar size={16} />
              <span>Date Range</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Product Details</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Movement</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Authorized By</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Reason / Note</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-6 h-20 bg-slate-50/20" />
                  </tr>
                ))
              ) : filteredTransactions.map((t) => (
                <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-700">{new Date(t.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <ChevronRight size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-brand-ink uppercase">{t.productName}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase tracking-tighter">{t.sku}</span>
                          <span className="text-[10px] font-bold text-brand-gold uppercase tracking-tighter">{t.category}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <div className={cn(
                        "flex items-center gap-1.5 font-black text-sm",
                        t.type === 'in' ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {t.type === 'in' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        <span>{t.type === 'in' ? '+' : '-'}{t.totalQuantity} {t.type.toUpperCase()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(t.quantities).map(([size, qty]) => (qty as number) > 0 && (
                          <span key={size} className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">
                            {size}: {qty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-brand-gold border border-slate-200">
                        {t.authorizedBy.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">{t.authorizedBy}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <MessageSquare size={14} className="shrink-0" />
                      <span className="text-[11px] font-bold italic line-clamp-1">{t.notes || 'No reason specified.'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-slate-300 hover:text-brand-ink transition-colors">
                      <MoreHorizontal size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {!loading && filteredTransactions.length === 0 && (
            <div className="py-32 text-center">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-50 text-slate-300 rounded-full">
                  <History size={48} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No audit records found</p>
                  <p className="text-xs text-slate-300">Try adjusting your search or filters</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
