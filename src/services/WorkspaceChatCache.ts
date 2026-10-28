/**
 * WorkspaceChatCache
 * 
 * High-performance, dual-tier (in-memory + persistent localStorage) cache for
 * WorkspaceChat message history and conversation state.
 * 
 * Guarantees that conversation flow and pending draft text are instantly and
 * seamlessly restored when switching tabs, navigating between views (Profile,
 * Workspaces, Home), or refreshing the application.
 */

export interface CachedCitation {
  sourceName: string;
  page?: number;
  quote: string;
}

export interface CachedChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  source?: string;
  persona?: string;
  citations?: CachedCitation[];
  attachedFileNames?: string[];
  workspaceNotice?: string;
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

class WorkspaceChatCacheManager {
  // Tier 1: In-Memory Hot Cache (0ms latency, eliminates parse lag during tab switching)
  private memoryCache = new Map<string, CachedChatMessage[]>();
  private draftCache = new Map<string, string>();
  private listeners = new Map<string, Set<(messages: CachedChatMessage[]) => void>>();

  /**
   * Generates primary storage key for user and workspace
   */
  public getStorageKey(userId: string | null | undefined, workspaceId: string): string {
    const cleanUser = (userId && userId.trim()) ? userId.trim() : 'guest';
    return `study_chat_history_${cleanUser}_${workspaceId}`;
  }

  /**
   * Retrieves messages from in-memory cache or persistent storage.
   * Checks primary user key first, then gracefully falls back to guest or workspace key.
   */
  public getMessages(
    workspaceId: string,
    userId?: string | null,
    defaultWelcome?: CachedChatMessage[]
  ): CachedChatMessage[] {
    const primaryKey = this.getStorageKey(userId, workspaceId);

    // 1. Check in-memory hot cache first
    if (this.memoryCache.has(primaryKey)) {
      const mem = this.memoryCache.get(primaryKey);
      if (Array.isArray(mem) && mem.length > 0) {
        return mem;
      }
    }

    // 2. Try primary localStorage key
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(primaryKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleanMsgs = parsed.filter((m: CachedChatMessage) => !m.isError);
            if (cleanMsgs.length > 0) {
              this.memoryCache.set(primaryKey, cleanMsgs);
              return cleanMsgs;
            }
          }
        }
      } catch (err) {
        console.warn('[WorkspaceChatCache] Error reading primary localStorage key:', err);
      }
    }

    // 3. Default welcome message if no prior messages exist
    const initial = defaultWelcome || [{
      id: 'welcome-msg',
      sender: 'ai',
      text: "👋 **Hi! I'm your AI Study Tutor!**\n\nAsk me any question about your studies, homework, or concepts to get started!",
      time: 'Just now',
      persona: 'plain_english'
    }];

    this.memoryCache.set(primaryKey, initial);
    return initial;
  }

  /**
   * Persists messages both to in-memory hot cache and localStorage.
   */
  public saveMessages(
    workspaceId: string,
    userId: string | null | undefined,
    messages: CachedChatMessage[]
  ): void {
    if (!workspaceId || !Array.isArray(messages)) return;
    const key = this.getStorageKey(userId, workspaceId);

    // Save to hot memory cache
    this.memoryCache.set(key, messages);

    // Save to persistent storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(messages));
      } catch (err) {
        console.warn('[WorkspaceChatCache] Storage write error, attempting sessionStorage:', err);
        try {
          sessionStorage.setItem(key, JSON.stringify(messages));
        } catch {}
      }

      // Dispatch global notification event
      window.dispatchEvent(new CustomEvent('studyweb-chat-cache-updated', {
        detail: { workspaceId, userId, count: messages.length }
      }));
    }

    // Notify active subscribers
    const subs = this.listeners.get(workspaceId);
    if (subs) {
      subs.forEach(fn => {
        try { fn(messages); } catch {}
      });
    }
  }

  /**
   * Appends a single message ensuring deduplication by ID.
   */
  public appendMessage(
    workspaceId: string,
    userId: string | null | undefined,
    message: CachedChatMessage
  ): CachedChatMessage[] {
    const current = this.getMessages(workspaceId, userId);
    if (current.some(m => m.id === message.id)) {
      return current;
    }
    const updated = [...current, message];
    this.saveMessages(workspaceId, userId, updated);
    return updated;
  }

  /**
   * Clears all older chat history from in-memory cache, localStorage, and sessionStorage,
   * and optionally initializes the cache with a fresh welcome message.
   */
  public clearMessages(
    workspaceId: string,
    userId?: string | null,
    initialMessages?: CachedChatMessage[]
  ): void {
    // 1. Clear all in-memory chat history entries so no older chat remains in RAM
    this.memoryCache.clear();
    this.clearDraft(workspaceId);

    // 2. Purge all study_chat_history_* keys in localStorage and sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('study_chat_history_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}

      try {
        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && (k.startsWith('study_chat_history_') || k.startsWith('study_chat_draft_'))) {
            sessionKeysToRemove.push(k);
          }
        }
        sessionKeysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch {}
    }

    // 3. If initial welcome messages are provided for the new chat, store only those
    if (initialMessages && initialMessages.length > 0) {
      const key = this.getStorageKey(userId, workspaceId);
      this.memoryCache.set(key, initialMessages);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify(initialMessages));
        } catch {}
      }
    }

    const subs = this.listeners.get(workspaceId);
    if (subs) {
      subs.forEach(fn => {
        try { fn(initialMessages || []); } catch {}
      });
    }
  }

  /**
   * Draft Input Text Caching (preserves half-typed questions across tab switching)
   */
  public getDraft(workspaceId: string): string {
    if (this.draftCache.has(workspaceId)) {
      return this.draftCache.get(workspaceId) || '';
    }
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem(`study_chat_draft_${workspaceId}`) || '';
      } catch {}
    }
    return '';
  }

  public saveDraft(workspaceId: string, draft: string): void {
    this.draftCache.set(workspaceId, draft);
    if (typeof window !== 'undefined') {
      try {
        if (draft.trim()) {
          sessionStorage.setItem(`study_chat_draft_${workspaceId}`, draft);
        } else {
          sessionStorage.removeItem(`study_chat_draft_${workspaceId}`);
        }
      } catch {}
    }
  }

  public clearDraft(workspaceId: string): void {
    this.draftCache.delete(workspaceId);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`study_chat_draft_${workspaceId}`);
      } catch {}
    }
  }

  /**
   * Subscribe to cache updates for a specific workspace.
   */
  public subscribe(workspaceId: string, callback: (messages: CachedChatMessage[]) => void): () => void {
    if (!this.listeners.has(workspaceId)) {
      this.listeners.set(workspaceId, new Set());
    }
    this.listeners.get(workspaceId)!.add(callback);
    return () => {
      const set = this.listeners.get(workspaceId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(workspaceId);
        }
      }
    };
  }
}

export const WorkspaceChatCache = new WorkspaceChatCacheManager();
