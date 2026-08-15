const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceNavbar.tsx', 'utf8');

code = code.replace(
  "isComingSoon ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-97'",
  "isComingSoon ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer active:scale-97'"
);

fs.writeFileSync('src/components/Dashboard/WorkspaceNavbar.tsx', code);
console.log('WorkspaceNavbar grayscale patched');
