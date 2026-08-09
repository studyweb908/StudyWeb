const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardWidgets.tsx', 'utf8');

if (!code.includes('Layout,')) {
  code = code.replace('import { ', 'import { Layout, ');
}

fs.writeFileSync('src/components/Dashboard/DashboardWidgets.tsx', code);
console.log("Patched Layout import");
