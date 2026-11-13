import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  X,
  Upload,
  Loader2,
  SwitchCamera,
  Crop,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  RotateCcw,
  FileText,
  AlertTriangle,
  Send,
  Languages,
  Volume2,
  Square,
  FolderPlus,
  BookOpen,
  ListChecks,
  Calculator
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Workspace, WorkspaceFile } from './WorkspaceTypes';
import { toValidUuid } from '../../utils/uuid';
import { WorkspaceSyncService } from '../../services/WorkspaceSyncService';
import { OCRService, LensAskRequest } from '../../services/OCRService';

export interface ScannedNoteDraftPayload {
  id: string;
  name: string;
  size: string;
  type: 'image';
  content?: string;
  summary?: string;
  highlights?: string[];
  dataUrl: string;
  base64: string;
  mimeType: string;
}

export interface NormalizedDocBounds {
  x: number; // 0..1 left
  y: number; // 0..1 top
  width: number; // 0..1 width
  height: number; // 0..1 height
  confidence: number; // 0..1
}

interface ScannedNoteSession {
  tempId: string;
  extractedText: string;
  title: string;
  summary: string;
  highlights: string[];
  formulas: string[];
  tags: string[];
  dataUrl: string;
  base64: string;
  mimeType: string;
  sizeFormatted: string;
}

interface LensMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actionLabel?: string;
  isError?: boolean;
  retryPayload?: LensAskRequest;
}

interface CameraNoteScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  userId: string | null;
  onCreateWorkspaceByName: (name: string, subject?: string) => Workspace;
  onScanComplete: (
    targetWorkspace: Workspace,
    scannedFile: WorkspaceFile,
    draftPayload: ScannedNoteDraftPayload,
    options?: { closeAfterSave?: boolean; openInAiTutor?: boolean }
  ) => void;
}

const TRANSLATE_LANGUAGES = [
  'English',
  'Spanish',
  'Hindi',
  'French',
  'German',
  'Arabic',
  'Chinese',
  'Japanese',
  'Korean',
  'Portuguese'
];

/**
 * Cleanly formats inline bold/code text for Google Lens answers without external Markdown packages.
 */
function renderInlineSegments(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-200 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

function renderFormattedLensText(content: string): React.ReactNode {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1.5" />;
        }
        if (/^#{1,4}\s+/.test(line)) {
          const headingText = line.replace(/^#{1,4}\s+/, '');
          return (
            <h5 key={idx} className="text-sm sm:text-[15px] font-bold text-white pt-1.5">
              {renderInlineSegments(headingText)}
            </h5>
          );
        }
        if (/^[-*•]\s+/.test(line)) {
          const itemText = line.replace(/^[-*•]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-indigo-400 font-bold leading-5 select-none">•</span>
              <span className="flex-1">{renderInlineSegments(itemText)}</span>
            </div>
          );
        }
        if (/^\d+[.)]\s+/.test(line)) {
          const match = line.match(/^(\d+[.)])\s+(.*)$/);
          if (match) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-indigo-300 font-semibold tabular-nums shrink-0">{match[1]}</span>
                <span className="flex-1">{renderInlineSegments(match[2])}</span>
              </div>
            );
          }
        }
        return <p key={idx}>{renderInlineSegments(line)}</p>;
      })}
    </div>
  );
}

/**
 * Strictly detects the boundaries of a real paper document / notebook page with written or printed text
 * inside an image or video frame. Rejects blank walls, ceilings, faces, or uniform backgrounds.
 */
