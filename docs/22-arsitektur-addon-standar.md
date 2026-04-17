# Standar Arsitektur Add-on Jalawarta

Dokumen ini adalah **blueprint wajib** untuk membangun add-on baru di Jalawarta — baik yang berjalan di sisi tenant (CMS) maupun yang dikontrol dari platform (Super Admin). Setiap add-on baru **harus** mengikuti pola ini agar konsisten dengan ekosistem yang sudah ada.

Dokumen referensi pendukung:
- [`14-arsitektur-platform-web.md`](./14-arsitektur-platform-web.md) — model bisnis SaaS dan hierarki admin
- [`16-arsitektur-platform-apikey.md`](./16-arsitektur-platform-apikey.md) — cara add-on mengambil API Key dari Vault
- [`21-arsitektur-platform-implementasi.md`](./21-arsitektur-platform-implementasi.md) — status implementasi platform saat ini

---

## 1. Dua Tipe Add-on

### Tipe A: Inject Add-on
Add-on yang menyuntikkan kode ke dalam antarmuka publik tenant (header/footer). Tidak membutuhkan UI manajemen yang kompleks — hanya form konfigurasi ID/token.

**Contoh:** Meta Pixel, Google Analytics/Search Console

**Karakteristik:**
- Config sederhana: satu atau dua field (Pixel ID, Measurement ID)
- Dirender via komponen React di `src/plugins/` pada `<head>` halaman publik
- Tidak membuat tabel DB tambahan

### Tipe B: Feature Add-on
Add-on yang menambahkan fitur baru dengan UI mandiri, halaman manajemen, dan tabel database sendiri.

**Contoh:** Contact Form Advanced, AI Article Generator, AI Insights

**Karakteristik:**
- Punya halaman manajemen penuh di `/app/addons/[slug]/`
- Membuat tabel DB tambahan (di luar `plugins` dan `tenantPlugins`)
- Bisa punya halaman konfigurasi global di `/platform/addons/[slug]/`

---

## 2. Struktur File Standar

### Tipe A (Inject Add-on)
```
src/
├── plugins/[nama-addon]/
│   └── index.tsx                    ← Komponen React untuk injeksi (head/body)
├── app/app/addons/[nama-addon]/
│   ├── page.tsx                     ← Halaman config tenant (Server Component)
│   └── [NamaAddon]Form.tsx          ← Form konfigurasi (Client Component)
└── scripts/seed-plugins.ts          ← Tambahkan entry plugin di sini
```

### Tipe B (Feature Add-on)
```
src/
├── app/app/addons/[nama-addon]/
│   ├── page.tsx                     ← List/Overview (Server Component)
│   ├── [id]/page.tsx                ← Detail/Editor item
│   ├── [id]/[sub-fitur]/page.tsx    ← Sub-halaman (inbox, preview, dll)
│   └── [NamaAddon]Client.tsx        ← Client Components
├── app/platform/addons/[nama-addon]/
│   ├── page.tsx                     ← Config global atau monitoring (Server Component)
│   └── Platform[NamaAddon]Client.tsx ← Client Component admin
├── app/actions/[nama-addon].ts      ← Server Actions tenant-facing
├── components/addons/[nama-addon]/  ← Komponen UI (form renderer, dll)
│   └── [NamaAddon]Renderer.tsx      ← Renderer untuk frontend publik (jika ada)
└── scripts/seed-plugins.ts          ← Tambahkan entry plugin di sini
```

---

## 3. Tahapan Membangun Add-on Baru

### Langkah 1: Daftarkan Plugin ke Database

Tambahkan entry di `scripts/seed-plugins.ts`:

```typescript
{
  id: "nama-addon",                    // kebab-case, unik, tidak boleh diubah setelah seed
  name: "Nama Add-on",
  description: "Deskripsi singkat fungsi add-on ini.",
  configSchema: {                      // JSON Schema — mendefinisikan shape config per tenant
    type: "object",
    properties: {
      fieldSatu: { type: "string", title: "Label Field", default: "" },
      fieldDua:  { type: "boolean", title: "Aktifkan Fitur X", default: false },
    },
  },
}
```

