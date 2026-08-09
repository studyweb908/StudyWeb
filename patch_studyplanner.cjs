const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/AuxiliaryViews.tsx', 'utf8');

const startIdx = code.indexOf('export function StudyPlannerView() {');
const endIdx = code.indexOf('export function SubjectsView() {');

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `import ComingSoon from './ComingSoon';\n\nexport function StudyPlannerView() {\n  return (\n    <ComingSoon \n      title="Study Planner" \n      description="Schedule builder, task management, and exam date tracking are currently under construction." \n    />\n  );\n}\n\n// ==========================================\n// 2. SUBJECTS OVERVIEW VIEW\n// ==========================================\n`;
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('src/components/Dashboard/AuxiliaryViews.tsx', code);
  console.log('Patched AuxiliaryViews.tsx');
} else {
  console.log('Could not find indices');
}
