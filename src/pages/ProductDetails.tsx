/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useProducts } from '../contexts/ProductContext';
import { formatPrice, cn } from '../lib/utils';
import { Minus, Plus, ShoppingBag, ArrowLeft, Shield, Truck, RotateCcw, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency } from '../contexts/CurrencyContext';
import { Reviews } from '../components/Reviews';
import ProductCard from '../components/ProductCard';
import toast from 'react-hot-toast';

interface ProductDetailsProps {
  onAddToCart: (productId: string, size: string, quantity: number) => void;
}

export default function ProductDetails({ onAddToCart }: ProductDetailsProps) {
  const { products } = useProducts();
  const { currency, rate } = useCurrency();
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useMemo(() => products.find((p) => p.id === id), [id, products]);
  
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const otherProducts = products.filter(p => p.id !== product.id);
    const sameCategory = otherProducts.filter(p => p.category === product.category);
    
    let pool = sameCategory.length >= 4 
      ? sameCategory 
      : [...sameCategory, ...otherProducts.filter(p => p.category !== product.category)];
      
    // Simple deterministic shuffle based on current product id
    return pool.sort((a, b) => {
      const hashA = a.id + product.id;
      const hashB = b.id + product.id;
      return hashA.localeCompare(hashB);
    }).slice(0, 4);
  }, [products, product]);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!product) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-serif mb-6">Product not found.</h2>
          <button onClick={() => navigate('/shop')} className="text-xs uppercase tracking-widest border-b border-brand-ink pb-2">
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    onAddToCart(product.id, selectedSize, quantity);
    setIsAdded(true);
    toast.success(`${product.name} added to selection`);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="pt-8 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
        <Link to="/" className="hover:text-brand-gold transition-colors">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-brand-gold transition-colors">Shop</Link>
        <span>/</span>
        <Link to={`/shop?category=${product.category}`} className="hover:text-brand-gold transition-colors">{product.category}</Link>
        <span>/</span>
        <span className="text-brand-ink font-bold">{product.name}</span>
      </div>

      <button 
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-xs uppercase tracking-widest mb-12 hover:text-brand-gold transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Go Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">
        {/* Images Section */}
        <div className="flex flex-col-reverse md:flex-row gap-6">
          {/* Thumbnails */}
          <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-visible">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={cn(
                  "w-20 aspect-[3/4] flex-shrink-0 border transition-all duration-300",
                  selectedImage === idx ? "border-brand-gold opacity-100" : "border-transparent opacity-50"
                )}
              >
                <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
          
          {/* Main Image */}
          <div className="flex-1 aspect-[3/4] bg-brand-muted overflow-hidden relative group">
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-contain cursor-zoom-in"
                referrerPolicy="no-referrer"
                onClick={() => setIsLightboxOpen(true)}
              />
            </AnimatePresence>
            <button
                onClick={() => setIsLightboxOpen(true)}
                className="absolute top-4 right-4 bg-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Maximize2 size={20} />
            </button>
          </div>
        </div>

        {/* Lightbox Modal */}
        <AnimatePresence>
            {isLightboxOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
                    onClick={() => setIsLightboxOpen(false)}
                >
                    <img 
                      src={product.images[selectedImage]} 
                      alt={product.name} 
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                        onClick={() => setIsLightboxOpen(false)}
                        className="absolute top-8 right-8 text-white text-4xl"
                    >
                        &times;
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Info Section */}
        <div className="flex flex-col">
          <div className="border-b border-brand-ink/10 pb-8 mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-bold mb-4">{product.category}</p>
            <h1 className="text-4xl md:text-5xl font-serif mb-2 leading-tight">{product.name}</h1>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-6 italic">SKU Code: {product.sku || product.id}</p>
            <div className="flex items-center gap-4">
              <p className="text-2xl md:text-3xl font-bold">{formatPrice(product.price, currency, rate)}</p>
              {product.regularPrice && product.regularPrice > product.price && (
                <p className="text-lg text-gray-400 line-through decoration-brand-gold/30">
                  {formatPrice(product.regularPrice, currency, rate)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-12 flex-1">
            {/* Fabric & Fit */}
            {(product.fabric || product.fitType) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                {product.fabric && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Fabric</h3>
                    <p className="text-xl md:text-2xl font-serif text-brand-ink">{product.fabric}</p>
                  </div>
                )}
                {product.fitType && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Fit Type</h3>
                    <p className="text-xl md:text-2xl font-serif text-brand-ink">{product.fitType}</p>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-4 pt-2">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Description</h3>
              <div className="text-brand-ink/70 leading-relaxed font-serif text-lg whitespace-pre-line">
                {product.description}
              </div>
            </div>

            {/* Sizes */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
                  Select Size
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                </span>
                <button 
                  onClick={() => navigate('/size-guide')}
                  className="text-[10px] uppercase tracking-widest underline opacity-50 hover:opacity-100 transition-opacity"
                >
                  Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-4">
                {product.sizes.map((size) => {
                  const isOutOfStock = (product.sizeStock?.[size] || 0) === 0;
                  return (
                    <button
                      key={size}
                      onClick={() => !isOutOfStock && setSelectedSize(size)}
                      disabled={isOutOfStock}
                      className={cn(
                        'w-12 h-12 flex items-center justify-center text-xs border transition-all duration-300 relative',
                        isOutOfStock ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-brand-ink',
                        selectedSize === size && !isOutOfStock
                          ? 'bg-brand-ink text-white border-brand-ink' 
                          : 'border-brand-ink/10'
                      )}
                    >
                      {size}
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[120%] h-[1px] bg-gray-400 rotate-45 transform"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold block mb-4">Quantity</span>
              <div className="flex items-center space-x-6 border border-brand-ink/10 w-fit px-4 py-2">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="hover:text-brand-gold">
                  <Minus size={16} />
                </button>
                <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="hover:text-brand-gold">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={handleAddToCart}
                disabled={isAdded}
                className={cn(
                  'flex-1 py-5 text-xs uppercase tracking-[0.2em] font-bold transition-all duration-500 relative overflow-hidden',
                  isAdded ? 'bg-green-600 text-white' : 'bg-brand-ink text-white hover:bg-brand-gold'
                )}
              >
                <span className={cn('flex items-center justify-center space-x-2 transition-transform duration-300', isAdded && 'translate-y-12')}>
                  <ShoppingBag size={16} />
                  <span>{isAdded ? 'Added to Bag' : 'Add to Bag'}</span>
                </span>
                {isAdded && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    SUCCESS
                  </span>
                )}
              </button>
              <button 
                onClick={() => { handleAddToCart(); if(selectedSize) navigate('/checkout'); }}
                className="flex-1 py-5 text-xs uppercase tracking-[0.2em] font-bold border border-brand-ink hover:bg-brand-ink hover:text-white transition-all duration-300"
              >
                Buy It Now
              </button>
            </div>

            {/* Delivery/Store Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-brand-ink/10">
              <div className="flex flex-col items-center text-center space-y-3">
                <Truck size={24} strokeWidth={1} className="text-brand-gold" />
                <span className="text-[9px] uppercase tracking-widest leading-normal">Complimentary <br /> Express Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                <RotateCcw size={24} strokeWidth={1} className="text-brand-gold" />
                <span className="text-[9px] uppercase tracking-widest leading-normal">30-Day Effortless <br /> Returns</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                <Shield size={24} strokeWidth={1} className="text-brand-gold" />
                <span className="text-[9px] uppercase tracking-widest leading-normal">Premium 24-Month <br /> Warranty</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-16 border-t border-brand-ink/10">
            <div className="flex items-center justify-center gap-4 mb-12">
              <div className="h-[1px] bg-brand-ink/20 flex-grow max-w-[50px]" />
              <h2 className="text-sm md:text-base font-bold text-brand-ink uppercase tracking-[0.2em] text-center">
                You May Also Like
              </h2>
              <div className="h-[1px] bg-brand-ink/20 flex-grow max-w-[50px]" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 gap-y-12">
              {relatedProducts.map(relatedProduct => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} onAddToCart={onAddToCart} />
              ))}
            </div>
          </div>
        )}

        {/* Customer Reviews Section */}
        <Reviews productId={product.id} />
      </div>
    </div>
  );
}
