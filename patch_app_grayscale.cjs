const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "className=\"w-full h-full flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-50 text-slate-400\"",
  "className=\"w-full h-full flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-50 grayscale text-slate-400\""
);

code = code.replace(
  "className=\"opacity-50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-left cursor-not-allowed transition-all flex flex-col gap-2 group\"",
  "className=\"opacity-50 grayscale p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-left cursor-not-allowed transition-all flex flex-col gap-2 group\""
);

code = code.replace(
  "className=\"opacity-50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-left cursor-not-allowed transition-all flex flex-col gap-2 group\"",
  "className=\"opacity-50 grayscale p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-left cursor-not-allowed transition-all flex flex-col gap-2 group\""
);

fs.writeFileSync('src/App.tsx', code);
console.log('App grayscale patched');
