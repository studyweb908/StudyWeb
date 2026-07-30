-- Create workspaces table
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
    last_opened TIMESTAMP WITH TIME ZONE,
    is_for_sale BOOLEAN DEFAULT FALSE,
    price NUMERIC,
    
    -- Store nested workspace items as JSONB arrays for easy frontend state mapping
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

-- Enable Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own workspaces
CREATE POLICY "Users can view their own workspaces"
ON workspaces FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own workspaces
CREATE POLICY "Users can insert their own workspaces"
ON workspaces FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own workspaces
CREATE POLICY "Users can update their own workspaces"
ON workspaces FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own workspaces
CREATE POLICY "Users can delete their own workspaces"
ON workspaces FOR DELETE
USING (auth.uid() = user_id);
