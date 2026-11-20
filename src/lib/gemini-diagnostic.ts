import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { getServerGeminiApiKey } from "../utils/serverEnv.js";

// Ensure environment variables are loaded
dotenv.config();

/**
 * Server-side utility function to perform a direct 'generateContent' test using the 'GEMINI_API_KEY'.
 * Accepts a string prompt, logs the raw response object, and returns a boolean status for success.
 *
 * @param prompt - The string prompt to send to the Gemini model (e.g. "Reply with the word OK.")
 * @returns Promise<boolean> - True if generateContent succeeds with a valid response, false otherwise.
 */
export async function testGeminiDiagnostic(prompt: string = "Reply with the word OK."): Promise<boolean> {
  const apiKey = getServerGeminiApiKey();
  console.log("[Gemini Diagnostic] Initializing Gemini diagnostic utility...");
  console.log("[Gemini Diagnostic] GEMINI_API_KEY present in environment:", Boolean(apiKey));

  if (!apiKey || apiKey.trim() === "") {
    console.error("[Gemini Diagnostic] ERROR: GEMINI_API_KEY is not configured in process.env.");
    return false;
  }

  // Log sanitized key prefix for verification
  const keyPreview = apiKey.length > 8 ? `${apiKey.substring(0, 8)}...` : "***";
  console.log(`[Gemini Diagnostic] API Key configured: ${keyPreview}`);

  try {
    // Initialize the official Google Gen AI SDK
    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    // Supported active models per system guidelines
    const candidateModels = ["gemini-3-flash-preview", "gemini-3.1-flash-lite"];
    let rawResponse: any = null;
    let selectedModel = "";
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[Gemini Diagnostic] Testing generateContent with model '${model}'...`);
        console.log(`[Gemini Diagnostic] Prompt: "${prompt}"`);

        const startTime = Date.now();
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        const duration = Date.now() - startTime;

        rawResponse = response;
        selectedModel = model;

        console.log(`[Gemini Diagnostic] Model '${model}' responded successfully in ${duration}ms!`);
        break; // Successfully got response
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Diagnostic] Model '${model}' attempt resulted in:`, err?.message || err);
        // If 503 / UNAVAILABLE spike or error, proceed to try candidate fallback
      }
    }

    if (!rawResponse) {
      console.error("[Gemini Diagnostic] All candidate models failed. Last error:", lastError?.message || lastError);
      if (lastError?.status) {
        console.error("[Gemini Diagnostic] HTTP status code:", lastError.status);
      }
      return false;
    }

    // Log the raw response object as specifically required
    console.log("[Gemini Diagnostic] Raw response object:");
    console.dir(rawResponse, { depth: null, colors: true });

    // Log extracted text preview
    const textOutput = rawResponse?.text?.trim() || "";
    console.log(`[Gemini Diagnostic] Extracted text: "${textOutput}"`);

    return true;
  } catch (error: any) {
    console.error("[Gemini Diagnostic] Unexpected failure in diagnostic execution:", error?.message || error);
    return false;
  }
}

// Backward-compatible export alias
export { testGeminiDiagnostic as runGeminiDiagnostic };

// Default export
export default testGeminiDiagnostic;

// Self-invoking runner when run directly via tsx/node CLI
const isDirectExecution = process.argv[1]?.includes("gemini-diagnostic");
if (isDirectExecution) {
  testGeminiDiagnostic("Reply with the word OK.")
    .then((success) => {
      console.log(`[Gemini Diagnostic] Final result: success=${success}`);
      if (!success) {
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      console.error("[Gemini Diagnostic] Uncaught error:", err);
      process.exitCode = 1;
    });
}
