import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, 
  Check, 
  X, 
  BookOpen, 
  Compass, 
  Calendar, 
  Award, 
  Lightbulb
} from 'lucide-react';

export interface DailyQuoteItem {
  id: string;
  quote: string;
  author: string;
  title: string;
  era: string;
  source: string;
  notableWork: string;
  category: string;
  initials: string;
  bio: string;
  keyTakeaway: string;
}

export type QuoteTheme = 'aurora' | 'editorial' | 'cosmic';

// ============================================================================
// Curated Wisdom Collection with Rich Historical & Biographical Depth
// ============================================================================
export const CURATED_DAILY_QUOTES: DailyQuoteItem[] = [
  {
    id: 'quote-1',
    quote: "Learning never exhausts the mind.",
    author: "Leonardo da Vinci",
    title: "Polymath, Engineer & Renaissance Master",
    era: "1452–1519 · Italian Renaissance",
    source: "Notebooks of Leonardo da Vinci (Codex Arundel)",
    notableWork: "Mona Lisa & The Vitruvian Man",
    category: "Curiosity & Mastery",
    initials: "LD",
    bio: "Pioneering Renaissance visionary whose insatiable curiosity led to monumental breakthroughs across painting, anatomy, aerodynamics, hydrodynamics, and mechanical engineering. His personal codices preserve thousands of pages of detailed inquiries and experiments.",
    keyTakeaway: "Treat curiosity as an endless wellspring: deep studying expands mental capacity rather than depleting it."
  },
  {
    id: 'quote-2',
    quote: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
    title: "Statesman & Nobel Peace Laureate",
    era: "1918–2013 · South Africa",
    source: "Long Walk to Freedom",
    notableWork: "First Democratically Elected President of South Africa",
    category: "Resilience & Grit",
    initials: "NM",
    bio: "Global symbol of resilience, justice, and reconciliation. Mandela endured 27 years of imprisonment for opposing apartheid before leading South Africa through a peaceful democratic transition and dedicating his post-presidency to education and human rights.",
    keyTakeaway: "Formidable goals look insurmountable from the starting line; persistence turns the impossible into standard reality."
  },
  {
    id: 'quote-3',
    quote: "Great things are done by a series of small things brought together.",
    author: "Vincent van Gogh",
    title: "Post-Impressionist Master",
    era: "1853–1890 · Netherlands & France",
    source: "Letters to Theo van Gogh (1882)",
    notableWork: "The Starry Night & Sunflowers",
    category: "Consistency & Craft",
    initials: "VG",
    bio: "One of the most emotionally resonant artists in human history. Over a single decade, Van Gogh produced over 2,100 artworks through disciplined daily practice, showing how compounding micro-efforts culminate in timeless masterpieces.",
    keyTakeaway: "Break daunting revision and long-term milestones into atomic daily habits; consistency compounds exponentially."
  },
  {
    id: 'quote-4',
    quote: "The roots of education are bitter, but the fruit is sweet.",
    author: "Aristotle",
    title: "Classical Philosopher & Polymath",
    era: "384–322 BCE · Classical Greece",
    source: "Diogenes Laërtius, Lives of Eminent Philosophers",
    notableWork: "Nicomachean Ethics & Organon",
    category: "Wisdom & Discipline",
    initials: "AR",
    bio: "Student of Plato and tutor to Alexander the Great. Aristotle established foundational frameworks for Western logic, biology, physics, metaphysics, politics, and poetics that anchored scholarly curricula for over two millennia.",
    keyTakeaway: "Cognitive effort during difficult problem-solving is the exact sensation of intellectual growth taking root."
  },
  {
    id: 'quote-5',
    quote: "I have no special talent. I am only passionately curious.",
    author: "Albert Einstein",
    title: "Theoretical Physicist & Nobel Laureate",
    era: "1879–1955 · Germany & United States",
    source: "Letter to Carl Seelig (March 11, 1952)",
    notableWork: "General Theory of Relativity & Photoelectric Effect",
    category: "Discovery & Wonder",
    initials: "AE",
    bio: "Transformed modern physics by revolutionizing our understanding of space, time, gravity, and quantum phenomena. Einstein attributed his groundbreaking breakthroughs not to raw innate genius, but to persistent childlike questioning.",
    keyTakeaway: "Unapologetic questioning and wondering why things work is far more powerful than passive memorization."
  },
  {
    id: 'quote-6',
    quote: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.",
    author: "Marie Curie",
    title: "Pioneering Physicist & Chemist",
    era: "1867–1934 · Poland & France",
    source: "Pierre Curie Biography & Laboratory Notes",
    notableWork: "Discovery of Polonium & Radium (Nobel 1903 & 1911)",
    category: "Courage & Science",
    initials: "MC",
    bio: "The only individual in history to win Nobel Prizes across two distinct scientific fields (Physics and Chemistry). Curie conducted groundbreaking radiation research in harsh, unheated laboratory conditions through sheer determination and rigorous methodology.",
    keyTakeaway: "When faced with an intimidating topic, dismantle fear through methodical, systematic investigation."
  },
  {
    id: 'quote-7',
    quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
    title: "Philosopher & Civil Rights Pioneer",
    era: "1869–1948 · India",
    source: "Selected Writings on Education & Swaraj",
    notableWork: "Architect of Nonviolent Satyagraha Movement",
    category: "Lifelong Growth",
    initials: "MG",
    bio: "Pioneer of nonviolent civil resistance who inspired freedom and civil rights movements globally. Gandhi emphasized that education should be holistic, training mind, body, and conscience in harmony throughout all stages of life.",
    keyTakeaway: "Cultivate a student mindset indefinitely; continuous learning gives purpose and longevity to all pursuits."
  },
  {
    id: 'quote-8',
    quote: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
    title: "Polymath, Diplomat & Inventor",
    era: "1706–1790 · United States",
    source: "Poor Richard's Almanack",
    notableWork: "Bifocals, Lightning Rod & US Declaration of Independence",
    category: "Lifelong Value",
    initials: "BF",
    bio: "Self-educated polymath whose contributions bridged electricity theory, civic infrastructure, publishing, and international diplomacy. He founded the first public subscription library in America to democratize access to books.",
    keyTakeaway: "Hours dedicated to mastering fundamental concepts deliver lifelong compounding dividends."
  },
  {
    id: 'quote-9',
    quote: "Reserve your right to think, for even to think wrongly is better than not to think at all.",
    author: "Hypatia of Alexandria",
    title: "Mathematician, Astronomer & Philosopher",
    era: "c. 360–415 CE · Alexandria, Egypt",
    source: "Historical records of Socrates Scholasticus",
    notableWork: "Commentary on Diophantus' Arithmetica",
    category: "Critical Thinking",
    initials: "HY",
    bio: "Head of the Neoplatonic school in Alexandria and one of antiquity's foremost scholars in astronomy and mathematics. Renowned for her public lectures and for refining astrolabes and hydrometers.",
    keyTakeaway: "Never hesitate to venture a preliminary hypothesis; trial, error, and critical evaluation are essential to deep understanding."
  },
  {
    id: 'quote-10',
    quote: "The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius",
    title: "Teacher, Politician & Philosopher",
    era: "551–479 BCE · Ancient China",
    source: "The Analects of Confucius",
    notableWork: "Foundations of Confucian Ethics & Governance",
    category: "Patience & Momentum",
    initials: "CF",
    bio: "Influential Chinese teacher and thinker whose philosophy underscored personal morality, justice, sincerity, and the vital role of education in shaping character and society.",
    keyTakeaway: "Massive syllabi and exam preparations yield stone by stone through focused 25-minute study intervals."
  }
];

