import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Shield, Lock, Zap, Star, Users, Crown } from 'lucide-react';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section className="py-24 bg-card-bg relative overflow-hidden" id="pricing">
      {/* Abstract Backgrounds */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-brand-secondary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold text-brand-text mb-6 tracking-tight">
              Choose the plan that helps you study smarter
            </h2>
            <p className="text-lg text-brand-text-light mb-10">
              Start for free and upgrade whenever you need unlimited AI-powered study tools.
            </p>
            
            {/* Toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-brand-text' : 'text-brand-text-light'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative w-16 h-8 rounded-full bg-card-border p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              >
                <motion.div
                  className="w-6 h-6 rounded-full bg-brand-primary shadow-sm"
                  animate={{ x: isAnnual ? 32 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              <span className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${isAnnual ? 'text-brand-text' : 'text-brand-text-light'}`}>
                Yearly
              </span>
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold">
              Save 25% on yearly billing
            </div>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 items-stretch mb-24 w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.15
              }
            }
          }}
        >
          
          {/* FREE PLAN */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 40, scale: 0.95 },
              visible: { 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: { type: "spring", stiffness: 100, damping: 15 }
              }
            }}
            className="w-full bg-card-bg/60 backdrop-blur-xl border border-card-border rounded-[24px] p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] hover:rotate-1 transition-all duration-300 relative group flex flex-col"
          >
            <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-brand-text/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-card-border text-brand-text-light text-xs font-semibold mb-4">
                Perfect for getting started
              </span>
              <h3 className="text-2xl font-bold font-display text-brand-text mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-brand-text">₹0</span>
                <span className="text-brand-text-light font-medium">Forever</span>
              </div>
            </div>
            
            <button 
              onClick={() => (window as any).openStudyWebAuth?.('signup')}
              className="w-full py-3 px-4 rounded-xl border-2 border-card-border text-brand-text font-bold hover:border-brand-text hover:bg-brand-text hover:text-card-bg transition-all duration-300 mb-8 cursor-pointer"
            >
              Start Free
            </button>
            
            <ul className="space-y-4">
              {[
                "AI Assistant (Limited)",
                "Daily Study Planner",
                "Basic Flashcards",
                "5 Quizzes per week",
                "Basic Resources",
                "Progress Tracking",
                "Community Access"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-brand-text-light font-medium">
                  <Check className="w-5 h-5 text-brand-accent shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* PLUS PLAN */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 40, scale: 0.95 },
              visible: { 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: { type: "spring", stiffness: 100, damping: 15 }
              }
            }}
            className="w-full bg-card-bg border-2 border-brand-primary rounded-[24px] p-8 shadow-2xl shadow-brand-primary/20 relative lg:-mt-4 lg:mb-[-1rem] flex flex-col group hover:shadow-brand-primary/40 hover:-translate-y-2 hover:scale-[1.02] hover:rotate-1 transition-all duration-300"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs font-bold flex items-center gap-1.5 shadow-lg whitespace-nowrap z-10">
              <Crown className="w-3.5 h-3.5" /> MOST POPULAR
            </div>
            
            <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none" />

            <div className="mb-8 relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold mb-4">
                Best Value
              </span>
              <h3 className="text-2xl font-bold font-display text-brand-text mb-2">Plus</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <motion.span 
                  key={isAnnual ? 'annual' : 'monthly'}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-brand-text"
                >
                  ₹{isAnnual ? '1,799' : '199'}
                </motion.span>
                <span className="text-brand-text-light font-medium">/{isAnnual ? 'year' : 'month'}</span>
              </div>
            </div>
            
            <button 
              onClick={() => (window as any).openStudyWebAuth?.('signup')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-primary to-blue-500 text-white font-bold hover:shadow-lg hover:shadow-brand-primary/30 transform transition-all duration-300 mb-8 relative z-10 overflow-hidden group-hover:before:translate-x-full before:absolute before:inset-0 before:bg-white/20 before:skew-x-12 before:-translate-x-full before:transition-transform before:duration-700 cursor-pointer"
            >
              Get Plus
            </button>
            
            <ul className="space-y-4 flex-1 relative z-10">
              {[
                "Everything in Free",
                "Unlimited AI Assistant",
                "Unlimited Flashcards",
                "Unlimited Quizzes",
                "AI Notes",
                "PDF Summaries",
                "Premium Resources",
                "Smart Study Planner",
                "Advanced Analytics",
                "Priority Support",
                "Early Access Features"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-brand-text font-bold">
                  <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-brand-primary" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* PRO PLAN */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 40, scale: 0.95 },
              visible: { 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: { type: "spring", stiffness: 100, damping: 15 }
              }
            }}
            className="w-full bg-card-bg/60 backdrop-blur-xl border border-card-border rounded-[24px] p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] hover:rotate-1 transition-all duration-300 relative group flex flex-col"
          >
            <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-brand-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-card-border text-brand-text-light text-xs font-semibold mb-4 opacity-0">
                Hidden spacer
              </span>
              <h3 className="text-2xl font-bold font-display text-brand-text mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <motion.span 
                  key={isAnnual ? 'annual' : 'monthly'}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-brand-text"
                >
                  ₹{isAnnual ? '3,499' : '399'}
                </motion.span>
                <span className="text-brand-text-light font-medium">/{isAnnual ? 'year' : 'month'}</span>
              </div>
            </div>
            
            <button 
              onClick={() => (window as any).openStudyWebAuth?.('signup')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-secondary to-indigo-500 text-white font-bold hover:shadow-lg hover:shadow-brand-secondary/30 transition-all duration-300 mb-8 cursor-pointer"
            >
              Go Pro
            </button>
            
            <ul className="space-y-4">
              {[
                "Everything in Plus",
                "AI Mock Tests",
                "Personal AI Tutor",
                "AI Exam Predictor",
                "Advanced Analytics",
                "Goal Tracking",
                "Custom Learning Paths",
                "Competitive Exam Tools",
                "Priority AI Responses",
                "Exclusive Future Features"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-brand-text-light font-medium">
                  <Check className="w-5 h-5 text-brand-secondary shrink-0" />
                  <span className={i === 0 ? "font-bold text-brand-text" : ""}>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* PARENT PLAN */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 40, scale: 0.95 },
              visible: { 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: { type: "spring", stiffness: 100, damping: 15 }
              }
            }}
            className="w-full bg-card-bg/60 backdrop-blur-xl border border-card-border rounded-[24px] p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] hover:rotate-1 transition-all duration-300 relative group flex flex-col"
          >
            <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-card-border text-brand-text-light text-xs font-semibold mb-4 opacity-0">
                Hidden spacer
              </span>
              <h3 className="text-2xl font-bold font-display text-brand-text mb-2">Parent</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <motion.span 
                  key={isAnnual ? 'annual' : 'monthly'}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-brand-text"
                >
                  ₹{isAnnual ? '4,499' : '499'}
                </motion.span>
                <span className="text-brand-text-light font-medium">/{isAnnual ? 'year' : 'month'}</span>
              </div>
            </div>
            
            <button 
              onClick={() => (window as any).openStudyWebAuth?.('signup')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-accent to-emerald-500 text-white font-bold hover:shadow-lg hover:shadow-brand-accent/30 transition-all duration-300 mb-8 cursor-pointer"
            >
              For Parents
            </button>
            
            <ul className="space-y-4">
              {[
                "Up to 3 Student Accounts",
                "Parent Dashboard",
                "Weekly Reports",
                "Study Monitoring",
                "AI Recommendations",
                "Performance Insights",
                "Progress Notifications",
                "Goal Tracking"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-brand-text-light font-medium">
                  <Check className="w-5 h-5 text-brand-accent shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

        </motion.div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-24 border-y border-card-border py-12">
          {[
            { icon: Users, text: "1000+ Students Joining" },
            { icon: Lock, text: "Secure Payments" },
            { icon: Star, text: "No Hidden Fees" },
            { icon: Zap, text: "AI Powered Learning" }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-3 text-center group hover:-translate-y-1 transition-transform cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-card-border/50 flex items-center justify-center text-brand-text-light group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors duration-300">
                <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="text-sm font-bold text-brand-text">{item.text}</span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
