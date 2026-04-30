import React from 'react';
import { motion } from 'motion/react';
import { Shield, Eye, Lock, Globe } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="pt-32 pb-20 px-6 md:px-12 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-brand-ink">
            Privacy <span className="text-brand-gold">Policy</span>
          </h1>
          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold ring-offset-2">Committed to protecting your data</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-y border-gray-100">
           {[
             { icon: Shield, label: "Secure Data" },
             { icon: Eye, label: "No Tracking" },
             { icon: Lock, label: "Encrypted" },
             { icon: Globe, label: "GDPR Compliant" }
           ].map((item, i) => (
             <div key={i} className="flex flex-col items-center text-center gap-3">
               <item.icon size={20} className="text-brand-gold" />
               <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</span>
             </div>
           ))}
        </div>

        <div className="space-y-10 prose prose-slate prose-sm text-gray-600">
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">1. Information Collection</h2>
            <p>We collect information you provide directly to us when you create an account, make a purchase, or communicate with us. This may include your name, email address, phone number, shipping address, and payment information.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To process and fulfill your orders, including sending emails/SMS to confirm your order status.</li>
              <li>To provide customer support and respond to your requests.</li>
              <li>To communicate with you about products, services, offers, and promotions.</li>
              <li>To monitor and analyze trends, usage, and activities in connection with our services.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">3. Data Security</h2>
            <p>We implement a variety of security measures to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">4. Third-Party Sharing</h2>
            <p>We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties except to provide products or services you've requested (e.g., courier services like Pathao or Steadfast).</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-brand-ink">5. Contact Us</h2>
            <p>If there are any questions regarding this privacy policy, you may contact us using the information on our contact page.</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
