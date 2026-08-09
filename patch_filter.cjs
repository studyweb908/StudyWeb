const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardWidgets.tsx', 'utf8');

const targetState = `  const [isDeleting, setIsDeleting] = React.useState(false);`;
const replaceState = `  const [isDeleting, setIsDeleting] = React.useState(false);
  const [filter, setFilter] = React.useState<'All' | 'Documents' | 'Images' | 'Links'>('All');`;
code = code.replace(targetState, replaceState);

const targetRecent = `  const recentFiles = dbFiles;`;
const replaceRecent = `  const recentFiles = dbFiles.filter(file => {
    if (filter === 'All') return true;
    const t = (file.type || '').toLowerCase();
    if (filter === 'Documents') {
      return t.includes('pdf') || t.includes('doc') || t.includes('word') || t.includes('text') || t.includes('epub') || t.includes('book') || t.includes('markdown') || t.includes('md');
    }
    if (filter === 'Images') {
      return t.includes('image') || t.includes('jpg') || t.includes('png');
    }
    if (filter === 'Links') {
      return t.includes('url') || t.includes('link') || t.includes('web');
    }
    return false;
  });`;
code = code.replace(targetRecent, replaceRecent);

const targetHeader = `      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Recent Study Materials</h3>
        <button 
          onClick={() => setActiveTab && setActiveTab('workspaces')}
          className="text-[11px] text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-wider cursor-pointer transition-colors"
        >
          View All
        </button>
      </div>`;
const replaceHeader = `      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Recent Study Materials</h3>
        <button 
          onClick={() => setActiveTab && setActiveTab('workspaces')}
          className="text-[11px] text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-wider cursor-pointer transition-colors"
        >
          View All
        </button>
      </div>
      
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {['All', 'Documents', 'Images', 'Links'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={\`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors \${
              filter === f
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }\`}
          >
            {f}
          </button>
        ))}
      </div>`;
code = code.replace(targetHeader, replaceHeader);
fs.writeFileSync('src/components/Dashboard/DashboardWidgets.tsx', code);
console.log("Patched filter logic in DashboardWidgets.tsx");
