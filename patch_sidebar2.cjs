const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardSidebar.tsx', 'utf8');

code = code.replace(
  "Coming Soon</span>",
  "In Development</span>"
);

code = code.replace(
  "opacity-40 cursor-not-allowed",
  "opacity-60 cursor-not-allowed hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
);

code = code.replace(
  "Soon   ",
  "Dev   "
);

fs.writeFileSync('src/components/Dashboard/DashboardSidebar.tsx', code);
console.log('Sidebar patched again');
