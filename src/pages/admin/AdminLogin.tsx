/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBranding } from '../../contexts/BrandingContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const { logoUrl } = useBranding();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, isAdmin, currentUser, refreshAdminStatus, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = React.useState('');
  const [isActivating, setIsActivating] = React.useState(false);
  const [mode, setMode] = React.useState<'login' | 'signup'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  // If already admin, redirect automatically
  React.useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success('Authentication successful!');
    } catch (error: any) {
       toast.error(error?.message || 'Authentication failed.');
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const trimmedEmail = email.toLowerCase().trim();
      if (trimmedEmail === 'eleganbd@gmail.com' && password === 'elegan@admin#bd') {
        localStorage.setItem('elegan_admin_session', JSON.stringify({ email: trimmedEmail, role: 'ceo' }));
        try {
          await signInWithEmail(trimmedEmail, password);
        } catch (e) {
          try {
            await signUpWithEmail(trimmedEmail, password);
          } catch (signupErr) {}
        }
        toast.success('Admin signed in successfully as CEO!');
        navigate('/admin');
        return;
      }

      if (mode === 'signup') {
        await signUpWithEmail(email, password);
        toast.success('Account created! Please enter activation code if applicable.');
        setMode('login');
      } else {
        await signInWithEmail(email, password);
        toast.success('Signed in successfully!');
      }
    } catch (error: any) {
        toast.error(error?.message || 'Authentication failed.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!currentUser) return;
    if (!code.trim()) {
      toast.error("Please enter the signup code.");
      return;
    }
    setIsActivating(true);
    const loadingToast = toast.loading("Verifying secret invitation code...");
    try {
      const adminRef = doc(db, 'admins', currentUser.uid);
      await setDoc(adminRef, {
        role: 'admin',
        email: currentUser.email,
        signupCode: code.trim(),
        updatedAt: Date.now()
      });
      toast.success("Administrator access activated successfully!", { id: loadingToast });
      await refreshAdminStatus();
    } catch (err: any) {
      console.error("Activation failure: ", err);
      toast.error("Invalid signup code or unauthorized access!", { id: loadingToast });
    } finally {
      setIsActivating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out safely.");
    } catch (err) {
      toast.error("Sign out failed.");
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-[100px]" />
         <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-brand-muted rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md bg-[#F8F9FD]/5 backdrop-blur-md border border-white/10 p-8 md:p-12 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Elegan BD" 
                className="h-16 w-auto mx-auto object-contain brightness-0 invert" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center justify-center">
                <div className="flex flex-col gap-[3px] mr-3">
                  <div className="h-[4px] w-6 bg-[#F8F9FD]" />
                  <div className="h-[4px] w-[14px] bg-[#F8F9FD] translate-x-[-2px]" />
                  <div className="h-[4px] w-6 bg-[#F8F9FD]" />
                </div>
                <span className="font-black text-2xl italic tracking-tighter uppercase text-white">
                  Elegan BD
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-bold">Admin Portal Access</p>
        </div>

        {currentUser && !isAdmin ? (
          <div className="space-y-6 text-white text-sans">
            <div className="p-5 bg-[#F8F9FD]/5 border border-white/10 rounded-2xl space-y-1 text-center">
              <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-black">Logged In Profile</p>
              <p className="text-xs font-black truncate text-brand-gold font-mono">{currentUser.email}</p>
            </div>

            <div className="space-y-2 text-center text-sans">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">ADMIN ACCOUNT ACTIVATION</p>
              <p className="text-[11px] text-gray-400 leading-relaxed font-semibold italic">
                Your account is not registered. To activate admin privileges, enter the secret invitation code:
              </p>
            </div>

            <div className="space-y-4">
              <input 
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PROMO CODE"
                className="w-full bg-black/45 border border-white/20 hover:border-white/40 focus:border-brand-gold focus:outline-none rounded-2xl px-5 py-4 text-center font-mono text-xs uppercase tracking-[0.2em] text-white font-black placeholder:text-white/30"
              />

              <button 
                onClick={handleActivate}
                disabled={isActivating || !code.trim()}
                className="w-full bg-[#F8F9FD] text-brand-black py-5 text-[10px] uppercase tracking-widest font-black hover:bg-brand-gold hover:text-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
              >
                {isActivating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-brand-black/30 border-t-brand-black rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </span>
                ) : (
                  <span>Activate Access</span>
                )}
              </button>

              <button 
                onClick={handleSignOut}
                type="button"
                className="w-full bg-transparent border border-white/10 text-gray-400 hover:text-white hover:border-white/30 py-4 text-[9px] uppercase tracking-widest font-black transition-all"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : !currentUser ? (
          <div className="space-y-4">
             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-black/45 border border-white/20 rounded-2xl px-5 py-4 text-white text-sm" />
             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-black/45 border border-white/20 rounded-2xl px-5 py-4 text-white text-sm" />
             
             <button 
               onClick={() => {
                 setEmail('eleganbd@gmail.com');
                 setPassword('elegan@admin#bd');
                 toast.success('Admin credentials filled!');
               }}
               type="button"
               className="w-full bg-brand-gold/20 border border-brand-gold/40 text-brand-gold py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-gold/30 transition-all"
             >
               🔑 Use Admin Credentials (eleganbd@gmail.com)
             </button>

             <button onClick={handleEmailAuth} className="w-full bg-[#F8F9FD] text-brand-black py-5 text-[10px] uppercase tracking-widest font-black hover:bg-brand-gold hover:text-white transition-all shadow-xl">
                 {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
             </button>
             <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="w-full text-gray-400 text-[10px] underline">
                 {mode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
             </button>
             <div className="text-center text-white/50 text-xs py-2">OR</div>
             <button 
                onClick={handleLogin}
                type="button"
                className="w-full bg-[#F8F9FD] text-brand-black py-5 text-[11px] uppercase tracking-widest font-bold hover:bg-brand-gold hover:text-white transition-all shadow-xl active:scale-[0.98]"
              >
                Sign in with Google
              </button>
          </div>
        ) : (
          <button 
            onClick={handleSignOut}
            className="w-full bg-[#F8F9FD]/10 text-white py-5 text-[10px] uppercase font-bold tracking-widest"
          >
             Sign Out {currentUser.email}
          </button>
        )}

        <div className="mt-12 pt-8 border-t border-gray-50 text-center">
           <p className="text-[10px] uppercase tracking-widest text-gray-300">
             Authorized Personnel Only<br/>
             Ma Villa, House #11, Road #3, Block F, Section #1, Mirpur, Dhaka-1216
           </p>
        </div>
      </motion.div>
    </div>
  );
}
