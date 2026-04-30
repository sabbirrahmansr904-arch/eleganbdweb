/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Mail, Phone, MapPin, Instagram, Facebook, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Contact() {
  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 md:px-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
        {/* Contact Info */}
        <div className="space-y-16">
          <header>
            <span className="text-xs uppercase tracking-[0.4em] text-brand-gold font-bold mb-6 block">Direct Connection</span>
            <h1 className="text-5xl md:text-7xl font-serif mb-8">Get in Touch</h1>
            <p className="text-lg font-serif italic text-brand-ink/60 max-w-md">
              Whether you have a question about sizing, styling, or just want to say hello, we are here to assist.
            </p>
          </header>

          <div className="space-y-10">
            <div className="flex items-start space-x-6 group">
              <div className="w-12 h-12 border border-brand-ink/10 flex items-center justify-center group-hover:bg-brand-gold group-hover:border-brand-gold group-hover:text-white transition-all duration-300">
                <Mail size={18} strokeWidth={1} />
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-brand-ink/40 font-bold mb-2">Email Us</h4>
                <p className="text-xl font-serif">concierge@eleganbd.com</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-6 group">
              <div className="w-12 h-12 border border-brand-ink/10 flex items-center justify-center group-hover:bg-brand-gold group-hover:border-brand-gold group-hover:text-white transition-all duration-300">
                <Phone size={18} strokeWidth={1} />
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-brand-ink/40 font-bold mb-2">Call Us</h4>
                <p className="text-xl font-serif">+880 1712-345678</p>
              </div>
            </div>

            <div className="flex items-start space-x-6 group">
              <div className="w-12 h-12 border border-brand-ink/10 flex items-center justify-center group-hover:bg-brand-gold group-hover:border-brand-gold group-hover:text-white transition-all duration-300">
                <MapPin size={18} strokeWidth={1} />
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-brand-ink/40 font-bold mb-2">Visit Our Atelier</h4>
                <p className="text-xl font-serif">Road 12, Banani, Dhaka, Bangladesh</p>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-brand-ink/10">
            <h4 className="text-[10px] uppercase tracking-widest text-brand-ink/40 font-bold mb-6">Connect on Social</h4>
            <div className="flex space-x-8">
              <a href="#" className="flex items-center space-x-2 text-xs uppercase tracking-widest hover:text-brand-gold transition-colors">
                <Instagram size={14} />
                <span>Instagram</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-xs uppercase tracking-widest hover:text-brand-gold transition-colors">
                <Facebook size={14} />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-brand-muted p-12 border border-brand-ink/5"
        >
          <h3 className="text-2xl font-serif mb-12">Send a Message</h3>
          <form className="space-y-12">
            <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Your Name</label>
               <input 
                type="text" 
                className="w-full bg-transparent border-b border-brand-ink/20 py-4 outline-none focus:border-brand-gold transition-colors font-serif text-xl"
                placeholder="Eleanor Shellstrop"
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Email Address</label>
               <input 
                type="email" 
                className="w-full bg-transparent border-b border-brand-ink/20 py-4 outline-none focus:border-brand-gold transition-colors font-serif text-xl"
                placeholder="eleanor@luxury.com"
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Message</label>
               <textarea 
                rows={4}
                className="w-full bg-transparent border-b border-brand-ink/20 py-4 outline-none focus:border-brand-gold transition-colors font-serif text-xl resize-none"
                placeholder="Tell us about your inquiry..."
               />
            </div>

            <button className="w-full bg-brand-ink text-white py-6 text-xs uppercase tracking-[0.3em] font-bold hover:bg-brand-gold transition-all duration-300 flex items-center justify-center space-x-4 group">
               <span>Submit Inquiry</span>
               <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
