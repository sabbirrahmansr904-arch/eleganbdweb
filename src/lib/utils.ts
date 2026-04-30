import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency: 'USD' | 'BDT' = 'BDT', rate: number = 117.5) {
  // If baseline is BDT, price in USD should be divided by rate.
  // If baseline is USD, price in BDT should be multiplied by rate.
  // To satisfy the user (treating input as BDT), we change it to divide for USD.
  const displayPrice = currency === 'USD' ? price / rate : price;
  
  if (currency === 'BDT') {
    return `৳${new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(displayPrice)}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(displayPrice);
}
