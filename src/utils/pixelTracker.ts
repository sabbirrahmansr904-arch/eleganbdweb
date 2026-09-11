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
  if (cachedConfig) return cachedConfig;
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
    config = getLocalPixelConfig() || {};
  } else {
    setLocalPixelConfig(config);
  }

  // 1. Initialize Meta Pixel (fbq)
  if (config.facebookPixelId && config.facebookPixelId.trim()) {
    const fbId = config.facebookPixelId.trim();
    // @ts-ignore
    if (!window.hasOwnProperty('fbq') && !window.fbq) {
      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
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
    }

    // @ts-ignore
    if (typeof window !== 'undefined' && window.fbq) {
      // @ts-ignore
      window.fbq('init', fbId);
      // @ts-ignore
      window.fbq('track', 'PageView');
    }
  }

  // 2. Google Analytics 4
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

  // 3. Google Tag Manager
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

  // 4. Google Ads
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
  const config = getLocalPixelConfig() || {};
  const eventId = `ord_${order.id || Date.now()}`;
  const totalVal = Number(order.total) || 0;

  const formattedContents = (order.items || []).map(i => ({
    id: String(i.id || i.sku || i.name),
    quantity: Number(i.quantity) || 1,
    item_price: Number(i.price) || 0
  }));

  // 1. Client-side Meta Pixel
  // @ts-ignore
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      // @ts-ignore
      window.fbq('track', 'Purchase', {
        value: totalVal,
        currency: 'BDT',
        content_name: 'Order Purchase',
        content_type: 'product',
        contents: formattedContents,
        num_items: formattedContents.reduce((sum, item) => sum + item.quantity, 0)
      }, { eventID: eventId });
    } catch (e) {
      console.warn('Meta Pixel Purchase notice:', e);
    }
  }

  // 2. Client-side Google Analytics / Ads
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

  // 3. Server-side Meta Conversions API (CAPI)
  try {
    const hashedPhone = order.phone ? await hashSHA256(order.phone.replace(/[^\d+]/g, '')) : '';
    const hashedEmail = order.email ? await hashSHA256(order.email) : '';
    const hashedName = order.customerName ? await hashSHA256(order.customerName) : '';
    const hashedCity = order.city ? await hashSHA256(order.city) : '';

    await fetch('/api/meta-conversion-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'Purchase',
        eventId: eventId,
        pixelId: config.facebookPixelId,
        accessToken: config.facebookAccessToken,
        testCode: config.facebookTestCode,
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        userData: {
          ph: hashedPhone ? [hashedPhone] : undefined,
          em: hashedEmail ? [hashedEmail] : undefined,
          fn: hashedName ? [hashedName] : undefined,
          ct: hashedCity ? [hashedCity] : undefined
        },
        eventData: {
          currency: 'BDT',
          value: totalVal,
          content_type: 'product',
          order_id: String(order.id),
          contents: formattedContents
        }
      })
    });
  } catch (err) {
    console.warn('Meta Conversions API Purchase notice:', err);
  }
}

export async function trackAddToCart(
  product: { id?: string; sku?: string; name: string; price: number; category?: string },
  quantity: number = 1,
  size?: string
) {
  if (!product) return;
  const config = getLocalPixelConfig() || {};
  const eventId = `atc_${product.id || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const itemPrice = Number(product.price) || 0;
  const totalVal = itemPrice * (quantity || 1);

  // 1. Client-side Meta Pixel
  // @ts-ignore
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      // @ts-ignore
      window.fbq('track', 'AddToCart', {
        value: totalVal,
        currency: 'BDT',
        content_name: product.name,
        content_category: product.category || 'Apparel',
        content_ids: [String(product.id || product.sku || product.name)],
        content_type: 'product',
        contents: [{ id: String(product.id || product.sku || product.name), quantity, item_price: itemPrice }]
      }, { eventID: eventId });
    } catch (e) {}
  }

  // 2. Google Analytics
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

  // 3. Meta Conversions API
  try {
    await fetch('/api/meta-conversion-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'AddToCart',
        eventId: eventId,
        pixelId: config.facebookPixelId,
        accessToken: config.facebookAccessToken,
        testCode: config.facebookTestCode,
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        eventData: {
          currency: 'BDT',
          value: totalVal,
          content_name: product.name,
          content_type: 'product',
          contents: [{ id: String(product.id || product.sku || product.name), quantity, item_price: itemPrice }]
        }
      })
    });
  } catch (e) {}
}

export async function trackInitiateCheckout(
  items: Array<{ product?: { id?: string; sku?: string; name: string; price: number }; price?: number; quantity: number }>,
  total: number
) {
  if (!items || items.length === 0) return;
  const config = getLocalPixelConfig() || {};
  const eventId = `ic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const totalVal = Number(total) || 0;

  const formattedContents = items.map(i => {
    const prod = i.product || (i as any);
    return {
      id: String(prod.id || prod.sku || prod.name),
      quantity: Number(i.quantity) || 1,
      item_price: Number(prod.price || i.price) || 0
    };
  });

  // 1. Client-side Meta Pixel
  // @ts-ignore
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      // @ts-ignore
      window.fbq('track', 'InitiateCheckout', {
        value: totalVal,
        currency: 'BDT',
        content_type: 'product',
        contents: formattedContents,
        num_items: formattedContents.reduce((sum, item) => sum + item.quantity, 0)
      }, { eventID: eventId });
    } catch (e) {}
  }

  // 2. Google Analytics
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

  // 3. Meta Conversions API
  try {
    await fetch('/api/meta-conversion-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'InitiateCheckout',
        eventId: eventId,
        pixelId: config.facebookPixelId,
        accessToken: config.facebookAccessToken,
        testCode: config.facebookTestCode,
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        eventData: {
          currency: 'BDT',
          value: totalVal,
          content_type: 'product',
          contents: formattedContents
        }
      })
    });
  } catch (e) {}
}

export async function trackViewContent(product: { id?: string; sku?: string; name: string; price: number; category?: string }) {
  if (!product) return;
  const config = getLocalPixelConfig() || {};
  const eventId = `vc_${product.id || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const itemPrice = Number(product.price) || 0;

  // 1. Client-side Meta Pixel
  // @ts-ignore
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      // @ts-ignore
      window.fbq('track', 'ViewContent', {
        value: itemPrice,
        currency: 'BDT',
        content_name: product.name,
        content_category: product.category || 'Apparel',
        content_ids: [String(product.id || product.sku || product.name)],
        content_type: 'product'
      }, { eventID: eventId });
    } catch (e) {}
  }

  // 2. Google Analytics
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

  // 3. Meta Conversions API
  try {
    await fetch('/api/meta-conversion-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'ViewContent',
        eventId: eventId,
        pixelId: config.facebookPixelId,
        accessToken: config.facebookAccessToken,
        testCode: config.facebookTestCode,
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        eventData: {
          currency: 'BDT',
          value: itemPrice,
          content_name: product.name,
          content_type: 'product',
          contents: [{ id: String(product.id || product.sku || product.name), quantity: 1, item_price: itemPrice }]
        }
      })
    });
  } catch (e) {}
}
