import { supabase } from '../lib/supabase';

export const LEGACY_DUMMY_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=240';

const LEGACY_STOCK_AVATAR_FRAGMENTS = [
  '1534528741775-53994a69daeb',
  '1535713875002-d1d0cf377fde',
  '1494790108377-be9c29b29330',
  '1507003211169-0a1dd7228f2d',
  '1517841905240-472988babdf9'
];

export interface ScholarProfileData {
  userId: string | null;
  email: string;
  fullName: string;
  avatarUrl: string;
  schoolName: string;
  className: string;
  subject: string;
  targetAim: string;
  studentBio: string;
  dailyGoalMinutes: number;
  examName: string;
  examDate: string;
  activeMascot: string;
  voiceStyle: string;
  updatedAt: string;
}

// High-speed in-memory cache for 0ms synchronous reads across all components
let memoryProfileCache: ScholarProfileData | null = null;
let lastRemoteFetchTime = 0;
let inflightProfilePromise: Promise<{ profile: ScholarProfileData; isCloudSynced: boolean }> | null = null;
const PROFILE_CACHE_TTL_MS = 20_000;

export function isLegacyDummyAvatar(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  return LEGACY_STOCK_AVATAR_FRAGMENTS.some((frag) => trimmed.includes(frag));
}

export function isDummyName(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim().toLowerCase();
  return !trimmed || trimmed === 'scholar' || trimmed === 'guest' || trimmed === 'student' || trimmed === 'user';
}

export function formatEmailPrefixAsName(email?: string | null): string {
  if (!email || !email.includes('@')) return '';
  const prefix = email.split('@')[0].trim();
  if (!prefix) return '';
  // Convert e.g. "john.doe_99" -> "John Doe" or keep clean handle
  const cleaned = prefix.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return prefix;
  return cleaned
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export function getMonogramAvatar(nameOrEmail?: string | null, bgColor = '#4F46E5', accentColor = '#312E81'): string {
  const raw = (nameOrEmail || '').trim();
  const clean = raw.includes('@') ? raw.split('@')[0] : raw;
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  let initials = 'U';
  if (parts.length >= 2) {
    initials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  } else if (clean.length >= 2) {
    initials = clean.slice(0, 2).toUpperCase();
  } else if (clean.length === 1) {
    initials = clean.toUpperCase();
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${bgColor}"/><stop offset="100%" stop-color="${accentColor}"/></linearGradient></defs><rect width="256" height="256" rx="48" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="Plus Jakarta Sans, Outfit, system-ui, sans-serif" font-size="96" font-weight="800" letter-spacing="-2">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getCuratedMonogramPresets(nameOrEmail?: string | null) {
  const label = nameOrEmail || 'User';
  return [
    { id: 'mono-indigo', name: 'Royal Indigo', url: getMonogramAvatar(label, '#4F46E5', '#312E81') },
    { id: 'mono-emerald', name: 'Emerald Scholar', url: getMonogramAvatar(label, '#059669', '#064E3B') },
    { id: 'mono-sky', name: 'Cobalt Sky', url: getMonogramAvatar(label, '#0284C7', '#0C4A6E') },
    { id: 'mono-violet', name: 'Deep Amethyst', url: getMonogramAvatar(label, '#7C3AED', '#4C1D95') },
    { id: 'mono-amber', name: 'Warm Amber', url: getMonogramAvatar(label, '#D97706', '#78350F') },
    { id: 'mono-slate', name: 'Obsidian Slate', url: getMonogramAvatar(label, '#334155', '#0F172A') },
  ];
}

function readStoredAuthSessionSync(): { userId: string | null; email: string; meta: Record<string, any> } {
  if (typeof window === 'undefined') {
    return { userId: null, email: '', meta: {} };
  }
  try {
    // 1. Primary custom storage key configured in src/lib/supabase.ts
    const candidateKeys: string[] = ['studyweb-auth'];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token') && !candidateKeys.includes(k)) {
        candidateKeys.push(k);
      }
    }

    for (const key of candidateKeys) {
      const rawAuth = localStorage.getItem(key);
      if (!rawAuth) continue;
      try {
        const parsed = JSON.parse(rawAuth);
        const user =
          parsed?.user ||
          parsed?.currentSession?.user ||
          parsed?.session?.user ||
          (Array.isArray(parsed) ? parsed[0]?.user : null);
        if (user && typeof user === 'object' && (user.id || user.email)) {
          return {
            userId: user.id || localStorage.getItem('studyweb_active_user_id') || null,
            email: user.email || '',
            meta: user.user_metadata || {},
          };
        }
      } catch {}
    }

    const fallbackUid = localStorage.getItem('studyweb_active_user_id') || null;
    return { userId: fallbackUid, email: '', meta: {} };
  } catch {
    return { userId: null, email: '', meta: {} };
  }
}

