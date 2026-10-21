import { motion } from 'motion/react';
import { Rocket, Play, BrainCircuit, CheckCircle2 } from 'lucide-react';
import FloatingElements from './FloatingElements';

export default function Hero() {
  return (
    <section id="home" className="relative min-h-screen pt-24 sm:pt-32 pb-16 sm:pb-20 overflow-hidden flex items-center bg-gradient-to-br from-brand-bg-light via-brand-primary/5 to-brand-secondary/5" aria-label="Hero Introduction">
      <FloatingElements />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="flex flex-col items-center justify-center">
          
          {/* Center Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-3xl text-center flex flex-col items-center"
          >
            {/* Editorial Kicker */}
            <p className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-brand-primary mb-4 sm:mb-5">
              Academic Intelligence Workspace
            </p>

            {/* Primary H1 for SEO & Search Intent Alignment */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-display leading-[1.06] tracking-tight mb-5 sm:mb-7 text-brand-text">
              From Confusion<br />
              <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent">
                To Clarity.
              </span>
            </h1>

            {/* AEO / GEO Concise Definition Paragraph */}
            <p className="text-base sm:text-xl text-brand-text-light mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto px-2 sm:px-0 font-normal">
              <strong>StudyWeb</strong> transforms dense lectures, textbooks, and research papers into structured revision notes, active-recall flashcards, practice exams, and Socratic AI tutoring.
            </p>
            
            {/* Primary Calls To Action */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mb-10 sm:mb-12 w-full sm:w-auto px-4 sm:px-0">
              <button 
                type="button"
                onClick={() => (window as any).openStudyWebAuth?.('signup')}
                aria-label="Start studying with StudyWeb for free"
                className="w-full sm:w-auto group relative bg-brand-primary hover:bg-brand-secondary text-white px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:shadow-brand-secondary/35 flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5 overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <Rocket className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                <span className="relative z-10">Start Studying Free</span>
              </button>
              
              <a 
                href="#interactive-demo"
                aria-label="Explore StudyWeb Interactive AI Study Demo"
                className="w-full sm:w-auto bg-card-bg hover:bg-brand-bg-light text-brand-text border border-card-border px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2.5 group"
              >
                <Play className="w-4 h-4 text-brand-primary fill-brand-primary/15 transition-transform group-hover:scale-110" />
                <span>Explore Live Demo</span>
              </a>
            </div>
            
            {/* Clean Editorial Trust Indicators (Zero-Pill Discipline) */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm font-medium text-brand-text-light">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0" />
                COPPA & FERPA Compliant
              </span>
              <span aria-hidden="true" className="text-brand-text-light/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-brand-primary shrink-0" />
                Socratic Step-by-Step Reasoning
              </span>
              <span aria-hidden="true" className="text-brand-text-light/40 hidden sm:inline">·</span>
              <span className="hidden sm:inline text-brand-text-light/80">
                Instant PDF & Lecture Synthesis
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
