import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  HelpCircle, 
  Check, 
  RotateCcw, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Sparkles, 
  Plus,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Workspace, QuizQuestionItem } from './WorkspaceTypes';

interface WorkspaceQuizProps {
  workspace: Workspace;
  onQuizSubmitScore?: (score: number) => void;
  onUpdateWorkspace?: (updated: Workspace) => void;
}

export default function WorkspaceQuiz({
  workspace,
  onQuizSubmitScore,
  onUpdateWorkspace
}: WorkspaceQuizProps) {
  const quizzes = workspace.quizzes || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const activeQuestion = quizzes[currentIdx] || null;

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    if (index === activeQuestion.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < quizzes.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
      if (onQuizSubmitScore) {
        onQuizSubmitScore(score);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-yellow-50 dark:bg-yellow-950/50 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Practice Quizzes
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Test and benchmark your mastery of {workspace.name}.
          </p>
        </div>

        {quizzes.length > 0 && !quizFinished && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Question {currentIdx + 1} of {quizzes.length}
            </span>
            <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
              Score: {score}
            </span>
          </div>
        )}
      </div>

      {quizzes.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Quizzes Created Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
            Use the AI Tutor to generate custom practice questions from your active documents.
          </p>
        </div>
      ) : quizFinished ? (
        <div className="max-w-md mx-auto text-center py-12 px-6 bg-slate-50 dark:bg-slate-850 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto text-yellow-600 dark:text-yellow-400">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Quiz Completed!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You scored <span className="font-extrabold text-slate-900 dark:text-white">{score}</span> out of <span className="font-extrabold text-slate-900 dark:text-white">{quizzes.length}</span> ({Math.round((score / quizzes.length) * 100)}%).
          </p>
          <div className="pt-4">
            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Quiz</span>
            </button>
          </div>
        </div>
      ) : activeQuestion ? (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Question Box */}
          <div className="bg-white dark:bg-slate-850 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md bg-yellow-50 dark:bg-yellow-950/60 text-yellow-600 dark:text-yellow-400">
                {activeQuestion.difficulty} Difficulty
              </span>
              <span>{activeQuestion.type}</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {activeQuestion.question}
            </h3>

            {/* Options */}
            <div className="space-y-3">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === activeQuestion.correctIndex;
                let optClass = 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200';

                if (isAnswered) {
                  if (isCorrect) {
                    optClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold';
                  } else if (isSelected) {
                    optClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200 font-bold';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs sm:text-sm cursor-pointer ${optClass}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && (
                      <span>
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : isSelected ? (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        ) : null}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation when answered */}
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explanation</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeQuestion.explanation}
                </p>
              </motion.div>
            )}

            {/* Next button */}
            {isAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <span>{currentIdx < quizzes.length - 1 ? 'Next Question' : 'View Results'}</span>
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
