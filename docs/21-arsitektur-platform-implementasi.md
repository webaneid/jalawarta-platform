# Arsitektur Implementasi Platform Admin (Super Admin)

Dokumen ini adalah referensi implementasi teknis lengkap dari dasbor **`platform.jalawarta.com`** — pusat kendali SaaS Jala Warta. Dokumen ini mencatat apa yang sudah dibangun, apa yang belum, dan pelajaran teknis dari proses pengembangannya.

Untuk filosofi dan konsep bisnis, lihat [`14-arsitektur-platform-web.md`](./14-arsitektur-platform-web.md).
Untuk skema domain dan routing, lihat [`15-arsitektur-domain-topologi.md`](./15-arsitektur-domain-topologi.md).
Untuk detail API Key Vault, lihat [`16-arsitektur-platform-apikey.md`](./16-arsitektur-platform-apikey.md).

---

## 1. Hierarki Komponen & Routing

```
src/app/platform/
├── layout.tsx                         ← Auth gate + Sidebar nav (PLATFORM_ADMIN)
├── page.tsx                           ← Dashboard overview (stats)
├── packages/
│   ├── page.tsx                       ← Daftar semua paket SaaS
│   ├── create/page.tsx                ← Form buat paket baru
│   └── [id]/edit/page.tsx             ← Form edit paket existing
├── modules/
│   └── page.tsx                       ← Katalog core modules (display only)
├── addons/
│   ├── page.tsx                       ← Add-on marketplace listing
│   └── ai-article-generator/
│       ├── page.tsx                   ← Konfigurasi kuota AI per tenant
│       └── PlatformAiConfigClient.tsx ← Client component inline
└── api-keys/
    └── page.tsx                       ← API Key Vault (full CRUD + enkripsi)
```

**Komponen Platform** (`src/components/platform/`):
- `PackagesClient.tsx` — Grid kartu paket SaaS
- `PackageForm.tsx` — Form UPSERT paket (create + edit)
- `ModulesClient.tsx` — Daftar core modules statis
- `AddonsClient.tsx` — Marketplace add-on dengan search filter
- `ApiKeysClient.tsx` — CRUD kredensial terenkripsi dengan modal

---

## 2. Auth & Authorization Gate

**File:** `src/app/platform/layout.tsx`

Semua rute `/platform/*` diproteksi di dua lapisan:

**Lapisan 1 — Middleware** (`src/proxy.ts`):
- Setiap request ke `platform.localhost` / `platform.jalawarta.com` dicek JWT `jw_session`
- Redirect ke login jika sesi tidak ada

**Lapisan 2 — Root Layout** (`platform/layout.tsx`):
- Verifikasi ulang sesi via `getSession()`
- Query `users` tabel untuk konfirmasi `role === "PLATFORM_ADMIN"`
- Redirect ke `/` jika bukan Platform Admin

**Server Actions** — setiap mutasi wajib memanggil:
```typescript
async function verifySuperAdmin() {
  const session = await getSession();
  const user = await db.query.users.findFirst({ where: eq(users.email, session.email) });
  if (!user || user.role !== "PLATFORM_ADMIN") throw new Error("Unauthorized");
}
```

> **Penting**: Deteksi `PLATFORM_ADMIN` di `login.ts` dilakukan **sebelum** query tenant. Jangan pernah ubah urutan ini — lihat Learning Log bug #6 di bawah.

---

## 3. Skema Database Platform

### Tabel `packages`
```typescript
packages = pgTable("packages", {
  id:          text("id").primaryKey(),          // "free", "pro", "enterprise"
  name:        text("name").notNull(),
  description: text("description"),
  price:       integer("price").notNull(),        // IDR/bulan
  limits:      jsonb("limits"),                  // { maxUsers, maxPosts, maxStorage (bytes), aiCreditsLimit, aiImageCreditsLimit }
  features:    jsonb("features"),                // { allowedModules: [], allowedAddons: [] }
  isActive:    boolean("is_active").default(true),
  createdAt:   timestamp("created_at").defaultNow(),
})
```

### Tabel `plugins`
```typescript
plugins = pgTable("plugins", {
  id:           text("id").primaryKey(),          // "ai-article-generator", "google-analytics"
  name:         text("name").notNull(),
  description:  text("description"),
  configSchema: jsonb("config_schema"),           // JSON Schema untuk form konfigurasi
  createdAt:    timestamp("created_at").defaultNow(),
})
```

### Tabel `tenantPlugins` (Composite PK)
```typescript
tenantPlugins = pgTable("tenant_plugins", {
  tenantId: text("tenant_id").references(() => tenants.id),
  pluginId: text("plugin_id").references(() => plugins.id),
  config:   jsonb("config"),    // { aiCreditsLimit, aiCreditsUsed, preferredProvider, ... }
  status:   text("status"),     // "ACTIVE" | "INACTIVE"
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.tenantId, t.pluginId] }) }))
```

