import React, { useEffect, useRef } from 'react';
import { CheckCircle2, FileText, UploadCloud, Video, Image as ImageIcon } from 'lucide-react';
import { playGlassPopSound } from '../../utils/soundEffects';
import { StudyTrackerService } from '../../services/StudyTrackerService';

interface FullScreenUploadOverlayProps {
  isOpen: boolean;
  progress: number;
  fileName: string;
  stepText?: string;
  elapsedSeconds?: number;
  fileType?: 'pdf' | 'video' | 'image' | 'doc' | 'text' | string;
}

function sanitizeUploadStepText(rawText: string, progress: number, isComplete: boolean): string {
  if (isComplete) return 'Your study material is ready in your workspace!';
  const cleaned = (rawText || '').trim();
  if (!cleaned || /supabase|database|postgres|bucket|sql/i.test(cleaned)) {
    if (progress < 40) return 'Uploading your material...';
    if (progress < 85) return 'Analyzing your study material...';
    return 'Preparing your study material...';
  }
  return cleaned;
}

export const FullScreenUploadOverlay: React.FC<FullScreenUploadOverlayProps> = ({
  isOpen,
  progress,
  fileName,
  stepText = 'Uploading your material...',
  elapsedSeconds,
  fileType = 'doc',
}) => {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const isComplete = clampedProgress >= 100;
  const playedCompleteRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      playedCompleteRef.current = false;
      return;
    }
    if (isComplete && !playedCompleteRef.current) {
      playedCompleteRef.current = true;
      playGlassPopSound();
      try {
        StudyTrackerService.completeTodayStudyTask("You've uploaded and indexed study material today!");
      } catch {}
    }
  }, [isOpen, isComplete]);

  if (!isOpen) return null;

  // Circular SVG geometry
  const size = 188;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = center - strokeWidth * 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const getFileIcon = () => {
    if (fileType === 'video') return <Video className="w-4 h-4 text-sky-600 shrink-0" />;
    if (fileType === 'image') return <ImageIcon className="w-4 h-4 text-violet-600 shrink-0" />;
    if (fileType === 'pdf' || fileType === 'doc') return <FileText className="w-4 h-4 text-indigo-600 shrink-0" />;
    return <UploadCloud className="w-4 h-4 text-indigo-600 shrink-0" />;
  };

  const displayStepText = sanitizeUploadStepText(stepText, clampedProgress, isComplete);

  const stages = [
    { label: 'Uploading Material', done: clampedProgress >= 35, active: clampedProgress < 35 },
    { label: 'Analyzing Content', done: clampedProgress >= 85, active: clampedProgress >= 35 && clampedProgress < 85 },
    { label: 'Ready in Workspace', done: isComplete, active: clampedProgress >= 85 && !isComplete },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-white/88 backdrop-blur-2xl transition-opacity duration-200 animate-in fade-in select-none"
      role="status"
      aria-live="polite"
    >
      {/* Soft Daylight Ambient Glows */}
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[320px] rounded-full blur-3xl transition-colors duration-500 ${
          isComplete ? 'bg-emerald-200/50' : 'bg-indigo-200/60'
        }`}
      />
      <div
        className={`pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[460px] h-[280px] rounded-full blur-3xl transition-colors duration-500 ${
          isComplete ? 'bg-teal-100/50' : 'bg-violet-200/50'
        }`}
      />

      {/* Elevated Pure White Card */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_-15px_rgba(79,70,229,0.16)]">
        {/* Top Brand Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/90 border border-indigo-100 text-indigo-700 text-[11px] font-bold tracking-wide mb-5">
          <img src="/logo-inner.png" alt="StudyWeb" className="w-3.5 h-3.5 object-contain" />
          <span>{isComplete ? 'Upload Complete' : 'StudyWeb Smart Upload'}</span>
        </div>

        {/* Daylight Circular Progress Ring with StudyWeb Brand Mark */}
        <div className="relative flex items-center justify-center mb-6">
          <div
            className={`absolute inset-[-8px] rounded-full border border-dashed transition-colors duration-500 ${
              isComplete
                ? 'border-emerald-300/80'
                : 'border-indigo-200/90 animate-[spin_12s_linear_infinite]'
            }`}
          />

          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            <defs>
              <linearGradient id="whiteUploadRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="50%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#0EA5E9" />
              </linearGradient>
              <linearGradient id="whiteUploadCompleteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            {/* Light Track Circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="#F8FAFC"
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
            />

            {/* Animated Progress Arc */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={isComplete ? 'url(#whiteUploadCompleteGradient)' : 'url(#whiteUploadRingGradient)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-150 ease-out"
            />
          </svg>

          {/* Center StudyWeb Logo & Percentage */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            {isComplete ? (
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-1 text-emerald-600 animate-in zoom-in-75 duration-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center mb-1">
                <img
                  src="/logo-inner.png"
                  alt="StudyWeb"
                  className="w-6 h-6 object-contain select-none animate-pulse"
                />
              </div>
            )}

            <div className="font-mono tabular-nums text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              {clampedProgress}%
            </div>

            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {isComplete ? 'Complete' : 'Uploading'}
            </span>
          </div>
        </div>

        {/* File Name Pill */}
        <div className="inline-flex items-center gap-2 max-w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/90 mb-3">
          {getFileIcon()}
          <span className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[260px]">
            {fileName || 'Study Material'}
          </span>
        </div>

        {/* Active Stage Text */}
        <p className="text-xs sm:text-sm font-semibold text-slate-600 tracking-tight min-h-[20px] mb-4">
          {displayStepText}
        </p>

        {/* Smooth Linear Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-5 border border-slate-200/60">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500'
            }`}
            style={{ width: `${Math.max(6, clampedProgress)}%` }}
          />
        </div>

        {/* 3-Stage Live Pipeline Indicator */}
        <div className="w-full grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
          {stages.map((stage, idx) => (
            <div
              key={stage.label}
              className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl transition-colors ${
                stage.active ? 'bg-white shadow-2xs border border-slate-200/70' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    stage.done
                      ? 'bg-emerald-500'
                      : stage.active
                      ? 'bg-indigo-600 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                <span
                  className={`text-[10px] font-extrabold tabular-nums ${
                    stage.done
                      ? 'text-emerald-600'
                      : stage.active
                      ? 'text-indigo-600'
                      : 'text-slate-400'
                  }`}
                >
                  0{idx + 1}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  stage.done
                    ? 'text-emerald-700'
                    : stage.active
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>

        {/* Elapsed time */}
        {typeof elapsedSeconds === 'number' && elapsedSeconds > 0 && (
          <p className="mt-3 font-mono tabular-nums text-[11px] font-semibold text-slate-400">
            {elapsedSeconds.toFixed(1)}s elapsed
          </p>
        )}
      </div>
    </div>
  );
};
