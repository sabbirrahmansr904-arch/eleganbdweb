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

import {
  getFirestore,
  doc as realDoc,
  collection as realCollection,
  query as realQuery,
  where as realWhere,
  orderBy as realOrderBy,
  limit as realLimit,
  serverTimestamp as realServerTimestamp,
  Timestamp as realTimestamp,
  increment as realIncrement,
  arrayUnion as realArrayUnion,
  arrayRemove as realArrayRemove,
  deleteField as realDeleteField,
  writeBatch as realWriteBatch,
  runTransaction as realRunTransaction,
  setDoc as realSetDoc,
  addDoc as realAddDoc,
  updateDoc as realUpdateDoc,
  deleteDoc as realDeleteDoc,
  getDoc as realGetDoc,
  getDocs as realGetDocs,
  onSnapshot as realOnSnapshot,
  collectionGroup as realCollectionGroup
} from 'firebase/firestore';

import { initializeApp, getApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize the real Firestore instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const realDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Export db as realDb for direct usage
export const db = realDb;

export const initializeFirestore = () => realDb;
export const getFirestoreInstance = () => realDb;
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const setLogLevel = () => {};

export interface MockRef {
  type: 'doc' | 'collection' | 'query';
  collectionName: string;
  id?: string;
  path: string;
  constraints?: any[];
}

export function doc(dbOrCol: any, ...pathSegments: string[]): MockRef {
  let fullPath = pathSegments.filter(Boolean).join('/');
  if (dbOrCol && typeof dbOrCol === 'object' && dbOrCol.path) {
    fullPath = `${dbOrCol.path}/${fullPath}`;
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

export function collection(dbOrDoc: any, ...pathSegments: string[]): MockRef {
  let fullPath = pathSegments.filter(Boolean).join('/');
  if (dbOrDoc && typeof dbOrDoc === 'object' && dbOrDoc.path) {
    fullPath = `${dbOrDoc.path}/${fullPath}`;
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
    path: collectionRef?.path || 'general',
    constraints: constraints
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
  return realServerTimestamp();
}

export const Timestamp = realTimestamp;

export function increment(n: number) {
  return realIncrement(n);
}

export function arrayUnion(...elements: any[]) {
  return realArrayUnion(...elements);
}

export function arrayRemove(...elements: any[]) {
  return realArrayRemove(...elements);
}

export function deleteField() {
  return realDeleteField();
}

export function writeBatch(dbInstance?: any) {
  return realWriteBatch(realDb);
}

export async function runTransaction(dbInstance: any, updateFunction: (transaction: any) => Promise<any>) {
  return realRunTransaction(realDb, updateFunction);
}

// Helper to translate constraints to real Firestore query constraints
function buildRealQuery(collectionName: string, constraints: any[] = []) {
  let qRef: any = realCollection(realDb, collectionName);
  
  if (constraints && constraints.length > 0) {
    const realConstraints = constraints.map(c => {
      if (c.type === 'where') {
        return realWhere(c.field, c.op, c.val);
      }
      if (c.type === 'orderBy') {
        return realOrderBy(c.field, (c.dir || 'asc') as any);
      }
      if (c.type === 'limit') {
        return realLimit(c.n);
      }
      return null;
    }).filter(Boolean);

    if (realConstraints.length > 0) {
      qRef = realQuery(qRef, ...realConstraints);
    }
  }
  
  return qRef;
}

export async function setDoc(docRef: MockRef | any, data: any, options?: any) {
  const collectionName = docRef.collectionName || (docRef.path ? docRef.path.split('/')[0] : '');
  const id = docRef.id || (docRef.path ? docRef.path.split('/').pop() : '');
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

  // Use real Firestore
  const realDocRef = realDoc(realDb, collectionName, id);
  return await realSetDoc(realDocRef, data, options);
}

export async function addDoc(collectionRef: MockRef | any, data: any) {
  const collectionName = collectionRef.collectionName;
  if (collectionName === 'orders' || collectionName === 'products') {
    const id = `${collectionName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(collectionRef, id);
    await setDoc(docRef, data);
    return { id, path: `${collectionName}/${id}` };
  }

  // Real Firestore addDoc
  const realColRef = realCollection(realDb, collectionName);
  const docRef = await realAddDoc(realColRef, data);
  return { id: docRef.id, path: docRef.path };
}

export async function updateDoc(docRef: MockRef | any, data: any) {
  const collectionName = docRef.collectionName || (docRef.path ? docRef.path.split('/')[0] : '');
  const id = docRef.id || (docRef.path ? docRef.path.split('/').pop() : '');
  if (!id) return;

  if (collectionName === 'orders' || collectionName === 'products') {
    return setDoc(docRef, data, { merge: true });
  }

  // Real Firestore updateDoc
  const realDocRef = realDoc(realDb, collectionName, id);
  return await realUpdateDoc(realDocRef, data);
}

export async function deleteDoc(docRef: MockRef | any) {
  const collectionName = docRef.collectionName || (docRef.path ? docRef.path.split('/')[0] : '');
  const id = docRef.id || (docRef.path ? docRef.path.split('/').pop() : '');
  if (!id) return;

  if (collectionName === 'orders') {
    await supabase.from('orders').delete().eq('id', id);
    return;
  }
  if (collectionName === 'products') {
    await supabase.from('products').delete().eq('id', id);
    return;
  }

  // Real Firestore deleteDoc
  const realDocRef = realDoc(realDb, collectionName, id);
  return await realDeleteDoc(realDocRef);
}

export async function getDoc(docRef: MockRef | any) {
  const collectionName = docRef.collectionName || (docRef.path ? docRef.path.split('/')[0] : '');
  const id = docRef.id || (docRef.path ? docRef.path.split('/').pop() : '');
  if (!id) {
    return { exists: () => false, data: () => null, id: '' };
  }

  if (collectionName === 'orders') {
    const { data } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    if (data) {
      const order = supabaseRowToOrder(data);
      return { exists: () => true, data: () => order, id };
    }
    return { exists: () => false, data: () => null, id };
  }

  if (collectionName === 'products') {
    const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
    if (data) {
      const product = supabaseRowToProduct(data);
      return { exists: () => true, data: () => product, id };
    }
    return { exists: () => false, data: () => null, id };
  }

  // Real Firestore
  const realDocRef = realDoc(realDb, collectionName, id);
  const snap = await realGetDoc(realDocRef);
  return {
    exists: () => snap.exists(),
    data: () => snap.data() || null,
    id: snap.id,
    metadata: snap.metadata
  };
}

function createMockQuerySnapshot(docs: any[], prevDocsMap?: Map<string, any>, options?: { includeMetadataChanges?: boolean }) {
  const currentMap = new Map<string, any>();
  docs.forEach(d => {
    if (d && d.id) currentMap.set(String(d.id), d);
  });

  const changes: Array<{ type: 'added' | 'modified' | 'removed'; doc: any }> = [];

  if (prevDocsMap && prevDocsMap.size > 0) {
    // Detect removed docs
    prevDocsMap.forEach((prevDoc, id) => {
      if (!currentMap.has(id)) {
        changes.push({ type: 'removed', doc: prevDoc });
      }
    });

    // Detect added or modified docs
    docs.forEach(currentDoc => {
      const prevDoc = prevDocsMap.get(String(currentDoc.id));
      if (!prevDoc) {
        changes.push({ type: 'added', doc: currentDoc });
      } else {
        const currDataStr = JSON.stringify(typeof currentDoc.data === 'function' ? currentDoc.data() : currentDoc.data);
        const prevDataStr = JSON.stringify(typeof prevDoc.data === 'function' ? prevDoc.data() : prevDoc.data);
        if (currDataStr !== prevDataStr) {
          changes.push({ type: 'modified', doc: currentDoc });
        }
      }
    });
  } else {
    // Initial snapshot: all docs are 'added'
    docs.forEach(docItem => {
      changes.push({ type: 'added', doc: docItem });
    });
  }

  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    metadata: {
      hasPendingWrites: false,
      fromCache: false,
      includeMetadataChanges: Boolean(options?.includeMetadataChanges)
    },
    forEach: function(callback: (doc: any, index: number) => void) {
      docs.forEach((docItem, index) => {
        callback(docItem, index);
      });
    },
    docChanges: () => changes
  };
}

export async function getDocs(queryOrCol: MockRef | any) {
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

  // Real Firestore
  const qRef = buildRealQuery(collectionName, queryOrCol.constraints);
  const snap = await realGetDocs(qRef);
  const docs = snap.docs.map(d => ({
    id: d.id,
    data: () => d.data(),
    exists: () => d.exists(),
    metadata: d.metadata
  }));
  return createMockQuerySnapshot(docs);
}

export function onSnapshot(
  target: MockRef | any,
  optionsOrOnNext: any,
  onNextOrOnError?: any,
  maybeOnError?: any
) {
  let options = { includeMetadataChanges: false };
  let onNext: Function;
  let onError: Function | undefined;

  if (typeof optionsOrOnNext === 'function') {
    onNext = optionsOrOnNext;
    onError = onNextOrOnError;
  } else {
    options = optionsOrOnNext || options;
    onNext = onNextOrOnError;
    onError = maybeOnError;
  }

  const collectionName = target.collectionName || (target.path ? target.path.split('/')[0] : '');

  if (collectionName === 'orders' || collectionName === 'products') {
    let isMounted = true;
    let prevDocsMap = new Map<string, any>();

    const fetchAndNotify = () => {
      if (!isMounted) return;
      if (collectionName === 'orders') {
        supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
          if (!isMounted) return;
          if (error) {
            if (typeof onError === 'function') onError(error);
            return;
          }
          const orders = (data || []).map(row => supabaseRowToOrder(row));
          const docs = orders.map(o => ({
            id: o.id,
            data: () => o,
            exists: () => true
          }));
          const snap = createMockQuerySnapshot(docs, prevDocsMap, options);
          prevDocsMap = new Map();
          docs.forEach(d => prevDocsMap.set(String(d.id), d));
          if (typeof onNext === 'function') onNext(snap);
        }).catch(err => {
          if (isMounted && typeof onError === 'function') onError(err);
        });
      } else {
        supabase.from('products').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
          if (!isMounted) return;
          if (error) {
            if (typeof onError === 'function') onError(error);
            return;
          }
          const products = (data || []).map(row => supabaseRowToProduct(row));
          const docs = products.map(p => ({
            id: p.id,
            data: () => p,
            exists: () => true
          }));
          const snap = createMockQuerySnapshot(docs, prevDocsMap, options);
          prevDocsMap = new Map();
          docs.forEach(d => prevDocsMap.set(String(d.id), d));
          if (typeof onNext === 'function') onNext(snap);
        }).catch(err => {
          if (isMounted && typeof onError === 'function') onError(err);
        });
      }
    };

    fetchAndNotify();
    const interval = setInterval(fetchAndNotify, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }

  // Real Firestore onSnapshot
  if (target.type === 'doc') {
    const id = target.id || (target.path ? target.path.split('/').pop() : '');
    const realDocRef = realDoc(realDb, collectionName, id);
    return realOnSnapshot(realDocRef, options, (snap) => {
      const mockSnap = {
        exists: () => snap.exists(),
        data: () => snap.data() || null,
        id: snap.id,
        metadata: snap.metadata
      };
      onNext(mockSnap);
    }, (err) => {
      if (onError) onError(err);
    });
  } else {
    const qRef = buildRealQuery(collectionName, target.constraints);
    return realOnSnapshot(qRef, options, (snap) => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        data: () => d.data(),
        exists: () => d.exists(),
        metadata: d.metadata
      }));
      const mockSnap = createMockQuerySnapshot(docs, undefined, options);
      onNext(mockSnap);
    }, (err) => {
      if (onError) onError(err);
    });
  }
}
