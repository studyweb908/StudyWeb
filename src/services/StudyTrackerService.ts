/**
 * StudyTrackerService
 *
 * Personalized real-time daily study time logging, subject breakdown, and daily streak tracker for StudyWeb.
 * - Zero localStorage usage: all state is held in memory and persisted strictly to Supabase.
 * - Daily logged time refreshes to 0 every new calendar day (YYYY-MM-DD).
 * - Today's streak increments (+1) strictly when today's logged study time reaches dailyGoalMinutes.
 * - Compact user_metadata payload & throttled Auth writes prevent HTTP 400 JWT bloat and HTTP 429 rate limits.
 */

import { supabase } from '../lib/supabase';

export interface StudySessionLogItem {
  id: string;
  subject: string;
  minutes: number;
  date: string; // ISO timestamp
  note?: string;
}

export interface StudyStats {
  totalSeconds: number;                   // Today's seconds studied (refreshed daily)
  todaySeconds: number;                   // Seconds studied on the current calendar day
  currentStreak: number;                  // Consecutive calendar days streak (0 until first daily goal completed)
  studyDates: string[];                   // Unique YYYY-MM-DD local dates (capped to last 14)
  lastActiveDate: string;                 // YYYY-MM-DD of current day
  lastHeartbeat: number;                  // Epoch ms of last active tick
  isStudyingLive: boolean;                // Whether user is actively interacting now
  subjectSeconds: Record<string, number>; // Seconds studied per subject today
  recentSessions: StudySessionLogItem[];  // Today's logged study sessions
  completedRoutineDates?: string[];       // YYYY-MM-DD dates when daily study time goal was completed
}

export interface FormattedStudyStats extends StudyStats {
  studyHoursFormatted: string; // Today's logged hours formatted, e.g. "0.5"
  studyHoursNumber: number;    // Today's logged hours number, e.g. 0.5
  todayMinutes: number;        // Today's logged minutes, e.g. 30
  dailyGoalMinutes: number;    // Target daily study goal in minutes
  streakBadgeText: string;     // Status label
  activeToday: boolean;        // True ONLY when todayMinutes >= dailyGoalMinutes
  subjectBreakdown: Array<{ subject: string; minutes: number; hours: string; percentage: number }>;
}

// Helper: Formats a local date to YYYY-MM-DD (safe against UTC timezone shifts)
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Computes the previous day in local YYYY-MM-DD format
export function getPreviousDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return getLocalDateString(date);
}

/**
 * Pure consecutive streak calculation:
 * - Does NOT start at 1 on login. Starts at 0 if no days were completed.
 * - Counts consecutive completed days prior to today (yesterday, day before yesterday, etc.).
 * - Adds +1 ONLY when today's daily study goal is completed (routineDoneToday === true).
 */
export function calculateConsecutiveStreak(
  completedRoutineDates: string[],
  todayStr: string
): { streak: number; activeToday: boolean; priorCompletedDays: number } {
  const dateSet = new Set(completedRoutineDates || []);
  const routineDoneToday = dateSet.has(todayStr);

  // Count consecutive completed days immediately preceding today
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
    priorCompletedDays
  };
}

class StudyTrackerManager {
  private activeUserId: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastUserInteraction: number = Date.now();
  private isLiveActive: boolean = true;
  private initialized: boolean = false;
  private activeSubjectLabel: string = 'General Study';
  private dailyGoalMinutes: number = 45;
  private lastAuthMetaSyncAt: number = 0;
  private isSyncingSupabase: boolean = false;

