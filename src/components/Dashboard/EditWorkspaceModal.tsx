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
  Layers,
  Camera,
  Trash2,
  ShieldCheck,
  Wand2,
  Layout,
  Sliders,
  Compass
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
    name: 'Cosmic Library', 
    url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Modern Executive Desk', 
    url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Coffee & Notebooks', 
    url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Deep Space & Nebula', 
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Cyberpunk Hub', 
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Neon Horizon', 
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Mountain Pine', 
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Blueprint', 
    url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Botanical Lab', 
    url: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&q=80&w=1200' 
  },
  { 
    name: 'Warm Sunset', 
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
    indigo: 'bg-indigo-600 ring-indigo-500',
    emerald: 'bg-emerald-600 ring-emerald-500',
    amber: 'bg-amber-600 ring-amber-500',
    rose: 'bg-rose-600 ring-rose-500',
    violet: 'bg-violet-600 ring-violet-500',
    cyan: 'bg-cyan-600 ring-cyan-500',
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.18)] w-full max-w-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100 my-auto"
      >
        {/* ================= COMPACT PREMIUM HEADER WITH BADGE & GRADIENT TEXT ================= */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/50 dark:from-slate-900 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-600 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Wand2 className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-[9px] tracking-wide uppercase border border-indigo-200 dark:border-indigo-800 shadow-xs">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" /> ✨ Workspace Customizer
                </span>
              </div>
              <h2 className="text-base font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
                Customize Workspace
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================= COMPACT LIVE PREVIEW BANNER ================= */}
        <div className="relative h-32 sm:h-36 w-full overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-900 shrink-0 group">
          <img
            src={banner}
            alt="Studio Banner Preview"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PRESET_BANNERS[0].url;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

          {/* Quick Change Wallpaper Button */}
          <button
            type="button"
            onClick={() => setActiveTab('banner')}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white dark:bg-slate-900/90 backdrop-blur-xl text-slate-900 dark:text-white text-[11px] font-bold border border-white/40 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>🖼️ Wallpaper</span>
          </button>

          {/* Live Preview Info */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('logo')}
                className="relative group/logo w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-slate-900 rounded-xl border-2 border-white/80 dark:border-slate-700 shadow-xl flex items-center justify-center overflow-hidden shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Click to customize logo"
              >
                {isCustomLogoImage ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl select-none leading-none">{logo}</span>
                )}
                <div className="absolute inset-0 bg-indigo-950/70 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold uppercase">
                  Edit
                </div>
              </button>

              <div className="min-w-0 space-y-0.5">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/20 backdrop-blur-md text-white border border-white/30">
                  {subject || 'General'}
                </span>
                <h3 className="text-sm sm:text-base font-black text-white truncate drop-shadow">
                  {name || 'Untitled Workspace'}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* ================= THREE ICONS IN A ROW TABS ================= */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-2 px-3 rounded-xl font-black text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>✨ Identity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`py-2 px-3 rounded-xl font-black text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'logo'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>🎨 Logo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banner')}
            className={`py-2 px-3 rounded-xl font-black text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'banner'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>🖼️ Wallpaper</span>
          </button>
        </div>

        {/* ================= COMPACT TAB CONTENT BODY ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[45vh] space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="border-l-4 border-l-indigo-600 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                    ✨ Workspace Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Workspace name..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={60}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                      📚 Subject Category
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {SUBJECT_OPTIONS.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                      🎨 Color Accent
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {(['indigo', 'emerald', 'amber', 'rose', 'violet', 'cyan'] as const).map((thm) => (
                        <button
                          key={thm}
                          type="button"
                          onClick={() => setColorTheme(thm)}
                          className={`w-7 h-7 rounded-lg transition-all cursor-pointer flex items-center justify-center shadow-xs ${
                            themeColors[thm]
                          } ${colorTheme === thm ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105 opacity-80'}`}
                          title={thm}
                        >
                          {colorTheme === thm && <Check className="w-3 h-3 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                    📝 Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Workspace goals or notes..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    maxLength={180}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: LOGO */}
          {activeTab === 'logo' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="border-l-4 border-l-purple-600 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border flex items-center justify-center text-2xl">
                      {isCustomLogoImage ? (
                        <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        logo
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">🎨 Logo & Brand Emojis</h3>
                      <p className="text-[11px] text-slate-500">Pick an emoji or upload an image</p>
                    </div>
                  </div>
                  {isCustomLogoImage && (
                    <button
                      type="button"
                      onClick={() => setLogo('🧬')}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-bold hover:bg-rose-100 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="px-3 py-2.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo File'}</span>
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
                      placeholder="Paste image URL..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                    <button
                      type="submit"
                      disabled={!customLogoUrl.trim()}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Set
                    </button>
                  </form>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    ✨ Curated Academic Emojis
                  </label>
                  <div className="grid grid-cols-8 gap-1.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    {PRESET_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setLogo(emoji)}
                        className={`h-9 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer ${
                          logo === emoji
                            ? 'bg-indigo-600 text-white shadow-md scale-110'
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: BANNER */}
          {activeTab === 'banner' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="border-l-4 border-l-blue-600 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 border border-slate-200/80 dark:border-slate-800">
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">🖼️ Wallpaper Gallery</h3>
                  <p className="text-[11px] text-slate-500">Pick a professional wallpaper</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={isUploadingBanner}
                    className="px-3 py-2.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isUploadingBanner ? 'Uploading...' : 'Upload Wallpaper'}</span>
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
                      placeholder="Paste image URL..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                    <button
                      type="submit"
                      disabled={!customBannerUrl.trim()}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Set
                    </button>
                  </form>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    ✨ Preset Wallpapers
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PRESET_BANNERS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setBanner(preset.url)}
                        className={`group relative rounded-xl overflow-hidden h-20 border-2 transition-all cursor-pointer text-left shadow-md ${
                          banner === preset.url
                            ? 'border-indigo-600 ring-2 ring-indigo-500/40 scale-[1.02]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
            </motion.div>
          )}
        </div>

        {/* ================= COMPACT STUDIO FOOTER ================= */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 shadow-md">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!name.trim()}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:opacity-95 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Save Workspace</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
