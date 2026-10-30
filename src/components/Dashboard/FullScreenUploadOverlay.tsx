import React from 'react';
import { CheckCircle2, FileText, Sparkles, UploadCloud, Video, Image as ImageIcon } from 'lucide-react';

interface FullScreenUploadOverlayProps {
  isOpen: boolean;
  progress: number;
  fileName: string;
  stepText?: string;
  elapsedSeconds?: number;
  fileType?: 'pdf' | 'video' | 'image' | 'doc' | 'text' | string;
}

export const FullScreenUploadOverlay: React.FC<FullScreenUploadOverlayProps> = ({
  isOpen,
  progress,
  fileName,
  stepText = 'Indexing into workspace knowledge base...',
  elapsedSeconds,
  fileType = 'doc',
}) => {
  if (!isOpen) return null;

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const isComplete = clampedProgress >= 100;

  // Circular SVG geometry
  const size = 210;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth * 1.8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const getFileIcon = () => {
    if (fileType === 'video') return <Video className="w-4 h-4 text-sky-400 shrink-0" />;
    if (fileType === 'image') return <ImageIcon className="w-4 h-4 text-violet-400 shrink-0" />;
    if (fileType === 'pdf' || fileType === 'doc') return <FileText className="w-4 h-4 text-indigo-400 shrink-0" />;
    return <UploadCloud className="w-4 h-4 text-indigo-400 shrink-0" />;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-xl transition-opacity duration-200 animate-in fade-in"
      role="status"
      aria-live="polite"
    >
      {/* Ambient radial glow */}
      <div
        className={`pointer-events-none absolute w-[420px] h-[420px] rounded-full blur-3xl transition-colors duration-500 ${
          isComplete ? 'bg-emerald-500/20' : 'bg-indigo-600/25'
        }`}
      />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
        {/* Glowing Circular Progress Ring */}
        <div className="relative flex items-center justify-center mb-7">
          {/* Outer rotating orbital ring */}
          <div
            className={`absolute inset-[-12px] rounded-full border border-dashed transition-colors duration-500 ${
              isComplete
                ? 'border-emerald-400/40'
                : 'border-indigo-400/30 animate-[spin_8s_linear_infinite]'
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
              fill="rgba(15, 23, 42, 0.72)"
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

          {/* Center percentage & status icon */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            {isComplete ? (
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-1.5 text-emerald-400 animate-in zoom-in-75 duration-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-1.5 text-indigo-300">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
            )}

            <div className="font-mono tabular-nums text-4xl font-black tracking-tight text-white">
              {clampedProgress}%
            </div>

            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {isComplete ? 'Ready' : 'Uploading'}
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

        {/* Active Stage Text */}
        <p className="text-sm font-medium text-indigo-200/90 tracking-wide min-h-[22px]">
          {isComplete ? 'Workspace knowledge base updated!' : stepText}
        </p>

        {/* Subtle progress bar & elapsed time */}
        {typeof elapsedSeconds === 'number' && elapsedSeconds > 0 && (
          <p className="mt-2 font-mono tabular-nums text-xs text-slate-400">
            {elapsedSeconds.toFixed(1)}s elapsed
          </p>
        )}
      </div>
    </div>
  );
};
