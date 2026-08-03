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
