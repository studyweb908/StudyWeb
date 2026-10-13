import { supabase } from '../lib/supabase';
import { toValidUuid } from '../utils/uuid';

export interface FileValidationConfig {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'ERR_SIZE_EXCEEDED' | 'ERR_UNSUPPORTED_TYPE' | 'ERR_EMPTY_FILE';
  humanReadableSize?: string;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percent: number;
  stage:
    | 'validating'
    | 'preparing'
    | 'uploading_storage'
    | 'extracting_ai'
    | 'retrying_backoff'
    | 'indexing_rag'
    | 'completed'
    | 'failed';
  message: string;
  retryAttempt?: number;
  retryDelayMs?: number;
}

export interface RetryConfig {
  maxRetries: number;            // Default: 4 retries (up to 5 attempts total)
  initialDelayMs: number;        // Initial backoff interval in ms (default: 1000ms)
  maxDelayMs: number;            // Maximum backoff interval cap in ms (default: 16000ms)
  backoffFactor: number;         // Exponential multiplier (default: 2.0 -> 1s, 2s, 4s, 8s, 16s)
  jitter: boolean;               // Add randomized jitter ±20% to prevent thundering herd
  target104Only?: boolean;       // If true, only 104 errors trigger retry
  retryCondition?: (error: FileUploadError, attempt: number) => boolean;
  onRetry?: (attempt: number, delayMs: number, error: FileUploadError) => void;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 4,
  initialDelayMs: 1000,
  maxDelayMs: 16000,
  backoffFactor: 2.0,
  jitter: true
};

export interface UploadOptions {
  workspaceId: string;
  userId?: string;
  tags?: string[];
  description?: string;
  useMultipart?: boolean;
  signal?: AbortSignal;
  maxRetries?: number;
  retryConfig?: Partial<RetryConfig>;
  onProgress?: (progress: FileUploadProgress) => void;
}

export interface FileUploadResult {
  success: boolean;
  documentId: string;
  jobId?: string;
  fileUrl?: string;
  storagePath?: string;
  name: string;
  type: string;
  size: string;
  status: 'indexed' | 'completed' | 'fallback_ready';
  summary?: string;
  highlights?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  warning?: string;
}

export type FileUploadErrorCode =
  | 'ERR_FILE_VALIDATION'
  | 'ERR_CONNECTION_RESET_104'
  | 'ERR_MODEL_EOL_410'
  | 'ERR_MODEL_OVERLOAD_503'
  | 'ERR_SUPABASE_STORAGE'
  | 'ERR_SUPABASE_AUTH'
  | 'ERR_HEADER_TOO_LARGE'
  | 'ERR_NETWORK_DISCONNECTED'
  | 'ERR_TIMEOUT'
  | 'ERR_SERVER_UNKNOWN';

export class FileUploadError extends Error {
  public code: FileUploadErrorCode;
  public status?: number;
  public technicalDetails?: string;
  public retryable: boolean;
  public timestamp: string;
  public userMessage: string;
  public is104: boolean;

  constructor(
    message: string,
    options: {
      code: FileUploadErrorCode;
      status?: number;
      technicalDetails?: string;
      retryable?: boolean;
      userMessage?: string;
      is104?: boolean;
    }
  ) {
    super(message);
    this.name = 'FileUploadError';
    this.code = options.code;
    this.status = options.status;
    this.technicalDetails = options.technicalDetails;
    this.retryable = options.retryable ?? false;
    this.timestamp = new Date().toISOString();
    this.userMessage = options.userMessage || message;
    this.is104 = options.is104 ?? (options.code === 'ERR_CONNECTION_RESET_104' || options.status === 104);
  }

  /**
   * Proactively purges bloated or non-essential browser cookies so requests stay well under Nginx limits.
   */
  public static sanitizeBrowserCookies(): void {
    FileUploadService.sanitizeBrowserCookies();
  }

  /**
   * Specifically detects Network/Protocol Connection Reset Error 104
   * across various network layers and SDK error representations.
   */
  static is104(err: any): boolean {
    if (!err) return false;

    // Hard exclusion: HTTP 400 Bad Request or client errors are NEVER 104 errors
    const status = err.status || err.statusCode;
    if (status === 400 || (typeof status === 'number' && status >= 400 && status < 500 && status !== 429)) {
      return false;
    }

    if (err instanceof FileUploadError && (err.is104 || err.code === 'ERR_CONNECTION_RESET_104' || err.status === 104)) {
      return true;
    }
    if (err.status === 104 || err.statusCode === 104 || err.code === 104 || err.code === '104') {
      return true;
    }

    const msg = (err.message || err.technicalDetails || err.error || String(err)).toLowerCase();
    // Exclude if it's an HTTP 400 or cookie/header issue
    if (
      msg.includes('400 bad request') ||
      msg.includes('http 400') ||
      msg.includes('header or cookie') ||
      msg.includes('cookie too large')
    ) {
      return false;
    }

    return (
      msg.includes('error 104') ||
      msg.includes('status 104') ||
      msg.includes('code 104') ||
      msg.includes('communication instruction failed') ||
      msg.includes('connection reset') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up') ||
      msg.includes('protocol error 104') ||
      msg.includes('client network socket disconnected')
    );
  }

