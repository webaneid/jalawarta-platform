"use server";

import { db } from "@/db";
import { categories, postCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function toSlug(str: string) {
  return str.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "").slice(0, 100);
}

export async function getCategories(tenantId: string) {
  return db.select().from(categories).where(eq(categories.tenantId, tenantId));
}

export async function saveCategory({
  tenantId,
  name,
  description,
  existingId,
}: {
  tenantId: string;
  name: string;
  description?: string;
  existingId?: string;
}) {
  try {
    if (existingId) {
      await db
        .update(categories)
        .set({ name, description, slug: toSlug(name) })
        .where(and(eq(categories.id, existingId), eq(categories.tenantId, tenantId)));
    } else {
      await db.insert(categories).values({
        id: crypto.randomUUID(),
        tenantId,
        name,
        slug: toSlug(name),
        description,
      });
    }
    revalidatePath("/categories");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCategory(id: string, tenantId: string) {
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)));
  revalidatePath("/categories");
  return { success: true };
}

export async function getPostCategories(postId: string) {
  return db.select().from(postCategories).where(eq(postCategories.postId, postId));
}

export async function syncPostCategories(postId: string, categoryIds: string[]) {
  // Hapus relasi lama lalu insert baru (simple sync)
  await db.delete(postCategories).where(eq(postCategories.postId, postId));
  if (categoryIds.length > 0) {
    await db.insert(postCategories).values(
      categoryIds.map((categoryId) => ({ postId, categoryId }))
    );
  }
  return { success: true };
}
