import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Compass,
  Folder,
  FileUp,
  Sparkles,
  LayoutDashboard,
  X
} from 'lucide-react';
import { ProductTourService } from '../../services/ProductTourService';
import { playGlassPopSound } from '../../utils/soundEffects';

export interface GuidedProductTourProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoggedIn: boolean;
  showOnboarding: boolean;
}

type TourStage = 'idle' | 'welcome' | 'walkthrough';

interface WalkthroughStepConfig {
  stepNumber: number; // 1 to 5
  id: string;
  title: string;
  description: string;
  selectors: string[];
  requiredTab?: string;
  preferredPlacement?: 'bottom' | 'right' | 'top' | 'left' | 'center';
  icon: React.ReactNode;
}

const TOTAL_WALKTHROUGH_STEPS = 5;

const TOUR_STEPS: WalkthroughStepConfig[] = [
  {
    stepNumber: 1,
    id: 'dashboard',
    title: 'Dashboard',
    description: 'This is your StudyWeb dashboard. Your learning tools are accessible from here.',
    selectors: ['[data-tour="dashboard-overview"]', '[data-tour="nav-dashboard"]'],
    requiredTab: 'dashboard',
    preferredPlacement: 'bottom',
    icon: <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
  },
  {
    stepNumber: 2,
    id: 'workspace',
    title: 'Workspace',
    description: 'Your personal study space. Organize your learning materials and keep everything together.',
    selectors: ['[data-tour="nav-workspaces"]', '[data-tour="home-workspaces-btn"]'],
    requiredTab: 'dashboard',
    preferredPlacement: 'right',
    icon: <Folder className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
  },
  {
    stepNumber: 3,
    id: 'upload-documents',
    title: 'Upload documents',
    description: 'Upload your study materials, PDFs and notes to get started.',
    selectors: ['[data-tour="upload-documents"]'],
    requiredTab: 'dashboard',
    preferredPlacement: 'top',
    icon: <FileUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
  },
  {
    stepNumber: 4,
    id: 'ai-tutor',
    title: 'AI Tutor',
    description: 'Meet your personal AI Tutor. Ask questions, understand difficult concepts and get help with your studies.',
    selectors: [
      '[data-tour="nav-ai-tutor"]',
      '[data-tour="header-ai-tutor-btn"]',
      '[data-tour="home-ai-tutor-btn"]'
    ],
    requiredTab: 'dashboard',
    preferredPlacement: 'right',
    icon: <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
  },
  {
    stepNumber: 5,
    id: 'completion',
    title: "You're all set!",
    description: "You're all set! Your StudyWeb journey begins now.",
    selectors: [],
    preferredPlacement: 'center',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
  }
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Finds the first visible DOM element matching any of the candidate CSS selectors.
 */
function findVisibleElement(selectors: string[]): HTMLElement | null {
  if (typeof document === 'undefined' || !selectors.length) return null;

  for (const selector of selectors) {
    const nodes = document.querySelectorAll<HTMLElement>(selector);
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (
        rect.width > 8 &&
        rect.height > 8 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        parseFloat(style.opacity || '1') > 0.05 &&
        rect.right > 0 &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth
      ) {
        return el;
      }
    }
  }
  return null;
}

