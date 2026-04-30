/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

export default function About() {
  return (
    <div className="pt-32 pb-24">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="aspect-[4/5] overflow-hidden"
          >
            <img 
              src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1000&auto=format&fit=crop" 
              alt="About Brand"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <div className="space-y-8">
            <span className="text-xs uppercase tracking-[0.4em] text-brand-gold font-bold">Since 2024</span>
            <h1 className="text-5xl md:text-7xl font-serif leading-tight">Our Philosophy</h1>
            <p className="text-xl font-serif italic text-brand-ink/70 leading-relaxed">
              "Elegan BD is born from the belief that true beauty lies in the essential. We strip away the noise to find the soul of style."
            </p>
            <div className="space-y-6 text-brand-ink/70 leading-relaxed max-w-lg">
              <p>
                In a world of fast fashion and fleeting trends, we chose a different path. Founded in Dhaka with a vision to redefine luxury for the region, Elegan BD focuses on the harmony between craftsmanship and contemporary minimalism.
              </p>
              <p>
                Our collections are designed for those who appreciate the quiet confidence of a well-cut garment and the enduring quality of premium textiles.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-brand-ink/10">
               <div>
                  <h4 className="text-xs uppercase tracking-widest font-bold mb-2">Purity</h4>
                  <p className="text-[10px] uppercase tracking-widest text-brand-ink/50">Clean lines, neutral tones, timeless silhouettes.</p>
               </div>
               <div>
                  <h4 className="text-xs uppercase tracking-widest font-bold mb-2">Ethics</h4>
                  <p className="text-[10px] uppercase tracking-widest text-brand-ink/50">Responsibly sourced and consciously produced.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="bg-brand-bg border-y border-brand-ink/10 py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="space-y-6 text-center md:text-left text-brand-ink">
            <span className="text-3xl font-serif text-brand-gold italic">01.</span>
            <h3 className="text-2xl font-serif">Curated Materials</h3>
            <p className="text-sm text-brand-ink/50 leading-relaxed font-light uppercase tracking-wider">
              We travel the world to find the finest silks, organic cottons, and sustainable linens that feel as good as they look.
            </p>
          </div>
          <div className="space-y-6 text-center md:text-left text-brand-ink">
            <span className="text-3xl font-serif text-brand-gold italic">02.</span>
            <h3 className="text-2xl font-serif">Artisanal Craft</h3>
            <p className="text-sm text-brand-ink/50 leading-relaxed font-light uppercase tracking-wider">
              Each piece is touched by human hands, ensuring that every detail is perfect and every silhouette is architectural.
            </p>
          </div>
          <div className="space-y-6 text-center md:text-left text-brand-ink">
            <span className="text-3xl font-serif text-brand-gold italic">03.</span>
            <h3 className="text-2xl font-serif">Lasting Design</h3>
            <p className="text-sm text-brand-ink/50 leading-relaxed font-light uppercase tracking-wider">
              We don't design for seasons; we design for life. Our garments are meant to be cherished for a lifetime.
            </p>
          </div>
        </div>
      </section>

      {/* Founders Note */}
      <section className="max-w-4xl mx-auto py-24 px-6 text-center space-y-8">
        <span className="text-xs uppercase tracking-[0.5em] text-brand-gold">A message from us</span>
        <h2 className="text-4xl md:text-5xl font-serif leading-tight">
          "Welcome to a world where <br /> <span className="italic">style is silent</span> and <br /> <span className="italic">quality speaks</span> for itself."
        </h2>
        <div className="pt-8 flex flex-col items-center">
            <div className="w-24 h-[1px] bg-brand-ink/20 mb-4" />
            <p className="text-xs uppercase tracking-widest font-bold">The Elegan BD Team</p>
        </div>
      </section>
    </div>
  );
}
