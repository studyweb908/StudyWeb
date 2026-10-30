import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userEmail?: string;
}

const TOTAL_STEPS = 11;

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<number>(() => {
    const saved = localStorage.getItem('studyweb_onboarding_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.step || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  });

  const [formData, setFormData] = useState<any>(() => {
    const saved = localStorage.getItem('studyweb_onboarding_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.formData || {
          status: '',
          school: '',
          study: '',
          goal: '',
          time: '',
          sources: [],
          device: '',
          challenge: '',
          usesAi: '',
          aiTools: [],
          finalProblem: ''
        };
      } catch {
        return {
          status: '',
          school: '',
          study: '',
          goal: '',
          time: '',
          sources: [],
          device: '',
          challenge: '',
          usesAi: '',
          aiTools: [],
          finalProblem: ''
        };
      }
    }
    return {
      status: '',
      school: '',
      study: '',
      goal: '',
      time: '',
      sources: [],
      device: '',
      challenge: '',
      usesAi: '',
      aiTools: [],
      finalProblem: ''
    };
  });

  const [advancingKey, setAdvancingKey] = useState<string | null>(null);
  const [isSavingFinal, setIsSavingFinal] = useState(false);

  // Save draft to localStorage
  useEffect(() => {
    if (step <= TOTAL_STEPS) {
      localStorage.setItem('studyweb_onboarding_draft', JSON.stringify({ step, formData }));
    }
  }, [step, formData]);

  const updateForm = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (step === 2) {
      if (['School Student', 'College / University Student'].includes(formData.status)) {
        setStep(3);
      } else {
        setStep(4);
      }
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step === 4) {
      if (['School Student', 'College / University Student'].includes(formData.status)) {
        setStep(3);
      } else {
        setStep(2);
      }
      return;
    }
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleOptionSelect = (key: string, value: any) => {
    if (advancingKey) return;
    updateForm(key, value);
    const token = `${key}:${value}`;
    setAdvancingKey(token);

    setTimeout(() => {
      setAdvancingKey(null);
      if (step === 2) {
        if (['School Student', 'College / University Student'].includes(value)) {
          setStep(3);
        } else {
          setStep(4);
        }
      } else if (step === 10 && key === 'usesAi' && value === 'Yes') {
        // Stay on step 10 to select AI tools
      } else {
        setStep((prev) => prev + 1);
      }
    }, 340);
  };

  const isNextDisabled = () => {
    switch (step) {
      case 1: return !formData.discovery;
      case 2: return !formData.status;
      case 3: return !formData.school.trim();
      case 4: return !formData.study.trim();
      case 5: return !formData.goal;
      case 6: return !formData.time;
      case 7: return formData.sources.length === 0;
      case 8: return !formData.device;
      case 9: return !formData.challenge;
      case 10: return !formData.usesAi || (formData.usesAi === 'Yes' && formData.aiTools.length === 0);
      case 11: return !formData.finalProblem.trim();
      default: return false;
    }
  };

  const renderRadioOption = (fieldKey: string, opt: string) => {
    const isSelected = formData[fieldKey] === opt;
    const isAdvancingThis = advancingKey === `${fieldKey}:${opt}`;

    return (
      <button
        key={opt}
        type="button"
        onClick={() => handleOptionSelect(fieldKey, opt)}
        className={`w-full text-left flex items-center justify-between p-4 sm:p-5 border rounded-2xl cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-500/15 shadow-sm ring-2 ring-indigo-500/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50/70 dark:hover:bg-slate-900'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-500 text-white'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          <span
            className={`font-semibold text-sm sm:text-base truncate ${
              isSelected ? 'text-indigo-950 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {opt}
          </span>
        </div>

        {isAdvancingThis && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 ml-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Next</span>
          </div>
        )}
      </button>
    );
  };

  const progressPercentage = Math.min(100, Math.max(0, (step / TOTAL_STEPS) * 100));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] w-screen h-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden"
        >
          {/* Ambient Subtle Background Glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 left-1/4 w-[28rem] h-[28rem] rounded-full bg-indigo-500/8 dark:bg-indigo-500/10 blur-3xl" />
            <div className="absolute -bottom-32 right-1/4 w-[28rem] h-[28rem] rounded-full bg-violet-500/8 dark:bg-violet-500/10 blur-3xl" />
          </div>

          {/* Full-Width Top Navigation & Progress Header */}
          <header className="relative z-10 w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {step > 0 && step <= TOTAL_STEPS ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                      StudyWeb Setup
                    </span>
                  </div>
                )}
              </div>

              {step > 0 && step <= TOTAL_STEPS && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden sm:inline">
                    Personalization Progress
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    Step {step} of {TOTAL_STEPS}
                  </span>
                </div>
              )}
            </div>

            {/* Instant Animated Top Progress Bar */}
            {step > 0 && step <= TOTAL_STEPS && (
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-600 dark:bg-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            )}
          </header>

          {/* Main Full-Screen Question Viewport */}
          <main className="relative z-10 flex-1 overflow-y-auto flex flex-col justify-center px-4 sm:px-8 py-8 sm:py-12">
            <div className="w-full max-w-2xl mx-auto my-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full"
                >
                  {step === 0 && (
                    <div className="text-center py-8 sm:py-12 flex flex-col items-center justify-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm">
                      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                        <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="space-y-3 max-w-md mx-auto">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Welcome to StudyWeb
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
                          Answer a few quick questions so we can tailor your workspaces, study goals, and AI Tutor to your exact curriculum.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold text-base shadow-sm transition-all active:scale-95 inline-flex items-center gap-2.5 cursor-pointer"
                      >
                        <span>Begin Personalization</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question 1
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          How did you hear about StudyWeb?
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Select an option to immediately continue to the next question.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['YouTube', 'Friend / Classmate', 'Instagram', 'Twitter / X', 'LinkedIn', 'Google Search', 'Reddit', 'School / College', 'Other'].map((opt) =>
                          renderRadioOption('discovery', opt)
                        )}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question 2
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Which best describes you?
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          We adapt explanations and study depth to your academic stage.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['School Student', 'College / University Student', 'Self Learner', 'Working Professional', 'Teacher / Educator', 'Other'].map((opt) =>
                          renderRadioOption('status', opt)
                        )}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question 3
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          What is the name of your school or college?
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Enter your school, college, or university name.
                        </p>
                      </div>
                      <input
                        type="text"
                        value={formData.school}
                        onChange={(e) => updateForm('school', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isNextDisabled()) handleNext();
                        }}
                        placeholder="e.g., Delhi Public School, IIT Bombay, Stanford University"
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-medium text-base sm:text-lg placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question 4
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          What are you currently studying?
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Specify your grade, major, degree, or primary subject focus.
                        </p>
                      </div>
                      <input
                        type="text"
                        value={formData.study}
                        onChange={(e) => updateForm('study', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isNextDisabled()) handleNext();
                        }}
                        placeholder="Example: Class 12 Science, B.Tech CSE, MBBS, Web Development, UPSC"
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-medium text-base sm:text-lg placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question 5
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          What is your biggest learning goal right now?
                        </h2>
                      </div>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {['Crack JEE', 'Crack NEET', 'UPSC Preparation', 'Learn Web Development', 'Learn AI', 'Learn Programming', 'Improve English', 'Get Better Grades', 'Get a Job', 'Other'].map((opt) =>
                          renderRadioOption('goal', opt)
                        )}
                      </div>
                    </div>
                  )}

                  {step === 6 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question 6
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          How many hours do you study on average each day?
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          This sets your daily routine target for your study streak.
                        </p>
                      </div>
                      <div className="grid gap-3 grid-cols-1">
                        {['Less than 1 hour', '1–2 hours', '2–4 hours', '4–6 hours', 'More than 6 hours'].map((opt) =>
                          renderRadioOption('time', opt)
                        )}
                      </div>
                    </div>
                  )}

                  {step === 7 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question 7
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Where do you usually learn?
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Select all learning sources that apply, then click Continue.
                        </p>
                      </div>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {['YouTube', 'ChatGPT', 'Google', 'Books', 'Online Courses', 'School / College', 'Coaching Institute', 'Friends', 'Other'].map((opt) => {
                          const isSelected = formData.sources.includes(opt);
                          return (
                            <label
                              key={opt}
                              className={`flex items-center p-4 sm:p-5 border rounded-2xl cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-500/15 shadow-sm ring-2 ring-indigo-500/20'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-indigo-300 dark:hover:border-indigo-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={isSelected}
                                onChange={() => {
                                  const newSources = isSelected
                                    ? formData.sources.filter((s: string) => s !== opt)
                                    : [...formData.sources, opt];
                                  updateForm('sources', newSources);
                                }}
                              />
                              <div
                                className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center mr-3.5 transition-colors ${
                                  isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                              </div>
                              <span
                                className={`font-semibold text-sm sm:text-base ${
                                  isSelected ? 'text-indigo-950 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {step === 8 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question 8
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Which device do you use most for studying?
                        </h2>
                      </div>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {['Phone', 'Laptop', 'Tablet', 'Desktop'].map((opt) =>
                          renderRadioOption('device', opt)
                        )}
                      </div>
                    </div>
                  )}

                  {step === 9 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question 9
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          What is your biggest challenge while studying?
                        </h2>
                      </div>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {[
                          "I don't know what to study.",
                          'Too many resources.',
                          'I get distracted.',
                          'I procrastinate.',
                          'I forget what I learn.',
                          'I struggle to stay consistent.',
                          "I don't have enough time.",
                          'Other'
                        ].map((opt) => renderRadioOption('challenge', opt))}
                      </div>
                    </div>
                  )}

                  {step === 10 && (
                    <div className="space-y-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Question 10
                          </span>
                          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Do you currently use AI for studying?
                          </h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {['Yes', 'No'].map((opt) => renderRadioOption('usesAi', opt))}
                        </div>
                      </div>

                      {formData.usesAi === 'Yes' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-5 pt-6 border-t border-slate-100 dark:border-slate-800"
                        >
                          <div className="space-y-1">
                            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                              Which AI tools do you use?
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Select all that apply.
                            </p>
                          </div>
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {['ChatGPT', 'Gemini', 'Claude', 'Perplexity', 'Microsoft Copilot', 'Other'].map((opt) => {
                              const isSelected = formData.aiTools.includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-500/15 shadow-sm ring-2 ring-indigo-500/20'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-indigo-300 dark:hover:border-indigo-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={isSelected}
                                    onChange={() => {
                                      const newTools = isSelected
                                        ? formData.aiTools.filter((t: string) => t !== opt)
                                        : [...formData.aiTools, opt];
                                      updateForm('aiTools', newTools);
                                    }}
                                  />
                                  <div
                                    className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center mr-3 transition-colors ${
                                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                  </div>
                                  <span
                                    className={`font-semibold text-sm ${
                                      isSelected ? 'text-indigo-950 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'
                                    }`}
                                  >
                                    {opt}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {step === 11 && (
                    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Final Question
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          If StudyWeb could solve just one learning problem for you, what would it be?
                        </h2>
                      </div>
                      <div className="relative">
                        <textarea
                          value={formData.finalProblem}
                          onChange={(e) => {
                            if (e.target.value.length <= 300) {
                              updateForm('finalProblem', e.target.value);
                            }
                          }}
                          placeholder="Tell us what's stopping you from learning effectively..."
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-medium text-base placeholder:text-slate-400 min-h-[160px] resize-none"
                          autoFocus
                        />
                        <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400 tabular-nums">
                          {formData.finalProblem.length}/300
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 12 && (
                    <div className="text-center py-10 sm:py-14 px-6 sm:px-12 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
                      <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', bounce: 0.5 }}
                        >
                          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </motion.div>
                      </div>
                      <div className="space-y-2.5 max-w-md mx-auto">
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Your Workspace Is Ready
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
                          Your study profile, daily routine target, and AI Tutor preferences have been configured.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSavingFinal}
                        onClick={async () => {
                          setIsSavingFinal(true);
                          if (formData.school) localStorage.setItem('studyweb_profile_school', formData.school);
                          if (formData.study) localStorage.setItem('studyweb_profile_class_board', formData.study);
                          if (formData.finalProblem) localStorage.setItem('studyweb_profile_bio', formData.finalProblem);
                          if (formData.goal) localStorage.setItem('studyweb_profile_aim', formData.goal);

                          let dailyMins = 60;
                          if (formData.time.includes('Less than 1')) dailyMins = 30;
                          if (formData.time.includes('1–2')) dailyMins = 90;
                          if (formData.time.includes('2–4')) dailyMins = 180;
                          if (formData.time.includes('4–6')) dailyMins = 300;
                          if (formData.time.includes('More than 6')) dailyMins = 420;
                          localStorage.setItem('studyweb_profile_daily_goal', dailyMins.toString());

                          localStorage.setItem('studyweb_onboarding_data', JSON.stringify(formData));
                          localStorage.setItem('studyweb_onboarding_complete', 'true');

                          if (supabase) {
                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              if (session?.user) {
                                await supabase.from('profiles').upsert({
                                  id: session.user.id,
                                  email: session.user.email || '',
                                  school_name: formData.school || '',
                                  academic_institution: formData.school || '',
                                  current_study: formData.study || '',
                                  class_name: formData.study || '',
                                  curriculum_board: formData.study || '',
                                  target_aim: formData.goal || '',
                                  primary_goal: formData.goal || '',
                                  scholar_bio: formData.finalProblem || '',
                                  bio: formData.finalProblem || '',
                                  onboarding_data: formData,
                                  updated_at: new Date().toISOString()
                                });
                              }
                            } catch (err) {
                              console.error('Failed to save onboarding data to Supabase:', err);
                            }
                          }

                          localStorage.removeItem('studyweb_onboarding_draft');
                          window.dispatchEvent(new Event('studyweb_profile_updated'));
                          setIsSavingFinal(false);
                          onComplete();
                        }}
                        className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-8 py-4 rounded-2xl font-bold text-base shadow-sm transition-all active:scale-95 inline-flex items-center gap-2.5 cursor-pointer"
                      >
                        {isSavingFinal ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Entering StudyWeb...</span>
                          </>
                        ) : (
                          <>
                            <span>Enter Dashboard</span>
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Full-Width Bottom Action Bar for Text / Multi-Select Steps */}
          {step > 0 && step < 12 && ![1, 2, 5, 6, 8, 9].includes(step) && !(step === 10 && formData.usesAi !== 'Yes') && (
            <footer className="relative z-10 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shrink-0">
              <div className="max-w-2xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  Press Enter or click Continue when ready
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isNextDisabled()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-xs transition-all active:scale-95 disabled:active:scale-100 inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>{step === 11 ? 'Complete Setup' : 'Continue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
