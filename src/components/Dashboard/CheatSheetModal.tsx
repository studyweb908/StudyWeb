import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Calculator,
  CheckSquare,
  Printer,
  Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Workspace } from './WorkspaceTypes';
import { supabase } from '../../lib/supabase';

export interface CheatSheetData {
  title: string;
  subject?: string;
  subtitle?: string;
  keyFormulas: Array<{ name: string; formula: string; note?: string }>;
  coreDefinitions: Array<{ term: string; definition: string }>;
  keyDiagramsAndConcepts: Array<{ title: string; breakdown: string }>;
  examTraps: Array<{ trap: string; howToAvoid: string }>;
  lastMinuteChecklist: string[];
}

interface CheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
}

export default function CheatSheetModal({ isOpen, onClose, workspace }: CheatSheetModalProps) {
  const [cheatSheet, setCheatSheet] = useState<CheatSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateSheet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const compactFiles = (workspace.files || []).slice(0, 8).map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        summary: f.summary,
        transcription: f.transcription || f.contentText,
        highlights: f.highlights,
        formulas: f.formulas,
        url: typeof f.url === 'string' && !f.url.startsWith('data:') ? f.url : undefined
      }));

      const compactNotes = (workspace.notes || []).slice(0, 8).map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content
      }));

      const res = await fetch('/api/generate-cheat-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          subject: workspace.subject || 'General',
          files: compactFiles,
          notes: compactNotes
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.cheatSheet) {
        throw new Error(payload?.error || 'Could not generate Cheat Sheet right now.');
      }
      setCheatSheet(payload.cheatSheet);
    } catch (err: any) {
      setError(err?.message || 'Unable to generate Cheat Sheet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !cheatSheet && !isLoading) {
      generateSheet();
    }
  }, [isOpen, workspace.id]);

  const handleDownloadPdf = () => {
    if (!cheatSheet) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 32;
    const maxWidth = pageWidth - margin * 2;
    let y = 38;

    const addWrapped = (text: string, fontSize: number, bold = false, color: [number, number, number] = [30, 41, 59], indent = 0) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxWidth - indent);
      for (const line of lines) {
        if (y > 805) {
          doc.addPage();
          y = 38;
        }
        doc.text(line, margin + indent, y);
        y += fontSize * 1.28;
      }
    };

    // Header
    addWrapped(cheatSheet.title || `${workspace.name} — 1-Page Cheat Sheet`, 16, true, [67, 56, 202]);
    if (cheatSheet.subtitle) {
      addWrapped(`${cheatSheet.subject ? `[${cheatSheet.subject}] ` : ''}${cheatSheet.subtitle}`, 9.5, false, [100, 116, 139]);
    }
    y += 6;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;

    if (cheatSheet.keyFormulas?.length) {
      addWrapped('KEY FORMULAS & EQUATIONS', 10.5, true, [67, 56, 202]);
      y += 2;
      cheatSheet.keyFormulas.forEach((f) => {
        addWrapped(`• ${f.name}: ${f.formula}${f.note ? ` (${f.note})` : ''}`, 9, false, [15, 23, 42], 6);
      });
      y += 8;
    }

    if (cheatSheet.coreDefinitions?.length) {
      addWrapped('CORE DEFINITIONS', 10.5, true, [15, 118, 110]);
      y += 2;
      cheatSheet.coreDefinitions.forEach((d) => {
        addWrapped(`• ${d.term}: ${d.definition}`, 9, false, [30, 41, 59], 6);
      });
      y += 8;
    }

    if (cheatSheet.keyDiagramsAndConcepts?.length) {
      addWrapped('KEY CONCEPTS & DIAGRAMS', 10.5, true, [37, 99, 235]);
      y += 2;
      cheatSheet.keyDiagramsAndConcepts.forEach((c) => {
        addWrapped(`• ${c.title}: ${c.breakdown}`, 9, false, [30, 41, 59], 6);
      });
      y += 8;
    }

    if (cheatSheet.examTraps?.length) {
      addWrapped('COMMON EXAM TRAPS TO AVOID', 10.5, true, [190, 18, 60]);
      y += 2;
      cheatSheet.examTraps.forEach((t) => {
        addWrapped(`• Trap: ${t.trap} -> Fix: ${t.howToAvoid}`, 9, false, [30, 41, 59], 6);
      });
      y += 8;
    }

    if (cheatSheet.lastMinuteChecklist?.length) {
      addWrapped('LAST-MINUTE REVISION CHECKLIST', 10.5, true, [180, 83, 9]);
      y += 2;
      cheatSheet.lastMinuteChecklist.forEach((item) => {
        addWrapped(`[ ] ${item}`, 9, false, [30, 41, 59], 6);
      });
    }

    const safeName = (workspace.name || 'StudyWeb').replace(/[^a-z0-9-_]+/gi, '_');
    doc.save(`${safeName}_Cheat_Sheet.pdf`);
  };

  const handleCopyShareable = async () => {
    if (!cheatSheet) return;
    const lines: string[] = [
      `*${cheatSheet.title}*`,
      cheatSheet.subtitle ? `_${cheatSheet.subtitle}_` : '',
      '',
      cheatSheet.keyFormulas?.length ? '*Key Formulas:*' : '',
      ...(cheatSheet.keyFormulas || []).map((f) => `• ${f.name}: \`${f.formula}\`${f.note ? ` — ${f.note}` : ''}`),
      '',
      cheatSheet.coreDefinitions?.length ? '*Core Definitions:*' : '',
      ...(cheatSheet.coreDefinitions || []).map((d) => `• *${d.term}*: ${d.definition}`),
      '',
      cheatSheet.keyDiagramsAndConcepts?.length ? '*Key Concepts:*' : '',
      ...(cheatSheet.keyDiagramsAndConcepts || []).map((c) => `• *${c.title}*: ${c.breakdown}`),
      '',
      cheatSheet.examTraps?.length ? '*Exam Traps to Avoid:*' : '',
      ...(cheatSheet.examTraps || []).map((t) => `• ${t.trap} → ${t.howToAvoid}`),
      '',
      'Generated with StudyWeb'
    ].filter((l) => l !== undefined);

    try {
      await navigator.clipboard.writeText(lines.join('\n').trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            {/* Header Toolbar */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-950/50 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                    1-Page Cheat Sheet Builder
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Last-minute formulas, definitions &amp; exam traps for {workspace.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {cheatSheet && !isLoading && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyShareable}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Copy formatted sheet for WhatsApp / Discord"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Share'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={generateSheet}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Regenerate Cheat Sheet"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/30">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    Building your 1-Page Cheat Sheet...
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    Extracting formulas, definitions, key concepts, and common exam traps from your workspace materials.
                  </p>
                </div>
              ) : error ? (
                <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-rose-800 dark:text-rose-200">Unable to build Cheat Sheet</p>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={generateSheet}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    Try Again
                  </button>
                </div>
              ) : cheatSheet ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
                  {/* Sheet Title Banner */}
                  <div className="border-b-2 border-indigo-600/80 dark:border-indigo-500/60 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                      <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 mb-1">
                        {cheatSheet.subject || workspace.subject || 'Revision Sheet'}
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {cheatSheet.title}
                      </h2>
                    </div>
                    {cheatSheet.subtitle && (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {cheatSheet.subtitle}
                      </p>
                    )}
                  </div>

                  {/* 2-Column Dense Revision Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Key Formulas */}
                    {cheatSheet.keyFormulas?.length > 0 && (
                      <div className="rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/50 p-3.5 space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Key Formulas &amp; Equations</span>
                        </h4>
                        <div className="space-y-2">
                          {cheatSheet.keyFormulas.map((f, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40">
                              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{f.name}</p>
                              <code className="block text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 mt-0.5 break-words">
                                {f.formula}
                              </code>
                              {f.note && (
                                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">{f.note}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Core Definitions */}
                    {cheatSheet.coreDefinitions?.length > 0 && (
                      <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 p-3.5 space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Core Definitions</span>
                        </h4>
                        <ul className="space-y-2">
                          {cheatSheet.coreDefinitions.map((d, idx) => (
                            <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                              <strong className="text-slate-900 dark:text-white">{d.term}: </strong>
                              <span>{d.definition}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key Concepts & Diagrams */}
                    {cheatSheet.keyDiagramsAndConcepts?.length > 0 && (
                      <div className="rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-800/50 p-3.5 space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Key Concepts &amp; Diagram Notes</span>
                        </h4>
                        <div className="space-y-2">
                          {cheatSheet.keyDiagramsAndConcepts.map((c, idx) => (
                            <div key={idx} className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                              <strong className="text-slate-900 dark:text-white">{c.title}: </strong>
                              <span>{c.breakdown}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Common Exam Traps */}
                    {cheatSheet.examTraps?.length > 0 && (
                      <div className="rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/50 p-3.5 space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Common Exam Traps</span>
                        </h4>
                        <div className="space-y-2">
                          {cheatSheet.examTraps.map((t, idx) => (
                            <div key={idx} className="text-xs leading-snug">
                              <p className="font-bold text-rose-800 dark:text-rose-300">Trap: {t.trap}</p>
                              <p className="text-slate-700 dark:text-slate-300">Avoid: {t.howToAvoid}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Last-Minute Checklist */}
                  {cheatSheet.lastMinuteChecklist?.length > 0 && (
                    <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50 p-3.5 space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Last-Minute Revision Checklist</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {cheatSheet.lastMinuteChecklist.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <span className="mt-0.5 w-3.5 h-3.5 rounded border border-amber-400 dark:border-amber-600 shrink-0 inline-block" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
