import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Lock, Zap, Star, Users, Crown, Sparkles } from 'lucide-react';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  const formatPrice = (inrAnnual: string, inrMonthly: string, usdAnnual: string, usdMonthly: string) => {
    if (currency === 'INR') {
      return `₹${isAnnual ? inrAnnual : inrMonthly}`;
    }
    return `$${isAnnual ? usdAnnual : usdMonthly}`;
  };

  return (
    <section className="py-24 bg-card-bg relative overflow-hidden" id="pricing">
      {/* Subtle Ambient Backgrounds */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-brand-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary mb-3">
              Transparent Student-Friendly Pricing
            </p>
            <h2
              className="text-4xl md:text-5xl font-display font-bold text-brand-text mb-4 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Everything you need to ace exams &amp; interviews—for less than 1 hour of private tutoring
            </h2>
            <p className="text-base sm:text-lg text-brand-text-light mb-8">
              Start free forever with no credit card required. Upgrade anytime when you need unlimited AI document analysis, mock interview drills, and full storage.
            </p>

            {/* Billing Cadence + Currency Switcher Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-4">
              {/* Monthly / Yearly Toggle */}
              <div className="flex items-center gap-3 bg-brand-bg-light/70 border border-card-border px-4 py-2 rounded-2xl">
                <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-brand-text' : 'text-brand-text-light'}`}>
                  Monthly
                </span>
                <button
                  type="button"
                  onClick={() => setIsAnnual(!isAnnual)}
                  aria-label="Toggle between monthly and yearly billing"
                  className="relative w-14 h-7 rounded-full bg-card-border p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
                >
                  <motion.div
                    className="w-5 h-5 rounded-full bg-brand-primary shadow-sm"
                    animate={{ x: isAnnual ? 28 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
                <span className={`text-sm font-bold transition-colors ${isAnnual ? 'text-brand-text' : 'text-brand-text-light'}`}>
                  Yearly <span className="text-brand-accent font-extrabold">(Save 25%)</span>
                </span>
              </div>

              {/* INR / USD Currency Switcher */}
              <div className="inline-flex items-center p-1 rounded-xl bg-brand-bg-light/70 border border-card-border">
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    currency === 'INR'
                      ? 'bg-brand-primary text-white shadow-2xs'
                      : 'text-brand-text-light hover:text-brand-text'
                  }`}
                >
                  ₹ INR
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    currency === 'USD'
                      ? 'bg-brand-primary text-white shadow-2xs'
                      : 'text-brand-text-light hover:text-brand-text'
                  }`}
                >
                  $ USD
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-7 items-stretch mb-16 w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {/* FREE PLAN */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0 }
            }}
            className="w-full bg-card-bg border border-card-border rounded-3xl p-7 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col"
          >
            <div className="mb-6">
              <p className="text-xs font-semibold text-brand-text-light mb-2">
                For students getting started
              </p>
              <h3 className="text-2xl font-bold font-display text-brand-text mb-2">Free Starter</h3>
              <div className="flex items-baseline gap-1.5 mb-1 tabular-nums">
                <span className="text-4xl font-extrabold text-brand-text">
                  {currency === 'INR' ? '₹0' : '$0'}
                </span>
                <span className="text-brand-text-light font-medium text-sm">/ forever</span>
              </div>
              <p className="text-xs text-brand-text-light">No credit card required</p>
            </div>

            <button
              type="button"
              onClick={() => (window as any).openStudyWebAuth?.('signup')}
              className="w-full py-3 px-4 rounded-xl border-2 border-card-border text-brand-text font-bold hover:border-brand-text hover:bg-brand-text hover:text-card-bg transition-all duration-200 mb-7 cursor-pointer whitespace-nowrap"
            >
              Start Studying Free
            </button>

            <ul className="space-y-3.5 flex-1">
              {[
                'Up to 3 Active Study Workspaces',
                'AI Tutor Q&A with Follow-Up Prompts',
                'Upload PDFs, Images & YouTube Links',
                'Auto-Generated Study Notes & Summaries',
                '5 Practice Quizzes per week',
                'Daily Study Routine & Streak Tracker',
                '1 GB Knowledge Storage Quota'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-brand-text-light font-medium">
                  <Check className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* PLUS PLAN (MOST POPULAR) */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0 }
            }}
            className="w-full bg-card-bg border-2 border-brand-primary rounded-3xl p-7 shadow-xl shadow-brand-primary/15 relative lg:-mt-3 lg:mb-[-0.75rem] flex flex-col"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap z-10">
              <Crown className="w-3.5 h-3.5" />
              <span>MOST POPULAR</span>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold text-brand-primary mb-2">
                For semester exams &amp; daily revision
              </p>
              <h3 className="text-2xl font-bold font-display text-brand-text mb-2">Plus</h3>
              <div className="flex items-baseline gap-1.5 mb-1 tabular-nums">
                <span className="text-4xl font-extrabold text-brand-text">
                  {formatPrice('1,799', '199', '24', '3')}
                </span>
                <span className="text-brand-text-light font-medium text-sm">
                  /{isAnnual ? 'year' : 'month'}
                </span>
              </div>
              <p className="text-xs text-brand-text-light tabular-nums">
                {isAnnual
                  ? currency === 'INR'
                    ? 'Equals ₹149/mo billed annually'
                    : 'Equals $2/mo billed annually'
                  : 'Switch to yearly to save 25%'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => (window as any).openStudyWebAuth?.('signup')}
              className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-secondary text-white font-bold shadow-md shadow-brand-primary/25 transition-all duration-200 mb-7 cursor-pointer whitespace-nowrap"
            >
              Get Plus Access
            </button>

            <ul className="space-y-3.5 flex-1">
              {[
                'Everything in Free Starter',
                'Unlimited Workspaces & File Uploads',
                'Unlimited AI Tutor & Deep Explanations',
                'Full Image & Diagram OCR Breakdown',
                'Unlimited Active-Recall Flashcards',
                'Unlimited Topic & File Quizzes',
                'YouTube Lecture Transcript Indexing',
                'Priority Gemini 3 Flash Speed'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-brand-text font-semibold">
                  <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* PRO PLAN */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0 }
            }}
            className="w-full bg-card-bg border border-card-border rounded-3xl p-7 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col"
          >
            <div className="mb-6">
              <p className="text-xs font-semibold text-brand-secondary mb-2">
                For competitive exams &amp; job interviews
              </p>
              <h3 className="text-2xl font-bold font-display text-brand-text mb-2">Pro</h3>
              <div className="flex items-baseline gap-1.5 mb-1 tabular-nums">
                <span className="text-4xl font-extrabold text-brand-text">
                  {formatPrice('3,499', '399', '45', '5')}
                </span>
                <span className="text-brand-text-light font-medium text-sm">
                  /{isAnnual ? 'year' : 'month'}
                </span>
              </div>
              <p className="text-xs text-brand-text-light tabular-nums">
                {isAnnual
                  ? currency === 'INR'
                    ? 'Equals ₹291/mo billed annually'
                    : 'Equals $3.75/mo billed annually'
                  : 'Full interview & exam suite'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => (window as any).openStudyWebAuth?.('signup')}
              className="w-full py-3 px-4 rounded-xl bg-brand-secondary hover:opacity-95 text-white font-bold transition-all duration-200 mb-7 cursor-pointer whitespace-nowrap"
            >
              Upgrade to Pro
            </button>

            <ul className="space-y-3.5 flex-1">
              {[
                'Everything in Plus',
                'Interview & Viva Mock Drill Mode',
                '3-Step Interviewer Follow-Up Chains',
                'Cross-Workspace Knowledge Synthesis',
                'Out-of-Workspace Academic Research',
                'Voice-to-Voice Socratic AI Tutoring',
                'Custom Exam & Placement Roadmaps',
                'Priority Multi-Model AI Routing'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-brand-text-light font-medium">
                  <Check className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
                  <span className={i === 0 ? 'font-bold text-brand-text' : ''}>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* FAMILY / PARENT PLAN */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0 }
            }}
            className="w-full bg-card-bg border border-card-border rounded-3xl p-7 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col"
          >
            <div className="mb-6">
              <p className="text-xs font-semibold text-brand-accent mb-2">
                For families &amp; study groups (up to 3 seats)
              </p>
              <h3 className="text-2xl font-bold font-display text-brand-text mb-2">Family &amp; Team</h3>
              <div className="flex items-baseline gap-1.5 mb-1 tabular-nums">
                <span className="text-4xl font-extrabold text-brand-text">
                  {formatPrice('4,499', '499', '59', '7')}
                </span>
                <span className="text-brand-text-light font-medium text-sm">
                  /{isAnnual ? 'year' : 'month'}
                </span>
              </div>
              <p className="text-xs text-brand-text-light">
                Includes 3 full Pro student accounts
              </p>
            </div>

            <button
              type="button"
              onClick={() => (window as any).openStudyWebAuth?.('signup')}
              className="w-full py-3 px-4 rounded-xl bg-brand-accent hover:opacity-95 text-white font-bold transition-all duration-200 mb-7 cursor-pointer whitespace-nowrap"
            >
              Choose Family Plan
            </button>

            <ul className="space-y-3.5 flex-1">
              {[
                '3 Independent Pro Student Accounts',
                'Dedicated Parent & Mentor Overview',
                'Weekly Study Streak & Goal Reports',
                'Subject-Level Progress Insights',
                'Shared & Private Study Workspaces',
                'COPPA & FERPA Safe Learning Guardrails',
                'Priority Family Support'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-brand-text-light font-medium">
                  <Check className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        {/* Value Anchoring & Risk-Reversal Guarantee Callout (coreyhaines31/marketingskills pricing-strategy) */}
        <div className="rounded-2xl bg-brand-bg-light/60 border border-card-border p-6 sm:p-8 mb-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-primary">
              <Sparkles className="w-4 h-4" />
              <span>Why students switch to StudyWeb Plus &amp; Pro</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-brand-text">
              A single hour of private tutoring costs {currency === 'INR' ? '₹800–₹1,500' : '$30–$60'}. Get 24/7 personalized AI tutoring on your exact course files for a fraction of the cost.
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-light">
              Cancel or switch plans in one click from your profile settings. Your uploaded notes and study workspaces always remain yours.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (window as any).openStudyWebAuth?.('signup')}
            className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-secondary text-white font-bold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Start Free Today
          </button>
        </div>

        {/* Clean Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 border-y border-card-border py-8 text-xs sm:text-sm font-semibold text-brand-text-light">
          {[
            { icon: Users, text: '50,000+ Learning Sessions' },
            { icon: Lock, text: '256-Bit Encrypted Storage' },
            { icon: Star, text: 'Cancel Anytime in 1 Click' },
            { icon: Zap, text: 'Instant AI OCR & Indexing' }
          ].map((item, i) => (
            <div key={i} className="inline-flex items-center gap-2.5">
              <item.icon className="w-4 h-4 text-brand-primary shrink-0" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
