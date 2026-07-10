/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useProducts } from '../../contexts/ProductContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { ShoppingBag, Package, Bell, Clock, Search, CheckSquare, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatPrice, cn } from '../../lib/utils';

export default function AdminNotifications() {
  const { orders } = useOrders();
  const { products } = useProducts();
  const { currency, rate } = useCurrency();

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
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      });

      // 2. QC Passed notification
      if (order.status === 'QC') {
        items.push({
          id: `order-qc-${order.id}`,
          title: `Order QC Passed`,
          message: `Order #${order.id.slice(-6).toUpperCase()} (${order.customerName}) has successfully passed Quality Check (QC). Ready for shipment packaging.`,
          time: order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt),
          icon: CheckSquare,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
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
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
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
        color: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
      });
    });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [orders, products, currency, rate]);

  return (
    <div className="space-y-8 max-w-4xl max-w-full">
      <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md">
        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Notifications & Activity</h1>
        <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-[0.2em] font-black">System updates and latest architectural interactions</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md relative">
        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">Event Stream</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] font-black bg-brand-gold text-white px-3 py-1 rounded-lg shadow-lg shadow-brand-gold/20">
            {notifications.length} Historical Units
          </span>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center text-gray-700">
            <Bell size={64} className="mb-6 text-gray-800 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">NULL STATE: NO DATA DETECTED</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.slice(0, 50).map((notification) => {
              const Icon = notification.icon;
              return (
                <div key={notification.id} className="p-8 hover:bg-white/10 transition-all flex gap-6 group">
                  <div className={cn(
                    "w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border shadow-xl transition-transform group-hover:scale-110",
                    notification.color
                  )}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-6">
                      <p className="text-sm font-black text-white italic tracking-tighter uppercase">{notification.title}</p>
                      <div className="flex items-center text-[9px] text-gray-500 uppercase tracking-widest font-black whitespace-nowrap gap-2 bg-brand-black px-3 py-1 rounded-lg border border-white/5">
                        <Clock size={10} className="text-brand-gold" />
                        <span>{formatDistanceToNow(notification.time, { addSuffix: true })}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 font-medium leading-relaxed">{notification.message}</p>
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
