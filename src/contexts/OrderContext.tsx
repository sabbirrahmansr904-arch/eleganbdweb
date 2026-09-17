import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Order } from '../types';
import { supabase, orderToSupabaseRow, supabaseRowToOrder } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { useInventory } from './InventoryContext';
import { isDeliveredOrSuccess, compareOrdersByInvoice, canChangeOrderStatus, isCancelledStatus } from '../utils/orderUtils';
import { safeApiFetch } from '../utils/apiClient';

interface OrderContextType {
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status'], overrideLock?: boolean) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order> & Record<string, any>, overrideLock?: boolean) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  deleteMultipleOrders: (ids: string[]) => Promise<void>;
  deleteAllOrders: () => Promise<void>;
  addOrder: (order: Order) => Promise<Order>;
  getNextOrderId: () => string;
  loading: boolean;
  lastOrder?: Order | null;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const BASE_ORDER_ID = 2670000;
const CACHE_KEYS = ['eleganbd_all_orders_v5', 'eleganbd_all_orders', 'eleganbd_orders', 'orders'];

export const extractNumericId = (idStr: string | number | undefined): number | null => {
  if (!idStr) return null;
  const cleaned = String(idStr).replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  // Must be valid number, not an arbitrary epoch timestamp (> 10 billion)
  if (!isNaN(num) && num < 10000000000) {
    return num;
  }
  return null;
};

export const loadAllStoredOrders = (): Order[] => {
  const ordersMap = new Map<string, Order>();
  for (const key of CACHE_KEYS) {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((o: any) => {
            if (o && o.id) {
              const existing = ordersMap.get(String(o.id));
              if (existing) {
                ordersMap.set(String(o.id), { ...existing, ...o });
              } else {
                ordersMap.set(String(o.id), o);
              }
            }
          });
        }
      }
    } catch (e) {}
  }
  const list = Array.from(ordersMap.values());
  list.sort((a, b) => compareOrdersByInvoice(a, b, 'desc'));
  return list;
};

export const generateNextOrderId = (ordersList: Order[], lastCounterId?: number): string => {
  let maxId = BASE_ORDER_ID;

  if (typeof lastCounterId === 'number' && lastCounterId >= BASE_ORDER_ID) {
    if (lastCounterId > maxId) maxId = lastCounterId;
  }

  // Check in-memory list
  if (Array.isArray(ordersList)) {
    for (const o of ordersList) {
      const numFromId = extractNumericId(o?.id);
      if (numFromId && numFromId > maxId) maxId = numFromId;
      if (typeof o?.invoiceNo === 'number' && o.invoiceNo > maxId) maxId = o.invoiceNo;
    }
  }

  // Check localStorage caches as secondary guard
  const stored = loadAllStoredOrders();
  for (const o of stored) {
    const num = extractNumericId(o?.id);
    if (num && num > maxId) maxId = num;
    if (typeof o?.invoiceNo === 'number' && o.invoiceNo > maxId) maxId = o.invoiceNo;
  }

  return String(maxId + 1);
};

