import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eeifewkhrtveenyrrirj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XD9wPgNEzlHdAaJ2RN_BFw_izYEgB2p';
const supabase = createClient(supabaseUrl, supabaseKey);

const targetHeroDesktopUrl = "https://i.postimg.cc/x8yjW792/41122a78-98cd-4c99-8ee3-b3ef820b0727.jpg";

async function main() {
  console.log("Updating hero banner in Firestore...");
  // Update config/banner_hero
  await setDoc(doc(db, "config", "banner_hero"), {
    url: targetHeroDesktopUrl,
    desktopUrl: targetHeroDesktopUrl,
    updatedAt: Date.now()
  }, { merge: true });
  console.log("Updated config/banner_hero in Firestore");

  // Update config/branding
  await setDoc(doc(db, "config", "branding"), {
    heroBannerUrl: targetHeroDesktopUrl,
    bannerUrl: targetHeroDesktopUrl,
    updatedAt: Date.now()
  }, { merge: true });
  console.log("Updated config/branding in Firestore");

  // Update Supabase if config/settings table exists
  try {
    const { error: sbErr1 } = await supabase.from('config').upsert({
      id: 'banner_hero',
      url: targetHeroDesktopUrl,
      desktopUrl: targetHeroDesktopUrl,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (sbErr1) console.log("Supabase config/banner_hero notice:", sbErr1.message);
  } catch (e) {}

  try {
    const { error: sbErr2 } = await supabase.from('config').upsert({
      id: 'branding',
      hero_banner_url: targetHeroDesktopUrl,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (sbErr2) console.log("Supabase config/branding notice:", sbErr2.message);
  } catch (e) {}

  // Verify Firestore
  const snap1 = await getDoc(doc(db, "config", "banner_hero"));
  console.log("Verified config/banner_hero:", snap1.data());
  const snap2 = await getDoc(doc(db, "config", "branding"));
  console.log("Verified config/branding heroBannerUrl:", snap2.data()?.heroBannerUrl);

  console.log("Hero Banner desktop URL successfully updated!");
}

main().catch(console.error);
