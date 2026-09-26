const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', 'utf8');

// Insert a helper function at the top of WorkspaceLibrary component
const helperStr = `
  const getAuthInfo = async () => {
    let token = undefined;
    let userId = 'local-user';
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        token = session.access_token;
        userId = session.user.id;
      }
    }
    return { token, userId };
  };
`;

// Insert the helper at the beginning of the component
code = code.replace(
  /export default function WorkspaceLibrary\(\{[^}]+\}: WorkspaceLibraryProps\) \{/,
  `$&${helperStr}`
);

// Update first fetch (around line 192)
code = code.replace(
  /const response = await fetch\('\/api\/knowledge\/upload', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON.stringify\(\{([^}]+)\}\)\s*\}\);/,
  `
      const { token, userId } = await getAuthInfo();
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
        },
        body: JSON.stringify({$1})
      });
  `.replace('$1', (match, p1) => {
    return p1.replace(/userId:\s*'local-user'/, 'userId');
  })
);

// We should also replace the string manually to avoid complex regex logic
fs.writeFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', code);
