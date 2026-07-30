-- ==========================================
-- STUDYWEB SUPABASE SCHEMA (RAG + CORE)
-- ==========================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

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
-- 2. SUPABASE RLS (ROW LEVEL SECURITY) FIXES
-- ==========================================
-- Disable RLS for server-side processing for the prototype
-- Or, allow anon access to these tables for the API to work seamlessly

ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_metadata DISABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_graph DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_flashcards DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_logs DISABLE ROW LEVEL SECURITY;

-- (Optional) If you prefer to have RLS enabled, run these instead:
/*
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for anon/authenticated" ON documents FOR ALL USING (true) WITH CHECK (true);
*/

-- ==========================================
-- 3. MATCH DOCUMENTS FUNCTION (VECTOR SEARCH)
-- ==========================================
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_count int,
  p_workspace_id text,
  p_user_id text
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
  WHERE e.workspace_id = p_workspace_id AND e.user_id = p_user_id
  ORDER BY e.vector <=> query_embedding
  LIMIT match_count;
END;
$$;
