import React from 'react';
import { Award, Sparkles, ArrowRight } from 'lucide-react';
import { Workspace } from './WorkspaceTypes';
import InteractiveQuizRunner from './InteractiveQuizRunner';
import { PendingQuizIntent } from '../../utils/quizHistoryStorage';

interface WorkspaceQuizProps {
  workspace: Workspace;
  onQuizSubmitScore?: (score: number) => void;
  onUpdateWorkspace?: (updated: Workspace) => void;
}

export default function WorkspaceQuiz({
  workspace,
  onQuizSubmitScore
}: WorkspaceQuizProps) {
  const quizzes = workspace.quizzes || [];

  const handleOpenQuizHub = (autoStart = false) => {
    const intent: PendingQuizIntent = {
      sourceType: 'uploaded',
      workspaceId: workspace.id,
      autoStart
    };
    window.dispatchEvent(new CustomEvent('studyweb-open-quizzes-intent', { detail: intent }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-[#5145F5] dark:text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Quizzes
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Practice quizzes generated for {workspace.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenQuizHub(false)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5145F5] hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Create Custom Quiz</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="py-16 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <Award className="w-11 h-11 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Quizzes Created Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Analyze your workspace materials or search internet resources in Quizzes to build MCQ, Fill in the Blanks, or Match the Following quizzes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenQuizHub(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5145F5] hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Quizzes Builder</span>
          </button>
        </div>
      ) : (
        <InteractiveQuizRunner
          title={`${workspace.name} Quiz`}
          subtitle={`${quizzes.length} Questions`}
          questions={quizzes}
          onComplete={(score) => {
            onQuizSubmitScore?.(score);
          }}
        />
      )}
    </div>
  );
}
