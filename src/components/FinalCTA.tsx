import { motion } from 'motion/react';
import { Rocket, ShieldCheck, Lock } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="py-24 bg-card-bg relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-brand-primary to-brand-secondary rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-brand-primary/20"
        >
          {/* Abstract background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-8 leading-tight">
              Start Your Smarter Learning Journey Today
            </h2>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <button 
                onClick={() => (window as any).openStudyWebAuth?.('signup')}
                className="bg-white text-brand-primary hover:bg-gray-50 px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg flex items-center justify-center gap-2 group transform hover:-translate-y-1 cursor-pointer"
              >
                <Rocket className="w-5 h-5 group-hover:animate-bounce" />
                Join Free Now
              </button>
              
              <button 
                onClick={() => (window as any).openStudyWebAuth?.('signup')}
                className="bg-white/10 text-white hover:bg-white/20 border border-white/20 px-8 py-4 rounded-full text-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                For Parents
              </button>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-6 text-white/80 text-sm font-medium">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Secure Platform</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> Private Data</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
