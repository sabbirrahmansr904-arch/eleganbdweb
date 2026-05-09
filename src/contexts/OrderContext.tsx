/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface OrderContextType {
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
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

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      const updatedData = { status, updatedAt: Date.now() };
      await setDoc(doc(db, 'orders', id), updatedData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
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
    } catch(e) {
      handleFirestoreError(e, OperationType.CREATE, `orders/${order.id}`);
    }
  };

  return (
    <OrderContext.Provider value={{ orders, updateOrderStatus, deleteOrder, addOrder, loading, lastOrder }}>
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

