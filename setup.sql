-- Create the workspace_files table
CREATE TABLE public.workspace_files (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  size text,
  status text,
  summary text,
  upload_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Turn on Realtime for workspace_files
alter publication supabase_realtime add table public.workspace_files;
