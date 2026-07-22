import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  const snap1 = await getDoc(doc(db, "config", "notification_settings"));
  if (snap1.exists()) {
    console.log("NOTIFICATION SETTINGS:", snap1.data());
  } else {
    console.log("NOTIFICATION SETTINGS DOCUMENT DOES NOT EXIST!");
  }

  const snap2 = await getDoc(doc(db, "config", "sms_otp"));
  if (snap2.exists()) {
    console.log("SMS OTP SETTINGS:", snap2.data());
  } else {
    console.log("SMS OTP SETTINGS DOCUMENT DOES NOT EXIST!");
  }
  process.exit(0);
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
