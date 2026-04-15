import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

// ─── Definisi Provider & Model Tersedia ──────────────────────────────────────
export const PROVIDERS_MODELS: Record<string, { label: string; models: { id: string; label: string }[] }> = {
  gemini: {
    label: "Google Gemini",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Paling Canggih)" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Cepat & Cerdas)" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite (Paling Hemat)" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Stabil)" },
    ],
  },
  openai_chatgpt: {
    label: "OpenAI ChatGPT",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1 (Flagship, 1M Context)" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini (Cepat & Hemat)" },
      { id: "gpt-4.1-nano", label: "GPT-4.1 Nano (Paling Efisien)" },
      { id: "gpt-4o", label: "GPT-4o (Stabil)" },
    ],
  },
  claude: {
    label: "Anthropic Claude",
    models: [
      { id: "claude-opus-4-6", label: "Claude Opus 4.6 (Paling Canggih)" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Recommended)" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Cepat & Hemat)" },
    ],
  },
};

// Default fallback model per provider — diambil dari model pertama PROVIDERS_MODELS
const DEFAULT_MODELS: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDERS_MODELS).map(([key, val]) => [key, val.models[0].id])
);

export interface GenerateOptions {
  provider: string;     // "gemini" | "openai_chatgpt" | "claude"
  model?: string;       // override model jika diset
  apiKey: string;       // plaintext, sudah didekripsi dari Vault
  systemPrompt: string;
  userPrompt: string;
}

export interface GenerateResult {
  text: string;
  tokensUsed: number;   // total input + output tokens AKTUAL dari API
}

/**
 * Router provider terpusat — memanggil AI yang tepat berdasarkan provider ID.
 * Selalu membaca token usage AKTUAL dari respons API (anti-boncos).
 */
export async function generateFromProvider(opts: GenerateOptions): Promise<GenerateResult> {
  const model = opts.model || DEFAULT_MODELS[opts.provider] || "gemini-1.5-pro";

  let aiModel: any;

  switch (opts.provider) {
    case "gemini": {
      const google = createGoogleGenerativeAI({ apiKey: opts.apiKey });
      aiModel = google(model);
      break;
    }
    case "openai_chatgpt": {
      const openai = createOpenAI({ apiKey: opts.apiKey });
      aiModel = openai(model);
      break;
    }
    case "claude": {
      const anthropic = createAnthropic({ apiKey: opts.apiKey });
      aiModel = anthropic(model);
      break;
    }
    default:
      throw new Error(`Provider tidak dikenal: "${opts.provider}". Daftarkan di api-categories.ts.`);
  }

  const result = await generateText({
    model: aiModel,
    system: opts.systemPrompt,
    prompt: opts.userPrompt,
  });

  // Baca token AKTUAL dari response metadata — bukan estimasi!
  const tokensUsed = (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0);

  return {
    text: result.text,
    tokensUsed,
  };
}

/**
 * Konversi token aktual ke kredit (1 kredit = 1.000 token).
 * Selalu roundup ke atas (Math.ceil) agar platform tidak dirugikan.
 */
export function tokensToCreditCost(tokensUsed: number): number {
  return Math.ceil(tokensUsed / 1000);
}
