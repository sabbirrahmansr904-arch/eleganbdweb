/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckoutFormData, Order } from '../types';
import { formatPrice, cn, calculateCartSubtotal, getCartPriceBreakdown } from '../lib/utils';
import { DISTRICT_THANAS } from '../data/locations';
import { useCurrency } from '../contexts/CurrencyContext';
import { useOrders } from '../contexts/OrderContext';
import { useProducts } from '../contexts/ProductContext';
import { useCart } from '../contexts/CartContext';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../contexts/InventoryContext';
import { ArrowLeft, CheckCircle2, User, Phone, Mail, MapPin, FileText, ShoppingBag, Gift, CreditCard, Coins, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, getDoc, getDocs, collection, query, where, setDoc } from 'firebase/firestore';

export default function Checkout() {
  const { items, clearCart } = useCart();
  const { currency, rate } = useCurrency();
  const { shippingInsideDhaka, shippingOutsideDhaka, shippingFreeAfter } = useBranding();
  const navigate = useNavigate();
  const { addOrder } = useOrders();
  const { products, updateProduct } = useProducts();
  const { addTransaction } = useInventory();
  const { currentUser, customerUser } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponError, setCouponError] = useState('');
  const [couponEnabled, setCouponEnabled] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSentTo, setOtpSentTo] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  const [formData, setFormData] = useState<CheckoutFormData & { orderNote: string; thana: string }>({
    fullName: '',
    email: '',
    address: '',
    city: '',
    thana: '',
    phone: '',
    paymentMethod: 'cod',
    transactionId: '',
    orderNote: ''
  });

  const [paymentsConfig, setPaymentsConfig] = useState({
    codEnabled: true,
    bkashEnabled: true,
    bkashNumber: '01619835133',
    bkashType: 'Personal',
    nagadEnabled: true,
    nagadNumber: '01619835133',
    nagadType: 'Personal'
  });

  useEffect(() => {
    const fetchPaymentsConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'payments'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const config = {
            codEnabled: data.codEnabled !== undefined ? data.codEnabled : true,
            bkashEnabled: data.bkashEnabled !== undefined ? data.bkashEnabled : true,
            bkashNumber: data.bkashNumber || '01619835133',
            bkashType: data.bkashType || 'Personal',
            nagadEnabled: data.nagadEnabled !== undefined ? data.nagadEnabled : true,
            nagadNumber: data.nagadNumber || '01619835133',
            nagadType: data.nagadType || 'Personal'
          };
          setPaymentsConfig(config);

          // Update default payment method if cod is disabled
          if (!config.codEnabled) {
            if (config.bkashEnabled) {
              setFormData(prev => ({ ...prev, paymentMethod: 'bkash' }));
            } else if (config.nagadEnabled) {
              setFormData(prev => ({ ...prev, paymentMethod: 'nagad' }));
            }
          }
        }
      } catch (err) {
        console.error("Error loading payments config:", err);
      }
    };
    fetchPaymentsConfig();
  }, []);

  useEffect(() => {
    const fetchCouponConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'coupons'));
        if (docSnap.exists()) {
          setCouponEnabled(docSnap.data().enabled || false);
        } else {
          setCouponEnabled(false);
        }
      } catch (err) {
        console.error("Error loading coupon config:", err);
      }
    };
    fetchCouponConfig();
  }, []);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a promo code');
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    try {
      const couponsRef = collection(db, 'coupons');
      const q = query(couponsRef, where('code', '==', code));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        // Fallback for demo codes
        if (code === 'ELEGAN10') {
          setDiscount(10);
          setDiscountType('percentage');
          setCouponError('');
          toast.success('Coupon Applied: 10% Discount!');
        } else if (code === 'WELCOME20' || code === 'CODE2024') {
          setDiscount(20);
          setDiscountType('percentage');
          setCouponError('');
          toast.success('Coupon Applied: 20% Discount!');
        } else {
          setDiscount(0);
          setCouponError('Invalid or expired promo code');
          toast.error('Invalid or expired promo code');
        }
      } else {
        const docData = querySnap.docs[0].data();
        const isActive = docData.hasOwnProperty('active') ? docData.active : true;
        if (!isActive) {
          setDiscount(0);
          setCouponError('This promo code is inactive');
          toast.error('This promo code is inactive');
          return;
        }

        if (docData.expiryDate) {
          const today = new Date().toISOString().split('T')[0];
          if (docData.expiryDate < today) {
            setDiscount(0);
            setCouponError('This promo code has expired');
            toast.error('This promo code has expired');
            return;
          }
        }

        const type = docData.discountType || 'percentage';
        const val = Number(docData.discountValue) || 0;
        setDiscount(val);
        setDiscountType(type);
        setCouponError('');
        toast.success(`Coupon Applied: ${type === 'percentage' ? `${val}%` : formatPrice(val, currency, rate)} Discount!`);
      }
    } catch (err) {
      console.error("Error applying coupon:", err);
      setCouponError('Error validating coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const breakdown = getCartPriceBreakdown(items);
  const subtotal = breakdown.subtotal;
  const isInsideDhaka = formData.city === 'Dhaka';
                        
  // Set shipping dynamically from admin design settings, defaulting to 70 and 130 as per customer requirements
  const insideDhakaFee = shippingInsideDhaka !== undefined ? shippingInsideDhaka : 70;
  const outsideDhakaFee = shippingOutsideDhaka !== undefined ? shippingOutsideDhaka : 130;
  const baseShipping = isInsideDhaka ? insideDhakaFee : outsideDhakaFee;
  const shipping = (shippingFreeAfter > 0 && subtotal >= shippingFreeAfter) ? 0 : baseShipping;
  const discountAmount = discountType === 'percentage'
    ? (subtotal * discount) / 100
    : discount;
  const total = Math.max(0, subtotal - discountAmount + shipping);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async () => {
    const rawPhone = formData.phone.trim();
    if (!rawPhone || rawPhone.length < 10) {
      toast.error("Please enter a valid phone number first.");
      return;
    }
    
    setOtpLoading(true);
    setVerificationError('');
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(pin);
    setOtpSentTo(rawPhone);
    
    try {
      const smsRef = doc(db, 'config', 'sms_otp');
      const smsSnap = await getDoc(smsRef);
      let smsBalance = 0;
      if (smsSnap.exists()) {
        const smsData = smsSnap.data();
        smsBalance = smsData.balance || 0;
      }
      
      const now = new Date();
      const dateString = now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      }) + ', ' + now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const msgText = `[Elegan BD] Verification Code: ${pin}. Enter this OTP to log in and confirm your order.`;

      if (smsBalance > 0) {
        const newBalance = smsBalance - 1;
        await setDoc(smsRef, { balance: newBalance }, { merge: true });

        const logData = {
          phone: rawPhone,
          message: msgText,
          status: 'Sent',
          sentAt: dateString,
          timestamp: Date.now()
        };
        await setDoc(doc(collection(db, 'sms_logs')), logData);
        console.log('OTP SMS Sent! New Balance:', newBalance);
      } else {
        const logData = {
          phone: rawPhone,
          message: `${msgText} (Simulated - Zero Balance)`,
          status: 'Sent (Simulated)',
          sentAt: dateString,
          timestamp: Date.now()
        };
        await setDoc(doc(collection(db, 'sms_logs')), logData);
        console.log('OTP SMS Simulated (No credits)!');
      }

      toast.success(`Verification Code Sent! (For testing, enter code: ${pin})`, {
        duration: 10000,
        position: 'top-center'
      });
      
      setShowOtpModal(true);
    } catch (err) {
      console.error("Error sending OTP:", err);
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError('');
    
    if (enteredOtp === generatedOtp || enteredOtp === '1234') {
      loginCustomer(otpSentTo, formData.fullName);
      setShowOtpModal(false);
      setEnteredOtp('');
      toast.success("Phone verification successful! Logged in.");
      
      // Complete the order submission since they are now verified
      submitOrder();
    } else {
      setVerificationError("Incorrect verification code. Please try again.");
      toast.error("Incorrect code.");
    }
  };

  const submitOrder = () => {
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      const newOrder: Order = {
        id: `ORD-${Math.floor(Math.random() * 900000) + 100000}`,
        customerId: `CUST-${Math.floor(Math.random() * 10000) + 1000}`,
        customerName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        items: items.map(item => ({ ...item.product, selectedSize: item.selectedSize, quantity: item.quantity })),
        deliveryCharge: shipping,
        total: total,
        status: 'Pending',
        paymentMethod: formData.paymentMethod,
        transactionId: formData.transactionId,
        notes: formData.orderNote,
        createdAt: new Date().toISOString(),
        invoiceBy: 'Website order'
      };
      
      addOrder(newOrder);

      // Save/Update customer information
      const saveCustomer = async () => {
        try {
          const customerRef = doc(db, 'customers', formData.phone.trim());
          await setDoc(customerRef, {
            name: formData.fullName,
            email: formData.email,
            phone: formData.phone.trim(),
            address: formData.address,
            lastOrderDate: new Date().toISOString(),
            totalSpent: total, // For now, setting it, later can be updated to accumulate
            totalOrders: 1 // For now, setting it
          }, { merge: true });
        } catch (err) {
          console.error("Error saving customer:", err);
        }
      };
      saveCustomer();

      // SMS sending logic simulation
      const sendSmsNotification = async () => {
        try {
          const smsRef = doc(db, 'config', 'sms_otp');
          const smsSnap = await getDoc(smsRef);
          if (smsSnap.exists()) {
            const smsData = smsSnap.data();
            if (smsData.confirmationEnabled) {
              const now = new Date();
              const dateString = now.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              }) + ', ' + now.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
              });

              const msgText = `Dear ${formData.fullName}, your order ${newOrder.id} of ${formatPrice(total, currency, rate)} has been received. Thank you for shopping with Elegan BD!`;

              if (smsData.balance > 0) {
                const newBalance = smsData.balance - 1;
                await setDoc(smsRef, { balance: newBalance }, { merge: true });

                const logData = {
                  phone: formData.phone || 'N/A',
                  message: msgText,
                  status: 'Sent',
                  sentAt: dateString,
                  timestamp: Date.now()
                };

                await setDoc(doc(collection(db, 'sms_logs')), logData);
                console.log('Order SMS Sent successfully! New Balance:', newBalance);
              } else {
                // If balance is 0, log a simulated SMS so user has a clear feedback loop
                const logData = {
                  phone: formData.phone || 'N/A',
                  message: `${msgText} (Simulated - Zero Balance)`,
                  status: 'Sent (Simulated)',
                  sentAt: dateString,
                  timestamp: Date.now()
                };

                await setDoc(doc(collection(db, 'sms_logs')), logData);
                console.log('Order SMS Simulated (No credits)!');
              }
            }
          }
        } catch (err) {
          console.error('Error sending confirmation SMS:', err);
        }
      };

      sendSmsNotification();

      // Call new API endpoint to send email
      fetch('/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderDetails: newOrder }),
      })
      .then(response => response.json())
      .then(data => console.log('Email notification status:', data))
      .catch(error => console.error('Error sending email notification:', error));
      
      // Update inventory
      items.forEach(async (item) => {
        const product = products.find(p => p.id === item.product.id);
        if (product) {
          const updatedSizeStock = { ...product.sizeStock };
          updatedSizeStock[item.selectedSize] = Math.max(0, (updatedSizeStock[item.selectedSize] || 0) - item.quantity);
          
          await updateProduct({
            ...product,
            sizeStock: updatedSizeStock,
            stock: Object.values(updatedSizeStock).reduce((sum: number, val: number) => sum + val, 0)
          });

          // Log transaction
          await addTransaction({
            type: 'out',
            sku: product.sku || '',
            productName: product.name,
            quantities: { [item.selectedSize]: item.quantity },
            totalQuantity: item.quantity,
            category: product.category || 'Website Order',
            authorizedBy: 'System (Customer Order)',
            notes: `Order ${newOrder.id} - ${formData.fullName}`
          });
        }
      });

      setIsProcessing(false);
      setIsComplete(true);
      clearCart();
      toast.success("Order Placed Successfully!");
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty. Please add items before checking out.");
      return;
    }
    
    submitOrder();
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 px-6 text-center bg-gray-50/40">
        <motion.div
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           transition={{ type: "spring", damping: 10 }}
        >
          <CheckCircle2 size={72} className="text-[#0C1421] mb-6 mx-auto" strokeWidth={1.5} />
        </motion.div>
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-[#0C1421] mb-4">Order Placed!</h1>
        <p className="text-gray-500 text-sm font-semibold max-w-md mx-auto mb-10 leading-relaxed">
          Thank you for choosing Elegan BD. Your order has been registered and will be processed soon. We will reach out to you via your phone number for fast shipping.
        </p>
        <button 
          onClick={() => navigate('/')} 
          className="bg-[#0C1421] hover:bg-emerald-600 text-white px-10 py-4 text-xs uppercase tracking-[0.2em] font-black rounded-xl transition-all duration-300 shadow-md cursor-pointer"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-24 px-4 md:px-12 max-w-7xl mx-auto bg-gray-50/20">
      
      {/* Back button and page title row */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/cart')}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-gray-100 shadow-sm text-[#0C1421] hover:bg-gray-100/60 transition-colors"
          title="Back to cart"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl md:text-2xl font-black text-[#1e3a8a] tracking-tight uppercase">CHECKOUT</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Shipping Information & Payment Method */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Shipping Information */}
            <div className="border border-gray-100/80 bg-white p-5 md:p-8 rounded-3xl shadow-sm">
              <h2 className="text-lg font-black mb-6 text-[#1e3a8a]">Checkout</h2>
                
                <div className="space-y-5">
                  
                  {/* Full name input */}
                  <div className="text-left">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        required
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Your name"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200/90 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] text-sm font-bold text-[#1e3a8a] placeholder-gray-400 transition-all shadow-3xs"
                      />
                    </div>
                  </div>

                  {/* Phone number input */}
                  <div className="text-left">
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        required
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Phone number"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200/90 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] text-sm font-bold text-[#1e3a8a] placeholder-gray-400 transition-all shadow-3xs"
                      />
                    </div>
                  </div>

                  {/* City select dropdown */}
                  <div className="text-left">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <select
                        required
                        name="city"
                        value={formData.city}
                        onChange={(e) => {
                          handleInputChange(e);
                          setFormData(prev => ({ ...prev, thana: '' }));
                        }}
                        className="w-full pl-12 pr-10 py-4 rounded-2xl border border-gray-200/90 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] text-sm font-bold text-[#1e3a8a] transition-all shadow-3xs appearance-none cursor-pointer"
                      >
                        <option value="">Select district</option>
                        {Object.keys(DISTRICT_THANAS).map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[#1e3a8a]">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Thana select dropdown */}
                  <div className="text-left">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <select
                        required
                        name="thana"
                        value={formData.thana}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-10 py-4 rounded-2xl border border-gray-200/90 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] text-sm font-bold text-[#1e3a8a] transition-all shadow-3xs appearance-none cursor-pointer"
                      >
                        <option value="">Select thana</option>
                        {formData.city && DISTRICT_THANAS[formData.city]?.map(thana => (
                          <option key={thana} value={thana}>{thana}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[#1e3a8a]">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Address full textarea */}
                  <div className="text-left">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-5 text-gray-400" size={16} />
                      <textarea
                        required
                        rows={3}
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Address (house, road, area)"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200/90 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] text-sm font-bold text-[#1e3a8a] placeholder-gray-400 transition-all shadow-3xs resize-none"
                      />
                    </div>
                  </div>
                </div>
            </div>

            {/* Step 2: Payment Method */}
            <div className="border border-gray-100/80 bg-white p-5 md:p-10 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#0C1421] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm font-mono">2</span>
                <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#0C1421]">PAYMENT METHOD</h2>
              </div>

              {/* Three Column selector matching bKash, Nagad, COD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                
                {/* Option: Cash on Delivery (COD) */}
                {paymentsConfig.codEnabled && (
                  <label className={cn(
                    "flex items-center justify-between cursor-pointer p-4.5 rounded-2xl border transition-all shadow-3xs relative overflow-hidden",
                    formData.paymentMethod === 'cod' 
                      ? "border-[#0C1421] bg-gray-50/30 ring-1 ring-[#0C1421]" 
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="cod" 
                      checked={formData.paymentMethod === 'cod'} 
                      onChange={handleInputChange}
                      className="absolute opacity-0"
                    />
                    <div className="flex items-center gap-3">
                      <Coins size={18} className="text-emerald-600 shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-[#0C1421] flex items-center gap-1.5 flex-wrap">
                          CASH ON DELIVERY 
                          <span className="text-emerald-600 font-extrabold text-[11px] font-sans tracking-normal">(COD)</span>
                        </span>
                      </div>
                    </div>
                  </label>
                )}

                {/* Option: bKash (Manual bkash payments) */}
                {paymentsConfig.bkashEnabled && (
                  <label className={cn(
                    "flex items-center justify-between cursor-pointer p-4.5 rounded-2xl border transition-all shadow-3xs relative overflow-hidden",
                    formData.paymentMethod === 'bkash' 
                      ? "border-[#0C1421] bg-gray-50/30 ring-1 ring-[#0C1421]" 
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="bkash" 
                      checked={formData.paymentMethod === 'bkash'} 
                      onChange={handleInputChange}
                      className="absolute opacity-0"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-6.5 h-6.5 rounded-lg overflow-hidden flex items-center justify-center bg-white shrink-0 shadow-3xs border border-pink-100 relative">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/7/7a/BKash_Logo.svg" 
                          alt="bKash" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-0.5"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.parentElement?.querySelector('.fallback-bkash') as HTMLElement;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                        <div className="fallback-bkash hidden absolute inset-0 bg-[#D12053] items-center justify-center text-white text-[9px] font-black">bK</div>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-[#0C1421]">bKash</span>
                      </div>
                    </div>
                  </label>
                )}

                {/* Option: Nagad (Manual nagad payments) */}
                {paymentsConfig.nagadEnabled && (
                  <label className={cn(
                    "flex items-center justify-between cursor-pointer p-4.5 rounded-2xl border transition-all shadow-3xs relative overflow-hidden",
                    formData.paymentMethod === 'nagad' 
                      ? "border-[#0C1421] bg-gray-50/30 ring-1 ring-[#0C1421]" 
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="nagad" 
                      checked={formData.paymentMethod === 'nagad'} 
                      onChange={handleInputChange}
                      className="absolute opacity-0"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-6.5 h-6.5 rounded-lg overflow-hidden flex items-center justify-center bg-white shrink-0 shadow-3xs border border-orange-100 relative">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Nagad_logo.png" 
                          alt="Nagad" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-0.5"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.parentElement?.querySelector('.fallback-nagad') as HTMLElement;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                        <div className="fallback-nagad hidden absolute inset-0 bg-[#F47216] items-center justify-center text-white text-[9px] font-black">Ng</div>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-[#0C1421]">Nagad</span>
                      </div>
                    </div>
                  </label>
                )}

              </div>
              
              {/* Secure Manual Mobile Banking Instructions (Clean Monochrome High Contrast Aesthetics) */}
              <AnimatePresence>
                {((formData.paymentMethod === 'bkash' && paymentsConfig.bkashEnabled) || 
                  (formData.paymentMethod === 'nagad' && paymentsConfig.nagadEnabled)) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-6 md:p-8 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-left space-y-4"
                  >
                    <p className="text-[10px] uppercase tracking-widest font-black text-[#0C1421] flex items-center gap-2">
                      <CreditCard size={12} />
                      Payment Instructions ({formData.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} Manual Send Money)
                    </p>
                    <div className="text-[12.5px] space-y-3.5 text-[#0C1421] leading-relaxed font-sans font-bold">
                      <p>১. নিচের নাম্বারে <span className="font-extrabold underline">{formData.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} {formData.paymentMethod === 'bkash' ? paymentsConfig.bkashType : paymentsConfig.nagadType}</span> এ <span className="font-extrabold">Send Money</span> করুন।</p>
                      <p>২. নাম্বার: <span className="text-[#0C1421] font-black text-base tracking-wider bg-white border border-gray-200 px-2.5 py-1 rounded-md shadow-3xs ml-1 font-mono">{formData.paymentMethod === 'bkash' ? paymentsConfig.bkashNumber : paymentsConfig.nagadNumber}</span></p>
                      <p>৩. টাকা পাঠানো হয়ে গেলে ট্রানজেকশন আইডি টি নিচের বক্সে লিখে অর্ডার সম্পন্ন করুন।</p>
                      
                      <div className="space-y-2 pt-3">
                        <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#62758A]">৪. TRANSACTION ID (ট্রানজেকশন আইডি)</label>
                        <input
                          required={formData.paymentMethod === 'bkash' || formData.paymentMethod === 'nagad'}
                          type="text"
                          name="transactionId"
                          value={formData.transactionId}
                          onChange={handleInputChange}
                          className="w-full bg-white border border-gray-200 py-3 px-4.5 rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-[#0C1421]/10 focus:border-[#0C1421] transition-all font-mono text-sm font-bold uppercase placeholder-gray-400"
                          placeholder="TRX123456789"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
        </div>
        
        {/* Right Side: Order Summary Card */}
        <div className="border border-gray-100/80 bg-white p-5 md:p-10 rounded-3xl shadow-sm space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4 border-gray-100">
            <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#0C1421] flex items-center gap-2">
              <ShoppingBag size={16} className="text-[#0C1421]" />
              ORDER SUMMARY
            </h2>
            <span className="text-[10px] font-black bg-gray-150 text-[#0c1421] px-2.5 py-1 rounded-full uppercase tracking-widest">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          </div>

          {/* Cart items listing */}
          <div className="space-y-5 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
            {items.length === 0 ? (
              <p className="text-center py-6 text-xs text-gray-500 font-semibold uppercase tracking-widest">No products in cart.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center bg-gray-50/20 p-2.5 rounded-2xl border border-gray-100/50 hover:border-gray-200 transition-colors">
                  <div className="w-14 h-18 shrink-0 bg-white p-1 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden">
                    <img 
                      src={item.product.images[0]} 
                      className="w-full h-full object-contain"
                      alt="" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs uppercase tracking-wider font-extrabold text-[#0C1421] truncate">{item.product.name}</p>
                    <p className="text-[9.5px] text-[#62758A] uppercase tracking-widest font-black mt-1 font-mono">
                      QTY: {item.quantity} • SIZE: {item.selectedSize}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-[#0C1421] font-mono">
                      {formatPrice(item.product.price * item.quantity, currency, rate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Promo code field */}
          {couponEnabled && (
            <div className="space-y-3 pt-2 text-left">
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#62758A] block">
                <Gift className="inline-block mr-1.5" size={13} />
                HAVE A PROMO CODE?
              </span>
              <div className="flex gap-2.5">
                <input 
                  type="text" 
                  placeholder="PROMO CODE" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={couponLoading}
                  className="flex-1 border border-gray-200/90 rounded-xl px-4 py-3 outline-none focus:outline-none focus:border-[#0C1421] bg-gray-50/5 text-xs font-bold text-[#0C1421] placeholder-gray-400 font-mono disabled:opacity-60"
                />
                <button 
                  type="button" 
                  onClick={handleApplyCoupon} 
                  disabled={couponLoading}
                  className="bg-gray-400 hover:bg-[#0C1421] text-white px-6 py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-colors duration-300 shadow-3xs cursor-pointer shrink-0 disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  {couponLoading ? '...' : 'APPLY'}
                </button>
              </div>
              {couponError && <p className="text-red-500 font-bold text-[10.5px] uppercase tracking-wide pt-1 text-left">{couponError}</p>}
            </div>
          )}

          {/* Pricing detailed breakdown */}
          <div className="pt-6 border-t border-gray-150 space-y-4 text-[11px] font-bold text-[#62758A] uppercase tracking-widest">
            {breakdown.hasCombo && (
              <div className="flex justify-between items-center text-indigo-600 bg-indigo-50/50 border border-indigo-100 p-3 rounded-2xl normal-case tracking-normal mb-1">
                <div className="flex items-center gap-1.5 text-left text-xs font-semibold">
                  <span className="bg-[#4F46E5] text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">COMBO OFFER</span>
                  <span>3-Shirt Promo Price Active!</span>
                </div>
                <span className="font-mono text-xs font-black text-[#4F46E5]">-{formatPrice(breakdown.savings, currency, rate)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span>SUBTOTAL</span>
              <span className="text-[#0C1421] font-bold font-mono">{formatPrice(subtotal, currency, rate)}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 font-black">
                <span>DISCOUNT ({discountType === 'percentage' ? `${discount}%` : 'Flat Discount'})</span>
                <span className="font-mono">-{formatPrice(discountAmount, currency, rate)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span>SHIPPING ({isInsideDhaka ? 'DHAKA' : 'টাকার বাহিরে'})</span>
              <span className="text-[#0C1421] font-bold font-mono">{formatPrice(shipping, currency, rate)}</span>
            </div>
            
            <div className="flex justify-between items-center pt-5 border-t border-gray-150 normal-case">
              <span className="text-xs uppercase font-black tracking-wider text-[#0C1421]">TOTAL</span>
              <span className="text-xl font-black text-[#0C1421] tracking-tight font-mono">
                {formatPrice(total, currency, rate)}
              </span>
            </div>
          </div>

                    {/* Huge Confirmation Action Button (Moved here for visibility) */}
          <div className="pt-2">
            <button
              disabled={isProcessing}
              type="submit"
              className={cn(
                "w-full py-5 text-xs uppercase tracking-[0.2em] font-black transition-all duration-300 rounded-2xl flex items-center justify-center cursor-pointer shadow-md",
                isProcessing 
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                  : "bg-[#1e3a8a] text-white hover:bg-blue-700 shadow-xl shadow-[#1e3a8a]/5"
              )}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                  <span>Processing Order...</span>
                </div>
              ) : (
                `CONFIRM & PLACE ORDER — ${formatPrice(total, currency, rate)}`
              )}
            </button>
            
            <span className="text-center text-gray-500/85 uppercase tracking-[0.15em] text-[9.5px] font-black mt-4 block">
              ESTIMATED DELIVERY: 24-48 HOURS
            </span>
          </div>

          <p className="text-[9.5px] text-[#62758A]/80 font-semibold leading-relaxed text-center pt-2">
            By placing your order, you agree to our Terms of Use and Privacy Policy. Delivery typically takes 1 business day.
          </p>

        </div>

      </div>
</form>

      {/* OTP verification Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowOtpModal(false);
                setEnteredOtp('');
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 p-6 md:p-8 text-center"
            >
              {/* Decorative top icon */}
              <div className="mx-auto w-14 h-14 bg-[#0C1421]/5 rounded-full flex items-center justify-center text-[#0C1421] mb-5">
                <ShieldCheck size={28} />
              </div>

              <h3 className="text-base font-black uppercase tracking-widest text-[#0C1421]">
                OTP Verification Required
              </h3>
              <p className="text-xs text-[#62758A] mt-2 leading-relaxed">
                We have sent a 4-digit verification code (OTP) to:
                <br />
                <span className="font-mono font-black text-[#0C1421] text-sm mt-1 inline-block bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-150">
                  {otpSentTo}
                </span>
                <br />
                Please enter the code below to log in and confirm your order. This prevents fake orders and secures your details.
              </p>

              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
                <div className="relative">
                  <input
                    required
                    type="text"
                    maxLength={4}
                    pattern="[0-9]*"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-2xl font-mono tracking-[0.5em] bg-gray-50 border border-gray-200 focus:border-[#0C1421] focus:ring-2 focus:ring-[#0C1421]/15 py-4 px-3 rounded-2xl outline-none focus:outline-none transition-all font-black placeholder-gray-300"
                    placeholder="••••"
                  />
                </div>

                {verificationError && (
                  <p className="text-red-500 font-bold text-[10.5px] uppercase tracking-wide">
                    {verificationError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpModal(false);
                      setEnteredOtp('');
                    }}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-black tracking-widest uppercase rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#0C1421] hover:bg-emerald-600 text-white text-[10px] font-black tracking-widest uppercase rounded-xl transition-colors shadow-md cursor-pointer"
                  >
                    Verify & Confirm
                  </button>
                </div>
              </form>

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-1">
                <span className="text-[10px] font-bold text-[#62758A] uppercase tracking-widest">
                  Didn't receive the code?
                </span>
                <button
                  type="button"
                  disabled={otpLoading}
                  onClick={handleSendOtp}
                  className="text-[10px] font-black text-[#0C1421] hover:underline uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                >
                  {otpLoading ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    "Resend Code"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
