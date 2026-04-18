# Arsitektur Web Platform (Super Admin — `platform.localhost`)

Dokumen ini adalah **sumber kebenaran aktual** arsitektur dan implementasi dasbor Platform Jala Warta. Selalu sinkron dengan kondisi kode terkini.

---

## 1. Filosofi & Hierarki Kendali

Jala Warta SaaS beroperasi dalam **3 level piramida manajemen**:

```
┌─────────────────────────────────────────┐
│  LEVEL 1 — PLATFORM_ADMIN               │
│  platform.localhost                     │
│  · Kelola paket SaaS & kuota            │
│  · Kelola API Key Vault global          │
│  · Lihat & kelola semua tenant          │
│  · Atur add-on ecosystem                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  LEVEL 2 — SUPER_ADMIN (Tenant Owner)   │
│  app.localhost                          │
│  · Aktifkan add-on dari marketplace     │
│  · Kelola user & role tim redaksi       │
│  · Konfigurasi situs & custom domain    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  LEVEL 3 — EDITOR / WRITER / SUBSCRIBER │
│  app.localhost                          │
│  · Tulis & publish konten               │
└─────────────────────────────────────────┘
```

*(Lihat [`15-arsitektur-domain-topologi.md`] untuk penjelasan 4 Pilar Resolusi Sub-Domain di Middleware.)*

---

## 2. Auth & Guard — Double-Check Pattern

### Alur di Middleware (`src/proxy.ts`)

```
Request → proxy.ts
  ├─ hostname === "platform.localhost"?
  │     ├─ pathname === "/login" → rewrite ke /app-login
  │     └─ otherwise:
  │           ├─ cek cookie jw_session (jose jwtVerify)
  │           ├─ tidak ada / invalid → redirect /login?callbackUrl=...
  │           └─ valid → rewrite ke /platform/...
```

### Double-Check di Layout (`src/app/platform/layout.tsx`)

Middleware hanya memverifikasi token valid secara kriptografi. Layout melakukan **re-verify berbasis database**:

```typescript
// 1. Baca session dari cookie
const session = await getSession();
if (!session?.email) redirect("/login");

// 2. Query DB — pastikan user benar-benar PLATFORM_ADMIN
const dbUser = await db.query.users.findFirst({
  where: eq(users.email, session.email),
});
if (!dbUser || dbUser.role !== "PLATFORM_ADMIN") redirect("/");
```

> **Mengapa double-check?** Token JWT bisa saja masih valid secara kriptografi meski role di DB sudah berubah. Re-verify ke DB mencegah privilege escalation pada operasi destruktif.

---

## 3. Skema Database Inti Platform

### 3.1 Tabel `packages` — Paket SaaS

```typescript
export const packages = pgTable("packages", {
  id: text("id").primaryKey(),          // e.g. "free", "pro", "enterprise"
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").default(0),   // Rupiah, 0 = gratis
  limits: jsonb("limits").default({     // Kuota resource per-tenant
    maxUsers: 1,
    maxPosts: 10,
    maxStorage: 52428800                // bytes (~50MB)
  }),
  features: jsonb("features").default({ // Gating fitur
    allowedModules: [],
    allowedAddons: []                   // Plugin ID yang boleh diaktifkan tenant
  }),
  isActive: boolean("is_active").default(true),
});
```

`features.allowedAddons` adalah **gating mechanism** utama — hanya plugin yang masuk array ini yang bisa diaktifkan oleh tenant dengan paket tersebut. Dicek via `isAllowedByPackage` di `getTenantAddons()` action.

### 3.2 Tabel `tenants` — Data Tenant

```typescript
export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade" }),
  subdomain: text("subdomain").unique().notNull(),
  customDomain: text("custom_domain").unique(),
  siteName: text("site_name"),
  subscriptionId: text("subscription_id").references(() => packages.id, { onDelete: "set null" }),
  subscriptionStatus: text("subscription_status").default("TRIAL"),
  // "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED"
});
```

