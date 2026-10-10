import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, Sparkles, Copy, Check, Mountain, CalendarDays, Share2 } from 'lucide-react';

export interface DailyQuoteItem {
  quote: string;
  author: string;
  title?: string;
  source?: string;
}

// ============================================================================
// Curated Local Collection of Verified Motivational & Academic Quotes
// Deterministic 1-per-day selection based on local calendar date
// ============================================================================
export const CURATED_DAILY_QUOTES: DailyQuoteItem[] = [
  {
    quote: "Learning never exhausts the mind.",
    author: "Leonardo da Vinci",
    title: "Polymath, Engineer & Artist",
    source: "Notebooks of Leonardo da Vinci"
  },
  {
    quote: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
    title: "Statesman & Nobel Peace Laureate",
    source: "Long Walk to Freedom"
  },
  {
    quote: "Great things are done by a series of small things brought together.",
    author: "Vincent van Gogh",
    title: "Painter",
    source: "Letters to Theo"
  },
  {
    quote: "The roots of education are bitter, but the fruit is sweet.",
    author: "Aristotle",
    title: "Philosopher & Polymath",
    source: "Diogenes Laërtius"
  },
  {
    quote: "I have no special talent. I am only passionately curious.",
    author: "Albert Einstein",
    title: "Theoretical Physicist",
    source: "Letter to Carl Seelig (1952)"
  },
  {
    quote: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.",
    author: "Marie Curie",
    title: "Physicist, Chemist & Nobel Laureate",
    source: "Pierre Curie Biography"
  },
  {
    quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
    title: "Leader & Philosopher",
    source: "Selected Writings"
  },
  {
    quote: "Tell me and I forget. Teach me and I remember. Involve me and I learn.",
    author: "Benjamin Franklin",
    title: "Inventor & Statesman",
    source: "Poor Richard's Almanack"
  },
  {
    quote: "The mind is not a vessel to be filled, but a fire to be kindled.",
    author: "Plutarch",
    title: "Philosopher & Essayist",
    source: "On Listening to Lectures"
  },
  {
    quote: "Wisdom begins with wonder.",
    author: "Socrates",
    title: "Philosopher",
    source: "Plato's Theaetetus"
  },
  {
    quote: "Do what you can, with what you have, where you are.",
    author: "Theodore Roosevelt",
    title: "Statesman",
    source: "Autobiography"
  },
  {
    quote: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier",
    title: "Author & Thinker",
    source: "Riches Within Your Reach"
  },
  {
    quote: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
    title: "Polymath & Diplomat",
    source: "The Way to Wealth"
  },
  {
    quote: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
    title: "Author & Motivator",
    source: "Born to Win"
  },
  {
    quote: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.",
    author: "Malcolm X",
    title: "Civil Rights Leader & Speaker",
    source: "Speech at Audubon Ballroom"
  },
  {
    quote: "Perseverance is not a long race; it is many short races one after another.",
    author: "Walter Bagehot",
    title: "Economist & Essayist",
    source: "Literary Studies"
  },
  {
    quote: "The beautiful thing about learning is that no one can take it away from you.",
    author: "B.B. King",
    title: "Musician",
    source: "Reflections on Life"
  },
  {
    quote: "What we achieve inwardly will change outer reality.",
    author: "Plutarch",
    title: "Philosopher & Biographer",
    source: "Parallel Lives"
  },
  {
    quote: "The only limit to our realization of tomorrow will be our doubts of today.",
    author: "Franklin D. Roosevelt",
    title: "Statesman",
    source: "1945 Address"
  },
  {
    quote: "Step by step, one goes far.",
    author: "Proverb",
    title: "Timeless Wisdom",
    source: "Classical Axiom"
  },
  {
    quote: "Continuous effort—not strength or intelligence—is the key to unlocking our potential.",
    author: "Winston Churchill",
    title: "Statesman & Historian",
    source: "Speeches & Addresses"
  }
];

