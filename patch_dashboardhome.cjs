const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardHome.tsx', 'utf8');

code = code.replace(
  "onClick={() => setActiveTab('study-session')}",
  "disabled"
);
code = code.replace(
  "className=\"px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full sm:w-auto shrink-0\"",
  "className=\"px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-not-allowed shadow-sm w-full sm:w-auto shrink-0 opacity-60\""
);

fs.writeFileSync('src/components/Dashboard/DashboardHome.tsx', code);
console.log('DashboardHome patched');
