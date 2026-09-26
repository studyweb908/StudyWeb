-- ==============================================================================
-- STUDYWEB SUPABASE MASTER SETUP SCRIPT
-- ==============================================================================
-- This script sets up everything requested:
--   1. User Profiles & Account Details (profiles table with auto-sync trigger from auth.users)
--   2. Onboarding Questionnaire Data (onboarding_data JSONB, academic level, goals, etc.)
--   3. User Workspace Data (workspaces, workspace_files for PDFs, screenshots, PPTs, docs)
--   4. Knowledge Engine & Vector Search (documents, document_chunks, pgvector embeddings)
--   5. AI Tutor RAG function (match_documents for AI Tutor to query Supabase data)
--   6. Storage Buckets (study-files & workspace-files for binary file uploads)
--   7. Row-Level Security (RLS) policies allowing users full access to their data
-- ==============================================================================

-- 1. Enable pgvector extension for AI semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. User Profiles & Account Details
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  current_study TEXT,            -- Academic grade / board (e.g. 10th CBSE, College, etc.)
  school_name TEXT,              -- School or university name
  age TEXT,                      -- Age or date of birth
  primary_goal TEXT,             -- Exam prep, homework, deep understanding
  study_routine TEXT,            -- Daily study hours or schedule
  weak_areas TEXT[],             -- Difficult subjects / focus areas
  strengths TEXT[],              -- Strong subjects
  learning_style TEXT,           -- Visual, reading, auditory, practice
  uses_ai BOOLEAN DEFAULT FALSE, -- Previous AI experience
  onboarding_data JSONB DEFAULT '{}'::jsonb, -- Full structured answers to onboarding questions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-sync trigger: Automatically creates a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = CASE 
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
      THEN EXCLUDED.full_name 
      ELSE public.profiles.full_name 
    END,
    avatar_url = CASE 
      WHEN public.profiles.avatar_url IS NULL OR public.profiles.avatar_url = '' 
      THEN EXCLUDED.avatar_url 
      ELSE public.profiles.avatar_url 
    END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth users into profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', ''), 
  COALESCE(raw_user_meta_data->>'avatar_url', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  color_theme TEXT,
  cover_image TEXT,
  emoji TEXT,
  visibility TEXT DEFAULT 'private',
  template TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  favorite BOOLEAN DEFAULT FALSE,
  streak INTEGER DEFAULT 0,
  study_hours INTEGER DEFAULT 0,
  last_opened TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_for_sale BOOLEAN DEFAULT FALSE,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Uploaded Workspace Files (PDFs, Screenshots, PPTs, Docs)
CREATE TABLE IF NOT EXISTS public.workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,                     -- 'pdf', 'ppt', 'image', 'doc', 'screenshot'
  size TEXT,                     -- e.g. '2.4 MB'
  url TEXT,                      -- Public or signed URL in Supabase Storage
  storage_path TEXT,             -- Path inside storage bucket
  summary TEXT,                  -- AI-generated overview
  transcription TEXT,            -- Extracted text / OCR / transcript
  tags TEXT[],                   -- Classification tags
  highlights TEXT[],             -- Extracted key passages
  formulas TEXT[],               -- Scientific/Math formulas
  extracted_diagrams TEXT[],     -- Extracted figure references
  pages INTEGER,                 -- Number of pages / slides
  status TEXT DEFAULT 'indexed', -- 'uploading', 'processing', 'indexed', 'ready'
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Knowledge Engine / RAG Tables (For AI Tutor Retrieval)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT,
  url TEXT,
  storage_path TEXT,
  description TEXT,
  status TEXT DEFAULT 'ready',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  current_step TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  chunk_index INTEGER,
  text TEXT NOT NULL,
  source_type TEXT,
  topic TEXT,
  subtopic TEXT,
  page_number INTEGER,
  language TEXT DEFAULT 'auto-detected',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  vector vector(768),
  model TEXT DEFAULT 'text-embedding-004',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generated_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  user_id UUID,
  query TEXT NOT NULL,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. AI Tutor Semantic Search Function (Used by AI Tutor to retrieve uploaded materials)
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(768),
  match_count int DEFAULT 8,
  p_workspace_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  workspace_id UUID,
  text TEXT,
  topic TEXT,
  subtopic TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.workspace_id,
    dc.text,
    dc.topic,
    dc.subtopic,
    1 - (e.vector <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  JOIN public.embeddings e ON e.chunk_id = dc.id
  WHERE (p_workspace_id IS NULL OR dc.workspace_id = p_workspace_id)
    AND (p_user_id IS NULL OR dc.user_id = p_user_id OR dc.user_id IS NULL)
  ORDER BY e.vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Supabase Storage Buckets for Uploaded Files
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-files', 'study-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files', 'workspace-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access study-files" ON storage.objects;
CREATE POLICY "Public Access study-files"
  ON storage.objects FOR SELECT
  USING ( bucket_id IN ('study-files', 'workspace-files') );

DROP POLICY IF EXISTS "Allow Uploads study-files" ON storage.objects;
CREATE POLICY "Allow Uploads study-files"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id IN ('study-files', 'workspace-files') );

DROP POLICY IF EXISTS "Allow Updates study-files" ON storage.objects;
CREATE POLICY "Allow Updates study-files"
  ON storage.objects FOR UPDATE
  USING ( bucket_id IN ('study-files', 'workspace-files') );

DROP POLICY IF EXISTS "Allow Deletes study-files" ON storage.objects;
CREATE POLICY "Allow Deletes study-files"
  ON storage.objects FOR DELETE
  USING ( bucket_id IN ('study-files', 'workspace-files') );

-- 8. Row Level Security (RLS) Configuration
-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of profiles" ON public.profiles;
CREATE POLICY "Allow public read of profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Workspaces RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;
CREATE POLICY "Users can view own workspaces" ON public.workspaces FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can insert own workspaces" ON public.workspaces;
CREATE POLICY "Users can insert own workspaces" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can update own workspaces" ON public.workspaces;
CREATE POLICY "Users can update own workspaces" ON public.workspaces FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can delete own workspaces" ON public.workspaces;
CREATE POLICY "Users can delete own workspaces" ON public.workspaces FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Workspace Files RLS
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own workspace files" ON public.workspace_files;
CREATE POLICY "Users can view own workspace files" ON public.workspace_files FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can insert own workspace files" ON public.workspace_files;
CREATE POLICY "Users can insert own workspace files" ON public.workspace_files FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can update own workspace files" ON public.workspace_files;
CREATE POLICY "Users can update own workspace files" ON public.workspace_files FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can delete own workspace files" ON public.workspace_files;
CREATE POLICY "Users can delete own workspace files" ON public.workspace_files FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Knowledge Engine RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all documents" ON public.documents;
CREATE POLICY "Enable all documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all processing_jobs" ON public.processing_jobs;
CREATE POLICY "Enable all processing_jobs" ON public.processing_jobs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all document_chunks" ON public.document_chunks;
CREATE POLICY "Enable all document_chunks" ON public.document_chunks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all embeddings" ON public.embeddings;
CREATE POLICY "Enable all embeddings" ON public.embeddings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.generated_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all generated_notes" ON public.generated_notes;
CREATE POLICY "Enable all generated_notes" ON public.generated_notes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.retrieval_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all retrieval_logs" ON public.retrieval_logs;
CREATE POLICY "Enable all retrieval_logs" ON public.retrieval_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for workspace_files
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.workspace_files, public.workspaces;
COMMIT;
