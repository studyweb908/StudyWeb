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
  imageUrl?: string;
  extractedText?: string;
  question?: string;
  mode?: 'ask' | 'solve' | 'explain' | 'summarize' | 'short_summary' | 'quiz' | 'translate';
  targetLanguage?: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

const SHORT_SUMMARY_CACHE_KEY = 'studyweb_scan_short_summaries_v1';

export function isPlaceholderScanSummary(summary?: string | null): boolean {
  const s = String(summary || '').trim();
  if (!s || s.length < 18) return true;
  return /ask any question about your scanned|scanned image loaded in lens|scanned study note ready|switch to text & translate|tap listen to hear|uploading and analyzing/i.test(
    s
  );
}

export function getCachedShortSummary(fileId?: string): string | null {
  if (!fileId) return null;
  try {
    const raw = localStorage.getItem(SHORT_SUMMARY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const val = parsed?.[fileId];
    return typeof val === 'string' && !isPlaceholderScanSummary(val) ? val : null;
  } catch {
    return null;
  }
}

export function setCachedShortSummary(fileId: string | undefined, summary: string): void {
  if (!fileId || !summary || isPlaceholderScanSummary(summary)) return;
  try {
    const raw = localStorage.getItem(SHORT_SUMMARY_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = typeof parsed === 'object' && parsed !== null ? parsed : {};
    next[fileId] = summary;
    // Keep cache bounded to most recent 60 entries
    const keys = Object.keys(next);
    if (keys.length > 60) {
      delete next[keys[0]];
    }
    localStorage.setItem(SHORT_SUMMARY_CACHE_KEY, JSON.stringify(next));
  } catch {}
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

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), 14000);

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
          const fullExtracted = String(
            data?.extractedText || rawOcr || data?.transcription || data?.summary || ''
          ).trim();
          if (data && fullExtracted) {
            onProgress?.(85, 'Text extracted & ready in Lens!');
            const title = String(data.title || data.name || defaultName).trim();
            const summary = String(data.summary || '').trim();
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
        console.warn(`[OCRService] /api/ocr/scan-note attempt ${attempt} notice:`, ocrErr?.message || ocrErr);
      }
    }

    return {
      id: toValidUuid(`scan-${Date.now()}`),
      title: defaultName,
      extractedText: '',
      summary: '',
      highlights: [],
      formulas: [],
      tags: ['Scanned Note', 'Lens']
    };
  }

  /**
   * Automatically creates a concise 2-3 sentence short summary for any clicked/opened scanned note.
   */
  public static async generateShortSummaryForScannedNote(params: {
    id?: string;
    name?: string;
    fileBase64?: string;
    fileMimeType?: string;
    imageUrl?: string;
    extractedText?: string;
  }): Promise<string> {
    const cached = getCachedShortSummary(params.id);
    if (cached) return cached;

    let resolvedBase64 = params.fileBase64 || '';
    let resolvedMime = params.fileMimeType || 'image/jpeg';
    if (!resolvedBase64 && params.imageUrl && params.imageUrl.startsWith('data:')) {
      const mimeMatch = /^data:([^;]+);base64,/i.exec(params.imageUrl);
      if (mimeMatch?.[1]) resolvedMime = mimeMatch[1];
      resolvedBase64 = params.imageUrl.split(';base64,')[1] || '';
    }

    const answer = await this.askLensQuestion({
      fileBase64: resolvedBase64 || undefined,
      fileMimeType: resolvedMime,
      imageUrl: params.imageUrl && params.imageUrl.startsWith('http') ? params.imageUrl : undefined,
      extractedText: params.extractedText || params.name || '',
      mode: 'short_summary'
    });

    const cleaned = answer
      .replace(/^#{1,6}\s+[^\n]*\n+/g, '')
      .replace(/^\*{0,2}(?:short\s+)?summary\*{0,2}\s*:\s*/i, '')
      .trim();

    if (cleaned && !isPlaceholderScanSummary(cleaned)) {
      setCachedShortSummary(params.id, cleaned);
      return cleaned;
    }

    if (params.extractedText) {
      const fallback = params.extractedText
        .replace(/^#+\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);
      return fallback.length >= 220 ? `${fallback}...` : fallback;
    }

    return `Study notes from "${params.name || 'Scanned Note'}" ready for review and Q&A.`;
  }

  /**
   * Google Lens-style direct Q&A, problem solver, practice generator, and translator
   * directly on a scanned image + OCR text without requiring workspace upload first.
   */
  public static async askLensQuestion(request: LensAskRequest): Promise<string> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 15000);

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
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn(`[OCRService] /api/ocr/lens-ask attempt ${attempt} notice:`, err?.message || err);
      }
    }

    if (request.extractedText && request.mode === 'translate') {
      return request.extractedText;
    }
    if (request.extractedText) {
      return `### Key Notes & Content from Your Scan\n\n${request.extractedText.slice(0, 1500)}`;
    }
    return 'I inspected your scanned note. Ask any specific question about a problem, formula, or concept on the page.';
  }
}
