import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  X,
  RefreshCw,
  Upload,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileText,
  AlertCircle,
  SwitchCamera
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Workspace, WorkspaceFile } from './WorkspaceTypes';
import { toValidUuid } from '../../utils/uuid';
import { WorkspaceSyncService } from '../../services/WorkspaceSyncService';
import { OCRService } from '../../services/OCRService';

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

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStepText, setScanStepText] = useState('Initializing camera...');
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrPreviewSnippet, setOcrPreviewSnippet] = useState<string | null>(null);

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
  }, []);

  const startCameraStream = useCallback(async (mode: 'environment' | 'user') => {
    stopCameraStream();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live viewfinder is unavailable in this browser. Use the button below to snap or upload your notes.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1600 },
            height: { ideal: 1200 }
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
      setCameraError('Camera access was blocked or not found. Tap "Take Photo / Upload Note" below to scan directly from your device.');
    }
  }, [stopCameraStream]);

  useEffect(() => {
    if (isOpen && !capturedDataUrl && !isProcessing) {
      startCameraStream(facingMode);
    } else if (!isOpen) {
      stopCameraStream();
      setCapturedDataUrl(null);
      setIsProcessing(false);
      setScanProgress(0);
      setCameraError(null);
      setOcrPreviewSnippet(null);
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode, capturedDataUrl, isProcessing, startCameraStream, stopCameraStream]);

  const handleToggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Compress and normalize any captured/selected image to clean JPEG DataURL + Base64
  const normalizeAndCompressImage = (rawDataUrl: string): Promise<{ dataUrl: string; base64: string; sizeFormatted: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        let w = img.width || 1200;
        let h = img.height || 900;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallbackB64 = rawDataUrl.split(';base64,')[1] || '';
          const kb = Math.max(1, Math.round((fallbackB64.length * 0.75) / 1024));
          resolve({ dataUrl: rawDataUrl, base64: fallbackB64, sizeFormatted: `${kb} KB` });
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let outUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (outUrl.length > 290_000) {
          outUrl = canvas.toDataURL('image/jpeg', 0.65);
        }
        const b64 = outUrl.split(';base64,')[1] || '';
        const kb = Math.max(1, Math.round((b64.length * 0.75) / 1024));
        resolve({ dataUrl: outUrl, base64: b64, sizeFormatted: `${kb} KB` });
      };
      img.onerror = () => {
        const fallbackB64 = rawDataUrl.split(';base64,')[1] || '';
        const kb = Math.max(1, Math.round((fallbackB64.length * 0.75) / 1024));
        resolve({ dataUrl: rawDataUrl, base64: fallbackB64, sizeFormatted: `${kb} KB` });
      };
      img.src = rawDataUrl;
    });
  };

  // Automatically process via OCRService, upload, create file in workspace, and open AI Tutor
  const processAndUploadScannedImage = async (rawDataUrl: string, originalFileName?: string) => {
    stopCameraStream();
    setCapturedDataUrl(rawDataUrl);
    setOcrPreviewSnippet(null);
    setIsProcessing(true);
    setScanProgress(18);
    setScanStepText('Optimizing scanned note image for OCR...');

    try {
      const { dataUrl, base64, sizeFormatted } = await normalizeAndCompressImage(rawDataUrl);
      setCapturedDataUrl(dataUrl);

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

      // Run OCRService on the scanned image to extract full text content, summary, highlights, and formulas
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
      setScanStepText('Saving OCR text & opening AI Tutor...');

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
      setScanStepText('OCR complete! Opening AI Tutor...');

      await new Promise((r) => setTimeout(r, 320));
      setIsProcessing(false);
      onScanComplete(targetWs, wsFileObj, draftPayload);
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

  // Capture current video frame from live camera
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    processAndUploadScannedImage(dataUrl);
  };

  // Handle photo captured via native mobile camera input or gallery picker
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processAndUploadScannedImage(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isProcessing) onClose();
            }}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
          />

          {/* Scanner Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl text-left space-y-4 z-10 overflow-hidden"
          >
            {/* Top Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                    Scan Study Notes
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Snap your notes to auto-create a file &amp; ask AI Tutor
                  </p>
                </div>
              </div>

              {!isProcessing && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer shrink-0"
                  aria-label="Close scanner"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

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

            {/* Viewfinder or Processing Preview */}
            <div className="relative aspect-[4/3] w-full rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
              {capturedDataUrl ? (
                <>
                  <img
                    src={capturedDataUrl}
                    alt="Scanned Note Preview"
                    className="w-full h-full object-contain bg-slate-950"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-5 text-center">
                      {/* Animated Laser Scan Line */}
                      <motion.div
                        animate={{ top: ['10%', '88%', '10%'] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#6366f1]"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-white mb-1">
                        {scanStepText}
                      </p>
                      <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                        <motion.div
                          className="h-full bg-indigo-500 rounded-full"
                          animate={{ width: `${scanProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      {ocrPreviewSnippet && (
                        <div className="mt-3 px-3 py-2 rounded-xl bg-slate-900/90 border border-indigo-500/30 max-w-xs text-left">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">
                            OCR Extracted Text
                          </p>
                          <p className="text-[10px] text-slate-200 line-clamp-2 font-medium leading-snug">
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
                    className={`w-full h-full object-cover ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {/* Scan Framing Guides */}
                  <div className="absolute inset-4 border-2 border-dashed border-white/35 rounded-xl pointer-events-none" />

                  {/* Live Indicator & Flip Camera Button */}
                  {cameraReady && (
                    <>
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/75 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Live Camera</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleCameraFacing}
                        className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer"
                        title="Switch Front/Back Camera"
                        aria-label="Switch Camera"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Fallback / Initializing Message inside Viewfinder */}
                  {!cameraReady && (
                    <div className="text-center space-y-2.5 z-10 p-5 max-w-xs">
                      {cameraError ? (
                        <>
                          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
                            <Camera className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-white/95 leading-snug">
                            Ready to Capture Your Notes
                          </p>
                          <p className="text-[11px] text-white/65 font-medium leading-relaxed">
                            {cameraError}
                          </p>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                          <p className="text-xs font-bold text-white/90">Starting Camera...</p>
                          <p className="text-[10px] text-white/55 font-medium">
                            Align your handwritten or printed study notes inside the frame
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {cameraReady && !isProcessing && (
                <button
                  type="button"
                  onClick={handleCaptureFromVideo}
                  className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture &amp; Scan Note Now</span>
                </button>
              )}

              {!isProcessing && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !cameraReady
                        ? 'col-span-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 font-extrabold'
                        : 'border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Camera className="w-4 h-4 shrink-0" />
                    <span>{!cameraReady ? 'Open Device Camera to Scan' : 'Device Camera'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className={`py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !cameraReady ? 'col-span-2' : ''
                    }`}
                  >
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>Choose Photo from Device</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
