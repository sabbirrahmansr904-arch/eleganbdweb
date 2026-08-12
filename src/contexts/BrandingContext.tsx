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
  ceoPhotoUrl: string;
  collectionsBannerUrl: string;
  heroBannerUrl: string;
  heroBanner2Url: string;
  heroBanner3Url: string;
  subHeroBannerUrl: string;
  featureBannerUrl: string;
  poloBannerUrl: string;
  shirtBannerUrl: string;
  pantBannerUrl: string;
  comboOfferBannerUrl: string;
  showShowcase: boolean;
  categoryImages: Record<string, string>;
  
  // Design properties
  showAnnouncementBar: boolean;
  announcementMessage: string;
  showCountdownBanner: boolean;
  comboOfferTitle: string;
  comboOfferSubTitle: string;
  comboOfferDiscount: string;
  comboOfferHours: number;
  comboOfferMinutes: number;
  comboOfferSeconds: number;
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

  // Why Choose Elegan BD 5-Image Grid
  whyChooseImg1: string;
  whyChooseImg2: string;
  whyChooseImg3: string;
  whyChooseImg4: string;
  whyChooseImg5: string;
  whyChooseText1: string;
  whyChooseText2: string;
  whyChooseText3: string;
  whyChooseText4: string;
  whyChooseText5: string;

  setLogoUrl: (url: string) => void;
  setSizeChartUrl: (url: string) => void;
  setCeoPhotoUrl: (url: string) => void;
  setCollectionsBannerUrl: (url: string) => void;
  setHeroBannerUrl: (url: string) => void;
  setHeroBanner2Url: (url: string) => void;
  setHeroBanner3Url: (url: string) => void;
  setSubHeroBannerUrl: (url: string) => void;
  setFeatureBannerUrl: (url: string) => void;
  setPoloBannerUrl: (url: string) => void;
  setShirtBannerUrl: (url: string) => void;
  setPantBannerUrl: (url: string) => void;
  setComboOfferBannerUrl: (url: string) => void;
  setShowShowcase: (show: boolean) => void;
  setCategoryImageUrl: (category: string, url: string) => void;

  // Setters for design properties
  setShowAnnouncementBar: (show: boolean) => void;
  setAnnouncementMessage: (msg: string) => void;
  setShowCountdownBanner: (show: boolean) => void;
  setComboOfferTitle: (title: string) => void;
  setComboOfferSubTitle: (subTitle: string) => void;
  setComboOfferDiscount: (discount: string) => void;
  setComboOfferHours: (hours: number) => void;
  setComboOfferMinutes: (minutes: number) => void;
  setComboOfferSeconds: (seconds: number) => void;
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

  setWhyChooseImg1: (url: string) => void;
  setWhyChooseImg2: (url: string) => void;
  setWhyChooseImg3: (url: string) => void;
  setWhyChooseImg4: (url: string) => void;
  setWhyChooseImg5: (url: string) => void;
  setWhyChooseText1: (text: string) => void;
  setWhyChooseText2: (text: string) => void;
  setWhyChooseText3: (text: string) => void;
  setWhyChooseText4: (text: string) => void;
  setWhyChooseText5: (text: string) => void;
}

const DEFAULT_WHY_CHOOSE_IMG_1 = "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80";
const DEFAULT_WHY_CHOOSE_IMG_2 = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80";
const DEFAULT_WHY_CHOOSE_IMG_3 = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80";
const DEFAULT_WHY_CHOOSE_IMG_4 = "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?auto=format&fit=crop&w=800&q=80";
const DEFAULT_WHY_CHOOSE_IMG_5 = "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=800&q=80";

const DEFAULT_WHY_CHOOSE_TEXT_1 = "CRAFTED FOR COMFORT. DESIGNED FOR STYLE.";
const DEFAULT_WHY_CHOOSE_TEXT_2 = "STAY COOL. STAY STYLISH.";
const DEFAULT_WHY_CHOOSE_TEXT_3 = "LIGHTWEIGHT COMFORT FOR EVERY DAY.";
const DEFAULT_WHY_CHOOSE_TEXT_4 = "PREMIUM FABRIC. EFFORTLESS STYLE.";
const DEFAULT_WHY_CHOOSE_TEXT_5 = "ELEGANT CRAFTSMANSHIP FOR MEN.";

