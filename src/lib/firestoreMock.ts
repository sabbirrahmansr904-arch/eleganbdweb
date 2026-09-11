import { 
  supabase, 
  getSupabaseClient, 
  saveDocumentToSupabase, 
  fetchDocumentsFromSupabase, 
  fetchDocumentFromSupabase, 
  deleteDocumentFromSupabase,
  supabaseRowToOrder,
  orderToSupabaseRow,
  supabaseRowToProduct,
  productToSupabaseRow
} from './supabase';

// Mock DB Instance
export const db = {
  _isMockDb: true,
  type: 'firestore_mock'
};

export const initializeFirestore = () => db;
export const getFirestore = () => db;
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const setLogLevel = () => {};

export interface MockRef {
  type: 'doc' | 'collection' | 'query';
  collectionName: string;
  id?: string;
  path: string;
}

export function doc(dbOrCol: any, ...pathSegments: string[]): MockRef {
  let fullPath = pathSegments.filter(Boolean).join('/');
  if (dbOrCol && typeof dbOrCol === 'object' && dbOrCol.path) {
    fullPath = `${dbOrDocPath(dbOrCol)}/${fullPath}`;
  }
  const parts = fullPath.split('/').filter(Boolean);
  const collectionName = parts[0] || 'general';
  const id = parts[1] || parts[parts.length - 1] || 'default';
  
  return {
    type: 'doc',
    collectionName,
    id,
    path: fullPath
  };
}

function dbOrDocPath(obj: any): string {
  if (!obj || typeof obj !== 'object') return '';
  return obj.path || '';
}

export function collection(dbOrDoc: any, ...pathSegments: string[]): MockRef {
  let fullPath = pathSegments.filter(Boolean).join('/');
  if (dbOrDoc && typeof dbOrDoc === 'object' && dbOrDoc.path) {
    fullPath = `${dbOrDocPath(dbOrDoc)}/${fullPath}`;
  }
  const parts = fullPath.split('/').filter(Boolean);
  const collectionName = parts[0] || 'general';
  
  return {
    type: 'collection',
    collectionName,
    path: fullPath
  };
}

export function query(collectionRef: any, ...constraints: any[]): MockRef {
  return {
    type: 'query',
    collectionName: collectionRef?.collectionName || 'general',
    path: collectionRef?.path || 'general'
  };
}

export function where(field: string, op: string, val: any) {
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, dir?: string) {
  return { type: 'orderBy', field, dir };
}

export function limit(n: number) {
  return { type: 'limit', n };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export const Timestamp = {
  now: () => ({
    toMillis: () => Date.now(),
    toDate: () => new Date(),
    toISOString: () => new Date().toISOString()
  }),
  fromDate: (d: Date) => ({
    toMillis: () => d.getTime(),
    toDate: () => d,
    toISOString: () => d.toISOString()
  }),
  fromMillis: (m: number) => ({
    toMillis: () => m,
    toDate: () => new Date(m),
    toISOString: () => new Date(m).toISOString()
  })
};

export function increment(n: number) {
  return { type: 'increment', value: n };
}

export function arrayUnion(...elements: any[]) {
  return { type: 'arrayUnion', elements };
}

export function arrayRemove(...elements: any[]) {
  return { type: 'arrayRemove', elements };
}

export function deleteField() {
  return { type: 'deleteField' };
}

export function writeBatch(dbInstance?: any) {
  const operations: Array<() => Promise<any>> = [];
  return {
    set: (docRef: MockRef, data: any, options?: any) => {
      operations.push(() => setDoc(docRef, data, options));
    },
    update: (docRef: MockRef, data: any) => {
      operations.push(() => updateDoc(docRef, data));
    },
    delete: (docRef: MockRef) => {
      operations.push(() => deleteDoc(docRef));
    },
    commit: async () => {
      for (const op of operations) {
        await op();
      }
    }
  };
}

export async function runTransaction(dbInstance: any, updateFunction: (transaction: any) => Promise<any>) {
  const transaction = {
    get: async (docRef: MockRef) => getDoc(docRef),
    set: (docRef: MockRef, data: any, options?: any) => setDoc(docRef, data, options),
    update: (docRef: MockRef, data: any) => updateDoc(docRef, data),
    delete: (docRef: MockRef) => deleteDoc(docRef)
  };
  return await updateFunction(transaction);
}

// Async Data Operations via Supabase / Local Storage

function resolveTransforms(existing: any, updateData: any, isMerge: boolean) {
  const base = isMerge && existing && typeof existing === 'object' ? { ...existing } : {};
  if (!updateData || typeof updateData !== 'object') return updateData;

  const result = { ...base };
  for (const [key, val] of Object.entries(updateData)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ((val as any).type === 'increment') {
        const incVal = Number((val as any).value) || 0;
        const current = Number(result[key]) || 0;
        result[key] = current + incVal;
        continue;
      }
      if ((val as any).type === 'arrayUnion') {
        const arr = Array.isArray(result[key]) ? [...result[key]] : [];
        const elements = Array.isArray((val as any).elements) ? (val as any).elements : [];
        elements.forEach(el => {
          if (!arr.includes(el)) arr.push(el);
        });
        result[key] = arr;
        continue;
      }
      if ((val as any).type === 'arrayRemove') {
        const arr = Array.isArray(result[key]) ? [...result[key]] : [];
        const elements = Array.isArray((val as any).elements) ? (val as any).elements : [];
        result[key] = arr.filter(el => !elements.includes(el));
        continue;
      }
      if ((val as any).type === 'deleteField') {
        delete result[key];
        continue;
      }
    }
    result[key] = val;
  }
  return result;
}

