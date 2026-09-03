import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  History,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../contexts/ProductContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useInventory } from '../../contexts/InventoryContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';

interface PendingStockChange {
  productId: string;
  productName: string;
  productImage?: string;
  sku?: string;
  category?: string;
  size: string;
  oldQty: number;
  newQty: number;
  diff: number;
  oldTotalStock: number;
  newTotalStock: number;
}

export default function AdminMasterTable(): React.JSX.Element {
  const { products, updateProduct, loading } = useProducts();
  const { categories } = useCategories();
  const { currency } = useCurrency();
  const { addTransaction } = useInventory();
  const { currentUser } = useAuth();
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

  // Pending stock change confirmation modal state
  const [pendingStockChange, setPendingStockChange] = useState<PendingStockChange | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);
  const isInitiatingRef = useRef(false);

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
        const sumSizes = p.sizes.reduce((s, sz) => s + (Math.max(0, Number(p.sizeStock?.[sz]) || 0)), 0);
        return acc + sumSizes;
      }
      if (p.sizeStock && Object.keys(p.sizeStock).length > 0) {
        const sumSizes = Object.values(p.sizeStock).reduce((s, q) => s + (Math.max(0, Number(q) || 0)), 0);
        return acc + sumSizes;
      }
      return acc + (Math.max(0, Number(p.stock) || 0));
    }, 0);
  }, [products]);

  // Helper to compute a single product's exact total stock
  const getProductTotalStock = (product: typeof products[0]): number => {
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes.reduce((s, sz) => s + (Math.max(0, Number(product.sizeStock?.[sz]) || 0)), 0);
    }
    if (product.sizeStock && Object.keys(product.sizeStock).length > 0) {
      return Object.values(product.sizeStock).reduce((s, q) => s + (Math.max(0, Number(q) || 0)), 0);
    }
    return Math.max(0, Number(product.stock) || 0);
  };

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
      const totalStock = getProductTotalStock(product);

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
        const totalStock = getProductTotalStock(p);
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

  // Save edited price cell
  const handleSavePriceCell = async (targetCell = editingCell) => {
    if (!targetCell) return;
    const { productId, field, value } = targetCell;
    const numValue = Number(value);

    const product = products.find(p => p.id === productId);
    if (!product) return;

    setSavingId(productId);
    try {
      const updatedProduct = { ...product };
      if (field === 'price') {
        if (isNaN(numValue) || numValue < 0) {
          toast.error('সঠিক মূল্য দিন (Invalid price)');
          setSavingId(null);
          return;
        }
        updatedProduct.price = numValue;
      } else if (field === 'salePrice') {
        if (value === '') {
          updatedProduct.salePrice = undefined;
        } else {
          if (isNaN(numValue) || numValue < 0) {
            toast.error('সঠিক সেল মূল্য দিন (Invalid sale price)');
            setSavingId(null);
            return;
          }
          updatedProduct.salePrice = numValue;
        }
      }

      await updateProduct(updatedProduct);
      toast.success('মূল্য সফলভাবে আপডেট করা হয়েছে');
      setEditingCell(prev => (prev === targetCell ? null : prev));
    } catch (error) {
      console.error(error);
      toast.error('মূল্য সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setSavingId(null);
    }
  };

  // Initiate stock quantity change and show confirmation modal if changed
  const handleInitiateStockChange = (targetCell = editingCell) => {
    if (!targetCell || isInitiatingRef.current) return;
    isInitiatingRef.current = true;

    try {
      const { productId, field, value } = targetCell;
      const numValue = Number(value);

      const product = products.find(p => p.id === productId);
      if (!product) {
        setEditingCell(null);
        return;
      }

      if (isNaN(numValue) || numValue < 0) {
        toast.error('সঠিক স্টক সংখ্যা দিন');
        setEditingCell(null);
        return;
      }

      const roundedNewQty = Math.max(0, Math.round(numValue));
      const currentOldQty = Number(product.sizeStock?.[field] ?? 0);

      // If no change in quantity, exit quietly without modal
      if (roundedNewQty === currentOldQty) {
        setEditingCell(null);
        return;
      }

      const oldTotal = getProductTotalStock(product);
      const diff = roundedNewQty - currentOldQty;
      const newTotal = Math.max(0, oldTotal + diff);

      setPendingStockChange({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0] || product.image,
        sku: product.sku || '',
        category: product.category || 'General',
        size: field,
        oldQty: currentOldQty,
        newQty: roundedNewQty,
        diff,
        oldTotalStock: oldTotal,
        newTotalStock: newTotal
      });

      setEditingCell(null);
    } finally {
      setTimeout(() => {
        isInitiatingRef.current = false;
      }, 150);
    }
  };

  // Commit stock quantity change to Firestore & state after user clicks Confirm
  const handleConfirmStockChange = async () => {
    if (!pendingStockChange || savingId !== null) return;
    const { productId, size, newQty, oldQty, diff, productName, sku, category } = pendingStockChange;

    const product = products.find(p => p.id === productId);
    if (!product) {
      setPendingStockChange(null);
      return;
    }

    setSavingId(productId);
    try {
      const updatedProduct = { ...product };
      const updatedSizeStock = { ...(product.sizeStock || {}) };
      updatedSizeStock[size] = newQty;
      updatedProduct.sizeStock = updatedSizeStock;

      if (!updatedProduct.sizes.includes(size)) {
        updatedProduct.sizes = [...updatedProduct.sizes, size];
      }

      updatedProduct.stock = updatedProduct.sizes.reduce(
        (s, sz) => s + (Math.max(0, Number(updatedSizeStock[sz]) || 0)), 
        0
      );

      await updateProduct(updatedProduct);

      // Log in Inventory Transactions if available
      if (addTransaction) {
        try {
          const transType: 'in' | 'out' = diff >= 0 ? 'in' : 'out';
          const absDiff = Math.abs(diff);
          await addTransaction({
            type: transType,
            sku: sku || product.sku || 'N/A',
            productName: productName,
            quantities: { [size]: absDiff },
            totalQuantity: absDiff,
            category: category || product.category || 'General',
            authorizedBy: currentUser?.displayName || currentUser?.email || 'Admin',
            notes: `Master Table: Changed size ${size} stock from ${oldQty} to ${newQty} (${diff > 0 ? '+' : ''}${diff} pcs)`
          });
        } catch (logErr) {
          console.warn('Inventory log creation skipped:', logErr);
        }
      }

      const changeText = diff > 0 ? `+${diff} pcs বৃদ্ধি` : `${diff} pcs হ্রাস`;
      toast.success(
        `স্টক সফলভাবে আপডেট হয়েছে! ${productName} [${size}]: ${oldQty} → ${newQty} pcs (${changeText})`,
        { duration: 4000 }
      );
      setPendingStockChange(null);
    } catch (error) {
      console.error(error);
      toast.error('স্টক পরিবর্তন সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setSavingId(null);
    }
  };

  const handleAdjustPendingQty = (delta: number) => {
    if (!pendingStockChange) return;
    const newQ = Math.max(0, pendingStockChange.newQty + delta);
    const diff = newQ - pendingStockChange.oldQty;
    const newTotal = Math.max(0, pendingStockChange.oldTotalStock + diff);
    setPendingStockChange({
      ...pendingStockChange,
      newQty: newQ,
      diff,
      newTotalStock: newTotal
    });
  };

  const handleSetPendingQty = (val: number) => {
    if (!pendingStockChange) return;
    const safeVal = Math.max(0, Math.round(val));
    const diff = safeVal - pendingStockChange.oldQty;
    const newTotal = Math.max(0, pendingStockChange.oldTotalStock + diff);
    setPendingStockChange({
      ...pendingStockChange,
      newQty: safeVal,
      diff,
      newTotalStock: newTotal
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, productId: string, currentSize: string, sizesList: string[]) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeMode === 'STOCK') {
        handleInitiateStockChange();
      } else {
        handleSavePriceCell();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const current = editingCell;
      if (current) {
        if (activeMode === 'STOCK') {
          handleInitiateStockChange(current);
        } else {
          handleSavePriceCell(current);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  // Global listener for Enter / Escape when stock confirmation modal is open
  useEffect(() => {
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (!pendingStockChange) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setPendingStockChange(null);
      } else if (e.key === 'Enter' && !savingId) {
        e.preventDefault();
        handleConfirmStockChange();
      }
    };
    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [pendingStockChange, savingId]);

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
                    return acc + getProductTotalStock(p);
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
                        const totalUnits = getProductTotalStock(product);

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
                                            if (editingCell) handleInitiateStockChange();
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
                                        if (e.key === 'Enter') handleSavePriceCell();
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      className="w-20 text-center py-1 text-xs border border-[#f97316] rounded bg-[#E6ECF4] text-black outline-none font-bold shadow-[inset_2px_2px_4px_rgba(160,175,200,0.3)]"
                                    />
                                    <button onClick={() => handleSavePriceCell()} className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700 cursor-pointer"><Check size={10} /></button>
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

      {/* CONFIRMATION MODAL FOR STOCK QUANTITY CHANGE */}
      <AnimatePresence>
        {pendingStockChange && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.16 }}
              className="bg-[#EAEFF5] border border-white/90 rounded-3xl p-6 shadow-2xl max-w-md w-full relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#f97316] shadow-xs">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      স্টক পরিবর্তন নিশ্চিতকরণ
                    </h2>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                      Confirm Stock Quantity Change
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingStockChange(null)}
                  className="w-8 h-8 rounded-xl bg-[#E2E8F2] hover:bg-[#D5DFED] text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Product Info Card */}
              <div className="mt-4 p-3.5 bg-[#E2E8F2] rounded-2xl border border-white/80 shadow-[inset_2px_2px_4px_rgba(160,175,200,0.2)] flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {pendingStockChange.productImage ? (
                    <img
                      src={pendingStockChange.productImage}
                      alt={pendingStockChange.productName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Package size={22} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-slate-900 uppercase truncate">
                    {pendingStockChange.productName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {pendingStockChange.sku && (
                      <span className="text-[10px] font-mono font-bold bg-white/90 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        SKU: {pendingStockChange.sku}
                      </span>
                    )}
                    <span className="text-[10px] font-black bg-[#f97316]/10 text-[#f97316] px-2 py-0.5 rounded-md border border-[#f97316]/20">
                      সাইজ: {pendingStockChange.size}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Comparison Grid */}
              <div className="mt-4 bg-white/95 rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-center mb-3">
                  সাইজ [{pendingStockChange.size}] - স্টক পরিবর্তনের বিবরণ
                </div>

                <div className="flex items-center justify-between gap-2.5">
                  {/* Previous Stock */}
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">পূর্বের স্টক</div>
                    <div className="text-xl font-black text-slate-700 mt-0.5">
                      {pendingStockChange.oldQty} <span className="text-xs font-bold text-slate-500">pcs</span>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400">
                    <ArrowRight size={16} />
                  </div>

                  {/* New Stock */}
                  <div className="flex-1 bg-orange-50/70 p-3 rounded-xl border border-orange-200 text-center">
                    <div className="text-[10px] font-bold text-orange-800 uppercase">নতুন স্টক</div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-xl font-black text-orange-600">
                        {pendingStockChange.newQty}
                      </span>
                      <span className="text-xs font-bold text-orange-600">pcs</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Fine-tune Controls */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">পরিমাণ সমন্বয়:</span>
                  <button
                    type="button"
                    onClick={() => handleAdjustPendingQty(-1)}
                    disabled={pendingStockChange.newQty <= 0}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black disabled:opacity-30 cursor-pointer"
                    title="১ পিস কমান"
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={pendingStockChange.newQty}
                    onChange={(e) => handleSetPendingQty(Number(e.target.value) || 0)}
                    className="w-14 text-center py-0.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-black text-slate-900 outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustPendingQty(1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black cursor-pointer"
                    title="১ পিস বাড়ান"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Change Difference Badge */}
                <div className="mt-3.5 flex items-center justify-center">
                  {pendingStockChange.diff > 0 ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
                      <ArrowUpRight size={14} className="stroke-[2.5]" />
                      <span>+{pendingStockChange.diff} Pcs স্টক বৃদ্ধি পাচ্ছে (যোগ হবে)</span>
                    </div>
                  ) : pendingStockChange.diff < 0 ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black">
                      <ArrowDownRight size={14} className="stroke-[2.5]" />
                      <span>{Math.abs(pendingStockChange.diff)} Pcs স্টক কমানো হচ্ছে (বাদ যাবে)</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-black">
                      <span>কোনো পরিবর্তন হচ্ছে না (০ pcs)</span>
                    </div>
                  )}
                </div>

                {/* Total Product Stock Impact */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>প্রোডাক্টের মোট স্টক (সব সাইজ মিলিয়ে):</span>
                  <span className="font-black text-slate-900">
                    {pendingStockChange.oldTotalStock} pcs <span className="text-slate-400">→</span> {pendingStockChange.newTotalStock} pcs
                  </span>
                </div>
              </div>

              {/* Warning Notice if going to zero */}
              {pendingStockChange.newQty === 0 && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                  <span>সতর্কতা: এই সাইজের স্টক শূন্য (০) হবে! (স্টক আউট)</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPendingStockChange(null)}
                  className="flex-1 py-3 px-4 bg-[#E2E8F2] hover:bg-[#D5DFED] text-slate-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-[-2px_-2px_6px_rgba(255,255,255,0.8),2px_2px_6px_rgba(160,175,200,0.25)]"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="button"
                  disabled={savingId !== null}
                  onClick={handleConfirmStockChange}
                  className="flex-1 py-3 px-4 bg-[#00A36C] hover:bg-[#008f5c] text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[-3px_-3px_8px_rgba(255,255,255,0.8),3px_3px_8px_rgba(165,180,205,0.3)] disabled:opacity-50"
                >
                  {savingId ? (
                    <span>সংরক্ষণ হচ্ছে...</span>
                  ) : (
                    <>
                      <Check size={16} className="stroke-[3]" />
                      <span>
                        কনফার্ম করুন ({Math.abs(pendingStockChange.diff)} pcs {pendingStockChange.diff >= 0 ? 'যোগ' : 'বিয়োগ'})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
