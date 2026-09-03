import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, ShoppingBag, Sparkles } from 'lucide-react';
import { useProducts } from '../contexts/ProductContext';
import { formatPrice } from '../lib/utils';

export default function AllProductsImageScroll() {
  const { products } = useProducts();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Auto scroll effect - 1 line scrolling one by one
  useEffect(() => {
    if (isHovered || !scrollRef.current || products.length === 0) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        // Scroll step equal to one card width (~200px)
        const scrollStep = 220; 
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
        }
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [isHovered, products.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === 'left' ? -240 : 240;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="w-full mt-12 pt-10 border-t border-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-extrabold text-[11px] uppercase tracking-widest">
            <Sparkles size={14} />
            <span>Product Showcase</span>
          </div>
          <h3 className="text-lg md:text-xl font-black italic tracking-tighter uppercase text-gray-900 mt-0.5">
            All Products Gallery • সব প্রোডাক্ট ক্যাটালগ
          </h3>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => handleScroll('left')}
            className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-black hover:text-white hover:border-black transition-colors flex items-center justify-center text-gray-700 cursor-pointer shadow-2xs active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-black hover:text-white hover:border-black transition-colors flex items-center justify-center text-gray-700 cursor-pointer shadow-2xs active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 1 Line Horizontal Edge-to-Edge Scrollable Container */}
      <div 
        className="relative group -mx-4 sm:-mx-6 lg:-mx-8"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div 
          ref={scrollRef}
          className="flex items-center gap-4.5 overflow-x-auto scrollbar-none py-3 px-4 sm:px-6 lg:px-8 scroll-smooth snap-x snap-mandatory w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => {
            const imgUrl = Array.isArray(product.images) && product.images.length > 0 
              ? product.images[0] 
              : (product.image || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80');

            const isPant = Boolean(
              (product.category || '').toLowerCase().includes('pant') ||
              (product.category || '').toLowerCase().includes('trouser') ||
              (product.name || '').toLowerCase().includes('pant') ||
              (product.name || '').toLowerCase().includes('trouser')
            );

            return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="shrink-0 w-48 sm:w-56 md:w-60 group/card bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1 snap-start relative"
              >
                {/* Image Box */}
                <div className={cn("relative w-full overflow-hidden", isPant ? "aspect-square bg-white" : "aspect-3/4 bg-gray-50")}>
                  <img
                    src={imgUrl}
                    alt={product.name}
                    className={cn(
                      "w-full h-full transition-transform duration-500 group-hover/card:scale-108",
                      isPant ? "object-contain object-center" : "object-cover object-center"
                    )}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Category Tag overlay */}
                  <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                    {product.category || 'Elegan'}
                  </span>

                  {/* Center Hover Zoom Eye Icon */}
                  <div className="absolute inset-0 bg-black/15 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <span className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-xl transform scale-75 group-hover/card:scale-100 transition-all duration-300">
                      <Eye size={22} className="stroke-[2.5]" />
                    </span>
                  </div>
                </div>

                {/* Info Footer */}
                <div className="p-3 bg-white text-center">
                  <h4 className="text-[11px] font-extrabold text-gray-900 truncate group-hover/card:text-blue-600 transition-colors">
                    {product.name}
                  </h4>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <span className="text-xs font-black text-blue-700">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
