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

export interface SubtotalItem {
  product: {
    price: number;
    category?: string;
    name?: string;
  };
  quantity: number;
}

export function calculateCartSubtotal(items: SubtotalItem[]): number {
  let shirtItems: { price: number, quantity: number }[] = [];
  let otherItemsPriceSum = 0;
  
  items.forEach(item => {
    const isShirt = 
      (item.product.category || '').toLowerCase().includes('shirt') || 
      (item.product.name || '').toLowerCase().includes('shirt');
      
    if (isShirt) {
      shirtItems.push({ price: item.product.price, quantity: item.quantity });
    } else {
      otherItemsPriceSum += item.product.price * item.quantity;
    }
  });
  
  // Total quantity of shirts
  const totalShirts = shirtItems.reduce((sum, item) => sum + item.quantity, 0);
  
  if (totalShirts >= 3) {
    const numCombos = Math.floor(totalShirts / 3);
    const remainderShirts = totalShirts % 3;
    
    // Combo price is 1799 TK for every 3 pieces of shirts
    const comboPriceTotal = numCombos * 1799;
    
    // Convert shirt items to list of individual prices
    let individualShirtPrices: number[] = [];
    shirtItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        individualShirtPrices.push(item.price);
      }
    });
    
    // Sort prices descending so we apply the combo discount on the most expensive ones, 
    // leaving the cheapest shirts as the remainder charged at their individual prices.
    individualShirtPrices.sort((a, b) => b - a);
    
    // Sum the remainder items (the cheapest ones)
    let remainderPriceSum = 0;
    for (let i = numCombos * 3; i < individualShirtPrices.length; i++) {
      remainderPriceSum += individualShirtPrices[i];
    }
    
    return otherItemsPriceSum + comboPriceTotal + remainderPriceSum;
  } else {
    const shirtsPriceSum = shirtItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return otherItemsPriceSum + shirtsPriceSum;
  }
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
  
  return {
    originalSubtotal,
    subtotal: actualSubtotal,
    savings,
    hasCombo: totalShirts >= 3,
    numCombos: Math.floor(totalShirts / 3),
    totalShirts
  };
}
