import React from 'react';
import { cn } from '../lib/utils';

interface ProductCardSkeletonProps {
  className?: string;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "relative bg-white rounded-2xl border border-gray-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col justify-between h-full animate-pulse select-none",
        className
      )}
    >
      <div className="flex flex-col flex-1">
        {/* Product Image Skeleton with subtle shimmer */}
        <div className="relative w-full aspect-[3/4.2] overflow-hidden bg-slate-100 flex items-center justify-center">
          {/* Subtle icon/placeholder graphic */}
          <div className="w-10 h-10 rounded-2xl bg-slate-200/50 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-slate-300/40" />
          </div>

          {/* Top-right badge placeholder */}
          <div className="absolute top-2.5 right-2.5 w-12 h-4 rounded-md bg-slate-200/60" />

          {/* Subtle diagonal shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        </div>

        {/* Content Details Skeleton */}
        <div className="p-2.5 sm:p-3 text-left flex flex-col justify-between flex-1 gap-2.5">
          <div className="space-y-2">
            {/* Category tag skeleton */}
            <div className="h-2.5 w-20 bg-slate-200/70 rounded-md" />

            {/* Title skeletons (2 lines) */}
            <div className="space-y-1.5 pt-0.5">
              <div className="h-3.5 w-11/12 bg-slate-200/80 rounded-md" />
              <div className="h-3.5 w-3/5 bg-slate-200/50 rounded-md" />
            </div>
          </div>

          {/* Price skeleton */}
          <div className="flex items-baseline gap-2 pt-1">
            <div className="h-5 w-20 bg-slate-200/90 rounded-md" />
            <div className="h-3.5 w-12 bg-slate-100 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
