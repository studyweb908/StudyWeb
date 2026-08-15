const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "                    {/* Create Notes */}\n                    <button\n                      onClick={() => {\n                        setIsBottomSheetOpen(false);\n                        setShowQuickNote(true);\n                      }}\n                      className=\"p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 text-left cursor-pointer transition-all flex flex-col gap-2 group active:scale-95\"",
  "                    {/* Create Notes */}\n                    <button\n                      disabled\n                      className=\"opacity-50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-left cursor-not-allowed transition-all flex flex-col gap-2 group\""
);

code = code.replace(
  "                    {/* Quick Scan */}\n                    <button\n                      onClick={() => {\n                        setIsBottomSheetOpen(false);\n                        setShowQuickScan(true);\n                      }}\n                      className=\"p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-pink-50/20 dark:hover:bg-pink-950/20 text-left cursor-pointer transition-all flex flex-col gap-2 group active:scale-95\"",
  "                    {/* Quick Scan */}\n                    <button\n                      disabled\n                      className=\"opacity-50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-left cursor-not-allowed transition-all flex flex-col gap-2 group\""
);

fs.writeFileSync('src/App.tsx', code);
console.log('App bottom sheet patched');
