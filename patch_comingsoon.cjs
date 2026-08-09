const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/ComingSoon.tsx', 'utf8');

code = code.replace(
  "className={\\`flex",
  "className={`flex"
);

code = code.replace(
  "hover:shadow-md'\\n            }\\`}",
  "hover:shadow-md'\n            }`}"
);

fs.writeFileSync('src/components/Dashboard/ComingSoon.tsx', code);
console.log('ComingSoon patched');
