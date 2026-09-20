import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isPantProduct } from '../utils/productSizeHelper';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency: 'USD' | 'BDT' = 'BDT', rate: number = 117.5) {
  const safePrice = (typeof price === 'number' && !isNaN(price)) ? price : (Number(price) || 0);
  const displayPrice = currency === 'USD' ? safePrice / rate : safePrice;
  
  if (currency === 'BDT') {
    const isNegative = displayPrice < 0;
    const absValue = Math.abs(displayPrice);
    return `${isNegative ? '-' : ''}৳${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absValue)}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(displayPrice);
}

export interface SubtotalItem {
  product: {
    price: number;
    category?: string;
    name?: string;
    tags?: string[];
  };
  quantity: number;
}

export function calculateCartSubtotal(items: SubtotalItem[]): number {
  let shirtItems: { price: number; quantity: number }[] = [];
  let pantItems: { price: number; quantity: number }[] = [];
  let otherItemsPriceSum = 0;
  
  items.forEach(item => {
    const isShirt = 
      (item.product.category || '').toLowerCase().includes('shirt') || 
      (item.product.name || '').toLowerCase().includes('shirt');
      
    if (isShirt) {
      shirtItems.push({ price: item.product.price, quantity: item.quantity });
    } else if (isPantProduct(item.product)) {
      pantItems.push({ price: item.product.price, quantity: item.quantity });
    } else {
      otherItemsPriceSum += item.product.price * item.quantity;
    }
  });
  
  // Total quantity of shirts (3 for 1999 TK)
  let shirtsTotal = 0;
  const totalShirts = shirtItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalShirts >= 3) {
    const numCombos = Math.floor(totalShirts / 3);
    const comboPriceTotal = numCombos * 1999;
    let individualShirtPrices: number[] = [];
    shirtItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        individualShirtPrices.push(item.price);
      }
    });
    individualShirtPrices.sort((a, b) => b - a);
    let remainderPriceSum = 0;
    for (let i = numCombos * 3; i < individualShirtPrices.length; i++) {
      remainderPriceSum += individualShirtPrices[i];
    }
    shirtsTotal = comboPriceTotal + remainderPriceSum;
  } else {
    shirtsTotal = shirtItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // Total quantity of pants (3 for 2700 TK combo)
  let pantsTotal = 0;
  const totalPants = pantItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalPants >= 3) {
    const numCombos = Math.floor(totalPants / 3);
    const comboPriceTotal = numCombos * 2700;
    let individualPantPrices: number[] = [];
    pantItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        individualPantPrices.push(item.price);
      }
    });
    individualPantPrices.sort((a, b) => b - a);
    let remainderPriceSum = 0;
    for (let i = numCombos * 3; i < individualPantPrices.length; i++) {
      remainderPriceSum += individualPantPrices[i];
    }
    pantsTotal = comboPriceTotal + remainderPriceSum;
  } else {
    pantsTotal = pantItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  return otherItemsPriceSum + shirtsTotal + pantsTotal;
}

export function getCartPriceBreakdown(items: SubtotalItem[]) {
  const originalSubtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const actualSubtotal = calculateCartSubtotal(items);
  const savings = originalSubtotal - actualSubtotal;
  
  // Count total shirts
  const totalShirts = items.reduce((sum, item) => {
    const isShirt = 
      (item.product.category || '').toLowerCase().includes('shirt') || 
      (item.product.name || '').toLowerCase().includes('shirt');
    return isShirt ? sum + item.quantity : sum;
  }, 0);

  // Count total pants (Formal Pant / Pants)
  const totalPants = items.reduce((sum, item) => {
    return isPantProduct(item.product) ? sum + item.quantity : sum;
  }, 0);
  
  return {
    originalSubtotal,
    subtotal: actualSubtotal,
    savings,
    hasCombo: totalShirts >= 3,
    numCombos: Math.floor(totalShirts / 3),
    totalShirts,
    totalPants,
    hasPantCombo: totalPants >= 3
  };
}

/**
 * Calculates pant combo status (3 pcs for 2700 TK, delivery charge separate)
 */
export function checkIsFreeShipping(
  items: SubtotalItem[]
): {
  isFree: boolean;
  pantsCount: number;
  pantsNeeded: number;
  progress: number;
  label: string;
} {
  const pantsCount = items.reduce((sum, item) => {
    return isPantProduct(item.product) ? sum + item.quantity : sum;
  }, 0);

  const pantsNeeded = Math.max(0, 3 - pantsCount);
  const progress = Math.min(100, Math.round((pantsCount / 3) * 100));

  if (pantsCount >= 3) {
    return {
      isFree: false, // delivery charge is not free, separate
      pantsCount,
      pantsNeeded: 0,
      progress: 100,
      label: '🎉 ৩টি ফরমাল প্যান্টে কম্বো অফার কার্যকর: ২৭০০ টাকা (ডেলিভারি চার্জ প্রযোজ্য)'
    };
  }

  let label = '';
  if (pantsCount === 2) {
    label = '২টি প্যান্ট যুক্ত — আর মাত্র ১টি ফরমাল প্যান্টে কম্বো অফার (৩ পিস ২৭০০ টাকা)!';
  } else if (pantsCount === 1) {
    label = '১টি প্যান্ট যুক্ত — কম্বো অফারের জন্য আর মাত্র ২টি ফরমাল প্যান্ট প্রয়োজন (৩ পিস ২৭০০ টাকা)!';
  } else {
    label = 'যেকোনো ৩টি ফরমাল প্যান্টে বিশেষ কম্বো অফার: মাত্র ২৭০০ টাকা!';
  }

  return {
    isFree: false,
    pantsCount,
    pantsNeeded,
    progress,
    label
  };
}
