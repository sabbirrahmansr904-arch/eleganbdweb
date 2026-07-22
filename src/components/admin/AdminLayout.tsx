/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  Home,
  Users,
  FileText,
  ShoppingCart,
  Folder,
  ShoppingBag,
  Paintbrush,
  Palette,
  File,
  Layout,
  Globe,
  Megaphone,
  Tag,
  Search,
  MessageSquare,
  Phone,
  CreditCard,
  Truck,
  User,
  Settings,
  Download,
  HelpCircle,
  MessageCircle,
  LogOut, 
  Menu, 
  X, 
  Bell,
  Moon,
  Sun,
  Store,
  Table,
  Lock,
  CheckSquare,
  AlertCircle,
  Package,
  DollarSign,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { cn, formatPrice } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '../../contexts/BrandingContext';
import { useOrders } from '../../contexts/OrderContext';
import { useProducts } from '../../contexts/ProductContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminLayout() {
  const { logoUrl } = useBranding();
  const { orders } = useOrders();
  const { products } = useProducts();
  const { currentUser, isSuperAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { currency, rate } = useCurrency();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('eleganbd_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('eleganbd_read_notifications', JSON.stringify(readIds));
  }, [readIds]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('eleganbd_dark_mode');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('eleganbd_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const notifications = React.useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      message: string;
      time: Date;
      icon: React.ElementType;
      color: string;
      link: string;
    }> = [];

    orders.forEach(order => {
      items.push({
        id: `order-${order.id}`,
        title: `New Order Received`,
        message: `Order #${order.id.slice(-6).toUpperCase()} placed for ${order.items.length} items totaling ${formatPrice(order.total, currency, rate)}.`,
        time: new Date(order.createdAt),
        icon: ShoppingBag,
        color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
        link: '/admin/orders'
      });

      if (order.status === 'QC') {
        items.push({
          id: `order-qc-${order.id}`,
          title: `Order QC Passed`,
          message: `Order #${order.id.slice(-6).toUpperCase()} (${order.customerName}) has passed Quality Check.`,
          time: order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt),
          icon: CheckSquare,
          color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
          link: '/admin/orders'
        });
      }

      if (order.issueType) {
        items.push({
          id: `order-issue-${order.id}`,
          title: `Order Issue: ${order.issueType}`,
          message: `Internal issue raised for Order #${order.id.slice(-6).toUpperCase()} (${order.customerName}).`,
          time: order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt),
          icon: AlertCircle,
          color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
          link: '/admin/issues'
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
        color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
        link: '/admin/products'
      });
    });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [orders, products, currency, rate]);

  const unreadCount = React.useMemo(() => {
    return notifications.filter(n => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const menuGroups = [
    {
      items: [
        { name: 'Dashboard', path: '/admin', icon: Home },
        { name: 'Customers', path: '/admin/customers', icon: Users },
        { name: 'Customer Profiler', path: '/admin/customer-profiler', icon: UserCheck },
        { name: 'Orders', path: '/admin/orders', icon: FileText },
        { name: 'Exchanges', path: '/admin/exchanges', icon: RefreshCw },
        { name: 'Categories', path: '/admin/settings?tab=Categories', icon: Folder },
        { name: 'Products', path: '/admin/products', icon: ShoppingBag },
        { name: 'Issues', path: '/admin/issues', icon: MessageCircle },
        { name: 'Master Table', path: '/admin/master-table', icon: Table },
      ]
    },
    {
      items: [
        { name: 'Settings', path: '/admin/settings', icon: Settings },
        { name: 'General', path: '/admin/settings?tab=General', icon: Store },
        { name: 'Branding', path: '/admin/settings?tab=Branding', icon: Palette },
        { name: 'Banners', path: '/admin/settings?tab=Banners', icon: Globe },
        { name: 'Notifications', path: '/admin/settings?tab=Notifications', icon: Bell },
        { name: 'Pathao Courier', path: '/admin/settings?tab=Courier', icon: Truck },
      ]
    },
    {
      items: [
        { name: 'Payments', path: '/admin/settings?tab=Payments', icon: CreditCard },
        { name: 'Partnership', path: '/admin/finance?tab=partnership', icon: Users },
        { name: 'Bank', path: '/admin/finance?tab=bank', icon: DollarSign },
        { name: 'Expenses', path: '/admin/expenses', icon: CreditCard },
      ]
    },
    {
      items: [
        ...(isSuperAdmin ? [{ name: 'Admin Access', path: '/admin/settings?tab=Admin Access', icon: Lock }] : []),
      ]
    }
  ];

  const getIsActive = (itemPath: string) => {
    if (itemPath.includes('?')) {
      const [pathPart, queryPart] = itemPath.split('?');
      const params = new URLSearchParams(queryPart);
      const tabVal = params.get('tab');
      const currentTabVal = new URLSearchParams(location.search).get('tab');
      return location.pathname === pathPart && tabVal === currentTabVal;
    }
    return location.pathname === itemPath || (itemPath !== '/admin' && itemPath !== '/' && location.pathname.startsWith(itemPath));
  };

  const handleLogout = () => {
    toast.success('Signed out successfully.');
    navigate('/');
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      toast.success('Searching...');
    }
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-black">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsMobileOpen(false)}
               className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside
               initial={{ x: '-100%' }}
               animate={{ x: 0 }}
               exit={{ x: '-100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="fixed inset-y-0 left-0 w-72 bg-white z-[70] lg:hidden flex flex-col shadow-2xl border-r border-[#F0F2F5]"
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-[#F0F2F5] bg-white text-black">
                <Link to="/" onClick={() => setIsMobileOpen(false)} className="shrink-0 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#E01E22] flex items-center justify-center text-white font-sans text-xl font-bold shrink-0 shadow-sm">
                    E
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold tracking-tight text-sm text-gray-900 leading-none">
                      Elegan BD
                    </span>
                  </div>
                </Link>
                <button onClick={() => setIsMobileOpen(false)} className="text-gray-400 hover:text-black p-2 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 py-4 px-4 space-y-4 overflow-y-auto no-scrollbar bg-white">
                {menuGroups.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {gIdx > 0 && <hr className="border-gray-100 my-2" />}
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = getIsActive(item.path);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              "flex items-center space-x-3.5 px-3 py-2.5 rounded-xl transition-all font-semibold text-xs tracking-tight",
                              isActive 
                                ? "bg-[#4F46E5] text-white shadow-xs" 
                                : "text-gray-600 hover:text-black hover:bg-gray-50"
                            )}
                          >
                            <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} className={cn(isActive ? "text-white" : "text-gray-500")} />
                            <span className="flex-1 text-left">{item.name}</span>
                            {item.badge && (
                              <span className="text-[10px] bg-[#EEF2FF] text-[#4F46E5] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </React.Fragment>
                ))}
              </nav>
              <div className="p-4 border-t border-gray-100 bg-white">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-red-500 transition-colors font-medium text-sm"
                >
                  <LogOut size={18} strokeWidth={2} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col bg-white border-r border-[#EFF2F6] transition-all duration-300 shrink-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.008)]",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-[#EFF2F6] overflow-hidden bg-white shrink-0">
          <Link to="/" className="shrink-0 flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#E01E22] flex items-center justify-center text-white font-sans text-xl font-bold shrink-0 shadow-sm">
              E
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col text-left">
                <span className="font-bold tracking-tight text-sm text-gray-900 leading-none">
                  Elegan BD
                </span>
              </div>
            )}
          </Link>
          
          {isSidebarOpen && (
            <div className="relative shrink-0 flex items-center">
              <Link to="/admin/settings?tab=Notifications" className="relative inline-block group" title="Notification Settings">
                <Bell size={18} className="text-gray-400 hover:text-black transition-colors cursor-pointer" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-[8px] font-bold text-white px-1 py-0.25 rounded-full leading-none scale-90">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-3.5 space-y-4 overflow-y-auto no-scrollbar bg-white">
          {menuGroups.map((group, gIdx) => (
            <React.Fragment key={gIdx}>
              {gIdx > 0 && isSidebarOpen && <hr className="border-gray-100 my-2" />}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = getIsActive(item.path);
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all group relative font-semibold text-xs tracking-tight",
                        isActive 
                          ? "bg-[#4F46E5] text-white shadow-xs" 
                          : "text-gray-600 hover:text-black hover:bg-gray-50"
                      )}
                    >
                      <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} className={cn(isActive ? "text-white" : "text-gray-500")} />
                      {isSidebarOpen && (
                        <span className="truncate flex-1 text-left">{item.name}</span>
                      )}
                      {isSidebarOpen && item.badge && (
                        <span className="text-[9px] bg-[#EEF2FF] text-[#4F46E5] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                          {item.badge}
                        </span>
                      )}
                      {!isSidebarOpen && (
                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-white text-black text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-100">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </nav>


      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleSidebar}
              className="text-black bg-gray-50 hover:bg-gray-100 transition-colors p-2 rounded-lg border border-gray-100"
            >
              {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Search anything..."
                onKeyDown={handleSearch}
                className="bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-brand-gold outline-none w-72 transition-all text-black"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
              className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-xl transition-colors border border-gray-100 cursor-pointer flex items-center justify-center"
            >
              {isDarkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
            </button>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
                className="relative p-2 text-gray-400 hover:text-black bg-gray-50 rounded-xl transition-colors border border-gray-100 cursor-pointer flex items-center justify-center"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none scale-90">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#121824] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-[100]"
                  >
                    <div className="p-4 bg-gray-50 dark:bg-[#182235] border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-gray-700 dark:text-gray-300" />
                        <span className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const allIds = notifications.map(n => n.id);
                            setReadIds(allIds);
                            toast.success('All notifications marked as read.');
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-extrabold uppercase tracking-widest transition-colors cursor-pointer bg-transparent border-none"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto no-scrollbar py-1">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                          <Bell size={32} className="mx-auto mb-3 opacity-30" />
                          <p className="text-xs">No notifications yet.</p>
                        </div>
                      ) : (
                        notifications.slice(0, 15).map((n) => {
                          const isRead = readIds.includes(n.id);
                          const IconComponent = n.icon;
                          return (
                            <div 
                              key={n.id}
                              onClick={() => {
                                if (!isRead) {
                                  setReadIds(prev => [...prev, n.id]);
                                }
                                setShowNotifications(false);
                                navigate(n.link);
                              }}
                              className={cn(
                                "p-3.5 border-b border-gray-50 dark:border-gray-800/50 flex gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer relative",
                                !isRead && "bg-indigo-50/10 dark:bg-indigo-950/5"
                              )}
                            >
                              {!isRead && (
                                <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-600 rounded-full" />
                              )}
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-transparent", n.color)}>
                                <IconComponent size={15} />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                  {n.title}
                                </h4>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                  {n.message}
                                </p>
                                <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 block font-medium">
                                  {formatDistanceToNow(n.time, { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-[#182235] border-t border-gray-100 dark:border-gray-800 text-center">
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          navigate('/admin/settings?tab=Notifications');
                        }}
                        className="text-[10px] text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white font-black uppercase tracking-widest transition-colors cursor-pointer bg-transparent border-none"
                      >
                        View all notification settings
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-[1px] bg-gray-100 mx-2 hidden sm:block"></div>
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-black leading-none">Admin</span>
                <span className="text-[10px] text-gray-400 font-medium">Administrator</span>
              </div>
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-black font-bold border-2 border-gray-100 shadow-sm">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>

  );
}
