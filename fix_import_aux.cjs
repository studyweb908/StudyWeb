const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/AuxiliaryViews.tsx', 'utf8');

code = code.replace("import ComingSoon from './ComingSoon';\n\nexport function StudyPlannerView", "export function StudyPlannerView");

if (!code.includes("import ComingSoon")) {
  code = "import ComingSoon from './ComingSoon';\n" + code;
}

fs.writeFileSync('src/components/Dashboard/AuxiliaryViews.tsx', code);
console.log('Fixed imports in AuxiliaryViews.tsx');
