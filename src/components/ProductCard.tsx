/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { ShoppingBag, ShoppingCart, Star, Zap, Heart, Eye } from 'lucide-react';
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
  badgeText?: string;
}

const ProductCard = React.memo(({ product, onAddToCart, loading = "eager", badgeText }: ProductCardProps) => {
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
    <div
      className="group relative bg-white rounded-2xl border border-gray-100/90 shadow-2xs hover:shadow-md transition-all duration-300 p-2 sm:p-2.5 flex flex-col justify-between h-full"
    >
      <div>
        {/* Product Image Container */}
        <Link to={`/product/${product.id}`} className="block relative aspect-square w-full rounded-xl overflow-hidden bg-[#f8f9fa] group/img">
          {product.images && product.images.length > 0 && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className={cn(
                "w-full h-full transition-transform duration-500 ease-out group-hover/img:scale-105 object-cover",
                product.stock === 0 && "grayscale"
              )}
              referrerPolicy="no-referrer"
              loading={loading}
              // @ts-ignore
              fetchpriority="high"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
              <span className="text-[10px] uppercase tracking-widest font-bold">No Image</span>
            </div>
          )}

          {/* Quick View Hover Eye Icon */}
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
            <button
              type="button"
              onClick={handleQuickView}
              className="pointer-events-auto w-9 h-9 rounded-full bg-white/95 text-blue-600 flex items-center justify-center shadow-lg transform scale-75 group-hover/img:scale-100 transition-all duration-300 hover:bg-blue-600 hover:text-white cursor-pointer"
              title="Quick View"
            >
              <Eye size={18} className="stroke-[2.5]" />
            </button>
          </div>
          
          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs">
              {discount}% OFF
            </div>
          )}

          {/* Wishlist Toggle Button */}
          <button 
            onClick={handleWishlistToggle} 
            className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-xs rounded-full hover:bg-white text-gray-400 hover:text-red-500 shadow-2xs transition-colors cursor-pointer"
            title="Wishlist"
          >
            <Heart size={14} className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
          </button>


        </Link>

        {/* Title */}
        <h3 className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-2 mt-2 px-0.5 uppercase tracking-tight hover:text-blue-600 transition-colors leading-snug min-h-[32px]">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>

        {/* Pricing */}
        <div className="flex items-center gap-1.5 mt-1.5 px-0.5 flex-wrap">
          <span className="text-xs sm:text-sm font-extrabold text-gray-950">
            {formatPrice(product.price, currency, rate)}
          </span>
          {product.regularPrice && product.regularPrice > product.price && (
            <span className="text-[10px] sm:text-xs text-gray-400 line-through font-medium">
              {formatPrice(product.regularPrice, currency, rate)}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons: ADD & ORDER NOW */}
      <div className="grid grid-cols-2 gap-1.5 mt-3 pt-1">
        <button 
          onClick={handleQuickAdd}
          className="w-full bg-white text-gray-700 border border-gray-200 py-1.5 px-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
        >
          <ShoppingBag size={12} className="text-gray-500 shrink-0" />
          <span>ADD</span>
        </button>
        
        <button 
          onClick={handleQuickOrder}
          className="w-full bg-[#1b49c4] text-white py-1.5 px-1 rounded-lg text-[10px] sm:text-xs font-extrabold flex items-center justify-center hover:bg-blue-700 transition-all shadow-xs cursor-pointer uppercase"
        >
          <span>ORDER NOW</span>
        </button>
      </div>

      <QuickViewModal 
        product={product} 
        isOpen={isQuickViewOpen} 
        onClose={() => setIsQuickViewOpen(false)} 
      />
    </div>
  );
});

export default ProductCard;
