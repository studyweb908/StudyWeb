const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardHome.tsx', 'utf8');

code = code.replace(
  "className=\"px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-not-allowed shadow-sm w-full sm:w-auto shrink-0 opacity-60\"",
  "className=\"px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-not-allowed shadow-sm w-full sm:w-auto shrink-0 opacity-60 grayscale\""
);

fs.writeFileSync('src/components/Dashboard/DashboardHome.tsx', code);
console.log('DashboardHome grayscale patched');
