const fs = require('fs');

function parseJSX() {
  // We can just regex out the divs of ProfileView to count their children
  const code = fs.readFileSync('src/components/Dashboard/AuxiliaryViews.tsx', 'utf8');
  let start = code.indexOf('export function ProfileView');
  let end = code.indexOf('export function ParentDashboardView');
  let profileCode = code.substring(start, end);
  
  // Just print the div structure
  let divDepth = 0;
  let currentLine = 0;
  let lines = profileCode.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let opens = (line.match(/<div/g) || []).length;
    let closes = (line.match(/<\/div>/g) || []).length;
    
    if (opens > 0 || closes > 0) {
      if (closes > opens) divDepth -= (closes - opens);
      
      console.log('  '.repeat(divDepth) + line.trim());
      
      if (opens > closes) divDepth += (opens - closes);
    }
  }
}
parseJSX();
