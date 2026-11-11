import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, CheckCircle2, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userEmail?: string;
}

export interface OnboardingFormData {
  discovery: string;
  discoveryOther: string;
  status: string;
  statusOther: string;
  school: string;
  study: string;
  goal: string;
  goalOther: string;
  time: string;
  sources: string[];
  sourcesOther: string;
  device: string;
  challenge: string;
  challengeOther: string;
  usesAi: string;
  aiTools: string[];
  aiToolsOther: string;
  finalProblem: string;
}

const DEFAULT_FORM_DATA: OnboardingFormData = {
  discovery: '',
  discoveryOther: '',
  status: '',
  statusOther: '',
  school: '',
  study: '',
  goal: '',
  goalOther: '',
  time: '',
  sources: [],
  sourcesOther: '',
  device: '',
  challenge: '',
  challengeOther: '',
  usesAi: '',
  aiTools: [],
  aiToolsOther: '',
  finalProblem: ''
};

const TOTAL_STEPS = 11;

export function isOnboardingDataComplete(data?: Partial<OnboardingFormData> | null): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.discovery || !data.status) return false;
  if (['School Student', 'College / University Student'].includes(data.status) && !data.school?.trim()) {
    return false;
  }
  if (!data.study?.trim()) return false;
  if (!data.goal || !data.time) return false;
  if (!Array.isArray(data.sources) || data.sources.length === 0) return false;
  if (!data.device || !data.challenge || !data.usesAi) return false;
  if (data.usesAi === 'Yes' && (!Array.isArray(data.aiTools) || data.aiTools.length === 0)) return false;
  if (!data.finalProblem?.trim()) return false;
  return true;
}

export function getFirstUnansweredStep(data?: Partial<OnboardingFormData> | null): number {
  if (!data || typeof data !== 'object') return 1;
  if (!data.discovery) return 1;
  if (!data.status) return 2;
  if (['School Student', 'College / University Student'].includes(data.status) && !data.school?.trim()) {
    return 3;
  }
  if (!data.study?.trim()) return 4;
  if (!data.goal) return 5;
  if (!data.time) return 6;
  if (!Array.isArray(data.sources) || data.sources.length === 0) return 7;
  if (!data.device) return 8;
  if (!data.challenge) return 9;
  if (!data.usesAi || (data.usesAi === 'Yes' && (!Array.isArray(data.aiTools) || data.aiTools.length === 0))) {
    return 10;
  }
  if (!data.finalProblem?.trim()) return 11;
  return 12;
}

function hasAnyProgress(data?: Partial<OnboardingFormData> | null): boolean {
  if (!data || typeof data !== 'object') return false;
  return Boolean(
    data.discovery ||
      data.status ||
      data.school?.trim() ||
      data.study?.trim() ||
      data.goal ||
      data.time ||
      (Array.isArray(data.sources) && data.sources.length > 0) ||
      data.device ||
      data.challenge ||
      data.usesAi ||
      data.finalProblem?.trim()
  );
}

