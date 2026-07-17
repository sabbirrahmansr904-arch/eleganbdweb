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
  Grid3X3
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function AdminMasterTable(): React.JSX.Element {
  const { products, updateProduct, loading } = useProducts();
  const { categories } = useCategories();
  const { currency } = useCurrency();

  // Active matrix mode: 'STOCK' | 'PRICE' | 'SALE'
  const [activeMode, setActiveMode] = useState<'STOCK' | 'PRICE' | 'SALE'>('STOCK');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All'); // 'All' | 'Low' | 'Out'

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    productId: string;
    field: string; // 'price' | 'salePrice' | size (e.g. 'M', 'XL')
    value: string;
  } | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);

  // Standard sizes to display in columns
  const standardSizes = [
    '28', '30', '32', '34', '36', '38', '40',
    'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL', '11XL', '12XL'
  ];

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

  // Filtered products list
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

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, typeof filteredProducts> = {};
    filteredProducts.forEach(product => {
      const cat = product.category || 'UNCATEGORIZED';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(product);
    });
    return groups;
  }, [filteredProducts]);

  // Export functions (CSV download)
  const handleExport = () => {
    try {
      let headers = ['Product Name', 'SKU', 'Category', 'Price', 'Sale Price'];
      standardSizes.forEach(size => headers.push(`Stock ${size}`));
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
        standardSizes.forEach(size => {
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
  const handleSaveCell = async () => {
    if (!editingCell) return;
    const { productId, field, value } = editingCell;
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
      setEditingCell(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save changes');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans text-[#0C1421] bg-white p-6 md:p-8 rounded-[24px]">
      
      {/* Top Title & Quick Stock Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-black tracking-tighter uppercase">Inventory Matrix</h1>
              <span className="bg-black/5 text-black px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider">
                {products.length}
              </span>
            </div>
            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Stock & Pricing Management</p>
          </div>
        </div>

        {/* Global Units Counter Card */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-black/5 border border-black/10 rounded-2xl px-6 py-3 shrink-0">
            <div className="mr-4">
              <p className="text-[10px] text-black font-black uppercase tracking-wider">Total Products</p>
              <p className="text-2xl font-black text-black leading-none mt-1">{products.length}</p>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-l border-gray-200/60 pl-4">
              UNIQUE ITEMS IN ARCHIVE
            </div>
          </div>

          <div className="flex items-center bg-[#2563EB]/5 border border-[#2563EB]/10 rounded-2xl px-6 py-3 shrink-0">
            <div className="mr-4">
              <p className="text-[10px] text-[#2563EB] font-black uppercase tracking-wider">Global Stock</p>
              <p className="text-2xl font-black text-[#2563EB] leading-none mt-1">{globalTotalUnits}</p>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-l border-gray-200/60 pl-4">
              TOTAL UNITS IN ARCHIVE
            </div>
          </div>
        </div>
      </div>

      {/* Control Utility Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-4 justify-between bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
        
        {/* Left Side: Modes Switchers & Export */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switchers */}
          <div className="bg-white p-1 rounded-xl border border-gray-150 flex items-center shadow-xs">
            {(['STOCK', 'PRICE', 'SALE'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setActiveMode(mode);
                  setEditingCell(null);
                }}
                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer group flex items-center gap-2 ${
                  activeMode === mode 
                    ? 'bg-black text-white shadow-xs' 
                    : 'text-gray-400 hover:text-black hover:bg-gray-50'
                }`}
              >
                {mode === 'PRICE' && <DollarSign size={10} className={activeMode === 'PRICE' ? 'text-white' : 'text-gray-400 group-hover:text-black'} />}
                {mode === 'STOCK' && <Package size={10} className={activeMode === 'STOCK' ? 'text-white' : 'text-gray-400 group-hover:text-black'} />}
                {mode === 'SALE' && <Tag size={10} className={activeMode === 'SALE' ? 'text-white' : 'text-gray-400 group-hover:text-black'} />}
                <span>{mode}</span>
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExport}
            className="bg-[#10B981] hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Download size={13} className="stroke-[2.5]" />
            <span>Export</span>
          </button>
        </div>

        {/* Right Side: Search, Category, and Stock Filters */}
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
          {/* Search SKU/Product */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search by SKU or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-xs font-semibold rounded-xl placeholder-gray-400 text-black focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white border border-gray-200 text-[10px] font-black uppercase tracking-wider rounded-xl text-gray-500 focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="All">CATEGORY: ALL</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
          </div>

          {/* Stock Filter Dropdown (Only relevant or emphasized in Stock mode) */}
          <div className="relative w-full md:w-44">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white border border-gray-200 text-[10px] font-black uppercase tracking-wider rounded-xl text-gray-500 focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="All">STOCK: ALL</option>
              <option value="Low">LOW STOCK (1-5)</option>
              <option value="Out">OUT OF STOCK</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* Main Grid Matrix Table Wrapper */}
      <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs">
        
        {loading ? (
          <div className="py-24 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-black/10 border-t-black rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-4">Syncing Matrix Data...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-4 border border-gray-100">
              <Grid3X3 className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-black text-black uppercase tracking-wider">No matching database products</h3>
            <p className="text-xs text-gray-400 mt-2 font-medium">Clear search queries or filters to refresh the grid matrix.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="border-b border-gray-150 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 bg-gray-50 select-none">
                  {/* Product Info column */}
                  <th className="py-3 px-6 w-[280px] bg-gray-50 font-black border-r border-gray-150">PRODUCT DETAILS</th>
                  
                  {/* Size columns */}
                  {standardSizes.map(size => (
                    <th key={size} className="py-3 px-1 text-center font-black w-[58px] border-r border-gray-150/70">{size}</th>
                  ))}

                  {/* Summary/Global Stock column */}
                  <th className="py-3 px-6 text-center font-black w-[130px] bg-gray-50">
                    {activeMode === 'STOCK' ? 'GLOBAL STOCK' : activeMode === 'PRICE' ? 'REGULAR PRICE' : 'SALE PRICE'}
                  </th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-150">
                {Object.keys(groupedProducts).map(categoryName => {
                  const items = groupedProducts[categoryName];
                  return (
                    <React.Fragment key={categoryName}>
                      {/* Sub-header grouping by Category */}
                      <tr className="bg-gray-50/70">
                        <td colSpan={standardSizes.length + 2} className="py-3 px-6">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                            <span className="text-xs font-black tracking-wider uppercase text-black">
                              {categoryName}
                            </span>
                            <span className="text-[10px] bg-black/5 text-gray-500 font-extrabold px-2 py-0.5 rounded-full">
                              {items.length} {items.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Product rows under this category */}
                      {items.map(product => {
                        const totalUnits = product.sizes && product.sizes.length > 0
                          ? Object.values(product.sizeStock || {}).reduce((s, q) => s + (Number(q) || 0), 0)
                          : (product.stock || 0);

                        return (
                          <tr key={product.id} className="hover:bg-gray-50/40 transition-colors h-16 group">
                            
                            {/* Product Info Card */}
                            <td className="py-2.5 px-6 border-r border-gray-150 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                {product.images?.[0] ? (
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <Package size={16} className="text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-black text-black tracking-tight uppercase truncate">
                                  {product.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {product.sku && (
                                    <span className="text-[9px] font-extrabold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase leading-none">
                                      {product.sku}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                    {product.category}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Sizes values columns */}
                            {standardSizes.map(size => {
                              const qty = product.sizeStock?.[size];
                              const isSizeConfigured = product.sizes?.includes(size);
                              const hasQty = qty !== undefined && qty > 0;

                              // Edit handler
                              const isEditingThis = editingCell && editingCell.productId === product.id && editingCell.field === size;

                              return (
                                <td 
                                  key={size} 
                                  onClick={() => {
                                    if (activeMode === 'STOCK') {
                                      handleCellClick(product.id, size, qty ?? 0);
                                    }
                                  }}
                                  className={`p-1 text-center border-r border-gray-150/70 text-xs font-semibold select-none cursor-pointer group-hover:bg-gray-50/20 transition-all ${
                                    isEditingThis ? 'bg-blue-50/70 p-0' : ''
                                  } ${
                                    activeMode === 'STOCK' && hasQty ? 'text-[#2563EB] font-black' : 'text-gray-400 font-medium'
                                  }`}
                                >
                                  {activeMode === 'STOCK' ? (
                                    isEditingThis ? (
                                      <div className="flex items-center justify-center w-full h-full px-1">
                                        <input
                                          autoFocus
                                          type="number"
                                          value={editingCell.value}
                                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveCell();
                                            if (e.key === 'Escape') setEditingCell(null);
                                          }}
                                          className="w-12 text-center py-1 text-xs border border-blue-400 rounded bg-white text-black outline-none font-bold"
                                        />
                                        <div className="flex flex-col ml-1">
                                          <button onClick={handleSaveCell} className="text-green-600 hover:text-green-800"><Check size={10} /></button>
                                          <button onClick={() => setEditingCell(null)} className="text-red-500 hover:text-red-700"><X size={10} /></button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="relative py-2.5">
                                        <span>{isSizeConfigured ? (qty ?? 0) : '0'}</span>
                                        <Edit2 size={8} className="absolute right-0.5 bottom-0.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    )
                                  ) : (
                                    /* In PRICE or SALE mode, we show general info or if there's custom pricing (currently general prices apply to all) */
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Summary / Rightmost Global stock / price column */}
                            <td className="py-2.5 px-6 border-l border-gray-150 bg-gray-50/50 text-center font-bold">
                              {activeMode === 'STOCK' ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className={`text-xs font-black tracking-wider ${totalUnits === 0 ? 'text-red-500' : 'text-black'}`}>
                                    {totalUnits}
                                  </span>
                                  <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mt-0.5">
                                    UNITS
                                  </span>
                                </div>
                              ) : activeMode === 'PRICE' ? (
                                /* Price cell editing */
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
                                      className="w-20 text-center py-1 text-xs border border-blue-400 rounded bg-white text-black outline-none font-bold"
                                    />
                                    <button onClick={handleSaveCell} className="bg-green-600 text-white p-1 rounded hover:bg-green-700"><Check size={10} /></button>
                                    <button onClick={() => setEditingCell(null)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600"><X size={10} /></button>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => handleCellClick(product.id, 'price', product.price)}
                                    className="cursor-pointer hover:bg-gray-200/50 rounded py-1 px-2 inline-flex items-center gap-1 transition-all"
                                  >
                                    <span className="text-xs font-black text-black">
                                      {formatPrice(product.price)}
                                    </span>
                                    <Edit2 size={9} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                )
                              ) : (
                                /* Sale Price cell editing */
                                editingCell && editingCell.productId === product.id && editingCell.field === 'salePrice' ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      autoFocus
                                      type="number"
                                      step="any"
                                      placeholder="No discount"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveCell();
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      className="w-20 text-center py-1 text-xs border border-blue-400 rounded bg-white text-black outline-none font-bold"
                                    />
                                    <button onClick={handleSaveCell} className="bg-green-600 text-white p-1 rounded hover:bg-green-700"><Check size={10} /></button>
                                    <button onClick={() => setEditingCell(null)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600"><X size={10} /></button>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => handleCellClick(product.id, 'salePrice', product.salePrice ?? '')}
                                    className="cursor-pointer hover:bg-gray-200/50 rounded py-1 px-2 inline-flex items-center gap-1 transition-all"
                                  >
                                    {product.salePrice ? (
                                      <span className="text-xs font-black text-rose-600">
                                        {formatPrice(product.salePrice)}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-medium text-gray-400 italic">
                                        No discount
                                      </span>
                                    )}
                                    <Edit2 size={9} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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

      {/* Instructional Footer Help Row */}
      <div className="flex items-center justify-between border-t border-gray-150 pt-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Click on any cell under STOCK to update stock quantities directly.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Change active mode to PRICE or SALE to edit core product pricing inline.</span>
        </div>
      </div>

    </div>
  );
}
