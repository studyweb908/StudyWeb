import React, { useState, useEffect, useCallback } from 'react';
import { Terminal, ChevronDown, ChevronUp, RefreshCw, Folder, FileText, ShieldCheck } from 'lucide-react';

export interface DetectedDebugFile {
  id: string;
  name: string;
  type: string;
  scope: 'workspace' | 'standalone';
  workspaceId?: string | null;
  status: string;
}

export interface BackendContextResolutionState {
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
  hasActiveWorkspace: boolean;
  hasAnyWorkspaces: boolean;
  selectedMode:
    | 'MODE_A_GENERAL_STUDY'
    | 'MODE_B_WORKSPACE_STUDY'
    | 'MODE_C_STANDALONE_MATERIAL'
    | 'MODE_D_GENERAL_WITH_WORKSPACE'
    | string;
  intentCategory: string;
  referencedDocumentName: string | null;
  referencedDocumentStatus: string;
  isInformationAvailableInMaterials: boolean;
  detectedFiles: DetectedDebugFile[];
  prioritizedFiles: string[];
  securityFlags?: {
    crossUserBlockedCount: number;
    promptInjectionSanitized: boolean;
  };
  timestamp: string;
}

interface AITutorContextDebugPanelProps {
  activeWorkspaceId?: string | null;
  activeWorkspaceName?: string | null;
  userId?: string | null;
  attachedFiles?: any[];
  allWorkspaces?: any[];
}

