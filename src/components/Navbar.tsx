/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShoppingBag, Search, Menu, X, User, Globe, Phone, MessageCircle, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import AnnouncementBar from './AnnouncementBar';
import SearchOverlay from './SearchOverlay';

interface NavbarProps {
  cartCount: number;
}

export default function Navbar({ cartCount }: NavbarProps) {
  const { currency, setCurrency } = useCurrency();
  const { logoUrl } = useBranding();
  const { currentUser, isAdmin, signInWithGoogle, signOut } = useAuth();
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
  } else {
    navLinks.push({ name: 'Admin', path: '/admin/login' });
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
      <AnnouncementBar />
      <nav
        className={cn(
          'sticky top-0 left-0 w-full z-50 transition-all duration-500 h-[70px] md:h-[110px] px-6 md:px-12 flex items-center justify-between',
          'bg-black shadow-lg',
          'text-white'
        )}
      >
        {/* Left: Mobile Menu Trigger */}
        <div className="flex items-center w-1/4">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 -ml-2 hover:text-brand-gold transition-colors"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Center: Logo */}
        <div className="flex-1 flex justify-center px-4">
          <Link to="/" className="flex items-center group whitespace-nowrap gap-2 md:gap-3.5">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-7 md:h-11 w-auto object-contain transition-all duration-300 group-hover:scale-105 shrink-0" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="flex flex-col items-start shrink-0">
              <span className="font-black text-xl md:text-4xl italic tracking-tighter uppercase text-white group-hover:text-brand-gold transition-colors leading-none">
                Elegan BD
              </span>
            </div>
          </Link>
        </div>

        {/* Right Nav */}
        <div className="flex items-center justify-end gap-3 md:gap-6 text-[11px] uppercase tracking-[0.2em] font-bold w-1/4">
          <div className="hidden lg:flex items-center gap-6">
            <Link to="/about" className="hover:text-brand-gold transition-colors">About</Link>
            <Link to="/contact" className="hover:text-brand-gold transition-colors">Support</Link>
          </div>
          
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="hover:text-brand-gold transition-colors p-2"
          >
            <Search size={20} strokeWidth={2} />
          </button>

          {currentUser ? (
             <Link to="/my-account" className="hidden md:flex items-center gap-2 hover:text-brand-gold transition-colors p-2" title="My Account">
               <User size={20} className="stroke-[2px]" />
             </Link>
          ) : (
            <button onClick={handleAuthClick} className="hidden md:flex items-center gap-2 hover:text-brand-gold transition-colors p-2" title="Sign In">
              <User size={20} className="stroke-[2px]" />
            </button>
          )}
          
          <Link to="/cart" className="relative group p-2">
            <ShoppingBag size={20} strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-brand-gold text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
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
              className="fixed inset-0 top-0 left-0 w-[80%] max-w-sm h-screen bg-black z-[60] shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-12">
                <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                  {logoUrl && (
                    <img src={logoUrl} alt="" className="h-7 w-auto object-contain shrink-0" referrerPolicy="no-referrer" />
                  )}
                  <span className="font-black text-xl italic tracking-tighter uppercase text-white leading-none">
                    Elegan BD
                  </span>
                </Link>
                <button onClick={() => setIsOpen(false)} className="text-white hover:text-brand-gold transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex flex-col space-y-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-white hover:text-brand-gold transition-colors text-lg uppercase tracking-widest font-serif border-b border-white/10 pb-2"
                  >
                    {link.name}
                  </Link>
                ))}
                
                {/* Mobile Auth Button */}
                <button
                  onClick={() => {
                    handleAuthClick();
                    setIsOpen(false);
                  }}
                  className="text-left text-white hover:text-brand-gold transition-colors text-lg uppercase tracking-widest font-serif border-b border-white/10 pb-2 flex items-center gap-2"
                >
                  {currentUser ? (
                    <><LogOut size={20} /> Sign Out</>
                  ) : (
                    <><User size={20} /> Sign In</>
                  )}
                </button>
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
            className="fixed inset-0 bg-black/40 z-50 md:hidden"
          />
        )}
      </nav>
      
    </>
  );
}