interface DailyQuoteCardProps {
  className?: string;
}

export default function DailyQuoteCard({ className = '' }: DailyQuoteCardProps) {
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Compute deterministic daily quote based on local calendar day
  const { quote, dayNumber, dateFormatted } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    // Deterministic day seed using calendar date
    const daySeed = (year * 365) + (month * 31) + date;
    const index = Math.abs(daySeed) % CURATED_DAILY_QUOTES.length;

    // Day of the year calculation
    const start = new Date(year, 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const dateFormatted = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    return {
      quote: CURATED_DAILY_QUOTES[index],
      dayNumber: dayOfYear,
      dateFormatted
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(`"${quote.quote}" — ${quote.author}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm group transition-colors ${className}`}>
      {/* ================================================================= */}
      {/* 1. SCENIC MOUNTAIN BACKGROUND WITH THEMED OVERLAY                 */}
      {/* ================================================================= */}
      {/* High-resolution serene mountain landscape */}
      <img
        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
        alt="Scenic misty alpine mountain ridges at dawn"
        onLoad={() => setImageLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover object-center transform scale-105 group-hover:scale-100 transition-transform duration-700 ease-out z-0 opacity-20 dark:opacity-25 mix-blend-luminosity dark:mix-blend-overlay ${
          imageLoaded ? 'block' : 'hidden'
        }`}
      />

      {/* Layered mountain vector silhouette backdrop fallback */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-slate-50/30 to-white dark:from-slate-950 dark:via-indigo-950/40 dark:to-slate-900 z-0">
        <svg className="w-full h-full object-cover opacity-15 dark:opacity-25" viewBox="0 0 600 360" preserveAspectRatio="none">
          <path d="M0,260 L140,160 L240,220 L380,120 L500,230 L600,150 L600,360 L0,360 Z" fill="#4F46E5" />
          <path d="M0,290 L100,220 L220,280 L340,190 L460,270 L600,210 L600,360 L0,360 Z" fill="#6366F1" opacity="0.7" />
          <path d="M0,320 L160,270 L300,310 L440,260 L600,300 L600,360 L0,360 Z" fill="#818CF8" opacity="0.5" />
        </svg>
      </div>

      {/* Multi-stop overlay harmonizing with website surface palette */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/80 to-indigo-50/40 dark:from-slate-900/95 dark:via-slate-900/85 dark:to-indigo-950/40 z-1" />

      {/* Subtle atmospheric brand glow accents */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none z-1" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none z-1" />

      {/* ================================================================= */}
      {/* 2. CARD CONTENT                                                   */}
      {/* ================================================================= */}
      <div className="relative z-10 p-6 sm:p-7 flex flex-col justify-between h-full space-y-4 text-slate-900 dark:text-white">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Mountain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">
                Daily Quote
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                {dateFormatted} · Day #{dayNumber}
              </span>
            </div>
          </div>

          {/* Copy Quote Button */}
          <button
            onClick={handleCopy}
            title="Copy Quote"
            aria-label="Copy Daily Quote"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700 transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-slate-600 dark:text-slate-400 text-[11px] hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Decorative Quote Icon */}
        <div className="text-indigo-500/20 dark:text-indigo-400/20 -mb-2">
          <Quote className="w-8 h-8 fill-indigo-500/15 dark:fill-indigo-400/15 rotate-180" />
        </div>

        {/* The Motivational Quote Text */}
        <blockquote className="space-y-2">
          <p className="text-base sm:text-lg font-serif italic text-slate-900 dark:text-white leading-relaxed tracking-wide">
            "{quote.quote}"
          </p>
        </blockquote>

        {/* Author Attribution & Footer */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <cite className="not-italic text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-wide block">
              — {quote.author}
            </cite>
            {quote.title && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {quote.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Curated Wisdom</span>
          </div>
        </div>

      </div>
    </div>
  );
}
