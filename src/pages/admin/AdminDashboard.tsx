import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Archive, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight,
  Clock,
  ShoppingBag,
  Boxes,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatPrice, cn } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useProducts } from '../../contexts/ProductContext';
import { useOrders } from '../../contexts/OrderContext';
import { format } from 'date-fns';

const CATEGORY_COLORS = [
  '#0088FE', // Blue
  '#00C49F', // Teal/Green
  '#FFBB28', // Yellow
  '#FF8042', // Orange
  '#AF19FF', // Violet
  '#EF4444', // Red
  '#EC4899', // Pink
  '#3730A3'  // Dark Indigo
];

export default function AdminDashboard(): React.JSX.Element {
  const { products } = useProducts();
  const { orders } = useOrders();
  const { currency, rate } = useCurrency();
  
  const lowStockProducts = products.filter(p => p.stock < 10);
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  
  // Real today's sales
  const today = new Date();
  const todayOrders = orders.filter(o => {
    try {
      return new Date(o.createdAt).toDateString() === today.toDateString();
    } catch {
      return false;
    }
  });
  const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);

  // Stats matching the screenshot with dynamic fallbacks
  const stats = [
    { 
      name: 'TOTAL PRODUCTS', 
      value: (products.length || 0).toLocaleString(),
      badge: '+0%',
      badgeColor: 'text-[#10B981] bg-[#ECFDF5]',
      icon: Package,
      iconBg: 'bg-[#FFF0ED] text-[#FF5B48]'
    },
    { 
      name: 'TOTAL STOCK', 
      value: (totalStock || 0).toLocaleString(), 
      badge: '+0%',
      badgeColor: 'text-[#10B981] bg-[#ECFDF5]',
      icon: Archive,
      iconBg: 'bg-[#EBFDFB] text-[#00AF99]'
    },
    { 
      name: 'LOW STOCK ITEMS', 
      value: (lowStockProducts.length || 0).toLocaleString(), 
      badge: `-${lowStockProducts.length || 0}`,
      badgeColor: 'text-[#EF4444] bg-[#FEE2E2]',
      icon: AlertTriangle,
      iconBg: 'bg-[#FFF9EC] text-[#FF8800]'
    },
    { 
      name: 'SALES TODAY', 
      value: todaySales > 0 ? formatPrice(todaySales, currency, rate) : formatPrice(0, currency, rate), 
      badge: todaySales > 0 ? '6.2%' : '0%',
      badgeColor: 'text-[#10B981] bg-[#ECFDF5]',
      icon: TrendingUp,
      iconBg: 'bg-[#FFF0ED] text-[#E04622]'
    },
  ];

  // Sales Trend Last 7 Days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const salesData = last7Days.map((date, index) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOrders = orders.filter(o => {
      try {
        return format(new Date(o.createdAt), 'yyyy-MM-dd') === dateStr;
      } catch {
        return false;
      }
    });
    const daySales = dayOrders.reduce((sum, o) => sum + o.total, 0);
    
    // Aesthetic fallbacks removed to show 0 when no transactions
    const fallbackCurve = [0, 0, 0, 0, 0, 0, 0];
    return {
      name: format(date, 'MMM dd'),
      sales: daySales || fallbackCurve[index],
    };
  });

  // Calculate dynamic Category Spread
  const categoryCount = products.reduce((acc, p) => {
    const cat = p.category || 'T-Shirt';
    acc[cat] = (acc[acc[cat] ? cat : p.category] || 0) + p.stock;
    return acc;
  }, {} as Record<string, number>);

  let categoryRawData = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));
  if (categoryRawData.length === 0) {
    // Empty state
    categoryRawData = [];
  }

  const stockSum = categoryRawData.reduce((acc, c) => acc + c.value, 0) || 0;
  const categoryData = categoryRawData.map(c => ({
    name: c.name,
    value: c.value,
    percentage: stockSum > 0 ? ((c.value / stockSum) * 100).toFixed(1) + '%' : '0%'
  })).sort((a, b) => b.value - a.value);

  const displayedCategories = categoryData.slice(0, 5);
  const othersCount = Math.max(0, categoryData.length - 5);
  const othersTotalStock = categoryData.slice(5).reduce((acc, c) => acc + c.value, 0);

  // Recent Orders matching the screenshot style or real custom orders
  const displayOrders = orders.length > 0 ? orders.slice(0, 5).map(o => ({
    id: o.id.slice(0, 8),
    customerName: o.customerName || 'Anonymous',
    total: o.total,
    status: o.status === 'Pending' ? 'ORDER PLACED' : o.status?.toUpperCase() || 'ORDER PLACED',
    createdAt: o.createdAt
  })) : [];

  // Best Sellers matching screenshot and fallback
  const trendingProducts = products.filter(p => p.featured).slice(0, 5);
  const bestSellersList = trendingProducts.length > 0 ? trendingProducts : [];

  // Custom tooltips matching deep royal blue/dark box
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B132B] text-white px-4 py-2.5 rounded-xl border-none shadow-[0_10px_30px_rgba(0,0,0,0.15)] text-left">
          <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider leading-none mb-1">{label}</p>
          <p className="text-xs font-extrabold tracking-tight text-white leading-none">
            Sales : {formatPrice(payload[0].value, currency, rate)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0C1421] tracking-tight">Dashboard Overview</h1>
          <p className="text-[13px] text-[#62758A] font-semibold mt-1">Welcome back. Live Your Life with Elegan BD.</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="bg-white rounded-[24px] p-6 border border-[#EFF2F6] shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[10px] uppercase tracking-[0.12em] font-extrabold text-[#8292A1]">{stat.name}</h3>
                <div className={cn("p-2 rounded-xl", stat.iconBg)}>
                  <Icon size={18} strokeWidth={2.2} />
                </div>
              </div>
              <div className="flex justify-between items-end mt-2">
                <p className="text-2xl md:text-3xl font-black text-[#0C1421] tracking-tight">{stat.value}</p>
                <div className={cn("text-[10px] font-extrabold px-2 py-1 rounded-md tracking-tight leading-none shrink-0", stat.badgeColor)}>
                  {stat.badge}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-[#EFF2F6] shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-start space-x-3.5">
               <div className="p-2.5 bg-[#EFF1EF] text-[#D83A1F] rounded-xl">
                 <TrendingUp size={18} strokeWidth={2.5} />
               </div>
               <div>
                  <h3 className="text-sm font-black text-[#0C1421]">Sales Performance</h3>
                  <p className="text-[9px] uppercase tracking-[0.16em] font-extrabold text-[#8292A1] mt-1">REVENUE TREND LAST 7 DAYS</p>
               </div>
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSalesNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(240,242,245,0.8)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#8292A1', fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#8292A1', fontWeight: 700 }}
                  tickFormatter={(val) => `৳${(val/1000).toFixed(0)}k`}
                  dx={-5}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3B82F6" 
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSalesNew)"
                  dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff', stroke: '#3B82F6' }}
                  activeDot={{ r: 5, fill: '#3B82F6', stroke: '#ffffff', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Spread Doughnut Pie Chart */}
        <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6] shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#EBFDFB] text-[#00AF99] rounded-xl">
                  <Archive size={16} strokeWidth={2.5} />
                </div>
                <div>
                   <h3 className="text-sm font-black text-[#0C1421]">Category Spread</h3>
                   <p className="text-[9px] uppercase tracking-[0.16em] font-extrabold text-[#8292A1] mt-1">STOCK VOLUME</p>
                </div>
             </div>
             <Link to="/admin/categories" className="text-[10px] font-extrabold text-[#D83A1F] hover:underline uppercase tracking-wider flex items-center gap-1 shrink-0">
                DETAILS <ChevronRight size={12} strokeWidth={2.5} />
             </Link>
          </div>

          <div className="flex flex-col items-center justify-center py-6">
            {/* Pie Container */}
            <div className="h-[140px] w-[140px] relative mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayedCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {displayedCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-extrabold text-[#8292A1] uppercase tracking-wider">Total</span>
                <span className="text-base font-black text-[#0C1421] tracking-tight">{(stockSum).toLocaleString()}</span>
              </div>
            </div>

            {/* Structured Table Legends */}
            <div className="w-full space-y-2 text-xs">
              {displayedCategories.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between font-semibold">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} 
                    />
                    <span className="text-[#4A5E73] truncate text-[11px]">{item.name}...</span>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-[#0D1829] font-bold text-[11px]">{item.value.toLocaleString()}</span>
                    <span className="text-[#8397AB] font-medium text-[10px] w-10 text-right">{item.percentage}</span>
                  </div>
                </div>
              ))}
              {othersCount > 0 && (
                <div className="flex items-center justify-between text-[#8397AB] font-bold pt-1.5 border-t border-[#F0F2F5] text-[10px]">
                  <span>+{othersCount} more categories</span>
                  <span>{othersTotalStock.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recents and Best Sellers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Card */}
        <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6] shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2.5">
                 <div className="p-2 bg-[#F3F4F6] text-gray-500 rounded-lg">
                   <Clock size={16} strokeWidth={2.5} />
                 </div>
                 <h3 className="text-sm font-black text-[#0C1421]">Recent Activity</h3>
              </div>
              <Link to="/admin/orders" className="text-[10px] font-extrabold text-[#D83A1F] hover:underline uppercase tracking-wider flex items-center gap-1">
                 VIEW ALL ORDERS <ChevronRight size={12} strokeWidth={2.5} />
              </Link>
           </div>
           
           <div className="divide-y divide-[#F0F2F5]">
              {displayOrders.map((order, index) => (
                 <div key={order.id + '-' + index} className="flex items-center justify-between py-3.5 hover:bg-gray-55/40 rounded-xl transition-colors">
                    <div className="flex items-center space-x-3.5 min-w-0">
                       <div className="w-9 h-9 rounded-full bg-[#F3F4F6] border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                          <User size={16} strokeWidth={2.5} />
                       </div>
                       <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[#0D1829] truncate capitalize">{order.customerName}</p>
                          <p className="text-[10px] font-extrabold text-[#8397AB] mt-0.5 uppercase tracking-wide">Order #{order.id}</p>
                       </div>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="text-[13px] font-extrabold text-[#0D1829]">{formatPrice(order.total, currency, rate)}</p>
                       <span className="text-[9px] font-black uppercase text-[#10B981] mt-1 inline-block tracking-wider">
                          {order.status}
                       </span>
                    </div>
                 </div>
              ))}
              {displayOrders.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-wider">No recent activity</div>
              )}
           </div>
        </div>

        {/* Best Sellers Card */}
        <div className="bg-white rounded-[24px] p-6 border border-[#EFF2F6] shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
           <div className="flex items-center space-x-2.5 mb-6">
              <div className="p-2 bg-[#FFF0ED] text-[#E04622] rounded-lg">
                <TrendingUp size={16} strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-black text-[#0C1421]">Best Sellers</h3>
           </div>
           
           <div className="divide-y divide-[#F0F2F5]">
              {bestSellersList.map((product, idx) => (
                 <div key={product.id + '-' + idx} className="flex items-center space-x-4 py-3.5 hover:bg-gray-55/40 rounded-xl transition-colors">
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-white p-1">
                      <img src={product.images?.[0] || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=100'} alt={product.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[13px] font-bold text-[#0D1829] truncate">{product.name}</p>
                       <p className="text-[10px] font-extrabold text-[#8397AB] mt-0.5 uppercase tracking-wide">{product.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="text-[13px] font-extrabold text-[#0D1829]">{formatPrice(product.price, currency, rate)}</p>
                       <p className="text-[10px] text-[#D83A1F] font-extrabold uppercase mt-0.5 tracking-tight">{product.stock} in stock</p>
                    </div>
                 </div>
              ))}
              {bestSellersList.length === 0 && (
                 <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-wider">No trending items</div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
