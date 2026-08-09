import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Construction, Bell, ArrowRight, Hammer, Code, Zap } from 'lucide-react';

export default function ComingSoon({ title, description }: { title: string, description: string }) {
  const [notified, setNotified] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] w-full p-4 sm:p-6 lg:p-8 relative isolate">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl relative"
      >
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-500/10 dark:bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/50 rounded-[32px] p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden text-center flex flex-col items-center">
          
          {/* Top badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-widest border border-indigo-100/50 dark:border-indigo-800/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              In Development
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/30">
              <Code className="w-3.5 h-3.5" /> Building in Public
            </span>
          </div>

          {/* Icon Container */}
          <motion.div 
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
            className="w-20 h-20 md:w-24 md:h-24 mb-6 rounded-[1.5rem] bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/40 dark:to-slate-800 border border-white/50 dark:border-slate-700/50 shadow-inner flex items-center justify-center relative group cursor-pointer"
          >
            <div className="absolute inset-0 rounded-[1.5rem] bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Hammer className="w-8 h-8 md:w-10 md:h-10 text-indigo-500 dark:text-indigo-400 relative z-10" />
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-400 absolute top-3 right-3 md:top-4 md:right-4 animate-pulse" />
          </motion.div>

          <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
            {title} <span className="block sm:inline bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Coming Soon</span>
          </h2>
          
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium max-w-md mx-auto leading-relaxed mb-10">
            {description || "We're crafting an amazing new experience for you. Our team is actively building this feature to supercharge your learning."}
          </p>

          {/* Progress Bar (Faux) */}
          <div className="w-full max-w-sm mb-10">
            <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 mb-2.5 px-1 uppercase tracking-wider">
              <span>Development Progress</span>
              <span className="text-indigo-500 dark:text-indigo-400">75%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "75%" }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full relative"
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]" />
              </motion.div>
            </div>
          </div>

          {/* Notify Button */}
          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setNotified(true)}
            className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold transition-all duration-300 shadow-sm w-full sm:w-auto ${
              notified 
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 hover:shadow-md'
            }`}
          >
            {notified ? (
              <>
                <Zap className="w-4 h-4" />
                <span>You're on the list!</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Notify me when it's ready</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
