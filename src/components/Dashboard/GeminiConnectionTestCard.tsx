import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  KeyRound,
  Cpu
} from 'lucide-react';
import { OCRService, GeminiConnectionStatus } from '../../services/OCRService';

export interface GeminiConnectionTestCardProps {
  /** Compact inline mode for embedding inside Scan Notes or AI Tutor Chat troubleshooting */
  compact?: boolean;
  /** Automatically run the backend check when mounted */
  autoRunOnMount?: boolean;
  /** Optional external trigger counter to force a test run */
  triggerRunCount?: number;
  /** Optional callback fired whenever a connection check completes */
  onStatusChange?: (status: GeminiConnectionStatus) => void;
}

export const GeminiConnectionTestCard: React.FC<GeminiConnectionTestCardProps> = ({
  compact = false,
  autoRunOnMount = false,
  triggerRunCount = 0,
  onStatusChange
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<GeminiConnectionStatus | null>(null);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);

  const runConnectionTest = useCallback(async () => {
    if (isTesting) return;
    setIsTesting(true);
    try {
      const result = await OCRService.verifyGeminiConnectionStatus();
      const networkError =
        !result.ok &&
        /unable to reach|timed out|network|failed to fetch/i.test(String(result.error || ''));
      setBackendReachable(!networkError);
      setStatus(result);
      setLastTestedAt(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
      onStatusChange?.(result);

      if (result.ok) {
        (window as any).showToast?.(
          `Gemini API key verified (${result.model || 'active'}${
            result.durationMs ? ` · ${result.durationMs}ms` : ''
          }). Scan Notes & AI Tutor are ready.`,
          'success',
          3500,
          'Connection Verified'
        );
      } else {
        (window as any).showToast?.(
          result.error ||
            'Gemini API key check failed. Please verify GEMINI_API_KEY in Settings > Secrets.',
          'error',
          4500,
          'Connection Check Failed'
        );
      }
    } finally {
      setIsTesting(false);
    }
  }, [isTesting, onStatusChange]);

  useEffect(() => {
    if (autoRunOnMount) {
      runConnectionTest();
    }
  }, [autoRunOnMount]);

  useEffect(() => {
    if (triggerRunCount > 0) {
      runConnectionTest();
    }
  }, [triggerRunCount]);

  const step1Passed = backendReachable === true;
  const step2Passed = status ? status.configured : null;
  const step3Passed = status ? Boolean(status.ok && status.verified !== false) : null;

  return (
    <div
      data-tour="gemini-connection-status-card"
      className={
        compact
          ? 'rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 shadow-xs text-left'
          : 'rounded-2xl sm:rounded-[28px] bg-white/90 dark:bg-slate-900/65 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-md shadow-slate-200/30 dark:shadow-none transition-colors min-w-0 space-y-4 text-left'
      }
    >
      {/* Header & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`${
                compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
              } font-bold text-slate-900 dark:text-white flex items-center gap-2`}
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">Gemini API Connection Diagnostics</span>
            </h3>

            {/* Clear Overall Pass / Fail Visual Indicator Pill */}
            {status && !isTesting && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                  status.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40'
                }`}
              >
                {status.ok ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>CONNECTED (PASS)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 shrink-0" />
                    <span>CONNECTION FAILED</span>
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Explicitly tests your backend Gemini API key validity for Scan Notes OCR summarization, Lens Q&amp;A, and AI Tutor chat.
          </p>
        </div>

        <button
          type="button"
          onClick={runConnectionTest}
          disabled={isTesting}
          className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs shrink-0"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Testing Key Validity...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>{status ? 'Re-Test Connection' : 'Test Connection'}</span>
            </>
          )}
        </button>
      </div>

      {/* 3-Step Visual Diagnostic Breakdown */}
      {(status || isTesting) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Step 1: Backend Health Route */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isTesting
                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                : step1Passed
                ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-500/30'
                : 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-500/30'
            }`}
          >
            <Server
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                isTesting
                  ? 'text-slate-400 animate-pulse'
                  : step1Passed
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                  1. Backend Server
                </span>
                {!isTesting && (
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      step1Passed
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {step1Passed ? 'Pass' : 'Fail'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isTesting
                  ? 'Checking /api/ai-health...'
                  : step1Passed
                  ? 'API health service reachable'
                  : 'Backend route unreachable'}
              </p>
            </div>
          </div>

          {/* Step 2: GEMINI_API_KEY Configuration */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isTesting
                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                : step2Passed
                ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-500/30'
                : 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-500/30'
            }`}
          >
            <KeyRound
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                isTesting
                  ? 'text-slate-400 animate-pulse'
                  : step2Passed
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                  2. API Key Secret
                </span>
                {!isTesting && (
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      step2Passed
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {step2Passed ? 'Pass' : 'Fail'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isTesting
                  ? 'Inspecting server key...'
                  : step2Passed
                  ? 'GEMINI_API_KEY detected'
                  : 'Missing or placeholder key'}
              </p>
            </div>
          </div>

          {/* Step 3: Live Gemini Model Handshake */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isTesting
                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                : step3Passed
                ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-500/30'
                : 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-500/30'
            }`}
          >
            <Cpu
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                isTesting
                  ? 'text-slate-400 animate-pulse'
                  : step3Passed
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                  3. Live Model Reply
                </span>
                {!isTesting && (
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      step3Passed
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {step3Passed ? 'Pass' : 'Fail'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {isTesting
                  ? 'Verifying model response...'
                  : step3Passed
                  ? `${status?.model || 'gemini-3-flash-preview'}${
                      status?.durationMs ? ` (${status.durationMs}ms)` : ''
                    }`
                  : 'Handshake did not complete'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Result & Troubleshooting Banner */}
      {status && !isTesting && (
        <div
          className={`rounded-2xl p-3.5 sm:p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            status.ok
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30'
              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30'
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            {status.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 space-y-1">
              <p
                className={`text-xs sm:text-sm font-bold ${
                  status.ok
                    ? 'text-emerald-900 dark:text-emerald-200'
                    : 'text-rose-900 dark:text-rose-200'
                }`}
              >
                {status.ok
                  ? 'Gemini API Key Valid & Ready for Scan Notes + AI Tutor'
                  : status.configured === false
                  ? 'Action Required: Server GEMINI_API_KEY Not Configured'
                  : 'Action Required: Gemini API Key Rejected or Unreachable'}
              </p>
              <p
                className={`text-xs leading-relaxed ${
                  status.ok
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {status.ok
                  ? `Verified live response from ${status.model || 'gemini-3-flash-preview'}${
                      status.durationMs ? ` in ${status.durationMs}ms` : ''
                    }. OCR note summaries, translations, and AI Tutor chat are operational.`
                  : `${
                      status.error || 'Could not validate GEMINI_API_KEY on the backend.'
                    } To fix Scan Notes OCR and AI Tutor chat issues, ensure a valid GEMINI_API_KEY is set in Settings > Secrets, then click Re-Test Connection.`}
              </p>
            </div>
          </div>
          {lastTestedAt && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
              Tested at {lastTestedAt}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default GeminiConnectionTestCard;