function isDeveloperDebugEnabled(): boolean {
  try {
    if ((import.meta as any).env?.DEV) return true;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debug') === '1' || params.get('dev') === '1') return true;
      if (window.localStorage.getItem('studyweb_dev_debug') === 'true') return true;
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

const MODE_LABELS: Record<string, { label: string; badgeClass: string }> = {
  MODE_A_GENERAL_STUDY: {
    label: 'MODE A — General Study',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30'
  },
  MODE_B_WORKSPACE_STUDY: {
    label: 'MODE B — Workspace Study',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  },
  MODE_C_STANDALONE_MATERIAL: {
    label: 'MODE C — Standalone Material',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  },
  MODE_D_GENERAL_WITH_WORKSPACE: {
    label: 'MODE D — General w/ Workspace',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
  }
};

export const AITutorContextDebugPanel: React.FC<AITutorContextDebugPanelProps> = ({
  activeWorkspaceId,
  activeWorkspaceName,
  userId,
  attachedFiles = [],
  allWorkspaces = []
}) => {
  const [devEnabled] = useState<boolean>(() => isDeveloperDebugEnabled());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [testPrompt, setTestPrompt] = useState<string>('');
  const [resolutionState, setResolutionState] = useState<BackendContextResolutionState | null>(null);

  const probeBackendContext = useCallback(
    async (customPrompt?: string) => {
      if (!devEnabled) return;
      setIsProbing(true);
      try {
        const promptToProbe =
          (customPrompt !== undefined ? customPrompt : testPrompt).trim() ||
          (activeWorkspaceId && activeWorkspaceId !== 'general-study'
            ? 'Summarize my workspace study notes'
            : 'Explain photosynthesis');

        const compactWorkspaces = (Array.isArray(allWorkspaces) ? allWorkspaces : []).map((ws: any) => ({
          id: ws.id,
          name: ws.name || 'Workspace',
          subject: ws.subject || 'General',
          userId: ws.userId || ws.user_id,
          files: (Array.isArray(ws.files) ? ws.files : []).map((f: any) => ({
            id: f.id,
            name: f.name,
            type: f.type || 'doc',
            status: f.status || 'indexed',
            workspaceId: f.workspaceId || ws.id,
            workspaceName: ws.name || 'Workspace',
            summary: typeof f.summary === 'string' ? f.summary.slice(0, 600) : '',
            transcription:
              typeof (f.transcription || f.contentText) === 'string'
                ? String(f.transcription || f.contentText).slice(0, 2000)
                : ''
          })),
          notes: (Array.isArray(ws.notes) ? ws.notes : []).map((n: any) => ({
            id: n.id,
            title: n.title || 'Study Note',
            content: typeof n.content === 'string' ? n.content.slice(0, 1000) : ''
          }))
        }));

        const compactAttached = (Array.isArray(attachedFiles) ? attachedFiles : []).map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.type || 'doc',
          status: f.status || 'indexed',
          workspaceId: f.workspaceId || activeWorkspaceId,
          workspaceName: f.workspaceName || activeWorkspaceName,
          isDirectAttachment: Boolean(f.isDirectAttachment ?? true),
          isStandalone: Boolean(f.isStandalone),
          summary: typeof f.summary === 'string' ? f.summary.slice(0, 600) : '',
          transcription:
            typeof (f.transcription || f.contentText) === 'string'
              ? String(f.transcription || f.contentText).slice(0, 2000)
              : ''
        }));

        const res = await fetch('/api/ai-tutor', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptToProbe,
            debugContextOnly: true,
            workspaceId: activeWorkspaceId || 'general-study',
            workspaceName: activeWorkspaceName || 'General Study',
            userId: userId || undefined,
            attachedFiles: compactAttached,
            allWorkspaces: compactWorkspaces
          })
        });

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.contextResolution) {
            setResolutionState(data.contextResolution);
          }
        }
      } catch {
        // Silent in debug panel
      } finally {
        setIsProbing(false);
      }
    },
    [devEnabled, testPrompt, activeWorkspaceId, activeWorkspaceName, userId, attachedFiles, allWorkspaces]
  );

  // Automatically sync when workspace or attached file count changes
  useEffect(() => {
    if (!devEnabled) return;
    probeBackendContext();
  }, [devEnabled, activeWorkspaceId, attachedFiles.length, allWorkspaces.length]);

  // Listen for live /api/ai-tutor responses from chat turns
  useEffect(() => {
    if (!devEnabled) return;
    const handleContextUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<BackendContextResolutionState>;
      if (customEvent.detail) {
        setResolutionState(customEvent.detail);
      }
    };
    window.addEventListener('studyweb_context_resolution', handleContextUpdate);
    return () => window.removeEventListener('studyweb_context_resolution', handleContextUpdate);
  }, [devEnabled]);

  if (!devEnabled) return null;

  const effectiveMode = resolutionState?.selectedMode || 'MODE_A_GENERAL_STUDY';
  const modeMeta = MODE_LABELS[effectiveMode] || {
    label: effectiveMode,
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  };
  const resolvedWsId =
    resolutionState?.activeWorkspaceId ||
    (activeWorkspaceId && activeWorkspaceId !== 'general-study' ? activeWorkspaceId : null);
  const detectedFiles = resolutionState?.detectedFiles || [];

  return (
    <div
      data-testid="ai-tutor-context-debug-panel"
      className="bg-slate-900 text-slate-200 border-b border-slate-800 px-3 sm:px-5 py-1.5 text-[11px] font-mono shrink-0 z-10"
    >
      {/* Compact Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase tracking-wider text-[10px]">
            <Terminal className="w-3 h-3" />
            <span>DEV CONTEXT</span>
          </span>

          {/* Selected Operation Mode */}
          <span
            data-testid="debug-selected-mode"
            className={`inline-flex items-center px-2 py-0.5 rounded border font-bold text-[10px] ${modeMeta.badgeClass}`}
          >
            {modeMeta.label}
          </span>

          {/* Active Workspace ID */}
          <span className="inline-flex items-center gap-1 text-slate-400 truncate max-w-[220px] sm:max-w-xs">
            <Folder className="w-3 h-3 text-slate-500 shrink-0" />
            <span>Workspace ID:</span>
            <code data-testid="debug-active-workspace-id" className="text-slate-100 font-semibold">
              {resolvedWsId || 'none (General Study)'}
            </code>
          </span>

          {/* Detected File Count */}
          <span className="inline-flex items-center gap-1 text-slate-400">
            <FileText className="w-3 h-3 text-slate-500 shrink-0" />
            <span>Detected Files:</span>
            <code data-testid="debug-detected-file-count" className="text-emerald-400 font-bold">
              {detectedFiles.length}
            </code>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => probeBackendContext()}
            disabled={isProbing}
            title="Refresh backend context resolution state"
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isProbing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden xs:inline">Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{isExpanded ? 'Hide Details' : 'Inspect'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded Inspector Details */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-slate-800 space-y-2.5 text-[11px]">
          {/* Dry-Run Prompt Tester */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  probeBackendContext(testPrompt);
                }
              }}
              placeholder="Test how a prompt resolves mode & files on backend (e.g. 'Explain Chapter 2' or 'What is photosynthesis?')..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => probeBackendContext(testPrompt)}
              disabled={isProbing}
              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer transition-colors shrink-0 disabled:opacity-50"
            >
              Test Resolution
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Column 1: Workspace & Mode Metadata */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-2 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Resolution Metadata
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Selected Mode:</span>
                <span className="text-slate-200 font-semibold">{effectiveMode}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Workspace ID:</span>
                <span className="text-slate-200 truncate">{resolvedWsId || 'null'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Workspace Name:</span>
                <span className="text-slate-200 truncate">
                  {resolutionState?.activeWorkspaceName || activeWorkspaceName || 'None'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Intent Category:</span>
                <span className="text-indigo-300 truncate">
                  {resolutionState?.intentCategory || 'general_educational_question'}
                </span>
              </div>
            </div>

            {/* Column 2: Document Lookup & Security Flags */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-2 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Document & Security Checks</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Referenced Doc:</span>
                <span className="text-slate-200 truncate">
                  {resolutionState?.referencedDocumentName || 'None'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Doc Lookup Status:</span>
                <span className="text-amber-300">
                  {resolutionState?.referencedDocumentStatus || 'none'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Cross-User Blocked:</span>
                <span className="text-emerald-400">
                  {resolutionState?.securityFlags?.crossUserBlockedCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Injection Sanitized:</span>
                <span className="text-emerald-400">
                  {resolutionState?.securityFlags?.promptInjectionSanitized ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Column 3: Detected File List */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-2 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Detected Accessible Files ({detectedFiles.length})
              </div>
              {detectedFiles.length === 0 ? (
                <div data-testid="debug-file-list-empty" className="text-slate-500 italic py-1">
                  No accessible files detected in current context.
                </div>
              ) : (
                <ul data-testid="debug-file-list" className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {detectedFiles.map((file, idx) => {
                    const isPrioritized = resolutionState?.prioritizedFiles?.includes(file.name);
                    return (
                      <li
                        key={`${file.id}-${idx}`}
                        className="flex items-center justify-between gap-1.5 text-[10px] bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800"
                      >
                        <span className="truncate text-slate-200 font-medium" title={file.name}>
                          {file.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`px-1 rounded text-[9px] uppercase ${
                              file.scope === 'standalone'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-indigo-500/20 text-indigo-300'
                            }`}
                          >
                            {file.scope}
                          </span>
                          <span className="px-1 rounded bg-slate-800 text-slate-400 text-[9px]">
                            {file.status}
                          </span>
                          {isPrioritized && (
                            <span className="px-1 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITutorContextDebugPanel;
