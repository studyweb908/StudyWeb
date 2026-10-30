import { supabase } from '../lib/supabase';
import { Workspace, WorkspaceFile } from '../components/Dashboard/WorkspaceTypes';
import { toValidUuid } from '../utils/uuid';
import { cleanNotebookLMTitle } from '../utils/notebookTitle';

const workspacesCacheByUser = new Map<string, { data: Workspace[]; timestamp: number }>();
const inflightFetchByUser = new Map<string, Promise<Workspace[]>>();
const WORKSPACES_CACHE_TTL_MS = 15_000;
let lastSupabaseToastTime = 0;

function reportSupabaseError(context: string, err: any, notifyToast = true): void {
  const code = err?.code || err?.status || err?.statusCode || 'SUPABASE_ERR';
  const message = err?.message || err?.error_description || String(err || 'Database operation failed');
  console.error(`[Supabase Error][${context}] [${code}] ${message}`, {
    code,
    message,
    details: err?.details,
    hint: err?.hint,
    context
  });

  if (notifyToast && typeof window !== 'undefined') {
    const now = Date.now();
    if (now - lastSupabaseToastTime > 3000) {
      lastSupabaseToastTime = now;
      const toastText = `[${code}] ${message}`;
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(toastText, 'error', 5500, `Supabase Error (${context})`);
      } else {
        window.dispatchEvent(
          new CustomEvent('studyweb-toast', {
            detail: {
              title: `Supabase Error (${code})`,
              message: `${context}: ${message}`,
              type: 'error'
            }
          })
        );
      }
    }
  }
}

export class WorkspaceSyncService {
  public static clearCache(userId?: string | null): void {
    if (userId) {
      workspacesCacheByUser.delete(userId);
      inflightFetchByUser.delete(userId);
    } else {
      workspacesCacheByUser.clear();
      inflightFetchByUser.clear();
    }
  }

