import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { 
  db, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc 
} from "./src/lib/firestoreMock";
import { createRequire } from "module";


dotenv.config();

const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

const firebaseApp = initializeApp(firebaseConfig);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers & CORS Middleware
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Simple In-Memory Rate Limiter Map for API Security
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const rateLimiter = (maxRequests: number, windowMs: number) => {
    return (req: any, res: any, next: any) => {
      const ip = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown').split(',')[0].trim();
      const now = Date.now();
      const record = rateLimitMap.get(ip);

      if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
      }

      if (record.count >= maxRequests) {
        return res.status(429).json({ error: 'Too many requests. Please try again later for security.' });
      }

      record.count += 1;
      next();
    };
  };

  app.use(express.json({ limit: '10mb' }));



  // Custom error handler for JSON body parser (including payload too large)
  app.use((err: any, req: any, res: any, next: any) => {
    if (err.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request entity too large' });
    } else {
      next(err);
    }
  });

  // API route to send OTP with Rate Limit & Email Input Validation
  app.post("/api/send-otp", rateLimiter(5, 15 * 60 * 1000), async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email address format." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const otpRef = doc(db, 'otps', cleanEmail);
    await setDoc(otpRef, {
      otp,
      createdAt: new Date().toISOString(),
    });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ error: "Email configuration missing" });
    }
    const cleanUser = process.env.EMAIL_USER.trim();
    const cleanPass = process.env.EMAIL_PASS.trim().replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
    });

    try {
      await transporter.sendMail({
        from: cleanUser,
        to: email,
        subject: "Your OTP for Elegan BD",
        text: `Your OTP is: ${otp}`,
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // API route to verify OTP
  app.post("/api/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    const otpRef = doc(db, 'otps', email);
    const otpSnap = await getDoc(otpRef);
    if (!otpSnap.exists() || otpSnap.data()?.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    await deleteDoc(otpRef);
    res.json({ success: true });
  });

  // API route to inspect and clear banners
  app.get("/api/debug-orders", async (req, res) => {
    try {
      const orderSnaps = await getDocs(collection(db, 'orders'));
      const ordersList = orderSnaps.docs.map(d => ({ id: d.id, ...d.data() }));

      const custSnaps = await getDocs(collection(db, 'customers'));
      const custList = custSnaps.docs.map(d => ({ id: d.id, ...d.data() }));

      res.json({ ordersCount: ordersList.length, orders: ordersList, customers: custList });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/debug-banners", async (req, res) => {
    try {
      const bannerSnaps = await getDocs(collection(db, 'banners'));
      const bannersList = bannerSnaps.docs.map(d => ({ id: d.id, ...d.data() }));

      const configKeys = ['banner_hero', 'banner_hero_2', 'banner_hero_3', 'banner_sub_hero', 'banner_collections', 'banner_feature', 'banner_polo', 'banner_combo_offer', 'branding'];
      const configs: Record<string, any> = {};
      for (const k of configKeys) {
        try {
          const s = await getDoc(doc(db, 'config', k));
          if (s.exists()) configs[k] = s.data();
        } catch {}
      }

      res.json({ bannersList, configs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/banners/clear-banner", async (req, res) => {
    try {
      const { bannerKey } = req.body; // e.g. 'sub_hero' or 'banner_sub_hero'
      const key = (bannerKey || 'sub_hero').replace(/^banner_/, '');
      const docRef = doc(db, 'config', `banner_${key}`);
      await setDoc(docRef, { url: '', updatedAt: new Date().toISOString() }, { merge: true });
      res.json({ success: true, message: `Banner ${key} cleared` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Direct robust Server API to save/update product data
  app.post("/api/products/save", async (req, res) => {
    try {
      const { product } = req.body;
      if (!product || !product.id) {
        return res.status(400).json({ error: "Invalid product data: missing product ID" });
      }
      const prodRef = doc(db, 'products', String(product.id));
      await setDoc(prodRef, {
        ...product,
        updatedAt: product.updatedAt || Date.now()
      }, { merge: true });
      return res.json({ success: true, message: "Product saved successfully" });
    } catch (e: any) {
      console.error("API product save error:", e);
      return res.status(500).json({ error: e.message || "Failed to save product" });
    }
  });

  // Direct robust Server API to delete product data
  app.post("/api/products/delete", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Product ID is required" });
      }
      const prodRef = doc(db, 'products', String(id));
      await deleteDoc(prodRef);
      return res.json({ success: true, message: "Product deleted successfully" });
    } catch (e: any) {
      console.error("API product delete error:", e);
      return res.status(500).json({ error: e.message || "Failed to delete product" });
    }
  });

  // In-memory cache for Firestore config documents to avoid quota limits & redundant reads
  const memoryConfigCache: Record<string, { data: any; timestamp: number }> = {};
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

  async function getCachedDocData(collectionName: string, docId: string, fallback: any = null) {
    const cacheKey = `${collectionName}/${docId}`;
    const now = Date.now();
    const cached = memoryConfigCache[cacheKey];

    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      const docRef = doc(db, collectionName, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        memoryConfigCache[cacheKey] = { data, timestamp: now };
        return data;
      }
    } catch (err) {
      console.warn(`[Firestore Cache Warning] Failed to fetch ${collectionName}/${docId}:`, err);
    }

    return fallback;
  }

  // API route to send Meta Conversion API event
  app.post("/api/meta-conversion-event", async (req, res) => {
    try {
      const {
        eventName,
        eventData,
        userData,
        eventId,
        eventSourceUrl,
        pixelId: reqPixelId,
        accessToken: reqToken,
        testCode: reqTestCode
      } = req.body;

      let token = (reqToken || process.env.META_CONVERSION_API_TOKEN || '').trim();
      let pixelId = (reqPixelId || process.env.META_PIXEL_ID || '').trim();
      let testCode = (reqTestCode || process.env.META_TEST_EVENT_CODE || '').trim();

      if (!token || !pixelId) {
        try {
          const pixelConfig = await getCachedDocData("config", "pixel_analytics", null);
          if (pixelConfig) {
            if (!pixelId && pixelConfig.facebookPixelId) pixelId = pixelConfig.facebookPixelId.trim();
            if (!token && pixelConfig.facebookAccessToken) token = pixelConfig.facebookAccessToken.trim();
            if (!testCode && pixelConfig.facebookTestCode) testCode = pixelConfig.facebookTestCode.trim();
          }
        } catch (e) {
          console.warn("CAPI config lookup notice:", e);
        }
      }

      if (!pixelId || !token) {
        return res.status(400).json({ error: "Meta Facebook Pixel ID or Conversion API Access Token not configured" });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || req.ip;
      const clientUserAgent = req.headers['user-agent'] || '';

      const payload: any = {
        data: [{
          event_name: eventName || 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          action_source: "website",
          event_source_url: eventSourceUrl || req.headers.referer || "https://eleganbd.com",
          user_data: {
            ...userData,
            client_ip_address: clientIp,
            client_user_agent: clientUserAgent
          },
          custom_data: eventData || {}
        }]
      };

      if (testCode) {
        payload.test_event_code = testCode;
      }

      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await metaRes.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Meta Conversion API error:", error);
      return res.status(500).json({ error: error?.message || "Failed to send event to Meta" });
    }
  });

  // API route to proxy fetch Google Sheets CSV data without CORS issues
  app.post("/api/fetch-google-sheet", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ error: "Google Sheet URL is required" });
      }

      const rawUrl = url.trim();
      let sheetId = '';
      let gid = '0';
      let isPubLink = false;
      let pubId = '';

      // Match published link (spreadsheets/d/e/2PACX...)
      const pubMatch = rawUrl.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
      if (pubMatch && pubMatch[1]) {
        isPubLink = true;
        pubId = pubMatch[1];
      }

      // Match standard Google Sheet link
      const sheetMatch = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetMatch && sheetMatch[1]) {
        sheetId = sheetMatch[1];
      }

      // Match GID
      const gidMatch = rawUrl.match(/[?&#]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) {
        gid = gidMatch[1];
      }

      // Generate candidate URLs to try in priority order
      const candidateUrls: string[] = [];

      if (isPubLink && pubId) {
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv&gid=${gid}`);
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`);
      }

      if (sheetId) {
        // GViz endpoint (most reliable for public spreadsheets)
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
        // Direct export format CSV
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
        // Direct export without gid if gid is 0
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
      }

      // If user provided a direct CSV link or other url format
      if (!candidateUrls.includes(rawUrl)) {
        candidateUrls.push(rawUrl);
      }

      let csvContent = '';
      let lastStatus = 0;
      let isPermissionBlocked = false;

      for (const targetUrl of candidateUrls) {
        try {
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/csv,text/plain,application/csv,*/*'
            },
            redirect: 'follow'
          });

          lastStatus = response.status;

          if (response.ok) {
            const text = await response.text();
            // Check if returned text is HTML (login redirect or error page)
            if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
              isPermissionBlocked = true;
              continue;
            }

            // Valid CSV content must have some characters and not look like HTML error
            if (text && text.trim().length > 0 && !text.trim().startsWith('<')) {
              csvContent = text;
              break;
            }
          } else if (response.status === 401 || response.status === 403) {
            isPermissionBlocked = true;
          }
        } catch (fetchErr: any) {
          console.warn(`[Google Sheet Fetch] Failed candidate ${targetUrl}:`, fetchErr.message);
        }
      }

      if (csvContent) {
        return res.json({ success: true, csv: csvContent });
      }

      if (isPermissionBlocked) {
        return res.status(403).json({
          error: 'Could not access Google Sheet. Please make sure link sharing is set to "Anyone with the link can view".',
          details: 'Google Sheet link requires public viewer access (Share > General Access > Anyone with the link > Viewer).',
          isPermissionError: true
        });
      }

      return res.status(400).json({
        error: `Could not retrieve data from this Google Sheet link (Status: ${lastStatus}). Please check if the link is correct or try downloading as Excel/CSV and upload directly.`,
        isPermissionError: false
      });
    } catch (err: any) {
      console.error("[Google Sheet Proxy Error]:", err);
      res.status(500).json({ error: "Internal server error fetching Google Sheet", details: err.message });
    }
  });

  // API route to Save (Create or Update) Product via Server Firestore and Supabase Admin
  app.post("/api/products/save", async (req, res) => {
    try {
      const { product } = req.body;
      if (!product || !product.id || !product.name) {
        return res.status(400).json({ success: false, error: "Product ID and name are required." });
      }

      const productData = {
        ...product,
        updatedAt: Date.now(),
        createdAt: product.createdAt || Date.now()
      };

      // 1. Save in Firestore server-side (bypasses client security rules & offline state)
      try {
        const docRef = doc(db, 'products', String(productData.id));
        await setDoc(docRef, productData, { merge: true });
      } catch (fsErr: any) {
        console.warn("[Server API] Firestore product save notice:", fsErr.message);
      }

      // 2. Save in Supabase
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnnnjroxyuxsbolbcdil.supabase.co';
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI';
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(supabaseUrl, supabaseKey);
        
        const sbRow = {
          id: String(productData.id),
          name: productData.name || 'Unnamed Product',
          price: Number(productData.price) || 0,
          category: productData.category || 'General',
          images: Array.isArray(productData.images) ? productData.images : [],
          sizes: Array.isArray(productData.sizes) ? productData.sizes : [],
          stock: Number(productData.stock) || 0,
          size_stock: productData.sizeStock && typeof productData.sizeStock === 'object' ? productData.sizeStock : {},
          sku: productData.sku || null,
          cost: typeof productData.cost === 'number' ? productData.cost : null,
          regular_price: typeof productData.regularPrice === 'number' ? productData.regularPrice : null,
          fabric: productData.fabric || null,
          fit_type: productData.fitType || null,
          description: productData.description || '',
          rating: typeof productData.rating === 'number' ? productData.rating : 0,
          is_top_rated: Boolean(productData.isTopRated),
          new_arrival: Boolean(productData.newArrival),
          featured: Boolean(productData.featured),
          updated_at: new Date().toISOString()
        };

        const { error: sbError } = await sb.from('products').upsert(sbRow);
        if (sbError) {
          console.warn("[Server API] Supabase product upsert notice:", sbError.message);
        }
      } catch (sbErr: any) {
        console.warn("[Server API] Supabase client notice:", sbErr.message);
      }

      return res.json({ success: true, product: productData });
    } catch (err: any) {
      console.error("[Server API] Product save error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to save product" });
    }
  });

  // API route to Delete Product via Server Firestore and Supabase
  app.post("/api/products/delete", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: "Product ID is required." });
      }

      const productId = String(id);

      // 1. Delete from Firestore server-side
      try {
        const docRef = doc(db, 'products', productId);
        await deleteDoc(docRef);
      } catch (fsErr: any) {
        console.warn("[Server API] Firestore product delete notice:", fsErr.message);
      }

      // 2. Delete from Supabase
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnnnjroxyuxsbolbcdil.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI';
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(supabaseUrl, supabaseKey);
        await sb.from('products').delete().eq('id', productId);
      } catch (sbErr: any) {
        console.warn("[Server API] Supabase product delete notice:", sbErr.message);
      }

      return res.json({ success: true, id: productId });
    } catch (err: any) {
      console.error("[Server API] Product delete error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to delete product" });
    }
  });

  // API route to Delete single or multiple Orders directly via Server (Supabase + Firestore)
  app.post("/api/orders/delete", async (req, res) => {
    try {
      const { id, ids } = req.body;
      const targetIds: string[] = [];
      if (id) targetIds.push(String(id));
      if (Array.isArray(ids)) {
        ids.forEach((i: any) => {
          if (i) targetIds.push(String(i));
        });
      }

      if (targetIds.length === 0) {
        return res.status(400).json({ success: false, error: "Order ID or IDs required" });
      }

      // 1. Delete from Firestore
      for (const ordId of targetIds) {
        try {
          await deleteDoc(doc(db, 'orders', ordId));
        } catch (fsErr: any) {
          console.warn(`[Server API] Firestore order delete notice for ${ordId}:`, fsErr.message);
        }
      }

      // 2. Delete from Supabase
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnnnjroxyuxsbolbcdil.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI';
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(supabaseUrl, supabaseKey);

        const { error: sbErr } = await sb.from('orders').delete().in('id', targetIds);
        if (sbErr) {
          console.warn("[Server API] Supabase orders delete notice by id:", sbErr.message);
        }

        const numIds = targetIds.map(i => parseInt(i.replace(/[^0-9]/g, ''), 10)).filter(Boolean);
        if (numIds.length > 0) {
          const { error: sbNumErr } = await sb.from('orders').delete().in('invoice_no', numIds);
          if (sbNumErr) {
            console.warn("[Server API] Supabase orders delete notice by invoice_no:", sbNumErr.message);
          }
        }
      } catch (sbErr: any) {
        console.warn("[Server API] Supabase client delete notice:", sbErr.message);
      }

      return res.json({ success: true, deletedCount: targetIds.length });
    } catch (err: any) {
      console.error("[Server API] Order delete error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API route to Delete ALL Orders (for resetting store orders)
  app.post("/api/orders/delete-all", async (req, res) => {
    try {
      // 1. Delete all from Firestore orders collection
      try {
        const snap = await getDocs(collection(db, 'orders'));
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, 'orders', docSnap.id));
        }
      } catch (fsErr: any) {
        console.warn("[Server API] Firestore clear all orders notice:", fsErr.message);
      }

      // 2. Delete all from Supabase orders table
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnnnjroxyuxsbolbcdil.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI';
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(supabaseUrl, supabaseKey);

        // Delete all rows where id is not null/empty
        await sb.from('orders').delete().neq('id', '___NON_EXISTENT___');
      } catch (sbErr: any) {
        console.warn("[Server API] Supabase clear all orders notice:", sbErr.message);
      }

      return res.json({ success: true, message: "All orders cleared successfully" });
    } catch (err: any) {
      console.error("[Server API] Order clear-all error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API route to send email
  app.post("/api/send-order-email", async (req, res) => {
    const { orderDetails } = req.body;
    
    // Configure Nodemailer
    console.log("Checking email configuration...");
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("EMAIL_USER or EMAIL_PASS not set");
      return res.status(500).json({ error: "Email configuration missing" });
    }

    let adminEmails = "eleganbd.ltd@gmail.com, sabbirrahmansr904@gmail.com";
    try {
      const notifData = await getCachedDocData('config', 'notification_settings', null);
      if (notifData) {
        if (notifData.emailAlertsEnabled === false) {
          console.log("Email order alerts are disabled in settings");
          return res.json({ success: true, message: "Email order alerts are disabled" });
        }
        if (notifData.primaryEmail) {
          adminEmails = notifData.primaryEmail;
          if (notifData.secondaryEmail) {
            adminEmails += `, ${notifData.secondaryEmail}`;
          }
        }
      }
    } catch (_e) {
      // Fallback to default adminEmails
    }

    const cleanUser = process.env.EMAIL_USER.trim();
    const cleanPass = process.env.EMAIL_PASS.trim().replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
    });

    // Prepare products HTML
    const productsHtml = orderDetails.items.map((item: any) => `
      <p style="margin-bottom: 5px;">
        ${item.name} ${item.selectedSize ? `- Size: ${item.selectedSize}` : ''}<br>
        ৳${item.price || 0} x ${item.quantity}
      </p>
    `).join('');

    const subtotal = orderDetails.total - (orderDetails.deliveryCharge || 0);

    try {
      await transporter.sendMail({
        from: cleanUser,
        to: adminEmails,
        bcc: orderDetails.email || undefined,
        subject: `🛒 New Order Received - #${orderDetails.id.slice(-6)}`,
        html: `
          <div style="background-color: #121212; color: #e0e0e0; font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto;">
              <h2 style="color: #ffffff;">নতুন অর্ডার এসেছে!</h2>
              <p>আসসালামু আলাইকুম Mohammad Sabbir,<br>আপনার ওয়েবসাইট Elegan BD-এ একটি নতুন অর্ডার এসেছে।</p>

              <div style="background-color: #1e1e1e; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #aaa; font-size: 12px;">অর্ডার নম্বর</p>
                  <h3 style="margin: 5px 0 0; color: #ffffff;">${orderDetails.id}</h3>
              </div>

              <h3 style="border-bottom: 1px solid #333; padding-bottom: 5px; color: #ffffff;">কাস্টমার তথ্য</h3>
              <p><b>নাম:</b> ${orderDetails.customerName}<br>
                 <b>ফোন:</b> ${orderDetails.phone}<br>
                 <b>ঠিকানা:</b> ${orderDetails.address}<br>
                 <b>পেমেন্ট:</b> ${orderDetails.paymentMethod}</p>

              <h3 style="border-bottom: 1px solid #333; padding-bottom: 5px; color: #ffffff;">পণ্য</h3>
              ${productsHtml}

              <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">
              <p><b>সাবটোটাল:</b> ৳${subtotal}</p>
              <p><b>ডেলিভারি ফি:</b> ৳${orderDetails.deliveryCharge || 0}</p>
              <h3 style="color: #bb86fc;">মোট: ৳${orderDetails.total}</h3>
          </div>
        `,
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // API route to send Telegram order notification
  app.post("/api/send-telegram-order", async (req, res) => {
    const { orderDetails } = req.body;
    if (!orderDetails) {
      return res.status(400).json({ error: "Order details missing" });
    }

    let botToken = process.env.TELEGRAM_BOT_TOKEN || '8960670685:AAFk4BurwHSvoO-Ydga9A_iAbGGehboXMPs';
    let chatId = process.env.TELEGRAM_CHAT_ID || '7986746414';

    try {
      const data = await getCachedDocData('config', 'telegram', null);
      if (data) {
        if (data.enabled === false) {
          return res.json({ success: true, message: "Telegram alerts are disabled" });
        }
        if (data.botToken) botToken = data.botToken;
        if (data.chatId) chatId = data.chatId;
      }
    } catch (_e) {
      // Fallback to default Telegram config
    }

    if (!botToken || !chatId) {
      return res.status(500).json({ error: "Telegram Bot Token or Chat ID not configured" });
    }

    const itemsList = (orderDetails.items || []).map((i: any) => 
      `• ${i.name} ${i.selectedSize ? `(Size: ${i.selectedSize})` : ''} - Qty: ${i.quantity} - ৳${(i.price || 0) * (i.quantity || 1)}`
    ).join('\n');

    const invoiceNumDisplay = orderDetails.invoiceNo || orderDetails.id;
    const source = orderDetails.invoiceBy || 'Website';
    const message = `🛒 *নতুন অর্ডার এসেছে!*\n` +
      `🧾 *ইনভয়েস নম্বর:* #${invoiceNumDisplay}\n` +
      `🏷️ *অর্ডার সোর্স:* ${source}\n` +
      `👤 *কাস্টমার নাম:* ${orderDetails.customerName}\n` +
      `📞 *ফোন নম্বর:* ${orderDetails.phone}\n` +
      `📍 *ঠিকানা:* ${orderDetails.address}${orderDetails.city ? `, ${orderDetails.city}` : ''}\n` +
      `💳 *পেমেন্ট পদ্ধতি:* ${orderDetails.paymentMethod}\n\n` +
      `📦 *প্রোডাক্টসমূহ:*\n${itemsList}\n\n` +
      `💵 *সাবটোটাল:* ৳${(orderDetails.total || 0) - (orderDetails.deliveryCharge || 0)}\n` +
      `🚚 *ডেলিভারি চার্জ:* ৳${orderDetails.deliveryCharge || 0}\n` +
      `✨ *মোট টাকা:* ৳${orderDetails.total}\n\n` +
      (orderDetails.notes ? `📝 *নোট:* ${orderDetails.notes}\n\n` : '') +
      `🌐 *Elegan BD Automated Order System*`;

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${String(botToken).trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(chatId).trim(),
          text: message,
          parse_mode: 'Markdown'
        })
      });
      const tgData: any = await tgRes.json();
      if (tgRes.ok && tgData.ok) {
        return res.json({ success: true });
      } else {
        return res.status(400).json({ error: tgData.description || "Failed to send Telegram message" });
      }
    } catch (error: any) {
      console.error("Telegram send error:", error);
      return res.status(500).json({ error: error.message || "Failed to connect to Telegram API" });
    }
  });

  // API route to test Telegram Bot connection
  app.post("/api/telegram/test-connection", async (req, res) => {
    const { botToken, chatId } = req.body;
    if (!botToken || !chatId) {
      return res.status(400).json({ success: false, error: "Bot Token and Chat ID are required." });
    }
    try {
      const testMsg = `🧪 *Elegan BD Test Notification*\nTelegram API is successfully connected! 🎉`;
      const tgRes = await fetch(`https://api.telegram.org/bot${String(botToken).trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(chatId).trim(),
          text: testMsg,
          parse_mode: 'Markdown'
        })
      });
      const tgData: any = await tgRes.json();
      if (tgRes.ok && tgData.ok) {
        return res.json({ success: true });
      } else {
        return res.status(400).json({ success: false, error: tgData.description || "Telegram API test failed" });
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || "Connection failed" });
    }
  });
  const DEFAULT_PATHAO_CONFIG = {
    clientId: process.env.PATHAO_CLIENT_ID || 'nXe0A73axr',
    clientSecret: process.env.PATHAO_CLIENT_SECRET || '0LyQiusPk4HguMTc3oZJaXIeKzjXWH7Yq0LsjPKc',
    username: process.env.PATHAO_USERNAME || 'eleganbd.ltd@gmail.com',
    password: process.env.PATHAO_PASSWORD || 'Eleganbdltd22@@##',
    storeId: process.env.PATHAO_STORE_ID || '376372',
    baseUrl: process.env.PATHAO_BASE_URL || 'https://api-hermes.pathao.com'
  };

  let cachedPathaoToken: { token: string; expiresAt: number; apiBase: string } | null = null;
  let cachedPathaoCities: any[] | null = null;
  let cachedPathaoZones: Record<number, any[]> = {};

  async function getPathaoAuth(customCreds?: any) {
    let creds = customCreds;
    if (!creds || !creds.clientId) {
      try {
        const firestoreData = await getCachedDocData('config', 'pathao', DEFAULT_PATHAO_CONFIG);
        creds = { ...DEFAULT_PATHAO_CONFIG, ...(firestoreData || {}) };
      } catch (_e) {
        creds = DEFAULT_PATHAO_CONFIG;
      }
    }

    if (!creds || !creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
      creds = DEFAULT_PATHAO_CONFIG;
    }

    let apiBase = (creds.baseUrl || 'https://api-hermes.pathao.com').replace(/\/$/, '');
    if (apiBase.includes('courier-api.pathao.com')) {
      apiBase = 'https://api-hermes.pathao.com';
    }

    const now = Date.now();
    if (cachedPathaoToken && cachedPathaoToken.expiresAt > now + 60000 && !customCreds) {
      return { token: cachedPathaoToken.token, apiBase, creds };
    }

    const tokenRes = await fetch(`${apiBase}/aladdin/api/v1/issue-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: String(creds.clientId).trim(),
        client_secret: String(creds.clientSecret).trim(),
        username: String(creds.username).trim(),
        password: String(creds.password).trim(),
        grant_type: 'password'
      })
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      cachedPathaoToken = null;
      const tokenErr = tokenData.message || tokenData.error || (tokenData.errors ? JSON.stringify(tokenData.errors) : "Pathao Authentication Failed");
      throw new Error(`Pathao Auth Failed: ${tokenErr}`);
    }

    const expiresIn = (tokenData.expires_in || 2592000) * 1000;
    if (!customCreds) {
      cachedPathaoToken = {
        token: tokenData.access_token,
        expiresAt: now + expiresIn,
        apiBase
      };
    }

    return { token: tokenData.access_token, apiBase, creds };
  }

  async function trackPathaoInternal(rawId: string, customCreds?: any) {
    const cleanId = String(rawId || '').replace(/^#/, '').trim();
    if (!cleanId) throw new Error("Consignment ID is missing");

    let authInfo: any;
    try {
      authInfo = await getPathaoAuth(customCreds);
    } catch (_authErr: any) {
      // If auth failed, try clearing cache and retrying once
      cachedPathaoToken = null;
      authInfo = await getPathaoAuth(customCreds);
    }

    const { token, apiBase } = authInfo;

    // Endpoints to try
    const endpoints = [
      `${apiBase}/aladdin/api/v1/orders/${encodeURIComponent(cleanId)}/info`,
      `${apiBase}/aladdin/api/v1/orders/${encodeURIComponent(cleanId)}/track`,
      `${apiBase}/aladdin/api/v1/orders/${encodeURIComponent(cleanId)}`,
      `${apiBase}/aladdin/api/v1/merchant/orders/${encodeURIComponent(cleanId)}/info`,
      `${apiBase}/aladdin/api/v1/merchant/orders/${encodeURIComponent(cleanId)}`,
      `${apiBase}/aladdin/api/v1/orders/info?consignment_id=${encodeURIComponent(cleanId)}`,
      `${apiBase}/aladdin/api/v1/user/orders?consignment_id=${encodeURIComponent(cleanId)}`,
      `${apiBase}/aladdin/api/v1/orders?consignment_id=${encodeURIComponent(cleanId)}`
    ];

    let lastError = "Failed to fetch Pathao status";
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (res.status === 401) {
          cachedPathaoToken = null;
        }

        const data: any = await res.json();
        if (res.ok && data) {
          let info = data.data || data;
          if (Array.isArray(info)) {
            info = info[0] || {};
          }

          const statusStr = info.order_status || info.delivery_status || info.status || info.order_status_slug || data.order_status || data.delivery_status || data.status;
          if (statusStr) {
            return {
              success: true,
              status: statusStr,
              consignment_id: cleanId,
              delivery_fee: Number(info.delivery_fee || info.delivery_charge || info.fee || 0),
              amount_to_collect: Number(info.amount_to_collect || info.collectable_amount || info.order_amount || 0),
              courier: 'Pathao',
              data: info
            };
          }
        } else if (data && data.message) {
          lastError = data.message;
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    throw new Error(lastError);
  }

  async function trackSteadfastInternal(rawId: string, customCreds?: any) {
    const cleanId = String(rawId || '').replace(/^#/, '').trim();
    if (!cleanId) throw new Error("Tracking Code is missing");

    let creds = customCreds;
    if (!creds || !creds.apiKey) {
      try {
        creds = await getCachedDocData('config', 'steadfast', null);
      } catch (_e) {
        // Ignored
      }
    }

    if (!creds || !creds.apiKey || !creds.secretKey) {
      throw new Error("Steadfast API credentials missing in Admin Settings");
    }

    const apiKey = String(creds.apiKey).trim();
    const secretKey = String(creds.secretKey).trim();

    const urlsToTry = [
      `https://cpanel.steadfast.com.bd/api/v1/status_by_trackingcode/${encodeURIComponent(cleanId)}`,
      `https://cpanel.steadfast.com.bd/api/v1/status_by_cid/${encodeURIComponent(cleanId)}`,
      `https://cpanel.steadfast.com.bd/api/v1/status_by_invoice/${encodeURIComponent(cleanId)}`
    ];

    let lastError = "Steadfast Status Fetch Failed";
    for (const url of urlsToTry) {
      try {
        const resSf = await fetch(url, {
          method: 'GET',
          headers: {
            'Api-Key': apiKey,
            'Secret-Key': secretKey,
            'Content-Type': 'application/json'
          }
        });
        const dataSf: any = await resSf.json();
        if (resSf.ok && (dataSf.status === 200 || dataSf.delivery_status || dataSf.order)) {
          const st = dataSf.delivery_status || dataSf.status || (dataSf.order && dataSf.order.status);
          if (st && st !== 404 && st !== '404') {
            return {
              success: true,
              status: st,
              consignment_id: cleanId,
              tracking_code: cleanId,
              courier: 'Steadfast',
              data: dataSf
            };
          }
        } else if (dataSf && dataSf.message) {
          lastError = dataSf.message;
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    throw new Error(lastError);
  }

  // API route to get Pathao city list
  app.get("/api/pathao/cities", async (req, res) => {
    try {
      if (cachedPathaoCities && cachedPathaoCities.length > 0) {
        return res.json({ success: true, data: cachedPathaoCities });
      }

      const { token, apiBase } = await getPathaoAuth();
      const response = await fetch(`${apiBase}/aladdin/api/v1/countries/1/city-list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const data: any = await response.json();
      if (response.ok && data.data) {
        const cities = data.data.data || data.data;
        cachedPathaoCities = cities;
        return res.json({ success: true, data: cities });
      } else {
        return res.status(400).json({ success: false, error: data.message || "Failed to fetch Pathao cities" });
      }
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || "Error connecting to Pathao" });
    }
  });

  // API route to get Pathao zones for a city
  app.get("/api/pathao/zones", async (req, res) => {
    try {
      const cityId = Number(req.query.cityId || req.query.city_id);
      if (!cityId) {
        return res.status(400).json({ success: false, error: "cityId is required" });
      }

      if (cachedPathaoZones[cityId]) {
        return res.json({ success: true, data: cachedPathaoZones[cityId] });
      }

      const { token, apiBase } = await getPathaoAuth();
      const response = await fetch(`${apiBase}/aladdin/api/v1/cities/${cityId}/zone-list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const data: any = await response.json();
      if (response.ok && data.data) {
        const zones = data.data.data || data.data;
        cachedPathaoZones[cityId] = zones;
        return res.json({ success: true, data: zones });
      } else {
        return res.status(400).json({ success: false, error: data.message || "Failed to fetch Pathao zones" });
      }
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || "Error connecting to Pathao" });
    }
  });

  // API route to test Pathao OAuth connection
  app.post("/api/pathao/test-connection", async (req, res) => {
    const { clientId, clientSecret, username, password, baseUrl } = req.body;
    let apiBase = (baseUrl || 'https://api-hermes.pathao.com').replace(/\/$/, '');
    if (apiBase.includes('courier-api.pathao.com')) {
      apiBase = 'https://api-hermes.pathao.com';
    }

    if (!clientId || !clientSecret || !username || !password) {
      return res.status(400).json({ success: false, error: "Please fill in Client ID, Client Secret, Username, and Password." });
    }

    try {
      const response = await fetch(`${apiBase}/aladdin/api/v1/issue-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          username: username,
          password: password,
          grant_type: 'password'
        })
      });

      const data: any = await response.json();
      if (response.ok && data.access_token) {
        return res.json({ success: true, access_token: data.access_token, token_type: data.token_type, expires_in: data.expires_in });
      } else {
        const errorMsg = data.message || data.error || (data.errors ? JSON.stringify(data.errors) : "Pathao Authentication Failed");
        return res.status(400).json({ success: false, error: errorMsg });
      }
    } catch (error: any) {
      console.error("Pathao test connection error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to connect to Pathao API server" });
    }
  });

  // API route to create/book order in Pathao Courier
  app.post("/api/pathao/create-order", async (req, res) => {
    const { order, credentials } = req.body;

    if (!order) {
      return res.status(400).json({ success: false, error: "Order details are missing" });
    }

    try {
      const { token: accessToken, apiBase, creds } = await getPathaoAuth(credentials);

      if (!creds.storeId) {
        return res.status(400).json({ success: false, error: "Pathao Store ID is missing in Admin Settings" });
      }

      // Step 1: Format phone number (must be 11 digits starting with 01)
      let rawPhone = String(order.phone || order.recipient_phone || order.customerPhone || '').replace(/[^0-9]/g, '');
      if (rawPhone.startsWith('880')) {
        rawPhone = rawPhone.slice(3);
      } else if (rawPhone.startsWith('88')) {
        rawPhone = rawPhone.slice(2);
      }
      if (!rawPhone.startsWith('0')) {
        rawPhone = '0' + rawPhone;
      }
      if (rawPhone.length > 11 && rawPhone.startsWith('01')) {
        rawPhone = rawPhone.slice(0, 11);
      }
      const phone = rawPhone;

      // Step 2: Format recipient address (must be at least 10 characters)
      let rawAddress = String(order.address || order.recipient_address || '').trim();
      const thanaStr = String(order.thana || order.zone || '').trim();
      const cityStr = String(order.city || '').trim();

      let addressParts = [rawAddress];
      if (thanaStr && !rawAddress.toLowerCase().includes(thanaStr.toLowerCase())) {
        addressParts.push(thanaStr);
      }
      if (cityStr && !rawAddress.toLowerCase().includes(cityStr.toLowerCase())) {
        addressParts.push(cityStr);
      }
      let fullAddress = addressParts.filter(Boolean).join(', ').trim();
      if (fullAddress.length < 10) {
        fullAddress = `${fullAddress}, Bangladesh`.trim();
      }
      if (fullAddress.length < 10) {
        fullAddress = `House 0, Road 0, ${fullAddress}`.trim();
      }

      // Step 3: Resolve City ID & Zone ID safely
      let finalCityId = Number(order.cityId);
      let finalZoneId = Number(order.zoneId);

      // Fetch cities if needed
      let cities = cachedPathaoCities;
      if (!cities || cities.length === 0) {
        try {
          const cityRes = await fetch(`${apiBase}/aladdin/api/v1/countries/1/city-list`, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
          });
          const cData: any = await cityRes.json();
          cities = cData?.data?.data || cData?.data || [];
          if (Array.isArray(cities) && cities.length > 0) {
            cachedPathaoCities = cities;
          }
        } catch (_cErr) {
          cities = [];
        }
      }

      const inputCity = String(order.city || '').trim();
      const inputThana = String(order.thana || order.zone || '').trim();
      const inputAddress = String(order.address || '').trim();

      if (!finalCityId || isNaN(finalCityId)) {
        if (inputCity.toLowerCase().includes('inside dhaka') || inputCity.toLowerCase() === 'dhaka') {
          const dhakaCity = (cities || []).find((c: any) => (c.city_name || '').toLowerCase() === 'dhaka');
          if (dhakaCity) finalCityId = dhakaCity.city_id;
        } else {
          let matchedCity = (cities || []).find((c: any) => {
            const cName = (c.city_name || '').toLowerCase();
            if (!cName) return false;
            return inputCity.toLowerCase() === cName ||
                   inputThana.toLowerCase() === cName ||
                   inputAddress.toLowerCase().includes(cName);
          });

          if (matchedCity) {
            finalCityId = matchedCity.city_id;
          } else {
            const dhakaCity = (cities || []).find((c: any) => (c.city_name || '').toLowerCase() === 'dhaka');
            finalCityId = dhakaCity ? dhakaCity.city_id : 1;
          }
        }
      }

      if (!finalCityId || isNaN(finalCityId)) finalCityId = 1;

      // Fetch zones for finalCityId
      let zones = cachedPathaoZones[finalCityId];
      if (!zones || zones.length === 0) {
        try {
          const zoneRes = await fetch(`${apiBase}/aladdin/api/v1/cities/${finalCityId}/zone-list`, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
          });
          const zData: any = await zoneRes.json();
          zones = zData?.data?.data || zData?.data || [];
          if (Array.isArray(zones) && zones.length > 0) {
            cachedPathaoZones[finalCityId] = zones;
          }
        } catch (_zErr) {
          zones = [];
        }
      }

      // Verify finalZoneId belongs to valid zone list for this city
      const validZoneIds = new Set((zones || []).map((z: any) => z.zone_id));
      if (!finalZoneId || isNaN(finalZoneId) || !validZoneIds.has(finalZoneId)) {
        const searchTarget = `${inputThana} ${inputAddress}`.toLowerCase();
        let matchedZone = (zones || []).find((z: any) => {
          const zName = (z.zone_name || '').toLowerCase();
          if (!zName) return false;
          return searchTarget.includes(zName) || zName.includes(inputThana.toLowerCase());
        });

        if (matchedZone) {
          finalZoneId = matchedZone.zone_id;
        } else if (zones && zones.length > 0) {
          finalZoneId = zones[0].zone_id;
        } else {
          finalZoneId = 171;
        }
      }

      // Step 4: Calculate amount to collect & item details & sanitize fields
      let recipientName = String(order.customerName || order.recipient_name || order.name || 'Customer').trim();
      if (!recipientName) {
        recipientName = 'Valued Customer';
      } else if (recipientName.length < 3) {
        recipientName = `${recipientName} Customer`;
      }
      if (recipientName.length > 64) {
        recipientName = recipientName.slice(0, 64).trim();
      }

      if (fullAddress.length > 255) {
        fullAddress = fullAddress.slice(0, 255).trim();
      }

      const itemsDesc = (order.items || []).map((i: any) => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ''} x${i.quantity || 1}`).join(', ');
      let itemDesc = (itemsDesc || 'Garments / Apparel item').trim();
      if (itemDesc.length > 255) itemDesc = itemDesc.slice(0, 255).trim();

      let totalQty = (order.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
      if (isNaN(totalQty) || totalQty < 1) totalQty = 1;

      let itemWeight = Number(order.item_weight || order.weight || 0.5);
      if (isNaN(itemWeight) || itemWeight < 0.5) itemWeight = 0.5;

      let deliveryType = Number(order.delivery_type || order.deliveryType || 48);
      if (isNaN(deliveryType) || (deliveryType !== 48 && deliveryType !== 24 && deliveryType !== 12)) {
        deliveryType = 48;
      }

      let amountToCollect = 0;
      if (order.paymentMethod === 'COD' || (order.paymentStatus !== 'Paid' && order.status !== 'Paid')) {
        const total = Number(order.total || 0);
        const advance = Number(order.advancePayment || order.advance_payment || 0);
        const due = order.dueAmount !== undefined ? Number(order.dueAmount) : Math.max(0, total - advance);
        amountToCollect = isNaN(due) ? 0 : Math.max(0, Math.round(due));
      }

      let merchantOrderId = String(order.invoiceNo || order.id || '').replace(/^ORD-?/i, '');
      if (!merchantOrderId) merchantOrderId = `${Date.now()}`;

      let specialInstruction = (order.orderNote !== undefined && order.orderNote !== null && String(order.orderNote).trim()) ? String(order.orderNote).trim() : 'Handle with care';
      if (specialInstruction.length > 255) specialInstruction = specialInstruction.slice(0, 255).trim();

      const payload: any = {
        store_id: Number(creds.storeId),
        merchant_order_id: merchantOrderId,
        recipient_name: recipientName,
        recipient_phone: phone,
        recipient_address: fullAddress,
        recipient_city: finalCityId,
        recipient_zone: finalZoneId,
        delivery_type: deliveryType,
        item_type: 2,
        special_instruction: specialInstruction,
        item_quantity: totalQty,
        item_weight: itemWeight,
        amount_to_collect: amountToCollect,
        item_description: itemDesc
      };

      if (order.areaId && !isNaN(Number(order.areaId)) && Number(order.areaId) > 0) {
        payload.recipient_area = Number(order.areaId);
      }

      // Step 5: Post order to Pathao API
      const orderRes = await fetch(`${apiBase}/aladdin/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const orderData: any = await orderRes.json();

      if (orderRes.ok && (orderData.data || orderData.consignment_id)) {
        const consignmentId = orderData.data?.consignment_id || orderData.consignment_id;
        return res.json({
          success: true,
          consignment_id: consignmentId,
          data: orderData.data || orderData
        });
      } else {
        let errorMsg = orderData.message || "Pathao Order Booking Failed";
        if (orderData.errors && typeof orderData.errors === 'object') {
          const errorParts: string[] = [];
          for (const [key, val] of Object.entries(orderData.errors)) {
            const msgs = Array.isArray(val) ? val.join(', ') : String(val);
            errorParts.push(`${key}: ${msgs}`);
          }
          if (errorParts.length > 0) {
            errorMsg = errorParts.join(' | ');
          }
        }
        return res.status(400).json({ success: false, error: errorMsg });
      }

    } catch (error: any) {
      console.error("Pathao create order error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to communicate with Pathao API" });
    }
  });

  // API route to track order in Pathao Courier
  app.post("/api/pathao/track-order", async (req, res) => {
    const consignmentId = req.body.consignmentId || req.body.trackingCode || req.body.trackingId;

    if (!consignmentId) {
      return res.status(400).json({ success: false, error: "Consignment ID is missing" });
    }

    try {
      const result = await trackPathaoInternal(consignmentId);
      return res.json(result);
    } catch (pathaoErr: any) {
      // Fallback: Check if this tracking code exists in Steadfast (e.g. #G32UWC)
      try {
        const sfResult = await trackSteadfastInternal(consignmentId);
        return res.json(sfResult);
      } catch (sfErr) {
        console.warn("Pathao track error:", pathaoErr.message);
        return res.status(400).json({
          success: false,
          error: pathaoErr.message || "Failed to fetch Pathao parcel status"
        });
      }
    }
  });

  // Unified API route to track order across Couriers (Pathao / Steadfast)
  app.post("/api/courier/track-order", async (req, res) => {
    const identifier = req.body.consignmentId || req.body.trackingCode || req.body.trackingId || req.body.invoiceId;
    const preferredCourier = (req.body.courier || '').toLowerCase();
    const pathaoCreds = req.body.pathaoCredentials;
    const steadfastCreds = req.body.steadfastCredentials;

    if (!identifier) {
      return res.status(400).json({ success: false, error: "Consignment ID / Tracking Code is missing" });
    }

    if (preferredCourier.includes('steadfast')) {
      try {
        const res1 = await trackSteadfastInternal(identifier, steadfastCreds);
        return res.json(res1);
      } catch (e1: any) {
        try {
          const res2 = await trackPathaoInternal(identifier, pathaoCreds);
          return res.json(res2);
        } catch (e2: any) {
          return res.status(400).json({ success: false, error: e1.message || e2.message });
        }
      }
    } else {
      try {
        const res1 = await trackPathaoInternal(identifier, pathaoCreds);
        return res.json(res1);
      } catch (e1: any) {
        try {
          const res2 = await trackSteadfastInternal(identifier, steadfastCreds);
          return res.json(res2);
        } catch (e2: any) {
          return res.status(400).json({ success: false, error: e1.message || e2.message });
        }
      }
    }
  });

  // Webhook for Pathao / Courier Realtime Delivery Callbacks
  app.post(["/api/pathao/webhook", "/api/courier/webhook"], async (req, res) => {
    try {
      const payload = req.body || {};
      const consignmentId = payload.consignment_id || payload.consignmentId || payload.data?.consignment_id || payload.tracking_code || payload.trackingCode;
      const merchantOrderId = payload.merchant_order_id || payload.order_id || payload.data?.merchant_order_id;
      const status = payload.order_status || payload.status || payload.event || payload.data?.order_status || payload.delivery_status;

      if (!consignmentId && !merchantOrderId) {
        return res.status(200).json({ received: true, note: "No identifier found in webhook payload" });
      }

      const statusLower = (status || '').toLowerCase();
      let newOrderStatus: string | null = null;
      if (statusLower.includes('deliver') || statusLower.includes('success') || statusLower === 'delivery_complete' || statusLower === 'delivered') {
        newOrderStatus = 'Delivered';
      } else if (statusLower.includes('cancel') || statusLower.includes('return')) {
        newOrderStatus = 'Returned';
      } else if (statusLower.includes('assigned') || statusLower.includes('transit') || statusLower.includes('pickup') || statusLower.includes('shipped') || statusLower.includes('dispatch') || statusLower.includes('out') || statusLower.includes('collected')) {
        newOrderStatus = 'Shipped';
      }

      // Query order by consignment_id or id in Supabase
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnnnjroxyuxsbolbcdil.supabase.co';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI';
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(supabaseUrl, supabaseKey);

      let targetOrderId: string | null = null;

      if (consignmentId) {
        const { data: matchedRows } = await sb
          .from('orders')
          .select('id')
          .ilike('notes', `%${consignmentId}%`)
          .limit(1);
        if (matchedRows && matchedRows.length > 0) {
          targetOrderId = matchedRows[0].id;
        }
      }

      if (!targetOrderId && merchantOrderId) {
        const cleanId = String(merchantOrderId).replace(/^ORD-?/i, '');
        const { data: matchedRows } = await sb
          .from('orders')
          .select('id')
          .or(`id.eq.${merchantOrderId},id.eq.${cleanId},invoice_no.eq.${parseInt(cleanId, 10) || 0}`)
          .limit(1);
        if (matchedRows && matchedRows.length > 0) {
          targetOrderId = matchedRows[0].id;
        }
      }

      if (targetOrderId) {
        const sbUpdate: any = {
          updated_at: new Date().toISOString()
        };
        if (newOrderStatus) {
          sbUpdate.status = newOrderStatus;
        }
        await sb.from('orders').update(sbUpdate).eq('id', targetOrderId);

        // Also update Firestore doc if present
        try {
          const updatePayload: any = {
            courierStatus: status,
            updatedAt: Date.now()
          };
          if (newOrderStatus) {
            updatePayload.status = newOrderStatus;
            if (newOrderStatus === 'Delivered') {
              updatePayload.deliveredAt = Date.now();
            }
          }
          await updateDoc(doc(db, 'orders', targetOrderId), updatePayload);
        } catch {}

        return res.status(200).json({ success: true, updated: targetOrderId, status: newOrderStatus || status });
      }

      return res.status(200).json({ received: true, note: "Order matched none in database" });
    } catch (err: any) {
      console.error("Webhook processing error:", err);
      return res.status(200).json({ error: err.message });
    }
  });

  // API route to test Steadfast Courier connection
  app.post("/api/steadfast/test-connection", async (req, res) => {
    const { apiKey, secretKey } = req.body;
    if (!apiKey || !secretKey) {
      return res.status(400).json({ success: false, error: "Please fill in API Key and Secret Key." });
    }

    try {
      const response = await fetch(`https://cpanel.steadfast.com.bd/api/v1/get_balance`, {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json'
        }
      });

      const data: any = await response.json();
      if (response.ok && data.status === 200) {
        return res.json({ success: true, balance: data.current_balance });
      } else {
        const errorMsg = data.message || "Steadfast Authentication Failed";
        return res.status(400).json({ success: false, error: errorMsg });
      }
    } catch (error: any) {
      console.error("Steadfast test connection error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to connect to Steadfast API server" });
    }
  });

  // API route to create/book order in Steadfast Courier
  app.post("/api/steadfast/create-order", async (req, res) => {
    const { order, credentials } = req.body;

    if (!order) {
      return res.status(400).json({ success: false, error: "Order details are missing" });
    }

    let creds = credentials;
    if (!creds || !creds.apiKey) {
      try {
        creds = await getCachedDocData('config', 'steadfast', null);
      } catch (_e) {
        // Fallback
      }
    }

    if (!creds || !creds.apiKey || !creds.secretKey) {
      return res.status(400).json({ success: false, error: "Steadfast API credentials missing in Admin Settings" });
    }

    try {
      let phone = (order.phone || '').replace(/[^0-9]/g, '');
      if (phone.startsWith('880')) phone = phone.slice(2);
      if (!phone.startsWith('0') && phone.length === 10) phone = '0' + phone;

      let address = `${order.address || ''}${order.thana ? `, ${order.thana}` : ''}${order.city ? `, ${order.city}` : ''}`.trim();
      if (address.length < 10) {
        address = (address + ', Dhaka, Bangladesh').trim();
      }

      const itemsDesc = (order.items || []).map((i: any) => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ''} x${i.quantity || 1}`).join(', ');

      const payload = {
        invoice: order.id,
        recipient_name: order.customerName || 'Customer',
        recipient_phone: phone,
        recipient_address: address,
        cod_amount: (order.paymentMethod === 'COD' || order.paymentStatus !== 'Paid') ? Number(order.total || 0) : 0,
        note: order.orderNote || itemsDesc || 'Garments / Apparel'
      };

      const orderRes = await fetch(`https://cpanel.steadfast.com.bd/api/v1/create_order`, {
        method: 'POST',
        headers: {
          'Api-Key': creds.apiKey,
          'Secret-Key': creds.secretKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const orderData: any = await orderRes.json();

      if (orderRes.ok && orderData.status === 200) {
        const consignment = orderData.order;
        return res.json({
          success: true,
          consignmentId: consignment.consignment_id,
          trackingCode: consignment.tracking_code,
          status: consignment.status,
          rawResponse: orderData
        });
      } else {
        const errorMsg = orderData.message || (orderData.errors ? JSON.stringify(orderData.errors) : "Steadfast Order Creation Failed");
        return res.status(400).json({ success: false, error: errorMsg });
      }
    } catch (error: any) {
      console.error("Steadfast create order error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to create order in Steadfast" });
    }
  });

  // API route to track order in Steadfast Courier
  app.post("/api/steadfast/track-order", async (req, res) => {
    const identifier = req.body.consignmentId || req.body.trackingCode || req.body.trackingId || req.body.invoiceId;

    if (!identifier) {
      return res.status(400).json({ success: false, error: "Tracking ID is missing" });
    }

    try {
      const result = await trackSteadfastInternal(identifier);
      return res.json(result);
    } catch (sfErr: any) {
      // Fallback: Check if this consignment ID exists in Pathao
      try {
        const pathaoResult = await trackPathaoInternal(identifier);
        return res.json(pathaoResult);
      } catch (pathaoErr) {
        console.warn("Steadfast track error:", sfErr.message);
        return res.status(400).json({
          success: false,
          error: sfErr.message || "Failed to get Steadfast status"
        });
      }
    }
  });

  // Dynamic Open Graph Image Endpoint for Facebook, WhatsApp, & Social Crawlers
  app.get("/api/og-image", async (req, res) => {
    try {
      let heroImgUrl = '';
      try {
        const heroBannerData = await getCachedDocData("config", "banner_hero", null);
        if (heroBannerData && heroBannerData.url) {
          heroImgUrl = heroBannerData.url;
        } else {
          const brandingData = await getCachedDocData("config", "branding", null);
          if (brandingData) {
            if (brandingData.heroBannerUrl && !brandingData.heroBannerUrl.includes('unsplash.com')) {
              heroImgUrl = brandingData.heroBannerUrl;
            } else if (brandingData.logoUrl && !brandingData.logoUrl.includes('unsplash.com')) {
              heroImgUrl = brandingData.logoUrl;
            }
          }
        }
      } catch (_e) {
        // Fallback
      }

      if (heroImgUrl) {
        if (heroImgUrl.startsWith('data:')) {
          const matches = heroImgUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const contentType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=300');
            return res.send(buffer);
          }
        } else if (heroImgUrl.startsWith('http')) {
          const response = await fetch(heroImgUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=300');
            return res.send(buffer);
          }
        }
      }

      return res.redirect('/og-image.png');
    } catch (err) {
      console.error("OG Image generation error:", err);
      return res.redirect('/og-image.png');
    }
  });

  // Helper to serve index.html with dynamically injected absolute Open Graph meta tags for Facebook/WhatsApp link sharing
  const serveDynamicHtml = async (req: express.Request, res: express.Response, htmlContent: string) => {
    try {
      let protocol = ((req.headers['x-forwarded-proto'] as string) || req.protocol || 'https').split(',')[0].trim();
      let host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'eleganbd.vercel.app';
      if (!host || host.includes('localhost') || host.includes('127.0.0.1')) {
        host = 'eleganbd.vercel.app';
        protocol = 'https';
      }
      const baseUrl = `${protocol}://${host}`;
      const fullPageUrl = `${baseUrl}${req.originalUrl || '/'}`;

      const absoluteOgImage = `${baseUrl}/api/og-image`;

      let injectedHtml = htmlContent
        .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/gi, `<meta property="og:image" content="${absoluteOgImage}" />`)
        .replace(/<meta property="og:image:secure_url" content="[^"]*"\s*\/?>/gi, `<meta property="og:image:secure_url" content="${absoluteOgImage}" />`)
        .replace(/<meta name="twitter:image" content="[^"]*"\s*\/?>/gi, `<meta name="twitter:image" content="${absoluteOgImage}" />`)
        .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/gi, `<meta property="og:url" content="${fullPageUrl}" />`)
        .replace(/<meta name="twitter:url" content="[^"]*"\s*\/?>/gi, `<meta name="twitter:url" content="${fullPageUrl}" />`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(injectedHtml);
    } catch (e) {
      return res.send(htmlContent);
    }
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Intercept main HTML page requests in dev mode to inject absolute OG image URLs
    app.use(async (req, res, next) => {
      const isHtmlReq = req.headers.accept?.includes('text/html') && !req.path.includes('.') && req.method === 'GET';
      if (isHtmlReq) {
        try {
          const fs = await import('fs');
          const indexPath = path.join(process.cwd(), 'index.html');
          let rawHtml = fs.readFileSync(indexPath, 'utf-8');
          rawHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          return await serveDynamicHtml(req, res, rawHtml);
        } catch (e) {
          next(e);
        }
      } else {
        next();
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', async (req, res) => {
      try {
        const fs = require('fs');
        const indexPath = path.join(distPath, 'index.html');
        const rawHtml = fs.readFileSync(indexPath, 'utf-8');
        return await serveDynamicHtml(req, res, rawHtml);
      } catch (e) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
