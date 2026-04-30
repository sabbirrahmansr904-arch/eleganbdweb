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
  Moon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
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
      ]
    },
    {
      title: 'INVENTORY',
      items: [
        { name: 'Overview', path: '/admin/inventory/overview', icon: Archive },
        { name: 'Master Table', path: '/admin/products', icon: List },
        { name: 'Product List', path: '/admin/products', icon: List },
        { name: 'Add Product', path: '/admin/products/add', icon: PlusSquare },
        { name: 'Inventory Log', path: '/admin/inventory/log', icon: FileText },
      ]
    },
    {
      title: 'ORDER MANAGEMENT',
      items: [
        { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
        { name: 'Exchanges', path: '/admin/exchanges', icon: ShoppingCart },
        { name: 'Customers', path: '/admin/customers', icon: Users },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Update Logo', path: '/admin/settings?tab=Branding', icon: ImageIcon },
        { name: 'Banners', path: '/admin/banners', icon: FileText },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
        { name: 'Media', path: '/admin/media', icon: FileText },
        { name: 'Visit Storefront', path: '/', icon: LayoutDashboard },
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
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
              className="fixed inset-y-0 left-0 w-72 bg-black z-[70] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
              <div className="flex items-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain brightness-0 invert" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <div className="flex flex-col gap-[2px] mr-3">
                      <div className="h-[2px] w-4 bg-white" />
                      <div className="h-[2px] w-[10px] bg-white translate-x-[-1px]" />
                      <div className="h-[2px] w-4 bg-white" />
                    </div>
                    <span className="font-black text-xl italic tracking-tighter uppercase text-white">
                      Elegan BD
                    </span>
                  </>
                )}
              </div>
                <button onClick={() => setIsMobileOpen(false)} className="text-zinc-400 hover:text-white p-2 transition-colors">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto no-scrollbar">
                {menuGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1">
                    <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{group.title}</p>
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path || (item.path !== '/admin' && item.path !== '/' && location.pathname.startsWith(item.path));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm",
                            isActive 
                              ? "bg-white/10 text-white shadow-sm" 
                              : "text-zinc-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
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
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-red-400 transition-colors font-medium text-sm"
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
          "hidden lg:flex flex-col bg-black border-r border-white/10 transition-all duration-300 shrink-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="h-20 flex items-center px-6 border-b border-white/10 overflow-hidden">
          <Link to="/" className="shrink-0 flex items-center min-w-0">
            {isSidebarOpen && (
              <div className="flex flex-col gap-[2px] mr-3">
                <div className="h-[2px] w-4 bg-white" />
                <div className="h-[2px] w-[10px] bg-white translate-x-[-1px]" />
                <div className="h-[2px] w-4 bg-white" />
              </div>
            )}
            <span className={cn(
              "font-black italic tracking-tighter uppercase text-white transition-all duration-300",
              isSidebarOpen ? "text-xl" : "text-[10px]"
            )}>
              {isSidebarOpen ? 'Elegan BD' : 'EB'}
            </span>
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto no-scrollbar">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {isSidebarOpen && (
                 <p className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{group.title}</p>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/admin' && item.path !== '/' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all group relative font-medium text-sm",
                      isActive 
                        ? "bg-white/10 text-white shadow-sm" 
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    {isSidebarOpen && (
                      <span className="truncate">{item.name}</span>
                    )}
                    {!isSidebarOpen && (
                      <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                        {item.name}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors font-medium text-sm"
          >
            <LogOut size={18} strokeWidth={2} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleSidebar}
              className="text-white bg-black hover:bg-slate-900 transition-colors p-2 rounded-lg"
            >
              {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search anything..."
                onKeyDown={handleSearch}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-72 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-xl transition-colors">
              <Moon size={18} />
            </button>
            <Link 
              to="/admin/notifications"
              className="relative p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-xl transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50" />
            </Link>
            <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700 leading-none">Admin</span>
                <span className="text-[10px] text-slate-400 font-medium">Administrator</span>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
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
