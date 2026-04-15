"use server";

import { getSession } from "@/lib/session";
import { db } from "@/db";
import { tenantPlugins, media } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { expandImagePromptWithAI, callImageGenerationProvider } from "@/lib/ai-generator/image-providers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { apiCredentials } from "@/db/schema";

const PLUGIN_ID = "ai-image-generator";

// ─────────────────────────────────────────────────────────────────────────────
// [PUBLIC ACTION] Tarik daftar Provider Gambar yang aktif di Platform Vault
// ─────────────────────────────────────────────────────────────────────────────
export async function getActivePlatformImageProviders() {
  const session = await getSession();
  if (!session?.tenantId) throw new Error("Unauthorized");

  const vaultProviders = await db
    .select({ provider: apiCredentials.provider, displayName: apiCredentials.displayName })
    .from(apiCredentials)
    .where(and(
      eq(apiCredentials.category, "ai_image_generation"),
      eq(apiCredentials.isActive, true)
    ));

  return vaultProviders.map(r => ({
    id: r.provider,
    name: r.displayName || r.provider
  }));
}

/** Verifikasi saldo dan potong kredit tenant. Soft-check: jika plugin belum terdaftar, generate tetap diizinkan (di-log). */
async function deductImageCredit(tenantId: string) {
  const [existing] = await db
    .select({ status: tenantPlugins.status, config: tenantPlugins.config })
    .from(tenantPlugins)
    .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)))
    .limit(1);

  // Jika plugin belum terdaftar, izinkan penggunaan tapi log peringatan
  if (!existing) {
    console.warn(`[AI Image] Plugin ${PLUGIN_ID} belum terdaftar untuk tenant ${tenantId}. Menggunakan mode tanpa kuota.`);
    return;
  }
  
  if (existing.status !== "ACTIVE") {
    throw new Error("Add-on AI Image Generator belum diaktifkan untuk tenant ini.");
  }

  const config = (existing.config || {}) as any;
  const creditsUsed = config.aiImageCreditsUsed ?? 0;
  const limitFromPluginConfig = config.aiImageCreditsLimit ?? 10; 

  const session = await getSession();
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  if (!isSuperAdmin && creditsUsed >= limitFromPluginConfig) {
    throw new Error(`Kredit AI Gambar Anda telah habis (${creditsUsed}/${limitFromPluginConfig}). Harap tingkatkan limit Anda.`);
  }

  // Update credits used for everyone, including Super Admin, to track usage
  await db.update(tenantPlugins)
    .set({ config: { ...config, aiImageCreditsUsed: creditsUsed + 1 } })
    .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)));
}

export async function expandImagePrompt(params: { shortPrompt: string; originalContent?: string }) {
  const session = await getSession();
  if (!session?.tenantId) return { success: false, error: "Unauthorized" };

  try {
     const expanded = await expandImagePromptWithAI(params.shortPrompt, params.originalContent);
     return { success: true, prompt: expanded };
  } catch (err: any) {
     return { success: false, error: err.message };
  }
}

export async function generateAiImageAction(params: {
  provider: string;
  modelId: string;
  prompt: string;
  size: string;
  style: string;
}) {
  const session = await getSession();
  if (!session?.tenantId) return { success: false, error: "Unauthorized" };

  try {
     // Potong saldo sebelum memanggil API (prevent spamming)
     await deductImageCredit(session.tenantId);

     const { url, revisedPrompt } = await callImageGenerationProvider(
        params.provider,
        params.modelId,
        params.prompt,
        params.size,
        params.style
     );

     return { success: true, url, revisedPrompt };
  } catch (err: any) {
     return { success: false, error: err.message };
  }
}

export async function saveGeneratedImageAction(formData: FormData) {
  const remoteUrl = formData.get("remoteUrl") as string;
  const promptUsed = formData.get("promptUsed") as string;
  
  const session = await getSession();
  if (!session?.tenantId) return { success: false, error: "Unauthorized" };
  const tenantId = session.tenantId;

  try {
    let buffer: Buffer;
    let mimeType = "image/png";

    if (remoteUrl.startsWith("data:")) {
      const match = remoteUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else {
        throw new Error("Invalid base64 image data");
      }
    } else {
      const res = await fetch(remoteUrl);
      if (!res.ok) throw new Error("Gagal mengunduh gambar hasil generasi dari provider.");
      buffer = Buffer.from(await res.arrayBuffer());
      mimeType = res.headers.get("content-type") || "image/png";
    }
    const sizeBytes = buffer.byteLength;
    const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : "png";
    
    // File saving logic
    const uniqueFilename = `ai-generated-${Date.now()}.${extension}`;
    const tenantDir = join(process.cwd(), "public", "uploads", tenantId);
    await mkdir(tenantDir, { recursive: true });
    const absolutePath = join(tenantDir, uniqueFilename);
    await writeFile(absolutePath, buffer);

    const publicUrl = `/uploads/${tenantId}/${uniqueFilename}`;

    // Insert into media gallery
    await db.insert(media).values({
      id: crypto.randomUUID(),
      tenantId,
      url: publicUrl,
      filename: uniqueFilename,
      mimeType,
      sizeBytes,
      altText: "AI Generated: " + promptUsed.substring(0, 50),
      description: promptUsed, // Keep prompt inside description metadata
    });

    revalidatePath("/app/media");
    return { success: true, url: publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
