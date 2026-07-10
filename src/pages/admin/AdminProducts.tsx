import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GripVertical, 
  MoreHorizontal, 
  Plus, 
  Search, 
  X, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  ExternalLink,
  Copy,
  PlusSquare,
  Check,
  Package,
  Filter,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductContext';
import { useCategories } from '../../contexts/CategoryContext';
import { Product } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export default function AdminProducts(): React.JSX.Element {
  const navigate = useNavigate();
  const { products, deleteProduct, updateProduct, addProduct, loading } = useProducts();
  const { categories } = useCategories();

  // Search & Filters states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isSearchBarOpen, setIsSearchBarOpen] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Active action menu ID (by product ID)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockQuantities, setQuickStockQuantities] = useState<Record<string, number>>({});

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = 
        filterCategory === 'All' || 
        product.category?.toLowerCase() === filterCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, filterCategory]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, startIndex, endIndex]);

  // Adjust current page if filter shrinks list
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredProducts, currentPage, totalPages]);

  // Delete handler
  const handleDelete = async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete.id);
        toast.success('Product deleted successfully');
        setProductToDelete(null);
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  // Duplicate product
  const handleDuplicate = async (product: Product) => {
    try {
      const duplicated: Product = {
        ...product,
        id: `prod-${Date.now()}`,
        name: `${product.name} (Copy)`,
        sku: product.sku ? `${product.sku}-copy` : undefined,
        stock: product.stock,
        sizeStock: { ...(product.sizeStock || {}) }
      };
      await addProduct(duplicated);
      toast.success('Product duplicated successfully');
      setActiveMenuId(null);
    } catch (error) {
      toast.error('Failed to duplicate product');
    }
  };

  // Open quick stock replenishment modal
  const handleOpenQuickStock = (product: Product) => {
    setQuickStockProduct(product);
    // Initialize with 0 additional stock for each size
    const initialQuants: Record<string, number> = {};
    product.sizes.forEach(size => {
      initialQuants[size] = 0;
    });
    setQuickStockQuantities(initialQuants);
  };

  // Submit quick stock replenishment
  const handleSaveQuickStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStockProduct) return;

    try {
      const updatedSizeStock = { ...(quickStockProduct.sizeStock || {}) };
      let additionalTotalStock = 0;

      Object.entries(quickStockQuantities).forEach(([size, addQty]) => {
        const currentQty = updatedSizeStock[size] || 0;
        updatedSizeStock[size] = currentQty + addQty;
        additionalTotalStock += addQty;
      });

      const updatedProduct: Product = {
        ...quickStockProduct,
        sizeStock: updatedSizeStock,
        stock: (quickStockProduct.stock || 0) + additionalTotalStock
      };

      await updateProduct(updatedProduct);
      toast.success('Stock quantities updated successfully');
      setQuickStockProduct(null);
    } catch (error) {
      toast.error('Failed to update stock quantities');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 font-sans text-gray-900 px-4 md:px-8">
      
      {/* Brand & Page Header matching screenshot */}
      <div className="flex items-center justify-between pt-4 border-b border-gray-100 pb-4">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Elegan BD</h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Products</p>
        </div>
      </div>

      {/* Title block with badges and 'Add Product' button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">All Products</h2>
          <span className="flex items-center justify-center bg-violet-50 text-violet-600 font-bold text-xs px-2.5 py-0.5 rounded-full border border-violet-100 min-w-[24px]">
            {filteredProducts.length}
          </span>

          <button 
            onClick={() => setIsSearchBarOpen(prev => !prev)}
            className={cn(
              "w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-3xs",
              isSearchBarOpen 
                ? "bg-violet-50 border-violet-200 text-violet-600" 
                : "bg-white border-gray-200 text-gray-500 hover:text-gray-900"
            )}
            title="Toggle Search Box"
          >
            <Search size={16} strokeWidth={2.5} />
          </button>
        </div>

        <button 
          id="add-product-btn"
          onClick={() => navigate('/admin/add-product')}
          className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-[#6366F1]/10 active:scale-95 cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Main card matching categories layout */}
      <div className="bg-white rounded-[24px] border border-gray-200 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.015)] space-y-6">
        
        {/* First row of the Card: Left: Tab, Right: Category Select Filter */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <button 
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition-all border cursor-pointer",
                filterCategory === 'All' 
                  ? "bg-white border-gray-200 text-gray-900 shadow-3xs" 
                  : "bg-transparent border-transparent text-gray-500 hover:text-gray-900"
              )}
              onClick={() => setFilterCategory('All')}
            >
              All products
            </button>
          </div>

          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-gray-700 hover:border-gray-300 transition-all cursor-pointer outline-none shadow-3xs"
            >
              <option value="All">Show All</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Filter size={12} className="stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Dynamic sliding Search Input Bar */}
        {isSearchBarOpen && (
          <div className="relative w-full animate-fade-in">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 stroke-[2]" />
            <input 
              id="product-search-input"
              type="text"
              placeholder=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 text-sm font-medium rounded-xl placeholder-gray-400 text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-xs"
            />
          </div>
        )}

        {/* Table representation */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 h-14 bg-white select-none font-sans uppercase tracking-wider">
                <th className="py-3 px-6 w-12"></th>
                <th className="py-3 px-4 font-semibold text-left">Product</th>
                <th className="py-3 px-4 font-semibold text-left">Type</th>
                <th className="py-3 px-4 font-semibold text-left">SKU</th>
                <th className="py-3 px-4 font-semibold text-left">Price</th>
                <th className="py-3 px-4 font-semibold text-center w-28">Qty</th>
                <th className="py-3 px-6 font-semibold text-right w-44"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-4">Loading products...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto mb-4 border border-gray-200">
                      <Package className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 uppercase">No Products Found</p>
                    <p className="text-xs text-gray-400 mt-1 font-semibold">Try modifying your search query or add a new product.</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  return (
                    <tr 
                      key={product.id} 
                      className="hover:bg-gray-50/50 transition-colors group h-16 border-b border-gray-100"
                    >
                      {/* Drag Handle */}
                      <td className="py-4 px-6 text-gray-300 group-hover:text-gray-400 transition-colors">
                        <GripVertical size={18} className="cursor-grab active:cursor-grabbing" />
                      </td>

                      {/* Product Name & Image */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                            {product.images?.[0] ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package size={18} className="text-gray-400" />
                            )}
                          </div>
                          <div className="flex flex-col max-w-[280px]">
                            <button
                              onClick={() => navigate(`/product/${product.id}`)}
                              className="text-sm font-bold text-gray-900 tracking-tight uppercase hover:text-[#6366F1] transition-colors flex items-center gap-1.5 text-left"
                            >
                              <span className="truncate">{product.name}</span>
                              <ExternalLink size={12} className="text-gray-400 group-hover:text-[#6366F1] transition-colors shrink-0" />
                            </button>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                              {product.category || 'Uncategorized'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Product Type (hardcoded as 'Own' in screenshot) */}
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600 font-semibold">
                          Own
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-500 font-semibold font-mono">
                          {product.sku || '—'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4">
                        <span className="text-sm font-bold text-gray-900 font-mono">
                          ৳{product.price}
                        </span>
                      </td>

                      {/* Quantity Badge */}
                      <td className="py-4 px-4 text-center">
                        {product.stock > 0 ? (
                          <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-lg min-w-[32px]">
                            {product.stock}
                          </span>
                        ) : (
                          <span className="text-gray-300 font-bold">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* More menu trigger button */}
                          <button
                            id={`product-action-${product.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === product.id ? null : product.id);
                            }}
                            className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all shadow-3xs cursor-pointer"
                          >
                            <MoreHorizontal size={14} />
                          </button>

                          {/* Quick Add stock button */}
                          <button
                            id={`quick-add-${product.id}`}
                            onClick={() => handleOpenQuickStock(product)}
                            className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer"
                            title="Quickly add inventory stock"
                          >
                            <PlusSquare size={12} className="text-gray-500" />
                            <span>Add</span>
                          </button>

                          {activeMenuId === product.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-20 top-12 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 min-w-[130px] text-left z-20">
                                <button
                                  id={`edit-prod-${product.id}`}
                                  onClick={() => {
                                    navigate(`/admin/add-product?edit=${product.id}`);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <Edit2 size={12} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  id={`duplicate-prod-${product.id}`}
                                  onClick={() => handleDuplicate(product)}
                                  className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <Copy size={12} />
                                  <span>Duplicate</span>
                                </button>
                                <button
                                  id={`delete-prod-${product.id}`}
                                  onClick={() => {
                                    setProductToDelete(product);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination matching screenshot */}
        {!loading && filteredProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-gray-100 gap-4">
            
            {/* Left side: Showing and per_page selector */}
            <div className="flex items-center gap-3 text-xs font-semibold text-gray-450">
              <span>
                Showing {startIndex + 1}–{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
              </span>
              
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-2.5 py-1 pr-7 text-xs font-bold text-gray-700 hover:border-gray-300 outline-none cursor-pointer shadow-3xs"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  <Filter size={10} />
                </div>
              </div>

              <span>per page</span>
            </div>

            {/* Right side: Page controllers */}
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 select-none">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all cursor-pointer",
                  currentPage === 1 
                    ? "border-gray-100 bg-white text-gray-200 cursor-not-allowed" 
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 active:scale-95"
                )}
              >
                <ArrowLeft size={12} strokeWidth={2.5} />
                <span>Previous</span>
              </button>

              <span className="flex items-center justify-center bg-white text-gray-900 border border-gray-200 font-bold text-xs w-9 h-9 rounded-xl shadow-3xs">
                {currentPage}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all cursor-pointer",
                  currentPage === totalPages 
                    ? "border-gray-100 bg-white text-gray-200 cursor-not-allowed" 
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 active:scale-95"
                )}
              >
                <span>Next</span>
                <ArrowRight size={12} strokeWidth={2.5} />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Quick Stock Replenishment Modal */}
      {quickStockProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-[24px] border border-gray-200 w-full max-w-md p-6 shadow-xl relative">
            
            <button
              onClick={() => setQuickStockProduct(null)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              Quick Stock In
            </h3>
            <p className="text-xs text-gray-450 font-bold uppercase tracking-wider mt-1">
              Add quantities for {quickStockProduct.name}
            </p>

            <form onSubmit={handleSaveQuickStock} className="space-y-4 mt-6">
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white border border-gray-200">
                  <img src={quickStockProduct.images?.[0]} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-gray-800 uppercase truncate max-w-[240px]">{quickStockProduct.name}</span>
                  <span className="text-[10px] text-gray-400 font-bold font-mono">SKU: {quickStockProduct.sku || quickStockProduct.id.slice(0, 8)}</span>
                </div>
              </div>

              {/* Sizes input list */}
              <div className="space-y-3.5 max-h-[280px] overflow-y-auto no-scrollbar py-1">
                <div className="grid grid-cols-2 gap-3.5">
                  {quickStockProduct.sizes.map((size) => {
                    const currentStock = quickStockProduct.sizeStock?.[size] || 0;
                    const addQty = quickStockQuantities[size] || 0;

                    return (
                      <div key={size} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-3xs">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md font-mono">{size}</span>
                          <span className="text-[10px] text-gray-400 font-bold">Qty: {currentStock}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-bold text-gray-400 font-sans">+</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={addQty || ''}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setQuickStockQuantities(prev => ({
                                ...prev,
                                [size]: val
                              }));
                            }}
                            className="w-full px-2 py-1.5 bg-gray-50/50 border border-gray-200 text-xs font-bold rounded-lg text-center text-gray-900 focus:bg-white focus:border-violet-500/40 outline-none transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Summary */}
              <div className="pt-2 flex justify-between items-center text-xs font-bold text-gray-500 border-t border-gray-100 uppercase tracking-wider">
                <span>Total Stock to Add:</span>
                <span className="text-sm font-extrabold text-emerald-600">
                  +{Object.values(quickStockQuantities).reduce((acc, curr) => acc + curr, 0)}
                </span>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setQuickStockProduct(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-[#6366F1]/15 active:scale-95 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-[24px] border border-gray-200 w-full max-w-sm p-6 shadow-xl relative">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              Delete Product?
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1 leading-relaxed">
              Are you sure you want to delete {productToDelete.name}? This action is permanent and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-3xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-red-600/15 active:scale-95 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
