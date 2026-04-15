"use server";

import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function registerAdmin({
  name,
  email,
  password,
  subdomain,
  siteName,
}: {
  name: string;
  email: string;
  password: string;
  subdomain: string;
  siteName: string;
}) {
  try {
    // Cek email duplikat
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return { success: false, error: "Email sudah terdaftar." };

    // Hash password — simpan di field `image` sementara (akan dipindah ke field password proper nanti)
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const tenantId = crypto.randomUUID();

    // Insert user
    await db.insert(users).values({
      id: userId,
      name,
      email,
      image: hashedPassword, // sementara simpan di image
      role: "TENANT_OWNER",
    });

    // Insert tenant
    await db.insert(tenants).values({
      id: tenantId,
      ownerId: userId,
      subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      siteName,
      subscriptionStatus: "TRIAL",
    });

    return { success: true, tenantId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
