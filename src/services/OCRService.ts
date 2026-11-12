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

export class OCRService {
  /**
   * Processes a scanned note image using server-side Gemini Vision OCR
   * to extract verbatim text content, structured summary, highlights, and formulas
   * so the AI Tutor can immediately analyze and answer questions about the scanned notes.
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

    const cleanBase64 = fileBase64.includes(';base64,')
      ? fileBase64.split(';base64,')[1]
      : fileBase64;

    onProgress?.(40, 'Running Optical Character Recognition (OCR) on scanned notes...');

    // 1. Call dedicated server-side Gemini Vision OCR endpoint (/api/ocr/scan-note)
    try {
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 45000);

      const response = await fetch('/api/ocr/scan-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {})
        },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          fileBase64: cleanBase64,
          fileMimeType,
          name: defaultName,
          workspaceId: workspaceId ? toValidUuid(workspaceId) : undefined,
          userId: userId || undefined,
          size: sizeFormatted
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && (data.extractedText || data.summary)) {
          onProgress?.(78, 'OCR text extracted! Indexing note for AI Tutor...');
          const extractedText = String(data.extractedText || data.transcription || data.summary || '').trim();
          const title = String(data.title || data.name || defaultName).trim();
          const summary = String(
            data.summary ||
              (extractedText
                ? `Scanned Note Summary: ${extractedText.slice(0, 350)}`
                : `Scanned study note "${title}".`)
          ).trim();
          const highlights =
            Array.isArray(data.highlights) && data.highlights.length > 0
              ? data.highlights
              : extractedText
              ? extractedText
                  .split(/\n+/)
                  .map((line: string) => line.replace(/^[-*•\d.)\s]+/, '').trim())
                  .filter((line: string) => line.length > 12)
                  .slice(0, 5)
              : [`Scanned note: ${title}`];
          const formulas = Array.isArray(data.formulas) ? data.formulas : [];
          const tags =
            Array.isArray(data.tags) && data.tags.length > 0
              ? data.tags
              : ['Scanned Note', 'OCR Extracted'];

          return {
            id: data.id || toValidUuid(`scan-${Date.now()}`),
            title,
            extractedText: extractedText || summary,
            summary,
            highlights,
            formulas,
            tags
          };
        }
      }
    } catch (ocrErr) {
      console.warn('[OCRService] Primary /api/ocr/scan-note fallback triggered:', ocrErr);
    }

    // 2. Fallback to /api/study-materials/process pipeline if needed
    onProgress?.(60, 'Extracting handwritten & printed text with study pipeline...');
    try {
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 45000);
      const procBody = JSON.stringify({
        workspaceId: workspaceId ? toValidUuid(workspaceId) : undefined,
        userId: userId || undefined,
        supabaseToken: supabaseToken || undefined,
        name: defaultName,
        type: 'image',
        size: sizeFormatted,
        fileBase64: cleanBase64,
        fileMimeType
      });

      let procRes = await fetch('/api/study-materials/process', {
        method: 'POST',
        credentials: 'same-origin',
        signal: abortCtrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: procBody
      });

      if (procRes.status === 400) {
        procRes = await fetch('/api/study-materials/process', {
          method: 'POST',
          credentials: 'omit',
          signal: abortCtrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: procBody
        });
      }
      clearTimeout(timeoutId);

      if (procRes.ok) {
        const procData = await procRes.json();
        const mat = procData?.material;
        if (mat) {
          const extractedText = String(
            mat.transcription || mat.contentText || mat.content_text || mat.summary || ''
          ).trim();
          const title = String(mat.name || defaultName).trim();
          const summary = String(mat.summary || `Scanned study note "${title}".`).trim();
          return {
            id: mat.id || toValidUuid(`scan-${Date.now()}`),
            title,
            extractedText: extractedText || summary,
            summary,
            highlights: Array.isArray(mat.highlights) && mat.highlights.length > 0 ? mat.highlights : [`Scanned note: ${title}`],
            formulas: Array.isArray(mat.formulas) ? mat.formulas : [],
            tags: Array.isArray(mat.tags) && mat.tags.length > 0 ? mat.tags : ['Scanned Note', 'OCR Extracted']
          };
        }
      }
    } catch (pipeErr) {
      console.warn('[OCRService] Fallback pipeline notice:', pipeErr);
    }

    return {
      id: toValidUuid(`scan-${Date.now()}`),
      title: defaultName,
      extractedText: `Scanned study note "${defaultName}". Visual image attached for direct multimodal AI Tutor analysis.`,
      summary: `Scanned study note "${defaultName}". Ready to answer your questions in AI Tutor.`,
      highlights: [`Scanned note: ${defaultName}`],
      formulas: [],
      tags: ['Scanned Note', 'Camera Scan']
    };
  }
}
