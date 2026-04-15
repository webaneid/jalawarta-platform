"use server";

import { db } from "@/db";
import { presence, users } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { auth } from "@/auth";

/**
 * Memperbarui status kehadiran pengguna pada artikel tertentu.
 * Juga melakukan pembersihan otomatis terhadap data yang sudah tidak aktif (> 30 detik).
 */
export async function pingPresence(postId: string, tenantId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;
  const now = new Date();
  const threshold = new Date(now.getTime() - 30 * 1000); // 30 detik yang lalu

  try {
    // 1. Upsert Presence
    // Kita gunakan pendekatan manual: cek dulu baru insert/update karena Drizzle pg-core 
    // upsert bisa sedikit tricky tergantung versi postgres.
    const existing = await db
      .select()
      .from(presence)
      .where(
        and(
          eq(presence.postId, postId),
          eq(presence.userId, userId),
          eq(presence.tenantId, tenantId)
        )
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(presence)
        .set({ lastActive: now })
        .where(eq(presence.id, existing[0].id));
    } else {
      await db.insert(presence).values({
        postId,
        userId,
        tenantId,
        lastActive: now,
      });
    }

    // 2. Cleanup stale presence (older than 30s) secara asinkron (optional optimization)
    // Untuk kesederhanaan, kita jalankan di sini saja
    await db.delete(presence).where(lt(presence.lastActive, threshold));

    return { success: true };
  } catch (err: any) {
    console.error("Presence Ping Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Mengambil daftar pengguna yang sedang aktif di artikel ini.
 */
export async function getPresence(postId: string, tenantId: string) {
  const now = new Date();
  const threshold = new Date(now.getTime() - 30 * 1000);

  try {
    const activeMembers = await db
      .select({
        id: users.id,
        name: users.name,
        displayName: users.displayName,
        image: users.image,
      })
      .from(presence)
      .innerJoin(users, eq(presence.userId, users.id))
      .where(
        and(
          eq(presence.postId, postId),
          eq(presence.tenantId, tenantId),
          gt(presence.lastActive, threshold)
        )
      );

    return { success: true, data: activeMembers };
  } catch (err: any) {
    console.error("Presence Fetch Error:", err);
    return { success: false, error: err.message, data: [] };
  }
}

// Helper function for Drizzle lt (less than) if not imported
import { lt } from "drizzle-orm";
