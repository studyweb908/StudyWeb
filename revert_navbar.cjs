const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceNavbar.tsx', 'utf8');

code = code.replace(
  "              <button\n                key={feat.id}\n                \n                onClick={() => {\n                  \n                  onTabChange(feat.id);\n                }}\n                className={`relative flex flex-col items-start p-4 rounded-2xl transition-all duration-300 border text-left w-full h-full select-none ${\n                  'cursor-pointer active:scale-97'\n                }",
  "              <button\n                key={feat.id}\n                disabled={isComingSoon}\n                onClick={() => {\n                  if (isComingSoon) return;\n                  onTabChange(feat.id);\n                }}\n                className={`relative flex flex-col items-start p-4 rounded-2xl transition-all duration-300 border text-left w-full h-full select-none ${\n                  isComingSoon ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-97'\n                }"
);

fs.writeFileSync('src/components/Dashboard/WorkspaceNavbar.tsx', code);
console.log('Navbar reverted');
