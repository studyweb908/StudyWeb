import fs from "fs";

const RUNTIME_ENV_CACHE_PATH = "/tmp/.aistudio_runtime_env.json";
const CONFIGURED_FALLBACK_GEMINI_KEY =
  "AQ.Ab8RN6LiwYGVz4cg96MDtWO57-OIcTpkoiROHUqPfZGyzvdC3g";

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
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

export function isValidGeminiApiKeyCandidate(raw: unknown): raw is string {
  const trimmed = cleanRawKey(raw);
  if (trimmed.length < 20) return false;
  if (
    trimmed === "MY_GEMINI_API_KEY" ||
    trimmed === "YOUR_GEMINI_API_KEY" ||
    trimmed === "REPLACE_WITH_YOUR_GEMINI_API_KEY"
  ) {
    return false;
  }
  // Reject OAuth access tokens (ya29.*) that cause ACCESS_TOKEN_TYPE_UNSUPPORTED
  if (trimmed.startsWith("ya29.")) return false;
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

  if (isValidGeminiApiKeyCandidate(CONFIGURED_FALLBACK_GEMINI_KEY)) {
    return {
      state: "valid_format",
      configured: true,
      sourceVar: "CONFIGURED_GEMINI_KEY",
      message: "Found configured Gemini API key."
    };
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
          "The server environment currently holds the placeholder value 'MY_GEMINI_API_KEY' instead of a real Gemini API key. Open Settings > Secrets in AI Studio and add a valid GEMINI_API_KEY."
      };
    }
    if (cleaned.startsWith("ya29.")) {
      return {
        state: "oauth_token_unsupported",
        configured: false,
        sourceVar: entry.name,
        message:
          "The server received an OAuth access token (ya29.*) instead of a Gemini API key, which Google rejects with ACCESS_TOKEN_TYPE_UNSUPPORTED. Set a valid GEMINI_API_KEY in Settings > Secrets."
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
      "No GEMINI_API_KEY environment variable was found on the server. Add GEMINI_API_KEY in Settings > Secrets."
  };
}

/**
 * Resolves the server-side Gemini API key from process.env, the container's
 * ephemeral /tmp runtime environment cache, or the configured fallback key.
 */
export function getServerGeminiApiKey(): string | null {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY
  ];

  for (const raw of candidates) {
    if (isValidGeminiApiKeyCandidate(raw)) {
      return cleanRawKey(raw);
    }
  }

  try {
    if (fs.existsSync(RUNTIME_ENV_CACHE_PATH)) {
      const rawJson = fs.readFileSync(RUNTIME_ENV_CACHE_PATH, "utf8");
      const parsed = JSON.parse(rawJson);
      const cachedKey = parsed?.GEMINI_API_KEY;
      if (isValidGeminiApiKeyCandidate(cachedKey)) {
        const clean = cleanRawKey(cachedKey);
        process.env.GEMINI_API_KEY = clean;
        return clean;
      }
    }
  } catch {
    // ignore fs read errors
  }

  if (isValidGeminiApiKeyCandidate(CONFIGURED_FALLBACK_GEMINI_KEY)) {
    const clean = cleanRawKey(CONFIGURED_FALLBACK_GEMINI_KEY);
    process.env.GEMINI_API_KEY = clean;
    try {
      fs.writeFileSync(
        RUNTIME_ENV_CACHE_PATH,
        JSON.stringify({ GEMINI_API_KEY: clean }, null, 2),
        "utf8"
      );
    } catch {
      // ignore fs write errors
    }
    return clean;
  }

  return null;
}
