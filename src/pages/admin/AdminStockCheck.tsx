import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Package, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  ShoppingBag, 
  Tag,
  Hash,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductContext';
import { Product } from '../../types';
import { cn } from '../../lib/utils';

export default function AdminStockCheck() {
  const { products, loading } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  const getProductSizes = (product: Product) => {
    const cat = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();

    if (cat.includes('shirt') || cat.includes('polo') || cat.includes('panjabi') || name.includes('shirt') || name.includes('polo') || name.includes('panjabi')) {
      return ['M', 'L', 'XL', 'XXL'];
    }
    if (cat.includes('pant') || cat.includes('trouser') || cat.includes('jeans') || name.includes('pant') || name.includes('trouser') || name.includes('jeans')) {
      return ['28', '30', '32', '34', '36', '38', '40'];
    }
    return ['0', '1', '2', '3', '4', '5', '6'];
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return []; // Do not show any products automatically until searched

    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query);
      
      const matchesCategory = selectedCategory === 'all' || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="w-full space-y-8 font-sans pb-16">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-md">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="serif text-2xl sm:text-3xl text-black italic tracking-tighter uppercase font-black">
                  Stock Check & Size Breakdown
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  প্রোডাক্ট কোড বা SKU সার্চ করে যেকোনো পণ্যের লাইভ সাইজভিত্তিক স্টক ও বর্তমান স্ট্যাটাস চেক করুন
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loading && (
              <span className="flex items-center gap-2 text-xs font-bold text-blue-600 animate-pulse bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200">
                <RefreshCw size={14} className="animate-spin" /> সিঙ্ক হচ্ছে...
              </span>
            )}
            <div className="flex items-center gap-3 bg-[#F8F9FD] border border-gray-200/80 px-5 py-3 rounded-2xl">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">মোট প্রডাক্ট</p>
                <p className="text-lg font-black text-gray-900 leading-none">{products.length}</p>
              </div>
              <div className="w-[1px] h-8 bg-gray-200" />
              <div className="text-left">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">ফিল্টারড প্রডাক্ট</p>
                <p className="text-lg font-black text-blue-600 leading-none">{filteredProducts.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="প্রোডাক্ট কোড, SKU (যেমন: ELG-101) অথবা নাম লিখে সার্চ করুন..."
            className="w-full bg-[#F8F9FD] border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:border-black focus:bg-white transition-all shadow-inner"
            autoFocus
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-black bg-gray-200/60 hover:bg-gray-200 px-2.5 py-1 rounded-xl transition-all"
            >
              ক্লিয়ার
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-56 bg-[#F8F9FD] border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-800 outline-none focus:border-black transition-all cursor-pointer"
          >
            <option value="all">সকল ক্যাটাগরি ({products.length})</option>
            {categoriesList.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Stock List */}
      <div className="space-y-4">
        {filteredProducts.map((product) => {
          const sizesObj = product.sizeStock || product.sizes || {};
          const totalStock = Object.values(sizesObj).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
          const hasStock = totalStock > 0;
          const thumbnail = product.images?.[0] || product.image || '/placeholder.png';

          return (
            <div 
              key={product.id}
              className={cn(
                "bg-white border rounded-3xl p-6 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6",
                totalStock === 0 ? "border-red-200 bg-red-50/10" : "border-gray-200/80"
              )}
            >
              {/* Product Info */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-16 h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 shadow-inner relative group">
                  <img 
                    src={thumbnail} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-black text-white rounded-md text-[10px] font-mono font-bold uppercase tracking-wider">
                      {product.sku || `SKU-${product.id.slice(-6)}`}
                    </span>
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                      {product.category || 'General'}
                    </span>
                    {totalStock > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 size={10} />
                        ইন স্টক ({totalStock} পিস)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-md text-[10px] font-black uppercase tracking-wider">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                        স্টক আউট (০ পিস)
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-black text-gray-950 uppercase tracking-tight italic line-clamp-1">
                    {product.name}
                  </h4>

                  <p className="text-xs font-mono font-bold text-blue-600">
                    মূল্য: ৳{product.price || 0} {product.regularPrice ? <span className="line-through text-gray-400 font-normal ml-1">৳{product.regularPrice}</span> : null}
                  </p>
                </div>
              </div>

              {/* Enhanced Size Breakdown Grid/Pills */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto pt-4 xl:pt-0 border-t xl:border-t-0 border-gray-100">
                <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 shrink-0">
                  সাইজ অনুযায়ী স্টক:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const targetSizes = getProductSizes(product);
                    return targetSizes.map(size => {
                      const qty = Number(product.sizeStock?.[size] ?? (product.sizes as any)?.[size] ?? sizesObj[size] ?? 0);
                      return (
                        <div 
                          key={size}
                          className={cn(
                            "px-4 py-2.5 rounded-2xl border text-center flex flex-col items-center min-w-[56px] shadow-xs transition-all",
                            qty > 0 
                              ? "bg-gradient-to-b from-[#F8F9FD] to-white border-blue-200 text-gray-900 shadow-sm ring-1 ring-blue-100" 
                              : "bg-gray-50/80 border-gray-200/60 text-gray-400 opacity-60"
                          )}
                        >
                          <span className="text-[11px] font-black uppercase text-gray-600 tracking-wider">
                            {size}
                          </span>
                          <span className={cn(
                            "text-sm font-black mt-0.5",
                            qty > 0 ? "text-blue-600 font-mono" : "text-gray-400"
                          )}>
                            {qty} <span className="text-[9px] font-normal text-gray-400">পিস</span>
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="py-24 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center bg-[#F8F9FD] space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 shadow-inner">
              <Package size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase tracking-wider text-gray-800">
                {searchQuery.trim() ? 'কোনো প্রোডাক্ট পাওয়া যায়নি' : 'প্রোডাক্ট খুঁজতে সার্চ করুন'}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {searchQuery.trim() 
                  ? 'আপনার সার্চ কোড বা কী-ওয়ার্ড (যেমন SKU বা নাম) দিয়ে আবার চেষ্টা করুন।'
                  : 'স্টক ও সাইজভিত্তিক পরিমাণ দেখতে উপরের বক্সে প্রোডাক্ট কোড, SKU অথবা নাম লিখুন।'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

