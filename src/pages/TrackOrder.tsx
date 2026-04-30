import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Package, Truck, CheckCircle2, AlertCircle, Calendar, Hash, MapPin, CreditCard } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Order } from '../types';
import { formatPrice } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';

export default function TrackOrder() {
  const [orderQuery, setOrderQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { currency, rate } = useCurrency();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;

    setIsSearching(true);
    setOrder(null);
    setError(null);

    try {
      // Clean up order ID (remove # or extra spaces)
      const cleanId = orderQuery.trim().replace(/^#/, '');
      
      // Try searching by ID
      const ordersRef = collection(db, 'orders');
      
      // Query by ID (prefix check usually better but here we search exact)
      const q = query(ordersRef, where('id', '==', cleanId), limit(1));
      const qPhone = query(ordersRef, where('phone', '==', orderQuery.trim()), orderBy('createdAt', 'desc'), limit(1));
      
      const [idSnap, phoneSnap] = await Promise.all([
        getDocs(q),
        getDocs(qPhone)
      ]);

      let foundOrder: Order | null = null;

      if (!idSnap.empty) {
        foundOrder = { id: idSnap.docs[0].id, ...idSnap.docs[0].data() } as Order;
      } else if (!phoneSnap.empty) {
        foundOrder = { id: phoneSnap.docs[0].id, ...phoneSnap.docs[0].data() } as Order;
      }

      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        setError('No order found with this ID or Phone number.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while tracking. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIndex = (status: string) => {
    switch (status) {
      case 'Pending': return 0;
      case 'Processing': return 1;
      case 'Shipped': return 2;
      case 'Delivered': return 3;
      default: return 0;
    }
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
            <p className="text-white/60 text-sm max-w-sm">Enter your Order ID (e.g. ELE-1234) or Phone Number to see your package status.</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="ORDER ID OR PHONE NUMBER"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
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
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <AlertCircle size={14} /> {error}
                </motion.p>
              )}
            </AnimatePresence>
          </form>
        </div>
      </motion.div>

      <AnimatePresence>
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 space-y-8"
          >
            {/* Status Visual */}
            <div className="grid grid-cols-4 gap-2 relative">
               <div className="absolute top-8 left-0 right-0 h-0.5 bg-slate-100 -z-10" />
               <div 
                className="absolute top-8 left-0 h-0.5 bg-brand-gold -z-10 transition-all duration-1000" 
                style={{ width: `${(getStatusIndex(order.status) / 3) * 100}%` }}
               />
               
               {[
                 { label: 'Pending', icon: Package },
                 { label: 'Processing', icon: Calendar },
                 { label: 'Shipped', icon: Truck },
                 { label: 'Delivered', icon: CheckCircle2 }
               ].map((step, idx) => {
                 const isActive = getStatusIndex(order.status) >= idx;
                 const isCurrent = getStatusIndex(order.status) === idx;
                 return (
                   <div key={idx} className="flex flex-col items-center text-center space-y-4">
                     <div className={cn(
                       "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500",
                       isActive ? "bg-brand-gold text-brand-ink shadow-lg shadow-brand-gold/20" : "bg-slate-50 text-slate-300",
                       isCurrent && "ring-4 ring-brand-gold/20 scale-110"
                     )}>
                       <step.icon size={24} />
                     </div>
                     <span className={cn(
                       "text-[9px] md:text-[10px] font-black uppercase tracking-widest",
                       isActive ? "text-brand-ink" : "text-slate-300"
                     )}>
                       {step.label}
                     </span>
                   </div>
                 );
               })}
            </div>

            {/* Order Brief */}
            <div className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-12 shadow-xl shadow-slate-200/50 grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-brand-gold">
                       <Hash size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Order ID</p>
                       <p className="font-bold text-brand-ink">#{order.id}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-brand-gold">
                       <CreditCard size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Amount</p>
                       <p className="font-bold text-brand-ink">{formatPrice(order.total, currency, rate)}</p>
                    </div>
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-brand-gold">
                       <MapPin size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Shipping Address</p>
                       <p className="font-bold text-brand-ink text-sm leading-relaxed">{order.address}, {order.city}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-brand-gold">
                       <Calendar size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Placed On</p>
                       <p className="font-bold text-brand-ink">
                          {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                       </p>
                    </div>
                 </div>
               </div>
            </div>
            
            <div className="text-center pt-8">
               <p className="text-xs text-slate-400 italic">Need help with your order? <a href="/support" className="text-brand-gold underline font-bold">Contact Support</a></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!order && !isSearching && (
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
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
