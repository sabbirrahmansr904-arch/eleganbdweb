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
  const { transactions = [], loading } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'in' | 'out'>('all');

  const filteredTransactions = transactions.filter(t => {
    const authorizedBy = t.authorizedBy || 'System';
    const notes = t.notes || '';
    const matchesSearch = 
      t.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      authorizedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || t.type === selectedType;
    return matchesSearch && matchesType;
  });

  const totalIn = transactions
    .filter(t => t.type === 'in')
    .reduce((acc, t) => acc + (t.totalQuantity || 0), 0);
  
  const totalOut = transactions
    .filter(t => t.type === 'out')
    .reduce((acc, t) => acc + (t.totalQuantity || 0), 0);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50 p-8 rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:bg-gray-100/50">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl">
              <History size={24} />
            </div>
            <h1 className="text-3xl font-black text-black italic tracking-tighter uppercase font-sans">Audit Matrix</h1>
          </div>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] ml-1">Comprehensive archival stream of all stock dilatations and extractions.</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-end shadow-sm">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-2 italic">Total Movement In</span>
            <div className="flex items-center gap-3 text-emerald-600">
              <ArrowUpRight size={18} />
              <span className="text-2xl font-black italic">+{totalIn.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-end shadow-sm">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-2 italic">Total Movement Out</span>
            <div className="flex items-center gap-3 text-red-600">
              <ArrowDownLeft size={18} />
              <span className="text-2xl font-black italic">-{totalOut.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search by product, SKU, user, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all text-xs font-black uppercase tracking-widest italic text-black placeholder:text-gray-400"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex p-1.5 bg-gray-50 border border-gray-100 rounded-2xl">
              {(['all', 'in', 'out'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedType === type 
                      ? "bg-blue-600 text-white shadow-lg" 
                      : "text-gray-400 hover:text-blue-600"
                  )}
                >
                  {type === 'all' ? 'All Activity' : type === 'in' ? 'Stock In' : 'Stock Out'}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-3 px-8 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-all shadow-sm">
              <Calendar size={16} />
              <span>Date Range</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100 italic">Timestamp</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">Product Details</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">Movement</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">Authorized By</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">Protocol Note</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-10 h-24 bg-gray-50/50" />
                  </tr>
                ))
              ) : filteredTransactions.map((t) => {
                const authorizedBy = t.authorizedBy || 'System';
                const notes = t.notes || 'No reason specified.';
                return (
                  <tr key={t.id} className="group hover:bg-gray-50/50 transition-all">
                    <td className="px-8 py-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-black italic tracking-tighter">{new Date(t.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-brand-gold shadow-sm">
                          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-black uppercase italic tracking-tighter group-hover:text-brand-gold transition-colors">{t.productName}</span>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="px-3 py-1 bg-gray-50 text-[9px] font-black text-gray-400 rounded-lg uppercase border border-gray-100 italic">{t.sku}</span>
                            <span className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] italic">{t.category}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex flex-col">
                        <div className={cn(
                          "flex items-center gap-2 font-black text-lg italic tracking-tighter",
                          t.type === 'in' ? "text-emerald-500" : "text-red-500"
                        )}>
                          {t.type === 'in' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                          <span>{t.type === 'in' ? '+' : '-'}{t.totalQuantity} {t.type.toUpperCase()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {Object.entries(t.quantities).map(([size, qty]) => (qty as number) > 0 && (
                            <span key={size} className="text-[9px] font-black px-2 py-1 bg-gray-50 text-gray-400 rounded-lg uppercase border border-gray-100 italic">
                              {size}: {qty}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-[11px] font-black italic shadow-lg">
                          {authorizedBy.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{authorizedBy}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex items-start gap-3 text-gray-400 group-hover:text-black transition-colors">
                        <MessageSquare size={16} className="shrink-0 mt-0.5 text-brand-gold" />
                        <span className="text-[11px] font-black italic line-clamp-2 uppercase leading-relaxed tracking-tight">{notes}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <button className="p-3 text-gray-300 hover:text-black transition-colors bg-transparent hover:bg-gray-100 rounded-xl border border-transparent shadow-sm">
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {!loading && filteredTransactions.length === 0 && (
            <div className="py-40 text-center relative overflow-hidden bg-gray-50 rounded-b-[3rem]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-gold/5 blur-[100px] -mt-64 rounded-full" />
              <div className="inline-flex flex-col items-center gap-8 relative z-10">
                <History size={80} className="text-gray-200 animate-bounce" />
                <div className="space-y-3">
                  <p className="text-2xl font-black text-black uppercase italic tracking-tighter">NULL AUDIT DETECTED</p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">No corresponding archival units in matrix</p>
                </div>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedType('all'); }}
                  className="mt-4 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl transition-all font-bold"
                >
                  Reset Parameters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

  );
}
