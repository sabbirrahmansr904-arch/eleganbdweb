import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronRight, Zap, Star, ShieldCheck, ArrowRight, Truck, RotateCcw, Banknote, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useCategories } from '../contexts/CategoryContext';
import { useBanners } from '../contexts/BannerContext';
import { useBranding } from '../contexts/BrandingContext';
import ProductCard from '../components/ProductCard';
import { cn } from '../lib/utils';

const Home = () => {
  const { products, loading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { banners } = useBanners();
  const { heroBannerUrl, collectionsBannerUrl, featureBannerUrl, poloBannerUrl, showHeroBanner, showCountdownBanner } = useBranding();
  
  const activeHeroBanners = banners.filter(b => b.active && b.type === 'hero');
  const [currentBanner, setCurrentBanner] = React.useState(0);

  React.useEffect(() => {
    if (activeHeroBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % activeHeroBanners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [activeHeroBanners.length]);

  // Get products by category
  const formalPants = products.filter(p => {
    const cat = (p.category || '').toLowerCase().trim();
    return cat === 'formal pant' || cat === 'formal-pant';
  }).slice(0, 8);

  const formalShirts = products.filter(p => {
    const cat = (p.category || '').toLowerCase().trim();
    return cat === 'formal shirt' || cat === 'formal-shirt' || cat === 'premium formal shirt' || cat === 'premium-formal-shirt';
  }).slice(0, 8);

  const poloTshirts = products.filter(p => {
    const cat = (p.category || '').toLowerCase().trim();
    return cat === 'polo t-shirt' || cat === 'polo-t-shirt' || cat === 'polo t shirt';
  }).slice(0, 8);
  const allCollection = products.slice(0, 12);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Banner Carousel Section */}
      {showHeroBanner && activeHeroBanners.length > 0 && (
        <section className="relative h-[45vh] md:h-[75vh] bg-gray-900 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <img 
                src={activeHeroBanners[currentBanner].image} 
                alt={activeHeroBanners[currentBanner].title || "Hero Banner"} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-center p-6">
                <div className="max-w-2xl space-y-4">
                  {activeHeroBanners[currentBanner].title && (
                    <h1 className="text-3xl md:text-6xl font-black italic uppercase tracking-tighter text-white">
                      {activeHeroBanners[currentBanner].title}
                    </h1>
                  )}
                  {activeHeroBanners[currentBanner].link && (
                    <div className="pt-4">
                      <Link 
                        to={activeHeroBanners[currentBanner].link}
                        className="inline-block bg-white text-black px-6 md:px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] hover:bg-brand-gold hover:text-white transition-all shadow-lg"
                      >
                        Shop Collection
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Slider Indicators */}
          {activeHeroBanners.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
              {activeHeroBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentBanner(idx)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all cursor-pointer",
                    currentBanner === idx ? "bg-brand-gold w-6" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Countdown Timer Promo Banner */}
      {showCountdownBanner && (
        <section className="bg-black text-white py-8 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">Flash Deal of the Day</span>
              <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter mt-1">HURRY! LIMITED TIME OFFER</h2>
              <p className="text-xs text-gray-400 mt-2 uppercase tracking-wide">Premium minimal fashion on hot demand!</p>
            </div>
            
            <div className="flex gap-4 md:gap-6 text-center">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 min-w-[70px] backdrop-blur-xs">
                <span className="text-xl md:text-2xl font-black text-brand-gold">02</span>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Hours</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 min-w-[70px] backdrop-blur-xs">
                <span className="text-xl md:text-2xl font-black text-brand-gold">45</span>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Mins</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 min-w-[70px] backdrop-blur-xs">
                <span className="text-xl md:text-2xl font-black text-brand-gold">18</span>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Secs</p>
              </div>
            </div>
            
            <div>
              <Link
                to="/category/all"
                className="inline-block bg-brand-gold text-black px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all rounded-lg"
              >
                Order Now
              </Link>
            </div>
          </div>
        </section>
      )}
      
      {/* Category Sections */}
      <div className="space-y-4 pt-4">
        {/* Formal Pants */}
        {formalPants.length > 0 && (
          <section className="py-10 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="mb-6 text-center">
                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-black">Formal Pants</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {formalPants.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <Link to="/category/formal-pant" className="text-[10px] font-black uppercase tracking-[0.3em] text-black hover:text-brand-gold transition-colors flex items-center gap-2">
                  View All Formal Pants <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Polo T-shirts */}
        {poloTshirts.length > 0 && (
          <section className="py-10 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="mb-6 text-center">
                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-black">Polo T-shirts</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {poloTshirts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <Link to="/category/polo-t-shirt" className="text-[10px] font-black uppercase tracking-[0.3em] text-black hover:text-brand-gold transition-colors flex items-center gap-2">
                  View All Polo T-shirts <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Formal Shirts */}
        {formalShirts.length > 0 && (
          <section className="py-10 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="mb-6 text-center">
                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-black">Formal Shirts</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {formalShirts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <Link to="/category/formal-shirt" className="text-[10px] font-black uppercase tracking-[0.3em] text-black hover:text-brand-gold transition-colors flex items-center gap-2">
                  View All Formal Shirts <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Home;
