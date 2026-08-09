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
