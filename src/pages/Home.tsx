import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, ChevronLeft, ChevronRight, Truck, Award, Lock, Tag, Users, 
  ShoppingBag, Star, Headphones, Clock, Sparkles, ShieldCheck, ArrowLeftRight, 
  HelpCircle, ChevronDown, CheckCircle2, Flame, Gift, Mail, Phone, Building2, MapPin,
  RotateCcw, Banknote
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts, getCanonicalProductKey } from '../contexts/ProductContext';
import { useBanners } from '../contexts/BannerContext';
import { useBranding } from '../contexts/BrandingContext';
import { useCategories, sortCategories } from '../contexts/CategoryContext';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton, ProductScrollSkeleton } from '../components/ProductSkeleton';
import HomeReviewsRealtime from '../components/HomeReviewsRealtime';
import { cn } from '../lib/utils';

const Home = () => {
  const { products, loading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { banners } = useBanners();
  const { 
    heroBannerUrl,
    heroBannerMobileUrl, 
    heroBanner2Url,
    heroBanner2MobileUrl,
    heroBanner3Url,
    heroBanner3MobileUrl,
    showHeroBanner,
    shirtBannerUrl,
    pantBannerUrl,
    subHeroBannerUrl,
    subHeroBannerMobileUrl
  } = useBranding();

  const bestSellingScrollRef = React.useRef<HTMLDivElement>(null);
  const newArrivalScrollRef = React.useRef<HTMLDivElement>(null);
  const shopByCategoryScrollRef = React.useRef<HTMLDivElement>(null);
  const [isHoveredBestSelling, setIsHoveredBestSelling] = React.useState(false);
  const [isHoveredNewArrival, setIsHoveredNewArrival] = React.useState(false);
  const [isHoveredShopCategory, setIsHoveredShopCategory] = React.useState(false);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  // Fabric Showcase tab state
  const [activeFabricTab, setActiveFabricTab] = React.useState<'pants' | 'shirts'>('pants');

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
        mobileImage: b.mobileImage || '',
        title: b.title || '',
        link: b.link || ''
      }));

    // 2. From Branding Settings (heroBannerUrl, heroBanner2Url, heroBanner3Url)
    const brandingList = [
      { desktop: heroBannerUrl, mobile: heroBannerMobileUrl, id: 'branding-hero-0' },
      { desktop: heroBanner2Url, mobile: heroBanner2MobileUrl, id: 'branding-hero-1' },
      { desktop: heroBanner3Url, mobile: heroBanner3MobileUrl, id: 'branding-hero-2' },
    ];

    const fromBranding: typeof fromDb = [];
    brandingList.forEach((item) => {
      const url = item.desktop || item.mobile;
      if (url && !url.includes('unsplash.com') && !fromDb.some(b => b.image === item.desktop)) {
        fromBranding.push({
          id: item.id,
          active: true,
          type: 'hero' as const,
          image: item.desktop || item.mobile,
          mobileImage: item.mobile || '',
          title: '',
          link: ''
        });
      }
    });

    return [...fromDb, ...fromBranding];
  }, [banners, heroBannerUrl, heroBannerMobileUrl, heroBanner2Url, heroBanner2MobileUrl, heroBanner3Url, heroBanner3MobileUrl]);

  const [currentBanner, setCurrentBanner] = React.useState(0);

  React.useEffect(() => {
    if (activeHeroBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % activeHeroBanners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [activeHeroBanners.length]);

  // Ensure products list is strictly deduplicated by ID and canonical code/color key
  const uniqueProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    const seenIds = new Set<string>();
    const seenCanonical = new Set<string>();

    return products.filter(p => {
      if (!p || !p.id) return false;
      const idStr = String(p.id).trim().toLowerCase();
      if (seenIds.has(idStr)) return false;

      const canonicalKey = getCanonicalProductKey(p);
      if (canonicalKey && seenCanonical.has(canonicalKey)) return false;

      seenIds.add(idStr);
      if (canonicalKey) seenCanonical.add(canonicalKey);
      return true;
    });
  }, [products]);

  // Sort products: Formal Pants FIRST (Ordered serially by code/SKU), then Formal Shirts SECOND, then others
  const sortedProducts = React.useMemo(() => {
    if (!uniqueProducts || uniqueProducts.length === 0) return [];
    
    const isPant = (p: typeof uniqueProducts[0]) => {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return cat.includes('pant') || cat.includes('trouser') || name.includes('pant') || name.includes('trouser');
    };

    const isShirt = (p: typeof uniqueProducts[0]) => {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return cat.includes('shirt') || name.includes('shirt') || cat.includes('polo') || name.includes('polo');
    };

    // Helper function to extract numeric code or alphanumeric sequence from product for serial ordering
    const getProductCodeSortKey = (p: typeof uniqueProducts[0]) => {
      const sku = (p.sku || '').trim();
      const name = (p.name || '').trim();
      const fullText = `${sku} ${name}`;

      // 1. Check for explicit "code: XX" or "code-XX" or "code XX" or "code #XX"
      const codeMatch = fullText.match(/\bcode\s*[:#-]?\s*(\d+)/i);
      if (codeMatch) {
        return { hasCode: true, num: parseInt(codeMatch[1], 10), raw: sku || name };
      }

      // 2. Check for prefix with numbers like FP-01, FP01, PANT-01, P-01, P01, EP-01, P-102
      const prefixMatch = fullText.match(/\b(?:fp|pant|p|ep|item|art|artical|article)[\s-_#]*(\d+)/i);
      if (prefixMatch) {
        return { hasCode: true, num: parseInt(prefixMatch[1], 10), raw: sku || name };
      }

      // 3. If SKU starts or ends with digits, or is just digits
      const skuDigits = sku.match(/(\d+)/);
      if (skuDigits) {
        return { hasCode: true, num: parseInt(skuDigits[1], 10), raw: sku || name };
      }

      // 4. Check for standalone digits in the product name
      const nameDigits = name.match(/\b(\d+)\b/);
      if (nameDigits) {
        return { hasCode: true, num: parseInt(nameDigits[1], 10), raw: sku || name };
      }

      // 5. Any digits anywhere in the name
      const anyDigits = name.match(/(\d+)/);
      if (anyDigits) {
        return { hasCode: true, num: parseInt(anyDigits[1], 10), raw: sku || name };
      }

      return { hasCode: false, num: 999999, raw: sku || name };
    };

    const sortProductsByCode = (productList: typeof uniqueProducts) => {
      return [...productList].sort((a, b) => {
        const keyA = getProductCodeSortKey(a);
        const keyB = getProductCodeSortKey(b);

        if (keyA.hasCode && keyB.hasCode) {
          if (keyA.num !== keyB.num) {
            return keyA.num - keyB.num;
          }
          return keyA.raw.localeCompare(keyB.raw, undefined, { numeric: true, sensitivity: 'base' });
        }

        if (keyA.hasCode && !keyB.hasCode) return -1;
        if (!keyA.hasCode && keyB.hasCode) return 1;

        // If neither has explicit numeric code, natural alphanumeric sort by sku or name
        const strA = a.sku || a.name || '';
        const strB = b.sku || b.name || '';
        return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      });
    };

    const pants = sortProductsByCode(uniqueProducts.filter(p => isPant(p)));
    const shirts = sortProductsByCode(uniqueProducts.filter(p => isShirt(p) && !isPant(p)));
    const others = sortProductsByCode(uniqueProducts.filter(p => !isPant(p) && !isShirt(p)));

    return [...pants, ...shirts, ...others];
  }, [uniqueProducts]);

  // Best Selling Products section
  const bestSellingProducts = React.useMemo(() => {
    if (!uniqueProducts || uniqueProducts.length === 0) return [];
    
    // Check if any products have featured or bestSelling marked explicitly
    const explicitBestSellers = uniqueProducts.filter(p => p.featured === true || p.bestSelling === true);
    if (explicitBestSellers.length > 0) {
      return explicitBestSellers;
    }

    const isPant = (p: typeof uniqueProducts[0]) => {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return cat.includes('pant') || cat.includes('trouser') || name.includes('pant') || name.includes('trouser');
    };

    const isShirt = (p: typeof uniqueProducts[0]) => {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return cat.includes('shirt') || name.includes('shirt') || cat.includes('polo') || name.includes('polo');
    };

    const featuredOrTop = uniqueProducts.filter(p => p.featured || p.isTopRated);
    const pool = featuredOrTop.length >= 4 ? featuredOrTop : uniqueProducts;

    const pantsInPool = pool.filter(p => isPant(p));
    const shirtsInPool = pool.filter(p => isShirt(p) && !isPant(p));

    const allPants = uniqueProducts.filter(p => isPant(p));
    const allShirts = uniqueProducts.filter(p => isShirt(p) && !isPant(p));

    const pants = pantsInPool.length > 0 ? pantsInPool : allPants;
    const shirts = shirtsInPool.length > 0 ? shirtsInPool : allShirts;

    const result: typeof uniqueProducts = [];
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
        const unused = uniqueProducts.filter(p => !result.some(item => item.id === p.id));
        if (unused.length > 0) {
          result.push(unused[0]);
        } else {
          break;
        }
      }
    }

    return result;
  }, [uniqueProducts]);

  // Best Selling Filtered Products
  const bestSellingFilteredProducts = bestSellingProducts;

  // Categories for Shop By Category section
  const displayCategories = React.useMemo(() => {
    const list: typeof categories = [];

    const getCatImage = (catName: string, existingImg?: string) => {
      if (existingImg && !existingImg.includes('photo-1602810318383-e386cc2a3ccf')) {
        return existingImg;
      }
      const prod = uniqueProducts.find(p => p.category?.toLowerCase().trim() === catName.toLowerCase().trim());
      if (prod?.images?.[0]) return prod.images[0];
      if ((prod as any)?.image) return (prod as any).image;

      const lower = catName.toLowerCase();
      return '/logo.png';
    };

    categories.forEach(cat => {
      list.push({
        ...cat,
        image: getCatImage(cat.name, cat.image)
      });
    });

    if (uniqueProducts && uniqueProducts.length > 0) {
      uniqueProducts.forEach(p => {
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
  }, [categories, uniqueProducts]);

  // New Arrival Products
  const newArrivalProducts = React.useMemo(() => {
    if (!uniqueProducts || uniqueProducts.length === 0) return [];
    const explicitNew = uniqueProducts.filter(p => p.newArrival === true);
    if (explicitNew.length > 0) return explicitNew;
    return [...uniqueProducts].sort((a, b) => {
      const da = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const db = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return db - da;
    });
  }, [uniqueProducts]);

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
      
      {/* TOP SECTION: HERO BANNER (SLIDER SUPPORT FOR 2 OR MORE BANNERS) */}
      {activeHeroBanners.length > 0 && showHeroBanner && (
        <section className="w-full m-0 p-0 pb-2 sm:pb-4">
          <div className="relative w-full overflow-hidden bg-slate-900 flex items-center justify-center m-0 p-0 group aspect-[1080/650] sm:aspect-[16/9] md:aspect-[1920/900]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full relative flex items-center justify-center overflow-hidden bg-slate-900"
              >
                {/* Main Hero Banner Image - Responsive picture element for Mobile (1080x650 / 5:3) vs Desktop (1920x900 / ~2.13:1) */}
                {activeHeroBanners[currentBanner].link ? (
                  <Link to={activeHeroBanners[currentBanner].link} className="relative z-10 block w-full h-full">
                    <picture className="w-full h-full block">
                      {activeHeroBanners[currentBanner].mobileImage && (
                        <source media="(max-width: 767px)" srcSet={activeHeroBanners[currentBanner].mobileImage} />
                      )}
                      <img 
                        src={activeHeroBanners[currentBanner].image} 
                        alt={`Hero Banner ${currentBanner + 1}`} 
                        className="w-full h-full object-contain bg-white block mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    </picture>
                  </Link>
                ) : (
                  <picture className="relative z-10 w-full h-full block">
                    {activeHeroBanners[currentBanner].mobileImage && (
                      <source media="(max-width: 767px)" srcSet={activeHeroBanners[currentBanner].mobileImage} />
                    )}
                    <img 
                      src={activeHeroBanners[currentBanner].image} 
                      alt={`Hero Banner ${currentBanner + 1}`} 
                      className="w-full h-full object-contain bg-white block mx-auto"
                      referrerPolicy="no-referrer"
                    />
                  </picture>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Slider Navigation Arrows (When 2 or more banners) */}
            {activeHeroBanners.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentBanner(prev => (prev - 1 + activeHeroBanners.length) % activeHeroBanners.length)}
                  className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/40 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-70 hover:opacity-100 hover:scale-105 shadow-lg border border-white/20 cursor-pointer"
                  title="Previous Banner"
                >
                  <ChevronLeft size={20} />
                </button>

                <button
                  onClick={() => setCurrentBanner(prev => (prev + 1) % activeHeroBanners.length)}
                  className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/40 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-70 hover:opacity-100 hover:scale-105 shadow-lg border border-white/20 cursor-pointer"
                  title="Next Banner"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Slider Dots Indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
                  {activeHeroBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentBanner(idx)}
                      className={cn(
                        "h-2 rounded-full transition-all cursor-pointer",
                        currentBanner === idx ? "bg-white w-6" : "bg-white/40 hover:bg-white/70 w-2"
                      )}
                      title={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* 4-COLUMN HIGHLIGHT BAR */}
      <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
        <div className="bg-[#F8FAFC] border border-blue-100/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:px-8 lg:py-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-center">
            
            {/* 1. Nationwide Cash on Delivery */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-[#2563EB] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xs">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] sm:text-[15px] font-bold text-gray-900 leading-tight">Cash On Delivery</span>
                <span className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">Check before you pay</span>
              </div>
            </div>

            {/* 2. 100% Premium Fabric */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-[#2563EB] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] sm:text-[15px] font-bold text-gray-900 leading-tight">100% Premium Fabric</span>
                <span className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">Quality Guaranteed</span>
              </div>
            </div>

            {/* 3. Easy Exchange */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-[#2563EB] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xs">
                <ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] sm:text-[15px] font-bold text-gray-900 leading-tight">Easy Exchange</span>
                <span className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">Free size change in 7 days</span>
              </div>
            </div>

            {/* 4. 24/7 Customer Support */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-[#2563EB] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xs">
                <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] sm:text-[15px] font-bold text-gray-900 leading-tight">24/7 Support</span>
                <span className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">Instant help via call or message</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 1. SHOP BY CATEGORY SECTION */}
      {displayCategories.length > 0 && (
        <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-10 sm:pb-12">
          {/* Section Header: SHOP BY CATEGORY (Larger & Centered) */}
          <div className="relative flex items-center justify-center border-b border-gray-100 pb-4 mb-6 px-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase text-gray-900 tracking-tight text-center">
              SHOP BY CATEGORY
            </h2>
            <div className="absolute right-0 flex items-center gap-2">
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
                const catImg = cat.image || '/logo.png';
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

      {/* 2. BEST SELLING SECTION (FORMAL PANT / FORMAL SHIRT Filter) */}
      <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-10 sm:pb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight text-center mb-4 sm:mb-6">
          BEST SELLING PRODUCTS
        </h2>

        {/* 2-Column Product Grid */}
        {productsLoading ? (
          <ProductGridSkeleton count={8} />
        ) : bestSellingFilteredProducts.length === 0 ? (
          <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-sm font-bold text-gray-500">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4 pt-2">
            {bestSellingFilteredProducts.map((product) => (
              <ProductCard 
                key={`bestselling-${product.id}-${(product as any).updatedAt || ''}-${(product.images?.[0] || product.image || '').slice(-25)}`} 
                product={product} 
                badgeText="BEST SELLING" 
                showPantDiscountBadge={false} 
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. NEW ARRIVAL PRODUCTS SECTION */}
      {(newArrivalProducts.length > 0 || productsLoading) && (
        <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-10">
          {/* Section Header: NEW ARRIVAL PRODUCTS (Larger & Centered) */}
          <div className="relative flex items-center justify-center border-b border-gray-100 pb-4 mb-3 sm:mb-4 px-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase text-gray-900 tracking-tight text-center">
              NEW ARRIVAL PRODUCTS
            </h2>
            <Link 
              to="/category/all" 
              className="absolute right-0 text-xs sm:text-sm font-bold uppercase text-gray-500 hover:text-blue-600 transition-colors tracking-wider flex items-center gap-1 shrink-0"
            >
              <span className="hidden sm:inline">See All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {productsLoading ? (
            <ProductScrollSkeleton count={6} />
          ) : (
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
                className="flex gap-2 sm:gap-3 overflow-x-auto pt-2 pb-3 scroll-smooth snap-x snap-mandatory no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {newArrivalProducts.map((product) => (
                  <div key={`newarrival-${product.id}`} className="w-[calc(50%-4px)] sm:w-[calc(50%-6px)] md:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)] flex-shrink-0 snap-start">
                    <ProductCard 
                      key={`newarrival-card-${product.id}-${(product as any).updatedAt || ''}-${(product.images?.[0] || product.image || '').slice(-25)}`}
                      product={product} 
                      badgeText="NEW" 
                      showPantDiscountBadge={false} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. ALL COLLECTIONS - MAIN PRODUCT SECTION SHOWING FORMAL PANTS FIRST, THEN FORMAL SHIRTS */}
      <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-16">
        {/* Section Header: ALL COLLECTIONS */}
        <div className="relative flex items-center justify-center border-b border-gray-100 pb-4 mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase text-gray-900 tracking-tight text-center">
            ALL COLLECTIONS
          </h2>
          <Link 
            to="/category/all" 
            className="absolute right-0 flex items-center gap-1 text-xs font-black uppercase text-gray-900 hover:text-red-600 transition-colors tracking-wider"
          >
            <span className="hidden sm:inline">VIEW ALL</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Product Grid displaying sorted products (Pants first, then Shirts) */}
        {productsLoading ? (
          <ProductGridSkeleton count={8} />
        ) : sortedProducts.length === 0 ? (
          <div className="py-16 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-sm font-bold text-gray-500">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4 pt-2">
            {sortedProducts.map((product) => (
              <ProductCard 
                key={`all-${product.id}-${(product as any).updatedAt || ''}-${(product.images?.[0] || product.image || '').slice(-25)}`} 
                product={product} 
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. REAL-TIME CUSTOMER REVIEWS SECTION (Directly Below ALL COLLECTIONS) */}
      <HomeReviewsRealtime />

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

