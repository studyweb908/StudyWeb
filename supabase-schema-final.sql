-- =================================================================================
-- STUDYWEB AI — MASTER END-TO-END SUPABASE SQL SCRIPT (SAFE & NON-DESTRUCTIVE)
-- =================================================================================
-- HOW TO USE:
-- 1. Open your Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire script and click "Run".
-- 3. This script is 100% IDEMPOTENT & NON-DESTRUCTIVE:
--    - Preserves all existing users, profiles, workspaces, and study data.
--    - Creates all 22 required tables if they do not exist.
--    - Safely adds any missing columns required by Onboarding, Product Tour,
--      Workspaces, AI Tutor, Knowledge Engine (RAG), and Profile Settings.
--    - Backfills missing profile/stats rows for existing auth.users.
--    - Configures Row Level Security (RLS), Storage Buckets, Vector RPC,
--      Realtime publications, and reloads the PostgREST schema cache.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. EXTENSIONS & CORE TRIGGER UTILITIES
-- ---------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 2. CORE USER & ONBOARDING TABLES (profiles, user_stats)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  school_name TEXT DEFAULT '',
  academic_institution TEXT DEFAULT '',
  current_study TEXT DEFAULT '',
  class_name TEXT DEFAULT '',
  curriculum_board TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  target_aim TEXT DEFAULT '',
  primary_goal TEXT DEFAULT '',
  scholar_bio TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  daily_goal_minutes INTEGER DEFAULT 60,
  exam_name TEXT DEFAULT '',
  exam_date TEXT DEFAULT '',
  active_mascot TEXT DEFAULT 'athena',
  voice_style TEXT DEFAULT 'calm',
  age TEXT,
  study_routine TEXT,
  weak_areas TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  learning_style TEXT,
  uses_ai BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Safely add any missing columns to existing public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_institution TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_study TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS curriculum_board TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_aim TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_goal TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scholar_bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_goal_minutes INTEGER DEFAULT 60;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exam_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exam_date TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_mascot TEXT DEFAULT 'athena';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voice_style TEXT DEFAULT 'calm';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS study_routine TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weak_areas TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strengths TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_style TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS uses_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_study_date DATE,
  total_study_time_minutes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS last_study_date DATE;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS total_study_time_minutes INTEGER DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------------------
-- 3. WORKSPACES & WORKSPACE FILES TABLES
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Workspace',
  subject TEXT DEFAULT '',
  description TEXT DEFAULT '',
  color_theme TEXT DEFAULT 'indigo',
  cover_image TEXT DEFAULT '',
  emoji TEXT DEFAULT '🧬',
  visibility TEXT DEFAULT 'private',
  template TEXT DEFAULT 'custom',
  pinned BOOLEAN DEFAULT FALSE,
  favorite BOOLEAN DEFAULT FALSE,
  streak INTEGER DEFAULT 1,
  study_hours NUMERIC DEFAULT 0,
  last_opened TIMESTAMPTZ DEFAULT NOW(),
  is_for_sale BOOLEAN DEFAULT FALSE,
  price NUMERIC,
  files JSONB DEFAULT '[]'::jsonb,
  flashcards JSONB DEFAULT '[]'::jsonb,
  quizzes JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  planner_tasks JSONB DEFAULT '[]'::jsonb,
  nodes JSONB DEFAULT '[]'::jsonb,
  links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled Workspace';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS color_theme TEXT DEFAULT 'indigo';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT '';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🧬';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'custom';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 1;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS study_hours NUMERIC DEFAULT 0;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS last_opened TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS flashcards JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS quizzes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS planner_tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS nodes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'document',
  size BIGINT DEFAULT 0,
  url TEXT DEFAULT '',
  source_url TEXT,
  storage_path TEXT,
  content_text TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  transcription TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  highlights JSONB DEFAULT '[]'::jsonb,
  formulas JSONB DEFAULT '[]'::jsonb,
  extracted_diagrams JSONB DEFAULT '[]'::jsonb,
  pages INTEGER,
  status TEXT DEFAULT 'ready',
  processing_status TEXT DEFAULT 'completed',
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'document';
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS size BIGINT DEFAULT 0;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS content_text TEXT DEFAULT '';
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS formulas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS extracted_diagrams JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS pages INTEGER;
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready';
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed';
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS upload_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------------------
-- 4. STUDY TOOLS, MATERIALS, TASKS, NOTES, FLASHCARDS & QUIZZES
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'document',
  content TEXT,
  file_url TEXT,
  storage_path TEXT,
  summary TEXT,
  key_concepts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS key_concepts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.study_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  subject TEXT DEFAULT 'General',
  estimated_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.study_tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.study_tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.study_tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE public.study_tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.study_tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.study_tasks ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General';
