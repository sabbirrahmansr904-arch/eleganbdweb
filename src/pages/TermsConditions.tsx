import React from 'react';
import { motion } from 'motion/react';
import { FileText, Scale, Gavel, AlertCircle } from 'lucide-react';

export default function TermsConditions() {
  return (
    <div className="pt-32 pb-20 px-6 md:px-12 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-brand-ink">
            Terms & <span className="text-brand-gold">Conditions</span>
          </h1>
          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold ring-offset-2">Guidelines for your experience with Elegan BD</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-y border-gray-100">
           {[
             { icon: FileText, label: "Agreement" },
             { icon: Scale, label: "Fair Use" },
             { icon: Gavel, label: "Legal" },
             { icon: AlertCircle, label: "Notices" }
           ].map((item, i) => (
             <div key={i} className="flex flex-col items-center text-center gap-3">
               <item.icon size={20} className="text-brand-gold" />
               <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</span>
             </div>
           ))}
        </div>

        <div className="space-y-10 text-gray-600 text-sm leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">1. Acceptance of Terms</h2>
            <p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. Any participation in this service will constitute acceptance of this agreement.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">2. Product Accuracy</h2>
            <p>We attempt to be as accurate as possible with product descriptions and images. However, we do not warrant that product descriptions or other content of this site is accurate, complete, reliable, current, or error-free. Colors may vary slightly depending on your screen settings.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">3. Pricing and Availability</h2>
            <p>All prices are shown in BDT (Bangladeshi Taka). We reserve the right to change prices and availability at any time without notice. If an item is out of stock after an order is placed, we will notify you immediately.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">4. Intellectual Property</h2>
            <p>All content included on this site, such as text, graphics, logos, images, and software, is the property of Elegan BD and is protected by international copyright laws.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">5. Governing Law</h2>
            <p>These terms and conditions are governed by and construed in accordance with the laws of Bangladesh and you irrevocably submit to the exclusive jurisdiction of the courts in that location.</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