  private memoryStats: StudyStats = {
    totalSeconds: 0,
    todaySeconds: 0,
    currentStreak: 0,
    studyDates: [getLocalDateString()],
    completedRoutineDates: [],
    lastActiveDate: getLocalDateString(),
    lastHeartbeat: Date.now(),
    isStudyingLive: false,
    subjectSeconds: {},
    recentSessions: []
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public getDailyGoalMinutes(): number {
    return this.dailyGoalMinutes || 45;
  }

  public setDailyGoalMinutes(mins: number): void {
    const clean = Math.max(1, Math.min(720, Math.round(Number(mins) || 45)));
    this.dailyGoalMinutes = clean;
    this.evaluateDailyRoutineStreak();
    this.syncToSupabase(true);
    this.broadcastUpdate();
  }

  private resolveCurrentSubject(): string {
    return this.activeSubjectLabel || 'General Study';
  }

  public setActiveSubject(subjectName: string): void {
    if (subjectName && subjectName.trim()) {
      this.activeSubjectLabel = subjectName.trim();
    }
  }

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.reconcileWithSupabase();

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
        this.dailyGoalMinutes = Math.max(1, Math.min(720, Math.round(Number(detail.dailyGoalMinutes))));
      }
      this.evaluateDailyRoutineStreak();
      this.broadcastUpdate();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onActivity();
        this.checkDailyRollover();
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
            this.resetInMemoryStatsForDay(getLocalDateString());
            this.broadcastUpdate();
          } else {
            this.reconcileWithSupabase();
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
      studyDates: [todayStr],
      completedRoutineDates: [],
      lastActiveDate: todayStr,
      lastHeartbeat: Date.now(),
      isStudyingLive: true,
      subjectSeconds: {},
      recentSessions: []
    };
  }

  /**
   * Ensures logged study time refreshes to 0 at the start of every new calendar day.
   */
  private checkDailyRollover(): boolean {
    const todayStr = getLocalDateString();
    if (this.memoryStats.lastActiveDate !== todayStr) {
      this.memoryStats.todaySeconds = 0;
      this.memoryStats.totalSeconds = 0;
      this.memoryStats.subjectSeconds = {};
      this.memoryStats.recentSessions = [];
      this.memoryStats.lastActiveDate = todayStr;
      if (!this.memoryStats.studyDates.includes(todayStr)) {
        this.memoryStats.studyDates = [...this.memoryStats.studyDates, todayStr].slice(-14);
      }
      const { streak } = calculateConsecutiveStreak(this.memoryStats.completedRoutineDates || [], todayStr);
      this.memoryStats.currentStreak = streak;
      return true;
    }
    return false;
  }

  public async reconcileWithSupabase(): Promise<void> {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      this.activeUserId = uid;

      const todayStr = getLocalDateString();
      const meta = session.user.user_metadata || {};
      const metaStats = meta.study_stats || {};

      if (Number.isFinite(Number(meta.daily_goal_minutes)) && Number(meta.daily_goal_minutes) >= 5) {
        this.dailyGoalMinutes = Math.round(Number(meta.daily_goal_minutes));
      } else if (Number.isFinite(Number(metaStats.dailyGoalMinutes)) && Number(metaStats.dailyGoalMinutes) >= 5) {
        this.dailyGoalMinutes = Math.round(Number(metaStats.dailyGoalMinutes));
      }

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('study_hours, streak, updated_at')
        .eq('id', uid)
        .maybeSingle();

      // Determine if the remote profile/meta was updated today (local calendar day)
      const remoteLastDate = typeof metaStats.lastActiveDate === 'string' ? metaStats.lastActiveDate : '';
      const isSameDayAsMeta = remoteLastDate === todayStr;

      let remoteProfileUpdatedToday = false;
      if (profileRow?.updated_at) {
        const updatedDate = new Date(profileRow.updated_at);
        if (!isNaN(updatedDate.getTime())) {
          remoteProfileUpdatedToday = getLocalDateString(updatedDate) === todayStr;
        }
      }

      // Daily refresh rule: ONLY restore todaySeconds if it was recorded on todayStr!
      // Any study hours from previous days are NOT carried into today's logged time.
      let restoredTodaySeconds = 0;
      if (isSameDayAsMeta && Number.isFinite(Number(metaStats.todaySeconds))) {
        restoredTodaySeconds = Math.max(0, Number(metaStats.todaySeconds));
      } else if (remoteProfileUpdatedToday && Number.isFinite(Number(profileRow?.study_hours))) {
        restoredTodaySeconds = Math.max(0, Math.round(Number(profileRow?.study_hours) * 3600));
      }

      this.memoryStats.todaySeconds = Math.max(this.memoryStats.todaySeconds, restoredTodaySeconds);
      this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;
      this.memoryStats.lastActiveDate = todayStr;

      // Reconcile completedRoutineDates from Supabase metadata
      let completedList: string[] = Array.isArray(metaStats.completedRoutineDates)
        ? metaStats.completedRoutineDates.filter((d: any) => typeof d === 'string')
        : [];

      // If the profiles table has a saved positive streak from prior days, ensure completedRoutineDates reflects those consecutive prior days
      const savedProfileStreak = Math.max(0, Number(profileRow?.streak) || 0);
      if (savedProfileStreak > 0 && completedList.length === 0) {
        const reconstructed: string[] = [];
        const todayMinutesNow = Math.floor(this.memoryStats.todaySeconds / 60);
        const includeToday = todayMinutesNow >= this.dailyGoalMinutes;
        let cursor = includeToday ? todayStr : getPreviousDateString(todayStr);
        for (let i = 0; i < savedProfileStreak; i++) {
          reconstructed.push(cursor);
          cursor = getPreviousDateString(cursor);
        }
        completedList = reconstructed.sort();
      }

      // Strictly enforce: todayStr is ONLY in completedRoutineDates if today's logged study time >= dailyGoalMinutes
      const todayMinutes = Math.floor(this.memoryStats.todaySeconds / 60);
      if (todayMinutes < this.dailyGoalMinutes && completedList.includes(todayStr)) {
        completedList = completedList.filter(d => d !== todayStr);
      } else if (todayMinutes >= this.dailyGoalMinutes && !completedList.includes(todayStr)) {
        completedList.push(todayStr);
      }

      this.memoryStats.completedRoutineDates = Array.from(new Set(completedList)).sort().slice(-14);

      if (isSameDayAsMeta && metaStats.subjectSeconds && typeof metaStats.subjectSeconds === 'object') {
        this.memoryStats.subjectSeconds = { ...metaStats.subjectSeconds };
      }

      const { streak } = calculateConsecutiveStreak(this.memoryStats.completedRoutineDates, todayStr);
      this.memoryStats.currentStreak = streak;

      this.broadcastUpdate();
    } catch (err) {
      console.warn('[StudyTrackerService] Supabase reconciliation notice:', err);
    }
  }

  /**
   * Evaluates whether today's logged study time has reached dailyGoalMinutes.
   * Only when todayMinutes >= dailyGoalMinutes does today's streak become completed (+1)
   * and dispatch 'studyweb-daily-routine-completed' for the full-screen animation.
   */
  private evaluateDailyRoutineStreak(): boolean {
    this.checkDailyRollover();
    const todayStr = getLocalDateString();

    const completedList = Array.isArray(this.memoryStats.completedRoutineDates)
      ? [...this.memoryStats.completedRoutineDates]
      : [];

    const wasCompletedToday = completedList.includes(todayStr);
    const todayMins = Math.floor(this.memoryStats.todaySeconds / 60);
    const goalMins = this.getDailyGoalMinutes();
    const isNowCompletedToday = todayMins >= goalMins;

    let newlyCompleted = false;
    if (isNowCompletedToday && !wasCompletedToday) {
      completedList.push(todayStr);
      completedList.sort();
      newlyCompleted = true;
    } else if (!isNowCompletedToday && wasCompletedToday) {
      const idx = completedList.indexOf(todayStr);
      if (idx !== -1) completedList.splice(idx, 1);
    }

    this.memoryStats.completedRoutineDates = completedList.slice(-14);
    const { streak } = calculateConsecutiveStreak(this.memoryStats.completedRoutineDates, todayStr);
    this.memoryStats.currentStreak = streak;
    this.memoryStats.lastActiveDate = todayStr;
    this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;

    if (newlyCompleted && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('studyweb-daily-routine-completed', {
          detail: {
            streak,
            todayMinutes: todayMins,
            dailyGoalMinutes: goalMins,
            reason: `You completed your ${goalMins}-minute daily study goal!`
          }
        })
      );
    }

    return newlyCompleted;
  }

  private tickStudySession(): void {
    if (typeof window === 'undefined') return;

    const rolledOver = this.checkDailyRollover();
    if (rolledOver) {
      this.syncToSupabase(true);
      this.broadcastUpdate();
    }

    const now = Date.now();
    const idleSeconds = (now - this.lastUserInteraction) / 1000;
    const isVisible = document.visibilityState === 'visible';

    const isUserStudying = isVisible && idleSeconds <= 180;
    this.isLiveActive = isUserStudying;
    this.memoryStats.isStudyingLive = isUserStudying;

    if (isUserStudying) {
      this.memoryStats.todaySeconds += 1;
      this.memoryStats.totalSeconds = this.memoryStats.todaySeconds;
      this.memoryStats.lastHeartbeat = now;

      const currentSubj = this.resolveCurrentSubject();
      this.memoryStats.subjectSeconds[currentSubj] = (this.memoryStats.subjectSeconds[currentSubj] || 0) + 1;

      const newlyCompleted = this.evaluateDailyRoutineStreak();

      if (newlyCompleted) {
        this.syncToSupabase(true);
      } else if (this.memoryStats.todaySeconds % 60 === 0) {
        this.syncToSupabase(false);
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
    this.memoryStats.subjectSeconds[subj] = (this.memoryStats.subjectSeconds[subj] || 0) + seconds;
    const newlyCompleted = this.evaluateDailyRoutineStreak();
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
      note: note?.trim() || undefined
    };

    this.memoryStats.recentSessions = [sessionItem, ...(this.memoryStats.recentSessions || [])].slice(0, 10);
    const newlyCompletedRoutine = this.evaluateDailyRoutineStreak();
    this.syncToSupabase(true);
    this.broadcastUpdate();
    return { newlyCompletedRoutine, currentStreak: this.memoryStats.currentStreak };
  }

  public recordStudyAction(type: 'tutor' | 'quiz' | 'flashcard' | 'note' | 'workspace', subjectName?: string): void {
    this.lastUserInteraction = Date.now();
    if (subjectName) {
      this.setActiveSubject(subjectName);
    }
  }

  /**
   * Returns the 7 days of the current week (Monday to Sunday) formatted for the streak bar.
   * Matches academic and international standards with Monday as day 1.
   */
  public getWeeklyStreakDays(): Array<{
    label: string;
    dateStr: string;
    dayNumber: number;
    completed: boolean;
    isToday: boolean;
    isFuture: boolean;
  }> {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const dayOfWeek = now.getDay(); // 0 = Su .. 6 = Sa
    // Calculate difference to Monday of current week
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const completedSet = new Set(this.memoryStats.completedRoutineDates || []);

    return labels.map((label, idx) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
      const dStr = getLocalDateString(d);
      const isToday = dStr === todayStr;
      return {
        label,
        dateStr: dStr,
        dayNumber: d.getDate(),
        completed: completedSet.has(dStr),
        isToday,
        isFuture: d > now && !isToday
      };
    });
  }

  /**
   * Manually checks in today's study routine / streak.
   * Marks today as completed, increments the consecutive streak,
   * persists to Supabase and broadcasts the updated stats.
   */
  public checkInToday(): { streak: number; activeToday: boolean } {
    this.checkDailyRollover();
    const todayStr = getLocalDateString();
    const completedList = Array.isArray(this.memoryStats.completedRoutineDates)
      ? [...this.memoryStats.completedRoutineDates]
      : [];

    if (!completedList.includes(todayStr)) {
      completedList.push(todayStr);
      completedList.sort();
      this.memoryStats.completedRoutineDates = completedList.slice(-14);
      const goalSecs = this.getDailyGoalMinutes() * 60;
      if (this.memoryStats.todaySeconds < goalSecs) {
        this.memoryStats.todaySeconds = goalSecs;
        this.memoryStats.totalSeconds = goalSecs;
      }
    }

    const { streak, activeToday } = calculateConsecutiveStreak(this.memoryStats.completedRoutineDates, todayStr);
    this.memoryStats.currentStreak = streak;
    this.memoryStats.lastActiveDate = todayStr;
    this.syncToSupabase(true);
    this.broadcastUpdate();
    return { streak, activeToday };
  }

  /**
   * Persists today's study hours and streak directly to Supabase (zero localStorage).
   * - Updates `profiles` table (`study_hours`, `streak`, `updated_at`).
   * - Updates compact `user_metadata.study_stats` on milestone events or throttled intervals (>= 180s)
   *   to prevent HTTP 429 rate limits and HTTP 400 JWT cookie bloat.
   */
  private async syncToSupabase(isMilestone = false): Promise<void> {
    if (!supabase || this.isSyncingSupabase) return;
    this.isSyncingSupabase = true;
    try {
      let uid = this.activeUserId;
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user?.id || null;
        this.activeUserId = uid;
      }
      if (!uid) return;

      const todayHoursLogged = Math.round((this.memoryStats.todaySeconds / 3600) * 100) / 100;
      const streakVal = this.memoryStats.currentStreak;

      // 1. Always sync to the profiles table
      await supabase
        .from('profiles')
        .update({
          study_hours: todayHoursLogged,
          streak: streakVal,
          updated_at: new Date().toISOString()
        })
        .eq('id', uid);

      // 2. Sync compact study_stats to auth user_metadata on milestone events or at most once every 3 minutes
      const now = Date.now();
      if (isMilestone || now - this.lastAuthMetaSyncAt >= 180_000) {
        this.lastAuthMetaSyncAt = now;
        await supabase.auth.updateUser({
          data: {
            study_stats: {
              todaySeconds: this.memoryStats.todaySeconds,
              currentStreak: this.memoryStats.currentStreak,
              dailyGoalMinutes: this.dailyGoalMinutes,
              completedRoutineDates: (this.memoryStats.completedRoutineDates || []).slice(-14),
              lastActiveDate: this.memoryStats.lastActiveDate
            }
          }
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
    window.dispatchEvent(new CustomEvent('studyweb-study-stats-updated', { detail: formatted }));
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
    const todayStr = getLocalDateString();
    const completedList = this.memoryStats.completedRoutineDates || [];
    const { streak, activeToday } = calculateConsecutiveStreak(completedList, todayStr);
    const goalMins = this.getDailyGoalMinutes();

    const remainingMins = Math.max(0, goalMins - todayMinutes);
    const streakBadgeText = activeToday
      ? `Today's ${goalMins}m Goal Completed (+1 Streak!)`
      : `Study ${remainingMins}m more today for +1 streak`;

    const rawSubjects = this.memoryStats.subjectSeconds || {};
    const subjectEntries = Object.entries(rawSubjects)
      .filter(([, secs]) => Number(secs) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]));

    const sumSubjectSecs = subjectEntries.reduce((acc, [, s]) => acc + Number(s), 0) || 1;
    const subjectBreakdown = subjectEntries.slice(0, 6).map(([subject, secs]) => {
      const mins = Math.max(1, Math.round(Number(secs) / 60));
      const hrs = (Number(secs) / 3600).toFixed(1);
      const percentage = Math.min(100, Math.max(4, Math.round((Number(secs) / sumSubjectSecs) * 100)));
      return { subject, minutes: mins, hours: hrs, percentage };
    });

    return {
      ...this.memoryStats,
      totalSeconds: todaySec,
      todaySeconds: todaySec,
      currentStreak: streak,
      studyHoursFormatted,
      studyHoursNumber: Number(studyHoursFormatted),
      todayMinutes,
      dailyGoalMinutes: goalMins,
      streakBadgeText,
      activeToday,
      subjectBreakdown
    };
  }
}

// Global Singleton
export const StudyTrackerService = new StudyTrackerManager();
