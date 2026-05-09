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
  const { heroBannerUrl, collectionsBannerUrl, featureBannerUrl } = useBranding();
  
  const activeBanners = banners.filter(b => b.active);
  const [currentBanner, setCurrentBanner] = React.useState(0);

  React.useEffect(() => {
    if (activeBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % activeBanners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [activeBanners.length]);

  // Get products by category
  const formalPants = products.filter(p => p.category === 'Formal Pant').slice(0, 8);
  const formalShirts = products.filter(p => p.category === 'Formal Shirt').slice(0, 8);
  const poloTshirts = products.filter(p => p.category === 'Polo T-shirt').slice(0, 8);
  const allCollection = products.slice(0, 12);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative w-full bg-white overflow-hidden">
        <AnimatePresence mode="wait">
          {activeBanners.length > 0 ? (
            <motion.div
              key={activeBanners[currentBanner]?.id || 'slider'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="relative w-full flex justify-center"
            >
              <div className="w-full">
                <img 
                  src={activeBanners[currentBanner]?.image} 
                  alt={activeBanners[currentBanner]?.title} 
                  className="w-full h-auto block"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="relative w-full flex justify-center"
            >
              <div className="w-full">
                <img 
                  src={heroBannerUrl} 
                  alt="Hero Banner" 
                  className="w-full h-auto block"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Trust Features */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              label: 'Premium Quality', 
              sub: 'Craftsmanship Guaranteed', 
              icon: <Sparkles className="text-amber-500" size={28} />,
              bg: 'bg-amber-50'
            },
            { 
              label: 'Easy Returns', 
              sub: '7 Days Guarantee', 
              icon: <RotateCcw className="text-green-500" size={28} />,
              bg: 'bg-green-50'
            },
            { 
              label: 'Free Shipping', 
              sub: 'On orders over ৳3000', 
              icon: <Truck className="text-blue-500" size={28} />,
              bg: 'bg-blue-50'
            },
            { 
              label: 'Cash on Delivery', 
              sub: 'Pay after check', 
              icon: <Banknote className="text-emerald-500" size={28} />,
              bg: 'bg-emerald-50'
            },
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-5 group">
              <div className={cn("p-4 rounded-2xl transition-all duration-300 group-hover:scale-110", feature.bg)}>
                {feature.icon}
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-black">{feature.label}</p>
                <p className="text-[9px] text-gray-400 uppercase tracking-tighter font-bold">{feature.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* Collections Banner Separator */}
      {collectionsBannerUrl && (
        <section className="max-w-7xl mx-auto px-6 py-20 pb-0">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl bg-gray-50 border border-gray-100">
            <img 
              src={collectionsBannerUrl} 
              className="w-full h-auto block" 
              alt="Matrix Segment Banner" 
            />
          </div>
        </section>
      )}

      {/* Category Sections */}
      <div className="space-y-4">
        {/* Formal Pants */}
        {formalPants.length > 0 && (
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="mb-12 text-center">
                <h3 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-black">Formal Pants</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-3 font-bold">Smart & Professionals</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-10">
                {formalPants.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-12 flex justify-center">
                <Link to="/category/formal-pant" className="text-[10px] font-black uppercase tracking-[0.3em] text-black hover:text-brand-gold transition-colors flex items-center gap-2">
                  View All Formal Pants <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Formal Shirts */}
        {formalShirts.length > 0 && (
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6">
              <div className="mb-12 text-center">
                <h3 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-black">Formal Shirts</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-3 font-bold">Elegance Redefined</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-10">
                {formalShirts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-12 flex justify-center">
                <Link to="/category/formal-shirt" className="text-[10px] font-black uppercase tracking-[0.3em] text-black hover:text-brand-gold transition-colors flex items-center gap-2">
                  View All Formal Shirts <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Polo T-shirts */}
        {poloTshirts.length > 0 && (
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="mb-12 text-center">
                <h3 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-black">Polo T-shirts</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-3 font-bold">Premium Comfort</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-10">
                {poloTshirts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-12 flex justify-center">
                <Link to="/category/polo-t-shirt" className="text-[10px] font-black uppercase tracking-[0.3em] text-black hover:text-brand-gold transition-colors flex items-center gap-2">
                  View All Polo T-shirts <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Feature Section Banner */}
      {featureBannerUrl && (
        <section className="max-w-7xl mx-auto px-6 mb-24">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl bg-gray-50 border border-gray-100">
            <img 
              src={featureBannerUrl} 
              className="w-full h-auto block" 
              alt="Feature Banner" 
            />
          </div>
        </section>
      )}

    </div>
  );
};

export default Home;
