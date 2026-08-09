const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardSidebar.tsx', 'utf8');

const targetStr = `  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-4 h-4" />, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-950' },
    { id: 'workspaces', label: 'Workspaces', icon: <Folder className="w-4 h-4" />, colorClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-950' },
    { id: 'ai-tutor', label: 'Your AI Tutor', icon: <Sparkles className="w-4 h-4" />, highlight: true, colorClass: 'text-indigo-600 dark:text-indigo-400', bgClass: 'bg-indigo-50 dark:bg-indigo-950' },
    { id: 'study-session', label: 'Study Session', icon: <Clock className="w-4 h-4" />, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-950' },
    { id: 'study-planner', label: 'Study Planner', icon: <Calendar className="w-4 h-4" />, colorClass: 'text-sky-600 dark:text-sky-400', bgClass: 'bg-sky-50 dark:bg-sky-950' },
    { id: 'subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" />, colorClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-50 dark:bg-rose-950', comingSoon: true },
    { id: 'notes', label: 'Your AI Study Notes', icon: <FileText className="w-4 h-4" />, colorClass: 'text-violet-600 dark:text-violet-400', bgClass: 'bg-violet-50 dark:bg-violet-950' },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" />, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-950' },
    { id: 'quiz-center', label: 'Create Practice Quizzes', icon: <Award className="w-4 h-4" />, colorClass: 'text-yellow-600 dark:text-yellow-400', bgClass: 'bg-yellow-50 dark:bg-yellow-950' },
    { id: 'resources', label: 'Resources', icon: <Library className="w-4 h-4" />, colorClass: 'text-pink-600 dark:text-pink-400', bgClass: 'bg-pink-50 dark:bg-pink-950', comingSoon: true },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" />, colorClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-950', comingSoon: true },
    { id: 'achievements', label: 'Achievements', icon: <Trophy className="w-4 h-4" />, colorClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-950', comingSoon: true },
    { id: 'leaderboard', label: 'Leaderboard', icon: <ListOrdered className="w-4 h-4" />, colorClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-50 dark:bg-cyan-950', comingSoon: true },
    { id: 'parent-dashboard', label: 'Parent Link', icon: <Users className="w-4 h-4" />, colorClass: 'text-cyan-700 dark:text-cyan-300', bgClass: 'bg-cyan-50 dark:bg-cyan-950', comingSoon: true },
  ];`;

const replacement = `  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-4 h-4" />, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-950' },
    { id: 'workspaces', label: 'Workspaces', icon: <Folder className="w-4 h-4" />, colorClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-950' },
    { id: 'ai-tutor', label: 'Your AI Tutor', icon: <Sparkles className="w-4 h-4" />, highlight: true, colorClass: 'text-indigo-600 dark:text-indigo-400', bgClass: 'bg-indigo-50 dark:bg-indigo-950' },
    { id: 'subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" />, colorClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-50 dark:bg-rose-950', comingSoon: true },
    { id: 'study-session', label: 'Study Session', icon: <Clock className="w-4 h-4" />, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-950', comingSoon: true },
    { id: 'study-planner', label: 'Study Planner', icon: <Calendar className="w-4 h-4" />, colorClass: 'text-sky-600 dark:text-sky-400', bgClass: 'bg-sky-50 dark:bg-sky-950', comingSoon: true },
    { id: 'notes', label: 'Your AI Study Notes', icon: <FileText className="w-4 h-4" />, colorClass: 'text-violet-600 dark:text-violet-400', bgClass: 'bg-violet-50 dark:bg-violet-950', comingSoon: true },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" />, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-950', comingSoon: true },
    { id: 'quiz-center', label: 'Create Practice Quizzes', icon: <Award className="w-4 h-4" />, colorClass: 'text-yellow-600 dark:text-yellow-400', bgClass: 'bg-yellow-50 dark:bg-yellow-950', comingSoon: true },
    { id: 'resources', label: 'Resources', icon: <Library className="w-4 h-4" />, colorClass: 'text-pink-600 dark:text-pink-400', bgClass: 'bg-pink-50 dark:bg-pink-950', comingSoon: true },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" />, colorClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-950', comingSoon: true },
    { id: 'achievements', label: 'Achievements', icon: <Trophy className="w-4 h-4" />, colorClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-950', comingSoon: true },
    { id: 'leaderboard', label: 'Leaderboard', icon: <ListOrdered className="w-4 h-4" />, colorClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-50 dark:bg-cyan-950', comingSoon: true },
    { id: 'parent-dashboard', label: 'Parent Link', icon: <Users className="w-4 h-4" />, colorClass: 'text-cyan-700 dark:text-cyan-300', bgClass: 'bg-cyan-50 dark:bg-cyan-950', comingSoon: true },
  ];`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/components/Dashboard/DashboardSidebar.tsx', code);
  console.log('Sidebar patched successfully');
} else {
  console.log('Target string not found in sidebar');
}
