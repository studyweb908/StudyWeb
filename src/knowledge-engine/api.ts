import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { generateEmbedding } from './utils/embeddings.js';

export const knowledgeRouter = express.Router();

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured.');
  }
  return createClient(supabaseUrl, supabaseKey);
}

knowledgeRouter.post('/upload', async (req, res) => {
  const { workspaceId, userId, name, type, size, content, url, description } = req.body;
  if (!workspaceId) return res.status(400).json({ error: "workspaceId required" });

  try {
    const supabase = getSupabaseClient();
    
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        workspace_id: workspaceId,
        user_id: userId || 'local-user',
        name: name || 'Untitled Document',
        type: type || 'doc',
        status: 'processing',
        url: url
      })
      .select('id')
      .single();

    if (docError || !docData) throw new Error(docError?.message || 'Failed to create document');
    const docId = docData.id;

    const { data: jobData, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        document_id: docId,
        workspace_id: workspaceId,
        user_id: userId || 'local-user',
        status: 'queued',
        progress: 0,
        message: 'Waiting to process'
      })
      .select('id')
      .single();

    if (jobError || !jobData) throw new Error(jobError?.message || 'Failed to create job');
    const jobId = jobData.id;

    setTimeout(() => processDocument(docId, workspaceId, userId || 'local-user', content || url || description || name || '', name || '', type || ''), 100);

    res.json({ success: true, documentId: docId, jobId });
  } catch(e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

async function processDocument(docId: string, workspaceId: string, userId: string, rawContent: string, name: string, type: string) {
  const supabase = getSupabaseClient();
  const updateJob = async (status: string, progress: number, message: string) => {
    await supabase.from('processing_jobs').update({ status, progress, message }).eq('document_id', docId);
  };
  const failJob = async (error: string) => {
    await supabase.from('processing_jobs').update({ status: 'failed', message: error }).eq('document_id', docId);
    await supabase.from('documents').update({ status: 'failed' }).eq('id', docId);
  };

  try {
    await updateJob('processing', 10, 'Extracting content');
    // Simulated advanced extraction
    let cleanContent = rawContent.replace(/\s+/g, ' ').trim();
    
    await updateJob('processing', 30, 'Semantic chunking');
    const chunks = splitIntoChunks(cleanContent || name);
    
    await updateJob('processing', 50, 'Generating embeddings and metadata');
    
    const apiKey = process.env.GEMINI_API_KEY;
    const ai = apiKey && apiKey !== "MY_GEMINI_API_KEY" ? new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } }) : null;

    // Parallel processing for blazing fast analysis
    await Promise.all(chunks.map(async (chunkText, index) => {
      const chunkIdx = index + 1;
      let aiMetadata: any = { topic: 'Extracted Topic', subtopic: 'Subtopic' };
      
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: `Analyze this text chunk and provide metadata: "${chunkText.substring(0, 1000)}"\nProvide JSON with keys: topic, subtopic, definitions, concepts, keywords, examples, formulae, people, dates, events, difficulty, learningObjectives, prerequisites, relatedConcepts, examImportance.`,
            config: { responseMimeType: "application/json" }
          }) as any;
          if (response && response.text) {
             let text = response.text.trim();
             if (text.startsWith("```json")) text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
             aiMetadata = JSON.parse(text);
          }
        } catch (e) { console.warn("Failed to generate AI metadata for chunk", e); }
      }

      const { data: chunkData, error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_id: docId,
          workspace_id: workspaceId,
          user_id: userId,
          text: chunkText,
          source_type: type,
          topic: aiMetadata.topic || 'Extracted Topic',
          subtopic: aiMetadata.subtopic || 'Subtopic',
          page_number: chunkIdx,
          language: 'auto-detected'
        })
        .select('id')
        .single();
        
      if (chunkError || !chunkData) {
         console.error('Failed to create chunk:', chunkError);
         return;
      }
      
      const chunkId = chunkData.id;
      
      // Store extended metadata
      await supabase.from('document_metadata').insert({
         document_id: docId,
         workspace_id: workspaceId,
         user_id: userId,
         key: `chunk_${chunkId}_analysis`,
         value: aiMetadata
      });

      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        const vector = await generateEmbedding(chunkText, apiKey);
        if (vector) {
          const vectorStr = '[' + vector.join(',') + ']';
          await supabase.from('embeddings').insert({
            chunk_id: chunkId,
            document_id: docId,
            workspace_id: workspaceId,
            user_id: userId,
            vector: vectorStr
          });
        }
      }
    }));

    await updateJob('processing', 90, 'Generating summaries');

    if (ai) {
      try {
        const prompt = `Generate the following document summaries as a JSON array of 5 objects, where each object has "title" and "content" (string formatted as HTML with h3, ul, li). The summaries must be based entirely on the provided raw document content.\n1. Short summary\n2. Detailed summary\n3. Revision notes\n4. Bullet notes\n5. Last minute notes\nRaw document content: ${rawContent.substring(0, 15000)}\nReturn ONLY valid JSON in the format: [{"title": "Short summary", "content": "..."}]`;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        }) as any;

        if (response && response.text) {
          let text = response.text.trim();
          if (text.startsWith("```json")) text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
          const generated = JSON.parse(text);

          for (const note of generated) {
             await supabase.from('generated_notes').insert({
               workspace_id: workspaceId,
               user_id: userId,
               title: note.title + ` - ${name}`,
               content: note.content
             });
          }
        }
      } catch (err) {
        console.warn("Failed to generate summaries", err);
      }
    } else {
      const types = ["Short summary", "Detailed summary", "Revision notes", "Bullet notes", "Last minute notes"];
      for (const t of types) {
         await supabase.from('generated_notes').insert({
           workspace_id: workspaceId,
           user_id: userId,
           title: t + ` - ${name}`,
           content: `<p>This is a simulated ${t.toLowerCase()} for the document ${name}.</p>`
         });
      }
    }

    await updateJob('completed', 100, 'Completed');
    await supabase.from('documents').update({ status: 'indexed' }).eq('id', docId);
  } catch (err: any) {
    await failJob(err.message);
  }
}

