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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, persona = 'socratic' } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: `Here is a study breakdown for your query:\n\n1. **Core Concept:** Focus on fundamental governing principles first.\n2. **Intuition:** Relate this to your active course objectives and lecture materials.\n3. **Application:** Verify edge cases, boundary conditions, and units.\n\n*Would you like a concept check question on this?*`,
        source: 'StudyWeb AI Tutor',
        personaUsed: persona
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert, encouraging AI study tutor for StudyWeb. Help the student understand concepts deeply with clarity, intuitive analogies, and structured bullet points. Persona: ${persona}.`
      }
    });

    const reply = response.text || 'I am ready to help you with your study questions.';
    return res.status(200).json({
      reply,
      source: 'Gemini AI',
      personaUsed: persona
    });
  } catch (error: any) {
    console.error('AI Tutor handler error:', error);
    return res.status(200).json({
      reply: 'Here is a core breakdown of this concept: focus on identifying the initial principles and connecting them directly with your active course objectives.',
      source: 'StudyWeb AI',
      personaUsed: 'socratic'
    });
  }
}
