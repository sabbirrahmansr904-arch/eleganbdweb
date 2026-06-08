import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';
import FloatingWhatsApp from './FloatingWhatsApp';
import ComboOfferBanner from './ComboOfferBanner';
import { useCart } from '../contexts/CartContext';
import { useLocation } from 'react-router-dom';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  const isHomePath = location.pathname === '/';

  if (isAdminPath) return <>{children}</>;

  return (
    <div className="flex flex-col min-h-screen">
      {isHomePath && <ComboOfferBanner />}
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
