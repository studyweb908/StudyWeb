import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  HelpCircle, 
  Check, 
  X, 
  Coins, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  RefreshCw,
  Trophy,
  Star
} from 'lucide-react';
import { QuizQuestion } from './types';

export default function QuizCenterView() {
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  
  // Custom mock bank
  const quizBank: Record<string, QuizQuestion[]> = {
    Biology: [
      {
        id: 'b1',
        question: 'Which of the following cellular processes converts glucose into pyruvate, yielding ATP?',
        options: ['Krebs Cycle', 'Glycolysis', 'Electron Transport Chain', 'Photosynthesis'],
        correctIndex: 1,
        explanation: 'Glycolysis occurs in the cytoplasm and breaks down one glucose molecule into two pyruvates, yielding a net of 2 ATP.'
      },
      {
        id: 'b2',
        question: 'What organelle is primarily responsible for synthesis of lipids and detoxification of drugs?',
        options: ['Rough Endoplasmic Reticulum', 'Smooth Endoplasmic Reticulum', 'Golgi Apparatus', 'Lysosome'],
        correctIndex: 1,
        explanation: 'The Smooth ER synthesizes lipids, phospholipids, and steroids. It is also key in metabolizing drugs and toxins.'
      },
      {
        id: 'b3',
        question: 'Which base pairs with Adenine in RNA molecules?',
        options: ['Thymine', 'Cytosine', 'Guanine', 'Uracil'],
        correctIndex: 3,
        explanation: 'In RNA, Thymine is replaced by Uracil, which pairs directly with Adenine.'
      }
    ],
    Mathematics: [
      {
        id: 'm1',
        question: 'Evaluate the derivative of f(x) = 3x^2 + 5x - 7 at x = 2.',
        options: ['11', '17', '12', '15'],
        correctIndex: 1,
        explanation: 'f\'(x) = 6x + 5. Substituting x=2 yields f\'(2) = 6(2) + 5 = 17.'
      },
      {
        id: 'm2',
        question: 'If log_2(x) = 5, what is the value of x?',
        options: ['10', '25', '32', '64'],
        correctIndex: 2,
        explanation: 'Converting to exponential form: x = 2^5 = 32.'
      }
    ],
    Physics: [
      {
        id: 'p1',
        question: 'What is the work done on an object when a force of 10 N moves it 5 meters in the direction of the force?',
        options: ['2 Joules', '15 Joules', '50 Joules', '100 Joules'],
        correctIndex: 2,
        explanation: 'Work = Force * Distance * cos(theta). Here, Work = 10 N * 5 m * 1 = 50 Joules.'
      },
      {
        id: 'p2',
        question: 'An object of mass 4 kg is accelerated at 3 m/s^2. What is the net force acting on the object?',
        options: ['1.33 N', '7 N', '12 N', '24 N'],
        correctIndex: 2,
        explanation: 'Newton\'s Second Law: Force = Mass * Acceleration. F = 4 kg * 3 m/s^2 = 12 N.'
      }
    ]
  };

  const handleSelectSubject = (subject: string) => {
    setActiveSubject(subject);
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
  };

  const handleAnswerClick = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswerIndex(index);
    setIsAnswered(true);

    const activeQuestions = quizBank[activeSubject || 'Biology'];
    if (index === activeQuestions[currentQuestionIndex].correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    const activeQuestions = quizBank[activeSubject || 'Biology'];
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswerIndex(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
  };

  const activeQuestions = activeSubject ? quizBank[activeSubject] : [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left max-w-3xl mx-auto text-xs sm:text-sm">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5.5 h-5.5 text-indigo-500" />
            <span>Interactive AI Quiz Center</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Test your active recall. Gain XP & Study Coins on passing!</p>
        </div>
        {activeSubject && (
          <button
            onClick={() => setActiveSubject(null)}
            className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
          >
            &larr; Switch Subject
          </button>
        )}
      </div>

      {/* VIEW 1: SELECT SUBJECT */}
      {!activeSubject && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(quizBank).map((subject) => (
              <div
                key={subject}
                onClick={() => handleSelectSubject(subject)}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-900/60 transition-all cursor-pointer hover:-translate-y-1 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold mb-4">
                  {subject[0]}
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{subject} Review</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">{quizBank[subject].length} Interactive Questions</p>
                
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-4">
                  <span>Start Quiz</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          {/* Gamified instructions footer */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <Coins className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-bold text-amber-800 dark:text-amber-400">XP & Coin Multipliers Active!</h5>
              <p className="text-xs text-amber-600 dark:text-amber-500/90 leading-relaxed mt-0.5">
                Clear any quiz with 100% score to receive <strong>+50 XP</strong> and <strong>+20 Study Coins</strong>. Use coins to unlock exclusive AI premium tool tokens!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ACTIVE QUIZ PLAY */}
      {activeSubject && !quizFinished && (
        <div className="space-y-6">
          {/* Question Indicator & Score */}
          <div className="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>Question {currentQuestionIndex + 1} of {activeQuestions.length}</span>
            <span>Current Score: <strong className="text-indigo-600">{score}</strong></span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / activeQuestions.length) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800">
            <p className="font-extrabold text-slate-800 dark:text-white leading-relaxed sm:text-base">
              {activeQuestions[currentQuestionIndex].question}
            </p>
          </div>

          {/* Options Grid */}
          <div className="space-y-3">
            {activeQuestions[currentQuestionIndex].options.map((option, idx) => {
              const isCorrect = idx === activeQuestions[currentQuestionIndex].correctIndex;
              const isSelected = idx === selectedAnswerIndex;
              
              let optionStyle = "bg-white dark:bg-slate-800 border-slate-150 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 text-slate-700 dark:text-slate-200";
              
              if (isAnswered) {
                if (isCorrect) {
                  optionStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold";
                } else if (isSelected) {
                  optionStyle = "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400 font-bold";
                } else {
                  optionStyle = "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-850 text-slate-400 opacity-60";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleAnswerClick(idx)}
                  className={`w-full p-4 rounded-xl border text-left flex items-center justify-between font-semibold transition-all cursor-pointer ${optionStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 dark:text-slate-500 text-xs uppercase bg-slate-50 dark:bg-slate-900 w-6 h-6 rounded-md flex items-center justify-center border">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </div>
                  {isAnswered && isCorrect && <Check className="w-5 h-5 text-emerald-500" />}
                  {isAnswered && isSelected && !isCorrect && <X className="w-5 h-5 text-rose-500" />}
                </button>
              );
            })}
          </div>

          {/* Explanation block */}
          <AnimatePresence>
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2"
              >
                <div className="flex items-center gap-1.5 font-extrabold text-indigo-700 dark:text-indigo-400">
                  <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                  <span>AI Explains:</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  {activeQuestions[currentQuestionIndex].explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next action button */}
          {isAnswered && (
            <button
              onClick={handleNextQuestion}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer"
            >
              <span>{currentQuestionIndex < activeQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* VIEW 3: QUIZ RESULT */}
      {quizFinished && (
        <div className="text-center py-10 space-y-6">
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
            <Trophy className="w-10 h-10 animate-bounce text-yellow-500" />
          </div>

          <div className="space-y-2">
            <h4 className="font-extrabold text-2xl text-slate-900 dark:text-white">Review Finished!</h4>
            <p className="text-slate-400 font-semibold text-xs sm:text-sm">You answered {score} of {activeQuestions.length} questions correctly.</p>
          </div>

          {/* Score percentage bar */}
          <div className="max-w-xs mx-auto space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>Score percentage</span>
              <span className="text-indigo-600 dark:text-indigo-400">{Math.round((score / activeQuestions.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full"
                style={{ width: `${(score / activeQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Gamified Rewards */}
          {score === activeQuestions.length ? (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 max-w-sm mx-auto space-y-1">
              <p className="text-xs font-bold text-yellow-600 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400" />
                <span>PERFECT SCORE SECURED!</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Received +50 XP and +20 Study Coins</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-medium">Clear a perfect score next time to earn coin rewards!</p>
          )}

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={resetQuiz}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={() => setActiveSubject(null)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow"
            >
              Other Subjects
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
