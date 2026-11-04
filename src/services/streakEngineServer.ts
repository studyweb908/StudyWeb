import express from "express";
import { createClient } from "@supabase/supabase-js";

export interface DailyStudyRecord {
  date: string; // YYYY-MM-DD in user's timezone
  qualifyingTargetMinutes: number;
  completedSeconds: number;
  completedMinutes: number;
  qualified: boolean;
  qualifiedAt?: string | null;
  celebratedAt?: string | null;
  activityBreakdown: Record<string, number>; // seconds per activity type
}

export interface StreakAchievementRecord {
  badgeId: string;
  badgeName: string;
  description: string;
  requiredDays: number;
  unlocked: boolean;
  unlockedAt?: string | null;
}

export interface UserStreakServerState {
  userId: string;
  dailyGoalMinutes: number;
  timezone: string;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  currentStreak: number;
  longestStreak: number;
  longestStreakDate: string | null;
  lastHeartbeatEpochMs: number;
  dailyLogs: Record<string, DailyStudyRecord>; // keyed by YYYY-MM-DD
  unlockedAchievements: Record<string, string>; // badgeId -> ISO unlockedAt
}

export const STREAK_MILESTONE_BADGES: Array<{
  badgeId: string;
  badgeName: string;
  description: string;
  requiredDays: number;
}> = [
  {
    badgeId: "first-spark",
    badgeName: "First Spark",
    description: "Complete your daily study goal for the very first day.",
    requiredDays: 1,
  },
  {
    badgeId: "momentum-3",
    badgeName: "3-Day Momentum",
    description: "Maintain a 3-day consecutive study streak.",
    requiredDays: 3,
  },
  {
    badgeId: "discipline-7",
    badgeName: "7-Day Discipline",
    description: "Complete a full week of uninterrupted daily study goals.",
    requiredDays: 7,
  },
  {
    badgeId: "focus-14",
    badgeName: "14-Day Focus",
    description: "Reach two full weeks of consistent daily study mastery.",
    requiredDays: 14,
  },
  {
    badgeId: "champion-30",
    badgeName: "30-Day Champion",
    description: "Achieve a 30-day streak of sustained academic excellence.",
    requiredDays: 30,
  },
  {
    badgeId: "consistency-60",
    badgeName: "60-Day Consistency",
    description: "Two months of relentless daily learning discipline.",
    requiredDays: 60,
  },
  {
    badgeId: "legend-100",
    badgeName: "100-Day Legend",
    description: "Join the top tier of scholars with a 100-day study streak.",
    requiredDays: 100,
  },
];

export const ALLOWED_DAILY_GOALS = [15, 30, 45, 60, 90, 120, 180, 240];

// Server-side in-memory authoritative cache backed by Supabase persistence
const userStreakStore = new Map<string, UserStreakServerState>();

const DEFAULT_SUPABASE_URL = "https://fzutrlzeyystbaiueker.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dXRybHpleXlzdGJhaXVla2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTg1MDMsImV4cCI6MjA5ODk3NDUwM30.usJ97CqSdQOAhYC8nXGvKg42xiKrjsmlJiGSTIYSLF4";