export interface DailyQuoteCardProps {
  className?: string;
  initialTheme?: QuoteTheme;
}

export const DailyQuoteCard: React.FC<DailyQuoteCardProps> = ({ 
  className = ""
}) => {
  // Compute deterministic quote based on day-of-year
  const today = useMemo(() => new Date(), []);
  const dayNumber = useMemo(() => {
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }, [today]);

  const defaultIndex = useMemo(() => {
    return Math.abs(dayNumber) % CURATED_DAILY_QUOTES.length;
  }, [dayNumber]);

  // Local state
  const [currentIndex] = useState<number>(defaultIndex);
  const [copied, setCopied] = useState<boolean>(false);
  const [showBioModal, setShowBioModal] = useState<boolean>(false);

  const activeQuote = CURATED_DAILY_QUOTES[currentIndex] || CURATED_DAILY_QUOTES[0];

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showBioModal) {
        setShowBioModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBioModal]);

  // Copy quote to clipboard
  const handleCopy = async () => {
    const textToCopy = `"${activeQuote.quote}" — ${activeQuote.author} (${activeQuote.title || activeQuote.era})`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  // Formatted date string
  const dateFormatted = useMemo(() => {
    return today.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }, [today]);

  return (
    <>
      {/* ================================================================= */}
      {/* CLEAN DASHBOARD CARD CONTAINER                                    */}
      {/* ================================================================= */}
      <div 
        className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full ${className}`}
      >
        {/* ============================================================= */}
        {/* 1. CARD HEADER: Metadata Badge & Interactive Controls         */}
        {/* ============================================================= */}
        <div className="flex items-center justify-between gap-3 mb-4">
          
          {/* Date */}
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {dateFormatted}
          </span>

          {/* Actions: 1-Click Copy */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              title="Copy Quote"
              aria-label="Copy quote to clipboard"
              className={`p-1.5 px-2.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                copied 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* 2. CARD BODY: Fluid Animated Quote Typography                 */}
        {/* ============================================================= */}
        <div className="my-1 min-h-[78px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={activeQuote.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full"
            >
              <p className="font-serif text-base sm:text-[17px] italic leading-relaxed tracking-wide text-slate-800 dark:text-slate-100">
                "{activeQuote.quote}"
              </p>
            </motion.blockquote>
          </AnimatePresence>
        </div>

        {/* ============================================================= */}
        {/* 3. CARD FOOTER: Author Attribution                           */}
        {/* ============================================================= */}
        <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          
          {/* Author Attribution */}
          <div 
            onClick={() => setShowBioModal(true)}
            className="group/author cursor-pointer text-left min-w-0"
            title="Click to view author details & context"
          >
            <cite className="not-italic block text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
              — {activeQuote.author}
            </cite>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeQuote.era}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. AUTHOR BIOGRAPHY & STUDY CONTEXT MODAL                         */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showBioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
            {/* Backdrop Dismissal */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBioModal(false)}
              className="absolute inset-0 cursor-pointer"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center shadow-sm shrink-0">
                    {activeQuote.initials}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      {activeQuote.author}
                    </h4>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      {activeQuote.title}
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowBioModal(false)}
                  aria-label="Close author details modal"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quote Reference Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs sm:text-sm italic font-serif text-slate-800 dark:text-slate-200 leading-relaxed">
                "{activeQuote.quote}"
              </div>

              {/* Quick Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Era & Region</span>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeQuote.era}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                    <Award className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Notable Work</span>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={activeQuote.notableWork}>
                    {activeQuote.notableWork}
                  </p>
                </div>
              </div>

              {/* Biography Details */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  Historical Overview
                </h5>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeQuote.bio}
                </p>
              </div>

              {/* Key Takeaway for Students */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Student Takeaway</span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  {activeQuote.keyTakeaway}
                </p>
              </div>

              {/* Source Citation */}
              <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>Source: {activeQuote.source}</span>
                <button
                  onClick={() => setShowBioModal(false)}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DailyQuoteCard;
