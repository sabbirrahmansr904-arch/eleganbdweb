import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronRight, Zap, Star, ShieldCheck, ArrowRight, Truck, RotateCcw, Banknote, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useCategories } from '../contexts/CategoryContext';
import { useBanners } from '../contexts/BannerContext';
import { useBranding } from '../contexts/BrandingContext';
import ProductCard from '../components/ProductCard';
import ReviewsCarousel from '../components/ReviewsCarousel';
import { cn } from '../lib/utils';

const Home = () => {
  const { products, loading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { banners } = useBanners();
  const { heroBannerUrl, subHeroBannerUrl, collectionsBannerUrl, featureBannerUrl, poloBannerUrl, showHeroBanner, showCountdownBanner, categoryImages } = useBranding();
  
  const activeHeroBannersFromDb = banners.filter(b => b.active && b.type === 'hero');
  const activeHeroBanners = activeHeroBannersFromDb.length > 0 ? activeHeroBannersFromDb.slice(0, 1) : [
    {
      id: 'default-hero-1',
      active: true,
      type: 'hero',
      image: heroBannerUrl || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000&auto=format',
      title: 'Premium Men\'s Fashion',
      link: '/category/all'
    }
  ];

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

  const womanBags = products.filter(p => {
    const cat = (p.category || '').toLowerCase().trim();
    return cat.includes('woman bag') || cat.includes('woman-bag') || cat.includes('women bag');
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
        <section className="relative w-full bg-gray-50 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full"
            >
              <img 
                src={activeHeroBanners[currentBanner].image} 
                alt={activeHeroBanners[currentBanner].title || "Hero Banner"} 
                className="w-full h-auto block select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </AnimatePresence>
          
          {/* Slider Indicators */}
          {activeHeroBanners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
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



      {/* Secondary Hero Banner */}
      {subHeroBannerUrl && (
        <section className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="relative w-full overflow-hidden rounded-2xl shadow-sm border border-gray-100">
            <img 
              src={subHeroBannerUrl} 
              alt="Secondary Promotion Banner" 
              className="w-full h-auto block select-none pointer-events-none"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>
      )}

      {/* Explore Our Top Collections Catalog */}
      <section className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">Discover Style</span>
          <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter mt-1 text-[#5551FF]">
            Explore Our Top Collections
          </h2>
          <div className="w-16 h-0.5 bg-black mx-auto mt-3 rounded-full" />
        </div>

        {/* Textual Navigation Underline Bar exactly like the user's second screenshot */}
        <div className="border-b border-gray-100 pb-4 flex flex-wrap justify-center gap-6 md:gap-12 text-xs font-black tracking-[0.2em] uppercase">
          {[
            { name: 'SHIRT', link: '/category/formal-shirt' },
            { name: 'PANT', link: '/category/formal-pant' },
            { name: 'CHECK SHIRT', link: '/category/premium-shirt' },
            { name: 'WOMAN BAG', link: '/category/woman-bag' },
            { name: 'ALL', link: '/category/all' }
          ].map((item) => (
            <Link 
              key={item.name}
              to={item.link}
              className="relative py-2 text-gray-500 hover:text-black transition-colors group"
            >
              <span>{item.name}</span>
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>
      </section>
      
      {/* Category Sections */}
      <div className="space-y-4 pt-4">
        {/* Formal Pants */}
        {formalPants.length > 0 && (
          <section className="py-10 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="mb-6 text-center">
                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-[#5551FF]">Formal Pants</h3>
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

        {/* Intermediate Promo Banner 2 - Feature Collection */}
        {featureBannerUrl && (
          <section className="max-w-7xl mx-auto px-4 py-4 md:py-6">
            <div className="relative w-full overflow-hidden rounded-2xl shadow-sm">
              <img 
                src={featureBannerUrl} 
                alt="Feature Collection" 
                className="w-full h-auto block select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>
        )}

        {/* Formal Shirts */}
        {formalShirts.length > 0 && (
          <section className="py-10 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="mb-6 text-center">
                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-[#5551FF]">Formal Shirts</h3>
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

        {/* Woman Bags */}
        {womanBags.length > 0 && (
          <section className="py-10 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="mb-6 text-center">
                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-black">Woman Bags</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {womanBags.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <Link to="/category/woman-bag" className="text-[10px] font-black uppercase tracking-[0.3em] text-black hover:text-brand-gold transition-colors flex items-center gap-2">
                  View All Woman Bags <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Customer Reviews & Testimonials section */}
        <ReviewsCarousel />
      </div>
    </div>
  );
};

export default Home;
