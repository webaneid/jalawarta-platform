"use server";

import { processWxrImport } from "@/lib/importers/wordpress";
import { generateWxrExport } from "@/lib/exporters/wordpress";
import { revalidatePath } from "next/cache";

/**
 * Server Action to handle WordPress WXR Import
 */
export async function importWordPressAction(xmlContent: string, tenantId: string) {
  try {
    if (!xmlContent || !tenantId) {
      throw new Error("Konten XML atau Tenant ID tidak ditemukan.");
    }

    const results = await processWxrImport(tenantId, xmlContent);
    
    revalidatePath("/app/posts");
    revalidatePath("/app/pages");
    revalidatePath("/app/media");
    
    return { success: true, results };
  } catch (err: any) {
    console.error("[importWordPressAction] Error:", err);
    return { success: false, error: err.message || "Terjadi kesalahan saat mengimpor data." };
  }
}

/**
 * Server Action to handle WordPress WXR Export
 */
export async function exportWordPressAction(tenantId: string, options?: any) {
  try {
    if (!tenantId) {
      throw new Error("Tenant ID required.");
    }

    const xml = await generateWxrExport(tenantId, options);
    return { success: true, xml };
  } catch (err: any) {
    console.error("[exportWordPressAction] Error:", err);
    return { success: false, error: err.message || "Terjadi kesalahan saat mengekspor data." };
  }
}
