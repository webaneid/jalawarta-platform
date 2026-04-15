"use server";

import { db } from "@/db";
import { tenantPlugins, users, tenants, apiCredentials } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { getDecryptedCredential } from "@/app/actions/apikeys";
import { generateFromProvider, tokensToCreditCost } from "@/lib/ai-generator/providers";
import { revalidatePath } from "next/cache";

const PLUGIN_ID = "ai-article-generator";

// ── Tone → System Prompt map ──────────────────────────────────────────────────
const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: "Gunakan bahasa yang formal, berbobot, dan informatif. Hindari slang.",
  casual: "Gunakan bahasa santai, hangat, dan mudah dipahami oleh pembaca umum.",
  journalistic: "Gunakan gaya penulisan jurnalistik 5W1H. Mulai dengan lead yang kuat.",
  academic: "Gunakan bahasa akademis dengan referensi faktual. Sertakan data pendukung.",
};

const LENGTH_TARGETS: Record<string, string> = {
  short: "Target panjang artikel: sekitar 300-400 kata.",
  medium: "Target panjang artikel: sekitar 700-900 kata.",
  long: "Target panjang artikel: sekitar 1.400-1.600 kata.",
};

const POV_INSTRUCTIONS: Record<string, string> = {
  first: "Tulis dari sudut pandang orang pertama (menggunakan 'saya' / 'kami').",
  third: "Tulis dari sudut pandang orang ketiga yang netral.",
  neutral: "Gunakan sudut pandang netral tanpa kata ganti orang.",
};

// ── Helper: ambil config plugin untuk tenant ──────────────────────────────────
// ── Helper: ambil config plugin untuk tenant ──────────────────────────────────
export async function getPluginConfig(tenantId: string) {
  const [row] = await db
    .select()
    .from(tenantPlugins)
    .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)))
    .limit(1);

  if (!row || row.status !== "ACTIVE") {
    throw new Error("Add-on AI Article Generator belum diaktifkan untuk tenant ini.");
  }

  const config = (row.config || {}) as any;
  return {
    aiCreditsLimit: config.aiCreditsLimit ?? 20,
    aiCreditsUsed: config.aiCreditsUsed ?? 0,
    preferredProvider: config.preferredProvider ?? "gemini",
    preferredModel: config.preferredModel ?? "gemini-1.5-pro",
    defaultLanguage: config.defaultLanguage ?? "id",
    defaultTone: config.defaultTone ?? "professional",
    templates: config.templates ?? [],
    progressMessages: config.progressMessages ?? [
      "Thinking...",
      "Sensing the vibes...",
      "Brewing something spicy...",
      "Almost there, hold tight...",
      "Final polishing...",
    ],
  };
}

// ── Helper: update kredit setelah generate ────────────────────────────────────
export async function updateCreditsUsed(tenantId: string, currentConfig: any, additionalCredits: number) {
  const newUsed = (currentConfig.aiCreditsUsed ?? 0) + additionalCredits;
  await db
    .update(tenantPlugins)
    .set({ config: { ...currentConfig, aiCreditsUsed: newUsed } })
    .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)));
}

