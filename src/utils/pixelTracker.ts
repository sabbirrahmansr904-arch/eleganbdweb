import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface PixelAnalyticsConfig {
  facebookPixelId?: string;
  facebookAccessToken?: string;
  facebookTestCode?: string;
  googleAnalyticsId?: string;
  gtmId?: string;
  googleAdsId?: string;
  googleAdsLabel?: string;
}

let cachedConfig: PixelAnalyticsConfig | null = null;

export function getLocalPixelConfig(): PixelAnalyticsConfig | null {
  if (cachedConfig) {
    cachedConfig.facebookPixelId = '';
    cachedConfig.facebookAccessToken = '';
    cachedConfig.facebookTestCode = '';
    return cachedConfig;
  }
  try {
    const saved = localStorage.getItem('eleganbd_pixel_analytics');
    if (saved) {
      cachedConfig = JSON.parse(saved);
      if (cachedConfig) {
        cachedConfig.facebookPixelId = '';
        cachedConfig.facebookAccessToken = '';
        cachedConfig.facebookTestCode = '';
      }
      return cachedConfig;
    }
  } catch (e) {}
  return null;
}

export function setLocalPixelConfig(config: PixelAnalyticsConfig) {
  const sanitized = {
    ...config,
    facebookPixelId: '',
    facebookAccessToken: '',
    facebookTestCode: ''
  };
  cachedConfig = sanitized;
  try {
    localStorage.setItem('eleganbd_pixel_analytics', JSON.stringify(sanitized));
  } catch (e) {}
}

export async function hashSHA256(str: string): Promise<string> {
  if (!str || typeof str !== 'string') return '';
  const normalized = str.trim().toLowerCase();
  if (!normalized) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return normalized;
  }
}

export async function initPixelTracker(configFromFirestore?: PixelAnalyticsConfig) {
  // Purge any existing Meta Pixel / Facebook tags or objects from the DOM & window
  if (typeof window !== 'undefined') {
    try {
      const fbScripts = document.querySelectorAll('script[src*="fbevents.js"], script[src*="connect.facebook.net"]');
      fbScripts.forEach(s => s.remove());
      // @ts-ignore
      if (window.fbq) {
        // @ts-ignore
        delete window.fbq;
        // @ts-ignore
        delete window._fbq;
      }
    } catch (e) {}
  }

  let config = configFromFirestore;
  if (!config) {
    try {
      const docSnap = await getDoc(doc(db, 'config', 'pixel_analytics'));
      if (docSnap.exists()) {
        config = docSnap.data() as PixelAnalyticsConfig;
      }
    } catch (e) {}
  }

  if (!config) {
    config = getLocalPixelConfig() || {};
  } else {
    // Ensure Meta Pixel is stripped
    config.facebookPixelId = '';
    config.facebookAccessToken = '';
    config.facebookTestCode = '';
    setLocalPixelConfig(config);
  }

  // 1. Google Analytics 4
  if (config.googleAnalyticsId && config.googleAnalyticsId.trim()) {
    const gaId = config.googleAnalyticsId.trim();
    if (!document.getElementById('ga-script')) {
      const script1 = document.createElement('script');
      script1.id = 'ga-script';
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){window.dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
      document.head.appendChild(script2);
    }
  }

  // 2. Google Tag Manager
  if (config.gtmId && config.gtmId.trim()) {
    const gtmId = config.gtmId.trim();
    if (!document.getElementById('gtm-script')) {
      const script = document.createElement('script');
      script.id = 'gtm-script';
      script.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `;
      document.head.appendChild(script);
    }
  }

  // 3. Google Ads
  if (config.googleAdsId && config.googleAdsId.trim()) {
    const adsId = config.googleAdsId.trim();
    // @ts-ignore
    if (typeof window !== 'undefined' && window.gtag) {
      // @ts-ignore
      window.gtag('config', adsId);
    }
  }

  return config;
}

export async function trackPurchase(order: {
  id: string;
  total: number;
  customerName?: string;
  email?: string;
  phone?: string;
  city?: string;
  items: Array<{ id?: string; sku?: string; name: string; price: number; quantity: number }>;
  deliveryCharge?: number;
}) {
  if (!order) return;
  const totalVal = Number(order.total) || 0;

  // Google Analytics / Ads tracking
  // @ts-ignore
  if (typeof window !== 'undefined' && window.gtag) {
    try {
      // @ts-ignore
      window.gtag('event', 'purchase', {
        transaction_id: order.id,
        value: totalVal,
        currency: 'BDT',
        shipping: order.deliveryCharge || 0,
        items: (order.items || []).map(i => ({
          item_id: String(i.id || i.sku || i.name),
          item_name: i.name,
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1
        }))
      });
    } catch (e) {
      console.warn('Google Analytics Purchase notice:', e);
    }
  }
}

export async function trackAddToCart(
  product: { id?: string; sku?: string; name: string; price: number; category?: string },
  quantity: number = 1,
  size?: string
) {
  if (!product) return;
  const itemPrice = Number(product.price) || 0;
  const totalVal = itemPrice * (quantity || 1);

  // Google Analytics tracking
  // @ts-ignore
  if (typeof window !== 'undefined' && window.gtag) {
    try {
      // @ts-ignore
      window.gtag('event', 'add_to_cart', {
        currency: 'BDT',
        value: totalVal,
        items: [{
          item_id: String(product.id || product.sku || product.name),
          item_name: product.name,
          price: itemPrice,
          quantity: quantity,
          item_variant: size
        }]
      });
    } catch (e) {}
  }
}

export async function trackInitiateCheckout(
  items: Array<{ product?: { id?: string; sku?: string; name: string; price: number }; price?: number; quantity: number }>,
  total: number
) {
  if (!items || items.length === 0) return;
  const totalVal = Number(total) || 0;

  // Google Analytics tracking
  // @ts-ignore
  if (typeof window !== 'undefined' && window.gtag) {
    try {
      // @ts-ignore
      window.gtag('event', 'begin_checkout', {
        currency: 'BDT',
        value: totalVal,
        items: items.map(i => {
          const prod = i.product || (i as any);
          return {
            item_id: String(prod.id || prod.sku || prod.name),
            item_name: prod.name,
            price: Number(prod.price || i.price) || 0,
            quantity: Number(i.quantity) || 1
          };
        })
      });
    } catch (e) {}
  }
}

export async function trackViewContent(product: { id?: string; sku?: string; name: string; price: number; category?: string }) {
  if (!product) return;
  const itemPrice = Number(product.price) || 0;

  // Google Analytics tracking
  // @ts-ignore
  if (typeof window !== 'undefined' && window.gtag) {
    try {
      // @ts-ignore
      window.gtag('event', 'view_item', {
        currency: 'BDT',
        value: itemPrice,
        items: [{
          item_id: String(product.id || product.sku || product.name),
          item_name: product.name,
          price: itemPrice
        }]
      });
    } catch (e) {}
  }
}
