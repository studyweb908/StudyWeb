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
  User,
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

type TourStage = 'idle' | 'welcome' | 'walkthrough' | 'completion';

interface WalkthroughStepConfig {
  stepNumber: number; // 1 to 5
  id: string;
  navbarLabel: string;
  title: string; // Strictly 2-word title
  description: string; // Brief 1-sentence tip
  selectors: string[];
  requiredTab: string;
  workspaceSubTab?: 'overview' | 'library' | null;
  requireActiveWorkspace?: boolean;
  preferredPlacement?: 'bottom' | 'right' | 'top' | 'left';
  icon: React.ReactNode;
}

const TOTAL_WALKTHROUGH_STEPS = 5;

const TOUR_STEPS: WalkthroughStepConfig[] = [
  {
    stepNumber: 1,
    id: 'dashboard-navbar',
    navbarLabel: 'Navbar • Menu',
    title: 'Navigation Bar',
    description: 'Use this navbar to switch between Home, Spaces, AI Tutor, and Profile.',
    selectors: [
      '[data-tour="nav-sidebar-overview"]',
      '[data-tour="mobile-bottom-nav"]',
      '[data-tour="nav-dashboard"]'
    ],
    requiredTab: 'dashboard',
    workspaceSubTab: null,
    preferredPlacement: 'right',
    icon: <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
  },
  {
    stepNumber: 2,
    id: 'workspace-overview',
    navbarLabel: 'Navbar → Spaces',
    title: 'Study Spaces',
    description: 'Open any subject Space to organize notes, flashcards, and quizzes.',
    selectors: [
      '[data-tour="space-overview-header"]',
      '[data-tour="workspace-action-bar"]',
      '[data-tour="workspace-upload-btn"]'
    ],
    requiredTab: 'workspaces',
    workspaceSubTab: 'overview',
    requireActiveWorkspace: true,
    preferredPlacement: 'bottom',
    icon: <Folder className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
  },
  {
    stepNumber: 3,
    id: 'upload-documents',
    navbarLabel: 'Spaces → Library',
    title: 'Upload Materials',
    description: 'Click here to upload PDFs, slides, or notes into your Space.',
    selectors: [
      '[data-tour="upload-documents"]',
      '[data-tour="space-upload-dropzone"]',
      '[data-tour="workspace-upload-btn"]'
    ],
    requiredTab: 'workspaces',
    workspaceSubTab: 'library',
    requireActiveWorkspace: true,
    preferredPlacement: 'bottom',
    icon: <FileUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
  },
  {
    stepNumber: 4,
    id: 'ai-tutor-dock',
    navbarLabel: 'Navbar → AI Tutor',
    title: 'AI Tutor',
    description: 'Attach a study file and ask your AI Tutor any question.',
    selectors: [
      '[data-tour="ai-tutor-input-bar"]',
      '[data-tour="ai-tutor-input-dock"]',
      '[data-tour="nav-ai-tutor"]'
    ],
    requiredTab: 'ai-tutor',
    workspaceSubTab: null,
    requireActiveWorkspace: true,
    preferredPlacement: 'top',
    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
  },
  {
    stepNumber: 5,
    id: 'profile-customization',
    navbarLabel: 'Navbar → Profile',
    title: 'Profile Goals',
    description: 'Save your school info, exam date, and daily study goals here.',
    selectors: [
      '[data-tour="profile-save-btn"]',
      '[data-tour="profile-tabs-bar"]',
      '[data-tour="profile-customization-card"]'
    ],
    requiredTab: 'profile',
    workspaceSubTab: null,
    preferredPlacement: 'bottom',
    icon: <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
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

/**
 * Dispatches synchronized view configuration events so App.tsx and WorkspaceContainer.tsx
 * switch to the exact screen and workspace sub-tab required by the active tour step.
 */
function configureViewForStep(step: WalkthroughStepConfig | null) {
  if (typeof window === 'undefined') return;
  if (!step) {
    window.dispatchEvent(
      new CustomEvent('studyweb-tour-configure-view', {
        detail: { workspaceSubTab: null }
      })
    );
    return;
  }

  window.dispatchEvent(
    new CustomEvent('studyweb-tour-configure-view', {
      detail: {
        tab: step.requiredTab,
        workspaceSubTab: step.workspaceSubTab ?? null,
        requireActiveWorkspace: Boolean(step.requireActiveWorkspace)
      }
    })
  );

  if (step.requiredTab === 'workspaces' && step.workspaceSubTab) {
    window.dispatchEvent(
      new CustomEvent('studyweb-tour-workspace-subtab', {
        detail: { subTab: step.workspaceSubTab }
      })
    );
  }
}

export default function GuidedProductTour({
  setActiveTab,
  isLoggedIn,
  showOnboarding
}: GuidedProductTourProps) {
  const [stage, setStage] = useState<TourStage>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0); // 0..4 (Step 1..5)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [cardSize, setCardSize] = useState<{ w: number; h: number }>({ w: 292, h: 176 });
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isCompletionStep = stage === 'completion';

  // Measure actual rendered tooltip height so positioning never clips off-screen
  useEffect(() => {
    if (stage !== 'walkthrough' || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setCardSize((prev) =>
        Math.abs(prev.w - rect.width) > 2 || Math.abs(prev.h - rect.height) > 2
          ? { w: rect.width, h: rect.height }
          : prev
      );
    }
  }, [stage, currentStepIndex, targetRect]);

  // Measure and scroll single target element into view
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
      const pad = 5;
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
      configureViewForStep(null);
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

  // Ensure required route/tab and Space sub-tab are active when stepping through walkthrough
  useEffect(() => {
    if (stage !== 'walkthrough') return;

    const step = TOUR_STEPS[currentStepIndex];
    if (!step) return;

    configureViewForStep(step);

    // Measure immediately and re-measure across layout/animation settle frames
    measureActiveTarget(true);
    const t1 = window.setTimeout(() => {
      if (step.requiredTab === 'workspaces' && step.workspaceSubTab) {
        window.dispatchEvent(
          new CustomEvent('studyweb-tour-workspace-subtab', {
            detail: { subTab: step.workspaceSubTab }
          })
        );
      }
      measureActiveTarget(true);
    }, 110);
    const t2 = window.setTimeout(() => measureActiveTarget(true), 250);
    const t3 = window.setTimeout(() => measureActiveTarget(false), 420);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [stage, currentStepIndex, measureActiveTarget]);

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
    setCurrentStepIndex(0);
    setStage('walkthrough');
    configureViewForStep(TOUR_STEPS[0]);
  }, []);

  const handleSkipTour = useCallback(async () => {
    const stepReached = stage === 'welcome' ? 0 : currentStepIndex + 1;
    configureViewForStep(null);
    setStage('idle');
    setTargetRect(null);
    await ProductTourService.saveTourStatus('skipped', stepReached);
  }, [stage, currentStepIndex]);

  const handleCompleteTour = useCallback(async () => {
    try {
      playGlassPopSound();
    } catch {}
    configureViewForStep(null);
    setStage('idle');
    setTargetRect(null);
    setActiveTab('dashboard');
    await ProductTourService.saveTourStatus('completed', TOTAL_WALKTHROUGH_STEPS);
  }, [setActiveTab]);

  const handleNextStep = useCallback(() => {
    try {
      playGlassPopSound();
    } catch {}
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setTargetRect(null);
      setStage('completion');
    }
  }, [currentStepIndex]);

  const handlePrevStep = useCallback(() => {
    if (stage === 'completion') {
      setStage('walkthrough');
      setCurrentStepIndex(TOUR_STEPS.length - 1);
      return;
    }
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      configureViewForStep(null);
      setActiveTab('dashboard');
      setStage('welcome');
    }
  }, [stage, currentStepIndex, setActiveTab]);

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
      } else if (stage === 'walkthrough' || stage === 'completion') {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
          e.preventDefault();
          if (stage === 'completion') {
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
    handleSkipTour,
    handleStartWalkthrough,
    handleNextStep,
    handlePrevStep,
    handleCompleteTour
  ]);

  if (stage === 'idle') return null;

  // Compute responsive, centered, non-overlapping compact tooltip position
  const getTooltipPositionStyle = (): React.CSSProperties => {
    const isMobile = viewportSize.w < 640;
    const width = isMobile ? Math.min(viewportSize.w - 24, 308) : 320;
    const height = Math.max(152, Math.min(220, cardSize.h || 176));
    const gap = 14;
    const edgePad = 14;

    const centeredLeft = Math.max(edgePad, Math.round((viewportSize.w - width) / 2));
    const centeredTop = Math.max(edgePad, Math.round((viewportSize.h - height) / 2));

    if (!targetRect || isCompletionStep) {
      return {
        position: 'fixed',
        top: `${centeredTop}px`,
        left: `${centeredLeft}px`,
        width: `${width}px`,
        maxWidth: 'calc(100vw - 24px)'
      };
    }

    if (isMobile) {
      const spaceBelow = viewportSize.h - (targetRect.top + targetRect.height);
      const spaceAbove = targetRect.top;
      let rawTop: number;

      if (spaceBelow >= height + gap + edgePad) {
        rawTop = targetRect.top + targetRect.height + gap;
      } else if (spaceAbove >= height + gap + edgePad) {
        rawTop = targetRect.top - height - gap;
      } else {
        rawTop = centeredTop;
      }

      const clampedTop = Math.max(edgePad, Math.min(viewportSize.h - height - edgePad, Math.round(rawTop)));

      return {
        position: 'fixed',
        top: `${clampedTop}px`,
        left: `${centeredLeft}px`,
        width: `${width}px`,
        maxWidth: 'calc(100vw - 24px)'
      };
    }

    // Desktop collision-aware placement keeping the card centered and readable
    const preferred = activeStep.preferredPlacement || 'bottom';
    const spaceRight = viewportSize.w - (targetRect.left + targetRect.width);
    const spaceLeft = targetRect.left;
    const spaceBottom = viewportSize.h - (targetRect.top + targetRect.height);
    const spaceTop = targetRect.top;

    let top = targetRect.top + targetRect.height + gap;
    let left = targetRect.left + targetRect.width / 2 - width / 2;

    if (preferred === 'right' && spaceRight >= width + gap + edgePad) {
      left = targetRect.left + targetRect.width + gap;
      top = Math.max(edgePad + 48, Math.round(targetRect.top + targetRect.height / 2 - height / 2));
    } else if (preferred === 'left' && spaceLeft >= width + gap + edgePad) {
      left = targetRect.left - width - gap;
      top = Math.max(edgePad, Math.round(targetRect.top + targetRect.height / 2 - height / 2));
    } else if (preferred === 'top' && spaceTop >= height + gap + edgePad) {
      top = targetRect.top - height - gap;
      left = targetRect.left + targetRect.width / 2 - width / 2;
    } else if (spaceBottom >= height + gap + edgePad) {
      top = targetRect.top + targetRect.height + gap;
      left = targetRect.left + targetRect.width / 2 - width / 2;
    } else if (spaceTop >= height + gap + edgePad) {
      top = targetRect.top - height - gap;
      left = targetRect.left + targetRect.width / 2 - width / 2;
    } else if (spaceRight >= width + gap + edgePad) {
      left = targetRect.left + targetRect.width + gap;
      top = centeredTop;
    } else {
      top = centeredTop;
      left = centeredLeft;
    }

    const clampedLeft = Math.max(edgePad, Math.min(viewportSize.w - width - edgePad, Math.round(left)));
    const clampedTop = Math.max(edgePad, Math.min(viewportSize.h - height - edgePad, Math.round(top)));

    return {
      position: 'fixed',
      top: `${clampedTop}px`,
      left: `${clampedLeft}px`,
      width: `${width}px`,
      maxWidth: 'calc(100vw - 24px)'
    };
  };

  const progressPercent = isCompletionStep
    ? 100
    : Math.round(((currentStepIndex + 1) / TOTAL_WALKTHROUGH_STEPS) * 100);

  return (
    <AnimatePresence>
      {/* ================================================================= */}
      {/* 1. COMPACT WELCOME MODAL                                          */}
      {/* ================================================================= */}
      {stage === 'welcome' && (
        <motion.div
          key="studyweb-tour-welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md select-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studyweb-tour-welcome-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="relative w-full max-w-sm bg-white dark:bg-[#0E1528] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.45)] text-center overflow-hidden"
          >
            <button
              type="button"
              onClick={handleSkipTour}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Skip Tour"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 flex items-center justify-center mb-3.5 shadow-2xs">
                <img
                  src="/logo-inner.png"
                  alt="StudyWeb Logo"
                  className="w-8 h-8 object-contain select-none"
                />
              </div>

              <div className="inline-flex items-center gap-1 text-fluid-2xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                <Compass className="w-3 h-3" />
                <span>5-Step Quick Tour</span>
              </div>

              <div
                id="studyweb-tour-welcome-title"
                role="heading"
                aria-level={2}
                className="text-fluid-title font-extrabold text-slate-900 dark:text-white tracking-tight"
              >
                Welcome to StudyWeb!
              </div>

              <p className="mt-1.5 text-fluid-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
                Your personal learning journey starts here. Let&apos;s take a quick tour.
              </p>

              <div className="mt-4 w-full flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSkipTour}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-fluid-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  Skip Tour
                </button>
                <button
                  type="button"
                  onClick={handleStartWalkthrough}
                  className="flex-[1.35] py-2 px-4 rounded-xl bg-[#5145F5] hover:bg-[#4336E0] text-white font-bold text-fluid-xs shadow-sm shadow-[#5145F5]/25 inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ================================================================= */}
      {/* 2. SINGLE-ITEM SPOTLIGHT WALKTHROUGH & COMPLETION MODAL           */}
      {/* ================================================================= */}
      {(stage === 'walkthrough' || stage === 'completion') && (
        <div
          key="studyweb-tour-walkthrough"
          className="fixed inset-0 z-[9990] pointer-events-auto select-none"
          role="dialog"
          aria-modal="true"
          aria-label={
            isCompletionStep
              ? 'Guided Tour Completed'
              : `Guided Tour Step ${activeStep.stepNumber} of ${TOTAL_WALKTHROUGH_STEPS}`
          }
        >
          {/* SVG Spotlight Overlay with Single-Element Cutout */}
          <svg
            className="fixed inset-0 w-full h-full pointer-events-auto"
            width={viewportSize.w}
            height={viewportSize.h}
            onClick={(e) => {
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
                    rx={12}
                    ry={12}
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
              fill="rgba(15, 23, 42, 0.72)"
              mask="url(#studyweb-tour-spotlight-mask)"
            />
          </svg>

          {/* Crisp Single-Element Focus Ring */}
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
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="fixed pointer-events-none rounded-[12px] ring-2 ring-[#5145F5] dark:ring-indigo-400 shadow-[0_0_0_4px_rgba(81,69,245,0.22),0_0_24px_rgba(81,69,245,0.35)] z-[9991]"
            />
          )}

          {/* COMPLETION MODAL */}
          {isCompletionStep ? (
            <div className="fixed inset-0 z-[9992] flex items-center justify-center p-4">
              <motion.div
                key="tour-step-completion"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="relative w-full max-w-sm bg-white dark:bg-[#0E1528] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.5)] text-center overflow-hidden"
              >
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/70 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div
                    role="heading"
                    aria-level={2}
                    className="text-fluid-title font-extrabold text-slate-900 dark:text-white tracking-tight"
                  >
                    You&apos;re all set!
                  </div>

                  <p className="mt-1.5 text-fluid-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
                    Your StudyWeb journey begins now.
                  </p>

                  <div className="mt-4 w-full flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-fluid-xs inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteTour}
                      className="flex-1 py-2 px-4 rounded-xl bg-[#5145F5] hover:bg-[#4336E0] text-white font-bold text-fluid-xs shadow-sm shadow-[#5145F5]/25 inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <span>Start Learning</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            /* STEPS 1 TO 5: SMALL CARD WITH TWO-WORD TITLE & BRIEF TIP */
            <motion.div
              ref={tooltipRef}
              key={`tour-step-${activeStep.id}`}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={getTooltipPositionStyle()}
              className="z-[9992] bg-white dark:bg-[#0E1528] border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-4 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.55)] text-left"
            >
              {/* Top Meta Line: Step Counter + Navbar Context + Skip */}
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/70 flex items-center justify-center shrink-0">
                    {activeStep.icon}
                  </div>
                  <span className="text-fluid-2xs font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {activeStep.stepNumber}/{TOTAL_WALKTHROUGH_STEPS}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 text-[10px]">·</span>
                  <span className="text-fluid-2xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                    {activeStep.navbarLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSkipTour}
                  className="text-fluid-2xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 whitespace-nowrap"
                >
                  Skip
                </button>
              </div>

              {/* Thin Progress Bar */}
              <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-[#5145F5] dark:bg-indigo-500 rounded-full"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              </div>

              {/* Two-Word Title & Minimal Tip */}
              <div
                role="heading"
                aria-level={3}
                className="text-fluid-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug"
              >
                {activeStep.title}
              </div>
              <p className="mt-0.5 text-fluid-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeStep.description}
              </p>

              {/* Compact Footer Controls */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1" aria-hidden="true">
                  {TOUR_STEPS.map((s, idx) => (
                    <span
                      key={s.id}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        idx === currentStepIndex
                          ? 'w-3.5 bg-[#5145F5] dark:bg-indigo-400'
                          : idx < currentStepIndex
                          ? 'w-1.5 bg-indigo-300 dark:bg-indigo-700'
                          : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-fluid-2xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-3 py-1 rounded-lg bg-[#5145F5] hover:bg-[#4336E0] text-white text-fluid-2xs font-bold shadow-2xs inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}</span>
                    <ArrowRight className="w-3 h-3" />
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