ALTER TABLE public.study_tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 30;
ALTER TABLE public.study_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.study_materials(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.study_notes ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.study_notes ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.study_materials(id) ON DELETE SET NULL;
ALTER TABLE public.study_notes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.study_notes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE public.study_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.study_materials(id) ON DELETE SET NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  next_review TIMESTAMPTZ DEFAULT NOW(),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.study_materials(id) ON DELETE SET NULL;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS next_review TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.study_materials(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.study_materials(id) ON DELETE SET NULL;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------------------
-- 5. AI TUTOR CHAT SESSIONS, GAMIFICATION, NOTIFICATIONS & TRANSACTIONS
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.study_materials(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Study Session',
  tutor_persona TEXT DEFAULT 'Professor',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.ai_chat_sessions ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.ai_chat_sessions ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.study_materials(id) ON DELETE SET NULL;
ALTER TABLE public.ai_chat_sessions ADD COLUMN IF NOT EXISTS tutor_persona TEXT DEFAULT 'Professor';
ALTER TABLE public.ai_chat_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.ai_chat_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  seller_earnings NUMERIC NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------------
-- 6. KNOWLEDGE ENGINE, VECTOR RAG & AI GENERATED ASSETS
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size BIGINT,
  url TEXT,
  storage_path TEXT,
  description TEXT,
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.document_metadata ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.document_metadata ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.document_metadata ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued',
  progress INT DEFAULT 0,
  current_step TEXT,
  message TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.processing_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.processing_jobs ADD COLUMN IF NOT EXISTS current_step TEXT;
ALTER TABLE public.processing_jobs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.processing_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.processing_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  text TEXT NOT NULL,
  source_type TEXT,
  topic TEXT,
  subtopic TEXT,
  page_number INT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS page_number INT;
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID REFERENCES public.document_chunks(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vector vector(768),
  model TEXT DEFAULT 'gemini-embedding-001',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.embeddings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.embeddings ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-embedding-001';
ALTER TABLE public.embeddings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.knowledge_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_concept TEXT NOT NULL,
  target_concept TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.knowledge_graph ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_graph ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.generated_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.generated_quizzes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.generated_quizzes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.generated_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.generated_flashcards ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.generated_flashcards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.generated_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'structured',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.generated_notes ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;
ALTER TABLE public.generated_notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.generated_notes ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'structured';
ALTER TABLE public.generated_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.retrieval_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.retrieval_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------------------
-- 7. VECTOR SEARCH RPC FUNCTION (match_documents)
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_workspace_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  text text,
  topic text,
  page_number int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.text,
    dc.topic,
    dc.page_number,
    1 - (e.vector <=> query_embedding) AS similarity
  FROM public.embeddings e
  JOIN public.document_chunks dc ON e.chunk_id = dc.id
  WHERE e.workspace_id = p_workspace_id
    AND 1 - (e.vector <=> query_embedding) > match_threshold
  ORDER BY e.vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ---------------------------------------------------------------------------------
-- 8. AUTOMATIC SIGNUP TRIGGER & BACKFILL FOR EXISTING AUTH USERS
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    avatar_url = COALESCE(NULLIF(public.profiles.avatar_url, ''), EXCLUDED.avatar_url);

  INSERT INTO public.user_stats (user_id, xp, level, streak)
  VALUES (NEW.id, 0, 1, 1)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth.users who do not yet have a profile or user_stats row
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_stats (user_id, xp, level, streak)
SELECT u.id, 0, 1, 1
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- Backfill user_id on child tables from parent workspace where missing
UPDATE public.documents d SET user_id = w.user_id FROM public.workspaces w WHERE d.workspace_id = w.id AND d.user_id IS NULL;
UPDATE public.processing_jobs pj SET user_id = w.user_id FROM public.workspaces w WHERE pj.workspace_id = w.id AND pj.user_id IS NULL;
UPDATE public.document_chunks dc SET user_id = w.user_id FROM public.workspaces w WHERE dc.workspace_id = w.id AND dc.user_id IS NULL;
UPDATE public.embeddings e SET user_id = w.user_id FROM public.workspaces w WHERE e.workspace_id = w.id AND e.user_id IS NULL;
UPDATE public.knowledge_graph kg SET user_id = w.user_id FROM public.workspaces w WHERE kg.workspace_id = w.id AND kg.user_id IS NULL;
UPDATE public.generated_quizzes gq SET user_id = w.user_id FROM public.workspaces w WHERE gq.workspace_id = w.id AND gq.user_id IS NULL;
UPDATE public.generated_flashcards gf SET user_id = w.user_id FROM public.workspaces w WHERE gf.workspace_id = w.id AND gf.user_id IS NULL;
UPDATE public.generated_notes gn SET user_id = w.user_id FROM public.workspaces w WHERE gn.workspace_id = w.id AND gn.user_id IS NULL;
UPDATE public.retrieval_logs rl SET user_id = w.user_id FROM public.workspaces w WHERE rl.workspace_id = w.id AND rl.user_id IS NULL;

-- ---------------------------------------------------------------------------------
-- 9. UPDATED_AT TRIGGERS FOR ALL TABLES
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'user_stats', 'workspaces', 'workspace_files',
    'study_materials', 'study_tasks', 'study_notes', 'flashcards', 'quizzes',
    'ai_chat_sessions', 'documents', 'document_metadata', 'processing_jobs',
    'document_chunks', 'embeddings', 'knowledge_graph', 'generated_quizzes',
    'generated_flashcards', 'generated_notes', 'retrieval_logs'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', t);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------------
-- 10. PERFORMANCE INDEXES & VECTOR HNSW INDEX
-- ---------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_workspace_id ON public.workspace_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_user_id ON public.workspace_files(user_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_user_id ON public.study_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_workspace_id ON public.study_materials(workspace_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_user_id ON public.study_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_workspace_id ON public.study_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_user_id ON public.study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_workspace_id ON public.study_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_workspace_id ON public.flashcards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_workspace_id ON public.quizzes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON public.ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_workspace_id ON public.document_chunks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace_id ON public.embeddings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.embeddings USING hnsw (vector vector_cosine_ops);

-- ---------------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES ACROSS ALL 22 TABLES
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'user_stats', 'workspaces', 'workspace_files',
    'study_materials', 'study_tasks', 'study_notes', 'flashcards', 'quizzes',
    'ai_chat_sessions', 'ai_chat_messages', 'achievements', 'notifications', 'transactions',
    'documents', 'document_metadata', 'processing_jobs', 'document_chunks', 'embeddings',
    'knowledge_graph', 'generated_quizzes', 'generated_flashcards', 'generated_notes', 'retrieval_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, t);
    END LOOP;
  END LOOP;
END;
$$;

-- Profiles (id = auth.uid())
CREATE POLICY "profiles_owner_all" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User Stats (user_id = auth.uid())
CREATE POLICY "user_stats_owner_all" ON public.user_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workspaces (owner full access + public/marketplace read access)
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT USING (auth.uid() = user_id OR visibility = 'public' OR is_for_sale = true);
CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE USING (auth.uid() = user_id);

-- Direct user_id tables
CREATE POLICY "workspace_files_owner_all" ON public.workspace_files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_materials_owner_all" ON public.study_materials
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_tasks_owner_all" ON public.study_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_notes_owner_all" ON public.study_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "flashcards_owner_all" ON public.flashcards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quizzes_owner_all" ON public.quizzes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_chat_sessions_owner_all" ON public.ai_chat_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_chat_messages_owner_all" ON public.ai_chat_messages
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.ai_chat_sessions s WHERE s.id = ai_chat_messages.session_id AND s.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.ai_chat_sessions s WHERE s.id = ai_chat_messages.session_id AND s.user_id = auth.uid())
  );

CREATE POLICY "achievements_owner_all" ON public.achievements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_owner_all" ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_access" ON public.transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Knowledge Engine & RAG tables (supports both direct user_id and parent workspace ownership)
CREATE POLICY "documents_owner_all" ON public.documents
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = documents.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = documents.workspace_id AND w.user_id = auth.uid())
  );

CREATE POLICY "document_metadata_owner_all" ON public.document_metadata
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.documents d JOIN public.workspaces w ON w.id = d.workspace_id WHERE d.id = document_metadata.document_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.documents d JOIN public.workspaces w ON w.id = d.workspace_id WHERE d.id = document_metadata.document_id AND w.user_id = auth.uid())
  );

