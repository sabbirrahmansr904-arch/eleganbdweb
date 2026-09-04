const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Replace top imports
const oldImports = `import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { createRequire } from "module";

dotenv.config();
const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);`;

const newSupabaseHelpers = `import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wnnnjroxyuxsbolbcdil.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sbGetDoc(collectionName, docId) {
  const rowId = \`\${collectionName}_\${docId}\`;
  try {
    const { data, error } = await supabase
      .from('app_documents')
      .select('*')
      .eq('id', rowId)
      .single();
    if (error || !data) {
      return { exists: () => false, data: () => null, id: docId };
    }
    return {
      exists: () => true,
      data: () => data.data || {},
      id: docId
    };
  } catch {
    return { exists: () => false, data: () => null, id: docId };
  }
}

async function sbSetDoc(collectionName, docId, docData, options) {
  const rowId = \`\${collectionName}_\${docId}\`;
  let finalData = docData;
  if (options?.merge) {
    const existing = await sbGetDoc(collectionName, docId);
    if (existing.exists()) {
      finalData = { ...existing.data(), ...docData };
    }
  }
  await supabase
    .from('app_documents')
    .upsert({
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
  await supabase
    .from('app_documents')
    .delete()
    .eq('id', rowId);
}

async function sbQuery(collectionName, field, op, value) {
  try {
    const { data, error } = await supabase
      .from('app_documents')
      .select('*')
      .eq('collection_name', collectionName);

    if (error || !data) {
      return { empty: true, docs: [] };
    }

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

if (code.includes('firebase/firestore')) {
  code = code.replace(oldImports, newSupabaseHelpers);
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Done!');
