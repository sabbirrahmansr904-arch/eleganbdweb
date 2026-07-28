/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';

export default function Footer() {
  const { logoUrl, facebookUrl, instagramUrl, youtubeUrl, tiktokUrl } = useBranding();
  return (
    <footer className="bg-black text-white pt-12 pb-8 px-6 md:px-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Column 1: Brand & Contact */}
        <div className="space-y-4 flex flex-col items-center text-center">
          <Link to="/" className="inline-block transform transition-transform hover:scale-105">
            {logoUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
                <h3 className="text-lg md:text-xl font-black tracking-[0.25em] uppercase text-white mt-1">
                  ELEGAN BD
                </h3>
              </div>
            ) : (
              <span className="font-black text-2xl md:text-3xl uppercase tracking-wider text-white">
                ELEGAN BD
              </span>
            )}
          </Link>
          <div className="space-y-3 text-xs uppercase tracking-widest text-white font-bold leading-loose flex flex-col items-center">
            <p className="flex items-center justify-center gap-3">
              <span>📍</span>
              Dhaka Mirpur-6, 1216
            </p>
            <p className="flex items-center justify-center gap-3">
              <span>📞</span>
              +880 1631 496122
            </p>
            <p className="flex items-center justify-center gap-3">
              <span>✉️</span>
              eleganbdltd@gmail.com
            </p>
          </div>
          <div className="flex justify-center gap-4 pt-2 opacity-70 hover:opacity-100 transition-all text-white">
            {(facebookUrl || !instagramUrl && !youtubeUrl && !tiktokUrl) && (
              <a href={facebookUrl || "https://facebook.com"} target="_blank" rel="noopener noreferrer">
                <Facebook size={20} className="cursor-pointer hover:text-[#1877F2] transition-colors" />
              </a>
            )}
            {(instagramUrl || !facebookUrl && !youtubeUrl && !tiktokUrl) && (
              <a href={instagramUrl || "https://instagram.com"} target="_blank" rel="noopener noreferrer">
                <Instagram size={20} className="cursor-pointer hover:text-[#E4405F] transition-colors" />
              </a>
            )}
            {youtubeUrl && (
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                <Youtube size={20} className="cursor-pointer hover:text-[#FF0000] transition-colors" />
              </a>
            )}
            {tiktokUrl && (
              <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                <svg className="w-5 h-5 cursor-pointer fill-current hover:text-[#25F4EE] transition-colors" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.95 1.2 2.27 2 3.75 2.29V10.3c-1.35-.08-2.68-.54-3.82-1.34-.56-.4-.1.05-.6 1.05v6.52c.04 4.07-2.22 7.82-5.91 9.5-3.69 1.68-8.08.97-11.02-1.78C-2.48 21.5-2.53 16.4 1.34 13.56c2.81-2.06 6.78-2.12 9.66-.17v4.13c-1.57-.96-3.62-.9-5.11.16-1.5 1.05-2.06 2.96-1.4 4.63.66 1.67 2.42 2.64 4.2 2.37 1.78-.27 3.08-1.7 3.12-3.51.02-3.55.01-7.1 0-10.65v-10.7z"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Column 2: Essential Links */}
        <div className="flex flex-col items-center text-center">
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-4 italic">SHOPPING GUIDE</h4>
          <ul className="space-y-3 text-[10px] font-black uppercase tracking-widest text-white">
            <li><Link to="/track-order" className="hover:text-gray-300 transition-colors">Track Your Order</Link></li>
            <li><Link to="/category/new" className="hover:text-gray-300 transition-colors">New Arrivals</Link></li>
            <li><Link to="/shipping-policy" className="hover:text-gray-300 transition-colors">Shipping & Delivery</Link></li>
            <li><Link to="/size-guide" className="hover:text-gray-300 transition-colors">Size Guide</Link></li>
          </ul>
        </div>

        {/* Column 3: Company */}
        <div className="flex flex-col items-center text-center">
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-4 italic">CORPORATE</h4>
          <ul className="space-y-3 text-[10px] font-black uppercase tracking-widest text-white">
            <li><Link to="/about" className="hover:text-gray-300 transition-colors">About Elegan BD</Link></li>
            <li><Link to="/contact" className="hover:text-gray-300 transition-colors">Contact Us</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms-conditions" className="hover:text-gray-300 transition-colors">Terms & Conditions</Link></li>
            <li><Link to="/returns-exchange" className="hover:text-gray-300 transition-colors">Exchange & Returns</Link></li>
            <li><Link to="/admin/login" className="hover:text-gray-300 transition-colors opacity-80 hover:opacity-100">Admin Portal</Link></li>
          </ul>
        </div>

        {/* Column 4: Newsletter */}
        <div className="flex flex-col items-center text-center w-full max-w-sm mx-auto">
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-4 italic">NEWSLETTER</h4>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white mb-4 leading-loose">
            Be the first to know about new arrivals, sales & exclusive offers!
          </p>
          <div className="relative w-full">
            <input 
              type="email" 
              placeholder="Your Email" 
              className="w-full bg-white/5 border border-white/20 py-3 px-4 text-xs text-white focus:ring-1 focus:ring-white outline-none transition-all placeholder:text-[9px] placeholder:uppercase placeholder:font-bold placeholder:text-gray-400"
            />
            <button className="absolute right-0 top-0 h-full px-5 bg-[#1b49c4] text-white text-[9px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all">
              Join
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/5 text-center">
        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] text-white whitespace-nowrap">
          © 2026 ELEGAN BD LIMITED. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
}
