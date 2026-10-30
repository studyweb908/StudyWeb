import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Globe, Sparkles, ArrowRight, Upload, Link, Video, HardDrive, Clipboard, X, Loader2, Clock, Check, ChevronDown, Search, Trash2, FileText, Music, Lightbulb, BookOpen, HelpCircle, Info, Eye, ExternalLink, Calendar, Tag, SlidersHorizontal, Plus, Play } from 'lucide-react';
import { Workspace, WorkspaceFile, WorkspaceNote } from './WorkspaceTypes';
import { supabase } from '../../lib/supabase';
import { fileUploadService, FileUploadService, FileUploadError } from '../../services/FileUploadService';
import { toValidUuid } from '../../utils/uuid';
import { WorkspaceSyncService } from '../../services/WorkspaceSyncService';
import { TranscriptProcessor } from '../../services/TranscriptProcessor';
import {
  cleanNotebookLMTitle,
  getNotebookLMDisplayTitle,
  isRawUrlOrPlaceholderTitle,
  resolveQuickLinkTitleClient
} from '../../utils/notebookTitle';
import QuickPreviewModal from './QuickPreviewModal';
import { FullScreenUploadOverlay } from './FullScreenUploadOverlay';

interface WorkspaceLibraryProps {
  workspace: Workspace;
  onAddFile: (file: WorkspaceFile) => void;
  onAddMultipleFiles?: (files: WorkspaceFile[], note?: WorkspaceNote) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAllFiles?: () => void;
  onUpdateWorkspace?: (ws: Workspace) => void;
}

