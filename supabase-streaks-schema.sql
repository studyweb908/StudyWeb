-- ============================================================================
-- STUDYWEB PREMIUM STREAK SYSTEM — SUPABASE POSTGRESQL SCHEMA & MIGRATIONS
-- ============================================================================
-- Provides persistent storage for:
-- 1. User streak settings (daily study goal, timezone, sound & animation prefs)
-- 2. Historical daily study logs (preserving each day's qualifying target)
-- 3. Validated study activity heartbeats (Tutor, Workspace, Notes, PDF, Quiz)
-- 4. Unlocked streak milestone achievements
-- ============================================================================

-- 1. Extend public.profiles with streak columns if not already present
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS daily_goal_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak_date DATE,
  ADD COLUMN IF NOT EXISTS study_hours NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_study_seconds BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS streak_sound_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS streak_animations_enabled BOOLEAN DEFAULT TRUE;

-- 2. User Streak Settings & Summary Table
CREATE TABLE IF NOT EXISTS public.study_streak_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_goal_minutes INTEGER NOT NULL DEFAULT 60 CHECK (daily_goal_minutes IN (15, 30, 45, 60, 90, 120, 180, 240) OR (daily_goal_minutes >= 5 AND daily_goal_minutes <= 720)),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  animations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak_date DATE,
  total_study_seconds BIGINT NOT NULL DEFAULT 0,
  total_study_days INTEGER NOT NULL DEFAULT 0,
  last_qualified_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Daily Study Progress Logs (Preserves historical qualifying_target_minutes per day)
CREATE TABLE IF NOT EXISTS public.study_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_date DATE NOT NULL,
  qualifying_target_minutes INTEGER NOT NULL DEFAULT 60,
  completed_seconds INTEGER NOT NULL DEFAULT 0,
  completed_minutes INTEGER NOT NULL DEFAULT 0,
  qualified BOOLEAN NOT NULL DEFAULT FALSE,
  qualified_at TIMESTAMPTZ,
  celebrated_at TIMESTAMPTZ,
  activity_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, study_date)
);

CREATE INDEX IF NOT EXISTS idx_study_daily_logs_user_date
  ON public.study_daily_logs (user_id, study_date DESC);

-- 4. Study Session / Activity Heartbeats (Server-Validated Active Study Time)
CREATE TABLE IF NOT EXISTS public.study_activity_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('tutor', 'workspace', 'notes', 'flashcards', 'quiz', 'pdf', 'study-session')),
  subject TEXT NOT NULL DEFAULT 'General Study',
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 120),
  study_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_heartbeats_user_created
  ON public.study_activity_heartbeats (user_id, created_at DESC);

-- 5. Streak Milestone Achievements Table
CREATE TABLE IF NOT EXISTS public.study_streak_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  required_days INTEGER NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_study_achievements_user
  ON public.study_streak_achievements (user_id, required_days ASC);

-- 6. Row-Level Security (RLS)
ALTER TABLE public.study_streak_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_activity_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_streak_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'study_streak_settings' AND policyname = 'Users manage own streak settings'
  ) THEN
    CREATE POLICY "Users manage own streak settings"
      ON public.study_streak_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'study_daily_logs' AND policyname = 'Users manage own daily study logs'
  ) THEN
    CREATE POLICY "Users manage own daily study logs"
      ON public.study_daily_logs
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'study_activity_heartbeats' AND policyname = 'Users manage own study heartbeats'
  ) THEN
    CREATE POLICY "Users manage own study heartbeats"
      ON public.study_activity_heartbeats
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'study_streak_achievements' AND policyname = 'Users read and unlock own streak achievements'
  ) THEN
    CREATE POLICY "Users read and unlock own streak achievements"
      ON public.study_streak_achievements
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
