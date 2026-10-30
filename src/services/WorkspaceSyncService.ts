import { supabase } from '../lib/supabase';
import { Workspace, WorkspaceFile } from '../components/Dashboard/WorkspaceTypes';
import { toValidUuid } from '../utils/uuid';
import { cleanNotebookLMTitle } from '../utils/notebookTitle';

const workspacesCacheByUser = new Map<string, { data: Workspace[]; timestamp: number }>();
const inflightFetchByUser = new Map<string, Promise<Workspace[]>>();
const WORKSPACES_CACHE_TTL_MS = 15_000;

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) return session.user.id;
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) return user.id;
      return null;
    } catch {
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
      // Prevent oversized base64 or data URL payloads from exceeding PostgREST JSONB row limits
      if (typeof copy.fileBase64 === 'string' && copy.fileBase64.length > 80_000) {
        delete copy.fileBase64;
      }
      if (typeof copy.url === 'string' && copy.url.startsWith('data:') && copy.url.length > 80_000) {
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
        console.debug('Workspace sync notice (workspaces upsert):', error.message);
        return false;
      }

      if (workspace.files && workspace.files.length > 0) {
        await Promise.allSettled(
          workspace.files.map((file) => this.saveWorkspaceFile(validId, file, userId))
        );
      }

      return true;
    } catch (err: any) {
      console.debug('Failed to sync workspace to Supabase:', err.message);
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
    const safeUrl = (typeof file.url === 'string' && file.url.startsWith('data:') && file.url.length > 80_000)
      ? null
      : (file.url || null);
    const fileRow: Record<string, any> = {
      id: validFileId,
      workspace_id: validWsId,
      name: cleanName || 'Study Material',
      type: file.type || 'doc',
      size: file.size || '1 KB',
      url: safeUrl,
      storage_path: file.storagePath || null,
      summary: file.summary || '',
      transcription: file.transcription || null,
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
    } catch {
      // Non-fatal workspace check
    }

    try {
      const { error } = await supabase
        .from('workspace_files')
        .upsert(fileRow, { onConflict: 'id' });

      if (error) {
        console.debug('Workspace file sync notice:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.debug('Failed to sync file to Supabase workspace_files:', err.message);
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
        console.debug('Failed to update tags in Supabase workspace_files:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.debug('Error updating tags:', err.message);
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

      return !error;
    } catch {
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

      return !error;
    } catch {
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

          if (error || !rows || rows.length === 0) {
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

            if (filesRes.data) {
              filesRes.data.forEach((f: any) => {
                if (!fileMap[f.workspace_id]) {
                  fileMap[f.workspace_id] = [];
                }
                fileMap[f.workspace_id].push({
                  id: f.id,
                  name: f.name || 'Untitled Document',
                  type: f.type || 'doc',
                  size: f.size || '1 KB',
                  uploadDate: f.upload_date || f.created_at || new Date().toISOString(),
                  status: (f.status as any) || 'indexed',
                  url: f.url || undefined,
                  storagePath: f.storage_path || undefined,
                  summary: f.summary || '',
                  highlights: Array.isArray(f.highlights) ? f.highlights : [],
                  tags: Array.isArray(f.tags) && f.tags.length > 0 ? f.tags : ['Document'],
                  transcription: f.transcription || undefined,
                  formulas: Array.isArray(f.formulas) ? f.formulas : [],
                  extractedDiagrams: f.extracted_diagrams || undefined,
                  contentText: f.content_text || undefined,
                  pages: typeof f.pages === 'number' ? f.pages : undefined
                });
              });
            }
          } catch {
            // Non-fatal if child tables fetch fails
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
                fileMapByKey.set(targetKey, existing ? { ...existing, ...f, summary: f.summary || existing.summary, transcription: f.transcription || existing.transcription } : f);
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
      console.warn('Workspace fetch error:', err.message);
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
      console.warn('Failed to claim local workspaces for user:', err.message);
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

      if (error || !rows) return [];

      return rows.map((f: any): WorkspaceFile => ({
        id: f.id,
        name: f.name || 'Untitled Document',
        type: f.type || 'doc',
        size: f.size || '1 KB',
        uploadDate: f.upload_date || f.created_at || new Date().toISOString(),
        status: (f.status as any) || 'indexed',
        url: f.url || undefined,
        storagePath: f.storage_path || undefined,
        summary: f.summary || '',
        highlights: Array.isArray(f.highlights) ? f.highlights : [],
        tags: Array.isArray(f.tags) && f.tags.length > 0 ? f.tags : ['Document'],
        transcription: f.transcription || undefined,
        formulas: Array.isArray(f.formulas) ? f.formulas : [],
        extractedDiagrams: f.extracted_diagrams || undefined,
        contentText: f.content_text || undefined,
        pages: typeof f.pages === 'number' ? f.pages : undefined
      }));
    } catch {
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

      return !error;
    } catch {
      return false;
    }
  }
}
