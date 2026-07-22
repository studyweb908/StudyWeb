import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'age', title: 'Age' },
  { id: 'status', title: 'Current Status' },
  { id: 'school', title: 'School / College' },
  { id: 'study', title: 'Current Study' },
  { id: 'goal', title: 'Learning Goal' },
  { id: 'time', title: 'Daily Study Time' },
  { id: 'sources', title: 'Learning Sources' },
  { id: 'device', title: 'Primary Device' },
  { id: 'challenge', title: 'Biggest Challenge' },
  { id: 'ai', title: 'AI Usage' },
  { id: 'final', title: 'Final Question' }
];

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0); // 0 is Welcome, 12 is Completion Screen

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('studyweb_onboarding_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {}
    }
    return {
      age: '',
      status: '',
      school: '',
      study: '',
      goal: '',
      time: '',
      sources: [] as string[],
      device: '',
      challenge: '',
      usesAi: '',
      aiTools: [] as string[],
      finalProblem: ''
    };
  });

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('studyweb_onboarding_draft', JSON.stringify(formData));
  }, [formData]);

  const updateForm = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const isNextDisabled = () => {
    switch (step) {
      case 1: return !formData.age;
      case 2: return !formData.status;
      case 3: 
        if (formData.status === 'Working Professional') return false;
        return !formData.school.trim();
      case 4: return !formData.study.trim();
      case 5: return !formData.goal;
      case 6: return !formData.time;
      case 7: return formData.sources.length === 0;
      case 8: return !formData.device;
      case 9: return !formData.challenge;
      case 10: 
        if (!formData.usesAi) return true;
        if (formData.usesAi === 'Yes' && formData.aiTools.length === 0) return true;
        return false;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 12) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
      >
        {/* Header / Progress */}
        {step > 0 && step < 12 && (
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 px-6">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 11) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-center text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
                Step {step} of 11
              </p>
            </div>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {step === 0 && (
                <div className="text-center py-10 flex flex-col items-center justify-center h-full space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 mb-4 shadow-xl shadow-indigo-500/5">
                    <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      👋 Welcome to StudyWeb
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
                      Let's personalize your learning journey. This will only take about a minute.
                    </p>
                  </div>
                  <button
                    onClick={handleNext}
                    className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">How old are you?</h3>
                  </div>
                  <div className="grid gap-3">
                    {['Under 13', '13–15', '16–18', '19–22', '23–30', '30+'].map(opt => (
                      <label key={opt} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${formData.age === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                        <input type="radio" name="age" className="hidden" value={opt} checked={formData.age === opt} onChange={() => updateForm('age', opt)} />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${formData.age === opt ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                          {formData.age === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                        </div>
                        <span className={`font-semibold ${formData.age === opt ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">What are you currently?</h3>
                  </div>
                  <div className="grid gap-3">
                    {['School Student', 'College Student', 'Preparing for Competitive Exams', 'Working Professional', 'Other'].map(opt => (
                      <label key={opt} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${formData.status === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                        <input type="radio" name="status" className="hidden" value={opt} checked={formData.status === opt} onChange={() => updateForm('status', opt)} />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${formData.status === opt ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                          {formData.status === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                        </div>
                        <span className={`font-semibold ${formData.status === opt ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Which school, college, or university do you attend?</h3>
                    {formData.status === 'Working Professional' && (
                      <p className="text-sm font-medium text-slate-500">(Optional for Working Professionals)</p>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => updateForm('school', e.target.value)}
                    placeholder="Enter your school, college, or university name"
                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-medium text-lg placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">What are you currently studying?</h3>
                  </div>
                  <input
                    type="text"
                    value={formData.study}
                    onChange={(e) => updateForm('study', e.target.value)}
                    placeholder="Example: Class 12 Science, B.Tech CSE, MBBS, Web Development, UPSC"
                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-medium text-lg placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">What is your biggest learning goal right now?</h3>
                  </div>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {['Crack JEE', 'Crack NEET', 'UPSC Preparation', 'Learn Web Development', 'Learn AI', 'Learn Programming', 'Improve English', 'Get Better Grades', 'Get a Job', 'Other'].map(opt => (
                      <label key={opt} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${formData.goal === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                        <input type="radio" name="goal" className="hidden" value={opt} checked={formData.goal === opt} onChange={() => updateForm('goal', opt)} />
                        <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center mr-3 ${formData.goal === opt ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                          {formData.goal === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                        </div>
                        <span className={`font-semibold text-sm ${formData.goal === opt ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">How many hours do you study on average each day?</h3>
                  </div>
                  <div className="grid gap-3">
                    {['Less than 1 hour', '1–2 hours', '2–4 hours', '4–6 hours', 'More than 6 hours'].map(opt => (
                      <label key={opt} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${formData.time === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                        <input type="radio" name="time" className="hidden" value={opt} checked={formData.time === opt} onChange={() => updateForm('time', opt)} />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${formData.time === opt ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                          {formData.time === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                        </div>
                        <span className={`font-semibold ${formData.time === opt ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Where do you usually learn?</h3>
                    <p className="text-slate-500">Choose all that apply.</p>
                  </div>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {['YouTube', 'ChatGPT', 'Google', 'Books', 'Online Courses', 'School / College', 'Coaching Institute', 'Friends', 'Other'].map(opt => {
                      const isSelected = formData.sources.includes(opt);
                      return (
                        <label key={opt} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
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
                          <div className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </div>
                          <span className={`font-semibold text-sm ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 8 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Which device do you use most for studying?</h3>
                  </div>
                  <div className="grid gap-3">
                    {['Phone', 'Laptop', 'Tablet', 'Desktop'].map(opt => (
                      <label key={opt} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${formData.device === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                        <input type="radio" name="device" className="hidden" value={opt} checked={formData.device === opt} onChange={() => updateForm('device', opt)} />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${formData.device === opt ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                          {formData.device === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                        </div>
                        <span className={`font-semibold ${formData.device === opt ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === 9 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">What is your biggest challenge while studying?</h3>
                  </div>
                  <div className="grid gap-3">
                    {["I don't know what to study.", 'Too many resources.', 'I get distracted.', 'I procrastinate.', 'I forget what I learn.', 'I struggle to stay consistent.', "I don't have enough time.", 'Other'].map(opt => (
                      <label key={opt} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${formData.challenge === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                        <input type="radio" name="challenge" className="hidden" value={opt} checked={formData.challenge === opt} onChange={() => updateForm('challenge', opt)} />
                        <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center mr-3 ${formData.challenge === opt ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                          {formData.challenge === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                        </div>
                        <span className={`font-semibold text-sm ${formData.challenge === opt ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === 10 && (
                <div className="space-y-8 max-w-md mx-auto w-full">
                  <div className="space-y-6">
                    <div className="space-y-2 text-center">
                      <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Do you currently use AI for studying?</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map(opt => (
                        <label key={opt} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${formData.usesAi === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                          <input type="radio" name="usesAi" className="hidden" value={opt} checked={formData.usesAi === opt} onChange={() => updateForm('usesAi', opt)} />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${formData.usesAi === opt ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                            {formData.usesAi === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                          </div>
                          <span className={`font-semibold ${formData.usesAi === opt ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.usesAi === 'Yes' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="space-y-2 text-center">
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Which AI tools do you use?</h3>
                      </div>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        {['ChatGPT', 'Gemini', 'Claude', 'Perplexity', 'Microsoft Copilot', 'Other'].map(opt => {
                          const isSelected = formData.aiTools.includes(opt);
                          return (
                            <label key={opt} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
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
                              <div className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                              </div>
                              <span className={`font-semibold text-sm ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {step === 11 && (
                <div className="space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">If StudyWeb could solve just one learning problem for you, what would it be?</h3>
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
                      className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-medium text-base placeholder:text-slate-400 min-h-[160px] resize-none"
                      autoFocus
                    />
                    <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400">
                      {formData.finalProblem.length}/300
                    </div>
                  </div>
                </div>
              )}

              {step === 12 && (
                <div className="text-center py-10 flex flex-col items-center justify-center h-full space-y-6">
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 mb-4 shadow-xl shadow-emerald-500/5 relative overflow-hidden">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                    >
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </motion.div>
                  </div>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      🎉 You're all set!
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
                      Thanks for helping us personalize your StudyWeb experience.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('studyweb_onboarding_draft');
                      onComplete();
                    }}
                    className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    Start Learning
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        {step > 0 && step < 12 && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end">
            <button
              onClick={handleNext}
              disabled={isNextDisabled()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-indigo-600/10 transition-all active:scale-95 disabled:active:scale-100 flex items-center gap-2"
            >
              {step === 11 ? 'Finish' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
