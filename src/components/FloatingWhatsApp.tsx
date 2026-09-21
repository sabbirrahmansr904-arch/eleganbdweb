/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles } from 'lucide-react';

interface FloatingWhatsAppProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

// 100% Authentic Official WhatsApp Vector
export const OfficialWhatsAppIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg 
    viewBox="0 0 32 32" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* WhatsApp Green Background & Bubble with tail */}
    <path 
      fill="#25D366" 
      d="M16 0C7.163 0 0 7.163 0 16c0 3.013.844 5.834 2.308 8.237L.812 30.655a.8.8 0 00.99.985l6.702-1.745A15.932 15.932 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0z"
    />
    {/* WhatsApp Official Handset Icon */}
    <path 
      fill="#FFFFFF" 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M23.957 20.088c-.347-.174-2.052-1.013-2.37-1.129-.319-.116-.55-.174-.783.174-.232.348-.898 1.129-1.101 1.361-.203.232-.406.261-.754.087-.348-.174-1.468-.541-2.796-1.725-1.033-.921-1.73-2.06-1.933-2.408-.203-.348-.022-.536.152-.709.157-.156.348-.406.522-.609.174-.203.232-.348.348-.58.116-.232.058-.435-.029-.609-.087-.174-.783-1.884-1.072-2.58-.282-.678-.569-.586-.783-.597l-.667-.012c-.232 0-.609.087-.928.435s-1.217 1.189-1.217 2.899 1.246 3.363 1.42 3.595c.174.232 2.451 3.743 5.937 5.25 2.195.95 3.053 1.05 4.14.887.66-.099 2.052-.841 2.342-1.653.29-.812.29-1.507.203-1.653-.087-.145-.319-.232-.667-.406z"
    />
  </svg>
);

export default function FloatingWhatsApp({
  phoneNumber = '8801619835133',
  defaultMessage = 'আসসালামু আলাইকুম, আমি Elegan BD থেকে পণ্য ও কেনাকাটা সম্পর্কে জানতে চাই।'
}: FloatingWhatsAppProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userMsg, setUserMsg] = useState('');

  // Clean phone number
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

  const handleSend = (customText?: string) => {
    const textToSend = customText || userMsg.trim() || defaultMessage;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setUserMsg('');
    setIsOpen(false);
  };

  const quickQuestions = [
    'অর্ডার কীভাবে করব?',
    'ডেলিভারি সময় ও চার্জ কত?',
    'পণ্য ও সাইজ সম্পর্কে জানতে চাই',
    'পাইকারি (Wholesale) অর্ডার'
  ];

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-end pointer-events-auto">
      {/* Interactive Chat Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mb-3 w-[320px] sm:w-[350px] bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-slate-100 overflow-hidden text-slate-800"
          >
            {/* Header */}
            <div className="bg-[#075E54] text-white p-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <OfficialWhatsAppIcon className="w-8 h-8" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#075E54]"></span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight leading-tight">Elegan BD Support</h3>
                    <p className="text-[11px] text-emerald-200 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Typically replies instantly
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  aria-label="Close chat"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Chat Content / Welcome Message */}
            <div className="p-4 bg-[#ECE5DD]/40 space-y-3 max-h-[280px] overflow-y-auto">
              <div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-xs border border-slate-100 max-w-[90%] text-xs leading-relaxed text-slate-800">
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500" />
                  স্বাগতম Elegan BD তে!
                </p>
                যেকোনো প্রশ্ন বা অর্ডারের সহায়তায় সরাসরি আমাদের WhatsApp এ মেসেজ দিন। আমরা সাথে সাথে উত্তর দেব।
                <div className="text-[10px] text-slate-400 text-right mt-1 font-mono">Online</div>
              </div>

              {/* Quick Prompt Chips */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  সচরাচর জিজ্ঞাসিত প্রশ্ন:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="text-[11px] bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 hover:border-emerald-300 px-2.5 py-1.5 rounded-xl font-semibold transition-all text-left shadow-2xs hover:scale-101"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input & Direct Launch */}
            <div className="p-3 bg-white border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="মেসেজ লিখুন..."
                  value={userMsg}
                  onChange={(e) => setUserMsg(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] text-slate-900 font-medium placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="bg-[#25D366] hover:bg-[#1ebc59] text-white p-2.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
                  title="WhatsApp এ পাঠান"
                >
                  <Send size={15} />
                </button>
              </form>
              <div className="mt-2 text-center">
                <button
                  onClick={() => handleSend(defaultMessage)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  সরাসরি WhatsApp অ্যাপে চ্যাট শুরু করুন →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Action Button */}
      <div className="flex items-center gap-2 group">
        {/* Tooltip badge */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:flex items-center gap-1.5 bg-white text-slate-800 px-3 py-1.5 rounded-full shadow-md border border-slate-100 text-[11px] font-bold cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
            <span>Live WhatsApp Chat</span>
          </motion.div>
        )}

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-transparent rounded-full shadow-[0_6px_20px_rgba(37,211,102,0.4)] transition-all cursor-pointer p-0"
          aria-label="WhatsApp Live Chat"
          title="WhatsApp এ সরাসরি চ্যাট করুন"
        >
          {/* Pulsing online status indicator */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-ping z-10" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-300 rounded-full border-2 border-white z-10" />

          {/* Official WhatsApp Logo Icon */}
          <OfficialWhatsAppIcon className="w-full h-full drop-shadow-sm" />
        </motion.button>
      </div>
    </div>
  );
}
