import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
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
      createdAt: new Date().toISOString(),
      updatedAt: Date.now()
    };
    console.log("Creating new Light Beige product in Firestore:", id);
    await setDoc(doc(db, "products", id), newProduct, { merge: true });
    console.log("Successfully created product in Firestore:", JSON.stringify(newProduct, null, 2));
  }
}

main().catch(console.error);
