import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Check,
  HelpCircle,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  Share2,
  Clock,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestionItem, QuizMatchPair } from './WorkspaceTypes';
import { QuizRunnerProgress, QuizTopicResult } from '../../utils/quizHistoryStorage';
import {
  triggerNativeDeviceShare,
  resolveShareDisplayName
} from './ShareContentModal';

interface InteractiveQuizRunnerProps {
  sessionId?: string;
  title: string;
  subtitle?: string;
  questions: QuizQuestionItem[];
  initialProgress?: QuizRunnerProgress | null;
  onProgressChange?: (progress: QuizRunnerProgress | null) => void;
  onComplete?: (
    score: number,
    total: number,
    topicBreakdown?: QuizTopicResult[],
    meta?: { durationSeconds?: number; missedQuestions?: MissedQuestionPayload[] }
  ) => void;
  onExit?: () => void;
  exitLabel?: string;
}

export interface MissedQuestionPayload {
  question: string;
  options: string[];
  userAns: string;
  correctAns: string;
  explanation: string;
}

const MATCH_PAIR_STYLES = [
  {
    badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700',
    border: 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/30'
  },
  {
    badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700',
    border: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/30'
  },
  {
    badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700',
    border: 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/30'
  },
  {
    badge: 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-200 border-violet-200 dark:border-violet-700',
    border: 'border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-950/30'
  }
];

