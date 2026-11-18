import React from 'react';
import { motion } from 'motion/react';

import { 
  LayoutDashboard, 
  Sparkles, 
  Calendar, 
  BookOpen, 
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
  Camera,
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
  onOpenScanner?: () => void;
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
  onToggleCollapse,
  onOpenScanner
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-4 h-4" />, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-950' },
    { id: 'workspaces', label: 'Workspaces', icon: <Folder className="w-4 h-4" />, colorClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-950' },
    { id: 'ai-tutor', label: 'Your AI Tutor', icon: <Sparkles className="w-4 h-4" />, highlight: true, colorClass: 'text-indigo-600 dark:text-indigo-400', bgClass: 'bg-indigo-50 dark:bg-indigo-950' },
    { id: 'scan-notes', label: 'Scan Notes', icon: <Camera className="w-4 h-4" />, colorClass: 'text-pink-600 dark:text-pink-400', bgClass: 'bg-pink-50 dark:bg-pink-950' },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" />, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-950', comingSoon: true },
    { id: 'quiz-center', label: 'Practice', icon: <Award className="w-4 h-4" />, colorClass: 'text-yellow-600 dark:text-yellow-400', bgClass: 'bg-yellow-50 dark:bg-yellow-950', comingSoon: true },
    { id: 'study-session', label: 'Study Session', icon: <Clock className="w-4 h-4" />, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-950', comingSoon: true },
    { id: 'study-planner', label: 'Study Planner', icon: <Calendar className="w-4 h-4" />, colorClass: 'text-sky-600 dark:text-sky-400', bgClass: 'bg-sky-50 dark:bg-sky-950', comingSoon: true },
    { id: 'subjects', label: 'Study Subject', icon: <BookOpen className="w-4 h-4" />, colorClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-50 dark:bg-rose-950', comingSoon: true },
    { id: 'resources', label: 'Resources', icon: <Library className="w-4 h-4" />, colorClass: 'text-pink-600 dark:text-pink-400', bgClass: 'bg-pink-50 dark:bg-pink-950', comingSoon: true },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" />, colorClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-950', comingSoon: true },
    { id: 'leaderboard', label: 'Leaderboard', icon: <ListOrdered className="w-4 h-4" />, colorClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-50 dark:bg-cyan-950', comingSoon: true },
    { id: 'parent-dashboard', label: 'Parent Link', icon: <Users className="w-4 h-4" />, colorClass: 'text-cyan-700 dark:text-cyan-300', bgClass: 'bg-cyan-50 dark:bg-cyan-950', comingSoon: true },
  ];

  const renderSidebarContent = (_layoutIdPrefix: string, forceExpanded = false) => {
    const isCollapsedState = isCollapsed && !forceExpanded;
    return (
      <div className="flex flex-col h-full w-full overflow-hidden transform-gpu will-change-transform bg-white dark:bg-[#0E1528] text-slate-800 dark:text-slate-100 border-r border-[#E2E8F0] dark:border-slate-800 selection:bg-[#5145F5] selection:text-white shadow-xs">
        {/* Brand Logo Header - Fixed height to prevent vertical layout shifts */}
        <div
          className={`h-16 shrink-0 flex items-center justify-between ${
            isCollapsedState ? 'px-2.5' : 'px-4'
          } border-b border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#0E1528] overflow-hidden`}
        >
          <div className="flex items-center min-w-0 overflow-hidden">
            <img 
              src="/logo-inner.png" 
              alt="StudyWeb Logo" 
              className="w-8 h-8 object-contain select-none shrink-0 transform-gpu transition-transform duration-200" 
            />
            <div
              className={`min-w-0 overflow-hidden whitespace-nowrap transform-gpu will-change-transform transition-[opacity,transform,max-width,margin] duration-200 ease-out ${
                isCollapsedState
                  ? '-translate-x-3 opacity-0 max-w-0 ml-0 pointer-events-none'
                  : 'translate-x-0 opacity-100 max-w-[160px] ml-2.5'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[16px] leading-tight tracking-tight text-[#151D3B] dark:text-white truncate">
                  StudyWeb
                </span>
              </div>
              <p className="text-[10px] font-medium text-[#69779C] dark:text-[#7E8DAF] tracking-wide truncate">
                From Confusion to Clarity
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center shrink-0">
            {onToggleCollapse && !forceExpanded && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex items-center justify-center w-6 h-6 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title={isCollapsedState ? "Expand Sidebar" : "Collapse Sidebar"}
                aria-label={isCollapsedState ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <ChevronRight className={`w-4 h-4 transform-gpu transition-transform duration-200 ${isCollapsedState ? 'rotate-0' : 'rotate-180'}`} />
              </button>
            )}
            
            <button 
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav Items (Scrollable) */}
        <div
          data-tour="nav-sidebar-overview"
          className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-1 custom-scrollbar"
        >
          {menuItems.filter(i => !i.comingSoon).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                data-tour={`nav-${item.id}`}
                onClick={() => {
                  if (item.id === 'scan-notes') {
                    onClose();
                    if (onOpenScanner) {
                      onOpenScanner();
                    } else {
                      window.dispatchEvent(new CustomEvent('studyweb-open-camera-scanner'));
                    }
                    return;
                  }
                  if (item.id === 'workspaces' && setActiveWorkspace) {
                    setActiveWorkspace(null);
                  }
                  if (item.id === 'ai-tutor' && !activeWorkspace && workspaces && workspaces.length > 0 && setActiveWorkspace) {
                    setActiveWorkspace(workspaces[0]);
                  }
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full h-10 flex items-center ${
                  isCollapsedState ? 'justify-center px-0' : 'justify-start px-2.5'
                } rounded-xl text-sm font-semibold relative group cursor-pointer overflow-hidden whitespace-nowrap transition-colors duration-200 ${
                  isActive 
                    ? 'bg-[#5145F5] text-white shadow-sm shadow-[#5145F5]/25' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
                title={isCollapsedState ? item.label : undefined}
              >
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors duration-200 ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-[#5145F5] dark:group-hover:text-white group-hover:bg-indigo-50 dark:group-hover:bg-slate-700'
                }`}>
                  {item.icon}
                </span>

                <div
                  className={`flex items-center justify-between min-w-0 overflow-hidden transform-gpu will-change-transform transition-[opacity,transform,max-width,margin] duration-200 ease-out ${
                    isCollapsedState
                      ? '-translate-x-2 opacity-0 max-w-0 ml-0 pointer-events-none'
                      : 'translate-x-0 opacity-100 flex-1 max-w-full ml-2.5'
                  }`}
                >
                  <span className={`tracking-tight text-[13px] truncate ${isActive ? 'font-bold text-white' : ''}`}>
                    {item.label}
                  </span>

                  {item.highlight && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${
                      isActive 
                        ? 'bg-white/25 text-white border border-white/30' 
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800'
                    }`}>
                      AI
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {menuItems.some(i => i.comingSoon) && (
            <div className="h-7 flex items-center px-2 overflow-hidden shrink-0">
              {isCollapsedState ? (
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              ) : (
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate transform-gpu transition-opacity duration-200">
                  Coming Soon
                </span>
              )}
            </div>
          )}

          {menuItems.filter(i => i.comingSoon).map((item) => {
            return (
              <button
                key={item.id}
                disabled={true}
                onClick={(e) => {
                  e.preventDefault();
                }}
                className={`w-full h-9 flex items-center ${
                  isCollapsedState ? 'justify-center px-0' : 'justify-start px-2.5'
                } rounded-xl text-sm font-medium relative group opacity-55 grayscale cursor-not-allowed text-slate-500 dark:text-slate-400 select-none overflow-hidden whitespace-nowrap`}
                title={isCollapsedState ? `${item.label} (Coming Soon)` : `${item.label} — Coming Soon`}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                  {item.icon}
                </span>

                <div
                  className={`flex items-center justify-between min-w-0 overflow-hidden transform-gpu will-change-transform transition-[opacity,transform,max-width,margin] duration-200 ease-out ${
                    isCollapsedState
                      ? '-translate-x-2 opacity-0 max-w-0 ml-0 pointer-events-none'
                      : 'translate-x-0 opacity-100 flex-1 max-w-full ml-2.5'
                  }`}
                >
                  <span className="tracking-tight text-[12px] truncate">{item.label}</span>
                  <span className="text-[9px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-1.5">
                    Soon
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer / Settings & Logout */}
        <div className="p-2.5 border-t border-[#E2E8F0] dark:border-slate-800 space-y-1 bg-slate-50/70 dark:bg-[#0B1020]/80 flex flex-col shrink-0 overflow-hidden">
          <button
            onClick={() => {
              setActiveTab('profile');
              onClose();
            }}
            className={`w-full h-10 flex items-center ${
              isCollapsedState ? 'justify-center px-0' : 'justify-start px-2.5'
            } rounded-xl text-sm font-medium cursor-pointer relative group overflow-hidden whitespace-nowrap transition-colors duration-200 ${
              activeTab === 'profile' 
                ? 'bg-[#5145F5] text-white shadow-sm shadow-[#5145F5]/25 font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
            }`}
            title="Settings"
          >
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors duration-200 ${
              activeTab === 'profile'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-[#5145F5] dark:group-hover:text-white'
            }`}>
              <Settings className="w-4 h-4" />
            </span>
            <span
              className={`tracking-tight text-[13px] truncate transform-gpu will-change-transform transition-[opacity,transform,max-width,margin] duration-200 ease-out ${
                isCollapsedState
                  ? '-translate-x-2 opacity-0 max-w-0 ml-0 pointer-events-none'
                  : 'translate-x-0 opacity-100 max-w-full ml-2.5'
              }`}
            >
              Settings
            </span>
          </button>

          <button
            onClick={onLogout}
            className={`w-full h-10 flex items-center ${
              isCollapsedState ? 'justify-center px-0' : 'justify-start px-2.5'
            } rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors duration-200 cursor-pointer group overflow-hidden whitespace-nowrap`}
            title="Logout"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 shrink-0 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors duration-200">
              <LogOut className="w-4 h-4" />
            </span>
            <span
              className={`tracking-tight text-[13px] truncate transform-gpu will-change-transform transition-[opacity,transform,max-width,margin] duration-200 ease-out ${
                isCollapsedState
                  ? '-translate-x-2 opacity-0 max-w-0 ml-0 pointer-events-none'
                  : 'translate-x-0 opacity-100 max-w-full ml-2.5'
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </div>
    );
  };

  const widthClass = isCollapsed ? 'md:w-20' : 'md:w-64';

  return (
    <div className="overflow-hidden shrink-0">
      {/* Desktop/Tablet Permanent Sidebar */}
      <aside className={`${isFocusMode ? 'hidden' : 'hidden md:block'} ${widthClass} h-full fixed top-0 left-0 z-20 transform-gpu will-change-transform translate-x-0 transition-[width,transform] duration-200 ease-out overflow-hidden`}>
        {renderSidebarContent('desktop')}
      </aside>

      {/* Mobile Drawer Sidebar */}
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-50 md:hidden overflow-hidden transition-opacity duration-200 ease-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div 
          onClick={onClose}
          className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 ease-out ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`} 
        />
        
        {/* Hardware-Accelerated Slide-out Panel */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-64 max-w-[82vw] overflow-hidden shadow-2xl transform-gpu will-change-transform transition-transform duration-200 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderSidebarContent('mobile', true)}
        </div>
      </div>
    </div>
  );
}
