-- ==============================================================================
-- STUDYWEB PRODUCTION RLS & STORAGE HARDENING MIGRATION (NON-DESTRUCTIVE)
-- ==============================================================================
-- Purpose:
--   Remediates P0/P1 findings from the Pre-Launch Security & Privacy Audit:
--   1. Revokes overly permissive anon/authenticated USING(true) policies on
--      profiles, workspaces, workspace_files, documents, processing_jobs,
--      document_chunks, embeddings, generated_notes, and retrieval_logs.
--   2. Enforces strict ownership: auth.uid() = user_id (or auth.uid() = id on profiles).
--   3. Prevents privilege escalation on profiles (users can only access their own row).
--   4. Hardens match_documents() so p_user_id is enforced against auth.uid().
--   5. Restricts Storage bucket INSERT/UPDATE/DELETE to authenticated users writing
--      inside their own user folder (storage.foldername(name))[1] = auth.uid()::text.
--
-- Instructions:
--   Review and execute in the Supabase SQL Editor before public launch.
-- ==============================================================================

BEGIN;

-- 1. PROFILES: Strict self-only access (no public PII dump)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

REVOKE ALL ON TABLE public.profiles FROM anon;

-- 2. WORKSPACES: Strict owner-only CRUD (removes USING (true) & user_id IS NULL leaks)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated workspace CRUD" ON public.workspaces;
DROP POLICY IF EXISTS "Allow anon workspace CRUD" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can insert own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON public.workspaces;

CREATE POLICY "Users can view own workspaces"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.workspaces FROM anon;

-- 3. WORKSPACE_FILES: Strict owner-only CRUD
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated files CRUD" ON public.workspace_files;
DROP POLICY IF EXISTS "Allow anon files CRUD" ON public.workspace_files;
DROP POLICY IF EXISTS "Users can view own workspace files" ON public.workspace_files;
DROP POLICY IF EXISTS "Users can insert own workspace files" ON public.workspace_files;
DROP POLICY IF EXISTS "Users can update own workspace files" ON public.workspace_files;
DROP POLICY IF EXISTS "Users can delete own workspace files" ON public.workspace_files;

CREATE POLICY "Users can view own workspace files"
  ON public.workspace_files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspace files"
  ON public.workspace_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspace files"
  ON public.workspace_files FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspace files"
  ON public.workspace_files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.workspace_files FROM anon;

-- 4. KNOWLEDGE ENGINE / RAG TABLES: Strict owner-only CRUD
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all documents" ON public.documents;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Enable all for anon users" ON public.documents;
DROP POLICY IF EXISTS "Users can access their workspace documents" ON public.documents;
CREATE POLICY "Users can access their workspace documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON TABLE public.documents FROM anon;

ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all processing_jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.processing_jobs;
DROP POLICY IF EXISTS "Enable all for anon users" ON public.processing_jobs;
DROP POLICY IF EXISTS "Users can access their workspace processing_jobs" ON public.processing_jobs;
CREATE POLICY "Users can access their workspace processing_jobs"
  ON public.processing_jobs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON TABLE public.processing_jobs FROM anon;

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all document_chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.document_chunks;
DROP POLICY IF EXISTS "Enable all for anon users" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can access their workspace document_chunks" ON public.document_chunks;
CREATE POLICY "Users can access their workspace document_chunks"
  ON public.document_chunks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON TABLE public.document_chunks FROM anon;

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.embeddings;
DROP POLICY IF EXISTS "Enable all for anon users" ON public.embeddings;
DROP POLICY IF EXISTS "Users can access their workspace embeddings" ON public.embeddings;
CREATE POLICY "Users can access their workspace embeddings"
  ON public.embeddings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.document_chunks dc
      WHERE dc.id = embeddings.chunk_id AND dc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.document_chunks dc
      WHERE dc.id = embeddings.chunk_id AND dc.user_id = auth.uid()
    )
  );
REVOKE ALL ON TABLE public.embeddings FROM anon;

ALTER TABLE public.generated_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all generated_notes" ON public.generated_notes;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.generated_notes;
DROP POLICY IF EXISTS "Enable all for anon users" ON public.generated_notes;
DROP POLICY IF EXISTS "Users can access their workspace generated_notes" ON public.generated_notes;
CREATE POLICY "Users can access their workspace generated_notes"
  ON public.generated_notes FOR ALL
  TO authenticated
  USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
  );
REVOKE ALL ON TABLE public.generated_notes FROM anon;

ALTER TABLE public.retrieval_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all retrieval_logs" ON public.retrieval_logs;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.retrieval_logs;
DROP POLICY IF EXISTS "Enable all for anon users" ON public.retrieval_logs;
DROP POLICY IF EXISTS "Users can access their workspace retrieval_logs" ON public.retrieval_logs;
CREATE POLICY "Users can access their workspace retrieval_logs"
  ON public.retrieval_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON TABLE public.retrieval_logs FROM anon;

-- 5. HARDENED VECTOR SEARCH RPC (Enforces caller's auth.uid())
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
SECURITY INVOKER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for match_documents';
  END IF;

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
  WHERE dc.user_id = auth.uid()
    AND (p_workspace_id IS NULL OR dc.workspace_id = p_workspace_id)
  ORDER BY e.vector <=> query_embedding
  LIMIT LEAST(match_count, 25);
END;
$$;

REVOKE ALL ON FUNCTION public.match_documents(vector(768), int, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_documents(vector(768), int, uuid, uuid) TO authenticated;

-- 6. STORAGE BUCKETS: Make study-files & workspace-files private and enforce owner path prefix
UPDATE storage.buckets SET public = false WHERE id IN ('study-files', 'workspace-files');

DROP POLICY IF EXISTS "Public Access study-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads study-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates study-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes study-files" ON storage.objects;

CREATE POLICY "Authenticated users read own study files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('study-files', 'workspace-files')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users upload own study files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('study-files', 'workspace-files')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users update own study files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('study-files', 'workspace-files')
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('study-files', 'workspace-files')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users delete own study files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('study-files', 'workspace-files')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;
