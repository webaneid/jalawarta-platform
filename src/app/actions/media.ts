"use server";

import { db } from "@/db";
import { media } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import { join } from "path";

export async function getMedia(tenantId: string) {
  return db
    .select()
    .from(media)
    .where(eq(media.tenantId, tenantId))
    .orderBy(media.createdAt); // We'll reverse it in UI or use desc here, let's keep it desc
}

export async function deleteMediaAction(id: string, tenantId: string) {
  try {
    // 1. Get the media record to find the filename
    const [record] = await db
      .select({ url: media.url })
      .from(media)
      .where(and(eq(media.id, id), eq(media.tenantId, tenantId)))
      .limit(1);

    if (!record) {
      throw new Error("Media tidak ditemukan");
    }

    // 2. Remove from database
    await db.delete(media).where(and(eq(media.id, id), eq(media.tenantId, tenantId)));

    // 3. Remove from file system
    // URL is usually like: /uploads/tenantId/filename.ext
    // We need to map it back to public/uploads/tenantId/filename.ext
    const filename = record.url.split("/").pop();
    if (filename) {
      const filePath = join(process.cwd(), "public", "uploads", tenantId, filename);
      try {
        await unlink(filePath);
      } catch (err: any) {
        if (err.code !== "ENOENT") {
           console.error("[deleteMediaAction] Error deleting file:", err);
        }
      }
    }

    revalidatePath("/media");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMediaMetadata(
  id: string,
  tenantId: string,
  data: { altText?: string | null; caption?: string | null; description?: string | null }
) {
  try {
    await db
      .update(media)
      .set({
        altText: data.altText,
        caption: data.caption,
        description: data.description,
      })
      .where(and(eq(media.id, id), eq(media.tenantId, tenantId)));
      
    revalidatePath("/app/media");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
