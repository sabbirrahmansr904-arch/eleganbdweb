/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Keyboard,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ClipboardCheck,
  AlertTriangle,
  Info
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

// Complete set of standard sizes supported in the store
const AVAILABLE_SIZES = [
  '28', '30', '32', '34', '36', '38', '40', '42', '44', '46',
  'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', 'QN'
];

// Pant sizes on the website are: 30, 32, 34, 36, 38, 40 (and alphabetical sizes for shirts/jerseys)
const DEFAULT_SELECTED_SIZES = ['30', '32', '34', '36', '38', '40', 'M', 'L', 'XL', '2XL', 'QN'];

export default function AdminStockIn() {
  const { products, updateProduct } = useProducts();
  const { transactions, addTransaction } = useInventory();
  const { currentUser } = useAuth();

  const [selectedSizes, setSelectedSizes] = useState<string[]>(DEFAULT_SELECTED_SIZES);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<StockInRow[]>([
    { id: '1', sku: '', quantities: {} },
    { id: '2', sku: '', quantities: {} },
    { id: '3', sku: '', quantities: {} },
    { id: '4', sku: '', quantities: {} },
    { id: '5', sku: '', quantities: {} }
  ]);

  // Verification & modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [preparedItems, setPreparedItems] = useState<any[]>([]);

  // Toggle individual size selection
  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  // Select/Deselect All Sizes
  const handleSelectAll = () => {
    if (selectedSizes.length === AVAILABLE_SIZES.length) {
      setSelectedSizes([]);
    } else {
      setSelectedSizes([...AVAILABLE_SIZES]);
    }
  };

  // Add empty row
  const addRow = () => {
    setRows([...rows, { id: Date.now().toString() + Math.random().toString(36).substring(2, 7), sku: '', quantities: {} }]);
  };

  // Remove row
  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    } else {
      setRows([{ id: '1', sku: '', quantities: {} }]);
    }
  };

  // Update SKU in row
  const updateRowSku = (id: string, sku: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, sku: sku.toUpperCase() } : r));
  };

  // Update specific size quantity in row
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

  // Copy & Paste handler directly parsing Excel data (cols = SKU, Size1, Size2, ...)
  const handlePaste = (rowIndex: number, colIndex: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasteData = event.clipboardData.getData('text');
    if (!pasteData) return;

    // Excel copies rows separated by newlines, columns separated by tabs
    const lines = pasteData.split(/\r?\n/).filter(line => line.trim() !== '');
    const updatedRows = [...rows];

    lines.forEach((line, lineOffset) => {
      const targetRowIdx = rowIndex + lineOffset;
      
      // Expand list dynamically if paste exceeds existing rows
      if (!updatedRows[targetRowIdx]) {
        updatedRows[targetRowIdx] = {
          id: (Date.now() + targetRowIdx).toString() + Math.random().toString(36).substring(2, 5),
          sku: '',
          quantities: {}
        };
      }

      const row = updatedRows[targetRowIdx];
      const columns = line.split('\t');

      columns.forEach((cell, colOffset) => {
        const targetColIdx = colIndex + colOffset;

        if (targetColIdx === 0) {
          // Paste into SKU column
          row.sku = cell.trim().toUpperCase();
        } else {
          // Paste into a size column
          const sizeName = selectedSizes[targetColIdx - 1];
          if (sizeName) {
            const val = parseInt(cell.trim()) || 0;
            row.quantities[sizeName] = val;
          }
        }
      });
    });

    setRows(updatedRows);
    toast.success(`Successfully pasted and parsed ${lines.length} rows from clipboard!`);
  };

  // Verify and Prepare rows for stock inclusion
  const handleVerifyAndPrepare = () => {
    const filledRows = rows.filter(r => r.sku.trim().length > 0 && Object.values(r.quantities).some(q => q > 0));
    
    if (filledRows.length === 0) {
      toast.error('Please enter at least one SKU with a valid size quantity.');
      return;
    }

    const items: any[] = [];

    filledRows.forEach(row => {
      // Find matching product
      const product = products.find(p => 
        (p.sku && p.sku.trim().toUpperCase() === row.sku.trim().toUpperCase()) || 
        p.id.toUpperCase() === row.sku.trim().toUpperCase()
      );

      const additions = Object.entries(row.quantities)
        .filter(([size, qty]) => qty > 0 && selectedSizes.includes(size))
        .map(([size, qty]) => {
          const currentStock = product?.sizeStock?.[size] || 0;
          return {
            size,
            qty,
            current: currentStock,
            target: currentStock + qty
          };
        });

      if (additions.length > 0) {
        items.push({
          rowId: row.id,
          sku: row.sku.trim().toUpperCase(),
          productName: product ? product.name : null,
          product,
          additions,
          isValid: !!product
        });
      }
    });

    if (items.length === 0) {
      toast.error('No valid size quantities matched your selected size filters.');
      return;
    }

    setPreparedItems(items);
    setShowConfirmModal(true);
  };

  // Final Commit of the payload
  const handleCommitStockIn = async () => {
    const validItems = preparedItems.filter(item => item.isValid);
    if (validItems.length === 0) {
      toast.error('No valid products to stock in.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const item of validItems) {
      const product = item.product;
      const updatedSizeStock = { ...(product.sizeStock || {}) };
      let totalAdded = 0;

      item.additions.forEach((add: any) => {
        updatedSizeStock[add.size] = add.target;
        totalAdded += add.qty;
      });

      try {
        // 1. Update Product stock in database
        await updateProduct({
          ...product,
          sizeStock: updatedSizeStock,
          stock: (product.stock || 0) + totalAdded
        });

        // Convert additions array to flat quantities object for transaction
        const quantitiesObj: Record<string, number> = {};
        item.additions.forEach((add: any) => {
          quantitiesObj[add.size] = add.qty;
        });

        // 2. Log transaction
        await addTransaction({
          type: 'in',
          sku: product.sku || '',
          productName: product.name,
          quantities: quantitiesObj,
          totalQuantity: totalAdded,
          category: product.category || 'Pants/Apparel',
          authorizedBy: currentUser?.displayName || currentUser?.email || 'Admin',
          notes: notes.trim() ? notes.trim() : 'Manual inventory replenishment'
        });

        successCount++;
      } catch (err) {
        console.error('Failed to update product stock:', err);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully stocked in ${successCount} products!`);
      // Reset rows
      setRows([
        { id: '1', sku: '', quantities: {} },
        { id: '2', sku: '', quantities: {} },
        { id: '3', sku: '', quantities: {} },
        { id: '4', sku: '', quantities: {} },
        { id: '5', sku: '', quantities: {} }
      ]);
      setNotes('');
      setShowConfirmModal(false);
    }

    if (failCount > 0) {
      toast.error(`Failed to update ${failCount} products. Check connection.`);
    }
  };

  const recentTransactions = transactions.filter(t => t.type === 'in').slice(0, 5);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 font-sans bg-[#F8FAFC]">
      
      {/* Visual Header exactly matching the green screenshot styling */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-[#10B981] tracking-tight flex items-center gap-2">
          Stock In
        </h1>
        <p className="text-[14px] text-gray-500 font-medium">
          Receive new inventory and automatically increase stock counts.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Filter Attributes Panel */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Manual Mode Tab Button */}
          <div className="w-full border border-emerald-500/20 text-emerald-600 bg-emerald-50/50 rounded-2xl py-3.5 px-4 font-bold flex items-center justify-center space-x-2.5 text-[13px] shadow-sm transition-all">
            <Keyboard size={16} className="text-emerald-500 stroke-[2.5]" />
            <span className="uppercase tracking-wider">Manual Entry</span>
          </div>

          {/* Filter Attributes Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#EFF2F6] shadow-[0_4px_24px_rgba(0,0,0,0.01)] space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Filter Attributes
              </span>
              <button 
                onClick={handleSelectAll}
                className="text-[10px] font-extrabold text-[#10B981] hover:underline uppercase tracking-wider"
              >
                {selectedSizes.length === AVAILABLE_SIZES.length ? 'DESELECT ALL' : 'SELECT ALL'}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Size</span>
              <span>Select</span>
            </div>

            {/* Scrollable grid container for sizes matching the screenshot handle scrollbar */}
            <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-200">
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SIZES.map((size) => {
                  const isChecked = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all w-full",
                        isChecked 
                          ? "bg-[#10B981] border-[#10B981] text-white shadow-sm" 
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {/* Checked visual square */}
                      <div className={cn(
                        "flex items-center justify-center border rounded-md w-4 h-4 mr-2 shrink-0 transition-all",
                        isChecked ? "bg-white border-white text-[#10B981]" : "bg-white border-gray-300 text-transparent"
                      )}>
                        <Check size={10} strokeWidth={3} className={isChecked ? "block" : "hidden"} />
                      </div>
                      <span className="truncate">{size}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Spreadsheet Entry Panel */}
        <div className="xl:col-span-9">
          <div className="bg-white rounded-3xl border border-[#EFF2F6] shadow-[0_4px_24px_rgba(0,0,0,0.01)] overflow-hidden flex flex-col">
            
            {/* Spreadsheet Header */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <h2 className="text-base font-bold text-gray-900">Spreadsheet Entry</h2>
                
                {/* Excel paste pill badge */}
                <div className="flex items-center space-x-1 px-3 py-1 bg-gray-50 border border-gray-200/60 rounded-full text-[10px] text-gray-500 font-semibold shadow-sm">
                  <FileSpreadsheet size={12} className="text-emerald-500" />
                  <span>Supports Copy/Paste from Excel</span>
                </div>
              </div>

              <button 
                onClick={addRow}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} className="stroke-[2.5]" />
                Add Row
              </button>
            </div>

            {/* Scrollable table container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {/* Two-level headers matching screenshot exactly */}
                  <tr className="bg-[#F8FAFC]">
                    <th rowSpan={2} className="px-4 py-3 text-center text-[10px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-r border-gray-100 w-12 bg-gray-50/20">
                      #
                    </th>
                    <th rowSpan={2} className="px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-r border-gray-100 min-w-[200px]">
                      Product SKU
                    </th>
                    <th colSpan={selectedSizes.length} className="px-4 py-1.5 text-center text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#3B82F6] border-b border-gray-100 bg-[#EFF6FF]/60 font-mono">
                      Size
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-center w-12 border-b border-gray-100"></th>
                  </tr>
                  <tr className="bg-white">
                    {selectedSizes.map(size => (
                      <th key={size} className="px-2 py-2 text-center text-[10px] font-extrabold text-gray-500 border-b border-r border-gray-100 min-w-[50px] uppercase">
                        {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence initial={false}>
                    {rows.map((row, index) => (
                      <motion.tr 
                        key={row.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group hover:bg-gray-50/40 transition-all"
                      >
                        {/* Index column */}
                        <td className="px-4 py-4 text-xs font-bold text-gray-400 text-center border-r border-gray-100 bg-gray-50/10 italic">
                          {index + 1}
                        </td>
                        
                        {/* SKU cell */}
                        <td className="px-4 py-3 border-r border-gray-100">
                          <input 
                            type="text"
                            value={row.sku}
                            onChange={(e) => updateRowSku(row.id, e.target.value)}
                            onPaste={(e) => handlePaste(index, 0, e)}
                            placeholder="SKU"
                            className="w-full bg-transparent border-none py-1.5 text-xs font-bold uppercase tracking-wider text-gray-800 placeholder:text-gray-300 outline-none"
                          />
                        </td>

                        {/* Size quantities columns */}
                        {selectedSizes.map((size, sIdx) => {
                          const val = row.quantities[size];
                          const hasVal = val !== undefined && val > 0;
                          return (
                            <td key={size} className="p-1 border-r border-gray-100">
                              <input 
                                type="text"
                                inputMode="numeric"
                                value={val === undefined ? '0' : val}
                                onChange={(e) => updateQuantity(row.id, size, e.target.value)}
                                onPaste={(e) => handlePaste(index, sIdx + 1, e)}
                                className={cn(
                                  "w-full text-center text-xs font-extrabold py-2.5 rounded-lg border border-transparent outline-none transition-all",
                                  hasVal 
                                    ? "text-[#10B981] bg-emerald-50/40 border-emerald-500/20 shadow-inner" 
                                    : "text-[#10B981] bg-emerald-50/10"
                                )}
                              />
                            </td>
                          );
                        })}

                        {/* Row removal */}
                        <td className="px-3 py-3 text-center">
                          <button 
                            onClick={() => removeRow(row.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                            title="Remove row"
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

            {/* Bottom Bar matching screenshot guidelines */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/60 flex flex-col md:flex-row justify-between items-center gap-6">
              
              <div className="flex items-start space-x-2 text-xs text-gray-400 max-w-lg">
                <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <span>
                  Paste from Excel directly into the cells. Only non-zero quantities mapped to an SKU will be processed.
                </span>
              </div>

              <button 
                onClick={handleVerifyAndPrepare}
                className="w-full md:w-auto px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <ClipboardCheck size={16} />
                Verify & Prepare Rows
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal (Verify & Prepare outcome) */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <ClipboardCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Verify Stock In Batches</h3>
                    <p className="text-[10px] text-gray-500 font-medium">Verify catalog mapping and stock changes before commiting.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content - Scrollable list of verified changes */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {preparedItems.some(i => !i.isValid) && (
                  <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <div className="text-xs text-amber-800 space-y-1">
                      <p className="font-bold">Unrecognized SKUs Detected</p>
                      <p>Some of the entered SKU codes do not match any products in your store catalog. These invalid lines will be skipped.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Replenishment Summary</h4>
                  
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
                    {preparedItems.map((item, index) => (
                      <div key={item.rowId} className={cn("p-4 flex flex-col md:flex-row md:items-center justify-between gap-4", !item.isValid && "bg-red-50/20")}>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                              Line {index + 1}
                            </span>
                            <span className="text-xs font-bold text-gray-900">
                              {item.sku}
                            </span>
                          </div>
                          <p className={cn("text-[11px] font-semibold", item.isValid ? "text-gray-500" : "text-red-500 font-bold")}>
                            {item.productName || '⚠️ Invalid SKU - No Product Matches'}
                          </p>
                        </div>

                        {item.isValid && (
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {item.additions.map((add: any) => (
                              <div key={add.size} className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg text-xs">
                                <span className="font-bold text-[#10B981]">{add.size}:</span>
                                <span className="font-extrabold text-emerald-800">+{add.qty}</span>
                                <span className="text-[10px] text-gray-400">({add.current} → {add.target})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes Input for transaction history */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Submission Protocol Note (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g., Seasonal restocking from central factory..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end space-x-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Go Back
                </button>
                <button 
                  onClick={handleCommitStockIn}
                  className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  Confirm & Commit Stock In
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Historical Stock In logs Section */}
      <div className="bg-white rounded-3xl border border-[#EFF2F6] shadow-[0_4px_24px_rgba(0,0,0,0.01)] overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Historical Inbound Logs</h3>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Immutable archive of matrix stock-in records</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Product Name</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">SKU Unit</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Matrix Breakdown</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 text-right">Inflow Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-900">{new Date(t.timestamp).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{new Date(t.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-800">{t.productName}</p>
                    <p className="text-[10px] text-[#10B981] font-bold uppercase tracking-wider mt-0.5">{t.category}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold tracking-wider text-gray-600">
                      {t.sku}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(t.quantities).map(([size, qty]) => (qty as number) > 0 && (
                        <div key={size} className="flex items-center gap-1 bg-gray-50 border border-gray-200/50 px-2 py-0.5 rounded-md text-[10px] font-semibold text-gray-600">
                          <span className="text-[#10B981] font-bold">{size}:</span>
                          <span>{qty}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-extrabold text-emerald-600">+{t.totalQuantity}</span>
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-3 text-gray-300">
                      <Package size={36} strokeWidth={1.5} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No Historical Stock In Logs</p>
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