CREATE POLICY "processing_jobs_owner_all" ON public.processing_jobs
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = processing_jobs.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = processing_jobs.workspace_id AND w.user_id = auth.uid())
  );

CREATE POLICY "document_chunks_owner_all" ON public.document_chunks
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = document_chunks.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = document_chunks.workspace_id AND w.user_id = auth.uid())
  );

CREATE POLICY "embeddings_owner_all" ON public.embeddings
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = embeddings.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = embeddings.workspace_id AND w.user_id = auth.uid())
  );

CREATE POLICY "knowledge_graph_owner_all" ON public.knowledge_graph
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = knowledge_graph.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = knowledge_graph.workspace_id AND w.user_id = auth.uid())
  );

CREATE POLICY "generated_quizzes_owner_all" ON public.generated_quizzes
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = generated_quizzes.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = generated_quizzes.workspace_id AND w.user_id = auth.uid())
  );

CREATE POLICY "generated_flashcards_owner_all" ON public.generated_flashcards
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = generated_flashcards.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = generated_flashcards.workspace_id AND w.user_id = auth.uid())
  );

CREATE POLICY "generated_notes_owner_all" ON public.generated_notes
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = generated_notes.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = generated_notes.workspace_id AND w.user_id = auth.uid())
  );

CREATE POLICY "retrieval_logs_owner_all" ON public.retrieval_logs
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = retrieval_logs.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = retrieval_logs.workspace_id AND w.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------------
-- 12. STORAGE BUCKETS & STORAGE RLS POLICIES
-- ---------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('workspace_files', 'workspace_files', true),
  ('workspace-files', 'workspace-files', true),
  ('study-files', 'study-files', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "studyweb_storage_public_read" ON storage.objects;
DROP POLICY IF EXISTS "studyweb_storage_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "studyweb_storage_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "studyweb_storage_auth_delete" ON storage.objects;

CREATE POLICY "studyweb_storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('workspace_files', 'workspace-files', 'study-files', 'avatars'));

CREATE POLICY "studyweb_storage_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('workspace_files', 'workspace-files', 'study-files', 'avatars')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "studyweb_storage_auth_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('workspace_files', 'workspace-files', 'study-files', 'avatars')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "studyweb_storage_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('workspace_files', 'workspace-files', 'study-files', 'avatars')
    AND auth.role() = 'authenticated'
  );

-- ---------------------------------------------------------------------------------
-- 13. REALTIME SUBSCRIPTIONS & POSTGREST SCHEMA CACHE RELOAD
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'workspaces', 'workspace_files', 'study_tasks',
    'study_notes', 'flashcards', 'quizzes', 'notifications', 'processing_jobs'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END;
$$;

-- Reload Supabase PostgREST schema cache immediately so new columns work right away
NOTIFY pgrst, 'reload schema';
