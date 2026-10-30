/**
 * StudyTrackerService
 *
 * Personalized real-time study time logging, subject breakdown, and daily streak tracker for StudyWeb.
 * Tracks actual user session time and logged study sessions per user and per subject,
 * synchronizing directly with Supabase.
 */

import { supabase } from '../lib/supabase';
import { getActiveUserIdSync } from '../utils/userActivity';

export interface StudySessionLogItem {
  id: string;
  subject: string;
  minutes: number;
  date: string;       // ISO timestamp
  note?: string;
}

export interface StudyStats {
  totalSeconds: number;                   // Cumulative seconds studied by this user
  todaySeconds: number;                   // Seconds studied on the current calendar day
  currentStreak: number;                  // Consecutive calendar days streak
  studyDates: string[];                   // Chronological array of unique YYYY-MM-DD local dates
  lastActiveDate: string;                 // YYYY-MM-DD of last recorded activity
  lastHeartbeat: number;                  // Epoch ms of last active tick
  isStudyingLive: boolean;                // Whether user is actively interacting now
  subjectSeconds: Record<string, number>; // Seconds studied per subject/workspace
  recentSessions: StudySessionLogItem[];  // Recent logged study sessions
  completedRoutineDates?: string[];       // YYYY-MM-DD dates when daily routine goal was completed
}

export interface FormattedStudyStats extends StudyStats {
  studyHoursFormatted: string; // e.g. "0.4" or "2.5"
  studyHoursNumber: number;    // e.g. 0.4
  todayMinutes: number;        // e.g. 24
  streakBadgeText: string;     // e.g. "Day 1 Streak Active"
  activeToday: boolean;        // whether student has completed daily routine today
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

// Compute streak where base streak is 1 (or consecutive prior completed days) and completing today's routine adds +1
export function calculateConsecutiveStreak(
  completedRoutineDates: string[],
  todayStr: string
): { streak: number; activeToday: boolean } {
  const dateSet = new Set(completedRoutineDates || []);
  const routineDoneToday = dateSet.has(todayStr);

  // Count consecutive completed days prior to today
  let checkDate = getPreviousDateString(todayStr);
  let priorCompletedDays = 0;
  while (dateSet.has(checkDate)) {
    priorCompletedDays += 1;
    checkDate = getPreviousDateString(checkDate);
  }

  // Base streak starts at 1 for an active student (+ any additional prior completed days),
  // and increments by +1 as soon as today's daily study routine is completed!
  const baseStreak = Math.max(1, priorCompletedDays > 0 ? priorCompletedDays : 1);
  const streak = routineDoneToday ? baseStreak + 1 : baseStreak;

  return {
    streak,
    activeToday: routineDoneToday
  };
}

class StudyTrackerManager {
  private activeUserId: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastUserInteraction: number = Date.now();
  private isLiveActive: boolean = true;
  private initialized: boolean = false;
  private activeSubjectLabel: string = '';
  private dailyGoalMinutes: number = 45;
  private memoryStats: StudyStats = {
    totalSeconds: 0,
    todaySeconds: 0,
    currentStreak: 1,
    studyDates: [],
    completedRoutineDates: [],
    lastActiveDate: '',
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

  private getStorageKey(userId?: string | null): string {
    const uid = userId || this.activeUserId || getActiveUserIdSync();
    return uid ? `studyweb_study_stats_${uid}` : 'studyweb_study_stats_guest';
  }

  private resolveDailyGoalMinutes(): number {
    if (typeof window !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem('studyweb_profile_cache_latest');
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          const mins = Number(parsed?.dailyGoalMinutes);
          if (Number.isFinite(mins) && mins >= 5) {
            this.dailyGoalMinutes = mins;
            return mins;
          }
        }
        const directGoal = Number(localStorage.getItem('studyweb_profile_daily_goal'));
        if (Number.isFinite(directGoal) && directGoal >= 5) {
          this.dailyGoalMinutes = directGoal;
          return directGoal;
        }
      } catch {}
    }
    return this.dailyGoalMinutes || 45;
  }

