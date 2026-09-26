import fs from 'fs';

let code = fs.readFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', 'utf8');

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

code = code.replace(
  /export default function WorkspaceLibrary\(\{ workspace, onAddFile, onRemoveFile, onClearAllFiles, onUpdateWorkspace \}: WorkspaceLibraryProps\) \{/,
  `export default function WorkspaceLibrary({ workspace, onAddFile, onRemoveFile, onClearAllFiles, onUpdateWorkspace }: WorkspaceLibraryProps) {${helperStr}`
);

const fetch1 = `const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          userId: 'local-user',
          name: title,
          type: 'doc',
          size: 'Pasted Document',
          content: driveCopyText
        })
      });`;

const newFetch1 = `const { token, userId } = await getAuthInfo();
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          userId: userId,
          name: title,
          type: 'doc',
          size: 'Pasted Document',
          content: driveCopyText
        })
      });`;
      
code = code.replace(fetch1, newFetch1);

const fetch2 = `const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          userId: 'local-user',
          name,
          type,
          size,
          url,
          fileBase64,
          fileMimeType
        })
      });`;

const newFetch2 = `const { token, userId } = await getAuthInfo();
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          userId: userId,
          name,
          type,
          size,
          url,
          fileBase64,
          fileMimeType
        })
      });`;

code = code.replace(fetch2, newFetch2);

// Update status polling to include auth
code = code.replace(
  /const statusRes = await fetch\(\`\/api\/knowledge\/status\/\$\{documentId\}\`\);/g,
  `const { token } = await getAuthInfo();
        const statusRes = await fetch(\`/api/knowledge/status/\${documentId}\`, {
          headers: { ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) }
        });`
);

fs.writeFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', code);
