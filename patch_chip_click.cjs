const fs = require('fs');
for (const file of ['src/components/Dashboard/WorkspaceLibrary.tsx', 'src/components/Dashboard/WorkspaceOverview.tsx']) {
  let code = fs.readFileSync(file, 'utf8');
  
  const targetTagRender = `                      {selectedMaterial.tags.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold rounded-md border border-indigo-100 dark:border-indigo-800/50 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                          #{tag}
                        </span>
                      ))}`;

  const replaceTagRender = `                      {selectedMaterial.tags.map((tag, i) => (
                        <span 
                          key={i} 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('studyweb-toast', {
                              detail: { message: \`Filtering by tag: \${tag}\`, type: 'info' }
                            }));
                          }}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold rounded-md border border-indigo-100 dark:border-indigo-800/50 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}`;

  code = code.replace(targetTagRender, replaceTagRender);
  fs.writeFileSync(file, code);
}
console.log("Patched chip click");
