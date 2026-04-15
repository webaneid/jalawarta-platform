"use server";

import { db } from "@/db";
import { users, tenants, tenantMembers, posts, pages } from "@/db/schema";
import { eq, and, or, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Fetch all members of a specific tenant
 */
export async function getTenantMembers(tenantId: string) {
  try {
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        isActive: users.isActive,
        role: tenantMembers.role,
        joinedAt: tenantMembers.createdAt,
      })
      .from(tenantMembers)
      .innerJoin(users, eq(tenantMembers.userId, users.id))
      .where(eq(tenantMembers.tenantId, tenantId))
      .orderBy(tenantMembers.createdAt);

    return { success: true, members };
  } catch (err: any) {
    console.error("[getTenantMembers] Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Create a new user or recruit an existing one into a tenant
 */
export async function addTenantMemberAction(data: {
  email: string;
  role: string;
  tenantId: string;
  username?: string;
  displayName?: string;
  fullName?: string;
  password?: string;
}) {
  const { email, role, tenantId, username, displayName, fullName, password } = data;

  try {
    // 1. Find user by email
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // 2. If user doesn't exist, create a new one (Direct Creation)
    if (!user) {
      if (!username || !password) {
        throw new Error("Username dan Password wajib diisi untuk user baru.");
      }

      // Check if username already taken
      const [existingUserByUsername] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUserByUsername) {
        throw new Error("Username sudah digunakan oleh orang lain.");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUserId = crypto.randomUUID();

      const [newUser] = await db.insert(users).values({
        id: newUserId,
        email,
        username,
        password: hashedPassword,
        name: fullName || displayName || username,
        displayName: displayName || fullName || username,
      }).returning();

      user = newUser;
    }

    // 3. Check if already a member
    const [existingMember] = await db
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.userId, user.id), eq(tenantMembers.tenantId, tenantId)))
      .limit(1);

    if (existingMember) {
      throw new Error("User sudah menjadi anggota di tenant ini.");
    }

    // 4. Add to tenant_members
    await db.insert(tenantMembers).values({
      userId: user.id,
      tenantId: tenantId,
      role: role as any,
    });

    revalidatePath("/app/users");
    return { success: true };
  } catch (err: any) {
    console.error("[addTenantMemberAction] Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update a member's role
 */
export async function updateMemberRoleAction(userId: string, tenantId: string, newRole: string) {
  try {
    await db
      .update(tenantMembers)
      .set({ role: newRole as any })
      .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, tenantId)));

    revalidatePath("/app/users");
    return { success: true };
  } catch (err: any) {
    console.error("[updateMemberRoleAction] Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove a member from the tenant
 */
export async function removeMemberAction(userId: string, tenantId: string) {
  try {
    // Check if trying to remove the owner (not allowed here, owner is in tenants table)
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), eq(tenants.ownerId, userId)))
      .limit(1);

    if (tenant) {
      throw new Error("Pemilik tenant (Owner) tidak dapat dihapus dari daftar anggota.");
    }

    await db
      .delete(tenantMembers)
      .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, tenantId)));

    revalidatePath("/app/users");
    return { success: true };
  } catch (err: any) {
    console.error("[removeMemberAction] Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get detailed information for a single user
 */
export async function getUserDetailAction(userId: string) {
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        bio: users.bio,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new Error("Pengguna tidak ditemukan.");

    // Ambil statistik konten
    const [postsCount] = await db
      .select({ val: count() })
      .from(posts)
      .where(eq(posts.authorId, userId));

    const [pagesCount] = await db
      .select({ val: count() })
      .from(pages)
      .where(eq(pages.authorId, userId));

    return { 
      success: true, 
      user: {
        ...user,
        stats: {
          posts: postsCount?.val || 0,
          pages: pagesCount?.val || 0
        }
      } 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update user profile and optional password (Admin only action)
 */
export async function updateUserAction(userId: string, data: {
  name?: string;
  username?: string;
  displayName?: string;
  email?: string;
  password?: string;
  bio?: string;
}) {
  try {
    const updateData: any = {
      name: data.name,
      username: data.username,
      displayName: data.displayName,
      email: data.email,
      bio: data.bio,
    };

    if (data.password && data.password.trim().length > 0) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    revalidatePath("/app/users");
    revalidatePath(`/app/users/${userId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserStatusAction(userId: string) {
  try {
    const [user] = await db.select({ isActive: users.isActive }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error("Pengguna tidak ditemukan.");

    await db.update(users).set({ isActive: !user.isActive }).where(eq(users.id, userId));

    revalidatePath("/app/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Safely delete a user if they have no content
 */
export async function deleteUserAction(userId: string) {
  try {
    // Check posts
    const [p] = await db.select({ c: count() }).from(posts).where(eq(posts.authorId, userId));
    const [pg] = await db.select({ c: count() }).from(pages).where(eq(pages.authorId, userId));

    if ((p?.c || 0) > 0 || (pg?.c || 0) > 0) {
      throw new Error("Pengguna tidak bisa dihapus karena telah memiliki konten (Artikel/Halaman). Silakan nonaktifkan saja akunnya.");
    }

    // Check if user is owner of a tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.ownerId, userId)).limit(1);
    if (tenant) {
      throw new Error("Pengguna adalah pemilik utama situs. Pindahkan kepemilikan sebelum menghapus.");
    }

    // Delete relation first then user
    await db.delete(tenantMembers).where(eq(tenantMembers.userId, userId));
    await db.delete(users).where(eq(users.id, userId));

    revalidatePath("/app/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
