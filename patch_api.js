const fs = require('fs');
let code = fs.readFileSync('src/knowledge-engine/api.ts', 'utf8');

code = code.replace(/function getSupabaseClient\(\) \{/, 'function getSupabaseClient(authHeader?: string) {');
code = code.replace(/return createClient\(supabaseUrl, supabaseKey\);/, 'return createClient(supabaseUrl, supabaseKey, authHeader ? { global: { headers: { Authorization: authHeader } } } : {});');

code = code.replace(
  /const supabase = getSupabaseClient\(\);/g, 
  "const authHeader = typeof req !== 'undefined' ? req.headers.authorization : undefined;\n    const supabase = getSupabaseClient(authHeader);"
);

// We need to pass the auth header inside processDocument as well. 
// Wait, processDocument is async and runs in the background. If we use the auth header from the request, we must pass it to processDocument.

fs.writeFileSync('src/knowledge-engine/api.ts', code);
