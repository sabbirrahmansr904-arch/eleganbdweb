import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBranding } from '../contexts/BrandingContext';

export default function ComboOfferBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { comboOfferBannerUrl } = useBranding();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
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
          className="relative bg-white rounded-3xl p-2 shadow-2xl max-w-sm w-full"
        >
          <button 
            onClick={() => setIsVisible(false)} 
            className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-white transition-colors text-brand-black"
          >
            <X size={20} />
          </button>
          <img 
            src={comboOfferBannerUrl} 
            alt="Combo Offer" 
            className="w-full h-auto rounded-2xl"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
