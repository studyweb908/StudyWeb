const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardHome.tsx', 'utf8');

code = code.replace(
  "<span>Start Studying Smarter Today</span>",
  "<span>Ask AI Tutor</span>"
);

fs.writeFileSync('src/components/Dashboard/DashboardHome.tsx', code);
console.log('DashboardHome copy patched');
