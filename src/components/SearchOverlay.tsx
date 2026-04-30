import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProducts } from '../contexts/ProductContext';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Product } from '../types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const { products } = useProducts();
  const [results, setResults] = useState<Product[]>([]);
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
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 8);
      setResults(filtered);
    } else {
      setResults([]);
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
          className="fixed inset-0 bg-[#0a0a0a] text-white z-[70] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center flex-1 max-w-2xl mx-auto w-full relative">
              <Search className="absolute left-0 text-gray-500" size={24} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search products, categories..."
                className="w-full pl-10 pr-4 py-2 text-xl md:text-3xl font-light outline-none bg-transparent placeholder:text-gray-600 text-white"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors ml-4 text-white"
            >
              <X size={32} strokeWidth={1} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full p-8">
              {!query ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Categories */}
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-6 flex items-center gap-2">
                      <Tag size={14} /> Popular Categories
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {categories.map((cat: string) => (
                        <button
                          key={cat}
                          onClick={() => handleCategoryClick(cat)}
                          className="px-4 py-2 border border-white/20 hover:border-brand-gold hover:bg-brand-gold hover:text-black transition-all text-sm font-medium uppercase tracking-wider text-gray-300"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-6 flex items-center gap-2">
                      <ArrowRight size={14} /> Quick Links
                    </h3>
                    <ul className="space-y-4">
                      {['New Arrivals', 'Best Sellers', 'Sale'].map((link) => (
                        <li key={link}>
                          <Link 
                            to="/" 
                            onClick={onClose}
                            className="text-2xl font-serif italic text-white hover:text-brand-gold transition-colors"
                          >
                            {link}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-8">
                    Found {results.length} results for "{query}"
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {results.map((product) => (
                      <div 
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="flex gap-4 p-4 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl cursor-pointer group transition-all"
                      >
                        <div className="w-20 h-24 bg-white/5 rounded-lg overflow-hidden shrink-0">
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="text-[10px] uppercase tracking-widest text-brand-gold font-bold mb-1">
                            {product.category}
                          </p>
                          <h4 className="font-medium text-white group-hover:text-brand-gold transition-colors uppercase italic tracking-tighter">
                            {product.name}
                          </h4>
                          <p className="text-sm font-bold text-gray-400 mt-1">
                            ৳{product.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {results.length === 0 && (
                    <div className="text-center py-20">
                      <p className="text-gray-500 italic">No products found matching your search.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
