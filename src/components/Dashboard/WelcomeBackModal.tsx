import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Copy, 
  Check, 
  X, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CURATED_DAILY_QUOTES, DailyQuoteItem } from './DailyQuoteCard';
import { playDopaminePopSound } from '../../utils/audioEffects';

interface WelcomeBackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  avatarUrl?: string;
  userCode?: string;
}

/**
 * Trigger high-energy dopamine confetti burst on open
 */
function fireDopamineConfetti() {
  try {
    confetti({
      particleCount: 75,
      angle: 60,
      spread: 60,
      origin: { x: 0.05, y: 0.75 },
      colors: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8', '#a855f7']
    });

    confetti({
      particleCount: 75,
      angle: 120,
      spread: 60,
      origin: { x: 0.95, y: 0.75 },
      colors: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8', '#a855f7']
    });

    setTimeout(() => {
      confetti({
        particleCount: 55,
        spread: 100,
        origin: { x: 0.5, y: 0.35 },
        colors: ['#ffd700', '#fbbf24', '#f59e0b', '#ffffff']
      });
    }, 280);
  } catch (err) {
    console.debug('Confetti effect trigger notice:', err);
  }
}

export default function WelcomeBackModal({
  isOpen,
  onClose,
  userName = 'Scholar',
  avatarUrl
}: WelcomeBackModalProps) {
  const [copiedQuote, setCopiedQuote] = useState(false);

  // Continuously rotate quote index across visits/sessions to give fresh parameters each time
  const [quoteIndex, setQuoteIndex] = useState(() => {
    const prev = parseInt(localStorage.getItem('studyweb_welcome_quote_index') || '0', 10);
    const next = (prev + 1) % CURATED_DAILY_QUOTES.length;
    try {
      localStorage.setItem('studyweb_welcome_quote_index', String(next));
    } catch {}
    return next;
  });

  const currentQuote: DailyQuoteItem = useMemo(() => {
    return CURATED_DAILY_QUOTES[quoteIndex % CURATED_DAILY_QUOTES.length] || CURATED_DAILY_QUOTES[0];
  }, [quoteIndex]);

  // Dopamine confetti and popping sound triggers when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fireDopamineConfetti();
    playDopaminePopSound();
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyQuote = useCallback(() => {
    try {
      navigator.clipboard.writeText(`"${currentQuote.quote}" — ${currentQuote.author}`);
      setCopiedQuote(true);
      setTimeout(() => setCopiedQuote(false), 2200);
    } catch {
      // Fallback
    }
  }, [currentQuote]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Deep Cosmic Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl"
          >
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
          </motion.div>

          {/* Full Screen Modal Card with Dopamine Spring Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 24 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: {
                type: "spring",
                stiffness: 320,
                damping: 24
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.9, 
              y: 16,
              transition: { duration: 0.18 }
            }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center text-slate-900 dark:text-white z-10 overflow-hidden"
          >
            {/* Top Glowing Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-fuchsia-500" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 1. THE PROFILE */}
            <div 
              role="button"
              tabIndex={0}
              onClick={playDopaminePopSound}
              title="Click for pop sound"
              className="relative inline-block mx-auto mb-4 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 rounded-full blur-sm opacity-70 animate-pulse" />
              <div className="relative w-24 h-24 rounded-full p-1 bg-white dark:bg-slate-900 border-2 border-indigo-400 shadow-xl overflow-hidden mx-auto flex items-center justify-center">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={userName} 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-inner">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* 2. THE NAME */}
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
              {userName}
            </h2>

            {/* 3. WELCOME BACK TO STUDYWEB */}
            <p className="text-sm sm:text-base font-semibold text-indigo-600 dark:text-indigo-400 mb-6">
              Welcome back to StudyWeb
            </p>

            {/* 4. THE INSPIRING QUOTE / CONTINUOUS STUDY PARAMETER */}
            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-4 sm:p-5 mb-6 text-left relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Daily Study Focus</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyQuote}
                  title="Copy quote"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                >
                  {copiedQuote ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <blockquote className="text-sm sm:text-base font-serif italic text-slate-800 dark:text-slate-200 leading-relaxed mb-2.5">
                "{currentQuote.quote}"
              </blockquote>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  — {currentQuote.author}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {currentQuote.category}
                </span>
              </div>
            </div>

            {/* 5. ENTER WORKSPACE AND STUDY */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 group"
            >
              <span>Enter workspace and study</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
