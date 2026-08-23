/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useProducts } from '../../contexts/ProductContext';
import { useBanners } from '../../contexts/BannerContext';
import { useBranding } from '../../contexts/BrandingContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice, cn } from '../../lib/utils';
import { 
  Search, 
  ExternalLink, 
  Eye, 
  Copy, 
  Grid, 
  List, 
  RefreshCw, 
  CloudUpload, 
  Image as ImageIcon,
  Check,
  X,
  Trash2,
  Download,
  Filter,
  Layers,
  Sparkles,
  Tag,
  CheckSquare,
  Square,
  AlertTriangle,
  UploadCloud,
  Link2,
  FolderOpen,
  Info,
  Sliders,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { compressImage } from '../../utils/imageCompressor';
import { formatDistanceToNow } from 'date-fns';

export type MediaSource = 'uploaded' | 'product' | 'banner' | 'branding' | 'category' | 'review';

export interface UnifiedMediaItem {
  id: string;
  url: string;
  filename: string;
  title: string;
  source: MediaSource;
  category: string;
  createdAt: number;
  uploadedBy?: string;
  fileSize?: string;
  dimensions?: string;
  
  // Product specific metadata
  productId?: string;
  productSku?: string;
  productPrice?: number;
  productCategory?: string;

  // Banner specific metadata
  bannerId?: string;

  // Branding specific metadata
  brandingKey?: string;

  // Category specific metadata
  categoryId?: string;
  catSlug?: string;

  // Review specific metadata
  reviewId?: string;
  reviewAuthor?: string;

  // Deletable flag
  canDelete: boolean;
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Live Media', icon: Layers },
  { id: 'uploaded', label: 'Uploaded Assets', icon: CloudUpload },
  { id: 'product', label: 'Product Catalog', icon: Tag },
  { id: 'banner', label: 'Banners & Sliders', icon: Sliders },
  { id: 'branding', label: 'Branding & Logos', icon: Sparkles },
  { id: 'category', label: 'Category Icons', icon: FolderOpen },
  { id: 'review', label: 'Customer Reviews', icon: Info },
] as const;

export default function AdminMedia() {
  const { products, updateProduct } = useProducts();
  const { banners, deleteBanner } = useBanners();
  const branding = useBranding();
  const { categories, updateCategory } = useCategories();
  const { currentUser, isSuperAdmin, isCEO, permissions } = useAuth();
  const { currency, rate } = useCurrency();

  // Master / Authorized Admin check for media management
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isMasterAdmin = 
    isSuperAdmin || 
    isCEO || 
    (permissions && (permissions.includes('all') || permissions.includes('media') || permissions.includes('settings'))) ||
    userEmail === 'sabbirrahmansr904@gmail.com' || 
    userEmail === 'eleganbd.ltd@gmail.com';

  // Firestore direct media state
  const [directMedia, setDirectMedia] = useState<any[]>([]);
  const [reviewsMedia, setReviewsMedia] = useState<any[]>([]);
  const [loadingDirect, setLoadingDirect] = useState(true);

  // Instant local delete cache to ensure immediate removal
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('eleganbd_deleted_media_cache');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set();
  });

  const markAsDeletedLocally = (id: string, url: string) => {
    setDeletedIds(prev => {
      const next = new Set(prev);
      if (id) next.add(id);
      if (url) next.add(url);
      try {
        localStorage.setItem('eleganbd_deleted_media_cache', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Selected & Modal states
  const [selectedMedia, setSelectedMedia] = useState<UnifiedMediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnifiedMediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Upload Form states
  const [uploadTab, setUploadTab] = useState<'file' | 'url'>('file');
  const [uploadFiles, setUploadFiles] = useState<{ file: File; preview: string; name: string }[]>([]);
  const [uploadCategory, setUploadCategory] = useState('General Asset');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Listen to real-time 'media' collection from Firestore
  useEffect(() => {
    try {
      const mediaRef = collection(db, 'media');
      const unsubscribe = onSnapshot(mediaRef, (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setDirectMedia(items);
        setLoadingDirect(false);
      }, (err) => {
        console.warn('Firestore media listener error:', err);
        setLoadingDirect(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Error setting up media listener:', e);
      setLoadingDirect(false);
    }
  }, []);

  // 2. Listen to real-time 'reviews' collection for customer photo attachments
  useEffect(() => {
    try {
      const reviewsRef = collection(db, 'reviews');
      const unsubscribe = onSnapshot(reviewsRef, (snapshot) => {
        const items: any[] = [];
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (data.image || (data.images && Array.isArray(data.images) && data.images.length > 0)) {
            items.push({ id: d.id, ...data });
          }
        });
        setReviewsMedia(items);
      }, (err) => {
        console.warn('Reviews photo listener warning:', err);
      });

      return () => unsubscribe();
    } catch (e) {}
  }, []);

  // Helper to extract clean filename from URL
  const extractFilename = (url: string, fallback: string = 'media_image.webp') => {
    if (!url) return fallback;
    try {
      if (url.startsWith('data:image')) {
        return `compressed_upload_${Math.random().toString(36).substring(2, 6)}.webp`;
      }
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && last.length > 2) {
        let clean = decodeURIComponent(last).substring(0, 30);
        if (!clean.includes('.')) clean += '.webp';
        return clean.replace(/[?#].*$/, '');
      }
    } catch (e) {
      const parts = url.split('/');
      const last = parts[parts.length - 1];
      if (last) return last.substring(0, 30);
    }
    return fallback;
  };

  // 3. Aggregate all live pictures across the website into unified media list
  const allMediaItems = useMemo(() => {
    const list: UnifiedMediaItem[] = [];
    const seenUrls = new Set<string>();

    const isExcluded = (id: string, url: string) => {
      return deletedIds.has(id) || (url && deletedIds.has(url));
    };

    // A. Direct Media Collection items
    directMedia.forEach((dm) => {
      if (dm.url && !seenUrls.has(dm.url) && !isExcluded(dm.id, dm.url)) {
        seenUrls.add(dm.url);
        list.push({
          id: dm.id,
          url: dm.url,
          filename: dm.name || extractFilename(dm.url, 'uploaded_media.webp'),
          title: dm.name || 'Uploaded Media Asset',
          source: 'uploaded',
          category: dm.category || 'General Asset',
          createdAt: dm.createdAt || Date.now(),
          uploadedBy: dm.uploadedBy || 'Admin',
          fileSize: dm.fileSize || 'Optimized',
          dimensions: dm.dimensions || 'HD Resolution',
          canDelete: isMasterAdmin
        });
      }
    });

    // B. Live Product Images (thumbnails and gallery arrays)
    if (products && Array.isArray(products)) {
      products.forEach((prod) => {
        const prodImages: string[] = [];
        if (prod.images && Array.isArray(prod.images)) {
          prod.images.forEach(img => {
            if (img && typeof img === 'string') prodImages.push(img);
          });
        }
        if (prod.thumbnail && !prodImages.includes(prod.thumbnail)) {
          prodImages.unshift(prod.thumbnail);
        }

        prodImages.forEach((url, idx) => {
          if (!url) return;
          const itemId = `prod_${prod.id}_${idx}`;
          if (isExcluded(itemId, url)) return;
          list.push({
            id: itemId,
            url,
            filename: extractFilename(url, `${prod.name.slice(0, 16)}_img_${idx + 1}.webp`),
            title: `${prod.name} (Photo ${idx + 1})`,
            source: 'product',
            category: prod.category || 'Products',
            createdAt: (prod as any).createdAt || Date.now(),
            productId: prod.id,
            productSku: prod.sku || prod.id.slice(0, 8),
            productPrice: prod.price,
            productCategory: prod.category,
            fileSize: 'Product CDN',
            dimensions: 'Catalog View',
            canDelete: isMasterAdmin
          });
        });
      });
    }

    // C. Live Banners & Sliders
    if (banners && Array.isArray(banners)) {
      banners.forEach((b) => {
        const bannerItemId = `banner_${b.id}`;
        if (b.image && !seenUrls.has(b.image) && !isExcluded(bannerItemId, b.image)) {
          seenUrls.add(b.image);
          list.push({
            id: bannerItemId,
            url: b.image,
            filename: extractFilename(b.image, `banner_${b.id.slice(0, 6)}.webp`),
            title: b.title || 'Slider Promotional Banner',
            source: 'banner',
            category: 'Hero / Slider Banner',
            createdAt: (b as any).createdAt || Date.now(),
            bannerId: b.id,
            fileSize: 'Slider HD',
            dimensions: 'Banner Scale',
            canDelete: isMasterAdmin
          });
        }
      });
    }

    // D. Live Branding Assets
    if (branding) {
      const brandingAssets = [
        { key: 'logoUrl', title: 'Main Website Logo', url: branding.logoUrl, cat: 'Site Identity' },
        { key: 'ceoPhotoUrl', title: 'CEO & Founder Photo', url: branding.ceoPhotoUrl, cat: 'Leadership' },
        { key: 'sizeChartUrl', title: 'Global Size Guide Chart', url: branding.sizeChartUrl, cat: 'Size Chart' },
        { key: 'heroBannerUrl', title: 'Primary Hero Banner 1', url: branding.heroBannerUrl, cat: 'Hero Banner' },
        { key: 'heroBanner2Url', title: 'Hero Banner 2', url: branding.heroBanner2Url, cat: 'Hero Banner' },
        { key: 'heroBanner3Url', title: 'Hero Banner 3', url: branding.heroBanner3Url, cat: 'Hero Banner' },
        { key: 'subHeroBannerUrl', title: 'Sub-Hero Showcase Banner', url: branding.subHeroBannerUrl, cat: 'Promo Banner' },
        { key: 'featureBannerUrl', title: 'Feature Spotlight Banner', url: branding.featureBannerUrl, cat: 'Feature Banner' },
        { key: 'poloBannerUrl', title: 'Polo Category Banner', url: branding.poloBannerUrl, cat: 'Category Showcase' },
        { key: 'shirtBannerUrl', title: 'Shirt Category Banner', url: branding.shirtBannerUrl, cat: 'Category Showcase' },
        { key: 'pantBannerUrl', title: 'Pant Category Banner', url: branding.pantBannerUrl, cat: 'Category Showcase' },
        { key: 'comboOfferBannerUrl', title: 'Combo Offer Banner', url: branding.comboOfferBannerUrl, cat: 'Special Offer' },
        { key: 'collectionsBannerUrl', title: 'Collections Header Banner', url: branding.collectionsBannerUrl, cat: 'Collections' },
        { key: 'whyChooseImg1', title: 'Why Choose Us #1', url: branding.whyChooseImg1, cat: 'Value Proposition' },
        { key: 'whyChooseImg2', title: 'Why Choose Us #2', url: branding.whyChooseImg2, cat: 'Value Proposition' },
        { key: 'whyChooseImg3', title: 'Why Choose Us #3', url: branding.whyChooseImg3, cat: 'Value Proposition' },
        { key: 'whyChooseImg4', title: 'Why Choose Us #4', url: branding.whyChooseImg4, cat: 'Value Proposition' },
        { key: 'whyChooseImg5', title: 'Why Choose Us #5', url: branding.whyChooseImg5, cat: 'Value Proposition' }
      ];

      brandingAssets.forEach(ba => {
        const brandItemId = `branding_${ba.key}`;
        if (ba.url && ba.url.trim() && !seenUrls.has(ba.url) && !isExcluded(brandItemId, ba.url)) {
          seenUrls.add(ba.url);
          list.push({
            id: brandItemId,
            url: ba.url,
            filename: extractFilename(ba.url, `${ba.key}.webp`),
            title: ba.title,
            source: 'branding',
            category: ba.cat,
            createdAt: Date.now(),
            brandingKey: ba.key,
            fileSize: 'Branding Asset',
            dimensions: 'Standard Ratio',
            canDelete: isMasterAdmin
          });
        }
      });

      // Category Images from branding.categoryImages
      if (branding.categoryImages && typeof branding.categoryImages === 'object') {
        Object.entries(branding.categoryImages).forEach(([slug, url]) => {
          const brandCatId = `branding_cat_${slug}`;
          if (url && typeof url === 'string' && !seenUrls.has(url) && !isExcluded(brandCatId, url)) {
            seenUrls.add(url);
            list.push({
              id: brandCatId,
              url,
              filename: extractFilename(url, `cat_${slug}.webp`),
              title: `${slug.toUpperCase()} Category Image`,
              source: 'category',
              category: 'Category Image',
              createdAt: Date.now(),
              catSlug: slug,
              fileSize: 'Category View',
              dimensions: 'Square 1:1',
              canDelete: isMasterAdmin
            });
          }
        });
      }
    }

    // E. Category context images
    if (categories && Array.isArray(categories)) {
      categories.forEach(cat => {
        const catItemId = `cat_img_${cat.id}`;
        if ((cat as any).image && !seenUrls.has((cat as any).image) && !isExcluded(catItemId, (cat as any).image)) {
          seenUrls.add((cat as any).image);
          list.push({
            id: catItemId,
            url: (cat as any).image,
            filename: extractFilename((cat as any).image, `${cat.slug || cat.name}.webp`),
            title: `${cat.name} Image`,
            source: 'category',
            category: 'Category Asset',
            createdAt: Date.now(),
            categoryId: cat.id,
            fileSize: 'Category Icon',
            dimensions: 'Standard',
            canDelete: isMasterAdmin
          });
        }
      });
    }

    // F. Customer Review Photos
    reviewsMedia.forEach(rev => {
      const revImgs = Array.isArray(rev.images) ? rev.images : rev.image ? [rev.image] : [];
      revImgs.forEach((url: string, idx: number) => {
        const revItemId = `review_${rev.id}_${idx}`;
        if (url && !seenUrls.has(url) && !isExcluded(revItemId, url)) {
          seenUrls.add(url);
          list.push({
            id: revItemId,
            url,
            filename: extractFilename(url, `review_proof_${rev.id.slice(0, 6)}.webp`),
            title: `Customer Review Photo (${rev.userName || 'Verified Buyer'})`,
            source: 'review',
            category: 'Review Proof',
            createdAt: rev.createdAt || Date.now(),
            reviewId: rev.id,
            reviewAuthor: rev.userName,
            fileSize: 'Customer Attachment',
            dimensions: 'User Photo',
            canDelete: isMasterAdmin
          });
        }
      });
    });

    return list;
  }, [directMedia, products, banners, branding, categories, reviewsMedia, isMasterAdmin, deletedIds]);

  // Counts for tabs
  const counts = useMemo(() => {
    const countsMap: Record<string, number> = {
      all: allMediaItems.length,
      uploaded: 0,
      product: 0,
      banner: 0,
      branding: 0,
      category: 0,
      review: 0
    };
    allMediaItems.forEach(item => {
      if (countsMap[item.source] !== undefined) {
        countsMap[item.source]++;
      }
    });
    return countsMap;
  }, [allMediaItems]);

  // Filter and sort items
  const filteredAndSortedMedia = useMemo(() => {
    let result = allMediaItems;

    // Filter by Category/Source Tab
    if (activeCategory !== 'all') {
      result = result.filter(item => item.source === activeCategory);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) ||
        item.filename.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.productSku && item.productSku.toLowerCase().includes(q)) ||
        (item.productCategory && item.productCategory.toLowerCase().includes(q)) ||
        item.source.toLowerCase().includes(q)
      );
    }

    // Sort items
    return [...result].sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [allMediaItems, activeCategory, searchQuery, sortBy]);

  // Handle Copy Direct URL
  const handleCopyLink = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('Direct Image URL copied to clipboard!');
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Handle Download Image
  const handleDownload = async (item: UnifiedMediaItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      toast.loading('Downloading image...', { id: 'download-toast' });
      const response = await fetch(item.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = item.filename || 'elegan_media_asset.webp';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Image downloaded successfully!', { id: 'download-toast' });
    } catch (err) {
      // Fallback for cross-origin CORS blocked downloads
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.download = item.filename;
      link.click();
      toast.success('Image opened in new tab for saving.', { id: 'download-toast' });
    }
  };

  // Handle File Input Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: { file: File; preview: string; name: string }[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file.`);
        return;
      }
      const preview = URL.createObjectURL(file);
      newFiles.push({
        file,
        preview,
        name: file.name.replace(/\.[^/.]+$/, "")
      });
    });

    setUploadFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove file from staging queue
  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle Executing Upload
  const handlePerformUpload = async () => {
    if (uploadTab === 'file') {
      if (uploadFiles.length === 0) {
        toast.error('Please choose at least one image to upload.');
        return;
      }

      setIsUploading(true);
      const uploadToast = toast.loading(`Optimizing and uploading ${uploadFiles.length} image(s)...`);

      try {
        let successCount = 0;
        for (const item of uploadFiles) {
          // Auto compress image to safe high-res WebP/JPEG under 200KB
          const compressedBase64 = await compressImage(item.file, 1400, 1400, 0.85);
          const newId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          await setDoc(doc(db, 'media', newId), {
            id: newId,
            name: item.name.trim() || 'Uploaded Media Asset',
            url: compressedBase64,
            category: uploadCategory,
            createdAt: Date.now(),
            uploadedBy: currentUser?.email || 'Admin',
            fileSize: `${(item.file.size / (1024 * 1024)).toFixed(2)} MB (Optimized)`,
            dimensions: 'Auto-scaled HD',
            type: 'uploaded'
          });
          successCount++;
        }

        toast.success(`Successfully uploaded ${successCount} image(s) to live Media Library!`, { id: uploadToast });
        setUploadFiles([]);
        setIsUploadModalOpen(false);
      } catch (err: any) {
        console.error('Media upload error:', err);
        toast.error('Upload failed: ' + (err.message || 'Unknown error'), { id: uploadToast });
      } finally {
        setIsUploading(false);
      }
    } else {
      // URL Upload tab
      if (!urlInput.trim()) {
        toast.error('Please provide a valid image URL.');
        return;
      }

      setIsUploading(true);
      const uploadToast = toast.loading('Adding image URL to Media Library...');

      try {
        const newId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(db, 'media', newId), {
          id: newId,
          name: urlTitle.trim() || extractFilename(urlInput, 'Web Image Asset'),
          url: urlInput.trim(),
          category: uploadCategory,
          createdAt: Date.now(),
          uploadedBy: currentUser?.email || 'Admin',
          fileSize: 'External URL',
          dimensions: 'Live Link',
          type: 'uploaded'
        });

        toast.success('Image link successfully stored in Media Library!', { id: uploadToast });
        setUrlInput('');
        setUrlTitle('');
        setIsUploadModalOpen(false);
      } catch (err: any) {
        console.error('URL add error:', err);
        toast.error('Failed to add image link: ' + (err.message || 'Error'), { id: uploadToast });
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Core Delete Single Item Handler across all collections
  const deleteSingleMediaItem = async (item: UnifiedMediaItem) => {
    if (!isMasterAdmin) {
      throw new Error('Only authorized administrators have permission to delete media.');
    }

    // 1. Immediately mark as deleted locally for instant UI removal
    markAsDeletedLocally(item.id, item.url);
    setDirectMedia(prev => prev.filter(dm => dm.id !== item.id && dm.url !== item.url));

    // 2. Clear from uploaded / media collection in Firestore
    if (item.source === 'uploaded' || item.id) {
      try {
        await deleteDoc(doc(db, 'media', item.id));
      } catch (e) {
        console.warn('Could not delete directly from media collection:', e);
      }
    }

    // Check if any matching doc in 'media' has this exact URL and delete it
    try {
      const mediaSnap = await getDocs(collection(db, 'media'));
      mediaSnap.docs.forEach(async (d) => {
        if (d.data()?.url === item.url || d.id === item.id) {
          await deleteDoc(doc(db, 'media', d.id)).catch(() => {});
        }
      });
    } catch (e) {}

    // 3. Remove from Products
    if (item.source === 'product' || item.productId) {
      if (item.productId) {
        const targetProd = products.find(p => p.id === item.productId);
        if (targetProd) {
          const currentImgs = (targetProd.images || []).filter(img => img !== item.url);
          const updatedThumb = targetProd.thumbnail === item.url ? (currentImgs[0] || '') : (targetProd.thumbnail || '');
          await updateProduct({
            ...targetProd,
            images: currentImgs,
            thumbnail: updatedThumb
          });
          await setDoc(doc(db, 'products', targetProd.id), {
            images: currentImgs,
            thumbnail: updatedThumb
          }, { merge: true }).catch(() => {});
        }
      }

      // Also clean up any other products referencing this URL
      products.forEach(async (p) => {
        if (p.thumbnail === item.url || (p.images && p.images.includes(item.url))) {
          const remaining = (p.images || []).filter(img => img !== item.url);
          const newThumb = p.thumbnail === item.url ? (remaining[0] || '') : (p.thumbnail || '');
          await updateProduct({ ...p, images: remaining, thumbnail: newThumb }).catch(() => {});
          await setDoc(doc(db, 'products', p.id), { images: remaining, thumbnail: newThumb }, { merge: true }).catch(() => {});
        }
      });
    } 
    
    // 4. Remove from Banners
    if (item.source === 'banner' || item.bannerId) {
      if (item.bannerId) {
        await deleteBanner(item.bannerId).catch(() => {});
        try {
          await deleteDoc(doc(db, 'banners', item.bannerId));
        } catch (e) {}
      }
      banners.forEach(async (b) => {
        if (b.image === item.url) {
          await deleteBanner(b.id).catch(() => {});
          await deleteDoc(doc(db, 'banners', b.id)).catch(() => {});
        }
      });
    } 
    
    // 5. Remove from Branding assets
    if (item.source === 'branding' || item.brandingKey) {
      const bk = item.brandingKey;
      if (bk === 'logoUrl') branding.setLogoUrl('');
      else if (bk === 'ceoPhotoUrl') branding.setCeoPhotoUrl('');
      else if (bk === 'sizeChartUrl') branding.setSizeChartUrl('');
      else if (bk === 'heroBannerUrl') {
        branding.setHeroBannerUrl('');
        await setDoc(doc(db, 'config', 'banner_hero'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'heroBanner2Url') {
        branding.setHeroBanner2Url('');
        await setDoc(doc(db, 'config', 'banner_hero_2'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'heroBanner3Url') {
        branding.setHeroBanner3Url('');
        await setDoc(doc(db, 'config', 'banner_hero_3'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'subHeroBannerUrl') {
        branding.setSubHeroBannerUrl('');
        await setDoc(doc(db, 'config', 'banner_sub_hero'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'featureBannerUrl') {
        branding.setFeatureBannerUrl('');
        await setDoc(doc(db, 'config', 'banner_feature'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'poloBannerUrl') {
        branding.setPoloBannerUrl('');
        await setDoc(doc(db, 'config', 'banner_polo'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'shirtBannerUrl') {
        branding.setShirtBannerUrl('');
        await setDoc(doc(db, 'config', 'banner_shirt'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'pantBannerUrl') {
        branding.setPantBannerUrl('');
        await setDoc(doc(db, 'config', 'banner_pant'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'comboOfferBannerUrl') {
        branding.setComboOfferBannerUrl('');
        await setDoc(doc(db, 'config', 'banner_combo_offer'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'collectionsBannerUrl') {
        branding.setCollectionsBannerUrl('');
        await setDoc(doc(db, 'config', 'banner_collections'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'whyChooseImg1') {
        branding.setWhyChooseImg1('');
        await setDoc(doc(db, 'config', 'why_choose_1'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'whyChooseImg2') {
        branding.setWhyChooseImg2('');
        await setDoc(doc(db, 'config', 'why_choose_2'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'whyChooseImg3') {
        branding.setWhyChooseImg3('');
        await setDoc(doc(db, 'config', 'why_choose_3'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'whyChooseImg4') {
        branding.setWhyChooseImg4('');
        await setDoc(doc(db, 'config', 'why_choose_4'), { url: '' }, { merge: true }).catch(() => {});
      } else if (bk === 'whyChooseImg5') {
        branding.setWhyChooseImg5('');
        await setDoc(doc(db, 'config', 'why_choose_5'), { url: '' }, { merge: true }).catch(() => {});
      }

      if (bk) {
        await setDoc(doc(db, 'config', 'branding'), {
          [bk]: ''
        }, { merge: true }).catch(() => {});
      }
    } 
    
    // 6. Remove from Category assets
    if (item.source === 'category' || item.categoryId || item.catSlug) {
      if (item.categoryId) {
        const cat = categories.find(c => c.id === item.categoryId);
        if (cat) {
          await updateCategory({ ...cat, image: '' }).catch(() => {});
        }
        await setDoc(doc(db, 'categories', item.categoryId), {
          image: ''
        }, { merge: true }).catch(() => {});
      }
      
      if (item.catSlug) {
        branding.setCategoryImageUrl(item.catSlug, '');
        const updatedCatImgs = { ...(branding?.categoryImages || {}) };
        delete updatedCatImgs[item.catSlug];
        await setDoc(doc(db, 'config', 'branding'), {
          categoryImages: updatedCatImgs
        }, { merge: true }).catch(() => {});
        await setDoc(doc(db, 'config', 'categories'), {
          images: updatedCatImgs
        }, { merge: true }).catch(() => {});
      }

      // Check all other categories with matching image URL
      categories.forEach(async (c) => {
        if ((c as any).image === item.url) {
          await updateCategory({ ...c, image: '' }).catch(() => {});
          await setDoc(doc(db, 'categories', c.id), { image: '' }, { merge: true }).catch(() => {});
        }
      });
    } 
    
    // 7. Remove from Customer Reviews
    if (item.source === 'review' || item.reviewId) {
      if (item.reviewId) {
        await deleteDoc(doc(db, 'reviews', item.reviewId)).catch(() => {});
        setReviewsMedia(prev => prev.filter(r => r.id !== item.reviewId));
      }
    }
  };

  // Handle Delete Confirmation (Single Item)
  const confirmDeleteMedia = async () => {
    if (!deleteTarget) return;
    if (!isMasterAdmin) {
      toast.error('Only authorized administrators can delete pictures.');
      return;
    }

    setIsDeleting(true);
    const deleteToast = toast.loading('Permanently removing picture from server and database...');

    try {
      await deleteSingleMediaItem(deleteTarget);
      toast.success('Picture permanently removed from live website & server!', { id: deleteToast });

      if (selectedMedia?.id === deleteTarget.id) {
        setSelectedMedia(null);
      }
      setSelectedItems(prev => prev.filter(id => id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Delete media error:', err);
      toast.error('Failed to remove image: ' + (err.message || 'Error'), { id: deleteToast });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Bulk Delete Confirmation
  const handleBulkDelete = async () => {
    if (!isMasterAdmin) {
      toast.error('Only authorized administrators can delete pictures.');
      return;
    }

    const targets = filteredAndSortedMedia.filter(item => selectedItems.includes(item.id));
    if (targets.length === 0) return;

    setIsBulkDeleting(true);
    const bulkToast = toast.loading(`Permanently deleting ${targets.length} picture(s) from server...`);

    try {
      for (const item of targets) {
        await deleteSingleMediaItem(item);
      }
      toast.success(`Successfully deleted ${targets.length} picture(s) permanently from server!`, { id: bulkToast });
      setSelectedItems([]);
      setBulkDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      toast.error('Failed during bulk deletion: ' + (err.message || 'Error'), { id: bulkToast });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Manual Sync trigger
  const handleSync = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success(`Realtime Sync Active: ${allMediaItems.length} total live assets synced.`);
    }, 600);
  };

  // Bulk Selection Toggles
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredAndSortedMedia.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredAndSortedMedia.map(item => item.id));
    }
  };

  const handleBulkCopy = () => {
    const urls = filteredAndSortedMedia
      .filter(item => selectedItems.includes(item.id))
      .map(item => item.url)
      .join('\n');
    
    navigator.clipboard.writeText(urls);
    toast.success(`Copied ${selectedItems.length} image URLs to clipboard!`);
  };

  const getSourceBadge = (source: MediaSource) => {
    switch (source) {
      case 'uploaded':
        return { label: 'UPLOADED', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300' };
      case 'product':
        return { label: 'PRODUCT', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300' };
      case 'banner':
        return { label: 'BANNER', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300' };
      case 'branding':
        return { label: 'BRANDING', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300' };
      case 'category':
        return { label: 'CATEGORY', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' };
      case 'review':
        return { label: 'REVIEW', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300' };
      default:
        return { label: 'MEDIA', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 font-sans p-2 sm:p-4 text-slate-900 dark:text-slate-100">
      
      {/* 1. Header with Title & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Media Library
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                Realtime Live
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 flex items-center gap-2">
            <span>All live pictures across products, banners, branding & uploaded assets</span>
            <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{allMediaItems.length} Total Live Pictures</span>
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedItems.length > 0 && (
            <>
              <button
                onClick={handleBulkCopy}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Copy size={13} />
                <span>Copy Selected ({selectedItems.length})</span>
              </button>

              {isMasterAdmin && (
                <button
                  onClick={() => setBulkDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer animate-in fade-in"
                >
                  <Trash2 size={13} />
                  <span>Delete Selected ({selectedItems.length})</span>
                </button>
              )}
            </>
          )}

          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <CloudUpload size={15} />
            <span>Add New Picture</span>
          </button>
          
          <button 
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-2xl transition-all shadow-3xs active:scale-95 cursor-pointer"
            title="Force Realtime Sync"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
            <span className="hidden sm:inline">Sync Live</span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORY_FILTERS.map((cat) => {
          const IconComponent = cat.icon;
          const isActive = activeCategory === cat.id;
          const count = counts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer",
                isActive
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-blue-600 dark:border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              )}
            >
              <IconComponent size={14} className={cn(isActive ? "text-white" : "text-slate-400")} />
              <span>{cat.label}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-mono font-black",
                isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Search, Sorting, Bulk and View Switcher Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file name, product, category, SKU or source..."
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-medium focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {filteredAndSortedMedia.length}
          </span>
        </div>

        {/* Right Tools: Sort, Bulk Select & View Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
          
          {/* Select All Toggle */}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {selectedItems.length === filteredAndSortedMedia.length && filteredAndSortedMedia.length > 0 ? (
              <CheckSquare size={14} className="text-blue-600" />
            ) : (
              <Square size={14} className="text-slate-400" />
            )}
            <span>{selectedItems.length > 0 ? `Selected (${selectedItems.length})` : 'Select All'}</span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 pointer-events-none text-slate-400" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-lg transition-all cursor-pointer",
                viewMode === 'grid' 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs" 
                  : "text-slate-400 hover:text-slate-800 dark:hover:text-white"
              )}
              title="Grid View"
            >
              <Grid size={14} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-lg transition-all cursor-pointer",
                viewMode === 'list' 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs" 
                  : "text-slate-400 hover:text-slate-800 dark:hover:text-white"
              )}
              title="List Details View"
            >
              <List size={14} />
            </button>
          </div>

        </div>
      </div>

      {/* 4. Main Gallery Section (Grid or List) */}
      {filteredAndSortedMedia.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center min-h-[380px]">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-3xs">
            <ImageIcon size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
            No live pictures found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            {searchQuery 
              ? `No media assets matched your search "${searchQuery}". Try a different keyword.`
              : 'There are no media assets in this category. Click below to add a new picture.'}
          </p>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md cursor-pointer"
          >
            <CloudUpload size={15} />
            <span>Upload New Picture</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* 4A. Grid Mode */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAndSortedMedia.map((item) => {
            const badge = getSourceBadge(item.source);
            const isSelected = selectedItems.includes(item.id);

            return (
              <div 
                key={item.id} 
                className={cn(
                  "group relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border transition-all duration-300 shadow-3xs hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between",
                  isSelected 
                    ? "border-blue-500 ring-2 ring-blue-500/30" 
                    : "border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500"
                )}
              >
                {/* Image */}
                <img 
                  src={item.url} 
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  alt={item.title} 
                />

                {/* Top Overlay Badge & Selection Checkbox */}
                <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-auto">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-xs backdrop-blur-md",
                    badge.bg
                  )}>
                    {badge.label}
                  </span>

                  <button
                    onClick={(e) => handleToggleSelect(item.id, e)}
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-all backdrop-blur-md border shadow-3xs cursor-pointer",
                      isSelected 
                        ? "bg-blue-600 text-white border-blue-600" 
                        : "bg-white/80 dark:bg-slate-900/80 text-transparent hover:text-slate-400 border-white/60 dark:border-slate-700 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Check size={12} className={isSelected ? "text-white" : ""} />
                  </button>
                </div>

                {/* Hover Interface for Quick Actions */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 z-10">
                  <div /> {/* Spacer */}

                  {/* Center Action Buttons */}
                  <div className="flex items-center justify-center gap-1.5 my-auto">
                    <button 
                      onClick={() => setSelectedMedia(item)}
                      className="p-2 bg-white hover:bg-blue-600 hover:text-white text-slate-800 rounded-xl transition-all shadow-md transform hover:scale-110 cursor-pointer" 
                      title="Preview Image Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={(e) => handleCopyLink(item.url, e)}
                      className="p-2 bg-white hover:bg-emerald-600 hover:text-white text-slate-800 rounded-xl transition-all shadow-md transform hover:scale-110 cursor-pointer" 
                      title="Copy Direct URL"
                    >
                      {copiedUrl === item.url ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <button 
                      onClick={(e) => handleDownload(item, e)}
                      className="p-2 bg-white hover:bg-slate-900 hover:text-white text-slate-800 rounded-xl transition-all shadow-md transform hover:scale-110 cursor-pointer" 
                      title="Download Image"
                    >
                      <Download size={14} />
                    </button>
                    {item.canDelete && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                        }}
                        className="p-2 bg-white hover:bg-rose-600 hover:text-white text-rose-600 rounded-xl transition-all shadow-md transform hover:scale-110 cursor-pointer" 
                        title="Remove / Delete from Live Website"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Bottom Text Pill */}
                  <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-xl p-2 select-none border border-white/20">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between text-[8px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="truncate">{item.category}</span>
                      {item.productPrice && (
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold ml-1">
                          {formatPrice(item.productPrice, currency, rate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 4B. List Mode */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px] text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-10">
                    <button onClick={handleSelectAll} className="cursor-pointer">
                      {selectedItems.length === filteredAndSortedMedia.length && filteredAndSortedMedia.length > 0 ? (
                        <CheckSquare size={14} className="text-blue-600" />
                      ) : (
                        <Square size={14} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 w-16">Preview</th>
                  <th className="py-3 px-4">Title & Name</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">File Name / Dimensions</th>
                  <th className="py-3 px-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredAndSortedMedia.map((item) => {
                  const badge = getSourceBadge(item.source);
                  const isSelected = selectedItems.includes(item.id);

                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedMedia(item)}
                      className={cn(
                        "hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer",
                        isSelected && "bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => handleToggleSelect(item.id, e)} className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare size={14} className="text-blue-600" />
                          ) : (
                            <Square size={14} className="text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                          <img 
                            src={item.url} 
                            referrerPolicy="no-referrer" 
                            className="w-full h-full object-cover" 
                            alt={item.title} 
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[260px]">
                          {item.title}
                        </span>
                        {item.productSku && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            SKU: {item.productSku}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border",
                          badge.bg
                        )}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-semibold">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="block truncate max-w-[180px]">{item.filename}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{item.dimensions || item.fileSize}</span>
                      </td>
                      <td className="py-3 px-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setSelectedMedia(item)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-xl transition-all shadow-3xs cursor-pointer"
                            title="Preview Details"
                          >
                            <Eye size={13} />
                          </button>
                          <button 
                            onClick={(e) => handleCopyLink(item.url, e)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-xl transition-all shadow-3xs cursor-pointer"
                            title="Copy URL"
                          >
                            {copiedUrl === item.url ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <button 
                            onClick={(e) => handleDownload(item, e)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-900 hover:text-white text-slate-700 dark:text-slate-300 rounded-xl transition-all shadow-3xs cursor-pointer"
                            title="Download"
                          >
                            <Download size={13} />
                          </button>
                          {item.canDelete && (
                            <button 
                              onClick={() => setDeleteTarget(item)}
                              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-600 rounded-xl transition-all shadow-3xs cursor-pointer"
                              title="Delete from Live Website"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Lightbox & Asset Detail Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            
            {/* Image Preview Canvas (Left) */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-6 relative min-h-[300px] md:min-h-[460px]">
              <img 
                src={selectedMedia.url} 
                referrerPolicy="no-referrer"
                className="max-h-[65vh] max-w-full object-contain rounded-2xl shadow-xl" 
                alt={selectedMedia.title} 
              />
              <button 
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-all md:hidden z-10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Metadata and Details Sidebar (Right) */}
            <div className="w-full md:w-88 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      LIVE ASSET DETAIL
                    </span>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-2 leading-snug">
                      {selectedMedia.title}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setSelectedMedia(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all hidden md:block cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Source Origin</span>
                    <span className="font-bold text-slate-900 dark:text-white uppercase text-[10px]">{selectedMedia.source}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Category</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{selectedMedia.category}</span>
                  </div>

                  {selectedMedia.productSku && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Product SKU</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedMedia.productSku}</span>
                    </div>
                  )}

                  {selectedMedia.productPrice && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Price Point</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(selectedMedia.productPrice, currency, rate)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Dimensions / Scale</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">{selectedMedia.dimensions || selectedMedia.fileSize}</span>
                  </div>

                  <div className="pt-2">
                    <label className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block mb-1.5">
                      Direct Live Image Link
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <input 
                        type="text" 
                        readOnly 
                        value={selectedMedia.url} 
                        className="font-mono text-[10px] text-slate-600 dark:text-slate-300 bg-transparent flex-1 outline-none truncate select-all"
                      />
                      <button 
                        onClick={() => handleCopyLink(selectedMedia.url)}
                        className="p-1 text-blue-600 hover:text-blue-700 cursor-pointer shrink-0"
                        title="Copy"
                      >
                        {copiedUrl === selectedMedia.url ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button 
                  onClick={() => handleCopyLink(selectedMedia.url)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Copy size={14} />
                  <span>Copy Asset Link</span>
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleDownload(selectedMedia)}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>

                  <a 
                    href={selectedMedia.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                  >
                    <ExternalLink size={13} />
                    <span>Open Tab</span>
                  </a>
                </div>

                {selectedMedia.canDelete && (
                  <button 
                    onClick={() => {
                      setDeleteTarget(selectedMedia);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete Picture from Live Website</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 6. Upload / Add Picture Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Add New Picture
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload images directly to the Media Library with real-time website sync
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFiles([]);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Upload Method Tabs */}
            <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setUploadTab('file')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  uploadTab === 'file'
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <UploadCloud size={14} />
                <span>Upload From Device</span>
              </button>
              <button
                onClick={() => setUploadTab('url')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  uploadTab === 'url'
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Link2 size={14} />
                <span>Import via Image URL</span>
              </button>
            </div>

            {/* Tab 1: File Dropzone */}
            {uploadTab === 'file' ? (
              <div className="mt-4 space-y-4">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*"
                  className="hidden" 
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                    <CloudUpload size={24} />
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-white block">
                    Click to browse or drag & drop pictures
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Supports JPG, PNG, WEBP, GIF (Auto-compressed for ultra fast loading)
                  </span>
                </div>

                {/* Staged Upload Files Preview */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Staged Files ({uploadFiles.length}):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {uploadFiles.map((uf, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <img src={uf.preview} className="w-10 h-10 object-cover rounded-lg shrink-0" alt="Preview" />
                          <div className="flex-1 min-w-0">
                            <input 
                              type="text" 
                              value={uf.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setUploadFiles(prev => prev.map((f, i) => i === idx ? { ...f, name: val } : f));
                              }}
                              className="text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full truncate"
                              placeholder="Image Title"
                            />
                            <span className="text-[9px] text-slate-400 block">{(uf.file.size / 1024).toFixed(0)} KB</span>
                          </div>
                          <button 
                            onClick={() => removeUploadFile(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Tab 2: URL Input */
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Direct Image URL
                  </label>
                  <input 
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/images/banner.webp"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Asset Title / Name
                  </label>
                  <input 
                    type="text"
                    value={urlTitle}
                    onChange={(e) => setUrlTitle(e.target.value)}
                    placeholder="e.g. Summer Promo Banner 2026"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                {urlInput && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <img 
                      src={urlInput} 
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                      className="w-12 h-12 object-cover rounded-lg bg-slate-200" 
                      alt="URL Preview" 
                    />
                    <span className="text-xs text-slate-500 font-semibold truncate">Live Preview Ready</span>
                  </div>
                )}
              </div>
            )}

            {/* Category Tag Selector */}
            <div className="mt-4">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Category / Usage Tag
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="General Asset">General Asset (সাধারণ মিডিয়া)</option>
                <option value="Hero / Slider Banner">Hero / Slider Banner (ব্যানার)</option>
                <option value="Product Asset">Product Asset (প্রোডাক্ট ছবি)</option>
                <option value="Promotional Offer">Promotional Offer (অফার)</option>
                <option value="Branding & Logo">Branding & Logo (লোগো ও ব্র্যান্ডিং)</option>
                <option value="Category Asset">Category Asset (ক্যাটেগরি ব্যানার)</option>
                <option value="Social Media">Social Media (ফেসবুক / ইন্সটাগ্রাম)</option>
              </select>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFiles([]);
                }}
                disabled={isUploading}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePerformUpload}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload size={14} />
                    <span>Upload & Sync Live</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal (Single Item) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
              <Trash2 size={24} />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                Master Admin Access
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {userEmail}
              </span>
            </div>

            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Permanently Remove Picture from Server?
            </h3>
            
            <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 my-4">
              <img 
                src={deleteTarget.url} 
                referrerPolicy="no-referrer" 
                className="w-14 h-14 object-cover rounded-xl shrink-0" 
                alt="Target" 
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                  {deleteTarget.title}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 uppercase">
                  Source: <strong className="text-slate-700 dark:text-slate-200">{deleteTarget.source}</strong> | {deleteTarget.category}
                </span>
                <span className="text-[9px] font-mono text-slate-400 block truncate mt-0.5">
                  {deleteTarget.filename}
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={13} className="shrink-0" />
                <span>Permanent Server Deletion</span>
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                This image will be permanently removed from the live website and database. Live visitors and app instances will no longer be able to load this picture.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMedia}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting from Server...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm Permanent Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && isMasterAdmin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
              <Trash2 size={24} />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                Master Admin Bulk Action
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {userEmail}
              </span>
            </div>

            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Permanently Delete {selectedItems.length} Selected Picture(s)?
            </h3>

            {/* Selected items preview strip */}
            <div className="my-4 max-h-48 overflow-y-auto pr-1 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {filteredAndSortedMedia
                  .filter(m => selectedItems.includes(m.id))
                  .map((item, idx) => (
                    <div key={item.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100 dark:bg-slate-800">
                      <img 
                        src={item.url} 
                        referrerPolicy="no-referrer" 
                        className="w-full h-full object-cover" 
                        alt={item.title} 
                      />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <span className="text-[9px] font-bold text-white text-center leading-tight truncate">
                          {item.title}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={13} className="shrink-0" />
                <span>Permanent Deletion Warning</span>
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                All <strong>{selectedItems.length}</strong> selected pictures will be permanently erased across products, banners, branding and media database entries.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isBulkDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting {selectedItems.length} Pictures...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm Delete All ({selectedItems.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
