import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';

export default function FAQ() {
  const faqs = [
    {
      question: "Is StudyWeb free?",
      answer: "Yes, we offer a generous free plan that includes our basic study planner and limited AI features. You can upgrade to Premium anytime for unlimited access."
    },
    {
      question: "Can parents monitor progress?",
      answer: "Absolutely! Our Family plan includes a dedicated Parent Dashboard where you can view study time, achievements, and weekly reports without hovering."
    },
    {
      question: "Is the AI safe for students?",
      answer: "Yes. Our AI is strictly trained on educational content and is designed to guide students to answers through Socratic questioning, not just give them the answers."
    },
    {
      question: "Can I access StudyWeb on mobile?",
      answer: "Yes, StudyWeb is fully responsive and works beautifully on phones, tablets, and desktops. Your data syncs instantly across all devices."
    },
    {
      question: "Will my data stay secure?",
      answer: "Data privacy is our top priority. We use industry-standard encryption and never sell student data to third parties. We are COPPA and FERPA compliant."
    },
    {
      question: "Do I need a credit card for the free plan?",
      answer: "No, the free plan is truly free forever. No credit card is required to sign up."
    },
    {
      question: "Can parents monitor multiple children?",
      answer: "Yes, our Parent plan allows you to monitor up to 3 student accounts from a single dashboard."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-card-bg" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-brand-text mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-brand-text-light">
            Everything you need to know about StudyWeb.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="border border-card-border rounded-2xl bg-card-bg overflow-hidden shadow-sm"
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
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
                    <div className="px-6 pb-5 text-brand-text-light">
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
