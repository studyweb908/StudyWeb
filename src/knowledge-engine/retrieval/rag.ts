import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../utils/embeddings.js';

function getSupabaseClient(authHeader?: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured.');
  }
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl, supabaseKey, options);
}

function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") return null;
  return key.trim();
}

export async function retrieveKnowledge(workspaceId: string, userId: string, query: string, topK: number = 8, ai: any = null, filesFallback: any[] = [], notesFallback: any[] = [], authHeader?: string): Promise<string> {
  let queryEmbedding: number[] | null = null;
  const apiKey = getGeminiApiKey();
  if (ai && query.trim() && apiKey) {
    queryEmbedding = await generateEmbedding(query, apiKey);
  }

  let knowledgeContext = "=== STUDYWEB ADVANCED RAG KNOWLEDGE GRAPH RETRIEVAL ===\n";
  knowledgeContext += "The following structured knowledge chunks were extracted from the user's workspace documents and notes. Use ONLY this information to generate your response. If the answer is not contained here, state that it's not covered by the workspace knowledge.\n\n";

  try {
    const supabase = getSupabaseClient(authHeader);
    
    if (queryEmbedding) {
      const vectorStr = '[' + queryEmbedding.join(',') + ']';
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: vectorStr,
        match_count: topK,
        p_workspace_id: workspaceId || '',
        p_user_id: userId || 'local-user'
      });
      
      if (!error && data && data.length > 0) {
        data.forEach((chunk: any, index: number) => {
           knowledgeContext += `[KNOWLEDGE NODE ${index + 1} | Confidence: ${((chunk.similarity || 0) * 100).toFixed(1)}%]\n${chunk.text}\n\n`;
        });
        return knowledgeContext;
      }
    } else {
      // Fallback query if no embeddings
      const { data, error } = await supabase
        .from('document_chunks')
        .select('id, text, topic, source_type')
        .eq('workspace_id', workspaceId || '')
        .eq('user_id', userId || 'local-user')
        .limit(topK);
        
      if (!error && data && data.length > 0) {
        const scored = (data || []).map((row: any) => {
          const setA = new Set(query.toLowerCase().split(' '));
          const setB = new Set((row.text as string || "").toLowerCase().split(' '));
          const intersection = new Set([...setA].filter(x => setB.has(x)));
          const score = intersection.size / (setA.size + setB.size - intersection.size);
          return { ...row, score };
        });
        scored.sort((a, b) => b.score - a.score);
        scored.forEach((chunk: any, index: number) => {
           knowledgeContext += `[KNOWLEDGE NODE ${index + 1} | Confidence: ${(chunk.score * 100).toFixed(1)}%]\n${chunk.text}\n\n`;
        });
        return knowledgeContext;
      }
    }
  } catch (err) {
    console.error("DB Query failed:", err);
  }

  // Pure fallback if database fails or is empty
  let hasFallback = false;
  let index = 1;
  if (notesFallback && notesFallback.length > 0) {
    for (const note of notesFallback.slice(0, 3)) {
      hasFallback = true;
      knowledgeContext += `[KNOWLEDGE NODE ${index++} | Source: "${note.title}"]\n${note.content}\n\n`;
    }
  }
  if (filesFallback && filesFallback.length > 0) {
    for (const file of filesFallback.slice(0, 5)) {
      const parts: string[] = [];
      if (file.summary && typeof file.summary === 'string') parts.push(`Summary: ${file.summary}`);
      if (Array.isArray(file.highlights) && file.highlights.length > 0) parts.push(`Key Takeaways:\n- ${file.highlights.join('\n- ')}`);
      if (Array.isArray(file.formulas) && file.formulas.length > 0) parts.push(`Formulas & Equations:\n- ${file.formulas.join('\n- ')}`);
      const richBody = file.transcription || file.contentText || '';
      if (richBody && typeof richBody === 'string') parts.push(`Detailed Study Notes / Transcript:\n${richBody.slice(0, 8000)}`);
      const fallbackText = parts.join('\n\n') || file.name;
      if (fallbackText) {
         hasFallback = true;
         knowledgeContext += `[KNOWLEDGE NODE ${index++} | Source: "${file.name}"]\n${fallbackText}\n\n`;
      }
    }
  }
  
  if (!hasFallback) {
    return "No documents or notes exist in this workspace to retrieve knowledge from.";
  }

  return knowledgeContext;
}
