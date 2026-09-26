import fs from 'fs';
let code = fs.readFileSync('src/knowledge-engine/api.ts', 'utf8');
code = code.replace(
  /const supabase = getSupabaseClient\(authHeader\);/,
  `console.log("UPLOAD PAYLOAD userId:", userId, "authHeader:", authHeader ? authHeader.substring(0,20)+"..." : "none");\n    const supabase = getSupabaseClient(authHeader);`
);
fs.writeFileSync('src/knowledge-engine/api.ts', code);
