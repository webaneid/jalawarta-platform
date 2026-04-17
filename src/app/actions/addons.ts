"use server";

import { db } from "@/db";
import { plugins, tenantPlugins, packages, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

/**
 * Get all available plugins and their activation status for a tenant
 */
export async function getTenantAddons(tenantId: string) {
  try {
    const session = await getSession();
    const isSuperAdmin = session?.role === "SUPER_ADMIN";

    const [tenantData] = await db
      .select({ subscriptionId: tenants.subscriptionId })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    let allowedAddons: string[] = [];
    if (tenantData?.subscriptionId) {
      const [packageData] = await db
        .select({ features: packages.features })
        .from(packages)
        .where(eq(packages.id, tenantData.subscriptionId))
        .limit(1);
      
      const features = (packageData?.features as any) || { allowedAddons: [] };
      allowedAddons = features.allowedAddons || [];
    }

    const allPlugins = await db.select().from(plugins);

    const activePlugins = await db
      .select()
      .from(tenantPlugins)
      .where(eq(tenantPlugins.tenantId, tenantId));

    const addons = allPlugins.map((p) => {
      const active = activePlugins.find((ap) => ap.pluginId === p.id);
      return {
        ...p,
        status: active?.status || "INACTIVE",
        config: active?.config || null,
        isAllowedByPackage: isSuperAdmin || allowedAddons.includes(p.id),
      };
    });

    return { success: true, addons };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Toggle plugin status (Activate/Deactivate)
 */
export async function toggleAddonStatusAction(tenantId: string, pluginId: string) {
  try {
    const [existing] = await db
      .select()
      .from(tenantPlugins)
      .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, pluginId)))
      .limit(1);

    if (existing) {
      const newStatus = existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await db
        .update(tenantPlugins)
        .set({ status: newStatus })
        .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, pluginId)));
    } else {
      await db.insert(tenantPlugins).values({
        tenantId,
        pluginId,
        status: "ACTIVE",
      });
    }

    revalidatePath("/app/addons");
    revalidatePath("/app", "layout");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update plugin configuration (e.g. GA IDs)
 */
export async function updateAddonConfigAction(tenantId: string, pluginId: string, config: any) {
    try {
      await db
        .update(tenantPlugins)
        .set({ config })
        .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, pluginId)));
  
      revalidatePath("/app/addons");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
}
