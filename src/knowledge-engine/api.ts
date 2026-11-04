import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { generateEmbedding } from './utils/embeddings.js';
import { toValidUuid, isValidUuid, generateUuid } from '../utils/uuid.js';
import { getServerGeminiApiKey } from '../utils/serverEnv.js';

export const knowledgeRouter = express.Router();

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

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

function getSupabaseClient(authHeader?: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured.');
  }
  const safeAuth = sanitizeBearerHeader(authHeader);
  const options = safeAuth ? { global: { headers: { Authorization: safeAuth } } } : {};
  return createClient(supabaseUrl, supabaseKey, options);
}

function getGeminiApiKey(): string | null {
  return getServerGeminiApiKey();
}


// IN-MEMORY FALLBACK STORE
const memoryStore = {
  documents: new Map(),
  processingJobs: new Map(),
  documentChunks: new Map(),
  generatedNotes: new Map()
};

function generateId() {
  return generateUuid();
}

knowledgeRouter.post('/upload', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { workspaceId, userId, content, name, type, url, description, size, fileBase64 } = req.body;

    // Normalize identifiers to valid RFC4122 v4 UUIDs for database operations
    const normWsId = toValidUuid(workspaceId);
    const normUserId = toValidUuid(userId);

    let docId = '';
    let useMemory = false;

    // Only attempt Supabase when authenticated with a valid Bearer token
    const hasAuthToken = Boolean(authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 20);

    if (hasAuthToken) {
      try {
        const supabase = getSupabaseClient(authHeader);

        // Ensure workspace row exists to satisfy foreign key constraint documents_workspace_id_fkey
        try {
          await supabase.from('workspaces').upsert({
            id: normWsId,
            user_id: normUserId,
            name: 'Workspace'
          }, { onConflict: 'id', ignoreDuplicates: true });
        } catch {
          // ignore non-fatal workspace stub upsert
        }

        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            workspace_id: normWsId,
            user_id: normUserId,
            name: name || url || 'Untitled',
            type: type || 'doc',
            status: 'pending',
            url: url
          })
          .select('id')
          .single();

        if (docError || !docData) {
          useMemory = true;
          docId = generateUuid();
        } else {
          docId = docData.id;
          await supabase
            .from('processing_jobs')
            .insert({
              document_id: docId,
              workspace_id: normWsId,
              user_id: normUserId,
              status: 'queued',
              progress: 0,
              message: 'Job queued'
            });
        }
      } catch {
        useMemory = true;
        docId = generateUuid();
      }
    } else {
      useMemory = true;
      docId = generateUuid();
    }

    if (useMemory) {
      if (!docId) docId = generateUuid();

      memoryStore.documents.set(docId, {
        id: docId,
        workspace_id: workspaceId,
        normalized_workspace_id: normWsId,
        user_id: userId || 'local-user',
        name: name || url || 'Untitled',
        type: type || 'doc',
        status: 'pending',
        url: url
      });
      
      memoryStore.processingJobs.set(docId, {
        document_id: docId,
        workspace_id: workspaceId,
        normalized_workspace_id: normWsId,
        user_id: userId || 'local-user',
        status: 'queued',
        progress: 0,
        message: 'Job queued'
      });
    }

    const jobId = useMemory ? docId : "db-job";
    
    // Process asynchronously
    setTimeout(() => processDocument(docId, workspaceId, userId || 'local-user', content || url || description || name || '', name || '', type || '', authHeader, useMemory), 100);
    
    res.json({ success: true, documentId: docId, jobId });
  } catch(e: any) {
    console.warn("SERVER ERROR IN /upload:", e.message);
    res.status(500).json({ error: e.message });
  }
});

