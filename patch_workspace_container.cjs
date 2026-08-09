const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceContainer.tsx', 'utf8');

const t1 = `export default function WorkspaceContainer({ 
  workspace, 
  workspaces = [],
  onSwitchWorkspace,
  onDeleteWorkspace,
  onBack,
  onUpdateWorkspace,
  initialTab = 'overview' 
}: WorkspaceContainerProps) {
  const [activeTab, setActiveTab] = useState(initialTab);`;

const r1 = `export default function WorkspaceContainer({ 
  workspace, 
  workspaces = [],
  onSwitchWorkspace,
  onDeleteWorkspace,
  onBack,
  onUpdateWorkspace,
  initialTab = 'overview' 
}: WorkspaceContainerProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);`;

code = code.replace(t1, r1);


const effectDropCode = `  useEffect(() => {
    let dragCounter = 0;
    const handleGlobalDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter++;
        if (dragCounter === 1) {
          setIsGlobalDragging(true);
        }
      }
    };
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter--;
        if (dragCounter === 0) {
          setIsGlobalDragging(false);
        }
      }
    };
    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsGlobalDragging(false);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        setActiveTab('library');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('studyweb-global-file-drop', {
            detail: { files: e.dataTransfer?.files }
          }));
        }, 100);
      }
    };

    window.addEventListener('dragenter', handleGlobalDragEnter);
    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('dragleave', handleGlobalDragLeave);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragenter', handleGlobalDragEnter);
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('dragleave', handleGlobalDragLeave);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);`;

code = code.replace("  // State handlers to bubble up modifications", effectDropCode + "\n\n  // State handlers to bubble up modifications");

const t3 = `  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 animate-fade-in">`;

const r3 = `  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 animate-fade-in relative">
      <AnimatePresence>
        {isGlobalDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm border-4 border-indigo-500 m-4 rounded-3xl"
          >
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center pointer-events-none">
              <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Drop files here</h2>
              <p className="text-slate-500 dark:text-slate-400">Release to upload your documents, images, or media to this workspace.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>`;

code = code.replace(t3, r3);

fs.writeFileSync('src/components/Dashboard/WorkspaceContainer.tsx', code);
console.log("Patched WorkspaceContainer");
