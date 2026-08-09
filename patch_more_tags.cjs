const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', 'utf8');

const t1 = `      const fileData = finalFileData || {
        id: documentId,
        name: title,
        type: 'doc',
        size: 'Pasted Document',
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'indexed',
        tags: ['Indexed'],
        summary: 'Indexed by Knowledge Engine'
      };`;

const r1 = `      const fileData = finalFileData || {
        id: documentId,
        name: title,
        type: 'doc',
        size: 'Pasted Document',
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'indexed',
        tags: ['Indexed', 'Document', 'Notes', 'Generated'],
        summary: 'Indexed by Knowledge Engine'
      };`;

const t2 = `      const fileData = finalFileData || {
        id: documentId,
        name: name || url,
        type,
        size,
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'indexed',
        tags: ['Indexed'],
        summary: 'Indexed by Knowledge Engine'
      };`;

const r2 = `      const generatedTags2 = ['Indexed'];
      if (type === 'pdf' || type === 'doc') generatedTags2.push('Document', 'Text Analysis');
      if (type === 'video') generatedTags2.push('Video', 'Media');
      if (type === 'image') generatedTags2.push('Visual', 'Image');
      if (type === 'audio') generatedTags2.push('Audio', 'Transcript');
      if ((name || url || '').toLowerCase().includes('math')) generatedTags2.push('Mathematics');

      const fileData = finalFileData || {
        id: documentId,
        name: name || url,
        type,
        size,
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'indexed',
        tags: generatedTags2,
        summary: 'Indexed by Knowledge Engine'
      };`;

code = code.replace(t1, r1);
code = code.replace(t2, r2);

fs.writeFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', code);