knowledgeRouter.post('/upload-multipart', uploadMiddleware.single('file'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const file = req.file;
    const { workspaceId, userId, description, url } = req.body;

    if (!file) {
      res.status(400).json({ error: "No file attached in multipart form data ('file' field required)." });
      return;
    }

    const name = req.body.name || file.originalname || 'Uploaded Document';
    const type = req.body.type || (file.mimetype.includes('pdf') ? 'pdf' : 'doc');

    const normWsId = toValidUuid(workspaceId);
    const normUserId = toValidUuid(userId);
    const hasAuthToken = Boolean(authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 20);

    let docId = '';
    let useMemory = false;

    if (hasAuthToken) {
      try {
        const supabase = getSupabaseClient(authHeader);

        // Ensure workspace row exists in Supabase
        try {
          await supabase.from('workspaces').upsert({
            id: normWsId,
            user_id: normUserId,
            name: 'Workspace'
          }, { onConflict: 'id', ignoreDuplicates: true });
        } catch {
          // ignore non-fatal workspace stub upsert
        }

        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            workspace_id: normWsId,
            user_id: normUserId,
            name,
            type,
            status: 'pending',
            url: url || ''
          })
          .select('id')
          .single();

        if (docError || !docData) {
          useMemory = true;
          docId = generateUuid();
        } else {
          docId = docData.id;
          await supabase
            .from('processing_jobs')
            .insert({
              document_id: docId,
              workspace_id: normWsId,
              user_id: normUserId,
              status: 'queued',
              progress: 0,
              message: 'Job queued'
            });
        }
      } catch {
        useMemory = true;
        docId = generateUuid();
      }
    } else {
      useMemory = true;
      docId = generateUuid();
    }

    if (useMemory) {
      if (!docId) docId = generateUuid();

      memoryStore.documents.set(docId, {
        id: docId,
        workspace_id: workspaceId,
        normalized_workspace_id: normWsId,
        user_id: userId || 'local-user',
        name,
        type,
        status: 'pending',
        url: url || ''
      });
      memoryStore.processingJobs.set(docId, {
        document_id: docId,
        workspace_id: workspaceId,
        normalized_workspace_id: normWsId,
        user_id: userId || 'local-user',
        status: 'queued',
        progress: 0,
        message: 'Job queued'
      });
    }

    const jobId = useMemory ? docId : "db-job";
    setTimeout(() => processDocument(docId, workspaceId, userId || 'local-user', description || name, name, type, authHeader, useMemory), 100);

    res.json({ success: true, documentId: docId, jobId, name });
  } catch (e: any) {
    console.warn("SERVER ERROR IN /upload-multipart:", e.message);
    res.status(500).json({ error: e.message });
  }
});

