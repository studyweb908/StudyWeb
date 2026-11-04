import { motion } from 'motion/react';
import { Rocket, Play, BrainCircuit, CheckCircle2, FileCheck2, Sparkles } from 'lucide-react';
import FloatingElements from './FloatingElements';

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-[100dvh] landscape-compact-hero pt-24 sm:pt-28 lg:pt-32 pb-16 sm:pb-20 overflow-hidden flex items-center bg-gradient-to-br from-brand-bg-light via-brand-primary/5 to-brand-secondary/5"
      aria-label="Hero Introduction"
    >
      <FloatingElements />

      <div className="responsive-container relative z-10">
        <div className="flex flex-col items-center justify-center">
          {/* Center Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-4xl w-full text-center flex flex-col items-center"
          >
            {/* Editorial Kicker (Zero-Pill Discipline) */}
            <p className="text-[11px] sm:text-xs md:text-sm font-semibold tracking-[0.16em] sm:tracking-[0.18em] uppercase text-brand-primary mb-3.5 sm:mb-5 px-2">
              AI Study &amp; Interview Mastery Workspace
            </p>

            {/* Outcome-Driven H1 with Fluid Multi-Viewport Scaling */}
            <h1
              className="text-fluid-hero font-extrabold font-display mb-5 sm:mb-7 text-brand-text px-1 sm:px-0"
              style={{ textWrap: 'balance' }}
            >
              Turn Any Lecture, PDF, or Image Into{' '}
              <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent">
                Exam &amp; Interview Mastery in 30 Seconds.
              </span>
            </h1>

            {/* Specific Value Proposition & Mechanism */}
            <p className="text-sm sm:text-lg md:text-xl text-brand-text-light mb-7 sm:mb-9 leading-relaxed max-w-2xl mx-auto px-2 sm:px-0 font-normal">
              Upload your course slides, diagrams, PDFs, or YouTube lectures. <strong>StudyWeb</strong> indexes every word and visual so you can generate structured notes, active-recall flashcards, mock interview drills, and cited AI Tutor answers on demand.
            </p>

            {/* Primary Calls To Action + Friction-Reducing Microcopy */}
            <div className="flex flex-col items-center w-full sm:w-auto mb-9 sm:mb-12 px-2 sm:px-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => (window as any).openStudyWebAuth?.('signup')}
                  aria-label="Upload your first study file and start studying free"
                  className="w-full sm:w-auto min-h-[48px] group relative bg-brand-primary hover:bg-brand-secondary text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base md:text-lg font-semibold transition-all shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:shadow-brand-secondary/35 flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5 overflow-hidden cursor-pointer whitespace-nowrap shrink-0"
                >
                  <div className="absolute inset-0 bg-white/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <Rocket className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                  <span className="relative z-10">Start Studying Free</span>
                </button>

                <a
                  href="#interactive-demo"
                  aria-label="Explore StudyWeb Interactive AI Study Demo"
                  className="w-full sm:w-auto min-h-[48px] bg-card-bg hover:bg-brand-bg-light text-brand-text border border-card-border px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base md:text-lg font-semibold transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2.5 group whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 text-brand-primary fill-brand-primary/15 transition-transform group-hover:scale-110 shrink-0" />
                  <span>Try Interactive Demo</span>
                </a>
              </div>

              {/* Risk Reversal & Time-to-Value Microcopy */}
              <p className="mt-3 text-[11px] sm:text-sm text-brand-text-light/85 font-medium leading-snug px-2">
                Free forever starter plan &nbsp;·&nbsp; No credit card required &nbsp;·&nbsp; Setup in under 30 seconds
              </p>
            </div>

            {/* Clean Editorial Trust & Proof Indicators (Zero-Pill Discipline) */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2 text-xs sm:text-sm font-medium text-brand-text-light border-t border-card-border/70 pt-5 sm:pt-6 w-full max-w-2xl px-2">
              <span className="inline-flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-brand-primary shrink-0" />
                <span>100% Grounded in Your Uploaded Files</span>
              </span>
              <span aria-hidden="true" className="text-brand-text-light/40 hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-brand-secondary shrink-0" />
                <span>Interview &amp; Oral Viva Drill Mode</span>
              </span>
              <span aria-hidden="true" className="text-brand-text-light/40 hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0" />
                <span>COPPA &amp; FERPA Compliant</span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
