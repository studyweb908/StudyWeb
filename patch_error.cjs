const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardWidgets.tsx', 'utf8');

code = code.replace(
  "if (fetchError) {\n             setError(fetchError.message);\n           } else if (data && data.length > 0) {",
  "if (fetchError) {\n             console.warn('Supabase fetch error:', fetchError.message);\n             setDbFiles([]);\n           } else if (data && data.length > 0) {"
);

fs.writeFileSync('src/components/Dashboard/DashboardWidgets.tsx', code);
console.log('Patched DashboardWidgets.tsx');
