/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';

export default function Footer() {
  const { logoUrl } = useBranding();
  return (
    <footer className="bg-black text-white pt-20 pb-10 px-6 md:px-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
        {/* Column 1: Brand & Contact */}
        <div className="space-y-6">
          <Link to="/" className="inline-block transform transition-transform hover:scale-105">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
            ) : (
              <span className="font-black text-2xl uppercase tracking-tighter text-white">
                Elegan <span className="text-brand-gold">BD</span>
              </span>
            )}
          </Link>
          <div className="space-y-4 text-xs uppercase tracking-widest text-gray-400 font-bold leading-loose">
            <p className="flex items-start gap-3">
              <span className="text-brand-gold">📍</span>
              Salim Uddin Market, Ahamed Nagar Paikpara, Mirpur 1, Dhaka-1216
            </p>
            <p className="flex items-center gap-3">
              <span className="text-brand-gold">📞</span>
              +880 1631 496122
            </p>
            <p className="flex items-center gap-3">
              <span className="text-brand-gold">✉️</span>
              eleganbdltd@gmail.com
            </p>
          </div>
          <div className="flex gap-4 pt-4 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all text-white">
            <Facebook size={20} className="cursor-pointer hover:text-brand-gold" />
            <Instagram size={20} className="cursor-pointer hover:text-brand-gold" />
            <Twitter size={20} className="cursor-pointer hover:text-brand-gold" />
          </div>
        </div>

        {/* Column 2: Essential Links */}
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-gold mb-8 italic">SHOPPING GUIDE</h4>
          <ul className="space-y-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <li><Link to="/track-order" className="hover:text-white transition-colors">Track Your Order</Link></li>
            <li><Link to="/category/new" className="hover:text-white transition-colors">New Arrivals</Link></li>
            <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping & Delivery</Link></li>
            <li><Link to="/size-guide" className="hover:text-white transition-colors">Size Guide</Link></li>
          </ul>
        </div>

        {/* Column 3: Company */}
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-gold mb-8 italic">CORPORATE</h4>
          <ul className="space-y-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <li><Link to="/about" className="hover:text-white transition-colors">About Elegan BD</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
            <li><Link to="/returns-exchange" className="hover:text-white transition-colors">Exchange & Returns</Link></li>
          </ul>
        </div>

        {/* Column 4: Newsletter */}
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-gold mb-8 italic">NEWSLETTER</h4>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 leading-loose">
            Be the first to know about new arrivals, sales & exclusive offers!
          </p>
          <div className="relative">
            <input 
              type="email" 
              placeholder="Your Email" 
              className="w-full bg-white/5 border border-white/10 py-3 px-4 text-xs text-white focus:ring-1 focus:ring-brand-gold outline-none transition-all placeholder:text-[9px] placeholder:uppercase placeholder:font-bold placeholder:text-gray-500"
            />
            <button className="absolute right-0 top-0 h-full px-4 bg-brand-gold text-white text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all">
              Join
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          © 2026 ELEGAN BD LIMITED. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
}