function splitIntoChunks(text: string): string[] {
  if (!text) return ["Empty Document"];
  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentChunk = "";
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length < 750) {
      currentChunk += " " + sentence.trim();
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence.trim();
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

knowledgeRouter.get('/status/:documentId', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data: jobData, error: jobError } = await supabase
      .from('processing_jobs')
      .select('status, progress, message')
      .eq('document_id', req.params.documentId)
      .single();

    if (jobError || !jobData) return res.status(404).json({ error: "Job not found" });

    let doc = null;
    let notes = [];
    if (jobData.status === 'completed') {
      const { data: docData } = await supabase.from('documents').select('*').eq('id', req.params.documentId).single();
      if (docData) doc = docData;
      
      if (docData?.workspace_id) {
         const { data: notesData } = await supabase
           .from('generated_notes')
           .select('*')
           .eq('workspace_id', docData.workspace_id)
           .ilike('title', `%${docData.name}%`);
         if (notesData) notes = notesData;
      }
    }

    res.json({
      status: jobData.status,
      progress: jobData.progress,
      message: jobData.message,
      document: doc,
      notes: notes
    });
  } catch(err) {
    res.status(500).json({ error: "DB Error" });
  }
});

knowledgeRouter.post('/search', async (req, res) => {
  const { workspaceId, userId, query, limit = 5 } = req.body;
  if (!query) return res.status(400).json({ error: "query required" });

  try {
    const supabase = getSupabaseClient();
    const apiKey = process.env.GEMINI_API_KEY;
    let queryVector: number[] | null = null;
    
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      queryVector = await generateEmbedding(query, apiKey);
    }
    
    if (queryVector) {
      const vectorStr = '[' + queryVector.join(',') + ']';
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: vectorStr,
        match_count: limit,
        p_workspace_id: workspaceId || '',
        p_user_id: userId || 'local-user'
      });
      
      if (error) throw error;
      
      await supabase.from('retrieval_logs').insert({
         workspace_id: workspaceId || '',
         user_id: userId || 'local-user',
         query: query,
         results: data
      });
      
      return res.json({ results: data });
    } else {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('id, text, topic, source_type')
        .eq('workspace_id', workspaceId || '')
        .eq('user_id', userId || 'local-user')
        .limit(limit);
        
      if (error) throw error;
      
      const scored = (data || []).map((row: any) => {
        const setA = new Set(query.toLowerCase().split(' '));
        const setB = new Set((row.text as string || "").toLowerCase().split(' '));
        const intersection = new Set([...setA].filter((x: string) => setB.has(x)));
        const score = intersection.size / (setA.size + setB.size - intersection.size);
        return { ...row, score };
      });
      scored.sort((a, b) => b.score - a.score);
      return res.json({ results: scored });
    }
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});
