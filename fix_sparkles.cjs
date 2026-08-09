const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceOverview.tsx', 'utf8');
if(!code.includes("Sparkles")) {
   code = code.replace("Image as ImageIcon,", "Image as ImageIcon, Sparkles,");
   fs.writeFileSync('src/components/Dashboard/WorkspaceOverview.tsx', code);
}