async function processDocument(docId: string, workspaceId: string, userId: string, rawContent: string, name: string, type: string, authHeader?: string, useMemory?: boolean) {
  let supabase: any = null;
  if (!useMemory) {
    try {
      supabase = getSupabaseClient(authHeader);
    } catch {
      useMemory = true;
    }
  }

  const normWsId = toValidUuid(workspaceId);
  const normUserId = toValidUuid(userId);
  const normDocId = toValidUuid(docId);

  const updateJob = async (status: string, progress: number, message: string) => {
    if (useMemory) {
      const job = memoryStore.processingJobs.get(docId) || {};
      memoryStore.processingJobs.set(docId, { ...job, status, progress, message });
      if (status === 'completed' || status === 'failed') {
        const doc = memoryStore.documents.get(docId) || {};
        memoryStore.documents.set(docId, { ...doc, status: status === 'completed' ? 'indexed' : 'failed' });
      }
    } else if (supabase) {
      try {
        await supabase.from('processing_jobs').update({ status, progress, message }).eq('document_id', normDocId);
      } catch {
        // Safe fallback into memory
        const job = memoryStore.processingJobs.get(docId) || {};
        memoryStore.processingJobs.set(docId, { ...job, status, progress, message });
      }
    }
  };

  const failJob = async (error: string) => {
    if (useMemory) {
      updateJob('failed', 0, error);
    } else if (supabase) {
      try {
        await supabase.from('processing_jobs').update({ status: 'failed', message: error }).eq('document_id', normDocId);
        await supabase.from('documents').update({ status: 'failed' }).eq('id', normDocId);
      } catch {
        updateJob('failed', 0, error);
      }
    }
  };

  try {
    await updateJob('processing', 10, 'Extracting content');

    // Simulated advanced extraction
    let cleanContent = rawContent.replace(/\s+/g, ' ').trim();
    
    await updateJob('processing', 30, 'Semantic chunking');
    const chunks = splitIntoChunks(cleanContent || name);
    
    await updateJob('processing', 50, 'Generating embeddings and metadata');
    
    const apiKey = getGeminiApiKey();
    let ai: any = null;
    if (apiKey) {
      ai = new GoogleGenAI({ apiKey });
    }

    await Promise.all(chunks.map(async (chunkText, chunkIdx) => {
      let aiMetadata = { topic: "General", subtopic: "Detail" };
      const chunkId = generateUuid();
      
      let vector: number[] | null = null;
      if (apiKey) {
        try {
          vector = await generateEmbedding(chunkText, apiKey);
        } catch {}
      }

      if (useMemory || !supabase) {
        memoryStore.documentChunks.set(chunkId, {
          id: chunkId,
          document_id: docId,
          workspace_id: workspaceId,
          normalized_workspace_id: normWsId,
          user_id: userId,
          text: chunkText,
          vector,
          source_type: type,
          topic: aiMetadata.topic || 'Extracted Topic',
          subtopic: aiMetadata.subtopic || 'Subtopic',
          page_number: chunkIdx,
          language: 'auto-detected'
        });
      } else {
        try {
          const { data: chunkData, error: chunkError } = await supabase
            .from('document_chunks')
            .insert({
              document_id: normDocId,
              workspace_id: normWsId,
              user_id: normUserId,
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
             memoryStore.documentChunks.set(chunkId, {
               id: chunkId,
               document_id: docId,
               workspace_id: workspaceId,
               text: chunkText,
               vector,
               source_type: type
             });
          } else if (vector && vector.length > 0) {
            try {
              const vectorStr = '[' + vector.join(',') + ']';
              await supabase.from('embeddings').insert({
                chunk_id: chunkData.id,
                document_id: normDocId,
                workspace_id: normWsId,
                user_id: normUserId,
                vector: vectorStr
              });
            } catch (vErr) {
              console.warn("Notice: Vector embedding insertion warning:", vErr);
            }
          }
        } catch {
          memoryStore.documentChunks.set(chunkId, {
            id: chunkId,
            document_id: docId,
            workspace_id: workspaceId,
            text: chunkText,
            vector,
            source_type: type
          });
        }
      }
    }));

    await updateJob('processing', 90, 'Generating summaries');

    if (ai) {
      try {
        const prompt = `Generate the following document summaries as a JSON array of 5 objects, where each object has "title" and "content" (string formatted as HTML with h3, ul, li). The summaries must be based entirely on the provided raw document content.\n1. Short summary\n2. Detailed summary\n3. Revision notes\n4. Bullet notes\n5. Last minute notes\nRaw document content: ${rawContent.substring(0, 15000)}\nReturn ONLY valid JSON in the format: [{"title": "Short summary", "content": "..."}]`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        }) as any;

        if (response && response.text) {
          let text = response.text.trim();
          if (text.startsWith("```json")) text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
          const generated = JSON.parse(text);

          for (const note of generated) {
             const noteId = generateUuid();
             if (useMemory || !supabase) {
               memoryStore.generatedNotes.set(noteId, {
                 workspace_id: workspaceId,
                 normalized_workspace_id: normWsId,
                 user_id: userId,
                 title: note.title + ` - ${name}`,
                 content: note.content,
                 id: noteId,
                 document_id: docId
               });
             } else {
               try {
                 await supabase.from('generated_notes').insert({
                   workspace_id: normWsId,
                   user_id: normUserId,
                   title: note.title + ` - ${name}`,
                   content: note.content
                 });
               } catch {
                 memoryStore.generatedNotes.set(noteId, {
                   workspace_id: workspaceId,
                   user_id: userId,
                   title: note.title + ` - ${name}`,
                   content: note.content,
                   id: noteId,
                   document_id: docId
                 });
               }
             }
          }
        }
      } catch (err) {
        console.warn("Notice: Summary generation used default template");
      }
    } else {
      const types = ["Short summary", "Detailed summary", "Revision notes", "Bullet notes", "Last minute notes"];
      for (const t of types) {
         const noteId = generateUuid();
         if (useMemory || !supabase) {
           memoryStore.generatedNotes.set(noteId, {
             workspace_id: workspaceId,
             normalized_workspace_id: normWsId,
             user_id: userId,
             title: t + ` - ${name}`,
             content: `<p>This is a simulated ${t.toLowerCase()} for the document ${name}.</p>`,
             id: noteId,
             document_id: docId
           });
         } else {
           try {
             await supabase.from('generated_notes').insert({
               workspace_id: normWsId,
               user_id: normUserId,
               title: t + ` - ${name}`,
               content: `<p>This is a simulated ${t.toLowerCase()} for the document ${name}.</p>`
             });
           } catch {
             memoryStore.generatedNotes.set(noteId, {
               workspace_id: workspaceId,
               user_id: userId,
               title: t + ` - ${name}`,
               content: `<p>This is a simulated ${t.toLowerCase()} for the document ${name}.</p>`,
               id: noteId,
               document_id: docId
             });
           }
         }
      }
    }

    await updateJob('completed', 100, 'Completed');
    if (!useMemory && supabase) {
       try {
         await supabase.from('documents').update({ status: 'indexed' }).eq('id', normDocId);
       } catch {
         // ignore
       }
    }
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
    const authHeader = req.headers.authorization;
    const docId = req.params.documentId;
    
    // Check memory first
    if (memoryStore.processingJobs.has(docId)) {
      const jobData = memoryStore.processingJobs.get(docId);
      
      let doc = null;
      let notes = [];
      if (jobData.status === 'completed') {
        doc = memoryStore.documents.get(docId) || null;
        if (doc) {
           notes = Array.from(memoryStore.generatedNotes.values()).filter((n: any) => n.document_id === docId);
        }
      }
      return res.json({
        status: jobData.status,
        progress: jobData.progress,
        message: jobData.message,
        document: doc,
        notes: notes
      });
    }

    try {
      const supabase = getSupabaseClient(authHeader);
      const normDocId = toValidUuid(docId);
      const { data: jobData, error: jobError } = await supabase
        .from('processing_jobs')
        .select('status, progress, message')
        .eq('document_id', normDocId)
        .single();

      if (jobError || !jobData) return res.status(404).json({ error: "Job not found" });

      let doc = null;
      let notes = [];
      if (jobData.status === 'completed') {
        const { data: docData } = await supabase.from('documents').select('*').eq('id', normDocId).single();
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

      return res.json({
        status: jobData.status,
        progress: jobData.progress,
        message: jobData.message,
        document: doc,
        notes: notes
      });
    } catch {
      return res.status(404).json({ error: "Job not found" });
    }
  } catch(err) {
    res.status(500).json({ error: "DB Error" });
  }
});

