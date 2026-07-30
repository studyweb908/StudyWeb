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