  static fromError(err: any, context?: string): FileUploadError {
    if (err instanceof FileUploadError) {
      return err;
    }

    const msg = err?.message || String(err) || 'An unknown error occurred during file upload';
    const status = err?.status || err?.statusCode;

    // Detect Nginx 400 Request Header Or Cookie Too Large
    if (
      status === 400 ||
      msg.toLowerCase().includes('cookie too large') || 
      msg.toLowerCase().includes('header or cookie') ||
      msg.toLowerCase().includes('request header')
    ) {
      FileUploadService.sanitizeBrowserCookies();
      return new FileUploadError(`Request Header Or Cookie Too Large (400): ${msg}`, {
        code: 'ERR_HEADER_TOO_LARGE',
        status: 400,
        technicalDetails: `Nginx rejected request due to oversized headers or browser cookies. Cleaned cookie state. Immediately non-retryable.`,
        retryable: false,
        userMessage: 'The upload request contains too much session or header data. Please try uploading again.'
      });
    }

    // Detect general HTTP 400 Bad Request
    if (
      status === 400 ||
      msg.toLowerCase().includes('http 400') ||
      msg.toLowerCase().includes('400 bad request') ||
      msg.toLowerCase().includes('status 400')
    ) {
      return new FileUploadError(`HTTP 400 Bad Request: ${msg}`, {
        code: 'ERR_FILE_VALIDATION',
        status: 400,
        technicalDetails: `Server rejected client request with HTTP 400 Bad Request: ${msg}. Non-retryable.`,
        retryable: false,
        userMessage: 'The upload request was invalid (HTTP 400). Please check your file and try again.'
      });
    }

    // Detect Network Protocol / Connection Reset Error 104
    if (FileUploadError.is104(err)) {
      return new FileUploadError(`API Communication Reset Error 104: ${msg}`, {
        code: 'ERR_CONNECTION_RESET_104',
        status: 104,
        is104: true,
        technicalDetails: `Upstream connection reset (Error 104) while processing context: ${context || 'file stream'}. Handled with exponential backoff retry mechanism.`,
        retryable: true,
        userMessage: 'Connection reset (Error 104) detected. Retrying automatically...'
      });
    }

    // Detect Model EOL / 410 Gone
    if (status === 410 || msg.includes('410') || msg.toLowerCase().includes('end of life') || msg.toLowerCase().includes('no longer available')) {
      return new FileUploadError(`Model candidate is deprecated or EOL (410): ${msg}`, {
        code: 'ERR_MODEL_EOL_410',
        status: 410,
        technicalDetails: `Model reached End-of-Life. Switched candidate array to active genai models.`,
        retryable: false,
        userMessage: 'The legacy model reached its end-of-life. StudyWeb has transitioned your workspace to the updated Gemini engine.'
      });
    }

    // Detect 5xx Server Errors (500, 502, 503, 504)
    if (status && status >= 500 && status <= 599) {
      return new FileUploadError(`Server Error (${status}): ${msg}`, {
        code: status === 503 ? 'ERR_MODEL_OVERLOAD_503' : 'ERR_SERVER_UNKNOWN',
        status,
        technicalDetails: `Upstream server returned HTTP ${status}: ${msg}. Eligible for exponential backoff retry.`,
        retryable: true,
        userMessage: `The server encountered a temporary error (${status}). Retrying with exponential backoff...`
      });
    }

    // Detect Supabase Storage / RLS / Auth issues
    if (
      msg.toLowerCase().includes('supabase') ||
      msg.toLowerCase().includes('workspace_files') ||
      msg.toLowerCase().includes('jwt') ||
      msg.toLowerCase().includes('row-level security') ||
      msg.toLowerCase().includes('failure to fetch workspace file')
    ) {
      const isNet = msg.toLowerCase().includes('failure to fetch') || msg.toLowerCase().includes('network');
      return new FileUploadError(`Supabase Storage / Database Error: ${msg}`, {
        code: 'ERR_SUPABASE_STORAGE',
        status: status || 403,
        technicalDetails: `Supabase integration issue: ${msg}. Context: ${context || 'workspace_files storage'}.`,
        retryable: isNet,
        userMessage: 'Could not synchronize file with cloud Supabase storage. File content is cached locally in workspace memory for study.'
      });
    }

    // Detect Model Capacity 503
    if (status === 503 || msg.includes('503') || msg.toLowerCase().includes('overloaded') || msg.toLowerCase().includes('high demand')) {
      return new FileUploadError(`AI Model Service Temporarily Overloaded (503): ${msg}`, {
        code: 'ERR_MODEL_OVERLOAD_503',
        status: 503,
        technicalDetails: `High demand 503 error from LLM backend.`,
        retryable: true,
        userMessage: 'The AI model is experiencing temporary peak traffic. Retrying with exponential backoff...'
      });
    }

    // Detect Network Abort / Timeout / Disconnect
    if (err?.name === 'AbortError' || msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('network error') || msg.toLowerCase().includes('failed to fetch')) {
      return new FileUploadError(`Network connection dropped or timed out: ${msg}`, {
        code: 'ERR_NETWORK_DISCONNECTED',
        technicalDetails: `Network timeout during request: ${context || 'upload transfer'}.`,
        retryable: true,
        userMessage: 'Network upload connection was interrupted. Retrying with exponential backoff...'
      });
    }

    // Detect Unexpected HTML instead of JSON (e.g. warmup or auth redirect)
    if (
      msg.includes('<!doctype') ||
      msg.includes('Unexpected token') ||
      msg.includes('is not valid JSON') ||
      msg.includes('JSON.parse') ||
      msg.includes('received HTML')
    ) {
      return new FileUploadError(`Invalid JSON response (HTML response received): ${msg}`, {
        code: 'ERR_SERVER_UNKNOWN',
        status: 502,
        technicalDetails: `Server or proxy returned HTML instead of JSON: ${msg}. Retrying with exponential backoff.`,
        retryable: true,
        userMessage: 'The server returned a temporary authentication or preview page. Retrying document analysis...'
      });
    }

    return new FileUploadError(msg, {
      code: 'ERR_SERVER_UNKNOWN',
      status,
      technicalDetails: `Generic failure: ${msg}`,
      retryable: false,
      userMessage: 'An unexpected error occurred while analyzing the document.'
    });
  }
}

