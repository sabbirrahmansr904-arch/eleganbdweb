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
    // 1. Fetch from Server API first (Fast & Reliable Firestore data)
    fetch('/api/banners')
      .then(res => {
        if (!res.ok) throw new Error('API not available');
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.banners) && data.banners.length > 0) {
          setBanners(data.banners);
          try {
            localStorage.setItem('eleganbd_banners', JSON.stringify(data.banners));
          } catch {}
        }
      })
      .catch(() => {
        // Direct Firestore fallback for Vercel / static hosts
        getDocs(collection(db, 'banners'))
          .then(snap => {
            if (!snap.empty) {
              const bannerList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Banner[];
              setBanners(bannerList);
              try {
                localStorage.setItem('eleganbd_banners', JSON.stringify(bannerList));
              } catch {}
            }
          })
          .catch(() => {});
      });

    // 2. Fetch from Supabase fallback
    fetchDocumentsFromSupabase('banners').then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setBanners(data);
        localStorage.setItem('eleganbd_banners', JSON.stringify(data));
      }
    }).catch(() => {});

    // 3. Realtime Firestore listener
    let unsubscribe: (() => void) | null = null;
    try {
      const q = query(collection(db, 'banners'));
      unsubscribe = onSnapshot(q, (snapshot) => {
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
    } catch (e) {}

    return () => {
      if (unsubscribe) unsubscribe();
    };
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

    // 1. Save to Firestore as primary persistent database
    try {
      await setDoc(doc(db, 'banners', id), newBanner);
    } catch (e) {
      console.warn("Firestore banner save notice:", e);
    }

    // 2. Supabase mirror in background (non-blocking)
    try {
      saveDocumentToSupabase('banners', id, newBanner).catch(() => {});
    } catch {}
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

    // 1. Save to Firestore as primary
    try {
      await setDoc(doc(db, 'banners', id), updates, { merge: true });
    } catch (e) {
      console.warn("Firestore banner update notice:", e);
    }

    // 2. Supabase mirror in background (non-blocking)
    try {
      saveDocumentToSupabase('banners', id, updates).catch(() => {});
    } catch {}
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

    // 1. Delete from Firestore as primary
    try {
      await deleteDoc(doc(db, 'banners', id));
    } catch (e) {
      console.warn("Firestore banner delete notice:", e);
    }

    // 2. Delete from Supabase in background (non-blocking)
    try {
      deleteDocumentFromSupabase('banners', id).catch(() => {});
    } catch {}
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
