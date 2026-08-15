const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardWidgets.tsx', 'utf8');

code = code.replace(
  "className=\"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-700/50 dark:text-indigo-300/50 text-xs font-bold transition-all cursor-not-allowed w-full opacity-60\"",
  "className=\"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-700/50 dark:text-indigo-300/50 text-xs font-bold transition-all cursor-not-allowed w-full opacity-60 grayscale\""
);

code = code.replace(
  "className=\"flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-not-allowed self-start sm:self-auto opacity-60\"",
  "className=\"flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-not-allowed self-start sm:self-auto opacity-60 grayscale\""
);

fs.writeFileSync('src/components/Dashboard/DashboardWidgets.tsx', code);
console.log('DashboardWidgets grayscale patched');
