/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { ShoppingBag, ShoppingCart, Star, Zap, Heart } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import QuickViewModal from './QuickViewModal';

import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, size: string, quantity: number) => void;
  loading?: "lazy" | "eager";
}

const ProductCard = React.memo(({ product, onAddToCart, loading = "lazy" }: ProductCardProps) => {
  const { currency, rate } = useCurrency();
  const { currentUser } = useAuth();
  const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const checkWishlist = async () => {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsWishlisted(userData.wishlist?.includes(product.id) || false);
        }
      };
      checkWishlist();
    }
  }, [currentUser, product.id]);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
        toast.error('Please login to add to wishlist');
        return;
    }
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      if (isWishlisted) {
        await setDoc(userRef, { wishlist: arrayRemove(product.id) }, { merge: true });
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        await setDoc(userRef, { wishlist: arrayUnion(product.id) }, { merge: true });
        setIsWishlisted(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast.error('Failed to update wishlist');
    }
  };

  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, product.sizes[0] || 'M', 1);
    toast.success(`${product.name} added to bag`);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleQuickOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, product.sizes[0] || 'M', 1);
    navigate('/checkout');
  };

  const discount = product.discount || 0;
  const rating = product.rating || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -50px 0px" }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative"
    >
      <Link to={`/product/${product.id}`} className="block overflow-hidden relative aspect-[3/4] bg-gray-50 border border-gray-100 rounded-lg">
        {product.images && product.images.length > 0 && product.images[0] ? (
          <motion.img
            src={product.images[0]}
            alt={product.name}
            className={cn(
              "w-full h-full bg-transparent transition-all duration-350",
              "object-contain bg-white p-2",
              product.stock === 0 && "grayscale"
            )}
            referrerPolicy="no-referrer"
            loading={loading}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
            <span className="text-xs uppercase tracking-widest font-bold">No Image</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          {discount > 0 && (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-red-500 bg-white/90 flex flex-col items-center justify-center text-red-500 shadow-sm animate-pulse">
              <span className="text-[9px] md:text-[11px] font-bold leading-none">{discount}%</span>
              <span className="text-[7px] md:text-[9px] font-bold leading-none font-sans">ছাড়</span>
            </div>
          )}
          <button onClick={handleWishlistToggle} className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors text-gray-400 hover:text-red-500">
            <Heart size={20} className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
          </button>
        </div>
        
        <div className="absolute top-2 left-2">
          <span className="bg-red-500 text-white px-2 py-0.5 text-[7px] md:text-[8px] uppercase tracking-widest font-bold">
            Sale
          </span>
        </div>
      </Link>

      <div className="mt-4 flex flex-col items-center text-center">
        <h3 className="text-xs md:text-sm lg:text-base uppercase tracking-wider font-extrabold text-black mb-1 group-hover:text-brand-gold transition-colors line-clamp-1 px-2">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        {rating > 0 && (
          <div className="flex items-center gap-1 mb-1 scale-75 origin-center">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10} 
                  className={cn(
                    "transition-colors",
                    i < Math.floor(rating) ? "text-amber-400 fill-amber-400" : "text-black/10 fill-black/10"
                  )} 
                />
              ))}
            </div>
            <span className="text-[9px] font-bold text-gray-400">{rating}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
           <p className="text-base md:text-lg lg:text-xl font-black text-black">
             {formatPrice(product.price, currency, rate)}
           </p>
           {product.regularPrice && product.regularPrice > product.price && (
             <p className="text-xs md:text-sm text-gray-400 line-through">
               {formatPrice(product.regularPrice, currency, rate)}
             </p>
           )}
        </div>

        {/* Beautiful, non-blocking high-converting checkout buttons underneath pricing details */}
        <div className="w-full mt-3 px-1 flex flex-col gap-2">
          <button 
            onClick={handleQuickAdd}
            className="w-full bg-white text-[#1b49c4] border border-[#1b49c4] py-2 px-3 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-blue-50/50 transition-colors cursor-pointer"
          >
            <ShoppingCart size={15} className="text-[#1b49c4]" />
            <span>Add to cart</span>
          </button>
          
          <button 
            onClick={handleQuickOrder}
            className="w-full bg-[#1b49c4] text-white py-2.5 px-3 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border border-[#1b49c4] hover:bg-[#153899] transition-colors cursor-pointer"
          >
            <span>Order Now</span>
          </button>
        </div>
      </div>
      <QuickViewModal 
        product={product} 
        isOpen={isQuickViewOpen} 
        onClose={() => setIsQuickViewOpen(false)} 
      />
    </motion.div>
  );
});

export default ProductCard;
