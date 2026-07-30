-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- 1. KNOWLEDGE ENGINE TABLES (ADVANCED RAG)
-- ==========================================

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
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
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    key TEXT NOT NULL,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing Jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
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
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
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
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    vector vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings USING hnsw (vector vector_cosine_ops);

-- Knowledge Graph
CREATE TABLE IF NOT EXISTS knowledge_graph (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    source_concept TEXT,
    target_concept TEXT,
    relationship TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Quizzes
CREATE TABLE IF NOT EXISTS generated_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT,
    questions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Flashcards
CREATE TABLE IF NOT EXISTS generated_flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    topic TEXT,
    cards JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Notes
CREATE TABLE IF NOT EXISTS generated_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retrieval Logs
CREATE TABLE IF NOT EXISTS retrieval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    query TEXT,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. SUPABASE RLS (ROW LEVEL SECURITY)
-- ==========================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to access ONLY their own workspaces
-- Assuming workspace ownership is verified via the auth.uid() matching the user_id of the workspace

CREATE POLICY "Users can access their workspace documents" 
ON documents FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their workspace document_metadata" 
ON document_metadata FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their workspace processing_jobs" 
ON processing_jobs FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their workspace document_chunks" 
ON document_chunks FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their workspace embeddings" 
ON embeddings FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their workspace knowledge_graph" 
ON knowledge_graph FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their workspace generated_quizzes" 
ON generated_quizzes FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their workspace generated_flashcards" 
ON generated_flashcards FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their workspace generated_notes" 
ON generated_notes FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their workspace retrieval_logs" 
ON retrieval_logs FOR ALL 
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- ==========================================
-- 3. MATCH DOCUMENTS FUNCTION (VECTOR SEARCH)
-- ==========================================
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_count int,
  p_workspace_id UUID,
  p_user_id UUID
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
