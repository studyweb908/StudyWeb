import { Workspace } from '../components/Dashboard/WorkspaceTypes';

export interface UserActivityItem {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
  timeAgo: string;
  iconType: 'quiz' | 'upload' | 'tutor' | 'note' | 'workspace';
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
    iconType: 'quiz' | 'upload' | 'tutor' | 'note' | 'workspace';
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

  // 2. Synthesize real activities from actual workspaces
  if (workspaces && workspaces.length > 0) {
    workspaces.forEach(ws => {
      // Real uploaded files
      if (ws.files && ws.files.length > 0) {
        ws.files.forEach(file => {
          activities.push({
            id: `act-file-${file.id}`,
            title: `Uploaded ${file.name}`,
            detail: `Added to ${ws.name} • ${file.size || 'Indexed document'}`,
            timestamp: parseActivityTime(file.uploadDate),
            iconType: 'upload'
          });
        });
      }

      // Real notes created
      if (ws.notes && ws.notes.length > 0) {
        ws.notes.forEach(note => {
          activities.push({
            id: `act-note-${note.id}`,
            title: `Note: ${note.title || 'Untitled Note'}`,
            detail: `Saved in ${ws.name}`,
            timestamp: parseActivityTime(note.updatedAt),
            iconType: 'note'
          });
        });
      }

      // Real flashcard sets
      if (ws.flashcards && ws.flashcards.length > 0) {
        activities.push({
          id: `act-flashcards-${ws.id}`,
          title: `Flashcards: ${ws.name}`,
          detail: `${ws.flashcards.length} active cards ready for review`,
          timestamp: parseActivityTime(ws.lastOpened),
          iconType: 'quiz'
        });
      }

      // Real workspace creation / update
      activities.push({
        id: `act-ws-${ws.id}`,
        title: `Workspace: ${ws.name}`,
        detail: ws.subject ? `Subject: ${ws.subject}` : 'Course workspace ready',
        timestamp: parseActivityTime(ws.lastOpened),
        iconType: 'workspace'
      });
    });
  }

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
