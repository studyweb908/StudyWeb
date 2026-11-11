/**
 * StudyTrackerService — StudyWeb Premium Streak System ("StudyWeb Streaks")
 *
 * Production-ready study-time tracker, server-validated heartbeat engine,
 * historical target preserver, and milestone achievement manager.
 * - Tracks genuine active study time across AI Tutor, Workspaces, Notes,
 *   Flashcards, Quizzes, PDF Reader, and Study Sessions.
 * - Excludes idle browser time (>90s without interaction), hidden/inactive tabs,
 *   paused sessions, and duplicate concurrent tab heartbeats.
 * - Preserves historical daily qualifying targets so changing the daily goal
 *   never erases or alters past qualifying days.
 * - Synchronizes with `/api/streaks/*` server routes and Supabase persistence.
 */

import { supabase } from '../lib/supabase';

export const DAILY_GOAL_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240] as const;
export const DEFAULT_DAILY_GOAL_MINUTES = 60;

export interface StudySessionLogItem {
  id: string;
  subject: string;
  minutes: number;
  date: string; // ISO timestamp
  note?: string;
  activityType?: 'tutor' | 'workspace' | 'notes' | 'flashcards' | 'quiz' | 'pdf' | 'study-session';
}

export interface DailyHistoryEntry {
  date: string; // YYYY-MM-DD in user's timezone
  completedSeconds: number;
  completedMinutes: number;
  targetMinutes: number; // Historical target preserved for that specific day
  qualified: boolean;
  qualifiedAt?: string | null;
  celebratedAt?: string | null;
}

export interface StreakAchievementBadge {
  id: string;
  name: string;
  description: string;
  requiredDays: number;
  unlocked: boolean;
  unlockedAt: string | null;
  progressPct: number;
}

export interface StudyStreakStatistics {
  totalStudyDays: number;
  currentStreak: number;
  longestStreak: number;
  longestStreakDate: string | null;
  totalStudyHours: number;
  totalStudyMinutes: number;
  dailyAverageMinutes: number;
  monthlyCompletedGoals: number;
}

export const STREAK_ACHIEVEMENT_MILESTONES: Array<{
  id: string;
  name: string;
  description: string;
  requiredDays: number;
}> = [
  {
    id: 'first-spark',
    name: 'First Spark',
    description: 'Complete your daily study goal for the very first day.',
    requiredDays: 1,
  },
  {
    id: 'momentum-3',
    name: '3-Day Momentum',
    description: 'Reach a 3-day consecutive study streak.',
    requiredDays: 3,
  },
  {
    id: 'discipline-7',
    name: '7-Day Discipline',
    description: 'Complete a full 7-day week of consistent daily study.',
    requiredDays: 7,
  },
  {
    id: 'focus-14',
    name: '14-Day Focus',
    description: 'Sustain 14 consecutive days of focused study habits.',
    requiredDays: 14,
  },
  {
    id: 'champion-30',
    name: '30-Day Champion',
    description: 'Achieve 30 straight days of academic dedication.',
    requiredDays: 30,
  },
  {
    id: 'consistency-60',
    name: '60-Day Consistency',
    description: 'Master 60 consecutive days of daily study goals.',
    requiredDays: 60,
  },
  {
    id: 'legend-100',
    name: '100-Day Legend',
    description: 'Enter the StudyWeb Hall of Fame with a 100-day streak.',
    requiredDays: 100,
  },
];

export interface StudyStats {
  totalSeconds: number;                   // Today's seconds studied
  todaySeconds: number;                   // Seconds studied on the current calendar day
  currentStreak: number;                  // Consecutive calendar days streak
  longestStreak: number;                  // Personal longest streak record
  longestStreakDate: string | null;       // Date longest streak was achieved
  studyDates: string[];                   // Unique YYYY-MM-DD local dates
  lastActiveDate: string;                 // YYYY-MM-DD of current day
  lastHeartbeat: number;                  // Epoch ms of last active tick
  isStudyingLive: boolean;                // Whether user is actively interacting now
  activeActivityType: string;             // 'tutor' | 'workspace' | 'notes' | 'flashcards' | 'quiz' | 'pdf' | 'study-session'
  subjectSeconds: Record<string, number>; // Seconds studied per subject today
  recentSessions: StudySessionLogItem[];  // Today's logged study sessions
  completedRoutineDates?: string[];       // YYYY-MM-DD dates when daily study goal was completed
  celebratedDates?: string[];             // YYYY-MM-DD dates where celebration modal was shown
  historicalTargets?: Record<string, number>; // Preserved target minutes per YYYY-MM-DD
  dailyHistory?: Record<string, DailyHistoryEntry>; // Full calendar history per YYYY-MM-DD
  soundEnabled: boolean;                  // Celebration sound preference
  animationsEnabled: boolean;             // Flame & particle animation preference
  timezone: string;                       // IANA timezone
}

export interface FormattedStudyStats extends StudyStats {
  studyHoursFormatted: string;
  studyHoursNumber: number;
  todayMinutes: number;
  remainingMinutes: number;
  dailyGoalMinutes: number;
  todayTargetMinutes: number;
  progressPercentage: number;
  streakBadgeText: string;
  activeToday: boolean;
  celebratedToday: boolean;
  subjectBreakdown: Array<{ subject: string; minutes: number; hours: string; percentage: number }>;
  achievements: StreakAchievementBadge[];
  statistics: StudyStreakStatistics;
}

export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === 'string') return tz;
  } catch {}
  return 'UTC';
}

// Formats a Date to YYYY-MM-DD in the specified IANA timezone (safe against UTC shifts)
export function getLocalDateString(d: Date = new Date(), timezone?: string): string {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(d);
      const y = parts.find((p) => p.type === 'year')?.value;
      const m = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      if (y && m && day) return `${y}-${m}-${day}`;
    } catch {}
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Computes the previous day in YYYY-MM-DD format
export function getPreviousDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return getLocalDateString(date);
}

export function getNextDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return getLocalDateString(date);
}

/**
 * Pure consecutive streak calculation:
 * - Counts consecutive completed days immediately preceding today.
 * - Adds +1 ONLY when today's daily study goal is completed (routineDoneToday === true).
 */
export function calculateConsecutiveStreak(
  completedRoutineDates: string[],
  todayStr: string
): { streak: number; activeToday: boolean; priorCompletedDays: number } {
  const dateSet = new Set(completedRoutineDates || []);
  const routineDoneToday = dateSet.has(todayStr);

  let checkDate = getPreviousDateString(todayStr);
  let priorCompletedDays = 0;
  while (dateSet.has(checkDate)) {
    priorCompletedDays += 1;
    checkDate = getPreviousDateString(checkDate);
  }

  const streak = routineDoneToday ? priorCompletedDays + 1 : priorCompletedDays;

  return {
    streak,
    activeToday: routineDoneToday,
    priorCompletedDays,
  };
}

/**
 * Computes longest consecutive run of dates in a sorted YYYY-MM-DD list.
 */
export function computeLongestRun(
  completedDates: string[],
  prevLongest = 0,
  prevLongestDate: string | null = null
): { longestStreak: number; longestStreakDate: string | null } {
  const sorted = Array.from(new Set(completedDates)).sort();
  let longest = prevLongest;
  let longestDate = prevLongestDate;
  let currentRun = 0;
  let prev: string | null = null;

  for (const dStr of sorted) {
    if (!prev || getNextDateString(prev) === dStr) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    if (currentRun >= longest && currentRun > 0) {
      longest = currentRun;
      longestDate = dStr;
    }
    prev = dStr;
  }

  return { longestStreak: longest, longestStreakDate: longestDate };
}

