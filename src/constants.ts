/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Order, Customer } from './types';

export const PRODUCTS: Product[] = [];

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
    wishlist: [],
    totalOrders: 5,
    totalSpent: 1250,
    lastOrderDate: '2026-04-15'
  },
  {
    id: 'CUST-2',
    name: 'Zubair Hossain',
    email: 'zubair@example.com',
    phone: '01812345679',
    wishlist: [],
    totalOrders: 2,
    totalSpent: 240,
    lastOrderDate: '2026-04-18'
  }
];

export const COLORS = {
  bg: '#1A1A1A',        // Deep black background
  ink: '#FBFBFB',       // Off-white/Beigeish text
  accent: '#FFFFFF',    // White accent
  muted: '#2A2A2A',     // Darker grey for backgrounds
  border: 'rgba(255, 255, 255, 0.1)'
};
