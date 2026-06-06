import React, { useState, useMemo } from 'react';
import { 
  Database, 
  ArrowDownToLine, 
  Search, 
  ChevronDown, 
  SlidersHorizontal,
  RefreshCw,
  Tag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  TrendingDown,
  CircleDollarSign,
  Percent,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';

const MATRIX_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

export default function AdminCategories(): React.JSX.Element {
  const { products, updateProduct, loading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { currency, rate } = useCurrency();

  // Active Management Tab: STOCK | PRICE | SALE
  const [activeTab, setActiveTab] = useState<'STOCK' | 'PRICE' | 'SALE'>('STOCK');

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [stockLevelFilter, setStockLevelFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('');

  const isActiveFilter = searchTerm.trim() !== '' || stockLevelFilter !== 'ALL' || selectedCategory !== '' || selectedSizeFilter !== '';

  // Editing state for inline cell input
  const [editingCell, setEditingCell] = useState<{ productId: string; field: string; size?: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // 1. Dynamic categories extraction with real count calculations
  // Fits user intent: "abong any category filters e click korar option e dekhabe amader website e jei koyta category product ache abong nxt time kokhono cetagory add korle porew jate dekha jabe sei vabe set korbe"
  const dynamicCategories = useMemo(() => {
    // Collect all unique categories directly from currently active products database + standard categories context to ensure it scales
    const productCategories = products.map(p => p.category).filter(Boolean);
    const categoryCtxNames = categories.map(c => c.name);
    const combined = Array.from(new Set([...categoryCtxNames, ...productCategories]));

    return combined.map(catName => {
      const count = products.filter(p => p.category?.toLowerCase() === catName.toLowerCase()).length;
      return {
        name: catName,
        count
      };
    }).sort((a, b) => b.count - a.count);
  }, [products, categories]);

  // 2. Filter products dynamically based on user selections
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Name & SKU query matching
      const matchesSearch = searchTerm.trim() === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter matching
      const matchesCategory = selectedCategory === '' || 
        product.category?.toLowerCase() === selectedCategory.toLowerCase();

      // Size stock filter (if looking for a specific size in general)
      const matchesSize = selectedSizeFilter === '' || 
        (product.sizes && product.sizes.includes(selectedSizeFilter));

      // Stock level specific checks
      if (stockLevelFilter === 'OUT') {
        if (product.stock > 0) return false;
      } else if (stockLevelFilter === 'LOW') {
        const isLowInAnySize = MATRIX_SIZES.some(sz => {
          const sizeQty = product.sizeStock?.[sz] ?? 0;
          return sizeQty > 0 && sizeQty < 5;
        });
        if (!isLowInAnySize && product.stock >= 10) return false;
      }

      return matchesSearch && matchesCategory && matchesSize;
    });
  }, [products, searchTerm, stockLevelFilter, selectedCategory, selectedSizeFilter]);

  // Group products by dynamic Category to form the beautiful subsection layout
  const groupedProducts = useMemo(() => {
    const groups: Record<string, typeof filteredProducts> = {};
    
    filteredProducts.forEach(prod => {
      const cat = prod.category || 'Uncategorized';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(prod);
    });

    return Object.entries(groups).map(([catName, list]) => ({
      categoryName: catName,
      productsList: list.sort((a, b) => a.name.localeCompare(b.name))
    })).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [filteredProducts]);

  // Inline edit submission handler
  const handleInlineSave = async (productId: string, field: string, size?: string) => {
    const productToUpdate = products.find(p => p.id === productId);
    if (!productToUpdate) return;

    try {
      let updatedProduct = { ...productToUpdate };

      if (field === 'stock' && size) {
        const numericVal = parseInt(editValue, 10);
        if (isNaN(numericVal) || numericVal < 0) {
          toast.error('Invalid quantity value');
          return;
        }
        
        // Update size specific stock
        const newSizeStock = { ...productToUpdate.sizeStock, [size]: numericVal };
        // Recalculate total quantity stock
        const totalStock = Object.values(newSizeStock).reduce((sum, val) => sum + val, 0);

        updatedProduct.sizeStock = newSizeStock;
        updatedProduct.stock = totalStock;
      } 
      else if (field === 'price') {
        const numericVal = parseFloat(editValue);
        if (isNaN(numericVal) || numericVal < 0) {
          toast.error('Invalid prize amount');
          return;
        }
        updatedProduct.price = numericVal;
        updatedProduct.regularPrice = numericVal;
      } 
      else if (field === 'discount') {
        const numericVal = parseFloat(editValue);
        if (isNaN(numericVal) || numericVal < 0 || numericVal > 100) {
          toast.error('Discount must be between 0 and 100%');
          return;
        }
        updatedProduct.discount = numericVal;
        // recalculate sale price
        if (numericVal > 0) {
          updatedProduct.salePrice = Math.round(productToUpdate.price * (1 - numericVal / 100));
        } else {
          updatedProduct.salePrice = undefined;
        }
      }

      await updateProduct(updatedProduct);
      toast.success('Matrix entry committed successfully');
    } catch (err) {
      toast.error('Failed to commit change');
    } finally {
      setEditingCell(null);
    }
  };

  // Safe Excel/CSV Export handler
  const handleExportCSV = () => {
    try {
      if (filteredProducts.length === 0) {
        toast.error('No products to export');
        return;
      }

      // Generate precise CSV content headers
      let csvContent = 'SKU,Product Name,Category,Price,Regular Price,Discount (%),XS,S,M,L,XL,2XL,3XL,4XL,Total Stock\r\n';

      filteredProducts.forEach(p => {
        const row = [
          `"${p.sku || ''}"`,
          `"${p.name.replace(/"/g, '""')}"`,
          `"${p.category || 'N/A'}"`,
          p.price,
          p.regularPrice || p.price,
          p.discount || 0,
          p.sizeStock?.['XS'] ?? 0,
          p.sizeStock?.['S'] ?? 0,
          p.sizeStock?.['M'] ?? 0,
          p.sizeStock?.['L'] ?? 0,
          p.sizeStock?.['XL'] ?? 0,
          p.sizeStock?.['2XL'] ?? 0,
          p.sizeStock?.['3XL'] ?? 0,
          p.sizeStock?.['4XL'] ?? 0,
          p.stock
        ].join(',');
        csvContent += row + '\r\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Elegan_BD_Inventory_Matrix_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Spreadsheet exported successfully');
    } catch {
      toast.error('Failed to generate export file');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setStockLevelFilter('ALL');
    setSelectedCategory('');
    setSelectedSizeFilter('');
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-[#0C1421]">
      
      {/* Title Header Section matching screenshot */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E04622]/10 text-[#E04622] flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-black text-[#0D1829] tracking-tight">Inventory Matrix</h1>
              <span className="bg-[#EEF2FF] text-[#5D63D3] font-black text-xs px-2 py-0.5 rounded-full inline-block tracking-tight">
                {products.length}
              </span>
            </div>
            <p className="text-[12px] text-[#62758A] font-semibold mt-0.5">Stock & Pricing Management Console</p>
          </div>
        </div>

        {/* Global Stock Stats Quick summary Cards */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-white border border-[#F0F2F5] rounded-xl px-5 py-2.5 shadow-xs flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
            <div className="leading-tight">
              <span className="text-[10px] uppercase font-black text-gray-400">Total Units</span>
              <p className="text-sm font-black text-[#0C1421]">{products.reduce((acc, p) => acc + p.stock, 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white border border-[#F0F2F5] rounded-xl px-5 py-2.5 shadow-xs flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF8800] shrink-0" />
            <div className="leading-tight">
              <span className="text-[10px] uppercase font-black text-gray-400">Low Stock Lines</span>
              <p className="text-sm font-black text-[#0C1421]">
                {products.filter(p => MATRIX_SIZES.some(sz => (p.sizeStock?.[sz] ?? 0) > 0 && (p.sizeStock?.[sz] ?? 0) < 5)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Action Panel matching screenshot row design */}
      <div className="bg-white rounded-2xl p-4 border border-[#EFF2F6] shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left Side: Buttons and Segments */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Green EXPORT Button */}
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-[11px] tracking-widest uppercase px-5 py-3 rounded-xl transition-all shadow-sm shadow-[#10B981]/20 group shrink-0"
          >
            <ArrowDownToLine size={13} className="stroke-[2.5] group-hover:translate-y-[1px] transition-transform" />
            <span>EXPORT</span>
          </button>

          {/* Refresh Action Trigger */}
          <button 
            onClick={() => {
              window.location.reload();
            }}
            title="Reload Database"
            className="w-10 h-10 border border-[#EFF2F6] rounded-xl flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 transition-all shrink-0"
          >
            <RefreshCw size={14} className="stroke-[2.5]" />
          </button>

          {/* Segments: STOCK | PRICE | SALE */}
          <div className="bg-[#F1F5F9] p-1 rounded-xl flex items-center gap-1">
            {(['STOCK', 'PRICE', 'SALE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setEditingCell(null);
                }}
                className={`px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-[#5D63D3] shadow-xs' 
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Search and Filters with fully dynamic loaded Category select options */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1 xl:justify-end">
          
          {/* Search Box */}
          <div className="relative flex-1 md:max-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAFC] border-none text-[12px] font-semibold rounded-xl placeholder-gray-400 text-[#0C1421] focus:ring-2 focus:ring-[#EEF2FF] focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Stock Dropdown */}
          <div className="relative">
            <select
              value={stockLevelFilter}
              onChange={(e) => setStockLevelFilter(e.target.value as any)}
              className="pl-3.5 pr-8 py-2.5 bg-[#F8FAFC] border-none text-[10px] font-extrabold uppercase tracking-wider rounded-xl text-[#62758A] focus:ring-2 focus:ring-[#EEF2FF] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">ALL STOCK</option>
              <option value="LOW">LOW STOCK</option>
              <option value="OUT">OUT OF STOCK</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          </div>

          {/* Dynamic Category selection to scale as products grow */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-3.5 pr-8 py-2.5 bg-[#F8FAFC] border-none text-[10px] font-extrabold uppercase tracking-wider rounded-xl text-[#62758A] focus:ring-2 focus:ring-[#EEF2FF] outline-none transition-all appearance-none cursor-pointer max-w-[180px]"
            >
              <option value="">ANY CATEGORY</option>
              {dynamicCategories.map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.name.toUpperCase()} ({cat.count})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          </div>

          {/* Size Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedSizeFilter}
              onChange={(e) => setSelectedSizeFilter(e.target.value)}
              className="pl-3.5 pr-8 py-2.5 bg-[#F8FAFC] border-none text-[10px] font-extrabold uppercase tracking-wider rounded-xl text-[#62758A] focus:ring-2 focus:ring-[#EEF2FF] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">ANY SIZE</option>
              {MATRIX_SIZES.map(sz => (
                <option key={sz} value={sz}>{sz.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          </div>

          {isActiveFilter && (
            <button 
              onClick={handleResetFilters}
              className="text-[10px] font-extrabold text-[#D83A1F] uppercase tracking-wider hover:underline px-2"
            >
              Clear
            </button>
          )}

        </div>
      </div>

      {/* Main Matrix Workspace Table Layout */}
      <div className="bg-white rounded-[24px] border border-[#EFF2F6] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.015)]">
        <div className="overflow-x-auto no-scrollbar">
          
          <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
            {/* Table Column width definitions */}
            <colgroup>
              {/* Product Info details gets maximum space */}
              <col className="w-[320px]" /> 
              {/* Size columns are equal width */}
              {MATRIX_SIZES.map((_, i) => (
                <col key={i} className="w-[80px]" />
              ))}
            </colgroup>

            {/* Header row exactly showing sizes or price fields */}
            <thead>
              <tr className="bg-[#FAFBFD] border-b border-[#EFF2F6] h-14">
                <th className="px-6 text-[10px] font-black uppercase tracking-widest text-[#8292A1] uppercase">
                  PRODUCT DETAILS
                </th>
                
                {activeTab === 'STOCK' ? (
                  // Size columns for stock view
                  MATRIX_SIZES.map((size) => (
                    <th key={size} className="text-center text-[10px] font-black uppercase tracking-widest text-[#8292A1]">
                      {size}
                    </th>
                  ))
                ) : activeTab === 'PRICE' ? (
                  // Column headers for interactive pricing
                  <>
                    <th colSpan={3} className="text-center text-[10px] font-black uppercase tracking-widest text-[#8292A1]">
                      REGULAR PRICE
                    </th>
                    <th colSpan={5} className="text-center text-[10px] font-black uppercase tracking-widest text-[#8292A1]">
                      COST PRICE (MARGIN EVALUATION)
                    </th>
                  </>
                ) : (
                  // Column headers for discounting
                  <>
                    <th colSpan={3} className="text-center text-[10px] font-black uppercase tracking-widest text-[#8292A1]">
                      DISCOUNT RATE (%)
                    </th>
                    <th colSpan={5} className="text-center text-[10px] font-black uppercase tracking-widest text-[#8292A1]">
                      CALCULATED SALE PRICE
                    </th>
                  </>
                )}
              </tr>
            </thead>

            {/* Structured Table Body organized in categorized sections */}
            <tbody className="divide-y divide-[#EFF2F6]">
              {productsLoading ? (
                <tr>
                  <td colSpan={1 + MATRIX_SIZES.length} className="py-24 text-center">
                    <RefreshCw className="animate-spin w-8 h-8 text-[#5D63D3] mx-auto mb-3" />
                    <p className="text-xs text-[#8292A1] font-black tracking-widest uppercase">Fetching Live Ledger...</p>
                  </td>
                </tr>
              ) : groupedProducts.length === 0 ? (
                <tr>
                  <td colSpan={1 + MATRIX_SIZES.length} className="py-24 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto mb-4 border border-gray-150">
                      <SlidersHorizontal className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-black text-[#0D1829] uppercase">No Dynamic Matches Found</p>
                    <p className="text-xs text-gray-400 mt-1">Try to clear active filters or refine search query.</p>
                  </td>
                </tr>
              ) : (
                groupedProducts.map(({ categoryName, productsList }) => (
                  <React.Fragment key={categoryName}>
                    
                    {/* Category Subsection Title banner matching screenshot exactly! */}
                    <tr className="bg-[#FAFBFD]/80 select-none">
                      <td colSpan={1 + MATRIX_SIZES.length} className="px-6 py-4 border-y border-[#EFF2F6]">
                        <div className="flex items-center space-x-3">
                          <span className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0" />
                          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#3B82F6]">
                            {categoryName}
                          </span>
                          <span className="bg-white border border-gray-100 text-gray-500 font-extrabold text-[9px] px-2 py-0.5 rounded-full inline-block tracking-tight">
                            {productsList.length} PRODUCTS
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Products Rows within this category group */}
                    {productsList.map((product) => {
                      return (
                        <tr key={product.id} className="hover:bg-gray-50/60 transition-colors group h-18">
                          
                          {/* PRODUCT DETAILS (Image, name, SKU badge below, clock, category) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3.5 min-w-0">
                              
                              {/* Small rounded thumbnail image */}
                              <div className="w-11 h-11 rounded-lg border border-gray-150 overflow-hidden bg-white p-1 shrink-0 flex items-center justify-center">
                                {product.images?.[0] ? (
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.name} 
                                    className="w-full h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-[9px] font-black text-gray-300">ELEGAN BD</span>
                                )}
                              </div>

                              {/* Information stack */}
                              <div className="min-w-0 leading-tight">
                                {/* Bold, UPPERCASE name exactly like "BAND COLLAR SHIRT" */}
                                <h4 className="text-[12px] font-black text-[#0C1421] tracking-tight uppercase truncate">
                                  {product.name}
                                </h4>
                                
                                {/* SKU, Clock and Category metadata line matching screenshot */}
                                <div className="flex items-center gap-2.5 mt-1 text-[#8292A1]">
                                  {product.sku && (
                                    <span className="text-[9px] font-black bg-[#E8ECEF] text-gray-600 px-1.5 py-0.5 rounded leading-none">
                                      {product.sku.toUpperCase()}
                                    </span>
                                  )}
                                  <Clock size={10} className="shrink-0 text-gray-300" />
                                  <span className="text-[9px] font-bold text-gray-400 capitalize truncate flex items-center gap-1">
                                    <Tag size={9} className="stroke-[2.5]" />
                                    {product.category?.toLowerCase() || 'general'}
                                  </span>
                                </div>
                              </div>

                            </div>
                          </td>

                          {/* DYNAMIC VIEW SHEETS (Based on active segment tabs: STOCK, PRICE, SALE) */}
                          {activeTab === 'STOCK' ? (
                            
                            // 1. Stock quantity values per size
                            MATRIX_SIZES.map((size) => {
                              const qty = product.sizeStock?.[size] ?? 0;
                              const isEditing = editingCell?.productId === product.id && editingCell?.field === 'stock' && editingCell?.size === size;
                              
                              return (
                                <td 
                                  key={size}
                                  onClick={() => {
                                    if (!isEditing) {
                                      setEditingCell({ productId: product.id, field: 'stock', size });
                                      setEditValue(qty.toString());
                                    }
                                  }}
                                  className={`text-center font-semibold text-xs transition-all relative cursor-pointer border-l border-gray-50 hover:bg-gray-100 ${
                                    qty === 0 
                                      ? 'text-gray-300' 
                                      : qty < 5 
                                        ? 'text-amber-600 bg-amber-50/20' 
                                        : 'text-[#0C1421]'
                                  }`}
                                >
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      autoFocus
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => handleInlineSave(product.id, 'stock', size)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineSave(product.id, 'stock', size);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      className="absolute inset-0 w-full h-full text-center bg-[#EEF2FF] text-[#5D63D3] font-black focus:outline-none border-2 border-[#5D63D3] rounded"
                                    />
                                  ) : (
                                    qty
                                  )}
                                </td>
                              );
                            })

                          ) : activeTab === 'PRICE' ? (
                            
                            // 2. Interactive Product Price management
                            <>
                              <td 
                                colSpan={3} 
                                onClick={() => {
                                  setEditingCell({ productId: product.id, field: 'price' });
                                  setEditValue(product.price.toString());
                                }}
                                className="text-center font-bold text-xs cursor-pointer hover:bg-gray-100 transition-all border-l border-gray-50 text-[#0C1421] relative"
                              >
                                {editingCell?.productId === product.id && editingCell?.field === 'price' ? (
                                  <input
                                    type="number"
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleInlineSave(product.id, 'price')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineSave(product.id, 'price');
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    className="absolute inset-0 w-full h-full text-center bg-[#EEF2FF] text-[#5D63D3] font-black focus:outline-none border-2 border-[#5D63D3] rounded"
                                  />
                                ) : (
                                  formatPrice(product.price, currency, rate)
                                )}
                              </td>

                              <td colSpan={5} className="text-center font-mono text-[11px] text-gray-400 bg-gray-50/60 transition-all border-l border-gray-50">
                                {/* Showcase average profit margins visually */}
                                <div className="flex items-center justify-center space-x-1.5 font-bold">
                                  <CircleDollarSign size={12} className="text-gray-300" />
                                  <span>Margin: ~40%</span>
                                </div>
                              </td>
                            </>

                          ) : (
                            
                            // 3. Discount rate and outcome sale price
                            <>
                              <td 
                                colSpan={3} 
                                onClick={() => {
                                  setEditingCell({ productId: product.id, field: 'discount' });
                                  setEditValue((product.discount ?? 0).toString());
                                }}
                                className="text-center font-extrabold text-xs cursor-pointer hover:bg-gray-100 transition-all border-l border-gray-50 relative text-[#E04622]"
                              >
                                {editingCell?.productId === product.id && editingCell?.field === 'discount' ? (
                                  <input
                                    type="number"
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleInlineSave(product.id, 'discount')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineSave(product.id, 'discount');
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    className="absolute inset-0 w-full h-full text-center bg-[#EEF2FF] text-[#5D63D3] font-black focus:outline-none border-2 border-[#5D63D3] rounded"
                                  />
                                ) : (
                                  `${product.discount ?? 0}%`
                                )}
                              </td>

                              <td colSpan={5} className="text-center font-bold text-xs bg-gray-50/60 text-[#10B981] transition-all border-l border-gray-50">
                                {product.discount && product.discount > 0 ? (
                                  <div className="flex items-center justify-center space-x-1.5">
                                    <Percent size={11} />
                                    <span>{formatPrice(Math.round(product.price * (1 - product.discount / 100)), currency, rate)}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-300 font-semibold uppercase">No active promo</span>
                                )}
                              </td>
                            </>

                          )}

                        </tr>
                      );
                    })}

                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>

        </div>
      </div>

      {/* Quick Interactive Tooltip guide inside Master Table Matrix footer */}
      <div className="bg-[#EEF2FF]/60 rounded-xl p-4 border border-[#EFF2F6] flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-[#5D63D3] shrink-0 mt-0.5" />
        <div className="text-left leading-relaxed">
          <h5 className="text-[12px] font-black text-[#5D63D3] uppercase tracking-wider">Interactive Matrix Guides</h5>
          <p className="text-[11px] text-[#4A5E73] font-medium mt-1">
            You can dynamically edit any sizing quantity or product metrics in real-time. Simply <strong className="font-extrabold text-[#0C1421]">click on any table cell value</strong> to edit immediately on-the-fly. The total category stock sums will be automatically updated and saved.
          </p>
        </div>
      </div>

    </div>
  );
}
