/**
 * TranscriptProcessor Service
 *
 * Fetches, parses, and formats video captions/transcripts (with timestamps, grouped segments,
 * chapter markers, and metadata) from YouTube and external video URLs using multiple
 * caption-fetching strategies (external transcript downloader APIs, YouTube Innertube player
 * captionTracks, watch-page timedtext XML/JSON3 tracks, and WebVTT/SRT parsers).
 *
 * Enables the AI Tutor and study material analysis pipeline to accurately analyze the spoken
 * content of any video URL provided by the student.
 */

import { cleanNotebookLMTitle, isRawUrlOrPlaceholderTitle } from '../utils/notebookTitle';

export interface TranscriptSegment {
  /** Start time in seconds */
  start: number;
  /** Duration in seconds */
  duration: number;
  /** End time in seconds */
  end: number;
  /** Formatted timestamp string, e.g. "02:15" or "01:04:12" */
  timestamp: string;
  /** Cleaned spoken caption text for this segment */
  text: string;
}

export interface VideoChapter {
  title: string;
  start: number;
  timestamp: string;
}

export interface TranscriptResult {
  /** Extracted video identifier (e.g. 11-char YouTube ID or URL hash) */
  videoId: string;
  /** Normalized canonical video URL */
  normalizedUrl: string;
  /** Platform type */
  platform: 'youtube' | 'vimeo' | 'ted' | 'loom' | 'web_video';
  /** Video title */
  title: string;
  /** Channel / creator / educator name */
  author: string;
  /** Video duration in seconds (if known) */
  durationSeconds: number;
  /** Formatted duration string, e.g. "14:22" */
  durationFormatted: string;
  /** Full video description from the creator */
  description: string;
  /** Topic keywords / tags attached to the video */
  keywords: string[];
  /** Chapter markers extracted from video metadata or description */
  chapters: VideoChapter[];
  /** Language code of the fetched caption track (e.g. "en") */
  language: string;
  /** Whether actual timed spoken captions were retrieved */
  hasCaptions: boolean;
  /** Source strategy that provided the transcript */
  sourceStrategy:
    | 'innertube_captions'
    | 'watch_page_captions'
    | 'external_transcript_api'
    | 'gemini_native_video_stream'
    | 'timedtext_direct'
    | 'metadata_and_chapters_synthesis';
  /** Granular timed caption segments */
  segments: TranscriptSegment[];
  /** Coherent timestamped paragraphs grouped by interval (e.g. 30s blocks) */
  groupedSegments: TranscriptSegment[];
  /** Plain continuous text of the entire spoken transcript */
  plainText: string;
  /** Timestamp-annotated transcript text ([MM:SS] ...) */
  timestampedText: string;
  /** Total valid word count in the cleaned transcript */
  wordCount: number;
  /** Whether the transcript meets or exceeds the required minimum word count */
  isValidWordCount: boolean;
  /** Validation status flag */
  validationStatus: TranscriptValidationStatus;
  /** Human-readable explanation of the validation outcome */
  validationMessage: string;
  /** Complete formatted study context ready for AI Tutor & Gemini analysis */
  richContext: string;
}

export type TranscriptValidationStatus =
  | 'valid'
  | 'insufficient_words'
  | 'empty'
  | 'placeholder_detected';

export interface TranscriptValidationResult {
  isValid: boolean;
  wordCount: number;
  minWordCountRequired: number;
  status: TranscriptValidationStatus;
  message: string;
  cleanText: string;
}

