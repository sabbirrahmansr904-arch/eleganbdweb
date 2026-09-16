import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  Heart, 
  Share2, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  Star, 
  ChevronRight, 
  Check, 
  Flame,
  MessageCircle,
  Clock,
  Sparkles,
  Zap,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useProducts } from '../contexts/ProductContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { useBranding } from '../contexts/BrandingContext';
import { formatPrice, cn } from '../lib/utils';
import { Product, Review } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { trackAddToCart, trackViewContent } from '../utils/pixelTracker';
import { isPantProduct, getCleanProductSizes, isSizeUsableAndInStock } from '../utils/productSizeHelper';
import QuickOrderModal from '../components/QuickOrderModal';
import ProductDetailsSkeleton from '../components/ProductDetailsSkeleton';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, loading } = useProducts();
  const { currency, rate } = useCurrency();
  const { addToCart } = useCart();
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('eleganbd_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isFavorite = (prodId: string) => favorites.includes(prodId);
  const toggleFavorite = (p: Product) => {
    setFavorites(prev => {
      const next = prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id];
      try {
        localStorage.setItem('eleganbd_wishlist', JSON.stringify(next));
      } catch {}
      toast.success(next.includes(p.id) ? 'Added to wishlist' : 'Removed from wishlist');
      return next;
    });
  };
  const { sizeChartUrl, shippingInsideDhaka, shippingOutsideDhaka, shippingFreeAfter } = useBranding();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews' | 'shipping'>('desc');
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showSizeChartModal, setShowSizeChartModal] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [showFitAssistant, setShowFitAssistant] = useState(false);
  const [fitHeightFt, setFitHeightFt] = useState('5');
  const [fitHeightIn, setFitHeightIn] = useState('6');
  const [fitWeight, setFitWeight] = useState('65');
  const [fitRecommendation, setFitRecommendation] = useState<string | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const trackedProductIdRef = React.useRef<string | null>(null);

  const product = useMemo(() => {
    return products.find(p => p.id === id) || null;
  }, [products, id]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setSelectedImage(0);
  }, [id]);

  useEffect(() => {
    if (product && trackedProductIdRef.current !== product.id) {
      trackedProductIdRef.current = product.id;
      trackViewContent(product);
    }
  }, [product]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const calculateFitRecommendation = () => {
    const weightNum = parseFloat(fitWeight);
    if (!weightNum || isNaN(weightNum)) return;
    if (!product) return;

    const isPant = (product.category || '').toLowerCase().includes('pant');
    let recommended = '';

    if (isPant) {
      if (weightNum < 52) recommended = '28';
      else if (weightNum <= 57) recommended = '30';
      else if (weightNum <= 65) recommended = '32';
      else if (weightNum <= 74) recommended = '34';
      else if (weightNum <= 82) recommended = '36';
      else if (weightNum <= 90) recommended = '38';
      else recommended = '40';
    } else {
      if (weightNum < 55) recommended = 'M';
      else if (weightNum <= 68) recommended = 'L';
      else if (weightNum <= 80) recommended = 'XL';
      else recommended = 'XXL';
    }

    setFitRecommendation(recommended);
    if (product.sizes?.includes(recommended) && isSizeUsableAndInStock(product, recommended)) {
      setSelectedSize(recommended);
    }
  };

  const isPant = isPantProduct(product);
  const isBag = (product?.category || '').toLowerCase().includes('bag');
  const cleanSizes = useMemo(() => product ? getCleanProductSizes(product) : [], [product]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter(p => p.category === product.category && p.id !== product.id)
      .slice(0, 4);
  }, [products, product]);

  const otherCategoryProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter(p => p.category !== product.category)
      .slice(0, 4);
  }, [products, product]);

  useEffect(() => {
    if (!id) return;

    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('productId', '==', id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(reviewsQuery, (snapshot: any) => {
      const reviewData: Review[] = [];
      if (snapshot && typeof snapshot.forEach === 'function') {
        snapshot.forEach((docSnap: any) => {
          reviewData.push({ id: docSnap.id, ...docSnap.data() } as Review);
        });
      } else if (snapshot && Array.isArray(snapshot.docs)) {
        snapshot.docs.forEach((docSnap: any) => {
          reviewData.push({ id: docSnap.id, ...docSnap.data() } as Review);
        });
      }
      setReviews(reviewData);
    }, (error) => {
       console.error("Reviews fetch error:", error);
    });

    return () => unsubscribe();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: id,
        userName: reviewName,
        rating: reviewRating,
        comment: reviewComment,
        images: reviewImages,
        isVerifiedPurchase: true,
        createdAt: Date.now()
      });
      toast.success('Review submitted!');
      setReviewName('');
      setReviewComment('');
      setReviewImages([]);
      setReviewRating(5);
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((touch.clientX - left) / width) * 100;
    const y = ((touch.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  useEffect(() => {
    if (product && cleanSizes.length > 0) {
      setSelectedSize(prev => {
        if (prev && cleanSizes.includes(prev) && isSizeUsableAndInStock(product, prev)) {
          return prev;
        }
        const firstAvailable = cleanSizes.find(size => isSizeUsableAndInStock(product, size));
        return firstAvailable || cleanSizes[0] || '';
      });
    }
  }, [product?.id, cleanSizes]);

  const productImages = useMemo(() => {
    if (product?.images && product.images.length > 0) {
      return product.images.filter(Boolean);
    }
    return product?.image ? [product.image] : [];
  }, [product]);

  if (!product) {
    if (loading) {
      return <ProductDetailsSkeleton />;
    }
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">প্রোডাক্টটি পাওয়া যায়নি (Product Not Found)</h2>
        <p className="text-gray-600 mb-6">প্রোডাক্টটি হয়তো রিমুভ করা হয়েছে অথবা সঠিক লিংক নয়।</p>
        <Link to="/" className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors">
          হোম পেজে ফিরে যান
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error(isBag ? 'Please select QN' : 'Please select a size');
      return;
    }
    if (!isSizeUsableAndInStock(product, selectedSize)) {
      toast.error(`সাইজ ${selectedSize} বর্তমানে স্টকে নেই (Out of stock)`);
      return;
    }
    addToCart(product, selectedSize, quantity);
    trackAddToCart(product, selectedSize, quantity);
    toast.success('Added to bag!');
  };

  const handleQuickOrder = () => {
    if (!selectedSize) {
      toast.error(isBag ? 'Please select QN' : 'Please select a size');
      return;
    }
    if (!isSizeUsableAndInStock(product, selectedSize)) {
      toast.error(`সাইজ ${selectedSize} বর্তমানে স্টকে নেই (Out of stock)`);
      return;
    }
    addToCart(product, selectedSize, quantity);
    trackAddToCart(product, selectedSize, quantity);
    navigate('/checkout');
  };

  const currentMainImage = productImages[selectedImage] || productImages[0] || product?.image || '';
  const discount = product?.discount || (product?.regularPrice && product?.price ? Math.round(((product.regularPrice - product.price) / product.regularPrice) * 100) : 0);
  const rating = product?.rating || 0;

  return (
    <div className="pt-4 md:pt-8 pb-24 bg-white min-h-screen">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 mb-4 md:mb-6">
          <Link to="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to={`/category/${product.category.toLowerCase()}`} className="hover:text-black transition-colors">{product.category}</Link>
          <ChevronRight size={12} />
          <span className="text-black font-bold truncate max-w-xs">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Image Section */}
          <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4">
            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[600px] no-scrollbar">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "relative w-20 h-24 shrink-0 border-2 transition-all rounded-sm overflow-hidden bg-gray-50",
                      selectedImage === idx ? "border-brand-gold ring-1 ring-brand-gold" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img 
                      src={img} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image Stage */}
            <div 
              className="relative flex-1 bg-gray-50 rounded-sm overflow-hidden min-h-[420px] md:min-h-[580px] flex items-center justify-center cursor-crosshair group select-none"
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onTouchMove={handleTouchMove}
            >
              <img 
                src={currentMainImage} 
                alt={product.name} 
                className={cn(
                  "w-full h-full object-contain max-h-[650px] transition-transform duration-200",
                  isHovering ? "opacity-0 md:opacity-100 md:scale-150" : "scale-100"
                )}
                style={isHovering ? {
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`
                } : undefined}
                referrerPolicy="no-referrer"
              />

              {/* Discount Tag */}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-600 text-white text-[11px] font-black px-3 py-1 uppercase tracking-widest rounded-xs shadow-md">
                  {discount}% OFF
                </div>
              )}

              {/* Wishlist Button */}
              <button
                onClick={() => toggleFavorite(product)}
                className="absolute top-4 right-4 p-3 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 hover:text-red-500 shadow-lg transition-all"
              >
                <Heart size={20} className={cn(isFavorite(product.id) && "fill-red-500 text-red-500")} />
              </button>
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-gold bg-brand-gold/10 px-2.5 py-0.5 rounded-full">
                  {product.category}
                </span>
                {product.isFeatured && (
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={10} /> Exclusive
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-brand-black tracking-tight uppercase">
                {product.name}
              </h1>

              {/* Pricing */}
              <div className="flex items-center gap-4 mt-3">
                <span className="text-3xl font-black text-brand-black tracking-tight">
                  {formatPrice(product.price, currency, rate)}
                </span>
                {product.regularPrice && product.regularPrice > product.price && (
                  <span className="text-lg text-gray-400 line-through font-medium">
                    {formatPrice(product.regularPrice, currency, rate)}
                  </span>
                )}
              </div>
            </div>

            {/* Size Selector */}
            {cleanSizes.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-800">
                    {isBag ? 'Select Quantity/Variant' : isPant ? 'Select Waist Size' : 'Select Size'}
                  </label>
                  {sizeChartUrl && (
                    <button 
                      onClick={() => setShowSizeChartModal(true)}
                      className="text-xs font-bold text-brand-gold hover:underline flex items-center gap-1"
                    >
                      <Info size={13} /> Size Chart
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {cleanSizes.map(size => {
                    const isAvailable = isSizeUsableAndInStock(product, size);
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          if (!isAvailable) {
                            toast.error(`সাইজ ${size} এর স্টক শেষ (Out of stock)`);
                            return;
                          }
                          setSelectedSize(size);
                        }}
                        disabled={!isAvailable}
                        className={cn(
                          "min-w-[48px] h-12 px-4 flex items-center justify-center text-xs font-black rounded-sm border transition-all select-none",
                          isSelected && isAvailable
                            ? "bg-black text-white border-black shadow-md"
                            : isAvailable
                              ? "bg-white text-gray-900 border-gray-200 hover:border-black cursor-pointer"
                              : "bg-gray-100 text-gray-400 border-dashed border-gray-200 opacity-50 cursor-not-allowed line-through"
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-800">Quantity</label>
              <div className="flex items-center w-36 border border-gray-200 rounded-sm bg-white">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-12 h-11 flex items-center justify-center font-black text-lg hover:bg-gray-50 text-gray-700"
                >
                  -
                </button>
                <span className="flex-1 text-center font-bold text-sm">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-12 h-11 flex items-center justify-center font-black text-lg hover:bg-gray-50 text-gray-700"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <button
                onClick={handleAddToCart}
                className="w-full bg-brand-gold text-white py-4 px-6 rounded-sm text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-gold/20 hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag size={16} /> Add To Bag
              </button>

              <button
                onClick={handleQuickOrder}
                className="w-full bg-black text-white py-4 px-6 rounded-sm text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:bg-brand-gold transition-all flex items-center justify-center gap-2"
              >
                <Zap size={16} /> Order Now (Cash on Delivery)
              </button>
            </div>

            {/* Delivery Info */}
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Truck size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">হোম ডেলিভারি সুবিধা (Home Delivery)</p>
                  <p className="text-[11px] text-slate-500">ঢাকা: ৳{shippingInsideDhaka} • ঢাকার বাইরে: ৳{shippingOutsideDhaka}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">সহজ রিটার্ন ও এক্সচেঞ্জ (Easy Exchange)</p>
                  <p className="text-[11px] text-slate-500">৭ দিনের মধ্যে যেকোনো সাইজ বা ত্রুটি পরিবর্তনযোগ্য</p>
                </div>
              </div>
            </div>

            {/* Product Details Tabs */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex border-b border-gray-200 gap-6">
                <button
                  onClick={() => setActiveTab('desc')}
                  className={cn(
                    "pb-3 text-xs font-black uppercase tracking-wider transition-colors relative",
                    activeTab === 'desc' ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-gray-700"
                  )}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={cn(
                    "pb-3 text-xs font-black uppercase tracking-wider transition-colors relative",
                    activeTab === 'reviews' ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-gray-700"
                  )}
                >
                  Reviews ({reviews.length})
                </button>
                <button
                  onClick={() => setActiveTab('shipping')}
                  className={cn(
                    "pb-3 text-xs font-black uppercase tracking-wider transition-colors relative",
                    activeTab === 'shipping' ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-gray-700"
                  )}
                >
                  Delivery Policy
                </button>
              </div>

              <div className="py-6 text-sm text-gray-600 leading-relaxed">
                {activeTab === 'desc' && (
                  <div className="space-y-4 whitespace-pre-line">
                    {product.description || 'Premium quality garment crafted with attention to fabric details, durability, and contemporary fit.'}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    {reviews.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No reviews yet. Be the first to review this product!</p>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map(rev => (
                          <div key={rev.id} className="p-4 bg-gray-50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-gray-900">{rev.userName}</span>
                              <div className="flex text-amber-400">
                                {Array.from({ length: rev.rating }).map((_, i) => (
                                  <Star key={i} size={12} fill="currentColor" />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-600">{rev.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Submit Review */}
                    <form onSubmit={handleSubmitReview} className="pt-4 border-t border-gray-100 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-black">Write a Review</h4>
                      <input 
                        type="text"
                        placeholder="Your Name"
                        value={reviewName}
                        onChange={e => setReviewName(e.target.value)}
                        className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-sm"
                        required
                      />
                      <textarea 
                        placeholder="Your Feedback..."
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-sm h-20"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="px-4 py-2 bg-black text-white text-xs font-bold rounded-sm hover:bg-gray-800"
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="space-y-3 text-xs">
                    <p>• ঢাকা সিটিতে সাধারণত ২৪-৪৮ ঘণ্টার মধ্যে ডেলিভারি সম্পন্ন হয়।</p>
                    <p>• ঢাকার বাইরে সারা বাংলাদেশে ৩-৫ কার্যদিবসের মধ্যে নির্ভরযোগ্য কুরিয়ারে ক্যাশ অন ডেলিভারিতে পৌঁছানো হয়।</p>
                    <p>• প্রোডাক্ট রিসিভ করার সময় চেক করে নিতে পারবেন।</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 pt-12 border-t border-gray-100">
            <h3 className="text-xl font-black uppercase tracking-wider mb-8 text-black">
              Related Products
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map(p => (
                <Link key={p.id} to={`/product/${p.id}`} className="group block space-y-2">
                  <div className="aspect-[3/4] bg-gray-50 rounded-sm overflow-hidden">
                    <img 
                      src={p.images?.[0] || p.image} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-brand-gold transition-colors truncate">
                    {p.name}
                  </h4>
                  <p className="text-xs font-black text-black">
                    {formatPrice(p.price, currency, rate)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Order Modal */}
      {product && (
        <QuickOrderModal 
          product={product}
          isOpen={isQuickOrderOpen}
          onClose={() => setIsQuickOrderOpen(false)}
        />
      )}
    </div>
  );
}
