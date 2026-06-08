import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Heart, Share2, Maximize2, ChevronRight, Truck, RotateCcw, ShieldCheck, Star, MessageSquare, Send, User, Banknote, Sparkles } from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useCart } from '../contexts/CartContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatPrice, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import QuickOrderModal from '../components/QuickOrderModal';
import ProductCard from '../components/ProductCard';
import ComboOfferBanner from '../components/ComboOfferBanner';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { Review } from '../types';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const { currency, rate } = useCurrency();
  
  const product = products.find(p => p.id === id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showZoom, setShowZoom] = useState(false);
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Related products (same category)
  const relatedProducts = products
    .filter(p => p.category === product?.category && p.id !== id)
    .slice(0, 4);

  // Explore more (other categories)
  const otherCategoryProducts = products
    .filter(p => p.category !== product?.category)
    .sort(() => 0.5 - Math.random())
    .slice(0, 4);

  useEffect(() => {
    if (!id) return;

    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('productId', '==', id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
      const reviewData: Review[] = [];
      snapshot.forEach(doc => {
        reviewData.push({ id: doc.id, ...doc.data() } as Review);
      });
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
        createdAt: Date.now()
      });
      toast.success('Review submitted!');
      setReviewName('');
      setReviewComment('');
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
    if (product && product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    }
  }, [product]);

  if (!product) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 uppercase tracking-widest text-sm">Product not found</p>
        <Link to="/" className="text-brand-gold font-bold uppercase tracking-widest text-xs border-b-2 border-brand-gold pb-1">Return Home</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    addToCart(product, selectedSize, quantity);
    toast.success('Added to bag!');
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    addToCart(product, selectedSize, quantity);
    navigate('/checkout');
  };

  const discount = product.discount || 0;
  const rating = product.rating || 0;

  return (
    <div className="pt-4 md:pt-8 pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 mb-4 md:mb-6">
          <Link to="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to={`/category/${product.category.toLowerCase()}`} className="hover:text-black transition-colors">{product.category}</Link>
          <ChevronRight size={12} />
          <span className="text-black font-bold">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Image Section */}
          <div className="lg:col-span-7 flex flex-col md:flex-row gap-4">
            {/* Thumbnails */}
            <div className="order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto no-scrollbar">
              {product.images?.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={cn(
                    "w-20 h-24 shrink-0 rounded border-2 transition-all overflow-hidden",
                    selectedImage === idx ? "border-brand-gold" : "border-transparent opacity-60"
                  )}
                >
                  <img 
                    src={img} 
                    alt="" 
                    className="w-full h-full object-contain bg-white p-1" 
                  />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div 
              className="order-1 md:order-2 flex-1 relative group aspect-[3/4] bg-gray-50 rounded-sm overflow-hidden border border-gray-100 cursor-zoom-in"
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => setShowZoom(true)}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  src={product.images?.[selectedImage]}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full object-contain bg-white p-4"
                />
              </AnimatePresence>

              {/* Hover Zoom Overly (200% zoom) */}
              <AnimatePresence>
                {isHovering && !showZoom && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 pointer-events-none hidden md:block"
                    style={{
                      backgroundImage: `url(${product.images?.[selectedImage]})`,
                      backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      backgroundSize: '200%',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                )}
              </AnimatePresence>
              
              <div 
                className="absolute top-4 right-4 p-3 bg-white/50 backdrop-blur-md shadow-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 size={20} className="text-black" />
              </div>

              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                  {discount}% Discount
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="lg:col-span-5 space-y-8">
            {Math.random() < 0.5 && <ComboOfferBanner />}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">ELEGAN BD ORIGINAL</p>
              <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-black mb-4">
                {product.name}
              </h1>
              
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-black text-black">{formatPrice(product.price, currency, rate)}</span>
                {product.regularPrice && product.regularPrice > product.price && (
                  <span className="text-lg text-gray-400 line-through">{formatPrice(product.regularPrice, currency, rate)}</span>
                )}
              </div>

              {rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className={cn(i < Math.floor(rating) ? "text-amber-400 fill-amber-400" : "text-black/10 fill-black/10")} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-500">{rating} Rating</span>
                </div>
              )}
            </div>

            {/* Size Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-black">
                <h4 className="text-[11px] font-black uppercase tracking-widest">Select Size</h4>
                <Link to="/size-guide" className="text-[10px] font-bold uppercase tracking-widest text-brand-gold hover:text-black underline decoration-dotted">Size Guide</Link>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes?.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "w-14 h-14 flex items-center justify-center text-xs font-bold border transition-all",
                      selectedSize === size ? "bg-black text-white border-black" : "bg-transparent text-black border-gray-200 hover:border-black"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-black">Quantity</h4>
              <div className="flex items-center w-32 border border-gray-200 text-black">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50"
                >-</button>
                <div className="flex-1 text-center font-bold text-sm">{quantity}</div>
                <button 
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50"
                >+</button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setIsQuickOrderOpen(true)}
                className="w-full bg-black text-white px-8 py-5 text-xs font-bold uppercase tracking-[0.2em] hover:bg-brand-gold hover:text-white transition-all flex items-center justify-center gap-2"
              >
                Direct Order (নাম, নাম্বার দিয়ে)
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleAddToCart}
                  className="w-full bg-transparent text-black border border-gray-200 px-4 py-4 text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-gray-50 transition-all"
                >
                  Add to Bag
                </button>
                <button 
                  onClick={handleBuyNow}
                  className="w-full bg-gray-100 text-black border border-gray-100 px-4 py-4 text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-black hover:text-white transition-all"
                >
                  Buy It Now
                </button>
              </div>
            </div>

            {/* Description Section */}
            {product.description && (
              <div className="space-y-4 pt-8 border-t border-gray-100">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-black">Product Details</h4>
                <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line font-medium italic">
                  {product.description}
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-6 pt-8 border-t border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Truck className="text-blue-600 shrink-0" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-black">Fast Delivery</p>
                  <p className="text-[9px] text-gray-500 mt-1 uppercase">2-3 Days Inside Dhaka</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 rounded-xl">
                  <RotateCcw className="text-green-600 shrink-0" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-black">Easy Return</p>
                  <p className="text-[9px] text-gray-500 mt-1 uppercase">7 Days Exchange Policy</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <Sparkles className="text-amber-500 shrink-0" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-black">Premium Quality</p>
                  <p className="text-[9px] text-gray-500 mt-1 uppercase">Craftsmanship Guaranteed</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Banknote className="text-emerald-600 shrink-0" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-black">Cash On Delivery</p>
                  <p className="text-[9px] text-gray-500 mt-1 uppercase">Pay After Delivery Check</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-32 pt-20 border-t border-gray-100">
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-3">Customer Voice</span>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase text-black">Reviews & Feedback</h2>
            <div className="w-20 h-1 bg-black mt-6"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Reviews List */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-10">
                <MessageSquare className="text-black" size={24} />
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Verified Reviews ({reviews.length})</h2>
              </div>

              {reviews.length === 0 ? (
                <div className="bg-gray-50 rounded-[2rem] p-12 text-center border border-gray-100">
                  <Sparkles size={32} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Be the first to review this masterpiece</p>
                </div>
              ) : (
                <div className="space-y-8 h-[600px] overflow-y-auto no-scrollbar pr-4">
                  {reviews.map(review => (
                    <motion.div 
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 space-y-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center text-lg font-black uppercase shadow-lg">
                            {review.userName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-tighter italic text-black">{review.userName}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{new Date(review.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} className={cn(i < review.rating ? "text-amber-400 fill-amber-400" : "text-black/10 fill-black/10")} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed italic font-medium">"{review.comment}"</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Review Form */}
            <div className="lg:col-span-5 bg-gray-50 rounded-[3rem] p-10 border border-gray-100 h-fit shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 blur-2xl -mr-12 -mt-12 rounded-full" />
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-black mb-8 relative z-10">Rate Your Experience</h3>
              <form onSubmit={handleSubmitReview} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Your Name</label>
                  <input 
                    type="text" 
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold text-black outline-none focus:border-black transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 text-center block">Rating</label>
                  <div className="flex gap-2 bg-white border border-gray-200 rounded-2xl p-4 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="hover:scale-120 transition-transform p-1"
                      >
                        <Star size={24} className={cn(star <= reviewRating ? "text-amber-400 fill-amber-400" : "text-gray-200")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Your Comment</label>
                  <textarea 
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell us what you think..."
                    rows={4}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold text-black outline-none focus:border-black transition-all resize-none shadow-sm"
                    required
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full bg-black text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50 shadow-xl"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-32">
            <div className="flex flex-col items-center text-center mb-16">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 mb-3">You Might Also Like</span>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase text-black">Related Masterpieces</h2>
              <div className="w-20 h-1 bg-black mt-6"></div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {relatedProducts.map(relProduct => (
                <ProductCard key={relProduct.id} product={relProduct} />
              ))}
            </div>
          </div>
        )}

        {/* Explore More Collections */}
        {otherCategoryProducts.length > 0 && (
          <div className="mt-32 pb-40">
            <div className="flex flex-col items-center text-center mb-16">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold mb-3">Explore More</span>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase text-black">Other Collections</h2>
              <div className="w-20 h-1 bg-black mt-6"></div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {otherCategoryProducts.map(otherProduct => (
                <ProductCard key={otherProduct.id} product={otherProduct} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {showZoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center cursor-default backdrop-blur-md overflow-hidden"
          >
            {/* Close Button */}
            <button 
              onClick={() => { setShowZoom(false); setIsExpanded(false); }}
              className="absolute top-6 right-6 z-[110] p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
            >
              <RotateCcw size={24} className="rotate-45" />
            </button>

            {/* Instruction Overlay */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[110] px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full pointer-events-none border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                {isExpanded ? 'Drag/Move to explore (200x Detail)' : 'Click to zoom 200x'}
              </p>
            </div>

            <div 
              className={cn(
                "relative w-full h-full flex items-center justify-center transition-all duration-300",
                isExpanded ? "cursor-move" : "cursor-zoom-in"
              )}
              onClick={() => setIsExpanded(!isExpanded)}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
            >
              <motion.div
                className="relative w-full h-full flex items-center justify-center"
              >
                <motion.img
                  src={product.images?.[selectedImage]}
                  alt="Zoomed"
                  animate={{
                    scale: isExpanded ? 2.5 : 1,
                    x: isExpanded ? `${50 - zoomPos.x}%` : 0,
                    y: isExpanded ? `${50 - zoomPos.y}%` : 0,
                  }}
                  transition={{
                    scale: { type: "spring", damping: 25, stiffness: 120 },
                    x: { type: "tween", ease: "easeOut", duration: 0.1 },
                    y: { type: "tween", ease: "easeOut", duration: 0.1 }
                  }}
                  style={{
                    transformOrigin: 'center center',
                  }}
                  className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl"
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickOrderModal
        product={product}
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
      />
    </div>
  );
};

export default ProductDetails;