### 3.3 Tabel `plugins` — Global Add-on Registry

```typescript
export const plugins = pgTable("plugins", {
  id: text("id").primaryKey(),          // e.g. "ai-article-generator"
  name: text("name").notNull(),
  description: text("description"),
  configSchema: jsonb("config_schema"), // JSON Schema form fields untuk config per-tenant
});
```

### 3.4 Tabel `tenantPlugins` — Instansiasi Add-on per Tenant

```typescript
export const tenantPlugins = pgTable("tenant_plugins", {
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  pluginId: text("plugin_id").references(() => plugins.id, { onDelete: "cascade" }),
  config: jsonb("config"),    // Config spesifik tenant, e.g. { measurementId: "G-XXX" }
  status: text("status").default("INACTIVE"), // "ACTIVE" | "INACTIVE"
}, (t) => ({ pk: primaryKey([t.tenantId, t.pluginId]) }));
```

### 3.5 Tabel `api_credentials` — API Key Vault

```typescript
export const apiCredentials = pgTable("api_credentials", {
  id: text("id").primaryKey(),
  category: text("category").notNull(), // 'ai_text_generation' | 'web_scraping' | 'analytics' | ...
  provider: text("provider").notNull(), // 'gemini' | 'firecrawl' | 'openai' | ...
  apiKey: text("api_key").notNull(),    // SELALU terenkripsi AES-256-GCM
  apiSecret: text("api_secret"),        // Opsional, terenkripsi
  displayName: text("display_name"),
  isActive: boolean("is_active").default(true),
}, (t) => ({
  uniqueIdx: uniqueIndex().on(t.category, t.provider) // 1 key per category+provider
}));
```

> **Detail enkripsi & alur dekripsi**: lihat [`docs/16-arsitektur-platform-apikey.md`]

---

## 4. Alur Lifecycle Add-on (Platform → Tenant)

```
[Platform Admin]
  │
  ├─ 1. Daftarkan plugin ke tabel `plugins`
  │      (id, name, description, configSchema)
  │
  ├─ 2. Tambahkan plugin ID ke `packages.features.allowedAddons`
  │      (tentukan paket mana yang boleh mengakses add-on ini)
  │
[Tenant SUPER_ADMIN]
  │
  ├─ 3. Buka /addons di CMS dashboard
  │      → getTenantAddons() join tenantPlugins + cek isAllowedByPackage
  │
  ├─ 4. Klik "Aktifkan"
  │      → upsert tenantPlugins { status: "ACTIVE" }
  │      → revalidatePath("/app", "layout") agar sidebar refresh
  │
  └─ 5. Add-on tersedia:
         · SidebarNav filter berdasarkan activeAddonIds
         · Layout add-on pasang guard cek status "ACTIVE"
         · API Key diambil dari Vault via getDecryptedCredential()
```

---

## 5. Status Implementasi Rute Platform

| Rute | Server Component | Client Component | Status | Catatan |
|---|---|---|---|---|
| `/platform` | `platform/page.tsx` | — | ✅ Selesai | Stat cards: tenants, users, packages, addons |
| `/platform/packages` | `packages/page.tsx` | `PackagesClient` | ✅ Selesai | CRUD penuh, create & edit subpage |
| `/platform/addons` | `addons/page.tsx` | `AddonsClient` | ✅ Selesai | List global plugins dari tabel `plugins` |
| `/platform/addons/ai-article-generator` | `page.tsx` | `PlatformAiConfigClient` | ✅ Selesai | Set credit limit per-tenant |
| `/platform/addons/ai-insights` | `page.tsx` | — | ✅ Selesai | Info page |
| `/platform/api-keys` | `api-keys/page.tsx` | `ApiKeysClient` | ✅ Selesai | Vault CRUD, AES-256-GCM, masked display |
| `/platform/modules` | `modules/page.tsx` | `ModulesClient` | ⚠️ Stub | UI komponen ada, tidak ada data aktual dari DB |
| `/platform/tenants` | — | — | ❌ Belum ada | Ada di sidebar → 404. Gap terbesar. |

