# Implementation Plan: Minimal StudyWeb AI Tutor Loader, Home 3-Step Mastery Polish (Frozen Step 3), & Full-Screen Upload Upgrade

## 1. Minimal StudyWeb Logo Loading Animation in AI Tutor
- **Goal**: Replace the current boxed spinner in the AI Tutor with a minimal, industry-grade inline loading animation featuring the official StudyWeb logo (`/logo-inner.png`) and no outer chat bubble or `"Thinking..."` text.
- **Changes (`/src/components/Dashboard/WorkspaceChat.tsx` & `/src/components/Dashboard/AITutorWorkspace.tsx`)**:
  - Remove the chat bubble wrapper, ping rings, and spinning Lucide icon.
  - Render a clean, boxless inline indicator featuring the official `/logo-inner.png` mark with a smooth, subtle breathing pulse (`scale` and `opacity` harmonic easing) and a soft radial indigo/violet glow behind the logo.

## 2. Home Dashboard: Upgraded "3 Steps to Exam & Interview Mastery" with Frozen Step 3
- **Goal**: Elevate the visual quality of the 3-step onboarding card on the Home screen and freeze Step 3 (`Complete a quiz or daily study goal`) as `"Coming Soon"` so users cannot click it.
- **Changes (`/src/components/Dashboard/DashboardHome.tsx`)**:
  - Redesign the 3-step cards with clean iconography (`UploadCloud`, `Sparkles`, and `Lock`), refined borders, and live workspace status indicators.
  - Freeze **Step 03 ("Complete a quiz or daily study goal")**:
    - Display a `"Coming Soon"` lock badge in the card header.
    - Disable the Step 3 button (`disabled`, `cursor-not-allowed`, muted slate styling) with a lock icon and `"Coming Soon"` label so it cannot be clicked.

## 3. Full-Screen Upload Overlay Polish (Zero "Supabase" Mentions)
- **Goal**: Make the full-screen upload and analysis overlay feel cohesive and high-craft while ensuring it never mentions `"Supabase"` or backend database terms—only showing user-friendly status messages like `"Uploading your material..."`.
- **Changes (`/src/components/Dashboard/FullScreenUploadOverlay.tsx`, `/src/components/Dashboard/WorkspaceChat.tsx`, `/src/components/Dashboard/WorkspaceLibrary.tsx`)**:
  - Integrate the StudyWeb logo (`/logo-inner.png`) and a clean 3-stage visual progress tracker (`Uploading Material` → `Analyzing Content` → `Ready in Workspace`).
  - Sanitize all upload step descriptions so any reference to `"Supabase"` is replaced with `"Uploading your material..."` and `"Analyzing your study material..."`.
