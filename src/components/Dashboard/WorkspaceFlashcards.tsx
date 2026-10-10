import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  Check, 
  Plus, 
  Sparkles, 
  Volume2, 
  Share2,
  Trash2,
  BrainCircuit,
  Award
} from 'lucide-react';
import { Workspace, FlashcardItem } from './WorkspaceTypes';

interface WorkspaceFlashcardsProps {
  workspace: Workspace;
  onAddFlashcard: (card: FlashcardItem) => void;
  onToggleBookmark: (cardId: string) => void;
  onBoxChange: (cardId: string, box: 1 | 2 | 3) => void;
  onUpdateWorkspace?: (updatedFields: Partial<Workspace>) => void;
}

export default function WorkspaceFlashcards({
  workspace,
  onAddFlashcard,
  onToggleBookmark,
  onBoxChange,
  onUpdateWorkspace
}: WorkspaceFlashcardsProps) {
  const cards = workspace.flashcards || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeBoxFilter, setActiveBoxFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [frontInput, setFrontInput] = useState('');
  const [backInput, setBackInput] = useState('');
  const [topicInput, setTopicInput] = useState(workspace.subject || 'General');

  const filteredCards = cards.filter(c => activeBoxFilter === 'all' || c.box === activeBoxFilter);
  const currentCard = filteredCards[currentIndex] || null;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(Math.max(0, filteredCards.length - 1));
    }
  };

  const handleBoxSelect = (box: 1 | 2 | 3) => {
    if (currentCard) {
      onBoxChange(currentCard.id, box);
      handleNext();
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontInput.trim() || !backInput.trim()) return;

    const newCard: FlashcardItem = {
      id: `fc-${Date.now()}`,
      front: frontInput.trim(),
      back: backInput.trim(),
      topic: topicInput.trim() || workspace.subject || 'Core Topic',
      difficulty: 'Medium',
      box: 1,
      bookmarked: false
    };

    onAddFlashcard(newCard);
    setFrontInput('');
    setBackInput('');
    setIsAddingCard(false);
    setCurrentIndex(filteredCards.length);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Spaced Repetition Flashcards
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Active recall powered by Leitner 3-Box spaced repetition for {workspace.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddingCard(!isAddingCard)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingCard ? 'Close Form' : 'New Flashcard'}</span>
          </button>
        </div>
      </div>

      {/* Box Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {(['all', 1, 2, 3] as const).map((filter) => {
            const count = filter === 'all' 
              ? cards.length 
              : cards.filter(c => c.box === filter).length;
            const label = filter === 'all' ? 'All Cards' : `Box ${filter}`;
            const isActive = activeBoxFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => {
                  setActiveBoxFilter(filter);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {filteredCards.length > 0 && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Card {currentIndex + 1} of {filteredCards.length}
          </span>
        )}
      </div>

      {/* Add Card Form Modal / Collapsible */}
      <AnimatePresence>
        {isAddingCard && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateSubmit}
            className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Create New Flashcard
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Front (Question or Prompt)</label>
                <textarea
                  required
                  rows={3}
                  value={frontInput}
                  onChange={(e) => setFrontInput(e.target.value)}
                  placeholder="e.g. What is the formula for kinetic energy?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Back (Answer or Explanation)</label>
                <textarea
                  required
                  rows={3}
                  value={backInput}
                  onChange={(e) => setBackInput(e.target.value)}
                  placeholder="e.g. KE = 0.5 * m * v^2"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                Save Flashcard
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Main Flashcard Stage */}
      {filteredCards.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Flashcards in this Box</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
            Add new flashcards or switch box filters to start studying.
          </p>
          <button
            onClick={() => setIsAddingCard(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
          >
            Create Flashcard
          </button>
        </div>
      ) : currentCard ? (
        <div className="max-w-xl mx-auto space-y-6">
          {/* Card Surface */}
          <div
            onClick={handleFlip}
            className="w-full min-h-[300px] bg-white dark:bg-slate-850 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-lg p-8 flex flex-col justify-between cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition-all select-none relative group"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                {currentCard.topic}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400">
                  Box {currentCard.box}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBookmark(currentCard.id);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    currentCard.bookmarked
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-400 hover:text-amber-500'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${currentCard.bookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Content (Front or Back) */}
            <div className="py-8 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                {isFlipped ? 'Answer (Click to flip)' : 'Question (Click to flip)'}
              </span>
              <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            {/* Bottom Flip Indicator */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 group-hover:text-emerald-600 transition-colors">
              <RotateCw className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">Click anywhere to flip</span>
            </div>
          </div>

          {/* Controls: Box Buttons & Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              title="Previous Card"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Spaced Repetition Box Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBoxSelect(1)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 transition-all cursor-pointer"
                title="Needs practice: Move to Box 1"
              >
                Hard (Box 1)
              </button>
              <button
                onClick={() => handleBoxSelect(2)}
                className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-100 transition-all cursor-pointer"
                title="Good recall: Move to Box 2"
              >
                Medium (Box 2)
              </button>
              <button
                onClick={() => handleBoxSelect(3)}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer"
                title="Mastered: Move to Box 3"
              >
                Easy (Box 3)
              </button>
            </div>

            <button
              onClick={handleNext}
              className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              title="Next Card"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
