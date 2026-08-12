import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Search, 
  Filter, 
  ChevronDown, 
  Download, 
  Tag, 
  AlertTriangle, 
  Check, 
  X, 
  Edit2,
  DollarSign,
  Package,
  Boxes,
  Grid3X3,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../contexts/ProductContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function AdminMasterTable(): React.JSX.Element {
  const { products, updateProduct, loading } = useProducts();
  const { categories } = useCategories();
  const { currency } = useCurrency();
  const navigate = useNavigate();

  // Active matrix mode: 'STOCK' | 'PRICE'
  const [activeMode, setActiveMode] = useState<'STOCK' | 'PRICE'>('STOCK');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All'); // 'All' | 'Low' | 'Out'
  const [pageSize, setPageSize] = useState<number | 'All'>(100);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    productId: string;
    field: string; // 'price' | 'salePrice' | size (e.g. 'M', 'XL')
    value: string;
  } | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);

  // Standard sizes ordered logically (numerical pants sizes first, then standard letter sizes)
  const standardSizesOrder = [
    '28', '30', '32', '34', '36', '38', '40',
    'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL', '11XL', '12XL'
  ];

  // Dynamically extract all sizes actually present/active in any product of our website
  const activeSizes = useMemo(() => {
    const sizesSet = new Set<string>();
    products.forEach(p => {
      if (p.sizes && Array.isArray(p.sizes)) {
        p.sizes.forEach(s => {
          if (s) sizesSet.add(s);
        });
      }
      if (p.sizeStock) {
        Object.keys(p.sizeStock).forEach(s => {
          if (s) sizesSet.add(s);
        });
      }
    });

    // Default to a fallback list if there are no active sizes yet
    if (sizesSet.size === 0) {
      return ['M', 'L', 'XL', '2XL'];
    }

    // Sort according to standardSizesOrder, and put any other custom sizes at the end
    const sorted = standardSizesOrder.filter(size => sizesSet.has(size));
    Array.from(sizesSet).forEach(size => {
      if (!standardSizesOrder.includes(size)) {
        sorted.push(size);
      }
    });

    return sorted;
  }, [products]);

  // Dynamic list of categories from products + categories context
  const categoriesList = useMemo(() => {
    const listFromCtx = categories.map(c => c.name);
    const listFromProducts = products.map(p => p.category).filter(Boolean);
    const combined = Array.from(new Set([...listFromCtx, ...listFromProducts]));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [categories, products]);

  // Total global stock counter for top banner card
  const globalTotalUnits = useMemo(() => {
    return products.reduce((acc, p) => {
      if (p.sizes && p.sizes.length > 0) {
        const sumSizes = Object.values(p.sizeStock || {}).reduce((s, q) => s + (Number(q) || 0), 0);
        return acc + sumSizes;
      }
      return acc + (Number(p.stock) || 0);
    }, 0);
  }, [products]);

  // Filtered products list matching active search & dropdowns
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search term matching (SKU or Product Name)
      const matchesSearch = searchTerm.trim() === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category matching
      const matchesCategory = selectedCategory === 'All' || 
        product.category?.toLowerCase() === selectedCategory.toLowerCase();

      // Stock level matching
      let matchesStock = true;
      const totalStock = product.sizes && product.sizes.length > 0
        ? Object.values(product.sizeStock || {}).reduce((s, q) => s + (Number(q) || 0), 0)
        : (product.stock || 0);

      if (stockFilter === 'Low') {
        matchesStock = totalStock > 0 && totalStock <= 5;
      } else if (stockFilter === 'Out') {
        matchesStock = totalStock === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // Paged products according to selected pageSize dropdown
  const displayedProducts = useMemo(() => {
    if (pageSize === 'All') return filteredProducts;
    return filteredProducts.slice(0, pageSize);
  }, [filteredProducts, pageSize]);

  // Group displayed products by category for rendering sections
  const groupedProducts = useMemo(() => {
    const groups: Record<string, typeof displayedProducts> = {};
    displayedProducts.forEach(product => {
      const cat = product.category || 'Uncategorized';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(product);
    });
    return groups;
  }, [displayedProducts]);

  // Export functions (CSV download)
  const handleExport = () => {
    try {
      let headers = ['Product Name', 'SKU', 'Category', 'Price', 'Sale Price'];
      activeSizes.forEach(size => headers.push(`Stock ${size}`));
      headers.push('Total Stock');

      const rows = filteredProducts.map(p => {
        const rowData = [
          `"${p.name.replace(/"/g, '""')}"`,
          p.sku || '',
          p.category || 'Uncategorized',
          p.price,
          p.salePrice || '',
        ];
        
        // Add size stock
        activeSizes.forEach(size => {
          rowData.push(p.sizeStock?.[size] ?? 0);
        });

        // Add total stock
        const totalStock = p.sizes && p.sizes.length > 0
          ? Object.values(p.sizeStock || {}).reduce((s, q) => s + (Number(q) || 0), 0)
          : (p.stock || 0);
        rowData.push(totalStock);

        return rowData.join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Inventory_Matrix_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Matrix data exported successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export matrix data');
    }
  };

  // Handle cell edit trigger
  const handleCellClick = (productId: string, field: string, currentValue: any) => {
    setEditingCell({
      productId,
      field,
      value: String(currentValue ?? '')
    });
  };

  // Save edited cell to Firestore/context
  const handleSaveCell = async (targetCell = editingCell) => {
    if (!targetCell) return;
    const { productId, field, value } = targetCell;
    const numValue = Number(value);

    // Find the product
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setSavingId(productId);
    try {
      const updatedProduct = { ...product };

      if (field === 'price') {
        if (isNaN(numValue) || numValue < 0) {
          toast.error('Invalid price value');
          setSavingId(null);
          return;
        }
        updatedProduct.price = numValue;
      } else if (field === 'salePrice') {
        if (value === '') {
          updatedProduct.salePrice = undefined;
        } else {
          if (isNaN(numValue) || numValue < 0) {
            toast.error('Invalid sale price value');
            setSavingId(null);
            return;
          }
          updatedProduct.salePrice = numValue;
        }
      } else {
        // Size stock edit
        if (isNaN(numValue) || numValue < 0) {
          toast.error('Invalid stock quantity');
          setSavingId(null);
          return;
        }
        const updatedSizeStock = { ...(product.sizeStock || {}) };
        updatedSizeStock[field] = Math.round(numValue);
        updatedProduct.sizeStock = updatedSizeStock;

        // Ensure current sizes array contains this edited size
        if (!updatedProduct.sizes.includes(field)) {
          updatedProduct.sizes = [...updatedProduct.sizes, field];
        }

        // Recalculate global stock
        updatedProduct.stock = Object.values(updatedSizeStock).reduce((s, q) => s + (Number(q) || 0), 0);
      }

      await updateProduct(updatedProduct);
      toast.success('Matrix updated successfully');
      setEditingCell(prev => (prev === targetCell ? null : prev));
    } catch (error) {
      console.error(error);
      toast.error('Failed to save changes');
    } finally {
      setSavingId(null);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent, productId: string, currentSize: string, sizesList: string[]) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSaveCell();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const current = editingCell;
      if (current) {
        await handleSaveCell(current);
        const currentIndex = sizesList.indexOf(currentSize);
        if (currentIndex >= 0 && currentIndex < sizesList.length - 1) {
          const nextSize = sizesList[currentIndex + 1];
          const product = products.find(p => p.id === productId);
          if (product) {
            setEditingCell({
              productId,
              field: nextSize,
              value: String(product.sizeStock?.[nextSize] ?? 0)
            });
          }
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="w-full h-full p-4 md:p-6 pb-12 font-sans text-[#1E293B]">
      
      {/* HEADER SECTION (Master Inventory Matrix UI) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E6ECF4] border border-white/90 flex items-center justify-center shrink-0 shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)]">
            <Grid3X3 className="w-6 h-6 text-[#f97316]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                Master Inventory Matrix
              </h1>
              <span className="bg-[#E2E8F2] border border-white/80 text-[#334155] px-3 py-1 rounded-full text-xs font-black tracking-wider whitespace-nowrap shadow-[inset_1px_1px_3px_rgba(160,175,200,0.2)]">
                {filteredProducts.length} of {products.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
              Stock & pricing master database
            </p>
          </div>
        </div>

        {/* Global Stock Counter Card & Top Utilities */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Segmented Mode Selector */}
          <div className="bg-[#DCE3EE] p-1.5 rounded-full flex items-center border border-white/80 shadow-[inset_2px_2px_5px_rgba(160,175,200,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
            {(['STOCK', 'PRICE'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setActiveMode(mode);
                  setEditingCell(null);
                }}
                className={`px-5 py-1.5 rounded-full text-xs font-black tracking-wider transition-all duration-200 cursor-pointer ${
                  activeMode === mode 
                    ? 'bg-[#E6ECF4] text-[#f97316] shadow-[-4px_-4px_10px_rgba(255,255,255,0.95),4px_4px_10px_rgba(165,180,205,0.35)] border border-white' 
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="bg-[#00A36C] hover:bg-[#008f5c] text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[-3px_-3px_8px_rgba(255,255,255,0.8),3px_3px_8px_rgba(165,180,205,0.3)]"
          >
            <Download size={14} className="stroke-[2.5]" />
            <span>Export</span>
          </button>

          {/* History Button */}
          <button
            onClick={() => navigate('/admin/inventory-log')}
            className="bg-[#E6ECF4] border border-white/90 hover:bg-[#DEE5F0] text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)]"
          >
            <History size={14} className="text-slate-600" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-[#E6ECF4] p-4 rounded-3xl border border-white/90 flex flex-col xl:flex-row xl:items-center gap-3.5 mb-6 shadow-[-6px_-6px_14px_rgba(255,255,255,0.95),6px_6px_16px_rgba(165,180,205,0.35)]">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] w-4.5 h-4.5" />
          <input 
            type="text"
            placeholder="Search product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#E2E8F2] border border-white/60 text-xs font-bold rounded-2xl placeholder-[#64748B] text-slate-800 focus:ring-2 focus:ring-[#f97316]/20 focus:bg-[#E6ECF4] outline-none transition-all shadow-[inset_3px_3px_6px_rgba(160,175,200,0.25),inset_-3px_-3px_6px_rgba(255,255,255,0.9)]"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3.5 w-full xl:w-auto">
          {/* Stock Filter */}
          <div className="relative w-full sm:w-44">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-[#E2E8F2] border border-white/60 text-xs font-black uppercase tracking-wider rounded-2xl text-[#3A4557] focus:ring-2 focus:ring-[#f97316]/20 outline-none transition-all cursor-pointer appearance-none shadow-[inset_3px_3px_6px_rgba(160,175,200,0.25),inset_-3px_-3px_6px_rgba(255,255,255,0.9)]"
            >
              <option value="All">Stock: All</option>
              <option value="Low">Stock: Low (1-5)</option>
              <option value="Out">Stock: Out</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] w-4.5 h-4.5 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-[#E2E8F2] border border-white/60 text-xs font-black uppercase tracking-wider rounded-2xl text-[#3A4557] focus:ring-2 focus:ring-[#f97316]/20 outline-none transition-all cursor-pointer appearance-none shadow-[inset_3px_3px_6px_rgba(160,175,200,0.25),inset_-3px_-3px_6px_rgba(255,255,255,0.9)]"
            >
              <option value="All">Category: All</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] w-4.5 h-4.5 pointer-events-none" />
          </div>

          {/* Preset Filter Indicator Button */}
          <button className="bg-[#E6ECF4] border border-white/90 hover:bg-[#DEE5F0] text-[#3A4557] px-5 py-2.5 rounded-2xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer uppercase shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)]">
            <Filter className="w-4 h-4 text-[#64748B]" />
            <span>Filter</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>

          {/* Page Limit Selector */}
          <div className="relative w-full sm:w-36 sm:ml-auto xl:ml-0">
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value;
                setPageSize(val === 'All' ? 'All' : Number(val));
              }}
              className="w-full pl-4 pr-10 py-2.5 bg-[#E2E8F2] border border-white/60 text-xs font-black uppercase tracking-wider rounded-2xl text-[#3A4557] focus:ring-2 focus:ring-[#f97316]/20 outline-none transition-all cursor-pointer appearance-none shadow-[inset_3px_3px_6px_rgba(160,175,200,0.25),inset_-3px_-3px_6px_rgba(255,255,255,0.9)]"
            >
              <option value={100}>Show 100</option>
              <option value={250}>Show 250</option>
              <option value={500}>Show 500</option>
              <option value="All">Show All</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] w-4.5 h-4.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* MATRIX TABLE CONTAINER */}
      <div className="bg-[#E6ECF4] rounded-[24px] border border-white/90 shadow-[-6px_-6px_16px_rgba(255,255,255,0.95),6px_6px_18px_rgba(165,180,205,0.35)] overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-xs font-bold text-[#7C88A1] uppercase tracking-widest animate-pulse">
            Syncing Master Database Matrix...
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="p-20 text-center text-xs font-bold text-[#7C88A1] uppercase tracking-widest">
            No matching products found.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              
              {/* Table Double Headers */}
              <thead>
                {/* Level 1 Spanned Size Category Label */}
                <tr className="border-b border-white/80 text-[10px] font-extrabold tracking-widest uppercase text-slate-600 select-none bg-[#DCE3EE]">
                  <th className="py-3.5 px-5 font-black text-[#334155] text-left border-r border-white/80 w-[350px]">
                    PRODUCT DETAILS
                  </th>
                  <th colSpan={activeSizes.length} className="py-2 px-2 text-center text-[#f97316] font-black tracking-widest text-[10px] border-r border-white/80">
                    SIZE
                  </th>
                  <th className="py-3.5 px-5 text-center font-black text-[#334155] text-[10px] w-[150px]">
                    {activeMode === 'STOCK' ? 'TOTAL (STOCK)' : 'PRICE'}
                  </th>
                </tr>
                {/* Level 2 Individual Size Columns */}
                <tr className="border-b border-white/80 text-xs font-black uppercase text-[#1e293b] select-none bg-[#D8E0ED]">
                  <th className="py-2.5 px-5 border-r border-white/80 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Styles & Models
                  </th>
                  {activeSizes.map(size => (
                    <th key={size} className="py-2 text-center font-extrabold w-[75px] border-r border-white/80 text-[#1e293b]">
                      {size}
                    </th>
                  ))}
                  <th className="py-2.5 px-5 text-center font-black text-[#1e293b]">
                    {/* Blank or active indicator */}
                  </th>
                </tr>
              </thead>

              {/* Table Body grouped by Categories */}
              <tbody className="divide-y divide-white/60">
                {Object.keys(groupedProducts).map(categoryName => {
                  const items = groupedProducts[categoryName];
                  
                  // Calculate category total stock sum
                  const categoryTotalStock = items.reduce((acc, p) => {
                    if (p.sizes && p.sizes.length > 0) {
                      const sumSizes = Object.values(p.sizeStock || {}).reduce((s, q) => s + (Number(q) || 0), 0);
                      return acc + sumSizes;
                    }
                    return acc + (Number(p.stock) || 0);
                  }, 0);

                  return (
                    <React.Fragment key={categoryName}>
                      {/* CATEGORY BLOCK SEPARATOR ROW */}
                      <tr className="bg-[#D3DCED]">
                        <td colSpan={activeSizes.length + 1} className="py-3 px-5 border-r border-b border-white/80">
                          <div className="flex items-center gap-2 text-xs font-black text-[#f97316] uppercase tracking-wider">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-xs" />
                            <span>{categoryName}</span>
                            <span className="text-slate-500 font-bold font-mono">({items.length})</span>
                          </div>
                        </td>
                        {/* Purple / Indigo block display for total stock */}
                        <td className="bg-[#6366f1] text-white py-3 px-5 text-center font-black text-sm border-b border-[#6366f1]">
                          {categoryTotalStock}
                        </td>
                      </tr>

                      {/* INDIVIDUAL PRODUCTS LIST */}
                      {items.map(product => {
                        const totalUnits = product.sizes && product.sizes.length > 0
                          ? Object.values(product.sizeStock || {}).reduce((s, q) => s + (Number(q) || 0), 0)
                          : (product.stock || 0);

                        return (
                          <tr key={product.id} className="hover:bg-[#DDE5F2] transition-colors h-16 group border-b border-white/60">
                            
                            {/* 1. Product Details column */}
                            <td className="py-2.5 px-5 border-r border-white/80 flex items-center gap-3.5 h-16">
                              <div className="w-10 h-10 rounded-xl bg-[#E2E8F2] border border-white/90 flex items-center justify-center overflow-hidden shrink-0 shadow-[inset_2px_2px_4px_rgba(160,175,200,0.2)]">
                                {product.images?.[0] ? (
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.name} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <Package size={16} className="text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <p className="text-xs font-black text-slate-900 tracking-tight uppercase truncate group-hover:text-[#f97316] transition-colors">
                                  {product.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {product.sku && (
                                    <span className="text-[9.5px] font-extrabold text-slate-600 bg-[#E2E8F2] border border-white/80 px-1.5 py-0.5 rounded-md font-mono shadow-[inset_1px_1px_2px_rgba(160,175,200,0.2)]">
                                      {product.sku}
                                    </span>
                                  )}
                                  <button 
                                    onClick={() => navigate(`/admin/inventory-log?sku=${product.sku}`)}
                                    className="text-slate-400 hover:text-[#f97316] transition-colors p-0.5 rounded cursor-pointer"
                                    title="View inventory history log"
                                  >
                                    <History size={11} />
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* 2. Sizes cells */}
                            {activeSizes.map(size => {
                              const qty = product.sizeStock?.[size];
                              const isSizeConfigured = product.sizes?.includes(size);
                              const hasQty = qty !== undefined && qty > 0;
                              const isEditingThis = editingCell && editingCell.productId === product.id && editingCell.field === size;

                              return (
                                <td 
                                  key={size} 
                                  onClick={() => { if (activeMode === 'STOCK') handleCellClick(product.id, size, qty ?? 0); }}
                                  className={`p-1 text-center border-r border-white/80 select-none cursor-pointer transition-all ${
                                    isEditingThis 
                                      ? 'bg-orange-100/60 p-0' 
                                      : activeMode === 'STOCK' 
                                        ? 'hover:bg-[#D5DFED]' 
                                        : 'bg-[#DEE5F0] cursor-not-allowed'
                                  }`}
                                >
                                  {activeMode === 'STOCK' ? (
                                    isEditingThis ? (
                                      <div className="flex items-center justify-center px-1">
                                        <input 
                                          autoFocus 
                                          type="number" 
                                          value={editingCell.value} 
                                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })} 
                                          onKeyDown={(e) => handleKeyDown(e, product.id, size, activeSizes)}
                                          onBlur={() => {
                                            if (editingCell) handleSaveCell();
                                          }}
                                          className="w-14 text-center py-1 text-xs bg-[#E6ECF4] border border-[#f97316] rounded-lg outline-none font-black text-black shadow-[inset_2px_2px_4px_rgba(160,175,200,0.3)]" 
                                        />
                                      </div>
                                    ) : (
                                      <span className={
                                        isSizeConfigured 
                                          ? hasQty 
                                            ? "text-xs font-black text-slate-800" 
                                            : "text-xs text-slate-500 font-semibold" 
                                          : "text-xs text-slate-400 font-bold"
                                      }>
                                        {isSizeConfigured ? (qty ?? 0) : '-'}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 text-xs font-bold">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* 3. Total / Price / Sale cell */}
                            <td className="py-2 px-4 text-center font-bold text-xs bg-[#DCE3EE]/40">
                              {activeMode === 'STOCK' ? (
                                <span className={`text-xs font-black ${totalUnits === 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                  {totalUnits}
                                </span>
                              ) : (
                                editingCell && editingCell.productId === product.id && editingCell.field === 'price' ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      autoFocus
                                      type="number"
                                      step="any"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveCell();
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      className="w-20 text-center py-1 text-xs border border-[#f97316] rounded bg-[#E6ECF4] text-black outline-none font-bold shadow-[inset_2px_2px_4px_rgba(160,175,200,0.3)]"
                                    />
                                    <button onClick={() => handleSaveCell()} className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700 cursor-pointer"><Check size={10} /></button>
                                    <button onClick={() => setEditingCell(null)} className="bg-rose-500 text-white p-1 rounded hover:bg-rose-600 cursor-pointer"><X size={10} /></button>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => handleCellClick(product.id, 'price', product.price)} 
                                    className="cursor-pointer hover:underline text-xs font-black text-slate-900 flex items-center justify-center gap-1"
                                  >
                                    <span>{formatPrice(product.price)}</span>
                                    <Edit2 size={10} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                  </div>
                                )
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSTRUCTIONAL HELP ROW */}
      <div className="flex items-center justify-between pt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <span>Click STOCK cells to edit inline. Change mode above to edit Price.</span>
        <span>Use Arrow keys & Enter for fast processing.</span>
      </div>
    </div>
  );
}