  /**
   * Helper to get current Supabase user ID if authenticated
   */
  public static async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        reportSupabaseError('auth.getSession', sessionErr, false);
      }
      if (session?.user?.id) return session.user.id;
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) return user.id;
      return null;
    } catch (err) {
      reportSupabaseError('getUserId', err, false);
      return null;
    }
  }

  /**
   * Saves or updates a workspace in the Supabase 'workspaces' table.
   * Enforces user isolation by attaching user_id.
   * Also synchronizes any files associated with this workspace to 'workspace_files'.
   */
  public static async saveWorkspace(workspace: Workspace, explicitUserId?: string): Promise<boolean> {
    if (!supabase) return false;

    const validId = toValidUuid(workspace.id);
    const userId = explicitUserId || await this.getUserId();

    if (!userId) {
      return true;
    }

    this.clearCache(userId);

    const sanitizedFilesForJsonb = (workspace.files || []).map((f: WorkspaceFile) => {
      const copy: any = { ...f };
      // Keep compact image data URLs in JSONB up to 180KB; full 450KB image URLs are stored in workspace_files
      if (typeof copy.fileBase64 === 'string' && copy.fileBase64.length > 180_000) {
        delete copy.fileBase64;
      }
      if (typeof copy.url === 'string' && copy.url.startsWith('data:') && copy.url.length > 180_000) {
        delete copy.url;
      }
      return copy;
    });

    const row: Record<string, any> = {
      id: validId,
      user_id: userId,
      name: workspace.name?.trim() || 'Untitled Workspace',
      subject: workspace.subject || '',
      description: workspace.description || '',
      color_theme: workspace.colorTheme || 'indigo',
      cover_image: workspace.coverImage || '',
      emoji: workspace.emoji || '🧬',
      visibility: workspace.visibility || 'private',
      template: workspace.template || 'custom',
      pinned: Boolean(workspace.pinned),
      favorite: Boolean(workspace.favorite),
      streak: workspace.streak || 0,
      study_hours: workspace.studyHours || 0,
      last_opened: new Date().toISOString(),
      is_for_sale: Boolean(workspace.isForSale),
      price: workspace.price || null,
      files: sanitizedFilesForJsonb,
      flashcards: workspace.flashcards || [],
      quizzes: workspace.quizzes || [],
      notes: workspace.notes || [],
      planner_tasks: workspace.plannerTasks || [],
      nodes: workspace.nodes || [],
      links: workspace.links || [],
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('workspaces')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        reportSupabaseError('saveWorkspace', error, true);
        return false;
      }

      if (workspace.files && workspace.files.length > 0) {
        await Promise.allSettled(
          workspace.files.map((file) => this.saveWorkspaceFile(validId, file, userId))
        );
      }

      return true;
    } catch (err: any) {
      reportSupabaseError('saveWorkspace', err, true);
      return false;
    }
  }

  /**
   * Saves or updates an uploaded file in the Supabase 'workspace_files' table.
   */
  public static async saveWorkspaceFile(workspaceId: string, file: WorkspaceFile, explicitUserId?: string): Promise<boolean> {
    if (!supabase) return false;

    const validFileId = toValidUuid(file.id);
    const validWsId = toValidUuid(workspaceId);
    const userId = explicitUserId || await this.getUserId();

    if (userId) {
      this.clearCache(userId);
    }

    const cleanName = cleanNotebookLMTitle(file.name, file.url, file.type);
    let candidateUrl = file.url || null;
    if (!candidateUrl && file.fileBase64 && (file.type === 'image' || file.fileMimeType?.startsWith('image/'))) {
      const cleanB64 = file.fileBase64.includes(';base64,') ? file.fileBase64.split(';base64,')[1] : file.fileBase64;
      candidateUrl = `data:${file.fileMimeType || 'image/jpeg'};base64,${cleanB64}`;
    }
    const safeUrl = (typeof candidateUrl === 'string' && candidateUrl.startsWith('data:') && candidateUrl.length > 450_000)
      ? null
      : candidateUrl;

    const fileRow: Record<string, any> = {
      id: validFileId,
      workspace_id: validWsId,
      name: cleanName || 'Study Material',
      type: file.type || 'doc',
      size: file.size || '1 KB',
      url: safeUrl,
      storage_path: file.storagePath || null,
      summary: file.summary || '',
      transcription: file.transcription || file.contentText || null,
      tags: Array.isArray(file.tags) && file.tags.length > 0 ? file.tags : ['Document'],
      highlights: Array.isArray(file.highlights) ? file.highlights : [],
      formulas: Array.isArray(file.formulas) ? file.formulas : [],
      extracted_diagrams: Array.isArray(file.extractedDiagrams) ? file.extractedDiagrams : (file.extractedDiagrams ? [JSON.stringify(file.extractedDiagrams)] : []),
      pages: typeof file.pages === 'number' ? file.pages : null,
      status: file.status || 'indexed',
      content_text: file.contentText || file.transcription || null,
      upload_date: file.uploadDate ? new Date(file.uploadDate).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (userId) {
      fileRow.user_id = userId;
    }

    try {
      const { data: wsRow } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', validWsId)
        .maybeSingle();

      if (!wsRow) {
        await supabase
          .from('workspaces')
          .upsert({
            id: validWsId,
            user_id: userId || null,
            name: file.name ? `Workspace: ${file.name}` : 'Workspace',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id', ignoreDuplicates: true });
      }
    } catch (wsEnsureErr) {
      reportSupabaseError('saveWorkspaceFile:ensureWorkspace', wsEnsureErr, false);
    }

    try {
      const { error } = await supabase
        .from('workspace_files')
        .upsert(fileRow, { onConflict: 'id' });

      if (error) {
        reportSupabaseError('saveWorkspaceFile', error, true);
        return false;
      }
      return true;
    } catch (err: any) {
      reportSupabaseError('saveWorkspaceFile', err, true);
      return false;
    }
  }

  /**
   * Updates tags for a specific workspace file in Supabase.
   * Enforces user_id ownership.
   */
  public static async updateWorkspaceFileTags(workspaceId: string, fileId: string, tags: string[]): Promise<boolean> {
    if (!supabase) return false;

    try {
      const userId = await this.getUserId();
      if (!userId) return false;
      this.clearCache(userId);

      const validFileId = toValidUuid(fileId);
      const { error } = await supabase
        .from('workspace_files')
        .update({ tags, updated_at: new Date().toISOString() })
        .eq('id', validFileId)
        .eq('user_id', userId);

      if (error) {
        reportSupabaseError('updateWorkspaceFileTags', error, true);
        return false;
      }
      return true;
    } catch (err: any) {
      reportSupabaseError('updateWorkspaceFileTags', err, true);
      return false;
    }
  }

  /**
   * Deletes a file from Supabase 'workspace_files' strictly owned by the current user.
   */
  public static async deleteWorkspaceFile(fileId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const userId = await this.getUserId();
      if (!userId) return false;
      this.clearCache(userId);

      const validFileId = toValidUuid(fileId);
      const { error } = await supabase
        .from('workspace_files')
        .delete()
        .eq('id', validFileId)
        .eq('user_id', userId);

      if (error) {
        reportSupabaseError('deleteWorkspaceFile', error, true);
        return false;
      }
      return true;
    } catch (err) {
      reportSupabaseError('deleteWorkspaceFile', err, true);
      return false;
    }
  }

  /**
   * Deletes a workspace and its associated files from Supabase strictly owned by the current user.
   */
  public static async deleteWorkspace(workspaceId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const userId = await this.getUserId();
      if (!userId) return false;
      this.clearCache(userId);

      const validWsId = toValidUuid(workspaceId);

      await supabase
        .from('workspace_files')
        .delete()
        .eq('workspace_id', validWsId)
        .eq('user_id', userId);

      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', validWsId)
        .eq('user_id', userId);

      if (error) {
        reportSupabaseError('deleteWorkspace', error, true);
        return false;
      }
      return true;
    } catch (err) {
      reportSupabaseError('deleteWorkspace', err, true);
      return false;
    }
  }

  /**
   * Loads all workspaces strictly belonging to the authenticated user from Supabase.
   * Uses in-flight request deduplication and fast TTL caching for 1,000-user scalability.
   */
  public static async fetchWorkspaces(explicitUserId?: string, forceRefresh = false): Promise<Workspace[]> {
    if (!supabase) return [];

    try {
      const userId = explicitUserId || await this.getUserId();
      if (!userId) {
        return [];
      }

      if (!forceRefresh) {
        const cached = workspacesCacheByUser.get(userId);
        if (cached && Date.now() - cached.timestamp < WORKSPACES_CACHE_TTL_MS) {
          return cached.data;
        }
        const inflight = inflightFetchByUser.get(userId);
        if (inflight) {
          return inflight;
        }
      }

      const fetchPromise = (async (): Promise<Workspace[]> => {
        try {
          const { data: rows, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) {
            reportSupabaseError('fetchWorkspaces', error, true);
            workspacesCacheByUser.set(userId, { data: [], timestamp: Date.now() });
            return [];
          }

          if (!rows || rows.length === 0) {
            workspacesCacheByUser.set(userId, { data: [], timestamp: Date.now() });
            return [];
          }

          const wsIds = rows.map((r: any) => r.id);
          const fileMap: Record<string, WorkspaceFile[]> = {};

          try {
            const filesRes = await supabase
              .from('workspace_files')
              .select('*')
              .eq('user_id', userId)
              .in('workspace_id', wsIds);

            if (filesRes.error) {
              reportSupabaseError('fetchWorkspaces:workspace_files', filesRes.error, false);
            }

            if (filesRes.data) {
              filesRes.data.forEach((f: any) => {
                if (!fileMap[f.workspace_id]) {
                  fileMap[f.workspace_id] = [];
                }
                let hydratedBase64: string | undefined = undefined;
                let hydratedMime: string | undefined = undefined;
                if (typeof f.url === 'string' && f.url.startsWith('data:')) {
                  const m = f.url.match(/^data:([^;]+);base64,(.+)$/);
                  if (m) {
                    hydratedMime = m[1];
                    hydratedBase64 = m[2];
                  }
                }
                fileMap[f.workspace_id].push({
                  id: f.id,
                  name: f.name || 'Untitled Document',
                  type: f.type || 'doc',
                  size: f.size || '1 KB',
                  uploadDate: f.upload_date || f.created_at || new Date().toISOString(),
                  status: (f.status as any) || 'indexed',
                  url: f.url || undefined,
                  fileBase64: hydratedBase64,
                  fileMimeType: hydratedMime,
                  storagePath: f.storage_path || undefined,
                  summary: f.summary || '',
                  highlights: Array.isArray(f.highlights) ? f.highlights : [],
                  tags: Array.isArray(f.tags) && f.tags.length > 0 ? f.tags : ['Document'],
                  transcription: f.transcription || f.content_text || undefined,
                  formulas: Array.isArray(f.formulas) ? f.formulas : [],
                  extractedDiagrams: f.extracted_diagrams || undefined,
                  contentText: f.content_text || f.transcription || undefined,
                  pages: typeof f.pages === 'number' ? f.pages : undefined
                });
              });
            }
          } catch (childErr) {
            reportSupabaseError('fetchWorkspaces:childTables', childErr, false);
          }

          const mappedWorkspaces = rows.map((row: any): Workspace => {
            const remoteTableFiles = fileMap[row.id] || [];
            const jsonbFiles = Array.isArray(row.files) ? row.files : [];
            const fileMapByKey = new Map<string, WorkspaceFile>();
            const getFileKey = (f: any) => String(f?.id || f?.name || '').trim().toLowerCase();

            jsonbFiles.forEach((f: any) => {
              if (!f) return;
              const k = getFileKey(f);
              if (k) fileMapByKey.set(k, f);
            });
            remoteTableFiles.forEach((f: any) => {
              if (!f) return;
              const byIdKey = String(f.id || '').trim().toLowerCase();
              const byNameKey = Array.from(fileMapByKey.keys()).find(existingKey => {
                const existing = fileMapByKey.get(existingKey);
                return (
                  (existing?.id && toValidUuid(existing.id) === f.id) ||
                  (existing?.name && f.name && existing.name.trim().toLowerCase() === f.name.trim().toLowerCase())
                );
              });
              const targetKey = byNameKey || byIdKey || getFileKey(f);
              if (targetKey) {
                const existing = fileMapByKey.get(targetKey);
                fileMapByKey.set(
                  targetKey,
                  existing
                    ? {
                        ...existing,
                        ...f,
                        url: f.url || existing.url,
                        fileBase64: f.fileBase64 || existing.fileBase64,
                        fileMimeType: f.fileMimeType || existing.fileMimeType,
                        summary: f.summary || existing.summary,
                        transcription: f.transcription || existing.transcription,
                        contentText: f.contentText || existing.contentText
                      }
                    : f
                );
              }
            });
            const files = Array.from(fileMapByKey.values());

            const jsonbNotes = Array.isArray(row.notes) ? row.notes : [];
            const noteMapById = new Map<string, any>();
            jsonbNotes.forEach((n: any) => { if (n && n.id) noteMapById.set(n.id, n); });
            const notes = Array.from(noteMapById.values());

            const jsonbFlashcards = Array.isArray(row.flashcards) ? row.flashcards : [];
            const fcMapById = new Map<string, any>();
            jsonbFlashcards.forEach((fc: any) => { if (fc && fc.id) fcMapById.set(fc.id, fc); });
            const flashcards = Array.from(fcMapById.values());

            return {
              id: row.id,
              name: row.name || 'Untitled Workspace',
              subject: row.subject || 'General',
              description: row.description || '',
              colorTheme: (row.color_theme as any) || 'indigo',
              coverImage: row.cover_image || 'https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop',
              emoji: row.emoji || '🧬',
              visibility: (row.visibility as any) || 'private',
              template: (row.template as any) || 'custom',
              pinned: Boolean(row.pinned),
              favorite: Boolean(row.favorite),
              streak: row.streak || 1,
              studyHours: row.study_hours || 0,
              lastOpened: row.last_opened ? new Date(row.last_opened).toLocaleDateString() : 'Just Now',
              isForSale: Boolean(row.is_for_sale),
              price: row.price ? Number(row.price) : undefined,
              files,
              flashcards,
              quizzes: Array.isArray(row.quizzes) ? row.quizzes : [],
              notes,
              plannerTasks: Array.isArray(row.planner_tasks) ? row.planner_tasks : [],
              nodes: Array.isArray(row.nodes) && row.nodes.length > 0 ? row.nodes : [
                { id: 'n-root', label: row.name, type: 'topic', color: '#6366F1', x: 250, y: 150 },
                ...files.map((file: any, idx: number) => ({
                  id: `n-${file.id}`,
                  label: file.name.slice(0, 20) + '...',
                  type: 'file' as const,
                  color: '#3B82F6',
                  x: 100 + (idx % 5) * 80,
                  y: 200 + Math.floor(idx / 5) * 80,
                  details: `${file.type?.toUpperCase() || 'DOC'} file`
                }))
              ],
              links: Array.isArray(row.links) && row.links.length > 0 ? row.links : files.map((file: any) => ({
                source: 'n-root',
                target: `n-${file.id}`
              }))
            };
          });

          workspacesCacheByUser.set(userId, { data: mappedWorkspaces, timestamp: Date.now() });
          return mappedWorkspaces;
        } finally {
          inflightFetchByUser.delete(userId);
        }
      })();

      inflightFetchByUser.set(userId, fetchPromise);
      return await fetchPromise;
    } catch (err: any) {
      reportSupabaseError('fetchWorkspaces', err, true);
      return [];
    }
  }

  /**
   * Claims and migrates any local workspaces (from guest session) to the newly authenticated user.
   */
  public static async claimWorkspacesForUser(localWorkspaces: Workspace[], userId: string): Promise<Workspace[]> {
    if (!supabase || !userId || !localWorkspaces || localWorkspaces.length === 0) return localWorkspaces || [];

    try {
      await Promise.allSettled(
        localWorkspaces.map((ws) => this.saveWorkspace(ws, userId))
      );
      return await this.fetchWorkspaces(userId, true);
    } catch (err: any) {
      reportSupabaseError('claimWorkspacesForUser', err, false);
      return localWorkspaces;
    }
  }

  /**
   * Fetches all files for a specific workspace directly from Supabase workspace_files table,
   * strictly scoped to the authenticated user.
   */
  public static async fetchWorkspaceFiles(workspaceId: string): Promise<WorkspaceFile[]> {
    if (!supabase) return [];
    try {
      const userId = await this.getUserId();
      if (!userId) return [];

      const validWsId = toValidUuid(workspaceId);
      const { data: rows, error } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('workspace_id', validWsId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        reportSupabaseError('fetchWorkspaceFiles', error, true);
        return [];
      }
      if (!rows) return [];

      return rows.map((f: any): WorkspaceFile => {
        let hydratedBase64: string | undefined = undefined;
        let hydratedMime: string | undefined = undefined;
        if (typeof f.url === 'string' && f.url.startsWith('data:')) {
          const m = f.url.match(/^data:([^;]+);base64,(.+)$/);
          if (m) {
            hydratedMime = m[1];
            hydratedBase64 = m[2];
          }
        }
        return {
          id: f.id,
          name: f.name || 'Untitled Document',
          type: f.type || 'doc',
          size: f.size || '1 KB',
          uploadDate: f.upload_date || f.created_at || new Date().toISOString(),
          status: (f.status as any) || 'indexed',
          url: f.url || undefined,
          fileBase64: hydratedBase64,
          fileMimeType: hydratedMime,
          storagePath: f.storage_path || undefined,
          summary: f.summary || '',
          highlights: Array.isArray(f.highlights) ? f.highlights : [],
          tags: Array.isArray(f.tags) && f.tags.length > 0 ? f.tags : ['Document'],
          transcription: f.transcription || f.content_text || undefined,
          formulas: Array.isArray(f.formulas) ? f.formulas : [],
          extractedDiagrams: f.extracted_diagrams || undefined,
          contentText: f.content_text || f.transcription || undefined,
          pages: typeof f.pages === 'number' ? f.pages : undefined
        };
      });
    } catch (err) {
      reportSupabaseError('fetchWorkspaceFiles', err, true);
      return [];
    }
  }

  /**
   * Saves a workspace note into the parent workspace's `notes` JSONB array in Supabase.
   */
  public static async saveWorkspaceNote(workspaceId: string, note: any, explicitUserId?: string): Promise<boolean> {
    if (!supabase || !note) return false;
    try {
      const validWsId = toValidUuid(workspaceId);
      const userId = explicitUserId || await this.getUserId();
      if (!userId) return false;
      this.clearCache(userId);

      const { data: wsRow } = await supabase
        .from('workspaces')
        .select('notes')
        .eq('id', validWsId)
        .eq('user_id', userId)
        .maybeSingle();

      const existingNotes = Array.isArray(wsRow?.notes) ? wsRow.notes : [];
      const filtered = existingNotes.filter((n: any) => n?.id !== note.id);
      const updatedNotes = [note, ...filtered];

      const { error } = await supabase
        .from('workspaces')
        .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
        .eq('id', validWsId)
        .eq('user_id', userId);

      if (error) {
        reportSupabaseError('saveWorkspaceNote', error, true);
        return false;
      }
      return true;
    } catch (err) {
      reportSupabaseError('saveWorkspaceNote', err, true);
      return false;
    }
  }
}
