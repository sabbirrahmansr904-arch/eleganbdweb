import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { calculateCartSubtotal } from '../lib/utils';

interface CartItem {
  id: string;
  product: Product;
  selectedSize: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, size: string, qty: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const cached = localStorage.getItem('eleganbd_cart');
    return cached ? JSON.parse(cached) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('eleganbd_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, size: string, qty: number) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.selectedSize === size);
      if (existing) {
        return prev.map(item => 
          (item.product.id === product.id && item.selectedSize === size) 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { id: `${product.id}-${size}-${Date.now()}`, product, selectedSize: size, quantity: qty }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: qty } : item));
  };

  const clearCart = () => setItems([]);

  const total = calculateCartSubtotal(items);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
