import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Order } from '../types';
import { supabase, orderToSupabaseRow, supabaseRowToOrder } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { useInventory } from './InventoryContext';
import { isDeliveredOrSuccess } from '../utils/orderUtils';

interface OrderContextType {
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order> & Record<string, any>) => Promise<void>;
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
  if (cleaned.length >= 6) {
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= BASE_ORDER_ID) {
      return num;
    }
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

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter(o => o && o.id);
        }
      }
    } catch (e) {}
    return [];
  });
  
  const [loading, setLoading] = useState(true);
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

  // 1. Initial Load & Real-time Supabase Listener
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

      valid.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime() || (typeof a.updatedAt === 'number' ? a.updatedAt : 0) || 0;
        const timeB = new Date(b.createdAt || 0).getTime() || (typeof b.updatedAt === 'number' ? b.updatedAt : 0) || 0;
        return timeB - timeA;
      });

      setOrders(valid);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(valid));
      } catch {}
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

        merged.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime() || (typeof a.updatedAt === 'number' ? a.updatedAt : 0) || 0;
          const timeB = new Date(b.createdAt || 0).getTime() || (typeof b.updatedAt === 'number' ? b.updatedAt : 0) || 0;
          return timeB - timeA;
        });

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
        } catch {}

        return merged;
      });
      setLoading(false);
    };

    // A. Fetch all orders exclusively from Supabase
    const fetchFromSupabase = async (limitRecent = false) => {
      try {
        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (limitRecent) {
          query = query.limit(100);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('[OrderContext] Supabase fetch notice:', error.message);
        } else if (data && Array.isArray(data) && isMounted) {
          const mapped: Order[] = data.map(supabaseRowToOrder);
          if (mapped.length > 0) {
            if (limitRecent) {
              mergeAndSetOrders(mapped);
            } else {
              replaceAndSetOrders(mapped);
            }
          } else {
            if (!limitRecent) {
              setOrders([]);
              try { localStorage.removeItem(CACHE_KEY); } catch {}
            }
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('[OrderContext] Supabase load exception:', err);
        setLoading(false);
      }
    };

    fetchFromSupabase();

    // Fallback Polling (Every 12 seconds check for top 100 recent orders/updates)
    // Ensures real-time sync across browsers even if Supabase Realtime is not fully enabled for the table.
    const pollInterval = setInterval(() => {
      if (isMounted) fetchFromSupabase(true);
    }, 12000);

    // B. Real-time Supabase Channel Subscription
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
              try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
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
      if (supabaseChannel) {
        try { supabase.removeChannel(supabaseChannel); } catch {}
      }
    };
  }, [currentUser]);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data)) {
        const mapped = data.map(supabaseRowToOrder);
        mapped.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime() || 0;
          const timeB = new Date(b.createdAt || 0).getTime() || 0;
          return timeB - timeA;
        });
        setOrders(mapped);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(mapped)); } catch {}
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
    const isOldRestored = order.status === 'Cancelled' || order.status === 'Returned';
    const isNewRestored = newStatus === 'Cancelled' || newStatus === 'Returned';

    if (!isOldRestored && isNewRestored) {
      await restoreOrderStock(order);
    } else if (isOldRestored && !isNewRestored) {
      await deductOrderStock(order);
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      const order = orders.find(o => o.id === id);
      if (order && isDeliveredOrSuccess(order.status) && !isDeliveredOrSuccess(status)) {
        console.warn(`[OrderContext] Blocked status modification for Success/Delivered order ${id}. Status cannot be edited.`);
        throw new Error('সাকসেস / ডেলিভার্ড অর্ডারের স্ট্যাটাস পরিবর্তন করা যাবে না (Delivered order status is locked).');
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
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (error: any) {
      console.error("Error updating order status:", error);
      throw error;
    }
  };

  const updateOrder = async (id: string, data: Partial<Order> & Record<string, any>) => {
    try {
      const order = orders.find(o => o.id === id);
      const safeData = { ...data };
      if (safeData.status && order && isDeliveredOrSuccess(order.status) && !isDeliveredOrSuccess(safeData.status)) {
        console.warn(`[OrderContext] Blocked changing status of Delivered/Success order ${id}`);
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
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
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
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
          // Clean any user or backup keys
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('eleganbd_orders_') || k === 'orders')) {
              try {
                const stored = JSON.parse(localStorage.getItem(k) || '[]');
                if (Array.isArray(stored)) {
                  const cleaned = stored.filter((o: any) => o && o.id !== cleanId && String(o.invoiceNo) !== cleanId);
                  localStorage.setItem(k, JSON.stringify(cleaned));
                }
              } catch {}
            }
          }
        } catch {}
        return next;
      });

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
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {}
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
        const next = [newOrder, ...filtered];
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
          if (currentUser) {
            localStorage.setItem(`eleganbd_orders_${currentUser.uid}`, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
      setLastOrder(newOrder);

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

