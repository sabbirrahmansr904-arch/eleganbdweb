import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSuperAdminEmail = (email: string | null) => 
    email === 'eleganbd.ltd@gmail.com';

  const refreshAdminStatus = async () => {
    if (auth.currentUser) {
      if (isSuperAdminEmail(auth.currentUser.email)) {
        setIsAdmin(true);
      } else {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', auth.currentUser.uid));
          setIsAdmin(adminDoc.exists());
        } catch (e) {
          setIsAdmin(false);
        }
      }
    } else {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Check admin
        try {
          if (isSuperAdminEmail(user.email)) {
            setIsAdmin(true);
            // Ensure admin document exists
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
          setIsAdmin(isSuperAdminEmail(user.email));
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

  const signUpWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshAdminStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
