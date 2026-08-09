const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/AITutorWorkspace.tsx', 'utf8');

code = code.replace(
  "StudyWeb AI is thinking...",
  "Thinking..."
);

code = code.replace(
  "Try asking me about:",
  "Try asking your AI Tutor:"
);

fs.writeFileSync('src/components/Dashboard/AITutorWorkspace.tsx', code);
console.log('Thinking patched');
