import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  MessageSquare, 
  Clock, 
  Calendar, 
  Package, 
  Award, 
  Filter, 
  ChevronRight, 
  Save, 
  Copy, 
  Sparkles, 
  TrendingUp, 
  UserCheck, 
  ArrowUpRight 
} from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useOrders } from '../../contexts/OrderContext';
import { formatPrice, cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Order } from '../../types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ParcelLiveStatusBadge } from '../../components/admin/ParcelLiveStatusBadge';

interface CustomerProfile {
  id: string; // normalized phone or customer ID
  phone: string;
  name: string;
  email: string;
  address: string;
  city: string;
  thana: string;
  totalOrders: number;
  totalSpent: number;
  deliveredOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  exchanges: number;
  lastOrderDate: string;
  firstOrderDate: string;
  orders: Order[];
  notes?: string;
  tag?: string;
  reliability: 'VIP' | 'Regular' | 'New' | 'High Risk' | 'Normal';
}

const normalizePhone = (phoneStr: string | undefined | null): string => {
  if (!phoneStr) return '';
  const cleaned = phoneStr.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('880') && cleaned.length === 13) {
    return '0' + cleaned.slice(2);
  }
  if (cleaned.startsWith('88') && cleaned.length === 13) {
    return '0' + cleaned.slice(2);
  }
  return cleaned;
};