function sanitizeBearerHeader(authHeader?: string): string | undefined {
  if (!authHeader || typeof authHeader !== "string" || authHeader.length >= 4000) return undefined;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return undefined;
  const trimmed = authHeader.trim();
  const token = trimmed.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === "undefined" || token === "null") return undefined;
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (payload && typeof payload.exp === "number" && payload.exp * 1000 <= Date.now() + 10_000) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return /^Bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${token}`;
}

function getSupabaseForRequest(authHeader?: string) {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const safeAuth = sanitizeBearerHeader(authHeader);
  const options = safeAuth ? { global: { headers: { Authorization: safeAuth } } } : {};
  return createClient(supabaseUrl, supabaseKey, options);
}

export function sanitizeTimezone(tz?: string): string {
  if (!tz || typeof tz !== "string") return "UTC";
  try {
    Intl.DateTimeFormat("en-CA", { timeZone: tz.trim() }).format(new Date());
    return tz.trim();
  } catch {
    return "UTC";
  }
}

export function getDateStringInTimezone(date: Date = new Date(), timezone = "UTC"): string {
  const safeTz = sanitizeTimezone(timezone);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {}
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function stepDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yr = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const da = String(dt.getUTCDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

export function computeStreaksFromDailyLogs(
  dailyLogs: Record<string, DailyStudyRecord>,
  todayStr: string,
  prevLongestStreak = 0,
  prevLongestDate: string | null = null
): {
  currentStreak: number;
  longestStreak: number;
  longestStreakDate: string | null;
  qualifiedToday: boolean;
} {
  const qualifiedDates = Object.values(dailyLogs)
    .filter((log) => log.qualified)
    .map((log) => log.date)
    .sort();

  const qualifiedSet = new Set(qualifiedDates);
  const qualifiedToday = qualifiedSet.has(todayStr);

  // 1. Consecutive days immediately before today
  let priorDays = 0;
  let cursor = stepDateString(todayStr, -1);
  while (qualifiedSet.has(cursor)) {
    priorDays += 1;
    cursor = stepDateString(cursor, -1);
  }

  const currentStreak = qualifiedToday ? priorDays + 1 : priorDays;

  // 2. Longest streak across all historical dates
  let longestStreak = Math.max(prevLongestStreak, currentStreak);
  let longestStreakDate = prevLongestDate;

  if (currentStreak >= longestStreak && currentStreak > 0) {
    longestStreak = currentStreak;
    longestStreakDate = qualifiedToday ? todayStr : stepDateString(todayStr, -1);
  }

  let run = 0;
  let prevDate: string | null = null;
  for (const dStr of qualifiedDates) {
    if (!prevDate || stepDateString(prevDate, 1) === dStr) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) {
      longestStreak = run;
      longestStreakDate = dStr;
    }
    prevDate = dStr;
  }

  return {
    currentStreak,
    longestStreak,
    longestStreakDate,
    qualifiedToday,
  };
}

function getOrCreateUserState(userId: string, timezone = "UTC"): UserStreakServerState {
  const existing = userStreakStore.get(userId);
  if (existing) {
    if (timezone && timezone !== "UTC") {
      existing.timezone = sanitizeTimezone(timezone);
    }
    return existing;
  }

  const initial: UserStreakServerState = {
    userId,
    dailyGoalMinutes: 60,
    timezone: sanitizeTimezone(timezone),
    soundEnabled: true,
    animationsEnabled: true,
    currentStreak: 0,
    longestStreak: 0,
    longestStreakDate: null,
    lastHeartbeatEpochMs: 0,
    dailyLogs: {},
    unlockedAchievements: {},
  };
  userStreakStore.set(userId, initial);
  return initial;
}

function extractSubFromBearer(authHeader?: string): string | undefined {
  if (!authHeader || typeof authHeader !== "string") return undefined;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const parts = token.split(".");
  if (parts.length < 2) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (payload && typeof payload.sub === "string" && payload.sub.trim()) {
      return payload.sub.trim();
    }
  } catch {
    // ignore decode errors
  }
  return undefined;
}

async function resolveAuthenticatedUser(
  req: express.Request
): Promise<{ userId: string; supabase: any | null; userMeta: Record<string, any> }> {
  const authHeader = req.headers.authorization;
  const supabase = getSupabaseForRequest(authHeader);

  if (supabase && authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user?.id) {
        return {
          userId: data.user.id,
          supabase,
          userMeta: data.user.user_metadata || {},
        };
      }
    } catch {}
  }

  const decodedSub = extractSubFromBearer(authHeader);
  const fallbackUserId = String(
    req.body?.userId || req.query?.userId || req.headers["x-studyweb-user-id"] || decodedSub || "local-scholar"
  ).trim();
  return {
    userId: fallbackUserId || "local-scholar",
    supabase,
    userMeta: {},
  };
}

async function hydrateStateFromSupabaseIfNeeded(
  state: UserStreakServerState,
  supabase: any | null,
  userMeta: Record<string, any>
): Promise<void> {
  if (!supabase || state.userId === "local-scholar") return;
  if (Object.keys(state.dailyLogs).length > 0) return;

  try {
    const todayStr = getDateStringInTimezone(new Date(), state.timezone);

    // 1. Try study_streak_settings table if provisioned
    const { data: settingsRow } = await supabase
      .from("study_streak_settings")
      .select("*")
      .eq("user_id", state.userId)
      .maybeSingle();

    if (settingsRow) {
      if (Number(settingsRow.daily_goal_minutes) >= 5) {
        state.dailyGoalMinutes = Number(settingsRow.daily_goal_minutes);
      }
      if (settingsRow.timezone) {
        state.timezone = sanitizeTimezone(settingsRow.timezone);
      }
      if (typeof settingsRow.sound_enabled === "boolean") {
        state.soundEnabled = settingsRow.sound_enabled;
      }
      if (typeof settingsRow.animations_enabled === "boolean") {
        state.animationsEnabled = settingsRow.animations_enabled;
      }
      state.longestStreak = Math.max(state.longestStreak, Number(settingsRow.longest_streak) || 0);
      if (settingsRow.longest_streak_date) {
        state.longestStreakDate = String(settingsRow.longest_streak_date);
      }
    } else {
      // Also check public.profiles for daily_goal_minutes if study_streak_settings is empty
      try {
        const { data: profRow } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", state.userId)
          .maybeSingle();
        if (profRow && Number(profRow.daily_goal_minutes) >= 5) {
          state.dailyGoalMinutes = Number(profRow.daily_goal_minutes);
        }
      } catch {}
    }

    // 2. Try study_daily_logs table if provisioned
    const { data: logRows } = await supabase
      .from("study_daily_logs")
      .select("*")
      .eq("user_id", state.userId)
      .order("study_date", { ascending: false })
      .limit(120);

    if (Array.isArray(logRows) && logRows.length > 0) {
      for (const r of logRows) {
        const dStr = String(r.study_date);
        state.dailyLogs[dStr] = {
          date: dStr,
          qualifyingTargetMinutes: Number(r.qualifying_target_minutes) || state.dailyGoalMinutes,
          completedSeconds: Number(r.completed_seconds) || 0,
          completedMinutes: Math.floor((Number(r.completed_seconds) || 0) / 60),
          qualified: Boolean(r.qualified),
          qualifiedAt: r.qualified_at || null,
          celebratedAt: r.celebrated_at || null,
          activityBreakdown:
            r.activity_breakdown && typeof r.activity_breakdown === "object"
              ? r.activity_breakdown
              : {},
        };
      }
    }

    // 3. Reconcile with user_metadata.study_stats and public.profiles
    const metaStats = userMeta?.study_stats || {};
    if (Number(userMeta?.daily_goal_minutes) >= 5 && !settingsRow) {
      state.dailyGoalMinutes = Number(userMeta.daily_goal_minutes);
    } else if (Number(metaStats?.dailyGoalMinutes) >= 5 && !settingsRow) {
      state.dailyGoalMinutes = Number(metaStats.dailyGoalMinutes);
    }

    if (typeof metaStats?.soundEnabled === "boolean" && !settingsRow) {
      state.soundEnabled = metaStats.soundEnabled;
    }
    if (typeof metaStats?.animationsEnabled === "boolean" && !settingsRow) {
      state.animationsEnabled = metaStats.animationsEnabled;
    }
    if (metaStats?.timezone && !settingsRow) {
      state.timezone = sanitizeTimezone(metaStats.timezone);
    }

    if (Array.isArray(metaStats?.completedRoutineDates)) {
      for (const dStr of metaStats.completedRoutineDates) {
        if (typeof dStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
          const existing = state.dailyLogs[dStr];
          const targetMins =
            metaStats?.historicalTargets?.[dStr] ||
            existing?.qualifyingTargetMinutes ||
            state.dailyGoalMinutes;
          const secs =
            dStr === metaStats.lastActiveDate && Number(metaStats.todaySeconds) > 0
              ? Math.max(Number(metaStats.todaySeconds), targetMins * 60)
              : Math.max(existing?.completedSeconds || 0, targetMins * 60);
          state.dailyLogs[dStr] = {
            date: dStr,
            qualifyingTargetMinutes: targetMins,
            completedSeconds: secs,
            completedMinutes: Math.floor(secs / 60),
            qualified: true,
            qualifiedAt: existing?.qualifiedAt || new Date().toISOString(),
            celebratedAt:
              existing?.celebratedAt ||
              (Array.isArray(metaStats?.celebratedDates) &&
              metaStats.celebratedDates.includes(dStr)
                ? new Date().toISOString()
                : null),
            activityBreakdown: existing?.activityBreakdown || { workspace: secs },
          };
        }
      }
    }

    if (metaStats?.lastActiveDate === todayStr && Number(metaStats?.todaySeconds) > 0) {
      const existingToday = state.dailyLogs[todayStr];
      const mergedSecs = Math.max(
        existingToday?.completedSeconds || 0,
        Number(metaStats.todaySeconds) || 0
      );
      const targetMins = existingToday?.qualifyingTargetMinutes || state.dailyGoalMinutes;
      const isQual = existingToday?.qualified || Math.floor(mergedSecs / 60) >= targetMins;
      state.dailyLogs[todayStr] = {
        date: todayStr,
        qualifyingTargetMinutes: targetMins,
        completedSeconds: mergedSecs,
        completedMinutes: Math.floor(mergedSecs / 60),
        qualified: isQual,
        qualifiedAt:
          existingToday?.qualifiedAt || (isQual ? new Date().toISOString() : null),
        celebratedAt: existingToday?.celebratedAt || null,
        activityBreakdown: existingToday?.activityBreakdown || { workspace: mergedSecs },
      };
    }
  } catch {}
}

function buildClientPayload(state: UserStreakServerState, newlyQualifiedToday = false) {
  const todayStr = getDateStringInTimezone(new Date(), state.timezone);

  // Ensure today's entry exists in dailyLogs
  if (!state.dailyLogs[todayStr]) {
    state.dailyLogs[todayStr] = {
      date: todayStr,
      qualifyingTargetMinutes: state.dailyGoalMinutes,
      completedSeconds: 0,
      completedMinutes: 0,
      qualified: false,
      qualifiedAt: null,
      celebratedAt: null,
      activityBreakdown: {},
    };
  }

  const todayRecord = state.dailyLogs[todayStr];
  const { currentStreak, longestStreak, longestStreakDate, qualifiedToday } =
    computeStreaksFromDailyLogs(
      state.dailyLogs,
      todayStr,
      state.longestStreak,
      state.longestStreakDate
    );

  state.currentStreak = currentStreak;
  state.longestStreak = longestStreak;
  state.longestStreakDate = longestStreakDate;

  // Evaluate milestone achievements
  for (const badge of STREAK_MILESTONE_BADGES) {
    if (longestStreak >= badge.requiredDays && !state.unlockedAchievements[badge.badgeId]) {
      state.unlockedAchievements[badge.badgeId] =
        longestStreakDate || todayStr || new Date().toISOString();
    }
  }

  const achievements: StreakAchievementRecord[] = STREAK_MILESTONE_BADGES.map((b) => ({
    badgeId: b.badgeId,
    badgeName: b.badgeName,
    description: b.description,
    requiredDays: b.requiredDays,
    unlocked: Boolean(state.unlockedAchievements[b.badgeId]) || longestStreak >= b.requiredDays,
    unlockedAt: state.unlockedAchievements[b.badgeId] || null,
  }));

  // Build weekly 7-day calendar (MON - SUN) in user's timezone
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const todayUtcDate = new Date(Date.UTC(ty, tm - 1, td));
  const dow = todayUtcDate.getUTCDay(); // 0=Sun..6=Sat
  const diffToMon = (dow === 0 ? -6 : 1) - dow;
  const monLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const shortLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const weeklyDays = monLabels.map((fullLabel, idx) => {
    const dStr = stepDateString(todayStr, diffToMon + idx);
    const [, , dayNumStr] = dStr.split("-");
    const log = state.dailyLogs[dStr];
    const isToday = dStr === todayStr;
    const isFuture = dStr > todayStr;
    return {
      label: shortLabels[idx],
      fullLabel,
      dateStr: dStr,
      dayNumber: Number(dayNumStr),
      completed: Boolean(log?.qualified),
      completedMinutes: log ? log.completedMinutes : 0,
      targetMinutes: log ? log.qualifyingTargetMinutes : state.dailyGoalMinutes,
      isToday,
      isFuture,
    };
  });

  // Compute aggregate statistics
  const allLogs = Object.values(state.dailyLogs);
  const totalStudyDays = allLogs.filter((l) => l.completedMinutes > 0 || l.qualified).length;
  const totalStudySeconds = allLogs.reduce((acc, l) => acc + (l.completedSeconds || 0), 0);
  const totalStudyHours = Number((totalStudySeconds / 3600).toFixed(1));
  const dailyAverageMinutes =
    totalStudyDays > 0 ? Math.round(totalStudySeconds / 60 / totalStudyDays) : 0;

  const currentYearMonth = todayStr.slice(0, 7); // YYYY-MM
  const monthlyCompletedGoals = allLogs.filter(
    (l) => l.date.startsWith(currentYearMonth) && l.qualified
  ).length;

  const shouldTriggerCelebration =
    newlyQualifiedToday && qualifiedToday && !todayRecord.celebratedAt;

  return {
    userId: state.userId,
    todayDate: todayStr,
    dailyGoalMinutes: state.dailyGoalMinutes,
    todayTargetMinutes: todayRecord.qualifyingTargetMinutes,
    todayCompletedSeconds: todayRecord.completedSeconds,
    todayCompletedMinutes: todayRecord.completedMinutes,
    todayRemainingMinutes: Math.max(
      0,
      todayRecord.qualifyingTargetMinutes - todayRecord.completedMinutes
    ),
    qualifiedToday,
    celebratedToday: Boolean(todayRecord.celebratedAt),
    shouldTriggerCelebration,
    currentStreak,
    longestStreak,
    longestStreakDate,
    soundEnabled: state.soundEnabled,
    animationsEnabled: state.animationsEnabled,
    timezone: state.timezone,
    weeklyDays,
    achievements,
    statistics: {
      totalStudyDays,
      currentStreak,
      longestStreak,
      totalStudyHours,
      totalStudySeconds,
      dailyAverageMinutes,
      monthlyCompletedGoals,
    },
    dailyLogs: state.dailyLogs,
  };
}

export const streakRouter = express.Router();

// GET /api/streaks/status — Retrieve authoritative streak state, weekly calendar, achievements, and stats
streakRouter.get("/status", async (req, res) => {
  try {
    const { userId, supabase, userMeta } = await resolveAuthenticatedUser(req);
    const clientTz = sanitizeTimezone(String(req.query.timezone || "UTC"));
    const state = getOrCreateUserState(userId, clientTz);
    await hydrateStateFromSupabaseIfNeeded(state, supabase, userMeta);

    const payload = buildClientPayload(state, false);
    return res.json({ success: true, streak: payload });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to load streak status",
    });
  }
});

// POST /api/streaks/heartbeat — Server-validated active study heartbeat
streakRouter.post("/heartbeat", async (req, res) => {
  try {
    const { userId, supabase, userMeta } = await resolveAuthenticatedUser(req);
    const clientTz = sanitizeTimezone(String(req.body?.timezone || "UTC"));
    const state = getOrCreateUserState(userId, clientTz);
    await hydrateStateFromSupabaseIfNeeded(state, supabase, userMeta);

    const now = Date.now();
    const rawSeconds = Number(req.body?.durationSeconds) || 0;
    const isManualSession = Boolean(req.body?.isManualSession);
    const activityType = String(req.body?.activityType || "workspace").toLowerCase();
    const subject = String(req.body?.subject || "General Study").trim() || "General Study";

    // Anti-duplication & server-side rate validation:
    // Automatic heartbeats cannot exceed 90 seconds per tick and cannot fire faster than real elapsed time
    let creditedSeconds = 0;
    if (isManualSession) {
      creditedSeconds = Math.max(0, Math.min(720 * 60, Math.round(rawSeconds)));
    } else {
      const elapsedSinceLastHeartbeatSec =
        state.lastHeartbeatEpochMs > 0
          ? Math.max(0, Math.round((now - state.lastHeartbeatEpochMs) / 1000))
          : 60;
      // Prevent duplicate concurrent tab heartbeats within <1s
      if (state.lastHeartbeatEpochMs > 0 && now - state.lastHeartbeatEpochMs < 800) {
        const payload = buildClientPayload(state, false);
        return res.json({ success: true, deduplicated: true, streak: payload });
      }
      const maxAllowedSec = Math.min(90, Math.max(15, elapsedSinceLastHeartbeatSec + 5));
      creditedSeconds = Math.max(0, Math.min(maxAllowedSec, Math.round(rawSeconds)));
      state.lastHeartbeatEpochMs = now;
    }

    const todayStr = getDateStringInTimezone(new Date(), state.timezone);

    // Optional sync of client's known historical completed dates if server restarted
    if (Array.isArray(req.body?.completedDates)) {
      for (const dStr of req.body.completedDates) {
        if (
          typeof dStr === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(dStr) &&
          dStr !== todayStr &&
          !state.dailyLogs[dStr]
        ) {
          const histTarget =
            Number(req.body?.historicalTargets?.[dStr]) || state.dailyGoalMinutes;
          state.dailyLogs[dStr] = {
            date: dStr,
            qualifyingTargetMinutes: histTarget,
            completedSeconds: histTarget * 60,
            completedMinutes: histTarget,
            qualified: true,
            qualifiedAt: new Date().toISOString(),
            celebratedAt: new Date().toISOString(),
            activityBreakdown: { workspace: histTarget * 60 },
          };
        }
      }
    }

    if (!state.dailyLogs[todayStr]) {
      state.dailyLogs[todayStr] = {
        date: todayStr,
        qualifyingTargetMinutes: state.dailyGoalMinutes,
        completedSeconds: 0,
        completedMinutes: 0,
        qualified: false,
        qualifiedAt: null,
        celebratedAt: null,
        activityBreakdown: {},
      };
    }

    const todayLog = state.dailyLogs[todayStr];
    const wasQualified = todayLog.qualified;

    todayLog.completedSeconds += creditedSeconds;
    todayLog.completedMinutes = Math.floor(todayLog.completedSeconds / 60);
    todayLog.activityBreakdown[activityType] =
      (todayLog.activityBreakdown[activityType] || 0) + creditedSeconds;

    if (!todayLog.qualified && todayLog.completedMinutes >= todayLog.qualifyingTargetMinutes) {
      todayLog.qualified = true;
      todayLog.qualifiedAt = new Date().toISOString();
    }

    const newlyQualifiedToday = !wasQualified && todayLog.qualified;
    const payload = buildClientPayload(state, newlyQualifiedToday);

    // Best-effort non-blocking persistence to Supabase tables if available
    if (supabase && userId !== "local-scholar" && (newlyQualifiedToday || creditedSeconds >= 10)) {
      Promise.allSettled([
        supabase.from("study_daily_logs").upsert({
          user_id: userId,
          study_date: todayStr,
          qualifying_target_minutes: todayLog.qualifyingTargetMinutes,
          completed_seconds: todayLog.completedSeconds,
          completed_minutes: todayLog.completedMinutes,
          qualified: todayLog.qualified,
          qualified_at: todayLog.qualifiedAt,
          celebrated_at: todayLog.celebratedAt,
          activity_breakdown: todayLog.activityBreakdown,
          updated_at: new Date().toISOString(),
        }),
        supabase.from("study_streak_settings").upsert({
          user_id: userId,
          daily_goal_minutes: state.dailyGoalMinutes,
          timezone: state.timezone,
          sound_enabled: state.soundEnabled,
          animations_enabled: state.animationsEnabled,
          current_streak: payload.currentStreak,
          longest_streak: payload.longestStreak,
          longest_streak_date: payload.longestStreakDate,
          total_study_seconds: payload.statistics.totalStudySeconds,
          total_study_days: payload.statistics.totalStudyDays,
          updated_at: new Date().toISOString(),
        }),
        creditedSeconds > 0 && creditedSeconds <= 120
          ? supabase.from("study_activity_heartbeats").insert({
              user_id: userId,
              session_id: String(req.body?.sessionId || "web-session"),
              activity_type: ["tutor", "workspace", "notes", "flashcards", "quiz", "pdf", "study-session"].includes(
                activityType
              )
                ? activityType
                : "workspace",
              subject,
              duration_seconds: creditedSeconds,
              study_date: todayStr,
            })
          : Promise.resolve(),
      ]).catch(() => {});
    }

    return res.json({
      success: true,
      creditedSeconds,
      newlyQualifiedToday,
      streak: payload,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to process study heartbeat",
    });
  }
});

export function setServerUserDailyGoal(userId: string, dailyGoalMinutes: number): void {
  if (!userId || userId === "local-scholar") return;
  const cleanGoal = Math.max(5, Math.min(720, Math.round(Number(dailyGoalMinutes) || 60)));
  const state = getOrCreateUserState(userId);
  state.dailyGoalMinutes = cleanGoal;
  const todayStr = getDateStringInTimezone(new Date(), state.timezone);
  const todayLog = state.dailyLogs[todayStr];
  if (todayLog && !todayLog.qualified) {
    todayLog.qualifyingTargetMinutes = cleanGoal;
    if (todayLog.completedMinutes >= cleanGoal) {
      todayLog.qualified = true;
      todayLog.qualifiedAt = new Date().toISOString();
    }
  }
}

export function getServerUserDailyGoal(userId: string): number | undefined {
  if (!userId || userId === "local-scholar") return undefined;
  const existing = userStreakStore.get(userId);
  return existing?.dailyGoalMinutes;
}

// POST /api/streaks/settings — Update daily study goal, sound, animation, and timezone settings
streakRouter.post("/settings", async (req, res) => {
  try {
    const { userId, supabase, userMeta } = await resolveAuthenticatedUser(req);
    const state = getOrCreateUserState(userId);
    await hydrateStateFromSupabaseIfNeeded(state, supabase, userMeta);

    const todayStr = getDateStringInTimezone(new Date(), state.timezone);

    let newlyQualifiedToday = false;
    if (req.body?.dailyGoalMinutes !== undefined) {
      const requestedGoal = Math.max(
        5,
        Math.min(720, Math.round(Number(req.body.dailyGoalMinutes) || 60))
      );
      state.dailyGoalMinutes = requestedGoal;

      // Update today's qualifying target ONLY if today has not yet been completed,
      // or if the new target qualifies today immediately. Historical days are NEVER altered!
      const todayLog = state.dailyLogs[todayStr];
      if (todayLog) {
        if (!todayLog.qualified) {
          todayLog.qualifyingTargetMinutes = requestedGoal;
          if (todayLog.completedMinutes >= requestedGoal) {
            todayLog.qualified = true;
            todayLog.qualifiedAt = new Date().toISOString();
            newlyQualifiedToday = true;
          }
        }
      }
    }

    if (typeof req.body?.soundEnabled === "boolean") {
      state.soundEnabled = req.body.soundEnabled;
    }
    if (typeof req.body?.animationsEnabled === "boolean") {
      state.animationsEnabled = req.body.animationsEnabled;
    }
    if (req.body?.timezone) {
      state.timezone = sanitizeTimezone(String(req.body.timezone));
    }

    const payload = buildClientPayload(state, newlyQualifiedToday);

    if (supabase && userId !== "local-scholar") {
      Promise.allSettled([
        supabase.from("study_streak_settings").upsert({
          user_id: userId,
          daily_goal_minutes: state.dailyGoalMinutes,
          timezone: state.timezone,
          sound_enabled: state.soundEnabled,
          animations_enabled: state.animationsEnabled,
          current_streak: payload.currentStreak,
          longest_streak: payload.longestStreak,
          longest_streak_date: payload.longestStreakDate,
          total_study_seconds: payload.statistics.totalStudySeconds,
          total_study_days: payload.statistics.totalStudyDays,
          updated_at: new Date().toISOString(),
        }),
        supabase
          .from("profiles")
          .update({
            daily_goal_minutes: state.dailyGoalMinutes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId),
      ]).catch(() => {});
    }

    return res.json({ success: true, streak: payload });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to update streak settings",
    });
  }
});

// POST /api/streaks/acknowledge-celebration — Persist that today's celebration popup was shown
streakRouter.post("/acknowledge-celebration", async (req, res) => {
  try {
    const { userId, supabase, userMeta } = await resolveAuthenticatedUser(req);
    const state = getOrCreateUserState(userId);
    await hydrateStateFromSupabaseIfNeeded(state, supabase, userMeta);

    const dateStr =
      String(req.body?.date || "").trim() ||
      getDateStringInTimezone(new Date(), state.timezone);

    if (state.dailyLogs[dateStr]) {
      state.dailyLogs[dateStr].celebratedAt = new Date().toISOString();
    }

    const payload = buildClientPayload(state, false);

    if (supabase && userId !== "local-scholar" && state.dailyLogs[dateStr]) {
      supabase
        .from("study_daily_logs")
        .upsert({
          user_id: userId,
          study_date: dateStr,
          qualifying_target_minutes: state.dailyLogs[dateStr].qualifyingTargetMinutes,
          completed_seconds: state.dailyLogs[dateStr].completedSeconds,
          completed_minutes: state.dailyLogs[dateStr].completedMinutes,
          qualified: state.dailyLogs[dateStr].qualified,
          qualified_at: state.dailyLogs[dateStr].qualifiedAt,
          celebrated_at: state.dailyLogs[dateStr].celebratedAt,
          activity_breakdown: state.dailyLogs[dateStr].activityBreakdown,
          updated_at: new Date().toISOString(),
        })
        .catch(() => {});
    }

    return res.json({ success: true, streak: payload });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to acknowledge streak celebration",
    });
  }
});
