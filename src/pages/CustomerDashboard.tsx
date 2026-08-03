/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { 
  Package, User, LogOut, ArrowRight, ArrowLeft, Mail, Phone, MapPin, 
  Edit3, Save, CheckCircle2, Clock, Truck, ShieldCheck, 
  ShoppingBag, Eye, RefreshCw, FileText, Search, ExternalLink, 
  AlertCircle, ChevronRight, MessageSquare, PhoneCall, HelpCircle,
  X, Check, Sparkles, Building, Hash, Calendar, CreditCard, DollarSign,
  Heart, UserCheck, Shield, Lock, Plus, Trash2, Building2, Home
} from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import InvoiceTemplate from '../components/admin/InvoiceTemplate';
import toast from 'react-hot-toast';
import { Order, SavedAddress } from '../types';
import { DISTRICT_THANAS } from '../data/locations';

interface SavedProfile {
  name: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  city: string;
  thana: string;
}

export default function CustomerDashboard() {
  const { currentUser, customerUser, signOut, logoutCustomer, isAdmin } = useAuth();
  const { orders } = useOrders();
  const { currency, rate } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Navigation tab state
  const initialTab = (searchParams.get('tab') as any) || 'orders';
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses' | 'tracking' | 'support'>(initialTab);

  // Filter & Search inside Order History
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Selected Order for Invoice Modal
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Tracking tab input
  const [trackingIdInput, setTrackingIdInput] = useState('');

  // Load / Save Profile from LocalStorage
  const [profile, setProfile] = useState<SavedProfile>(() => {
    try {
      const saved = localStorage.getItem('elegan_customer_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // Ignore
    }
    return {
      name: currentUser?.displayName || customerUser?.name || '',
      email: currentUser?.email || customerUser?.email || '',
      phone: '',
      secondaryPhone: '',
      address: '',
      city: 'Dhaka',
      thana: ''
    };
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Sync auth profile updates
  useEffect(() => {
    if (currentUser || customerUser) {
      setProfile(prev => ({
        ...prev,
        name: prev.name || currentUser?.displayName || customerUser?.name || currentUser?.email?.split('@')[0] || 'Valued Customer',
        email: currentUser?.email || customerUser?.email || prev.email || ''
      }));
    }
  }, [currentUser, customerUser]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('elegan_customer_profile', JSON.stringify(profile));
      toast.success('Profile information updated successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      toast.error('Failed to save profile changes');
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('elegan_customer_profile', JSON.stringify(profile));
      toast.success('Default delivery address saved!');
      setIsEditingAddress(false);
    } catch (err) {
      toast.error('Failed to save address');
    }
  };

  // Saved Delivery Locations State
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => {
    try {
      const saved = localStorage.getItem('elegan_saved_addresses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // Ignore
    }
    if (profile.address || profile.phone) {
      return [
        {
          id: 'addr_default_1',
          title: 'Home',
          name: profile.name || currentUser?.displayName || customerUser?.name || 'Valued Customer',
          phone: profile.phone || '',
          address: profile.address || '',
          city: profile.city || 'Dhaka',
          thana: profile.thana || '',
          isDefault: true
        }
      ];
    }
    return [];
  });

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<SavedAddress, 'id'>>({
    title: 'Home',
    name: profile.name || '',
    phone: profile.phone || '',
    address: '',
    city: 'Dhaka',
    thana: '',
    isDefault: true
  });

  const handleOpenAddAddress = () => {
    setAddressForm({
      title: 'Home',
      name: profile.name || currentUser?.displayName || customerUser?.name || '',
      phone: profile.phone || '',
      address: '',
      city: 'Dhaka',
      thana: '',
      isDefault: savedAddresses.length === 0
    });
    setEditingAddressId(null);
    setIsAddingAddress(true);
  };

  const handleOpenEditAddress = (addr: SavedAddress) => {
    setAddressForm({
      title: addr.title || 'Home',
      name: addr.name || profile.name || '',
      phone: addr.phone || '',
      address: addr.address || '',
      city: addr.city || 'Dhaka',
      thana: addr.thana || '',
      isDefault: !!addr.isDefault
    });
    setEditingAddressId(addr.id);
    setIsAddingAddress(true);
  };

  const handleSaveAddressItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.address.trim()) {
      toast.error('Please enter a full street address.');
      return;
    }
    if (!addressForm.phone.trim()) {
      toast.error('Please enter a valid mobile phone number.');
      return;
    }

    let updatedList: SavedAddress[] = [];

    if (editingAddressId) {
      updatedList = savedAddresses.map(item => {
        if (item.id === editingAddressId) {
          return {
            ...item,
            ...addressForm
          };
        }
        return item;
      });
    } else {
      const newAddrItem: SavedAddress = {
        id: 'addr_' + Date.now(),
        ...addressForm
      };
      updatedList = [newAddrItem, ...savedAddresses];
    }

    const currentTargetId = editingAddressId || updatedList[0].id;

    if (addressForm.isDefault || updatedList.length === 1) {
      updatedList = updatedList.map(item => ({
        ...item,
        isDefault: item.id === currentTargetId
      }));

      const defItem = updatedList.find(i => i.isDefault) || updatedList[0];
      const updatedProfile = {
        ...profile,
        name: defItem.name || profile.name,
        phone: defItem.phone || profile.phone,
        address: defItem.address,
        city: defItem.city,
        thana: defItem.thana
      };
      setProfile(updatedProfile);
      localStorage.setItem('elegan_customer_profile', JSON.stringify(updatedProfile));
    }

    setSavedAddresses(updatedList);
    localStorage.setItem('elegan_saved_addresses', JSON.stringify(updatedList));
    toast.success(editingAddressId ? 'Address updated successfully!' : 'New delivery address saved!');
    setIsAddingAddress(false);
    setEditingAddressId(null);
  };

  const handleSetDefaultAddress = (id: string) => {
    const updated = savedAddresses.map(item => ({
      ...item,
      isDefault: item.id === id
    }));
    setSavedAddresses(updated);
    localStorage.setItem('elegan_saved_addresses', JSON.stringify(updated));

    const defItem = updated.find(i => i.id === id);
    if (defItem) {
      const updatedProfile = {
        ...profile,
        name: defItem.name || profile.name,
        phone: defItem.phone || profile.phone,
        address: defItem.address,
        city: defItem.city,
        thana: defItem.thana
      };
      setProfile(updatedProfile);
      localStorage.setItem('elegan_customer_profile', JSON.stringify(updatedProfile));
    }
    toast.success('Set as primary delivery location!');
  };

  const handleDeleteAddress = (id: string) => {
    if (savedAddresses.length <= 1) {
      toast.error('You must keep at least one delivery address.');
      return;
    }
    const itemToDelete = savedAddresses.find(i => i.id === id);
    let updated = savedAddresses.filter(i => i.id !== id);

    if (itemToDelete?.isDefault && updated.length > 0) {
      updated[0].isDefault = true;
      const defItem = updated[0];
      const updatedProfile = {
        ...profile,
        address: defItem.address,
        city: defItem.city,
        thana: defItem.thana
      };
      setProfile(updatedProfile);
      localStorage.setItem('elegan_customer_profile', JSON.stringify(updatedProfile));
    }

    setSavedAddresses(updated);
    localStorage.setItem('elegan_saved_addresses', JSON.stringify(updated));
    toast.success('Address location removed.');
  };

  // Find all matching orders by Gmail/Email or Phone
  const userEmail = (currentUser?.email || customerUser?.email || profile.email || '').toLowerCase().trim();
  const userPhone = (profile.phone || '').replace(/\D/g, '');

  const myOrders = useMemo(() => {
    return orders.filter(o => {
      const oEmail = (o.email || '').toLowerCase().trim();
      const oPhone = (o.phone || '').replace(/\D/g, '');
      const matchEmail = userEmail && oEmail === userEmail;
      const matchPhone = userPhone && userPhone.length >= 8 && (oPhone.endsWith(userPhone) || userPhone.endsWith(oPhone));
      return matchEmail || matchPhone;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, userEmail, userPhone]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return myOrders.filter(order => {
      // Status filter
      const status = (order.status || '').toUpperCase();
      if (orderStatusFilter === 'DELIVERED') {
        if (!['DELIVERED', 'SUCCESS'].includes(status)) return false;
      } else if (orderStatusFilter === 'CANCELLED') {
        if (!['CANCELLED', 'PICK UP CANCEL', 'RETURNED'].includes(status)) return false;
      } else if (orderStatusFilter === 'ACTIVE') {
        if (['DELIVERED', 'SUCCESS', 'CANCELLED', 'PICK UP CANCEL', 'RETURNED'].includes(status)) return false;
      }

      // Search query
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const idMatch = (order.id || '').toLowerCase().includes(q) || String(order.invoiceNo || '').includes(q);
        const itemMatch = order.items.some(i => i.name.toLowerCase().includes(q));
        return idMatch || itemMatch;
      }

      return true;
    });
  }, [myOrders, orderStatusFilter, orderSearchQuery]);

  // Customer statistics calculations
  const totalOrdersCount = myOrders.length;
  const totalSpentAmount = myOrders
    .filter(o => !['CANCELLED', 'RETURNED', 'PICK UP CANCEL'].includes((o.status || '').toUpperCase()))
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const activeOrdersCount = myOrders.filter(o => 
    !['DELIVERED', 'SUCCESS', 'CANCELLED', 'RETURNED', 'PICK UP CANCEL'].includes((o.status || '').toUpperCase())
  ).length;

  const handleLogout = async () => {
    await signOut();
    logoutCustomer();
    toast.success('Logged out successfully');
    navigate('/');
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (['DELIVERED', 'SUCCESS'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
          <CheckCircle2 size={12} /> Delivered
        </span>
      );
    }
    if (['CANCELLED', 'PICK UP CANCEL', 'RETURNED'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
          <AlertCircle size={12} /> Cancelled
        </span>
      );
    }
    if (['SHIPPED', 'PREPARING', 'QC', 'ORDER PLACED', 'PRINTED'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
          <Truck size={12} /> {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
        <Clock size={12} /> {status || 'Pending'}
      </span>
    );
  };

  // Unauthenticated view
  if (!currentUser && !customerUser) {
    return (
      <div className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mb-6 text-brand-gold shadow-lg">
          <User size={38} />
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-3">Please Sign In</h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest max-w-md mb-8 leading-relaxed">
          Sign in to your Elegan BD account to view your Gmail profile, order status, track shipments, and manage saved delivery addresses.
        </p>
        <Link 
          to="/" 
          className="bg-brand-ink text-white hover:bg-brand-gold hover:text-brand-ink transition-all px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-xl flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Return to Store
        </Link>
      </div>
    );
  }

  // User display name & avatar initial
  const accountDisplayName = profile.name || currentUser?.displayName || customerUser?.name || currentUser?.email?.split('@')[0] || 'Valued Customer';
  const accountEmail = currentUser?.email || customerUser?.email || profile.email || 'No Email Provided';
  const userInitial = accountDisplayName.charAt(0).toUpperCase();

  return (
    <div className="pt-28 pb-24 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto min-h-[80vh] font-sans">
      {/* Top Header Hero Profile Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl border border-gray-800 mb-10">
        {/* Background glow patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* User Avatar & Info */}
          <div className="flex items-center gap-5">
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={accountDisplayName} 
                className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-gold/60 shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-gold to-amber-600 text-brand-ink font-black text-3xl flex items-center justify-center border-2 border-white/20 shadow-xl tracking-tighter">
                {userInitial}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs uppercase tracking-widest font-black text-brand-gold bg-brand-gold/10 px-2.5 py-0.5 rounded-full border border-brand-gold/30">
                  Customer Profile
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  <ShieldCheck size={12} /> Verified Member
                </span>
              </div>

              {/* Account Name */}
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
                {accountDisplayName}
              </h1>

              {/* Gmail / Email Address */}
              <div className="flex items-center gap-2 mt-1 text-gray-300 text-xs sm:text-sm font-medium">
                <Mail size={14} className="text-brand-gold shrink-0" />
                <span className="underline decoration-brand-gold/50 underline-offset-4">{accountEmail}</span>
              </div>

              {/* Phone / Address summary */}
              {profile.phone && (
                <div className="flex items-center gap-2 mt-1 text-gray-400 text-xs">
                  <Phone size={12} className="text-gray-400 shrink-0" />
                  <span>{profile.phone}</span>
                  {profile.city && (
                    <>
                      <span className="text-gray-600">•</span>
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      <span>{profile.city}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end border-t md:border-t-0 border-white/10 pt-4 md:pt-0 flex-wrap">
            {isAdmin && (
              <Link
                to="/admin"
                className="bg-brand-gold hover:bg-white text-black font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg"
              >
                <ShieldCheck size={16} /> Admin Panel
              </Link>
            )}
            <button
              onClick={() => { setActiveTab('profile'); setIsEditingProfile(true); }}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 backdrop-blur-md"
            >
              <Edit3 size={14} /> Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <ShoppingBag size={12} className="text-brand-gold" /> Total Orders
            </p>
            <p className="text-2xl font-black text-white font-mono">{totalOrdersCount}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Truck size={12} className="text-indigo-400" /> In-Transit Orders
            </p>
            <p className="text-2xl font-black text-indigo-300 font-mono">{activeOrdersCount}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <DollarSign size={12} className="text-emerald-400" /> Total Spent
            </p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {formatPrice(totalSpentAmount, currency, rate)}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-amber-400" /> Saved Address
            </p>
            <p className="text-xs font-bold text-gray-200 truncate mt-1">
              {profile.address ? `${profile.address}, ${profile.city}` : 'Not set yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Navigation Menu Card */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sticky top-28">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 px-3">
              Account Menu
            </h3>

            <nav className="space-y-1.5">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'orders' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package size={16} className={activeTab === 'orders' ? 'text-white' : 'text-gray-500'} />
                  <span>Order History</span>
                </div>
                {totalOrdersCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'orders' ? 'bg-white text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {totalOrdersCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'profile' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User size={16} className={activeTab === 'profile' ? 'text-white' : 'text-gray-500'} />
                  <span>Account Details</span>
                </div>
                <ChevronRight size={14} className="opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'addresses' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin size={16} className={activeTab === 'addresses' ? 'text-white' : 'text-gray-500'} />
                  <span>Delivery Address</span>
                </div>
                <ChevronRight size={14} className="opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab('tracking')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'tracking' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Truck size={16} className={activeTab === 'tracking' ? 'text-white' : 'text-gray-500'} />
                  <span>Track Shipment</span>
                </div>
                <ChevronRight size={14} className="opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab('support')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'support' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle size={16} className={activeTab === 'support' ? 'text-white' : 'text-gray-500'} />
                  <span>Customer Support</span>
                </div>
                <ChevronRight size={14} className="opacity-60" />
              </button>
            </nav>

            <div className="pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-extrabold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
              >
                <LogOut size={16} />
                <span>Log Out Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="lg:col-span-3">
          {/* TAB 1: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <h2 className="text-xl font-bold font-serif text-gray-900">Order History</h2>
                  <p className="text-xs text-gray-500 mt-0.5">View and track all your purchases with Elegan BD</p>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                  {(['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED'] as const).map(filterKey => (
                    <button
                      key={filterKey}
                      onClick={() => setOrderStatusFilter(filterKey)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                        orderStatusFilter === filterKey 
                          ? 'bg-white text-gray-900 shadow-xs' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {filterKey === 'ALL' ? 'All Orders' : filterKey === 'ACTIVE' ? 'Active' : filterKey === 'DELIVERED' ? 'Delivered' : 'Cancelled'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Search Input */}
              {myOrders.length > 0 && (
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search orders by Order ID or Product name..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand-ink focus:bg-white transition-all"
                  />
                  {orderSearchQuery && (
                    <button 
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Orders List */}
              {filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <Package size={52} className="text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base font-bold text-gray-800">No Orders Found</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto mb-6">
                    {orderSearchQuery || orderStatusFilter !== 'ALL' 
                      ? 'No orders match your filter criteria. Try clearing search.' 
                      : 'You have not placed any orders yet. Explore our latest luxury collection!'}
                  </p>
                  <Link 
                    to="/shop" 
                    className="inline-flex items-center gap-2 bg-brand-ink text-white hover:bg-brand-gold hover:text-brand-ink transition-all px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md"
                  >
                    <ShoppingBag size={14} /> Start Shopping Now
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredOrders.map(order => (
                    <div 
                      key={order.id} 
                      className="border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-all bg-white shadow-xs space-y-4"
                    >
                      {/* Header row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 font-mono font-bold text-xs shrink-0">
                            #{order.invoiceNo || order.id}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-gray-900 font-mono">
                                Order #{order.invoiceNo || order.id}
                              </span>
                              {renderStatusBadge(order.status)}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                              <Calendar size={12} /> {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            onClick={() => setSelectedInvoiceOrder(order)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <FileText size={13} /> View Invoice
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('tracking');
                              setTrackingIdInput(String(order.invoiceNo || order.id));
                            }}
                            className="bg-brand-ink/10 hover:bg-brand-ink text-brand-ink hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Truck size={13} /> Track
                          </button>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="divide-y divide-gray-100">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="py-2.5 flex items-center gap-4">
                            {item.images && item.images[0] ? (
                              <img 
                                src={item.images[0]} 
                                alt={item.name} 
                                className="w-12 h-14 object-cover rounded-lg border border-gray-200 shrink-0 bg-gray-50" 
                              />
                            ) : (
                              <div className="w-12 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                                <Package size={20} />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Size: <span className="font-semibold text-gray-700">{item.selectedSize || 'Free'}</span> • Qty: <span className="font-semibold text-gray-700">{item.quantity}</span>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-gray-900 font-mono">
                                {formatPrice(item.price * item.quantity, currency, rate)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer Details */}
                      <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="text-gray-600">
                          <span className="font-semibold text-gray-800">Delivery Address:</span> {order.address}, {order.city}
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Amount</span>
                            <span className="text-base font-black text-brand-ink font-mono">
                              {formatPrice(order.total, currency, rate)}
                            </span>
                          </div>

                          <a
                            href={`https://wa.me/8801327772213?text=Hi%20Elegan%20BD,%20I%20have%20a%20question%20regarding%20Order%20%23${order.invoiceNo || order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-extrabold text-[11px] flex items-center gap-1.5 transition-all"
                          >
                            <MessageSquare size={13} /> Support
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACCOUNT DETAILS */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold font-serif text-gray-900">Account Profile</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage your display name, Gmail address, and phone numbers</p>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="bg-brand-ink hover:bg-brand-gold hover:text-brand-ink text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={14} /> Edit Profile
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Gmail / Email - PERMANENT & UNCHANGEABLE */}
                  <div className="sm:col-span-2 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail size={14} className="text-brand-ink" />
                        Gmail Account / Email Address *
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                        <Lock size={11} className="text-amber-700" />
                        Permanent Account • Cannot Be Changed
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="email"
                        disabled
                        readOnly
                        value={accountEmail}
                        className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-xs text-gray-900 font-semibold cursor-not-allowed shadow-2xs"
                      />
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    
                    <p className="text-[11px] text-gray-600 mt-2 flex items-center gap-1 font-medium">
                      <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                      <span>This Gmail account is permanently bound to your Elegan BD profile for secure order history tracking.</span>
                    </p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Account Full Name *
                    </label>
                    <input
                      type="text"
                      disabled={!isEditingProfile}
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="e.g. Sabbir Rahman"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand-ink focus:bg-white transition-all disabled:opacity-75 disabled:cursor-not-allowed font-medium"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Primary Mobile Phone *
                    </label>
                    <input
                      type="tel"
                      disabled={!isEditingProfile}
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="e.g. 01712345678"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand-ink focus:bg-white transition-all disabled:opacity-75 disabled:cursor-not-allowed font-mono"
                      required
                    />
                  </div>

                  {/* Alternative Phone */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Alternative Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      disabled={!isEditingProfile}
                      value={profile.secondaryPhone || ''}
                      onChange={(e) => setProfile({ ...profile, secondaryPhone: e.target.value })}
                      placeholder="e.g. 01812345678"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand-ink focus:bg-white transition-all disabled:opacity-75 disabled:cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                {isEditingProfile && (
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Save size={15} /> Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 3: SAVED DELIVERY ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <h2 className="text-xl font-bold font-serif text-gray-900 flex items-center gap-2">
                    <MapPin className="text-blue-600" size={22} />
                    Saved Delivery Addresses
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Pre-set your delivery locations for fast 1-click order checkout</p>
                </div>
                {!isAddingAddress && (
                  <button
                    onClick={handleOpenAddAddress}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer shrink-0"
                  >
                    <Plus size={18} className="stroke-[3]" /> Add New Address
                  </button>
                )}
              </div>

              {/* Add / Edit Address Form */}
              {isAddingAddress ? (
                <form onSubmit={handleSaveAddressItem} className="bg-blue-50/40 p-6 rounded-2xl border border-blue-100 space-y-5">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                    <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                      <MapPin size={16} className="text-blue-600" />
                      {editingAddressId ? 'Edit Delivery Location' : 'Add New Delivery Location'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="text-xs font-bold text-gray-500 hover:text-gray-800 p-1"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Address Title / Preset selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                      Location Label / Tag *
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['Home', 'Office', 'Apartment', 'Family House', 'Studio'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setAddressForm({ ...addressForm, title: tag })}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            addressForm.title === tag
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {tag === 'Home' && '🏠 '}
                          {tag === 'Office' && '🏢 '}
                          {tag === 'Apartment' && '🏬 '}
                          {tag}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={addressForm.title}
                      onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                      placeholder="Custom label (e.g. My Flat, Shop 2)"
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-medium outline-none focus:border-blue-600 shadow-2xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Recipient Name */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Recipient Name *
                      </label>
                      <input
                        type="text"
                        value={addressForm.name}
                        onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                        placeholder="Full name"
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-medium outline-none focus:border-blue-600 shadow-2xs"
                        required
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Mobile Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        placeholder="017XXXXXXXX"
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-medium outline-none focus:border-blue-600 shadow-2xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Street Address */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Full Street Address / House & Road *
                    </label>
                    <textarea
                      rows={2}
                      value={addressForm.address}
                      onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                      placeholder="House #12, Road #4, Block #B, Mirpur 1, Dhaka"
                      className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs text-gray-900 font-medium outline-none focus:border-blue-600 shadow-2xs resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* City / District */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        City / District *
                      </label>
                      <select
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value, thana: '' })}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-semibold outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                      >
                        <option value="Dhaka">Inside Dhaka</option>
                        <option value="Outside Dhaka">Outside Dhaka</option>
                        {Object.keys(DISTRICT_THANAS).filter(d => d !== 'Dhaka').map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </div>

                    {/* Thana */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Thana / Area (Optional)
                      </label>
                      {DISTRICT_THANAS[addressForm.city] ? (
                        <select
                          value={addressForm.thana}
                          onChange={(e) => setAddressForm({ ...addressForm, thana: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-medium outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                        >
                          <option value="">Select thana/area</option>
                          {DISTRICT_THANAS[addressForm.city].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={addressForm.thana}
                          onChange={(e) => setAddressForm({ ...addressForm, thana: e.target.value })}
                          placeholder="Thana / Area name"
                          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-medium outline-none focus:border-blue-600 shadow-2xs"
                        />
                      )}
                    </div>
                  </div>

                  {/* Primary checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isDefaultAddress"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="isDefaultAddress" className="text-xs font-bold text-gray-800 cursor-pointer">
                      Set as Primary Delivery Address (Auto-fills during checkout)
                    </label>
                  </div>

                  {/* Submit buttons */}
                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Save size={15} /> Save Location
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Address Cards List */
                <div className="space-y-4">
                  {savedAddresses.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                        <MapPin size={24} />
                      </div>
                      <h3 className="text-sm font-bold text-gray-800">No Delivery Addresses Saved Yet</h3>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        Save your home or office location now to make your future shopping fast and seamless!
                      </p>
                      <button
                        onClick={handleOpenAddAddress}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Plus size={16} /> Add Your First Location
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                            addr.isDefault
                              ? 'border-blue-500 bg-blue-50/30 shadow-xs ring-2 ring-blue-500/20'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-2xs'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full ${
                                addr.isDefault
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {addr.title.toLowerCase().includes('office') ? <Building2 size={13} /> : <Home size={13} />}
                                {addr.title}
                              </span>

                              {addr.isDefault && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 size={12} className="text-emerald-600" /> Primary Address
                                </span>
                              )}
                            </div>

                            <div className="text-xs space-y-1 text-gray-800 pt-1">
                              <p className="font-extrabold text-sm text-gray-900">{addr.name}</p>
                              <p className="text-gray-600 font-medium leading-relaxed">{addr.address}</p>
                              <p className="text-gray-500">
                                {addr.thana ? `${addr.thana}, ` : ''}{addr.city}
                              </p>
                              <p className="text-gray-900 font-bold font-mono pt-1">📞 {addr.phone}</p>
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-4 gap-2">
                            {!addr.isDefault ? (
                              <button
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                              >
                                Set as Primary
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-gray-400">Default for checkout</span>
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditAddress(addr)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Address"
                              >
                                <Edit3 size={15} />
                              </button>

                              <button
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Address"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRACK SHIPMENT */}
          {activeTab === 'tracking' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold font-serif text-gray-900">Track Order Shipment</h2>
                <p className="text-xs text-gray-500 mt-0.5">Enter your Order Invoice ID to view real-time delivery status</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <div className="relative flex-1">
                  <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={trackingIdInput}
                    onChange={(e) => setTrackingIdInput(e.target.value)}
                    placeholder="Enter Order ID (e.g. 2670084)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand-ink focus:bg-white transition-all font-mono"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!trackingIdInput.trim()) {
                      toast.error('Please enter an Order ID to track');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <Search size={15} /> Track Now
                </button>
              </div>

              {/* Status Visual Pipeline if order matched */}
              {(() => {
                const matchedOrder = trackingIdInput.trim() 
                  ? orders.find(o => String(o.invoiceNo || o.id) === trackingIdInput.trim())
                  : myOrders[0];

                if (!matchedOrder) {
                  return (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <Truck size={40} className="text-gray-300 mx-auto mb-3" />
                      <p className="text-xs font-bold text-gray-700">No matching order loaded for tracking</p>
                      <p className="text-[11px] text-gray-500 mt-1">Select an order from your Order History tab or enter your invoice number above.</p>
                    </div>
                  );
                }

                const s = (matchedOrder.status || '').toUpperCase();
                const isDelivered = ['DELIVERED', 'SUCCESS'].includes(s);
                const isShipped = isDelivered || ['SHIPPED', 'PREPARING', 'QC', 'PRINTED'].includes(s);
                const isProcessing = isShipped || ['PROCESSING'].includes(s);
                const isPlaced = true;

                return (
                  <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50/50 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-4">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-brand-gold tracking-widest block">Live Status</span>
                        <h3 className="text-base font-bold text-gray-900 font-mono">Order #{matchedOrder.invoiceNo || matchedOrder.id}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Placed on {new Date(matchedOrder.createdAt).toLocaleDateString()}</p>
                      </div>
                      {renderStatusBadge(matchedOrder.status)}
                    </div>

                    {/* Progress Timeline */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
                      {/* Step 1 */}
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs mb-2 ${
                          isPlaced ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'
                        }`}>
                          <Check size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-900">Order Placed</span>
                        <span className="text-[10px] text-gray-500 mt-0.5">Order Received</span>
                      </div>

                      {/* Step 2 */}
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs mb-2 ${
                          isProcessing ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'
                        }`}>
                          <Package size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-900">Processing & QC</span>
                        <span className="text-[10px] text-gray-500 mt-0.5">Quality Check</span>
                      </div>

                      {/* Step 3 */}
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs mb-2 ${
                          isShipped ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'
                        }`}>
                          <Truck size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-900">In Transit</span>
                        <span className="text-[10px] text-gray-500 mt-0.5">{matchedOrder.courier || 'Steadfast Courier'}</span>
                      </div>

                      {/* Step 4 */}
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs mb-2 ${
                          isDelivered ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'
                        }`}>
                          <CheckCircle2 size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-900">Delivered</span>
                        <span className="text-[10px] text-gray-500 mt-0.5">Package Handed Over</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: CUSTOMER SUPPORT */}
          {activeTab === 'support' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold font-serif text-gray-900">Customer Support & Help</h2>
                <p className="text-xs text-gray-500 mt-0.5">We are here to assist you with any questions, returns, or order updates</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp Chat Card */}
                <a
                  href={`https://wa.me/8801327772213?text=Hello%20Elegan%20BD,%20I%20am%20${encodeURIComponent(accountDisplayName)}%20(${encodeURIComponent(accountEmail)}).%20I%20need%20assistance.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-all flex items-start gap-4 cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      WhatsApp Live Chat
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">Instant support from our customer care team on WhatsApp</p>
                    <span className="text-xs font-bold text-emerald-700 mt-3 inline-flex items-center gap-1">
                      Chat Now <ArrowRight size={13} />
                    </span>
                  </div>
                </a>

                {/* Phone Call Card */}
                <a
                  href="tel:01327772213"
                  className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition-all flex items-start gap-4 cursor-pointer group shadow-2xs"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                    <PhoneCall size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      Helpline Call
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">Call us directly at 01327772213 (10 AM - 10 PM)</p>
                    <span className="text-xs font-extrabold text-emerald-700 font-mono mt-3 inline-flex items-center gap-1.5 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Phone size={13} className="text-emerald-700" /> 01327772213
                    </span>
                  </div>
                </a>
              </div>

              {/* Policy cards */}
              <div className="border-t border-gray-100 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <ShieldCheck size={20} className="text-brand-gold mb-2" />
                  <h4 className="font-bold text-gray-900">7-Day Replacement</h4>
                  <p className="text-gray-500 text-[11px]">Easy exchanges for size or manufacturing issues</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <Truck size={20} className="text-brand-gold mb-2" />
                  <h4 className="font-bold text-gray-900">Fast Delivery</h4>
                  <p className="text-gray-500 text-[11px]">24-48 hrs in Dhaka, 2-3 days across Bangladesh</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <CheckCircle2 size={20} className="text-brand-gold mb-2" />
                  <h4 className="font-bold text-gray-900">Authentic Quality</h4>
                  <p className="text-gray-500 text-[11px]">100% premium fabric and genuine crafting</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Viewer Modal */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-[170mm] w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-brand-gold" />
                <span className="font-mono text-xs font-bold">
                  Invoice #{selectedInvoiceOrder.invoiceNo || selectedInvoiceOrder.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoiceOrder(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex justify-center bg-gray-100">
              <InvoiceTemplate order={selectedInvoiceOrder} preview={true} />
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="bg-brand-ink text-white hover:bg-brand-gold hover:text-brand-ink font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <FileText size={14} /> Print Invoice
              </button>
              <button
                onClick={() => setSelectedInvoiceOrder(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
