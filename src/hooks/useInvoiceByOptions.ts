import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isFirestoreQuotaExceeded, isQuotaError } from '../lib/firestoreUtils';

const DEFAULT_OPTIONS = ['Sabbir', 'Nasir', 'Shamiul', 'Office Sale'];

export function useInvoiceByOptions() {
  const [options, setOptions] = useState<string[]>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirestoreQuotaExceeded) {
      setOptions(DEFAULT_OPTIONS);
      setLoading(false);
      return;
    }

    let unsub = () => {};
    try {
      const q = query(collection(db, 'invoice_by_options'));
      unsub = onSnapshot(q, (snapshot) => {
        const customNames: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.name && typeof data.name === 'string') {
            const clean = data.name.trim();
            if (clean) customNames.push(clean);
          }
        });

        // Combine defaults and custom names without duplicates
        const combined = Array.from(new Set([...DEFAULT_OPTIONS, ...customNames]));
        setOptions(combined);
        setLoading(false);
      }, (err) => {
        if (!isQuotaError(err)) {
          console.warn("Firestore invoice_by_options notice:", err);
        }
        setOptions(DEFAULT_OPTIONS);
        setLoading(false);
      });
    } catch (e) {
      if (!isQuotaError(e)) {
        console.warn("Error setting up invoice_by_options listener:", e);
      }
      setOptions(DEFAULT_OPTIONS);
      setLoading(false);
    }

    return () => unsub();
  }, []);

  const addOption = async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    // Check if already exists in state
    if (options.some(o => o.toLowerCase() === trimmed.toLowerCase())) {
      return true; // Already exists
    }

    try {
      await addDoc(collection(db, 'invoice_by_options'), {
        name: trimmed,
        createdAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      if (!isQuotaError(err)) {
        console.warn("Failed to save new invoice_by option to Firestore:", err);
      }
      return false;
    }
  };

  return { options, addOption, loading };
}