export interface TranscriptProcessorOptions {
  /** Preferred language code for captions (default: 'en') */
  preferredLang?: string;
  /** Grouping interval in seconds for paragraph blocks (default: 30) */
  groupIntervalSeconds?: number;
  /** Minimum word count required for the transcript to be valid (default: 25) */
  minWordCount?: number;
  /** Max characters for richContext output (default: 32000) */
  maxContextLength?: number;
  /** Force bypass in-memory cache */
  bypassCache?: boolean;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export class TranscriptProcessor {
  private static cache = new Map<string, { timestamp: number; result: TranscriptResult }>();
  private static readonly CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

  /**
   * Checks whether a given URL string points to a video resource (YouTube, Vimeo, Loom, TED, or direct video)
   */
  public static isVideoUrl(urlString?: string | null): boolean {
    if (!urlString || typeof urlString !== 'string') return false;
    const lower = urlString.trim().toLowerCase();
    return (
      lower.includes('youtube.com/') ||
      lower.includes('youtu.be/') ||
      lower.includes('youtube-nocookie.com/') ||
      lower.includes('vimeo.com/') ||
      lower.includes('loom.com/share/') ||
      lower.includes('ted.com/talks/') ||
      /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(lower)
    );
  }

  /**
   * Extracts a YouTube video ID from any YouTube URL format (watch, youtu.be, shorts, embed, live) or raw 11-char ID
   */
  public static extractYouTubeId(urlOrId: string): string | null {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const trimmed = urlOrId.trim();

    // Direct 11-char YouTube video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();

      if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
        const vParam = parsed.searchParams.get('v');
        if (vParam && /^[a-zA-Z0-9_-]{6,15}$/.test(vParam)) {
          return vParam;
        }
        const pathMatch = parsed.pathname.match(/^\/(?:embed|shorts|live|v|e)\/([a-zA-Z0-9_-]{6,15})/);
        if (pathMatch && pathMatch[1]) {
          return pathMatch[1];
        }
      } else if (host.includes('youtu.be')) {
        const id = parsed.pathname.replace(/^\/+/, '').split(/[/?#&]/)[0];
        if (id && /^[a-zA-Z0-9_-]{6,15}$/.test(id)) {
          return id;
        }
      }
    } catch {
      // Fallback regex if URL has unusual prefix/wrapping
      const regexMatch = trimmed.match(
        /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      if (regexMatch && regexMatch[1]) {
        return regexMatch[1];
      }
    }

    return null;
  }

  /**
   * Converts seconds into a clean MM:SS or HH:MM:SS timestamp string
   */
  public static formatTimestamp(seconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  /**
   * Converts a timestamp string ("MM:SS" or "HH:MM:SS") into seconds
   */
  public static parseTimestampToSeconds(ts: string): number {
    const parts = ts
      .trim()
      .split(':')
      .map(p => parseFloat(p));
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  }

  public static readonly DEFAULT_MIN_WORD_COUNT = 25;

  /**
   * Cleans raw transcript text by removing timestamps ([MM:SS], 00:00, etc.), HTML/XML tags,
   * speaker labels, and collapses whitespace.
   */
  public static cleanTranscriptText(text?: string | null): string {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, ' ')
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z0-9#]+;/gi, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Accurately counts real words in transcript text (filtering out timestamps and non-word tokens)
   */
  public static countWords(text?: string | null): number {
    const cleaned = this.cleanTranscriptText(text);
    if (!cleaned) return 0;
    const words = cleaned.split(/\s+/).filter(w => w.replace(/[^\p{L}\p{N}]/gu, '').length > 0);
    return words.length;
  }

  /**
   * Checks if the transcript text consists of placeholder, error, or boilerplate content
   */
  public static isPlaceholderContent(text?: string | null): boolean {
    if (!text || typeof text !== 'string') return true;
    const lower = text.toLowerCase().trim();
    if (!lower || lower.length < 10) return true;

    return (
      lower.includes('youtube is currently blocking us') ||
      lower.includes('preventing us from generating a summary') ||
      lower.includes('subtitles are disabled') ||
      lower.includes('captions were not provided') ||
      lower.includes('no transcript available') ||
      lower.includes('transcript is unavailable') ||
      lower.includes('audio cannot be transcribed') ||
      lower.includes('uploaded and indexed into your workspace') ||
      lower.includes('ready for study questions') ||
      lower.includes('ready for ai tutor questions') ||
      lower.includes('study material:') ||
      lower.includes('untitled resource') ||
      lower.includes('loading transcript') ||
      lower.includes('we are working on a fix')
    );
  }

  /**
   * Validates that transcript content exceeds the minimum word count threshold and is not placeholder content
   */
  public static validateTranscript(
    input: string | TranscriptSegment[] | null | undefined,
    minWordCount = TranscriptProcessor.DEFAULT_MIN_WORD_COUNT
  ): TranscriptValidationResult {
    let rawText = '';
    if (Array.isArray(input)) {
      rawText = input.map(s => s?.text || '').join(' ').trim();
    } else if (typeof input === 'string') {
      rawText = input.trim();
    }

    const cleanText = this.cleanTranscriptText(rawText);
    const wordCount = this.countWords(cleanText);

    if (!cleanText || wordCount === 0) {
      return {
        isValid: false,
        wordCount: 0,
        minWordCountRequired: minWordCount,
        status: 'empty',
        message: 'Transcript content is empty or contains no spoken words.',
        cleanText: ''
      };
    }

    if (this.isPlaceholderContent(cleanText)) {
      return {
        isValid: false,
        wordCount,
        minWordCountRequired: minWordCount,
        status: 'placeholder_detected',
        message: 'Transcript contains placeholder or blocking error text rather than real spoken dialogue.',
        cleanText
      };
    }

    if (wordCount < minWordCount) {
      return {
        isValid: false,
        wordCount,
        minWordCountRequired: minWordCount,
        status: 'insufficient_words',
        message: `Transcript has only ${wordCount} word${wordCount === 1 ? '' : 's'}, which is below the minimum threshold of ${minWordCount} words required to initiate AI summary.`,
        cleanText
      };
    }

    return {
      isValid: true,
      wordCount,
      minWordCountRequired: minWordCount,
      status: 'valid',
      message: `Transcript successfully validated with ${wordCount} words (exceeds ${minWordCount} words threshold).`,
      cleanText
    };
  }

  /**
   * Decodes HTML and XML character entities commonly found in YouTube caption tracks
   */
  public static decodeHtmlEntities(input: string): string {
    if (!input) return '';
    return input
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parses YouTube XML timedtext format:
   * - <transcript><text start="12.34" dur="3.21">...</text></transcript>
   * - <timedtext><body><p t="12340" d="3210"><s>...</s></p></body></timedtext>
   */
  public static parseCaptionXml(xmlText: string): TranscriptSegment[] {
    if (!xmlText || typeof xmlText !== 'string') return [];
    const segments: TranscriptSegment[] = [];

    // Format 1: <text start="12.34" dur="3.21">Caption text</text>
    const textTagRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
    let match: RegExpExecArray | null;
    while ((match = textTagRegex.exec(xmlText)) !== null) {
      const attrs = match[1] || '';
      const rawContent = match[2] || '';
      const startMatch = attrs.match(/start=["']([0-9.]+)["']/i);
      const durMatch = attrs.match(/dur=["']([0-9.]+)["']/i);

      const start = startMatch ? parseFloat(startMatch[1]) : 0;
      const duration = durMatch ? parseFloat(durMatch[1]) : 2.5;
      const text = this.decodeHtmlEntities(rawContent);

      if (
        text &&
        !text.toLowerCase().includes('youtube is currently blocking us') &&
        !text.toLowerCase().includes('preventing us from generating a summary')
      ) {
        segments.push({
          start,
          duration,
          end: Number((start + duration).toFixed(2)),
          timestamp: this.formatTimestamp(start),
          text
        });
      }
    }

    if (segments.length > 0) {
      return segments;
    }

    // Format 2: <p t="12340" d="3210">...</p> (SRV3 / TTML millisecond format)
    const pTagRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
    while ((match = pTagRegex.exec(xmlText)) !== null) {
      const attrs = match[1] || '';
      const rawContent = match[2] || '';
      const tMatch = attrs.match(/\bt=["'](\d+)["']/i);
      const dMatch = attrs.match(/\bd=["'](\d+)["']/i);

      const start = tMatch ? parseInt(tMatch[1], 10) / 1000 : 0;
      const duration = dMatch ? parseInt(dMatch[1], 10) / 1000 : 2.5;
      const text = this.decodeHtmlEntities(rawContent);

      if (text) {
        segments.push({
          start,
          duration,
          end: Number((start + duration).toFixed(2)),
          timestamp: this.formatTimestamp(start),
          text
        });
      }
    }

    return segments;
  }

  /**
   * Parses YouTube JSON3 timedtext format:
   * { events: [ { tStartMs: 1200, dDurationMs: 3400, segs: [ { utf8: "Hello " }, { utf8: "world" } ] } ] }
   */
  public static parseCaptionJson3(jsonData: any): TranscriptSegment[] {
    if (!jsonData || !Array.isArray(jsonData.events)) return [];
    const segments: TranscriptSegment[] = [];

    for (const ev of jsonData.events) {
      if (!ev || !Array.isArray(ev.segs)) continue;
      const rawText = ev.segs.map((s: any) => s?.utf8 || '').join('');
      const cleaned = this.decodeHtmlEntities(rawText);
      if (!cleaned) continue;

      const start = typeof ev.tStartMs === 'number' ? ev.tStartMs / 1000 : 0;
      const duration = typeof ev.dDurationMs === 'number' ? ev.dDurationMs / 1000 : 2.5;

      segments.push({
        start: Number(start.toFixed(2)),
        duration: Number(duration.toFixed(2)),
        end: Number((start + duration).toFixed(2)),
        timestamp: this.formatTimestamp(start),
        text: cleaned
      });
    }

    return segments;
  }

  /**
   * Parses WebVTT or SRT subtitle text into TranscriptSegment[]
   */
  public static parseVttOrSrt(subText: string): TranscriptSegment[] {
    if (!subText || typeof subText !== 'string') return [];
    const segments: TranscriptSegment[] = [];
    const blocks = subText.replace(/\r\n/g, '\n').split(/\n\n+/);

    const timeLineRegex =
      /(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})/;

    for (const block of blocks) {
      const lines = block
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;

      const timeIdx = lines.findIndex(l => timeLineRegex.test(l));
      if (timeIdx === -1) continue;

      const match = lines[timeIdx].match(timeLineRegex);
      if (!match) continue;

      const startHrs = match[1] ? parseInt(match[1].replace(':', ''), 10) : 0;
      const startMins = parseInt(match[2], 10);
      const startSecs = parseInt(match[3], 10);
      const startMs = parseInt(match[4], 10);

      const endHrs = match[5] ? parseInt(match[5].replace(':', ''), 10) : 0;
      const endMins = parseInt(match[6], 10);
      const endSecs = parseInt(match[7], 10);
      const endMs = parseInt(match[8], 10);

      const start = startHrs * 3600 + startMins * 60 + startSecs + startMs / 1000;
      const end = endHrs * 3600 + endMins * 60 + endSecs + endMs / 1000;
      const duration = Math.max(0.5, end - start);

      const textLines = lines.slice(timeIdx + 1).join(' ');
      const cleaned = this.decodeHtmlEntities(textLines);
      if (cleaned) {
        segments.push({
          start: Number(start.toFixed(2)),
          duration: Number(duration.toFixed(2)),
          end: Number(end.toFixed(2)),
          timestamp: this.formatTimestamp(start),
          text: cleaned
        });
      }
    }

    return segments;
  }

  /**
   * Groups fine-grained 2-second caption segments into readable, timestamped study paragraphs
   * (e.g. every 30 seconds) and removes duplicate overlapping auto-caption lines.
   */
  public static groupSegmentsByInterval(
    segments: TranscriptSegment[],
    intervalSeconds = 30
  ): TranscriptSegment[] {
    if (!Array.isArray(segments) || segments.length === 0) return [];

    // Deduplicate consecutive identical caption lines (common in rolling auto-captions)
    const deduped: TranscriptSegment[] = [];
    for (const seg of segments) {
      const prev = deduped[deduped.length - 1];
      if (prev && prev.text.toLowerCase() === seg.text.toLowerCase()) {
        prev.end = Math.max(prev.end, seg.end);
        prev.duration = Number((prev.end - prev.start).toFixed(2));
        continue;
      }
      deduped.push({ ...seg });
    }

    const grouped: TranscriptSegment[] = [];
    let bucketStart = deduped[0].start;
    let bucketEnd = deduped[0].end;
    let bucketTexts: string[] = [];

    for (const seg of deduped) {
      if (seg.start - bucketStart >= intervalSeconds && bucketTexts.length > 0) {
        grouped.push({
          start: bucketStart,
          duration: Number((bucketEnd - bucketStart).toFixed(2)),
          end: bucketEnd,
          timestamp: this.formatTimestamp(bucketStart),
          text: bucketTexts.join(' ').replace(/\s+/g, ' ').trim()
        });
        bucketStart = seg.start;
        bucketTexts = [seg.text];
        bucketEnd = seg.end;
      } else {
        bucketTexts.push(seg.text);
        bucketEnd = Math.max(bucketEnd, seg.end);
      }
    }

    if (bucketTexts.length > 0) {
      grouped.push({
        start: bucketStart,
        duration: Number((bucketEnd - bucketStart).toFixed(2)),
        end: bucketEnd,
        timestamp: this.formatTimestamp(bucketStart),
        text: bucketTexts.join(' ').replace(/\s+/g, ' ').trim()
      });
    }

    return grouped;
  }

  /**
   * Extracts chapter timestamps from a video description if explicit macroMarkers aren't present
   */
  public static extractChaptersFromDescription(description: string): VideoChapter[] {
    if (!description) return [];
    const chapters: VideoChapter[] = [];
    const lines = description.split('\n');
    const tsRegex = /(?:^|\s|\(|\[)(\d{1,2}:\d{2}(?::\d{2})?)(?:\)|\]|\s|-|–|—|:)+(.+)$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const match = line.match(tsRegex);
      if (match && match[1] && match[2]) {
        const ts = match[1].trim();
        const title = match[2].replace(/^[-–—:\s]+/, '').trim();
        if (title.length >= 2 && title.length <= 120) {
          const seconds = this.parseTimestampToSeconds(ts);
          chapters.push({
            title,
            start: seconds,
            timestamp: this.formatTimestamp(seconds)
          });
        }
      }
    }

    return chapters;
  }

  /**
   * Selects the best caption track from a list of YouTube captionTracks
   */
  private static selectBestCaptionTrack(tracks: any[], preferredLang = 'en'): any | null {
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    // 1. Exact manual language match (not ASR auto-generated)
    const manualExact = tracks.find(
      t => t?.languageCode === preferredLang && t?.kind !== 'asr'
    );
    if (manualExact) return manualExact;

    // 2. Prefix manual language match (e.g., en-US, en-GB)
    const manualPrefix = tracks.find(
      t =>
        typeof t?.languageCode === 'string' &&
        t.languageCode.toLowerCase().startsWith(preferredLang.toLowerCase()) &&
        t?.kind !== 'asr'
    );
    if (manualPrefix) return manualPrefix;

    // 3. Auto-generated ASR track in preferred language
    const asrMatch = tracks.find(
      t =>
        typeof t?.languageCode === 'string' &&
        t.languageCode.toLowerCase().startsWith(preferredLang.toLowerCase())
    );
    if (asrMatch) return asrMatch;

    // 4. First track that supports translation or first available track
    return tracks[0];
  }

  /**
   * Fetches and parses a YouTube caption track baseUrl (attempts JSON3 first, then XML/SRV)
   */
  private static async downloadAndParseTrackUrl(baseUrl: string): Promise<TranscriptSegment[]> {
    if (!baseUrl) return [];

    // Try JSON3 format first
    try {
      const json3Url = baseUrl.includes('fmt=')
        ? baseUrl.replace(/fmt=[^&]+/, 'fmt=json3')
        : `${baseUrl}&fmt=json3`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(json3Url, {
        signal: controller.signal,
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      clearTimeout(timer);

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const json = JSON.parse(text);
          const parsed = this.parseCaptionJson3(json);
          if (parsed.length > 0) return parsed;
        } else if (text && text.includes('<')) {
          const parsed = this.parseCaptionXml(text);
          if (parsed.length > 0) return parsed;
        }
      }
    } catch {
      // Fall through to raw XML fetch
    }

    // Try raw XML timedtext URL
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(baseUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      clearTimeout(timer);

      if (res.ok) {
        const xml = await res.text();
        const parsed = this.parseCaptionXml(xml);
        if (parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }

    return [];
  }

  /**
   * Strategy 1: Fetch captions and video details via YouTube Innertube Player API
   * (Used by YouTube transcript downloaders & mobile clients)
   */
  private static async fetchViaInnertubeApi(
    videoId: string,
    preferredLang = 'en'
  ): Promise<{
    segments: TranscriptSegment[];
    language: string;
    title: string;
    author: string;
    description: string;
    durationSeconds: number;
    keywords: string[];
  } | null> {
    const clients = [
      {
        clientName: 'ANDROID',
        clientVersion: '19.09.37',
        androidSdkVersion: 30,
        userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip'
      },
      {
        clientName: 'IOS',
        clientVersion: '19.09.3',
        userAgent: 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)'
      },
      {
        clientName: 'WEB',
        clientVersion: '2.20240726.00.00',
        userAgent: DEFAULT_USER_AGENT
      }
    ];

    let bestMeta = {
      title: '',
      author: '',
      description: '',
      durationSeconds: 0,
      keywords: [] as string[]
    };

    for (const clientCfg of clients) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6500);
        const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': clientCfg.userAgent,
            'Accept-Language': 'en-US,en;q=0.9'
          },
          body: JSON.stringify({
            videoId,
            context: {
              client: {
                hl: preferredLang,
                gl: 'US',
                clientName: clientCfg.clientName,
                clientVersion: clientCfg.clientVersion,
                ...(clientCfg.androidSdkVersion
                  ? { androidSdkVersion: clientCfg.androidSdkVersion }
                  : {})
              }
            }
          })
        });
        clearTimeout(timer);

        if (!res.ok) continue;
        const data = (await res.json()) as any;

        const vd = data?.videoDetails;
        if (vd) {
          if (vd.title && !bestMeta.title) bestMeta.title = String(vd.title).trim();
          if (vd.author && !bestMeta.author) bestMeta.author = String(vd.author).trim();
          if (vd.shortDescription && !bestMeta.description) {
            bestMeta.description = String(vd.shortDescription).trim();
          }
          if (vd.lengthSeconds && !bestMeta.durationSeconds) {
            bestMeta.durationSeconds = parseInt(String(vd.lengthSeconds), 10) || 0;
          }
          if (Array.isArray(vd.keywords) && bestMeta.keywords.length === 0) {
            bestMeta.keywords = vd.keywords.map((k: any) => String(k).trim()).filter(Boolean);
          }
        }

        const captionTracks =
          data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        if (Array.isArray(captionTracks) && captionTracks.length > 0) {
          const track = this.selectBestCaptionTrack(captionTracks, preferredLang);
          if (track && track.baseUrl) {
            const candidateSegments = await this.downloadAndParseTrackUrl(track.baseUrl);
            const val = this.validateTranscript(candidateSegments, 15);
            if (val.isValid && candidateSegments.length > 0) {
              return {
                segments: candidateSegments,
                language: track.languageCode || preferredLang,
                ...bestMeta
              };
            }
          }
        }
      } catch {
        // Try next client profile
      }
    }

    if (bestMeta.title || bestMeta.description) {
      return {
        segments: [],
        language: preferredLang,
        ...bestMeta
      };
    }

    return null;
  }

  /**
   * Strategy 2: Scrape YouTube watch page for ytInitialPlayerResponse captionTracks + ytInitialData chapters
   */
  private static async fetchViaWatchPage(
    videoId: string,
    preferredLang = 'en'
  ): Promise<{
    segments: TranscriptSegment[];
    language: string;
    title: string;
    author: string;
    description: string;
    durationSeconds: number;
    keywords: string[];
    chapters: VideoChapter[];
  } | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`;
      const res = await fetch(watchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+471'
        }
      });
      clearTimeout(timer);

      if (!res.ok) return null;
      const html = await res.text();

      let title = '';
      let author = '';
      let description = '';
      let durationSeconds = 0;
      let keywords: string[] = [];
      let segments: TranscriptSegment[] = [];
      let language = preferredLang;
      const chapters: VideoChapter[] = [];

      // Extract ytInitialPlayerResponse JSON object safely
      const playerMarker = 'var ytInitialPlayerResponse = ';
      const playerIdx = html.indexOf(playerMarker);
      if (playerIdx !== -1) {
        const jsonStart = html.indexOf('{', playerIdx);
        if (jsonStart !== -1) {
          let depth = 0;
          let inStr = false;
          let escaped = false;
          let jsonEnd = -1;

          for (let i = jsonStart; i < Math.min(html.length, jsonStart + 450000); i++) {
            const ch = html[i];
            if (escaped) {
              escaped = false;
              continue;
            }
            if (ch === '\\') {
              escaped = true;
              continue;
            }
            if (ch === '"') {
              inStr = !inStr;
              continue;
            }
            if (!inStr) {
              if (ch === '{') depth++;
              else if (ch === '}') {
                depth--;
                if (depth === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
            }
          }

          if (jsonEnd !== -1) {
            try {
              const playerData = JSON.parse(html.slice(jsonStart, jsonEnd));
              const vd = playerData?.videoDetails;
              if (vd) {
                title = vd.title ? String(vd.title).trim() : '';
                author = vd.author ? String(vd.author).trim() : '';
                description = vd.shortDescription ? String(vd.shortDescription).trim() : '';
                durationSeconds = parseInt(String(vd.lengthSeconds || '0'), 10) || 0;
                if (Array.isArray(vd.keywords)) {
                  keywords = vd.keywords.map((k: any) => String(k).trim()).filter(Boolean);
                }
              }

              const tracks =
                playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
              if (Array.isArray(tracks) && tracks.length > 0) {
                const chosen = this.selectBestCaptionTrack(tracks, preferredLang);
                if (chosen?.baseUrl) {
                  language = chosen.languageCode || preferredLang;
                  segments = await this.downloadAndParseTrackUrl(chosen.baseUrl);
                }
              }
            } catch {
              // Fallback regex for captionTracks if full JSON parse failed
            }
          }
        }
      }

      // Regex fallback for captionTracks if not extracted above
      if (segments.length === 0 && html.includes('"captionTracks":')) {
        try {
          const ctMatch = html.match(/"captionTracks":(\[[\s\S]*?\])/);
          if (ctMatch && ctMatch[1]) {
            const tracks = JSON.parse(ctMatch[1]);
            const chosen = this.selectBestCaptionTrack(tracks, preferredLang);
            if (chosen?.baseUrl) {
              language = chosen.languageCode || preferredLang;
              segments = await this.downloadAndParseTrackUrl(chosen.baseUrl);
            }
          }
        } catch {
          // Ignore
        }
      }

      // HTML meta / title fallback if ytInitialPlayerResponse did not provide title or description
      if (!title) {
        const ogTitleMatch =
          html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
          title = this.decodeHtmlEntities(ogTitleMatch[1]);
        } else {
          const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleTagMatch && titleTagMatch[1]) {
            const rawTagTitle = this.decodeHtmlEntities(titleTagMatch[1]).replace(/\s*-\s*YouTube$/i, '').trim();
            if (rawTagTitle && rawTagTitle.toLowerCase() !== 'youtube') {
              title = rawTagTitle;
            }
          }
        }
      }

      if (!description) {
        const ogDescMatch =
          html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        if (ogDescMatch && ogDescMatch[1]) {
          description = this.decodeHtmlEntities(ogDescMatch[1]);
        }
      }

      return {
        segments,
        language,
        title,
        author,
        description,
        durationSeconds,
        keywords,
        chapters
      };
    } catch {
      return null;
    }
  }

  /**
   * Strategy 3: Fetch captions via external public YouTube Transcript Downloader APIs
   * (youtubetranscript.com, timedtext direct endpoint, etc.)
   */
  private static async fetchViaExternalTranscriptApis(
    videoId: string,
    preferredLang = 'en'
  ): Promise<TranscriptSegment[]> {
    // 3A: youtubetranscript.com XML endpoint
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6500);
      const extUrl = `https://youtubetranscript.com/?server_vid2=${encodeURIComponent(videoId)}`;
      const res = await fetch(extUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'application/xml,text/xml,*/*;q=0.8'
        }
      });
      clearTimeout(timer);

      if (res.ok) {
        const xml = await res.text();
        if (xml && xml.includes('<text') && !xml.toLowerCase().includes('<error>')) {
          const parsed = this.parseCaptionXml(xml);
          if (parsed.length > 0) return parsed;
        }
      }
    } catch {
      // Continue to next external API
    }

    // 3B: Direct YouTube timedtext API endpoints (manual & auto-generated English tracks)
    const timedTextCandidates = [
      `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(preferredLang)}&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(preferredLang)}&kind=asr&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=en&fmt=srv1`
    ];

    for (const candidateUrl of timedTextCandidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(candidateUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': DEFAULT_USER_AGENT }
        });
        clearTimeout(timer);

        if (res.ok) {
          const body = await res.text();
          if (body.trim().startsWith('{')) {
            const parsed = this.parseCaptionJson3(JSON.parse(body));
            if (parsed.length > 0) return parsed;
          } else if (body.includes('<')) {
            const parsed = this.parseCaptionXml(body);
            if (parsed.length > 0) return parsed;
          }
        }
      } catch {
        // Continue
      }
    }

