/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export default function FloatingWhatsApp() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show after a brief delay
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
        >
          {/* Tooltip */}
          <div className="bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest shadow-xl rounded border border-gray-100 hidden md:block">
            Need Help? Chat with us!
          </div>
          
          <a
            href="https://wa.me/8801631496122"
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-green-600 transition-colors shadow-green-500/30"
          >
            <MessageCircle size={28} />
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
