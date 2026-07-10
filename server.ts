import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

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

  // API route to send email
  app.post("/api/send-order-email", async (req, res) => {
    const { orderDetails } = req.body;
    
    // Configure Nodemailer
    console.log("Checking email configuration...");
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("EMAIL_USER or EMAIL_PASS not set");
      return res.status(500).json({ error: "Email configuration missing" });
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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
        from: process.env.EMAIL_USER,
        to: "eleganbd.ltd@gmail.com",
        subject: "🛒 New Order Received",
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
