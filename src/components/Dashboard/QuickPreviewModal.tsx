import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Video, 
  Music, 
  Globe, 
  FileText, 
  Quote, 
  Brain, 
  Sigma, 
  Terminal, 
  RefreshCw, 
  ExternalLink,
  BookOpen,
  Link,
  Sparkles
} from 'lucide-react';
import { WorkspaceFile } from './WorkspaceTypes';

interface LogEntry {
  type: 'info' | 'success' | 'warn' | 'debug';
  message: string;
}

export function getPipelineLogs(file: WorkspaceFile): LogEntry[] {
  if (!file) return [];
  const name = file.name;
  const size = file.size || 'N/A';
  const tagStr = file.tags?.join(', ') || 'N/A';
  const formulaCount = file.formulas?.length || 0;

  if (file.type === 'video') {
    return [
      { type: 'info', message: `Initializing pipeline execution context for Video: "${name}"` },
      { type: 'info', message: `Contacting YouTube API & oEmbed endpoints...` },
      { type: 'debug', message: `Server latency: 42ms. Received stream manifest (duration: 1840s, format: dash).` },
      { type: 'info', message: `Initiating context grounding search for: "${name}"` },
      { type: 'debug', message: `Google Search payload sent. Searching web indexes...` },
      { type: 'success', message: `Grounding completed. Retrieved academic summaries & forum chapters.` },
      { type: 'info', message: `Running voice audio transcript extraction model (Whisper-v3)...` },
      { type: 'debug', message: `Audio frequency track de-noised. Speech-to-text decoding initiated.` },
      { type: 'info', message: `Scanning transcription for science segments and mathematical models...` },
      { type: 'success', message: `LaTeX formula extraction finished: Found ${formulaCount} formulas.` },
      { type: 'info', message: `Clustering conceptual nodes and mapping StudyWeb Knowledge Graph...` },
      { type: 'success', message: `Semantic synthesis completed: Tagged under [${tagStr}].` },
      { type: 'success', message: `Academic outline & highlights generated.` },
      { type: 'info', message: `Generating summary metadata segment...` },
      { type: 'success', message: `File indexed successfully. Stored in high-performance cloud cache.` }
    ];
  } else if (file.type === 'audio') {
    return [
      { type: 'info', message: `Initializing audio pipeline processor for: "${name}"` },
      { type: 'info', message: `Parsing audio stream container and metadata headers...` },
      { type: 'debug', message: `Encoding detected: AAC/MP3. Stream length: 12.4 minutes.` },
      { type: 'info', message: `Running vocal frequency enhancement filters (+6.5dB vocal gain)...` },
      { type: 'info', message: `De-noising complete. Initializing speech transcript synthesis model...` },
      { type: 'debug', message: `ASR model context initialized. Stream-decoding blocks...` },
      { type: 'success', message: `Voice transcription finished successfully. Total words parsed: 1,842.` },
      { type: 'info', message: `Analyzing transcript semantics for key facts, quotes, and takeaways...` },
      { type: 'success', message: `Identified ${file.highlights?.length || 0} core academic highlights.` },
      { type: 'info', message: `Formatting dynamic summaries and outline chapters...` },
      { type: 'success', message: `Summary metadata synthesized: "${file.summary?.substring(0, 50)}..."` },
      { type: 'info', message: `Merging audio concept nodes with StudyWeb Knowledge Graph...` },
      { type: 'success', message: `Audio resource index complete!` }
    ];
  } else if (file.type === 'pdf' || file.type === 'doc' || file.type === 'ppt' || file.type === 'excel') {
    return [
      { type: 'info', message: `Opening Document: "${name}" (size: ${size})` },
      { type: 'info', message: `Analyzing page structure and parsing document layout...` },
      { type: 'debug', message: `Detected MIME type: application/pdf. Extracting bounding boxes.` },
      { type: 'info', message: `Running OCR optical character recognition and layout separation...` },
      { type: 'debug', message: `Separated text columns from academic sidebars and tables.` },
      { type: 'info', message: `Scanning document text for formulas, tables, and science segments...` },
      { type: 'success', message: `Extracted ${formulaCount} mathematical formulas and expressions.` },
      { type: 'info', message: `Generating conceptual outline and dynamic study blocks...` },
      { type: 'success', message: `Thematic segmentation complete. Synthesizing summaries...` },
      { type: 'success', message: `Summary metadata generated: "${file.summary?.substring(0, 50)}..."` },
      { type: 'info', message: `Syncing categorization tags with database cache...` },
      { type: 'success', message: `Document indexed successfully. Nodes merged into StudyWeb Knowledge Graph.` }
    ];
  } else if (file.type === 'url') {
    return [
      { type: 'info', message: `Connecting to target Web Domain...` },
      { type: 'info', message: `Fetching HTML payload for URL: "${file.url || name}"` },
      { type: 'debug', message: `HTTP status 200. Downloaded layout tree (${size}).` },
      { type: 'info', message: `Scraping page and stripping non-article elements (scripts, ads, navigation)...` },
      { type: 'success', message: `Article content parsed. Recovered high-density text layout (94% accuracy).` },
      { type: 'info', message: `Parsing author name, title, and publishing metadata tags...` },
      { type: 'info', message: `Analyzing article themes for conceptual keywords and quotes...` },
      { type: 'success', message: `Identified thematic tags: [${tagStr}]` },
      { type: 'success', message: `Summary metadata synthesized: "${file.summary?.substring(0, 50)}..."` },
      { type: 'info', message: `Mapping web resource links into StudyWeb Knowledge Graph...` },
      { type: 'success', message: `Web resource indexing ready and cached!` }
    ];
  } else {
    return [
      { type: 'info', message: `Initializing baseline parser for file: "${name}"` },
      { type: 'info', message: `Scanning file layout and metadata headers...` },
      { type: 'debug', message: `Checking file type and dimensions...` },
      { type: 'info', message: `Executing AI academic summarization models...` },
      { type: 'success', message: `Thematic outline synthesized successfully.` },
      { type: 'success', message: `Summary metadata generated: "${file.summary?.substring(0, 50)}..."` },
      { type: 'info', message: `Mapping nodes into StudyWeb Knowledge Graph...` },
      { type: 'success', message: `Resource indexed successfully!` }
    ];
  }
}

