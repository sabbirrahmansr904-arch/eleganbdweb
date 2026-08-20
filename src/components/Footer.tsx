/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { Facebook, Instagram, Phone, Mail, MapPin } from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';

export default function Footer() {
  const { logoUrl, facebookUrl, instagramUrl } = useBranding();

  return (
    <footer className="bg-[#111215] text-white pt-10 pb-8 px-4 sm:px-6 md:px-8 border-t border-white/10">
      <div className="max-w-[1560px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Box 1: Brand & Tagline */}
        <div className="bg-[#18191e] border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-sm hover:border-white/20 transition-all">
          <div className="space-y-4">
            <Link to="/" className="inline-block transform transition-transform hover:scale-102">
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                  <span className="font-black text-lg uppercase tracking-widest text-white serif">
                    ELEGAN BD
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white text-black font-black flex items-center justify-center rounded-sm text-sm">
                    E
                  </div>
                  <span className="font-black text-xl uppercase tracking-widest text-white serif">
                    ELEGAN BD
                  </span>
                </div>
              )}
            </Link>
            
            <p className="text-xs text-gray-400 font-medium leading-relaxed">
              Premium formal wear for the modern gentleman. Crafted with precision, designed for elegance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <a 
              href={facebookUrl || "https://facebook.com"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/15 hover:border-white/30 transition-all cursor-pointer"
              aria-label="Facebook"
            >
              <Facebook size={18} />
            </a>
            <a 
              href={instagramUrl || "https://instagram.com"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/15 hover:border-white/30 transition-all cursor-pointer"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
            <a 
              href="tel:+8801327772213" 
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/15 hover:border-white/30 transition-all cursor-pointer"
              aria-label="Call Us"
            >
              <Phone size={18} />
            </a>
          </div>
        </div>

        {/* Box 2: Quick Links */}
        <div className="bg-[#18191e] border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm hover:border-white/20 transition-all">
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-300 mb-4">
              QUICK LINKS
            </h4>
            <ul className="space-y-3 text-xs font-semibold text-gray-400">
              <li>
                <Link to="/products" className="hover:text-white transition-colors block">
                  Shop All
                </Link>
              </li>
              <li>
                <Link to="/category/new" className="hover:text-white transition-colors block">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/returns-exchange" className="hover:text-white transition-colors block">
                  Returns & Exchange
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Box 3: Customer Care */}
        <div className="bg-[#18191e] border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm hover:border-white/20 transition-all">
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-300 mb-4">
              CUSTOMER CARE
            </h4>
            <ul className="space-y-3 text-xs font-semibold text-gray-400">
              <li>
                <Link to="/track-order" className="hover:text-white font-bold text-white transition-colors block">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors block">
                  About Elegan BD
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors block">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-conditions" className="hover:text-white transition-colors block">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Box 4: Contact Info */}
        <div className="bg-[#18191e] border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm hover:border-white/20 transition-all">
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-300 mb-4">
              CONTACT INFO
            </h4>
            
            <div className="space-y-4 text-xs font-medium">
              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">ADDRESS</p>
                  <p className="text-gray-200 font-semibold leading-snug">
                    Ma Villa, House #11, Road #3, Block F, Section #1, Mirpur, Dhaka-1216
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 shrink-0 mt-0.5">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">EMAIL US</p>
                  <a href="mailto:eleganbdltd@gmail.com" className="text-gray-200 hover:text-white font-bold transition-colors">
                    eleganbdltd@gmail.com
                  </a>
                </div>
              </div>

              {/* Call */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 shrink-0 mt-0.5">
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">CALL US</p>
                  <a href="tel:+8801327772213" className="text-gray-200 hover:text-white font-bold transition-colors block">
                    +8801327772213
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Copyright */}
      <div className="max-w-[1560px] mx-auto mt-8 pt-6 border-t border-white/10 text-center">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
          © 2026 ELEGAN BD LIMITED. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
}

