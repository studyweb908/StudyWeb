import fs from "fs";

const RUNTIME_ENV_CACHE_PATH = "/tmp/.aistudio_runtime_env.json";

export type GeminiKeyDiagnosticState =
  | "valid_format"
  | "placeholder_my_gemini_api_key"
  | "oauth_token_unsupported"
  | "too_short"
  | "missing";

export interface GeminiKeyDiagnostic {
  state: GeminiKeyDiagnosticState;
  configured: boolean;
  sourceVar?: string;
  message: string;
}

export function cleanRawKey(raw: unknown): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/[\r\n]+/g, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

export function isValidGeminiApiKeyCandidate(raw: unknown): raw is string {
  const trimmed = cleanRawKey(raw);
  if (trimmed.length < 20) return false;
  if (/\s/.test(trimmed)) return false;
  if (
    trimmed === "MY_GEMINI_API_KEY" ||
    trimmed === "YOUR_GEMINI_API_KEY" ||
    trimmed === "REPLACE_WITH_YOUR_GEMINI_API_KEY"
  ) {
    return false;
  }
  // Reject OAuth / bound access tokens (ya29.*, AQ.*) that cause 401 ACCESS_TOKEN_TYPE_UNSUPPORTED
  if (trimmed.startsWith("ya29.") || trimmed.startsWith("AQ.")) return false;
  // Reject non-Gemini tokens accidentally pasted into API_KEY / GEMINI_API_KEY
  if (
    trimmed.startsWith("eyJ") ||
    trimmed.startsWith("sb_secret_") ||
    trimmed.startsWith("sb_publishable_") ||
    trimmed.startsWith("GOCSPX-")
  ) {
    return false;
  }
  return true;
}

export function diagnoseServerGeminiApiKey(): GeminiKeyDiagnostic {
  const envEntries: Array<{ name: string; value: unknown }> = [
    { name: "GEMINI_API_KEY", value: process.env.GEMINI_API_KEY },
    { name: "GOOGLE_API_KEY", value: process.env.GOOGLE_API_KEY },
    { name: "API_KEY", value: process.env.API_KEY },
    { name: "VITE_GEMINI_API_KEY", value: process.env.VITE_GEMINI_API_KEY },
    { name: "NEXT_PUBLIC_GEMINI_API_KEY", value: process.env.NEXT_PUBLIC_GEMINI_API_KEY }
  ];

  for (const entry of envEntries) {
    if (isValidGeminiApiKeyCandidate(entry.value)) {
      return {
        state: "valid_format",
        configured: true,
        sourceVar: entry.name,
        message: `Found configured API key in ${entry.name}.`
      };
    }
  }

  try {
    if (fs.existsSync(RUNTIME_ENV_CACHE_PATH)) {
      const rawJson = fs.readFileSync(RUNTIME_ENV_CACHE_PATH, "utf8");
      const parsed = JSON.parse(rawJson);
      const cachedKey = parsed?.GEMINI_API_KEY;
      if (isValidGeminiApiKeyCandidate(cachedKey)) {
        return {
          state: "valid_format",
          configured: true,
          sourceVar: "RUNTIME_ENV_CACHE",
          message: "Found configured API key in runtime environment cache."
        };
      }
    }
  } catch {
    // ignore fs read errors
  }

  // Check why the present env var was rejected so we can report the exact reason
  for (const entry of envEntries) {
    const cleaned = cleanRawKey(entry.value);
    if (!cleaned) continue;
    if (
      cleaned === "MY_GEMINI_API_KEY" ||
      cleaned === "YOUR_GEMINI_API_KEY" ||
      cleaned === "REPLACE_WITH_YOUR_GEMINI_API_KEY"
    ) {
      return {
        state: "placeholder_my_gemini_api_key",
        configured: false,
        sourceVar: entry.name,
        message:
          "The server environment currently holds a placeholder value instead of a real Gemini API key. Configure a valid GEMINI_API_KEY in your deployment environment variables."
      };
    }
    if (cleaned.startsWith("ya29.") || cleaned.startsWith("AQ.")) {
      return {
        state: "oauth_token_unsupported",
        configured: false,
        sourceVar: entry.name,
        message:
          "The server received an unsupported access token (ya29.* / AQ.*) instead of a Gemini API key (AIza*), which Google rejects with ACCESS_TOKEN_TYPE_UNSUPPORTED. Set a valid GEMINI_API_KEY in your server environment variables."
      };
    }
    if (cleaned.length < 20) {
      return {
        state: "too_short",
        configured: false,
        sourceVar: entry.name,
        message: `The value in ${entry.name} is too short (${cleaned.length} chars) to be a valid Gemini API key.`
      };
    }
  }

  return {
    state: "missing",
    configured: false,
    message:
      "No GEMINI_API_KEY environment variable was found on the server. Add GEMINI_API_KEY to your server environment variables."
  };
}

export interface GeminiKeyCandidate {
  key: string;
  sourceVar: string;
}

/**
 * Returns all valid configured Gemini API key candidates in strict priority order
 * (process.env first, then runtime cache / fallback) without duplicating keys.
 */
export function getServerGeminiApiKeyCandidates(): GeminiKeyCandidate[] {
  const rawEntries: Array<{ sourceVar: string; value: unknown }> = [
    { sourceVar: "GEMINI_API_KEY", value: process.env.GEMINI_API_KEY },
    { sourceVar: "GOOGLE_API_KEY", value: process.env.GOOGLE_API_KEY },
    { sourceVar: "API_KEY", value: process.env.API_KEY },
    { sourceVar: "VITE_GEMINI_API_KEY", value: process.env.VITE_GEMINI_API_KEY },
    { sourceVar: "NEXT_PUBLIC_GEMINI_API_KEY", value: process.env.NEXT_PUBLIC_GEMINI_API_KEY }
  ];

  const seen = new Set<string>();
  const result: GeminiKeyCandidate[] = [];

  for (const entry of rawEntries) {
    if (isValidGeminiApiKeyCandidate(entry.value)) {
      const cleaned = cleanRawKey(entry.value);
      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        result.push({ key: cleaned, sourceVar: entry.sourceVar });
      }
    }
  }

  try {
    if (fs.existsSync(RUNTIME_ENV_CACHE_PATH)) {
      const rawJson = fs.readFileSync(RUNTIME_ENV_CACHE_PATH, "utf8");
      const parsed = JSON.parse(rawJson);
      const cachedKey = parsed?.GEMINI_API_KEY;
      if (isValidGeminiApiKeyCandidate(cachedKey)) {
        const cleaned = cleanRawKey(cachedKey);
        if (!seen.has(cleaned)) {
          seen.add(cleaned);
          result.push({ key: cleaned, sourceVar: "RUNTIME_ENV_CACHE" });
        }
      }
    }
  } catch {
    // ignore fs read errors
  }

  return result;
}

/**
 * Resolves the server-side Gemini API key with strict priority for process.env
 * (including Vercel production env vars), falling back to the container runtime
 * cache or configured fallback key without polluting process.env.
 */
export function getServerGeminiApiKey(): string | null {
  const candidates = getServerGeminiApiKeyCandidates();
  return candidates.length > 0 ? candidates[0].key : null;
}
