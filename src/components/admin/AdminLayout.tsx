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
  UserCheck,
  History
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
  const { currentUser, isSuperAdmin, department, permissions = [], signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { currency, rate } = useCurrency();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  const userInitials = (currentUser?.email ? currentUser.email.slice(0, 2) : 'AD').toUpperCase();
  const activeDepartment = department || (isSuperAdmin ? 'CEO & Founder' : 'Sales Executive Department');

  const getDepartmentBadgeStyle = (dept: string) => {
    if (dept.includes('CEO') || dept.includes('Founder')) {
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700';
    }
    if (dept.includes('Sales')) {
      return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700';
    }
    if (dept.includes('Inventory') || dept.includes('Stock')) {
      return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700';
    }
    if (dept.includes('Issue') || dept.includes('Support')) {
      return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700';
    }
    if (dept.includes('QC') || dept.includes('Quality')) {
      return 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-700';
    }
    if (dept.includes('Delivery') || dept.includes('Logistics')) {
      return 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-700';
    }
    if (dept.includes('Accounts') || dept.includes('Finance')) {
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700';
    }
    return 'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600';
  };

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
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
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

  const isPermitted = (key: string) => {
    if (isSuperAdmin) return true;
    if (key === 'dashboard') return true;
    if (!permissions || permissions.length === 0) return false;
    return permissions.includes(key) || permissions.includes('all');
  };

  const getRequiredPermissionForPath = (path: string): string | null => {
    if (path === '/admin' || path === '/admin/') return 'dashboard';
    if (path.startsWith('/admin/orders')) return 'orders';
    if (
      path.startsWith('/admin/products') ||
      path.startsWith('/admin/add-product') ||
      path.startsWith('/admin/edit-product') ||
      path.startsWith('/admin/stock-in') ||
      path.startsWith('/admin/stock-out') ||
      path.startsWith('/admin/inventory') ||
      path.startsWith('/admin/media') ||
      path.startsWith('/admin/fix-sizes')
    ) return 'products';
    if (path.startsWith('/admin/customers') || path.startsWith('/admin/customer-profiler')) return 'customers';
    if (path.startsWith('/admin/exchanges')) return 'exchanges';
    if (path.startsWith('/admin/issues')) return 'issues';
    if (path.startsWith('/admin/master-table') || path.startsWith('/admin/inventory-log')) return 'masterTable';
    if (path.startsWith('/admin/settings')) return 'settings';
    if (path.startsWith('/admin/finance') || path.startsWith('/admin/expenses')) return 'finance';
    return null;
  };

  const currentRequiredPerm = getRequiredPermissionForPath(location.pathname);
  const isCurrentRouteAllowed = !currentRequiredPerm || isPermitted(currentRequiredPerm);

  const rawMenuGroups = [
    {
      items: [
        { name: 'Dashboard', path: '/admin', icon: Home, perm: 'dashboard' },
        { name: 'Customer Profiler', path: '/admin/customer-profiler', icon: UserCheck, perm: 'customers' },
        { name: 'Orders', path: '/admin/orders', icon: FileText, perm: 'orders' },
        { name: 'Exchanges', path: '/admin/exchanges', icon: RefreshCw, perm: 'exchanges' },
        { name: 'Categories', path: '/admin/settings?tab=Categories', icon: Folder, perm: 'products' },
        { name: 'Products', path: '/admin/products', icon: ShoppingBag, perm: 'products' },
        { name: 'Issues', path: '/admin/issues', icon: MessageCircle, perm: 'issues' },
        { name: 'Master Table', path: '/admin/master-table', icon: Table, perm: 'masterTable' },
        { name: 'Inventory Log', path: '/admin/inventory-log', icon: History, perm: 'masterTable' },
      ]
    },
    {
      items: [
        { name: 'Settings', path: '/admin/settings', icon: Settings, perm: 'settings' },
        { name: 'Branding', path: '/admin/settings?tab=Branding', icon: Palette, perm: 'settings' },
        { name: 'Banners', path: '/admin/settings?tab=Banners', icon: Globe, perm: 'settings' },
        { name: 'Offers Settings', path: '/admin/settings?tab=Offers', icon: Tag, perm: 'settings' },
        { name: 'Notifications', path: '/admin/settings?tab=Notifications', icon: Bell, perm: 'settings' },
        { name: 'Pathao Courier', path: '/admin/settings?tab=Courier', icon: Truck, perm: 'settings' },
      ]
    },
    {
      items: [
        { name: 'Payments', path: '/admin/settings?tab=Payments', icon: CreditCard, perm: 'settings' },
        { name: 'Bank', path: '/admin/finance', icon: DollarSign, perm: 'finance' },
        { name: 'Expenses', path: '/admin/expenses', icon: CreditCard, perm: 'finance' },
      ]
    },
    {
      items: [
        ...(isSuperAdmin ? [{ name: 'Admin Access', path: '/admin/settings?tab=Admin Access', icon: Lock, perm: 'settings' }] : []),
      ]
    }
  ];

  const menuGroups = rawMenuGroups.map(group => ({
    items: group.items.filter(item => isPermitted(item.perm || 'dashboard'))
  })).filter(group => group.items.length > 0);

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

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully.');
      navigate('/');
    } catch (e) {
      toast.error('Error signing out.');
    }
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
              <div className="p-3.5 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-3 p-2 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="User Profile" className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      {userInitials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-gray-900 truncate" title={currentUser?.email || ''}>{currentUser?.email || 'Admin User'}</p>
                    <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border truncate max-w-full ${getDepartmentBadgeStyle(activeDepartment)}`}>
                      {activeDepartment}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link 
                    to="/" 
                    onClick={() => setIsMobileOpen(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#EBF1F6] hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all border border-slate-200/60"
                  >
                    <Store size={15} className="text-slate-700" />
                    <span>Store</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FFF0F0] hover:bg-red-100 text-red-600 font-bold text-xs transition-all border border-red-200/60"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
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

        {/* Desktop Sidebar Profile Footer */}
        <div className="p-3 border-t border-gray-100 bg-white shrink-0">
          {isSidebarOpen ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2 bg-gray-50/80 rounded-2xl border border-gray-200/60 shadow-2xs">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="User Profile" className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-gray-900 truncate" title={currentUser?.email || ''}>{currentUser?.email || 'Admin User'}</p>
                  <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border truncate max-w-full ${getDepartmentBadgeStyle(activeDepartment)}`}>
                    {activeDepartment}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Link 
                  to="/" 
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#EBF1F6] hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all border border-slate-200/60"
                >
                  <Store size={15} className="text-slate-700" />
                  <span>Store</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FFF0F0] hover:bg-red-100 text-red-600 font-bold text-xs transition-all border border-red-200/60 cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setShowProfileDropdown(true)}
                title={`${currentUser?.email} (${activeDepartment})`}
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black text-xs hover:scale-105 transition-all shadow-2xs"
              >
                {userInitials}
              </button>
              <button 
                onClick={handleLogout}
                title="Logout"
                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>

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

          <div className="flex items-center space-x-3">
            {/* Store & Sign Out Action Buttons */}
            <Link 
              to="/" 
              title="Visit Store Front"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EBF1F6] hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all border border-slate-200/60 shadow-2xs"
            >
              <Store size={15} className="text-slate-700" />
              <span>Store</span>
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out Account"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFF0F0] hover:bg-red-100 text-red-600 font-bold text-xs transition-all border border-red-200/60 shadow-2xs cursor-pointer"
            >
              <LogOut size={15} className="text-red-600" />
              <span>Sign Out</span>
            </button>

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
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-all p-1.5 rounded-2xl border border-transparent hover:border-gray-200 hover:bg-gray-50"
              >
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-black text-gray-900 leading-tight truncate max-w-[160px]">
                    {currentUser?.email ? currentUser.email.split('@')[0] : 'Admin User'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mt-0.5 ${getDepartmentBadgeStyle(activeDepartment)}`}>
                    {activeDepartment}
                  </span>
                </div>
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 shadow-2xs" />
                ) : (
                  <div className="w-9.5 h-9.5 bg-black text-white rounded-full flex items-center justify-center font-black text-xs border-2 border-gray-100 shadow-2xs">
                    {userInitials}
                  </div>
                )}
              </button>

              {/* Profile Dropdown / Modal */}
              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    className="absolute right-0 mt-3 w-80 sm:w-88 bg-white dark:bg-[#121824] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-5 z-[100] text-left"
                  >
                    <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100 dark:border-gray-800">
                      {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} alt="Profile" className="w-12 h-12 rounded-2xl object-cover border-2 border-gray-200 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-md">
                          {userInitials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-gray-900 dark:text-white truncate" title={currentUser?.email || ''}>
                          {currentUser?.email || 'Admin User'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getDepartmentBadgeStyle(activeDepartment)}`}>
                            {activeDepartment}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="py-4 space-y-3.5">
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                          Account Role & Access
                        </p>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {isSuperAdmin ? '👑 Super Admin (Full Access)' : '🔑 Authorized Admin User'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                          Authorized System Modules ({permissions.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                          {permissions.map((perm) => (
                            <span key={perm} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-[10px] font-bold capitalize">
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                      <Link 
                        to="/admin/settings" 
                        onClick={() => setShowProfileDropdown(false)}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        Manage Settings
                      </Link>

                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          handleLogout();
                        }}
                        className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar scroll-smooth">
          {isCurrentRouteAllowed ? (
            <Outlet />
          ) : (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center min-h-[60vh] bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm my-auto">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mb-4 shadow-md">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                Access Restricted • এক্সেস সীমিত
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
                আপনার এডমিন অ্যাকাউন্টে এই মডিউলটি ({currentRequiredPerm?.toUpperCase()}) ব্যবহারের পারমিশন দেওয়া হয়নি। আপনি শুধুমাত্র আপনার জন্য নির্ধারিত অনুমোদিত মডিউলে কাজ করতে পারবেন।
              </p>
              <Link
                to="/admin"
                className="bg-black hover:bg-brand-gold hover:text-black text-white dark:bg-white dark:text-black transition-all px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md flex items-center gap-2"
              >
                <Home size={16} /> Return to Admin Dashboard
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>

  );
}
