import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const DEFAULT_PATHAO_CONFIG = {
  clientId: 'nXe0A73axr',
  clientSecret: '0LyQiusPk4HguMTc3oZJaXIeKzjXWH7Yq0LsjPKc',
  username: 'eleganbd.ltd@gmail.com',
  password: 'Eleganbdltd22@@##',
  storeId: '376372',
  baseUrl: 'https://api-hermes.pathao.com'
};

// Fallback Cloud Run URLs in case the app is loaded from an external static host (like Vercel or custom domain)
export const CLOUD_RUN_BACKEND_URLS = [
  'https://ais-pre-skxowgteqyzw3zp75uh7tu-31294486204.asia-east1.run.app',
  'https://ais-dev-skxowgteqyzw3zp75uh7tu-31294486204.asia-east1.run.app'
];

let cachedPathaoCreds: any = null;
let cachedSteadfastCreds: any = null;

export async function getStoredPathaoCreds(): Promise<any> {
  if (cachedPathaoCreds && cachedPathaoCreds.clientId) {
    return cachedPathaoCreds;
  }
  try {
    const docSnap = await getDoc(doc(db, 'config', 'pathao'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.clientId) {
        cachedPathaoCreds = {
          ...DEFAULT_PATHAO_CONFIG,
          ...data
        };
        return cachedPathaoCreds;
      }
    }
  } catch (err) {
    console.warn('Could not read Pathao config from Firestore, using defaults:', err);
  }
  return DEFAULT_PATHAO_CONFIG;
}

export async function getStoredSteadfastCreds(): Promise<any> {
  if (cachedSteadfastCreds && cachedSteadfastCreds.apiKey) {
    return cachedSteadfastCreds;
  }
  try {
    const docSnap = await getDoc(doc(db, 'config', 'steadfast'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.apiKey) {
        cachedSteadfastCreds = data;
        return cachedSteadfastCreds;
      }
    }
  } catch (err) {
    console.warn('Could not read Steadfast config from Firestore:', err);
  }
  return null;
}

/**
 * Robust fetch helper that handles non-JSON, empty response bodies, HTML 404/redirect pages,
 * and falls back to Cloud Run backend if current host doesn't handle /api routes.
 */
export async function safeApiFetch(endpoint: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: any }> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Candidate base URLs to try
  const candidates: string[] = ['']; // Empty string means current origin (relative URL)

  // If we are on an external host (e.g. Vercel, Netlify, custom domain, etc.)
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isCloudRunOrLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('run.app');

  if (!isCloudRunOrLocal) {
    // Add Cloud Run backend fallback
    candidates.push(...CLOUD_RUN_BACKEND_URLS);
  }

  let lastError: any = null;

  for (let i = 0; i < candidates.length; i++) {
    const baseUrl = candidates[i];
    const fullUrl = `${baseUrl}${cleanEndpoint}`;

    try {
      const res = await fetch(fullUrl, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(init.headers || {})
        }
      });

      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      // Check if response is HTML (which happens when static hosting like Vercel rewrites /api to /index.html)
      const isHtml = contentType.includes('text/html') || text.trim().startsWith('<!') || text.trim().startsWith('<html');

      if (isHtml) {
        // If current host returned HTML for an API route, this host doesn't have an API handler
        if (i < candidates.length - 1) {
          console.warn(`Host returned HTML for ${cleanEndpoint}, trying fallback backend...`);
          continue;
        }
        throw new Error(`API endpoint not found on current host (returned HTML). Please check server configuration.`);
      }

      let parsedData: any = {};
      if (text && text.trim().length > 0) {
        try {
          parsedData = JSON.parse(text);
        } catch (parseErr) {
          if (i < candidates.length - 1) {
            continue;
          }
          throw new Error(`Invalid server response format (${res.status}): ${text.slice(0, 100)}`);
        }
      }

      return {
        ok: res.ok,
        status: res.status,
        data: parsedData
      };
    } catch (err: any) {
      lastError = err;
      if (i < candidates.length - 1) {
        console.warn(`API call failed for ${fullUrl}, trying fallback...`, err.message);
        continue;
      }
    }
  }

  throw lastError || new Error(`Network error calling ${cleanEndpoint}`);
}

/**
 * Specialized helper to book an order via Pathao
 */
export async function bookPathaoOrder(order: any, customCredentials?: any) {
  const credentials = customCredentials || await getStoredPathaoCreds();

  const response = await safeApiFetch('/api/pathao/create-order', {
    method: 'POST',
    body: JSON.stringify({
      order,
      credentials
    })
  });

  return response;
}

/**
 * Specialized helper to book an order via Steadfast
 */
export async function bookSteadfastOrder(order: any, customCredentials?: any) {
  const credentials = customCredentials || await getStoredSteadfastCreds();

  const response = await safeApiFetch('/api/steadfast/create-order', {
    method: 'POST',
    body: JSON.stringify({
      order,
      credentials
    })
  });

  return response;
}

/**
 * Specialized helper to track an order across Couriers (Pathao / Steadfast)
 */
export async function trackCourierOrder(identifier: string, courier?: string) {
  const pathaoCreds = await getStoredPathaoCreds();
  const steadfastCreds = await getStoredSteadfastCreds();

  const response = await safeApiFetch('/api/courier/track-order', {
    method: 'POST',
    body: JSON.stringify({
      consignmentId: identifier,
      trackingCode: identifier,
      trackingId: identifier,
      courier,
      pathaoCredentials: pathaoCreds,
      steadfastCredentials: steadfastCreds
    })
  });

  return response;
}
