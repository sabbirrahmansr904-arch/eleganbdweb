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
import { motion, AnimatePresence } from 'framer-motion';
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
          const transactionData: any = {
            type: 'in',
            sku: product.sku || '',
            productName: product.name,
            quantities: row.quantities,
            totalQuantity: totalAdded,
            category: activeCategory,
            authorizedBy: currentUser?.displayName || currentUser?.email || 'Admin',
            timestamp: Date.now()
          };

          if (notes.trim()) {
            transactionData.notes = notes.trim();
          }

          await addTransaction(transactionData);
          
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
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-gray-50 p-8 rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:bg-gray-100/50">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-black text-white rounded-2xl shadow-xl">
              <Package size={24} />
            </div>
            <h1 className="text-3xl font-black text-black italic tracking-tighter uppercase font-sans">Inventory Inbound</h1>
          </div>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] ml-1">Architectural stock synchronization for existing SKU matrix.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex p-1.5 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <button 
              onClick={() => setActiveCategory('shirt')}
              className={cn(
                "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                activeCategory === 'shirt' ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"
              )}
            >
              Apparel Entry
            </button>
            <button 
              onClick={() => setActiveCategory('pant')}
              className={cn(
                "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                activeCategory === 'pant' ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"
              )}
            >
              Bottoms Entry
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Info */}
        <div className="lg:col-span-3 space-y-8">
          <div className="p-10 rounded-[2.5rem] bg-white border border-gray-100 text-black shadow-sm space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 blur-[60px] -mr-16 -mt-16 rounded-full group-hover:bg-gray-100 transition-all" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-brand-gold">
                <FileSpreadsheet size={24} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] italic">Protocol Guide</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-loose uppercase tracking-widest font-black">
              Synchronize the matrix before entry. Columns will dynamically adjust based on the <span className="text-black italic">Asset Class</span> selected.
            </p>
            <div className="pt-6 border-t border-gray-50 flex items-center gap-5 relative z-10">
              <div className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-black text-[10px] font-black uppercase italic tracking-widest shadow-sm">
                {activeCategory === 'shirt' ? 'M - XXL' : '30 - 40'}
              </div>
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Active Matrix Range</span>
            </div>
          </div>
          
          <div className="p-8 rounded-[2rem] bg-white border border-gray-100 shadow-sm flex items-start gap-6">
            <div className="p-3 bg-gray-50 rounded-xl text-brand-gold border border-gray-100 shadow-sm">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-2 italic">Dilation Rule</p>
              <p className="text-[11px] text-gray-400 leading-relaxed font-black uppercase tracking-tighter">Quantities will <span className="text-black">AGGREGATE</span> into existing vault totals.</p>
            </div>
          </div>
        </div>

        {/* Right: Spreadsheet Entry */}
        <div className="lg:col-span-9 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white text-brand-gold rounded-2xl border border-gray-100 shadow-sm">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] italic font-sans">
                    {activeCategory === 'shirt' ? 'Apparel' : 'Bottoms'} Vault Entry
                  </h3>
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.1em] mt-1">Synchronized for high-speed terminal injection</p>
                </div>
              </div>
              <button 
                onClick={addRow}
                className="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all flex items-center gap-3 shadow-lg"
              >
                <Plus size={16} />
                Inject Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100 w-16 text-center italic">#</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100 min-w-[240px]">SKU Identifier</th>
                    {activeSizes.map(size => (
                      <th key={size} className="px-4 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100 text-center min-w-[80px]">{size}</th>
                    ))}
                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence initial={false}>
                    {rows.map((row, index) => (
                      <motion.tr 
                        key={row.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="group hover:bg-gray-50 transition-all"
                      >
                        <td className="px-8 py-6 text-[10px] font-black text-gray-200 text-center italic">{index + 1}</td>
                        <td className="px-8 py-6">
                          <input 
                            type="text"
                            value={row.sku}
                            onChange={(e) => updateRowSku(row.id, e.target.value)}
                            placeholder="Type SKU identifier..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest italic text-black placeholder:text-gray-300 outline-none focus:border-black focus:ring-1 focus:ring-black/20 transition-all shadow-sm"
                          />
                        </td>
                        {activeSizes.map(size => (
                          <td key={size} className="px-2 py-6">
                            <input 
                              type="number"
                              min="0"
                              value={row.quantities[size] || ''}
                              onChange={(e) => updateQuantity(row.id, size, e.target.value)}
                              placeholder="0"
                              className={cn(
                                "w-full bg-white text-center text-xs font-black outline-none transition-all py-3 rounded-xl border border-gray-100 shadow-sm",
                                (row.quantities[size] || 0) > 0 
                                  ? "text-black bg-gray-50 border-black" 
                                  : "text-gray-300 focus:text-black focus:border-black"
                              )}
                            />
                          </td>
                        ))}
                        <td className="px-8 py-6">
                          <button 
                            onClick={() => removeRow(row.id)}
                            className="p-3 text-gray-200 hover:text-rose-500 bg-transparent hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="p-10 border-t border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex-1 w-full space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 block ml-1 italic font-sans">Submission Protocol Note (Required)</label>
                <input 
                  type="text"
                  placeholder="e.g., Monthly architectural restock from factory..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-xs font-medium text-black focus:border-black outline-none transition-all shadow-sm"
                />
              </div>
              <button 
                onClick={handleStockIn}
                className="w-full md:w-auto px-12 py-5 bg-black text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 shrink-0 group font-bold"
              >
                <CheckCircle2 size={18} className="text-white" />
                Commit {activeCategory === 'shirt' ? 'Apparel' : 'Bottoms'} Payload
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Stock In Transactions */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black text-emerald-400 rounded-2xl shadow-lg">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] italic font-sans">Historical Inbound Logs</h3>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] mt-1">Immutable archive of matrix dilatations</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">Temporal Stamp</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">Asset Nomenclature</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">SKU Unit</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">Matrix Configuration</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100 text-right">Inflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-black italic tracking-tighter">{new Date(t.timestamp).toLocaleDateString()}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{new Date(t.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-black uppercase italic group-hover:text-brand-gold transition-colors">{t.productName}</p>
                    <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] mt-1 italic">{t.category}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 text-black rounded-lg text-[9px] font-black tracking-[0.2em] shadow-sm italic">{t.sku}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(t.quantities).map(([size, qty]) => (qty as number) > 0 && (
                        <div key={size} className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg text-[9px] font-black shadow-sm">
                          <span className="text-brand-gold italic">{size}:</span>
                          <span className="text-black">{qty}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-lg font-black text-emerald-600 italic">+{t.totalQuantity}</span>
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="inline-flex flex-col items-center gap-6 opacity-30">
                      <Package size={48} className="text-gray-300" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 italic animate-pulse">NULL LOG DETECTED: NO HISTORICAL FLOW</p>
                    </div>
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
