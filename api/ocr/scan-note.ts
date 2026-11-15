import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { getServerGeminiApiKey } from '../../src/utils/serverEnv.js';

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

function sanitizeTitle(rawTitle: string, fallback: string): string {
  const cleaned = String(rawTitle || '')
    .replace(/^#+\s*/, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 2) return fallback;
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
}

const serverlessScanDedupCache = new Map<string, { timestamp: number; payload: any }>();

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
    const { fileBase64, pagesBase64, fileMimeType, name } = body || {};

    const rawPages: Array<{ base64: string; mimeType?: string }> = [];
    if (Array.isArray(pagesBase64) && pagesBase64.length > 0) {
      for (const p of pagesBase64) {
        if (typeof p === 'string' && p.trim()) {
          rawPages.push({ base64: p, mimeType: fileMimeType });
        } else if (p && typeof p === 'object' && typeof p.base64 === 'string' && p.base64.trim()) {
          rawPages.push({ base64: p.base64, mimeType: p.mimeType || fileMimeType });
        }
      }
    } else if (fileBase64) {
      rawPages.push({ base64: String(fileBase64), mimeType: fileMimeType });
    }

    if (rawPages.length === 0) {
      return res.status(400).json({ error: 'Scanned image base64 data is required.' });
    }

    const allowedMimes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/svg+xml',
      'image/heic',
      'image/heif'
    ]);

    const cleanedPages: Array<{ data: string; mimeType: string }> = [];
    let totalBytesApprox = 0;

    for (const page of rawPages.slice(0, 10)) {
      let cleanBase64 = String(page.base64 || '');
      let detectedMimeFromDataUrl = '';
      if (cleanBase64.includes(';base64,')) {
        const [prefix, b64] = cleanBase64.split(';base64,');
        if (prefix && prefix.startsWith('data:')) {
          detectedMimeFromDataUrl = prefix.slice(5).trim();
        }
        cleanBase64 = b64 || '';
      }
      cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');
      if (!cleanBase64 || cleanBase64.length < 32) {
        return res.status(400).json({ error: 'Scanned image data is empty or corrupted.' });
      }
      let normalizedMime = String(page.mimeType || detectedMimeFromDataUrl || 'image/jpeg')
        .toLowerCase()
        .trim();
      if (normalizedMime === 'image/jpg' || normalizedMime === 'image/pjpeg' || normalizedMime === 'image/jfif') {
        normalizedMime = 'image/jpeg';
      }
      if (!allowedMimes.has(normalizedMime)) {
        return res.status(400).json({
          error: `Unsupported file type "${normalizedMime}". Supported image types: JPEG, PNG, WEBP, GIF, BMP, SVG, HEIC.`
        });
      }
      const approxBytes = Math.floor((cleanBase64.length * 3) / 4);
      totalBytesApprox += approxBytes;
      if (approxBytes > 20 * 1024 * 1024 || totalBytesApprox > 35 * 1024 * 1024) {
        return res.status(413).json({
          error: 'Scanned file exceeds the maximum allowed size (20MB per page / 35MB total).'
        });
      }
      cleanedPages.push({ data: cleanBase64, mimeType: normalizedMime });
    }

    const dedupKey = cleanedPages
      .map((p) => `${p.mimeType}:${p.data.length}:${p.data.slice(0, 96)}:${p.data.slice(-96)}`)
      .join('|');
    const cachedScan = serverlessScanDedupCache.get(dedupKey);
    if (cachedScan && Date.now() - cachedScan.timestamp < 5 * 60 * 1000) {
      return res.status(200).json({ ...cachedScan.payload, deduplicated: true });
    }

    const defaultTitle = String(name || 'Scanned Study Notes').trim();
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      console.error('[Serverless OCR] API key is not configured on the server.');
      return res.status(503).json({
        error: 'Something went wrong. There is a server error. Please try again.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const isMultiPage = cleanedPages.length > 1;
    const ocrPrompt = `You are StudyWeb's Scan Notes AI Assistant — a high-precision academic Optical Character Recognition (OCR) and study note parser.
Carefully inspect ${isMultiPage ? `these ${cleanedPages.length} scanned study note pages in sequential order` : 'this scanned study note image'} ("${defaultTitle}") and extract ALL visible handwritten and printed text, questions, problems, diagrams, tables, and equations word-for-word.

Strict Rules:
1. "extractedText": Transcribe the complete, verbatim text from the image(s) accurately. Preserve the original language, original meaning, headings, questions, choices, bullet points, numbered lists, definitions, diagram labels, tables, and mathematical/chemical/scientific formulas in clean Markdown format.${isMultiPage ? ' Clearly mark page boundaries in order (e.g., "--- Page 1 ---", "--- Page 2 ---").' : ''}
2. UNCLEAR HANDWRITING RULE: If specific words or handwritten sections cannot be read with confidence, mark only that unreadable segment as [Unclear text] and continue extracting all readable portions. Never invent or fabricate missing words.
3. EMPTY/UNREADABLE IMAGE RULE: If the image is completely blank, corrupted, or contains no readable text/study content at all, return an empty string "" for "extractedText" and an empty string "" for "summary". Never fabricate extraction results.
4. "title": A concise, clear academic title (3 to 7 words) reflecting the actual topic or heading written on the scanned note.
5. "summary": A clear, accurate summary explaining the exact concepts and subject matter covered in the scanned note based strictly on the extracted text.
6. "highlights": 4 to 6 key facts, definitions, or exam-important points extracted directly from the scanned note.
7. "formulas": Any mathematical, physics, chemistry, or scientific equations/formulas visible in the note (empty array if none).
8. "tags": 3 to 5 specific subject/topic tags.`;

    const ocrSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        extractedText: { type: Type.STRING },
        summary: { type: Type.STRING },
        highlights: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        formulas: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ['title', 'extractedText', 'summary', 'highlights', 'tags']
    };

    const candidateModels = [
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-4-hydrogen'
    ];

    let response: any = null;
    let lastOcrModelError = '';

    const contentsParts: any[] = [
      { text: ocrPrompt },
      ...cleanedPages.map((p) => ({
        inlineData: {
          data: p.data,
          mimeType: p.mimeType
        }
      }))
    ];

    for (const modelName of candidateModels) {
      let modelTimeoutId: ReturnType<typeof setTimeout> | null = null;
      try {
        const useLowThinking = modelName === 'gemini-4-hydrogen';
        const genPromise = ai.models.generateContent({
          model: modelName,
          contents: contentsParts,
          config: {
            responseMimeType: 'application/json',
            responseSchema: ocrSchema,
            thinkingConfig: {
              thinkingLevel: useLowThinking ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL
            }
          }
        });
        const timeoutPromise = new Promise<never>((_, reject) => {
          modelTimeoutId = setTimeout(() => reject(new Error(`OCR model ${modelName} timed out after 25s`)), 25000);
        });
        response = await Promise.race([genPromise, timeoutPromise]);
        if (modelTimeoutId) clearTimeout(modelTimeoutId);
        if (response && response.text) break;
      } catch (modelErr: any) {
        if (modelTimeoutId) clearTimeout(modelTimeoutId);
        lastOcrModelError = modelErr?.message || String(modelErr);
        console.warn(`[Serverless OCR] Model ${modelName} fallback:`, lastOcrModelError);
      }
    }

    if (response && response.text) {
      let rawText = response.text.trim();
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
      }
      const parsed = JSON.parse(rawText);
      const rawExtracted = String(parsed?.extractedText || '').trim();
      const rawSummary = String(parsed?.summary || '').trim();

      if (!rawExtracted && !rawSummary) {
        return res.status(422).json({
          error: 'Something went wrong. There is a server error. Please try again.'
        });
      }

      const cleanTitle = sanitizeTitle(parsed.title || defaultTitle, defaultTitle);
      const formattedDocument = [
        `# ${cleanTitle}`,
        rawSummary ? `\n## Summary\n${rawSummary}` : '',
        rawExtracted ? `\n## Verbatim Scanned Notes (OCR)\n${rawExtracted}` : '',
        Array.isArray(parsed.highlights) && parsed.highlights.length > 0
          ? `\n## Key Highlights\n${parsed.highlights.map((h: string) => `- ${h}`).join('\n')}`
          : '',
        Array.isArray(parsed.formulas) && parsed.formulas.length > 0
          ? `\n## Formulas & Equations\n${parsed.formulas.map((f: string) => `- ${f}`).join('\n')}`
          : ''
      ]
        .filter(Boolean)
        .join('\n');

      const responsePayload = {
        title: cleanTitle,
        extractedText: formattedDocument,
        rawOcrText: rawExtracted,
        summary: rawSummary || `Scanned notes on ${cleanTitle}.`,
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
        tags:
          Array.isArray(parsed.tags) && parsed.tags.length > 0
            ? parsed.tags
            : ['Scanned Note', 'OCR'],
        pageCount: cleanedPages.length
      };
      serverlessScanDedupCache.set(dedupKey, { timestamp: Date.now(), payload: responsePayload });
      return res.status(200).json(responsePayload);
    }

    return res.status(422).json({
      error: 'Something went wrong. There is a server error. Please try again.'
    });
  } catch (error: any) {
    console.error('[Serverless OCR Error] /api/ocr/scan-note:', error?.message || error);
    return res.status(500).json({
      error: 'Something went wrong. There is a server error. Please try again.'
    });
  }
}
