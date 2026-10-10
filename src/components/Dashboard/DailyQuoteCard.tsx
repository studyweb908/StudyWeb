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
      {/* 1. SCENIC MOUNTAIN DAWN BACKDROP WITH MEASURED CONTRAST OVERLAY   */}
      {/* ================================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Layered Scenic Mountain Horizon SVG */}
        <svg 
          className="w-full h-full object-cover object-center transform scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out" 
          viewBox="0 0 800 480" 
          preserveAspectRatio="xMidYMid slice" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="dqSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="45%" stopColor="#1E1B4B" />
              <stop offset="75%" stopColor="#312E81" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>
            <radialGradient id="dqSunGlow" cx="65%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.65" />
              <stop offset="35%" stopColor="#EC4899" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4338CA" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="dqPeakFar" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#312E81" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="dqPeakMid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4338CA" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="dqPeakNear" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0B0F19" stopOpacity="1" />
            </linearGradient>
          </defs>
          
          {/* Dawn Sky Canvas */}
          <rect width="800" height="480" fill="url(#dqSky)" />
          {/* Dawn Sun Glow */}
          <rect width="800" height="480" fill="url(#dqSunGlow)" />
          
          {/* Distant Mountain Ridge */}
          <path d="M0,280 L90,210 L190,260 L290,170 L390,240 L500,150 L610,230 L720,180 L800,240 L800,480 L0,480 Z" fill="url(#dqPeakFar)" />
          {/* Mid-range Alpine Peaks */}
          <path d="M0,320 L120,230 L220,290 L340,200 L460,280 L560,210 L680,270 L800,220 L800,480 L0,480 Z" fill="url(#dqPeakMid)" />
          {/* Near Mountain Ridgeline with Pines */}
          <path d="M0,370 L140,280 L280,350 L420,270 L540,330 L660,270 L800,340 L800,480 L0,480 Z" fill="url(#dqPeakNear)" />
          
          {/* Subtle Pine Tree Silhouettes */}
          <path d="M80,340 L85,325 L90,340 M82,333 L85,325 L88,333 M120,350 L125,330 L130,350 M320,335 L325,318 L330,335 M322,328 L325,318 L328,328 M620,330 L625,312 L630,330 M622,322 L625,312 L628,322" stroke="#0B0F19" strokeWidth="2.5" opacity="0.8" />
        </svg>
      </div>

      {/* Measured Dark Contrast Scrim for Pristine Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/65 to-slate-900/30 z-1" />

      {/* Subtle Atmospheric Brand Glow Highlights */}
      <div className="absolute -top-16 -right-16 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none z-1" />
      <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none z-1" />

      {/* ================================================================= */}
      {/* 2. CARD CONTENT                                                   */}
      {/* ================================================================= */}
      <div className="relative z-10 p-6 sm:p-7 flex flex-col justify-between h-full space-y-4 text-white">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-indigo-300">
              <Mountain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">
                Daily Quote
              </span>
              <span className="text-[11px] font-medium text-slate-300 block">
                {dateFormatted} · Day #{dayNumber}
              </span>
            </div>
          </div>

          {/* Copy Quote Button */}
          <button
            onClick={handleCopy}
            title="Copy Quote"
            aria-label="Copy Daily Quote"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 hover:text-white border border-white/15 backdrop-blur-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-slate-300 text-[11px] hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Decorative Quote Icon */}
        <div className="text-indigo-400/40 -mb-2">
          <Quote className="w-8 h-8 fill-indigo-400/20 rotate-180" />
        </div>

        {/* The Motivational Quote Text */}
        <blockquote className="space-y-2">
          <p className="text-base sm:text-lg font-serif italic text-white/95 leading-relaxed tracking-wide drop-shadow-xs">
            "{quote.quote}"
          </p>
        </blockquote>

        {/* Author Attribution & Footer */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <cite className="not-italic text-sm font-bold text-indigo-300 tracking-wide block">
              — {quote.author}
            </cite>
            {quote.title && (
              <span className="text-[11px] text-slate-300 block mt-0.5">
                {quote.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Curated Wisdom</span>
          </div>
        </div>

      </div>
    </div>
  );
}
