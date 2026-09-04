import { getSupabaseClient } from './supabase';

export const db = {} as any;

class DocumentSnapshot {
  constructor(private _id: string, private _data: any | null) {}
  exists() {
    return this._data !== null && this._data !== undefined;
  }
  data() {
    return this._data;
  }
  get id() {
    return this._id;
  }
}

class QueryDocumentSnapshot {
  constructor(private _id: string, private _data: any) {}
  data() {
    return this._data;
  }
  get id() {
    return this._id;
  }
  get(field: string) {
    return this._data ? this._data[field] : undefined;
  }
}

class QuerySnapshot {
  docs: QueryDocumentSnapshot[];
  constructor(rawRows: any[], collectionName: string) {
    this.docs = rawRows.map(row => {
      const recordId = row.record_id || row.id.replace(`${collectionName}_`, '');
      const data = row.data || {};
      return new QueryDocumentSnapshot(recordId, { id: recordId, ...data });
    });
  }
  forEach(callback: (doc: QueryDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
  get size() {
    return this.docs.length;
  }
  get empty() {
    return this.docs.length === 0;
  }
}

export function collection(_db: any, collectionName: string) {
  return { type: 'collection', name: collectionName };
}

export function doc(...args: any[]) {
  if (args.length === 2 && args[0]?.type === 'collection') {
    // doc(collectionRef, docId)
    const colName = args[0].name;
    const docId = args[1] || Math.random().toString(36).substring(2, 12);
    return { type: 'doc', collectionName: colName, id: docId };
  } else if (args.length >= 3) {
    // doc(db, collectionName, docId)
    const colName = args[1];
    const docId = args[2] || Math.random().toString(36).substring(2, 12);
    return { type: 'doc', collectionName: colName, id: docId };
  } else if (args.length === 1 && typeof args[0] === 'string') {
    return { type: 'doc', collectionName: args[0], id: Math.random().toString(36).substring(2, 12) };
  }
  return { type: 'doc', collectionName: 'unknown', id: Math.random().toString(36).substring(2, 12) };
}

export function query(collectionRefOrQuery: any, ...constraints: any[]) {
  const collectionName = collectionRefOrQuery.name || collectionRefOrQuery.collectionName;
  const existingConstraints = collectionRefOrQuery.constraints || [];
  return {
    type: 'query',
    name: collectionName,
    collectionName,
    constraints: [...existingConstraints, ...constraints]
  };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(n: number) {
  return { type: 'limit', n };
}

export async function getDocs(collectionRefOrQuery: any): Promise<QuerySnapshot> {
  const client = getSupabaseClient();
  const collectionName = collectionRefOrQuery.name || collectionRefOrQuery.collectionName;
  if (!client || !collectionName) {
    return new QuerySnapshot([], collectionName || 'unknown');
  }

  try {
    const { data, error } = await client
      .from('app_documents')
      .select('*')
      .eq('collection_name', collectionName);

    if (error || !data) {
      return new QuerySnapshot([], collectionName);
    }

    let rows = data;
    const constraints = collectionRefOrQuery.constraints || [];

    // Apply where filters
    for (const c of constraints) {
      if (c.type === 'where') {
        rows = rows.filter(row => {
          const docData = row.data || {};
          const val = c.field === 'id' ? (row.record_id || row.id) : docData[c.field];
          if (c.op === '==') return val === c.value;
          if (c.op === '===') return val === c.value;
          if (c.op === '!=') return val !== c.value;
          if (c.op === '>') return val > c.value;
          if (c.op === '>=') return val >= c.value;
          if (c.op === '<') return val < c.value;
          if (c.op === '<=') return val <= c.value;
          if (c.op === 'in' && Array.isArray(c.value)) return c.value.includes(val);
          if (c.op === 'array-contains' && Array.isArray(val)) return val.includes(c.value);
          return true;
        });
      }
    }

    // Apply orderBy
    for (const c of constraints) {
      if (c.type === 'orderBy') {
        rows.sort((a, b) => {
          const valA = a.data?.[c.field] ?? a[c.field] ?? '';
          const valB = b.data?.[c.field] ?? b[c.field] ?? '';
          if (valA < valB) return c.direction === 'desc' ? 1 : -1;
          if (valA > valB) return c.direction === 'desc' ? -1 : 1;
          return 0;
        });
      }
    }

    // Apply limit
    for (const c of constraints) {
      if (c.type === 'limit') {
        rows = rows.slice(0, c.n);
      }
    }

    return new QuerySnapshot(rows, collectionName);
  } catch (err) {
    console.warn('Supabase getDocs shim error:', err);
    return new QuerySnapshot([], collectionName);
  }
}

export async function getDoc(docRef: any): Promise<DocumentSnapshot> {
  const client = getSupabaseClient();
  const collectionName = docRef.collectionName;
  const docId = docRef.id;
  if (!client || !collectionName || !docId) {
    return new DocumentSnapshot(docId || '', null);
  }

  try {
    const rowId = `${collectionName}_${docId}`;
    const { data, error } = await client
      .from('app_documents')
      .select('*')
      .eq('id', rowId)
      .single();

    if (error || !data) {
      return new DocumentSnapshot(docId, null);
    }
    const docData = data.data || {};
    return new DocumentSnapshot(docId, { id: docId, ...docData });
  } catch {
    return new DocumentSnapshot(docId, null);
  }
}

export async function setDoc(docRef: any, data: any, options?: { merge?: boolean }): Promise<void> {
  const client = getSupabaseClient();
  const collectionName = docRef.collectionName;
  const docId = docRef.id;
  if (!client || !collectionName || !docId) return;

  const rowId = `${collectionName}_${docId}`;
  let finalData = data;

  if (options?.merge) {
    try {
      const existing = await getDoc(docRef);
      if (existing.exists()) {
        finalData = { ...existing.data(), ...data };
      }
    } catch {}
  }

  await client
    .from('app_documents')
    .upsert({
      id: rowId,
      collection_name: collectionName,
      record_id: docId,
      data: finalData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
}

export async function addDoc(collectionRef: any, data: any): Promise<any> {
  const client = getSupabaseClient();
  const collectionName = collectionRef.name || collectionRef.collectionName;
  const docId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10);
  const rowId = `${collectionName}_${docId}`;

  if (client && collectionName) {
    await client
      .from('app_documents')
      .upsert({
        id: rowId,
        collection_name: collectionName,
        record_id: docId,
        data: { id: docId, ...data },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
  }

  return { type: 'doc', collectionName, id: docId };
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  await setDoc(docRef, data, { merge: true });
}

export async function deleteDoc(docRef: any): Promise<void> {
  const client = getSupabaseClient();
  const collectionName = docRef.collectionName;
  const docId = docRef.id;
  if (!client || !collectionName || !docId) return;

  const rowId = `${collectionName}_${docId}`;
  await client
    .from('app_documents')
    .delete()
    .eq('id', rowId);
}

export function onSnapshot(collectionRefOrQuery: any, callback: (snapshot: QuerySnapshot) => void, _errorCallback?: (err: any) => void) {
  let isCancelled = false;

  const fetchAndTrigger = async () => {
    if (isCancelled) return;
    try {
      const snapshot = await getDocs(collectionRefOrQuery);
      if (!isCancelled) {
        callback(snapshot);
      }
    } catch (err) {
      if (_errorCallback) _errorCallback(err);
    }
  };

  // Initial fetch
  fetchAndTrigger();

  // Poll every 3 seconds for live sync
  const interval = setInterval(fetchAndTrigger, 3000);

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export function arrayUnion(...elements: any[]) {
  return { type: 'arrayUnion', elements };
}

export function arrayRemove(...elements: any[]) {
  return { type: 'arrayRemove', elements };
}
