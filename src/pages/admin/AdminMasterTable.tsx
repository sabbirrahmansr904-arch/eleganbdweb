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

  const shirtSizes = ['M', 'L', 'XL', '2XL'];
  const pantSizes = ['28', '30', '32', '34', '36', '38', '40'];

  const isPantCategory = (category: string) => {
    const cat = (category || '').toLowerCase();
    return cat.includes('pant') || cat.includes('jeans') || cat.includes('trouser') || cat.includes('pajama') || cat.includes('bottom') || cat.includes('gabardine');
  };

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

  const shirtProducts = useMemo(() => {
    return filteredProducts.filter(p => !isPantCategory(p.category));
  }, [filteredProducts]);

  const pantProducts = useMemo(() => {
    return filteredProducts.filter(p => isPantCategory(p.category));
  }, [filteredProducts]);

  // Group shirt products by category
  const groupedShirts = useMemo(() => {
    const groups: Record<string, typeof shirtProducts> = {};
    shirtProducts.forEach(product => {
      const cat = product.category || 'Shirts';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(product);
    });
    return groups;
  }, [shirtProducts]);

  // Group pant products by category
  const groupedPants = useMemo(() => {
    const groups: Record<string, typeof pantProducts> = {};
    pantProducts.forEach(product => {
      const cat = product.category || 'Pants';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(product);
    });
    return groups;
  }, [pantProducts]);

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
    <div className="w-full h-full p-4 pb-8 font-sans text-[#0C1421] bg-white">
      
      {/* Top Title & Quick Stock Card - Compacted */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-gray-100 pb-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-black tracking-tighter uppercase">Inventory Matrix</h1>
              <span className="bg-black/5 text-black px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider">
                {products.length}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Stock & Pricing Management</p>
          </div>
        </div>

        {/* Global Units Counter Card - Compacted */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-black/5 border border-black/10 rounded-xl px-4 py-2 shrink-0">
            <div className="mr-3">
              <p className="text-[9px] text-black font-black uppercase tracking-wider">Products</p>
              <p className="text-xl font-black text-black leading-none mt-0.5">{products.length}</p>
            </div>
          </div>

          <div className="flex items-center bg-[#2563EB]/5 border border-[#2563EB]/10 rounded-xl px-4 py-2 shrink-0">
            <div className="mr-3">
              <p className="text-[9px] text-[#2563EB] font-black uppercase tracking-wider">Total Stock</p>
              <p className="text-xl font-black text-[#2563EB] leading-none mt-0.5">{globalTotalUnits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Utility Bar - Compacted */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3 justify-between bg-gray-50/50 p-3 rounded-xl border border-gray-100 mb-4">
        
        {/* Left Side: Modes Switchers & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switchers */}
          <div className="bg-white p-0.5 rounded-lg border border-gray-150 flex items-center shadow-xs">
            {(['STOCK', 'PRICE', 'SALE'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setActiveMode(mode);
                  setEditingCell(null);
                }}
                className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer group flex items-center gap-1.5 ${
                  activeMode === mode 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-gray-400 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {mode === 'PRICE' && <DollarSign size={9} />}
                {mode === 'STOCK' && <Package size={9} />}
                {mode === 'SALE' && <Tag size={9} />}
                <span>{mode}</span>
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExport}
            className="bg-[#10B981] hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Download size={11} className="stroke-[2.5]" />
            <span>Export</span>
          </button>
        </div>

        {/* Right Side: Search, Category, and Stock Filters - Compacted */}
        <div className="flex flex-col md:flex-row items-center gap-2 w-full xl:w-auto">
          {/* Search SKU/Product */}
          <div className="relative w-full md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 text-[10px] font-semibold rounded-lg placeholder-gray-400 text-black focus:ring-1 focus:ring-black/10 focus:border-black outline-none transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative w-full md:w-40">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-white border border-gray-200 text-[9px] font-black uppercase tracking-wider rounded-lg text-gray-500 focus:ring-1 focus:ring-black/10 focus:border-black outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="All">CAT: ALL</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          </div>

          {/* Stock Filter Dropdown */}
          <div className="relative w-full md:w-40">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-white border border-gray-200 text-[9px] font-black uppercase tracking-wider rounded-lg text-gray-500 focus:ring-1 focus:ring-black/10 focus:border-black outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="All">STOCK: ALL</option>
              <option value="Low">LOW STOCK (1-5)</option>
              <option value="Out">OUT</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Grid Matrix Table Wrapper - Compacted */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-150 p-16 text-center text-[11px] text-gray-500 font-bold uppercase tracking-wider shadow-sm">
            Syncing Matrix Data...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-150 p-16 text-center text-[11px] text-gray-500 font-bold uppercase tracking-wider shadow-sm">
            No matching products found.
          </div>
        ) : (
          <>
            {/* 1. Shirts & Tops Matrix */}
            {shirtProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-150 overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-150 flex justify-between items-center">
                  <span className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Shirts & Tops Matrix (Sizes: M, L, XL, 2XL)
                  </span>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                    {shirtProducts.length} Items
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-150 text-xs font-extrabold uppercase tracking-wider text-black bg-gray-50/50 select-none">
                        <th className="py-3 px-4 w-[280px] bg-gray-50 font-black border-r border-gray-150">PRODUCT DETAILS</th>
                        {shirtSizes.map(size => (
                          <th key={size} className="py-3 px-2 text-center font-black w-[80px] border-r border-gray-150/70 text-black text-sm">{size}</th>
                        ))}
                        <th className="py-3 px-4 text-center font-black w-[150px] bg-gray-50 text-black text-sm">
                          {activeMode === 'STOCK' ? 'GLOBAL STOCK' : activeMode === 'PRICE' ? 'PRICE' : 'SALE'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {Object.keys(groupedShirts).map(categoryName => {
                        const items = groupedShirts[categoryName];
                        return (
                          <React.Fragment key={categoryName}>
                            <tr className="bg-gray-50/30">
                              <td colSpan={shirtSizes.length + 2} className="py-2.5 px-4 text-xs font-extrabold tracking-wider uppercase text-black border-b border-gray-150">
                                {categoryName} <span className="text-gray-500 font-medium">({items.length})</span>
                              </td>
                            </tr>
                            {items.map(product => {
                              const totalUnits = product.sizes && product.sizes.length > 0
                                ? Object.values(product.sizeStock || {}).reduce((s, q) => s + (Number(q) || 0), 0)
                                : (product.stock || 0);

                              return (
                                <tr key={product.id} className="hover:bg-gray-50/30 transition-colors h-14 group">
                                  <td className="py-2 px-4 border-r border-gray-150 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                      {product.images?.[0] ? (
                                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                                      ) : (
                                        <Package size={14} className="text-gray-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-extrabold text-black tracking-tight uppercase truncate">{product.name}</p>
                                      {product.sku && <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">{product.sku}</p>}
                                    </div>
                                  </td>

                                  {shirtSizes.map(size => {
                                    const qty = product.sizeStock?.[size];
                                    const isSizeConfigured = product.sizes?.includes(size);
                                    const hasQty = qty !== undefined && qty > 0;
                                    const isEditingThis = editingCell && editingCell.productId === product.id && editingCell.field === size;

                                    return (
                                      <td 
                                        key={size} 
                                        onClick={() => { if (activeMode === 'STOCK') handleCellClick(product.id, size, qty ?? 0); }}
                                        className={`p-1 text-center border-r border-gray-150/70 text-sm select-none cursor-pointer hover:bg-gray-100/50 transition-all ${isEditingThis ? 'bg-blue-50 p-0' : ''}`}
                                      >
                                        {activeMode === 'STOCK' ? (
                                          isEditingThis ? (
                                            <div className="flex items-center justify-center px-1">
                                              <input 
                                                autoFocus 
                                                type="number" 
                                                value={editingCell.value} 
                                                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })} 
                                                onKeyDown={(e) => handleKeyDown(e, product.id, size, shirtSizes)}
                                                onBlur={() => {
                                                  if (editingCell) handleSaveCell();
                                                }}
                                                className="w-16 text-center py-1 text-xs bg-white border border-blue-500 rounded outline-none font-bold text-black" 
                                              />
                                            </div>
                                          ) : (
                                            <span className={isSizeConfigured ? (hasQty ? "text-sm font-black text-black" : "text-xs text-gray-400 font-semibold") : "text-xs text-gray-300 font-medium"}>
                                              {isSizeConfigured ? (qty ?? 0) : '0'}
                                            </span>
                                          )
                                        ) : '-'}
                                      </td>
                                    );
                                  })}

                                  <td className="py-2 px-4 border-l border-gray-150 bg-gray-50/30 text-center font-bold text-xs">
                                    {activeMode === 'STOCK' ? (
                                      <span className={`text-sm font-black ${totalUnits === 0 ? 'text-red-600' : 'text-black'}`}>{totalUnits}</span>
                                    ) : activeMode === 'PRICE' ? (
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
                                          <button onClick={handleSaveCell} className="bg-green-600 text-white p-1 rounded hover:bg-green-750"><Check size={10} /></button>
                                          <button onClick={() => setEditingCell(null)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600"><X size={10} /></button>
                                        </div>
                                      ) : (
                                        <div 
                                          onClick={() => handleCellClick(product.id, 'price', product.price)} 
                                          className="cursor-pointer hover:underline text-sm font-extrabold text-black flex items-center justify-center gap-1"
                                        >
                                          <span>{formatPrice(product.price)}</span>
                                          <Edit2 size={9} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      )
                                    ) : (
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
                                          <button onClick={handleSaveCell} className="bg-green-600 text-white p-1 rounded hover:bg-green-750"><Check size={10} /></button>
                                          <button onClick={() => setEditingCell(null)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600"><X size={10} /></button>
                                        </div>
                                      ) : (
                                        <div 
                                          onClick={() => handleCellClick(product.id, 'salePrice', product.salePrice ?? '')} 
                                          className="cursor-pointer hover:underline text-sm font-extrabold text-rose-600 flex items-center justify-center gap-1"
                                        >
                                          <span>{product.salePrice ? formatPrice(product.salePrice) : '---'}</span>
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
              </div>
            )}

            {/* 2. Pants & Bottoms Matrix */}
            {pantProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-150 overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-150 flex justify-between items-center">
                  <span className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    Pants & Bottoms Matrix (Sizes: 28, 30, 32, 34, 36, 38, 40)
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                    {pantProducts.length} Items
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-gray-150 text-xs font-extrabold uppercase tracking-wider text-black bg-gray-50/50 select-none">
                        <th className="py-3 px-4 w-[280px] bg-gray-50 font-black border-r border-gray-150">PRODUCT DETAILS</th>
                        {pantSizes.map(size => (
                          <th key={size} className="py-3 px-2 text-center font-black w-[70px] border-r border-gray-150/70 text-black text-sm">{size}</th>
                        ))}
                        <th className="py-3 px-4 text-center font-black w-[150px] bg-gray-50 text-black text-sm">
                          {activeMode === 'STOCK' ? 'GLOBAL STOCK' : activeMode === 'PRICE' ? 'PRICE' : 'SALE'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {Object.keys(groupedPants).map(categoryName => {
                        const items = groupedPants[categoryName];
                        return (
                          <React.Fragment key={categoryName}>
                            <tr className="bg-gray-50/30">
                              <td colSpan={pantSizes.length + 2} className="py-2.5 px-4 text-xs font-extrabold tracking-wider uppercase text-black border-b border-gray-150">
                                {categoryName} <span className="text-gray-500 font-medium">({items.length})</span>
                              </td>
                            </tr>
                            {items.map(product => {
                              const totalUnits = product.sizes && product.sizes.length > 0
                                ? Object.values(product.sizeStock || {}).reduce((s, q) => s + (Number(q) || 0), 0)
                                : (product.stock || 0);

                              return (
                                <tr key={product.id} className="hover:bg-gray-50/30 transition-colors h-14 group">
                                  <td className="py-2 px-4 border-r border-gray-150 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                      {product.images?.[0] ? (
                                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                                      ) : (
                                        <Package size={14} className="text-gray-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-extrabold text-black tracking-tight uppercase truncate">{product.name}</p>
                                      {product.sku && <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">{product.sku}</p>}
                                    </div>
                                  </td>

                                  {pantSizes.map(size => {
                                    const qty = product.sizeStock?.[size];
                                    const isSizeConfigured = product.sizes?.includes(size);
                                    const hasQty = qty !== undefined && qty > 0;
                                    const isEditingThis = editingCell && editingCell.productId === product.id && editingCell.field === size;

                                    return (
                                      <td 
                                        key={size} 
                                        onClick={() => { if (activeMode === 'STOCK') handleCellClick(product.id, size, qty ?? 0); }}
                                        className={`p-1 text-center border-r border-gray-150/70 text-sm select-none cursor-pointer hover:bg-gray-100/50 transition-all ${isEditingThis ? 'bg-blue-50 p-0' : ''}`}
                                      >
                                        {activeMode === 'STOCK' ? (
                                          isEditingThis ? (
                                            <div className="flex items-center justify-center px-1">
                                              <input 
                                                autoFocus 
                                                type="number" 
                                                value={editingCell.value} 
                                                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })} 
                                                onKeyDown={(e) => handleKeyDown(e, product.id, size, pantSizes)}
                                                onBlur={() => {
                                                  if (editingCell) handleSaveCell();
                                                }}
                                                className="w-16 text-center py-1 text-xs bg-white border border-blue-500 rounded outline-none font-bold text-black" 
                                              />
                                            </div>
                                          ) : (
                                            <span className={isSizeConfigured ? (hasQty ? "text-sm font-black text-black" : "text-xs text-gray-400 font-semibold") : "text-xs text-gray-300 font-medium"}>
                                              {isSizeConfigured ? (qty ?? 0) : '0'}
                                            </span>
                                          )
                                        ) : '-'}
                                      </td>
                                    );
                                  })}

                                  <td className="py-2 px-4 border-l border-gray-150 bg-gray-50/30 text-center font-bold text-xs">
                                    {activeMode === 'STOCK' ? (
                                      <span className={`text-sm font-black ${totalUnits === 0 ? 'text-red-600' : 'text-black'}`}>{totalUnits}</span>
                                    ) : activeMode === 'PRICE' ? (
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
                                          <button onClick={handleSaveCell} className="bg-green-600 text-white p-1 rounded hover:bg-green-750"><Check size={10} /></button>
                                          <button onClick={() => setEditingCell(null)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600"><X size={10} /></button>
                                        </div>
                                      ) : (
                                        <div 
                                          onClick={() => handleCellClick(product.id, 'price', product.price)} 
                                          className="cursor-pointer hover:underline text-sm font-extrabold text-black flex items-center justify-center gap-1"
                                        >
                                          <span>{formatPrice(product.price)}</span>
                                          <Edit2 size={9} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      )
                                    ) : (
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
                                          <button onClick={handleSaveCell} className="bg-green-600 text-white p-1 rounded hover:bg-green-750"><Check size={10} /></button>
                                          <button onClick={() => setEditingCell(null)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600"><X size={10} /></button>
                                        </div>
                                      ) : (
                                        <div 
                                          onClick={() => handleCellClick(product.id, 'salePrice', product.salePrice ?? '')} 
                                          className="cursor-pointer hover:underline text-sm font-extrabold text-rose-600 flex items-center justify-center gap-1"
                                        >
                                          <span>{product.salePrice ? formatPrice(product.salePrice) : '---'}</span>
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
              </div>
            )}
          </>
        )}
      </div>

      {/* Instructional Footer Help Row */}
      <div className="flex items-center justify-between pt-3 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
        <span>Click STOCK cells to edit. Change MODE to edit PRICE/SALE.</span>
      </div>
    </div>
  );
}
