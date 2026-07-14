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
  Store,
  Table
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '../../contexts/BrandingContext';
import { useOrders } from '../../contexts/OrderContext';
import { useProducts } from '../../contexts/ProductContext';
import toast from 'react-hot-toast';

export default function AdminLayout() {
  const { logoUrl } = useBranding();
  const { orders } = useOrders();
  const { products } = useProducts();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const unreadCount = React.useMemo(() => {
    const ids: string[] = [];
    orders.forEach(order => {
      ids.push(`order-${order.id}`);
      if (order.status === 'QC') ids.push(`order-qc-${order.id}`);
      if (order.issueType) ids.push(`order-issue-${order.id}`);
    });
    products.forEach(product => {
      ids.push(`product-${product.id}`);
    });

    let readIds: string[] = [];
    try {
      const saved = localStorage.getItem('eleganbd_read_notifications');
      readIds = saved ? JSON.parse(saved) : [];
    } catch (e) {
      readIds = [];
    }

    return ids.filter(id => !readIds.includes(id)).length;
  }, [orders, products]);

  const menuGroups = [
    {
      items: [
        { name: 'Dashboard', path: '/admin', icon: Home },
        { name: 'Customers', path: '/admin/customers', icon: Users },
        { name: 'Orders', path: '/admin/orders', icon: FileText },
        { name: 'Categories', path: '/admin/categories', icon: Folder },
        { name: 'Products', path: '/admin/products', icon: ShoppingBag },
        { name: 'Master Table', path: '/admin/master-table', icon: Table },
      ]
    },
    {
      items: [
        { name: 'General', path: '/admin/settings?tab=General', icon: Store },
        { name: 'Branding', path: '/admin/settings?tab=Branding', icon: Palette },
        { name: 'Banners', path: '/admin/banners', icon: Globe },
        { name: 'Notifications', path: '/admin/notifications', icon: Bell },
      ]
    },
    {
      items: [
        { name: 'Pixel & Analytics', path: '/admin/settings?tab=Pixel & Analytics', icon: Megaphone },
        { name: 'Payments', path: '/admin/settings?tab=Payments', icon: CreditCard },
      ]
    },
    {
      items: [
        { name: 'Settings', path: '/admin/settings?tab=Settings', icon: Settings },
        { name: 'Import / Export', path: '/admin/settings?tab=Import / Export', icon: Download },
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
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans text-black">
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
                    <span className="text-[10px] text-gray-400 mt-1">
                      eleganbd.zobity.com
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
                <span className="text-[10px] text-gray-400 mt-1">
                  eleganbd.zobity.com
                </span>
              </div>
            )}
          </Link>
          
          {isSidebarOpen && (
            <div className="relative shrink-0 flex items-center">
              <Link to="/admin/notifications" className="relative inline-block group">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
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
            <button className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-xl transition-colors border border-gray-100">
              <Moon size={18} />
            </button>
            <Link 
              to="/admin/notifications"
              className="relative p-2 text-gray-400 hover:text-black bg-gray-50 rounded-xl transition-colors border border-gray-100"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none scale-90">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>

  );
}