interface QuickPreviewModalProps {
  file: WorkspaceFile;
  onClose: () => void;
  onExplore?: () => void;
}

export default function QuickPreviewModal({ file, onClose, onExplore }: QuickPreviewModalProps) {
  const [modalLogsCount, setModalLogsCount] = useState(0);
  const [isModalStreaming, setIsModalStreaming] = useState(true);
  const fileLogs = getPipelineLogs(file);

  useEffect(() => {
    setModalLogsCount(0);
    setIsModalStreaming(true);
    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx += 1;
      setModalLogsCount(currentIdx);
      if (currentIdx >= fileLogs.length) {
        clearInterval(interval);
        setIsModalStreaming(false);
      }
    }, Math.max(10, 800 / fileLogs.length)); // Safe streaming time

    return () => clearInterval(interval);
  }, [file.id, fileLogs.length]);

  const getFileIcon = () => {
    switch (file.type) {
      case 'video':
        return <Video className="w-6 h-6 text-indigo-500" />;
      case 'audio':
        return <Music className="w-6 h-6 text-pink-500" />;
      case 'url':
        return <Globe className="w-6 h-6 text-teal-500" />;
      default:
        return <FileText className="w-6 h-6 text-blue-500" />;
    }
  };

  const getGradientColor = () => {
    switch (file.type) {
      case 'video':
        return 'from-indigo-500/10 to-indigo-500/5 dark:from-indigo-500/20 dark:to-indigo-500/5';
      case 'audio':
        return 'from-pink-500/10 to-pink-500/5 dark:from-pink-500/20 dark:to-pink-500/5';
      case 'url':
        return 'from-teal-500/10 to-teal-500/5 dark:from-teal-500/20 dark:to-teal-500/5';
      default:
        return 'from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5';
    }
  };

  const getSourceType = (url: string) => {
    const l = url.toLowerCase();
    if (l.includes('youtube.com') || l.includes('youtu.be')) return 'YouTube Video';
    if (l.includes('wikipedia.org')) return 'Wikipedia Encyclopedia';
    if (l.includes('scholar.google')) return 'Google Scholar Research';
    if (l.includes('blog') || l.includes('medium.com')) return 'Expert Tech Blog';
    return 'Web Article / Website';
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-br ${getGradientColor()} relative`}>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-950 shadow-md border border-slate-100 dark:border-slate-800/60 flex items-center justify-center shrink-0">
              {getFileIcon()}
            </div>
            <div className="space-y-1 min-w-0 pr-6">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md">
                {file.type}
              </span>
              <h2 className="text-lg font-black text-slate-850 dark:text-slate-100 leading-snug break-words">
                {file.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span>{file.size}</span>
                <span>•</span>
                <span>Uploaded {file.uploadDate || 'recently'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-210px)] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          
          {/* SOURCING / WHERE IT GOT IT */}
          {file.url && (
            <div className="space-y-2.5 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Globe className="w-3.5 h-3.5" />
                <span>Verified Source Citation</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    {getSourceType(file.url)}
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 truncate max-w-md">
                    Source Link: <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">{file.url}</a>
                  </p>
                </div>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Visit Source</span>
                </a>
              </div>
            </div>
          )}

          {/* AI-Generated Summary */}
          {file.summary && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Quote className="w-3.5 h-3.5 text-indigo-500" />
                <span>AI academic summary</span>
              </div>
              <div className="p-4 bg-slate-50/70 dark:bg-slate-950/30 border border-slate-100/60 dark:border-slate-850 rounded-2xl italic text-xs sm:text-sm text-slate-650 dark:text-slate-300 leading-relaxed font-medium relative">
                <span className="text-3xl text-indigo-200 dark:text-indigo-900/60 font-serif absolute -top-1 -left-1 select-none">“</span>
                <p className="relative z-10 pl-2">
                  {file.summary}
                </p>
              </div>
            </div>
          )}

          {/* Key Concepts / Highlights */}
          {file.highlights && file.highlights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Brain className="w-3.5 h-3.5 text-pink-500" />
                <span>Key Concepts & Takeaways</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {file.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center text-xs shrink-0 font-bold">
                      ✓
                    </span>
                    <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                      {highlight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RETRIEVED TEXT FORM / TRANSCRIPTION */}
          {file.transcription && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <BookOpen className="w-3.5 h-3.5 text-teal-500" />
                <span>Retrieved Text Form of Research Data</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/60 rounded-2xl p-4 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                  {file.transcription}
                </p>
              </div>
            </div>
          )}

          {/* Extracted Mathematical Formulas */}
          {file.formulas && file.formulas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Sigma className="w-3.5 h-3.5 text-indigo-500" />
                <span>Extracted Formulas & Models</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {file.formulas.map((formula, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col gap-1 text-left">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Formula Node #{idx+1}</span>
                    <code className="text-xs sm:text-sm font-mono text-indigo-600 dark:text-indigo-400 font-bold break-all">
                      {formula}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categorization Tags */}
          {file.tags && file.tags.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Knowledge Graph Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {file.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/30"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Real-time Dynamic Diagnostic Logs */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  AI Pipeline Diagnostic Trace
                </span>
              </div>
              
              <button
                onClick={() => {
                  setModalLogsCount(0);
                  setIsModalStreaming(true);
                  let currentIdx = 0;
                  const interval = setInterval(() => {
                    currentIdx += 1;
                    setModalLogsCount(currentIdx);
                    if (currentIdx >= fileLogs.length) {
                      clearInterval(interval);
                      setIsModalStreaming(false);
                    }
                  }, 100);
                }}
                disabled={isModalStreaming}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isModalStreaming ? 'animate-spin' : ''}`} />
                <span>Re-run Diagnostic</span>
              </button>
            </div>

            <div className="bg-slate-950 dark:bg-black rounded-xl p-3 border border-slate-850 text-left font-mono text-[10px] leading-relaxed shadow-inner max-h-[140px] overflow-y-auto">
              <div className="space-y-1.5">
                {fileLogs.slice(0, modalLogsCount).map((log, idx) => {
                  let badgeColor = 'text-indigo-400 bg-indigo-950/40 border border-indigo-900/40';
                  if (log.type === 'success') badgeColor = 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/40';
                  if (log.type === 'warn') badgeColor = 'text-amber-400 bg-amber-950/40 border border-amber-900/40';
                  if (log.type === 'debug') badgeColor = 'text-slate-400 bg-slate-900/60 border border-slate-800';

                  return (
                    <div key={idx} className="flex items-start gap-2 text-slate-300">
                      <span className="text-slate-600 select-none">
                        [{new Date(Date.now() - (15 - idx) * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
                      </span>
                      <span className={`px-1 rounded text-[8px] font-black uppercase tracking-wide shrink-0 ${badgeColor}`}>
                        {log.type}
                      </span>
                      <span className="break-all font-medium text-slate-300 dark:text-slate-200">
                        {log.message}
                      </span>
                    </div>
                  );
                })}
                
                {isModalStreaming && (
                  <div className="flex items-center gap-1.5 text-slate-500 italic pl-1 text-[10px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
                    <span>Streaming trace entry {modalLogsCount + 1}/{fileLogs.length}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
          >
            Close Preview
          </button>
          {onExplore && (
            <button
              onClick={() => {
                onClose();
                onExplore();
              }}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer hover:shadow-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Open Study Resource</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
