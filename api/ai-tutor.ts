import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

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
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return key.trim();
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
      attachedFiles = []
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
        error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your environment variables in Vercel or AI Studio.',
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

    const selectedPersona = personaInstructions[persona] || personaInstructions.socratic;
    const systemInstruction = `You are an intelligent, friendly, and adaptive AI Study Tutor for StudyWeb.
${selectedPersona}
Explain concepts clearly using simple analogies, key points, and examples. Answer thoroughly and help the student master the subject. NEVER output placeholder text or fake answers.`;

    // Supported fast Gemini candidate models
    const candidateModels = ['gemini-3-flash-preview', 'gemini-2.5-flash'];
    if (deepResearch || modelMode === 'pro') {
      candidateModels.push('gemini-3.1-pro-preview');
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'studyweb-ai-tutor'
        }
      }
    });

    // Build multi-turn payload safely
    const currentTurnParts: any[] = [{ text: prompt.trim() }];

    // Attach file extracts if present
    if (Array.isArray(attachedFiles) && attachedFiles.length > 0) {
      let fileContext = '\n\n--- Attached Study Materials ---\n';
      attachedFiles.slice(0, 3).forEach((file: any) => {
        fileContext += `Document: ${file.name || 'File'}\n`;
        if (file.summary) fileContext += `Summary: ${file.summary}\n`;
        if (Array.isArray(file.highlights) && file.highlights.length > 0) {
          fileContext += `Highlights: ${file.highlights.join('; ')}\n`;
        }
        if (file.transcription) {
          fileContext += `Text Excerpt: ${String(file.transcription).slice(0, 500)}\n`;
        }
      });
      currentTurnParts.push({ text: fileContext });
    }

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
        const response = await ai.models.generateContent({
          model,
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: 0.7
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
      const errMsg = lastError?.message || 'Gemini service is temporarily unreachable.';
      console.error(`[AI Tutor ${correlationId}] All models failed after ${duration}ms:`, errMsg);
      return res.status(503).json({
        error: `Failed to generate response from Gemini: ${errMsg}`,
        correlationId,
        durationMs: duration
      });
    }

    console.log(`[AI Tutor ${correlationId}] Succeeded using ${usedModel} in ${duration}ms`);
    return res.status(200).json({
      reply: responseText,
      text: responseText,
      source: `Gemini (${usedModel})`,
      modelUsed: usedModel,
      personaUsed: persona,
      correlationId,
      durationMs: duration
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[AI Tutor ${correlationId}] Uncaught error after ${duration}ms:`, err);
    return res.status(500).json({
      error: err?.message || 'Internal server error while processing AI Tutor request.',
      correlationId,
      durationMs: duration
    });
  }
}
