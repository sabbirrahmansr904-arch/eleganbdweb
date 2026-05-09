/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { ShoppingBag, Star, Eye, Zap } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import QuickViewModal from './QuickViewModal';
import QuickOrderModal from './QuickOrderModal';

import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, size: string, quantity: number) => void;
  loading?: "lazy" | "eager";
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, loading = "lazy" }) => {
  const { currency, rate } = useCurrency();
  const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);
  const [isQuickOrderOpen, setIsQuickOrderOpen] = React.useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      const defaultSize = product.sizes[0] || 'M';
      onAddToCart(product.id, defaultSize, 1);
      toast.success(`${product.name} added to bag`);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleQuickOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickOrderOpen(true);
  };

  const discount = product.discount || 0;
  const rating = product.rating || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -50px 0px" }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative"
    >
      <Link to={`/product/${product.id}`} className="block overflow-hidden relative aspect-[3/4] bg-gray-50 border border-gray-100 rounded-lg">
        {product.images && product.images.length > 0 && product.images[0] ? (
          <motion.img
            src={product.images[0]}
            alt={product.name}
            className={cn(
              "w-full h-full object-cover bg-transparent",
              product.stock === 0 && "grayscale"
            )}
            referrerPolicy="no-referrer"
            loading={loading}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
            <span className="text-xs uppercase tracking-widest font-bold">No Image</span>
          </div>
        )}
        
        {/* Order Buttons Overlay */}
        <div className="absolute inset-x-2 bottom-2 md:bottom-4 md:inset-x-4 flex flex-col gap-1.5 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform md:translate-y-2 md:group-hover:translate-y-0 z-20">
          <button 
            onClick={handleQuickOrder}
            className="w-full bg-black text-white py-2 md:py-3 rounded-sm text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] shadow-xl flex items-center justify-center gap-1.5 md:gap-2 hover:bg-brand-gold hover:text-white transition-colors"
          >
            <Zap size={12} fill="currentColor" className="md:w-3.5 md:h-3.5" />
            <span>সরাসরি অর্ডার</span>
          </button>
          
          <div className="flex gap-1.5 md:gap-2">
            <button 
              onClick={handleQuickAdd}
              className="flex-1 bg-white text-black py-2 md:py-3 rounded-sm text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] shadow-lg flex items-center justify-center gap-1.5 md:gap-2 border border-gray-100 hover:bg-black hover:text-white transition-colors"
            >
              <ShoppingBag size={12} className="md:w-3.5 md:h-3.5" />
              <span className="hidden xs:inline">কার্টে দিন</span>
              <span className="xs:hidden">কার্ট</span>
            </button>
            <button 
              onClick={handleQuickView}
              className="hidden md:flex p-3 bg-white text-black rounded-sm shadow-lg border border-gray-100 hover:bg-black hover:text-white transition-colors"
              title="Quick View"
            >
              <Eye size={16} />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          {discount > 0 && (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-red-500 bg-white/90 flex flex-col items-center justify-center text-red-500 shadow-sm animate-pulse">
              <span className="text-[9px] md:text-[11px] font-bold leading-none">{discount}%</span>
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
        <h3 className="text-[11px] md:text-[13px] uppercase tracking-wider font-bold text-black mb-1 group-hover:text-brand-gold transition-colors line-clamp-1 px-2">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        {rating > 0 && (
          <div className="flex items-center gap-1 mb-1 scale-75 origin-center">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10} 
                  className={cn(
                    "transition-colors",
                    i < Math.floor(rating) ? "text-amber-400 fill-amber-400" : "text-black/10 fill-black/10"
                  )} 
                />
              ))}
            </div>
            <span className="text-[9px] font-bold text-gray-400">{rating}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
           <p className="text-sm md:text-base font-bold text-black">
             {formatPrice(product.price, currency, rate)}
           </p>
           {product.regularPrice && product.regularPrice > product.price && (
             <p className="text-[10px] md:text-[12px] text-gray-400 line-through">
               {formatPrice(product.regularPrice, currency, rate)}
             </p>
           )}
        </div>
      </div>
      <QuickViewModal 
        product={product} 
        isOpen={isQuickViewOpen} 
        onClose={() => setIsQuickViewOpen(false)} 
      />
      <QuickOrderModal
        product={product}
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
      />
    </motion.div>
  );
};

export default ProductCard;
