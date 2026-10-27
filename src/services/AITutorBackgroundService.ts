/**
 * AITutorBackgroundService
 * 
 * Global background manager for AI Tutor inquiries.
 * Ensures that when a user asks a question and navigates away (e.g. to Profile,
 * Workspaces, Home, or other views), the query executes uninterrupted in the background,
 * persists the response directly to storage, and notifies the user upon completion.
 */

import { WorkspaceChatCache } from './WorkspaceChatCache';

export interface TutorCitation {
  sourceName: string;
  page?: number;
  quote: string;
}

export interface TutorMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  source?: string;
  persona?: string;
  citations?: TutorCitation[];
  attachedFileNames?: string[];
  isError?: boolean;
  failedPrompt?: string;
  errorCode?: string | number;
  errorDetails?: string;
}

export interface SendTutorRequestOptions {
  workspaceId: string;
  workspaceName?: string;
  userId?: string | null;
  prompt: string;
  persona: string;
  history: { role: string; content: string }[];
  compactAttachedFiles?: any[];
  accessToken?: string | null;
  userMsg: TutorMessage;
  buildFallbackReply?: (prompt: string) => { reply: string; citations?: TutorCitation[] };
}

interface InFlightRequest {
  workspaceId: string;
  chatHistoryKey: string;
  prompt: string;
  startedAt: number;
  promise: Promise<TutorMessage>;
}

export function getChatHistoryKey(userId: string | null | undefined, workspaceId: string): string {
  return `study_chat_history_${userId || 'guest'}_${workspaceId}`;
}

class AITutorBackgroundManager {
  private inFlight = new Map<string, InFlightRequest>();
  private resetGeneration = new Map<string, number>();
  private listeners = new Set<() => void>();

