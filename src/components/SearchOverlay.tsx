import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProducts } from '../contexts/ProductContext';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Product } from '../types';
import ProductSkeleton from './ProductSkeleton';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const { products } = useProducts();
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const categories: string[] = Array.from(new Set(products.map(p => p.category)));

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        const filtered = products.filter(p => 
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 8);
        setResults(filtered);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setIsSearching(false);
    }
  }, [query, products]);

  const handleCategoryClick = (category: string) => {
    onClose();
    navigate(`/?category=${encodeURIComponent(category)}`);
  };

  const handleProductClick = (id: string) => {
    onClose();
    navigate(`/product/${id}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md text-gray-900 z-[70] flex flex-col justify-start items-center"
        >
          <div className="bg-white w-full max-w-4xl min-h-[500px] max-h-[85vh] rounded-b-3xl shadow-2xl flex flex-col overflow-hidden border-b border-x border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
              <div className="flex items-center flex-1 max-w-2xl mx-auto w-full relative">
                <Search className="absolute left-0 text-gray-400" size={24} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search products, categories..."
                  className="w-full pl-10 pr-4 py-2 text-xl md:text-2xl font-medium outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-4 text-gray-600 hover:text-black cursor-pointer"
              >
                <X size={26} strokeWidth={1.8} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-gray-50/50">
              <div className="max-w-3xl mx-auto w-full">
                {!query ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Categories */}
                    <div>
                      <h3 className="text-xs uppercase tracking-[0.15em] font-black text-gray-400 mb-4 flex items-center gap-2">
                        <Tag size={14} className="text-blue-600" /> Popular Categories
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat: string) => (
                          <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className="px-3.5 py-1.5 bg-white border border-gray-200 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all text-xs font-bold uppercase tracking-wider text-gray-800 cursor-pointer shadow-2xs"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                      <h3 className="text-xs uppercase tracking-[0.15em] font-black text-gray-400 mb-4 flex items-center gap-2">
                        <ArrowRight size={14} className="text-blue-600" /> Quick Links
                      </h3>
                      <div className="flex flex-col gap-2">
                        {['New Arrivals', 'Best Sellers', 'Collections'].map((link) => (
                          <Link 
                            key={link}
                            to="/category/all" 
                            onClick={onClose}
                            className="px-3.5 py-2 bg-white border border-gray-200/80 hover:border-blue-600 hover:bg-blue-50 rounded-xl text-sm font-extrabold text-gray-900 hover:text-blue-600 transition-all flex items-center justify-between"
                          >
                            <span>{link}</span>
                            <ArrowRight size={14} className="text-gray-400" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.15em] font-black text-gray-500 mb-6">
                      Found {results.length} results for "{query}"
                    </h3>
                    {isSearching ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => <ProductSkeleton key={i} />)}
                      </div>
                    ) : (
                      <motion.div 
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        variants={{
                          hidden: { opacity: 0 },
                          show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                        }}
                        initial="hidden"
                        animate="show"
                      >
                        {results.map((product) => (
                          <motion.div 
                            key={product.id}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                            onClick={() => handleProductClick(product.id)}
                            className="flex gap-4 p-3 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-2xl cursor-pointer group transition-all shadow-2xs"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="w-16 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                              <img 
                                src={product.images[0]} 
                                alt={product.name} 
                                className="w-full h-full group-hover:scale-105 transition-transform duration-300 object-cover"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex flex-col justify-center">
                              <p className="text-[10px] uppercase tracking-widest text-blue-600 font-extrabold mb-0.5">
                                {product.category}
                              </p>
                              <h4 className="font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors uppercase text-xs sm:text-sm line-clamp-1">
                                {product.name}
                              </h4>
                              <p className="text-sm font-black text-gray-900 mt-1">
                                ৳{product.price}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                    {results.length === 0 && !isSearching && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                      >
                        <p className="text-gray-500 font-medium">No products found matching your search.</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
