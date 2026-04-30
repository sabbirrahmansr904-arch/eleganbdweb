import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Archive, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight,
  Clock,
  ShoppingBag
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { formatPrice, cn } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useProducts } from '../../contexts/ProductContext';
import { useOrders } from '../../contexts/OrderContext';
import { format } from 'date-fns';

const salesData = [
  { name: 'Apr 19', sales: 0 },
  { name: 'Apr 20', sales: 2400 },
  { name: 'Apr 21', sales: 1398 },
  { name: 'Apr 22', sales: 9800 },
  { name: 'Apr 23', sales: 3908 },
  { name: 'Apr 24', sales: 4800 },
  { name: 'Apr 25', sales: 3800 },
];

const COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF'];

export default function AdminDashboard(): React.JSX.Element {
  const { products } = useProducts();
  const { orders } = useOrders();
  const { currency, rate } = useCurrency();
  
  const lowStockProducts = products.filter(p => p.stock < 10);
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  
  // Fake today's sales for preview if empty
  const today = new Date();
  const todayOrders = orders.filter(o => new Date(o.createdAt).getDate() === today.getDate());
  const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);

  // Category spread logic
  const categoryCount = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.stock;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryCount).map(([name, value]) => ({ name, value })).slice(0, 5);

  const stats = [
    { 
      name: 'Total Products', 
      value: products.length.toString(),
      badge: '+2%',
      badgeColor: 'text-green-600 bg-green-50',
      icon: Package 
    },
    { 
      name: 'Total Stock', 
      value: totalStock.toString(), 
      badge: '+5%',
      badgeColor: 'text-green-600 bg-green-50',
      icon: Archive 
    },
    { 
      name: 'Low Stock Items', 
      value: lowStockProducts.length.toString(), 
      badge: `-${lowStockProducts.length}`,
      badgeColor: 'text-red-600 bg-red-50',
      icon: AlertTriangle 
    },
    { 
      name: 'Sales Today', 
      value: formatPrice(todaySales, currency, rate), 
      badge: '0.0%',
      badgeColor: 'text-slate-600 bg-slate-100',
      icon: TrendingUp 
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back. Live Your Life with Elegan BD.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{stat.name}</h3>
                <div className="text-slate-300">
                  <Icon size={24} strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                <div className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded-md", stat.badgeColor)}>
                  {stat.badge}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="mb-6 flex items-start space-x-3">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
               <TrendingUp size={20} />
             </div>
             <div>
                <h3 className="text-sm font-bold text-slate-800">Sales Performance</h3>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">Revenue Trend Last 7 Days</p>
             </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#2563eb', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#2563eb' }}
                  activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Spread */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="mb-6 flex items-start space-x-3">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
               <Archive size={20} />
             </div>
             <div>
                <h3 className="text-sm font-bold text-slate-800">Category Spread</h3>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">Stock Volume By Category</p>
             </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} width={80} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-slate-800">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2 text-blue-600">
                 <Clock size={18} />
                 <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
              </div>
              <Link to="/admin/orders" className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:underline flex items-center gap-1">
                 View All Orders <ArrowRight size={12} />
              </Link>
           </div>
           
           <div className="space-y-4">
              {orders.slice(0, 5).map(order => (
                 <div key={order.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center space-x-3">
                       <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <ShoppingBag size={16} />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-800">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-[11px] text-slate-400">{format(new Date(order.createdAt), 'MMM dd, yyyy h:mm a')}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-slate-800">{formatPrice(order.total, currency, rate)}</p>
                       <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {order.status}
                       </span>
                    </div>
                 </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No recent activity</div>
              )}
           </div>
        </div>

        {/* Best Sellers */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
           <div className="flex items-center space-x-2 text-rose-500 mb-6">
              <TrendingUp size={18} />
              <h3 className="text-sm font-bold text-slate-800">Best Sellers</h3>
           </div>
           
           <div className="space-y-4">
              {products.filter(p => p.featured).slice(0, 5).map(product => (
                 <div key={product.id} className="flex items-center space-x-4 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <img src={product.images[0]} alt={product.name} className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-slate-800 truncate">{product.name}</p>
                       <p className="text-[11px] text-slate-400 truncate">{product.category}</p>
                    </div>
                    <div className="text-right whitespace-nowrap pl-4">
                       <p className="text-sm font-bold text-slate-800">{formatPrice(product.price, currency, rate)}</p>
                       <p className="text-[11px] text-emerald-600 font-medium">{product.stock} in stock</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>

    </div>
  );
}
