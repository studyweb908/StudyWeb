const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/AuxiliaryViews.tsx', 'utf8');

code = code.replace(
  "} catch (err) {\n        console.error(\"Failed to fetch resources from supabase\", err);\n      }",
  "} catch (err) {\n        console.warn(\"Supabase fetch error for workspace_files (table may not exist):\", err);\n      }"
);

fs.writeFileSync('src/components/Dashboard/AuxiliaryViews.tsx', code);
console.log('Patched AuxiliaryViews.tsx');
