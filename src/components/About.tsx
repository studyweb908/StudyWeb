import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  Clock, 
  Trophy, 
  Target, 
  Shield, 
  Heart, 
  Lock, 
  User, 
  Users, 
  CheckCircle2, 
  Rocket, 
  ArrowRight, 
  ChevronRight, 
  Layers, 
  Activity, 
  Calendar, 
  TrendingUp, 
  Bot, 
  FileText, 
  BrainCircuit, 
  BarChart3, 
  Library, 
  Globe, 
  LineChart,
  Grid,
  Check
} from 'lucide-react';

export default function About() {
  // Pre-launch stats counter states (simulate incrementing on viewport entry or mounting)
  const [stats, setStats] = useState({
    waitlistCount: 0,
    featuresBuilt: 0,
    parentTrust: 0,
    globalReach: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => {
        const next = { ...prev };
        if (next.waitlistCount < 12450) next.waitlistCount += 150;
        if (next.featuresBuilt < 12) next.featuresBuilt += 1;
        if (next.parentTrust < 99) next.parentTrust += 1;
        if (next.globalReach < 45) next.globalReach += 1;
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  // Timeline active state for interactivity
  const [activeTimelineStep, setActiveTimelineStep] = useState(0);

  const timelineSteps = [
    {
      title: "The Chaos",
      desc: "Juggling 5+ apps, missed deadlines, scattered files, and late-night study panic.",
      icon: <Layers className="w-6 h-6 text-rose-500" />,
      color: "from-rose-500 to-orange-500",
      status: "Before StudyWeb"
    },
    {
      title: "The Intelligent System",
      desc: "Centralizing notes, schedules, and adaptive practice in one place built just for you.",
      icon: <Bot className="w-6 h-6 text-brand-primary" />,
      color: "from-brand-primary to-brand-secondary",
      status: "The Solution"
    },
    {
      title: "Optimized Flow",
      desc: "AI study support 24/7, customized calendars, and automated summarized revision files.",
      icon: <Sparkles className="w-6 h-6 text-brand-secondary" />,
      color: "from-brand-secondary to-brand-accent",
      status: "In Action"
    },
    {
      title: "Academic Triumph",
      desc: "Better grades, lowered anxiety, structured focus, and more time for what matters.",
      icon: <Trophy className="w-6 h-6 text-emerald-500" />,
      color: "from-emerald-500 to-teal-500",
      status: "The Outcome"
    }
  ];

  const valueCards = [
    {
      title: "AI Study Assistant",
      desc: "Get instant explanations, summaries, homework help, and personalized guidance.",
      icon: <Bot className="w-8 h-8 text-indigo-500" />,
      glow: "hover:shadow-indigo-500/10 hover:border-indigo-500/30",
      bgGradient: "from-indigo-500/5 to-transparent"
    },
    {
      title: "Smart Study Planner",
      desc: "Plan your daily study schedule and build consistent, long-term habits.",
      icon: <Calendar className="w-8 h-8 text-purple-500" />,
      glow: "hover:shadow-purple-500/10 hover:border-purple-500/30",
      bgGradient: "from-purple-500/5 to-transparent"
    },
    {
      title: "Progress Analytics",
      desc: "Track performance, monitor improvements, and celebrate learning milestones.",
      icon: <BarChart3 className="w-8 h-8 text-cyan-500" />,
      glow: "hover:shadow-cyan-500/10 hover:border-cyan-500/30",
      bgGradient: "from-cyan-500/5 to-transparent"
    },
    {
      title: "All-in-One Learning Hub",
      desc: "Flashcards, quizzes, notes, resources, and study tools—all securely in one place.",
      icon: <Grid className="w-8 h-8 text-emerald-500" />,
      glow: "hover:shadow-emerald-500/10 hover:border-emerald-500/30",
      bgGradient: "from-emerald-500/5 to-transparent"
    }
  ];

  return (
    <div id="about" className="relative w-full bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-10000" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-brand-secondary/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse duration-8000" />
      <div className="absolute bottom-1/4 left-1/3 w-[600px] h-[600px] bg-brand-accent/5 rounded-full blur-[150px] pointer-events-none -z-10 animate-pulse duration-12000" />

      {/* =================================================
          SECTION 1 — HERO INTRODUCTION
         ================================================= */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Text Content */}
            <div className="lg:col-span-6 text-left space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5 animate-spin duration-3000" /> Discover StudyWeb
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-brand-text leading-none"
              >
                Helping Every Student Learn <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent">Smarter, Not Harder.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-lg text-brand-text-light max-w-xl leading-relaxed"
              >
                StudyWeb is an AI-powered learning platform that makes studying organized, engaging, and stress-free. From planning your study schedule to using AI for instant learning support, everything you need is in one place.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-4 pt-2"
              >
                <button
                  onClick={() => (window as any).openStudyWebAuth?.('signup')}
                  className="px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-brand-primary/20 hover:shadow-xl hover:shadow-brand-secondary/30 hover:-translate-y-0.5 flex items-center gap-2 group cursor-pointer"
                >
                  Join Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <a
                  href="#mission"
                  className="px-6 py-3 border border-card-border hover:bg-card-border/30 text-brand-text rounded-xl text-sm font-semibold transition-all"
                >
                  Our Mission
                </a>
              </motion.div>
            </div>

            {/* Right Column: High-Quality 3D/Interactive Study Workspace Representation */}
            <div className="lg:col-span-6 relative flex justify-center items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative w-full max-w-lg aspect-square"
              >
                {/* Orbital Rings & Glowing Blobs */}
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-brand-secondary/10 rounded-full animate-spin duration-30000 pointer-events-none" />
                <div className="absolute inset-12 bg-gradient-to-bl from-brand-accent/5 to-brand-primary/5 rounded-full animate-spin duration-20000 pointer-events-none" />
                
                {/* Central Device representation */}
                <div className="absolute inset-24 bg-card-bg/80 backdrop-blur-xl border border-card-border rounded-[32px] shadow-2xl p-6 flex flex-col justify-between overflow-hidden group hover:border-brand-primary/30 transition-all duration-500">
                  <div className="flex justify-between items-center border-b border-card-border pb-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-mono text-brand-text-light tracking-widest uppercase">studyweb_ai_os</span>
                  </div>
                  
                  <div className="flex-1 py-4 flex flex-col justify-center space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="w-24 h-2 bg-brand-text rounded-full" />
                        <div className="w-16 h-1.5 bg-brand-text-light rounded-full" />
                      </div>
                    </div>
                    <div className="w-full p-3 rounded-xl bg-card-border/40 text-[11px] font-medium text-brand-text border border-card-border">
                      "Explain photosynthesis like I'm 10."
                    </div>
                    <div className="w-full p-3 rounded-xl bg-brand-primary/5 text-[11px] text-brand-primary border border-brand-primary/15 font-medium">
                      🤖 Answer: "Think of a leaf like a tiny solar-powered food factory!"
                    </div>
                  </div>

                  <div className="h-2 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent rounded-full" />
                </div>

                {/* Floating Workspace Icons (Using exact custom motion settings) */}
                <motion.div
                  animate={{ y: [-8, 8, -8] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-4 left-6 p-3 rounded-2xl bg-card-bg/95 backdrop-blur-lg border border-card-border shadow-xl flex items-center gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-brand-text">Active Study</span>
                </motion.div>

                <motion.div
                  animate={{ y: [8, -8, 8] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-12 right-2 p-3 rounded-2xl bg-card-bg/95 backdrop-blur-lg border border-card-border shadow-xl flex items-center gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-brand-text">Exam Prep</span>
                </motion.div>

                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-16 -left-4 p-3 rounded-2xl bg-card-bg/95 backdrop-blur-lg border border-card-border shadow-xl flex items-center gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-brand-text">Daily Goal</span>
                </motion.div>

                <motion.div
                  animate={{ y: [6, -6, 6] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-6 right-6 p-3 rounded-2xl bg-card-bg/95 backdrop-blur-lg border border-card-border shadow-xl flex items-center gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-brand-text">Pre-launch Waitlist</span>
                </motion.div>

                <motion.div
                  animate={{ scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] border border-dashed border-brand-primary/20 rounded-full pointer-events-none -z-10"
                />
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* =================================================
          SECTION 2 — OUR MISSION
         ================================================= */}
      <section id="mission" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Mission Image/Symbolic visual */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-brand-secondary/10 blur-[80px] rounded-full pointer-events-none" />
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative bg-gradient-to-br from-brand-primary to-brand-secondary p-[1px] rounded-[32px] overflow-hidden group shadow-2xl"
              >
                <div className="bg-card-bg/95 dark:bg-brand-bg-dark/95 backdrop-blur-xl p-8 sm:p-10 rounded-[31px] text-center space-y-6">
                  <div className="w-20 h-20 rounded-3xl bg-brand-secondary/10 text-brand-secondary mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-brand-text tracking-tight">Purpose-driven EdTech</h3>
                  <p className="text-sm text-brand-text-light leading-relaxed">
                    Designed to inspire academic discipline without high costs or overly complicated dashboards.
                  </p>
                  <div className="inline-flex gap-2 items-center text-xs font-semibold text-brand-primary">
                    <span>Active Vision Tracker</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right: Mission Glass Card with Gradient Borders */}
            <div className="lg:col-span-7 text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-secondary/10 text-brand-secondary text-xs font-semibold uppercase tracking-wider">
                <Target className="w-3.5 h-3.5" /> Driven by purpose
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold text-brand-text tracking-tight">
                Our Mission
              </h2>

              <p className="text-lg text-brand-text-light leading-relaxed">
                We believe every student deserves access to smarter learning tools, regardless of their background. Our mission is to simplify education through AI, helping students build confidence, improve consistency, and achieve their academic goals while giving parents greater visibility into their child's learning journey.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-500 mt-1">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brand-text">Student Empowerment</h4>
                    <p className="text-xs text-brand-text-light">Build lifelong learning habits.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-500 mt-1">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brand-text">Parent Peace of Mind</h4>
                    <p className="text-xs text-brand-text-light">Unrivaled progress transparency.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =================================================
          SECTION 3 — WHY WE BUILT STUDYWEB
         ================================================= */}
      <section className="py-24 bg-card-bg/30 border-y border-card-border relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-semibold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" /> Overcoming the Struggle
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-text tracking-tight">
              Why We Built StudyWeb
            </h2>
            <p className="text-sm sm:text-base text-brand-text-light leading-relaxed">
              Students struggle not because they lack potential, but because they lack the right system. We designed StudyWeb to orchestrate academic workflow instantly.
            </p>
          </div>

          {/* Interactive timeline cards */}
          <div className="grid md:grid-cols-4 gap-6 relative">
            
            {/* Connector Line in Desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-400 via-brand-primary to-emerald-400 -translate-y-1/2 z-0 opacity-40" />

            {timelineSteps.map((step, idx) => (
              <motion.div
                key={idx}
                onClick={() => setActiveTimelineStep(idx)}
                className={`relative z-10 p-6 rounded-2xl bg-card-bg border transition-all duration-300 cursor-pointer group ${
                  activeTimelineStep === idx 
                    ? 'border-brand-primary shadow-xl scale-[1.03] ring-1 ring-brand-primary/20' 
                    : 'border-card-border hover:border-brand-primary/30 shadow-sm'
                }`}
              >
                <div className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-wider text-brand-text-light bg-card-border px-2.5 py-1 rounded-full">
                  {step.status}
                </div>

                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${step.color} text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                  {step.icon}
                </div>

                <h3 className="text-lg font-bold text-brand-text mb-2 flex items-center gap-1.5">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-brand-text-light leading-relaxed">
                  {step.desc}
                </p>

                {/* Step indicator dot */}
                <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-4 border-card-bg shadow-md flex items-center justify-center transition-colors ${
                  activeTimelineStep === idx ? 'bg-brand-primary' : 'bg-card-border'
                }`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </motion.div>
            ))}

          </div>

          <div className="mt-12 text-center text-xs text-brand-text-light font-medium flex items-center justify-center gap-1.5">
            <span>✨ Click on each timeline phase to highlight its transition effect.</span>
          </div>

        </div>
      </section>

      {/* =================================================
          SECTION 4 — WHAT MAKES US DIFFERENT
         ================================================= */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-semibold uppercase tracking-wider">
              ⚡ Standing Out
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-text tracking-tight">
              What Makes StudyWeb Different
            </h2>
            <p className="text-sm sm:text-base text-brand-text-light">
              We aren't just another checklist. We represent a paradigm shift in customized student productivity.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueCards.map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * idx }}
                className={`group p-6 rounded-3xl bg-card-bg/60 backdrop-blur-md border border-card-border hover:border-transparent transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${card.glow}`}
              >
                {/* Background Ambient Glow */}
                <div className={`absolute inset-0 bg-gradient-to-b ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                <div className="space-y-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-card-bg border border-card-border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-brand-text">{card.title}</h3>
                  <p className="text-sm text-brand-text-light leading-relaxed">{card.desc}</p>
                </div>

                <div className="pt-6 flex items-center gap-1 text-xs font-semibold text-brand-primary group-hover:gap-2 transition-all relative z-10 cursor-pointer">
                  <span>Explore tool</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* =================================================
          SECTION 5 — OUR VISION
         ================================================= */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-b from-transparent via-brand-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="max-w-3xl mx-auto space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold uppercase tracking-wider">
              🌍 Expanding Horizons
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-text tracking-tight">
              Our Vision
            </h2>

            {/* Simulated interactive globe representation */}
            <div className="relative w-48 h-48 mx-auto my-12 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-brand-secondary/30 rounded-full blur-2xl pointer-events-none" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="w-40 h-40 rounded-full border-2 border-brand-primary/30 border-dashed flex items-center justify-center"
              >
                <div className="w-28 h-28 rounded-full border border-brand-secondary/40 border-dashed flex items-center justify-center">
                  <Globe className="w-16 h-16 text-brand-primary animate-pulse" />
                </div>
              </motion.div>

              {/* Floating particles represent students */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], y: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-4 left-4 w-3.5 h-3.5 rounded-full bg-brand-primary shadow-lg shadow-brand-primary/50"
              />
              <motion.div
                animate={{ scale: [1.2, 1, 1.2], y: [5, -5, 5] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute bottom-6 right-2 w-2.5 h-2.5 rounded-full bg-brand-secondary shadow-lg shadow-brand-secondary/50"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1], x: [-6, 6, -6] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute top-1/2 -right-4 w-3 h-3 rounded-full bg-brand-accent shadow-lg shadow-brand-accent/50"
              />
            </div>

            <p className="text-lg sm:text-xl text-brand-text-light max-w-2xl mx-auto leading-relaxed">
              To become the world's most trusted AI-powered learning platform where every student has the confidence, tools, and support needed to unlock their full academic potential.
            </p>
          </div>

        </div>
      </section>

      {/* =================================================
          SECTION 6 — TRUST SECTION
         ================================================= */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card-bg/60 backdrop-blur-xl border border-card-border rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-accent/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="grid lg:grid-cols-12 gap-12 items-center relative z-10">
              
              {/* Left Column: Text */}
              <div className="lg:col-span-7 text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5" /> Built on integrity
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-brand-text tracking-tight">
                  Built for Students.<br />Trusted by Parents.
                </h2>

                <p className="text-sm sm:text-base text-brand-text-light leading-relaxed">
                  Every feature is designed with learning, simplicity, privacy, and long-term academic success in mind. StudyWeb focuses on meaningful progress instead of distractions, creating a safe and supportive learning environment for students while giving parents confidence in their child's educational journey.
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-bg border border-card-border shadow-sm">
                    <Shield className="w-4 h-4 text-brand-primary" />
                    <span className="text-xs font-semibold text-brand-text">100% Secure & Ad-Free</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-bg border border-card-border shadow-sm">
                    <Lock className="w-4 h-4 text-brand-secondary" />
                    <span className="text-xs font-semibold text-brand-text">COPPA-Compliant Privacy</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-bg border border-card-border shadow-sm">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-semibold text-brand-text">Parent Dashboard Link</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Pillar blocks */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                
                <div className="p-5 rounded-2xl bg-card-bg border border-card-border shadow-md space-y-3 hover:shadow-lg transition-shadow duration-300">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-brand-text">Meaningful Work</h4>
                  <p className="text-[11px] text-brand-text-light">Eliminating mindless scrolling for gamified, smart learning.</p>
                </div>

                <div className="p-5 rounded-2xl bg-card-bg border border-card-border shadow-md space-y-3 hover:shadow-lg transition-shadow duration-300">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-brand-text">Student Mode</h4>
                  <p className="text-[11px] text-brand-text-light">Tailored AI workspace matching any curriculum automatically.</p>
                </div>

                <div className="p-5 rounded-2xl bg-card-bg border border-card-border shadow-md space-y-3 hover:shadow-lg transition-shadow duration-300 col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 text-brand-secondary flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-text">Parent Oversight Gateway</h4>
                      <p className="text-[11px] text-brand-text-light">Generate instant weekly progress digests straight to inbox.</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          SECTION 7 — PRE-LAUNCH STATS
         ================================================= */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            
            <motion.div
              whileHover={{ y: -6 }}
              className="p-6 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border text-center space-y-2 group hover:border-brand-primary/30 transition-all duration-300"
            >
              <div className="text-3xl">🚀</div>
              <p className="text-3xl font-extrabold text-brand-text font-display">
                {stats.waitlistCount.toLocaleString()}+
              </p>
              <p className="text-xs font-semibold text-brand-text-light uppercase tracking-wider">
                Joined Waitlist
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -6 }}
              className="p-6 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border text-center space-y-2 group hover:border-brand-secondary/30 transition-all duration-300"
            >
              <div className="text-3xl">🎓</div>
              <p className="text-3xl font-extrabold text-brand-text font-display">
                {stats.featuresBuilt} Tools
              </p>
              <p className="text-xs font-semibold text-brand-text-light uppercase tracking-wider">
                In One Ecosystem
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -6 }}
              className="p-6 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border text-center space-y-2 group hover:border-brand-accent/30 transition-all duration-300"
            >
              <div className="text-3xl">🤝</div>
              <p className="text-3xl font-extrabold text-brand-text font-display">
                {stats.parentTrust}%
              </p>
              <p className="text-xs font-semibold text-brand-text-light uppercase tracking-wider">
                Student Approved
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -6 }}
              className="p-6 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border text-center space-y-2 group hover:border-brand-highlight/30 transition-all duration-300"
            >
              <div className="text-3xl">🌍</div>
              <p className="text-3xl font-extrabold text-brand-text font-display">
                {stats.globalReach}+
              </p>
              <p className="text-xs font-semibold text-brand-text-light uppercase tracking-wider">
                Countries Reached
              </p>
            </motion.div>

          </div>
        </div>
      </section>

    </div>
  );
}
