/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, getDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { useInventory } from './InventoryContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const { currentUser, isAdmin } = useAuth();
  const { products, updateProduct } = useProducts();
  const { addTransaction } = useInventory();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // Load from localStorage cache immediately
    try {
      const cached = localStorage.getItem('eleganbd_all_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn("Failed to load cached orders");
    }

    setLoading(true);
    let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    if (!isAdmin && currentUser) {
      q = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach(doc => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });

      // Notification for Admin when a new order arrives
      if (!isInitialLoad.current && isAdmin && snapshot.docChanges().some(change => change.type === 'added')) {
        const newOrder = ordersData[0];
        if (newOrder) {
          setLastOrder(newOrder);
          // Native Browser Notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New Order Received!", {
              body: `Order #${newOrder.id.slice(-6)} from ${newOrder.customerName || 'Customer'}`,
              icon: '/vite.svg'
            });
          }
        }
      }

      // Auto-assign / migrate sequential Invoice No starting from 2670000
      if (isAdmin && ordersData.length > 0) {
        const assignedInvoices = ordersData
          .map(o => {
            if (typeof o.invoiceNo === 'number' && o.invoiceNo >= 2670000) return o.invoiceNo;
            if (o.id && /^\d{7,}$/.test(o.id)) {
              const num = parseInt(o.id, 10);
              if (!isNaN(num) && num >= 2670000) return num;
            }
            return null;
          })
          .filter((v): v is number => v !== null);
        
        let highestInvoice = assignedInvoices.length > 0 ? Math.max(...assignedInvoices) : 2669999;
        
        // Filter orders missing valid invoiceNo >= 2670000, sorted chronologically by creation date (oldest first)
        const missing = ordersData
          .filter(o => {
            const validInvoice = typeof o.invoiceNo === 'number' && o.invoiceNo >= 2670000;
            const validId = o.id && /^\d{7,}$/.test(o.id) && parseInt(o.id, 10) >= 2670000;
            return !validInvoice && !validId;
          })
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
        if (missing.length > 0) {
          console.log(`[OrderContext] Auto-assigning sequential invoice numbers starting at ${highestInvoice + 1} to ${missing.length} orders...`);
          Promise.all(missing.map(async (order) => {
            highestInvoice++;
            const assignedNo = highestInvoice;
            order.invoiceNo = assignedNo; // update in memory
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
        localStorage.setItem('eleganbd_all_orders', JSON.stringify(ordersData));
        if (currentUser) {
          localStorage.setItem(`eleganbd_orders_${currentUser.uid}`, JSON.stringify(ordersData));
        }
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

  const getAuthorizedBy = (order: Order) => {
    if (order.invoiceBy && order.invoiceBy.toLowerCase().includes('website')) {
      return 'Website';
    }
    return order.invoiceBy || currentUser?.displayName || currentUser?.email || 'Admin';
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
      if (order && isDeliveredOrSuccess(order.status)) {
        throw new Error('সাকসেস বা ডেলিভার্ড অর্ডারের স্ট্যাটাস কোনোভাবেই পরিবর্তন করা যাবে না।');
      }
      if (order) {
        await handleStatusChangeStock(order, status);
      }
      const updatedData = { status, updatedAt: Date.now() };
      const cleaned = removeUndefined(updatedData);
      await setDoc(doc(db, 'orders', id), cleaned, { merge: true });

      const updatedOrder = { ...(orders.find(o => o.id === id) || {}), ...updatedData } as Order;
      await syncCustomerForOrder(updatedOrder, orders);
    } catch (error: any) {
      console.error("Error updating order status:", error);
      throw error;
    }
  };

  const syncCustomerForOrder = async (order: Order, allOrdersList: Order[]) => {
    if (!order.phone) return;
    try {
      const phoneTrimmed = order.phone.trim();
      const customerRef = doc(db, 'customers', phoneTrimmed);
      
      const customerOrders = allOrdersList.filter(o => o.phone && o.phone.trim() === phoneTrimmed);
      if (!customerOrders.some(o => o.id === order.id)) {
        customerOrders.push(order);
      }

      if (customerOrders.length === 0) {
        // If no orders remain for this phone, we can update totals to 0 or leave/delete
        await setDoc(customerRef, {
          phone: phoneTrimmed,
          totalOrders: 0,
          totalSpent: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          exchanges: 0,
        }, { merge: true });
        return;
      }

      const totalOrders = customerOrders.length;
      const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const deliveredOrders = customerOrders.filter(o => (o.status || '').toLowerCase() === 'delivered').length;
      const cancelledOrders = customerOrders.filter(o => (o.status || '').toLowerCase() === 'cancelled').length;
      const exchanges = customerOrders.filter(o => (o.status || '').toLowerCase() === 'returned' || (o.status || '').toLowerCase() === 'exchange').length;

      const latestOrder = customerOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

      await setDoc(customerRef, {
        name: order.customerName || latestOrder?.customerName || 'Valued Customer',
        email: order.email || latestOrder?.email || '',
        phone: phoneTrimmed,
        address: order.address || latestOrder?.address || '',
        city: order.city || latestOrder?.city || '',
        totalOrders,
        totalSpent,
        deliveredOrders,
        cancelledOrders,
        exchanges,
        lastOrderDate: latestOrder?.createdAt || new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Error syncing customer for order:", err);
    }
  };

  const updateOrder = async (id: string, data: Partial<Order> & Record<string, any>) => {
    try {
      const currentUserEmail = auth.currentUser?.email ? auth.currentUser.email.toLowerCase().trim() : '';
      const isCEOUser = currentUserEmail === 'eleganbd.ltd@gmail.com';
      
      if (data.status) {
        const targetStatus = (data.status || '').toUpperCase().trim();
        const allowedStatuses = ['PENDING', 'ORDER PLACED', 'PRINTED', 'PREPARING', 'PROCESSING'];
        if (!isCEOUser) {
          const existingOrder = orders.find(o => o.id === id);
          if (existingOrder) {
            const currentStatus = (existingOrder.status || '').toUpperCase().trim();
            if (currentStatus === 'SHIPPED' || currentStatus === 'DELIVERED') {
              throw new Error('Only CEO (eleganbd.ltd@gmail.com) can modify orders that are already Shipped or Delivered.');
            }
          }
          if (!allowedStatuses.includes(targetStatus)) {
            throw new Error('Only CEO (eleganbd.ltd@gmail.com) can change order status to Shipped, Delivered, Cancelled, or other restricted statuses.');
          }
        }
        const order = orders.find(o => o.id === id);
        if (order) {
          await handleStatusChangeStock(order, data.status);
        }
      }
      const updatedData = { ...data, updatedAt: Date.now() };
      const cleaned = removeUndefined(updatedData);
      await setDoc(doc(db, 'orders', id), cleaned, { merge: true });

      const updatedOrder = { ...(orders.find(o => o.id === id) || {}), ...updatedData } as Order;
      const combinedOrders = orders.map(o => o.id === id ? updatedOrder : o);
      await syncCustomerForOrder(updatedOrder, combinedOrders);
    } catch (error: any) {
      console.error("Error updating order:", error);
      throw error;
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
      if (order) {
        const s = (order.status || '').toString().trim().toLowerCase();
        const isAlreadyRestored = s === 'cancelled' || s === 'canceled' || s === 'returned' || s === 'return';
        if (!isAlreadyRestored) {
          // If order was in any status other than cancelled/returned, restore its items to stock on deletion
          await restoreOrderStock(order);
        }
      }
      const orderRef = doc(db, 'orders', id);
      await deleteDoc(orderRef);
      console.log(`[OrderContext] SUCCESS: Deleted order document: ${id}`);
      
      const remainingOrders = orders.filter(o => o.id !== id);
      // Optimistic update
      setOrders(prev => prev.filter(order => order.id !== id));

      if (order && order.phone) {
        await syncCustomerForOrder(order, remainingOrders);
      }
    } catch (error) {
      console.error(`[OrderContext] ERROR: Deleting order ${id}:`, error);
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
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

      // Assign serial order ID starting from 2670000 if not already assigned
      const finalOrderId = (order.id && /^\d{7,}$/.test(order.id))
        ? order.id
        : generateNextOrderId(orders);

      const newOrder = {
        ...order,
        id: finalOrderId,
        invoiceNo: nextInvoiceNo,
        customerId: targetCustomerId,
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      };
      const cleaned = removeUndefined(newOrder);
      await setDoc(doc(db, 'orders', finalOrderId), cleaned);

      const combinedOrders = [newOrder, ...orders];
      await syncCustomerForOrder(newOrder, combinedOrders);

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
            authorizedBy: getAuthorizedBy(newOrder),
            notes: `Order #${finalOrderId}`
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
    <OrderContext.Provider value={{ orders, updateOrderStatus, updateOrder, deleteOrder, addOrder, getNextOrderId, loading, lastOrder }}>
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

