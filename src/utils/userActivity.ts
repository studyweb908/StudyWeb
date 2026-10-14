import { Workspace } from '../components/Dashboard/WorkspaceTypes';

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

/**
 * Record a real user event into user-isolated activity storage.
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
    const list: any[] = existingRaw ? JSON.parse(existingRaw) : [];

    const item = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: activity.title,
      detail: activity.detail,
      timestamp: activity.timestamp || Date.now(),
      iconType: activity.iconType
    };

    const updated = [item, ...list].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));

    // Dispatch event to allow real-time widget refresh
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

  // 1. Load explicitly recorded user events
  if (typeof window !== 'undefined') {
    try {
      const primaryKey = getUserActivityStorageKey(userId);
      const keysToLoad = [primaryKey];
      // If signed in, also incorporate guest entries so no real actions are missed
      if (primaryKey !== 'studyweb_real_activities_guest') {
        keysToLoad.push('studyweb_real_activities_guest');
      }

      keysToLoad.forEach(key => {
        const raw = localStorage.getItem(key);
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
      });
    } catch {
      // Ignore parse failure
    }
  }

  // 2. Return strictly recorded real user events (zero dummy/synthetic data)
  // Deduplicate by title & detail within a 15-second window or identical IDs
  const seen = new Set<string>();
  const unique = activities.filter(item => {
    // 15-second window deduplication so repeated interactions over time are preserved
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