  public setDailyGoalMinutes(mins: number): void {
    const clean = Math.max(5, Math.min(720, Math.round(Number(mins) || 45)));
    this.dailyGoalMinutes = clean;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('studyweb_profile_daily_goal', String(clean));
      } catch {}
    }
    this.evaluateDailyRoutineStreak();
    this.persistStats(true);
    this.broadcastUpdate();
  }

  private resolveCurrentSubject(): string {
    if (this.activeSubjectLabel) return this.activeSubjectLabel;
    if (typeof window !== 'undefined') {
      const profileSub = localStorage.getItem('studyweb_profile_subject');
      if (profileSub && profileSub.trim()) return profileSub.trim();
    }
    return 'General Study';
  }

  public setActiveSubject(subjectName: string): void {
    if (subjectName && subjectName.trim()) {
      this.activeSubjectLabel = subjectName.trim();
    }
  }

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.activeUserId = getActiveUserIdSync();
    this.resolveDailyGoalMinutes();
    this.loadStatsFromStorage();
    this.reconcileWithSupabase();

    const onActivity = () => {
      this.lastUserInteraction = Date.now();
      if (!this.isLiveActive) {
        this.isLiveActive = true;
        this.tickStudySession();
      }
    };

    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('click', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });
    window.addEventListener('studyweb-activity-updated', (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const iconType = detail?.iconType || 'workspace';
      this.recordStudyAction(iconType);
      if (iconType === 'upload' || iconType === 'tutor' || iconType === 'note' || iconType === 'quiz') {
        this.completeTodayStudyTask(detail?.title || 'Completed today\'s study task');
      }
    });
    window.addEventListener('studyweb_profile_updated', () => {
      this.resolveDailyGoalMinutes();
      this.evaluateDailyRoutineStreak();
      this.broadcastUpdate();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onActivity();
      }
    });

    this.timer = setInterval(() => {
      this.tickStudySession();
    }, 1000);

    this.evaluateDailyRoutineStreak();

    if (supabase) {
      supabase.auth.onAuthStateChange((_event, session) => {
        const newUid = session?.user?.id || null;
        if (newUid !== this.activeUserId) {
          this.activeUserId = newUid;
          this.resolveDailyGoalMinutes();
          this.loadStatsFromStorage();
          this.evaluateDailyRoutineStreak();
          this.reconcileWithSupabase();
        }
      });
    }

    window.addEventListener('beforeunload', () => {
      this.persistStats(true);
    });
  }

  private loadStatsFromStorage(): void {
    try {
      const key = this.getStorageKey();
      const raw = localStorage.getItem(key);
      const todayStr = getLocalDateString();

      if (raw) {
        const parsed = JSON.parse(raw);
        const studyDates: string[] = Array.isArray(parsed.studyDates) ? parsed.studyDates : [];
        if (!studyDates.includes(todayStr)) {
          studyDates.push(todayStr);
        }

        const totalSeconds = Math.max(0, Number(parsed.totalSeconds) || 0);
        const todaySeconds = parsed.lastActiveDate === todayStr ? Math.max(0, Number(parsed.todaySeconds) || 0) : 0;
        const todayMins = todaySeconds > 0 ? Math.max(1, Math.round(todaySeconds / 60)) : 0;
        const goalMins = this.resolveDailyGoalMinutes();

        let completedRoutineDates: string[] = Array.isArray(parsed.completedRoutineDates)
          ? [...parsed.completedRoutineDates]
          : [];

        if (todayMins >= goalMins && !completedRoutineDates.includes(todayStr)) {
          completedRoutineDates.push(todayStr);
        }

        const { streak } = calculateConsecutiveStreak(completedRoutineDates, todayStr);

        this.memoryStats = {
          totalSeconds,
          todaySeconds,
          currentStreak: streak,
          studyDates,
          completedRoutineDates,
          lastActiveDate: todayStr,
          lastHeartbeat: Date.now(),
          isStudyingLive: true,
          subjectSeconds: parsed.subjectSeconds && typeof parsed.subjectSeconds === 'object' ? parsed.subjectSeconds : {},
          recentSessions: Array.isArray(parsed.recentSessions) ? parsed.recentSessions.slice(0, 20) : []
        };
      } else {
        this.memoryStats = {
          totalSeconds: 0,
          todaySeconds: 0,
          currentStreak: 1,
          studyDates: [todayStr],
          completedRoutineDates: [],
          lastActiveDate: todayStr,
          lastHeartbeat: Date.now(),
          isStudyingLive: true,
          subjectSeconds: {},
          recentSessions: []
        };
        this.persistStats();
      }
    } catch {
      const todayStr = getLocalDateString();
      this.memoryStats = {
        totalSeconds: 0,
        todaySeconds: 0,
        currentStreak: 1,
        studyDates: [todayStr],
        completedRoutineDates: [],
        lastActiveDate: todayStr,
        lastHeartbeat: Date.now(),
        isStudyingLive: true,
        subjectSeconds: {},
        recentSessions: []
      };
    }
  }

  public async reconcileWithSupabase(): Promise<void> {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      this.activeUserId = uid;

      const metaStats = session.user.user_metadata?.study_stats;
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('study_hours, streak')
        .eq('id', uid)
        .maybeSingle();

      const remoteHours = Number(profileRow?.study_hours || 0);
      const remoteSecondsFromProfile = Number.isFinite(remoteHours) && remoteHours > 0 ? Math.round(remoteHours * 3600) : 0;
      const remoteSecondsFromMeta = Number(metaStats?.totalSeconds || 0);
      const bestTotalSeconds = Math.max(this.memoryStats.totalSeconds, remoteSecondsFromProfile, remoteSecondsFromMeta);

      if (bestTotalSeconds > this.memoryStats.totalSeconds) {
        this.memoryStats.totalSeconds = bestTotalSeconds;
      }

      if (metaStats && typeof metaStats === 'object') {
        const todayStr = getLocalDateString();
        if (metaStats.lastActiveDate === todayStr && Number(metaStats.todaySeconds) > this.memoryStats.todaySeconds) {
          this.memoryStats.todaySeconds = Number(metaStats.todaySeconds);
        }
        if (Array.isArray(metaStats.studyDates)) {
          const mergedDates = Array.from(new Set([...this.memoryStats.studyDates, ...metaStats.studyDates])).sort();
          this.memoryStats.studyDates = mergedDates;
        }
        if (Array.isArray(metaStats.completedRoutineDates)) {
          const mergedRoutine = Array.from(
            new Set([...(this.memoryStats.completedRoutineDates || []), ...metaStats.completedRoutineDates])
          ).sort();
          this.memoryStats.completedRoutineDates = mergedRoutine;
        }
        if (metaStats.subjectSeconds && typeof metaStats.subjectSeconds === 'object') {
          for (const [subj, secs] of Object.entries(metaStats.subjectSeconds)) {
            const cur = this.memoryStats.subjectSeconds[subj] || 0;
            this.memoryStats.subjectSeconds[subj] = Math.max(cur, Number(secs) || 0);
          }
        }
        if (Array.isArray(metaStats.recentSessions) && this.memoryStats.recentSessions.length === 0) {
          this.memoryStats.recentSessions = metaStats.recentSessions.slice(0, 20);
        }
      }

      this.evaluateDailyRoutineStreak();
      this.persistStats(false);
      this.broadcastUpdate();
    } catch {
      // Non-fatal
    }
  }

  private evaluateDailyRoutineStreak(): boolean {
    const todayStr = getLocalDateString();
    if (!this.memoryStats.studyDates.includes(todayStr)) {
      this.memoryStats.studyDates.push(todayStr);
      this.memoryStats.studyDates.sort();
    }

    const completedList = Array.isArray(this.memoryStats.completedRoutineDates)
      ? [...this.memoryStats.completedRoutineDates]
      : [];

    const wasCompletedToday = completedList.includes(todayStr);
    const todayMins = this.memoryStats.todaySeconds > 0
      ? Math.max(1, Math.round(this.memoryStats.todaySeconds / 60))
      : 0;
    const goalMins = this.resolveDailyGoalMinutes();
    const isNowCompletedToday = todayMins >= goalMins;

    let newlyCompleted = false;
    if (isNowCompletedToday && !wasCompletedToday) {
      completedList.push(todayStr);
      completedList.sort();
      newlyCompleted = true;
    }

    this.memoryStats.completedRoutineDates = completedList;
    const { streak } = calculateConsecutiveStreak(completedList, todayStr);
    this.memoryStats.currentStreak = streak;
    this.memoryStats.lastActiveDate = todayStr;

    if (newlyCompleted && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('studyweb-daily-routine-completed', {
          detail: {
            streak,
            todayMinutes: todayMins,
            dailyGoalMinutes: goalMins,
            reason: 'Completed today\'s daily study goal!'
          }
        })
      );
    }

    return newlyCompleted;
  }

  public completeTodayStudyTask(reason = "You've completed today's study task!"): { newlyCompleted: boolean; streak: number } {
    const todayStr = getLocalDateString();
    if (!this.memoryStats.studyDates.includes(todayStr)) {
      this.memoryStats.studyDates.push(todayStr);
      this.memoryStats.studyDates.sort();
    }

    const completedList = Array.isArray(this.memoryStats.completedRoutineDates)
      ? [...this.memoryStats.completedRoutineDates]
      : [];

    const wasCompletedToday = completedList.includes(todayStr);
    let newlyCompleted = false;

    if (!wasCompletedToday) {
      completedList.push(todayStr);
      completedList.sort();
      newlyCompleted = true;
    }

    this.memoryStats.completedRoutineDates = completedList;
    const { streak } = calculateConsecutiveStreak(completedList, todayStr);
    this.memoryStats.currentStreak = streak;
    this.memoryStats.lastActiveDate = todayStr;

    this.persistStats(true);
    this.broadcastUpdate();

    if (newlyCompleted && typeof window !== 'undefined') {
      const todayMins = this.memoryStats.todaySeconds > 0
        ? Math.max(1, Math.round(this.memoryStats.todaySeconds / 60))
        : 1;
      window.dispatchEvent(
        new CustomEvent('studyweb-daily-routine-completed', {
          detail: {
            streak,
            todayMinutes: todayMins,
            dailyGoalMinutes: this.resolveDailyGoalMinutes(),
            reason
          }
        })
      );
    }

    return { newlyCompleted, streak };
  }

  public getWeeklyStreakDays(): Array<{ label: string; dateStr: string; completed: boolean; isToday: boolean }> {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const dayOfWeek = now.getDay(); // 0 = Sunday .. 6 = Saturday
    const labels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const completedSet = new Set([
      ...(this.memoryStats.completedRoutineDates || []),
    ]);

    return labels.map((label, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek - idx));
      const dStr = getLocalDateString(d);
      return {
        label,
        dateStr: dStr,
        completed: completedSet.has(dStr),
        isToday: dStr === todayStr
      };
    });
  }

  private tickStudySession(): void {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const idleSeconds = (now - this.lastUserInteraction) / 1000;
    const isVisible = document.visibilityState === 'visible';

    const isUserStudying = isVisible && idleSeconds <= 180;
    this.isLiveActive = isUserStudying;
    this.memoryStats.isStudyingLive = isUserStudying;

    if (isUserStudying) {
      this.memoryStats.totalSeconds += 1;
      this.memoryStats.todaySeconds += 1;
      this.memoryStats.lastHeartbeat = now;

      const currentSubj = this.resolveCurrentSubject();
      this.memoryStats.subjectSeconds[currentSubj] = (this.memoryStats.subjectSeconds[currentSubj] || 0) + 1;

      const todayStr = getLocalDateString();
      if (this.memoryStats.lastActiveDate !== todayStr) {
        this.memoryStats.todaySeconds = 1;
      }

      const newlyCompleted = this.evaluateDailyRoutineStreak();

      if (newlyCompleted || this.memoryStats.totalSeconds % 5 === 0) {
        this.persistStats(newlyCompleted);
      }

      if (this.memoryStats.totalSeconds % 60 === 0) {
        this.syncToSupabase();
      }
    }

    this.broadcastUpdate();
  }

  public addActiveStudySeconds(seconds: number, subjectName?: string): void {
    if (seconds <= 0) return;
    const subj = (subjectName && subjectName.trim()) || this.resolveCurrentSubject();
    this.memoryStats.totalSeconds += seconds;
    this.memoryStats.todaySeconds += seconds;
    this.memoryStats.subjectSeconds[subj] = (this.memoryStats.subjectSeconds[subj] || 0) + seconds;
    const newlyCompleted = this.evaluateDailyRoutineStreak();
    this.persistStats(newlyCompleted);
    this.broadcastUpdate();
  }

  public logManualStudySession(minutes: number, subjectName: string, note?: string): { newlyCompletedRoutine: boolean; currentStreak: number } {
    const cleanMins = Math.max(1, Math.min(720, Math.round(Number(minutes) || 0)));
    const cleanSubject = (subjectName || '').trim() || this.resolveCurrentSubject();
    const addedSeconds = cleanMins * 60;

    this.memoryStats.totalSeconds += addedSeconds;
    this.memoryStats.todaySeconds += addedSeconds;
    this.memoryStats.subjectSeconds[cleanSubject] = (this.memoryStats.subjectSeconds[cleanSubject] || 0) + addedSeconds;

    const sessionItem: StudySessionLogItem = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject: cleanSubject,
      minutes: cleanMins,
      date: new Date().toISOString(),
      note: note?.trim() || undefined
    };

    this.memoryStats.recentSessions = [sessionItem, ...(this.memoryStats.recentSessions || [])].slice(0, 20);
    const newlyCompletedRoutine = this.evaluateDailyRoutineStreak();
    this.persistStats(true);
    this.broadcastUpdate();
    return { newlyCompletedRoutine, currentStreak: this.memoryStats.currentStreak };
  }

  public recordStudyAction(type: 'tutor' | 'quiz' | 'flashcard' | 'note' | 'workspace', subjectName?: string): void {
    this.lastUserInteraction = Date.now();
    this.addActiveStudySeconds(15, subjectName);
  }

  private persistStats(forceSync = false): void {
    try {
      const key = this.getStorageKey();
      localStorage.setItem(key, JSON.stringify({
        totalSeconds: this.memoryStats.totalSeconds,
        todaySeconds: this.memoryStats.todaySeconds,
        currentStreak: this.memoryStats.currentStreak,
        studyDates: this.memoryStats.studyDates,
        completedRoutineDates: this.memoryStats.completedRoutineDates || [],
        lastActiveDate: this.memoryStats.lastActiveDate,
        lastHeartbeat: this.memoryStats.lastHeartbeat,
        subjectSeconds: this.memoryStats.subjectSeconds,
        recentSessions: this.memoryStats.recentSessions
      }));
      if (forceSync) {
        this.syncToSupabase();
      }
    } catch {
      // Storage unavailable or full
    }
  }

  private async syncToSupabase(): Promise<void> {
    if (!supabase) return;
    try {
      const uid = this.activeUserId || getActiveUserIdSync();
      if (!uid) return;

      const hoursLogged = Math.round((this.memoryStats.totalSeconds / 3600) * 100) / 100;
      const streakVal = this.memoryStats.currentStreak;

      await Promise.allSettled([
        supabase.from('profiles').update({
          study_hours: hoursLogged,
          streak: streakVal,
          updated_at: new Date().toISOString()
        }).eq('id', uid),
        supabase.auth.updateUser({
          data: {
            study_stats: {
              totalSeconds: this.memoryStats.totalSeconds,
              todaySeconds: this.memoryStats.todaySeconds,
              currentStreak: this.memoryStats.currentStreak,
              studyDates: this.memoryStats.studyDates.slice(-60),
              completedRoutineDates: (this.memoryStats.completedRoutineDates || []).slice(-60),
              lastActiveDate: this.memoryStats.lastActiveDate,
              subjectSeconds: this.memoryStats.subjectSeconds,
              recentSessions: (this.memoryStats.recentSessions || []).slice(0, 15)
            }
          }
        })
      ]);
    } catch (err) {
      console.debug('Background study stats sync notice:', err);
    }
  }

  private broadcastUpdate(): void {
    if (typeof window === 'undefined') return;
    const formatted = this.getFormattedStats();
    window.dispatchEvent(new CustomEvent('studyweb-study-stats-updated', { detail: formatted }));
  }

  public getFormattedStats(): FormattedStudyStats {
    const totalSec = Math.max(0, this.memoryStats.totalSeconds);
    const todaySec = Math.max(0, this.memoryStats.todaySeconds);
    const hoursNum = totalSec / 3600;

    let studyHoursFormatted = '0.0';
    if (totalSec > 0 && hoursNum < 0.1) {
      studyHoursFormatted = '0.1';
    } else if (totalSec > 0) {
      studyHoursFormatted = hoursNum.toFixed(1);
    }

    const todayMinutes = todaySec > 0 ? Math.max(1, Math.round(todaySec / 60)) : 0;
    const todayStr = getLocalDateString();
    const completedList = this.memoryStats.completedRoutineDates || [];
    const { streak, activeToday } = calculateConsecutiveStreak(completedList, todayStr);

    let streakBadgeText = activeToday
      ? `Daily Routine Completed (+1 Streak!)`
      : `Complete daily goal for +1 streak`;

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
      totalSeconds: totalSec,
      todaySeconds: todaySec,
      currentStreak: streak,
      studyHoursFormatted,
      studyHoursNumber: Number(studyHoursFormatted),
      todayMinutes,
      streakBadgeText,
      activeToday,
      subjectBreakdown
    };
  }
}

// Global Singleton
export const StudyTrackerService = new StudyTrackerManager();
