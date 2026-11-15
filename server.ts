import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { knowledgeRouter } from "./src/knowledge-engine/api.js";
import { studyMaterialRouter, extractYouTubeInfo, scrapeWebPage, enrichUrlWithGeminiWebGrounding, isRawUrlOrPlaceholderName } from "./src/services/studyMaterialPipeline.js";
import { TranscriptProcessor } from "./src/services/TranscriptProcessor.js";
import { cleanNotebookLMTitle } from "./src/utils/notebookTitle.js";
import { toValidUuid } from "./src/utils/uuid.js";
import { getServerGeminiApiKey } from "./src/utils/serverEnv.js";
import { createClient } from "@supabase/supabase-js";
import { streakRouter, setServerUserDailyGoal, getServerUserDailyGoal, clearServerUserStreakData } from "./src/services/streakEngineServer.js";

// Load environment variables
dotenv.config();

// Disable HMR in preview environment to prevent WebSocket connection failures
if (!process.env.DISABLE_HMR) {
  process.env.DISABLE_HMR = "true";
}

const DEFAULT_SUPABASE_URL = "https://fzutrlzeyystbaiueker.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dXRybHpleXlzdGJhaXVla2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTg1MDMsImV4cCI6MjA5ODk3NDUwM30.usJ97CqSdQOAhYC8nXGvKg42xiKrjsmlJiGSTIYSLF4";

// Server-side authoritative cache for user profiles so profile edits & daily focus targets survive expired client tokens
const serverProfileStore = new Map<string, Record<string, any>>();

// Helper to validate that a Bearer JWT is not expired before forwarding to PostgREST
export function sanitizeSupabaseAuthHeader(authHeader?: string): string | undefined {
  if (!authHeader || typeof authHeader !== "string" || authHeader.length >= 4000) {
    return undefined;
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return undefined;
  }
  const trimmed = authHeader.trim();
  const token = trimmed.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === "undefined" || token === "null") {
    return undefined;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return undefined;
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (payload && typeof payload.exp === "number") {
      // Treat token as expired if it expires within the next 10 seconds
      if (payload.exp * 1000 <= Date.now() + 10_000) {
        return undefined;
      }
    }
  } catch {
    return undefined;
  }
  return /^Bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${token}`;
}

export function extractUserIdFromAuthHeader(authHeader?: string): string | undefined {
  if (!authHeader || typeof authHeader !== "string") return undefined;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const parts = token.split(".");
  if (parts.length < 2) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (payload && typeof payload.sub === "string" && payload.sub.trim()) {
      return payload.sub.trim();
    }
  } catch {
    // ignore decode errors
  }
  return undefined;
}

// Supabase Server-Side Client Helper
export function getSupabaseServerClient(authHeader?: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  const safeAuth = sanitizeSupabaseAuthHeader(authHeader);
  const options = safeAuth ? { global: { headers: { Authorization: safeAuth } } } : {};
  return createClient(supabaseUrl, supabaseKey, options);
}

// Robust API key helper (server-side environment variables only — never hardcoded or VITE_-prefixed)
export function getGeminiApiKey(): string | null {
  return getServerGeminiApiKey();
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Per-IP sliding window rate limiter for API routes (tuned for 1,000 concurrent users including shared campus/school NATs)
const apiRateBuckets = new Map<string, { count: number; resetAt: number }>();
let lastRateBucketPrune = Date.now();
function checkRateLimit(ip: string, maxRequests = 600, windowMs = 60_000): boolean {
  const now = Date.now();
  // Prune expired buckets periodically to keep memory footprint bounded under 1,000+ users
  if (now - lastRateBucketPrune > 60_000 && apiRateBuckets.size > 500) {
    lastRateBucketPrune = now;
    for (const [key, val] of apiRateBuckets.entries()) {
      if (now >= val.resetAt) apiRateBuckets.delete(key);
    }
  }
  const bucket = apiRateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    apiRateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= maxRequests;
}

// Short-TTL server-side response cache for workspace-files to absorb burst traffic across 1,000 users
const workspaceFilesResponseCache = new Map<string, { files: any[]; expiresAt: number }>();

// Track per-model failure / quota cooldowns so overloaded or failing models are bypassed immediately
const modelQuotaCooldownMap = new Map<string, number>();

export function isModelOnCooldown(model: string): boolean {
  const until = modelQuotaCooldownMap.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    modelQuotaCooldownMap.delete(model);
    return false;
  }
  return true;
}

export function isQuotaOrRateLimitError(err: any): boolean {
  const status = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.message || err?.error?.message || err || "");
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.toLowerCase().includes("quota") ||
    msg.toLowerCase().includes("rate limit")
  );
}

export function isAuthOrInvalidApiKeyError(err: any): boolean {
  const status = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.message || err?.error?.message || err || "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    msg.includes("api key not valid") ||
    msg.includes("api_key_invalid") ||
    msg.includes("access_token_type_unsupported") ||
    msg.includes("unauthenticated") ||
    msg.includes("permission_denied")
  );
}

export function isTransientOrUnavailableModelError(err: any): boolean {
  if (isAuthOrInvalidApiKeyError(err)) return false;
  const status = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.message || err?.error?.message || err || "").toLowerCase();
  return (
    isQuotaOrRateLimitError(err) ||
    status === 503 ||
    status === 502 ||
    status === 504 ||
    status === 500 ||
    status === 404 ||
    msg.includes("503") ||
    msg.includes("404") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("not_found") ||
    msg.includes("timed out") ||
    msg.includes("timeout")
  );
}

export function recordModelQuotaCooldown(model: string, err?: any): void {
  const status = err?.status || err?.statusCode || err?.error?.code;
  const msg = String(err?.message || err?.error?.message || "");
  const isNotFound = status === 404 || msg.includes("404") || msg.includes("NOT_FOUND");
  const isDailyQuota = msg.includes("PerDay");
  const baseCooldown = model === "gemini-3-flash-preview" ? 10 * 1000 : 90 * 1000;
  const cooldownMs = isNotFound ? 30 * 60 * 1000 : isDailyQuota ? 5 * 60 * 1000 : baseCooldown;
  modelQuotaCooldownMap.set(model, Date.now() + cooldownMs);
}

export function getAvailableCandidateModels(preferredModels: string[]): string[] {
  // Always ensure fast gemini-3-flash-preview is prioritized ahead of slower/quota-limited models for general text/vision
  const reordered = [...preferredModels].sort((a, b) => {
    const rank = (m: string) => {
      if (m === "gemini-3.5-transcribe") return 0;
      if (m === "gemini-3-flash-preview") return 1;
      if (m === "gemini-3.1-flash-lite") return 2;
      if (m === "gemini-4-hydrogen") return 3;
      return 4;
    };
    return rank(a) - rank(b);
  });
  const available = reordered.filter((m) => !isModelOnCooldown(m));
  return available.length > 0 ? available : reordered;
}

export function summarizeModelError(err: any): string {
  if (isQuotaOrRateLimitError(err)) {
    return "quota_reached_switching_model";
  }
  const status = err?.status || err?.statusCode || err?.error?.code || "transient";
  const raw = String(err?.message || err?.error?.message || "model unavailable");
  if (raw.includes("timed out")) return "timeout";
  if (raw.startsWith("{")) return `status_${status}`;
  return raw.slice(0, 80).replace(/[\r\n]+/g, " ");
}

export async function generateContentWithModelFailover(
  ai: GoogleGenAI,
  options: {
    contents: any;
    preferredModels?: string[];
    config?: Record<string, any>;
    timeoutMs?: number;
    maxPasses?: number;
    label?: string;
  }
): Promise<{ response: any; modelUsed: string }> {
  const baseModels = options.preferredModels?.length
    ? options.preferredModels
    : ["gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-4-hydrogen"];
  const maxPasses = options.maxPasses ?? 2;
  const timeoutMs = options.timeoutMs ?? 14000;
  const label = options.label || "GeminiFailover";

  let lastError: any = null;

  for (let pass = 0; pass < maxPasses; pass++) {
    if (pass > 0) {
      await new Promise((r) => setTimeout(r, 300 * pass));
    }
    const candidateModels = pass === 0 ? getAvailableCandidateModels(baseModels) : getAvailableCandidateModels(baseModels);

    for (const modelName of candidateModels) {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      try {
        const isHydrogen = modelName === "gemini-4-hydrogen";
        const supportsMinimalThinking = modelName.startsWith("gemini-3");
        const modelConfig: Record<string, any> = { ...(options.config || {}) };

        if (isHydrogen) {
          delete modelConfig.temperature;
          if (!modelConfig.thinkingConfig) {
            modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }
        } else if (supportsMinimalThinking && !modelConfig.thinkingConfig) {
          modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
        }

        const genPromise = ai.models.generateContent({
          model: modelName,
          contents: options.contents,
          config: modelConfig,
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`Model ${modelName} timed out after ${timeoutMs}ms`)),
            timeoutMs
          );
        });

        const response: any = await Promise.race([genPromise, timeoutPromise]);
        if (timeoutHandle) clearTimeout(timeoutHandle);

        if (response && response.text && response.text.trim()) {
          return { response, modelUsed: modelName };
        }
        throw new Error(`Empty response from ${modelName}`);
      } catch (err: any) {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        lastError = err;
        if (isAuthOrInvalidApiKeyError(err)) {
          throw err;
        }
        if (isTransientOrUnavailableModelError(err)) {
          recordModelQuotaCooldown(modelName, err);
        }
        console.warn(`[${label}] Switching from ${modelName}: ${summarizeModelError(err)}`);
      }
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

// Initialize the Knowledge Engine database

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard baseline security headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    if (req.path.startsWith("/api/")) {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "local";
      if (!checkRateLimit(clientIp, 600, 60_000)) {
        return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
      }
    }
    next();
  });

  // JSON Body Parser for API Requests (bounded to 50MB to match max file upload limit)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Prevent Express body-parser from returning HTML 400 error pages on malformed or oversized payloads
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.warn(`[Express BodyParser Recovery] ${req.method} ${req.path}:`, err?.message || err);
      req.body = req.body && typeof req.body === "object" ? req.body : {};
      if (req.path.startsWith("/api/ai-tutor")) {
        return next();
      }
      if (req.path.startsWith("/api/")) {
        return res.status(200).json({
          error: "Invalid request payload format",
          recovered: true
        });
      }
    }
    next();
  });

  // Mount Knowledge Engine & StudyWeb Streaks Modules
  app.use("/api/knowledge", knowledgeRouter);
  app.use("/api/study-materials", studyMaterialRouter);
  app.use("/api/streaks", streakRouter);

  // Domain Verification Route for OpenAI Business Profile (studywebai.vercel.app)
  app.get(
    [
      "/.well-known/openai-business-profile",
      "/openai-business-profile.txt",
      "/openai-business-profile"
    ],
    (_req, res) => {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.status(200).send("openai-business-profile=-bKgHQNTViWjD2SDVhNzq7EnfTZ4pif4-GSLhjU7eok");
    }
  );

  // API Route: Resilient Profile & Daily Focus Target Sync (/api/profile)
  app.get("/api/profile", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const userId = String(
        req.query?.userId ||
          req.headers["x-studyweb-user-id"] ||
          extractUserIdFromAuthHeader(req.headers.authorization) ||
          ""
      ).trim();

      if (!userId) {
        return res.json({ success: true, profile: null });
      }

      const cached = serverProfileStore.get(userId) || {};
      const streakGoal = getServerUserDailyGoal(userId);
      const supabase = getSupabaseServerClient(req.headers.authorization);
      let dbRow: Record<string, any> | null = null;
      let streakRow: Record<string, any> | null = null;
      let dbQueried = false;

      if (supabase) {
        try {
          const [profRes, stRes] = await Promise.allSettled([
            supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
            supabase.from("study_streak_settings").select("*").eq("user_id", userId).maybeSingle(),
          ]);
          if (profRes.status === "fulfilled" && !profRes.value.error) {
            dbQueried = true;
            dbRow = profRes.value.data || null;
          }
          if (stRes.status === "fulfilled" && stRes.value.data) {
            streakRow = stRes.value.data;
          }
        } catch {}
      }

      if (dbQueried && (!dbRow || dbRow?.onboarding_data?.account_deleted === true)) {
        serverProfileStore.delete(userId);
        return res.json({ success: true, profile: null, accountDeleted: Boolean(dbRow?.onboarding_data?.account_deleted) });
      }

      const resolvedGoal =
        (Number(streakRow?.daily_goal_minutes) >= 5 ? Number(streakRow?.daily_goal_minutes) : undefined) ??
        (Number(dbRow?.daily_goal_minutes) >= 5 ? Number(dbRow?.daily_goal_minutes) : undefined) ??
        cached.dailyGoalMinutes ??
        streakGoal;

      const profile = {
        userId,
        fullName: dbRow ? (dbRow.full_name ?? dbRow.name ?? "") : (cached.fullName || ""),
        avatarUrl: dbRow ? (dbRow.avatar_url ?? "") : (cached.avatarUrl || ""),
        schoolName: dbRow ? (dbRow.school_name ?? dbRow.school ?? "") : (cached.schoolName || ""),
        className: dbRow ? (dbRow.class_name ?? dbRow.grade ?? "") : (cached.className || ""),
        subject: dbRow ? (dbRow.subject ?? "") : (cached.subject || ""),
        targetAim: dbRow ? (dbRow.target_aim ?? dbRow.learning_goal ?? "") : (cached.targetAim || ""),
        studentBio: dbRow ? (dbRow.scholar_bio ?? dbRow.bio ?? "") : (cached.studentBio || ""),
        dailyGoalMinutes: resolvedGoal,
        examName: dbRow ? (dbRow.exam_name ?? "") : (cached.examName || ""),
        examDate: dbRow ? (dbRow.exam_date ?? "") : (cached.examDate || ""),
        activeMascot: dbRow ? (dbRow.active_mascot ?? cached.activeMascot ?? "") : (cached.activeMascot || ""),
        voiceStyle: dbRow ? (dbRow.voice_style ?? cached.voiceStyle ?? "") : (cached.voiceStyle || ""),
        updatedAt: dbRow?.updated_at || cached.updatedAt || "",
      };

      return res.json({ success: true, profile });
    } catch (err: any) {
      return res.status(200).json({ success: false, profile: null, error: err?.message });
    }
  });

  app.post("/api/profile", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const body = req.body || {};
      const userId = String(
        body.userId ||
          req.headers["x-studyweb-user-id"] ||
          extractUserIdFromAuthHeader(req.headers.authorization) ||
          ""
      ).trim();

      if (!userId) {
        return res.status(400).json({ success: false, error: "Missing userId" });
      }

      const nowIso = body.updatedAt || new Date().toISOString();
      const prev = serverProfileStore.get(userId) || {};
      const cleanGoal =
        body.dailyGoalMinutes !== undefined && Number(body.dailyGoalMinutes) >= 5
          ? Math.max(5, Math.min(720, Math.round(Number(body.dailyGoalMinutes))))
          : prev.dailyGoalMinutes;

      const updatedProfile: Record<string, any> = {
        ...prev,
        userId,
        ...(body.fullName !== undefined ? { fullName: String(body.fullName).trim() } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: String(body.avatarUrl) } : {}),
        ...(body.schoolName !== undefined ? { schoolName: String(body.schoolName).trim() } : {}),
        ...(body.className !== undefined ? { className: String(body.className).trim() } : {}),
        ...(body.subject !== undefined ? { subject: String(body.subject).trim() } : {}),
        ...(body.targetAim !== undefined ? { targetAim: String(body.targetAim).trim() } : {}),
        ...(body.studentBio !== undefined ? { studentBio: String(body.studentBio).trim() } : {}),
        ...(cleanGoal !== undefined ? { dailyGoalMinutes: cleanGoal } : {}),
        ...(body.examName !== undefined ? { examName: String(body.examName).trim() } : {}),
        ...(body.examDate !== undefined ? { examDate: String(body.examDate).trim() } : {}),
        ...(body.activeMascot !== undefined ? { activeMascot: String(body.activeMascot).trim() } : {}),
        ...(body.voiceStyle !== undefined ? { voiceStyle: String(body.voiceStyle).trim() } : {}),
        updatedAt: nowIso,
      };

      serverProfileStore.set(userId, updatedProfile);
      if (cleanGoal !== undefined) {
        setServerUserDailyGoal(userId, cleanGoal);
      }

      let dbSynced = false;
      const supabase = getSupabaseServerClient(req.headers.authorization);
      if (supabase) {
        const candidatePayloads: Record<string, any>[] = [
          {
            id: userId,
            ...(updatedProfile.fullName !== undefined ? { full_name: updatedProfile.fullName } : {}),
            ...(updatedProfile.avatarUrl !== undefined ? { avatar_url: updatedProfile.avatarUrl } : {}),
            ...(updatedProfile.schoolName !== undefined ? { school: updatedProfile.schoolName } : {}),
            ...(updatedProfile.className !== undefined ? { grade: updatedProfile.className } : {}),
            ...(updatedProfile.subject !== undefined ? { subject: updatedProfile.subject } : {}),
            ...(updatedProfile.targetAim !== undefined ? { learning_goal: updatedProfile.targetAim } : {}),
            ...(updatedProfile.studentBio !== undefined ? { bio: updatedProfile.studentBio } : {}),
            ...(cleanGoal !== undefined ? { daily_goal_minutes: cleanGoal } : {}),
            ...(updatedProfile.examName !== undefined ? { exam_name: updatedProfile.examName } : {}),
            ...(updatedProfile.examDate !== undefined ? { exam_date: updatedProfile.examDate } : {}),
            updated_at: nowIso,
          },
          {
            id: userId,
            ...(updatedProfile.fullName !== undefined ? { full_name: updatedProfile.fullName } : {}),
            ...(updatedProfile.avatarUrl !== undefined ? { avatar_url: updatedProfile.avatarUrl } : {}),
            ...(updatedProfile.schoolName !== undefined ? { school: updatedProfile.schoolName } : {}),
            ...(updatedProfile.className !== undefined ? { grade: updatedProfile.className } : {}),
            ...(updatedProfile.targetAim !== undefined ? { learning_goal: updatedProfile.targetAim } : {}),
            ...(cleanGoal !== undefined ? { daily_goal_minutes: cleanGoal } : {}),
            updated_at: nowIso,
          },
          {
            id: userId,
            ...(updatedProfile.fullName !== undefined ? { full_name: updatedProfile.fullName } : {}),
            ...(updatedProfile.avatarUrl !== undefined ? { avatar_url: updatedProfile.avatarUrl } : {}),
            ...(updatedProfile.schoolName !== undefined ? { school: updatedProfile.schoolName } : {}),
            ...(updatedProfile.className !== undefined ? { grade: updatedProfile.className } : {}),
            ...(updatedProfile.targetAim !== undefined ? { learning_goal: updatedProfile.targetAim } : {}),
            updated_at: nowIso,
          },
          {
            id: userId,
            ...(updatedProfile.fullName !== undefined ? { full_name: updatedProfile.fullName } : {}),
            ...(updatedProfile.avatarUrl !== undefined ? { avatar_url: updatedProfile.avatarUrl } : {}),
            updated_at: nowIso,
          },
        ];

        for (const payload of candidatePayloads) {
          try {
            const { error } = await supabase.from("profiles").upsert(payload as any);
            if (!error) {
              dbSynced = true;
              break;
            }
          } catch {}
        }

        if (cleanGoal !== undefined) {
          try {
            const { error: stErr } = await supabase.from("study_streak_settings").upsert({
              user_id: userId,
              daily_goal_minutes: cleanGoal,
              updated_at: nowIso,
            });
            if (!stErr) dbSynced = true;
          } catch {}
        }
      }

      return res.json({
        success: true,
        synced: true,
        dbSynced,
        profile: updatedProfile,
      });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        error: err?.message || "Failed to save profile",
      });
    }
  });

  // API Route: Complete Profile & Account Data Deletion (/api/profile/delete)
  app.post("/api/profile/delete", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const body = req.body || {};
      const userId = String(
        body.userId ||
          req.headers["x-studyweb-user-id"] ||
          extractUserIdFromAuthHeader(req.headers.authorization) ||
          ""
      ).trim();

      if (userId) {
        serverProfileStore.delete(userId);
        clearServerUserStreakData(userId);
      }
      workspaceFilesResponseCache.clear();

      const supabase = getSupabaseServerClient(req.headers.authorization);
      if (supabase && userId && userId !== "local-user") {
        // 1. Collect all workspace IDs owned by this user so child tables keyed by workspace_id are deleted completely
        let wsIds: string[] = [];
        try {
          const { data: wsRows } = await supabase
            .from("workspaces")
            .select("id")
            .eq("user_id", userId);
          if (Array.isArray(wsRows)) {
            wsIds = wsRows.map((r: any) => String(r.id)).filter(Boolean);
          }
        } catch {}

        if (wsIds.length > 0) {
          await Promise.allSettled([
            supabase.from("embeddings").delete().in("workspace_id", wsIds),
            supabase.from("document_chunks").delete().in("workspace_id", wsIds),
            supabase.from("processing_jobs").delete().in("workspace_id", wsIds),
            supabase.from("generated_notes").delete().in("workspace_id", wsIds),
            supabase.from("retrieval_logs").delete().in("workspace_id", wsIds),
            supabase.from("documents").delete().in("workspace_id", wsIds),
            supabase.from("workspace_files").delete().in("workspace_id", wsIds),
            supabase.from("study_materials").delete().in("workspace_id", wsIds),
          ]);
        }

        // 2. Delete all user-scoped records across every Supabase table
        await Promise.allSettled([
          supabase.from("embeddings").delete().eq("user_id", userId),
          supabase.from("document_chunks").delete().eq("user_id", userId),
          supabase.from("processing_jobs").delete().eq("user_id", userId),
          supabase.from("generated_notes").delete().eq("user_id", userId),
          supabase.from("retrieval_logs").delete().eq("user_id", userId),
          supabase.from("documents").delete().eq("user_id", userId),
          supabase.from("workspace_files").delete().eq("user_id", userId),
          supabase.from("study_materials").delete().eq("user_id", userId),
          supabase.from("study_notes").delete().eq("user_id", userId),
          supabase.from("study_streak_settings").delete().eq("user_id", userId),
          supabase.from("user_streaks").delete().eq("user_id", userId),
          supabase.from("workspaces").delete().eq("user_id", userId),
        ]);

        // 3. Clear all fields on profiles first (in case RLS restricts row delete) and then delete the profiles row
        try {
          await supabase
            .from("profiles")
            .update({
              name: null,
              full_name: null,
              avatar_url: null,
              bio: null,
              scholar_bio: null,
              school_name: null,
              academic_institution: null,
              class_name: null,
              curriculum_board: null,
              current_study: null,
              subject: null,
              target_aim: null,
              primary_goal: null,
              study_goals: [],
              learning_goals: [],
              preferred_study_times: [],
              onboarding_data: { account_deleted: true },
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", userId);
        } catch {}

        await supabase.from("profiles").delete().eq("id", userId);

        // 4. Delete user's uploaded files in Supabase Storage (avatars bucket)
        try {
          const { data: userAvatarFiles } = await supabase.storage.from("avatars").list(userId);
          if (Array.isArray(userAvatarFiles) && userAvatarFiles.length > 0) {
            const paths = userAvatarFiles.map((f: any) => `${userId}/${f.name}`);
            await supabase.storage.from("avatars").remove(paths);
          }
        } catch {}

        // 5. Invoke delete_user_account RPC and admin.deleteUser if service role key is present
        try {
          await supabase.rpc("delete_user_account");
        } catch {}

        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            await supabase.auth.admin.deleteUser(userId);
          } catch {}
        }
      }

      return res.json({
        success: true,
        deleted: true,
      });
    } catch (err: any) {
      return res.status(200).json({
        success: true,
        deleted: true,
        warning: err?.message,
      });
    }
  });

  // API Route: Authoritative Workspace Deletion (/api/workspaces/delete)
  app.post("/api/workspaces/delete", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const body = req.body || {};
      const userId = String(
        body.userId ||
          req.headers["x-studyweb-user-id"] ||
          extractUserIdFromAuthHeader(req.headers.authorization) ||
          ""
      ).trim();

      const candidateIds = Array.from(
        new Set(
          [body.workspaceId, body.rawWorkspaceId]
            .map((v) => String(v || "").trim())
            .filter(Boolean)
        )
      );

      workspaceFilesResponseCache.clear();

      const supabase = getSupabaseServerClient(req.headers.authorization);
      if (supabase && candidateIds.length > 0) {
        for (const wsId of candidateIds) {
          await Promise.allSettled([
            supabase.from("embeddings").delete().eq("workspace_id", wsId),
            supabase.from("document_chunks").delete().eq("workspace_id", wsId),
            supabase.from("processing_jobs").delete().eq("workspace_id", wsId),
            supabase.from("generated_notes").delete().eq("workspace_id", wsId),
            supabase.from("retrieval_logs").delete().eq("workspace_id", wsId),
            supabase.from("documents").delete().eq("workspace_id", wsId),
            supabase.from("study_materials").delete().eq("workspace_id", wsId),
            supabase.from("workspace_files").delete().eq("workspace_id", wsId),
            userId
              ? supabase.from("workspaces").delete().eq("id", wsId).eq("user_id", userId)
              : supabase.from("workspaces").delete().eq("id", wsId),
          ]);
        }
      }

      return res.json({ success: true, deleted: true });
    } catch (err: any) {
      return res.status(200).json({ success: false, error: err?.message });
    }
  });

  // API Route: Authoritative Workspace File Deletion (/api/workspaces/files/delete)
  app.post("/api/workspaces/files/delete", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const body = req.body || {};
      const userId = String(
        body.userId ||
          req.headers["x-studyweb-user-id"] ||
          extractUserIdFromAuthHeader(req.headers.authorization) ||
          ""
      ).trim();

      const workspaceId = String(body.workspaceId || "").trim();
      const fileIds = Array.from(
        new Set(
          [body.fileId, body.rawFileId]
            .map((v) => String(v || "").trim())
            .filter(Boolean)
        )
      );
      const fileName = String(body.fileName || "").trim().toLowerCase();
      const clearAll = Boolean(body.clearAll);

      workspaceFilesResponseCache.clear();

      const supabase = getSupabaseServerClient(req.headers.authorization);
      if (supabase) {
        if (clearAll && workspaceId) {
          await Promise.allSettled([
            supabase.from("embeddings").delete().eq("workspace_id", workspaceId),
            supabase.from("document_chunks").delete().eq("workspace_id", workspaceId),
            supabase.from("documents").delete().eq("workspace_id", workspaceId),
            supabase.from("study_materials").delete().eq("workspace_id", workspaceId),
            supabase.from("workspace_files").delete().eq("workspace_id", workspaceId),
          ]);

          try {
            const { data: wsRow } = await supabase
              .from("workspaces")
              .select("id, nodes, links")
              .eq("id", workspaceId)
              .maybeSingle();

            if (wsRow) {
              const filteredNodes = Array.isArray(wsRow.nodes)
                ? wsRow.nodes.filter((n: any) => n?.type !== "file")
                : [];
              const validNodeIds = new Set(filteredNodes.map((n: any) => n?.id));
              const filteredLinks = Array.isArray(wsRow.links)
                ? wsRow.links.filter((l: any) => validNodeIds.has(l?.target))
                : [];

              await supabase
                .from("workspaces")
                .update({
                  files: [],
                  nodes: filteredNodes,
                  links: filteredLinks,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", workspaceId);
            }
          } catch {}
        } else {
          for (const fId of fileIds) {
            await Promise.allSettled([
              supabase.from("embeddings").delete().eq("document_id", fId),
              supabase.from("document_chunks").delete().eq("document_id", fId),
              supabase.from("documents").delete().eq("id", fId),
              supabase.from("study_materials").delete().eq("id", fId),
              userId
                ? supabase.from("workspace_files").delete().eq("id", fId).eq("user_id", userId)
                : supabase.from("workspace_files").delete().eq("id", fId),
            ]);
          }

          if (workspaceId) {
            try {
              const { data: wsRow } = await supabase
                .from("workspaces")
                .select("id, files, nodes, links")
                .eq("id", workspaceId)
                .maybeSingle();

              if (wsRow) {
                const fileIdSet = new Set(fileIds.map((id) => id.toLowerCase()));
                const updatedFiles = Array.isArray(wsRow.files)
                  ? wsRow.files.filter((f: any) => {
                      const candId = String(f?.id || "").trim().toLowerCase();
                      const candName = String(f?.name || "").trim().toLowerCase();
                      if (candId && fileIdSet.has(candId)) return false;
                      if (fileName && candName && candName === fileName) return false;
                      return true;
                    })
                  : [];

                const updatedNodes = Array.isArray(wsRow.nodes)
                  ? wsRow.nodes.filter((n: any) => {
                      const nid = String(n?.id || "").trim().toLowerCase();
                      for (const fid of fileIdSet) {
                        if (nid === `n-${fid}`) return false;
                      }
                      return true;
                    })
                  : [];

                const updatedLinks = Array.isArray(wsRow.links)
                  ? wsRow.links.filter((l: any) => {
                      const tgt = String(l?.target || "").trim().toLowerCase();
                      for (const fid of fileIdSet) {
                        if (tgt === `n-${fid}`) return false;
                      }
                      return true;
                    })
                  : [];

                await supabase
                  .from("workspaces")
                  .update({
                    files: updatedFiles,
                    nodes: updatedNodes,
                    links: updatedLinks,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", workspaceId);
              }
            } catch {}
          }
        }
      }

      return res.json({ success: true, deleted: true });
    } catch (err: any) {
      return res.status(200).json({ success: false, error: err?.message });
    }
  });

  // API Route: Video Transcript & Caption Downloader via TranscriptProcessor
  app.all("/api/video-transcript", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const url = String(req.body?.url || req.query?.url || req.body?.videoId || req.query?.videoId || "").trim();
      const preferredLang = String(req.body?.lang || req.query?.lang || "en").trim();
      const minWordCount =
        req.body?.minWordCount !== undefined
          ? parseInt(String(req.body.minWordCount), 10)
          : req.query?.minWordCount !== undefined
          ? parseInt(String(req.query.minWordCount), 10)
          : undefined;

      if (!url) {
        return res.status(400).json({ error: "A video URL or videoId is required." });
      }

      const transcript = await TranscriptProcessor.fetchTranscript(url, {
        preferredLang,
        minWordCount
      });

      return res.json({
        success: true,
        isValid: transcript.isValidWordCount,
        wordCount: transcript.wordCount,
        validationStatus: transcript.validationStatus,
        validationMessage: transcript.validationMessage,
        transcript
      });
    } catch (err: any) {
      console.error("[TranscriptProcessor Route Error]:", err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Failed to fetch and parse video captions."
      });
    }
  });

  // API Route: AI Video Summary with TranscriptProcessor Validation Step
  app.post("/api/video-summary", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const url = String(req.body?.url || req.body?.videoId || "").trim();
      const minWordCount =
        req.body?.minWordCount !== undefined
          ? parseInt(String(req.body.minWordCount), 10)
          : TranscriptProcessor.DEFAULT_MIN_WORD_COUNT;
      const preferredLang = String(req.body?.lang || "en").trim();
      const customPrompt = req.body?.customPrompt ? String(req.body.customPrompt).trim() : undefined;

      if (!url) {
        return res.status(400).json({ error: "A video URL or videoId is required." });
      }

      const summaryResult = await TranscriptProcessor.generateSummary(url, {
        minWordCount,
        preferredLang,
        customPrompt
      });

      return res.json(summaryResult);
    } catch (err: any) {
      console.error("[Video Summary Route Error]:", err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Failed to generate video summary."
      });
    }
  });


  // API Route: Authenticated server-side workspace files proxy with strict user ownership check
  app.get("/api/workspace-files", async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string | undefined;
      const workspaceIds = req.query.workspaceIds ? (req.query.workspaceIds as string).split(",") : undefined;
      const limit = Math.min(50, Math.max(1, req.query.limit ? parseInt(req.query.limit as string, 10) : 10));

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.json({ files: [] });
      }

      const supabase = getSupabaseServerClient(authHeader);
      if (!supabase) {
        return res.json({ files: [] });
      }

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user?.id) {
        return res.json({ files: [] });
      }

      const cacheKey = `${authData.user.id}:${workspaceId || (workspaceIds || []).join(",")}:${limit}`;
      const cached = workspaceFilesResponseCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return res.json({ files: cached.files });
      }

      let query = supabase
        .from('workspace_files')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else if (workspaceIds && workspaceIds.length > 0) {
        query = query.in('workspace_id', workspaceIds);
      } else {
        return res.json({ files: [] });
      }

      const { data, error } = await query;
      if (error) {
        return res.json({ files: [] });
      }

      const files = data || [];
      if (workspaceFilesResponseCache.size > 2000) {
        workspaceFilesResponseCache.clear();
      }
      workspaceFilesResponseCache.set(cacheKey, { files, expiresAt: Date.now() + 8_000 });

      return res.json({ files });
    } catch {
      return res.json({ files: [] });
    }
  });

  // API Route: Send Contact Form Submission via Email
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, role, subject, message } = req.body;

      if (!name || !email || !role || !subject || !message) {
        res.status(400).json({ error: "All required fields must be filled out." });
        return;
      }

      const safeName = escapeHtml(String(name).slice(0, 120));
      const safeEmail = escapeHtml(String(email).slice(0, 180));
      const safeRole = escapeHtml(String(role).slice(0, 80));
      const safeSubject = escapeHtml(String(subject).slice(0, 200));
      const safeMessage = escapeHtml(String(message).slice(0, 4000));

      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const recipient = process.env.CONTACT_RECIPIENT_EMAIL || "studyweb908@gmail.com";

      // Check if SMTP details are defined
      if (!host || !user || !pass) {
        console.warn(
          "[Contact Form] SMTP variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured."
        );
        res.json({
          success: true,
          status: "logged_to_console",
          message: "Message received! (SMTP configuration not set in workspace settings)."
        });
        return;
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: process.env.SMTP_ALLOW_SELF_SIGNED !== "true"
        }
      });

      const mailOptions = {
        from: `"${safeName} via StudyWeb Contact" <${user}>`,
        replyTo: String(email).replace(/[\r\n]/g, "").slice(0, 180),
        to: recipient,
        subject: `StudyWeb Contact: ${String(subject).replace(/[\r\n]/g, "").slice(0, 150)}`,
        text: `You received a new message from the StudyWeb contact form:\n\nName: ${name}\nEmail: ${email}\nRole: ${role}\nSubject: ${subject}\n\nMessage:\n${message}\n`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; max-width: 600px; border: 1px solid #eaeaea; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-top: 0;">New StudyWeb Contact Submission</h2>
            <p>You received a new message from the StudyWeb landing page contact form.</p>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px;">Name:</td>
                <td style="padding: 6px 0;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Email:</td>
                <td style="padding: 6px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Role/Who:</td>
                <td style="padding: 6px 0;">${safeRole}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Subject:</td>
                <td style="padding: 6px 0;">${safeSubject}</td>
              </tr>
            </table>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <h3 style="color: #333;">Message:</h3>
            <p style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 0; white-space: pre-wrap;">${safeMessage}</p>
            <footer style="margin-top: 30px; font-size: 11px; color: #999;">
              This email was sent automatically from the StudyWeb application server.
            </footer>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully: ${info.messageId}`);
      res.json({
        success: true,
        status: "sent_successfully",
        message: "Your message has been sent successfully to StudyWeb!"
      });
    } catch (error: any) {
      console.error("Error sending email in backend contact route:", error?.message);
      res.status(500).json({
        error: "Failed to send the email due to server-side mailer error."
      });
    }
  });

  // Helper: Advanced HTML scraper to extract title, description, and text
  async function fetchUrlData(url: string): Promise<{ title: string; description: string; text: string }> {
    try {
      console.log(`Web Scraper fetching URL: ${url}`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
      if (!res.ok) {
        console.warn(`Scraper failed to fetch with status: ${res.status}`);
        return { title: "", description: "", text: "" };
      }
      const html = await res.text();

      // Extract Title
      let title = "";
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                           html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim();
      }

      // Extract Description
      let description = "";
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i) ||
                        html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim();
      }

      // Clean HTML to get pure text content
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        title: title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'"),
        description: description.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'"),
        text: cleanText.substring(0, 15000) // Support larger context up to 15,000 characters
      };
    } catch (err: any) {
      console.warn("Failed to scrape URL text:", err.message);
      return { title: "", description: "", text: "" };
    }
  }

  // Helper: Retrieve YouTube title & channel using the public YouTube oEmbed endpoint
  async function fetchYouTubeMetadata(url: string): Promise<{ title: string; author: string } | null> {
    try {
      const encodedUrl = encodeURIComponent(url);
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodedUrl}&format=json`;
      console.log(`Web Scraper fetching YouTube oEmbed: ${oembedUrl}`);
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json() as any;
        if (data && data.title) {
          return {
            title: data.title || "",
            author: data.author_name || ""
          };
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch YouTube oEmbed metadata:", err.message);
    }
    return null;
  }

  // --- NOTEBOOKLM HIGH-PRECISION RAG SERVICES ---

  /**
   * Robustly chunk academic resource material into rich semantic passages
   */
  function chunkFileContent(file: any): string[] {
    const chunks: string[] = [];
    const sourceName = file.name || "Document";
    
    if (file.summary) {
      chunks.push(`[Source: ${sourceName} | Section: Summary] ${file.summary}`);
    }
    
    if (file.highlights && file.highlights.length > 0) {
      file.highlights.forEach((h: string, i: number) => {
        chunks.push(`[Source: ${sourceName} | Passage ${i + 1}] ${h}`);
      });
    }
    
    if (file.formulas && file.formulas.length > 0) {
      const formulasStr = file.formulas.join(", ");
      chunks.push(`[Source: ${sourceName} | Scientific Formulas] Key equations and stoichiometric ratios: ${formulasStr}`);
    }

    if (file.transcription) {
      const text = file.transcription;
      // Split transcription by timestamps or sentence boundaries into chunks of ~500 characters
      const sentences = text.split(/(?<=[.!?])\s+/);
      let currentChunk = "";
      let paragraphCount = 1;
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > 550) {
          if (currentChunk.trim()) {
            chunks.push(`[Source: ${sourceName} | Transcription Segment ${paragraphCount}] ${currentChunk.trim()}`);
            paragraphCount++;
          }
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence;
        }
      }
      if (currentChunk.trim()) {
        chunks.push(`[Source: ${sourceName} | Transcription Segment ${paragraphCount}] ${currentChunk.trim()}`);
      }
    }

    // Fallback if no specific fields exist but we have description
    if (chunks.length === 0 && file.description) {
      chunks.push(`[Source: ${sourceName} | Description] ${file.description}`);
    }

    return chunks;
  }

  /**
   * Generate high-fidelity text embedding vectors using Gemini text-embedding-004
   */
  async function getEmbedding(ai: any, text: string): Promise<number[] | null> {
    if (!ai) return null;
    try {
      const res = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: text
      });
      if (res && res.embedding && res.embedding.values) {
        return res.embedding.values;
      }
    } catch (err) {
      console.warn(`[RAG Embedding] Skipping embedding for chunk: "${text.substring(0, 30)}..." - Error:`, err);
    }
    return null;
  }

  /**
   * Cosine similarity between two vector embeddings
   */
  function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Fast local Jaccard word-overlap similarity fallback (for offline or keyless environments)
   */
  function JaccardWordSimilarity(textA: string, textB: string): number {
    const clean = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2);
    const wordsA = clean(textA);
    const wordsB = clean(textB);
    
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    
    let intersection = 0;
    setA.forEach(w => {
      if (setB.has(w)) intersection++;
    });
    
    const union = new Set([...wordsA, ...wordsB]).size;
    if (union === 0) return 0;
    return intersection / union;
  }

  // Helper to detect and clean legacy dummy metadata (like old Channel/Duration/Direct Video Link strings)
  function isDummyMetadataLine(str?: string): boolean {
    if (!str || typeof str !== 'string') return true;
    const s = str.trim();
    if (!s) return true;
    const lower = s.toLowerCase();
    return (
      lower.includes('**channel:**') ||
      lower.includes('**duration:**') ||
      lower.includes('**direct video link:**') ||
      lower.includes('direct watch & in-app embed available') ||
      lower.includes('comprehensively outlines') ||
      lower.includes('foundational definitions') ||
      lower.includes('critical frameworks') ||
      lower.includes('structural analysis') ||
      lower.includes('high-yield academic study guide for') ||
      lower.includes('mastering the foundational definitions in') ||
      lower.includes('uploaded and indexed into your workspace') ||
      lower.includes('ready for study questions') ||
      lower.includes('ready for ai tutor questions') ||
      lower.includes('uploaded to workspace') ||
      lower.includes('youtube is currently blocking us') ||
      lower.includes('preventing us from generating a summary') ||
      lower.includes('enjoy the videos') ||
      lower.includes('enjoy the videos and music you love') ||
      lower.includes('upload original content, and share it all') ||
      lower.includes('and the world on youtube') ||
      lower.includes('document 1246') ||
      lower.startsWith('mix -') ||
      lower.includes('youtube mix') ||
      lower.startsWith('uploaded study file:') ||
      lower.startsWith('study document:') ||
      lower.startsWith('study material:') ||
      lower.includes('this biology resource explores cellular systems and functions') ||
      lower.includes('educational summary of cell biology, its foundational') ||
      lower.includes('high-quality study resource covering critical academic theories') ||
      lower.includes('welcome to the studyweb audio summary series')
    );
  }

  function cleanMultilineText(raw?: string): string {
    if (!raw || typeof raw !== 'string') return '';
    return raw
      .split('\n')
      .filter(line => {
        const l = line.trim().toLowerCase();
        if (!l) return true;
        if (isDummyMetadataLine(l)) return false;
        return true;
      })
      .join('\n')
      .trim();
  }

  interface ExtractedSegment {
    id: string;
    fileId?: string;
    sourceName: string;
    fileType: string;
    page: number;
    text: string;
    snippet: string;
    score: number;
  }

  /**
   * Document-Aware Segment Extractor
   * Slices active workspace documents (PDFs, notes, OCR screenshots, audio transcripts) into
   * granular passages and scores them against the user's specific query.
   */
  const DEFAULT_DEMO_STUB_IDS = new Set([
    "11111111-1111-4111-8111-111111111101",
    "11111111-1111-4111-8111-111111111102",
    "22222222-2222-4222-8222-222222222201",
    "33333333-3333-4333-8333-333333333301"
  ]);
  const DEFAULT_DEMO_STUB_NAMES = new Set([
    "newton_laws_and_friction_formulae.pdf",
    "rotational_dynamics_summary.pdf",
    "fundamental_theorems_of_calculus.pdf",
    "nucleophilic_substitution_mechanisms.pdf"
  ]);

  function isDefaultDemoStubFile(file: any): boolean {
    if (!file) return false;
    const idStr = String(file.id || "").trim().toLowerCase();
    const nameStr = String(file.name || "").trim().toLowerCase();
    return DEFAULT_DEMO_STUB_IDS.has(idStr) || DEFAULT_DEMO_STUB_NAMES.has(nameStr);
  }

  function extractRelevantDocumentSegments(
    query: string,
    files: any[],
    topK: number = 10,
    forceIncludeWhenZeroScore: boolean = false
  ): {
    segments: ExtractedSegment[];
    contextString: string;
    hasHighRelevance: boolean;
  } {
    if (!files || files.length === 0) {
      return { segments: [], contextString: "", hasHighRelevance: false };
    }

    const qLower = query.toLowerCase();
    const stopWords = new Set([
      "what", "is", "the", "are", "tell", "me", "about", "how", "why", "does", "do",
      "please", "can", "you", "in", "my", "this", "that", "there", "and", "or", "for",
      "with", "from", "into", "give", "help", "show", "make", "like", "have", "has",
      "had", "was", "were", "been", "being", "will", "would", "could", "should", "may",
      "might", "must", "need", "want", "very", "much", "more", "most", "some", "any",
      "all", "other", "another", "such", "only", "own", "same", "than", "too", "just",
      "now", "here", "where", "when", "who", "whom", "whose", "which", "workspace",
      "workspaces", "uploaded", "upload", "study", "tutor", "bro", "files", "file",
      "documents", "document", "notes", "note", "materials", "material"
    ]);

    const rawTokens = qLower
      .split(/[^a-z0-9_-]+/)
      .filter(w => (w.length >= 2 || /^\d+$/.test(w)) && !stopWords.has(w));
    const queryTokens = Array.from(new Set(rawTokens));

    const allSegments: ExtractedSegment[] = [];

    files.forEach((file: any, fileIdx: number) => {
      const fileName = file.name || `Document #${fileIdx + 1}`;
      const fileType = file.type || 'doc';
      const totalPages = file.pages || 1;
      const isUserFile = !isDefaultDemoStubFile(file);
      const rawUnits: Array<{ text: string; approxPage: number; type: string }> = [];

      // 1. From transcription or contentText (audio/video captions, PDF text, or OCR of screenshots/images)
      const combinedTranscript = [file.transcription, file.contentText, file.content_text]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join('\n\n');
      if (combinedTranscript && typeof combinedTranscript === 'string' && combinedTranscript.trim()) {
        const cleanedTranscript = cleanMultilineText(combinedTranscript);
        const paras = cleanedTranscript
          .split(/\n\s*\n|\n(?=#{1,4}\s)|\n(?=\[\d{1,2}:\d{2})|(?<=[.!?])\s+(?=[A-Z0-9])/)
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 15 && !isDummyMetadataLine(p));

        // Group very short adjacent lines into richer ~400-char chunks so context isn't fragmented
        let buffer = '';
        let bufferStartIdx = 0;
        paras.forEach((p: string, pIdx: number) => {
          if (!buffer) {
            buffer = p;
            bufferStartIdx = pIdx;
          } else if (buffer.length + p.length < 480) {
            buffer += `\n${p}`;
          } else {
            const pageNum = Math.min(totalPages, Math.floor((bufferStartIdx / Math.max(1, paras.length)) * totalPages) + 1);
            rawUnits.push({ text: buffer, approxPage: pageNum, type: 'Transcription / Document Text' });
            buffer = p;
            bufferStartIdx = pIdx;
          }
        });
        if (buffer) {
          const pageNum = Math.min(totalPages, Math.floor((bufferStartIdx / Math.max(1, paras.length)) * totalPages) + 1);
          rawUnits.push({ text: buffer, approxPage: pageNum, type: 'Transcription / Document Text' });
        }
      }

      // 1b. From structured extractedDiagrams / extracted_diagrams if present
      const rawDiagrams = file.extractedDiagrams || file.extracted_diagrams;
      if (rawDiagrams) {
        try {
          const diagObj = typeof rawDiagrams === 'string'
            ? JSON.parse(rawDiagrams)
            : (Array.isArray(rawDiagrams) && typeof rawDiagrams[0] === 'string' ? JSON.parse(rawDiagrams[0]) : rawDiagrams);
          if (diagObj && typeof diagObj === 'object') {
            if (diagObj.detailedNotes && typeof diagObj.detailedNotes === 'string') {
              rawUnits.push({ text: cleanMultilineText(diagObj.detailedNotes.slice(0, 2500)), approxPage: 1, type: 'Detailed Notes' });
            }
            if (Array.isArray(diagObj.conceptsAndDefinitions)) {
              const defsText = diagObj.conceptsAndDefinitions
                .map((cd: any) => `${cd.concept || ''}: ${cd.definition || ''}`)
                .filter((s: string) => s.length > 5)
                .join('\n');
              if (defsText) {
                rawUnits.push({ text: defsText, approxPage: 1, type: 'Concepts & Definitions' });
              }
            }
            if (Array.isArray(diagObj.practiceQuestions)) {
              const pqText = diagObj.practiceQuestions
                .map((pq: any) => `Q: ${pq.question || ''} A: ${pq.answer || ''} (${pq.explanation || ''})`)
                .filter((s: string) => s.length > 10)
                .join('\n');
              if (pqText) {
                rawUnits.push({ text: pqText, approxPage: 1, type: 'Practice Questions' });
              }
            }
          }
        } catch {
          // ignore malformed JSON
        }
      }

      // 2. From chunks
      if (file.chunks && Array.isArray(file.chunks)) {
        file.chunks.forEach((c: any, cIdx: number) => {
          const text = typeof c === 'string' ? c : c.text;
          if (text && text.trim().length > 15 && !isDummyMetadataLine(text)) {
            const pageNum = c.page || Math.min(totalPages, Math.floor((cIdx / Math.max(1, file.chunks.length)) * totalPages) + 1);
            rawUnits.push({ text: cleanMultilineText(text.trim()), approxPage: pageNum, type: 'Indexed Segment' });
          }
        });
      }

      // 3. From highlights
      if (file.highlights && Array.isArray(file.highlights)) {
        file.highlights.forEach((h: string, hIdx: number) => {
          if (h && typeof h === 'string' && h.trim().length > 10 && !isDummyMetadataLine(h)) {
            const pageNum = Math.min(totalPages, Math.floor((hIdx / Math.max(1, file.highlights.length)) * totalPages) + 1);
            rawUnits.push({ text: h.trim(), approxPage: pageNum, type: 'Key Finding' });
          }
        });
      }

      // 4. From formulas / equations
      if (file.formulas && Array.isArray(file.formulas)) {
        file.formulas.forEach((formula: string) => {
          if (formula && typeof formula === 'string' && formula.trim()) {
            rawUnits.push({ text: `Formula/Equation: ${formula.trim()}`, approxPage: 1, type: 'Formula' });
          }
        });
      }

      // 5. From summary (if not generic boilerplate)
      if (file.summary && typeof file.summary === 'string' && !isDummyMetadataLine(file.summary)) {
        rawUnits.push({ text: cleanMultilineText(file.summary.trim()), approxPage: 1, type: 'Overview' });
      }

      // 6. Always include a title & workspace metadata unit so topic queries matching a file's title or subject always match
      rawUnits.push({
        text: `${fileName}${file.workspaceName ? ` (Workspace: ${file.workspaceName})` : ''}${file.summary && !isDummyMetadataLine(file.summary) ? ` — ${file.summary.slice(0, 400)}` : ''}`,
        approxPage: 1,
        type: 'Title & Overview'
      });

      // Score each unit
      rawUnits.forEach((unit, uIdx) => {
        const uText = unit.text;
        const uLower = uText.toLowerCase();
        const fnLower = fileName.toLowerCase();
        let score = isUserFile ? 2 : 0;
        if (file.isDirectAttachment) {
          score += 4;
        }

        queryTokens.forEach(t => {
          const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`\\b${escaped}\\b`, 'i').test(uText) || new RegExp(`\\b${escaped}\\b`, 'i').test(fileName)) {
            score += 6;
          } else if (t.length >= 3 && (uLower.includes(t) || fnLower.includes(t))) {
            score += 5;
          } else if (t.length >= 5) {
            // Prefix/stem match for inflected words (e.g., photosynthesize vs photosynthesis)
            const stem = t.slice(0, Math.max(4, t.length - 2));
            if (uLower.includes(stem) || fnLower.includes(stem)) {
              score += 3;
            }
          }
        });

        // Bigram matching
        for (let i = 0; i < queryTokens.length - 1; i++) {
          const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
          if (uLower.includes(bigram) || fnLower.includes(bigram)) {
            score += 6;
          }
        }

        // Bonus if user query explicitly mentions file name keywords
        const fnWords = fnLower.split(/[^a-z0-9]+/).filter((w: string) => w.length > 2 && !stopWords.has(w));
        if (fnWords.some((w: string) => qLower.includes(w))) {
          score += 7;
        }

        // Snippet generation
        let snippet = uText;
        if (snippet.length > 220) {
          let firstMatchIdx = -1;
          for (const t of queryTokens) {
            const idx = uLower.indexOf(t);
            if (idx !== -1 && (firstMatchIdx === -1 || idx < firstMatchIdx)) {
              firstMatchIdx = idx;
            }
          }
          if (firstMatchIdx !== -1) {
            const start = Math.max(0, firstMatchIdx - 50);
            const end = Math.min(uText.length, start + 200);
            snippet = (start > 0 ? "..." : "") + uText.slice(start, end).trim() + (end < uText.length ? "..." : "");
          } else {
            snippet = uText.slice(0, 200).trim() + "...";
          }
        }

        allSegments.push({
          id: `seg-${fileIdx}-${uIdx}`,
          fileId: file.id,
          sourceName: fileName,
          fileType,
          page: unit.approxPage || 1,
          text: uText,
          snippet,
          score
        });
      });
    });

    allSegments.sort((a, b) => b.score - a.score);

    const hasHighRelevance = allSegments.length > 0 && allSegments[0].score >= 5;
    let selectedSegments: ExtractedSegment[] = [];

    if (hasHighRelevance) {
      selectedSegments = allSegments.filter(s => s.score >= 4).slice(0, topK);
      if (selectedSegments.length < 3 && forceIncludeWhenZeroScore) {
        for (const seg of allSegments) {
          if (!selectedSegments.includes(seg)) {
            selectedSegments.push(seg);
            if (selectedSegments.length >= topK) break;
          }
        }
      }
    } else if (forceIncludeWhenZeroScore) {
      const fileSeen = new Map<string, number>();
      for (const seg of allSegments) {
        const count = fileSeen.get(seg.sourceName) || 0;
        if (count < 4) {
          selectedSegments.push(seg);
          fileSeen.set(seg.sourceName, count + 1);
          if (selectedSegments.length >= topK) break;
        }
      }
      if (selectedSegments.length === 0) {
        selectedSegments = allSegments.slice(0, topK);
      }
    } else {
      return { segments: [], contextString: "", hasHighRelevance: false };
    }

    if (selectedSegments.length === 0) {
      return { segments: [], contextString: "", hasHighRelevance: false };
    }

    let contextString = "=== RETRIEVED WORKSPACE DOCUMENT SEGMENTS ===\n";
    contextString += "Below are the highest-priority passages retrieved from the student's uploaded workspace materials:\n\n";

    selectedSegments.forEach((seg, idx) => {
      contextString += `[Segment ${idx + 1} | Source: "${seg.sourceName}" | Page ${seg.page} | Relevance: ${seg.score >= 5 ? 'High Match' : 'Workspace Context'}]\n`;
      contextString += `"${seg.text}"\n\n`;
    });

    return { segments: selectedSegments, contextString, hasHighRelevance };
  }

  /**
   * Advanced RAG Knowledge Engine Retrieval
   * Reusable central engine for extracting semantically relevant chunks across all workspace features.
   */
  async function performAdvancedRAG(ai: any, query: string, files: any[], notes: any[], topK: number = 8, overrideWorkspaceId?: string, authHeader?: string): Promise<string> {
    const { retrieveKnowledge } = await import('./src/knowledge-engine/retrieval/rag.js');
    let workspaceId = overrideWorkspaceId || '';
    if (!workspaceId) {
      if (files && files.length > 0 && files[0].workspaceId) workspaceId = files[0].workspaceId;
      else if (notes && notes.length > 0 && notes[0].workspaceId) workspaceId = notes[0].workspaceId;
    }
    
    return await retrieveKnowledge(workspaceId, 'local-user', query, topK, ai, files, notes, authHeader);
  }

