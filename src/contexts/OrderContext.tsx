import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Order } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
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
  addOrder: (order: Order) => Promise<void>;
  getNextOrderId: () => string;
  loading: boolean;
  lastOrder?: Order | null;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const generateNextOrderId = (orders: Order[]): string => {
  const BASE_ID = 2670000;
  let maxId = BASE_ID - 1;

  if (Array.isArray(orders)) {
    for (const o of orders) {
      if (o && o.id) {
        const cleaned = o.id.replace(/[^0-9]/g, '');
        if (cleaned.length >= 6) {
          const num = parseInt(cleaned, 10);
          if (!isNaN(num) && num >= BASE_ID && num > maxId) {
            maxId = num;
          }
        }
      }
    }
  }

  const nextNum = maxId < BASE_ID ? BASE_ID : maxId + 1;
  return String(nextNum);
};

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_all_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const { currentUser, isAdmin } = useAuth();
  const { products, updateProduct } = useProducts();
  const { addTransaction } = useInventory();
  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      const cached = localStorage.getItem('eleganbd_all_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setOrders(parsed);
        }
      }
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isFirestoreQuotaExceeded) {
      setLoading(false);
      return;
    }

    // 1. Real-time orders listener (Firestore is primary real-time stream)
    setLoading(true);
    let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    if (!isAdmin && currentUser) {
      q = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid));
    }

    getDocs(q).then((snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach(docSnap => {
        ordersData.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });

      if (ordersData.length > 0) {
        setOrders(ordersData);
        try {
          localStorage.setItem('eleganbd_all_orders', JSON.stringify(ordersData));
          if (currentUser) {
            localStorage.setItem(`eleganbd_orders_${currentUser.uid}`, JSON.stringify(ordersData));
          }
        } catch (e) {}
      }
      setLoading(false);
    }).catch((error) => {
      if (!isQuotaError(error)) {
        handleFirestoreError(error, OperationType.GET, 'orders');
      }
      setLoading(false);
    });

    return () => {};
  }, [currentUser, isAdmin]);

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
    if (order.invoiceBy && order.invoiceBy.toLowerCase().includes('website')) {
      return 'Website';
    }
    return order.invoiceBy || currentUser?.displayName || currentUser?.email || 'Admin';
  };

  const restoreOrderStock = async (order: Order) => {
    try {
      for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const updatedSizeStock = { ...(product.sizeStock || {}) };
          const currentSizeStock = updatedSizeStock[item.selectedSize] || 0;
          updatedSizeStock[item.selectedSize] = currentSizeStock + item.quantity;
          const updatedTotalStock = (product.stock || 0) + item.quantity;
          
          await updateProduct({
            ...product,
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
            notes: `Restored: Order #${order.id.slice(-6)} Cancelled/Deleted`
          });
        }
      }
    } catch (err) {
      console.error('[OrderContext] Error restoring order stock:', err);
    }
  };

  const deductOrderStock = async (order: Order) => {
    try {
      for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const updatedSizeStock = { ...(product.sizeStock || {}) };
          const currentSizeStock = updatedSizeStock[item.selectedSize] || 0;
          updatedSizeStock[item.selectedSize] = Math.max(0, currentSizeStock - item.quantity);
          const updatedTotalStock = Math.max(0, (product.stock || 0) - item.quantity);
          
          await updateProduct({
            ...product,
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
            notes: `Re-deducted: Order #${order.id.slice(-6)} Restored status`
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
        throw new Error('সাকসেস বা ডেলিভার্ড অর্ডারের স্ট্যাটাস কোনোভাবেই পরিবর্তন করা যাবে না।');
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

      // 2. Optimistic local state update (Zero refetch)
      setOrders(prev => {
        const next = prev.map(o => o.id === id ? { ...o, status, updatedAt: Date.now() } : o);
        try {
          localStorage.setItem('eleganbd_all_orders', JSON.stringify(next));
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

      // 2. Optimistic local state update
      setOrders(prev => {
        const next = prev.map(o => o.id === id ? { ...o, ...updatedData } : o);
        try {
          localStorage.setItem('eleganbd_all_orders', JSON.stringify(next));
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
          await restoreOrderStock(order);
        }
      }

      // 1. Delete in Firestore
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (e) {
        console.warn('[OrderContext] Firestore delete order fallback:', e);
      }

      // 2. Optimistic update
      setOrders(prev => {
        const next = prev.filter(o => o.id !== id);
        try {
          localStorage.setItem('eleganbd_all_orders', JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (error) {
      console.error(`[OrderContext] ERROR: Deleting order ${id}:`, error);
      throw error;
    }
  };

  const getNextOrderId = () => generateNextOrderId(orders);

  const addOrder = async (order: Order) => {
    try {
      const targetCustomerId = currentUser
        ? ((isAdmin && order.customerId) ? order.customerId : currentUser.uid)
        : (order.customerId || `GUEST-${Math.floor(Math.random() * 1000)}`);
        
      const existingInvoices = orders
        .map(o => {
          if (typeof o.invoiceNo === 'number' && o.invoiceNo >= 2670000) return o.invoiceNo;
          if (o.id && /^\d{7,}$/.test(o.id)) {
            const num = parseInt(o.id, 10);
            if (!isNaN(num) && num >= 2670000) return num;
          }
          return null;
        })
        .filter((v): v is number => v !== null);

      const maxInvoice = existingInvoices.length > 0 ? Math.max(...existingInvoices) : 2669999;
      const nextInvoiceNo = maxInvoice + 1;

      const finalOrderId = (order.id && /^\d{7,}$/.test(order.id))
        ? order.id
        : generateNextOrderId(orders);

      const newOrder: Order = {
        ...order,
        id: finalOrderId,
        invoiceNo: nextInvoiceNo,
        customerId: targetCustomerId,
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      };

      // 1. Save to Firestore
      try {
        const cleaned = removeUndefined(newOrder);
        await setDoc(doc(db, 'orders', finalOrderId), cleaned);
      } catch (e) {
        console.warn('[OrderContext] Firestore order save:', e);
      }

      // 2. Optimistic State Update: add ONLY new order to memory (NO full refetch!)
      setOrders(prev => {
        const next = [newOrder, ...prev];
        try {
          localStorage.setItem('eleganbd_all_orders', JSON.stringify(next));
          if (currentUser) {
            localStorage.setItem(`eleganbd_orders_${currentUser.uid}`, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
      setLastOrder(newOrder);

      // 3. Stock management
      for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const updatedSizeStock = { ...(product.sizeStock || {}) };
          const currentSizeStock = updatedSizeStock[item.selectedSize] || 0;
          updatedSizeStock[item.selectedSize] = Math.max(0, currentSizeStock - item.quantity);
          const updatedTotalStock = Math.max(0, (product.stock || 0) - item.quantity);
          
          await updateProduct({
            ...product,
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
            authorizedBy: getAuthorizedBy(newOrder),
            notes: `Order #${finalOrderId}`
          });
        }
      }

      // 5. Email trigger
      if (newOrder.invoiceBy && newOrder.invoiceBy.toLowerCase().includes('website')) {
        fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderDetails: newOrder }),
        }).catch(err => console.error('[OrderContext] Email notification error:', err));
      }
    } catch(e) {
      console.error('[OrderContext] Add order error:', e);
    }
  };

  return (
    <OrderContext.Provider value={{ orders, updateOrderStatus, updateOrder, deleteOrder, addOrder, getNextOrderId, loading, lastOrder, refreshOrders }}>
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
