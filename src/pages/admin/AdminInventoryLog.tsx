import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  History, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronRight,
  User,
  MessageSquare,
  Download,
  Trash2,
  Activity,
  Plus,
  Minus,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useInventory } from '../../contexts/InventoryContext';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AdminInventoryLog() {
  const { transactions = [], loading, deleteTransaction } = useInventory();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const skuParam = searchParams.get('sku') || '';
  const typeParam = searchParams.get('type') as 'all' | 'in' | 'out' || 'all';

  const [searchQuery, setSearchQuery] = useState(skuParam);
  const [selectedType, setSelectedType] = useState<'all' | 'in' | 'out'>(typeParam);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (skuParam) {
      setSearchQuery(skuParam);
    }
  }, [skuParam]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const authorizedBy = t.authorizedBy || 'System';
      const notes = t.notes || '';
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = 
        !query ||
        t.productName.toLowerCase().includes(query) ||
        t.sku.toLowerCase().includes(query) ||
        authorizedBy.toLowerCase().includes(query) ||
        notes.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query);
      const matchesType = selectedType === 'all' || t.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, selectedType]);

  const totalIn = useMemo(() => {
    return transactions
      .filter(t => t.type === 'in')
      .reduce((acc, t) => acc + (t.totalQuantity || 0), 0);
  }, [transactions]);
  
  const totalOut = useMemo(() => {
    return transactions
      .filter(t => t.type === 'out')
      .reduce((acc, t) => acc + (t.totalQuantity || 0), 0);
  }, [transactions]);

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No inventory transactions to export.');
      return;
    }

    const data = filteredTransactions.map(t => ({
      'Date & Time': new Date(t.timestamp).toLocaleString('en-GB'),
      'Type': t.type.toUpperCase(),
      'Product Name': t.productName,
      'SKU': t.sku,
      'Category': t.category,
      'Total Quantity': t.totalQuantity,
      'Size Breakdown': Object.entries(t.quantities || {})
        .filter(([_, qty]) => Number(qty) > 0)
        .map(([sz, qty]) => `${sz}:${qty}`)
        .join(', '),
      'Authorized By': t.authorizedBy || 'System',
      'Protocol Note': t.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Logs');
    XLSX.writeFile(wb, `Inventory_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Inventory logs exported to Excel successfully!');
  };

  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No inventory transactions to export.');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('ELEGAN BD - Inventory Audit Log', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString('en-GB')} | Total Records: ${filteredTransactions.length}`, 14, 22);

    const tableData = filteredTransactions.map(t => [
      new Date(t.timestamp).toLocaleDateString('en-GB') + ' ' + new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      t.type.toUpperCase(),
      t.productName,
      t.sku,
      t.type === 'in' ? `+${t.totalQuantity}` : `-${t.totalQuantity}`,
      Object.entries(t.quantities || {}).filter(([_, q]) => Number(q) > 0).map(([s, q]) => `${s}:${q}`).join(' '),
      t.authorizedBy || 'System',
      t.notes || ''
    ]);

    autoTable(doc, {
      head: [['Timestamp', 'Type', 'Product', 'SKU', 'Qty', 'Sizes', 'By', 'Note']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Inventory_Logs_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Inventory logs exported to PDF successfully!');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId || !deleteTransaction) return;
    try {
      await deleteTransaction(deleteId);
      toast.success('Transaction log removed.');
    } catch (err) {
      toast.error('Failed to delete log entry.');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
              <History size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-black italic tracking-tighter uppercase font-sans">Inventory Log</h1>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Real-Time Live
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                Live stream of stock replenishment, sales deductions, and adjustments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-end shadow-sm">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Total Stock In</span>
            <div className="flex items-center gap-2 text-emerald-600">
              <ArrowUpRight size={18} />
              <span className="text-xl font-black italic">+{totalIn.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col items-end shadow-sm">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1">Total Stock Out</span>
            <div className="flex items-center gap-2 text-rose-600">
              <ArrowDownLeft size={18} />
              <span className="text-xl font-black italic">-{totalOut.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search by SKU, product name, note, or authorized user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all text-xs font-bold text-gray-800 placeholder:text-gray-400"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setSearchParams({}); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex p-1 bg-gray-100 rounded-2xl">
              {(['all', 'in', 'out'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                    selectedType === type 
                      ? "bg-blue-600 text-white shadow-sm" 
                      : "text-gray-500 hover:text-blue-600"
                  )}
                >
                  {type === 'all' ? 'All Logs' : type === 'in' ? 'Stock In (+)' : 'Stock Out (-)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                title="Export to Excel"
              >
                <Download size={14} />
                <span>Excel</span>
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                title="Export to PDF"
              >
                <Download size={14} />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-500">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-500">Product & SKU</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-500">Movement & Sizes</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-500">Authorized By</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-500">Protocol / Reason Note</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && filteredTransactions.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6 h-16 bg-gray-50/40" />
                  </tr>
                ))
              ) : filteredTransactions.map((t) => {
                const authorizedBy = t.authorizedBy || 'System';
                const notes = t.notes || 'No reason specified.';
                const isIn = t.type === 'in';
                return (
                  <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">
                          {new Date(t.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 mt-0.5">
                          {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors">
                          {t.productName}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-black text-gray-700 rounded border border-gray-200">
                            {t.sku}
                          </span>
                          <span className="text-[10px] font-bold text-brand-gold uppercase">
                            {t.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 font-black text-sm",
                          isIn ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {isIn ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                          <span>{isIn ? '+' : '-'}{t.totalQuantity} {t.type.toUpperCase()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.entries(t.quantities || {}).map(([size, qty]) => (Number(qty) > 0) && (
                            <span key={size} className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded border border-gray-200">
                              {size}: {qty}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-[10px] font-black uppercase">
                          {authorizedBy.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-gray-700">{authorizedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-2 text-gray-600 max-w-xs md:max-w-md">
                        <MessageSquare size={14} className="shrink-0 mt-0.5 text-gray-400" />
                        <span className="text-xs font-medium leading-snug">{notes}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      {deleteTransaction && (
                        <button 
                          onClick={() => setDeleteId(t.id)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete log record"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredTransactions.length === 0 && !loading && (
            <div className="py-24 text-center">
              <div className="inline-flex flex-col items-center gap-4 text-gray-400">
                <History size={48} className="text-gray-300" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-gray-800">No Inventory Transactions Found</p>
                  <p className="text-xs text-gray-400">
                    {searchQuery ? 'No records match your search query.' : 'Transactions will appear here in real-time as stock is added or removed.'}
                  </p>
                </div>
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setSelectedType('all'); setSearchParams({}); }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-gray-100"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-xl">
                  <Trash2 size={20} />
                </div>
                <h3 className="font-bold text-base text-gray-900">Delete Transaction Log?</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                This will remove the transaction record from the inventory log archive. Physical product stock counts will remain unchanged.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Delete Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

