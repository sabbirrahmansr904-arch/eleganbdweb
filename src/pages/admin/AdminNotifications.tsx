/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useProducts } from '../../contexts/ProductContext';
import { ShoppingBag, Package, Bell, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminNotifications() {
  const { orders } = useOrders();
  const { products } = useProducts();

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
      items.push({
        id: `order-${order.id}`,
        title: `New Order Received`,
        message: `Order #${order.id.slice(-6)} placed for ${order.items.length} items totaling ৳${order.total}. Status: ${order.status}`,
        time: new Date(order.createdAt),
        icon: ShoppingBag,
        color: 'text-blue-500 bg-blue-50',
      });
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
        color: 'text-brand-gold bg-brand-gold/10',
      });
    });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [orders, products]);

  return (
    <div className="space-y-8 max-w-4xl max-w-full">
      <div>
        <h1 className="text-3xl font-serif text-brand-ink">Notifications & Activity</h1>
        <p className="text-sm text-gray-400 mt-2 uppercase tracking-widest">System updates and latest interactions</p>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-[10px] uppercase tracking-widest font-bold text-gray-400">All Updates</h2>
          <span className="text-[10px] uppercase tracking-widest bg-gray-200 px-2 py-1 rounded text-gray-600">
            {notifications.length} Events
          </span>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <Bell size={48} className="mb-4 text-gray-200" />
            <p className="text-sm uppercase tracking-widest">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.slice(0, 50).map((notification) => {
              const Icon = notification.icon;
              return (
                <div key={notification.id} className="p-6 hover:bg-gray-50/50 transition-colors flex gap-4">
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${notification.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-bold text-brand-ink">{notification.title}</p>
                      <div className="flex items-center text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap gap-1">
                        <Clock size={10} />
                        <span>{formatDistanceToNow(notification.time, { addSuffix: true })}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
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
