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
  poloBannerUrl: string;
  comboOfferBannerUrl: string;
  showShowcase: boolean;
  categoryImages: Record<string, string>;
  
  // Design properties
  showAnnouncementBar: boolean;
  announcementMessage: string;
  showCountdownBanner: boolean;
  showHeroBanner: boolean;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
  shippingFreeAfter: number;
  primaryDeliveryDistrict: string;
  aboutText: string;

  setLogoUrl: (url: string) => void;
  setSizeChartUrl: (url: string) => void;
  setCollectionsBannerUrl: (url: string) => void;
  setHeroBannerUrl: (url: string) => void;
  setFeatureBannerUrl: (url: string) => void;
  setPoloBannerUrl: (url: string) => void;
  setComboOfferBannerUrl: (url: string) => void;
  setShowShowcase: (show: boolean) => void;
  setCategoryImageUrl: (category: string, url: string) => void;

  // Setters for design properties
  setShowAnnouncementBar: (show: boolean) => void;
  setAnnouncementMessage: (msg: string) => void;
  setShowCountdownBanner: (show: boolean) => void;
  setShowHeroBanner: (show: boolean) => void;
  setFacebookUrl: (url: string) => void;
  setInstagramUrl: (url: string) => void;
  setYoutubeUrl: (url: string) => void;
  setTiktokUrl: (url: string) => void;
  setShippingInsideDhaka: (fee: number) => void;
  setShippingOutsideDhaka: (fee: number) => void;
  setShippingFreeAfter: (val: number) => void;
  setPrimaryDeliveryDistrict: (val: string) => void;
  setAboutText: (text: string) => void;
}

const DEFAULT_LOGO = "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=500&auto=format";
const DEFAULT_SIZE_CHART = "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1000";
const DEFAULT_COLLECTIONS_BANNER = "https://images.unsplash.com/photo-1441991271612-42177c385b00?q=80&w=2000&auto=format";
const DEFAULT_HERO_BANNER = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000&auto=format";
const DEFAULT_FEATURE_BANNER = "https://images.unsplash.com/photo-1563124803-db51591028f1?q=80&w=2000&auto=format";
const DEFAULT_POLO_BANNER = "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=2000&auto=format";
const DEFAULT_COMBO_OFFER_BANNER = "https://storage.googleapis.com/genai-studio-artifacts-storage/1600-tl-combo-offer-image.png";

