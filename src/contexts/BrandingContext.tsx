/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface BrandingContextType {
  logoUrl: string;
  sizeChartUrl: string;
  collectionsBannerUrl: string;
  heroBannerUrl: string;
  featureBannerUrl: string;
  showShowcase: boolean;
  categoryImages: Record<string, string>;
  setLogoUrl: (url: string) => void;
  setSizeChartUrl: (url: string) => void;
  setCollectionsBannerUrl: (url: string) => void;
  setHeroBannerUrl: (url: string) => void;
  setFeatureBannerUrl: (url: string) => void;
  setShowShowcase: (show: boolean) => void;
  setCategoryImageUrl: (category: string, url: string) => void;
}

const DEFAULT_LOGO = "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=500&auto=format";
const DEFAULT_SIZE_CHART = "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1000";
const DEFAULT_COLLECTIONS_BANNER = "https://images.unsplash.com/photo-1441991271612-42177c385b00?q=80&w=2000&auto=format";
const DEFAULT_HERO_BANNER = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000&auto=format";
const DEFAULT_FEATURE_BANNER = "https://images.unsplash.com/photo-1563124803-db51591028f1?q=80&w=2000&auto=format";

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logoUrl, setLogoUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).logoUrl || DEFAULT_LOGO;
      } catch (e) { return DEFAULT_LOGO; }
    }
    return DEFAULT_LOGO;
  });
  
  const [sizeChartUrl, setSizeChartUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).sizeChartUrl || DEFAULT_SIZE_CHART;
      } catch (e) { return DEFAULT_SIZE_CHART; }
    }
    return DEFAULT_SIZE_CHART;
  });

  const [collectionsBannerUrl, setCollectionsBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return JSON.parse(cached).collectionsBannerUrl || DEFAULT_COLLECTIONS_BANNER;
      } catch (e) { return DEFAULT_COLLECTIONS_BANNER; }
    }
    return DEFAULT_COLLECTIONS_BANNER;
  });

  const [heroBannerUrl, setHeroBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return JSON.parse(cached).heroBannerUrl || DEFAULT_HERO_BANNER;
      } catch (e) { return DEFAULT_HERO_BANNER; }
    }
    return DEFAULT_HERO_BANNER;
  });

  const [featureBannerUrl, setFeatureBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return JSON.parse(cached).featureBannerUrl || DEFAULT_FEATURE_BANNER;
      } catch (e) { return DEFAULT_FEATURE_BANNER; }
    }
    return DEFAULT_FEATURE_BANNER;
  });

  const [showShowcase, setShowShowcaseState] = useState<boolean>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).showShowcase;
        return val !== undefined ? val : true;
      } catch (e) { return true; }
    }
    return true;
  });

  const [categoryImages, setCategoryImagesState] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('eleganbd_categories');
    return cached ? JSON.parse(cached) : {};
  });

  useEffect(() => {
    // 1. Listen for Branding Config (Logo, Size Chart, etc)
    const brandingRef = doc(db, 'config', 'branding');
    const unsubBranding = onSnapshot(brandingRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.logoUrl) setLogoUrlState(data.logoUrl);
        if (data.sizeChartUrl) setSizeChartUrlState(data.sizeChartUrl);
        if (data.showShowcase !== undefined) setShowShowcaseState(data.showShowcase);
        
        // Update cache
        const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
        localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, ...data }));
      }
    }, (err) => {
      if (!err.message.includes('resource-exhausted')) console.error("Branding listener error:", err);
    });

    // 2. Listen for Large Banners
    const heroRef = doc(db, 'config', 'banner_hero');
    const unsubHero = onSnapshot(heroRef, (snap) => {
      if (snap.exists()) {
        const url = snap.data().url;
        setHeroBannerUrlState(url);
        const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
        localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, heroBannerUrl: url }));
      }
    });

    const collectionsRef = doc(db, 'config', 'banner_collections');
    const unsubCollections = onSnapshot(collectionsRef, (snap) => {
      if (snap.exists()) {
        const url = snap.data().url;
        setCollectionsBannerUrlState(url);
        const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
        localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, collectionsBannerUrl: url }));
      }
    });

    const featureRef = doc(db, 'config', 'banner_feature');
    const unsubFeature = onSnapshot(featureRef, (snap) => {
      if (snap.exists()) {
        const url = snap.data().url;
        setFeatureBannerUrlState(url);
        const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
        localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, featureBannerUrl: url }));
      }
    });

    // 3. Listen for Category Images
    const catRef = doc(db, 'config', 'categories');
    const unsubCats = onSnapshot(catRef, (snap) => {
      if (snap.exists()) {
        const images = snap.data().images || {};
        setCategoryImagesState(images);
        localStorage.setItem('eleganbd_categories', JSON.stringify(images));
      }
    }, (err) => {
        if (!err.message.includes('resource-exhausted')) console.error("Categories listener error:", err);
    });

    return () => {
      unsubBranding();
      unsubHero();
      unsubCollections();
      unsubFeature();
      unsubCats();
    };
  }, []);

  const updateFirestore = async (path: string, data: any) => {
    try {
      await setDoc(doc(db, 'config', path), data, { merge: true });
    } catch (e) {
      console.error(`Failed to update ${path} in firestore`, e);
      toast.error(`Update failed: ${e instanceof Error ? e.message : 'Unknown error'}. Image might be too large.`);
    }
  }

  const setLogoUrl = (url: string) => {
    setLogoUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, logoUrl: url }));
    updateFirestore('branding', { logoUrl: url });
  };

  const setSizeChartUrl = (url: string) => {
    setSizeChartUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, sizeChartUrl: url }));
    updateFirestore('branding', { sizeChartUrl: url });
  };

  const setCollectionsBannerUrl = (url: string) => {
    setCollectionsBannerUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
    localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, collectionsBannerUrl: url }));
    updateFirestore('banner_collections', { url });
  };

  const setHeroBannerUrl = (url: string) => {
    setHeroBannerUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
    localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, heroBannerUrl: url }));
    updateFirestore('banner_hero', { url });
  };

  const setFeatureBannerUrl = (url: string) => {
    setFeatureBannerUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
    localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, featureBannerUrl: url }));
    updateFirestore('banner_feature', { url });
  };

  const setShowShowcase = (show: boolean) => {
    setShowShowcaseState(show);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, showShowcase: show }));
    updateFirestore('branding', { showShowcase: show });
  };

  const setCategoryImageUrl = (category: string, url: string) => {
    const newImages = { ...categoryImages, [category]: url };
    setCategoryImagesState(newImages);
    localStorage.setItem('eleganbd_categories', JSON.stringify(newImages));
    updateFirestore('categories', { images: newImages });
  };

  return (
    <BrandingContext.Provider value={{ logoUrl, sizeChartUrl, collectionsBannerUrl, heroBannerUrl, featureBannerUrl, showShowcase, categoryImages, setLogoUrl, setSizeChartUrl, setCollectionsBannerUrl, setHeroBannerUrl, setFeatureBannerUrl, setShowShowcase, setCategoryImageUrl }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
