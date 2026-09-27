"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getTenantSettings(tenantId: string) {
  const session = await getSession();
  if (!session || session.tenantId !== tenantId) return null;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return tenant || null;
}

export type UpdateSettingsData = {
  siteName?: string | null;
  customDomain?: string | null;
  schemaConfig?: Record<string, unknown>;
};

export async function updateTenantSettings(tenantId: string, data: UpdateSettingsData) {
  try {
    const session = await getSession();
    if (!session || session.tenantId !== tenantId) {
      throw new Error("Unauthorized");
    }

    // Process customDomain: Convert empty string to null to avoid unique constraint issues
    const finalCustomDomain = data.customDomain && data.customDomain.trim() !== ""
      ? data.customDomain.trim()
      : null;

    // Kalau customDomain berubah, reset status ke 'pending' — perlu verifikasi sebelum aktif
    if ("customDomain" in data) {
      await db
        .update(tenants)
        .set({
          siteName: data.siteName,
          schemaConfig: data.schemaConfig,
          customDomain: finalCustomDomain,
          customDomainStatus: finalCustomDomain ? "pending" : "none",
          customDomainVerifiedAt: null,
        })
        .where(eq(tenants.id, tenantId));
    } else {
      await db
        .update(tenants)
        .set({
          siteName: data.siteName,
          schemaConfig: data.schemaConfig,
        })
        .where(eq(tenants.id, tenantId));
    }

    revalidatePath("/app/settings");
    return { success: true };
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === "23505" && pgErr.message?.includes("custom_domain")) {
      return { success: false, error: "Custom domain sudah digunakan oleh pihak lain." };
    }
    console.error("[updateTenantSettings]", pgErr.message);
    return { success: false, error: "Gagal menyimpan pengaturan. Silakan coba lagi." };
  }
}
