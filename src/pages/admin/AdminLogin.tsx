/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBranding } from '../../contexts/BrandingContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const { logoUrl } = useBranding();
  const { signInWithGoogle, isAdmin } = useAuth();
  const navigate = useNavigate();

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
      if (error?.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        toast.error(`Error: This website's domain (${domain}) is not authorized in Firebase!`, { duration: 8000 });
        toast('To fix this: Go to your Firebase Console -> Authentication -> Settings -> Authorized Domains and add: ' + domain, { duration: 15000, icon: '🔧' });
      } else {
        toast.error(error?.message || 'Authentication failed.');
      }
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
        className="w-full max-w-md bg-white border border-brand-ink/5 p-8 md:p-12 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Elegan BD" 
                className="h-16 w-auto mx-auto object-contain" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center justify-center">
                <div className="flex flex-col gap-[3px] mr-3">
                  <div className="h-[4px] w-6 bg-brand-ink" />
                  <div className="h-[4px] w-[14px] bg-brand-ink translate-x-[-2px]" />
                  <div className="h-[4px] w-6 bg-brand-ink" />
                </div>
                <span className="font-black text-2xl italic tracking-tighter uppercase text-brand-ink">
                  Elegan BD
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-bold">Admin Portal Access</p>
        </div>

        <button 
          onClick={handleLogin}
          type="button"
          className="w-full bg-brand-ink text-white py-5 text-[11px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-all shadow-xl active:scale-[0.98]"
        >
          Sign in with Google
        </button>

        <div className="mt-12 pt-8 border-t border-gray-50 text-center">
           <p className="text-[10px] uppercase tracking-widest text-gray-300">
             Authorized Personnel Only<br/>
             Banani Atelier, Dhaka
           </p>
        </div>
      </motion.div>
    </div>
  );
}
