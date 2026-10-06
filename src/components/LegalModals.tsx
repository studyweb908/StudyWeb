import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, FileText, Lock, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export default function LegalModals({ isOpen, type, onClose }: LegalModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !type) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={type === 'privacy' ? 'privacy-title' : 'terms-title'}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-card-bg border border-card-border shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-card-border bg-brand-bg-light/50">
            <div className="flex items-center gap-3">
              {type === 'privacy' ? (
                <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-brand-accent/10 text-brand-accent">
                  <FileText className="w-6 h-6" />
                </div>
              )}
              <div>
                <h2 id={type === 'privacy' ? 'privacy-title' : 'terms-title'} className="text-xl font-bold font-display text-brand-text">
                  {type === 'privacy' ? 'Privacy Policy & Student Data Protection' : 'Terms of Service & Usage Agreement'}
                </h2>
                <p className="text-xs text-brand-text-light">
                  Last updated: October 2026 | StudyWeb Educational Platform
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close legal modal"
              className="p-2 text-brand-text-light hover:text-brand-text rounded-lg hover:bg-card-border/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 text-sm text-brand-text-light leading-relaxed">
            {type === 'privacy' ? (
              <>
                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-brand-primary" />
                    1. Our Commitment to Student & Family Privacy
                  </h3>
                  <p>
                    StudyWeb is built with a fundamental commitment to safeguarding student privacy and maintaining parental trust. We adhere strictly to applicable student data protection standards, including COPPA (Children's Online Privacy Protection Act) and FERPA (Family Educational Rights and Privacy Act) principles.
                  </p>
                </section>

                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2">2. Information We Collect</h3>
                  <p className="mb-2">We collect only information necessary to deliver and personalize your educational experience:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Account Credentials:</strong> Name, email address, student grade level, and optional profile pictures.</li>
                    <li><strong>Study Materials & Content:</strong> Notes, uploaded PDF study materials, quizzes, and flashcards created by the user.</li>
                    <li><strong>Usage & Progress Statistics:</strong> Study session duration, quiz completion scores, and learning progress metrics.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2">3. Zero Data Selling & Educational Focus</h3>
                  <p>
                    We never sell student data or study content to third parties, advertisers, or data brokers. Your study notes, uploaded PDFs, and progress reports are used strictly to power StudyWeb's AI features and provide progress reports for student and parent accounts.
                  </p>
                </section>

                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2">4. AI Processing & Content Safety</h3>
                  <p>
                    AI processing (such as automated revision notes, flashcards, and Socratic tutoring) is executed securely through encrypted educational AI endpoints. AI models do not retain your private study materials to train public AI models.
                  </p>
                </section>

                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2">5. Parent Controls & Data Rights</h3>
                  <p>
                    Parents and guardians have full visibility into connected student accounts through the StudyWeb Parent Dashboard. Users and parents can request complete data export or account deletion at any time by contacting our support team at <a href="mailto:privacy@studyweb.com" className="text-brand-primary underline">privacy@studyweb.com</a>.
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-accent" />
                    1. Acceptance of Terms
                  </h3>
                  <p>
                    By accessing or using StudyWeb, you agree to be bound by these Terms of Service. StudyWeb provides AI-driven educational productivity tools designed for students, parents, and educators.
                  </p>
                </section>

                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2">2. Educational Use & Academic Integrity</h3>
                  <p>
                    StudyWeb is designed as a study companion to foster active recall, concept mastery, and academic growth. Users agree to use StudyWeb's AI tools (such as Socratic tutoring, flashcard generation, and revision summaries) responsibly and in compliance with their educational institution's academic integrity guidelines.
                  </p>
                </section>

                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2">3. User Accounts & Parent Dashboards</h3>
                  <p>
                    You are responsible for maintaining the confidentiality of your account credentials. Parent accounts linked to student profiles receive read-only progress insights to support learning goals.
                  </p>
                </section>

                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2">4. Subscriptions & Free Tier</h3>
                  <p>
                    StudyWeb offers a free forever plan with access to core study planning and basic AI features. Premium and Family subscriptions unlock unlimited AI revision tools, deeper analytics, and multi-child parent dashboards. Subscriptions can be canceled at any time without hidden fees.
                  </p>
                </section>

                <section>
                  <h3 className="text-base font-bold text-brand-text mb-2">5. Limitation of Liability & Support</h3>
                  <p>
                    StudyWeb strives for 99.9% platform availability. If you experience any technical issues or need assistance, our support team is available at <a href="mailto:support@studyweb.com" className="text-brand-primary underline">support@studyweb.com</a>.
                  </p>
                </section>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-card-border bg-brand-bg-light/30 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-brand-primary text-white font-medium hover:bg-brand-secondary transition-colors"
            >
              I Understand
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
