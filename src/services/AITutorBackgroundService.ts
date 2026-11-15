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
  workspaceNotice?: string;
  activeWorkspaceContext?: string;
  activeContextFiles?: string[];
  followUpQuestions?: string[];
  suggestOutsideResearch?: boolean;
  originalQuery?: string;
  generatedImageUrl?: string;
  generatedImageCaption?: string;
  isFileReadyBadge?: boolean;
  readyFileName?: string;
  readyFileType?: string;
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
  persona?: string;
  history: { role: string; content: string }[];
  compactAttachedFiles?: any[];
  allWorkspaces?: any[];
  accessToken?: string | null;
  allowOutsideResearch?: boolean;
  userMsg: TutorMessage;
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

    // Notify backend server to clear session memory
    if (typeof fetch !== 'undefined') {
      try {
        fetch('/api/ai-tutor-clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, userId })
        }).catch(() => {});
      } catch {}
    }

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
    const { workspaceId, userId, prompt, history, compactAttachedFiles = [], allWorkspaces = [], accessToken, allowOutsideResearch = false, userMsg, workspaceName } = options;
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
      let lastErrorText = '';

      // Sanitize oversized browser cookies if service available
      try {
        const { FileUploadService } = await import('./FileUploadService');
        FileUploadService.sanitizeBrowserCookies();
      } catch {}

      // Ensure accessToken is fresh (not expired) before sending to backend
      let freshAccessToken: string | undefined = accessToken || undefined;
      try {
        const { supabase } = await import('../lib/supabase');
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const isExpiringSoon = session.expires_at ? (session.expires_at * 1000 <= Date.now() + 30_000) : false;
            if (isExpiringSoon) {
              const { data: refreshed } = await supabase.auth.refreshSession();
              freshAccessToken = refreshed.session?.access_token || undefined;
            } else {
              freshAccessToken = session.access_token;
            }
          }
        }
        // Final client-side check: never send an already-expired JWT
        if (freshAccessToken) {
          const parts = freshAccessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload && typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now() + 10_000) {
              freshAccessToken = undefined;
            }
          }
        }
      } catch {}

      // Multi-attempt POST to /api/ai-tutor
      for (let attempt = 0; attempt < 2 && !data; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
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
              modelMode: 'auto',
              workspaceId,
              workspaceName,
              userId,
              supabaseToken: freshAccessToken,
              attachedFiles: compactAttachedFiles,
              allWorkspaces,
              allowOutsideResearch,
              citationMode: true
            })
          });

          const contentType = postRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const parsed = await postRes.json().catch(() => null);
            if (postRes.ok && parsed && (parsed.reply || parsed.text)) {
              data = parsed;
              break;
            } else if (parsed?.error || !postRes.ok) {
              const errCode = parsed?.errorCode || `HTTP_${postRes.status}`;
              lastErrorText = parsed?.error
                ? `[${errCode}] ${parsed.error}`
                : `[${errCode}] Request failed with status ${postRes.status}`;
              console.error('[AI Tutor Error][POST /api/ai-tutor]', {
                code: errCode,
                status: postRes.status,
                message: parsed?.error || postRes.statusText
              });
            }
          } else if (!postRes.ok) {
            const errCode = `HTTP_${postRes.status}`;
            lastErrorText = `[${errCode}] Server returned status ${postRes.status}`;
            console.error('[AI Tutor Error][POST /api/ai-tutor]', {
              code: errCode,
              status: postRes.status
            });
          }
        } catch (err: any) {
          const errCode = err?.code || 'NETWORK_ERR';
          lastErrorText = `[${errCode}] ${err?.message || 'Network connection error'}`;
          console.error(`[AI Tutor Error] POST attempt ${attempt + 1} failed:`, {
            code: errCode,
            message: err?.message,
            error: err
          });
        }
      }

      // Secondary GET attempt with query params if POST failed
      if (!data) {
        try {
          const params = new URLSearchParams({
            prompt: userMsg.text.slice(0, 1200),
            workspaceId: workspaceId || 'general-study'
          });
          if (userId) params.set('userId', userId);

          const firstVideo = compactAttachedFiles.find(f => f.type === 'video' || (f.url && f.url.startsWith('http')));
          if (firstVideo && firstVideo.url) {
            params.set('fileUrl', firstVideo.url);
            params.set('fileName', firstVideo.url);
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
          console.error('[AI Tutor Error] Secondary GET attempt failed:', err);
        }
      }

      if (!data || (!data.reply && !data.text)) {
        console.warn('[AI Tutor] Network/server fallback used:', lastErrorText);
      }

      // Guarantee 3 contextual follow-up questions for every single AI response
      const rawFollowUps: string[] = Array.isArray(data?.followUpQuestions)
        ? data.followUpQuestions.filter((q: any) => typeof q === 'string' && q.trim().length > 0)
        : [];
      const qText = String(userMsg.text || '').trim();
      const isGreeting = /^(hi+|hello+|hey+|yo|sup|how\s+are\s+you|who\s+are\s+you|what\s+can\s+you\s+do|thanks|thank\s+you|ok|okay|bye)\b[!?.]*$/i.test(qText);
      if (rawFollowUps.length < 3) {
        const isInterview = /\b(interview|interviewer|viva|oral|behavioral|star\s+method|tell\s+me\s+about\s+yourself|hire|candidate)\b/i.test(qText);
        const cleanSubject = qText.replace(/^(what\s+is|explain|tell\s+me\s+about|how\s+does|how\s+do\s+i\s+answer)\s+/i, '').replace(/[?!.]+$/, '').slice(0, 48).trim() || 'this topic';
        const defaultFollowUps = isGreeting
          ? [
              `Analyze everything uploaded in my workspace`,
              `Explain a complex concept step by step`,
              `Create a quick practice quiz on any topic`
            ]
          : isInterview
          ? [
              `Ask me a harder follow-up interview question on "${cleanSubject}"`,
              `How do I deliver this answer in under 60 seconds during an interview?`,
              `What common mistakes do candidates make when answering this question?`
            ]
          : [
              `Give me a practical real-world example of "${cleanSubject}"`,
              `Summarize the core takeaways of "${cleanSubject}"`,
              `Quiz me with 3 practice questions on "${cleanSubject}"`
            ];
        for (const df of defaultFollowUps) {
          if (rawFollowUps.length >= 3) break;
          if (!rawFollowUps.includes(df)) rawFollowUps.push(df);
        }
      }

      const fallbackReply = isGreeting
        ? `Hi there! How can I help you today? Feel free to ask me any question, or upload files, notes, or links for me to analyze.`
        : `I'm having trouble reaching the server right now. Please try asking **"${userMsg.text.slice(0, 80)}"** again in a moment!`;

      // Format AI Message without surfacing raw API or load errors
      const aiMsg: TutorMessage = data && (data.reply || data.text)
        ? {
            id: `msg-ai-${Date.now()}`,
            sender: 'ai',
            text: data.reply || data.text,
            citations: data.citations,
            source: data.source || 'Gemini AI',
            workspaceNotice: undefined,
            activeWorkspaceContext: data.activeWorkspaceContext,
            activeContextFiles: Array.isArray(data.activeContextFiles) ? data.activeContextFiles : [],
            followUpQuestions: rawFollowUps.slice(0, 3),
            suggestOutsideResearch: false,
            originalQuery: userMsg.text,
            generatedImageUrl: data.generatedImageUrl,
            generatedImageCaption: data.generatedImageCaption,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        : {
            id: `msg-ai-${Date.now()}`,
            sender: 'ai',
            text: fallbackReply,
            source: 'AI Study Tutor',
            activeWorkspaceContext: undefined,
            followUpQuestions: rawFollowUps.slice(0, 3),
            originalQuery: userMsg.text,
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

      // 6. Broadcast completion event & play Apple-style glass pop sound
      if (typeof window !== 'undefined') {
        try {
          const { playGlassPopSound } = await import('../utils/soundEffects');
          playGlassPopSound();
        } catch {}

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
