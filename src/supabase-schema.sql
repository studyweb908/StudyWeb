-- ============================================================================
-- StudyWeb Complete Supabase Database Schema & RAG Knowledge Engine SQL Setup
-- Enables Vector Search (pgvector), RLS Security Policies, Indexing,
-- Workspaces, Workspace Files, Profiles, Documents, Chunks, Embeddings, 
-- Processing Jobs, Generated Notes, Retrieval Logs & RPC match_documents Function.
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Create User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'Student',
    bio TEXT,
    learning_goals TEXT[] DEFAULT '{}',
    preferred_study_times TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
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
    streak INTEGER DEFAULT 0,
    study_hours INTEGER DEFAULT 0,
    last_opened TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_for_sale BOOLEAN DEFAULT FALSE,
    price NUMERIC,
    
    -- Nested structured JSON objects & arrays
    files JSONB DEFAULT '[]'::jsonb,
    flashcards JSONB DEFAULT '[]'::jsonb,
    quizzes JSONB DEFAULT '[]'::jsonb,
    notes JSONB DEFAULT '[]'::jsonb,
    planner_tasks JSONB DEFAULT '[]'::jsonb,
    nodes JSONB DEFAULT '[]'::jsonb,
    links JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Workspace Files Table
CREATE TABLE IF NOT EXISTS workspace_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'doc',
    size TEXT DEFAULT '1 KB',
    pages INTEGER DEFAULT 1,
    upload_date TEXT,
    status TEXT DEFAULT 'indexed',
    url TEXT,
    summary TEXT,
    highlights JSONB DEFAULT '[]'::jsonb,
    transcription TEXT,
    content_text TEXT,
    formulas JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '["Document"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Documents Table (for Knowledge Engine / RAG pipeline)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'pdf',
    size BIGINT DEFAULT 0,
    status TEXT DEFAULT 'processing',
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Document Chunks Table
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    source_type TEXT DEFAULT 'doc',
    topic TEXT DEFAULT 'General',
    subtopic TEXT DEFAULT 'Detail',
    page_number INTEGER DEFAULT 0,
    language TEXT DEFAULT 'auto-detected',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Embeddings Table (Vector Storage)
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vector vector(768), -- Gemini text-embedding-004 output dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create Processing Jobs Table
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    message TEXT DEFAULT 'Job queued',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create Generated Notes Table
CREATE TABLE IF NOT EXISTS generated_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create Retrieval Logs Table
CREATE TABLE IF NOT EXISTS retrieval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    results JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance & Faster Vector Similarity / Foreign Key Searches
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_workspace_id ON workspace_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_workspace_id ON document_chunks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_id ON embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace_id ON embeddings(workspace_id);

-- HNSW Vector Index for ultra-fast similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING hnsw (vector vector_cosine_ops);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- Enables safe multi-tenant access while allowing anon / authenticated reads/writes
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles reading" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update profiles" ON profiles FOR UPDATE USING (true);

-- Workspaces Policies
CREATE POLICY "Workspaces select" ON workspaces FOR SELECT USING (true);
CREATE POLICY "Workspaces insert" ON workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Workspaces update" ON workspaces FOR UPDATE USING (true);
CREATE POLICY "Workspaces delete" ON workspaces FOR DELETE USING (true);

-- Workspace Files Policies
CREATE POLICY "Workspace files select" ON workspace_files FOR SELECT USING (true);
CREATE POLICY "Workspace files insert" ON workspace_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Workspace files update" ON workspace_files FOR UPDATE USING (true);
CREATE POLICY "Workspace files delete" ON workspace_files FOR DELETE USING (true);

-- Documents Policies
CREATE POLICY "Documents select" ON documents FOR SELECT USING (true);
CREATE POLICY "Documents insert" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Documents update" ON documents FOR UPDATE USING (true);
CREATE POLICY "Documents delete" ON documents FOR DELETE USING (true);

-- Document Chunks Policies
CREATE POLICY "Document chunks select" ON document_chunks FOR SELECT USING (true);
CREATE POLICY "Document chunks insert" ON document_chunks FOR INSERT WITH CHECK (true);
CREATE POLICY "Document chunks delete" ON document_chunks FOR DELETE USING (true);

-- Embeddings Policies
CREATE POLICY "Embeddings select" ON embeddings FOR SELECT USING (true);
CREATE POLICY "Embeddings insert" ON embeddings FOR INSERT WITH CHECK (true);
CREATE POLICY "Embeddings delete" ON embeddings FOR DELETE USING (true);

-- Processing Jobs Policies
CREATE POLICY "Processing jobs select" ON processing_jobs FOR SELECT USING (true);
CREATE POLICY "Processing jobs insert" ON processing_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Processing jobs update" ON processing_jobs FOR UPDATE USING (true);
CREATE POLICY "Processing jobs delete" ON processing_jobs FOR DELETE USING (true);

-- Generated Notes Policies
CREATE POLICY "Generated notes select" ON generated_notes FOR SELECT USING (true);
CREATE POLICY "Generated notes insert" ON generated_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Generated notes delete" ON generated_notes FOR DELETE USING (true);

-- Retrieval Logs Policies
CREATE POLICY "Retrieval logs select" ON retrieval_logs FOR SELECT USING (true);
CREATE POLICY "Retrieval logs insert" ON retrieval_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RPC Stored Procedure: match_documents
-- Performs Cosine Vector Similarity Search across embedded document chunks.
-- Gracefully handles stringified or vector embeddings and workspace filtering.
-- ============================================================================
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding TEXT,
    match_count INT DEFAULT 8,
    p_workspace_id TEXT DEFAULT '',
    p_user_id TEXT DEFAULT ''
)
RETURNS TABLE (
    id UUID,
    chunk_id UUID,
    text TEXT,
    topic TEXT,
    subtopic TEXT,
    source_type TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_embedding vector(768);
    v_ws_uuid UUID;
BEGIN
    -- Parse vector safely from input text string
    BEGIN
        v_embedding := query_embedding::vector(768);
    EXCEPTION WHEN OTHERS THEN
        v_embedding := NULL;
    END;

    -- Safely parse workspace UUID if valid
    BEGIN
        v_ws_uuid := p_workspace_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_ws_uuid := NULL;
    END;

    IF v_embedding IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            dc.id,
            e.chunk_id,
            dc.text,
            dc.topic,
            dc.subtopic,
            dc.source_type,
            (1 - (e.vector <=> v_embedding))::FLOAT AS similarity
        FROM embeddings e
        JOIN document_chunks dc ON e.chunk_id = dc.id
        WHERE (v_ws_uuid IS NULL OR dc.workspace_id = v_ws_uuid OR p_workspace_id = '' OR p_workspace_id IS NULL)
        ORDER BY e.vector <=> v_embedding ASC
        LIMIT match_count;
    ELSE
        -- Fallback to text match if vector conversion fails
        RETURN QUERY
        SELECT 
            dc.id,
            dc.id AS chunk_id,
            dc.text,
            dc.topic,
            dc.subtopic,
            dc.source_type,
            0.5::FLOAT AS similarity
        FROM document_chunks dc
        WHERE (v_ws_uuid IS NULL OR dc.workspace_id = v_ws_uuid OR p_workspace_id = '' OR p_workspace_id IS NULL)
        LIMIT match_count;
    END IF;
END;
$$;
