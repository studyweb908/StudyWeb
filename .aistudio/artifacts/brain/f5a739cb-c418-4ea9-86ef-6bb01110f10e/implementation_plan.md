# Implementation Plan: Full-Screen Onboarding, Workspace Studio & Context-First AI Tutor

## 1. Full-Screen Onboarding Experience (`src/components/OnboardingModal.tsx`)
- **Full-Viewport Canvas**: Replace the centered `max-w-xl` modal box with an immersive `fixed inset-0 w-screen h-screen` full-screen layout styled in the brand's clean slate and indigo/violet palette.
- **Top Progress Bar & Step Header**: Pin a sleek top navigation bar with a smooth animated progress bar (`Step X of 11`), step category label, and back button.
- **Instant Slide & Selection Feedback**:
  - Add crisp horizontal slide transitions (`x: 40 -> 0 -> -40`) and an instant selection confirmation state (brief loading/advancing indicator on the selected card) so clicking an answer feels responsive and fluid before advancing to the next question.
  - Ensure large, high-contrast option cards with clear typography and keyboard/click accessibility across desktop and mobile viewports.

## 2. Workspace Action Bar Alignment (`src/components/Dashboard/WorkspaceOverview.tsx`)
- **Balanced Single-Line Toolbar**: Redesign the workspace header action bar containing **All Workspaces**, **Upload Material**, **AI Tutor**, and **Delete** so all four buttons sit in a unified, well-proportioned control bar.
- **Visual Hierarchy & Grouping**:
  - Group navigation and primary actions (`All Workspaces`, `Upload Material`, `AI Tutor`) with consistent height (`h-10`), icon-to-label spacing, `whitespace-nowrap shrink-0`, and brand-aligned Indigo/Slate surfaces.
  - Place `Delete` with a subtle vertical divider or clean right-aligned separation so destructive actions are visually distinct yet harmoniously aligned with the toolbar.

## 3. Full-Screen Split-Screen Customize Workspace Studio (`src/components/Dashboard/EditWorkspaceModal.tsx`)
- **Full-Screen Split-Screen Layout**: Transform `EditWorkspaceModal` from a cramped centered dialog into a full-screen (`fixed inset-0 w-screen h-screen`) split-screen workspace studio.
- **Crafted Brand Aesthetic (Zero AI-Slop)**:
  - Remove all emoji-cluttered labels (`✨`, `🎨`, `🖼️`), thick left borders (`border-l-4`), and generic gradient text headers.
  - **Left Column (Interactive Controls)**: Clean, structured sections for Workspace Identity (Title, Subject Category, Description, Brand Color Palette), Icon/Logo Selection (curated academic symbols + custom image upload/URL), and Cover Banner Gallery (curated photography + custom upload/URL).
  - **Right Column (Live Interactive Workspace Preview)**: A real-time preview showing how the workspace header, subject badge, accent theme, icon, and cover artwork look inside the actual dashboard before saving.

## 4. Real-Time Workspace Uploads & Zero Dummy Data (`src/components/Dashboard/WorkspaceContainer.tsx`, `src/components/Dashboard/WorkspaceLibrary.tsx`, `src/services/FileUploadService.ts`)
- **Real-Time File & Content Sync**:
  - When a user uploads any document, image, audio, video, or web link, immediately persist and fetch the real extracted text, summary, highlights, and metadata from `/api/study-materials/process` and Supabase `workspace_files`.
  - Refresh the active workspace state in real time (`WorkspaceSyncService.fetchWorkspaceFiles`) upon upload completion so `WorkspaceOverview`, `WorkspaceLibrary`, and `WorkspaceChat` immediately reflect the exact uploaded files.
  - Strip any fallback dummy/mock strings so newly uploaded files only display authentic extracted content, real file sizes, and real timestamps.

## 5. AI Tutor Context Priority, Follow-Up Chips & Out-of-Workspace Research Confirmation (`server.ts`, `src/services/AITutorBackgroundService.ts`, `src/components/Dashboard/WorkspaceChat.tsx`)
- **Workspace-First Context Attribution**:
  - Prioritize uploaded files and notes in the active workspace (and across the user's workspaces when relevant).
  - Display a clear **Active Context Badge** on AI Tutor responses showing exactly which workspace and uploaded file(s) are being referenced.
- **Ambiguity & Out-of-Workspace Research Prompt**:
  - When a user asks about a topic that is not found in their uploaded workspace materials or is ambiguous, the AI Tutor will clearly state that the topic is not in the current workspace files and ask if they want to research it outside their workspace.
  - Render an interactive **"Research outside workspace"** action button on those responses that re-runs the query in general academic research mode with one click.
- **Clickable Follow-Up Question Chips**:
  - Return 2–3 contextual follow-up questions with every AI Tutor response and render them as interactive, clickable chips underneath the message so the user can continue exploring with a single click.
