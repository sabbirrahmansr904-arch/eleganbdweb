/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Archive,
  List,
  PlusSquare,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart, 
  Users, 
  FileText,
  Settings, 
  Image as ImageIcon,
  LogOut, 
  Menu, 
  X, 
  Bell,
  Search,
  Moon,
  Layout,
  User,
  CheckSquare,
  BarChart3,
  Database,
  ShoppingBag,
  History,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '../../contexts/BrandingContext';
import toast from 'react-hot-toast';

export default function AdminLayout() {
  const { logoUrl } = useBranding();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'My Account', path: '/admin/settings', icon: User },
        { name: 'Stock Check', path: '/admin/inventory', icon: CheckSquare },
      ]
    },
    {
      title: 'INVENTORY',
      items: [
        { name: 'Overview', path: '/admin/inventory', icon: BarChart3 },
        { name: 'Master Table', path: '/admin/categories', icon: Database },
        { name: 'Product List', path: '/admin/products', icon: ShoppingBag },
        { name: 'Add Product', path: '/admin/add-product', icon: PlusSquare },
        { name: 'Stock In', path: '/admin/stock-in', icon: ArrowDownToLine },
        { name: 'Stock Out', path: '/admin/stock-out', icon: ArrowUpFromLine },
        { name: 'Inventory Log', path: '/admin/inventory-log', icon: History },
      ]
    },
    {
      title: 'ORDER MANAGEMENT',
      items: [
        { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
        { name: 'Issues', path: '/admin/issues', icon: AlertCircle },
        { name: 'Exchanges', path: '/admin/exchanges', icon: RefreshCw },
        { name: 'Customers', path: '/admin/customers', icon: Users },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Media', path: '/admin/media', icon: ImageIcon },
        { name: 'Visit Storefront', path: '/', icon: ExternalLink },
      ]
    }
  ];

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
                  <div className="w-8 h-8 rounded-xl bg-[#E04622] flex items-center justify-center text-white font-serif text-lg font-black shrink-0 shadow-sm shadow-[#E04622]/20">
                    E
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-extrabold tracking-tight text-sm uppercase text-gray-950 leading-none">
                      Elegan BD Admin
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 mt-1">
                      Secure Console
                    </span>
                  </div>
                </Link>
                <button onClick={() => setIsMobileOpen(false)} className="text-gray-400 hover:text-black p-2 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto no-scrollbar bg-white">
                {menuGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <p className="px-3 text-[9px] font-black text-gray-400 tracking-[0.18em] uppercase mb-2 leading-none">{group.title}</p>
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path || (item.path !== '/admin' && item.path !== '/' && location.pathname.startsWith(item.path));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "flex items-center space-x-3.5 px-3 py-2.5 rounded-xl transition-all font-semibold text-xs tracking-tight",
                            isActive 
                              ? "bg-[#FFF1EF] text-[#D83A1F] shadow-xs" 
                              : "text-[#62758A] hover:text-[#0C1421] hover:bg-[#F8FAFC]"
                          )}
                        >
                          <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive ? "text-[#D83A1F]" : "text-[#7EA0B6]")} />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
              <div className="p-4 border-t border-white/10">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors font-medium text-sm"
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
          "hidden lg:flex flex-col bg-white border-r border-[#F0F2F5] transition-all duration-300 shrink-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.015)]",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="h-20 flex items-center px-6 border-b border-[#F0F2F5] overflow-hidden bg-white shrink-0">
          <Link to="/" className="shrink-0 flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#E04622] flex items-center justify-center text-white font-serif text-lg font-black shrink-0 shadow-sm shadow-[#E04622]/20">
              E
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight text-sm uppercase text-gray-950 leading-none">
                  Elegan BD Admin
                </span>
                <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 mt-1">
                  Secure Console
                </span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3.5 space-y-7 overflow-y-auto no-scrollbar">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              {isSidebarOpen && (
                 <p className="px-3 text-[9px] font-black text-gray-400 tracking-[0.18em] uppercase mb-2 leading-none">{group.title}</p>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/admin' && item.path !== '/' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "flex items-center space-x-3.5 px-3 py-2.5 rounded-xl transition-all group relative font-semibold text-[13px] tracking-tight",
                      isActive 
                        ? "bg-[#FFF1EF] text-[#D83A1F] shadow-sm shadow-[#D83A1F]/5" 
                        : "text-[#62758A] hover:text-[#0C1421] hover:bg-[#F8FAFC]"
                    )}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive ? "text-[#D83A1F]" : "text-[#7EA0B6]")} />
                    {isSidebarOpen && (
                      <span className="truncate">{item.name}</span>
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
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-gray-500 hover:text-red-600 hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <LogOut size={18} strokeWidth={2} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
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
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
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
