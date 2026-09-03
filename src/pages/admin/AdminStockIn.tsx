import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Package, 
  CheckCircle2, 
  ArrowDownLeft, 
  Calendar, 
  User, 
  Hash,
  FileText,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductContext';
import { useInventory } from '../../contexts/InventoryContext';
import { Product } from '../../types';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function AdminStockIn() {
  const { products, updateProduct, refreshProducts } = useProducts();
  const { transactions, addTransaction, loading: inventoryLoading } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter products for modal/selection dropdown
  const filteredProductsForSelect = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [products, searchQuery]);

  // Determine size schema based on product's actual sizes or category / name
  const getProductSizes = (product: Product | null) => {
    if (!product) return ['M', 'L', 'XL', 'XXL'];
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      return product.sizes;
    }
    if (product.sizeStock && Object.keys(product.sizeStock).length > 0) {
      return Object.keys(product.sizeStock);
    }
    const cat = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();

    if (cat.includes('shirt') || cat.includes('polo') || cat.includes('panjabi') || name.includes('shirt') || name.includes('polo') || name.includes('panjabi')) {
      return ['M', 'L', 'XL', 'XXL'];
    }
    if (cat.includes('pant') || cat.includes('trouser') || cat.includes('jeans') || name.includes('pant') || name.includes('trouser') || name.includes('jeans')) {
      return ['28', '30', '32', '34', '36', '38', '40'];
    }
    return ['M', 'L', 'XL', 'XXL'];
  };

  const currentSizes = getProductSizes(selectedProduct);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    const sizes = getProductSizes(product);
    const initialQty: Record<string, number> = {};
    sizes.forEach(s => {
      initialQty[s] = 0;
    });
    setQuantities(initialQty);
  };

  const handleQuantityChange = (size: string, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setQuantities(prev => ({
      ...prev,
      [size]: num
    }));
  };

  const totalQuantityAdded = useMemo(() => {
    return Object.values(quantities).reduce((acc, q) => acc + (Number(q) || 0), 0);
  }, [quantities]);

  const handleSubmitStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('অনুগ্রহ করে একটি প্রোডাক্ট নির্বাচন করুন।');
      return;
    }
    if (totalQuantityAdded <= 0) {
      toast.error('অন্তত ১ পিস পরিমাণ যোগ করুন।');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Add transaction log to database
      await addTransaction({
        type: 'in',
        sku: selectedProduct.sku || `SKU-${selectedProduct.id.slice(-6)}`,
        productName: selectedProduct.name,
        category: selectedProduct.category || 'General',
        quantities,
        totalQuantity: totalQuantityAdded,
        authorizedBy: authorizedBy.trim() || 'Admin',
        notes: notes.trim() || 'Stock In entry'
      });

      // 2. Update product stock & sizeStock accurately
      const updatedSizeStock = { ...(selectedProduct.sizeStock || {}) };
      Object.entries(quantities).forEach(([sz, qty]) => {
        const currentQty = Number(updatedSizeStock[sz] || 0);
        updatedSizeStock[sz] = currentQty + qty;
      });

      const updatedSizes = Array.from(new Set([
        ...(selectedProduct.sizes || []),
        ...Object.keys(updatedSizeStock)
      ]));

      const newTotalStock = updatedSizes.reduce((sum, sz) => sum + (Math.max(0, Number(updatedSizeStock[sz]) || 0)), 0);

      await updateProduct({
        ...selectedProduct,
        sizes: updatedSizes,
        sizeStock: updatedSizeStock,
        stock: newTotalStock
      });

      toast.success(`সফলভাবে ${totalQuantityAdded} পিস স্টক ইন করা হয়েছে!`);
      
      // Reset form
      setSelectedProduct(null);
      setSearchQuery('');
      setQuantities({});
      setNotes('');
      setAuthorizedBy('');
      await refreshProducts();
    } catch (err: any) {
      console.error('Stock in error:', err);
      toast.error('স্টক ইন সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  // Recent Stock In transactions
  const stockInTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'in').slice(0, 25);
  }, [transactions]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 font-sans">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <ArrowDownLeft size={24} />
            </div>
            <div>
              <h3 className="serif text-2xl sm:text-3xl text-black italic tracking-tighter uppercase font-black">
                Stock In (স্টক ইন)
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                নতুন পণ্য বা অতিরিক্ত স্টক ডেটাবেজে যুক্ত করুন ও রিয়েল-টাইম আপডেট রাখুন
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#F8F9FD] border border-gray-200/80 px-5 py-3 rounded-2xl">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">মোট স্টক ইন রেকর্ড</p>
            <p className="text-lg font-black text-emerald-600 leading-none">{stockInTransactions.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Stock In Form */}
        <div className="lg:col-span-6 bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} className="text-emerald-600" /> নতুন স্টক ইন এন্ট্রি ফরম
            </h4>
            <span className="text-[10px] font-bold uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              ডাটাবেজ কানেক্টেড
            </span>
          </div>

          <form onSubmit={handleSubmitStockIn} className="space-y-6">
            {/* Product Search & Select */}
            <div className="space-y-2 relative">
              <label className="text-xs font-black uppercase text-gray-700 tracking-wider">
                প্রোডাক্ট খুঁজুন (SKU বা নাম দিয়ে) *
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedProduct && e.target.value !== selectedProduct.name) {
                      setSelectedProduct(null);
                    }
                  }}
                  placeholder="যেমন: ELG-101 অথবা Formal Shirt..."
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold text-gray-900 outline-none focus:border-black transition-all"
                />
              </div>

              {/* Suggestions Dropdown */}
              {searchQuery.trim() && !selectedProduct && filteredProductsForSelect.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                  {filteredProductsForSelect.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between cursor-pointer border-b border-gray-100 last:border-none transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={p.images?.[0] || p.image || '/placeholder.png'} 
                          alt={p.name} 
                          className="w-10 h-10 rounded-xl object-cover border border-gray-200" 
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-xs font-black text-gray-900">{p.name}</p>
                          <p className="text-[10px] font-mono text-gray-400">SKU: {p.sku || p.id} • ক্যাটাগরি: {p.category}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                        সিলেক্ট করুন
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Product Preview & Size Breakdown Qty */}
            {selectedProduct ? (
              <div className="bg-[#F8F9FD] border border-gray-200 rounded-2xl p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={selectedProduct.images?.[0] || selectedProduct.image || '/placeholder.png'} 
                      alt={selectedProduct.name} 
                      className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-xs" 
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="px-2 py-0.5 bg-black text-white rounded text-[9px] font-mono font-bold uppercase">
                        {selectedProduct.sku || `SKU-${selectedProduct.id.slice(-6)}`}
                      </span>
                      <h5 className="text-xs font-black text-gray-900 mt-1 uppercase italic">{selectedProduct.name}</h5>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">বর্তমান স্টক</p>
                    <p className="text-sm font-black text-gray-900">{selectedProduct.stock || 0} পিস</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-gray-700 tracking-wider">
                    সাইজ অনুযায়ী যোগ করার পরিমাণ ({currentSizes.join(', ')}):
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {currentSizes.map(size => (
                      <div key={size} className="bg-white border border-gray-200 rounded-xl p-2.5 text-center shadow-xs">
                        <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">{size}</span>
                        <input 
                          type="number"
                          min="0"
                          value={quantities[size] || 0}
                          onChange={(e) => handleQuantityChange(size, e.target.value)}
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-lg py-1.5 text-center text-xs font-black text-blue-600 outline-none focus:border-black"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-gray-200">
                  <span className="text-xs font-black text-gray-700 uppercase">মোট যোগ হচ্ছে:</span>
                  <span className="text-base font-black text-emerald-600">{totalQuantityAdded} পিস</span>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center bg-gray-50/50 space-y-2">
                <Package size={24} className="mx-auto text-gray-400" />
                <p className="text-xs font-bold text-gray-500 uppercase">কোনো প্রোডাক্ট সিলেক্ট করা হয়নি</p>
                <p className="text-[10px] text-gray-400">উপরে সার্চ বক্স থেকে প্রোডাক্ট সিলেক্ট করুন।</p>
              </div>
            )}

            {/* Authorized By & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-gray-700 tracking-wider">
                  গ্রহীতা / অনুমোদনকারী
                </label>
                <input 
                  type="text"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  placeholder="যেমন: Sabbir Hossain"
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-gray-700 tracking-wider">
                  নোট / মন্তব্য
                </label>
                <input 
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="যেমন: নতুন সাপ্লাই ব্যাচ"
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-black"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedProduct || totalQuantityAdded <= 0}
              className={cn(
                "w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer",
                submitting || !selectedProduct || totalQuantityAdded <= 0
                  ? "bg-gray-300 cursor-not-allowed shadow-none"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
              )}
            >
              {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {submitting ? 'সংরক্ষণ হচ্ছে...' : `স্টক ইন কনফার্ম করুন (${totalQuantityAdded} পিস)`}
            </button>
          </form>
        </div>

        {/* Right: Recent Stock In Logs */}
        <div className="lg:col-span-6 bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={16} className="text-emerald-600" /> সাম্প্রতিক স্টক ইন ইতিহাস (Stock In History)
            </h4>
            <span className="text-xs font-bold text-gray-400 font-mono">
              মোট: {stockInTransactions.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {stockInTransactions.map((tx) => (
              <div 
                key={tx.id}
                className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl p-4 space-y-2.5 shadow-xs hover:border-emerald-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-mono font-bold uppercase">
                      +{tx.totalQuantity} পিস
                    </span>
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-mono font-bold uppercase border border-gray-200">
                      {tx.sku}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-400">
                    {new Date(tx.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-gray-900 uppercase italic line-clamp-1">{tx.productName}</h5>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(tx.quantities || {}).filter(([_, q]) => Number(q) > 0).map(([sz, q]) => (
                      <span key={sz} className="px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700">
                        {sz}: <span className="text-emerald-600 font-black">+{q}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-[10px] text-gray-500">
                  <span>দ্বারা অনুমোদিত: <strong className="text-gray-800">{tx.authorizedBy || 'Admin'}</strong></span>
                  {tx.notes && <span className="italic text-gray-400">নোট: {tx.notes}</span>}
                </div>
              </div>
            ))}

            {stockInTransactions.length === 0 && (
              <div className="py-20 text-center space-y-3 bg-[#F8F9FD] border border-gray-200 rounded-2xl">
                <Package size={32} className="mx-auto text-gray-300" />
                <p className="text-xs font-black uppercase text-gray-500">কোনো স্টক ইন রেকর্ড পাওয়া যায়নি</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
