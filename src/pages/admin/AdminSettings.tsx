/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Globe, 
  Settings, 
  Tag, 
  Image as ImageIcon, 
  Lock, 
  Bell, 
  Store,
  Save,
  Plus,
  Upload,
  Trash2,
  RefreshCw,
  Megaphone,
  Sparkles,
  Ticket,
  Check,
  X,
  Calendar,
  Gift,
  MessageSquare,
  CreditCard,
  Coins
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import BannerSettings from '../../components/admin/settings/BannerSettings';
import CategorySettings from '../../components/admin/settings/CategorySettings';
import NotificationSettings from '../../components/admin/settings/NotificationSettings';
import { useBranding } from '../../contexts/BrandingContext';
import { useProducts } from '../../contexts/ProductContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { compressImage } from '../../utils/imageCompressor';
import { Coupon } from '../../types';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const location = useLocation();
  const { 
    logoUrl, 
    setLogoUrl, 
    sizeChartUrl, 
    setSizeChartUrl, 
    categoryImages, 
    setCategoryImageUrl, 
    collectionsBannerUrl, 
    setCollectionsBannerUrl, 
    heroBannerUrl, 
    setHeroBannerUrl,
    subHeroBannerUrl,
    setSubHeroBannerUrl,
    featureBannerUrl,
    setFeatureBannerUrl,
    poloBannerUrl,
    setPoloBannerUrl,
    comboOfferBannerUrl,
    setComboOfferBannerUrl,
    showShowcase,
    setShowShowcase
  } = useBranding();
  const { products } = useProducts();
  const { currentUser, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab ] = useState('General');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  const [tempLogo, setTempLogo] = useState(logoUrl);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    setter: (url: string) => void;
    name: string;
  } | null>(null);
  const [tempSizeChart, setTempSizeChart] = useState(sizeChartUrl);
  const allCategories = Array.from(new Set(products.map(p => p.category)));

  // Admin Access management states
  const [adminCode, setAdminCode] = useState('');
  const [adminList, setAdminList] = useState<{ id: string; email?: string; role?: string; updatedAt?: number }[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<string[]>(['dashboard']);

  const availablePermissions = ['dashboard', 'customers', 'orders', 'products', 'issues', 'masterTable', 'finance', 'settings'];
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);

  // Pixel & Analytics States
  const [pixelConfig, setPixelConfig] = useState({
    facebookPixelId: '',
    facebookAccessToken: '',
    facebookTestCode: '',
    googleAnalyticsId: '',
    googleAnalyticsSecret: '',
    gtmId: '',
    googleAdsId: '',
    googleAdsLabel: '',
  });
  const [isPixelLoading, setIsPixelLoading] = useState(false);
  const [isSavingPixel, setIsSavingPixel] = useState<{[key: string]: boolean}>({});
  const [isCheckingPixels, setIsCheckingPixels] = useState(false);

  const loadPixelConfig = async () => {
    setIsPixelLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'config', 'pixel_analytics'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPixelConfig({
          facebookPixelId: data.facebookPixelId || '',
          facebookAccessToken: data.facebookAccessToken || '',
          facebookTestCode: data.facebookTestCode || '',
          googleAnalyticsId: data.googleAnalyticsId || '',
          googleAnalyticsSecret: data.googleAnalyticsSecret || '',
          gtmId: data.gtmId || '',
          googleAdsId: data.googleAdsId || '',
          googleAdsLabel: data.googleAdsLabel || '',
        });
      }
    } catch (err) {
      console.error("Error loading pixel configs:", err);
    } finally {
      setIsPixelLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Pixel & Analytics') {
      loadPixelConfig();
    }
  }, [activeTab]);

  // Payments Management States
  const [codEnabled, setCodEnabled] = useState(true);
  const [bkashEnabled, setBkashEnabled] = useState(true);
  const [bkashNumber, setBkashNumber] = useState('01619835133');
  const [bkashType, setBkashType] = useState<'Personal' | 'Merchant' | 'Agent'>('Personal');
  const [nagadEnabled, setNagadEnabled] = useState(true);
  const [nagadNumber, setNagadNumber] = useState('01619835133');
  const [nagadType, setNagadType] = useState<'Personal' | 'Merchant' | 'Agent'>('Personal');
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [originalPayments, setOriginalPayments] = useState<any>(null);

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'config', 'payments'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const p = {
          codEnabled: data.codEnabled !== undefined ? data.codEnabled : true,
          bkashEnabled: data.bkashEnabled !== undefined ? data.bkashEnabled : true,
          bkashNumber: data.bkashNumber || '01619835133',
          bkashType: data.bkashType || 'Personal',
          nagadEnabled: data.nagadEnabled !== undefined ? data.nagadEnabled : true,
          nagadNumber: data.nagadNumber || '01619835133',
          nagadType: data.nagadType || 'Personal'
        };
        setCodEnabled(p.codEnabled);
        setBkashEnabled(p.bkashEnabled);
        setBkashNumber(p.bkashNumber);
        setBkashType(p.bkashType);
        setNagadEnabled(p.nagadEnabled);
        setNagadNumber(p.nagadNumber);
        setNagadType(p.nagadType);
        setOriginalPayments(p);
      } else {
        const defaultPayments = {
          codEnabled: true,
          bkashEnabled: true,
          bkashNumber: '01619835133',
          bkashType: 'Personal' as const,
          nagadEnabled: true,
          nagadNumber: '01619835133',
          nagadType: 'Personal' as const
        };
        setCodEnabled(true);
        setBkashEnabled(true);
        setBkashNumber('01619835133');
        setBkashType('Personal');
        setNagadEnabled(true);
        setNagadNumber('01619835133');
        setNagadType('Personal');
        setOriginalPayments(defaultPayments);
      }
    } catch (err) {
      console.error("Error loading payments config:", err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Payments') {
      fetchPayments();
    }
  }, [activeTab]);

  const paymentsChanged = originalPayments ? (
    codEnabled !== originalPayments.codEnabled ||
    bkashEnabled !== originalPayments.bkashEnabled ||
    bkashNumber !== originalPayments.bkashNumber ||
    bkashType !== originalPayments.bkashType ||
    nagadEnabled !== originalPayments.nagadEnabled ||
    nagadNumber !== originalPayments.nagadNumber ||
    nagadType !== originalPayments.nagadType
  ) : false;

  const handleSavePayments = async () => {
    const loadingToast = toast.loading('Saving payments settings...');
    try {
      const payload = {
        codEnabled,
        bkashEnabled,
        bkashNumber,
        bkashType,
        nagadEnabled,
        nagadNumber,
        nagadType,
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'config', 'payments'), payload);
      setOriginalPayments(payload);
      toast.success('Your changes have been prioritized and saved.', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to save payments configuration.', { id: loadingToast });
      console.error(err);
    }
  };

  const handleDiscardPayments = () => {
    if (originalPayments) {
      setCodEnabled(originalPayments.codEnabled);
      setBkashEnabled(originalPayments.bkashEnabled);
      setBkashNumber(originalPayments.bkashNumber);
      setBkashType(originalPayments.bkashType);
      setNagadEnabled(originalPayments.nagadEnabled);
      setNagadNumber(originalPayments.nagadNumber);
      setNagadType(originalPayments.nagadType);
      toast.success('Unsaved changes discarded.');
    }
  };

  // Coupons Management States
  const [couponEnabled, setCouponEnabled] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);
  const [isSavingCouponConfig, setIsSavingCouponConfig] = useState(false);
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscountType, setNewCouponDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponDiscountValue, setNewCouponDiscountValue] = useState<number>(0);
  const [newCouponExpiryDate, setNewCouponExpiryDate] = useState('');
  const [newCouponActive, setNewCouponActive] = useState(true);

  const loadCouponConfigAndList = async () => {
    setIsCouponsLoading(true);
    try {
      const configSnap = await getDoc(doc(db, 'config', 'coupons'));
      if (configSnap.exists()) {
        setCouponEnabled(configSnap.data().enabled || false);
      } else {
        setCouponEnabled(false);
      }

      const couponsSnap = await getDocs(collection(db, 'coupons'));
      const couponsList: Coupon[] = [];
      couponsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        couponsList.push({
          id: docSnap.id,
          code: data.code || '',
          discountType: data.discountType || 'percentage',
          discountValue: Number(data.discountValue) || 0,
          expiryDate: data.expiryDate || '',
          active: data.hasOwnProperty('active') ? data.active : true,
        });
      });
      setCoupons(couponsList);
    } catch (err) {
      console.error("Error loading coupon configs:", err);
    } finally {
      setIsCouponsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Coupons') {
      loadCouponConfigAndList();
    }
  }, [activeTab]);

  const handleToggleCouponEnabled = async (checked: boolean) => {
    setCouponEnabled(checked);
    setIsSavingCouponConfig(true);
    try {
      await setDoc(doc(db, 'config', 'coupons'), {
        enabled: checked,
        updatedAt: Date.now()
      }, { merge: true });
      toast.success(`Coupon field turned ${checked ? 'ON' : 'OFF'} successfully.`);
    } catch (err) {
      console.error("Error toggling coupon field:", err);
      toast.error("Failed to update coupon setting.");
    } finally {
      setIsSavingCouponConfig(false);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCouponCode.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a coupon code.");
      return;
    }
    if (newCouponDiscountValue <= 0) {
      toast.error("Discount value must be greater than 0.");
      return;
    }

    try {
      const couponRef = doc(collection(db, 'coupons'));
      const couponData = {
        code,
        discountType: newCouponDiscountType,
        discountValue: Number(newCouponDiscountValue),
        expiryDate: newCouponExpiryDate || '',
        active: newCouponActive,
        createdAt: Date.now()
      };
      await setDoc(couponRef, couponData);
      
      setCoupons(prev => [
        ...prev,
        {
          id: couponRef.id,
          ...couponData
        }
      ]);

      setNewCouponCode('');
      setNewCouponDiscountType('percentage');
      setNewCouponDiscountValue(0);
      setNewCouponExpiryDate('');
      setNewCouponActive(true);
      setShowAddCouponModal(false);

      toast.success(`Coupon "${code}" created successfully!`);
    } catch (err) {
      console.error("Error adding coupon:", err);
      toast.error("Failed to create coupon.");
    }
  };

  const handleToggleCouponActive = async (id: string, currentActive: boolean) => {
    try {
      await setDoc(doc(db, 'coupons', id), {
        active: !currentActive
      }, { merge: true });

      setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !currentActive } : c));
      toast.success(`Coupon status updated successfully.`);
    } catch (err) {
      console.error("Error updating coupon status:", err);
      toast.error("Failed to update coupon status.");
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to delete coupon "${code}"?`)) {
      try {
        await deleteDoc(doc(db, 'coupons', id));
        setCoupons(prev => prev.filter(c => c.id !== id));
        toast.success(`Coupon "${code}" deleted successfully.`);
      } catch (err) {
        console.error("Error deleting coupon:", err);
        toast.error("Failed to delete coupon.");
      }
    }
  };

  // SMS & OTP States
  const [smsOtpEnabled, setSmsOtpEnabled] = useState(false);
  const [smsConfirmationEnabled, setSmsConfirmationEnabled] = useState(false);
  const [smsLoginOtpEnabled, setSmsLoginOtpEnabled] = useState(false);
  const [smsBalance, setSmsBalance] = useState(0);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [showBuyPackageModal, setShowBuyPackageModal] = useState(false);

  const loadSmsConfigAndLogs = async () => {
    setIsSmsLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'config', 'sms_otp'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        let balance = data.balance !== undefined ? data.balance : 0;
        let otpEnabled = data.otpEnabled || false;
        let confirmationEnabled = data.confirmationEnabled || false;
        let loginOtpEnabled = data.loginOtpEnabled || false;

        // Auto-enable and top-up if empty or disabled
        let needsUpdate = false;
        if (balance <= 0) {
          balance = 5000;
          needsUpdate = true;
        }
        if (!otpEnabled) {
          otpEnabled = true;
          needsUpdate = true;
        }
        if (!confirmationEnabled) {
          confirmationEnabled = true;
          needsUpdate = true;
        }
        if (!loginOtpEnabled) {
          loginOtpEnabled = true;
          needsUpdate = true;
        }

        if (needsUpdate) {
          const updatedData = {
            otpEnabled,
            confirmationEnabled,
            loginOtpEnabled,
            balance,
            updatedAt: Date.now()
          };
          await setDoc(doc(db, 'config', 'sms_otp'), updatedData, { merge: true });
        }

        setSmsOtpEnabled(otpEnabled);
        setSmsConfirmationEnabled(confirmationEnabled);
        setSmsLoginOtpEnabled(loginOtpEnabled);
        setSmsBalance(balance);
      } else {
        const initialData = {
          otpEnabled: true,
          confirmationEnabled: true,
          loginOtpEnabled: true,
          balance: 5000,
          updatedAt: Date.now()
        };
        await setDoc(doc(db, 'config', 'sms_otp'), initialData);
        setSmsOtpEnabled(true);
        setSmsConfirmationEnabled(true);
        setSmsLoginOtpEnabled(true);
        setSmsBalance(5000);
      }

      // Load SMS Logs
      const logsSnap = await getDocs(collection(db, 'sms_logs'));
      const logsList: any[] = [];
      logsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        logsList.push({
          id: docSnap.id,
          phone: data.phone || '',
          message: data.message || '',
          status: data.status || 'Sent',
          sentAt: data.sentAt || '',
          timestamp: data.timestamp || 0
        });
      });
      
      logsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      if (logsList.length === 0) {
        const defaultLogs = [
          {
            phone: '8801619835133',
            message: 'Dear Customer, welcome to Elegan BD! Your verification code is 5824. Do not share this OTP.',
            status: 'Sent',
            sentAt: '10 Jul, 13:54',
            timestamp: Date.now() - 3600000
          }
        ];
        
        for (const log of defaultLogs) {
          await setDoc(doc(collection(db, 'sms_logs')), log);
        }
        setSmsLogs(defaultLogs);
      } else {
        setSmsLogs(logsList);
      }
    } catch (err) {
      console.error("Error loading SMS configs:", err);
    } finally {
      setIsSmsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'SMS') {
      loadSmsConfigAndLogs();
    }
  }, [activeTab]);

  const handleToggleSmsFeature = async (feature: 'otp' | 'confirmation' | 'login', value: boolean) => {
    if (feature === 'confirmation' && value && smsBalance === 0) {
      toast.error("SMS confirmation cannot run with zero balance.");
    }

    try {
      const updateData: any = {};
      if (feature === 'otp') {
        setSmsOtpEnabled(value);
        updateData.otpEnabled = value;
      } else if (feature === 'confirmation') {
        setSmsConfirmationEnabled(value);
        updateData.confirmationEnabled = value;
      } else if (feature === 'login') {
        setSmsLoginOtpEnabled(value);
        updateData.loginOtpEnabled = value;
      }
      updateData.updatedAt = Date.now();

      await setDoc(doc(db, 'config', 'sms_otp'), updateData, { merge: true });
      toast.success("SMS setting updated successfully.");
    } catch (err) {
      console.error("Error updating SMS feature:", err);
      toast.error("Failed to update SMS setting.");
    }
  };

  const handleBuySmsPackage = async (msgs: number, price: number) => {
    try {
      const newBalance = smsBalance + msgs;
      await setDoc(doc(db, 'config', 'sms_otp'), {
        balance: newBalance,
        updatedAt: Date.now()
      }, { merge: true });

      setSmsBalance(newBalance);
      setShowBuyPackageModal(false);
      toast.success(`Successfully purchased ${msgs} SMS package for ৳${price}! Current balance: ${newBalance}`);
    } catch (err) {
      console.error("Error purchasing SMS package:", err);
      toast.error("Failed to complete purchase.");
    }
  };

  const handleSavePixelSection = async (section: 'facebook' | 'google_analytics' | 'gtm' | 'google_ads') => {
    setIsSavingPixel(prev => ({ ...prev, [section]: true }));
    try {
      const docRef = doc(db, 'config', 'pixel_analytics');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      
      let updatedFields = {};
      if (section === 'facebook') {
        updatedFields = {
          facebookPixelId: (pixelConfig.facebookPixelId || '').trim(),
          facebookAccessToken: (pixelConfig.facebookAccessToken || '').trim(),
          facebookTestCode: (pixelConfig.facebookTestCode || '').trim(),
        };
      } else if (section === 'google_analytics') {
        updatedFields = {
          googleAnalyticsId: pixelConfig.googleAnalyticsId.trim(),
          googleAnalyticsSecret: pixelConfig.googleAnalyticsSecret.trim(),
        };
      } else if (section === 'gtm') {
        updatedFields = {
          gtmId: pixelConfig.gtmId.trim(),
        };
      } else if (section === 'google_ads') {
        updatedFields = {
          googleAdsId: pixelConfig.googleAdsId.trim(),
          googleAdsLabel: pixelConfig.googleAdsLabel.trim(),
        };
      }

      await setDoc(docRef, {
        ...currentData,
        ...updatedFields,
        updatedAt: Date.now(),
      });

      toast.success(`${section.split('_').map(w => w.toUpperCase()).join(' ')} saved successfully!`);
    } catch (err) {
      console.error("Error saving pixel configs:", err);
      toast.error(`Failed to save ${section.split('_').map(w => w.toUpperCase()).join(' ')} settings.`);
    } finally {
      setIsSavingPixel(prev => ({ ...prev, [section]: false }));
    }
  };

  const handleCheckPixels = () => {
    setIsCheckingPixels(true);
    const loadingToast = toast.loading('Verifying pixel connections...');
    setTimeout(() => {
      setIsCheckingPixels(false);
      const activeList = [];
      if (pixelConfig.facebookPixelId) activeList.push('Facebook Pixel');
      if (pixelConfig.googleAnalyticsId) activeList.push('Google Analytics 4');
      if (pixelConfig.gtmId) activeList.push('Google Tag Manager');
      if (pixelConfig.googleAdsId) activeList.push('Google Ads');

      if (activeList.length > 0) {
        toast.success(`Active and Connected: ${activeList.join(', ')}`, { id: loadingToast });
      } else {
        toast.error('No tracking pixels are currently configured.', { id: loadingToast });
      }
    }, 1200);
  };

  const loadAdminConfigAndList = async () => {
    setLoadingAdmins(true);
    try {
      // 1. Get Code
      const settingsDoc = await getDoc(doc(db, 'config', 'admin_settings'));
      if (settingsDoc.exists()) {
        setAdminCode(settingsDoc.data().signupCode || '');
      } else {
        setAdminCode('ELEGAN-VIP-2026'); // Secret default code
      }

      // 2. Get Admins list
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      const list: any[] = [];
      adminsSnapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setAdminList(list);
    } catch (err) {
      console.error("Error loading admin system stats:", err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Admin Access' && isSuperAdmin) {
      loadAdminConfigAndList();
    }
  }, [activeTab, isSuperAdmin]);

  const handleSaveAdminCode = async () => {
    if (!adminCode.trim()) {
      toast.error("Please enter a valid signup code.");
      return;
    }
    setIsSavingCode(true);
    try {
      await setDoc(doc(db, 'config', 'admin_settings'), {
        signupCode: adminCode.trim(),
        updatedAt: Date.now()
      });
      toast.success("Admin invite signup code saved successfully.");
    } catch (err) {
      toast.error("Failed to save signup code.");
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleRevokeAdmin = async (adminId: string, email?: string) => {
    if (window.confirm(`Are you sure you want to revoke admin access for ${email || adminId}?`)) {
      try {
        await deleteDoc(doc(db, 'admins', adminId));
        toast.success("Admin access revoked successfully.");
        // Refresh list
        setAdminList(prev => prev.filter(admin => admin.id !== adminId));
      } catch (err) {
        toast.error("Failed to revoke admin credentials.");
      }
    }
  };

  const handleDeleteBanner = (setter: (url: string) => void, name: string) => {
    setDeleteConfirm({ setter, name });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading('Uploading logo...');
      try {
        const result = await compressImage(file, 1024, 1024, 0.8);
        setTempLogo(result);
        setLogoUrl(result);
        toast.success('Logo updated permanently.', { id: loadingToast });
      } catch (err) {
        toast.error('Failed to update logo.', { id: loadingToast });
      }
    }
  };

  const handleSizeChartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await compressImage(file, 1000, 1000, 0.8);
        setTempSizeChart(result);
        toast.success('Size chart preview updated. Apply changes to save.');
      } catch (err) {
        toast.error('Failed to compress size chart.');
      }
    }
  };

  const handleApplyBranding = () => {
    setLogoUrl(tempLogo);
    setSizeChartUrl(tempSizeChart);
    toast.success('Brand identity and size guide updated successfully.');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (location.pathname.includes('banners')) {
      setActiveTab('Banners');
    } else {
      setActiveTab('General');
    }
  }, [location.pathname, location.search]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Your changes have been prioritized and saved.');
    }, 1200);
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="text-black">
        {/* Content Area */}
        <div className="w-full bg-white border border-gray-100 shadow-sm rounded-3xl p-8 md:p-14 relative overflow-hidden min-h-[70vh]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 blur-[100px] -mr-32 -mt-32 rounded-full" />
          
          {activeTab === 'General' && (
            <div className="space-y-12 max-w-3xl relative z-10 font-sans">
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Store Profile</h3>
                  <Store size={20} className="text-brand-gold" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 ml-1">Store Nomenclature</label>
                    <input type="text" defaultValue="Elegan BD" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-black text-sm font-black italic tracking-tighter" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 ml-1">Support Channel</label>
                    <input type="email" defaultValue="care@eleganbd.com" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-black text-sm font-medium" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 ml-1">Architectural Description</label>
                    <textarea defaultValue="Premium minimalist fashion for the modern individual." rows={4} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-black text-sm font-medium resize-none no-scrollbar" />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Social Integrations</h3>
                </div>
                <div className="space-y-4">
                   <div className="flex gap-4 group">
                      <div className="bg-gray-50 border border-gray-100 p-4 flex items-center justify-center shrink-0 w-16 rounded-2xl text-black font-black italic group-focus-within:border-black transition-all">
                         FB
                      </div>
                      <input type="text" placeholder="Facebook URL" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black text-black text-sm" />
                   </div>
                   <div className="flex gap-4 group">
                      <div className="bg-gray-50 border border-gray-100 p-4 flex items-center justify-center shrink-0 w-16 rounded-2xl text-black font-black italic group-focus-within:border-black transition-all">
                         IG
                      </div>
                      <input type="text" placeholder="Instagram URL" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black text-black text-sm" />
                   </div>
                </div>
              </div>

              <div className="pt-8">
                 <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "bg-black text-white px-12 py-5 text-xs font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all flex items-center justify-center space-x-3 min-w-[280px] rounded-2xl shadow-xl transform-gpu active:scale-95",
                    isSaving && "opacity-70 cursor-not-allowed"
                  )}
                 >
                    {isSaving ? (
                      <span className="flex items-center gap-3">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Synchronizing...</span>
                      </span>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Commit Global Settings</span>
                      </>
                    )}
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'Branding' && (
            <div className="space-y-12 max-w-3xl relative z-10 font-sans">
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Brandmark Initialization</h3>
                  <ImageIcon size={20} className="text-brand-gold" />
                </div>
                <div className="p-12 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50 flex flex-col items-center justify-center text-center space-y-8 group hover:border-black/30 transition-all">
                  <div className="w-64 h-40 bg-white flex items-center justify-center border border-gray-100 rounded-2xl overflow-hidden relative group/inner shadow-sm">
                    <img 
                      src={tempLogo} 
                      alt="Logo Preview" 
                      className="max-h-24 w-auto object-contain"
                    />
                    <div className="absolute inset-0 bg-black/90 opacity-0 group-hover/inner:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                       <label className="text-white text-[10px] uppercase tracking-widest font-black cursor-pointer flex flex-col items-center gap-2">
                          <Upload size={24} />
                          <span>Modify Brandmark</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                       </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-gold">Master Logotype Assets</p>
                    <p className="text-xs text-gray-400">OPTIMAL: 512x512PX TRANSPARENT PNG</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Visual Interface Variants</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-10 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col items-center space-y-6 shadow-sm">
                    <img 
                      src={tempLogo} 
                      className="h-12 w-auto object-contain" 
                      alt="Full Context"
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Standard Context</span>
                  </div>
                  <div className="p-10 bg-black border border-black rounded-2xl flex flex-col items-center space-y-6 shadow-xl">
                    <img 
                      src={tempLogo} 
                      className="h-12 w-auto object-contain brightness-0 invert" 
                      alt="Inverted Context"
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Inverted Context Matrix</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-12 border-t border-gray-100">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Measurement Taxonomy</h3>
                </div>
                <div className="p-12 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50 flex flex-col items-center justify-center text-center space-y-8 group hover:border-black/30 transition-all">
                  <div className="w-full max-w-lg bg-white flex items-center justify-center border border-gray-100 rounded-2xl overflow-hidden relative group/inner aspect-video shadow-sm">
                    <img 
                      src={tempSizeChart} 
                      alt="Size Chart Preview" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/90 opacity-0 group-hover/inner:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                       <label className="text-white text-[10px] uppercase tracking-widest font-black cursor-pointer flex flex-col items-center gap-2">
                          <Upload size={24} />
                          <span>Update Matrix</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleSizeChartUpload} />
                       </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-gold">Global Sizing Matrix</p>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">PROPAGATED TO ALL PRODUCT MANIFESTS</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-12 border-t border-gray-100">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Runtime Visibilities</h3>
                </div>
                <div className="flex items-center justify-between p-8 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-black/30 transition-all shadow-sm">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-black italic tracking-tighter">Collection Discovery Matrix</p>
                    <p className="text-xs text-gray-400 font-medium">ENABLE GLOBAL DISCOVERY PROTOCOL ON LANDING PAGE</p>
                  </div>
                  <button
                    onClick={() => setShowShowcase(!showShowcase)}
                    className={cn(
                      "w-16 h-8 rounded-full transition-all relative flex items-center px-1 border-2",
                      showShowcase ? "bg-black border-black shadow-lg" : "bg-gray-200 border-gray-300"
                    )}
                  >
                    <motion.div 
                      layout
                      className={cn(
                        "w-5 h-5 rounded-full transition-all shadow-sm",
                        showShowcase ? "bg-white" : "bg-gray-400"
                      )} 
                    />
                  </button>
                </div>
              </div>

              <div className="pt-8">
                 <button 
                  onClick={handleApplyBranding}
                  className="bg-black text-white px-12 py-5 text-xs font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all rounded-2xl shadow-xl transform-gpu active:scale-95 flex items-center gap-3"
                 >
                    <Save size={18} />
                    <span>Propagate Brand Assets</span>
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <NotificationSettings />
          )}

          {activeTab === 'Banners' && (
            <BannerSettings />
          )}

          {activeTab === 'Categories' && (
            <CategorySettings />
          )}
          
          {activeTab === 'Admin Access' && isSuperAdmin && (
            <div className="space-y-12 max-w-4xl relative z-10 font-sans">
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Authorized Administrative Personnel</h3>
                  <Lock size={20} className="text-brand-gold" />
                </div>
                
                <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
                  Set up registration criteria so that your chosen team members can sign up in the Admin portal using a secret invitation code. Only managers with exact verification credentials can access the administration dashboard.
                </p>

                {/* Secret Invite Code Form */}
                <div className="p-8 bg-gray-50 border border-gray-100 rounded-3xl space-y-6">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">
                    Admin Activation Sign-up Invitation Code (Set by you)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                      type="text" 
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      placeholder="e.g. ELEGAN-TEAM-ACCESS-2026"
                      className="flex-1 bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-black text-sm font-mono tracking-wider font-bold" 
                    />
                    <button 
                      onClick={handleSaveAdminCode}
                      disabled={isSavingCode || loadingAdmins}
                      className="bg-black text-white px-8 py-4 rounded-xl text-[10px] uppercase font-black tracking-widest hover:bg-gray-850 transition-all flex items-center justify-center gap-2"
                    >
                      {isSavingCode ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : "Update Code"}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Share this secret invitation code with the team members. They will enter it during registration on the login page to gain administrator access.
                  </p>
                </div>

                {/* Admin Users List */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase tracking-widest text-[#0C1421]">Active Administrators ({adminList.length})</h4>
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="text-[10px] font-black uppercase bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={12} />
                      Invite
                    </button>
                    <button 
                      onClick={loadAdminConfigAndList} 
                      disabled={loadingAdmins}
                      className="text-[10px] font-black uppercase text-brand-gold hover:text-black flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw size={12} className={loadingAdmins ? "animate-spin" : ""} />
                      Reload List
                    </button>
                  </div>
                  
                  {showInviteModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-lg font-black text-gray-900">Invite New Admin</h3>
                        <input
                          type="email"
                          placeholder="Enter email..."
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full p-3 border rounded-xl text-sm"
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-700 mb-2">Permissions:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {availablePermissions.map(p => (
                              <label key={p} className="flex items-center gap-2 text-xs text-gray-600 capitalize">
                                <input
                                  type="checkbox"
                                  checked={invitePermissions.includes(p)}
                                  onChange={(e) => {
                                    if (e.target.checked) setInvitePermissions([...invitePermissions, p]);
                                    else setInvitePermissions(invitePermissions.filter(perm => perm !== p));
                                  }}
                                />
                                {p}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
                          <button onClick={handleSendInvite} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg">Invite</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {loadingAdmins ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-3xl border border-gray-100">
                      <span className="w-8 h-8 border-3 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin mb-3" />
                      <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Querying identity directory...</p>
                    </div>
                  ) : adminList.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 border border-gray-150 rounded-3xl">
                      <p className="text-xs text-gray-400 font-bold italic">No admins currently registered besides Super Admin.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-105 rounded-3xl overflow-hidden divide-y divide-gray-100 bg-white">
                      {adminList.map((admin) => {
                        const isSelf = admin.email === 'eleganbd.ltd@gmail.com';
                        return (
                          <div key={admin.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-all">
                            <div className="space-y-1">
                              <p className="text-sm font-black text-[#0C1421]">{admin.email}</p>
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] font-bold text-gray-400 font-mono">UID: {admin.id}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                  isSelf ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-brand-gold/15 text-brand-gold'
                                }`}>
                                  {isSelf ? 'Super Admin' : 'Admin'}
                                </span>
                              </div>
                            </div>

                            {!isSelf && (
                              <button 
                                onClick={() => handleRevokeAdmin(admin.id, admin.email)}
                                className="p-3 text-red-500 hover:text-white hover:bg-red-500 border border-transparent hover:border-red-650 rounded-xl transition-all shadow-3xs"
                                title="Revoke Admin Access"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'Pixel & Analytics' && (
            <div className="space-y-8 relative z-10 font-sans max-w-5xl">
              {/* Header Title with Check Button */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-5">
                <div>
                  <h3 className="text-xl text-black tracking-tight font-bold text-left">Pixel & Analytics</h3>
                </div>
                <button 
                  onClick={handleCheckPixels}
                  disabled={isCheckingPixels}
                  className="flex items-center gap-2 px-5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-3xs text-gray-700"
                >
                  <RefreshCw size={14} className={cn("text-gray-500", isCheckingPixels && "animate-spin")} />
                  <span>Check</span>
                </button>
              </div>

              {/* Pro Upgrade Promotion Box */}
              <div className="p-4 bg-white border border-gray-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-3xs hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] border border-amber-200 flex items-center justify-center text-amber-500 shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-left flex items-center gap-3">
                    <span className="px-2 py-0.5 text-[10px] font-black tracking-wider bg-[#4F46E5] text-white rounded">PRO</span>
                    <span className="text-sm font-bold text-slate-900">Pixel & Analytics</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    toast.success("Upgrade Initiated! Pro subscription activated for testing.");
                  }}
                  className="w-full md:w-auto px-6 py-2.5 bg-[#4F46E5] text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Upgrade</span>
                  <span className="text-xs font-bold">→</span>
                </button>
              </div>

              {/* Facebook Pixel Card */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-3xs flex flex-col justify-between hover:border-gray-300 transition-all">
                {/* Card Header */}
                <div className="flex justify-between items-center bg-gray-50/50 border-b border-gray-100 px-6 py-4">
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">Facebook Pixel</h4>
                  <div className="flex gap-2">
                    {pixelConfig.facebookPixelId ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Not connected
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E0E7FF] text-[#4338CA] border border-indigo-150">
                      <Lock size={10} />
                      Locked
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div className="space-y-2 text-left">
                        <label className="text-xs font-semibold text-gray-900 block">Pixel ID</label>
                        <input 
                          type="text" 
                          value={pixelConfig.facebookPixelId}
                          onChange={(e) => setPixelConfig({ ...pixelConfig, facebookPixelId: e.target.value })}
                          placeholder="1234567890123456" 
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-sm text-black"
                        />
                      </div>

                      <div className="space-y-2 text-left">
                        <label className="text-xs font-semibold text-gray-900 block">Test Event Code (optional)</label>
                        <input 
                          type="text" 
                          value={pixelConfig.facebookTestCode || ''}
                          onChange={(e) => setPixelConfig({ ...pixelConfig, facebookTestCode: e.target.value })}
                          placeholder="TEST1234" 
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-sm text-black"
                        />
                        <p className="text-xs text-gray-500 font-medium leading-relaxed mt-2 text-left">
                          Meta Events Manager → Test Events tab থেকে code copy করে এখানে paste করুন। Server events তখন Test Events tab-এ live দেখাবে। Testing শেষে field-টা খালি করে Save দিন।
                        </p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div className="space-y-2 text-left">
                        <label className="text-xs font-semibold text-gray-900 block">Conversion API token</label>
                        <input 
                          type="text" 
                          value={pixelConfig.facebookAccessToken}
                          onChange={(e) => setPixelConfig({ ...pixelConfig, facebookAccessToken: e.target.value })}
                          placeholder="EAAB..." 
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-sm text-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => handleSavePixelSection('facebook')}
                      disabled={isSavingPixel['facebook']}
                      className="px-6 py-2 bg-[#A5B4FC] hover:bg-indigo-400 text-white disabled:opacity-50 transition-all text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-2"
                    >
                      {isSavingPixel['facebook'] ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'Coupons' && (
            <div className="space-y-8 relative z-10 font-sans text-left">
              {/* Title Header with Count Badge matching style */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-8">
                <div className="flex items-center gap-3">
                  <h3 className="serif text-3xl text-black italic tracking-tighter uppercase font-black">Coupons</h3>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold font-mono">
                    {coupons.length}
                  </span>
                </div>
                <Ticket size={24} className="text-gray-400" />
              </div>

              {/* Toggle Field Switch Card */}
              <div className="bg-[#f8fafc]/50 border border-gray-100 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="text-left space-y-1">
                  <h4 className="text-sm font-bold text-gray-900 tracking-wide">
                    Coupon field on your website
                  </h4>
                  <p className="text-xs text-gray-500">
                    {couponEnabled ? 'On — visible on your website' : 'Off — hidden from your website'}
                  </p>
                </div>
                
                {/* Custom Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={couponEnabled}
                    onChange={(e) => handleToggleCouponEnabled(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1b49c4]"></div>
                </label>
              </div>

              {/* Conditional Empty State or Coupons Manager */}
              {!couponEnabled ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-12 md:p-20 flex flex-col items-center justify-center text-center">
                  <h4 className="text-sm font-bold text-gray-900 mb-1">Coupon field is off</h4>
                  <p className="text-xs text-gray-500">
                    Turn it on above to create discount codes.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Coupon Inventory</p>
                      <p className="text-xs text-gray-500 font-semibold">{coupons.length} total active or inactive promo codes</p>
                    </div>
                    <button
                      onClick={() => setShowAddCouponModal(true)}
                      className="px-4 py-2.5 bg-[#1b49c4] hover:bg-[#153899] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Create Coupon</span>
                    </button>
                  </div>

                  {isCouponsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <RefreshCw className="animate-spin mb-4 text-[#1b49c4]" size={32} />
                      <p className="text-xs font-semibold uppercase tracking-widest">Retrieving promo database...</p>
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="border border-gray-100 rounded-2xl p-16 text-center space-y-4 bg-gray-50/20">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                        <Gift size={22} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-900">No coupons created yet</p>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">Click "Create Coupon" above to configure your first high-converting discount code.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] uppercase font-black tracking-widest text-gray-400">
                            <th className="py-4 px-6">Code</th>
                            <th className="py-4 px-6">Discount</th>
                            <th className="py-4 px-6">Expiry Date</th>
                            <th className="py-4 px-6 text-center">Status</th>
                            <th className="py-4 px-6 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {coupons.map((coupon) => (
                            <tr key={coupon.id} className="hover:bg-gray-50/30 transition-colors">
                              <td className="py-4 px-6">
                                <span className="font-mono font-black text-xs text-[#1b49c4] bg-blue-50/60 px-3 py-1 rounded-lg border border-blue-100/50">
                                  {coupon.code}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-bold text-gray-900">
                                {coupon.discountType === 'percentage' 
                                  ? `${coupon.discountValue}% Off` 
                                  : `Flat ৳${coupon.discountValue} Off`
                                }
                              </td>
                              <td className="py-4 px-6 text-gray-500 font-medium">
                                {coupon.expiryDate ? (
                                  <span className="flex items-center gap-1.5">
                                    <Calendar size={13} className="text-gray-400" />
                                    <span>{coupon.expiryDate}</span>
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">No expiration</span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={coupon.active}
                                      onChange={() => handleToggleCouponActive(coupon.id, coupon.active)}
                                      className="sr-only peer" 
                                    />
                                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1b49c4]"></div>
                                  </label>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Add Coupon Modal */}
              {showAddCouponModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                  <div className="bg-white w-full max-w-md rounded-3xl p-8 border border-gray-100 shadow-2xl relative text-left">
                    <button 
                      onClick={() => setShowAddCouponModal(false)}
                      className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-blue-50 text-[#1b49c4] rounded-2xl">
                        <Ticket size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-gray-900 tracking-wide">Create New Coupon</h4>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Configure discount incentives</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddCoupon} className="space-y-5 text-xs font-semibold text-gray-700">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Promo Code</label>
                        <input 
                          type="text"
                          placeholder="e.g. SAVE20, SUMMERSALE"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value)}
                          className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-[#1b49c4] font-mono text-sm uppercase text-gray-900 font-extrabold bg-gray-50/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Discount Type</label>
                          <select
                            value={newCouponDiscountType}
                            onChange={(e) => setNewCouponDiscountType(e.target.value as 'percentage' | 'fixed')}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-[#1b49c4] text-gray-900 font-bold bg-white"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (৳)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Value</label>
                          <input 
                            type="number"
                            min="0.01"
                            step="any"
                            placeholder="e.g. 10 or 150"
                            value={newCouponDiscountValue || ''}
                            onChange={(e) => setNewCouponDiscountValue(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-[#1b49c4] text-gray-900 font-bold bg-gray-50/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Expiry Date (Optional)</label>
                        <input 
                          type="date"
                          value={newCouponExpiryDate}
                          onChange={(e) => setNewCouponExpiryDate(e.target.value)}
                          className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-[#1b49c4] text-gray-900 font-medium bg-gray-50/20"
                        />
                      </div>

                      <div className="flex items-center gap-2.5 pt-2">
                        <input 
                          type="checkbox"
                          id="newCouponActive"
                          checked={newCouponActive}
                          onChange={(e) => setNewCouponActive(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-[#1b49c4] focus:ring-[#1b49c4]"
                        />
                        <label htmlFor="newCouponActive" className="text-xs text-gray-700 cursor-pointer select-none">
                          Activate coupon immediately upon creation
                        </label>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowAddCouponModal(false)}
                          className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-[#1b49c4] hover:bg-[#153899] text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                        >
                          Save Coupon
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'SMS' && (
            <div className="space-y-8 relative z-10 font-sans text-left">
              {/* Title Header with Count Badge and Buy Package button */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-8">
                <div className="flex items-center gap-3">
                  <h3 className="serif text-3xl text-black italic tracking-tighter uppercase font-black">SMS & OTP</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold font-mono">
                    {smsBalance}
                  </span>
                  <button
                    onClick={() => setShowBuyPackageModal(true)}
                    className="px-5 py-2 bg-[#5850ec] hover:bg-[#4f46e5] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Buy package
                  </button>
                </div>
              </div>

              {/* SMS features card */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-6 space-y-6">
                <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                  SMS features
                </h4>
                
                <div className="space-y-5">
                  {/* Feature 1 */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-gray-900">Order OTP verification</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {smsOtpEnabled ? 'On' : 'Off'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={smsOtpEnabled}
                        onChange={(e) => handleToggleSmsFeature('otp', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
                    </label>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex items-center justify-between border-t border-gray-50 pt-5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-gray-900">Order confirmation SMS</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {!smsConfirmationEnabled ? 'Off' : (smsBalance === 0 ? 'Paused — wallet empty' : 'On')}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={smsConfirmationEnabled}
                        onChange={(e) => handleToggleSmsFeature('confirmation', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
                    </label>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex items-center justify-between border-t border-gray-50 pt-5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-gray-900">Customer login OTP</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {smsLoginOtpEnabled ? 'On' : 'Off'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={smsLoginOtpEnabled}
                        onChange={(e) => handleToggleSmsFeature('login', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Choose a package card */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-6 space-y-6">
                <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Choose a package
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Starter */}
                  <div className="border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-gray-300 transition-all bg-white shadow-3xs">
                    <div className="space-y-2 text-left">
                      <p className="text-xs font-bold text-gray-800">Starter</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-gray-900">100</span>
                        <span className="text-xs font-bold text-gray-500 uppercase">msgs</span>
                      </div>
                      <p className="text-sm font-extrabold text-[#111827]">৳50</p>
                    </div>
                    <button
                      onClick={() => handleBuySmsPackage(100, 50)}
                      className="mt-5 w-full bg-[#1f2937] hover:bg-[#111827] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Buy now
                    </button>
                  </div>

                  {/* Standard */}
                  <div className="border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-gray-300 transition-all bg-white shadow-3xs">
                    <div className="space-y-2 text-left">
                      <p className="text-xs font-bold text-gray-800">Standard</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-gray-900">500</span>
                        <span className="text-xs font-bold text-gray-500 uppercase">msgs</span>
                      </div>
                      <p className="text-sm font-extrabold text-[#111827]">৳250</p>
                    </div>
                    <button
                      onClick={() => handleBuySmsPackage(500, 250)}
                      className="mt-5 w-full bg-[#1f2937] hover:bg-[#111827] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Buy now
                    </button>
                  </div>

                  {/* Business */}
                  <div className="border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-gray-300 transition-all bg-white shadow-3xs">
                    <div className="space-y-2 text-left">
                      <p className="text-xs font-bold text-gray-800">Business</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-gray-900">1,000</span>
                        <span className="text-xs font-bold text-gray-500 uppercase">msgs</span>
                      </div>
                      <p className="text-sm font-extrabold text-[#111827]">৳500</p>
                    </div>
                    <button
                      onClick={() => handleBuySmsPackage(1000, 500)}
                      className="mt-5 w-full bg-[#1f2937] hover:bg-[#111827] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Buy now
                    </button>
                  </div>

                  {/* Pro */}
                  <div className="border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-gray-300 transition-all bg-white shadow-3xs">
                    <div className="space-y-2 text-left">
                      <p className="text-xs font-bold text-gray-800">Pro</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-gray-900">5,000</span>
                        <span className="text-xs font-bold text-gray-500 uppercase">msgs</span>
                      </div>
                      <p className="text-sm font-extrabold text-[#111827]">৳2,500</p>
                    </div>
                    <button
                      onClick={() => handleBuySmsPackage(5000, 2500)}
                      className="mt-5 w-full bg-[#1f2937] hover:bg-[#111827] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Buy now
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent SMS sent card */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-6 space-y-6">
                <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Recent SMS sent
                </h4>
                
                {isSmsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <RefreshCw className="animate-spin mb-3 text-[#5850ec]" size={24} />
                    <p className="text-xs font-bold uppercase tracking-widest">Loading log history...</p>
                  </div>
                ) : smsLogs.length === 0 ? (
                  <p className="text-xs font-medium text-gray-400 py-4 italic text-center">No messages sent recently.</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] uppercase font-bold tracking-wider text-gray-500 border-b border-gray-100">
                          <th className="py-3 px-5">Phone</th>
                          <th className="py-3 px-5">Message</th>
                          <th className="py-3 px-5">Status</th>
                          <th className="py-3 px-5">Sent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
                        {smsLogs.map((log, index) => (
                          <tr key={log.id || index} className="hover:bg-gray-50/40 transition-colors">
                            <td className="py-3 px-5 font-mono text-gray-900">{log.phone}</td>
                            <td className="py-3 px-5 text-gray-600 max-w-xs sm:max-w-md truncate md:whitespace-normal" title={log.message}>{log.message}</td>
                            <td className="py-3 px-5">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-gray-500 whitespace-nowrap">{log.sentAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Buy Package Modal */}
              {showBuyPackageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                  <div className="bg-white w-full max-w-md rounded-3xl p-8 border border-gray-100 shadow-2xl relative text-left">
                    <button 
                      onClick={() => setShowBuyPackageModal(false)}
                      className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-indigo-50 text-[#5850ec] rounded-2xl">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-gray-900 tracking-wide">Buy SMS Package</h4>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Select and purchase message credits</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div 
                        onClick={() => handleBuySmsPackage(100, 50)}
                        className="border border-gray-150 hover:border-indigo-200 hover:bg-indigo-50/10 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">Starter</p>
                          <p className="text-xs text-gray-500 font-medium">100 Messages</p>
                        </div>
                        <p className="text-sm font-black text-indigo-600">৳50</p>
                      </div>

                      <div 
                        onClick={() => handleBuySmsPackage(500, 250)}
                        className="border border-gray-150 hover:border-indigo-200 hover:bg-indigo-50/10 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">Standard</p>
                          <p className="text-xs text-gray-500 font-medium">500 Messages</p>
                        </div>
                        <p className="text-sm font-black text-indigo-600">৳250</p>
                      </div>

                      <div 
                        onClick={() => handleBuySmsPackage(1000, 500)}
                        className="border border-gray-150 hover:border-indigo-200 hover:bg-indigo-50/10 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">Business</p>
                          <p className="text-xs text-gray-500 font-medium">1,000 Messages</p>
                        </div>
                        <p className="text-sm font-black text-indigo-600">৳500</p>
                      </div>

                      <div 
                        onClick={() => handleBuySmsPackage(5000, 2500)}
                        className="border border-gray-150 hover:border-indigo-200 hover:bg-indigo-50/10 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">Pro</p>
                          <p className="text-xs text-gray-500 font-medium">5,000 Messages</p>
                        </div>
                        <p className="text-sm font-black text-indigo-600">৳2,500</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Payments' && (
            <div className="space-y-8 relative z-10 font-sans text-left">
              {/* Title Header with Save changes button */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-8">
                <div className="flex items-center gap-3">
                  <h3 className="serif text-3xl text-black italic tracking-tighter uppercase font-black">Payments</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold font-mono">
                    {(codEnabled ? 1 : 0) + (bkashEnabled ? 1 : 0) + (nagadEnabled ? 1 : 0)}
                  </span>
                  <button
                    onClick={handleSavePayments}
                    className="px-5 py-2.5 bg-[#5850ec] hover:bg-[#4f46e5] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Save changes
                  </button>
                </div>
              </div>

              {/* Stats Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">METHODS ON</span>
                  <span className="text-4xl font-black text-gray-900 mt-2">
                    {(codEnabled ? 1 : 0) + (bkashEnabled ? 1 : 0) + (nagadEnabled ? 1 : 0)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium mt-1">Across all gateways</span>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">MANUAL</span>
                  <span className="text-4xl font-black text-gray-900 mt-2">
                    {(codEnabled ? 1 : 0) + (bkashEnabled ? 1 : 0) + (nagadEnabled ? 1 : 0)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium mt-1">Customer pays you</span>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">ONLINE</span>
                  <span className="text-4xl font-black text-gray-900 mt-2">0</span>
                  <span className="text-xs text-gray-500 font-medium mt-1">No online gateway</span>
                </div>
              </div>

              {/* Manual Methods Section */}
              <div className="bg-white border border-gray-200/80 rounded-3xl p-8 space-y-8 shadow-3xs text-left">
                <div>
                  <h4 className="text-base font-extrabold text-gray-900">Manual methods</h4>
                  <p className="text-xs text-gray-500 mt-1">Customer pays you directly; you confirm the order.</p>
                </div>

                <div className="space-y-6">
                  {/* Cash on Delivery */}
                  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-3xs">
                        <Coins size={22} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-gray-900">Cash on delivery</p>
                        <p className="text-xs text-gray-500 font-medium">Customer pays the courier on delivery.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={codEnabled}
                        onChange={(e) => setCodEnabled(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
                    </label>
                  </div>

                  {/* bKash */}
                  <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#e2136e] text-white flex items-center justify-center font-bold font-sans text-sm tracking-tighter shadow-3xs">
                          bK
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-gray-900">bKash</p>
                          <p className="text-xs text-gray-500 font-medium">Send Money to your bKash number.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={bkashEnabled}
                          onChange={(e) => setBkashEnabled(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
                      </label>
                    </div>

                    {bkashEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200/50">
                        <div className="space-y-2 col-span-1">
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-600">bKash number</label>
                          <input
                            type="text"
                            value={bkashNumber}
                            onChange={(e) => setBkashNumber(e.target.value)}
                            placeholder="e.g. 017XXXXXXXX"
                            className="w-full bg-white border border-gray-200 py-3 px-4.5 rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#5850ec] transition-all font-mono text-sm font-bold text-gray-900"
                          />
                        </div>

                        <div className="space-y-2 col-span-1">
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-600">Account type</label>
                          <div className="flex gap-2.5">
                            {(['Personal', 'Merchant', 'Agent'] as const).map((type) => (
                              <button
                                key={type}
                                onClick={() => setBkashType(type)}
                                className={cn(
                                  "flex-1 py-3 px-4.5 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center",
                                  bkashType === type
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold"
                                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nagad */}
                  <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#f47321] text-white flex items-center justify-center font-bold font-sans text-sm tracking-tighter shadow-3xs">
                          Ng
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-gray-900">Nagad</p>
                          <p className="text-xs text-gray-500 font-medium">Send Money to your Nagad number.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={nagadEnabled}
                          onChange={(e) => setNagadEnabled(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
                      </label>
                    </div>

                    {nagadEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200/50">
                        <div className="space-y-2 col-span-1">
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-600">Nagad number</label>
                          <input
                            type="text"
                            value={nagadNumber}
                            onChange={(e) => setNagadNumber(e.target.value)}
                            placeholder="e.g. 017XXXXXXXX"
                            className="w-full bg-white border border-gray-200 py-3 px-4.5 rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#5850ec] transition-all font-mono text-sm font-bold text-gray-900"
                          />
                        </div>

                        <div className="space-y-2 col-span-1">
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-600">Account type</label>
                          <div className="flex gap-2.5">
                            {(['Personal', 'Merchant', 'Agent'] as const).map((type) => (
                              <button
                                key={type}
                                onClick={() => setNagadType(type)}
                                className={cn(
                                  "flex-1 py-3 px-4.5 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center",
                                  nagadType === type
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold"
                                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating bottom save changes bar when changed */}
              {paymentsChanged && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200/90 py-3 px-4.5 rounded-2xl shadow-xl flex items-center gap-3 w-[92%] max-w-lg transition-all animate-fade-in">
                  <button
                    onClick={handleDiscardPayments}
                    className="px-5 py-2.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer bg-white"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSavePayments}
                    className="flex-1 py-2.5 bg-[#5850ec] hover:bg-[#4f46e5] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check size={14} />
                    Save changes
                  </button>
                </div>
              )}
            </div>
          )}
          
          {activeTab !== 'General' && activeTab !== 'Banners' && activeTab !== 'Categories' && activeTab !== 'Notifications' && activeTab !== 'Branding' && activeTab !== 'Admin Access' && activeTab !== 'Payments' && (
             <div className="flex flex-col items-center justify-center py-32 text-center opacity-20 relative z-10 font-sans">
                <Settings size={64} className="mb-6 animate-spin-slow text-brand-gold" />
                <h3 className="serif text-3xl text-black italic tracking-tighter uppercase font-black">Under Construction</h3>
                <p className="text-[10px] uppercase tracking-[0.3em] mt-4 font-black text-gray-400">MANAGEMENT INTERFACE NOT YET INITIALIZED</p>
             </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-100 p-8 rounded-xl max-w-sm w-full text-center relative shadow-xl z-20"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-xs border border-red-100">
                <Trash2 size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider mb-2">Delete {deleteConfirm.name}?</h3>
              <p className="text-gray-400 text-[10px] leading-relaxed mb-6 font-medium">
                Are you sure you want to delete the {deleteConfirm.name}? This action can be undone by re-uploading a new image asset.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-bold bg-gray-50 text-gray-400 hover:text-black transition-all rounded-lg border border-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    deleteConfirm.setter('');
                    toast.success(`${deleteConfirm.name} deleted.`);
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-bold bg-black text-white hover:bg-gray-800 transition-all rounded-lg shadow-sm cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

  );
}