function loadInitialDraft(): { step: number; formData: OnboardingFormData } {
  if (typeof window === 'undefined') {
    return { step: 0, formData: { ...DEFAULT_FORM_DATA } };
  }
  const activeUid = localStorage.getItem('studyweb_active_user_id');
  const keysToTry = [
    activeUid ? `studyweb_onboarding_draft_${activeUid}` : null,
    'studyweb_onboarding_draft'
  ].filter(Boolean) as string[];

  for (const key of keysToTry) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const mergedData: OnboardingFormData = {
        ...DEFAULT_FORM_DATA,
        ...(parsed?.formData || {})
      };
      const firstUnanswered = getFirstUnansweredStep(mergedData);
      if (hasAnyProgress(mergedData)) {
        return {
          step: firstUnanswered,
          formData: mergedData
        };
      }
      if (typeof parsed?.step === 'number' && parsed.step > 0) {
        return {
          step: Math.min(TOTAL_STEPS, parsed.step),
          formData: mergedData
        };
      }
    } catch {}
  }

  return { step: 0, formData: { ...DEFAULT_FORM_DATA } };
}

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const initialDraft = loadInitialDraft();
  const [step, setStep] = useState<number>(initialDraft.step);
  const [formData, setFormData] = useState<OnboardingFormData>(initialDraft.formData);
  const [advancingKey, setAdvancingKey] = useState<string | null>(null);
  const [isSavingFinal, setIsSavingFinal] = useState(false);

  // Hydrate from remote Supabase user metadata or user-scoped localStorage if returning mid-onboarding
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    const hydrateRemoteDraft = async () => {
      try {
        // If local draft was explicitly cleared (e.g., fresh signup after account deletion), reset state to step 0
        const currentLocalDraft = localStorage.getItem('studyweb_onboarding_draft');
        if (!currentLocalDraft) {
          setStep(0);
          setFormData({ ...DEFAULT_FORM_DATA });
        }

        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user || isCancelled) return;

        if (user.user_metadata?.account_deleted === true) {
          setStep(0);
          setFormData({ ...DEFAULT_FORM_DATA });
          return;
        }

        const userDraftKey = `studyweb_onboarding_draft_${user.id}`;
        const localUserRaw = localStorage.getItem(userDraftKey);
        const remoteDraft = user.user_metadata?.onboarding_draft;

        let candidateData: Partial<OnboardingFormData> | null = null;
        if (localUserRaw) {
          try {
            const parsed = JSON.parse(localUserRaw);
            if (parsed?.formData && hasAnyProgress(parsed.formData)) {
              candidateData = parsed.formData;
            }
          } catch {}
        }
        if (!candidateData && remoteDraft?.formData && hasAnyProgress(remoteDraft.formData)) {
          candidateData = remoteDraft.formData;
        }

        if (candidateData && !isCancelled) {
          setFormData((prev) => {
            if (hasAnyProgress(prev)) return prev;
            const merged = { ...DEFAULT_FORM_DATA, ...candidateData };
            const resumeStep = getFirstUnansweredStep(merged);
            setStep(resumeStep);
            return merged;
          });
        }
      } catch {}
    };

    hydrateRemoteDraft();
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  // Persist draft locally (and user-scoped) on every change so closing & re-logging in resumes cleanly
  useEffect(() => {
    if (step <= TOTAL_STEPS) {
      const payload = JSON.stringify({ step, formData });
      localStorage.setItem('studyweb_onboarding_draft', payload);
      const activeUid = localStorage.getItem('studyweb_active_user_id');
      if (activeUid) {
        localStorage.setItem(`studyweb_onboarding_draft_${activeUid}`, payload);
      }
    }
  }, [step, formData]);

  // Also sync draft to Supabase user_metadata when step advances so returning on any session resumes
  useEffect(() => {
    if (!isOpen || step <= 0 || step > TOTAL_STEPS) return;
    const timer = setTimeout(async () => {
      try {
        if (supabase && hasAnyProgress(formData)) {
          await supabase.auth.updateUser({
            data: {
              onboarding_completed: false,
              onboarding_draft: { step, formData }
            }
          });
        }
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [isOpen, step, formData]);

  const updateForm = useCallback(<K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isNextDisabled = useCallback((): boolean => {
    switch (step) {
      case 1:
        return !formData.discovery;
      case 2:
        return !formData.status;
      case 3:
        return !formData.school.trim();
      case 4:
        return !formData.study.trim();
      case 5:
        return !formData.goal;
      case 6:
        return !formData.time;
      case 7:
        return formData.sources.length === 0;
      case 8:
        return !formData.device;
      case 9:
        return !formData.challenge;
      case 10:
        return !formData.usesAi || (formData.usesAi === 'Yes' && formData.aiTools.length === 0);
      case 11:
        return !formData.finalProblem.trim();
      default:
        return false;
    }
  }, [step, formData]);

  const handleNext = useCallback(() => {
    if (step > 0 && step <= TOTAL_STEPS && isNextDisabled()) return;

    if (step === 2) {
      if (['School Student', 'College / University Student'].includes(formData.status)) {
        setStep(3);
      } else {
        setStep(4);
      }
      return;
    }
    setStep((prev) => Math.min(12, prev + 1));
  }, [step, formData.status, isNextDisabled]);

  const handleBack = useCallback(() => {
    if (step === 4) {
      if (['School Student', 'College / University Student'].includes(formData.status)) {
        setStep(3);
      } else {
        setStep(2);
      }
      return;
    }
    setStep((prev) => Math.max(0, prev - 1));
  }, [step, formData.status]);

  // Single-choice selection: auto-advances smoothly unless "Other" or conditional sub-selection is chosen
  const handleOptionSelect = (key: keyof OnboardingFormData, value: string) => {
    if (advancingKey) return;
    updateForm(key, value as any);

    // If user selected "Other" or "Yes" on Step 10, let them see the inline input / sub-options and click Next
    if (value === 'Other' || (step === 10 && key === 'usesAi' && value === 'Yes')) {
      return;
    }

    const token = `${String(key)}:${value}`;
    setAdvancingKey(token);

    setTimeout(() => {
      setAdvancingKey(null);
      if (step === 2) {
        if (['School Student', 'College / University Student'].includes(value)) {
          setStep(3);
        } else {
          setStep(4);
        }
      } else {
        setStep((prev) => Math.min(12, prev + 1));
      }
    }, 240);
  };

  const renderRadioOption = (fieldKey: keyof OnboardingFormData, opt: string) => {
    const isSelected = formData[fieldKey] === opt;
    const isAdvancingThis = advancingKey === `${String(fieldKey)}:${opt}`;

    return (
      <button
        key={opt}
        type="button"
        onClick={() => handleOptionSelect(fieldKey, opt)}
        className={`w-full text-left flex items-center justify-between py-2.5 px-3 border rounded-xl cursor-pointer transition-all duration-150 ${
          isSelected
            ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-500/20 shadow-2xs ring-1 ring-indigo-500/30'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/70'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
              isSelected
                ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-500 text-white'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
          </div>
          <span
            className={`font-semibold text-fluid-xs truncate ${
              isSelected ? 'text-indigo-950 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {opt}
          </span>
        </div>

        {isAdvancingThis && (
          <Loader2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0 ml-1.5" />
        )}
      </button>
    );
  };

  const renderOtherInput = (
    selectedValue: string | string[],
    otherKey: keyof OnboardingFormData,
    placeholder: string
  ) => {
    const isOtherActive = Array.isArray(selectedValue)
      ? selectedValue.includes('Other')
      : selectedValue === 'Other';

    if (!isOtherActive) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        className="pt-1"
      >
        <input
          type="text"
          value={(formData[otherKey] as string) || ''}
          onChange={(e) => updateForm(otherKey, e.target.value as any)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isNextDisabled()) {
              e.preventDefault();
              handleNext();
            }
          }}
          placeholder={placeholder}
          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium text-fluid-xs placeholder:text-slate-400"
          autoFocus
        />
      </motion.div>
    );
  };

  const handleFinalizeOnboarding = async () => {
    setIsSavingFinal(true);

    const resolvedSchool = formData.school.trim();
    const resolvedStudy = formData.study.trim();
    const resolvedGoal =
      formData.goal === 'Other' && formData.goalOther.trim()
        ? formData.goalOther.trim()
        : formData.goal;
    const resolvedBio = formData.finalProblem.trim();

    if (resolvedSchool) localStorage.setItem('studyweb_profile_school', resolvedSchool);
    if (resolvedStudy) localStorage.setItem('studyweb_profile_class_board', resolvedStudy);
    if (resolvedBio) localStorage.setItem('studyweb_profile_bio', resolvedBio);
    if (resolvedGoal) localStorage.setItem('studyweb_profile_aim', resolvedGoal);

    let dailyMins = 60;
    if (formData.time.includes('Less than 1')) dailyMins = 30;
    if (formData.time.includes('1–2')) dailyMins = 90;
    if (formData.time.includes('2–4')) dailyMins = 180;
    if (formData.time.includes('4–6')) dailyMins = 300;
    if (formData.time.includes('More than 6')) dailyMins = 420;
    localStorage.setItem('studyweb_profile_daily_goal', dailyMins.toString());

    localStorage.setItem('studyweb_onboarding_data', JSON.stringify(formData));
    localStorage.setItem('studyweb_onboarding_complete', 'true');

    const activeUid = localStorage.getItem('studyweb_active_user_id');
    if (activeUid) {
      localStorage.setItem(`studyweb_onboarding_complete_${activeUid}`, 'true');
      localStorage.removeItem(`studyweb_onboarding_draft_${activeUid}`);
    }

    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const uid = session.user.id;
          localStorage.setItem(`studyweb_onboarding_complete_${uid}`, 'true');
          localStorage.removeItem(`studyweb_onboarding_draft_${uid}`);

          await Promise.allSettled([
            supabase.auth.updateUser({
              data: {
                account_deleted: false,
                deleted_at: null,
                onboarding_completed: true,
                onboarding_data: formData,
                onboarding_draft: null
              }
            }),
            supabase.from('profiles').upsert({
              id: uid,
              email: session.user.email || '',
              school_name: resolvedSchool,
              academic_institution: resolvedSchool,
              current_study: resolvedStudy,
              class_name: resolvedStudy,
              curriculum_board: resolvedStudy,
              target_aim: resolvedGoal,
              primary_goal: resolvedGoal,
              scholar_bio: resolvedBio,
              bio: resolvedBio,
              onboarding_data: formData,
              updated_at: new Date().toISOString()
            })
          ]);
        }
      } catch (err) {
        console.error('Failed to save onboarding data to Supabase:', err);
      }
    }

    localStorage.removeItem('studyweb_onboarding_draft');
    window.dispatchEvent(new Event('studyweb_profile_updated'));
    setIsSavingFinal(false);
    onComplete();
  };

  const progressPercentage = Math.min(100, Math.max(0, (step / TOTAL_STEPS) * 100));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] w-screen h-dvh bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none"
          role="dialog"
          aria-modal="true"
          aria-label="StudyWeb Personalization"
        >
          {/* Compact Centered Modal Card that fits cleanly without viewport scrolling */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative w-full max-w-[480px] max-h-[calc(100dvh-1.5rem)] bg-white dark:bg-[#0E1528] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-[0_24px_60px_-15px_rgba(15,23,42,0.55)] flex flex-col overflow-hidden"
          >
            {/* Top Progress Bar */}
            {step > 0 && step <= TOTAL_STEPS && (
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-800/90 overflow-hidden shrink-0">
                <motion.div
                  className="h-full bg-indigo-600 dark:bg-indigo-500"
                  initial={false}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                />
              </div>
            )}

            {/* Compact Card Header */}
            {step > 0 && step <= TOTAL_STEPS && (
              <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo-inner.png"
                    alt="StudyWeb"
                    className="w-5 h-5 object-contain select-none shrink-0"
                  />
                  <span className="text-fluid-2xs font-bold text-slate-600 dark:text-slate-300">
                    StudyWeb Setup
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-fluid-2xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  <span>Question {step} of {TOTAL_STEPS}</span>
                </div>
              </div>
            )}

            {/* Question Body */}
            <div className="px-4 sm:px-5 py-3.5 sm:py-4 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full"
                >
                  {/* STEP 0: WELCOME INTRO */}
                  {step === 0 && (
                    <div className="text-center py-4 sm:py-5 flex flex-col items-center justify-center space-y-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 flex items-center justify-center">
                        <img
                          src="/logo-inner.png"
                          alt="StudyWeb Logo"
                          className="w-7 h-7 object-contain select-none shrink-0"
                        />
                      </div>
                      <div className="space-y-1.5 max-w-sm mx-auto">
                        <h1 className="text-fluid-title font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Welcome to StudyWeb
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-fluid-xs leading-relaxed">
                          Answer 11 quick questions to unlock your workspace, study planner, and personalized AI Tutor.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-fluid-xs shadow-xs transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer"
                      >
                        <span>Start Quick Setup</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* STEP 1: DISCOVERY */}
                  {step === 1 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          How did you hear about StudyWeb?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          Choose an option to continue.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'YouTube',
                          'Friend / Classmate',
                          'Instagram',
                          'Twitter / X',
                          'LinkedIn',
                          'Google Search',
                          'Reddit',
                          'School / College',
                          'Other'
                        ].map((opt) => renderRadioOption('discovery', opt))}
                      </div>
                      {renderOtherInput(
                        formData.discovery,
                        'discoveryOther',
                        'Tell us where you heard about StudyWeb (optional)...'
                      )}
                    </div>
                  )}

                  {/* STEP 2: ACADEMIC STATUS */}
                  {step === 2 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Which best describes you?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          We adapt explanations to your academic stage.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'School Student',
                          'College / University Student',
                          'Self Learner',
                          'Working Professional',
                          'Teacher / Educator',
                          'Other'
                        ].map((opt) => renderRadioOption('status', opt))}
                      </div>
                      {renderOtherInput(formData.status, 'statusOther', 'Describe your current role...')}
                    </div>
                  )}

                  {/* STEP 3: SCHOOL / COLLEGE */}
                  {step === 3 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          What is your school or college name?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          Enter your school, college, or university.
                        </p>
                      </div>
                      <input
                        type="text"
                        value={formData.school}
                        onChange={(e) => updateForm('school', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isNextDisabled()) {
                            e.preventDefault();
                            handleNext();
                          }
                        }}
                        placeholder="e.g., Delhi Public School, IIT Bombay, Stanford"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-medium text-fluid-sm placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* STEP 4: CURRENT STUDY */}
                  {step === 4 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          What are you currently studying?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          Enter your grade, major, exam, or primary subject.
                        </p>
                      </div>
                      <input
                        type="text"
                        value={formData.study}
                        onChange={(e) => updateForm('study', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isNextDisabled()) {
                            e.preventDefault();
                            handleNext();
                          }
                        }}
                        placeholder="e.g., Class 12 Science, B.Tech CSE, MBBS, UPSC"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-medium text-fluid-sm placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* STEP 5: LEARNING GOAL */}
                  {step === 5 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          What is your biggest learning goal right now?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          Select your primary target.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'Crack JEE',
                          'Crack NEET',
                          'UPSC Preparation',
                          'Learn Web Development',
                          'Learn AI',
                          'Learn Programming',
                          'Improve English',
                          'Get Better Grades',
                          'Get a Job',
                          'Other'
                        ].map((opt) => renderRadioOption('goal', opt))}
                      </div>
                      {renderOtherInput(formData.goal, 'goalOther', 'Enter your specific learning goal...')}
                    </div>
                  )}

                  {/* STEP 6: DAILY STUDY HOURS */}
                  {step === 6 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          How many hours do you study daily?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          Sets your daily streak target.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          'Less than 1 hour',
                          '1–2 hours',
                          '2–4 hours',
                          '4–6 hours',
                          'More than 6 hours'
                        ].map((opt) => renderRadioOption('time', opt))}
                      </div>
                    </div>
                  )}

                  {/* STEP 7: LEARNING SOURCES (MULTI-SELECT) */}
                  {step === 7 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Where do you usually learn?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          Select one or more options, then click Next.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'YouTube',
                          'ChatGPT',
                          'Google',
                          'Books',
                          'Online Courses',
                          'School / College',
                          'Coaching Institute',
                          'Friends',
                          'Other'
                        ].map((opt) => {
                          const isSelected = formData.sources.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                const newSources = isSelected
                                  ? formData.sources.filter((s) => s !== opt)
                                  : [...formData.sources, opt];
                                updateForm('sources', newSources);
                              }}
                              className={`flex items-center py-2.5 px-3 border rounded-xl cursor-pointer transition-all text-left ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-500/20 shadow-2xs ring-1 ring-indigo-500/30'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-indigo-300 dark:hover:border-indigo-700'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 shrink-0 rounded-md border flex items-center justify-center mr-2.5 transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                              </div>
                              <span
                                className={`font-semibold text-fluid-xs truncate ${
                                  isSelected
                                    ? 'text-indigo-950 dark:text-indigo-100'
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {opt}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {renderOtherInput(
                        formData.sources,
                        'sourcesOther',
                        'Other learning source (optional)...'
                      )}
                    </div>
                  )}

                  {/* STEP 8: DEVICE */}
                  {step === 8 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Which device do you use most for studying?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          Optimizes your workspace layout.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {['Phone', 'Laptop', 'Tablet', 'Desktop'].map((opt) =>
                          renderRadioOption('device', opt)
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 9: STUDY CHALLENGE */}
                  {step === 9 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          What is your biggest challenge while studying?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          Helps us prioritize your study tools.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
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
                      {renderOtherInput(
                        formData.challenge,
                        'challengeOther',
                        'Describe your challenge (optional)...'
                      )}
                    </div>
                  )}

                  {/* STEP 10: AI USAGE */}
                  {step === 10 && (
                    <div className="space-y-3.5">
                      <div className="space-y-2">
                        <div className="space-y-0.5">
                          <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Do you currently use AI for studying?
                          </h2>
                          <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                            Select Yes or No.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {['Yes', 'No'].map((opt) => renderRadioOption('usesAi', opt))}
                        </div>
                      </div>

                      {formData.usesAi === 'Yes' && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800"
                        >
                          <div className="space-y-0.5">
                            <h3 className="text-fluid-sm font-extrabold text-slate-900 dark:text-white">
                              Which AI tools do you use?
                            </h3>
                            <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                              Select all that apply, then click Next.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              'ChatGPT',
                              'Gemini',
                              'Claude',
                              'Perplexity',
                              'Microsoft Copilot',
                              'Other'
                            ].map((opt) => {
                              const isSelected = formData.aiTools.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    const newTools = isSelected
                                      ? formData.aiTools.filter((t) => t !== opt)
                                      : [...formData.aiTools, opt];
                                    updateForm('aiTools', newTools);
                                  }}
                                  className={`flex items-center py-2 px-3 border rounded-xl cursor-pointer transition-all text-left ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-500/20 shadow-2xs ring-1 ring-indigo-500/30'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-indigo-300 dark:hover:border-indigo-700'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 shrink-0 rounded-md border flex items-center justify-center mr-2 transition-colors ${
                                      isSelected
                                        ? 'bg-indigo-600 border-indigo-600'
                                        : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                  </div>
                                  <span
                                    className={`font-semibold text-fluid-xs truncate ${
                                      isSelected
                                        ? 'text-indigo-950 dark:text-indigo-100'
                                        : 'text-slate-700 dark:text-slate-200'
                                    }`}
                                  >
                                    {opt}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {renderOtherInput(
                            formData.aiTools,
                            'aiToolsOther',
                            'Which other AI tool do you use?'
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* STEP 11: FINAL PROBLEM */}
                  {step === 11 && (
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <h2 className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          If StudyWeb could solve one learning problem for you, what would it be?
                        </h2>
                        <p className="text-fluid-2xs text-slate-500 dark:text-slate-400">
                          Write a short note to complete your profile setup.
                        </p>
                      </div>
                      <div className="relative">
                        <textarea
                          value={formData.finalProblem}
                          onChange={(e) => {
                            if (e.target.value.length <= 300) {
                              updateForm('finalProblem', e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isNextDisabled()) {
                              e.preventDefault();
                              handleNext();
                            }
                          }}
                          placeholder="Tell us what is stopping you from learning effectively..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-medium text-fluid-xs placeholder:text-slate-400 min-h-[104px] resize-none"
                          autoFocus
                        />
                        <div className="absolute bottom-2.5 right-3 text-fluid-2xs font-bold text-slate-400 tabular-nums">
                          {formData.finalProblem.length}/300
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 12: COMPLETION */}
                  {step === 12 && (
                    <div className="text-center py-4 sm:py-5 flex flex-col items-center justify-center space-y-3.5">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-200/70 dark:border-emerald-500/20">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', bounce: 0.45 }}
                        >
                          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                        </motion.div>
                      </div>
                      <div className="space-y-1 max-w-sm mx-auto">
                        <h2 className="text-fluid-title font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Your Workspace Is Ready
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-fluid-xs leading-relaxed">
                          Your academic profile, daily study goal, and AI Tutor preferences are configured.
                        </p>
                      </div>
                      <div className="pt-1 flex items-center gap-2 w-full max-w-xs">
                        <button
                          type="button"
                          onClick={handleBack}
                          disabled={isSavingFinal}
                          className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-fluid-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingFinal}
                          onClick={handleFinalizeOnboarding}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 px-5 rounded-xl font-bold text-fluid-xs shadow-xs transition-all active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSavingFinal ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Entering...</span>
                            </>
                          ) : (
                            <>
                              <span>Enter StudyWeb</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Universal Built-In Card Footer on All Question Steps (1 to 11) */}
            {step > 0 && step <= TOTAL_STEPS && (
              <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleBack}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-fluid-2xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isNextDisabled()}
                  className="py-1.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white text-fluid-2xs font-bold shadow-2xs transition-all active:scale-95 disabled:active:scale-100 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{step === TOTAL_STEPS ? 'Complete Setup' : 'Next'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
