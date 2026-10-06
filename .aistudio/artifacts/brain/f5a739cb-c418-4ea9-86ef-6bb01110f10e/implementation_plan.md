# Implementation Plan - Real Gemini API Backed AI Tutor (End-to-End)

Replace all mock/hardcoded responses in the AI Tutor with real, live Gemini API integration using `@google/genai` and `process.env.GEMINI_API_KEY`.

---

## User Preferences & Decisions
- **Model Tier**: Try `gemini-2.5-flash` first with automatic fallback to `gemini-1.5-flash` / `gemini-3.5-flash`.
- **Error Presentation**: Red alert banner inside the chat bubble with an interactive "Retry" button.
- **Knowledge Integration**: Use full Gemini academic knowledge combined with grounded workspace document notes & citations.

---

## Proposed Changes

### 1. Backend API Endpoint (`server.ts` -> `/api/ai-tutor`)
- **Gemini Client**: Connect route directly to `@google/genai` initialized with `process.env.GEMINI_API_KEY`.
- **System Instruction**: Set strict tutor persona instructions:
  > *"You are an intelligent, friendly, and adaptive AI Study Tutor. When a student asks a question, explain concepts clearly using simple analogies, key points, and examples. If workspace documents or images are provided, ground your answer in them and cite them. If a question is general knowledge (like 'what is a cell'), answer it thoroughly using your general academic knowledge. NEVER output placeholder text or repeat file names as content."*
- **Model Resolution Order**: Try `gemini-2.5-flash` -> `gemini-1.5-flash` -> `gemini-3.5-flash`.
- **Prompt Construction**: Combine student query, conversation history, and workspace materials/attached notes into the model request.
- **Purge Mocks**: Completely remove mock generators (`generateLocalAITutorResponse` or canned string fallbacks).
- **Error Status**: Return HTTP 500/429 JSON `{ error: 'Failed to generate response. Please try again.' }` on API errors or quota limits.

---

### 2. Frontend Chat Component (`WorkspaceChat.tsx`)
- **Live API Fetch**: Update `handleSend` to call `POST /api/ai-tutor` with user prompt, chat history, and attached workspace documents.
- **Direct Rendering**: Display exact `reply` / `text` string returned by Gemini inside the AI message bubble with rich Markdown formatting.
- **Purge Client Mocks**: Delete hardcoded fallback strings (*"Material uploaded directly in AI Tutor chat..."*, *"🌟 Key Finding: Study material..."*).
- **Loading Skeleton & Typing Indicator**: Show a clean pulsing loading state while waiting for Gemini.
- **Error UI & Retry Button**: Render a red alert banner inside the message bubble when an API call fails, allowing 1-click retry.

---

## Verification Plan

### Automated / Command Verification
1. Run linter (`npm run lint`) to verify TypeScript types and syntax.
2. Compile applet using `compile_applet`.
3. Test backend route `/api/ai-tutor` via server fetch to verify real Gemini response generation and error handling.

### Manual / Browser Verification
1. Open the AI Tutor in the workspace.
2. Ask a general knowledge question (e.g. *"What is cellular respiration?"*) and verify a real Gemini response is rendered.
3. Attach a workspace document or image, ask a question about it, and verify grounded answers with citations.
4. Verify loading indicators during request and red error banners with Retry functionality on API failure.
