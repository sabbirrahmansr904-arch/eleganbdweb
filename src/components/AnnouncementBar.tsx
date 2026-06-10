/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';

export default function AnnouncementBar() {
  return (
    <div className="bg-white py-1.5 overflow-hidden border-b border-indigo-100/50">
      <div className="hidden lg:flex justify-center items-center px-4">
          Special Launch Offer! Only for today. Hotline: 01631496122
      </div>
      <div className="lg:hidden whitespace-nowrap">
        <motion.div
          animate={{ x: [0, -1200] }}
          transition={{
            repeat: Infinity,
            duration: 25,
            ease: "linear",
          }}
          className="inline-block px-4"
        >
          <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
            Special Launch Offer! Only for today. Hotline: 01631496122
          </span>
          <span className="mx-12 text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
            Special Launch Offer! Only for today. Hotline: 01631496122
          </span>
        </motion.div>
      </div>
    </div>
  );
}
