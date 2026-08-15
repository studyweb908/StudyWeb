const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardSidebar.tsx', 'utf8');

code = code.replace(
  "              <button\n                key={item.id}\n                \n                onClick={() => {\n                  \n                  setActiveTab(item.id);\n                  onClose();\n                }}\n                className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-sm font-semibold transition-all relative isolate group ${\n                  'cursor-pointer'\n                } text-slate-600 dark:text-slate-300`}",
  "              <button\n                key={item.id}\n                disabled={isComingSoon}\n                onClick={() => {\n                  if (isComingSoon) return;\n                  setActiveTab(item.id);\n                  onClose();\n                }}\n                className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-sm font-semibold transition-all relative isolate group ${\n                  isComingSoon ? 'opacity-60 cursor-not-allowed hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'\n                } text-slate-600 dark:text-slate-300`}"
);

fs.writeFileSync('src/components/Dashboard/DashboardSidebar.tsx', code);
console.log('Sidebar reverted');
