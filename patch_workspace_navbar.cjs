const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceNavbar.tsx', 'utf8');

const targetStr = `  const subFeatures = [
    { id: 'overview' as const, label: 'Overview', icon: Layout, desc: 'Progress & Stats' },
    { id: 'library' as const, label: 'Upload Material', icon: Files, desc: 'Add files & links', badge: fileCount },
    { id: 'notes' as const, label: 'Notes', icon: Edit3, desc: 'Notebook draft', badge: noteCount },
    { id: 'flashcards' as const, label: 'Flashcards', icon: BrainCircuit, desc: 'Leitner system', badge: flashcardCount },
    { id: 'chat' as const, label: 'AI Tutor', icon: MessageSquare, desc: 'Interactive help' },
    { id: 'quiz' as const, label: 'Quizzes', icon: Award, desc: 'Practice exam', badge: quizCount },
  ];`;

const replacement = `  const subFeatures = [
    { id: 'overview' as const, label: 'Overview', icon: Layout, desc: 'Progress & Stats' },
    { id: 'library' as const, label: 'Upload Material', icon: Files, desc: 'Add files & links', badge: fileCount },
    { id: 'chat' as const, label: 'AI Tutor', icon: MessageSquare, desc: 'Interactive help' },
    { id: 'notes' as const, label: 'Notes', icon: Edit3, desc: 'Notebook draft', badge: noteCount, comingSoon: true },
    { id: 'flashcards' as const, label: 'Flashcards', icon: BrainCircuit, desc: 'Leitner system', badge: flashcardCount, comingSoon: true },
    { id: 'quiz' as const, label: 'Quizzes', icon: Award, desc: 'Practice exam', badge: quizCount, comingSoon: true },
  ];`;

code = code.replace(targetStr, replacement);

const buttonTarget = `            return (
              <button
                key={feat.id}
                onClick={() => onTabChange(feat.id)}
                className={\`relative flex flex-col items-start p-4 rounded-2xl transition-all duration-300 border cursor-pointer text-left w-full h-full active:scale-97 select-none \${
                  isSelected
                    ? \`\${theme.activeBg}\`
                    : \`bg-slate-50/50 dark:bg-slate-900/40 border-slate-100/80 dark:border-slate-800/60 text-slate-650 dark:text-slate-400 \${theme.hoverBg}\`
                }\`}
              >`;

const buttonReplacement = `            const isComingSoon = (feat as any).comingSoon;
            return (
              <button
                key={feat.id}
                disabled={isComingSoon}
                onClick={() => {
                  if (isComingSoon) return;
                  onTabChange(feat.id);
                }}
                className={\`relative flex flex-col items-start p-4 rounded-2xl transition-all duration-300 border text-left w-full h-full select-none \${
                  isComingSoon ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-97'
                } \${
                  isSelected
                    ? \`\${theme.activeBg}\`
                    : \`bg-slate-50/50 dark:bg-slate-900/40 border-slate-100/80 dark:border-slate-800/60 text-slate-650 dark:text-slate-400 \${isComingSoon ? '' : theme.hoverBg}\`
                }\`}
              >`;

code = code.replace(buttonTarget, buttonReplacement);

fs.writeFileSync('src/components/Dashboard/WorkspaceNavbar.tsx', code);
console.log("Patched Workspace Navbar");
