import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Truck, Award, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useBanners } from '../contexts/BannerContext';
import { useBranding } from '../contexts/BrandingContext';
import ProductCard from '../components/ProductCard';
import ReviewsCarousel from '../components/ReviewsCarousel';
import { cn } from '../lib/utils';

const Home = () => {
  const { products, loading: productsLoading } = useProducts();
  const { banners } = useBanners();
  const { 
    heroBannerUrl, 
    showHeroBanner,
    shirtBannerUrl,
    pantBannerUrl
  } = useBranding();
  
  const activeHeroBannersFromDb = banners.filter(b => b.active && b.type === 'hero' && b.image && !b.image.includes('unsplash.com'));
  
  let activeHeroBanners: Array<{ id: string; active?: boolean; type?: string; image: string; title?: string; link?: string }> = [];

  if (activeHeroBannersFromDb.length > 0) {
    activeHeroBanners = activeHeroBannersFromDb;
  } else if (heroBannerUrl && !heroBannerUrl.includes('unsplash.com')) {
    activeHeroBanners = [
      {
        id: 'uploaded-hero-1',
        active: true,
        type: 'hero',
        image: heroBannerUrl,
        title: '',
        link: '/category/all'
      }
    ];
  }

  const [currentBanner, setCurrentBanner] = React.useState(0);

  React.useEffect(() => {
    if (activeHeroBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % activeHeroBanners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [activeHeroBanners.length]);

  // Sort products: Formal Pants FIRST, then Formal Shirts SECOND, then others
  const sortedProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    
    const isPant = (p: typeof products[0]) => {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return cat.includes('pant') || cat.includes('trouser') || name.includes('pant') || name.includes('trouser');
    };

    const isShirt = (p: typeof products[0]) => {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return cat.includes('shirt') || name.includes('shirt') || cat.includes('polo') || name.includes('polo');
    };

    const pants = products.filter(p => isPant(p));
    const shirts = products.filter(p => isShirt(p) && !isPant(p));
    const others = products.filter(p => !isPant(p) && !isShirt(p));

    return [...pants, ...shirts, ...others];
  }, [products]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      
      {/* TOP SECTION: HERO BANNER (SLIGHTLY NARROWER & MOBILE-OPTIMIZED) */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
        <div className="bg-[#EAEAEA] rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 relative overflow-hidden flex flex-col justify-between min-h-[220px] sm:min-h-[320px] md:min-h-[380px] shadow-xs">
          {activeHeroBanners.length > 0 && showHeroBanner ? (
            <div className="absolute inset-0 z-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentBanner}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="w-full h-full"
                >
                  <img 
                    src={activeHeroBanners[currentBanner].image} 
                    alt="Hero Banner" 
                    className="w-full h-full object-cover object-center"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <>
              {/* Fallback Hero Banner matching exact image template */}
              <div className="relative z-10 max-w-xs sm:max-w-sm md:max-w-md my-auto">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#B8860B] mb-1 sm:mb-2 block">
                  NEW COLLECTION 2024
                </span>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-950 tracking-tight leading-[1.15] mb-2 sm:mb-4">
                  Elevate Your Formal Style
                </h1>
                <p className="text-[11px] sm:text-xs md:text-sm text-gray-600 font-medium mb-5 sm:mb-8 leading-relaxed max-w-xs">
                  Premium Quality, Perfect Fit For Every Occasion.
                </p>
                <Link 
                  to="/category/all" 
                  className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-md transition-all shadow-md active:scale-95"
                >
                  <span>SHOP NOW</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Hero Model Image on right */}
              <div className="absolute right-0 bottom-0 top-0 w-1/2 hidden md:block z-0 pointer-events-none">
                <img 
                  src="https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&q=80" 
                  alt="Formal Fashion Model" 
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>
            </>
          )}

          {/* Slider Dots if multiple hero banners */}
          {activeHeroBanners.length > 1 && (
            <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-8 z-20 flex gap-2">
              {activeHeroBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentBanner(idx)}
                  className={cn(
                    "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all cursor-pointer",
                    currentBanner === idx ? "bg-black w-5 sm:w-6" : "bg-black/30"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MIDDLE SECTION: CATEGORY BANNERS (SHIRTS & PANTS) - ONLY RENDERED WHEN UPLOADED IN ADMIN */}
      {(shirtBannerUrl || pantBannerUrl) && (
        <section className="max-w-7xl mx-auto w-full px-4 pb-10">
          <div className={cn(
            "grid gap-6",
            shirtBannerUrl && pantBannerUrl ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          )}>
            
            {/* CATEGORY 1: SHIRTS BANNER */}
            {shirtBannerUrl && (
              <Link 
                to="/category/formal-shirt"
                className="group block relative rounded-3xl overflow-hidden min-h-[200px] md:min-h-[260px] bg-gray-100 shadow-sm border border-gray-100/80 transition-all hover:shadow-md"
              >
                <img 
                  src={shirtBannerUrl} 
                  alt="Shirts Category Banner" 
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </Link>
            )}

            {/* CATEGORY 2: PANTS BANNER */}
            {pantBannerUrl && (
              <Link 
                to="/category/formal-pant"
                className="group block relative rounded-3xl overflow-hidden min-h-[200px] md:min-h-[260px] bg-gray-100 shadow-sm border border-gray-100/80 transition-all hover:shadow-md"
              >
                <img 
                  src={pantBannerUrl} 
                  alt="Pants Category Banner" 
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </Link>
            )}

          </div>
        </section>
      )}

      {/* ALL COLLECTIONS - MAIN PRODUCT SECTION SHOWING FORMAL PANTS FIRST, THEN FORMAL SHIRTS */}
      <section className="max-w-7xl mx-auto w-full px-4 pb-16">
        {/* Section Header: ALL COLLECTIONS ____ VIEW ALL -> */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-black uppercase text-gray-950 tracking-tight">
              ALL COLLECTIONS
            </h2>
            <div className="w-10 h-0.5 bg-gray-300 rounded-full hidden sm:block" />
          </div>
          <Link 
            to="/category/all" 
            className="flex items-center gap-1 text-xs font-black uppercase text-gray-900 hover:text-blue-600 transition-colors tracking-wider"
          >
            <span>VIEW ALL</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Product Grid displaying sorted products (Pants first, then Shirts) */}
        {productsLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <p className="text-xs font-bold text-gray-400 mt-3 uppercase tracking-wider">Loading collections...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-16 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-sm font-bold text-gray-500">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* BRAND VALUE PROPOSITIONS - SEPARATE BLUE BOXES IN 1 LINE ABOVE FOOTER */}
      <section className="max-w-7xl mx-auto w-full px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Box 1 */}
          <div className="bg-blue-600 hover:bg-blue-700 rounded-2xl p-6 text-white flex items-center gap-4 shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">PREMIUM QUALITY</h4>
              <p className="text-[11px] font-medium text-blue-100 mt-0.5">Finest materials</p>
            </div>
          </div>

          {/* Box 2 */}
          <div className="bg-blue-600 hover:bg-blue-700 rounded-2xl p-6 text-white flex items-center gap-4 shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">FAST DELIVERY</h4>
              <p className="text-[11px] font-medium text-blue-100 mt-0.5">Across Bangladesh</p>
            </div>
          </div>

          {/* Box 3 */}
          <div className="bg-blue-600 hover:bg-blue-700 rounded-2xl p-6 text-white flex items-center gap-4 shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">SECURE PAYMENT</h4>
              <p className="text-[11px] font-medium text-blue-100 mt-0.5">100% secure checkout</p>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS & TESTIMONIALS SECTION */}
      <ReviewsCarousel />

    </div>
  );
};

export default Home;
