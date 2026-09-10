import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Order } from '../types';
import { supabase, orderToSupabaseRow, supabaseRowToOrder } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { useInventory } from './InventoryContext';
import { isDeliveredOrSuccess, compareOrdersByInvoice, canChangeOrderStatus } from '../utils/orderUtils';

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
const CACHE_KEY = 'eleganbd_all_orders';

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

  // Check localStorage cache as secondary guard
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: Order[] = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        for (const o of parsed) {
          const num = extractNumericId(o?.id);
          if (num && num > maxId) maxId = num;
          if (typeof o?.invoiceNo === 'number' && o.invoiceNo > maxId) maxId = o.invoiceNo;
        }
      }
    }
  } catch {}

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
    localStorage.setItem(CACHE_KEY, JSON.stringify(light));
  } catch (e) {
    console.warn('[OrderContext] LocalStorage cache save warning:', e);
  }
};

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY) || localStorage.getItem('eleganbd_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(o => o && o.id);
        }
      }
    } catch (e) {}
    return [];
  });
  
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY) || localStorage.getItem('eleganbd_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch (e) {}
    return true;
  });
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const lastCounterRef = useRef<number>(BASE_ORDER_ID);
  const deletedOrderIdsRef = useRef<Set<string>>(new Set());

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

    const mergeAndSetOrders = (newIncoming: Order[]) => {
      if (!isMounted || !Array.isArray(newIncoming) || newIncoming.length === 0) return;
      
      setOrders(prev => {
        const map = new Map<string, Order>();
        // Add existing orders first
        if (Array.isArray(prev)) {
          prev.forEach(o => {
            if (o && o.id) {
              const idStr = String(o.id);
              const invStr = o.invoiceNo ? String(o.invoiceNo) : '';
              if (!deletedOrderIdsRef.current.has(idStr) && (!invStr || !deletedOrderIdsRef.current.has(invStr))) {
                map.set(idStr, o);
              }
            }
          });
        }
        // Merge incoming orders (updating or adding)
        newIncoming.forEach(o => {
          if (o && o.id) {
            const idStr = String(o.id);
            const invStr = o.invoiceNo ? String(o.invoiceNo) : '';
            if (!deletedOrderIdsRef.current.has(idStr) && (!invStr || !deletedOrderIdsRef.current.has(invStr))) {
              const existing = map.get(idStr);
              if (existing) {
                map.set(idStr, { ...existing, ...o, items: (Array.isArray(o.items) && o.items.length > 0) ? o.items : existing.items });
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

    // A. Fetch orders from Supabase with timeout prevention and safety locks
    const isFetchingRef = { current: false };

    const fetchFromSupabase = async (limitRecent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (limitRecent) {
          query = query.limit(200);
        } else {
          query = query.limit(1000);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('[OrderContext] Supabase fetch notice:', error.message);
          // CRITICAL: NEVER wipe out existing orders or localStorage on error/timeout!
        } else if (data && Array.isArray(data) && isMounted) {
          const mapped: Order[] = data.map(supabaseRowToOrder);
          if (mapped.length > 0) {
            if (limitRecent) {
              mergeAndSetOrders(mapped);
            } else {
              replaceAndSetOrders(mapped);
            }
          }
        }
      } catch (err) {
        console.warn('[OrderContext] Supabase load exception:', err);
      } finally {
        isFetchingRef.current = false;
        if (isMounted) setLoading(false);
      }
    };

    fetchFromSupabase();

    // Background sync check every 12 seconds for cross-device updates (Realtime channel provides instant 0ms updates)
    const pollInterval = setInterval(() => {
      if (isMounted) fetchFromSupabase(true);
    }, 12000);

    // Instant sync on window focus/tab switch
    const handleFocus = () => {
      if (isMounted) fetchFromSupabase(true);
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    // B. Broadcast Channel Listener (0ms inter-tab sync)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('eleganbd_orders_sync_channel');
        bc.onmessage = (event) => {
          if (!isMounted || !event.data) return;
          const { type, payload } = event.data;
          if (type === 'ORDER_CREATED' || type === 'ORDER_UPDATED') {
            if (payload) mergeAndSetOrders([payload]);
          } else if (type === 'ORDER_DELETED' && payload) {
            const delId = String(payload);
            setOrders(prev => prev.filter(o => o.id !== delId && String(o.invoiceNo) !== delId));
          } else if (type === 'ORDERS_REFRESH') {
            fetchFromSupabase(true);
          }
        };
      }
    } catch (err) {}

    // C. Real-time Supabase Channel Subscription
    let supabaseChannel: any = null;
    try {
      supabaseChannel = supabase
        .channel('realtime_orders_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newOrder = supabaseRowToOrder(payload.new as any);
            mergeAndSetOrders([newOrder]);
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
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
      if (bc) {
        try { bc.close(); } catch {}
      }
      if (supabaseChannel) {
        try { supabase.removeChannel(supabaseChannel); } catch {}
      }
    };
  }, []);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!error && data && Array.isArray(data)) {
        const mapped = data.map(supabaseRowToOrder);
        mapped.sort((a, b) => compareOrdersByInvoice(a, b, 'desc'));
        setOrders(mapped);
        saveOrdersToCache(mapped);
      }
    } catch (error) {
      console.error('[OrderContext] Supabase Refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreOrderStock = async (order: Order) => {
    try {
      if (!Array.isArray(order.items)) return;
      for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const updatedSizeStock = { ...(product.sizeStock || {}) };
          const currentSizeStock = updatedSizeStock[item.selectedSize] || 0;
          updatedSizeStock[item.selectedSize] = currentSizeStock + item.quantity;
          
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

          await addTransaction({
            type: 'in',
            sku: product.sku || product.id,
            productName: product.name,
            quantities: { [item.selectedSize]: item.quantity },
            totalQuantity: item.quantity,
            category: product.category,
            authorizedBy: getAuthorizedBy(order),
            notes: `Restored: Order #${order.id.slice(-7)} Cancelled/Deleted`
          });
        }
      }
    } catch (err) {
      console.error('[OrderContext] Error restoring order stock:', err);
    }
  };

  const deductOrderStock = async (order: Order) => {
    try {
      if (!Array.isArray(order.items)) return;
      for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const updatedSizeStock = { ...(product.sizeStock || {}) };
          const currentSizeStock = updatedSizeStock[item.selectedSize] || 0;
          updatedSizeStock[item.selectedSize] = Math.max(0, currentSizeStock - item.quantity);
          
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

          await addTransaction({
            type: 'out',
            sku: product.sku || product.id,
            productName: product.name,
            quantities: { [item.selectedSize]: item.quantity },
            totalQuantity: item.quantity,
            category: product.category,
            authorizedBy: getAuthorizedBy(order),
            notes: `Order #${order.id}`
          });
        }
      }
    } catch (err) {
      console.error('[OrderContext] Error deducting order stock:', err);
    }
  };

  const handleStatusChangeStock = async (order: Order, newStatus: Order['status']) => {
    // Only 'Cancelled' status automatically restores stock.
    // 'Returned' status does NOT automatically restore stock (requires manual stock-in when product physically arrives).
    const isOldRestored = order.status === 'Cancelled';
    const isNewRestored = newStatus === 'Cancelled';

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
        const s = (order.status || '').toString().trim().toLowerCase();
        const isAlreadyRestored = s === 'cancelled' || s === 'canceled' || s === 'returned' || s === 'return';
        if (!isAlreadyRestored) {
          try {
            await restoreOrderStock(order);
          } catch (stockErr) {
            console.warn('[OrderContext] Non-fatal error restoring stock during deletion:', stockErr);
          }
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

      // 2. Server API direct deletion
      try {
        await fetch('/api/orders/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cleanId })
        });
      } catch (apiErr) {
        console.warn('[OrderContext] Server delete order notice:', apiErr);
      }

      // 3. Client-side Supabase delete
      try {
        const cleanIdNum = parseInt(cleanId.replace(/[^0-9]/g, ''), 10);
        if (cleanIdNum) {
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
          const s = (order.status || '').toString().trim().toLowerCase();
          const isAlreadyRestored = s === 'cancelled' || s === 'canceled' || s === 'returned' || s === 'return';
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

      // 1. Local state clear
      setOrders([]);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify([]));
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('eleganbd_orders') || k === 'orders')) {
            localStorage.removeItem(k);
          }
        }
      } catch {}

      // 2. Server-side complete wipe of orders from Supabase
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

      // 2. Background Supabase Upsert (Non-blocking)
      const sbRow = orderToSupabaseRow(newOrder);
      supabase.from('orders').upsert(sbRow).then(({ error: sbError }) => {
        if (sbError) {
          console.warn('[OrderContext] Supabase order background insert notice:', sbError.message);
        } else {
          console.log(`[OrderContext] Order #${finalOrderId} synced to Supabase successfully!`);
        }
      }).catch(err => {
        console.warn('[OrderContext] Supabase background sync exception:', err);
      });

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

