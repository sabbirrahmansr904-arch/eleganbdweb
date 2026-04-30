/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CartItem } from './types';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { BannerProvider } from './contexts/BannerContext';
import { ProductProvider, useProducts } from './contexts/ProductContext';
import { OrderProvider } from './contexts/OrderContext';
import { InventoryProvider } from './contexts/InventoryContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import About from './pages/About';
import Contact from './pages/Contact';
import ReturnsExchange from './pages/ReturnsExchange';
import CustomerCare from './pages/CustomerCare';
import TrackOrder from './pages/TrackOrder';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import SizeGuide from './pages/SizeGuide';
import ShippingPolicy from './pages/ShippingPolicy';
import SecurePayment from './pages/SecurePayment';
import FastDelivery from './pages/FastDelivery';
import Support from './pages/Support';

// Admin Imports
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminSettings from './pages/admin/AdminSettings';
import AdminBanners from './pages/admin/AdminBanners';
import AdminLogin from './pages/admin/AdminLogin';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminInventoryOverview from './pages/admin/AdminInventoryOverview';
import AdminAddProduct from './pages/admin/AdminAddProduct';
import AdminStockIn from './pages/admin/AdminStockIn';
import AdminStockOut from './pages/admin/AdminStockOut';
import AdminInventoryLog from './pages/admin/AdminInventoryLog';

import CustomerDashboard from './pages/CustomerDashboard';
import FloatingWhatsApp from './components/FloatingWhatsApp';

import { Helmet, HelmetProvider } from 'react-helmet-async';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <CurrencyProvider>
            <BrandingProvider>
              <BannerProvider>
                <ProductProvider>
                  <OrderProvider>
                    <InventoryProvider>
                      <AppContent />
                    </InventoryProvider>
                  </OrderProvider>
                </ProductProvider>
              </BannerProvider>
            </BrandingProvider>
          </CurrencyProvider>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

function AppContent() {
  const { products } = useProducts();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((productId: string, size: string, quantity: number) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === productId && item.selectedSize === size);
      if (existing) {
        return prev.map(item => 
          item.id === productId && item.selectedSize === size 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }
      
      const product = products.find(p => p.id === productId);
      if (!product) return prev;
      
      return [...prev, { ...product, selectedSize: size, quantity }];
    });
  }, [products]);

  const updateQuantity = useCallback((id: string, size: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id && item.selectedSize === size) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, []);

  const removeFromCart = useCallback((id: string, size: string) => {
    setCartItems(prev => prev.filter(item => !(item.id === id && item.selectedSize === size)));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Helmet>
        <title>Elegan BD | Premium Essentials</title>
        <meta name="description" content="Discover premium formal shirts, casual wear, and essentials at Elegan BD." />
        <meta name="keywords" content="Elegan BD, premium clothing, formal shirts, DB shirt, casual wear BD" />
      </Helmet>
      <Toaster position="top-center" reverseOrder={false} />
      <ScrollToTop />
      <Routes>
        {/* Admin Routes - No default Navbar/Footer */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/add" element={<AdminAddProduct />} />
          <Route path="inventory" element={<AdminInventoryOverview />} />
          <Route path="inventory/overview" element={<AdminInventoryOverview />} />
          <Route path="inventory/log" element={<AdminInventoryLog />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="reports" element={<AdminDashboard />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="coupons" element={<AdminSettings />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>

        {/* Client Routes */}
        <Route
          path="*"
          element={
            <div className="flex flex-col min-h-screen selection:bg-brand-gold selection:text-white">
              <Navbar cartCount={totalItems} />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Home onAddToCart={addToCart} />} />
                  <Route path="/product/:id" element={<ProductDetails onAddToCart={addToCart} />} />
                  <Route path="/cart" element={<Cart items={cartItems} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} />} />
                  <Route path="/checkout" element={<Checkout items={cartItems} onClearCart={clearCart} />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/returns-exchange" element={<ReturnsExchange />} />
                  <Route path="/customer-care" element={<CustomerCare />} />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-conditions" element={<TermsConditions />} />
                  <Route path="/size-guide" element={<SizeGuide />} />
                  <Route path="/shipping-policy" element={<ShippingPolicy />} />
                  <Route path="/secure-payment" element={<SecurePayment />} />
                  <Route path="/fast-delivery" element={<FastDelivery />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/my-account" element={<CustomerDashboard />} />
                </Routes>
              </main>
              <Footer />
              <FloatingWhatsApp />
            </div>
          }
        />
      </Routes>
    </>
  );
}

