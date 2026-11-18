import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

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

function cleanTextForSpeech(rawText: string): string {
  let cleaned = rawText
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[Source:[^\]]+\]/gi, '')
    .replace(/\[\d+:\d+\]/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/(\w)\^2\b/g, '$1 squared')
    .replace(/(\w)\^3\b/g, '$1 cubed')
    .replace(/\s*×\s*/g, ' times ')
    .replace(/\s*÷\s*/g, ' divided by ')
    .replace(/(\d)\s*=\s*(\d|[A-Za-z])/g, '$1 equals $2')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (cleaned.length > 1800) {
    const truncated = cleaned.slice(0, 1800);
    const lastBreak = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('? '),
      truncated.lastIndexOf('! ')
    );
    cleaned = lastBreak > 900 ? truncated.slice(0, lastBreak + 1).trim() : truncated.trim();
  }

  return cleaned;
}

function buildHumanStyleInstruction(persona: string, language?: string): string {
  const langNote = language ? ` Speak fluently and naturally in ${language}.` : '';
  if (persona === 'exam_prep') {
    return (
      'Natural, real human study coach speaking one-on-one in person—clear conversational tone, organic breathing and natural pauses at punctuation, relaxed warmth, zero robotic or announcer cadence.' +
      langNote
    );
  }
  if (persona === 'scan_notes' || persona === 'explain') {
    return (
      'Warm, grounded, real human tutor sitting beside a student reading and explaining notes aloud—natural conversational rhythm, subtle human inflection and brief pauses at commas and periods, never monotonous or synthetic.' +
      langNote
    );
  }
  return (
    'Warm, natural, thoughtful human tutor talking face-to-face in relaxed conversation—authentic human cadence, gentle emphasis on key ideas, natural breathing pauses, completely unscripted and never robotic.' +
    langNote
  );
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
    const rawText = String(body?.text || '').trim();
    const persona = String(body?.persona || 'socratic').trim();
    const language = body?.language ? String(body.language).trim() : undefined;
    const requestedVoice = String(body?.voiceName || 'Charon').trim();

    if (!rawText) {
      return res.status(400).json({ error: 'Text is required for TTS synthesis.' });
    }

    const cleanText = cleanTextForSpeech(rawText);
    if (!cleanText) {
      return res.status(400).json({ error: 'Cleaned text is empty.' });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallbackToBrowser: true,
        message: 'Gemini API key not configured, fallback to client synthesis.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const validVoice = ['Kore', 'Puck', 'Fenrir', 'Charon', 'Zephyr'].includes(requestedVoice)
      ? requestedVoice
      : 'Charon';

    const styleInstruction = buildHumanStyleInstruction(persona, language);
    const ttsCandidates = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];

    for (const ttsModel of ttsCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: ttsModel,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style: styleInstruction
                  }
                }
              ]
            }
          ] as any,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: validVoice
                }
              }
            }
          }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return res.status(200).json({
            success: true,
            audioBase64: base64Audio,
            mimeType: 'audio/wav',
            voiceUsed: validVoice,
            modelUsed: ttsModel,
            cleanedText: cleanText
          });
        }
      } catch (err: any) {
        console.warn(`[Serverless TTS ${ttsModel}]:`, err?.message || err);
      }
    }

    return res.status(200).json({
      success: false,
      fallbackToBrowser: true,
      message: 'No audio data returned from Gemini TTS.'
    });
  } catch (err: any) {
    console.warn('[Serverless TTS Error]:', err?.message || err);
    return res.status(200).json({
      success: false,
      fallbackToBrowser: true,
      message: 'TTS synthesis switched to browser speech.'
    });
  }
}
