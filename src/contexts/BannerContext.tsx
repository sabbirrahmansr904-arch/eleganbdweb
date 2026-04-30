import React, { createContext, useContext, useState, useEffect } from 'react';
import { Banner } from '../types';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface BannerContextType {
  banners: Banner[];
  addBanner: (banner: Omit<Banner, 'id'>) => Promise<void>;
  updateBanner: (id: string, updates: Partial<Banner>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export function BannerProvider({ children }: { children: React.ReactNode }) {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'banners'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bannerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Banner[];
      setBanners(bannerList);
    }, (error) => {
      if (!error.message.includes('resource-exhausted')) {
        console.error("Banner listener error:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  const addBanner = async (banner: Omit<Banner, 'id'>) => {
    try {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'banners', id), banner);
    } catch (e) {
      console.error("Error adding banner:", e);
      toast.error("Failed to save banner. Image might be too large.");
    }
  };

  const updateBanner = async (id: string, updates: Partial<Banner>) => {
    try {
      await setDoc(doc(db, 'banners', id), updates, { merge: true });
    } catch (e) {
      console.error("Error updating banner:", e);
      toast.error("Failed to update banner.");
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'banners', id));
    } catch (e) {
      console.error("Error deleting banner:", e);
      toast.error("Failed to delete banner.");
    }
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
