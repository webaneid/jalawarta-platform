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
| `/platform/modules` | `modules/page.tsx` | `ModulesClient` | ✅ Selesai | Terhubung ke packages DB, 5 module cards |
| `/platform/tenants` | `tenants/page.tsx` | `TenantsClient` | ✅ Selesai | Filter status, inline status changer |
| `/platform/tenants/[id]` | `tenants/[id]/page.tsx` | `TenantDetailClient` | ✅ Selesai | Detail, kelola paket & status, tim, add-on |
| `/platform/tenants/new` | — | `CreateTenantClient` | 🔴 Proposal F3 | Form onboarding tenant baru |
| `/platform/transactions` | — | `TransactionsClient` | 🟠 Proposal F4 | Manajemen tagihan & verifikasi bayar |

---

## 6. Server Actions Platform

**File**: `src/app/actions/platform.ts`

| Action | Fungsi | Status |
|---|---|---|
| `savePackage(data)` | Upsert paket SaaS (create/edit) | ✅ Ada |
| `getTenants()` | Ambil semua tenant + info paket + jumlah member | ✅ Ada |
| `getTenantDetail(id)` | Detail tenant: owner, pkg, members, addons | ✅ Ada |
| `updateTenantSubscription(tenantId, packageId)` | Ganti paket tenant | ✅ Ada |
| `updateTenantStatus(tenantId, status)` | Suspend / aktifkan tenant | ✅ Ada |
| `registerPlugin(data)` | Daftarkan add-on baru ke registry global | ✅ Ada |
| `createTenant(data)` | Buat tenant baru + user + member sekaligus | 🔴 Proposal F3 |
| `getTransactions(filter?)` | Ambil semua transaksi lintas tenant | 🟠 Proposal F4 |
| `createTransaction(...)` | Buat tagihan manual untuk tenant | 🟠 Proposal F4 |
| `markTransactionPaid(...)` | Tandai transaksi lunas + aktivasi tenant | 🟠 Proposal F4 |

---

## 7. Rencana Eksekusi Gap

### ✅ P1 — Halaman Manajemen Tenant — SELESAI (18 Apr 2026)
`/platform/tenants`, `/platform/tenants/[id]`, `TenantsClient`, `TenantDetailClient`, actions: `getTenants`, `getTenantDetail`, `updateTenantSubscription`, `updateTenantStatus`.

### ✅ P2 — Modules Page — SELESAI (18 Apr 2026)
`ModulesClient` terhubung ke packages DB. 5 module cards (News, Pages, Media, AI Generator, AI Insights). Hardcoded sebagai konstanta — bukan tabel DB.

### ✅ P3 — Register Plugin Baru — SELESAI (18 Apr 2026)
Modal "Daftarkan Plugin Baru" + `registerPlugin()` action + auto-slug ID generator.

### ✅ P4 — Platform Overview Enhancement — SELESAI (18 Apr 2026)
Breakdown status tenant, AI credits progress bar lintas tenant, list 5 tenant terbaru clickable.

---

---

## 8. Proposal: Tenant Onboarding, Settings Lanjutan & Sistem Transaksi

> Status: **PROPOSAL** — belum diimplementasikan. Dokumen ini adalah blueprint eksekusi fase berikutnya.

---

### 8.1 Gambaran Besar — Apa yang Dibangun

Sistem ini mencakup **3 area besar** yang saling terhubung:

