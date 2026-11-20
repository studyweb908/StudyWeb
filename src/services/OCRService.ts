import { toValidUuid } from '../utils/uuid';
import type { ScanNotesOperationMode } from './AITutorContextService';

export interface OCRScanPageInput {
  fileBase64: string;
  fileMimeType?: string;
  pageNumber?: number;
}

export interface OCRScanRequest {
  fileBase64: string;
  fileMimeType?: string;
  pagesBase64?: OCRScanPageInput[];
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
  pageCount?: number;
  hasUnclearText?: boolean;
  deduplicated?: boolean;
  error?: string;
  errorCode?: string;
  httpStatus?: number;
}

export interface LensAskRequest {
  fileBase64?: string;
  fileMimeType?: string;
  imageUrl?: string;
  extractedText?: string;
  question?: string;
  mode?: ScanNotesOperationMode;
  targetLanguage?: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export interface GeminiConnectionStatus {
  ok: boolean;
  configured: boolean;
  keyState?: string;
  verified?: boolean;
  model?: string;
  durationMs?: number;
  error?: string;
}

const SHORT_SUMMARY_CACHE_KEY = 'studyweb_scan_short_summaries_v1';
const clientScanDedupCache = new Map<string, { timestamp: number; result: OCRScanResult }>();

const ALLOWED_SCAN_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/jfif',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/heic',
  'image/heif'
]);

const ALLOWED_SCAN_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|svg|heic|heif)$/i;
const MAX_SCAN_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export function validateScanInputFile(file: {
  name?: string;
  type?: string;
  size?: number;
}): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No image file was provided for scanning.' };
  }
  if (typeof file.size === 'number') {
    if (file.size <= 0) {
      return {
        valid: false,
        error: `"${file.name || 'Selected file'}" is empty (0 bytes). Please choose a valid image.`
      };
    }
    if (file.size > MAX_SCAN_FILE_BYTES) {
      return {
        valid: false,
        error: `"${file.name || 'Selected file'}" exceeds the 20 MB maximum file size limit.`
      };
    }
  }

  const mime = String(file.type || '').toLowerCase().trim();
  const name = String(file.name || '').trim();

  if (mime && !mime.startsWith('image/')) {
    return {
      valid: false,
      error: `Unsupported file format "${mime || name || 'unknown'}". Scan Notes accepts images only (JPEG, PNG, WEBP, GIF, BMP, SVG, HEIC).`
    };
  }

  const hasValidMime = mime ? ALLOWED_SCAN_MIME_TYPES.has(mime) : false;
  const hasValidExt = name ? ALLOWED_SCAN_EXTENSIONS.test(name) : false;

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: `Unsupported file format "${mime || name || 'unknown'}". Scan Notes accepts images only (JPEG, PNG, WEBP, GIF, BMP, SVG, HEIC).`
    };
  }

  return { valid: true };
}