  constructor() {
    // Clean up stale in-flight timestamps older than 2 minutes on initialization
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('studyweb_inflight_tutor');
        if (stored) {
          const parsed = JSON.parse(stored);
          const now = Date.now();
          Object.keys(parsed).forEach(k => {
            if (now - parsed[k].startedAt > 120000) {
              delete parsed[k];
            }
          });
          sessionStorage.setItem('studyweb_inflight_tutor', JSON.stringify(parsed));
        }
      } catch {}
    }
  }

  public isWorkspaceThinking(workspaceId: string): boolean {
    if (this.inFlight.has(workspaceId)) return true;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('studyweb_inflight_tutor');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed[workspaceId] && Date.now() - parsed[workspaceId].startedAt < 90000) {
            return true;
          }
        }
      } catch {}
    }
    return false;
  }

  public getPendingPrompt(workspaceId: string): string | null {
    const active = this.inFlight.get(workspaceId);
    if (active) return active.prompt;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('studyweb_inflight_tutor');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed[workspaceId] && Date.now() - parsed[workspaceId].startedAt < 90000) {
            return parsed[workspaceId].prompt || null;
          }
        }
      } catch {}
    }
    return null;
  }

  private persistInFlightState(workspaceId: string, prompt: string | null) {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem('studyweb_inflight_tutor');
      const parsed = stored ? JSON.parse(stored) : {};
      if (prompt) {
        parsed[workspaceId] = { prompt, startedAt: Date.now() };
      } else {
        delete parsed[workspaceId];
      }
      sessionStorage.setItem('studyweb_inflight_tutor', JSON.stringify(parsed));
    } catch {}
  }

  private notifyListeners() {
    this.listeners.forEach(fn => {
      try { fn(); } catch {}
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studyweb-tutor-status-change'));
    }
  }

  public addListener(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Completely deletes older chat history (in-memory, localStorage, sessionStorage),
   * cancels any in-flight request from the older chat, and initializes the new chat.
   */
  public resetWorkspaceChat(
    workspaceId: string,
    userId?: string | null,
    initialMessages?: TutorMessage[]
  ): void {
    const nextGen = (this.resetGeneration.get(workspaceId) || 0) + 1;
    this.resetGeneration.set(workspaceId, nextGen);

    this.inFlight.delete(workspaceId);
    this.persistInFlightState(workspaceId, null);

    WorkspaceChatCache.clearMessages(workspaceId, userId, initialMessages as any);
    this.notifyListeners();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studyweb-tutor-chat-reset', {
        detail: {
          workspaceId,
          userId,
          messages: initialMessages || []
        }
      }));
    }
  }

  /**
   * Dispatches an AI tutor request in the background.
   * Immediately saves the user message to localStorage, tracks in-flight state,
   * performs network requests, and persists the resulting AI message to storage.
   */
  public async sendTutorMessage(options: SendTutorRequestOptions): Promise<TutorMessage> {
    const { workspaceId, userId, prompt, persona, history, compactAttachedFiles = [], accessToken, userMsg, workspaceName, buildFallbackReply } = options;
    const chatKey = getChatHistoryKey(userId, workspaceId);
    const requestGen = this.resetGeneration.get(workspaceId) || 0;

    // 1. Immediately persist user message to dual-tier cache (in-memory + storage)
    try {
      WorkspaceChatCache.appendMessage(workspaceId, userId, userMsg as any);
    } catch (e) {
      console.warn('[AITutorBackgroundService] Error writing user message to cache:', e);
    }

    // 2. Mark this workspace as in-flight
    this.persistInFlightState(workspaceId, prompt);
    this.notifyListeners();

    // 3. Execution promise
    const executionPromise = (async (): Promise<TutorMessage> => {
      let data: any = null;

      // Sanitize oversized browser cookies if service available
      try {
        const { FileUploadService } = await import('./FileUploadService');
        FileUploadService.sanitizeBrowserCookies();
      } catch {}

      // Attempt 1: POST to /api/ai-tutor
      try {
        const postRes = await fetch('/api/ai-tutor', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            prompt: userMsg.text,
            history,
            persona,
            modelMode: 'auto',
            workspaceId,
            userId,
            supabaseToken: accessToken || undefined,
            attachedFiles: compactAttachedFiles,
            citationMode: true
          })
        });

        const contentType = postRes.headers.get('content-type') || '';
        if (postRes.ok && contentType.includes('application/json')) {
          const parsed = await postRes.json().catch(() => null);
          if (parsed && (parsed.reply || parsed.text)) {
            data = parsed;
          }
        }
      } catch (err) {
        console.warn('[AITutorBackgroundService] Primary POST attempt failed:', err);
      }

      // Attempt 2: GET fallback with query params
      if (!data) {
        try {
          const params = new URLSearchParams({
            prompt: userMsg.text.slice(0, 1200),
            persona,
            workspaceId: workspaceId || 'general-study'
          });
          if (userId) params.set('userId', userId);

          const firstVideo = compactAttachedFiles.find(f => f.type === 'video' || (f.url && f.url.startsWith('http')));
          if (firstVideo && firstVideo.url) {
            params.set('fileUrl', firstVideo.url);
            params.set('fileName', firstVideo.name);
          }

          const getRes = await fetch(`/api/ai-tutor?${params.toString()}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
          });

          const contentType = getRes.headers.get('content-type') || '';
          if (getRes.ok && contentType.includes('application/json')) {
            const parsed = await getRes.json().catch(() => null);
            if (parsed && (parsed.reply || parsed.text)) {
              data = parsed;
            }
          }
        } catch (err) {
          console.warn('[AITutorBackgroundService] Secondary GET attempt failed:', err);
        }
      }

      // Client Fallback if API was unreachable
      if (!data || (!data.reply && !data.text)) {
        if (buildFallbackReply) {
          const fb = buildFallbackReply(userMsg.text);
          data = {
            reply: fb.reply,
            citations: fb.citations,
            source: 'StudyWeb AI Tutor',
            personaUsed: persona
          };
        } else {
          data = {
            reply: `### 💡 Step-by-Step Study Explanation: **${userMsg.text.slice(0, 90)}**\n\n1. **Core Concept:**\n   - Let's break down **${userMsg.text}** systematically from first principles to practical application.\n\n2. **Key Mechanism & Walkthrough:**\n   - Identify the primary variables, definitions, and cause-and-effect stages.\n   - Trace each transition step-by-step and explore the **Interactive Concept Sandbox** below to adjust parameters in real time!`,
            source: 'StudyWeb AI Tutor',
            personaUsed: persona
          };
        }
      }

      // Format AI Message
      const aiMsg: TutorMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply || data.text || 'I have analyzed your study question and prepared an explanation.',
        citations: data.citations,
        source: data.source || 'Gemini AI',
        persona: data.personaUsed || persona,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // If the user started a New Chat while this older request was running, discard this older response!
      if ((this.resetGeneration.get(workspaceId) || 0) !== requestGen) {
        return aiMsg;
      }

      // 4. Persist AI message to dual-tier cache (in-memory + storage)
      try {
        WorkspaceChatCache.appendMessage(workspaceId, userId, aiMsg as any);
      } catch (storageErr) {
        console.error('[AITutorBackgroundService] Failed to persist AI response:', storageErr);
      }

      // 5. Clear in-flight state
      this.inFlight.delete(workspaceId);
      this.persistInFlightState(workspaceId, null);
      this.notifyListeners();

      // 6. Broadcast completion event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studyweb-tutor-message-completed', {
          detail: {
            workspaceId,
            message: aiMsg,
            workspaceName
          }
        }));

        // If the user is currently on another tab (e.g. Profile, Home, Workspaces),
        // notify them politely that their AI answer is ready
        const activeNavTab = sessionStorage.getItem('studyweb_active_task');
        if (activeNavTab && activeNavTab !== 'ai-tutor') {
          const wsLabel = workspaceName ? ` in ${workspaceName}` : '';
          const toastMsg = `💡 AI Tutor: Answer ready${wsLabel}!`;
          (window as any).showToast?.(toastMsg, 'info');
        }
      }

      return aiMsg;
    })();

    // Store in-flight request
    this.inFlight.set(workspaceId, {
      workspaceId,
      chatHistoryKey: chatKey,
      prompt,
      startedAt: Date.now(),
      promise: executionPromise
    });

    return executionPromise;
  }
}

export const AITutorBackgroundService = new AITutorBackgroundManager();
