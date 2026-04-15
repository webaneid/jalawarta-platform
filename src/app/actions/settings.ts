"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getTenantSettings(tenantId: string) {
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
  schemaConfig?: any;
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

    await db
      .update(tenants)
      .set({
        siteName: data.siteName,
        customDomain: finalCustomDomain,
        schemaConfig: data.schemaConfig,
      })
      .where(eq(tenants.id, tenantId));

    revalidatePath("/app/settings");
    return { success: true };
  } catch (err: any) {
    if (err.code === "23505" && err.message.includes("custom_domain")) {
      return { success: false, error: "Custom domain sudah digunakan oleh pihak lain." };
    }
    return { success: false, error: err.message };
  }
}
