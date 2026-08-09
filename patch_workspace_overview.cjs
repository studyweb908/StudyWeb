const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceOverview.tsx', 'utf8');

// There are duplicate Sparkles.
code = code.replace("Sparkles,\n", "");

fs.writeFileSync('src/components/Dashboard/WorkspaceOverview.tsx', code);
console.log("Patched WorkspaceOverview.tsx duplicate import");
