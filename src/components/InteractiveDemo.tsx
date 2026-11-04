import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Tablet,
  Monitor,
  LayoutGrid,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  RotateCw,
  ArrowRight
} from 'lucide-react';

type ViewportMode = 'all' | 'mobile' | 'tablet' | 'desktop';
type FeatureTab = 'tutor' | 'notes' | 'flashcards';

export default function InteractiveDemo() {
  const [viewportMode, setViewportMode] = useState<ViewportMode>('all');
  const [activeFeature, setActiveFeature] = useState<FeatureTab>('tutor');
  const [selectedPromptIdx, setSelectedPromptIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  const samplePrompts = [
    {
      q: 'Explain the Krebs Cycle in 3 exam bullet points.',
      a: '1. Acetyl-CoA enters the mitochondrial matrix and combines with oxaloacetate to form citrate.\n2. Per glucose molecule (2 turns), it yields 6 NADH, 2 FADH₂, and 2 ATP.\n3. High-energy electrons power oxidative phosphorylation to synthesize ~34 ATP.',
      cite: 'Grounded in: Biology_Unit_4_Slides.pdf (p. 14)'
    },
    {
      q: 'Give me a 60-second interview pitch on React Virtual DOM.',
      a: 'The Virtual DOM is a lightweight in-memory tree representation of the real DOM. On state updates, React diffs the new tree against the previous snapshot (reconciliation) and batches only the minimal DOM mutations—preventing costly layout thrashing.',
      cite: 'Grounded in: Frontend_Interview_Prep.pdf (p. 6)'
    }
  ];

  const renderLiveScreen = (compact = false) => (
    <div className="flex flex-col h-full bg-brand-bg-light dark:bg-slate-950 text-left overflow-hidden select-none">
      {/* Synchronized Top Workspace Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-card-border bg-card-bg/90 shrink-0 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0" />
          <span className="text-[11px] font-bold text-brand-text truncate">
            {compact ? 'StudyWeb' : 'StudyWeb — Biology & CS Workspace'}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-brand-bg-light p-0.5 rounded-lg border border-card-border shrink-0">
          {(['tutor', 'notes', 'flashcards'] as FeatureTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveFeature(tab);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer capitalize ${
                activeFeature === tab
                  ? 'bg-brand-primary text-white'
                  : 'text-brand-text-light hover:text-brand-text'
              }`}
            >
              {tab === 'tutor' ? 'AI Tutor' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Synchronized Body Content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between gap-2.5 overflow-y-auto">
        {activeFeature === 'tutor' && (
          <div className="space-y-2.5 flex flex-col h-full justify-between">
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPromptIdx(idx);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border text-left transition-all cursor-pointer ${
                    selectedPromptIdx === idx
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                      : 'bg-card-bg border-card-border text-brand-text-light hover:text-brand-text'
                  }`}
                >
                  {compact ? `Prompt ${idx + 1}` : item.q}
                </button>
              ))}
            </div>

            <div className="space-y-2 my-auto">
              <div className="p-2.5 rounded-xl bg-card-bg border border-card-border text-[11px] font-semibold text-brand-text">
                {samplePrompts[selectedPromptIdx].q}
              </div>
              <div className="p-2.5 rounded-xl bg-brand-primary/5 border border-brand-primary/20 text-[11px] text-brand-text whitespace-pre-line leading-relaxed">
                {samplePrompts[selectedPromptIdx].a}
                <div className="mt-1.5 pt-1.5 border-t border-brand-primary/15 text-[10px] font-semibold text-brand-primary flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{samplePrompts[selectedPromptIdx].cite}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeFeature === 'notes' && (
          <div className="space-y-2 my-auto">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-brand-primary flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> Auto-Extracted Revision Sheet
              </span>
              <span className="text-[10px] text-brand-text-light font-mono">92% condensed</span>
            </div>
            <div className="p-3 rounded-xl bg-card-bg border border-card-border space-y-1.5 text-[11px] text-brand-text">
              <p className="font-bold">Core Exam Takeaways:</p>
              <p className="text-brand-text-light">• Glycolysis occurs in the cytosol (net 2 ATP, 2 NADH).</p>
              <p className="text-brand-text-light">• Citric Acid Cycle runs in the mitochondrial matrix.</p>
              <p className="text-brand-text-light">• Electron Transport Chain produces 32–34 ATP via chemiosmosis.</p>
            </div>
          </div>
        )}

        {activeFeature === 'flashcards' && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsCardFlipped(!isCardFlipped);
            }}
            className="my-auto p-4 rounded-xl bg-card-bg border border-brand-primary/30 hover:border-brand-primary transition-all cursor-pointer text-center space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-brand-primary uppercase tracking-wider">
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3 h-3" /> {isCardFlipped ? 'Answer' : 'Active Recall Card'}
              </span>
              <span className="inline-flex items-center gap-1 text-brand-text-light">
                <RotateCw className="w-3 h-3" /> Tap to flip
              </span>
            </div>
            <p className="text-xs font-bold text-brand-text py-2">
              {isCardFlipped
                ? 'ATP Synthase uses the proton gradient (H⁺) across the inner mitochondrial membrane to phosphorylate ADP into ATP.'
                : 'How does chemiosmosis drive ATP synthesis during cellular respiration?'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section
      id="interactive-demo"
      className="py-fluid-section bg-card-bg overflow-hidden border-y border-card-border/60"
      aria-label="Interactive Demo Experience"
    >
      <div className="responsive-container text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mb-8 sm:mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary mb-2.5">
            Synchronized Multi-Device Experience
          </p>
          <h2
            className="text-fluid-h2 font-display font-bold text-brand-text mb-4"
            style={{ textWrap: 'balance' }}
          >
            See How StudyWeb Works Across Every Device
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-brand-text-light leading-relaxed">
            Test our live interactive preview across Mobile, Tablet, and Desktop viewports. Click any tab or flashcard below—your actions mirror across all screens in real time.
          </p>
        </motion.div>

        {/* Responsively-Inspired Viewport Switcher Toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: 'all', label: 'All Devices (Synced)', icon: LayoutGrid, dim: '375px · 768px · 1440px' },
            { id: 'mobile', label: 'Mobile', icon: Smartphone, dim: '375 × 667' },
            { id: 'tablet', label: 'Tablet', icon: Tablet, dim: '768 × 1024' },
            { id: 'desktop', label: 'Desktop', icon: Monitor, dim: '1440 × 900' }
          ].map((vp) => {
            const Icon = vp.icon;
            const active = viewportMode === vp.id;
            return (
              <button
                key={vp.id}
                type="button"
                onClick={() => setViewportMode(vp.id as ViewportMode)}
                className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  active
                    ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20'
                    : 'bg-brand-bg-light/70 text-brand-text border-card-border hover:border-brand-primary/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{vp.label}</span>
                <span className={`hidden sm:inline text-[10px] font-mono ${active ? 'text-white/80' : 'text-brand-text-light'}`}>
                  {vp.dim}
                </span>
              </button>
            );
          })}
        </div>

        {/* Multi-Viewport Interactive Stage */}
        <AnimatePresence mode="wait">
          {viewportMode === 'all' ? (
            <motion.div
              key="all-viewports"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch max-w-6xl mx-auto"
            >
              {/* Mobile Frame (3 cols on lg) */}
              <div className="lg:col-span-3 flex flex-col rounded-3xl border-2 border-card-border bg-card-bg shadow-xl overflow-hidden min-h-[320px]">
                <div className="px-3 py-2 bg-brand-bg-light border-b border-card-border flex items-center justify-between text-[11px] font-mono text-brand-text-light">
                  <span className="inline-flex items-center gap-1 font-sans font-bold text-brand-text">
                    <Smartphone className="w-3.5 h-3.5 text-brand-primary" /> Mobile
                  </span>
                  <span>375 × 667</span>
                </div>
                <div className="flex-1 flex flex-col">{renderLiveScreen(true)}</div>
              </div>

              {/* Tablet Frame (4 cols on lg) */}
              <div className="lg:col-span-4 flex flex-col rounded-3xl border-2 border-card-border bg-card-bg shadow-xl overflow-hidden min-h-[320px]">
                <div className="px-3.5 py-2 bg-brand-bg-light border-b border-card-border flex items-center justify-between text-[11px] font-mono text-brand-text-light">
                  <span className="inline-flex items-center gap-1 font-sans font-bold text-brand-text">
                    <Tablet className="w-3.5 h-3.5 text-brand-secondary" /> Tablet
                  </span>
                  <span>768 × 1024</span>
                </div>
                <div className="flex-1 flex flex-col">{renderLiveScreen(false)}</div>
              </div>

              {/* Desktop Frame (5 cols on lg) */}
              <div className="lg:col-span-5 flex flex-col rounded-3xl border-2 border-brand-primary/40 bg-card-bg shadow-2xl overflow-hidden min-h-[320px]">
                <div className="px-4 py-2 bg-brand-bg-light border-b border-card-border flex items-center justify-between text-[11px] font-mono text-brand-text-light">
                  <span className="inline-flex items-center gap-1.5 font-sans font-bold text-brand-text">
                    <Monitor className="w-3.5 h-3.5 text-brand-primary" /> Desktop Studio
                  </span>
                  <span>1440 × 900</span>
                </div>
                <div className="flex-1 flex flex-col">{renderLiveScreen(false)}</div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={viewportMode}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={`mx-auto rounded-3xl border-2 border-brand-primary/40 bg-card-bg shadow-2xl overflow-hidden flex flex-col min-h-[360px] ${
                viewportMode === 'mobile'
                  ? 'max-w-[375px]'
                  : viewportMode === 'tablet'
                  ? 'max-w-[768px]'
                  : 'max-w-5xl'
              }`}
            >
              <div className="px-4 py-2.5 bg-brand-bg-light border-b border-card-border flex items-center justify-between text-xs font-mono text-brand-text-light">
                <span className="font-sans font-bold text-brand-text capitalize">
                  {viewportMode} Viewport Preview
                </span>
                <span>
                  {viewportMode === 'mobile'
                    ? '375 × 667 px'
                    : viewportMode === 'tablet'
                    ? '768 × 1024 px'
                    : '1440 × 900 px'}
                </span>
              </div>
              <div className="flex-1 flex flex-col">{renderLiveScreen(viewportMode === 'mobile')}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 sm:mt-10">
          <button
            type="button"
            onClick={() => (window as any).openStudyWebAuth?.('signup')}
            aria-label="Try StudyWeb interactive study demo now"
            className="inline-flex items-center gap-2 text-sm sm:text-base text-brand-primary font-bold hover:text-brand-secondary transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Your Full AI Study Workspace Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