```
┌─────────────────────────────────────────────────────────────────┐
│  A. PLATFORM ADMIN (platform.localhost)                         │
│     · Form registrasi tenant baru                               │
│     · Manajemen transaksi & tagihan                             │
│     · Verifikasi pembayaran manual (QRIS, transfer)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ create & manage
┌──────────────────────────▼──────────────────────────────────────┐
│  B. TENANT SETTINGS (app.localhost/settings)                    │
│     Tab 1 — Identitas   : nama, logo, slogan, deskripsi         │
│     Tab 2 — Kontak      : email, telepon, alamat                 │
│     Tab 3 — Sosial Media: IG, X, FB, YouTube, TikTok, LinkedIn  │
│     Tab 4 — Pembayaran  : rekening bank, QRIS, info bisnis      │
│     Tab 5 — Teknis      : domain, favicon, timezone, SEO, maint │
└──────────────────────────┬──────────────────────────────────────┘
                           │ stored in
┌──────────────────────────▼──────────────────────────────────────┐
│  C. DATABASE                                                    │
│     · tenants (kolom baru + perluasan schemaConfig JSONB)       │
│     · transactions (tabel baru)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8.2 Perubahan Skema Database

#### 8.2.1 Perluasan `schemaConfig` JSONB di tabel `tenants`

Tidak perlu kolom baru — semua data ekstensif disimpan di `schemaConfig` (JSONB yang sudah ada).
Struktur penuh `schemaConfig` yang diusulkan:

```typescript
type TenantSchemaConfig = {
  // === IDENTITAS ===
  logo: string;             // URL gambar logo (dari Media Library)
  slogan: string;           // Tagline singkat situs
  description: string;      // Deskripsi panjang / "Tentang Kami"
  favicon: string;          // URL favicon

  // === KONTAK ===
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;

  // === SOSIAL MEDIA ===
  socialInstagram: string;  // handle atau URL penuh
  socialX: string;          // (Twitter/X)
  socialFacebook: string;
  socialYoutube: string;
  socialTiktok: string;
  socialLinkedin: string;

  // === PEMBAYARAN & BISNIS ===
  businessName: string;     // Nama badan usaha / PT / CV
  npwp: string;             // NPWP opsional
  bankName: string;         // e.g. "BCA", "Mandiri"
  bankAccountNumber: string;
  bankAccountName: string;  // Nama pemilik rekening
  qrisImage: string;        // URL gambar QRIS (dari Media Library)

  // === TEKNIS (sudah ada, dipertahankan) ===
  timezone: string;         // e.g. "Asia/Jakarta"
  maintenanceMode: boolean;
  seoIndexing: boolean;     // Apakah boleh diindex search engine
  footerText: string;
  language: string;         // "id" | "en"
  themeColor: string;       // Primary color hex, e.g. "#2563EB"
};
```

#### 8.2.2 Tabel Baru: `transactions`

```typescript
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  packageId: text("package_id").references(() => packages.id, { onDelete: "set null" }),

  // Identitas transaksi
  invoiceNumber: text("invoice_number").unique().notNull(), // e.g. "INV-2026-0001"
  amount: integer("amount").notNull(),                      // Rupiah
  periodMonths: integer("period_months").default(1),        // Durasi berlangganan

  // Status & metode pembayaran
  status: text("status").notNull().default("PENDING"),
  // "PENDING" | "PAID" | "EXPIRED" | "CANCELLED"
  paymentMethod: text("payment_method"),
  // "bank_transfer" | "qris" | "midtrans" | "xendit" | "manual"
  paymentProof: text("payment_proof"),                      // URL bukti transfer (dari Media Library)
  paymentNotes: text("payment_notes"),                      // Catatan admin

  // Timestamps
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by"),                            // userId platform admin
});
```

---

### 8.3 Area A — Platform Admin: Tenant Onboarding & Transaksi

#### 8.3.1 Form Registrasi Tenant Baru (`/platform/tenants/new`)

Platform Admin membuat tenant baru secara manual (bukan self-signup).

**Form fields:**
```
Informasi Dasar:
  · Nama Situs (siteName)
  · Subdomain (subdomain) — auto-check keunikan
  · Nama Pemilik
  · Email Pemilik (akan dibuat akun user baru otomatis)
  · Password Sementara (untuk login pertama)

Langganan:
  · Pilih Paket (dropdown dari packages)
  · Status Awal: TRIAL / ACTIVE
  · Durasi Trial (hari)

Catatan Internal (opsional):
  · Catatan Admin (tidak terlihat tenant)
