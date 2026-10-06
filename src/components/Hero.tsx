import { motion } from 'motion/react';
import { Rocket, Play, BrainCircuit, CheckCircle2 } from 'lucide-react';
import FloatingElements from './FloatingElements';

export default function Hero() {
  return (
    <section id="home" className="relative min-h-screen pt-32 pb-20 overflow-hidden flex items-center bg-gradient-to-br from-brand-bg-light via-brand-primary/5 to-brand-secondary/5" aria-label="Hero Introduction">
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
            {/* Primary H1 for SEO & Search Intent Alignment */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display leading-[1.1] tracking-tight mb-6 text-brand-text">
              From Confusion<br />
              <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent">
                To Clarity
              </span>
            </h1>

            {/* AEO / GEO Concise Definition Paragraph */}
            <p className="text-lg sm:text-xl text-brand-text-light mb-10 leading-relaxed max-w-xl mx-auto">
              <strong>StudyWeb</strong> is an all-in-one AI study platform designed to help students master complex subjects faster with personalized AI tutoring, automated flashcards, practice quizzes, and parent progress tracking.
            </p>
            
            {/* Primary Calls To Action */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
              <button 
                type="button"
                onClick={() => (window as any).openStudyWebAuth?.('signup')}
                aria-label="Start studying with StudyWeb for free"
                className="group relative bg-brand-primary hover:bg-brand-secondary text-white px-8 py-4 rounded-full text-lg font-medium transition-all shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:shadow-brand-secondary/40 flex items-center justify-center gap-2 transform hover:-translate-y-1 overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <Rocket className="w-5 h-5 relative z-10 group-hover:animate-bounce" />
                <span className="relative z-10">Join Free</span>
              </button>
              
              <a 
                href="#interactive-demo"
                aria-label="Explore StudyWeb Interactive AI Study Demo"
                className="bg-card-bg hover:bg-brand-bg-light text-brand-text border border-card-border px-8 py-4 rounded-full text-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group"
              >
                <div className="bg-brand-primary/10 text-brand-primary p-1.5 rounded-full group-hover:bg-brand-primary group-hover:text-white transition-colors">
                  <Play className="w-4 h-4 ml-0.5" />
                </div>
                <span>Watch Demo</span>
              </a>
            </div>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {[
                { icon: CheckCircle2, text: "COPPA & FERPA Compliant" },
                { icon: BrainCircuit, text: "Socratic Educational AI" },
              ].map((badge, index) => (
                <div key={index} className="flex items-center gap-2 text-sm font-medium text-brand-text-light bg-card-bg/50 px-3 py-1.5 rounded-lg border border-card-border/60">
                  <badge.icon className="w-4 h-4 text-brand-accent" />
                  {badge.text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
