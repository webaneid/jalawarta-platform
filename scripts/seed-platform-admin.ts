/**
 * Seed script: Membuat akun PLATFORM_ADMIN untuk mengelola SaaS Platform
 * User ini tidak terikat tenant manapun — akses via platform.localhost
 * Jalankan dengan: bun run scripts/seed-platform-admin.ts
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
  const email = "platform@jalawarta.local";
  const password = "platform123";

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log("✅ Platform Admin sudah ada, skip.");
    await client.end();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userId = crypto.randomUUID();

  await db.insert(schema.users).values({
    id: userId,
    name: "Platform Admin",
    email,
    password: hashedPassword,
    role: "PLATFORM_ADMIN", // Role khusus — dikenali login.ts untuk bypass tenant lookup
    isActive: true,
  });

  console.log("\n🎉 PLATFORM_ADMIN berhasil dibuat!");
  console.log("   Email   :", email);
  console.log("   Password:", password);
  console.log("   Login di: http://platform.localhost:3005/login\n");
  console.log("⚠️  SEGERA GANTI PASSWORD setelah login pertama!\n");

  await client.end();
}

seed().catch(console.error);
