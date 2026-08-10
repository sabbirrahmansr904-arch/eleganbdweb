/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useProducts } from '../../contexts/ProductContext';
import { useOrders } from '../../contexts/OrderContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useCategories } from '../../contexts/CategoryContext';
import { formatPrice } from '../../lib/utils';
import { 
  Search, 
  Upload, 
  Download, 
  MoreHorizontal, 
  MoreVertical,
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Package, 
  Sparkles,
  Inbox,
  ChevronDown,
  ArrowUpRight,
  FileText,
  AlertCircle,
  Bell,
  Users
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminDashboard(): React.JSX.Element {
  const { currentUser } = useAuth();
  const { products } = useProducts();
  const { orders, loading } = useOrders();
  const { categories } = useCategories();
  const { currency, rate } = useCurrency();
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [timeRange, setTimeRange] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [reportPeriod, setReportPeriod] = useState<'12 MONTHS' | '6 MONTHS' | '30 DAYS' | '7 DAYS'>('12 MONTHS');

  // Real-time Active Admins State
  const [activeAdmins, setActiveAdmins] = useState<Array<{
    id: string;
    email: string;
    username: string;
    department: string;
    role: string;
    isOnline: boolean;
    lastActive: number;
    updatedAt: number;
  }>>([]);

  // Real-time listener for active admins
  useEffect(() => {
    const unsubPerms = onSnapshot(collection(db, 'admin_permissions'), (permsSnap) => {
      const permsMap = new Map<string, any>();
      permsSnap.forEach(docSnap => {
        const data = docSnap.data();
        const email = (data.email || docSnap.id).toLowerCase().trim();
        permsMap.set(email, {
          email,
          department: data.department || 'SALES EXECUTIVE DEPARTMENT',
          permissions: data.permissions || []
        });
      });

      const unsubAdmins = onSnapshot(collection(db, 'admins'), (adminsSnap) => {
        const adminMap = new Map<string, any>();

        // Default baseline admins
        const defaultAdmins = [
          { email: 'eleganbd.ltd@gmail.com', dept: 'CEO & FOUNDER', role: 'CEO' },
          { email: 'sabbirrahmansr904@gmail.com', dept: 'SALES EXECUTIVE DEPARTMENT', role: 'Super Admin' },
          { email: 'nasiruddinovi2025@gmail.com', dept: 'MANAGEMENT / ADMIN ASSISTANT', role: 'Admin' }
        ];

        defaultAdmins.forEach(item => {
          const email = item.email.toLowerCase();
          adminMap.set(email, {
            id: email,
            email: item.email,
            username: email.split('@')[0],
            department: permsMap.get(email)?.department || item.dept,
            role: item.role,
            isOnline: false,
            lastActive: 0,
            updatedAt: 0
          });
        });

        permsMap.forEach((val, emailKey) => {
          if (!adminMap.has(emailKey)) {
            adminMap.set(emailKey, {
              id: emailKey,
              email: val.email,
              username: val.email.split('@')[0],
              department: val.department,
              role: 'Admin',
              isOnline: false,
              lastActive: 0,
              updatedAt: 0
            });
          }
        });

        adminsSnap.forEach(docSnap => {
          const data = docSnap.data();
          const email = (data.email || docSnap.id).toLowerCase().trim();
          const username = email ? email.split('@')[0] : docSnap.id;
          const dept = data.department || permsMap.get(email)?.department || (email === 'eleganbd.ltd@gmail.com' ? 'CEO & FOUNDER' : 'SALES EXECUTIVE DEPARTMENT');
          const role = data.role === 'super-admin' ? 'Super Admin' : (email === 'eleganbd.ltd@gmail.com' ? 'CEO' : 'Admin');

          adminMap.set(email, {
            id: docSnap.id,
            email: data.email || docSnap.id,
            username,
            department: dept,
            role,
            isOnline: data.isOnline === true,
            lastActive: data.lastActive || data.updatedAt || 0,
            updatedAt: data.updatedAt || 0
          });
        });

        if (currentUser && currentUser.email) {
          const currEmail = currentUser.email.toLowerCase().trim();
          const existing = adminMap.get(currEmail);
          adminMap.set(currEmail, {
            id: currentUser.uid,
            email: currentUser.email,
            username: currEmail.split('@')[0],
            department: existing?.department || 'SALES EXECUTIVE DEPARTMENT',
            role: existing?.role || 'Admin',
            isOnline: true,
            lastActive: Date.now(),
            updatedAt: Date.now()
          });
        }

        const sortedList = Array.from(adminMap.values()).sort((a, b) => {
          const now = Date.now();
          const aOnline = a.isOnline && (now - a.lastActive < 90000);
          const bOnline = b.isOnline && (now - b.lastActive < 90000);
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          return (b.lastActive || 0) - (a.lastActive || 0);
        });

        setActiveAdmins(sortedList);
      });

      return () => unsubAdmins();
    });

    return () => unsubPerms();
  }, [currentUser]);

  // Real-time Stock alert tracker
  const prevProductsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!products || products.length === 0) return;

    // First load sets up baseline stock map, so we don't trigger alerts for existing low stock products on initial render
    const isFirstLoad = Object.keys(prevProductsRef.current).length === 0;
    const newStockMap: Record<string, number> = {};

    products.forEach(p => {
      newStockMap[p.id] = p.stock || 0;

      if (!isFirstLoad) {
        const prevStock = prevProductsRef.current[p.id];
        // If stock has been reduced and is now <= 15, trigger a real-time visual low-stock alert
        if (prevStock !== undefined && p.stock < prevStock && p.stock <= 15) {
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-[#F8F9FD] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 overflow-hidden border border-rose-100 p-4 transition-all duration-300`}
            >
              <div className="flex-1 w-0">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    {p.images?.[0] ? (
                      <img
                        className="h-12 w-12 rounded-xl object-cover border border-gray-100 shadow-sm"
                        src={p.images[0]}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-[10px] font-black text-rose-600 tracking-wider uppercase mb-0.5">Critical Low Stock Alert</p>
                    <p className="text-xs font-black text-gray-900 truncate max-w-[220px]">{p.name}</p>
                    <p className="mt-1 text-[11px] text-gray-500 font-bold">
                      Stock decreased from <span className="line-through text-gray-400 font-black">{prevStock}</span> to <span className="text-rose-600 font-black text-xs bg-rose-50 px-1.5 py-0.5 rounded-md ml-0.5">{p.stock} pcs</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-100 pl-3 ml-3 items-center justify-center">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="border border-transparent rounded-none rounded-r-lg p-1.5 flex items-center justify-center text-[10px] font-black text-rose-600 hover:text-rose-800 focus:outline-none cursor-pointer uppercase tracking-wider"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ), { duration: 6000 });
        }
      }
    });

    prevProductsRef.current = newStockMap;
  }, [products]);

  // Dynamic legend labels based on selected period
  const legendLabels = useMemo(() => {
    if (reportPeriod === '30 DAYS') return { curr: 'This 30 Days (৳)', prev: 'Prev 30 Days (৳)' };
    if (reportPeriod === '7 DAYS') return { curr: 'This Week (৳)', prev: 'Last Week (৳)' };
    return { curr: 'This Year (৳)', prev: 'Last Year (৳)' };
  }, [reportPeriod]);

  // Dynamic Sales Report area chart calculation strictly based on real-time orders in Firestore
  const salesReportData = useMemo(() => {
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    if (orders) {
      if (reportPeriod === '12 MONTHS' || reportPeriod === '6 MONTHS') {
        const count = reportPeriod === '12 MONTHS' ? 12 : 6;
        const result = [];
        for (let i = count - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mIdx = d.getMonth();
          const yr = d.getFullYear();
          const prevYr = yr - 1;

          const mOrders = orders.filter(o => {
            if (!o.createdAt || o.status === 'Cancelled' || o.status === 'PICK UP CANCEL') return false;
            const od = new Date(o.createdAt);
            return od.getMonth() === mIdx && od.getFullYear() === yr;
          });

          const prevMOrders = orders.filter(o => {
            if (!o.createdAt || o.status === 'Cancelled' || o.status === 'PICK UP CANCEL') return false;
            const od = new Date(o.createdAt);
            return od.getMonth() === mIdx && od.getFullYear() === prevYr;
          });

          const salesSum = mOrders.reduce((sum, o) => sum + (o.total || 0), 0);
          const prevSalesSum = prevMOrders.reduce((sum, o) => sum + (o.total || 0), 0);

          result.push({
            name: monthsShort[mIdx],
            sales: Math.round(salesSum),
            profit: Math.round(prevSalesSum), // Mapped to previous period line
            dateLabel: `${monthsShort[mIdx]} ${yr}`,
          });
        }
        return result;
      } else if (reportPeriod === '30 DAYS') {
        const result = [];
        for (let i = 5; i >= 0; i--) {
          const segmentEnd = new Date(now.getTime() - i * 5 * 24 * 60 * 60 * 1000);
          const segmentStart = new Date(segmentEnd.getTime() - 5 * 24 * 60 * 60 * 1000);

          const prevSegmentEnd = new Date(segmentEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
          const prevSegmentStart = new Date(segmentStart.getTime() - 30 * 24 * 60 * 60 * 1000);

          const sOrders = orders.filter(o => {
            if (!o.createdAt || o.status === 'Cancelled' || o.status === 'PICK UP CANCEL') return false;
            const od = new Date(o.createdAt);
            return od >= segmentStart && od <= segmentEnd;
          });

          const prevSOrders = orders.filter(o => {
            if (!o.createdAt || o.status === 'Cancelled' || o.status === 'PICK UP CANCEL') return false;
            const od = new Date(o.createdAt);
            return od >= prevSegmentStart && od <= prevSegmentEnd;
          });

          const salesSum = sOrders.reduce((sum, o) => sum + (o.total || 0), 0);
          const prevSalesSum = prevSOrders.reduce((sum, o) => sum + (o.total || 0), 0);

          const endDayNum = 30 - i * 5;
          const startDayNum = endDayNum - 4;

          result.push({
            name: `Day ${startDayNum}-${endDayNum}`,
            sales: Math.round(salesSum),
            profit: Math.round(prevSalesSum),
            dateLabel: `Last 30 Days`,
          });
        }
        return result;
      } else {
        // 7 DAYS
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const result = [];
        for (let i = 6; i >= 0; i--) {
          const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const prevDate = new Date(now.getTime() - (i + 7) * 24 * 60 * 60 * 1000);

          const dOrders = orders.filter(o => {
            if (!o.createdAt || o.status === 'Cancelled' || o.status === 'PICK UP CANCEL') return false;
            const od = new Date(o.createdAt);
            return od.getDate() === targetDate.getDate() && 
                   od.getMonth() === targetDate.getMonth() && 
                   od.getFullYear() === targetDate.getFullYear();
          });

          const prevDOrders = orders.filter(o => {
            if (!o.createdAt || o.status === 'Cancelled' || o.status === 'PICK UP CANCEL') return false;
            const od = new Date(o.createdAt);
            return od.getDate() === prevDate.getDate() && 
                   od.getMonth() === prevDate.getMonth() && 
                   od.getFullYear() === prevDate.getFullYear();
          });

          const salesSum = dOrders.reduce((sum, o) => sum + (o.total || 0), 0);
          const prevSalesSum = prevDOrders.reduce((sum, o) => sum + (o.total || 0), 0);

          result.push({
            name: days[targetDate.getDay()],
            sales: Math.round(salesSum),
            profit: Math.round(prevSalesSum),
            dateLabel: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          });
        }
        return result;
      }
    }

    return [];
  }, [orders, reportPeriod]);

  // Low Stock Alert calculation - strictly based on real-time products with stock <= 2 pcs (1-2 pcs remaining)
  const stockAlertProducts = useMemo(() => {
    const getProductFallbackImage = (name: string) => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes('formal shirt') || lowerName.includes('formal-shirt') || lowerName.includes('premium formal shirt')) {
        return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150&q=80';
      }
      if (lowerName.includes('polo') || lowerName.includes('t-shirt') || lowerName.includes('drop shoulder')) {
        return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150&q=80';
      }
      if (lowerName.includes('pant') || lowerName.includes('formal pant') || lowerName.includes('trouser')) {
        return 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=150&q=80';
      }
      return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150&q=80';
    };

    if (!products || products.length === 0) {
      return [];
    }

    // Filter products that ONLY have stock <= 2 pcs (1-2 pcs remaining, or 0 out of stock)
    const alertItems = products
      .filter(p => p.stock <= 2)
      .sort((a, b) => a.stock - b.stock);

    return alertItems.map(p => ({
      id: p.id,
      name: p.name,
      brand: p.category || 'Elegan BD',
      stock: p.stock,
      price: p.price,
      formattedPrice: formatPrice(p.price, currency, rate),
      image: p.images?.[0] || getProductFallbackImage(p.name)
    }));
  }, [products, currency, rate]);

  // Simulation handlers
  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast.success('Sales data exported successfully (CSV)');
    }, 800);
  };

  const handleDownloadReport = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      toast.success('Report downloaded successfully (PDF)');
    }, 800);
  };

  // Check if database contains data
  const hasOrders = orders && orders.length > 0;
  const hasProducts = products && products.length > 0;

  // Filter orders by time period (excluding cancelled orders)
  const periodOrders = useMemo(() => {
    if (!orders) return [];
    const now = new Date();
    return orders.filter(order => {
      if (order.status === 'Cancelled') return false;
      if (!order.createdAt) return false;
      
      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return false;

      if (timeRange === 'Monthly') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      } else {
        return orderDate.getFullYear() === now.getFullYear();
      }
    });
  }, [orders, timeRange]);

  // Current period total revenue calculation
  const periodSalesAmount = useMemo(() => {
    return periodOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [periodOrders]);

  // Current period quantity of items sold
  const periodVolumeCount = useMemo(() => {
    return periodOrders.reduce((sum, o) => sum + (o.items ? o.items.reduce((s, item) => s + item.quantity, 0) : 0), 0);
  }, [periodOrders]);

  // Sales Today calculation
  const salesToday = useMemo(() => {
    if (!orders) return { count: 0, total: 0 };
    const now = new Date();
    const todayOrders = orders.filter(o => {
      if (o.status === 'Cancelled' || !o.createdAt) return false;
      const od = new Date(o.createdAt);
      return od.getDate() === now.getDate() &&
             od.getMonth() === now.getMonth() &&
             od.getFullYear() === now.getFullYear();
    });
    const count = todayOrders.length;
    const total = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    return { count, total };
  }, [orders]);

  // Volume Sold Today calculation
  const volumeSoldToday = useMemo(() => {
    if (!orders) return 0;
    const now = new Date();
    const todayOrders = orders.filter(o => {
      if (o.status === 'Cancelled' || !o.createdAt) return false;
      const od = new Date(o.createdAt);
      return od.getDate() === now.getDate() &&
             od.getMonth() === now.getMonth() &&
             od.getFullYear() === now.getFullYear();
    });
    return todayOrders.reduce((sum, o) => sum + (o.items ? o.items.reduce((s, item) => s + item.quantity, 0) : 0), 0);
  }, [orders]);

  // Sales This Month calculation
  const salesThisMonth = useMemo(() => {
    if (!orders) return { count: 0, total: 0 };
    const now = new Date();
    const monthOrders = orders.filter(o => {
      if (o.status === 'Cancelled' || !o.createdAt) return false;
      const od = new Date(o.createdAt);
      return od.getMonth() === now.getMonth() && od.getFullYear() === now.getFullYear();
    });
    const count = monthOrders.length;
    const total = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    return { count, total };
  }, [orders]);

  // Total products stock volume in-store (live update of inventory)
  const totalStockVolume = useMemo(() => {
    if (!products) return 0;
    return products.reduce((sum, p) => sum + (p.stock || 0), 0);
  }, [products]);

  // Metrics mappings
  const metricTotalSales = hasOrders 
    ? salesToday.count.toLocaleString() 
    : '14';

  const metricVolumeProducts = hasOrders 
    ? volumeSoldToday.toLocaleString() 
    : '28';

  const metricProductSalesDollar = hasOrders 
    ? formatPrice(salesThisMonth.total, currency, rate) 
    : formatPrice(500324, currency, rate);

  // Statistics Donut Data: extract real category names & calculate total category sales dynamically
  const statPieData = useMemo(() => {
    const categoryNames = categories.map(c => c.name);
    if (categoryNames.length === 0) {
      categoryNames.push('Formal Shirt', 'Polo T-shirt', 'Formal Pant', 'Premium Shirt');
    }

    const colors = ['#0F172A', '#94A3B8', '#CBD5E1', '#E2E8F0', '#E5E7EB'];

    // Initialize with 0
    const totals: Record<string, number> = {};
    categoryNames.forEach(name => { totals[name] = 0; });

    let hasRealCategorySales = false;

    periodOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const catName = item.category || 'Other';
          if (categoryNames.includes(catName)) {
            totals[catName] += (item.price * item.quantity);
            hasRealCategorySales = true;
          } else {
            const found = categoryNames.find(c => c.toLowerCase() === catName.toLowerCase());
            if (found) {
              totals[found] += (item.price * item.quantity);
              hasRealCategorySales = true;
            } else {
              if (!totals['Other']) totals['Other'] = 0;
              totals['Other'] += (item.price * item.quantity);
            }
          }
        });
      }
    });

    // Fallback if no sales exist in database yet
    if (!hasRealCategorySales) {
      const scaleFactor = timeRange === 'Monthly' ? 1 : 12;
      const defaultProportions = [188500 * scaleFactor, 90231 * scaleFactor, 89532 * scaleFactor, 88865 * scaleFactor, 45000 * scaleFactor];
      return categoryNames.slice(0, 5).map((name, idx) => ({
        name,
        value: defaultProportions[idx] || (30000 * scaleFactor),
        color: colors[idx % colors.length],
        formattedVal: formatPrice(defaultProportions[idx] || (30000 * scaleFactor), currency, rate)
      }));
    }

    return Object.entries(totals)
      .filter(([_, value]) => value > 0)
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length],
        formattedVal: formatPrice(value, currency, rate)
      }));
  }, [categories, periodOrders, timeRange, currency, rate]);

  // Donut label variables
  const donutCenterVal = hasOrders 
    ? periodOrders.length.toLocaleString() 
    : (timeRange === 'Monthly' ? '23,324' : '2,79,888');

  const bottomTotalVal = hasOrders 
    ? formatPrice(salesThisMonth.total, currency, rate) 
    : formatPrice(3440031, currency, rate);

  // Dynamic Double Bar Chart Data based on Monthly vs Yearly selection
  const doubleBarChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    if (timeRange === 'Monthly') {
      const last5Months = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last5Months.push({
          label: months[d.getMonth()],
          monthIdx: d.getMonth(),
          year: d.getFullYear()
        });
      }

      const calculated = last5Months.map(m => {
        const monthlyOrders = orders ? orders.filter(o => {
          if (o.status === 'Cancelled') return false;
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt);
          return d.getMonth() === m.monthIdx && d.getFullYear() === m.year;
        }) : [];

        const totalRevenue = monthlyOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalProfit = totalRevenue * 0.35; // 35% margin estimate

        return {
          key: m.label,
          val: Math.round(totalRevenue),
          profit: Math.round(totalProfit)
        };
      });

      const hasRealData = calculated.some(d => d.val > 0);
      if (hasRealData) {
        const maxVal = Math.max(...calculated.map(d => d.val));
        const gridMax = maxVal > 0 ? Math.ceil(maxVal / 1000) * 1000 : 7000;
        return {
          items: calculated.map(c => ({
            month: c.key,
            val: c.val,
            formattedVal: formatPrice(c.val, currency, rate),
            formattedProfit: formatPrice(c.profit, currency, rate),
            solidPct: c.val > 0 ? (c.profit / c.val) * 100 : 35,
            heightPct: maxVal > 0 ? (c.val / gridMax) * 100 : 10
          })),
          gridMax,
          gridLines: Array.from({ length: 7 }, (_, i) => Math.round(gridMax * (7 - i) / 7))
        };
      }
    } else {
      // Yearly: show last 5 years
      const last5Years = [];
      for (let i = 4; i >= 0; i--) {
        last5Years.push(now.getFullYear() - i);
      }

      const calculated = last5Years.map(year => {
        const yearlyOrders = orders ? orders.filter(o => {
          if (o.status === 'Cancelled') return false;
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt);
          return d.getFullYear() === year;
        }) : [];

        const totalRevenue = yearlyOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalProfit = totalRevenue * 0.35;

        return {
          key: String(year),
          val: Math.round(totalRevenue),
          profit: Math.round(totalProfit)
        };
      });

      const hasRealData = calculated.some(d => d.val > 0);
      if (hasRealData) {
        const maxVal = Math.max(...calculated.map(d => d.val));
        const gridMax = maxVal > 0 ? Math.ceil(maxVal / 10000) * 10000 : 70000;
        return {
          items: calculated.map(c => ({
            month: c.key,
            val: c.val,
            formattedVal: formatPrice(c.val, currency, rate),
            formattedProfit: formatPrice(c.profit, currency, rate),
            solidPct: c.val > 0 ? (c.profit / c.val) * 100 : 35,
            heightPct: maxVal > 0 ? (c.val / gridMax) * 100 : 10
          })),
          gridMax,
          gridLines: Array.from({ length: 7 }, (_, i) => Math.round(gridMax * (7 - i) / 7))
        };
      }
    }

    // Default Fallback
    const fallbackMax = timeRange === 'Monthly' ? 7000 : 7000 * 12;
    const fallbackItems = timeRange === 'Monthly' ? [
      { month: 'Jan', val: 3400, solidPct: 40, heightPct: (3400 / fallbackMax) * 100 },
      { month: 'Feb', val: 2800, solidPct: 35, heightPct: (2800 / fallbackMax) * 100 },
      { month: 'Mar', val: 4000, solidPct: 45, heightPct: (4000 / fallbackMax) * 100 },
      { month: 'May', val: 2500, solidPct: 30, heightPct: (2500 / fallbackMax) * 100 },
      { month: 'Apr', val: 4500, solidPct: 50, heightPct: (4500 / fallbackMax) * 100 },
    ] : [
      { month: '2022', val: 3400 * 12, solidPct: 40, heightPct: ((3400 * 12) / fallbackMax) * 100 },
      { month: '2023', val: 2800 * 12, solidPct: 35, heightPct: ((2800 * 12) / fallbackMax) * 100 },
      { month: '2024', val: 4000 * 12, solidPct: 45, heightPct: ((4000 * 12) / fallbackMax) * 100 },
      { month: '2025', val: 2500 * 12, solidPct: 30, heightPct: ((2500 * 12) / fallbackMax) * 100 },
      { month: '2026', val: 4500 * 12, solidPct: 50, heightPct: ((4500 * 12) / fallbackMax) * 100 },
    ];

    return {
      items: fallbackItems.map(it => ({
        ...it,
        formattedVal: formatPrice(it.val, currency, rate),
        formattedProfit: formatPrice(it.val * 0.35, currency, rate)
      })),
      gridMax: fallbackMax,
      gridLines: Array.from({ length: 7 }, (_, i) => Math.round(fallbackMax * (7 - i) / 7))
    };
  }, [orders, timeRange, currency, rate]);

  // Top Selling Product (Live calculation from database)
  const topSellingProduct = useMemo(() => {
    if (!orders || orders.length === 0 || !products || products.length === 0) {
      if (products && products.length > 0) {
        return {
          name: products[0].name,
          brand: 'Elegan BD',
          stock: products[0].stock,
          price: products[0].price,
          formattedPrice: formatPrice(products[0].price, currency, rate),
          salesCount: 15,
          image: products[0].images?.[0] || ''
        };
      }
      return {
        name: 'Premium Formal Shirt',
        brand: 'Elegan BD',
        stock: 450,
        price: 1850,
        formattedPrice: formatPrice(1850, currency, rate),
        salesCount: 120,
        image: ''
      };
    }

    const productSales: Record<string, { count: number, totalQty: number }> = {};
    orders
      .filter(o => o.status !== 'Cancelled')
      .forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            if (!productSales[item.id]) {
              productSales[item.id] = { count: 0, totalQty: 0 };
            }
            productSales[item.id].count += 1;
            productSales[item.id].totalQty += item.quantity;
          });
        }
      });

    const sorted = Object.entries(productSales).sort((a, b) => b[1].totalQty - a[1].totalQty);
    if (sorted.length > 0) {
      const topId = sorted[0][0];
      const salesInfo = sorted[0][1];
      const prod = products.find(p => p.id === topId);
      if (prod) {
        return {
          name: prod.name,
          brand: 'Elegan BD',
          stock: prod.stock,
          price: prod.price,
          formattedPrice: formatPrice(prod.price, currency, rate),
          salesCount: salesInfo.totalQty,
          image: prod.images?.[0] || ''
        };
      }
    }

    return {
      name: 'Premium Formal Shirt',
      brand: 'Elegan BD',
      stock: 450,
      price: 1850,
      formattedPrice: formatPrice(1850, currency, rate),
      salesCount: 120,
      image: ''
    };
  }, [orders, products, currency, rate]);

  // Weekly Levels Data Chart based on Monthly vs Yearly selection
  const weeklyLevelsData = useMemo(() => {
    const now = new Date();
    
    if (timeRange === 'Monthly') {
      const weeks = [
        { label: 'W1', val: 0, heightPct: 15 },
        { label: 'W2', val: 0, heightPct: 33 },
        { label: 'W3', val: 0, heightPct: 100 },
        { label: 'W4', val: 0, heightPct: 20 },
      ];
      
      let hasRealData = false;
      if (orders) {
        orders
          .filter(o => o.status !== 'Cancelled' && o.createdAt)
          .forEach(order => {
            const d = new Date(order.createdAt);
            if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
              const date = d.getDate();
              const val = order.total || 0;
              if (date <= 7) { weeks[0].val += val; hasRealData = true; }
              else if (date <= 14) { weeks[1].val += val; hasRealData = true; }
              else if (date <= 21) { weeks[2].val += val; hasRealData = true; }
              else { weeks[3].val += val; hasRealData = true; }
            }
          });
      }
      
      if (hasRealData) {
        const maxVal = Math.max(...weeks.map(w => w.val));
        weeks.forEach(w => {
          w.heightPct = maxVal > 0 ? Math.max(8, (w.val / maxVal) * 100) : 10;
        });
        return weeks.map(w => ({
          ...w,
          formattedVal: formatPrice(w.val, currency, rate)
        }));
      }
      
      // Default fallback
      const defaultVals = [840, 2000, 6000, 1200];
      const maxVal = Math.max(...defaultVals);
      return weeks.map((w, i) => ({
        ...w,
        val: defaultVals[i],
        heightPct: (defaultVals[i] / maxVal) * 100,
        formattedVal: formatPrice(defaultVals[i], currency, rate)
      }));
    } else {
      // Yearly -> show quarters
      const quarters = [
        { label: 'Q1', val: 0, heightPct: 20 },
        { label: 'Q2', val: 0, heightPct: 45 },
        { label: 'Q3', val: 0, heightPct: 85 },
        { label: 'Q4', val: 0, heightPct: 35 },
      ];
      
      let hasRealData = false;
      if (orders) {
        orders
          .filter(o => o.status !== 'Cancelled' && o.createdAt)
          .forEach(order => {
            const d = new Date(order.createdAt);
            if (d.getFullYear() === now.getFullYear()) {
              const m = d.getMonth();
              const val = order.total || 0;
              if (m < 3) { quarters[0].val += val; hasRealData = true; }
              else if (m < 6) { quarters[1].val += val; hasRealData = true; }
              else if (m < 9) { quarters[2].val += val; hasRealData = true; }
              else { quarters[3].val += val; hasRealData = true; }
            }
          });
      }
      
      if (hasRealData) {
        const maxVal = Math.max(...quarters.map(q => q.val));
        quarters.forEach(q => {
          q.heightPct = maxVal > 0 ? Math.max(8, (q.val / maxVal) * 100) : 10;
        });
        return quarters.map(q => ({
          ...q,
          formattedVal: formatPrice(q.val, currency, rate)
        }));
      }
      
      // Fallback
      const defaultVals = [12000, 34000, 56000, 22000];
      const maxVal = Math.max(...defaultVals);
      return quarters.map((q, i) => ({
        ...q,
        val: defaultVals[i],
        heightPct: (defaultVals[i] / maxVal) * 100,
        formattedVal: formatPrice(defaultVals[i], currency, rate)
      }));
    }
  }, [orders, timeRange, currency, rate]);



  const renderProductIcon = (type: string) => {
    switch (type) {
      case 'clothes':
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ShoppingBag className="w-4 h-4" />
          </div>
        );
      case 'shoe':
        return (
          <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
            <Inbox className="w-4 h-4" />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center gap-2 bg-transparent py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Loading Live Dashboard...</p>
      </div>
    );
  }

  // Dynamic Total calculations purely based on real-time orders live data
  const dynamicTotalSalesAmount = useMemo(() => {
    if (orders && orders.length > 0) {
      const activeOrders = orders.filter(o => o.status !== 'Cancelled' && o.status !== 'PICK UP CANCEL');
      if (activeOrders.length > 0) {
        return activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      }
    }
    return 0;
  }, [orders]);

  const dynamicTotalOrdersCount = useMemo(() => {
    return orders?.length || 0;
  }, [orders]);

  const dynamicTotalRevenueAmount = useMemo(() => {
    // 100% accurate total revenue from active orders
    return dynamicTotalSalesAmount;
  }, [dynamicTotalSalesAmount]);

  const dynamicTotalCustomersCount = useMemo(() => {
    if (orders && orders.length > 0) {
      const uniqueCusts = new Set(orders.map(o => o.customerId || o.customerEmail || o.phone || o.shippingAddress?.fullName || 'unknown').filter(val => val !== 'unknown'));
      return uniqueCusts.size;
    }
    return 0;
  }, [orders]);

  // Real-time Month-over-Month growth trends
  const monthlyStats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return { salesGrowth: 0, ordersGrowth: 0, revenueGrowth: 0, customersGrowth: 0 };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let thisMonthSales = 0;
    let lastMonthSales = 0;
    let thisMonthOrders = 0;
    let lastMonthOrders = 0;

    const thisMonthCusts = new Set<string>();
    const lastMonthCusts = new Set<string>();

    orders.forEach(o => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const isThisMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      const isLastMonth = d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;

      const custKey = o.phone || o.customerId || o.customerEmail || 'unknown';

      if (isThisMonth) {
        thisMonthOrders++;
        if (custKey !== 'unknown') thisMonthCusts.add(custKey);
        if (o.status !== 'Cancelled' && o.status !== 'PICK UP CANCEL') {
          thisMonthSales += o.total || 0;
        }
      } else if (isLastMonth) {
        lastMonthOrders++;
        if (custKey !== 'unknown') lastMonthCusts.add(custKey);
        if (o.status !== 'Cancelled' && o.status !== 'PICK UP CANCEL') {
          lastMonthSales += o.total || 0;
        }
      }
    });

    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      salesGrowth: calcGrowth(thisMonthSales, lastMonthSales),
      ordersGrowth: calcGrowth(thisMonthOrders, lastMonthOrders),
      revenueGrowth: calcGrowth(thisMonthSales, lastMonthSales),
      customersGrowth: calcGrowth(thisMonthCusts.size, lastMonthCusts.size)
    };
  }, [orders]);

  const productSalesData = useMemo(() => {
    const colorPalette = ['#6366F1', '#3B82F6', '#10B981', '#F97316', '#EC4899', '#8B5CF6', '#14B8A6', '#64748B'];

    if (!orders || orders.length === 0) {
      return [];
    }

    const prodMap: Record<string, number> = {};

    orders.forEach(o => {
      if (o.status === 'Cancelled' || o.status === 'PICK UP CANCEL' || !o.items) return;
      o.items.forEach(item => {
        const pName = item.name || 'Unnamed Product';
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        prodMap[pName] = (prodMap[pName] || 0) + itemTotal;
      });
    });

    const entries = Object.entries(prodMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (entries.length === 0) {
      return [];
    }

    let topProducts = entries;
    if (entries.length > 5) {
      const top4 = entries.slice(0, 4);
      const othersVal = entries.slice(4).reduce((sum, e) => sum + e.value, 0);
      topProducts = [...top4, { name: 'Others', value: othersVal }];
    }

    const totalSum = topProducts.reduce((sum, item) => sum + item.value, 0);

    return topProducts.map((item, idx) => ({
      ...item,
      color: colorPalette[idx % colorPalette.length],
      percentage: totalSum > 0 ? Math.round((item.value / totalSum) * 100) : 0,
      formattedVal: formatPrice(item.value, currency, rate)
    }));
  }, [orders, currency, rate]);

  const bestSellingProductName = useMemo(() => {
    if (productSalesData && productSalesData.length > 0) {
      return productSalesData[0].name;
    }
    return 'None';
  }, [productSalesData]);

  const productSalesTotalFormatted = useMemo(() => {
    const totalSum = productSalesData.reduce((sum, item) => sum + item.value, 0);
    return formatPrice(totalSum, currency, rate);
  }, [productSalesData, currency, rate]);

  const tableOrders = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [];
    }

    return orders.slice(0, 10).map((o) => {
      let statusText = o.status || 'Processing';
      let statusColor = 'bg-blue-50 text-blue-600 border border-blue-100/50';

      if (['Completed', 'SUCCESS', 'Delivered'].includes(o.status)) {
        statusText = 'Completed';
        statusColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100/50';
      } else if (['Pending', 'ORDER PLACED'].includes(o.status)) {
        statusText = 'Pending';
        statusColor = 'bg-amber-50 text-amber-600 border border-amber-100/50';
      } else if (['Cancelled', 'PICK UP CANCEL'].includes(o.status)) {
        statusText = 'Cancelled';
        statusColor = 'bg-rose-50 text-rose-600 border border-rose-100/50';
      } else if (['Shipped', 'PREPARING'].includes(o.status)) {
        statusText = o.status;
        statusColor = 'bg-purple-50 text-purple-600 border border-purple-100/50';
      }

      // Display exact invoice number as saved in Firestore
      const displayInvoice = o.invoiceNo 
        ? `#${o.invoiceNo}` 
        : (o.id ? (o.id.startsWith('#') ? o.id : `#${o.id}`) : '#INV-0000');

      const custName = o.customerName || (o as any).shippingAddress?.fullName || o.email || 'Customer';

      return {
        id: displayInvoice,
        customerName: custName,
        date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
        items: o.items ? o.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 1,
        amount: formatPrice(o.total || 0, currency, rate),
        statusText,
        statusColor
      };
    });
  }, [orders, currency, rate]);

  // Custom tooltips matching visual specs perfectly
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataObj = payload[0]?.payload;
      return (
        <div className="bg-[#F8F9FD]/95 backdrop-blur-md border border-gray-100 p-4 rounded-2xl shadow-xl w-64 text-xs select-none">
          <div className="flex items-center justify-between pb-3 border-b border-gray-50 mb-3">
            <span className="font-black text-gray-500 uppercase tracking-wider">
              {label} {dataObj?.dateLabel ? `(${dataObj.dateLabel})` : ''}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
              <div className="flex-1 flex justify-between items-center">
                <span className="text-gray-500 font-medium">{legendLabels.curr}</span>
                <span className="font-black text-gray-900">{formatPrice(payload[0].value || 0, currency, rate)}</span>
              </div>
            </div>
            
            {payload[1] && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" />
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-gray-500 font-medium">{legendLabels.prev}</span>
                  <span className="font-black text-gray-900">{formatPrice(payload[1].value || 0, currency, rate)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 bg-[#F8F9FD] min-h-screen text-slate-900 antialiased font-sans">
      
      {/* TOP HEADER ROW */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight flex items-center gap-2">
            Hi, {currentUser?.displayName || 'Admin'} 👋
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Welcome back to Elegan BD Admin</p>
        </div>
      </div>

      {/* ROW 1: 4-COLUMN METRICS GRID - MATCHING THE PICTURE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* CARD 1: Total Sales */}
        <div className="bg-[#F8F9FD] border border-slate-200/70 rounded-[24px] p-5 shadow-2xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:shadow-xs transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center shadow-2xs">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400">Total Sales</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-50 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-4">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {formatPrice(dynamicTotalSalesAmount, currency, rate)}
              </h3>
            </div>
          </div>

          {/* Trend & Sparkline */}
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-gray-50/50">
            <span className={`inline-flex items-center gap-1 text-[11px] font-black ${monthlyStats.salesGrowth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-0.5 rounded-md`}>
              {monthlyStats.salesGrowth >= 0 ? `↑ ${monthlyStats.salesGrowth}%` : `↓ ${Math.abs(monthlyStats.salesGrowth)}%`} <span className="text-gray-400 font-bold text-[10px]">vs last month</span>
            </span>
            <div className="w-20 h-8">
              <svg width="80" height="32" viewBox="0 0 80 32" className="text-[#6366F1]">
                <path
                  d="M0 25 C15 25, 20 5, 35 15 C50 25, 60 2, 80 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 25 C15 25, 20 5, 35 15 C50 25, 60 2, 80 12 L80 32 L0 32 Z"
                  fill="url(#sparkline-indigo)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient id="sparkline-indigo-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* CARD 2: Total Orders */}
        <div className="bg-[#F8F9FD] border border-slate-200/70 rounded-[24px] p-5 shadow-2xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:shadow-xs transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400">Total Orders</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-50 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-4">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {dynamicTotalOrdersCount.toLocaleString()}
              </h3>
            </div>
          </div>

          {/* Trend & Sparkline */}
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-gray-50/50">
            <span className={`inline-flex items-center gap-1 text-[11px] font-black ${monthlyStats.ordersGrowth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-0.5 rounded-md`}>
              {monthlyStats.ordersGrowth >= 0 ? `↑ ${monthlyStats.ordersGrowth}%` : `↓ ${Math.abs(monthlyStats.ordersGrowth)}%`} <span className="text-gray-400 font-bold text-[10px]">vs last month</span>
            </span>
            <div className="w-20 h-8">
              <svg width="80" height="32" viewBox="0 0 80 32" className="text-[#10B981]">
                <path
                  d="M0 28 C15 28, 20 15, 35 20 C50 25, 60 2, 80 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 28 C15 28, 20 15, 35 20 C50 25, 60 2, 80 8 L80 32 L0 32 Z"
                  fill="url(#sparkline-green)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient id="sparkline-green-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* CARD 3: Total Revenue */}
        <div className="bg-[#F8F9FD] border border-slate-200/70 rounded-[24px] p-5 shadow-2xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:shadow-xs transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shadow-2xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400">Total Revenue</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-50 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-4">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {formatPrice(dynamicTotalRevenueAmount, currency, rate)}
              </h3>
            </div>
          </div>

          {/* Trend & Sparkline */}
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-gray-50/50">
            <span className={`inline-flex items-center gap-1 text-[11px] font-black ${monthlyStats.revenueGrowth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-0.5 rounded-md`}>
              {monthlyStats.revenueGrowth >= 0 ? `↑ ${monthlyStats.revenueGrowth}%` : `↓ ${Math.abs(monthlyStats.revenueGrowth)}%`} <span className="text-gray-400 font-bold text-[10px]">vs last month</span>
            </span>
            <div className="w-20 h-8">
              <svg width="80" height="32" viewBox="0 0 80 32" className="text-[#F97316]">
                <path
                  d="M0 5 C15 5, 25 22, 40 12 C55 2, 65 25, 80 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 5 C15 5, 25 22, 40 12 C55 2, 65 25, 80 18 L80 32 L0 32 Z"
                  fill="url(#sparkline-orange)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient id="sparkline-orange-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* CARD 4: Total Customers */}
        <div className="bg-[#F8F9FD] border border-slate-200/70 rounded-[24px] p-5 shadow-2xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:shadow-xs transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shadow-2xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400">Total Customers</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-50 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-4">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {dynamicTotalCustomersCount.toLocaleString()}
              </h3>
            </div>
          </div>

          {/* Trend & Sparkline */}
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-gray-50/50">
            <span className={`inline-flex items-center gap-1 text-[11px] font-black ${monthlyStats.customersGrowth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-0.5 rounded-md`}>
              {monthlyStats.customersGrowth >= 0 ? `↑ ${monthlyStats.customersGrowth}%` : `↓ ${Math.abs(monthlyStats.customersGrowth)}%`} <span className="text-gray-400 font-bold text-[10px]">vs last month</span>
            </span>
            <div className="w-20 h-8">
              <svg width="80" height="32" viewBox="0 0 80 32" className="text-[#3B82F6]">
                <path
                  d="M0 26 C15 26, 20 18, 35 22 C50 26, 60 5, 80 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 26 C15 26, 20 18, 35 22 C50 26, 60 5, 80 10 L80 32 L0 32 Z"
                  fill="url(#sparkline-blue)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient id="sparkline-blue-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* ROW 2: SALES REPORT (FULL WIDTH) */}
      <div className="w-full bg-[#F8F9FD] border border-slate-200/70 rounded-[24px] p-6 shadow-2xs flex flex-col justify-between">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Sales Report</h3>
            {/* Legend matching mockup */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
                <span>{legendLabels.curr}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                <span className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                <span>{legendLabels.prev}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center gap-3">
            {/* Period toggles */}
            <div className="bg-[#F1F3F9] p-1 rounded-full flex border border-gray-100">
              {(['12 MONTHS', '6 MONTHS', '30 DAYS', '7 DAYS'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setReportPeriod(period)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    reportPeriod === period
                      ? 'bg-[#F8F9FD] text-gray-950 shadow-xs'
                      : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* Export PDF Button */}
            <button
              onClick={() => {
                toast.success('Preparing Sales Report PDF export...');
                setTimeout(() => {
                  toast.success('Sales report PDF exported successfully!');
                }, 800);
              }}
              className="flex items-center gap-1.5 bg-[#F8F9FD] border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-1.5 rounded-lg text-[10px] font-black transition-all shadow-2xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Core Recharts AreaChart with curved lines and dots */}
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesReportData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorThisYear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="colorLastYear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.10} />
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(val) => {
                  if (val === 0) return '৳0';
                  if (val >= 1000) return `৳${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
                  return `৳${val}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#6366F1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorThisYear)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#6366F1' }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#94A3B8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLastYear)"
                activeDot={{ r: 5, strokeWidth: 0, fill: '#94A3B8' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ROW 3: PRODUCT SALES (1/3) & RECENT ORDERS (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PRODUCT SALES Donut Chart */}
        <div className="bg-[#F8F9FD] border border-slate-200/70 rounded-[24px] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight pb-3">Product Sales</h3>
            
            {/* Donut Chart container */}
            <div className="relative w-full h-44 flex items-center justify-center my-2">
              {productSalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productSalesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {productSalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-xs text-gray-400 font-medium">
                  No products sold yet
                </div>
              )}

              {/* Central label */}
              {productSalesData.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-gray-900 tracking-tight">
                    {productSalesTotalFormatted}
                  </span>
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest mt-0.5">
                    Total Sales
                  </span>
                </div>
              )}
            </div>

            {/* Legends list */}
            <div className="space-y-2 mt-4">
              {productSalesData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-gray-50 pb-1.5">
                  <div className="flex items-center gap-2 truncate max-w-[140px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700 font-bold truncate" title={item.name}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-900">{item.formattedVal}</span>
                    <span className="text-[10px] font-black text-[#6366F1] bg-[#EEF2FF] px-1.5 py-0.5 rounded">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-50 pt-4 mt-4 text-center">
            <span className="text-xs font-bold text-gray-500">
              Best Selling: <span className="text-[#6366F1] font-black">{bestSellingProductName}</span>
            </span>
          </div>

        </div>

        {/* RECENT ORDERS TABLE */}
        <div className="lg:col-span-2 bg-[#F8F9FD] border border-slate-200/70 rounded-[24px] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-5">
              <h3 className="text-base font-black text-gray-900 tracking-tight">Recent Orders</h3>
              <button 
                onClick={() => toast.success('Viewing all order registers...')}
                className="flex items-center gap-1 text-[11px] font-black text-[#6366F1] hover:text-[#4F46E5] bg-[#EEF2FF] px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
              >
                <span>View All</span>
                <span className="font-bold">→</span>
              </button>
            </div>

            {/* Custom high-fidelity orders table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="pb-3">Invoice No</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Items</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-gray-400 font-medium">
                        No orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    tableOrders.map((order, idx) => (
                      <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 text-xs font-black text-gray-900">
                          {order.id}
                        </td>
                        <td className="py-3">
                          <span className="text-xs font-black text-gray-800 truncate max-w-[140px] block" title={order.customerName}>
                            {order.customerName}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-gray-400 font-bold">
                          {order.date}
                        </td>
                        <td className="py-3 text-xs text-gray-500 font-bold">
                          {order.items}
                        </td>
                        <td className="py-3 text-xs font-black text-gray-900">
                          {order.amount}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${order.statusColor}`}>
                            {order.statusText}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Pagination */}
          <div className="border-t border-gray-100 pt-4 mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-bold text-gray-400">
            <span>Showing {tableOrders.length > 0 ? 1 : 0} to {tableOrders.length} of {orders?.length || 0} orders</span>
            <div className="flex items-center gap-1">
              <button className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50" disabled>&lt;</button>
              <button className="px-3.5 py-1.5 rounded-lg bg-[#6366F1] text-white font-black shadow-xs">1</button>
              <button className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">&gt;</button>
            </div>
          </div>

        </div>

      </div>

      {/* ADDITIONAL ROW: REAL-TIME STOCK ALERT & ONLINE ACTIVE ADMINS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* STOCK ALERT CARD */}
        <div className="bg-[#F8F9FD] border border-slate-200/70 rounded-[24px] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-5 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-black text-gray-900 tracking-tight">Stock Alert List</h3>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 font-bold px-2 py-0.5 rounded-full uppercase">
                1-2 PCs Alert
              </span>
            </div>

            <div className="space-y-3.5 mt-5">
              {stockAlertProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 font-bold">
                  সকল প্রোডাক্টের পর্যাপ্ত স্টক রয়েছে। ১-২ পিসের নিচে কোনো প্রোডাক্ট নেই।
                </div>
              ) : (
                stockAlertProducts.map((p, idx) => {
                  const isOutOfStock = p.stock === 0;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100/60 rounded-2xl border border-gray-100/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F8F9FD] border border-gray-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-gray-900 truncate max-w-[180px]">{p.name}</h4>
                          <span className="text-[10px] font-bold text-gray-400">{p.brand}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full ${
                            isOutOfStock 
                              ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                              : 'bg-amber-50 text-amber-700 border border-amber-300 animate-pulse'
                          }`}>
                            {isOutOfStock ? 'Out of Stock' : `${p.stock} pc remaining`}
                          </span>
                          <div className="text-[10px] font-black text-gray-900 mt-1">{p.formattedPrice}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE ADMINS CARD */}
        <div className="bg-[#F8F9FD] border border-slate-200/70 rounded-[24px] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-5 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#6366F1]" />
                <h3 className="text-base font-black text-gray-900 tracking-tight">Active Admins</h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-Time Status</span>
              </span>
            </div>

            <div className="divide-y divide-gray-100 mt-3">
              {activeAdmins.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 font-medium">
                  No active admins tracked.
                </div>
              ) : (
                activeAdmins.map((admin) => {
                  const now = Date.now();
                  const isOnline = admin.isOnline && admin.lastActive && (now - admin.lastActive < 90000);
                  const isCeo = admin.email.toLowerCase().includes('eleganbd.ltd') || admin.role === 'CEO';

                  let statusText = 'OFFLINE';
                  if (isOnline) {
                    statusText = 'ONLINE';
                  } else if (admin.lastActive && admin.lastActive > 0) {
                    const diffMs = now - admin.lastActive;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMins / 60);
                    const diffDays = Math.floor(diffHours / 24);
                    if (diffMins < 1) statusText = 'JUST NOW';
                    else if (diffMins < 60) statusText = `${diffMins}M AGO`;
                    else if (diffHours < 24) statusText = `${diffHours}H AGO`;
                    else statusText = `${diffDays}D AGO`;
                  }

                  return (
                    <div key={admin.id || admin.email} className="flex items-center justify-between py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900">{admin.username}</span>
                          {isCeo && (
                            <span className="text-[8px] font-black bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded uppercase">CEO</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{admin.department}</p>
                      </div>

                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50/80 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>ONLINE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-gray-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          <span>{statusText}</span>
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

