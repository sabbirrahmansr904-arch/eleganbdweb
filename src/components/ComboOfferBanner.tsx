import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useBranding } from '../contexts/BrandingContext';

export default function ComboOfferBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { comboOfferBannerUrl } = useBranding();

  useEffect(() => {
    const hasBeenShown = localStorage.getItem('comboOfferShown');
    if (hasBeenShown) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      localStorage.setItem('comboOfferShown', 'true');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible || !comboOfferBannerUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white rounded-3xl p-2 shadow-2xl max-w-sm w-full overflow-hidden"
        >
          <button 
            onClick={() => setIsVisible(false)} 
            className="absolute top-4 right-4 z-10 p-2 bg-white/85 rounded-full hover:bg-white transition-colors text-brand-black shadow-md border border-gray-100"
          >
            <X size={20} />
          </button>
          
          <div className="relative">
            <img 
              src={comboOfferBannerUrl} 
              alt="Combo Offer" 
              className="w-full h-auto rounded-2xl block"
            />
            {/* Order Now Button in the marked bottom right area */}
            <div className="absolute bottom-6 right-6 z-10">
              <Link 
                to="/category/formal-shirt"
                onClick={() => setIsVisible(false)}
                className="bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-black tracking-widest uppercase px-6 py-3 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center gap-2 border border-blue-400 cursor-pointer animate-pulse"
              >
                Order Now
                <ArrowRight size={14} className="stroke-[3]" />
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
