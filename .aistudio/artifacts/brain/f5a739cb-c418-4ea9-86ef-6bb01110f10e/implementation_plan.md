# AI Tutor Real-Data Engine & Persona Removal Plan

## 1. Overview & Root-Cause Summary
When asking the AI Tutor a question like *"What is a cell?"*, the out-of-workspace notice banner appears properly, but the body of the answer previously fell through to generic dummy fallback text (`"Core Concept: Addressing your question directly, the primary focus is understanding the underlying principles..."`). Additionally, the AI Tutor still displayed persona mode controls (`Simple Explainer`, `Socratic Guide`, `Quiz & Exam Coach`, `Quick Flashcards`).

This update permanently removes all persona selectors and dummy fallback text, and upgrades the backend Gemini execution pipeline so every query returns a real, comprehensive Gemini/ChatGPT/Claude-style answer.

---

## 2. Planned Changes

### A. Remove Tutor Persona Options (`Simple Explainer`, `Socratic Guide`, `Quiz & Exam Coach`, `Quick Flashcards`)
- **AI Tutor Header & Message UI (`src/components/Dashboard/WorkspaceChat.tsx`)**:
  - Remove the persona selector button and dropdown menu from the top bar of the AI Tutor.
  - Remove persona badges (`· 💡 Simple Explainer`, etc.) from AI message bubbles and welcome messages.
  - Remove `activePersona`, `showPersonaMenu`, and `TUTOR_PERSONAS` state/constants from the AI Tutor interface.
- **Unified Gemini/ChatGPT-Style Response Prompt (`server.ts`)**:
  - Remove the persona-specific prompt branches (`plain_english`, `socratic`, `exam_prep`, `flashcard`).
  - Configure a single, authoritative system instruction that always answers with clear, comprehensive explanations, structured headings, key definitions/mechanisms, and concrete real-world examples.

### B. Eliminate All Dummy Fallback Text & Guarantee Real Gemini Answers
- **Fix Gemini 3 Thinking Latency & Model Auto-Retry (`server.ts`)**:
  - Apply `thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }` across all Gemini 3 Flash models (`gemini-3-flash-preview`, `gemini-3.1-flash-lite-preview`, `gemini-flash-latest`) so `gemini-3-flash-preview` responds in ~1.5–3 seconds instead of timing out under default high thinking.
  - Replace non-existent model IDs in the candidate list with verified active Gemini models (`gemini-3.1-flash-lite-preview`, `gemini-3-flash-preview`, `gemini-flash-latest`).
  - Implement multi-pass automatic retry with short backoff across backup Gemini models so transient rate limits or `503` spikes still resolve with a real Gemini answer.
- **Remove Dummy Text Generators (`server.ts`, `src/components/Dashboard/WorkspaceChat.tsx`, `src/services/AITutorBackgroundService.ts`)**:
  - Remove the hardcoded dummy fallback template (`"Core Concept: Addressing your question directly, the primary focus is understanding the underlying principles, governing rules..."`) from `server.ts`.
  - Remove `buildClientFallbackReply` in `WorkspaceChat.tsx` and the client dummy fallback generator in `AITutorBackgroundService.ts` so the client never fabricates placeholder text, and align the client request timeout with the backend retry window.
- **Preserve Out-of-Workspace Notice Banner + Full Real Explanation**:
  - When a user asks about a topic not found in their uploaded workspace files (e.g., *"What is a cell?"*), the AI Tutor will continue to show the compact notice banner at the top of the message (`Topic not in uploaded workspace files`) followed immediately by the real, comprehensive Gemini explanation of the topic.

---

## 3. Verification Plan
1. Run `lint_applet` and `compile_applet` to ensure zero TypeScript or build issues.
2. Execute a live test against `/api/ai-tutor` with `{"prompt": "What is a cell?"}` (both with and without uploaded unrelated workspace files) and verify that it returns a genuine, detailed biological explanation of a cell alongside the out-of-workspace notice banner.
