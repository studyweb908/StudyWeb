# Dynamic AI Tutor Branding & Workspace-Aware Avatar System

Replace the generic StudyWeb platform logo inside the AI Tutor with the active user workspace's custom logo/theme badge when scoped to a workspace, and display a distinctive modern academic tech crest insignia when in General Study mode.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were aligned during Phase 1 clarification:
> - **General Study Insignia**: **Modern academic crest with smart tech styling** — an SVG shield insignia featuring academic linework with electric indigo/cyan tech accents, rendered without any blurry filters or white outer circle pills.
> - **Workspace AI Tutor Avatar**: **Workspace custom icon or emoji with matching theme tint** — dynamically derived from the active workspace's icon, logo URL, or emoji set in a themed squircle tint badge matching `workspace.colorTheme`.
> - **No StudyWeb App Logo in Tutor**: The StudyWeb site logo (`/logo-inner.png`) is completely decoupled from the AI Tutor and will never appear as the tutor's avatar, header badge, or thinking indicator.

- **Confirmed Decision 1**: Modern academic tech crest for General Study AI Tutor mode.
- **Confirmed Decision 2**: Workspace-specific avatar (custom image logo or emoji with theme tint) for workspace-scoped AI Tutor mode.
- **Confirmed Decision 3**: Synchronized thinking animation across chat messages, headers, and loading pulses using the active avatar.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades the AI Tutor visual identity in both `AITutorWorkspace.tsx` and `WorkspaceChat.tsx` so students always have immediate visual confirmation of the knowledge base context they are chatting with. When working inside a specific workspace (e.g., *AP Physics*, *Cell Biology*, *Calculus III*), the AI Tutor adopts that workspace's brand mark, emoji, and theme tint. When in open General Study mode, it displays a distinguished Modern Academic Crest insignia.
- **Target Audience / Persona**: Students and lifelong learners seeking clear visual context and seamless immersion between different study hubs.
- **Key Value**: Eliminates visual ambiguity between the StudyWeb platform itself and the user's personal course workspaces, fulfilling the user's requirement for zero brand contamination and zero unwanted borders or blurring.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Entering a Workspace AI Tutor**:
   - The user opens an active workspace (e.g. *Physics: Mechanics & Motion* with ⚛️ emoji and indigo theme, or a custom course with uploaded badge).
   - In the AI Tutor top header, AI response bubbles, and animated thinking indicator, the tutor avatar dynamically displays the workspace's custom logo image or themed squircle badge.
   - Tooltip and label reflect: `AI Tutor · Physics: Mechanics & Motion`.

2. **Switching to General Study Mode**:
   - The user switches to "General Study" or opens the tutor without an active workspace.
   - The AI Tutor instantly transitions its avatar to the **Modern Academic Crest with smart tech styling**: a geometric shield bearing an academic codex / atom geometry with clean cyan/indigo circuit conduits.
   - Tooltip and label reflect: `AI Tutor · General Study Assistant`.

3. **Generating Responses (Thinking Indicator)**:
   - When the tutor is reasoning or streaming responses, the active avatar (workspace logo or academic crest) performs a subtle, organic scale pulsation with zero blur filters and no outer pills.

### Visual Identity & Theme Tokens

- **Aesthetic Direction**: High-precision academic tech; geometric, crisp vectors, no blurry radial drop shadows, and zero pill-enclosure borders around avatars.
- **Color Palette & Theme Integration**:
  - Indigo / Violet theme: `bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20`
  - Emerald theme: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`
  - Amber theme: `bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20`
  - Rose theme: `bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20`
  - Cyan theme: `bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20`
  - General Study Crest: Cyber-academic gradient (`#4F46E5` indigo to `#06B6D4` cyan) on neutral deep slate or crisp transparent backing.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Modular `AITutorAvatar` Component**
  - *Chosen Approach*: Implement a shared, reusable `AITutorAvatar` component that accepts `workspace`, `sizeClass`, `animateThinking`, and `className`.
  - *Why*: Ensures identical, bug-free avatar behavior across `AITutorWorkspace.tsx`, `WorkspaceChat.tsx`, and future tutor entry points, preventing code duplication.
  - *Alternatives Considered*: Writing inline ternary checks inside each file; rejected because inline conditionals are error-prone and hard to maintain across multiple screens.

- **Decision 2: SVG Vector Crest for General Study Mode**
  - *Chosen Approach*: Hand-craft a clean, lightweight vector SVG component for the Modern Academic Crest.
  - *Why*: SVG renders at infinite resolution at any DPI without blurriness, network requests, or external asset dependencies.
  - *Alternatives Considered*: Loading a static bitmap PNG; rejected because bitmaps blur when scaled on high-density Retina displays.

- **Decision 3: Complete Removal of `/logo-inner.png` Fallbacks in Tutor**
  - *Chosen Approach*: Replace all default fallbacks to `/logo-inner.png` within tutor files with the General Study academic crest or workspace badge.
  - *Why*: Directly honors the user's explicit directive: *"there should be the logo of the user's workspace logo there in the AI tutor, not the study apps. And if there is the general study, then there should be a different type of logo there."*

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### System Layout & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      TaskContext                            │
│           (provides activeWorkspace & workspaces)           │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌──────────────────────┐       ┌──────────────────────┐
    │  AITutorWorkspace    │       │    WorkspaceChat     │
    │  (Standalone Tutor)  │       │  (In-Workspace Chat) │
    └──────────┬───────────┘       └──────────┬───────────┘
               │                              │
               └───────────────┬──────────────┘
                               ▼
               ┌───────────────────────────────┐
               │        AITutorAvatar          │
               │  - Inspects active workspace  │
               │  - Workspace mode: logo/badge │
               │  - General Study: tech crest  │
               └───────────────────────────────┘
```

### Component & State Mapping

| Target Component | Avatar Placement | Current Behavior | Target Behavior |
| :--- | :--- | :--- | :--- |
| `AITutorWorkspace.tsx` | Header bar (left) | `/logo-inner.png` fallback | `AITutorAvatar` with workspace logo or General Study crest |
| `AITutorWorkspace.tsx` | AI message bubbles | `renderWorkspaceLogo` (`/logo-inner.png`) | `AITutorAvatar` scoped to message workspace context |
| `AITutorWorkspace.tsx` | Thinking indicator | `motion.img` (`/logo-inner.png`) | `AITutorAvatar` with `animateThinking={true}` |
| `WorkspaceChat.tsx` | Header bar (left) | `renderWorkspaceLogo` (`/logo-inner.png`) | `AITutorAvatar` scoped to current `workspace` |
| `WorkspaceChat.tsx` | AI message bubbles | `renderWorkspaceLogo` (`/logo-inner.png`) | `AITutorAvatar` scoped to current `workspace` |
| `WorkspaceChat.tsx` | Thinking indicator | `motion.img` (`/logo-inner.png`) | `AITutorAvatar` with `animateThinking={true}` |

### Verification Plan

1. Verify `AITutorAvatar` displays workspace custom image or themed emoji badge when inside any active workspace.
2. Verify `AITutorAvatar` displays the Modern Academic Crest when active workspace is `general-study` or null.
3. Verify that `/logo-inner.png` (StudyWeb platform logo) does not appear in AI Tutor header, message bubbles, or thinking indicator.
4. Run `npm run build` and `compile_applet` to ensure TypeScript compliance and zero build warnings.