const cleanUrl = (url?: string) => {
  if (!url) return "/logo.png";
  if (url.includes('unsplash.com') || url.includes('genai-studio-artifacts-storage')) return "/logo.png";
  return url;
};

const DEFAULT_LOGO = "/logo.png";
const DEFAULT_SIZE_CHART = "";
const DEFAULT_COLLECTIONS_BANNER = "";
const DEFAULT_HERO_BANNER = "";
const DEFAULT_SUB_HERO_BANNER = "";
const DEFAULT_FEATURE_BANNER = "";
const DEFAULT_POLO_BANNER = "";
const DEFAULT_COMBO_OFFER_BANNER = "";

const DEFAULT_ANNOUNCEMENT_MSG = "🔥 Special Combo Deal: Buy 3 Shirts for Only ৳1,799";
const DEFAULT_ABOUT_TEXT = "Premium minimalist fashion for the modern individual.";
const DEFAULT_COMBO_TITLE = "নতুন অফিস উদ্বোধন উপলক্ষে অফিস ভিজিট কেনাকাটায় ১০% ফ্ল্যাট ছাড়!";
const DEFAULT_COMBO_SUBTITLE = "আমাদের নতুন অফিসে সরাসরি এসে যেকোনো কেনাকাটা করলেই উপভোগ করুন ১০% বিশেষ ফ্ল্যাট ডিসকাউন্ট।";
const DEFAULT_COMBO_DISCOUNT = "১০% ছাড় (অফিস ভিজিট)";

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logoUrl, setLogoUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).logoUrl);
      } catch (e) { return ""; }
    }
    return "";
  });
  
  const [sizeChartUrl, setSizeChartUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).sizeChartUrl);
      } catch (e) { return ""; }
    }
    return "";
  });

  const [ceoPhotoUrl, setCeoPhotoUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).ceoPhotoUrl || "";
      } catch (e) { return ""; }
    }
    return "";
  });

  const [collectionsBannerUrl, setCollectionsBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).collectionsBannerUrl);
      } catch (e) { return ""; }
    }
    return "";
  });

  const [heroBannerUrl, setHeroBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).heroBannerUrl);
      } catch (e) { return ""; }
    }
    return "";
  });

  const [heroBanner2Url, setHeroBanner2UrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).heroBanner2Url);
      } catch (e) { return ""; }
    }
    return "";
  });

  const [heroBanner3Url, setHeroBanner3UrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).heroBanner3Url);
      } catch (e) { return ""; }
    }
    return "";
  });

  const [subHeroBannerUrl, setSubHeroBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).subHeroBannerUrl);
      } catch (e) { return ""; }
    }
    return "";
  });

  const [featureBannerUrl, setFeatureBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).featureBannerUrl);
      } catch (e) { return ""; }
    }
    return "";
  });

  const [poloBannerUrl, setPoloBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).poloBannerUrl);
      } catch (e) { return ""; }
    }
    return "";
  });

  const [comboOfferBannerUrl, setComboOfferBannerUrlState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_banners_large');
    if (cached) {
      try {
        return cleanUrl(JSON.parse(cached).comboOfferBannerUrl);
      } catch (e) { return ""; }
    }
    return "";
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
        return val !== undefined ? val : true;
      } catch (e) { return true; }
    }
    return true;
  });

  const [comboOfferTitle, setComboOfferTitleState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).comboOfferTitle || DEFAULT_COMBO_TITLE;
      } catch (e) { return DEFAULT_COMBO_TITLE; }
    }
    return DEFAULT_COMBO_TITLE;
  });

  const [comboOfferSubTitle, setComboOfferSubTitleState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).comboOfferSubTitle || DEFAULT_COMBO_SUBTITLE;
      } catch (e) { return DEFAULT_COMBO_SUBTITLE; }
    }
    return DEFAULT_COMBO_SUBTITLE;
  });

  const [comboOfferDiscount, setComboOfferDiscountState] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        return JSON.parse(cached).comboOfferDiscount || DEFAULT_COMBO_DISCOUNT;
      } catch (e) { return DEFAULT_COMBO_DISCOUNT; }
    }
    return DEFAULT_COMBO_DISCOUNT;
  });

  const [comboOfferHours, setComboOfferHoursState] = useState<number>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).comboOfferHours;
        return val !== undefined ? Number(val) : 14;
      } catch (e) { return 14; }
    }
    return 14;
  });

  const [comboOfferMinutes, setComboOfferMinutesState] = useState<number>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).comboOfferMinutes;
        return val !== undefined ? Number(val) : 32;
      } catch (e) { return 32; }
    }
    return 32;
  });

  const [comboOfferSeconds, setComboOfferSecondsState] = useState<number>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).comboOfferSeconds;
        return val !== undefined ? Number(val) : 45;
      } catch (e) { return 45; }
    }
    return 45;
  });

  const [showHeroBanner, setShowHeroBannerState] = useState<boolean>(() => {
    const cached = localStorage.getItem('eleganbd_branding');
    if (cached) {
      try {
        const val = JSON.parse(cached).showHeroBanner;
        return val !== undefined ? val : true;
      } catch (e) { return true; }
    }
    return true;
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
        return val !== undefined ? Number(val) : 70;
      } catch (e) { return 70; }
    }
    return 70;
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

  // Why Choose 4 Images & Text states
  const [whyChooseImg1, setWhyChooseImg1State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).img1 || DEFAULT_WHY_CHOOSE_IMG_1; } catch (e) { return DEFAULT_WHY_CHOOSE_IMG_1; }
    }
    return DEFAULT_WHY_CHOOSE_IMG_1;
  });

  const [whyChooseImg2, setWhyChooseImg2State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).img2 || DEFAULT_WHY_CHOOSE_IMG_2; } catch (e) { return DEFAULT_WHY_CHOOSE_IMG_2; }
    }
    return DEFAULT_WHY_CHOOSE_IMG_2;
  });

  const [whyChooseImg3, setWhyChooseImg3State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).img3 || DEFAULT_WHY_CHOOSE_IMG_3; } catch (e) { return DEFAULT_WHY_CHOOSE_IMG_3; }
    }
    return DEFAULT_WHY_CHOOSE_IMG_3;
  });

  const [whyChooseImg4, setWhyChooseImg4State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).img4 || DEFAULT_WHY_CHOOSE_IMG_4; } catch (e) { return DEFAULT_WHY_CHOOSE_IMG_4; }
    }
    return DEFAULT_WHY_CHOOSE_IMG_4;
  });

  const [whyChooseImg5, setWhyChooseImg5State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).img5 || DEFAULT_WHY_CHOOSE_IMG_5; } catch (e) { return DEFAULT_WHY_CHOOSE_IMG_5; }
    }
    return DEFAULT_WHY_CHOOSE_IMG_5;
  });

  const [whyChooseText1, setWhyChooseText1State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).text1 ?? DEFAULT_WHY_CHOOSE_TEXT_1; } catch (e) { return DEFAULT_WHY_CHOOSE_TEXT_1; }
    }
    return DEFAULT_WHY_CHOOSE_TEXT_1;
  });

  const [whyChooseText2, setWhyChooseText2State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).text2 ?? DEFAULT_WHY_CHOOSE_TEXT_2; } catch (e) { return DEFAULT_WHY_CHOOSE_TEXT_2; }
    }
    return DEFAULT_WHY_CHOOSE_TEXT_2;
  });

  const [whyChooseText3, setWhyChooseText3State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).text3 ?? DEFAULT_WHY_CHOOSE_TEXT_3; } catch (e) { return DEFAULT_WHY_CHOOSE_TEXT_3; }
    }
    return DEFAULT_WHY_CHOOSE_TEXT_3;
  });

  const [whyChooseText4, setWhyChooseText4State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).text4 ?? DEFAULT_WHY_CHOOSE_TEXT_4; } catch (e) { return DEFAULT_WHY_CHOOSE_TEXT_4; }
    }
    return DEFAULT_WHY_CHOOSE_TEXT_4;
  });

  const [whyChooseText5, setWhyChooseText5State] = useState<string>(() => {
    const cached = localStorage.getItem('eleganbd_why_choose');
    if (cached) {
      try { return JSON.parse(cached).text5 ?? DEFAULT_WHY_CHOOSE_TEXT_5; } catch (e) { return DEFAULT_WHY_CHOOSE_TEXT_5; }
    }
    return DEFAULT_WHY_CHOOSE_TEXT_5;
  });

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        // 1. Fetch Branding Config
        const brandingRef = doc(db, 'config', 'branding');
        const brandingSnap = await getDoc(brandingRef);
        if (brandingSnap.exists()) {
          const data = brandingSnap.data();
          if (data.logoUrl) setLogoUrlState(cleanUrl(data.logoUrl));
          if (data.sizeChartUrl) setSizeChartUrlState(cleanUrl(data.sizeChartUrl));
          if (data.ceoPhotoUrl) setCeoPhotoUrlState(data.ceoPhotoUrl);
          if (data.showShowcase !== undefined) setShowShowcaseState(data.showShowcase);
          
          if (data.showAnnouncementBar !== undefined) setShowAnnouncementBarState(data.showAnnouncementBar);
          if (data.announcementMessage !== undefined) setAnnouncementMessageState(data.announcementMessage);
          if (data.showCountdownBanner !== undefined) setShowCountdownBannerState(data.showCountdownBanner);
          if (data.comboOfferTitle !== undefined) setComboOfferTitleState(data.comboOfferTitle);
          if (data.comboOfferSubTitle !== undefined) setComboOfferSubTitleState(data.comboOfferSubTitle);
          if (data.comboOfferDiscount !== undefined) setComboOfferDiscountState(data.comboOfferDiscount);
          if (data.comboOfferHours !== undefined) setComboOfferHoursState(Number(data.comboOfferHours));
          if (data.comboOfferMinutes !== undefined) setComboOfferMinutesState(Number(data.comboOfferMinutes));
          if (data.comboOfferSeconds !== undefined) setComboOfferSecondsState(Number(data.comboOfferSeconds));
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
        const bannerKeys = ['hero', 'hero_2', 'hero_3', 'sub_hero', 'collections', 'feature', 'polo', 'combo_offer'];
        for (const key of bannerKeys) {
            const snap = await getDoc(doc(db, 'config', `banner_${key}`));
            if (snap.exists()) {
                const url = cleanUrl(snap.data().url);
                const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
                const cacheKey = key === 'sub_hero' ? 'subHeroBannerUrl' : key === 'hero_2' ? 'heroBanner2Url' : key === 'hero_3' ? 'heroBanner3Url' : `${key}BannerUrl`;
                localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, [cacheKey]: url }));
                if (key === 'hero') setHeroBannerUrlState(url);
                if (key === 'hero_2') setHeroBanner2UrlState(url);
                if (key === 'hero_3') setHeroBanner3UrlState(url);
                if (key === 'sub_hero') setSubHeroBannerUrlState(url);
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

        // 4. Fetch Why Choose Grid Images & Text (from separate documents, fallback to single document)
        for (let i = 1; i <= 5; i++) {
          try {
            const itemRef = doc(db, 'config', `why_choose_${i}`);
            const itemSnap = await getDoc(itemRef);
            if (itemSnap.exists()) {
              const data = itemSnap.data();
              if (data.url || data.img) {
                const imgVal = data.url || data.img;
                if (i === 1) setWhyChooseImg1State(imgVal);
                if (i === 2) setWhyChooseImg2State(imgVal);
                if (i === 3) setWhyChooseImg3State(imgVal);
                if (i === 4) setWhyChooseImg4State(imgVal);
                if (i === 5) setWhyChooseImg5State(imgVal);
              }
              if (data.text !== undefined) {
                if (i === 1) setWhyChooseText1State(data.text);
                if (i === 2) setWhyChooseText2State(data.text);
                if (i === 3) setWhyChooseText3State(data.text);
                if (i === 4) setWhyChooseText4State(data.text);
                if (i === 5) setWhyChooseText5State(data.text);
              }
            }
          } catch (e) {
            console.warn(`Failed to fetch why_choose_${i}`, e);
          }
        }

        const whyChooseRef = doc(db, 'config', 'why_choose');
        try {
          const whyChooseSnap = await getDoc(whyChooseRef);
          if (whyChooseSnap.exists()) {
            const data = whyChooseSnap.data();
            if (data.img1) setWhyChooseImg1State(prev => prev || data.img1);
            if (data.img2) setWhyChooseImg2State(prev => prev || data.img2);
            if (data.img3) setWhyChooseImg3State(prev => prev || data.img3);
            if (data.img4) setWhyChooseImg4State(prev => prev || data.img4);
            if (data.img5) setWhyChooseImg5State(prev => prev || data.img5);
            if (data.text1 !== undefined) setWhyChooseText1State(prev => prev || data.text1);
            if (data.text2 !== undefined) setWhyChooseText2State(prev => prev || data.text2);
            if (data.text3 !== undefined) setWhyChooseText3State(prev => prev || data.text3);
            if (data.text4 !== undefined) setWhyChooseText4State(prev => prev || data.text4);
            if (data.text5 !== undefined) setWhyChooseText5State(prev => prev || data.text5);

            localStorage.setItem('eleganbd_why_choose', JSON.stringify(data));
          }
        } catch (e) {
          console.warn("Single why_choose fetch skipped", e);
        }
      } catch (err: any) {
        if (err?.message?.includes('Quota limit exceeded') || err?.message?.includes('resource-exhausted')) {
          console.warn("Branding sync using local cache (Firestore daily quota limit reached)");
        } else {
          console.error("Branding sync error:", err);
        }
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

  const setCeoPhotoUrl = (url: string) => {
    setCeoPhotoUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, ceoPhotoUrl: url }));
    updateFirestore('branding', { ceoPhotoUrl: url });
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

  const setHeroBanner2Url = (url: string) => {
    setHeroBanner2UrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
    localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, heroBanner2Url: url }));
    updateFirestore('banner_hero_2', { url });
  };

  const setHeroBanner3Url = (url: string) => {
    setHeroBanner3UrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
    localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, heroBanner3Url: url }));
    updateFirestore('banner_hero_3', { url });
  };

  const setSubHeroBannerUrl = (url: string) => {
    setSubHeroBannerUrlState(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_banners_large') || '{}');
    localStorage.setItem('eleganbd_banners_large', JSON.stringify({ ...cache, subHeroBannerUrl: url }));
    updateFirestore('banner_sub_hero', { url });
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

  const setComboOfferTitle = (title: string) => {
    setComboOfferTitleState(title);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, comboOfferTitle: title }));
    updateFirestore('branding', { comboOfferTitle: title });
  };

  const setComboOfferSubTitle = (subTitle: string) => {
    setComboOfferSubTitleState(subTitle);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, comboOfferSubTitle: subTitle }));
    updateFirestore('branding', { comboOfferSubTitle: subTitle });
  };

  const setComboOfferDiscount = (discount: string) => {
    setComboOfferDiscountState(discount);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, comboOfferDiscount: discount }));
    updateFirestore('branding', { comboOfferDiscount: discount });
  };

  const setComboOfferHours = (hours: number) => {
    setComboOfferHoursState(hours);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, comboOfferHours: hours }));
    updateFirestore('branding', { comboOfferHours: hours });
  };

  const setComboOfferMinutes = (minutes: number) => {
    setComboOfferMinutesState(minutes);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, comboOfferMinutes: minutes }));
    updateFirestore('branding', { comboOfferMinutes: minutes });
  };

  const setComboOfferSeconds = (seconds: number) => {
    setComboOfferSecondsState(seconds);
    const cache = JSON.parse(localStorage.getItem('eleganbd_branding') || '{}');
    localStorage.setItem('eleganbd_branding', JSON.stringify({ ...cache, comboOfferSeconds: seconds }));
    updateFirestore('branding', { comboOfferSeconds: seconds });
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

  const setWhyChooseImg1 = (url: string) => {
    setWhyChooseImg1State(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, img1: url };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_1', { url });
  };

  const setWhyChooseImg2 = (url: string) => {
    setWhyChooseImg2State(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, img2: url };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_2', { url });
  };

  const setWhyChooseImg3 = (url: string) => {
    setWhyChooseImg3State(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, img3: url };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_3', { url });
  };

  const setWhyChooseImg4 = (url: string) => {
    setWhyChooseImg4State(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, img4: url };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_4', { url });
  };

  const setWhyChooseImg5 = (url: string) => {
    setWhyChooseImg5State(url);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, img5: url };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_5', { url });
  };

  const setWhyChooseText1 = (text: string) => {
    setWhyChooseText1State(text);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, text1: text };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_1', { text });
  };

  const setWhyChooseText2 = (text: string) => {
    setWhyChooseText2State(text);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, text2: text };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_2', { text });
  };

  const setWhyChooseText3 = (text: string) => {
    setWhyChooseText3State(text);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, text3: text };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_3', { text });
  };

  const setWhyChooseText4 = (text: string) => {
    setWhyChooseText4State(text);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, text4: text };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_4', { text });
  };

  const setWhyChooseText5 = (text: string) => {
    setWhyChooseText5State(text);
    const cache = JSON.parse(localStorage.getItem('eleganbd_why_choose') || '{}');
    const updated = { ...cache, text5: text };
    localStorage.setItem('eleganbd_why_choose', JSON.stringify(updated));
    updateFirestore('why_choose_5', { text });
  };

  useEffect(() => {
    const targetImage = heroBannerUrl || logoUrl || 'https://eleganbd.vercel.app/og-image.png';
    const faviconImage = logoUrl || heroBannerUrl || '/logo.png';
    if (typeof document !== 'undefined') {
      const origin = window.location.origin;
      const fullImageUrl = targetImage.startsWith('http') 
        ? targetImage 
        : `${origin}${targetImage.startsWith('/') ? '' : '/'}${targetImage}`;

      const fullFaviconUrl = faviconImage.startsWith('http') 
        ? faviconImage 
        : `${origin}${faviconImage.startsWith('/') ? '' : '/'}${faviconImage}`;

      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        ogImage.setAttribute('content', fullImageUrl);
      }
      const ogImageSecure = document.querySelector('meta[property="og:image:secure_url"]');
      if (ogImageSecure) {
        ogImageSecure.setAttribute('content', fullImageUrl);
      }
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) {
        twitterImage.setAttribute('content', fullImageUrl);
      }

      // Update favicon dynamically
      const faviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
      if (faviconLinks.length > 0) {
        faviconLinks.forEach(link => {
          link.setAttribute('href', fullFaviconUrl);
        });
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = fullFaviconUrl;
        document.head.appendChild(link);
      }
    }
  }, [heroBannerUrl, logoUrl]);

  return (
    <BrandingContext.Provider value={{ 
      logoUrl, sizeChartUrl, ceoPhotoUrl, collectionsBannerUrl, heroBannerUrl, heroBanner2Url, heroBanner3Url, subHeroBannerUrl, featureBannerUrl, poloBannerUrl,
      shirtBannerUrl: featureBannerUrl, pantBannerUrl: poloBannerUrl, comboOfferBannerUrl, showShowcase, categoryImages, 
      showAnnouncementBar, announcementMessage, showCountdownBanner, comboOfferTitle, comboOfferSubTitle, comboOfferDiscount, comboOfferHours, comboOfferMinutes, comboOfferSeconds, showHeroBanner, facebookUrl, instagramUrl, youtubeUrl, tiktokUrl, shippingInsideDhaka, shippingOutsideDhaka, shippingFreeAfter, primaryDeliveryDistrict, aboutText,
      whyChooseImg1, whyChooseImg2, whyChooseImg3, whyChooseImg4, whyChooseImg5, whyChooseText1, whyChooseText2, whyChooseText3, whyChooseText4, whyChooseText5,
      setLogoUrl, setSizeChartUrl, setCeoPhotoUrl, setCollectionsBannerUrl, setHeroBannerUrl, setHeroBanner2Url, setHeroBanner3Url, setSubHeroBannerUrl, setFeatureBannerUrl, setPoloBannerUrl,
      setShirtBannerUrl: setFeatureBannerUrl, setPantBannerUrl: setPoloBannerUrl, setComboOfferBannerUrl, setShowShowcase, setCategoryImageUrl,
      setShowAnnouncementBar, setAnnouncementMessage, setShowCountdownBanner, setComboOfferTitle, setComboOfferSubTitle, setComboOfferDiscount, setComboOfferHours, setComboOfferMinutes, setComboOfferSeconds, setShowHeroBanner, setFacebookUrl, setInstagramUrl, setYoutubeUrl, setTiktokUrl, setShippingInsideDhaka, setShippingOutsideDhaka, setShippingFreeAfter, setPrimaryDeliveryDistrict, setAboutText,
      setWhyChooseImg1, setWhyChooseImg2, setWhyChooseImg3, setWhyChooseImg4, setWhyChooseImg5, setWhyChooseText1, setWhyChooseText2, setWhyChooseText3, setWhyChooseText4, setWhyChooseText5
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
