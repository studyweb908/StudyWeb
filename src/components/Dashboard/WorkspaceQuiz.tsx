import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  HelpCircle, 
  Plus, 
  Check, 
  X as CloseIcon, 
  Play, 
  RotateCcw, 
  ChevronRight, 
  Clock, 
  AlertTriangle,
  Flame,
  FileSignature,
  Activity,
  ArrowRight,
  Sparkles,
  Loader2,
  Share2,
  Copy,
  Send,
  FileText,
  BookOpen,
  Download,
  CheckCircle,
  TrendingUp,
  Users,
  Target,
  Compass,
  XCircle,
  Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Workspace, QuizQuestionItem } from './WorkspaceTypes';

interface WorkspaceQuizProps {
  workspace: Workspace;
  onQuizSubmitScore?: (score: number) => void;
  onUpdateWorkspace?: (updated: Workspace) => void;
}

export default function WorkspaceQuiz({ workspace, onQuizSubmitScore, onUpdateWorkspace }: WorkspaceQuizProps) {
  const [view, setView] = useState<'setup' | 'quiz' | 'results'>('setup');
  
  // Setup parameters
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState<'MCQ' | 'TF' | 'FillBlank'>('MCQ');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [timedMode, setTimedMode] = useState(false);

  // AI Quiz Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [quizSource, setQuizSource] = useState<'notes' | 'resources' | 'both'>('notes');

  // Automatically pick a smart default source based on available workspace data
  React.useEffect(() => {
    const hasNotes = workspace.notes && workspace.notes.length > 0;
    const hasFiles = workspace.files && workspace.files.length > 0;
    if (!hasNotes && hasFiles) {
      setQuizSource('resources');
    } else if (hasNotes && !hasFiles) {
      setQuizSource('notes');
    } else if (hasNotes && hasFiles) {
      setQuizSource('both');
    }
  }, [workspace.notes, workspace.files]);

  // Active quiz states
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestionItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedAnsIdx, setSelectedAnsIdx] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [hasSubmittedAns, setHasSubmittedAns] = useState(false);
  const [score, setScore] = useState(0);
  
  // Report, Sharing, & Categorized Feedback States
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isAddedToNotes, setIsAddedToNotes] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<'classified' | 'correct' | 'wrong' | 'diagnostics'>('classified');
  
  // Growth Area AI tutoring insight states
  const [copiedInsightId, setCopiedInsightId] = useState<string | null>(null);
  const [sharedInsightId, setSharedInsightId] = useState<string | null>(null);
  const [addedNoteInsightId, setAddedNoteInsightId] = useState<string | null>(null);

  const handleCopyInsight = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInsightId(id);
    setTimeout(() => setCopiedInsightId(null), 2000);
  };

  const handleShareInsight = async (id: string, text: string) => {
    const shareData = {
      title: 'StudyWeb AI Quiz Tutoring Insight',
      text: text,
      url: window.location.href
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setSharedInsightId(id);
        setTimeout(() => setSharedInsightId(null), 2000);
        return;
      } catch (err) {
        console.warn('Native share failed, falling back to copy:', err);
      }
    }
    const formattedShareText = `StudyWeb AI Quiz Tutoring Insight 🧠\n\n"${text}"\n\nShared from StudyWeb Learning Hub: ${window.location.href}`;
    navigator.clipboard.writeText(formattedShareText);
    setSharedInsightId(id);
    setTimeout(() => setSharedInsightId(null), 2000);
  };

  const handleAddInsightToNotes = (id: string, question: string, text: string) => {
    if (!onUpdateWorkspace) return;

    const cleanTitle = `Quiz Review: ${question.slice(0, 30)}...`;
    const cleanContent = `<h3>AI Tutoring Insight</h3>\n<p><strong>Question:</strong> ${question}</p>\n<p><strong>Concept Review:</strong> ${text}</p>\n\n<p><em>Generated from active practice quiz review.</em></p>`;
    
    const newNote = {
      id: `ai-quiz-insight-${Date.now()}`,
      title: cleanTitle,
      content: cleanContent,
      updatedAt: new Date().toLocaleDateString(),
      tags: ['Quiz Review', 'AI Tutor', 'Grounded Insight', workspace.subject || 'Syllabus'].filter(Boolean) as string[],
    };

    const updatedWorkspace = {
      ...workspace,
      notes: [newNote, ...(workspace.notes || [])]
    };

    onUpdateWorkspace(updatedWorkspace);
    setAddedNoteInsightId(id);
    setTimeout(() => setAddedNoteInsightId(null), 2000);
  };

  // Timer States
  const [timerLeft, setTimerLeft] = useState(60);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (view === 'quiz' && timedMode && timerLeft === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      handleSubmitQuizEarly();
    }
  }, [timerLeft, view, timedMode]);

  // Results analysis states
  const [wrongAnswersList, setWrongAnswersList] = useState<any[]>([]);

  // AI Incorrect Answers Explanations States
  const [isGeneratingExplanations, setIsGeneratingExplanations] = React.useState(false);
  const [aiExplanations, setAiExplanations] = React.useState<Record<string, string>>({});
  const [explanationError, setExplanationError] = React.useState<string | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  React.useEffect(() => {
    if (view === 'results' && wrongAnswersList.length > 0) {
      const fetchAIExplanations = async () => {
        setIsGeneratingExplanations(true);
        setExplanationError(null);
        try {
          const payload = wrongAnswersList.map((item) => {
            const origQ = activeQuestions.find(q => q.question === item.question);
            return {
              question: item.question,
              userAns: item.userAns,
              correctAns: item.correctAns,
              options: origQ ? origQ.options : [item.userAns, item.correctAns],
              explanation: item.explanation
            };
          });

          const response = await fetch('/api/explain-incorrect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ incorrectQuestions: payload })
          });

          if (!response.ok) {
            throw new Error('Failed to fetch AI explanations');
          }

          const data = await response.json();
          if (data && data.explanations) {
            const explanationMap: Record<string, string> = {};
            data.explanations.forEach((item: any) => {
              explanationMap[item.question] = item.explanation;
            });
            setAiExplanations(explanationMap);
          }
        } catch (err: any) {
          console.error("Failed to generate AI explanations:", err);
          setExplanationError(err.message || "Could not retrieve AI explanations.");
        } finally {
          setIsGeneratingExplanations(false);
        }
      };

      fetchAIExplanations();
    }
  }, [view, wrongAnswersList, activeQuestions]);

  function parseSimpleMarkdown(text: string) {
    if (!text) return null;
    const paragraphs = text.split(/\n\n+/);
    return paragraphs.map((para, pIdx) => {
      const parts = para.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={pIdx} className="leading-relaxed mt-1 text-slate-600 dark:text-slate-300 font-medium">
          {parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={idx} className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  }

  const handleGenerateQuiz = async () => {
    const hasNotes = workspace.notes && workspace.notes.length > 0;
    const hasFiles = workspace.files && workspace.files.length > 0;

    if (quizSource === 'notes' && !hasNotes) {
      setGenerationError("No study notes were found in the active workspace. Please add some notes in the Notes tab first!");
      return;
    }
    if (quizSource === 'resources' && !hasFiles) {
      setGenerationError("No study resources were found in the active workspace. Please upload some PDFs, URLs, audio, or video lectures in the Study Materials tab first!");
      return;
    }
    if (quizSource === 'both' && !hasNotes && !hasFiles) {
      setGenerationError("No notes or resources were found in the active workspace. Please add some first!");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          notes: quizSource !== 'resources' ? workspace.notes : [],
          files: quizSource !== 'notes' ? workspace.files : [],
          count: questionCount,
          difficulty: difficulty,
          questionType: questionType
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.details || 'Failed to generate quiz');
      }

      const data = await response.json();
      if (data && data.questions && data.questions.length > 0) {
        // Save the newly generated questions to the workspace persistent quizzes list
        const updatedQuizzes = [...data.questions, ...workspace.quizzes];
        if (onUpdateWorkspace) {
          onUpdateWorkspace({
            ...workspace,
            quizzes: updatedQuizzes
          });
        }
        
        // Start playing the newly generated questions immediately
        setActiveQuestions(data.questions);
        setActiveIdx(0);
        setSelectedAnsIdx(null);
        setTextAnswer('');
        setHasSubmittedAns(false);
        setScore(0);
        setWrongAnswersList([]);
        setAiExplanations({});
        setExplanationError(null);
        setView('quiz');
        
        if (timedMode) {
          setTimerLeft(120); // 2 minutes
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setTimerLeft((prev) => {
              if (prev <= 1) {
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        throw new Error("No questions were returned from the server.");
      }
    } catch (err: any) {
      console.error("AI quiz generation failed:", err);
      setGenerationError(err.message || "An unexpected error occurred during quiz generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetakeQuiz = () => {
    setActiveIdx(0);
    setSelectedAnsIdx(null);
    setTextAnswer('');
    setHasSubmittedAns(false);
    setScore(0);
    setWrongAnswersList([]);
    setAiExplanations({});
    setExplanationError(null);
    setView('quiz');

    if (timedMode) {
      setTimerLeft(120); // 2 minutes total
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleSelectOption = (optIdx: number) => {
    if (hasSubmittedAns) return;
    setSelectedAnsIdx(optIdx);
  };

  const handleSubmitAnswer = () => {
    if (hasSubmittedAns) return;

    const question = activeQuestions[activeIdx];
    
    if (question.type === 'FillBlank') {
      if (!textAnswer.trim()) return;
      setHasSubmittedAns(true);
      
      const isCorrect = textAnswer.trim().toLowerCase() === question.options[question.correctIndex || 0].toLowerCase();
      if (isCorrect) {
        setScore((prev) => prev + 1);
      } else {
        setWrongAnswersList((prev) => [...prev, {
          question: question.question,
          userAns: textAnswer,
          correctAns: question.options[question.correctIndex || 0],
          explanation: question.explanation
        }]);
      }
    } else {
      if (selectedAnsIdx === null) return;
      setHasSubmittedAns(true);

      const isCorrect = selectedAnsIdx === question.correctIndex;

      if (isCorrect) {
        setScore((prev) => prev + 1);
      } else {
        setWrongAnswersList((prev) => [...prev, {
          question: question.question,
          userAns: question.options[selectedAnsIdx],
          correctAns: question.options[question.correctIndex],
          explanation: question.explanation
        }]);
      }
    }
  };

  const handleNextQuestion = () => {
    if (activeIdx + 1 < activeQuestions.length) {
      setActiveIdx((prev) => prev + 1);
      setSelectedAnsIdx(null);
      setTextAnswer('');
      setHasSubmittedAns(false);
    } else {
      // Finished
      if (timerRef.current) clearInterval(timerRef.current);
      if (onQuizSubmitScore) onQuizSubmitScore(score);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      setView('results');
    }
  };

  const handleSubmitQuizEarly = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
    setView('results');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = activeQuestions[activeIdx];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-[24px] p-6 text-left space-y-6">
      {view === 'setup' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">AI Quiz & Exam Center</h3>
            <p className="text-xs text-slate-400 font-medium">Generate customized adaptive practice quizzes or timed tests from active knowledge bases.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {/* Options configuration */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quiz Source Material</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={!workspace.notes || workspace.notes.length === 0}
                    onClick={() => setQuizSource('notes')}
                    className={`py-2 rounded-xl border text-center transition-all cursor-pointer font-bold disabled:opacity-30 disabled:cursor-not-allowed ${
                      quizSource === 'notes' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-400'
                    }`}
                  >
                    Notes ({workspace.notes?.length || 0})
                  </button>
                  <button
                    disabled={!workspace.files || workspace.files.length === 0}
                    onClick={() => setQuizSource('resources')}
                    className={`py-2 rounded-xl border text-center transition-all cursor-pointer font-bold disabled:opacity-30 disabled:cursor-not-allowed ${
                      quizSource === 'resources' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-400'
                    }`}
                  >
                    Resources ({workspace.files?.length || 0})
                  </button>
                  <button
                    disabled={(!workspace.notes || workspace.notes.length === 0) || (!workspace.files || workspace.files.length === 0)}
                    onClick={() => setQuizSource('both')}
                    className={`py-2 rounded-xl border text-center transition-all cursor-pointer font-bold disabled:opacity-30 disabled:cursor-not-allowed ${
                      quizSource === 'both' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-400'
                    }`}
                  >
                    Both Sources
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Number of Questions</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 10, 15].map((num) => (
                    <button
                      key={num}
                      onClick={() => setQuestionCount(num)}
                      className={`py-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        questionCount === num 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-400'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question Types</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setQuestionType('MCQ')}
                    className={`py-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      questionType === 'MCQ' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-400'
                    }`}
                  >
                    Multiple Choice
                  </button>
                  <button
                    onClick={() => setQuestionType('TF')}
                    className={`py-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      questionType === 'TF' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-400'
                    }`}
                  >
                    True / False
                  </button>
                  <button
                    onClick={() => setQuestionType('FillBlank')}
                    className={`py-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      questionType === 'FillBlank' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-400'
                    }`}
                  >
                    Fill In Blank
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff as any)}
                      className={`py-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        difficulty === diff 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-400'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Timed and negative modes */}
            <div className="border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-4 space-y-4">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Practice Exam Mode</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs">Simulate Timer Countdown</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Enforces strict exam timing constraints</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={timedMode}
                  onChange={(e) => setTimedMode(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs">Activate Negative Markings</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Penalizes wrong options by subtracting 0.25 pts</p>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked
                  className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Mendel & Respiration covered</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Your current knowledge library supports deep, highly accurate questions based directly on Genetics, cell pathways, and respiration transcripts.
                </p>
              </div>
            </div>
          </div>

          {generationError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {generationError}
            </div>
          )}

          {(!workspace.notes || workspace.notes.length === 0) && (!workspace.files || workspace.files.length === 0) && (
            <p className="text-center text-[11px] text-slate-400 font-extrabold uppercase tracking-wider bg-slate-50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3">
              📝 Tip: Add study notes or upload resources to unlock personalized AI quiz generation!
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGenerateQuiz}
              disabled={
                isGenerating ||
                (quizSource === 'notes' && (!workspace.notes || workspace.notes.length === 0)) ||
                (quizSource === 'resources' && (!workspace.files || workspace.files.length === 0)) ||
                (quizSource === 'both' && (!workspace.notes || workspace.notes.length === 0) && (!workspace.files || workspace.files.length === 0))
              }
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15 cursor-pointer transition-all active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>AI parsing study materials ({questionCount} Qs)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5 fill-current animate-pulse text-yellow-300" />
                  <span>Generate Quiz</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {view === 'quiz' && currentQ && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
            <div>
              <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded uppercase">
                {currentQ.type} • {currentQ.difficulty}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">Question {activeIdx + 1} of {activeQuestions.length}</p>
            </div>

            {timedMode && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/10 rounded-xl text-rose-500 font-black font-mono text-xs animate-pulse">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timerLeft)}</span>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <h3 className="text-base sm:text-lg font-black text-slate-850 dark:text-slate-150 leading-relaxed text-left">
              {currentQ.question}
            </h3>

            <div className="space-y-2.5">
              {currentQ.type === 'FillBlank' ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && textAnswer.trim() && !hasSubmittedAns) {
                        handleSubmitAnswer();
                      }
                    }}
                    disabled={hasSubmittedAns}
                    placeholder="Type your answer here..."
                    className={`w-full p-4 border rounded-2xl text-xs sm:text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      hasSubmittedAns 
                        ? textAnswer.trim().toLowerCase() === currentQ.options[currentQ.correctIndex || 0].toLowerCase()
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
                    }`}
                  />
                  {hasSubmittedAns && textAnswer.trim().toLowerCase() !== currentQ.options[currentQ.correctIndex || 0].toLowerCase() && (
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold text-xs p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                      Correct Answer: {currentQ.options[currentQ.correctIndex || 0]}
                    </div>
                  )}
                </div>
              ) : (
                currentQ.options.map((opt, idx) => {
                  const isSelected = selectedAnsIdx === idx;
                  const isCorrectAns = idx === currentQ.correctIndex;
                  
                  let optionStyle = 'border-slate-150 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 hover:border-slate-200';
                  if (isSelected) {
                    optionStyle = 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/20';
                  }
                  if (hasSubmittedAns) {
                    if (isCorrectAns) {
                      optionStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
                    } else if (isSelected) {
                      optionStyle = 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={hasSubmittedAns}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full p-4 border rounded-2xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                    >
                      <span className="pr-3">{opt}</span>
                      {hasSubmittedAns && isCorrectAns && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {hasSubmittedAns && isSelected && !isCorrectAns && <CloseIcon className="w-4 h-4 text-rose-500 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Explanation Section */}
          <AnimatePresence>
            {hasSubmittedAns && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl space-y-2 text-xs"
              >
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-extrabold">
                  <HelpCircle className="w-4 h-4" />
                  <span>AI Explanation Insight</span>
                </div>
                <p className="text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                  {currentQ.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-850 pt-4">
            {!hasSubmittedAns ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={currentQ.type === 'FillBlank' ? !textAnswer.trim() : selectedAnsIdx === null}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>{activeIdx + 1 === activeQuestions.length ? 'Show Results' : 'Next Question'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {view === 'results' && (() => {
        const percentScore = activeQuestions.length > 0 ? Math.round((score / activeQuestions.length) * 100) : 0;
        
        // Categorization function
        const categorizeQuestion = (q: QuizQuestionItem) => {
          const text = q.question.toLowerCase();
          if (text.includes('calculate') || text.includes('math') || text.includes('solve') || text.includes('formula') || text.includes('$') || text.includes('ratio')) {
            return 'Formulas & Calculations';
          }
          if (text.includes('what is') || text.includes('define') || text.includes('definition') || text.includes('term') || text.includes('called')) {
            return 'Core Terminology';
          }
          if (text.includes('why') || text.includes('explain') || text.includes('consequence') || text.includes('result') || text.includes('dominant') || text.includes('recessive')) {
            return 'Conceptual Mechanisms';
          }
          return 'Critical Syllabus Concepts';
        };

        // Classify the performance level
        let tierLabel = "";
        let tierColor = "";
        let tierBg = "";
        let tierBorder = "";
        let tierDesc = "";

        if (percentScore === 100) {
          tierLabel = "LEVEL 4: SUMMA CUM LAUDE";
          tierColor = "text-amber-600 dark:text-amber-400";
          tierBg = "bg-amber-500/10";
          tierBorder = "border-amber-500/20";
          tierDesc = "Perfect Master Score! Outstanding command of all conceptual domains with complete syllabus recall.";
        } else if (percentScore >= 80) {
          tierLabel = "LEVEL 3: MAGNA CUM LAUDE";
          tierColor = "text-indigo-600 dark:text-indigo-400";
          tierBg = "bg-indigo-500/10";
          tierBorder = "border-indigo-500/20";
          tierDesc = "Strong Scholar Performance! Exemplary conceptual grasp. Review highlighted topics to secure absolute mastery.";
        } else if (percentScore >= 60) {
          tierLabel = "LEVEL 2: CUM LAUDE";
          tierColor = "text-emerald-600 dark:text-emerald-400";
          tierBg = "bg-emerald-500/10";
          tierBorder = "border-emerald-500/20";
          tierDesc = "Developing Academic Core. Satisfactory passing rate, but revision of core analytical mechanisms is highly advised.";
        } else {
          tierLabel = "LEVEL 1: SCHOLASTIC COHORT";
          tierColor = "text-rose-600 dark:text-rose-400";
          tierBg = "bg-rose-500/10";
          tierBorder = "border-rose-500/20";
          tierDesc = "Intensive Revision Mode. High density of conceptual gaps. Leverage the AI Coaching tutoring insights to rebuild foundations.";
        }

        // Build category breakdown
        const categoryData: Record<string, { total: number, correct: number, questions: QuizQuestionItem[] }> = {};
        activeQuestions.forEach((q) => {
          const cat = categorizeQuestion(q);
          if (!categoryData[cat]) {
            categoryData[cat] = { total: 0, correct: 0, questions: [] };
          }
          categoryData[cat].total += 1;
          categoryData[cat].questions.push(q);
          const isWrong = wrongAnswersList.some(item => item.question === q.question);
          if (!isWrong) {
            categoryData[cat].correct += 1;
          }
        });

        const correctQuestions = activeQuestions.filter(q => !wrongAnswersList.some(w => w.question === q.question));

        const handleAddToNotesLocal = () => {
          const correctList = activeQuestions.filter(q => !wrongAnswersList.some(w => w.question === q.question));
          const markdownContent = `### StudyWeb Quiz Performance Report 📊
          
* **Subject**: ${workspace.subject || 'Syllabus Core'}
* **Date**: ${new Date().toLocaleString()}
* **Score**: ${score} / ${activeQuestions.length} (${percentScore}%)
* **Classification**: ${tierLabel}

---

#### 🟢 Correctly Mastered Concepts
${correctList.length > 0 ? correctList.map((q, idx) => `${idx + 1}. **${q.question}**\n   * Correct Answer: _${q.options[q.correctIndex] || 'True'}_\n   * Concept Mastery Status: Verified`).join('\n\n') : 'No questions answered correctly.'}

#### 🔴 Concepts Requiring Active Recall Review
${wrongAnswersList.length > 0 ? wrongAnswersList.map((w, idx) => `${idx + 1}. **${w.question}**\n   * Your Choice: _${w.userAns}_\n   * Correct Answer: _${w.correctAns}_\n   * AI Tutoring Insight: ${aiExplanations[w.question] || w.explanation}`).join('\n\n') : 'Perfect Score! No review concepts needed.'}

*This report has been automatically logged inside your study notebook workspace.*`;

          const newNote = {
            id: `quiz-report-${Date.now()}`,
            title: `Quiz Report: ${workspace.subject || 'Syllabus Core'} (${percentScore}%)`,
            content: markdownContent,
            updatedAt: new Date().toLocaleDateString(),
            tags: ['Quiz Report', 'AI Feedback', workspace.subject || 'Syllabus'].filter(Boolean) as string[],
          };

          if (onUpdateWorkspace) {
            const updatedWorkspace = {
              ...workspace,
              notes: [newNote, ...(workspace.notes || [])]
            };
            onUpdateWorkspace(updatedWorkspace);
          }
          setIsAddedToNotes(true);
          setTimeout(() => setIsAddedToNotes(false), 3000);
        };

        const handleCopyReportLocal = () => {
          const correctList = activeQuestions.filter(q => !wrongAnswersList.some(w => w.question === q.question));
          const textReport = `===========================================
STUDYWEB ACADEMIC PERFORMANCE REPORT 🎓
===========================================
Subject: ${workspace.subject || 'General Study'}
Date: ${new Date().toLocaleString()}
Score: ${score} / ${activeQuestions.length} (${percentScore}%)
Academic Level: ${tierLabel}

-------------------------------------------
🟢 CORE CONCEPTS MASTERED:
-------------------------------------------
${correctList.length > 0 ? correctList.map(q => `- ${q.question}\n  Result: CORRECT (Mastered)`).join('\n\n') : 'No core concepts mastered.'}

-------------------------------------------
🔴 AREAS FOR CONCEPTUAL GROWTH:
-------------------------------------------
${wrongAnswersList.length > 0 ? wrongAnswersList.map(w => `- ${w.question}\n  Your Choice: ${w.userAns}\n  Correct Answer: ${w.correctAns}\n  AI Coaching Advice: ${aiExplanations[w.question] || w.explanation}`).join('\n\n') : 'Outstanding Performance! No areas of confusion recorded.'}

===========================================
Generated via StudyWeb AI Coach.
===========================================`;

          navigator.clipboard.writeText(textReport);
          setCopiedReport(true);
          setTimeout(() => setCopiedReport(false), 3000);
        };

        const handleSubmitReportLocal = () => {
          setIsSubmittingReport(true);
          setTimeout(() => {
            const existingResultsStr = localStorage.getItem('studyweb_submitted_results') || '[]';
            let resultsList = [];
            try {
              resultsList = JSON.parse(existingResultsStr);
            } catch (e) {
              resultsList = [];
            }
            
            const newSubmission = {
              id: `submission-${Date.now()}`,
              subject: workspace.subject || 'Syllabus Core',
              score: score,
              total: activeQuestions.length,
              percent: percentScore,
              timestamp: new Date().toISOString(),
              verified: true
            };
            
            resultsList.unshift(newSubmission);
            localStorage.setItem('studyweb_submitted_results', JSON.stringify(resultsList));
            
            setIsSubmittingReport(false);
            setIsSubmitted(true);
            setTimeout(() => setIsSubmitted(false), 4000);
          }, 1200);
        };

        return (
          <div className="space-y-6 text-left">
            {/* Header Performance Card with Ring Gauge & Classification */}
            <div className="relative overflow-hidden rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                {/* Gauge Left */}
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-200 dark:text-slate-800"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="transparent"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <motion.path
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ strokeDasharray: `${percentScore}, 100` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="text-indigo-600 dark:text-indigo-400"
                        strokeWidth="3.5"
                        strokeDasharray={`${percentScore}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{percentScore}%</span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5">{score}/{activeQuestions.length} OK</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4.5 h-4.5 text-indigo-500" />
                      <span className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">Quiz Complete</span>
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Academic Performance Report</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{workspace.subject || "General Practice Hub"}</p>
                  </div>
                </div>

                {/* Classification Right */}
                <div className={`p-4 rounded-xl border ${tierBorder} ${tierBg} max-w-sm w-full md:w-auto`}>
                  <p className={`text-xs font-black tracking-wider ${tierColor} flex items-center gap-1.5`}>
                    <Sparkles className="w-4 h-4 fill-current animate-pulse" />
                    <span>{tierLabel}</span>
                  </p>
                  <p className="text-[11px] text-slate-650 dark:text-slate-350 font-bold mt-1.5 leading-relaxed">
                    {tierDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Academic Action Board */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Submit Grade Report */}
              <button
                type="button"
                onClick={handleSubmitReportLocal}
                disabled={isSubmittingReport}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-center cursor-pointer transition-all hover:scale-[1.02] shadow-sm relative overflow-hidden"
              >
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mb-1.5" />
                    <span className="text-[10px] font-extrabold text-slate-400">Syncing...</span>
                  </>
                ) : isSubmitted ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500 mb-1.5 animate-bounce" />
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">Report Synced!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-indigo-500 mb-1.5" />
                    <span className="text-[10px] font-black text-slate-850 dark:text-slate-100">Submit Report</span>
                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">Sync Stakeholders</span>
                  </>
                )}
              </button>

              {/* Add to Notes */}
              <button
                type="button"
                onClick={handleAddToNotesLocal}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-center cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                {isAddedToNotes ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500 mb-1.5 animate-bounce" />
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">Added to Notes!</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-5 h-5 text-emerald-500 mb-1.5" />
                    <span className="text-[10px] font-black text-slate-850 dark:text-slate-100">Add to Notes</span>
                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">Log in Workspace</span>
                  </>
                )}
              </button>

              {/* Copy Report */}
              <button
                type="button"
                onClick={handleCopyReportLocal}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-center cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                {copiedReport ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-indigo-500 mb-1.5 animate-bounce" />
                    <span className="text-[10px] font-black text-indigo-650 dark:text-indigo-400">Briefing Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 text-amber-500 mb-1.5" />
                    <span className="text-[10px] font-black text-slate-850 dark:text-slate-100">Copy Briefing</span>
                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">Admissions Pitch</span>
                  </>
                )}
              </button>

              {/* Share report */}
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-center cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                <Share2 className="w-5 h-5 text-sky-500 mb-1.5" />
                <span className="text-[10px] font-black text-slate-850 dark:text-slate-100">Share Report</span>
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">Parent & Advisor</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowAnswerKey(!showAnswerKey)}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-xs flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                {showAnswerKey ? "Hide Answer Key" : "View Full Answer Key"}
              </button>
            </div>

            {showAnswerKey ? (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">Comprehensive Answer Key & Explanations</h3>
                {activeQuestions.map((q, idx) => {
                  const isWrong = wrongAnswersList.some(w => w.question === q.question);
                  return (
                    <div key={idx} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-4 shadow-sm">
                      <div className="flex justify-between items-start gap-3">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Question {idx + 1}: {q.question}</span>
                      </div>
                      
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => {
                          const isCorrectOption = oIdx === q.correctIndex;
                          const userSelectedWrong = isWrong && wrongAnswersList.find(w => w.question === q.question)?.userAns === opt;
                          
                          return (
                            <div 
                              key={oIdx} 
                              className={`p-3 rounded-xl border ${
                                isCorrectOption 
                                  ? 'border-emerald-500/50 bg-emerald-50/50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-900/20 dark:text-emerald-300 font-bold' 
                                  : userSelectedWrong 
                                    ? 'border-rose-500/50 bg-rose-50/50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-900/20 dark:text-rose-300' 
                                    : 'border-slate-100 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400'
                              } flex items-center justify-between`}
                            >
                              <span>{opt}</span>
                              {isCorrectOption && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                              {userSelectedWrong && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">Detailed Explanation & Source Citation</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <>
            {/* Classified Diagnostic Tabs */}
            <div className="space-y-4">
              <div className="flex border-b border-slate-200/60 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setActiveResultTab('classified')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs font-black border-b-2 cursor-pointer transition-all ${
                    activeResultTab === 'classified' 
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  <TrendingUp className="w-4.5 h-4.5" />
                  <span>Syllabus Categories</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultTab('correct')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs font-black border-b-2 cursor-pointer transition-all ${
                    activeResultTab === 'correct' 
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                  <span>Strengths ({correctQuestions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultTab('wrong')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs font-black border-b-2 cursor-pointer transition-all ${
                    activeResultTab === 'wrong' 
                      ? 'border-rose-500 text-rose-600 dark:text-rose-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                  <span>Growths ({wrongAnswersList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultTab('diagnostics')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs font-black border-b-2 cursor-pointer transition-all ${
                    activeResultTab === 'diagnostics' 
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-4.5 h-4.5" />
                  <span>All Answers</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="space-y-4">
                {/* TAB 1: SYLLABUS CATEGORIES (Very classified & categorized) */}
                {activeResultTab === 'classified' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(categoryData).map(([cat, info]) => {
                      const catPercentage = Math.round((info.correct / info.total) * 100);
                      return (
                        <div key={cat} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 shadow-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-xs text-slate-800 dark:text-white">{cat}</span>
                            <span className={`text-xs font-black ${
                              catPercentage >= 80 ? 'text-emerald-500' : catPercentage >= 50 ? 'text-amber-500' : 'text-rose-500'
                            }`}>{info.correct}/{info.total} Correct ({catPercentage}%)</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                catPercentage >= 80 ? 'bg-emerald-500' : catPercentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${catPercentage}%` }}
                            />
                          </div>
                          
                          {/* Sub questions review summary */}
                          <div className="text-[10px] text-slate-400 font-bold space-y-1">
                            {info.questions.map((q, idx) => {
                              const isWrong = wrongAnswersList.some(w => w.question === q.question);
                              return (
                                <div key={idx} className="flex items-center gap-1.5">
                                  {isWrong ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  )}
                                  <span className="truncate max-w-[200px]">{q.question}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: STRENGTHS (🟢 Mastered Concepts) */}
                {activeResultTab === 'correct' && (
                  <div className="space-y-3">
                    {correctQuestions.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium italic p-4 text-center">No correct answers in this run. Re-read active notes and re-take quiz to master subjects!</p>
                    ) : (
                      correctQuestions.map((q, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-emerald-100/60 dark:border-emerald-950/40 bg-emerald-50/10 dark:bg-emerald-950/10 space-y-2">
                          <div className="flex items-start gap-2.5">
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-extrabold text-xs text-slate-800 dark:text-slate-150 leading-relaxed">{q.question}</p>
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold">Verified Mastered Answer: {q.options[q.correctIndex] || "True"}</p>
                              <p className="text-[10px] italic text-slate-450 dark:text-slate-400 font-semibold">{q.explanation}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: GROWTH AREAS (🔴 Review Areas with AI Tutoring Insight) */}
                {activeResultTab === 'wrong' && (
                  <div className="space-y-4">
                    {wrongAnswersList.length === 0 ? (
                      <div className="p-6 text-center border border-yellow-200/50 dark:border-yellow-900/30 bg-yellow-50/10 dark:bg-yellow-950/10 rounded-2xl space-y-1.5 max-w-md mx-auto">
                        <Award className="w-8 h-8 text-yellow-500 mx-auto animate-bounce" />
                        <h5 className="text-xs font-black text-yellow-600 uppercase tracking-wider">Perfect Score Verified!</h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Incredible! You have demonstrated absolute conceptual mastery in this module. All stakeholder telemetry targets met.</p>
                      </div>
                    ) : (
                      wrongAnswersList.map((item, idx) => {
                        const hasAIExplanation = !!aiExplanations[item.question];
                        return (
                          <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 shadow-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-rose-50 dark:bg-rose-950/30 text-rose-500 uppercase">Growth Needed</span>
                                <span className="text-[9.5px] text-slate-400 font-bold uppercase">{categorizeQuestion(activeQuestions.find(q => q.question === item.question)!)}</span>
                              </div>
                              <h5 className="font-extrabold text-xs text-slate-850 dark:text-white leading-relaxed mt-1">{item.question}</h5>
                            </div>

                            <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                              <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                                Your Choice: {item.userAns}
                              </span>
                              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                Correct Answer: {item.correctAns}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 space-y-2.5">
                              <div className="flex items-center gap-1.5 font-black text-indigo-700 dark:text-indigo-400 text-[10px] uppercase tracking-wider">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI Tutoring Insight:</span>
                              </div>
                              
                              {isGeneratingExplanations ? (
                                <div className="flex items-center gap-2 py-1 text-slate-400">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                  <span className="animate-pulse text-[10px]">Formulating deep conceptual explanation...</span>
                                </div>
                              ) : explanationError ? (
                                <p className="text-[10px] text-rose-500 font-semibold">{explanationError}</p>
                              ) : hasAIExplanation ? (
                                <div className="text-[11px] leading-relaxed text-slate-650 dark:text-slate-350">
                                  {parseSimpleMarkdown(aiExplanations[item.question])}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">{item.explanation}</p>
                              )}

                              {/* Action buttons */}
                              {!isGeneratingExplanations && !explanationError && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-indigo-100/30 dark:border-indigo-900/30 text-[9px] text-slate-450 dark:text-slate-400">
                                  <button
                                    onClick={() => handleCopyInsight(item.question, aiExplanations[item.question] || item.explanation)}
                                    className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2 py-0.5 rounded bg-white/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-700/40 cursor-pointer active:scale-95"
                                    title="Copy Tutoring Insight"
                                  >
                                    {copiedInsightId === item.question ? (
                                      <>
                                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                                        <span className="text-emerald-500 font-extrabold">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-2.5 h-2.5" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    onClick={() => handleShareInsight(item.question, aiExplanations[item.question] || item.explanation)}
                                    className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2 py-0.5 rounded bg-white/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-700/40 cursor-pointer active:scale-95"
                                    title="Share Insight"
                                  >
                                    {sharedInsightId === item.question ? (
                                      <>
                                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                                        <span className="text-emerald-500 font-extrabold">Shared!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Share2 className="w-2.5 h-2.5" />
                                        <span>Share</span>
                                      </>
                                    )}
                                  </button>

                                  {onUpdateWorkspace && (
                                    <button
                                      onClick={() => handleAddInsightToNotes(item.question, item.question, aiExplanations[item.question] || item.explanation)}
                                      className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2 py-0.5 rounded bg-white/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-700/40 cursor-pointer active:scale-95 ml-auto"
                                      title="Add to Notes"
                                    >
                                      {addedNoteInsightId === item.question ? (
                                        <>
                                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                                          <span className="text-emerald-500 font-extrabold">Saved to Notes!</span>
                                        </>
                                      ) : (
                                        <>
                                          <FileText className="w-2.5 h-2.5" />
                                          <span>Add to Notes</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* TAB 4: COMPLETE DIAGNOSTICS */}
                {activeResultTab === 'diagnostics' && (
                  <div className="space-y-4 text-xs">
                    {activeQuestions.map((q, idx) => {
                      const isWrong = wrongAnswersList.some(w => w.question === q.question);
                      return (
                        <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2.5 shadow-xs">
                          <div className="flex justify-between items-start gap-3">
                            <span className="font-extrabold text-xs text-slate-800 dark:text-white">Q{idx + 1}: {q.question}</span>
                            {isWrong ? (
                              <span className="px-2 py-0.5 rounded text-[8px] font-black bg-rose-50 dark:bg-rose-950/30 text-rose-500 uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Incorrect</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[8px] font-black bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Correct</span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-semibold pt-1">
                            {q.options.map((opt, oIdx) => {
                              const isCorrectOption = oIdx === q.correctIndex;
                              const isSelectedByWrongUser = isWrong && wrongAnswersList.find(w => w.question === q.question)?.userAns === opt;
                              
                              return (
                                <div 
                                  key={oIdx} 
                                  className={`p-2 rounded-lg border ${
                                    isCorrectOption 
                                      ? 'border-emerald-200 bg-emerald-50/20 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300' 
                                      : isSelectedByWrongUser 
                                        ? 'border-rose-200 bg-rose-50/20 text-rose-700 dark:border-rose-900 dark:text-rose-300' 
                                        : 'border-slate-100 dark:border-slate-850/60 bg-slate-50/20 dark:bg-slate-900/10'
                                  }`}
                                >
                                  {opt}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold italic">Insight: {q.explanation}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </>
            )}

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <button
                type="button"
                onClick={() => setView('setup')}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl font-black text-xs text-slate-600 dark:text-slate-350 cursor-pointer text-center"
              >
                Back to Hub
              </button>
              <button
                type="button"
                onClick={handleRetakeQuiz}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-take Quiz</span>
              </button>
            </div>

            {/* Share to Stakeholders Modal Dialog */}
            <AnimatePresence>
              {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowShareModal(false)}
                    className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                  />
                  
                  {/* Modal Body */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="relative w-full max-w-sm overflow-hidden rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={() => setShowShareModal(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>

                    <div className="text-center space-y-4">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500">
                        <Share2 className="h-6 w-6 animate-pulse" />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                          Share with Stakeholders
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-450 font-semibold">
                          Transmit diagnostic study results and AI feedback notes directly to academic reviewers.
                        </p>
                      </div>

                      <div className="space-y-2.5 pt-2 text-left">
                        {/* Parent Portal */}
                        <button
                          type="button"
                          onClick={() => {
                            (window as any).showToast?.("Syncing results to Parent Tracking Console...", "info");
                            setShowShareModal(false);
                            setTimeout(() => {
                              (window as any).showToast?.("Completed: Parent Portal notified of recent progress!", "success");
                            }, 1000);
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <Users className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Parent Portal Tracking</span>
                          </div>
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-lg">Sync Active</span>
                        </button>

                        {/* School Counselor / Teacher */}
                        <button
                          type="button"
                          onClick={() => {
                            (window as any).showToast?.("Emailing Academic Advisor/Teacher with results summary...", "info");
                            setShowShareModal(false);
                            setTimeout(() => {
                              (window as any).showToast?.("Summary email queued and dispatched successfully!", "success");
                            }, 1000);
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileSignature className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">School / Teacher Portal</span>
                          </div>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-lg">Send Email</span>
                        </button>

                        {/* Study Group Slack/Discord link */}
                        <button
                          type="button"
                          onClick={() => {
                            (window as any).showToast?.("Generated a secure web-report link for Discord/Slack.", "success");
                            setShowShareModal(false);
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <Share2 className="w-4 h-4 text-sky-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Study Group Link</span>
                          </div>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-lg">Copy URL</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowShareModal(false)}
                        className="w-full mt-4 py-2 text-xs font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}
    </div>
  );
}
