import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Star, ChevronRight, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { formatPrice, cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { currency, rate } = useCurrency();
  const { addToCart } = useCart();
  const isBag = (product.category || '').toLowerCase().includes('bag');
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error(isBag ? 'Please select QN' : 'Please select a size');
      return;
    }
    addToCart(product, selectedSize, quantity);
    toast.success('Added to bag!');
    onClose();
  };

  const discount = product.discount || 0;
  const rating = product.rating || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl max-h-[90vh] bg-white z-[101] shadow-2xl overflow-hidden rounded-sm flex flex-col md:flex-row"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full text-brand-black transition-colors"
            >
              <X size={20} />
            </button>

            {/* Left: Images */}
            <div className="w-full md:w-1/2 h-[300px] md:h-auto relative bg-gray-50">
              <img 
                src={product.images[selectedImage]} 
                alt={product.name} 
                className="w-full h-full object-contain bg-white p-4"
              />
              {product.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {product.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        selectedImage === idx ? "bg-brand-gold w-4" : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              )}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                  {discount}% OFF
                </div>
              )}
            </div>

            {/* Right: Info */}
            <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">QUICK VIEW</p>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase text-brand-black">
                    {product.name}
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-2xl font-black text-brand-gold">
                      {formatPrice(product.price, currency, rate)}
                    </span>
                    {product.regularPrice && product.regularPrice > product.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(product.regularPrice, currency, rate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sizes */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest">{isBag ? 'Select QN' : 'Select Size'}</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center text-xs font-bold border transition-all",
                          selectedSize === size ? "bg-brand-black text-white border-brand-black" : "bg-white text-brand-black border-gray-200 hover:border-brand-gold"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 italic">
                    {product.description}
                  </p>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-4">
                  <button 
                    onClick={handleAddToCart}
                    className="w-full bg-brand-gold text-white py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-gold/20 hover:bg-brand-black transition-all"
                  >
                    Add to Bag
                  </button>
                  <button 
                    onClick={() => {
                        onClose();
                        window.location.href = `/product/${product.id}`;
                    }}
                    className="w-full border border-gray-200 py-4 text-[10px] font-black uppercase tracking-[0.2em] hover:border-brand-gold transition-all"
                  >
                    View Full Details
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-brand-gold" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Fast Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw size={14} className="text-brand-gold" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">7 Days Exchange</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
