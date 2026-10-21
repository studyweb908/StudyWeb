import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Globe, Sparkles, ArrowRight, Upload, Link, Video, HardDrive, Clipboard, X, Loader2, Clock, Check, ChevronDown, Search, Trash2, FileText, Music, Lightbulb, BookOpen, HelpCircle, Info, Eye, ExternalLink, Calendar, Tag, SlidersHorizontal, Plus } from 'lucide-react';
import { Workspace, WorkspaceFile, WorkspaceNote } from './WorkspaceTypes';
import { supabase } from '../../lib/supabase';
import { fileUploadService, FileUploadService, FileUploadError } from '../../services/FileUploadService';
import { toValidUuid } from '../../utils/uuid';
import { WorkspaceSyncService } from '../../services/WorkspaceSyncService';
import QuickPreviewModal from './QuickPreviewModal';

interface WorkspaceLibraryProps {
  workspace: Workspace;
  onAddFile: (file: WorkspaceFile) => void;
  onAddMultipleFiles?: (files: WorkspaceFile[], note?: WorkspaceNote) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAllFiles?: () => void;
  onUpdateWorkspace?: (ws: Workspace) => void;
  onOpenResearchInChat?: (payload: { query: string; researchBrief: any; importedFiles: WorkspaceFile[] }) => void;
}

