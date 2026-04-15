/**
 * Seed script: Membuat akun admin demo untuk testing auth
 * Jalankan dengan: bun run scripts/seed-admin.ts
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const client = postgres(process.env.DATABASE_URL || "postgresql://webane@localhost:5432/jalawarta", { prepare: false });
const db = drizzle({ client, schema });

async function seed() {
  const email = "admin@jalawarta.local";
  const password = "password123";
  const subdomain = "demo";

  // Cek apakah sudah ada
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);

  if (existing.length > 0) {
    console.log("✅ Admin sudah ada, skip.");
    await client.end();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userId = crypto.randomUUID();

  // Buat user
  await db.insert(schema.users).values({
    id: userId,
    name: "Admin Jala Warta",
    email,
    password: hashedPassword,
    role: "TENANT_OWNER",
  });

  // Buat tenant (atau gunakan yang sudah ada)
  const existingTenant = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.subdomain, subdomain)).limit(1);

  if (existingTenant.length === 0) {
    await db.insert(schema.tenants).values({
      id: "demo-tenant", // sama dengan hardcode yang sedang dipakai
      ownerId: userId,
      subdomain,
      siteName: "Demo Berita",
      subscriptionStatus: "TRIAL",
    });
    console.log("✅ Tenant 'demo' berhasil dibuat.");
  } else {
    // Update ownerId jika tenant sudah ada
    await db.update(schema.tenants).set({ ownerId: userId }).where(eq(schema.tenants.id, existingTenant[0].id));
    console.log("✅ Tenant sudah ada, owner diperbarui.");
  }

  console.log("\n🎉 Seed berhasil!");
  console.log("   Email   :", email);
  console.log("   Password:", password);
  console.log("   Login di: http://app.localhost:3005/login\n");

  await client.end();
}

seed().catch(console.error);