Jalankan: `bun run scripts/seed-plugins.ts`

> **Penting:** `id` plugin bersifat **permanen**. Ubah `id` setelah data produksi ada = referensi `tenantPlugins.pluginId` rusak.

---

### Langkah 2: Daftarkan ke Plugin Registry (khusus Inject Add-on)

Tambahkan di `src/lib/plugins/registry.ts`:

```typescript
import { NamaAddonPlugin } from "@/plugins/nama-addon";

export const PLUGIN_REGISTRY: Record<string, PluginDefinition> = {
  // ... existing plugins
  "nama-addon": {
    id: "nama-addon",
    name: "Nama Add-on",
    description: "...",
    component: NamaAddonPlugin,
    supportedSlots: ["header"],       // "header" | "footer" | "sidebar" | "content"
  },
};
```

---

### Langkah 3: Buat Tabel Database (khusus Feature Add-on)

Tambahkan tabel baru di `src/db/schema.ts`. **Wajib** sertakan `tenantId` sebagai foreign key:

```typescript
export const namaAddonItems = pgTable("nama_addon_items", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:  text("tenant_id").notNull().references(() => tenants.id),
  // ... kolom spesifik add-on
  data:      jsonb("data"),           // gunakan JSONB untuk field dinamis
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

Jalankan: `bun x drizzle-kit push`

---

### Langkah 4: Buat Server Actions

**File:** `src/app/actions/[nama-addon].ts`

```typescript
"use server";

import { getSession } from "@/lib/session";
import { db } from "@/db";
// ... import tabel

const PLUGIN_ID = "nama-addon";

// Helper wajib: verifikasi plugin aktif untuk tenant
async function verifyPluginActive(tenantId: string) {
  const [row] = await db
    .select()
    .from(tenantPlugins)
    .where(and(eq(tenantPlugins.tenantId, tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)))
    .limit(1);

  if (!row || row.status !== "ACTIVE") {
    throw new Error("Add-on belum diaktifkan untuk tenant ini.");
  }
  return row;
}

// Aksi tenant-facing
export async function getItems() {
  const session = await getSession();
  if (!session?.tenantId) return { error: "Unauthorized" };

  await verifyPluginActive(session.tenantId);

  return db
    .select()
    .from(namaAddonItems)
    .where(eq(namaAddonItems.tenantId, session.tenantId));  // [SP-01] wajib filter tenantId
}

export async function saveItem(data: { id?: string; /* ... */ }) {
  const session = await getSession();
  if (!session?.tenantId) return { error: "Unauthorized" };

  await verifyPluginActive(session.tenantId);

  // upsert
  await db.insert(namaAddonItems)
    .values({ id: data.id ?? crypto.randomUUID(), tenantId: session.tenantId, ...data })
    .onConflictDoUpdate({ target: namaAddonItems.id, set: { ...data, updatedAt: new Date() } });

  revalidatePath("/addons/nama-addon");
  return { success: true };
}
```

---

### Langkah 5: Buat Halaman Tenant

**`src/app/app/addons/[nama-addon]/page.tsx`** (Server Component):

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTenantAddons } from "@/app/actions/addons";

export default async function NamaAddonPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const { addons } = await getTenantAddons(session.user.tenantId);
  const plugin = addons?.find(a => a.id === "nama-addon");

  // Guard: redirect jika tidak aktif
  if (!plugin || plugin.status !== "ACTIVE") redirect("/addons");

  // ... fetch data spesifik add-on
  return <NamaAddonClient /* props */ />;
}
```

---

### Langkah 6: Buat Halaman Platform (opsional, untuk monitoring/global config)