export default function AdminCustomerProfiler() {
  const { currency, rate } = useCurrency();
  const { orders } = useOrders();
  const [customerDocData, setCustomerDocData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vip' | 'regular' | 'new' | 'risk'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Live Firestore subscription for additional customer metadata / notes
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.forEach(docSnap => {
        data[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      setCustomerDocData(data);
    }, (err) => console.warn('[AdminCustomerProfiler] Snapshot notice:', err));
    return () => unsubscribe();
  }, []);

  // Aggregating live customer profiles from all active orders + customer metadata
  const profiles = useMemo<CustomerProfile[]>(() => {
    const customerMap: Record<string, CustomerProfile> = {};

    // 1. Process all live orders in real-time
    if (Array.isArray(orders)) {
      orders.forEach((order) => {
        const rawPhone = order.phone || (order as any).shippingAddress?.phone || '';
        const phone = normalizePhone(rawPhone);
        const name = order.customerName || (order as any).shippingAddress?.fullName || order.email || 'Customer';
        const address = order.address || (order as any).shippingAddress?.address || '';
        const city = order.city || (order as any).shippingAddress?.city || '';
        const thana = (order as any).thana || (order as any).shippingAddress?.thana || '';
        const email = order.email || '';
        const dateStr = order.createdAt || new Date().toISOString();

        // Key identification: Phone number preferred, else email, else order customerId
        const key = phone || email || order.customerId || `cust-${order.id}`;

        if (!customerMap[key]) {
          customerMap[key] = {
            id: key,
            phone: phone || rawPhone,
            name: name,
            email: email,
            address: address,
            city: city,
            thana: thana,
            totalOrders: 0,
            totalSpent: 0,
            deliveredOrders: 0,
            pendingOrders: 0,
            cancelledOrders: 0,
            exchanges: 0,
            lastOrderDate: dateStr,
            firstOrderDate: dateStr,
            orders: [],
            notes: '',
            reliability: 'Normal'
          };
        }

        const prof = customerMap[key];
        prof.orders.push(order);
        prof.totalOrders += 1;

        const orderTotal = Number(order.total) || 0;
        prof.totalSpent += orderTotal;

        const statusStr = (order.status || '').toUpperCase().trim();
        if (['DELIVERED', 'SUCCESS', 'COMPLETED', 'QC'].includes(statusStr)) {
          prof.deliveredOrders += 1;
        } else if (['CANCELLED', 'CANCEL', 'PICK UP CANCEL', 'RETURNED'].includes(statusStr)) {
          prof.cancelledOrders += 1;
        } else if (['EXCHANGE', 'RETURN'].includes(statusStr)) {
          prof.exchanges += 1;
        } else {
          prof.pendingOrders += 1;
        }

        // Update latest information
        if (new Date(dateStr).getTime() >= new Date(prof.lastOrderDate).getTime()) {
          prof.lastOrderDate = dateStr;
          if (name && name !== 'Customer') prof.name = name;
          if (address) prof.address = address;
          if (city) prof.city = city;
          if (thana) prof.thana = thana;
          if (email) prof.email = email;
        }

        if (new Date(dateStr).getTime() < new Date(prof.firstOrderDate).getTime()) {
          prof.firstOrderDate = dateStr;
        }
      });
    }

    // 2. Merge saved notes and custom fields from Firestore `customers` collection
    Object.keys(customerDocData).forEach((key) => {
      const docData = customerDocData[key];
      const normalizedKey = normalizePhone(key) || key;

      if (customerMap[normalizedKey]) {
        if (docData.notes) customerMap[normalizedKey].notes = docData.notes;
        if (docData.tag) customerMap[normalizedKey].tag = docData.tag;
        if (docData.name && customerMap[normalizedKey].name === 'Customer') {
          customerMap[normalizedKey].name = docData.name;
        }
      } else {
        // Customer exists in database but has 0 recent order objects in memory
        customerMap[normalizedKey] = {
          id: normalizedKey,
          phone: docData.phone || key,
          name: docData.name || 'Valued Customer',
          email: docData.email || '',
          address: docData.address || '',
          city: docData.city || '',
          thana: docData.thana || '',
          totalOrders: docData.totalOrders || 0,
          totalSpent: docData.totalSpent || 0,
          deliveredOrders: docData.deliveredOrders || 0,
          pendingOrders: 0,
          cancelledOrders: docData.cancelledOrders || 0,
          exchanges: docData.exchanges || 0,
          lastOrderDate: docData.lastOrderDate || new Date().toISOString(),
          firstOrderDate: docData.lastOrderDate || new Date().toISOString(),
          orders: [],
          notes: docData.notes || '',
          tag: docData.tag || '',
          reliability: 'Normal'
        };
      }
    });

    // 3. Calculate Reliability / Loyalty Tag & Sort orders newest first
    const list = Object.values(customerMap).map((c) => {
      c.orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      if (c.totalOrders >= 3 && c.cancelledOrders === 0 && c.totalSpent >= 2500) {
        c.reliability = 'VIP';
      } else if (c.cancelledOrders >= 2 && c.cancelledOrders >= c.totalOrders * 0.5) {
        c.reliability = 'High Risk';
      } else if (c.totalOrders >= 2) {
        c.reliability = 'Regular';
      } else if (c.totalOrders === 1) {
        c.reliability = 'New';
      } else {
        c.reliability = 'Normal';
      }
      return c;
    });

    // Sort customer list by most recent activity
    return list.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());
  }, [orders, customerDocData]);

  // Overall aggregate metrics
  const stats = useMemo(() => {
    const totalCustomers = profiles.length;
    const repeatCustomers = profiles.filter(p => p.totalOrders >= 2).length;
    const vipCustomers = profiles.filter(p => p.reliability === 'VIP').length;
    const totalRevenueAll = profiles.reduce((sum, p) => sum + p.totalSpent, 0);
    const avgSpend = totalCustomers > 0 ? totalRevenueAll / totalCustomers : 0;

    return {
      totalCustomers,
      repeatCustomers,
      repeatRate: totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : '0',
      vipCustomers,
      totalRevenueAll,
      avgSpend
    };
  }, [profiles]);

  // Search and Filter
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        String(p.phone || '').includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (Array.isArray(p.orders) && p.orders.some(o => (o.invoiceNo && String(o.invoiceNo).includes(q)) || (o.id && String(o.id).includes(q))));

      if (!matchesSearch) return false;

      if (selectedFilter === 'vip') return p.reliability === 'VIP' || p.totalSpent >= 3000;
      if (selectedFilter === 'regular') return p.totalOrders >= 2;
      if (selectedFilter === 'new') return p.totalOrders === 1;
      if (selectedFilter === 'risk') return p.reliability === 'High Risk' || p.cancelledOrders > 0;

      return true;
    });
  }, [profiles, searchTerm, selectedFilter]);

  // Keep selectedCustomer in sync with real-time updates
  useEffect(() => {
    if (selectedCustomer) {
      const updated = profiles.find(p => p.id === selectedCustomer.id);
      if (updated) {
        setSelectedCustomer(updated);
      }
    }
  }, [profiles]);

  const handleOpenCustomerModal = (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setNoteInput(customer.notes || '');
  };

  const handleSaveNote = async () => {
    if (!selectedCustomer) return;
    setSavingNote(true);
    try {
      const key = selectedCustomer.phone || selectedCustomer.id;
      const ref = doc(db, 'customers', key);
      await setDoc(ref, {
        notes: noteInput,
        phone: selectedCustomer.phone,
        name: selectedCustomer.name,
        totalOrders: selectedCustomer.totalOrders,
        totalSpent: selectedCustomer.totalSpent,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      toast.success('Customer notes saved successfully');
      setSelectedCustomer(prev => prev ? { ...prev, notes: noteInput } : null);
    } catch (err) {
      console.error('Error saving customer note:', err);
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="p-4 md:p-8 font-sans bg-[#F8F9FD] min-h-screen text-slate-900 space-y-8 antialiased">
      
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                Live Customer Profiler
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live Sync
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time profile intelligence, order history, repeat buyer tracking & lifetime values
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
            Total Unique Customers: <span className="text-slate-900 font-black">{stats.totalCustomers.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Profiles */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">Total Customer Profiles</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalCustomers.toLocaleString()}</h3>
            <p className="text-[11px] font-bold text-indigo-600 mt-1">
              Active in Database
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Repeat Buyers */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">Repeat Customers</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.repeatCustomers.toLocaleString()}</h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-1">
              {stats.repeatRate}% Retention Rate
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: VIP Customers */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">VIP / Top Spenders</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.vipCustomers.toLocaleString()}</h3>
            <p className="text-[11px] font-bold text-amber-600 mt-1">
              High Reliability Buyers
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Avg Lifetime Spend */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">Average Spend / Customer</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{formatPrice(stats.avgSpend, currency, rate)}</h3>
            <p className="text-[11px] font-bold text-slate-500 mt-1">
              Total: {formatPrice(stats.totalRevenueAll, currency, rate)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96 flex items-center">
          <Search className="absolute left-4 text-slate-400 w-5 h-5 pointer-events-none" />
          <input 
            type="text"
            placeholder="Search by customer name, phone number, address, invoice..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button 
            onClick={() => setSelectedFilter('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
              selectedFilter === 'all' 
                ? "bg-slate-900 text-white shadow-xs" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All Customers ({profiles.length})
          </button>

          <button 
            onClick={() => setSelectedFilter('vip')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              selectedFilter === 'vip' 
                ? "bg-amber-500 text-white shadow-xs" 
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            )}
          >
            <Award className="w-3.5 h-3.5" />
            VIP & Top Spenders
          </button>

          <button 
            onClick={() => setSelectedFilter('regular')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              selectedFilter === 'regular' 
                ? "bg-emerald-600 text-white shadow-xs" 
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Repeat Buyers (2+ orders)
          </button>

          <button 
            onClick={() => setSelectedFilter('new')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              selectedFilter === 'new' 
                ? "bg-blue-600 text-white shadow-xs" 
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            New Customers (1st Order)
          </button>

          <button 
            onClick={() => setSelectedFilter('risk')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              selectedFilter === 'risk' 
                ? "bg-rose-600 text-white shadow-xs" 
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Cancellations & Risks
          </button>
        </div>
      </div>

      {/* CUSTOMER LIST */}
      <div className="space-y-4">
        {filteredProfiles.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-2xs">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-black text-slate-800">No Customers Found</h4>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm ? `No customer profiles matching "${searchTerm}"` : 'No customer orders have been recorded yet.'}
            </p>
          </div>
        ) : (
          filteredProfiles.map((customer) => {
            const cleanPhone = normalizePhone(customer.phone);
            const waPhone = cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone;

            return (
              <div 
                key={customer.id} 
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-xs p-5 md:p-6 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-5 group"
              >
                {/* Left: Customer Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-xl font-black shadow-sm shrink-0 uppercase">
                    {customer.name?.charAt(0) || 'C'}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">
                        {customer.name}
                      </h3>

                      {/* Reliability Badges */}
                      {customer.reliability === 'VIP' && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          VIP Customer
                        </span>
                      )}
                      {customer.reliability === 'Regular' && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Repeat Buyer ({customer.totalOrders} Orders)
                        </span>
                      )}
                      {customer.reliability === 'New' && (
                        <span className="bg-blue-100 text-blue-800 border border-blue-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          New Buyer
                        </span>
                      )}
                      {customer.reliability === 'High Risk' && (
                        <span className="bg-rose-100 text-rose-800 border border-rose-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          High Return Risk
                        </span>
                      )}

                      {customer.notes && (
                        <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          📝 Has Notes
                        </span>
                      )}
                    </div>

                    {/* Phone and Contact */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                        <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{customer.phone || 'No phone'}</span>
                        {customer.phone && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(customer.phone, 'Phone number');
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-0.5 ml-0.5"
                            title="Copy phone"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {customer.address && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{customer.address} {customer.city ? `(${customer.city})` : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Last order info */}
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Last Order: {customer.lastOrderDate ? formatOrderDate(customer.lastOrderDate) : 'Recently'}</span>
                    </div>
                  </div>
                </div>

                {/* Center: Order Matrix Stats Boxes */}
                <div className="grid grid-cols-4 gap-2 bg-slate-50/90 p-2 rounded-2xl border border-slate-200/80 shrink-0">
                  <div className="text-center px-3 py-2 bg-white rounded-xl border border-slate-200/60 shadow-3xs min-w-[64px]">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{customer.totalOrders}</p>
                  </div>
                  <div className="text-center px-3 py-2 bg-emerald-50/70 rounded-xl border border-emerald-200/60 shadow-3xs min-w-[64px]">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Delivered</p>
                    <p className="text-sm font-black text-emerald-700 mt-0.5">{customer.deliveredOrders}</p>
                  </div>
                  <div className="text-center px-3 py-2 bg-rose-50/70 rounded-xl border border-rose-200/60 shadow-3xs min-w-[64px]">
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider">Cancelled</p>
                    <p className="text-sm font-black text-rose-600 mt-0.5">{customer.cancelledOrders}</p>
                  </div>
                  <div className="text-center px-3 py-2 bg-amber-50/70 rounded-xl border border-amber-200/60 shadow-3xs min-w-[64px]">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Pending</p>
                    <p className="text-sm font-black text-amber-700 mt-0.5">{customer.pendingOrders}</p>
                  </div>
                </div>

                {/* Right: Spend & Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between xl:justify-end gap-4 border-t xl:border-t-0 pt-3.5 xl:pt-0 border-slate-100 shrink-0">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2 text-left sm:text-right min-w-[120px] shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Spend</p>
                    <p className="text-base md:text-lg font-black text-slate-950 mt-0.5">{formatPrice(customer.totalSpent, currency, rate)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* WhatsApp Action */}
                    {customer.phone && (
                      <a 
                        href={`https://wa.me/${waPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 flex items-center justify-center transition-all shadow-3xs hover:scale-105 shrink-0"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}

                    {/* Phone Call Action */}
                    {customer.phone && (
                      <a 
                        href={`tel:${customer.phone}`}
                        className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200/80 flex items-center justify-center transition-all shadow-3xs hover:scale-105 shrink-0"
                        title="Call Customer"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}

                    {/* Open Details Button */}
                    <button 
                      onClick={() => handleOpenCustomerModal(customer)}
                      className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs hover:shadow-indigo-200 active:scale-98 whitespace-nowrap shrink-0"
                    >
                      <span>View Orders</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CUSTOMER ORDERS & PROFILE DRAWER/MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black uppercase">
                  {selectedCustomer.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight">{selectedCustomer.name}</h2>
                    {selectedCustomer.reliability === 'VIP' && (
                      <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-300 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-indigo-400" />
                      {selectedCustomer.phone}
                    </span>
                    {selectedCustomer.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        {selectedCustomer.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedCustomer(null)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Orders</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{selectedCustomer.totalOrders}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Lifetime Spend</p>
                  <p className="text-xl font-black text-indigo-600 mt-1">{formatPrice(selectedCustomer.totalSpent, currency, rate)}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Delivered Orders</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">{selectedCustomer.deliveredOrders}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cancelled / Return</p>
                  <p className="text-xl font-black text-rose-600 mt-1">{selectedCustomer.cancelledOrders}</p>
                </div>
              </div>

              {/* Customer Notes Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    Customer Internal Notes (Admin Only)
                  </label>
                  <button 
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />
                    <span>{savingNote ? 'Saving...' : 'Save Note'}</span>
                  </button>
                </div>
                <textarea 
                  rows={2}
                  placeholder="Add notes about customer preferences, courier special notes, delivery instructions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                />
              </div>

              {/* Order History Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  Complete Order History ({selectedCustomer.orders.length})
                </h3>

                {selectedCustomer.orders.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                    No individual order records found in memory for this customer.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCustomer.orders.map((order, idx) => {
                      const displayInvoice = order.invoiceNo ? `#${order.invoiceNo}` : `#${order.id}`;
                      const itemsCount = order.items ? order.items.reduce((s, it) => s + (it.quantity || 1), 0) : 1;

                      return (
                        <div 
                          key={order.id || idx}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-slate-950">{displayInvoice}</span>
                              <span className="text-xs text-slate-400 font-medium">
                                • {order.createdAt ? formatOrderDate(order.createdAt) : 'Recently'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                ['DELIVERED', 'SUCCESS', 'COMPLETED', 'QC'].includes((order.status || '').toUpperCase()) && "bg-emerald-100 text-emerald-800",
                                ['CANCELLED', 'CANCEL', 'PICK UP CANCEL', 'RETURNED'].includes((order.status || '').toUpperCase()) && "bg-rose-100 text-rose-800",
                                ['ORDER PLACED', 'PENDING', 'PREPARING', 'PROCESSING'].includes((order.status || '').toUpperCase()) && "bg-amber-100 text-amber-800",
                                ['SHIPPED', 'IN TRANSIT'].includes((order.status || '').toUpperCase()) && "bg-purple-100 text-purple-800",
                              )}>
                                {order.status}
                              </span>

                              {/* Courier live status badge */}
                              {((order as any).consignmentId || (order as any).pathaoConsignmentId || (order as any).steadfastConsignmentId || order.trackingId || (order as any).trackingCode) && (
                                <ParcelLiveStatusBadge order={order} />
                              )}
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="space-y-2">
                            {order.items?.map((item, itemIdx) => (
                              <div key={itemIdx} className="flex items-center justify-between text-xs py-1">
                                <div className="flex items-center gap-3">
                                  {item.image && (
                                    <img 
                                      src={item.image} 
                                      alt={item.name} 
                                      className="w-9 h-9 rounded-lg object-cover border border-slate-100" 
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div>
                                    <p className="font-bold text-slate-800">{item.name}</p>
                                    <p className="text-[11px] text-slate-400">
                                      Size: <span className="font-bold text-slate-700">{item.selectedSize || 'Standard'}</span> • Qty: <span className="font-bold text-slate-700">{item.quantity || 1}</span>
                                    </p>
                                  </div>
                                </div>
                                <span className="font-black text-slate-900">
                                  {formatPrice((item.price || 0) * (item.quantity || 1), currency, rate)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Order Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <span className="text-slate-400 font-medium">
                              Payment: <span className="text-slate-700 font-bold uppercase">{order.paymentMethod || 'COD'}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-medium">Order Total:</span>
                              <span className="text-sm font-black text-indigo-600">
                                {formatPrice(order.total || 0, currency, rate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Customer ID: <span className="font-mono font-bold text-slate-700">{selectedCustomer.id}</span>
              </span>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatOrderDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

