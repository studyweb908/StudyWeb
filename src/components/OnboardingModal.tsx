import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  BookOpen, 
  Target, 
  Heart, 
  HelpCircle,
  Share2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Check,
  Loader2
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const REASON_OPTIONS = [
  "Better grades",
  "Stay organized",
  "Save time on studying",
  "Prepare for exams",
  "Other"
];

const SOURCE_OPTIONS = [
  "TikTok",
  "Instagram",
  "Friend / Classmate",
  "Google Search",
  "YouTube",
  "Other"
];

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    school: '',
    location: '',
    classLevel: '',
    goals: '',
    interests: '',
    reason: '',
    source: ''
  });

  const [schoolSuggestions, setSchoolSuggestions] = useState<string[]>([]);
  const [isFetchingSchools, setIsFetchingSchools] = useState(false);
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSchoolSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mock API call to fetch schools
  useEffect(() => {
    if (step !== 1) return;

    const query = formData.school.trim();
    if (query.length < 2) {
      setSchoolSuggestions([]);
      setShowSchoolSuggestions(false);
      return;
    }

    const fetchSchools = async () => {
      setIsFetchingSchools(true);
      setShowSchoolSuggestions(true);
      
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 600));

      const mockDatabase = [
        "Stanford University",
        "Harvard University",
        "Massachusetts Institute of Technology (MIT)",
        "University of California, Berkeley (UCB)",
        "University of Oxford",
        "University of Cambridge",
        "California Institute of Technology (Caltech)",
        "Princeton University",
        "Yale University",
        "Columbia University",
        "University of Chicago",
        "University of Pennsylvania",
        "Cornell University",
        "University of Michigan",
        "Johns Hopkins University",
        "University of Toronto",
        "University of Washington",
        "Duke University",
        "New York University (NYU)",
        "Northwestern University"
      ];

      const filtered = mockDatabase.filter(school => 
        school.toLowerCase().includes(query.toLowerCase())
      );
      
      // Only show suggestions if there isn't an exact match
      if (filtered.length === 1 && filtered[0].toLowerCase() === query.toLowerCase()) {
        setSchoolSuggestions([]);
        setShowSchoolSuggestions(false);
      } else {
        setSchoolSuggestions(filtered);
      }
      setIsFetchingSchools(false);
    };

    const timeoutId = setTimeout(fetchSchools, 400); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.school, step]);

  const updateForm = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStepValid = () => {
    if (step === 1) return formData.school.trim() !== '' && formData.location.trim() !== '';
    if (step === 2) return formData.classLevel.trim() !== '' && formData.goals.trim() !== '';
    if (step === 3) return formData.interests.trim() !== '' && formData.reason !== '';
    if (step === 4) return formData.source !== '';
    return false;
  };

  const handleNext = () => {
    if (!isStepValid()) return;
    
    if (step < totalSteps) {
      setStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    // Save info to local storage
    localStorage.setItem('studyweb_profile_school', formData.school);
    localStorage.setItem('studyweb_profile_location', formData.location);
    localStorage.setItem('studyweb_profile_class_board', formData.classLevel);
    localStorage.setItem('studyweb_profile_goals', formData.goals);
    localStorage.setItem('studyweb_profile_interests', formData.interests);
    localStorage.setItem('studyweb_profile_reason', formData.reason);
    localStorage.setItem('studyweb_profile_source', formData.source);
    
    // Mark onboarding complete
    localStorage.setItem('studyweb_onboarding_complete', 'true');
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 sm:p-8 w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800">
          <motion.div 
            className="h-full bg-brand-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="text-center mb-6 pt-2">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Let's personalize your workspace</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Just a few questions to tailor your experience.</p>
        </div>

        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1.5 relative" ref={suggestionsRef}>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Where are you learning? <span className="text-rose-500">*</span></label>
                  <div className="relative text-slate-400 focus-within:text-brand-primary">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. Stanford University"
                      value={formData.school}
                      onChange={(e) => updateForm('school', e.target.value)}
                      onFocus={() => {
                        if (formData.school.trim().length >= 2) {
                          setShowSchoolSuggestions(true);
                        }
                      }}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                    {isFetchingSchools && (
                      <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-primary" />
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  <AnimatePresence>
                    {showSchoolSuggestions && formData.school.trim().length >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-[60] max-h-48 overflow-y-auto"
                      >
                        {isFetchingSchools && schoolSuggestions.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            Searching schools...
                          </div>
                        ) : schoolSuggestions.length > 0 ? (
                          <ul className="py-1">
                            {schoolSuggestions.map((school, index) => (
                              <li key={index}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateForm('school', school);
                                    setShowSchoolSuggestions(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-brand-primary dark:hover:text-brand-primary transition-colors focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700/50"
                                >
                                  {school}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            No matching schools found.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Where are you from? <span className="text-rose-500">*</span></label>
                  <div className="relative text-slate-400 focus-within:text-brand-primary">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. San Francisco, CA"
                      value={formData.location}
                      onChange={(e) => updateForm('location', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Which class/grade are you in? <span className="text-rose-500">*</span></label>
                  <div className="relative text-slate-400 focus-within:text-brand-primary">
                    <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. AP Computer Science"
                      value={formData.classLevel}
                      onChange={(e) => updateForm('classLevel', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">What are your academic goals? <span className="text-rose-500">*</span></label>
                  <div className="relative text-slate-400 focus-within:text-brand-primary">
                    <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. Ace finals, Learn to code"
                      value={formData.goals}
                      onChange={(e) => updateForm('goals', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">What things do you like? (Interests) <span className="text-rose-500">*</span></label>
                  <div className="relative text-slate-400 focus-within:text-brand-primary">
                    <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. Science, Music, Gaming"
                      value={formData.interests}
                      onChange={(e) => updateForm('interests', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Why did you choose StudyWeb? <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {REASON_OPTIONS.map(reason => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => updateForm('reason', reason)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          formData.reason === reason 
                            ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20' 
                            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-brand-primary/50'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5" />
                    Where did you hear about us? <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SOURCE_OPTIONS.map(source => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => updateForm('source', source)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          formData.source === source 
                            ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20' 
                            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-brand-primary/50'
                        }`}
                      >
                        {source}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="bg-brand-primary/10 rounded-xl p-4 mt-6">
                  <p className="text-xs text-brand-primary font-semibold text-center">
                    All set! We'll use this to optimize your study experience.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 pt-6 mt-2">
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid()}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer ${
                isStepValid() 
                  ? 'bg-brand-primary hover:bg-brand-secondary text-white shadow-lg shadow-brand-primary/10 hover:shadow-xl hover:shadow-brand-secondary/25' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              {step < totalSteps ? (
                <>
                  Continue
                  <ArrowRight className={`w-4 h-4 ${isStepValid() ? 'group-hover:translate-x-1 transition-transform' : ''}`} />
                </>
              ) : (
                <>
                  Enter Dashboard
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
