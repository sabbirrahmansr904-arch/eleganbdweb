import { createClient } from "@supabase/supabase-js";
import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eeifewkhrtveenyrrirj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XD9wPgNEzlHdAaJ2RN_BFw_izYEgB2p';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncOrders() {
  const snap = await getDocs(collection(db, "orders"));
  console.log(`Found ${snap.size} orders in Firestore to sync.`);

  for (const d of snap.docs) {
    const data = d.data();
    const row = {
      id: String(d.id),
      invoice_no: typeof data.invoiceNo === 'number' ? data.invoiceNo : (parseInt(String(d.id).replace(/[^0-9]/g, ''), 10) || null),
      customer_id: data.customerId || 'GUEST-1',
      customer_name: data.customerName || data.name || 'Customer',
      phone: data.phone || '',
      email: data.email || null,
      address: data.address || '',
      city: data.city || 'Dhaka',
      thana: data.thana || '',
      items: Array.isArray(data.items) ? data.items : [],
      discount: typeof data.discount === 'number' ? data.discount : 0,
      total: Number(data.total) || 0,
      status: data.status || 'Pending',
      payment_method: data.paymentMethod || 'cod',
      notes: typeof data.notes === 'string' ? data.notes : null,
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("Upserting order to Supabase:", row.id, row.customer_name);
    const { error } = await supabase.from("orders").upsert(row);
    if (error) {
      console.error("Error upserting order:", error);
    } else {
      console.log("Successfully synced order:", row.id);
    }
  }

  console.log("ALL ORDERS SYNCED TO SUPABASE!");
}

syncOrders().catch(console.error);


