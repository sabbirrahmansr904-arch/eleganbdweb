import React, { useMemo, useState, useEffect } from 'react';
import { useOrders } from '../../../contexts/OrderContext';
import { useProducts } from '../../../contexts/ProductContext';
import { useCurrency } from '../../../contexts/CurrencyContext';
import { ShoppingBag, Package, Bell, Clock, CheckSquare, AlertCircle, Eye, EyeOff, Check, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatPrice, cn } from '../../../lib/utils';
import toast from 'react-hot-toast';

export default function NotificationSettings() {
  const { orders } = useOrders();
  const { products } = useProducts();
  const { currency, rate } = useCurrency();

  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('eleganbd_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

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

    orders.forEach(order => {
      items.push({
        id: `order-${order.id}`,
        title: `New Order Received`,
        message: `Order #${order.id.slice(-6).toUpperCase()} placed for ${order.items.length} items totaling ${formatPrice(order.total, currency, rate)}.`,
        time: new Date(order.createdAt),
        icon: ShoppingBag,
        color: 'bg-blue-50 text-blue-600 border-blue-100',
      });

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

  const toggleNotification = (id: string) => {
    if (readIds.includes(id)) {
      setReadIds(prev => prev.filter(item => item !== id));
      toast.success('Notification marked as unread.');
    } else {
      setReadIds(prev => [...prev, id]);
      toast.success('Notification marked as read.');
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    toast.success('All notifications marked as read.');
  };

  const markAllAsUnread = () => {
    setReadIds([]);
    toast.success('All notifications marked as unread.');
  };

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  return (
    <div className="space-y-12 max-w-4xl relative z-10 font-sans">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 pb-8">
          <div className="space-y-1">
            <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Alert Distribution Matrix</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">System updates and latest architectural interactions</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={markAllAsRead}
              disabled={notifications.length === 0}
              className="px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              <Check size={14} />
              Mark All Read
            </button>
            <button 
              onClick={markAllAsUnread}
              disabled={notifications.length === 0}
              className="px-6 py-3 border border-gray-100 bg-gray-50 text-gray-400 hover:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <RotateCcw size={14} />
              Mark All Unread
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-gray-400 italic">Historical Event Stream</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  {unreadCount} UNREAD UNITS
                </span>
              )}
            </div>
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-32 flex flex-col items-center justify-center text-gray-400 text-center space-y-4">
              <Bell size={64} className="opacity-10 animate-spin-slow" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-gray-300">NULL STATE: NO ARCHITECTURAL DATA DETECTED</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.slice(0, 50).map((notification) => {
                const Icon = notification.icon;
                const isRead = readIds.includes(notification.id);
                
                return (
                  <div 
                    key={notification.id} 
                    onClick={() => toggleNotification(notification.id)}
                    className={cn(
                      "p-8 md:p-10 hover:bg-gray-50 transition-all flex gap-8 group cursor-pointer relative",
                      !isRead ? "bg-amber-50/5" : "opacity-50"
                    )}
                  >
                    {!isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black" />
                    )}

                    <div className={cn(
                      "w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-110 duration-500",
                      notification.color
                    )}>
                      <Icon size={24} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <p className={cn(
                            "text-sm tracking-tight uppercase font-black italic",
                            !isRead ? "text-black" : "text-gray-400"
                          )}>
                            {notification.title}
                          </p>
                        </div>

                        <div className="flex items-center text-[9px] text-gray-400 uppercase tracking-widest font-black gap-2">
                          <Clock size={10} className="text-brand-gold" />
                          <span>{formatDistanceToNow(notification.time, { addSuffix: true })}</span>
                        </div>
                      </div>
                      
                      <p className={cn(
                        "text-[13px] mt-2 leading-relaxed font-medium",
                        !isRead ? "text-gray-600" : "text-gray-400"
                      )}>
                        {notification.message}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-gold opacity-0 group-hover:opacity-100 transition-all duration-300">
                        {isRead ? (
                          <span className="flex items-center gap-2">
                            <EyeOff size={12} /> Mark Unread Protocol
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Eye size={12} /> Mark Read Protocol
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
    </div>
  );
}
