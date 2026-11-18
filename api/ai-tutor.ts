import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';
import { getServerGeminiApiKey } from '../src/utils/serverEnv.js';
import { resolveAITutorContext } from '../src/services/AITutorContextService.js';

interface ApiRequest extends IncomingMessage {
  body?: any;
  method?: string;
}

interface ApiResponse extends ServerResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
}

// Helper to safely parse request body across Vercel / Node runtimes
async function parseRequestBody(req: ApiRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  // Stream reader fallback if body is not pre-parsed
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

function getGeminiApiKey(): string | null {
  return getServerGeminiApiKey();
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Add CORS headers for cross-origin or same-origin safety
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();

  try {
    const body = await parseRequestBody(req);
    const {
      prompt,
      history,
      persona = 'socratic',
      modelMode = 'auto',
      deepResearch = false,
      attachedFiles = [],
      allWorkspaces = [],
      workspaceId,
      workspaceName,
      userId,
      inaccessibleAccountFiles = [],
      allowOutsideResearch = false
    } = body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        error: 'Prompt is required and must be a non-empty string.',
        correlationId
      });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.error(`[AI Tutor ${correlationId}] GEMINI_API_KEY is not configured.`);
      return res.status(503).json({
        error: 'Something went wrong. There is a server error. Please try again.',
        correlationId
      });
    }

    const personaInstructions: Record<string, string> = {
      socratic: `ROLE: Socratic Guide
You are an expert Socratic AI Tutor for StudyWeb. Instead of lecturing or handing over answers right away:
- Guide the student through self-discovery by asking thoughtful, scaffolding questions.
- Acknowledge their partial insights and point them toward the next logical step.
- Ground your questions and prompts directly in their uploaded study notes and lecture slides.
- When they make progress, celebrate it and deepen their intuition with a relevant follow-up question.`,

      exam_prep: `ROLE: Exam Preparation Coach
You are a rigorous, results-focused Exam Preparation Coach:
- Highlight high-yield testable topics, critical definitions, equations, and common exam traps.
- Point out how examiners frame questions around the material.
- Provide review checkpoints, grading criteria, and time-saving problem-solving tricks.`,

      plain_english: `ROLE: Plain-English Explainer
You are a master educator celebrated for explaining complex academic concepts in plain, vivid English:
- Strip away dense jargon, heavy legalese, and confusing notation.
- Use intuitive real-world analogies, relatable examples, and step-by-step clarity.
- Ensure the student understands "why" something works before introducing formal terms.`,

      flashcard: `ROLE: Flashcard Active Recall Tester
You are a rapid-fire active recall trainer and flashcard coach:
- Present punchy, focused quiz cards one at a time from their materials.
- Evaluate the student's answer concisely and present the next active recall card.`
    };

    const resolvedContext = resolveAITutorContext({
      prompt: prompt.trim(),
      authenticatedUserId: userId || null,
      activeWorkspaceId: workspaceId || null,
      activeWorkspaceName: workspaceName || null,
      attachedFiles,
      allWorkspaces,
      inaccessibleAccountFiles,
      allowOutsideResearch: Boolean(allowOutsideResearch)
    });

    if (resolvedContext.immediateEdgeCaseReply) {
      return res.status(200).json({
        reply: resolvedContext.immediateEdgeCaseReply,
        text: resolvedContext.immediateEdgeCaseReply,
        source: 'StudyWeb AI Tutor',
        tutorMode: resolvedContext.selectedMode,
        intentCategory: resolvedContext.intentCategory,
        securityFlags: resolvedContext.securityFlags,
        correlationId,
        durationMs: Date.now() - startTime
      });
    }

    const selectedPersona = personaInstructions[persona] || personaInstructions.socratic;
    const systemInstruction = [
      resolvedContext.systemInstruction,
      `You are an intelligent, friendly, and adaptive AI Study Tutor for StudyWeb.\n${selectedPersona}\nExplain concepts clearly using simple analogies, key points, and examples. Answer thoroughly and help the student master the subject. NEVER output placeholder text or fake answers.`,
      resolvedContext.sanitizedMaterialContextBlock
    ]
      .filter(Boolean)
      .join('\n\n');

    // Supported active Gemini candidate models
    const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'];

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Build multi-turn payload safely
    const currentTurnParts: any[] = [{ text: prompt.trim() }];

    let contentsPayload: any;
    if (Array.isArray(history) && history.length > 0) {
      const multiTurn: any[] = [];
      for (const turn of history.slice(-6)) {
        const turnRole =
          turn.role === 'model' || turn.role === 'ai' || turn.role === 'assistant'
            ? 'model'
            : 'user';
        const text = String(turn.content || turn.text || '').trim();
        if (text) {
          if (multiTurn.length === 0 && turnRole === 'model') {
            continue; // Gemini requires conversation to begin with 'user'
          }
          const lastRole = multiTurn.length > 0 ? multiTurn[multiTurn.length - 1].role : null;
          if (lastRole === turnRole) {
            multiTurn[multiTurn.length - 1].parts[0].text += `\n\n${text}`;
          } else {
            multiTurn.push({
              role: turnRole,
              parts: [{ text }]
            });
          }
        }
      }

      const lastRole = multiTurn.length > 0 ? multiTurn[multiTurn.length - 1].role : null;
      if (lastRole === 'user') {
        multiTurn[multiTurn.length - 1].parts = currentTurnParts;
      } else {
        multiTurn.push({
          role: 'user',
          parts: currentTurnParts
        });
      }
      contentsPayload = multiTurn;
    } else {
      contentsPayload = currentTurnParts;
    }

    let responseText = '';
    let usedModel = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[AI Tutor ${correlationId}] Invoking candidate model: ${model}`);
        const isHydrogen = model === 'gemini-4-hydrogen';
        const response = await ai.models.generateContent({
          model,
          contents: contentsPayload,
          config: {
            systemInstruction,
            ...(isHydrogen ? {} : { temperature: 0.7 })
          }
        });

        if (response && response.text) {
          responseText = response.text;
          usedModel = model;
          break; // Success!
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Tutor ${correlationId}] Model ${model} failed:`, err?.message || err);
      }
    }

    const duration = Date.now() - startTime;

    if (!responseText) {
      const errMsg = lastError?.message || 'AI service is temporarily unreachable.';
      console.error(`[AI Tutor ${correlationId}] All models failed after ${duration}ms:`, errMsg);
      return res.status(503).json({
        error: 'Something went wrong. There is a server error. Please try again.',
        correlationId,
        durationMs: duration
      });
    }

    console.log(`[AI Tutor ${correlationId}] Succeeded using ${usedModel} in ${duration}ms`);
    return res.status(200).json({
      reply: responseText,
      text: responseText,
      source: 'StudyWeb AI Tutor',
      tutorMode: resolvedContext.selectedMode,
      intentCategory: resolvedContext.intentCategory,
      securityFlags: resolvedContext.securityFlags,
      personaUsed: persona,
      correlationId,
      durationMs: duration
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[AI Tutor ${correlationId}] Uncaught error after ${duration}ms:`, err);
    return res.status(500).json({
      error: 'Something went wrong. There is a server error. Please try again.',
      correlationId,
      durationMs: duration
    });
  }
}
