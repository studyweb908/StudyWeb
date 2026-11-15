import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { getServerGeminiApiKey } from '../../src/utils/serverEnv.js';
import {
  detectScanNotesOperationFromQuestion,
  buildScanNotesSystemPrompt
} from '../../src/services/AITutorContextService.js';

interface ApiRequest extends IncomingMessage {
  body?: any;
  method?: string;
}

interface ApiResponse extends ServerResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
}

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

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
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
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await parseRequestBody(req);
    const {
      fileBase64,
      fileMimeType,
      extractedText,
      question,
      mode = 'ask',
      targetLanguage = 'English',
      history = []
    } = body || {};

    const trimmedText = String(extractedText || '').trim();
    if (!fileBase64 && !trimmedText) {
      return res.status(400).json({
        error: 'A scanned image or extracted note text is required to answer or generate content.'
      });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini AI API key is not configured on the server. Unable to analyze this scan right now.'
      });
    }

    let cleanBase64 = fileBase64 ? String(fileBase64) : '';
    let detectedMime = '';
    if (cleanBase64.includes(';base64,')) {
      const [prefix, b64] = cleanBase64.split(';base64,');
      if (prefix && prefix.startsWith('data:')) {
        detectedMime = prefix.slice(5).trim();
      }
      cleanBase64 = b64 || '';
    }
    cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

    let normalizedMime = String(fileMimeType || detectedMime || 'image/jpeg')
      .toLowerCase()
      .trim();
    if (normalizedMime === 'image/jpg' || normalizedMime === 'image/pjpeg' || normalizedMime === 'image/jfif') {
      normalizedMime = 'image/jpeg';
    }

    const normalizedMode = detectScanNotesOperationFromQuestion(mode, question);
    const userQuestion = String(question || '').trim();

    if (normalizedMode === 'ask' && !userQuestion) {
      return res.status(400).json({ error: 'Please enter a question about your scanned note.' });
    }

    const fullPrompt = buildScanNotesSystemPrompt(normalizedMode, {
      userQuestion,
      targetLanguage,
      extractedText: trimmedText,
      conversationHistory: Array.isArray(history) ? history : []
    });

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const contentParts: any[] = [{ text: fullPrompt }];
    if (cleanBase64) {
      contentParts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: normalizedMime
        }
      });
    }

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
      'gemini-4-hydrogen'
    ];

    let response: any = null;
    let lastModelError = '';

    for (const modelName of candidateModels) {
      let modelTimeoutId: ReturnType<typeof setTimeout> | null = null;
      try {
        const useLowThinking = modelName === 'gemini-4-hydrogen';
        const genPromise = ai.models.generateContent({
          model: modelName,
          contents: contentParts,
          config: {
            thinkingConfig: {
              thinkingLevel: useLowThinking ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL
            }
          }
        });
        const timeoutPromise = new Promise<never>((_, reject) => {
          modelTimeoutId = setTimeout(() => reject(new Error(`Lens model ${modelName} timed out after 20s`)), 20000);
        });
        response = await Promise.race([genPromise, timeoutPromise]);
        if (modelTimeoutId) clearTimeout(modelTimeoutId);
        if (response && response.text && response.text.trim()) {
          break;
        }
      } catch (modelErr: any) {
        if (modelTimeoutId) clearTimeout(modelTimeoutId);
        lastModelError = modelErr?.message || String(modelErr);
        console.warn(`[Serverless Lens Ask] Model ${modelName} fallback:`, lastModelError);
      }
    }

    if (response && response.text && response.text.trim()) {
      return res.status(200).json({
        answer: response.text.trim(),
        mode: normalizedMode
      });
    }

    return res.status(422).json({
      error: 'Unable to analyze this scanned image right now. Please try again.'
    });
  } catch (error: any) {
    console.error('[Serverless Lens Ask Error] /api/ocr/lens-ask:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to process your question about this scan. Please try again.'
    });
  }
}
