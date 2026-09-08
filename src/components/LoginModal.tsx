import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, loginAsAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const trimmedEmail = email.toLowerCase().trim();
      await loginAsAdmin(trimmedEmail, 'User / Admin');
      toast.success('Signed in successfully!');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl text-white">
              <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
                <X size={20} />
              </button>

              <h2 className="text-xl font-black uppercase tracking-tighter mb-6 text-center">
                Sign In to Elegan BD
              </h2>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-bold">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@eleganbd.com"
                      className="w-full bg-black/50 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white text-xs placeholder:text-white/30 outline-none focus:border-brand-gold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-bold">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-black/50 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white text-xs placeholder:text-white/30 outline-none focus:border-brand-gold"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin@eleganbd.com');
                      setPassword('elegan.bd2026@#ssn');
                      toast.success('Admin credentials filled!');
                    }}
                    className="flex-1 bg-white/10 border border-white/20 text-white py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all"
                  >
                    🔑 Autofill Admin
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#F8F9FD] text-black py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-colors shadow-lg"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#121212] px-2 text-gray-400 font-bold">Or</span></div>
              </div>

              <button
                onClick={async () => {
                  setLoading(true);
                  await signInWithGoogle();
                  setLoading(false);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white p-3.5 rounded-xl font-black uppercase text-xs hover:bg-white hover:text-black transition-colors"
              >
                <Mail size={16} /> Sign In With Google
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
