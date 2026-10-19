-- ============================================================================
-- STUDYWEB SQL MIGRATION: Material Title Repair & Source URL / Processing Status
-- ============================================================================

-- 1. Ensure workspace_files (materials) table has source_url and processing_status columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_files' AND column_name = 'source_url') THEN
        ALTER TABLE public.workspace_files ADD COLUMN source_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_files' AND column_name = 'processing_status') THEN
        ALTER TABLE public.workspace_files ADD COLUMN processing_status TEXT DEFAULT 'indexed';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_files' AND column_name = 'url') THEN
        ALTER TABLE public.workspace_files ADD COLUMN url TEXT;
    END IF;
END $$;

-- 2. Backfill source_url from url or name if source_url is currently null
UPDATE public.workspace_files
SET source_url = COALESCE(url, name)
WHERE source_url IS NULL AND (name LIKE 'http://%' OR name LIKE 'https://%');

-- 3. Repair existing records where the name/title column contains a raw URL string instead of a resolved title
UPDATE public.workspace_files
SET 
    source_url = COALESCE(source_url, name),
    name = CASE 
        WHEN name LIKE '%youtube.com/watch%' OR name LIKE '%youtu.be/%' THEN 'YouTube Video'
        WHEN name LIKE '%pdf%' THEN 'PDF Document'
        ELSE 'Web Article'
    END,
    processing_status = 'indexed'
WHERE name LIKE 'http://%' OR name LIKE 'https://%';

-- 4. Create indexes for rapid lookups
CREATE INDEX IF NOT EXISTS idx_workspace_files_source_url ON public.workspace_files(source_url);
CREATE INDEX IF NOT EXISTS idx_workspace_files_processing_status ON public.workspace_files(processing_status);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
