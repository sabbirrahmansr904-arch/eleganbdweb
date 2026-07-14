/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useProducts } from '../../contexts/ProductContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { ShoppingBag, Package, Bell, Clock, Search, CheckSquare, AlertCircle, Eye, EyeOff, Check, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatPrice, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function AdminNotifications() {
  const { orders } = useOrders();
  const { products } = useProducts();
  const { currency, rate } = useCurrency();

  // Load read notification IDs from localStorage
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('eleganbd_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('eleganbd_read_notifications', JSON.stringify(readIds));
  }, [readIds]);

  const notifications = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      message: string;
      time: Date;
      icon: React.ElementType;
      color: string;
    }> = [];

    // Order notifications
    orders.forEach(order => {
      // 1. New Order notification
      items.push({
        id: `order-${order.id}`,
        title: `New Order Received`,
        message: `Order #${order.id.slice(-6).toUpperCase()} placed for ${order.items.length} items totaling ${formatPrice(order.total, currency, rate)}.`,
        time: new Date(order.createdAt),
        icon: ShoppingBag,
        color: 'bg-blue-50 text-blue-600 border-blue-100',
      });

      // 2. QC Passed notification
      if (order.status === 'QC') {
        items.push({
          id: `order-qc-${order.id}`,
          title: `Order QC Passed`,
          message: `Order #${order.id.slice(-6).toUpperCase()} (${order.customerName}) has successfully passed Quality Check (QC). Ready for shipment packaging.`,
          time: order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt),
          icon: CheckSquare,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        });
      }

      // 3. Issue Active notification
      if (order.issueType) {
        items.push({
          id: `order-issue-${order.id}`,
          title: `Order Issue: ${order.issueType}`,
          message: `Internal discussion raised for Order #${order.id.slice(-6).toUpperCase()} (${order.customerName}). Status: ${order.issueStatus?.toUpperCase() || 'OPEN'}. Latest: "${order.issueReplies?.[order.issueReplies.length - 1]?.message || 'No description provided'}"`,
          time: order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt),
          icon: AlertCircle,
          color: 'bg-rose-50 text-rose-600 border-rose-100',
        });
      }
    });

    // Recent products added
    products.forEach(product => {
      const productTime = (product as any).createdAt ? new Date((product as any).createdAt) : new Date();
      items.push({
        id: `product-${product.id}`,
        title: `Product Added/Updated`,
        message: `${product.name} was recently added or updated in the catalog.`,
        time: productTime,
        icon: Package,
        color: 'bg-amber-50 text-amber-600 border-amber-100',
      });
    });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [orders, products, currency, rate]);

  // Toggle individual notification status
  const toggleNotification = (id: string) => {
    if (readIds.includes(id)) {
      setReadIds(prev => prev.filter(item => item !== id));
      toast.success('Notification marked as unread.');
    } else {
      setReadIds(prev => [...prev, id]);
      toast.success('Notification marked as read.');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    toast.success('All notifications marked as read.');
  };

  // Mark all notifications as unread
  const markAllAsUnread = () => {
    setReadIds([]);
    toast.success('All notifications marked as unread.');
  };

  // Calculate unread count
  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  return (
    <div className="space-y-8 max-w-full font-sans text-black">
      {/* Page Header */}
      <div className="bg-white p-8 rounded-[24px] border border-[#EFF2F6] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-black italic tracking-tighter uppercase">Notifications & Activity</h1>
          <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-[0.2em] font-black">System updates and latest architectural interactions</p>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={markAllAsRead}
            disabled={notifications.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-black hover:bg-black/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <Check size={14} />
            <span>Mark All Read</span>
          </button>
          <button 
            onClick={markAllAsUnread}
            disabled={notifications.length === 0}
            className="flex items-center gap-2 px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <RotateCcw size={14} />
            <span>Mark All Unread</span>
          </button>
        </div>
      </div>

      {/* Main Event Stream Card */}
      <div className="bg-white border border-[#EFF2F6] rounded-[24px] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#EFF2F6] bg-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">Event Stream</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
            {notifications.length} Historical Units
          </span>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center text-gray-400">
            <Bell size={64} className="mb-6 text-gray-300 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">NULL STATE: NO DATA DETECTED</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EFF2F6]">
            {notifications.slice(0, 50).map((notification) => {
              const Icon = notification.icon;
              const isRead = readIds.includes(notification.id);
              
              return (
                <div 
                  key={notification.id} 
                  onClick={() => toggleNotification(notification.id)}
                  className={cn(
                    "p-6 md:p-8 hover:bg-gray-50 transition-all flex gap-6 group cursor-pointer relative",
                    !isRead ? "bg-amber-50/20" : "opacity-75"
                  )}
                >
                  {/* Left Side Highlight Stripe for Unread */}
                  {!isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gold" />
                  )}

                  {/* Icon */}
                  <div className={cn(
                    "w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-110",
                    notification.color
                  )}>
                    <Icon size={20} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn(
                          "text-sm tracking-tighter uppercase font-black",
                          !isRead ? "text-black" : "text-gray-500"
                        )}>
                          {notification.title}
                        </p>
                        
                        {/* Status Badge */}
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest leading-none",
                          !isRead ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-400"
                        )}>
                          {!isRead ? 'Unread' : 'Read'}
                        </span>
                      </div>

                      {/* Time ago info */}
                      <div className="flex items-center text-[9px] text-gray-400 uppercase tracking-widest font-black whitespace-nowrap gap-2">
                        <Clock size={10} className="text-brand-gold shrink-0" />
                        <span>{formatDistanceToNow(notification.time, { addSuffix: true })}</span>
                      </div>
                    </div>
                    
                    <p className={cn(
                      "text-xs mt-2 font-medium leading-relaxed",
                      !isRead ? "text-gray-700 font-semibold" : "text-gray-500"
                    )}>
                      {notification.message}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-gold opacity-0 group-hover:opacity-100 transition-opacity">
                      {isRead ? (
                        <span className="flex items-center gap-1">
                          <EyeOff size={10} /> Mark Unread
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Eye size={10} /> Mark Read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
