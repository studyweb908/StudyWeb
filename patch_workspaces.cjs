const fs = require('fs');

['WorkspaceNotebook.tsx', 'WorkspaceFlashcards.tsx', 'WorkspaceQuiz.tsx'].forEach(file => {
  const path = 'src/components/Dashboard/' + file;
  let code = fs.readFileSync(path, 'utf8');
  
  if (!code.includes('import ComingSoon')) {
    code = "import ComingSoon from './ComingSoon';\n" + code;
  }
  
  let componentName = file.replace('.tsx', '');
  let title = componentName === 'WorkspaceNotebook' ? 'AI Notes' :
              componentName === 'WorkspaceFlashcards' ? 'AI Study Notes & Flashcards' :
              'Practice Quiz Cards';
              
  let description = "This AI-powered workspace feature is currently under construction.";
  
  // Replace the entire component with a ComingSoon component
  const startIdx = code.indexOf(`export default function ${componentName}`);
  if (startIdx !== -1) {
    const endOfDecl = code.indexOf('{', startIdx);
    const newComponent = `export default function ${componentName}(props: any) {\n  return <ComingSoon title="${title}" description="${description}" />;\n}\n`;
    code = code.substring(0, startIdx) + newComponent;
  }
  
  fs.writeFileSync(path, code);
  console.log(`Patched ${file}`);
});