function pickFirstNonEmpty(...values: (string | undefined | null)[]): string {
  for (const val of values) {
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

function pickFirstRealName(...values: (string | undefined | null)[]): string {
  for (const val of values) {
    if (typeof val === 'string' && val.trim().length > 0 && !isDummyName(val)) {
      return val.trim();
    }
  }
  return '';
}

export function readSyncProfileSnapshot(): ScholarProfileData {
  const { userId, email, meta } = readStoredAuthSessionSync();

  // Check explicit saved daily goal in localStorage first so fast-path never returns a stale 60m
  let explicitStoredGoal: number | undefined;
  try {
    const rawStoredGoal = Number(localStorage.getItem('studyweb_profile_daily_goal'));
    if (Number.isFinite(rawStoredGoal) && rawStoredGoal >= 5) {
      explicitStoredGoal = Math.round(rawStoredGoal);
    }
  } catch {}

  // Fast path: if in-memory cache matches current authenticated user, return immediately in 0ms
  if (
    memoryProfileCache &&
    ((userId && memoryProfileCache.userId === userId) || (!userId && !memoryProfileCache.userId)) &&
    !isDummyName(memoryProfileCache.fullName)
  ) {
    if (explicitStoredGoal !== undefined && memoryProfileCache.dailyGoalMinutes !== explicitStoredGoal) {
      memoryProfileCache = {
        ...memoryProfileCache,
        dailyGoalMinutes: explicitStoredGoal,
      };
    }
    return memoryProfileCache;
  }

  // Clean up any legacy dummy avatar or dummy name in localStorage immediately
  try {
    const legacyAv = localStorage.getItem('studyweb_profile_avatar');
    if (legacyAv && isLegacyDummyAvatar(legacyAv)) {
      localStorage.removeItem('studyweb_profile_avatar');
    }
    const legacyPic = localStorage.getItem('studyweb_profile_pic');
    if (legacyPic && isLegacyDummyAvatar(legacyPic)) {
      localStorage.removeItem('studyweb_profile_pic');
    }
    const legacyName = localStorage.getItem('studyweb_profile_name');
    if (legacyName && isDummyName(legacyName)) {
      localStorage.removeItem('studyweb_profile_name');
    }
  } catch {}

  let cached: Partial<ScholarProfileData> = {};
  try {
    const scopedRaw = userId ? localStorage.getItem(`studyweb_profile_cache_${userId}`) : null;
    if (scopedRaw) {
      cached = JSON.parse(scopedRaw) || {};
    } else {
      const latestRaw = localStorage.getItem('studyweb_profile_cache_latest');
      if (latestRaw) {
        const parsedLatest = JSON.parse(latestRaw) || {};
        // Only use latest cache if it belongs to this user or if userId is not yet known
        if (!userId || !parsedLatest.userId || parsedLatest.userId === userId) {
          cached = parsedLatest;
        }
      }
    }
  } catch {}

  const resolvedEmail = pickFirstNonEmpty(email, cached.email, meta.email);
  const emailDerivedName = formatEmailPrefixAsName(resolvedEmail);

  const fullName =
    pickFirstRealName(
      cached.fullName,
      meta.full_name,
      meta.name,
      localStorage.getItem('studyweb_profile_name'),
      emailDerivedName
    ) ||
    (resolvedEmail ? resolvedEmail.split('@')[0] : '');

  const rawAvatar = pickFirstNonEmpty(
    !isLegacyDummyAvatar(cached.avatarUrl) ? cached.avatarUrl : '',
    !isLegacyDummyAvatar(meta.avatar_url) ? meta.avatar_url : '',
    !isLegacyDummyAvatar(meta.picture) ? meta.picture : '',
    !isLegacyDummyAvatar(localStorage.getItem('studyweb_profile_avatar'))
      ? localStorage.getItem('studyweb_profile_avatar')
      : ''
  );

  // If cached avatar is a monogram for "Scholar" ("S") but we now have a real name/email, regenerate monogram with real initials
  const isStaleDefaultMonogram =
    rawAvatar.startsWith('data:image/svg+xml') &&
    decodeURIComponent(rawAvatar).includes('>S<') &&
    fullName.length > 0 &&
    !fullName.toUpperCase().startsWith('S');

  const avatarUrl =
    !rawAvatar || isStaleDefaultMonogram
      ? getMonogramAvatar(fullName || resolvedEmail || 'User')
      : rawAvatar;

  const schoolName = pickFirstNonEmpty(
    cached.schoolName,
    localStorage.getItem('studyweb_profile_school'),
    meta.school_name,
    meta.academic_institution,
    meta.school
  );

  const className = pickFirstNonEmpty(
    cached.className,
    localStorage.getItem('studyweb_profile_class'),
    localStorage.getItem('studyweb_profile_grade'),
    meta.class_name,
    meta.grade
  );

  const subject = pickFirstNonEmpty(
    cached.subject,
    localStorage.getItem('studyweb_profile_subject'),
    meta.subject
  );

  const targetAim = pickFirstNonEmpty(
    cached.targetAim,
    localStorage.getItem('studyweb_profile_aim'),
    localStorage.getItem('studyweb_profile_goal'),
    meta.target_aim,
    meta.primary_goal,
    meta.learning_goal
  );

  const studentBio = pickFirstNonEmpty(
    cached.studentBio,
    localStorage.getItem('studyweb_profile_bio'),
    meta.scholar_bio,
    meta.bio
  );

  const rawGoal =
    explicitStoredGoal ??
    (Number(cached.dailyGoalMinutes) >= 5 ? Number(cached.dailyGoalMinutes) : undefined) ??
    (Number(meta.daily_goal_minutes) >= 5 ? Number(meta.daily_goal_minutes) : undefined) ??
    60;
  const dailyGoalMinutes = Number.isFinite(Number(rawGoal)) && Number(rawGoal) >= 5 ? Math.round(Number(rawGoal)) : 60;

  const examName = pickFirstNonEmpty(
    cached.examName,
    localStorage.getItem('studyweb_profile_exam_name'),
    meta.exam_name
  );

  const storedExamDate = localStorage.getItem('studyweb_profile_exam_date');
  const examDate = pickFirstNonEmpty(
    cached.examDate,
    storedExamDate && storedExamDate !== '2026-05-15' ? storedExamDate : '',
    meta.exam_date
  );

  const activeMascot = pickFirstNonEmpty(
    cached.activeMascot,
    localStorage.getItem('studyweb_profile_mascot'),
    meta.active_mascot,
    'athena'
  );

  const voiceStyle = pickFirstNonEmpty(
    cached.voiceStyle,
    localStorage.getItem('studyweb_profile_voice_style'),
    meta.voice_style,
    'calm'
  );

  const updatedAt = pickFirstNonEmpty(cached.updatedAt, meta.updated_at, new Date().toISOString());

  const snapshot: ScholarProfileData = {
    userId: userId || cached.userId || null,
    email: resolvedEmail,
    fullName,
    avatarUrl,
    schoolName,
    className,
    subject,
    targetAim,
    studentBio,
    dailyGoalMinutes,
    examName,
    examDate,
    activeMascot,
    voiceStyle,
    updatedAt,
  };

  memoryProfileCache = snapshot;
  return snapshot;
}

export function writeLocalProfileCache(profile: ScholarProfileData): void {
  memoryProfileCache = profile;
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem('studyweb_profile_cache_latest', serialized);
    if (profile.userId) {
      localStorage.setItem(`studyweb_profile_cache_${profile.userId}`, serialized);
      localStorage.setItem('studyweb_active_user_id', profile.userId);
    }
    if (profile.fullName && !isDummyName(profile.fullName)) {
      localStorage.setItem('studyweb_profile_name', profile.fullName);
    }
    if (profile.avatarUrl && !isLegacyDummyAvatar(profile.avatarUrl)) {
      localStorage.setItem('studyweb_profile_avatar', profile.avatarUrl);
      localStorage.setItem('studyweb_profile_pic', profile.avatarUrl);
    }
    localStorage.setItem('studyweb_profile_school', profile.schoolName);
    localStorage.setItem('studyweb_profile_class', profile.className);
    localStorage.setItem('studyweb_profile_grade', profile.className);
    localStorage.setItem('studyweb_profile_subject', profile.subject);
    localStorage.setItem('studyweb_profile_aim', profile.targetAim);
    localStorage.setItem('studyweb_profile_goal', profile.targetAim);
    localStorage.setItem('studyweb_profile_bio', profile.studentBio);
    localStorage.setItem('studyweb_profile_daily_goal', String(profile.dailyGoalMinutes));
    localStorage.setItem('studyweb_profile_exam_name', profile.examName);
    localStorage.setItem('studyweb_profile_exam_date', profile.examDate);
    localStorage.setItem('studyweb_profile_mascot', profile.activeMascot);
    localStorage.setItem('studyweb_profile_voice_style', profile.voiceStyle);
  } catch (err) {
    console.warn('Local profile cache write warning:', err);
  }
}

export function clearProfileMemoryCache(): void {
  memoryProfileCache = null;
  lastRemoteFetchTime = 0;
  inflightProfilePromise = null;
}

export async function fetchAndReconcileSupabaseProfile(forceRefresh = false): Promise<{
  profile: ScholarProfileData;
  isCloudSynced: boolean;
}> {
  const localSnap = readSyncProfileSnapshot();
  if (!supabase) {
    return { profile: localSnap, isCloudSynced: false };
  }

  // Return cached profile immediately if fetched within TTL and not forced
  const now = Date.now();
  if (
    !forceRefresh &&
    memoryProfileCache &&
    memoryProfileCache.userId &&
    now - lastRemoteFetchTime < PROFILE_CACHE_TTL_MS &&
    !isDummyName(memoryProfileCache.fullName)
  ) {
    return { profile: memoryProfileCache, isCloudSynced: true };
  }

  // Deduplicate concurrent requests across Header, Home, Profile, and App
  if (!forceRefresh && inflightProfilePromise) {
    return inflightProfilePromise;
  }

  inflightProfilePromise = (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return { profile: localSnap, isCloudSynced: false };
      }

      const user = session.user;
      const meta = user.user_metadata || {};

      // Auto-heal bloated JWT user_metadata if a large data-URI avatar was previously stored in auth.users
      if (
        (typeof meta.avatar_url === 'string' && meta.avatar_url.length > 450) ||
        (typeof meta.picture === 'string' && meta.picture.length > 450)
      ) {
        supabase.auth
          .updateUser({ data: { avatar_url: null, picture: null } })
          .then(() => supabase.auth.refreshSession())
          .catch(() => {});
      }

      // Read user-scoped cache now that we definitely have user.id
      let scopedCache: Partial<ScholarProfileData> = {};
      try {
        const rawScoped = localStorage.getItem(`studyweb_profile_cache_${user.id}`);
        if (rawScoped) scopedCache = JSON.parse(rawScoped) || {};
      } catch {}

      // Query public.profiles table and server /api/profile in parallel
      let dbRow: Record<string, any> | null = null;
      let serverProfile: Record<string, any> | null = null;
      try {
        const headers: Record<string, string> = {
          'x-studyweb-user-id': user.id,
        };
        if (session.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const [supaRes, apiRes] = await Promise.allSettled([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          fetch(`/api/profile?userId=${encodeURIComponent(user.id)}`, { headers }).then((r) =>
            r.ok ? r.json() : null
          ),
        ]);
        if (supaRes.status === 'fulfilled' && !supaRes.value.error && supaRes.value.data) {
          dbRow = supaRes.value.data;
        }
        if (apiRes.status === 'fulfilled' && apiRes.value?.profile) {
          serverProfile = apiRes.value.profile;
        }
      } catch {}

      const isAccountDeleted = Boolean(
        meta.account_deleted === true || dbRow?.onboarding_data?.account_deleted === true
      );
      if (isAccountDeleted) {
        dbRow = null;
        serverProfile = null;
      }

      const email = user.email || localSnap.email || '';
      const emailFallbackName = formatEmailPrefixAsName(email) || (email ? email.split('@')[0] : '');

      // Note: StudyTrackerService updates `profiles.updated_at` every 60s when syncing study_hours,
      // so we always respect non-empty user-saved fields in scopedCache / serverProfile before falling back to dbRow or JWT metadata.
      const fullName =
        pickFirstRealName(
          scopedCache.fullName,
          serverProfile?.fullName,
          dbRow?.full_name,
          dbRow?.name,
          !isAccountDeleted ? meta.full_name : '',
          !isAccountDeleted ? meta.name : '',
          localSnap.fullName,
          emailFallbackName
        ) || emailFallbackName;

      const dbAvatar = dbRow?.avatar_url && !isLegacyDummyAvatar(dbRow.avatar_url) ? dbRow.avatar_url : '';
      const serverAvatar =
        serverProfile?.avatarUrl && !isLegacyDummyAvatar(serverProfile.avatarUrl)
          ? serverProfile.avatarUrl
          : '';
      const metaAvatar =
        meta.avatar_url && !isLegacyDummyAvatar(meta.avatar_url)
          ? meta.avatar_url
          : meta.picture && !isLegacyDummyAvatar(meta.picture)
          ? meta.picture
          : '';
      const cacheAvatar =
        scopedCache.avatarUrl && !isLegacyDummyAvatar(scopedCache.avatarUrl) ? scopedCache.avatarUrl : '';

      const resolvedAvatar = pickFirstNonEmpty(cacheAvatar, serverAvatar, dbAvatar, metaAvatar);
      const avatarUrl = resolvedAvatar || getMonogramAvatar(fullName || email || 'User');

      const schoolName = pickFirstNonEmpty(
        scopedCache.schoolName,
        serverProfile?.schoolName,
        dbRow?.school_name,
        dbRow?.academic_institution,
        dbRow?.school,
        meta.school_name,
        meta.academic_institution,
        meta.school,
        localSnap.schoolName
      );

      const className = pickFirstNonEmpty(
        scopedCache.className,
        serverProfile?.className,
        dbRow?.class_name,
        dbRow?.grade,
        meta.class_name,
        meta.grade,
        localSnap.className
      );

      const subject = pickFirstNonEmpty(
        scopedCache.subject,
        serverProfile?.subject,
        dbRow?.subject,
        meta.subject,
        localSnap.subject
      );

      const targetAim = pickFirstNonEmpty(
        scopedCache.targetAim,
        serverProfile?.targetAim,
        dbRow?.target_aim,
        dbRow?.primary_goal,
        dbRow?.learning_goal,
        meta.target_aim,
        meta.primary_goal,
        meta.learning_goal,
        localSnap.targetAim
      );

      const studentBio = pickFirstNonEmpty(
        scopedCache.studentBio,
        serverProfile?.studentBio,
        dbRow?.scholar_bio,
        dbRow?.bio,
        meta.scholar_bio,
        meta.bio,
        localSnap.studentBio
      );

      let explicitLocalGoal: number | undefined;
      try {
        const storedGoal = Number(localStorage.getItem('studyweb_profile_daily_goal'));
        if (Number.isFinite(storedGoal) && storedGoal >= 5) {
          explicitLocalGoal = Math.round(storedGoal);
        }
      } catch {}

      const rawGoal =
        explicitLocalGoal ??
        (Number(scopedCache.dailyGoalMinutes) >= 5 ? Number(scopedCache.dailyGoalMinutes) : undefined) ??
        (Number(serverProfile?.dailyGoalMinutes) >= 5 ? Number(serverProfile?.dailyGoalMinutes) : undefined) ??
        (Number(dbRow?.daily_goal_minutes) >= 5 ? Number(dbRow?.daily_goal_minutes) : undefined) ??
        (Number(meta.daily_goal_minutes) >= 5 ? Number(meta.daily_goal_minutes) : undefined) ??
        (Number(localSnap.dailyGoalMinutes) >= 5 ? Number(localSnap.dailyGoalMinutes) : undefined) ??
        60;
      const dailyGoalMinutes =
        Number.isFinite(Number(rawGoal)) && Number(rawGoal) >= 5 ? Math.round(Number(rawGoal)) : 60;

      const examName = pickFirstNonEmpty(
        scopedCache.examName,
        serverProfile?.examName,
        dbRow?.exam_name,
        meta.exam_name,
        localSnap.examName
      );

      const examDate = pickFirstNonEmpty(
        scopedCache.examDate,
        serverProfile?.examDate,
        dbRow?.exam_date,
        meta.exam_date,
        localSnap.examDate
      );

      const activeMascot = pickFirstNonEmpty(
        scopedCache.activeMascot,
        serverProfile?.activeMascot,
        meta.active_mascot,
        dbRow?.active_mascot,
        localSnap.activeMascot,
        'athena'
      );

      const voiceStyle = pickFirstNonEmpty(
        scopedCache.voiceStyle,
        serverProfile?.voiceStyle,
        meta.voice_style,
        dbRow?.voice_style,
        localSnap.voiceStyle,
        'calm'
      );

      const merged: ScholarProfileData = {
        userId: user.id,
        email,
        fullName,
        avatarUrl,
        schoolName,
        className,
        subject,
        targetAim,
        studentBio,
        dailyGoalMinutes,
        examName,
        examDate,
        activeMascot,
        voiceStyle,
        updatedAt: pickFirstNonEmpty(
          scopedCache.updatedAt,
          serverProfile?.updatedAt,
          meta.updated_at,
          dbRow?.updated_at,
          localSnap.updatedAt
        ),
      };

      lastRemoteFetchTime = Date.now();
      writeLocalProfileCache(merged);
      window.dispatchEvent(new CustomEvent('studyweb_profile_updated', { detail: merged }));
      return { profile: merged, isCloudSynced: true };
    } catch (err) {
      console.warn('Error reconciling Supabase profile:', err);
      return { profile: localSnap, isCloudSynced: false };
    } finally {
      inflightProfilePromise = null;
    }
  })();

  return inflightProfilePromise;
}

