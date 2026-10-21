import { Workspace } from '../components/Dashboard/WorkspaceTypes';

/**
 * Returns a user-isolated localStorage key for workspace persistence.
 * Prevents cross-user data leakage when switching accounts.
 */
export function getWorkspaceStorageKey(userId?: string | null): string {
  if (userId && typeof userId === 'string' && userId.trim()) {
    return `studyweb_workspaces_${userId.trim()}`;
  }
  return 'studyweb_workspaces_guest';
}

/**
 * Loads workspaces safely from localStorage for the given user (or guest).
 */
export function loadStoredWorkspaces(userId?: string | null): Workspace[] {
  if (typeof window === 'undefined') return [];

  try {
    const key = getWorkspaceStorageKey(userId);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.debug('Failed to load stored workspaces:', err);
  }

  return [];
}

/**
 * Persists workspaces safely into user-isolated localStorage.
 */
export function saveStoredWorkspaces(workspaces: Workspace[], userId?: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getWorkspaceStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(workspaces));

    // When saving for an authenticated user, remove the un-scoped legacy key to prevent leaks
    if (userId) {
      localStorage.removeItem('studyweb_workspaces_v2');
    }
  } catch (err) {
    console.debug('Failed to save stored workspaces:', err);
  }
}

/**
 * Clears guest/temporary workspace storage after claiming them upon login.
 */
export function clearGuestWorkspaces(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('studyweb_workspaces_guest');
    localStorage.removeItem('studyweb_workspaces_v2');
  } catch (err) {
    console.debug('Failed to clear guest workspaces:', err);
  }
}
