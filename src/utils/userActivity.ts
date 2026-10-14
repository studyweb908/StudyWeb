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

export function getUserActivityStorageKey(userId?: string | null): string {
  if (userId && typeof userId === 'string' && userId.trim()) {
    return `studyweb_real_activities_${userId.trim()}`;
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

    const updated = [item, ...list].slice(0, 30);
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
    iconType: 'quiz' | 'upload' | 'tutor' | 'note' | 'workspace';
  }[] = [];

  // 1. Load explicitly recorded user events
  if (typeof window !== 'undefined') {
    try {
      const key = getUserActivityStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (item && item.title) {
              activities.push({
                id: item.id || `act-saved-${item.timestamp}`,
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

  // 2. Return strictly recorded real user events (zero dummy/synthetic data)
  // Deduplicate by title & rounded timestamp or id
  const seen = new Set<string>();
  const unique = activities.filter(item => {
    const key = `${item.title}-${item.detail}`;
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