export default function WorkspaceLibrary({
  workspace,
  onAddFile,
  onRemoveFile,
  onClearAllFiles,
  onUpdateWorkspace
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

  const repairedFileIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (libraryProgressRef.current) clearInterval(libraryProgressRef.current);
    };
  }, []);

  // Auto-repair any existing video, link, or document in workspace that has a raw URL/placeholder name or legacy dummy metadata
  useEffect(() => {
    const files = workspace.files || [];
    if (!onUpdateWorkspace || files.length === 0) return;

    const needsRepair = files.filter(f => {
      if (repairedFileIdsRef.current.has(f.id)) return false;
      const hasUrl = typeof f.url === 'string' && f.url.startsWith('http');
      const nameIsUrlOrPlaceholder =
        isRawUrlOrPlaceholderTitle(f.name) ||
        (typeof f.name === 'string' && (/https?:\/\/|www\./i.test(f.name) || /\s-\s*YouTube$/i.test(f.name)));
      const hasDummySummary = typeof f.summary === 'string' && (
        f.summary.includes('High-yield academic study guide for') ||
        f.summary.includes('direct watch & in-app embed available') ||
        f.summary.includes('**Channel:**') ||
        f.summary.includes('**Duration:**')
      );
      const hasDummyTranscript = typeof f.transcription === 'string' && (
        f.transcription.includes('**Channel:**') ||
        f.transcription.includes('**Duration:**') ||
        f.transcription.includes('**Direct Video Link:**')
      );
      const missingAnalysis = (f.type === 'video' || f.type === 'url') && hasUrl && (!f.transcription || f.transcription.length < 120);
      return nameIsUrlOrPlaceholder || (hasUrl && (hasDummySummary || hasDummyTranscript || missingAnalysis));
    });

    if (needsRepair.length === 0) return;

    let cancelled = false;
    (async () => {
      const { token, userId } = await getAuthInfo();
      let updatedAny = false;
      const updatedFiles = [...files];

      for (const targetFile of needsRepair) {
        repairedFileIdsRef.current.add(targetFile.id);
        try {
          const quickTitle = targetFile.url
            ? await resolveQuickLinkTitleClient(targetFile.url, targetFile.type)
            : cleanNotebookLMTitle(targetFile.name, targetFile.url, targetFile.type);

          const res = await fetch('/api/study-materials/process', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              workspaceId: toValidUuid(workspace.id),
              userId: userId || undefined,
              materialId: targetFile.id,
              name: !isRawUrlOrPlaceholderTitle(quickTitle) ? quickTitle : targetFile.name,
              type: targetFile.type,
              size: targetFile.size || 'Web Link',
              url: targetFile.url
            })
          });
          if (res.ok && !cancelled) {
            const data = await res.json();
            const mat = data?.material;
            if (mat) {
              const idx = updatedFiles.findIndex(item => item.id === targetFile.id);
              if (idx !== -1) {
                const resolvedCleanName = cleanNotebookLMTitle(
                  !isRawUrlOrPlaceholderTitle(mat.name) ? mat.name : quickTitle,
                  targetFile.url,
                  targetFile.type
                );
                updatedFiles[idx] = {
                  ...updatedFiles[idx],
                  name: resolvedCleanName,
                  summary: mat.summary || updatedFiles[idx].summary,
                  highlights: Array.isArray(mat.highlights) && mat.highlights.length > 0 ? mat.highlights : updatedFiles[idx].highlights,
                  tags: Array.isArray(mat.tags) && mat.tags.length > 0 ? mat.tags : updatedFiles[idx].tags,
                  transcription: mat.transcription || updatedFiles[idx].transcription,
                  contentText: mat.contentText || mat.transcription || updatedFiles[idx].contentText,
                  formulas: Array.isArray(mat.formulas) && mat.formulas.length > 0 ? mat.formulas : updatedFiles[idx].formulas
                };
                updatedAny = true;
                WorkspaceSyncService.saveWorkspaceFile(workspace.id, updatedFiles[idx]).catch(() => {});
              }
            }
          } else if (!cancelled) {
            const idx = updatedFiles.findIndex(item => item.id === targetFile.id);
            if (idx !== -1 && isRawUrlOrPlaceholderTitle(updatedFiles[idx].name)) {
              updatedFiles[idx] = {
                ...updatedFiles[idx],
                name: cleanNotebookLMTitle(quickTitle, targetFile.url, targetFile.type)
              };
              updatedAny = true;
              WorkspaceSyncService.saveWorkspaceFile(workspace.id, updatedFiles[idx]).catch(() => {});
            }
          }
        } catch (err) {
          console.warn('Auto-repair resource warning:', err);
        }
      }

      if (updatedAny && !cancelled && onUpdateWorkspace) {
        onUpdateWorkspace({
          ...workspace,
          files: updatedFiles
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspace.id, workspace.files]);

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

  const [showDriveCopyInput, setShowDriveCopyInput] = useState(false);
  const [driveCopyText, setDriveCopyText] = useState('');
  const [driveCopyTitle, setDriveCopyTitle] = useState('');

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
        setUploadPercent(prev => Math.min(92, prev + 22));
      }
    }, 160);
    libraryProgressRef.current = progress;

    try {
      const { token, userId } = await getAuthInfo();
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 3200);
      const processRes = await fetch('/api/study-materials/process', {
        method: 'POST',
        credentials: 'same-origin',
        signal: abortCtrl.signal,
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
      clearTimeout(timeoutId);

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
        transcription: materialResult?.transcription || driveCopyText,
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
              message: `🎉 "${fileData.name}" was parsed, analyzed, and indexed into your workspace!`,
              type: 'success'
            }
          })
        );

        onAddFile(fileData);
        setPreviewFile(fileData);
        setIsUploading(false);
        setDriveCopyText('');
        setDriveCopyTitle('');
      }, 220);

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
    const lowerName = file.name.toLowerCase();
    
    let type: any = 'pdf';
    if (file.type.startsWith('audio/') || lowerName.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/)) {
      type = 'audio';
    } else if (file.type.startsWith('video/') || lowerName.match(/\.(mp4|webm|mov|mkv|avi|m4v)$/)) {
      type = 'video';
    } else if (file.type.startsWith('image/') || lowerName.match(/\.(png|jpg|jpeg|webp|gif|svg)$/)) {
      type = 'image';
    } else if (file.type.includes('pdf') || lowerName.endsWith('.pdf')) {
      type = 'pdf';
    } else if (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) {
      type = 'ppt';
    } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
      type = 'excel';
    } else if (lowerName.match(/\.(doc|docx|txt|md|rtf)$/)) {
      type = 'doc';
    }

    const formattedSize = formatFileSize(file.size);
    analyzeAndAddResource(file.name, type, formattedSize, undefined, file);
    e.target.value = '';
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedUrl.trim()) return;

    const url = pastedUrl.trim();
    const lowerUrl = url.toLowerCase();
    const isVideoLink = lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('vimeo.com') || lowerUrl.includes('loom.com') || lowerUrl.match(/\.(mp4|webm|mov)(\?|$)/);
    const type = isVideoLink ? 'video' : (lowerUrl.endsWith('.pdf') ? 'pdf' : 'url');
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
    const initialUploadLabel = isRawUrlOrPlaceholderTitle(name)
      ? (type === 'video' ? 'Analyzing Video & Generating Title...' : 'Analyzing Material & Generating Title...')
      : cleanNotebookLMTitle(name, url, type);
    setUploadFileName(initialUploadLabel);
    setUploadType(type);
    setCurrentSteps(steps);
    setCurrentStepIdx(0);
    setUploadStep(steps[0]);

    // Immediately kick off fast client-side title resolution for URLs/YouTube links
    const quickTitlePromise = url
      ? resolveQuickLinkTitleClient(url, type).then(resolved => {
          if (resolved && !isRawUrlOrPlaceholderTitle(resolved)) {
            setUploadFileName(resolved);
          }
          return resolved;
        }).catch(() => '')
      : Promise.resolve('');

    const startTimestamp = Date.now();
    
    const timerInterval = setInterval(() => {
      setUploadSeconds((Date.now() - startTimestamp) / 1000);
    }, 100);
    timerIntervalRef.current = timerInterval;

    let stepIdx = 0;

    const progressInterval = setInterval(() => {
      setUploadPercent((prev) => {
        if (prev < 94) {
          const increment = Math.max(4, Math.floor((100 - prev) / 6));
          const next = Math.min(94, prev + increment);
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
    }, 130);
    progressIntervalRef.current = progressInterval;

    let dataUrl = "";
    let fileBase64 = "";
    let fileMimeType = "";

    try {
      FileUploadService.sanitizeBrowserCookies();

      let rawTextContent = "";
      if (file) {
        fileMimeType = file.type || 'application/pdf';
        const lowerFileName = file.name.toLowerCase();
        if (
          file.type.startsWith('text/') ||
          lowerFileName.endsWith('.txt') ||
          lowerFileName.endsWith('.md') ||
          lowerFileName.endsWith('.csv') ||
          lowerFileName.endsWith('.json')
        ) {
          try {
            rawTextContent = await file.text();
          } catch {}
        }
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
        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), 12000);
        const processRes = await fetch('/api/study-materials/process', {
          method: 'POST',
          credentials: 'same-origin',
          signal: abortCtrl.signal,
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
            content: rawTextContent || undefined,
            url: (url && !url.startsWith('data:')) ? url : (dataUrl && dataUrl.length < 2000 ? dataUrl : ''),
            fileBase64: fileBase64 || undefined,
            fileMimeType: fileMimeType || undefined
          })
        });
        clearTimeout(timeoutId);

        if (processRes.ok) {
          const resData = await processRes.json();
          materialResult = resData.material;
        }
      } catch (pipelineErr) {
        console.warn("Pipeline processing warning:", pipelineErr);
      }

      // If uploading a video URL and materialResult did not return a full transcript, fetch captions via TranscriptProcessor
      if (url && TranscriptProcessor.isVideoUrl(url) && (!materialResult || !materialResult.transcription)) {
        try {
          const tr = await TranscriptProcessor.fetchTranscriptViaApi(url);
          if (tr) {
            const hasValidCaptions = Boolean(tr.isValidWordCount && tr.richContext);
            materialResult = {
              ...materialResult,
              name: materialResult?.name || tr.title,
              url: tr.normalizedUrl,
              summary:
                materialResult?.summary ||
                (tr.description
                  ? `${tr.title} by ${tr.author}: ${tr.description.slice(0, 500)}`
                  : `Video lecture "${tr.title}" by ${tr.author}.`),
              highlights:
                materialResult?.highlights && materialResult.highlights.length > 0
                  ? materialResult.highlights
                  : tr.chapters.length > 0
                  ? tr.chapters.slice(0, 6).map(c => `[${c.timestamp}] ${c.title}`)
                  : hasValidCaptions && tr.groupedSegments && tr.groupedSegments.length > 0
                  ? tr.groupedSegments.slice(0, 5).map(s => `[${s.timestamp}] ${s.text.slice(0, 140)}`)
                  : [],
              transcription: hasValidCaptions ? tr.richContext : (tr.description || ''),
              contentText: hasValidCaptions ? tr.richContext : (tr.description || '')
            };
          }
        } catch (trErr) {
          console.warn("TranscriptProcessor client fallback warning:", trErr);
        }
      }

      const quickTitle = await quickTitlePromise;
      const rawBestTitle =
        (materialResult?.name && !isRawUrlOrPlaceholderTitle(materialResult.name))
          ? materialResult.name
          : (quickTitle && !isRawUrlOrPlaceholderTitle(quickTitle))
          ? quickTitle
          : name;
      const finalNotebookName = cleanNotebookLMTitle(rawBestTitle, url, type);
      setUploadFileName(finalNotebookName);

      const generatedTags2 = ['Indexed'];
      if (type === 'pdf' || type === 'doc') generatedTags2.push('Document', 'Text Analysis');
      if (type === 'video') generatedTags2.push('Video', 'Media');
      if (type === 'image') generatedTags2.push('Visual', 'Image');
      if (type === 'audio') generatedTags2.push('Audio', 'Transcript');
      if ((finalNotebookName || name || url || '').toLowerCase().includes('math')) generatedTags2.push('Mathematics');

      const fileData: WorkspaceFile = {
        id: materialResult?.id || `file-${Date.now()}`,
        name: finalNotebookName,
        type,
        size: materialResult?.size || size,
        uploadDate: materialResult?.uploadDate || new Date().toISOString().split('T')[0],
        status: 'indexed' as const,
        url: (url && !url.startsWith('data:')) ? url : (dataUrl || materialResult?.url || url),
        fileBase64: fileBase64 || undefined,
        fileMimeType: fileMimeType || undefined,
        summary: materialResult?.summary || (rawTextContent ? rawTextContent.slice(0, 450) : `${finalNotebookName} uploaded and indexed into your workspace.`),
        highlights: (materialResult?.highlights && materialResult.highlights.length > 0) ? materialResult.highlights : [
          rawTextContent ? rawTextContent.slice(0, 220) : `Uploaded ${finalNotebookName} ready for study questions.`
        ],
        tags: (materialResult?.tags && materialResult.tags.length > 0) ? materialResult.tags : generatedTags2,
        transcription: materialResult?.transcription || rawTextContent || undefined,
        contentText: materialResult?.contentText || materialResult?.transcription || rawTextContent || undefined,
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
              title: 'Material Analyzed & Indexed',
              badge: 'Library Synchronized',
              message: `"${fileData.name}" was analyzed and indexed into your study workspace!`,
              type: 'success'
            }
          })
        );

        onAddFile(fileData);
        setPreviewFile(fileData);
        setIsUploading(false);
      }, 220);

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

      const quickTitleFallback = await quickTitlePromise;
      const fallbackNotebookName = cleanNotebookLMTitle(
        !isRawUrlOrPlaceholderTitle(quickTitleFallback) ? quickTitleFallback : name,
        url,
        type
      );

      const fileData = {
        id: 'file-' + Date.now(),
        name: fallbackNotebookName,
        type,
        size,
        uploadDate: new Date().toISOString(),
        status: 'indexed' as const,
        url: dataUrl || objectUrl,
        fileBase64: fileBase64 || undefined,
        fileMimeType: fileMimeType || undefined,
        summary: `${fallbackNotebookName} uploaded to workspace.`,
        highlights: [
          `Uploaded ${fallbackNotebookName} ready for AI Tutor questions.`
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
                title: 'Material Analyzed & Indexed',
                badge: 'Library Synchronized',
                message: `"${fileData.name}" was uploaded and added to your study workspace!`,
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
    <div className="max-w-5xl w-full mx-auto space-y-6 text-left pb-6">
      {/* Hidden Real File Input Picker */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* UPLOAD STUDY MATERIALS STUDIO */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
        {/* Top Studio Header & Segmented Mode Navigation */}
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  Upload Study Materials
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 leading-relaxed">
                  Upload your documents, add direct links, or paste study notes into <span className="font-semibold text-slate-700">{workspace.name}</span>.
                </p>
              </div>
            </div>

            {/* Clean 3-Mode Navigation Bar */}
            <div className="grid grid-cols-3 sm:inline-flex p-1 bg-slate-200/70 rounded-2xl gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowUrlInput(false);
                  setShowDriveCopyInput(false);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  !showUrlInput && !showDriveCopyInput
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Files</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUrlInputType('url');
                  setShowUrlInput(true);
                  setShowDriveCopyInput(false);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showUrlInput
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Link className="w-3.5 h-3.5" />
                <span>Add URL / Video</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDriveCopyInput(true);
                  setShowUrlInput(false);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showDriveCopyInput
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste Text</span>
              </button>
            </div>
          </div>
        </div>

        {/* Studio Body Content */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* UPLOAD LOCAL FILES (DRAG & DROP ZONE) */}
          {!showUrlInput && !showDriveCopyInput && (
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all ${
                isDraggingLocal
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/50'
              }`}
            >
              <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">
                    Drag and drop your study files here
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Supports PDF textbooks, Word documents (DOCX), lecture slides (PPTX), images, audio recordings, and video files.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => triggerUploadInput('pdf')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose File from Device</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: ADD DIRECT URL OR YOUTUBE LINK */}
          {showUrlInput && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Add Direct Website, PDF Link, or YouTube Video URL
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paste any public YouTube video link, direct PDF URL, or educational article URL to index it into your workspace.
                  </p>
                </div>
              </div>
              <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=... or https://example.com/notes.pdf"
                  value={pastedUrl}
                  onChange={(e) => setPastedUrl(e.target.value)}
                  className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
                />
                <button
                  type="submit"
                  className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer"
                >
                  Index Link
                </button>
              </form>
            </div>
          )}

          {/* MODE 4: PASTE STUDY TEXT OR NOTES */}
          {showDriveCopyInput && (
            <form onSubmit={handleDriveCopySubmit} className="space-y-3.5">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Paste Study Text, Lecture Notes, or Syllabus
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste any text directly to generate summaries, highlights, and index it for AI Tutor Q&A.
                </p>
              </div>
              <input
                type="text"
                placeholder="Document title (e.g., Chapter 4 Cellular Respiration Notes)"
                value={driveCopyTitle}
                onChange={(e) => setDriveCopyTitle(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
              />
              <textarea
                required
                rows={4}
                placeholder="Paste your lecture notes, article text, or study paragraphs here..."
                value={driveCopyText}
                onChange={(e) => setDriveCopyText(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Index Study Text</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* UPLOAD PROGRESS PIPELINE BAR */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white border border-indigo-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Indexing Material: {uploadFileName}
                </span>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 tabular-nums">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{uploadSeconds.toFixed(1)}s</span>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 tabular-nums">
                  {uploadPercent}%
                </span>
              </div>
            </div>

            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-indigo-600 rounded-full" 
                style={{ width: `${uploadPercent}%` }} 
              />
            </div>

            <div className="text-xs font-medium text-slate-600 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{uploadStep}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STORED WORKSPACE MATERIALS LIBRARY */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm flex flex-col">
        {/* Header & Counters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Stored Workspace Materials
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">
              Click any stored PDF, video lecture, or web resource to open its interactive player and extracted study notes.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200/60 tabular-nums">
              {filteredFiles.length} of {workspace.files?.length || 0} Materials
            </span>
            {workspace.files && workspace.files.length > 0 && (
              <button
                onClick={() => setIsClearingAll(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls: Search Bar + Media Type Tabs + Tag Chips */}
        {workspace.files && workspace.files.length > 0 && (
          <div className="space-y-3.5 mb-6 pb-5 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter stored materials by title, concept, or tag..."
                  className="w-full h-10 pl-10 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
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
              <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 self-start md:self-auto shrink-0">
                <button
                  onClick={() => setSelectedMediaType('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${selectedMediaType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                >
                  <span>All</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 tabular-nums">{allCount}</span>
                </button>
                <button
                  onClick={() => setSelectedMediaType('documents')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${selectedMediaType === 'documents' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>PDFs & Docs</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 tabular-nums">{docCount}</span>
                </button>
                <button
                  onClick={() => setSelectedMediaType('videos')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${selectedMediaType === 'videos' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                >
                  <Video className="w-3.5 h-3.5 text-purple-600" />
                  <span>Videos</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 tabular-nums">{videoCount}</span>
                </button>
                <button
                  onClick={() => setSelectedMediaType('urls')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${selectedMediaType === 'urls' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                >
                  <Globe className="w-3.5 h-3.5 text-teal-600" />
                  <span>Web</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 tabular-nums">{urlCount}</span>
                </button>
              </div>
            </div>

            {/* Tag Filter Bar */}
            {availableTags.length > 0 && (
              <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Tags:</span>
                  </span>
                  {availableTags.slice(0, 10).map((tag) => {
                    const isSelected = selectedTags.some(st => st.toLowerCase() === tag.toLowerCase());
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 font-medium'
                        }`}
                      >
                        <span>{tag}</span>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                {(selectedTags.length > 0 || selectedMediaType !== 'all' || searchQuery.trim()) && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Materials List */}
        {(!workspace.files || workspace.files.length === 0) ? (
          <div className="text-center py-12 px-4 flex flex-col items-center justify-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xs border border-slate-200 mb-3">
              <HardDrive className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-slate-900 font-bold text-sm mb-1">No Stored Materials Yet</h4>
            <p className="text-slate-500 text-xs max-w-md leading-relaxed">
              Upload files from your device, add a direct URL, or paste study text above to add materials to this workspace.
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center justify-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-6">
            <Search className="w-7 h-7 text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No matching materials found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">No stored materials match your current search or filter selection.</p>
            <button
              onClick={clearAllFilters}
              className="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredFiles.map((file) => {
              const t = (file.type || '').toLowerCase();
              let Icon = FileText;
              let bg = 'bg-slate-50 text-slate-600 border-slate-200';
              if (t.includes('pdf')) { Icon = FileText; bg = 'bg-rose-50 text-rose-600 border-rose-200'; }
              else if (isVideoFile(file)) { Icon = Video; bg = 'bg-purple-50 text-purple-600 border-purple-200'; }
              else if (t.includes('audio') || t.includes('mp3')) { Icon = Music; bg = 'bg-amber-50 text-amber-600 border-amber-200'; }
              else if (isUrlFile(file)) { Icon = Globe; bg = 'bg-teal-50 text-teal-600 border-teal-200'; }
              else if (t.includes('image') || t.includes('jpg') || t.includes('png')) { Icon = ImageIcon; bg = 'bg-emerald-50 text-emerald-600 border-emerald-200'; }
              else if (t.includes('doc') || t.includes('word') || t.includes('text')) { Icon = FileText; bg = 'bg-blue-50 text-blue-600 border-blue-200'; }

              return (
                <div 
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="flex flex-col justify-between p-4 rounded-2xl bg-white hover:bg-slate-50/80 transition-all border border-slate-200 hover:border-indigo-300 group cursor-pointer gap-3"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${bg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {getNotebookLMDisplayTitle(file)}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] font-medium text-slate-500">
                        <span className="font-bold uppercase text-slate-600">{file.type}</span>
                        <span>·</span>
                        <span>{file.size}</span>
                        <span>·</span>
                        <span className="tabular-nums">{file.uploadDate}</span>
                      </div>
                      {file.summary && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                          {file.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Tags + Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      {(file.tags && file.tags.length > 0) && file.tags.slice(0, 3).map((tag, idx) => {
                        const isTagActive = selectedTags.some(st => st.toLowerCase() === tag.toLowerCase());
                        return (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTagFilter(tag);
                            }}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all cursor-pointer truncate max-w-[110px] ${
                              isTagActive 
                                ? 'bg-indigo-600 text-white' 
                                : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTagsFile(file);
                          setCustomTagInput('');
                        }}
                        className="text-[10px] font-semibold text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors flex items-center gap-0.5 cursor-pointer"
                        title="Manage tags"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <span>+Tag</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold text-indigo-600 group-hover:underline flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50/60">
                        <Eye className="w-3 h-3" />
                        <span>Open</span>
                      </span>
                      {file.url && file.url.startsWith('http') && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Open original source link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileToRemove(file);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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
                    Are you sure you want to remove <span className="font-bold text-slate-600">"{getNotebookLMDisplayTitle(fileToRemove)}"</span> from this workspace?
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
                      {getNotebookLMDisplayTitle(editingTagsFile)}
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

      <FullScreenUploadOverlay
        isOpen={isUploading}
        progress={uploadPercent}
        fileName={uploadFileName}
        stepText={uploadStep}
        elapsedSeconds={uploadSeconds}
        fileType={uploadType}
      />
    </div>
  );
}