class StudyTrackerManager {
  private activeUserId: string | null = null;
  private sessionId: string = `sw-sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastUserInteraction: number = Date.now();
  private isLiveActive: boolean = true;
  private initialized: boolean = false;
  private activeSubjectLabel: string = 'General Study';
  private activeActivityType: 'tutor' | 'workspace' | 'notes' | 'flashcards' | 'quiz' | 'pdf' | 'study-session' = 'workspace';
  private dailyGoalMinutes: number = DEFAULT_DAILY_GOAL_MINUTES;
  private lastAuthMetaSyncAt: number = 0;
  private isSyncingSupabase: boolean = false;
  private pendingServerHeartbeatSeconds: number = 0;
  private lastServerHeartbeatAt: number = 0;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastCrossTabTickAt: number = 0;

  private memoryStats: StudyStats = {
    totalSeconds: 0,
    todaySeconds: 0,
    currentStreak: 0,
    longestStreak: 0,
    longestStreakDate: null,
    studyDates: [getLocalDateString()],
    completedRoutineDates: [],
    celebratedDates: [],
    historicalTargets: {},
    dailyHistory: {},
    lastActiveDate: getLocalDateString(),
    lastHeartbeat: Date.now(),
    isStudyingLive: false,
    activeActivityType: 'workspace',
    subjectSeconds: {},
    recentSessions: [],
    soundEnabled: true,
    animationsEnabled: true,
    timezone: detectBrowserTimezone(),
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private getTodayStr(): string {
    return getLocalDateString(new Date(), this.memoryStats.timezone);
  }

  public getDailyGoalMinutes(): number {
    return this.dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;
  }

  /**
   * Updates the user's daily study goal (15..240+ minutes).
   * Preserves all historical qualifying targets so past completed days are never erased.
   */
  public setDailyGoalMinutes(mins: number): void {
    const clean = Math.max(5, Math.min(720, Math.round(Number(mins) || DEFAULT_DAILY_GOAL_MINUTES)));
    this.dailyGoalMinutes = clean;

    const todayStr = this.getTodayStr();
    const completedSet = new Set(this.memoryStats.completedRoutineDates || []);

    // Only update today's target if today was not already qualified, OR keep historical targets intact
    if (!this.memoryStats.historicalTargets) {
      this.memoryStats.historicalTargets = {};
    }
    if (!completedSet.has(todayStr)) {
      this.memoryStats.historicalTargets[todayStr] = clean;
      if (this.memoryStats.dailyHistory?.[todayStr]) {
        this.memoryStats.dailyHistory[todayStr].targetMinutes = clean;
      }
    }

    this.evaluateDailyRoutineStreak();
    this.persistLocalStreakSnapshot();
    this.syncSettingsToServer({ dailyGoalMinutes: clean });
    this.syncToSupabase(true);
    this.broadcastUpdate();
  }

  public getSoundEnabled(): boolean {
    return this.memoryStats.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.memoryStats.soundEnabled = Boolean(enabled);
    this.persistLocalStreakSnapshot();
    this.syncSettingsToServer({ soundEnabled: this.memoryStats.soundEnabled });
    this.syncToSupabase(true);
    this.broadcastUpdate();
  }

  public getAnimationsEnabled(): boolean {
    return this.memoryStats.animationsEnabled;
  }

  public setAnimationsEnabled(enabled: boolean): void {
    this.memoryStats.animationsEnabled = Boolean(enabled);
    this.persistLocalStreakSnapshot();
    this.syncSettingsToServer({ animationsEnabled: this.memoryStats.animationsEnabled });
    this.syncToSupabase(true);
    this.broadcastUpdate();
  }

  public getTimezone(): string {
    return this.memoryStats.timezone || detectBrowserTimezone();
  }

  public setTimezone(tz: string): void {
    if (!tz || typeof tz !== 'string') return;
    try {
      Intl.DateTimeFormat('en-CA', { timeZone: tz.trim() }).format(new Date());
      this.memoryStats.timezone = tz.trim();
      this.checkDailyRollover();
      this.persistLocalStreakSnapshot();
      this.syncSettingsToServer({ timezone: this.memoryStats.timezone });
      this.syncToSupabase(true);
      this.broadcastUpdate();
    } catch {}
  }

  private resolveCurrentSubject(): string {
    return this.activeSubjectLabel || 'General Study';
  }

  public setActiveSubject(subjectName: string): void {
    if (subjectName && subjectName.trim()) {
      this.activeSubjectLabel = subjectName.trim();
    }
  }

  public setActiveActivityType(
    type: 'tutor' | 'workspace' | 'notes' | 'flashcards' | 'quiz' | 'pdf' | 'study-session'
  ): void {
    this.activeActivityType = type;
    this.memoryStats.activeActivityType = type;
    this.lastUserInteraction = Date.now();
  }

  public hasCelebratedToday(): boolean {
    const todayStr = this.getTodayStr();
    return Boolean(
      this.memoryStats.celebratedDates?.includes(todayStr) ||
        this.memoryStats.dailyHistory?.[todayStr]?.celebratedAt
    );
  }

  public acknowledgeCelebrationForToday(): void {
    const todayStr = this.getTodayStr();
    const celebrated = new Set(this.memoryStats.celebratedDates || []);
    celebrated.add(todayStr);
    this.memoryStats.celebratedDates = Array.from(celebrated).slice(-60);
    if (this.memoryStats.dailyHistory?.[todayStr]) {
      this.memoryStats.dailyHistory[todayStr].celebratedAt = new Date().toISOString();
    }
    this.persistLocalStreakSnapshot();
    this.acknowledgeCelebrationOnServer(todayStr);
    this.syncToSupabase(true);
    this.broadcastUpdate();
  }

  private getScopedStorageKey(): string {
    const uid =
      this.activeUserId ||
      (typeof window !== 'undefined' ? localStorage.getItem('studyweb_active_user_id') : null) ||
      'guest';
    return `studyweb_streaks_v2_${uid}`;
  }

  private hydrateFromLocalStreakSnapshot(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedGoal = Number(localStorage.getItem('studyweb_profile_daily_goal'));
      if (Number.isFinite(savedGoal) && savedGoal >= 5) {
        this.dailyGoalMinutes = savedGoal;
      }

      const raw = localStorage.getItem(this.getScopedStorageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      if (typeof parsed.soundEnabled === 'boolean') {
        this.memoryStats.soundEnabled = parsed.soundEnabled;
      }
      if (typeof parsed.animationsEnabled === 'boolean') {
        this.memoryStats.animationsEnabled = parsed.animationsEnabled;
      }
      if (typeof parsed.timezone === 'string' && parsed.timezone) {
        this.memoryStats.timezone = parsed.timezone;
      }
      if (Number(parsed.dailyGoalMinutes) >= 5) {
        this.dailyGoalMinutes = Number(parsed.dailyGoalMinutes);
      }
      if (Array.isArray(parsed.completedRoutineDates)) {
        this.memoryStats.completedRoutineDates = parsed.completedRoutineDates;
      }
      if (Array.isArray(parsed.celebratedDates)) {
        this.memoryStats.celebratedDates = parsed.celebratedDates;
      }
      if (parsed.historicalTargets && typeof parsed.historicalTargets === 'object') {
        this.memoryStats.historicalTargets = parsed.historicalTargets;
      }
      if (parsed.dailyHistory && typeof parsed.dailyHistory === 'object') {
        this.memoryStats.dailyHistory = parsed.dailyHistory;
      }
      if (Number(parsed.longestStreak) > 0) {
        this.memoryStats.longestStreak = Number(parsed.longestStreak);
      }
      if (parsed.longestStreakDate) {
        this.memoryStats.longestStreakDate = parsed.longestStreakDate;
      }

      const todayStr = this.getTodayStr();
      if (parsed.lastActiveDate === todayStr && Number(parsed.todaySeconds) > 0) {
        this.memoryStats.todaySeconds = Math.max(
          this.memoryStats.todaySeconds,
          Number(parsed.todaySeconds)
        );
        this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;
        if (parsed.subjectSeconds && typeof parsed.subjectSeconds === 'object') {
          this.memoryStats.subjectSeconds = { ...parsed.subjectSeconds };
        }
      }

      const { streak } = calculateConsecutiveStreak(
        this.memoryStats.completedRoutineDates || [],
        todayStr
      );
      this.memoryStats.currentStreak = streak;
      const { longestStreak, longestStreakDate } = computeLongestRun(
        this.memoryStats.completedRoutineDates || [],
        this.memoryStats.longestStreak,
        this.memoryStats.longestStreakDate
      );
      this.memoryStats.longestStreak = Math.max(longestStreak, streak);
      this.memoryStats.longestStreakDate = longestStreakDate;
    } catch {}
  }

  private persistLocalStreakSnapshot(): void {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        dailyGoalMinutes: this.dailyGoalMinutes,
        todaySeconds: this.memoryStats.todaySeconds,
        lastActiveDate: this.memoryStats.lastActiveDate,
        currentStreak: this.memoryStats.currentStreak,
        longestStreak: this.memoryStats.longestStreak,
        longestStreakDate: this.memoryStats.longestStreakDate,
        completedRoutineDates: (this.memoryStats.completedRoutineDates || []).slice(-120),
        celebratedDates: (this.memoryStats.celebratedDates || []).slice(-60),
        historicalTargets: this.memoryStats.historicalTargets || {},
        dailyHistory: this.memoryStats.dailyHistory || {},
        subjectSeconds: this.memoryStats.subjectSeconds || {},
        soundEnabled: this.memoryStats.soundEnabled,
        animationsEnabled: this.memoryStats.animationsEnabled,
        timezone: this.memoryStats.timezone,
      };
      localStorage.setItem(this.getScopedStorageKey(), JSON.stringify(payload));
      localStorage.setItem('studyweb_profile_daily_goal', String(this.dailyGoalMinutes));
    } catch {}
  }

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.hydrateFromLocalStreakSnapshot();
    this.reconcileWithSupabase();
    this.syncStatusFromServer();

    // Cross-tab deduplication channel so multiple open StudyWeb tabs never double-count seconds
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('studyweb_streak_heartbeat');
        this.broadcastChannel.onmessage = (event) => {
          const data = event?.data;
          if (!data) return;
          if (data.type === 'TAB_TICK' && data.sessionId !== this.sessionId) {
            this.lastCrossTabTickAt = Date.now();
            if (Number(data.todaySeconds) > this.memoryStats.todaySeconds) {
              this.memoryStats.todaySeconds = Number(data.todaySeconds);
              this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;
              this.evaluateDailyRoutineStreak(false);
              this.broadcastUpdate();
            }
          }
        };
      } catch {}
    }

    const onActivity = () => {
      this.lastUserInteraction = Date.now();
      if (!this.isLiveActive) {
        this.isLiveActive = true;
      }
    };

    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('click', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });
    window.addEventListener('studyweb_profile_updated', (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.dailyGoalMinutes && Number.isFinite(Number(detail.dailyGoalMinutes))) {
        const nextGoal = Math.max(5, Math.min(720, Math.round(Number(detail.dailyGoalMinutes))));
        if (nextGoal !== this.dailyGoalMinutes) {
          this.dailyGoalMinutes = nextGoal;
          const todayStr = this.getTodayStr();
          if (!this.memoryStats.completedRoutineDates?.includes(todayStr)) {
            if (!this.memoryStats.historicalTargets) this.memoryStats.historicalTargets = {};
            this.memoryStats.historicalTargets[todayStr] = nextGoal;
          }
        }
      }
      this.evaluateDailyRoutineStreak();
      this.broadcastUpdate();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onActivity();
        this.checkDailyRollover();
      } else {
        this.flushHeartbeatToServer();
      }
    });

    this.timer = setInterval(() => {
      this.tickStudySession();
    }, 1000);

    if (supabase) {
      supabase.auth.onAuthStateChange((_event, session) => {
        const newUid = session?.user?.id || null;
        if (newUid !== this.activeUserId) {
          this.activeUserId = newUid;
          if (!newUid) {
            this.resetInMemoryStatsForDay(this.getTodayStr());
            this.broadcastUpdate();
          } else {
            this.hydrateFromLocalStreakSnapshot();
            this.reconcileWithSupabase();
            this.syncStatusFromServer();
          }
        }
      });
    }
  }

  private resetInMemoryStatsForDay(todayStr: string): void {
    this.memoryStats = {
      totalSeconds: 0,
      todaySeconds: 0,
      currentStreak: 0,
      longestStreak: 0,
      longestStreakDate: null,
      studyDates: [todayStr],
      completedRoutineDates: [],
      celebratedDates: [],
      historicalTargets: { [todayStr]: this.dailyGoalMinutes },
      dailyHistory: {},
      lastActiveDate: todayStr,
      lastHeartbeat: Date.now(),
      isStudyingLive: true,
      activeActivityType: 'workspace',
      subjectSeconds: {},
      recentSessions: [],
      soundEnabled: true,
      animationsEnabled: true,
      timezone: detectBrowserTimezone(),
    };
  }

  public resetAllUserData(): void {
    try {
      localStorage.removeItem(this.getScopedStorageKey());
      localStorage.removeItem('studyweb_profile_daily_goal');
    } catch {}
    this.activeUserId = null;
    try {
      localStorage.removeItem(this.getScopedStorageKey());
    } catch {}
    this.dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES;
    this.resetInMemoryStatsForDay(this.getTodayStr());
    this.broadcastUpdate();
  }

  /**
   * Ensures logged study time refreshes to 0 at the start of every new calendar day in the user's timezone.
   */
  private checkDailyRollover(): boolean {
    const todayStr = this.getTodayStr();
    if (this.memoryStats.lastActiveDate !== todayStr) {
      // Save yesterday's final summary into dailyHistory before resetting todaySeconds
      const prevDate = this.memoryStats.lastActiveDate;
      if (prevDate && this.memoryStats.todaySeconds > 0) {
        if (!this.memoryStats.dailyHistory) this.memoryStats.dailyHistory = {};
        const prevTarget =
          this.memoryStats.historicalTargets?.[prevDate] || this.dailyGoalMinutes;
        const wasQual = Boolean(this.memoryStats.completedRoutineDates?.includes(prevDate));
        this.memoryStats.dailyHistory[prevDate] = {
          date: prevDate,
          completedSeconds: this.memoryStats.todaySeconds,
          completedMinutes: Math.floor(this.memoryStats.todaySeconds / 60),
          targetMinutes: prevTarget,
          qualified: wasQual,
          celebratedAt: this.memoryStats.celebratedDates?.includes(prevDate)
            ? new Date().toISOString()
            : null,
        };
      }

      this.memoryStats.todaySeconds = 0;
      this.memoryStats.totalSeconds = 0;
      this.memoryStats.subjectSeconds = {};
      this.memoryStats.recentSessions = [];
      this.memoryStats.lastActiveDate = todayStr;
      if (!this.memoryStats.historicalTargets) this.memoryStats.historicalTargets = {};
      if (!this.memoryStats.historicalTargets[todayStr]) {
        this.memoryStats.historicalTargets[todayStr] = this.dailyGoalMinutes;
      }
      if (!this.memoryStats.studyDates.includes(todayStr)) {
        this.memoryStats.studyDates = [...this.memoryStats.studyDates, todayStr].slice(-90);
      }
      const { streak } = calculateConsecutiveStreak(
        this.memoryStats.completedRoutineDates || [],
        todayStr
      );
      this.memoryStats.currentStreak = streak;
      return true;
    }
    return false;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.activeUserId) {
      headers['x-studyweb-user-id'] = this.activeUserId;
    }
    if (supabase) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        if (session?.user?.id && !headers['x-studyweb-user-id']) {
          headers['x-studyweb-user-id'] = session.user.id;
        }
      } catch {}
    }
    return headers;
  }

  public async syncStatusFromServer(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const headers = await this.getAuthHeaders();
      const tz = encodeURIComponent(this.getTimezone());
      const res = await fetch(`/api/streaks/status?timezone=${tz}`, {
        method: 'GET',
        headers,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.streak) {
        this.mergeServerStreakPayload(data.streak);
      }
    } catch {}
  }

  private mergeServerStreakPayload(serverStreak: any): void {
    if (!serverStreak) return;
    const todayStr = this.getTodayStr();

    const savedLocalGoal = Number(localStorage.getItem('studyweb_profile_daily_goal'));
    const hasExplicitLocalGoal = Number.isFinite(savedLocalGoal) && savedLocalGoal >= 5;
    if (hasExplicitLocalGoal) {
      this.dailyGoalMinutes = Math.round(savedLocalGoal);
    } else if (Number(serverStreak.dailyGoalMinutes) >= 5) {
      this.dailyGoalMinutes = Math.round(Number(serverStreak.dailyGoalMinutes));
    }

    if (Number(serverStreak.todayCompletedSeconds) > this.memoryStats.todaySeconds) {
      this.memoryStats.todaySeconds = Number(serverStreak.todayCompletedSeconds);
      this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;
    }

    if (serverStreak.dailyLogs && typeof serverStreak.dailyLogs === 'object') {
      if (!this.memoryStats.dailyHistory) this.memoryStats.dailyHistory = {};
      if (!this.memoryStats.historicalTargets) this.memoryStats.historicalTargets = {};
      const completedSet = new Set(this.memoryStats.completedRoutineDates || []);

      for (const [dStr, log] of Object.entries<any>(serverStreak.dailyLogs)) {
        const existing = this.memoryStats.dailyHistory[dStr];
        const mergedSecs = Math.max(
          existing?.completedSeconds || 0,
          Number(log.completedSeconds) || 0
        );
        const qualified = Boolean(existing?.qualified || log.qualified);
        const targetMins =
          dStr === todayStr && !qualified
            ? this.dailyGoalMinutes
            : existing?.targetMinutes ||
              Number(log.qualifyingTargetMinutes) ||
              this.dailyGoalMinutes;

        this.memoryStats.historicalTargets[dStr] = targetMins;
        this.memoryStats.dailyHistory[dStr] = {
          date: dStr,
          completedSeconds: mergedSecs,
          completedMinutes: Math.floor(mergedSecs / 60),
          targetMinutes: targetMins,
          qualified,
          qualifiedAt: existing?.qualifiedAt || log.qualifiedAt || null,
          celebratedAt: existing?.celebratedAt || log.celebratedAt || null,
        };
        if (qualified) {
          completedSet.add(dStr);
        }
      }
      this.memoryStats.completedRoutineDates = Array.from(completedSet).sort().slice(-120);
    }

    const { streak } = calculateConsecutiveStreak(
      this.memoryStats.completedRoutineDates || [],
      todayStr
    );
    this.memoryStats.currentStreak = streak;
    const { longestStreak, longestStreakDate } = computeLongestRun(
      this.memoryStats.completedRoutineDates || [],
      Math.max(this.memoryStats.longestStreak, Number(serverStreak.longestStreak) || 0),
      this.memoryStats.longestStreakDate || serverStreak.longestStreakDate || null
    );
    this.memoryStats.longestStreak = Math.max(longestStreak, streak);
    this.memoryStats.longestStreakDate = longestStreakDate;

    this.persistLocalStreakSnapshot();
    this.broadcastUpdate();
  }

  private async flushHeartbeatToServer(isManualSession = false, manualSeconds = 0): Promise<void> {
    if (typeof window === 'undefined') return;
    const secondsToSend = isManualSession ? manualSeconds : this.pendingServerHeartbeatSeconds;
    if (secondsToSend <= 0) return;

    if (!isManualSession) {
      this.pendingServerHeartbeatSeconds = 0;
      this.lastServerHeartbeatAt = Date.now();
    }

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/streaks/heartbeat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: this.sessionId,
          durationSeconds: secondsToSend,
          isManualSession,
          activityType: this.activeActivityType,
          subject: this.resolveCurrentSubject(),
          timezone: this.getTimezone(),
          completedDates: this.memoryStats.completedRoutineDates || [],
          historicalTargets: this.memoryStats.historicalTargets || {},
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.streak) {
          this.mergeServerStreakPayload(data.streak);
        }
      }
    } catch {}
  }

  private async syncSettingsToServer(settings: {
    dailyGoalMinutes?: number;
    soundEnabled?: boolean;
    animationsEnabled?: boolean;
    timezone?: string;
  }): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const headers = await this.getAuthHeaders();
      await fetch('/api/streaks/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(settings),
      });
    } catch {}
  }

  private async acknowledgeCelebrationOnServer(dateStr: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const headers = await this.getAuthHeaders();
      await fetch('/api/streaks/acknowledge-celebration', {
        method: 'POST',
        headers,
        body: JSON.stringify({ date: dateStr }),
      });
    } catch {}
  }

  public async reconcileWithSupabase(): Promise<void> {
    if (!supabase) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      this.activeUserId = uid;
      this.hydrateFromLocalStreakSnapshot();

      const todayStr = this.getTodayStr();
      const meta = session.user.user_metadata || {};
      const metaStats = meta.study_stats || {};

      const savedLocalGoal = Number(localStorage.getItem('studyweb_profile_daily_goal'));
      const hasExplicitLocalGoal = Number.isFinite(savedLocalGoal) && savedLocalGoal >= 5;

      if (hasExplicitLocalGoal) {
        this.dailyGoalMinutes = Math.round(savedLocalGoal);
      } else if (
        Number.isFinite(Number(meta.daily_goal_minutes)) &&
        Number(meta.daily_goal_minutes) >= 5
      ) {
        this.dailyGoalMinutes = Math.round(Number(meta.daily_goal_minutes));
      } else if (
        Number.isFinite(Number(metaStats.dailyGoalMinutes)) &&
        Number(metaStats.dailyGoalMinutes) >= 5
      ) {
        this.dailyGoalMinutes = Math.round(Number(metaStats.dailyGoalMinutes));
      }

      if (typeof metaStats.soundEnabled === 'boolean') {
        this.memoryStats.soundEnabled = metaStats.soundEnabled;
      }
      if (typeof metaStats.animationsEnabled === 'boolean') {
        this.memoryStats.animationsEnabled = metaStats.animationsEnabled;
      }
      if (typeof metaStats.timezone === 'string' && metaStats.timezone) {
        this.memoryStats.timezone = metaStats.timezone;
      }

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('study_hours, streak, updated_at')
        .eq('id', uid)
        .maybeSingle();

      const remoteLastDate =
        typeof metaStats.lastActiveDate === 'string' ? metaStats.lastActiveDate : '';
      const isSameDayAsMeta = remoteLastDate === todayStr;

      let remoteProfileUpdatedToday = false;
      if (profileRow?.updated_at) {
        const updatedDate = new Date(profileRow.updated_at);
        if (!isNaN(updatedDate.getTime())) {
          remoteProfileUpdatedToday =
            getLocalDateString(updatedDate, this.memoryStats.timezone) === todayStr;
        }
      }

      let restoredTodaySeconds = 0;
      if (isSameDayAsMeta && Number.isFinite(Number(metaStats.todaySeconds))) {
        restoredTodaySeconds = Math.max(0, Number(metaStats.todaySeconds));
      } else if (remoteProfileUpdatedToday && Number.isFinite(Number(profileRow?.study_hours))) {
        restoredTodaySeconds = Math.max(0, Math.round(Number(profileRow?.study_hours) * 3600));
      }

      this.memoryStats.todaySeconds = Math.max(
        this.memoryStats.todaySeconds,
        restoredTodaySeconds
      );
      this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;
      this.memoryStats.lastActiveDate = todayStr;

      if (metaStats.historicalTargets && typeof metaStats.historicalTargets === 'object') {
        this.memoryStats.historicalTargets = {
          ...metaStats.historicalTargets,
          ...(this.memoryStats.historicalTargets || {}),
        };
      }
      if (!this.memoryStats.historicalTargets) {
        this.memoryStats.historicalTargets = {};
      }
      if (!this.memoryStats.historicalTargets[todayStr]) {
        this.memoryStats.historicalTargets[todayStr] = this.dailyGoalMinutes;
      }

      if (Array.isArray(metaStats.celebratedDates)) {
        const mergedCel = new Set([
          ...(this.memoryStats.celebratedDates || []),
          ...metaStats.celebratedDates.filter((d: any) => typeof d === 'string'),
        ]);
        this.memoryStats.celebratedDates = Array.from(mergedCel).slice(-60);
      }

      let completedList: string[] = Array.from(
        new Set([
          ...(this.memoryStats.completedRoutineDates || []),
          ...(Array.isArray(metaStats.completedRoutineDates)
            ? metaStats.completedRoutineDates.filter((d: any) => typeof d === 'string')
            : []),
        ])
      );

      const savedProfileStreak = Math.max(0, Number(profileRow?.streak) || 0);
      if (savedProfileStreak > 0 && completedList.length === 0) {
        const reconstructed: string[] = [];
        const todayTarget =
          this.memoryStats.historicalTargets[todayStr] || this.dailyGoalMinutes;
        const todayMinutesNow = Math.floor(this.memoryStats.todaySeconds / 60);
        const includeToday = todayMinutesNow >= todayTarget;
        let cursor = includeToday ? todayStr : getPreviousDateString(todayStr);
        for (let i = 0; i < savedProfileStreak; i++) {
          reconstructed.push(cursor);
          cursor = getPreviousDateString(cursor);
        }
        completedList = reconstructed.sort();
      }

      // Enforce today's target check (while strictly preserving all historical dates!)
      const todayTarget =
        this.memoryStats.historicalTargets[todayStr] || this.dailyGoalMinutes;
      const todayMinutes = Math.floor(this.memoryStats.todaySeconds / 60);
      if (todayMinutes < todayTarget && completedList.includes(todayStr)) {
        completedList = completedList.filter((d) => d !== todayStr);
      } else if (todayMinutes >= todayTarget && !completedList.includes(todayStr)) {
        completedList.push(todayStr);
      }

      this.memoryStats.completedRoutineDates = Array.from(new Set(completedList))
        .sort()
        .slice(-120);

      // Populate dailyHistory entries for all completed dates
      if (!this.memoryStats.dailyHistory) this.memoryStats.dailyHistory = {};
      for (const dStr of this.memoryStats.completedRoutineDates) {
        const tMins =
          this.memoryStats.historicalTargets[dStr] || this.dailyGoalMinutes;
        const existingEntry = this.memoryStats.dailyHistory[dStr];
        const secs =
          dStr === todayStr
            ? Math.max(this.memoryStats.todaySeconds, tMins * 60)
            : Math.max(existingEntry?.completedSeconds || 0, tMins * 60);
        this.memoryStats.dailyHistory[dStr] = {
          date: dStr,
          completedSeconds: secs,
          completedMinutes: Math.floor(secs / 60),
          targetMinutes: tMins,
          qualified: true,
          qualifiedAt: existingEntry?.qualifiedAt || new Date().toISOString(),
          celebratedAt: existingEntry?.celebratedAt || null,
        };
      }

      if (
        isSameDayAsMeta &&
        metaStats.subjectSeconds &&
        typeof metaStats.subjectSeconds === 'object'
      ) {
        this.memoryStats.subjectSeconds = {
          ...metaStats.subjectSeconds,
          ...this.memoryStats.subjectSeconds,
        };
      }

      const { streak } = calculateConsecutiveStreak(
        this.memoryStats.completedRoutineDates,
        todayStr
      );
      this.memoryStats.currentStreak = streak;

      const { longestStreak, longestStreakDate } = computeLongestRun(
        this.memoryStats.completedRoutineDates,
        Math.max(
          this.memoryStats.longestStreak,
          Number(metaStats.longestStreak) || 0,
          savedProfileStreak
        ),
        this.memoryStats.longestStreakDate || metaStats.longestStreakDate || null
      );
      this.memoryStats.longestStreak = Math.max(longestStreak, streak);
      this.memoryStats.longestStreakDate = longestStreakDate;

      this.persistLocalStreakSnapshot();
      this.broadcastUpdate();
    } catch (err) {
      console.warn('[StudyTrackerService] Supabase reconciliation notice:', err);
    }
  }

  /**
   * Evaluates whether today's logged study time has reached today's qualifying target.
   * Only when todayMinutes >= todayTarget does today's streak become completed (+1)
   * and dispatch 'studyweb-daily-routine-completed' (if not yet celebrated today).
   */
  private evaluateDailyRoutineStreak(emitCelebrationEvent = true): boolean {
    this.checkDailyRollover();
    const todayStr = this.getTodayStr();

    const completedList = Array.isArray(this.memoryStats.completedRoutineDates)
      ? [...this.memoryStats.completedRoutineDates]
      : [];

    if (!this.memoryStats.historicalTargets) {
      this.memoryStats.historicalTargets = {};
    }
    const todayTargetMins =
      this.memoryStats.historicalTargets[todayStr] || this.getDailyGoalMinutes();
    this.memoryStats.historicalTargets[todayStr] = todayTargetMins;

    const wasCompletedToday = completedList.includes(todayStr);
    const todayMins = Math.floor(this.memoryStats.todaySeconds / 60);
    const isNowCompletedToday = todayMins >= todayTargetMins;

    let newlyCompleted = false;
    if (isNowCompletedToday && !wasCompletedToday) {
      completedList.push(todayStr);
      completedList.sort();
      newlyCompleted = true;
    } else if (!isNowCompletedToday && wasCompletedToday) {
      const idx = completedList.indexOf(todayStr);
      if (idx !== -1) completedList.splice(idx, 1);
    }

    this.memoryStats.completedRoutineDates = Array.from(new Set(completedList)).slice(-120);
    const { streak, priorCompletedDays } = calculateConsecutiveStreak(
      this.memoryStats.completedRoutineDates,
      todayStr
    );
    this.memoryStats.currentStreak = streak;
    this.memoryStats.lastActiveDate = todayStr;
    this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;

    const { longestStreak, longestStreakDate } = computeLongestRun(
      this.memoryStats.completedRoutineDates,
      this.memoryStats.longestStreak,
      this.memoryStats.longestStreakDate
    );
    this.memoryStats.longestStreak = Math.max(longestStreak, streak);
    this.memoryStats.longestStreakDate =
      streak >= longestStreak && streak > 0 ? todayStr : longestStreakDate;

    // Update today's entry in dailyHistory
    if (!this.memoryStats.dailyHistory) this.memoryStats.dailyHistory = {};
    const existingToday = this.memoryStats.dailyHistory[todayStr];
    this.memoryStats.dailyHistory[todayStr] = {
      date: todayStr,
      completedSeconds: this.memoryStats.todaySeconds,
      completedMinutes: todayMins,
      targetMinutes: todayTargetMins,
      qualified: isNowCompletedToday,
      qualifiedAt:
        existingToday?.qualifiedAt ||
        (isNowCompletedToday ? new Date().toISOString() : null),
      celebratedAt: existingToday?.celebratedAt || null,
    };

    this.persistLocalStreakSnapshot();

    const alreadyCelebratedToday = this.hasCelebratedToday();
    if (newlyCompleted && emitCelebrationEvent && !alreadyCelebratedToday && typeof window !== 'undefined') {
      this.acknowledgeCelebrationForToday();
      window.dispatchEvent(
        new CustomEvent('studyweb-daily-routine-completed', {
          detail: {
            previousStreak: priorCompletedDays,
            streak,
            todayMinutes: todayMins,
            dailyGoalMinutes: todayTargetMins,
            reason: `You completed today's ${todayTargetMins}-minute study goal.`,
          },
        })
      );
    }

    return newlyCompleted;
  }

  private tickStudySession(): void {
    if (typeof window === 'undefined') return;

    const rolledOver = this.checkDailyRollover();
    if (rolledOver) {
      this.persistLocalStreakSnapshot();
      this.syncToSupabase(true);
      this.broadcastUpdate();
    }

    const now = Date.now();
    const idleSeconds = (now - this.lastUserInteraction) / 1000;
    const isVisible = document.visibilityState === 'visible';
    const anotherTabTickedRecently = now - this.lastCrossTabTickAt < 1500;

    // Genuine active study time: visible tab, interacted within last 90 seconds, no duplicate tab ticking
    const isUserStudying = isVisible && idleSeconds <= 90 && !anotherTabTickedRecently;
    this.isLiveActive = isUserStudying;
    this.memoryStats.isStudyingLive = isUserStudying;

    if (isUserStudying) {
      this.memoryStats.todaySeconds += 1;
      this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;
      this.memoryStats.lastHeartbeat = now;
      this.pendingServerHeartbeatSeconds += 1;

      const currentSubj = this.resolveCurrentSubject();
      this.memoryStats.subjectSeconds[currentSubj] =
        (this.memoryStats.subjectSeconds[currentSubj] || 0) + 1;

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'TAB_TICK',
            sessionId: this.sessionId,
            todaySeconds: this.memoryStats.todaySeconds,
          });
        } catch {}
      }

      const newlyCompleted = this.evaluateDailyRoutineStreak(true);

      if (newlyCompleted) {
        this.flushHeartbeatToServer();
        this.syncToSupabase(true);
      } else {
        if (this.pendingServerHeartbeatSeconds >= 30 || now - this.lastServerHeartbeatAt >= 30_000) {
          this.flushHeartbeatToServer();
        }
        if (this.memoryStats.todaySeconds % 60 === 0) {
          this.persistLocalStreakSnapshot();
          this.syncToSupabase(false);
        }
      }
    }

    this.broadcastUpdate();
  }

  public addActiveStudySeconds(seconds: number, subjectName?: string): void {
    if (seconds <= 0) return;
    this.checkDailyRollover();
    const subj = (subjectName && subjectName.trim()) || this.resolveCurrentSubject();
    this.memoryStats.todaySeconds += seconds;
    this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;
    this.memoryStats.subjectSeconds[subj] =
      (this.memoryStats.subjectSeconds[subj] || 0) + seconds;
    this.pendingServerHeartbeatSeconds += seconds;
    const newlyCompleted = this.evaluateDailyRoutineStreak(true);
    this.flushHeartbeatToServer();
    if (newlyCompleted) {
      this.syncToSupabase(true);
    }
    this.broadcastUpdate();
  }

  public logManualStudySession(
    minutes: number,
    subjectName: string,
    note?: string
  ): { newlyCompletedRoutine: boolean; currentStreak: number } {
    this.checkDailyRollover();
    const cleanMins = Math.max(1, Math.min(720, Math.round(Number(minutes) || 0)));
    const cleanSubject = (subjectName || '').trim() || this.resolveCurrentSubject();
    const addedSeconds = cleanMins * 60;

    this.memoryStats.todaySeconds += addedSeconds;
    this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;
    this.memoryStats.subjectSeconds[cleanSubject] =
      (this.memoryStats.subjectSeconds[cleanSubject] || 0) + addedSeconds;

    const sessionItem: StudySessionLogItem = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject: cleanSubject,
      minutes: cleanMins,
      date: new Date().toISOString(),
      note: note?.trim() || undefined,
      activityType: this.activeActivityType,
    };

    this.memoryStats.recentSessions = [
      sessionItem,
      ...(this.memoryStats.recentSessions || []),
    ].slice(0, 10);
    const newlyCompletedRoutine = this.evaluateDailyRoutineStreak(true);
    this.flushHeartbeatToServer(true, addedSeconds);
    this.syncToSupabase(true);
    this.broadcastUpdate();
    return { newlyCompletedRoutine, currentStreak: this.memoryStats.currentStreak };
  }

  public recordStudyAction(
    type: 'tutor' | 'quiz' | 'flashcard' | 'note' | 'workspace' | 'pdf' | 'study-session',
    subjectName?: string
  ): void {
    this.lastUserInteraction = Date.now();
    const mappedType =
      type === 'flashcard' ? 'flashcards' : type === 'note' ? 'notes' : type;
    this.activeActivityType = mappedType;
    this.memoryStats.activeActivityType = mappedType;
    if (subjectName) {
      this.setActiveSubject(subjectName);
    }
  }

  /**
   * Returns the 7 days of the current week (Monday to Sunday) formatted for the Dashboard Streak Card
   * and the Celebration Modal.
   */
  public getWeeklyStreakDays(): Array<{
    label: string;
    fullLabel: string;
    dateStr: string;
    dayNumber: number;
    completed: boolean;
    completedMinutes: number;
    targetMinutes: number;
    isToday: boolean;
    isFuture: boolean;
  }> {
    const now = new Date();
    const todayStr = this.getTodayStr();
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayLocal = new Date(ty, tm - 1, td);
    const dayOfWeek = todayLocal.getDay(); // 0 = Su .. 6 = Sa
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(ty, tm - 1, td + diffToMonday);
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const fullLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const completedSet = new Set(this.memoryStats.completedRoutineDates || []);

    return labels.map((label, idx) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
      const dStr = getLocalDateString(d);
      const isToday = dStr === todayStr;
      const histEntry = this.memoryStats.dailyHistory?.[dStr];
      const targetMins =
        this.memoryStats.historicalTargets?.[dStr] ||
        histEntry?.targetMinutes ||
        this.dailyGoalMinutes;
      const completedMins = isToday
        ? Math.floor(this.memoryStats.todaySeconds / 60)
        : histEntry?.completedMinutes || (completedSet.has(dStr) ? targetMins : 0);

      return {
        label,
        fullLabel: fullLabels[idx],
        dateStr: dStr,
        dayNumber: d.getDate(),
        completed: completedSet.has(dStr),
        completedMinutes: completedMins,
        targetMinutes: targetMins,
        isToday,
        isFuture: dStr > todayStr,
      };
    });
  }

  /**
   * Generates a complete monthly calendar grid for the Profile page Study Activity Calendar.
   */
  public getMonthlyCalendarDays(
    year?: number,
    monthZeroIndexed?: number
  ): {
    year: number;
    month: number;
    monthLabel: string;
    days: Array<{
      dateStr: string;
      dayNumber: number;
      inCurrentMonth: boolean;
      status: 'completed' | 'partial' | 'missed' | 'future';
      completedMinutes: number;
      targetMinutes: number;
      isToday: boolean;
    }>;
  } {
    const todayStr = this.getTodayStr();
    const [ty, tm] = todayStr.split('-').map(Number);
    const targetYear = year !== undefined ? year : ty;
    const targetMonth = monthZeroIndexed !== undefined ? monthZeroIndexed : tm - 1;

    const firstOfMonth = new Date(targetYear, targetMonth, 1);
    const lastOfMonth = new Date(targetYear, targetMonth + 1, 0);
    const monthLabel = firstOfMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // Monday-first grid alignment
    const startDow = firstOfMonth.getDay(); // 0=Sun..6=Sat
    const leadingDays = startDow === 0 ? 6 : startDow - 1;
    const totalDaysInMonth = lastOfMonth.getDate();
    const totalCells = Math.ceil((leadingDays + totalDaysInMonth) / 7) * 7;

    const completedSet = new Set(this.memoryStats.completedRoutineDates || []);
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      inCurrentMonth: boolean;
      status: 'completed' | 'partial' | 'missed' | 'future';
      completedMinutes: number;
      targetMinutes: number;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(targetYear, targetMonth, 1 - leadingDays + i);
      const dStr = getLocalDateString(cellDate);
      const inCurrentMonth = cellDate.getMonth() === targetMonth;
      const isToday = dStr === todayStr;
      const isFuture = dStr > todayStr;

      const histEntry = this.memoryStats.dailyHistory?.[dStr];
      const targetMinutes =
        this.memoryStats.historicalTargets?.[dStr] ||
        histEntry?.targetMinutes ||
        this.dailyGoalMinutes;
      const isQualified = completedSet.has(dStr) || Boolean(histEntry?.qualified);
      const completedMinutes = isToday
        ? Math.floor(this.memoryStats.todaySeconds / 60)
        : histEntry?.completedMinutes || (isQualified ? targetMinutes : 0);

      let status: 'completed' | 'partial' | 'missed' | 'future' = 'missed';
      if (isFuture) {
        status = 'future';
      } else if (isQualified) {
        status = 'completed';
      } else if (completedMinutes > 0) {
        status = 'partial';
      } else {
        status = 'missed';
      }

      days.push({
        dateStr: dStr,
        dayNumber: cellDate.getDate(),
        inCurrentMonth,
        status,
        completedMinutes,
        targetMinutes,
        isToday,
      });
    }

    return {
      year: targetYear,
      month: targetMonth,
      monthLabel,
      days,
    };
  }

  public getAchievements(): StreakAchievementBadge[] {
    const bestStreak = Math.max(
      this.memoryStats.longestStreak || 0,
      this.memoryStats.currentStreak || 0
    );
    const completedDates = (this.memoryStats.completedRoutineDates || []).slice().sort();

    return STREAK_ACHIEVEMENT_MILESTONES.map((milestone) => {
      const unlocked = bestStreak >= milestone.requiredDays;
      const progressPct = Math.min(
        100,
        Math.round((bestStreak / milestone.requiredDays) * 100)
      );
      let unlockedAt: string | null = null;
      if (unlocked) {
        unlockedAt =
          completedDates[Math.min(completedDates.length - 1, milestone.requiredDays - 1)] ||
          this.memoryStats.longestStreakDate ||
          this.getTodayStr();
      }
      return {
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        requiredDays: milestone.requiredDays,
        unlocked,
        unlockedAt,
        progressPct,
      };
    });
  }

  public getStudyStatistics(): StudyStreakStatistics {
    const todayStr = this.getTodayStr();
    const currentYearMonth = todayStr.slice(0, 7);
    const completedSet = new Set(this.memoryStats.completedRoutineDates || []);
    const historyMap = { ...(this.memoryStats.dailyHistory || {}) };

    // Ensure all completed dates and today are represented
    for (const dStr of completedSet) {
      const tMins =
        this.memoryStats.historicalTargets?.[dStr] || this.dailyGoalMinutes;
      if (!historyMap[dStr]) {
        historyMap[dStr] = {
          date: dStr,
          completedSeconds: tMins * 60,
          completedMinutes: tMins,
          targetMinutes: tMins,
          qualified: true,
        };
      }
    }

    const todayTarget =
      this.memoryStats.historicalTargets?.[todayStr] || this.dailyGoalMinutes;
    historyMap[todayStr] = {
      date: todayStr,
      completedSeconds: this.memoryStats.todaySeconds,
      completedMinutes: Math.floor(this.memoryStats.todaySeconds / 60),
      targetMinutes: todayTarget,
      qualified: completedSet.has(todayStr),
    };

    const entries = Object.values(historyMap);
    const activeEntries = entries.filter(
      (e) => e.completedMinutes > 0 || e.qualified
    );
    const totalStudyDays = activeEntries.length;
    const totalSecondsAllTime = activeEntries.reduce(
      (sum, e) => sum + (e.completedSeconds || e.completedMinutes * 60),
      0
    );
    const totalStudyMinutes = Math.round(totalSecondsAllTime / 60);
    const totalStudyHours = Number((totalSecondsAllTime / 3600).toFixed(1));
    const dailyAverageMinutes =
      totalStudyDays > 0 ? Math.round(totalStudyMinutes / totalStudyDays) : 0;
    const monthlyCompletedGoals = Array.from(completedSet).filter((d) =>
      d.startsWith(currentYearMonth)
    ).length;

    return {
      totalStudyDays,
      currentStreak: this.memoryStats.currentStreak,
      longestStreak: Math.max(
        this.memoryStats.longestStreak,
        this.memoryStats.currentStreak
      ),
      longestStreakDate: this.memoryStats.longestStreakDate,
      totalStudyHours,
      totalStudyMinutes,
      dailyAverageMinutes,
      monthlyCompletedGoals,
    };
  }

  /**
   * Manually checks in today's study routine / streak.
   */
  public checkInToday(): { streak: number; activeToday: boolean } {
    this.checkDailyRollover();
    const todayStr = this.getTodayStr();
    const completedList = Array.isArray(this.memoryStats.completedRoutineDates)
      ? [...this.memoryStats.completedRoutineDates]
      : [];

    const todayTargetMins =
      this.memoryStats.historicalTargets?.[todayStr] || this.getDailyGoalMinutes();

    if (!completedList.includes(todayStr)) {
      completedList.push(todayStr);
      completedList.sort();
      this.memoryStats.completedRoutineDates = completedList.slice(-120);
      const goalSecs = todayTargetMins * 60;
      if (this.memoryStats.todaySeconds < goalSecs) {
        this.memoryStats.todaySeconds = goalSecs;
        this.memoryStats.totalSeconds = goalSecs;
      }
    }

    const wasAlreadyCelebrated = this.hasCelebratedToday();
    const { streak, activeToday, priorCompletedDays } = calculateConsecutiveStreak(
      this.memoryStats.completedRoutineDates,
      todayStr
    );
    this.memoryStats.currentStreak = streak;
    const { longestStreak, longestStreakDate } = computeLongestRun(
      this.memoryStats.completedRoutineDates,
      this.memoryStats.longestStreak,
      this.memoryStats.longestStreakDate
    );
    this.memoryStats.longestStreak = Math.max(longestStreak, streak);
    this.memoryStats.longestStreakDate =
      streak >= longestStreak ? todayStr : longestStreakDate;
    this.memoryStats.lastActiveDate = todayStr;

    this.acknowledgeCelebrationForToday();
    this.persistLocalStreakSnapshot();
    this.flushHeartbeatToServer(true, todayTargetMins * 60);
    this.syncToSupabase(true);
    this.broadcastUpdate();

    if (!wasAlreadyCelebrated && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('studyweb-daily-routine-completed', {
          detail: {
            previousStreak: priorCompletedDays,
            streak,
            todayMinutes: Math.floor(this.memoryStats.todaySeconds / 60),
            dailyGoalMinutes: todayTargetMins,
            reason: `You completed today's ${todayTargetMins}-minute study goal.`,
          },
        })
      );
    }

    return { streak, activeToday };
  }

  private async syncToSupabase(isMilestone = false): Promise<void> {
    if (!supabase || this.isSyncingSupabase) return;
    this.isSyncingSupabase = true;
    try {
      let uid = this.activeUserId;
      if (!uid) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        uid = session?.user?.id || null;
        this.activeUserId = uid;
      }
      if (!uid) return;

      const todayHoursLogged =
        Math.round((this.memoryStats.todaySeconds / 3600) * 100) / 100;
      const streakVal = this.memoryStats.currentStreak;

      await supabase
        .from('profiles')
        .update({
          study_hours: todayHoursLogged,
          streak: streakVal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uid);

      const now = Date.now();
      if (isMilestone || now - this.lastAuthMetaSyncAt >= 180_000) {
        this.lastAuthMetaSyncAt = now;
        await supabase.auth.updateUser({
          data: {
            daily_goal_minutes: this.dailyGoalMinutes,
            study_stats: {
              todaySeconds: this.memoryStats.todaySeconds,
              currentStreak: this.memoryStats.currentStreak,
              longestStreak: this.memoryStats.longestStreak,
              longestStreakDate: this.memoryStats.longestStreakDate,
              dailyGoalMinutes: this.dailyGoalMinutes,
              completedRoutineDates: (
                this.memoryStats.completedRoutineDates || []
              ).slice(-30),
              celebratedDates: (this.memoryStats.celebratedDates || []).slice(-14),
              historicalTargets: this.memoryStats.historicalTargets || {},
              soundEnabled: this.memoryStats.soundEnabled,
              animationsEnabled: this.memoryStats.animationsEnabled,
              timezone: this.memoryStats.timezone,
              lastActiveDate: this.memoryStats.lastActiveDate,
            },
          },
        });
      }
    } catch (err) {
      console.debug('[StudyTrackerService] Supabase sync notice:', err);
    } finally {
      this.isSyncingSupabase = false;
    }
  }

  private broadcastUpdate(): void {
    if (typeof window === 'undefined') return;
    const formatted = this.getFormattedStats();
    window.dispatchEvent(
      new CustomEvent('studyweb-study-stats-updated', { detail: formatted })
    );
  }

  public getFormattedStats(): FormattedStudyStats {
    this.checkDailyRollover();
    const todaySec = Math.max(0, this.memoryStats.todaySeconds);
    const hoursNum = todaySec / 3600;

    let studyHoursFormatted = '0.0';
    if (todaySec >= 60 && hoursNum < 0.1) {
      studyHoursFormatted = '0.1';
    } else if (todaySec >= 60) {
      studyHoursFormatted = hoursNum.toFixed(1);
    }

    const todayMinutes = Math.floor(todaySec / 60);
    const todayStr = this.getTodayStr();
    const completedList = this.memoryStats.completedRoutineDates || [];
    const { streak, activeToday } = calculateConsecutiveStreak(
      completedList,
      todayStr
    );
    const goalMins = this.getDailyGoalMinutes();
    const todayTargetMinutes =
      this.memoryStats.historicalTargets?.[todayStr] || goalMins;

    const remainingMinutes = Math.max(0, todayTargetMinutes - todayMinutes);
    const progressPercentage =
      todayTargetMinutes > 0
        ? Math.min(100, Math.round((todayMinutes / todayTargetMinutes) * 100))
        : 0;

    const streakBadgeText = activeToday
      ? `Today's ${todayTargetMinutes}m Goal Completed (+1 Streak!)`
      : `Study ${remainingMinutes}m more today for +1 streak`;

    const rawSubjects = this.memoryStats.subjectSeconds || {};
    const subjectEntries = Object.entries(rawSubjects)
      .filter(([, secs]) => Number(secs) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]));

    const sumSubjectSecs =
      subjectEntries.reduce((acc, [, s]) => acc + Number(s), 0) || 1;
    const subjectBreakdown = subjectEntries.slice(0, 6).map(([subject, secs]) => {
      const mins = Math.max(1, Math.round(Number(secs) / 60));
      const hrs = (Number(secs) / 3600).toFixed(1);
      const percentage = Math.min(
        100,
        Math.max(4, Math.round((Number(secs) / sumSubjectSecs) * 100))
      );
      return { subject, minutes: mins, hours: hrs, percentage };
    });

    const longestStreak = Math.max(
      this.memoryStats.longestStreak || 0,
      streak
    );

    return {
      ...this.memoryStats,
      totalSeconds: todaySec,
      todaySeconds: todaySec,
      currentStreak: streak,
      longestStreak,
      studyHoursFormatted,
      studyHoursNumber: Number(studyHoursFormatted),
      todayMinutes,
      remainingMinutes,
      dailyGoalMinutes: goalMins,
      todayTargetMinutes,
      progressPercentage,
      streakBadgeText,
      activeToday,
      celebratedToday: this.hasCelebratedToday(),
      subjectBreakdown,
      achievements: this.getAchievements(),
      statistics: this.getStudyStatistics(),
    };
  }
}

// Global Singleton
export const StudyTrackerService = new StudyTrackerManager();
