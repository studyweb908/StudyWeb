import React, { useEffect, useRef } from 'react';
import { CheckCircle2, FileText, UploadCloud, Video, Image as ImageIcon } from 'lucide-react';
import { playGlassPopSound } from '../../utils/soundEffects';
import { StudyTrackerService } from '../../services/StudyTrackerService';
import { SuccessLottieAnimation } from '../Common/SuccessLottieAnimation';

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

      {/* Elevated Card */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_-15px_rgba(79,70,229,0.16)] dark:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.6)]">
        {/* Top Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold tracking-wide mb-5">
          {isComplete ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <img
              src="/assets/aistudio/upload_1e68f79f.svg"
              alt="Uploading"
              className="w-4 h-4 object-contain shrink-0"
            />
          )}
          <span>{isComplete ? 'Upload Complete' : 'StudyWeb Smart Upload'}</span>
        </div>

        {/* Circular Progress Ring with Upload SVG / Complete Check */}
        <div className="relative flex items-center justify-center mb-6">
          <div
            className={`absolute inset-[-8px] rounded-full border border-dashed transition-colors duration-500 ${
              isComplete
                ? 'border-emerald-300/80 dark:border-emerald-700/80'
                : 'border-indigo-200/90 dark:border-indigo-800/80 animate-[spin_12s_linear_infinite]'
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
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-100 dark:text-slate-800"
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

          {/* Center Upload Animation & Percentage */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            {isComplete ? (
              <div className="flex items-center justify-center mb-0.5">
                <SuccessLottieAnimation className="w-20 h-20 sm:w-24 sm:h-24" />
              </div>
            ) : (
              <img
                src="/assets/aistudio/upload_1e68f79f.svg"
                alt="Uploading..."
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain select-none mb-1 drop-shadow-sm"
              />
            )}

            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {clampedProgress}%
            </div>

            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {isComplete ? 'Complete' : 'Uploading'}
            </span>
          </div>
        </div>

        {/* File Name Pill */}
        <div className="inline-flex items-center gap-2 max-w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 mb-3">
          {getFileIcon()}
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[260px]">
            {fileName || 'Study Material'}
          </span>
        </div>

        {/* Active Stage Text */}
        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 tracking-tight min-h-[20px] mb-4">
          {displayStepText}
        </p>

        {/* Smooth Linear Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-5 border border-slate-200/60 dark:border-slate-700/60">
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
        <div className="w-full grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          {stages.map((stage, idx) => (
            <div
              key={stage.label}
              className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl transition-colors ${
                stage.active ? 'bg-white dark:bg-slate-800 shadow-2xs border border-slate-200/70 dark:border-slate-700' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    stage.done
                      ? 'bg-emerald-500'
                      : stage.active
                      ? 'bg-indigo-600 animate-pulse'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
                <span
                  className={`text-[10px] font-extrabold tabular-nums ${
                    stage.done
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : stage.active
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  0{idx + 1}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  stage.done
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : stage.active
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>

        {/* Elapsed time */}
        {typeof elapsedSeconds === 'number' && elapsedSeconds > 0 && (
          <p className="mt-3 font-mono tabular-nums text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            {elapsedSeconds.toFixed(1)}s elapsed
          </p>
        )}
      </div>
    </div>
  );
};
