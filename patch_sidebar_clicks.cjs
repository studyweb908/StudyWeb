const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardSidebar.tsx', 'utf8');

code = code.replace(
  "disabled={isComingSoon}",
  ""
);

code = code.replace(
  "if (isComingSoon) return;",
  ""
);

code = code.replace(
  "isComingSoon ? 'opacity-60 cursor-not-allowed hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : 'cursor-pointer'",
  "'cursor-pointer'"
);

fs.writeFileSync('src/components/Dashboard/DashboardSidebar.tsx', code);
console.log('Sidebar patched to allow clicks');
