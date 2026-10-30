# Implementation Plan: Duolingo-Style Full-Screen Streak Celebration & Pure White Upload Screen

## 1. Daily Streak Engine & Duolingo-Style Full-Screen Streak Celebration Modal
- **Goal**: Track the user's real daily study streak across days, display a live streak counter in the top header and Home banner, and trigger a full-screen Duolingo-inspired Streak Celebration animation whenever today's study task is completed (or when the user clicks their streak badge to inspect their progress).
- **New Streak Service (`/src/utils/streakTracker.ts`)**:
  - Maintain per-user daily streak state (`currentStreak`, `longestStreak`, `completedDates` ISO `YYYY-MM-DD` array, `lastCompletedDate`, and weekly 7-day status `Su Mo Tu We Th Fr Sa`).
  - Automatically increment the streak and dispatch a `studyweb-streak-celebrate` event the first time each day the user completes a study task (uploading study material, asking the AI Tutor a question, or creating a study note), while also allowing the user to open the full-screen streak view anytime from the header or Home screen.
- **Full-Screen Streak Celebration Component (`/src/components/Dashboard/StreakCelebrationModal.tsx`)**:
  - Modeled after the Duolingo Extended Streak screen:
    - Animated multi-layered flame hero illustration with glowing embers.
    - Giant animated streak number counter (`1`, `2`, `3`...) with bold `"day streak!"` headline and `"You completed today's study task!"` subtitle.
    - Rounded 7-day weekly progress card (`Su`, `Mo`, `Tu`, `We`, `Th`, `Fr`, `Sa`) with animated orange/gold checkmarks for completed days and a today highlight ring.
    - Tactile full-width `"CONTINUE"` button and Apple-style glass pop sound on celebration.
- **Header & Home Live Streak Badge (`/src/components/Dashboard/DashboardHeader.tsx` & `/src/components/Dashboard/DashboardHome.tsx`)**:
  - Add a live, interactive flame streak pill (`🔥 X Day Streak`) in the top navigation bar and in the Home greeting card with a 7-day mini tracker and a `"View Streak"` button to open the full-screen streak celebration view on demand.

## 2. Pure White Frosted Glass Full-Screen Upload Overlay
- **Goal**: Replace the black (`slate-950`) upload overlay with a clean, attractive **Pure White** frosted-glass full-screen experience (`FullScreenUploadOverlay.tsx`).
- **Changes (`/src/components/Dashboard/FullScreenUploadOverlay.tsx`)**:
  - Replace the dark `bg-slate-950/88` screen with a bright daylight backdrop (`bg-white/90 backdrop-blur-2xl`) and an elevated pure-white card (`bg-white border border-slate-200/90 shadow-2xl rounded-3xl`).
  - Feature the official StudyWeb logo (`/logo-inner.png`), a crisp indigo/violet circular progress ring, a smooth linear progress bar, a clean file preview pill, and the 3-stage pipeline (`Uploading Material` → `Analyzing Content` → `Ready in Workspace`) with zero mention of Supabase or database internals.
