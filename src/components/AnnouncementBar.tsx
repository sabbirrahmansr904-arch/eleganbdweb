/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export default function AnnouncementBar() {
  return (
    <div className="bg-[#EEF2FF] py-1.5 overflow-hidden border-b border-indigo-100/50">
      <div className="hidden lg:flex justify-center items-center px-4">
        <span className="text-[15px] font-bold text-indigo-900 uppercase tracking-wider text-center">
          আপনাকে স্বাগতম । বাংলাদেশের বিশ্বস্ত অনলাইন শপ । সারাদেশে ক্যাশ অন ডেলিভারি (২৪ থেকে ৭২ ঘণ্টার মধ্যে নিশ্চিত ডেলিভারি) হটলাইনঃ 01631496122
        </span>
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
            আপনাকে স্বাগতম । বাংলাদেশের বিশ্বস্ত অনলাইন শপ । সারাদেশে ক্যাশ অন ডেলিভারি (২৪ থেকে ৭২ ঘণ্টার মধ্যে নিশ্চিত ডেলিভারি) হটলাইনঃ 01631496122
          </span>
          <span className="mx-12 text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
            আপনাকে স্বাগতম । বাংলাদেশের বিশ্বস্ত অনলাইন শপ । সারাদেশে ক্যাশ অন ডেলিভারি (২৪ থেকে ৭২ ঘণ্টার মধ্যে নিশ্চিত ডেলিভারি) হটলাইনঃ 01631496122
          </span>
        </motion.div>
      </div>
    </div>
  );
}
