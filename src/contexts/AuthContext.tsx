import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  customerUser: { email: string } | null;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logoutCustomer: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
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
  const [customerUser, setCustomerUser] = useState<{ email: string } | null>(() => {
    try {
      const saved = localStorage.getItem('elegan_customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const sendOtp = async (email: string) => {
    await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) throw new Error('Invalid OTP');
    
    const user = { email };
    setCustomerUser(user);
    localStorage.setItem('elegan_customer_user', JSON.stringify(user));
  };

  const logoutCustomer = () => {
    setCustomerUser(null);
    localStorage.removeItem('elegan_customer_user');
  };

  const isSuperAdminEmail = (email: string | null) => 
    !email ? false : [
      'sabbirrahmansr904@gmail.com',
      'eleganbd.ltd@gmail.com',
      'shamiulislamatik@gmail.com',
      'elegantbd.ltd@gmail.com',
      'eleganbd@gmail.com',
      'elegantbd@gmail.com'
    ].includes(email.toLowerCase());

  const refreshAdminStatus = async () => {
    if (auth.currentUser) {
      const superStatus = isSuperAdminEmail(auth.currentUser.email);
      setIsSuperAdmin(superStatus);
      if (superStatus) {
        setIsAdmin(true);
        setPermissions(['dashboard', 'customers', 'orders', 'products', 'issues', 'masterTable', 'finance', 'settings']);
      } else {
        try {
          const adminRef = doc(db, 'admins', auth.currentUser.uid);
          const adminDoc = await getDoc(adminRef);
          if (adminDoc.exists()) {
            setIsAdmin(true);
            setPermissions(adminDoc.data()?.permissions || []);
          } else if (auth.currentUser.email) {
            const inviteDoc = await getDoc(doc(db, 'admin_invites', auth.currentUser.email.toLowerCase()));
            if (inviteDoc.exists()) {
              const inviteData = inviteDoc.data();
              await setDoc(adminRef, {
                role: 'admin',
                email: auth.currentUser.email,
                permissions: inviteData.permissions || [],
                updatedAt: Date.now()
              });
              setIsAdmin(true);
              setPermissions(inviteData.permissions || []);
            } else {
              setIsAdmin(false);
              setPermissions([]);
            }
          } else {
            setIsAdmin(false);
            setPermissions([]);
          }
        } catch (e) {
          setIsAdmin(false);
          setPermissions([]);
        }
      }
    } else {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setPermissions([]);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const superStatus = isSuperAdminEmail(user.email);
        setIsSuperAdmin(superStatus);
        
        // Admin check logic...
        let adminStatus = superStatus;
        try {
          if (superStatus) {
            setIsAdmin(true);
            setPermissions(['dashboard', 'customers', 'orders', 'products', 'issues', 'masterTable', 'finance', 'settings']);
            const adminRef = doc(db, 'admins', user.uid);
            const adminDoc = await getDoc(adminRef);
            if (!adminDoc.exists()) {
              await setDoc(adminRef, { 
                role: 'super-admin', 
                email: user.email,
                permissions: ['dashboard', 'customers', 'orders', 'products', 'issues', 'masterTable', 'finance', 'settings'],
                updatedAt: Date.now() 
              });
            }
          } else {
            const adminRef = doc(db, 'admins', user.uid);
            const adminDoc = await getDoc(adminRef);
            if (adminDoc.exists()) {
              setIsAdmin(true);
              adminStatus = true;
              setPermissions(adminDoc.data()?.permissions || []);
            } else if (user.email) {
              const inviteDoc = await getDoc(doc(db, 'admin_invites', user.email.toLowerCase()));
              if (inviteDoc.exists()) {
                const inviteData = inviteDoc.data();
                await setDoc(adminRef, {
                  role: 'admin',
                  email: user.email,
                  permissions: inviteData.permissions || [],
                  updatedAt: Date.now()
                });
                setIsAdmin(true);
                adminStatus = true;
                setPermissions(inviteData.permissions || []);
              } else {
                setIsAdmin(false);
                adminStatus = false;
                setPermissions([]);
              }
            } else {
              setIsAdmin(false);
              adminStatus = false;
              setPermissions([]);
            }
          }
        } catch (e: any) {
          if (!e?.message?.includes('resource-exhausted') && !e?.message?.includes('Quota limit exceeded')) {
             console.error("Admin check error:", e);
          }
          setIsAdmin(superStatus);
          adminStatus = superStatus;
          setPermissions(superStatus ? ['dashboard', 'customers', 'orders', 'products', 'issues', 'masterTable', 'finance', 'settings'] : []);
        }

        // Set customerUser if not admin
        if (!adminStatus && user.email) {
           const customer = { email: user.email };
           setCustomerUser(customer);
           localStorage.setItem('elegan_customer_user', JSON.stringify(customer));
        }
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setPermissions([]);
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
    <AuthContext.Provider value={{ 
      currentUser, 
      customerUser, 
      sendOtp,
      verifyOtp,
      logoutCustomer, 
      isAdmin,
      isSuperAdmin,
      permissions,
      loading, 
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      signOut, 
      refreshAdminStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
