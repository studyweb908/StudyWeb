import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  Plus, 
  HelpCircle, 
  Check, 
  X, 
  RefreshCw, 
  RotateCw, 
  CheckCircle,
  HelpCircle as HelpIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Flashcard } from './types';

const DEFAULT_CARDS: Flashcard[] = [
  {
    id: 'def-1',
    category: 'AP Biology',
    front: 'Mitochondrion',
    back: 'An organelle found in large numbers in most cells, in which the biochemical processes of respiration and energy production occur.',
    known: false
  },
  {
    id: 'def-2',
    category: 'AP Biology',
    front: 'Ribosome',
    back: 'A minute particle consisting of RNA and associated proteins found in large numbers in the cytoplasm of living cells. They bind messenger RNA and transfer RNA to synthesize polypeptides and proteins.',
    known: false
  },
  {
    id: 'def-3',
    category: 'AP Biology',
    front: 'Endoplasmic Reticulum',
    back: 'A network of membranous tubules within the cytoplasm of a eukaryotic cell, continuous with the nuclear membrane. It usually has ribosomes attached and is involved in protein and lipid synthesis.',
    known: false
  },
  {
    id: 'def-4',
    category: 'Calculus',
    front: 'Derivative',
    back: 'The limit of the ratio of the change in a function to the corresponding change in its independent variable as the latter change approaches zero; represents instantaneous rate of change.',
    known: false
  },
  {
    id: 'def-5',
    category: 'Calculus',
    front: 'Integral',
    back: 'A mathematical constant or function that represents the area under a curve, computed as the limit of a sum of rectangles.',
    known: false
  },
  {
    id: 'def-6',
    category: 'AP Physics',
    front: 'Entropy',
    back: 'A thermodynamic quantity representing the unavailability of a system\'s thermal energy for conversion into mechanical work, often interpreted as the degree of disorder or randomness in the system.',
    known: false
  }
];

