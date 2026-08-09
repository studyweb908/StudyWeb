const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', 'utf8');

const t1 = `  const [isUploading, setIsUploading] = useState(false);`;
const r1 = `  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);`;

code = code.replace(t1, r1);

const t2 = `  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();`;

const r2 = `  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLocal(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLocal(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingLocal) {
      setIsDraggingLocal(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLocal(false);`;

code = code.replace(t2, r2);

const t3 = `        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-200 bg-slate-50/40 rounded-3xl p-6 text-center transition-all hover:bg-slate-100/40"
        >`;

const r3 = `        <div 
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={\`border-2 border-dashed rounded-3xl p-6 text-center transition-all \${
            isDraggingLocal
              ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-900/20' 
              : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/60'
          }\`}
        >`;

code = code.replace(t3, r3);
fs.writeFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', code);
console.log("Patched local drop");