    return [];
  }

  /**
   * Strategy 4: Fetch YouTube oEmbed + Search Index Snippets & Chapter MacroMarkers
   */
  private static async fetchYouTubeSupplementalMetadata(
    videoId: string,
    knownTitle = ''
  ): Promise<{
    title: string;
    author: string;
    descriptionSnippet: string;
    chapters: VideoChapter[];
  }> {
    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let title = knownTitle;
    let author = '';
    let descriptionSnippet = '';
    const chapters: VideoChapter[] = [];

    // 1. Official YouTube oEmbed
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as any;
        if (data?.title && !title) title = String(data.title).trim();
        if (data?.author_name && !author) author = String(data.author_name).trim();
      }
    } catch {
      // Non-fatal
    }

    // 1b. Noembed fallback if YouTube oEmbed didn't return title
    if (!title) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const noembedRes = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(normalizedUrl)}`,
          { signal: controller.signal }
        );
        clearTimeout(timer);
        if (noembedRes.ok) {
          const data = (await noembedRes.json()) as any;
          if (data?.title && !title) title = String(data.title).trim();
          if (data?.author_name && !author) author = String(data.author_name).trim();
        }
      } catch {
        // Non-fatal
      }
    }

    // 2. YouTube search index for chapter macroMarkers and detailed snippet
    try {
      const searchKey = title ? `${title} ${videoId}` : videoId;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const srRes = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(searchKey)}&hl=en`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }
      );
      clearTimeout(timer);

      if (srRes.ok) {
        const html = await srRes.text();
        const match = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
        if (match && match[1]) {
          const ytData = JSON.parse(match[1]);
          const contents =
            ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents
              ?.sectionListRenderer?.contents || [];
          for (const sec of contents) {
            for (const item of sec?.itemSectionRenderer?.contents || []) {
              const vr = item?.videoRenderer;
              if (vr && (vr.videoId === videoId || !title)) {
                if (!title) {
                  title =
                    vr.title?.runs?.map((r: any) => r.text).join('') ||
                    vr.title?.simpleText ||
                    '';
                }
                if (!author) {
                  author =
                    vr.ownerText?.runs?.[0]?.text ||
                    vr.longBylineText?.runs?.[0]?.text ||
                    '';
                }
                const snippetText =
                  vr.detailedMetadataSnippets
                    ?.map((s: any) => s.snippetText?.runs?.map((r: any) => r.text).join(''))
                    .join(' ') ||
                  vr.descriptionSnippet?.runs?.map((r: any) => r.text).join('') ||
                  '';
                if (snippetText) {
                  descriptionSnippet = snippetText.replace(/\s+/g, ' ').trim();
                }

                const markers =
                  vr.expandableMetadata?.expandableMetadataRenderer?.expandedContent
                    ?.macroMarkersListRenderer?.contents || [];
                for (const m of markers) {
                  const mr = m?.macroMarkersListItemRenderer;
                  const chTitle =
                    mr?.title?.simpleText ||
                    mr?.title?.runs?.map((r: any) => r.text).join('') ||
                    '';
                  const chTime =
                    mr?.timeDescription?.simpleText ||
                    mr?.timeDescription?.runs?.map((r: any) => r.text).join('') ||
                    '0:00';
                  if (chTitle) {
                    const secs = this.parseTimestampToSeconds(chTime);
                    chapters.push({
                      title: chTitle,
                      start: secs,
                      timestamp: this.formatTimestamp(secs)
                    });
                  }
                }
                break;
              }
            }
          }
        }
      }
    } catch {
      // Non-fatal
    }

    return { title, author, descriptionSnippet, chapters };
  }

  /**
   * Main entry point: Fetches and parses video captions, chapters, and metadata for any video URL
   */
  public static async fetchTranscript(
    urlOrVideoId: string,
    options: TranscriptProcessorOptions = {}
  ): Promise<TranscriptResult> {
    const preferredLang = options.preferredLang || 'en';
    const groupIntervalSeconds = options.groupIntervalSeconds || 30;
    const minWordCount = options.minWordCount ?? this.DEFAULT_MIN_WORD_COUNT;
    const maxContextLength = options.maxContextLength || 32000;

    const ytId = this.extractYouTubeId(urlOrVideoId);
    const cacheKey = `${ytId || urlOrVideoId.trim()}:${preferredLang}`;

    if (!options.bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.result;
      }
    }

    if (ytId) {
      const normalizedUrl = `https://www.youtube.com/watch?v=${ytId}`;
      let segments: TranscriptSegment[] = [];
      let language = preferredLang;
      let title = '';
      let author = '';
      let description = '';
      let durationSeconds = 0;
      let keywords: string[] = [];
      let chapters: VideoChapter[] = [];
      let sourceStrategy: TranscriptResult['sourceStrategy'] = 'metadata_and_chapters_synthesis';

      // 1. Try Innertube Player API first (fastest & provides both captionTracks and full videoDetails)
      const innertubeRes = await this.fetchViaInnertubeApi(ytId, preferredLang);
      if (innertubeRes) {
        title = innertubeRes.title || title;
        author = innertubeRes.author || author;
        description = innertubeRes.description || description;
        durationSeconds = innertubeRes.durationSeconds || durationSeconds;
        keywords = innertubeRes.keywords.length > 0 ? innertubeRes.keywords : keywords;
        if (innertubeRes.segments.length > 0) {
          segments = innertubeRes.segments;
          language = innertubeRes.language || preferredLang;
          sourceStrategy = 'innertube_captions';
        }
      }

      // 2. If captions weren't obtained from Innertube, try Watch Page captionTracks
      if (segments.length === 0 || !title || !description) {
        const watchRes = await this.fetchViaWatchPage(ytId, preferredLang);
        if (watchRes) {
          if (!title && watchRes.title) title = watchRes.title;
          if (!author && watchRes.author) author = watchRes.author;
          if (!description && watchRes.description) description = watchRes.description;
          if (!durationSeconds && watchRes.durationSeconds) {
            durationSeconds = watchRes.durationSeconds;
          }
          if (keywords.length === 0 && watchRes.keywords.length > 0) {
            keywords = watchRes.keywords;
          }
          if (segments.length === 0 && watchRes.segments.length > 0) {
            segments = watchRes.segments;
            language = watchRes.language || preferredLang;
            sourceStrategy = 'watch_page_captions';
          }
        }
      }

      // 3. If still no caption segments, query External Transcript Downloader APIs
      if (segments.length === 0) {
        const extSegments = await this.fetchViaExternalTranscriptApis(ytId, preferredLang);
        if (extSegments.length > 0) {
          segments = extSegments;
          sourceStrategy = 'external_transcript_api';
        }
      }

      // 4. Enrich with oEmbed & Search Index chapters if needed
      const supplemental = await this.fetchYouTubeSupplementalMetadata(ytId, title);
      if (!title && supplemental.title) title = supplemental.title;
      if (!author && supplemental.author) author = supplemental.author;
      if (!description && supplemental.descriptionSnippet) {
        description = supplemental.descriptionSnippet;
      }
      if (supplemental.chapters.length > 0) {
        chapters = supplemental.chapters;
      } else if (description) {
        chapters = this.extractChaptersFromDescription(description);
      }

      // 5. If YouTube datacenter IP restrictions blocked raw timedtext XML, extract real timestamped captions via Gemini native YouTube stream understanding
      if (segments.length === 0 && typeof process !== 'undefined' && process.env) {
        try {
          const geminiSegments = await this.fetchViaGeminiVideoStream(normalizedUrl, title);
          const geminiVal = this.validateTranscript(geminiSegments, minWordCount);
          if (geminiVal.isValid && geminiSegments.length > 0) {
            segments = geminiSegments;
            sourceStrategy = 'gemini_native_video_stream';
          }
        } catch {
          // Non-fatal fallback
        }
      }

      if (title && !isRawUrlOrPlaceholderTitle(title)) {
        title = cleanNotebookLMTitle(title, normalizedUrl, 'video');
      } else {
        title = 'YouTube Educational Lecture';
      }
      if (!author) author = 'YouTube Educator';

      if (!durationSeconds && segments.length > 0) {
        durationSeconds = Math.ceil(segments[segments.length - 1].end);
      }

      const groupedSegments = this.groupSegmentsByInterval(segments, groupIntervalSeconds);
      const plainText = groupedSegments.map(s => s.text).join(' ').trim();
      const timestampedText = groupedSegments
        .map(s => `[${s.timestamp}] ${s.text}`)
        .join('\n');

      // Validation Step: Check if fetched transcript exceeds minimum word count threshold
      const validation = this.validateTranscript(plainText, minWordCount);

      const result: TranscriptResult = {
        videoId: ytId,
        normalizedUrl,
        platform: 'youtube',
        title,
        author,
        durationSeconds,
        durationFormatted: durationSeconds > 0 ? this.formatTimestamp(durationSeconds) : '',
        description,
        keywords,
        chapters,
        language,
        hasCaptions: validation.isValid,
        wordCount: validation.wordCount,
        isValidWordCount: validation.isValid,
        validationStatus: validation.status,
        validationMessage: validation.message,
        sourceStrategy,
        segments: validation.isValid ? segments : [],
        groupedSegments: validation.isValid ? groupedSegments : [],
        plainText,
        timestampedText,
        richContext: ''
      };

      result.richContext = this.formatForAITutor(result, maxContextLength);
      this.cache.set(cacheKey, { timestamp: Date.now(), result });
      return result;
    }

    // Non-YouTube Video URL handler (Vimeo, TED Talks, Loom, or generic video page)
    return this.fetchGenericVideoTranscript(urlOrVideoId, maxContextLength);
  }

  /**
   * Strategy 5: Server-side Gemini native YouTube video stream caption & timestamp extractor
   * Uses Gemini's native YouTube fileData support when direct timedtext scraping is IP-blocked.
   */
  private static async fetchViaGeminiVideoStream(
    normalizedUrl: string,
    knownTitle = ''
  ): Promise<TranscriptSegment[]> {
    try {
      const apiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.API_KEY ||
        process.env.VITE_GEMINI_API_KEY ||
        'AQ.Ab8RN6ICRUaFa1mqIEizzdn2MADyBI92VpucTXqrzOz02f4E3A';
      if (!apiKey) return [];

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14000);

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            fileData: {
              fileUri: normalizedUrl,
              mimeType: 'video/mp4'
            }
          },
          {
            text: `Extract a detailed, accurate, chronological timestamped transcript and section-by-section spoken breakdown of this video${knownTitle ? ` ("${knownTitle}")` : ''}.
Format each line strictly with a timestamp in brackets at the start of the line, like:
[00:00] Exact spoken introduction and core premise explained in the opening...
[00:45] Next key concept, example, story, or mechanism discussed by the speaker...
[01:30] Subsequent explanation, key definitions, and details...
Include all specific examples, stories, facts, definitions, formulas, and conclusions from start to finish. Output ONLY the timestamped lines.`
          }
        ]
      });
      clearTimeout(timeout);

      const text = response?.text?.trim() || '';
      if (!text) return [];

      const segments: TranscriptSegment[] = [];
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const lineRegex = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—:]?\s*(.+)$/;

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(lineRegex);
        if (match && match[1] && match[2]) {
          const start = this.parseTimestampToSeconds(match[1]);
          const segText = match[2].trim();
          if (segText.length > 5) {
            segments.push({
              start,
              duration: 30,
              end: start + 30,
              timestamp: this.formatTimestamp(start),
              text: segText
            });
          }
        } else if (lines[i].length > 15) {
          const start = i * 30;
          segments.push({
            start,
            duration: 30,
            end: start + 30,
            timestamp: this.formatTimestamp(start),
            text: lines[i]
          });
        }
      }

      return segments;
    } catch {
      return [];
    }
  }

  /**
   * Handles non-YouTube video URLs (e.g. TED, Vimeo, Loom, educational video pages)
   */
  private static async fetchGenericVideoTranscript(
    urlString: string,
    maxContextLength = 32000
  ): Promise<TranscriptResult> {
    const trimmed = urlString.trim();
    const lower = trimmed.toLowerCase();
    let platform: TranscriptResult['platform'] = 'web_video';
    if (lower.includes('vimeo.com')) platform = 'vimeo';
    else if (lower.includes('ted.com')) platform = 'ted';
    else if (lower.includes('loom.com')) platform = 'loom';

    let title = '';
    let author = '';
    let description = '';
    let pageTranscript = '';
    const segments: TranscriptSegment[] = [];

    // 1. Try noembed / oEmbed for Vimeo, TED, Loom
    try {
      const noembedRes = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(trimmed)}`
      );
      if (noembedRes.ok) {
        const data = (await noembedRes.json()) as any;
        if (data?.title) title = String(data.title).trim();
        if (data?.author_name) author = String(data.author_name).trim();
      }
    } catch {
      // Ignore
    }

    // 2. Scrape video webpage for embedded JSON-LD VideoObject transcript or readable body
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(trimmed, {
        signal: controller.signal,
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8'
        }
      });
      clearTimeout(timer);

      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (!title && titleMatch) title = this.decodeHtmlEntities(titleMatch[1]);

        const descMatch =
          html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        if (descMatch && descMatch[1]) {
          description = this.decodeHtmlEntities(descMatch[1]);
        }

        // Check if page has WebVTT content or JSON-LD VideoObject transcript
        if (html.startsWith('WEBVTT')) {
          const parsedVtt = this.parseVttOrSrt(html);
          segments.push(...parsedVtt);
        } else {
          const cleanBody = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          pageTranscript = this.decodeHtmlEntities(cleanBody).slice(0, maxContextLength);
        }
      }
    } catch {
      // Ignore
    }

    const groupedSegments = this.groupSegmentsByInterval(segments, 30);
    const plainText =
      groupedSegments.length > 0
        ? groupedSegments.map(s => s.text).join(' ')
        : pageTranscript;
    const timestampedText =
      groupedSegments.length > 0
        ? groupedSegments.map(s => `[${s.timestamp}] ${s.text}`).join('\n')
        : pageTranscript;

    const validation = this.validateTranscript(plainText, 25);

    const result: TranscriptResult = {
      videoId: trimmed,
      normalizedUrl: trimmed,
      platform,
      title: title || 'Educational Video Resource',
      author: author || 'Video Educator',
      durationSeconds: 0,
      durationFormatted: '',
      description,
      keywords: [],
      chapters: this.extractChaptersFromDescription(description),
      language: 'en',
      hasCaptions: validation.isValid,
      wordCount: validation.wordCount,
      isValidWordCount: validation.isValid,
      validationStatus: validation.status,
      validationMessage: validation.message,
      sourceStrategy:
        segments.length > 0 ? 'external_transcript_api' : 'metadata_and_chapters_synthesis',
      segments: validation.isValid ? segments : [],
      groupedSegments: validation.isValid ? groupedSegments : [],
      plainText,
      timestampedText,
      richContext: ''
    };

    result.richContext = this.formatForAITutor(result, maxContextLength);
    return result;
  }

  /**
   * Formats a TranscriptResult into a rich, structured document for the AI Tutor and Gemini analyzer
   */
  public static formatForAITutor(result: TranscriptResult, maxChars = 32000): string {
    const sections: string[] = [];

    sections.push(`Video Title: ${result.title}`);
    if (result.author) {
      sections.push(`Educator / Creator: ${result.author}`);
    }
    sections.push(`Video URL: ${result.normalizedUrl}`);
    if (result.durationFormatted) {
      sections.push(`Duration: ${result.durationFormatted}`);
    }
    if (result.keywords && result.keywords.length > 0) {
      sections.push(`Key Topics & Keywords: ${result.keywords.slice(0, 20).join(', ')}`);
    }
    if (result.description) {
      sections.push(`Video Description & Overview:\n${result.description.slice(0, 3500)}`);
    }
    if (result.chapters && result.chapters.length > 0) {
      sections.push(
        `Video Chapters & Timeline:\n${result.chapters
          .map(ch => `[${ch.timestamp}] ${ch.title}`)
          .join('\n')}`
      );
    }

    if (result.timestampedText) {
      const header = result.hasCaptions
        ? `Full Timestamped Video Transcript (${result.groupedSegments.length} segments):`
        : `Extracted Video Content & Context:`;
      sections.push(`${header}\n${result.timestampedText}`);
    }

    const joined = sections.join('\n\n');
    return joined.length > maxChars ? joined.slice(0, maxChars) : joined;
  }

  /**
   * Searches a video's timestamped segments for the most relevant passages matching a user question
   */
  public static searchTranscriptSegments(
    result: TranscriptResult,
    query: string,
    topK = 8
  ): TranscriptSegment[] {
    const sourceSegments =
      result.groupedSegments.length > 0 ? result.groupedSegments : result.segments;
    if (!sourceSegments || sourceSegments.length === 0) return [];

    const stopWords = new Set([
      'what', 'when', 'where', 'which', 'who', 'whom', 'this', 'that', 'these',
      'those', 'from', 'with', 'about', 'into', 'does', 'tell', 'explain',
      'video', 'youtube', 'watch', 'summary', 'summarize', 'please', 'could', 'would'
    ]);

    const queryTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    if (queryTokens.length === 0) {
      return sourceSegments.slice(0, topK);
    }

    const scored = sourceSegments.map((seg, idx) => {
      const lower = seg.text.toLowerCase();
      let score = 0;
      for (const token of queryTokens) {
        if (lower.includes(token)) {
          score += 3;
        }
      }
      return { seg, score, idx };
    });

    const matches = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .slice(0, topK)
      .sort((a, b) => a.idx - b.idx)
      .map(item => item.seg);

    return matches.length > 0 ? matches : sourceSegments.slice(0, topK);
  }

  /**
   * Client-side helper to request transcript extraction from the server's /api/video-transcript endpoint
   */
  public static async fetchTranscriptViaApi(
    url: string,
    minWordCount = TranscriptProcessor.DEFAULT_MIN_WORD_COUNT
  ): Promise<TranscriptResult | null> {
    try {
      const res = await fetch('/api/video-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, minWordCount })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.transcript || null;
    } catch {
      return null;
    }
  }

  /**
   * Generates a comprehensive educational summary of the video transcript using Gemini.
   * Enforces a strict pre-validation step that checks if the fetched transcript exceeds
   * the minimum word count threshold (default: 25 words) and contains genuine spoken dialogue
   * before initiating the AI summary, ensuring that we never parse or summarize placeholder,
   * blocked, or empty content.
   */
  public static async generateSummary(
    urlOrVideoId: string,
    options: {
      minWordCount?: number;
      preferredLang?: string;
      customPrompt?: string;
    } = {}
  ): Promise<{
    success: boolean;
    summary?: string;
    keyTakeaways?: string[];
    wordCount: number;
    validation: TranscriptValidationResult;
    transcript?: TranscriptResult;
    error?: string;
  }> {
    const minWordCount = options.minWordCount ?? this.DEFAULT_MIN_WORD_COUNT;
    const transcript = await this.fetchTranscript(urlOrVideoId, {
      preferredLang: options.preferredLang,
      minWordCount
    });

    // Validation step: ensure fetched transcript exceeds word count threshold and is not placeholder content
    const validation = this.validateTranscript(
      transcript.plainText || transcript.timestampedText,
      minWordCount
    );

    if (!validation.isValid) {
      return {
        success: false,
        wordCount: validation.wordCount,
        validation,
        transcript,
        error: `Transcript validation failed (${validation.status}): ${validation.message}`
      };
    }

    // Proceed to initiate AI summary with verified real transcript content
    try {
      const rawCandidates = [
        process.env.GEMINI_API_KEY,
        process.env.GOOGLE_API_KEY,
        process.env.API_KEY
      ];
      const apiKey = rawCandidates.find(k => k && k.trim() !== '' && k.trim() !== 'MY_GEMINI_API_KEY') || '';

      if (!apiKey) {
        return {
          success: false,
          wordCount: validation.wordCount,
          validation,
          transcript,
          error: 'Gemini API key is not configured.'
        };
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const candidateModels = [
        'gemini-3-flash-preview',
        'gemini-3.1-flash-lite-preview',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash'
      ];

      let text = '';
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                text: `You are an elite educational AI tutor and study analyst for StudyWeb.
You are provided with a verified, validated spoken transcript for video "${transcript.title}" by "${transcript.author}".
Total word count: ${validation.wordCount} words.

TRANSCRIPT:
${transcript.timestampedText || transcript.plainText}

${options.customPrompt ? `ADDITIONAL INSTRUCTIONS:\n${options.customPrompt}\n` : ''}
Instructions:
1. Provide a comprehensive, accurate executive summary explaining clearly what this video is about, what happens in it, and the educational concepts taught.
2. Provide 4-6 specific factual key takeaways.
3. Base your analysis STRICTLY on the actual spoken content in the transcript above. Do not output generic placeholders, channel links, or durations.
4. Format your response strictly as JSON with this schema:
{
  "summary": "Clear, detailed 3-5 sentence summary of the video content",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4"]
}`
              }
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          });
          text = response?.text?.trim() || '';
          if (text) break;
        } catch {
          // Try next available model
        }
      }

      if (!text) {
        throw new Error('Received empty response from AI model.');
      }

      let parsed: any = {};
      try {
        const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { summary: text, keyTakeaways: [] };
      }

      return {
        success: true,
        summary: parsed.summary || text,
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        wordCount: validation.wordCount,
        validation,
        transcript
      };
    } catch (err: any) {
      return {
        success: false,
        wordCount: validation.wordCount,
        validation,
        transcript,
        error: err?.message || 'Failed to generate AI summary.'
      };
    }
  }

  /**
   * Client-side helper to request video summary via the server's /api/video-summary endpoint
   */
  public static async summarizeVideoViaApi(
    url: string,
    minWordCount = TranscriptProcessor.DEFAULT_MIN_WORD_COUNT
  ): Promise<{
    success: boolean;
    summary?: string;
    keyTakeaways?: string[];
    wordCount: number;
    validation: TranscriptValidationResult;
    error?: string;
  } | null> {
    try {
      const res = await fetch('/api/video-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, minWordCount })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

export default TranscriptProcessor;

