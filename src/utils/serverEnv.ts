import fs from "fs";
import path from "path";

const RUNTIME_ENV_CACHE_PATH = "/tmp/.aistudio_runtime_env.json";

export function isValidGeminiApiKeyCandidate(raw: unknown): raw is string {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  if (trimmed.length < 20) return false;
  if (trimmed === "MY_GEMINI_API_KEY" || trimmed === "YOUR_GEMINI_API_KEY") return false;
  // Reject OAuth / non-API-key token formats (e.g., AQ.* or ya29.*) that cause ACCESS_TOKEN_TYPE_UNSUPPORTED
  if (trimmed.startsWith("AQ.") || trimmed.startsWith("ya29.")) return false;
  return true;
}

/**
 * Resolves the server-side Gemini API key from process.env or the container's
 * ephemeral /tmp runtime environment cache (when the dev server process was started
 * with a placeholder env var before runtime injection).
 */
export function getServerGeminiApiKey(): string | null {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.API_KEY
  ];

  for (const raw of candidates) {
    if (isValidGeminiApiKeyCandidate(raw)) {
      return raw.trim().replace(/^["']|["']$/g, "");
    }
  }

  try {
    if (fs.existsSync(RUNTIME_ENV_CACHE_PATH)) {
      const rawJson = fs.readFileSync(RUNTIME_ENV_CACHE_PATH, "utf8");
      const parsed = JSON.parse(rawJson);
      const cachedKey = parsed?.GEMINI_API_KEY;
      if (isValidGeminiApiKeyCandidate(cachedKey)) {
        const clean = cachedKey.trim().replace(/^["']|["']$/g, "");
        process.env.GEMINI_API_KEY = clean;
        return clean;
      }
    }
  } catch {
    // ignore fs read errors
  }

  return null;
}
