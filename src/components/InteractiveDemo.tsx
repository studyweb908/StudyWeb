import { motion } from 'motion/react';
import { Play } from 'lucide-react';

export default function InteractiveDemo() {
  return (
    <section id="interactive-demo" className="py-24 bg-card-bg" aria-label="Interactive Demo Experience">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-brand-text mb-6">
            See How StudyWeb Works
          </h2>
          <p className="text-lg text-brand-text-light leading-relaxed">
            Take a quick peek inside the StudyWeb dashboard. Experience the magic of AI-powered study note summaries, active recall flashcards, and practice quizzes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          onClick={() => (window as any).openStudyWebAuth?.('signup')}
          className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-brand-primary/10 border border-card-border group cursor-pointer"
        >
          {/* Video/Interactive Frame */}
          <div className="aspect-video bg-brand-bg-light flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5" />
            
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-colors z-20">
              <div className="w-20 h-20 bg-card-bg rounded-full flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-brand-primary ml-1" />
              </div>
            </div>

            {/* Fake UI preview background */}
            <div className="absolute inset-4 bg-card-bg rounded-xl shadow-sm border border-card-border overflow-hidden opacity-50 flex flex-col">
               <div className="h-12 border-b border-card-border flex items-center px-4">
                 <div className="w-24 h-4 bg-card-border rounded-full" />
               </div>
               <div className="flex-1 p-6 flex gap-6">
                 <div className="w-1/4 space-y-4">
                   <div className="w-full h-8 bg-card-border rounded-lg" />
                   <div className="w-3/4 h-8 bg-card-border rounded-lg" />
                 </div>
                 <div className="flex-1 bg-card-border rounded-xl" />
               </div>
            </div>
          </div>
        </motion.div>
        
        <div className="mt-12">
          <button 
            type="button"
            onClick={() => (window as any).openStudyWebAuth?.('signup')}
            aria-label="Try StudyWeb interactive study demo now"
            className="text-brand-primary font-medium hover:text-brand-secondary transition-colors underline underline-offset-4 cursor-pointer"
          >
            Or try the live AI workspace demo now →
          </button>
        </div>
      </div>
    </section>
  );
}