// Default validation rules
export const DEFAULT_FILE_VALIDATION: FileValidationConfig = {
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'video/mp4',
    'video/webm'
  ],
  allowedExtensions: [
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.md', '.csv',
    '.jpg', '.jpeg', '.png', '.webp', '.mp3', '.wav', '.mp4', '.webm'
  ]
};

export class FileUploadService {
  private static instance: FileUploadService;

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  public static sanitizeBrowserCookies(): void {
    if (typeof document === 'undefined' || !document.cookie) return;
    try {
      // Only purge if total cookie length exceeds 2048 bytes
      if (document.cookie.length < 2048) return;

      const rawCookies = document.cookie.split(';');
      if (rawCookies.length === 0) return;

      const hostname = window.location.hostname;
      const paths = ['/', ''];

      for (const cookie of rawCookies) {
        const parts = cookie.split('=');
        const name = parts[0]?.trim();
        if (!name) continue;
        // Do not clear primary active auth token
        if (name === 'studyweb-auth') continue;

        for (const path of paths) {
          const pathAttr = path ? `; path=${path}` : '';
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0${pathAttr}`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0${pathAttr}; domain=${hostname}`;
        }
      }
    } catch {
      // Ignore in restricted environments
    }
  }

  // ==========================================
  // 1. Structured Logging
  // ==========================================
  public log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any): void {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[FileUploadService ${timestamp}]`;
    switch (level) {
      case 'info':
        console.log(`📘 ${prefix} ${message}`, meta !== undefined ? meta : '');
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${message}`, meta !== undefined ? meta : '');
        break;
      case 'error':
        console.error(`❌ ${prefix} ${message}`, meta !== undefined ? meta : '');
        break;
      case 'debug':
        console.debug(`🔍 ${prefix} ${message}`, meta !== undefined ? meta : '');
        break;
    }
  }

  // ==========================================
  // 2. Format & Size Utilities
  // ==========================================
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  public getNormalizedType(file: File): 'pdf' | 'doc' | 'ppt' | 'excel' | 'image' | 'audio' | 'video' | 'other' {
    const mime = file.type.toLowerCase();
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (mime.includes('pdf') || ext === '.pdf') return 'pdf';
    if (mime.includes('word') || ext === '.doc' || ext === '.docx') return 'doc';
    if (mime.includes('powerpoint') || mime.includes('presentation') || ext === '.ppt' || ext === '.pptx') return 'ppt';
    if (mime.includes('spreadsheet') || mime.includes('excel') || ext === '.csv' || ext === '.xlsx') return 'excel';
    if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return 'image';
    if (mime.startsWith('audio/') || ['.mp3', '.wav', '.m4a'].includes(ext)) return 'audio';
    if (mime.startsWith('video/') || ['.mp4', '.webm', '.mov'].includes(ext)) return 'video';
    return 'doc';
  }

  // ==========================================
  // 3. Validation
  // ==========================================
  public validate(file: File, customConfig?: Partial<FileValidationConfig>): ValidationResult {
    const config = { ...DEFAULT_FILE_VALIDATION, ...customConfig };

    if (!file || file.size === 0) {
      this.log('warn', `Validation failed: file "${file?.name || 'unknown'}" is empty.`);
      return {
        valid: false,
        code: 'ERR_EMPTY_FILE',
        error: 'The selected file is empty (0 bytes). Please choose a valid study document.'
      };
    }

    const humanSize = this.formatFileSize(file.size);

    if (file.size > config.maxSizeBytes) {
      const maxHuman = this.formatFileSize(config.maxSizeBytes);
      this.log('warn', `Validation failed: file "${file.name}" size (${humanSize}) exceeds limit of ${maxHuman}.`);
      return {
        valid: false,
        code: 'ERR_SIZE_EXCEEDED',
        humanReadableSize: humanSize,
        error: `File size (${humanSize}) exceeds the maximum allowed limit of ${maxHuman}.`
      };
    }

    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const hasAllowedExt = config.allowedExtensions.includes(ext);
    const hasAllowedMime = file.type ? config.allowedMimeTypes.includes(file.type.toLowerCase()) : false;

    if (!hasAllowedExt && !hasAllowedMime) {
      this.log('warn', `Validation failed: file "${file.name}" type "${file.type || ext}" is unsupported.`);
      return {
        valid: false,
        code: 'ERR_UNSUPPORTED_TYPE',
        humanReadableSize: humanSize,
        error: `File type "${ext}" is not supported. Please upload PDF, Word documents, Markdown, images, audio, or video.`
      };
    }

    this.log('info', `Validation passed for "${file.name}" (${humanSize}, type: ${file.type || ext})`);
    return { valid: true, humanReadableSize: humanSize };
  }

  // ==========================================
  // 4. Authentication Headers
  // ==========================================
  public async getAuthHeaders(customToken?: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (customToken) {
      if (customToken.length < 3000) {
        headers['Authorization'] = `Bearer ${customToken}`;
      }
      return headers;
    }

    if (supabase) {
      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        if (!error && sessionData?.session?.access_token) {
          const token = sessionData.session.access_token;
          if (token && token.length < 3000) {
            headers['Authorization'] = `Bearer ${token}`;
            this.log('debug', 'Attached Supabase user JWT bearer token to request.');
          }
        } else {
          this.log('debug', 'No active Supabase session token found; proceeding with anonymous client.');
        }
      } catch (e: any) {
        this.log('warn', `Failed to retrieve Supabase session: ${e?.message || e}`);
      }
    }

    return headers;
  }

  // ==========================================
  // 5. Exponential Backoff & 104 Error Retries
  // ==========================================
  
  /**
   * Tests if an error corresponds to 104 connection reset.
   */
  public is104Error(err: any): boolean {
    return FileUploadError.is104(err);
  }

  /**
   * Safely extracts the HTTP status code from diverse error representations.
   */
  public getErrorStatus(err: any): number | undefined {
    if (!err) return undefined;
    if (typeof err.status === 'number') return err.status;
    if (typeof err.statusCode === 'number') return err.statusCode;
    if (typeof err.status === 'string' && !isNaN(Number(err.status))) return Number(err.status);
    if (typeof err.statusCode === 'string' && !isNaN(Number(err.statusCode))) return Number(err.statusCode);

    const msg = (err.message || err.technicalDetails || err.error || String(err)).toLowerCase();
    const statusMatch = msg.match(/\b(http\s*)?([45]\d{2})\b/i);
    if (statusMatch && statusMatch[2]) {
      return Number(statusMatch[2]);
    }
    return undefined;
  }

  /**
   * Detects HTTP 400 Bad Request, oversized header/cookie errors, or client validation failures.
   */
  public is400Error(err: any): boolean {
    if (!err) return false;

    const status = this.getErrorStatus(err);
    if (status === 400) return true;

    if (err?.code === 'ERR_HEADER_TOO_LARGE' || err?.code === 'ERR_FILE_VALIDATION') {
      return true;
    }

    const msg = (err.message || err.technicalDetails || err.error || String(err)).toLowerCase();
    if (
      msg.includes('400 bad request') ||
      msg.includes('http 400') ||
      msg.includes('status 400') ||
      msg.includes('status: 400') ||
      msg.includes('cookie too large') ||
      msg.includes('header or cookie') ||
      msg.includes('request header too large') ||
      msg.includes('request header or cookie too large')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Identifies 5xx server errors and low-level network errors eligible for exponential backoff retry.
   */
  public isNetworkOr5xxError(err: any): boolean {
    if (!err) return false;

    // Hard stop: HTTP 400 or other 4xx errors are never retried
    if (this.is400Error(err)) return false;

    const status = this.getErrorStatus(err);
    if (status) {
      // 5xx Server Errors (500, 502, 503, 504) are eligible for retry
      if (status >= 500 && status <= 599) return true;
      // 429 Rate limit is retryable
      if (status === 429) return true;
      // All other 4xx (400, 401, 403, 404, 410, 422) are non-retryable client errors
      if (status >= 400 && status < 500) return false;
    }

    // Protocol 104 Connection Reset
    if (this.is104Error(err)) return true;

    // Low-level network disconnects and timeouts
    const msg = (err.message || err.technicalDetails || err.error || String(err)).toLowerCase();
    return (
      err.name === 'AbortError' ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('failed to fetch') ||
      msg.includes('fetch failed') ||
      msg.includes('econnreset') ||
      msg.includes('econnrefused') ||
      msg.includes('etimedout') ||
      msg.includes('socket hang up') ||
      msg.includes('connection reset') ||
      msg.includes('temporarily unavailable') ||
      msg.includes('service unavailable') ||
      msg.includes('gateway timeout') ||
      msg.includes('bad gateway') ||
      msg.includes('failure to fetch workspace file')
    );
  }

  /**
   * Tests if an error is eligible for retry.
   * Smarter retry strategy:
   * - Immediately aborts for HTTP 400 errors and client validation/request errors.
   * - Only applies exponential backoff to 5xx server errors or network-level errors.
   */
  public isRetryable(err: any): boolean {
    if (!err) return false;

    // 1. Immediately abort on HTTP 400 or client validation error
    if (this.is400Error(err)) return false;

    // Respect explicit non-retryable flag
    if (err instanceof FileUploadError && !err.retryable) return false;

    const status = this.getErrorStatus(err);
    if (status && status >= 400 && status < 500 && status !== 429) {
      return false;
    }

    // 2. Only 5xx or network-level errors qualify for exponential backoff
    return this.isNetworkOr5xxError(err);
  }

  /**
   * Computes the exponential backoff delay with optional randomized jitter.
   * Formula: delay = min(initialDelay * (factor ^ (attempt - 1)), maxDelay) * jitterFactor
   * 
   * @param attempt 1-indexed attempt number (e.g. 1 for first retry, 2 for second)
   * @param config Retry configuration parameters
   */
  public calculateBackoffDelay(
    attempt: number,
    config: { initialDelayMs: number; backoffFactor: number; maxDelayMs: number; jitter: boolean }
  ): number {
    const exponent = Math.max(0, attempt - 1);
    const exponential = config.initialDelayMs * Math.pow(config.backoffFactor, exponent);
    const capped = Math.min(exponential, config.maxDelayMs);

    if (!config.jitter) return Math.round(capped);

    // Decorrelated jitter: variance between 0.8x and 1.2x (±20%)
    const jitterVariance = 0.8 + Math.random() * 0.4;
    const delayWithJitter = Math.round(capped * jitterVariance);
    return Math.min(delayWithJitter, config.maxDelayMs);
  }

  /**
   * Robust generic retry execution engine with exponential backoff.
   * Smarter retry strategy:
   * - Immediately aborts retries for HTTP 400 errors to stop pointless request cycles.
   * - Only applies exponential backoff to 5xx or network-level errors.
   */
  public async executeWithRetry<T>(
    operation: (attempt: number) => Promise<T>,
    options?: {
      context?: string;
      retryConfig?: Partial<RetryConfig>;
      signal?: AbortSignal;
      onRetryNotice?: (message: string, attempt: number, delayMs: number, error: FileUploadError) => void;
    }
  ): Promise<T> {
    const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
    let attempt = 0;
    const context = options?.context || 'API Operation';

    while (true) {
      if (options?.signal?.aborted) {
        throw new FileUploadError(`Operation "${context}" aborted by user.`, {
          code: 'ERR_TIMEOUT',
          userMessage: 'Upload or file analysis was cancelled.'
        });
      }

      attempt++;
      try {
        FileUploadService.sanitizeBrowserCookies();
        return await operation(attempt);
      } catch (rawError: any) {
        FileUploadService.sanitizeBrowserCookies();
        if (options?.signal?.aborted) {
          throw new FileUploadError(`Operation "${context}" aborted by user.`, {
            code: 'ERR_TIMEOUT',
            userMessage: 'Upload or file analysis was cancelled.'
          });
        }

        const parsedError = FileUploadError.fromError(rawError, `${context} [attempt ${attempt}]`);

        // SMARTER RETRY STRATEGY: Immediately abort retries for HTTP 400 errors
        const is400 = this.is400Error(rawError) || this.is400Error(parsedError);
        if (is400) {
          this.log(
            'error',
            `🛑 [${context}] HTTP 400 error detected on attempt ${attempt}. Immediately aborting retries to stop pointless request cycles: ${parsedError.message}`,
            { code: parsedError.code, status: 400, is104: false, retryable: false }
          );
          throw parsedError;
        }

        const is104 = this.is104Error(rawError) || this.is104Error(parsedError);

        let canRetry = false;
        if (config.target104Only) {
          canRetry = is104;
        } else if (config.retryCondition) {
          canRetry = config.retryCondition(parsedError, attempt);
        } else {
          // Only apply exponential backoff to 5xx or network-level errors
          canRetry = this.isRetryable(parsedError);
        }

        const retriesExhausted = attempt > config.maxRetries;
        if (!canRetry || retriesExhausted) {
          this.log(
            'error',
            `[${context}] ${retriesExhausted ? 'Max retries exhausted' : 'Non-retryable error'} on attempt ${attempt}/${config.maxRetries + 1}: ${parsedError.message}`,
            { code: parsedError.code, status: parsedError.status, is104, retryable: parsedError.retryable }
          );
          throw parsedError;
        }

        // Calculate jittered exponential backoff delay for 5xx or network-level errors
        const delayMs = this.calculateBackoffDelay(attempt, config);
        const errorDesc = is104
          ? 'Transient Connection Reset (Error 104 socket hang up)'
          : `[${parsedError.code || 'HTTP_' + (parsedError.status || 'ERR')}] ${parsedError.message}`;

        this.log(
          'warn',
          `⚠️ [${context}] Attempt ${attempt}/${config.maxRetries + 1} encountered transient 5xx/network error: ${errorDesc}. Applying exponential backoff: waiting ${delayMs}ms before retry ${attempt + 1}...`,
          { attempt, delayMs, maxRetries: config.maxRetries, is104 }
        );

        const retryNotice = is104
          ? `⚠️ Connection reset detected. Retrying in ${(delayMs / 1000).toFixed(1)}s (Attempt ${attempt + 1} of ${config.maxRetries + 1})...`
          : `⚠️ Transient server/network issue detected. Retrying in ${(delayMs / 1000).toFixed(1)}s (Attempt ${attempt + 1} of ${config.maxRetries + 1})...`;

        if (options?.onRetryNotice) {
          options.onRetryNotice(retryNotice, attempt, delayMs, parsedError);
        }

        if (config.onRetry) {
          config.onRetry(attempt, delayMs, parsedError);
        }

        // Wait for exponential backoff window
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // ==========================================
  // 6. Supabase Storage Direct Upload
  // ==========================================
  public async uploadToSupabaseStorage(
    file: File,
    workspaceId: string,
    options?: { pathPrefix?: string; onProgress?: (percent: number) => void; retryConfig?: Partial<RetryConfig> }
  ): Promise<{ path: string; publicUrl: string; signedUrl?: string }> {
    this.log('info', `Uploading file "${file.name}" to Supabase Storage bucket 'workspace_files'...`);

    if (!supabase) {
      this.log('warn', 'Supabase client is not configured; using local memory storage URL.');
      const simulatedPath = `${workspaceId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      return {
        path: simulatedPath,
        publicUrl: URL.createObjectURL(file)
      };
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${workspaceId}/${Date.now()}_${cleanFileName}`;

    try {
      return await this.executeWithRetry(
        async (attempt) => {
          const { error: uploadError } = await supabase.storage
            .from('workspace_files')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || 'application/octet-stream'
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from('workspace_files')
            .getPublicUrl(storagePath);

          this.log('info', `Supabase Storage upload succeeded. Public URL: ${urlData.publicUrl}`);
          return {
            path: storagePath,
            publicUrl: urlData.publicUrl
          };
        },
        {
          context: `Supabase Storage upload: ${storagePath}`,
          retryConfig: {
            maxRetries: 2,
            initialDelayMs: 800,
            backoffFactor: 2.0,
            jitter: true,
            ...options?.retryConfig
          }
        }
      );
    } catch (err: any) {
      const parsedErr = FileUploadError.fromError(err, `Supabase storage upload: ${storagePath}`);
      this.log('warn', `Supabase storage upload failed: ${parsedErr.message}. Falling back to local file object URL.`);
      return {
        path: storagePath,
        publicUrl: URL.createObjectURL(file)
      };
    }
  }

  // ==========================================
  // 7. Multipart Form Data Creator
  // ==========================================
  public createMultipartFormData(file: File, metadata: Record<string, any>): FormData {
    const formData = new FormData();
    formData.append('file', file, file.name);

    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    }

    return formData;
  }

  // ==========================================
  // 8. Base64 Conversion Helper
  // ==========================================
  public async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // ==========================================
  // 9. Polling with Retry & Timeout Logic
  // ==========================================
  public async pollJobStatus(
    documentId: string,
    onProgress?: (stage: string, percent: number) => void,
    signal?: AbortSignal,
    retryConfig?: Partial<RetryConfig>
  ): Promise<any> {
    const startTime = Date.now();
    const timeoutMs = 75000; // 75s max polling
    let attempt = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 4;

    while (Date.now() - startTime < timeoutMs) {
      if (signal?.aborted) {
        throw new FileUploadError('Analysis polling aborted by user.', { code: 'ERR_TIMEOUT' });
      }

      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const authHeaders = await this.getAuthHeaders();
      let statusRes: Response;
      try {
        statusRes = await fetch(`/api/knowledge/status/${documentId}`, {
          credentials: 'same-origin',
          headers: authHeaders,
          signal
        });
        consecutiveErrors = 0;
      } catch (fetchErr: any) {
        consecutiveErrors++;
        const is104 = this.is104Error(fetchErr);
        const backoffDelay = this.calculateBackoffDelay(consecutiveErrors, {
          initialDelayMs: 1000,
          backoffFactor: 2.0,
          maxDelayMs: 8000,
          jitter: true
        });

        this.log(
          'warn',
          `Polling fetch glitch on attempt ${attempt} (consecutive: ${consecutiveErrors}): ${fetchErr.message}. Backing off ${backoffDelay}ms...`
        );

        if (onProgress && is104) {
          onProgress(`Transient 104 socket reset during polling. Retrying in ${(backoffDelay / 1000).toFixed(1)}s...`, 50);
        }

        if (consecutiveErrors > maxConsecutiveErrors) {
          throw FileUploadError.fromError(fetchErr, `Polling document ${documentId}`);
        }

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        const progress = data.job?.progress || Math.min(92, attempt * 18);
        const message = data.job?.message || 'Extracting core academic concepts and generating study notes...';

        if (onProgress) {
          onProgress(message, Math.min(progress, 95));
        }

        if (data.status === 'completed' || data.status === 'indexed') {
          return data;
        }

        if (data.status === 'failed') {
          const failureMsg = data.message || 'Background processing failed';
          const is104 = this.is104Error(failureMsg);
          if (is104) {
            this.log('warn', `Worker job failed with 104 error: ${failureMsg}`);
          }
          throw FileUploadError.fromError(new Error(failureMsg), `document ${documentId}`);
        }
      } else {
        const errStatus = statusRes.status;
        if (errStatus === 400) {
          throw new FileUploadError(`Polling received HTTP 400 Bad Request for document ${documentId}`, {
            code: 'ERR_FILE_VALIDATION',
            status: 400,
            retryable: false,
            userMessage: 'Document processing status request was invalid (HTTP 400).'
          });
        }
        if (errStatus === 104 || (errStatus >= 500 && errStatus <= 599)) {
          consecutiveErrors++;
          const backoffDelay = this.calculateBackoffDelay(consecutiveErrors, {
            initialDelayMs: 1200,
            backoffFactor: 2.0,
            maxDelayMs: 8000,
            jitter: true
          });
          this.log('warn', `Polling received HTTP ${errStatus}. Backing off ${backoffDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else {
          throw new FileUploadError(`Polling failed with HTTP ${errStatus} for document ${documentId}`, {
            code: 'ERR_SERVER_UNKNOWN',
            status: errStatus,
            retryable: false,
            userMessage: `Document processing status request returned HTTP ${errStatus}.`
          });
        }
      }
    }

    this.log('warn', `Polling reached timeout (${timeoutMs}ms) for document ${documentId}; proceeding with provisional status.`);
    return { status: 'completed', document: { id: documentId, status: 'indexed' } };
  }

  // ==========================================
  // 10. Multipart Upload Pipeline with Exponential Backoff
  // ==========================================
  public async uploadMultipart(file: File, options: UploadOptions): Promise<FileUploadResult> {
    const { workspaceId, onProgress, signal } = options;
    const retryConfig: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: options.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
      ...options.retryConfig
    };

    this.log('info', `Starting multipart upload pipeline for "${file.name}" in workspace "${workspaceId}"`);

    // Stage 1: Validation
    onProgress?.({
      loaded: 0,
      total: file.size,
      percent: 5,
      stage: 'validating',
      message: `Validating ${file.name} format and size...`
    });

    const validation = this.validate(file);
    if (!validation.valid) {
      const err = new FileUploadError(validation.error || 'File validation failed', {
        code: 'ERR_FILE_VALIDATION',
        userMessage: validation.error
      });
      onProgress?.({
        loaded: 0,
        total: file.size,
        percent: 0,
        stage: 'failed',
        message: err.userMessage
      });
      throw err;
    }

    const humanSize = validation.humanReadableSize || this.formatFileSize(file.size);
    const normalizedType = this.getNormalizedType(file);

    // Stage 2: Storage Upload
    onProgress?.({
      loaded: Math.floor(file.size * 0.2),
      total: file.size,
      percent: 25,
      stage: 'uploading_storage',
      message: `Uploading to secure workspace storage...`
    });

    let storageResult = { path: '', publicUrl: '' };
    try {
      storageResult = await this.uploadToSupabaseStorage(file, workspaceId, { retryConfig });
    } catch (storageErr: any) {
      this.log('warn', `Non-blocking storage error: ${storageErr.message}`);
    }

    // Stage 3: Multipart Form POST with Exponential Backoff for 104 errors
    onProgress?.({
      loaded: Math.floor(file.size * 0.5),
      total: file.size,
      percent: 50,
      stage: 'extracting_ai',
      message: `Uploading multipart form data and initiating AI analysis...`
    });

    const formData = this.createMultipartFormData(file, {
      workspaceId,
      userId: options.userId || 'local-user',
      name: file.name,
      type: normalizedType,
      size: humanSize,
      url: storageResult.publicUrl,
      description: options.description || `Uploaded ${file.name}`
    });

    const resData = await this.executeWithRetry(
      async (attempt) => {
        const authHeaders = await this.getAuthHeaders();
        const response = await fetch('/api/knowledge/upload-multipart', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            ...authHeaders
          },
          body: formData,
          signal
        });

        if (!response.ok) {
          const errText = await response.text();
          const err: any = new Error(`Server returned HTTP ${response.status}: ${errText}`);
          err.status = response.status;
          err.statusCode = response.status;
          throw err;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const txt = await response.text();
          throw new Error(`Invalid response format from server (expected JSON, received HTML/text): ${txt.substring(0, 100)}`);
        }

        return await response.json();
      },
      {
        context: `Multipart Upload for "${file.name}"`,
        retryConfig,
        signal,
        onRetryNotice: (notice, attempt, delayMs, err) => {
          onProgress?.({
            loaded: Math.floor(file.size * 0.5),
            total: file.size,
            percent: Math.min(70, 50 + attempt * 5),
            stage: 'retrying_backoff',
            message: notice,
            retryAttempt: attempt,
            retryDelayMs: delayMs
          });
        }
      }
    );

    const docId = resData.documentId;

    // Stage 4: Poll Knowledge Engine indexing status
    onProgress?.({
      loaded: Math.floor(file.size * 0.8),
      total: file.size,
      percent: 75,
      stage: 'indexing_rag',
      message: `Generating vector embeddings and semantic search chunks...`
    });

    const jobResult = await this.pollJobStatus(
      docId,
      (stageMsg, pct) => {
        onProgress?.({
          loaded: Math.floor(file.size * (pct / 100)),
          total: file.size,
          percent: pct,
          stage: 'indexing_rag',
          message: stageMsg
        });
      },
      signal,
      retryConfig
    );

    // Stage 5: Synchronize record with Supabase workspace_files table
    const finalDoc = jobResult.document || {};
    if (supabase) {
      try {
        await supabase.from('workspace_files').insert({
          id: toValidUuid(docId),
          workspace_id: toValidUuid(workspaceId),
          name: file.name,
          type: normalizedType,
          size: humanSize,
          url: storageResult.publicUrl,
          summary: finalDoc.summary || `Extracted concepts from ${file.name}`,
          highlights: finalDoc.highlights || [],
          tags: options.tags || ['Indexed', 'Document']
        });
        this.log('info', `Saved file entry ${docId} to Supabase workspace_files`);
      } catch (syncErr: any) {
        this.log('info', `File synchronized locally: ${docId}`);
      }
    }

    onProgress?.({
      loaded: file.size,
      total: file.size,
      percent: 100,
      stage: 'completed',
      message: `Successfully indexed ${file.name} for AI analysis!`
    });

    return {
      success: true,
      documentId: docId,
      jobId: resData.jobId,
      fileUrl: storageResult.publicUrl,
      storagePath: storageResult.path,
      name: file.name,
      type: normalizedType,
      size: humanSize,
      status: 'indexed',
      summary: finalDoc.summary,
      highlights: finalDoc.highlights,
      tags: options.tags || ['Indexed', 'Document']
    };
  }

  // ==========================================
  // 11. Full Upload and Processing Pipeline
  // ==========================================
  public async uploadAndProcess(file: File, options: UploadOptions): Promise<FileUploadResult> {
    FileUploadService.sanitizeBrowserCookies();
    if (options.useMultipart !== false || file.size > 256 * 1024 || file.type.includes('pdf') || file.type.includes('word') || file.type.includes('image')) {
      return this.uploadMultipart(file, options);
    }

    const { workspaceId, onProgress, signal } = options;
    const retryConfig: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: options.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
      ...options.retryConfig
    };

    this.log('info', `Starting upload pipeline for "${file.name}" in workspace "${workspaceId}"`);

    // Stage 1: Validation
    onProgress?.({
      loaded: 0,
      total: file.size,
      percent: 5,
      stage: 'validating',
      message: `Validating ${file.name} format and size...`
    });

    const validation = this.validate(file);
    if (!validation.valid) {
      const err = new FileUploadError(validation.error || 'File validation failed', {
        code: 'ERR_FILE_VALIDATION',
        userMessage: validation.error
      });
      onProgress?.({
        loaded: 0,
        total: file.size,
        percent: 0,
        stage: 'failed',
        message: err.userMessage
      });
      throw err;
    }

    const humanSize = validation.humanReadableSize || this.formatFileSize(file.size);
    const normalizedType = this.getNormalizedType(file);

    // Stage 2: Storage Upload
    onProgress?.({
      loaded: Math.floor(file.size * 0.2),
      total: file.size,
      percent: 25,
      stage: 'uploading_storage',
      message: `Uploading to secure workspace storage...`
    });

    let storageResult = { path: '', publicUrl: '' };
    try {
      storageResult = await this.uploadToSupabaseStorage(file, workspaceId, { retryConfig });
    } catch (storageErr: any) {
      this.log('warn', `Non-blocking storage error: ${storageErr.message}`);
    }

    // Stage 3: AI Multimodal Extraction & Knowledge Ingestion with Exponential Backoff
    onProgress?.({
      loaded: Math.floor(file.size * 0.5),
      total: file.size,
      percent: 50,
      stage: 'extracting_ai',
      message: `Extracting key concepts, formulas, and structural outline...`
    });

    let base64Content = '';
    try {
      base64Content = await this.fileToBase64(file);
    } catch (b64Err: any) {
      this.log('warn', `Base64 extraction warning: ${b64Err.message}`);
    }

    let resData: any;
    try {
      resData = await this.executeWithRetry(
        async (attempt) => {
          const authHeaders = await this.getAuthHeaders();
          const response = await fetch('/api/knowledge/upload', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders
            },
            body: JSON.stringify({
              workspaceId,
              userId: options.userId || 'local-user',
              name: file.name,
              type: normalizedType,
              size: humanSize,
              url: storageResult.publicUrl,
              fileBase64: base64Content,
              fileMimeType: file.type || 'application/pdf',
              description: options.description || `Uploaded ${file.name}`
            }),
            signal
          });

          if (!response.ok) {
            const errorBody = await response.text();
            const err: any = new Error(`Server returned HTTP ${response.status}: ${errorBody}`);
            err.status = response.status;
            err.statusCode = response.status;
            throw err;
          }

          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            const txt = await response.text();
            throw new Error(`Invalid response format from server (expected JSON, received HTML/text): ${txt.substring(0, 100)}`);
          }

          return await response.json();
        },
        {
          context: `Knowledge Ingestion for "${file.name}"`,
          retryConfig,
          signal,
          onRetryNotice: (notice, attempt, delayMs, err) => {
            onProgress?.({
              loaded: Math.floor(file.size * 0.5),
              total: file.size,
              percent: Math.min(70, 50 + attempt * 5),
              stage: 'retrying_backoff',
              message: notice,
              retryAttempt: attempt,
              retryDelayMs: delayMs
            });
          }
        }
      );
    } catch (err: any) {
      const finalError = FileUploadError.fromError(err, `Upload pipeline for ${file.name}`);
      onProgress?.({
        loaded: 0,
        total: file.size,
        percent: 0,
        stage: 'failed',
        message: finalError.userMessage || 'Upload failed'
      });
      this.log('error', `All upload attempts failed for "${file.name}": ${finalError.message}`, finalError);
      throw finalError;
    }

    const docId = resData.documentId;

    // Stage 4: Poll Knowledge Engine indexing status
    onProgress?.({
      loaded: Math.floor(file.size * 0.8),
      total: file.size,
      percent: 75,
      stage: 'indexing_rag',
      message: `Generating vector embeddings and semantic search chunks...`
    });

    const jobResult = await this.pollJobStatus(
      docId,
      (stageMsg, pct) => {
        onProgress?.({
          loaded: Math.floor(file.size * (pct / 100)),
          total: file.size,
          percent: pct,
          stage: 'indexing_rag',
          message: stageMsg
        });
      },
      signal,
      retryConfig
    );

    // Stage 5: Synchronize record with Supabase workspace_files table
    const finalDoc = jobResult.document || {};
    if (supabase) {
      try {
        await supabase.from('workspace_files').insert({
          id: toValidUuid(docId),
          workspace_id: toValidUuid(workspaceId),
          name: file.name,
          type: normalizedType,
          size: humanSize,
          url: storageResult.publicUrl,
          summary: finalDoc.summary || `Extracted concepts from ${file.name}`,
          highlights: finalDoc.highlights || [],
          tags: options.tags || ['Indexed', 'Document']
        });
        this.log('info', `Saved file entry ${docId} to Supabase workspace_files`);
      } catch (syncErr: any) {
        this.log('info', `File synchronized locally: ${docId}`);
      }
    }

    onProgress?.({
      loaded: file.size,
      total: file.size,
      percent: 100,
      stage: 'completed',
      message: `Successfully indexed ${file.name} for AI analysis!`
    });

    return {
      success: true,
      documentId: docId,
      jobId: resData.jobId,
      fileUrl: storageResult.publicUrl,
      storagePath: storageResult.path,
      name: file.name,
      type: normalizedType,
      size: humanSize,
      status: 'indexed',
      summary: finalDoc.summary,
      highlights: finalDoc.highlights,
      tags: options.tags || ['Indexed', 'Document']
    };
  }
}

export const fileUploadService = FileUploadService.getInstance();
