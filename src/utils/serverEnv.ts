import fs from "fs";
import path from "path";

const RUNTIME_ENV_CACHE_PATH = "/tmp/.aistudio_runtime_env.json";

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
    if (raw && typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.length > 10 && trimmed !== "MY_GEMINI_API_KEY") {
        return trimmed;
      }
    }
  }

  try {
    if (fs.existsSync(RUNTIME_ENV_CACHE_PATH)) {
      const rawJson = fs.readFileSync(RUNTIME_ENV_CACHE_PATH, "utf8");
      const parsed = JSON.parse(rawJson);
      const cachedKey = typeof parsed?.GEMINI_API_KEY === "string" ? parsed.GEMINI_API_KEY.trim() : "";
      if (cachedKey.length > 10 && cachedKey !== "MY_GEMINI_API_KEY") {
        process.env.GEMINI_API_KEY = cachedKey;
        return cachedKey;
      }
    }
  } catch {
    // ignore fs read errors
  }

  try {
    const localKeyPath = path.resolve(process.cwd(), ".runtime_key");
    if (fs.existsSync(localKeyPath)) {
      const k = fs.readFileSync(localKeyPath, "utf8").trim();
      if (k.length > 10 && k !== "MY_GEMINI_API_KEY") {
        process.env.GEMINI_API_KEY = k;
        return k;
      }
    }
  } catch {
    // ignore
  }

  return null;
}
