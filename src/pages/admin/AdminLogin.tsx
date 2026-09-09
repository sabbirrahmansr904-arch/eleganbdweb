/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBranding } from '../../contexts/BrandingContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

export default function AdminLogin() {
  const { logoUrl } = useBranding();
  const { loginAsAdmin, isAdmin, currentUser, signOut } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // If already admin, redirect automatically
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.toLowerCase().trim();
    const enteredPassword = password.trim();

    if (!trimmedEmail || !enteredPassword) {
      toast.error('দয়া করে ইমেইল এবং পাসওয়ার্ড প্রদান করুন।');
      return;
    }

    setIsLoading(true);

    try {
      // Specified Admin Master Credentials
      // Email: admin@eleganbd.com
      // Password: eleganbd2026@@##ssn
      const isMasterAdmin =
        (trimmedEmail === 'admin@eleganbd.com' ||
          trimmedEmail === 'sabbirrahmansr904@gmail.com' ||
          trimmedEmail === 'eleganbd@gmail.com') &&
        enteredPassword === 'eleganbd2026@@##ssn';

      if (isMasterAdmin) {
        await loginAsAdmin(trimmedEmail, 'Sabbir Rahman (CEO & Founder)');
        toast.success('অ্যাডমিন প্যানেলে স্বাগতম! লগইন সফল হয়েছে।');
        navigate('/admin');
        return;
      }

      // Invalid credentials
      toast.error('ভুল ইমেইল বা পাসওয়ার্ড! সঠিক ক্রেডেনশিয়াল ব্যবহার করুন।');
    } catch (error: any) {
      toast.error(error?.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully.');
    } catch {
      toast.error('Failed to sign out.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f12] text-white flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-gold/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-[#16191f]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10"
      >
        {/* Logo and Header */}
        <div className="text-center mb-8">
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
                  <div className="h-[4px] w-6 bg-brand-gold" />
                  <div className="h-[4px] w-[14px] bg-brand-gold translate-x-[-2px]" />
                  <div className="h-[4px] w-6 bg-brand-gold" />
                </div>
                <span className="font-black text-2xl italic tracking-tighter uppercase text-white">
                  Elegan BD
                </span>
              </div>
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand-gold text-[10px] uppercase font-bold tracking-widest mb-2">
            <ShieldCheck size={12} />
            <span>Secure Admin Portal</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            Admin Authentication
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            অ্যাডমিন প্যানেলে প্রবেশ করতে আপনার ক্রেডেনশিয়াল দিন
          </p>
        </div>

        {/* If user is logged in as non-admin, show notice */}
        {currentUser && !isAdmin && (
          <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase text-gray-400 font-bold">Logged In Account</p>
              <p className="text-brand-gold font-mono truncate max-w-[180px]">{currentUser.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              type="button"
              className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider underline"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4" autoComplete="off">
          {/* Email Input */}
          <div>
            <label
              htmlFor="admin_email"
              className="block text-[11px] uppercase tracking-widest text-gray-400 mb-1.5 font-bold"
            >
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Mail size={16} />
              </div>
              <input
                id="admin_email"
                name="admin_login_email_field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eleganbd.com"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                required
                className="w-full bg-black/40 border border-white/15 focus:border-brand-gold rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="admin_password"
              className="block text-[11px] uppercase tracking-widest text-gray-400 mb-1.5 font-bold"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Lock size={16} />
              </div>
              <input
                id="admin_password"
                name="admin_login_password_field"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck="false"
                required
                className="w-full bg-black/40 border border-white/15 focus:border-brand-gold rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-gold hover:bg-amber-400 text-black py-4 rounded-2xl text-xs uppercase tracking-widest font-black transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <span>লগইন করুন (Admin Sign In)</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
            Authorized Personnel Only
          </p>
          <p className="text-[9px] text-gray-500 mt-1">
            Elegan BD &bull; Mirpur, Dhaka
          </p>
        </div>
      </motion.div>
    </div>
  );
}
