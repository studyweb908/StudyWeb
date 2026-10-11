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
  Plus,
  Folder,
  ChevronRight,
  Image,
} from 'lucide-react';
import { Workspace } from './WorkspaceTypes';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  isFocusMode?: boolean;
  workspaces?: Workspace[];
  activeWorkspace?: Workspace | null;
  setActiveWorkspace?: (workspace: Workspace | null) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function DashboardSidebar({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  onClose, 
  onLogout, 
  isFocusMode = false,
  workspaces = [],
  activeWorkspace = null,
  setActiveWorkspace,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const menuItems = [
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
  ];

  const renderSidebarContent = (layoutIdPrefix: string, forceExpanded = false) => {
    const isCollapsedState = isCollapsed && !forceExpanded;
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#0E1528] text-slate-800 dark:text-slate-100 border-r border-[#E2E8F0] dark:border-slate-800 selection:bg-[#5145F5] selection:text-white shadow-xs">
        {/* Brand Logo Header */}
        <div className={`flex items-center ${isCollapsedState ? 'justify-center py-4 px-2' : 'justify-between px-4 sm:px-5 py-4'} border-b border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#0E1528]`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center shrink-0">
              <img 
                src="/logo.png" 
                alt="StudyWeb Logo" 
                className={`${isCollapsedState ? 'h-9 w-9' : 'h-10 w-auto max-w-[42px]'} object-contain dark:invert transition-all`} 
              />
            </div>
            <div className={`${isCollapsedState ? 'hidden' : 'block'} min-w-0`}>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[17px] tracking-tight text-[#151D3B] dark:text-white">StudyWeb</span>
              </div>
              <p className="text-[10.5px] font-medium text-[#69779C] dark:text-[#7E8DAF] tracking-wide truncate">
                From Confusion to Clarity
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {onToggleCollapse && !forceExpanded && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isCollapsedState ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isCollapsedState ? '' : 'rotate-180'}`} />
              </button>
            )}
            
            <button 
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {menuItems.filter(i => !i.comingSoon).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3.5'} py-2.5 rounded-xl text-sm font-semibold relative isolate group cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? 'text-white' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
                title={isCollapsedState ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId={`activeSidebarTab-${layoutIdPrefix}`}
                    className="absolute inset-0 bg-[#5145F5] rounded-xl -z-10 shadow-md shadow-[#5145F5]/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                <div className="flex items-center gap-3 relative z-10 min-w-0 flex-1">
                  <span className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-[#5145F5] dark:group-hover:text-white group-hover:bg-indigo-50 dark:group-hover:bg-slate-700'
                  }`}>
                    {item.icon}
                  </span>
                  <span className={`tracking-tight text-[13px] truncate ${isCollapsedState ? 'hidden' : 'block'} ${isActive ? 'font-bold text-white' : ''}`}>
                    {item.label}
                  </span>
                </div>

                {item.highlight && !isCollapsedState && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive 
                      ? 'bg-white/25 text-white border border-white/30' 
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800'
                  }`}>
                    AI
                  </span>
                )}
              </button>
            );
          })}

          {menuItems.some(i => i.comingSoon) && !isCollapsedState && (
            <div className="pt-4 pb-1">
              <span className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Features</span>
            </div>
          )}

          {menuItems.filter(i => i.comingSoon).map((item) => {
            const isComingSoon = (item as any).comingSoon;
            return (
              <button
                key={item.id}
                disabled={isComingSoon}
                onClick={() => {
                  if (isComingSoon) return;
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3.5'} py-2 rounded-xl text-sm font-medium transition-all relative isolate group ${
                  isComingSoon ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'
                } text-slate-500 dark:text-slate-400`}
                title={isCollapsedState ? `${item.label} (Coming Soon)` : undefined}
              >
                <div className="flex items-center gap-3 relative z-10 min-w-0">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                    {item.icon}
                  </span>
                  <span className={`tracking-tight text-[12.5px] truncate ${isCollapsedState ? 'hidden' : 'block'}`}>{item.label}</span>
                </div>

                {!isCollapsedState && (
                  <span className="text-[9px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mr-1 shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer / Settings & Logout */}
        <div className={`p-3.5 border-t border-[#E2E8F0] dark:border-slate-800 space-y-1 bg-slate-50/70 dark:bg-[#0B1020]/80 flex flex-col ${isCollapsedState ? 'items-center' : ''}`}>
          <button
            onClick={() => {
              setActiveTab('profile');
              onClose();
            }}
            className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2 rounded-xl text-sm font-medium cursor-pointer relative isolate group transition-colors ${
              activeTab === 'profile' 
                ? 'bg-[#5145F5] text-white shadow-md shadow-[#5145F5]/25 font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 shadow-none hover:shadow-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
            }`}
            title="Settings"
          >
            <div className="flex items-center gap-3 relative z-10 min-w-0">
              <span className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-[#5145F5] dark:group-hover:text-white'
              }`}>
                <Settings className="w-4 h-4" />
              </span>
              <span className={`tracking-tight text-[13px] relative z-10 truncate ${isCollapsedState ? 'hidden' : 'block'}`}>Settings</span>
            </div>
          </button>

          <button
            onClick={onLogout}
            className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer group`}
            title="Logout"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 shrink-0 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40">
                <LogOut className="w-4 h-4" />
              </span>
              <span className={`tracking-tight text-[13px] truncate ${isCollapsedState ? 'hidden' : 'block'}`}>Logout</span>
            </div>
          </button>
        </div>
      </div>
    );
  };

  const widthClass = isCollapsed ? 'md:w-20' : 'md:w-64';

  return (
    <>
      {/* Desktop/Tablet Permanent Sidebar */}
      <aside className={`${isFocusMode ? 'hidden' : 'hidden md:block'} ${widthClass} h-full fixed top-0 left-0 z-20 transition-all duration-300`}>
        {renderSidebarContent('desktop')}
      </aside>

      {/* Mobile Drawer Sidebar */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        />
        
        {/* Slide-out Panel */}
        <div className={`absolute top-0 bottom-0 left-0 w-72 max-w-[85vw] shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {renderSidebarContent('mobile', true)}
        </div>
      </div>
    </>
  );
}
