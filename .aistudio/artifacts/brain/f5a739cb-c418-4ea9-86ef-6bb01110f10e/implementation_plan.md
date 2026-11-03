# Implementation Plan: Mandatory Onboarding Gate, Hybrid Step Navigation & Responsive Font Scaling

## 1. Product & Functional Overview

This update resolves two core functional and visual areas across the StudyWeb onboarding flow, guided product tour, and dashboard:

1. **Strict Mandatory Onboarding Gate Across All Logins & Sessions**:
   - No user is permitted to enter the StudyWeb workspace until all 11 onboarding personalization questions are answered and saved.
   - If a user closes the tab or logs out mid-onboarding and logs back in later, the app checks their account-scoped onboarding completion state (`studyweb_onboarding_complete_<userId>` and Supabase `profiles.onboarding_data` / `auth.user.user_metadata.onboarding_completed`) and immediately presents the onboarding flow before rendering the interactive workspace.
   - Incomplete onboarding sessions automatically **resume from the first/last unanswered question** (persisted per user in both `localStorage` and Supabase `user_metadata.onboarding_draft`) so prior answers are preserved while blocking workspace entry until completion.

2. **Hybrid Auto-Advance + Universal "Next" Button & "Other" Write-In Support**:
   - Single-choice questions smoothly auto-advance (~260ms) when a standard option is selected, while **every step** (1 through 11) also displays a built-in footer inside the question card with **Back** and **Next / Continue** buttons so users are never stuck without a Next button.
   - Selecting **"Other"** on any single-choice or multi-select question (such as Step 1 "How did you hear about StudyWeb?", Step 2, Step 5, Step 7 "Where do you usually learn?", Step 9, or Step 10) reveals a compact inline text input to specify details and waits for the user to click **Next** (or press `Enter`) instead of skipping ahead prematurely.

3. **Compact, Minimal Centered Onboarding Card & Responsive `clamp()` Font Scaling**:
   - Replaces oversized headings, padding, and tall option buttons in `OnboardingModal.tsx` with a sleek, minimal centered card (`max-w-xl`) that fits comfortably inside a single viewport (`max-h-[calc(100dvh-2rem)]`) without page scrolling.
   - Introduces fluid CSS `clamp()` typography utilities in `src/index.css` so tour tooltips, onboarding prompts, option labels, and dashboard headers scale down cleanly on compact viewports without clipping or overlapping.

---

## 2. Visual Direction & Domain Exemplars

- **Reference Exemplars**: **Linear** (onboarding setup wizard) and **Raycast / Notion** (focused, keyboard-friendly personalization cards).
- **Aesthetic & Spatial Direction**:
  - **Compact Centered Card**: A single elevated card (`max-w-[540px]`, `p-5 sm:p-6`, `rounded-2xl`) centered in the viewport with a subtle progress bar integrated directly along the top edge of the card.
  - **Dense, Scannable Option Grid**: 2-column grid for multi-option steps with compact button height (`py-2.5 px-3.5`, `rounded-xl`) and fluid label sizing (`clamp(0.78rem, 1.4vw, 0.875rem)`), ensuring 9-option questions (like Step 1 and Step 7) fit effortlessly on screen alongside the inline Back/Next footer bar.
  - **Smooth Micro-Animations**: Spring-damped horizontal slide + fade transitions (`duration: 0.2s`, `ease: [0.22, 1, 0.36, 1]`) between questions, with reduced-motion support.
  - **Zero-Pill Metadata Discipline**: Step indicators (`Question 1 of 11`) rendered as clean, unboxed typographic kickers rather than heavy bordered badges.

---

## 3. Architecture & Technical Implementation

### A. Responsive Font Scaling Strategy (`src/index.css`)
- Define fluid typography tokens and utility classes in `src/index.css` using `clamp()`:
  - `.text-fluid-xs`: `font-size: clamp(0.6875rem, 1.1vw, 0.75rem)`
  - `.text-fluid-sm`: `font-size: clamp(0.75rem, 1.3vw, 0.84375rem)`
  - `.text-fluid-base`: `font-size: clamp(0.8125rem, 1.5vw, 0.9375rem)`
  - `.text-fluid-lg`: `font-size: clamp(0.95rem, 1.8vw, 1.125rem)`
  - `.text-fluid-title`: `font-size: clamp(1.125rem, 2.2vw, 1.375rem)`
- Apply these fluid utilities to `OnboardingModal.tsx` and `GuidedProductTour.tsx` so text scales proportionally on small laptops and mobile screens without overflowing.

### B. Account-Scoped Mandatory Onboarding Gate (`src/App.tsx`)
- Create a helper `checkUserOnboardingComplete(user)` that inspects:
  1. `user?.user_metadata?.onboarding_completed === true`
  2. Supabase `profiles.onboarding_data` (checking if all required fields are populated)
  3. User-scoped `localStorage.getItem(\`studyweb_onboarding_complete_\${user.id}\`) === 'true'`
- Update `handleSignupSuccess`, `handleLoginSuccess`, and `syncFromSupabase` in `src/App.tsx`:
  - Whenever a user logs in or restores a session and `checkUserOnboardingComplete` is `false`, force `setShowOnboarding(true)` and suppress `showWelcomeBack` so the user cannot bypass onboarding by refreshing or logging out and logging back in.
  - While `showOnboarding` is `true`, gate the main workspace view so the user cannot interact with the dashboard behind the onboarding flow until `onComplete` fires.

### C. Compact Centered Onboarding Modal & Smart Step Progression (`src/components/OnboardingModal.tsx`)
- **Resume From Last Unanswered Question**:
  - Load saved draft from `studyweb_onboarding_draft_<userId>` (with fallback to `studyweb_onboarding_draft` and `user.user_metadata.onboarding_draft`).
  - Automatically compute the first unanswered step if `step === 0` and partial answers exist, jumping directly to the user's last unanswered question on re-login.
- **Hybrid Auto-Advance + Universal "Next" Button**:
  - Single-choice steps (`1, 2, 5, 6, 8, 9`, and `10` when `No` is chosen) auto-advance after `250ms` when a non-"Other" option is clicked.
  - If the user selects `"Other"` on any step, display a compact inline text input (`otherText` per step) and wait for the user to click **Next** or press `Enter`.
  - Render a unified, compact bottom navigation bar (**Back** + **Next / Complete Setup**) inside the card on **every step (1–11)** so the user always sees an explicit **Next** button (solving the issue when selecting "YouTube" and "Other").
- **Persisting Completion Across Devices**:
  - On final submission, save `onboarding_completed: true` and `onboarding_data: formData` to `supabase.auth.updateUser({ data: ... })`, upsert the `profiles` row, and set `studyweb_onboarding_complete_<userId> = 'true'` in `localStorage`.
