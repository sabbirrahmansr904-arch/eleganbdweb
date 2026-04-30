import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Check admin
        try {
          if (user.email === 'sabbirrahmansr904@gmail.com') {
            setIsAdmin(true);
            // Ensure admin document exists for rules.exists checks
            const adminRef = doc(db, 'admins', user.uid);
            const adminDoc = await getDoc(adminRef);
            if (!adminDoc.exists()) {
              await setDoc(adminRef, { 
                role: 'super-admin', 
                email: user.email,
                updatedAt: Date.now() 
              });
            }
          } else {
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            setIsAdmin(adminDoc.exists());
          }
        } catch (e: any) {
          if (!e?.message?.includes('resource-exhausted') && !e?.message?.includes('Quota limit exceeded')) {
             console.error("Admin check error:", e);
          }
          // Fallback if quota hit but user matches critical email
          setIsAdmin(user.email === 'sabbirrahmansr904@gmail.com');
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, loading, signInWithGoogle, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
