# Implementation Plan: AI Tutor Image Analysis, Supabase Persistence, Customize Workspace Redesign & Error Logging

## Goal & Overview
Ensure that uploaded images and study materials in a workspace are accurately analyzed by Gemini Vision on upload, saved to Supabase, and used exclusively from the active workspace when answering AI Tutor questions—eliminating any cross-workspace contamination (such as unrelated "Cell" workspace content) or dummy fallback text. In addition, redesign the Customize Workspace screen into a clean, tabbed full-width card layout without the live workspace preview, and report any Supabase or AI errors via toast notifications alongside detailed browser console and server terminal logs.

---

## Key Features & Changes

### 1. AI Image Analysis on Upload & Supabase Persistence
- **Fast Gemini Vision Extraction on Upload**:
  - Update the `/api/study-materials/process` and `/api/analyze-resource` pipelines to analyze uploaded images (`PNG`, `JPG`, `WEBP`, etc.) using `gemini-3-flash-preview` with `ThinkingLevel.MINIMAL` so visual OCR, UI/tool names, diagrams, and key concepts are extracted within seconds without timing out.
  - Ensure drag-and-drop and file-picker uploads in both the **Workspace Library** and **AI Tutor Chat** properly classify `image/*` files and wait for the AI analysis response before completing indexing.
- **Full Supabase Persistence**:
  - Save the extracted `summary`, `transcription` / OCR text, `content_text`, `highlights`, `tags`, and optimized image preview URL into the Supabase `workspace_files` table and workspace state via `WorkspaceSyncService.saveWorkspaceFile`.
  - Remove all hardcoded subject fallbacks (such as cell biology, calculus, or chemistry placeholder text) across backend and frontend pipelines so only genuine extracted content is ever stored or returned.

### 2. Strict Active-Workspace Context in AI Tutor
- **Isolate Active Workspace Materials**:
  - Update `WorkspaceChat` and `AITutorWorkspace` so queries about uploaded materials (e.g., *"What is in my study material?"*) prioritize and use the **currently active workspace's files** rather than merging files from older or unrelated workspaces (like a previous "Cell" workspace).
  - Pass both the persisted Supabase analysis (`summary`, `transcription`, `highlights`) and inline image data (`fileBase64` / `fileMimeType`) for active workspace images to `/api/ai-tutor` so Gemini can directly inspect the uploaded image as well as its indexed text.
  - Retrieve persisted `workspace_files` from Supabase for the active `workspaceId` on the server if any file metadata is missing from the client payload.

### 3. Customize Workspace Full-Width Tabbed Card Layout (No Live Preview)
- **Remove Live Workspace Preview**:
  - Remove the right-side "Live Workspace Preview" panel and its preview cards from `EditWorkspaceModal`.
- **Tabbed Full-Width Card Studio**:
  - Arrange the full-screen Customize Workspace page into a clean, centered full-width card layout featuring the three section tabs (**Identity & Emblem**, **Brand Theme**, and **Cover Artwork**) with spacious controls and instant save/reset actions in the header.

### 4. Structured Error Logging & Toast Notifications
- **Server Terminal & Browser Console Logging**:
  - Log every Supabase database/storage error and Gemini API error with a structured prefix (`[Supabase Error]` / `[AI Tutor Error]`), operation name, HTTP/Postgres error code, and detailed message in both the server terminal and browser developer console.
- **Toast Popup with Error Code & Message**:
  - Trigger a toast notification (`window.showToast`) displaying the specific error code and message whenever a Supabase sync, material upload analysis, or AI Tutor request encounters an error.

---

## Architecture & File Touchpoints
- `server/studyMaterialPipeline.ts` & `server.ts`: Fast multimodal image analysis (`ThinkingLevel.MINIMAL`), removal of static biology/math/chemistry fallback generators, active-workspace RAG filtering, and structured server terminal error logging.
- `src/services/WorkspaceSyncService.ts`: Persist analyzed image summaries, transcriptions, highlights, and compressed image data to Supabase `workspace_files`, and surface Supabase error codes/messages via console logs and toast notifications.
- `src/components/Dashboard/WorkspaceLibrary.tsx`: Fix drag-and-drop image type detection, extend upload analysis timeout for multimodal vision processing, and persist AI-extracted image content to Supabase.
- `src/components/Dashboard/WorkspaceChat.tsx` & `src/components/Dashboard/AITutorWorkspace.tsx`: Scope study material context strictly to the active workspace, analyze images attached directly in chat, include active workspace image data in AI Tutor requests, and trigger toast notifications with error codes on failures.
- `src/components/Dashboard/EditWorkspaceModal.tsx`: Remove the Live Workspace Preview column and implement the tabbed full-width card layout for Identity & Emblem, Brand Theme, and Cover Artwork.
