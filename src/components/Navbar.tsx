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

import { useCart } from '../contexts/CartContext';

export default function Navbar() {
  const { items, setIsCartOpen } = useCart();
  const cartCount = Array.isArray(items) ? items.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0) : 0;
  const { currency, setCurrency } = useCurrency();
  const { logoUrl, showAnnouncementBar, announcementMessage } = useBranding();
  const { currentUser, customerUser, logoutCustomer, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { categories } = useCategories();
  const [isOpen, setIsOpen] = useState(false);
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
          'sticky top-0 left-0 w-full z-50 bg-white border-b border-gray-200/80 shadow-xs transition-all duration-300'
        )}
      >
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 h-[55px] md:h-[68px] flex items-center justify-between gap-2 md:gap-6">
          
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center group gap-2">
              <img 
                src={logoUrl || '/logo.png'} 
                alt="Brand Logo" 
                className="h-8 md:h-11 w-auto max-w-[140px] object-contain transition-transform group-hover:scale-105" 
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-black text-lg sm:text-xl uppercase text-black whitespace-nowrap">
                ELEGAN BD
              </span>
            </Link>
          </div>

          {/* Center: Desktop Menu Items */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7 text-[12px] font-bold uppercase tracking-wider text-gray-800">
            <Link 
              to="/" 
              className="hover:text-blue-600 transition-colors whitespace-nowrap"
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
                className="flex items-center gap-1 hover:text-blue-600 transition-colors whitespace-nowrap cursor-pointer text-gray-800"
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
                    className="absolute top-full left-0 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 z-50 space-y-1 text-gray-800"
                  >
                    <Link 
                      to="/category/all" 
                      onClick={() => setIsCategoriesOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      <Layers size={14} className="text-blue-600" />
                      All Collection
                    </Link>
                    {Array.isArray(categories) && categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setIsCategoriesOpen(false)}
                        className="block px-3 py-2 rounded-xl hover:bg-gray-100 text-xs font-bold text-gray-800 hover:text-blue-600 transition-colors capitalize"
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
              className="hover:text-blue-600 transition-colors whitespace-nowrap"
            >
              Collections
            </Link>

            <Link 
              to="/track-order" 
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors whitespace-nowrap"
            >
              <Truck size={15} className="text-blue-600" />
              Track Order
            </Link>

            <Link 
              to="/reviews" 
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors whitespace-nowrap"
            >
              <Star size={14} className="text-blue-600 fill-blue-600/20" />
              Reviews
            </Link>
          </div>

          {/* Right: Actions & Hotline */}
          <div className="flex items-center gap-1.5 md:gap-3 text-gray-800">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Search"
            >
              <Search size={20} strokeWidth={1.8} />
            </button>

            <button 
              onClick={handleCartClick} 
              className="relative p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Bag"
            >
              <ShoppingBag size={20} strokeWidth={1.8} />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-black text-white text-[9px] rounded-full flex items-center justify-center font-black">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Single Account Icon */}
            {currentUser ? (
              <Link 
                to={isAdmin ? "/admin" : "/dashboard"} 
                className="p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer" 
                title={isAdmin ? "Admin Panel" : "My Account"}
              >
                <User size={20} strokeWidth={1.8} />
              </Link>
            ) : customerUser ? (
              <button onClick={logoutCustomer} className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer" title="Logout Session">
                <User size={20} strokeWidth={1.8} />
              </button>
            ) : (
              <Link to="/login" className="p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Sign In">
                <User size={20} strokeWidth={1.8} />
              </Link>
            )}

            {/* Mobile Hamburger Menu Button on Right */}
            <button 
              onClick={() => setIsOpen(true)}
              className="lg:hidden p-1.5 text-gray-800 hover:text-black transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={24} strokeWidth={1.8} />
            </button>

            {/* Vertical Divider */}
            <div className="hidden md:block h-5 w-[1px] bg-gray-200 my-auto ml-1 mr-1" />

            {/* Hotline 24/7 */}
            <a 
              href="tel:01327772213" 
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 hover:bg-gray-200/80 transition-all text-gray-900 group shadow-2xs"
            >
              <Phone size={14} className="text-amber-500 group-hover:rotate-12 transition-transform" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-gray-500">SUPPORT 24/7</span>
                <span className="text-[10.5px] font-mono font-bold text-gray-900 tracking-wider">01327772213</span>
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
                className="fixed top-0 left-0 w-[85%] max-w-[340px] max-h-[96vh] h-auto bg-white text-gray-900 z-[70] shadow-2xl rounded-br-3xl border-r border-b border-gray-200 flex flex-col overflow-hidden"
              >
                {/* Drawer Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-white shrink-0">
                  <div className="flex items-center justify-between mb-3.5">
                    <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2 group">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">
                          E
                        </div>
                      )}
                      <div>
                        <span className="font-black text-lg uppercase tracking-tighter text-black block leading-none">
                          Elegan BD
                        </span>
                        <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mt-0.5">
                          Exclusive Fashion
                        </span>
                      </div>
                    </Link>

                    <button 
                      onClick={() => setIsOpen(false)} 
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
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
                    className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-xs text-gray-500 transition-all cursor-pointer group text-left"
                  >
                    <Search size={16} className="text-gray-400 group-hover:text-gray-800 transition-colors" />
                    <span className="truncate">Search products, collections...</span>
                  </button>
                </div>

                {/* Drawer Main Scrollable Area */}
                <div className="overflow-y-auto px-5 pt-3 pb-5 space-y-4 no-scrollbar bg-white">
                  
                  {/* Quick Shortcuts Bar */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleCartClick();
                      }}
                      className="flex flex-col items-center justify-center p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200/80 transition-all cursor-pointer group"
                    >
                      <div className="relative mb-1 text-amber-500 group-hover:scale-110 transition-transform">
                        <ShoppingBag size={18} />
                        {cartCount > 0 && (
                          <span className="absolute -top-1.5 -right-2 bg-black text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                            {cartCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-900">Bag</span>
                    </button>

                    <Link
                      to="/track-order"
                      onClick={() => setIsOpen(false)}
                      className="flex flex-col items-center justify-center p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200/80 transition-all cursor-pointer group"
                    >
                      <Truck size={18} className="mb-1 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-900">Track</span>
                    </Link>

                    <Link
                      to="/contact"
                      onClick={() => setIsOpen(false)}
                      className="flex flex-col items-center justify-center p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200/80 transition-all cursor-pointer group"
                    >
                      <MessageCircle size={18} className="mb-1 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-900">Help</span>
                    </Link>
                  </div>

                  {/* Categories Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Categories & Collections</span>
                      <Layers size={12} className="text-gray-400" />
                    </div>

                    <div className="space-y-1">
                      <Link 
                        to="/category/all"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-black uppercase tracking-wider text-gray-900 transition-all group"
                      >
                        <span className="flex items-center gap-2.5">
                          <Layers size={14} className="text-amber-500" />
                          ALL COLLECTION
                        </span>
                        <ChevronRight size={14} className="text-gray-400 group-hover:text-black transition-colors" />
                      </Link>

                      {Array.isArray(categories) && categories.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-900 hover:text-blue-600 transition-all group"
                        >
                          <span>{cat.name}</span>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-700 transition-colors" />
                        </Link>
                      ))}

                      <Link
                        to="/category/new-arrivals"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-900 hover:text-blue-600 transition-all group"
                      >
                        <span className="flex items-center gap-2 text-amber-600 font-extrabold">
                          <Sparkles size={14} />
                          NEW ARRIVALS
                        </span>
                        <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-100 text-amber-800 rounded uppercase border border-amber-300">
                          NEW
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quick Links</span>
                    </div>

                    <div className="space-y-1">
                      <Link
                        to="/"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-900 hover:text-blue-600 transition-all"
                      >
                        <Home size={15} className="text-gray-500" />
                        Home Page
                      </Link>

                      <Link
                        to="/reviews"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-900 hover:text-blue-600 transition-all"
                      >
                        <Star size={15} className="text-blue-600 fill-blue-600/20" />
                        Customer Reviews
                      </Link>

                      <Link
                        to="/about"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-900 hover:text-blue-600 transition-all"
                      >
                        <Shield size={15} className="text-gray-500" />
                        About Us
                      </Link>

                      <Link
                        to="/contact"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-900 hover:text-blue-600 transition-all"
                      >
                        <PhoneCall size={15} className="text-gray-500" />
                        Contact & Support
                      </Link>

                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-black uppercase tracking-wider text-amber-900 hover:bg-amber-100 transition-all mt-2"
                      >
                        <span className="flex items-center gap-2.5">
                          <User size={15} className="text-amber-700" />
                          Admin Panel
                        </span>
                        <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.5 rounded">
                          STAFF
                        </span>
                      </Link>
                    </div>
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
