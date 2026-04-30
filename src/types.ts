/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  sku?: string;
  name: string;
  price: number;
  cost?: number;
  description: string;
  category: string;
  color?: string;
  material?: string;
  fabric?: string;
  fitType?: string;
  images: string[];
  sizes: string[];
  stock: number;
  sizeStock: Record<string, number>;
  newArrival?: boolean;
  featured?: boolean;
  discount?: number;
  regularPrice?: number;
  rating?: number;
  isTopRated?: boolean;
}

export interface CartItem extends Product {
  selectedSize: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  items: CartItem[];
  deliveryCharge: number;
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod: 'cod' | 'bkash' | 'nagad' | 'card';
  transactionId?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  link: string;
  active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiryDate: string;
  active: boolean;
}

export interface CheckoutFormData {
  fullName: string;
  email: string;
  address: string;
  city: string;
  phone: string;
  paymentMethod: 'cod' | 'card' | 'bkash' | 'nagad';
  transactionId?: string;
}

export interface StockTransaction {
  id: string;
  type: 'in' | 'out';
  sku: string;
  productName: string;
  quantities: Record<string, number>;
  totalQuantity: number;
  timestamp: number;
  category: string;
}
