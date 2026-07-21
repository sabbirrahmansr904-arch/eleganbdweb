import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

dotenv.config();

initializeApp();
const db = getFirestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Custom error handler for JSON body parser (including payload too large)
  app.use((err: any, req: any, res: any, next: any) => {
    if (err.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request entity too large' });
    } else {
      next(err);
    }
  });

  // API route to send OTP
  app.post("/api/send-otp", async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await db.collection('otps').doc(email).set({
      otp,
      createdAt: FieldValue.serverTimestamp(),
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
    const doc = await db.collection('otps').doc(email).get();
    if (!doc.exists || doc.data()?.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    await db.collection('otps').doc(email).delete();
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
      const configDoc = await db.collection('config').doc('notification_settings').get();
      if (configDoc.exists) {
        const data = configDoc.data();
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
