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
  Image
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
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-950' },
    { id: 'ai-tutor', label: 'AI Tutor', icon: <Sparkles className="w-4 h-4" />, highlight: true, colorClass: 'text-indigo-600 dark:text-indigo-400', bgClass: 'bg-indigo-50 dark:bg-indigo-950' },
    { id: 'study-session', label: 'Study Session', icon: <Clock className="w-4 h-4" />, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-950' },
    { id: 'study-planner', label: 'Study Planner', icon: <Calendar className="w-4 h-4" />, colorClass: 'text-sky-600 dark:text-sky-400', bgClass: 'bg-sky-50 dark:bg-sky-950' },
    { id: 'subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" />, colorClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-50 dark:bg-rose-950', comingSoon: true },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" />, colorClass: 'text-violet-600 dark:text-violet-400', bgClass: 'bg-violet-50 dark:bg-violet-950' },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" />, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-950' },
    { id: 'quiz-center', label: 'Quiz Center', icon: <Award className="w-4 h-4" />, colorClass: 'text-yellow-600 dark:text-yellow-400', bgClass: 'bg-yellow-50 dark:bg-yellow-950' },
    { id: 'infographics', label: 'Infographics', icon: <Image className="w-4 h-4" />, colorClass: 'text-teal-600 dark:text-teal-400', bgClass: 'bg-teal-50 dark:bg-teal-950' },
    { id: 'resources', label: 'Resources', icon: <Library className="w-4 h-4" />, colorClass: 'text-pink-600 dark:text-pink-400', bgClass: 'bg-pink-50 dark:bg-pink-950', comingSoon: true },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" />, colorClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-950', comingSoon: true },
    { id: 'achievements', label: 'Achievements', icon: <Trophy className="w-4 h-4" />, colorClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-950', comingSoon: true },
    { id: 'leaderboard', label: 'Leaderboard', icon: <ListOrdered className="w-4 h-4" />, colorClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-50 dark:bg-cyan-950', comingSoon: true },
    { id: 'parent-dashboard', label: 'Parent Link', icon: <Users className="w-4 h-4" />, colorClass: 'text-cyan-700 dark:text-cyan-300', bgClass: 'bg-cyan-50 dark:bg-cyan-950', comingSoon: true },
  ];

  const renderSidebarContent = (layoutIdPrefix: string, forceExpanded = false) => {
    const isCollapsedState = isCollapsed && !forceExpanded;
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800/80">
        {/* Brand Logo Header */}
        <div className={`flex items-center ${isCollapsedState ? 'justify-center py-5 px-0' : 'justify-between px-6 py-5'} border-b border-slate-200 dark:border-slate-800/60`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo.png" alt="StudyWeb Logo" className="w-full h-full object-contain" />
            </div>
            <div className={`${isCollapsedState ? 'hidden' : 'block'}`}>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent truncate block">StudyWeb</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {onToggleCollapse && !forceExpanded && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isCollapsedState ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isCollapsedState ? '' : 'rotate-180'}`} />
              </button>
            )}
            
            <button 
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
          {menuItems.filter(i => !i.comingSoon).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-sm font-semibold relative isolate group cursor-pointer ${
                  isActive 
                    ? 'text-slate-900 dark:text-white' 
                    : 'text-slate-600 dark:text-slate-300'
                }`}
                title={isCollapsedState ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId={`activeSidebarTab-${layoutIdPrefix}`}
                    className="absolute inset-0 bg-slate-100 dark:bg-slate-800/60 rounded-xl -z-10 border border-slate-200/40 dark:border-slate-700/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                <div className="flex items-center gap-3 relative z-10 min-w-0">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${item.bgClass} ${item.colorClass}`}>
                    {item.icon}
                  </span>
                  <span className={`tracking-tight text-[13px] truncate ${isCollapsedState ? 'hidden' : 'block'} ${isActive ? 'font-extrabold' : ''}`}>{item.label}</span>
                </div>

                {item.highlight && !isActive && !isCollapsedState && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping mr-1 shrink-0" />
                )}
              </button>
            );
          })}

          {/* Study Workspaces Navigation Section */}
          <div className="pt-4 pb-2 border-t border-slate-100 dark:border-slate-800/60 mt-4">
            <div className={`px-3 mb-2.5 flex items-center ${isCollapsedState ? 'justify-center' : 'justify-between'}`}>
              <span className={`text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ${isCollapsedState ? 'hidden' : ''}`}>
                <Folder className="w-3.5 h-3.5" />
                <span>Study Workspaces</span>
              </span>
              {isCollapsedState && <Folder className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500" title="Study Workspaces" />}
              <button
                onClick={() => {
                  setActiveWorkspace?.(null);
                  setActiveTab('dashboard');
                  onClose();
                }}
                className={`text-[10px] font-black text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center gap-0.5 ${isCollapsedState ? 'hidden' : ''}`}
                title="Show workspace selector"
              >
                <span>Manage</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {/* Option to view all / clear active workspace */}
              <button
                onClick={() => {
                  setActiveWorkspace?.(null);
                  setActiveTab('dashboard');
                  onClose();
                }}
                className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-sm font-semibold relative isolate group cursor-pointer ${
                  activeWorkspace === null && activeTab === 'dashboard'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
                title="All Workspaces"
              >
                {activeWorkspace === null && activeTab === 'dashboard' && (
                  <motion.div
                    layoutId={`activeSidebarTab-${layoutIdPrefix}`}
                    className="absolute inset-0 bg-slate-100 dark:bg-slate-800/60 rounded-xl -z-10 border border-slate-200/40 dark:border-slate-700/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="flex items-center gap-3 relative z-10 min-w-0">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <span className="text-sm select-none">🗂️</span>
                  </span>
                  <span className={`tracking-tight text-[13px] truncate ${isCollapsedState ? 'hidden' : 'block'} ${activeWorkspace === null && activeTab === 'dashboard' ? 'font-extrabold' : ''}`}>All Workspaces</span>
                </div>
              </button>

              {/* List existing workspaces */}
              {workspaces.map((ws) => {
                const isSelected = activeWorkspace?.id === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace?.(ws);
                      setActiveTab('dashboard');
                      onClose();
                    }}
                    className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-sm font-semibold relative isolate group cursor-pointer ${
                      isSelected
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                    title={ws.name}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId={`activeSidebarTab-${layoutIdPrefix}`}
                        className="absolute inset-0 bg-slate-100 dark:bg-slate-800/60 rounded-xl -z-10 border border-slate-200/40 dark:border-slate-700/30"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="flex items-center gap-3 relative z-10 min-w-0">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <span className="text-sm select-none">{ws.emoji || '🧬'}</span>
                      </span>
                      <span className={`tracking-tight text-[13px] truncate ${isCollapsedState ? 'hidden' : 'block'} ${isSelected ? 'font-extrabold' : ''}`}>{ws.name}</span>
                    </div>
                    
                    {isSelected && !isCollapsedState && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0 ml-1 relative z-10" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {menuItems.some(i => i.comingSoon) && !isCollapsedState && (
            <div className="pt-4 pb-1">
              <span className="px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Coming Soon</span>
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
                className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-sm font-semibold transition-all relative isolate group ${
                  isComingSoon ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                } text-slate-600 dark:text-slate-300`}
                title={isCollapsedState ? `${item.label} (Coming Soon)` : undefined}
              >
                <div className="flex items-center gap-3 relative z-10 min-w-0">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${item.bgClass} ${item.colorClass}`}>
                    {item.icon}
                  </span>
                  <span className={`tracking-tight text-[13px] truncate ${isCollapsedState ? 'hidden' : 'block'}`}>{item.label}</span>
                </div>

                {!isCollapsedState && (
                  <span className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mr-1 shrink-0">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer / Settings & Logout */}
        <div className={`p-4 border-t border-slate-200 dark:border-slate-800/60 space-y-1.5 bg-slate-50 dark:bg-slate-900 flex flex-col ${isCollapsedState ? 'items-center' : ''}`}>
          <button
            onClick={() => {
              setActiveTab('profile');
              onClose();
            }}
            className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-sm font-semibold cursor-pointer relative isolate group ${
              activeTab === 'profile' 
                ? 'text-slate-900 dark:text-white' 
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Settings"
          >
            {activeTab === 'profile' && (
              <motion.div
                layoutId={`activeSidebarTab-${layoutIdPrefix}`}
                className="absolute inset-0 bg-slate-100 dark:bg-slate-800/60 rounded-xl -z-10 border border-slate-200/40 dark:border-slate-700/30"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <div className="flex items-center gap-3 relative z-10 min-w-0">
              <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                <Settings className="w-4 h-4" />
              </span>
              <span className={`tracking-tight text-[13px] relative z-10 truncate ${isCollapsedState ? 'hidden' : 'block'} ${activeTab === 'profile' ? 'font-extrabold' : ''}`}>Settings</span>
            </div>
          </button>

          <button
            onClick={onLogout}
            className={`w-full flex items-center ${isCollapsedState ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 cursor-pointer group`}
            title="Logout"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
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
          className="absolute inset-0 bg-black/60" 
        />
        
        {/* Slide-out Panel */}
        <div className={`absolute top-0 bottom-0 left-0 w-64 max-w-[80vw] transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {renderSidebarContent('mobile', true)}
        </div>
      </div>
    </>
  );
}
