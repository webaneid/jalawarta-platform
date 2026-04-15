/**
 * Seed script: Mendaftarkan plugin-plugin Add-on ke tabel `plugins`
 * Jalankan dengan: bun run scripts/seed-plugins.ts
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const client = postgres(
  process.env.DATABASE_URL || "postgresql://webane@localhost:5432/jalawarta",
  { prepare: false }
);
const db = drizzle({ client, schema });

const PLUGINS_TO_SEED = [
  {
    id: "ai-article-generator",
    name: "AI Article & Content Generator",
    description:
      "Hasilkan artikel lengkap dan optimalkan konten secara otomatis menggunakan AI (Gemini, ChatGPT, Claude) langsung dari editor Jala Warta.",
    configSchema: {
      type: "object",
      properties: {
        aiCreditsLimit: { type: "number", default: 20, title: "Batas Kredit AI Teks" },
        aiCreditsUsed: { type: "number", default: 0 },
        preferredProvider: {
          type: "string",
          default: "gemini",
          enum: ["gemini", "openai_chatgpt", "claude"],
        },
        preferredModel: { type: "string", default: "gemini-2.5-flash" },
        defaultLanguage: { type: "string", default: "id" },
        defaultTone: { type: "string", default: "professional" },
      },
    },
  },
  {
    id: "ai-image-generator",
    name: "AI Image Generator",
    description:
      "Buat gambar visual premium secara instan dari teks menggunakan AI (Gemini Imagen, DALL-E, Fal.ai Flux) langsung dari Media Library.",
    configSchema: {
      type: "object",
      properties: {
        aiImageCreditsLimit: { type: "number", default: 10, title: "Batas Kredit AI Gambar" },
        aiImageCreditsUsed: { type: "number", default: 0 },
        preferredProvider: {
          type: "string",
          default: "openai_dalle",
          enum: ["openai_dalle", "gemini_imagen", "fal_flux", "ideogram", "midjourney"],
        },
      },
    },
  },
  {
    id: "ai-insights",
    name: "AI Content Insights",
    description:
      "Mesin pencari tren berita dan sosial media cerdas (Serper, RapidAPI, Firecrawl) yang otomatis membuat artikel langsung dari sumbernya.",
    configSchema: {
      type: "object",
      properties: {
        isEnabled: { type: "boolean", default: true },
        preferredPlatforms: {
          type: "array",
          default: ["tiktok"],
          items: { type: "string", enum: ["tiktok", "twitter", "google_trends"] },
        },
      },
    },
  },
  {
    id: "google-search-analytics",
    name: "Google Search & Analytics",
    description:
      "Pelacakan pengunjung (GA4) dan verifikasi kepemilikan Google Search Console.",
    configSchema: {
      type: "object",
      properties: {
        gaMeasurementId: { type: "string", default: "", title: "GA4 Measurement ID (G-XXXXXXX)" },
        gscVerificationCode: { type: "string", default: "", title: "GSC HTML Meta Verification Code" },
      },
    },
  },
  {
    id: "meta-pixel",
    name: "Meta Pixel Advanced",
    description:
      "Analisis konversi dan audience retargeting via Facebook (Meta) Pixel.",
    configSchema: {
      type: "object",
      properties: {
        pixelId: { type: "string", default: "", title: "Meta Pixel ID" },
        enableAdvancedMatching: { type: "boolean", default: false },
      },
    },
  },
  {
    id: "advanced-contact-form",
    name: "Contact Form Advanced",
    description:
      "Formulir kontak dinamis dengan visual builder drag-and-drop dan manajemen pesan masuk.",
    configSchema: {
      type: "object",
      properties: {
        recipientEmail: { type: "string", default: "", title: "Email Penerima Notifikasi" },
        enableSpamFilter: { type: "boolean", default: true },
      },
    },
  },
];

async function seedPlugins() {
  console.log("🔌 Memulai seed plugin...\n");

  for (const plugin of PLUGINS_TO_SEED) {
    const existing = await db
      .select({ id: schema.plugins.id })
      .from(schema.plugins)
      .where(eq(schema.plugins.id, plugin.id))
      .limit(1);

    if (existing.length > 0) {
      // Update jika sudah ada (untuk memperbarui deskripsi/schema)
      await db
        .update(schema.plugins)
        .set({ name: plugin.name, description: plugin.description, configSchema: plugin.configSchema })
        .where(eq(schema.plugins.id, plugin.id));
      console.log(`✅ Plugin "${plugin.id}" sudah ada — diperbarui.`);
    } else {
      await db.insert(schema.plugins).values(plugin);
      console.log(`🆕 Plugin "${plugin.id}" berhasil ditambahkan.`);
    }
  }

  console.log("\n🎉 Seed plugin selesai!");
  await client.end();
}

seedPlugins().catch(console.error);
