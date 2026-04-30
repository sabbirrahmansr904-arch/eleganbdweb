/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useNavigate } from 'react-router-dom';
import { CartItem } from '../types';
import { formatPrice } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { Trash2, Minus, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, size: string, delta: number) => void;
  onRemove: (id: string, size: string) => void;
}

export default function Cart({ items, onUpdateQuantity, onRemove }: CartProps) {
  const { currency, rate, symbol } = useCurrency();
  const navigate = useNavigate();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 200 ? 0 : 25;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 px-6 text-center">
        <h1 className="text-5xl font-serif mb-6">Your bag is empty.</h1>
        <p className="text-brand-ink/50 text-sm uppercase tracking-widest mb-12">Looks like you haven't added anything yet.</p>
        <Link 
          to="/shop" 
          className="bg-brand-ink text-white px-12 py-5 text-xs uppercase tracking-[0.2em] font-bold hover:bg-brand-gold transition-all duration-300"
        >
          Explore Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
      <h1 className="text-5xl font-serif mb-16">Shopping Bag</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={`${item.id}-${item.selectedSize}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-start justify-between border-b border-brand-ink/10 pb-8 group"
              >
                <div className="flex space-x-6">
                  <div className="w-24 md:w-32 aspect-[3/4] bg-brand-muted relative overflow-hidden">
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col justify-between py-1">
                    <div>
                      <h3 className="text-sm md:text-base uppercase tracking-widest font-medium mb-1 hover:text-brand-gold transition-colors">
                        <Link to={`/product/${item.id}`}>{item.name}</Link>
                      </h3>
                      <p className="text-[10px] text-brand-ink/50 uppercase tracking-widest mb-4">Size: {item.selectedSize}</p>
                      <p className="text-sm font-medium">{formatPrice(item.price, currency, rate)}</p>
                    </div>
                    
                    <div className="flex items-center space-x-6 border border-brand-ink/10 w-fit px-4 py-2 mt-4">
                      <button onClick={() => onUpdateQuantity(item.id, item.selectedSize, -1)} className="hover:text-brand-gold">
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, item.selectedSize, 1)} className="hover:text-brand-gold">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between self-stretch py-1">
                  <button 
                    onClick={() => onRemove(item.id, item.selectedSize)}
                    className="text-brand-ink/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} strokeWidth={1.5} />
                  </button>
                  <p className="text-sm font-bold">{formatPrice(item.price * item.quantity, currency, rate)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <button 
            onClick={() => navigate('/shop')}
            className="flex items-center space-x-2 text-[10px] uppercase tracking-[0.2em] pt-4 font-bold hover:text-brand-gold transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Continue Shopping</span>
          </button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-brand-muted p-10 border border-brand-ink/5 sticky top-32">
            <h2 className="text-2xl font-serif mb-8 border-b border-brand-ink/10 pb-4">Order Summary</h2>
            
            <div className="space-y-6 mb-8 text-xs uppercase tracking-widest">
              <div className="flex justify-between">
                <span className="text-brand-ink/60">Subtotal</span>
                <span className="font-bold">{formatPrice(subtotal, currency, rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-ink/60">Shipping</span>
                <span className="font-bold">{shipping === 0 ? 'Complimentary' : formatPrice(shipping, currency, rate)}</span>
              </div>
              {shipping > 0 && (
                <p className="text-[9px] normal-case italic text-brand-ink/40">
                  Complimentary express shipping on orders over {formatPrice(200, currency, rate)}.
                </p>
              )}
            </div>

            <div className="pt-6 border-t border-brand-ink/20 mb-10 flex justify-between items-end">
              <span className="text-sm uppercase tracking-widest font-bold">Total</span>
              <span className="text-2xl md:text-3xl font-serif">{formatPrice(subtotal + shipping, currency, rate)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-brand-ink text-white py-5 text-xs uppercase tracking-[0.3em] font-bold hover:bg-brand-gold transition-all duration-500 flex items-center justify-center space-x-3 group"
            >
              <span>Secure Checkout</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="mt-8 space-y-4">
              <div className="flex items-center space-x-4">
                 <img src="https://img.icons8.com/color/48/000000/visa.png" className="h-6 grayscale opacity-50" alt="Visa" />
                 <img src="https://img.icons8.com/color/48/000000/mastercard.png" className="h-6 grayscale opacity-50" alt="Mastercard" />
                 <img src="https://img.icons8.com/color/48/000000/amex.png" className="h-6 grayscale opacity-50" alt="Amex" />
              </div>
              <p className="text-[9px] uppercase tracking-widest text-brand-ink/40">
                100% SECURE CHECKOUT GUARANTEED
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
