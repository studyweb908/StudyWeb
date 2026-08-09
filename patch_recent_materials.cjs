const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardWidgets.tsx', 'utf8');

const t1 = `  const [filter, setFilter] = React.useState<'All' | 'Documents' | 'Images' | 'Links'>('All');`;
const r1 = `  const [filter, setFilter] = React.useState<'All' | 'Documents' | 'Images' | 'Links'>('All');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');`;

code = code.replace(t1, r1);

const t2 = `      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
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

const r2 = `      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
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
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
          <button 
            onClick={() => setViewMode('list')}
            className={\`p-1.5 rounded-md transition-colors cursor-pointer \${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}\`}
            title="List View"
          >
            <Layout className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={\`p-1.5 rounded-md transition-colors cursor-pointer \${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}\`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>`;

code = code.replace(t2, r2);

const t3 = `      {loading ? (
        <div className="space-y-2 flex-1 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
                <div className="space-y-2">
                  <div className="w-32 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : recentFiles.length > 0 ? (
        <div className="space-y-2 flex-1">
          {recentFiles.map((file) => {
            const { icon: Icon, color, bg } = getFileStyle(file.type);
            return (
              <div 
                key={file.id} 
                onClick={() => handleOpenFile(file.workspaceId, file)}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group/item gap-3 cursor-pointer min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={\`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 \${bg} \${color}\`}>
                    <Icon className="w-5 h-5 group-hover/item:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{file.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5">
                      {file.type} &bull; {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateQuiz(file.workspaceId);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-sm text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Create Practice Quiz</span>
                </motion.button>
              </div>
            );
          })}
        </div>
      ) : (`;

const r3 = `      {loading ? (
        <div className={\`flex-1 animate-pulse \${viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-2'}\`}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={\`rounded-xl bg-slate-50 dark:bg-slate-800/50 \${viewMode === 'grid' ? 'p-4 aspect-square flex flex-col justify-center items-center' : 'flex items-center justify-between p-3'}\`}>
              <div className={\`\${viewMode === 'grid' ? 'flex flex-col items-center gap-3 w-full' : 'flex items-center gap-3 w-full'}\`}>
                <div className={\`\${viewMode === 'grid' ? 'w-12 h-12 rounded-xl' : 'w-10 h-10 rounded-lg'} bg-slate-200 dark:bg-slate-700\`}></div>
                <div className={\`space-y-2 \${viewMode === 'grid' ? 'w-full text-center flex flex-col items-center' : ''}\`}>
                  <div className="w-32 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : recentFiles.length > 0 ? (
        <div className={\`flex-1 \${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}\`}>
          {recentFiles.map((file) => {
            const { icon: Icon, color, bg } = getFileStyle(file.type);
            
            if (viewMode === 'grid') {
              return (
                <div 
                  key={file.id} 
                  onClick={() => handleOpenFile(file.workspaceId, file)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group/item gap-3 cursor-pointer text-center relative overflow-hidden"
                >
                  <div className={\`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 \${bg} \${color}\`}>
                    <Icon className="w-6 h-6 group-hover/item:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="min-w-0 w-full px-1">
                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{file.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-1">
                      {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateQuiz(file.workspaceId);
                      }}
                      className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer w-full"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Quiz</span>
                    </motion.button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={file.id} 
                onClick={() => handleOpenFile(file.workspaceId, file)}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group/item gap-3 cursor-pointer min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={\`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 \${bg} \${color}\`}>
                    <Icon className="w-5 h-5 group-hover/item:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{file.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5">
                      {file.type} &bull; {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateQuiz(file.workspaceId);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-sm text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden sm:inline">Create Quiz</span>
                  <span className="sm:hidden">Quiz</span>
                </motion.button>
              </div>
            );
          })}
        </div>
      ) : (`;

code = code.replace(t3, r3);

// Import Grid
if (!code.includes('Grid,')) {
  code = code.replace('import { ', 'import { Grid, ');
}

fs.writeFileSync('src/components/Dashboard/DashboardWidgets.tsx', code);
console.log("Patched grid/list view");
