/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { Package, User, LogOut, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { Link, useNavigate } from 'react-router-dom';

export default function CustomerDashboard() {
  const { currentUser, signOut } = useAuth();
  const { orders } = useOrders();
  const { currency, rate } = useCurrency();
  const navigate = useNavigate();

  // In a real app we'd fetch orders where email matches or customerId matches user ID.
  const myOrders = useMemo(() => {
    if (!currentUser?.email) return [];
    return orders.filter(o => o.email === currentUser.email).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, currentUser]);

  if (!currentUser) {
    return (
      <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto min-h-[60vh] flex flex-col items-center justify-center text-center">
        <User size={48} className="text-gray-300 mb-6" />
        <h1 className="text-4xl font-serif mb-4">Please Log In</h1>
        <p className="text-sm text-gray-500 uppercase tracking-widest mb-8">Access your account to view orders.</p>
        <Link to="/" className="text-xs uppercase tracking-widest border-b border-brand-ink pb-1 hover:text-brand-gold hover:border-brand-gold transition-colors">
          Return to Home
        </Link>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto min-h-[70vh]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-8">
          <div>
            <h2 className="text-2xl font-serif mb-2 text-brand-ink">My Account</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest">{currentUser.displayName || 'Customer'}</p>
            <p className="text-[10px] text-gray-400 mt-1">{currentUser.email}</p>
          </div>
          
          <nav className="flex flex-col space-y-4 text-xs uppercase tracking-widest font-bold">
            <button className="text-left text-brand-gold transition-colors">Order History</button>
            <button className="text-left text-gray-400 hover:text-brand-ink transition-colors opacity-50 cursor-not-allowed">Profile Settings (Coming Soon)</button>
            <button onClick={handleLogout} className="text-left text-red-500 hover:text-red-600 transition-colors pt-4 mt-4 border-t border-gray-100 flex items-center gap-2">
              <LogOut size={14} /> Log Out
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <h3 className="text-sm uppercase tracking-[0.2em] font-bold border-b border-gray-200 pb-4 mb-8">Recent Orders</h3>
          
          {myOrders.length === 0 ? (
            <div className="text-center py-16 bg-gray-50">
              <Package size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-6">No orders found.</p>
              <Link to="/shop" className="bg-brand-ink text-white px-8 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-colors">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {myOrders.map(order => (
                <div key={order.id} className="border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-bold uppercase tracking-widest">Order {order.id}</p>
                      <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest bg-gray-100 font-bold rounded">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleDateString()} • {order.items.length} items</p>
                  </div>
                  
                  <div className="flex flex-col md:items-end w-full md:w-auto">
                    <p className="text-sm font-bold text-brand-ink mb-2">
                      {currency === 'USD' ? '$' : '৳'}{formatPrice(order.total, rate)}
                    </p>
                    <button onClick={() => alert('Order tracking feature coming soon!')} className="text-[10px] flex items-center gap-1 uppercase tracking-widest text-brand-gold hover:text-brand-ink transition-colors">
                      View Details <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
