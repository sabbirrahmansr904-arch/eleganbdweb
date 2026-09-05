import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, ChevronLeft, ChevronRight, Truck, Award, Lock, Tag, Users, 
  ShoppingBag, Star, Headphones, Clock, Sparkles, ShieldCheck, ArrowLeftRight, 
  HelpCircle, ChevronDown, CheckCircle2, Flame, Gift, Mail, Phone, Building2, MapPin 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useBanners } from '../contexts/BannerContext';
import { useBranding } from '../contexts/BrandingContext';
import { useCategories, sortCategories } from '../contexts/CategoryContext';
import ProductCard from '../components/ProductCard';
import ReviewsCarousel from '../components/ReviewsCarousel';
import { cn } from '../lib/utils';

const Home = () => {
  const { products, loading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { banners } = useBanners();
  const { 
    heroBannerUrl, 
    heroBanner2Url,
    heroBanner3Url,
    showHeroBanner,
    shirtBannerUrl,
    pantBannerUrl,
    subHeroBannerUrl,
    comboOfferBannerUrl,
    showCountdownBanner,
    comboOfferTitle,
    comboOfferSubTitle,
    comboOfferDiscount,
    comboOfferHours,
    comboOfferMinutes,
    comboOfferSeconds,
    whyChooseImg1,
    whyChooseImg2,
    whyChooseImg3,
    whyChooseImg4
  } = useBranding();

  const bestSellingScrollRef = React.useRef<HTMLDivElement>(null);
  const newArrivalScrollRef = React.useRef<HTMLDivElement>(null);
  const shopByCategoryScrollRef = React.useRef<HTMLDivElement>(null);
  const [isHoveredBestSelling, setIsHoveredBestSelling] = React.useState(false);
  const [isHoveredNewArrival, setIsHoveredNewArrival] = React.useState(false);
  const [isHoveredShopCategory, setIsHoveredShopCategory] = React.useState(false);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [selectedWhyChooseIndex, setSelectedWhyChooseIndex] = React.useState(0);

  // Flash Sale Countdown Timer state
  const [timeLeft, setTimeLeft] = React.useState({ 
    hours: comboOfferHours ?? 14, 
    minutes: comboOfferMinutes ?? 32, 
    seconds: comboOfferSeconds ?? 45 
  });

  React.useEffect(() => {
    setTimeLeft({
      hours: comboOfferHours ?? 14,
      minutes: comboOfferMinutes ?? 32,
      seconds: comboOfferSeconds ?? 45
    });
  }, [comboOfferHours, comboOfferMinutes, comboOfferSeconds]);

  // Fabric Showcase tab state
  const [activeFabricTab, setActiveFabricTab] = React.useState<'pants' | 'shirts'>('pants');

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const scrollLeft = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  // Synchronized Auto Side-Scrolling for BEST SELLING and NEW ARRIVAL sections
  React.useEffect(() => {
    const autoScrollSection = (ref: React.RefObject<HTMLDivElement | null>) => {
      const el = ref.current;
      if (!el) return;

      const firstCard = el.firstElementChild as HTMLElement;
      // Step size is card width + gap (~160px + 10px on mobile or 210px + 16px on desktop)
      const step = firstCard ? firstCard.offsetWidth + 12 : 200;

      // Check if scroll reached near the end
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 15) {
        // Loop back to beginning smoothly
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    };

    const timer = setInterval(() => {
      if (!isHoveredBestSelling) {
        autoScrollSection(bestSellingScrollRef);
      }
      if (!isHoveredNewArrival) {
        autoScrollSection(newArrivalScrollRef);
      }
      if (!isHoveredShopCategory) {
        autoScrollSection(shopByCategoryScrollRef);
      }
    }, 3000); // Synchronized 3-second timing

    return () => clearInterval(timer);
  }, [isHoveredBestSelling, isHoveredNewArrival, isHoveredShopCategory]);
  
  const activeHeroBanners = React.useMemo(() => {
    // 1. From Banner Management
    const fromDb = banners
      .filter(b => b.active && b.type === 'hero' && b.image && !b.image.includes('unsplash.com'))
      .map(b => ({
        id: b.id,
        active: true,
        type: 'hero' as const,
        image: b.image,
        title: b.title || '',
        link: b.link || ''
      }));

    // 2. From Branding Settings (heroBannerUrl, heroBanner2Url, heroBanner3Url)
    const fromBranding: typeof fromDb = [];
    [heroBannerUrl, heroBanner2Url, heroBanner3Url].forEach((url, idx) => {
      if (url && !url.includes('unsplash.com') && !fromDb.some(b => b.image === url)) {
        fromBranding.push({
          id: `branding-hero-${idx}`,
          active: true,
          type: 'hero' as const,
          image: url,
          title: '',
          link: ''
        });
      }
    });

    return [...fromDb, ...fromBranding];
  }, [banners, heroBannerUrl, heroBanner2Url, heroBanner3Url]);

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
    const list: typeof categories = [];

    const getCatImage = (catName: string, existingImg?: string) => {
      if (existingImg && !existingImg.includes('photo-1602810318383-e386cc2a3ccf')) {
        return existingImg;
      }
      const prod = products.find(p => p.category?.toLowerCase().trim() === catName.toLowerCase().trim());
      if (prod?.images?.[0]) return prod.images[0];
      if ((prod as any)?.image) return (prod as any).image;

      const lower = catName.toLowerCase();
      if (lower.includes('pant') || lower.includes('trouser') || lower.includes('chino')) {
        return 'https://images.unsplash.com/photo-1624371414361-e6e0efc8c030?w=600&q=80';
      }
      if (lower.includes('polo') || lower.includes('t-shirt') || lower.includes('tee')) {
        return 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80';
      }
      if (lower.includes('premium')) {
        return 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600&q=80';
      }
      return 'https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?w=600&q=80';
    };

    categories.forEach(cat => {
      list.push({
        ...cat,
        image: getCatImage(cat.name, cat.image)
      });
    });

    if (products && products.length > 0) {
      products.forEach(p => {
        if (p.category && !list.some(c => c.name.toLowerCase() === p.category.toLowerCase() || c.slug.toLowerCase() === p.category.toLowerCase().replace(/\s+/g, '-'))) {
          const slug = p.category.toLowerCase().replace(/\s+/g, '-');
          list.push({
            id: slug,
            name: p.category,
            slug: slug,
            image: getCatImage(p.category)
          });
        }
      });
    }

    return sortCategories(list);
  }, [categories, products]);

  // Best Selling Products section
  const bestSellingProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    
    // Check if any products have featured or bestSelling marked explicitly
    const explicitBestSellers = products.filter(p => p.featured === true || p.bestSelling === true);
    if (explicitBestSellers.length > 0) {
      return explicitBestSellers;
    }

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
    while (result.length < 8) {
      let added = false;
      if (pIdx < pants.length && !result.some(item => item.id === pants[pIdx].id)) {
        result.push(pants[pIdx]);
        pIdx++;
        added = true;
      }
      if (result.length < 8 && sIdx < shirts.length && !result.some(item => item.id === shirts[sIdx].id)) {
        result.push(shirts[sIdx]);
        sIdx++;
        added = true;
      }
      if (!added) {
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

  // New Arrival Products section
  const newArrivalProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];

    // Check if any products have newArrival marked explicitly true
    const explicitNewArrivals = products.filter(p => p.newArrival === true);
    if (explicitNewArrivals.length > 0) {
      return explicitNewArrivals;
    }

    return [...products].sort((a, b) => {
      const da = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const db = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return db - da;
    }).slice(0, 8);
  }, [products]);

  // FAQ Items List
  const faqList = [
    {
      q: 'কিভাবে প্রোডাক্ট অর্ডার করবো?',
      a: 'আপনার পছন্দমতো প্রোডাক্ট নির্বাচন করে "Buy Now" বা "Add to Cart" বাটনে ক্লিক করুন। এরপর আপনার নাম, ঠিকানা এবং ফোন নম্বর দিয়ে চেকআউট সম্পন্ন করুন।'
    },
    {
      q: 'প্যাকেট খুলে দেখে পেমেন্ট করার সুবিধা আছে কি?',
      a: 'জি, অবশ্যই! ডেলিভারিম্যান আসার পর আপনি প্যাকেট খুলে কাপড়ের কোয়ালিটি ও ফিটিং চেক করে ক্যাশ অন ডেলিভারিতে মূল্য পরিশোধ করতে পারবেন।'
    },
    {
      q: 'ডেলিভারি চার্জ কত এবং কতদিনে পাবো?',
      a: 'ঢাকা সিটির ভেতরে ডেলিভারি চার্জ ৮০ টাকা (২৪-৪৮ ঘন্টা) এবং ঢাকা সিটির বাইরে ১৫০ টাকা (২-৩ দিন)।'
    },
    {
      q: 'সাইজ না মিললে বা সমস্যা হলে এক্সচেঞ্জ করতে পারবো?',
      a: 'জি, সাইজ কোনো কারণে ছোট বা বড় হলে আপনি ৭ দিনের মধ্যে খুব সহজেই এক্সচেঞ্জ করে নিতে পারবেন। আমাদের সাপোর্ট টিমে যোগাযোগ করলেই সমাধান পাবেন।'
    },
    {
      q: 'আপনারা কি পাইকারি (Wholesale) বিক্রয় করেন?',
      a: 'জি, আমরা শোরুম, রিটেল শপ ও রিসেলারদের জন্য পাইকারি মূল্যে সর্বাধুনিক ফর্মাল প্যান্ট ও শার্ট দিয়ে থাকি। পাইকারি ক্যাটালগ ও প্রাইজ লিস্ট জানতে সরাসরি আমাদের হোয়াটসঅ্যাপে (+8801631496122) মেসেজ দিন।'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      
      {/* TOP SECTION: HERO BANNER */}
      {activeHeroBanners.length > 0 && showHeroBanner && (
        <section className="w-full m-0 p-0 pb-2 sm:pb-4">
          <div className="relative w-full overflow-hidden bg-black flex items-center justify-center m-0 p-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full relative flex items-center justify-center overflow-hidden bg-black"
              >
                {/* Main Hero Banner Image - Fully visible with object-contain */}
                {activeHeroBanners[currentBanner].link ? (
                  <Link to={activeHeroBanners[currentBanner].link} className="relative z-10 block w-full">
                    <img 
                      src={activeHeroBanners[currentBanner].image} 
                      alt="Hero Banner" 
                      className="w-full h-auto object-contain object-center block"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                ) : (
                  <img 
                    src={activeHeroBanners[currentBanner].image} 
                    alt="Hero Banner" 
                    className="relative z-10 w-full h-auto object-contain object-center block"
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
        </section>
      )}

      {/* TOP FEATURE BADGES BAR */}
      <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-6 sm:pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-blue-50/60 p-4 sm:p-5 rounded-2xl border border-blue-100/80">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Truck size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 uppercase">সারাদেশে ক্যাশ অন ডেলিভারি</h4>
              <p className="text-[11px] text-gray-500 font-medium">প্যাকেট খুলে দেখে পেমেন্ট করুন</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 uppercase">১০০% প্রিমিয়াম ফেব্রিক</h4>
              <p className="text-[11px] text-gray-500 font-medium">কোয়ালিটি গ্যারান্টিড</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 uppercase">সহজ এক্সচেঞ্জ সুবিধা</h4>
              <p className="text-[11px] text-gray-500 font-medium">৭ দিনের মধ্যে ফ্রি সাইজ পরিবর্তন</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Headphones size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 uppercase">২৪/৭ কাস্টমার সাপোর্ট</h4>
              <p className="text-[11px] text-gray-500 font-medium">কল বা মেসেজে সার্বক্ষণিক সহায়তা</p>
            </div>
          </div>
        </div>
      </section>

      {/* FLASH SALE / OFFER BANNER */}
      {showCountdownBanner && (
        <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-6">
          <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 rounded-2xl py-4 sm:py-5 px-5 sm:px-8 text-white shadow-[0_0_30px_rgba(245,158,11,0.5)] relative overflow-hidden border-2 border-amber-400 animate-pulse">
            {/* Ambient Background Image if uploaded */}
            {comboOfferBannerUrl && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none mix-blend-luminosity scale-105"
                style={{ backgroundImage: `url(${comboOfferBannerUrl})` }}
              />
            )}

            {/* Background Glow FX */}
            <div className="absolute -left-10 -top-10 w-48 h-48 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-400/25 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
              <div className="text-center md:text-left flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                {/* Uploaded Banner Image Display */}
                {comboOfferBannerUrl && (
                  <div className="relative group shrink-0 self-center sm:self-auto">
                    <img 
                      src={comboOfferBannerUrl} 
                      alt="Offer Promotion" 
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-20 object-cover rounded-xl border-2 border-amber-400 shadow-lg ring-2 ring-white/20 transform group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 rounded-xl bg-amber-400/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                )}

                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-gray-950 font-black text-xs sm:text-sm px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md shrink-0 self-center sm:self-auto ring-2 ring-white/30">
                  <Sparkles size={14} className="fill-gray-950 animate-spin-slow" />
                  <span>{comboOfferDiscount || "১০% ছাড়"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    {comboOfferTitle || "নতুন অফিস উদ্বোধন উপলক্ষে অফিস ভিজিট কেনাকাটায় ১০% ফ্ল্যাট ছাড়!"}
                  </h3>
                  {comboOfferSubTitle && (
                    <p className="text-xs sm:text-sm text-amber-100 font-bold leading-relaxed mt-1 drop-shadow-xs">
                      {comboOfferSubTitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Office Visit Badge (Slim Pill) */}
              <div className="flex items-center shrink-0">
                <div className="bg-amber-400/20 backdrop-blur-md border-2 border-amber-400 rounded-xl px-4 py-2 flex items-center gap-2.5 shadow-md hover:bg-amber-400/30 transition-all cursor-pointer transform hover:scale-105 duration-200">
                  <Building2 size={16} className="text-amber-300 shrink-0 animate-bounce" />
                  <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wide leading-none whitespace-nowrap">
                    অফিস আউটলেট কেনাকাটায় ১০% ছাড়
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}





      {/* SHOP BY CATEGORY SECTION */}
      {displayCategories.length > 0 && (
        <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-10 sm:pb-12">
          {/* Section Header: SHOP BY CATEGORY with Scroll Controls */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-6 px-1">
            <h2 className="text-sm sm:text-base md:text-xl font-extrabold uppercase text-blue-600 tracking-wide">
              SHOP BY CATEGORY
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollLeft(shopByCategoryScrollRef)}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-black hover:text-white hover:border-black transition-colors flex items-center justify-center text-gray-700 cursor-pointer shadow-2xs"
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollRight(shopByCategoryScrollRef)}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-black hover:text-white hover:border-black transition-colors flex items-center justify-center text-gray-700 cursor-pointer shadow-2xs"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="relative group/carousel">
            <div 
              ref={shopByCategoryScrollRef}
              onMouseEnter={() => setIsHoveredShopCategory(true)}
              onMouseLeave={() => setIsHoveredShopCategory(false)}
              onTouchStart={() => setIsHoveredShopCategory(true)}
              onTouchEnd={() => setIsHoveredShopCategory(false)}
              className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {displayCategories.map((cat) => {
                const catImg = cat.image || 'https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?w=600&q=80';
                return (
                  <Link
                    key={cat.id || cat.slug}
                    to={`/category/${cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="shrink-0 w-[170px] sm:w-[220px] md:w-[260px] lg:w-[280px] group/card relative rounded-2xl overflow-hidden aspect-3/4 bg-gray-900 border border-gray-200/80 shadow-xs hover:shadow-xl hover:border-blue-500 transition-all duration-300 block snap-start"
                  >
                    <img 
                      src={catImg} 
                      alt={cat.name} 
                      className="w-full h-full object-cover object-center group-hover/card:scale-108 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Dark gradient overlay at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                      <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider group-hover/card:text-blue-400 transition-colors line-clamp-1">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-300 group-hover:text-white transition-colors mt-1 uppercase tracking-wider flex items-center gap-1">
                        EXPLORE <ArrowRight size={10} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* NEW ARRIVAL PRODUCTS SECTION */}
      {newArrivalProducts.length > 0 && (
        <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-10">
          {/* Section Header: NEW ARRIVAL PRODUCTS */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 px-1">
            <h2 className="text-sm sm:text-base md:text-xl font-extrabold uppercase text-blue-600 tracking-wide">
              NEW ARRIVAL PRODUCTS
            </h2>
            <Link 
              to="/category/all" 
              className="text-xs sm:text-sm font-bold uppercase text-gray-500 hover:text-blue-600 transition-colors tracking-wider flex items-center gap-1 shrink-0"
            >
              <span>See All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="relative group/carousel">
            {/* Scroll Left Button */}
            <button
              onClick={() => scrollLeft(newArrivalScrollRef)}
              className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-all cursor-pointer opacity-90 hover:opacity-100"
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Scroll Right Button */}
            <button
              onClick={() => scrollRight(newArrivalScrollRef)}
              className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-all cursor-pointer opacity-90 hover:opacity-100"
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>

            {/* Scrollable Container */}
            <div 
              ref={newArrivalScrollRef}
              onMouseEnter={() => setIsHoveredNewArrival(true)}
              onMouseLeave={() => setIsHoveredNewArrival(false)}
              onTouchStart={() => setIsHoveredNewArrival(true)}
              onTouchEnd={() => setIsHoveredNewArrival(false)}
              className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {newArrivalProducts.map((product) => (
                <div key={`newarrival-${product.id}`} className="w-[calc(50%-4px)] sm:w-[calc(50%-6px)] md:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)] flex-shrink-0 snap-start">
                  <ProductCard product={product} badgeText="NEW" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ALL COLLECTIONS - MAIN PRODUCT SECTION SHOWING FORMAL PANTS FIRST, THEN FORMAL SHIRTS */}
      <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-16">
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* SUB-HERO BANNER - BELOW ALL PRODUCTS */}
      {subHeroBannerUrl && (
        <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-16">
          <Link 
            to="/category/all" 
            className="group block relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100/80 transition-all hover:shadow-md"
          >
            <img 
              src={subHeroBannerUrl} 
              alt="Sub-Hero Promotional Banner" 
              className="w-full h-auto object-cover object-center transition-transform duration-700 group-hover:scale-101"
              referrerPolicy="no-referrer"
            />
          </Link>
        </section>
      )}

      {/* BEST SELLING PRODUCTS SECTION */}
      {bestSellingProducts.length > 0 && (
        <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-16">
          {/* Section Header: BEST SELLING PRODUCTS */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 px-1">
            <h2 className="text-sm sm:text-base md:text-xl font-extrabold uppercase text-blue-600 tracking-wide">
              BEST SELLING PRODUCTS
            </h2>
            <Link 
              to="/category/all" 
              className="text-xs sm:text-sm font-bold uppercase text-gray-500 hover:text-blue-600 transition-colors tracking-wider flex items-center gap-1 shrink-0"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="relative group/carousel">
            {/* Scroll Left Button */}
            <button
              onClick={() => scrollLeft(bestSellingScrollRef)}
              className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-all cursor-pointer opacity-90 hover:opacity-100"
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Scroll Right Button */}
            <button
              onClick={() => scrollRight(bestSellingScrollRef)}
              className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-all cursor-pointer opacity-90 hover:opacity-100"
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>

            {/* Scrollable Container */}
            <div 
              ref={bestSellingScrollRef}
              onMouseEnter={() => setIsHoveredBestSelling(true)}
              onMouseLeave={() => setIsHoveredBestSelling(false)}
              onTouchStart={() => setIsHoveredBestSelling(true)}
              onTouchEnd={() => setIsHoveredBestSelling(false)}
              className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {bestSellingProducts.map((product) => (
                <div key={`bestseller-${product.id}`} className="w-[calc(50%-4px)] sm:w-[calc(50%-6px)] md:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)] flex-shrink-0 snap-start">
                  <ProductCard product={product} badgeText="Best Selling" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}



      {/* WHY CHOOSE ELEGAN BD SECTION */}
      <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-16">
        <div className="relative flex flex-col items-center justify-center border-b border-gray-100 pb-6 mb-8 text-center">
          <h2 className="text-xl md:text-2xl font-black uppercase text-blue-600 tracking-tight text-center">
            Why Choose Elegan BD
          </h2>
          <h3 className="text-base md:text-lg font-bold text-gray-900 mt-2">
            কেন Elegan BD-র কাপড় সবচেয়ে আলাদা?
          </h3>
          <p className="text-xs md:text-sm text-gray-600 font-medium max-w-2xl mt-2.5 leading-relaxed">
            Elegan BD-তে আমাদের প্যান্টের ফেব্রিক্স <span className="font-bold text-blue-600">Woven Cotton Fabrics</span> এবং শার্টের ফেব্রিক্স <span className="font-bold text-blue-600">Refine Cotton</span>। সেরা কোয়ালিটির সুতা ও উন্নত প্রক্রিয়ায় তৈরি আমাদের প্রতিটি পোশাক অত্যন্ত আরামদায়ক, দীর্ঘস্থায়ী ও প্রিমিয়াম লুক প্রদান করে।
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

        {/* 4 FEATURE PICTURES SEAMLESS FULL-WIDTH GRID (NO GAPS, NO NUMBERS) */}
        <div className="mt-8 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 w-full">
            {[
              { id: '1', url: whyChooseImg1, defaultUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1200&q=80', label: 'Picture 1' },
              { id: '2', url: whyChooseImg2, defaultUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=80', label: 'Picture 2' },
              { id: '3', url: whyChooseImg3, defaultUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80', label: 'Picture 3' },
              { id: '4', url: whyChooseImg4, defaultUrl: 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?auto=format&fit=crop&w=1200&q=80', label: 'Picture 4' },
            ].map((item, idx) => {
              const displayUrl = item.url || item.defaultUrl;
              return (
                <div 
                  key={item.id} 
                  className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100 group"
                >
                  <img 
                    src={displayUrl} 
                    alt={`Elegan BD Feature ${idx + 1}`} 
                    className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105 block"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== item.defaultUrl) {
                        target.src = item.defaultUrl;
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3-STEP EASY ORDERING & INSPECTION PROCESS */}
      <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-16">
        <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 md:p-10">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-black uppercase text-blue-600 tracking-wider">EASY ORDER PROCESS</span>
            <h2 className="text-xl md:text-2xl font-black uppercase text-gray-900 mt-1">
              মাত্র ৩ ধাপে নিরাপদ অনলাইন কেনাকাটা
            </h2>
            <p className="text-xs md:text-sm text-gray-600 font-medium mt-1">
              কোনো প্রকার ঝুঁকি বা অগ্রিম পেমেন্ট ছাড়া নিশ্চিন্তে অর্ডার করুন
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="bg-white border border-blue-100/80 rounded-2xl p-6 text-center shadow-xs hover:shadow-md transition-all relative">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-lg shadow-md">
                ১
              </div>
              <h3 className="font-black text-base text-gray-900 uppercase">পছন্দের প্রোডাক্ট সিলেক্ট করুন</h3>
              <p className="text-xs text-gray-600 font-medium mt-2 leading-relaxed">
                আপনার পছন্দের প্যান্ট বা শার্ট বেছে নিয়ে সঠিক সাইজ ও কালার সিলেক্ট করুন এবং "Buy Now" এ ক্লিক করুন।
              </p>
            </div>

            <div className="bg-white border border-blue-100/80 rounded-2xl p-6 text-center shadow-xs hover:shadow-md transition-all relative">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-lg shadow-md">
                ২
              </div>
              <h3 className="font-black text-base text-gray-900 uppercase">ক্যাশ অন ডেলিভারিতে কনফার্ম করুন</h3>
              <p className="text-xs text-gray-600 font-medium mt-2 leading-relaxed">
                আপনার নাম, মোবাইল নম্বর ও ঠিকানা দিয়ে কোনো অগ্রিম টাকা না দিয়ে অর্ডার সাবমিট করুন।
              </p>
            </div>

            <div className="bg-white border border-blue-100/80 rounded-2xl p-6 text-center shadow-xs hover:shadow-md transition-all relative">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-lg shadow-md">
                ৩
              </div>
              <h3 className="font-black text-base text-gray-900 uppercase">প্যাকেট খুলে দেখে পেমেন্ট করুন</h3>
              <p className="text-xs text-gray-600 font-medium mt-2 leading-relaxed">
                ডেলিভারিম্যান সামনে রেখে কাপড়ের কোয়ালিটি ও ফিটিং চেক করে মন মতো হলে মূল্য পরিশোধ করুন!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NUMBERS / STATS SECTION */}
      <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-3xl p-6 md:p-10 text-blue-600 shadow-lg border border-blue-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-blue-100">
            
            {/* Stat 1 */}
            <div className="flex flex-col items-center justify-center p-3 pt-0 md:pt-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 border border-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-blue-600">
                5000+
              </span>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-600 mt-1">
                Happy Customers
              </span>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col items-center justify-center p-3 pt-4 md:pt-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 border border-blue-100">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-blue-600">
                10000+
              </span>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-600 mt-1">
                Orders Delivered
              </span>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center justify-center p-3 pt-4 md:pt-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 border border-blue-100">
                <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-blue-600">
                4.9★
              </span>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-600 mt-1">
                Average Rating
              </span>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col items-center justify-center p-3 pt-4 md:pt-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 border border-blue-100">
                <Headphones className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-blue-600">
                24/7
              </span>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-600 mt-1">
                Support
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* REVIEWS & TESTIMONIALS SECTION */}
      <ReviewsCarousel />

      {/* FAQ SECTION */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-16 pt-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest border border-blue-100 mb-2">
            <HelpCircle size={14} />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-gray-900">
            সাধারণ কিছু প্রশ্নের উত্তর
          </h2>
        </div>

        <div className="space-y-3">
          {faqList.map((item, idx) => (
            <div 
              key={idx}
              className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden transition-all shadow-xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-extrabold text-sm sm:text-base text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <span>{item.q}</span>
                <ChevronDown size={18} className={cn("transition-transform text-gray-400 shrink-0", openFaq === idx && "rotate-180 text-blue-600")} />
              </button>
              
              {openFaq === idx && (
                <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed border-t border-gray-100 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FABRIC & PREMIUM QUALITY SHOWCASE SECTION - PLACED DIRECTLY ABOVE FOOTER */}
      <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-blue-950 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-400 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest border border-blue-500/30 mb-3">
              <Sparkles size={14} />
              <span>FABRIC & MATERIAL EXCELLENCE</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              কেন ELEGAN BD-র কাপড় সবচেয়ে আলাদা?
            </h2>
            <p className="text-xs md:text-sm text-slate-300 font-medium mt-2 leading-relaxed">
              উন্নত সুতা, নিখুঁত স্টিচিং এবং দীর্ঘস্থায়ী রঙের নিশ্চয়তায় তৈরি প্রতিটি প্রোডাক্ট
            </p>

            {/* Tab Switcher */}
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setActiveFabricTab('pants')}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  activeFabricTab === 'pants' 
                    ? "bg-blue-600 text-white shadow-lg" 
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                ফর্মাল প্যান্ট ফেব্রিক
              </button>
              <button
                onClick={() => setActiveFabricTab('shirts')}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  activeFabricTab === 'shirts' 
                    ? "bg-blue-600 text-white shadow-lg" 
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                অক্সফোর্ড ও কটন শার্ট ফেব্রিক
              </button>
            </div>
          </div>

          {activeFabricTab === 'pants' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-blue-500 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg mb-3">
                  🧵
                </div>
                <h3 className="font-extrabold text-sm text-white uppercase mb-1">Export Woven Cotton স্ট্রেচ</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  উন্নত Export Woven Cotton কাপড়ে ৩% স্প্যানডেক্স মিক্সড যা আপনাকে বসা বা হাঁটার সময় সর্বোচ্চ আরাম দেয়।
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-blue-500 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg mb-3">
                  🎨
                </div>
                <h3 className="font-extrabold text-sm text-white uppercase mb-1">১০০% কালার ফাস্টনেস</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  পছন্দের রঙ কখনো উঠবে না বা ফেইড হবে না। বারবার ধোয়ার পরও নতুনের মতো উজ্জ্বল থাকবে।
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-blue-500 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg mb-3">
                  ✂️
                </div>
                <h3 className="font-extrabold text-sm text-white uppercase mb-1">প্রিমিয়াম পকেট ও চেইন</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  অরিজিনাল YKK চেইন ও শক্ত কটন পকেটিং কাপড় যা দৈনন্দিন ব্যবহারের জন্য টেকসই।
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-blue-500 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg mb-3">
                  🛡️
                </div>
                <h3 className="font-extrabold text-sm text-white uppercase mb-1">প্রি-শ্রাঙ্ক ফেব্রিক</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  ধোয়ার পর প্যান্ট ছোট বা খাটো হয়ে যাওয়ার কোনো চান্স নেই। মেজারমেন্ট থাকবে ১০০% পারফেক্ট।
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-blue-500 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg mb-3">
                  👔
                </div>
                <h3 className="font-extrabold text-sm text-white uppercase mb-1">১০০% কটন অক্সফোর্ড</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  নরম ও আরামদায়ক ১০০% পিওর কটন ফেব্রিক, যা সারাদিনের ব্যবহারে কোনো গরম বা অস্বস্তি তৈরি করে না।
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-blue-500 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg mb-3">
                  ✨
                </div>
                <h3 className="font-extrabold text-sm text-white uppercase mb-1">সহজ আয়রন ও রিনকেল ফ্রি</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  দ্রুত কুঁচকে যায় না, হালকা প্রেস করলেই তৈরি হয়ে যায় নিখুঁত প্রফেশনাল ভাইব।
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-blue-500 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg mb-3">
                  🪡
                </div>
                <h3 className="font-extrabold text-sm text-white uppercase mb-1">ডাবল স্টিচিং ফিনিশিং</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  উন্নত সেলাই ও কলার পেস্টিং যা শার্টের কলারকে রাখে সবসময় সোজা ও গর্জিয়াস।
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-blue-500 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg mb-3">
                  💎
                </div>
                <h3 className="font-extrabold text-sm text-white uppercase mb-1">প্রিমিয়াম মেটাল বাটন</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  মজবুত বাটন ও নিখুঁত বাটনহোল যা দীর্ঘদিন ব্যবহারের পরও খুলে বা আলগা হয় না।
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FLOATING WHATSAPP WHOLESALE BUTTON */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center">
        <a
          href="https://wa.me/8801631496122?text=আসসালামু%20আলাইকুম,%20আমি%20পাইকারি%20(Wholesale)%20অর্ডার%20করতে%20চাই।%20পণ্য%20ও%20পাইকারি%20মূল্য%20জানাবেন।"
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp এ যোগাযোগ করুন"
          className="group relative flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 border-2 border-white"
        >
          <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </a>
      </div>

    </div>
  );
};

export default Home;

