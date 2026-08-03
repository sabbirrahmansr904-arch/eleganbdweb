/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShoppingBag, Search, Menu, X, User, Globe, Phone, MessageCircle, LogOut, ChevronRight, ChevronDown, Truck, Sparkles, Tag, Layers, Home, PhoneCall, Shield, Star, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../contexts/CategoryContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import SearchOverlay from './SearchOverlay';
import LoginModal from './LoginModal';

import { useCart } from '../contexts/CartContext';

export default function Navbar() {
  const { items, setIsCartOpen } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const { currency, setCurrency } = useCurrency();
  const { logoUrl, showAnnouncementBar, announcementMessage } = useBranding();
  const { currentUser, customerUser, logoutCustomer, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { categories } = useCategories();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
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
    setIsLoginOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' }
  ];
  if (isAdmin) {
    navLinks.push({ name: 'Admin Panel', path: '/admin' });
  }

  const handleCartClick = () => {
    if (location.pathname === '/cart' || location.pathname === '/checkout') {
      navigate('/cart');
    } else {
      setIsCartOpen(true);
    }
  };

  return (
    <>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      {showAnnouncementBar && (
        <div className="bg-brand-gold text-black py-2 overflow-hidden whitespace-nowrap relative z-[60] border-b border-black/5">
          <motion.div
            initial={{ x: "0%" }}
            animate={{ x: "-100%" }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-10 min-w-max"
          >
            {[...Array(10)].map((_, i) => (
              <span key={i} className="text-[10px] md:text-xs font-black uppercase tracking-[0.15em] text-blue-600">
                {announcementMessage}
              </span>
            ))}
          </motion.div>
        </div>
      )}
      <nav
        className={cn(
          'sticky top-0 left-0 w-full z-50 bg-black border-b border-white/10 transition-all duration-300'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-[55px] md:h-[68px] flex items-center justify-between gap-2 md:gap-6">
          
          {/* Left: Mobile Menu Toggle & Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsOpen(true)}
              className="lg:hidden p-2 text-white hover:text-gray-300 transition-colors cursor-pointer"
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>

            <Link to="/" className="flex items-center group gap-1.5 md:gap-2">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Elegan BD" 
                  className="h-5 md:h-6 w-auto object-contain transition-transform group-hover:scale-105" 
                />
              ) : (
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-brand-gold text-black flex items-center justify-center font-black text-[10px] md:text-xs">
                  E
                </div>
              )}
              <span className="font-black text-base md:text-lg uppercase tracking-tighter text-white whitespace-nowrap">
                Elegan BD
              </span>
            </Link>
          </div>

          {/* Center: Desktop Menu Items (Screenshot Layout) */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7 text-[12px] font-bold uppercase tracking-wider text-white/90">
            <Link 
              to="/" 
              className="hover:text-blue-400 transition-colors whitespace-nowrap"
            >
              Home
            </Link>

            {/* Categories Dropdown */}
            <div 
              className="relative py-2"
              onMouseEnter={() => setIsCategoriesOpen(true)}
              onMouseLeave={() => setIsCategoriesOpen(false)}
            >
              <button 
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                className="flex items-center gap-1 hover:text-blue-400 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Categories</span>
                <ChevronDown size={14} className={cn("transition-transform duration-200", isCategoriesOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isCategoriesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 w-52 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-white/80"
                  >
                    <Link 
                      to="/category/all" 
                      onClick={() => setIsCategoriesOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-xs font-bold hover:text-white transition-colors"
                    >
                      <Layers size={14} className="text-blue-400" />
                      All Collection
                    </Link>
                    {Array.isArray(categories) && categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setIsCategoriesOpen(false)}
                        className="block px-3 py-2 rounded-xl hover:bg-white/10 text-xs font-bold hover:text-white transition-colors capitalize"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link 
              to="/category/all" 
              className="hover:text-blue-400 transition-colors whitespace-nowrap"
            >
              Collections
            </Link>

            <Link 
              to="/track-order" 
              className="flex items-center gap-1.5 hover:text-blue-400 transition-colors whitespace-nowrap"
            >
              <Truck size={15} className="text-blue-400" />
              Track Order
            </Link>

            <Link 
              to="/reviews" 
              className="flex items-center gap-1.5 hover:text-blue-400 transition-colors whitespace-nowrap"
            >
              <Star size={14} className="text-blue-400 fill-blue-400/30" />
              Reviews
            </Link>
          </div>

          {/* Right: Actions & Hotline */}
          <div className="flex items-center gap-1.5 md:gap-3 text-white">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Search"
            >
              <Search size={20} strokeWidth={1.8} />
            </button>

            <button 
              onClick={handleCartClick} 
              className="relative p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Bag"
            >
              <ShoppingBag size={20} strokeWidth={1.8} />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-brand-gold text-black text-[9px] rounded-full flex items-center justify-center font-black">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Single Account Icon */}
            {currentUser ? (
              <Link 
                to={isAdmin ? "/admin" : "/dashboard"} 
                className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" 
                title={isAdmin ? "Admin Panel" : "My Account"}
              >
                <User size={20} strokeWidth={1.8} />
              </Link>
            ) : customerUser ? (
              <button onClick={logoutCustomer} className="p-2 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer" title="Logout Session">
                <User size={20} strokeWidth={1.8} />
              </button>
            ) : (
              <button onClick={() => setIsLoginOpen(true)} className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" title="Sign In">
                <User size={20} strokeWidth={1.8} />
              </button>
            )}

            {/* Vertical Divider */}
            <div className="hidden md:block h-5 w-[1px] bg-white/20 my-auto ml-1 mr-1" />

            {/* Hotline 24/7 */}
            <a 
              href="tel:01327772213" 
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white group"
            >
              <Phone size={14} className="text-amber-400 group-hover:rotate-12 transition-transform" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-white/50">SUPPORT 24/7</span>
                <span className="text-[10.5px] font-mono font-bold text-white tracking-wider">01327772213</span>
              </div>
            </a>
          </div>

        </div>

        <SearchOverlay 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
        />

        {/* Mobile Slide-Out Drawer Menu */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop Blur Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/75 z-[60] backdrop-blur-md"
              />

              {/* Drawer Content */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 260 }}
                className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[340px] h-full bg-[#0a0a0a] text-white z-[70] shadow-2xl border-r border-white/10 flex flex-col justify-between overflow-hidden"
              >
                {/* Drawer Header */}
                <div className="p-5 border-b border-white/10 bg-black/60 backdrop-blur-sm shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2 group">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-7 w-auto object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-gold text-black flex items-center justify-center font-black text-sm">
                          E
                        </div>
                      )}
                      <div>
                        <span className="font-black text-lg uppercase tracking-tighter text-white block leading-none">
                          Elegan BD
                        </span>
                        <span className="text-[9px] font-bold tracking-widest text-white/40 uppercase block mt-0.5">
                          Exclusive Fashion
                        </span>
                      </div>
                    </Link>

                    <button 
                      onClick={() => setIsOpen(false)} 
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Close Menu"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Search Input Trigger inside Drawer */}
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      setIsSearchOpen(true);
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-xs text-white/50 transition-all cursor-pointer group text-left"
                  >
                    <Search size={16} className="text-white/40 group-hover:text-white transition-colors" />
                    <span className="truncate">Search products, collections...</span>
                  </button>
                </div>

                {/* Drawer Main Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 no-scrollbar">
                  
                  {/* Quick Shortcuts Bar */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleCartClick();
                      }}
                      className="flex flex-col items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all cursor-pointer group"
                    >
                      <div className="relative mb-1 text-amber-400 group-hover:scale-110 transition-transform">
                        <ShoppingBag size={18} />
                        {cartCount > 0 && (
                          <span className="absolute -top-1.5 -right-2 bg-white text-black text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                            {cartCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-white/80">Bag</span>
                    </button>

                    <Link
                      to="/track-order"
                      onClick={() => setIsOpen(false)}
                      className="flex flex-col items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all cursor-pointer group"
                    >
                      <Truck size={18} className="mb-1 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-white/80">Track</span>
                    </Link>

                    <Link
                      to="/contact"
                      onClick={() => setIsOpen(false)}
                      className="flex flex-col items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all cursor-pointer group"
                    >
                      <MessageCircle size={18} className="mb-1 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-white/80">Help</span>
                    </Link>
                  </div>

                  {/* Categories Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Categories & Collections</span>
                      <Layers size={12} className="text-white/30" />
                    </div>

                    <div className="space-y-1">
                      <Link 
                        to="/category/all"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-white transition-all group"
                      >
                        <span className="flex items-center gap-2.5">
                          <Layers size={14} className="text-amber-400" />
                          ALL COLLECTION
                        </span>
                        <ChevronRight size={14} className="text-white/30 group-hover:text-white transition-colors" />
                      </Link>

                      {Array.isArray(categories) && categories.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-all group"
                        >
                          <span>{cat.name}</span>
                          <ChevronRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                        </Link>
                      ))}

                      <Link
                        to="/category/new-arrivals"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-all group"
                      >
                        <span className="flex items-center gap-2 text-amber-300">
                          <Sparkles size={14} />
                          NEW ARRIVALS
                        </span>
                        <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-400/20 text-amber-300 rounded uppercase border border-amber-400/30">
                          NEW
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Quick Links</span>
                    </div>

                    <div className="space-y-1">
                      <Link
                        to="/"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-all"
                      >
                        <Home size={15} className="text-white/50" />
                        Home Page
                      </Link>

                      <Link
                        to="/reviews"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-all"
                      >
                        <Star size={15} className="text-blue-400 fill-blue-400/20" />
                        Customer Reviews
                      </Link>

                      <Link
                        to="/about"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-all"
                      >
                        <Shield size={15} className="text-white/50" />
                        About Us
                      </Link>

                      <Link
                        to="/contact"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-all"
                      >
                        <PhoneCall size={15} className="text-white/50" />
                        Contact & Support
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-black uppercase tracking-wider text-amber-300 transition-all mt-2"
                        >
                          <span className="flex items-center gap-2.5">
                            <User size={15} />
                            Admin Panel
                          </span>
                          <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.5 rounded">
                            STAFF
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>

                </div>

                {/* Drawer Footer & Account Section */}
                <div className="p-4 border-t border-white/10 bg-black/80 shrink-0 space-y-3">
                  {currentUser ? (
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-400 text-black font-black flex items-center justify-center text-xs">
                          {currentUser.email ? currentUser.email.slice(0, 2).toUpperCase() : 'AD'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">System Administrator</span>
                          <span className="text-[11px] font-mono font-bold text-white truncate block">{currentUser.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          signOut();
                          setIsOpen(false);
                        }}
                        className="w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-rose-500/30"
                      >
                        <LogOut size={14} /> Sign Out Admin
                      </button>
                    </div>
                  ) : customerUser ? (
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-black flex items-center justify-center text-xs">
                          <User size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">Verified Client</span>
                          <span className="text-[11px] font-mono font-bold text-white truncate block">{customerUser.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          logoutCustomer();
                          setIsOpen(false);
                        }}
                        className="w-full py-2 bg-white/10 hover:bg-white/20 text-rose-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogOut size={14} /> Logout Session
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        signInWithGoogle();
                        setIsOpen(false);
                      }}
                      className="w-full py-2.5 bg-white text-black hover:bg-gray-200 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <User size={16} /> Login / Register
                    </button>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[9px] text-white/40 uppercase tracking-wider font-bold">
                    <span>© Elegan BD</span>
                    <span>Exclusive Fashion</span>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </nav>
      
    </>
  );
}
