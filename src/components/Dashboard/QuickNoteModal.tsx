import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Check, Tag, BookOpen, AlertCircle, Mic, MicOff } from 'lucide-react';

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToNotes: () => void;
}

export default function QuickNoteModal({ isOpen, onClose, onNavigateToNotes }: QuickNoteModalProps) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('General Study');
  const [content, setContent] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Stop listening when modal is closed or unmounted
  useEffect(() => {
    if (!isOpen && isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    }
  }, [isOpen, isListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('Voice-to-text dictation is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg('');
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone permission denied. Please enable microphone access in your browser.');
        } else {
          setErrorMsg(`Voice dictation error: ${event.error || 'unknown error'}`);
        }
        setIsListening(false);
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const currentResultIndex = event.resultIndex;
        const transcript = event.results[currentResultIndex][0].transcript;
        if (transcript) {
          setContent((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${prev} ${transcript.trim()}` : transcript.trim();
          });
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setErrorMsg('Failed to initialize voice dictation.');
      setIsListening(false);
    }
  };

  // Subjects presets
  const subjectPresets = [
    { name: 'Biology', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    { name: 'Mathematics', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
    { name: 'Chemistry', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    { name: 'General Study', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
    { name: 'Other', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
  ];

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSubject('General Study');
      setContent('');
      setSavedSuccess(false);
      setErrorMsg('');
      setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a note title');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Please write some content before saving');
      return;
    }

    try {
      const saved = localStorage.getItem('studyweb_notes');
      let currentNotes = [];
      if (saved) {
        try {
          currentNotes = JSON.parse(saved);
        } catch (e) {
          currentNotes = [];
        }
      }

      const newNote = {
        id: Date.now().toString(),
        title: title.trim(),
        subject: subject,
        content: content.trim(),
        updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        aiSummarized: false
      };

      const updatedNotes = [newNote, ...currentNotes];
      localStorage.setItem('studyweb_notes', JSON.stringify(updatedNotes));
      localStorage.setItem('studyweb_selected_note_id', newNote.id);

      // Dispatch global update event so any active Note Repository view can refresh
      window.dispatchEvent(new Event('studyweb_notes_updated'));

      setSavedSuccess(true);
      setErrorMsg('');

      // Auto-close after short delay if saved successfully
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      setErrorMsg('Could not save note to local storage');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Quick Capture Panel */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[28px] w-full max-w-lg shadow-2xl relative z-10 overflow-hidden text-left"
          >
            {/* Top design highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                    <span>Quick Capture Note</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">Ctrl+Shift+N</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Instant local save • Access from everywhere</p>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {savedSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 flex flex-col items-center justify-center text-center space-y-3"
                >
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-full flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                    <Check className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Note Saved Successfully!</h4>
                    <p className="text-xs text-slate-400 font-medium mt-1">Automatically syncing to your central notes library.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToNotes();
                      onClose();
                    }}
                    className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100 hover:border-indigo-200 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Open Notes Repository
                  </button>
                </motion.div>
              ) : (
                <>
                  {errorMsg && (
                    <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-3.5 py-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Title Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Title</label>
                    <input
                      ref={titleRef}
                      type="text"
                      placeholder="e.g. Krebs Cycle phase 2, Math formula review..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200/60 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>

                  {/* Subject Badge selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>Subject Category</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {subjectPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setSubject(preset.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            subject === preset.name 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                              : `${preset.color} hover:bg-slate-100 dark:hover:bg-slate-800`
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content field */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Notes / Concepts</label>
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wide uppercase transition-all cursor-pointer border ${
                          isListening
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25 animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={isListening ? "Listening... Click to stop" : "Dictate your lecture notes"}
                      >
                        {isListening ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            <Mic className="w-3.5 h-3.5 text-rose-500" />
                            <span>Listening... Stop</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            <span>Dictate Note</span>
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      placeholder="Draft your key thought, concept highlight, or study revision details..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200/60 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all leading-relaxed"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 border border-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      Save Quick Note
                    </button>
                  </div>
                </>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
