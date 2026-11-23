import { Workspace } from '../components/Dashboard/WorkspaceTypes';
import { supabase } from '../lib/supabase';

export type ActivityIconType = 'quiz' | 'upload' | 'tutor' | 'note' | 'workspace' | 'workspace-create' | 'delete';

export interface UserActivityItem {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
  timeAgo: string;
  iconType: ActivityIconType;
}

function getRelativeTimeAgo(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return 'Recently';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function parseActivityTime(dateStr?: string): number {
  if (!dateStr) return Date.now();
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? Date.now() : parsed;
}

export function getActiveUserIdSync(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawAuth = localStorage.getItem('studyweb-auth');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      if (parsed?.user?.id) return parsed.user.id;
    }
    // Also check standard Supabase auth token keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth-token') || key.startsWith('sb-'))) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const p = JSON.parse(item);
            if (p?.user?.id) return p.user.id;
          } catch {}
        }
      }
    }
  } catch {}
  return null;
}

export function getUserActivityStorageKey(userId?: string | null): string {
  const effectiveUserId = (userId && typeof userId === 'string' && userId.trim()) 
    ? userId.trim() 
    : getActiveUserIdSync();

  if (effectiveUserId) {
    return `studyweb_real_activities_${effectiveUserId}`;
  }
  return 'studyweb_real_activities_guest';
}

let cloudActivitySyncTimer: ReturnType<typeof setTimeout> | null = null;

interface StoredActivityRecord {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
  iconType: ActivityIconType;
}

export function syncUserActivitiesToCloud(activities: StoredActivityRecord[], immediate = false): void {
  if (typeof window === 'undefined' || !supabase) return;

  const performSync = async () => {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const compact = activities.slice(0, 30).map((a) => ({
        id: String(a.id || `act-${a.timestamp}`),
        title: String(a.title || '').slice(0, 120),
        detail: String(a.detail || '').slice(0, 160),
        timestamp: Number(a.timestamp) || Date.now(),
        iconType: a.iconType || 'workspace'
      }));
      await supabase.auth.updateUser({
        data: {
          recent_activities_v1: compact,
          recent_activities_updated_at: new Date().toISOString()
        }
      });
    } catch (err) {
      console.debug('[UserActivity] Cloud sync notice:', err);
    }
  };

  if (cloudActivitySyncTimer) {
    clearTimeout(cloudActivitySyncTimer);
    cloudActivitySyncTimer = null;
  }

  if (immediate) {
    void performSync();
  } else {
    cloudActivitySyncTimer = setTimeout(() => {
      cloudActivitySyncTimer = null;
      void performSync();
    }, 900);
  }
}

export async function hydrateUserActivitiesFromCloud(explicitUserId?: string | null): Promise<void> {
  if (typeof window === 'undefined' || !supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const effectiveUid = explicitUserId || user.id;
    const key = getUserActivityStorageKey(effectiveUid);

    const existingRaw = localStorage.getItem(key);
    const localList: StoredActivityRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
    const remoteRaw = user.user_metadata?.recent_activities_v1;
    const remoteList: StoredActivityRecord[] = Array.isArray(remoteRaw) ? remoteRaw : [];

    if (remoteList.length === 0) {
      if (localList.length > 0) {
        syncUserActivitiesToCloud(localList, true);
      }
      return;
    }

    const seen = new Set<string>();
    const merged: StoredActivityRecord[] = [];
    for (const item of [...localList, ...remoteList]) {
      if (!item || !item.title) continue;
      const bucket = Math.floor((Number(item.timestamp) || 0) / 15000);
      const dedupeKey = `${item.title}-${item.detail || ''}-${bucket}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      merged.push({
        id: item.id || `act-${item.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
        title: item.title,
        detail: item.detail || '',
        timestamp: Number(item.timestamp) || Date.now(),
        iconType: item.iconType || 'workspace'
      });
    }

    merged.sort((a, b) => b.timestamp - a.timestamp);
    const trimmed = merged.slice(0, 50);
    localStorage.setItem(key, JSON.stringify(trimmed));

    if (trimmed.length > remoteList.length) {
      syncUserActivitiesToCloud(trimmed);
    }

    window.dispatchEvent(new CustomEvent('studyweb-activity-updated', { detail: trimmed[0] || null }));
  } catch (err) {
    console.debug('[UserActivity] Cloud hydrate notice:', err);
  }
}

