import { createClient } from "@supabase/supabase-js";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection } from "firebase/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eeifewkhrtveenyrrirj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XD9wPgNEzlHdAaJ2RN_BFw_izYEgB2p';
const supabase = createClient(supabaseUrl, supabaseKey);

const targetFormalPantImg = "https://i.postimg.cc/DZ8d79ZS/85a6253065fdedb2d422e0b15bbba34f-(1)-jpg.jpg";

async function main() {
  console.log("Fetching categories from Firestore...");
  const snap = await getDocs(collection(db, "categories"));
  console.log(`Found ${snap.size} categories in Firestore.`);
  let formalPantCategory = null;

  snap.forEach(d => {
    const data = d.data();
    console.log(`Category: [${d.id}] name: "${data.name}", slug: "${data.slug}", image: "${data.image}"`);
    if ((data.name || '').toLowerCase().includes('formal pant') || (data.slug || '').toLowerCase().includes('formal-pant') || (data.name || '').toLowerCase() === 'formal pant') {
      formalPantCategory = { id: d.id, ...data };
    }
  });

  if (formalPantCategory) {
    console.log("Found existing Formal Pant category:", formalPantCategory.id);
    const updated = {
      ...formalPantCategory,
      image: targetFormalPantImg,
      updatedAt: Date.now()
    };
    await setDoc(doc(db, "categories", formalPantCategory.id), updated, { merge: true });
    console.log("Updated Firestore Formal Pant category:", formalPantCategory.id);

    try {
      await supabase.from('categories').upsert({
        id: formalPantCategory.id,
        name: updated.name,
        slug: updated.slug || 'formal-pant',
        image: targetFormalPantImg,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      console.log("Synced Formal Pant category to Supabase!");
    } catch (e) {
      console.warn("Supabase category notice:", e.message);
    }
  } else {
    console.log("Creating new Formal Pant category in Firestore & Supabase...");
    const id = "3";
    const newCategory = {
      id,
      name: "Formal Pant",
      slug: "formal-pant",
      description: "Tailored formal pants",
      image: targetFormalPantImg,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now()
    };
    await setDoc(doc(db, "categories", id), newCategory, { merge: true });
    console.log("Created Firestore Formal Pant category:", id);

    try {
      await supabase.from('categories').upsert({
        id: newCategory.id,
        name: newCategory.name,
        slug: newCategory.slug,
        description: newCategory.description,
        image: targetFormalPantImg,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      console.log("Synced new Formal Pant category to Supabase!");
    } catch (e) {
      console.warn("Supabase category notice:", e.message);
    }
  }

  console.log("ALL SYNC DONE FOR FORMAL PANT CATEGORY!");
}

main().catch(console.error);


