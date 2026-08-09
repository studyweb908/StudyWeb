const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', 'utf8');

const effectCode = `  useEffect(() => {
    const handleGlobalDropEvent = (e) => {
      const customEvent = e;
      if (customEvent.detail?.files && customEvent.detail.files.length > 0) {
        const file = customEvent.detail.files[0];
        
        let type = 'pdf';
        if (file.type.startsWith('audio/')) {
          type = 'audio';
        } else if (file.type.startsWith('video/')) {
          type = 'video';
        } else if (file.type.includes('pdf')) {
          type = 'pdf';
        } else {
          if (file.name.endsWith('.pdf')) type = 'pdf';
          else if (file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')) type = 'audio';
          else if (file.name.endsWith('.mp4') || file.name.endsWith('.mkv') || file.name.endsWith('.avi')) type = 'video';
        }

        const formattedSize = formatFileSize(file.size);
        analyzeAndAddResource(file.name, type, formattedSize, undefined, file);
      }
    };
    
    window.addEventListener('studyweb-global-file-drop', handleGlobalDropEvent);
    return () => window.removeEventListener('studyweb-global-file-drop', handleGlobalDropEvent);
  }, [workspace.id, formatFileSize]);`;

// Put it right before `useEffect(() => {` that already exists for unmount, or just before `const handleDragOver`
code = code.replace("const handleDragOver = (e: React.DragEvent) => {", effectCode + "\n\n  const handleDragOver = (e: React.DragEvent) => {");

fs.writeFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', code);
console.log("Patched WorkspaceLibrary.tsx");