export async function saveProfileToSupabase(
  updates: Partial<ScholarProfileData>
): Promise<{ profile: ScholarProfileData; synced: boolean }> {
  const current = readSyncProfileSnapshot();
  const nowIso = new Date().toISOString();

  const merged: ScholarProfileData = {
    ...current,
    ...updates,
    updatedAt: nowIso,
  };

  if (updates.dailyGoalMinutes !== undefined && Number(updates.dailyGoalMinutes) >= 5) {
    merged.dailyGoalMinutes = Math.max(5, Math.min(720, Math.round(Number(updates.dailyGoalMinutes))));
  }

  if (!merged.fullName || isDummyName(merged.fullName)) {
    merged.fullName = formatEmailPrefixAsName(merged.email) || (merged.email ? merged.email.split('@')[0] : 'Student');
  }

  // Ensure avatar is never empty or legacy dummy
  if (!merged.avatarUrl || isLegacyDummyAvatar(merged.avatarUrl)) {
    merged.avatarUrl = getMonogramAvatar(merged.fullName || merged.email || 'User');
  }

  // 1. Write synchronously to in-memory cache + localStorage and notify listeners immediately (0ms UI update)
  lastRemoteFetchTime = Date.now();
  writeLocalProfileCache(merged);
  window.dispatchEvent(new CustomEvent('studyweb_profile_updated', { detail: merged }));

  let synced = false;
  let accessToken = '';

  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const uid = session.user.id;
        accessToken = session.access_token || '';
        merged.userId = uid;
        merged.email = session.user.email || merged.email;
        writeLocalProfileCache(merged);

        // 2. Persist compact metadata into Supabase Auth user_metadata (never store large data: URLs in JWT)
        const compactAvatarForJwt =
          merged.avatarUrl && !merged.avatarUrl.startsWith('data:') && merged.avatarUrl.length <= 450
            ? merged.avatarUrl
            : null;

        const metaPayload = {
          account_deleted: false,
          deleted_at: null,
          full_name: merged.fullName,
          name: merged.fullName,
          avatar_url: compactAvatarForJwt,
          picture: compactAvatarForJwt,
          school_name: merged.schoolName,
          academic_institution: merged.schoolName,
          school: merged.schoolName,
          class_name: merged.className,
          grade: merged.className,
          subject: merged.subject,
          target_aim: merged.targetAim,
          primary_goal: merged.targetAim,
          learning_goal: merged.targetAim,
          scholar_bio: merged.studentBio ? merged.studentBio.slice(0, 500) : '',
          bio: merged.studentBio ? merged.studentBio.slice(0, 500) : '',
          daily_goal_minutes: merged.dailyGoalMinutes,
          exam_name: merged.examName,
          exam_date: merged.examDate,
          active_mascot: merged.activeMascot,
          voice_style: merged.voiceStyle,
          updated_at: nowIso,
        };

        supabase.auth
          .updateUser({
            data: metaPayload,
          })
          .then(({ error }) => {
            if (!error) synced = true;
          })
          .catch(() => {});

        // 3. Also upsert to public.profiles with adaptive column fallback
        const candidatePayloads: Record<string, any>[] = [
          {
            id: uid,
            full_name: merged.fullName,
            avatar_url: merged.avatarUrl,
            school: merged.schoolName,
            grade: merged.className,
            subject: merged.subject,
            learning_goal: merged.targetAim,
            bio: merged.studentBio,
            daily_goal_minutes: merged.dailyGoalMinutes,
            exam_name: merged.examName,
            exam_date: merged.examDate,
            updated_at: nowIso,
          },
          {
            id: uid,
            full_name: merged.fullName,
            avatar_url: merged.avatarUrl,
            school: merged.schoolName,
            grade: merged.className,
            learning_goal: merged.targetAim,
            daily_goal_minutes: merged.dailyGoalMinutes,
            updated_at: nowIso,
          },
          {
            id: uid,
            full_name: merged.fullName,
            avatar_url: merged.avatarUrl,
            school: merged.schoolName,
            grade: merged.className,
            learning_goal: merged.targetAim,
            updated_at: nowIso,
          },
          {
            id: uid,
            full_name: merged.fullName,
            avatar_url: merged.avatarUrl,
            updated_at: nowIso,
          },
          {
            id: uid,
            full_name: merged.fullName,
            avatar_url: merged.avatarUrl,
          },
        ];

        for (const payload of candidatePayloads) {
          const { error: dbErr } = await supabase.from('profiles').upsert(payload as any);
          if (!dbErr) {
            synced = true;
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Supabase profile sync notice:', err);
    }
  }

  // 4. Always sync via resilient backend /api/profile endpoint so profile & dailyGoalMinutes persist even when client JWT is expired
  try {
    const resolvedUid = merged.userId || localStorage.getItem('studyweb_active_user_id') || '';
    if (resolvedUid) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-studyweb-user-id': resolvedUid,
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers,
        body: JSON.stringify(merged),
      });
      if (res.ok) {
        synced = true;
      }
    }
  } catch {}

  return { profile: merged, synced };
}
