import { supabase } from '../lib/supabase';
import { Workspace, WorkspaceFile } from '../components/Dashboard/WorkspaceTypes';
import { toValidUuid, isValidUuid } from '../utils/uuid';

export class WorkspaceSyncService {
  /**
   * Helper to get current Supabase user ID if authenticated
   */
  private static async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Saves or updates a workspace in the Supabase 'workspaces' table.
   * Also synchronizes any files associated with this workspace to 'workspace_files'.
   */
  public static async saveWorkspace(workspace: Workspace): Promise<boolean> {
    if (!supabase) return false;

    const validId = toValidUuid(workspace.id);
    const userId = await this.getUserId();

    const row: Record<string, any> = {
      id: validId,
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
      updated_at: new Date().toISOString()
    };

    // If user is authenticated, attach their UUID; otherwise null
    if (userId) {
      row.user_id = userId;
    }

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
  public static async saveWorkspaceFile(workspaceId: string, file: WorkspaceFile): Promise<boolean> {
    if (!supabase) return false;

    const validFileId = toValidUuid(file.id);
    const validWsId = toValidUuid(workspaceId);

    const fileRow = {
      id: validFileId,
      workspace_id: validWsId,
      name: file.name || 'Untitled Document',
      type: file.type || 'doc',
      size: file.size || '1 KB',
      upload_date: file.uploadDate || new Date().toISOString().split('T')[0],
      status: file.status || 'indexed',
      url: file.url || '',
      summary: file.summary || '',
      highlights: file.highlights || [],
      tags: file.tags || ['Document']
    };

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
   * Loads all workspaces from Supabase along with their uploaded files.
   */
  public static async fetchWorkspaces(): Promise<Workspace[]> {
    if (!supabase) return [];

    try {
      const userId = await this.getUserId();

      // Query workspaces
      let query = supabase.from('workspaces').select('*').order('created_at', { ascending: false });
      
      // If user is logged in, query strictly user's workspaces
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.or('user_id.is.null,visibility.eq.shared');
      }

      const { data: rows, error } = await query;
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
              name: f.name,
              type: f.type || 'doc',
              size: f.size || '1 KB',
              uploadDate: f.upload_date || new Date(f.created_at).toLocaleDateString(),
              status: f.status || 'indexed',
              url: f.url,
              summary: f.summary,
              highlights: Array.isArray(f.highlights) ? f.highlights : [],
              tags: Array.isArray(f.tags) ? f.tags : ['Indexed']
            });
          });
        }
      } catch {
        // Non-fatal if files fetch fails
      }

      return rows.map((row: any): Workspace => {
        const files = fileMap[row.id] || [];
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
          flashcards: [],
          quizzes: [],
          notes: [],
          plannerTasks: [],
          nodes: [
            { id: 'n-root', label: row.name, type: 'topic', color: '#6366F1', x: 250, y: 150 },
            ...files.map((file, idx) => ({
              id: `n-${file.id}`,
              label: file.name.slice(0, 20) + '...',
              type: 'file' as const,
              color: '#3B82F6',
              x: 100 + (idx % 5) * 80,
              y: 200 + Math.floor(idx / 5) * 80,
              details: `${file.type.toUpperCase()} file`
            }))
          ],
          links: files.map((file) => ({
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
   * Automatically pushes any local workspaces that are not in Supabase yet.
   */
  public static async syncLocalWorkspacesToSupabase(localWorkspaces: Workspace[]): Promise<void> {
    if (!supabase || !localWorkspaces || localWorkspaces.length === 0) return;

    try {
      for (const ws of localWorkspaces) {
        await this.saveWorkspace(ws);
      }
    } catch (err: any) {
      console.warn('Sync local workspaces notice:', err.message);
    }
  }
}
