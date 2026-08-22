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
  History,
  Coins,
  Database,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Images
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
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

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

  const [userProfile, setUserProfile] = useState<{ name?: string; photoURL?: string; position?: string; department?: string } | null>(null);

  React.useEffect(() => {
    if (!currentUser?.email) return;
    const cleanEmail = currentUser.email.toLowerCase().trim();
    const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Check local storage first for instant render
    try {
      const local = localStorage.getItem('elegan_admin_profiles');
      if (local) {
        const list = JSON.parse(local);
        const found = list.find((p: any) => p.email?.toLowerCase() === cleanEmail);
        if (found) setUserProfile(found);
      }
    } catch (e) {}

    // Realtime Firestore sync with admin_profiles
    let unsubProfile: (() => void) | null = null;
    let unsubPerms: (() => void) | null = null;

    try {
      const docRef = doc(db, 'admin_profiles', emailKey);
      unsubProfile = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(prev => ({ ...prev, ...(docSnap.data() as any) }));
        }
      });
    } catch (e) {}

    // Also listen to admin_permissions in case name or department was set there
    try {
      const permRef = doc(db, 'admin_permissions', cleanEmail);
      unsubPerms = onSnapshot(permRef, (permSnap) => {
        if (permSnap.exists()) {
          const pData = permSnap.data();
          setUserProfile(prev => ({
            ...prev,
            name: prev?.name || pData.name,
            department: pData.department || prev?.department,
            position: pData.position || prev?.position || (pData.department ? `${pData.department.split(' ')[0]} Officer` : undefined)
          }));
        }
      });
    } catch (e) {}

    return () => {
      if (unsubProfile) unsubProfile();
      if (unsubPerms) unsubPerms();
    };
  }, [currentUser?.email]);

  const userInitials = (userProfile?.name?.slice(0, 2) || currentUser?.email?.slice(0, 2) || 'AD').toUpperCase();
  const activeDepartment = userProfile?.position || userProfile?.department || department || (isSuperAdmin ? 'CEO & Founder' : 'Sales Executive Department');
  const userPhoto = userProfile?.photoURL || currentUser?.photoURL || '';

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
    if (permissions.includes('all') || permissions.includes(key)) return true;
    if (key === 'customer-profiler' && permissions.includes('customers')) return true;
    if (key === 'master-table' && permissions.includes('masterTable')) return true;
    if (key === 'inventory-log' && permissions.includes('masterTable')) return true;
    if (key === 'dollar-expense' && permissions.includes('finance')) return true;
    if (key === 'media' && (permissions.includes('media') || permissions.includes('products') || permissions.includes('settings'))) return true;
    if (['categories', 'branding', 'banners', 'notifications', 'media', 'pathao', 'payments', 'admin-access'].includes(key) && permissions.includes('settings')) return true;
    return false;
  };

  const getRequiredPermissionForPath = (path: string): string | null => {
    if (path === '/admin' || path === '/admin/') return 'dashboard';
    if (
      path.startsWith('/admin/all-account') || 
      path.startsWith('/admin/all-accounts') || 
      path.startsWith('/admin/my-account') || 
      path.startsWith('/admin/account')
    ) return 'dashboard';
    if (path.startsWith('/admin/orders')) return 'orders';
    if (path.startsWith('/admin/media')) return 'media';
    if (
      path.startsWith('/admin/products') ||
      path.startsWith('/admin/add-product') ||
      path.startsWith('/admin/edit-product') ||
      path.startsWith('/admin/inventory') ||
      path.startsWith('/admin/fix-sizes')
    ) return 'products';
    if (path.startsWith('/admin/customers')) return 'customer-profiler';
    if (path.startsWith('/admin/customer-profiler')) return 'customer-profiler';
    if (path.startsWith('/admin/exchanges')) return 'exchanges';
    if (path.startsWith('/admin/issues')) return 'issues';
    if (path.startsWith('/admin/master-table')) return 'master-table';
    if (path.startsWith('/admin/inventory-log')) return 'inventory-log';
    if (path.startsWith('/admin/finance')) return 'finance';
    if (path.startsWith('/admin/dollar-expenses')) return 'dollar-expense';
    if (path.startsWith('/admin/settings')) {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get('tab');
      if (tab === 'Categories') return 'categories';
      if (tab === 'Branding') return 'branding';
      if (tab === 'Banners') return 'banners';
      if (tab === 'Notifications') return 'notifications';
      if (tab === 'Courier') return 'pathao';
      if (tab === 'Payments') return 'payments';
      if (tab === 'Admin Access') return 'admin-access';
      return 'settings';
    }
    return null;
  };

  const currentRequiredPerm = getRequiredPermissionForPath(location.pathname);
  const isCurrentRouteAllowed = !currentRequiredPerm || isPermitted(currentRequiredPerm);

  const rawMenuGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/admin', icon: Home, perm: 'dashboard' },
        { name: 'Customer Profiler', path: '/admin/customer-profiler', icon: UserCheck, perm: 'customer-profiler' },
        { name: 'My Account', path: '/admin/my-account', icon: User, perm: 'dashboard' },
        { name: 'All Account', path: '/admin/all-accounts', icon: Users, perm: 'dashboard' },
        { name: 'Categories', path: '/admin/settings?tab=Categories', icon: Folder, perm: 'categories' },
      ]
    },
    {
      title: 'ORDER MANAGEMENT',
      items: [
        { name: 'Orders', path: '/admin/orders', icon: FileText, perm: 'orders' },
        { name: 'Exchanges', path: '/admin/exchanges', icon: RefreshCw, perm: 'exchanges' },
        { name: 'Issues', path: '/admin/issues', icon: MessageCircle, perm: 'issues' },
      ]
    },
    {
      title: 'INVENTORY',
      items: [
        { name: 'Products', path: '/admin/products', icon: ShoppingBag, perm: 'products' },
        { name: 'Master Table', path: '/admin/master-table', icon: Table, perm: 'master-table' },
        { name: 'Inventory Log', path: '/admin/inventory-log', icon: History, perm: 'inventory-log' },
      ]
    },
    {
      title: 'ACCOUNTING',
      items: [
        { name: 'Finance', path: '/admin/finance', icon: DollarSign, perm: 'finance' },
        { name: 'Transaction List', path: '/admin/transaction-list', icon: FileSpreadsheet, perm: 'finance' },
        { name: 'Dollar Expense', path: '/admin/dollar-expenses', icon: Coins, perm: 'dollar-expense' },
        { name: 'Pay Method', path: '/admin/settings?tab=Payments', icon: CreditCard, perm: 'payments' },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Settings', path: '/admin/settings', icon: Settings, perm: 'settings' },
        { name: 'Branding', path: '/admin/settings?tab=Branding', icon: Palette, perm: 'branding' },
        { name: 'Banners', path: '/admin/settings?tab=Banners', icon: Globe, perm: 'banners' },
        { name: 'Notifications', path: '/admin/settings?tab=Notifications', icon: Bell, perm: 'notifications' },
        { name: 'Media', path: '/admin/media', icon: Images, perm: 'media' },
      ]
    },
    {
      title: 'ACCESS',
      items: [
        { name: 'Admin Access', path: '/admin/settings?tab=Admin Access', icon: Lock, perm: 'admin-access' },
      ]
    }
  ];

  const menuGroups = rawMenuGroups.map(group => ({
    title: group.title,
    items: group.items.filter(item => isPermitted(item.perm || 'dashboard'))
  })).filter(group => group.items.length > 0);

  const getIsActive = (itemPath: string) => {
    const currentTabVal = new URLSearchParams(location.search).get('tab');
    if (itemPath.includes('?')) {
      const [pathPart, queryPart] = itemPath.split('?');
      const params = new URLSearchParams(queryPart);
      const tabVal = params.get('tab');
      return location.pathname === pathPart && tabVal === currentTabVal;
    }
    if (itemPath === '/admin/settings') {
      return location.pathname === '/admin/settings' && !currentTabVal;
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
    <div className="flex h-screen bg-[#EAEFF5] overflow-hidden font-sans text-black">
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
               className="fixed inset-y-0 left-0 w-72 bg-[#EAEFF5] z-[70] lg:hidden flex flex-col shadow-2xl border-r border-[#DCE4EE]"
            >
              <div className="p-3 border-b border-[#DCE4EE] bg-[#EAEFF5]">
                <div className="flex items-center justify-between p-2.5 bg-[#E6ECF4] rounded-2xl border border-white/90 shadow-[-4px_-4px_10px_rgba(255,255,255,0.95),4px_4px_12px_rgba(165,180,205,0.32)]">
                  <Link to="/" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="font-black text-slate-900 text-base">EB</span>}
                    </div>
                    <span className="font-black tracking-tight text-sm text-slate-900 truncate">
                      Elegan Admin
                    </span>
                  </Link>
                  <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-xl bg-[#E6ECF4] hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <nav className="flex-1 py-4 px-4 space-y-4 overflow-y-auto no-scrollbar bg-[#EAEFF5]">
                {menuGroups.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {group.title && (
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 pt-2 pb-1">
                        {group.title}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const isActive = getIsActive(item.path);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              "flex items-center space-x-3 px-3.5 py-2.5 rounded-[18px] transition-all font-bold text-xs tracking-tight",
                              isActive 
                                ? "bg-[#E6ECF4] text-slate-900 shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),5px_5px_12px_rgba(165,180,205,0.35)] border border-white/80" 
                                : "text-gray-600 hover:text-black hover:bg-[#E6ECF4] hover:shadow-[-3px_-3px_8px_rgba(255,255,255,0.9),3px_3px_8px_rgba(165,180,205,0.25)]"
                            )}
                          >
                            <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} className={cn(isActive ? "text-[#f97316]" : "text-gray-500")} />
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
              <div className="p-3.5 border-t border-[#DCE4EE] bg-[#EAEFF5]">
                <div className="flex items-center gap-3 mb-3 p-2.5 bg-[#E6ECF4] rounded-2xl border border-white/90 shadow-[-4px_-4px_10px_rgba(255,255,255,0.95),4px_4px_12px_rgba(165,180,205,0.32)]">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="User Profile" className="w-9 h-9 rounded-full object-cover border border-white shrink-0 shadow-inner" />
                  ) : (
                    <div className="w-9 h-9 bg-[#1E293B] text-white rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
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
                    className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E6ECF4] hover:bg-[#DEE5F0] text-slate-800 font-bold text-xs transition-all border border-white/90 shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)]"
                  >
                    <Store size={15} className="text-slate-700" />
                    <span>Store</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E6ECF4] hover:bg-[#FEE2E2] text-red-600 font-bold text-xs transition-all border border-white/90 shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)] cursor-pointer"
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
          "hidden lg:flex flex-col bg-[#EAEFF5] border-r border-[#DCE4EE] transition-all duration-300 shrink-0 z-50 sticky top-0 h-screen",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-3 border-b border-[#DCE4EE] bg-[#EAEFF5] shrink-0 relative">
          {isSidebarOpen ? (
            <button 
              onClick={toggleSidebar}
              className="w-full flex items-center justify-between p-2.5 bg-[#E6ECF4] hover:bg-[#DEE5F0] rounded-2xl border border-white/90 shadow-[-4px_-4px_10px_rgba(255,255,255,0.95),4px_4px_12px_rgba(165,180,205,0.32)] transition-all cursor-pointer group text-left"
              title="Click to collapse sidebar"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="font-black text-slate-900 text-base">EB</span>
                  )}
                </div>
                <span className="font-black tracking-tight text-sm text-slate-900 truncate">
                  Elegan Admin
                </span>
              </div>
              <div className="w-6 h-6 rounded-full bg-[#E6ECF4] flex items-center justify-center text-slate-500 group-hover:text-slate-800 shadow-[-2px_-2px_5px_rgba(255,255,255,0.9),2px_2px_5px_rgba(165,180,205,0.25)] border border-white/80 shrink-0">
                <ChevronLeft size={14} />
              </div>
            </button>
          ) : (
            <button 
              onClick={toggleSidebar}
              className="w-12 h-12 flex items-center justify-center bg-[#E6ECF4] hover:bg-[#DEE5F0] rounded-2xl border border-white/90 shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)] transition-all cursor-pointer mx-auto group"
              title="Click to expand sidebar"
            >
              <div className="w-7 h-7 flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="font-black text-slate-900 text-sm">EB</span>
                )}
              </div>
            </button>
          )}
        </div>

        <nav className="flex-1 py-4 px-3.5 space-y-3 overflow-y-auto no-scrollbar bg-[#EAEFF5]">
          {menuGroups.map((group, gIdx) => (
            <React.Fragment key={gIdx}>
              {group.title && isSidebarOpen && (
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 pt-2 pb-1">
                  {group.title}
                </p>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const isActive = getIsActive(item.path);
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={cn(
                        "flex items-center space-x-3 px-3.5 py-2.5 rounded-[18px] transition-all group relative font-bold text-xs tracking-tight",
                        isActive 
                          ? "bg-[#E6ECF4] text-slate-900 shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),5px_5px_12px_rgba(165,180,205,0.35)] border border-white/80" 
                          : "text-gray-600 hover:text-black hover:bg-[#E6ECF4] hover:shadow-[-3px_-3px_8px_rgba(255,255,255,0.9),3px_3px_8px_rgba(165,180,205,0.25)]"
                      )}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className={cn(isActive ? "text-[#f97316]" : "text-gray-500")} />
                      {isSidebarOpen && (
                        <span className="truncate flex-1 text-left">{item.name}</span>
                      )}
                      {isSidebarOpen && item.badge && (
                        <span className="text-[9px] bg-[#EEF2FF] text-[#4F46E5] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                          {item.badge}
                        </span>
                      )}
                      {!isSidebarOpen && (
                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-white text-black text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white">
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
        <div className="p-3 border-t border-[#DCE4EE] bg-[#EAEFF5] shrink-0">
          {isSidebarOpen ? (
            <div className="space-y-2">
              <Link 
                to="/admin/my-account"
                className="flex items-center gap-2.5 p-2 bg-[#E6ECF4] hover:bg-[#DEE5F0] rounded-2xl border border-white/90 shadow-[-4px_-4px_10px_rgba(255,255,255,0.95),4px_4px_12px_rgba(165,180,205,0.32)] transition-all group"
                title="Go to My Account Profile"
              >
                {userPhoto ? (
                  <img src={userPhoto} alt="User Profile" className="w-9 h-9 rounded-full object-cover border border-white shrink-0 shadow-inner" />
                ) : (
                  <div className="w-9 h-9 bg-[#1E293B] text-white rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-gray-900 truncate" title={currentUser?.email || ''}>{userProfile?.name || currentUser?.email || 'Admin User'}</p>
                  <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border truncate max-w-full ${getDepartmentBadgeStyle(activeDepartment)}`}>
                    {activeDepartment}
                  </span>
                </div>
              </Link>
              <div className="flex items-center gap-2 mt-2">
                <Link 
                  to="/" 
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E6ECF4] hover:bg-[#DEE5F0] text-slate-800 font-bold text-xs transition-all border border-white/90 shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)]"
                >
                  <Store size={15} className="text-slate-700" />
                  <span>Store</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E6ECF4] hover:bg-[#FEE2E2] text-red-600 font-bold text-xs transition-all border border-white/90 shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)] cursor-pointer"
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
                className="w-10 h-10 bg-[#1E293B] text-white rounded-full flex items-center justify-center font-black text-xs hover:scale-105 transition-all shadow-xs overflow-hidden"
              >
                {userPhoto ? (
                  <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </button>
              <button 
                onClick={handleLogout}
                title="Logout"
                className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#EAEFF5]">
        {/* Header */}
        <header className="h-20 bg-[#EAEFF5]/90 backdrop-blur-md border-b border-[#DCE4EE] flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleSidebar}
              className="text-black bg-[#E6ECF4] hover:bg-[#DEE5F0] transition-colors p-2.5 rounded-2xl border border-white/90 shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)] cursor-pointer"
            >
              {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* Store & Sign Out Action Buttons */}
            <Link 
              to="/" 
              title="Visit Store Front"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E6ECF4] hover:bg-[#DEE5F0] text-slate-800 font-bold text-xs transition-all border border-white/90 shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)]"
            >
              <Store size={15} className="text-slate-700" />
              <span>Store</span>
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out Account"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E6ECF4] hover:bg-[#FEE2E2] text-red-600 font-bold text-xs transition-all border border-white/90 shadow-[-3px_-3px_8px_rgba(255,255,255,0.95),3px_3px_8px_rgba(165,180,205,0.3)] cursor-pointer"
            >
              <LogOut size={15} className="text-red-600" />
              <span>Sign Out</span>
            </button>

            <div className="h-8 w-[1px] bg-slate-300/60 mx-1 hidden sm:block"></div>
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-all p-1.5 rounded-2xl border border-transparent hover:border-gray-200 hover:bg-gray-50"
              >
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-black text-gray-900 leading-tight truncate max-w-[160px]">
                    {userProfile?.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Admin User')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mt-0.5 ${getDepartmentBadgeStyle(activeDepartment)}`}>
                    {activeDepartment}
                  </span>
                </div>
                {userPhoto ? (
                  <img src={userPhoto} alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 shadow-2xs" />
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
                    className="absolute right-0 mt-3 w-80 sm:w-88 bg-[#F8F9FD] dark:bg-[#121824] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-5 z-[100] text-left"
                  >
                    <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100 dark:border-gray-800">
                      {userPhoto ? (
                        <img src={userPhoto} alt="Profile" className="w-12 h-12 rounded-2xl object-cover border-2 border-gray-200 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-md">
                          {userInitials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-gray-900 dark:text-white truncate" title={currentUser?.email || ''}>
                          {userProfile?.name || currentUser?.email || 'Admin User'}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">{currentUser?.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getDepartmentBadgeStyle(activeDepartment)}`}>
                            {activeDepartment}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="py-4 space-y-3.5">
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to="/admin/my-account"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 hover:border-blue-500 rounded-xl text-xs font-bold text-gray-800 hover:text-blue-600 transition-all shadow-2xs"
                        >
                          <User size={14} className="text-blue-600" />
                          <span>My Account</span>
                        </Link>
                        <Link
                          to="/admin/all-accounts"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 hover:border-blue-500 rounded-xl text-xs font-bold text-gray-800 hover:text-blue-600 transition-all shadow-2xs"
                        >
                          <Users size={14} className="text-blue-600" />
                          <span>All Account</span>
                        </Link>
                      </div>

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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar scroll-smooth bg-[#EAEFF5] admin-page-container">
          {isCurrentRouteAllowed ? (
            <Outlet />
          ) : (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center min-h-[60vh] bg-[#F8F9FD] dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm my-auto">
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
                className="bg-black hover:bg-brand-gold hover:text-black text-white dark:bg-[#F8F9FD] dark:text-black transition-all px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md flex items-center gap-2"
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
