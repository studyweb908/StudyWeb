import { supabase } from '../lib/supabase';
import { Workspace, WorkspaceFile } from '../components/Dashboard/WorkspaceTypes';
import { toValidUuid } from '../utils/uuid';

export class WorkspaceSyncService {
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

    // If unauthenticated, do NOT push orphan workspace to Supabase.
    // It remains safely isolated in the user's local guest storage until login.
    if (!userId) {
      return true;
    }

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
      files: workspace.files || [],
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

      // Also ensure existing files in the workspace are synced to workspace_files
      if (workspace.files && workspace.files.length > 0) {
        for (const file of workspace.files) {
          await this.saveWorkspaceFile(validId, file);
        }
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

    const fileRow: Record<string, any> = {
      id: validFileId,
      workspace_id: validWsId,
      name: file.name || 'Untitled Document',
      type: file.type || 'doc',
      size: file.size || '1 KB',
      url: file.url || null,
      storage_path: file.storagePath || null,
      summary: file.summary || '',
      transcription: file.transcription || null,
      tags: Array.isArray(file.tags) && file.tags.length > 0 ? file.tags : ['Document'],
      highlights: Array.isArray(file.highlights) ? file.highlights : [],
      formulas: Array.isArray(file.formulas) ? file.formulas : [],
      extracted_diagrams: Array.isArray(file.extractedDiagrams) ? file.extractedDiagrams : (file.extractedDiagrams ? [JSON.stringify(file.extractedDiagrams)] : []),
      pages: typeof file.pages === 'number' ? file.pages : null,
      status: file.status || 'indexed',
      content_text: file.contentText || null,
      upload_date: file.uploadDate ? new Date(file.uploadDate).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (userId) {
      fileRow.user_id = userId;
    }

    // Ensure parent workspace row exists in Supabase so workspace_files_workspace_id_fkey succeeds
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
   * Deletes a file from Supabase 'workspace_files'.
   */
  public static async deleteWorkspaceFile(fileId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const validFileId = toValidUuid(fileId);
      const { error } = await supabase
        .from('workspace_files')
        .delete()
        .eq('id', validFileId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a workspace and its associated files from Supabase.
   */
  public static async deleteWorkspace(workspaceId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const validWsId = toValidUuid(workspaceId);

      // Delete child files first
      await supabase
        .from('workspace_files')
        .delete()
        .eq('workspace_id', validWsId);

      // Delete workspace
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', validWsId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Loads all workspaces strictly belonging to the authenticated user from Supabase.
   * If unauthenticated, returns empty array to prevent foreign workspace leakage.
   */
  public static async fetchWorkspaces(explicitUserId?: string): Promise<Workspace[]> {
    if (!supabase) return [];

    try {
      const userId = explicitUserId || await this.getUserId();

      // STRICT USER ISOLATION:
      // If user is not authenticated, NEVER return remote workspaces from Supabase.
      // This eliminates cross-user data leakage where other people's workspaces were displayed.
      if (!userId) {
        return [];
      }

      // Query STRICTLY this user's workspaces
      const { data: rows, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !rows || rows.length === 0) {
        return [];
      }

      // Fetch all files for these workspaces
      const wsIds = rows.map((r: any) => r.id);
      let fileMap: Record<string, WorkspaceFile[]> = {};

      try {
        const { data: fileRows } = await supabase
          .from('workspace_files')
          .select('*')
          .in('workspace_id', wsIds);

        if (fileRows) {
          fileRows.forEach((f: any) => {
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
        // Non-fatal if files fetch fails
      }

      return rows.map((row: any): Workspace => {
        const remoteTableFiles = fileMap[row.id] || [];
        const jsonbFiles = Array.isArray(row.files) ? row.files : [];
        const fileMapById = new Map<string, WorkspaceFile>();
        jsonbFiles.forEach((f: any) => {
          if (f && f.id) fileMapById.set(f.id, f);
        });
        remoteTableFiles.forEach((f: any) => {
          if (f && f.id) fileMapById.set(f.id, f);
        });
        const files = Array.from(fileMapById.values());

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
          flashcards: Array.isArray(row.flashcards) ? row.flashcards : [],
          quizzes: Array.isArray(row.quizzes) ? row.quizzes : [],
          notes: Array.isArray(row.notes) ? row.notes : [],
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
      for (const ws of localWorkspaces) {
        await this.saveWorkspace(ws, userId);
      }
      return await this.fetchWorkspaces(userId);
    } catch (err: any) {
      console.warn('Failed to claim local workspaces for user:', err.message);
      return localWorkspaces;
    }
  }

  /**
   * Automatically pushes any local workspaces that are not in Supabase yet.
   */
  /**
   * Fetches all files for a specific workspace directly from Supabase workspace_files table.
   */
  public static async fetchWorkspaceFiles(workspaceId: string): Promise<WorkspaceFile[]> {
    if (!supabase) return [];
    try {
      const validWsId = toValidUuid(workspaceId);
      const { data: rows, error } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('workspace_id', validWsId)
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
}

