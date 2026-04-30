/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItem, CheckoutFormData, Order } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { useOrders } from '../contexts/OrderContext';
import { useProducts } from '../contexts/ProductContext';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CheckoutProps {
  items: CartItem[];
  onClearCart: () => void;
}

export default function Checkout({ items, onClearCart }: CheckoutProps) {
  const { currency, rate } = useCurrency();
  const navigate = useNavigate();
  const { addOrder } = useOrders();
  const { products, updateProduct } = useProducts();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: '',
    email: '',
    address: '',
    city: '',
    phone: '',
    paymentMethod: 'cod',
    transactionId: ''
  });

  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === 'ELEGAN10') {
      setDiscount(10);
      setCouponError('');
    } else if (couponCode.toUpperCase() === 'WELCOME20') {
      setDiscount(20);
      setCouponError('');
    } else {
      setDiscount(0);
      setCouponError('Invalid or expired coupon code');
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isInsideDhaka = formData.city === 'Dhaka';
                        
  const shipping = isInsideDhaka ? 70 : 130;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      const newOrder: Order = {
        id: `ORD-${Math.floor(Math.random() * 9000) + 1000}`,
        customerId: `CUST-${Math.floor(Math.random() * 1000)}`,
        customerName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        items: [...items],
        deliveryCharge: shipping,
        total: total,
        status: 'Pending',
        paymentMethod: formData.paymentMethod,
        transactionId: formData.transactionId,
        createdAt: new Date().toISOString()
      };
      
      addOrder(newOrder);
      
      // Update inventory
      items.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const updatedSizeStock = { ...product.sizeStock };
          updatedSizeStock[item.selectedSize] = Math.max(0, (updatedSizeStock[item.selectedSize] || 0) - item.quantity);
          
          updateProduct({
            ...product,
            sizeStock: updatedSizeStock,
            stock: Object.values(updatedSizeStock).reduce((sum: number, val: number) => sum + val, 0)
          });
        }
      });

      setIsProcessing(false);
      setIsComplete(true);
      onClearCart();
    }, 2500);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 px-6 text-center">
        <motion.div
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           transition={{ type: "spring", damping: 10 }}
        >
          <CheckCircle2 size={80} className="text-brand-gold mb-8 mx-auto" strokeWidth={1} />
        </motion.div>
        <h1 className="text-5xl font-serif mb-6">Order Confirmed.</h1>
        <p className="text-brand-ink/50 text-base font-serif italic mb-12 max-w-md mx-auto">
          Thank you for choosing Elegan BD. Your order has been placed and will be arriving at your doorstep soon.
        </p>
        <button 
          onClick={() => navigate('/shop')} 
          className="bg-brand-ink text-white px-12 py-5 text-xs uppercase tracking-[0.2em] font-bold hover:bg-brand-gold transition-all duration-300"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
        {/* Checkout Form */}
        <div>
          <button 
            onClick={() => navigate('/cart')}
            className="flex items-center space-x-2 text-[10px] uppercase tracking-widest mb-12 hover:text-brand-gold transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Cart</span>
          </button>
          
          <h1 className="text-4xl font-serif mb-12">Shipping Details</h1>
          
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Full Name</label>
                <input
                  required
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full border-b border-brand-ink/20 py-3 outline-none focus:border-brand-gold transition-colors font-serif text-lg"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Email Address</label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border-b border-brand-ink/20 py-3 outline-none focus:border-brand-gold transition-colors font-serif text-lg"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Shipping Address</label>
              <input
                required
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full border-b border-brand-ink/20 py-3 outline-none focus:border-brand-gold transition-colors font-serif text-lg"
                placeholder="123 Elegance St."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Location / City</label>
                <select
                  required
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full border-b border-brand-ink/20 py-3 outline-none focus:border-brand-gold transition-colors font-serif text-lg bg-transparent"
                >
                  <option value="" disabled>Select Location</option>
                  <option value="Dhaka">Inside Dhaka (70 TK)</option>
                  <option value="Outside Dhaka">Outside Dhaka (130 TK)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Phone Number</label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border-b border-brand-ink/20 py-3 outline-none focus:border-brand-gold transition-colors font-serif text-lg"
                  placeholder="016XXXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 block mb-4">Payment Method</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <label className={cn(
                  "flex items-center space-x-3 cursor-pointer p-4 border transition-all",
                  formData.paymentMethod === 'cod' ? "border-brand-gold bg-brand-gold/5" : "border-gray-100 hover:border-gray-200"
                )}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="cod" 
                    checked={formData.paymentMethod === 'cod'} 
                    onChange={handleInputChange}
                    className="accent-brand-gold"
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest font-bold">Cash on Delivery</span>
                    <span className="text-[8px] text-gray-400">Pay when you receive</span>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center space-x-3 cursor-pointer p-4 border transition-all",
                  formData.paymentMethod === 'bkash' ? "border-[#E3106E] bg-[#E3106E]/5" : "border-gray-100 hover:border-gray-200"
                )}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="bkash" 
                    checked={formData.paymentMethod === 'bkash'} 
                    onChange={handleInputChange}
                    className="accent-[#E3106E]"
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest font-bold">bKash</span>
                    <span className="text-[8px] text-gray-400">Manual Payment</span>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center space-x-3 cursor-pointer p-4 border transition-all",
                  formData.paymentMethod === 'nagad' ? "border-[#F49124] bg-[#F49124]/5" : "border-gray-100 hover:border-gray-200"
                )}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="nagad" 
                    checked={formData.paymentMethod === 'nagad'} 
                    onChange={handleInputChange}
                    className="accent-[#F49124]"
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest font-bold">Nagad</span>
                    <span className="text-[8px] text-gray-400">Manual Payment</span>
                  </div>
                </label>
              </div>

              {/* Payment Instructions */}
              <AnimatePresence>
                {(formData.paymentMethod === 'bkash' || formData.paymentMethod === 'nagad') && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-8 bg-white border border-gray-200 shadow-xl rounded-xl space-y-6"
                  >
                    <p className="text-[10px] uppercase tracking-widest font-bold text-brand-gold">Payment Instructions:</p>
                    <div className="text-xs space-y-4 text-brand-ink leading-relaxed font-serif italic">
                      <p>১. নিচের নাম্বারে <span className="font-bold underline">{formData.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} Personal</span> এ <span className="font-bold">Send Money</span> করুন।</p>
                      <p>২. নাম্বার: <span className="text-brand-gold font-bold text-lg not-italic">01631496122</span></p>
                      <p>৩. টাকা পাঠানো হয়ে গেলে ট্রানজেকশন আইডি টি নিচের বক্সে লিখে অর্ডার সম্পন্ন করুন।</p>
                      <div className="space-y-3 pt-2 not-italic">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">৪. Transaction ID (ট্রানজেকশন আইডি)</label>
                        <input
                          required={formData.paymentMethod === 'bkash' || formData.paymentMethod === 'nagad'}
                          type="text"
                          name="transactionId"
                          value={formData.transactionId}
                          onChange={handleInputChange}
                          className="w-full border-b-2 border-brand-ink py-3 outline-none focus:border-brand-gold transition-colors font-mono text-base uppercase"
                          placeholder="TRX123456789"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              disabled={isProcessing}
              type="submit"
              className={cn(
                "w-full py-6 text-xs uppercase tracking-[0.3em] font-bold transition-all duration-500 relative",
                isProcessing ? "bg-brand-ink/20" : "bg-brand-ink text-white hover:bg-brand-gold"
              )}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                `Place Order — ${formatPrice(total, currency, rate)}`
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="hidden lg:block">
           <div className="bg-brand-muted p-12 mt-20">
              <h2 className="text-xl font-serif mb-8 text-brand-gold">Order Review</h2>
              <div className="space-y-6 max-h-[400px] overflow-y-auto no-scrollbar pr-4">
                {items.map((item) => (
                  <div key={`${item.id}-${item.selectedSize}`} className="flex space-x-4">
                    <img src={item.images[0]} className="w-16 h-20 object-cover" alt="" referrerPolicy="no-referrer" />
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-[10px] uppercase tracking-widest font-bold truncate">{item.name}</p>
                      <p className="text-[9px] text-brand-ink/50 uppercase tracking-widest">SIZE {item.selectedSize} × {item.quantity}</p>
                      <p className="text-xs font-serif mt-1">{formatPrice(item.price * item.quantity, currency, rate)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-12 pt-8 border-t border-brand-ink/10 space-y-4 text-[10px] uppercase tracking-widest">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="PROMO CODE" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 border border-brand-ink/20 px-3 py-2 outline-none focus:border-brand-gold bg-white"
                  />
                  <button type="button" onClick={handleApplyCoupon} className="bg-brand-ink text-white px-4 py-2 hover:bg-brand-gold transition-colors">Apply</button>
                </div>
                {couponError && <p className="text-red-500 normal-case">{couponError}</p>}
                
                <div className="flex justify-between pt-4">
                  <span className="text-brand-ink/50">Subtotal</span>
                  <span>{formatPrice(subtotal, currency, rate)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-brand-gold">
                    <span>Discount ({discount}%)</span>
                    <span>-{formatPrice(discountAmount, currency, rate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                   <span className="text-brand-ink/50">Shipping</span>
                   <span>{formatPrice(shipping, currency, rate)}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-brand-ink/10 text-base font-serif normal-case">
                   <span>Grand Total</span>
                   <span className="text-xl">{formatPrice(total, currency, rate)}</span>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
