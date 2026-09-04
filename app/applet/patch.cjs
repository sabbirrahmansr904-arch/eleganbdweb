const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace firebase imports with supabase helper
code = code.replace(/import { initializeApp } from "firebase\/app";[\s\S]*?const db = getFirestore\(firebaseApp, firebaseConfig\.firestoreDatabaseId\);/, `import { createClient } from '@supabase/supabase-js';

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
}`);

// Replace doc/setDoc/getDoc/deleteDoc/getDocs/updateDoc calls in server.ts
code = code.replace(/doc\(db,\s*'otps',\s*cleanEmail\)/g, "'otps'");
code = code.replace(/setDoc\(otpRef,\s*\{([^}]+)\}\)/g, "sbSetDoc('otps', cleanEmail, {$1})");
code = code.replace(/doc\(db,\s*'otps',\s*email\)/g, "'otps'");
code = code.replace(/getDoc\(otpRef\)/g, "sbGetDoc('otps', email)");
code = code.replace(/deleteDoc\(otpRef\)/g, "sbDeleteDoc('otps', email)");

code = code.replace(/doc\(db,\s*'config',\s*'notification_settings'\)/g, "'config', 'notification_settings'");
code = code.replace(/doc\(db,\s*'config',\s*'pathao'\)/g, "'config', 'pathao'");
code = code.replace(/doc\(db,\s*'config',\s*'steadfast'\)/g, "'config', 'steadfast'");
code = code.replace(/doc\(db,\s*"config",\s*"banner_hero"\)/g, "'config', 'banner_hero'");
code = code.replace(/doc\(db,\s*"config",\s*"branding"\)/g, "'config', 'branding'");

// Replace getDoc(doc(...)) pattern
code = code.replace(/await getDoc\(doc\(db,\s*'([^']+)',\s*'([^']+)'\)\)/g, "await sbGetDoc('$1', '$2')");
code = code.replace(/await getDoc\(doc\(db,\s*"([^"]+)",\s*"([^"]+)"\)\)/g, "await sbGetDoc('$1', '$2')");
code = code.replace(/await getDoc\(configRef\)/g, "await sbGetDoc('config', 'notification_settings')");
code = code.replace(/await getDoc\(pathaoRef\)/g, "await sbGetDoc('config', 'pathao')");
code = code.replace(/await getDoc\(sfRef\)/g, "await sbGetDoc('config', 'steadfast')");

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patch applied successfully!');
