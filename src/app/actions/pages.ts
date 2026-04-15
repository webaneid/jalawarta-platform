"use server";

import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function savePage({
  tenantId,
  title,
  content,
  slug,
  featuredImage,
  seoConfig,
  existingId,
}: {
  tenantId: string;
  title: string;
  content: object;
  slug: string;
  featuredImage?: string;
  seoConfig?: any;
  existingId?: string;
}) {
  try {
    if (existingId) {
      await db
        .update(pages)
        .set({ title: { id: title }, content, slug, featuredImage, seoConfig })
        .where(and(eq(pages.id, existingId), eq(pages.tenantId, tenantId)));
      revalidatePath("/pages");
      return { success: true, id: existingId };
    } else {
      const newId = crypto.randomUUID();
      await db.insert(pages).values({
        id: newId,
        tenantId,
        title: { id: title },
        content,
        slug: slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
        featuredImage,
        seoConfig,
      });
      revalidatePath("/pages");
      return { success: true, id: newId };
    }
  } catch (err: any) {
    return { success: false, error: err.message, id: undefined };
  }
}

export async function deletePageAction(id: string, tenantId: string) {
  await db.delete(pages).where(and(eq(pages.id, id), eq(pages.tenantId, tenantId)));
  revalidatePath("/pages");
  return { success: true };
}