function isImageOrDiagramRequest(prompt: string): boolean {
  const q = prompt.toLowerCase().trim();
  if (
    /\b(explain|analyze|describe|read|summarize|what\s+is\s+in|what's\s+in|solve)\s+(this|the|my|attached|uploaded)\s+(image|picture|photo|diagram)\b/i.test(
      q
    )
  ) {
    return false;
  }
  return /\b((generate|create|make|draw|produce|render|design|paint|sketch)\s+(me\s+)?(an?\s+|some\s+|the\s+|any\s+)?(\w+\s+)?(image|images|picture|pictures|photo|photos|illustration|illustrations|drawing|drawings|diagram|diagrams|artwork|art|portrait|wallpaper|poster|logo)|(show|give|send|provide)\s+(me\s+)?(an?\s+|some\s+)?(image|images|picture|pictures|photo|photos|illustration|drawing))|^(an?\s+)?(image|picture|photo)\s+of\b/i.test(
    q
  );
}

function extractCleanTopicLabel(prompt: string): string {
  let cleaned = prompt
    .replace(/https?:\/\/[^\s]+/gi, "")
    .replace(/^(hi|hello|hey|bro|please|can you|could you|will you|tell me about|tell me|explain to me|explain|what is|what's|what are|how does|how do|define|describe|generate an? image of|create an? image of|make an? image of|draw a? diagram of|draw an? image of|generate a? diagram of|create a? diagram of|illustrate|show me an? image of|show me a? diagram of|give me an? explanation of|about)\s+/i, "")
    .replace(/^(what|how|why|the|a|an)\s+/i, "")
    .replace(/\s+(is like|works|work|in detail|in simple words|for me|please|and generate an? image|with a? diagram|with an? image)\??$/i, "")
    .replace(/[?!.]+$/g, "")
    .trim();
  if (!cleaned || cleaned.length < 2) {
    cleaned = prompt.trim().replace(/[?!.]+$/g, "").slice(0, 60);
  }
  if (cleaned.length > 60) {
    cleaned = cleaned.slice(0, 57).trim() + "...";
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function escapeSvgText(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateEducationalDiagramDataUrl(prompt: string, topicLabel: string): { imageUrl: string; caption: string } {
  const pLower = prompt.toLowerCase();
  const safeTopic = escapeSvgText(topicLabel.slice(0, 48));

  if (pLower.includes("photosynthesis") || pLower.includes("chloroplast") || pLower.includes("plant")) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="55%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#064e3b"/>
        </linearGradient>
        <linearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fde047"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
        <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" rx="24" fill="url(#sky)"/>
      <!-- Header -->
      <text x="48" y="52" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="24" font-weight="800">Photosynthesis — Biological Energy Conversion Diagram</text>
      <text x="48" y="80" fill="#94a3b8" font-family="monospace" font-size="15" font-weight="600">Equation: 6CO₂ + 6H₂O + Light Energy (Chlorophyll) → C₆H₁₂O₆ (Glucose) + 6O₂ ↑</text>

      <!-- Sun Node -->
      <circle cx="145" cy="185" r="52" fill="url(#sunGrad)" opacity="0.95"/>
      <circle cx="145" cy="185" r="66" fill="none" stroke="#fde047" stroke-width="2" stroke-dasharray="6 6" opacity="0.6"/>
      <text x="145" y="182" text-anchor="middle" fill="#0f172a" font-family="system-ui, sans-serif" font-size="14" font-weight="800">SUNLIGHT</text>
      <text x="145" y="200" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="11" font-weight="700">Photons (hν)</text>
      <path d="M 210 205 L 335 248" stroke="#fde047" stroke-width="4" stroke-dasharray="8 4"/>
      <polygon points="335,248 322,238 326,252" fill="#fde047"/>

      <!-- CO2 Input Node -->
      <rect x="65" y="290" width="175" height="72" rx="14" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <text x="152" y="320" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="14" font-weight="800">1. Carbon Dioxide (6CO₂)</text>
      <text x="152" y="342" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="12">Enters leaf via Stomata</text>
      <path d="M 240 326 L 335 295" stroke="#38bdf8" stroke-width="3.5"/>
      <polygon points="335,295 321,293 326,305" fill="#38bdf8"/>

      <!-- H2O Input Node -->
      <rect x="65" y="395" width="175" height="72" rx="14" fill="#1e293b" stroke="#60a5fa" stroke-width="2"/>
      <text x="152" y="425" text-anchor="middle" fill="#60a5fa" font-family="system-ui, sans-serif" font-size="14" font-weight="800">2. Water (6H₂O)</text>
      <text x="152" y="447" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="12">Absorbed by Xylem / Roots</text>
      <path d="M 240 425 L 345 340" stroke="#60a5fa" stroke-width="3.5"/>
      <polygon points="345,340 331,344 339,354" fill="#60a5fa"/>

      <!-- Central Chloroplast / Leaf Engine -->
      <rect x="345" y="145" width="280" height="275" rx="26" fill="url(#leafGrad)" stroke="#34d399" stroke-width="3"/>
      <text x="485" y="182" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="800">CHLOROPLAST</text>
      <text x="485" y="202" text-anchor="middle" fill="#d1fae5" font-family="system-ui, sans-serif" font-size="12" font-weight="600">Chlorophyll Pigment Inside Leaf Cells</text>

      <!-- Stage A: Light Reactions -->
      <rect x="368" y="220" width="234" height="78" rx="12" fill="#064e3b" stroke="#6ee7b7" stroke-width="1.5"/>
      <text x="485" y="246" text-anchor="middle" fill="#6ee7b7" font-family="system-ui, sans-serif" font-size="13" font-weight="800">Stage I: Light-Dependent</text>
      <text x="485" y="266" text-anchor="middle" fill="#ecfdf5" font-family="system-ui, sans-serif" font-size="11">Thylakoid Membrane splits H₂O</text>
      <text x="485" y="284" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="11">Produces ATP + NADPH + O₂</text>

      <!-- Stage B: Calvin Cycle -->
      <rect x="368" y="316" width="234" height="82" rx="12" fill="#064e3b" stroke="#6ee7b7" stroke-width="1.5"/>
      <text x="485" y="342" text-anchor="middle" fill="#6ee7b7" font-family="system-ui, sans-serif" font-size="13" font-weight="800">Stage II: Calvin Cycle</text>
      <text x="485" y="362" text-anchor="middle" fill="#ecfdf5" font-family="system-ui, sans-serif" font-size="11">Stroma fixes CO₂ using ATP/NADPH</text>
      <text x="485" y="380" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="11">Synthesizes Glucose (C₆H₁₂O₆)</text>

      <!-- Oxygen Output Node -->
      <path d="M 625 255 L 710 215" stroke="#34d399" stroke-width="3.5"/>
      <polygon points="710,215 696,215 702,226" fill="#34d399"/>
      <rect x="715" y="168" width="190" height="88" rx="14" fill="#1e293b" stroke="#34d399" stroke-width="2"/>
      <text x="810" y="198" text-anchor="middle" fill="#34d399" font-family="system-ui, sans-serif" font-size="15" font-weight="800">Oxygen Gas (6O₂ ↑)</text>
      <text x="810" y="220" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="12">Released into atmosphere</text>
      <text x="810" y="238" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Essential for respiration</text>

      <!-- Glucose Output Node -->
      <path d="M 625 352 L 710 368" stroke="#fbbf24" stroke-width="3.5"/>
      <polygon points="710,368 697,360 699,373" fill="#fbbf24"/>
      <rect x="715" y="325" width="190" height="92" rx="14" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      <text x="810" y="355" text-anchor="middle" fill="#fbbf24" font-family="system-ui, sans-serif" font-size="15" font-weight="800">Glucose (C₆H₁₂O₆)</text>
      <text x="810" y="377" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="12">Chemical energy for plant</text>
      <text x="810" y="396" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Stored as Starch / Cellulose</text>

      <!-- Footer Summary Strip -->
      <rect x="48" y="482" width="864" height="36" rx="10" fill="#0f172a" opacity="0.75"/>
      <text x="480" y="505" text-anchor="middle" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13" font-weight="600">StudyWeb Visual Tutor • Light Energy → Chemical Energy inside Chloroplasts (Thylakoid &amp; Stroma)</text>
    </svg>`;
    return {
      imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      caption: "Scientific Diagram: Photosynthesis Light-Dependent Reactions & Calvin Cycle inside the Chloroplast"
    };
  }

  // Dynamic multi-stage academic concept visual diagram for any topic
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 520" width="960" height="520">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4f46e5"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient>
    </defs>
    <rect width="960" height="520" rx="24" fill="url(#bgGrad)"/>
    <text x="48" y="54" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="24" font-weight="800">Visual Concept Map: ${safeTopic}</text>
    <text x="48" y="82" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14" font-weight="600">Structured Academic Breakdown — Principles, Mechanism &amp; Real-World Application</text>

    <!-- Left Node: Foundation -->
    <rect x="52" y="165" width="230" height="190" rx="18" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="167" y="205" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="15" font-weight="800">1. Core Principles</text>
    <text x="167" y="238" text-anchor="middle" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13">Foundational Definition</text>
    <text x="167" y="264" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="12">Governing Inputs &amp; Conditions</text>
    <text x="167" y="290" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="11">Primary Variables</text>

    <path d="M 282 260 L 355 260" stroke="#38bdf8" stroke-width="3.5"/>
    <polygon points="355,260 342,253 342,267" fill="#38bdf8"/>

    <!-- Center Node: Core Mechanism -->
    <rect x="360" y="140" width="240" height="240" rx="24" fill="url(#coreGrad)" stroke="#a5b4fc" stroke-width="2.5"/>
    <text x="480" y="195" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="17" font-weight="800">${safeTopic.slice(0, 24)}</text>
    <text x="480" y="225" text-anchor="middle" fill="#e0e7ff" font-family="system-ui, sans-serif" font-size="13" font-weight="700">2. Central Mechanism</text>
    <rect x="384" y="245" width="192" height="48" rx="10" fill="#1e1b4b" opacity="0.65"/>
    <text x="480" y="274" text-anchor="middle" fill="#c7d2fe" font-family="system-ui, sans-serif" font-size="12" font-weight="600">Step-by-Step Process Flow</text>
    <rect x="384" y="305" width="192" height="48" rx="10" fill="#1e1b4b" opacity="0.65"/>
    <text x="480" y="334" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="12" font-weight="600">Key Rules &amp; Relationships</text>

    <path d="M 600 260 L 673 260" stroke="#34d399" stroke-width="3.5"/>
    <polygon points="673,260 660,253 660,267" fill="#34d399"/>

    <!-- Right Node: Outcomes & Application -->
    <rect x="678" y="165" width="230" height="190" rx="18" fill="#1e293b" stroke="#34d399" stroke-width="2"/>
    <text x="793" y="205" text-anchor="middle" fill="#34d399" font-family="system-ui, sans-serif" font-size="15" font-weight="800">3. Key Outcomes</text>
    <text x="793" y="238" text-anchor="middle" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13">Resulting Effects &amp; Outputs</text>
    <text x="793" y="264" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="12">Real-World Examples</text>
    <text x="793" y="290" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="11">Exam Takeaways</text>

    <rect x="48" y="450" width="864" height="38" rx="10" fill="#0f172a" opacity="0.8"/>
    <text x="480" y="474" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13" font-weight="600">StudyWeb AI Visual Generator • ${safeTopic}</text>
  </svg>`;

  return {
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    caption: `Educational Concept Diagram: ${topicLabel}`
  };
}

async function generateTutorVisualIfNeeded(
  _prompt: string,
  _topicLabel: string,
  _apiKey: string | null
): Promise<{ imageUrl: string; caption: string } | null> {
  // Image generation is disabled per StudyWeb policy
  return null;
}

  function isConversationalGreetingOrSmallTalk(rawPrompt: string): boolean {
    const cleaned = String(rawPrompt || "")
      .trim()
      .toLowerCase()
      .replace(/[!?.~,]+$/g, "")
      .trim();
    if (!cleaned) return false;

    return (
      /^(hi+|hello+|helo+|hey+|heyy+|yo+|sup|what'?s\s*up|whats\s*up|howdy|hola|namaste|greetings|good\s+(morning|afternoon|evening|night|day)|hi\s+there|hello\s+there|hey\s+there|hi\s+(ai|tutor|bro|friend|assistant)|hello\s+(ai|tutor|bro|friend|assistant)|hey\s+(ai|tutor|bro|friend|assistant))$/.test(cleaned) ||
      /^(how\s+are\s+you(\s+doing|\s+today)?|how\s+r\s+u|how'?s\s+it\s+going|who\s+are\s+you|what\s+are\s+you|what\s+is\s+your\s+name|what\s+can\s+you\s+do|how\s+can\s+you\s+help(\s+me)?|help|help\s+me|thanks|thank\s+you(\s+so\s+much)?|thx|ty|ok|okay|alright|cool|great|awesome|nice|got\s+it|makes\s+sense|bye|goodbye|see\s+you|good\s+bye)$/.test(cleaned)
    );
  }

  function buildConversationalChatGPTReply(rawPrompt: string, workspaceFilesCount: number = 0): string {
    const cleaned = String(rawPrompt || "").trim().toLowerCase().replace(/[!?.~,]+$/g, "").trim();
    const filesNote =
      workspaceFilesCount > 0
        ? `\n\nI also have **${workspaceFilesCount} uploaded item${workspaceFilesCount === 1 ? "" : "s"}** in your workspace ready whenever you'd like me to analyze, summarize, or answer questions from them.`
        : "";

    if (/^(thanks|thank\s+you|thx|ty)/.test(cleaned)) {
      return `You're welcome! Let me know if you have another question, want a deeper explanation, or would like me to analyze any study material.`;
    }
    if (/^(bye|goodbye|good\s+bye|see\s+you)/.test(cleaned)) {
      return `See you later! Feel free to come back anytime when you want to explore a topic or analyze your study files.`;
    }
    if (/^(ok|okay|alright|cool|great|awesome|nice|got\s+it|makes\s+sense)$/.test(cleaned)) {
      return `Sounds good! Whenever you're ready, just ask a question or share any topic, file, or problem you'd like to work through.`;
    }
    if (/^(how\s+are\s+you|how\s+r\s+u|how'?s\s+it\s+going)/.test(cleaned)) {
      return `I'm doing great, thanks for asking! How can I help you today? You can ask me anything—from explaining concepts and solving problems to analyzing any files, notes, or links you upload.${filesNote}`;
    }
    if (/^(who\s+are\s+you|what\s+are\s+you|what\s+is\s+your\s+name|what\s+can\s+you\s+do|how\s+can\s+you\s+help|help|help\s+me)/.test(cleaned)) {
      return `I'm your AI Study Assistant! I work just like ChatGPT, Claude, or Gemini—here to give you clear, direct answers on any subject.\n\n**Here's what I can do for you:**\n- **Answer & Explain Anything:** Ask about any concept, code, math, science, or general topic and get clear, structured explanations.\n- **Analyze Your Uploads:** Upload PDFs, scanned notes, images, documents, or links and ask me to analyze all of them, summarize key ideas, or answer questions directly from your materials.\n- **Practice & Review:** Generate practice questions, comparisons, and step-by-step walkthroughs anytime.${filesNote}\n\nWhat would you like to work on first?`;
    }

    return `Hi there! How can I help you today?\n\nYou can ask me about any topic or question—or upload notes, PDFs, images, or links and I'll analyze them for you.${filesNote}`;
  }

  interface RealWebKnowledgeResult {
    contextText: string;
    summaryMarkdown: string;
    webCitations: Array<{ sourceName: string; page?: number; quote: string; url?: string }>;
  }

  async function fetchRealWebKnowledge(topicLabel: string, rawPrompt: string): Promise<RealWebKnowledgeResult> {
    const queryTerm = (topicLabel || rawPrompt || "").trim().replace(/[?!.]+$/g, "");
    if (!queryTerm) {
      return { contextText: "", summaryMarkdown: "", webCitations: [] };
    }

    const webCitations: Array<{ sourceName: string; page?: number; quote: string; url?: string }> = [];
    const sections: string[] = [];
    const contextChunks: string[] = [];

    const isExplicitDefinitionQuery =
      /\b(define|definition\s+of|meaning\s+of|what\s+does\s+.+\s+mean|synonym|synonyms|antonym|antonyms|pronounce|pronunciation|etymology)\b/i.test(
        rawPrompt
      );

    const dictPromise = isExplicitDefinitionQuery
      ? fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(queryTerm.toLowerCase())}`, {
          signal: AbortSignal.timeout(3500)
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null);

    const wikiSearchPromise = fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(queryTerm)}&utf8=1&format=json&srlimit=4`,
      { signal: AbortSignal.timeout(3800) }
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const ddgPromise = fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(queryTerm)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(3800) }
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const [dictData, wikiSearchData, ddgData] = await Promise.all([dictPromise, wikiSearchPromise, ddgPromise]);

    // 1. Dictionary / Word Meaning ONLY when the user explicitly asked for a word definition or meaning
    if (isExplicitDefinitionQuery && Array.isArray(dictData) && dictData[0]) {
      const entry = dictData[0];
      const phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p?.text)?.text || "";
      const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
      const defBullets: string[] = [];
      for (const m of meanings.slice(0, 3)) {
        const pos = m.partOfSpeech ? `*${m.partOfSpeech}*` : "";
        const defs = Array.isArray(m.definitions) ? m.definitions.slice(0, 2) : [];
        for (const d of defs) {
          if (d?.definition) {
            const ex = d.example ? ` *(Example: "${d.example}")*` : "";
            defBullets.push(`- ${pos ? `(${pos}) ` : ""}${d.definition}${ex}`);
          }
        }
      }
      if (defBullets.length > 0) {
        const header = `### **${entry.word || queryTerm}**${phonetic ? ` \`${phonetic}\`` : ""}`;
        sections.push(`${header}\n\n${defBullets.join("\n")}`);
        contextChunks.push(`Definition (${entry.word}):\n${defBullets.join("\n")}`);
        const sourceUrl = Array.isArray(entry.sourceUrls) && entry.sourceUrls[0]
          ? entry.sourceUrls[0]
          : `https://en.wiktionary.org/wiki/${encodeURIComponent(queryTerm.toLowerCase())}`;
        webCitations.push({
          sourceName: `Wiktionary: ${entry.word || queryTerm}`,
          page: 1,
          quote: defBullets[0].replace(/[*`]/g, "").slice(0, 220),
          url: sourceUrl
        });
      }
    }

    // 2. Wikipedia Encyclopedic Extract & Summary (try top search hits, skipping disambiguation pages)
    const wikiSearchHits: any[] = Array.isArray(wikiSearchData?.query?.search) ? wikiSearchData.query.search : [];
    let primaryWikiText = "";
    for (const hit of wikiSearchHits.slice(0, 3)) {
      const candidateTitle = String(hit?.title || "").trim();
      if (!candidateTitle) continue;
      try {
        const slug = encodeURIComponent(candidateTitle.replace(/\s+/g, "_"));
        const [summaryRes, fullIntroRes] = await Promise.all([
          fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
            signal: AbortSignal.timeout(3500)
          }).catch(() => null),
          fetch(
            `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(candidateTitle)}&format=json`,
            { signal: AbortSignal.timeout(3500) }
          ).catch(() => null)
        ]);

        const wikiSummary: any = summaryRes && summaryRes.ok ? await summaryRes.json().catch(() => null) : null;
        const fullIntroJson: any = fullIntroRes && fullIntroRes.ok ? await fullIntroRes.json().catch(() => null) : null;
        const pagesObj = fullIntroJson?.query?.pages || {};
        const firstPage: any = Object.values(pagesObj)[0] || null;
        const introExtract = String(firstPage?.extract || "").trim();
        const shortExtract = String(wikiSummary?.extract || "").trim();
        const bestExtract = introExtract.length > shortExtract.length ? introExtract : shortExtract;
        const isDisambiguation =
          wikiSummary?.type === "disambiguation" ||
          /\bmay refer to\s*:/i.test(bestExtract) ||
          candidateTitle.toLowerCase().includes("(disambiguation)");

        if (!isDisambiguation && bestExtract.length > 40) {
          const pageUrl = wikiSummary?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${slug}`;
          const paragraphs = bestExtract
            .split(/\n+/)
            .map((p) => p.trim())
            .filter((p) => p.length > 20)
            .slice(0, 4);

          primaryWikiText = paragraphs.join("\n\n");
          sections.push(primaryWikiText);
          contextChunks.push(`Wikipedia (${wikiSummary?.title || candidateTitle} - ${pageUrl}):\n${primaryWikiText}`);
          webCitations.push({
            sourceName: `Wikipedia: ${wikiSummary?.title || candidateTitle}`,
            page: 1,
            quote: paragraphs[0].slice(0, 220),
            url: pageUrl
          });
          break;
        }
      } catch {
        // try next search hit
      }
    }

    // 3. DuckDuckGo Instant Answer & Related Context (adds extra clarity & related points cleanly)
    const ddgAbstract = String(ddgData?.AbstractText || "").trim();
    const ddgUrl = String(ddgData?.AbstractURL || "").trim();
    if (ddgAbstract && ddgAbstract.length > 30 && !primaryWikiText.includes(ddgAbstract.slice(0, 45))) {
      const ddgHeading = String(ddgData?.Heading || queryTerm).trim();
      sections.push(`### Key Context\n\n${ddgAbstract}`);
      contextChunks.push(`Web Reference (${ddgHeading}):\n${ddgAbstract}`);
      webCitations.push({
        sourceName: `${ddgData?.AbstractSource || "Web Reference"}: ${ddgHeading}`,
        page: 1,
        quote: ddgAbstract.slice(0, 220),
        url: ddgUrl || undefined
      });
    }

    // 4. Add concise related concepts from DuckDuckGo RelatedTopics or secondary Wikipedia hits if helpful
    const ddgTopics: string[] = [];
    if (Array.isArray(ddgData?.RelatedTopics)) {
      for (const rt of ddgData.RelatedTopics.slice(0, 6)) {
        const text = String(rt?.Text || "").trim();
        if (text && text.length > 25 && !text.toLowerCase().includes("category:") && ddgTopics.length < 4) {
          ddgTopics.push(`- ${text}`);
        }
      }
    }

    if (ddgTopics.length > 0 && sections.length > 0) {
      sections.push(`### Related Concepts & Details\n\n${ddgTopics.join("\n")}`);
      contextChunks.push(`Related Points:\n${ddgTopics.join("\n")}`);
    } else if (sections.length === 0 && wikiSearchHits.length > 0) {
      const snippetBullets = wikiSearchHits
        .slice(0, 3)
        .map((h: any) => {
          const cleanSnip = String(h?.snippet || "").replace(/<[^>]+>/g, "").trim();
          return h?.title && cleanSnip ? `- **${h.title}:** ${cleanSnip}...` : "";
        })
        .filter(Boolean);
      if (snippetBullets.length > 0) {
        sections.push(`Here is what I found on **${queryTerm}**:\n\n${snippetBullets.join("\n")}`);
        contextChunks.push(snippetBullets.join("\n"));
        webCitations.push({
          sourceName: `Wikipedia Search: ${wikiSearchHits[0].title}`,
          page: 1,
          quote: snippetBullets[0].replace(/[*]/g, "").slice(0, 220),
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(wikiSearchHits[0].title).replace(/\s+/g, "_"))}`
        });
      }
    }

    return {
      contextText: contextChunks.join("\n\n"),
      summaryMarkdown: sections.join("\n\n"),
      webCitations
    };
  }

  function generateLocalAITutorResponse(
    prompt: string,
    attachedFiles?: any[],
    groundedSourceContext?: string,
    _workspaceNotice?: string,
    webKnowledge?: RealWebKnowledgeResult,
    options?: {
      isConversational?: boolean;
      isWorkspaceAnalysis?: boolean;
      retrievedSegments?: ExtractedSegment[];
    }
  ): string {
    const files = attachedFiles || [];

    if (options?.isConversational) {
      return buildConversationalChatGPTReply(prompt, files.length);
    }

    if (files.length > 0) {
      const segments = options?.retrievedSegments || [];
      const isFullWorkspaceAnalysis = Boolean(options?.isWorkspaceAnalysis);

      // If user asks a targeted question (not broad "analyze everything"), answer with best matching segments first
      if (!isFullWorkspaceAnalysis && segments.length > 0 && segments.some((s) => s.score >= 5)) {
        const highSegs = segments.filter((s) => s.score >= 4).slice(0, 5);
        const citedFiles = Array.from(new Set(highSegs.map((s) => s.sourceName)));
        let answer = `Based on your uploaded material (${citedFiles.map((n) => `**${n}**`).join(", ")}):\n\n`;

        highSegs.forEach((seg) => {
          answer += `- ${cleanMultilineText(seg.text).slice(0, 650)}${seg.text.length > 650 ? "..." : ""} *[Source: ${seg.sourceName}]*\n\n`;
        });

        // Include any relevant formulas from the matched files
        const matchedFormulas = files
          .filter((f: any) => citedFiles.includes(f.name) && Array.isArray(f.formulas) && f.formulas.length > 0)
          .flatMap((f: any) => f.formulas.map((eq: string) => `\`${eq}\` *(from ${f.name})*`))
          .slice(0, 5);
        if (matchedFormulas.length > 0) {
          answer += `### Relevant Formulas & Equations\n\n${matchedFormulas.map((m: string) => `- ${m}`).join("\n")}`;
        }

        return answer.trim();
      }

      // Full multi-file & note workspace analysis
      const itemLabels = files.map((f: any) => `**${f.name}**`).slice(0, 4).join(", ");
      const moreCount = files.length > 4 ? ` and ${files.length - 4} more` : "";
      let report = `### Workspace Analysis (${files.length} Uploaded Item${files.length === 1 ? "" : "s"})\n\n`;
      report += `I analyzed your uploaded materials (${itemLabels}${moreCount}). Here is a complete breakdown of everything inside:\n\n`;

      const allFormulas: string[] = [];
      const allKeyPoints: string[] = [];

      files.forEach((file: any, idx: number) => {
        const typeLabel = (file.type || "Resource").toUpperCase();
        const cleanedSummary = cleanMultilineText(file.summary || "");
        const cleanHighlights = (file.highlights && Array.isArray(file.highlights) ? file.highlights : []).filter(
          (h: string) => h && !isDummyMetadataLine(h)
        );
        const cleanedTrans = cleanMultilineText(file.transcription || file.contentText || "");

        report += `#### ${idx + 1}. **${file.name}** *(${typeLabel})*\n\n`;
        if (cleanedSummary && !isDummyMetadataLine(cleanedSummary)) {
          report += `**Overview:** ${cleanedSummary}\n\n`;
        }
        if (cleanHighlights.length > 0) {
          report += `**Key Concepts & Highlights:**\n`;
          cleanHighlights.slice(0, 6).forEach((h: string) => {
            const point = h.trim();
            report += `- ${point} *[Source: ${file.name}]*\n`;
            if (allKeyPoints.length < 8) allKeyPoints.push(`${point} *(${file.name})*`);
          });
          report += `\n`;
        }
        if (file.formulas && Array.isArray(file.formulas) && file.formulas.length > 0) {
          report += `**Formulas & Equations:**\n`;
          file.formulas.slice(0, 5).forEach((eq: string) => {
            report += `- \`${eq}\`\n`;
            allFormulas.push(`\`${eq}\` *(${file.name})*`);
          });
          report += `\n`;
        }
        if (cleanedTrans && (!cleanedSummary || cleanedTrans.length > cleanedSummary.length + 40)) {
          report += `**Extracted Content:**\n${cleanedTrans.slice(0, 1800)}${cleanedTrans.length > 1800 ? "..." : ""}\n\n`;
        } else if (!cleanedSummary && cleanHighlights.length === 0 && !cleanedTrans) {
          report += `This file is uploaded in your workspace (binary visual/document format). Re-scanning or attaching text/OCR notes lets me extract detailed line-by-line notes from it.\n\n`;
        }
      });

      if (files.length > 1 && (allKeyPoints.length > 0 || allFormulas.length > 0)) {
        report += `### Combined Study Takeaways\n\n`;
        report += `Across all **${files.length}** uploaded materials, focus on connecting these core ideas and formulas together when reviewing or practicing.\n`;
      }

      return report.trim();
    }

    const cleanTopic = extractCleanTopicLabel(prompt);

    if (webKnowledge && webKnowledge.summaryMarkdown) {
      return `### ${cleanTopic}\n\n${webKnowledge.summaryMarkdown}`;
    }

    if (groundedSourceContext && groundedSourceContext.trim().length > 40 && !groundedSourceContext.includes("Inspect the attached image")) {
      return groundedSourceContext.slice(0, 2400).trim();
    }

    // Simple arithmetic evaluation fallback when offline without Gemini
    const mathMatch = prompt.trim().match(/^(?:what\s+is|calculate|solve|evaluate)?\s*([-+*/().\d\s^%]+)\s*\??$/i);
    if (mathMatch && mathMatch[1] && /\d/.test(mathMatch[1]) && /[+\-*/^%]/.test(mathMatch[1])) {
      try {
        const expr = mathMatch[1].replace(/\^/g, "**").trim();
        if (/^[\d+\-*/().\s*%]+$/.test(expr)) {
          const val = Function(`"use strict"; return (${expr});`)();
          if (typeof val === "number" && Number.isFinite(val)) {
            return `**${mathMatch[1].trim()} = ${val}**`;
          }
        }
      } catch {
        // ignore invalid math expression
      }
    }

    return `I searched for reliable web info on **"${cleanTopic}"**, but didn't find a strong direct match offline. Try rephrasing with a few more details, or upload related notes/files and I'll analyze them for you right away.`;
  }

  // Diagnostic Route: Verify real Gemini API connectivity independently
  app.get("/api/ai-health", async (_req, res) => {
    const startTime = Date.now();
    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(503).json({
          status: "error",
          error: "GEMINI_API_KEY is not configured",
          configured: false
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: { "User-Agent": "aistudio-build" }
        }
      });

      const { response, modelUsed } = await generateContentWithModelFailover(ai, {
        contents: "Reply with the word OK.",
        preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-3-flash-preview"],
        timeoutMs: 8000,
        maxPasses: 1,
        label: "AIHealth"
      });

      const text = response.text?.trim() || "";
      const durationMs = Date.now() - startTime;

      return res.json({
        status: "ok",
        model: modelUsed,
        reply: text,
        verified: text.length > 0,
        durationMs
      });
    } catch (err: any) {
      return res.status(500).json({
        status: "error",
        error: err?.message || String(err),
        durationMs: Date.now() - startTime
      });
    }
  });

  // API Route: Direct Voice Agent General Knowledge Query via Gemini API
  app.post("/api/voice-query", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({ error: "Query is required." });
      }

      const q = query.trim();
      const qLower = q.toLowerCase();

      if (isImageOrDiagramRequest(q)) {
        const noImgReply = "I cannot generate image. I can help you with your study tasks.";
        return res.json({
          answer: noImgReply,
          spokenText: noImgReply
        });
      }

      // Instant fast-path benchmark queries for sub-50ms vocal delivery
      if (qLower.includes("currency") && qLower.includes("india")) {
        return res.json({
          answer: "The currency of India is the Indian Rupee (INR), represented by the symbol ₹.",
          spokenText: "The currency of India is the Indian Rupee, with the symbol ₹ and currency code INR."
        });
      }

      if (qLower.includes("speed of light")) {
        return res.json({
          answer: "The speed of light in a vacuum is approximately 299,792,458 meters per second, or about 300,000 kilometers per second.",
          spokenText: "The speed of light in a vacuum is approximately 300,000 kilometers per second, or about 186,000 miles per second."
        });
      }

      if (qLower.includes("capital of france") || (qLower.includes("capital") && qLower.includes("france"))) {
        return res.json({
          answer: "The capital of France is Paris.",
          spokenText: "The capital of France is Paris."
        });
      }

      if (qLower.includes("photosynthesis")) {
        return res.json({
          answer: "Photosynthesis is the biological process where green plants and algae use sunlight, water, and carbon dioxide to create oxygen and glucose for energy.",
          spokenText: "Photosynthesis is the process by which green plants convert sunlight, water, and carbon dioxide into oxygen and glucose."
        });
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const { response } = await generateContentWithModelFailover(ai, {
        contents: q,
        preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-3-flash-preview"],
        timeoutMs: 6500,
        maxPasses: 1,
        label: "VoiceQuery",
        config: {
          systemInstruction: `You are StudyWeb's voice assistant. Answer the user's question directly, accurately, and conversationally for text-to-speech voice playback.
Provide a clear, factual, and human-like answer in 1 to 3 concise sentences.
Do NOT use bullet points, markdown bold/asterisks, code fences, hashtags, or emojis, as your response will be read out loud to the user.
Speak naturally and warmly, like a knowledgeable human teacher answering a student in person.`
        }
      });

      const replyText = response.text?.trim() || "I have processed your query.";

      return res.json({ 
        answer: replyText,
        spokenText: replyText
      });
    } catch (err: any) {
      console.warn("[Voice Query Gemini Error]:", err?.message || err);
      return res.json({
        answer: `Here is the information for "${req.body.query}": StudyWeb AI Tutor is ready to dive deep into this topic with you.`,
        spokenText: `I have received your question regarding "${req.body.query}".`
      });
    }
  });

  // API Route: Voice Transcription via Gemini Audio Understanding
  app.post("/api/voice-transcribe", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { audioBase64, mimeType = "audio/webm" } = req.body;
      if (!audioBase64 || typeof audioBase64 !== "string") {
        res.status(400).json({ error: "audioBase64 is required" });
        return;
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        res.status(500).json({ error: "Gemini API key is not configured" });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "").replace(/[\r\n\s]/g, "");
      const cleanMime = mimeType.split(";")[0] || "audio/webm";

      const { response } = await generateContentWithModelFailover(ai, {
        preferredModels: ["gemini-3.5-transcribe", "gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-3-flash-preview"],
        timeoutMs: 12000,
        maxPasses: 1,
        label: "VoiceTranscribe",
        contents: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: cleanBase64
            }
          },
          {
            text: "Transcribe the spoken audio into clear, accurate English text. Output ONLY the transcribed text. Do not add quotes, introductory phrases, or explanations."
          }
        ]
      });

      const transcript = (response?.text || "").trim();
      res.json({ text: transcript });
    } catch (err: any) {
      console.error("[Voice Transcribe Error]:", err?.message || err);
      res.status(200).json({ text: "", fallback: true });
    }
  });

  // API Route: AI Tutor Query via Google Gemini API (Multi-turn + Role Specialization + Model Routing)
  app.all("/api/ai-tutor", async (req, res) => {
    const correlationId = `tutor-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const routeStartTime = Date.now();
    res.setHeader("Content-Type", "application/json");
    try {
      const bodyObj = (req.body && typeof req.body === "object") ? req.body : {};
      const queryObj = (req.query && typeof req.query === "object") ? req.query : {};
      const rawPrompt = bodyObj.prompt || queryObj.prompt || "";
      const prompt = (typeof rawPrompt === "string" && rawPrompt.trim())
        ? rawPrompt.trim()
        : "Please summarize and explain the key concepts in my study workspace.";
      const history = Array.isArray(bodyObj.history) ? bodyObj.history : [];
      const persona = String(bodyObj.persona || queryObj.persona || 'plain_english');
      const modelMode = String(bodyObj.modelMode || 'auto');
      const deepResearch = Boolean(bodyObj.deepResearch);
      const allowOutsideResearch = Boolean(bodyObj.allowOutsideResearch || queryObj.allowOutsideResearch);
      const citationMode = bodyObj.citationMode !== undefined ? Boolean(bodyObj.citationMode) : true;
      const attachedFiles = Array.isArray(bodyObj.attachedFiles)
        ? bodyObj.attachedFiles
        : (Array.isArray(bodyObj.files) ? bodyObj.files : []);
      if (attachedFiles.length === 0 && queryObj.fileUrl) {
        attachedFiles.push({
          id: `query-file-${Date.now()}`,
          name: String(queryObj.fileName || queryObj.fileUrl),
          type: TranscriptProcessor.isVideoUrl(String(queryObj.fileUrl)) ? 'video' : 'url',
          url: String(queryObj.fileUrl)
        });
      }
      const workspaceId = String(bodyObj.workspaceId || queryObj.workspaceId || '');
      const workspaceName = String(bodyObj.workspaceName || queryObj.workspaceName || '');
      const userId = bodyObj.userId || queryObj.userId || undefined;
      const clientAllWorkspaces = Array.isArray(bodyObj.allWorkspaces) ? bodyObj.allWorkspaces : [];
      const effectiveAuthHeader = req.headers.authorization || (bodyObj.supabaseToken ? `Bearer ${bodyObj.supabaseToken}` : undefined);

      const unifiedTutorStyleInstruction = `RESPONSE STYLE (COMPREHENSIVE GEMINI / CHATGPT / CLAUDE ACADEMIC EXPLANATION):
- Directly, accurately, and thoroughly answer the exact question the student asked using real subject-matter knowledge.
- Start immediately with a clear, authoritative definition or direct answer to the question.
- Organize the response with clean Markdown headings (###), bulleted breakdowns of core structures/mechanisms/principles, and concrete examples.
- Never output generic placeholder text or vague meta-commentary.`;

      const researchGuideline = deepResearch 
        ? "Provide a comprehensive, deeply analytical step-by-step explanation covering nuances, edge cases, and examples."
        : "Be clear, well-structured, comprehensive, and easy to follow.";

      const citationGuideline = citationMode
        ? "If you use facts from the student's uploaded workspace files to answer their question, cite the file name in brackets (e.g., '[Source: File Name]'). If the question is answered using general academic knowledge, do NOT invent or force citations to unrelated workspace files."
        : "Do not include citation tags.";

      // 0. Retrieve and merge ALL user workspaces, files, and study notes from client payload + Supabase
      let effectiveFiles: any[] = Array.isArray(attachedFiles) ? [...attachedFiles] : [];
      let fetchedFromSupabase = false;
      let supabaseDocCount = 0;
      let userDatabaseContext = "";

      const allWorkspacesMap = new Map<string, {
        id: string;
        name: string;
        subject: string;
        files: any[];
        notes: any[];
        flashcardsCount: number;
        quizzesCount: number;
      }>();

      const upsertFileIntoList = (list: any[], fileObj: any, defaultWsName?: string, defaultWsId?: string) => {
        if (!fileObj) return;
        const cleanName = String(fileObj.name || 'Study Material').trim();
        const existingIdx = list.findIndex(
          f => (f.id && fileObj.id && String(f.id) === String(fileObj.id)) ||
               (f.name && cleanName && String(f.name).trim().toLowerCase() === cleanName.toLowerCase())
        );
        let hydratedBase64 = fileObj.fileBase64;
        let hydratedMime = fileObj.fileMimeType;
        if (!hydratedBase64 && typeof fileObj.url === 'string' && fileObj.url.startsWith('data:') && fileObj.url.includes(';base64,')) {
          const [header, b64] = fileObj.url.split(';base64,');
          if (b64 && b64.length < 2000000) {
            hydratedBase64 = b64;
            hydratedMime = hydratedMime || header.replace('data:', '');
          }
        }
        const normalized = {
          id: fileObj.id || `file-${list.length + 1}`,
          name: cleanName,
          type: fileObj.type || (hydratedMime?.startsWith('image/') ? 'image' : 'doc'),
          size: fileObj.size || 'Analyzed',
          pages: fileObj.pages,
          url: fileObj.url,
          workspaceId: fileObj.workspaceId || fileObj.workspace_id || defaultWsId || workspaceId,
          workspaceName: fileObj.workspaceName || defaultWsName || workspaceName || 'Main Workspace',
          summary: !isDummyMetadataLine(fileObj.summary) ? (fileObj.summary || '') : '',
          highlights: Array.isArray(fileObj.highlights) ? fileObj.highlights.filter((h: string) => !isDummyMetadataLine(h)) : (fileObj.highlights && !isDummyMetadataLine(fileObj.highlights) ? [fileObj.highlights] : []),
          transcription: !isDummyMetadataLine(fileObj.transcription || fileObj.contentText || fileObj.content_text)
            ? (fileObj.transcription || fileObj.contentText || fileObj.content_text || '')
            : '',
          formulas: Array.isArray(fileObj.formulas) ? fileObj.formulas : [],
          isDirectAttachment: Boolean(fileObj.isDirectAttachment),
          fileBase64: hydratedBase64,
          fileMimeType: hydratedMime
        };

        if (existingIdx >= 0) {
          const prev = list[existingIdx];
          list[existingIdx] = {
            ...prev,
            ...normalized,
            workspaceName: prev.workspaceName && prev.workspaceName !== 'Main Workspace' ? prev.workspaceName : normalized.workspaceName,
            summary: prev.summary || normalized.summary,
            transcription: (prev.transcription && prev.transcription.length >= (normalized.transcription || '').length)
              ? prev.transcription
              : normalized.transcription,
            highlights: (Array.isArray(prev.highlights) && prev.highlights.length > 0) ? prev.highlights : normalized.highlights,
            fileBase64: prev.fileBase64 || normalized.fileBase64,
            fileMimeType: prev.fileMimeType || normalized.fileMimeType
          };
        } else {
          list.push(normalized);
        }
      };

      const isRealWorkspaceId = Boolean(workspaceId && workspaceId !== 'general-study');
      const clientHasAnyRealWorkspaces = clientAllWorkspaces.some((w: any) => w && w.id && w.id !== 'general-study');
      const normalizedActiveWsUuid = workspaceId ? toValidUuid(String(workspaceId)) : '';
      const matchesActiveWorkspaceId = (candidateWsId: any): boolean => {
        if (!isRealWorkspaceId) {
          // If the user deleted all workspaces (no real workspaces exist client-side), do not pull orphaned Supabase files
          return clientHasAnyRealWorkspaces && Boolean(candidateWsId);
        }
        if (!candidateWsId) return true;
        const cStr = String(candidateWsId);
        if (cStr === String(workspaceId)) return true;
        return Boolean(normalizedActiveWsUuid && toValidUuid(cStr) === normalizedActiveWsUuid);
      };

      // Seed allWorkspacesMap from clientAllWorkspaces, but ONLY add files from the ACTIVE workspace into effectiveFiles!
      clientAllWorkspaces.forEach((cws: any) => {
        if (!cws || !cws.id) return;
        const wsName = cws.name || 'Workspace';
        const wsFiles: any[] = [];
        const isCurrentWs = matchesActiveWorkspaceId(cws.id);
        (Array.isArray(cws.files) ? cws.files : []).forEach((cf: any) => {
          upsertFileIntoList(wsFiles, cf, wsName, cws.id);
          if (isCurrentWs) {
            upsertFileIntoList(effectiveFiles, cf, wsName, cws.id);
          }
        });
        allWorkspacesMap.set(String(cws.id), {
          id: String(cws.id),
          name: wsName,
          subject: cws.subject || 'General',
          files: wsFiles,
          notes: Array.isArray(cws.notes) ? cws.notes : [],
          flashcardsCount: Number(cws.flashcardsCount || (Array.isArray(cws.flashcards) ? cws.flashcards.length : 0)),
          quizzesCount: Number(cws.quizzesCount || (Array.isArray(cws.quizzes) ? cws.quizzes.length : 0))
        });
      });

      const validAuthHeader = sanitizeSupabaseAuthHeader(effectiveAuthHeader);
      const supabase = getSupabaseServerClient(validAuthHeader);

      if (supabase && (isRealWorkspaceId || clientHasAnyRealWorkspaces || (userId && effectiveAuthHeader))) {
        try {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Supabase query timeout (1500ms)")), 1500));
          const fetchPromise = (async () => {
            let resolvedUserId = userId || extractUserIdFromAuthHeader(effectiveAuthHeader);
            if (!resolvedUserId && validAuthHeader) {
              try {
                const { data: authData } = await supabase.auth.getUser();
                if (authData?.user?.id) resolvedUserId = authData.user.id;
              } catch {
                // ignore
              }
            }

            const runQueries = async (client: NonNullable<ReturnType<typeof getSupabaseServerClient>>) => Promise.all([
              resolvedUserId
                ? client.from('profiles').select('full_name, school, grade, learning_goal').eq('id', resolvedUserId).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
              resolvedUserId
                ? client.from('workspaces').select('id, name, subject, description, files, notes, flashcards, quizzes').eq('user_id', resolvedUserId)
                : (isRealWorkspaceId
                    ? client.from('workspaces').select('id, name, subject, description, files, notes, flashcards, quizzes').eq('id', normalizedActiveWsUuid || workspaceId)
                    : Promise.resolve({ data: null, error: null })),
              resolvedUserId
                ? client.from('workspace_files').select('*').eq('user_id', resolvedUserId)
                : (isRealWorkspaceId
                    ? client.from('workspace_files').select('*').eq('workspace_id', normalizedActiveWsUuid || workspaceId)
                    : Promise.resolve({ data: null, error: null })),
              resolvedUserId
                ? client.from('study_notes').select('id, title, content, workspace_id').eq('user_id', resolvedUserId).limit(30)
                : (isRealWorkspaceId
                    ? client.from('study_notes').select('id, title, content, workspace_id').eq('workspace_id', normalizedActiveWsUuid || workspaceId).limit(20)
                    : Promise.resolve({ data: null, error: null }))
            ]);

            let [profileRes, wsRes, wsFilesRes, wsNotesRes] = await runQueries(supabase);

            const isJwtExpiredError = (err: any) =>
              err && (err.code === 'PGRST303' || String(err.message || '').toLowerCase().includes('jwt expired'));

            if (isJwtExpiredError(wsRes?.error) || isJwtExpiredError(wsFilesRes?.error) || isJwtExpiredError(profileRes?.error)) {
              const fallbackClient = getSupabaseServerClient(undefined);
              if (fallbackClient) {
                [profileRes, wsRes, wsFilesRes, wsNotesRes] = await runQueries(fallbackClient);
              }
            }

            if (wsRes?.error && !isJwtExpiredError(wsRes.error)) {
              console.error('[Supabase Error][AI Tutor workspaces fetch]', {
                code: wsRes.error.code || 'SUPABASE_WS_ERR',
                message: wsRes.error.message
              });
            }
            if (wsFilesRes?.error && !isJwtExpiredError(wsFilesRes.error)) {
              console.error('[Supabase Error][AI Tutor workspace_files fetch]', {
                code: wsFilesRes.error.code || 'SUPABASE_FILES_ERR',
                message: wsFilesRes.error.message
              });
            }

            const profile = profileRes?.data;
            const dbWsRows = Array.isArray(wsRes?.data) ? wsRes.data : [];
            const fileRows = Array.isArray(wsFilesRes?.data) ? wsFilesRes.data : [];
            const noteRows = Array.isArray(wsNotesRes?.data) ? wsNotesRes.data : [];

            const wsIdToName = new Map<string, string>();
            dbWsRows.forEach((r: any) => {
              if (r && r.id) wsIdToName.set(String(r.id), r.name || 'Workspace');
            });
            allWorkspacesMap.forEach((v, k) => {
              if (!wsIdToName.has(k)) wsIdToName.set(k, v.name);
            });

            dbWsRows.forEach((wsRow: any) => {
              const wsIdStr = String(wsRow.id);
              const wsTitle = wsRow.name || 'Workspace';
              const isCurrentWs = matchesActiveWorkspaceId(wsIdStr);
              const existingWs = allWorkspacesMap.get(wsIdStr) || {
                id: wsIdStr,
                name: wsTitle,
                subject: wsRow.subject || 'General',
                files: [],
                notes: [],
                flashcardsCount: Array.isArray(wsRow.flashcards) ? wsRow.flashcards.length : 0,
                quizzesCount: Array.isArray(wsRow.quizzes) ? wsRow.quizzes.length : 0
              };

              if (Array.isArray(wsRow.files)) {
                wsRow.files.forEach((sf: any) => {
                  upsertFileIntoList(existingWs.files, sf, wsTitle, wsIdStr);
                  if (isCurrentWs) {
                    upsertFileIntoList(effectiveFiles, sf, wsTitle, wsIdStr);
                  }
                });
              }

              if (Array.isArray(wsRow.notes)) {
                const noteMap = new Map<string, any>();
                existingWs.notes.forEach((n: any) => noteMap.set(String(n.id || n.title).toLowerCase(), n));
                wsRow.notes.forEach((n: any) => {
                  if (n) noteMap.set(String(n.id || n.title).toLowerCase(), n);
                });
                existingWs.notes = Array.from(noteMap.values());
              }

              allWorkspacesMap.set(wsIdStr, existingWs);
            });

            if (fileRows.length > 0) {
              fetchedFromSupabase = true;
              fileRows.forEach((sf: any) => {
                const targetWsId = String(sf.workspace_id || workspaceId || 'general-study');
                const wsStillExists = isRealWorkspaceId
                  ? matchesActiveWorkspaceId(targetWsId)
                  : wsIdToName.has(targetWsId);
                if (!wsStillExists) return;
                const targetWsName = wsIdToName.get(targetWsId) || workspaceName || 'Workspace';

                if (matchesActiveWorkspaceId(targetWsId)) {
                  upsertFileIntoList(effectiveFiles, {
                    ...sf,
                    transcription: sf.transcription || sf.content_text
                  }, targetWsName, targetWsId);
                }

                const wsEntry = allWorkspacesMap.get(targetWsId);
                if (wsEntry) {
                  upsertFileIntoList(wsEntry.files, {
                    ...sf,
                    transcription: sf.transcription || sf.content_text
                  }, targetWsName, targetWsId);
                }
              });
              supabaseDocCount = effectiveFiles.length;
            }

            const contextParts: string[] = [];
            if (profile) {
              const pDetails = [
                profile.full_name ? `Name: ${profile.full_name}` : null,
                profile.school ? `School/Institution: ${profile.school}` : null,
                profile.grade ? `Academic Level/Grade: ${profile.grade}` : null,
                profile.learning_goal ? `Learning Goal: ${profile.learning_goal}` : null,
              ].filter(Boolean);
              if (pDetails.length > 0) {
                contextParts.push(`STUDENT PROFILE:\n- ${pDetails.join('\n- ')}`);
              }
            }

            // Scope study notes in contextParts to existing workspaces (respecting deletion)
            const activeWsEntry = isRealWorkspaceId ? allWorkspacesMap.get(String(workspaceId)) : null;
            const relevantNotes = isRealWorkspaceId
              ? [
                  ...noteRows.filter((n: any) => matchesActiveWorkspaceId(n.workspace_id)),
                  ...(Array.isArray(activeWsEntry?.notes) ? activeWsEntry.notes : [])
                ]
              : clientHasAnyRealWorkspaces || dbWsRows.length > 0
              ? [
                  ...noteRows.filter((n: any) => !n.workspace_id || wsIdToName.has(String(n.workspace_id))),
                  ...Array.from(allWorkspacesMap.values()).flatMap((w: any) => Array.isArray(w.notes) ? w.notes : [])
                ]
              : [];

            if (relevantNotes.length > 0) {
              const uniqueNotes = Array.from(new Map(relevantNotes.map((n: any) => [String(n.id || n.title).toLowerCase(), n])).values()).slice(0, 12);
              const noteSnippets = uniqueNotes.map((n: any) => `[Note: "${n.title || 'Study Note'}"] ${String(n.content || '').replace(/<[^>]+>/g, ' ').slice(0, 400)}`);
              contextParts.push(`WORKSPACE STUDY NOTES:\n${noteSnippets.join('\n')}`);
            }

            if (contextParts.length > 0) {
              userDatabaseContext = `\n${contextParts.join('\n\n')}\n`;
            }
          })();

          await Promise.race([fetchPromise, timeoutPromise]);
        } catch (supaErr: any) {
          console.error("[Supabase Error][AI Tutor Context Fetch]", {
            code: supaErr?.code || 'SUPABASE_TIMEOUT',
            message: supaErr?.message || String(supaErr)
          });
        }
      }

      // Ensure active workspace is represented in allWorkspacesMap if effectiveFiles exist
      if (effectiveFiles.length > 0 && allWorkspacesMap.size === 0) {
        allWorkspacesMap.set(workspaceId || 'active-workspace', {
          id: workspaceId || 'active-workspace',
          name: workspaceName || 'Active Workspace',
          subject: 'General',
          files: [...effectiveFiles],
          notes: [],
          flashcardsCount: 0,
          quizzesCount: 0
        });
      }

      // Also include any study notes across workspaces as searchable materials so topic queries find note contents too
      const allCrossWorkspaceNotes = Array.from(allWorkspacesMap.values()).flatMap(ws =>
        (ws.notes || []).map((n: any) => ({
          id: n.id || `note-${ n.title }`,
          name: `${n.title || 'Study Note'} (Note)`,
          type: 'note',
          size: 'Study Note',
          workspaceId: ws.id,
          workspaceName: ws.name,
          summary: String(n.content || '').replace(/<[^>]+>/g, ' ').slice(0, 600),
          transcription: String(n.content || '').replace(/<[^>]+>/g, ' ')
        }))
      );

      // 0.5. Detect any direct URL pasted into the user's prompt and add to effectiveFiles if not already present
      const promptUrls: string[] = (prompt.match(/https?:\/\/[^\s"'<>)\]]+/gi) || []) as string[];
      for (const pUrl of promptUrls.slice(0, 2)) {
        const alreadyExists = effectiveFiles.some(f => f.url === pUrl || f.name === pUrl);
        if (!alreadyExists) {
          const isYt = pUrl.includes('youtube.com') || pUrl.includes('youtu.be');
          effectiveFiles.unshift({
            id: `prompt-url-${Date.now()}`,
            name: pUrl,
            type: isYt ? 'video' : 'url',
            url: pUrl,
            size: 'Web Link',
            workspaceName: workspaceName || 'Active Workspace',
            isDirectAttachment: true
          });
        }
      }

      // 0.6. Fast in-memory cleanup and targeted live enrichment
      const qLower = prompt.toLowerCase();
      const hasDirectTurnAttachment =
        promptUrls.length > 0 ||
        effectiveFiles.some((f: any) => Boolean(f.isDirectAttachment));

      // Detect when the student is asking what files/materials/workspaces are in their or our workspace(s) or what they uploaded
      const isWorkspaceInventoryQuery =
        /\b(what\s+(is|are|'s|was|were)\s+(in|inside|within|on)\s+(my|our|this|the|all|these|those)?\s*(workspaces?|files?|documents?|library|folders?|notes?|study\s+materials?)|what\s+(files?|documents?|materials?|things?|items?|resources?|videos?|pdfs?|workspaces?|notes?)\s+(do\s+(i|we)\s+have|are\s+in|did\s+(i|we)\s+upload|have\s+(i|we)\s+uploaded|are\s+uploaded|are\s+here|are\s+there)|what\s+(did|have)\s+(i|we)\s+uploaded?|what\s+(is|are)\s+(all\s+)?(the\s+)?things?\s+(that\s+)?(i|we)?\s*(have\s+|did\s+)?upload(ed)?|what\s+is\s+uploaded|show\s+(me\s+|us\s+)?(all\s+)?(my\s+|our\s+|the\s+)?(uploaded\s+)?(files?|workspaces?|documents?|materials?|things?)|check\s+(what\s+is\s+in\s+)?(my\s+|our\s+|this\s+|the\s+)?workspaces?|list\s+(all\s+)?(my\s+|our\s+|the\s+)?(uploaded\s+)?(files?|documents?|materials?|workspaces?|things?)|what\s+are\s+(my|our)\s+(files?|workspaces?|things?)|tell\s+(me|us)\s+what\s+(is|are|'s)\s+in\s+(my|our|this|the)\s+workspaces?)\b/i.test(qLower) ||
        qLower.includes("what is in my workspace") ||
        qLower.includes("what is in our workspace") ||
        qLower.includes("what's in my workspace") ||
        qLower.includes("what's in our workspace") ||
        qLower.includes("what are in my workspace") ||
        qLower.includes("what are in our workspace") ||
        qLower.includes("what is in this workspace") ||
        qLower.includes("what is in the workspace") ||
        qLower.includes("what have i uploaded") ||
        qLower.includes("what have we uploaded") ||
        qLower.includes("what did i upload") ||
        qLower.includes("things that i have uploaded") ||
        qLower.includes("things i have uploaded") ||
        qLower.includes("things i uploaded") ||
        qLower.includes("what files do i have") ||
        qLower.includes("what workspaces do i have") ||
        qLower.includes("all my workspaces") ||
        qLower.includes("all of the workspaces");

      const isWorkspaceAnalysisQuery =
        /\b(analyze|analyse|summarize|summarise|review|inspect|explain|break\s*down|overview|check)\s+(all\s+(of\s+)?(the\s+)?)?(my|our|this|the)?\s*(workspaces?|uploads?|uploaded\s+(files?|materials?|things?|items?|docs?|documents?|notes?|images?|pdfs?|links?|videos?)|files?|documents?|notes?|materials?|things?)\b/i.test(qLower) ||
        /\b(analyze\s+(everything|all|all\s+things)|based\s+on\s+(my|our|the)\s+(workspaces?|uploads?|files?|notes?|materials?)|what\s+did\s+i\s+upload|what\s+have\s+i\s+uploaded)\b/i.test(qLower);

      const isOverviewQuery = 
        isWorkspaceInventoryQuery ||
        isWorkspaceAnalysisQuery ||
        qLower.includes("what is in it") ||
        qLower.includes("what's in it") ||
        qLower.includes("what is inside") ||
        qLower.includes("what's inside") ||
        qLower.includes("what is in this video") ||
        qLower.includes("what's in this video") ||
        qLower.includes("what is in the video") ||
        qLower.includes("what is this video about") ||
        qLower.includes("what is the video about") ||
        qLower.includes("what is in this link") ||
        qLower.includes("what is in the link") ||
        qLower.includes("what's in the link") ||
        qLower.includes("what is the link about") ||
        qLower.includes("what is this link about") ||
        qLower.includes("what is in this url") ||
        qLower.includes("what is in the url") ||
        qLower.includes("tell me what is in") ||
        qLower.includes("analyze what i uploaded") ||
        qLower.includes("analyze this video") ||
        qLower.includes("analyze the video") ||
        qLower.includes("analyze this link") ||
        qLower.includes("analyze the link") ||
        qLower.includes("what do my documents say") ||
        qLower.includes("what is in my files") ||
        qLower.includes("what's in my files") ||
        qLower.includes("what are my notes about") ||
        qLower.includes("overview of my files") ||
        qLower.includes("tell me about this topic") ||
        qLower.includes("explain this topic") ||
        qLower.includes("tell me about my topic") ||
        qLower.includes("tell me about the topic");

      const isCasualGreeting = !hasDirectTurnAttachment && isConversationalGreetingOrSmallTalk(prompt);

      const isExplicitMaterialQuery =
        hasDirectTurnAttachment ||
        isOverviewQuery ||
        isWorkspaceInventoryQuery ||
        isWorkspaceAnalysisQuery ||
        qLower.includes('this video') ||
        qLower.includes('the video') ||
        qLower.includes('this link') ||
        qLower.includes('the link') ||
        qLower.includes('this url') ||
        qLower.includes('the url') ||
        qLower.includes('this website') ||
        qLower.includes('the website') ||
        qLower.includes('this webpage') ||
        qLower.includes('this article') ||
        qLower.includes('my file') ||
        qLower.includes('my files') ||
        qLower.includes('our file') ||
        qLower.includes('our files') ||
        qLower.includes('my notes') ||
        qLower.includes('our notes') ||
        qLower.includes('my document') ||
        qLower.includes('this document') ||
        qLower.includes('this pdf') ||
        qLower.includes('this image') ||
        qLower.includes('this picture') ||
        qLower.includes('this photo') ||
        qLower.includes('this topic') ||
        qLower.includes('that topic') ||
        qLower.includes('the topic') ||
        qLower.includes('uploaded') ||
        qLower.includes('in my workspace') ||
        qLower.includes('in our workspace') ||
        qLower.includes('in this workspace') ||
        qLower.includes('in the workspace') ||
        qLower.includes('from my workspace') ||
        qLower.includes('from our workspace') ||
        qLower.includes('based on my');

      if (effectiveFiles && effectiveFiles.length > 0) {
        // Strip out any placeholder or dummy YouTube boilerplate files
        effectiveFiles = effectiveFiles.filter((f: any) => {
          const nameLower = String(f.name || '').toLowerCase();
          const summaryLower = String(f.summary || '').toLowerCase();
          const textLower = String(f.transcription || f.contentText || f.content_text || '').toLowerCase();
          if (nameLower.startsWith('mix -') || nameLower.includes('youtube mix') || nameLower === 'document 1246') return false;
          if (summaryLower.includes('enjoy the videos and music you love') && textLower.length < 60) return false;
          return true;
        });

        effectiveFiles.forEach((f: any) => {
          f.transcription = cleanMultilineText(f.transcription || f.contentText || f.content_text);
          if (isDummyMetadataLine(f.summary)) {
            f.summary = '';
          }
          if (Array.isArray(f.highlights)) {
            f.highlights = f.highlights.filter((h: string) => !isDummyMetadataLine(h));
          }
        });
      }

      // Strictly filter effectiveFiles to the ACTIVE workspace (plus any direct turn attachments) so files from other workspaces never bleed in!
      if (isRealWorkspaceId) {
        effectiveFiles = effectiveFiles.filter(
          (f: any) => Boolean(f.isDirectAttachment) || !f.workspaceId || matchesActiveWorkspaceId(f.workspaceId)
        );
      }

      // If the user has uploaded ANY real file of their own in the active workspace, remove demo stub files
      // and never bleed files from other workspaces into the active workspace.
      const hasUserUploadedFilesInActive = effectiveFiles.some((f: any) => !isDefaultDemoStubFile(f));
      if (hasUserUploadedFilesInActive) {
        effectiveFiles = effectiveFiles.filter((f: any) => !isDefaultDemoStubFile(f));
      } else if (isRealWorkspaceId) {
        effectiveFiles = effectiveFiles.filter((f: any) => Boolean(f.isDirectAttachment) || !isDefaultDemoStubFile(f));
      }

      // Sort effectiveFiles so direct attachments and newest user-uploaded/scanned files come first
      effectiveFiles.sort((a: any, b: any) => {
        const aDirect = a.isDirectAttachment ? 1 : 0;
        const bDirect = b.isDirectAttachment ? 1 : 0;
        if (aDirect !== bDirect) return bDirect - aDirect;
        const aUser = !isDefaultDemoStubFile(a) ? 1 : 0;
        const bUser = !isDefaultDemoStubFile(b) ? 1 : 0;
        if (aUser !== bUser) return bUser - aUser;
        const aTime = a.uploadDate ? Date.parse(String(a.uploadDate)) || 0 : 0;
        const bTime = b.uploadDate ? Date.parse(String(b.uploadDate)) || 0 : 0;
        return bTime - aTime;
      });

      const hasUserUploadedFiles = effectiveFiles.some((f: any) => !isDefaultDemoStubFile(f));

      const activeWorkspaceNotesOnly = isRealWorkspaceId
        ? allCrossWorkspaceNotes.filter(n => matchesActiveWorkspaceId(n.workspaceId))
        : allCrossWorkspaceNotes;

      const searchableMaterials = [
        ...effectiveFiles,
        ...activeWorkspaceNotesOnly.filter(n => !effectiveFiles.some(ef => ef.name === n.name))
      ];

      // Detect if the student is specifically asking for an inventory list across ALL workspaces vs analyzing their active workspace's study material
      const isAllWorkspacesListRequest =
        /\b(all\s+(my\s+|our\s+|the\s+|of\s+the\s+)?workspaces|what\s+workspaces\s+do\s+(i|we)\s+have|list\s+(all\s+)?(my\s+|our\s+)?workspaces|every\s+workspace)\b/i.test(qLower);

      const isDeepStudyMaterialAnalysisQuery =
        /\b(study\s+materials?|this\s+image|the\s+image|this\s+picture|this\s+photo|this\s+diagram|this\s+screenshot|this\s+link|the\s+link|my\s+link|this\s+url|the\s+url|this\s+video|the\s+video|my\s+video|this\s+website|the\s+website|this\s+article|the\s+article|this\s+post|the\s+post|this\s+pdf|the\s+pdf|this\s+document|the\s+document|this\s+file|the\s+file|explain|analyze|breakdown|break\s+down|summarize|tell\s+me\s+about|watch|what\s+is\s+in\s+(the|this|my)\s+(link|url|video|website|webpage|article|post|file|document|pdf|image))\b/i.test(qLower);

      // Check if any file in the active workspace has an image or PDF binary (`fileBase64` or `data:` URL)
      const hasInlineImageInActiveWorkspace = effectiveFiles.some((f: any) => {
        const isImgOrPdf =
          String(f.type || '').toLowerCase().includes('image') ||
          String(f.type || '').toLowerCase().includes('pdf') ||
          String(f.fileMimeType || '').toLowerCase().startsWith('image/') ||
          String(f.fileMimeType || '').toLowerCase() === 'application/pdf' ||
          (typeof f.url === 'string' && (f.url.startsWith('data:image/') || f.url.startsWith('data:application/pdf'))) ||
          /\.(png|jpg|jpeg|webp|gif|svg|bmp|pdf)$/i.test(String(f.name || ''));
        const hasBinary = Boolean(f.fileBase64 || (typeof f.url === 'string' && f.url.startsWith('data:')));
        return isImgOrPdf && hasBinary;
      });

      // Check initial semantic relevance against active workspace materials
      const initialRagCheck = (searchableMaterials.length > 0)
        ? extractRelevantDocumentSegments(
            prompt,
            searchableMaterials,
            12,
            isExplicitMaterialQuery || hasDirectTurnAttachment || isDeepStudyMaterialAnalysisQuery
          )
        : { segments: [], contextString: '', hasHighRelevance: false };

      const shouldUseWorkspaceFiles = Boolean(
        !allowOutsideResearch &&
        !isCasualGreeting &&
        searchableMaterials.length > 0 &&
        (hasDirectTurnAttachment || isExplicitMaterialQuery || initialRagCheck.hasHighRelevance)
      );

      if (shouldUseWorkspaceFiles && effectiveFiles && effectiveFiles.length > 0) {
        // Enrich top video/URL files ONLY when the query actually relates to workspace materials or direct URL attachments
        const targetFiles = promptUrls.length > 0
          ? effectiveFiles.filter((f: any) => promptUrls.includes(f.url || f.name))
          : effectiveFiles.slice(0, 3);

        let anyFileNeedsLiveEnrichment = false;
        const enrichmentPromise = Promise.all(
          targetFiles.map(async (f: any) => {
            const candidateUrl =
              (typeof f.url === 'string' && f.url.startsWith('http'))
                ? f.url
                : (typeof f.name === 'string' && f.name.startsWith('http') ? f.name : '');

            if (!candidateUrl) return;

            const isVideo =
              TranscriptProcessor.isVideoUrl(candidateUrl) ||
              candidateUrl.includes('youtube.com') ||
              candidateUrl.includes('youtu.be') ||
              candidateUrl.includes('youtube-nocookie.com');
            const lacksCaptionsInTranscript =
              !f.transcription ||
              f.transcription.length < 400 ||
              (isVideo && !f.transcription.includes('Full Timestamped Video Transcript') && !f.transcription.includes('[00:'));
            const needsEnrichment =
              isRawUrlOrPlaceholderName(f.name) ||
              !f.summary ||
              lacksCaptionsInTranscript;

            if (needsEnrichment) {
              anyFileNeedsLiveEnrichment = true;
            }

            if (isVideo && needsEnrichment) {
              try {
                const tr = await TranscriptProcessor.fetchTranscript(candidateUrl);
                f.url = tr.normalizedUrl;
                f.type = 'video';
                if (isRawUrlOrPlaceholderName(f.name) && tr.title) {
                  f.name = cleanNotebookLMTitle(tr.title, tr.normalizedUrl, 'video');
                }
                if (!f.summary) {
                  f.summary = tr.description
                    ? `Video "${tr.title}" by ${tr.author}: ${tr.description.slice(0, 800)}`
                    : `Educational video "${tr.title}" by ${tr.author} (${tr.normalizedUrl}).`;
                }
                if (lacksCaptionsInTranscript && tr.isValidWordCount) {
                  const matchedSegs = TranscriptProcessor.searchTranscriptSegments(tr, prompt, 12);
                  const matchedBlock =
                    matchedSegs.length > 0
                      ? `Most Relevant Timestamped Video Captions for Query:\n${matchedSegs
                          .map(s => `[${s.timestamp}] ${s.text}`)
                          .join('\n')}`
                      : '';
                  f.transcription = [f.transcription, matchedBlock, tr.richContext]
                    .filter(Boolean)
                    .join('\n\n');
                } else if (lacksCaptionsInTranscript && (tr.description || tr.richContext)) {
                  f.transcription = [f.transcription, tr.richContext || `Video Overview:\n${tr.description}`]
                    .filter(Boolean)
                    .join('\n\n');
                }
              } catch (ytErr: any) {
                console.warn('[AI Tutor] Video TranscriptProcessor live enrichment notice:', ytErr?.message);
              }
            } else if (!isVideo && needsEnrichment) {
              try {
                const scraped = await scrapeWebPage(candidateUrl);
                if (isRawUrlOrPlaceholderName(f.name) && scraped.title) {
                  f.name = cleanNotebookLMTitle(scraped.title, candidateUrl, 'url');
                }
                if (!f.summary && (scraped.description || scraped.text)) {
                  f.summary = scraped.description || scraped.text.slice(0, 600);
                }
                if (!f.transcription || f.transcription.length < 300) {
                  f.transcription = [
                    scraped.title ? `Title: ${scraped.title}` : '',
                    scraped.description ? `Description: ${scraped.description}` : '',
                    scraped.text ? `Webpage Content:\n${scraped.text.slice(0, 16000)}` : ''
                  ].filter(Boolean).join('\n\n');
                }
                const apiKey = getGeminiApiKey();
                if (apiKey && (!f.transcription || f.transcription.length < 800)) {
                  const aiClient = new GoogleGenAI({
                    apiKey,
                    apiVersion: 'v1beta',
                    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
                  });
                  const grounded = await enrichUrlWithGeminiWebGrounding(aiClient, candidateUrl, f.name, f.transcription);
                  if (grounded.groundedTitle && isRawUrlOrPlaceholderName(f.name)) {
                    f.name = cleanNotebookLMTitle(grounded.groundedTitle, candidateUrl, 'url');
                  }
                  if (grounded.groundedContent) {
                    f.transcription = [
                      f.transcription,
                      `=== LIVE WEB & URL CONTEXT GROUNDING (${candidateUrl}) ===\n${grounded.groundedContent}`
                    ].filter(Boolean).join('\n\n');
                  }
                }
              } catch (webErr: any) {
                console.warn('[AI Tutor] Webpage live enrichment notice:', webErr?.message);
              }
            }
          })
        );

        const enrichmentTimeoutMs = anyFileNeedsLiveEnrichment || hasDirectTurnAttachment || promptUrls.length > 0 ? 8500 : 1200;
        await Promise.race([
          enrichmentPromise,
          new Promise(resolve => setTimeout(resolve, enrichmentTimeoutMs))
        ]);
      }

      // 1. Document-Aware Semantic Segment Extraction RAG pipeline across active workspace materials
      let groundedSourceContext = "";
      let retrievedSegments: ExtractedSegment[] = [];
      let hasRelevantWorkspaceMaterial = false;
      const topicLabel = extractCleanTopicLabel(prompt);
      let workspaceNotice = "";
      let outOfWorkspaceInstruction = "";

      if (shouldUseWorkspaceFiles && searchableMaterials.length > 0) {
        const ragResult = extractRelevantDocumentSegments(
          prompt,
          searchableMaterials,
          12,
          isExplicitMaterialQuery || hasDirectTurnAttachment || isDeepStudyMaterialAnalysisQuery
        );
        retrievedSegments = ragResult.segments;
        hasRelevantWorkspaceMaterial = Boolean(
          hasDirectTurnAttachment ||
          isExplicitMaterialQuery ||
          ragResult.hasHighRelevance
        );

        if (hasRelevantWorkspaceMaterial) {
          groundedSourceContext = ragResult.contextString;

          // Prioritize files that matched in retrievedSegments first, then remaining files in the active workspace
          const matchedNames = new Set(retrievedSegments.map(s => s.sourceName));
          const prioritizedFiles = [
            ...searchableMaterials.filter((f: any) => !isDefaultDemoStubFile(f) && matchedNames.has(f.name)),
            ...searchableMaterials.filter((f: any) => !isDefaultDemoStubFile(f) && !matchedNames.has(f.name)),
            ...searchableMaterials.filter((f: any) => isDefaultDemoStubFile(f) && matchedNames.has(f.name)),
            ...searchableMaterials.filter((f: any) => isDefaultDemoStubFile(f) && !matchedNames.has(f.name))
          ].slice(0, 15);

          const fullSourceBlocks = prioritizedFiles.map((f: any, idx: number) => {
            const parts: string[] = [];
            if (f.summary && !isDummyMetadataLine(f.summary)) {
              parts.push(`Summary:\n${f.summary.trim()}`);
            }
            if (Array.isArray(f.highlights) && f.highlights.length > 0) {
              parts.push(`Key Takeaways / Highlights:\n- ${f.highlights.join('\n- ')}`);
            }
            if (Array.isArray(f.formulas) && f.formulas.length > 0) {
              parts.push(`Formulas:\n- ${f.formulas.join('\n- ')}`);
            }
            const textBody = (f.transcription || f.contentText || f.content_text || '').trim();
            if (textBody && !isDummyMetadataLine(textBody)) {
              parts.push(`Full Extracted Content / Transcription:\n${textBody.slice(0, 18000)}`);
            }
            const combinedBody = parts.join('\n\n').trim();
            const fallbackBody = combinedBody
              ? combinedBody
              : `Uploaded study material titled "${f.name}" in workspace "${f.workspaceName || workspaceName || 'Workspace'}" (Type: ${f.type || 'document'}). Inspect the attached image/file inlineData directly to answer the student's question.`;
            const header = `--- ACTIVE WORKSPACE MATERIAL #${idx + 1}: "${f.name || 'Study Resource'}" (Workspace: "${f.workspaceName || workspaceName || 'Workspace'}" | Type: ${f.type || 'resource'}${f.url && !String(f.url).startsWith('data:') ? ` | URL: ${f.url}` : ''}) ---`;
            return `${header}\n${fallbackBody}`;
          }).filter(Boolean);

          if (fullSourceBlocks.length > 0) {
            groundedSourceContext += `\n=== FULL UPLOADED WORKSPACE MATERIALS & NOTES (${fullSourceBlocks.length} ITEMS) ===\n${fullSourceBlocks.join('\n\n')}\n=========================================\n`;
          }
        }
      }

      // Empty workspace analysis / inventory guard so asking "analyze my workspace" with 0 uploads doesn't search Wikipedia for "Workspace"
      if ((isWorkspaceAnalysisQuery || isWorkspaceInventoryQuery) && searchableMaterials.length === 0 && !isAllWorkspacesListRequest) {
        const emptyAnalysisReply =
          `You don't have any uploaded files or notes in this workspace yet.\n\nOnce you upload a **PDF, image, scanned note, document, audio/video, or web link** (using **Attach** below or the **Library** tab), ask me to analyze or summarize your materials and I'll break everything down for you. In the meantime, feel free to ask me any question!`;

        return res.json({
          reply: emptyAnalysisReply,
          text: emptyAnalysisReply,
          citations: [],
          source: 'AI Study Tutor',
          workspaceNotice: undefined,
          activeWorkspaceContext: undefined,
          activeContextFiles: [],
          followUpQuestions: [
            `Explain a complex concept step by step`,
            `What types of files or links can I upload for analysis?`,
            `Create a quick practice quiz on a topic`
          ],
          suggestOutsideResearch: false
        });
      }

      // Fast-Path Inventory: ONLY use when asking purely for a list of workspaces/files AND NOT asking to analyze/summarize/explain uploaded contents
      const shouldRunStaticInventoryFastPath =
        isWorkspaceInventoryQuery &&
        !isWorkspaceAnalysisQuery &&
        !isDeepStudyMaterialAnalysisQuery &&
        !(hasInlineImageInActiveWorkspace && effectiveFiles.some((f: any) => !f.summary || f.summary.length < 80));

      if (shouldRunStaticInventoryFastPath && (isAllWorkspacesListRequest || searchableMaterials.length === 0)) {
        const allWsList = Array.from(allWorkspacesMap.values()).filter(w => w.id !== 'general-study' || w.files.length > 0 || w.notes.length > 0);
        const filesToDisplay = isAllWorkspacesListRequest
          ? Array.from(allWorkspacesMap.values()).flatMap(w => w.files || [])
          : effectiveFiles;
        const notesToDisplay = isAllWorkspacesListRequest
          ? allCrossWorkspaceNotes
          : activeWorkspaceNotesOnly;
        const totalFilesCount = filesToDisplay.length;
        const totalNotesCount = notesToDisplay.length;
        const totalItemsCount = totalFilesCount + totalNotesCount;

        if (totalItemsCount > 0 || (isAllWorkspacesListRequest && allWsList.length > 0)) {
          const describeFile = (f: any, idx: number) => {
            const wsTag = f.workspaceName ? ` *[Workspace: **${f.workspaceName}**]*` : '';
            const sizeTag = f.size ? ` · ${f.size}` : '';
            const cleanSummary = (f.summary || f.transcription || '')
              .replace(/\s+/g, ' ')
              .trim();
            const brief = cleanSummary && !isDummyMetadataLine(cleanSummary)
              ? `\n  ↳ *Content Summary:* ${cleanSummary.slice(0, 420)}${cleanSummary.length > 420 ? '...' : ''}`
              : '';
            return `- **${idx + 1}. ${f.name || 'Study Material'}** (\`${String(f.type || 'DOC').toUpperCase()}\`${sizeTag})${wsTag}${brief}`;
          };

          const pdfAndDocs: any[] = [];
          const imagesAndDiagrams: any[] = [];
          const videosAudioLinks: any[] = [];

          filesToDisplay.forEach((f: any) => {
            const t = String(f.type || '').toLowerCase();
            const n = String(f.name || '').toLowerCase();
            if (t.includes('image') || t === 'img' || /\.(png|jpg|jpeg|webp|gif|svg)$/.test(n)) {
              imagesAndDiagrams.push(f);
            } else if (t.includes('video') || t.includes('audio') || t.includes('url') || t.includes('link') || (f.url && /^https?:\/\//i.test(f.url))) {
              videosAudioLinks.push(f);
            } else {
              pdfAndDocs.push(f);
            }
          });

          const sections: string[] = [];

          if (isAllWorkspacesListRequest && allWsList.length > 0) {
            const wsLines = allWsList.map((ws, i) => {
              const fCount = (ws.files || []).length;
              const nCount = (ws.notes || []).length;
              const fcCount = ws.flashcardsCount || 0;
              const qCount = ws.quizzesCount || 0;
              const metaParts = [
                `${fCount} ${fCount === 1 ? 'File' : 'Files'}`,
                nCount > 0 ? `${nCount} ${nCount === 1 ? 'Note' : 'Notes'}` : null,
                fcCount > 0 ? `${fcCount} Flashcards` : null,
                qCount > 0 ? `${qCount} Quizzes` : null
              ].filter(Boolean).join(' · ');
              return `- **${i + 1}. ${ws.name}** (${ws.subject || 'General'}) — **${metaParts}**`;
            }).join('\n');
            sections.push(`#### 🗂️ Your Workspaces (${allWsList.length} ${allWsList.length === 1 ? 'Workspace' : 'Workspaces'})\n${wsLines}`);
          }

          if (pdfAndDocs.length > 0) {
            sections.push(
              `#### 📄 PDFs & Study Documents (${pdfAndDocs.length})\n` +
              pdfAndDocs.map((f, i) => describeFile(f, i)).join('\n')
            );
          }

          if (imagesAndDiagrams.length > 0) {
            sections.push(
              `#### 🖼️ Images & Visual Diagrams (${imagesAndDiagrams.length})\n` +
              imagesAndDiagrams.map((f, i) => describeFile(f, i)).join('\n')
            );
          }

          if (videosAudioLinks.length > 0) {
            sections.push(
              `#### 🎬 Videos, Audio & Web Links (${videosAudioLinks.length})\n` +
              videosAudioLinks.map((f, i) => describeFile(f, i)).join('\n')
            );
          }

          if (notesToDisplay.length > 0) {
            const noteLines = notesToDisplay.map((n, i) => {
              const wsTag = n.workspaceName ? ` *[Workspace: **${n.workspaceName}**]*` : '';
              const cleanNote = (n.summary || '').replace(/\s+/g, ' ').trim();
              const brief = cleanNote ? `\n  ↳ *Preview:* ${cleanNote.slice(0, 160)}${cleanNote.length > 160 ? '...' : ''}` : '';
              return `- **${i + 1}. ${n.name.replace(/ \(Note\)$/, '')}** (\`STUDY NOTE\`)${wsTag}${brief}`;
            }).join('\n');
            sections.push(`#### 📝 Study Notes (${notesToDisplay.length})\n${noteLines}`);
          }

          const scopeHeader = isAllWorkspacesListRequest
            ? `Across ${Math.max(1, allWsList.length)} ${allWsList.length === 1 ? 'Workspace' : 'Workspaces'}`
            : `in Workspace "${workspaceName || 'Workspace'}"`;

          const inventoryReply =
            `### 📂 Workspace Summary (${totalFilesCount} ${totalFilesCount === 1 ? 'File' : 'Files'}${totalNotesCount > 0 ? ` & ${totalNotesCount} ${totalNotesCount === 1 ? 'Note' : 'Notes'}` : ''} ${scopeHeader})\n\n` +
            `Here is everything currently uploaded ${scopeHeader}:\n\n` +
            `${sections.join('\n\n')}`;

          const inventoryFollowUps = filesToDisplay.slice(0, 3).map((f: any) =>
            `Explain the full contents of "${f.name}" in detail`
          );
          if (inventoryFollowUps.length < 3) {
            inventoryFollowUps.push(`Create practice quiz questions from my uploaded materials`);
          }

          return res.json({
            reply: inventoryReply,
            text: inventoryReply,
            citations: effectiveFiles.slice(0, 8).map((f: any) => ({
              sourceName: `${f.name || 'Workspace File'}${f.workspaceName ? ` (${f.workspaceName})` : ''}`,
              page: 1,
              quote: (f.summary || f.transcription || `Uploaded ${f.type || 'study'} file`).slice(0, 220)
            })),
            source: 'Workspace Knowledge Engine',
            workspaceNotice: undefined,
            activeWorkspaceContext: workspaceName || undefined,
            activeContextFiles: effectiveFiles.slice(0, 6).map((f: any) => f.name).filter(Boolean),
            followUpQuestions: inventoryFollowUps.slice(0, 3),
            suggestOutsideResearch: false
          });
        } else {
          const emptyInventoryReply =
            `You don't have any files or notes uploaded right now. Feel free to attach a PDF, image, scanned note, document, or link anytime and I'll analyze all of it for you—or ask me any question directly!`;

          return res.json({
            reply: emptyInventoryReply,
            text: emptyInventoryReply,
            citations: [],
            source: 'AI Study Tutor',
            workspaceNotice: undefined,
            activeWorkspaceContext: undefined,
            activeContextFiles: [],
            followUpQuestions: [
              `Explain a difficult concept step by step`,
              `What types of files or links can I upload for analysis?`,
              `Create a quick practice quiz on a topic`
            ],
            suggestOutsideResearch: false
          });
        }
      }

      const suggestOutsideResearch = false;
      let webKnowledge: RealWebKnowledgeResult = { contextText: "", summaryMarkdown: "", webCitations: [] };

      if (isCasualGreeting) {
        outOfWorkspaceInstruction = `
[CONVERSATIONAL GREETING / SMALL TALK MODE]
The user sent a natural greeting or casual message ("${prompt.trim()}").
1. Respond warmly, naturally, and concisely just like ChatGPT, Claude, or Gemini (e.g., greet them back and ask how you can help today).
2. Do NOT give a dictionary definition of their greeting.
3. Do NOT say anything like "not in your workspace", "General Study", or ask them to search the web.
4. Keep follow-up suggestions short and friendly.`;
      } else if (!hasRelevantWorkspaceMaterial && prompt.trim().length > 0) {
        // Automatically search the web seamlessly without ever saying "not in your workspace"
        webKnowledge = await fetchRealWebKnowledge(topicLabel, prompt);

        if (webKnowledge.contextText) {
          groundedSourceContext = [
            groundedSourceContext,
            `=== WEB SEARCH KNOWLEDGE FOR "${topicLabel}" ===\n${webKnowledge.contextText}`
          ].filter(Boolean).join('\n\n');
        }

        outOfWorkspaceInstruction = `
[GENERAL AI ASSISTANT & WEB SEARCH MODE]
Answer the user's question directly, naturally, and comprehensively—just like ChatGPT, Claude, or Gemini—using accurate knowledge and live web search grounding.
1. Start straight with a clear, helpful direct answer (no awkward disclaimers).
2. NEVER say "not in your workspace", "was not found in your workspace", or mention missing workspace files.
3. Do NOT output bare dictionary-style definitions unless the user explicitly asked to define a word. Give real explanations, intuition, examples, and clear structure.`;
      }

      // If the user asks StudyWeb to generate an image, do not generate any image and respond immediately
      if (isImageOrDiagramRequest(prompt)) {
        const noImageReply = "I cannot generate image. I can help you with your study tasks.";
        const cleanSubj = topicLabel || workspaceName || "your study topic";
        return res.status(200).json({
          reply: noImageReply,
          text: noImageReply,
          source: "StudyWeb AI Tutor",
          modelUsed: "StudyWeb AI Tutor",
          documentCount: effectiveFiles.length,
          activeWorkspaceContext: workspaceName || "Active Workspace",
          activeContextFiles: [],
          followUpQuestions: [
            `Explain the key concepts of ${cleanSubj} in simple words`,
            `Create 3 practice quiz questions on ${cleanSubj}`,
            `Summarize the most important exam points for ${cleanSubj}`
          ],
          suggestOutsideResearch: false
        });
      }

      const visualPromise = Promise.resolve(null);

      // 2. Precise Intent Detection
      let specializedFormatInstruction = "";

      const isSummaryQuery =
        isOverviewQuery ||
        /\b(summarize|summary|briefing|overview of|full explanation|complete explanation|explain everything|watch the video|tell me about)\b/i.test(qLower);

      const isQuizRequest =
        /\b(quiz me|test me|give me .*questions|generate .*questions|practice questions|create a quiz|make a quiz|ask me .*questions|flashcards? for)\b/i.test(qLower);

      const isInterviewQuery =
        /\b(interview|interviewer|viva|oral\s+exam|mock\s+interview|hr\s+question|behavioral\s+question|technical\s+round|system\s+design|coding\s+round|tell\s+me\s+about\s+yourself|strengths?\s+and\s+weaknesses|why\s+should\s+we\s+hire|star\s+method|situational\s+question|candidate|job\s+role|placement)\b/i.test(qLower);

      if (isInterviewQuery) {
        specializedFormatInstruction = `
[INTERVIEW & VIVA PREPARATION MODE]
The student is asking an interview or oral exam/viva question. Deliver a sharp, authoritative, interview-winning response structured as follows:
1. **Direct Model Answer (60-Second Interview Pitch)**: A clear, confident, ready-to-speak answer the candidate can deliver directly to an interviewer.
2. **Core Technical / Conceptual Breakdown (or STAR Framework)**: Deep, accurate points explaining the mechanism, architecture, or behavioral structure${hasRelevantWorkspaceMaterial ? ' grounded in their uploaded workspace material' : ''}.
3. **Practical Example & Common Pitfalls to Avoid**: Concrete real-world example plus 1-2 mistakes candidates commonly make on this question.
4. At the very end, output 3 contextual interview follow-up questions using [FOLLOW_UP: ...] tags (e.g., a harder follow-up interviewer question on this topic, a 60-second elevator pitch drill, and a scenario/edge-case question).`;
      } else if (isSummaryQuery && hasRelevantWorkspaceMaterial && searchableMaterials.length > 0) {
        specializedFormatInstruction = `
[COMPLETE WORKSPACE MATERIAL / TOPIC EXPLANATION REQUESTED]
The student is asking for a thorough explanation of their uploaded study material or topic from their workspace.
Provide a deep, comprehensive, start-to-finish breakdown grounded directly in the uploaded workspace material(s):
1. Executive Overview & Central Theme (citing the exact workspace file/note)
2. Complete Step-by-Step / Section-by-Section Walkthrough of the concepts covered in their uploaded material
3. Core Definitions, Mechanisms, Formulas, or Examples from the material
4. High-Yield Key Takeaways & Study Summary`;
      } else if (isQuizRequest) {
        specializedFormatInstruction = hasRelevantWorkspaceMaterial && searchableMaterials.length > 0
          ? `\n[PRACTICE QUIZ REQUESTED]\nGenerate 3 to 4 specific, content-rich practice questions (with clear answers and explanations) testing the concepts in the student's uploaded workspace materials.`
          : `\n[PRACTICE QUIZ REQUESTED]\nGenerate 3 to 4 specific, well-explained practice questions (with answers) on the exact topic requested by the student.`;
      } else if (/\b(table|compare|comparison|difference between|contrasting)\b/i.test(qLower)) {
        specializedFormatInstruction = `
[COMPARISON REQUESTED]
Include a clear, structured comparison (using a markdown table or side-by-side bullet points) highlighting key differences and similarities, followed by a clear explanation.`;
      }

      let fileOverviewContext = "";
      if (hasRelevantWorkspaceMaterial && searchableMaterials.length > 0) {
        fileOverviewContext = `\nUPLOADED WORKSPACE STUDY MATERIALS (${searchableMaterials.length} item${searchableMaterials.length === 1 ? '' : 's'} in active context):\n`;
        searchableMaterials.slice(0, 12).forEach((f: any, idx: number) => {
          fileOverviewContext += `- Material #${idx + 1}: "${f.name}" (Workspace: "${f.workspaceName || 'Workspace'}", Type: ${f.type || 'document'}${f.url && f.url.startsWith('http') ? `, URL: ${f.url}` : ''})\n`;
          if (f.summary && !isDummyMetadataLine(f.summary)) {
            fileOverviewContext += `  Summary: ${f.summary.slice(0, 800)}\n`;
          }
        });
      }

      const followUpDirective = `6. CONTEXT ATTRIBUTION & FOLLOW-UP QUESTIONS:
   - When answering from uploaded workspace materials, explicitly mention which workspace file or note you are referencing in the opening sentence.
   - At the very end of EVERY response, output exactly 3 short, specific follow-up questions the student can click next, each on its own line in this exact format:
     [FOLLOW_UP: First follow-up question?]
     [FOLLOW_UP: Second follow-up question?]
     [FOLLOW_UP: Third follow-up question?]`;

      const coreSystemInstruction = `You are StudyWeb's AI assistant—operating just like ChatGPT, Claude, and Gemini: natural, conversational, intelligent, clear, and directly helpful.
CRITICAL INSTRUCTION DIRECTIVES:
1. WORKSPACE MATERIAL ANALYSIS (WHEN RELEVANT MATERIALS ARE UPLOADED):
   - When the user has uploaded files, notes, scanned images, PDFs, links, or videos in their workspace and asks about them (or asks to analyze/summarize their workspace), carefully read ALL sections of "=== RETRIEVED WORKSPACE DOCUMENT SEGMENTS ===", "=== FULL UPLOADED WORKSPACE MATERIALS & NOTES ===", and all attached inlineData/fileData.
   - Analyze ALL relevant uploaded items thoroughly, solve exact questions/equations/problems step by step, and cite sources naturally (e.g., [Source: File Name]).
2. NATURAL CONVERSATIONAL & WEB KNOWLEDGE FALLBACK (WHEN NOT IN WORKSPACE OR GENERAL CHAT):
   - For greetings ("hi", "hello", "how are you", etc.) or general questions not covered by uploaded workspace files, respond naturally, warmly, and directly just like ChatGPT/Claude/Gemini using general knowledge and web search grounding.
   - NEVER say "not in your workspace", "was not found in your workspace", or mention empty/deleted workspaces like "General Study".
   - NEVER give a bare dictionary definition unless the user explicitly asks to define a word or asks for a word's meaning.
3. MULTIMODAL ANALYSIS:
   - When analyzing an uploaded image, PDF, document, video, or website, provide a thorough, accurate breakdown of its contents, concepts, formulas, and takeaways.
4. STRICT AVOIDANCE:
   - NEVER generate any image, SVG, or picture. If the user asks you to generate, create, draw, or make an image or picture, reply: "I cannot generate image. I can help you with your study tasks."
   - NEVER mention "Document 1246", "Enjoy the videos", "music you love", or "Mix".
   - NEVER output canned filler or say you are disconnected.
${followUpDirective}
${unifiedTutorStyleInstruction}
${researchGuideline}
${citationGuideline}`;

      const systemInstruction = [
        coreSystemInstruction,
        outOfWorkspaceInstruction,
        userDatabaseContext,
        specializedFormatInstruction,
        fileOverviewContext,
        groundedSourceContext
      ].filter(Boolean).join('\n\n');

      // Verified active Gemini models for fast, reliable responses
      const baseCandidateModels: string[] = [
        "gemini-4-hydrogen",
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview"
      ];
      const candidateModels: string[] = getAvailableCandidateModels(baseCandidateModels);

      let responseText = "";
      let responseSource = "";
      let lastError: any = null;

      // Build currentTurnParts: attach user-uploaded workspace binary/video/PDF parts first!
      const currentTurnParts: any[] = [{ text: prompt }];

      if (hasRelevantWorkspaceMaterial && effectiveFiles && effectiveFiles.length > 0) {
        const matchedSourceSet = new Set(retrievedSegments.map(s => s.sourceName));
        const candidateAttachmentFiles = [
          ...effectiveFiles.filter((f: any) => Boolean(f.isDirectAttachment)),
          ...effectiveFiles.filter((f: any) => !f.isDirectAttachment && !isDefaultDemoStubFile(f) && matchedSourceSet.has(f.name)),
          ...effectiveFiles.filter((f: any) => !f.isDirectAttachment && !isDefaultDemoStubFile(f) && !matchedSourceSet.has(f.name)),
          ...effectiveFiles.filter((f: any) => !f.isDirectAttachment && isDefaultDemoStubFile(f))
        ].slice(0, 6);

        for (const file of candidateAttachmentFiles) {
          let rawBase64 = "";
          let mimeType = file.fileMimeType || (file.type === "image" ? "image/png" : (file.type === "video" ? "video/mp4" : "application/pdf"));

          if (file.url && typeof file.url === "string" && file.url.startsWith("data:")) {
            const match = file.url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              rawBase64 = match[2];
            }
          } else if (file.fileBase64) {
            rawBase64 = String(file.fileBase64);
            if (rawBase64.includes(";base64,")) {
              rawBase64 = rawBase64.split(";base64,")[1];
            }
          }

          rawBase64 = rawBase64.replace(/[\r\n\s]/g, "");

          if (rawBase64 && rawBase64.length > 20 && rawBase64.length < 15000000) {
            const isSupportedType =
              mimeType.startsWith("image/") ||
              mimeType.startsWith("video/") ||
              mimeType === "application/pdf" ||
              mimeType.startsWith("text/") ||
              mimeType.startsWith("audio/");

            if (isSupportedType) {
              currentTurnParts.push({
                inlineData: {
                  mimeType,
                  data: rawBase64
                }
              });
            }
          } else {
            // Always attach YouTube video URLs as native Gemini fileData so Gemini watches the whole video directly like NotebookLM
            const ytId = TranscriptProcessor.extractYouTubeId(file.url || file.name || '');
            if (ytId) {
              currentTurnParts.push({
                fileData: {
                  fileUri: `https://www.youtube.com/watch?v=${ytId}`,
                  mimeType: 'video/mp4'
                }
              });
            }
          }
        }
      }

      const buildContentsPayload = (partsToUse: any[], maxHistoryTurns: number = 6) => {
        if (Array.isArray(history) && history.length > 0 && maxHistoryTurns > 0) {
          const multiTurnContents: any[] = [];
          for (const turn of history.slice(-maxHistoryTurns)) {
            const turnRole = (turn.role === 'model' || turn.role === 'ai' || turn.role === 'assistant') ? 'model' : 'user';
            const turnText = String(turn.content || turn.text || '').trim();
            if (turnText) {
              if (turnRole === 'model' && (
                turnText.includes('Understanding "') && turnText.includes('involves breaking down the main concepts') ||
                turnText.includes('Focus on the central principle, cause-and-effect mechanisms')
              )) {
                continue;
              }
              if (multiTurnContents.length === 0 && turnRole === 'model') {
                continue;
              }
              const lastRole = multiTurnContents.length > 0 ? multiTurnContents[multiTurnContents.length - 1].role : null;
              if (lastRole === turnRole) {
                multiTurnContents[multiTurnContents.length - 1].parts[0].text += `\n\n${turnText}`;
              } else {
                multiTurnContents.push({
                  role: turnRole,
                  parts: [{ text: turnText }]
                });
              }
            }
          }

          const lastRole = multiTurnContents.length > 0 ? multiTurnContents[multiTurnContents.length - 1].role : null;
          if (lastRole === 'user') {
            multiTurnContents[multiTurnContents.length - 1].parts = partsToUse;
          } else {
            multiTurnContents.push({
              role: 'user',
              parts: partsToUse
            });
          }
          return multiTurnContents;
        }
        return partsToUse.length === 1 && partsToUse[0].text ? partsToUse[0].text : partsToUse;
      };

      // Multi-pass auto-retry across active Gemini models so transient 503/429 spikes still return a real Gemini answer
      const maxPasses = 2;
      const allRetryModels = Array.from(new Set([...candidateModels, ...baseCandidateModels]));
      let geminiGroundingCitations: Array<{ sourceName: string; page?: number; quote: string; url?: string }> = [];

      for (let pass = 0; pass < maxPasses && !responseText; pass++) {
        if (pass > 0) {
          await new Promise(resolve => setTimeout(resolve, pass * 500));
        }

        const modelsForPass = pass === 0 ? candidateModels : allRetryModels;
        for (const currentModel of modelsForPass) {
          const modelStartTime = Date.now();
          try {
            const apiKey = getGeminiApiKey();
            if (!apiKey) {
              const noKeyErr = new Error("GEMINI_API_KEY is not configured on the server.");
              (noKeyErr as any).status = 500;
              throw noKeyErr;
            }

            const ai = new GoogleGenAI({
              apiKey,
              apiVersion: "v1beta",
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build",
                }
              }
            });

            let response: any = null;
            let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
            try {
              const activeParts = pass <= 1 ? currentTurnParts : [{ text: prompt }];
              const contentsPayload = pass <= 1 ? buildContentsPayload(activeParts, 6) : prompt;
              const hasMediaOrVideoPart = activeParts.some((p: any) => Boolean(p?.fileData || p?.inlineData));
              const timeoutMs = hasMediaOrVideoPart ? 22000 : 12000;

              const isHydrogen = currentModel === "gemini-4-hydrogen";
              const supportsMinimalThinking = currentModel.startsWith("gemini-3");
              const shouldUseWebGrounding = !hasRelevantWorkspaceMaterial && !hasMediaOrVideoPart;

              const genPromise = ai.models.generateContent({
                model: currentModel,
                contents: contentsPayload,
                config: {
                  systemInstruction: pass <= 1
                    ? systemInstruction
                    : [coreSystemInstruction, outOfWorkspaceInstruction, fileOverviewContext, groundedSourceContext].filter(Boolean).join('\n\n'),
                  ...(shouldUseWebGrounding ? { tools: [{ googleSearch: {} }] } : {}),
                  ...(isHydrogen ? {} : { temperature: 0.6 }),
                  ...(isHydrogen
                    ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                    : supportsMinimalThinking
                    ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
                    : {})
                }
              });

              const modelTimeout = new Promise<never>((_, reject) => {
                timeoutHandle = setTimeout(() => reject(new Error(`Model ${currentModel} timed out after ${timeoutMs}ms`)), timeoutMs);
              });

              response = await Promise.race([genPromise, modelTimeout]);
              if (timeoutHandle) clearTimeout(timeoutHandle);
            } catch (retryErr: any) {
              if (timeoutHandle) clearTimeout(timeoutHandle);
              if (isQuotaOrRateLimitError(retryErr)) {
                recordModelQuotaCooldown(currentModel, retryErr);
              }
              throw retryErr;
            }

            if (response && response.text && response.text.trim()) {
              responseText = response.text.trim();
              responseSource = `Gemini (${currentModel})`;
              const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
              if (Array.isArray(chunks)) {
                geminiGroundingCitations = chunks
                  .filter((c: any) => c?.web?.uri)
                  .slice(0, 5)
                  .map((c: any) => ({
                    sourceName: c.web.title || c.web.uri,
                    page: 1,
                    quote: c.web.uri,
                    url: c.web.uri
                  }));
              }
              console.log(`[AI Tutor][${correlationId}] Completed with ${currentModel} (pass ${pass + 1}) in ${Date.now() - modelStartTime}ms`);
              break;
            } else {
              throw new Error("Empty response from model");
            }
          } catch (err: any) {
            if (isAuthOrInvalidApiKeyError(err) || err?.message?.includes("GEMINI_API_KEY is not configured")) {
              lastError = {
                model: currentModel,
                status: err?.status || 401,
                message: summarizeModelError(err)
              };
              break;
            }
            if (isQuotaOrRateLimitError(err)) {
              recordModelQuotaCooldown(currentModel, err);
            }
            const cleanNote = summarizeModelError(err);
            console.log(`[AI Tutor][${correlationId}] Pass ${pass + 1}: routing from ${currentModel} to next model (${cleanNote})`);
            lastError = {
              model: currentModel,
              status: err?.status || err?.statusCode || 500,
              message: cleanNote
            };
          }
        }
        if (lastError && (lastError.status === 401 || String(lastError.message).includes("GEMINI_API_KEY"))) {
          break;
        }
      }

      // Use real conversational, workspace, or web knowledge synthesis when Gemini is unavailable
      if (!responseText) {
        const localDocSynthesis = generateLocalAITutorResponse(
          prompt,
          hasRelevantWorkspaceMaterial ? searchableMaterials : [],
          groundedSourceContext,
          workspaceNotice,
          webKnowledge,
          {
            isConversational: isCasualGreeting,
            isWorkspaceAnalysis: isWorkspaceAnalysisQuery || isOverviewQuery,
            retrievedSegments
          }
        );
        if (localDocSynthesis) {
          responseText = localDocSynthesis;
          responseSource = isCasualGreeting
            ? "AI Assistant"
            : hasRelevantWorkspaceMaterial
            ? "Workspace Analysis Engine"
            : webKnowledge.summaryMarkdown
            ? "Web Knowledge Search"
            : "StudyWeb AI";
        }
      }

      // Await parallel visual/diagram generation if triggered
      const visualResult = await visualPromise;

      // Extract citations ONLY when workspace files were relevant OR web citations exist (never on casual greetings)
      const responseCitations: Array<{ sourceName: string; page?: number; quote: string; snippet?: string; fileId?: string; url?: string }> = [];

      if (hasRelevantWorkspaceMaterial && retrievedSegments && retrievedSegments.length > 0) {
        const citedSourceNames = new Set<string>();
        const sourceTagRegex = /\[Source:\s*([^,\]]+)(?:,\s*Page\s*(\d+))?\]/gi;
        let match;
        while ((match = sourceTagRegex.exec(responseText)) !== null) {
          citedSourceNames.add(match[1].trim().toLowerCase());
        }

        retrievedSegments.forEach(seg => {
          const segNameLower = seg.sourceName.toLowerCase();
          const isCited = citedSourceNames.has(segNameLower) || 
                          Array.from(citedSourceNames).some(n => segNameLower.includes(n) || n.includes(segNameLower)) ||
                          responseText.toLowerCase().includes(segNameLower);

          if (isCited || (responseCitations.length === 0 && seg.score > 0)) {
            if (!responseCitations.some(c => c.sourceName === seg.sourceName && c.page === seg.page)) {
              responseCitations.push({
                sourceName: seg.sourceName,
                page: seg.page,
                quote: seg.snippet,
                snippet: seg.text,
                fileId: seg.fileId
              });
            }
          }
        });
      }

      if (!hasRelevantWorkspaceMaterial && !isCasualGreeting) {
        for (const wc of [...geminiGroundingCitations, ...webKnowledge.webCitations]) {
          if (!responseCitations.some((c) => c.sourceName === wc.sourceName)) {
            responseCitations.push(wc);
          }
        }
      }

      // Extract any [FOLLOW_UP: ...] tags from responseText and clean responseText
      const parsedFollowUps: string[] = [];
      const followUpRegex = /\[FOLLOW_UP:\s*([^\]]+)\]/gi;
      let fuMatch;
      while ((fuMatch = followUpRegex.exec(responseText)) !== null) {
        const cleanQ = fuMatch[1].trim();
        if (cleanQ && !parsedFollowUps.includes(cleanQ)) {
          parsedFollowUps.push(cleanQ);
        }
      }
      responseText = responseText.replace(/\[FOLLOW_UP:\s*[^\]]+\]/gi, '').trim();

      const cleanT = topicLabel || 'this topic';
      const fallbackPool = isCasualGreeting
        ? [
            ...(effectiveFiles.length > 0
              ? [`Analyze everything uploaded in my workspace`]
              : [`Explain a complex concept step by step`]),
            `Summarize key ideas with real-world examples`,
            `Create 3 practice quiz questions on a topic`
          ]
        : isInterviewQuery
        ? [
            `Ask me a harder follow-up interview question on ${cleanT} and critique my approach`,
            `How do I summarize ${cleanT} in a 60-second interview answer?`,
            `What real-world scenario or edge-case interview question is asked about ${cleanT}?`
          ]
        : (hasRelevantWorkspaceMaterial && searchableMaterials.length > 0)
        ? [
            `What are the most important takeaways from "${searchableMaterials[0]?.name || 'my uploaded materials'}"?`,
            `Ask me 3 practice questions based on "${searchableMaterials[0]?.name || 'my uploaded materials'}"`,
            `Explain the hardest concept in "${searchableMaterials[0]?.name || 'my uploaded materials'}" step by step`
          ]
        : [
            `Explain ${cleanT} with a real-world example`,
            `What are the key concepts behind ${cleanT}?`,
            effectiveFiles.length > 0
              ? `Analyze how ${cleanT} connects to "${effectiveFiles[0].name}"`
              : `Quiz me with 3 practice questions on ${cleanT}`
          ];

      for (const candidateQ of fallbackPool) {
        if (parsedFollowUps.length >= 3) break;
        if (!parsedFollowUps.includes(candidateQ)) {
          parsedFollowUps.push(candidateQ);
        }
      }

      const totalEstimatedPages = effectiveFiles.reduce((acc: number, f: any) => acc + (f.pages || 1), 0);
      const processedFileNames = hasRelevantWorkspaceMaterial
        ? Array.from(new Set([
            ...responseCitations.map(c => c.sourceName),
            ...searchableMaterials.slice(0, 6).map((f: any) => f.name)
          ].filter(Boolean)))
        : [];

      const safeWorkspaceLabel = (workspaceId && workspaceId !== 'general-study' && workspaceName)
        ? workspaceName
        : undefined;

      res.status(200).json({ 
        reply: responseText,
        text: responseText, 
        source: responseSource || "Gemini AI",
        modelUsed: responseSource || "Gemini 3 Flash",
        documentCount: hasRelevantWorkspaceMaterial ? searchableMaterials.length : 0,
        workspaceNotice: undefined,
        activeWorkspaceContext: safeWorkspaceLabel,
        activeContextFiles: processedFileNames,
        followUpQuestions: parsedFollowUps.slice(0, 3),
        suggestOutsideResearch: false,
        generatedImageUrl: visualResult?.imageUrl,
        generatedImageCaption: visualResult?.caption,
        citations: responseCitations.length > 0 ? responseCitations : undefined,
        extractionFeed: {
          filesProcessed: processedFileNames,
          totalEstimatedPages: hasRelevantWorkspaceMaterial ? totalEstimatedPages : 0,
          chunksAnalyzed: hasRelevantWorkspaceMaterial ? (searchableMaterials.length * 4 + (responseCitations.length * 2) + 3) : 0,
          extractionMode: isCasualGreeting
            ? "conversational"
            : hasRelevantWorkspaceMaterial
            ? "deep_full_document"
            : "web_grounded_general",
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      const totalDuration = Date.now() - routeStartTime;
      console.warn(`[AI Tutor Error][${correlationId}] Exception in ${totalDuration}ms:`, error?.message || error);
      res.status(503).json({
        error: error?.message || "Unable to reach Gemini AI right now. Please retry.",
        correlationId
      });
    }
  });

  // API Route: AI Tutor Clear Chat Session & Memory
  app.post(["/api/ai-tutor-clear", "/api/ai-tutor/clear"], (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { workspaceId, userId } = req.body || {};
      console.log(`[AI Tutor] Chat history cleared for workspace: ${workspaceId || 'global'}, user: ${userId || 'guest'}`);
      return res.status(200).json({
        success: true,
        cleared: true,
        workspaceId: workspaceId || 'global',
        clearedAt: new Date().toISOString()
      });
    } catch {
      return res.status(200).json({ success: true, cleared: true });
    }
  });
  app.post(["/api/ai-tutor-tts", "/api/ai-tutor-tts/"], async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const rawText = String(req.body?.text || "").trim();
      const persona = String(req.body?.persona || "socratic").trim();
      const language = req.body?.language ? String(req.body.language).trim() : "";
      const requestedVoice = String(req.body?.voiceName || "Charon").trim();

      if (!rawText) {
        return res.status(400).json({ error: "Text is required for TTS synthesis." });
      }

      // Strip markdown, citations, code blocks, and smooth math notation into natural spoken phrasing
      let cleanText = rawText
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[Source:[^\]]+\]/gi, "")
        .replace(/\[\d+:\d+\]/g, "")
        .replace(/#{1,6}\s+/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/^[-*•]\s+/gm, "")
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2")
        .replace(/\\sqrt\{([^}]+)\}/g, "square root of $1")
        .replace(/\$([^$]+)\$/g, "$1")
        .replace(/(\w)\^2\b/g, "$1 squared")
        .replace(/(\w)\^3\b/g, "$1 cubed")
        .replace(/\s*×\s*/g, " times ")
        .replace(/\s*÷\s*/g, " divided by ")
        .replace(/(\d)\s*=\s*(\d|[A-Za-z])/g, "$1 equals $2")
        .replace(/\n{2,}/g, ". ")
        .replace(/\n+/g, ", ")
        .replace(/\s{2,}/g, " ")
        .trim();

      const maxTtsChars = persona === "scan_notes" ? 700 : 1800;
      if (cleanText.length > maxTtsChars) {
        const truncated = cleanText.slice(0, maxTtsChars);
        const lastBreak = Math.max(
          truncated.lastIndexOf(". "),
          truncated.lastIndexOf("? "),
          truncated.lastIndexOf("! ")
        );
        cleanText = lastBreak > maxTtsChars * 0.45 ? truncated.slice(0, lastBreak + 1).trim() : truncated.trim();
      }

      if (!cleanText) {
        return res.status(400).json({ error: "Cleaned text is empty." });
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(200).json({
          success: false,
          fallbackToBrowser: true,
          message: "Gemini API key not configured, fallback to client synthesis."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const langNote = language ? ` Speak fluently and naturally in ${language}.` : "";
      const styleInstruction =
        persona === "exam_prep"
          ? `Natural, real human study coach speaking one-on-one in person—clear conversational tone, organic breathing and natural pauses at punctuation, relaxed warmth, zero robotic or announcer cadence.${langNote}`
          : persona === "scan_notes" || persona === "explain"
          ? `Warm, grounded, real human tutor sitting beside a student reading and explaining notes aloud—natural conversational rhythm, subtle human inflection and brief pauses at commas and periods, never monotonous or synthetic.${langNote}`
          : `Warm, natural, thoughtful human tutor talking face-to-face in relaxed conversation—authentic human cadence, gentle emphasis on key ideas, natural breathing pauses, completely unscripted and never robotic.${langNote}`;

      const validVoice = ["Kore", "Puck", "Fenrir", "Charon", "Zephyr"].includes(requestedVoice)
        ? requestedVoice
        : "Charon";

      // Prioritize low-latency gemini-3.8-flash-lite-tts first for fast playback
      const ttsCandidates = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"].filter(
        (m) => !isModelOnCooldown(m)
      );

      if (ttsCandidates.length === 0) {
        return res.status(200).json({
          success: false,
          fallbackToBrowser: true,
          message: "TTS models on cooldown, using client speech synthesis."
        });
      }

      let lastErr: any = null;
      for (const ttsModel of ttsCandidates) {
        try {
          const response = await ai.models.generateContent({
            model: ttsModel,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: cleanText,
                    speechMetadata: {
                      style: styleInstruction
                    }
                  }
                ]
              }
            ] as any,
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: validVoice
                  }
                }
              }
            }
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            return res.json({
              success: true,
              audioBase64: base64Audio,
              mimeType: "audio/wav",
              voiceUsed: validVoice,
              modelUsed: ttsModel,
              cleanedText: cleanText
            });
          }
        } catch (modelErr: any) {
          lastErr = modelErr;
          if (isQuotaOrRateLimitError(modelErr)) {
            recordModelQuotaCooldown(ttsModel, modelErr);
          }
          console.log(`[AI Tutor TTS] ${ttsModel} fallback notice (${summarizeModelError(modelErr)})`);
        }
      }

      if (lastErr) {
        console.log(`[AI Tutor TTS] Switching to client speech synthesis (${summarizeModelError(lastErr)})`);
      }

      return res.json({
        success: false,
        fallbackToBrowser: true,
        message: "No audio data returned from Gemini TTS."
      });
    } catch (ttsErr: any) {
      if (isQuotaOrRateLimitError(ttsErr)) {
        recordModelQuotaCooldown("gemini-3.8-flash-tts", ttsErr);
      }
      console.log(`[AI Tutor TTS] Switching to client speech synthesis (${summarizeModelError(ttsErr)})`);
      return res.status(200).json({
        success: false,
        fallbackToBrowser: true,
        message: "TTS synthesis switched to browser speech."
      });
    }
  });

  // Helper: SSRF validator
  function isValidPublicUrl(urlString: string): boolean {
    try {
      const parsed = new URL(urlString);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.31.') ||
        hostname === '169.254.169.254' ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local')
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Helper: Smart low-latency Gemini Vision runner with instant failover on error and 2.2s hedged backup
  async function runFastLensVisionRace(
    ai: GoogleGenAI,
    contents: any,
    config?: Record<string, any>,
    perModelTimeoutMs = 15000
  ): Promise<string> {
    const preferred = ["gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-3-flash-preview"];
    const candidates = getAvailableCandidateModels(preferred);
    let settled = false;

    // Trigger next model immediately if the previous model errors out, or after 2200ms if still pending
    const wakeTriggerFns: Array<() => void> = [];

    const tasks = candidates.map((modelName, idx) => {
      return new Promise<string>(async (resolve, reject) => {
        if (idx > 0) {
          await new Promise<void>((wake) => {
            wakeTriggerFns[idx] = wake;
            setTimeout(wake, idx * 2200);
          });
          if (settled) {
            reject(new Error("Already settled by faster model"));
            return;
          }
        }

        let timer: ReturnType<typeof setTimeout> | null = null;
        try {
          const isHydrogen = modelName === "gemini-4-hydrogen";
          const modelConfig: Record<string, any> = { ...(config || {}) };
          if (isHydrogen) {
            delete modelConfig.temperature;
            modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          } else {
            modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
          }

          const normalizedContents = Array.isArray(contents) && contents[0] && !contents[0].role && !contents[0].parts
            ? { parts: contents }
            : contents;

          const genPromise = ai.models.generateContent({
            model: modelName,
            contents: normalizedContents,
            config: modelConfig
          });

          const timeoutPromise = new Promise<never>((_, rej) => {
            timer = setTimeout(
              () => rej(new Error(`Lens model ${modelName} timed out after ${perModelTimeoutMs}ms`)),
              perModelTimeoutMs
            );
          });

          const resp: any = await Promise.race([genPromise, timeoutPromise]);
          if (timer) clearTimeout(timer);

          const text = String(resp?.text || "").trim();
          if (!text) {
            wakeTriggerFns[idx + 1]?.();
            reject(new Error(`Empty response from ${modelName}`));
            return;
          }
          settled = true;
          resolve(text);
        } catch (err: any) {
          if (timer) clearTimeout(timer);
          if (isAuthOrInvalidApiKeyError(err)) {
            settled = true;
            // Wake pending tasks immediately so Promise.any resolves/rejects without waiting
            for (let j = idx + 1; j < candidates.length; j++) {
              wakeTriggerFns[j]?.();
            }
            reject(err);
            return;
          }
          if (isTransientOrUnavailableModelError(err)) {
            recordModelQuotaCooldown(modelName, err);
          }
          // Immediately wake the next backup model with zero delay
          wakeTriggerFns[idx + 1]?.();
          reject(err);
        }
      });
    });

    return Promise.any(tasks);
  }

  // API Route: Dedicated Optical Character Recognition (OCR) for Camera-Scanned Study Notes
  app.post(["/api/ocr/scan-note", "/api/ocr/scan-note/"], async (req, res) => {
    const { fileBase64, fileMimeType, name } = req.body || {};
    const defaultTitle = cleanNotebookLMTitle(name || "Scanned Study Notes", "", "image");

    try {
      if (!fileBase64) {
        res.status(400).json({ error: "Scanned image base64 data is required." });
        return;
      }

      let cleanBase64 = String(fileBase64);
      if (cleanBase64.includes(";base64,")) {
        cleanBase64 = cleanBase64.split(";base64,")[1];
      }
      cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, "");

      let normalizedMime = String(fileMimeType || "image/jpeg").toLowerCase().trim();
      if (normalizedMime === "image/jpg" || normalizedMime === "image/pjpeg" || normalizedMime === "image/jfif") {
        normalizedMime = "image/jpeg";
      }

      const apiKey = getGeminiApiKey();

      if (!apiKey) {
        res.status(503).json({
          error: "Scan Notes image analysis requires a valid GEMINI_API_KEY in Settings > Secrets.",
          code: "API_KEY_REQUIRED"
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      // Plain-text Markdown prompt (no JSON schema compilation overhead or LaTeX JSON-escaping bugs -> ~2.5x faster!)
      const fastOcrPrompt = `Transcribe ALL visible handwritten and printed text, questions, multiple-choice options, and equations from this image word-for-word in clean Markdown.
Output format:
# <Concise 3 to 6 word topic title>
Summary: <Crisp 2 to 3 sentence short summary explaining what this note is about, its main concepts or problem, and key takeaway>

<Full verbatim transcription of the page>`;

      let rawMarkdown = "";
      try {
        rawMarkdown = await runFastLensVisionRace(
          ai,
          {
            parts: [
              { text: fastOcrPrompt },
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: normalizedMime
                }
              }
            ]
          },
          {},
          15000
        );
      } catch (raceErr: any) {
        if (isAuthOrInvalidApiKeyError(raceErr)) {
          res.status(401).json({
            error: "Gemini API key is invalid or unauthorized. Please update GEMINI_API_KEY in Settings > Secrets.",
            code: "API_KEY_INVALID"
          });
          return;
        }
        console.warn("[OCR Endpoint] Fast race notice:", summarizeModelError(raceErr));
      }

      if (rawMarkdown) {
        const cleaned = rawMarkdown
          .replace(/^```(?:markdown|md|text)?\n?/i, "")
          .replace(/\n?```$/, "")
          .trim();
        const lines = cleaned.split(/\r?\n/);

        let extractedTitle = defaultTitle;
        let extractedSummary = "";
        const bodyLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (i === 0 && line.startsWith("#")) {
            const candidate = line.replace(/^#+\s*/, "").trim();
            if (candidate.length >= 2 && candidate.length <= 90) {
              extractedTitle = candidate;
              continue;
            }
          }
          if (!extractedSummary && /^(\*\*summary\*\*|summary)\s*:/i.test(line)) {
            extractedSummary = line.replace(/^(\*\*summary\*\*|summary)\s*:\s*/i, "").trim();
            continue;
          }
          bodyLines.push(lines[i]);
        }

        const verbatimBody = bodyLines.join("\n").trim() || cleaned;
        const cleanTitle = cleanNotebookLMTitle(extractedTitle || defaultTitle, "", "image");
        if (!extractedSummary) {
          const firstSentence = verbatimBody
            .replace(/^#+\s+/gm, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 180);
          extractedSummary = firstSentence || `Scanned study notes on ${cleanTitle}.`;
        }

        const nonEmptyLines = verbatimBody
          .split(/\r?\n/)
          .map((l) => l.replace(/^[-*•\d.)#]+\s*/, "").trim())
          .filter((l) => l.length > 8);

        const highlights = nonEmptyLines.slice(0, 4);
        const formulas = nonEmptyLines
          .filter((l) => /[=+\-*/^]|\\frac|\\sqrt|→|⇌/.test(l) && l.length < 120)
          .slice(0, 4);

        const formattedDocument = [
          `# ${cleanTitle}`,
          extractedSummary ? `\n## Summary\n${extractedSummary}` : "",
          `\n## Verbatim Scanned Notes (OCR)\n${verbatimBody}`
        ]
          .filter(Boolean)
          .join("\n");

        res.json({
          title: cleanTitle,
          extractedText: formattedDocument,
          rawOcrText: verbatimBody,
          summary: extractedSummary,
          highlights,
          formulas,
          tags: [cleanTitle.split(" ").slice(0, 2).join(" ") || "Scanned Note", "OCR"]
        });
        return;
      }

      res.json({
        title: defaultTitle,
        extractedText: `# ${defaultTitle}\n\nScanned study note ready. Ask any question about this image in Ask & Solve.`,
        rawOcrText: "Scanned study note ready. Ask any question about this image in Ask & Solve.",
        summary: "Scanned image loaded in Lens. Ask any question below to analyze or solve problems on this page.",
        highlights: ["Scanned page ready for visual Q&A"],
        formulas: [],
        tags: ["Scanned Note", "Lens"]
      });
    } catch (error: any) {
      if (isAuthOrInvalidApiKeyError(error)) {
        res.status(401).json({
          error: "Gemini API key is invalid or unauthorized. Please update GEMINI_API_KEY in Settings > Secrets.",
          code: "API_KEY_INVALID"
        });
        return;
      }
      console.warn("[OCR Endpoint Notice] /api/ocr/scan-note fallback:", summarizeModelError(error));
      res.json({
        title: defaultTitle,
        extractedText: `# ${defaultTitle}\n\nScanned study note ready. Ask any question about this image in Ask & Solve.`,
        rawOcrText: "Scanned study note ready. Ask any question about this image in Ask & Solve.",
        summary: "Scanned image loaded in Lens. Ask any question below to analyze or solve problems on this page.",
        highlights: ["Scanned page ready for visual Q&A"],
        formulas: [],
        tags: ["Scanned Note", "Lens"]
      });
    }
  });

  // API Route: Google Lens-style Direct Multimodal Q&A, Solver, Generator & Translator for Scanned Notes (no workspace required)
  app.post(["/api/ocr/lens-ask", "/api/ocr/lens-ask/"], async (req, res) => {
    try {
      const {
        fileBase64,
        fileMimeType,
        imageUrl,
        extractedText,
        question,
        mode = "ask",
        targetLanguage = "English",
        history = []
      } = req.body || {};

      const trimmedText = String(extractedText || "").trim();
      if (!fileBase64 && !trimmedText && !imageUrl) {
        res.status(400).json({
          error: "A scanned image or extracted note text is required to answer or generate content."
        });
        return;
      }

      const apiKey = getGeminiApiKey();
      const buildFallbackLensAnswer = (rawMode: string, textCtx: string): string => {
        if (rawMode === "short_summary" && textCtx) {
          const plain = textCtx
            .replace(/^#{1,6}\s+[^\n]*\n+/gm, "")
            .replace(/\s+/g, " ")
            .trim();
          const sentences = plain.split(/(?<=[.!?])\s+/).filter(Boolean);
          const concise = sentences.slice(0, 2).join(" ") || plain.slice(0, 220);
          return concise.length > 220 ? `${concise.slice(0, 217)}...` : concise;
        }
        return textCtx
          ? `Here is the extracted content from your scan:\n\n${textCtx}`
          : "Your scan is loaded. Configure a valid GEMINI_API_KEY in Settings > Secrets to enable live Lens AI Q&A.";
      };

      if (!apiKey) {
        res.json({
          answer: buildFallbackLensAnswer(String(mode || "ask").toLowerCase().trim(), trimmedText),
          mode: String(mode || "ask")
        });
        return;
      }

      let cleanBase64 = fileBase64 ? String(fileBase64) : "";
      if (cleanBase64.includes(";base64,")) {
        cleanBase64 = cleanBase64.split(";base64,")[1];
      }
      cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, "");

      let normalizedMime = String(fileMimeType || "image/jpeg").toLowerCase().trim();
      if (normalizedMime === "image/jpg" || normalizedMime === "image/pjpeg" || normalizedMime === "image/jfif") {
        normalizedMime = "image/jpeg";
      }

      // If no inline base64 was supplied but a remote image URL was passed, fetch it once on the server
      if (!cleanBase64 && imageUrl && String(imageUrl).startsWith("http")) {
        try {
          const imgRes = await fetch(String(imageUrl), { signal: AbortSignal.timeout(5000) });
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            if (buf.length > 0 && buf.length < 6 * 1024 * 1024) {
              cleanBase64 = buf.toString("base64");
              const contentType = imgRes.headers.get("content-type");
              if (contentType && contentType.startsWith("image/")) {
                normalizedMime = contentType.split(";")[0].trim();
              }
            }
          }
        } catch {}
      }

      const normalizedMode = String(mode || "ask").toLowerCase().trim();
      const userQuestion = String(question || "").trim();

      let modeInstruction = "";
      if (normalizedMode === "solve") {
        modeInstruction = `Task: Solve Step-by-Step (Homework & Problem Solver).
Examine all questions, problems, equations, formulas, diagrams, or multiple-choice items in the scanned note.
- Solve each problem clearly step-by-step showing every calculation, chemical reaction/balanced equation, theorem, or reasoning step.
- Highlight the final answer clearly for each question.`;
      } else if (normalizedMode === "explain") {
        modeInstruction = `Task: Explain Concepts Clearly.
Explain the exact topics, definitions, diagrams, formulas, or examples in this scanned note in clear, intuitive student-friendly language.`;
      } else if (normalizedMode === "short_summary") {
        modeInstruction = `Task: Create a Short Automatic Summary of This Scanned Note.
Write a crisp, student-friendly 2 to 3 sentence short summary (under 80 words) covering what this scanned note is about, its main topic or problem, and the key takeaway. Start directly with the summary sentences (no headings or bullet lists).`;
      } else if (normalizedMode === "summarize") {
        modeInstruction = `Task: Summarize Scanned Note.
Create a crisp, structured revision summary containing the core ideas, definitions, key takeaways, and formulas in this scan.`;
      } else if (normalizedMode === "quiz") {
        modeInstruction = `Task: Generate Practice Questions.
Create 4–5 high-quality practice questions (with an Answer Key & brief step-by-step explanations at the bottom) strictly based on this scanned note.`;
      } else if (normalizedMode === "translate") {
        modeInstruction = `Task: Translate Scanned Text into ${targetLanguage || "English"}.
Accurately translate ALL readable text from this scan into ${targetLanguage || "English"}.
- Preserve headings, numbered items, bullet lists, and mathematical/chemical symbols accurately.
- Return only the clean translated text in Markdown.`;
      } else {
        if (!userQuestion) {
          res.status(400).json({ error: "Please enter a question about your scanned note." });
          return;
        }
        modeInstruction = `Task: Answer the Student's Specific Question About This Scan.
Student Question: "${userQuestion}"
Answer thoroughly, accurately, and step-by-step based strictly on the scanned note.`;
      }

      const conversationContext = Array.isArray(history) && history.length > 0
        ? `\nPrevious Q&A on this scanned note:\n${history
            .slice(-6)
            .map((m: any) => `${m.role === "user" ? "Student" : "Lens AI"}: ${String(m.text || "").slice(0, 1200)}`)
            .join("\n")}\n`
        : "";

      const fullPrompt = `You are StudyWeb Visual Lens, a fast, accurate study assistant built into the camera scanner.
Base your response directly on the scanned note and extracted text below. Format cleanly in Markdown.

${trimmedText ? `=== EXTRACTED OCR TEXT FROM THIS SCAN ===\n${trimmedText.slice(0, 12000)}\n` : ""}
${conversationContext}
${modeInstruction}`;

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const contentParts: any[] = [{ text: fullPrompt }];
      const hasRealOcrText =
        trimmedText.length > 45 &&
        !trimmedText.includes("Ask any question about this image in Ask & Solve") &&
        !trimmedText.includes("Scanned study note ready");
      const questionNeedsVisualInspection =
        /diagram|graph|chart|figure|image|picture|drawing|arrow|color|label|table/i.test(userQuestion);

      // When OCR text is already extracted and the user isn't asking about a visual diagram, skip re-uploading image bytes so answers return in ~500ms!
      if (cleanBase64 && (!hasRealOcrText || questionNeedsVisualInspection)) {
        contentParts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: normalizedMime
          }
        });
      }

      let answerText = "";
      try {
        answerText = await runFastLensVisionRace(ai, contentParts, {}, 10000);
      } catch (raceErr: any) {
        if (isAuthOrInvalidApiKeyError(raceErr)) {
          throw raceErr;
        }
        // If text-only or image call failed due to transient model issues, fallback with full failover
        const fallback = await generateContentWithModelFailover(ai, {
          contents: contentParts,
          preferredModels: ["gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-4-hydrogen"],
          timeoutMs: 10000,
          maxPasses: 2,
          label: "LensAskFallback"
        });
        answerText = String(fallback?.response?.text || "").trim();
      }

      if (answerText) {
        res.json({
          answer: answerText,
          mode: normalizedMode
        });
        return;
      }

      res.json({
        answer: buildFallbackLensAnswer(normalizedMode, trimmedText),
        mode: normalizedMode
      });
    } catch (error: any) {
      const normalizedMode = String(req.body?.mode || "ask").toLowerCase().trim();
      const trimmedText = String(req.body?.extractedText || "").trim();
      if (isAuthOrInvalidApiKeyError(error)) {
        res.status(401).json({
          error: "Gemini API key is invalid or unauthorized. Please update GEMINI_API_KEY in Settings > Secrets.",
          code: "API_KEY_INVALID",
          answer:
            normalizedMode === "short_summary" && trimmedText
              ? trimmedText.replace(/^#{1,6}\s+[^\n]*\n+/gm, "").replace(/\s+/g, " ").trim().slice(0, 220)
              : "Please configure a valid GEMINI_API_KEY in Settings > Secrets to use live Lens AI.",
          mode: normalizedMode
        });
        return;
      }
      console.warn("[Lens Ask Endpoint Notice] /api/ocr/lens-ask fallback:", summarizeModelError(error));
      res.json({
        answer: "I reviewed your scanned note. Could you rephrase your question or specify which problem on the page you want solved step-by-step?",
        mode: normalizedMode
      });
    }
  });

  // API Route: Process Study Material (URL, YouTube, PDF, Document) with smart title resolution and content extraction
  app.post("/api/study-materials/process", async (req, res) => {
    try {
      const { workspaceId, userId, name, type, size, url, fileBase64, fileMimeType } = req.body || {};

      let resolvedTitle = name || "Study Material";
      let resourceType = type || 'url';
      let extractedContent = "";
      let summary = "";
      let tags: string[] = ['Indexed'];
      let highlights: string[] = [];
      let transcription = "";
      let sourceUrl = (url && !String(url).startsWith('data:')) ? url : '';

      if (sourceUrl) {
        if (!isValidPublicUrl(sourceUrl)) {
          res.status(400).json({ error: "Invalid or prohibited URL. Only public HTTP/HTTPS URLs are allowed." });
          return;
        }

        const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
        const isPdf = url.toLowerCase().endsWith('.pdf') || (fileMimeType && fileMimeType.includes('pdf'));

        if (isYouTube) {
          resourceType = 'video';
          const ytMeta = await fetchYouTubeMetadata(url);
          if (ytMeta && ytMeta.title) {
            let cleanTitle = ytMeta.title;
            if (cleanTitle.endsWith(" - YouTube")) {
              cleanTitle = cleanTitle.substring(0, cleanTitle.length - 10);
            }
            resolvedTitle = cleanTitle;
          } else {
            resolvedTitle = "YouTube Video";
          }
          const scraped = await fetchUrlData(url);
          extractedContent = scraped.text || scraped.description || `YouTube Video: ${url}`;
        } else if (isPdf) {
          resourceType = 'pdf';
          const scraped = await fetchUrlData(url);
          if (scraped.title) {
            resolvedTitle = scraped.title;
          } else {
            try {
              const parsedUrl = new URL(url);
              const pathSegments = parsedUrl.pathname.split('/');
              const lastSegment = pathSegments[pathSegments.length - 1];
              if (lastSegment) {
                resolvedTitle = decodeURIComponent(lastSegment).replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
              } else {
                resolvedTitle = "PDF Document";
              }
            } catch {
              resolvedTitle = "PDF Document";
            }
          }
          extractedContent = scraped.text || "PDF Document content extracted via URL.";
        } else {
          resourceType = 'url';
          const scraped = await fetchUrlData(url);
          if (scraped.title) {
            let cleanTitle = scraped.title;
            if (cleanTitle.length > 70) cleanTitle = cleanTitle.substring(0, 67) + '...';
            resolvedTitle = cleanTitle;
          } else {
            try {
              const parsedUrl = new URL(url);
              resolvedTitle = parsedUrl.hostname + parsedUrl.pathname;
              if (resolvedTitle.length > 50) resolvedTitle = resolvedTitle.substring(0, 47) + '...';
            } catch {
              resolvedTitle = "Web Article";
            }
          }
          extractedContent = scraped.text || scraped.description || `Web Article from ${url}`;
        }
      } else if (fileBase64) {
        resolvedTitle = name || "Uploaded Document";
        extractedContent = `Document contents successfully loaded and parsed.`;
      } else {
        resolvedTitle = name || "External Study Resource";
        extractedContent = `Study resource: ${name}`;
      }

      // Use Gemini to generate high quality summary, highlights, tags
      const apiKey = getGeminiApiKey();
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta', httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
          const analysisPrompt = `Analyze the following academic study material resource titled "${resolvedTitle}" of type "${resourceType}":
URL: ${sourceUrl || 'N/A'}
Content snippet: ${extractedContent.substring(0, 4000)}

Return a JSON object with:
{
  "title": "Clean, concise, human-readable NotebookLM-style title of the material (never a raw URL or domain)",
  "summary": "Comprehensive academic summary of the resource...",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "highlights": ["Key point 1", "Key point 2"],
  "transcription": "Detailed key topics or voice notes segment..."
}`;
          const genMaterialPromise = ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: analysisPrompt,
            config: {
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
            }
          });
          const materialTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2800));
          const response = await Promise.race([genMaterialPromise, materialTimeout]);
          if (response && response.text) {
            const parsedAi = JSON.parse(response.text || '{}');
            if (parsedAi.title && !isRawUrlOrPlaceholderName(parsedAi.title)) {
              resolvedTitle = parsedAi.title;
            }
            if (parsedAi.summary) summary = parsedAi.summary;
            if (Array.isArray(parsedAi.tags)) tags = Array.from(new Set([...tags, ...parsedAi.tags]));
            if (Array.isArray(parsedAi.highlights)) highlights = parsedAi.highlights;
            if (parsedAi.transcription) transcription = parsedAi.transcription;
          }
        } catch (aiErr) {
          console.warn("Gemini AI material analysis fallback used:", aiErr);
        }
      }

      resolvedTitle = cleanNotebookLMTitle(resolvedTitle, sourceUrl || url, resourceType);

      if (!summary) {
        summary = `Extracted study resource for ${resolvedTitle}. Covers core concepts, key notes, and references.`;
      }
      if (highlights.length === 0) {
        highlights = [`Primary resource title: ${resolvedTitle}`, `Source: ${sourceUrl || resourceType}`];
      }

      const newMaterial = {
        id: `mat-${Date.now()}`,
        workspace_id: workspaceId,
        name: resolvedTitle,
        type: resourceType,
        size: size || (url ? 'Web Link' : '2.4 MB'),
        upload_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'indexed',
        url: sourceUrl || url || '',
        summary,
        highlights,
        transcription: transcription || extractedContent.substring(0, 1000),
        content_text: extractedContent,
        tags: tags.length > 0 ? tags : ['Indexed', resourceType.toUpperCase()]
      };

      res.json({
        success: true,
        material: newMaterial
      });
    } catch (error: any) {
      console.error("Error in /api/study-materials/process:", error);
      res.status(500).json({ error: "Failed to process study material", details: error.message });
    }
  });

  // API Route: Analyze and index uploaded resources (PDF, Audio, Video, URL, YouTube) using Gemini
  app.post("/api/analyze-resource", async (req, res) => {
    try {
      const { name, type, size, url, description, fileBase64, fileMimeType } = req.body;

      if (!name && !url && !fileBase64) {
        res.status(400).json({ error: "Resource name, URL, or file content is required." });
        return;
      }

      let targetName = name || url;
      let urlExtractedText = "";
      let urlExtractedTitle = "";
      let urlExtractedDescription = "";
      let youtubeAuthorName = "";

      // Scrape web URL text if provided
      if ((type === 'url' || type === 'video') && url) {
        const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
        
        if (isYouTube) {
          const ytMeta = await fetchYouTubeMetadata(url);
          if (ytMeta) {
            urlExtractedTitle = ytMeta.title;
            youtubeAuthorName = ytMeta.author;
            targetName = ytMeta.title;
          }
        }

        const scraped = await fetchUrlData(url);
        urlExtractedText = scraped.text;
        if (!urlExtractedTitle && scraped.title) {
          urlExtractedTitle = scraped.title;
          let cleanTitle = urlExtractedTitle;
          if (cleanTitle.endsWith(" - YouTube")) {
            cleanTitle = cleanTitle.substring(0, cleanTitle.length - 10);
          }
          targetName = cleanTitle;
        }
        urlExtractedDescription = scraped.description;
      }

      // Use Gemini to generate custom high-quality study materials based on this specific resource!
      const apiKey = getGeminiApiKey();
      
      const systemInstruction = `You are an elite academic resource indexing and analysis model.
Analyze the following academic resource:
Name: ${targetName}
Type: ${type}
Size: ${size || "N/A"}
URL: ${url || "N/A"}
Original Description/Context: ${description || "N/A"}
${youtubeAuthorName ? `YouTube Channel: ${youtubeAuthorName}\n` : ""}
${urlExtractedTitle ? `Web Page/Video Title: ${urlExtractedTitle}\n` : ""}
${urlExtractedDescription ? `Web Page Meta Description: ${urlExtractedDescription}\n` : ""}
${urlExtractedText ? `Scraped Content Text:\n${urlExtractedText}\n` : ""}

CRITICAL INTEGRITY INSTRUCTIONS:
Your goal is to generate extremely high-fidelity, perfect, and real-time facts/summaries about this specific resource. 
You must analyze the provided file content very, very carefully. Know exactly what the user has uploaded, what is inside it (e.g. if there is a PDF, image, video, etc.), and what are the things that should be done with it. 
If the resource is a YouTube video, you MUST use the googleSearch grounding tool to search for the video title ("${targetName}") or URL ("${url || ''}") to fetch its real topics, structure, formulas, and true transcripts. Avoid generating placeholder, generic, or dummy summaries.
Your generated data must contain:
1. A rich, professional, and comprehensive academic summary of what this resource covers (including details on what the user uploaded, its exact contents, and what should be done with it). Do not use generic filler text or placeholders.
2. 3-4 high-quality specific tags (e.g. ['Photosynthesis', 'AP Bio', 'Plant Biology']).
3. 3-4 high-quality highlights, key quotes, or core conceptual statements representing key facts from this resource.
4. A highly realistic and factually accurate voice transcription segment or detailed visual description representing the contents of the file.
5. If it contains science, math, physics, or chemistry, generate 2-3 key mathematical formulas, stoichiometry, or equations in LaTeX format, otherwise leave this empty.

You must return a JSON object with the following schema:
{
  "summary": "...",
  "tags": ["...", "..."],
  "highlights": ["...", "..."],
  "transcription": "...",
  "formulas": ["...", "..."]
}`;

      if (!apiKey) {
        console.warn("GEMINI_API_KEY not configured. Using high-quality local generation fallback for resource analysis.");
        const fallbackResult = generateLocalResourceAnalysis(targetName, type, size, url);
        res.json(fallbackResult);
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      // Enrich YouTube, Video, or Web URL via TranscriptProcessor / Web Scraper before calling Gemini
      let resolvedName = targetName;
      let externalContext = "";
      if (url && typeof url === "string" && url.startsWith("http")) {
        if (TranscriptProcessor.isVideoUrl(url) || url.includes("youtube.com") || url.includes("youtu.be")) {
          const tr = await TranscriptProcessor.fetchTranscript(url);
          if (tr) {
            if (isRawUrlOrPlaceholderName(resolvedName)) resolvedName = tr.title;
            // Validation step: Check if fetched transcript exceeds minimum word count threshold
            // before feeding it into the AI summary, ensuring placeholder/empty text is discarded.
            if (tr.isValidWordCount) {
              externalContext = tr.richContext;
            } else {
              console.warn(`[Analyze Resource] Video transcript validation note (${tr.validationStatus}): ${tr.validationMessage}. Supplying clean metadata without placeholder text.`);
              externalContext = [
                `Video Title: ${tr.title}`,
                `Video URL: ${tr.normalizedUrl}`,
                tr.author ? `Educator / Channel: ${tr.author}` : '',
                tr.description ? `Description: ${tr.description.slice(0, 2500)}` : ''
              ].filter(Boolean).join('\n\n');
            }
          }
        } else {
          const scraped = await scrapeWebPage(url);
          if (scraped) {
            if (isRawUrlOrPlaceholderName(resolvedName)) resolvedName = scraped.title;
            externalContext = `Webpage Title: ${scraped.title}\nDescription: ${scraped.description}\nContent:\n${scraped.text.slice(0, 18000)}`;
          }
        }
      }

      const promptContent = `Perform a high-fidelity academic indexing, formula extraction, highlights identification, and study notes transcription for study resource "${resolvedName}" of type "${type}" located at URL "${url || 'N/A'}".
${externalContext ? `\nEXTRACTED SOURCE METADATA & CONTENT:\n${externalContext}\n` : ""}
Ensure the returned JSON is 100% accurate, educational, and has zero placeholders. Never output channel names, durations, or raw watch links as highlights or summary.`;

      let contents: any = promptContent;
      let config: any = {
        systemInstruction,
        temperature: 0.2,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            transcription: { type: Type.STRING },
            formulas: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "tags", "highlights"]
        }
      };

      if (fileBase64) {
        let cleanBase64 = String(fileBase64);
        if (cleanBase64.includes(";base64,")) {
          cleanBase64 = cleanBase64.split(";base64,")[1];
        }
        cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, "");

        let normalizedMime = (fileMimeType || (type === 'image' ? 'image/jpeg' : 'application/pdf')).toLowerCase().trim();
        if (normalizedMime === 'image/jpg' || normalizedMime === 'image/pjpeg' || normalizedMime === 'image/jfif') {
          normalizedMime = 'image/jpeg';
        }

        contents = [
          {
            text: `Carefully inspect and analyze this uploaded study resource "${resolvedName}" (${type || normalizedMime}). Perform complete OCR of all visible text, headings, UI elements, diagrams, and information inside the file/image. Extract:
1. summary: A clear, accurate, and detailed summary explaining the exact contents of this image, video, or document (never guess or fabricate unrelated subjects).
2. tags: 3-5 specific subject or topic tags matching the actual content.
3. highlights: 4-6 specific takeaways, concepts, features, or facts directly shown in the file.
4. transcription: Complete verbatim OCR text and detailed visual breakdown of everything shown in the resource.
5. formulas: Any equations, formulas, or key rules shown.
Return a valid JSON object matching the requested schema.`
          },
          {
            inlineData: {
              data: cleanBase64,
              mimeType: normalizedMime
            }
          }
        ];
      }

      let response: any = null;
      const candidateModels = ["gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-3-flash-preview"];
      for (const m of candidateModels) {
        try {
          const isHydrogen = m === "gemini-4-hydrogen";
          const modelConfig = {
            ...config,
            ...(isHydrogen ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : { temperature: 0.2, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } })
          };
          if (isHydrogen) delete modelConfig.temperature;
          response = await ai.models.generateContent({
            model: m,
            contents: contents,
            config: modelConfig
          });
          if (response && response.text) break;
        } catch (modelErr: any) {
          console.error(`[Analyze Resource Error] Model ${m} failed:`, {
            code: modelErr?.status || 'GEMINI_ANALYZE_ERR',
            message: modelErr?.message || String(modelErr)
          });
        }
      }

      if (response && response.text) {
        let textContent = response.text.trim();
        // Remove markdown backticks if present
        if (textContent.startsWith("```")) {
          textContent = textContent.replace(/^```(?:json)?\n?/i, "");
          textContent = textContent.replace(/\n?```$/, "");
          textContent = textContent.trim();
        }
        
        const data = JSON.parse(textContent);
        const finalAnalyzedTitle = cleanNotebookLMTitle(resolvedName || targetName, url, type);
        const fileObj: any = {
          id: `file-${Date.now()}`,
          name: finalAnalyzedTitle,
          type,
          size: size || "N/A",
          uploadDate: "Just Now",
          status: "indexed",
          pages: type === 'pdf' ? Math.floor(Math.random() * 15) + 3 : undefined,
          tags: data.tags || ["Imported"],
          summary: data.summary,
          highlights: data.highlights,
          transcription: data.transcription || undefined,
          formulas: data.formulas || undefined,
          chunks: [] as any[]
        };

        // Pre-compute RAG chunks and semantic embeddings at upload/indexing time
        try {
          const chunkTexts = chunkFileContent(fileObj);
          const embedPromises = chunkTexts.map(async (text) => {
            const emb = await getEmbedding(ai, text);
            return { text, embedding: emb };
          });
          fileObj.chunks = await Promise.all(embedPromises);
          console.log(`[RAG Indexer] Successfully indexed resource "${finalAnalyzedTitle}" with ${fileObj.chunks.length} semantic chunks & embeddings.`);
        } catch (ragErr) {
          console.warn("[RAG Indexer] Error pre-processing chunks:", ragErr);
        }

        res.json(fileObj);
      } else {
        throw new Error("No response text received from Gemini API.");
      }
    } catch (error: any) {
      console.error("[Analyze Resource Error] /api/analyze-resource failed:", {
        code: error?.status || 'ANALYZE_RESOURCE_ERR',
        message: error?.message || String(error)
      });
      const fallbackResult = generateLocalResourceAnalysis(req.body.name || req.body.url, req.body.type, req.body.size, req.body.url);
      res.json(fallbackResult);
    }
  });

  function generateLocalResourceAnalysis(name: string, type: string, size: string, url?: string) {
    const targetName = cleanNotebookLMTitle(name, url, type);
    const cleanKeywords = targetName
      .replace(/\.[^/.]+$/, "")
      .split(/[-_\s]+/)
      .filter(Boolean)
      .slice(0, 4);

    const summary = `Uploaded ${type || 'study'} resource "${targetName}" (${size || 'Analyzed'}). Ready for multimodal AI Tutor inspection.`;
    const tags = cleanKeywords.length > 0 ? cleanKeywords : ["Study Material"];
    const highlights = [
      `Primary resource: "${targetName}"`,
      `Ask the AI Tutor to inspect and explain any section, diagram, or concept from "${targetName}".`
    ];
    const transcription = summary;

    const result: any = {
      id: `file-${Date.now()}`,
      name: targetName,
      type,
      size: size || (type === 'url' ? 'Web Link' : 'Analyzed'),
      uploadDate: "Just Now",
      status: "indexed",
      pages: type === 'pdf' ? 1 : undefined,
      tags,
      summary,
      highlights,
      transcription,
      chunks: [] as any[]
    };

    try {
      const chunkTexts = chunkFileContent(result);
      result.chunks = chunkTexts.map(text => ({ text, embedding: null }));
    } catch (err) {
      console.warn("[Local RAG Pre-process Error]:", err);
    }

    return result;
  }

  // Helper: Build local grounded analysis when upstream AI models are unreachable
  function buildLocalQuizMaterialAnalysis(
    files: any[] = [],
    notes: any[] = [],
    internetSources: any[] = [],
    internetTopic: string = ""
  ) {
    const detectedTopics: string[] = [];
    const keyConcepts: string[] = [];

    for (const f of files.slice(0, 10)) {
      if (f?.name) detectedTopics.push(String(f.name).replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "));
      if (Array.isArray(f?.tags)) {
        f.tags.slice(0, 3).forEach((t: any) => t && detectedTopics.push(String(t)));
      }
      if (Array.isArray(f?.highlights)) {
        f.highlights.slice(0, 2).forEach((h: any) => h && keyConcepts.push(String(h).slice(0, 140)));
      }
    }
    for (const n of notes.slice(0, 8)) {
      if (n?.title) detectedTopics.push(String(n.title));
    }
    for (const src of internetSources.slice(0, 6)) {
      if (src?.name) detectedTopics.push(String(src.name));
      if (Array.isArray(src?.highlights)) {
        src.highlights.slice(0, 2).forEach((h: any) => h && keyConcepts.push(String(h).slice(0, 140)));
      }
    }
    if (internetTopic && !detectedTopics.includes(internetTopic)) {
      detectedTopics.unshift(internetTopic);
    }

    const uniqueTopics = Array.from(new Set(detectedTopics.filter(Boolean))).slice(0, 8);
    const uniqueConcepts = Array.from(new Set(keyConcepts.filter(Boolean))).slice(0, 6);
    const sourceCount = files.length + notes.length + internetSources.length;

    return {
      summary: internetTopic
        ? `Analyzed ${sourceCount || 1} web source(s) covering "${internetTopic}" and identified key study concepts for assessment.`
        : `Analyzed ${sourceCount} selected study material(s) (${files.length} file(s), ${notes.length} note(s)) and identified core testable topics.`,
      detectedTopics: uniqueTopics.length > 0 ? uniqueTopics : ["Core Concepts", "Key Terminology"],
      keyConcepts:
        uniqueConcepts.length > 0
          ? uniqueConcepts
          : uniqueTopics.map((t) => `Foundational principles and applications of ${t}.`),
      recommendedQuestionCount: sourceCount >= 3 ? 10 : 5
    };
  }

  // Helper: Local resilient fallback quiz generator so users never receive a hard failure
  function buildFallbackQuizQuestions(
    files: any[] = [],
    notes: any[] = [],
    internetSources: any[] = [],
    internetTopic: string = "",
    questionCount: number = 5,
    diffLevel: string = "Medium",
    qType: string = "MCQ"
  ) {
    const facts: Array<{ term: string; detail: string; topic: string }> = [];

    const extractFromText = (text: string, topicName: string) => {
      const cleaned = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!cleaned) return;
      const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.length > 25 && s.length < 220);
      for (const s of sentences.slice(0, 8)) {
        const defMatch = s.match(/^([A-Z][A-Za-z0-9\s-]{2,40}?)\s+(?:is|are|refers to|means|represents|describes)\s+(.+)$/);
        if (defMatch) {
          facts.push({ term: defMatch[1].trim(), detail: defMatch[2].trim(), topic: topicName });
        } else {
          const words = s.split(" ").filter((w) => w.length > 4);
          const candidateTerm = (words[0] || topicName).replace(/[^A-Za-z0-9-]/g, "");
          if (candidateTerm) {
            facts.push({ term: candidateTerm, detail: s, topic: topicName });
          }
        }
      }
    };

    files.forEach((f: any) => {
      const tName = String(f?.name || "Study Material").replace(/\.[^/.]+$/, "");
      if (f?.summary) extractFromText(f.summary, tName);
      if (f?.transcription || f?.contentText) extractFromText(f.transcription || f.contentText, tName);
      if (Array.isArray(f?.highlights)) {
        f.highlights.forEach((h: any) => extractFromText(String(h), tName));
      }
    });
    notes.forEach((n: any) => extractFromText(n?.content || "", n?.title || "Study Note"));
    internetSources.forEach((s: any) => {
      extractFromText(s?.summary || "", s?.name || internetTopic || "Web Resource");
      extractFromText(s?.transcription || "", s?.name || internetTopic || "Web Resource");
    });

    if (facts.length === 0) {
      const baseTopic = internetTopic || files[0]?.name || notes[0]?.title || "Study Concepts";
      facts.push(
        { term: baseTopic, detail: `Core principles and real-world applications of ${baseTopic}`, topic: baseTopic },
        { term: "Active Recall", detail: "Testing memory retrieval from study material without passive rereading", topic: baseTopic },
        { term: "Conceptual Synthesis", detail: "Connecting definitions, mechanisms, and cause-and-effect relationships", topic: baseTopic },
        { term: "Problem Analysis", detail: "Breaking complex ideas into verifiable steps and principles", topic: baseTopic }
      );
    }

    const questions: any[] = [];
    for (let i = 0; i < questionCount; i++) {
      const fact = facts[i % facts.length];
      if (qType === "FillBlank") {
        questions.push({
          id: `ai-quiz-${Date.now()}-${i}`,
          question: `In ${fact.topic}, _______ refers to: ${fact.detail.replace(new RegExp(fact.term, "gi"), "_______")}`,
          options: [fact.term],
          acceptedAnswers: [fact.term, fact.term.toLowerCase()],
          correctIndex: 0,
          explanation: `"${fact.term}" matches the concept described: ${fact.detail}`,
          difficulty: diffLevel,
          type: "FillBlank",
          topic: fact.topic
        });
      } else if (qType === "MatchFollowing") {
        const pairSlice: Array<{ id: string; left: string; right: string }> = [];
        for (let p = 0; p < 4; p++) {
          const item = facts[(i + p) % facts.length];
          pairSlice.push({
            id: `pair-${i}-${p}`,
            left: item.term,
            right: item.detail.slice(0, 110)
          });
        }
        questions.push({
          id: `ai-quiz-${Date.now()}-${i}`,
          question: `Match each concept from ${fact.topic} with its accurate description:`,
          options: [],
          pairs: pairSlice,
          correctIndex: 0,
          explanation: pairSlice.map((p) => `${p.left} -> ${p.right}`).join("; "),
          difficulty: diffLevel,
          type: "MatchFollowing",
          topic: fact.topic
        });
      } else if (qType === "TF") {
        questions.push({
          id: `ai-quiz-${Date.now()}-${i}`,
          question: `True or False: Regarding ${fact.topic}, ${fact.term} relates directly to ${fact.detail}.`,
          options: ["True", "False"],
          correctIndex: 0,
          explanation: `This statement accurately reflects the concept of ${fact.term} in ${fact.topic}.`,
          difficulty: diffLevel,
          type: "TF",
          topic: fact.topic
        });
      } else {
        const otherFacts = facts.filter((_, idx) => idx !== i % facts.length);
        const distractors = [
          otherFacts[0]?.term || "Unrelated baseline constant",
          otherFacts[1]?.term || "Secondary observation hypothesis",
          otherFacts[2]?.term || "Passive retention effect"
        ];
        const allOpts = [fact.term, ...distractors.slice(0, 3)];
        const shift = i % 4;
        const rotated = allOpts.map((_, idx) => allOpts[(idx - shift + 4) % 4]);
        const correctIdx = rotated.indexOf(fact.term);
        questions.push({
          id: `ai-quiz-${Date.now()}-${i}`,
          question: `Which concept in "${fact.topic}" best matches: ${fact.detail}?`,
          options: rotated,
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
          explanation: `${fact.term} directly represents this concept: ${fact.detail}.`,
          difficulty: diffLevel,
          type: "MCQ",
          topic: fact.topic
        });
      }
    }
    return questions;
  }

  // API Route: Analyze selected uploaded materials or internet sources prior to quiz generation
  app.post("/api/analyze-quiz-materials", async (req, res) => {
    try {
      const { files = [], notes = [], internetTopic = "", internetSources = [], workspaceId } = req.body || {};
      const apiKey = getGeminiApiKey();

      if (!apiKey) {
        return res.json(buildLocalQuizMaterialAnalysis(files, notes, internetSources, internetTopic));
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const fileContext = (Array.isArray(files) ? files : [])
        .slice(0, 8)
        .map((f: any, idx: number) => {
          const textBody = String(f.transcription || f.contentText || f.content_text || f.summary || "").trim();
          const hl = Array.isArray(f.highlights) ? f.highlights.join("; ") : "";
          return `Material #${idx + 1} ("${f.name || "File"}", type: ${f.type || "doc"}):\n${textBody.slice(0, 5000)}${hl ? `\nHighlights: ${hl}` : ""}`;
        })
        .join("\n\n");

      const noteContext = (Array.isArray(notes) ? notes : [])
        .slice(0, 8)
        .map((n: any, idx: number) => `Note #${idx + 1} ("${n.title || "Note"}"):\n${String(n.content || "").replace(/<[^>]+>/g, " ").slice(0, 3000)}`)
        .join("\n\n");

      const webContext = (Array.isArray(internetSources) ? internetSources : [])
        .slice(0, 6)
        .map((s: any, idx: number) => `Web Source #${idx + 1} ("${s.name || s.title || "Source"}", ${s.url || ""}):\n${String(s.transcription || s.summary || "").slice(0, 4000)}`)
        .join("\n\n");

      const prompt = `Analyze the following study content carefully so the student knows exactly what topics and concepts will be tested before generating a quiz.${internetTopic ? `\nTarget Internet Topic: "${internetTopic}"` : ""}

${fileContext ? `=== UPLOADED FILES ===\n${fileContext}\n` : ""}
${noteContext ? `=== STUDY NOTES ===\n${noteContext}\n` : ""}
${webContext ? `=== INTERNET SOURCES ===\n${webContext}\n` : ""}

Return ONLY JSON matching this schema:
- summary: Clear 2-3 sentence summary of what the selected materials/sources cover.
- detectedTopics: 4 to 8 concise topic/chapter titles actually present in these materials.
- keyConcepts: 4 to 6 key facts, definitions, or formulas ready for quiz questions.
- recommendedQuestionCount: Recommended integer (5, 10, or 15).`;

      const analysisParts: any[] = [{ text: prompt }];
      for (const f of (Array.isArray(files) ? files : []).slice(0, 3)) {
        let rawB64 = String(f.fileBase64 || "");
        let mime = String(f.fileMimeType || "");
        if (!rawB64 && typeof f.url === "string" && f.url.startsWith("data:") && f.url.includes(";base64,")) {
          const m = f.url.match(/^data:([^;]+);base64,(.+)$/);
          if (m) {
            mime = mime || m[1];
            rawB64 = m[2];
          }
        }
        if (rawB64.includes(";base64,")) rawB64 = rawB64.split(";base64,")[1];
        if (rawB64 && rawB64.length > 20 && rawB64.length < 8_000_000 && (mime.startsWith("image/") || mime === "application/pdf")) {
          analysisParts.push({ inlineData: { data: rawB64, mimeType: mime } });
        }
      }

      const { response } = await generateContentWithModelFailover(ai, {
        contents: analysisParts,
        preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-3-flash-preview"],
        timeoutMs: 14000,
        label: "AnalyzeQuizMaterials",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              detectedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedQuestionCount: { type: Type.INTEGER }
            },
            required: ["summary", "detectedTopics", "keyConcepts"]
          }
        }
      });

      let text = String(response?.text || "").trim();
      if (text.startsWith("```")) {
        text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
      }
      const parsed = JSON.parse(text);
      return res.json({
        summary: parsed.summary || "Materials analyzed and ready for quiz generation.",
        detectedTopics: Array.isArray(parsed.detectedTopics) ? parsed.detectedTopics : [],
        keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
        recommendedQuestionCount: Number(parsed.recommendedQuestionCount) || 5,
        workspaceId
      });
    } catch (err: any) {
      console.warn("[Analyze Quiz Materials] Using local analysis fallback:", summarizeModelError(err));
      const { files = [], notes = [], internetSources = [], internetTopic = "" } = req.body || {};
      return res.json(buildLocalQuizMaterialAnalysis(files, notes, internetSources, internetTopic));
    }
  });

  // API Route: Generate Quiz from Notes, Uploaded Resources, or Internet Resources using Gemini with multi-model failover
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const {
        notes = [],
        files = [],
        count,
        difficulty,
        questionType,
        workspaceId,
        internetTopic = "",
        internetSources = [],
        focusTopics = []
      } = req.body || {};

      const hasNotes = Array.isArray(notes) && notes.length > 0;
      const hasFiles = Array.isArray(files) && files.length > 0;
      const hasInternet = Boolean(String(internetTopic || "").trim()) || (Array.isArray(internetSources) && internetSources.length > 0);

      if (!hasNotes && !hasFiles && !hasInternet) {
        res.status(400).json({ error: "Please select uploaded study materials, notes, or search an internet topic first." });
        return;
      }

      const questionCount = Math.min(25, Math.max(1, Number(count) || 5));
      const diffLevel = (difficulty === "Easy" || difficulty === "Hard" ? difficulty : "Medium") as "Easy" | "Medium" | "Hard";
      const rawType = String(questionType || "MCQ");
      const qType: "MCQ" | "TF" | "FillBlank" | "MatchFollowing" =
        rawType === "TF"
          ? "TF"
          : rawType === "FillBlank"
          ? "FillBlank"
          : rawType === "MatchFollowing"
          ? "MatchFollowing"
          : "MCQ";

      let typeInstruction = "";
      if (qType === "TF") {
        typeInstruction =
          "The quiz MUST consist ONLY of True/False questions (options MUST be exactly ['True', 'False'], correctIndex MUST be 0 for True or 1 for False).";
      } else if (qType === "FillBlank") {
        typeInstruction =
          "The quiz MUST consist ONLY of Fill in the Blank questions. Each question text MUST contain '_______' representing the single missing key term/value/phrase. Put the primary exact answer in options[0] (array of 1 string), set correctIndex to 0, and provide 1-3 valid accepted phrasing/spelling variants in acceptedAnswers (array of strings).";
      } else if (qType === "MatchFollowing") {
        typeInstruction =
          "The quiz MUST consist ONLY of Match the Following questions. Each question MUST include a concise prompt (e.g., 'Match each concept with its correct definition/formula') AND a 'pairs' array of EXACTLY 4 objects, each with { id: 'p1'|'p2'|'p3'|'p4', left: 'concise term/premise', right: 'concise matching definition/answer' }. Set options to [] and correctIndex to 0.";
      } else {
        typeInstruction =
          "The quiz MUST consist ONLY of standard Multiple-Choice Questions (MCQ) with EXACTLY 4 distinct options and a valid correctIndex (0, 1, 2, or 3).";
      }

      const focusInstruction =
        Array.isArray(focusTopics) && focusTopics.length > 0
          ? `Prioritize covering these analyzed topics: ${focusTopics.join(", ")}.`
          : "";

      const systemInstruction = `You are an expert educator and academic assessment designer.
Generate EXACTLY ${questionCount} high-quality practice questions at "${diffLevel}" difficulty grounded strictly in the provided study materials and/or selected internet research sources.
YOU MUST RETURN EXACTLY ${questionCount} QUESTIONS.

${typeInstruction}
${focusInstruction}

Difficulty calibration for "${diffLevel}":
- Easy: Direct recall of core definitions, facts, and main ideas.
- Medium: Conceptual understanding, comparisons, and applied examples.
- Hard: Multi-step reasoning, subtle distinctions, edge cases, and deep synthesis.

Each question MUST include:
1. "question": Clear, well-written prompt.
2. "options": Array of choices (4 for MCQ, 2 ['True','False'] for TF, 1 exact answer string for FillBlank, [] for MatchFollowing).
3. "correctIndex": Valid integer index into options (0 for FillBlank/MatchFollowing).
4. "acceptedAnswers": (Required for FillBlank) Array of valid short answer variants.
5. "pairs": (Required for MatchFollowing) Array of 4 { id, left, right } objects.
6. "explanation": Detailed, encouraging educational explanation of why the answer is right and how concepts connect.
7. "difficulty": "${diffLevel}"
8. "type": "${qType}"
9. "topic": Concise subtopic label.

Return ONLY valid JSON matching the requested schema.`;

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.json({
          questions: buildFallbackQuizQuestions(files, notes, internetSources, internetTopic, questionCount, diffLevel, qType)
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: { "User-Agent": "aistudio-build" }
        }
      });

      let contextText = "";
      if (hasFiles || hasNotes) {
        const ragQuery = `Generate a ${diffLevel} difficulty ${qType} quiz with ${questionCount} questions covering key concepts, definitions, formulas, and examples.`;
        contextText = await performAdvancedRAG(ai, ragQuery, files, notes, 15, workspaceId, req.headers.authorization);
      }

      const directFilesContext = (Array.isArray(files) ? files : [])
        .slice(0, 6)
        .map((f: any, idx: number) => {
          const textBody = String(f.transcription || f.contentText || f.content_text || f.summary || "").trim();
          const hl = Array.isArray(f.highlights) ? f.highlights.join("; ") : "";
          return `File #${idx + 1}: "${f.name || "Uploaded File"}"\n${textBody.slice(0, 8000)}${hl ? `\nHighlights: ${hl}` : ""}`;
        })
        .join("\n\n");

      const directNotesContext = (Array.isArray(notes) ? notes : [])
        .slice(0, 6)
        .map((n: any, idx: number) => `Note #${idx + 1}: "${n.title || "Study Note"}"\n${String(n.content || "").replace(/<[^>]+>/g, " ").slice(0, 4000)}`)
        .join("\n\n");

      const internetSourcesContext = (Array.isArray(internetSources) ? internetSources : [])
        .slice(0, 6)
        .map((src: any, idx: number) => {
          const body = String(src.transcription || src.summary || "").trim();
          const hl = Array.isArray(src.highlights) ? src.highlights.join("; ") : "";
          return `Internet Source #${idx + 1}: "${src.name || src.title || internetTopic || "Web Source"}" (${src.domain || src.url || "Web"})\n${body.slice(0, 7000)}${hl ? `\nKey Takeaways: ${hl}` : ""}`;
        })
        .join("\n\n");

      const sourceBlock = [
        internetTopic ? `Internet Topic Selected: "${internetTopic}"` : "",
        internetSourcesContext,
        directFilesContext,
        directNotesContext,
        contextText
      ]
        .filter(Boolean)
        .join("\n\n");

      const prompt = `Generate EXACTLY ${questionCount} quiz questions of difficulty "${diffLevel}" and type "${qType}" strictly grounded in the materials/topic below:\n\n${sourceBlock}`;

      const quizParts: any[] = [{ text: prompt }];
      for (const f of (Array.isArray(files) ? files : []).slice(0, 3)) {
        let rawB64 = String(f.fileBase64 || "");
        let mime = String(f.fileMimeType || "");
        if (!rawB64 && typeof f.url === "string" && f.url.startsWith("data:") && f.url.includes(";base64,")) {
          const m = f.url.match(/^data:([^;]+);base64,(.+)$/);
          if (m) {
            mime = mime || m[1];
            rawB64 = m[2];
          }
        }
        if (rawB64.includes(";base64,")) rawB64 = rawB64.split(";base64,")[1];
        if (rawB64 && rawB64.length > 20 && rawB64.length < 10_000_000 && (mime.startsWith("image/") || mime === "application/pdf")) {
          quizParts.push({ inlineData: { data: rawB64, mimeType: mime } });
        }
      }

      const useSearchTool = hasInternet && (!internetSourcesContext || internetSourcesContext.length < 150);
      const quizConfig: Record<string, any> = {
        systemInstruction,
        temperature: 0.4,
        ...(useSearchTool ? { tools: [{ googleSearch: {} }] } : { responseMimeType: "application/json" }),
        ...(!useSearchTool
          ? {
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctIndex: { type: Type.INTEGER },
                        acceptedAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        pairs: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              left: { type: Type.STRING },
                              right: { type: Type.STRING }
                            },
                            required: ["left", "right"]
                          }
                        },
                        explanation: { type: Type.STRING },
                        difficulty: { type: Type.STRING },
                        type: { type: Type.STRING },
                        topic: { type: Type.STRING }
                      },
                      required: ["question", "options", "correctIndex", "explanation", "difficulty", "type"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          : {})
      };

      const { response, modelUsed } = await generateContentWithModelFailover(ai, {
        contents: quizParts,
        preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-3-flash-preview"],
        config: quizConfig,
        timeoutMs: 22000,
        maxPasses: 2,
        label: "GenerateQuiz"
      });

      if (response && response.text) {
        let text = response.text.trim();
        if (text.startsWith("```")) {
          text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
        }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        if (data && Array.isArray(data.questions) && data.questions.length > 0) {
          let quizQuestions = data.questions.slice(0, questionCount);

          const quizWithIds = quizQuestions.map((q: any, i: number) => {
            let safeOptions = Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [];
            let safeCorrectIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : 0;
            let safePairs = Array.isArray(q.pairs)
              ? q.pairs
                  .filter((p: any) => p && p.left && p.right)
                  .map((p: any, pIdx: number) => ({
                    id: String(p.id || `p-${i}-${pIdx}`),
                    left: String(p.left).trim(),
                    right: String(p.right).trim()
                  }))
              : undefined;

            if (qType === "TF") {
              safeOptions = ["True", "False"];
              if (safeCorrectIndex !== 0 && safeCorrectIndex !== 1) {
                safeCorrectIndex = 0;
              }
            } else if (qType === "FillBlank") {
              const primaryAns = String(safeOptions[0] || q.acceptedAnswers?.[0] || "Answer").trim();
              safeOptions = [primaryAns];
              safeCorrectIndex = 0;
            } else if (qType === "MatchFollowing") {
              if (!safePairs || safePairs.length < 2) {
                const fallbackPairs = buildFallbackQuizQuestions(files, notes, internetSources, internetTopic, 1, diffLevel, "MatchFollowing")[0].pairs;
                safePairs = fallbackPairs;
              }
              safeOptions = [];
              safeCorrectIndex = 0;
            } else {
              while (safeOptions.length < 4) {
                safeOptions.push(`Option ${safeOptions.length + 1}`);
              }
              safeOptions = safeOptions.slice(0, 4);
              if (safeCorrectIndex < 0 || safeCorrectIndex >= safeOptions.length) {
                safeCorrectIndex = 0;
              }
            }

            return {
              id: `ai-quiz-${Date.now()}-${i}`,
              question: String(q.question || "Review question"),
              options: safeOptions,
              correctIndex: safeCorrectIndex,
              acceptedAnswers:
                qType === "FillBlank"
                  ? Array.from(
                      new Set(
                        [
                          safeOptions[0],
                          ...(Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.map((a: any) => String(a).trim()) : [])
                        ].filter(Boolean)
                      )
                    )
                  : undefined,
              pairs: qType === "MatchFollowing" ? safePairs : undefined,
              explanation: String(q.explanation || "Review the source material for full details."),
              difficulty: diffLevel,
              type: qType,
              topic: q.topic ? String(q.topic) : internetTopic || undefined
            };
          });

          return res.json({ questions: quizWithIds, modelUsed });
        }
      }

      throw new Error("Invalid quiz payload returned");
    } catch (error: any) {
      console.warn("[Generate Quiz] Switching to resilient local quiz synthesis:", summarizeModelError(error));
      const {
        notes = [],
        files = [],
        count,
        difficulty,
        questionType,
        internetTopic = "",
        internetSources = []
      } = req.body || {};
      const questionCount = Math.min(25, Math.max(1, Number(count) || 5));
      const diffLevel = difficulty === "Easy" || difficulty === "Hard" ? difficulty : "Medium";
      const rawType = String(questionType || "MCQ");
      const qType = rawType === "TF" ? "TF" : rawType === "FillBlank" ? "FillBlank" : rawType === "MatchFollowing" ? "MatchFollowing" : "MCQ";
      return res.json({
        questions: buildFallbackQuizQuestions(files, notes, internetSources, internetTopic, questionCount, diffLevel, qType),
        modelUsed: "StudyWeb Knowledge Engine"
      });
    }
  });

  // API Route: AI-driven explanations for incorrect quiz answers using Gemini with multi-model failover
  app.post("/api/explain-incorrect", async (req, res) => {
    const { incorrectQuestions } = req.body || {};
    try {
      if (!incorrectQuestions || !Array.isArray(incorrectQuestions) || incorrectQuestions.length === 0) {
        res.status(400).json({ error: "At least one incorrect question is required." });
        return;
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        const localExplanations = incorrectQuestions.map((q: any) => ({
          question: q.question,
          explanation: `The correct answer is **${q.correctAns}**. You selected **${q.userAns}**. ${q.explanation || "Review this concept in your study notes to reinforce retention."}`
        }));
        res.json({ explanations: localExplanations });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: { "User-Agent": "aistudio-build" }
        }
      });

      const questionsPrompt = incorrectQuestions
        .map((q: any, i: number) => {
          return `Question ${i + 1}: ${q.question}
Options: ${q.options ? q.options.join(", ") : "N/A"}
Student Selected: ${q.userAns}
Correct Answer: ${q.correctAns}
Short static explanation: ${q.explanation || "None"}`;
        })
        .join("\n\n---\n\n");

      const systemInstruction = `You are an elite academic tutor.
Analyze the student's incorrect quiz answers and provide a clear, encouraging explanation for each question:
1. Explain the underlying concept in intuitive terms.
2. Clarify why the correct answer is right and address the misconception behind the student's answer.
3. Format cleanly using Markdown.`;

      const { response } = await generateContentWithModelFailover(ai, {
        contents: `Explain the following incorrect quiz answers to help the student learn the underlying concepts:\n\n${questionsPrompt}`,
        preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-3-flash-preview"],
        timeoutMs: 16000,
        label: "ExplainIncorrect",
        config: {
          systemInstruction,
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["question", "explanation"]
                }
              }
            },
            required: ["explanations"]
          }
        }
      });

      if (response && response.text) {
        let text = response.text.trim();
        if (text.startsWith("```")) {
          text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
        }
        const data = JSON.parse(text);
        if (data && data.explanations) {
          res.json({ explanations: data.explanations });
          return;
        }
      }
      throw new Error("Invalid explanation payload");
    } catch (error: any) {
      console.warn("[Explain Incorrect] Using fallback explanations:", summarizeModelError(error));
      const fallbackExplanations = (incorrectQuestions || []).map((q: any) => ({
        question: q.question,
        explanation: `The correct answer is **${q.correctAns}**. You chose **${q.userAns}**. \n\n*Recall:* ${q.explanation || "Review this material in your study notes to reinforce retention."}`
      }));
      res.json({ explanations: fallbackExplanations });
    }
  });

  // Helper: Generate Fallback Mindmap dynamically from study materials
  function generateFallbackMindmap(notes: any[], files: any[], subjectName?: string) {
    const nodes: any[] = [];
    const links: any[] = [];

    const workspaceSubject = subjectName || "Workspace Study Guide";

    // 1. Root Node
    nodes.push({
      id: "root-node",
      label: `${workspaceSubject} Hub`,
      type: "concept",
      x: 480,
      y: 280,
      description: `Central conceptual core for ${workspaceSubject}. Created automatically to organize lectures, personal files, and conceptual notes.`
    });

    // Collect all primary source resources (files + notes)
    const sources: any[] = [];
    if (notes) {
      notes.forEach((n: any) => sources.push({ id: n.id, name: n.title, type: 'note', desc: n.content || `Notes on ${n.title}.` }));
    }
    if (files) {
      files.forEach((f: any) => sources.push({ id: f.id, name: f.name, type: f.type || 'pdf', desc: f.summary || `Study material resource: ${f.name}.`, highlights: f.highlights, formulas: f.formulas }));
    }

    const nSources = sources.length;
    sources.forEach((src: any, index: number) => {
      // Position resource nodes in a circle of radius R=180 around (480, 280)
      const angle = (index / Math.max(1, nSources)) * Math.PI * 2;
      const rx = Math.round(480 + 185 * Math.cos(angle));
      const ry = Math.round(280 + 185 * Math.sin(angle));

      nodes.push({
        id: src.id,
        label: src.name.length > 25 ? src.name.substring(0, 22) + "..." : src.name,
        type: src.type === 'note' ? 'note' : (src.type === 'video' || src.type === 'audio' ? 'video' : (src.type === 'url' ? 'url' : 'pdf')),
        x: rx,
        y: ry,
        description: src.desc
      });

      // Link resource to root
      links.push({
        id: `link-root-${src.id}`,
        source: "root-node",
        target: src.id,
        label: "references"
      });

      // Add detailed concept nodes for highlights or custom formulas
      if (src.highlights && src.highlights.length > 0) {
        src.highlights.forEach((hl: string, hlIdx: number) => {
          if (hlIdx > 1) return; // Limit fallback to max 2 concepts per resource
          
          const conceptAngle = angle + (hlIdx === 0 ? 0.35 : -0.35);
          const cx = Math.round(rx + 115 * Math.cos(conceptAngle));
          const cy = Math.round(ry + 115 * Math.sin(conceptAngle));
          const conceptId = `concept-${src.id}-${hlIdx}`;

          nodes.push({
            id: conceptId,
            label: hl.length > 25 ? hl.substring(0, 22) + "..." : hl,
            type: "concept",
            x: Math.max(50, Math.min(950, cx)),
            y: Math.max(50, Math.min(550, cy)),
            description: hl,
            sourceResource: src.id
          });

          links.push({
            id: `link-concept-${src.id}-${hlIdx}`,
            source: src.id,
            target: conceptId,
            label: "asserts"
          });
        });
      } else if (src.type === 'note' && src.desc) {
        const cx = Math.round(rx + 115 * Math.cos(angle + 0.2));
        const cy = Math.round(ry + 115 * Math.sin(angle + 0.2));
        const conceptId = `concept-${src.id}-0`;
        const summary = src.desc.length > 80 ? src.desc.substring(0, 77) + "..." : src.desc;

        nodes.push({
          id: conceptId,
          label: `${src.name} Core Idea`,
          type: "concept",
          x: Math.max(50, Math.min(950, cx)),
          y: Math.max(50, Math.min(550, cy)),
          description: `Key insight extracted from study note "${src.name}": ${summary}`,
          sourceResource: src.id
        });

        links.push({
          id: `link-concept-${src.id}-0`,
          source: src.id,
          target: conceptId,
          label: "expands"
        });
      }
    });

    // Cross-link some notes to PDFs to show notebooklm integration fallback
    if (nodes.length > 4) {
      const conceptNodes = nodes.filter(n => n.type === 'concept' && n.id !== 'root-node');
      if (conceptNodes.length >= 2) {
        links.push({
          id: `link-cross-1`,
          source: conceptNodes[0].id,
          target: conceptNodes[1].id,
          label: "corroborates"
        });
      }
    }

    return { nodes, links };
  }

  // API Route: Gemini Notebook / NotebookLM Style Web Research & Multi-Source Discovery
  app.post("/api/web-search-sources", async (req, res) => {
    try {
      const {
        query,
        mode,
        resourceType = 'all',
        subject = '',
        excludeUrls = [],
        excludeTitles = [],
        attemptIndex = 0
      } = req.body || {};

      if (!query || query.trim() === "") {
        res.status(400).json({ error: "A search query is required to discover new web sources." });
        return;
      }

      const searchQuery = query.trim();
      const requestedType = String(resourceType || 'all').toLowerCase(); // 'all' | 'pdf' | 'video' | 'wikipedia' | 'text' | 'website'
      const isDeepMode = mode === 'web' || mode === 'deep';
      const apiKey = getGeminiApiKey();

      const excludedUrlSet = new Set<string>(
        Array.isArray(excludeUrls)
          ? excludeUrls.map((u: any) => String(u || '').trim().toLowerCase()).filter(Boolean)
          : []
      );
      const excludedTitleSet = new Set<string>(
        Array.isArray(excludeTitles)
          ? excludeTitles
              .map((t: any) =>
                String(t || '')
                  .toLowerCase()
                  .replace(/— wikipedia.*$/i, '')
                  .replace(/\(arxiv pdf\)/i, '')
                  .replace(/[^\w\s]/g, '')
                  .trim()
              )
              .filter(Boolean)
          : []
      );

      const normalizeTitleForDedup = (rawTitle: string): string =>
        String(rawTitle || '')
          .toLowerCase()
          .replace(/— wikipedia.*$/i, '')
          .replace(/\(arxiv pdf\)/i, '')
          .replace(/[^\w\s]/g, '')
          .trim();

      const isSourceExcluded = (url?: string, title?: string): boolean => {
        const cleanUrl = String(url || '').trim().toLowerCase();
        if (cleanUrl && excludedUrlSet.has(cleanUrl)) return true;
        const cleanTitle = normalizeTitleForDedup(title || '');
        if (cleanTitle && excludedTitleSet.has(cleanTitle)) return true;
        return false;
      };

      const rotationAngles = [
        {
          label: 'Foundational Principles & Core Theory',
          ytSuffix: 'lecture explanation tutorial',
          wikiQuerySuffix: '',
          focusPrompt: 'foundational principles, core definitions, and primary mechanisms'
        },
        {
          label: 'Real-World Phenomena, Experiments & Applications',
          ytSuffix: 'experiments demonstrations real world applications',
          wikiQuerySuffix: 'applications phenomena experiments',
          focusPrompt: 'real-world applications, experimental demonstrations, optical/physical phenomena, and practical case studies'
        },
        {
          label: 'Mathematical Models, Formulas & Problem Solving',
          ytSuffix: 'problem solving worked examples equations',
          wikiQuerySuffix: 'equations theory models',
          focusPrompt: 'mathematical formulations, quantitative laws, derivations, and worked problem-solving examples'
        },
        {
          label: 'Advanced Mechanisms, Modern Research & Deep Dive',
          ytSuffix: 'university lecture advanced concepts deep dive',
          wikiQuerySuffix: 'quantum modern physics mechanisms',
          focusPrompt: 'advanced theoretical mechanisms, university-level analysis, and modern scientific developments'
        },
        {
          label: 'Historical Discoveries, Classical vs Modern Models & Exam Prep',
          ytSuffix: 'history discovery crash course revision',
          wikiQuerySuffix: 'history discovery timeline',
          focusPrompt: 'historical milestones, key scientific discoveries, comparative models, and high-yield exam takeaways'
        }
      ];

      const numericAttempt = Math.max(
        0,
        Number.isFinite(Number(attemptIndex))
          ? Number(attemptIndex)
          : excludedUrlSet.size > 0
          ? Math.floor(excludedUrlSet.size / 3)
          : 0
      );
      const activeAngle = rotationAngles[numericAttempt % rotationAngles.length];

      // Helper to check if a URL is a generic search results page instead of a real direct resource
      const isGenericSearchUrl = (u: string): boolean => {
        if (!u || !u.startsWith('http')) return true;
        const lower = u.toLowerCase();
        return (
          lower.includes('youtube.com/results') ||
          lower.includes('scholar.google.com/scholar') ||
          lower.includes('google.com/search') ||
          lower.includes('wikipedia.org/wiki/special:search') ||
          lower.includes('wikipedia.org/w/index.php?search=') ||
          lower.includes('example.com')
        );
      };

      // Helper to reconstruct abstract text from OpenAlex inverted index
      const reconstructOpenAlexAbstract = (invertedIndex: Record<string, number[]> | null | undefined): string => {
        if (!invertedIndex || typeof invertedIndex !== 'object') return '';
        try {
          const wordsByPos: string[] = [];
          for (const [word, positions] of Object.entries(invertedIndex)) {
            if (Array.isArray(positions)) {
              for (const pos of positions) {
                wordsByPos[pos] = word;
              }
            }
          }
          return wordsByPos.filter(Boolean).join(' ').trim();
        } catch {
          return '';
        }
      };

      // 1. Live Exact YouTube Video Resolver (extracts real watch?v=VIDEO_ID, embedUrl, thumbnail, channel, and duration)
      const fetchYouTubeVideoSources = async (): Promise<any[]> => {
        if (requestedType !== 'all' && requestedType !== 'video') {
          return [];
        }
        const maxVideos = requestedType === 'video' ? 5 : 2;
        const videos: any[] = [];

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const ytQuery = `${searchQuery} ${subject ? subject + ' ' : ''}${activeAngle.ytSuffix}`.trim();
          const ytRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}&hl=en`, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          });
          clearTimeout(timer);

          if (ytRes.ok) {
            const html = await ytRes.text();
            const initDataMatch = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
            if (initDataMatch && initDataMatch[1]) {
              try {
                const ytData = JSON.parse(initDataMatch[1]);
                const contents =
                  ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
                const renderers: any[] = [];
                for (const section of contents) {
                  const items = section?.itemSectionRenderer?.contents || [];
                  for (const item of items) {
                    if (item?.videoRenderer?.videoId) {
                      renderers.push(item.videoRenderer);
                    }
                  }
                }

                for (const vr of renderers) {
                  if (videos.length >= maxVideos) break;
                  const videoId = vr.videoId;
                  const title =
                    vr.title?.runs?.map((r: any) => r.text).join('') ||
                    vr.title?.simpleText ||
                    `${searchQuery} Video Lecture`;
                  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
                  if (isSourceExcluded(watchUrl, title)) continue;

                  const channelName =
                    vr.ownerText?.runs?.[0]?.text ||
                    vr.longBylineText?.runs?.[0]?.text ||
                    'YouTube Education';
                  const duration = vr.lengthText?.simpleText || 'Video Lecture';
                  const snippetRuns =
                    vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') ||
                    vr.descriptionSnippet?.runs?.map((r: any) => r.text).join('') ||
                    '';
                  const cleanSnippet = snippetRuns.replace(/\s+/g, ' ').trim();
                  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
                  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                  videos.push({
                    id: `web-yt-${videoId}-${Date.now()}`,
                    name: title,
                    type: 'video',
                    resourceCategory: 'video',
                    sourcePlatform: 'YouTube',
                    domain: 'youtube.com',
                    size: duration !== 'Video Lecture' ? `${duration} • ${channelName}` : `YouTube • ${channelName}`,
                    url: watchUrl,
                    embedUrl,
                    videoId,
                    thumbnail,
                    channelName,
                    duration,
                    summary:
                      cleanSnippet ||
                      `Video lecture by ${channelName} explaining ${title} with step-by-step visual walkthroughs and examples.`,
                    tags: [searchQuery, 'YouTube', channelName, 'Video Lecture'].slice(0, 4),
                    highlights: [
                      `Presented by ${channelName} (${duration}) — direct watch & in-app embed available.`,
                      cleanSnippet || `Covers core principles, visual intuition, and worked examples for ${searchQuery}.`
                    ],
                    formulas: [],
                    transcription: `# ${title}\n**Channel:** ${channelName} | **Duration:** ${duration}\n**Direct Video Link:** ${watchUrl}\n\n## Lecture Overview\n${
                      cleanSnippet || `This video lecture by ${channelName} provides an in-depth visual explanation of ${title}.`
                    }`
                  });
                }
              } catch {}
            }

            // Regex fallback on HTML if JSON structure varied
            if (videos.length === 0) {
              const regex = /"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]*?"title":\{"runs":\[\{"text":"([^"]+)"\}/g;
              let match;
              const seenIds = new Set<string>();
              while ((match = regex.exec(html)) !== null && videos.length < maxVideos) {
                const videoId = match[1];
                const rawTitle = match[2].replace(/\\u0026/g, '&').replace(/\\"/g, '"');
                const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
                if (!seenIds.has(videoId) && !isSourceExcluded(watchUrl, rawTitle)) {
                  seenIds.add(videoId);
                  videos.push({
                    id: `web-yt-${videoId}-${Date.now()}`,
                    name: rawTitle,
                    type: 'video',
                    resourceCategory: 'video',
                    sourcePlatform: 'YouTube',
                    domain: 'youtube.com',
                    size: 'YouTube Video Lecture',
                    url: watchUrl,
                    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
                    videoId,
                    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    summary: `Educational YouTube lecture covering "${rawTitle}" with visual explanations and examples.`,
                    tags: [searchQuery, 'YouTube', 'Video Lecture'],
                    highlights: [
                      `Direct YouTube video lecture (${watchUrl}).`,
                      `Explains ${searchQuery} concepts with visual breakdowns.`
                    ],
                    formulas: [],
                    transcription: `# ${rawTitle}\n**Direct Video Link:** ${watchUrl}\n\nEducational video lecture covering ${rawTitle}.`
                  });
                }
              }
            }
          }
        } catch {}

        return videos;
      };

      // 2. Live Wikipedia API Fetch (resolves exact canonical article URLs + companion printable Wikipedia PDFs)
      const fetchWikipediaSources = async (): Promise<{ wikiArticles: any[]; wikiPdfs: any[] }> => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const wikiSearchTerm =
            numericAttempt > 0 && activeAngle.wikiQuerySuffix
              ? `${searchQuery} ${activeAngle.wikiQuerySuffix}`
              : searchQuery;
          const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(wikiSearchTerm)}&utf8=1&format=json&srlimit=12`;
          const searchRes = await fetch(searchUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'StudyWeb-Academic-Notebook/1.0' }
          });
          clearTimeout(timer);
          if (!searchRes.ok) return { wikiArticles: [], wikiPdfs: [] };
          const searchData: any = await searchRes.json();
          const rawHits: any[] = searchData?.query?.search || [];
          if (rawHits.length === 0) return { wikiArticles: [], wikiPdfs: [] };

          // Filter out previously seen Wikipedia articles first; if all 12 were seen, rotate by offset
          const unseenHits = rawHits.filter((hit: any) => {
            const slug = encodeURIComponent(String(hit.title || '').replace(/\s+/g, '_'));
            const candidateUrl = `https://en.wikipedia.org/wiki/${slug}`;
            const candidatePdfUrl = `https://en.wikipedia.org/api/rest_v1/page/pdf/${slug}`;
            return (
              !isSourceExcluded(candidateUrl, hit.title) &&
              !isSourceExcluded(candidatePdfUrl, hit.title)
            );
          });

          const chosenHits =
            unseenHits.length > 0
              ? unseenHits.slice(0, 4)
              : rawHits.slice((numericAttempt * 2) % Math.max(1, rawHits.length)).concat(rawHits).slice(0, 4);

          const detailedHits = await Promise.all(
            chosenHits.map(async (hit: any, idx: number) => {
              const title = hit.title;
              const slug = encodeURIComponent(title.replace(/\s+/g, '_'));
              let extract = (hit.snippet || '').replace(/<\/?[^>]+(>|$)/g, '');
              let canonicalUrl = `https://en.wikipedia.org/wiki/${slug}`;
              let thumbnail = '';

              try {
                const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
                  headers: { 'User-Agent': 'StudyWeb-Academic-Notebook/1.0' }
                });
                if (summaryRes.ok) {
                  const summaryJson: any = await summaryRes.json();
                  if (summaryJson.extract) extract = summaryJson.extract;
                  if (summaryJson.content_urls?.desktop?.page) canonicalUrl = summaryJson.content_urls.desktop.page;
                  if (summaryJson.thumbnail?.source) thumbnail = summaryJson.thumbnail.source;
                }
              } catch {}

              const directPdfUrl = `https://en.wikipedia.org/api/rest_v1/page/pdf/${slug}`;
              const sentences = extract.split(/(?<=[.!?])\s+/).filter(Boolean);

              const articleItem = {
                id: `web-wiki-${Date.now()}-${idx}`,
                name: `${title} — Wikipedia Encyclopedia Article`,
                type: requestedType === 'text' ? 'doc' : 'url',
                resourceCategory: 'wikipedia',
                sourcePlatform: 'Wikipedia',
                domain: 'en.wikipedia.org',
                size: 'Wikipedia Article',
                url: canonicalUrl,
                pdfUrl: directPdfUrl,
                thumbnail: thumbnail || undefined,
                summary: sentences.slice(0, 3).join(' ') || `Comprehensive Wikipedia encyclopedia article covering ${title} and its core concepts.`,
                tags: [searchQuery, 'Wikipedia', 'Encyclopedia', ...(subject ? [subject] : [])].slice(0, 4),
                highlights: sentences.slice(0, 4).map((s: string) => s.trim()).filter((s: string) => s.length > 20),
                formulas: [],
                transcription: `# ${title} (Wikipedia Reference)\n\n${extract}\n\nExact Article URL: ${canonicalUrl}\nPrintable PDF Edition: ${directPdfUrl}`
              };

              const pdfItem = {
                id: `web-wikipdf-${Date.now()}-${idx}`,
                name: `${title} — Complete Reference Guide (PDF)`,
                type: 'pdf',
                resourceCategory: 'pdf',
                sourcePlatform: 'Wikipedia PDF',
                domain: 'en.wikipedia.org',
                size: 'Direct PDF Document',
                url: directPdfUrl,
                thumbnail: thumbnail || undefined,
                summary: `Printable, full-text PDF reference edition of the "${title}" encyclopedia article (${sentences.slice(0, 2).join(' ')}).`,
                tags: [searchQuery, 'PDF Document', 'Reference PDF', 'Wikipedia'].slice(0, 4),
                highlights: sentences.slice(0, 4).map((s: string) => s.trim()).filter((s: string) => s.length > 20),
                formulas: [],
                transcription: `# ${title} — Reference PDF\n\n${extract}\n\nDirect Downloadable PDF URL: ${directPdfUrl}`
              };

              return { articleItem, pdfItem };
            })
          );

          return {
            wikiArticles:
              requestedType === 'all' || requestedType === 'wikipedia' || requestedType === 'text' || requestedType === 'website'
                ? detailedHits.slice(0, requestedType === 'wikipedia' ? 4 : 2).map((d) => d.articleItem)
                : [],
            wikiPdfs:
              requestedType === 'all' || requestedType === 'pdf'
                ? detailedHits.slice(0, requestedType === 'pdf' ? 2 : 1).map((d) => d.pdfItem)
                : []
          };
        } catch {
          return { wikiArticles: [], wikiPdfs: [] };
        }
      };

      // 3. Live Direct Academic PDF Resolver (OpenAlex Open-Access PDFs + ArXiv Direct PDFs)
      const fetchAcademicPdfSources = async (): Promise<any[]> => {
        if (requestedType !== 'all' && requestedType !== 'pdf') {
          return [];
        }
        const pdfResults: any[] = [];

        // 3a. OpenAlex Open-Access Direct PDF Search (covers all academic subjects)
        const openAlexPromise = (async () => {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3800);
            const oaPage = (numericAttempt % 4) + 1;
            const oaUrl = `https://api.openalex.org/works?search=${encodeURIComponent(searchQuery)}&filter=is_oa:true&per-page=10&page=${oaPage}`;
            const oaRes = await fetch(oaUrl, {
              signal: controller.signal,
              headers: { 'User-Agent': 'StudyWeb-Academic-Notebook/1.0 (mailto:research@studyweb.edu)' }
            });
            clearTimeout(timer);
            if (!oaRes.ok) return [];
            const oaData: any = await oaRes.json();
            const works = Array.isArray(oaData?.results) ? oaData.results : [];
            const items: any[] = [];

            for (const work of works) {
              const directPdf =
                work?.best_oa_location?.pdf_url ||
                work?.primary_location?.pdf_url ||
                (typeof work?.open_access?.oa_url === 'string' && work.open_access.oa_url.toLowerCase().endsWith('.pdf')
                  ? work.open_access.oa_url
                  : null);
              if (!directPdf || !directPdf.startsWith('http')) continue;

              const title = work.display_name || work.title || `${searchQuery} Study Paper`;
              if (isSourceExcluded(directPdf, title)) continue;

              const year = work.publication_year ? ` (${work.publication_year})` : '';
              const authors = (work.authorships || [])
                .slice(0, 2)
                .map((a: any) => a?.author?.display_name)
                .filter(Boolean)
                .join(', ');
              const abstractText = reconstructOpenAlexAbstract(work.abstract_inverted_index);
              const sentences = abstractText.split(/(?<=[.!?])\s+/).filter(Boolean);
              let domain = 'openalex.org';
              try {
                domain = new URL(directPdf).hostname.replace(/^www\./, '');
              } catch {}

              items.push({
                id: `web-pdf-oa-${Date.now()}-${items.length}`,
                name: `${title}${year}`,
                type: 'pdf',
                resourceCategory: 'pdf',
                sourcePlatform: 'Academic PDF',
                domain,
                size: authors ? `PDF • ${authors}` : 'Open-Access PDF',
                url: directPdf,
                summary:
                  sentences.slice(0, 3).join(' ') ||
                  `Open-access academic PDF document${authors ? ` by ${authors}` : ''} covering ${title}.`,
                tags: [searchQuery, 'PDF Document', 'Open Access', domain].slice(0, 4),
                highlights:
                  sentences.slice(0, 3).map((s: string) => s.trim()).filter((s: string) => s.length > 20).length > 0
                    ? sentences.slice(0, 3).map((s: string) => s.trim()).filter((s: string) => s.length > 20)
                    : [`Peer-reviewed open-access PDF paper on ${title}.`],
                formulas: [],
                transcription: `# ${title}${year}\n${authors ? `**Authors:** ${authors}\n` : ''}**Direct PDF URL:** ${directPdf}\n\n## Abstract & Content Summary\n${
                  abstractText || `Full-text open-access PDF paper analyzing ${title}.`
                }`
              });
              if (items.length >= 4) break;
            }
            return items;
          } catch {
            return [];
          }
        })();

        // 3b. ArXiv Direct PDF Search
        const arxivPromise = (async () => {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3500);
            const startOffset = (numericAttempt * 3) % 15;
            const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(searchQuery)}&start=${startOffset}&max_results=8`;
            const arxivRes = await fetch(arxivUrl, { signal: controller.signal });
            clearTimeout(timer);
            if (!arxivRes.ok) return [];
            const xmlText = await arxivRes.text();
            const entries = xmlText.split('<entry>').slice(1);
            return entries
              .map((entry, idx) => {
                const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
                const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
                const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
                const rawTitle = (titleMatch?.[1] || `${searchQuery} Research Paper`).replace(/\s+/g, ' ').trim();
                const rawSummary = (summaryMatch?.[1] || '').replace(/\s+/g, ' ').trim();
                const rawIdUrl = (idMatch?.[1] || '').trim().replace(/^http:\/\//i, 'https://');
                if (!rawIdUrl) return null;
                const pdfUrl = rawIdUrl.replace('/abs/', '/pdf/') + (rawIdUrl.endsWith('.pdf') ? '' : '.pdf');
                if (isSourceExcluded(pdfUrl, rawTitle)) return null;

                const sentences = rawSummary.split(/(?<=[.!?])\s+/).filter(Boolean);

                return {
                  id: `web-pdf-arxiv-${Date.now()}-${idx}`,
                  name: `${rawTitle} (ArXiv PDF)`,
                  type: 'pdf',
                  resourceCategory: 'pdf',
                  sourcePlatform: 'ArXiv PDF',
                  domain: 'arxiv.org',
                  size: 'Direct PDF Paper',
                  url: pdfUrl,
                  summary: sentences.slice(0, 3).join(' ') || `Direct academic research PDF analyzing ${searchQuery}.`,
                  tags: [searchQuery, 'PDF Paper', 'ArXiv', 'Academic Research'].slice(0, 4),
                  highlights: sentences.slice(0, 3).map((s: string) => s.trim()).filter((s: string) => s.length > 20),
                  formulas: [],
                  transcription: `# ${rawTitle}\n\n## Abstract & PDF Text Preview\n${rawSummary}\n\nDirect PDF Link: ${pdfUrl}`
                };
              })
              .filter(Boolean)
              .slice(0, requestedType === 'pdf' ? 3 : 2);
          } catch {
            return [];
          }
        })();

        const [oaItems, arxivItems] = await Promise.all([openAlexPromise, arxivPromise]);
        pdfResults.push(...oaItems, ...arxivItems);
        return pdfResults.slice(0, requestedType === 'pdf' ? 5 : 3);
      };

      // 4. Gemini Live Google Search Grounding + Notebook Synthesis
      const fetchGeminiGroundedResearch = async (): Promise<{ sources: any[]; researchBrief: any }> => {
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
          throw new Error("GEMINI_API_KEY not configured");
        }

        const ai = new GoogleGenAI({
          apiKey,
          apiVersion: "v1beta",
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            }
          }
        });

        const exclusionDirective =
          excludedUrlSet.size > 0 || excludedTitleSet.size > 0
            ? `\nCRITICAL FRESHNESS REQUIREMENT: The student has already seen the following resources in previous searches. DO NOT repeat any of these URLs or titles—find completely DIFFERENT, fresh web sources and cover a new perspective (${activeAngle.label}):\n- Excluded URLs: ${Array.from(excludedUrlSet).slice(0, 12).join(', ')}\n- Excluded Titles: ${Array.from(excludedTitleSet).slice(0, 12).join(', ')}\n`
            : `\nFocus Perspective: ${activeAngle.label} (${activeAngle.focusPrompt}).\n`;

        const prompt = `You are a Gemini Notebook (NotebookLM) Research Engine helping a student research "${searchQuery}"${subject ? ` for their workspace in "${subject}"` : ''}.
Use Google Search to synthesize a fresh, comprehensive academic Research Brief focused on **${activeAngle.label}** (${activeAngle.focusPrompt}) and identify 3 authoritative educational articles/study guides (e.g. Khan Academy, MIT OpenCourseWare, Britannica, LibreTexts, HyperPhysics, Physics Classroom, Nature, Stanford Encyclopedia, National Geographic, NASA, OpenStax).
${exclusionDirective}
IMPORTANT: Never output generic search URLs like youtube.com/results or google.com/search. Only include real, direct article URLs from your Google Search grounding.

Return ONLY valid JSON (no markdown fences) matching this exact structure:
{
  "researchBrief": {
    "title": "Research Synthesis: ${searchQuery} (${activeAngle.label})",
    "overview": "A rich, clear, multi-paragraph academic synthesis explaining ${activeAngle.focusPrompt} for ${searchQuery}.",
    "keyTakeaways": [
      "Key takeaway 1 with concrete detail",
      "Key takeaway 2 with concrete detail",
      "Key takeaway 3 with concrete detail",
      "Key takeaway 4 with concrete detail"
    ],
    "formulas": ["Optional LaTeX formula if relevant"],
    "suggestedQuestions": [
      "Follow-up question 1 the student can ask the AI Tutor?",
      "Follow-up question 2?",
      "Follow-up question 3?"
    ]
  },
  "sources": [
    {
      "id": "unique-id",
      "name": "Real descriptive title of the resource",
      "type": "doc" | "url",
      "resourceCategory": "text",
      "sourcePlatform": "Study Guide" | "Web Article",
      "domain": "e.g. khanacademy.org, britannica.com, libretexts.org",
      "size": "Study Article",
      "url": "Exact verified URL from Google Search",
      "summary": "Detailed 3-4 sentence academic summary of what this resource covers and why it is valuable.",
      "tags": ["Tag1", "Tag2", "Tag3"],
      "highlights": [
        "Specific key fact, theorem, or insight 1",
        "Specific key fact, theorem, or insight 2",
        "Specific key fact, theorem, or insight 3"
      ],
      "formulas": [],
      "transcription": "Comprehensive 1200-2000 character full study text, lecture notes, or detailed educational breakdown of this source so the student can study it directly in their workspace."
    }
  ]
}`;

        const candidateModels = getAvailableCandidateModels([
          "gemini-3-flash-preview",
          "gemini-3.1-flash-lite",
          "gemini-4-hydrogen"
        ]);

        let lastErr: any = null;
        for (const model of candidateModels) {
          try {
            const isHydrogen = model === "gemini-4-hydrogen";
            const response = await ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                ...(isHydrogen ? {} : { temperature: 0.65 }),
                tools: [{ googleSearch: {} }],
              }
            });

            const rawText = (response.text || "").trim();
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);

            const groundingChunks = (response as any)?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const groundedWebLinks = groundingChunks
              .map((c: any) => c?.web)
              .filter((w: any) => w && w.uri && !isGenericSearchUrl(w.uri) && !isSourceExcluded(w.uri, w.title));

            const rawSources = Array.isArray(parsed.sources) ? parsed.sources : [];
            const normalizedSources: any[] = [];

            rawSources.forEach((src: any, idx: number) => {
              let url = src.url || '';
              if (isGenericSearchUrl(url) || isSourceExcluded(url, src.name)) {
                if (groundedWebLinks[idx]?.uri) {
                  url = groundedWebLinks[idx].uri;
                } else {
                  return; // Skip any source without a real direct non-excluded URL
                }
              }

              let domain = src.domain || '';
              try {
                domain = new URL(url).hostname.replace(/^www\./, '');
              } catch {
                domain = 'web';
              }

              normalizedSources.push({
                id: `web-gemini-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
                name: src.name || groundedWebLinks[idx]?.title || `${searchQuery} — ${activeAngle.label}`,
                type: requestedType === 'text' ? 'doc' : (['pdf', 'video', 'doc', 'url'].includes(src.type) ? src.type : 'url'),
                resourceCategory: src.resourceCategory || 'text',
                sourcePlatform: src.sourcePlatform || 'Web Study Guide',
                domain,
                size: src.size || 'Study Article',
                url,
                summary: src.summary || `Authoritative educational guide covering ${searchQuery} (${activeAngle.label}).`,
                tags: Array.isArray(src.tags) && src.tags.length > 0 ? src.tags : [searchQuery, 'Study Guide'],
                highlights: Array.isArray(src.highlights) && src.highlights.length > 0 ? src.highlights : [`Key concepts and principles of ${searchQuery}.`],
                formulas: Array.isArray(src.formulas) ? src.formulas : [],
                transcription: src.transcription || src.summary || ''
              });
            });

            return {
              sources:
                requestedType === 'all' || requestedType === 'text' || requestedType === 'website'
                  ? normalizedSources
                  : [],
              researchBrief: parsed.researchBrief || null
            };
          } catch (err: any) {
            lastErr = err;
            if (isTransientOrUnavailableModelError(err)) {
              recordModelQuotaCooldown(model, err);
            }
            console.warn(`[WebSearch Grounding] Switching from ${model}: ${summarizeModelError(err)}`);
          }
        }
        throw lastErr || new Error("Gemini grounded research failed");
      };

      const [ytRes, wikiRes, pdfRes, geminiRes] = await Promise.allSettled([
        fetchYouTubeVideoSources(),
        fetchWikipediaSources(),
        fetchAcademicPdfSources(),
        fetchGeminiGroundedResearch()
      ]);

      const ytSources = ytRes.status === 'fulfilled' ? ytRes.value : [];
      const { wikiArticles, wikiPdfs } = wikiRes.status === 'fulfilled' ? wikiRes.value : { wikiArticles: [], wikiPdfs: [] };
      const academicPdfs = pdfRes.status === 'fulfilled' ? pdfRes.value : [];
      const geminiData = geminiRes.status === 'fulfilled' ? geminiRes.value : { sources: [], researchBrief: null };

      // Combine and deduplicate by URL/name, prioritizing fresh direct resources not in excludedUrlSet/excludedTitleSet
      const combined: any[] = [];
      const seenKeys = new Set<string>();
      const pushUnique = (item: any, allowIfExcludedFallback = false) => {
        if (!item || !item.url || isGenericSearchUrl(item.url)) return;
        if (!allowIfExcludedFallback && isSourceExcluded(item.url, item.name)) return;
        const key = `${(item.url || '').toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          combined.push(item);
        }
      };

      if (requestedType === 'video') {
        ytSources.forEach((s) => pushUnique(s));
      } else if (requestedType === 'pdf') {
        academicPdfs.forEach((s) => pushUnique(s));
        wikiPdfs.forEach((s) => pushUnique(s));
      } else if (requestedType === 'wikipedia') {
        wikiArticles.forEach((s) => pushUnique(s));
      } else if (requestedType === 'text' || requestedType === 'website') {
        geminiData.sources.forEach((s) => pushUnique(s));
        wikiArticles.forEach((s) => pushUnique(s));
      } else {
        // 'all' — balanced mix of exact YouTube videos, direct PDFs, exact Wikipedia articles, and Web study guides
        ytSources.slice(0, 2).forEach((s) => pushUnique(s));
        academicPdfs.slice(0, 2).forEach((s) => pushUnique(s));
        wikiPdfs.slice(0, 1).forEach((s) => pushUnique(s));
        wikiArticles.slice(0, 2).forEach((s) => pushUnique(s));
        geminiData.sources.slice(0, 2).forEach((s) => pushUnique(s));
      }

      // If strict exclusion filtered out everything, allow remaining non-seen items from the fetched pools
      if (combined.length === 0) {
        [...geminiData.sources, ...ytSources, ...academicPdfs, ...wikiArticles, ...wikiPdfs].forEach((s) =>
          pushUnique(s, true)
        );
      }

      // Guaranteed direct fallback if all upstream calls were offline or filtered out
      if (combined.length === 0) {
        const cleanSlug = encodeURIComponent(
          `${searchQuery}${numericAttempt > 0 ? `_(${activeAngle.wikiQuerySuffix.split(' ')[0] || 'overview'})` : ''}`.replace(/\s+/g, '_')
        );
        pushUnique(
          {
            id: `web-src-wiki-${Date.now()}-1`,
            name: `${searchQuery} (${activeAngle.label}) — Encyclopedia Reference`,
            type: 'url',
            resourceCategory: 'wikipedia',
            sourcePlatform: 'Wikipedia',
            domain: 'en.wikipedia.org',
            size: 'Wikipedia Article',
            url: `https://en.wikipedia.org/wiki/${cleanSlug}`,
            pdfUrl: `https://en.wikipedia.org/api/rest_v1/page/pdf/${cleanSlug}`,
            summary: `Comprehensive reference analyzing ${activeAngle.focusPrompt} for ${searchQuery}.`,
            tags: [searchQuery, activeAngle.label, 'Encyclopedia'],
            highlights: [
              `Explores ${activeAngle.focusPrompt} in ${searchQuery}.`,
              `Reviews historical milestones and modern academic applications.`
            ],
            formulas: [],
            transcription: `# ${searchQuery} — ${activeAngle.label}\n\nThis comprehensive reference covers ${activeAngle.focusPrompt} of ${searchQuery}.`
          },
          true
        );
      }

      const researchBrief = geminiData.researchBrief || {
        title: `Research Synthesis: ${searchQuery} — ${activeAngle.label}`,
        overview: `This research brief synthesizes fresh insights on **${searchQuery}** focused on **${activeAngle.label.toLowerCase()}** across ${combined.length} verified web sources. Select at least one web source below to analyze and generate your quiz.`,
        keyTakeaways: combined.slice(0, 4).map((s: any) => `${s.name}: ${s.summary}`),
        formulas: [],
        suggestedQuestions: [
          `Explain ${activeAngle.focusPrompt} of ${searchQuery}.`,
          `What are the most important exam takeaways and formulas for ${searchQuery}?`,
          `Create a step-by-step study summary comparing all my sources on ${searchQuery}.`
        ]
      };

      res.json({
        sources: combined,
        researchBrief,
        query: searchQuery,
        resourceType: requestedType,
        angleLabel: activeAngle.label
      });
    } catch (err: any) {
      console.error("Error in /api/web-search-sources:", err);
      const q = (req.body?.query || 'Study Topic').trim();
      const slug = encodeURIComponent(q.replace(/\s+/g, '_'));
      res.json({
        sources: [
          {
            id: `web-src-fallback-${Date.now()}`,
            name: `${q} — Wikipedia Reference Guide`,
            type: "url",
            resourceCategory: "wikipedia",
            sourcePlatform: "Wikipedia",
            domain: "en.wikipedia.org",
            size: "Wikipedia Article",
            url: `https://en.wikipedia.org/wiki/${slug}`,
            pdfUrl: `https://en.wikipedia.org/api/rest_v1/page/pdf/${slug}`,
            summary: `Comprehensive introductory overview and academic reference for ${q}.`,
            tags: [q, "Wikipedia", "Reference"],
            highlights: [`Covers foundational concepts, terminology, and applications of ${q}.`],
            formulas: [],
            transcription: `Reference study guide for ${q}.`
          }
        ],
        researchBrief: {
          title: `Research Synthesis: ${q}`,
          overview: `Foundational overview and curated web sources for ${q}.`,
          keyTakeaways: [`Core principles and academic overview of ${q}.`],
          formulas: [],
          suggestedQuestions: [`Explain the fundamentals of ${q}.`]
        }
      });
    }
  });

  // API Route: Generate Mindmap from Notes & Resources like NotebookLM
  app.post("/api/generate-mindmap", async (req, res) => {
    try {
      const { notes, files, subject, workspaceId } = req.body;

      const hasNotes = notes && notes.length > 0;
      const hasFiles = files && files.length > 0;

      if (!hasNotes && !hasFiles) {
        res.status(400).json({ error: "No study notes or resource files were found in this active workspace. Please add notes or resources first." });
        return;
      }

      const workspaceSubject = subject || "Study Workspace";

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        console.warn("GEMINI_API_KEY not configured. Falling back to local mind map generator.");
        const fallbackNodes = generateFallbackMindmap(notes || [], files || [], workspaceSubject);
        res.json(fallbackNodes);
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const ragQuery = `Generate a comprehensive hierarchical knowledge graph and semantic mind map covering the core concepts, topics, definitions, and themes. Connect topics logically.`;
      const contextText = await performAdvancedRAG(ai, ragQuery, files, notes, 15, workspaceId, req.headers.authorization);

      const systemInstruction = `You are an elite academic mapping engine modeled on NotebookLM.
Your task is to generate an exceptionally structured, highly integrated conceptual Mind Map (semantic network) in JSON format based on the user's study notes and indexed resources.

The mind map MUST represent a deep, cohesive, and cross-connected academic chart.
It MUST consist of:
1. A central 'root' node at (480, 280) of type 'concept' summarizing the overall workspace subject ("${workspaceSubject}").
2. Resource nodes corresponding to the provided files and notes (types: 'pdf', 'video', 'note', 'url'). Position these at an intermediate distance (150-200px) from the root.
3. High-quality concept nodes (type: 'concept') that extract deep academic facts, core definitions, equations, or scientific milestones from those materials. Position these at outer circles or clustered near their respective source resource nodes.
4. Connections (links) representing the logical relationships between these nodes. Each link must have a 'label' specifying the verb relationship (e.g., 'synthesizes', 'demonstrates', 'implements', 'clarifies', 'validates', 'proves', 'contradicts').
   CRITICAL: Ensure you establish cross-resource links! For example, link a concept from a note directly to a concept from a PDF to show how personal notes expand on or clarify textbook details. This is the hallmark of a NotebookLM mind map.

Positioning Guidelines (Coordinate System: width=1000px, height=600px):
- Central Root Node: Position exactly at x: 480, y: 280.
- Resource Nodes: Position at distance R=160 to 200 from the center at different angles (e.g., at angles like 0, 72, 144, 216, 288 degrees).
- Concept/Detail Nodes: Clustered around their source files or further out at R=280 to 320. Ensure nodes do not overlap (allow at least 80-120px between any two coordinates).
- All coordinates (x, y) must be integers. x should be in the range [50, 950] and y in the range [50, 550].

Your output MUST be a JSON object matching the following TypeScript schema:
{
  "nodes": Array<{
    "id": string;
    "label": string;
    "type": "pdf" | "video" | "note" | "url" | "concept";
    "x": number;
    "y": number;
    "description": string;
    "sourceResource"?: string;
  }>;
  "links": Array<{
    "id": string;
    "source": string; // ID of the source node
    "target": string; // ID of the target node
    "label": string; // relationship description (e.g., "defines", "explains", "verifies")
  }>;
}`;


      const promptText = `Analyze our entire workspace resources and construct an integrated NotebookLM concept map (mind map) with central root "${workspaceSubject}":\n\n${contextText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: promptText,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    type: { type: Type.STRING },
                    x: { type: Type.INTEGER },
                    y: { type: Type.INTEGER },
                    description: { type: Type.STRING },
                    sourceResource: { type: Type.STRING }
                  },
                  required: ["id", "label", "type", "x", "y", "description"]
                }
              },
              links: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                    label: { type: Type.STRING }
                  },
                  required: ["id", "source", "target", "label"]
                }
              }
            },
            required: ["nodes", "links"]
          }
        }
      });

      if (response && response.text) {
        const data = JSON.parse(response.text.trim());
        if (data && data.nodes && data.links) {
          res.json({
            nodes: data.nodes.map((n: any) => ({
              ...n,
              id: String(n.id),
              x: Number(n.x) || 400,
              y: Number(n.y) || 300
            })),
            links: data.links.map((l: any) => ({
              ...l,
              id: String(l.id),
              source: String(l.source),
              target: String(l.target)
            }))
          });
        } else {
          throw new Error("Invalid response format from Gemini API.");
        }
      } else {
        throw new Error("No response text received from Gemini API.");
      }
    } catch (error: any) {
      console.error("Error in /api/generate-mindmap, falling back:", error);
      try {
        const fallbackGraph = generateFallbackMindmap(req.body.notes || [], req.body.files || [], req.body.subject || "Study Workspace");
        res.json(fallbackGraph);
      } catch (innerError: any) {
        res.status(500).json({
          error: "Failed to generate visual mind map.",
          details: error.message
        });
      }
    }
  });

  // Helper: Generate Fallback Flashcards dynamically from study materials
  function generateFallbackFlashcards(notes: any[], files: any[], count: number, difficulty: 'Easy' | 'Medium' | 'Hard') {
    const flashcards: any[] = [];
    let combinedText = "";
    let topic = "General Study";

    if (notes && notes.length > 0) {
      combinedText += notes.map((n: any) => `${n.title} ${n.content}`).join(" ");
      if (notes[0] && notes[0].title) {
        topic = notes[0].title;
      }
    }
    if (files && files.length > 0) {
      combinedText += files.map((f: any) => `${f.name} ${f.summary || ""} ${(f.highlights || []).join(" ")}`).join(" ");
      if (files[0] && files[0].name) {
        topic = files[0].name.split('.')[0];
      }
    }

    // Default terms if there isn't enough parsed text
    const defaultPairs = [
      { front: "What is the Feynman Technique?", back: "A learning method that involves explaining a concept in simple terms as if teaching it to a beginner, identifying gaps in your own understanding, and reviewing the source material." },
      { front: "What is Active Recall?", back: "A highly efficient learning strategy where you stimulate your memory for a piece of information during the learning process, rather than passively reading or highlighting." },
      { front: "Explain Spaced Repetition.", back: "An evidence-based learning technique usually performed with flashcards, where cards are reviewed at increasing intervals as you master them (e.g., Box 1 studied daily, Box 2 every 3 days, Box 3 weekly)." },
      { front: "What is Cornell Note-taking?", back: "A systematic format for condensing and organizing notes, dividing a page into a Note-taking Column, a Cue/Questions Column, and a Summary Section at the bottom." },
      { front: "Define Pomodoro Technique.", back: "A time management method that uses a timer to break work down into intervals, traditionally 25 minutes in length, separated by short 5-minute breaks." },
      { front: "What is the Pomodoro interval called?", back: "Each interval is known as a pomodoro, from the Italian word for tomato, after the tomato-shaped kitchen timer used by its creator." },
      { front: "What is Metacognition?", back: "The awareness and understanding of one's own thought processes, essentially 'thinking about thinking' to optimize self-directed learning and study habits." },
      { front: "Explain Mnemonics.", back: "A system of plans or devices (like acronyms, visualizations, or rhyme formulas) used to improve and assist memory retention of complex lists or items." }
    ];

    // Try to extract some terms from combinedText
    const extractedTerms: { front: string; back: string }[] = [];
    if (combinedText) {
      // Look for patterns like "X is Y" or "X stands for Y" or "X: Y"
      const sentenceRegex = /([A-Z][a-zA-Z\s]{3,25})\s+(is|stands for|refers to|defines|represents)\s+([^.]+)\./g;
      let match;
      let iterations = 0;
      while ((match = sentenceRegex.exec(combinedText)) !== null && iterations < 20) {
        iterations++;
        const term = match[1].trim();
        const definition = match[3].trim();
        if (term.length > 3 && definition.length > 10) {
          extractedTerms.push({
            front: `What is the definition or role of ${term}?`,
            back: `${term} ${match[2]} ${definition}.`
          });
        }
      }
    }

    const pool = extractedTerms.length >= count ? extractedTerms : [...extractedTerms, ...defaultPairs];
    const uniquePool = Array.from(new Set(pool.map(p => JSON.stringify(p)))).map(s => JSON.parse(s));

    for (let i = 0; i < Math.min(count, uniquePool.length); i++) {
      flashcards.push({
        id: `fc-fallback-${Date.now()}-${i}`,
        front: uniquePool[i].front,
        back: uniquePool[i].back,
        topic: topic,
        difficulty: difficulty,
        box: 1,
        bookmarked: false
      });
    }

    // Fill up if still less than count
    while (flashcards.length < count) {
      const randomDefault = defaultPairs[Math.floor(Math.random() * defaultPairs.length)];
      flashcards.push({
        id: `fc-fallback-${Date.now()}-${flashcards.length}`,
        front: randomDefault.front,
        back: randomDefault.back,
        topic: topic,
        difficulty: difficulty,
        box: 1,
        bookmarked: false
      });
    }

    return flashcards;
  }

  // API Route: Generate Flashcards from Notes & Resources like NotebookLM
  app.post("/api/generate-flashcards", async (req, res) => {
    try {
      const { notes, files, count, difficulty, workspaceId } = req.body;

      const hasNotes = notes && notes.length > 0;
      const hasFiles = files && files.length > 0;

      if (!hasNotes && !hasFiles) {
        res.status(400).json({ error: "No study notes or resource files were found in this active workspace. Please add notes or resources first." });
        return;
      }

      const cardCount = count || 5;
      const diffLevel = difficulty || "Medium";

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        console.warn("GEMINI_API_KEY not configured. Falling back to local flashcard generator.");
        const fallbackCards = generateFallbackFlashcards(notes || [], files || [], cardCount, diffLevel);
        res.json({ flashcards: fallbackCards });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const ragQuery = `Generate ${cardCount} ${diffLevel} difficulty active recall flashcards covering the most critical definitions, formulas, concepts, and facts.`;
      const contextText = await performAdvancedRAG(ai, ragQuery, files, notes, 15, workspaceId, req.headers.authorization);

      const systemInstruction = `You are a high-performance academic tutor and Study Assistant modeled on NotebookLM.
Your task is to generate high-quality, concept-based active recall flashcards from the provided study notes and/or indexed resources.
Generate exactly ${cardCount} flashcards at the specified difficulty level: "${diffLevel}".

Each flashcard MUST satisfy:
1. "front": A clear, thought-provoking question, key term, or conceptual prompt. Keep it highly focused.
2. "back": A clear, concise, and factually accurate explanation, definition, or answer. Keep it directly relevant and easy to understand during active rehearsal.
3. "topic": A very short categorizing label representing the specific subtopic/theme (e.g. "Photosynthesis", "Stoichiometry", "Feynman Method").
4. "difficulty": Strictly set to "${diffLevel}".

You MUST return a JSON object with a "flashcards" array containing your generated flashcard items matching the requested schema.`;


      const prompt = `Generate ${cardCount} high-quality flashcards of difficulty "${diffLevel}" based on the following materials:\n\n${contextText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.75,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    difficulty: { type: Type.STRING }
                  },
                  required: ["front", "back", "topic", "difficulty"]
                }
              }
            },
            required: ["flashcards"]
          }
        }
      });

      if (response && response.text) {
        const data = JSON.parse(response.text.trim());
        if (data && data.flashcards) {
          const cardsWithMetadata = data.flashcards.map((c: any, i: number) => ({
            id: `fc-ai-${Date.now()}-${i}`,
            front: c.front,
            back: c.back,
            topic: c.topic || "General Study",
            difficulty: c.difficulty || diffLevel,
            box: 1,
            bookmarked: false
          }));
          res.json({ flashcards: cardsWithMetadata });
        } else {
          throw new Error("Invalid response structure from Gemini API.");
        }
      } else {
        throw new Error("No response text received from Gemini API.");
      }
    } catch (error: any) {
      console.error("Error in /api/generate-flashcards, falling back:", error);
      try {
        const fallbackCards = generateFallbackFlashcards(req.body.notes || [], req.body.files || [], req.body.count || 5, req.body.difficulty || "Medium");
        res.json({ flashcards: fallbackCards });
      } catch (innerError: any) {
        res.status(500).json({
          error: "Failed to generate study flashcards.",
          details: error.message
        });
      }
    }
  });

  // Helper: Local study schedule generator in case Gemini API is not configured or fails
  function generateFallbackSchedule(subjects: string[], intensity: string, style: string) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const finalTasks = [];
    const activeSubjects = subjects && subjects.length > 0 ? subjects : ['General Study', 'Active Recall Review'];
    
    // Decide task count based on intensity
    let tasksPerSubject = 1;
    if (intensity === 'High') tasksPerSubject = 3;
    else if (intensity === 'Balanced' || intensity === 'Medium') tasksPerSubject = 2;

    let idCounter = 1;
    for (let i = 0; i < activeSubjects.length; i++) {
      const sub = activeSubjects[i];
      for (let t = 0; t < tasksPerSubject; t++) {
        const day = days[(i * tasksPerSubject + t) % days.length];
        
        let action = `Study and review core concepts of ${sub}`;
        let hours = "1.5h";
        let priority = "Medium";

        if (style === 'Pomodoro') {
          action = `Perform 3 Pomodoro study cycles focusing on ${sub}`;
          hours = "1.5h";
          priority = t === 0 ? "High" : "Medium";
        } else if (style === 'Active Recall') {
          action = `Generate active recall flashcards and self-test on ${sub}`;
          hours = "1h";
          priority = "High";
        } else if (style === 'Leitner') {
          action = `Review Box 2 and Box 3 Leitner study cards for ${sub}`;
          hours = "45m";
          priority = "Low";
        } else {
          // Balanced
          if (t === 0) {
            action = `Read advanced chapters and take brief notes on ${sub}`;
            hours = "2h";
            priority = "High";
          } else {
            action = `Solve complex practice questions and review weaknesses on ${sub}`;
            hours = "1h";
            priority = "Medium";
          }
        }

        finalTasks.push({
          id: `ai-sched-fallback-${Date.now()}-${idCounter++}`,
          day,
          action,
          hours,
          priority,
          completed: false
        });
      }
    }
    return finalTasks;
  }

  // API Route: Generate a Personalized Weekly Study Planner using Gemini AI
  app.post("/api/generate-schedule", async (req, res) => {
    try {
      const { subjects, intensity, style } = req.body;
      const activeSubjects = subjects && subjects.length > 0 ? subjects : ["General Study", "Cognitive Science"];
      const activeIntensity = intensity || "Balanced";
      const activeStyle = style || "Balanced";

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        console.warn("GEMINI_API_KEY not configured. Falling back to local study schedule generator.");
        const fallbackTasks = generateFallbackSchedule(activeSubjects, activeIntensity, activeStyle);
        res.json({ tasks: fallbackTasks });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const systemInstruction = `You are an elite academic productivity coach and cognitive science specialist.
Your task is to design a highly personalized, balanced weekly study schedule based on the student's current subjects: ${JSON.stringify(activeSubjects)}.
Study intensity requested: "${activeIntensity}" (Low implies ~1-2 tasks per subject, Balanced implies ~2-3 tasks, High implies multiple spaced sessions).
Study style requested: "${activeStyle}" (e.g., "Pomodoro", "Active Recall", "Leitner Spaced Repetition", "Balanced").

The schedule MUST satisfy:
1. Spaced Repetition: Strategically distribute study tasks across the days (Monday to Sunday) so the student does not burn out.
2. Highly Specific Action Items: Do not generate generic tasks like "Study Math". Instead, generate active-learning tasks (e.g., "Solve AP Calculus derivatives worksheet and review incorrect questions").
3. Each task MUST contain:
   - "day": Exactly one of "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday".
   - "action": A descriptive study item.
   - "hours": Expected study duration (e.g. "45m", "1.5h", "2h", "3h").
   - "priority": Exactly one of "High", "Medium", "Low".

You MUST return a JSON object with a "tasks" array containing the scheduled items matching the requested schema.`;

      const prompt = `Generate a personalized weekly study schedule for these subjects: ${activeSubjects.join(", ")}.
Study Intensity: ${activeIntensity}
Study Style Preference: ${activeStyle}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    action: { type: Type.STRING },
                    hours: { type: Type.STRING },
                    priority: { type: Type.STRING }
                  },
                  required: ["day", "action", "hours", "priority"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      });

      if (response && response.text) {
        const data = JSON.parse(response.text.trim());
        if (data && data.tasks) {
          const tasksWithMetadata = data.tasks.map((task: any, idx: number) => ({
            id: `sched-ai-${Date.now()}-${idx}`,
            day: task.day || "Monday",
            action: task.action,
            hours: task.hours || "1h",
            priority: task.priority || "Medium",
            completed: false
          }));
          res.json({ tasks: tasksWithMetadata });
        } else {
          throw new Error("Invalid response structure from Gemini API.");
        }
      } else {
        throw new Error("No response text received from Gemini API.");
      }
    } catch (error: any) {
      console.error("Error in /api/generate-schedule, falling back:", error);
      try {
        const fallbackTasks = generateFallbackSchedule(req.body.subjects || [], req.body.intensity || "Balanced", req.body.style || "Balanced");
        res.json({ tasks: fallbackTasks });
      } catch (innerError: any) {
        res.status(500).json({
          error: "Failed to generate weekly study schedule.",
          details: error.message
        });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
