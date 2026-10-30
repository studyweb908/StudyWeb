import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';

export default function FAQ() {
  const faqs = [
    {
      question: "How accurately does StudyWeb analyze my uploaded images, diagrams, and PDFs?",
      answer: "When you upload an image, screenshot, lecture slide, or PDF to a workspace, StudyWeb performs multimodal OCR and visual inspection on the exact file you uploaded and saves the structured breakdown to your workspace. It never mixes in unrelated subjects, and always prioritizes your active workspace materials first."
    },
    {
      question: "How does the AI Tutor help with technical and behavioral interview preparation?",
      answer: "Whenever you ask an interview or oral viva question, the AI Tutor automatically structures a complete model response—starting with a confident 60-second interview pitch, followed by core technical or STAR-framework talking points and common candidate pitfalls. At the bottom of every response bubble, it suggests 3 clickable interviewer follow-up questions so you can practice multi-round questioning."
    },
    {
      question: "What happens if I ask about a topic that is not in my uploaded workspace files?",
      answer: "StudyWeb always checks your active workspace materials first and tells you which workspace and files were checked. If you ask about a topic outside your uploaded files, it clearly notifies you and provides a 1-click 'Research outside workspace' button plus tailored follow-up questions so your syllabus stays cleanly separated from external research."
    },
    {
      question: "Is StudyWeb really free to start, and do I need a credit card?",
      answer: "Yes! The Free Starter plan is free forever and requires no credit card. You get up to 1 GB of knowledge storage, active study workspaces, multimodal file uploads, and AI Tutor explanations with follow-up questions right away."
    },
    {
      question: "How does the daily study streak work?",
      answer: "Your study streak increments automatically by +1 as soon as your logged daily study minutes reach your personal daily goal target—helping you build a consistent, measurable study habit."
    },
    {
      question: "Are my uploaded study notes and files private and secure?",
      answer: "Absolutely. Your workspaces and uploaded materials are isolated to your account using encrypted cloud storage. We never sell student data and strictly adhere to COPPA and FERPA educational privacy standards."
    },
    {
      question: "Can I switch between Monthly and Yearly plans or cancel anytime?",
      answer: "Yes, you can upgrade, downgrade, or cancel in a single click from your account settings with zero hidden fees or lock-in contracts."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <section className="py-24 bg-card-bg" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary mb-3">
            Answers to Common Questions
          </p>
          <h2
            className="text-3xl md:text-4xl font-display font-bold text-brand-text mb-4"
            style={{ textWrap: 'balance' }}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-brand-text-light">
            Everything you need to know about workspace accuracy, interview prep, privacy, and plans.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="border border-card-border rounded-2xl bg-card-bg overflow-hidden shadow-xs"
            >
              <button
                type="button"
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-bold text-brand-text pr-8">{faq.question}</span>
                {openIndex === index ? (
                  <Minus className="w-5 h-5 text-brand-primary shrink-0" />
                ) : (
                  <Plus className="w-5 h-5 text-brand-text-light shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-6 pb-5 text-brand-text-light text-sm sm:text-base leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