export default function FlashcardsView() {
  const [activeCategory, setActiveCategory] = useState<string>('AP Biology');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [studyMode, setStudyMode] = useState<'classic' | 'vocabulary'>('classic');
  const [vocabOrder, setVocabOrder] = useState<'term-first' | 'definition-first'>('term-first');
  
  // Custom flashcards
  const [cards, setCards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem('studyweb_cards');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_CARDS;
  });

  // Sync to localStorage
  React.useEffect(() => {
    localStorage.setItem('studyweb_cards', JSON.stringify(cards));
  }, [cards]);

  // Sync from event
  React.useEffect(() => {
    const handleCardsUpdate = (e: Event) => {
      const saved = localStorage.getItem('studyweb_cards');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCards(parsed);
          
          const customEvent = e as CustomEvent;
          if (customEvent.detail?.category) {
            setActiveCategory(customEvent.detail.category);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('studyweb_cards_updated', handleCardsUpdate);
    return () => window.removeEventListener('studyweb_cards_updated', handleCardsUpdate);
  }, []);

  // Listen for quick actions trigger
  React.useEffect(() => {
    const handleTriggerAddCard = () => {
      setShowAddCard(true);
    };
    window.addEventListener('studyweb_trigger_add_card', handleTriggerAddCard);
    return () => window.removeEventListener('studyweb_trigger_add_card', handleTriggerAddCard);
  }, []);

  // Form states
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newCategory, setNewCategory] = useState('AP Biology');

  const filteredCards = cards.filter(c => c.category === activeCategory);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex(prev => (prev + 1) % filteredCards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex(prev => (prev - 1 + filteredCards.length) % filteredCards.length);
    }, 150);
  };

  const handleMarkKnown = (id: string, known: boolean) => {
    setCards(cards.map(c => c.id === id ? { ...c, known } : c));
    handleNext();
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const newCard: Flashcard = {
      id: Date.now().toString(),
      category: newCategory,
      front: newFront,
      back: newBack,
      known: false
    };

    setCards([...cards, newCard]);
    setNewFront('');
    setNewBack('');
    setShowAddCard(false);
    setActiveCategory(newCategory);
    setCurrentCardIndex(filteredCards.length); // go to end or newest card
  };

  const activeCard = filteredCards[currentCardIndex];
  const categories = Array.from(new Set(cards.map(c => c.category)));

  // Dynamic card side text values based on Study Mode and Vocab settings
  let frontLabel = "Question";
  let backLabel = "Answer Explained";
  let frontText = activeCard?.front || '';
  let backText = activeCard?.back || '';
  let frontClass = "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300";
  let backClass = "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300";

  if (studyMode === 'vocabulary' && activeCard) {
    if (vocabOrder === 'term-first') {
      frontLabel = "Word / Term";
      backLabel = "Definition";
      frontText = activeCard.front;
      backText = activeCard.back;
      frontClass = "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-900/55";
      backClass = "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-900/55";
    } else {
      frontLabel = "Definition";
      backLabel = "Word / Term";
      frontText = activeCard.back;
      backText = activeCard.front;
      frontClass = "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-900/55";
      backClass = "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-900/55";
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left max-w-2xl mx-auto text-xs sm:text-sm space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5.5 h-5.5 text-indigo-500" />
            <span>Spaced Repetition Flashcards</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Retain critical concepts 3x faster using active recall</p>
        </div>
        <button
          onClick={() => setShowAddCard(!showAddCard)}
          className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Card</span>
        </button>
      </div>

      {/* ADD CARD DIALOG FORM */}
      <AnimatePresence>
        {showAddCard && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddCard}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 space-y-3.5 overflow-hidden text-xs"
          >
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Front (Term/Question)</label>
              <input
                type="text"
                required
                placeholder="e.g. What is cellular respiration?"
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Back (Definition/Answer)</label>
              <textarea
                required
                rows={2}
                placeholder="e.g. A process of converting glucose to ATP inside cells..."
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-between items-center gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Deck</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                >
                  <option>AP Biology</option>
                  <option>Calculus</option>
                  <option>AP Physics</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCard(false)}
                  className="px-3 py-1.5 rounded-lg border text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer hover:bg-indigo-700"
                >
                  Save Card
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* CATEGORY DECK SELECTOR PILLS */}
      <div className="flex flex-wrap gap-2.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setCurrentCardIndex(0);
              setIsFlipped(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            {cat} Deck
          </button>
        ))}
      </div>

      {/* STUDY MODE SWITCHER (CLASSIC VS VOCABULARY) */}
      <div className="flex items-center justify-between p-1 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800 gap-1">
        <button
          type="button"
          onClick={() => {
            setStudyMode('classic');
            setIsFlipped(false);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            studyMode === 'classic'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-800'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Classic Q&A Mode</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStudyMode('vocabulary');
            setIsFlipped(false);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            studyMode === 'vocabulary'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-800'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Vocabulary Mode</span>
        </button>
      </div>

      {/* VOCABULARY MODE DIRECTION OPTION */}
      {studyMode === 'vocabulary' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-xl border border-indigo-100/40 dark:border-indigo-900/20 gap-2">
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">Vocabulary Mode Options</p>
            <p className="text-[10px] text-slate-400 font-medium">Toggle card direction to test yourself with word or definition first</p>
          </div>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-950/60 p-0.5 rounded-lg border border-slate-200/40 dark:border-slate-850">
            <button
              type="button"
              onClick={() => {
                setVocabOrder('term-first');
                setIsFlipped(false);
              }}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                vocabOrder === 'term-first'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Term First
            </button>
            <button
              type="button"
              onClick={() => {
                setVocabOrder('definition-first');
                setIsFlipped(false);
              }}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                vocabOrder === 'definition-first'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Definition First
            </button>
          </div>
        </div>
      )}

      {/* DECK PLAY AREA */}
      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Your flashcard deck is empty</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm mb-6">Add some flashcards to start studying with spaced repetition.</p>
          <button
            onClick={() => setShowAddCard(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Create Your First Card
          </button>
        </div>
      ) : filteredCards.length > 0 && activeCard ? (
        <div className="space-y-6">
          {/* Card Wrapper with 3D Flip style effect */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full h-64 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 shadow-sm cursor-pointer relative perspective flex items-center justify-center p-6 text-center transition-all duration-300 hover:shadow-md"
          >
            {/* Center prompt icon */}
            <span className="absolute top-4 right-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 bg-white dark:bg-slate-900 border px-2 py-0.5 rounded-md shadow-sm">
              <RotateCw className="w-3 h-3 text-indigo-500" />
              <span>Click Card to Flip</span>
            </span>

            {/* Render dynamic content based on flip */}
            <div className="max-w-md space-y-4">
              <AnimatePresence mode="wait">
                {!isFlipped ? (
                  <motion.div
                    key="front"
                    initial={{ opacity: 0, rotateY: 90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: -90 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2"
                  >
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${frontClass}`}>
                      {frontLabel}
                    </span>
                    <p className="text-sm sm:text-base md:text-lg font-extrabold text-slate-800 dark:text-white leading-relaxed">
                      {frontText}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ opacity: 0, rotateY: -90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: 90 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2"
                  >
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${backClass}`}>
                      {backLabel}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed italic">
                      {backText}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom status indicator */}
            <div className="absolute bottom-4 text-slate-400 font-bold text-[10px] tracking-wide uppercase">
              {activeCard.known ? '✅ Memorized' : '❌ Review Needed'}
            </div>
          </div>

          {/* Controller and Scoring Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Slider count */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-slate-400">
                {currentCardIndex + 1} of {filteredCards.length} Cards
              </span>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Validation Buttons */}
            {isFlipped && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleMarkKnown(activeCard.id, false)}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-200 text-rose-600 dark:text-rose-400 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Still Learning</span>
                </button>
                <button
                  onClick={() => handleMarkKnown(activeCard.id, true)}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-200 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>I Know This</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 space-y-3">
          <HelpIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-500">No cards in this deck yet.</p>
          <button
            onClick={() => setShowAddCard(true)}
            className="text-xs text-indigo-600 font-bold hover:underline"
          >
            Create the first card
          </button>
        </div>
      )}

      {/* PROGRESS CHART */}
      {filteredCards.length > 0 && (
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 text-center">Deck Progress</h4>
          <div className="h-48 w-full max-w-sm mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Mastered', value: filteredCards.filter(c => c.known).length, color: '#10b981' },
                    { name: 'Needs Review', value: filteredCards.filter(c => !c.known).length, color: '#f43f5e' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {[
                    { name: 'Mastered', value: filteredCards.filter(c => c.known).length, color: '#10b981' },
                    { name: 'Needs Review', value: filteredCards.filter(c => !c.known).length, color: '#f43f5e' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
