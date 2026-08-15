const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardSidebar.tsx', 'utf8');

code = code.replace(
  "isComingSoon ? 'opacity-60 cursor-not-allowed hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'",
  "isComingSoon ? 'opacity-50 grayscale cursor-not-allowed hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'"
);

fs.writeFileSync('src/components/Dashboard/DashboardSidebar.tsx', code);
console.log('Sidebar grayscale patched');
