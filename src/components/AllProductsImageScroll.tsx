import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { ChevronLeft, ChevronRight, Eye, Star, Heart } from 'lucide-react';
import { motion } from 'motion/react';

// Simple cn utility helper
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface AllProductsImageScrollProps {
  currentProductId?: string;
  category?: string;
}

export const AllProductsImageScroll: React.FC<AllProductsImageScrollProps> = ({ currentProductId, category }) => {
  const { products } = useProducts();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter products: same category or all products
  const displayProducts = products.filter(p => {
    if (currentProductId && p.id === currentProductId) return false;
    if (category && p.category && p.category.toLowerCase() !== category.toLowerCase()) return false;
    return true;
  });

  if (displayProducts.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full my-8 py-6 px-4 sm:px-6 lg:px-8 bg-white rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
            {category ? `${category} Collection` : 'You May Also Like'}
          </h3>
          <p className="text-xs text-gray-500 font-medium">Explore our handpicked trending items</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 transition-colors shadow-2xs cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 transition-colors shadow-2xs cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex items-center gap-4.5 overflow-x-auto scrollbar-none py-3 px-1 scroll-smooth snap-x snap-mandatory w-full"
      >
        {displayProducts.map((product) => {
          const mainImage = product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop';
          const secondaryImage = product.images?.[1] || mainImage;
          const [isHovered, setIsHovered] = useState(false);
          const isPant = (product.category || '').toLowerCase().includes('pant') || (product.name || '').toLowerCase().includes('pant');

          const formatPrice = (p: number) => `৳${p.toLocaleString()}`;

          return (
            <div
              key={product.id}
              onClick={() => {
                navigate(`/product/${product.id}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="min-w-[200px] sm:min-w-[240px] max-w-[240px] bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 snap-start cursor-pointer flex flex-col overflow-hidden group shrink-0"
            >
              <div className={cn("relative w-full overflow-hidden", isPant ? "aspect-square bg-white" : "aspect-3/4 bg-gray-50")}>
                <img
                  src={isHovered ? secondaryImage : mainImage}
                  alt={product.name}
                  className={cn(
                    "w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105",
                    isPant ? "object-contain p-2" : ""
                  )}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                    {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </span>
                )}

                <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/product/${product.id}`);
                    }}
                    className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-gray-700 hover:text-indigo-600 flex items-center justify-center shadow-md transition-colors"
                    title="Quick View"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>

              <div className="p-3.5 flex flex-col flex-grow justify-between">
                <div>
                  {product.category && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      {product.category}
                    </span>
                  )}
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {product.name}
                  </h4>
                </div>

                <div className="mt-2.5 pt-2 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm sm:text-base font-black text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-[11px] font-medium text-gray-400 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    Buy Now
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AllProductsImageScroll;
