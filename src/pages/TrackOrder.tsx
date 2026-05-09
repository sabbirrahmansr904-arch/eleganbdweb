import React from 'react';
import { motion } from 'framer-motion';
import { Search, Package } from 'lucide-react';

const TrackOrder = () => {
  return (
    <div className="pt-32 pb-24 min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-black/5 text-center">
          <div className="w-20 h-20 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-gold">
            <Package size={40} />
          </div>
          <h1 className="text-3xl font-bold text-brand-black mb-4 uppercase italic">Track Your Order</h1>
          <p className="text-gray-500 mb-8">Enter your order ID or tracking number to see your parcel's progress.</p>
          
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Order ID (e.g. #ELG12345)" 
                className="w-full h-14 bg-gray-50 border border-gray-100 rounded-xl px-6 focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all outline-none"
              />
            </div>
            <button className="w-full h-14 bg-brand-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all">
              <Search size={20} />
              TRACK NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
