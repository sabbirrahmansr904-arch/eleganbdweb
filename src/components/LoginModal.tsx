import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Phone, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, sendOtp, verifyOtp } = useAuth();
  const [view, setView] = useState<'options' | 'email' | 'otp'>('options');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendOtp(email);
      setView('otp');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      onClose();
    } catch (error) {
      console.error(error);
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
            <div className="bg-black border border-white/10 rounded-2xl w-full max-w-sm p-6 relative">
              <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
                <X size={20} />
              </button>

              <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-6">
                {view === 'options' ? 'Sign In' : 'Customer Login'}
              </h2>

              {view === 'options' ? (
                <div className="space-y-4">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      await signInWithGoogle();
                      setLoading(false);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black p-3 rounded-lg font-black uppercase text-sm hover:bg-brand-gold transition-colors"
                  >
                    <Mail size={18} /> Admin Login (Google)
                  </button>
                  <button
                    onClick={() => setView('email')}
                    className="w-full flex items-center justify-center gap-3 bg-white/5 text-white border border-white/10 p-3 rounded-lg font-black uppercase text-sm hover:bg-white/10 transition-colors"
                  >
                    <Mail size={18} /> Customer Login (Email)
                  </button>
                </div>
              ) : view === 'otp' ? (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/30 outline-none focus:border-brand-gold"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-brand-gold text-black p-3 rounded-lg font-black uppercase text-sm hover:bg-white transition-colors"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/30 outline-none focus:border-brand-gold"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-brand-gold text-black p-3 rounded-lg font-black uppercase text-sm hover:bg-white transition-colors"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send OTP'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
