import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';
import ComboOfferBanner from './ComboOfferBanner';
import CartDrawer from './CartDrawer';
import { useCart } from '../contexts/CartContext';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShoppingCart } from 'lucide-react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  const isHomePath = location.pathname === '/';

  if (isAdminPath) return <>{children}</>;

  return (
    <div className="flex flex-col min-h-screen">
      {isHomePath && <ComboOfferBanner />}
      <Navbar />
      <CartDrawer />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />

      {/* Floating Order Now Widget when Cart has 3+ items */}
      <AnimatePresence>
        {cartCount >= 3 && location.pathname !== '/checkout' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 right-6 md:right-8 z-40 max-w-sm w-[90%] bg-black text-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] border border-white/10 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold shrink-0">
                <ShoppingCart size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider text-brand-gold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Combo Promo Active!
                </span>
                <span className="text-xs font-bold text-white/95">
                  {cartCount} Products in Cart
                </span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="bg-brand-gold hover:bg-yellow-500 text-black px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shrink-0"
            >
              Order Now
              <ArrowRight size={14} className="stroke-[3]" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
