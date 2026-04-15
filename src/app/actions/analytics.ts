"use server";

import { db } from "@/db";
import { posts, pages, comments, media, auditLogs, users } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function getTenantStats(tenantId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const [postsCount] = await db.select({ value: count() }).from(posts).where(eq(posts.tenantId, tenantId));
  const [pagesCount] = await db.select({ value: count() }).from(pages).where(eq(pages.tenantId, tenantId));
  const [commentsCount] = await db.select({ value: count() }).from(comments).where(eq(comments.tenantId, tenantId));
  const [mediaCount] = await db.select({ value: count() }).from(media).where(eq(media.tenantId, tenantId));

  return {
    posts: postsCount?.value || 0,
    pages: pagesCount?.value || 0,
    comments: commentsCount?.value || 0,
    media: mediaCount?.value || 0,
  };
}

export async function getRecentActivity(tenantId: string, limit = 10) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return logs;
}