// ─────────────────────────────────────────────────────────────────────────────
// [PUBLIC ACTION] Ambil konfigurasi AI yang aman untuk ditampilkan di UI
// ─────────────────────────────────────────────────────────────────────────────
export async function getAiGeneratorConfig() {
  const session = await getSession();
  if (!session?.tenantId) throw new Error("Unauthorized");

  const config = await getPluginConfig(session.tenantId);
  return {
    creditsLimit: config.aiCreditsLimit,
    creditsUsed: config.aiCreditsUsed,
    creditsLeft: config.aiCreditsLimit - config.aiCreditsUsed,
    preferredProvider: config.preferredProvider,
    preferredModel: config.preferredModel,
    defaultLanguage: config.defaultLanguage,
    defaultTone: config.defaultTone,
    templates: config.templates,
    progressMessages: config.progressMessages,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// [PUBLIC ACTION] Generate artikel — inti dari add-on ini
// ─────────────────────────────────────────────────────────────────────────────
export async function generateArticle(params: {
  topic: string;
  referenceUrl?: string;
  referenceContent?: string;
  tone: string;       // "professional" | "casual" | "journalistic" | "academic"
  length: string;     // "short" | "medium" | "long"
  language: string;   // "id" | "en"
  pov: string;        // "first" | "third" | "neutral"
  provider?: string;  // override provider, opsional
  model?: string;     // override model, opsional
  customInstruction?: string;
}) {
  const session = await getSession();
  if (!session?.tenantId) return { success: false, error: "Unauthorized" };

  try {
    const config = await getPluginConfig(session.tenantId);

    // Cek sisa kredit di sisi server (anti-bypass)
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    const creditsLeft = config.aiCreditsLimit - config.aiCreditsUsed;
    if (!isSuperAdmin && creditsLeft <= 0) {
      return { success: false, error: "Kredit AI Anda habis. Hubungi administrator untuk penambahan kuota." };
    }

    // Tentukan provider & model
    const provider = params.provider || config.preferredProvider;
    const model = params.model || config.preferredModel;

    // Ambil API Key dari Vault (didekripsi di server, tidak pernah ke browser)
    const apiKey = await getDecryptedCredential("ai_text_generation", provider);
    if (!apiKey) {
      return { success: false, error: `API Key untuk provider "${provider}" belum dikonfigurasi di platform. Hubungi administrator.` };
    }

    // Susun system prompt
    const langInstruction = params.language === "id"
      ? "Tulis artikel dalam Bahasa Indonesia yang baik dan benar."
      : "Write the article in proper English.";

    const systemPrompt = [
      "Kamu adalah editor konten profesional untuk portal berita.",
      langInstruction,
      TONE_INSTRUCTIONS[params.tone] || TONE_INSTRUCTIONS.professional,
      POV_INSTRUCTIONS[params.pov] || POV_INSTRUCTIONS.neutral,
      LENGTH_TARGETS[params.length] || LENGTH_TARGETS.medium,
      "ATURAN FORMAT OUTPUT:",
      "1. Anda WAJIB menggunakan format RAW HTML (JANGAN gunakan blok markdown semacam ```html).",
      "2. Baris pertama WAJIB berupa elemen <h1> yang berisi Judul Artikel Utama (hanya 1 <h1>).",
      "3. Sisa badan artikel menggunakan tag HTML semantik seperti <h2>, <h3>, <p>, <strong>, <ul>, <ol>, <li>, dan <blockquote>.",
      "4. Jangan menulis pengantar atau penutup di luar tag HTML.",
      params.customInstruction ? `Instruksi tambahan: ${params.customInstruction}` : "",
    ].filter(Boolean).join("\n");

    const contentContext = params.referenceContent 
      ? `\n\nGunakan materi/transkrip referensi berikut sebagai basis tulisan utama:\n${params.referenceContent}`
      : (params.referenceUrl ? `\n\nGantikan referensi dari URL berikut sebagai konteks pemahaman: ${params.referenceUrl}` : "");

    const userPrompt = `Tulis artikel tentang: "${params.topic}"${contentContext}`;

    // Panggil AI
    const result = await generateFromProvider({ provider, model, apiKey, systemPrompt, userPrompt });

    // Hitung kredit aktual yang dikonsumsi (anti-boncos)
    const creditCost = tokensToCreditCost(result.tokensUsed);
    await updateCreditsUsed(session.tenantId, config, creditCost);

    return {
      success: true,
      text: result.text,           // Markdown — akan dikonversi ke Tiptap JSON di client
      tokensUsed: result.tokensUsed,
      creditCost,
      creditsLeft: Math.max(0, creditsLeft - creditCost),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// [PUBLIC ACTION] Update konfigurasi AI per tenant (pilih provider, template, dll)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateAiGeneratorConfig(updates: {
  preferredProvider?: string;
  preferredModel?: string;
  defaultLanguage?: string;
  defaultTone?: string;
}) {
  const session = await getSession();
  if (!session?.tenantId) return { success: false, error: "Unauthorized" };

  try {
    const config = await getPluginConfig(session.tenantId);
    await db
      .update(tenantPlugins)
      .set({ config: { ...config, ...updates } })
      .where(and(eq(tenantPlugins.tenantId, session.tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)));

    revalidatePath("/addons/ai-article-generator");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// [PUBLIC ACTION] Simpan AI Template baru untuk tenant
// ─────────────────────────────────────────────────────────────────────────────
export async function saveAiTemplate(template: {
  name: string;
  tone: string;
  length: string;
  language: string;
  pov: string;
  provider?: string;
  model?: string;
  customInstruction?: string;
}) {
  const session = await getSession();
  if (!session?.tenantId) return { success: false, error: "Unauthorized" };

  try {
    const config = await getPluginConfig(session.tenantId);
    const newTemplate = { id: crypto.randomUUID(), ...template };
    const updatedTemplates = [...(config.templates || []), newTemplate];

    await db
      .update(tenantPlugins)
      .set({ config: { ...config, templates: updatedTemplates } })
      .where(and(eq(tenantPlugins.tenantId, session.tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)));

    return { success: true, template: newTemplate };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// [PLATFORM ADMIN] Set limit kredit untuk tenant tertentu
// ─────────────────────────────────────────────────────────────────────────────
export async function setPlatformCreditLimit(tenantId: string, creditsLimit: number) {
  const session = await getSession();
  if (!session?.email) return { success: false, error: "Unauthorized" };

  const user = await db.query.users.findFirst({ where: eq(users.email, session.email) });
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return { success: false, error: "Hanya Platform Admin yang dapat mengubah limit kredit." };
  }

  try {
    const [existing] = await db
      .select()
      .from(tenantPlugins)
      .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)))
      .limit(1);

    if (!existing) return { success: false, error: "Tenant belum mengaktifkan add-on ini." };

    const currentConfig = (existing.config || {}) as any;
    await db
      .update(tenantPlugins)
      .set({ config: { ...currentConfig, aiCreditsLimit: creditsLimit } })
      .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// [PLATFORM ADMIN] Menarik keseluruhan pemakaian AI setiap tenant
// ─────────────────────────────────────────────────────────────────────────────
export async function getTenantsAiUsage() {
  const session = await getSession();
  if (!session?.email) throw new Error("Unauthorized");

  const user = await db.query.users.findFirst({ where: eq(users.email, session.email) });
  if (!user || user.role !== "PLATFORM_ADMIN") {
    throw new Error("Hanya Platform Admin yang dapat melihat metrik ini.");
  }

  // Join table tenants dan tenantPlugins
  const metrics = await db
    .select({
      tenantId: tenants.id,
      siteName: tenants.siteName,
      subdomain: tenants.subdomain,
      config: tenantPlugins.config,
      status: tenantPlugins.status,
    })
    .from(tenantPlugins)
    .innerJoin(tenants, eq(tenants.id, tenantPlugins.tenantId))
    .where(eq(tenantPlugins.pluginId, PLUGIN_ID));

  return metrics.map(r => {
    const config = (r.config || {}) as any;
    return {
      tenantId: r.tenantId,
      siteName: r.siteName || r.subdomain,
      status: r.status,
      aiCreditsLimit: config.aiCreditsLimit ?? 20,
      aiCreditsUsed: config.aiCreditsUsed ?? 0,
      preferredProvider: config.preferredProvider ?? "gemini",
      preferredModel: config.preferredModel ?? "gemini-1.5-pro",
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// [PUBLIC ACTION] Tarik daftar Provider yang aktif di Platform Vault
// ─────────────────────────────────────────────────────────────────────────────
export async function getActivePlatformProviders() {
  const session = await getSession();
  if (!session?.tenantId) throw new Error("Unauthorized");

  const vaultProviders = await db
    .select({ provider: apiCredentials.provider, displayName: apiCredentials.displayName })
    .from(apiCredentials)
    .where(and(
      eq(apiCredentials.category, "ai_text_generation"),
      eq(apiCredentials.isActive, true)
    ));

  return vaultProviders.map(r => ({
    id: r.provider,
    name: r.displayName || r.provider
  }));
}
