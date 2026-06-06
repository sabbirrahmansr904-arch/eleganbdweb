import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Hash, 
  ChevronDown, 
  LayoutGrid, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  XCircle,
  Boxes,
  ArrowRight,
  TrendingDown,
  Tag
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useCategories } from '../../contexts/CategoryContext';
import { formatPrice } from '../../lib/utils';

export default function AdminInventoryOverview(): React.JSX.Element {
  const { products } = useProducts();
  const { currency, rate } = useCurrency();
  const { categories } = useCategories();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // Extract all categories fully dynamically:
  // Merging categories context names + any category name present in products to guarantee robust dynamic scaling
  const categoriesList = useMemo(() => {
    const listFromCtx = categories.map(c => c.name);
    const listFromProducts = products.map(p => p.category).filter(Boolean);
    const combined = Array.from(new Set([...listFromCtx, ...listFromProducts]));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [categories, products]);

  // All standard sizes
  const sizesList = useMemo(() => {
    const foundSizes = products.flatMap(p => p.sizes || []);
    const uniqueSizes = Array.from(new Set(foundSizes)).filter(Boolean);
    const standardOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', 'Polo-M', 'Polo-L', 'Polo-XL', 'Polo-XXL', 'Polo-3XL'];
    
    return uniqueSizes.sort((a, b) => {
      const idxA = standardOrder.indexOf(a);
      const idxB = standardOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [products]);

  // Determine if searching/filtering is active
  const isActiveFilter = searchTerm.trim() !== '' || selectedCategory !== '' || selectedSize !== '';

  // Filtered products list
  const filteredProducts = useMemo(() => {
    if (!isActiveFilter) return [];

    return products.filter(product => {
      // Search term matching (SKU or Product Name)
      const matchesSearch = searchTerm.trim() === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category matching
      const matchesCategory = selectedCategory === '' || 
        product.category?.toLowerCase() === selectedCategory.toLowerCase();

      // Size matching
      const matchesSize = selectedSize === '' || 
        (product.sizes && product.sizes.includes(selectedSize));

      return matchesSearch && matchesCategory && matchesSize;
    });
  }, [products, searchTerm, selectedCategory, selectedSize, isActiveFilter]);

  // Reset filters
  const handleReset = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSize('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans text-[#0C1421]">
      
      {/* Header matching requested visual */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#E04622]/10 text-[#E04622] flex items-center justify-center shrink-0">
          <Boxes className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0C1421] tracking-tight">Quick Stock Check</h1>
          <p className="text-[13px] text-[#62758A] font-semibold mt-0.5">Instant inventory lookup across all categories and sizes.</p>
        </div>
      </div>

      {/* Filter Options Box styled perfectly like the screenshot */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6] shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Search SKU/Product Name */}
          <div className="relative md:col-span-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search by SKU or Product Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-[#F8FAFC] border-none text-[13px] font-semibold rounded-2xl placeholder-gray-400 text-[#0C1421] focus:ring-2 focus:ring-[#E04622]/25 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Dynamic Any Category Dropdown - Updates when categories are added */}
          <div className="relative md:col-span-3">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 bg-[#F8FAFC] border-none text-[11px] font-extrabold uppercase tracking-wider rounded-2xl text-[#62758A] focus:ring-2 focus:ring-[#E04622]/25 focus:bg-white focus:text-[#0C1421] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">ANY CATEGORY</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* Any Size Dropdown */}
          <div className="relative md:col-span-3">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 bg-[#F8FAFC] border-none text-[11px] font-extrabold uppercase tracking-wider rounded-2xl text-[#62758A] focus:ring-2 focus:ring-[#E04622]/25 focus:bg-white focus:text-[#0C1421] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">ANY SIZE</option>
              {sizesList.map(size => (
                <option key={size} value={size}>{size.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

        </div>

        {/* Status indicator row styled perfectly like screenshot */}
        <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#5D63D3] animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase text-[#5D63D3]">
              {isActiveFilter 
                ? `FOUND ${filteredProducts.length} IN-STOCK MATCHES` 
                : 'ENTER A SEARCH OR SELECT FILTERS'
              }
            </span>
          </div>

          {isActiveFilter && (
            <button 
              onClick={handleReset} 
              className="rounded-full px-5 py-2.5 bg-[#0C1421] text-white hover:bg-gray-800 transition-all uppercase font-black text-[10px] tracking-wider flex items-center space-x-1.5 shadow-[0_4px_12px_rgba(12,20,33,0.15)]"
            >
              <XCircle size={14} className="stroke-[2.5]" />
              <span>Clear All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main content or list checking view */}
      <div className="bg-white rounded-[24px] p-8 border border-[#EFF2F6] min-h-[360px] flex flex-col items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
        
        {!isActiveFilter ? (
          // Exact Placeholder State match screenshot!
          <div className="text-center max-w-md mx-auto py-12 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-6 border border-gray-100">
              <LayoutGrid className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h2 className="text-base font-black tracking-tight text-[#0C1421] uppercase">START CHECKING STOCK</h2>
            <p className="text-[13px] text-[#62758A] font-semibold mt-3 leading-relaxed">
              Search by SKU, Product Name or use filters to quickly check real-time stock levels across all variants.
            </p>
          </div>
        ) : (
          // Active Search Results List formatted in elegant stock list details
          <div className="w-full space-y-5 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-[#EFF2F6]">
              <span className="text-[11px] font-black text-[#8292A1] uppercase tracking-wider">
                MATCHING PRODUCTS ({filteredProducts.length})
              </span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-[#FFF9EC] text-[#FF8800] border border-[#FFE8CC] flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0C1421] uppercase">No Matching Stock Records</h3>
                <p className="text-xs text-[#62758A] mt-2">Try adjusting your filters or SKU term for different outcomes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredProducts.map((product) => {
                  const hasVariantsSum = product.sizes && product.sizes.length > 0;
                  return (
                    <div 
                      key={product.id} 
                      className="group bg-white rounded-2xl p-5 border border-[#EFF2F6] hover:border-gray-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all flex items-start gap-4"
                    >
                      {/* Product image with sleek custom placeholder if none exists */}
                      <div className="w-16 h-16 rounded-xl border border-gray-150 overflow-hidden bg-white p-1 shrink-0 flex items-center justify-center">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full rounded-lg bg-gray-50 flex flex-col items-center justify-center leading-none text-gray-400 font-serif font-black text-[13px]">
                            <span>ELEGAN BD</span>
                          </div>
                        )}
                      </div>

                      {/* Info on the right side of the image */}
                      <div className="flex-1 min-w-0">
                        {/* Title of style requested "MINT FLORAL PREMIUM SHIRT" All Uppercase */}
                        <h4 className="text-[13px] font-black text-[#0C1421] tracking-tight uppercase leading-snug">
                          {product.name}
                        </h4>

                        {/* Badges immediately below layout name */}
                        <div className="flex flex-wrap gap-2 items-center mt-1.5">
                          {product.sku && (
                            <span className="text-[10px] font-black tracking-wide text-gray-500 bg-[#E8ECEF] px-2 py-0.5 rounded leading-none">
                              {product.sku.toUpperCase()}
                            </span>
                          )}
                          {product.category && (
                            <span className="flex items-center text-[10px] font-black text-[#5D63D3] bg-[#EEF2FF] px-2 py-0.5 rounded leading-none">
                              <Tag size={10} className="mr-1 inline-block text-[#5D63D3] stroke-[2.5]" />
                              {product.category.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Sizes stock inline wraps - Easy size check feature! */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {hasVariantsSum ? (
                            product.sizes.map((size) => {
                              const qty = product.sizeStock?.[size] ?? 0;
                              let colorClass = "";
                              
                              if (qty === 0) {
                                // Red out of stock badge
                                colorClass = "bg-[#FFF2F2] text-[#DC2626] border-[#FEE2E2]";
                              } else if (qty <= 5) {
                                // Amber low stock badge 1-5
                                colorClass = "bg-[#FFF9EC] text-[#D97706] border-[#FEF3C7]";
                              } else {
                                // Teal healthy stock badge > 5
                                colorClass = "bg-[#EBFDFB] text-[#0D9488] border-[#CCFBF1]";
                              }

                              return (
                                <div 
                                  key={size} 
                                  className={`flex items-center text-[10px] font-bold rounded px-2 py-1 border shrink-0 transition-colors ${colorClass}`}
                                >
                                  <span className="uppercase">{size}</span>
                                  <span className="mx-1 text-gray-400 font-normal">:</span>
                                  <span>{qty}</span>
                                </div>
                              );
                            })
                          ) : (
                            // Simple single quantity badge if product sizes aren't configured
                            <div className={`flex items-center text-[10px] font-bold rounded px-2.5 py-1 border ${
                              product.stock === 0 
                                ? 'bg-[#FFF2F2] text-[#DC2626] border-[#FEE2E2]' 
                                : product.stock < 10 
                                  ? 'bg-[#FFF9EC] text-[#D97706] border-[#FEF3C7]' 
                                  : 'bg-[#EBFDFB] text-[#0D9488] border-[#CCFBF1]'
                            }`}>
                              <span>TOTAL STOCK</span>
                              <span className="mx-1 text-gray-400 font-normal">:</span>
                              <span>{product.stock}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
