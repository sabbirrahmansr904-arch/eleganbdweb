import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { createRequire } from "module";


dotenv.config();

const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

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

  // API route to send Meta Conversion API event
  app.post("/api/meta-conversion-event", async (req, res) => {
    const { eventName, eventData, userData } = req.body;
    const token = process.env.META_CONVERSION_API_TOKEN;
    const pixelId = process.env.META_PIXEL_ID;
    
    if (!token || !pixelId) {
      return res.status(500).json({ error: "Meta configuration missing" });
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            user_data: userData,
            custom_data: eventData
          }]
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to send event to Meta" });
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
      const configRef = doc(db, 'config', 'notification_settings');
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data) {
          if (data.emailAlertsEnabled === false) {
            console.log("Email order alerts are disabled in settings");
            return res.json({ success: true, message: "Email order alerts are disabled" });
          }
          if (data.primaryEmail) {
            adminEmails = data.primaryEmail;
            if (data.secondaryEmail) {
              adminEmails += `, ${data.secondaryEmail}`;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not load notification settings from Firestore, using default fallbacks", e);
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

  // Helper to authenticate with Pathao
  let cachedPathaoToken: { token: string; expiresAt: number; apiBase: string } | null = null;
  let cachedPathaoCities: any[] | null = null;
  let cachedPathaoZones: Record<number, any[]> = {};

  async function getPathaoAuth(customCreds?: any) {
    let creds = customCreds;
    if (!creds || !creds.clientId) {
      try {
        const pathaoRef = doc(db, 'config', 'pathao');
        const pathaoSnap = await getDoc(pathaoRef);
        if (pathaoSnap.exists()) {
          creds = pathaoSnap.data();
        }
      } catch (e) {
        console.warn("Could not load Pathao creds from Firestore", e);
      }
    }

    if (!creds || !creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
      throw new Error("Pathao API credentials missing in Admin Settings");
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

  async function trackPathaoInternal(rawId: string) {
    const cleanId = String(rawId || '').replace(/^#/, '').trim();
    if (!cleanId) throw new Error("Consignment ID is missing");

    let authInfo: any;
    try {
      authInfo = await getPathaoAuth();
    } catch (authErr: any) {
      // If auth failed, try clearing cache and retrying once
      cachedPathaoToken = null;
      authInfo = await getPathaoAuth();
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

  async function trackSteadfastInternal(rawId: string) {
    const cleanId = String(rawId || '').replace(/^#/, '').trim();
    if (!cleanId) throw new Error("Tracking Code is missing");

    let creds: any = null;
    try {
      const sfRef = doc(db, 'config', 'steadfast');
      const sfSnap = await getDoc(sfRef);
      if (sfSnap.exists()) {
        creds = sfSnap.data();
      }
    } catch (e) {
      console.warn("Could not load Steadfast credentials from Firestore", e);
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

      // Step 2: Format phone number (must be 11 digits starting with 01)
      let phone = (order.phone || '').replace(/[^0-9]/g, '');
      if (phone.startsWith('880')) phone = phone.slice(2);
      if (!phone.startsWith('0') && phone.length === 10) phone = '0' + phone;

      // Format recipient address (must be at least 10 characters)
      let address = `${order.address || ''}${order.thana ? `, ${order.thana}` : ''}${order.city ? `, ${order.city}` : ''}`.trim();
      if (address.length < 10) {
        address = (address + ', Bangladesh').trim();
      }

      // Resolve City ID & Zone ID
      let finalCityId = Number(order.cityId);
      let finalZoneId = Number(order.zoneId);

      // If cityId or zoneId is not numeric or 0, attempt auto-resolution from Pathao API
      if (!finalCityId || !finalZoneId || isNaN(finalCityId) || isNaN(finalZoneId)) {
        try {
          // Fetch cities if needed
          let cities = cachedPathaoCities;
          if (!cities || cities.length === 0) {
            const cityRes = await fetch(`${apiBase}/aladdin/api/v1/countries/1/city-list`, {
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
            });
            const cData: any = await cityRes.json();
            cities = cData?.data?.data || cData?.data || [];
            cachedPathaoCities = cities;
          }

          const targetCityName = (order.city || '').trim().toLowerCase();
          const matchedCity = (cities || []).find((c: any) => 
            c.city_name?.toLowerCase() === targetCityName ||
            c.city_name?.toLowerCase().includes(targetCityName) ||
            targetCityName.includes(c.city_name?.toLowerCase())
          );

          if (matchedCity) {
            finalCityId = matchedCity.city_id;
          } else {
            finalCityId = Number(creds.defaultCityId || 1);
          }

          // Fetch zones for matched city
          let zones = cachedPathaoZones[finalCityId];
          if (!zones || zones.length === 0) {
            const zoneRes = await fetch(`${apiBase}/aladdin/api/v1/cities/${finalCityId}/zone-list`, {
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
            });
            const zData: any = await zoneRes.json();
            zones = zData?.data?.data || zData?.data || [];
            cachedPathaoZones[finalCityId] = zones;
          }

          const targetZoneName = (order.thana || order.zone || '').trim().toLowerCase();
          const matchedZone = (zones || []).find((z: any) => 
            z.zone_name?.toLowerCase() === targetZoneName ||
            z.zone_name?.toLowerCase().includes(targetZoneName) ||
            targetZoneName.includes(z.zone_name?.toLowerCase())
          );

          if (matchedZone) {
            finalZoneId = matchedZone.zone_id;
          } else if (zones && zones.length > 0) {
            finalZoneId = zones[0].zone_id;
          } else {
            finalZoneId = Number(creds.defaultZoneId || 1);
          }
        } catch (resolveErr) {
          console.warn("Pathao location resolution fallback:", resolveErr);
          if (!finalCityId) finalCityId = Number(creds.defaultCityId || 1);
          if (!finalZoneId) finalZoneId = Number(creds.defaultZoneId || 1);
        }
      }

      const itemsDesc = (order.items || []).map((i: any) => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ''} x${i.quantity || 1}`).join(', ');
      const totalQty = (order.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);

      const payload: any = {
        store_id: Number(creds.storeId),
        merchant_order_id: order.invoiceNo ? String(order.invoiceNo) : String(order.id || '').replace(/^ORD-?/i, ''),
        recipient_name: order.customerName || 'Customer',
        recipient_phone: phone,
        recipient_address: address,
        recipient_city: finalCityId || 1,
        recipient_zone: finalZoneId || 1,
        delivery_type: Number(order.delivery_type || 48),
        item_type: 2,
        special_instruction: (order.orderNote !== undefined && order.orderNote !== null) ? order.orderNote : 'Handle with care',
        item_quantity: totalQty || 1,
        item_weight: Number(order.item_weight || 0.5),
        amount_to_collect: (order.paymentMethod === 'COD' || order.paymentStatus !== 'Paid') ? Number(order.total || 0) : 0,
        item_description: itemsDesc || 'Garments / Apparel item'
      };

      if (order.areaId || creds.defaultAreaId) {
        payload.recipient_area = Number(order.areaId || creds.defaultAreaId);
      }

      // Step 3: Create order in Pathao
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
        const orderErr = orderData.message || (orderData.errors ? JSON.stringify(orderData.errors) : "Pathao Order Booking Failed");
        return res.status(400).json({ success: false, error: orderErr });
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

    if (!identifier) {
      return res.status(400).json({ success: false, error: "Consignment ID / Tracking Code is missing" });
    }

    if (preferredCourier.includes('steadfast')) {
      try {
        const res1 = await trackSteadfastInternal(identifier);
        return res.json(res1);
      } catch (e1: any) {
        try {
          const res2 = await trackPathaoInternal(identifier);
          return res.json(res2);
        } catch (e2: any) {
          return res.status(400).json({ success: false, error: e1.message || e2.message });
        }
      }
    } else {
      try {
        const res1 = await trackPathaoInternal(identifier);
        return res.json(res1);
      } catch (e1: any) {
        try {
          const res2 = await trackSteadfastInternal(identifier);
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
      if (statusLower.includes('deliver') || statusLower.includes('success') || statusLower === 'delivery_complete') {
        newOrderStatus = 'Delivered';
      } else if (statusLower.includes('cancel') || statusLower.includes('return')) {
        newOrderStatus = 'Returned';
      }

      // Query order by consignment_id or id
      const ordersRef = collection(db, 'orders');
      let targetOrderDocId: string | null = null;

      if (consignmentId) {
        const q = query(ordersRef, where('pathaoConsignmentId', '==', consignmentId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          targetOrderDocId = snap.docs[0].id;
        } else {
          const q2 = query(ordersRef, where('trackingId', '==', consignmentId));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            targetOrderDocId = snap2.docs[0].id;
          }
        }
      }

      if (!targetOrderDocId && merchantOrderId) {
        const cleanId = String(merchantOrderId).replace(/^ORD-?/i, '');
        const directDoc = await getDoc(doc(db, 'orders', merchantOrderId));
        if (directDoc.exists()) {
          targetOrderDocId = directDoc.id;
        } else {
          const q3 = query(ordersRef, where('invoiceNo', '==', Number(cleanId) || cleanId));
          const snap3 = await getDocs(q3);
          if (!snap3.empty) {
            targetOrderDocId = snap3.docs[0].id;
          }
        }
      }

      if (targetOrderDocId) {
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
        await updateDoc(doc(db, 'orders', targetOrderDocId), updatePayload);
        return res.status(200).json({ success: true, updated: targetOrderDocId, status: newOrderStatus || status });
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
        const sfRef = doc(db, 'config', 'steadfast');
        const sfSnap = await getDoc(sfRef);
        if (sfSnap.exists()) {
          creds = sfSnap.data();
        }
      } catch (e) {
        console.warn("Could not load Steadfast credentials from Firestore", e);
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
        const heroBannerSnap = await getDoc(doc(db, "config", "banner_hero"));
        if (heroBannerSnap.exists() && heroBannerSnap.data().url) {
          heroImgUrl = heroBannerSnap.data().url;
        } else {
          const brandingSnap = await getDoc(doc(db, "config", "branding"));
          if (brandingSnap.exists()) {
            const data = brandingSnap.data();
            if (data.heroBannerUrl && !data.heroBannerUrl.includes('unsplash.com')) {
              heroImgUrl = data.heroBannerUrl;
            } else if (data.logoUrl && !data.logoUrl.includes('unsplash.com')) {
              heroImgUrl = data.logoUrl;
            }
          }
        }
      } catch (e) {
        console.error("Error fetching branding for og-image:", e);
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
