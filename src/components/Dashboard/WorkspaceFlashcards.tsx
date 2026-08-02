import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Bookmark, 
  Check, 
  AlertCircle,
  TrendingUp,
  X,
  Plus,
  BrainCircuit,
  FileText
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // AI Flashcard Generator States
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [numCards, setNumCards] = useState<number>(10);
  const [difficultyLevel, setDifficultyLevel] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [appendMode, setAppendMode] = useState<boolean>(true); // true = append, false = replace
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (generationIntervalRef.current) {
        clearInterval(generationIntervalRef.current);
      }
    };
  }, []);

  const flashcards = workspace.flashcards;

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (flashcards.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % flashcards.length);
      }
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (flashcards.length > 0) {
        setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
      }
    }, 150);
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('Reading active notes and documents...');
    
    // NotebookLM-style progress steps for high-fidelity interactive experience
    const steps = [
      'Extracting key concepts & core vocabulary...',
      'Drafting active-recall question/answer pairs...',
      'Structuring active recall formats...',
      'Finalizing your personalized study deck!'
    ];
    
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setGenerationStep(steps[stepIdx]);
        stepIdx++;
      }
    }, 1800);
    generationIntervalRef.current = interval;

    try {
      const response = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          notes: workspace.notes,
          files: workspace.files,
          count: numCards,
          difficulty: difficultyLevel
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate flashcards');
      }

      const data = await response.json();
      if (data && data.flashcards) {
        clearInterval(interval);
        generationIntervalRef.current = null;
        setGenerationStep('Integrating new flashcards into your study workspace...');

        setTimeout(() => {
          const generated: FlashcardItem[] = data.flashcards;
          let newFlashcardsList = [...workspace.flashcards];

          if (appendMode) {
            newFlashcardsList = [...newFlashcardsList, ...generated];
          } else {
            newFlashcardsList = generated;
          }

          if (onUpdateWorkspace) {
            onUpdateWorkspace({ flashcards: newFlashcardsList });
          } else {
            // Fallback: Add individually
            generated.forEach(card => onAddFlashcard(card));
          }

          setIsGenerating(false);
          setShowGenerateModal(false);
          setCurrentIndex(appendMode ? workspace.flashcards.length : 0);
        }, 800);
      } else {
        throw new Error('Invalid response data received from the AI engine.');
      }
    } catch (err: any) {
      clearInterval(interval);
      generationIntervalRef.current = null;
      console.error('AI flashcards generation error:', err);
      setGenerationError(err.message || 'An unexpected error occurred during generation. Please try again.');
      setIsGenerating(false);
    }
  };

  const activeCard = flashcards[currentIndex];
  const totalMaterials = workspace.notes.length + workspace.files.length;

  return (
    <div className="space-y-6 text-left" id="flashcards-section-root">
      {/* FLASHCARD SUB-NAV HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3" id="flashcards-header-container">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-extrabold text-sm sm:text-base text-slate-850 dark:text-slate-100">
            Study Deck ({flashcards.length})
          </h3>
        </div>

        {/* REPLACED MANUAL "ADD CARD" OPTION WITH AI GENERATOR */}
        <button
          id="btn-ai-generate-flashcards"
          onClick={() => setShowGenerateModal(true)}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
          <span>Generate with AI</span>
        </button>
      </div>

      {activeCard ? (
        <div className="max-w-xl mx-auto space-y-6" id="study-deck-view">
          {/* 3D FLIP CONTAINER CARD */}
          <div 
            id={`flashcard-3d-wrapper-${activeCard.id}`}
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-80 w-full [perspective:1000px] cursor-pointer"
          >
            <div className={`relative w-full h-full text-center transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              {/* FRONT OF THE CARD */}
              <div className="absolute inset-0 w-full h-full bg-white dark:bg-slate-900 rounded-[24px] border border-slate-150 dark:border-slate-800 p-6 flex flex-col justify-between [backface-visibility:hidden] shadow-lg">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-850 text-slate-500 px-2 py-0.5 rounded-md">
                    {activeCard.topic}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      activeCard.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-950/40 text-green-600' :
                      activeCard.difficulty === 'Medium' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600' :
                      'bg-rose-100 dark:bg-rose-950/40 text-rose-600'
                    }`}>
                      {activeCard.difficulty}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(activeCard.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Bookmark className={`w-4 h-4 ${activeCard.bookmarked ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                    </button>
                  </div>
                </div>

                <div className="py-4">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100 px-4 leading-relaxed">
                    {activeCard.front}
                  </h3>
                </div>

                <div className="flex justify-center items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider animate-pulse">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>Click card to reveal</span>
                </div>
              </div>

              {/* BACK OF THE CARD */}
              <div className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-[24px] border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-center [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-lg">
                <div className="absolute top-6 left-6 text-slate-400">
                  <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md">
                    Correct Answer
                  </span>
                </div>

                <div className="py-4 overflow-y-auto max-h-56">
                  <p className="text-xs sm:text-sm font-semibold text-slate-750 dark:text-slate-200 px-4 leading-relaxed whitespace-pre-line text-center">
                    {activeCard.back}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PROGRESS SELECTION CONTROLS */}
          <div className="flex items-center justify-between p-2" id="flashcards-navigator">
            <button 
              onClick={handlePrev}
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-350 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="text-xs font-black text-slate-400 font-mono">
              {currentIndex + 1} of {flashcards.length}
            </span>

            <button 
              onClick={handleNext}
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-350 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 max-w-xl mx-auto" id="empty-flashcards-view">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">You haven't created any flashcards yet.</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Let AI analyze your study materials and generate practice flashcards in seconds.
            </p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow shadow-emerald-600/20 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate with AI</span>
          </button>
        </div>
      )}

      {/* NEW AI GENERATOR MODAL: ASKS QUANTITY AND LEVEL AND CREATES AUTOMATICALLY */}
      <AnimatePresence>
        {showGenerateModal && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="ai-generate-modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full relative space-y-5"
              id="ai-generate-modal-content"
            >
              {!isGenerating && (
                <button 
                  onClick={() => setShowGenerateModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  id="btn-close-generate-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">AI Flashcard Generator</h3>
                  <p className="text-[11px] font-medium text-slate-400">Generate structured active recall study decks using AI</p>
                </div>
              </div>

              {isGenerating ? (
                /* LOADING / GENERATION PROGRESS STATE */
                <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center" id="generation-loading-state">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-emerald-600 dark:border-t-emerald-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-150 animate-pulse">
                      {generationStep}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold max-w-xs leading-relaxed">
                      This takes about 5 to 10 seconds. AI is scanning your workspace references to assemble educational cards.
                    </p>
                  </div>
                </div>
              ) : (
                /* CONFIGURATION FORM STATE */
                <div className="space-y-5 text-xs">
                  {generationError && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/50 rounded-2xl text-rose-600 dark:text-rose-400 font-semibold leading-relaxed flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{generationError}</span>
                    </div>
                  )}

                  {/* WORKSPACE CONTENT CONTEXT BADGE */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span className="font-bold text-slate-600 dark:text-slate-350">Grounding Context</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] rounded-lg">
                      {workspace.notes.length} notes & {workspace.files.length} resources
                    </span>
                  </div>

                  {/* 1. HOW MANY FLASHCARDS */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      How many flashcards do you need?
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNumCards(num)}
                          className={`py-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                            numCards === num
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow shadow-emerald-600/15'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                        >
                          {num} Cards
                        </button>
                      ))}
                    </div>
                    {/* CUSTOM INPUT OPTION */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold">Or enter custom count:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={numCards}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) setNumCards(Math.min(30, Math.max(1, val)));
                        }}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-755 bg-slate-50 dark:bg-slate-950 font-bold text-center text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* 2. WHICH LEVEL */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Which difficulty level?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setDifficultyLevel(level)}
                          className={`py-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                            difficultyLevel === level
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow shadow-emerald-600/15'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. INTEGRATION MODE */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Deck Integration Options
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAppendMode(true)}
                        className={`p-2.5 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                          appendMode
                            ? 'border-emerald-500 bg-emerald-500/5 text-slate-800 dark:text-slate-150'
                            : 'border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        <p className="font-extrabold text-[11px]">Append Cards</p>
                        <p className="text-[9px] text-slate-400 leading-tight">Keep current deck and append the generated cards.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppendMode(false)}
                        className={`p-2.5 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                          !appendMode
                            ? 'border-emerald-500 bg-emerald-500/5 text-slate-800 dark:text-slate-150'
                            : 'border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        <p className="font-extrabold text-[11px]">Replace Deck</p>
                        <p className="text-[9px] text-slate-400 leading-tight">Remove existing flashcards and generate a fresh study deck.</p>
                      </button>
                    </div>
                  </div>

                  {totalMaterials === 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-medium leading-relaxed">
                      You haven't uploaded any study materials yet. The AI will generate general knowledge flashcards instead.
                    </div>
                  )}

                  {/* ACTIONS */}
                  <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowGenerateModal(false)}
                      className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl font-bold text-slate-500 dark:text-slate-400 cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-600/10 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Deck</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
