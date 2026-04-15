"use server";

import { db } from "@/db";
import { contactForms, contactSubmissions, tenantPlugins } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Check if the contact form add-on is active for a tenant
 */
async function isPluginActive(tenantId: string) {
  const [plugin] = await db
    .select({ status: tenantPlugins.status })
    .from(tenantPlugins)
    .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, "advanced-contact-form")))
    .limit(1);
  return plugin?.status === "ACTIVE";
}

/**
 * Get all forms for a tenant
 */
export async function getContactForms(tenantId: string) {
  try {
    const forms = await db
      .select()
      .from(contactForms)
      .where(eq(contactForms.tenantId, tenantId))
      .orderBy(desc(contactForms.createdAt));

    return { success: true, forms };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get a single form and its submission count
 */
export async function getContactFormDetail(tenantId: string, formId: string) {
  try {
    const [form] = await db
      .select()
      .from(contactForms)
      .where(and(eq(contactForms.tenantId, tenantId), eq(contactForms.id, formId)))
      .limit(1);

    if (!form) throw new Error("Form tidak ditemukan.");

    const [submissionsCount] = await db
      .select({ val: count() })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.formId, formId));

    return { success: true, form, submissionsCount: submissionsCount?.val || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create or Update a form
 */
export async function saveContactFormAction(tenantId: string, data: {
  id?: string;
  title: string;
  fields: any[];
  settings: any;
}) {
  try {
    if (!(await isPluginActive(tenantId))) {
      throw new Error("Add-on Contact Form tidak aktif.");
    }

    if (data.id) {
      await db
        .update(contactForms)
        .set({
          title: data.title,
          fields: data.fields,
          settings: data.settings,
          updatedAt: new Date(),
        })
        .where(and(eq(contactForms.tenantId, tenantId), eq(contactForms.id, data.id)));
    } else {
      await db.insert(contactForms).values({
        tenantId,
        title: data.title,
        fields: data.fields,
        settings: data.settings,
      });
    }

    revalidatePath("/app/addons/contact-form");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a form
 */
export async function deleteContactFormAction(tenantId: string, formId: string) {
  try {
    await db
      .delete(contactForms)
      .where(and(eq(contactForms.tenantId, tenantId), eq(contactForms.id, formId)));

    revalidatePath("/app/addons/contact-form");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get submissions for a form
 */
export async function getFormSubmissions(tenantId: string, formId: string) {
  try {
    const submissions = await db
      .select()
      .from(contactSubmissions)
      .where(and(eq(contactSubmissions.tenantId, tenantId), eq(contactSubmissions.formId, formId)))
      .orderBy(desc(contactSubmissions.createdAt));

    return { success: true, submissions };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Mark submission as READ
 */
export async function markSubmissionReadAction(tenantId: string, submissionId: string) {
    try {
      await db
        .update(contactSubmissions)
        .set({ status: "READ" })
        .where(and(eq(contactSubmissions.tenantId, tenantId), eq(contactSubmissions.id, submissionId)));
  
      revalidatePath("/app/addons/contact-form");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
}

/**
 * Delete a submission
 */
export async function deleteSubmissionAction(tenantId: string, submissionId: string) {
    try {
      await db
        .delete(contactSubmissions)
        .where(and(eq(contactSubmissions.tenantId, tenantId), eq(contactSubmissions.id, submissionId)));
  
      revalidatePath("/app/addons/contact-form");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
}
