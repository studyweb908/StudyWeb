const fs = require('fs');
for (const file of ['src/components/Dashboard/WorkspaceLibrary.tsx', 'src/components/Dashboard/WorkspaceOverview.tsx', 'src/components/Dashboard/DashboardWidgets.tsx']) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Fix 1: Add flex-1 to the wrapper
    code = code.replace(/className="flex items-center gap-3 min-w-0"/g, 'className="flex items-center gap-3 min-w-0 flex-1"');
    
    // Fix 2: Add flex-1 to the text container
    // We only want to replace <div className="min-w-0"> if it's the one next to the icon. 
    // In our files it looks exactly like that.
    code = code.replace(/<div className="min-w-0">/g, '<div className="min-w-0 flex-1">');
    
    fs.writeFileSync(file, code);
    console.log("Patched", file);
  }
}
