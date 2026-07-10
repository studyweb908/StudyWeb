import { motion } from 'motion/react';
import { Rocket, Play, ShieldCheck, CheckCircle2, Star, BrainCircuit } from 'lucide-react';
import FloatingElements from './FloatingElements';

export default function Hero() {
  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden flex items-center bg-gradient-to-br from-brand-bg-light via-brand-primary/5 to-brand-secondary/5">
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
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display leading-[1.1] tracking-tight mb-6 text-brand-text">
              From Confusion<br />
              To Clarity
            </h1>
            
            <p className="text-lg sm:text-xl text-brand-text-light mb-10 leading-relaxed max-w-xl mx-auto">
              StudyWeb helps students learn with AI-powered tools, smart planning, interactive quizzes, flashcards, and progress tracking—all in one beautiful learning platform.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
              <button 
                onClick={() => (window as any).openStudyWebAuth?.('signup')}
                className="group relative bg-brand-primary hover:bg-brand-secondary text-white px-8 py-4 rounded-full text-lg font-medium transition-all shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:shadow-brand-secondary/40 flex items-center justify-center gap-2 transform hover:-translate-y-1 overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <Rocket className="w-5 h-5 relative z-10 group-hover:animate-bounce" />
                <span className="relative z-10">Join Free</span>
              </button>
              
              <button className="bg-card-bg hover:bg-brand-bg-light text-brand-text border border-card-border px-8 py-4 rounded-full text-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group">
                <div className="bg-brand-primary/10 text-brand-primary p-1.5 rounded-full group-hover:bg-brand-primary group-hover:text-white transition-colors">
                  <Play className="w-4 h-4 ml-0.5" />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {[
                { icon: CheckCircle2, text: "Student Focused" },
                { icon: BrainCircuit, text: "AI Powered" },
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
