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
    <footer className="bg-brand-ink text-white py-20 px-6 md:px-12">
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-16">
        {/* Brand Info */}
        <div className="flex flex-col items-center space-y-6">
          <Link to="/" className="group flex flex-col items-center gap-4">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-14 w-auto object-contain brightness-0 invert transition-transform duration-300 group-hover:scale-110" 
                referrerPolicy="no-referrer"
              />
            )}
            <span className="font-black text-3xl md:text-4xl italic tracking-tighter uppercase text-white group-hover:text-brand-gold transition-colors leading-none">
              Elegan BD
            </span>
          </Link>
          <p className="text-white/80 text-sm leading-relaxed max-w-md">
            Defining modern elegance through minimalist design and premium craftsmanship. Join us in our journey of timeless style.
          </p>
          <div className="flex space-x-6 invisible">
            <a href="#" className="hover:text-brand-gold transition-colors"><Facebook size={22} /></a>
            <a href="#" className="hover:text-brand-gold transition-colors"><Instagram size={22} /></a>
            <a href="#" className="hover:text-brand-gold transition-colors"><Twitter size={22} /></a>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full text-center">
          {/* Quick Links */}
          <div className="flex flex-col items-center">
            <h4 className="text-xs uppercase tracking-widest mb-6 text-brand-gold font-bold">Quick Links</h4>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm text-white/80 max-w-lg mx-auto">
              <Link to="/?filter=new" className="hover:text-white transition-colors">New Arrivals</Link>
              <Link to="/returns-exchange" className="hover:text-white transition-colors">Returns & Exchange</Link>
              <Link to="/customer-care" className="hover:text-white transition-colors">Customer Care</Link>
              <Link to="/track-order" className="hover:text-white transition-colors">Track Your Order</Link>
              <Link to="/about" className="hover:text-white transition-colors">About Elegan BD</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link>
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col items-center">
            <h4 className="text-xs uppercase tracking-widest mb-6 text-brand-gold font-bold">Get In Touch</h4>
            <ul className="space-y-6 text-sm text-white/80">
              <li className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Email Us</span>
                <a href="mailto:eleganbdltd@gmail.com" className="hover:text-brand-gold transition-colors block font-medium">
                  eleganbdltd@gmail.com
                </a>
              </li>
              <li className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Call Us</span>
                <a href="tel:+8801631496122" className="hover:text-brand-gold transition-colors block font-medium">
                  +8801631496122
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-24 pt-10 border-t border-white/5 flex flex-col items-center space-y-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 opacity-30 grayscale brightness-0">
           <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-6" alt="Paypal" />
           <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-6" alt="Visa" />
           <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6" alt="Mastercard" />
           <img src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Bkash_logo.png" className="h-6" alt="bKash" />
        </div>

        <div className="flex flex-row justify-center text-[10px] uppercase tracking-[0.3em] text-white/40 mt-4 whitespace-nowrap">
          <span>2026 ELEGAN BD. All Rights Reserved</span>
        </div>
      </div>
    </footer>
  );
}
