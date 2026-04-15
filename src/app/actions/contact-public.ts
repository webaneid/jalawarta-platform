"use server";

import { db } from "@/db";
import { contactSubmissions, contactForms, tenantPlugins } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function submitContactFormAction(tenantId: string, formId: string, formData: FormData) {
  try {
    // 1. Verifikasi Add-on Aktif
    const [plugin] = await db
      .select({ status: tenantPlugins.status })
      .from(tenantPlugins)
      .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, "advanced-contact-form")))
      .limit(1);
    
    if (plugin?.status !== "ACTIVE") {
      throw new Error("Sistem formulir saat ini tidak tersedia.");
    }

    // 2. Verifikasi Form Exist
    const [form] = await db
      .select()
      .from(contactForms)
      .where(and(eq(contactForms.tenantId, tenantId), eq(contactForms.id, formId)))
      .limit(1);

    if (!form) throw new Error("Formulir tidak ditemukan.");

    // 3. Ekstrak Data
    const fields = form.fields as any[];
    const entryData: Record<string, any> = {};

    for (const field of fields) {
        const value = formData.get(field.id);
        if (field.required && !value) {
            throw new Error(`${field.label} wajib diisi.`);
        }
        
        // Handle phone (+ country code if present)
        if (field.type === "phone" && field.includeCountry) {
            const country = formData.get(`${field.id}_country`);
            entryData[field.id] = country ? `+${country} ${value}` : value;
        } else {
            entryData[field.id] = value;
        }
    }

    // 4. Simpan ke Database
    await db.insert(contactSubmissions).values({
      tenantId,
      formId,
      data: entryData,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
