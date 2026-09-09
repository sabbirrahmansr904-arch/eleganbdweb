import React, { createContext, useContext, useState, useEffect } from 'react';
import { Banner } from '../types';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isFirestoreQuotaExceeded, isQuotaError } from '../lib/firestoreUtils';
import { saveDocumentToSupabase, deleteDocumentFromSupabase, fetchDocumentsFromSupabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface BannerContextType {
  banners: Banner[];
  addBanner: (banner: Omit<Banner, 'id'>) => Promise<void>;
  updateBanner: (id: string, updates: Partial<Banner>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export function BannerProvider({ children }: { children: React.ReactNode }) {
  const [banners, setBanners] = useState<Banner[]>(() => {
    try {
      const cached = localStorage.getItem('eleganbd_banners');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  useEffect(() => {
    // 1. Fetch from Supabase
    fetchDocumentsFromSupabase('banners').then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setBanners(data);
        localStorage.setItem('eleganbd_banners', JSON.stringify(data));
      }
    }).catch(() => {});

    if (isFirestoreQuotaExceeded) return;

    const q = query(collection(db, 'banners'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bannerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Banner[];
      setBanners(bannerList);
      try {
        localStorage.setItem('eleganbd_banners', JSON.stringify(bannerList));
      } catch {}
    }, (error) => {
      if (!isQuotaError(error)) {
        console.warn("Banner real-time listener notice:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  const addBanner = async (banner: Omit<Banner, 'id'>) => {
    const id = `b_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newBanner = { ...banner, id };
    
    // Optimistic update
    setBanners(prev => {
      const next = [newBanner, ...prev];
      try {
        localStorage.setItem('eleganbd_banners', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 1. Save to Supabase
    await saveDocumentToSupabase('banners', id, banner);

    // 2. Save to Firestore as backup
    try {
      await setDoc(doc(db, 'banners', id), banner);
    } catch (e) {}
  };

  const updateBanner = async (id: string, updates: Partial<Banner>) => {
    // Optimistic update
    setBanners(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...updates } : b);
      try {
        localStorage.setItem('eleganbd_banners', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 1. Save to Supabase
    await saveDocumentToSupabase('banners', id, updates);

    // 2. Save to Firestore as backup
    try {
      await setDoc(doc(db, 'banners', id), updates, { merge: true });
    } catch (e) {}
  };

  const deleteBanner = async (id: string) => {
    // Optimistic update
    setBanners(prev => {
      const next = prev.filter(b => b.id !== id);
      try {
        localStorage.setItem('eleganbd_banners', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 1. Delete from Supabase
    await deleteDocumentFromSupabase('banners', id);

    // 2. Delete from Firestore
    try {
      await deleteDoc(doc(db, 'banners', id));
    } catch (e) {}
  };

  return (
    <BannerContext.Provider value={{ banners, addBanner, updateBanner, deleteBanner }}>
      {children}
    </BannerContext.Provider>
  );
}

export function useBanners() {
  const context = useContext(BannerContext);
  if (context === undefined) {
    throw new Error('useBanners must be used within a BannerProvider');
  }
  return context;
}