export function isPlaceholderScanSummary(summary?: string | null): boolean {
  const s = String(summary || '').trim();
  if (!s || s.length < 18) return true;
  return /ask any question about your scanned|scanned image loaded in lens|scanned study note ready|switch to text & translate|tap listen to hear|uploading and analyzing|configure a valid gemini_api_key|enable live lens ai|ready for review and q&a|i inspected your scanned note|something went wrong|there is a server error|temporarily unavailable|temporarily busy|authentication failed|could not process|could not complete|unable to (analyze|extract|read|complete)/i.test(
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
   * Explicitly verifies the server-side Gemini API key and connection status via /api/ai-health
   * before attempting OCR summarization or when testing the connection from Settings.
   */
  public static async verifyGeminiConnectionStatus(): Promise<GeminiConnectionStatus> {
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), 8000);
    try {
      const response = await fetch('/api/ai-health', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: abortCtrl.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.status === 'ok') {
        return {
          ok: true,
          configured: true,
          verified: Boolean(data.verified),
          durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined
        };
      }

      const configured = Boolean(data?.configured === true && response.status !== 503);
      const friendlyError =
        typeof data?.error === 'string' && data.error.trim() && !/server error/i.test(data.error)
          ? data.error.trim()
          : 'Unable to reach the document scanning service right now. Please try again shortly.';
      if (data?.error) {
        console.error('[OCRService] Connection health check error:', data.error);
      }
      return {
        ok: false,
        configured,
        verified: false,
        error: friendlyError
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[OCRService] Connection health check exception:', err);
      const isAbort = err?.name === 'AbortError';
      return {
        ok: false,
        configured: false,
        verified: false,
        error: isAbort
          ? 'The connection check timed out. Please try again.'
          : 'Unable to connect to the scanning service right now. Please check your connection and try again.'
      };
    }
  }

  /**
   * Processes a scanned note image (or multi-page scan) using server-side Gemini Vision OCR
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
      pagesBase64,
      defaultName = 'Scanned Study Notes',
      workspaceId,
      userId,
      supabaseToken,
      sizeFormatted = '120 KB'
    } = request;

    let resolvedMime = String(fileMimeType || 'image/jpeg').toLowerCase().trim();
    if (fileBase64 && fileBase64.includes(';base64,')) {
      const mimeMatch = /^data:([^;]+);base64,/i.exec(fileBase64);
      if (mimeMatch?.[1]) {
        resolvedMime = mimeMatch[1].toLowerCase().trim();
      }
    }
    if (resolvedMime === 'image/jpg' || resolvedMime === 'image/pjpeg' || resolvedMime === 'image/jfif') {
      resolvedMime = 'image/jpeg';
    }

    const cleanBase64 = fileBase64 && fileBase64.includes(';base64,')
      ? fileBase64.split(';base64,')[1]
      : (fileBase64 || '');

    if (!cleanBase64 && (!Array.isArray(pagesBase64) || pagesBase64.length === 0)) {
      return {
        id: toValidUuid(`scan-${Date.now()}`),
        title: defaultName,
        extractedText: '',
        summary: '',
        highlights: [],
        formulas: [],
        tags: ['Scanned Note'],
        error: 'Scanned image data is empty. Please capture or select a clear photo of your notes.'
      };
    }

    // Client-side deduplication check to prevent duplicate processing of the identical image
    const dedupKey = Array.isArray(pagesBase64) && pagesBase64.length > 0
      ? pagesBase64.map((p, i) => `${p.pageNumber || i + 1}:${p.fileBase64.length}:${p.fileBase64.slice(0, 48)}:${p.fileBase64.slice(-48)}`).join('|')
      : `1:${resolvedMime}:${cleanBase64.length}:${cleanBase64.slice(0, 48)}:${cleanBase64.slice(-48)}`;

    const cachedClientScan = clientScanDedupCache.get(dedupKey);
    if (cachedClientScan && Date.now() - cachedClientScan.timestamp < 5 * 60 * 1000) {
      onProgress?.(90, 'Loaded extracted notes from scan cache!');
      return { ...cachedClientScan.result, deduplicated: true };
    }

    onProgress?.(45, 'Scanning text, formulas & questions with Lens OCR...');

    let lastErrorMessage = '';

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), 35000);

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
            pagesBase64: Array.isArray(pagesBase64) && pagesBase64.length > 0 ? pagesBase64 : undefined,
            name: defaultName,
            workspaceId: workspaceId ? toValidUuid(workspaceId) : undefined,
            userId: userId || undefined,
            size: sizeFormatted
          })
        });

        clearTimeout(timeoutId);

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const backendError =
            typeof data?.error === 'string' && data.error.trim() ? data.error.trim() : '';
          console.error('[OCRService] /api/ocr/scan-note error:', {
            status: response.status,
            code: data?.code,
            error: backendError || response.statusText
          });

          if (response.status === 413) {
            lastErrorMessage =
              backendError ||
              'The scanned image is too large. Please try capturing or uploading a smaller photo.';
          } else if (response.status === 415 || response.status === 400) {
            lastErrorMessage =
              backendError ||
              'Please choose a supported image file (JPEG, PNG, WEBP, GIF, BMP, SVG, or HEIC).';
          } else if (response.status === 422) {
            lastErrorMessage =
              backendError ||
              'No readable text or diagrams were detected. Please try a clearer, well-lit photo.';
          } else if (response.status === 429) {
            lastErrorMessage =
              backendError ||
              'The scanning service is temporarily busy. Please wait a few seconds and try again.';
          } else if (response.status === 504) {
            lastErrorMessage =
              backendError ||
              'Scanning took longer than expected. Please try again with a clearer or single-page photo.';
          } else {
            lastErrorMessage =
              backendError && !/there is a server error/i.test(backendError)
                ? backendError
                : 'Unable to scan this note right now. Please try again in a moment.';
          }

          if (
            response.status === 400 ||
            response.status === 401 ||
            response.status === 403 ||
            response.status === 413 ||
            response.status === 415 ||
            response.status === 422 ||
            response.status === 503
          ) {
            return {
              id: toValidUuid(`scan-${Date.now()}`),
              title: defaultName,
              extractedText: '',
              summary: '',
              highlights: [],
              formulas: [],
              tags: ['Scanned Note'],
              error: lastErrorMessage,
              errorCode: typeof data?.code === 'string' ? data.code : undefined,
              httpStatus: response.status
            };
          }
          continue;
        }

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

          const scanResultObj: OCRScanResult = {
            id: data.id || toValidUuid(`scan-${Date.now()}`),
            title,
            extractedText: rawOcr || fullExtracted,
            summary,
            highlights,
            formulas,
            tags,
            pageCount: typeof data.pageCount === 'number' ? data.pageCount : 1,
            hasUnclearText: Boolean(data.hasUnclearText)
          };

          if (clientScanDedupCache.size > 40) {
            const oldestKey = clientScanDedupCache.keys().next().value;
            if (oldestKey) clientScanDedupCache.delete(oldestKey);
          }
          clientScanDedupCache.set(dedupKey, { timestamp: Date.now(), result: scanResultObj });

          return scanResultObj;
        }

        if (data?.error) {
          lastErrorMessage = String(data.error).trim();
        }
      } catch (ocrErr: any) {
        console.error(`[OCRService] /api/ocr/scan-note attempt ${attempt} error:`, ocrErr?.message || ocrErr);
        const isAbort = ocrErr?.name === 'AbortError';
        lastErrorMessage = isAbort
          ? 'Scanning timed out. Please check your connection and try again.'
          : 'Could not reach the scanning service. Please check your connection and try again.';
      }
    }

    return {
      id: toValidUuid(`scan-${Date.now()}`),
      title: defaultName,
      extractedText: '',
      summary: '',
      highlights: [],
      formulas: [],
      tags: ['Scanned Note', 'Lens'],
      error: lastErrorMessage || 'Unable to process this scanned image right now. Please try again.'
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

    try {
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
    } catch (summaryErr: any) {
      console.warn('[OCRService] Short summary generation fallback:', summaryErr?.message || summaryErr);
    }

    if (params.extractedText) {
      const fallback = params.extractedText
        .replace(/^#+\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);
      if (fallback && !isPlaceholderScanSummary(fallback)) {
        return fallback.length >= 220 ? `${fallback}...` : fallback;
      }
    }

    return '';
  }

  /**
   * Google Lens-style direct Q&A, problem solver, practice generator, and translator
   * directly on a scanned image + OCR text without requiring workspace upload first.
   */
  public static async askLensQuestion(request: LensAskRequest): Promise<string> {
    let lastError = 'Unable to analyze this scanned note right now. Please try again.';

    for (let attempt = 1; attempt <= 2; attempt++) {
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 28000);

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

        if (!response.ok) {
          const backendErr =
            typeof data?.error === 'string' && data.error.trim() ? data.error.trim() : '';
          console.error('[OCRService] /api/ocr/lens-ask error:', {
            status: response.status,
            code: data?.code,
            error: backendErr || response.statusText
          });
          lastError =
            backendErr && !/there is a server error/i.test(backendErr)
              ? backendErr
              : 'Unable to analyze this scanned note right now. Please try again.';

          if (response.status === 400 || response.status === 401 || response.status === 403) {
            break;
          }
          continue;
        }

        const answer = String(data?.answer || '').trim();
        if (answer && !/something went wrong|there is a server error/i.test(answer)) {
          return answer;
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error(`[OCRService] /api/ocr/lens-ask attempt ${attempt} error:`, err?.message || err);
        lastError =
          err?.name === 'AbortError'
            ? 'The scan request timed out. Please try again.'
            : 'Could not reach the scan assistant. Please check your connection and try again.';
      }
    }

    throw new Error(lastError);
  }
}
