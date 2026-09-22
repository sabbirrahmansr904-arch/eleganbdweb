/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye } from 'lucide-react';
import { Product } from '../types';
import { cn } from '../lib/utils';
import QuickViewModal from './QuickViewModal';

interface ProductCardProps {
  product: Product;
  badgeText?: string;
  showPantDiscountBadge?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  badgeText,
  showPantDiscountBadge = false,
  className
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [secondaryImgError, setSecondaryImgError] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  // Fallback SVG placeholder with brand title
  const fallbackSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520" fill="%23f8fafc"><rect width="400" height="520" fill="%23f1f5f9"/><text x="50%" y="48%" font-family="sans-serif" font-size="16" font-weight="900" fill="%2394a3b8" text-anchor="middle" dominant-baseline="middle">ELEGAN BD</text><text x="50%" y="54%" font-family="sans-serif" font-size="12" font-weight="600" fill="%23cbd5e1" text-anchor="middle" dominant-baseline="middle">PREMIUM COLLECTION</text></svg>';

  // Resolve primary and secondary images
  const rawImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(Boolean)
    : [(product as any).image].filter(Boolean);

  const primaryImage = (!imgError && rawImages[0]) ? rawImages[0] : fallbackSvg;
  const secondaryImage = (!secondaryImgError && rawImages[1]) ? rawImages[1] : primaryImage;

  // Pricing calculations
  const originalPrice = product.regularPrice || product.originalPrice || 0;
  const hasDiscount = originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : 0;

  // Pant check for aspect-fit optimization
  const isPant = (product.category || '').toLowerCase().includes('pant') ||
                 (product.category || '').toLowerCase().includes('trouser') ||
                 (product.name || '').toLowerCase().includes('pant');

  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if click wasn't on an explicit button
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    navigate(`/product/${product.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative bg-white rounded-2xl border border-gray-100 hover:border-gray-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer h-full will-change-transform",
          className
        )}
      >
        <div className="flex flex-col flex-1">
          {/* Image Container */}
          <div className={cn(
            "relative w-full overflow-hidden bg-[#F8FAFC] flex items-center justify-center",
            isPant ? "aspect-[3/4] sm:aspect-[3/4.2]" : "aspect-[3/4] sm:aspect-[3/4.2]"
          )}>
            {/* Primary Image */}
            <img
              src={primaryImage}
              alt={product.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className={cn(
                "w-full h-full object-cover object-center transition-all duration-500 will-change-transform",
                isHovered && rawImages.length > 1 ? "opacity-0 scale-105" : "opacity-100 group-hover:scale-105"
              )}
            />

            {/* Secondary Image for smooth hover flip */}
            {rawImages.length > 1 && (
              <img
                src={secondaryImage}
                alt={`${product.name} alternate view`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setSecondaryImgError(true)}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover object-center transition-all duration-500",
                  isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100"
                )}
              />
            )}

            {/* Badges Overlay */}
            {isOutOfStock && (
              <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
                <span className="bg-black/90 text-white text-[10px] sm:text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider shadow-sm backdrop-blur-xs">
                  Stock Out
                </span>
              </div>
            )}

            {/* Floating Action Buttons on Hover */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 transform translate-y-2 group-hover:translate-y-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsQuickViewOpen(true);
                }}
                className="w-8 h-8 rounded-full bg-white/95 hover:bg-black hover:text-white text-gray-800 flex items-center justify-center shadow-md transition-all cursor-pointer backdrop-blur-xs"
                title="Quick View"
                aria-label="Quick View"
              >
                <Eye size={15} />
              </button>
            </div>
          </div>

          {/* Product Information */}
          <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 text-left">
            <div>
              {/* Category & Color / SKU */}
              <div className="flex items-center justify-between text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                <span>{product.category || 'Collection'}</span>
                {product.color && (
                  <span className="text-gray-500 font-semibold lowercase tracking-normal">
                    {product.color}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors tracking-tight">
                {product.name}
              </h3>
            </div>

            {/* Price Row */}
            <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-1.5">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-sm sm:text-base font-black text-gray-950 tracking-tight">
                  ৳{product.price.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-[11px] sm:text-xs text-gray-400 line-through font-semibold truncate">
                    ৳{originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {isQuickViewOpen && (
        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
