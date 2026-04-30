/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { ShoppingBag, Star } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, size: string, quantity: number) => void;
  loading?: "lazy" | "eager";
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, loading = "lazy" }) => {
  const { currency, rate } = useCurrency();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      const defaultSize = product.sizes[0] || 'M';
      onAddToCart(product.id, defaultSize, 1);
      toast.success(`${product.name} added to bag`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -50px 0px" }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative"
    >
      <Link to={`/product/${product.id}`} className="block overflow-hidden relative aspect-[3/4] bg-gray-100 border border-gray-100 rounded-lg">
        {product.images && product.images.length > 0 && product.images[0] ? (
          <motion.img
            src={product.images[0]}
            alt={product.name}
            className={cn(
              "w-full h-full object-cover bg-gray-100",
              product.stock === 0 && "grayscale"
            )}
            referrerPolicy="no-referrer"
            loading={loading}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
            <span className="text-xs uppercase tracking-widest font-bold">No Image</span>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
          <button 
            onClick={handleQuickAdd}
            className="w-full bg-black text-white py-3 rounded-md text-[9px] uppercase tracking-[0.2em] font-bold shadow-xl flex items-center justify-center space-x-2 hover:bg-brand-gold transition-colors"
          >
            <ShoppingBag size={14} />
            <span>অ্যাড করুন</span>
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          {product.discount > 0 && (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-red-500 bg-white/90 flex flex-col items-center justify-center text-red-500 shadow-sm animate-pulse">
              <span className="text-[9px] md:text-[11px] font-bold leading-none">{product.discount}%</span>
              <span className="text-[7px] md:text-[9px] font-bold leading-none">ছাড়</span>
            </div>
          )}
        </div>
        
        <div className="absolute top-2 left-2">
          <span className="bg-red-500 text-white px-2 py-0.5 text-[7px] md:text-[8px] uppercase tracking-widest font-bold">
            Sale
          </span>
        </div>
      </Link>

      <div className="mt-4 flex flex-col items-center text-center">
        <h3 className="text-[11px] md:text-[13px] uppercase tracking-wider font-bold text-brand-ink mb-1 group-hover:text-brand-gold transition-colors line-clamp-1 px-2">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        {product.rating !== undefined && product.rating > 0 && (
          <div className="flex items-center gap-1 mb-1 scale-75 origin-center">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10} 
                  className={cn(
                    "transition-colors",
                    i < Math.floor(product.rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"
                  )} 
                />
              ))}
            </div>
            <span className="text-[9px] font-bold text-gray-500">{product.rating}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
           <p className="text-sm md:text-base font-bold text-brand-ink">
             {formatPrice(product.price, currency, rate)}
           </p>
           {product.regularPrice && product.regularPrice > product.price && (
             <p className="text-[10px] md:text-[12px] text-gray-400 line-through">
               {formatPrice(product.regularPrice, currency, rate)}
             </p>
           )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
