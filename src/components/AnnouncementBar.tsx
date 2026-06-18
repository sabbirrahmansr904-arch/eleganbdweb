/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';

export default function AnnouncementBar() {
  const announcements = [
    "🌟 SPECIAL LAUNCH OFFER: Enjoy flat 30% discount on all new arrivals! ✨",
    "🚚 FREE SHIPPING: Get free delivery on all orders above 1500 BDT nationwide! 🚛",
    "📞 HOTLINE: Call or WhatsApp us at 01631496122 for any support! 📱"
  ];

  return (
    <div className="bg-gradient-to-r from-brand-black to-gray-900 py-3 overflow-hidden border-b border-white/10 text-white">
      <div className="hidden lg:flex flex-col items-center gap-1">
        {announcements.map((text, idx) => (
            <span key={idx} className="text-[10px] font-black uppercase tracking-[0.2em]">
              {text}
            </span>
        ))}
      </div>
      <div className="lg:hidden whitespace-nowrap">
        <motion.div
          animate={{ x: [0, -1000] }}
          transition={{
            repeat: Infinity,
            duration: 30,
            ease: "linear",
          }}
          className="inline-block px-4"
        >
          {announcements.map((text, idx) => (
              <span key={idx} className="text-[10px] font-black uppercase tracking-wider mx-4">
                {text}
              </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
