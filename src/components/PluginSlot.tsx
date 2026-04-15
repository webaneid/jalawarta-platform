import React from "react";
import { db } from "@/db";
import { tenantPlugins } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { PLUGIN_REGISTRY } from "@/lib/plugins/registry";

type PluginSlotProps = {
  tenantId: string | null;
  position: "header" | "footer" | "sidebar" | "content";
};

/**
 * Slot dinamis yang me-render plugin aktif milik tenant pada posisi tertentu.
 */
export async function PluginSlot({ tenantId, position }: PluginSlotProps) {
  if (!tenantId) return null;

  // 1. Ambil semua plugin aktif untuk tenant ini dari database
  const activePlugins = await db.query.tenantPlugins.findMany({
    where: and(
      eq(tenantPlugins.tenantId, tenantId),
      eq(tenantPlugins.status, "ACTIVE")
    ),
  });

  if (activePlugins.length === 0) return null;

  // 2. Filter plugin yang mendukung slot (position) ini dan render
  const renderedPlugins = activePlugins
    .map((tp) => {
      const definition = PLUGIN_REGISTRY[tp.pluginId];
      if (definition && definition.supportedSlots.includes(position)) {
        const Component = definition.component;
        // Pass config dari database ke component plugin
        const config = (tp.config as any) || {};
        return <Component key={tp.pluginId} {...config} />;
      }
      return null;
    })
    .filter(Boolean);

  return <>{renderedPlugins}</>;
}
