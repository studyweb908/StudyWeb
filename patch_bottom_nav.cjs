const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "            <button\n              onClick={() => {\n                setActiveTab('study-planner');\n                setActiveWorkspace(null);\n              }}\n              className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${\n                activeTab === 'study-planner'\n                  ? 'text-indigo-600 dark:text-indigo-400'\n                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'\n              }`}\n            >",
  "            <button\n              disabled\n              className=\"w-full h-full flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-50 text-slate-400\"\n            >"
);

fs.writeFileSync('src/App.tsx', code);
console.log('App patched');