export async function setDoc(docRef: MockRef, data: any, options?: { merge?: boolean }) {
  const { collectionName, id } = docRef;
  if (!id) return;

  if (collectionName === 'orders') {
    const row = orderToSupabaseRow({ id, ...data });
    await supabase.from('orders').upsert(row, { onConflict: 'id' });
    return;
  }
  if (collectionName === 'products') {
    const row = productToSupabaseRow({ id, ...data });
    await supabase.from('products').upsert(row, { onConflict: 'id' });
    return;
  }

  // Generic document storage in Supabase with field transforms
  const isMerge = Boolean(options?.merge);
  let finalData = data;
  if (isMerge || Object.values(data || {}).some(v => v && typeof v === 'object' && (v as any).type)) {
    const existing = await fetchDocumentFromSupabase(collectionName, id);
    finalData = resolveTransforms(existing, data, isMerge);
  }

  await saveDocumentToSupabase(collectionName, id, finalData);
}

export async function addDoc(collectionRef: MockRef, data: any) {
  const collectionName = collectionRef.collectionName;
  const id = `${collectionName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(collectionRef, id);
  await setDoc(docRef, data);
  return { id, path: `${collectionName}/${id}` };
}

export async function updateDoc(docRef: MockRef, data: any) {
  return setDoc(docRef, data, { merge: true });
}

export async function deleteDoc(docRef: MockRef) {
  const { collectionName, id } = docRef;
  if (!id) return;

  if (collectionName === 'orders') {
    await supabase.from('orders').delete().eq('id', id);
    return;
  }
  if (collectionName === 'products') {
    await supabase.from('products').delete().eq('id', id);
    return;
  }

  await deleteDocumentFromSupabase(collectionName, id);
}

export async function getDoc(docRef: MockRef) {
  const { collectionName, id } = docRef;
  if (!id) {
    return { exists: () => false, data: () => null, id: '' };
  }

  if (collectionName === 'orders') {
    const { data } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    if (data) {
      const order = supabaseRowToOrder(data);
      return { exists: () => true, data: () => order, id };
    }
  }

  if (collectionName === 'products') {
    const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
    if (data) {
      const product = supabaseRowToProduct(data);
      return { exists: () => true, data: () => product, id };
    }
  }

  const docData = await fetchDocumentFromSupabase(collectionName, id);
  return {
    exists: () => docData !== null && docData !== undefined,
    data: () => docData || null,
    id
  };
}

function createMockQuerySnapshot(docs: any[]) {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: function(callback: (doc: any, index: number) => void) {
      docs.forEach((docItem, index) => {
        callback(docItem, index);
      });
    },
    docChanges: () => docs.map(doc => ({ type: 'added', doc }))
  };
}

export async function getDocs(queryOrCol: MockRef) {
  const collectionName = queryOrCol.collectionName;

  if (collectionName === 'orders') {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const orders = (data || []).map(row => supabaseRowToOrder(row));
    const docs = orders.map(o => ({
      id: o.id,
      data: () => o,
      exists: () => true
    }));
    return createMockQuerySnapshot(docs);
  }

  if (collectionName === 'products') {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    const products = (data || []).map(row => supabaseRowToProduct(row));
    const docs = products.map(p => ({
      id: p.id,
      data: () => p,
      exists: () => true
    }));
    return createMockQuerySnapshot(docs);
  }

  const docsData = await fetchDocumentsFromSupabase(collectionName);
  const docs = docsData.map(item => ({
    id: item.id,
    data: () => item,
    exists: () => true
  }));
  return createMockQuerySnapshot(docs);
}

export function onSnapshot(target: MockRef, onNext: Function, onError?: Function) {
  let isMounted = true;

  const fetchAndNotify = () => {
    if (!isMounted) return;
    if (target.type === 'doc') {
      getDoc(target).then(snapshot => {
        if (isMounted && typeof onNext === 'function') {
          onNext(snapshot);
        }
      }).catch(err => {
        if (isMounted && typeof onError === 'function') onError(err);
      });
    } else {
      getDocs(target).then(snapshot => {
        if (isMounted && typeof onNext === 'function') {
          onNext(snapshot);
        }
      }).catch(err => {
        if (isMounted && typeof onError === 'function') onError(err);
      });
    }
  };

  fetchAndNotify();
  const interval = setInterval(fetchAndNotify, 4000);

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}
