import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  User,
  Sparkles,
  CheckCircle2,
  Save,
  Clock,
  Trash2,
  Camera,
  RefreshCw,
  BookOpen,
  Target,
  GraduationCap,
  Check,
  ChevronRight,
  Upload,
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Crop,
  Loader2,
  Eye,
  Edit3,
  Award,
  Plus,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useStudyStats } from '../../hooks/useStudyStats';
import { StudyTrackerService } from '../../services/StudyTrackerService';
import {
  readSyncProfileSnapshot,
  fetchAndReconcileSupabaseProfile,
  saveProfileToSupabase,
  getMonogramAvatar,
  getCuratedMonogramPresets
} from '../../utils/profileStorage';
import {
  CustomDailyGoalSelector,
  LiveStudyCountdownTimer,
  formatMinutesHuman
} from './CustomFocusGoalAndTimer';

type SettingsTab = 'overview' | 'personal' | 'curriculum';

export function ProfileSettingsHub() {
  useThemeMode();
  const {
    studyHoursFormatted,
    todayMinutes,
    isStudyingLive,
    subjectBreakdown,
    recentSessions
  } = useStudyStats();

  // Synchronous initial snapshot (0ms load, zero dummy data)
  const initialSnapshot = useMemo(() => readSyncProfileSnapshot(), []);

  // Navigation State
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');

  // Profile Identity State (Hydrated immediately from real user session/cache)
  const [fullName, setFullName] = useState<string>(initialSnapshot.fullName);
  const [avatarUrl, setAvatarUrl] = useState<string>(initialSnapshot.avatarUrl);
  const [schoolName, setSchoolName] = useState<string>(initialSnapshot.schoolName);
  const [className, setClassName] = useState<string>(initialSnapshot.className);
  const [studentBio, setStudentBio] = useState<string>(initialSnapshot.studentBio);
  const [subject, setSubject] = useState<string>(initialSnapshot.subject);
  const [targetAim, setTargetAim] = useState<string>(initialSnapshot.targetAim);
  const [userEmail, setUserEmail] = useState<string>(initialSnapshot.email);

  // Study Goals State
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(initialSnapshot.dailyGoalMinutes);
  const [examName, setExamName] = useState<string>(initialSnapshot.examName);
  const [examDate, setExamDate] = useState<string>(initialSnapshot.examDate);

  // Personalized Study Session Logger State
  const [customSessionMinutes, setCustomSessionMinutes] = useState<number>(30);
  const [customSessionSubject, setCustomSessionSubject] = useState<string>(() => initialSnapshot.subject || '');
  const [customSessionNote, setCustomSessionNote] = useState<string>('');

  // Sync & Status State
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  // Modals & Photo Upload
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [showDeleteProfileConfirm, setShowDeleteProfileConfirm] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [customAvatarUrlInput, setCustomAvatarUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteProfileCompletely = async () => {
    if (isDeletingProfile) return;
    setIsDeletingProfile(true);
    try {
      let userId = localStorage.getItem('studyweb_active_user_id') || 'local-user';
      let token: string | undefined;
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          userId = session.user.id;
          token = session.access_token;
        }
      }

      try {
        await fetch('/api/profile/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-studyweb-user-id': userId
          },
          body: JSON.stringify({ userId })
        });
      } catch {}

      if (supabase && userId && userId !== 'local-user') {
        await Promise.allSettled([
          supabase.from('workspace_files').delete().eq('user_id', userId),
          supabase.from('study_notes').delete().eq('user_id', userId),
          supabase.from('workspaces').delete().eq('user_id', userId),
          supabase.from('study_streak_settings').delete().eq('user_id', userId),
          supabase.from('user_streaks').delete().eq('user_id', userId),
          supabase.from('profiles').delete().eq('id', userId)
        ]);
        try {
          await supabase.auth.signOut();
        } catch {}
      }

      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      setShowDeleteProfileConfirm(false);
      setIsDeletingProfile(false);
      window.dispatchEvent(new CustomEvent('studyweb-account-deleted'));
    } catch {
      setIsDeletingProfile(false);
      setShowDeleteProfileConfirm(false);
      window.dispatchEvent(new CustomEvent('studyweb-account-deleted'));
    }
  };

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

  const displayIdentityName = useMemo(() => {
    if (fullName && fullName.trim()) return fullName.trim();
    if (userEmail && userEmail.includes('@')) return userEmail.split('@')[0];
    return 'Student';
  }, [fullName, userEmail]);

  const curatedAvatars = useMemo(
    () => getCuratedMonogramPresets(displayIdentityName || userEmail || 'User'),
    [displayIdentityName, userEmail]
  );

  // Keep StudyTrackerService aware of user's primary study subject
  useEffect(() => {
    if (subject && subject.trim()) {
      StudyTrackerService.setActiveSubject(subject.trim());
    }
  }, [subject]);

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

      ctx.translate(PREVIEW_RES / 2, PREVIEW_RES / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);

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
      } catch {}
    };
    img.src = imageToCrop;

    return () => {
      isMounted = false;
    };
  }, [imageToCrop, cropPan.x, cropPan.y, cropZoom, cropRotation]);

  // Centralized Full-Screen Notification Helper
  const triggerToast = (msg: string) => {
    const isWarn = msg.includes('⚠️');
    const isSync = msg.includes('⟳') || msg.includes('ℹ️');
    const cleanMsg = msg.replace(/^[✨🎯🖼️⚠️✅⟳ℹ️📥🧹🦉🎙️🗑️⏱️🔥]+\s*/, '');
    window.dispatchEvent(
      new CustomEvent('studyweb-toast', {
        detail: {
          title: isWarn
            ? 'Attention Needed'
            : isSync
            ? 'Profile Updated'
            : 'Profile Saved',
          badge: isWarn ? 'Validation Notice' : 'Saved',
          message: cleanMsg,
          type: isWarn ? 'warning' : isSync ? 'info' : 'success',
          duration: 3000,
        },
      })
    );
  };

  // Background Supabase Profile Reconciliation (non-blocking, instant local cache)
  useEffect(() => {
    let isMounted = true;

    async function reconcileRemote() {
      const { profile, isCloudSynced } = await fetchAndReconcileSupabaseProfile();
      if (!isMounted) return;
      setUserEmail(profile.email);
      setFullName(profile.fullName);
      setAvatarUrl(profile.avatarUrl);
      setSchoolName(profile.schoolName);
      setClassName(profile.className);
      setSubject(profile.subject);
      setCustomSessionSubject((prev) => prev || profile.subject || '');
      setTargetAim(profile.targetAim);
      setStudentBio(profile.studentBio);
      setDailyGoalMinutes(profile.dailyGoalMinutes);
      StudyTrackerService.setDailyGoalMinutes(profile.dailyGoalMinutes);
      setExamName(profile.examName);
      setExamDate(profile.examDate);
      setSyncStatus(isCloudSynced ? 'synced' : 'local');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    reconcileRemote();

    const handleProfileUpdated = (e: any) => {
      const p = e?.detail || readSyncProfileSnapshot();
      if (!p || !isMounted) return;
      if (p.email !== undefined) setUserEmail(p.email);
      if (p.fullName !== undefined) setFullName(p.fullName);
      if (p.avatarUrl !== undefined) setAvatarUrl(p.avatarUrl);
      if (p.schoolName !== undefined) setSchoolName(p.schoolName);
      if (p.className !== undefined) setClassName(p.className);
      if (p.subject !== undefined) setSubject(p.subject);
      if (p.targetAim !== undefined) setTargetAim(p.targetAim);
      if (p.studentBio !== undefined) setStudentBio(p.studentBio);
      if (p.dailyGoalMinutes !== undefined && Number(p.dailyGoalMinutes) >= 5) {
        setDailyGoalMinutes(Number(p.dailyGoalMinutes));
      }
      if (p.examName !== undefined) setExamName(p.examName);
      if (p.examDate !== undefined) setExamDate(p.examDate);
    };

    window.addEventListener('studyweb_profile_updated', handleProfileUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('studyweb_profile_updated', handleProfileUpdated);
    };
  }, []);

  // Unified Save Handler for Personal Info + Overview
  const handleSavePersonal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSyncStatus('syncing');

    try {
      const { profile, synced } = await saveProfileToSupabase({
        fullName: fullName.trim() || (userEmail ? userEmail.split('@')[0] : 'Student'),
        avatarUrl,
        schoolName: schoolName.trim(),
        className: className.trim(),
        subject: subject.trim(),
        targetAim: targetAim.trim(),
        studentBio: studentBio.trim(),
        dailyGoalMinutes,
        examName: examName.trim(),
        examDate
      });

      StudyTrackerService.setDailyGoalMinutes(profile.dailyGoalMinutes);
      setFullName(profile.fullName);
      setAvatarUrl(profile.avatarUrl);
      setSchoolName(profile.schoolName);
      setClassName(profile.className);
      setSubject(profile.subject);
      setTargetAim(profile.targetAim);
      setStudentBio(profile.studentBio);
      setDailyGoalMinutes(profile.dailyGoalMinutes);
      setExamName(profile.examName);
      setExamDate(profile.examDate);
      setSyncStatus(synced ? 'synced' : 'local');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      triggerToast('✨ Profile and academic details saved!');
      confetti({
        particleCount: 30,
        spread: 55,
        origin: { y: 0.8 },
        colors: ['#4F46E5', '#6366F1', '#10B981', '#38BDF8']
      });
    } catch (err) {
      console.warn('Save profile error:', err);
      setSyncStatus('local');
      triggerToast('⚠️ Saved locally. Cloud sync will retry automatically.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Study Goals & Next Core Exam Target to Supabase
  const handleSaveGoals = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingGoals(true);
    setSyncStatus('syncing');

    try {
      const { synced } = await saveProfileToSupabase({
        fullName: fullName.trim() || (userEmail ? userEmail.split('@')[0] : 'Student'),
        avatarUrl,
        schoolName: schoolName.trim(),
        className: className.trim(),
        subject: subject.trim(),
        targetAim: targetAim.trim(),
        studentBio: studentBio.trim(),
        dailyGoalMinutes,
        examName: examName.trim(),
        examDate
      });

      StudyTrackerService.setDailyGoalMinutes(dailyGoalMinutes);
      setSyncStatus(synced ? 'synced' : 'local');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      triggerToast('🎯 Study goals and exam countdown saved!');
    } catch (err) {
      console.warn('Save goals error:', err);
      setSyncStatus('local');
    } finally {
      setIsSavingGoals(false);
    }
  };

  // Personalized Study Session Logger Handler
  const handleLogStudySession = (minsToLog?: number) => {
    const minutes = minsToLog ?? customSessionMinutes;
    const targetSubject = (customSessionSubject || subject || 'General Study').trim();
    const result = StudyTrackerService.logManualStudySession(minutes, targetSubject, customSessionNote);
    setCustomSessionNote('');
    setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    if (result.newlyCompletedRoutine) {
      triggerToast(`🎯 Daily study goal (${dailyGoalMinutes}m) completed!`);
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.75 },
        colors: ['#F59E0B', '#10B981', '#4F46E5', '#38BDF8']
      });
    } else {
      triggerToast(`⏱️ Logged +${minutes}m for ${targetSubject} to your study profile!`);
    }
  };

  // Quick helper to set exam target date N days from today
  const setExamDateDaysFromNow = async (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    setExamDate(formatted);
    await saveProfileToSupabase({
      examDate: formatted,
      examName: examName.trim(),
      dailyGoalMinutes
    });
    setSyncStatus('synced');
  };

  // Handle Avatar Selection
  const applyAvatar = async (url: string) => {
    setAvatarUrl(url);
    setShowAvatarPicker(false);
    const { synced } = await saveProfileToSupabase({ avatarUrl: url });
    setSyncStatus(synced ? 'synced' : 'local');
    triggerToast('🖼️ Profile portrait saved!');
  };

  // Handle File Selection with 5MB validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      triggerToast('⚠️ Image exceeds 5MB limit. Please choose a smaller photo.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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

  // Execute Canvas Crop & Upload to Supabase Storage + Profile Sync
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

      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);

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

      const croppedDataUrl = canvas.toDataURL('image/webp', 0.88);

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
          }
        } catch {}
      }

      setAvatarUrl(finalUrl);
      const { synced } = await saveProfileToSupabase({ avatarUrl: finalUrl });
      setSyncStatus(synced ? 'synced' : 'local');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      setImageToCrop(null);
      triggerToast(
        syncedToBucket
          ? '✨ Photo uploaded and profile updated!'
          : '✨ Photo cropped and profile saved!'
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
      const defaultPlaceholder = getMonogramAvatar(displayIdentityName || userEmail || 'User');
      let storageDeleted = false;

      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const marker = '/avatars/';
          if (avatarUrl && avatarUrl.includes(marker)) {
            const pathAfterMarker = avatarUrl.split(marker)[1]?.split('?')[0];
            if (pathAfterMarker) {
              const { error: delErr } = await supabase.storage
                .from('avatars')
                .remove([pathAfterMarker]);
              if (!delErr) storageDeleted = true;
            }
          }

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
            } catch {}
          }
        } catch {}
      }

      setAvatarUrl(defaultPlaceholder);
      localStorage.removeItem('studyweb_profile_pic');
      const { synced } = await saveProfileToSupabase({ avatarUrl: defaultPlaceholder });
      setSyncStatus(synced ? 'synced' : 'local');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      setShowRemovePhotoConfirm(false);
      triggerToast(
        storageDeleted
          ? '🗑️ Photo deleted and reset to initials monogram.'
          : '🗑️ Profile photo removed and reset to initials monogram.'
      );
    } catch (err: any) {
      console.error('Error removing photo:', err);
      triggerToast('⚠️ Failed to remove photo. Please try again.');
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  // Exam Countdown & Urgency Computation
  const examCountdown = useMemo(() => {
    if (!examDate) {
      return {
        hasDate: false,
        daysRemaining: null as number | null,
        formattedDate: 'No exam date set',
        phaseLabel: 'Set target date to track countdown',
        phaseColor: 'text-slate-500 dark:text-slate-400',
        badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
        projectedHours: 0
      };
    }

    try {
      const [y, m, d] = examDate.split('-').map(Number);
      const targetMidnight = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

      const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const projectedHours = diffDays > 0 ? Number(((diffDays * dailyGoalMinutes) / 60).toFixed(1)) : 0;

      if (diffDays < 0) {
        return {
          hasDate: true,
          daysRemaining: 0,
          formattedDate,
          phaseLabel: `Exam date passed (${Math.abs(diffDays)}d ago)`,
          phaseColor: 'text-rose-600 dark:text-rose-400',
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
          projectedHours: 0
        };
      }

      if (diffDays === 0) {
        return {
          hasDate: true,
          daysRemaining: 0,
          formattedDate,
          phaseLabel: 'Exam Day is Today!',
          phaseColor: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
          projectedHours: Number((dailyGoalMinutes / 60).toFixed(1))
        };
      }

      if (diffDays <= 7) {
        return {
          hasDate: true,
          daysRemaining: diffDays,
          formattedDate,
          phaseLabel: 'Final Sprint Phase',
          phaseColor: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
          projectedHours
        };
      }

      if (diffDays <= 30) {
        return {
          hasDate: true,
          daysRemaining: diffDays,
          formattedDate,
          phaseLabel: 'Active Review Phase',
          phaseColor: 'text-indigo-600 dark:text-indigo-400',
          badgeBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20',
          projectedHours
        };
      }

      return {
        hasDate: true,
        daysRemaining: diffDays,
        formattedDate,
        phaseLabel: 'Steady Mastery Phase',
        phaseColor: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
        projectedHours
      };
    } catch {
      return {
        hasDate: false,
        daysRemaining: null,
        formattedDate: 'Invalid date',
        phaseLabel: 'Select a valid exam date',
        phaseColor: 'text-slate-500',
        badgeBg: 'bg-slate-100 text-slate-600',
        projectedHours: 0
      };
    }
  }, [examDate, dailyGoalMinutes]);

  // Clean unboxed metadata items for the Hero Card (zero dangling separators)
  const heroMetadataItems = useMemo(() => {
    return [className, schoolName, subject, userEmail].map((s) => (s || '').trim()).filter(Boolean);
  }, [className, schoolName, subject, userEmail]);

  const dailyGoalProgressPct = useMemo(() => {
    if (!dailyGoalMinutes || dailyGoalMinutes <= 0) return 0;
    return Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));
  }, [todayMinutes, dailyGoalMinutes]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 sm:space-y-7 text-left pb-16 min-w-0">
      {/* 1. HERO COMMAND CARD */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[32px] bg-white/90 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-8 shadow-lg shadow-slate-200/30 dark:shadow-none transition-colors">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 bg-gradient-to-tr from-sky-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-8 justify-between">
          {/* Left: Avatar + Real Identity Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left min-w-0 w-full">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-indigo-400/40 dark:border-indigo-400/30 p-1 bg-white/90 dark:bg-slate-950/50 shadow-md group-hover:border-indigo-500 group-hover:scale-105 transition-all duration-300 relative">
                <img
                  src={avatarUrl || getMonogramAvatar(displayIdentityName || userEmail || 'User')}
                  alt={displayIdentityName}
                  className="w-full h-full object-cover rounded-[14px] sm:rounded-[20px]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getMonogramAvatar(displayIdentityName || userEmail || 'User');
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/70 rounded-[14px] sm:rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2 backdrop-blur-xs p-1.5 z-10">
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
            </div>

            {/* Real Scholar Identity Meta */}
            <div className="space-y-1.5 sm:space-y-2 min-w-0 max-w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate max-w-full">
                  {displayIdentityName}
                </h1>
              </div>

              {heroMetadataItems.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {heroMetadataItems.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <span className="text-slate-300 dark:text-slate-600 font-bold" aria-hidden="true">
                          ·
                        </span>
                      )}
                      <span className={`truncate max-w-[240px] sm:max-w-none ${item.includes('@') ? 'font-mono text-slate-500 dark:text-slate-400' : ''}`}>
                        {item}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {targetAim ? (
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 break-words">
                  Aim: {targetAim}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* METRIC STRIP: Real-Time Personalized Tabular Figures */}
        <div className="mt-5 sm:mt-7 pt-4 sm:pt-6 border-t border-slate-100 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Personalized Logged Study Hours Card */}
          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 shadow-xs hover:border-sky-500/30 transition-all flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium min-w-0">
                  <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                  <span className="truncate">Logged Study ({displayIdentityName.split(' ')[0]})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleLogStudySession(15)}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                  title="Quick log +15 minutes to your study profile"
                >
                  <Plus className="w-3 h-3" />
                  <span>15m</span>
                </button>
              </div>
              <div className="text-lg sm:text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white flex items-baseline gap-1.5 flex-wrap">
                <span>{studyHoursFormatted}</span>
                <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal truncate">
                  Hours{subject ? ` · ${subject}` : ''}
                </span>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-mono tabular-nums">{todayMinutes}m / {dailyGoalMinutes}m today</span>
                <span className="font-mono font-bold tabular-nums text-sky-600 dark:text-sky-400">{dailyGoalProgressPct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${dailyGoalProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('curriculum')}
            className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 shadow-xs hover:border-purple-500/40 transition-all cursor-pointer min-w-0"
            title="Click to configure Next Core Exam Target Date"
          >
            <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <Target className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="truncate">{examName ? examName : 'Next Core Exam'}</span>
              </div>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
                {examCountdown.hasDate ? examCountdown.formattedDate : 'Set Date →'}
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">
              {examCountdown.hasDate ? (
                <>
                  {examCountdown.daysRemaining}{' '}
                  <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal">
                    {examCountdown.daysRemaining === 1 ? 'Day Left' : 'Days Left'}
                  </span>
                </>
              ) : (
                <span className="text-sm font-sans font-bold text-indigo-600 dark:text-indigo-400">
                  Configure Exam Date
                </span>
              )}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 truncate ${examCountdown.phaseColor}`}>
              {examCountdown.phaseLabel}
            </p>
          </div>
        </div>
      </div>

      {/* 2. SEGMENTED TABS (Equal-width 3-column grid — zero mobile overflow) */}
      <div
        data-tour="profile-tabs-bar"
        className="grid grid-cols-3 gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs transition-colors"
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:py-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-w-0 ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:py-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-w-0 ${
            activeTab === 'personal'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
          }`}
        >
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">Personal Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:py-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-w-0 ${
            activeTab === 'curriculum'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">Study Goals</span>
        </button>
      </div>

      {/* 3. TAB CONTENT PANELS */}
      <div className="transition-all duration-300 min-w-0">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW (REAL PERSONAL INFO + STUDY GOALS + HOURS) */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-5 sm:space-y-6">
            {/* Row 1: Real Personal Info Summary & Study Goals Together */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
              {/* Card A: Real Personal & Academic Profile Summary + Quick Save */}
              <div
                data-tour="profile-customization-card"
                className="rounded-2xl sm:rounded-[28px] bg-white/90 dark:bg-slate-900/65 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 flex flex-col justify-between space-y-4 sm:space-y-5 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors min-w-0"
              >
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">Personal & Academic Profile</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Your personal and academic details
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab('personal')}
                        className="flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0" />
                        <span>Full Form</span>
                      </button>
                      <button
                        type="button"
                        data-tour="profile-save-btn"
                        onClick={handleSavePersonal}
                        disabled={isSaving}
                        className="flex-1 sm:flex-initial justify-center px-3.5 py-2 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-xs"
                      >
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 shrink-0" />}
                        <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Editable Quick Fields right in Overview so any change saves directly */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Full Student Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Academic Institution / School
                      </label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="Enter your school or university"
                        className="w-full px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Class / Grade Level
                      </label>
                      <input
                        type="text"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="e.g. Grade 12 / Sophomore"
                        className="w-full px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Primary Study Subject
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Biology, Mathematics, CS"
                        className="w-full px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Student Bio / Study Objective
                      </label>
                      <input
                        type="text"
                        value={studentBio}
                        onChange={(e) => setStudentBio(e.target.value)}
                        placeholder="Describe your study focus or academic objective..."
                        className="w-full px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-mono truncate">{userEmail || displayIdentityName}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    Synced: {lastSyncedTime}
                  </span>
                </div>
              </div>

              {/* Card B: Real Study Goals & Next Core Exam Countdown in Overview */}
              <div className="rounded-2xl sm:rounded-[28px] bg-white/90 dark:bg-slate-900/65 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 flex flex-col justify-between space-y-4 sm:space-y-5 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors min-w-0">
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="truncate">Study Goals & Exam Countdown</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Your active daily focus target, learning aim, and next core exam
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveGoals}
                      disabled={isSavingGoals}
                      className="w-full sm:w-auto justify-center px-3.5 py-2 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-xs shrink-0"
                    >
                      {isSavingGoals ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 shrink-0" />}
                      <span>{isSavingGoals ? 'Saving...' : 'Save Goals'}</span>
                    </button>
                  </div>

                  {/* My Learning Aim & Goal */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      My Learning Aim & Goal
                    </label>
                    <input
                      type="text"
                      value={targetAim}
                      onChange={(e) => setTargetAim(e.target.value)}
                      placeholder="e.g. Ace AP Exams / Crack JEE / Master Calculus"
                      className="w-full px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none transition-colors"
                    />
                  </div>

                  {/* Customizable Daily Focus Goal Selector (Presets + Custom Hours/Minutes) */}
                  <CustomDailyGoalSelector
                    dailyGoalMinutes={dailyGoalMinutes}
                    todayMinutes={todayMinutes}
                    onGoalChange={(mins) => setDailyGoalMinutes(mins)}
                    compact
                  />

                  {/* Next Core Exam Target Date & Name in Overview */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Next Core Exam Name
                        </label>
                        <input
                          type="text"
                          value={examName}
                          onChange={(e) => setExamName(e.target.value)}
                          placeholder="e.g. AP Biology Final"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Target Exam Date
                        </label>
                        <input
                          type="date"
                          value={examDate}
                          onChange={(e) => setExamDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-xs">
                      <span className={`font-semibold ${examCountdown.phaseColor}`}>
                        {examCountdown.phaseLabel}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {examCountdown.hasDate
                          ? `${examCountdown.daysRemaining} Days Remaining`
                          : 'No Target Date Set'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    {examCountdown.hasDate && examCountdown.projectedHours > 0
                      ? `Projected study before exam: ${examCountdown.projectedHours} hrs`
                      : 'Set an exam date to calculate projected study hours'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('curriculum')}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
                  >
                    Open Study Goals →
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Personalized Study Hours & Subject Breakdown */}
            <div className="rounded-2xl sm:rounded-[28px] bg-white/90 dark:bg-slate-900/65 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="truncate">Personalized Logged Study Hours ({displayIdentityName})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time active study tracking & custom session logging for your daily routine
                  </p>
                </div>
                <div className="grid grid-cols-4 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleLogStudySession(mins)}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 border border-sky-200/80 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 text-xs font-mono font-bold tabular-nums transition-colors cursor-pointer text-center"
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
                {/* Left: Subject Breakdown & Daily Progress */}
                <div className="md:col-span-7 space-y-4 min-w-0">
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Today&apos;s Personalized Focus Progress
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isStudyingLive ? 'Live study session tracking active' : 'Automatically tracks while you study'}
                        </p>
                      </div>
                      <span className="font-mono text-xs sm:text-sm font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {todayMinutes}m / {dailyGoalMinutes}m ({dailyGoalProgressPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${dailyGoalProgressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Per-Subject Breakdown */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Study Time by Subject
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        Total: {studyHoursFormatted} hrs
                      </span>
                    </div>
                    {subjectBreakdown && subjectBreakdown.length > 0 ? (
                      <div className="space-y-2">
                        {subjectBreakdown.map((item) => (
                          <div
                            key={item.subject}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {item.subject}
                              </span>
                              <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">
                                {item.minutes >= 60 ? `${item.hours} hrs (${item.minutes}m)` : `${item.minutes} mins`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        Your study time is automatically logged by subject as you use workspaces, notes, and AI Tutor, or when you log a study session on the right.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Log Custom Study Session Form & Recent Sessions */}
                <div className="md:col-span-5 p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Log Custom Study Session</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Subject / Topic
                      </label>
                      <input
                        type="text"
                        value={customSessionSubject}
                        onChange={(e) => setCustomSessionSubject(e.target.value)}
                        placeholder={subject || 'e.g. Biology'}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Minutes Studied
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={600}
                        value={customSessionMinutes}
                        onChange={(e) => setCustomSessionMinutes(Math.max(1, parseInt(e.target.value, 10) || 15))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLogStudySession()}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Logged Study Hours</span>
                  </button>

                  {recentSessions && recentSessions.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Recent Logged Sessions
                      </span>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {recentSessions.slice(0, 4).map((sess) => (
                          <div
                            key={sess.id}
                            className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {sess.subject}
                            </span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              +{sess.minutes}m
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PERSONAL INFORMATION FORM (NO CURRICULUM BOARD)    */}
        {/* ========================================================= */}
        {activeTab === 'personal' && (
          <div className="rounded-2xl sm:rounded-[28px] bg-white/85 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-8 space-y-6 sm:space-y-8 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 sm:pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Personal Identity & Academic Records
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your full name, school, grade level, study subject, learning aim, and profile portrait.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSavePersonal}
                disabled={isSaving}
                className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>

            <form onSubmit={handleSavePersonal} className="space-y-6">
              {/* Avatar Selector Strip */}
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-indigo-400/40 p-0.5 shrink-0 bg-white dark:bg-slate-900 shadow-sm">
                  <img
                    src={avatarUrl || getMonogramAvatar(displayIdentityName || userEmail || 'User')}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Profile Portrait</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose a personalized monogram badge, upload your own photo, or paste a custom image URL.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(true)}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
                  >
                    Select Style
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/30 hover:bg-indigo-100 dark:hover:bg-indigo-600/50 text-xs font-semibold text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRemovePhotoConfirm(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Reset to initials monogram"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset Monogram</span>
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
                    placeholder="Enter your full name"
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
                    Primary Study Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Computer Science, Biology, Physics"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    My Learning Aim & Goal
                  </label>
                  <input
                    type="text"
                    value={targetAim}
                    onChange={(e) => setTargetAim(e.target.value)}
                    placeholder="e.g. Crack JEE / Ace Final Exams / Master Full-Stack Engineering"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Primary Academic Email
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
                    Student Bio / Study Objective
                  </label>
                  <textarea
                    rows={3}
                    value={studentBio}
                    onChange={(e) => setStudentBio(e.target.value)}
                    placeholder="Describe your current academic focus, target exam scores, or research interests..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none resize-none shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: STUDY GOALS & IMPROVED NEXT CORE EXAM TARGET       */}
        {/* ========================================================= */}
        {activeTab === 'curriculum' && (
          <div className="rounded-2xl sm:rounded-[28px] bg-white/85 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-8 space-y-6 sm:space-y-8 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 sm:pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Study Goals & Next Core Exam Target
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure your daily focus target, primary learning aim, and live exam countdown tracker.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveGoals}
                disabled={isSavingGoals}
                className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isSavingGoals ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSavingGoals ? 'Saving...' : 'Save Goals'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveGoals} className="space-y-8">
              {/* 1. Primary Learning Aim & Study Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>My Learning Aim & Goal</span>
                  </label>
                  <input
                    type="text"
                    value={targetAim}
                    onChange={(e) => setTargetAim(e.target.value)}
                    placeholder="e.g. Score 98% in Finals / Crack JEE / Ace AP Biology"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Primary Focus Subject</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Molecular Biology, Calculus, Organic Chemistry"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-none shadow-xs"
                  />
                </div>
              </div>

              {/* 2. Customizable Daily Focus Goal Target + Live Countdown Timer */}
              <div className="space-y-5 p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <CustomDailyGoalSelector
                  dailyGoalMinutes={dailyGoalMinutes}
                  todayMinutes={todayMinutes}
                  onGoalChange={(mins) => setDailyGoalMinutes(mins)}
                />

                <div className="pt-1 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Today&apos;s Focus Completion</span>
                    <span className="font-mono font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {todayMinutes}m / {formatMinutesHuman(dailyGoalMinutes)} ({dailyGoalProgressPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${dailyGoalProgressPct}%` }}
                    />
                  </div>
                </div>

                <LiveStudyCountdownTimer
                  subjectName={subject || 'General Study'}
                  dailyGoalMinutes={dailyGoalMinutes}
                  todayMinutes={todayMinutes}
                />
              </div>

              {/* 3. Upgraded Next Core Exam Target Date & Live Countdown Tracker */}
              <div className="space-y-5 p-6 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Next Core Exam Target Date & Live Countdown</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Set your upcoming exam name and target date to track your live countdown and study horizon
                    </p>
                  </div>
                  {examDate && (
                    <button
                      type="button"
                      onClick={() => setExamDate('')}
                      className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline self-start sm:self-center cursor-pointer"
                    >
                      Clear Date
                    </button>
                  )}
                </div>

                {/* Exam Name Input + Date Picker */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Exam Name / Subject Title
                    </label>
                    <input
                      type="text"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      placeholder="e.g. AP Biology Final Exam, JEE Mains, Midterm"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Target Exam Date
                    </label>
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Quick Horizon Preset Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                    Quick Target Horizon:
                  </span>
                  {[
                    { label: '+7 Days', days: 7 },
                    { label: '+14 Days', days: 14 },
                    { label: '+30 Days', days: 30 },
                    { label: '+60 Days', days: 60 },
                    { label: '+90 Days', days: 90 }
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setExamDateDaysFromNow(preset.days)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Live Countdown Tracker Readout */}
                <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Live Exam Countdown
                    </span>
                    <div className="text-2xl font-mono font-extrabold tabular-nums text-slate-900 dark:text-white">
                      {examCountdown.hasDate ? (
                        <>
                          {examCountdown.daysRemaining}{' '}
                          <span className="text-xs font-sans font-semibold text-slate-500 dark:text-slate-400">
                            {examCountdown.daysRemaining === 1 ? 'Day Remaining' : 'Days Remaining'}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-sans font-bold text-slate-400">
                          Not Configured
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Target Exam & Schedule
                    </span>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {examName || 'Core Exam Target'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {examCountdown.formattedDate}
                    </div>
                  </div>

                  <div className="space-y-1 sm:text-right">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Preparation Pace
                    </span>
                    <div className={`text-xs font-bold ${examCountdown.phaseColor}`}>
                      {examCountdown.phaseLabel}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {examCountdown.hasDate && examCountdown.projectedHours > 0
                        ? `${examCountdown.projectedHours} hrs planned focus`
                        : `${dailyGoalMinutes} mins/day target`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingGoals}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingGoals ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSavingGoals ? 'Saving...' : 'Save Study Goals'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* COMPLETE PROFILE DELETION SECTION (BOTTOM OF PROFILE)     */}
        {/* ========================================================= */}
        <div className="rounded-[26px] border border-rose-200/80 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Delete Profile Completely
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  Permanently delete your StudyWeb profile, workspaces, uploaded study materials, AI Tutor chat history, notes, flashcards, and streak records. This action cannot be undone.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteProfileConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs shadow-xs shadow-rose-600/20 transition-all inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Profile Completely</span>
            </button>
          </div>
        </div>
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
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <Crop className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Crop & Frame Portrait</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Position your image with real-time preview across avatar shapes
                    </p>
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
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

                <div className="md:col-span-5 flex flex-col gap-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Live Preview
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                      1:1 Aspect Ratio
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="w-20 h-20 rounded-[20px] overflow-hidden border-2 border-indigo-400/40 p-0.5 shrink-0 bg-white dark:bg-slate-950 shadow-md relative">
                      {livePreviewUrl ? (
                        <img
                          src={livePreviewUrl}
                          alt="Rounded-square preview"
                          className="w-full h-full object-cover rounded-[16px]"
                        />
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Profile Hero Card</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Rounded-square presentation
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-950 shadow-sm shrink-0">
                      {livePreviewUrl ? (
                        <img src={livePreviewUrl} alt="Circle preview" className="w-full h-full object-cover rounded-full" />
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Header & Navigation</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Circular avatar across top bar
                      </p>
                    </div>
                  </div>
                </div>
              </div>

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
                      <img
                        src="/assets/aistudio/upload_1e68f79f.svg"
                        alt="Uploading..."
                        className="w-4 h-4 object-contain shrink-0"
                      />
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
      {/* MODAL 1: AVATAR PICKER MODAL                              */}
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
                  <span>Select Profile Avatar</span>
                </h3>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Upload Custom Photo</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      JPEG, PNG, WebP or GIF up to 5MB with interactive crop & zoom
                    </p>
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

              {/* Personalized Monogram Themes (Using User's Real Initials) */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Personalized Initials Monograms ({displayIdentityName})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {curatedAvatars.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => applyAvatar(av.url)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 cursor-pointer ${
                        avatarUrl === av.url
                          ? 'border-indigo-600 ring-2 ring-indigo-600/30'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                      {avatarUrl === av.url && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
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
                    placeholder="https://example.com/my-photo.jpg"
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset to Initials Monogram?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This will remove your custom photo and restore your personalized initials monogram.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-center gap-4">
                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current</span>
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs mx-auto">
                    <img src={avatarUrl} alt="Current" className="w-full h-full object-cover" />
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-3" />

                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 tracking-wider">
                    Initials Monogram
                  </span>
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-300 dark:border-indigo-600 shadow-xs mx-auto">
                    <img
                      src={getMonogramAvatar(displayIdentityName || userEmail || 'User')}
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
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Reset Monogram</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteProfileConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeletingProfile) setShowDeleteProfileConfirm(false);
              }}
              className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-rose-200/80 dark:border-rose-900/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl text-left z-10 space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Delete Profile Completely?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 p-3.5 rounded-2xl">
                Are you sure you want to permanently delete your profile, workspaces, uploaded study materials, AI Tutor chats, notes, flashcards, and quizzes?
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={isDeletingProfile}
                  onClick={() => setShowDeleteProfileConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingProfile}
                  onClick={handleDeleteProfileCompletely}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Completely</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
