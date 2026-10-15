import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Smile, 
  Palette, 
  Check, 
  Sparkles, 
  Link as LinkIcon, 
  Layers,
  Camera,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Workspace } from './WorkspaceTypes';

interface EditWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
  onSave: (updatedWorkspace: Workspace) => void;
  initialTab?: 'general' | 'logo' | 'banner';
}

export const PRESET_BANNERS = [
  { 
    name: 'Classic Library', 
    url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Modern Desk & Laptop', 
    url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Coffee & Notebooks', 
    url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Cosmic & Deep Science', 
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Retro Developer Setup', 
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Cyberpunk Neon', 
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Peaceful Mountain Forest', 
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Geometric Architecture', 
    url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Botanical Laboratory', 
    url: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Warm Sunset Horizon', 
    url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=1200' 
  }
];

export const PRESET_EMOJIS = [
  '🧬', '🧪', '🔬', '🔭', '💻', '🧠', '📚', '✍️', 
  '📐', '🎨', '🏛️', '⚡', '🚀', '💡', '🌐', '🎯', 
  '📖', '🏆', '🌍', '📊', '⚙️', '🩺', '⚖️', '🎵',
  '🌱', '🔍', '🪐', '🎓', '🧩', '📝', '💼', '🔥'
];

export const SUBJECT_OPTIONS = [
  'Biology',
  'Chemistry',
  'Physics',
  'Computer Science',
  'Mathematics',
  'History',
  'Literature',
  'Medicine',
  'Economics',
  'Psychology',
  'General Studies'
];

