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

// Mock DB descriptor
export const db = {
  _isMockDb: true,
  type: 'supabase_firestore'
};

export const getFirestore = () => db;
export const getFirestoreInstance = () => db;
export const initializeFirestore = () => db;
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

export function collectionGroup(dbInstance: any, collectionId: string): MockRef {
  return {
    type: 'collection',
    collectionName: collectionId,
    path: collectionId
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
  return new Date().toISOString();
}

export const Timestamp = {
  now: () => ({
    toDate: () => new Date(),
    toMillis: () => Date.now(),
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
    toISOString: () => new Date().toISOString()
  }),
  fromDate: (date: Date) => ({
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toISOString: () => date.toISOString()
  }),
  fromMillis: (ms: number) => ({
    toDate: () => new Date(ms),
    toMillis: () => ms,
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toISOString: () => new Date(ms).toISOString()
  })
};

export function increment(n: number) {
  return { __type: 'increment', value: n };
}

export function arrayUnion(...elements: any[]) {
  return { __type: 'arrayUnion', elements };
}

export function arrayRemove(...elements: any[]) {
  return { __type: 'arrayRemove', elements };
}

export function deleteField() {
  return { __type: 'deleteField' };
}

export function writeBatch(dbInstance?: any) {
  const operations: Array<() => Promise<any>> = [];
  return {
    set(docRef: MockRef, data: any, options?: any) {
      operations.push(() => setDoc(docRef, data, options));
      return this;
    },
    update(docRef: MockRef, data: any) {
      operations.push(() => updateDoc(docRef, data));
      return this;
    },
    delete(docRef: MockRef) {
      operations.push(() => deleteDoc(docRef));
      return this;
    },
    async commit() {
      for (const op of operations) {
        await op();
      }
    }
  };
}

export async function runTransaction(dbInstance: any, updateFunction: (transaction: any) => Promise<any>) {
  const transaction = {
    async get(docRef: MockRef) {
      return await getDoc(docRef);
    },
    set(docRef: MockRef, data: any, options?: any) {
      return setDoc(docRef, data, options);
    },
    update(docRef: MockRef, data: any) {
      return updateDoc(docRef, data);
    },
    delete(docRef: MockRef) {
      return deleteDoc(docRef);
    }
  };
  return await updateFunction(transaction);
}

function resolveTransforms(existingData: any, newData: any, isMerge: boolean) {
  let result = isMerge && existingData ? { ...existingData } : {};
  const entries = Object.entries(newData || {});
  
  for (const [key, value] of entries) {
    if (value && typeof value === 'object' && (value as any).__type) {
      const transform = value as any;
      if (transform.__type === 'increment') {
        const currentVal = Number(result[key]) || 0;
        result[key] = currentVal + (Number(transform.value) || 0);
      } else if (transform.__type === 'arrayUnion') {
        const currentArr = Array.isArray(result[key]) ? [...result[key]] : [];
        for (const el of transform.elements || []) {
          if (!currentArr.includes(el)) currentArr.push(el);
        }
        result[key] = currentArr;
      } else if (transform.__type === 'arrayRemove') {
        const currentArr = Array.isArray(result[key]) ? [...result[key]] : [];
        result[key] = currentArr.filter(el => !(transform.elements || []).includes(el));
      } else if (transform.__type === 'deleteField') {
        delete result[key];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function setDoc(docRef: MockRef | any, data: any, options?: any) {
  const collectionName = docRef.collectionName || (docRef.path ? docRef.path.split('/')[0] : '');
  const id = docRef.id || (docRef.path ? docRef.path.split('/').pop() : '');
  if (!id) return;

  if (collectionName === 'orders') {
    const row = orderToSupabaseRow({ id, ...data });
    await supabase.from('orders').upsert(row, { onConflict: 'id' });
    notifySubscribers(collectionName);
    return;
  }
  if (collectionName === 'products') {
    const row = productToSupabaseRow({ id, ...data });
    await supabase.from('products').upsert(row, { onConflict: 'id' });
    notifySubscribers(collectionName);
    return;
  }

  const isMerge = Boolean(options?.merge);
  let finalData = data;
  if (isMerge || Object.values(data || {}).some(v => v && typeof v === 'object' && (v as any).__type)) {
    const existing = await fetchDocumentFromSupabase(collectionName, id);
    finalData = resolveTransforms(existing, data, isMerge);
  }

  await saveDocumentToSupabase(collectionName, id, finalData);
  notifySubscribers(collectionName);
}

export async function addDoc(collectionRef: MockRef | any, data: any) {
  const collectionName = collectionRef.collectionName || (collectionRef.path ? collectionRef.path.split('/')[0] : 'general');
  const id = `${collectionName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(collectionRef, id);
  await setDoc(docRef, { ...data, id });
  return { id, path: `${collectionName}/${id}` };
}

export async function updateDoc(docRef: MockRef | any, data: any) {
  return setDoc(docRef, data, { merge: true });
}

export async function deleteDoc(docRef: MockRef | any) {
  const collectionName = docRef.collectionName || (docRef.path ? docRef.path.split('/')[0] : '');
  const id = docRef.id || (docRef.path ? docRef.path.split('/').pop() : '');
  if (!id) return;

  if (collectionName === 'orders') {
    await supabase.from('orders').delete().eq('id', id);
    notifySubscribers(collectionName);
    return;
  }
  if (collectionName === 'products') {
    await supabase.from('products').delete().eq('id', id);
    notifySubscribers(collectionName);
    return;
  }

  await deleteDocumentFromSupabase(collectionName, id);
  notifySubscribers(collectionName);
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

  const docData = await fetchDocumentFromSupabase(collectionName, id);
  return {
    exists: () => Boolean(docData),
    data: () => docData || null,
    id: id
  };
}

function createMockQuerySnapshot(docs: any[], prevDocsMap?: Map<string, any>, options?: { includeMetadataChanges?: boolean }) {
  const currentMap = new Map<string, any>();
  docs.forEach(d => {
    if (d && d.id) currentMap.set(String(d.id), d);
  });

  const changes: Array<{ type: 'added' | 'modified' | 'removed'; doc: any }> = [];

  if (prevDocsMap && prevDocsMap.size > 0) {
    prevDocsMap.forEach((prevDoc, id) => {
      if (!currentMap.has(id)) {
        changes.push({ type: 'removed', doc: prevDoc });
      }
    });

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

function applyConstraints(items: any[], constraints: any[] = []): any[] {
  let result = [...items];
  if (!constraints || constraints.length === 0) return result;

  for (const c of constraints) {
    if (!c) continue;
    if (c.type === 'where') {
      result = result.filter(item => {
        const val = item[c.field];
        if (c.op === '==' || c.op === '===') return val === c.val;
        if (c.op === '!=') return val !== c.val;
        if (c.op === '>') return val > c.val;
        if (c.op === '>=') return val >= c.val;
        if (c.op === '<') return val < c.val;
        if (c.op === '<=') return val <= c.val;
        if (c.op === 'array-contains') return Array.isArray(val) && val.includes(c.val);
        if (c.op === 'in') return Array.isArray(c.val) && c.val.includes(val);
        return true;
      });
    } else if (c.type === 'orderBy') {
      result.sort((a, b) => {
        const valA = a[c.field];
        const valB = b[c.field];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        const comp = valA < valB ? -1 : 1;
        return c.dir === 'desc' ? -comp : comp;
      });
    } else if (c.type === 'limit') {
      if (typeof c.n === 'number' && c.n > 0) {
        result = result.slice(0, c.n);
      }
    }
  }
  return result;
}

export async function getDocs(queryOrCol: MockRef | any) {
  const collectionName = queryOrCol.collectionName;

  if (collectionName === 'orders') {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    let orders = (data || []).map(row => supabaseRowToOrder(row));
    orders = applyConstraints(orders, queryOrCol.constraints);
    const docs = orders.map(o => ({
      id: o.id,
      data: () => o,
      exists: () => true
    }));
    return createMockQuerySnapshot(docs);
  }

  if (collectionName === 'products') {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    let products = (data || []).map(row => supabaseRowToProduct(row));
    products = applyConstraints(products, queryOrCol.constraints);
    const docs = products.map(p => ({
      id: p.id,
      data: () => p,
      exists: () => true
    }));
    return createMockQuerySnapshot(docs);
  }

  const docsData = await fetchDocumentsFromSupabase(collectionName);
  const filteredData = applyConstraints(docsData, queryOrCol.constraints);
  const docs = filteredData.map(item => ({
    id: item.id,
    data: () => item,
    exists: () => true
  }));
  return createMockQuerySnapshot(docs);
}

// In-memory subscriber registry for ultra-fast multi-tab/live synchronization
const activeSubscribers = new Set<() => void>();
function notifySubscribers(collectionName: string) {
  activeSubscribers.forEach(cb => {
    try { cb(); } catch {}
  });
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
  let isMounted = true;
  let prevDocsMap = new Map<string, any>();

  const fetchAndNotify = async () => {
    if (!isMounted) return;
    try {
      if (target.type === 'doc') {
        const snap = await getDoc(target);
        if (isMounted && typeof onNext === 'function') {
          onNext(snap);
        }
      } else {
        const snap = await getDocs(target);
        if (isMounted && typeof onNext === 'function') {
          onNext(snap);
        }
      }
    } catch (err) {
      if (isMounted && typeof onError === 'function') {
        onError(err);
      }
    }
  };

  fetchAndNotify();

  // Fast polling interval (2.5s) ensuring real-time multi-device consistency
  const interval = setInterval(fetchAndNotify, 2500);

  // Also listen to local notification triggers
  const triggerCb = () => {
    fetchAndNotify();
  };
  activeSubscribers.add(triggerCb);

  return () => {
    isMounted = false;
    clearInterval(interval);
    activeSubscribers.delete(triggerCb);
  };
}
