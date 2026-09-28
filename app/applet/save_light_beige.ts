import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import { productToSupabaseRow } from "./src/lib/supabase";

const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eeifewkhrtveenyrrirj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XD9wPgNEzlHdAaJ2RN_BFw_izYEgB2p';
const supabase = createClient(supabaseUrl, supabaseKey);

const targetImageUrl = "https://i.postimg.cc/nVdvWww8/file-00000000e0bc8211a50101c686f1f31d.png";

const lightBeigeProduct = {
  id: "1785257276974",
  name: "Man's Formal Pant - Light Beige",
  price: 999,
  regularPrice: 1399,
  category: "Formal Pant",
  image: targetImageUrl,
  images: [targetImageUrl],
  sizes: ["28", "30", "32", "34", "36", "38", "40"],
  stock: 65,
  sizeStock: { "28": 1, "30": 12, "32": 18, "34": 20, "36": 10, "38": 4, "40": 0 },
  sku: "FP 6",
  cost: 600,
  rating: 5,
  featured: false,
  bestSelling: false,
  newArrival: true,
  description: `Elevate your everyday formal style with our premium export-quality formal shirt/pant. Designed with a sleek fit, smooth breathable fabric, and clean finishing, it offers lasting comfort and a sharp look. Perfect for office wear, corporate meetings, and special occasions.

Features:
- Premium export-quality fabric
- Breathable and comfortable fit
- Smart and elegant design
- Neat stitching and durable buttons
- Suitable for formal and professional wear

Formal Pant Size :
Waist Size =28 Length =40 THIGH =23 LEG OPENING =13 HIP – 39
Waist Size =30 Length =40 THIGH =24 LEG OPENING =13.5 HIP – 41
Waist Size =32 Length =40 THIGH =25 LEG OPENING =14 HIP – 43
Waist Size =34 Length =41 THIGH =26 LEG OPENING =14 HIP – 45
Waist Size =36 Length =41 THIGH =27 LEG OPENING =14 HIP – 47
Waist Size =38 Length =41 THIGH =28 LEG OPENING =14 HIP – 49
`,
  createdAt: "2026-09-08T16:25:00.000Z",
  updatedAt: Date.now()
};

async function sync() {
  console.log("1. Saving to Firestore...");
  try {
    await setDoc(doc(db, "products", lightBeigeProduct.id), lightBeigeProduct, { merge: true });
    console.log("Firestore save SUCCESSFUL for id:", lightBeigeProduct.id);
  } catch (err) {
    console.error("Firestore save error:", err);
  }

  console.log("2. Saving to Supabase...");
  try {
    const sbRow = productToSupabaseRow(lightBeigeProduct);
    const { data, error } = await supabase.from('products').upsert(sbRow, { onConflict: 'id' });
    if (error) {
      console.warn("Supabase upsert returned error:", error);
    } else {
      console.log("Supabase save SUCCESSFUL:", data || "OK");
    }
  } catch (err) {
    console.error("Supabase error:", err);
  }

  console.log("3. Verifying from Firestore...");
  const snap = await getDoc(doc(db, "products", lightBeigeProduct.id));
  if (snap.exists()) {
    console.log("Firestore verified:", snap.data().name, snap.data().image);
  } else {
    console.log("Firestore doc not found!");
  }

  console.log("4. Verifying from Supabase...");
  const { data: sbData, error: sbFetchErr } = await supabase.from('products').select('*').eq('id', lightBeigeProduct.id);
  if (sbFetchErr) {
    console.warn("Supabase fetch error:", sbFetchErr);
  } else {
    console.log("Supabase verified records:", sbData?.length, sbData?.[0]?.name, sbData?.[0]?.image_url || sbData?.[0]?.image);
  }
}

sync().then(() => {
  console.log("ALL SYNC DONE!");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
