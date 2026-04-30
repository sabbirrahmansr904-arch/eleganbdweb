/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProducts } from '../../contexts/ProductContext';
import { useInventory } from '../../contexts/InventoryContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface StockInRow {
  id: string;
  sku: string;
  quantities: Record<string, number>;
}

const APPAREL_SIZES = ['M', 'L', 'XL', 'XXL'];
const WAIST_SIZES = ['30', '32', '34', '36', '38', '40'];

export default function AdminStockIn() {
  const { products, updateProduct } = useProducts();
  const { transactions, addTransaction } = useInventory();
  const { currentUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState<'shirt' | 'pant'>('shirt');
  const [notes, setNotes] = useState('');
  const [shirtRows, setShirtRows] = useState<StockInRow[]>([
    { id: '1', sku: '', quantities: {} }
  ]);
  const [pantRows, setPantRows] = useState<StockInRow[]>([
    { id: '1', sku: '', quantities: {} }
  ]);

  const rows = activeCategory === 'shirt' ? shirtRows : pantRows;
  const setRows = activeCategory === 'shirt' ? setShirtRows : setPantRows;
  const activeSizes = activeCategory === 'shirt' ? APPAREL_SIZES : WAIST_SIZES;

  const addRow = () => {
    setRows([...rows, { id: Date.now().toString(), sku: '', quantities: {} }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateRowSku = (id: string, sku: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, sku } : r));
  };

  const updateQuantity = (rowId: string, size: string, value: string) => {
    const num = parseInt(value) || 0;
    setRows(rows.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          quantities: { ...r.quantities, [size]: num }
        };
      }
      return r;
    }));
  };

  const handleStockIn = async () => {
    const validRows = rows.filter(r => r.sku.trim().length > 0 && Object.values(r.quantities).some(q => (q as number) > 0));
    if (validRows.length === 0) {
      toast.error('Please enter at least one SKU with quantity');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      const product = products.find(p => 
        (p.sku && p.sku.trim().toLowerCase() === row.sku.trim().toLowerCase()) || 
        p.id.toLowerCase() === row.sku.trim().toLowerCase()
      );
      if (!product) {
        failCount++;
        continue;
      }

      const updatedSizeStock = { ...(product.sizeStock || {}) };
      let totalAdded = 0;

      Object.entries(row.quantities).forEach(([size, qty]) => {
        const quantity = qty as number;
        if (quantity > 0) {
          updatedSizeStock[size] = (updatedSizeStock[size] || 0) + quantity;
          totalAdded += quantity;
        }
      });

      if (totalAdded > 0) {
        try {
          // 1. Update Product Stock
          await updateProduct({
            ...product,
            sizeStock: updatedSizeStock,
            stock: (product.stock || 0) + totalAdded
          });
          
          // 2. Log Transaction
          await addTransaction({
            type: 'in',
            sku: product.sku || '',
            productName: product.name,
            quantities: row.quantities,
            totalQuantity: totalAdded,
            category: activeCategory,
            authorizedBy: currentUser?.displayName || currentUser?.email || 'Admin',
            notes: notes.trim() || undefined
          });
          
          successCount++;
        } catch (err) {
          failCount++;
        }
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully updated ${successCount} products`);
      setRows([{ id: Date.now().toString(), sku: '', quantities: {} }]);
      setNotes('');
    }
    if (failCount > 0) {
      toast.error(`Failed to update ${failCount} entries (SKU not found or error)`);
    }
  };

  const recentTransactions = transactions.filter(t => t.type === 'in').slice(0, 10);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-ink text-white rounded-xl shadow-lg">
              <Package size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Stock In</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">Receive new inventory and automatically increase stock counts for existing SKUs.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setActiveCategory('shirt')}
              className={cn(
                "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeCategory === 'shirt' ? "bg-white text-brand-ink shadow-sm" : "text-slate-400"
              )}
            >
              Shirt Entry
            </button>
            <button 
              onClick={() => setActiveCategory('pant')}
              className={cn(
                "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeCategory === 'pant' ? "bg-white text-brand-ink shadow-sm" : "text-slate-400"
              )}
            >
              Pant Entry
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Info */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-8 rounded-3xl bg-brand-ink text-white shadow-xl shadow-brand-ink/20 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-gold/20 rounded-xl flex items-center justify-center text-brand-gold">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Entry Guide</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Select the appropriate tab (Shirt or Pant) before entering SKUs. The columns will adjust to show size M-XXL for shirts and 30-40 for pants.
            </p>
            <div className="pt-4 border-t border-white/10 flex items-center gap-4">
              <div className="p-2 bg-white/5 rounded-lg text-brand-gold text-xs font-black uppercase">
                {activeCategory === 'shirt' ? 'M - XXL' : '30 - 40'}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Size Matrix</span>
            </div>
          </div>
          
          <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg text-indigo-500">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest mb-1">Stock Update Rule</p>
              <p className="text-[11px] text-indigo-700/80 leading-relaxed font-medium">Entering a quantity will <span className="font-black">ADD</span> to the existing stock levels.</p>
            </div>
          </div>
        </div>

        {/* Right: Spreadsheet Entry */}
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                    {activeCategory === 'shirt' ? 'Shirt' : 'Pant'} Spreadsheet Entry
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Optimized for rapid keyboard entry</p>
                </div>
              </div>
              <button 
                onClick={addRow}
                className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 border border-slate-100"
              >
                <Plus size={14} />
                Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 w-12 text-center">#</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 min-w-[200px]">Product SKU</th>
                    {activeSizes.map(size => (
                      <th key={size} className="px-2 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 text-center min-w-[60px]">{size}</th>
                    ))}
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {rows.map((row, index) => (
                      <motion.tr 
                        key={row.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="group hover:bg-slate-50/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-[10px] font-black text-slate-300 text-center">{index + 1}</td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={row.sku}
                            onChange={(e) => updateRowSku(row.id, e.target.value)}
                            placeholder="Type SKU..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5 text-xs font-black uppercase placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all"
                          />
                        </td>
                        {activeSizes.map(size => (
                          <td key={size} className="px-1 py-4">
                            <input 
                              type="number"
                              min="0"
                              value={row.quantities[size] || ''}
                              onChange={(e) => updateQuantity(row.id, size, e.target.value)}
                              placeholder="0"
                              className={cn(
                                "w-full bg-transparent text-center text-xs font-black outline-none transition-colors py-2 rounded-lg",
                                (row.quantities[size] || 0) > 0 ? "text-brand-ink bg-brand-gold/10" : "text-slate-200 focus:text-slate-600 focus:bg-slate-50"
                              )}
                            />
                          </td>
                        ))}
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => removeRow(row.id)}
                            className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex-1 w-full space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Note (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g., Monthly restock from factory..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all"
                />
              </div>
              <button 
                onClick={handleStockIn}
                className="w-full md:w-auto px-10 py-4 bg-brand-ink text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-gold shadow-xl shadow-brand-ink/10 hover:shadow-brand-gold/20 transition-all active:scale-95 flex items-center justify-center gap-3 shrink-0"
              >
                <CheckCircle2 size={16} className="text-brand-gold" />
                Submit {activeCategory === 'shirt' ? 'Shirt' : 'Pant'} Batch
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Stock In Transactions */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Recent Stock In Records</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Historical log of entry submissions</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">Date & Time</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">Product</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">SKU</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">Size Breakdown</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-700">{new Date(t.timestamp).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-400">{new Date(t.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-brand-ink uppercase">{t.productName}</p>
                    <p className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">{t.category}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black tracking-widest">{t.sku}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(t.quantities).map(([size, qty]) => (qty as number) > 0 && (
                        <div key={size} className="flex items-center gap-1 bg-brand-gold/5 border border-brand-gold/10 px-2 py-0.5 rounded text-[9px] font-black">
                          <span className="text-brand-gold">{size}:</span>
                          <span className="text-brand-ink">{qty}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-brand-ink">+{t.totalQuantity}</span>
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 italic">No recent transactions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