function detectPaperBoundsFromImageData(
  imageData: ImageData,
  w: number,
  h: number
): NormalizedDocBounds | null {
  const data = imageData.data;
  const totalPixels = w * h;
  if (totalPixels === 0) return null;

  const lum = new Uint8Array(totalPixels);
  const sat = new Uint8Array(totalPixels);
  let lumSum = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const yVal = (r * 77 + g * 150 + b * 29) >> 8;
    lum[i] = yVal;
    lumSum += yVal;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    sat[i] = maxC === 0 ? 0 : Math.round(((maxC - minC) / maxC) * 255);
  }

  const meanLum = lumSum / totalPixels;
  const lumThreshold = Math.min(232, Math.max(158, Math.round(meanLum + 24)));
  const satThreshold = 65;

  const rowPaperCounts = new Uint16Array(h);
  const colPaperCounts = new Uint16Array(w);
  let paperPixelCount = 0;

  const marginX = Math.max(3, Math.floor(w * 0.03));
  const marginY = Math.max(3, Math.floor(h * 0.03));

  for (let y = marginY; y < h - marginY; y++) {
    const rowOffset = y * w;
    for (let x = marginX; x < w - marginX; x++) {
      const i = rowOffset + x;
      if (lum[i] >= lumThreshold && sat[i] <= satThreshold) {
        rowPaperCounts[y]++;
        colPaperCounts[x]++;
        paperPixelCount++;
      }
    }
  }

  const coverage = paperPixelCount / totalPixels;
  if (coverage < 0.16 || coverage > 0.84) {
    return null;
  }

  const minRowDensity = Math.max(8, Math.floor(w * 0.28));
  const minColDensity = Math.max(8, Math.floor(h * 0.28));

  let bestTopY = -1;
  let bestBottomY = -1;
  let curStartY = -1;
  for (let y = marginY; y < h - marginY; y++) {
    if (rowPaperCounts[y] >= minRowDensity) {
      if (curStartY === -1) curStartY = y;
      if (bestTopY === -1 || y - curStartY > bestBottomY - bestTopY) {
        bestTopY = curStartY;
        bestBottomY = y;
      }
    } else {
      curStartY = -1;
    }
  }

  let bestLeftX = -1;
  let bestRightX = -1;
  let curStartX = -1;
  for (let x = marginX; x < w - marginX; x++) {
    if (colPaperCounts[x] >= minColDensity) {
      if (curStartX === -1) curStartX = x;
      if (bestLeftX === -1 || x - curStartX > bestRightX - bestLeftX) {
        bestLeftX = curStartX;
        bestRightX = x;
      }
    } else {
      curStartX = -1;
    }
  }

  if (bestTopY === -1 || bestBottomY === -1 || bestLeftX === -1 || bestRightX === -1) {
    return null;
  }

  const rawBoxW = bestRightX - bestLeftX;
  const rawBoxH = bestBottomY - bestTopY;
  if (rawBoxW < w * 0.28 || rawBoxH < h * 0.28) {
    return null;
  }

  let insidePaperCount = 0;
  let insideLumSum = 0;
  let textEdgeStrokeCount = 0;
  let outsideLumSum = 0;
  let outsideCount = 0;

  for (let y = marginY; y < h - marginY; y++) {
    const rowOffset = y * w;
    const inY = y >= bestTopY && y <= bestBottomY;
    for (let x = marginX; x < w - marginX; x++) {
      const i = rowOffset + x;
      const inBox = inY && x >= bestLeftX && x <= bestRightX;
      const pixelLum = lum[i];

      if (inBox) {
        insideLumSum += pixelLum;
        const isPaperPixel = pixelLum >= lumThreshold && sat[i] <= satThreshold;
        if (isPaperPixel) {
          insidePaperCount++;
        }

        if (x < bestRightX - 1 && y < bestBottomY - 1) {
          const rightLum = lum[i + 1];
          const downLum = lum[i + w];
          const diffH = Math.abs(pixelLum - rightLum);
          const diffV = Math.abs(pixelLum - downLum);

          if (diffH >= 34 || diffV >= 34) {
            const maxLocalLum = Math.max(pixelLum, rightLum, downLum);
            const minLocalLum = Math.min(pixelLum, rightLum, downLum);
            if (maxLocalLum >= lumThreshold && minLocalLum <= lumThreshold - 30) {
              textEdgeStrokeCount++;
            }
          }
        }
      } else {
        outsideLumSum += pixelLum;
        outsideCount++;
      }
    }
  }

  const boxArea = Math.max(1, rawBoxW * rawBoxH);
  const fillRatio = insidePaperCount / boxArea;
  if (fillRatio < 0.64) {
    return null;
  }

  const insideMeanLum = insideLumSum / boxArea;
  const outsideMeanLum = outsideCount > 0 ? outsideLumSum / outsideCount : insideMeanLum;
  if (insideMeanLum - outsideMeanLum < 24) {
    return null;
  }

  const textStrokeRatio = textEdgeStrokeCount / boxArea;
  if (textStrokeRatio < 0.012 || textStrokeRatio > 0.35) {
    return null;
  }

  const padX = Math.round(w * 0.02);
  const padY = Math.round(h * 0.02);

  const finalLeft = Math.max(0, bestLeftX - padX);
  const finalTop = Math.max(0, bestTopY - padY);
  const finalRight = Math.min(w, bestRightX + padX);
  const finalBottom = Math.min(h, bestBottomY + padY);

  const normW = (finalRight - finalLeft) / w;
  const normH = (finalBottom - finalTop) / h;

  if (normW < 0.28 || normH < 0.28 || normW > 0.94 || normH > 0.94) {
    return null;
  }

  return {
    x: finalLeft / w,
    y: finalTop / h,
    width: normW,
    height: normH,
    confidence: Math.min(0.99, Math.max(0.65, fillRatio))
  };
}

