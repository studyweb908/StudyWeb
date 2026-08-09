const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', 'utf8');

const targetData = `      const fileData = {
        id: 'file-' + Date.now(),
        name: name || url || 'Untitled Resource',
        type,
        size,
        uploadDate: new Date().toISOString(),
        status: 'indexed' as const,
        url: objectUrl,
        summary: \`This is a simulated AI summary for \${name || url}. The actual backend endpoint for knowledge extraction is not available in this environment.\`,
        tags: []
      };`;

const replaceData = `      const generatedTags = [];
      const lowerName = (name || url || '').toLowerCase();
      if (type === 'pdf' || type === 'doc') generatedTags.push('Document', 'Text Analysis');
      if (type === 'video') generatedTags.push('Video', 'Media');
      if (type === 'image') generatedTags.push('Visual', 'Image');
      if (type === 'audio') generatedTags.push('Audio', 'Transcript');
      if (lowerName.includes('math') || lowerName.includes('calc')) generatedTags.push('Mathematics');
      if (lowerName.includes('science') || lowerName.includes('physics')) generatedTags.push('Science');
      if (lowerName.includes('history')) generatedTags.push('History');
      if (generatedTags.length === 0) generatedTags.push('General');

      const fileData = {
        id: 'file-' + Date.now(),
        name: name || url || 'Untitled Resource',
        type,
        size,
        uploadDate: new Date().toISOString(),
        status: 'indexed' as const,
        url: objectUrl,
        summary: \`This is a simulated AI summary for \${name || url}. The actual backend endpoint for knowledge extraction is not available in this environment.\`,
        tags: generatedTags
      };`;

code = code.replace(targetData, replaceData);

const targetRender = `                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metadata</h5>`;

const replaceRender = `                {(selectedMaterial.tags && selectedMaterial.tags.length > 0) && (
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Tags</h5>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMaterial.tags.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold rounded-md border border-indigo-100 dark:border-indigo-800/50 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metadata</h5>`;

code = code.replace(targetRender, replaceRender);

fs.writeFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', code);
console.log("Patched WorkspaceLibrary.tsx");
