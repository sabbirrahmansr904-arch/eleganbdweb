import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import ProductCard from '../components/ProductCard';
import { Filter, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const ProductList = () => {
  const { category } = useParams<{ category: string }>();
  const { products, loading } = useProducts();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // Filter states
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by Category
    if (category && category !== 'all' && category !== 'new-arrivals') {
      filtered = filtered.filter(p => {
        const pCat = p.category.toLowerCase();
        const paramCat = category.toLowerCase();
        return pCat === paramCat ||
          pCat.replace(/\s+/g, '-') === paramCat ||
          pCat.replace(/-/g, ' ') === paramCat ||
          (category === 'men' && pCat.includes('men')) ||
          (category === 'women' && pCat.includes('women'));
      });
    }

    // Filter by Size
    if (selectedSizes.length > 0) {
      filtered = filtered.filter(p => 
        p.sizes.some(s => selectedSizes.includes(s))
      );
    }

    // Filter by Price
    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Sorting
    if (sortBy === 'price-low') filtered = [...filtered].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') filtered = [...filtered].sort((a, b) => b.price - a.price);

    return filtered;
  }, [products, category, selectedSizes, priceRange, sortBy]);

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const categoryTitle = category ? category.replace(/-/g, ' ').toUpperCase() : 'ALL PRODUCTS';

  return (
    <div className="pt-2 md:pt-4 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs & Header */}
        <div className="mb-4 text-center">
          <nav className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 mb-2">
            <Link to="/" className="hover:text-brand-gold">Home</Link>
            <span>/</span>
            <span className="text-black font-bold">{categoryTitle}</span>
          </nav>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-blue-600">
            {categoryTitle}
          </h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold mt-2">
            Showing {filteredProducts.length} results
          </p>
        </div>

        {/* Toolbar */}
        <div className="sticky top-[120px] z-30 bg-white/95 backdrop-blur-md py-4 border-y border-gray-100 mb-8 flex items-center justify-between">
          <button 
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-brand-gold transition-colors text-black"
          >
            <Filter size={16} /> Filters
          </button>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-transparent text-[10px] font-black uppercase tracking-widest pr-8 pl-2 py-1 outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-100 animate-pulse rounded-sm" />
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-gray-400 uppercase tracking-widest text-sm mb-4">No products found in this category.</p>
              <Link to="/" className="text-brand-gold font-bold uppercase tracking-widest text-xs border-b-2 border-brand-gold pb-1">
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Filter Sidebar Mobile/Desktop Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 h-screen w-full max-w-sm bg-white z-[101] shadow-2xl p-8 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-black flex items-center gap-2">
                  <SlidersHorizontal size={20} /> Filter By
                </h2>
                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-black">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-10">
                {/* Size Filter */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Select Size</h4>
                  <div className="flex flex-wrap gap-2">
                    {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <button
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={cn(
                          "w-12 h-12 flex items-center justify-center text-xs font-bold border transition-all",
                          selectedSizes.includes(size) ? "bg-black text-white border-black" : "bg-white text-black border-gray-100 hover:border-black"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Filter */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Price Range</h4>
                  <div className="space-y-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="5000" 
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                      className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-gold"
                    />
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-black">
                      <span>৳ 0</span>
                      <span>৳ {priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Reset Button */}
                <button 
                  onClick={() => {
                    setSelectedSizes([]);
                    setPriceRange([0, 5000]);
                  }}
                  className="w-full border border-gray-100 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-black hover:border-black transition-all"
                >
                  Reset All Filters
                </button>

                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-full bg-black text-white py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-brand-gold transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductList;