function normalizeAnswerText(val: string): string {
  return String(val || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"`()[\]{}]/g, '')
    .replace(/\s+/g, ' ');
}

function deterministicShuffle<T>(items: T[], seedStr: string): T[] {
  const arr = [...items];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getPerformanceTier(pct: number): { label: string; colorClass: string } {
  if (pct >= 90) return { label: 'Mastery', colorClass: 'text-emerald-600 dark:text-emerald-400' };
  if (pct >= 70) return { label: 'Proficient', colorClass: 'text-indigo-600 dark:text-indigo-400' };
  if (pct >= 50) return { label: 'Developing', colorClass: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Needs Practice', colorClass: 'text-rose-600 dark:text-rose-400' };
}

function formatQuizDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(1, Math.round(totalSeconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatCompletionTimestamp(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${datePart} · ${timePart}`;
}

export default function InteractiveQuizRunner({
  sessionId,
  title,
  subtitle,
  questions,
  initialProgress,
  onProgressChange,
  onComplete,
  onExit,
  exitLabel = 'Back to Quizzes'
}: InteractiveQuizRunnerProps) {
  const canRestore = Boolean(initialProgress && sessionId && initialProgress.sessionId === sessionId);

  const [currentIdx, setCurrentIdx] = useState(() =>
    canRestore ? Math.min(questions.length - 1, Math.max(0, initialProgress!.currentIdx)) : 0
  );
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [blankInput, setBlankInput] = useState('');
  const [activeLeftId, setActiveLeftId] = useState<string | null>(null);
  const [activeRightId, setActiveRightId] = useState<string | null>(null);
  const [matchSelections, setMatchSelections] = useState<Record<string, string>>({});
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const [score, setScore] = useState(() => (canRestore ? initialProgress!.score : 0));
  const [quizFinished, setQuizFinished] = useState(() => (canRestore ? initialProgress!.quizFinished : false));
  const [missedQuestions, setMissedQuestions] = useState<MissedQuestionPayload[]>(() =>
    canRestore && Array.isArray(initialProgress!.missedQuestions) ? initialProgress!.missedQuestions : []
  );
  const [topicResults, setTopicResults] = useState<Record<string, { correct: number; total: number }>>(() =>
    canRestore && initialProgress!.topicResults ? initialProgress!.topicResults : {}
  );
  const [aiReviewList, setAiReviewList] = useState<Array<{ question: string; explanation: string }>>([]);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [completionMeta, setCompletionMeta] = useState<{
    durationSeconds: number;
    completedAt: Date;
  } | null>(() =>
    canRestore && initialProgress!.quizFinished
      ? { durationSeconds: 0, completedAt: new Date() }
      : null
  );
  const startedAtRef = useRef<number>(Date.now());
  const shouldReduceMotion = useReducedMotion();

  const activeQuestion = questions[currentIdx] || null;

  useEffect(() => {
    if (!sessionId || !onProgressChange) return;
    onProgressChange({
      sessionId,
      currentIdx,
      score,
      quizFinished,
      topicResults,
      missedQuestions
    });
  }, [sessionId, currentIdx, score, quizFinished, topicResults, missedQuestions, onProgressChange]);

  const recordTopicOutcome = (question: QuizQuestionItem, isCorrect: boolean) => {
    const topicKey = (question.topic || question.type || 'General Concepts').trim();
    setTopicResults((prev) => {
      const existing = prev[topicKey] || { correct: 0, total: 0 };
      return {
        ...prev,
        [topicKey]: {
          correct: existing.correct + (isCorrect ? 1 : 0),
          total: existing.total + 1
        }
      };
    });
  };

  const shuffledRightPairs = useMemo<QuizMatchPair[]>(() => {
    if (!activeQuestion?.pairs || activeQuestion.pairs.length === 0) return [];
    const shuffled = deterministicShuffle(activeQuestion.pairs, `${activeQuestion.id}_${currentIdx}`);
    // Ensure not identical order if >= 2 items
    if (shuffled.length >= 2 && shuffled.every((p, idx) => p.id === activeQuestion.pairs![idx].id)) {
      const rotated = [...shuffled.slice(1), shuffled[0]];
      return rotated;
    }
    return shuffled;
  }, [activeQuestion, currentIdx]);

  useEffect(() => {
    if (
      activeQuestion?.type === 'MatchFollowing' &&
      Array.isArray(activeQuestion.pairs) &&
      activeQuestion.pairs.length > 0 &&
      !isAnswered
    ) {
      setActiveLeftId((prev) =>
        prev && activeQuestion.pairs!.some((p) => p.id === prev)
          ? prev
          : activeQuestion.pairs![0].id
      );
      setActiveRightId(null);
    }
  }, [activeQuestion, currentIdx, isAnswered]);

  const resetQuestionInputs = () => {
    setSelectedOption(null);
    setBlankInput('');
    setActiveLeftId(null);
    setActiveRightId(null);
    setMatchSelections({});
    setIsAnswered(false);
    setIsCurrentCorrect(false);
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setScore(0);
    setQuizFinished(false);
    setMissedQuestions([]);
    setTopicResults({});
    setAiReviewList([]);
    setCompletionMeta(null);
    startedAtRef.current = Date.now();
    resetQuestionInputs();
  };

  const handleSelectMcq = (idx: number) => {
    if (isAnswered || !activeQuestion) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    const correct = idx === activeQuestion.correctIndex;
    setIsCurrentCorrect(correct);
    recordTopicOutcome(activeQuestion, correct);
    if (correct) {
      setScore((prev) => prev + 1);
    } else {
      setMissedQuestions((prev) => [
        ...prev,
        {
          question: activeQuestion.question,
          options: activeQuestion.options,
          userAns: activeQuestion.options[idx] || `Option ${idx + 1}`,
          correctAns: activeQuestion.options[activeQuestion.correctIndex] || '',
          explanation: activeQuestion.explanation
        }
      ]);
    }
  };

  const handleCheckFillBlank = () => {
    if (isAnswered || !activeQuestion || !blankInput.trim()) return;
    const normalizedUser = normalizeAnswerText(blankInput);
    const validCandidates = Array.from(
      new Set([
        ...(activeQuestion.options || []),
        ...(activeQuestion.acceptedAnswers || [])
      ])
    )
      .map(normalizeAnswerText)
      .filter(Boolean);

    const correct = validCandidates.some(
      (cand) =>
        cand === normalizedUser ||
        (normalizedUser.length >= 4 && (cand.includes(normalizedUser) || normalizedUser.includes(cand)))
    );

    setIsAnswered(true);
    setIsCurrentCorrect(correct);
    recordTopicOutcome(activeQuestion, correct);
    if (correct) {
      setScore((prev) => prev + 1);
    } else {
      setMissedQuestions((prev) => [
        ...prev,
        {
          question: activeQuestion.question,
          options: activeQuestion.options,
          userAns: blankInput.trim(),
          correctAns: activeQuestion.options?.[0] || activeQuestion.acceptedAnswers?.[0] || '',
          explanation: activeQuestion.explanation
        }
      ]);
    }
  };

  const handlePairLeftClick = (leftPairId: string) => {
    if (isAnswered || !activeQuestion?.pairs) return;
    if (activeRightId) {
      const next = { ...matchSelections };
      Object.keys(next).forEach((k) => {
        if (next[k] === activeRightId) delete next[k];
      });
      next[leftPairId] = activeRightId;
      setMatchSelections(next);
      setActiveRightId(null);
      const nextUnpaired = activeQuestion.pairs.find((p) => !next[p.id]);
      setActiveLeftId(nextUnpaired ? nextUnpaired.id : null);
      return;
    }
    setActiveLeftId(leftPairId);
  };

  const handleUnmatchLeft = (leftPairId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnswered) return;
    const next = { ...matchSelections };
    delete next[leftPairId];
    setMatchSelections(next);
    setActiveLeftId(leftPairId);
    setActiveRightId(null);
  };

  const handlePairRightClick = (rightPairId: string) => {
    if (isAnswered || !activeQuestion?.pairs) return;

    const existingLeftEntry = Object.entries(matchSelections).find(([, val]) => val === rightPairId);
    const firstUnpairedLeft = activeQuestion.pairs.find((p) => !matchSelections[p.id]);

    let leftIdToAssign: string | null = activeLeftId;
    if (!leftIdToAssign) {
      if (firstUnpairedLeft) {
        leftIdToAssign = firstUnpairedLeft.id;
      } else if (existingLeftEntry) {
        // All left items are already matched: tapping a matched right item frees it for quick reassignment
        const next = { ...matchSelections };
        delete next[existingLeftEntry[0]];
        setMatchSelections(next);
        setActiveLeftId(existingLeftEntry[0]);
        setActiveRightId(null);
        return;
      } else {
        setActiveRightId(rightPairId);
        return;
      }
    }

    const next = { ...matchSelections };
    Object.keys(next).forEach((k) => {
      if (next[k] === rightPairId) delete next[k];
    });
    next[leftIdToAssign] = rightPairId;
    setMatchSelections(next);
    setActiveRightId(null);

    const nextUnpaired = activeQuestion.pairs.find((p) => !next[p.id]);
    setActiveLeftId(nextUnpaired ? nextUnpaired.id : null);
  };

  const handleCheckMatches = () => {
    if (isAnswered || !activeQuestion?.pairs) return;
    const pairs = activeQuestion.pairs;
    if (Object.keys(matchSelections).length < pairs.length) return;

    const allMatched = pairs.every((p) => matchSelections[p.id] === p.id);
    setIsAnswered(true);
    setIsCurrentCorrect(allMatched);
    recordTopicOutcome(activeQuestion, allMatched);
    if (allMatched) {
      setScore((prev) => prev + 1);
    } else {
      const userMappingSummary = pairs
        .map((p) => {
          const chosenRight = pairs.find((r) => r.id === matchSelections[p.id])?.right || 'Unmatched';
          return `${p.left} -> ${chosenRight}`;
        })
        .join('; ');
      const correctMappingSummary = pairs.map((p) => `${p.left} -> ${p.right}`).join('; ');
      setMissedQuestions((prev) => [
        ...prev,
        {
          question: activeQuestion.question,
          options: [],
          userAns: userMappingSummary,
          correctAns: correctMappingSummary,
          explanation: activeQuestion.explanation
        }
      ]);
    }
  };

  const topicBreakdown = useMemo<QuizTopicResult[]>(() => {
    const entries = Object.entries(topicResults) as Array<[string, { correct: number; total: number }]>;
    if (entries.length > 0) {
      return entries.map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total
      }));
    }
    return [];
  }, [topicResults]);

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      resetQuestionInputs();
    } else {
      const completedAt = new Date();
      const durationSeconds = Math.max(1, Math.round((completedAt.getTime() - startedAtRef.current) / 1000));
      setCompletionMeta({ durationSeconds, completedAt });
      setQuizFinished(true);
      const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
      if (pct >= 70 && !shouldReduceMotion) {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.58 }
        });
        window.setTimeout(() => {
          confetti({
            particleCount: 65,
            angle: 60,
            spread: 60,
            origin: { x: 0.08, y: 0.65 }
          });
          confetti({
            particleCount: 65,
            angle: 120,
            spread: 60,
            origin: { x: 0.92, y: 0.65 }
          });
        }, 200);
        window.setTimeout(() => {
          confetti({
            particleCount: 80,
            spread: 100,
            startVelocity: 38,
            origin: { y: 0.5 }
          });
        }, 440);
      }
      if (onComplete) {
        onComplete(score, questions.length, topicBreakdown, {
          durationSeconds,
          missedQuestions
        });
      }
    }
  };

  const handleRequestAiReview = async () => {
    if (missedQuestions.length === 0 || isLoadingReview) return;
    setIsLoadingReview(true);
    try {
      const res = await fetch('/api/explain-incorrect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incorrectQuestions: missedQuestions })
      });
      const data = await res.json();
      if (Array.isArray(data?.explanations)) {
        setAiReviewList(data.explanations);
      }
    } catch {
      setAiReviewList(
        missedQuestions.map((q) => ({
          question: q.question,
          explanation: `The correct answer is **${q.correctAns}**. ${q.explanation}`
        }))
      );
    } finally {
      setIsLoadingReview(false);
    }
  };

  if (!questions || questions.length === 0) {
    return null;
  }

  const progressPercent = Math.round(((currentIdx + (isAnswered ? 1 : 0)) / questions.length) * 100);
  const typeLabel =
    activeQuestion?.type === 'FillBlank'
      ? 'Fill in the Blanks'
      : activeQuestion?.type === 'MatchFollowing'
      ? 'Match the Following'
      : activeQuestion?.type === 'TF'
      ? 'True / False'
      : 'Multiple Choice';

  return (
    <div className="space-y-5 w-full">
      {/* Runner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="min-w-0">
          {onExit && (
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mb-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{exitLabel}</span>
            </button>
          )}
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {!quizFinished && (
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
            <span>
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              Score {score}/{questions.length}
            </span>
          </div>
        )}
      </div>

      {!quizFinished && (
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5145F5] transition-all duration-300"
            style={{ width: `${Math.max(4, progressPercent)}%` }}
          />
        </div>
      )}

      {quizFinished ? (() => {
        const finalPct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
        const missedCount = Math.max(0, questions.length - score);
        const tier = getPerformanceTier(finalPct);
        const isPassed = finalPct >= 70;
        const lackingTopics = topicBreakdown.filter((t) => t.total > 0 && Math.round((t.correct / t.total) * 100) < 70);
        const strongTopics = topicBreakdown.filter((t) => t.total > 0 && Math.round((t.correct / t.total) * 100) >= 70);
        const durationLabel =
          completionMeta && completionMeta.durationSeconds > 0
            ? formatQuizDuration(completionMeta.durationSeconds)
            : undefined;
        const completedAtLabel = formatCompletionTimestamp(completionMeta?.completedAt ?? new Date());
        const learnerName = resolveShareDisplayName();

        const handleSharePerformance = () => {
          triggerNativeDeviceShare({
            type: 'quiz-result',
            quizTitle: title,
            quizScore: score,
            quizTotal: questions.length,
            quizPercentage: finalPct,
            quizTier: tier.label,
            quizDurationLabel: durationLabel,
            quizCompletedAt: completedAtLabel,
            userName: learnerName
          });
        };

        const ringRadius = 44;
        const ringCircumference = 2 * Math.PI * ringRadius;
        const ringStrokeDashoffset = ringCircumference - (finalPct / 100) * ringCircumference;

        return (
        <div className="relative max-w-3xl mx-auto py-3 sm:py-6 space-y-5">
          {/* Ambient Luminous Glows Behind Frosted Glass Card */}
          <div className="pointer-events-none absolute -inset-4 overflow-hidden rounded-[2.5rem]" aria-hidden="true">
            {isPassed ? (
              <>
                <div className="absolute -top-10 -left-8 w-64 h-64 rounded-full bg-emerald-400/20 dark:bg-emerald-500/15 blur-3xl" />
                <div className="absolute top-12 -right-8 w-72 h-72 rounded-full bg-indigo-500/20 dark:bg-indigo-500/18 blur-3xl" />
                <div className="absolute -bottom-10 left-1/3 w-64 h-64 rounded-full bg-sky-400/15 dark:bg-cyan-500/12 blur-3xl" />
              </>
            ) : (
              <>
                <div className="absolute -top-10 -left-8 w-64 h-64 rounded-full bg-rose-400/20 dark:bg-rose-500/15 blur-3xl" />
                <div className="absolute top-12 -right-8 w-72 h-72 rounded-full bg-amber-400/18 dark:bg-amber-500/12 blur-3xl" />
              </>
            )}
          </div>

          {/* Primary Frosted Glassmorphism Result Showcase */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/15 bg-white/75 dark:bg-slate-900/70 backdrop-blur-2xl shadow-[0_24px_64px_-16px_rgba(15,23,42,0.14)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]"
          >
            {/* Top Specular Glass Rim */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/30 to-transparent"
            />

            {/* Hero Zone */}
            <div className="relative px-5 sm:px-9 pt-7 sm:pt-9 pb-6 text-center space-y-5">
              {/* Quiet Unboxed Status Kicker & Headline */}
              <div className="space-y-1.5">
                {isPassed ? (
                  <motion.p
                    initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                    className="text-xs sm:text-sm font-bold tracking-wide text-emerald-700 dark:text-emerald-300"
                  >
                    <span aria-hidden="true">🎉 </span>
                    <span>{finalPct >= 90 ? 'Yahoo! Quiz Mastered!' : 'Yahoo! You Passed!'}</span>
                    <span aria-hidden="true"> 🎉</span>
                  </motion.p>
                ) : (
                  <motion.p
                    initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs sm:text-sm font-bold tracking-wide text-rose-600 dark:text-rose-400"
                  >
                    Keep Practicing
                  </motion.p>
                )}

                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
                  {isPassed ? 'Quiz Passed — Great Work!' : 'Not Quite There Yet'}
                </h3>

                {!isPassed ? (
                  <p className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-semibold max-w-md mx-auto">
                    Don&apos;t give up! Let&apos;s try again to sharpen your skills.
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium max-w-md mx-auto">
                    Completed {completedAtLabel}
                  </p>
                )}
              </div>

              {/* Frosted Glass Centerpiece Stage: Reaction + Score Ring + Clean Metrics */}
              <div className="rounded-2xl border border-white/75 dark:border-white/10 bg-white/55 dark:bg-white/[0.04] backdrop-blur-xl px-4 py-5 sm:px-7 sm:py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex flex-col sm:flex-row items-center justify-around gap-5 sm:gap-6">
                  {/* Animated Reaction Medallion */}
                  {isPassed ? (
                    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                      {!shouldReduceMotion && (
                        <>
                          <motion.span
                            aria-hidden="true"
                            initial={{ scale: 0.75, opacity: 0.85 }}
                            animate={{ scale: [0.85, 1.48], opacity: [0.7, 0] }}
                            transition={{ duration: 1.35, repeat: Infinity, repeatDelay: 0.55, ease: 'easeOut' }}
                            className="absolute w-20 h-20 rounded-full border-2 border-emerald-400/70 dark:border-emerald-400/50 pointer-events-none"
                          />
                          <motion.span
                            aria-hidden="true"
                            initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
                            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.35, 1.1, 0.7], x: -48, y: -34, rotate: -25 }}
                            transition={{ duration: 1.35, repeat: Infinity, repeatDelay: 0.75 }}
                            className="absolute text-xl select-none pointer-events-none"
                          >
                            🎉
                          </motion.span>
                          <motion.span
                            aria-hidden="true"
                            initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
                            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.3, 1.05, 0.7], x: 50, y: -30, rotate: 22 }}
                            transition={{ duration: 1.35, delay: 0.18, repeat: Infinity, repeatDelay: 0.75 }}
                            className="absolute text-xl select-none pointer-events-none"
                          >
                            🎊
                          </motion.span>
                          <motion.span
                            aria-hidden="true"
                            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.25, 0.9, 0.6], x: 42, y: 34 }}
                            transition={{ duration: 1.4, delay: 0.34, repeat: Infinity, repeatDelay: 0.8 }}
                            className="absolute text-lg select-none pointer-events-none"
                          >
                            ✨
                          </motion.span>
                          <motion.span
                            aria-hidden="true"
                            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.25, 0.9, 0.6], x: -44, y: 32 }}
                            transition={{ duration: 1.4, delay: 0.48, repeat: Infinity, repeatDelay: 0.8 }}
                            className="absolute text-lg select-none pointer-events-none"
                          >
                            ⭐
                          </motion.span>
                          <motion.span
                            aria-hidden="true"
                            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.7], x: 0, y: -50 }}
                            transition={{ duration: 1.3, delay: 0.28, repeat: Infinity, repeatDelay: 0.9 }}
                            className="absolute text-lg select-none pointer-events-none"
                          >
                            ✨
                          </motion.span>
                        </>
                      )}
                      <motion.div
                        initial={shouldReduceMotion ? false : { scale: 0.35, rotate: -18 }}
                        animate={
                          shouldReduceMotion
                            ? { scale: 1 }
                            : { scale: [0.35, 1.2, 0.95, 1.05, 1], rotate: [-18, 12, -6, 3, 0], y: [0, -10, 0] }
                        }
                        transition={{ duration: 0.85, ease: 'easeOut' }}
                        className="relative z-10 w-20 h-20 rounded-full bg-emerald-50/90 dark:bg-emerald-950/60 border-2 border-emerald-300/90 dark:border-emerald-600/70 backdrop-blur-md flex items-center justify-center shadow-md shadow-emerald-500/15"
                      >
                        <motion.span
                          role="img"
                          aria-label="Happy smiling celebrating face"
                          animate={
                            shouldReduceMotion
                              ? undefined
                              : { scale: [1, 1.16, 0.96, 1.08, 1], y: [0, -5, 0], rotate: [0, 8, -8, 4, 0] }
                          }
                          transition={{ duration: 1.7, repeat: Infinity, repeatDelay: 0.6 }}
                          className="text-5xl leading-none select-none"
                        >
                          😄
                        </motion.span>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                      <motion.div
                        initial={shouldReduceMotion ? false : { scale: 0.75, opacity: 0 }}
                        animate={
                          shouldReduceMotion
                            ? { scale: 1, opacity: 1 }
                            : { scale: 1, opacity: 1, y: [0, 4, 0], rotate: [0, -4, 4, -2, 0] }
                        }
                        transition={{ duration: 1.4, ease: 'easeInOut' }}
                        className="w-20 h-20 rounded-full bg-rose-50/90 dark:bg-rose-950/60 border-2 border-rose-200/90 dark:border-rose-700/70 backdrop-blur-md flex items-center justify-center shadow-md shadow-rose-500/10"
                      >
                        <motion.span
                          role="img"
                          aria-label="Sad face"
                          animate={shouldReduceMotion ? undefined : { y: [0, 3, 0] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                          className="text-5xl leading-none select-none"
                        >
                          😢
                        </motion.span>
                      </motion.div>
                    </div>
                  )}

                  {/* Animated Circular Accuracy Ring */}
                  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                      <circle
                        cx="50"
                        cy="50"
                        r={ringRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-200/80 dark:text-slate-800/90"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r={ringRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        initial={
                          shouldReduceMotion
                            ? { strokeDashoffset: ringStrokeDashoffset }
                            : { strokeDashoffset: ringCircumference }
                        }
                        animate={{ strokeDashoffset: ringStrokeDashoffset }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        className={
                          finalPct >= 90
                            ? 'text-emerald-500'
                            : finalPct >= 70
                            ? 'text-[#5145F5] dark:text-indigo-400'
                            : finalPct >= 50
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center tabular-nums">
                      <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                        {finalPct}%
                      </span>
                      <span className={`text-[11px] font-bold mt-1 ${tier.colorClass}`}>
                        {tier.label}
                      </span>
                    </div>
                  </div>

                  {/* Clean Unboxed Stats Column */}
                  <div className="w-full sm:w-auto grid grid-cols-3 sm:grid-cols-1 gap-3 sm:gap-2.5 text-center sm:text-left sm:pl-4 sm:border-l border-slate-200/70 dark:border-white/10">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Score</div>
                      <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {score}/{questions.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Time</div>
                      <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                        <span>{durationLabel || 'Done'}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Result</div>
                      <div
                        className={`text-sm sm:text-base font-extrabold ${
                          isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPassed ? 'Passed' : 'Practice'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {!isPassed && (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                  Completed {completedAtLabel}
                </p>
              )}
            </div>

            {/* Performance Breakdown Zone */}
            <div className="px-5 sm:px-9 pb-6 space-y-5">
              {/* Overall Performance Bar */}
              <div className="space-y-2 text-left">
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-semibold tabular-nums">
                  <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#5145F5] dark:text-indigo-400 shrink-0" />
                    <span>Overall Quiz Performance</span>
                  </span>
                  <span className={tier.colorClass}>
                    {score} Correct · {missedCount} Missed ({finalPct}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-200/70 dark:bg-slate-800/90 overflow-hidden flex">
                  {score > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${(score / questions.length) * 100}%` }}
                    />
                  )}
                  {missedCount > 0 && (
                    <div
                      className="h-full bg-rose-400 dark:bg-rose-500/80 transition-all duration-500"
                      style={{ width: `${(missedCount / questions.length) * 100}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Topic Progress & Focus Areas */}
              {topicBreakdown.length > 0 && (
                <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-3 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      Topic Progress &amp; Focus Areas
                    </span>
                    {lackingTopics.length > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-start sm:items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" />
                        <span>Lacking in: {lackingTopics.map((t) => t.topic).join(', ')}</span>
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Strong performance across all topics ({strongTopics.length})</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {topicBreakdown.map((item) => {
                      const topicPct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
                      const isLacking = topicPct < 70;
                      return (
                        <div key={item.topic} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                            <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                              {item.topic}
                            </span>
                            <span
                              className={`font-semibold shrink-0 ${
                                isLacking
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {item.correct}/{item.total} ({topicPct}%{isLacking ? ' · Needs review' : ''})
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200/70 dark:bg-slate-800/90 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isLacking ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(4, topicPct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional AI Review Trigger for Missed Questions */}
              {missedQuestions.length > 0 && aiReviewList.length === 0 && (
                <div className="pt-1 flex justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={handleRequestAiReview}
                    disabled={isLoadingReview}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl border border-indigo-200/80 dark:border-indigo-700/60 bg-indigo-50/70 dark:bg-indigo-950/40 backdrop-blur-md text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100/80 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {isLoadingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Review {missedQuestions.length} Missed with AI</span>
                  </button>
                </div>
              )}
            </div>

            {/* Unified Glass Action Bar: Score + Retry + Back + Share Together */}
            <div className="px-5 sm:px-9 py-4 sm:py-5 border-t border-white/70 dark:border-white/10 bg-white/55 dark:bg-white/[0.03] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums text-center sm:text-left">
                Score: <span>{score}/{questions.length}</span>{' '}
                <span className={tier.colorClass}>({finalPct}%)</span>
              </div>

              <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200/90 dark:border-white/15 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isPassed ? 'Retry Quiz' : 'Restart Quiz'}</span>
                </button>

                {onExit && (
                  <button
                    type="button"
                    onClick={onExit}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] hover:bg-white/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{exitLabel}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSharePerformance}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#5145F5] via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Your Performance</span>
                </button>
              </div>
            </div>
          </motion.div>

          {aiReviewList.length > 0 && (
            <div className="relative space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                AI Concept Breakdown for Missed Questions
              </h4>
              {aiReviewList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl border border-white/75 dark:border-white/10 bg-white/75 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-1.5"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.question}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })() : activeQuestion ? (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            {/* Unboxed Question Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{typeLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{activeQuestion.difficulty} Difficulty</span>
              {activeQuestion.topic && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[260px]">{activeQuestion.topic}</span>
                </>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {activeQuestion.question}
            </h3>

            {/* 1. MCQ & True/False Renderer */}
            {(activeQuestion.type === 'MCQ' || activeQuestion.type === 'TF') && (
              <div className="space-y-2.5">
                {activeQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === activeQuestion.correctIndex;
                  let optClass =
                    'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-800 dark:text-slate-200';

                  if (isAnswered) {
                    if (isCorrect) {
                      optClass =
                        'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold';
                    } else if (isSelected) {
                      optClass =
                        'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-200 font-bold';
                    } else {
                      optClass =
                        'bg-slate-50/50 dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 text-slate-400 opacity-70';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleSelectMcq(idx)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-colors flex items-center justify-between gap-3 text-xs sm:text-sm cursor-pointer disabled:cursor-default ${optClass}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="break-words">{opt}</span>
                      </div>
                      {isAnswered && (
                        <span className="shrink-0">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          ) : isSelected ? (
                            <XCircle className="w-5 h-5 text-rose-600" />
                          ) : null}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Fill in the Blanks Renderer */}
            {activeQuestion.type === 'FillBlank' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={blankInput}
                    disabled={isAnswered}
                    onChange={(e) => setBlankInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isAnswered && blankInput.trim()) {
                        e.preventDefault();
                        handleCheckFillBlank();
                      }
                    }}
                    placeholder="Type the missing word or phrase..."
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5145F5]/40 disabled:opacity-80"
                  />
                  {!isAnswered && (
                    <button
                      onClick={handleCheckFillBlank}
                      disabled={!blankInput.trim()}
                      className="px-5 py-3 rounded-xl bg-[#5145F5] hover:bg-indigo-700 text-white font-bold text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Check Answer
                    </button>
                  )}
                </div>

                {isAnswered && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                      isCurrentCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {isCurrentCorrect ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">
                        {isCurrentCorrect ? 'Correct!' : 'Not quite right'}
                      </p>
                      <p>
                        Expected answer:{' '}
                        <span className="font-bold">
                          {activeQuestion.options?.[0] || activeQuestion.acceptedAnswers?.[0]}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Match the Following Renderer */}
            {activeQuestion.type === 'MatchFollowing' && activeQuestion.pairs && (() => {
              const totalPairs = activeQuestion.pairs.length;
              const matchedCount = Object.keys(matchSelections).length;
              const activeLeftIdx = activeLeftId
                ? activeQuestion.pairs.findIndex((p) => p.id === activeLeftId)
                : -1;
              const activeRightIdx = activeRightId
                ? shuffledRightPairs.findIndex((r) => r.id === activeRightId)
                : -1;
              const correctMatchCount = activeQuestion.pairs.filter(
                (p) => matchSelections[p.id] === p.id
              ).length;

              return (
              <div className="space-y-4">
                {/* Active Step Guidance Banner */}
                <div
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex flex-wrap items-center justify-between gap-2 ${
                    isAnswered
                      ? isCurrentCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                      : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                  }`}
                >
                  <span>
                    {isAnswered
                      ? `${correctMatchCount} of ${totalPairs} pairs matched correctly.`
                      : activeLeftIdx >= 0
                      ? `Step: Tap a match in Column B for #${activeLeftIdx + 1}`
                      : activeRightIdx >= 0
                      ? `Step: Tap a term in Column A for ${String.fromCharCode(65 + activeRightIdx)}`
                      : matchedCount === totalPairs
                      ? 'All pairs linked! Tap any item to change a match, or check your matches below.'
                      : 'Tap a term in Column A, then tap its matching item in Column B.'}
                  </span>
                  <span className="font-bold tabular-nums shrink-0">
                    {matchedCount}/{totalPairs} paired
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column (Premises) */}
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Column A · Terms
                    </div>
                    {activeQuestion.pairs.map((pair, idx) => {
                      const assignedRightId = matchSelections[pair.id];
                      const assignedRightIndex = shuffledRightPairs.findIndex((r) => r.id === assignedRightId);
                      const assignedLetter = assignedRightIndex >= 0 ? String.fromCharCode(65 + assignedRightIndex) : null;
                      const isActive = activeLeftId === pair.id;
                      const isCorrectMatch = assignedRightId === pair.id;
                      const palette = MATCH_PAIR_STYLES[idx % MATCH_PAIR_STYLES.length];

                      let cls =
                        'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700';
                      if (isAnswered) {
                        cls = isCorrectMatch
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                          : 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200';
                      } else if (isActive) {
                        cls =
                          'border-[#5145F5] bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-2 ring-[#5145F5]/25';
                      } else if (assignedLetter) {
                        cls = `${palette.border} text-slate-900 dark:text-white`;
                      }

                      return (
                        <div
                          key={pair.id}
                          role="button"
                          tabIndex={isAnswered ? -1 : 0}
                          aria-disabled={isAnswered}
                          onClick={() => handlePairLeftClick(pair.id)}
                          onKeyDown={(e) => {
                            if (!isAnswered && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              handlePairLeftClick(pair.id);
                            }
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs sm:text-sm min-h-[48px] ${
                            isAnswered ? 'cursor-default' : 'cursor-pointer'
                          } ${cls}`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-md border flex items-center justify-center text-[11px] font-bold shrink-0 tabular-nums ${
                                assignedLetter || isActive
                                  ? palette.badge
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-semibold break-words leading-snug">{pair.left}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {assignedLetter && (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border tabular-nums ${palette.badge}`}>
                                -&gt; {assignedLetter}
                              </span>
                            )}
                            {!isAnswered && assignedLetter && (
                              <button
                                type="button"
                                onClick={(e) => handleUnmatchLeft(pair.id, e)}
                                aria-label={`Unmatch item ${idx + 1}`}
                                title="Remove this match"
                                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAnswered && (
                              isCorrectMatch ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column (Shuffled Matches) */}
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Column B · Matches
                    </div>
                    {shuffledRightPairs.map((rightPair, rIdx) => {
                      const letter = String.fromCharCode(65 + rIdx);
                      const mappedLeftEntry = Object.entries(matchSelections).find(([, val]) => val === rightPair.id);
                      const mappedLeftIdx = mappedLeftEntry
                        ? activeQuestion.pairs!.findIndex((p) => p.id === mappedLeftEntry[0])
                        : -1;
                      const isRightSelected = activeRightId === rightPair.id;
                      const palette =
                        mappedLeftIdx >= 0
                          ? MATCH_PAIR_STYLES[mappedLeftIdx % MATCH_PAIR_STYLES.length]
                          : null;
                      const wasCorrectlyPaired = matchSelections[rightPair.id] === rightPair.id;

                      let rCls =
                        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700';
                      if (isAnswered) {
                        rCls = wasCorrectlyPaired
                          ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                          : 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200';
                      } else if (isRightSelected) {
                        rCls =
                          'border-[#5145F5] bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-2 ring-[#5145F5]/25';
                      } else if (palette) {
                        rCls = `${palette.border} text-slate-900 dark:text-white`;
                      }

                      return (
                        <button
                          key={rightPair.id}
                          type="button"
                          disabled={isAnswered}
                          onClick={() => handlePairRightClick(rightPair.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-2 text-xs sm:text-sm min-h-[48px] cursor-pointer disabled:cursor-default ${rCls}`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                              {letter}
                            </span>
                            <span className="break-words leading-snug">{rightPair.right}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {mappedLeftIdx >= 0 && palette && (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border tabular-nums ${palette.badge}`}>
                                #{mappedLeftIdx + 1}
                              </span>
                            )}
                            {isAnswered && (
                              wasCorrectlyPaired ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!isAnswered && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMatchSelections({});
                        setActiveRightId(null);
                        setActiveLeftId(activeQuestion.pairs?.[0]?.id || null);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer min-h-[36px] px-2"
                    >
                      Clear Matches
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckMatches}
                      disabled={matchedCount < totalPairs}
                      className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#5145F5] hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Check Matches ({matchedCount}/{totalPairs})
                    </button>
                  </div>
                )}

                {isAnswered && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      isCurrentCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    <p className="font-bold">
                      {isCurrentCorrect
                        ? 'All pairs matched correctly!'
                        : `Correct Pairings (${correctMatchCount}/${totalPairs} matched):`}
                    </p>
                    {!isCurrentCorrect && (
                      <ul className="space-y-1 text-slate-700 dark:text-slate-200">
                        {activeQuestion.pairs.map((p) => (
                          <li key={p.id}>
                            <span className="font-semibold">{p.left}</span> -&gt; {p.right}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              );
            })()}

            {/* Instant Explanation */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Explanation</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {activeQuestion.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next Question CTA */}
            {isAnswered && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5145F5] hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <span>{currentIdx < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
