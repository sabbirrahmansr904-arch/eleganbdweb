import React from 'react';
import { cn } from '../lib/utils';

/**
 * Single Product Card Loading Skeleton
 * Accurately mimics the dimensions, border radii, and visual layout of ProductCard.tsx
 */
export const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        "relative bg-white rounded-2xl border border-gray-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between h-full pointer-events-none select-none",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex flex-col flex-1">
        {/* Product Image Skeleton with subtle shimmer */}
        <div className="relative w-full aspect-[3/4.2] overflow-hidden bg-gradient-to-b from-gray-100 to-gray-50 flex items-center justify-center">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          
          {/* Subtle placeholder icon silhouette */}
          <div className="w-10 h-10 rounded-full bg-gray-200/50 flex items-center justify-center">
            <div className="w-5 h-5 rounded-sm bg-gray-300/40" />
          </div>

          {/* Top-right badge placeholder */}
          <div className="absolute top-2.5 right-2.5 h-4 w-12 rounded bg-gray-200/70" />
        </div>

        {/* Info Area */}
        <div className="p-2.5 sm:p-3 text-left flex flex-col justify-between flex-1">
          <div>
            {/* Category placeholder */}
            <div className="h-2.5 w-20 bg-gray-200/80 rounded mb-2 relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>

            {/* Product Title placeholders (2 lines) */}
            <div className="h-3.5 w-11/12 bg-gray-200/90 rounded mb-1.5 relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>
            <div className="h-3.5 w-3/5 bg-gray-200/70 rounded mb-2.5 relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>
          </div>

          {/* Pricing placeholder */}
          <div className="flex items-baseline gap-2 pt-1">
            <div className="h-4 sm:h-5 w-24 bg-gray-200/90 rounded relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>
            <div className="h-3 w-14 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Grid of Product Skeletons
 * Matches the responsive grid used across Home, ProductList, and Category pages
 */
export const ProductGridSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 8,
  className,
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4",
        className
      )}
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={`product-skeleton-${index}`} />
      ))}
    </div>
  );
};

/**
 * Horizontal Scroll Product Skeletons
 * Matches the carousel layout of New Arrivals & AllProductsImageScroll
 */
export const ProductScrollSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="flex gap-2 sm:gap-3 overflow-x-hidden pb-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`scroll-skeleton-${index}`}
          className="w-[calc(50%-4px)] sm:w-[calc(50%-6px)] md:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)] min-w-[155px] sm:min-w-[200px] flex-shrink-0"
        >
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
};

/**
 * Search Item Skeleton for SearchOverlay
 */
export const SearchItemSkeleton: React.FC = () => {
  return (
    <div className="flex gap-4 p-3 bg-white border border-gray-100 rounded-2xl animate-pulse">
      <div className="w-16 h-20 bg-gray-100 rounded-xl shrink-0" />
      <div className="flex flex-col justify-center flex-1 gap-2">
        <div className="w-14 h-2.5 bg-gray-200 rounded" />
        <div className="w-3/4 h-3.5 bg-gray-200 rounded" />
        <div className="w-20 h-4 bg-gray-100 rounded" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