export const saveOrdersToCache = (ordersToCache: Order[]) => {
  if (!Array.isArray(ordersToCache)) return;
  try {
    const light = ordersToCache.map(o => {
      if (!o) return o;
      const lightItems = Array.isArray(o.items) ? o.items.map(it => {
        if (!it) return it;
        const itemCopy = { ...it };
        if (itemCopy.images) delete itemCopy.images;
        if (typeof itemCopy.image === 'string' && itemCopy.image.length > 500) {
          delete itemCopy.image;
        }
        return itemCopy;
      }) : [];
      return {
        ...o,
        items: lightItems
      };
    });
    const serialized = JSON.stringify(light);
    for (const key of CACHE_KEYS) {
      try {
        localStorage.setItem(key, serialized);
      } catch {}
    }
  } catch (e) {
    console.warn('[OrderContext] LocalStorage cache save warning:', e);
  }
};

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    return loadAllStoredOrders();
  });
  
  const [loading, setLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const lastCounterRef = useRef<number>(BASE_ORDER_ID);
  const deletedOrderIdsRef = useRef<Set<string>>(new Set());

  // Real-time synchronization tracking refs
  const lastKnownCountRef = useRef<number | null>(null);
  const lastKnownTopIdRef = useRef<string | null>(null);
  const lastKnownUpdatedAtRef = useRef<string | null>(null);

  const { currentUser, isAdmin } = useAuth();
  const { products, updateProduct } = useProducts();
  const { addTransaction } = useInventory();

  const getAuthorizedBy = (order: Order) => {
    if (order?.invoiceBy && typeof order.invoiceBy === 'string' && order.invoiceBy.toLowerCase().includes('website')) {
      return 'Website';
    }
    return order?.invoiceBy || currentUser?.displayName || currentUser?.email || 'Admin';
  };

  // Helper to notify other browser tabs instantly
  const broadcastSync = (type: string, payload?: any) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('eleganbd_orders_sync_channel');
        channel.postMessage({ type, payload, timestamp: Date.now() });
        channel.close();
      }
    } catch (err) {}
  };

  // 1. Initial Load, Rapid Real-time Sync & Broadcast Channel
  useEffect(() => {
    let isMounted = true;

    const replaceAndSetOrders = (incoming: Order[]) => {
      if (!isMounted || !Array.isArray(incoming)) return;
      const valid = incoming.filter(o => {
        if (!o || !o.id) return false;
        const idStr = String(o.id);
        const invStr = o.invoiceNo ? String(o.invoiceNo) : '';
        return !deletedOrderIdsRef.current.has(idStr) && (!invStr || !deletedOrderIdsRef.current.has(invStr));
      });

      let maxObservedId = BASE_ORDER_ID;
      valid.forEach((o) => {
        const numId = extractNumericId(o.id);
        if (numId && numId > maxObservedId) maxObservedId = numId;
        if (typeof o.invoiceNo === 'number' && o.invoiceNo > maxObservedId) {
          maxObservedId = o.invoiceNo;
        }
      });

      if (maxObservedId > lastCounterRef.current) {
        lastCounterRef.current = maxObservedId;
      }

      valid.sort((a, b) => compareOrdersByInvoice(a, b, 'desc'));

      setOrders(valid);
      saveOrdersToCache(valid);
      setLoading(false);
    };

    const mergeAndSetOrders = (newIncoming: Order[], isAuthoritativeFullList = false) => {
      if (!isMounted || !Array.isArray(newIncoming) || newIncoming.length === 0) return;
      
      setOrders(prev => {
        const incomingMap = new Map<string, Order>();
        newIncoming.forEach(o => {
          if (o && o.id) {
            incomingMap.set(String(o.id), o);
          }
        });

        const map = new Map<string, Order>();
        const now = Date.now();

        // 1. Evaluate existing orders in memory/cache
        if (Array.isArray(prev)) {
          prev.forEach(o => {
            if (!o || !o.id) return;
            const idStr = String(o.id);
            const invStr = o.invoiceNo ? String(o.invoiceNo) : '';
            if (deletedOrderIdsRef.current.has(idStr) || (invStr && deletedOrderIdsRef.current.has(invStr))) {
              return;
            }

            if (incomingMap.has(idStr)) {
              // Existing order is in incoming database list - will be merged below
              map.set(idStr, o);
            } else {
              // Order exists on this device but is missing from Supabase (e.g. created during network outage)
              // NEVER prune or delete! Preserve the order and auto-sync it to Supabase so all devices see it!
              map.set(idStr, o);
              try {
                const sbRow = orderToSupabaseRow(o);
                supabase.from('orders').upsert(sbRow).catch(() => {});
              } catch {}
            }
          });
        }

        // 2. Merge incoming orders (updating existing or adding new)
        newIncoming.forEach(o => {
          if (o && o.id) {
            const idStr = String(o.id);
            const invStr = o.invoiceNo ? String(o.invoiceNo) : '';
            if (!deletedOrderIdsRef.current.has(idStr) && (!invStr || !deletedOrderIdsRef.current.has(invStr))) {
              const existing = map.get(idStr);
              if (existing) {
                // If existing has richer customer information (e.g. name or phone), retain it
                const preferCustomerName = (existing.customerName && !existing.customerName.startsWith('Order #'))
                  ? existing.customerName
                  : (o.customerName || existing.customerName);
                const preferPhone = existing.phone || o.phone;
                const preferAddress = existing.address || o.address;

                map.set(idStr, {
                  ...existing,
                  ...o,
                  customerName: preferCustomerName,
                  phone: preferPhone,
                  address: preferAddress,
                  items: (Array.isArray(o.items) && o.items.length > 0) ? o.items : existing.items
                });

                // If existing had richer details not yet in Supabase, update Supabase
                if (existing.customerName && !existing.customerName.startsWith('Order #') && o.customerName?.startsWith('Order #')) {
                  try {
                    const enriched = { ...o, customerName: existing.customerName, phone: existing.phone, address: existing.address };
                    supabase.from('orders').upsert(orderToSupabaseRow(enriched)).catch(() => {});
                  } catch {}
                }
              } else {
                map.set(idStr, o);
              }
            }
          }
        });

        const merged = Array.from(map.values());
        let maxObservedId = BASE_ORDER_ID;

        merged.forEach((o) => {
          const numId = extractNumericId(o.id);
          if (numId && numId > maxObservedId) maxObservedId = numId;
          if (typeof o.invoiceNo === 'number' && o.invoiceNo > maxObservedId) {
            maxObservedId = o.invoiceNo;
          }
        });

        if (maxObservedId > lastCounterRef.current) {
          lastCounterRef.current = maxObservedId;
        }

        merged.sort((a, b) => compareOrdersByInvoice(a, b, 'desc'));

        saveOrdersToCache(merged);

        return merged;
      });
      setLoading(false);
    };

    // A. Multi-channel Orders Synchronizer with Direct Supabase Priority & Local Server API Fallback
    const isFetchingRef = { current: false };

    const syncOrders = async (isBackground = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        let supabaseOrders: Order[] | null = null;
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

          if (!error && Array.isArray(data)) {
            supabaseOrders = data.map(row => supabaseRowToOrder(row));
          }
        } catch (sbErr) {
          console.warn('[OrderContext] Direct Supabase sync notice:', sbErr);
        }

        const ordersMap = new Map<string, Order>();

        if (supabaseOrders !== null) {
          // Supabase is source of truth
          if (supabaseOrders.length === 0) {
            // Wiped completely! Clear all local order caches so old orders never resurrect
            try {
              for (const k of CACHE_KEYS) {
                localStorage.removeItem(k);
              }
              for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && (k.startsWith('eleganbd_orders') || k === 'orders')) {
                  localStorage.removeItem(k);
                }
              }
            } catch {}
          }
          supabaseOrders.forEach(o => {
            if (o && o.id) ordersMap.set(String(o.id), o);
          });
        } else {
          // Fallback to local storage if Supabase failed
          const localList = loadAllStoredOrders();
          localList.forEach(o => {
            if (o && o.id) ordersMap.set(String(o.id), o);
          });
        }

        // Also check local pending offline orders if any
        try {
          const rawPending = localStorage.getItem('eleganbd_pending_sync_orders');
          if (rawPending) {
            const pending = JSON.parse(rawPending);
            if (Array.isArray(pending)) {
              pending.forEach(po => {
                if (po && po.id && !ordersMap.has(String(po.id))) {
                  ordersMap.set(String(po.id), po);
                }
              });
            }
          }
        } catch {}

        // 3. Local API endpoint fallback & merge if Supabase was null/error
        if (supabaseOrders === null) {
          try {
            const apiRes = await safeApiFetch('/api/orders');
            if (apiRes.ok && apiRes.data && apiRes.data.success && Array.isArray(apiRes.data.orders)) {
              apiRes.data.orders.forEach((ord: any) => {
                if (ord && ord.id) {
                  const existing = ordersMap.get(String(ord.id));
                  if (existing) {
                    ordersMap.set(String(ord.id), { ...existing, ...ord });
                  } else {
                    ordersMap.set(String(ord.id), ord);
                  }
                }
              });
            }
          } catch (apiErr) {}
        }

        const fetchedList = Array.from(ordersMap.values());
        fetchedList.sort((a, b) => compareOrdersByInvoice(a, b, 'desc'));

        if (isMounted) {
          // Update tracking refs
          lastKnownCountRef.current = fetchedList.length;
          if (fetchedList[0]) {
            lastKnownTopIdRef.current = String(fetchedList[0].id);
            lastKnownUpdatedAtRef.current = String((fetchedList[0] as any).updatedAt || fetchedList[0].createdAt || '');
          }

          if (isBackground) {
            mergeAndSetOrders(fetchedList, true);
          } else {
            replaceAndSetOrders(fetchedList);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('[OrderContext] Orders load exception:', err);
      } finally {
        isFetchingRef.current = false;
        if (!isBackground && isMounted) setLoading(false);
      }
    };

    // Initial load
    syncOrders(false);

    // Strategic Stale-While-Revalidate event listeners (focus, visibility, online, touch)
    const handleFocus = () => {
      if (isMounted) syncOrders(true);
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('online', handleFocus);
    window.addEventListener('touchstart', handleFocus, { passive: true });

    // B. Real-time Heartbeat Poll (every 4 seconds, checks count & latest order in <50ms without loading heavy items)
    const heartbeatInterval = setInterval(async () => {
      if (!isMounted || isFetchingRef.current || (typeof document !== 'undefined' && document.hidden)) return;

      try {
        const { data, count, error } = await supabase
          .from('orders')
          .select('id, invoice_no, updated_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && typeof count === 'number') {
          const topOrder = data && data[0];
          const dbCount = count;
          const topId = topOrder ? String(topOrder.id) : null;
          const topUpdatedAt = topOrder ? String(topOrder.updated_at) : null;

          const hasCountDiff = lastKnownCountRef.current !== null && dbCount !== lastKnownCountRef.current;
          const hasTopDiff = lastKnownTopIdRef.current !== null && topId !== null && topId !== lastKnownTopIdRef.current;
          const hasUpdateDiff = lastKnownUpdatedAtRef.current !== null && topUpdatedAt !== null && topUpdatedAt !== lastKnownUpdatedAtRef.current;

          if (hasCountDiff || hasTopDiff || hasUpdateDiff) {
            syncOrders(true);
          } else {
            if (lastKnownCountRef.current === null) lastKnownCountRef.current = dbCount;
            if (lastKnownTopIdRef.current === null && topId) lastKnownTopIdRef.current = topId;
            if (lastKnownUpdatedAtRef.current === null && topUpdatedAt) lastKnownUpdatedAtRef.current = topUpdatedAt;
          }
        }

        // Check & flush pending offline orders queue if any
        try {
          const rawPending = localStorage.getItem('eleganbd_pending_sync_orders');
          if (rawPending) {
            const pendingOrders: Order[] = JSON.parse(rawPending);
            if (Array.isArray(pendingOrders) && pendingOrders.length > 0) {
              const remaining: Order[] = [];
              for (const po of pendingOrders) {
                const { error: poErr } = await supabase.from('orders').upsert(orderToSupabaseRow(po));
                if (poErr) remaining.push(po);
              }
              if (remaining.length === 0) {
                localStorage.removeItem('eleganbd_pending_sync_orders');
                syncOrders(true);
              } else {
                localStorage.setItem('eleganbd_pending_sync_orders', JSON.stringify(remaining));
              }
            }
          }
        } catch {}
      } catch (err) {}
    }, 4000);

    // C. Broadcast Channel Listener (0ms inter-tab sync)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('eleganbd_orders_sync_channel');
        bc.onmessage = (event) => {
          if (!isMounted || !event.data) return;
          const { type, payload } = event.data;
          if (type === 'ORDER_CREATED' || type === 'ORDER_UPDATED') {
            if (payload) mergeAndSetOrders([payload], false);
          } else if (type === 'ORDER_DELETED' && payload) {
            const delId = String(payload);
            setOrders(prev => prev.filter(o => o.id !== delId && String(o.invoiceNo) !== delId));
          } else if (type === 'ORDERS_REFRESH') {
            syncOrders(false);
          }
        };
      }
    } catch (err) {}

    // D. Real-time Supabase Channel Subscription
    let supabaseChannel: any = null;
    try {
      supabaseChannel = supabase
        .channel('realtime_orders_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newOrder = supabaseRowToOrder(payload.new as any);
            mergeAndSetOrders([newOrder], false);
          } else if (payload.eventType === 'DELETE' && payload.old && (payload.old as any).id) {
            const deletedId = String((payload.old as any).id);
            setOrders(prev => {
              const next = prev.filter(o => o.id !== deletedId);
              saveOrdersToCache(next);
              return next;
            });
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('[OrderContext] Supabase channel error:', e);
    }

    return () => {
      isMounted = false;
      clearInterval(heartbeatInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('online', handleFocus);
      window.removeEventListener('touchstart', handleFocus);
      if (bc) {
        try { bc.close(); } catch {}
      }
      if (supabaseChannel) {
        try { supabase.removeChannel(supabaseChannel); } catch {}
      }
    };
  }, []);

  const refreshOrders = useCallback(async (): Promise<Order[]> => {
    try {
      const ordersMap = new Map<string, Order>();

      let supabaseOrders: Order[] | null = null;
      try {
        const client = getSupabaseClient() || supabase;
        if (client) {
          const { data, error } = await client
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

          if (!error && Array.isArray(data)) {
            supabaseOrders = data.map(row => supabaseRowToOrder(row));
          }
        }
      } catch (sbErr) {
        console.warn('[OrderContext] Supabase refresh notice:', sbErr);
      }

      if (supabaseOrders !== null) {
        if (supabaseOrders.length === 0) {
          // Wiped completely! Clear cache
          try {
            for (const k of CACHE_KEYS) {
              localStorage.removeItem(k);
            }
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('eleganbd_orders') || k === 'orders')) {
                localStorage.removeItem(k);
              }
            }
          } catch {}
        }
        supabaseOrders.forEach(o => {
          if (o && o.id) ordersMap.set(String(o.id), o);
        });
      } else {
        const localList = loadAllStoredOrders();
        localList.forEach(o => {
          if (o && o.id) ordersMap.set(String(o.id), o);
        });
      }

      // Also check local pending offline orders if any
      try {
        const rawPending = localStorage.getItem('eleganbd_pending_sync_orders');
        if (rawPending) {
          const pending = JSON.parse(rawPending);
          if (Array.isArray(pending)) {
            pending.forEach(po => {
              if (po && po.id && !ordersMap.has(String(po.id))) {
                ordersMap.set(String(po.id), po);
              }
            });
          }
        }
      } catch {}

      // 3. Local server API fallback & merge if Supabase was null/error
      if (supabaseOrders === null) {
        try {
          const apiRes = await safeApiFetch('/api/orders');
          if (apiRes.ok && apiRes.data && apiRes.data.success && Array.isArray(apiRes.data.orders)) {
            apiRes.data.orders.forEach((ord: any) => {
              if (ord && ord.id) {
                const existing = ordersMap.get(String(ord.id));
                if (existing) {
                  ordersMap.set(String(ord.id), { ...existing, ...ord });
                } else {
                  ordersMap.set(String(ord.id), ord);
                }
              }
            });
          }
        } catch (err) {}
      }

      const allList = Array.from(ordersMap.values());
      const valid = allList.filter(o => {
        if (!o || !o.id) return false;
        const idStr = String(o.id);
        const invStr = o.invoiceNo ? String(o.invoiceNo) : '';
        return !deletedOrderIdsRef.current.has(idStr) && (!invStr || !deletedOrderIdsRef.current.has(invStr));
      });

      valid.sort((a, b) => compareOrdersByInvoice(a, b, 'desc'));
      setOrders(valid);
      if (valid.length > 0) {
        saveOrdersToCache(valid);
      } else {
        try {
          for (const k of CACHE_KEYS) {
            localStorage.removeItem(k);
          }
        } catch {}
      }

      lastKnownCountRef.current = valid.length;
      if (valid[0]) {
        lastKnownTopIdRef.current = String(valid[0].id);
        lastKnownUpdatedAtRef.current = String((valid[0] as any).updatedAt || valid[0].createdAt || '');
      }
      return valid;
    } catch (error) {
      console.error('[OrderContext] Refresh error:', error);
    }
    return orders;
  }, [orders]);

  const restoreOrderStock = async (order: Order) => {
    try {
      if (!Array.isArray(order.items) || order.items.length === 0) return;
      for (const item of order.items) {
        const product = products.find(p => 
          String(p.id) === String(item.id) ||
          (item.sku && p.sku && String(p.sku).trim().toLowerCase() === String(item.sku).trim().toLowerCase()) ||
          (p.name && item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
        );

        if (product) {
          const updatedSizeStock = { ...(product.sizeStock || {}) };
          const sizeKey = item.selectedSize || (product.sizes && product.sizes[0]) || 'Standard';
          const currentSizeStock = Number(updatedSizeStock[sizeKey]) || 0;
          const qty = Number(item.quantity) || 1;
          updatedSizeStock[sizeKey] = currentSizeStock + qty;
          
          const validSizes = Array.isArray(product.sizes) && product.sizes.length > 0
            ? product.sizes
            : Object.keys(updatedSizeStock);

          const updatedTotalStock = validSizes.length > 0
            ? validSizes.reduce((sum, sz) => sum + (Math.max(0, Number(updatedSizeStock[sz]) || 0)), 0)
            : Object.values(updatedSizeStock).reduce((sum, v) => sum + (Math.max(0, Number(v) || 0)), 0);
          
          await updateProduct({
            ...product,
            sizes: validSizes,
            sizeStock: updatedSizeStock,
            stock: updatedTotalStock
          });

          const orderRefLabel = order.invoiceNo ? `#${order.invoiceNo}` : `#${String(order.id).slice(-7)}`;
          await addTransaction({
            type: 'in',
            sku: product.sku || product.id,
            productName: product.name,
            quantities: { [sizeKey]: qty },
            totalQuantity: qty,
            category: product.category,
            authorizedBy: getAuthorizedBy(order),
            notes: `Restored: Order ${orderRefLabel} (Cancelled)`
          });
        }
      }
    } catch (err) {
      console.error('[OrderContext] Error restoring order stock:', err);
    }
  };

  const deductOrderStock = async (order: Order) => {
    try {
      if (!Array.isArray(order.items) || order.items.length === 0) return;
      for (const item of order.items) {
        const product = products.find(p => 
          String(p.id) === String(item.id) ||
          (item.sku && p.sku && String(p.sku).trim().toLowerCase() === String(item.sku).trim().toLowerCase()) ||
          (p.name && item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
        );

        if (product) {
          const updatedSizeStock = { ...(product.sizeStock || {}) };
          const sizeKey = item.selectedSize || (product.sizes && product.sizes[0]) || 'Standard';
          const currentSizeStock = Number(updatedSizeStock[sizeKey]) || 0;
          const qty = Number(item.quantity) || 1;
          updatedSizeStock[sizeKey] = Math.max(0, currentSizeStock - qty);
          
          const validSizes = Array.isArray(product.sizes) && product.sizes.length > 0
            ? product.sizes
            : Object.keys(updatedSizeStock);

          const updatedTotalStock = validSizes.length > 0
            ? validSizes.reduce((sum, sz) => sum + (Math.max(0, Number(updatedSizeStock[sz]) || 0)), 0)
            : Object.values(updatedSizeStock).reduce((sum, v) => sum + (Math.max(0, Number(v) || 0)), 0);
          
          await updateProduct({
            ...product,
            sizes: validSizes,
            sizeStock: updatedSizeStock,
            stock: updatedTotalStock
          });

          const orderRefLabel = order.invoiceNo ? `#${order.invoiceNo}` : `#${String(order.id).slice(-7)}`;
          await addTransaction({
            type: 'out',
            sku: product.sku || product.id,
            productName: product.name,
            quantities: { [sizeKey]: qty },
            totalQuantity: qty,
            category: product.category,
            authorizedBy: getAuthorizedBy(order),
            notes: `Order ${orderRefLabel}`
          });
        }
      }
    } catch (err) {
      console.error('[OrderContext] Error deducting order stock:', err);
    }
  };

  const handleStatusChangeStock = async (order: Order, newStatus: Order['status']) => {
    // Automatically restores stock for any Cancelled / Pick Up Cancel status.
    // 'Returned' status requires manual stock-in check when parcel arrives.
    const isOldRestored = isCancelledStatus(order.status);
    const isNewRestored = isCancelledStatus(newStatus);

    if (!isOldRestored && isNewRestored) {
      await restoreOrderStock(order);
    } else if (isOldRestored && !isNewRestored) {
      await deductOrderStock(order);
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status'], overrideLock: boolean = false) => {
    try {
      const order = orders.find(o => o.id === id);
      if (order && !overrideLock && !canChangeOrderStatus(order.status)) {
        console.warn(`[OrderContext] Blocked status modification for order ${id} with status "${order.status}". Status is locked.`);
        throw new Error('অর্ডারের স্ট্যাটাস পরিবর্তন করা যাবে না। শুধুমাত্র ORDER PLACED, PRINTED, PREPARING এবং PICK UP CANCEL স্ট্যাটাসের অর্ডারের স্ট্যাটাস পরিবর্তন করা যাবে।');
      }
      if (order) {
        await handleStatusChangeStock(order, status);
      }

      // 1. Update in Supabase
      try {
        await supabase
          .from('orders')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', String(id));
      } catch (sbErr) {
        console.warn('[OrderContext] Supabase update status notice:', sbErr);
      }

      // 2. Local state update
      setOrders(prev => {
        const next = prev.map(o => o.id === id ? { ...o, status, updatedAt: Date.now() } : o);
        saveOrdersToCache(next);
        return next;
      });
      const updatedOrder = orders.find(o => o.id === id);
      if (updatedOrder) {
        broadcastSync('ORDER_UPDATED', { ...updatedOrder, status, updatedAt: Date.now() });
      }
    } catch (error: any) {
      console.error("Error updating order status:", error);
      throw error;
    }
  };

  const updateOrder = async (id: string, data: Partial<Order> & Record<string, any>, overrideLock: boolean = false) => {
    try {
      const order = orders.find(o => o.id === id);
      const safeData = { ...data };
      if (safeData.status && order && !overrideLock && !canChangeOrderStatus(order.status) && safeData.status !== order.status) {
        console.warn(`[OrderContext] Blocked changing status of locked order ${id}`);
        delete safeData.status;
      }
      if (safeData.status && order) {
        await handleStatusChangeStock(order, safeData.status);
      }
      const updatedData = { ...safeData, updatedAt: Date.now() };

      // 1. Update in Supabase
      try {
        const mergedForSb = order ? { ...order, ...updatedData } : updatedData;
        const row = orderToSupabaseRow(mergedForSb);
        await supabase
          .from('orders')
          .upsert(row);
      } catch (sbErr) {
        console.warn('[OrderContext] Supabase update order notice:', sbErr);
      }

      // 2. Local state update
      setOrders(prev => {
        const next = prev.map(o => o.id === id ? { ...o, ...updatedData } : o);
        saveOrdersToCache(next);
        return next;
      });
      broadcastSync('ORDER_UPDATED', { id, ...updatedData });
    } catch (error: any) {
      console.error("Error updating order:", error);
      throw error;
    }
  };

  const deleteOrder = async (id: string) => {
    if (!id) return;
    const cleanId = String(id);
    try {
      const order = orders.find(o => o.id === cleanId || String(o.invoiceNo) === cleanId);
      
      // Register in deleted ids set so no polling/realtime re-injects it
      deletedOrderIdsRef.current.add(cleanId);
      if (order?.id) deletedOrderIdsRef.current.add(String(order.id));
      if (order?.invoiceNo) deletedOrderIdsRef.current.add(String(order.invoiceNo));

      if (order) {
        const isAlreadyRestored = isCancelledStatus(order.status);
        if (!isAlreadyRestored) {
          restoreOrderStock(order).catch(stockErr => {
            console.warn('[OrderContext] Non-fatal error restoring stock during deletion:', stockErr);
          });
        }
      }

      // 1. Immediately update local state & cache so UI reflects instant removal
      setOrders(prev => {
        const next = prev.filter(o => 
          o && 
          o.id !== cleanId && 
          String(o.id) !== cleanId &&
          (!o.invoiceNo || String(o.invoiceNo) !== cleanId) &&
          !deletedOrderIdsRef.current.has(String(o.id))
        );
        saveOrdersToCache(next);
        return next;
      });
      broadcastSync('ORDER_DELETED', cleanId);

      // 2. Parallel deletion from Server API and Supabase (Fastest response)
      const cleanIdNum = parseInt(cleanId.replace(/[^0-9]/g, ''), 10);
      const serverDeletePromise = fetch('/api/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId })
      }).catch(apiErr => console.warn('[OrderContext] Server delete order notice:', apiErr));

      const clientSupabaseDeletePromise = (async () => {
        try {
          if (!isNaN(cleanIdNum) && cleanIdNum > 0) {
            await supabase
              .from('orders')
              .delete()
              .or(`id.eq.${cleanId},invoice_no.eq.${cleanIdNum}`);
          } else {
            await supabase
              .from('orders')
              .delete()
              .eq('id', cleanId);
          }
        } catch (sbErr) {
          console.warn('[OrderContext] Client Supabase delete order notice:', sbErr);
        }
      })();

      await Promise.all([serverDeletePromise, clientSupabaseDeletePromise]);
    } catch (error) {
      console.error(`[OrderContext] ERROR: Deleting order ${cleanId}:`, error);
      throw error;
    }
  };

  const deleteMultipleOrders = async (ids: string[]) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const targetSet = new Set(ids.map(String));

    try {
      for (const id of ids) {
        const cleanId = String(id);
        deletedOrderIdsRef.current.add(cleanId);
        const order = orders.find(o => o.id === cleanId || String(o.invoiceNo) === cleanId);
        if (order) {
          if (order.id) deletedOrderIdsRef.current.add(String(order.id));
          if (order.invoiceNo) deletedOrderIdsRef.current.add(String(order.invoiceNo));
          const isAlreadyRestored = isCancelledStatus(order.status);
          if (!isAlreadyRestored) {
            try {
              await restoreOrderStock(order);
            } catch {}
          }
        }
      }

      // 1. Update local state & cache
      setOrders(prev => {
        const next = prev.filter(o => 
          o && 
          !targetSet.has(String(o.id)) && 
          (!o.invoiceNo || !targetSet.has(String(o.invoiceNo))) &&
          !deletedOrderIdsRef.current.has(String(o.id))
        );
        saveOrdersToCache(next);
        return next;
      });

      // 2. Server API bulk delete
      try {
        await fetch('/api/orders/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(targetSet) })
        });
      } catch (apiErr) {
        console.warn('[OrderContext] Server bulk delete notice:', apiErr);
      }

      // 3. Client Supabase delete
      try {
        await supabase.from('orders').delete().in('id', Array.from(targetSet));
        const numIds = Array.from(targetSet).map(i => parseInt(i.replace(/[^0-9]/g, ''), 10)).filter(Boolean);
        if (numIds.length > 0) {
          await supabase.from('orders').delete().in('invoice_no', numIds);
        }
      } catch {}
    } catch (error) {
      console.error('[OrderContext] Bulk delete error:', error);
      throw error;
    }
  };

  const deleteAllOrders = async () => {
    try {
      orders.forEach(o => {
        if (o.id) deletedOrderIdsRef.current.add(String(o.id));
        if (o.invoiceNo) deletedOrderIdsRef.current.add(String(o.invoiceNo));
      });

      // 1. Local state & storage clear
      setOrders([]);
      try {
        for (const k of CACHE_KEYS) {
          localStorage.removeItem(k);
        }
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('eleganbd_orders') || k === 'orders')) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem('eleganbd_orders_wiped_timestamp', String(Date.now()));
      } catch {}

      // 2. Server-side complete wipe of orders from Supabase & Firestore
      try {
        await supabase.from('orders').delete().neq('id', '___NON_EXISTENT___');
      } catch {}

      await fetch('/api/orders/delete-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('[OrderContext] Delete all orders error:', error);
      throw error;
    }
  };

  const getNextOrderId = () => generateNextOrderId(orders, lastCounterRef.current);

  const addOrder = async (order: Order): Promise<Order> => {
    try {
      const targetCustomerId = currentUser
        ? ((isAdmin && order.customerId) ? order.customerId : currentUser.uid)
        : (order.customerId || `GUEST-${Math.floor(Math.random() * 10000)}`);

      // Determine absolute next sequential ID
      let calculatedNextIdNum = BASE_ORDER_ID;
      if (lastCounterRef.current > calculatedNextIdNum) calculatedNextIdNum = lastCounterRef.current;

      // Scan all existing orders to ensure NO duplicate
      for (const o of orders) {
        const num = extractNumericId(o.id);
        if (num && num >= calculatedNextIdNum) calculatedNextIdNum = num;
        if (typeof o.invoiceNo === 'number' && o.invoiceNo >= calculatedNextIdNum) {
          calculatedNextIdNum = o.invoiceNo;
        }
      }

      let finalOrderId: string;
      let finalInvoiceNo: number;

      const explicitInvoiceNo = order.invoiceNo ? Number(order.invoiceNo) : null;

      if (explicitInvoiceNo && !isNaN(explicitInvoiceNo)) {
        finalInvoiceNo = explicitInvoiceNo;
        finalOrderId = String(explicitInvoiceNo);
        if (explicitInvoiceNo > calculatedNextIdNum) {
          calculatedNextIdNum = explicitInvoiceNo;
        }
      } else {
        calculatedNextIdNum += 1;
        finalOrderId = String(calculatedNextIdNum);
        finalInvoiceNo = calculatedNextIdNum;
      }

      // Advance our internal counter
      lastCounterRef.current = Math.max(lastCounterRef.current, calculatedNextIdNum);

      const newOrder: Order = {
        ...order,
        id: finalOrderId,
        invoiceNo: finalInvoiceNo,
        customerId: targetCustomerId,
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      };

      // 1. Local State Update & Cache FIRST (Guaranteed Persistence & Display)
      setOrders(prev => {
        const filtered = prev.filter(o => o.id !== finalOrderId);
        const next = [newOrder, ...filtered].sort((a, b) => compareOrdersByInvoice(a, b, 'desc'));
        saveOrdersToCache(next);
        return next;
      });
      setLastOrder(newOrder);
      broadcastSync('ORDER_CREATED', newOrder);

      // 2. Immediate Supabase Upsert with Offline Retry Queue
      const sbRow = orderToSupabaseRow(newOrder);
      try {
        const { error: sbError } = await supabase.from('orders').upsert(sbRow);
        if (sbError) {
          console.warn('[OrderContext] Supabase order upsert warning, saving to pending queue:', sbError.message);
          try {
            const pending = JSON.parse(localStorage.getItem('eleganbd_pending_sync_orders') || '[]');
            pending.push(newOrder);
            localStorage.setItem('eleganbd_pending_sync_orders', JSON.stringify(pending));
          } catch {}
        } else {
          console.log(`[OrderContext] Order #${finalOrderId} synced to Supabase successfully!`);
        }
      } catch (err) {
        console.warn('[OrderContext] Supabase sync exception, saving to pending queue:', err);
        try {
          const pending = JSON.parse(localStorage.getItem('eleganbd_pending_sync_orders') || '[]');
          pending.push(newOrder);
          localStorage.setItem('eleganbd_pending_sync_orders', JSON.stringify(pending));
        } catch {}
      }

      // Server API instant sync for multi-device & mobile visibility
      try {
        fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder),
        }).catch(err => console.warn('[OrderContext] Server order sync notice:', err));
      } catch (err) {}

      // Also sync customer profile in Supabase customers table in background
      const customerPhone = newOrder.phone;
      if (customerPhone) {
        supabase.from('customers').upsert({
          id: customerPhone,
          phone: customerPhone,
          name: newOrder.customerName || 'Customer',
          email: newOrder.email || null,
          address: newOrder.address || null,
          city: newOrder.city || null,
          thana: newOrder.thana || null,
          updated_at: new Date().toISOString()
        }).then(() => {}).catch(() => {});
      }

      // 3. Centralized Stock Deduction & Inventory Movement Logging
      await deductOrderStock(newOrder);

      // 4. Send order confirmation email and Telegram notification if applicable
      if (newOrder.invoiceBy && newOrder.invoiceBy.toLowerCase().includes('website')) {
        fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderDetails: newOrder }),
        }).catch(err => console.error('[OrderContext] Email notification error:', err));
      }

      // Send Telegram notification for ALL new orders (Website & Admin Panel Manual Orders)
      fetch('/api/send-telegram-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderDetails: newOrder }),
      }).catch(err => console.error('[OrderContext] Telegram notification error:', err));

      return newOrder;
    } catch(e) {
      console.error('[OrderContext] Add order error:', e);
      throw e;
    }
  };

  return (
    <OrderContext.Provider value={{ 
      orders, 
      updateOrderStatus, 
      updateOrder, 
      deleteOrder, 
      deleteMultipleOrders,
      deleteAllOrders,
      addOrder, 
      getNextOrderId, 
      loading, 
      lastOrder, 
      refreshOrders 
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}