const DEFAULT_ANNOUNCEMENT_MSG = "আজকের অফার ফরমাল প্যান্ট ৩ পিস অর্ডার করলে ডেলিভারি চার্জ ফ্রি";
const DEFAULT_ABOUT_TEXT = "Premium minimalist fashion for the modern individual.";

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

  const [poloBannerUrl, setPoloBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return JSON.parse(cached).poloBannerUrl || DEFAULT_POLO_BANNER;
      } catch (e) { return DEFAULT_POLO_BANNER; }
    }
    return DEFAULT_POLO_BANNER;
  });

  const [comboOfferBannerUrl, setComboOfferBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return JSON.parse(cached).comboOfferBannerUrl || DEFAULT_COMBO_OFFER_BANNER;
      } catch (e) { return DEFAULT_COMBO_OFFER_BANNER; }
    }
    return DEFAULT_COMBO_OFFER_BANNER;
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
    const cached = localStorage.getItem('eleganbd_category_images_map');
    return cached ? JSON.parse(cached) : {};
  });

  // New design properties states
  const [showAnnouncementBar, setShowAnnouncementBarState] = useState<boolean>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).showAnnouncementBar;
        return val !== undefined ? val : false;
      } catch (e) { return false; }
    }
    return false;
  });

  const [announcementMessage, setAnnouncementMessageState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).announcementMessage || DEFAULT_ANNOUNCEMENT_MSG;
      } catch (e) { return DEFAULT_ANNOUNCEMENT_MSG; }
    }
    return DEFAULT_ANNOUNCEMENT_MSG;
  });

  const [showCountdownBanner, setShowCountdownBannerState] = useState<boolean>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).showCountdownBanner;
        return val !== undefined ? val : false;
      } catch (e) { return false; }
    }
    return false;
  });

  const [showHeroBanner, setShowHeroBannerState] = useState<boolean>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).showHeroBanner;
        return val !== undefined ? val : false;
      } catch (e) { return false; }
    }
    return false;
  });

  const [facebookUrl, setFacebookUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).facebookUrl || '';
      } catch (e) { return ''; }
    }
    return '';
  });

  const [instagramUrl, setInstagramUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).instagramUrl || '';
      } catch (e) { return ''; }
    }
    return '';
  });

  const [youtubeUrl, setYoutubeUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).youtubeUrl || '';
      } catch (e) { return ''; }
    }
    return '';
  });

  const [tiktokUrl, setTiktokUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).tiktokUrl || '';
      } catch (e) { return ''; }
    }
    return '';
  });

  const [shippingInsideDhaka, setShippingInsideDhakaState] = useState<number>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).shippingInsideDhaka;
        return val !== undefined ? Number(val) : 80;
      } catch (e) { return 80; }
    }
    return 80;
  });

  const [shippingOutsideDhaka, setShippingOutsideDhakaState] = useState<number>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).shippingOutsideDhaka;
        return val !== undefined ? Number(val) : 130;
      } catch (e) { return 130; }
    }
    return 130;
  });

  const [shippingFreeAfter, setShippingFreeAfterState] = useState<number>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).shippingFreeAfter;
        return val !== undefined ? Number(val) : 0;
      } catch (e) { return 0; }
    }
    return 0;
  });

  const [primaryDeliveryDistrict, setPrimaryDeliveryDistrictState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).primaryDeliveryDistrict || '';
      } catch (e) { return ''; }
    }
    return '';
  });

  const [aboutText, setAboutTextState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).aboutText || DEFAULT_ABOUT_TEXT;
      } catch (e) { return DEFAULT_ABOUT_TEXT; }
    }
    return DEFAULT_ABOUT_TEXT;
  });

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        // 1. Fetch Branding Config
        const brandingRef = doc(db, 'config', 'branding');
        const brandingSnap = await getDoc(brandingRef);
        if (brandingSnap.exists()) {
          const data = brandingSnap.data();
          if (data.logoUrl) setLogoUrlState(data.logoUrl);
          if (data.sizeChartUrl) setSizeChartUrlState(data.sizeChartUrl);
          if (data.showShowcase !== undefined) setShowShowcaseState(data.showShowcase);
          
          if (data.showAnnouncementBar !== undefined) setShowAnnouncementBarState(data.showAnnouncementBar);
          if (data.announcementMessage !== undefined) setAnnouncementMessageState(data.announcementMessage);
          if (data.showCountdownBanner !== undefined) setShowCountdownBannerState(data.showCountdownBanner);
          if (data.showHeroBanner !== undefined) setShowHeroBannerState(data.showHeroBanner);
          if (data.facebookUrl !== undefined) setFacebookUrlState(data.facebookUrl);
          if (data.instagramUrl !== undefined) setInstagramUrlState(data.instagramUrl);
          if (data.youtubeUrl !== undefined) setYoutubeUrlState(data.youtubeUrl);
          if (data.tiktokUrl !== undefined) setTiktokUrlState(data.tiktokUrl);
          if (data.shippingInsideDhaka !== undefined) setShippingInsideDhakaState(Number(data.shippingInsideDhaka));
          if (data.shippingOutsideDhaka !== undefined) setShippingOutsideDhakaState(Number(data.shippingOutsideDhaka));
          if (data.shippingFreeAfter !== undefined) setShippingFreeAfterState(Number(data.shippingFreeAfter));
          if (data.primaryDeliveryDistrict !== undefined) setPrimaryDeliveryDistrictState(data.primaryDeliveryDistrict);
          if (data.aboutText !== undefined) setAboutTextState(data.aboutText);

          const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
          localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, ...data }));
        }

        // 2. Fetch Banners
        const bannerKeys = ['hero', 'collections', 'feature', 'polo', 'combo_offer'];
        for (const key of bannerKeys) {
            const snap = await getDoc(doc(db, 'config', `banner_${key}`));
            if (snap.exists()) {
                const url = snap.data().url;
                const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
                localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, [`${key}BannerUrl`]: url }));
                if (key === 'hero') setHeroBannerUrlState(url);
                if (key === 'collections') setCollectionsBannerUrlState(url);
                if (key === 'feature') setFeatureBannerUrlState(url);
                if (key === 'polo') setPoloBannerUrlState(url);
                if (key === 'combo_offer') setComboOfferBannerUrlState(url);
            }
        }

        // 3. Fetch Category Images
        const catRef = doc(db, 'config', 'categories');
        const catSnap = await getDoc(catRef);
        if (catSnap.exists()) {
          const images = catSnap.data().images || {};
          setCategoryImagesState(images);
          localStorage.setItem('eleganbd_category_images_map', JSON.stringify(images));
        }
      } catch (err) {
        console.error("Branding sync error:", err);
      }
    };

    fetchBranding();
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

  const setPoloBannerUrl = (url: string) => {
    setPoloBannerUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
    localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, poloBannerUrl: url }));
    updateFirestore('banner_polo', { url });
  };

  const setComboOfferBannerUrl = (url: string) => {
    setComboOfferBannerUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
    localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, comboOfferBannerUrl: url }));
    updateFirestore('banner_combo_offer', { url });
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
    localStorage.setItem('eleganbd_category_images_map', JSON.stringify(newImages));
    updateFirestore('categories', { images: newImages });
  };

  const setShowAnnouncementBar = (show: boolean) => {
    setShowAnnouncementBarState(show);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, showAnnouncementBar: show }));
    updateFirestore('branding', { showAnnouncementBar: show });
  };

  const setAnnouncementMessage = (msg: string) => {
    setAnnouncementMessageState(msg);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, announcementMessage: msg }));
    updateFirestore('branding', { announcementMessage: msg });
  };

  const setShowCountdownBanner = (show: boolean) => {
    setShowCountdownBannerState(show);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, showCountdownBanner: show }));
    updateFirestore('branding', { showCountdownBanner: show });
  };

  const setShowHeroBanner = (show: boolean) => {
    setShowHeroBannerState(show);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, showHeroBanner: show }));
    updateFirestore('branding', { showHeroBanner: show });
  };

  const setFacebookUrl = (url: string) => {
    setFacebookUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, facebookUrl: url }));
    updateFirestore('branding', { facebookUrl: url });
  };

  const setInstagramUrl = (url: string) => {
    setInstagramUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, instagramUrl: url }));
    updateFirestore('branding', { instagramUrl: url });
  };

  const setYoutubeUrl = (url: string) => {
    setYoutubeUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, youtubeUrl: url }));
    updateFirestore('branding', { youtubeUrl: url });
  };

  const setTiktokUrl = (url: string) => {
    setTiktokUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, tiktokUrl: url }));
    updateFirestore('branding', { tiktokUrl: url });
  };

  const setShippingInsideDhaka = (fee: number) => {
    setShippingInsideDhakaState(fee);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, shippingInsideDhaka: fee }));
    updateFirestore('branding', { shippingInsideDhaka: fee });
  };

  const setShippingOutsideDhaka = (fee: number) => {
    setShippingOutsideDhakaState(fee);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, shippingOutsideDhaka: fee }));
    updateFirestore('branding', { shippingOutsideDhaka: fee });
  };

  const setShippingFreeAfter = (val: number) => {
    setShippingFreeAfterState(val);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, shippingFreeAfter: val }));
    updateFirestore('branding', { shippingFreeAfter: val });
  };

  const setPrimaryDeliveryDistrict = (val: string) => {
    setPrimaryDeliveryDistrictState(val);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, primaryDeliveryDistrict: val }));
    updateFirestore('branding', { primaryDeliveryDistrict: val });
  };

  const setAboutText = (text: string) => {
    setAboutTextState(text);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, aboutText: text }));
    updateFirestore('branding', { aboutText: text });
  };

  return (
    <BrandingContext.Provider value={{ 
      logoUrl, sizeChartUrl, collectionsBannerUrl, heroBannerUrl, featureBannerUrl, poloBannerUrl, comboOfferBannerUrl, showShowcase, categoryImages, 
      showAnnouncementBar, announcementMessage, showCountdownBanner, showHeroBanner, facebookUrl, instagramUrl, youtubeUrl, tiktokUrl, shippingInsideDhaka, shippingOutsideDhaka, shippingFreeAfter, primaryDeliveryDistrict, aboutText,
      setLogoUrl, setSizeChartUrl, setCollectionsBannerUrl, setHeroBannerUrl, setFeatureBannerUrl, setPoloBannerUrl, setComboOfferBannerUrl, setShowShowcase, setCategoryImageUrl,
      setShowAnnouncementBar, setAnnouncementMessage, setShowCountdownBanner, setShowHeroBanner, setFacebookUrl, setInstagramUrl, setYoutubeUrl, setTiktokUrl, setShippingInsideDhaka, setShippingOutsideDhaka, setShippingFreeAfter, setPrimaryDeliveryDistrict, setAboutText
    }}>
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
