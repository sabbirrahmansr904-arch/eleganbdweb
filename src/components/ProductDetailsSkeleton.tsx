import React from 'react';
import ProductGridSkeleton from './ProductGridSkeleton';

export const ProductDetailsSkeleton: React.FC = () => {
  return (
    <div className="pt-4 md:pt-8 pb-24 bg-white min-h-screen select-none animate-pulse">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-3 w-12 bg-slate-100 rounded-md" />
          <span className="text-slate-200">/</span>
          <div className="h-3 w-20 bg-slate-100 rounded-md" />
          <span className="text-slate-200">/</span>
          <div className="h-3 w-36 bg-slate-200/80 rounded-md" />
        </div>

        {/* Main Product Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Image Gallery Skeleton */}
          <div className="lg:col-span-7 flex flex-col md:flex-row gap-4">
            {/* Thumbnails list */}
            <div className="order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto no-scrollbar">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="w-18 md:w-20 h-22 md:h-24 rounded-xl bg-slate-100/90 border border-slate-200/60 shrink-0"
                />
              ))}
            </div>

            {/* Main Featured Image Skeleton */}
            <div className="order-1 md:order-2 flex-1 relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 aspect-[3/3.8] flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-200/50 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-slate-300/40" />
              </div>
              <div className="absolute top-4 left-4 w-24 h-6 rounded-md bg-slate-200/70" />
            </div>
          </div>

          {/* Right Column: Details & Actions Skeleton */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Header info */}
            <div className="space-y-3">
              <div className="h-3 w-28 bg-slate-200/60 rounded-md" />
              <div className="h-8 w-4/5 bg-slate-200 rounded-lg" />
              <div className="h-8 w-2/3 bg-slate-200/70 rounded-lg" />
              
              <div className="flex items-baseline gap-3 pt-2">
                <div className="h-7 w-32 bg-slate-200 rounded-lg" />
                <div className="h-5 w-20 bg-slate-100 rounded-md" />
              </div>
            </div>

            {/* Fabric & Product highlight pill skeleton */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="h-3.5 w-1/3 bg-slate-200 rounded-md" />
              <div className="h-3 w-full bg-slate-200/60 rounded-md" />
              <div className="h-3 w-4/5 bg-slate-200/60 rounded-md" />
            </div>

            {/* Size Selector Skeleton */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-slate-200 rounded-md" />
                <div className="h-3 w-16 bg-slate-100 rounded-md" />
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {[28, 30, 32, 34, 36].map((sz) => (
                  <div
                    key={sz}
                    className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/60"
                  />
                ))}
              </div>
            </div>

            {/* Delivery charge tabs skeleton */}
            <div className="grid grid-cols-3 gap-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-50 border border-slate-100" />
              ))}
            </div>

            {/* Action Buttons Skeleton */}
            <div className="space-y-3 pt-2">
              <div className="h-14 w-full bg-slate-900/10 rounded-2xl" />
              <div className="h-14 w-full bg-slate-200/80 rounded-2xl" />
            </div>

            {/* Trust Badges Skeleton */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-50/70 border border-slate-100" />
              ))}
            </div>

          </div>
        </div>

        {/* Bottom Related Items Skeleton */}
        <div className="mt-20 pt-10 border-t border-slate-100">
          <div className="h-6 w-48 bg-slate-200 rounded-md mb-6" />
          <ProductGridSkeleton count={4} />
        </div>

      </div>
    </div>
  );
};

export default ProductDetailsSkeleton;
