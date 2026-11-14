import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

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
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY;

  if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return key.trim();
}

function sanitizeTitle(rawTitle: string, fallback: string): string {
  const cleaned = String(rawTitle || '')
    .replace(/^#+\s*/, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 2) return fallback;
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
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
    const { fileBase64, fileMimeType, name } = body || {};

    if (!fileBase64) {
      return res.status(400).json({ error: 'Scanned image base64 data is required.' });
    }

    let cleanBase64 = String(fileBase64);
    let detectedMimeFromDataUrl = '';
    if (cleanBase64.includes(';base64,')) {
      const [prefix, b64] = cleanBase64.split(';base64,');
      if (prefix && prefix.startsWith('data:')) {
        detectedMimeFromDataUrl = prefix.slice(5).trim();
      }
      cleanBase64 = b64 || '';
    }
    cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

    if (!cleanBase64) {
      return res.status(400).json({ error: 'Scanned image data is empty or unreadable.' });
    }

    let normalizedMime = String(fileMimeType || detectedMimeFromDataUrl || 'image/jpeg')
      .toLowerCase()
      .trim();
    if (normalizedMime === 'image/jpg' || normalizedMime === 'image/pjpeg' || normalizedMime === 'image/jfif') {
      normalizedMime = 'image/jpeg';
    }

    const defaultTitle = String(name || 'Scanned Study Notes').trim();
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini AI API key is not configured on the server. Unable to extract OCR text from scanned note.'
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

    const ocrPrompt = `You are a high-precision academic Optical Character Recognition (OCR) and study note parser.
Carefully inspect this scanned study note image ("${defaultTitle}") and extract ALL visible handwritten and printed text, questions, problems, diagrams, and equations word-for-word.

Instructions:
1. "extractedText": Transcribe the complete, verbatim text from the image accurately. Preserve headings, questions, choices, bullet points, numbered lists, definitions, diagram labels, tables, and mathematical/chemical equations in clean Markdown format so the student can copy or ask questions directly from this text. If the image is blank or contains no readable text/content, return an empty string "".
2. "title": A concise, clear academic title (3 to 7 words) reflecting the actual topic or heading written on the scanned note.
3. "summary": A clear, comprehensive summary explaining the exact concepts and subject matter covered in the scanned note.
4. "highlights": 4 to 6 key facts, definitions, or takeaways extracted directly from the scanned note.
5. "formulas": Any mathematical, physics, chemistry, or scientific equations/formulas visible in the note (empty array if none).
6. "tags": 3 to 5 specific subject/topic tags.`;

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
      'gemini-4-hydrogen',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview'
    ];

    let response: any = null;
    let lastOcrModelError = '';

    for (const modelName of candidateModels) {
      try {
        const useLowThinking = modelName === 'gemini-4-hydrogen';
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            { text: ocrPrompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: normalizedMime
              }
            }
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: ocrSchema,
            thinkingConfig: {
              thinkingLevel: useLowThinking ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL
            }
          }
        });
        if (response && response.text) break;
      } catch (modelErr: any) {
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
          error:
            'No readable text or study content could be detected in the scanned image. Please ensure the page is well-lit and in focus.'
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

      return res.status(200).json({
        title: cleanTitle,
        extractedText: formattedDocument,
        rawOcrText: rawExtracted,
        summary: rawSummary || `Scanned notes on ${cleanTitle}.`,
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
        tags:
          Array.isArray(parsed.tags) && parsed.tags.length > 0
            ? parsed.tags
            : ['Scanned Note', 'OCR']
      });
    }

    return res.status(422).json({
      error: 'Could not extract text from the scanned image right now. Please ensure the page is well-lit and try scanning again.'
    });
  } catch (error: any) {
    console.error('[Serverless OCR Error] /api/ocr/scan-note:', error?.message || error);
    return res.status(500).json({
      error: 'Unable to process the scanned note right now. Please try scanning again.'
    });
  }
}
