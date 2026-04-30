/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Headset, Zap } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useBranding } from '../contexts/BrandingContext';
import { useBanners } from '../contexts/BannerContext';
import { useProducts } from '../contexts/ProductContext';
import { AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface HomeProps {
  onAddToCart: (productId: string, size: string, quantity: number) => void;
}

export default function Home({ onAddToCart }: HomeProps): React.JSX.Element {
  const { products } = useProducts();
  const { logoUrl, categoryImages, collectionsBannerUrl, heroBannerUrl, featureBannerUrl, showShowcase } = useBranding();
  const { banners } = useBanners();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentBanner, setCurrentBanner] = React.useState(0);
  
  const categoryFromUrl = searchParams.get('category') || 'All Products';
  const filterFromUrl = searchParams.get('filter');
  const [activeCategory, setActiveCategory] = React.useState<string>(categoryFromUrl);

  const filteredCategoryProducts = React.useMemo(() => {
    let result = products;
    
    if (filterFromUrl === 'new') {
      // Sort by creation or ID to show newest first
      result = [...products].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 12);
      return result;
    }

    if (activeCategory !== 'All Products') {
      result = result.filter(p => p.category === activeCategory);
    }
    return result;
  }, [products, activeCategory, filterFromUrl]);

  // Sync state if URL changes
  React.useEffect(() => {
    if (filterFromUrl === 'new') {
      setActiveCategory('New Arrivals');
    } else {
      setActiveCategory(categoryFromUrl);
    }
  }, [categoryFromUrl, filterFromUrl]);

  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    return ['All Products', ...cats];
  }, [products]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All Products') {
      setSearchParams({});
    } else {
      setSearchParams({ category: cat });
    }
  };

  const activeBanners = banners.filter(b => b.active);

  React.useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const featuredProducts = products.filter(p => p.featured).slice(0, 3);
  
  const topRatedProducts = React.useMemo(() => {
    const explicitlyTopRated = products.filter(p => p.isTopRated);
    if (explicitlyTopRated.length > 0) {
      return explicitlyTopRated.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return products
      .filter(p => (p.rating || 0) >= 4)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
  }, [products]);

  const [topRatedIndex, setTopRatedIndex] = React.useState(0);

  React.useEffect(() => {
    if (topRatedProducts.length <= 1) return;
    const interval = setInterval(() => {
      setTopRatedIndex((prev) => (prev + 1) % topRatedProducts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [topRatedProducts.length]);

  return (
    <div className="pb-24">
      {/* Static Hero Section */}
      <section className="relative w-full bg-[#f4f4f4] overflow-hidden">
        <div className="mx-auto w-full max-w-[1920px]">
          <div className="relative w-full bg-slate-900 min-h-[200px]">
            {heroBannerUrl && (
              <img
                src={heroBannerUrl}
                alt="Elegan BD Banner"
                className="w-full h-auto block transition-opacity duration-500"
                referrerPolicy="no-referrer"
                loading="eager"
                fetchPriority="high"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                onError={(e) => {
                  e.currentTarget.classList.add('hidden');
                  const fallback = e.currentTarget.parentElement?.querySelector('.hero-fallback') as HTMLElement;
                  if (fallback) {
                    fallback.classList.remove('hidden');
                    fallback.style.display = 'flex';
                  }
                }}
                style={{ opacity: 0 }}
              />
            )}
            {/* Overlay if image fails or is loading */}
            <div 
              className={cn(
                "hero-fallback absolute inset-0 flex items-center justify-center bg-gradient-to-r from-slate-900 to-slate-800",
                heroBannerUrl ? "hidden" : "flex"
              )}
            >
              <div className="text-center p-6">
                 <h1 className="text-3xl md:text-6xl font-black text-white mb-2 italic tracking-tighter uppercase">Elegan BD</h1>
                <p className="text-brand-gold font-bold tracking-[0.3em] uppercase text-[10px] md:text-xs">Minimalist Elegance • Premium Quality</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Special Offer Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <h2 className="text-4xl md:text-6xl font-black text-brand-ink tracking-tight">স্পেশাল অফার</h2>
            <p className="text-slate-500 text-sm md:text-2xl font-medium">আমাদের এক্সক্লুসিভ কালেকশন থেকে বেছে নিন আপনার পছন্দের পোশাক</p>
          </motion.div>
        </div>
      </section>

      {/* Collections Banner Showcase */}
      {collectionsBannerUrl && (
        <section className="w-full bg-gray-100 overflow-hidden group">
          <div className="relative w-full bg-slate-100">
            {collectionsBannerUrl && (
              <img 
                src={collectionsBannerUrl} 
                alt="Discover Our Collections" 
                className="w-full h-auto block transition-transform duration-[2s] group-hover:scale-105 opacity-0" 
                referrerPolicy="no-referrer"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                onError={(e) => {
                  e.currentTarget.classList.add('hidden');
                  const fallback = e.currentTarget.parentElement?.querySelector('.collections-fallback') as HTMLElement;
                  if (fallback) {
                    fallback.classList.remove('hidden');
                    fallback.style.display = 'flex';
                  }
                }}
              />
            )}
            <div 
              className={cn(
                "collections-fallback absolute inset-0 items-center justify-center bg-brand-ink text-white",
                collectionsBannerUrl ? "hidden" : "flex"
              )}
              style={{ minHeight: '250px' }}
            >
              <div className="text-center px-4">
                <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-4 leading-none">The New Collection</h2>
                <div className="flex items-center justify-center gap-3">
                  <span className="h-[1px] bg-brand-gold w-8" />
                  <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-brand-gold font-bold">Limited Anniversary Edition</p>
                  <span className="h-[1px] bg-brand-gold w-8" />
                </div>
              </div>
            </div>
            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-700 pointer-events-none" />
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-4">
              <div className="h-[2px] bg-black w-8 md:w-12" />
              <h2 className="text-2xl md:text-3xl font-black text-brand-ink uppercase tracking-tighter italic whitespace-nowrap">Featured Collection</h2>
              <div className="h-[2px] bg-black w-8 md:w-12" />
            </div>
            <p className="text-gray-400 text-xs uppercase tracking-[0.4em] font-bold">Category wise shopping</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-5 max-w-4xl mx-auto">
            {categories.map((catName, idx) => (
              <button 
                key={idx} 
                onClick={() => handleCategoryChange(catName)}
                className={cn(
                  "px-8 py-4 md:px-10 md:py-5 rounded-[2.5rem] font-bold uppercase tracking-widest text-xs md:text-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 flex items-center justify-center whitespace-nowrap outline-none",
                  activeCategory === catName 
                    ? "bg-[#0f172a] text-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]" 
                    : "bg-white text-slate-700 hover:bg-[#0f172a] hover:text-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
                )}
              >
                {catName}
              </button>
            ))}
          </div>

          <div className="mt-12 max-w-4xl mx-auto border-t border-gray-200" />
            
          <div className="mt-12">
            {filteredCategoryProducts.length > 0 ? (
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
                 {filteredCategoryProducts.map(product => (
                    <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
                 ))}
               </div>
            ) : (
               <div className="text-center py-24 px-4 bg-white">
                 <h3 className="text-3xl md:text-4xl font-black text-slate-400/80 uppercase tracking-widest mb-4">No Products Found</h3>
                 <p className="text-slate-500 italic font-medium">Try adjusting your filters or check back later.</p>
               </div>
            )}
          </div>

          {/* Features Section */}
          <div className="mt-8 md:mt-20 max-w-[1000px] mx-auto mb-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {/* Box 1 */}
              <Link to="/shipping-policy" className="flex flex-col items-center justify-center text-center p-6 md:p-8 bg-white rounded-3xl md:rounded-[2.5rem] shadow-[0_4px_24px_rgb(0,0,0,0.04)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-5">
                  <Truck size={32} strokeWidth={2} />
                </div>
                <h4 className="text-[13px] md:text-[15px] font-black uppercase tracking-[0.05em] text-slate-900 mb-1.5 md:mb-2 whitespace-nowrap">Free Shipping</h4>
                <p className="text-[10px] md:text-[11px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Over ৳5000</p>
              </Link>
              
              {/* Box 2 */}
              <Link to="/secure-payment" className="flex flex-col items-center justify-center text-center p-6 md:p-8 bg-white rounded-3xl md:rounded-[2.5rem] shadow-[0_4px_24px_rgb(0,0,0,0.04)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-5">
                  <ShieldCheck size={32} strokeWidth={2} />
                </div>
                <h4 className="text-[13px] md:text-[15px] font-black uppercase tracking-[0.05em] text-slate-900 mb-1.5 md:mb-2 whitespace-nowrap">100% Secure</h4>
                <p className="text-[10px] md:text-[11px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Trusted Payments</p>
              </Link>

              {/* Box 3 */}
              <Link to="/fast-delivery" className="flex flex-col items-center justify-center text-center p-6 md:p-8 bg-white rounded-3xl md:rounded-[2.5rem] shadow-[0_4px_24px_rgb(0,0,0,0.04)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mb-5">
                  <Zap size={32} strokeWidth={2} />
                </div>
                <h4 className="text-[13px] md:text-[15px] font-black uppercase tracking-[0.05em] text-slate-900 mb-1.5 md:mb-2 whitespace-nowrap">Fast Delivery</h4>
                <p className="text-[10px] md:text-[11px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Within 48 Hours</p>
              </Link>

              {/* Box 4 */}
              <Link to="/support" className="flex flex-col items-center justify-center text-center p-6 md:p-8 bg-white rounded-3xl md:rounded-[2.5rem] shadow-[0_4px_24px_rgb(0,0,0,0.04)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-fuchsia-50 text-fuchsia-500 rounded-3xl flex items-center justify-center mb-5">
                  <Headset size={32} strokeWidth={2} />
                </div>
                <h4 className="text-[13px] md:text-[15px] font-black uppercase tracking-[0.05em] text-slate-900 mb-1.5 md:mb-2 whitespace-nowrap">24/7 Support</h4>
                <p className="text-[10px] md:text-[11px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Dedicated Help</p>
              </Link>
            </div>

            {/* Feature Banner */}
            {featureBannerUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="mt-12 md:mt-16 w-full rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200/50"
              >
                <img 
                  src={featureBannerUrl} 
                  alt="Special Offer" 
                  className="w-full h-auto block"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Complete Collection Showcase */}
      {showShowcase && (
        <section className="py-24 bg-[#fafafa] border-t border-slate-100 overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <div className="flex flex-col items-center gap-10 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 text-center">
              <div className="space-y-5">
                <h2 className="text-4xl sm:text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-brand-ink leading-none">
                  Complete <span className="text-transparent" style={{ WebkitTextStroke: '1.5px #000000' }}>Archive</span>
                </h2>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white px-8 py-3.5 rounded-full border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="text-brand-ink relative z-10">{products.length} Designs Available</span>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)] relative z-10" />
                </div>
                <p className="text-[10px] uppercase tracking-widest text-slate-300 font-black italic">Handpicked premium selection for you</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-10 md:gap-y-20">
              {products.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                >
                  <ProductCard product={product} onAddToCart={onAddToCart} />
                </motion.div>
              ))}
            </div>

            {products.length === 0 && (
              <div className="py-40 text-center">
                <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-300 italic">
                  Our archive is currently being updated...
                </p>
              </div>
            )}

            <div className="mt-24 text-center">
              <div className="inline-flex flex-col items-center gap-4 group cursor-default">
                <div className="h-[1px] w-20 bg-slate-200 transition-all duration-500 group-hover:w-40" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 italic">End of Collection</p>
                <div className="h-[1px] w-20 bg-slate-200 transition-all duration-500 group-hover:w-40" />
              </div>
            </div>

            {/* Top Rated Products Section */}
            {topRatedProducts.length > 0 && (
              <section className="mt-32 pb-12">
                <div className="text-center mb-16 px-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="space-y-4"
                  >
                    <h2 className="text-3xl md:text-6xl font-black text-brand-ink tracking-tight uppercase italic whitespace-nowrap">Top Rated Products</h2>
                    <p className="text-slate-500 text-sm md:text-xl font-medium max-w-2xl mx-auto">
                      আমাদের গ্রাহকদের সবচেয়ে পছন্দের এবং সর্বোচ্চ রেটিং প্রাপ্ত প্রোডাক্টগুলো দেখে নিন।
                    </p>
                  </motion.div>
                </div>

                <div className="relative max-w-lg mx-auto px-4">
                  <div className="overflow-hidden">
                    <motion.div 
                      className="flex gap-0"
                      animate={{ x: `-${topRatedIndex * 100}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      {topRatedProducts.map((product) => (
                        <div key={product.id} className="min-w-full px-4">
                          <ProductCard product={product} onAddToCart={onAddToCart} />
                        </div>
                      ))}
                    </motion.div>
                  </div>
                  
                  {/* Indicators */}
                  <div className="flex justify-center gap-2 mt-8">
                    {topRatedProducts.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setTopRatedIndex(idx)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          topRatedIndex === idx ? "w-8 bg-brand-gold" : "bg-slate-200"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </section>
      )}

      {/* Recommended Section is already above */}
    </div>
  );
}