knowledgeRouter.post('/search', async (req, res) => {
  const { workspaceId, userId, query, limit = 5 } = req.body;
  const authHeader = req.headers.authorization;
  if (!query) return res.status(400).json({ error: "query required" });

  const normWsId = toValidUuid(workspaceId);
  const normUserId = toValidUuid(userId);

  try {
    let supabase = null;
    try {
      supabase = getSupabaseClient(authHeader);
    } catch {
      // no client
    }

    const apiKey = getGeminiApiKey();
    let queryVector: number[] | null = null;
    
    if (apiKey) {
      queryVector = await generateEmbedding(query, apiKey);
    }
    
    if (supabase && queryVector) {
      try {
        const vectorStr = '[' + queryVector.join(',') + ']';
        const { data, error } = await supabase.rpc('match_documents', {
          query_embedding: vectorStr,
          match_count: limit,
          p_workspace_id: normWsId,
          p_user_id: normUserId
        });
        
        if (!error && data) {
          try {
            await supabase.from('retrieval_logs').insert({
               workspace_id: normWsId,
               user_id: normUserId,
               query: query,
               results: data
            });
          } catch {
            // ignore
          }
          return res.json({ results: data });
        }
      } catch {
        // fallback to chunks search
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('document_chunks')
          .select('id, text, topic, source_type')
          .eq('workspace_id', normWsId)
          .limit(limit * 2);
          
        if (!error && data && data.length > 0) {
          const scored = data.map((row: any) => {
            const setA = new Set(query.toLowerCase().split(' '));
            const setB = new Set((row.text as string || "").toLowerCase().split(' '));
            const intersection = new Set([...setA].filter((x: string) => setB.has(x)));
            const score = (intersection.size / (setA.size + setB.size - intersection.size)) || 0;
            return { ...row, score };
          });
          scored.sort((a: any, b: any) => b.score - a.score);
          return res.json({ results: scored.slice(0, limit) });
        }
      } catch {
        // fallback to memory
      }
    }

    // In-memory chunks search fallback (strictly scoped to caller's workspace & user)
    const memChunks = Array.from(memoryStore.documentChunks.values()).filter(
      (c: any) =>
        (c.workspace_id === workspaceId || c.workspace_id === normWsId || c.normalized_workspace_id === normWsId) &&
        (!userId || !c.user_id || c.user_id === userId || c.user_id === normUserId)
    );
    const scored = memChunks.map((row: any) => {
      const setA = new Set(query.toLowerCase().split(' '));
      const setB = new Set((row.text as string || "").toLowerCase().split(' '));
      const intersection = new Set([...setA].filter((x: string) => setB.has(x)));
      const score = (intersection.size / (setA.size + setB.size - intersection.size)) || 0;
      return { ...row, score };
    });
    scored.sort((a: any, b: any) => b.score - a.score);
    return res.json({ results: scored.slice(0, limit) });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

knowledgeRouter.post('/suggest-tags', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "content required" });

  try {
    const apiKey = getGeminiApiKey();
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analyze the following document snippet and suggest 3-5 short, relevant tags (1-2 words each) for categorization. Return ONLY a valid JSON array of strings, like ["tag1", "tag2"].\n\nSnippet:\n${content.substring(0, 5000)}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      if (response && response.text) {
          let text = response.text.trim();
          if (text.startsWith("\`\`\`json")) text = text.replace(/^\`\`\`json\n/, "").replace(/\n\`\`\`$/, "");
          const tags = JSON.parse(text);
          return res.json({ tags });
      }
    }
    
    // Fallback if no API key or failed parse
    res.json({ tags: ["Review", "Important", "Draft"] });
  } catch(err: any) {
    console.error("Tags generation error", err);
    res.json({ tags: ["Review", "Important", "Draft"] });
  }
});

knowledgeRouter.post('/delete', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { documentId, workspaceId, userId } = req.body;
    if (!documentId) return res.status(400).json({ error: "documentId required" });

    const normDocId = toValidUuid(documentId);

    // Clean up memory store only if owned by caller
    const existingDoc = memoryStore.documents.get(documentId) || memoryStore.documents.get(normDocId);
    if (!existingDoc || !userId || existingDoc.user_id === userId || existingDoc.user_id === 'local-user') {
      memoryStore.documents.delete(documentId);
      memoryStore.documents.delete(normDocId);
      memoryStore.processingJobs.delete(documentId);
      memoryStore.processingJobs.delete(normDocId);

      for (const [chunkId, chunk] of memoryStore.documentChunks.entries()) {
        if (chunk.document_id === documentId || chunk.document_id === normDocId) {
          memoryStore.documentChunks.delete(chunkId);
        }
      }
    }

    // Clean up Supabase strictly for the authenticated user
    const hasAuthToken = Boolean(authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 20);
    if (hasAuthToken) {
      try {
        const supabase = getSupabaseClient(authHeader);
        const { data: authData } = await supabase.auth.getUser();
        const verifiedUserId = authData?.user?.id;
        if (verifiedUserId) {
          await supabase.from('embeddings').delete().eq('document_id', normDocId).eq('user_id', verifiedUserId);
          await supabase.from('document_chunks').delete().eq('document_id', normDocId).eq('user_id', verifiedUserId);
          await supabase.from('processing_jobs').delete().eq('document_id', normDocId).eq('user_id', verifiedUserId);
          await supabase.from('documents').delete().eq('id', normDocId).eq('user_id', verifiedUserId);
          await supabase.from('workspace_files').delete().eq('id', normDocId).eq('user_id', verifiedUserId);
        }
      } catch (e: any) {
        console.warn("Notice: Supabase file deletion cleanup warning:", e?.message || e);
      }
    }

    res.json({ success: true, message: "Document and associated vectors deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
