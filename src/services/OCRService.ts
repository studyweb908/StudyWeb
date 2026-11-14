import { toValidUuid } from '../utils/uuid';

export interface OCRScanRequest {
  fileBase64: string;
  fileMimeType?: string;
  defaultName?: string;
  workspaceId?: string;
  userId?: string | null;
  supabaseToken?: string | null;
  sizeFormatted?: string;
}

export interface OCRScanResult {
  id: string;
  title: string;
  extractedText: string;
  summary: string;
  highlights: string[];
  formulas: string[];
  tags: string[];
}

export interface LensAskRequest {
  fileBase64?: string;
  fileMimeType?: string;
  extractedText?: string;
  question?: string;
  mode?: 'ask' | 'solve' | 'explain' | 'summarize' | 'quiz' | 'translate';
  targetLanguage?: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export class OCRService {
  /**
   * Processes a scanned note image using server-side Gemini Vision OCR
   * to extract verbatim text content, structured summary, highlights, and formulas.
   * Does NOT save anything to any workspace automatically.
   */
  public static async extractTextFromNoteImage(
    request: OCRScanRequest,
    onProgress?: (progress: number, stepText: string) => void
  ): Promise<OCRScanResult> {
    const {
      fileBase64,
      fileMimeType = 'image/jpeg',
      defaultName = 'Scanned Study Notes',
      workspaceId,
      userId,
      supabaseToken,
      sizeFormatted = '120 KB'
    } = request;

    let resolvedMime = String(fileMimeType || 'image/jpeg').toLowerCase().trim();
    if (fileBase64.includes(';base64,')) {
      const mimeMatch = /^data:([^;]+);base64,/i.exec(fileBase64);
      if (mimeMatch?.[1]) {
        resolvedMime = mimeMatch[1].toLowerCase().trim();
      }
    }
    if (resolvedMime === 'image/jpg' || resolvedMime === 'image/pjpeg' || resolvedMime === 'image/jfif') {
      resolvedMime = 'image/jpeg';
    }

    const cleanBase64 = fileBase64.includes(';base64,')
      ? fileBase64.split(';base64,')[1]
      : fileBase64;

    onProgress?.(45, 'Scanning text, formulas & questions with Lens OCR...');

    try {
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 22000);

      const response = await fetch('/api/ocr/scan-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {})
        },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          fileBase64: cleanBase64,
          fileMimeType: resolvedMime,
          name: defaultName,
          workspaceId: workspaceId ? toValidUuid(workspaceId) : undefined,
          userId: userId || undefined,
          size: sizeFormatted
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawOcr = String(data?.rawOcrText || '').trim();
        const fullExtracted = String(data?.extractedText || rawOcr || data?.transcription || data?.summary || '').trim();
        if (data && fullExtracted) {
          onProgress?.(85, 'Text extracted & ready in Lens!');
          const title = String(data.title || data.name || defaultName).trim();
          const summary = String(
            data.summary || `Scanned study note "${title}".`
          ).trim();
          const highlights =
            Array.isArray(data.highlights) && data.highlights.length > 0
              ? data.highlights
              : fullExtracted
                  .split(/\n+/)
                  .map((line: string) => line.replace(/^[-*•\d.)\s]+/, '').trim())
                  .filter((line: string) => line.length > 12)
                  .slice(0, 5);
          const formulas = Array.isArray(data.formulas) ? data.formulas : [];
          const tags =
            Array.isArray(data.tags) && data.tags.length > 0
              ? data.tags
              : ['Scanned Note', 'OCR Extracted'];

          return {
            id: data.id || toValidUuid(`scan-${Date.now()}`),
            title,
            extractedText: rawOcr || fullExtracted,
            summary,
            highlights,
            formulas,
            tags
          };
        }
      }
    } catch (ocrErr: any) {
      console.warn('[OCRService] /api/ocr/scan-note notice:', ocrErr?.message || ocrErr);
    }

    return {
      id: toValidUuid(`scan-${Date.now()}`),
      title: defaultName,
      extractedText: '',
      summary: 'Ask any question about your scanned page below, or use Text & Translate.',
      highlights: [],
      formulas: [],
      tags: ['Scanned Note', 'Lens']
    };
  }

  /**
   * Google Lens-style direct Q&A, problem solver, practice generator, and translator
   * directly on a scanned image + OCR text without requiring workspace upload first.
   */
  public static async askLensQuestion(request: LensAskRequest): Promise<string> {
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), 24000);

    try {
      const response = await fetch('/api/ocr/lens-ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: abortCtrl.signal,
        body: JSON.stringify(request)
      });

      clearTimeout(timeoutId);

      const rawBody = await response.text().catch(() => '');
      let data: any = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {}

      const answer = String(data?.answer || '').trim();
      if (answer) {
        return answer;
      }
      if (request.extractedText && request.mode === 'translate') {
        return request.extractedText;
      }
      return 'I inspected your scanned note. Please ask a specific question about the problem or concept on the page.';
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (request.extractedText && request.mode === 'translate') {
        return request.extractedText;
      }
      throw new Error(err?.message || 'Unable to analyze this scanned note right now.');
    }
  }
}