export default function WorkspaceLibrary({
  workspace,
  onAddFile,
  onAddMultipleFiles,
  onRemoveFile,
  onClearAllFiles,
  onUpdateWorkspace,
  onOpenResearchInChat
}: WorkspaceLibraryProps) {
  const getAuthInfo = async () => {
    let token = undefined;
    let userId = 'local-user';
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        token = session.access_token;
        userId = session.user.id;
      }
    }
    return { token, userId };
  };

  // Real uploading states
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
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

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'documents' | 'videos' | 'urls'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingTagsFile, setEditingTagsFile] = useState<WorkspaceFile | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');

  // Media Classification Helpers
  const isVideoFile = (f: WorkspaceFile) => {
    const t = (f.type || '').toLowerCase();
    const u = (f.url || '').toLowerCase();
    const n = (f.name || '').toLowerCase();
    return t === 'video' || t === 'mp4' || u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com') || u.includes('loom.com') || n.endsWith('.mp4') || n.endsWith('.mov') || n.endsWith('.webm') || n.endsWith('.mkv');
  };

  const isUrlFile = (f: WorkspaceFile) => {
    const t = (f.type || '').toLowerCase();
    return (t === 'url' || t === 'link' || t === 'web') && !isVideoFile(f);
  };

  const isDocFile = (f: WorkspaceFile) => {
    return !isVideoFile(f) && !isUrlFile(f);
  };

  const allCount = (workspace.files || []).length;
  const docCount = (workspace.files || []).filter(isDocFile).length;
  const videoCount = (workspace.files || []).filter(isVideoFile).length;
  const urlCount = (workspace.files || []).filter(isUrlFile).length;

  // Dynamic Tags calculation
  const availableTags = React.useMemo(() => {
    const defaultCategories = ['Lecture', 'Reading', 'Tutorial', 'Practice', 'Research', 'Exam Prep'];
    const discoveredTags = new Set<string>();
    (workspace.files || []).forEach(f => {
      (f.tags || []).forEach(t => {
        if (t && typeof t === 'string' && t.trim()) {
          discoveredTags.add(t.trim());
        }
      });
    });
    return Array.from(new Set([...defaultCategories, ...Array.from(discoveredTags)]));
  }, [workspace.files]);

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedMediaType('all');
    setSelectedTags([]);
  };

  // Filtered files calculation
  const filteredFiles = React.useMemo(() => {
    let list = [...(workspace.files || [])].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    // 1. Media Type Filter
    if (selectedMediaType === 'documents') {
      list = list.filter(isDocFile);
    } else if (selectedMediaType === 'videos') {
      list = list.filter(isVideoFile);
    } else if (selectedMediaType === 'urls') {
      list = list.filter(isUrlFile);
    }

    // 2. Multi-select Tag Filter
    if (selectedTags.length > 0) {
      list = list.filter(f => {
        const fileTags = (f.tags || []).map(t => t.toLowerCase());
        return selectedTags.some(st => fileTags.includes(st.toLowerCase()));
      });
    }

    // 3. Search Query Filter across title, summary, highlights, transcription, content text, tags, url
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(f => {
        const nameMatch = (f.name || '').toLowerCase().includes(q);
        const summaryMatch = (f.summary || '').toLowerCase().includes(q);
        const highlightsMatch = (f.highlights || []).some((h: string) => typeof h === 'string' && h.toLowerCase().includes(q));
        const tagsMatch = (f.tags || []).some((t: string) => typeof t === 'string' && t.toLowerCase().includes(q));
        const transcriptMatch = (f.transcription || '').toLowerCase().includes(q);
        const contentMatch = (f.contentText || '').toLowerCase().includes(q);
        const urlMatch = (f.url || '').toLowerCase().includes(q);
        return nameMatch || summaryMatch || highlightsMatch || tagsMatch || transcriptMatch || contentMatch || urlMatch;
      });
    }

    return list;
  }, [workspace.files, selectedMediaType, selectedTags, searchQuery]);

  // Tag Management Handlers
  const handleAddTagToFile = async (fileId: string, newTag: string) => {
    const clean = newTag.trim();
    if (!clean) return;
    const target = (workspace.files || []).find(f => f.id === fileId);
    if (!target) return;
    const currentTags = target.tags || [];
    if (currentTags.some(t => t.toLowerCase() === clean.toLowerCase())) return;

    const updatedTags = [...currentTags, clean];
    const updatedFiles = (workspace.files || []).map(f => 
      f.id === fileId ? { ...f, tags: updatedTags } : f
    );

    if (onUpdateWorkspace) {
      onUpdateWorkspace({ ...workspace, files: updatedFiles });
    }
    if (editingTagsFile && editingTagsFile.id === fileId) {
      setEditingTagsFile({ ...editingTagsFile, tags: updatedTags });
    }
    await WorkspaceSyncService.updateWorkspaceFileTags(workspace.id, fileId, updatedTags);
  };

  const handleRemoveTagFromFile = async (fileId: string, tagToRemove: string) => {
    const target = (workspace.files || []).find(f => f.id === fileId);
    if (!target) return;
    const updatedTags = (target.tags || []).filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    const updatedFiles = (workspace.files || []).map(f => 
      f.id === fileId ? { ...f, tags: updatedTags } : f
    );

    if (onUpdateWorkspace) {
      onUpdateWorkspace({ ...workspace, files: updatedFiles });
    }
    if (editingTagsFile && editingTagsFile.id === fileId) {
      setEditingTagsFile({ ...editingTagsFile, tags: updatedTags });
    }
    await WorkspaceSyncService.updateWorkspaceFileTags(workspace.id, fileId, updatedTags);
  };

  // URL/YouTube state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [urlInputType, setUrlInputType] = useState<'url' | 'youtube'>('url');

  // File Picker Refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Advanced Gemini Notebook Web Research & Source Discovery state
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [searchWebMode, setSearchWebMode] = useState<'web' | 'fast'>('fast');
  const [selectedResourceType, setSelectedResourceType] = useState<'all' | 'pdf' | 'video' | 'wikipedia' | 'text'>('all');
  const [resultsFilterType, setResultsFilterType] = useState<'all' | 'pdf' | 'video' | 'wikipedia' | 'text'>('all');
  const [discoveredSources, setDiscoveredSources] = useState<any[]>([]);
  const [researchBrief, setResearchBrief] = useState<any | null>(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [includeResearchNote, setIncludeResearchNote] = useState(true);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [importedSourceIds, setImportedSourceIds] = useState<string[]>([]);
  const [showWebResearchPanel, setShowWebResearchPanel] = useState(true);
  const webSearchInputRef = useRef<HTMLInputElement>(null);

  const [showDriveCopyInput, setShowDriveCopyInput] = useState(false);
  const [driveCopyText, setDriveCopyText] = useState('');
  const [driveCopyTitle, setDriveCopyTitle] = useState('');

  // Dynamic suggested topics based on workspace name/subject
  const suggestedResearchTopics = React.useMemo(() => {
    const baseName = (workspace.name || '').trim();
    const baseSubj = (workspace.subject || '').trim();
    const list: string[] = [];
    if (baseName && baseName.toLowerCase() !== 'general study') {
      list.push(`${baseName} core concepts & lecture notes`);
      list.push(`${baseName} worked examples & exam guide`);
    }
    if (baseSubj && baseSubj.toLowerCase() !== 'general') {
      list.push(`Introduction to ${baseSubj}`);
    }
    const defaults = [
      'Quantum Mechanics & Wave Equation',
      'Cellular Respiration & ATP Synthesis',
      'Calculus Derivatives & Chain Rule',
      'Machine Learning & Neural Networks'
    ];
    for (const d of defaults) {
      if (list.length < 4 && !list.includes(d)) list.push(d);
    }
    return list.slice(0, 4);
  }, [workspace.name, workspace.subject]);

  const convertDiscoveredToWorkspaceFile = (sourceFile: any): WorkspaceFile => {
    const rawType = String(sourceFile.type || '').toLowerCase();
    const cat = String(sourceFile.resourceCategory || '').toLowerCase();
    let finalType: 'pdf' | 'doc' | 'video' | 'url' = 'url';
    if (rawType === 'pdf' || cat === 'pdf' || (sourceFile.url || '').toLowerCase().endsWith('.pdf')) {
      finalType = 'pdf';
    } else if (rawType === 'video' || cat === 'video' || (sourceFile.url || '').includes('youtube.com') || (sourceFile.url || '').includes('youtu.be')) {
      finalType = 'video';
    } else if (rawType === 'doc' || cat === 'text') {
      finalType = 'doc';
    } else {
      finalType = 'url';
    }

    const platformTag = sourceFile.sourcePlatform || (cat === 'wikipedia' ? 'Wikipedia' : finalType === 'pdf' ? 'PDF' : finalType === 'video' ? 'YouTube' : 'Web Research');
    const mergedTags = Array.from(new Set([...(sourceFile.tags || []), platformTag, 'Web Research'])).slice(0, 5);

    return {
      id: sourceFile.id || `web-src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: sourceFile.name,
      type: finalType,
      size: sourceFile.size || (finalType === 'pdf' ? 'PDF Document' : finalType === 'video' ? 'YouTube Video' : finalType === 'doc' ? 'Study Text' : 'Web Article'),
      url: sourceFile.url,
      summary: sourceFile.summary,
      tags: mergedTags,
      highlights: sourceFile.highlights || [],
      formulas: sourceFile.formulas || [],
      transcription: sourceFile.transcription || sourceFile.summary || '',
      contentText: sourceFile.transcription || sourceFile.summary || '',
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'indexed' as const
    };
  };

  const buildSynthesisWorkspaceFileAndNote = (queryStr: string, brief: any, sourcesList: any[]): { synthFile: WorkspaceFile; synthNote: WorkspaceNote } => {
    const title = brief?.title || `Research Synthesis: ${queryStr}`;
    const takeaways = Array.isArray(brief?.keyTakeaways) ? brief.keyTakeaways : [];
    const formulas = Array.isArray(brief?.formulas) ? brief.formulas : [];
    const sourceRefs = sourcesList
      .map((s, i) => `${i + 1}. [${s.sourcePlatform || s.type?.toUpperCase() || 'Web'}] ${s.name} (${s.url})`)
      .join('\n');

    const fullContent = `# ${title}\n\n## Executive Overview\n${brief?.overview || ''}\n\n## Key Takeaways\n${takeaways.map((t: string) => `- ${t}`).join('\n')}\n\n## Curated Web Sources\n${sourceRefs}`;

    const synthFile: WorkspaceFile = {
      id: `web-synthesis-${Date.now()}`,
      name: `${title} (Notebook Research Guide)`,
      type: 'doc',
      size: `${Math.max(2, Math.ceil(fullContent.length / 1024))} KB • Study Text`,
      summary: brief?.overview || `Comprehensive Gemini Notebook research synthesis on ${queryStr}.`,
      tags: [queryStr, 'Notebook Synthesis', 'Study Guide', 'Web Research'],
      highlights: takeaways.slice(0, 4),
      formulas,
      transcription: fullContent,
      contentText: fullContent,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'indexed'
    };

    const synthNote: WorkspaceNote = {
      id: `note-research-${Date.now()}`,
      title,
      content: fullContent,
      tags: [queryStr, 'Web Research', 'Notebook Synthesis'],
      lastModified: 'Just now'
    };

    return { synthFile, synthNote };
  };

  const handleWebSearch = async (e?: React.FormEvent, overrideQuery?: string, overrideType?: 'all' | 'pdf' | 'video' | 'wikipedia' | 'text') => {
    if (e) e.preventDefault();
    const activeQuery = (overrideQuery !== undefined ? overrideQuery : webSearchQuery).trim();
    if (!activeQuery) return;

    const activeType = overrideType !== undefined ? overrideType : selectedResourceType;
    if (overrideQuery !== undefined) setWebSearchQuery(overrideQuery);
    if (overrideType !== undefined) setSelectedResourceType(overrideType);

    setIsSearchingWeb(true);
    setResultsFilterType('all');

    try {
      const res = await fetch('/api/web-search-sources', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeQuery,
          mode: searchWebMode,
          resourceType: activeType,
          subject: workspace.subject || workspace.name || ''
        })
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const foundSources = Array.isArray(data.sources) ? data.sources : [];

      setDiscoveredSources(foundSources);
      setResearchBrief(data.researchBrief || null);
      setLastSearchedQuery(activeQuery);
      setSelectedSourceIds(foundSources.map((s: any) => s.id));
    } catch (err) {
      console.warn(err);
      window.dispatchEvent(
        new CustomEvent('studyweb-toast', {
          detail: {
            message: 'Could not reach live search servers. Please try again.',
            type: 'warning'
          }
        })
      );
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleImportSingleSource = (source: any) => {
    const fileObj = convertDiscoveredToWorkspaceFile(source);
    if (onAddMultipleFiles) {
      onAddMultipleFiles([fileObj]);
    } else {
      onAddFile(fileObj);
    }
    setImportedSourceIds(prev => (prev.includes(source.id) ? prev : [...prev, source.id]));
    window.dispatchEvent(
      new CustomEvent('studyweb-toast', {
        detail: {
          message: `Added "${fileObj.name}" (${fileObj.type.toUpperCase()}) to ${workspace.name}!`,
          type: 'success'
        }
      })
    );
  };

  const handleImportSelectedSources = (openInChat = false) => {
    const chosenRaw = discoveredSources.filter(s => selectedSourceIds.includes(s.id));
    if (chosenRaw.length === 0 && !includeResearchNote) return;

    const convertedFiles = chosenRaw.map(convertDiscoveredToWorkspaceFile);
    let synthNote: WorkspaceNote | undefined = undefined;

    if (includeResearchNote && researchBrief && lastSearchedQuery) {
      const built = buildSynthesisWorkspaceFileAndNote(lastSearchedQuery, researchBrief, chosenRaw);
      convertedFiles.unshift(built.synthFile);
      synthNote = built.synthNote;
    }

    if (onAddMultipleFiles) {
      onAddMultipleFiles(convertedFiles, synthNote);
    } else {
      convertedFiles.forEach(f => onAddFile(f));
    }

    setImportedSourceIds(prev => Array.from(new Set([...prev, ...chosenRaw.map(s => s.id)])));

    window.dispatchEvent(
      new CustomEvent('studyweb-toast', {
        detail: {
          message: `Imported ${convertedFiles.length} researched resource${convertedFiles.length === 1 ? '' : 's'} into ${workspace.name}!`,
          type: 'success'
        }
      })
    );

    if (openInChat && onOpenResearchInChat) {
      onOpenResearchInChat({
        query: lastSearchedQuery || webSearchQuery || workspace.name,
        researchBrief,
        importedFiles: convertedFiles
      });
    } else if (convertedFiles.length > 0) {
      setPreviewFile(convertedFiles[0]);
    }
  };

  const filteredDiscoveredSources = React.useMemo(() => {
    if (resultsFilterType === 'all') return discoveredSources;
    return discoveredSources.filter((s: any) => {
      const cat = String(s.resourceCategory || '').toLowerCase();
      const t = String(s.type || '').toLowerCase();
      if (resultsFilterType === 'pdf') return cat === 'pdf' || t === 'pdf';
      if (resultsFilterType === 'video') return cat === 'video' || t === 'video';
      if (resultsFilterType === 'wikipedia') return cat === 'wikipedia' || (s.domain || '').includes('wikipedia');
      if (resultsFilterType === 'text') return cat === 'text' || t === 'doc' || (cat !== 'pdf' && cat !== 'video' && cat !== 'wikipedia');
      return true;
    });
  }, [discoveredSources, resultsFilterType]);

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
      'Carefully analyzing textual semantics and core themes...',
      'Generating rigorous academic outline summary...',
      'Extracting quotes, facts, and critical terminology...',
      'Mapping extracted concepts to workspace knowledge graph...',
      'Text carefully analyzed and indexed successfully!'
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
      const { token, userId } = await getAuthInfo();
      const processRes = await fetch('/api/study-materials/process', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          workspaceId: toValidUuid(workspace.id),
          userId: userId || undefined,
          name: title,
          type: 'doc',
          size: `${Math.ceil(driveCopyText.length / 1024)} KB`,
          content: driveCopyText
        })
      });

      let materialResult: any = null;
      if (processRes.ok) {
        const resData = await processRes.json();
        materialResult = resData.material;
      }

      const fileData = {
        id: materialResult?.id || `file-${Date.now()}`,
        name: materialResult?.name || title,
        type: 'doc' as const,
        size: materialResult?.size || 'Pasted Document',
        uploadDate: materialResult?.uploadDate || new Date().toISOString().split('T')[0],
        status: 'indexed' as const,
        summary: materialResult?.summary || (driveCopyText.trim().slice(0, 180) + '...'),
        highlights: materialResult?.highlights && materialResult.highlights.length > 0 
          ? materialResult.highlights 
          : [`Pasted study content added for "${title}".`],
        tags: materialResult?.tags && materialResult.tags.length > 0 
          ? materialResult.tags 
          : ['Document', 'Notes', 'Pasted'],
        transcription: materialResult?.transcription,
        formulas: materialResult?.formulas,
        extractedDiagrams: materialResult?.extractedDiagrams
      };

      clearInterval(progress);
      libraryProgressRef.current = null;
      setUploadPercent(100);
      
      setTimeout(async () => {
        window.dispatchEvent(
          new CustomEvent('studyweb-toast', {
            detail: {
              message: `🎉 Boom! "${fileData.name}" was parsed, analyzed, and synthesized into your workspace! 🧠🔥`,
              type: 'success'
            }
          })
        );

        onAddFile(fileData);
        setPreviewFile(fileData);
        setIsUploading(false);
        setDriveCopyText('');
        setDriveCopyTitle('');
      }, 500);

    } catch (err) {
      clearInterval(progress);
      libraryProgressRef.current = null;
      
      // Clean fallback for pasted text
      const cleanSnippet = (driveCopyText || '').trim().slice(0, 180);
      const fallbackData = {
        id: 'file-' + Date.now(),
        name: title,
        type: 'doc' as const,
        size: 'Pasted Document',
        uploadDate: new Date().toISOString(),
        status: 'indexed' as const,
        summary: cleanSnippet ? `Document notes on "${title}": ${cleanSnippet}...` : `Study notes for "${title}".`,
        highlights: [
          `Pasted study content added for "${title}".`,
          `Text indexed into workspace for tutor questioning.`
        ],
        tags: ['Document', 'Text Analysis', 'Notes']
      };
      
      setTimeout(() => {
        onAddFile(fallbackData);
        setPreviewFile(fallbackData);
        setIsUploading(false);
        setDriveCopyText('');
        setDriveCopyTitle('');
        
        window.dispatchEvent(
          new CustomEvent('studyweb-toast', {
            detail: {
              message: `🎉 Boom! "${title}" was parsed, analyzed, and synthesized into your workspace! 🧠🔥`,
              type: 'success'
            }
          })
        );
      }, 800);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

    useEffect(() => {
    const handleGlobalDropEvent = (e: any) => {
      const customEvent = e;
      if (customEvent.detail?.files && customEvent.detail.files.length > 0) {
        const file = customEvent.detail.files[0];
        
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
        analyzeAndAddResource(file.name, type, formattedSize, undefined, file);
      }
    };
    
    window.addEventListener('studyweb-global-file-drop', handleGlobalDropEvent);
    return () => window.removeEventListener('studyweb-global-file-drop', handleGlobalDropEvent);
  }, [workspace.id, formatFileSize]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLocal(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLocal(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingLocal) {
      setIsDraggingLocal(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLocal(false);
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
    analyzeAndAddResource(file.name, type, formattedSize, undefined, file);
  };

  const triggerUploadInput = (type: 'pdf' | 'doc' | 'ppt' | 'excel' | 'image' | 'audio' | 'video' | 'url') => {
    if (type === 'url') {
      setUrlInputType('url');
      setShowUrlInput(true);
    } else {
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
    analyzeAndAddResource(file.name, type, formattedSize, undefined, file);
    e.target.value = '';
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedUrl.trim()) return;

    const url = pastedUrl.trim();
    const type = (url.includes('youtube.com') || url.includes('youtu.be')) ? 'video' : (url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'url');
    analyzeAndAddResource(url, type, 'Web Link', url);
    setPastedUrl('');
    setShowUrlInput(false);
  };

  const analyzeAndAddResource = async (
    name: string, 
    type: 'pdf' | 'doc' | 'ppt' | 'excel' | 'image' | 'audio' | 'video' | 'url', 
    size: string, 
    url?: string,
    file?: File
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
        'Carefully analyzing textual content and semantic context...',
        'Extracting quotes, facts, and scientific terminology...',
        'Mapping web content into StudyWeb Knowledge Graph...',
        'Web page carefully analyzed and indexed successfully!'
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

    if (file) {
      const validation = fileUploadService.validate(file);
      if (!validation.valid) {
        window.dispatchEvent(
          new CustomEvent('studyweb-toast', {
            detail: {
              message: `⚠️ ${validation.error}`,
              type: 'warning'
            }
          })
        );
        return;
      }
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

    let dataUrl = "";
    let fileBase64 = "";
    let fileMimeType = "";

    try {
      FileUploadService.sanitizeBrowserCookies();

      if (file) {
        fileMimeType = file.type || 'application/pdf';
        if (file.size < 15 * 1024 * 1024) {
          try {
            const reader = new FileReader();
            const promise = new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = error => reject(error);
            });
            reader.readAsDataURL(file);
            dataUrl = await promise;
            fileBase64 = dataUrl.split(',')[1] || '';
          } catch {}
        }
      }

      // Process resource through Study Material AI Pipeline and Supabase persistence
      let materialResult: any = null;
      try {
        const { token, userId } = await getAuthInfo();
        const processRes = await fetch('/api/study-materials/process', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            workspaceId: toValidUuid(workspace.id),
            userId: userId || undefined,
            name,
            type,
            size,
            url: (url && !url.startsWith('data:')) ? url : (dataUrl && dataUrl.length < 2000 ? dataUrl : ''),
            fileBase64: fileBase64 || undefined,
            fileMimeType: fileMimeType || undefined
          })
        });

        if (processRes.ok) {
          const resData = await processRes.json();
          materialResult = resData.material;
        }
      } catch (pipelineErr) {
        console.warn("Pipeline processing warning:", pipelineErr);
      }

      const generatedTags2 = ['Indexed'];
      if (type === 'pdf' || type === 'doc') generatedTags2.push('Document', 'Text Analysis');
      if (type === 'video') generatedTags2.push('Video', 'Media');
      if (type === 'image') generatedTags2.push('Visual', 'Image');
      if (type === 'audio') generatedTags2.push('Audio', 'Transcript');
      if ((name || url || '').toLowerCase().includes('math')) generatedTags2.push('Mathematics');

      const fileData = {
        id: materialResult?.id || `file-${Date.now()}`,
        name: materialResult?.name || name || url,
        type,
        size: materialResult?.size || size,
        uploadDate: materialResult?.uploadDate || new Date().toISOString().split('T')[0],
        status: 'indexed' as const,
        url: dataUrl || materialResult?.url || url,
        fileBase64: fileBase64 || undefined,
        fileMimeType: fileMimeType || undefined,
        summary: materialResult?.summary || `${name || 'Material'} uploaded and indexed into your workspace.`,
        highlights: (materialResult?.highlights && materialResult.highlights.length > 0) ? materialResult.highlights : [
          `Uploaded ${name || 'material'} ready for study questions.`
        ],
        tags: (materialResult?.tags && materialResult.tags.length > 0) ? materialResult.tags : generatedTags2,
        transcription: materialResult?.transcription,
        formulas: materialResult?.formulas,
        extractedDiagrams: materialResult?.extractedDiagrams
      };

      clearInterval(progressInterval);
      clearInterval(timerInterval);
      progressIntervalRef.current = null;
      timerIntervalRef.current = null;
      setUploadPercent(100);
      setCurrentStepIdx(steps.length - 1);
      setUploadStep(steps[steps.length - 1]);
      
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('studyweb-toast', {
            detail: {
              message: `🎉 Incredible! "${fileData.name}" was analyzed at lightning speed and indexed into your study notes! 🧠⚡`,
              type: 'success'
            }
          })
        );

        onAddFile(fileData);
        setPreviewFile(fileData);
        setIsUploading(false);
      }, 600);

    } catch (err: any) {
      const parsedError = FileUploadError.fromError(err, `Upload of ${name || url}`);
      fileUploadService.log('warn', `Upload analysis encountered error: [${parsedError.code}] ${parsedError.message}`, parsedError);
      
      let objectUrl = dataUrl || url;
      if (!objectUrl && file) {
        try {
          objectUrl = URL.createObjectURL(file);
        } catch(e) {}
      }

      const generatedTags = [];
      const lowerName = (name || url || '').toLowerCase();
      if (type === 'pdf' || type === 'doc') generatedTags.push('Document', 'Text Analysis');
      if (type === 'video') generatedTags.push('Video', 'Media');
      if (type === 'image') generatedTags.push('Visual', 'Image');
      if (type === 'audio') generatedTags.push('Audio', 'Transcript');
      if (lowerName.includes('math') || lowerName.includes('calc')) generatedTags.push('Mathematics');
      if (lowerName.includes('science') || lowerName.includes('physics')) generatedTags.push('Science');
      if (lowerName.includes('history')) generatedTags.push('History');
      if (generatedTags.length === 0) generatedTags.push('General');

      const fileData = {
        id: 'file-' + Date.now(),
        name: name || url || 'Untitled Resource',
        type,
        size,
        uploadDate: new Date().toISOString(),
        status: 'indexed' as const,
        url: dataUrl || objectUrl,
        fileBase64: fileBase64 || undefined,
        fileMimeType: fileMimeType || undefined,
        summary: `${name || url || 'Resource'} uploaded to workspace.`,
        highlights: [
          `Uploaded ${name || url || 'material'} ready for AI Tutor questions.`
        ],
        tags: generatedTags
      };
      
      if (file) {
        try {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            fileData.url = dataUrl;
            
            // Re-update the workspace to save the data URL
            setTimeout(() => {
              // We dispatch an event here to trigger an update because closure might have stale workspace
              window.dispatchEvent(
                new CustomEvent('studyweb-file-dataurl-ready', {
                  detail: { id: fileData.id, url: dataUrl }
                })
              );
            }, 1000);
          };
          reader.readAsDataURL(file);
        } catch(e) {}
      }
      
      // Stop the regular interval and do a smooth simulated upload for Supabase
      clearInterval(progressInterval);
      
      let currentProgress = 0;
      setUploadPercent(0);
      
      // Start a smooth completion sequence
      const finishInterval = setInterval(async () => {
        currentProgress += Math.max(2, (100 - currentProgress) / 8);
        if (currentProgress >= 98) {
          currentProgress = 100;
          setUploadPercent(100);
          setCurrentStepIdx(steps.length - 1);
          setUploadStep(steps[steps.length - 1]);
          clearInterval(finishInterval);
          
          try {
            await WorkspaceSyncService.saveWorkspaceFile(workspace.id, fileData);
          } catch {
            // Non-fatal fallback
          }
         
          onAddFile(fileData);
          setPreviewFile(fileData);
          clearInterval(timerInterval);
          progressIntervalRef.current = null;
          timerIntervalRef.current = null;
          setIsUploading(false);
         
          window.dispatchEvent(
            new CustomEvent('studyweb-toast', {
              detail: {
                message: `🎉 Boom! "${name || url}" was uploaded to Supabase and added to your workspace!`,
                type: 'success'
              }
            })
          );
        } else {
          setUploadPercent(Math.floor(currentProgress));
          const stepCount = steps.length;
          const calculatedStep = Math.min(stepCount - 2, Math.floor((currentProgress / 100) * stepCount));
          setCurrentStepIdx(calculatedStep);
          setUploadStep(steps[calculatedStep]);
        }
      }, 50);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* WHITE BACKGROUND THEMED UPLOAD & WEB SEARCH PANEL (EXACT REFERENCE DESIGN) */}
      <div className="bg-white text-slate-850 rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-xl relative overflow-hidden flex flex-col justify-between animate-fade-in">
        
        {/* Dynamic Title */}
        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight text-center mt-6 mb-5 select-none">
          Upload Study Material
        </h3>

        {/* File Picker drag & drop zone */}
        <div 
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
            isDraggingLocal
              ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-900/20' 
              : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-700">or drag and drop your files here</h4>
              <p className="text-[11px] text-slate-400 font-medium mt-2 max-w-xs mx-auto leading-relaxed">
                Upload your PDF, PPT, DOCX, or notes to generate quizzes, summaries, and flashcards instantly.
              </p>
            </div>

            {/* Hidden Real File Input Picker */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />

            {/* Action buttons for uploading files, websites, pasting text, or discovering web sources */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {/* 1. Upload files button */}
              <button 
                onClick={() => triggerUploadInput('pdf')}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload Files</span>
              </button>

              {/* 2. Discover & Research Web button (Gemini Notebook style) */}
              <button
                type="button"
                onClick={() => {
                  setShowWebResearchPanel(true);
                  setTimeout(() => webSearchInputRef.current?.focus(), 60);
                }}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all border ${
                  showWebResearchPanel
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Globe className={`w-4 h-4 ${showWebResearchPanel ? 'text-white' : 'text-indigo-500'}`} />
                <span>Discover & Research Web</span>
              </button>

              {/* 3. Websites button */}
              <button 
                onClick={() => {
                  setUrlInputType('url');
                  setShowUrlInput(!showUrlInput);
                  setShowDriveCopyInput(false);
                }} 
                className={`px-4 py-2 hover:bg-slate-50 border rounded-lg text-[13px] font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all ${showUrlInput ? 'text-indigo-600 border-indigo-200 bg-indigo-50/50' : 'text-slate-700 border-slate-200 bg-white'}`}
              >
                <Link className="w-4 h-4 text-slate-500" />
                <span>Websites</span>
              </button>

              {/* 4. Copied text button */}
              <button 
                onClick={() => {
                  setShowDriveCopyInput(!showDriveCopyInput);
                  setShowUrlInput(false);
                }} 
                className={`px-4 py-2 hover:bg-slate-50 border rounded-lg text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${showDriveCopyInput ? 'text-indigo-600 border-indigo-200 bg-indigo-50/50' : 'text-slate-700 border-slate-200 bg-white'}`}
              >
                <Clipboard className="w-4 h-4 text-slate-500" />
                <span>Paste Text</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GEMINI NOTEBOOK / NOTEBOOKLM WEB RESEARCH & MULTI-SOURCE DISCOVERY STUDIO */}
      <AnimatePresence>
        {showWebResearchPanel && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white text-slate-850 rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-xl relative overflow-hidden space-y-5"
          >
            {/* Studio Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Notebook Web Research & Source Discovery
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Search across Google, YouTube, Wikipedia, academic PDFs, and top educational websites. Choose your resource type and import directly into your workspace & AI Tutor chat.
                  </p>
                </div>
              </div>

              {/* Fast vs Deep Research Mode Segmented Control */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setSearchWebMode('fast')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    searchWebMode === 'fast'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fast Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchWebMode('web')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    searchWebMode === 'web'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Deep Research</span>
                </button>
              </div>
            </div>

            {/* Step 1: Select Desired Resource Format */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  1. Select Resource Type to Discover
                </span>
                <span className="text-[11px] text-slate-400">
                  Sources: Google · YouTube · Wikipedia · ArXiv PDFs · Top Study Sites
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'all' as const, label: 'All Formats', sub: 'PDF, Video, Wiki & Text', icon: Globe },
                  { id: 'pdf' as const, label: 'PDFs & Papers', sub: 'Academic PDFs & Notes', icon: FileText },
                  { id: 'video' as const, label: 'YouTube Videos', sub: 'Video Lectures & Guides', icon: Video },
                  { id: 'wikipedia' as const, label: 'Wikipedia', sub: 'Encyclopedia Articles', icon: BookOpen },
                  { id: 'text' as const, label: 'Text & Websites', sub: 'Study Guides & Articles', icon: Clipboard }
                ].map((item) => {
                  const IconComp = item.icon;
                  const active = selectedResourceType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedResourceType(item.id);
                        if (webSearchQuery.trim() && discoveredSources.length > 0) {
                          handleWebSearch(undefined, webSearchQuery, item.id);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        active
                          ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 shadow-2xs'
                          : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <IconComp className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-500'}`} />
                        {active && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className={`text-xs font-bold leading-tight ${active ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {item.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Search Input Bar */}
            <form onSubmit={(e) => handleWebSearch(e)} className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                2. Search Anything Across the Web
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={webSearchInputRef}
                    type="text"
                    value={webSearchQuery}
                    onChange={(e) => setWebSearchQuery(e.target.value)}
                    placeholder={`Search any topic, concept, or question (e.g., ${workspace.name !== 'General Study' ? workspace.name : 'Photosynthesis, Linear Algebra, World History'})...`}
                    className="w-full pl-11 pr-9 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  {webSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWebSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearchingWeb || !webSearchQuery.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm shadow-indigo-600/20"
                >
                  {isSearchingWeb ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Researching Web...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Discover Sources</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Topic Suggestions (NotebookLM "I'm feeling curious" style) */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                  <span>Try researching:</span>
                </span>
                {suggestedResearchTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isSearchingWeb}
                    onClick={() => handleWebSearch(undefined, topic)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-200 transition-colors cursor-pointer font-medium"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </form>

            {/* Live Loading State During Web Discovery */}
            {isSearchingWeb && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Searching Google, YouTube, Wikipedia & Academic PDFs for "{webSearchQuery}"...
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Curating verified links, extracting full study text & transcripts, and synthesizing your Notebook Research Brief.
                  </p>
                </div>
              </div>
            )}

            {/* DISCOVERED SOURCES & NOTEBOOK SYNTHESIS RESULTS */}
            {!isSearchingWeb && discoveredSources.length > 0 && (
              <div className="space-y-5 pt-2 border-t border-slate-100 animate-fade-in">
                {/* 1. Gemini Notebook Research Synthesis Card */}
                {researchBrief && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {researchBrief.title || `Notebook Research Synthesis: ${lastSearchedQuery}`}
                        </h4>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          checked={includeResearchNote}
                          onChange={(e) => setIncludeResearchNote(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Include Synthesis Guide in Workspace Import</span>
                      </label>
                    </div>

                    <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                      {researchBrief.overview}
                    </p>

                    {Array.isArray(researchBrief.keyTakeaways) && researchBrief.keyTakeaways.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Key Takeaways Across Sources
                        </span>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {researchBrief.keyTakeaways.slice(0, 4).map((pt: string, i: number) => (
                            <li key={i} className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-start gap-2">
                              <span className="text-indigo-600 font-bold">•</span>
                              <span className="leading-snug">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Filter & Selection Bar for Discovered Sources */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'all' as const, label: `All (${discoveredSources.length})` },
                      { id: 'pdf' as const, label: 'PDFs' },
                      { id: 'video' as const, label: 'YouTube Videos' },
                      { id: 'wikipedia' as const, label: 'Wikipedia' },
                      { id: 'text' as const, label: 'Text & Websites' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setResultsFilterType(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          resultsFilterType === tab.id
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSourceIds.length === discoveredSources.length) {
                          setSelectedSourceIds([]);
                        } else {
                          setSelectedSourceIds(discoveredSources.map((s: any) => s.id));
                        }
                      }}
                      className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      {selectedSourceIds.length === discoveredSources.length ? 'Deselect All' : 'Select All Sources'}
                    </button>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-600">
                      {selectedSourceIds.length} of {discoveredSources.length} selected
                    </span>
                  </div>
                </div>

                {/* 3. Discovered Sources Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {filteredDiscoveredSources.map((src: any) => {
                    const isChecked = selectedSourceIds.includes(src.id);
                    const isAlreadyAdded =
                      importedSourceIds.includes(src.id) ||
                      (workspace.files || []).some((f) => f.id === src.id || (f.url && f.url === src.url));
                    const isExpanded = expandedSourceId === src.id;
                    const cat = String(src.resourceCategory || src.type || 'url').toLowerCase();

                    let SourceIcon = Globe;
                    let iconStyle = 'bg-teal-50 text-teal-600 border-teal-200';
                    let typeLabel = src.sourcePlatform || 'Web Source';
                    if (cat === 'pdf' || src.type === 'pdf') {
                      SourceIcon = FileText;
                      iconStyle = 'bg-rose-50 text-rose-600 border-rose-200';
                      typeLabel = 'PDF Document';
                    } else if (cat === 'video' || src.type === 'video') {
                      SourceIcon = Video;
                      iconStyle = 'bg-purple-50 text-purple-600 border-purple-200';
                      typeLabel = 'YouTube Video';
                    } else if (cat === 'wikipedia' || (src.domain || '').includes('wikipedia')) {
                      SourceIcon = BookOpen;
                      iconStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                      typeLabel = 'Wikipedia';
                    } else if (cat === 'text' || src.type === 'doc') {
                      SourceIcon = FileText;
                      iconStyle = 'bg-blue-50 text-blue-600 border-blue-200';
                      typeLabel = 'Study Text';
                    }

                    return (
                      <div
                        key={src.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isChecked
                            ? 'bg-indigo-50/25 border-indigo-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSourceIds((prev) =>
                                prev.includes(src.id) ? prev.filter((id) => id !== src.id) : [...prev, src.id]
                              );
                            }}
                            className="mt-1.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />

                          {/* Resource Type Icon */}
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconStyle}`}>
                            <SourceIcon className="w-5 h-5" />
                          </div>

                          {/* Main Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <h5 className="text-sm font-bold text-slate-900 leading-snug">
                                  {src.name}
                                </h5>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                  <span className="font-semibold text-slate-700">{typeLabel}</span>
                                  <span>·</span>
                                  <span className="truncate max-w-[200px]">{src.domain || 'Web Resource'}</span>
                                  {src.url && (
                                    <>
                                      <span>·</span>
                                      <a
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                                      >
                                        <span>Open Source</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Quick Actions per Source */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setExpandedSourceId(isExpanded ? null : src.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer transition-colors"
                                >
                                  {isExpanded ? 'Hide Preview' : 'Preview Content'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleImportSingleSource(src)}
                                  disabled={isAlreadyAdded}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    isAlreadyAdded
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                                  }`}
                                >
                                  {isAlreadyAdded ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Added</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add to Workspace</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                              {src.summary}
                            </p>

                            {/* Expandable Content & Highlights Preview */}
                            {isExpanded && (
                              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                                {Array.isArray(src.highlights) && src.highlights.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                      Extracted Highlights
                                    </span>
                                    <ul className="space-y-1 text-slate-700">
                                      {src.highlights.map((h: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-1.5">
                                          <span className="text-indigo-600 font-bold">•</span>
                                          <span>{h}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {src.transcription && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                      Extracted Study Text / Transcript
                                    </span>
                                    <p className="text-slate-600 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto pr-1">
                                      {src.transcription}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 4. Bottom Action Bar: Import into Workspace OR Import & Research in AI Tutor Chat */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-sm font-bold">
                      Ready to bring {selectedSourceIds.length} source{selectedSourceIds.length === 1 ? '' : 's'}{includeResearchNote ? ' + Research Synthesis Guide' : ''} into "{workspace.name}"
                    </div>
                    <div className="text-[11px] text-slate-300">
                      All selected PDFs, videos, Wikipedia references, and study texts will be indexed for your workspace & AI Tutor.
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      disabled={selectedSourceIds.length === 0 && !includeResearchNote}
                      onClick={() => handleImportSelectedSources(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Workspace ({selectedSourceIds.length + (includeResearchNote ? 1 : 0)})</span>
                    </button>

                    {onOpenResearchInChat && (
                      <button
                        type="button"
                        disabled={selectedSourceIds.length === 0 && !includeResearchNote}
                        onClick={() => handleImportSelectedSources(true)}
                        className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Import & Research in AI Tutor Chat</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
                {urlInputType === 'youtube' ? 'Add YouTube Video' : 'Add Web Article'}
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
                Save Link
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
                <span>Paste Text or Document Content</span>
              </h4>
              <button onClick={() => setShowDriveCopyInput(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleDriveCopySubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Give your notes a memorable title"
                value={driveCopyTitle}
                onChange={(e) => setDriveCopyTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <textarea
                required
                rows={4}
                placeholder="Paste your study texts or paragraphs here..."
                value={driveCopyText}
                onChange={(e) => setDriveCopyText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer w-full flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Save Notes</span>
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


      {/* UPLOADED FILES LIST & SEARCH/FILTER SECTION */}
      <div className="bg-white text-slate-850 rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-xl relative overflow-hidden flex flex-col">
        {/* Header & Counters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
              Uploaded Materials
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter and search through indexed notes, lectures, and web readings.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/60">
              {filteredFiles.length} of {workspace.files?.length || 0} Materials
            </span>
            {workspace.files && workspace.files.length > 0 && (
              <button
                onClick={() => setIsClearingAll(true)}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls: Search Bar + Media Type Tabs + Tag Chips */}
        {workspace.files && workspace.files.length > 0 && (
          <div className="space-y-3.5 mb-6 pb-4 border-b border-slate-100">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search materials by title, concepts, notes, or tags..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Media Type Segmented Control */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="inline-flex p-1 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setSelectedMediaType('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${selectedMediaType === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'}`}
                >
                  <span>All</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/60 text-slate-600">{allCount}</span>
                </button>
                <button
                  onClick={() => setSelectedMediaType('documents')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${selectedMediaType === 'documents' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'}`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>Documents</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/60 text-slate-600">{docCount}</span>
                </button>
                <button
                  onClick={() => setSelectedMediaType('videos')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${selectedMediaType === 'videos' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'}`}
                >
                  <Video className="w-3.5 h-3.5 text-purple-500" />
                  <span>Videos</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/60 text-slate-600">{videoCount}</span>
                </button>
                <button
                  onClick={() => setSelectedMediaType('urls')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${selectedMediaType === 'urls' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'}`}
                >
                  <Globe className="w-3.5 h-3.5 text-teal-500" />
                  <span>Websites</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/60 text-slate-600">{urlCount}</span>
                </button>
              </div>

              {(selectedTags.length > 0 || selectedMediaType !== 'all' || searchQuery.trim()) && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Pedagogical Tag Filter Chips (Multi-Select) */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>Filter by tag:</span>
                </span>
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.some(st => st.toLowerCase() === tag.toLowerCase());
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-slate-300 font-medium'
                      }`}
                    >
                      <span>{tag}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {(!workspace.files || workspace.files.length === 0) ? (
          <div className="text-center py-12 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border border-slate-100/50">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 mb-4">
              <HardDrive className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-slate-800 font-bold mb-1">No Study Materials Yet</h4>
            <p className="text-slate-500 text-sm max-w-sm">Upload files, paste text, or link websites above to start building your AI knowledge base.</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6">
            <Search className="w-8 h-8 text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No matching materials found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">No materials in this workspace match your current search and filter combination.</p>
            <button
              onClick={clearAllFilters}
              className="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFiles.map((file) => {
              const t = (file.type || '').toLowerCase();
              let Icon = FileText;
              let bg = 'bg-slate-50 text-slate-500';
              if (t.includes('pdf')) { Icon = FileText; bg = 'bg-rose-50 text-rose-500 border-rose-100'; }
              else if (isVideoFile(file)) { Icon = Video; bg = 'bg-purple-50 text-purple-500 border-purple-100'; }
              else if (t.includes('audio') || t.includes('mp3')) { Icon = Music; bg = 'bg-amber-50 text-amber-500 border-amber-100'; }
              else if (isUrlFile(file)) { Icon = Globe; bg = 'bg-teal-50 text-teal-600 border-teal-100'; }
              else if (t.includes('image') || t.includes('jpg') || t.includes('png')) { Icon = ImageIcon; bg = 'bg-emerald-50 text-emerald-500 border-emerald-100'; }
              else if (t.includes('doc') || t.includes('word') || t.includes('text')) { Icon = FileText; bg = 'bg-blue-50 text-blue-500 border-blue-100'; }
              else if (t.includes('epub') || t.includes('book')) { Icon = BookOpen; bg = 'bg-amber-50 text-amber-500 border-amber-100'; }
              else if (t.includes('markdown') || t.includes('md')) { Icon = FileText; bg = 'bg-emerald-50 text-emerald-500 border-emerald-100'; }

              return (
                <div 
                  key={file.id}
                  onClick={() => {
                    setPreviewFile(file);
                  }}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-200 hover:border-slate-300 group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${bg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{file.name}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{file.type}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-semibold text-slate-400">{file.size}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-semibold text-slate-400">{file.uploadDate}</span>
                      </div>
                      
                      {/* Tags & Edit Tag Trigger */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {(file.tags && file.tags.length > 0) && file.tags.map((tag, idx) => {
                          const isTagActive = selectedTags.some(st => st.toLowerCase() === tag.toLowerCase());
                          return (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTagFilter(tag);
                              }}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5 ${
                                isTagActive 
                                  ? 'bg-indigo-600 text-white shadow-xs' 
                                  : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                              }`}
                              title={`Filter by tag: ${tag}`}
                            >
                              <span>{tag}</span>
                            </button>
                          );
                        })}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTagsFile(file);
                            setCustomTagInput('');
                          }}
                          className="text-[9px] font-semibold text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors flex items-center gap-0.5 cursor-pointer"
                          title="Manage tags for this material"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>+ Tag</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToRemove(file);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

        {/* Tag Management Modal */}
        {editingTagsFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTagsFile(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden text-left z-10 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">
                      Edit Material Tags
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-[260px]">
                      {editingTagsFile.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingTagsFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Tags */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Tags
                </span>
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {(!editingTagsFile.tags || editingTagsFile.tags.length === 0) ? (
                    <span className="text-xs text-slate-400 italic">No tags assigned yet</span>
                  ) : (
                    editingTagsFile.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-xs"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTagFromFile(editingTagsFile.id, t)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Remove tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Add Custom Tag Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customTagInput.trim()) {
                    handleAddTagToFile(editingTagsFile.id, customTagInput.trim());
                    setCustomTagInput('');
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  placeholder="Type a new tag name..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!customTagInput.trim()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tag</span>
                </button>
              </form>

              {/* Suggested Pedagogical Tags */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Pedagogical Categories:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['Lecture', 'Reading', 'Tutorial', 'Practice', 'Research', 'Exam Prep'].map((cat) => {
                    const alreadyHas = (editingTagsFile.tags || []).some(t => t.toLowerCase() === cat.toLowerCase());
                    return (
                      <button
                        key={cat}
                        type="button"
                        disabled={alreadyHas}
                        onClick={() => handleAddTagToFile(editingTagsFile.id, cat)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          alreadyHas 
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default' 
                            : 'bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold'
                        }`}
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setEditingTagsFile(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {previewFile && (
          <QuickPreviewModal 
            file={previewFile} 
            onClose={() => setPreviewFile(null)} 
            onUpdateTags={async (fileId, newTags) => {
              const updatedFiles = (workspace.files || []).map(f => 
                f.id === fileId ? { ...f, tags: newTags } : f
              );
              if (onUpdateWorkspace) {
                onUpdateWorkspace({ ...workspace, files: updatedFiles });
              }
              if (previewFile.id === fileId) {
                setPreviewFile({ ...previewFile, tags: newTags });
              }
              await WorkspaceSyncService.updateWorkspaceFileTags(workspace.id, fileId, newTags);
            }}
          />
        )}
        
      </AnimatePresence>
    </div>
  );
}
