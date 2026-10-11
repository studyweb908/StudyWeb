import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  MapPin, 
  Clock, 
  Zap, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Twitter, 
  Youtube, 
  Lock, 
  Heart, 
  ShieldCheck, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  GraduationCap, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  HelpCircle,
  MessageSquare
} from 'lucide-react';

export default function Contact() {
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    subject: '',
    message: '',
    agree: false
  });

  const [charCount, setCharCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Characters count listener
  useEffect(() => {
    setCharCount(formData.message.length);
  }, [formData.message]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, agree: e.target.checked }));
    if (errors.agree) {
      setErrors(prev => ({ ...prev, agree: '' }));
    }
  };

  // Basic validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full Name is required.';
    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email.';
    }
    if (!formData.role) newErrors.role = 'Please select who you are.';
    if (!formData.subject) newErrors.subject = 'Please select a subject.';
    if (!formData.message.trim()) {
      newErrors.message = 'Message cannot be empty.';
    } else if (formData.message.length > 500) {
      newErrors.message = 'Message must be 500 characters or less.';
    }
    if (!formData.agree) {
      newErrors.agree = 'You must agree to the Privacy Policy and Terms.';
    }
    return newErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error} (Reason: ${data.details})`
          : (data.error || 'Failed to submit message to the server.');
        throw new Error(errorMsg);
      }

      setIsSubmitted(true);
      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        role: '',
        subject: '',
        message: '',
        agree: false
      });
      // Show success for 6 seconds, then reset state
      setTimeout(() => {
        setIsSubmitted(false);
      }, 6000);
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setSubmitError(err.message || 'An error occurred while sending your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compact FAQ preview state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqItems = [
    {
      q: "When is StudyWeb launching?",
      a: "We are currently in private beta, collecting feedback from early student testers. Our public global pre-launch is planned for late Summer 2026. Join our waitlist to secure your early access spot!"
    },
    {
      q: "Is StudyWeb free to use?",
      a: "Yes! StudyWeb is built student-first. We offer a generous Free Forever plan that includes basic AI study assistants, notes generators, and progress tracking. Premium tiers with advanced limits are completely optional."
    },
    {
      q: "Can parents create accounts?",
      a: "Absolutely. Parents can link their accounts to monitor their child's daily goals, check their streak consistency, and review AI tutor diagnostics while keeping private notes strictly secure."
    },
    {
      q: "Will there be a mobile app?",
      a: "Yes, fully optimized native apps for both iOS and Android are co-developing alongside our web suite to launch concurrently, supporting fully offline flashcards sync."
    }
  ];

  return (
    <section id="contact" className="py-24 relative overflow-hidden bg-gradient-to-b from-transparent via-brand-primary/5 to-transparent">
      
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute top-1/4 left-10 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse duration-10000" />
      <div className="absolute bottom-1/4 right-10 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-8000" />
      
      {/* Floating Sparkles & Educational Particles */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-30 overflow-hidden">
        <motion.div 
          animate={{ y: [-15, 15, -15], rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-12 text-brand-primary"
        >
          <Sparkles className="w-6 h-6" />
        </motion.div>
        <motion.div 
          animate={{ y: [15, -15, 15], rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 right-16 text-brand-secondary"
        >
          <BookOpen className="w-5 h-5" />
        </motion.div>
        <motion.div 
          animate={{ scale: [0.9, 1.1, 0.9], y: [-10, 10, -10] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/3 left-24 text-brand-accent"
        >
          <GraduationCap className="w-7 h-7" />
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ==========================================================
            SECTION HEADER
           ========================================================== */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold uppercase tracking-wider"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Reach Out to Us
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-brand-text font-display"
          >
            Let's Connect
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-brand-text-light"
          >
            Have a question, feedback, partnership idea, or need support? We'd love to hear from you. Whether you're a student, parent, teacher, or school, we're here to help and typically respond within 24–48 hours.
          </motion.p>
        </div>

        {/* ==========================================================
            MAIN LAYOUT
           ========================================================== */}
        <div className="grid lg:grid-cols-12 gap-12 items-start mb-24">
          
          {/* LEFT COLUMN (45%) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="grid sm:grid-cols-2 gap-4">
              
              {/* Card 1: Email */}
              <div className="p-5 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border hover:border-brand-primary/30 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-light mb-1">Email Us</h4>
                <a href="mailto:studyweb908@gmail.com" className="text-sm font-semibold text-brand-text hover:text-brand-primary block transition-colors">
                  studyweb908@gmail.com
                </a>
                <p className="text-[11px] text-brand-text-light mt-1">Reach us anytime.</p>
              </div>

              {/* Card 2: Location */}
              <div className="p-5 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border hover:border-brand-primary/30 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-light mb-1">Location</h4>
                <p className="text-sm font-semibold text-brand-text">India</p>
                <p className="text-[11px] text-brand-text-light mt-1">Serving learners everywhere.</p>
              </div>

              {/* Card 3: Support Hours */}
              <div className="p-5 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border hover:border-brand-primary/30 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-light mb-1">Support Hours</h4>
                <p className="text-sm font-semibold text-brand-text leading-tight">24/7 Support</p>
                <p className="text-xs font-medium text-brand-text-light mt-0.5">Available all the time</p>
              </div>

              {/* Card 4: Average Response */}
              <div className="p-5 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border hover:border-brand-primary/30 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 animate-pulse" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-light mb-1">Response Speed</h4>
                <p className="text-sm font-semibold text-brand-text">24–48 Hours</p>
                <p className="text-[11px] text-brand-text-light mt-1">Typically much faster.</p>
              </div>

            </div>

            {/* Social Links with Hover Visual Glow */}
            <div className="p-6 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border space-y-4">
              <h4 className="text-sm font-bold text-brand-text">Follow StudyWeb</h4>
              <div className="flex flex-wrap items-center gap-3">
                
                <a href="https://www.facebook.com/profile.php?id=61591705465611" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-11 h-11 rounded-xl bg-card-bg border border-card-border hover:border-blue-600 hover:text-blue-600 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-blue-600/10 hover:-translate-y-1 hover:rotate-6">
                  <Facebook className="w-5 h-5" />
                </a>

                <a href="https://www.instagram.com/studywebai/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-11 h-11 rounded-xl bg-card-bg border border-card-border hover:border-pink-600 hover:text-pink-600 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-pink-600/10 hover:-translate-y-1 hover:-rotate-6">
                  <Instagram className="w-5 h-5" />
                </a>

                <a href="https://www.linkedin.com/in/study-web-a823b9417" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-11 h-11 rounded-xl bg-card-bg border border-card-border hover:border-indigo-600 hover:text-indigo-600 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-indigo-600/10 hover:-translate-y-1 hover:rotate-6">
                  <Linkedin className="w-5 h-5" />
                </a>

                <a href="https://x.com/StudyWebai" target="_blank" rel="noopener noreferrer" aria-label="Twitter/X" className="w-11 h-11 rounded-xl bg-card-bg border border-card-border hover:border-black hover:text-brand-primary flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-black/10 hover:-translate-y-1 hover:-rotate-6">
                  <Twitter className="w-5 h-5" />
                </a>

                <a href="https://youtube.com/@studywebai?si=MuOx34RW2jzmRhBL" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-11 h-11 rounded-xl bg-card-bg border border-card-border hover:border-rose-600 hover:text-rose-600 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-rose-600/10 hover:-translate-y-1 hover:rotate-6">
                  <Youtube className="w-5 h-5" />
                </a>

              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (55%) - PREMIUM GLASSMORPHISM FORM */}
          <div className="lg:col-span-7">
            <div className="relative bg-card-bg/80 backdrop-blur-2xl border border-card-border shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 hover:border-brand-primary/20 transition-all duration-500">
              
              {/* Subtle visual glow under form */}
              <div className="absolute inset-x-0 -bottom-10 h-32 bg-gradient-to-t from-brand-primary/5 to-transparent blur-3xl pointer-events-none -z-10" />

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Two Column Row (Name & Email) */}
                <div className="grid sm:grid-cols-2 gap-6">
                  
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-brand-text-light flex items-center gap-1">
                      Full Name <span className="text-brand-primary">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className={`w-full px-4 py-3 rounded-xl border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all ${
                          errors.name ? 'border-rose-500 bg-rose-500/5' : 'border-card-border'
                        }`}
                        aria-invalid={errors.name ? 'true' : 'false'}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email field */}
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-brand-text-light flex items-center gap-1">
                      Email Address <span className="text-brand-primary">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className={`w-full px-4 py-3 rounded-xl border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all ${
                        errors.email ? 'border-rose-500 bg-rose-500/5' : 'border-card-border'
                      }`}
                      aria-invalid={errors.email ? 'true' : 'false'}
                    />
                    {errors.email && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.email}
                      </p>
                    )}
                  </div>

                </div>

                {/* Two Column Row (Who are you? & Subject) */}
                <div className="grid sm:grid-cols-2 gap-6">
                  
                  {/* Who are you field */}
                  <div className="space-y-1.5">
                    <label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-brand-text-light flex items-center gap-1">
                      Who are you? <span className="text-brand-primary">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-xl border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all appearance-none cursor-pointer ${
                          errors.role ? 'border-rose-500 bg-rose-500/5' : 'border-card-border'
                        }`}
                        aria-invalid={errors.role ? 'true' : 'false'}
                      >
                        <option value="" disabled>Select option</option>
                        <option value="Student">Student</option>
                        <option value="Parent">Parent</option>
                        <option value="Teacher">Teacher</option>
                        <option value="School">School</option>
                        <option value="College">College</option>
                        <option value="Partner">Partner</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-text-light">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                    {errors.role && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.role}
                      </p>
                    )}
                  </div>

                  {/* Subject field */}
                  <div className="space-y-1.5">
                    <label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-brand-text-light flex items-center gap-1">
                      Subject <span className="text-brand-primary">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-xl border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all appearance-none cursor-pointer ${
                          errors.subject ? 'border-rose-500 bg-rose-500/5' : 'border-card-border'
                        }`}
                        aria-invalid={errors.subject ? 'true' : 'false'}
                      >
                        <option value="" disabled>Select option</option>
                        <option value="General Question">General Question</option>
                        <option value="Technical Support">Technical Support</option>
                        <option value="Feedback">Feedback</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Bug Report">Bug Report</option>
                        <option value="Media Inquiry">Media Inquiry</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-text-light">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                    {errors.subject && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.subject}
                      </p>
                    )}
                  </div>

                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-brand-text-light">
                    <label htmlFor="message">Message <span className="text-brand-primary">*</span></label>
                    <span className={`text-[10px] font-mono tracking-normal ${charCount > 450 ? 'text-amber-500 font-bold' : ''}`}>
                      {charCount} / 500
                    </span>
                  </div>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    maxLength={500}
                    placeholder="Tell us how we can help you..."
                    rows={5}
                    className={`w-full px-4 py-3 rounded-xl border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all resize-none ${
                      errors.message ? 'border-rose-500 bg-rose-500/5' : 'border-card-border'
                    }`}
                    aria-invalid={errors.message ? 'true' : 'false'}
                  />
                  {errors.message && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.message}
                    </p>
                  )}
                </div>

                {/* Privacy checkbox */}
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-brand-text-light font-medium select-none">
                    <input
                      type="checkbox"
                      name="agree"
                      checked={formData.agree}
                      onChange={handleCheckboxChange}
                      className="mt-0.5 rounded border-card-border text-brand-primary focus:ring-brand-primary/20 w-4 h-4 cursor-pointer"
                    />
                    <span>
                      I agree to the{' '}
                      <a href="#privacy" className="text-brand-primary hover:underline font-semibold">Privacy Policy</a>
                      {' '}and{' '}
                      <a href="#terms" className="text-brand-primary hover:underline font-semibold">Terms</a>.
                    </span>
                  </label>
                  {errors.agree && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.agree}
                    </p>
                  )}
                </div>

                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </motion.div>
                )}

                {/* Submit button wrapper */}
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || isSubmitted}
                    className="w-full relative py-4 px-6 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 transform shadow-lg bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary hover:to-brand-primary hover:shadow-xl hover:shadow-brand-primary/25 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-90 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    {/* Animated Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />

                    <AnimatePresence mode="wait">
                      {isSubmitting ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-2"
                        >
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Sending Message...</span>
                        </motion.div>
                      ) : isSubmitted ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-2 text-emerald-300"
                        >
                          <CheckCircle className="w-5 h-5" />
                          <span>Message Sent Successfully!</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="default"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <span>Send Message</span>
                          <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

              </form>

            </div>
          </div>

        </div>

        {/* ==========================================================
            TRUST SECTION (BELOW FORM)
           ========================================================== */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          
          <div className="p-5 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border flex items-start gap-4 hover:border-brand-primary/20 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-brand-text">100% Secure Privacy</h4>
              <p className="text-xs text-brand-text-light leading-relaxed">Your details are completely secure with AES grade encryption algorithms.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border flex items-start gap-4 hover:border-brand-secondary/20 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-brand-text">Ultra Fast Responses</h4>
              <p className="text-xs text-brand-text-light leading-relaxed">Average feedback and help tickets resolved within 24 to 48 hours maximum.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card-bg/60 backdrop-blur-md border border-card-border flex items-start gap-4 hover:border-cyan-500/20 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500 flex-shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-brand-text">Personally Reviewed</h4>
              <p className="text-xs text-brand-text-light leading-relaxed">No generic support bots here. Real educators review every message to assist you.</p>
            </div>
          </div>

        </div>

        {/* ==========================================================
            FAQ PREVIEW ACCORDION
           ========================================================== */}
        <div className="max-w-3xl mx-auto border border-card-border bg-card-bg/50 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div className="text-left space-y-1">
              <h3 className="text-xl font-bold text-brand-text flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-primary" /> Frequently Asked Questions
              </h3>
              <p className="text-xs text-brand-text-light">Quick answers to common questions about our system.</p>
            </div>
            <a
              href="#faq"
              className="px-4 py-2 border border-card-border hover:bg-card-border/40 text-brand-text rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
            >
              View All FAQs <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="space-y-3">
            {faqItems.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="border border-card-border rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 bg-card-bg hover:bg-brand-primary/5 transition-colors focus:outline-none"
                    aria-expanded={isOpen ? 'true' : 'false'}
                  >
                    <span className="text-sm font-semibold text-brand-text">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-brand-text-light transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-1 text-xs text-brand-text-light leading-relaxed bg-card-bg/40 border-t border-card-border">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
