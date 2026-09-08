import React from 'react';
import ProductCardSkeleton from './ProductCardSkeleton';
import { cn } from '../lib/utils';

interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
  cardClassName?: string;
}

export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  count = 8,
  className = "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4",
  cardClassName
}) => {
  return (
    <div className={cn("w-full", className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeleton key={`skeleton-${idx}`} className={cardClassName} />
      ))}
    </div>
  );
};

export default ProductGridSkeleton;
