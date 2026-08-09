const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', 'utf8');

// Add Calendar and ExternalLink to lucide-react import
code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
  let imports = p1.split(',').map(s => s.trim()).filter(s => s.length > 0);
  if (!imports.includes('ExternalLink')) imports.push('ExternalLink');
  if (!imports.includes('Calendar')) imports.push('Calendar');
  return `import { ${imports.join(', ')} } from 'lucide-react';`;
});
fs.writeFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', code);

// Fix WorkspaceOverview.tsx Sparkles
let overviewCode = fs.readFileSync('src/components/Dashboard/WorkspaceOverview.tsx', 'utf8');
overviewCode = overviewCode.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
  let imports = p1.split(',').map(s => s.trim()).filter(s => s.length > 0);
  // Remove duplicates
  imports = [...new Set(imports)];
  return `import { ${imports.join(', ')} } from 'lucide-react';`;
});
fs.writeFileSync('src/components/Dashboard/WorkspaceOverview.tsx', overviewCode);
console.log("Patched imports correctly.");