export default function EditWorkspaceModal({
  isOpen,
  onClose,
  workspace,
  onSave,
  initialTab = 'general'
}: EditWorkspaceModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'logo' | 'banner'>(initialTab);
  
  // Editable form fields initialized with current workspace values
  const [name, setName] = useState(workspace.name);
  const [subject, setSubject] = useState(workspace.subject || 'Biology');
  const [description, setDescription] = useState(workspace.description || '');
  const [colorTheme, setColorTheme] = useState<Workspace['colorTheme']>(workspace.colorTheme || 'indigo');
  const [logo, setLogo] = useState(workspace.emoji || '🧬');
  const [banner, setBanner] = useState(workspace.coverImage || PRESET_BANNERS[0].url);
  
  // Custom URL inputs
  const [customBannerUrl, setCustomBannerUrl] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  
  // Upload status states
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // File input refs
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever workspace prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(workspace.name);
      setSubject(workspace.subject || 'Biology');
      setDescription(workspace.description || '');
      setColorTheme(workspace.colorTheme || 'indigo');
      setLogo(workspace.emoji || '🧬');
      setBanner(workspace.coverImage || PRESET_BANNERS[0].url);
      setActiveTab(initialTab);
      setCustomBannerUrl('');
      setCustomLogoUrl('');
    }
  }, [isOpen, workspace, initialTab]);

  if (!isOpen) return null;

  // Handle local image file upload for Banner (Base64)
  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setBanner(base64);
      }
      setIsUploadingBanner(false);
    };
    reader.onerror = () => {
      setIsUploadingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle local image file upload for Logo (Base64)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WEBP).');
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setLogo(base64);
      }
      setIsUploadingLogo(false);
    };
    reader.onerror = () => {
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomBannerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customBannerUrl.trim()) {
      setBanner(customBannerUrl.trim());
      setCustomBannerUrl('');
    }
  };

  const handleApplyCustomLogoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customLogoUrl.trim()) {
      setLogo(customLogoUrl.trim());
      setCustomLogoUrl('');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    const updatedWorkspace: Workspace = {
      ...workspace,
      name: name.trim(),
      subject: subject.trim() || 'General',
      description: description.trim(),
      colorTheme,
      emoji: logo,
      coverImage: banner,
      lastOpened: 'Just Now'
    };

    onSave(updatedWorkspace);
    onClose();
  };

  const isCustomLogoImage = logo.startsWith('data:') || logo.startsWith('http');

  const themeColors: Record<string, string> = {
    indigo: 'bg-indigo-500 ring-indigo-500',
    emerald: 'bg-emerald-500 ring-emerald-500',
    amber: 'bg-amber-500 ring-amber-500',
    rose: 'bg-rose-500 ring-rose-500',
    violet: 'bg-violet-500 ring-violet-500',
    cyan: 'bg-cyan-500 ring-cyan-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Customize Workspace
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Update name, custom logo, banner background, and styling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= LIVE WORKSPACE PREVIEW BANNER ================= */}
        <div className="relative h-36 sm:h-40 w-full overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-800 shrink-0">
          <img
            src={banner}
            alt="Workspace Banner Preview"
            className="w-full h-full object-cover transition-all duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PRESET_BANNERS[0].url;
            }}
          />
          {/* Subtle gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent" />

          {/* Quick Change Banner Button overlay */}
          <button
            type="button"
            onClick={() => setActiveTab('banner')}
            className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Change Banner</span>
          </button>

          {/* Preview Elements: Logo & Title */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Logo Button / Trigger */}
              <button
                type="button"
                onClick={() => setActiveTab('logo')}
                className="relative group w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl border-2 border-white/80 dark:border-slate-700 shadow-xl flex items-center justify-center overflow-hidden shrink-0 transition-transform active:scale-95 cursor-pointer"
                title="Click to change logo"
              >
                {isCustomLogoImage ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl select-none leading-none">{logo}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                  Edit
                </div>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white border border-white/10">
                    {subject || 'General'}
                  </span>
                  <span className="text-white/60 text-xs">•</span>
                  <span className="text-white/80 text-[11px] font-semibold">Preview</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-tight truncate drop-shadow-md">
                  {name || 'Untitled Workspace'}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* ================= NAVIGATION TABS ================= */}
        <div className="flex border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Name & Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logo'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Workspace Logo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('banner')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'banner'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Banner & Background</span>
          </button>
        </div>

        {/* ================= TAB CONTENT BODY ================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: GENERAL (NAME, SUBJECT, DESCRIPTION, THEME) */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Workspace Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Molecular Cell Biology, Modern World History..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                  maxLength={60}
                  required
                />
                <p className="text-[11px] text-slate-450 mt-1">
                  Give your workspace an organized, identifiable title.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Subject / Category
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    {SUBJECT_OPTIONS.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Color Accent Theme
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {(['indigo', 'emerald', 'amber', 'rose', 'violet', 'cyan'] as const).map((thm) => (
                      <button
                        key={thm}
                        type="button"
                        onClick={() => setColorTheme(thm)}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                          themeColors[thm]
                        } ${colorTheme === thm ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                        title={thm}
                      >
                        {colorTheme === thm && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Workspace Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this workspace focused on? Notes, upcoming exams, projects..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none"
                  maxLength={180}
                />
              </div>
            </div>
          )}

          {/* TAB 2: WORKSPACE LOGO (EMOJI PICKER + CUSTOM IMAGE UPLOAD) */}
          {activeTab === 'logo' && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-800 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                  {isCustomLogoImage ? (
                    <img src={logo} alt="Selected Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl leading-none">{logo}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Current Logo</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose from academic icons below or upload your custom logo/avatar.
                  </p>
                </div>
                {isCustomLogoImage && (
                  <button
                    type="button"
                    onClick={() => setLogo('🧬')}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer"
                    title="Reset to default emoji"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Upload Custom Logo Button & URL Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="px-4 py-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo Image'}</span>
                </button>
                <input
                  type="file"
                  ref={logoFileInputRef}
                  onChange={handleLogoFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <form onSubmit={handleApplyCustomLogoUrl} className="flex gap-2">
                  <input
                    type="url"
                    value={customLogoUrl}
                    onChange={(e) => setCustomLogoUrl(e.target.value)}
                    placeholder="Or paste image URL..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <button
                    type="submit"
                    disabled={!customLogoUrl.trim()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Set
                  </button>
                </form>
              </div>

              {/* Preset Icon Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Curated Subject Icons
                </label>
                <div className="grid grid-cols-8 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-750">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setLogo(emoji)}
                      className={`h-10 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                        logo === emoji
                          ? 'bg-indigo-600 text-white shadow-md scale-110'
                          : 'hover:bg-white dark:hover:bg-slate-700 hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANNER & BACKGROUND IMAGE */}
          {activeTab === 'banner' && (
            <div className="space-y-5">
              {/* Custom Banner Upload & URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  disabled={isUploadingBanner}
                  className="px-4 py-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingBanner ? 'Uploading...' : 'Upload Custom Banner'}</span>
                </button>
                <input
                  type="file"
                  ref={bannerFileInputRef}
                  onChange={handleBannerFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <form onSubmit={handleApplyCustomBannerUrl} className="flex gap-2">
                  <input
                    type="url"
                    value={customBannerUrl}
                    onChange={(e) => setCustomBannerUrl(e.target.value)}
                    placeholder="Or paste banner image URL..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <button
                    type="submit"
                    disabled={!customBannerUrl.trim()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              </div>

              {/* Preset Banner Wallpapers */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Curated Banner Wallpapers
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_BANNERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setBanner(preset.url)}
                      className={`group relative rounded-xl overflow-hidden h-20 border-2 transition-all cursor-pointer text-left ${
                        banner === preset.url
                          ? 'border-indigo-600 shadow-md ring-2 ring-indigo-500/30 scale-[1.02]'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2">
                        <span className="text-[10px] font-bold text-white truncate drop-shadow">
                          {preset.name}
                        </span>
                      </div>
                      {banner === preset.url && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-6 py-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!name.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Save Workspace</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
