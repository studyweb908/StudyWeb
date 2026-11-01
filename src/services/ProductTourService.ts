import { supabase } from '../lib/supabase';
import { readSyncProfileSnapshot } from '../utils/profileStorage';

export type ProductTourStatus = 'not_started' | 'completed' | 'skipped';

export interface ProductTourState {
  status: ProductTourStatus;
  updatedAt: string | null;
  completedStep?: number;
}

const GLOBAL_TOUR_STATUS_KEY = 'studyweb_product_tour_status';
const GLOBAL_TOUR_META_KEY = 'studyweb_product_tour_meta';
const NEW_USER_TOUR_PENDING_KEY = 'studyweb_new_user_tour_pending';

function getUserScopedKey(baseKey: string, userId?: string | null): string {
  const uid = userId || readSyncProfileSnapshot().userId || localStorage.getItem('studyweb_active_user_id');
  return uid ? `${baseKey}_${uid}` : baseKey;
}

export class ProductTourService {
  /**
   * Synchronously reads the user's current tour status from localStorage.
   */
  static getLocalTourState(userId?: string | null): ProductTourState {
    if (typeof window === 'undefined') {
      return { status: 'not_started', updatedAt: null };
    }

    try {
      const scopedMetaKey = getUserScopedKey(GLOBAL_TOUR_META_KEY, userId);
      const rawMeta = localStorage.getItem(scopedMetaKey) || localStorage.getItem(GLOBAL_TOUR_META_KEY);
      if (rawMeta) {
        const parsed = JSON.parse(rawMeta);
        if (parsed && (parsed.status === 'completed' || parsed.status === 'skipped')) {
          return {
            status: parsed.status,
            updatedAt: parsed.updatedAt || null,
            completedStep: parsed.completedStep
          };
        }
      }

      const scopedStatusKey = getUserScopedKey(GLOBAL_TOUR_STATUS_KEY, userId);
      const rawStatus =
        localStorage.getItem(scopedStatusKey) || localStorage.getItem(GLOBAL_TOUR_STATUS_KEY);

      if (rawStatus === 'completed' || rawStatus === 'skipped') {
        return { status: rawStatus, updatedAt: null };
      }
    } catch {
      // Ignore storage read errors
    }

    return { status: 'not_started', updatedAt: null };
  }

  /**
   * Flags that a newly registered user should see the guided tour right after setup.
   */
  static markNewUserTourPending(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(NEW_USER_TOUR_PENDING_KEY, 'true');
    } catch {}
  }

  static hasNewUserTourPending(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(NEW_USER_TOUR_PENDING_KEY) === 'true';
    } catch {
      return false;
    }
  }

  static clearNewUserTourPending(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(NEW_USER_TOUR_PENDING_KEY);
    } catch {}
  }

  /**
   * Persists the user's tour status ('completed' or 'skipped') both locally
   * and against the authenticated user's account in Supabase.
   */
  static async saveTourStatus(
    status: 'completed' | 'skipped',
    completedStep = 5
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    const nowIso = new Date().toISOString();
    const snap = readSyncProfileSnapshot();
    const userId = snap.userId || localStorage.getItem('studyweb_active_user_id');

    const payload: ProductTourState = {
      status,
      updatedAt: nowIso,
      completedStep
    };

    try {
      localStorage.setItem(GLOBAL_TOUR_STATUS_KEY, status);
      localStorage.setItem(GLOBAL_TOUR_META_KEY, JSON.stringify(payload));
      if (userId) {
        localStorage.setItem(getUserScopedKey(GLOBAL_TOUR_STATUS_KEY, userId), status);
        localStorage.setItem(getUserScopedKey(GLOBAL_TOUR_META_KEY, userId), JSON.stringify(payload));
      }
      this.clearNewUserTourPending();
    } catch {}

    window.dispatchEvent(
      new CustomEvent('studyweb-tour-status-updated', { detail: payload })
    );

    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (!authUser) return;

      // 1. Read existing onboarding_data from profiles so we merge cleanly
      let existingOnboardingData: Record<string, any> = {};
      try {
        const localOnboarding = localStorage.getItem('studyweb_onboarding_data');
        if (localOnboarding) {
          existingOnboardingData = JSON.parse(localOnboarding) || {};
        }
      } catch {}

      try {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('onboarding_data')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileRow?.onboarding_data && typeof profileRow.onboarding_data === 'object') {
          existingOnboardingData = {
            ...existingOnboardingData,
            ...profileRow.onboarding_data
          };
        }
      } catch {}

      const mergedOnboardingData = {
        ...existingOnboardingData,
        product_tour_status: status,
        product_tour_updated_at: nowIso,
        product_tour_step: completedStep
      };

      try {
        localStorage.setItem('studyweb_onboarding_data', JSON.stringify(mergedOnboardingData));
      } catch {}

      await supabase.from('profiles').upsert(
        {
          id: authUser.id,
          email: authUser.email || snap.email || '',
          onboarding_data: mergedOnboardingData,
          updated_at: nowIso
        },
        { onConflict: 'id' }
      );

      // Also store in user_metadata for instant session hydration across devices
      await supabase.auth.updateUser({
        data: {
          product_tour_status: status,
          product_tour_updated_at: nowIso
        }
      });
    } catch (err) {
      console.warn('Could not sync product tour status to remote profile:', err);
    }
  }

  /**
   * Reconciles tour status from the authenticated user's Supabase account
   * and determines whether the tour should automatically launch.
   */
  static async reconcileRemoteTourStatus(): Promise<ProductTourState> {
    const local = this.getLocalTourState();
    if (local.status === 'completed' || local.status === 'skipped') {
      return local;
    }

    if (!supabase) return local;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (!authUser) return local;

      // Check auth user_metadata first
      const metaStatus = authUser.user_metadata?.product_tour_status;
      if (metaStatus === 'completed' || metaStatus === 'skipped') {
        const state: ProductTourState = {
          status: metaStatus,
          updatedAt: authUser.user_metadata?.product_tour_updated_at || null
        };
        this.cacheTourStateLocally(authUser.id, state);
        return state;
      }

      // Check profiles.onboarding_data
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('onboarding_data')
        .eq('id', authUser.id)
        .maybeSingle();

      const remoteOnboarding = profileRow?.onboarding_data;
      if (remoteOnboarding && typeof remoteOnboarding === 'object') {
        const remoteStatus = (remoteOnboarding as any).product_tour_status;
        if (remoteStatus === 'completed' || remoteStatus === 'skipped') {
          const state: ProductTourState = {
            status: remoteStatus,
            updatedAt: (remoteOnboarding as any).product_tour_updated_at || null,
            completedStep: (remoteOnboarding as any).product_tour_step
          };
          this.cacheTourStateLocally(authUser.id, state);
          return state;
        }
      }
    } catch {}

    return local;
  }

  private static cacheTourStateLocally(userId: string, state: ProductTourState): void {
    try {
      localStorage.setItem(GLOBAL_TOUR_STATUS_KEY, state.status);
      localStorage.setItem(GLOBAL_TOUR_META_KEY, JSON.stringify(state));
      localStorage.setItem(getUserScopedKey(GLOBAL_TOUR_STATUS_KEY, userId), state.status);
      localStorage.setItem(getUserScopedKey(GLOBAL_TOUR_META_KEY, userId), JSON.stringify(state));
    } catch {}
  }

  /**
   * Triggers or restarts the guided onboarding tour from Settings, Help, or Header.
   */
  static startOrRestartTour(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('studyweb-start-product-tour'));
  }
}
