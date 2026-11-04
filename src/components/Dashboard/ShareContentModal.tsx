import React, { useEffect } from 'react';

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

/**
 * Converts a data URL (PNG, JPEG, WebP, or SVG diagram) or HTTP image URL
 * into a native PNG/JPEG File object supported by mobile & desktop OS share sheets.
 */
async function convertImageToShareableFile(rawImageUrl?: string): Promise<File | null> {
  if (!rawImageUrl || typeof rawImageUrl !== 'string') return null;
  const trimmedUrl = rawImageUrl.trim();
  if (!trimmedUrl) return null;

  try {
    // 1. Direct synchronous conversion for raster base64 data URLs (image/png, image/jpeg, image/webp)
    if (
      trimmedUrl.startsWith('data:image/') &&
      !trimmedUrl.startsWith('data:image/svg') &&
      trimmedUrl.includes(';base64,')
    ) {
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
      return new File([bytes], `studyweb-visual.${ext}`, { type: mimeType });
    }

    // 2. Rasterize SVG diagrams or other image URLs onto an offscreen canvas as a crisp PNG File
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
              resolve(new File([blob], 'studyweb-diagram.png', { type: 'image/png' }));
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

    // 3. Fallback fetch for standard URLs
    const res = await fetch(trimmedUrl);
    if (res.ok) {
      const blob = await res.blob();
      const mimeType = blob.type && blob.type !== 'image/svg+xml' ? blob.type : 'image/png';
      return new File([blob], 'studyweb-visual.png', { type: mimeType });
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
  const resolvedImageUrl = imageUrl || (mdImageMatch ? mdImageMatch[1].trim() : undefined);

  const cleanAnswerText = aiAnswerText
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // remove raw markdown image syntax from text
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```(\w+)?\n?/g, '').trim())
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    // Strip any trailing duplicate StudyWeb link if already in text
    .replace(new RegExp(STUDYWEB_SHARE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    .trim();

  const defaultReview =
    'StudyWeb has transformed my daily study routine with its AI Tutor and focus tools — staying consistent with my learning goals has never been easier!';

  const text =
    type === 'ai-answer'
      ? `${questionText ? `Q: ${questionText}\n\n` : ''}${cleanAnswerText}\n\n✨ This has been generated by StudyWeb. You can check this out: ${STUDYWEB_SHARE_URL}`
      : `First of all, I have completed today's streak! 🔥 (${streakCount}-Day Study Streak on StudyWeb)\n\n⭐⭐⭐⭐⭐ My StudyWeb Review:\n"${defaultReview}"\n\nYou can check it out from here: ${STUDYWEB_SHARE_URL}`;

  const title =
    type === 'ai-answer'
      ? 'StudyWeb AI Tutor'
      : `Completed Today's ${streakCount}-Day Study Streak on StudyWeb! 🔥`;

  return {
    title,
    text,
    url: STUDYWEB_SHARE_URL,
    resolvedImageUrl,
  };
}

/**
 * Triggers the native OS/device share sheet (mobile, tablet, or desktop/laptop)
 * directly from a user click gesture without showing a custom StudyWeb share screen.
 * Sends the StudyWeb link only once (inside `text`) and includes the answer image when available.
 */
export async function triggerNativeDeviceShare(options: ShareContentOptions): Promise<void> {
  const { title, text, resolvedImageUrl } = buildStudyWebSharePayload(options);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    // 1. If the answer has an image/diagram, convert it to a File and share both the image and text
    if (resolvedImageUrl) {
      const imageFile = await convertImageToShareableFile(resolvedImageUrl);
      if (imageFile) {
        const canShareFiles =
          typeof navigator.canShare !== 'function' || navigator.canShare({ files: [imageFile] });
        if (canShareFiles) {
          try {
            // Note: Do NOT pass `url` here because `text` already contains STUDYWEB_SHARE_URL once
            await navigator.share({
              title,
              text,
              files: [imageFile],
            });
            return;
          } catch (fileShareErr: any) {
            if (fileShareErr?.name === 'AbortError') {
              return;
            }
            // Fall through to text-only native share if the chosen target app rejected file + text
          }
        }
      }
    }

    // 2. Share text (which already ends with the StudyWeb link once — do NOT pass duplicate `url` field)
    try {
      await navigator.share({
        title,
        text,
      });
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
    }
  }

  // Fallback only if the browser/iframe blocks Web Share API
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
    'Share text & link copied! You can paste it into any app on your device.',
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


