/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface OrderContextType {
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  loading: boolean;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, isAdmin } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        // Admins see all orders, regular users see only their orders
        let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        if (!isAdmin) {
          q = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid));
        }

        const snapshot = await getDocs(q);
        const ordersData: Order[] = [];
        snapshot.forEach(doc => {
           ordersData.push(doc.data() as Order);
        });
        setOrders(ordersData);
        try {
          localStorage.setItem(`eleganbd_orders_${currentUser.uid}`, JSON.stringify(ordersData));
        } catch (e) {
          console.warn("Storage quota exceeded, skipping orders cache");
        }
      } catch (error: any) {
        if (!error?.message?.includes('resource-exhausted') && !error?.message?.includes('Quota limit exceeded')) {
           console.error("Order fetch error:", error);
        }
        // Fallback to local cache
        const cached = localStorage.getItem(`eleganbd_orders_${currentUser.uid}`);
        if (cached) {
          setOrders(JSON.parse(cached));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser, isAdmin]);

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      const updatedData = { status, updatedAt: Date.now() };
      await setDoc(doc(db, 'orders', id), updatedData, { merge: true });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updatedData } : o));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  const addOrder = async (order: Order) => {
    if (!currentUser) throw new Error("Must be logged in to order");
    try {
      const newOrder = {
        ...order,
        customerId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'orders', order.id), newOrder);
      setOrders(prev => [newOrder, ...prev]);
    } catch(e) {
      handleFirestoreError(e, OperationType.CREATE, `orders/${order.id}`);
    }
  };

  return (
    <OrderContext.Provider value={{ orders, updateOrderStatus, deleteOrder, addOrder, loading }}>
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

