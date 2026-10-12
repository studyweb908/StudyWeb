import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, Sparkles, X, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResetPasswordModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ResetPasswordModal({ isOpen: externalIsOpen, onClose: externalOnClose }: ResetPasswordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Synchronize internal state with external prop if provided
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  // Global listener for Supabase password recovery link redirects or hash parameters
  useEffect(() => {
    const checkRecoveryContext = () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const combined = hash + search;

      if (
        combined.includes('type=recovery') || 
        combined.includes('reset-password') || 
        hash === '#reset-password' ||
        window.location.pathname.includes('/reset-password')
      ) {
        setIsOpen(true);
        setError('');
        setSuccess(false);
      }
    };

    checkRecoveryContext();

    window.addEventListener('hashchange', checkRecoveryContext);
    window.addEventListener('popstate', checkRecoveryContext);

    // Custom event dispatcher listener
    const handleCustomResetEvent = () => {
      setIsOpen(true);
      setError('');
      setSuccess(false);
    };
    window.addEventListener('studyweb-open-reset-password', handleCustomResetEvent);

    // Supabase auth state change listener for PASSWORD_RECOVERY
    let unsubscribe: (() => void) | null = null;
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsOpen(true);
          setError('');
          setSuccess(false);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    }

    return () => {
      window.removeEventListener('hashchange', checkRecoveryContext);
      window.removeEventListener('popstate', checkRecoveryContext);
      window.removeEventListener('studyweb-open-reset-password', handleCustomResetEvent);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    
    // Clear reset hash from URL if present
    if (window.location.hash.includes('type=recovery') || window.location.hash === '#reset-password') {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (externalOnClose) {
      externalOnClose();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase authentication client is not initialized.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      
      // Clean recovery URL fragment
      if (window.location.hash.includes('type=recovery') || window.location.hash === '#reset-password') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err?.message || 'Failed to update password. Please request a new password reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        {/* Backdrop click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-transparent"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
        >
          {/* Top Decorative Gradient Accent */}
          <div className="h-2 bg-gradient-to-r from-brand-primary via-indigo-500 to-purple-600" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 md:p-8">
            {/* Header section */}
            <div className="text-center space-y-3 mb-6">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto shadow-inner">
                {success ? (
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                ) : (
                  <KeyRound className="w-7 h-7" />
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {success ? 'Password Updated!' : 'Set New Password'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                {success 
                  ? 'Your password has been successfully updated. You can now use your new password to sign in.'
                  : 'Please enter and confirm your new password below to update your StudyWeb account.'}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-medium leading-normal">{error}</span>
              </motion.div>
            )}

            {/* Success View */}
            {success ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold leading-relaxed">
                  ✨ Your account security credentials have been updated in real-time.
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-brand-primary/90 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition-transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Password Reset Form */
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-5 bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-brand-primary/90 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Update Password</span>
                    </div>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
