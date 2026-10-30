import React, { useEffect, useRef } from 'react';
import { CheckCircle2, FileText, UploadCloud, Video, Image as ImageIcon } from 'lucide-react';
import { playGlassPopSound } from '../../utils/soundEffects';

interface FullScreenUploadOverlayProps {
  isOpen: boolean;
  progress: number;
  fileName: string;
  stepText?: string;
  elapsedSeconds?: number;
  fileType?: 'pdf' | 'video' | 'image' | 'doc' | 'text' | string;
}

function sanitizeUploadStepText(rawText: string, progress: number, isComplete: boolean): string {
  if (isComplete) return 'Your study material is ready!';
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
    }
  }, [isOpen, isComplete]);

  if (!isOpen) return null;

  // Circular SVG geometry
  const size = 216;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = center - strokeWidth * 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const getFileIcon = () => {
    if (fileType === 'video') return <Video className="w-4 h-4 text-sky-400 shrink-0" />;
    if (fileType === 'image') return <ImageIcon className="w-4 h-4 text-violet-400 shrink-0" />;
    if (fileType === 'pdf' || fileType === 'doc') return <FileText className="w-4 h-4 text-indigo-400 shrink-0" />;
    return <UploadCloud className="w-4 h-4 text-indigo-400 shrink-0" />;
  };

  const displayStepText = sanitizeUploadStepText(stepText, clampedProgress, isComplete);

  const stages = [
    { label: 'Uploading Material', done: clampedProgress >= 35, active: clampedProgress < 35 },
    { label: 'Analyzing Content', done: clampedProgress >= 85, active: clampedProgress >= 35 && clampedProgress < 85 },
    { label: 'Ready in Workspace', done: isComplete, active: clampedProgress >= 85 && !isComplete },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/88 backdrop-blur-2xl transition-opacity duration-200 animate-in fade-in"
      role="status"
      aria-live="polite"
    >
      {/* Ambient radial glow */}
      <div
        className={`pointer-events-none absolute w-[440px] h-[440px] rounded-full blur-3xl transition-colors duration-500 ${
          isComplete ? 'bg-emerald-500/20' : 'bg-indigo-600/25'
        }`}
      />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
        {/* Glowing Circular Progress Ring with StudyWeb Brand Mark */}
        <div className="relative flex items-center justify-center mb-7">
          {/* Outer rotating orbital ring */}
          <div
            className={`absolute inset-[-10px] rounded-full border border-dashed transition-colors duration-500 ${
              isComplete
                ? 'border-emerald-400/40'
                : 'border-indigo-400/30 animate-[spin_10s_linear_infinite]'
            }`}
          />

          {/* Secondary pulse ring */}
          <div
            className={`absolute inset-1 rounded-full transition-all duration-500 ${
              isComplete
                ? 'shadow-[0_0_60px_rgba(16,185,129,0.35)]'
                : 'shadow-[0_0_55px_rgba(99,102,241,0.35)]'
            }`}
          />

          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 drop-shadow-[0_0_16px_rgba(99,102,241,0.4)]"
          >
            <defs>
              <linearGradient id="uploadRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="uploadCompleteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>

            {/* Track circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="rgba(15, 23, 42, 0.78)"
              stroke="rgba(148, 163, 184, 0.14)"
              strokeWidth={strokeWidth}
            />

            {/* Animated progress arc */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={isComplete ? 'url(#uploadCompleteGradient)' : 'url(#uploadRingGradient)'}
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
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-1.5 text-emerald-400 animate-in zoom-in-75 duration-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-slate-900/90 border border-indigo-400/30 flex items-center justify-center mb-1.5 shadow-inner">
                <img
                  src="/logo-inner.png"
                  alt="StudyWeb"
                  className="w-6 h-6 object-contain select-none animate-pulse"
                />
              </div>
            )}

            <div className="font-mono tabular-nums text-4xl font-black tracking-tight text-white">
              {clampedProgress}%
            </div>

            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {isComplete ? 'Complete' : 'Uploading Material'}
            </span>
          </div>
        </div>

        {/* File Name Card */}
        <div className="inline-flex items-center gap-2.5 max-w-full px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-lg mb-3">
          {getFileIcon()}
          <span className="text-sm font-semibold text-slate-100 truncate max-w-[280px]">
            {fileName || 'Study Material'}
          </span>
        </div>

        {/* Active Stage Text (Never shows database/Supabase mentions) */}
        <p className="text-sm font-medium text-indigo-200/90 tracking-wide min-h-[22px] mb-5">
          {displayStepText}
        </p>

        {/* 3-Stage Live Pipeline Indicator */}
        <div className="w-full max-w-sm grid grid-cols-3 gap-2 px-3 py-2.5 rounded-xl bg-slate-900/75 border border-slate-800/80">
          {stages.map((stage, idx) => (
            <div key={stage.label} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    stage.done
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                      : stage.active
                      ? 'bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.7)]'
                      : 'bg-slate-700'
                  }`}
                />
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    stage.done
                      ? 'text-emerald-300'
                      : stage.active
                      ? 'text-white'
                      : 'text-slate-500'
                  }`}
                >
                  0{idx + 1}
                </span>
              </div>
              <span
                className={`text-[10px] font-medium leading-tight ${
                  stage.done
                    ? 'text-emerald-300/90'
                    : stage.active
                    ? 'text-indigo-200'
                    : 'text-slate-500'
                }`}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>

        {/* Elapsed time */}
        {typeof elapsedSeconds === 'number' && elapsedSeconds > 0 && (
          <p className="mt-3 font-mono tabular-nums text-xs text-slate-400">
            {elapsedSeconds.toFixed(1)}s elapsed
          </p>
        )}
      </div>
    </div>
  );
};