---

## 6. Server Actions Platform

**File**: `src/app/actions/platform.ts`

| Action | Fungsi | Status |
|---|---|---|
| `savePackage(data)` | Upsert paket SaaS (create/edit) | ✅ Ada |
| `getTenants()` | Ambil semua tenant + info paket + jumlah member | ❌ Belum ada |
| `updateTenantSubscription(tenantId, packageId)` | Ganti paket tenant | ❌ Belum ada |
| `updateTenantStatus(tenantId, status)` | Suspend / aktifkan tenant | ❌ Belum ada |
| `registerPlugin(data)` | Daftarkan add-on baru ke registry global | ❌ Belum ada |

---

## 7. Rencana Eksekusi Gap

### 🔴 P1 — Halaman Manajemen Tenant (`/platform/tenants`)

Halaman paling kritis yang hilang. Platform Admin tidak bisa melihat atau mengelola tenant dari UI.

**Scope:**
- `src/app/platform/tenants/page.tsx` — tabel semua tenant, filter by status, badge paket
- `src/app/platform/tenants/[id]/page.tsx` — detail tenant: info dasar, paket aktif, add-on aktif, jumlah posts/users
- Server Actions baru: `getTenants()`, `updateTenantSubscription()`, `updateTenantStatus()`
- UI: tabel responsif + modal konfirmasi suspend

### 🟠 P2 — Modules Page (`/platform/modules`)

`ModulesClient` sudah ada sebagai UI tapi tidak terhubung ke data aktual.

**Keputusan arsitektur yang perlu dibuat:**
- Apakah "Core Module" menggunakan tabel DB terpisah dari `plugins`?
- Atau hardcoded sebagai konstanta di `lib/` dan dikontrol via `packages.features.allowedModules`?

**Rekomendasi**: Hardcode sebagai konstanta (tidak perlu tabel baru) — modules adalah fitur core bawaan platform, bukan add-on yang bisa didaftarkan sembarang pihak.

### 🟠 P3 — Register Plugin Baru di Add-on Marketplace

Tombol "Daftarkan Plugin Baru" di `/platform/addons` masih stub.

**Scope:**
- Modal form: `id` (slug unik), `name`, `description`, `configSchema` (JSON editor)
- Server Action: `registerPlugin(data)` dengan validasi ID unik
- Setelah register, Platform Admin masuk ke paket masing-masing untuk menambahkan plugin ID ke `allowedAddons`

### 🟡 P4 — Platform Overview Enhancement

**Scope:**
- List 5 tenant terbaru dengan status badge
- Breakdown: berapa TRIAL / ACTIVE / EXPIRED / SUSPENDED
- Agregasi pemakaian AI credits lintas semua tenant (dari `tenantPlugins.config.aiCreditsUsed`)

---

## 8. Konvensi Keamanan — Wajib di Semua Platform Actions

Setiap Server Action dari halaman platform **wajib** verifikasi ulang dari DB sebelum operasi apapun:

```typescript
async function verifyPlatformAdmin() {
  const session = await getSession();
  if (!session?.email) throw new Error("Unauthorized");

  const user = await db.query.users.findFirst({
    where: eq(users.email, session.email),
  });
  if (!user || user.role !== "PLATFORM_ADMIN") throw new Error("Forbidden");

  return user;
}

// Contoh penggunaan:
export async function suspendTenant(tenantId: string) {
  await verifyPlatformAdmin(); // wajib, selalu di baris pertama
  await db.update(tenants)
    .set({ subscriptionStatus: "SUSPENDED" })
    .where(eq(tenants.id, tenantId));
}
```

> Jangan andalkan `session.role` dari JWT saja — selalu re-verify dari DB untuk operasi destruktif.
