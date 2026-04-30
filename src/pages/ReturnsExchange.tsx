import React from 'react';
import { motion } from 'motion/react';
import { RefreshCcw, Package, Clock, CheckCircle2 } from 'lucide-react';

export default function ReturnsExchange() {
  return (
    <div className="pt-32 pb-20 px-6 md:px-12 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-brand-ink">
            Returns & <span className="text-brand-gold">Exchange</span>
          </h1>
          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold ring-offset-2">Our commitment to your satisfaction</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-y border-gray-100">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-brand-gold">
              <Clock size={24} />
            </div>
            <h3 className="font-bold text-brand-ink uppercase text-xs tracking-widest">7-Day Window</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Items can be returned or exchanged within 7 days of delivery.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-brand-gold">
              <Package size={24} />
            </div>
            <h3 className="font-bold text-brand-ink uppercase text-xs tracking-widest">Original Condition</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Products must be unworn, unwashed, with all original tags attached.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-brand-gold">
              <RefreshCcw size={24} />
            </div>
            <h3 className="font-bold text-brand-ink uppercase text-xs tracking-widest">Easy Exchange</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Free size exchanges for all eligible orders across Bangladesh.</p>
          </div>
        </div>

        <div className="space-y-8 text-gray-600 leading-relaxed text-sm">
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-brand-ink">How to Return</h2>
            <p>To initiate a return or exchange, please follow these steps:</p>
            <ul className="space-y-3 list-none pl-0">
              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>Contact our customer care team via WhatsApp at +8801631496122.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>Provide your Order ID and photos of the item(s) you wish to return.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>Once approved, our courier will pick up the item from your location.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-brand-ink">Exceptions</h2>
            <p>Please note that items purchased during Clearance Sales or specific campaign offers are not eligible for returns unless they are defective or the wrong item was sent.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-brand-ink">Refunds</h2>
            <p>After a successful quality check of the returned item, a refund will be processed to your original payment method (bKash/Nagad/Bank) within 3-5 business days.</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
