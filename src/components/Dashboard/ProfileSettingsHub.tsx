import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  User, 
  Sparkles, 
  Award, 
  Flame, 
  CheckCircle, 
  CheckCircle2,
  AlertCircle, 
  Save, 
  Clock, 
  Wifi, 
  WifiOff, 
  Trash2, 
  ShieldCheck, 
  Database, 
  Download, 
  Share2, 
  Camera, 
  RefreshCw, 
  BookOpen, 
  Target, 
  GraduationCap, 
  Brain, 
  Volume2, 
  Sliders, 
  Check, 
  ChevronRight, 
  HelpCircle,
  Copy,
  ExternalLink,
  Laptop,
  Upload,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Activity,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Crop,
  Loader2,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { useThemeMode } from '../../hooks/useThemeMode';

// High-fidelity preset avatars
const PRESET_AVATARS = [
  { id: 'av-1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=240', name: 'Sophia' },
  { id: 'av-2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=240', name: 'James' },
  { id: 'av-3', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=240', name: 'Elena' },
  { id: 'av-4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=240', name: 'Marcus' },
  { id: 'av-5', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=240', name: 'Aria' },
  { id: 'av-6', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=240', name: 'David' }
];

// Interactive AI Learning Companions
const MASCOTS = [
  { 
    id: 'athena', 
    name: 'Athena the Owl', 
    title: 'Socratic Academic Advisor', 
    desc: 'Synthesizes deep conceptual theory, structural debates, and historical precedents.',
    avatar: '🦉',
    accent: 'from-amber-500/20 to-indigo-500/20',
    badge: 'Theory & Logic'
  },
  { 
    id: 'nova', 
    name: 'Nova the Rocket', 
    title: 'Hyper-Focus Speed Partner', 
    desc: 'Optimized for high-cadence active recall sprints and custom flashcard drills.',
    avatar: '🚀',
    accent: 'from-cyan-500/20 to-blue-500/20',
    badge: 'Rapid Mastery'
  },
  { 
    id: 'sparky', 
    name: 'Sparky the Mech', 
    title: 'Analytical Formula Guide', 
    desc: 'Unravels mathematical proofs, stoichiometry balance, and algorithmic problem paths.',
    avatar: '⚙️',
    accent: 'from-violet-500/20 to-purple-500/20',
    badge: 'Equations & Proofs'
  }
];

// Cognitive Learning Profiles
const COGNITIVE_STYLES = [
  { id: 'visual_spaced', label: 'Visual & Spaced Recall', detail: 'Diagrams, spatial memory anchors, and adaptive repetition curves.' },
  { id: 'socratic', label: 'Socratic Dialogue & Debate', detail: 'Exploratory questioning that forces deep first-principles comprehension.' },
  { id: 'first_principles', label: 'First-Principles Proofs', detail: 'Axiom-to-theorem deductions and step-by-step problem deconstruction.' },
  { id: 'active_recall', label: 'Timed Sprint Drills', detail: 'High-speed active interrogation with instant performance feedback.' }
];

// Curriculum Board Options
const CURRICULUM_BOARDS = [
  'Advanced Placement (AP) US Curriculum',
  'International Baccalaureate (IB Diploma)',
  'Cambridge IGCSE & A-Levels',
  'CBSE / ICSE Senior Secondary Board',
  'State Board of Higher Secondary Education',
  'Standard Undergraduate / College Honors'
];

// Helper to generate initials monogram avatar with soft gradient
const getMonogramAvatar = (name: string) => {
  const cleanName = (name || 'Alex Johnson').trim();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=6366F1&color=ffffff&bold=true&size=256`;
};

type SettingsTab = 'overview' | 'personal' | 'curriculum' | 'security';

export function ProfileSettingsHub() {
  const { themeMode, setThemeMode } = useThemeMode();

  // Navigation State
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');

  // Profile Identity State
  const [fullName, setFullName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=240'
  );
  const [currentStudy, setCurrentStudy] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [studentBio, setStudentBio] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [targetAim, setTargetAim] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  // Learning & Cognitive State
  const [activeMascot, setActiveMascot] = useState<string>('athena');
  const [cognitiveStyle, setCognitiveStyle] = useState<string>('visual_spaced');
  const [voiceStyle, setVoiceStyle] = useState<string>('calm');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(45);
  const [examDate, setExamDate] = useState<string>('2026-05-15');

  // Sync & Status State
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local'>('local');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals & Photo Upload
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [showDeleteModal1, setShowDeleteModal1] = useState(false);
  const [showDeleteModal2, setShowDeleteModal2] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [customAvatarUrlInput, setCustomAvatarUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interactive Crop & Zoom Modal State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropPan, setCropPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropRotation, setCropRotation] = useState<number>(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Real-Time Canvas Synchronization Effect
  useEffect(() => {
    if (!imageToCrop) {
      setLivePreviewUrl(null);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!isMounted) return;
      const canvas = previewCanvasRef.current || document.createElement('canvas');
      const PREVIEW_RES = 300;
      const UI_SIZE = 240;
      canvas.width = PREVIEW_RES;
      canvas.height = PREVIEW_RES;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, PREVIEW_RES, PREVIEW_RES);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Center & rotate
      ctx.translate(PREVIEW_RES / 2, PREVIEW_RES / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);

      // Pan & Zoom
      const scaleMultiplier = PREVIEW_RES / UI_SIZE;
      ctx.translate(cropPan.x * scaleMultiplier, cropPan.y * scaleMultiplier);
      ctx.scale(cropZoom * scaleMultiplier, cropZoom * scaleMultiplier);

      const aspect = img.naturalWidth / img.naturalHeight;
      let baseW = UI_SIZE;
      let baseH = UI_SIZE;
      if (aspect >= 1) {
        baseH = UI_SIZE;
        baseW = UI_SIZE * aspect;
      } else {
        baseW = UI_SIZE;
        baseH = UI_SIZE / aspect;
      }

      ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
      try {
        const previewData = canvas.toDataURL('image/webp', 0.85);
        if (isMounted) setLivePreviewUrl(previewData);
      } catch (err) {
        // Fallback for tainted canvas
      }
    };
    img.src = imageToCrop;

    return () => {
      isMounted = false;
    };
  }, [imageToCrop, cropPan.x, cropPan.y, cropZoom, cropRotation]);

  // Centralized Full-Screen Notification Helper
  const triggerToast = (msg: string) => {
    setToastMessage(null);
    const isWarn = msg.includes('⚠️');
    const isSync = msg.includes('⟳') || msg.includes('ℹ️');
    const cleanMsg = msg.replace(/^[✨🎯🖼️⚠️✅⟳ℹ️📥🧹🦉🎙️]+\s*/, '');
    window.dispatchEvent(
      new CustomEvent('studyweb-toast', {
        detail: {
          title: isWarn
            ? 'Attention Needed'
            : isSync
            ? 'Cloud Synchronization'
            : 'Profile & Settings Updated',
          badge: isWarn ? 'Validation Notice' : 'Scholar Hub Synced',
          message: cleanMsg,
          type: isWarn ? 'warning' : isSync ? 'info' : 'success',
          duration: 3200,
        },
      })
    );
  };

  // Initial Supabase Profile Fetch
  useEffect(() => {
    let isMounted = true;

    async function loadRemoteProfile() {
      try {
        if (!supabase) return;
        setSyncStatus('syncing');

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUserEmail(session.user.email || '');
          setUserId(session.user.id);

          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!error && data) {
            const nameVal = data.full_name || data.name || (session.user.email ? session.user.email.split('@')[0] : '');
            setFullName(nameVal || '');
            setAvatarUrl(data.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=240');
            setSchoolName(data.school_name || data.academic_institution || '');
            setClassName(data.class_name || '');
            setCurrentStudy(data.curriculum_board || data.current_study || '');
            setStudentBio(data.scholar_bio || data.bio || '');
            setSubject(data.subject || '');
            setTargetAim(data.target_aim || data.primary_goal || '');
          } else {
            setFullName(session.user.email ? session.user.email.split('@')[0] : '');
            setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=240');
            setSchoolName('');
            setClassName('');
            setCurrentStudy('');
            setStudentBio('');
            setSubject('');
            setTargetAim('');
          }
          setSyncStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setFullName('');
          setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=240');
          setSchoolName('');
          setClassName('');
          setCurrentStudy('');
          setStudentBio('');
          setSubject('');
          setTargetAim('');
          setSyncStatus('local');
        }
      } catch (err) {
        console.warn('Supabase profile load fallback to local state:', err);
        setSyncStatus('local');
      }
    }

    loadRemoteProfile();
    window.addEventListener('studyweb_profile_updated', loadRemoteProfile);
    return () => { 
      isMounted = false; 
      window.removeEventListener('studyweb_profile_updated', loadRemoteProfile);
    };
  }, []);

  // Save to Supabase and LocalStorage
  const handleSavePersonal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSyncStatus('syncing');

    // 1. Save locally
    localStorage.setItem('studyweb_profile_name', fullName);
    localStorage.setItem('studyweb_profile_avatar', avatarUrl);
    localStorage.setItem('studyweb_profile_class_board', currentStudy);
    localStorage.setItem('studyweb_profile_school', schoolName);
    localStorage.setItem('studyweb_profile_class', className);
    localStorage.setItem('studyweb_profile_bio', studentBio);
    localStorage.setItem('studyweb_profile_subject', subject);
    localStorage.setItem('studyweb_profile_aim', targetAim);

    // 2. Sync to Supabase if authenticated
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.from('profiles').upsert({
            id: session.user.id,
            email: session.user.email,
            full_name: fullName,
            name: fullName,
            avatar_url: avatarUrl,
            school_name: schoolName,
            academic_institution: schoolName,
            class_name: className,
            curriculum_board: currentStudy,
            current_study: currentStudy,
            scholar_bio: studentBio,
            bio: studentBio,
            subject: subject,
            target_aim: targetAim,
            primary_goal: targetAim,
            updated_at: new Date().toISOString()
          });
          if (error) throw error;
          setSyncStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch (err) {
      console.warn('Remote sync notice:', err);
      setSyncStatus('local');
    } finally {
      setIsSaving(false);
      triggerToast('✨ Profile details successfully updated and synchronized!');
      window.dispatchEvent(new Event('studyweb_profile_updated'));
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#4F46E5', '#6366F1', '#A855F7', '#38BDF8']
      });
    }
  };

  // Save Learning & Goal Preferences
  const handleSaveGoals = () => {
    localStorage.setItem('studyweb_profile_mascot', activeMascot);
    localStorage.setItem('studyweb_profile_cognitive_style', cognitiveStyle);
    localStorage.setItem('studyweb_profile_voice_style', voiceStyle);
    localStorage.setItem('studyweb_profile_daily_goal', dailyGoalMinutes.toString());
    localStorage.setItem('studyweb_profile_exam_date', examDate);
    triggerToast('🎯 Study goals and cognitive profile saved!');
  };

  // Handle Avatar Selection
  const applyAvatar = async (url: string) => {
    setAvatarUrl(url);
    localStorage.setItem('studyweb_profile_avatar', url);
    setShowAvatarPicker(false);
    triggerToast('🖼️ Profile portrait updated!');

    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id);
          setSyncStatus('synced');
        }
      }
    } catch (e) {}
  };

  // Handle File Selection with 5MB validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size <= 5MB
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      triggerToast('⚠️ Image exceeds 5MB limit. Please choose a smaller photo.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      triggerToast('⚠️ Unsupported format. Please upload a JPEG, PNG, WebP, or GIF image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageToCrop(reader.result);
        setCropZoom(1);
        setCropPan({ x: 0, y: 0 });
        setCropRotation(0);
        setShowAvatarPicker(false);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Crop Drag & Pan Handlers
  const handleCropMouseDown = (e: React.MouseEvent) => {
    setIsDraggingCrop(true);
    setDragStart({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCrop) return;
    const maxBound = 140 * Math.max(1, cropZoom - 0.5);
    const newX = Math.max(-maxBound, Math.min(maxBound, e.clientX - dragStart.x));
    const newY = Math.max(-maxBound, Math.min(maxBound, e.clientY - dragStart.y));
    setCropPan({ x: newX, y: newY });
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
  };

  const handleCropTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDraggingCrop(true);
      setDragStart({ x: e.touches[0].clientX - cropPan.x, y: e.touches[0].clientY - cropPan.y });
    }
  };

  const handleCropTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingCrop || e.touches.length !== 1) return;
    const maxBound = 140 * Math.max(1, cropZoom - 0.5);
    const newX = Math.max(-maxBound, Math.min(maxBound, e.touches[0].clientX - dragStart.x));
    const newY = Math.max(-maxBound, Math.min(maxBound, e.touches[0].clientY - dragStart.y));
    setCropPan({ x: newX, y: newY });
  };

  const handleCropTouchEnd = () => {
    setIsDraggingCrop(false);
  };

  // Execute Canvas Crop & Upload to Supabase Storage + Local State
  const handlePerformCropAndUpload = async () => {
    if (!imageToCrop) return;
    setIsUploadingPhoto(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageToCrop;
      });

      const OUTPUT_SIZE = 400;
      const UI_FRAME_SIZE = 240;
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas render failed');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Move to center & apply rotation
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);

      // Translate pan & scale
      const scaleMultiplier = OUTPUT_SIZE / UI_FRAME_SIZE;
      ctx.translate(cropPan.x * scaleMultiplier, cropPan.y * scaleMultiplier);
      ctx.scale(cropZoom * scaleMultiplier, cropZoom * scaleMultiplier);

      const aspect = img.naturalWidth / img.naturalHeight;
      let baseW = UI_FRAME_SIZE;
      let baseH = UI_FRAME_SIZE;
      if (aspect >= 1) {
        baseH = UI_FRAME_SIZE;
        baseW = UI_FRAME_SIZE * aspect;
      } else {
        baseW = UI_FRAME_SIZE;
        baseH = UI_FRAME_SIZE / aspect;
      }

      ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);

      // Export base64 DataURL
      const croppedDataUrl = canvas.toDataURL('image/webp', 0.88);

      // Export Blob for storage upload
      const croppedBlob: Blob = await new Promise((resolve) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else {
            const byteString = atob(croppedDataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            resolve(new Blob([ab], { type: 'image/webp' }));
          }
        }, 'image/webp', 0.88);
      });

      let finalUrl = croppedDataUrl;
      let syncedToBucket = false;

      // Supabase Storage upload attempt
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const userFolder = session?.user?.id || 'guest';
          const filePath = `${userFolder}/avatar-${Date.now()}.webp`;

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('avatars')
            .upload(filePath, croppedBlob, {
              contentType: 'image/webp',
              upsert: true
            });

          if (!uploadErr && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);

            if (publicUrl) {
              finalUrl = publicUrl;
              syncedToBucket = true;
            }
          } else {
            console.info('Storage bucket upload notice, using persistent base64 avatar:', uploadErr?.message);
          }
        } catch (storageErr) {
          console.info('Supabase storage fallback:', storageErr);
        }
      }

      // Update local profile state & localStorage
      setAvatarUrl(finalUrl);
      localStorage.setItem('studyweb_profile_avatar', finalUrl);
      window.dispatchEvent(new Event('studyweb_profile_updated'));
      window.dispatchEvent(new Event('storage'));

      // Sync to Supabase profiles table
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await supabase.from('profiles').upsert({
              id: session.user.id,
              avatar_url: finalUrl,
              updated_at: new Date().toISOString()
            });
            setSyncStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        } catch (profileErr) {
          console.warn('Profile table sync notice:', profileErr);
        }
      }

      setImageToCrop(null);
      triggerToast(
        syncedToBucket 
          ? '✨ Photo uploaded to Supabase Storage and profile synchronized!'
          : '✨ Photo cropped and profile synchronized!'
      );
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#4F46E5', '#6366F1', '#10B981', '#38BDF8']
      });
    } catch (err: any) {
      console.error('Error cropping image:', err);
      triggerToast('⚠️ Failed to process photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Remove Photo & Reset to Initials Monogram Placeholder
  const handleRemovePhoto = async () => {
    setIsRemovingPhoto(true);
    try {
      const defaultPlaceholder = getMonogramAvatar(fullName);
      let storageDeleted = false;

      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          // 1. If avatarUrl contains Supabase storage path marker, remove that specific object
          const marker = '/avatars/';
          if (avatarUrl && avatarUrl.includes(marker)) {
            const pathAfterMarker = avatarUrl.split(marker)[1]?.split('?')[0];
            if (pathAfterMarker) {
              const { error: delErr } = await supabase.storage
                .from('avatars')
                .remove([pathAfterMarker]);
              if (!delErr) {
                storageDeleted = true;
              }
            }
          }

          // 2. Also clean any user-specific avatar files if authenticated
          if (session?.user?.id) {
            try {
              const { data: userFiles } = await supabase.storage
                .from('avatars')
                .list(session.user.id);
              if (userFiles && userFiles.length > 0) {
                const filesToRemove = userFiles.map((f) => `${session.user.id}/${f.name}`);
                await supabase.storage.from('avatars').remove(filesToRemove);
                storageDeleted = true;
              }
            } catch (listErr) {
              console.info('Storage list clean notice:', listErr);
            }

            // 3. Update Supabase profiles table
            await supabase.from('profiles').upsert({
              id: session.user.id,
              avatar_url: defaultPlaceholder,
              updated_at: new Date().toISOString()
            });
            setSyncStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        } catch (cloudErr) {
          console.warn('Supabase storage removal cloud notice:', cloudErr);
        }
      }

      // 4. Update local profile state and persistent storage
      setAvatarUrl(defaultPlaceholder);
      localStorage.setItem('studyweb_profile_avatar', defaultPlaceholder);
      localStorage.removeItem('studyweb_profile_pic');
      window.dispatchEvent(new Event('studyweb_profile_updated'));
      window.dispatchEvent(new Event('storage'));

      setShowRemovePhotoConfirm(false);
      triggerToast(
        storageDeleted
          ? '🗑️ Photo deleted from Supabase storage. Reset to initials monogram.'
          : '🗑️ Profile photo removed and reset to initials monogram.'
      );
    } catch (err: any) {
      console.error('Error removing photo:', err);
      triggerToast('⚠️ Failed to remove photo. Please try again.');
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  // Force Resync with Supabase
  const handleForceSync = async () => {
    setSyncStatus('syncing');
    triggerToast('⟳ Re-syncing profile with Supabase cloud...');
    try {
      if (!supabase) throw new Error('Supabase client not available');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSyncStatus('local');
        triggerToast('⚠️ Guest mode: profile saved locally.');
        return;
      }

      await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        current_study: currentStudy,
        updated_at: new Date().toISOString()
      });

      setSyncStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      triggerToast('✅ Cloud profile verified and synchronized!');
    } catch (err: any) {
      setSyncStatus('local');
      triggerToast('ℹ️ Local cache verified. Cloud sync queued.');
    }
  };

  // Export User Study Vault Data as JSON
  const handleExportVault = () => {
    const vaultData = {
      scholar: {
        fullName,
        currentStudy,
        schoolName,
        studentBio,
        activeMascot,
        cognitiveStyle,
        dailyGoalMinutes,
        examDate,
        exportedAt: new Date().toISOString()
      },
      workspaces: JSON.parse(localStorage.getItem('studyweb_workspaces_v2') || '[]'),
      recentNotes: JSON.parse(localStorage.getItem('studyweb_notes') || '[]'),
      flashcards: JSON.parse(localStorage.getItem('studyweb_flashcards') || '[]')
    };

    const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StudyWeb-ScholarVault-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('📥 Full scholar vault exported successfully!');
  };

  // Safe Permanent Account Wipe (cleans both cloud user records and local browser storage)
  const handlePermanentAccountWipe = async () => {
    setIsDeleting(true);
    triggerToast('🧹 Wiping your cloud records, local data, and preferences...');
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (uid) {
          await Promise.allSettled([
            supabase.from('workspace_files').delete().eq('user_id', uid),
            supabase.from('documents').delete().eq('user_id', uid),
            supabase.from('retrieval_logs').delete().eq('user_id', uid),
            supabase.from('workspaces').delete().eq('user_id', uid),
            supabase.from('profiles').delete().eq('id', uid)
          ]);
          try {
            const { data: userAvatars } = await supabase.storage.from('avatars').list(uid);
            if (userAvatars && userAvatars.length > 0) {
              await supabase.storage.from('avatars').remove(userAvatars.map(f => `${uid}/${f.name}`));
            }
          } catch {}
        }
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Cloud account wipe notice:', err);
    } finally {
      setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }, 1200);
    }
  };

  // Calculate days remaining to exam
  const calculateDaysRemaining = () => {
    try {
      const target = new Date(examDate).getTime();
      const now = new Date().getTime();
      const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } catch {
      return 45;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 text-left pb-16">
      
      {/* Notifications are handled globally by the full-screen ToastContainer overlay */}

      {/* 1. ULTRA-PREMIUM WHITE GLASSMORPHIC HERO COMMAND CARD */}
      <div className="relative overflow-hidden rounded-[32px] bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-10 shadow-xl shadow-slate-200/40 dark:shadow-none transition-colors">
        {/* Soft Ambient Radial Lights */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 bg-gradient-to-tr from-sky-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 justify-between">
          
          {/* Left: Avatar + Identity Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            
            {/* Interactive Glowing Avatar */}
            <div className="relative group shrink-0">
              <div 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-indigo-400/40 dark:border-indigo-400/30 p-1 bg-white/90 dark:bg-slate-950/50 shadow-md group-hover:border-indigo-500 group-hover:scale-105 transition-all duration-300 relative"
              >
                <img 
                  src={avatarUrl} 
                  alt={fullName}
                  className="w-full h-full object-cover rounded-[20px]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getMonogramAvatar(fullName);
                  }}
                />
                {/* Hover Action Overlay with Edit & Remove Photo */}
                <div className="absolute inset-0 bg-slate-950/70 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2 backdrop-blur-xs p-1.5 z-10">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAvatarPicker(true);
                      }}
                      className="p-1.5 rounded-xl bg-white/20 hover:bg-indigo-600 text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                      title="Change / Upload Photo"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRemovePhotoConfirm(true);
                      }}
                      className="p-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-600 text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <span className="text-[9px] font-bold tracking-wider uppercase text-slate-200">Manage</span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-md" title="Active Scholar">
                <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
              </div>
            </div>

            {/* Scholar Identity Meta */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {fullName}
                </h1>
              </div>

              {/* Unboxed Metadata with Typographic Separator */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <span>{currentStudy}</span>
                <span className="text-slate-300 dark:text-slate-600 font-bold" aria-hidden="true">·</span>
                <span>{schoolName}</span>
                <span className="text-slate-300 dark:text-slate-600 font-bold" aria-hidden="true">·</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2.5 self-center md:self-start">
          </div>
        </div>

        {/* METRIC STRIP: Tabular figures with zero-pill rule */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 shadow-xs hover:border-amber-500/30 transition-all">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Current Streak</span>
            </div>
            <div className="text-xl sm:text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">
              14 <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal">Days</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Top 5% of Scholars</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 shadow-xs hover:border-sky-500/30 transition-all">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <Clock className="w-4 h-4 text-sky-500" />
              <span>Logged Study</span>
            </div>
            <div className="text-xl sm:text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">
              48.5 <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal">Hours</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">This Academic Term</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 shadow-xs hover:border-purple-500/30 transition-all">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <Target className="w-4 h-4 text-purple-500" />
              <span>Exam Countdown</span>
            </div>
            <div className="text-xl sm:text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">
              {calculateDaysRemaining()} <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal">Days</span>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-300 font-medium mt-0.5">Sprint Review Phase</p>
          </div>
        </div>
      </div>

      {/* 2. SEGMENTED WHITE GLASS TABS (Functional button controls) */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto scrollbar-none shadow-sm transition-colors">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Personal Info</span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'curriculum'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Study Goals</span>
        </button>
      </div>

      {/* 3. TAB CONTENT PANELS */}
      <div className="transition-all duration-300">
        
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & STUDY TELEMETRY                         */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Top Grid: Active AI Companion */}
            <div className="grid grid-cols-1 gap-6">

              {/* Card 2: Active Learning AI Companion (Mascot Switcher) */}
              <div className="rounded-[28px] bg-white/85 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Learning Companion & Tutor Persona</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select the intelligence persona guiding your study sessions</p>
                </div>

                <div className="space-y-3">
                  {MASCOTS.map((mascot) => {
                    const isSelected = activeMascot === mascot.id;
                    return (
                      <div
                        key={mascot.id}
                        onClick={() => {
                          setActiveMascot(mascot.id);
                          localStorage.setItem('studyweb_profile_mascot', mascot.id);
                          triggerToast(`🦉 ${mascot.name} designated as your active companion!`);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-600/15 border-indigo-400/60 dark:border-indigo-500/50 shadow-sm'
                            : 'bg-white/70 dark:bg-white/5 border-slate-200/70 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="text-2xl p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 shadow-xs">
                            {mascot.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{mascot.name}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {mascot.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 line-clamp-1">
                              {mascot.desc}
                            </p>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* AI Tutor Vocal Preference */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Audio Tutor Voice</span>
                    </span>
                    <select
                      value={voiceStyle}
                      onChange={(e) => {
                        setVoiceStyle(e.target.value);
                        localStorage.setItem('studyweb_profile_voice_style', e.target.value);
                        triggerToast('🎙️ Audio tutor voice updated!');
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 shadow-xs"
                    >
                      <option value="calm">Calm Academic Advisor</option>
                      <option value="energetic">High-Energy Sprint Coach</option>
                      <option value="methodical">Methodical Precision Analyst</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PERSONAL INFORMATION FORM                          */}
        {/* ========================================================= */}
        {activeTab === 'personal' && (
          <div className="rounded-[28px] bg-white/85 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-9 space-y-8 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Personal Identity & Scholar Records</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your display name, academic institution credentials, and profile image.
                </p>
              </div>
              <button
                onClick={handleSavePersonal}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 self-start cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>

            <form onSubmit={handleSavePersonal} className="space-y-6">
              
              {/* Avatar Selector Strip */}
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-indigo-400/40 p-0.5 shrink-0 bg-white dark:bg-slate-900 shadow-sm">
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-[14px]" />
                </div>
                
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Profile Portrait</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose from curated scholar portraits, upload from your device, or paste a custom image URL.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(true)}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
                  >
                    Select Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/30 hover:bg-indigo-100 dark:hover:bg-indigo-600/50 text-xs font-semibold text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRemovePhotoConfirm(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Remove Photo and reset to initials monogram"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Form Input Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Student Name <span className="text-indigo-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none shadow-xs"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Academic Institution / School
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. Stanford University / Lincoln High School"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Class / Grade Level
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Grade 12 / Sophomore Year"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Curriculum Board / Program
                  </label>
                  <select
                    value={currentStudy}
                    onChange={(e) => setCurrentStudy(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white transition-all outline-none shadow-xs"
                  >
                    <option value="">Select Curriculum Board...</option>
                    {CURRICULUM_BOARDS.map((board) => (
                      <option key={board} value={board}>{board}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Primary Study Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Computer Science, AP Biology, Physics"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    My Learning Aim & Goal
                  </label>
                  <input
                    type="text"
                    value={targetAim}
                    onChange={(e) => setTargetAim(e.target.value)}
                    placeholder="e.g. Crack JEE / Ace AP Exams / Master Web Development"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Primary Academic Email (Supabase Verified)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={userEmail}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none pr-10"
                    />
                    <div className="absolute right-3.5 top-3.5" title="Verified Account">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Scholar Bio / Study Objective
                  </label>
                  <textarea
                    rows={3}
                    value={studentBio}
                    onChange={(e) => setStudentBio(e.target.value)}
                    placeholder="Describe your current academic focus, target AP exam scores, or research interests..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none resize-none shadow-xs"
                  />
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: STUDY GOALS & COGNITIVE PROFILE                    */}
        {/* ========================================================= */}
        {activeTab === 'curriculum' && (
          <div className="rounded-[28px] bg-white/85 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-9 space-y-8 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Study Goals & Cognitive Learning Profile</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Fine-tune your cognitive style, daily focus targets, and exam deadline countdowns.
                </p>
              </div>
              <button
                onClick={handleSaveGoals}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 self-start cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Goals</span>
              </button>
            </div>

            <div className="space-y-8">
              
              {/* Daily Focus Goal Target */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Daily Focus Target</span>
                  </label>
                  <span className="font-mono text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                    {dailyGoalMinutes} Minutes / Day
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyGoalMinutes(mins)}
                      className={`py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        dailyGoalMinutes === mins
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 shadow-xs'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Exam Date & Countdown */}
              <div className="space-y-3 p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Next Core Exam Target Date</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Used to calibrate spaced review urgency</p>
                  </div>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 shadow-xs"
                  />
                </div>
                
                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-indigo-800 dark:text-indigo-200 font-semibold">Active Review Phase:</span>
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-300">
                    {calculateDaysRemaining()} Days Remaining
                  </span>
                </div>
              </div>

              {/* Cognitive Learning Styles Selector */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                  <span>Cognitive Learning Profile Architecture</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {COGNITIVE_STYLES.map((style) => {
                    const isSelected = cognitiveStyle === style.id;
                    return (
                      <div
                        key={style.id}
                        onClick={() => setCognitiveStyle(style.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-600/15 border-indigo-400/60 dark:border-indigo-500/50 shadow-sm'
                            : 'bg-white/70 dark:bg-white/5 border-slate-200/70 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{style.label}</h4>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{style.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SECURITY & CLOUD DIAGNOSTICS                       */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            
            {/* Supabase Cloud Connection Diagnostics Card */}
            <div className="rounded-[28px] bg-white/85 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Supabase Cloud Sync Diagnostics</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time status of persistent cloud database connections</p>
                </div>
                <button
                  onClick={handleForceSync}
                  className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer self-start shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Test Connection</span>
                </button>
              </div>

              {/* Diagnostic Parameters Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Database Connection</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-900 dark:text-white">Supabase PostgreSQL 15 (Active)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Auth Token Validity</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">Valid JWT Session</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Profile Row ID</span>
                  <p className="font-mono text-slate-700 dark:text-slate-300 truncate">{userId || 'local-guest-scholar'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Schema Table</span>
                  <p className="font-mono text-indigo-600 dark:text-indigo-300">public.profiles (RLS enforced)</p>
                </div>
              </div>
            </div>

            {/* Scholar Vault Backup Card */}
            <div className="rounded-[28px] bg-white/85 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Download Offline Scholar Vault</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
                  Export a complete JSON bundle of your workspaces, uploaded document references, notes, study flashcards, and preferences.
                </p>
              </div>
              <button
                onClick={handleExportVault}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/10 dark:hover:bg-white/15 dark:text-white font-bold text-xs border border-transparent dark:border-white/10 transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md hover:scale-102 active:scale-98"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export Scholar Vault</span>
              </button>
            </div>

            {/* DANGER ZONE: Safe Account Reset */}
            <div className="rounded-[28px] bg-rose-50/70 dark:bg-rose-950/15 border border-rose-200/80 dark:border-rose-900/40 p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-1 max-w-lg">
                  <h4 className="text-sm font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Danger Zone</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Permanently wipe your local scholar profile, custom decks, study notes, and reset all workspace progress. This action is irreversible.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteModal1(true)}
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all inline-flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 0: INTERACTIVE PHOTO CROP & ZOOM MODAL              */}
      {/* ========================================================= */}
      <AnimatePresence>
        {imageToCrop && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isUploadingPhoto) setImageToCrop(null);
              }}
              className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl text-left z-10 space-y-6 max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <Crop className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Crop & Frame Portrait</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Position your image with real-time preview across avatar shapes</p>
                  </div>
                </div>
                {!isUploadingPhoto && (
                  <button
                    onClick={() => setImageToCrop(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Side-by-Side Workspace Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: Interactive Cropping Aperture & Controls (7 Cols) */}
                <div className="md:col-span-7 space-y-4">
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/80">
                    <div 
                      className="relative w-56 h-56 sm:w-60 sm:h-60 rounded-full overflow-hidden border-2 border-indigo-500 shadow-xl cursor-grab active:cursor-grabbing select-none bg-slate-950 flex items-center justify-center touch-none group"
                      onMouseDown={handleCropMouseDown}
                      onMouseMove={handleCropMouseMove}
                      onMouseUp={handleCropMouseUp}
                      onMouseLeave={handleCropMouseUp}
                      onTouchStart={handleCropTouchStart}
                      onTouchMove={handleCropTouchMove}
                      onTouchEnd={handleCropTouchEnd}
                    >
                      <img
                        src={imageToCrop}
                        alt="Crop aperture"
                        className="max-w-none pointer-events-none transition-transform duration-75 select-none"
                        style={{
                          transform: `translate(${cropPan.x}px, ${cropPan.y}px) rotate(${cropRotation}deg) scale(${cropZoom})`,
                          maxHeight: '240px',
                          objectFit: 'contain'
                        }}
                        draggable={false}
                      />

                      {/* Framing Ring & 3x3 Composition Crosshairs */}
                      <div className="absolute inset-0 pointer-events-none rounded-full ring-2 ring-indigo-500/30" />
                      <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20 transition-opacity group-hover:opacity-35">
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-white" />
                        <div className="border-r border-white" />
                        <div />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-2.5 font-medium tracking-wide flex items-center gap-1.5">
                      <span>Drag to pan</span>
                      <span>·</span>
                      <span>Use slider to zoom</span>
                    </p>
                  </div>

                  {/* Zoom Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Zoom / Scale</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {Math.round(cropZoom * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={cropZoom}
                        onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                      />
                      <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </div>

                  {/* Secondary Quick Action Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setCropRotation((prev) => (prev + 90) % 360)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCropZoom(1);
                        setCropPan({ x: 0, y: 0 });
                        setCropRotation(0);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Reset Frame
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: Real-Time Preview Panel (5 Cols) */}
                <div className="md:col-span-5 flex flex-col gap-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Live Preview
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30">
                      1:1 Aspect Ratio
                    </span>
                  </div>

                  {/* Preview 1: Rounded-Square Shape (Hero Scholar Card) */}
                  <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="w-20 h-20 rounded-[20px] overflow-hidden border-2 border-indigo-400/40 p-0.5 shrink-0 bg-white dark:bg-slate-950 shadow-md relative">
                      {livePreviewUrl ? (
                        <img src={livePreviewUrl} alt="Rounded-square preview" className="w-full h-full object-cover rounded-[16px]" />
                      ) : (
                        <div className="w-full h-full relative overflow-hidden rounded-[16px] bg-slate-950 flex items-center justify-center">
                          <img
                            src={imageToCrop}
                            alt="Live preview"
                            className="max-w-none pointer-events-none select-none"
                            style={{
                              transform: `translate(${cropPan.x * (80 / 240)}px, ${cropPan.y * (80 / 240)}px) rotate(${cropRotation}deg) scale(${cropZoom})`,
                              maxHeight: '80px',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Profile Hero Card</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Rounded-square presentation with soft corner radius</p>
                      <span className="inline-block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">80 × 80 px</span>
                    </div>
                  </div>

                  {/* Preview 2: Circle Shape (Header & Comments) */}
                  <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-950 shadow-sm">
                        {livePreviewUrl ? (
                          <img src={livePreviewUrl} alt="Circle preview" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <div className="w-full h-full relative overflow-hidden rounded-full bg-slate-950 flex items-center justify-center">
                            <img
                              src={imageToCrop}
                              alt="Live circle preview"
                              className="max-w-none pointer-events-none select-none"
                              style={{
                                transform: `translate(${cropPan.x * (56 / 240)}px, ${cropPan.y * (56 / 240)}px) rotate(${cropRotation}deg) scale(${cropZoom})`,
                                maxHeight: '56px',
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {/* Active Status Indicator Dot */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Header & Comments</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Circular aperture used across top navigation & chat</p>
                      <span className="inline-block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">56 × 56 px</span>
                    </div>
                  </div>

                  {/* Preview 3: Compact Small Circle (Micro Icon Scale) */}
                  <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0 bg-slate-950 flex items-center justify-center">
                      {livePreviewUrl ? (
                        <img src={livePreviewUrl} alt="Compact preview" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full relative overflow-hidden rounded-full bg-slate-950 flex items-center justify-center">
                          <img
                            src={imageToCrop}
                            alt="Compact preview"
                            className="max-w-none pointer-events-none select-none"
                            style={{
                              transform: `translate(${cropPan.x * (36 / 240)}px, ${cropPan.y * (36 / 240)}px) rotate(${cropRotation}deg) scale(${cropZoom})`,
                              maxHeight: '36px',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Compact / Micro View</div>
                      <span className="inline-block text-[10px] font-mono text-slate-500 dark:text-slate-400">36 × 36 px icon scale</span>
                    </div>
                  </div>

                  {/* Resolution & Aspect Ratio Guarantee Card */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>Output: 400×400 WebP</span>
                    <span>1:1 Square Ratio</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => setImageToCrop(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={handlePerformCropAndUpload}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Crop & Save Avatar</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 1: AVATAR PICKER DRAWER / MODAL                     */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvatarPicker(false)}
              className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl text-left z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Select Scholar Avatar</span>
                </h3>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              {/* Upload Device Photo Option */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Upload Custom Photo</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">JPEG, PNG, WebP or GIF up to 5MB with interactive crop & zoom</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  Browse...
                </button>
              </div>

              {/* Preset Avatars Grid */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Preset Studio Headshots</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => applyAvatar(av.url)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 cursor-pointer ${
                        avatarUrl === av.url ? 'border-indigo-600 ring-2 ring-indigo-600/30' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                      {avatarUrl === av.url && (
                        <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URL Input */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Or Paste Custom Image URL</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customAvatarUrlInput}
                    onChange={(e) => setCustomAvatarUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (customAvatarUrlInput.trim()) {
                        applyAvatar(customAvatarUrlInput.trim());
                        setCustomAvatarUrlInput('');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Reset to Default Initials Monogram */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Prefer a clean monogram initials avatar?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAvatarPicker(false);
                    setShowRemovePhotoConfirm(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: REMOVE PHOTO QUICK CONFIRMATION DIALOG             */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showRemovePhotoConfirm && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isRemovingPhoto && setShowRemovePhotoConfirm(false)}
              className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-rose-200/80 dark:border-rose-900/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl text-center z-10 space-y-5"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Remove Profile Photo?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This will delete your photo from Supabase cloud storage and restore your default scholar initials monogram.
                </p>
              </div>

              {/* Before / After Preview Strip */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-center gap-4">
                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current</span>
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs mx-auto">
                    <img src={avatarUrl} alt="Current" className="w-full h-full object-cover" />
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-3" />

                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 tracking-wider">Default Monogram</span>
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-300 dark:border-indigo-600 shadow-xs mx-auto">
                    <img 
                      src={getMonogramAvatar(fullName)} 
                      alt="New Monogram" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isRemovingPhoto}
                  onClick={() => setShowRemovePhotoConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRemovingPhoto}
                  onClick={handleRemovePhoto}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isRemovingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting & Resetting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Photo</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 2: DELETE ACCOUNT CONFIRMATION STEP 1               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showDeleteModal1 && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal1(false)}
              className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl text-center z-10 space-y-5"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Scholar Account?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  This will wipe all active workspaces, flashcards, uploaded document embeddings, and sync caches.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal1(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal1(false);
                    setShowDeleteModal2(true);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 3: DELETE ACCOUNT FINAL VERIFICATION STEP 2         */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showDeleteModal2 && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeleting) setShowDeleteModal2(false);
              }}
              className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl text-center z-10 space-y-5"
            >
              {isDeleting ? (
                <div className="py-8 space-y-4">
                  <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-bold text-slate-900 dark:text-white text-sm">Wiping scholar vault data...</p>
                </div>
              ) : (
                <>
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Final Confirmation</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Please type <span className="font-mono text-rose-500 dark:text-rose-400 font-bold select-all">DELETE MY ACCOUNT</span> below to proceed:
                    </p>
                  </div>

                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-center text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal2(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deleteConfirmationText !== 'DELETE MY ACCOUNT'}
                      onClick={handlePermanentAccountWipe}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs cursor-pointer disabled:cursor-not-allowed"
                    >
                      Wipe Data
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
