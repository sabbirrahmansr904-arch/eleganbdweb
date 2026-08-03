import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Truck, Award, Lock, Tag, Users, ShoppingBag, Star, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useBanners } from '../contexts/BannerContext';
import { useBranding } from '../contexts/BrandingContext';
import { useCategories } from '../contexts/CategoryContext';
import ProductCard from '../components/ProductCard';
import ReviewsCarousel from '../components/ReviewsCarousel';
import { cn } from '../lib/utils';

const Home = () => {
  const { products, loading: productsLoading } = useProducts();
  const { categories } = useCategories();
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

  // Categories for Shop By Category section
  const displayCategories = React.useMemo(() => {
    const list = [...categories];
    if (products && products.length > 0) {
      products.forEach(p => {
        if (p.category && !list.some(c => c.name.toLowerCase() === p.category.toLowerCase() || c.slug.toLowerCase() === p.category.toLowerCase().replace(/\s+/g, '-'))) {
          const slug = p.category.toLowerCase().replace(/\s+/g, '-');
          list.push({
            id: slug,
            name: p.category,
            slug: slug
          });
        }
      });
    }
    return list;
  }, [categories, products]);

  // Best Selling Products section (6 items total, ensuring both shirts & pants are included)
  const bestSellingProducts = React.useMemo(() => {
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

    const featuredOrTop = products.filter(p => p.featured || p.isTopRated);
    const pool = featuredOrTop.length >= 4 ? featuredOrTop : products;

    const pantsInPool = pool.filter(p => isPant(p));
    const shirtsInPool = pool.filter(p => isShirt(p) && !isPant(p));

    const allPants = products.filter(p => isPant(p));
    const allShirts = products.filter(p => isShirt(p) && !isPant(p));

    const pants = pantsInPool.length > 0 ? pantsInPool : allPants;
    const shirts = shirtsInPool.length > 0 ? shirtsInPool : allShirts;

    const result: typeof products = [];
    let pIdx = 0;
    let sIdx = 0;

    // Alternate picking pants and shirts so both are prominently displayed
    while (result.length < 6) {
      let added = false;
      if (pIdx < pants.length && !result.some(item => item.id === pants[pIdx].id)) {
        result.push(pants[pIdx]);
        pIdx++;
        added = true;
      }
      if (result.length < 6 && sIdx < shirts.length && !result.some(item => item.id === shirts[sIdx].id)) {
        result.push(shirts[sIdx]);
        sIdx++;
        added = true;
      }
      if (!added) {
        // Fill remaining slots with any unused products
        const unused = products.filter(p => !result.some(item => item.id === p.id));
        if (unused.length > 0) {
          result.push(unused[0]);
        } else {
          break;
        }
      }
    }

    return result;
  }, [products]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      
      {/* TOP SECTION: HERO BANNER */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
        {activeHeroBanners.length > 0 && showHeroBanner ? (
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs bg-gray-50 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                {activeHeroBanners[currentBanner].link ? (
                  <Link to={activeHeroBanners[currentBanner].link} className="block w-full">
                    <img 
                      src={activeHeroBanners[currentBanner].image} 
                      alt="Hero Banner" 
                      className="w-full h-auto block rounded-2xl sm:rounded-3xl"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                ) : (
                  <img 
                    src={activeHeroBanners[currentBanner].image} 
                    alt="Hero Banner" 
                    className="w-full h-auto block rounded-2xl sm:rounded-3xl"
                    referrerPolicy="no-referrer"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Slider Dots if multiple hero banners */}
            {activeHeroBanners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/40 backdrop-blur-xs px-3 py-1.5 rounded-full">
                {activeHeroBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all cursor-pointer",
                      currentBanner === idx ? "bg-white w-5" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#EAEAEA] rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 relative overflow-hidden flex flex-col justify-between min-h-[220px] sm:min-h-[320px] md:min-h-[380px] shadow-xs">
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
          </div>
        )}
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

      {/* SHOP BY CATEGORY SECTION */}
      {displayCategories.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 pb-12">
          {/* Section Header: SHOP BY CATEGORY (CENTERED & BLUE) */}
          <div className="relative flex items-center justify-center border-b border-gray-100 pb-4 mb-8">
            <h2 className="text-xl md:text-2xl font-black uppercase text-blue-600 tracking-tight text-center">
              SHOP BY CATEGORY
            </h2>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {displayCategories.map((cat) => (
              <Link
                key={cat.id || cat.slug}
                to={`/category/${cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group relative flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl bg-white border border-gray-200/90 shadow-xs hover:shadow-md hover:border-blue-500 transition-all text-center overflow-hidden"
              >
                {cat.image ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 mb-3 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                    <Tag size={22} />
                  </div>
                )}
                <span className="font-black text-xs sm:text-sm text-gray-900 group-hover:text-blue-600 uppercase tracking-wider transition-colors line-clamp-1">
                  {cat.name}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 group-hover:text-blue-500 transition-colors mt-1 uppercase tracking-wider flex items-center gap-1">
                  Explore <ArrowRight size={10} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ALL COLLECTIONS - MAIN PRODUCT SECTION SHOWING FORMAL PANTS FIRST, THEN FORMAL SHIRTS */}
      <section className="max-w-7xl mx-auto w-full px-4 pb-16">
        {/* Section Header: ALL COLLECTIONS (CENTERED & BLUE) */}
        <div className="relative flex items-center justify-center border-b border-gray-100 pb-4 mb-8">
          <h2 className="text-xl md:text-2xl font-black uppercase text-blue-600 tracking-tight text-center">
            ALL COLLECTIONS
          </h2>
          <Link 
            to="/category/all" 
            className="absolute right-0 flex items-center gap-1 text-xs font-black uppercase text-gray-900 hover:text-blue-600 transition-colors tracking-wider"
          >
            <span className="hidden sm:inline">VIEW ALL</span>
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

      {/* WHY CHOOSE ELEGAN BD SECTION */}
      <section className="max-w-7xl mx-auto w-full px-4 pb-16">
        <div className="relative flex flex-col items-center justify-center border-b border-gray-100 pb-6 mb-8 text-center">
          <h2 className="text-xl md:text-2xl font-black uppercase text-blue-600 tracking-tight text-center">
            Why Choose Elegan BD
          </h2>
          <h3 className="text-base md:text-lg font-bold text-gray-900 mt-2">
            কেন Elegan BD বেছে নেবেন?
          </h3>
          <p className="text-xs md:text-sm text-gray-600 font-medium max-w-2xl mt-2.5 leading-relaxed">
            Elegan BD-তে আমরা শুধু পোশাক বিক্রি করি না, বরং আপনার স্টাইল, আত্মবিশ্বাস ও আরামকে গুরুত্ব দিই। উন্নত মানের কাপড়, নিখুঁত ফিটিং এবং সাশ্রয়ী মূল্যের সমন্বয়ে প্রতিটি পণ্য তৈরি করা হয়েছে, যাতে আপনি প্রতিদিন নিজেকে আরও আত্মবিশ্বাসীভাবে উপস্থাপন করতে পারেন।
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Item 1: Fast Delivery */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-xs hover:shadow-md hover:border-blue-500 transition-all text-center flex flex-col items-center justify-center group">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 text-2xl shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
              🚚
            </div>
            <h3 className="font-black text-sm md:text-base text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
              Fast Delivery
            </h3>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              দ্রুততম সময়ে ডেলিভারি
            </p>
          </div>

          {/* Item 2: Cash On Delivery */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-xs hover:shadow-md hover:border-blue-500 transition-all text-center flex flex-col items-center justify-center group">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 text-2xl shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
              💳
            </div>
            <h3 className="font-black text-sm md:text-base text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
              Cash On Delivery
            </h3>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              ক্যাশ অন ডেলিভারি সুবিধা
            </p>
          </div>

          {/* Item 3: Easy Return */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-xs hover:shadow-md hover:border-blue-500 transition-all text-center flex flex-col items-center justify-center group">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 text-2xl shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
              🔄
            </div>
            <h3 className="font-black text-sm md:text-base text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
              Easy Return
            </h3>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              সহজ রিটার্ন সুবিধা
            </p>
          </div>

          {/* Item 4: Premium Quality */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-xs hover:shadow-md hover:border-blue-500 transition-all text-center flex flex-col items-center justify-center group">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 text-2xl shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
              ⭐
            </div>
            <h3 className="font-black text-sm md:text-base text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
              Premium Quality
            </h3>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              ১০০% প্রিমিয়াম কোয়ালিটি
            </p>
          </div>
        </div>
      </section>

      {/* BEST SELLING PRODUCTS SECTION */}
      {bestSellingProducts.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 pb-16">
          {/* Section Header: BEST SELLING PRODUCTS (CENTERED & BLUE) */}
          <div className="relative flex items-center justify-center border-b border-gray-100 pb-4 mb-8">
            <h2 className="text-xl md:text-2xl font-black uppercase text-blue-600 tracking-tight text-center">
              Best Selling Products
            </h2>
            <Link 
              to="/category/all" 
              className="absolute right-0 flex items-center gap-1 text-xs font-black uppercase text-gray-900 hover:text-blue-600 transition-colors tracking-wider"
            >
              <span className="hidden sm:inline">VIEW ALL</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {bestSellingProducts.map((product) => (
              <ProductCard key={`bestseller-${product.id}`} product={product} badgeText="Best Selling" />
            ))}
          </div>
        </section>
      )}

      {/* NUMBERS / STATS SECTION */}
      <section className="max-w-7xl mx-auto w-full px-4 pb-16">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-6 md:p-10 text-white shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-blue-500/50">
            
            {/* Stat 1 */}
            <div className="flex flex-col items-center justify-center p-3 pt-0 md:pt-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center mb-3 border border-white/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                5000+
              </span>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-100 mt-1">
                Happy Customers
              </span>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col items-center justify-center p-3 pt-4 md:pt-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center mb-3 border border-white/20">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                1000+
              </span>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-100 mt-1">
                Orders Delivered
              </span>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center justify-center p-3 pt-4 md:pt-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center mb-3 border border-white/20">
                <Star className="w-6 h-6 text-amber-300 fill-amber-300" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                4.9★
              </span>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-100 mt-1">
                Average Rating
              </span>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col items-center justify-center p-3 pt-4 md:pt-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center mb-3 border border-white/20">
                <Headphones className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                24/7
              </span>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-100 mt-1">
                Support
              </span>
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
