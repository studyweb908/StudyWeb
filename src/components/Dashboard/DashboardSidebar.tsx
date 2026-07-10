import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  FileText, 
  Layers, 
  Award, 
  Network, 
  FileSpreadsheet, 
  Library, 
  BarChart2, 
  Trophy, 
  ListOrdered, 
  User, 
  Users,
  Clock, 
  Settings, 
  LogOut,
  X,
  HelpCircle
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  isFocusMode?: boolean;
}

export default function DashboardSidebar({ activeTab, setActiveTab, isOpen, onClose, onLogout, isFocusMode = false }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-950/40' },
    { id: 'ai-tutor', label: 'AI Tutor', icon: <Sparkles className="w-4 h-4" />, highlight: true, colorClass: 'text-indigo-600 dark:text-indigo-400', bgClass: 'bg-indigo-50 dark:bg-indigo-950/40' },
    { id: 'pdf-chat', label: 'PDF Chat', icon: <FileSpreadsheet className="w-4 h-4" />, colorClass: 'text-teal-600 dark:text-teal-400', bgClass: 'bg-teal-50 dark:bg-teal-950/40' },
    { id: 'study-session', label: 'Study Session', icon: <Clock className="w-4 h-4" />, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-950/40' },
    { id: 'study-planner', label: 'Study Planner', icon: <Calendar className="w-4 h-4" />, colorClass: 'text-sky-600 dark:text-sky-400', bgClass: 'bg-sky-50 dark:bg-sky-950/40' },
    { id: 'subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" />, colorClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-50 dark:bg-rose-950/40' },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" />, colorClass: 'text-violet-600 dark:text-violet-400', bgClass: 'bg-violet-50 dark:bg-violet-950/40' },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" />, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { id: 'quiz-center', label: 'Quiz Center', icon: <Award className="w-4 h-4" />, colorClass: 'text-yellow-600 dark:text-yellow-400', bgClass: 'bg-yellow-50 dark:bg-yellow-950/40' },
    { id: 'mind-maps', label: 'Mind Maps', icon: <Network className="w-4 h-4" />, colorClass: 'text-fuchsia-600 dark:text-fuchsia-400', bgClass: 'bg-fuchsia-50 dark:bg-fuchsia-950/40' },
    { id: 'resources', label: 'Resources', icon: <Library className="w-4 h-4" />, colorClass: 'text-pink-600 dark:text-pink-400', bgClass: 'bg-pink-50 dark:bg-pink-950/40' },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" />, colorClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-950/40' },
    { id: 'achievements', label: 'Achievements', icon: <Trophy className="w-4 h-4" />, colorClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-950/40' },
    { id: 'leaderboard', label: 'Leaderboard', icon: <ListOrdered className="w-4 h-4" />, colorClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-50 dark:bg-cyan-950/40' },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" />, colorClass: 'text-slate-600 dark:text-slate-400', bgClass: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'parent-dashboard', label: 'Parent Link', icon: <Users className="w-4 h-4" />, colorClass: 'text-cyan-700 dark:text-cyan-300', bgClass: 'bg-cyan-50 dark:bg-cyan-950/40' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800/80">
      {/* Brand Logo Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">StudyWeb</span>
            <span className="block text-[9.5px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Workspace v1.0</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Items (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative isolate group cursor-pointer ${
                isActive 
                  ? 'text-white' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebarTab"
                  className="absolute inset-0 bg-slate-900 dark:bg-black rounded-xl -z-10 shadow-md shadow-slate-950/20 dark:shadow-black/40"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              
              <div className="flex items-center gap-3 relative z-10">
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/15 text-white' 
                    : `${item.bgClass} ${item.colorClass} group-hover:scale-110 group-hover:shadow-sm`
                }`}>
                  {item.icon}
                </span>
                <span className="tracking-tight text-[13px]">{item.label}</span>
              </div>

              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping mr-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Settings & Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="relative group/help">
          <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-help transition-all group-hover/help:scale-100">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover/help:scale-110 transition-all duration-300">
                <HelpCircle className="w-4 h-4" />
              </span>
              <span className="tracking-tight text-[13px]">Shortcuts Help</span>
            </div>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold font-mono">⌘K</span>
          </div>

          {/* Floating Tooltip/Shortcut Panel */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl pointer-events-none opacity-0 scale-95 origin-bottom group-hover/help:opacity-100 group-hover/help:scale-100 transition-all duration-200 z-50">
            <div className="space-y-3">
              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-1.5">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100">Keyboard Shortcuts</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Boost your productivity</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Quick Search</span>
                  <kbd className="px-1.5 py-0.5 text-[9px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 font-mono font-bold shadow-xs">⌘ K</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Study Planner</span>
                  <kbd className="px-1.5 py-0.5 text-[9px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 font-mono font-bold shadow-xs">⌘ P</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Ask AI Tutor</span>
                  <kbd className="px-1.5 py-0.5 text-[9px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 font-mono font-bold shadow-xs">⌘ I</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Secure Logout</span>
                  <kbd className="px-1.5 py-0.5 text-[9px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-rose-600 dark:text-rose-400 font-mono font-bold shadow-xs">⇧ ⌘ L</kbd>
                </div>
              </div>
            </div>
            {/* Little Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-white dark:bg-slate-950 border-r border-b border-slate-200 dark:border-slate-800 rotate-45" />
          </div>
        </div>

        <button
          onClick={() => {
            setActiveTab('profile');
            onClose();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all relative isolate group ${
            activeTab === 'profile' 
              ? 'text-white' 
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
          }`}
        >
          {activeTab === 'profile' && (
            <motion.div
              layoutId="activeSidebarTab"
              className="absolute inset-0 bg-slate-900 dark:bg-black rounded-xl -z-10 shadow-md shadow-slate-950/20 dark:shadow-black/40"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <div className="flex items-center gap-3 relative z-10">
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
              activeTab === 'profile'
                ? 'bg-white/15 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:scale-110'
            }`}>
              <Settings className="w-4 h-4" />
            </span>
            <span className="tracking-tight text-[13px] relative z-10">Settings</span>
          </div>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-all duration-300 group-hover:scale-110">
              <LogOut className="w-4 h-4" />
            </span>
            <span className="tracking-tight text-[13px]">Logout</span>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className={`${isFocusMode ? 'hidden' : 'hidden lg:block'} w-64 h-screen fixed top-0 left-0 z-20`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        />
        
        {/* Slide-out Panel */}
        <div className={`absolute top-0 bottom-0 left-0 w-64 max-w-[80vw] transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