/**
 * Record a real user event into user-isolated activity storage and sync to cloud.
 */
export function recordUserActivity(
  activity: {
    title: string;
    detail: string;
    iconType: ActivityIconType;
    timestamp?: number;
  },
  userId?: string | null
): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getUserActivityStorageKey(userId);
    const existingRaw = localStorage.getItem(key);
    const list: StoredActivityRecord[] = existingRaw ? JSON.parse(existingRaw) : [];

    const item: StoredActivityRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: activity.title,
      detail: activity.detail,
      timestamp: activity.timestamp || Date.now(),
      iconType: activity.iconType
    };

    const updated = [item, ...list].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
    syncUserActivitiesToCloud(updated);

    // Dispatch event to allow real-time widget refresh and study time tracking
    window.dispatchEvent(new CustomEvent('studyweb-activity-updated', { detail: item }));
  } catch (err) {
    console.debug('Failed to record user activity:', err);
  }
}

/**
 * Derives and returns ONLY real activities that this specific user has performed.
 * Combines explicitly logged events and real assets (files, notes, flashcards, workspaces).
 * Returns empty array if user has performed no real activities (strictly NO dummy data).
 */
export function getRealUserActivities(
  workspaces: Workspace[] = [],
  userId?: string | null
): UserActivityItem[] {
  const activities: {
    id: string;
    title: string;
    detail: string;
    timestamp: number;
    iconType: ActivityIconType;
  }[] = [];

  // 1. Load explicitly recorded user events strictly for this user
  if (typeof window !== 'undefined') {
    try {
      const primaryKey = getUserActivityStorageKey(userId);
      const raw = localStorage.getItem(primaryKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (item && item.title) {
              activities.push({
                id: item.id || `act-saved-${item.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
                title: item.title,
                detail: item.detail || '',
                timestamp: item.timestamp || Date.now(),
                iconType: item.iconType || 'workspace'
              });
            }
          });
        }
      }
    } catch {
      // Ignore parse failure
    }
  }

  // 2. Also incorporate real database workspaces, uploaded files, and notes owned by this user
  if (Array.isArray(workspaces) && workspaces.length > 0) {
    workspaces.forEach(ws => {
      if (!ws || !ws.name) return;
      if (Array.isArray(ws.files)) {
        ws.files.forEach(file => {
          if (file && file.name) {
            activities.push({
              id: `act-file-${file.id}`,
              title: `Uploaded material: ${file.name}`,
              detail: `Workspace: ${ws.name}`,
              timestamp: parseActivityTime(file.uploadDate),
              iconType: 'upload'
            });
          }
        });
      }
      if (Array.isArray(ws.notes)) {
        ws.notes.forEach(note => {
          if (note && note.title) {
            activities.push({
              id: `act-note-${note.id}`,
              title: `Saved study note: ${note.title}`,
              detail: `Workspace: ${ws.name}`,
              timestamp: parseActivityTime(note.updatedAt),
              iconType: 'note'
            });
          }
        });
      }
    });
  }

  // 3. Deduplicate by title & detail within a 15-second window or identical IDs
  const seen = new Set<string>();
  const unique = activities.filter(item => {
    const timeBucket = Math.floor(item.timestamp / 15000);
    const key = `${item.title}-${item.detail}-${timeBucket}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort strictly by timestamp descending
  unique.sort((a, b) => b.timestamp - a.timestamp);

  // Format relative time
  return unique.slice(0, 10).map(item => ({
    ...item,
    timeAgo: getRelativeTimeAgo(item.timestamp)
  }));
}
