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
  Coins, 
  Truck, 
  Key, 
  CheckCircle2, 
  CheckSquare,
  Search,
  Pencil
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import BannerSettings from '../../components/admin/settings/BannerSettings';
import CategorySettings from '../../components/admin/settings/CategorySettings';
import NotificationSettings from '../../components/admin/settings/NotificationSettings';

import { useBranding } from '../../contexts/BrandingContext';
import { useProducts } from '../../contexts/ProductContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { compressImage } from '../../utils/imageCompressor';
import { autoSaveToMediaLibrary } from '../../utils/mediaLibrary';
import { Coupon } from '../../types';
import toast from 'react-hot-toast';

const formatLastActive = (timestamp: number) => {
  if (!timestamp) return 'Offline';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

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
  const { products, offerProductIds = [], updateOfferProducts, updateProduct } = useProducts();
  const { currentUser, isSuperAdmin, isSabbirRahman, permissions = [] } = useAuth();
  const { orders } = useOrders();

  const [activeTab, setActiveTab ] = useState('General');
  const [offerSearchQuery, setOfferSearchQuery] = useState('');
  const [editingOfferProduct, setEditingOfferProduct] = useState<any | null>(null);
  const [editOfferName, setEditOfferName] = useState('');
  const [editOfferPrice, setEditOfferPrice] = useState<number>(0);
  const [editOfferRegularPrice, setEditOfferRegularPrice] = useState<number | ''>('');
  const [editOfferDescription, setEditOfferDescription] = useState('');
  const [editOfferImages, setEditOfferImages] = useState<string[]>([]);
  const [editOfferSaving, setEditOfferSaving] = useState(false);

  const handleOfferImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setEditOfferImages(prev => [...prev, dataUrl]);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveOfferProduct = async () => {
    if (!editingOfferProduct) return;
    if (!editOfferName.trim()) {
      toast.error('Product name cannot be empty');
      return;
    }
    if (isNaN(Number(editOfferPrice)) || Number(editOfferPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setEditOfferSaving(true);
    try {
      const updatedProduct = {
        ...editingOfferProduct,
        name: editOfferName.trim(),
        price: Number(editOfferPrice),
        regularPrice: editOfferRegularPrice === '' ? null : Number(editOfferRegularPrice),
        description: editOfferDescription.trim(),
        images: editOfferImages
      };
      await updateProduct(updatedProduct);
      toast.success('Offer product updated successfully!');
      setEditingOfferProduct(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update product details');
    } finally {
      setEditOfferSaving(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  const [tempLogo, setTempLogo] = useState(logoUrl);
  const [tempHeroBanner, setTempHeroBanner] = useState(heroBannerUrl);
  const [tempSizeChart, setTempSizeChart] = useState(sizeChartUrl);

  useEffect(() => {
    if (logoUrl) setTempLogo(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    if (heroBannerUrl) setTempHeroBanner(heroBannerUrl);
  }, [heroBannerUrl]);

  useEffect(() => {
    if (sizeChartUrl) setTempSizeChart(sizeChartUrl);
  }, [sizeChartUrl]);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    setter: (url: string) => void;
    name: string;
  } | null>(null);
  const allCategories = Array.from(new Set(products.map(p => p.category)));

  // Admin Access management states
  const [adminCode, setAdminCode] = useState('');
  const [adminList, setAdminList] = useState<{ id: string; email?: string; role?: string; permissions?: string[]; department?: string; updatedAt?: number; isDirectAccess?: boolean }[]>([]);
  const [showDirectAccessModal, setShowDirectAccessModal] = useState(false);
  const [directAccessEmail, setDirectAccessEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['dashboard', 'orders', 'issues']);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('Sales Executive Department');
  const [isEditingAccess, setIsEditingAccess] = useState(false);
  const [editingTargetEmail, setEditingTargetEmail] = useState('');
  const [isSavingDirectAccess, setIsSavingDirectAccess] = useState(false);

  const availableModules = [
    { id: 'dashboard', name: 'Dashboard', banglaName: 'ড্যাশবোর্ড', desc: 'ওভারভিউ, চার্ট ও সেলস সামারি' },
    { id: 'customer-profiler', name: 'Customer Profiler', banglaName: 'কাস্টমার প্রোফাইলার', desc: 'গ্রাহক প্রোফাইল ও বিস্তারিত তথ্য' },
    { id: 'orders', name: 'Orders', banglaName: 'অর্ডারসমূহ', desc: 'অর্ডার লিস্ট, স্ট্যাটাস আপডেট ও কাস্টমার ডিটেইলস' },
    { id: 'exchanges', name: 'Exchanges', banglaName: 'রিটার্ন ও এক্সচেঞ্জ', desc: 'সাইজ এক্সচেঞ্জ ও রিটার্ন রিকোয়েস্ট ম্যানেজমেন্ট' },
    { id: 'categories', name: 'Categories', banglaName: 'ক্যাটাগরি', desc: 'প্রোডাক্ট ক্যাটাগরি ম্যানেজমেন্ট' },
    { id: 'products', name: 'Products', banglaName: 'প্রোডাক্টস', desc: 'প্রোডাক্ট অ্যাড, এডিট ও ক্যাটালগ' },
    { id: 'issues', name: 'Issues', banglaName: 'অর্ডার ইস্যু', desc: 'কাস্টমার কমপ্লেন, প্রবলেম রিপোর্ট ও সমাধান' },
    { id: 'master-table', name: 'Master Table', banglaName: 'মাস্টার টেবিল', desc: 'বাল্ক স্ক্যানিং, লেবেল প্রিন্ট ও দ্রুত প্রসেসিং' },
    { id: 'inventory-log', name: 'Inventory Log', banglaName: 'ইনভেন্টরি লগ', desc: 'স্টক ইন/আউট ও স্টক হিস্ট্রি' },
    { id: 'finance', name: 'Finance', banglaName: 'ফাইন্যান্স', desc: 'ব্যাংক ট্রানজেকশন, অ্যাকাউন্ট ও হিসাব' },
    { id: 'partnership', name: 'Partnership', banglaName: 'পার্টনারশিপ', desc: 'পার্টনারদের বিনিয়োগ ও হিসাব ট্র্যাকিং' },
    { id: 'dollar-expense', name: 'Dollar Expense', banglaName: 'ডলার এক্সপেন্স', desc: 'ডলার হিসাব ও খরচ ট্র্যাকিং' },
    { id: 'settings', name: 'Settings', banglaName: 'সেটিংস', desc: 'জেনারেল স্টোর সেটিংস' },
    { id: 'branding', name: 'Branding', banglaName: 'ব্র্যান্ডিং', desc: 'লোগো, নাম ও থিম সেটিংস' },
    { id: 'banners', name: 'Banners', banglaName: 'ব্যানার্স', desc: 'হিরো ব্যানার ও স্লাইডার ম্যানেজমেন্ট' },
    { id: 'notifications', name: 'Notifications', banglaName: 'নোটিফিকেশনস', desc: 'এসএমএস ও নোটিফিকেশন সেটিংস' },
    { id: 'pathao', name: 'Pathao Courier', banglaName: 'পাঠাও কুরিয়ার', desc: 'পাঠাও ডেলিভারি ও এপিআই সেটিংস' },
    { id: 'payments', name: 'Pay Method', banglaName: 'পেমেন্ট মেথড', desc: 'বিকাশ, নগদ, কার্ড ও ক্যাশ অন ডেলিভারি' },
    { id: 'admin-access', name: 'Admin Access', banglaName: 'অ্যাডমিন এক্সেস', desc: 'অ্যাডমিন রোল, পারমিশন ও নতুন এডমিন যোগ' },
  ];

  const departmentsList = [
    { id: 'CEO & Founder', name: 'CEO & Founder', desc: 'ফুল সিস্টেম এক্সেস ও সর্বোচ্চ নিয়ন্ত্রণ', defaultPerms: availableModules.map(m => m.id) },
    { id: 'Sales Executive Department', name: 'Sales Executive Department', desc: 'অর্ডার নেওয়া, ড্যাশবোর্ড দেখা ও কাস্টমার ম্যানেজমেন্ট', defaultPerms: ['dashboard', 'customer-profiler', 'orders', 'exchanges', 'products', 'issues'] },
    { id: 'Delivery / Logistics Department', name: 'Delivery / Logistics Department', desc: 'অর্ডার প্রসেসিং, লেবেল প্রিন্ট, এক্সচেঞ্জ ও পাথাও কুরিয়ার', defaultPerms: ['orders', 'exchanges', 'master-table', 'inventory-log', 'pathao'] },
    { id: 'Management / Admin Department', name: 'Management / Admin Department', desc: 'সম্পূর্ণ স্টোর অপারেশন, প্রোডাক্ট ইনভেন্টরি ও হিসাব-নিকাশ', defaultPerms: ['dashboard', 'customer-profiler', 'orders', 'exchanges', 'categories', 'products', 'issues', 'master-table', 'inventory-log', 'finance', 'dollar-expense', 'settings', 'pathao', 'payments'] },
    { id: 'Customer Support Department', name: 'Customer Support Department', desc: 'কাস্টমার কমপ্লেন, অর্ডার ইস্যু সমাধান ও সাইজ এক্সচেঞ্জ', defaultPerms: ['dashboard', 'orders', 'exchanges', 'issues', 'customer-profiler'] }
  ];
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);

  // General settings state
  const [storeIsLive, setStoreIsLive] = useState(true);
  const [showZobityCredit, setShowZobityCredit] = useState(true);
  const [storeName, setStoreName] = useState('Elegan BD');
  const [shortDescription, setShortDescription] = useState('Premium minimalist fashion for the modern individual.');
  const [phone, setPhone] = useState('01619835133');
  const [whatsappNumber, setWhatsappNumber] = useState('01619835133');
  const [email, setEmail] = useState('care@eleganbd.com');
  const [address, setAddress] = useState('Dhaka, Bangladesh');

  const [originalGeneral, setOriginalGeneral] = useState({
    storeIsLive: true,
    showZobityCredit: true,
    storeName: 'Elegan BD',
    shortDescription: 'Premium minimalist fashion for the modern individual.',
    phone: '01619835133',
    whatsappNumber: '01619835133',
    email: 'care@eleganbd.com',
    address: 'Dhaka, Bangladesh'
  });

  const loadGeneralSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'general'));
      if (snap.exists()) {
        const d = snap.data();
        const settings = {
          storeIsLive: d.storeIsLive !== undefined ? d.storeIsLive : true,
          showZobityCredit: d.showZobityCredit !== undefined ? d.showZobityCredit : true,
          storeName: d.storeName || 'Elegan BD',
          shortDescription: d.shortDescription || '',
          phone: d.phone || '01619835133',
          whatsappNumber: d.whatsappNumber || '01619835133',
          email: d.email || 'care@eleganbd.com',
          address: d.address || ''
        };
        setStoreIsLive(settings.storeIsLive);
        setShowZobityCredit(settings.showZobityCredit);
        setStoreName(settings.storeName);
        setShortDescription(settings.shortDescription);
        setPhone(settings.phone);
        setWhatsappNumber(settings.whatsappNumber);
        setEmail(settings.email);
        setAddress(settings.address);
        setOriginalGeneral(settings);
      }
    } catch (err) {
      console.error("Error loading general settings:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'General') {
      loadGeneralSettings();
    }
  }, [activeTab]);

  const handleSaveGeneralSection = async (sectionName: string, data: any) => {
    const loadingToast = toast.loading(`Saving ${sectionName}...`);
    try {
      await setDoc(doc(db, 'config', 'general'), data, { merge: true });
      setOriginalGeneral(prev => ({ ...prev, ...data }));
      toast.success(`Your changes have been saved.`, { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error(`Failed to save ${sectionName}.`, { id: loadingToast });
    }
  };

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
  const [codLogo, setCodLogo] = useState('');
  const [bkashEnabled, setBkashEnabled] = useState(true);
  const [bkashNumber, setBkashNumber] = useState('01619835133');
  const [bkashType, setBkashType] = useState<'Personal' | 'Merchant' | 'Agent'>('Personal');
  const [bkashLogo, setBkashLogo] = useState('');
  const [nagadEnabled, setNagadEnabled] = useState(true);
  const [nagadNumber, setNagadNumber] = useState('01619835133');
  const [nagadType, setNagadType] = useState<'Personal' | 'Merchant' | 'Agent'>('Personal');
  const [nagadLogo, setNagadLogo] = useState('');
  const [rocketEnabled, setRocketEnabled] = useState(true);
  const [rocketNumber, setRocketNumber] = useState('01619835133');
  const [rocketType, setRocketType] = useState<'Personal' | 'Merchant' | 'Agent'>('Personal');
  const [rocketLogo, setRocketLogo] = useState('');
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
          codLogo: data.codLogo || '',
          bkashEnabled: data.bkashEnabled !== undefined ? data.bkashEnabled : true,
          bkashNumber: data.bkashNumber || '01619835133',
          bkashType: data.bkashType || 'Personal',
          bkashLogo: data.bkashLogo || '',
          nagadEnabled: data.nagadEnabled !== undefined ? data.nagadEnabled : true,
          nagadNumber: data.nagadNumber || '01619835133',
          nagadType: data.nagadType || 'Personal',
          nagadLogo: data.nagadLogo || '',
          rocketEnabled: data.rocketEnabled !== undefined ? data.rocketEnabled : true,
          rocketNumber: data.rocketNumber || '01619835133',
          rocketType: data.rocketType || 'Personal',
          rocketLogo: data.rocketLogo || ''
        };
        setCodEnabled(p.codEnabled);
        setCodLogo(p.codLogo);
        setBkashEnabled(p.bkashEnabled);
        setBkashNumber(p.bkashNumber);
        setBkashType(p.bkashType);
        setBkashLogo(p.bkashLogo);
        setNagadEnabled(p.nagadEnabled);
        setNagadNumber(p.nagadNumber);
        setNagadType(p.nagadType);
        setNagadLogo(p.nagadLogo);
        setRocketEnabled(p.rocketEnabled);
        setRocketNumber(p.rocketNumber);
        setRocketType(p.rocketType);
        setRocketLogo(p.rocketLogo);
        setOriginalPayments(p);
      } else {
        const defaultPayments = {
          codEnabled: true,
          codLogo: '',
          bkashEnabled: true,
          bkashNumber: '01619835133',
          bkashType: 'Personal' as const,
          bkashLogo: '',
          nagadEnabled: true,
          nagadNumber: '01619835133',
          nagadType: 'Personal' as const,
          nagadLogo: '',
          rocketEnabled: true,
          rocketNumber: '01619835133',
          rocketType: 'Personal' as const,
          rocketLogo: ''
        };
        setCodEnabled(true);
        setCodLogo('');
        setBkashEnabled(true);
        setBkashNumber('01619835133');
        setBkashType('Personal');
        setBkashLogo('');
        setNagadEnabled(true);
        setNagadNumber('01619835133');
        setNagadType('Personal');
        setNagadLogo('');
        setRocketEnabled(true);
        setRocketNumber('01619835133');
        setRocketType('Personal');
        setRocketLogo('');
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
    codLogo !== originalPayments.codLogo ||
    bkashEnabled !== originalPayments.bkashEnabled ||
    bkashNumber !== originalPayments.bkashNumber ||
    bkashType !== originalPayments.bkashType ||
    bkashLogo !== originalPayments.bkashLogo ||
    nagadEnabled !== originalPayments.nagadEnabled ||
    nagadNumber !== originalPayments.nagadNumber ||
    nagadType !== originalPayments.nagadType ||
    nagadLogo !== originalPayments.nagadLogo ||
    rocketEnabled !== originalPayments.rocketEnabled ||
    rocketNumber !== originalPayments.rocketNumber ||
    rocketType !== originalPayments.rocketType ||
    rocketLogo !== originalPayments.rocketLogo
  ) : false;

  const handleSavePayments = async () => {
    if (!isSabbirRahman) {
      toast.error('Pay Method সেটিংস পরিবর্তন করার অনুমতি শুধুমাত্র সাব্বির রহমান এর একাউন্টে সংরক্ষিত!');
      return;
    }
    const loadingToast = toast.loading('Saving payments settings...');
    try {
      const payload = {
        codEnabled,
        codLogo,
        bkashEnabled,
        bkashNumber,
        bkashType,
        bkashLogo,
        nagadEnabled,
        nagadNumber,
        nagadType,
        nagadLogo,
        rocketEnabled,
        rocketNumber,
        rocketType,
        rocketLogo,
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

  const handleUploadBkashLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Compressing & uploading bKash logo...");
    try {
      const compressed = await compressImage(file, 400, 400, 0.85);
      setBkashLogo(compressed);
      autoSaveToMediaLibrary(compressed, { name: 'Payment Logo - bKash', category: 'Payment Methods', source: 'branding' });
      toast.success("bKash logo updated. Click 'Save changes' to save permanently.", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload logo.", { id: toastId });
    }
  };

  const handleUploadNagadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Compressing & uploading Nagad logo...");
    try {
      const compressed = await compressImage(file, 400, 400, 0.85);
      setNagadLogo(compressed);
      autoSaveToMediaLibrary(compressed, { name: 'Payment Logo - Nagad', category: 'Payment Methods', source: 'branding' });
      toast.success("Nagad logo updated. Click 'Save changes' to save permanently.", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload logo.", { id: toastId });
    }
  };

  const handleUploadCodLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Compressing & uploading Cash on Delivery picture...");
    try {
      const compressed = await compressImage(file, 400, 400, 0.85);
      setCodLogo(compressed);
      autoSaveToMediaLibrary(compressed, { name: 'Payment Logo - Cash on Delivery', category: 'Payment Methods', source: 'branding' });
      toast.success("Cash on Delivery picture updated. Click 'Save changes' to save permanently.", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload picture.", { id: toastId });
    }
  };

  const handleUploadRocketLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Compressing & uploading Rocket logo...");
    try {
      const compressed = await compressImage(file, 400, 400, 0.85);
      setRocketLogo(compressed);
      autoSaveToMediaLibrary(compressed, { name: 'Payment Logo - Rocket', category: 'Payment Methods', source: 'branding' });
      toast.success("Rocket logo updated. Click 'Save changes' to save permanently.", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload logo.", { id: toastId });
    }
  };

  const handleDiscardPayments = () => {
    if (originalPayments) {
      setCodEnabled(originalPayments.codEnabled);
      setCodLogo(originalPayments.codLogo || '');
      setBkashEnabled(originalPayments.bkashEnabled);
      setBkashNumber(originalPayments.bkashNumber);
      setBkashType(originalPayments.bkashType);
      setBkashLogo(originalPayments.bkashLogo || '');
      setNagadEnabled(originalPayments.nagadEnabled);
      setNagadNumber(originalPayments.nagadNumber);
      setNagadType(originalPayments.nagadType);
      setNagadLogo(originalPayments.nagadLogo || '');
      setRocketEnabled(originalPayments.rocketEnabled !== undefined ? originalPayments.rocketEnabled : true);
      setRocketNumber(originalPayments.rocketNumber || '01327772213');
      setRocketType(originalPayments.rocketType || 'Personal');
      setRocketLogo(originalPayments.rocketLogo || '');
      toast.success('Unsaved changes discarded.');
    }
  };

  // Pathao Courier API States
  const [courierSubTab, setCourierSubTab] = useState<'pathao' | 'steadfast'>('pathao');
  const [pathaoClientId, setPathaoClientId] = useState('nXe0A73axr');
  const [pathaoClientSecret, setPathaoClientSecret] = useState('0LyQiusPk4HguMTc3oZJaXIeKzjXWH7Yq0LsjPKc');
  const [pathaoUsername, setPathaoUsername] = useState('eleganbd.ltd@gmail.com');
  const [pathaoPassword, setPathaoPassword] = useState('Eleganbdltd22@@##');
  const [pathaoStoreId, setPathaoStoreId] = useState('376372');
  const [pathaoBaseUrl, setPathaoBaseUrl] = useState('https://api-hermes.pathao.com');
  const [pathaoEnabled, setPathaoEnabled] = useState(true);
  const [pathaoEnv, setPathaoEnv] = useState<'production' | 'sandbox'>('production');
  const [isPathaoLoading, setIsPathaoLoading] = useState(false);
  const [isSavingPathao, setIsSavingPathao] = useState(false);
  const [isTestingPathao, setIsTestingPathao] = useState(false);

  // Steadfast Courier API States
  const [steadfastApiKey, setSteadfastApiKey] = useState('');
  const [steadfastSecretKey, setSteadfastSecretKey] = useState('');
  const [steadfastEnabled, setSteadfastEnabled] = useState(false);
  const [isSteadfastLoading, setIsSteadfastLoading] = useState(false);
  const [isSavingSteadfast, setIsSavingSteadfast] = useState(false);
  const [isTestingSteadfast, setIsTestingSteadfast] = useState(false);

  const loadPathaoConfig = async () => {
    setIsPathaoLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'config', 'pathao'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPathaoClientId(data.clientId || 'nXe0A73axr');
        setPathaoClientSecret(data.clientSecret || '0LyQiusPk4HguMTc3oZJaXIeKzjXWH7Yq0LsjPKc');
        setPathaoUsername(data.username || 'eleganbd.ltd@gmail.com');
        setPathaoPassword(data.password || 'Eleganbdltd22@@##');
        setPathaoStoreId(data.storeId || '376372');
        const url = (data.baseUrl || 'https://api-hermes.pathao.com').replace(/\/$/, '');
        setPathaoBaseUrl(url.includes('courier-api.pathao.com') ? 'https://api-hermes.pathao.com' : url);
        setPathaoEnabled(data.enabled !== undefined ? data.enabled : true);
        setPathaoEnv(data.environment || 'production');
      }
    } catch (err) {
      console.error("Error loading Pathao config:", err);
    } finally {
      setIsPathaoLoading(false);
    }
  };

  const loadSteadfastConfig = async () => {
    setIsSteadfastLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'config', 'steadfast'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSteadfastApiKey(data.apiKey || '');
        setSteadfastSecretKey(data.secretKey || '');
        setSteadfastEnabled(data.enabled !== undefined ? data.enabled : false);
      }
    } catch (err) {
      console.error("Error loading Steadfast config:", err);
    } finally {
      setIsSteadfastLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Courier' || activeTab === 'Pathao') {
      loadPathaoConfig();
      loadSteadfastConfig();
    }
  }, [activeTab]);

  const handleSavePathaoConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingPathao(true);
    const loadingToast = toast.loading('Saving Pathao Courier API credentials...');
    try {
      const payload = {
        clientId: pathaoClientId.trim(),
        clientSecret: pathaoClientSecret.trim(),
        username: pathaoUsername.trim(),
        password: pathaoPassword.trim(),
        storeId: pathaoStoreId.trim(),
        baseUrl: pathaoBaseUrl.trim(),
        environment: pathaoEnv,
        enabled: pathaoEnabled,
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'config', 'pathao'), payload, { merge: true });
      await setDoc(doc(db, 'config', 'courier'), payload, { merge: true });
      toast.success('Pathao Courier credentials saved & activated successfully!', { id: loadingToast });
    } catch (err: any) {
      console.error("Error saving Pathao config:", err);
      toast.error('Failed to save Pathao credentials.', { id: loadingToast });
    } finally {
      setIsSavingPathao(false);
    }
  };

  const handleSaveSteadfastConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSteadfast(true);
    const loadingToast = toast.loading('Saving Steadfast Courier API credentials...');
    try {
      const payload = {
        apiKey: steadfastApiKey.trim(),
        secretKey: steadfastSecretKey.trim(),
        enabled: steadfastEnabled,
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'config', 'steadfast'), payload, { merge: true });
      toast.success('Steadfast Courier credentials saved & activated successfully!', { id: loadingToast });
    } catch (err: any) {
      console.error("Error saving Steadfast config:", err);
      toast.error('Failed to save Steadfast credentials.', { id: loadingToast });
    } finally {
      setIsSavingSteadfast(false);
    }
  };

  const handleTestSteadfastConnection = async () => {
    if (!steadfastApiKey || !steadfastSecretKey) {
      toast.error('Please fill in both API Key and Secret Key first.');
      return;
    }
    setIsTestingSteadfast(true);
    const loadingToast = toast.loading('Connecting to Steadfast API...');
    try {
      const res = await fetch('/api/steadfast/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: steadfastApiKey.trim(),
          secretKey: steadfastSecretKey.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Connection established! Account balance: ৳ ${data.balance}`, { id: loadingToast, duration: 5000 });
      } else {
        toast.error(data.error || 'Connection failed. Please check credentials.', { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to communicate with proxy server.', { id: loadingToast });
    } finally {
      setIsTestingSteadfast(false);
    }
  };

  const handleTestPathaoConnection = async () => {
    if (!pathaoClientId || !pathaoClientSecret || !pathaoUsername || !pathaoPassword) {
      toast.error('Please fill in Client ID, Client Secret, Username, and Password first.');
      return;
    }
    setIsTestingPathao(true);
    const loadingToast = toast.loading('Connecting to Pathao OAuth API...');
    try {
      const res = await fetch('/api/pathao/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: pathaoClientId.trim(),
          clientSecret: pathaoClientSecret.trim(),
          username: pathaoUsername.trim(),
          password: pathaoPassword.trim(),
          baseUrl: pathaoBaseUrl.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Pathao Merchant API Connected Successfully! Token Received.`, { id: loadingToast });
      } else {
        toast.error(`Pathao Connection Failed: ${data.error || 'Check credentials'}`, { id: loadingToast, duration: 6000 });
      }
    } catch (err: any) {
      toast.error(`Network Error connecting to Pathao API: ${err.message}`, { id: loadingToast });
    } finally {
      setIsTestingPathao(false);
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
    try {
      await deleteDoc(doc(db, 'coupons', id));
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success(`Coupon "${code}" deleted successfully.`);
    } catch (err) {
      console.error("Error deleting coupon:", err);
      toast.error("Failed to delete coupon.");
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

  // SMS Gateway & Alert States
  const [smsGateway, setSmsGateway] = useState<'none' | 'greenweb' | 'bulksmsbd' | 'mimsms'>('none');
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsSenderId, setSmsSenderId] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminAlertsEnabled, setAdminAlertsEnabled] = useState(false);
  const [isSavingSmsGateway, setIsSavingSmsGateway] = useState(false);

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

        setSmsGateway(data.gateway || 'none');
        setSmsApiKey(data.apiKey || '');
        setSmsSenderId(data.senderId || '');
        setAdminPhone(data.adminPhone || '');
        setAdminAlertsEnabled(data.adminAlertsEnabled || false);
      } else {
        const initialData = {
          otpEnabled: true,
          confirmationEnabled: true,
          loginOtpEnabled: true,
          balance: 5000,
          gateway: 'none',
          apiKey: '',
          senderId: '',
          adminPhone: '',
          adminAlertsEnabled: false,
          updatedAt: Date.now()
        };
        await setDoc(doc(db, 'config', 'sms_otp'), initialData);
        setSmsOtpEnabled(true);
        setSmsConfirmationEnabled(true);
        setSmsLoginOtpEnabled(true);
        setSmsBalance(5000);
        setSmsGateway('none');
        setSmsApiKey('');
        setSmsSenderId('');
        setAdminPhone('');
        setAdminAlertsEnabled(false);
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
            phone: '8801327772213',
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

  const handleSaveSmsGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmsGateway(true);
    try {
      await setDoc(doc(db, 'config', 'sms_otp'), {
        gateway: smsGateway,
        apiKey: smsApiKey.trim(),
        senderId: smsSenderId.trim(),
        adminPhone: adminPhone.trim(),
        adminAlertsEnabled: adminAlertsEnabled,
        updatedAt: Date.now()
      }, { merge: true });
      toast.success("SMS configuration saved successfully!");
    } catch (err) {
      console.error("Error saving SMS config:", err);
      toast.error("Failed to save SMS configuration.");
    } finally {
      setIsSavingSmsGateway(false);
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

  const unsubAdminsRef = React.useRef<(() => void) | null>(null);

  const loadAdminConfigAndList = async () => {
    setLoadingAdmins(true);
    if (unsubAdminsRef.current) {
      unsubAdminsRef.current();
    }
    try {
      // 1. Get Code
      const settingsDoc = await getDoc(doc(db, 'config', 'admin_settings'));
      if (settingsDoc.exists()) {
        setAdminCode(settingsDoc.data().signupCode || '');
      } else {
        setAdminCode('ELEGAN-VIP-2026');
      }

      const permsMap = new Map<string, any>();
      const permsSnapshot = await getDocs(collection(db, 'admin_permissions'));
      permsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const emailKey = (data.email || docSnap.id).toLowerCase().trim();
        permsMap.set(emailKey, {
          id: docSnap.id,
          email: data.email || docSnap.id,
          role: data.role || 'admin',
          department: data.department || (emailKey === 'eleganbd.ltd@gmail.com' ? 'CEO & Founder' : 'Sales Executive Department'),
          permissions: (data.permissions && data.permissions.length > 0) 
            ? data.permissions 
            : ['dashboard', 'orders', 'issues'],
          updatedAt: data.updatedAt || Date.now(),
          isDirectAccess: true
        });
      });

      const invitesMap = new Map<string, any>();
      const invitesSnapshot = await getDocs(collection(db, 'admin_invites'));
      invitesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const emailKey = (data.email || docSnap.id).toLowerCase().trim();
        invitesMap.set(emailKey, {
          id: docSnap.id,
          email: data.email || docSnap.id,
          role: data.role || 'admin',
          department: data.department || 'Sales Executive Department',
          permissions: (data.permissions && data.permissions.length > 0) 
            ? data.permissions 
            : ['dashboard', 'orders', 'issues'],
          updatedAt: data.updatedAt || Date.now(),
          isDirectAccess: true
        });
      });

      unsubAdminsRef.current = onSnapshot(collection(db, 'admins'), (snapshot) => {
        const adminMap = new Map<string, any>();

        permsMap.forEach((val, key) => adminMap.set(key, { ...val }));
        invitesMap.forEach((val, key) => {
          if (!adminMap.has(key)) {
            adminMap.set(key, { ...val });
          }
        });

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const emailKey = (data.email || docSnap.id).toLowerCase().trim();
          const existing = adminMap.get(emailKey) || {};
          adminMap.set(emailKey, {
            ...existing,
            id: docSnap.id,
            email: data.email || docSnap.id,
            role: data.role || existing.role || 'admin',
            department: data.department || existing.department || (emailKey === 'eleganbd.ltd@gmail.com' ? 'CEO & Founder' : 'Sales Executive Department'),
            permissions: (data.permissions && data.permissions.length > 0) 
              ? data.permissions 
              : (existing.permissions || ['dashboard', 'orders', 'issues']),
            updatedAt: data.updatedAt || existing.updatedAt || Date.now(),
            lastActive: data.lastActive || 0,
            isOnline: data.isOnline || false
          });
        });

        const sortedList = Array.from(adminMap.values()).sort((a, b) => {
          const aEmail = (a.email || '').toLowerCase().trim();
          const bEmail = (b.email || '').toLowerCase().trim();
          const aIsSabbir = aEmail === 'sabbirrahmansr904@gmail.com' || (a.name || '').toLowerCase().includes('sabbir rahman');
          const bIsSabbir = bEmail === 'sabbirrahmansr904@gmail.com' || (b.name || '').toLowerCase().includes('sabbir rahman');
          if (aIsSabbir && !bIsSabbir) return -1;
          if (!aIsSabbir && bIsSabbir) return 1;

          const aOnline = a.isOnline && (Date.now() - (a.lastActive || 0) < 90000);
          const bOnline = b.isOnline && (Date.now() - (b.lastActive || 0) < 90000);
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          return (b.lastActive || 0) - (a.lastActive || 0);
        });

        setAdminList(sortedList);
        setLoadingAdmins(false);
      }, (error) => {
        console.error("Admins snapshot error:", error);
        setLoadingAdmins(false);
      });
    } catch (err) {
      console.error("Error loading admin system stats:", err);
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Admin Access' && isSabbirRahman) {
      loadAdminConfigAndList();
    }
    return () => {
      if (unsubAdminsRef.current) {
        unsubAdminsRef.current();
      }
    };
  }, [activeTab, isSabbirRahman]);

  const handleOpenAddModal = () => {
    setIsEditingAccess(false);
    setEditingTargetEmail('');
    setDirectAccessEmail('');
    setSelectedDepartment('Sales Executive Department');
    setSelectedPermissions(['dashboard', 'orders', 'customers', 'exchanges']);
    setShowDirectAccessModal(true);
  };

  const handleOpenEditModal = (admin: any) => {
    setIsEditingAccess(true);
    setEditingTargetEmail(admin.email || admin.id);
    setDirectAccessEmail(admin.email || admin.id);
    const emailKey = (admin.email || admin.id).toLowerCase().trim();
    const defaultDept = emailKey === 'eleganbd.ltd@gmail.com' ? 'CEO & Founder' : 'Sales Executive Department';
    setSelectedDepartment(admin.department || defaultDept);
    setSelectedPermissions(admin.permissions || ['dashboard', 'orders', 'issues']);
    setShowDirectAccessModal(true);
  };

  const handleDepartmentChange = (deptId: string) => {
    setSelectedDepartment(deptId);
    const deptObj = departmentsList.find(d => d.id === deptId);
    if (deptObj && deptObj.defaultPerms) {
      setSelectedPermissions(deptObj.defaultPerms);
    }
  };

  const handleSaveDirectAccess = async () => {
    const cleanEmail = directAccessEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error("অনুগ্রহ করে একটি সঠিক জিমেইল বা ইমেইল আইডি দিন। (Enter a valid Gmail address)");
      return;
    }
    if (selectedPermissions.length === 0) {
      toast.error("কমপক্ষে একটি মডিউলের এক্সেস সিলেক্ট করুন। (Select at least one module permission)");
      return;
    }

    setIsSavingDirectAccess(true);
    try {
      const permData = {
        email: cleanEmail,
        permissions: selectedPermissions,
        department: selectedDepartment,
        role: 'admin',
        updatedAt: Date.now(),
        createdBy: currentUser?.email || 'super_admin'
      };

      await setDoc(doc(db, 'admin_permissions', cleanEmail), permData);
      await setDoc(doc(db, 'admin_invites', cleanEmail), permData);

      // Also update existing doc in admins collection if present
      const existingAdmin = adminList.find(a => a.email?.toLowerCase() === cleanEmail);
      if (existingAdmin && existingAdmin.id && !existingAdmin.id.includes('@')) {
        await setDoc(doc(db, 'admins', existingAdmin.id), {
          permissions: selectedPermissions,
          department: selectedDepartment,
          updatedAt: Date.now()
        }, { merge: true });
      }

      toast.success(`'${cleanEmail}' (${selectedDepartment}) এর জন্য এডমিন এক্সেস সেভ করা হয়েছে!`);
      setShowDirectAccessModal(false);
      setDirectAccessEmail('');
      setSelectedPermissions(['dashboard', 'orders', 'issues']);
      await loadAdminConfigAndList();
    } catch (err: any) {
      console.error("Error saving direct access:", err);
      toast.error(`এক্সেস সেভ করতে ব্যর্থ: ${err?.message || 'Error'}`);
    } finally {
      setIsSavingDirectAccess(false);
    }
  };

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
    const targetEmail = (email || adminId).toLowerCase().trim();
    if (targetEmail === 'eleganbd.ltd@gmail.com' || targetEmail === 'sabbirrahmansr904@gmail.com') {
      toast.error('Primary Super Admin / CEO accounts cannot be removed!');
      return;
    }
    try {
      if (adminId && !adminId.includes('@')) {
        await deleteDoc(doc(db, 'admins', adminId)).catch(() => {});
      }
      await deleteDoc(doc(db, 'admin_permissions', targetEmail)).catch(() => {});
      await deleteDoc(doc(db, 'admin_invites', targetEmail)).catch(() => {});
      await deleteDoc(doc(db, 'admin_profiles', targetEmail.replace(/[^a-zA-Z0-9]/g, '_'))).catch(() => {});

      toast.success(`'${targetEmail}' এর এডমিন পারমিশন বাতিল করা হয়েছে।`);
      setAdminList(prev => prev.filter(admin => admin.email?.toLowerCase() !== targetEmail && admin.id !== adminId));
    } catch (err) {
      toast.error("Failed to revoke admin credentials.");
    }
  };

  const handleDeleteBanner = (setter: (url: string) => void, name: string) => {
    setDeleteConfirm({ setter, name });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading('Uploading logo with transparency support...');
      try {
        const result = await compressImage(file, 1024, 1024, 0.9, true);
        setTempLogo(result);
        setLogoUrl(result);
        autoSaveToMediaLibrary(result, { name: 'Brand Logo', category: 'Branding & Logos', source: 'branding' });
        toast.success('Logo updated permanently with transparent background and saved to Media Library!', { id: loadingToast });
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
        autoSaveToMediaLibrary(result, { name: 'Size Guide Chart', category: 'General Asset', source: 'branding' });
        toast.success('Size chart preview updated. Apply changes to save.');
      } catch (err) {
        toast.error('Failed to compress size chart.');
      }
    }
  };

  const handleHeroBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading('Uploading Google search preview image...');
      try {
        const result = await compressImage(file, 1200, 630, 0.85);
        setTempHeroBanner(result);
        setHeroBannerUrl(result);
        autoSaveToMediaLibrary(result, { name: 'Google Search Share Preview', category: 'Banners & Sliders', source: 'banner' });
        toast.success('Google search preview image updated successfully and saved to Media!', { id: loadingToast });
      } catch (err) {
        toast.error('Failed to upload image.', { id: loadingToast });
      }
    }
  };

  const handleApplyBranding = () => {
    setLogoUrl(tempLogo);
    setSizeChartUrl(tempSizeChart);
    setHeroBannerUrl(tempHeroBanner);
    toast.success('Brand identity, Google search preview, and size guide updated successfully.');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    
    if (tabParam === 'Admin Access' && !isSabbirRahman) {
      setActiveTab('General');
    } else if (tabParam) {
      setActiveTab(tabParam);
    } else if (location.pathname.includes('banners')) {
      setActiveTab('Banners');
    } else {
      setActiveTab('General');
    }
  }, [location.pathname, location.search, isSabbirRahman]);

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
        <div className="w-full bg-[#F8F9FD] border border-gray-100 shadow-sm rounded-3xl p-8 md:p-14 relative overflow-hidden min-h-[70vh]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 blur-[100px] -mr-32 -mt-32 rounded-full" />
          
          {activeTab === 'General' && (
            <div className="space-y-8 max-w-4xl relative z-10 font-sans text-left">
              {/* Top Header matching screenshot */}
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Store is live
                  </div>
                  <a 
                    href="/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-4 py-2 bg-[#F8F9FD] hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center gap-1.5"
                  >
                    <Globe size={14} />
                    <span>View website</span>
                  </a>
                </div>
              </div>

              {/* Card 1: Visibility & branding */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl shadow-3xs overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900">Visibility & branding</h4>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900">Store is live</p>
                      <p className="text-xs text-gray-500 mt-0.5">Your store is accessible to customers.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={storeIsLive} 
                        onChange={(e) => setStoreIsLive(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>


                </div>
                <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => {
                      setStoreIsLive(originalGeneral.storeIsLive);
                      setShowZobityCredit(originalGeneral.showZobityCredit);
                      toast.success("Discarded changes for Visibility & branding.");
                    }}
                    className="px-4 py-2 bg-[#F8F9FD] border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-3xs"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={() => handleSaveGeneralSection('Visibility & branding', { storeIsLive, showZobityCredit })}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Save changes</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Store basics */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl shadow-3xs overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900">Store basics</h4>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-gray-900">Store name *</label>
                      <span className="text-[10px] text-gray-400 font-mono">{storeName.length}/50</span>
                    </div>
                    <input 
                      type="text" 
                      value={storeName} 
                      onChange={(e) => setStoreName(e.target.value)}
                      maxLength={50}
                      className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm text-gray-900 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-gray-900">Short description</label>
                      <span className="text-[10px] text-gray-400 font-mono">{shortDescription.length}/500</span>
                    </div>
                    <textarea 
                      value={shortDescription} 
                      onChange={(e) => setShortDescription(e.target.value)}
                      maxLength={500}
                      rows={3} 
                      className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm text-gray-900 transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => {
                      setStoreName(originalGeneral.storeName);
                      setShortDescription(originalGeneral.shortDescription);
                      toast.success("Discarded changes for Store basics.");
                    }}
                    className="px-4 py-2 bg-[#F8F9FD] border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-3xs"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={() => handleSaveGeneralSection('Store basics', { storeName, shortDescription })}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Save changes</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Phone & WhatsApp */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl shadow-3xs overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900">Phone & WhatsApp</h4>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-900">Phone</label>
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-blue-500 transition-all">
                      <span className="bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-500 border-r border-gray-200 flex items-center gap-1">
                        🇧🇩 +880
                      </span>
                      <input 
                        type="text" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="1619835133" 
                        className="w-full bg-[#F8F9FD] px-4 py-2.5 outline-none text-sm text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-900">WhatsApp number</label>
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-blue-500 transition-all">
                      <span className="bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-500 border-r border-gray-200 flex items-center gap-1">
                        🇧🇩 +880
                      </span>
                      <input 
                        type="text" 
                        value={whatsappNumber} 
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="1619835133" 
                        className="w-full bg-[#F8F9FD] px-4 py-2.5 outline-none text-sm text-gray-900"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => {
                      setPhone(originalGeneral.phone);
                      setWhatsappNumber(originalGeneral.whatsappNumber);
                      toast.success("Discarded changes for Phone & WhatsApp.");
                    }}
                    className="px-4 py-2 bg-[#F8F9FD] border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-3xs"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={() => handleSaveGeneralSection('Phone & WhatsApp', { phone, whatsappNumber })}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Save changes</span>
                  </button>
                </div>
              </div>

              {/* Card 4: Email & address */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl shadow-3xs overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900">Email & address</h4>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-900">Email</label>
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-blue-500 transition-all">
                      <span className="bg-gray-50 px-3.5 py-2.5 text-gray-400 border-r border-gray-200 flex items-center">
                        <Store size={14} />
                      </span>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="care@eleganbd.com" 
                        className="w-full bg-[#F8F9FD] px-4 py-2.5 outline-none text-sm text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-900">Address</label>
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-blue-500 transition-all">
                      <span className="bg-gray-50 px-3.5 py-2.5 text-gray-400 border-r border-gray-200 flex items-center self-start">
                        <Globe size={14} />
                      </span>
                      <textarea 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        placeholder="Store physical address..." 
                        className="w-full bg-[#F8F9FD] px-4 py-2.5 outline-none text-sm text-gray-900 resize-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => {
                      setEmail(originalGeneral.email);
                      setAddress(originalGeneral.address);
                      toast.success("Discarded changes for Email & address.");
                    }}
                    className="px-4 py-2 bg-[#F8F9FD] border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-3xs"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={() => handleSaveGeneralSection('Email & address', { email, address })}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Save changes</span>
                  </button>
                </div>
              </div>

              {/* Card 5: Devices */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl shadow-3xs overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900">Devices</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Browsers and phones signed into your account. Remove any device you don't recognize.</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#F8F9FD] border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 shadow-2xs">
                        <Lock size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-900">Chrome on Windows</p>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase tracking-wider">CURRENT</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">Windows · Last active just now</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toast.success("Current session active & verified.")}
                        className="p-2 bg-[#F8F9FD] border border-gray-200 hover:bg-gray-100 rounded-lg text-gray-600 transition-all cursor-pointer shadow-3xs"
                        title="Edit Session"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button 
                        onClick={() => toast.success("Cannot remove current active admin session.")}
                        className="p-2 bg-[#F8F9FD] border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 rounded-lg text-gray-400 transition-all cursor-pointer shadow-3xs"
                        title="Sign Out Device"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Branding' && (
            <div className="space-y-12 max-w-3xl relative z-10 font-sans text-left">
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <div>
                    <h3 className="serif text-2xl text-black italic tracking-tighter uppercase font-black">Brandmark, Favicon & Store Logo</h3>
                    <p className="text-xs text-gray-500 mt-1">আপনার ডিভাইস (কম্পিউটার/মোবাইল) থেকে সরাসরি PNG/JPG লোগো আপলোড করুন। এটি অটোমেটিক <strong>ব্রাউজার ট্যাব আইকন (Favicon)</strong>, স্টোর হেডার, ফুটার, ইনভয়েস এবং অ্যাডমিন প্যানেলে সেট হয়ে যাবে।</p>
                  </div>
                  <ImageIcon size={22} className="text-brand-gold" />
                </div>

                {/* Browser Tab Live Preview Mockup matching User's view */}
                <div className="p-5 bg-white border border-gray-200/80 rounded-2xl shadow-3xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Live Browser Tab (Favicon) Preview</span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Realtime Dynamic Favicon</span>
                  </div>
                  {/* Chrome tab visual mockup */}
                  <div className="bg-[#e9eef6] dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200/60">
                    <div className="inline-flex items-center gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-t-lg shadow-xs border-t border-x border-gray-200/80 max-w-sm">
                      <div className="w-4 h-4 rounded-xs overflow-hidden flex items-center justify-center bg-transparent shrink-0">
                        <img 
                          src={tempLogo || '/logo.png'} 
                          alt="Tab Favicon" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                        Elegan BD | Premium Clothing Brand...
                      </span>
                      <span className="text-gray-400 text-xs hover:text-gray-700 cursor-pointer ml-1 font-bold">×</span>
                    </div>
                  </div>
                </div>

                <div className="p-8 border-2 border-dashed border-gray-200 rounded-3xl bg-[#F8F9FD] shadow-xs flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-56 h-36 bg-transparent flex items-center justify-center border border-gray-200 rounded-2xl overflow-hidden relative group/inner shadow-inner p-4">
                    <img 
                      src={tempLogo || '/logo.png'} 
                      alt="Logo Preview" 
                      className="max-h-24 max-w-full w-auto object-contain transition-transform group-hover/inner:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement.prototype as any).src = '/logo.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/inner:opacity-100 transition-all flex items-center justify-center backdrop-blur-xs">
                       <label className="text-white text-xs uppercase tracking-wider font-extrabold cursor-pointer flex flex-col items-center gap-2">
                          <Upload size={22} />
                          <span>Upload From Device</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                       </label>
                    </div>
                  </div>

                  <div className="w-full max-w-md space-y-3">
                    <label className="text-[11px] uppercase font-black tracking-wider text-gray-500 block">Or paste Direct Image URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={tempLogo}
                        onChange={(e) => {
                          setTempLogo(e.target.value);
                          setLogoUrl(e.target.value);
                        }}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 bg-gray-50 focus:border-black outline-none font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setTempLogo('/logo.png');
                          setLogoUrl('/logo.png');
                          toast.success('Reset to default logo.');
                        }}
                        className="px-4 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                    <label className="px-6 py-3 bg-black hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2">
                      <Upload size={16} />
                      <span>Upload from Device (ডিভাইস থেকে লোগো আপলোড)</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoUrl(tempLogo);
                        toast.success('Logo saved and applied successfully across the store!');
                      }}
                      className="px-6 py-3 bg-[#1b49c4] hover:bg-[#153899] text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2"
                    >
                      <Save size={16} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <h4 className="serif text-xl text-black italic tracking-tighter uppercase font-black">Live Preview on Store Navbar & Footer</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Navbar Dark Context */}
                  <div className="p-6 bg-black rounded-2xl flex flex-col space-y-4 shadow-md">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Dark Navbar Context</span>
                    <div className="flex items-center justify-between py-2 px-4 bg-black/90 border border-white/10 rounded-xl">
                      <div className="flex items-center gap-2">
                        <img 
                          src={tempLogo || '/logo.png'} 
                          className="h-7 w-auto object-contain" 
                          alt="Dark Navbar Logo"
                        />
                        <span className="text-white font-serif font-bold text-sm tracking-widest">ELEGAN BD</span>
                      </div>
                      <div className="flex items-center gap-3 text-white/70 text-xs">
                        <span>Home</span>
                        <span>Shop</span>
                      </div>
                    </div>
                  </div>

                  {/* Light Context */}
                  <div className="p-6 bg-[#F8F9FD] border border-gray-200 rounded-2xl flex flex-col space-y-4 shadow-sm">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Light Context Matrix</span>
                    <div className="flex items-center justify-between py-2 px-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <img 
                          src={tempLogo || '/logo.png'} 
                          className="h-7 w-auto object-contain" 
                          alt="Light Navbar Logo"
                        />
                        <span className="text-black font-serif font-bold text-sm tracking-widest">ELEGAN BD</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-700 text-xs">
                        <span>Home</span>
                        <span>Shop</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Search & Social Share Preview Image */}
              <div className="space-y-8 pt-8 border-t border-gray-100">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <div>
                    <h3 className="serif text-2xl text-black italic tracking-tighter uppercase font-black">Google Search & Social Share Image (OG Image)</h3>
                    <p className="text-xs text-gray-500 mt-1">Upload a high-resolution image (recommended 1200x630px) that appears in Google Search results, Facebook, WhatsApp, and social link shares next to your store name.</p>
                  </div>
                  <ImageIcon size={22} className="text-brand-gold" />
                </div>

                <div className="p-8 border-2 border-dashed border-gray-200 rounded-3xl bg-[#F8F9FD] shadow-xs flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-full max-w-lg bg-gray-50 flex items-center justify-center border border-gray-200 rounded-2xl overflow-hidden relative group/inner shadow-inner p-4">
                    <img 
                      src={tempHeroBanner || heroBannerUrl || logoUrl || '/logo.png'} 
                      alt="Google Search Preview" 
                      className="max-h-48 max-w-full w-auto object-contain transition-transform group-hover/inner:scale-105 rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/inner:opacity-100 transition-all flex items-center justify-center backdrop-blur-xs">
                       <label className="text-white text-xs uppercase tracking-wider font-extrabold cursor-pointer flex flex-col items-center gap-2">
                          <Upload size={22} />
                          <span>Upload Google Search Image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleHeroBannerUpload} />
                       </label>
                    </div>
                  </div>

                  {/* Google Search Snippet Simulation */}
                  <div className="w-full max-w-lg text-left bg-[#F8F9FD] border border-gray-200 rounded-2xl p-4 shadow-xs space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Google Search Snippet Preview</span>
                    <div className="flex gap-3 items-start pt-1">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        <img src={tempLogo || logoUrl || '/logo.png'} className="w-full h-full object-contain" alt="Favicon" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">Elegan BD · Premium Clothing</p>
                        <p className="text-sm font-semibold text-blue-800 hover:underline cursor-pointer truncate">Elegan BD | Premium Clothing Brand in Bangladesh</p>
                        <p className="text-[11px] text-gray-600 line-clamp-1">Discover minimalist luxury shirts, polos, and trousers. Premium fashion tailored for the modern individual.</p>
                      </div>
                    </div>
                    {/* Share Card preview */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Social Share Card Preview (Facebook / WhatsApp / Twitter)</p>
                      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        <img 
                          src={tempHeroBanner || heroBannerUrl || logoUrl || '/logo.png'} 
                          alt="Share preview" 
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-2.5 bg-[#F8F9FD] text-left">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">eleganbd.vercel.app</p>
                          <p className="text-xs font-bold text-black truncate">Elegan BD - Premium Clothing Brand</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-md space-y-3">
                    <label className="text-[11px] uppercase font-black tracking-wider text-gray-500 block">Or paste Direct Image URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        placeholder="https://example.com/search-preview.png"
                        value={tempHeroBanner}
                        onChange={(e) => {
                          setTempHeroBanner(e.target.value);
                          setHeroBannerUrl(e.target.value);
                        }}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 bg-gray-50 focus:border-black outline-none font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setTempHeroBanner('');
                          setHeroBannerUrl('');
                          toast.success('Reset Google Search preview image.');
                        }}
                        className="px-4 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <label className="px-6 py-3 bg-black hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2">
                      <Upload size={16} />
                      <span>Browse Image File</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleHeroBannerUpload} />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setHeroBannerUrl(tempHeroBanner);
                        toast.success('Google Search & Social Share preview image saved successfully!');
                      }}
                      className="px-6 py-3 bg-[#1b49c4] hover:bg-[#153899] text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2"
                    >
                      <Save size={16} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-8 border-t border-gray-100">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Measurement Taxonomy</h3>
                </div>
                <div className="p-12 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50 flex flex-col items-center justify-center text-center space-y-8 group hover:border-black/30 transition-all">
                  <div className="w-full max-w-lg bg-[#F8F9FD] flex items-center justify-center border border-gray-100 rounded-2xl overflow-hidden relative group/inner aspect-video shadow-sm">
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
                      showShowcase ? "bg-blue-600 border-blue-600 shadow-lg" : "bg-gray-200 border-gray-300"
                    )}
                  >
                    <motion.div 
                      layout
                      className={cn(
                        "w-5 h-5 rounded-full transition-all shadow-sm",
                        showShowcase ? "bg-[#F8F9FD]" : "bg-gray-400"
                      )} 
                    />
                  </button>
                </div>
              </div>

              <div className="pt-8">
                 <button 
                  onClick={handleApplyBranding}
                  className="bg-blue-600 text-white px-12 py-5 text-xs font-black uppercase tracking-[0.3em] hover:bg-blue-700 transition-all rounded-2xl shadow-xl transform-gpu active:scale-95 flex items-center gap-3"
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


          
          {activeTab === 'Admin Access' && isSabbirRahman && (
            <div className="space-y-10 max-w-4xl relative z-10 font-sans">
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                  <div>
                    <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Direct Admin Access Management</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      টিম মেম্বারদের জিমেইল (Gmail) দিয়ে সরাসরি নির্দিষ্ট মডিউল ও পেইজের পারমিশন (যেমনঃ অর্ডার ইস্যু, ড্যাশবোর্ড) সেভ করুন।
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddModal}
                    className="bg-blue-600 text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
                  >
                    <Plus size={16} />
                    <span>নতুন এডমিন পারমিশন দিন</span>
                  </button>
                </div>

                {/* Direct Access Modal */}
                {showDirectAccessModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-[#F8F9FD] rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl space-y-6 my-8 border border-gray-100"
                    >
                      <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                        <div>
                          <h3 className="text-lg font-black text-gray-900">
                            {isEditingAccess ? 'এডমিন পারমিশন আপডেট করুন (Edit Access)' : 'নতুন এডমিন এক্সেস যোগ করুন (Add Direct Access)'}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            ইমেইল লিখুন এবং যে যে সেকশনের পারমিশন দিতে চান সেগুলো টিক চিহ্ন দিন।
                          </p>
                        </div>
                        <button 
                          onClick={() => setShowDirectAccessModal(false)}
                          className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                            Gmail / Email Address (এডমিন ইউজার ইমেইল)
                          </label>
                          <input
                            type="email"
                            placeholder="e.g. staff.orders@gmail.com"
                            value={directAccessEmail}
                            disabled={isEditingAccess}
                            onChange={(e) => setDirectAccessEmail(e.target.value)}
                            className="w-full p-4 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </div>

                        {/* Department Selection */}
                        <div>
                          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                            Select Department (ডিপার্টমেন্ট নির্বাচন করুন):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {departmentsList.map((dept) => {
                              const isSelected = selectedDepartment === dept.id;
                              return (
                                <button
                                  key={dept.id}
                                  type="button"
                                  onClick={() => handleDepartmentChange(dept.id)}
                                  className={`p-3 text-left rounded-2xl border transition-all flex flex-col justify-between ${
                                    isSelected 
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                      : 'bg-gray-50 text-gray-800 border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-xs font-black">{dept.name}</span>
                                    {isSelected && <span className="text-[10px] bg-[#F8F9FD]/20 px-2 py-0.5 rounded-full font-bold">Selected</span>}
                                  </div>
                                  <p className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {dept.desc}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Module Permissions Checklist */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                              Select Module Permissions (যে সেকশনগুলোর এক্সেস দিতে চান):
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedPermissions(availableModules.map(m => m.id))}
                                className="text-[10px] font-bold text-indigo-600 hover:underline"
                              >
                                Select All
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => setSelectedPermissions([])}
                                className="text-[10px] font-bold text-gray-500 hover:underline"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                            {availableModules.map(mod => {
                              const isChecked = selectedPermissions.includes(mod.id);
                              return (
                                <label
                                  key={mod.id}
                                  className={`p-3 border rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${
                                    isChecked ? 'bg-black/5 border-black shadow-xs' : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPermissions([...selectedPermissions, mod.id]);
                                      } else {
                                        setSelectedPermissions(selectedPermissions.filter(p => p !== mod.id));
                                      }
                                    }}
                                    className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-600 accent-blue-600 cursor-pointer"
                                  />
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-black text-gray-900">{mod.name}</span>
                                      <span className="text-[10px] text-gray-500 font-medium">({mod.banglaName})</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-tight">{mod.desc}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setShowDirectAccessModal(false)}
                          className="px-5 py-3 text-xs font-bold text-gray-500 hover:text-black transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDirectAccess}
                          disabled={isSavingDirectAccess}
                          className="px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
                        >
                          {isSavingDirectAccess ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <CheckSquare size={14} />
                          )}
                          <span>{isEditingAccess ? 'Update Permissions' : 'Save Direct Access'}</span>
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Admin Personnel List */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase tracking-widest text-[#0C1421]">
                      Authorized Personnel ({adminList.length})
                    </h4>
                    <button 
                      onClick={loadAdminConfigAndList} 
                      disabled={loadingAdmins}
                      className="text-[10px] font-black uppercase text-brand-gold hover:text-black flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw size={12} className={loadingAdmins ? "animate-spin" : ""} />
                      Reload List
                    </button>
                  </div>

                  {loadingAdmins ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-3xl border border-gray-100">
                      <span className="w-8 h-8 border-3 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin mb-3" />
                      <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Loading access rights...</p>
                    </div>
                  ) : adminList.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 border border-gray-150 rounded-3xl">
                      <p className="text-xs text-gray-400 font-bold italic">No direct admins currently added. Click "নতুন এডমিন পারমিশন দিন" to add staff.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-3xl overflow-hidden divide-y divide-gray-100 bg-[#F8F9FD] shadow-xs">
                      {adminList.map((admin) => {
                        const emailKey = (admin.email || admin.id).toLowerCase().trim();
                        const isCeo = emailKey === 'eleganbd.ltd@gmail.com';
                        const isSuperAdminUser = isCeo || emailKey === 'sabbirrahmansr904@gmail.com';
                        const perms = admin.permissions || [];
                        const deptName = admin.department || (isCeo ? 'CEO & Founder' : 'Sales Executive Department');
                        
                        const lastActiveTime = admin.lastActive || 0;
                        const isOnlineNow = admin.isOnline && (Date.now() - lastActiveTime < 90000);

                        return (
                          <div key={admin.id || admin.email} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-all">
                            <div className="space-y-2 min-w-0">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <p className="text-sm font-black text-[#0C1421] truncate">{admin.email || admin.id}</p>
                                
                                {isCeo ? (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-xs flex items-center gap-1">
                                    👑 CEO & FOUNDER
                                  </span>
                                ) : isSuperAdminUser ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Super Admin
                                  </span>
                                ) : null}

                                {/* Department Badge */}
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  {deptName}
                                </span>

                                {/* Live Online Status Badge */}
                                {isOnlineNow ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Now
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 border border-gray-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                    Offline {lastActiveTime > 0 ? `(${formatLastActive(lastActiveTime)})` : ''}
                                  </span>
                                )}
                              </div>

                              {/* Permitted Modules Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-gray-400">Authorized Modules:</span>
                                {isCeo ? (
                                  <span className="text-[10px] font-black text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200">
                                    Full System Access & Control (All Modules)
                                  </span>
                                ) : perms.length === 0 ? (
                                  <span className="text-[10px] font-bold text-gray-400 italic">No specific permissions set</span>
                                ) : (
                                  perms.map((pKey) => {
                                    const modInfo = availableModules.find(m => m.id === pKey);
                                    return (
                                      <span
                                        key={pKey}
                                        className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200"
                                      >
                                        {modInfo ? modInfo.name : pKey}
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleOpenEditModal(admin)}
                                className="px-3.5 py-2 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                                title="Edit Department & Module Permissions"
                              >
                                <span>Edit Access</span>
                              </button>

                              {!isCeo && (
                                <button 
                                  onClick={() => handleRevokeAdmin(admin.id, admin.email)}
                                  className="p-2 text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-xl transition-all shadow-2xs"
                                  title="Revoke Access"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
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
                  className="flex items-center gap-2 px-5 py-2 border border-gray-200 bg-[#F8F9FD] hover:bg-gray-50 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-3xs text-gray-700"
                >
                  <RefreshCw size={14} className={cn("text-gray-500", isCheckingPixels && "animate-spin")} />
                  <span>Check</span>
                </button>
              </div>

              {/* Pro Upgrade Promotion Box */}
              <div className="p-4 bg-[#F8F9FD] border border-gray-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-3xs hover:border-indigo-100 transition-all">
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
              <div className="bg-[#F8F9FD] border border-gray-200 rounded-2xl overflow-hidden shadow-3xs flex flex-col justify-between hover:border-gray-300 transition-all">
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
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-sm text-black"
                        />
                      </div>

                      <div className="space-y-2 text-left">
                        <label className="text-xs font-semibold text-gray-900 block">Test Event Code (optional)</label>
                        <input 
                          type="text" 
                          value={pixelConfig.facebookTestCode || ''}
                          onChange={(e) => setPixelConfig({ ...pixelConfig, facebookTestCode: e.target.value })}
                          placeholder="TEST1234" 
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-sm text-black"
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
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-sm text-black"
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1b49c4]"></div>
                </label>
              </div>

              {/* Conditional Empty State or Coupons Manager */}
              {!couponEnabled ? (
                <div className="bg-[#F8F9FD] border border-gray-100 rounded-2xl p-12 md:p-20 flex flex-col items-center justify-center text-center">
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
                    <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm bg-[#F8F9FD]">
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
                                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1b49c4]"></div>
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
                  <div className="bg-[#F8F9FD] w-full max-w-md rounded-3xl p-8 border border-gray-100 shadow-2xl relative text-left">
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
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-[#1b49c4] text-gray-900 font-bold bg-[#F8F9FD]"
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
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl p-6 space-y-6">
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Choose a package card */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl p-6 space-y-6">
                <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Choose a package
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Starter */}
                  <div className="border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-gray-300 transition-all bg-[#F8F9FD] shadow-3xs">
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
                  <div className="border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-gray-300 transition-all bg-[#F8F9FD] shadow-3xs">
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
                  <div className="border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-gray-300 transition-all bg-[#F8F9FD] shadow-3xs">
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
                  <div className="border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-gray-300 transition-all bg-[#F8F9FD] shadow-3xs">
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
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl p-6 space-y-6">
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
                  <div className="bg-[#F8F9FD] w-full max-w-md rounded-3xl p-8 border border-gray-100 shadow-2xl relative text-left">
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
              {!isSabbirRahman && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3.5 text-amber-900 shadow-sm">
                  <Lock className="shrink-0 text-amber-600" size={20} />
                  <p className="text-xs font-bold leading-relaxed">
                    Pay Method সেটিংস পরিবর্তন ও কনফিগারেশন করার অনুমতি শুধুমাত্র সাব্বির রহমান (<span className="font-mono underline">sabbirrahmansr904@gmail.com</span>) এর একাউন্টে সংরক্ষিত।
                  </p>
                </div>
              )}

              {/* Title Header with Save changes button */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-8">
                <div className="flex items-center gap-3">
                  <h3 className="serif text-3xl text-black italic tracking-tighter uppercase font-black">Payments</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold font-mono">
                    {(codEnabled ? 1 : 0) + (bkashEnabled ? 1 : 0) + (nagadEnabled ? 1 : 0) + (rocketEnabled ? 1 : 0)}
                  </span>
                  <button
                    onClick={handleSavePayments}
                    disabled={!isSabbirRahman}
                    className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-sm ${
                      !isSabbirRahman ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-[#5850ec] hover:bg-[#4f46e5] cursor-pointer'
                    }`}
                  >
                    Save changes
                  </button>
                </div>
              </div>

              {/* Stats Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">METHODS ON</span>
                  <span className="text-4xl font-black text-gray-900 mt-2">
                    {(codEnabled ? 1 : 0) + (bkashEnabled ? 1 : 0) + (nagadEnabled ? 1 : 0) + (rocketEnabled ? 1 : 0)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium mt-1">Across all gateways</span>
                </div>

                <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">MANUAL</span>
                  <span className="text-4xl font-black text-gray-900 mt-2">
                    {(codEnabled ? 1 : 0) + (bkashEnabled ? 1 : 0) + (nagadEnabled ? 1 : 0) + (rocketEnabled ? 1 : 0)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium mt-1">Customer pays you</span>
                </div>

                <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">ONLINE</span>
                  <span className="text-4xl font-black text-gray-900 mt-2">0</span>
                  <span className="text-xs text-gray-500 font-medium mt-1">No online gateway</span>
                </div>
              </div>

              {/* Manual Methods Section */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-3xl p-8 space-y-8 shadow-3xs text-left">
                <div>
                  <h4 className="text-base font-extrabold text-gray-900">Manual methods</h4>
                  <p className="text-xs text-gray-500 mt-1">Customer pays you directly; you confirm the order.</p>
                </div>

                <div className="space-y-6">
                  {/* Cash on Delivery */}
                  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => document.getElementById('cod-logo-input')?.click()}
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shadow-3xs cursor-pointer relative overflow-hidden group border",
                          codLogo ? "bg-[#F8F9FD] border-gray-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}
                        title="Click to upload/change picture"
                      >
                        {codLogo ? (
                          <img src={codLogo} alt="Cash on Delivery" className="w-full h-full object-contain p-1.5" />
                        ) : (
                          <Coins size={22} />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold">
                          Edit
                        </div>
                      </div>
                      <input 
                        id="cod-logo-input" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleUploadCodLogo} 
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-gray-900">Cash on delivery <span className="text-[10px] text-indigo-600 font-normal">(Click icon to upload picture)</span></p>
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
                    </label>
                  </div>

                  {/* bKash */}
                  <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          onClick={() => document.getElementById('bkash-logo-input')?.click()}
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-bold font-sans text-sm tracking-tighter shadow-3xs cursor-pointer relative overflow-hidden group border",
                            bkashLogo ? "bg-[#F8F9FD] border-gray-100" : "bg-[#e2136e] text-white border-transparent"
                          )}
                          title="Click to upload/change picture"
                        >
                          {bkashLogo ? (
                            <img src={bkashLogo} alt="bKash" className="w-full h-full object-contain p-1.5" />
                          ) : (
                            <span>bK</span>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold">
                            Edit
                          </div>
                        </div>
                        <input 
                          id="bkash-logo-input" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleUploadBkashLogo} 
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-gray-900">bKash <span className="text-[10px] text-indigo-600 font-normal">(Click logo to upload picture)</span></p>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
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
                            className="w-full bg-[#F8F9FD] border border-gray-200 py-3 px-4.5 rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#5850ec] transition-all font-mono text-sm font-bold text-gray-900"
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
                                    : "bg-[#F8F9FD] border-gray-200 text-gray-600 hover:border-gray-300"
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
                        <div 
                          onClick={() => document.getElementById('nagad-logo-input')?.click()}
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-bold font-sans text-sm tracking-tighter shadow-3xs cursor-pointer relative overflow-hidden group border",
                            nagadLogo ? "bg-[#F8F9FD] border-gray-100" : "bg-[#f47321] text-white border-transparent"
                          )}
                          title="Click to upload/change picture"
                        >
                          {nagadLogo ? (
                            <img src={nagadLogo} alt="Nagad" className="w-full h-full object-contain p-1.5" />
                          ) : (
                            <span>Ng</span>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold">
                            Edit
                          </div>
                        </div>
                        <input 
                          id="nagad-logo-input" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleUploadNagadLogo} 
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-gray-900">Nagad <span className="text-[10px] text-indigo-600 font-normal">(Click logo to upload picture)</span></p>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
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
                            className="w-full bg-[#F8F9FD] border border-gray-200 py-3 px-4.5 rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#5850ec] transition-all font-mono text-sm font-bold text-gray-900"
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
                                    : "bg-[#F8F9FD] border-gray-200 text-gray-600 hover:border-gray-300"
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

                  {/* Rocket */}
                  <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          onClick={() => document.getElementById('rocket-logo-input')?.click()}
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-bold font-sans text-sm tracking-tighter shadow-3xs cursor-pointer relative overflow-hidden group border",
                            rocketLogo ? "bg-[#F8F9FD] border-gray-100" : "bg-[#8c0c5c] text-white border-transparent"
                          )}
                          title="Click to upload/change picture"
                        >
                          {rocketLogo ? (
                            <img src={rocketLogo} alt="Rocket" className="w-full h-full object-contain p-1.5" />
                          ) : (
                            <span>Rk</span>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold">
                            Edit
                          </div>
                        </div>
                        <input 
                          id="rocket-logo-input" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleUploadRocketLogo} 
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-gray-900">Rocket <span className="text-[10px] text-indigo-600 font-normal">(Click logo to upload picture)</span></p>
                          <p className="text-xs text-gray-500 font-medium">Send Money to your Rocket number.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={rocketEnabled}
                          onChange={(e) => setRocketEnabled(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#F8F9FD] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5850ec]"></div>
                      </label>
                    </div>

                    {rocketEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200/50">
                        <div className="space-y-2 col-span-1">
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-600">Rocket number</label>
                          <input
                            type="text"
                            value={rocketNumber}
                            onChange={(e) => setRocketNumber(e.target.value)}
                            placeholder="e.g. 017XXXXXXXX-X"
                            className="w-full bg-[#F8F9FD] border border-gray-200 py-3 px-4.5 rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#5850ec] transition-all font-mono text-sm font-bold text-gray-900"
                          />
                        </div>

                        <div className="space-y-2 col-span-1">
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-600">Account type</label>
                          <div className="flex gap-2.5">
                            {(['Personal', 'Merchant', 'Agent'] as const).map((type) => (
                              <button
                                key={type}
                                onClick={() => setRocketType(type)}
                                className={cn(
                                  "flex-1 py-3 px-4.5 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center",
                                  rocketType === type
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold"
                                    : "bg-[#F8F9FD] border-gray-200 text-gray-600 hover:border-gray-300"
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

              {/* Customer bKash / Nagad / Rocket Payment Transactions Section */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-3xl p-8 space-y-6 shadow-3xs text-left">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h4 className="text-base font-extrabold text-gray-900">bKash, Nagad & Rocket Payment Transactions</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Orders where customers sent money via bKash, Nagad, or Rocket and provided their Transaction ID (Tran ID).</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full font-mono">
                    {orders.filter(o => o.paymentMethod === 'bkash' || o.paymentMethod === 'nagad' || o.paymentMethod === 'rocket' || (o.transactionId && o.transactionId.trim() !== '')).length} Transactions
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Gateway</th>
                        <th className="py-3 px-4">Transaction ID (Tran ID)</th>
                        <th className="py-3 px-4">Amount Sent</th>
                        <th className="py-3 px-4">Order Total</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.filter(o => o.paymentMethod === 'bkash' || o.paymentMethod === 'nagad' || o.paymentMethod === 'rocket' || (o.transactionId && o.transactionId.trim() !== '')).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400 font-medium">
                            No bKash, Nagad, or Rocket payment transaction records found yet.
                          </td>
                        </tr>
                      ) : (
                        orders
                          .filter(o => o.paymentMethod === 'bkash' || o.paymentMethod === 'nagad' || o.paymentMethod === 'rocket' || (o.transactionId && o.transactionId.trim() !== ''))
                          .map(order => (
                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 px-4 font-bold text-gray-900">#{order.id.slice(-6)}</td>
                              <td className="py-3 px-4 font-bold text-gray-900">{order.customerName}</td>
                              <td className="py-3 px-4 font-mono text-gray-600">{order.phone}</td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
                                  order.paymentMethod === 'bkash' ? "bg-pink-50 text-pink-700 border border-pink-200" :
                                  order.paymentMethod === 'nagad' ? "bg-orange-50 text-orange-700 border border-orange-200" :
                                  order.paymentMethod === 'rocket' ? "bg-purple-50 text-purple-700 border border-purple-200" :
                                  "bg-gray-100 text-gray-700"
                                )}>
                                  {order.paymentMethod || 'Manual'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-[#5850ec]">{order.transactionId || 'N/A'}</td>
                              <td className="py-3 px-4 font-extrabold text-emerald-600">
                                ৳{(order as any).paidAmount ?? order.advancePayment ?? '—'}
                              </td>
                              <td className="py-3 px-4 font-extrabold text-gray-900">৳{order.total}</td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Floating bottom save changes bar when changed */}
              {paymentsChanged && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#F8F9FD] border border-gray-200/90 py-3 px-4.5 rounded-2xl shadow-xl flex items-center gap-3 w-[92%] max-w-lg transition-all animate-fade-in">
                  <button
                    onClick={handleDiscardPayments}
                    className="px-5 py-2.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer bg-[#F8F9FD]"
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
          
          {(activeTab === 'Courier' || activeTab === 'Pathao') && (
            <div className="space-y-8 max-w-3xl relative z-10 font-sans">
              <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                <div>
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase font-black flex items-center gap-2">
                    <Truck size={24} className="text-red-600" />
                    Courier API Integrations
                  </h3>
                  <p className="text-xs text-gray-400 font-semibold mt-1">
                    Manage Courier credentials for automatic order dispatch and tracking.
                  </p>
                </div>
              </div>

              {/* Courier Sub Tabs */}
              <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => setCourierSubTab('pathao')}
                  className={cn(
                    "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer",
                    courierSubTab === 'pathao' ? "bg-[#F8F9FD] text-black shadow-md" : "text-gray-400 hover:text-black"
                  )}
                >
                  Pathao Courier
                </button>
                <button
                  type="button"
                  onClick={() => setCourierSubTab('steadfast')}
                  className={cn(
                    "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer",
                    courierSubTab === 'steadfast' ? "bg-[#F8F9FD] text-black shadow-md" : "text-gray-400 hover:text-black"
                  )}
                >
                  Steadfast Courier
                </button>
              </div>

              {courierSubTab === 'pathao' ? (
                <div className="space-y-8">
                  {/* Pathao Status Card */}
                  <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border border-slate-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center font-black shrink-0">
                          <Truck size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">Pathao Merchant Credentials</h4>
                          <p className="text-xs text-slate-400 font-medium">Store ID: {pathaoStoreId || 'Not Set'} ({pathaoEnv.toUpperCase()})</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestPathaoConnection}
                        disabled={isTestingPathao}
                        className="px-4 py-2 bg-[#F8F9FD]/10 hover:bg-[#F8F9FD]/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0"
                      >
                        <RefreshCw size={12} className={isTestingPathao ? "animate-spin text-red-400" : "text-emerald-400"} />
                        <span>Test OAuth Connection</span>
                      </button>
                    </div>
                  </div>

                  {/* Form Settings */}
                  <form onSubmit={handleSavePathaoConfig} className="space-y-6 bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 block">
                          Client ID (নম্বর/কোড) *
                        </label>
                        <input
                          type="text"
                          value={pathaoClientId}
                          onChange={(e) => setPathaoClientId(e.target.value)}
                          placeholder="e.g. nXe0A73axr"
                          required
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 block">
                          Client Secret (সিক্রেট কি) *
                        </label>
                        <input
                          type="text"
                          value={pathaoClientSecret}
                          onChange={(e) => setPathaoClientSecret(e.target.value)}
                          placeholder="e.g. 0LyQiusPk4Hgu..."
                          required
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 block">
                          Username (ইউজারনেম / ইমেইল) *
                        </label>
                        <input
                          type="email"
                          value={pathaoUsername}
                          onChange={(e) => setPathaoUsername(e.target.value)}
                          placeholder="e.g. eleganbd.ltd@gmail.com"
                          required
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 block">
                          Password (পাসওয়ার্ড) *
                        </label>
                        <input
                          type="password"
                          value={pathaoPassword}
                          onChange={(e) => setPathaoPassword(e.target.value)}
                          placeholder="Pathao password..."
                          required
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 block">
                          Store ID (স্টোর আইডি) *
                        </label>
                        <input
                          type="text"
                          value={pathaoStoreId}
                          onChange={(e) => setPathaoStoreId(e.target.value)}
                          placeholder="e.g. 376372"
                          required
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 block">
                          Base URL (Pathao Endpoint)
                        </label>
                        <input
                          type="text"
                          value={pathaoBaseUrl}
                          onChange={(e) => setPathaoBaseUrl(e.target.value)}
                          placeholder="https://api-hermes.pathao.com"
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pathaoEnabled}
                          onChange={(e) => setPathaoEnabled(e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-gray-300"
                        />
                        <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                          Enable Pathao Automatic Dispatch
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={isSavingPathao}
                        className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSavingPathao ? (
                          <RefreshCw size={14} className="animate-spin text-white" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span>Save Pathao Credentials</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Steadfast Status Card */}
                  <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border border-slate-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center font-black shrink-0">
                          <Truck size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">Steadfast Merchant Credentials</h4>
                          <p className="text-xs text-slate-400 font-medium">
                            Status: {steadfastEnabled ? 'Activated (Direct Booking Ready)' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestSteadfastConnection}
                        disabled={isTestingSteadfast}
                        className="px-4 py-2 bg-[#F8F9FD]/10 hover:bg-[#F8F9FD]/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0"
                      >
                        <RefreshCw size={12} className={isTestingSteadfast ? "animate-spin text-indigo-400" : "text-emerald-400"} />
                        <span>Test API Key Connection</span>
                      </button>
                    </div>
                  </div>

                  {/* Steadfast Form Settings */}
                  <form onSubmit={handleSaveSteadfastConfig} className="space-y-6 bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 block">
                          API Key (এপিআই কি) *
                        </label>
                        <input
                          type="text"
                          value={steadfastApiKey}
                          onChange={(e) => setSteadfastApiKey(e.target.value)}
                          placeholder="e.g. steadfast_api_key_xxxxxxxxxxxxx"
                          required
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-500 block">
                          Secret Key (সিক্রেট কি) *
                        </label>
                        <input
                          type="text"
                          value={steadfastSecretKey}
                          onChange={(e) => setSteadfastSecretKey(e.target.value)}
                          placeholder="e.g. steadfast_secret_key_xxxxxxxxxxxxx"
                          required
                          className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={steadfastEnabled}
                          onChange={(e) => setSteadfastEnabled(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                          Enable Steadfast Automatic Dispatch
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={isSavingSteadfast}
                        className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSavingSteadfast ? (
                          <RefreshCw size={14} className="animate-spin text-white" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span>Save Steadfast Credentials</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Offers' && (
            <div className="space-y-8 max-w-5xl relative z-10 font-sans text-left">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Campaign & Offers Settings</h3>
                  <p className="text-xs text-gray-500 mt-1">Select and manage products featured in the OFFERS section and homepage.</p>
                </div>
              </div>

              {/* Currently in Offers */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl shadow-3xs overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Current Offer Products</h4>
                    <p className="text-xs text-gray-500 mt-0.5">These products are visible in the OFFERS menu and Home page.</p>
                  </div>
                  <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 text-xs font-bold">
                    {offerProductIds.length} Products Active
                  </div>
                </div>
                <div className="p-6">
                  {offerProductIds.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                      <Tag size={32} className="mx-auto text-gray-300 mb-2 animate-pulse" />
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">No products added to offers yet</p>
                      <p className="text-xs text-gray-400 mt-1">Use the section below to search and add some products.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {products
                        .filter(p => offerProductIds.includes(p.id))
                        .map(p => (
                          <div key={p.id} className="group border border-gray-100 rounded-xl overflow-hidden bg-[#F8F9FD] hover:shadow-xs transition-all relative flex flex-col">
                            <div className="aspect-square bg-gray-50 relative overflow-hidden">
                              <img 
                                src={p.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b'} 
                                alt={p.name} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-between">
                              <div>
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {p.category}
                                </span>
                                <h5 className="text-xs font-bold text-gray-900 truncate mt-1.5">{p.name}</h5>
                                <p className="text-xs font-extrabold text-gray-900 mt-1">৳ {p.price}</p>
                              </div>
                              <div className="flex gap-1.5 mt-3">
                                <button
                                  onClick={() => {
                                    setEditingOfferProduct(p);
                                    setEditOfferName(p.name);
                                    setEditOfferPrice(p.price);
                                    setEditOfferRegularPrice(p.regularPrice || '');
                                    setEditOfferDescription(p.description || '');
                                    setEditOfferImages(p.images || []);
                                  }}
                                  className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Pencil size={11} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    const newIds = offerProductIds.filter(id => id !== p.id);
                                    await updateOfferProducts(newIds);
                                    toast.success('Removed from offers successfully');
                                  }}
                                  className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add more products */}
              <div className="bg-[#F8F9FD] border border-gray-200/80 rounded-2xl shadow-3xs overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Add Products to Offers</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Search and add other items to the campaign.</p>
                  </div>
                  <div className="w-full sm:w-64 relative">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={offerSearchQuery}
                      onChange={(e) => setOfferSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-[#F8F9FD] border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div className="p-6 max-h-[500px] overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {products
                      .filter(p => !offerProductIds.includes(p.id))
                      .filter(p => !offerSearchQuery || p.name.toLowerCase().includes(offerSearchQuery.toLowerCase()) || p.category.toLowerCase().includes(offerSearchQuery.toLowerCase()))
                      .map(p => (
                        <div key={p.id} className="border border-gray-100 rounded-xl overflow-hidden bg-[#F8F9FD] hover:shadow-xs transition-all relative flex flex-col">
                          <div className="aspect-square bg-gray-50 relative overflow-hidden">
                            <img 
                              src={p.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b'} 
                              alt={p.name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                {p.category}
                              </span>
                              <h5 className="text-xs font-bold text-gray-900 truncate mt-1.5">{p.name}</h5>
                              <p className="text-xs font-extrabold text-gray-900 mt-1">৳ {p.price}</p>
                            </div>
                            <button
                              onClick={async () => {
                                const newIds = [...offerProductIds, p.id];
                                await updateOfferProducts(newIds);
                                toast.success('Added to offers successfully');
                              }}
                              className="mt-3 w-full py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>Add to Offer</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab !== 'General' && activeTab !== 'Banners' && activeTab !== 'Categories' && activeTab !== 'Notifications' && activeTab !== 'Branding' && activeTab !== 'Admin Access' && activeTab !== 'Payments' && activeTab !== 'Pixel & Analytics' && activeTab !== 'Coupons' && activeTab !== 'SMS' && activeTab !== 'Courier' && activeTab !== 'Pathao' && (
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
        {editingOfferProduct && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingOfferProduct(null)}
              className="absolute inset-0 bg-black/45 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-[#F8F9FD] border border-gray-100 rounded-2xl max-w-2xl w-full relative shadow-2xl z-20 overflow-hidden flex flex-col max-h-[90vh] text-left font-sans"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">Edit Offer Product</h3>
                  <p className="text-xs text-gray-500">Modify title, pricing, description, and images for this item.</p>
                </div>
                <button 
                  onClick={() => setEditingOfferProduct(null)}
                  className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-black rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Product Name</label>
                  <input
                    type="text"
                    value={editOfferName}
                    onChange={(e) => setEditOfferName(e.target.value)}
                    placeholder="Enter product title"
                    className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                </div>

                {/* Price & Regular Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Offer Price (৳)</label>
                    <input
                      type="number"
                      value={editOfferPrice}
                      onChange={(e) => setEditOfferPrice(Number(e.target.value))}
                      placeholder="e.g. 1200"
                      className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Regular Price (৳) - optional</label>
                    <input
                      type="number"
                      value={editOfferRegularPrice}
                      onChange={(e) => setEditOfferRegularPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 1600"
                      className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Description / Details</label>
                  <textarea
                    value={editOfferDescription}
                    onChange={(e) => setEditOfferDescription(e.target.value)}
                    placeholder="Add materials, fitting, details..."
                    rows={4}
                    className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none animate-none"
                  />
                </div>

                {/* Product Images */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Product Images</label>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {editOfferImages.map((img, idx) => (
                      <div key={idx} className="aspect-square bg-gray-50 border border-gray-100 rounded-xl overflow-hidden relative group">
                        <img 
                          src={img} 
                          alt="Product" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setEditOfferImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <div 
                      onClick={() => document.getElementById('offer-product-file-input')?.click()}
                      className="aspect-square border border-dashed border-gray-200 hover:border-gray-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-black bg-gray-50/30 text-xs"
                    >
                      <Upload size={18} />
                      <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Upload</span>
                    </div>
                  </div>
                  <input
                    type="file"
                    id="offer-product-file-input"
                    multiple
                    accept="image/*"
                    onChange={handleOfferImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/30">
                <button 
                  onClick={() => setEditingOfferProduct(null)}
                  className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold bg-[#F8F9FD] text-gray-400 hover:text-black transition-all rounded-lg border border-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveOfferProduct}
                  disabled={editOfferSaving}
                  className="px-5 py-2 text-[10px] uppercase tracking-wider font-black bg-[#4F46E5] text-white hover:bg-indigo-700 transition-all rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  {editOfferSaving ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  <span>{editOfferSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

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
              className="bg-[#F8F9FD] border border-gray-100 p-8 rounded-xl max-w-sm w-full text-center relative shadow-xl z-20"
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
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all rounded-lg shadow-sm cursor-pointer"
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
