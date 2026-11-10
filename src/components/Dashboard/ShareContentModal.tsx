import React, { useEffect } from 'react';
import { readSyncProfileSnapshot } from '../../utils/profileStorage';

export const STUDYWEB_SHARE_URL = 'https://studywebai.vercel.app';

export interface ShareContentOptions {
  type: 'ai-answer' | 'streak';
  /** AI Tutor answer content when type === 'ai-answer' */
  aiAnswerText?: string;
  /** Optional workspace or subject name for AI answer */
  workspaceName?: string;
  /** Optional user question that prompted the AI answer */
  questionText?: string;
  /** Optional generated or attached image URL in the AI Tutor answer */
  imageUrl?: string;
  /** Optional caption for the image */
  imageCaption?: string;
  /** Current streak count when type === 'streak' */
  streakCount?: number;
}

export interface ShareContentModalProps extends ShareContentOptions {
  isOpen: boolean;
  onClose: () => void;
}

// Preload StudyWeb logo (/logo-inner.png) immediately on module load so synchronous canvas rendering always has it ready
let cachedLogoImg: HTMLImageElement | null = null;
let logoLoadPromise: Promise<HTMLImageElement | null> | null = null;

function ensureLogoLoaded(): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve(null);
  }
  if (cachedLogoImg && cachedLogoImg.complete && cachedLogoImg.naturalWidth > 0) {
    return Promise.resolve(cachedLogoImg);
  }
  if (logoLoadPromise) {
    return logoLoadPromise;
  }
  logoLoadPromise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedLogoImg = img;
      resolve(img);
    };
    img.onerror = () => {
      logoLoadPromise = null;
      resolve(null);
    };
    img.src = '/logo-inner.png';
  });
  return logoLoadPromise;
}

if (typeof window !== 'undefined') {
  ensureLogoLoaded();
}

function resolveStreakUserHandle(): string {
  try {
    const profile = readSyncProfileSnapshot();
    const storedName =
      typeof window !== 'undefined' ? localStorage.getItem('studyweb_profile_name') || '' : '';
    const emailPrefix = profile.email && profile.email.includes('@')
      ? profile.email.split('@')[0].trim()
      : '';
    const candidateName = (profile.fullName || storedName || emailPrefix || 'StudyWebUser').trim();
    // Create a clean @handle without spaces (e.g. "Mohammad Rayan" -> "@MohammadRayan")
    const compactHandle = candidateName
      .replace(/^@+/, '')
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    return `@${compactHandle || emailPrefix.replace(/[^a-zA-Z0-9._-]/g, '') || 'StudyWebUser'}`;
  } catch {
    return '@StudyWebUser';
  }
}

function formatStreakCardDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Generates a high-resolution 9:16 vertical streak share image (PNG data URL)
 * matching the reference layout:
 * - StudyWeb Logo + "Study Web" header at the top
 * - Vibrant layered 3D-style streak flame in the center
 * - Oversized bold streak number + "day streak"
 * - "@username  Mon D, YYYY" footer at the bottom of the card
 */
