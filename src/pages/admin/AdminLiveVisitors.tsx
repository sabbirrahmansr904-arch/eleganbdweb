import React, { useState, useMemo } from 'react';
import { useLiveVisitors } from '../../hooks/useLiveVisitors';
import { 
  Users, 
  Radio, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Globe, 
  Clock, 
  ShoppingCart, 
  Eye, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw, 
  Flame, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Volume2,
  VolumeX,
  Compass
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export default function AdminLiveVisitors() {
  const { 
    visitors, 
    activeNowVisitors, 
    customerActiveVisitors, 
    activeCount, 
    customerActiveCount, 
    summary, 
    loading, 
    currentTime,
    cleanOldVisitors 
  } = useLiveVisitors();

  const [activeTab, setActiveTab] = useState<'active' | 'customers' | 'checkout' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);

  // Sound alert when someone enters checkout
  const previousCheckoutCountRef = React.useRef(0);
  const checkoutVisitors = useMemo(() => {
    return activeNowVisitors.filter(v => v.path.toLowerCase().includes('/checkout') || v.path.toLowerCase().includes('/cart'));
  }, [activeNowVisitors]);

  React.useEffect(() => {
    if (soundEnabled && checkoutVisitors.length > previousCheckoutCountRef.current) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}
    }
    previousCheckoutCountRef.current = checkoutVisitors.length;
  }, [checkoutVisitors.length, soundEnabled]);

  // Filter visitors list based on active tab and search
  const filteredVisitors = useMemo(() => {
    let list = visitors;
    if (activeTab === 'active') {
      list = activeNowVisitors;
    } else if (activeTab === 'customers') {
      list = customerActiveVisitors;
    } else if (activeTab === 'checkout') {
      list = activeNowVisitors.filter(v => v.path.toLowerCase().includes('/checkout') || v.path.toLowerCase().includes('/cart'));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => 
        v.id.toLowerCase().includes(q) ||
        v.path.toLowerCase().includes(q) ||
        (v.pageTitle && v.pageTitle.toLowerCase().includes(q)) ||
        (v.referrer && v.referrer.toLowerCase().includes(q)) ||
        (v.browser && v.browser.toLowerCase().includes(q)) ||
        (v.device && v.device.toLowerCase().includes(q)) ||
        (v.os && v.os.toLowerCase().includes(q))
      );
    }
    return list;
  }, [visitors, activeNowVisitors, customerActiveVisitors, activeTab, searchQuery]);

  // Page distribution of currently active visitors
  const pageDistribution = useMemo(() => {
    const counts: Record<string, { count: number; title: string }> = {};
    activeNowVisitors.forEach(v => {
      const p = v.path || '/';
      if (!counts[p]) {
        counts[p] = { count: 0, title: v.pageTitle || p };
      }
      counts[p].count += 1;
    });
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
  }, [activeNowVisitors]);

  // Device stats
  const deviceStats = useMemo(() => {
    let mobile = 0;
    let desktop = 0;
    let tablet = 0;
    activeNowVisitors.forEach(v => {
      if (v.device === 'Mobile') mobile++;
      else if (v.device === 'Tablet') tablet++;
      else desktop++;
    });
    const total = activeNowVisitors.length || 1;
    return {
      mobile,
      desktop,
      tablet,
      mobilePercent: Math.round((mobile / total) * 100),
      desktopPercent: Math.round((desktop / total) * 100),
      tabletPercent: Math.round((tablet / total) * 100)
    };
  }, [activeNowVisitors]);

  const handleClean = async () => {
    if (!window.confirm('Are you sure you want to clean session records older than 24 hours?')) return;
    setIsCleaning(true);
    try {
      const removed = await cleanOldVisitors();
      toast.success(`Cleaned ${removed} old visitor session(s).`);
    } catch (e) {
      toast.error('Failed to clean old visitor records.');
    } finally {
      setIsCleaning(false);
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const diffSec = Math.max(0, Math.floor((currentTime - timestamp) / 1000));
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  const formatDuration = (start: number, end: number) => {
    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ${diffMin % 60}m`;
  };

  const getPageLabel = (path: string) => {
    if (path === '/' || path === '') return 'Home Page';
    if (path.startsWith('/product/')) return 'Product Details';
    if (path.startsWith('/checkout')) return 'Checkout';
    if (path.startsWith('/cart')) return 'Shopping Cart';
    if (path.startsWith('/category/')) return 'Category Page';
    if (path.startsWith('/admin')) return 'Admin Panel';
    if (path.startsWith('/dashboard')) return 'Customer Account';
    return path;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#E6ECF4] p-5 sm:p-6 rounded-3xl border border-white/90 shadow-[-6px_-6px_14px_rgba(255,255,255,0.95),6px_6px_16px_rgba(165,180,205,0.32)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="relative flex items-center justify-center">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Live Radar
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Real-time Traffic Monitor
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <span>Website Live Visitors</span>
            <span className="text-sm font-bold px-3 py-1 bg-white/80 rounded-full border border-gray-200 text-slate-700 shadow-2xs">
              {activeCount} Active Now
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track visitors on the storefront in real time with automatic live updates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) toast.success('Checkout sound alerts enabled.');
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-[-3px_-3px_8px_rgba(255,255,255,0.9),3px_3px_8px_rgba(165,180,205,0.25)] cursor-pointer",
              soundEnabled 
                ? "bg-amber-100 border-amber-300 text-amber-900" 
                : "bg-[#E6ECF4] border-white/80 text-gray-600 hover:text-black"
            )}
            title="Sound alert when visitor enters checkout"
          >
            {soundEnabled ? <Volume2 size={16} className="text-amber-700" /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Alerts ON' : 'Sound Alerts'}</span>
          </button>

          <button
            onClick={handleClean}
            disabled={isCleaning}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#E6ECF4] hover:bg-rose-50 text-rose-600 border border-white/80 shadow-[-3px_-3px_8px_rgba(255,255,255,0.9),3px_3px_8px_rgba(165,180,205,0.25)] transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
            title="Purge session logs older than 24 hours"
          >
            <Trash2 size={15} />
            <span>{isCleaning ? 'Cleaning...' : 'Clean Old (>24h)'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Shoppers Now */}
        <div className="bg-[#E6ECF4] p-5 rounded-3xl border border-white/90 shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),5px_5px_12px_rgba(165,180,205,0.32)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Shoppers</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <Radio size={18} className="animate-pulse" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {activeCount}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium text-gray-600">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{customerActiveCount} Shoppers</span>
            <span className="text-gray-400">•</span>
            <span>{activeCount - customerActiveCount} Staff/Admin</span>
          </div>
        </div>

        {/* Card 2: Checkout & High Intent */}
        <div className="bg-[#E6ECF4] p-5 rounded-3xl border border-white/90 shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),5px_5px_12px_rgba(165,180,205,0.32)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Checkout Funnel</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
              <Flame size={18} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
            <span>{checkoutVisitors.length}</span>
            <span className="text-xs font-bold text-amber-700">Buying</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 truncate">
            {checkoutVisitors.length > 0 ? 'Visitors currently placing order' : 'No visitor on checkout right now'}
          </p>
        </div>

        {/* Card 3: Devices Ratio */}
        <div className="bg-[#E6ECF4] p-5 rounded-3xl border border-white/90 shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),5px_5px_12px_rgba(165,180,205,0.32)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Device Breakdown</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
              <Smartphone size={18} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {deviceStats.mobilePercent}%
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-gray-600">
            <span className="flex items-center gap-1">
              <Smartphone size={13} className="text-blue-600" />
              <span>{deviceStats.mobile} Mobile</span>
            </span>
            <span className="flex items-center gap-1">
              <Monitor size={13} className="text-indigo-600" />
              <span>{deviceStats.desktop} PC</span>
            </span>
          </div>
        </div>

        {/* Card 4: Today's Traffic */}
        <div className="bg-[#E6ECF4] p-5 rounded-3xl border border-white/90 shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),5px_5px_12px_rgba(165,180,205,0.32)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Today's Visits</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
              <Globe size={18} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {Number(summary?.todayVisits) || visitors.length}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Page Views Today: <span className="font-bold text-slate-800">{Number(summary?.todayPageViews) || visitors.reduce((a, b) => a + (Number(b.pageViews) || 1), 0)}</span>
          </p>
        </div>
      </div>

      {/* Active Pages Live Distribution */}
      {pageDistribution.length > 0 && (
        <div className="bg-[#E6ECF4] p-5 sm:p-6 rounded-3xl border border-white/90 shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),5px_5px_12px_rgba(165,180,205,0.32)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Compass size={16} className="text-slate-700" />
              <span>Active Pages Being Browsed Right Now</span>
            </h3>
            <span className="text-xs font-bold text-gray-500">
              {pageDistribution.length} distinct pages
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pageDistribution.map(([path, data]) => {
              const isCheckout = path.includes('checkout');
              const isCart = path.includes('cart');
              const isProduct = path.includes('product');

              return (
                <div 
                  key={path}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 bg-white/70 shadow-2xs",
                    isCheckout 
                      ? "border-amber-400 bg-amber-50/70" 
                      : isCart 
                      ? "border-blue-300 bg-blue-50/60" 
                      : "border-white/90"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                        isCheckout ? "bg-amber-200 text-amber-900" : isProduct ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"
                      )}>
                        {getPageLabel(path)}
                      </span>
                      {isCheckout && (
                        <span className="text-[10px] font-black uppercase text-amber-700 animate-pulse">
                          🔥 Hot Lead
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate mt-1" title={path}>
                      {path}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                      {data.count}
                    </span>
                    <a
                      href={path}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-500 hover:text-black transition-colors"
                      title="Open page in new tab"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Realtime Table */}
      <div className="bg-[#E6ECF4] rounded-3xl border border-white/90 shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),5px_5px_12px_rgba(165,180,205,0.32)] overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-4 sm:p-5 border-b border-[#DCE4EE] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('active')}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === 'active'
                  ? "bg-[#E6ECF4] text-slate-900 shadow-[-4px_-4px_10px_rgba(255,255,255,0.95),4px_4px_10px_rgba(165,180,205,0.35)] border border-white/90"
                  : "text-gray-600 hover:text-black hover:bg-white/40"
              )}
            >
              🟢 Active Now ({activeCount})
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === 'customers'
                  ? "bg-[#E6ECF4] text-slate-900 shadow-[-4px_-4px_10px_rgba(255,255,255,0.95),4px_4px_10px_rgba(165,180,205,0.35)] border border-white/90"
                  : "text-gray-600 hover:text-black hover:bg-white/40"
              )}
            >
              Shoppers Only ({customerActiveCount})
            </button>

            <button
              onClick={() => setActiveTab('checkout')}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                activeTab === 'checkout'
                  ? "bg-amber-100 text-amber-900 shadow-[-4px_-4px_10px_rgba(255,255,255,0.95),4px_4px_10px_rgba(165,180,205,0.35)] border border-amber-300 font-black"
                  : "text-gray-600 hover:text-amber-800 hover:bg-amber-50"
              )}
            >
              <ShoppingCart size={14} />
              <span>Checkout ({checkoutVisitors.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === 'all'
                  ? "bg-[#E6ECF4] text-slate-900 shadow-[-4px_-4px_10px_rgba(255,255,255,0.95),4px_4px_10px_rgba(165,180,205,0.35)] border border-white/90"
                  : "text-gray-600 hover:text-black hover:bg-white/40"
              )}
            >
              All Recent ({visitors.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search path, device, source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/80 border border-white shadow-inner text-xs font-medium text-slate-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-bold text-gray-500">Connecting to live radar...</p>
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="p-12 text-center">
            <Radio size={36} className="text-gray-300 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-bold text-slate-800">No active visitors matching criteria</p>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery ? 'Try clearing your search query.' : 'New visitors browsing the website will appear here in real time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#DEE5F0]/60 text-gray-600 uppercase text-[10px] font-black tracking-wider border-b border-[#DCE4EE]">
                <tr>
                  <th className="py-3.5 px-4">Status & Visitor</th>
                  <th className="py-3.5 px-4">Current Page</th>
                  <th className="py-3.5 px-4">Device & OS</th>
                  <th className="py-3.5 px-4">Browser & Source</th>
                  <th className="py-3.5 px-4">Views</th>
                  <th className="py-3.5 px-4">Time on Site</th>
                  <th className="py-3.5 px-4 text-right">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE4EE]/70">
                {filteredVisitors.map((v) => {
                  const isActiveNow = (currentTime - v.lastActive) <= 120000 && v.isOnline;
                  const isCheckout = v.path.toLowerCase().includes('/checkout');
                  const isCart = v.path.toLowerCase().includes('/cart');

                  return (
                    <tr 
                      key={v.id}
                      onClick={() => setSelectedVisitor(v)}
                      className={cn(
                        "hover:bg-white/50 transition-colors cursor-pointer group",
                        isCheckout ? "bg-amber-50/40" : ""
                      )}
                    >
                      {/* Status & Visitor */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            {isActiveNow ? (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                              </span>
                            ) : (
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900">
                                #{v.id.slice(-6).toUpperCase()}
                              </span>
                              {v.isAdminSession && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                                  Staff
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {v.id.length > 14 ? v.id.slice(0, 14) + '...' : v.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Current Page */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                              isCheckout 
                                ? "bg-amber-200 text-amber-900" 
                                : isCart 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-white/80 border border-gray-200 text-slate-700"
                            )}>
                              {getPageLabel(v.path)}
                            </span>
                            {isCheckout && (
                              <span className="text-[10px] font-black text-amber-700">🔥</span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate mt-1" title={v.path}>
                            {v.path}
                          </p>
                        </div>
                      </td>

                      {/* Device & OS */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-2xs border border-white shrink-0">
                            {v.device === 'Mobile' ? (
                              <Smartphone size={14} />
                            ) : v.device === 'Tablet' ? (
                              <Tablet size={14} />
                            ) : (
                              <Monitor size={14} />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{v.device}</p>
                            <p className="text-[10px] text-gray-500">{v.os || 'Unknown OS'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Browser & Referrer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{v.browser || 'Browser'}</p>
                        <p className="text-[10px] text-gray-500 font-medium truncate max-w-[120px]" title={v.referrer || 'Direct'}>
                          Ref: {v.referrer || 'Direct'}
                        </p>
                      </td>

                      {/* Page Views */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-white text-slate-900 font-bold border border-white/80 shadow-2xs">
                          {v.pageViews || 1}
                        </span>
                      </td>

                      {/* Time on Site */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-gray-700">
                          {formatDuration(v.firstSeen, v.lastActive)}
                        </span>
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={cn(
                          "font-bold",
                          isActiveNow ? "text-emerald-700" : "text-gray-400"
                        )}>
                          {getRelativeTime(v.lastActive)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visitor Detail Modal */}
      <AnimatePresence>
        {selectedVisitor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVisitor(null)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed inset-x-4 top-[15%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg bg-[#EAEFF5] rounded-3xl p-6 border border-white shadow-2xl z-50"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#DCE4EE]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-2xs">
                    {selectedVisitor.device === 'Mobile' ? <Smartphone size={20} /> : <Monitor size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">
                      Visitor #{selectedVisitor.id.slice(-6).toUpperCase()}
                    </h4>
                    <p className="text-xs text-gray-500 font-mono">{selectedVisitor.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVisitor(null)}
                  className="p-2 rounded-xl bg-white hover:bg-gray-100 text-gray-500 hover:text-black transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Status</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    {(currentTime - selectedVisitor.lastActive) <= 120000 ? 'Active Online Now' : 'Idle / Inactive'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Current Page</span>
                  <a 
                    href={selectedVisitor.path} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>{selectedVisitor.path}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Device & OS</span>
                  <span className="font-bold text-slate-900">
                    {String(selectedVisitor.device || 'Desktop')} • {String(selectedVisitor.os || 'Unknown')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Browser</span>
                  <span className="font-bold text-slate-900">{String(selectedVisitor.browser || 'Unknown')}</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Referral Source</span>
                  <span className="font-bold text-slate-900">{String(selectedVisitor.referrer || 'Direct')}</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Page Views in Session</span>
                  <span className="font-bold text-slate-900">{Number(selectedVisitor.pageViews) || 1} views</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">First Seen</span>
                  <span className="font-bold text-slate-900">
                    {new Date(Number(selectedVisitor.firstSeen) || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-500 font-medium">Last Ping</span>
                  <span className="font-bold text-slate-900">{getRelativeTime(Number(selectedVisitor.lastActive) || Date.now())}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedVisitor(null)}
                  className="w-full py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