### Tabel `apiCredentials`
```typescript
apiCredentials = pgTable("api_credentials", {
  id:             text("id").primaryKey(),
  category:       text("category").notNull(),     // "ai_text_generation", "payment_gateway", dll
  provider:       text("provider").notNull(),     // "gemini", "openai_chatgpt", "midtrans"
  apiKey:         text("api_key").notNull(),       // TERENKRIPSI AES-256-GCM
  apiSecret:      text("api_secret"),             // TERENKRIPSI, nullable
  displayName:    text("display_name").notNull(),
  description:    text("description"),
  isActive:       boolean("is_active").default(true),
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt:      timestamp("created_at").defaultNow(),
  updatedAt:      timestamp("updated_at").defaultNow(),
}, (t) => ({ uniq: unique().on(t.category, t.provider) }))  // satu provider per kategori
```

---

## 4. Server Actions Platform

### `src/app/actions/platform.ts`

| Fungsi | Tujuan | Auth |
|---|---|---|
| `savePackage(data)` | UPSERT paket SaaS — transform `maxStorageMB → bytes` untuk field JSONB | `verifySuperAdmin()` |

**Transformasi data `savePackage`:**
```typescript
limits: {
  maxUsers:            Number(data.maxUsers),
  maxPosts:            Number(data.maxPosts),
  maxStorage:          Number(data.maxStorageMB) * 1024 * 1024,  // MB → bytes
  aiCreditsLimit:      Number(data.aiCreditsLimit),
  aiImageCreditsLimit: Number(data.aiImageCreditsLimit),
},
features: {
  allowedModules: data.allowedModules,  // ["core-news", "core-pages", "core-media"]
  allowedAddons:  data.allowedAddons,   // ["ai-article-generator", "google-analytics"]
}
```

### `src/app/actions/apikeys.ts`

| Fungsi | Tujuan | Auth |
|---|---|---|
| `saveApiCredential(data)` | Create/update kredensial — enkripsi AES-256 sebelum simpan | `verifySuperAdmin()` |
| `deleteApiCredential(id)` | Hapus kredensial | `verifySuperAdmin()` |
| `getDecryptedCredential(category, provider)` | Dekripsi key server-side untuk Add-on | `verifySuperAdmin()` |

### `src/app/actions/ai-generate.ts` (Platform scope)

| Fungsi | Tujuan | Auth |
|---|---|---|
| `getTenantsAiUsage()` | Ambil metrik AI semua tenant | `PLATFORM_ADMIN` |
| `setPlatformCreditLimit(tenantId, limit)` | Update batas kredit AI per tenant | `PLATFORM_ADMIN` |

**Strategi Revalidasi:**
```typescript
revalidatePath("/platform/packages")         // path-based untuk list pages
revalidateTag("global_api_credentials")      // tag-based untuk cross-page invalidation
```

---

## 5. Alur Data: Package Form (Create & Edit)

```
[User buka /platform/packages/create]
    → page.tsx: fetch plugins dari DB (untuk checkbox add-on)
    → render <PackageForm plugins={plugins} />

[User isi form & klik Save]
    → Client: validasi ID + Name required
    → Client: kumpulkan allowedModules[] + allowedAddons[] dari checkbox
    → Server Action: savePackage(formData)
        → verifySuperAdmin()
        → transform maxStorageMB → bytes
        → db.insert(packages).onConflictDoUpdate(...)
        → revalidatePath("/platform/packages")
    → Client: redirect ke /platform/packages
```

**Edit** menggunakan rute `/platform/packages/[id]/edit/page.tsx`:
- Field `id` di-disable (tidak bisa ubah primary key)
- Form pre-fill: konversi `maxStorage bytes → MB` untuk tampilan
- Server Action sama (`savePackage`) — UPSERT menangani update

---

## 6. Alur Data: API Key Vault

```
[Server Component page.tsx]
    → fetch semua apiCredentials dari DB
    → untuk setiap record: decryptAPIKey() → maskApiKey()  ← server only
    → pass maskedCredentials ke <ApiKeysClient />

[Client: Add/Edit Modal]
    → User isi form (key dimasukkan sebagai password field)
    → Server Action: saveApiCredential(data)
        → verifySuperAdmin()
        → cek duplikat: SELECT WHERE category=X AND provider=Y
        → encryptAPIKey(plaintext) → simpan cipher
        → revalidatePath + revalidateTag

[Client: Delete]
    → Server Action: deleteApiCredential(id)
        → verifySuperAdmin()
        → db.delete(apiCredentials).where(eq(id, ...))
```

**Aturan keamanan ketat:**
- Plaintext key **tidak pernah** masuk ke Client Component
- Edit form: field key kosong = tidak update key lama
- Satu-satunya jalan akses key dari Add-on: `getDecryptedCredential(category, provider)` di server

---

## 7. Status Implementasi Lengkap

### ✅ Sudah Diimplementasikan

