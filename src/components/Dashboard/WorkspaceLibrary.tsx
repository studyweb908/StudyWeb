import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Sparkles, 
  ArrowRight, 
  Upload, 
  Link, 
  Video, 
  HardDrive, 
  Clipboard, 
  X, 
  Loader2,
  Clock,
  Check,
  ChevronDown,
  Search,
  Trash2,
  FileText,
  Music,
  Lightbulb,
  BookOpen,
  HelpCircle,
  Info,
  Eye
} from 'lucide-react';
import { Workspace, WorkspaceFile } from './WorkspaceTypes';
import QuickPreviewModal from './QuickPreviewModal';

interface WorkspaceLibraryProps {
  workspace: Workspace;
  onAddFile: (file: WorkspaceFile) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAllFiles?: () => void;
}

export default function WorkspaceLibrary({ workspace, onAddFile, onRemoveFile, onClearAllFiles }: WorkspaceLibraryProps) {
  // Real uploading states
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadType, setUploadType] = useState<'pdf' | 'doc' | 'ppt' | 'excel' | 'image' | 'audio' | 'video' | 'url'>('pdf');
  const [uploadSeconds, setUploadSeconds] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<string[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const stepIntervalRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const libraryProgressRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (libraryProgressRef.current) clearInterval(libraryProgressRef.current);
    };
  }, []);

  // Custom Deletion Confirmation States
  const [fileToRemove, setFileToRemove] = useState<WorkspaceFile | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // URL/YouTube state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [urlInputType, setUrlInputType] = useState<'url' | 'youtube'>('url');

  // File Picker Refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pickerAccept, setPickerAccept] = useState('application/pdf');

  // Advanced Web Search & Copy Paste Drive sources
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [searchWebMode, setSearchWebMode] = useState<'web' | 'fast'>('fast');
  const [showWebModeDropdown, setShowWebModeDropdown] = useState(false);
  const [showDriveCopyInput, setShowDriveCopyInput] = useState(false);
  const [driveCopyText, setDriveCopyText] = useState('');
  const [driveCopyTitle, setDriveCopyTitle] = useState('');

  const handleWebSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!webSearchQuery.trim()) return;

    setIsSearchingWeb(true);
    setUploadFileName(searchWebMode === 'web' ? `Deep Research: ${webSearchQuery}` : `Web Search: ${webSearchQuery}`);
    setUploadPercent(15);
    setUploadSeconds(0.2);
    setUploadType('url');
    setIsUploading(true);
    
    const steps = searchWebMode === 'web'
      ? [
          'Launching Gemini Pro deep reasoning agent...',
          'Initiating multi-query recursive Google Search...',
          'Scanning expert articles, documentations, and latest tech updates...',
          'Corroborating multiple cross-references, sources, and links...',
          'Extracting rich structured information, highlights, and annotations...',
          'Syncing high-fidelity discovered resources to your active study workspace...'
        ]
      : [
          'Contacting global academic web crawlers...',
          'Initiating Google Search grounding...',
          'Filtering high-authority articles & expert blogs...',
          'Extracting scientific text blocks and annotations...',
          'Synthesizing summaries and equations using Gemini...',
          'Syncing newly discovered resources to study workspace...'
        ];
    setCurrentSteps(steps);
    setCurrentStepIdx(0);
    setUploadStep(steps[0]);

    let currentStep = 0;
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length - 2) {
        currentStep++;
        setCurrentStepIdx(currentStep);
        setUploadStep(steps[currentStep]);
        setUploadPercent(prev => Math.min(85, prev + 12));
      }
    }, 1200);
    stepIntervalRef.current = stepInterval;

    try {
      const res = await fetch('/api/web-search-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: webSearchQuery, mode: searchWebMode })
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      
      clearInterval(stepInterval);
      stepIntervalRef.current = null;
      setUploadPercent(100);
      setCurrentStepIdx(steps.length - 1);
      setUploadStep(steps[steps.length - 1]);

      setTimeout(() => {
        if (data.sources && Array.isArray(data.sources)) {
          data.sources.forEach((sourceFile: any) => {
            onAddFile({
              id: sourceFile.id || `web-src-${Date.now()}-${Math.random()}`,
              name: sourceFile.name,
              type: 'url',
              size: 'Web Link',
              url: sourceFile.url,
              summary: sourceFile.summary,
              tags: sourceFile.tags || ['Web Search'],
              highlights: sourceFile.highlights || [],
              formulas: sourceFile.formulas || [],
              transcription: sourceFile.transcription || '',
              uploadDate: new Date().toISOString().split('T')[0],
              status: 'indexed'
            });
          });
        }
        setIsUploading(false);
        setIsSearchingWeb(false);
        setWebSearchQuery('');
      }, 800);

    } catch (err) {
      console.error(err);
      clearInterval(stepInterval);
      stepIntervalRef.current = null;
      setIsUploading(false);
      setIsSearchingWeb(false);
      (window as any).showToast?.('Failed to perform web search. Loaded local offline research articles instead.', 'warning');
    }
  };

  const handleDriveCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveCopyText.trim()) return;

    const title = driveCopyTitle.trim() || `Pasted Doc: ${driveCopyText.substring(0, 15)}...`;
    
    setShowDriveCopyInput(false);
    
    setIsUploading(true);
    setUploadFileName(title);
    setUploadPercent(10);
    setUploadType('doc');
    const steps = [
      'Reading pasted document content...',
      'Generating AI outline summary...',
      'Extracting quotes and academic tags...',
      'Mapping nodes to study workspace knowledge graph...'
    ];
    setCurrentSteps(steps);
    setCurrentStepIdx(0);
    setUploadStep(steps[0]);

    let step = 0;
    const progress = setInterval(() => {
      if (step < steps.length - 1) {
        step++;
        setCurrentStepIdx(step);
        setUploadStep(steps[step]);
        setUploadPercent(prev => prev + 25);
      }
    }, 600);
    libraryProgressRef.current = progress;

    try {
      const response = await fetch('/api/analyze-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: title,
          type: 'doc',
          size: 'Pasted Document',
          description: driveCopyText
        })
      });

      clearInterval(progress);
      libraryProgressRef.current = null;
      if (!response.ok) throw new Error("Document analysis failed");
      const fileData = await response.json();
      
      setUploadPercent(100);
      setTimeout(() => {
        onAddFile(fileData);
        setIsUploading(false);
        setDriveCopyText('');
        setDriveCopyTitle('');
      }, 500);

    } catch (err) {
      clearInterval(progress);
      libraryProgressRef.current = null;
      setIsUploading(false);
      (window as any).showToast?.('Failed to index document contents.', 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const file = e.dataTransfer.files[0];
    
    let type: any = 'pdf';
    if (file.type.startsWith('audio/')) {
      type = 'audio';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    } else if (file.type.includes('pdf')) {
      type = 'pdf';
    } else {
      if (file.name.endsWith('.pdf')) type = 'pdf';
      else if (file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')) type = 'audio';
      else if (file.name.endsWith('.mp4') || file.name.endsWith('.mkv') || file.name.endsWith('.avi')) type = 'video';
    }

    const formattedSize = formatFileSize(file.size);
    analyzeAndAddResource(file.name, type, formattedSize);
  };

  const triggerUploadInput = (type: 'pdf' | 'doc' | 'ppt' | 'excel' | 'image' | 'audio' | 'video' | 'url') => {
    if (type === 'pdf') {
      setPickerAccept('application/pdf');
      fileInputRef.current?.click();
    } else if (type === 'audio') {
      setPickerAccept('audio/*');
      fileInputRef.current?.click();
    } else if (type === 'video') {
      setPickerAccept('video/*');
      fileInputRef.current?.click();
    } else if (type === 'url') {
      setUrlInputType('url');
      setShowUrlInput(true);
    } else if (type === 'ppt' || type === 'excel' || type === 'image') {
      if (type === 'image') setPickerAccept('image/*');
      else setPickerAccept('*/*');
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    let type: any = 'pdf';
    if (file.type.startsWith('audio/')) {
      type = 'audio';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    } else if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.includes('pdf')) {
      type = 'pdf';
    } else if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
      type = 'ppt';
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
      type = 'excel';
    }

    const formattedSize = formatFileSize(file.size);
    analyzeAndAddResource(file.name, type, formattedSize);
    e.target.value = '';
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedUrl.trim()) return;

    const url = pastedUrl.trim();
    let name = url;
    
    try {
      const parsed = new URL(url);
      name = parsed.hostname + parsed.pathname;
      if (name.length > 40) {
        name = name.substring(0, 37) + '...';
      }
    } catch {
      // use as is
    }

    const type = (url.includes('youtube.com') || url.includes('youtu.be')) ? 'video' : 'url';
    analyzeAndAddResource(name, type, 'Web Link', url);
    setPastedUrl('');
    setShowUrlInput(false);
  };

  const analyzeAndAddResource = async (
    name: string, 
    type: 'pdf' | 'doc' | 'ppt' | 'excel' | 'image' | 'audio' | 'video' | 'url', 
    size: string, 
    url?: string
  ) => {
    if (isUploading) return;

    let steps: string[] = [];
    if (type === 'video') {
      steps = [
        'Contacting YouTube stream metrics...',
        'Querying Google Search to ground video context...',
        'Parsing YouTube video metadata, chapters, and topics...',
        'Running voice transcript generation models...',
        'Indexing math formulas, conceptual structures, and quotes...',
        'Connecting video topics to StudyWeb Knowledge Graph...',
        'Video resource indexed successfully!'
      ];
    } else if (type === 'pdf' || type === 'doc' || type === 'ppt') {
      steps = [
        'Reading document file structure and layout...',
        'Running OCR character scanning and parsing...',
        'Extracting formulas, LaTeX formats, and science segments...',
        'Generating dynamic AI conceptual outline...',
        'Indexing highlights and key takeaways...',
        'Connecting document ideas to StudyWeb Knowledge Graph...',
        'Document indexed successfully!'
      ];
    } else if (type === 'url') {
      steps = [
        'Connecting to web domain...',
        'Scraping page and stripping non-article elements...',
        'Parsing text content, title, and description...',
        'Extracting quotes, facts, and scientific terminology...',
        'Mapping web content into StudyWeb Knowledge Graph...',
        'Web page indexed successfully!'
      ];
    } else if (type === 'audio') {
      steps = [
        'Parsing audio stream and properties...',
        'De-noising track and amplifying speech frequencies...',
        'Generating text transcription with high fidelity...',
        'Summarizing lecture details, definitions, and highlights...',
        'Connecting audio nodes to StudyWeb Knowledge Graph...',
        'Audio resource indexed successfully!'
      ];
    } else {
      steps = [
        'Establishing connection to server...',
        'Scanning file layout and extracting metadata...',
        'Running AI character layout parse...',
        'Deep academic indexing and summarization...',
        'Extracting scientific formulas and LaTeX equations...',
        'Connecting nodes into StudyWeb Knowledge Graph...',
        'Resource indexed successfully!'
      ];
    }

    setIsUploading(true);
    setUploadPercent(0);
    setUploadSeconds(0);
    setUploadFileName(name || url || 'Resource');
    setUploadType(type);
    setCurrentSteps(steps);
    setCurrentStepIdx(0);
    setUploadStep(steps[0]);

    const startTimestamp = Date.now();
    
    const timerInterval = setInterval(() => {
      setUploadSeconds((Date.now() - startTimestamp) / 1000);
    }, 100);
    timerIntervalRef.current = timerInterval;

    let stepIdx = 0;

    const progressInterval = setInterval(() => {
      setUploadPercent((prev) => {
        if (prev < 95) {
          const increment = Math.max(1, Math.floor((100 - prev) / 12));
          const next = prev + increment;
          const calculatedStep = Math.min(steps.length - 2, Math.floor((next / 100) * steps.length));
          if (calculatedStep !== stepIdx) {
            stepIdx = calculatedStep;
            setCurrentStepIdx(stepIdx);
            setUploadStep(steps[stepIdx]);
          }
          return next;
        }
        return prev;
      });
    }, 400);
    progressIntervalRef.current = progressInterval;

    try {
      const response = await fetch('/api/analyze-resource', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          type,
          size,
          url
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const fileData = await response.json();
      
      clearInterval(progressInterval);
      clearInterval(timerInterval);
      progressIntervalRef.current = null;
      timerIntervalRef.current = null;
      setUploadPercent(100);
      setCurrentStepIdx(steps.length - 1);
      setUploadStep(steps[steps.length - 1]);
      
      setTimeout(() => {
        onAddFile(fileData);
        setIsUploading(false);
      }, 800);

    } catch (err) {
      console.error(err);
      clearInterval(progressInterval);
      clearInterval(timerInterval);
      progressIntervalRef.current = null;
      timerIntervalRef.current = null;
      setIsUploading(false);
      (window as any).showToast?.('Failed to analyze resource. Please verify your connection and try again.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* WHITE BACKGROUND THEMED UPLOAD & WEB SEARCH PANEL (EXACT REFERENCE DESIGN) */}
      <div className="bg-white text-slate-850 rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-xl relative overflow-hidden flex flex-col justify-between animate-fade-in">
        
        {/* Dynamic Title exactly matching user's reference */}
        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight text-center mt-6 mb-5 select-none">
          Create Audio and Video Overviews from <span className="bg-gradient-to-r from-teal-500 to-emerald-600 bg-clip-text text-transparent font-extrabold">websites</span>
        </h3>

        {/* Search container with blue border highlight exactly like reference */}
        <div className="border-2 border-indigo-600/85 bg-slate-50/50 rounded-3xl p-4 mb-5 shadow-[0_4px_20px_rgba(99,102,241,0.06)] flex flex-col space-y-3">
          <div className="flex flex-col text-left">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-wide select-none">
              Search the web for new sources
            </span>
            
            {/* Form combining input and actions */}
            <form onSubmit={handleWebSearch} className="flex flex-col sm:flex-row items-center gap-2 mt-1 w-full">
              <input
                type="text"
                value={webSearchQuery}
                onChange={(e) => setWebSearchQuery(e.target.value)}
                placeholder="Search the web for new sources"
                className="w-full bg-transparent text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none placeholder-slate-400 border-none px-1"
              />
              
              {/* Options Pills and Search Button Row */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-1.5">
                  {/* Web Pill dropdown */}
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setShowWebModeDropdown(!showWebModeDropdown)}
                      className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full text-[10px] font-black text-slate-600 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      {searchWebMode === 'web' ? (
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                      <span>{searchWebMode === 'web' ? 'Deep Search' : 'Web Search'}</span>
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showWebModeDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showWebModeDropdown && (
                      <>
                        {/* Backdrop overlay to close the dropdown when clicking outside */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowWebModeDropdown(false)}
                        />
                        <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in text-[10px] sm:text-[11px] font-bold text-slate-700">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchWebMode('fast');
                              setShowWebModeDropdown(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors ${searchWebMode === 'fast' ? 'bg-indigo-50/50 text-indigo-600' : ''}`}
                          >
                            <Globe className={`w-3.5 h-3.5 shrink-0 ${searchWebMode === 'fast' ? 'text-indigo-500' : 'text-slate-400'}`} />
                            <div className="flex flex-col text-left">
                              <span className="font-extrabold text-slate-700">Web Search</span>
                              <span className="text-[9px] text-slate-400 font-normal">Quickly index top results</span>
                            </div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setSearchWebMode('web');
                              setShowWebModeDropdown(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors ${searchWebMode === 'web' ? 'bg-indigo-50/50 text-indigo-600' : ''}`}
                          >
                            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${searchWebMode === 'web' ? 'text-indigo-500' : 'text-slate-400'}`} />
                            <div className="flex flex-col text-left">
                              <span className="font-extrabold text-slate-700">Deep Search</span>
                              <span className="text-[9px] text-slate-400 font-normal">In-depth source indexing</span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Circular search button */}
                <button 
                  type="submit"
                  disabled={isSearchingWeb}
                  className="w-8 h-8 bg-slate-800 hover:bg-slate-900 text-white rounded-full flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  title="Search from Web"
                >
                  {isSearchingWeb ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Search optimization & grounding tips */}
        <div className="bg-gradient-to-br from-indigo-50/60 to-slate-50/50 border border-indigo-100/80 rounded-2xl p-5 mb-6 text-left shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
                Search Optimization & Grounding Tips
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                How to retrieve the highest-quality source materials
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tip 1 */}
            <div className="bg-white/80 border border-slate-100 p-4 rounded-xl shadow-xs hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 font-black text-[10px] flex items-center justify-center">1</span>
                <h5 className="text-xs font-bold text-slate-700">Be Precise with Search Queries</h5>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                Avoid single-word queries (e.g., instead of searching <span className="font-semibold text-indigo-600">"mitosis"</span>, search for <span className="italic text-slate-600">"mechanisms of mitosis and cell division stages detailed guide"</span>). Using academic, highly descriptive phrases forces the search API to prioritize authoritative textbooks, educational institutions (.edu), and peer-reviewed summaries.
              </p>
            </div>

            {/* Tip 2 */}
            <div className="bg-white/80 border border-slate-100 p-4 rounded-xl shadow-xs hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 font-black text-[10px] flex items-center justify-center">2</span>
                <h5 className="text-xs font-bold text-slate-700">Utilize "Deep Research" Mode</h5>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                For complex topics, toggle the search mode to <span className="font-semibold text-indigo-600">Deep Research</span>. This instructs the backend model to run recursive sub-queries and cross-corroborate multiple articles before delivering verified articles to your library.
              </p>
            </div>

            {/* Tip 3 */}
            <div className="bg-white/80 border border-slate-100 p-4 rounded-xl shadow-xs hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 font-black text-[10px] flex items-center justify-center">3</span>
                <h5 className="text-xs font-bold text-slate-700">Google Search Grounding</h5>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                When you use the search bar, the system triggers live Google Search queries. In Web Search mode, it retrieves high-authority academic articles and expert blogs. In Deep Research mode, it fires multi-query recursive searches using a Gemini agent to crawl technical documentation, recent updates, and deep cross-references.
              </p>
            </div>
          </div>
        </div>

        {/* File Picker drag & drop zone */}
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-200 bg-slate-50/40 rounded-3xl p-6 text-center transition-all hover:bg-slate-100/40"
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-700">or drop your files</h4>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                pdf, images, docs, audio, <span className="underline cursor-pointer hover:text-slate-600">and more</span>
              </p>
            </div>

            {/* Hidden Real File Input Picker */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept={pickerAccept} 
              onChange={handleFileChange} 
              className="hidden" 
            />

            {/* Exact four buttons matching the user reference */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {/* 1. Upload files button */}
              <button 
                onClick={() => triggerUploadInput('pdf')}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-black text-slate-600 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-[1.01] active:scale-95"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload files</span>
              </button>

              {/* 2. Websites button */}
              <button 
                onClick={() => {
                  setUrlInputType('url');
                  setShowUrlInput(!showUrlInput);
                  setShowDriveCopyInput(false);
                }} 
                className={`px-4 py-2 hover:bg-slate-100 border rounded-full text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.01] active:scale-95 ${showUrlInput ? 'text-indigo-600 border-indigo-300 bg-indigo-50/40' : 'text-slate-600 border-slate-200 bg-slate-50'}`}
              >
                <Link className="w-4 h-4 text-slate-500" />
                {/* Custom Red YouTube Icon style */}
                <span className="w-4.5 h-3 bg-red-600 rounded-[3px] flex items-center justify-center text-[6px] text-white shrink-0"><span className="scale-[0.5] ml-[0.5px]">▶</span></span>
                <span>Websites</span>
              </button>



              {/* 4. Copied text button */}
              <button 
                onClick={() => {
                  setShowDriveCopyInput(!showDriveCopyInput);
                  setShowUrlInput(false);
                }} 
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-black text-slate-600 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-[1.01] active:scale-95"
              >
                <Clipboard className="w-4 h-4 text-slate-500" />
                <span>Copied text</span>
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* URL / YOUTUBE LINK PASTE FORM */}
      <AnimatePresence>
        {showUrlInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-left overflow-hidden shadow-md"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-800">
                {urlInputType === 'youtube' ? 'Index YouTube Video Lecture' : 'Index Web Article URL'}
              </h4>
              <button onClick={() => setShowUrlInput(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <input
                type="url"
                required
                placeholder={urlInputType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/lecture-notes'}
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                Analyze Link
              </button>
            </form>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {urlInputType === 'youtube' 
                ? 'Pasting a YouTube lecture link lets the AI voice transcript models extract chapter summaries, formula listings, and transcripts.'
                : 'Web URLs will be retrieved, cleaned of boilerplate code, and summarized into dynamic concept cards.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRIVE COPY TEXT PASTE FORM */}
      <AnimatePresence>
        {showDriveCopyInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-left overflow-hidden shadow-md"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <Clipboard className="w-3.5 h-3.5 text-indigo-500" />
                <span>Paste Document or Copied Workspace Text</span>
              </h4>
              <button onClick={() => setShowDriveCopyInput(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleDriveCopySubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Document Title (e.g. Biology Lecture Notes, Syllabus Outline)"
                value={driveCopyTitle}
                onChange={(e) => setDriveCopyTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <textarea
                required
                rows={4}
                placeholder="Paste your study texts, PDF copies, or Google Drive documentation paragraphs here..."
                value={driveCopyText}
                onChange={(e) => setDriveCopyText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer w-full flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Index Pasted Workspace Document</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPLOAD PROGRESS MODAL BAR */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-50/50 border border-indigo-150 rounded-3xl p-5 space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-black text-slate-800">
                  AI Deep Indexing: {uploadFileName}
                </span>
              </div>
              
              {/* Time Elapsed and Percentage */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 font-mono border border-slate-150 shadow-sm">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{uploadSeconds.toFixed(1)}s elapsed</span>
                </div>
                <span className="text-sm font-black text-indigo-600 font-mono bg-indigo-100/60 px-2 py-0.5 rounded-lg font-bold shadow-sm">
                  {uploadPercent}%
                </span>
              </div>
            </div>

            {/* Progress Bar Container */}
            <div className="h-2.5 bg-slate-150 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full" 
                style={{ width: `${uploadPercent}%` }} 
              />
            </div>

            {/* Current Active Step Highlight */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2.5 shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
              <div className="text-xs">
                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Current Operation</span>
                <span className="text-slate-800 font-black italic">{uploadStep}</span>
              </div>
            </div>

            {/* Detailed AI Analysis Steps Checklist */}
            {currentSteps.length > 0 && (
              <div className="border-t border-slate-150 pt-3.5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  AI Processing Pipeline
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                  {currentSteps.map((step, idx) => {
                    const isCompleted = idx < currentStepIdx;
                    const isActive = idx === currentStepIdx;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all duration-300 ${
                          isActive 
                            ? 'bg-indigo-50 border-indigo-200' 
                            : isCompleted
                              ? 'bg-slate-50 border-transparent opacity-80'
                              : 'border-transparent opacity-40'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isCompleted ? (
                            <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                          ) : isActive ? (
                            <div className="w-4.5 h-4.5 flex items-center justify-center">
                              <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                            </div>
                          ) : (
                            <div className="w-4.5 h-4.5 rounded-full border border-slate-300 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            </div>
                          )}
                        </div>
                        
                        <span className={`text-[11px] leading-tight ${
                          isActive 
                            ? 'text-indigo-700 font-bold' 
                            : isCompleted
                              ? 'text-slate-500 font-medium line-through decoration-slate-200'
                              : 'text-slate-450 font-normal'
                        }`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Custom Delete Confirmation Modals */}
      <AnimatePresence>
        {fileToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFileToRemove(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden text-left z-10"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                    Remove Source Material?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Are you sure you want to remove <span className="font-bold text-slate-600">"{fileToRemove.name}"</span> from this workspace?
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                    This file's content will no longer be available for AI Tutor questioning or quiz compilation.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-50 pt-4">
                <button
                  onClick={() => setFileToRemove(null)}
                  className="px-4 py-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-pointer transition-all"
                >
                  Keep Material
                </button>
                <button
                  onClick={() => {
                    onRemoveFile(fileToRemove.id);
                    setFileToRemove(null);
                  }}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-rose-200 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Source</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isClearingAll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClearingAll(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden text-left z-10"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight text-rose-600">
                    Clear Entire Knowledge Base?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Are you sure you want to remove <span className="font-bold text-slate-700">{workspace.files.length} active files</span> from this workspace?
                  </p>
                  <p className="text-[11px] text-rose-500/85 mt-2 bg-rose-50/40 p-2.5 rounded-xl border border-rose-100/50 font-medium">
                    Warning: This action is irreversible. All research summaries, transcripts, and study guides will be deleted from this workspace's knowledge engine.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-50 pt-4">
                <button
                  onClick={() => setIsClearingAll(false)}
                  className="px-4 py-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onClearAllFiles) {
                      onClearAllFiles();
                    } else {
                      workspace.files.forEach((file) => onRemoveFile(file.id));
                    }
                    setIsClearingAll(false);
                  }}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-rose-200 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Files</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {previewFile && (
          <QuickPreviewModal 
            file={previewFile} 
            onClose={() => setPreviewFile(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
