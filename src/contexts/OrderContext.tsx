/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { useInventory } from './InventoryContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface OrderContextType {
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order> & Record<string, any>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  loading: boolean;
  lastOrder?: Order | null;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const { currentUser, isAdmin } = useAuth();
  const { products, updateProduct } = useProducts();
  const { addTransaction } = useInventory();
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    if (!isAdmin) {
      q = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach(doc => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });

      // Sound notification for Admin when a new order arrives
      if (!isInitialLoad.current && isAdmin && snapshot.docChanges().some(change => change.type === 'added')) {
        const newOrder = ordersData[0];
        setLastOrder(newOrder);
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.warn("Audio play blocked by browser", e));
        }
        // Native Browser Notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Order Received!", {
            body: `Order #${newOrder.id.slice(-6)} from ${newOrder.customerName || 'Customer'}`,
            icon: '/vite.svg'
          });
        }
      }

      // Auto-assign sequential Invoice No starting from 1000 for any orders missing them
      if (isAdmin && ordersData.length > 0) {
        const assignedInvoices = ordersData
          .filter(o => typeof o.invoiceNo === 'number')
          .map(o => o.invoiceNo as number);
        
        let highestInvoice = assignedInvoices.length > 0 ? Math.max(...assignedInvoices) : 999;
        
        // Filter orders missing invoiceNo, sorted chronologically by creation date (oldest first)
        const missing = ordersData
          .filter(o => typeof o.invoiceNo !== 'number')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
        if (missing.length > 0) {
          console.log(`[OrderContext] Auto-assigning sequential invoice numbers starting at ${highestInvoice + 1} to ${missing.length} orders...`);
          Promise.all(missing.map(async (order) => {
            highestInvoice++;
            const assignedNo = highestInvoice;
            try {
              await setDoc(doc(db, 'orders', order.id), { invoiceNo: assignedNo }, { merge: true });
            } catch (err) {
              console.error(`[OrderContext] Error assigning invoiceNo to ${order.id}:`, err);
            }
          })).catch(err => console.error("[OrderContext] Migration error:", err));
        }
      }

      setOrders(ordersData);
      setLoading(false);
      isInitialLoad.current = false;

      try {
        localStorage.setItem(`eleganbd_orders_${currentUser.uid}`, JSON.stringify(ordersData));
      } catch (e) {
        console.warn("Storage quota exceeded, skipping orders cache");
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  const removeUndefined = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(removeUndefined);
    }
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = removeUndefined(val);
      }
    }
    return cleaned;
  };

  const restoreOrderStock = async (order: Order) => {
    try {
      console.log(`[OrderContext] Restoring stock for order: ${order.id}`);
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

          // Log transaction for each item as proof of "Stock In"
          await addTransaction({
            type: 'in',
            sku: product.sku || product.id,
            productName: product.name,
            quantities: { [item.selectedSize]: item.quantity },
            totalQuantity: item.quantity,
            category: product.category,
            authorizedBy: 'Order System',
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
      console.log(`[OrderContext] Re-deducting stock for order: ${order.id}`);
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

          // Log transaction for each item as proof of "Stock Out"
          await addTransaction({
            type: 'out',
            sku: product.sku || product.id,
            productName: product.name,
            quantities: { [item.selectedSize]: item.quantity },
            totalQuantity: item.quantity,
            category: product.category,
            authorizedBy: 'Order System',
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
      // Order is now cancelled/returned -> restore stock
      await restoreOrderStock(order);
    } else if (isOldRestored && !isNewRestored) {
      // Order is re-activated from cancelled/returned -> deduct stock
      await deductOrderStock(order);
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      const order = orders.find(o => o.id === id);
      if (order) {
        await handleStatusChangeStock(order, status);
      }
      const updatedData = { status, updatedAt: Date.now() };
      const cleaned = removeUndefined(updatedData);
      await setDoc(doc(db, 'orders', id), cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
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
      const cleaned = removeUndefined(updatedData);
      await setDoc(doc(db, 'orders', id), cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!id) {
      console.error('deleteOrder called without an ID');
      return;
    }
    console.log(`[OrderContext] START: Attempting to delete order: ${id}`);
    try {
      const order = orders.find(o => o.id === id);
      if (order && order.status !== 'Cancelled' && order.status !== 'Returned') {
        // If order was active, restore its items to stock on deletion
        await restoreOrderStock(order);
      }
      const orderRef = doc(db, 'orders', id);
      await deleteDoc(orderRef);
      console.log(`[OrderContext] SUCCESS: Deleted order document: ${id}`);
      // Optimistic update
      setOrders(prev => prev.filter(order => order.id !== id));
    } catch (error) {
      console.error(`[OrderContext] ERROR: Deleting order ${id}:`, error);
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
      throw error;
    }
  };

  const addOrder = async (order: Order) => {
    try {
      const targetCustomerId = currentUser
        ? ((isAdmin && order.customerId) ? order.customerId : currentUser.uid)
        : (order.customerId || `GUEST-${Math.floor(Math.random() * 1000)}`);
        
      const existingInvoices = orders
        .filter(o => typeof o.invoiceNo === 'number')
        .map(o => o.invoiceNo as number);
      const maxInvoice = existingInvoices.length > 0 ? Math.max(...existingInvoices) : 999;
      const nextInvoiceNo = maxInvoice + 1;

      const newOrder = {
        ...order,
        invoiceNo: nextInvoiceNo,
        customerId: targetCustomerId,
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      };
      const cleaned = removeUndefined(newOrder);
      await setDoc(doc(db, 'orders', order.id), cleaned);

      // Automatically reduce stock and log inventory transactions
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

          // Log transaction for each item as proof of "Stock Out"
          await addTransaction({
            type: 'out',
            sku: product.sku || product.id,
            productName: product.name,
            quantities: { [item.selectedSize]: item.quantity },
            totalQuantity: item.quantity,
            category: product.category,
            authorizedBy: 'Order System',
            notes: `Order #${order.id.slice(-6)}`
          });
        }
      }

      // Automatically send Gmail notification if the order was placed via the website
      if (newOrder.invoiceBy && newOrder.invoiceBy.toLowerCase().includes('website')) {
        fetch('/api/send-order-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderDetails: newOrder }),
        })
        .then(response => response.json())
        .then(data => console.log('[OrderContext] Email notification status:', data))
        .catch(error => console.error('[OrderContext] Error sending email notification:', error));
      }
    } catch(e) {
      handleFirestoreError(e, OperationType.CREATE, `orders/${order.id}`);
    }
  };

  return (
    <OrderContext.Provider value={{ orders, updateOrderStatus, updateOrder, deleteOrder, addOrder, loading, lastOrder }}>
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

