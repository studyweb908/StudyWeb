import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

interface ApiRequest extends IncomingMessage {
  method?: string;
}

interface ApiResponse extends ServerResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
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
  res.setHeader('Content-Type', 'application/json');
  const startTime = Date.now();

  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(503).json({
        status: 'error',
        error: 'GEMINI_API_KEY is not configured on Vercel.',
        configured: false
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'studyweb-health-check' }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Reply with the word OK.'
    });

    const text = response.text?.trim() || '';
    const durationMs = Date.now() - startTime;

    return res.status(200).json({
      status: 'ok',
      model: 'gemini-3.8-flash',
      reply: text,
      verified: text.length > 0,
      durationMs
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      error: err?.message || String(err),
      durationMs: Date.now() - startTime
    });
  }
}
