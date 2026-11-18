import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';
import { getServerGeminiApiKey, diagnoseServerGeminiApiKey } from '../src/utils/serverEnv.js';

interface ApiRequest extends IncomingMessage {
  method?: string;
}

interface ApiResponse extends ServerResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
}

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  res.setHeader('Content-Type', 'application/json');
  const startTime = Date.now();

  try {
    const diagnostic = diagnoseServerGeminiApiKey();
    const apiKey = getServerGeminiApiKey();
    if (!apiKey) {
      console.error('[AI Health] API key not configured:', diagnostic);
      return res.status(503).json({
        status: 'error',
        configured: false,
        error: 'Something went wrong. There is a server error. Please try again.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const candidateModels = [
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-4-hydrogen'
    ];

    let lastErr: any = null;
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: 'Reply with the word OK.'
        });
        const text = response.text?.trim() || '';
        if (text) {
          console.log(`[AI Health] Verified model ${modelName} in ${Date.now() - startTime}ms`);
          return res.status(200).json({
            status: 'ok',
            configured: true,
            reply: text,
            verified: true,
            durationMs: Date.now() - startTime
          });
        }
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err || '').toLowerCase();
        if (
          err?.status === 401 ||
          err?.status === 403 ||
          msg.includes('api key not valid') ||
          msg.includes('api_key_invalid') ||
          msg.includes('access_token_type_unsupported')
        ) {
          break;
        }
      }
    }

    const rawMsg = String(lastErr?.message || lastErr || 'Could not complete model handshake.');
    const isInvalidKey = /api key not valid|api_key_invalid|access_token_type_unsupported|unauthenticated/i.test(rawMsg);
    console.error('[AI Health] Handshake failed:', rawMsg);

    return res.status(isInvalidKey ? 401 : 500).json({
      status: 'error',
      configured: true,
      error: 'Something went wrong. There is a server error. Please try again.',
      durationMs: Date.now() - startTime
    });
  } catch (err: any) {
    console.error('[AI Health] Uncaught error:', err?.message || err);
    return res.status(500).json({
      status: 'error',
      configured: false,
      error: 'Something went wrong. There is a server error. Please try again.',
      durationMs: Date.now() - startTime
    });
  }
}
