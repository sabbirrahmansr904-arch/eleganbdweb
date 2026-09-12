import { AbandonedCheckout, CartItem } from '../types';
import { getSupabaseClient, supabase, saveDocumentToSupabase, fetchDocumentsFromSupabase } from '../lib/supabase';

const LOCAL_KEY = 'eleganbd_abandoned_checkouts';

export function getLocalAbandonedCheckouts(): AbandonedCheckout[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalAbandonedCheckouts(list: AbandonedCheckout[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch (e) {}
}

export async function recordDraftCheckout(data: {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  thana?: string;
  items: CartItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
}) {
  if (!data.phone || data.phone.trim().length < 6) return;
  if (!data.items || data.items.length === 0) return;

  const phoneKey = data.phone.trim().replace(/[^0-9]/g, '');
  if (!phoneKey) return;

  const currentList = getLocalAbandonedCheckouts();
  const existingIdx = currentList.findIndex(c => c.phone.replace(/[^0-9]/g, '') === phoneKey && c.status === 'abandoned');

  const record: AbandonedCheckout = {
    id: existingIdx >= 0 ? currentList[existingIdx].id : `ab_${Date.now()}_${phoneKey.slice(-4)}`,
    customerName: data.fullName.trim() || 'Valued Customer',
    phone: data.phone.trim(),
    email: data.email?.trim() || '',
    address: data.address?.trim() || '',
    city: data.city?.trim() || '',
    thana: data.thana?.trim() || '',
    items: data.items,
    subtotal: data.subtotal,
    deliveryCharge: data.deliveryCharge,
    total: data.total,
    createdAt: existingIdx >= 0 ? currentList[existingIdx].createdAt : new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    status: 'abandoned'
  };

  if (existingIdx >= 0) {
    currentList[existingIdx] = record;
  } else {
    currentList.unshift(record);
  }

  // Keep max 200 records
  const trimmed = currentList.slice(0, 200);
  saveLocalAbandonedCheckouts(trimmed);

  // Background sync to Supabase
  try {
    saveDocumentToSupabase('abandoned_checkouts', record.id, record);
  } catch (e) {}
}

export async function clearDraftCheckoutByPhone(phone: string) {
  if (!phone) return;
  const clean = phone.replace(/[^0-9]/g, '');
  const list = getLocalAbandonedCheckouts();
  const updated = list.filter(c => c.phone.replace(/[^0-9]/g, '') !== clean);
  saveLocalAbandonedCheckouts(updated);

  try {
    const client = getSupabaseClient() || supabase;
    if (client) {
      const match = list.find(c => c.phone.replace(/[^0-9]/g, '') === clean);
      if (match) {
        await client.from('app_documents').delete().eq('id', `abandoned_checkouts_${match.id}`);
      }
    }
  } catch (e) {}
}

export async function removeAbandonedCheckout(id: string) {
  const list = getLocalAbandonedCheckouts().filter(c => c.id !== id);
  saveLocalAbandonedCheckouts(list);
  try {
    const client = getSupabaseClient() || supabase;
    if (client) {
      await client.from('app_documents').delete().eq('id', `abandoned_checkouts_${id}`);
    }
  } catch (e) {}
}

export async function fetchAllAbandonedCheckouts(): Promise<AbandonedCheckout[]> {
  const local = getLocalAbandonedCheckouts();
  try {
    const remote = await fetchDocumentsFromSupabase('abandoned_checkouts');
    if (remote && remote.length > 0) {
      const map = new Map<string, AbandonedCheckout>();
      remote.forEach(r => map.set(r.id, r));
      local.forEach(l => map.set(l.id, l));
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.lastActiveAt || b.createdAt).getTime() - new Date(a.lastActiveAt || a.createdAt).getTime()
      );
      saveLocalAbandonedCheckouts(merged);
      return merged;
    }
  } catch (e) {}
  return local;
}
