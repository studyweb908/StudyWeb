-- ==========================================
-- STUDYWEB SUPABASE SCHEMA (CLEAN START)
-- ==========================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing tables to start completely fresh (CASCADE handles dependencies)
DROP TABLE IF EXISTS retrieval_logs CASCADE;
DROP TABLE IF EXISTS generated_notes CASCADE;
DROP TABLE IF EXISTS generated_flashcards CASCADE;
DROP TABLE IF EXISTS generated_quizzes CASCADE;
DROP TABLE IF EXISTS knowledge_graph CASCADE;
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS processing_jobs CASCADE;
DROP TABLE IF EXISTS document_metadata CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS workspace_files CASCADE;
DROP TABLE IF EXISTS workspace_flashcards CASCADE;
DROP TABLE IF EXISTS workspace_quizzes CASCADE;
DROP TABLE IF EXISTS workspace_notes CASCADE;
DROP TABLE IF EXISTS workspace_planner_tasks CASCADE;
DROP TABLE IF EXISTS concept_links CASCADE;
DROP TABLE IF EXISTS concept_nodes CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS match_documents CASCADE;

-- 3. Create Core Tables
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  academic_level TEXT,
  onboarding_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE workspaces (
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

CREATE TABLE workspace_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    size TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    pages INTEGER,
    tags TEXT[],
    summary TEXT,
    highlights TEXT[],
    transcription TEXT,
    extracted_diagrams TEXT[],
    formulas TEXT[],
    url TEXT
);

CREATE TABLE workspace_flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    topic TEXT,
    difficulty TEXT,
    box INTEGER DEFAULT 1,
    bookmarked BOOLEAN DEFAULT FALSE,
    last_studied TIMESTAMP WITH TIME ZONE
);

CREATE TABLE workspace_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation TEXT,
    difficulty TEXT,
    type TEXT
);

CREATE TABLE workspace_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT[],
    linked_concepts TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE workspace_planner_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    priority TEXT,
    completed BOOLEAN DEFAULT FALSE,
    revision_box INTEGER
);

-- 4. Create RAG / AI Knowledge Tables
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE document_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    topic TEXT,
    subtopic TEXT,
    source_type TEXT,
    page_number INTEGER,
    language TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    vector vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings USING hnsw (vector vector_cosine_ops);

-- 5. Create Vector Search Function
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_count int,
  p_workspace_id TEXT,
  p_user_id TEXT
) RETURNS TABLE (
  id uuid,
  chunk_id uuid,
  document_id uuid,
  text text,
  topic text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.chunk_id,
    e.document_id,
    c.text,
    c.topic,
    1 - (e.vector <=> query_embedding) AS similarity
  FROM embeddings e
  JOIN document_chunks c ON c.id = e.chunk_id
  WHERE e.workspace_id = p_workspace_id
  ORDER BY e.vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Basic RLS Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING ( auth.uid() = id );
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING ( auth.uid() = id );
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK ( auth.uid() = id );

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workspaces" ON workspaces FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY "Users can insert own workspaces" ON workspaces FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY "Users can update own workspaces" ON workspaces FOR UPDATE USING ( auth.uid() = user_id );
CREATE POLICY "Users can delete own workspaces" ON workspaces FOR DELETE USING ( auth.uid() = user_id );

ALTER TABLE workspace_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workspace files" ON workspace_files FOR SELECT USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_files.workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own workspace files" ON workspace_files FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_files.workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own workspace files" ON workspace_files FOR UPDATE USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_files.workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own workspace files" ON workspace_files FOR DELETE USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_files.workspace_id AND user_id = auth.uid()));

-- Enable Realtime for workspace files
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table workspace_files;