export default function GuidedProductTour({
  activeTab,
  setActiveTab,
  isLoggedIn,
  showOnboarding
}: GuidedProductTourProps) {
  const [stage, setStage] = useState<TourStage>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0); // 0..4 (Step 1..5)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isCompletionStep = activeStep.stepNumber === TOTAL_WALKTHROUGH_STEPS;

  // Measure and scroll target element into view
  const measureActiveTarget = useCallback(
    (shouldScroll = false) => {
      if (typeof window === 'undefined') return;
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });

      if (stage !== 'walkthrough') {
        setTargetRect(null);
        return;
      }

      const step = TOUR_STEPS[currentStepIndex];
      if (!step || step.selectors.length === 0) {
        setTargetRect(null);
        return;
      }

      const el = findVisibleElement(step.selectors);
      if (!el) {
        setTargetRect(null);
        return;
      }

      const initialRect = el.getBoundingClientRect();
      const isOutOfViewport =
        initialRect.top < 72 ||
        initialRect.bottom > window.innerHeight - 72;

      if (shouldScroll && isOutOfViewport) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch {}
      }

      const rect = el.getBoundingClientRect();
      const pad = 6;
      setTargetRect({
        top: Math.max(4, rect.top - pad),
        left: Math.max(4, rect.left - pad),
        width: Math.min(window.innerWidth - 8, rect.width + pad * 2),
        height: Math.min(window.innerHeight - 8, rect.height + pad * 2)
      });
    },
    [stage, currentStepIndex]
  );

  // Check if newly registered user has a pending tour once initial onboarding modal finishes
  useEffect(() => {
    if (!isLoggedIn || showOnboarding) return;

    let isCancelled = false;

    const evaluateAutoStart = async () => {
      const localState = ProductTourService.getLocalTourState();
      if (localState.status === 'completed' || localState.status === 'skipped') {
        ProductTourService.clearNewUserTourPending();
        return;
      }

      const remoteState = await ProductTourService.reconcileRemoteTourStatus();
      if (isCancelled) return;

      if (remoteState.status === 'completed' || remoteState.status === 'skipped') {
        ProductTourService.clearNewUserTourPending();
        return;
      }

      if (ProductTourService.hasNewUserTourPending()) {
        setActiveTab('dashboard');
        setCurrentStepIndex(0);
        setStage('welcome');
      }
    };

    evaluateAutoStart();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, showOnboarding, setActiveTab]);

  // Listen for manual "Start / Restart Tour" events from Header or Profile Settings
  useEffect(() => {
    const handleManualStartTour = () => {
      setActiveTab('dashboard');
      setCurrentStepIndex(0);
      setStage('welcome');
      try {
        playGlassPopSound();
      } catch {}
    };

    window.addEventListener('studyweb-start-product-tour', handleManualStartTour);
    return () => {
      window.removeEventListener('studyweb-start-product-tour', handleManualStartTour);
    };
  }, [setActiveTab]);

  // Ensure required route/tab is active when stepping through walkthrough
  useEffect(() => {
    if (stage !== 'walkthrough') return;

    const step = TOUR_STEPS[currentStepIndex];
    if (!step) return;

    // For Step 3 (Upload documents), if the user is already in 'workspaces' and an upload button is visible, keep them there; otherwise ensure 'dashboard' is shown
    if (step.requiredTab && activeTab !== step.requiredTab) {
      const alreadyHasVisibleTarget = findVisibleElement(step.selectors) !== null;
      if (!alreadyHasVisibleTarget) {
        setActiveTab(step.requiredTab);
      }
    }

    // Measure immediately and again after layout/animation settles
    measureActiveTarget(true);
    const t1 = window.setTimeout(() => measureActiveTarget(true), 140);
    const t2 = window.setTimeout(() => measureActiveTarget(false), 360);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [stage, currentStepIndex, activeTab, setActiveTab, measureActiveTarget]);

  // Passive resize and scroll listeners while walkthrough is active
  useEffect(() => {
    if (stage !== 'walkthrough') return;

    let rafId: number | null = null;
    const handleViewportUpdate = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        measureActiveTarget(false);
      });
    };

    window.addEventListener('resize', handleViewportUpdate, { passive: true });
    window.addEventListener('scroll', handleViewportUpdate, { passive: true, capture: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportUpdate);
      window.removeEventListener('scroll', handleViewportUpdate, true);
    };
  }, [stage, measureActiveTarget]);

  const handleStartWalkthrough = useCallback(() => {
    try {
      playGlassPopSound();
    } catch {}
    if (activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    }
    setCurrentStepIndex(0);
    setStage('walkthrough');
  }, [activeTab, setActiveTab]);

  const handleSkipTour = useCallback(async () => {
    const stepReached = stage === 'welcome' ? 0 : currentStepIndex + 1;
    setStage('idle');
    setTargetRect(null);
    await ProductTourService.saveTourStatus('skipped', stepReached);
  }, [stage, currentStepIndex]);

  const handleCompleteTour = useCallback(async () => {
    try {
      playGlassPopSound();
    } catch {}
    setStage('idle');
    setTargetRect(null);
    await ProductTourService.saveTourStatus('completed', TOTAL_WALKTHROUGH_STEPS);
  }, []);

  const handleNextStep = useCallback(() => {
    try {
      playGlassPopSound();
    } catch {}
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleCompleteTour();
    }
  }, [currentStepIndex, handleCompleteTour]);

  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      setStage('welcome');
    }
  }, [currentStepIndex]);

  // Keyboard navigation support
  useEffect(() => {
    if (stage === 'idle') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkipTour();
      } else if (stage === 'welcome' && e.key === 'Enter') {
        e.preventDefault();
        handleStartWalkthrough();
      } else if (stage === 'walkthrough') {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
          e.preventDefault();
          if (isCompletionStep) {
            handleCompleteTour();
          } else {
            handleNextStep();
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    stage,
    isCompletionStep,
    handleSkipTour,
    handleStartWalkthrough,
    handleNextStep,
    handlePrevStep,
    handleCompleteTour
  ]);

  if (stage === 'idle') return null;

  // Compute responsive tooltip position for steps 1–4
  const getTooltipPositionStyle = (): React.CSSProperties => {
    const isMobile = viewportSize.w < 640;
    const cardWidth = isMobile ? Math.min(viewportSize.w - 24, 360) : 380;
    const estimatedCardHeight = 250;
    const margin = 14;

    if (!targetRect || isCompletionStep) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${cardWidth}px`,
        maxWidth: 'calc(100vw - 24px)'
      };
    }

    if (isMobile) {
      // On mobile screens, place tooltip cleanly below or above the spotlighted element
      const spaceBelow = viewportSize.h - (targetRect.top + targetRect.height);
      const placeBelow = spaceBelow >= estimatedCardHeight + 20 || targetRect.top < viewportSize.h / 2;
      const rawTop = placeBelow
        ? targetRect.top + targetRect.height + margin
        : Math.max(12, targetRect.top - estimatedCardHeight - margin);
      const clampedTop = Math.max(
        12,
        Math.min(viewportSize.h - estimatedCardHeight - 16, rawTop)
      );

      return {
        position: 'fixed',
        top: `${clampedTop}px`,
        left: `${Math.max(12, (viewportSize.w - cardWidth) / 2)}px`,
        width: `${cardWidth}px`,
        maxWidth: 'calc(100vw - 24px)'
      };
    }

    // Desktop positioning logic
    const preferred = activeStep.preferredPlacement || 'bottom';
    let top = targetRect.top + targetRect.height + margin;
    let left = targetRect.left;

    if (preferred === 'right') {
      const candidateLeft = targetRect.left + targetRect.width + margin;
      if (candidateLeft + cardWidth <= viewportSize.w - 16) {
        left = candidateLeft;
        top = targetRect.top;
      }
    } else if (preferred === 'top') {
      const candidateTop = targetRect.top - estimatedCardHeight - margin;
      if (candidateTop >= 16) {
        top = candidateTop;
        left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
      } else {
        top = targetRect.top + targetRect.height + margin;
        left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
      }
    } else if (preferred === 'bottom') {
      const candidateTop = targetRect.top + targetRect.height + margin;
      if (candidateTop + estimatedCardHeight > viewportSize.h - 16 && targetRect.top > estimatedCardHeight + 24) {
        top = targetRect.top - estimatedCardHeight - margin;
      } else {
        top = candidateTop;
      }
      left = targetRect.left + Math.min(40, targetRect.width / 4);
    }

    // Clamp inside desktop viewport bounds
    const clampedLeft = Math.max(16, Math.min(viewportSize.w - cardWidth - 16, left));
    const clampedTop = Math.max(16, Math.min(viewportSize.h - estimatedCardHeight - 16, top));

    return {
      position: 'fixed',
      top: `${clampedTop}px`,
      left: `${clampedLeft}px`,
      width: `${cardWidth}px`,
      maxWidth: 'calc(100vw - 32px)'
    };
  };

  const progressPercent = Math.round(((currentStepIndex + 1) / TOTAL_WALKTHROUGH_STEPS) * 100);

  return (
    <AnimatePresence>
      {/* ================================================================= */}
      {/* 1. WELCOME MODAL                                                  */}
      {/* ================================================================= */}
      {stage === 'welcome' && (
        <motion.div
          key="studyweb-tour-welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 bg-slate-950/65 backdrop-blur-md select-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studyweb-tour-welcome-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="relative w-full max-w-md bg-white dark:bg-[#0E1528] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_-15px_rgba(15,23,42,0.45)] text-center overflow-hidden"
          >
            {/* Subtle top ambient accent */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 blur-3xl" />

            <button
              type="button"
              onClick={handleSkipTour}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Skip Tour"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 flex items-center justify-center mb-5 shadow-xs">
                <img
                  src="/logo-inner.png"
                  alt="StudyWeb Logo"
                  className="w-10 h-10 object-contain select-none"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                <Compass className="w-3.5 h-3.5" />
                <span>Interactive Product Tour</span>
              </div>

              <h2
                id="studyweb-tour-welcome-title"
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight"
              >
                Welcome to StudyWeb!
              </h2>

              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm">
                Your personal learning journey starts here. Let&apos;s take a quick tour.
              </p>

              <div className="mt-7 w-full flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSkipTour}
                  className="w-full sm:w-auto sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Skip Tour
                </button>
                <button
                  type="button"
                  onClick={handleStartWalkthrough}
                  className="w-full sm:w-auto sm:flex-[1.35] py-3 px-5 rounded-xl bg-[#5145F5] hover:bg-[#4336E0] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5145F5]/25 inline-flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ================================================================= */}
      {/* 2. FIVE-STEP GUIDED WALKTHROUGH & SPOTLIGHT                       */}
      {/* ================================================================= */}
      {stage === 'walkthrough' && (
        <div
          key="studyweb-tour-walkthrough"
          className="fixed inset-0 z-[9990] pointer-events-auto select-none"
          role="dialog"
          aria-modal="true"
          aria-label={`Guided Tour Step ${activeStep.stepNumber} of ${TOTAL_WALKTHROUGH_STEPS}`}
        >
          {/* SVG Spotlight Overlay with Cutout Window */}
          <svg
            className="fixed inset-0 w-full h-full pointer-events-auto"
            width={viewportSize.w}
            height={viewportSize.h}
            onClick={(e) => {
              // Prevent accidental backdrop clicks from triggering underlying controls
              e.stopPropagation();
            }}
          >
            <defs>
              <mask id="studyweb-tour-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {targetRect && !isCompletionStep && (
                  <rect
                    x={targetRect.left}
                    y={targetRect.top}
                    width={targetRect.width}
                    height={targetRect.height}
                    rx={14}
                    ry={14}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(15, 23, 42, 0.68)"
              mask="url(#studyweb-tour-spotlight-mask)"
            />
          </svg>

          {/* Animated Spotlight Focus Frame around Target Element */}
          {targetRect && !isCompletionStep && (
            <motion.div
              layoutId="studyweb-tour-focus-ring"
              initial={false}
              animate={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="fixed pointer-events-none rounded-[14px] ring-2 ring-[#5145F5] dark:ring-indigo-400 shadow-[0_0_0_4px_rgba(81,69,245,0.22),0_0_30px_rgba(81,69,245,0.35)] z-[9991]"
            />
          )}

          {/* STEP 5: COMPLETION MODAL */}
          {isCompletionStep ? (
            <div className="fixed inset-0 z-[9992] flex items-center justify-center p-4 sm:p-6">
              <motion.div
                key="tour-step-completion"
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                className="relative w-full max-w-md bg-white dark:bg-[#0E1528] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_-15px_rgba(15,23,42,0.5)] text-center overflow-hidden"
              >
                <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 blur-3xl" />

                <div className="relative z-10 flex flex-col items-center">
                  {/* Top Step & Progress Header */}
                  <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500 mb-4">
                    <span className="tabular-nums text-indigo-600 dark:text-indigo-400">
                      Step {activeStep.stepNumber} of {TOTAL_WALKTHROUGH_STEPS}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {TOUR_STEPS.map((s, idx) => (
                        <span
                          key={s.id}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === currentStepIndex
                              ? 'w-5 bg-emerald-500'
                              : 'w-2 bg-emerald-500/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Linear Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-6">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full"
                      initial={{ width: '80%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/70 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 shadow-xs">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    You&apos;re all set!
                  </h2>

                  <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm">
                    You&apos;re all set! Your StudyWeb journey begins now.
                  </p>

                  <div className="mt-7 w-full flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteTour}
                      className="flex-1 py-3 px-6 rounded-xl bg-[#5145F5] hover:bg-[#4336E0] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5145F5]/25 inline-flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Start Learning</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            /* STEPS 1 TO 4: CONTEXTUAL SPOTLIGHT TOOLTIP CARD */
            <motion.div
              ref={tooltipRef}
              key={`tour-step-${activeStep.id}`}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={getTooltipPositionStyle()}
              className="z-[9992] bg-white dark:bg-[#0E1528] border border-slate-200/95 dark:border-slate-800 rounded-2xl p-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.45)] text-left"
            >
              {/* Top Row: Step Counter + Skip Tour */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/70 flex items-center justify-center shrink-0">
                    {activeStep.icon}
                  </div>
                  <span className="text-xs font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400">
                    Step {activeStep.stepNumber} of {TOTAL_WALKTHROUGH_STEPS}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSkipTour}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Skip Tour
                </button>
              </div>

              {/* Smooth Linear Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3.5">
                <motion.div
                  className="h-full bg-[#5145F5] dark:bg-indigo-500 rounded-full"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </div>

              {/* Step Title & Explanation */}
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {activeStep.title}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeStep.description}
              </p>

              {/* Bottom Controls: Step Dots + Back / Next */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                {/* 5-Step Dots Indicator */}
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {TOUR_STEPS.map((s, idx) => (
                    <span
                      key={s.id}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        idx === currentStepIndex
                          ? 'w-4 bg-[#5145F5] dark:bg-indigo-400'
                          : idx < currentStepIndex
                          ? 'w-1.5 bg-indigo-300 dark:bg-indigo-700'
                          : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-1.5 rounded-xl bg-[#5145F5] hover:bg-[#4336E0] text-white text-xs font-bold shadow-sm shadow-[#5145F5]/20 inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