export function generateStreakShareCardDataUrl(
  streakCount: number = 1,
  logoImg?: HTMLImageElement | null
): string {
  if (typeof document === 'undefined') return '';
  const safeStreak = Math.max(1, Math.floor(Number(streakCount) || 1));

  const canvas = document.createElement('canvas');
  const width = 900;
  const height = 1600;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Crisp white card background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Top Brand Header: StudyWeb Logo + "Study Web"
  const activeLogo =
    logoImg ??
    cachedLogoImg ??
    (typeof document !== 'undefined'
      ? (document.querySelector('img[src="/logo-inner.png"]') as HTMLImageElement | null)
      : null);

  ctx.save();
  ctx.font = '900 54px "Plus Jakarta Sans", "Nunito", "Inter", system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';

  const brandText = 'Study Web';
  const textMetrics = ctx.measureText(brandText);
  const textWidth = textMetrics.width;
  const headerY = 235;
  const logoSize = 68;
  const gap = 18;
  const totalHeaderWidth = logoSize + gap + textWidth;
  const startX = (width - totalHeaderWidth) / 2;

  let drewRasterLogo = false;
  if (activeLogo && activeLogo.complete && activeLogo.naturalWidth > 0) {
    try {
      ctx.drawImage(activeLogo, startX, headerY - logoSize / 2, logoSize, logoSize);
      drewRasterLogo = true;
    } catch {
      drewRasterLogo = false;
    }
  }

  if (!drewRasterLogo) {
    // Crisp fallback StudyWeb emblem if raster image has not decoded yet
    const emblemX = startX;
    const emblemY = headerY - logoSize / 2;
    const grad = ctx.createLinearGradient(emblemX, emblemY, emblemX + logoSize, emblemY + logoSize);
    grad.addColorStop(0, '#4F46E5');
    grad.addColorStop(1, '#311B92');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(emblemX, emblemY, logoSize, logoSize, 16);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 38px "Plus Jakarta Sans", "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('S', emblemX + logoSize / 2, headerY + 2);
  }

  ctx.font = '900 54px "Plus Jakarta Sans", "Nunito", "Inter", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#311B92';
  ctx.fillText(brandText, startX + logoSize + gap, headerY + 2);
  ctx.restore();

  // 3. Center Flame Graphic (Duolingo-inspired vibrant red-orange flame with inner highlight & base glow)
  const cx = width / 2;
  const flameTopY = 345;

  // Soft pink/red elliptical base shadow beneath the flame
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, flameTopY + 365, 108, 40, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD0D6';
  ctx.fill();
  ctx.restore();

  // Outer Main Red/Coral Flame Silhouette
  ctx.save();
  const outerGrad = ctx.createLinearGradient(cx, flameTopY, cx, flameTopY + 365);
  outerGrad.addColorStop(0, '#FF2E3B');
  outerGrad.addColorStop(0.65, '#FF2A38');
  outerGrad.addColorStop(1, '#E61E2E');

  ctx.beginPath();
  ctx.moveTo(cx, flameTopY + 365);
  ctx.bezierCurveTo(cx - 155, flameTopY + 365, cx - 165, flameTopY + 205, cx - 130, flameTopY + 80);
  ctx.quadraticCurveTo(cx - 122, flameTopY + 50, cx - 96, flameTopY + 70);
  ctx.quadraticCurveTo(cx - 70, flameTopY + 90, cx - 52, flameTopY + 66);
  ctx.quadraticCurveTo(cx - 18, flameTopY + 14, cx + 10, flameTopY);
  ctx.quadraticCurveTo(cx + 30, flameTopY - 6, cx + 46, flameTopY + 20);
  ctx.bezierCurveTo(cx + 155, flameTopY + 158, cx + 160, flameTopY + 365, cx, flameTopY + 365);
  ctx.closePath();
  ctx.fillStyle = outerGrad;
  ctx.fill();
  ctx.restore();

  // Inner Warm Orange-Gold Flame Layer
  ctx.save();
  const midGrad = ctx.createLinearGradient(cx - 86, flameTopY + 74, cx + 64, flameTopY + 335);
  midGrad.addColorStop(0, '#FFB020');
  midGrad.addColorStop(0.35, '#FF6B2B');
  midGrad.addColorStop(1, '#FF3342');

  ctx.beginPath();
  ctx.moveTo(cx, flameTopY + 340);
  ctx.bezierCurveTo(cx - 114, flameTopY + 340, cx - 126, flameTopY + 210, cx - 92, flameTopY + 118);
  ctx.quadraticCurveTo(cx - 80, flameTopY + 92, cx - 55, flameTopY + 110);
  ctx.quadraticCurveTo(cx - 14, flameTopY + 62, cx + 14, flameTopY + 80);
  ctx.bezierCurveTo(cx + 104, flameTopY + 150, cx + 112, flameTopY + 340, cx, flameTopY + 340);
  ctx.closePath();
  ctx.fillStyle = midGrad;
  ctx.fill();
  ctx.restore();

  // Deep Crimson Bottom Inner Shadow Arc inside flame base
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, flameTopY + 308, 78, 36, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#B81442';
  ctx.fill();
  ctx.restore();

  // Glossy Golden-Orange Left Highlight Ribbon
  ctx.save();
  const glossGrad = ctx.createLinearGradient(cx - 82, flameTopY + 100, cx - 10, flameTopY + 228);
  glossGrad.addColorStop(0, 'rgba(255, 214, 102, 0.92)');
  glossGrad.addColorStop(1, 'rgba(255, 115, 64, 0.15)');
  ctx.beginPath();
  ctx.moveTo(cx - 82, flameTopY + 122);
  ctx.quadraticCurveTo(cx - 30, flameTopY + 80, cx + 2, flameTopY + 108);
  ctx.quadraticCurveTo(cx - 45, flameTopY + 164, cx - 76, flameTopY + 228);
  ctx.quadraticCurveTo(cx - 100, flameTopY + 174, cx - 82, flameTopY + 122);
  ctx.closePath();
  ctx.fillStyle = glossGrad;
  ctx.fill();
  ctx.restore();

  // Center Crisp White Teardrop Core
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, flameTopY + 188);
  ctx.bezierCurveTo(cx + 48, flameTopY + 234, cx + 52, flameTopY + 302, cx, flameTopY + 302);
  ctx.bezierCurveTo(cx - 52, flameTopY + 302, cx - 48, flameTopY + 234, cx, flameTopY + 188);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // 4. Huge Bold Red Streak Number (e.g. "221")
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const streakStr = String(safeStreak);
  const numberFontSize = streakStr.length >= 4 ? 195 : 240;
  ctx.font = `900 ${numberFontSize}px "Nunito", "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#FF2A38';
  ctx.fillText(streakStr, cx, 1030);

  // 5. "day streak" label below the number
  ctx.font = '800 64px "Nunito", "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#FF2A38';
  ctx.fillText('day streak', cx, 1135);

  // 6. Bottom Footer: "@username  Mon D, YYYY" (matching the reference image)
  const userHandle = resolveStreakUserHandle();
  const formattedDate = formatStreakCardDate();
  ctx.font = '800 40px "Nunito", "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#52656D';
  ctx.fillText(`${userHandle}  ${formattedDate}`, cx, 1455);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Synchronously converts a base64 raster data URL (`data:image/png;base64,...`) into a native File
 * so `navigator.share` can be called immediately inside a click handler without losing transient user activation.
 */
function convertDataUrlToFileSync(rawImageUrl?: string, fileName = 'studyweb-streak.png'): File | null {
  if (!rawImageUrl || typeof rawImageUrl !== 'string') return null;
  const trimmedUrl = rawImageUrl.trim();
  if (
    !trimmedUrl.startsWith('data:image/') ||
    trimmedUrl.startsWith('data:image/svg') ||
    !trimmedUrl.includes(';base64,')
  ) {
    return null;
  }

  try {
    const [header, b64] = trimmedUrl.split(';base64,');
    const mimeType = header.replace('data:', '').trim() || 'image/png';
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg')
      ? 'jpg'
      : mimeType.includes('webp')
      ? 'webp'
      : 'png';
    const binaryStr = atob(b64.replace(/[\r\n\s]/g, ''));
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const cleanBaseName = fileName.replace(/\.[a-z0-9]+$/i, '');
    return new File([bytes], `${cleanBaseName}.${ext}`, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch {
    return null;
  }
}

/**
 * Converts a data URL (PNG, JPEG, WebP, or SVG diagram) or HTTP image URL
 * into a native PNG/JPEG File object supported by mobile & desktop OS share sheets.
 */
async function convertImageToShareableFile(rawImageUrl?: string, fileName = 'studyweb-streak.png'): Promise<File | null> {
  if (!rawImageUrl || typeof rawImageUrl !== 'string') return null;
  const trimmedUrl = rawImageUrl.trim();
  if (!trimmedUrl) return null;

  const syncFile = convertDataUrlToFileSync(trimmedUrl, fileName);
  if (syncFile) return syncFile;

  try {
    // Rasterize SVG diagrams or other image URLs onto an offscreen canvas as a crisp PNG File
    if (typeof document !== 'undefined') {
      const pngFile = await new Promise<File | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const timeoutId = setTimeout(() => resolve(null), 2500);

        img.onload = () => {
          clearTimeout(timeoutId);
          try {
            const width = img.naturalWidth || img.width || 960;
            const height = img.naturalHeight || img.height || 540;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (!blob) {
                resolve(null);
                return;
              }
              resolve(new File([blob], fileName, { type: 'image/png', lastModified: Date.now() }));
            }, 'image/png');
          } catch {
            resolve(null);
          }
        };

        img.onerror = () => {
          clearTimeout(timeoutId);
          resolve(null);
        };

        img.src = trimmedUrl;
      });

      if (pngFile) return pngFile;
    }

    // Fallback fetch for standard URLs
    const res = await fetch(trimmedUrl);
    if (res.ok) {
      const blob = await res.blob();
      const mimeType = blob.type && blob.type !== 'image/svg+xml' ? blob.type : 'image/png';
      return new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
    }
  } catch {
    // Ignore image conversion errors and still share the text
  }

  return null;
}

export function buildStudyWebSharePayload({
  type,
  aiAnswerText = '',
  questionText,
  imageUrl,
  streakCount = 1,
}: ShareContentOptions): { title: string; text: string; url: string; resolvedImageUrl?: string } {
  // Extract inline markdown image URL if present inside aiAnswerText
  const mdImageMatch = aiAnswerText.match(/!\[[^\]]*\]\(([^)]+)\)/);
  const resolvedImageUrl =
    type === 'streak'
      ? imageUrl || generateStreakShareCardDataUrl(streakCount)
      : imageUrl || (mdImageMatch ? mdImageMatch[1].trim() : undefined);

  const cleanAnswerText = aiAnswerText
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // remove raw markdown image syntax from text
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```(\w+)?\n?/g, '').trim())
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    // Strip any trailing duplicate StudyWeb link if already in text
    .replace(new RegExp(STUDYWEB_SHARE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    .trim();

  const text =
    type === 'ai-answer'
      ? `${questionText ? `Q: ${questionText}\n\n` : ''}${cleanAnswerText}\n\n✨ This has been generated by StudyWeb. You can check this out: ${STUDYWEB_SHARE_URL}`
      : `Study and master any subject with me for free!\nStudy Web is smart, fun, and proven to work.\nHere is my invite link:\n${STUDYWEB_SHARE_URL}`;

  const title =
    type === 'ai-answer'
      ? 'StudyWeb AI Tutor'
      : 'Study Web';

  return {
    title,
    text,
    url: STUDYWEB_SHARE_URL,
    resolvedImageUrl,
  };
}

/**
 * Triggers the native OS/device share sheet (mobile, tablet, or desktop/laptop)
 * directly from a user click gesture without showing any custom StudyWeb share screen.
 * First attaches the streak PNG image (with the StudyWeb logo, flame, and streak count),
 * and with the image attaches the integrated default text + clickable invite link.
 */
export async function triggerNativeDeviceShare(options: ShareContentOptions): Promise<void> {
  const { title, text, resolvedImageUrl } = buildStudyWebSharePayload(options);

  // Non-blocking clipboard copy so desktop apps that strip captions on file shares also have the text ready
  try {
    navigator.clipboard?.writeText(text).catch(() => {});
  } catch {
    // Ignore synchronous clipboard permission errors
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const fileName =
      options.type === 'streak'
        ? `studyweb-${options.streakCount || 1}-day-streak.png`
        : 'studyweb-visual.png';

    // 1. Synchronous fast-path for PNG/JPEG data URLs (keeps transient user gesture 100% intact for navigator.share)
    const syncImageFile = convertDataUrlToFileSync(resolvedImageUrl, fileName);
    if (syncImageFile) {
      const canShareFileWithText =
        typeof navigator.canShare !== 'function' ||
        navigator.canShare({ files: [syncImageFile], text });
      const canShareFileOnly =
        typeof navigator.canShare !== 'function' ||
        navigator.canShare({ files: [syncImageFile] });

      if (canShareFileWithText || canShareFileOnly) {
        try {
          // Pass files first and text second (without a conflicting title) so WhatsApp, Facebook, Instagram,
          // Telegram, Messages, and OS share sheets attach the image first with the integrated text as its caption.
          await navigator.share({
            files: [syncImageFile],
            text,
          });
          return;
        } catch (syncShareErr: any) {
          if (syncShareErr?.name === 'AbortError') {
            return;
          }
          if (canShareFileOnly) {
            try {
              await navigator.share({
                files: [syncImageFile],
              });
              return;
            } catch (fileOnlyErr: any) {
              if (fileOnlyErr?.name === 'AbortError') {
                return;
              }
            }
          }
        }
      }
    } else if (resolvedImageUrl) {
      // Async fallback only for non-base64 URLs (such as SVG or remote URLs)
      const asyncImageFile = await convertImageToShareableFile(resolvedImageUrl, fileName);
      if (asyncImageFile) {
        const canShareAsyncFile =
          typeof navigator.canShare !== 'function' ||
          navigator.canShare({ files: [asyncImageFile], text }) ||
          navigator.canShare({ files: [asyncImageFile] });
        if (canShareAsyncFile) {
          try {
            await navigator.share({
              files: [asyncImageFile],
              text,
            });
            return;
          } catch (fileShareErr: any) {
            if (fileShareErr?.name === 'AbortError') {
              return;
            }
          }
        }
      }
    }

    // 2. Fallback to native share with text & link
    try {
      await navigator.share({
        ...(options.type === 'ai-answer' ? { title } : {}),
        text,
      });
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
    }
  }

  // Fallback if the browser blocks Web Share API
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
  (window as any).showToast?.(
    'Invite message & link copied! You can paste it into any app on your device.',
    'success',
    3000,
    'Ready to Share'
  );
}

export const ShareContentModal: React.FC<ShareContentModalProps> = ({
  isOpen,
  onClose,
  type,
  aiAnswerText = '',
  workspaceName,
  questionText,
  imageUrl,
  imageCaption,
  streakCount = 1,
}) => {
  useEffect(() => {
    if (isOpen) {
      triggerNativeDeviceShare({
        type,
        aiAnswerText,
        workspaceName,
        questionText,
        imageUrl,
        imageCaption,
        streakCount,
      }).finally(() => {
        onClose();
      });
    }
  }, [isOpen, type, aiAnswerText, workspaceName, questionText, imageUrl, imageCaption, streakCount, onClose]);

  return null;
};



