const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardWidgets.tsx', 'utf8');

code = code.replace(
  "You haven't uploaded any study materials yet.",
  "No study materials have been added yet. Let's upload something!"
);

code = code.replace(
  "Create Quiz",
  "Generate Quiz"
);

fs.writeFileSync('src/components/Dashboard/DashboardWidgets.tsx', code);
console.log('Widgets copy patched');
