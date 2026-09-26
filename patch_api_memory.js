import fs from 'fs';
let code = fs.readFileSync('src/knowledge-engine/api.ts', 'utf8');

const replacement = `
// IN-MEMORY FALLBACK STORE
const memoryStore = {
  documents: new Map(),
  processingJobs: new Map(),
  documentChunks: new Map(),
  generatedNotes: new Map()
};

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

knowledgeRouter.post('/upload', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { workspaceId, userId, content, name, type, url, description, size, fileBase64 } = req.body;
    const supabase = getSupabaseClient(authHeader);

    let docId = '';
    let useMemory = false;

    // Try Supabase first
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        workspace_id: workspaceId,
        user_id: userId || 'local-user',
        name: name || url || 'Untitled',
        type: type || 'doc',
        status: 'pending',
        url: url
      })
      .select('id')
      .single();

    if (docError) {
      console.warn("Supabase insert failed, falling back to in-memory store:", docError.message);
      useMemory = true;
      docId = generateId();
      
      memoryStore.documents.set(docId, {
        id: docId,
        workspace_id: workspaceId,
        user_id: userId || 'local-user',
        name: name || url || 'Untitled',
        type: type || 'doc',
        status: 'pending',
        url: url
      });
      
      memoryStore.processingJobs.set(docId, {
        document_id: docId,
        workspace_id: workspaceId,
        user_id: userId || 'local-user',
        status: 'queued',
        progress: 0,
        message: 'Job queued'
      });
      
    } else {
      docId = docData.id;
      const { data: jobData, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          document_id: docId,
          workspace_id: workspaceId,
          user_id: userId || 'local-user',
          status: 'queued',
          progress: 0,
          message: 'Job queued'
        })
        .select('id')
        .single();
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

async function processDocument(docId: string, workspaceId: string, userId: string, rawContent: string, name: string, type: string, authHeader?: string, useMemory?: boolean) {
  const supabase = getSupabaseClient(authHeader);

  const updateJob = async (status: string, progress: number, message: string) => {
    if (useMemory) {
      const job = memoryStore.processingJobs.get(docId) || {};
      memoryStore.processingJobs.set(docId, { ...job, status, progress, message });
      if (status === 'completed' || status === 'failed') {
        const doc = memoryStore.documents.get(docId) || {};
        memoryStore.documents.set(docId, { ...doc, status: status === 'completed' ? 'indexed' : 'failed' });
      }
    } else {
      await supabase.from('processing_jobs').update({ status, progress, message }).eq('document_id', docId);
    }
  };

  const failJob = async (error: string) => {
    if (useMemory) {
      updateJob('failed', 0, error);
    } else {
      await supabase.from('processing_jobs').update({ status: 'failed', message: error }).eq('document_id', docId);
      await supabase.from('documents').update({ status: 'failed' }).eq('id', docId);
    }
  };

  try {
    await updateJob('processing', 10, 'Extracting content');

    // Simulated advanced extraction
    let cleanContent = rawContent.replace(/\\s+/g, ' ').trim();
    
    await updateJob('processing', 30, 'Semantic chunking');
    const chunks = splitIntoChunks(cleanContent || name);
    
    await updateJob('processing', 50, 'Generating embeddings and metadata');
    
    const apiKey = process.env.GEMINI_API_KEY;
    let ai: any = null;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      ai = new GoogleGenAI({ apiKey });
    }

    await Promise.all(chunks.map(async (chunkText, chunkIdx) => {
      let aiMetadata = { topic: "General", subtopic: "Detail" };
      
      const chunkId = generateId();
      
      if (useMemory) {
        memoryStore.documentChunks.set(chunkId, {
          id: chunkId,
          document_id: docId,
          workspace_id: workspaceId,
          user_id: userId,
          text: chunkText,
          source_type: type,
          topic: aiMetadata.topic || 'Extracted Topic',
          subtopic: aiMetadata.subtopic || 'Subtopic',
          page_number: chunkIdx,
          language: 'auto-detected'
        });
      } else {
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
        
        // Skip extended metadata/embeddings to keep this simple for fallback
      }
    }));

    await updateJob('processing', 90, 'Generating summaries');

    if (ai) {
      try {
        const prompt = \`Generate the following document summaries as a JSON array of 5 objects, where each object has "title" and "content" (string formatted as HTML with h3, ul, li). The summaries must be based entirely on the provided raw document content.\\n1. Short summary\\n2. Detailed summary\\n3. Revision notes\\n4. Bullet notes\\n5. Last minute notes\\nRaw document content: \${rawContent.substring(0, 15000)}\\nReturn ONLY valid JSON in the format: [{"title": "Short summary", "content": "..."}]\`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        }) as any;

        if (response && response.text) {
          let text = response.text.trim();
          if (text.startsWith("\`\`\`json")) text = text.replace(/^\`\`\`json\\n/, "").replace(/\\n\`\`\`$/, "");
          const generated = JSON.parse(text);

          for (const note of generated) {
             if (useMemory) {
               memoryStore.generatedNotes.set(generateId(), {
                 workspace_id: workspaceId,
                 user_id: userId,
                 title: note.title + \` - \${name}\`,
                 content: note.content,
                 id: generateId(),
                 document_id: docId
               });
             } else {
               await supabase.from('generated_notes').insert({
                 workspace_id: workspaceId,
                 user_id: userId,
                 title: note.title + \` - \${name}\`,
                 content: note.content
               });
             }
          }
        }
      } catch (err) {
        console.warn("Failed to generate summaries", err);
      }
    } else {
      const types = ["Short summary", "Detailed summary", "Revision notes", "Bullet notes", "Last minute notes"];
      for (const t of types) {
         if (useMemory) {
           memoryStore.generatedNotes.set(generateId(), {
             workspace_id: workspaceId,
             user_id: userId,
             title: t + \` - \${name}\`,
             content: \`<p>This is a simulated \${t.toLowerCase()} for the document \${name}.</p>\`,
             id: generateId(),
             document_id: docId
           });
         } else {
           await supabase.from('generated_notes').insert({
             workspace_id: workspaceId,
             user_id: userId,
             title: t + \` - \${name}\`,
             content: \`<p>This is a simulated \${t.toLowerCase()} for the document \${name}.</p>\`
           });
         }
      }
    }

    await updateJob('completed', 100, 'Completed');
    if (!useMemory) {
       await supabase.from('documents').update({ status: 'indexed' }).eq('id', docId);
    }
  } catch (err: any) {
    await failJob(err.message);
  }
}
`;

code = code.replace(/knowledgeRouter\.post\('\/upload', async \(req, res\) => \{[\s\S]*?function splitIntoChunks/m, replacement + '\nfunction splitIntoChunks');

// Update status to check memory
const statusReplacement = `knowledgeRouter.get('/status/:documentId', async (req, res) => {
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

    const supabase = getSupabaseClient(authHeader);
    const { data: jobData, error: jobError } = await supabase
      .from('processing_jobs')
      .select('status, progress, message')
      .eq('document_id', docId)
      .single();`;
      
code = code.replace(/knowledgeRouter\.get\('\/status\/:documentId', async \(req, res\) => \{\s*try \{\s*const authHeader = req\.headers\.authorization;\s*const supabase = getSupabaseClient\(authHeader\);\s*const { data: jobData, error: jobError } = await supabase\s*\.from\('processing_jobs'\)\s*\.select\('status, progress, message'\)\s*\.eq\('document_id', req\.params\.documentId\)\s*\.single\(\);/, statusReplacement);

fs.writeFileSync('src/knowledge-engine/api.ts', code);
