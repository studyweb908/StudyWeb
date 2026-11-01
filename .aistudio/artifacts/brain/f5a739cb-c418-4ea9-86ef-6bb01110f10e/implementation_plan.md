# StudyWeb Interactive Guided Onboarding Tour

Deliver a polished, SaaS-grade interactive guided onboarding tour for StudyWeb that introduces newly registered users to their personal learning environment—without altering any existing design, branding, layout, authentication, or database architecture.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product and UX choices were confirmed and guide this implementation:

- **Confirmed Decision 1 (Launch Timing)**: The guided onboarding tour launches automatically right after a newly registered user finishes the initial personalization questionnaire.
- **Confirmed Decision 2 (Step 3 — Upload Documents Highlight)**: Highlights the real document upload action on the Dashboard (`Upload Material` / quick upload trigger) and seamlessly adapts if the user is inside the Workspace Library upload section.
- **Confirmed Decision 3 (Restart Tour Access)**: Users can restart the guided tour at any time from both the **Top Header** (quick help/tour trigger) and **Profile Settings**.

---

## 1. Overview & Core Concept

- **What It Does**: Provides a seamless onboarding experience consisting of a **Welcome Modal**, a **4-stage live UI spotlight walkthrough**, and a **Completion Celebration Modal** (5 steps total). Every step anchors to real, live DOM elements in StudyWeb using stable `data-tour` attributes, dynamically computing bounding boxes across desktop and mobile viewports.
- **Target Audience / Persona**: Newly registered students, self-learners, and educators entering StudyWeb for the first time, as well as returning users who want a quick refresher from the Header or Profile Settings.
- **Key Value**: Accelerates time-to-value by guiding learners directly to their core workflow—Dashboard overview, Workspaces, Document Upload, and AI Tutor—while persisting completion or skip status to their authenticated Supabase profile and local storage so the tour never interrupts returning sessions.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Welcome Screen (Entry Modal)**
   - Triggered automatically once a newly registered user completes the initial personalization setup (or manually via the **Restart Tour** button in the Header or Profile Settings).
   - Displays a centered, glassmorphic StudyWeb card with the crisp StudyWeb logo:
     - **Heading**: *"Welcome to StudyWeb!"*
     - **Body**: *"Your personal learning journey starts here. Let's take a quick tour."*
     - **Actions**: Primary **"Get Started"** button (`#5145F5` / `indigo-600`) and secondary **"Skip Tour"** button.
2. **Step 1 of 5 — Dashboard**
   - Spotlight highlights the main StudyWeb Dashboard overview banner & quick-start launchpad.
   - **Copy**: *"This is your StudyWeb dashboard. Your learning tools are accessible from here."*
3. **Step 2 of 5 — Workspace**
   - Spotlight highlights the real **Workspaces** navigation button in the sidebar (or the primary **Open Workspaces** control on mobile viewports where the sidebar drawer is collapsed, or automatically opens/targets the visible Workspace control).
   - **Copy**: *"Your personal study space. Organize your learning materials and keep everything together."*
4. **Step 3 of 5 — Upload Documents**
   - Spotlight highlights the real **Upload Material** button on the Dashboard (and supports the Workspace Library upload dropzone/button when active).
   - **Copy**: *"Upload your study materials, PDFs and notes to get started."*
5. **Step 4 of 5 — AI Tutor**
   - Spotlight highlights the real **Your AI Tutor** navigation button (and primary AI Tutor trigger).
   - **Copy**: *"Meet your personal AI Tutor. Ask questions, understand difficult concepts and get help with your studies."*
6. **Step 5 of 5 — Completion Modal**
   - Displays a celebratory completion modal:
     - **Heading**: *"You're all set! Your StudyWeb journey begins now."*
     - **Primary Button**: **"Start Learning"** (closes the tour, records `completed` status, and focuses the dashboard).

### Visual Identity & Theme

- **Aesthetic Direction**: Clean, high-craft SaaS spotlight overlay matching StudyWeb's existing visual system (`Plus Jakarta Sans` typography, crisp borders, and zero visual clutter).
- **Color Palette & Mood**:
  - **Spotlight Backdrop**: Smooth SVG cutout mask with `rgba(15, 23, 42, 0.68)` backdrop blur and an animated indigo focus ring (`#5145F5` / `#6366F1`) framing the highlighted UI element.
  - **Tooltip Card**: Pure white (`#FFFFFF`) in light mode and deep slate (`#0E1528` / `slate-900`) in dark mode, with `1px` structural borders (`border-slate-200/90 dark:border-slate-800`) and subtle elevation shadow.
  - **Progress & Badges**: Tabular step counter (`Step X of 5` with `tabular-nums`), segmented 5-dot progress bar, and crisp indigo primary controls.
