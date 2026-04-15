"use server";

import { db } from "@/db";
import { tags, postTags } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function toSlug(str: string) {
  return str.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "").slice(0, 100);
}

export async function getTags(tenantId: string) {
  return db.select().from(tags).where(eq(tags.tenantId, tenantId));
}

export async function saveTag({
  tenantId,
  name,
  existingId,
}: {
  tenantId: string;
  name: string;
  existingId?: string;
}) {
  try {
    if (existingId) {
      await db
        .update(tags)
        .set({ name, slug: toSlug(name) })
        .where(and(eq(tags.id, existingId), eq(tags.tenantId, tenantId)));
    } else {
      await db.insert(tags).values({
        id: crypto.randomUUID(),
        tenantId,
        name,
        slug: toSlug(name),
      });
    }
    revalidatePath("/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTag(id: string, tenantId: string) {
  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.tenantId, tenantId)));
  revalidatePath("/tags");
  return { success: true };
}

export async function getPostTags(postId: string) {
  return db.select().from(postTags).where(eq(postTags.postId, postId));
}

export async function syncPostTags(postId: string, tagIds: string[]) {
  await db.delete(postTags).where(eq(postTags.postId, postId));
  if (tagIds.length > 0) {
    await db.insert(postTags).values(tagIds.map((tagId) => ({ postId, tagId })));
  }
  return { success: true };
}

export async function bulkSyncPostTags(postId: string, tenantId: string, tagsData: { id: string; name: string }[]) {
  await db.delete(postTags).where(eq(postTags.postId, postId));
  
  if (tagsData.length === 0) return { success: true };

  const finalTagIds: string[] = [];
  
  for (const tag of tagsData) {
    if (tag.id.startsWith("new-")) {
      const existing = await db.select().from(tags).where(and(eq(tags.tenantId, tenantId), eq(tags.name, tag.name))).limit(1);
      if (existing.length > 0) {
        finalTagIds.push(existing[0].id);
      } else {
        const newId = crypto.randomUUID();
        await db.insert(tags).values({
          id: newId,
          tenantId,
          name: tag.name,
          slug: toSlug(tag.name),
        });
        finalTagIds.push(newId);
      }
    } else {
      finalTagIds.push(tag.id);
    }
  }

  await db.insert(postTags).values(finalTagIds.map((tagId) => ({ postId, tagId })));
  
  revalidatePath("/tags");
  return { success: true };
}
