import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, ShoppingBag, Truck, Sparkles, Tag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBranding } from '../contexts/BrandingContext';
import { formatPrice, getCartPriceBreakdown, checkIsFreeShipping, cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const CartDrawer: React.FC = () => {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, total } = useCart();
  const { currency, rate } = useCurrency();
  const { shippingFreeAfter } = useBranding();
  const navigate = useNavigate();

  const priceBreakdown = getCartPriceBreakdown(items);
  const freeShippingStatus = checkIsFreeShipping(items);

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

            {/* Free Shipping Milestone Bar (Formal Pant 3 pcs) */}
            {items.length > 0 && (
              <div className={cn(
                "border-b px-6 py-3 transition-colors",
                freeShippingStatus.isFree ? "bg-emerald-50/90 border-emerald-100" : "bg-amber-50/80 border-amber-100"
              )}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Truck size={14} className={freeShippingStatus.isFree ? "text-emerald-600" : "text-amber-600"} />
                    {freeShippingStatus.isFree ? (
                      <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                        <Sparkles size={12} className="text-emerald-500 fill-emerald-500" />
                        🎉 ৩টি ফরমাল প্যান্টে ফ্রি ডেলিভারি একটিভ!
                      </span>
                    ) : (
                      <span className="text-amber-950">
                        {freeShippingStatus.pantsCount > 0 ? (
                          <><b>{freeShippingStatus.pantsCount}/3</b> প্যান্ট যুক্ত — আর <b>{freeShippingStatus.pantsNeeded}টি</b> প্যান্টে ফ্রি ডেলিভারি!</>
                        ) : (
                          <>যেকোনো <b>৩টি ফরমাল প্যান্ট</b> অর্ডারে <b>ডেলিভারি সম্পূর্ণ ফ্রি!</b></>
                        )}
                      </span>
                    )}
                  </div>
                  <span className={cn("text-[10px] font-black", freeShippingStatus.isFree ? "text-emerald-700" : "text-amber-700")}>
                    {freeShippingStatus.pantsCount}/3 ({freeShippingStatus.progress}%)
                  </span>
                </div>
                <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      freeShippingStatus.isFree ? "bg-emerald-500" : "bg-amber-600"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${freeShippingStatus.progress}%` }}
                  />
                </div>
              </div>
            )}

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
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
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
              <div className="px-6 py-6 border-t border-gray-100 bg-gray-50/30">
                {priceBreakdown.savings > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <Tag size={13} className="text-emerald-600" />
                      কম্বো সেভিংস (Combo Discount):
                    </span>
                    <span className="text-emerald-700 font-black">-{formatPrice(priceBreakdown.savings, currency, rate)}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Subtotal</span>
                    {priceBreakdown.savings > 0 && (
                      <span className="text-xs text-gray-400 line-through font-medium">
                        {formatPrice(priceBreakdown.originalSubtotal, currency, rate)}
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-black text-black">{formatPrice(total, currency, rate)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#1e40af] text-white py-4 text-[13px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98] cursor-pointer"
                >
                  Checkout
                </button>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors cursor-pointer"
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
