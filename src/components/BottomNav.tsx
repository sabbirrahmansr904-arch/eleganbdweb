import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, Zap, User, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';

export default function BottomNav({ cartCount }: { cartCount: number }) {
  const location = useLocation();
  
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Categories', path: '/category/all', icon: Grid },
    { name: 'Account', path: '/dashboard', icon: User },
    { name: 'Bag', path: '/cart', icon: ShoppingBag, count: cartCount },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 z-50 px-2 py-2 flex items-center justify-around shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.name} 
            to={item.path} 
            className={cn(
              "flex flex-col items-center justify-center p-2 relative min-w-[60px] transition-all",
              isActive ? "text-brand-gold" : "text-gray-400"
            )}
          >
            <item.icon size={20} className={cn(isActive && "scale-110")} />
            <span className="text-[10px] font-bold uppercase tracking-tighter mt-1">{item.name}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="absolute top-1 right-3.5 w-4 h-4 bg-red-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {item.count}
              </span>
            )}
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand-gold rounded-b-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
