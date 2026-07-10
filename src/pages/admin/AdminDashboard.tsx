import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  BarChart2,
  Copy,
  ExternalLink,
  PlayCircle,
  Users,
  DollarSign
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { formatPrice, cn } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useProducts } from '../../contexts/ProductContext';
import { useOrders } from '../../contexts/OrderContext';
import { format, subDays } from 'date-fns';

export default function AdminDashboard(): React.JSX.Element {
  const { products } = useProducts();
  const { orders } = useOrders();
  const { currency, rate } = useCurrency();

  const totalSalesLast7Days = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    return orders
      .filter(o => new Date(o.createdAt) >= sevenDaysAgo)
      .reduce((sum, o) => sum + o.total, 0);
  }, [orders]);

  const stats = [
    { name: 'ORDERS', value: orders.length.toString(), icon: ShoppingBag },
    { name: 'AVG SALE', value: formatPrice(orders.length > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0, currency, rate), icon: TrendingUp },
    { name: 'PRODUCTS', value: products.length.toString(), icon: Package },
    { name: 'BUYERS', value: new Set(orders.map(o => o.phone || o.customerName)).size.toString(), icon: Users },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#F8FAFC]">
      {/* Top Banner Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0C1421] flex items-center justify-center text-white text-2xl font-bold">E</div>
              <div>
                <h2 className="text-xl font-black text-[#0C1421]">Elegen BD</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs text-gray-500">0 visitors</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white rounded-xl text-sm font-bold">
                <ExternalLink size={16} /> Visit Website
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700">
                <Copy size={16} /> Copy link
              </button>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6] flex items-center justify-between">
            <p className="text-sm font-bold">You're on the Free plan</p>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">Upgrade to Pro</button>
          </div>
        </div>
        <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6] flex flex-col justify-center items-center text-center gap-3">
          <PlayCircle size={48} className="text-gray-400" />
          <p className="text-sm font-bold">Watch the tutorial video</p>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold">Watch</button>
        </div>
      </div>

      {/* Sales Stats */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6]">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">SALES · LAST 7 DAYS</p>
        <h2 className="text-4xl font-black mt-2">{formatPrice(totalSalesLast7Days, currency, rate)}</h2>
        <p className="text-sm text-gray-400 mt-1">From {orders.length} orders this week</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-[24px] p-6 border border-[#EFF2F6]">
            <p className="text-[10px] font-bold text-gray-500 uppercase">{stat.name}</p>
            <p className="text-2xl font-black mt-2">{stat.value}</p>
          </div>
        ))}
      </div>
      {/* Order pipeline */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6]">
        <h3 className="text-sm font-black text-[#0C1421] mb-4">Order pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { name: 'PENDING', count: orders.filter(o => o.status === 'Pending').length },
            { name: 'CONFIRMED', count: orders.filter(o => o.status === 'Processing').length }, // mapping Confirmed to Processing for now as confirmed isn't in status
            { name: 'SHIPPED', count: orders.filter(o => o.status === 'Shipped').length },
            { name: 'DELIVERED', count: orders.filter(o => o.status === 'Delivered').length },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase">{item.name}</p>
              <p className="text-2xl font-black mt-1">৳0</p>
              <p className="text-xs text-gray-400 mt-1">{item.count} orders</p>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Orders */}
      <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-[#0C1421]">Latest orders</h3>
          <Link to="/admin/orders" className="text-xs text-blue-600 font-bold">View all</Link>
        </div>
        <div className="space-y-4">
          {orders.slice(0, 1).map(order => (
            <div key={order.id} className="flex justify-between items-center">
              <div>
                <p className="text-sm font-black">#{order.id.substring(0, 10)}</p>
                <p className="text-xs text-gray-500">{order.customerName}</p>
              </div>
              <p className="text-sm font-black">{formatPrice(order.total, currency, rate)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
