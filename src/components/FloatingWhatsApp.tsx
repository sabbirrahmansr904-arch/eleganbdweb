/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export default function FloatingWhatsApp() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center">
      <motion.a
        href="https://m.me/eleganbdd"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-[#0084FF] via-[#0099FF] to-[#A820EA] hover:from-[#0073e6] hover:to-[#961ad6] text-white rounded-full shadow-[0_8px_25px_rgba(0,132,255,0.4)] border border-white/20 transition-all cursor-pointer"
        aria-label="Chat on Facebook Messenger"
      >
        {/* Pulsing online status indicator */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-ping" />
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
        
        {/* Messenger SVG Icon */}
        <svg className="w-7 h-7 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.909 1.458 5.503 3.738 7.185V22l3.414-1.874c.917.254 1.888.39 2.848.39 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.09 12.385l-2.585-2.763-5.045 2.763 5.548-5.892 2.646 2.763 4.984-2.763-5.548 5.892z" />
        </svg>
      </motion.a>
    </div>
  );
}
