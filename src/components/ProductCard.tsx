import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatPrice } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  loading?: 'eager' | 'lazy';
  badgeText?: string;
  showPantDiscountBadge?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  loading = 'eager',
  badgeText,
  showPantDiscountBadge = true
}) => {
  const { currency, rate } = useCurrency();
  const discount = product.discount || 0;
  const [imageError, setImageError] = useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [product.id, product.images?.[0], product.image]);

  const isPant = Boolean(
    (product.category || '').toLowerCase().includes('pant') ||
    (product.category || '').toLowerCase().includes('trouser') ||
    (product.name || '').toLowerCase().includes('pant') ||
    (product.name || '').toLowerCase().includes('trouser')
  );

  const categoryLabel = useMemo(() => {
    if (product.category && product.category.trim()) {
      return product.category.toUpperCase();
    }
    return isPant ? 'FORMAL PANT' : 'FORMAL SHIRT';
  }, [product.category, isPant]);

  const formattedPrice = useMemo(() => {
    if (currency === 'BDT') {
      return `${new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(product.price)}৳`;
    }
    return formatPrice(product.price, currency, rate);
  }, [product.price, currency, rate]);

  const formattedRegularPrice = useMemo(() => {
    if (!product.regularPrice || product.regularPrice <= product.price) {
      return null;
    }
    if (currency === 'BDT') {
      return `${new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(product.regularPrice)}৳`;
    }
    return formatPrice(product.regularPrice, currency, rate);
  }, [product.regularPrice, product.price, currency, rate]);

  const rawImage = product.images && product.images.length > 0 && product.images[0]
    ? product.images[0]
    : product.image;

  const fallbackImage = '/logo.png';

  const secondaryImage = (product.images && product.images.length > 1 && product.images[1])
    ? product.images[1]
    : fallbackImage;

  const displayImage = imageError ? secondaryImage : (rawImage || fallbackImage);

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-lg hover:-translate-y-1.5 hover:border-gray-200 transition-all duration-300 ease-out overflow-hidden flex flex-col justify-between h-full will-change-transform">
      <div className="flex flex-col flex-1">
        {/* Product Image */}
        <div className="relative w-full aspect-[3/4.2] overflow-hidden bg-[#f4f5f7]">
          <Link to={`/product/${product.id}`} className="block w-full h-full">
            {displayImage ? (
              <img
                src={displayImage}
                alt={product.name}
                className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
                referrerPolicy="no-referrer"
                loading={loading}
                decoding="async"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <span className="text-[10px] uppercase tracking-widest font-bold">No Image</span>
              </div>
            )}
          </Link>

          {/* 25% OFF Red Box for Pants in ALL COLLECTIONS */}
          {showPantDiscountBadge && isPant && (
            <div className="absolute top-2.5 left-2.5 bg-red-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm z-10">
              25% OFF
            </div>
          )}

          {/* Badge */}
          {badgeText && (
            <div className="absolute top-2.5 right-2.5 bg-black text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-xs">
              {badgeText}
            </div>
          )}

          {!badgeText && discount > 0 && (
            <div className="absolute top-2.5 right-2.5 bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-xs">
              -{discount}%
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="p-2.5 sm:p-3 text-left flex flex-col justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">
              {categoryLabel}
            </span>
            <Link
              to={`/product/${product.id}`}
              className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-red-600 transition-colors mb-1.5 block"
            >
              {product.name}
            </Link>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-sm sm:text-base font-extrabold text-gray-900">
              {formattedPrice}
            </span>
            {formattedRegularPrice && (
              <span className="text-xs text-gray-400 line-through font-normal">
                {formattedRegularPrice}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
