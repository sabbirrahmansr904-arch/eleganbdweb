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

  const isPant = Boolean(
    (product.category || '').toLowerCase().includes('pant') ||
    (product.category || '').toLowerCase().includes('trouser') ||
    (product.name || '').toLowerCase().includes('pant') ||
    (product.name || '').toLowerCase().includes('trouser')
  );
  const [isSquareImg, setIsSquareImg] = useState<boolean>(false);
  const isSquareDisplay = isPant || isSquareImg;

  return (
    <div
      className="group relative bg-white rounded-xl sm:rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between h-full"
    >
      <div>
        {/* Product Image Container - Square for Pants/Square Images, Portrait for Shirts */}
        <Link 
          to={`/product/${product.id}`} 
          className={cn(
            "block relative w-full overflow-hidden group/img transition-all",
            isSquareDisplay ? "aspect-square bg-white" : "aspect-[3/4.2] bg-[#f0f2f5]"
          )}
        >
          {product.images && product.images.length > 0 && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              onLoad={(e) => {
                const target = e.currentTarget;
                if (target.naturalWidth && target.naturalHeight) {
                  const ratio = target.naturalWidth / target.naturalHeight;
                  if (ratio >= 0.92 && ratio <= 1.08) {
                    setIsSquareImg(true);
                  }
                }
              }}
              className={cn(
                "w-full h-full transition-transform duration-500 ease-out group-hover/img:scale-105",
                isSquareDisplay ? "object-contain object-center" : "object-cover object-top",
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
          <div className="absolute inset-0 bg-black/15 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
            <button
              type="button"
              onClick={handleQuickView}
              className="pointer-events-auto w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg transform scale-75 group-hover/img:scale-100 transition-all duration-300 hover:bg-blue-600 hover:text-white cursor-pointer"
              title="Quick View"
            >
              <Eye size={18} className="stroke-[2.5]" />
            </button>
          </div>
          
          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-2.5 left-2.5 bg-red-600 text-white px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm">
              {discount}% OFF
            </div>
          )}

          {/* Wishlist Toggle Button */}
          <button 
            onClick={handleWishlistToggle} 
            className="absolute top-2.5 right-2.5 p-1.5 sm:p-2 bg-white/90 backdrop-blur-xs rounded-full hover:bg-white text-gray-500 hover:text-red-500 shadow-sm transition-colors cursor-pointer"
            title="Wishlist"
          >
            <Heart size={15} className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
          </button>
        </Link>

        {/* Info Area */}
        <div className="p-2.5 sm:p-3 pb-0 text-center">
          {/* Title */}
          <h3 className="text-[11px] sm:text-xs md:text-sm font-extrabold text-gray-900 line-clamp-2 uppercase tracking-tight hover:text-blue-600 transition-colors leading-snug min-h-[30px] sm:min-h-[36px]">
            <Link to={`/product/${product.id}`}>{product.name}</Link>
          </h3>

          {/* Pricing */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5 flex-wrap">
            <span className="text-xs sm:text-sm md:text-base font-black text-blue-700">
              {formatPrice(product.price, currency, rate)}
            </span>
            {product.regularPrice && product.regularPrice > product.price && (
              <span className="text-[10px] sm:text-xs text-gray-400 line-through font-medium">
                {formatPrice(product.regularPrice, currency, rate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: ADD & ORDER NOW */}
      <div className="p-2.5 sm:p-3 pt-2 flex flex-col gap-1.5 w-full">
        <button 
          onClick={handleQuickAdd}
          className="w-full bg-white text-gray-800 border border-gray-300 py-1.5 sm:py-2 px-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer whitespace-nowrap"
        >
          <ShoppingBag size={14} className="text-gray-600 shrink-0" />
          <span>ADD TO CART</span>
        </button>
        
        <button 
          onClick={handleQuickOrder}
          className="w-full bg-[#1b49c4] text-white py-1.5 sm:py-2 px-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center hover:bg-blue-800 transition-all shadow-sm cursor-pointer uppercase whitespace-nowrap"
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
