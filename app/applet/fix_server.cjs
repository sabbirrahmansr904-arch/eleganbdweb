const fs = require('fs');

let code = fs.readFileSync('/app/applet/server.ts', 'utf8');

// Replace top firebase/firestore imports with Supabase initialization
const oldImportsRegex = /import \{ initializeApp \} from "firebase\/app";[\s\S]*?const db = getFirestore\(firebaseApp, firebaseConfig\.firestoreDatabaseId\);/;

const newSupabaseSetup = `import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wnnnjroxyuxsbolbcdil.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sbGetDoc(collectionName, docId) {
  const rowId = \`\${collectionName}_\${docId}\`;
  try {
    const { data, error } = await supabase.from('app_documents').select('*').eq('id', rowId).single();
    if (error || !data) return { exists: () => false, data: () => null, id: docId };
    return { exists: () => true, data: () => data.data || {}, id: docId };
  } catch {
    return { exists: () => false, data: () => null, id: docId };
  }
}

async function sbSetDoc(collectionName, docId, docData, options) {
  const rowId = \`\${collectionName}_\${docId}\`;
  let finalData = docData;
  if (options?.merge) {
    const existing = await sbGetDoc(collectionName, docId);
    if (existing.exists()) finalData = { ...existing.data(), ...docData };
  }
  await supabase.from('app_documents').upsert({
    id: rowId,
    collection_name: collectionName,
    record_id: docId,
    data: finalData,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
}

async function sbUpdateDoc(collectionName, docId, docData) {
  await sbSetDoc(collectionName, docId, docData, { merge: true });
}

async function sbDeleteDoc(collectionName, docId) {
  const rowId = \`\${collectionName}_\${docId}\`;
  await supabase.from('app_documents').delete().eq('id', rowId);
}

async function sbQuery(collectionName, field, op, value) {
  try {
    const { data, error } = await supabase.from('app_documents').select('*').eq('collection_name', collectionName);
    if (error || !data) return { empty: true, docs: [] };
    const rows = data.filter(row => {
      const docData = row.data || {};
      const val = field === 'id' ? (row.record_id || row.id) : docData[field];
      if (op === '==') return val === value;
      return true;
    });
    return {
      empty: rows.length === 0,
      docs: rows.map(row => ({
        id: row.record_id || row.id.replace(\`\${collectionName}_\`, ''),
        data: () => row.data || {}
      }))
    };
  } catch {
    return { empty: true, docs: [] };
  }
}`;

if (oldImportsRegex.test(code)) {
  code = code.replace(oldImportsRegex, newSupabaseSetup);
} else {
  code = code.replace(/import\s*\{\s*getFirestore[^}]*\}\s*from\s*"firebase\/firestore";/g, '');
  code = code.replace(/import\s*\{\s*initializeApp[^}]*\}\s*from\s*"firebase\/app";/g, '');
  code = code.replace(/const firebaseApp = initializeApp\(firebaseConfig\);/g, '');
  code = code.replace(/const db = getFirestore\(.*\);/g, newSupabaseSetup);
}

// Replace OTP database operations
code = code.replace(/const otpRef = doc\(db,\s*'otps',\s*cleanEmail\);/g, '');
code = code.replace(/await setDoc\(otpRef,\s*\{([^}]+)\}\);/g, `await sbSetDoc('otps', cleanEmail, {$1});`);

code = code.replace(/const otpRef = doc\(db,\s*'otps',\s*email\);/g, '');
code = code.replace(/const otpSnap = await getDoc\(otpRef\);/g, `const otpSnap = await sbGetDoc('otps', email);`);
code = code.replace(/await deleteDoc\(otpRef\);/g, `await sbDeleteDoc('otps', email);`);

// Replace config notifications, pathao, steadfast
code = code.replace(/const configRef = doc\(db,\s*'config',\s*'notification_settings'\);[\s\S]*?const configSnap = await getDoc\(configRef\);/g, `const configSnap = await sbGetDoc('config', 'notification_settings');`);
code = code.replace(/const pathaoRef = doc\(db,\s*'config',\s*'pathao'\);[\s\S]*?const pathaoSnap = await getDoc\(pathaoRef\);/g, `const pathaoSnap = await sbGetDoc('config', 'pathao');`);
code = code.replace(/const sfRef = doc\(db,\s*'config',\s*'steadfast'\);[\s\S]*?const sfSnap = await getDoc\(sfRef\);/g, `const sfSnap = await sbGetDoc('config', 'steadfast');`);

// Replace webhook order queries & updates
const webhookSearch = `      const ordersRef = collection(db, 'orders');
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
      }`;

const webhookReplace = `      let targetOrderDocId = null;
      if (consignmentId) {
        const snap = await sbQuery('orders', 'pathaoConsignmentId', '==', consignmentId);
        if (!snap.empty) {
          targetOrderDocId = snap.docs[0].id;
        } else {
          const snap2 = await sbQuery('orders', 'trackingId', '==', consignmentId);
          if (!snap2.empty) {
            targetOrderDocId = snap2.docs[0].id;
          }
        }
      }
      if (!targetOrderDocId && merchantOrderId) {
        const cleanId = String(merchantOrderId).replace(/^ORD-?/i, '');
        const directDoc = await sbGetDoc('orders', merchantOrderId);
        if (directDoc.exists()) {
          targetOrderDocId = directDoc.id;
        } else {
          const snap3 = await sbQuery('orders', 'invoiceNo', '==', Number(cleanId) || cleanId);
          if (!snap3.empty) {
            targetOrderDocId = snap3.docs[0].id;
          }
        }
      }
      if (targetOrderDocId) {
        const updatePayload = {
          courierStatus: status,
          updatedAt: Date.now()
        };
        if (newOrderStatus) {
          updatePayload.status = newOrderStatus;
          if (newOrderStatus === 'Delivered') {
            updatePayload.deliveredAt = Date.now();
          }
        }
        await sbUpdateDoc('orders', targetOrderDocId, updatePayload);
        return res.status(200).json({ success: true, updated: targetOrderDocId, status: newOrderStatus || status });
      }`;

if (code.includes('pathaoConsignmentId')) {
  code = code.replace(webhookSearch, webhookReplace);
}

// OG image config/banner
code = code.replace(/const heroBannerSnap = await getDoc\(doc\(db,\s*"config",\s*"banner_hero"\)\);/g, `const heroBannerSnap = await sbGetDoc('config', 'banner_hero');`);
code = code.replace(/const brandingSnap = await getDoc\(doc\(db,\s*"config",\s*"branding"\)\);/g, `const brandingSnap = await sbGetDoc('config', 'branding');`);

fs.writeFileSync('/app/applet/server.ts', code, 'utf8');
console.log('Successfully replaced all Firestore calls in server.ts with Supabase!');
