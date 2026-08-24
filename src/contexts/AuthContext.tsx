import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  customerUser: { email: string; name?: string } | null;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  loginCustomer: (phoneOrEmail: string, name?: string) => void;
  logoutCustomer: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCEO: boolean;
  isSabbirRahman: boolean;
  canManageAccounting: boolean;
  department: string;
  permissions: string[];
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const isSabbirEmail = (email: string | null | undefined, displayName?: string | null | undefined): boolean => {
  if (!email && !displayName) return false;
  const e = (email || '').toLowerCase().trim();
  const d = (displayName || '').toLowerCase().trim();
  return (
    e === 'sabbirrahmansr904@gmail.com' ||
    e.startsWith('sabbirrahmansr904') ||
    d.includes('sabbir rahman')
  );
};

export const ACCOUNTING_PERMISSIONS = ['finance', 'dollar-expense', 'partnership', 'transaction-list', 'payments'];

export const filterPermsForUser = (perms: string[], isSabbir: boolean): string[] => {
  if (isSabbir) return perms;
  return perms.filter(p => !ACCOUNTING_PERMISSIONS.includes(p) && p !== 'all');
};

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
  const [isCEO, setIsCEO] = useState(false);
  const [isSabbirRahman, setIsSabbirRahman] = useState(false);
  const [department, setDepartment] = useState<string>('Sales Executive Department');
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

  const loginCustomer = (phoneOrEmail: string, name?: string) => {
    const user = { email: phoneOrEmail, name: name || '' };
    setCustomerUser(user);
    localStorage.setItem('elegan_customer_user', JSON.stringify(user));
  };

  const logoutCustomer = () => {
    setCustomerUser(null);
    localStorage.removeItem('elegan_customer_user');
  };

  const isSuperAdminEmail = (email: string | null) => 
    !email ? false : [
      'eleganbd.ltd@gmail.com',
      'shamiulislamatik@gmail.com',
      'nasiruddinovi2025@gmail.com',
      'elegantbd.ltd@gmail.com',
      'eleganbd@gmail.com',
      'elegantbd@gmail.com',
      'sabbirrahmansr904@gmail.com'
    ].includes(email.toLowerCase().trim()) && email.toLowerCase().trim() !== 'sohelmiah332004@gmail.com';

  const isCeoEmail = (email: string | null) =>
    !email ? false : [
      'eleganbd.ltd@gmail.com',
      'shamiulislamatik@gmail.com',
      'nasiruddinovi2025@gmail.com',
      'sabbirrahmansr904@gmail.com',
      'elegantbd.ltd@gmail.com',
      'eleganbd@gmail.com',
      'elegantbd@gmail.com'
    ].includes(email.toLowerCase().trim()) && email.toLowerCase().trim() !== 'sohelmiah332004@gmail.com';

  const refreshAdminStatus = async () => {
    if (auth.currentUser) {
      const email = auth.currentUser.email ? auth.currentUser.email.toLowerCase().trim() : '';
      const ceoStatus = isCeoEmail(auth.currentUser.email);
      setIsCEO(ceoStatus);

      const superStatus = isSuperAdminEmail(auth.currentUser.email) || ceoStatus;
      setIsSuperAdmin(superStatus);

      const sabbirStatus = isSabbirEmail(auth.currentUser.email, auth.currentUser.displayName);
      setIsSabbirRahman(sabbirStatus);

      let fetchedDept = ceoStatus ? 'CEO & Founder' : (superStatus ? 'CEO & Founder' : 'Sales Executive Department');

      const allBasePerms = ['dashboard', 'customer-profiler', 'my-account', 'all-accounts', 'admin-access', 'orders', 'exchanges', 'issues', 'products', 'categories', 'masterTable', 'master-table', 'inventory-log', 'finance', 'dollar-expense', 'partnership', 'transaction-list', 'payments', 'settings', 'branding', 'banners', 'notifications', 'media', 'pathao', 'customers', 'all'];

      if (superStatus || ceoStatus) {
        setIsAdmin(true);
        setPermissions(sabbirStatus ? allBasePerms : filterPermsForUser(allBasePerms, false));
        if (email) {
          const permDoc = await getDoc(doc(db, 'admin_permissions', email));
          if (permDoc.exists() && permDoc.data()?.department) {
            fetchedDept = permDoc.data().department;
          }
        }
        setDepartment(fetchedDept);
      } else {
        try {
          const adminRef = doc(db, 'admins', auth.currentUser.uid);
          
          let directPerms: string[] | null = null;
          let userRole = 'admin';
          if (email) {
            const permDoc = await getDoc(doc(db, 'admin_permissions', email));
            if (permDoc.exists()) {
              const pData = permDoc.data();
              directPerms = pData?.permissions || [];
              if (pData?.department) fetchedDept = pData.department;
              if (pData?.role) userRole = pData.role;
              if (pData?.role === 'ceo' || pData?.position?.toLowerCase().includes('ceo') || pData?.department?.toLowerCase().includes('ceo')) {
                setIsCEO(true);
                setIsSuperAdmin(true);
                directPerms = ['all', 'dashboard', 'orders', 'issues', 'products', 'finance', 'settings', 'media', 'categories'];
              }
            } else {
              const inviteDoc = await getDoc(doc(db, 'admin_invites', email));
              if (inviteDoc.exists()) {
                const iData = inviteDoc.data();
                directPerms = iData?.permissions || [];
                if (iData?.department) fetchedDept = iData.department;
                if (iData?.role === 'ceo' || iData?.position?.toLowerCase().includes('ceo') || iData?.department?.toLowerCase().includes('ceo')) {
                  setIsCEO(true);
                  setIsSuperAdmin(true);
                  directPerms = ['all', 'dashboard', 'orders', 'issues', 'products', 'finance', 'settings', 'media', 'categories'];
                }
              }
            }
          }

          if (directPerms !== null) {
            const finalPerms = filterPermsForUser(directPerms, sabbirStatus);
            await setDoc(adminRef, {
              role: userRole,
              email: auth.currentUser.email,
              department: fetchedDept,
              permissions: finalPerms,
              updatedAt: Date.now()
            }, { merge: true });
            setIsAdmin(true);
            setPermissions(finalPerms);
            setDepartment(fetchedDept);
          } else {
            const adminDoc = await getDoc(adminRef);
            if (adminDoc.exists()) {
              const aData = adminDoc.data();
              setIsAdmin(true);
              const aPerms = filterPermsForUser(aData?.permissions || [], sabbirStatus);
              setPermissions(aPerms);
              if (aData?.department) fetchedDept = aData.department;
              if (aData?.role === 'ceo' || aData?.role === 'super-admin' || fetchedDept.toLowerCase().includes('ceo')) {
                setIsCEO(true);
                setIsSuperAdmin(true);
              }
              setDepartment(fetchedDept);
            } else {
              setIsAdmin(false);
              setPermissions([]);
              setDepartment('Sales Executive Department');
            }
          }
        } catch (e) {
          setIsAdmin(false);
          setPermissions([]);
          setDepartment('Sales Executive Department');
        }
      }
    } else {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsCEO(false);
      setIsSabbirRahman(false);
      setPermissions([]);
      setDepartment('Sales Executive Department');
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const email = user.email ? user.email.toLowerCase().trim() : '';
        const ceoStatus = isCeoEmail(user.email);
        setIsCEO(ceoStatus);

        const superStatus = isSuperAdminEmail(user.email) || ceoStatus;
        setIsSuperAdmin(superStatus);

        const sabbirStatus = isSabbirEmail(user.email, user.displayName);
        setIsSabbirRahman(sabbirStatus);

        let fetchedDept = ceoStatus ? 'CEO & Founder' : (superStatus ? 'CEO & Founder' : 'Sales Executive Department');
        
        let adminStatus = superStatus;
        const allBasePerms = ['dashboard', 'customer-profiler', 'my-account', 'all-accounts', 'admin-access', 'orders', 'exchanges', 'issues', 'products', 'categories', 'masterTable', 'master-table', 'inventory-log', 'finance', 'dollar-expense', 'partnership', 'transaction-list', 'payments', 'settings', 'branding', 'banners', 'notifications', 'media', 'pathao', 'customers', 'all'];

        try {
          if (superStatus || ceoStatus) {
            setIsAdmin(true);
            setPermissions(sabbirStatus ? allBasePerms : filterPermsForUser(allBasePerms, false));
            
            if (email) {
              const permDoc = await getDoc(doc(db, 'admin_permissions', email));
              if (permDoc.exists() && permDoc.data()?.department) {
                fetchedDept = permDoc.data().department;
              }
            }
            setDepartment(fetchedDept);

            const adminRef = doc(db, 'admins', user.uid);
            const adminDoc = await getDoc(adminRef);
            if (!adminDoc.exists()) {
              await setDoc(adminRef, { 
                role: ceoStatus ? 'ceo' : 'super-admin', 
                email: user.email,
                department: fetchedDept,
                permissions: sabbirStatus ? allBasePerms : filterPermsForUser(allBasePerms, false),
                updatedAt: Date.now() 
              });
            }
          } else {
            const adminRef = doc(db, 'admins', user.uid);
            
            let directPerms: string[] | null = null;
            let userRole = 'admin';
            if (email) {
              const permDoc = await getDoc(doc(db, 'admin_permissions', email));
              if (permDoc.exists()) {
                const pData = permDoc.data();
                directPerms = pData?.permissions || [];
                if (pData?.department) fetchedDept = pData.department;
                if (pData?.role) userRole = pData.role;
                if (pData?.role === 'ceo' || pData?.position?.toLowerCase().includes('ceo') || pData?.department?.toLowerCase().includes('ceo')) {
                  setIsCEO(true);
                  setIsSuperAdmin(true);
                  directPerms = ['all', 'dashboard', 'orders', 'issues', 'products', 'finance', 'settings', 'media', 'categories'];
                }
              } else {
                const profileDoc = await getDoc(doc(db, 'admin_profiles', email));
                if (profileDoc.exists()) {
                  const prData = profileDoc.data();
                  directPerms = prData?.permissions || [];
                  if (prData?.department) fetchedDept = prData.department;
                  if (prData?.role === 'ceo' || prData?.position?.toLowerCase().includes('ceo') || prData?.department?.toLowerCase().includes('ceo')) {
                    setIsCEO(true);
                    setIsSuperAdmin(true);
                    directPerms = ['all', 'dashboard', 'orders', 'issues', 'products', 'finance', 'settings', 'media', 'categories'];
                  }
                } else {
                  const inviteDoc = await getDoc(doc(db, 'admin_invites', email));
                  if (inviteDoc.exists()) {
                    const iData = inviteDoc.data();
                    directPerms = iData?.permissions || [];
                    if (iData?.department) fetchedDept = iData.department;
                    if (iData?.role === 'ceo' || iData?.position?.toLowerCase().includes('ceo') || iData?.department?.toLowerCase().includes('ceo')) {
                      setIsCEO(true);
                      setIsSuperAdmin(true);
                      directPerms = ['all', 'dashboard', 'orders', 'issues', 'products', 'finance', 'settings', 'media', 'categories'];
                    }
                  }
                }
              }
            }

            if (directPerms !== null) {
              const finalPerms = filterPermsForUser(directPerms, sabbirStatus);
              await setDoc(adminRef, {
                role: userRole,
                email: user.email,
                department: fetchedDept,
                permissions: finalPerms,
                updatedAt: Date.now()
              }, { merge: true });
              setIsAdmin(true);
              adminStatus = true;
              setPermissions(finalPerms);
              setDepartment(fetchedDept);
            } else {
              const adminDoc = await getDoc(adminRef);
              if (adminDoc.exists()) {
                const aData = adminDoc.data();
                setIsAdmin(true);
                adminStatus = true;
                const finalPerms = filterPermsForUser(aData?.permissions || [], sabbirStatus);
                setPermissions(finalPerms);
                if (aData?.department) fetchedDept = aData.department;
                if (aData?.role === 'ceo' || aData?.role === 'super-admin' || fetchedDept.toLowerCase().includes('ceo')) {
                  setIsCEO(true);
                  setIsSuperAdmin(true);
                }
                setDepartment(fetchedDept);
              } else {
                setIsAdmin(false);
                adminStatus = false;
                setPermissions([]);
                setDepartment('Sales Executive Department');
              }
            }
          }
        } catch (e: any) {
          if (!e?.message?.includes('resource-exhausted') && !e?.message?.includes('Quota limit exceeded')) {
             console.error("Admin check error:", e);
          }
          setIsAdmin(superStatus);
          adminStatus = superStatus;
          setDepartment(fetchedDept);
          const fallbackPerms = superStatus ? ['dashboard', 'customers', 'orders', 'products', 'issues', 'masterTable', 'finance', 'settings'] : [];
          setPermissions(filterPermsForUser(fallbackPerms, sabbirStatus));
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
        setIsCEO(false);
        setIsSabbirRahman(false);
        setPermissions([]);
        setDepartment('Sales Executive Department');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Real-time permission listener for logged-in admin
  useEffect(() => {
    if (!currentUser || isSuperAdmin) return;
    const email = currentUser.email ? currentUser.email.toLowerCase().trim() : '';
    if (!email) return;

    const sabbirStatus = isSabbirEmail(currentUser.email, currentUser.displayName);

    const unsub = onSnapshot(doc(db, 'admin_permissions', email), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.permissions && Array.isArray(data.permissions)) {
          setPermissions(filterPermsForUser(data.permissions, sabbirStatus));
        }
        if (data.department) {
          setDepartment(data.department);
        }
        setIsAdmin(true);
      }
    }, () => {});

    return () => unsub();
  }, [currentUser, isSuperAdmin]);

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

  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    const updateHeartbeat = async () => {
      try {
        const adminRef = doc(db, 'admins', currentUser.uid);
        await setDoc(adminRef, {
          email: currentUser.email || '',
          lastActive: Date.now(),
          isOnline: true,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {
        // Silently ignore to avoid noise
      }
    };

    // Update immediately on mount / state transition
    updateHeartbeat();

    // Update status every 30 seconds
    const interval = setInterval(updateHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [currentUser, isAdmin]);

  const signOut = async () => {
    if (currentUser && isAdmin) {
      try {
        const adminRef = doc(db, 'admins', currentUser.uid);
        await setDoc(adminRef, {
          isOnline: false,
          lastActive: Date.now()
        }, { merge: true });
      } catch (e) {
        // Silently ignore
      }
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      customerUser, 
      sendOtp,
      verifyOtp,
      loginCustomer,
      logoutCustomer, 
      isAdmin,
      isSuperAdmin,
      isCEO,
      isSabbirRahman,
      canManageAccounting: isSabbirRahman,
      department,
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