export default function CameraNoteScannerModal({
  isOpen,
  onClose,
  activeWorkspace,
  workspaces,
  userId,
  onCreateWorkspaceByName,
  onScanComplete
}: CameraNoteScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedBoundsRef = useRef<NormalizedDocBounds | null>(null);
  const stableHitCountRef = useRef<number>(0);
  const lensChatEndRef = useRef<HTMLDivElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStepText, setScanStepText] = useState('Initializing camera...');
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrPreviewSnippet, setOcrPreviewSnippet] = useState<string | null>(null);
  const [autoCropEnabled, setAutoCropEnabled] = useState<boolean>(true);
  const [detectedBounds, setDetectedBounds] = useState<NormalizedDocBounds | null>(null);
  const [scanResult, setScanResult] = useState<ScannedNoteSession | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Google Lens interactive states (stay right inside Scan Notes without leaving)
  const [lensMode, setLensMode] = useState<'ask' | 'text'>('ask');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lensMessages, setLensMessages] = useState<LensMessage[]>([]);
  const [lensQuestionInput, setLensQuestionInput] = useState('');
  const [isLensLoading, setIsLensLoading] = useState(false);

  // Translation & Read Aloud (Google Lens Text mode features)
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslationCopied, setIsTranslationCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Explicit Workspace Save Prompt State (never saves without user confirmation)
  const [isSavedToWorkspace, setIsSavedToWorkspace] = useState(false);
  const [savedWorkspaceName, setSavedWorkspaceName] = useState<string | null>(null);
  const [savePromptIntent, setSavePromptIntent] = useState<'manual' | 'close' | 'rescan' | null>(null);
  const [selectedTargetWsId, setSelectedTargetWsId] = useState<string>('__new__');
  const [isSavingToWorkspace, setIsSavingToWorkspace] = useState(false);
  const [saveWorkspaceError, setSaveWorkspaceError] = useState<string | null>(null);

  const stopSpeech = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    setIsSpeaking(false);
  }, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setDetectedBounds(null);
    smoothedBoundsRef.current = null;
    stableHitCountRef.current = 0;
  }, []);

  const startCameraStream = useCallback(async (mode: 'environment' | 'user') => {
    stopCameraStream();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live viewfinder is unavailable in this browser. Tap Upload Photo or Device Camera below to scan.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setCameraReady(true);
      }
    } catch (err: any) {
      console.warn('Camera access notice:', err?.message || err);
      setCameraError('Camera access was blocked or not found. Use Upload Photo or Device Camera below to scan notes.');
    }
  }, [stopCameraStream]);

  // Keep default workspace selection synced when workspaces or activeWorkspace change
  useEffect(() => {
    if (activeWorkspace) {
      setSelectedTargetWsId(activeWorkspace.id);
    } else if (workspaces.length > 0) {
      setSelectedTargetWsId(workspaces[0].id);
    } else {
      setSelectedTargetWsId('__new__');
    }
  }, [activeWorkspace, workspaces]);

  const resetScannerSessionState = useCallback(() => {
    stopSpeech();
    setCapturedDataUrl(null);
    setIsProcessing(false);
    setScanProgress(0);
    setCameraError(null);
    setOcrPreviewSnippet(null);
    setDetectedBounds(null);
    setScanResult(null);
    setScanError(null);
    setIsCopied(false);
    setCopiedMessageId(null);
    setLensMode('ask');
    setLensMessages([]);
    setLensQuestionInput('');
    setIsLensLoading(false);
    setTranslatedText(null);
    setTranslationError(null);
    setIsTranslating(false);
    setIsTranslationCopied(false);
    setIsSavedToWorkspace(false);
    setSavedWorkspaceName(null);
    setSavePromptIntent(null);
    setSaveWorkspaceError(null);
    smoothedBoundsRef.current = null;
    stableHitCountRef.current = 0;
  }, [stopSpeech]);

  useEffect(() => {
    if (isOpen && !capturedDataUrl && !isProcessing && !scanResult) {
      startCameraStream(facingMode);
    } else if (!isOpen) {
      stopCameraStream();
      resetScannerSessionState();
    }
    return () => {
      stopCameraStream();
      stopSpeech();
    };
  }, [
    isOpen,
    facingMode,
    capturedDataUrl,
    isProcessing,
    scanResult,
    startCameraStream,
    stopCameraStream,
    resetScannerSessionState,
    stopSpeech
  ]);

  // Real-time paper + text boundary detection loop on live camera feed (~8 FPS)
  useEffect(() => {
    if (!isOpen || !cameraReady || capturedDataUrl || isProcessing || scanResult || !autoCropEnabled) {
      setDetectedBounds(null);
      smoothedBoundsRef.current = null;
      stableHitCountRef.current = 0;
      return;
    }

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

      const sampleW = 200;
      const sampleH = Math.max(120, Math.round((video.videoHeight / video.videoWidth) * sampleW));

      if (!analysisCanvasRef.current) {
        analysisCanvasRef.current = document.createElement('canvas');
      }
      const canvas = analysisCanvasRef.current;
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, sampleW, sampleH);
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
      const rawBounds = detectPaperBoundsFromImageData(imgData, sampleW, sampleH);

      if (rawBounds) {
        const prev = smoothedBoundsRef.current;
        const isConsistentWithPrev =
          !prev ||
          (Math.abs(rawBounds.x - prev.x) < 0.14 &&
            Math.abs(rawBounds.y - prev.y) < 0.14 &&
            Math.abs(rawBounds.width - prev.width) < 0.18 &&
            Math.abs(rawBounds.height - prev.height) < 0.18);

        if (isConsistentWithPrev) {
          stableHitCountRef.current += 1;
        } else {
          stableHitCountRef.current = 1;
        }

        const alpha = 0.38;
        const next: NormalizedDocBounds = prev && isConsistentWithPrev
          ? {
              x: prev.x + (rawBounds.x - prev.x) * alpha,
              y: prev.y + (rawBounds.y - prev.y) * alpha,
              width: prev.width + (rawBounds.width - prev.width) * alpha,
              height: prev.height + (rawBounds.height - prev.height) * alpha,
              confidence: rawBounds.confidence
            }
          : rawBounds;
        smoothedBoundsRef.current = next;

        if (stableHitCountRef.current >= 3) {
          setDetectedBounds(next);
        } else {
          setDetectedBounds(null);
        }
      } else {
        stableHitCountRef.current = 0;
        smoothedBoundsRef.current = null;
        setDetectedBounds(null);
      }
    }, 125);

    return () => clearInterval(intervalId);
  }, [isOpen, cameraReady, capturedDataUrl, isProcessing, scanResult, autoCropEnabled]);

  useEffect(() => {
    if (lensMessages.length > 0) {
      lensChatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [lensMessages, isLensLoading]);

  const handleToggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const copyPlainText = async (textToCopy: string): Promise<boolean> => {
    const cleaned = textToCopy.trim();
    if (!cleaned) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleaned);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = cleaned;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      return true;
    } catch {
      return false;
    }
  };

  // Copies highlighted selection inside Scan Notes if present, otherwise full extracted OCR text.
  // NEVER saves to workspace on copy.
  const handleCopyOcrText = async () => {
    const selectionStr = typeof window !== 'undefined' ? window.getSelection()?.toString().trim() : '';
    const textToCopy = selectionStr || scanResult?.extractedText?.trim() || '';
    if (!textToCopy) return;

    const ok = await copyPlainText(textToCopy);
    if (ok) {
      setIsCopied(true);
      (window as any).showToast?.(
        selectionStr ? 'Selected text copied to clipboard!' : 'Extracted text copied to clipboard!',
        'success',
        2600,
        'Copied'
      );
      setTimeout(() => setIsCopied(false), 2200);
    } else {
      (window as any).showToast?.('Could not copy text to clipboard.', 'error', 3000, 'Copy Error');
    }
  };

  const handleToggleSpeak = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      (window as any).showToast?.('Read aloud is not supported in this browser.', 'error', 3000);
      return;
    }
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    const cleanText = textToSpeak.replace(/[#*`]/g, '').trim();
    if (!cleanText) return;
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Automatically crop to detected paper boundaries and normalize image to JPEG DataURL + Base64
  const normalizeAndCompressImage = (
    rawDataUrl: string,
    preDetectedBounds?: NormalizedDocBounds | null
  ): Promise<{ dataUrl: string; base64: string; sizeFormatted: string; wasCropped: boolean }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const srcW = img.width || 1200;
        const srcH = img.height || 900;

        let cropBounds: NormalizedDocBounds | null = preDetectedBounds || null;

        if (autoCropEnabled && !cropBounds) {
          try {
            const detectW = 240;
            const detectH = Math.max(140, Math.round((srcH / srcW) * detectW));
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = detectW;
            tempCanvas.height = detectH;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.drawImage(img, 0, 0, detectW, detectH);
              const imgData = tempCtx.getImageData(0, 0, detectW, detectH);
              cropBounds = detectPaperBoundsFromImageData(imgData, detectW, detectH);
            }
          } catch {}
        }

        const sx = autoCropEnabled && cropBounds ? Math.round(cropBounds.x * srcW) : 0;
        const sy = autoCropEnabled && cropBounds ? Math.round(cropBounds.y * srcH) : 0;
        const sw = autoCropEnabled && cropBounds ? Math.round(cropBounds.width * srcW) : srcW;
        const sh = autoCropEnabled && cropBounds ? Math.round(cropBounds.height * srcH) : srcH;

        const maxDim = 1400;
        let outW = sw;
        let outH = sh;
        if (outW > maxDim || outH > maxDim) {
          if (outW >= outH) {
            outH = Math.round((outH * maxDim) / outW);
            outW = maxDim;
          } else {
            outW = Math.round((outW * maxDim) / outH);
            outH = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallbackB64 = rawDataUrl.split(';base64,')[1] || '';
          const kb = Math.max(1, Math.round((fallbackB64.length * 0.75) / 1024));
          resolve({ dataUrl: rawDataUrl, base64: fallbackB64, sizeFormatted: `${kb} KB`, wasCropped: false });
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

        let outUrl = canvas.toDataURL('image/jpeg', 0.84);
        if (outUrl.length > 290_000) {
          outUrl = canvas.toDataURL('image/jpeg', 0.66);
        }
        const b64 = outUrl.split(';base64,')[1] || '';
        const kb = Math.max(1, Math.round((b64.length * 0.75) / 1024));
        resolve({
          dataUrl: outUrl,
          base64: b64,
          sizeFormatted: `${kb} KB`,
          wasCropped: Boolean(autoCropEnabled && cropBounds)
        });
      };
      img.onerror = () => {
        const fallbackB64 = rawDataUrl.split(';base64,')[1] || '';
        const kb = Math.max(1, Math.round((fallbackB64.length * 0.75) / 1024));
        resolve({ dataUrl: rawDataUrl, base64: fallbackB64, sizeFormatted: `${kb} KB`, wasCropped: false });
      };
      img.src = rawDataUrl;
    });
  };

  // Scan and extract OCR text ONLY — never automatically saves to any workspace.
  const processScannedImage = async (
    rawDataUrl: string,
    originalFileName?: string,
    lockedBounds?: NormalizedDocBounds | null
  ) => {
    stopCameraStream();
    stopSpeech();
    setCapturedDataUrl(rawDataUrl);
    setOcrPreviewSnippet(null);
    setScanResult(null);
    setScanError(null);
    setIsCopied(false);
    setLensMessages([]);
    setTranslatedText(null);
    setTranslationError(null);
    setIsSavedToWorkspace(false);
    setSavedWorkspaceName(null);
    setSavePromptIntent(null);
    setIsProcessing(true);
    setScanProgress(20);
    setScanStepText(
      autoCropEnabled
        ? 'Detecting boundaries & preparing Lens scan...'
        : 'Preparing scanned note for Lens...'
    );

    try {
      const { dataUrl, base64, sizeFormatted, wasCropped } = await normalizeAndCompressImage(
        rawDataUrl,
        lockedBounds
      );
      setCapturedDataUrl(dataUrl);

      if (wasCropped) {
        setScanProgress(35);
        setScanStepText('Page cropped! Reading text & content with Lens...');
      }

      const timestampLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const defaultScanName = originalFileName
        ? originalFileName.replace(/\.[^/.]+$/, '')
        : `Scanned Notes (${dateLabel}, ${timestampLabel})`;

      const ocrResult = await OCRService.extractTextFromNoteImage(
        {
          fileBase64: base64,
          fileMimeType: 'image/jpeg',
          defaultName: defaultScanName,
          sizeFormatted
        },
        (progress, stepText) => {
          setScanProgress(progress);
          setScanStepText(stepText);
        }
      );

      if (ocrResult.extractedText) {
        const previewClean = ocrResult.extractedText
          .replace(/^#+\s+/gm, '')
          .replace(/\n+/g, ' ')
          .trim()
          .slice(0, 140);
        if (previewClean) {
          setOcrPreviewSnippet(previewClean + (ocrResult.extractedText.length > 140 ? '...' : ''));
        }
      }

      const tempId = ocrResult.id || toValidUuid(`scan-${Date.now()}`);
      const resolvedName = ocrResult.title || defaultScanName;

      setScanProgress(100);
      setScanStepText('Scan ready in Lens!');
      await new Promise((r) => setTimeout(r, 180));

      setIsProcessing(false);
      setScanResult({
        tempId,
        extractedText: ocrResult.extractedText || '',
        title: resolvedName,
        summary: ocrResult.summary || '',
        highlights: ocrResult.highlights || [],
        formulas: ocrResult.formulas || [],
        tags: ocrResult.tags || ['Scanned Note', 'OCR Extracted'],
        dataUrl,
        base64,
        mimeType: 'image/jpeg',
        sizeFormatted
      });
    } catch (error: any) {
      console.error('Error scanning note:', error);
      const errMessage = error?.message || 'Could not scan this note. Please check your image and try again.';
      setScanError(errMessage);
      setIsProcessing(false);
      (window as any).showToast?.(errMessage, 'error', 4500, 'Scan Error');
    }
  };

  // Run Google Lens interactive actions directly inside Scan Notes (no workspace upload required)
  const runLensAction = async (
    mode: 'ask' | 'solve' | 'explain' | 'summarize' | 'quiz',
    customQuestion?: string
  ) => {
    if (!scanResult || isLensLoading) return;
    const questionText = (customQuestion ?? lensQuestionInput).trim();
    if (mode === 'ask' && !questionText) return;

    const actionLabels: Record<string, string> = {
      solve: 'Solve step-by-step',
      explain: 'Explain concepts',
      summarize: 'Summarize note',
      quiz: 'Generate practice questions'
    };

    const displayPrompt = mode === 'ask' ? questionText : actionLabels[mode];
    const userMsg: LensMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: displayPrompt,
      actionLabel: mode !== 'ask' ? actionLabels[mode] : undefined
    };

    const historySnapshot = lensMessages
      .filter((m) => !m.isError)
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));

    setLensMode('ask');
    setLensMessages((prev) => [...prev, userMsg]);
    if (mode === 'ask' && customQuestion === undefined) {
      setLensQuestionInput('');
    }
    setIsLensLoading(true);

    const requestPayload: LensAskRequest = {
      fileBase64: scanResult.base64,
      fileMimeType: scanResult.mimeType,
      extractedText: scanResult.extractedText,
      question: mode === 'ask' ? questionText : undefined,
      mode,
      history: historySnapshot
    };

    try {
      const answer = await OCRService.askLensQuestion(requestPayload);
      setLensMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: answer,
          actionLabel: mode !== 'ask' ? actionLabels[mode] : undefined
        }
      ]);
    } catch (err: any) {
      const errMsg = err?.message || 'Unable to analyze this scanned image right now.';
      setLensMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: errMsg,
          isError: true,
          retryPayload: requestPayload
        }
      ]);
    } finally {
      setIsLensLoading(false);
    }
  };

  const handleRetryLensMessage = async (failedMsg: LensMessage) => {
    if (!failedMsg.retryPayload || isLensLoading) return;
    setIsLensLoading(true);
    try {
      const answer = await OCRService.askLensQuestion(failedMsg.retryPayload);
      setLensMessages((prev) =>
        prev.map((m) =>
          m.id === failedMsg.id ? { ...m, text: answer, isError: false } : m
        )
      );
    } catch (err: any) {
      setLensMessages((prev) =>
        prev.map((m) =>
          m.id === failedMsg.id
            ? { ...m, text: err?.message || 'Retry failed. Please try again.' }
            : m
        )
      );
    } finally {
      setIsLensLoading(false);
    }
  };

  const handleTranslateScan = async () => {
    if (!scanResult || isTranslating) return;
    setIsTranslating(true);
    setTranslationError(null);
    setIsTranslationCopied(false);

    try {
      const translated = await OCRService.askLensQuestion({
        fileBase64: scanResult.base64,
        fileMimeType: scanResult.mimeType,
        extractedText: scanResult.extractedText,
        mode: 'translate',
        targetLanguage
      });
      setTranslatedText(translated);
    } catch (err: any) {
      setTranslationError(err?.message || 'Could not translate the scanned text.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Explicit user-confirmed save to workspace (only triggered from the Add to Workspace prompt)
  const confirmAddToWorkspace = async (options?: { closeAfterSave?: boolean; openInAiTutor?: boolean }) => {
    if (!scanResult || isSavingToWorkspace) return;
    setIsSavingToWorkspace(true);
    setSaveWorkspaceError(null);

    try {
      let resolvedUid = userId || localStorage.getItem('studyweb_active_user_id') || null;
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) resolvedUid = session.user.id;
        } catch {}
      }

      const targetWs: Workspace =
        workspaces.find((w) => w.id === selectedTargetWsId) ||
        (selectedTargetWsId === '__new__'
          ? onCreateWorkspaceByName('Scanned Study Notes', 'Scanned Notes')
          : activeWorkspace ||
            (workspaces.length > 0
              ? workspaces[0]
              : onCreateWorkspaceByName('Scanned Study Notes', 'Scanned Notes')));

      const wsFileObj: WorkspaceFile = {
        id: scanResult.tempId,
        name: scanResult.title,
        size: scanResult.sizeFormatted,
        type: 'image',
        uploadDate: new Date().toISOString(),
        status: 'indexed',
        tags: scanResult.tags,
        summary: scanResult.summary,
        transcription: scanResult.extractedText,
        contentText: scanResult.extractedText,
        url: scanResult.dataUrl,
        fileBase64: scanResult.base64,
        fileMimeType: scanResult.mimeType,
        highlights: scanResult.highlights,
        formulas: scanResult.formulas
      };

      const draftPayload: ScannedNoteDraftPayload = {
        id: scanResult.tempId,
        name: scanResult.title,
        size: scanResult.sizeFormatted,
        type: 'image',
        content: scanResult.extractedText,
        summary: scanResult.summary,
        highlights: scanResult.highlights,
        dataUrl: scanResult.dataUrl,
        base64: scanResult.base64,
        mimeType: scanResult.mimeType
      };

      await WorkspaceSyncService.saveWorkspaceFile(
        targetWs.id,
        wsFileObj,
        resolvedUid || undefined
      ).catch((syncErr) => {
        console.warn('Workspace sync notice on scan save:', syncErr);
      });

      const intent = savePromptIntent;
      setIsSavedToWorkspace(true);
      setSavedWorkspaceName(targetWs.name);
      setSavePromptIntent(null);

      onScanComplete(targetWs, wsFileObj, draftPayload, {
        closeAfterSave: options?.closeAfterSave ?? intent === 'close',
        openInAiTutor: options?.openInAiTutor
      });

      if (intent === 'rescan') {
        resetScannerSessionState();
      }
    } catch (err: any) {
      setSaveWorkspaceError(err?.message || 'Failed to add scanned note to workspace. Please try again.');
    } finally {
      setIsSavingToWorkspace(false);
    }
  };

  // Prompt the user before closing or scanning another if the current scan has not been added to a workspace yet
  const handleAttemptClose = () => {
    if (scanResult && !isSavedToWorkspace && !isProcessing) {
      setSaveWorkspaceError(null);
      setSavePromptIntent('close');
      return;
    }
    stopSpeech();
    onClose();
  };

  const handleAttemptRescan = () => {
    if (scanResult && !isSavedToWorkspace && !isProcessing) {
      setSaveWorkspaceError(null);
      setSavePromptIntent('rescan');
      return;
    }
    resetScannerSessionState();
  };

  const handleDiscardUnsavedAndProceed = () => {
    const intent = savePromptIntent;
    setSavePromptIntent(null);
    if (intent === 'close') {
      stopSpeech();
      onClose();
    } else if (intent === 'rescan') {
      resetScannerSessionState();
    }
  };

  const handleCaptureFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    processScannedImage(dataUrl, undefined, detectedBounds);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processScannedImage(reader.result, file.name, null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`fixed inset-0 w-screen h-[100dvh] z-[9999] bg-slate-950 flex flex-col overflow-hidden ${
            scanResult ? 'select-text' : 'select-none'
          }`}
        >
          {/* Hidden Native Camera & File Inputs */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Top Floating Header Bar */}
          <div className="relative z-30 flex items-center justify-between gap-4 px-4 sm:px-6 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-3 bg-slate-950/90 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {scanResult ? scanResult.title : 'Scan Notes'}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                  {scanResult ? (
                    <>
                      <span>{scanResult.sizeFormatted}</span>
                      <span aria-hidden="true">·</span>
                      {isSavedToWorkspace ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Added to {savedWorkspaceName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">Not added to workspace yet</span>
                      )}
                    </>
                  ) : detectedBounds && autoCropEnabled ? (
                    <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Paper detected — tap shutter to scan</span>
                    </span>
                  ) : (
                    <span>Point at notes or upload a photo to extract text and ask questions</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {scanResult && !isProcessing && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyOcrText}
                    disabled={!scanResult.extractedText}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isCopied
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                        : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>

                  {!isSavedToWorkspace ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSaveWorkspaceError(null);
                        setSavePromptIntent('manual');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Add to Workspace</span>
                    </button>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold whitespace-nowrap shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </span>
                  )}
                </>
              )}

              {!capturedDataUrl && !isProcessing && !scanResult && (
                <button
                  type="button"
                  onClick={() => setAutoCropEnabled((prev) => !prev)}
                  className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    autoCropEnabled
                      ? 'bg-indigo-600/85 border-indigo-400/50 text-white'
                      : 'bg-white/10 border-white/15 text-slate-300 hover:bg-white/15'
                  }`}
                  title={autoCropEnabled ? 'Automatic Paper Cropping: ON' : 'Automatic Paper Cropping: OFF'}
                  aria-label="Toggle Automatic Document Cropping"
                >
                  <Crop className="w-4 h-4" />
                  <span className="hidden sm:inline">Auto-Crop</span>
                </button>
              )}

              {cameraReady && !capturedDataUrl && !isProcessing && !scanResult && (
                <button
                  type="button"
                  onClick={handleToggleCameraFacing}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Switch Front/Back Camera"
                  aria-label="Switch Camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}

              {!isProcessing && (
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  aria-label="Close scanner"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Main Content Area: Google Lens Result View OR Camera Viewfinder */}
          <div className="relative flex-1 w-full min-h-0 flex items-center justify-center bg-slate-950 overflow-hidden">
            {scanResult && !isProcessing ? (
              <div className="w-full h-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
                {/* Left Column: Scanned Image Preview & Detected Formulas */}
                <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
                  <div className="flex-1 min-h-[220px] max-h-[320px] lg:max-h-none rounded-2xl bg-slate-900 border border-white/10 p-3 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10 shrink-0">
                      <span className="text-xs font-semibold text-slate-300">Scanned Page</span>
                      <button
                        type="button"
                        onClick={handleAttemptRescan}
                        className="text-xs font-medium text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Scan Another</span>
                      </button>
                    </div>
                    <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-black/70 flex items-center justify-center">
                      <img
                        src={scanResult.dataUrl}
                        alt={scanResult.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {scanResult.tags.length > 0 && (
                      <p className="pt-2.5 text-xs text-slate-400 truncate">
                        {scanResult.tags.slice(0, 4).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Quick-copy detected formulas (if any) */}
                  {scanResult.formulas.length > 0 && (
                    <div className="rounded-2xl bg-slate-900 border border-white/10 p-3.5 space-y-2 shrink-0 max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-slate-300">
                        Detected Formulas (tap to copy)
                      </p>
                      <div className="space-y-1.5">
                        {scanResult.formulas.slice(0, 4).map((formula, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={async () => {
                              const ok = await copyPlainText(formula);
                              if (ok) {
                                (window as any).showToast?.('Formula copied to clipboard!', 'success', 2000);
                              }
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-white/10 text-xs font-mono text-indigo-200 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <span className="truncate">{formula}</span>
                            <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Google Lens Interactive Tabs (Ask & Solve vs Text & Translate) */}
                <div className="lg:col-span-7 flex flex-col rounded-2xl bg-slate-900 border border-white/10 min-h-[420px] lg:min-h-0 overflow-hidden">
                  {/* Google Lens Mode Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setLensMode('ask')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          lensMode === 'ask'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask &amp; Solve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLensMode('text')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          lensMode === 'text'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Text &amp; Translate</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleSpeak(
                            lensMode === 'text' && translatedText
                              ? translatedText
                              : scanResult.extractedText
                          )
                        }
                        disabled={!scanResult.extractedText}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isSpeaking
                            ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                        }`}
                      >
                        {isSpeaking ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {lensMode === 'ask' ? (
                    /* Ask & Solve Mode (Direct Google Lens Q&A + Problem Solver + Generators) */
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Quick Google Lens Actions */}
                      <div className="px-4 py-2.5 border-b border-white/10 bg-slate-950/40 flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => runLensAction('solve')}
                          disabled={isLensLoading}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-400/30 text-indigo-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Solve Step-by-Step</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => runLensAction('explain')}
                          disabled={isLensLoading}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Explain Concepts</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => runLensAction('summarize')}
                          disabled={isLensLoading}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Summarize</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => runLensAction('quiz')}
                          disabled={isLensLoading}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          <span>Practice Questions</span>
                        </button>
                      </div>

                      {/* Q&A Stream */}
                      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                        {lensMessages.length === 0 ? (
                          <div className="space-y-3 py-2">
                            <div className="rounded-xl bg-slate-950/70 border border-white/10 p-4 space-y-2">
                              <p className="text-xs sm:text-sm font-semibold text-white">
                                Ready to help directly from your scan
                              </p>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {scanResult.summary ||
                                  'Ask any question below or tap Solve Step-by-Step, Explain Concepts, Summarize, or Practice Questions without uploading to a workspace.'}
                              </p>
                            </div>
                            {scanResult.extractedText && (
                              <div className="rounded-xl bg-slate-950/50 border border-white/10 p-3.5">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="text-xs font-semibold text-slate-300">
                                    Scanned Text Preview
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setLensMode('text')}
                                    className="text-xs font-medium text-indigo-300 hover:text-indigo-200 cursor-pointer"
                                  >
                                    View &amp; Translate Full Text
                                  </button>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                                  {scanResult.extractedText}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          lensMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${
                                msg.role === 'user' ? 'items-end' : 'items-start'
                              }`}
                            >
                              {msg.role === 'user' ? (
                                <div className="max-w-[85%] rounded-2xl bg-indigo-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-sm">
                                  {msg.text}
                                </div>
                              ) : msg.isError ? (
                                <div className="w-full rounded-xl bg-rose-950/70 border border-rose-500/40 p-3.5 space-y-2">
                                  <div className="flex items-start gap-2.5">
                                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-rose-200">
                                        Could not generate answer
                                      </p>
                                      <p className="text-xs text-rose-200/90 mt-0.5 break-words">
                                        {msg.text}
                                      </p>
                                    </div>
                                  </div>
                                  {msg.retryPayload && (
                                    <button
                                      type="button"
                                      onClick={() => handleRetryLensMessage(msg)}
                                      disabled={isLensLoading}
                                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Retry</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="w-full rounded-xl bg-slate-950/80 border border-white/10 p-4 space-y-2.5">
                                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                                    <span className="text-xs font-semibold text-indigo-300">
                                      {msg.actionLabel || 'Lens Answer'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const ok = await copyPlainText(msg.text);
                                        if (ok) {
                                          setCopiedMessageId(msg.id);
                                          setTimeout(() => setCopiedMessageId(null), 2000);
                                        }
                                      }}
                                      className="text-xs font-medium text-slate-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      {copiedMessageId === msg.id ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          <span className="text-emerald-300">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  {renderFormattedLensText(msg.text)}
                                </div>
                              )}
                            </div>
                          ))
                        )}

                        {isLensLoading && (
                          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-300">
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                            <span>Analyzing your scan...</span>
                          </div>
                        )}
                        <div ref={lensChatEndRef} />
                      </div>

                      {/* Ask About This Scan Input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          runLensAction('ask');
                        }}
                        className="p-3 border-t border-white/10 bg-slate-950/60 shrink-0"
                      >
                        <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-white/15 focus-within:border-indigo-400 px-3 py-2">
                          <input
                            type="text"
                            value={lensQuestionInput}
                            onChange={(e) => setLensQuestionInput(e.target.value)}
                            placeholder="Ask a question about this scan..."
                            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none min-w-0"
                          />
                          <button
                            type="submit"
                            disabled={isLensLoading || !lensQuestionInput.trim()}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Ask</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    /* Text, Copy & Translate Mode */
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Translate & Copy Toolbar */}
                      <div className="px-4 py-2.5 border-b border-white/10 bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Languages className="w-4 h-4 text-indigo-300 shrink-0" />
                          <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            aria-label="Target translation language"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400"
                          >
                            {TRANSLATE_LANGUAGES.map((lang) => (
                              <option key={lang} value={lang}>
                                {lang}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleTranslateScan}
                            disabled={isTranslating || !scanResult.extractedText}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                          >
                            {isTranslating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Translating...</span>
                              </>
                            ) : (
                              <span>Translate Text</span>
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyOcrText}
                          disabled={!scanResult.extractedText}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                            isCopied
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                              : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy All Text</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Selectable OCR Text + Translation Area */}
                      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-2">
                            Highlight any lines to copy a selection, or tap Copy All Text above.
                          </p>
                          <div className="rounded-xl bg-slate-950/80 border border-white/10 p-4 text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap select-text">
                            {scanResult.extractedText || 'No readable text was detected on this page.'}
                          </div>
                        </div>

                        {translationError && (
                          <div className="rounded-xl bg-rose-950/70 border border-rose-500/40 p-3.5 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-rose-200">Translation Error</p>
                              <p className="text-xs text-rose-200/90 mt-0.5 break-words">{translationError}</p>
                            </div>
                          </div>
                        )}

                        {translatedText && (
                          <div className="rounded-xl bg-indigo-950/35 border border-indigo-400/30 p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                              <span className="text-xs font-semibold text-indigo-300">
                                Translation ({targetLanguage})
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await copyPlainText(translatedText);
                                  if (ok) {
                                    setIsTranslationCopied(true);
                                    setTimeout(() => setIsTranslationCopied(false), 2000);
                                  }
                                }}
                                className="text-xs font-medium text-slate-200 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                              >
                                {isTranslationCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-300">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Translation</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap select-text">
                              {translatedText}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : capturedDataUrl ? (
              <>
                <img
                  src={capturedDataUrl}
                  alt="Scanned Note Fullscreen Preview"
                  className="w-full h-full object-contain bg-black"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                    <motion.div
                      animate={{ top: ['12%', '86%', '12%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_16px_#6366f1]"
                    />
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/25 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                    <p className="text-sm sm:text-base font-bold text-white mb-1.5">
                      {scanStepText}
                    </p>
                    <p className="text-xs text-slate-300 font-medium mb-4">
                      Extracting text and preparing Lens tools (nothing is saved unless you choose)
                    </p>
                    <div className="w-64 max-w-[80vw] h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-500 rounded-full"
                        animate={{ width: `${scanProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    {ocrPreviewSnippet && (
                      <div className="mt-5 px-4 py-3 rounded-2xl bg-slate-900/90 border border-indigo-500/35 max-w-md text-left shadow-xl">
                        <p className="text-xs font-semibold text-indigo-300 mb-1">
                          Detected Text
                        </p>
                        <p className="text-xs text-slate-200 line-clamp-3 font-medium leading-relaxed">
                          {ocrPreviewSnippet}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!isProcessing && scanError && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-20">
                    <div className="w-full max-w-md rounded-2xl bg-rose-950/90 border border-rose-500/50 p-5 sm:p-6 text-left shadow-2xl space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-white">
                            Scan Error
                          </h4>
                          <p className="text-xs sm:text-sm text-rose-200 mt-1 leading-relaxed break-words">
                            {scanError}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={resetScannerSessionState}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Scan Again</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => processScannedImage(capturedDataUrl, undefined, null)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry Scan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Live Camera Viewfinder */
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
                />

                {detectedBounds && autoCropEnabled && cameraReady && (
                  <div
                    style={{
                      left: `${detectedBounds.x * 100}%`,
                      top: `${detectedBounds.y * 100}%`,
                      width: `${detectedBounds.width * 100}%`,
                      height: `${detectedBounds.height * 100}%`
                    }}
                    className="absolute border-2 border-emerald-400 bg-emerald-400/10 rounded-2xl pointer-events-none transition-all duration-150 ease-out shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  >
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[11px] font-bold whitespace-nowrap shadow-md">
                      Paper Ready
                    </div>
                  </div>
                )}

                {!cameraReady && (
                  <div className="text-center space-y-3 z-10 p-6 max-w-sm">
                    {cameraError ? (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 flex items-center justify-center mx-auto shadow-lg">
                          <Camera className="w-7 h-7" />
                        </div>
                        <p className="text-sm sm:text-base font-bold text-white">
                          Ready to Scan Your Notes
                        </p>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          {cameraError}
                        </p>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                        <p className="text-sm font-bold text-white">Opening Camera...</p>
                        <p className="text-xs text-slate-300 font-medium">
                          Position your handwritten or printed notes inside the frame
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Explicit Workspace Confirmation Prompt (always asks before saving anything to a workspace) */}
            {savePromptIntent && scanResult && (
              <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/25 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
                      <FolderPlus className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-white">
                        Add scan to workspace?
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {savePromptIntent === 'manual'
                          ? 'Choose which workspace to save this scanned image and extracted text into.'
                          : 'This scan has not been added to a workspace yet. Would you like to save it before leaving?'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="lens-target-workspace"
                      className="block text-xs font-semibold text-slate-300"
                    >
                      Destination Workspace
                    </label>
                    <select
                      id="lens-target-workspace"
                      value={selectedTargetWsId}
                      onChange={(e) => setSelectedTargetWsId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-400"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name} {ws.subject ? `(${ws.subject})` : ''}
                        </option>
                      ))}
                      <option value="__new__">+ Create new &quot;Scanned Study Notes&quot; workspace</option>
                    </select>
                  </div>

                  {saveWorkspaceError && (
                    <div className="rounded-xl bg-rose-950/80 border border-rose-500/40 p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-200">{saveWorkspaceError}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSavePromptIntent(null)}
                      disabled={isSavingToWorkspace}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    {savePromptIntent !== 'manual' && (
                      <button
                        type="button"
                        onClick={handleDiscardUnsavedAndProceed}
                        disabled={isSavingToWorkspace}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Don&apos;t Save
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        confirmAddToWorkspace({
                          closeAfterSave: savePromptIntent === 'close'
                        })
                      }
                      disabled={isSavingToWorkspace}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {isSavingToWorkspace ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>
                            {savePromptIntent === 'close'
                              ? 'Add & Close'
                              : savePromptIntent === 'rescan'
                              ? 'Add & Scan Another'
                              : 'Add to Workspace'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Shutter Bar (Shown ONLY during live camera viewfinder before a capture) */}
          {!isProcessing && !scanResult && !capturedDataUrl && (
            <div className="relative z-30 px-4 sm:px-8 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-black via-black/85 to-transparent flex items-center justify-center shrink-0">
              <div className="flex items-center justify-center gap-6 sm:gap-10 w-full max-w-md">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 text-white/85 hover:text-white transition-transform cursor-pointer active:scale-95"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold">Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (cameraReady) {
                      handleCaptureFromVideo();
                    } else {
                      nativeCameraInputRef.current?.click();
                    }
                  }}
                  aria-label="Capture and scan study notes"
                  className={`w-20 h-20 rounded-full p-1.5 border-4 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                    detectedBounds && autoCropEnabled
                      ? 'border-emerald-400 shadow-[0_0_32px_rgba(52,211,153,0.55)]'
                      : 'border-white shadow-[0_0_28px_rgba(99,102,241,0.45)]'
                  }`}
                >
                  <div
                    className={`w-full h-full rounded-full flex items-center justify-center text-white transition-colors ${
                      detectedBounds && autoCropEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    <Camera className="w-8 h-8" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 text-white/85 hover:text-white transition-transform cursor-pointer active:scale-95"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold">Device Camera</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
