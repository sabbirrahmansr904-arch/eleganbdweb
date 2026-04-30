import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Package, Truck, CheckCircle2 } from 'lucide-react';

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    // Simulation
    setTimeout(() => setIsSearching(false), 1500);
  };

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-brand-ink text-white p-8 md:p-16 rounded-[40px] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10 space-y-10 max-w-xl">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">
              Track Your <br /><span className="text-brand-gold">Order</span>
            </h1>
            <p className="text-white/60 text-sm max-w-sm">Enter your Order ID received in your email or SMS to see your package status.</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="ORDER ID (e.g., #ELE-1024)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white/20 transition-all"
                required
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-gold text-brand-ink p-3 rounded-xl hover:scale-105 transition-transform"
                disabled={isSearching}
              >
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-brand-ink/30 border-t-brand-ink rounded-full animate-spin" />
                ) : (
                  <Search size={20} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold ml-2">Secure encrypted tracking via Pathao/Steadfast Courier</p>
          </form>
        </div>
      </motion.div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 opacity-40 grayscale group hover:opacity-100 hover:grayscale-0 transition-all duration-700">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-brand-ink">
            <Package size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Order Processing</span>
        </div>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-brand-ink">
            <Truck size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">In Transit</span>
        </div>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-brand-ink">
            <CheckCircle2 size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Delivered</span>
        </div>
      </div>
    </div>
  );
}
