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
  SlidersHorizontal
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Workspace, WorkspaceFile } from './WorkspaceTypes';
import { toValidUuid } from '../../utils/uuid';
import { WorkspaceSyncService } from '../../services/WorkspaceSyncService';
import { OCRService } from '../../services/OCRService';

export type ScanDocumentFilter = 'original' | 'magic_color' | 'grayscale' | 'bw';

const SCAN_FILTER_OPTIONS: Array<{
  id: ScanDocumentFilter;
  label: string;
  cssFilter: string;
}> = [
  {
    id: 'original',
    label: 'Original',
    cssFilter: 'none'
  },
  {
    id: 'magic_color',
    label: 'Magic Color',
    cssFilter: 'contrast(1.32) saturate(1.25) brightness(1.06)'
  },
  {
    id: 'grayscale',
    label: 'Grayscale',
    cssFilter: 'grayscale(1) contrast(1.38) brightness(1.05)'
  },
  {
    id: 'bw',
    label: 'B&W',
    cssFilter: 'grayscale(1) contrast(2.35) brightness(1.12)'
  }
];

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

interface CompletedScanResult {
  targetWs: Workspace;
  wsFileObj: WorkspaceFile;
  draftPayload: ScannedNoteDraftPayload;
  extractedText: string;
  title: string;
  summary: string;
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
    draftPayload: ScannedNoteDraftPayload
  ) => void;
}

/**
 * Applies the selected document readability filter (Magic Color, Grayscale, or B&W)
 * directly to the cropped canvas pixels before OCR extraction.
 */
function applyDocumentFilterToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filter: ScanDocumentFilter
) {
  if (filter === 'original' || w <= 0 || h <= 0) return;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const totalPixels = w * h;

  let lumSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    lumSum += (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
  }
  const meanLum = lumSum / Math.max(1, totalPixels);

  if (filter === 'magic_color') {
    // Whiten paper background while boosting ink contrast and color saturation
    const paperWhiteCutoff = Math.min(235, Math.max(175, meanLum * 1.12));
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      const lum = (r * 77 + g * 150 + b * 29) >> 8;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC - minC;

      if (lum >= paperWhiteCutoff && sat < 38) {
        // Clean paper background to crisp bright white
        r = Math.min(255, Math.round(r + (255 - r) * 0.72));
        g = Math.min(255, Math.round(g + (255 - g) * 0.72));
        b = Math.min(255, Math.round(b + (255 - b) * 0.72));
      } else {
        // S-curve contrast + saturation boost for ink & highlighters
        const factor = 1.32;
        r = Math.max(0, Math.min(255, Math.round((r - 128) * factor + 132)));
        g = Math.max(0, Math.min(255, Math.round((g - 128) * factor + 132)));
        b = Math.max(0, Math.min(255, Math.round((b - 128) * factor + 132)));
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  } else if (filter === 'grayscale') {
    // High-contrast monochrome grayscale for crisp pencil/pen legibility
    const contrast = 1.42;
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const lum = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
      let gray = Math.round((lum - meanLum) * contrast + 148);
      if (gray > 228) gray = Math.min(255, Math.round(gray + (255 - gray) * 0.65));
      gray = Math.max(0, Math.min(255, gray));
      data[idx] = gray;
      data[idx + 1] = gray;
      data[idx + 2] = gray;
    }
  } else if (filter === 'bw') {
    // Adaptive document thresholding for sharp black text on pure white background
    const threshold = Math.min(205, Math.max(110, meanLum * 0.92));
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const lum = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
      // Soft anti-aliased transition band around threshold so handwriting strokes stay smooth
      let bwVal: number;
      if (lum > threshold + 14) {
        bwVal = 255;
      } else if (lum < threshold - 14) {
        bwVal = 12;
      } else {
        bwVal = Math.round(((lum - (threshold - 14)) / 28) * 243 + 12);
      }
      data[idx] = bwVal;
      data[idx + 1] = bwVal;
      data[idx + 2] = bwVal;
    }
  }

  ctx.putImageData(imgData, 0, 0);
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
  // Real paper must be genuinely bright and low-saturation, standing out from the scene average
  const lumThreshold = Math.min(232, Math.max(158, Math.round(meanLum + 24)));
  const satThreshold = 65;

  const rowPaperCounts = new Uint16Array(h);
  const colPaperCounts = new Uint16Array(w);
  let paperPixelCount = 0;

  // Exclude outer 3% border noise
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
  // Reject if too small or if the entire frame is just a uniform bright wall/background
  if (coverage < 0.16 || coverage > 0.84) {
    return null;
  }

  // Find the longest contiguous vertical and horizontal span of dense paper rows/columns
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

  // Verify interior paper uniformity, exterior background contrast, AND presence of dark ink/text strokes
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

        // Detect sharp dark-ink-to-bright-paper transitions (handwriting or printed text strokes)
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
  // Require at least 64% of the candidate rectangle to be clean bright paper surface
  if (fillRatio < 0.64) {
    return null;
  }

  // Require the paper page to be distinctly brighter than the surrounding background outside the page
  const insideMeanLum = insideLumSum / boxArea;
  const outsideMeanLum = outsideCount > 0 ? outsideLumSum / outsideCount : insideMeanLum;
  if (insideMeanLum - outsideMeanLum < 24) {
    return null;
  }

  // Require genuine written/printed text or ink strokes inside the paper region
  const textStrokeRatio = textEdgeStrokeCount / boxArea;
  if (textStrokeRatio < 0.012 || textStrokeRatio > 0.35) {
    return null;
  }

  // Add a small 2% safety padding around detected paper edges so handwriting near margins is never clipped
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

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStepText, setScanStepText] = useState('Initializing camera...');
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrPreviewSnippet, setOcrPreviewSnippet] = useState<string | null>(null);
  const [autoCropEnabled, setAutoCropEnabled] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<ScanDocumentFilter>('magic_color');
  const [detectedBounds, setDetectedBounds] = useState<NormalizedDocBounds | null>(null);
  const [scanResult, setScanResult] = useState<CompletedScanResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const activeFilterConfig =
    SCAN_FILTER_OPTIONS.find((f) => f.id === selectedFilter) || SCAN_FILTER_OPTIONS[0];

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
      setCameraError('Live viewfinder is unavailable in this browser. Tap the camera button below to snap or upload your notes.');
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
      setCameraError('Camera access was blocked or not found. Tap the camera button below to scan directly from your device.');
    }
  }, [stopCameraStream]);

  useEffect(() => {
    if (isOpen && !capturedDataUrl && !isProcessing && !scanResult) {
      startCameraStream(facingMode);
    } else if (!isOpen) {
      stopCameraStream();
      setCapturedDataUrl(null);
      setIsProcessing(false);
      setScanProgress(0);
      setCameraError(null);
      setOcrPreviewSnippet(null);
      setDetectedBounds(null);
      setScanResult(null);
      setIsCopied(false);
      smoothedBoundsRef.current = null;
      stableHitCountRef.current = 0;
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode, capturedDataUrl, isProcessing, scanResult, startCameraStream, stopCameraStream]);

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

        // Only lock and show Auto-Crop UI after 3 consecutive stable detections of real paper with text
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

  const handleToggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Copy the extracted OCR text from the result view to the user's clipboard
  const handleCopyOcrText = async () => {
    const textToCopy = scanResult?.extractedText?.trim();
    if (!textToCopy) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      (window as any).showToast?.(
        'Extracted OCR text copied to clipboard!',
        'success',
        3000,
        'Copied'
      );
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      (window as any).showToast?.(
        'Could not copy text to clipboard.',
        'error',
        3000,
        'Copy Error'
      );
    }
  };

  const handleRescan = () => {
    setScanResult(null);
    setCapturedDataUrl(null);
    setOcrPreviewSnippet(null);
    setIsCopied(false);
    setScanProgress(0);
  };

  // Automatically crop to detected paper boundaries, apply selected document filter, compress, and normalize image to JPEG DataURL + Base64
  const normalizeAndCompressImage = (
    rawDataUrl: string,
    preDetectedBounds?: NormalizedDocBounds | null,
    filterToApply: ScanDocumentFilter = selectedFilter
  ): Promise<{ dataUrl: string; base64: string; sizeFormatted: string; wasCropped: boolean }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const srcW = img.width || 1200;
        const srcH = img.height || 900;

        let cropBounds: NormalizedDocBounds | null = preDetectedBounds || null;

        // If no live bounds were passed (e.g., uploaded from device photo gallery), detect paper boundaries on the static image
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

        // Apply selected readability filter (Magic Color, Grayscale, B&W)
        try {
          applyDocumentFilterToCanvas(ctx, outW, outH, filterToApply);
        } catch {}

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

  // Automatically crop via paper boundary detection, apply document filter, process via OCRService, upload, and show OCR result view
  const processAndUploadScannedImage = async (
    rawDataUrl: string,
    originalFileName?: string,
    lockedBounds?: NormalizedDocBounds | null
  ) => {
    stopCameraStream();
    setCapturedDataUrl(rawDataUrl);
    setOcrPreviewSnippet(null);
    setScanResult(null);
    setIsCopied(false);
    setIsProcessing(true);
    setScanProgress(18);
    setScanStepText(
      autoCropEnabled
        ? `Auto-cropping & applying ${activeFilterConfig.label} filter...`
        : `Applying ${activeFilterConfig.label} filter & optimizing for OCR...`
    );

    try {
      const { dataUrl, base64, sizeFormatted, wasCropped } = await normalizeAndCompressImage(
        rawDataUrl,
        lockedBounds,
        selectedFilter
      );
      // Display the cleanly auto-cropped & filtered document page in the preview
      setCapturedDataUrl(dataUrl);

      if (wasCropped) {
        setScanProgress(30);
        setScanStepText('Document page cropped & enhanced! Running OCR text extraction...');
      }

      // Resolve target workspace (activeWorkspace -> first workspace -> create new workspace)
      const targetWs: Workspace =
        activeWorkspace ||
        (workspaces.length > 0
          ? workspaces[0]
          : onCreateWorkspaceByName('Scanned Study Notes', 'Scanned Notes'));

      let resolvedUid = userId || localStorage.getItem('studyweb_active_user_id') || null;
      let accessToken: string | null = null;
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) resolvedUid = session.user.id;
          if (session?.access_token) accessToken = session.access_token;
        } catch {}
      }

      const timestampLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const defaultScanName = originalFileName
        ? originalFileName.replace(/\.[^/.]+$/, '')
        : `Scanned Notes (${dateLabel}, ${timestampLabel})`;

      // Run OCRService on the auto-cropped scanned image
      const ocrResult = await OCRService.extractTextFromNoteImage(
        {
          fileBase64: base64,
          fileMimeType: 'image/jpeg',
          defaultName: defaultScanName,
          workspaceId: targetWs.id,
          userId: resolvedUid,
          supabaseToken: accessToken,
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

      setScanProgress(88);
      setScanStepText('Saving OCR text to StudyWeb workspace...');

      const fileId = ocrResult.id || toValidUuid(`scan-${Date.now()}`);
      const resolvedName = ocrResult.title || defaultScanName;

      const wsFileObj: WorkspaceFile = {
        id: fileId,
        name: resolvedName,
        size: sizeFormatted,
        type: 'image',
        uploadDate: new Date().toISOString(),
        status: 'indexed',
        tags: ocrResult.tags,
        summary: ocrResult.summary,
        transcription: ocrResult.extractedText,
        contentText: ocrResult.extractedText,
        url: dataUrl,
        fileBase64: base64,
        fileMimeType: 'image/jpeg',
        highlights: ocrResult.highlights,
        formulas: ocrResult.formulas
      };

      const draftPayload: ScannedNoteDraftPayload = {
        id: fileId,
        name: resolvedName,
        size: sizeFormatted,
        type: 'image',
        content: ocrResult.extractedText,
        summary: ocrResult.summary,
        highlights: ocrResult.highlights,
        dataUrl,
        base64,
        mimeType: 'image/jpeg'
      };

      // Persist file with extracted OCR text to Supabase asynchronously
      WorkspaceSyncService.saveWorkspaceFile(targetWs.id, wsFileObj, resolvedUid || undefined).catch(() => {});

      setScanProgress(100);
      setScanStepText('OCR complete!');

      await new Promise((r) => setTimeout(r, 240));
      setIsProcessing(false);
      setScanResult({
        targetWs,
        wsFileObj,
        draftPayload,
        extractedText: ocrResult.extractedText || '',
        title: resolvedName,
        summary: ocrResult.summary || ''
      });
    } catch (error: any) {
      console.error('Error scanning note:', error);
      setIsProcessing(false);
      (window as any).showToast?.(
        error?.message || 'Could not process scanned note. Please try again.',
        'error',
        4500,
        'Scan Error'
      );
    }
  };

  // Capture current video frame from live camera and apply locked paper boundary crop
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
    processAndUploadScannedImage(dataUrl, undefined, detectedBounds);
  };

  // Handle photo captured via native mobile camera input or gallery picker
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processAndUploadScannedImage(reader.result, file.name, null);
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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 w-screen h-[100dvh] z-[9999] bg-black flex flex-col overflow-hidden select-none"
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

          {/* Top Full-Screen Floating Header Bar */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/90 backdrop-blur-md text-white flex items-center justify-center shadow-lg border border-white/15 shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {scanResult ? 'Scanned Note OCR Result' : 'Scan Study Notes'}
                  </h3>
                  {cameraReady && !capturedDataUrl && !scanResult && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {detectedBounds && autoCropEnabled && !capturedDataUrl && !scanResult && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[10px] font-bold text-indigo-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Paper Detected
                    </span>
                  )}
                  {scanResult && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Saved to Workspace
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-white/70 truncate">
                  {scanResult
                    ? scanResult.title
                    : detectedBounds && autoCropEnabled
                    ? 'Paper boundaries locked — tap shutter to auto-crop & scan'
                    : 'Align your notes and tap the shutter to upload to StudyWeb'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!capturedDataUrl && !isProcessing && !scanResult && (
                <button
                  type="button"
                  onClick={() => setAutoCropEnabled((prev) => !prev)}
                  className={`h-10 px-3 rounded-full border backdrop-blur-md flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    autoCropEnabled
                      ? 'bg-indigo-600/80 border-indigo-400/50 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-white/15 border-white/20 text-white/75 hover:bg-white/25'
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
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Switch Front/Back Camera"
                  aria-label="Switch Camera"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              )}

              {!isProcessing && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  aria-label="Close full-screen scanner"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Full-Screen Camera Viewport / OCR Result View */}
          <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
            {scanResult && !isProcessing ? (
              <div className="w-full h-full flex flex-col pt-20 pb-28 px-4 sm:px-8 max-w-5xl mx-auto overflow-y-auto select-text">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1 min-h-0">
                  {/* Left Column: Cropped Document Preview */}
                  <div className="lg:col-span-5 flex flex-col bg-slate-900/90 border border-white/10 rounded-3xl p-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Scanned Page ({activeFilterConfig.label})
                      </span>
                      <span className="text-[11px] font-semibold text-indigo-300 truncate max-w-[60%]">
                        {scanResult.targetWs.name}
                      </span>
                    </div>
                    <div className="relative flex-1 min-h-[180px] max-h-[340px] lg:max-h-none rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
                      {capturedDataUrl && (
                        <img
                          src={capturedDataUrl}
                          alt={scanResult.title}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                  </div>

                  {/* Right Column: Extracted OCR Text + Copy to Clipboard Button */}
                  <div className="lg:col-span-7 flex flex-col bg-slate-900/95 border border-indigo-500/30 rounded-3xl p-4 sm:p-5 overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-white truncate">
                            Extracted OCR Text
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            Ready to copy or study with AI Tutor
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyOcrText}
                        disabled={!scanResult.extractedText}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 shrink-0 ${
                          isCopied
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                            : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/40 text-white shadow-lg shadow-indigo-600/25'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy OCR Text</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex-1 min-h-[200px] overflow-y-auto rounded-2xl bg-slate-950/80 border border-white/10 p-4 text-xs sm:text-sm text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                      {scanResult.extractedText || 'No readable text was detected on this page.'}
                    </div>
                  </div>
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
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                    {/* Full-Screen Animated Laser Scan Line */}
                    <motion.div
                      animate={{ top: ['12%', '86%', '12%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_16px_#6366f1]"
                    />
                    <div className="w-16 h-16 rounded-3xl bg-indigo-600/25 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                    <p className="text-sm sm:text-base font-extrabold text-white mb-1.5">
                      {scanStepText}
                    </p>
                    <p className="text-xs text-slate-300 font-medium mb-4">
                      Uploading directly to your StudyWeb workspace &amp; AI Tutor
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
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
                          OCR Extracted Text
                        </p>
                        <p className="text-xs text-slate-200 line-clamp-3 font-medium leading-relaxed">
                          {ocrPreviewSnippet}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{ filter: activeFilterConfig.cssFilter }}
                  className={`w-full h-full object-cover transition-[filter] duration-200 ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Only show Auto-Crop boundary overlay when real paper with text is detected */}
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
                    {/* Glowing Corner Brackets on Detected Paper */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-md">
                      Auto-Crop Locked
                    </div>
                  </div>
                )}

                {/* Fallback / Initializing Message inside Full-Screen Viewfinder */}
                {!cameraReady && (
                  <div className="text-center space-y-3 z-10 p-6 max-w-sm">
                    {cameraError ? (
                      <>
                        <div className="w-14 h-14 rounded-3xl bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 flex items-center justify-center mx-auto shadow-lg">
                          <Camera className="w-7 h-7" />
                        </div>
                        <p className="text-sm sm:text-base font-extrabold text-white">
                          Ready to Scan Your Notes
                        </p>
                        <p className="text-xs text-white/70 font-medium leading-relaxed">
                          {cameraError}
                        </p>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                        <p className="text-sm font-bold text-white">Opening Full-Screen Camera...</p>
                        <p className="text-xs text-white/60 font-medium">
                          Position your handwritten or printed study notes inside the frame
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Full-Screen Dock (Result Actions vs Filter Panel + Camera Shutter) */}
          {!isProcessing && (
            <div className="absolute bottom-0 left-0 right-0 z-30 px-4 sm:px-8 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col items-center gap-3.5">
              {scanResult ? (
                <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-2xl">
                  <button
                    type="button"
                    onClick={handleRescan}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Scan Another</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyOcrText}
                    disabled={!scanResult.extractedText}
                    className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border transition-all cursor-pointer active:scale-95 ${
                      isCopied
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        : 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy OCR Text</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onScanComplete(
                        scanResult.targetWs,
                        scanResult.wsFileObj,
                        scanResult.draftPayload
                      )
                    }
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Open in AI Tutor</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Document Readability Filter Selection Panel */}
                  <div
                    role="radiogroup"
                    aria-label="Document Readability Filter"
                    className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 border border-white/15 backdrop-blur-md shadow-xl max-w-full overflow-x-auto"
                  >
                    <div className="flex items-center gap-1 pl-2 pr-1 text-[10px] font-bold uppercase tracking-wider text-white/60 shrink-0">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Filter</span>
                    </div>
                    {SCAN_FILTER_OPTIONS.map((option) => {
                      const isActive = selectedFilter === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => setSelectedFilter(option.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/35 border border-indigo-400/50'
                              : 'text-white/75 hover:text-white hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-center gap-6 sm:gap-10 w-full max-w-md">
                    {/* Gallery / Upload Photo Button */}
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 text-white/85 hover:text-white transition-all cursor-pointer active:scale-95"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wide">Upload Photo</span>
                    </button>

                    {/* Primary Circular Camera Shutter Button */}
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
                          ? 'border-emerald-400 shadow-[0_0_32px_rgba(52,211,153,0.6)]'
                          : 'border-white shadow-[0_0_30px_rgba(99,102,241,0.5)]'
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

                    {/* Native Device Camera Trigger */}
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 text-white/85 hover:text-white transition-all cursor-pointer active:scale-95"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wide">Device Camera</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
