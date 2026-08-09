-- ==========================================
-- STUDYWEB SUPABASE SCHEMA (RAG + CORE)
-- ==========================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables to start fresh (CASCADE to handle dependencies)
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


-- ==========================================
-- 0. CORE WORKSPACE TABLES
-- ==========================================
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- References auth.users(id) if using Supabase Auth
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace Files
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

-- Workspace Flashcards
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

-- Workspace Quizzes
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

-- Workspace Notes
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

-- Workspace Planner Tasks
CREATE TABLE workspace_planner_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    priority TEXT,
    completed BOOLEAN DEFAULT FALSE,
    revision_box INTEGER
);

-- Concept Nodes
CREATE TABLE concept_nodes (
    id TEXT PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    label TEXT,
    type TEXT,
    color TEXT,
    x NUMERIC,
    y NUMERIC,
    details TEXT
);

-- Concept Links
CREATE TABLE concept_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    source TEXT REFERENCES concept_nodes(id) ON DELETE CASCADE,
    target TEXT REFERENCES concept_nodes(id) ON DELETE CASCADE,
    label TEXT
);


-- ==========================================
-- 1. KNOWLEDGE ENGINE TABLES (ADVANCED RAG)
-- ==========================================

-- Documents
CREATE TABLE IF NOT EXISTS documents (
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

-- Document Metadata
CREATE TABLE IF NOT EXISTS document_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing Jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
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

-- Document Chunks
CREATE TABLE IF NOT EXISTS document_chunks (
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

-- Embeddings
CREATE TABLE IF NOT EXISTS embeddings (
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

-- Knowledge Graph
CREATE TABLE IF NOT EXISTS knowledge_graph (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    source_concept TEXT,
    target_concept TEXT,
    relationship TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Quizzes
CREATE TABLE IF NOT EXISTS generated_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT,
    questions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Flashcards
CREATE TABLE IF NOT EXISTS generated_flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    topic TEXT,
    cards JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Notes
CREATE TABLE IF NOT EXISTS generated_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retrieval Logs
CREATE TABLE IF NOT EXISTS retrieval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    query TEXT,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 2. MATCH DOCUMENTS FUNCTION (VECTOR SEARCH)
-- ==========================================
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
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  academic_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING ( auth.uid() = id );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );
CREATE TABLE IF NOT EXISTS workspaces (
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

-- Enable Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Create Policies for CRUD operations
CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING ( auth.uid() = user_id );
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB;
-- Enable RLS and create policies for all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON documents FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for anon users" ON documents FOR ALL USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon');

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON processing_jobs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for anon users" ON processing_jobs FOR ALL USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon');

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON document_chunks FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for anon users" ON document_chunks FOR ALL USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon');

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON embeddings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for anon users" ON embeddings FOR ALL USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon');

ALTER TABLE generated_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON generated_notes FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for anon users" ON generated_notes FOR ALL USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon');

ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON document_metadata FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for anon users" ON document_metadata FOR ALL USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon');

ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON retrieval_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for anon users" ON retrieval_logs FOR ALL USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon');

-- Enable RLS for workspace_files
ALTER TABLE workspace_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workspace files"
  ON workspace_files FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_files.workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own workspace files"
  ON workspace_files FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_files.workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own workspace files"
  ON workspace_files FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_files.workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own workspace files"
  ON workspace_files FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_files.workspace_id AND user_id = auth.uid()));

-- Enable realtime for workspace_files
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table workspace_files;
