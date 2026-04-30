import React from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MessageSquare, Clock, ShieldCheck } from 'lucide-react';

export default function CustomerCare() {
  const contactMethods = [
    {
      icon: Phone,
      title: "Call Us",
      value: "+8801631496122",
      href: "tel:+8801631496122",
      desc: "Available daily 11:00 AM - 9:00 PM"
    },
    {
      icon: MessageSquare,
      title: "WhatsApp",
      value: "+8801631496122",
      href: "https://wa.me/8801631496122",
      desc: "Fastest support for order queries"
    },
    {
      icon: Mail,
      title: "Email Us",
      value: "eleganbdltd@gmail.com",
      href: "mailto:eleganbdltd@gmail.com",
      desc: "General inquiries and feedback"
    }
  ];

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-16"
      >
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter uppercase text-brand-ink">
            Customer <span className="text-brand-gold">Care</span>
          </h1>
          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold ring-offset-2 max-w-lg mx-auto">We're here to assist you with any questions or concerns</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {contactMethods.map((method, idx) => (
            <div key={idx} className="p-8 border border-gray-100 rounded-2xl flex flex-col items-center text-center space-y-4 hover:border-brand-gold/30 transition-all group">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-brand-ink group-hover:scale-110 transition-transform">
                <method.icon size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="font-black uppercase text-[10px] tracking-widest text-gray-400">{method.title}</h3>
                <a href={method.href} target="_blank" rel="noopener noreferrer" className="block text-lg font-bold text-brand-ink hover:text-brand-gold transition-colors">
                  {method.value}
                </a>
                <p className="text-xs text-gray-400">{method.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-slate-50 p-8 md:p-16 rounded-[40px]">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-brand-gold" size={24} />
              <h2 className="text-2xl font-black uppercase tracking-tight italic text-brand-ink">Shopping Assurance</h2>
            </div>
            <div className="space-y-4 text-gray-500 text-sm leading-relaxed">
              <p>At Elegan BD, your satisfaction is our top priority. We guarantee the authenticity of every product and the security of every transaction.</p>
              <p>Our dedicated support team is trained to handle size recommendations, fabric details, and delivery logistics to ensure your experience is seamless.</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Clock className="text-brand-gold" size={24} />
              <h2 className="text-2xl font-black uppercase tracking-tight italic text-brand-ink">Operating Hours</h2>
            </div>
            <div className="space-y-2 text-gray-500 text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Saturday - Thursday</span>
                <span className="font-bold text-brand-ink">11:00 AM - 9:00 PM</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Friday</span>
                <span className="font-bold text-brand-ink">3:00 PM - 9:00 PM</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span>Online Orders</span>
                <span className="text-[10px] font-black uppercase bg-green-100 text-green-700 px-3 py-1 rounded-full">24/7 Open</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
