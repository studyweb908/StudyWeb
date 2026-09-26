import fs from 'fs';
let code = fs.readFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', 'utf8');
code = code.replace(
  /if \(!response.ok\) throw new Error\("Document analysis failed"\);/,
  `if (!response.ok) {
        const txt = await response.text();
        throw new Error("Document analysis failed: " + txt);
      }`
);
code = code.replace(
  /if \(!response.ok\) \{\s*throw new Error\('Analysis failed'\);\s*\}/,
  `if (!response.ok) {
        const txt = await response.text();
        throw new Error('Analysis failed: ' + txt);
      }`
);
fs.writeFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', code);
