/**
 * NotebookLM-style automatic title resolution and cleaning utilities.
 * Ensures that any uploaded YouTube video, web link, or document is given a clean,
 * human-readable academic title (e.g. "The Happy Prince – Class 9th") and never
 * displays a raw URL (https://www...) or generic placeholder as its name.
 */

export function isRawUrlOrPlaceholderTitle(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('www.') ||
    lower.includes('://www.') ||
    lower.includes('youtube.com/watch') ||
    lower.includes('youtu.be/') ||
    lower.includes('youtube.com/shorts') ||
    lower === 'web link' ||
    lower === 'youtube video' ||
    lower === 'study resource' ||
    lower === 'external study resource' ||
    lower === 'uploaded document' ||
    lower === 'untitled resource' ||
    lower === 'untitled document' ||
    lower === 'web resource' ||
    lower === 'analyzed study resource' ||
    lower === 'educational video resource' ||
    lower === 'youtube educational lecture' ||
    lower === 'educational video lecture' ||
    lower === 'video lecture' ||
    lower === 'resource' ||
    /^youtube video\s*\([a-z0-9_-]+\)$/i.test(trimmed) ||
    /^(video|link|url|source)\s*:\s*https?:\/\//i.test(trimmed)
  ) {
    return true;
  }

  // Also detect if the entire string is just a domain or URL path without spaces
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(trimmed) && !/\s/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Checks whether a document filename looks like a raw camera/scanner/system filename
 * (e.g. "IMG_20260312.jpg", "scan_001.pdf", "document_final_v2.pdf") that should be
 * replaced by the AI-analyzed title of the material.
 */
