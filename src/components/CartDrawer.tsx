import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatPrice } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const CartDrawer: React.FC = () => {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, total } = useCart();
  const { currency, rate } = useCurrency();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-black">Your Cart</h2>
                <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  ({items.length})
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-6 px-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag size={24} className="text-gray-300" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your bag is empty</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-6 text-[10px] font-black uppercase tracking-widest text-brand-gold hover:text-black transition-colors"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 group">
                    <div className="w-20 h-24 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-contain bg-white p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div className="relative">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="absolute -top-1 -right-1 p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                        <h3 className="text-[11px] font-black uppercase tracking-tight text-black line-clamp-1 pr-4">
                          {item.product.name}
                        </h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          Size: {item.selectedSize}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-black">
                          {formatPrice(item.product.price, currency, rate)}
                        </span>
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-gray-100 text-gray-500"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-8 text-center text-[10px] font-bold text-black">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-gray-100 text-gray-500"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-8 border-t border-gray-100 bg-gray-50/30">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subtotal</span>
                  <span className="text-xl font-black text-black">{formatPrice(total, currency, rate)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#1e40af] text-white py-4 text-[13px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98]"
                >
                  Checkout
                </button>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
