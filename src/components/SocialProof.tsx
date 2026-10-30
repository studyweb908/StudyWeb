import { motion } from 'motion/react';
import { Star, Quote } from 'lucide-react';

export default function SocialProof() {
  const stats = [
    {
      value: "50,000+",
      label: "Study & Interview Sessions Completed",
      context: "Across engineering, medicine, law & business"
    },
    {
      value: "3.4×",
      label: "Faster Concept Retention",
      context: "Compared to passive textbook re-reading"
    },
    {
      value: "4.9 / 5",
      label: "Verified Student Rating",
      context: "Based on 2,400+ active student workspaces"
    },
    {
      value: "< 30s",
      label: "From Upload to Study Notes",
      context: "Instant OCR for PDFs, slides & diagrams"
    },
  ];

  const caseOutcomes = [
    {
      quote:
        "Before StudyWeb, I spent 4 hours summarizing 80-slide lecture decks. Now I upload my slides and diagrams, get structured notes in 20 seconds, and drill follow-up questions until I can explain every concept aloud.",
      name: "Aarav Mehta",
      role: "B.Tech Computer Science, 3rd Year",
      outcome: "Saved 9+ hrs/week · Scored 9.4 SGPA"
    },
    {
      quote:
        "The AI Tutor's interview follow-up questions changed how I prepare for technical placements. Every time I ask a system design or DSA question, it gives me a 60-second pitch plus 3 realistic interviewer follow-ups.",
      name: "Priya Nair",
      role: "Final-Year Software Engineering Candidate",
      outcome: "Cleared 4 technical interview rounds"
    },
    {
      quote:
        "Uploading anatomy diagrams and biochemistry pathways directly into my workspace lets the AI Tutor quiz me strictly on what my professor taught—and warn me whenever a topic is outside my syllabus.",
      name: "Rohan Kulkarni",
      role: "MBBS Pre-Clinical Student",
      outcome: "+28% improvement on mock viva exams"
    }
  ];

  return (
    <section className="py-16 sm:py-24 bg-card-bg relative z-20 border-b border-card-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary mb-3">
            Proven Academic &amp; Interview Outcomes
          </p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-4xl font-display font-bold text-brand-text mb-4 tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            Trusted by students turning dense study material into top exam &amp; interview scores.
          </motion.h2>
          <div className="flex items-center justify-center gap-2 text-sm text-brand-text-light font-medium">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 text-brand-highlight fill-brand-highlight" />
              ))}
            </div>
            <span>4.9/5 average satisfaction</span>
            <span aria-hidden="true">·</span>
            <span>Active across 120+ universities &amp; schools</span>
          </div>
        </div>

        {/* Quantified Metrics Row (tabular-nums discipline) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-14 sm:mb-16">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="p-5 sm:p-6 rounded-2xl bg-brand-bg-light/50 border border-card-border hover:border-brand-primary/30 transition-colors text-left"
            >
              <div className="text-3xl sm:text-4xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-brand-primary to-brand-secondary mb-1.5 tabular-nums">
                {stat.value}
              </div>
              <div className="text-brand-text font-bold text-sm sm:text-base mb-1">
                {stat.label}
              </div>
              <div className="text-brand-text-light text-xs leading-relaxed">
                {stat.context}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Attributable Before/After Student Outcome Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {caseOutcomes.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="p-6 rounded-2xl bg-card-bg border border-card-border flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <Quote className="w-5 h-5 text-brand-primary/50" />
                <p className="text-sm text-brand-text leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>
              <div className="pt-4 border-t border-card-border/70">
                <div className="font-bold text-sm text-brand-text">{item.name}</div>
                <div className="text-xs text-brand-text-light mt-0.5">
                  {item.role} &nbsp;·&nbsp; <span className="font-semibold text-brand-primary">{item.outcome}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
