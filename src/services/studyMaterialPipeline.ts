import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { toValidUuid, isValidUuid, generateUuid } from '../utils/uuid.js';
import { TranscriptProcessor, TranscriptResult, TranscriptValidationStatus, TranscriptValidationResult } from './TranscriptProcessor.js';
import { cleanNotebookLMTitle, isRawUrlOrPlaceholderTitle } from '../utils/notebookTitle.js';
import { getServerGeminiApiKey } from '../utils/serverEnv.js';

export const studyMaterialRouter = express.Router();

const DEFAULT_SUPABASE_URL = 'https://fzutrlzeyystbaiueker.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dXRybHpleXlzdGJhaXVla2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTg1MDMsImV4cCI6MjA5ODk3NDUwM30.usJ97CqSdQOAhYC8nXGvKg42xiKrjsmlJiGSTIYSLF4';

function sanitizeBearerHeader(authHeader?: string): string | undefined {
  if (!authHeader || typeof authHeader !== 'string' || authHeader.length >= 4000) return undefined;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return undefined;
  const trimmed = authHeader.trim();
  const token = trimmed.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === 'undefined' || token === 'null') return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload && typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now() + 10_000) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return /^Bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${token}`;
}

export function getSupabaseServer(authHeader?: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const safeAuth = sanitizeBearerHeader(authHeader);
  const options = safeAuth ? { global: { headers: { Authorization: safeAuth } } } : {};
  return createClient(supabaseUrl, supabaseKey, options);
}

function extractJwtUserId(token: string): string | null {
  try {
    const parts = token.replace(/^Bearer\s+/i, '').trim().split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload && typeof payload.sub === 'string' && isValidUuid(payload.sub)) {
      return payload.sub;
    }
  } catch {
    // Ignore decode errors
  }
  return null;
}

dotenv.config();

export function getGeminiApiKey(): string {
  return getServerGeminiApiKey() || '';
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

/**
 * Validates URLs against SSRF: blocks private IP spaces and forbidden protocols
 */
export function validateSafeUrl(urlString: string): { valid: boolean; error?: string; url?: URL } {
  try {
    const parsed = new URL(urlString.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only http and https protocols are supported.' };
    }

    const host = parsed.hostname.toLowerCase();
    // Block localhost, IP literals, and cloud metadata addresses
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '169.254.169.254' ||
      host === 'metadata.google.internal' ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
    ) {
      return { valid: false, error: 'Access to local or private network destinations is prohibited.' };
    }

    return { valid: true, url: parsed };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

export function isRawUrlOrPlaceholderName(name?: string | null): boolean {
  return isRawUrlOrPlaceholderTitle(name);
}

/**
 * Scrapes and extracts comprehensive content from any public URL across the internet,
 * including X/Twitter, Facebook, Wikipedia, Reddit, news sites, blogs, and dynamic JS websites.
 */
export async function scrapeWebPage(urlString: string): Promise<{ title: string; description: string; text: string }> {
  const check = validateSafeUrl(urlString);
  if (!check.valid || !check.url) {
    throw new Error(check.error || 'Invalid or forbidden URL.');
  }

  const parsedUrl = check.url;
  const host = parsedUrl.hostname.toLowerCase();

  const fetchJinaReaderMarkdown = async (targetUrl: string): Promise<{ title: string; text: string } | null> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, {
        signal: ctrl.signal,
        headers: {
          'Accept': 'text/plain',
          'X-Return-Format': 'markdown',
          'User-Agent': 'StudyWeb-Academic-Analyzer/2.0'
        }
      });
      clearTimeout(timer);
      if (!jinaRes.ok) return null;
      const rawMd = (await jinaRes.text()).trim();
      if (!rawMd || rawMd.length < 40) return null;

      let jinaTitle = '';
      const titleLine = rawMd.match(/^Title:\s*(.+)$/m);
      if (titleLine && titleLine[1]) {
        jinaTitle = titleLine[1].trim();
      }
      return {
        title: jinaTitle,
        text: rawMd.slice(0, 28000)
      };
    } catch {
      clearTimeout(timer);
      return null;
    }
  };

  // 1. Dedicated high-precision path for Wikipedia articles
  if (host.includes('wikipedia.org') && parsedUrl.pathname.includes('/wiki/')) {
    try {
      const rawTitle = decodeURIComponent(parsedUrl.pathname.split('/wiki/')[1] || '').split('#')[0];
      if (rawTitle) {
        const lang = host.split('.')[0] || 'en';
        const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(rawTitle)}&format=json&redirects=1`;
        const wikiRes = await fetch(apiUrl, {
          headers: { 'User-Agent': 'StudyWeb-Academic-Analyzer/2.0' }
        });
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json() as any;
          const pages = wikiData?.query?.pages || {};
          const firstPage = Object.values(pages)[0] as any;
          if (firstPage && firstPage.extract) {
            const cleanTitle = firstPage.title || rawTitle.replace(/_/g, ' ');
            const fullExtract = String(firstPage.extract).trim();
            return {
              title: cleanTitle,
              description: fullExtract.slice(0, 400),
              text: fullExtract.slice(0, 28000)
            };
          }
        }
      }
    } catch {
      // Fall through
    }
  }

  // 2. Dedicated high-precision path for X / Twitter (x.com, twitter.com)
  if (host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com')) {
    const statusMatch = parsedUrl.pathname.match(/^\/([^/?#]+)\/status(?:es)?\/(\d+)/i);
    const handleMatch = parsedUrl.pathname.match(/^\/([^/?#]+)/i);
    const parts: string[] = [];
    let resolvedTitle = '';
    let resolvedDesc = '';

    if (statusMatch) {
      const screenName = statusMatch[1];
      const statusId = statusMatch[2];

      // Query FxTwitter API for full post text, long-form X notes, quoted posts, and media metadata
      try {
        const fxCtrl = new AbortController();
        const fxTimer = setTimeout(() => fxCtrl.abort(), 8000);
        const fxRes = await fetch(`https://api.fxtwitter.com/${screenName}/status/${statusId}`, {
          signal: fxCtrl.signal,
          headers: { 'User-Agent': 'StudyWeb-Academic-Analyzer/2.0' }
        });
        clearTimeout(fxTimer);
        if (fxRes.ok) {
          const fxData = await fxRes.json() as any;
          const tweet = fxData?.tweet;
          if (tweet) {
            const authorName = tweet.author?.name || screenName;
            const authorHandle = tweet.author?.screen_name || screenName;
            const tweetText = tweet.text || tweet.raw_text?.text || '';
            resolvedTitle = `${authorName} (@${authorHandle}): "${tweetText.slice(0, 75)}${tweetText.length > 75 ? '...' : ''}"`;
            resolvedDesc = tweetText.slice(0, 400);

            parts.push(`Platform: X (Twitter)`);
            parts.push(`Author: ${authorName} (@${authorHandle})`);
            if (tweet.author?.description) parts.push(`Author Bio: ${tweet.author.description}`);
            if (tweet.created_at) parts.push(`Posted At: ${tweet.created_at}`);
            parts.push(`\nFull X / Twitter Post Content:\n${tweetText}`);

            if (tweet.quote) {
              parts.push(
                `\nQuoted Post from ${tweet.quote.author?.name || ''} (@${tweet.quote.author?.screen_name || ''}):\n${tweet.quote.text || ''}`
              );
            }
            if (tweet.poll && Array.isArray(tweet.poll.choices)) {
              parts.push(
                `\nPoll Options:\n${tweet.poll.choices.map((c: any) => `- ${c.label}: ${c.percentage}% (${c.count} votes)`).join('\n')}`
              );
            }
            if (tweet.media?.all && Array.isArray(tweet.media.all)) {
              const mediaDesc = tweet.media.all
                .map((m: any, idx: number) => `Media ${idx + 1}: ${m.type || 'attachment'} ${m.altText ? `(Alt text: ${m.altText})` : ''} ${m.url || ''}`)
                .join('\n');
              if (mediaDesc) parts.push(`\nAttached Media:\n${mediaDesc}`);
            }
          }
        }
      } catch {
        // Fallback to oEmbed / Jina below
      }

      // Also check Twitter oEmbed if FxTwitter didn't return text
      if (parts.length === 0) {
        try {
          const oemRes = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(parsedUrl.toString())}&omit_script=true`);
          if (oemRes.ok) {
            const oemData = await oemRes.json() as any;
            const cleanHtml = String(oemData?.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanHtml) {
              resolvedTitle = `${oemData?.author_name || screenName} on X: "${cleanHtml.slice(0, 70)}..."`;
              resolvedDesc = cleanHtml.slice(0, 400);
              parts.push(`Author: ${oemData?.author_name || screenName}\nPost Content:\n${cleanHtml}`);
            }
          }
        } catch {}
      }
    }

    // Also try Jina Reader to capture full thread replies or profile/article context
    const jinaResult = await fetchJinaReaderMarkdown(parsedUrl.toString());
    if (jinaResult?.text) {
      parts.push(`\nExtended Web & Thread Context:\n${jinaResult.text}`);
      if (!resolvedTitle && jinaResult.title) {
        resolvedTitle = jinaResult.title;
      }
    }

    if (parts.length > 0) {
      const fallbackHandle = handleMatch?.[1] || 'X';
      return {
        title: resolvedTitle || `X Post by @${fallbackHandle}`,
        description: resolvedDesc || parts.join(' ').slice(0, 400),
        text: parts.join('\n\n').slice(0, 28000)
      };
    }
  }

  // 3. General Web & Social Media Scraper (Facebook, Reddit, Medium, News, Blogs, Docs, etc.)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let htmlTitle = '';
  let htmlDescription = '';
  let htmlBodyText = '';
  let ldJsonExtracted = '';

  try {
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html') || contentType.includes('text/plain') || contentType.includes('application/xhtml+xml')) {
        const html = await res.text();

        const decodeEntities = (s: string) =>
          s
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/gi, "'")
            .replace(/&#x2F;/gi, '/')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
            .trim();

        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) htmlTitle = decodeEntities(titleMatch[1].replace(/\s+/g, ' '));

        const extractMeta = (pattern: RegExp): string => {
          const m = html.match(pattern);
          return m && m[1] ? decodeEntities(m[1]) : '';
        };

        const ogTitle =
          extractMeta(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
          extractMeta(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
          extractMeta(/<meta\s+[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
        if (ogTitle && ogTitle.length > 3) htmlTitle = ogTitle;

        htmlDescription =
          extractMeta(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
          extractMeta(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i) ||
          extractMeta(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
          extractMeta(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
          extractMeta(/<meta\s+[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i);

        // Extract JSON-LD structured data (articles, social posts, Q&A, videos)
        const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        const ldSnippets: string[] = [];
        for (const match of ldMatches) {
          try {
            const rawJson = match[1]?.trim();
            if (!rawJson) continue;
            const parsedLd = JSON.parse(rawJson);
            const items = Array.isArray(parsedLd) ? parsedLd : (parsedLd['@graph'] ? parsedLd['@graph'] : [parsedLd]);
            for (const item of items) {
              if (!item || typeof item !== 'object') continue;
              const headline = item.headline || item.name || '';
              const body = item.articleBody || item.text || item.description || '';
              const author = typeof item.author === 'string' ? item.author : (item.author?.name || '');
              if (headline && !htmlTitle) htmlTitle = String(headline);
              if (headline || body) {
                ldSnippets.push(
                  [
                    headline ? `Headline: ${headline}` : '',
                    author ? `Author: ${author}` : '',
                    body ? `Body: ${body}` : ''
                  ].filter(Boolean).join('\n')
                );
              }
            }
          } catch {}
        }
        ldJsonExtracted = ldSnippets.join('\n\n');

        htmlBodyText = decodeEntities(
          html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
            .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
            .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
        );
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // If the page is a social media link (Facebook, Instagram, Reddit, LinkedIn, etc.) or returned thin/login-walled HTML,
  // also fetch via Jina Reader to extract the full rendered webpage text
  const isSocialOrDynamicHost =
    host.includes('facebook.com') ||
    host.includes('fb.com') ||
    host.includes('fb.watch') ||
    host.includes('instagram.com') ||
    host.includes('threads.net') ||
    host.includes('reddit.com') ||
    host.includes('linkedin.com') ||
    host.includes('medium.com') ||
    host.includes('substack.com') ||
    host.includes('quora.com');

  let jinaMarkdown = '';
  let jinaTitle = '';
  if (isSocialOrDynamicHost || htmlBodyText.length < 650) {
    const jina = await fetchJinaReaderMarkdown(parsedUrl.toString());
    if (jina) {
      jinaMarkdown = jina.text;
      jinaTitle = jina.title;
    }
  }

  const combinedTextParts = [
    `Source URL: ${parsedUrl.toString()}`,
    (htmlTitle || jinaTitle) ? `Page Title: ${htmlTitle || jinaTitle}` : '',
    htmlDescription ? `Meta Description / Summary: ${htmlDescription}` : '',
    ldJsonExtracted ? `Structured Page Data:\n${ldJsonExtracted}` : '',
    jinaMarkdown ? `Extracted Web Reader Content:\n${jinaMarkdown}` : '',
    htmlBodyText ? `Extracted Webpage Text:\n${htmlBodyText}` : ''
  ].filter(Boolean);

  const finalTitle =
    (htmlTitle && !/^(log in|login|sign up|facebook|x|twitter|just a moment|attention required)/i.test(htmlTitle.trim())
      ? htmlTitle
      : '') ||
    jinaTitle ||
    htmlTitle ||
    parsedUrl.hostname;

  return {
    title: finalTitle,
    description: htmlDescription || jinaMarkdown.slice(0, 400) || htmlBodyText.slice(0, 400),
    text: combinedTextParts.join('\n\n').slice(0, 28000)
  };
}

/**
 * Uses Gemini's built-in `urlContext` and `googleSearch` tools to deeply inspect any URL across the internet
 * (YouTube, X/Twitter, Facebook, blogs, documentation, news, etc.) and gather verified facts & context.
 */
export async function enrichUrlWithGeminiWebGrounding(
  ai: GoogleGenAI,
  sourceUrl: string,
  initialTitle?: string,
  initialScrapedText?: string
): Promise<{ groundedTitle?: string; groundedContent: string }> {
  const groundedModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
  const prompt = `Carefully inspect and analyze this exact URL from across the internet using URL Context and Google Search:
URL: ${sourceUrl}
${initialTitle ? `Known Title / Label: ${initialTitle}` : ''}
${initialScrapedText ? `\nInitial Scraped Page Data:\n${initialScrapedText.slice(0, 12000)}\n` : ''}

Instructions:
1. Retrieve and verify the exact content of this URL (whether it is a YouTube video, X/Twitter post or thread, Facebook post/article/video, academic article, documentation page, or website).
2. Extract:
   - The exact, accurate title or headline of the post/video/article
   - The author, creator, channel, or organization
   - The complete verbatim or comprehensive content, all facts, arguments, data points, quotes, explanations, formulas, and key takeaways presented at this URL and across web search results for this URL.
3. Start your response with "TITLE: <Exact Clean Title>" on the first line, followed by the full detailed breakdown.`;

  for (const model of groundedModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ urlContext: {} }, { googleSearch: {} }]
        }
      });
      const text = (response?.text || '').trim();
      if (text && text.length > 60) {
        let groundedTitle: string | undefined;
        const firstLineMatch = text.match(/^TITLE:\s*(.+)$/m);
        if (firstLineMatch && firstLineMatch[1]) {
          const candidate = firstLineMatch[1].replace(/^["']|["']$/g, '').trim();
          if (candidate.length > 3 && !isRawUrlOrPlaceholderName(candidate)) {
            groundedTitle = candidate;
          }
        }
        return {
          groundedTitle,
          groundedContent: text
        };
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err || '');
      const isQuota = err?.status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
      console.warn(`[URL Grounding] Model ${model} with urlContext+googleSearch notice:`, errMsg);
      if (isQuota) {
        // Google Search grounding quota is exhausted for this key — skip remaining grounded tool retries
        break;
      }
      // Fallback: try with googleSearch only if urlContext was unsupported on a fallback model
      try {
        const searchOnlyRes = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        const text = (searchOnlyRes?.text || '').trim();
        if (text && text.length > 60) {
          let groundedTitle: string | undefined;
          const firstLineMatch = text.match(/^TITLE:\s*(.+)$/m);
          if (firstLineMatch && firstLineMatch[1]) {
            const candidate = firstLineMatch[1].replace(/^["']|["']$/g, '').trim();
            if (candidate.length > 3 && !isRawUrlOrPlaceholderName(candidate)) {
              groundedTitle = candidate;
            }
          }
          return {
            groundedTitle,
            groundedContent: text
          };
        }
      } catch (searchErr: any) {
        const searchMsg = String(searchErr?.message || searchErr || '');
        if (searchErr?.status === 429 || searchMsg.includes('429') || searchMsg.includes('RESOURCE_EXHAUSTED')) {
          break;
        }
      }
    }
  }

  return { groundedContent: '' };
}

/**
 * Normalizes YouTube & video URLs and fetches real spoken captions/transcripts, chapters,
 * description, and metadata via TranscriptProcessor.
 */
export async function extractYouTubeInfo(
  url: string,
  options?: { minWordCount?: number; preferredLang?: string }
): Promise<{
  videoId: string;
  normalizedUrl: string;
  title: string;
  author: string;
  description: string;
  chapters: string[];
  hasCaptions: boolean;
  hasRealCaptions: boolean;
  wordCount: number;
  isValidWordCount: boolean;
  validationStatus: TranscriptValidationStatus;
  validationMessage: string;
  timestampedText: string;
  plainText: string;
  richContext: string;
  transcriptResult: TranscriptResult;
}> {
  const transcriptResult = await TranscriptProcessor.fetchTranscript(url, options);

  return {
    videoId: transcriptResult.videoId,
    normalizedUrl: transcriptResult.normalizedUrl,
    title: transcriptResult.title,
    author: transcriptResult.author,
    description: transcriptResult.description,
    chapters: transcriptResult.chapters.map(ch => `[${ch.timestamp}] ${ch.title}`),
    hasCaptions: transcriptResult.hasCaptions,
    hasRealCaptions: Boolean(transcriptResult.hasRealCaptions),
    wordCount: transcriptResult.wordCount,
    isValidWordCount: transcriptResult.isValidWordCount,
    validationStatus: transcriptResult.validationStatus,
    validationMessage: transcriptResult.validationMessage,
    timestampedText: transcriptResult.timestampedText,
    plainText: transcriptResult.plainText,
    richContext: transcriptResult.richContext,
    transcriptResult
  };
}

export interface StructuredStudyAnalysis {
  title: string;
  summary: string;
  detailedNotes: string;
  tags: string[];
  mainTopics: { topic: string; subtopics: string[] }[];
  conceptsAndDefinitions: { concept: string; definition: string }[];
  keyTakeaways: string[];
  practiceQuestions: { question: string; answer: string; explanation: string }[];
  flashcards: { front: string; back: string; topic: string }[];
  revisionOutline: string[];
  formulas?: string[];
  transcription?: string;
}

/**
 * Formats a complete, human-readable study document combining detailed notes, key takeaways, definitions, transcript, and practice Q&A
 */
export function buildComprehensiveStudyDocument(analysis: StructuredStudyAnalysis): string {
  const sections: string[] = [];

  if (analysis.summary) {
    sections.push(`## Executive Summary\n${analysis.summary}`);
  }

  if (analysis.detailedNotes && analysis.detailedNotes !== analysis.summary) {
    sections.push(`## Detailed Content & Lecture Breakdown\n${analysis.detailedNotes}`);
  }

  if (analysis.keyTakeaways && analysis.keyTakeaways.length > 0) {
    sections.push(`## Key Takeaways & Highlights\n${analysis.keyTakeaways.map((k, i) => `${i + 1}. ${k}`).join('\n')}`);
  }

  if (analysis.conceptsAndDefinitions && analysis.conceptsAndDefinitions.length > 0) {
    sections.push(
      `## Core Concepts & Definitions\n${analysis.conceptsAndDefinitions
        .map(c => `- **${c.concept}:** ${c.definition}`)
        .join('\n')}`
    );
  }

  if (analysis.formulas && analysis.formulas.length > 0) {
    sections.push(`## Key Formulas & Equations\n${analysis.formulas.map(f => `- ${f}`).join('\n')}`);
  }

  if (analysis.practiceQuestions && analysis.practiceQuestions.length > 0) {
    sections.push(
      `## Practice Questions & Answers\n${analysis.practiceQuestions
        .map((q, i) => `**Q${i + 1}: ${q.question}**\n- **Answer:** ${q.answer}\n- **Explanation:** ${q.explanation}`)
        .join('\n\n')}`
    );
  }

  if (analysis.transcription && !sections.join('\n').includes(analysis.transcription.slice(0, 120))) {
    sections.push(`## Extracted Transcript / Source Passage\n${analysis.transcription}`);
  }

  return sections.join('\n\n');
}

/**
 * Executes structured academic analysis using the Gemini API
 */
export async function runGeminiStructuredAnalysis(
  ai: GoogleGenAI,
  options: {
    name: string;
    type: string;
    sourceText?: string;
    sourceUrl?: string;
    fileBase64?: string;
    fileMimeType?: string;
    youtubeAuthor?: string;
  }
): Promise<StructuredStudyAnalysis> {
  const { name, type, sourceText, sourceUrl, fileBase64, fileMimeType, youtubeAuthor } = options;

  const isYouTube = Boolean(sourceUrl && (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be')));
  const isVideoFile = type === 'video' || Boolean(fileMimeType && fileMimeType.startsWith('video/'));
  const isImageFile = type === 'image' || Boolean(fileMimeType && fileMimeType.startsWith('image/'));

  const systemInstruction = `You are an elite academic AI tutor and multimodal study material analyst for StudyWeb.
Your goal is to thoroughly analyze the provided study material (whether it is an uploaded image/screenshot/infographic, a YouTube video, an uploaded video file, a web article/URL, or a document) and produce a comprehensive, deeply informative, structured study resource.
CRITICAL RULES:
1. Analyze ONLY the actual visual/textual content present in the uploaded image, document, video, or link. NEVER guess or fabricate unrelated subjects (for example, NEVER output cell biology if the image is about an AI tool, software, technology, or another topic).
2. If the input is an image (screenshot, infographic, slide, diagram, AI tool overview, chart, or photo of notes), perform 100% faithful visual inspection and complete OCR of every word, label, UI section, feature, diagram, and concept shown in the image.
3. NEVER output useless metadata (such as channel links, video duration, or generic boilerplate) as the summary, highlights, or transcription.
4. Explain clearly WHAT is in the image/video/link/document, WHAT it is about, break down all major concepts in detail, and generate high-yield practice questions and answers directly from the content.

You must return a valid JSON object strictly matching this schema:
{
  "title": "Clean, concise, human-readable NotebookLM-style title reflecting the exact topic of the material (e.g., if the image shows an AI tool, name that AI tool or topic). NEVER output a raw URL (https://...), domain name, generic filename like IMG_1234, or file extension.",
  "summary": "A comprehensive 4-6 sentence summary explaining clearly what this image/video/link/resource is about, what is shown in it, and the main concepts or information presented",
  "detailedNotes": "In-depth, structured study notes formatted with Markdown headings and bullet points covering every section, visual element, text block, feature, concept, example, and explanation in the material",
  "tags": ["3 to 5 specific tags accurately describing the exact subject and topic of the material"],
  "mainTopics": [
    { "topic": "Topic Name", "subtopics": ["Subtopic A", "Subtopic B"] }
  ],
  "conceptsAndDefinitions": [
    { "concept": "Key Concept or Term from the Material", "definition": "Clear, detailed explanation or definition directly from the material" }
  ],
  "keyTakeaways": ["5 to 6 specific, factual key takeaways explaining the core facts, features, and insights from the material"],
  "practiceQuestions": [
    { "question": "Content-specific question testing understanding of this material?", "answer": "Direct, accurate answer", "explanation": "Step-by-step explanation referencing the exact content in the material" }
  ],
  "flashcards": [
    { "front": "Flashcard question or term", "back": "Clear answer or definition", "topic": "Topic" }
  ],
  "revisionOutline": ["Step 1", "Step 2", "Step 3", "Step 4"],
  "formulas": ["Key equations, syntax, or formulas if applicable, or empty array"],
  "transcription": "Complete verbatim OCR text and detailed visual walkthrough of everything visible or spoken in the resource from start to finish"
}`;

  let contents: any;
  const baseConfig: any = {
    systemInstruction,
    responseMimeType: 'application/json'
  };

  // If this is a URL resource (YouTube without full captions, X/Twitter, Facebook, or any website),
  // enrich with live Gemini urlContext + googleSearch grounding so we have deep internet-wide context
  let enrichedSourceText = sourceText || '';
  let enrichedName = name;
  if (sourceUrl && sourceUrl.startsWith('http') && !fileBase64) {
    const hasLongYoutubeTranscript = Boolean(
      isYouTube && enrichedSourceText.includes('Full Timestamped Video Transcript') && enrichedSourceText.length > 2500
    );
    if (!hasLongYoutubeTranscript) {
      try {
        const grounded = await enrichUrlWithGeminiWebGrounding(ai, sourceUrl, enrichedName, enrichedSourceText);
        if (grounded.groundedTitle && isRawUrlOrPlaceholderName(enrichedName)) {
          enrichedName = grounded.groundedTitle;
        }
        if (grounded.groundedContent) {
          enrichedSourceText = [
            enrichedSourceText,
            `\n=== LIVE WEB & URL CONTEXT GROUNDING (${sourceUrl}) ===\n${grounded.groundedContent}`
          ].filter(Boolean).join('\n\n');
        }
      } catch (gErr: any) {
        console.warn('[Pipeline] Web grounding enrichment warning:', gErr?.message || gErr);
      }
    }
  }

  if (fileBase64) {
    let cleanBase64 = String(fileBase64);
    if (cleanBase64.includes(';base64,')) {
      cleanBase64 = cleanBase64.split(';base64,')[1];
    }
    cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

    let normalizedMime = (fileMimeType || (isImageFile ? 'image/jpeg' : 'application/pdf')).toLowerCase().trim();
    if (normalizedMime === 'image/jpg' || normalizedMime === 'image/pjpeg' || normalizedMime === 'image/jfif') {
      normalizedMime = 'image/jpeg';
    } else if (isImageFile && !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(normalizedMime)) {
      normalizedMime = 'image/jpeg';
    }

    const mediaPrompt = isVideoFile
      ? `Watch and analyze this uploaded video file "${enrichedName}" (MIME: ${normalizedMime}).
Carefully inspect both the visual frames/slides/demonstrations and the audio/spoken explanations.
Tell the student exactly what is in this video, what it is about, summarize its full content, extract all key concepts and takeaways, transcribe the spoken lecture/explanations, and create 5 practice questions with answers based on the video.`
      : isImageFile
      ? `Carefully inspect and analyze this uploaded image "${enrichedName}" (MIME: ${normalizedMime}).
1. Perform complete, word-for-word OCR of all visible text, headings, labels, bullet points, UI elements, logos, captions, and numbers in the image.
2. Describe the exact subject matter shown in the image (for example, if it shows an AI tool, software interface, infographic, architecture diagram, chart, or handwritten notes, explain its exact name, purpose, features, and workflow).
3. Base the "title", "summary", "detailedNotes", "keyTakeaways", "conceptsAndDefinitions", "practiceQuestions", and "transcription" 100% on what is actually visible inside this image. Do NOT invent unrelated subjects.`
      : `Analyze this uploaded document/file "${enrichedName}" (${type}, MIME: ${normalizedMime}). 
Perform complete verbatim OCR and deep conceptual extraction on ALL visible text, questions, problems, headings, sections, diagrams, formulas, tables, and choices inside this file.${enrichedSourceText ? `\n\nExtracted Document Text:\n${enrichedSourceText.slice(0, 28000)}` : ''}
Extract complete study notes, verbatim questions/text in "transcription", flashcards, practice questions, and definitions as specified in the schema. Base your entire analysis 100% on the actual content of this uploaded file—never invent or substitute unrelated subjects.`;

    contents = [
      { text: mediaPrompt },
      {
        inlineData: {
          data: cleanBase64,
          mimeType: normalizedMime
        }
      }
    ];
  } else if (isYouTube || isVideoFile || TranscriptProcessor.isVideoUrl(sourceUrl)) {
    const ytId = sourceUrl ? TranscriptProcessor.extractYouTubeId(sourceUrl) : null;
    const videoPromptText = `Deeply analyze this educational video using its video stream, extracted spoken transcript, captions, chapters, and web context. Extract its complete academic content, summary, detailed lecture breakdown, key takeaways, and practice questions:
Video Title: "${enrichedName}"
Creator / Channel: "${youtubeAuthor || 'Educational Creator'}"
Video URL: ${sourceUrl || 'N/A'}
${enrichedSourceText ? `\nEXTRACTED VIDEO TRANSCRIPT, CAPTIONS, CHAPTERS & WEB GROUNDING:\n${enrichedSourceText.slice(0, 28000)}\n` : ''}

Instructions:
1. Base your analysis directly on the actual spoken content and visual demonstrations in this video. Explain clearly what is in this video and what it is about in the "summary" and "detailedNotes".
2. Do NOT just list channel name, link, or duration—explain the actual subject matter, concepts, step-by-step mechanisms, examples, and lessons taught in "${enrichedName}" (including timestamp references where helpful).
3. Provide 5-6 specific factual "keyTakeaways" and 4-5 content-based "practiceQuestions" (with answers and explanations) so a student can be quizzed on this video.
4. In "transcription", preserve a comprehensive, timestamped section-by-section lecture walkthrough and spoken transcript covering the concepts taught in the video.`;

    if (ytId) {
      contents = [
        {
          fileData: {
            fileUri: `https://www.youtube.com/watch?v=${ytId}`,
            mimeType: 'video/mp4'
          }
        },
        { text: videoPromptText }
      ];
    } else {
      contents = videoPromptText;
    }
  } else {
    const textSnippet = enrichedSourceText ? enrichedSourceText.substring(0, 32000) : '';
    contents = `Deeply analyze this study resource / web URL (from YouTube, X/Twitter, Facebook, or any website across the internet) and extract its complete academic/informational content, summary, detailed notes, key takeaways, and practice questions:
Title / Name: "${enrichedName}"
Resource Type: ${type}
Source URL: ${sourceUrl || 'Uploaded Document'}
Full Extracted & Web-Grounded Content:
${textSnippet || `Resource located at ${sourceUrl || enrichedName}`}

Instructions:
1. Provide a clean, human-readable NotebookLM-style "title" representing the actual subject/topic of the material (never a raw URL or domain).
2. Base your "summary", "detailedNotes", "conceptsAndDefinitions", "keyTakeaways", and "practiceQuestions" 100% on the exact facts, sections, posts, and content in the provided text above. Do NOT invent unrelated topics.
3. In "transcription", preserve the complete verbatim text, posts, passages, and detailed facts from the resource.`;
  }

  // Active verified Gemini models (fastest & most reliable first)
  const modelCandidates = [
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-4-hydrogen'
  ];

  let lastModelError: any = null;

  for (const model of modelCandidates) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const effectiveContents =
          attempt === 2 && Array.isArray(contents) && contents[0]?.fileData && contents[1]?.text
            ? contents[1].text
            : contents;

        const supportsMinimalThinking = model === 'gemini-3.1-flash-lite' || model === 'gemini-3-flash-preview';
        const supportsLowThinking = model === 'gemini-4-hydrogen';

        const response = await ai.models.generateContent({
          model,
          contents: effectiveContents,
          config: {
            ...baseConfig,
            ...(supportsMinimalThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
            ...(supportsLowThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
          }
        });

        if (response && response.text) {
          let text = response.text.trim();
          if (text.startsWith('```')) {
            text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
          }
          const parsed = JSON.parse(text) as StructuredStudyAnalysis;
          if (parsed && parsed.summary) {
            const isGenericFileName = /^(img|image|screenshot|photo|pic|scan|untitled|document|file)[-_ ]?\d*/i.test(String(enrichedName || '').trim());
            const candidateTitle = (!isRawUrlOrPlaceholderName(parsed.title) && parsed.title.trim().length > 2)
              ? parsed.title
              : (!isRawUrlOrPlaceholderName(enrichedName) && !isGenericFileName ? enrichedName : (parsed.title || enrichedName || 'Analyzed Study Resource'));
            const resolvedTitle = cleanNotebookLMTitle(candidateTitle, sourceUrl, type);

            const structuredResult: StructuredStudyAnalysis = {
              title: resolvedTitle,
              summary: parsed.summary,
              detailedNotes: parsed.detailedNotes || parsed.summary,
              tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : [isImageFile ? 'Visual Analysis' : 'Study Material'],
              mainTopics: Array.isArray(parsed.mainTopics) ? parsed.mainTopics : [],
              conceptsAndDefinitions: Array.isArray(parsed.conceptsAndDefinitions) ? parsed.conceptsAndDefinitions : [],
              keyTakeaways: Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0 ? parsed.keyTakeaways : [parsed.summary],
              practiceQuestions: Array.isArray(parsed.practiceQuestions) ? parsed.practiceQuestions : [],
              flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
              revisionOutline: Array.isArray(parsed.revisionOutline) ? parsed.revisionOutline : [],
              formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
              transcription: parsed.transcription || parsed.detailedNotes || (enrichedSourceText ? enrichedSourceText.substring(0, 16000) : parsed.summary)
            };

            const baseStudyDoc = buildComprehensiveStudyDocument(structuredResult);
            if (enrichedSourceText && enrichedSourceText.includes('Full Timestamped Video Transcript') && !baseStudyDoc.includes('Full Timestamped Video Transcript')) {
              structuredResult.transcription = `${baseStudyDoc}\n\n## Verbatim Timestamped Video Captions\n${enrichedSourceText.slice(0, 24000)}`;
            } else if (enrichedSourceText && enrichedSourceText.trim().length > 80) {
              structuredResult.transcription = `${baseStudyDoc}\n\n## Verbatim Extracted Document Text\n${enrichedSourceText.slice(0, 24000)}`;
            } else {
              structuredResult.transcription = baseStudyDoc;
            }
            return structuredResult;
          }
        }
      } catch (err: any) {
        lastModelError = err;
        const status = err?.status || err?.statusCode || err?.error?.code || 'AI_MODEL_ERR';
        const msg = String(err?.message || '');
        console.warn(`[Study Material Pipeline] Model ${model} (attempt ${attempt}) fallback notice [${status}]:`, msg.slice(0, 180));
        const isAuthErr =
          status === 401 ||
          status === 403 ||
          msg.includes('401') ||
          msg.includes('403') ||
          msg.includes('API key not valid') ||
          msg.includes('UNAUTHENTICATED') ||
          msg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
          msg.includes('API_KEY_INVALID');
        if (isAuthErr) {
          // Do not retry other models when the key/token itself is rejected
          break;
        }
        const isQuota = status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
        if (!isQuota && attempt === 1 && Array.isArray(contents) && contents[0]?.fileData) {
          continue;
        }
        if (!isQuota && attempt === 1 && status === 503) {
          await new Promise(r => setTimeout(r, 250));
          continue;
        }
        break;
      }
    }
    const lastMsg = String(lastModelError?.message || '');
    const lastStatus = lastModelError?.status || lastModelError?.statusCode || lastModelError?.error?.code;
    if (
      lastStatus === 401 ||
      lastStatus === 403 ||
      lastMsg.includes('API key not valid') ||
      lastMsg.includes('UNAUTHENTICATED') ||
      lastMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
      lastMsg.includes('API_KEY_INVALID')
    ) {
      break;
    }
  }

  const finalErrMsg = lastModelError?.message || 'Gemini models unavailable; using local OCR and structured fallback analysis.';
  console.warn('[Study Material Pipeline] Switching to local structured analysis fallback:', String(finalErrMsg).slice(0, 180));

  let fallbackText = enrichedSourceText;
  if (!fallbackText && fileBase64 && isImageFile) {
    fallbackText = await extractImageTextWithLocalOcr(fileBase64, fileMimeType, enrichedName);
  }
  return generateReliableStudyFallback(enrichedName, type, fallbackText, sourceUrl);
}

/**
 * Performs server-side local OCR on an uploaded image (PNG, JPEG, WebP, or SVG) using tesseract.js
 * when Gemini multimodal analysis is unavailable or encounters an API key error.
 */
export async function extractImageTextWithLocalOcr(
  fileBase64?: string,
  fileMimeType?: string,
  fallbackName?: string
): Promise<string> {
  if (!fileBase64 || typeof fileBase64 !== 'string') return '';
  try {
    let cleanB64 = fileBase64.trim();
    if (cleanB64.includes(';base64,')) {
      cleanB64 = cleanB64.split(';base64,')[1] || '';
    }
    cleanB64 = cleanB64.replace(/[\r\n\s]/g, '');
    if (!cleanB64) return '';

    const imgBuf = Buffer.from(cleanB64, 'base64');
    if (imgBuf.length < 32) return '';

    const mime = String(fileMimeType || 'image/png').toLowerCase();
    if (mime.includes('svg')) {
      const svgStr = imgBuf.toString('utf8');
      const matches = Array.from(svgStr.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi))
        .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (matches.length > 0) {
        return matches.join('\n');
      }
    }

    const TesseractModule: any = await import('tesseract.js');
    const recognizeFn = TesseractModule?.recognize || TesseractModule?.default?.recognize;
    if (typeof recognizeFn === 'function') {
      const ocrResult: any = await Promise.race([
        recognizeFn(imgBuf, 'eng'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('LOCAL_OCR_TIMEOUT')), 8500))
      ]);
      const rawOcr = String(ocrResult?.data?.text || '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 1)
        .join('\n')
        .trim();
      if (rawOcr.length >= 6) {
        return rawOcr;
      }
    }
  } catch (ocrErr: any) {
    console.warn('[Study Material Pipeline] Local OCR notice:', ocrErr?.message || ocrErr);
  }
  return fallbackName ? `Visual study material from "${fallbackName}".` : '';
}

export function generateReliableStudyFallback(
  name: string,
  type: string,
  sourceText?: string,
  sourceUrl?: string
): StructuredStudyAnalysis {
  const snippet = sourceText ? sourceText.slice(0, 14000).trim() : '';
  const isGenericFileName = /^(img|image|screenshot|photo|pic|scan|untitled|document|file)[-_ ]?\d*/i.test(String(name || '').trim());

  let derivedTitle = cleanNotebookLMTitle(name, sourceUrl, type);
  if ((isGenericFileName || isRawUrlOrPlaceholderName(name)) && snippet.length > 10) {
    const firstValidLine = snippet
      .split('\n')
      .map(l => l.replace(/^[#*>-]+\s*/, '').trim())
      .find(l => l.length >= 6 && l.length <= 72 && /[a-zA-Z]{3,}/.test(l) && !l.startsWith('Visual study material'));
    if (firstValidLine) {
      derivedTitle = cleanNotebookLMTitle(firstValidLine, sourceUrl, type);
    }
  }

  const pedagogicalTag = type === 'video' ? 'Lecture' : type === 'image' ? 'Visual Analysis' : 'Reading';
  const tags = [pedagogicalTag, 'Study Material', 'Indexed'];

  const lines = snippet
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 3);

  const sentences = snippet
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 18);

  const keyTakeaways =
    sentences.length > 0
      ? sentences.slice(0, 6)
      : lines.length > 0
      ? lines.slice(0, 6)
      : [`Uploaded ${type} resource "${derivedTitle}" is indexed and ready for study in your workspace.`];

  const conceptsAndDefinitions = keyTakeaways.slice(0, 4).map((item, idx) => {
    const colonParts = item.split(/:\s+/);
    if (colonParts.length >= 2 && colonParts[0].length <= 45) {
      return {
        concept: colonParts[0].replace(/^[-*•\d.)\s]+/, '').trim(),
        definition: colonParts.slice(1).join(': ').trim()
      };
    }
    return {
      concept: `${derivedTitle} — Key Point ${idx + 1}`,
      definition: item
    };
  });

  const practiceQuestions = [
    {
      question: `What are the primary concepts and key details covered in "${derivedTitle}"?`,
      answer: keyTakeaways.slice(0, 2).join(' '),
      explanation: `These core takeaways summarize the primary information extracted from "${derivedTitle}".`
    },
    {
      question: `How can you apply or review the information presented in "${derivedTitle}"?`,
      answer: keyTakeaways[1] || keyTakeaways[0],
      explanation: `Reviewing the extracted notes and asking targeted questions in the AI Tutor reinforces mastery of "${derivedTitle}".`
    }
  ];

  const flashcards = conceptsAndDefinitions.slice(0, 4).map(c => ({
    front: `Explain: ${c.concept}`,
    back: c.definition,
    topic: derivedTitle
  }));

  const fallbackObj: StructuredStudyAnalysis = {
    title: derivedTitle,
    summary: snippet
      ? `Comprehensive study analysis of "${derivedTitle}": ${snippet.replace(/\s+/g, ' ').slice(0, 520)}`
      : `Uploaded ${type} resource "${derivedTitle}" indexed in your study workspace.`,
    detailedNotes: snippet
      ? `### Study Notes & Extracted Content: ${derivedTitle}\n\n${snippet}\n\n### Key Takeaways\n${keyTakeaways.map(k => `- ${k}`).join('\n')}`
      : `### Uploaded Resource: ${derivedTitle}\n\nThis ${type} resource has been indexed in your workspace. Open it with the AI Tutor to explore or ask questions about "${derivedTitle}".`,
    tags,
    mainTopics: [
      { topic: derivedTitle, subtopics: ['Core Content', 'Key Takeaways', 'Review Questions'] }
    ],
    conceptsAndDefinitions,
    keyTakeaways,
    practiceQuestions,
    flashcards,
    revisionOutline: [
      `1. Review the extracted notes and summary for "${derivedTitle}"`,
      `2. Study the key takeaways and flashcard definitions`,
      `3. Test your understanding with the practice questions or ask the AI Tutor`
    ],
    formulas: [],
    transcription: snippet || `Uploaded ${type} study material: ${derivedTitle}`
  };

  const baseDoc = buildComprehensiveStudyDocument(fallbackObj);
  fallbackObj.transcription = snippet ? `${baseDoc}\n\n## Verbatim Extracted Content\n${snippet}` : baseDoc;
  return fallbackObj;
}

/**
 * Endpoint: POST /api/study-materials/process
 * Complete end-to-end processing and Supabase persistence
 */
studyMaterialRouter.post('/process', async (req: Request, res: Response) => {
  const body = req.body || {};
  const rawWorkspaceId = body.workspaceId;
  const clientUserId = body.userId;
  const clientMaterialId = body.materialId || body.fileId;
  const clientName = body.name || body.fileName;
  const type = String(body.type || body.fileType || 'doc').toLowerCase();
  const size = body.size || body.fileSize || '1 KB';
  const clientUrl = body.url || body.fileUrl;
  const pastedText = body.content || body.rawText || body.contentText || body.transcription;
  const storagePath = body.storagePath;
  const fileBase64 = body.fileBase64;
  const fileMimeType = body.fileMimeType;
  const supabaseToken = body.supabaseToken;

  const rawToken = typeof supabaseToken === 'string' && supabaseToken.trim()
    ? supabaseToken.trim().replace(/^Bearer\s+/i, '')
    : (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '').trim() : '');
  const authHeader = rawToken ? `Bearer ${rawToken}` : undefined;

  const workspaceId = rawWorkspaceId || 'general-study';
  const normWsId = toValidUuid(workspaceId);
  const materialId = clientMaterialId && isValidUuid(clientMaterialId) ? clientMaterialId : generateUuid();

  // Step 0: Enforce SSRF defense immediately if a URL is supplied
  let sourceUrl = clientUrl ? String(clientUrl).trim() : '';
  if (sourceUrl && !sourceUrl.startsWith('data:')) {
    const ssrfCheck = validateSafeUrl(sourceUrl);
    if (!ssrfCheck.valid) {
      res.status(400).json({
        error: ssrfCheck.error || 'Access to local or private network destinations is prohibited.',
        errorCode: 'SSRF_BLOCKED'
      });
      return;
    }
  }

  const supabase = getSupabaseServer(authHeader);

  // Authenticate user via Supabase token when present
  let authenticatedUserId: string | null = null;
  if (rawToken) {
    if (supabase && rawToken.length < 4000) {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(rawToken);
        if (!authErr && user?.id) {
          authenticatedUserId = user.id;
        }
      } catch {
        // Fallback to JWT sub extraction
      }
    }
    if (!authenticatedUserId) {
      authenticatedUserId = extractJwtUserId(rawToken);
    }
  }
  if (!authenticatedUserId && clientUserId && isValidUuid(String(clientUserId))) {
    authenticatedUserId = String(clientUserId);
  }

  // Only assign authenticated Supabase user ID to prevent FK constraint failures on auth.users
  const finalUserId = authenticatedUserId || null;

  // Check workspace ownership if authenticated
  if (supabase && authenticatedUserId) {
    try {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id, user_id')
        .eq('id', normWsId)
        .maybeSingle();

      if (ws && ws.user_id && ws.user_id !== authenticatedUserId) {
        res.status(403).json({ error: 'Forbidden: You do not have permission to modify this workspace.' });
        return;
      }
    } catch (wsErr: any) {
      console.warn('[Pipeline] Workspace check notice:', wsErr?.message);
    }
  }

  // Step 1: Extract and normalize content
  let materialName = clientName?.trim() || '';
  let sourceText = pastedText ? String(pastedText).trim() : '';
  let youtubeAuthor = '';

  const isVideoResourceUrl = Boolean(
    sourceUrl && (
      TranscriptProcessor.isVideoUrl(sourceUrl) ||
      sourceUrl.includes('youtube.com') ||
      sourceUrl.includes('youtu.be') ||
      sourceUrl.includes('youtube-nocookie.com')
    )
  );

  try {
    if (isVideoResourceUrl) {
      const yt = await extractYouTubeInfo(sourceUrl);
      sourceUrl = yt.normalizedUrl;
      youtubeAuthor = yt.author;
      if (isRawUrlOrPlaceholderName(materialName)) {
        materialName = yt.title;
      }

      if (yt.isValidWordCount) {
        console.log(`[Pipeline] Video transcript validated: ${yt.wordCount} words (status: ${yt.validationStatus}) for "${yt.title}"`);
        if (!sourceText) {
          sourceText = yt.richContext;
        } else {
          sourceText = `${sourceText}\n\n${yt.richContext}`;
        }
      } else {
        console.warn(`[Pipeline] Video transcript rejected prior to AI summary (${yt.validationStatus}): ${yt.validationMessage}. Word count: ${yt.wordCount}. Supplying verified metadata without placeholder captions.`);
        const cleanMetadataContext = [
          `Video Title: ${yt.title}`,
          `Educator / Creator: ${yt.author}`,
          `Video URL: ${yt.normalizedUrl}`,
          yt.description ? `Video Description:\n${yt.description.slice(0, 3500)}` : '',
          yt.chapters.length > 0 ? `Video Chapters & Timeline:\n${yt.chapters.join('\n')}` : ''
        ].filter(Boolean).join('\n\n');

        if (!sourceText) {
          sourceText = cleanMetadataContext;
        } else {
          sourceText = `${sourceText}\n\n${cleanMetadataContext}`;
        }
      }
    } else if (sourceUrl && sourceUrl.startsWith('http')) {
      const scraped = await scrapeWebPage(sourceUrl);
      if (isRawUrlOrPlaceholderName(materialName) && scraped.title) {
        materialName = scraped.title;
      }
      if (!sourceText) {
        sourceText = [
          scraped.title ? `Title: ${scraped.title}` : '',
          scraped.description ? `Overview: ${scraped.description}` : '',
          scraped.text ? `Content:\n${scraped.text}` : ''
        ].filter(Boolean).join('\n\n');
      }
    } else if (sourceText && isRawUrlOrPlaceholderName(materialName)) {
      const firstLine = sourceText.split('\n')[0].replace(/^[#*-]\s*/, '').trim();
      materialName = firstLine.length > 3 ? firstLine.slice(0, 60) : `Study Notes (${new Date().toLocaleDateString()})`;
    }
  } catch (extractErr: any) {
    console.warn('[Pipeline] Content extraction warning:', extractErr.message);
  }

  materialName = cleanNotebookLMTitle(materialName, sourceUrl, type);

  let persistedUrl: string | null = sourceUrl || null;
  const isImageUpload = Boolean(fileBase64 && (type === 'image' || (fileMimeType && fileMimeType.startsWith('image/'))));
  if (!persistedUrl && fileBase64 && fileMimeType && isImageUpload) {
    const cleanB64 = String(fileBase64).includes(';base64,')
      ? String(fileBase64).split(';base64,')[1]
      : String(fileBase64);
    if (cleanB64.length > 0 && cleanB64.length < 450_000) {
      persistedUrl = `data:${fileMimeType};base64,${cleanB64}`;
    }
  } else if (persistedUrl && persistedUrl.startsWith('data:') && persistedUrl.length > 450_000) {
    persistedUrl = null;
  }

  // Step 2: Save initial record to Supabase with status 'processing' BEFORE calling AI (RULE 5)
  const initialRow = {
    id: materialId,
    workspace_id: normWsId,
    user_id: finalUserId,
    name: materialName,
    type,
    size: size || (sourceText ? `${Math.ceil(sourceText.length / 1024)} KB` : '1 KB'),
    url: persistedUrl,
    storage_path: storagePath || null,
    status: 'processing',
    content_text: sourceText || null,
    summary: 'Analyzing study material...',
    tags: ['Processing'],
    highlights: [],
    formulas: [],
    extracted_diagrams: null,
    upload_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data: wsRow } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', normWsId)
        .maybeSingle();

      if (!wsRow) {
        await supabase
          .from('workspaces')
          .upsert({
            id: normWsId,
            user_id: finalUserId,
            name: materialName ? `Workspace: ${materialName}` : 'Study Workspace',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id', ignoreDuplicates: true });
      }
    } catch {
      // ignore non-fatal workspace ensure error
    }

    try {
      await supabase
        .from('workspace_files')
        .upsert(initialRow, { onConflict: 'id' });
    } catch {
      // ignore non-fatal pre-save error
    }
  }

  // Step 3: Run Gemini Structured Analysis (with automatic local OCR + structured fallback if key is absent or rejected)
  const ai = getGeminiClient();
  let analysis: StructuredStudyAnalysis;

  if (ai) {
    try {
      analysis = await runGeminiStructuredAnalysis(ai, {
        name: materialName,
        type,
        sourceText,
        sourceUrl,
        fileBase64,
        fileMimeType,
        youtubeAuthor
      });
    } catch (aiErr: any) {
      console.warn('[Study Material Pipeline] Falling back to local OCR & structured analysis:', aiErr?.message || aiErr);
      if (!sourceText && isImageUpload) {
        sourceText = await extractImageTextWithLocalOcr(fileBase64, fileMimeType, materialName);
      }
      analysis = generateReliableStudyFallback(materialName, type, sourceText, sourceUrl);
    }
  } else {
    if (!sourceText && isImageUpload) {
      sourceText = await extractImageTextWithLocalOcr(fileBase64, fileMimeType, materialName);
    }
    analysis = generateReliableStudyFallback(materialName, type, sourceText, sourceUrl);
  }

  const fullTranscription = analysis.transcription || sourceText || analysis.detailedNotes || analysis.summary;

  // Step 4: Update Supabase record with status 'completed'
  const finalNotebookTitle = cleanNotebookLMTitle(
    !isRawUrlOrPlaceholderName(analysis.title) ? analysis.title : materialName,
    sourceUrl,
    type
  );
  const completedRow = {
    ...initialRow,
    name: finalNotebookTitle,
    url: persistedUrl,
    status: 'completed',
    summary: analysis.summary,
    highlights: analysis.keyTakeaways || [],
    tags: analysis.tags || ['Study Material'],
    formulas: analysis.formulas || [],
    transcription: fullTranscription,
    content_text: fullTranscription,
    extracted_diagrams: {
      detailedNotes: analysis.detailedNotes,
      mainTopics: analysis.mainTopics,
      conceptsAndDefinitions: analysis.conceptsAndDefinitions,
      keyTakeaways: analysis.keyTakeaways,
      practiceQuestions: analysis.practiceQuestions,
      flashcards: analysis.flashcards,
      revisionOutline: analysis.revisionOutline
    },
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase
        .from('workspace_files')
        .update({
          name: completedRow.name,
          url: completedRow.url,
          status: 'completed',
          summary: completedRow.summary,
          highlights: completedRow.highlights,
          tags: completedRow.tags,
          formulas: completedRow.formulas,
          transcription: completedRow.transcription,
          content_text: completedRow.content_text,
          extracted_diagrams: Array.isArray(completedRow.extracted_diagrams)
            ? completedRow.extracted_diagrams
            : (completedRow.extracted_diagrams ? [JSON.stringify(completedRow.extracted_diagrams)] : []),
          updated_at: completedRow.updated_at
        })
        .eq('id', materialId);

      const { data: wsRow } = await supabase
        .from('workspaces')
        .select('files')
        .eq('id', normWsId)
        .maybeSingle();

      if (wsRow) {
        const currentFiles = Array.isArray(wsRow.files) ? wsRow.files : [];
        const filePayload = {
          id: materialId,
          name: completedRow.name,
          type,
          size: completedRow.size,
          uploadDate: completedRow.upload_date,
          status: 'completed',
          url: completedRow.url && completedRow.url.length < 180_000 ? completedRow.url : undefined,
          storagePath: completedRow.storage_path,
          summary: completedRow.summary,
          highlights: completedRow.highlights,
          tags: completedRow.tags,
          formulas: completedRow.formulas,
          transcription: completedRow.transcription,
          extractedDiagrams: completedRow.extracted_diagrams,
          contentText: completedRow.content_text
        };

        const nextFiles = [filePayload, ...currentFiles.filter((f: any) => f.id !== materialId)];
        await supabase
          .from('workspaces')
          .update({ files: nextFiles, updated_at: new Date().toISOString() })
          .eq('id', normWsId);
      }
    } catch {
      // non-fatal DB update warning
    }
  }

  const responseMaterial = {
    id: materialId,
    name: completedRow.name,
    type,
    size: completedRow.size,
    uploadDate: completedRow.upload_date,
    status: 'completed',
    url: completedRow.url,
    storagePath: completedRow.storage_path,
    summary: completedRow.summary,
    highlights: completedRow.highlights,
    tags: completedRow.tags,
    formulas: completedRow.formulas,
    transcription: completedRow.transcription,
    extractedDiagrams: completedRow.extracted_diagrams,
    contentText: completedRow.content_text
  };

  res.json({
    success: true,
    materialId,
    status: 'completed',
    material: responseMaterial,
    file: responseMaterial
  });
});

/**
 * Endpoint: POST /api/study-materials/retry
 * Reuses existing material ID and saved source content without creating duplicate rows (RULE 5)
 */
studyMaterialRouter.post('/retry', async (req: Request, res: Response) => {
  const { materialId, workspaceId: rawWorkspaceId, supabaseToken } = req.body || {};
  const rawToken = typeof supabaseToken === 'string' && supabaseToken.trim()
    ? supabaseToken.trim().replace(/^Bearer\s+/i, '')
    : (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '').trim() : '');
  const authHeader = rawToken ? `Bearer ${rawToken}` : undefined;
  const workspaceId = rawWorkspaceId || 'general-study';

  if (!materialId) {
    res.status(400).json({ error: 'materialId is required for retry.' });
    return;
  }

  const supabase = getSupabaseServer(authHeader);
  if (!supabase) {
    res.status(500).json({ error: 'Supabase client is not available.' });
    return;
  }

  const normDocId = toValidUuid(materialId);
  const normWsId = toValidUuid(workspaceId);

  // Retrieve existing record
  const { data: existingRow, error: fetchErr } = await supabase
    .from('workspace_files')
    .select('*')
    .eq('id', normDocId)
    .maybeSingle();

  if (fetchErr || !existingRow) {
    res.status(404).json({ error: `Material with ID ${materialId} not found in workspace.` });
    return;
  }

  // Update status to 'processing'
  await supabase
    .from('workspace_files')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', normDocId);

  const ai = getGeminiClient();
  let analysis: StructuredStudyAnalysis;
  if (ai) {
    try {
      analysis = await runGeminiStructuredAnalysis(ai, {
        name: existingRow.name,
        type: existingRow.type || 'doc',
        sourceText: existingRow.content_text || '',
        sourceUrl: existingRow.url || ''
      });
    } catch {
      analysis = generateReliableStudyFallback(
        existingRow.name,
        existingRow.type || 'doc',
        existingRow.content_text || '',
        existingRow.url || ''
      );
    }
  } else {
    analysis = generateReliableStudyFallback(
      existingRow.name,
      existingRow.type || 'doc',
      existingRow.content_text || '',
      existingRow.url || ''
    );
  }

  const updatedFields = {
    name: analysis.title || existingRow.name,
    status: 'completed',
    summary: analysis.summary,
    highlights: analysis.keyTakeaways || [],
    tags: analysis.tags || ['Study Material'],
    formulas: analysis.formulas || [],
    transcription: analysis.transcription || existingRow.transcription,
    extracted_diagrams: {
      detailedNotes: analysis.detailedNotes,
      mainTopics: analysis.mainTopics,
      conceptsAndDefinitions: analysis.conceptsAndDefinitions,
      keyTakeaways: analysis.keyTakeaways,
      practiceQuestions: analysis.practiceQuestions,
      flashcards: analysis.flashcards,
      revisionOutline: analysis.revisionOutline
    },
    updated_at: new Date().toISOString()
  };

  const dbFields = {
    ...updatedFields,
    extracted_diagrams: Array.isArray(updatedFields.extracted_diagrams)
      ? updatedFields.extracted_diagrams
      : (updatedFields.extracted_diagrams ? [JSON.stringify(updatedFields.extracted_diagrams)] : [])
  };

  await supabase
    .from('workspace_files')
    .update(dbFields)
    .eq('id', normDocId);

  // Refresh workspace.files JSONB
  try {
    const { data: wsRow } = await supabase
      .from('workspaces')
      .select('files')
      .eq('id', normWsId)
      .maybeSingle();

    if (wsRow && Array.isArray(wsRow.files)) {
      const nextFiles = wsRow.files.map((f: any) =>
        f.id === materialId
          ? {
              ...f,
              name: updatedFields.name,
              status: 'completed',
              summary: updatedFields.summary,
              highlights: updatedFields.highlights,
              tags: updatedFields.tags,
              formulas: updatedFields.formulas,
              transcription: updatedFields.transcription,
              extractedDiagrams: updatedFields.extracted_diagrams
            }
          : f
      );
      await supabase
        .from('workspaces')
        .update({ files: nextFiles, updated_at: new Date().toISOString() })
        .eq('id', normWsId);
    }
  } catch {
    // Non-fatal
  }

  res.json({
    success: true,
    materialId,
    status: 'completed',
    material: {
      id: materialId,
      ...updatedFields
    }
  });
});