**`src/app/platform/addons/[nama-addon]/page.tsx`**:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function PlatformNamaAddonPage() {
  const session = await getSession();
  if (!session?.email) redirect("/login");

  const dbUser = await db.query.users.findFirst({ where: eq(users.email, session.email) });
  if (!dbUser || dbUser.role !== "PLATFORM_ADMIN") redirect("/");

  // fetch monitoring data
  return <PlatformNamaAddonClient /* ... */ />;
}
```

---

## 4. Config Schema & JSONB

Setiap add-on menyimpan konfigurasi **per tenant** di `tenantPlugins.config` (JSONB). Shape config didefinisikan di `plugins.configSchema`.

### Aturan Config:
1. **Gunakan nilai default yang aman** — jangan biarkan field wajib kosong tanpa fallback
2. **Jangan simpan data sensitif** (API Key, secret) di `tenantPlugins.config` — gunakan Platform API Key Vault
3. **Untuk kredit/quota**, simpan dua field berpasangan: `xxxCreditsLimit` + `xxxCreditsUsed`

### Contoh config lengkap (AI Generator):
```jsonb
{
  "aiCreditsLimit": 20,
  "aiCreditsUsed": 7,
  "preferredProvider": "gemini",
  "preferredModel": "gemini-1.5-pro",
  "defaultLanguage": "id",
  "defaultTone": "professional",
  "templates": []
}
```

### Cara update config dari Server Action:
```typescript
// Selalu spread config lama, timpa hanya field yang berubah
await db.update(tenantPlugins)
  .set({ config: { ...existingConfig, ...updates } })
  .where(and(
    eq(tenantPlugins.tenantId, tenantId),
    eq(tenantPlugins.pluginId, PLUGIN_ID)
  ));
```

---

## 5. Mengambil API Key dari Vault

Jika add-on butuh API Key eksternal (AI, payment, dll), **jangan simpan key di `tenantPlugins.config`**. Gunakan Platform API Key Vault:

```typescript
// Di Server Action — server side only
import { getDecryptedCredential } from "@/app/actions/apikeys";

const apiKey = await getDecryptedCredential("nama_kategori", "nama_provider");
if (!apiKey) {
  return { error: "API Key belum dikonfigurasi. Hubungi administrator." };
}
```

Kategori yang tersedia (`src/lib/api-categories.ts`):
- `ai_text_generation` — Gemini, OpenAI, Claude
- `ai_image_generation` — DALL-E, Gemini Imagen, Fal.ai
- `payment_gateway` — Midtrans, Xendit, Stripe
- `seo_analytics` — Google APIs
- `marketing_pixel` — Meta, TikTok
- `news_api` — Google News, NewsAPI
- `web_scraper` — Scraping services
- `rapidapi_hub` — RapidAPI

Lihat [`16-arsitektur-platform-apikey.md`](./16-arsitektur-platform-apikey.md) untuk detail enkripsi.

---

## 6. Subscription Gating (Lisensi Per Paket)

Add-on hanya bisa diaktifkan jika masuk dalam `packages.features.allowedAddons` paket langganan tenant. Ini ditangani otomatis oleh `getTenantAddons()`.

Di UI (`/app/addons/page.tsx`), add-on yang belum diizinkan paket tampil dengan badge **LOCKED** dan tombol "Upgrade Required".

Jika add-on perlu dicek secara manual di Server Action:
```typescript
const { addons } = await getTenantAddons(tenantId);
const plugin = addons?.find(a => a.id === PLUGIN_ID);
if (!plugin?.isAllowedByPackage) {
  return { error: "Upgrade paket Anda untuk menggunakan fitur ini." };
}
```

---

## 7. Injeksi ke Frontend Publik (Inject Add-on)

Komponen plugin dirender di layout publik tenant berdasarkan add-on yang aktif:

```typescript
// Contoh di src/app/[domain]/layout.tsx
import { PLUGIN_REGISTRY } from "@/lib/plugins/registry";

// Ambil semua plugin aktif untuk tenant
const activePlugins = tenantPlugins.filter(p => p.status === "ACTIVE");

// Render komponen untuk setiap slot yang dibutuhkan
const headerPlugins = activePlugins
  .filter(p => PLUGIN_REGISTRY[p.pluginId]?.supportedSlots.includes("header"))
  .map(p => ({
    Component: PLUGIN_REGISTRY[p.pluginId].component,
    config: p.config,
  }));
