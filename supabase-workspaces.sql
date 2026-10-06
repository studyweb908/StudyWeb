-- ========================================================
-- StudyWeb: Complete Supabase Schema for Workspaces & Files
-- Run this script in your Supabase SQL Editor
-- ========================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  color_theme TEXT DEFAULT 'indigo',
  cover_image TEXT,
  emoji TEXT DEFAULT '🧬',
  visibility TEXT DEFAULT 'private',
  template TEXT DEFAULT 'custom',
  pinned BOOLEAN DEFAULT FALSE,
  favorite BOOLEAN DEFAULT FALSE,
  streak INTEGER DEFAULT 1,
  study_hours INTEGER DEFAULT 0,
  last_opened TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_for_sale BOOLEAN DEFAULT FALSE,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Workspace Files Table (Stores all files, PDFs, docs, videos uploaded into workspaces)
CREATE TABLE IF NOT EXISTS public.workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'doc',
  size TEXT NOT NULL DEFAULT '1 KB',
  url TEXT,
  storage_path TEXT,
  summary TEXT,
  transcription TEXT,
  tags TEXT[] DEFAULT ARRAY['Document']::TEXT[],
  highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
  formulas TEXT[] DEFAULT ARRAY[]::TEXT[],
  extracted_diagrams TEXT[] DEFAULT ARRAY[]::TEXT[],
  pages INTEGER,
  status TEXT DEFAULT 'indexed',
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Fast Query Indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON public.workspaces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_files_workspace_id ON public.workspace_files(workspace_id);

-- 5. Row Level Security (RLS)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow authenticated workspace CRUD" ON public.workspaces;
DROP POLICY IF EXISTS "Allow anon workspace CRUD" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can insert own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON public.workspaces;

DROP POLICY IF EXISTS "Allow authenticated files CRUD" ON public.workspace_files;
DROP POLICY IF EXISTS "Allow anon files CRUD" ON public.workspace_files;
DROP POLICY IF EXISTS "Users can view own workspace files" ON public.workspace_files;
DROP POLICY IF EXISTS "Users can insert own workspace files" ON public.workspace_files;
DROP POLICY IF EXISTS "Users can update own workspace files" ON public.workspace_files;
DROP POLICY IF EXISTS "Users can delete own workspace files" ON public.workspace_files;

-- Workspaces Policies (supports both logged-in users and guest sessions)
CREATE POLICY "Allow authenticated workspace CRUD"
  ON public.workspaces
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon workspace CRUD"
  ON public.workspaces
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Workspace Files Policies
CREATE POLICY "Allow authenticated files CRUD"
  ON public.workspace_files
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon files CRUD"
  ON public.workspace_files
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 6. Grants
GRANT ALL ON TABLE public.workspaces TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.workspace_files TO anon, authenticated, service_role;
