/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShoppingBag, Search, Menu, X, User, Globe, Phone, MessageCircle, LogOut, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../contexts/CategoryContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import SearchOverlay from './SearchOverlay';

import { useCart } from '../contexts/CartContext';

export default function Navbar() {
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const { currency, setCurrency } = useCurrency();
  const { logoUrl, showAnnouncementBar, announcementMessage } = useBranding();
  const { currentUser, customerUser, logoutCustomer, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { categories } = useCategories();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' }
  ];
  if (isAdmin) {
    navLinks.push({ name: 'Admin Panel', path: '/admin' });
  }

  const handleAuthClick = async () => {
    if (currentUser) {
      await signOut();
      navigate('/');
    } else {
      await signInWithGoogle();
    }
  };

  return (
    <>
      {showAnnouncementBar && (
        <div className="bg-brand-gold text-black text-center py-2 px-4 text-[10px] md:text-xs font-black uppercase tracking-[0.15em] relative z-[60]">
          {announcementMessage}
        </div>
      )}
      <nav
        className={cn(
          'sticky top-0 left-0 w-full z-50 bg-black border-b border-white/10 transition-all duration-300'
        )}
      >
        {/* Top Row: Menu, Logo, Actions */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-[50px] md:h-[65px] grid grid-cols-3 items-center">
          {/* Left Side: Mobile Menu Toggle & Search (Icon only to keep center logo clean) */}
          <div className="flex items-center justify-start gap-1 md:gap-4 text-white">
            <button 
              onClick={() => setIsOpen(true)}
              className="p-2 text-white hover:text-brand-gold transition-colors"
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-white hover:text-brand-gold transition-colors"
            >
              <Search size={22} strokeWidth={1.5} />
            </button>
          </div>

          {/* Center Side: Logo */}
          <div className="flex items-center justify-center">
            <Link to="/" className="flex items-center group gap-2 md:gap-3">
              {logoUrl && (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="h-5 md:h-7 w-auto object-contain transition-transform group-hover:scale-105" 
                />
              )}
              <span className="font-black text-lg md:text-2xl uppercase tracking-tighter text-white whitespace-nowrap">
                Elegan <span className="text-brand-gold">BD</span>
              </span>
            </Link>
          </div>

          {/* Right Side: Account & Cart */}
          <div className="flex items-center justify-end gap-1 md:gap-6 text-white">
            {isAdmin && (
               <Link 
                  to="/admin"
                  className="hidden md:flex items-center gap-2 text-brand-gold hover:text-white transition-colors p-2" 
                  title="Admin Panel"
                >
                  <User size={20} strokeWidth={1.5} />
                  <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Admin</span>
                </Link>
            )}
            {currentUser ? (
              <Link to="/dashboard" className="flex items-center gap-2 text-white hover:text-brand-gold transition-colors p-2" title="My Account">
                <User size={22} strokeWidth={1.5} />
                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Account</span>
              </Link>
            ) : customerUser ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white">
                <div className="flex flex-col text-right">
                  <span className="text-[7.5px] uppercase tracking-widest text-white/50 font-black">Verified Client</span>
                  <span className="text-[9.5px] font-mono font-black text-brand-gold leading-none">{customerUser.phone}</span>
                </div>
                <button 
                  onClick={logoutCustomer}
                  className="p-1 text-[8.5px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors ml-1 cursor-pointer"
                  title="Logout Phone Session"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button onClick={handleAuthClick} className="flex items-center gap-2 text-white hover:text-brand-gold transition-colors p-2" title="Sign In">
                <User size={22} strokeWidth={1.5} />
                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Login</span>
              </button>
            )}

            <Link to="/cart" className="relative group p-2 text-white hover:text-brand-gold transition-colors">
              <ShoppingBag size={22} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-0 w-4 h-4 bg-brand-gold text-white text-[8px] rounded-full flex items-center justify-center font-black">
                  {cartCount}
                </span>
              )}
              <span className="hidden lg:inline-block ml-2 text-[10px] font-black uppercase tracking-widest translate-y-[1px]">Bag</span>
            </Link>
          </div>
        </div>

        {/* Bottom Row: Categories Menu (Desktop Only) */}
        <div className="hidden md:block bg-black border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-center gap-10 overflow-x-auto no-scrollbar">
            <Link 
              to="/category/all"
              className={cn(
                "text-[11px] font-bold tracking-widest text-brand-gold transition-colors relative group py-3"
              )}
            >
              ALL COLLECTION
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
            </Link>
            {categories.map((cat) => (
              <Link 
                key={cat.id}
                to={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  "text-[11px] font-bold tracking-widest text-white/80 hover:text-brand-gold transition-colors relative group py-3 whitespace-nowrap"
                )}
              >
                {cat.name.toUpperCase()}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
              </Link>
            ))}
            {['NEW ARRIVALS', 'OFFERS'].map((cat) => (
              <Link 
                key={cat}
                to={`/category/${cat.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  "text-[11px] font-bold tracking-widest text-white/80 hover:text-brand-gold transition-colors relative group py-3 whitespace-nowrap"
                )}
              >
                {cat}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-gold transition-all group-hover:w-full" />
              </Link>
            ))}
          </div>
        </div>

        <SearchOverlay 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
        />

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="fixed inset-0 top-0 left-0 w-[85%] max-w-sm h-screen bg-black z-[60] shadow-2xl overflow-y-auto border-r border-white/10"
            >
              <div className="p-6 text-white">
                <div className="flex justify-between items-center mb-8">
                  <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                    <span className="font-black text-xl md:text-2xl uppercase tracking-tighter text-white">
                      Elegan <span className="text-brand-gold">BD</span>
                    </span>
                  </Link>
                  <button onClick={() => setIsOpen(false)} className="text-white hover:text-brand-gold transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="flex flex-col space-y-4">
                  <Link 
                    to="/category/all"
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest py-3 border-b border-white/10 flex items-center justify-between group text-brand-gold"
                  >
                    ALL COLLECTION
                    <ChevronRight size={14} className="text-white/20 group-hover:text-brand-gold transition-colors" />
                  </Link>

                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setIsOpen(false)}
                      className="text-sm font-bold uppercase tracking-widest py-3 border-b border-white/10 flex items-center justify-between group text-white/80"
                    >
                      {cat.name}
                      <ChevronRight size={14} className="text-white/20 group-hover:text-brand-gold transition-colors" />
                    </Link>
                  ))}

                  {['NEW ARRIVALS', 'OFFERS', 'ABOUT', 'SUPPORT'].map((cat) => (
                    <Link
                      key={cat}
                      to={cat === 'ABOUT' ? '/about' : cat === 'SUPPORT' ? '/contact' : `/category/${cat.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "text-sm font-bold uppercase tracking-widest py-3 border-b border-white/10 flex items-center justify-between group text-white/80"
                      )}
                    >
                      {cat}
                      <ChevronRight size={14} className="text-white/20 group-hover:text-brand-gold transition-colors" />
                    </Link>
                  ))}
                  
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className="text-sm font-bold uppercase tracking-widest py-3 border-b border-white/10 text-brand-gold"
                    >
                      Admin Panel
                    </Link>
                  )}

                  {currentUser ? (
                    <button
                      onClick={() => {
                        signOut();
                        setIsOpen(false);
                      }}
                      className="text-sm font-bold uppercase tracking-widest py-3 border-b border-white/10 text-left flex items-center gap-2 text-white/80"
                    >
                      <LogOut size={18} /> Sign Out (Admin)
                    </button>
                  ) : customerUser ? (
                    <div className="py-3 border-b border-white/10 text-left space-y-2">
                      <div className="flex items-center gap-2 text-brand-gold">
                        <User size={18} strokeWidth={1.5} />
                        <span className="text-xs font-mono font-black">{customerUser.phone} (Verified)</span>
                      </div>
                      <button
                        onClick={() => {
                          logoutCustomer();
                          setIsOpen(false);
                        }}
                        className="text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut size={16} /> Log Out Phone
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        signInWithGoogle();
                        setIsOpen(false);
                      }}
                      className="text-sm font-bold uppercase tracking-widest py-3 border-b border-white/10 text-left flex items-center gap-2 text-white/80"
                    >
                      <User size={18} /> Login / Register
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-50 md:hidden backdrop-blur-sm"
          />
        )}
      </nav>
      
    </>
  );
}