```

---

## 8. Protokol Keamanan Add-on

Setiap add-on wajib mematuhi protokol keamanan berikut:

| Protokol | Implementasi |
|---|---|
| **[SP-01] Anti Cross-Tenant** | Setiap query DB **wajib** `where(eq(tabel.tenantId, session.tenantId))` |
| **[SP-02] Safe-Delete** | Jangan hard-delete record yang ada relasi. Gunakan `status` atau `isActive` |
| **[SP-04] Auth Check** | Setiap Server Action wajib verifikasi session di baris pertama |
| **[SP-05] API Key** | Key eksternal **hanya** diambil via `getDecryptedCredential()` di server |

Tambahan khusus add-on:
- Verifikasi plugin `status === "ACTIVE"` sebelum eksekusi operasi apapun
- Untuk public-facing actions (seperti form submission): validasi `tenantId` + `formId` meski tanpa login
- Jangan kirim config mentah ke client jika berisi data sensitif

---

## 9. Checklist Add-on Baru

Gunakan checklist ini sebelum menganggap add-on selesai:

**Database & Setup:**
- [ ] Entry di `scripts/seed-plugins.ts` dengan `id`, `name`, `description`, `configSchema`
- [ ] `bun run scripts/seed-plugins.ts` berhasil dijalankan
- [ ] Tabel DB tambahan dibuat (jika Feature Add-on) + `bun x drizzle-kit push`
- [ ] Entry di `src/lib/plugins/registry.ts` (jika Inject Add-on)

**Server Actions:**
- [ ] File `src/app/actions/[nama-addon].ts` dengan helper `verifyPluginActive()`
- [ ] Semua fungsi cek session di baris pertama
- [ ] Semua query DB filter `tenantId`
- [ ] Fungsi platform admin (jika perlu monitoring) dengan cek `PLATFORM_ADMIN`

**Halaman Tenant:**
- [ ] `/app/addons/[slug]/page.tsx` — guard redirect jika plugin tidak aktif
- [ ] Form konfigurasi memanggil `updateAddonConfigAction()` via Server Action
- [ ] Halaman manajemen data (jika Feature Add-on)

**Halaman Platform (opsional):**
- [ ] `/platform/addons/[slug]/page.tsx` dengan guard `PLATFORM_ADMIN`
- [ ] Tambahkan link di sidebar platform jika relevan

**Frontend Publik (jika Inject Add-on):**
- [ ] Komponen React di `src/plugins/[slug]/index.tsx`
- [ ] Props dari `tenantPlugins.config` — tidak ada hardcode
- [ ] Graceful jika config kosong (zero-output, tidak error)

**Keamanan:**
- [ ] SP-01: Semua query ada filter `tenantId`
- [ ] SP-04: Auth check di setiap Server Action
- [ ] SP-05: API Key via Vault, tidak di `tenantPlugins.config`

---

## 10. Referensi Add-on yang Sudah Ada

| Add-on | Tipe | File Utama | Fitur Khas |
|---|---|---|---|
| `meta-pixel` | Inject | `src/plugins/meta-pixel/index.tsx` | Script injection di `<head>` |
| `google-search-analytics` | Inject | `src/plugins/google-analytics/index.tsx` | GA4 + GSC meta tag |
| `advanced-contact-form` | Feature | `src/app/actions/contact-forms.ts` | Form builder, shortcode, inbox |
| `ai-article-generator` | Feature | `src/app/actions/ai-generate.ts` | API Vault + kredit sistem, platform monitoring |
| `ai-image-generator` | Feature | *(direncanakan)* | API Vault, kredit gambar |
| `ai-insights` | Feature | `src/app/actions/insights-*.ts` | News + social search, AI summarize |

---

*Terakhir diperbarui: 17 April 2026 | Dokumen ini wajib diperbarui setiap kali pola add-on berevolusi*