```

**Server Actions yang dibutuhkan:**
```typescript
createTenant(data: {
  siteName: string;
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;      // akan di-hash bcrypt
  packageId: string | null;
  subscriptionStatus: string;
  adminNotes?: string;
}) → { success, tenantId, userId }
```

**Alur:**
1. Validasi subdomain unik
2. Insert `user` (hash password bcrypt)
3. Insert `tenant` (ownerId = userId baru)
4. Insert `tenantMembers` (role: SUPER_ADMIN)
5. Jika paket dipilih → buat `transaction` (PENDING) otomatis
6. `revalidatePath("/platform/tenants")`

#### 8.3.2 Manajemen Transaksi (`/platform/transactions`)

Halaman daftar semua tagihan & transaksi lintas tenant.

**UI:**
- Tabel: Invoice No, Tenant, Paket, Amount, Status, Due Date, Aksi
- Filter: status (PENDING / PAID / EXPIRED / CANCELLED), bulan
- Tombol: "Buat Tagihan Manual" (per tenant), "Tandai Lunas", "Upload Bukti"

**Server Actions:**
```typescript
getTransactions(filter?: { status?, tenantId? })
createTransaction(tenantId, packageId, periodMonths)
markTransactionPaid(transactionId, paymentMethod, proof?)
cancelTransaction(transactionId)
```

#### 8.3.3 Verifikasi Pembayaran Manual

Untuk QRIS & bank transfer, Platform Admin:
1. Membuat invoice dari `/platform/transactions`
2. Tenant membayar (transfer / scan QRIS)
3. Tenant upload bukti di settings mereka ATAU Platform Admin upload langsung
4. Platform Admin klik "Tandai Lunas" → `transactions.status = "PAID"`, tenant `subscriptionStatus = "ACTIVE"`

---

### 8.4 Area B — Tenant Settings Lanjutan (5 Tab)

Halaman `/settings` di CMS tenant direfactor menjadi **tab-based layout**.

#### Tab 1 — Identitas Situs

| Field | Tipe | Keterangan |
|---|---|---|
| Nama Situs | text | `tenants.siteName` |
| Slogan | text | `schemaConfig.slogan` |
| Deskripsi / Tentang | textarea | `schemaConfig.description` |
| Logo | image picker | `schemaConfig.logo` (dari Media Library) |
| Favicon | image picker | `schemaConfig.favicon` (sudah ada) |
| Warna Utama | color picker | `schemaConfig.themeColor` |

#### Tab 2 — Informasi Kontak

| Field | Tipe | Keterangan |
|---|---|---|
| Email Kontak | text | `schemaConfig.contactEmail` |
| Nomor Telepon | text | `schemaConfig.contactPhone` |
| Alamat Lengkap | textarea | `schemaConfig.address` |
| Kota | text | `schemaConfig.city` |
| Provinsi | text | `schemaConfig.province` |
| Kode Pos | text | `schemaConfig.postalCode` |

#### Tab 3 — Sosial Media

| Platform | Field | Keterangan |
|---|---|---|
| Instagram | `socialInstagram` | Handle atau URL profil |
| X (Twitter) | `socialX` | Handle atau URL |
| Facebook | `socialFacebook` | URL halaman |
| YouTube | `socialYoutube` | URL channel |
| TikTok | `socialTiktok` | Handle atau URL |
| LinkedIn | `socialLinkedin` | URL halaman perusahaan |

#### Tab 4 — Pembayaran & Bisnis

Digunakan untuk keperluan tampilan di frontend publik (footer, halaman donasi, dll).

| Field | Tipe | Keterangan |
|---|---|---|
| Nama Badan Usaha | text | `schemaConfig.businessName` |
| NPWP | text | `schemaConfig.npwp` (opsional) |
| Nama Bank | text | `schemaConfig.bankName` |
| No. Rekening | text | `schemaConfig.bankAccountNumber` |
| Nama Pemilik Rekening | text | `schemaConfig.bankAccountName` |
| Gambar QRIS | image picker | `schemaConfig.qrisImage` (dari Media Library) |

#### Tab 5 — Teknis & Preferensi

*(sudah ada, diperluas)*

| Field | Tipe | Keterangan |
|---|---|---|
| Custom Domain | text | `tenants.customDomain` |
| Zona Waktu | select | `schemaConfig.timezone` |
| Bahasa Antarmuka | select | `schemaConfig.language` |
| SEO Indexing | toggle | `schemaConfig.seoIndexing` |
| Mode Pemeliharaan | toggle | `schemaConfig.maintenanceMode` |
| Teks Footer | textarea | `schemaConfig.footerText` |

---

### 8.5 Rute & Komponen yang Dibutuhkan

#### Platform (`platform.localhost`)

| Rute | Komponen | Keterangan |
|---|---|---|
| `/platform/tenants/new` | `CreateTenantClient` | Form onboarding tenant baru |
| `/platform/transactions` | `TransactionsClient` | Daftar semua transaksi |
| `/platform/transactions/[id]` | `TransactionDetailClient` | Detail + verifikasi pembayaran |

#### Tenant CMS (`app.localhost`)

| Rute | Komponen | Keterangan |
|---|---|---|
| `/settings` | `ClientSettings` (refactor) | Tab-based: 5 tab |
| `/settings/billing` | `BillingClient` (baru) | Riwayat tagihan tenant sendiri, upload bukti |

---

### 8.6 Urutan Eksekusi (Prioritas)

| | Fase | Scope | Effort |
|---|---|---|---|
| 🔴 | **F1 — DB Migration** | Tambah tabel `transactions`, extend `schemaConfig` type | XS |
| 🔴 | **F2 — Tenant Settings Tab** | Refactor `/settings` jadi 5 tab, simpan semua field baru ke `schemaConfig` | M |
| 🟠 | **F3 — Create Tenant Form** | `/platform/tenants/new` + `createTenant()` action (buat user + tenant + member sekaligus) | M |
| 🟠 | **F4 — Transactions Platform** | `/platform/transactions` + CRUD actions + verifikasi manual | L |
| 🟡 | **F5 — Billing Tenant** | `/settings/billing` — tenant lihat tagihan & upload bukti bayar | M |
| 🟡 | **F6 — Payment Gateway** | Integrasi Midtrans atau Xendit untuk QRIS otomatis (fase lanjut) | XL |

---

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