| Fitur | File Utama | Keterangan |
|---|---|---|
| Auth gate 2 lapis | `layout.tsx` + `proxy.ts` | JWT + DB role check |
| Dashboard overview | `page.tsx` | Count tenant/user/package/addon |
| Packages CRUD | `packages/` + `PackageForm.tsx` | Create, list, edit; JSONB transform benar |
| Package — Feature Bundling | `PackageForm.tsx` | Checkbox modules + add-ons masuk `features` JSONB |
| Core Modules listing | `modules/page.tsx` | 3 modul: news, pages, media |
| Add-on Marketplace listing | `addons/page.tsx` | Search filter, load dari DB |
| AI Credit Management | `addons/ai-article-generator/` | View + edit kuota kredit per tenant |
| API Key Vault | `api-keys/page.tsx` | Full CRUD, enkripsi AES-256, filter kategori |
| Credential masking | `api-keys/page.tsx` | Mask server-side, toggle show/hide di client |

### ❌ Belum Diimplementasikan

| Fitur | Lokasi yang Diharapkan | Prioritas |
|---|---|---|
| **Tenant Management** | `/platform/tenants/` | 🔴 Tinggi — ada di sidebar tapi 404 |
| **Plugin Registration UI** | `/platform/addons/` (modal/form) | 🟠 Sedang — tombol "Daftarkan Plugin" adalah stub |
| **Add-on Detail & Config Page** | `/platform/addons/[id]/` | 🟠 Sedang — tombol "Detail & Config" tidak aktif |
| **Core Module Config UI** | `/platform/modules/[id]/` | 🟡 Rendah — tombol "Setup Config" adalah stub |
| **Billing & Subscription tracking** | `/platform/billing/` | 🟡 Rendah — planned di Milestone 4 |
| **Tenant suspension/deactivation** | Action di tenant management | 🔴 Tinggi — fitur bisnis kritis |

---

## 8. Gap Kritis: Tenant Management

Sidebar menampilkan menu **"Semua Tenants"** (`href="/platform/tenants"`) tapi folder dan file implementasi **tidak ada**. Ini menyebabkan 404 saat diklik.

**Scope yang dibutuhkan untuk `/platform/tenants/`:**

```
platform/tenants/
├── page.tsx           ← Daftar semua tenant (nama, paket, status, tgl daftar)
└── [id]/page.tsx      ← Detail tenant: member count, storage used, addon aktif
```

**Server Actions yang perlu dibuat di `platform.ts`:**
```typescript
getTenantList()           // join tenants + packages + _count members
suspendTenant(tenantId)   // update tenants.isActive = false
changeTenantPackage(tenantId, packageId)
```

---

## 9. Learning Log Platform

| Tanggal | Bug / Temuan | Pelajaran |
|---|---|---|
| **15 Apr 2026** | Login `platform.localhost` loop redirect — 3 bug berantai | Deteksi `PLATFORM_ADMIN` di `login.ts` **harus** terjadi sebelum query tenant. Kalau session tidak punya `tenantId` (PLATFORM_ADMIN tidak punya tenant), jangan cari tenant — langsung set role dari DB user |
| **15 Apr 2026** | `platform/layout.tsx` redirect ke `/` jika `dbUser.role !== "PLATFORM_ADMIN"` | Auth di layout harus konsisten dengan proxy. Dua lapisan check adalah desain yang benar, bukan redundan |
| **15 Apr 2026** | `app-login/page.tsx` setelah sukses `router.push("/")` tanpa baca `callbackUrl` | Setelah login sukses, **wajib** baca `callbackUrl` dari URL params dan redirect ke sana via `window.location.href` (bukan `router.push` — agar melewati middleware dengan cookie baru) |
| **14 Apr 2026** | Export konstanta `API_CATEGORIES` dari file `"use server"` | File `"use server"` hanya boleh export `async function`. Pindahkan konstanta ke `src/lib/api-categories.ts` |
| **12 Apr 2026** | Package form: `maxStorage` dikirim dalam MB tapi schema menyimpan bytes | Selalu transformasi unit di Server Action (`MB * 1024 * 1024`). Untuk display, konversi balik di Server Component sebelum pass ke form |

---

## 10. Panduan Pengembangan Fitur Baru Platform

Saat menambahkan fitur baru di area platform, ikuti pola ini:

### Menambah menu baru di Sidebar
1. Tambah entry ke array `navLinks` di `platform/layout.tsx`
2. Buat folder + `page.tsx` di `src/app/platform/[nama-fitur]/`
3. Jika perlu Server Action, tambahkan di `src/app/actions/platform.ts` dengan `verifySuperAdmin()` di awal
4. Jika perlu komponen UI besar, buat di `src/components/platform/NamaFiturClient.tsx`

### Pattern Server Action Platform
```typescript
// src/app/actions/platform.ts
"use server";

export async function namaAction(data: TipeData) {
  await verifySuperAdmin();  // WAJIB di baris pertama setiap mutasi
  
  try {
    await db.insert(tabel).values({ ...data });
    revalidatePath("/platform/[path]");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Pesan error" };
  }
}
```

### Menambah Add-on baru ke Marketplace
1. Insert ke tabel `plugins` (via seed script atau migration)
2. Daftarkan slot di `src/lib/plugins/registry.ts`
3. Buat implementasi di `src/plugins/[nama-addon]/`
4. Jika butuh platform config, buat halaman di `platform/addons/[nama-addon]/`

---

*Terakhir diperbarui: 17 April 2026 | Berdasarkan analisis implementasi aktual kodebase*