export function isRawSystemFilename(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (isRawUrlOrPlaceholderTitle(trimmed)) return true;

  const withoutExt = trimmed.replace(/\.[a-z0-9]{2,5}$/i, '').trim();
  if (!withoutExt || withoutExt.length < 3) return true;

  // Camera / screenshot / WhatsApp / scanner patterns
  if (
    /^(img|dsc|scan|doc|file|image|video|audio|recording|screenshot|whatsapp|pxl|vid|aud)[-_~\s]*\d+/i.test(withoutExt) ||
    /^[0-9a-f]{8,}(-[0-9a-f]{4,})*$/i.test(withoutExt) ||
    /^\d{6,}$/.test(withoutExt)
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts a clean, human-readable fallback title from a URL path/query when
 * live scraping or oEmbed hasn't completed yet—never returns "https://..."
 */
export function extractFallbackTitleFromUrl(urlString?: string | null, type?: string): string {
  if (!urlString || typeof urlString !== 'string') {
    return type === 'video' ? 'Educational Video Lecture' : 'Study Material';
  }

  try {
    const parsed = new URL(urlString.trim());
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    // Wikipedia URLs: /wiki/The_Happy_Prince -> "The Happy Prince"
    if (host.includes('wikipedia.org') && parsed.pathname.includes('/wiki/')) {
      const slug = decodeURIComponent(parsed.pathname.split('/wiki/')[1] || '').split('#')[0];
      if (slug) {
        return slug.replace(/_/g, ' ').trim();
      }
    }

    // Check readable path segments (skipping generic segments like 'watch', 'embed', 'shorts', 'v', 'articles')
    const segments = parsed.pathname
      .split('/')
      .map(s => decodeURIComponent(s).trim())
      .filter(
        s =>
          s.length > 2 &&
          !/^(watch|embed|shorts|live|v|p|index|home|view|file|download|api|rest_v1|page|pdf)$/i.test(s) &&
          !/^[a-zA-Z0-9_-]{11}$/.test(s) // skip raw 11-char YouTube IDs
      );

    if (segments.length > 0) {
      const lastSeg = segments[segments.length - 1]
        .replace(/\.[a-z0-9]{2,5}$/i, '') // remove extension like .pdf, .html
        .replace(/[-_+]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (lastSeg.length > 3 && !/^\d+$/.test(lastSeg)) {
        return toTitleCase(lastSeg);
      }
    }

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return 'YouTube Educational Lecture';
    }

    const domainName = host.split('.')[0] || 'Web';
    return `${toTitleCase(domainName)} Study Resource`;
  } catch {
    return type === 'video' ? 'Educational Video Lecture' : 'Study Material';
  }
}

function toTitleCase(str: string): string {
  const minorWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of', 'with']);
  return str
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return word;
      // Preserve words that already have intentional uppercase (e.g., "CBSE", "DNA", "ATP", "II")
      if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word;
      }
      const lower = word.toLowerCase();
      if (index > 0 && minorWords.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Cleans any raw title (from YouTube, webpage <title>, Gemini, or filename)
 * into a crisp, NotebookLM-style title.
 * Example:
 *   "Class 9th English | The Happy Prince Full Chapter Explanation | CBSE 2025 - YouTube https://youtu.be/xyz"
 *   -> "The Happy Prince – Class 9th English"
 */
export function cleanNotebookLMTitle(
  rawTitle?: string | null,
  sourceUrl?: string | null,
  type?: string
): string {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return extractFallbackTitleFromUrl(sourceUrl, type);
  }

  let title = rawTitle.trim();

  // 1. Strip any embedded URLs (http://..., https://..., www....)
  title = title
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/^(video|link|url|source|youtube)\s*:\s*/i, '')
    .trim();

  // 2. Strip common platform suffixes
  title = title
    .replace(/\s*[-|–—•·]\s*YouTube$/i, '')
    .replace(/\s*[-|–—•·]\s*Wikipedia(\s*,\s*the free encyclopedia)?$/i, '')
    .replace(/\s*[-|–—•·]\s*Khan Academy$/i, '')
    .replace(/\s*[-|–—•·]\s*Vimeo$/i, '')
    .replace(/\s*[-|–—•·]\s*Loom$/i, '')
    .trim();

  // 3. Remove hashtags (#shorts, #cbse, #viral, etc.)
  title = title.replace(/#[a-zA-Z0-9_]+/g, '').trim();

  // 4. Clean file extensions if it looks like a filename (e.g., "The_Happy_Prince_Class_9.pdf")
  if (/\.(pdf|docx?|pptx?|xlsx?|mp4|mp3|wav|m4a|webm|mov|txt|md)$/i.test(title)) {
    title = title.replace(/\.(pdf|docx?|pptx?|xlsx?|mp4|mp3|wav|m4a|webm|mov|txt|md)$/i, '');
    if (!/\s/.test(title) && /[_-]/.test(title)) {
      title = toTitleCase(title.replace(/[_-]+/g, ' '));
    }
  }

  // 5. Clean pipe-separated or noisy YouTube titles into NotebookLM style
  // e.g. "Class 9 English | The Happy Prince | Full Chapter Summary | Magnet Brains"
  if (title.includes('|')) {
    const parts = title
      .split('|')
      .map(p => p.trim())
      .filter(p => {
        if (!p) return false;
        const lp = p.toLowerCase();
        // Drop noisy promotional segments
        if (
          /^(subscribe|like|share|follow|official|channel|watch now|must watch|100% marks|live|session \d+|part \d+)$/i.test(lp)
        ) {
          return false;
        }
        return true;
      });

    if (parts.length >= 2) {
      // Check if first part is "Class 9th..." and second part is the actual topic name (e.g. "The Happy Prince")
      const firstIsClass = /^(class|grade|std|unit|chapter|ch)\s*\d+/i.test(parts[0]);
      if (firstIsClass && parts[1]) {
        const cleanedSecond = parts[1]
          .replace(/\b(full chapter|explanation|in hindi|in english|one shot|animation)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleanedSecond.length >= 3) {
          title = `${cleanedSecond} – ${parts[0]}`;
        } else {
          title = `${parts[1]} – ${parts[0]}`;
        }
      } else {
        title = parts.slice(0, 2).join(' – ');
      }
    } else if (parts.length === 1) {
      title = parts[0];
    }
  }

  // Collapse extra whitespace and dangling punctuation
  title = title
    .replace(/\s+/g, ' ')
    .replace(/^[-|–—•·:\s]+|[-|–—•·:\s]+$/g, '')
    .trim();

  if (isRawUrlOrPlaceholderTitle(title)) {
    return extractFallbackTitleFromUrl(sourceUrl, type);
  }

  if (title.length > 90) {
    title = title.slice(0, 87).trim() + '...';
  }

  return title;
}

/**
 * Resolves a fast preliminary title on the client for a YouTube or web URL using public oEmbed/noembed
 * so that even during upload or offline fallback, the user sees the real title instead of https://...
 */
export async function resolveQuickLinkTitleClient(url: string, type?: string): Promise<string> {
  const trimmed = (url || '').trim();
  if (!trimmed.startsWith('http')) {
    return cleanNotebookLMTitle(trimmed, undefined, type);
  }

  const lower = trimmed.toLowerCase();
  const isYt = lower.includes('youtube.com') || lower.includes('youtu.be');

  if (isYt) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(trimmed)}&format=json`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data?.title) {
          return cleanNotebookLMTitle(String(data.title), trimmed, 'video');
        }
      }
    } catch {
      // Try noembed next
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const noembedRes = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(trimmed)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (noembedRes.ok) {
      const data = await noembedRes.json();
      if (data?.title) {
        return cleanNotebookLMTitle(String(data.title), trimmed, type);
      }
    }
  } catch {
    // Ignore
  }

  return extractFallbackTitleFromUrl(trimmed, type);
}

/**
 * Guaranteed UI display helper for any WorkspaceFile.
 * Never returns a raw URL (https://www...) even if an older un-repaired record exists in state.
 */
export function getNotebookLMDisplayTitle(file: {
  name?: string | null;
  url?: string | null;
  type?: string;
  summary?: string | null;
}): string {
  if (!file) return 'Study Material';

  // If file.name is already a valid non-URL title, clean and return it
  if (file.name && !isRawUrlOrPlaceholderTitle(file.name)) {
    return cleanNotebookLMTitle(file.name, file.url, file.type);
  }

  // Otherwise try to extract a quoted title from summary if available
  if (file.summary && typeof file.summary === 'string') {
    const quotedMatch = file.summary.match(/"([^"]{4,80})"/);
    if (quotedMatch && quotedMatch[1] && !isRawUrlOrPlaceholderTitle(quotedMatch[1])) {
      return cleanNotebookLMTitle(quotedMatch[1], file.url, file.type);
    }
  }

  return extractFallbackTitleFromUrl(file.url || file.name, file.type);
}
