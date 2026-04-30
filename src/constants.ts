/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Order, Customer } from './types';

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Executive White Formal Shirt',
    price: 1850,
    description: 'A crisp, premium cotton white formal shirt with a double cuff and spread collar. Essential for every modern executive.',
    category: 'Formal Shirt',
    color: 'White',
    material: 'Cotton',
    images: [
      'https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?q=80&w=1000'
    ],
    sizes: ['38', '40', '42', '44'],
    stock: 45,
    sizeStock: {'38': 10, '40': 15, '42': 10, '44': 10},
    featured: true,
    newArrival: true,
    regularPrice: 2050
  },
  {
    id: '2',
    name: 'Sky Blue Royal Oxford Shirt',
    price: 2100,
    description: 'Expertly woven Royal Oxford fabric in a classic sky blue. Features a refined texture and superior breathability.',
    category: 'Formal Shirt',
    color: 'Sky Blue',
    material: 'Oxford Cotton',
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=1000'
    ],
    sizes: ['38', '40', '42', '44'],
    stock: 25,
    sizeStock: {'38': 5, '40': 10, '42': 5, '44': 5},
    featured: true
  },
  {
    id: '3',
    name: 'Midnight Black Slim Fit Shirt',
    price: 1950,
    description: 'A sleek, versatile black formal shirt tailored for a sharp silhouette. Perfect for evening events.',
    category: 'Formal Shirt',
    color: 'Black',
    material: 'Cotton Blend',
    images: [
      'https://images.unsplash.com/photo-1620012253295-c05cc3e65df4?q=80&w=1000'
    ],
    sizes: ['38', '40', '42', '44'],
    stock: 30,
    sizeStock: {'38': 10, '40': 10, '42': 5, '44': 5},
    newArrival: true
  },
  {
    id: '4',
    name: 'Essential Oversized T-Shirt',
    price: 950,
    description: 'A premium heavy-weight cotton t-shirt with a relaxed, oversized fit. Perfect for high-street minimalist style.',
    category: 'T-shirt',
    color: 'Black',
    material: 'Cotton',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000'
    ],
    sizes: ['M', 'L', 'XL'],
    stock: 90,
    sizeStock: {'M': 30, 'L': 30, 'XL': 30},
    featured: true,
    newArrival: true
  },
  {
    id: '5',
    name: 'Vintage Wash Graphic Tee',
    price: 1150,
    description: 'Hand-finished vintage wash t-shirt featuring artistic screen-printed graphics. Made from 100% organic cotton.',
    category: 'T-shirt',
    color: 'Grey',
    material: 'Organic Cotton',
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=1000'
    ],
    sizes: ['M', 'L', 'XL'],
    stock: 60,
    sizeStock: {'M': 20, 'L': 20, 'XL': 20},
    featured: true
  },
  {
    id: '6',
    name: 'Classic Black Formal Pant',
    price: 1450,
    description: 'Perfectly tailored black formal pants made from premium gabardine fabric. A wardrobe staple for professional looks.',
    category: 'Formal Pant',
    color: 'Black',
    material: 'Gabardine',
    images: ['https://images.unsplash.com/photo-1624371414361-e6e0efc8c030?q=80&w=1000'],
    sizes: ['30', '32', '34', '36'],
    stock: 50,
    sizeStock: {'30': 15, '32': 15, '34': 10, '36': 10},
    featured: true,
    newArrival: true
  },
  {
    id: '7',
    name: 'Navy Blue Cuban Collar Shirt',
    price: 1250,
    description: 'Relaxed fit Cuban collar shirt with a smooth finish. Ideal for casual summer days and evening hangouts.',
    category: 'Cuban Shirt',
    color: 'Navy Blue',
    material: 'Viscose',
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1000'],
    sizes: ['M', 'L', 'XL'],
    stock: 40,
    sizeStock: {'M': 15, 'L': 15, 'XL': 10},
    featured: true
  },
  {
    id: '8',
    name: 'Premium Silk Blend Shirt',
    price: 2850,
    description: 'Luxury silk-cotton blend shirt with a subtle sheen. Designed for premium comfort and an elegant look.',
    category: 'Premium Shirt',
    color: 'Champagne',
    material: 'Silk Blend',
    images: ['https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=1000'],
    sizes: ['38', '40', '42'],
    stock: 20,
    sizeStock: {'38': 5, '40': 10, '42': 5},
    featured: true,
    newArrival: true
  },
  {
    id: '9',
    name: 'Ash Grey Chino Pant',
    price: 1350,
    description: 'Versatile ash grey chinos with a slim fit profile. Combines comfort with a sharp look.',
    category: 'Formal Pant',
    color: 'Grey',
    material: 'Twill Cotton',
    images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1000'],
    sizes: ['30', '32', '34', '36'],
    stock: 35,
    sizeStock: {'30': 10, '32': 10, '34': 10, '36': 5},
    featured: false
  },
  {
    id: '10',
    name: 'Summer Breeze Linen Shirt',
    price: 1650,
    description: 'Ultra-breathable linen shirt in a pastel tone. Perfect for the tropical climate.',
    category: 'Cuban Shirt',
    color: 'Mint',
    material: 'Linen',
    images: ['https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?q=80&w=1000'],
    sizes: ['M', 'L', 'XL'],
    stock: 30,
    sizeStock: {'M': 10, 'L': 15, 'XL': 5},
    featured: false
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-1001',
    customerId: 'CUST-1',
    customerName: 'Aria Rahman',
    email: 'aria@example.com',
    phone: '01712345678',
    address: 'Gulshan 2, Dhaka',
    city: 'Dhaka',
    total: 325.00,
    deliveryCharge: 60,
    status: 'Delivered',
    paymentMethod: 'cod',
    createdAt: '2026-04-15T10:30:00Z',
    items: []
  },
  {
    id: 'ORD-1002',
    customerId: 'CUST-2',
    customerName: 'Zubair Hossain',
    email: 'zubair@example.com',
    phone: '01812345679',
    address: 'Banani Road 11',
    city: 'Dhaka',
    total: 120.00,
    deliveryCharge: 60,
    status: 'Processing',
    paymentMethod: 'bkash',
    createdAt: '2026-04-18T14:20:00Z',
    items: []
  },
  {
    id: 'ORD-1003',
    customerId: 'CUST-3',
    customerName: 'Meghla Khan',
    email: 'meghla@example.com',
    phone: '01912345680',
    address: 'Dhanmondi 27',
    city: 'Dhaka',
    total: 450.00,
    deliveryCharge: 60,
    status: 'Pending',
    paymentMethod: 'nagad',
    createdAt: '2026-04-19T08:15:00Z',
    items: []
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-1',
    name: 'Aria Rahman',
    email: 'aria@example.com',
    phone: '01712345678',
    totalOrders: 5,
    totalSpent: 1250,
    lastOrderDate: '2026-04-15'
  },
  {
    id: 'CUST-2',
    name: 'Zubair Hossain',
    email: 'zubair@example.com',
    phone: '01812345679',
    totalOrders: 2,
    totalSpent: 240,
    lastOrderDate: '2026-04-18'
  }
];

export const COLORS = {
  bg: '#FBFBFB',        // Off-white/Beigeish
  ink: '#1A1A1A',       // Deep black for text
  accent: '#D4AF37',    // Gold accent
  muted: '#F5F2ED',     // Soft beige for backgrounds
  border: 'rgba(26, 26, 26, 0.1)'
};
