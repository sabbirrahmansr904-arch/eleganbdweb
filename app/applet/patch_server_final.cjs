const fs = require('fs');

let code = fs.readFileSync('/app/applet/server.ts', 'utf8');

const supabaseSetup = `import { createClient } from '@supabase/supabase-js';

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

code = code.replace(/import\s*\{\s*initializeApp\s*\}\s*from\s*"firebase\/app";/g, '');
code = code.replace(/import\s*\{\s*getFirestore[^}]*\}\s*from\s*"firebase\/firestore";/g, supabaseSetup);
code = code.replace(/const firebaseConfig = require\("\.\/firebase-applet-config\.json"\);/g, '');
code = code.replace(/const firebaseApp = initializeApp\(firebaseConfig\);/g, '');
code = code.replace(/const db = getFirestore\(firebaseApp, firebaseConfig\.firestoreDatabaseId\);/g, '');

code = code.replace(/const otpRef = doc\(db,\s*'otps',\s*cleanEmail\);/g, '');
code = code.replace(/await setDoc\(otpRef,\s*\{([^}]+)\}\);/g, `await sbSetDoc('otps', cleanEmail, {$1});`);

code = code.replace(/const otpRef = doc\(db,\s*'otps',\s*email\);/g, '');
code = code.replace(/const otpSnap = await getDoc\(otpRef\);/g, `const otpSnap = await sbGetDoc('otps', email);`);
code = code.replace(/await deleteDoc\(otpRef\);/g, `await sbDeleteDoc('otps', email);`);

code = code.replace(/const configRef = doc\(db,\s*'config',\s*'notification_settings'\);[\s\S]*?const configSnap = await getDoc\(configRef\);/g, `const configSnap = await sbGetDoc('config', 'notification_settings');`);
code = code.replace(/const pathaoRef = doc\(db,\s*'config',\s*'pathao'\);[\s\S]*?const pathaoSnap = await getDoc\(pathaoRef\);/g, `const pathaoSnap = await sbGetDoc('config', 'pathao');`);
code = code.replace(/const sfRef = doc\(db,\s*'config',\s*'steadfast'\);[\s\S]*?const sfSnap = await getDoc\(sfRef\);/g, `const sfSnap = await sbGetDoc('config', 'steadfast');`);
code = code.replace(/const sfRef = doc\(db,\s*'config',\s*'steadfast'\);/g, '');
code = code.replace(/const sfSnap = await getDoc\(sfRef\);/g, `const sfSnap = await sbGetDoc('config', 'steadfast');`);

code = code.replace(/const heroBannerSnap = await getDoc\(doc\(db,\s*"config",\s*"banner_hero"\)\);/g, `const heroBannerSnap = await sbGetDoc('config', 'banner_hero');`);
code = code.replace(/const brandingSnap = await getDoc\(doc\(db,\s*"config",\s*"branding"\)\);/g, `const brandingSnap = await sbGetDoc('config', 'branding');`);

fs.writeFileSync('/app/applet/server.ts', code, 'utf8');
console.log('server.ts successfully patched!');
