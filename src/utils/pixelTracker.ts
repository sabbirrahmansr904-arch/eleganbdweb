import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { fetchDocumentFromSupabase } from '../lib/supabase';

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
    return cachedConfig;
  }
  try {
    const saved = localStorage.getItem('eleganbd_pixel_analytics');
    if (saved) {
      cachedConfig = JSON.parse(saved);
      return cachedConfig;
    }
  } catch (e) {}
  return null;
}

export function setLocalPixelConfig(config: PixelAnalyticsConfig) {
  cachedConfig = config;
  try {
    localStorage.setItem('eleganbd_pixel_analytics', JSON.stringify(config));
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
    try {
      const supConfig = await fetchDocumentFromSupabase('config', 'pixel_analytics');
      if (supConfig && (supConfig.facebookPixelId || supConfig.googleAnalyticsId || supConfig.gtmId)) {
        config = supConfig as PixelAnalyticsConfig;
      }
    } catch (e) {}
  }

  if (!config) {
    config = getLocalPixelConfig() || {};
  } else {
    setLocalPixelConfig(config);
  }

  // 0. Meta Pixel (Facebook Pixel)
  if (config.facebookPixelId && config.facebookPixelId.trim()) {
    const pixelId = config.facebookPixelId.trim();
    // @ts-ignore
    if (typeof window !== 'undefined' && !window.fbq) {
      // @ts-ignore
      !(function(f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

      // @ts-ignore
      window.fbq('init', pixelId);
      // @ts-ignore
      window.fbq('track', 'PageView');
    }
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

  // Meta Pixel tracking
  // @ts-ignore
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      // @ts-ignore
      window.fbq('track', 'Purchase', {
        value: totalVal,
        currency: 'BDT',
        content_type: 'product',
        contents: (order.items || []).map(i => ({
          id: String(i.id || i.sku || i.name),
          quantity: Number(i.quantity) || 1,
          item_price: Number(i.price) || 0
        })),
        num_items: (order.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)
      });
    } catch (e) {
      console.warn('Meta Pixel Purchase notice:', e);
    }
  }

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

  // Meta Pixel tracking
  // @ts-ignore
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      // @ts-ignore
      window.fbq('track', 'AddToCart', {
        content_name: product.name,
        content_ids: [String(product.id || product.sku || product.name)],
        content_type: 'product',
        value: totalVal,
        currency: 'BDT'
      });
    } catch (e) {}
  }

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

  // Meta Pixel tracking
  // @ts-ignore
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      // @ts-ignore
      window.fbq('track', 'InitiateCheckout', {
        content_type: 'product',
        num_items: items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0),
        value: totalVal,
        currency: 'BDT'
      });
    } catch (e) {}
  }

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

  // Meta Pixel tracking
  // @ts-ignore
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      // @ts-ignore
      window.fbq('track', 'ViewContent', {
        content_name: product.name,
        content_ids: [String(product.id || product.sku || product.name)],
        content_type: 'product',
        value: itemPrice,
        currency: 'BDT'
      });
    } catch (e) {}
  }

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
