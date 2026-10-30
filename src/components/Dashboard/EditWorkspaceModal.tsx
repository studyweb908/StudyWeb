import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  Image as ImageIcon,
  Palette,
  BookOpen,
  Upload,
  CheckCircle2,
  Trash2,
  FolderOpen,
  FileText,
  Brain,
  LayoutDashboard,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { Workspace } from './WorkspaceTypes';

interface EditWorkspaceModalProps {
  workspace: Workspace | any;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'logo' | 'banner';
  onSave: (updatedData: any) => void;
}

const PRESET_BANNERS = [
  { name: 'Biology Lab', url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Coding Studio', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Physics Grid', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Classic Library', url: 'https://images.unsplash.com/photo-1507842229356-51c61504d3ab?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Abstract Focus', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Minimal Desk', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Deep Cosmos', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Architecture', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80' }
];

const PRESET_ICONS = [
  '🧬', '💻', '⚛️', '📚', '🧠', '🌍', '🎨', '📈',
  '🔬', '🏛️', '🎵', '⚡', '🚀', '🧪', '📐', '📝',
  '🎓', '💡', '🔭', '⚙️', '🏆', '🧭', '📊', '🗂️'
];

const BRAND_THEMES = [
  { id: 'indigo', name: 'StudyWeb Indigo', primary: '#4f46e5', secondary: '#818cf8', gradient: 'from-indigo-600 to-violet-600', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20' },
  { id: 'violet', name: 'Deep Violet', primary: '#7c3aed', secondary: '#a78bfa', gradient: 'from-violet-600 to-purple-600', badgeBg: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20' },
  { id: 'emerald', name: 'Botanical Emerald', primary: '#059669', secondary: '#34d399', gradient: 'from-emerald-600 to-teal-600', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  { id: 'rose', name: 'Crimson Rose', primary: '#e11d48', secondary: '#fb7185', gradient: 'from-rose-600 to-pink-600', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' },
  { id: 'amber', name: 'Solar Amber', primary: '#d97706', secondary: '#fbbf24', gradient: 'from-amber-500 to-orange-600', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' },
  { id: 'cyan', name: 'Oceanic Cyan', primary: '#0891b2', secondary: '#22d3ee', gradient: 'from-cyan-600 to-blue-600', badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20' }
];

export const EditWorkspaceModal: React.FC<EditWorkspaceModalProps> = ({
  workspace,
  isOpen,
  onClose,
  initialTab = 'general',
  onSave
}) => {
  const initialBanner = workspace.coverImage || workspace.bannerImage || PRESET_BANNERS[0].url;
  const initialIcon = workspace.emoji || workspace.icon || PRESET_ICONS[0];

  const [name, setName] = useState(workspace.name || '');
  const [subject, setSubject] = useState(workspace.subject || 'General');
  const [description, setDescription] = useState(workspace.description || '');
  const [bannerImage, setBannerImage] = useState(initialBanner);
  const [icon, setIcon] = useState(initialIcon);
  const [colorTheme, setColorTheme] = useState<any>(workspace.colorTheme || 'indigo');
  const [activeSection, setActiveSection] = useState<'identity' | 'theme' | 'artwork'>('identity');

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(workspace.name || '');
      setSubject(workspace.subject || 'General');
      setDescription(workspace.description || '');
      setBannerImage(workspace.coverImage || workspace.bannerImage || PRESET_BANNERS[0].url);
      setIcon(workspace.emoji || workspace.icon || PRESET_ICONS[0]);
      setColorTheme(workspace.colorTheme || 'indigo');

      if (initialTab === 'banner') {
        setActiveSection('artwork');
      } else {
        setActiveSection('identity');
      }
    }
  }, [isOpen, workspace, initialTab]);

  if (!isOpen) return null;

  const isCustomLogo = Boolean(icon && (icon.startsWith('data:image') || icon.startsWith('http')));
  const selectedThemeObj = BRAND_THEMES.find((t) => t.id === colorTheme) || BRAND_THEMES[0];

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBannerImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setIcon(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaults = () => {
    setName(workspace.name || '');
    setSubject(workspace.subject || 'General');
    setDescription(workspace.description || '');
    setBannerImage(workspace.coverImage || workspace.bannerImage || PRESET_BANNERS[0].url);
    setIcon(workspace.emoji || workspace.icon || PRESET_ICONS[0]);
    setColorTheme(workspace.colorTheme || 'indigo');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedWorkspace = {
      ...workspace,
      name: name.trim() || workspace.name,
      subject: subject.trim() || workspace.subject,
      description: description.trim(),
      coverImage: bannerImage,
      bannerImage: bannerImage,
      emoji: icon,
      icon: icon,
      colorTheme
    };
    onSave(updatedWorkspace);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] w-screen h-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden animate-fade-in">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={bannerInputRef}
        onChange={handleBannerFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Full-Screen Top Studio Header */}
      <header className="h-16 sm:h-20 px-4 sm:px-8 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </button>
          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              Customize Workspace
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              Configure workspace identity, brand theme palette, and cover artwork
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset unsaved changes"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className={`h-10 px-5 rounded-xl bg-gradient-to-r ${selectedThemeObj.gradient} hover:opacity-95 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer`}
          >
            <Check className="w-4 h-4" />
            <span>Save Workspace</span>
          </button>
        </div>
      </header>

      {/* Full-Width Tabbed Customization Body (No Live Preview) */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-8">
          {/* Section Switcher Tabs */}
          <div className="grid grid-cols-3 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveSection('identity')}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSection === 'identity'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Identity & Emblem</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('theme')}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSection === 'theme'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Brand Theme</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('artwork')}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSection === 'artwork'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Cover Artwork</span>
            </button>
          </div>

          {activeSection === 'identity' && (
            <div className="space-y-6 animate-fade-in">
              {/* Workspace Title & Subject */}
              <div className="p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Workspace Details
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Set the title, academic domain, and syllabus summary displayed across your workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm font-semibold text-slate-900 dark:text-white"
                      placeholder="e.g., AI Systems & Tools"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Subject / Category
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm font-semibold text-slate-900 dark:text-white"
                      placeholder="e.g., Computer Science, Engineering"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description & Study Objective
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 dark:text-white resize-none"
                    placeholder="Describe the core syllabus, exam goals, or topics covered in this workspace..."
                  />
                </div>
              </div>

              {/* Workspace Symbol / Custom Logo */}
              <div className="p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Workspace Emblem
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose an academic symbol or upload a custom image mark.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="h-9 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Upload Custom Emblem</span>
                  </button>
                </div>

                {isCustomLogo && (
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <img src={icon} alt="Custom emblem" className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-800" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Custom Emblem Active</p>
                        <p className="text-[11px] text-slate-500">Displayed in navigation and workspace header</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIcon(PRESET_ICONS[0])}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Remove custom emblem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2.5">
                  {PRESET_ICONS.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                        icon === emoji
                          ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/30 scale-105'
                          : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'theme' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Brand Color Palette
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select the primary accent theme used for buttons, active tabs, and highlights in this workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {BRAND_THEMES.map((theme) => {
                    const isSelected = colorTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setColorTheme(theme.id)}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-400 bg-slate-50/80 dark:bg-slate-950 shadow-sm ring-2 ring-indigo-500/15'
                            : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white shadow-xs shrink-0`}>
                            {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {theme.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.secondary }} />
                              <span className="text-[11px] text-slate-400 font-mono">{theme.primary}</span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'artwork' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Cover Banner Artwork
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Select a curated study cover or upload your own high-resolution image.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="h-9 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Upload Cover Image</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {PRESET_BANNERS.map((banner, idx) => {
                    const isSelected = bannerImage === banner.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBannerImage(banner.url)}
                        className={`group relative h-32 rounded-2xl overflow-hidden border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 ring-2 ring-indigo-500/25 shadow-sm'
                            : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={banner.url}
                          alt={banner.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end p-3">
                          <span className="text-white text-xs font-semibold tracking-tight">{banner.name}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 bg-indigo-600 text-white rounded-full p-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Or Paste Direct Image URL
                  </label>
                  <input
                    type="url"
                    value={bannerImage.startsWith('data:') ? '' : bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-xs font-mono text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={`h-10 px-6 rounded-xl bg-gradient-to-r ${selectedThemeObj.gradient} hover:opacity-95 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer`}
            >
              <Check className="w-4 h-4" />
              <span>Save Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditWorkspaceModal;
