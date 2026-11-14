import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

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

    const normalizedMode = String(mode || 'ask').toLowerCase().trim();
    const userQuestion = String(question || '').trim();

    let modeInstruction = '';
    if (normalizedMode === 'solve') {
      modeInstruction = `Task: Solve Step-by-Step (Homework & Problem Solver).
Examine all questions, problems, equations, formulas, diagrams, or multiple-choice items visible in the scanned image and extracted OCR text.
- Solve each problem clearly step-by-step showing every calculation, chemical reaction/balanced equation, theorem, or reasoning step.
- Highlight the final answer clearly for each question.
- If there are multiple questions on the page, number and solve each one in order.`;
    } else if (normalizedMode === 'explain') {
      modeInstruction = `Task: Explain Concepts Clearly.
Explain the exact topics, definitions, diagrams, formulas, or examples visible in this scanned note in clear, intuitive student-friendly language, referencing the actual content written on the page.`;
    } else if (normalizedMode === 'summarize') {
      modeInstruction = `Task: Summarize Scanned Note.
Create a crisp, structured revision summary containing only the core ideas, definitions, key takeaways, and formulas visible in this scan.`;
    } else if (normalizedMode === 'quiz') {
      modeInstruction = `Task: Generate Practice Questions.
Create 4–5 high-quality practice questions (with an Answer Key & brief step-by-step explanations at the bottom) strictly based on the concepts, problems, and facts visible in this scanned note so the student can test themselves right away.`;
    } else if (normalizedMode === 'translate') {
      modeInstruction = `Task: Translate Scanned Text into ${targetLanguage || 'English'}.
Accurately translate ALL readable text visible in the scanned image and extracted text into ${targetLanguage || 'English'}.
- Preserve headings, numbered items, bullet lists, and mathematical/chemical symbols accurately.
- Return only the clean translated text cleanly formatted in Markdown.`;
    } else {
      if (!userQuestion) {
        return res.status(400).json({ error: 'Please enter a question about your scanned note.' });
      }
      modeInstruction = `Task: Answer the Student's Specific Question About This Scan.
Student Question: "${userQuestion}"
Answer thoroughly, accurately, and step-by-step based strictly on the scanned image and its extracted text. If a detail asked about is not visible or unreadable in the scan, state that clearly instead of guessing or switching to an unrelated topic.`;
    }

    const conversationContext =
      Array.isArray(history) && history.length > 0
        ? `\nPrevious Q&A on this scanned note:\n${history
            .slice(-6)
            .map((m: any) => `${m.role === 'user' ? 'Student' : 'Lens AI'}: ${String(m.text || '').slice(0, 1200)}`)
            .join('\n')}\n`
        : '';

    const fullPrompt = `You are StudyWeb Visual Lens, an interactive study assistant built directly into the camera scanner (similar to Google Lens Homework, Text, and Ask modes).

STRICT GROUNDING RULES:
1. Base your response 100% on the attached scanned image and the extracted OCR text below.
2. NEVER invent unrelated subjects or pull content from outside the scan unless applying standard formulas/steps needed to solve or explain the exact problem shown in the scan.
3. Format your response cleanly with Markdown headings, bullet points, and step-by-step lines so it is easy to read.

${trimmedText ? `=== EXTRACTED OCR TEXT FROM THIS SCAN ===\n${trimmedText.slice(0, 14000)}\n` : ''}
${conversationContext}
${modeInstruction}`;

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
