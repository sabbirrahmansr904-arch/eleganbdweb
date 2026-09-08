import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/ProductSkeleton';
import { Filter, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const ProductList = () => {
  const { category } = useParams<{ category: string }>();
  const { products, loading, offerProductIds = [] } = useProducts();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // Filter states
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by Category
    if (category === 'offers') {
      filtered = filtered.filter(p => offerProductIds.includes(p.id));
    } else if (category && category !== 'all' && category !== 'new-arrivals') {
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
    if (sortBy === 'price-low') {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    } else {
      // Natural serial code sorting for products (especially Pants & Formal wear)
      const getCodeKey = (p: typeof products[0]) => {
        const sku = (p.sku || '').trim();
        const name = (p.name || '').trim();
        const full = `${sku} ${name}`;
        const match = full.match(/\bcode\s*[:#-]?\s*(\d+)/i) || 
                      full.match(/\b(?:fp|pant|p|ep|item)[\s-_#]*(\d+)/i) || 
                      sku.match(/(\d+)/) || 
                      name.match(/\b(\d+)\b/) || 
                      name.match(/(\d+)/);
        if (match) return { hasCode: true, num: parseInt(match[1], 10), raw: sku || name };
        return { hasCode: false, num: 999999, raw: sku || name };
      };

      filtered = [...filtered].sort((a, b) => {
        const keyA = getCodeKey(a);
        const keyB = getCodeKey(b);
        if (keyA.hasCode && keyB.hasCode) {
          if (keyA.num !== keyB.num) return keyA.num - keyB.num;
          return keyA.raw.localeCompare(keyB.raw, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (keyA.hasCode && !keyB.hasCode) return -1;
        if (!keyA.hasCode && keyB.hasCode) return 1;
        return (a.sku || a.name || '').localeCompare(b.sku || b.name || '', undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return filtered;
  }, [products, category, selectedSizes, priceRange, sortBy]);

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const categoryTitle = category ? category.replace(/-/g, ' ').toUpperCase() : 'ALL PRODUCTS';

  return (
    <div className="pt-2 md:pt-4 pb-20 px-3 sm:px-6 lg:px-8">
      <div className="max-w-[1560px] mx-auto">
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

        {loading ? (
          <div className="mt-6">
            <ProductGridSkeleton count={8} />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4 mt-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-gray-400 uppercase tracking-widest text-sm mb-4">No products found in this category.</p>
            <Link to="/" className="text-brand-gold font-bold uppercase tracking-widest text-xs border-b-2 border-brand-gold pb-1">
              Back to Home
            </Link>
          </div>
        )}
      </div>

    </div>
  );
};

export default ProductList;
