"use server";

import { db } from "@/db";
import { posts, pages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { ensureCapability } from "@/lib/auth/guards";

// ---- POSTS ----

export async function savePost({
  tenantId,
  title,
  content,
  slug,
  featuredImage,
  status = "DRAFT",
  seoConfig,
  existingId,
}: {
  tenantId: string;
  title: string;
  content: object;
  slug: string;
  featuredImage?: string;
  status?: "DRAFT" | "PUBLISHED";
  seoConfig?: any;
  existingId?: string;
}) {
  try {
    if (existingId) {
      await ensureCapability("edit_posts");

      // Validasi status PUBLISHED memerlukan capability khusus
      if (status === "PUBLISHED") {
        await ensureCapability("publish_posts");
      }

      await db
        .update(posts)
        .set({ title: { id: title }, content, slug, featuredImage, status, seoConfig })
        .where(and(eq(posts.id, existingId), eq(posts.tenantId, tenantId)));
      revalidatePath("/posts");
      return { success: true, id: existingId };
    } else {
      await ensureCapability("edit_posts");
      if (status === "PUBLISHED") {
        await ensureCapability("publish_posts");
      }

      const newId = crypto.randomUUID();
      await db.insert(posts).values({
        id: newId,
        tenantId,
        title: { id: title },
        content,
        slug: slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
        featuredImage,
        status,
        seoConfig,
      });
      revalidatePath("/posts");
      return { success: true, id: newId };
    }
  } catch (err: any) {
    return { success: false, error: err.message, id: undefined };
  }
}

export async function getPosts(tenantId: string) {
  return db.select().from(posts).where(eq(posts.tenantId, tenantId));
}

export async function deletePost(id: string, tenantId: string) {
  await ensureCapability("delete_posts");
  await db.delete(posts).where(and(eq(posts.id, id), eq(posts.tenantId, tenantId)));
  revalidatePath("/posts");
  return { success: true };
}

// ---- PAGES ----

export async function savePage({
  tenantId,
  title,
  content,
  slug,
  seoConfig,
  existingId,
}: {
  tenantId: string;
  title: string;
  content: object;
  slug: string;
  seoConfig?: any;
  existingId?: string;
}) {
  try {
    await ensureCapability("manage_taxonomy"); // Asumsi page management butuh hak tinggi

    if (existingId) {
      await db
        .update(pages)
        .set({ title: { id: title }, content, slug, seoConfig })
        .where(and(eq(pages.id, existingId), eq(pages.tenantId, tenantId)));
    } else {
      await db.insert(pages).values({
        id: crypto.randomUUID(),
        tenantId,
        title: { id: title },
        content,
        slug: slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
        seoConfig,
      });
    }
    revalidatePath("/pages");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPages(tenantId: string) {
  return db.select().from(pages).where(eq(pages.tenantId, tenantId));
}
