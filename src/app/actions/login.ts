"use server";

import { db } from "@/db";
import { users, tenants, tenantMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function login(email: string, password: string) {
  // Cari user
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = result[0];
  if (!user || !user.password) {
    return { error: "Email atau password salah." };
  }

  if (user.isActive === false) {
    return { error: "Akun Anda telah dinonaktifkan. Silakan hubungi administrator." };
  }

  // Verifikasi password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { error: "Email atau password salah." };
  }

  // Ambil tenant
  const tenantResult = await db
    .select({ id: tenants.id, subdomain: tenants.subdomain, ownerId: tenants.ownerId })
    .from(tenants)
    .where(eq(tenants.ownerId, user.id))
    .limit(1);

  const tenant = tenantResult[0];

  // Ambil role (Tenant Member)
  const memberResult = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(and(eq(tenantMembers.userId, user.id), eq(tenantMembers.tenantId, tenant?.id || "")))
    .limit(1);

  let role = memberResult[0]?.role || null;
  if (!role && tenant?.id) {
    // Fallback: cek jika dia owner tenant (SUPER_ADMIN)
    if (tenant.ownerId === user.id) role = "SUPER_ADMIN";
  }

  // Buat session cookie
  await createSession({
    userId: user.id,
    tenantId: tenant?.id || null,
    subdomain: tenant?.subdomain || null,
    name: user.name,
    email: user.email,
    role: role || "SUBSCRIBER",
  });

  return { success: true };
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