- **Interactive Feedback & Motion**:
  - Smooth spring-physics bounding-box transitions (`motion/react`) when moving from Step 1 through Step 5.
  - Automatic `scrollIntoView({ behavior: 'smooth', block: 'center' })` and viewport-clamped popover positioning so tooltips never clip off-screen on mobile (`375px`) or desktop (`1440px`).
  - Full keyboard accessibility (`ArrowRight` / `Enter` for Next, `ArrowLeft` for Back, `Escape` to Skip).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Custom React + Motion Spotlight Engine vs. External DOM Wrapper**
  - *Chosen Approach*: Build a dedicated, zero-dependency React Spotlight & Popover Tour controller powered by StudyWeb's existing `motion/react` animation library and an SVG `<mask>` cutout overlay.
  - *Why*: Integrates natively with React state, dark/light theme tokens, lazy-loaded views, and responsive mobile drawers without CSS conflicts, global DOM mutations, or memory leaks. Gracefully falls back to centered modal presentation if a target selector is temporarily off-screen.
- **Decision 2: Dual-Layer User Persistence (`completed` vs. `skipped`)**
  - *Chosen Approach*: Persist onboarding tour state (`status: 'completed' | 'skipped'`, `updatedAt`) both in user-scoped `localStorage` (`studyweb_product_tour_status_<userId>`) and inside the authenticated user's Supabase `profiles` record (`onboarding_data.product_tour_status` / user metadata).
  - *Why*: Ensures returning users on any device are never shown the tour repeatedly once completed or skipped, while still distinguishing between users who completed all 5 steps versus those who skipped early.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        StudyWeb Application Root                         │
│  ┌─────────────────────────┐          ┌───────────────────────────────┐  │
│  │  Onboarding Questionnaire│ ───────► │  ProductTourService (State &  │  │
│  │   (New User Signup)     │ Triggers │  Supabase + Local Persistence)│  │
│  └─────────────────────────┘          └───────────────┬───────────────┘  │
│                                                       │                  │
│  ┌─────────────────────────┐                          ▼                  │
│  │Restart Tour Triggers    │          ┌───────────────────────────────┐  │
│  │• Top Header Help Button │ ───────► │    GuidedProductTourOverlay   │  │
│  │• Profile Settings Card  │          │  • Welcome Modal (Pre-Step)   │  │
│  └─────────────────────────┘          │  • SVG Spotlight Cutout Mask  │  │
│                                       │  • Responsive Tooltip Popover │  │
│                                       │  • Step 5 Completion Modal    │  │
│                                       └───────────────┬───────────────┘  │
│                                                       │                  │
│          ┌──────────────────────┬─────────────────────┴───────┐          │
│          ▼                      ▼                             ▼          │
│  ┌───────────────┐      ┌───────────────┐             ┌───────────────┐  │
│  │ data-tour=    │      │ data-tour=    │             │ data-tour=    │  │
│  │ "dashboard"   │      │ "workspaces"  │             │ "upload" /    │  │
│  │               │      │               │             │ "ai-tutor"    │  │
│  └───────────────┘      └───────────────┘             └───────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

1. **Target Element Instrumentation (`data-tour` attributes)**:
   - `data-tour="dashboard-overview"`: Main dashboard overview container in the Home view.
   - `data-tour="nav-workspaces"` & `data-tour="home-workspaces-btn"`: Workspaces navigation button in the sidebar and quick button on the dashboard for mobile fallback.
   - `data-tour="upload-documents"`: Document upload action button on the Dashboard Launchpad and inside the Workspace Library.
   - `data-tour="nav-ai-tutor"` & `data-tour="home-ai-tutor-btn"`: AI Tutor navigation button in the sidebar and quick action button on the dashboard.
2. **Navigation & Route Synchronization**:
   - When the tour starts or transitions between steps 1–4, the tour controller ensures the `dashboard` tab is active (or smoothly switches tabs if the user started the tour from Profile Settings) and waits a frame via `requestAnimationFrame` before measuring target element coordinates.
   - Resize and scroll listeners use passive event handlers and clean up completely on unmount.
3. **Persistence & Lifecycle States**:
   - **New User**: Completes initial setup -> `ProductTourService` sees no prior tour status -> opens Welcome Modal.
   - **Existing User**: Logs in -> `ProductTourService` reconciles Supabase `profiles.onboarding_data` and local state -> suppresses automatic tour if already `completed` or `skipped`.
   - **Skip Tour**: Records `skipped` with timestamp in local storage and Supabase `profiles`, immediately dismissing the overlay.
   - **Complete Tour**: Records `completed` with timestamp when clicking **"Start Learning"** on Step 5.
   - **Restart Tour**: Dispatching `studyweb-start-product-tour` from the Top Header or Profile Settings resets active step to the Welcome Screen and launches the tour immediately.
