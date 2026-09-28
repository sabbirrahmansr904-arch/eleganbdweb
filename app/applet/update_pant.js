import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  const snap = await getDocs(collection(db, "products"));
  console.log("Total products in Firestore:", snap.size);
  const pants = [];
  snap.forEach(d => {
    const data = d.data();
    if ((data.name || "").toLowerCase().includes("pant") || (data.category || "").toLowerCase().includes("pant") || (data.sku || "").startsWith("FP") || (data.name || "").toLowerCase().includes("light beige") || (data.name || "").toLowerCase().includes("beige")) {
      pants.push({ id: d.id, ...data });
    }
  });
  console.log("Pants found:", JSON.stringify(pants.map(p => ({ id: p.id, name: p.name, sku: p.sku, image: p.image })), null, 2));

  // Check if Man's Formal Pant - Light Beige already exists
  let lightBeige = pants.find(p => (p.name || "").toLowerCase().includes("light beige") || (p.name || "").toLowerCase().includes("beige"));
  
  const targetImageUrl = "https://i.postimg.cc/nVdvWww8/file-00000000e0bc8211a50101c686f1f31d.png";
  
  if (lightBeige) {
    console.log("Updating existing Light Beige product:", lightBeige.id);
    const updated = {
      ...lightBeige,
      image: targetImageUrl,
      images: [targetImageUrl],
      updatedAt: Date.now()
    };
    await setDoc(doc(db, "products", lightBeige.id), updated, { merge: true });
    console.log("Successfully updated product in Firestore:", JSON.stringify(updated, null, 2));
  } else {
    // Determine next ID and SKU
    const id = "1785257276974";
    const sku = "FP 6";
    const newProduct = {
      id,
      name: "Man's Formal Pant - Light Beige",
      price: 999,
      regularPrice: 1399,
      category: "Formal Pant",
      image: targetImageUrl,
      images: [targetImageUrl],
      sizes: ["28", "30", "32", "34", "36", "38", "40"],
      stock: 65,
      sizeStock: { "28": 1, "30": 12, "32": 18, "34": 20, "36": 10, "38": 4, "40": 0 },
      sku,
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
      createdAt: new Date().toISOString(),
      updatedAt: Date.now()
    };
    console.log("Creating new Light Beige product in Firestore:", id);
    await setDoc(doc(db, "products", id), newProduct, { merge: true });
    console.log("Successfully created product in Firestore:", JSON.stringify(newProduct, null, 2));
  }
}

main().catch(console.error);
