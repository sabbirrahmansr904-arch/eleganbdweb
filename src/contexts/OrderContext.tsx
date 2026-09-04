import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Order } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { useInventory } from './InventoryContext';
import { handleFirestoreError, OperationType, isQuotaError, isFirestoreQuotaExceeded } from '../lib/firestoreUtils';
import { isDeliveredOrSuccess } from '../utils/orderUtils';

interface OrderContextType {
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order> & Record<string, any>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addOrder: (order: Order) => Promise<Order>;
  getNextOrderId: () => string;
  loading: boolean;
  lastOrder?: Order | null;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const BASE_ORDER_ID = 2670000;
const CACHE_KEY = 'eleganbd_all_orders';

const SEED_FALLBACK_ORDERS: Order[] = [
  {
    id: "2670005",
    invoiceNo: 2670005,
    customerId: "manual_sabbir",
    customerName: "Sabbir (Showroom/Manual)",
    phone: "01619835133",
    email: "",
    address: "Showroom / Direct Order",
    city: "Dhaka",
    thana: "Dhaka",
    items: [
      {
        id: "1781129084604",
        name: "Man's Formal Pant - Black",
        sku: "FP 1",
        category: "Formal Pant",
        price: 1050,
        selectedSize: "34",
        quantity: 1,
        images: []
      },
      {
        id: "1781129489067",
        name: "Man's Formal Pant - Cream",
        sku: "FP 3",
        category: "Formal Pant",
        price: 1050,
        selectedSize: "34",
        quantity: 1,
        images: []
      }
    ],
    deliveryCharge: 0,
    total: 2100,
    status: "Pending",
    paymentMethod: "cod",
    invoiceBy: "Sabbir",
    createdAt: "2026-09-03T12:21:00.000Z",
    updatedAt: Date.now(),
    notes: "Order #2670005"
  }
];

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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });
  
  const [loading, setLoading] = useState(true);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const lastCounterRef = useRef<number>(BASE_ORDER_ID);

  const { currentUser, isAdmin } = useAuth();
  const { products, updateProduct } = useProducts();
  const { addTransaction } = useInventory();

  // Helper to remove undefined fields before writing to Firestore
  const removeUndefined = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) cleaned[key] = removeUndefined(val);
    }
    return cleaned;
  };

  const getAuthorizedBy = (order: Order) => {
    if (order?.invoiceBy && typeof order.invoiceBy === 'string' && order.invoiceBy.toLowerCase().includes('website')) {
      return 'Website';
    }
    return order?.invoiceBy || currentUser?.displayName || currentUser?.email || 'Admin';
  };

  // 1. Real-time Firestore Listener
  useEffect(() => {
    if (isFirestoreQuotaExceeded) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const ordersColRef = collection(db, 'orders');

    // Subscribe to live Firestore updates
    const unsubscribe = onSnapshot(
      ordersColRef,
      (snapshot) => {
        const fetchedOrders: Order[] = [];
        let maxObservedId = BASE_ORDER_ID;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const orderObj = { 
            id: docSnap.id, 
            ...data,
            items: Array.isArray(data.items) ? data.items : []
          } as Order;
          fetchedOrders.push(orderObj);

          const numId = extractNumericId(docSnap.id);
          if (numId && numId > maxObservedId) maxObservedId = numId;
          if (typeof data.invoiceNo === 'number' && data.invoiceNo > maxObservedId) {
            maxObservedId = data.invoiceNo;
          }
        });

        // Sort descending by creation date / timestamp
        fetchedOrders.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime() || a.updatedAt || 0;
          const timeB = new Date(b.createdAt || 0).getTime() || b.updatedAt || 0;
          return timeB - timeA;
        });

        if (maxObservedId > lastCounterRef.current) {
          lastCounterRef.current = maxObservedId;
        }

        setOrders(fetchedOrders);
        setLoading(false);

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(fetchedOrders));
          if (currentUser) {
            localStorage.setItem(`eleganbd_orders_${currentUser.uid}`, JSON.stringify(fetchedOrders));
          }
        } catch (e) {}
      },
      (error) => {
        console.warn('[OrderContext] onSnapshot warning:', error);
        if (!isQuotaError(error)) {
          handleFirestoreError(error, OperationType.GET, 'orders');
        }
        setLoading(false);
      }
    );

    // Also fetch the counter config doc
    getDoc(doc(db, 'config', 'order_counter'))
      .then((counterSnap) => {
        if (counterSnap.exists()) {
          const data = counterSnap.data();
          if (typeof data.lastOrderId === 'number' && data.lastOrderId > lastCounterRef.current) {
            lastCounterRef.current = data.lastOrderId;
          }
        }
      })
      .catch(() => {});

    return () => unsubscribe();
  }, [currentUser]);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'orders'));
      const fetchedOrders: Order[] = [];
      let maxObserved = BASE_ORDER_ID;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedOrders.push({ 
          id: docSnap.id, 
          ...data,
          items: Array.isArray(data.items) ? data.items : []
        } as Order);
        const num = extractNumericId(docSnap.id);
        if (num && num > maxObserved) maxObserved = num;
      });

      fetchedOrders.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime() || a.updatedAt || 0;
        const timeB = new Date(b.createdAt || 0).getTime() || b.updatedAt || 0;
        return timeB - timeA;
      });

      if (maxObserved > lastCounterRef.current) {
        lastCounterRef.current = maxObserved;
      }

      setOrders(fetchedOrders);
      localStorage.setItem(CACHE_KEY, JSON.stringify(fetchedOrders));
    } catch (err) {
      console.warn('[OrderContext] refreshOrders error:', err);
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
      if (order && isDeliveredOrSuccess(order.status)) {
        throw new Error('সাকসেস বা ডেলিভার্ড অর্ডারের স্ট্যাটাস পরিবর্তন করা যাবে না।');
      }
      if (order) {
        await handleStatusChangeStock(order, status);
      }
      const updatedData = { status, updatedAt: Date.now() };

      // 1. Update in Firestore
      try {
        const cleaned = removeUndefined(updatedData);
        await setDoc(doc(db, 'orders', id), cleaned, { merge: true });
      } catch (e) {
        console.warn('[OrderContext] Firestore update status fallback:', e);
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
      if (data.status) {
        const order = orders.find(o => o.id === id);
        if (order) {
          await handleStatusChangeStock(order, data.status);
        }
      }
      const updatedData = { ...data, updatedAt: Date.now() };

      // 1. Update in Firestore
      try {
        const cleaned = removeUndefined(updatedData);
        await setDoc(doc(db, 'orders', id), cleaned, { merge: true });
      } catch (e) {
        console.warn('[OrderContext] Firestore update order fallback:', e);
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
    try {
      const order = orders.find(o => o.id === id);
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

      // 1. Delete in Firestore
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (e) {
        console.warn('[OrderContext] Firestore delete order fallback:', e);
      }

      // 2. Local update
      setOrders(prev => {
        const next = prev.filter(o => o.id !== id);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (error) {
      console.error(`[OrderContext] ERROR: Deleting order ${id}:`, error);
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

      // If order had an explicit valid 7-digit ID, check if it is already taken
      let finalOrderId: string;
      const explicitNum = extractNumericId(order.id);
      
      if (explicitNum && !orders.some(o => o.id === String(explicitNum))) {
        finalOrderId = String(explicitNum);
        if (explicitNum > calculatedNextIdNum) {
          calculatedNextIdNum = explicitNum;
        }
      } else {
        calculatedNextIdNum += 1;
        finalOrderId = String(calculatedNextIdNum);
      }

      // Advance our internal counter
      lastCounterRef.current = Math.max(lastCounterRef.current, calculatedNextIdNum);

      const newOrder: Order = {
        ...order,
        id: finalOrderId,
        invoiceNo: calculatedNextIdNum,
        customerId: targetCustomerId,
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      };

      // 1. Save directly to Firestore orders collection
      try {
        const cleaned = removeUndefined(newOrder);
        await setDoc(doc(db, 'orders', finalOrderId), cleaned);
        console.log(`[OrderContext] Saved Order #${finalOrderId} successfully to Firestore.`);
      } catch (e) {
        console.warn('[OrderContext] Firestore order save fallback:', e);
      }

      // 2. Persist the updated counter to Firestore
      try {
        await setDoc(doc(db, 'config', 'order_counter'), { lastOrderId: calculatedNextIdNum }, { merge: true });
      } catch (e) {}

      // 3. Local State Update & Cache
      setOrders(prev => {
        // Prevent duplicate entry in array
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

      // 4. Centralized Stock Deduction & Inventory Movement Logging
      await deductOrderStock(newOrder);

      // 5. Send order confirmation email if applicable
      if (newOrder.invoiceBy && newOrder.invoiceBy.toLowerCase().includes('website')) {
        fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderDetails: newOrder }),
        }).catch(err => console.error('[OrderContext] Email notification error:', err));
      }

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
