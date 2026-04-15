"use server";

import { db } from "@/db";
import { apiCredentials, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { encryptAPIKey, decryptAPIKey } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { revalidateTag } from "next/cache";

async function verifySuperAdmin() {
  const session = await getSession();
  if (!session?.email) throw new Error("Unauthorized");
  const user = await db.query.users.findFirst({ where: eq(users.email, session.email) });
  if (!user || user.role !== "PLATFORM_ADMIN") throw new Error("Forbidden: PLATFORM_ADMIN required");
}

// Kategori & Provider yang didukung — bisa dikembangkan sesuai roadmap
// Catatan: tidak di-export dari sini karena "use server" hanya boleh export async functions
// Digunakan juga di src/lib/api-categories.ts untuk keperluan UI
const API_CATEGORIES_MAP: Record<string, { label: string; providers: string[] }> = {
  ai_text_generation: {
    label: "AI Text Generation",
    providers: ["gemini", "openai_chatgpt", "claude", "deepseek", "perplexity"],
  },
  payment_gateway: {
    label: "Payment Gateway",
    providers: ["midtrans", "xendit", "stripe"],
  },
  analytics: {
    label: "SEO & Analytics",
    providers: ["google_search_console", "google_analytics_4", "dataforseo"],
  },
  master_pixel: {
    label: "Marketing Pixel (Master)",
    providers: ["meta_facebook", "tiktok", "google_ads"],
  },
};

export async function saveApiCredential(data: {
  id?: string;
  category: string;
  provider: string;
  apiKey: string;
  apiSecret?: string;
  displayName: string;
  description?: string;
  isActive: boolean;
}) {
  try {
    await verifySuperAdmin();

    // Enkripsi nilai sensitif sebelum masuk DB
    const encryptedKey = encryptAPIKey(data.apiKey.trim());
    const encryptedSecret = data.apiSecret?.trim()
      ? encryptAPIKey(data.apiSecret.trim())
      : null;

    if (data.id) {
      // UPDATE — API Key baru hanya dienkripsi jika ada perubahan (non-empty)
      const existing = await db.query.apiCredentials.findFirst({
        where: eq(apiCredentials.id, data.id),
      });
      if (!existing) throw new Error("Credential not found");

      await db
        .update(apiCredentials)
        .set({
          displayName: data.displayName,
          description: data.description || null,
          // Hanya update key jika user mengisi field baru
          apiKey: data.apiKey.trim() ? encryptedKey : existing.apiKey,
          apiSecret: data.apiSecret?.trim() ? encryptedSecret : existing.apiSecret,
          isActive: data.isActive,
          updatedAt: new Date(),
        })
        .where(eq(apiCredentials.id, data.id));
    } else {
      // Cek duplikasi sebelum INSERT agar error lebih informatif
      const duplicate = await db.query.apiCredentials.findFirst({
        where: (t, { and, eq }) => and(
          eq(t.category, data.category.toLowerCase()),
          eq(t.provider, data.provider.toLowerCase())
        ),
      });
      if (duplicate) {
        return {
          success: false,
          error: `Provider "${data.provider}" di kategori ini sudah terdaftar (ID: ${duplicate.id}). Edit kredensial yang ada, atau hapus dulu sebelum membuat baru.`,
        };
      }

      // CREATE
      await db.insert(apiCredentials).values({
        category: data.category.toLowerCase(),
        provider: data.provider.toLowerCase(),
        apiKey: encryptedKey,
        apiSecret: encryptedSecret,
        displayName: data.displayName,
        description: data.description || null,
        isActive: data.isActive,
      });
    }

    revalidatePath("/platform/api-keys");
    revalidateTag("global_api_credentials", "max");
    return { success: true };
  } catch (error: any) {
    // Fallback: tangani unique constraint PostgreSQL (kode 23505)
    if (error?.code === "23505") {
      return { success: false, error: "Provider ini sudah terdaftar di kategori yang sama. Edit kredensial yang sudah ada." };
    }
    return { success: false, error: error.message };
  }
}

export async function deleteApiCredential(id: string) {
  try {
    await verifySuperAdmin();
    await db.delete(apiCredentials).where(eq(apiCredentials.id, id));
    revalidatePath("/platform/api-keys");
    revalidateTag("global_api_credentials", "max");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fungsi yang aman untuk mendapatkan API Key yang terdekripsi oleh Server Component/Action tenant.
 * Dikonsumsi oleh Add-ons (AI Writer, Payment, dll).
 */
export async function getDecryptedCredential(category: string, provider: string): Promise<string | null> {
  const cred = await db.query.apiCredentials.findFirst({
    where: (t, { and, eq }) => and(
      eq(t.category, category),
      eq(t.provider, provider),
      eq(t.isActive, true)
    ),
  });
  if (!cred) return null;
  return decryptAPIKey(cred.apiKey);
}
