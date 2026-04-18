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
| `/platform/tenants/new` | `tenants/new/page.tsx` | `CreateTenantClient` | ✅ Selesai | Form onboarding tenant baru |
| `/platform/payment-methods` | `payment-methods/page.tsx` | `PaymentMethodsClient` | ✅ Selesai | CRUD rekening bank & QRIS platform |
| `/platform/transactions` | `transactions/page.tsx` | `TransactionsClient` | ✅ Selesai | Manajemen tagihan & verifikasi bayar |
| `/api/qris/[txId]` | Route Handler | — | 🟡 Proposal F6 | Generate QR dinamis per transaksi. Lihat [`24-arsitektur-qris.md`] |

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

### 8.2 Arsitektur Sistem Pembayaran — 3 Lapisan

Sistem pembayaran Jala Warta beroperasi dalam **2 arah** yang berbeda:

```
┌─────────────────────────────────────────────────────────┐
│  ARAH 1: Tenant → Platform (Subscription SaaS)          │
│  Tenant membayar biaya langganan ke platform            │
│                                                         │
│  Metode:                                                │
│  A. QRIS Internal   — scan QRIS milik platform          │
│  B. Transfer Bank   — ke rekening-rekening platform     │
│  C. Payment Gateway — Midtrans/Xendit (otomatis)        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ARAH 2: Reader → Tenant (Donasi / Konten Premium)      │
│  Pembaca membayar ke portal berita tenant               │
│  Dikelola di: /settings Tab Pembayaran                  │
│  Disimpan di: tenants.schemaConfig JSONB                │
└─────────────────────────────────────────────────────────┘
```

#### 8.2.1 Tabel Baru: `platform_payment_methods`

Menyimpan metode pembayaran **milik platform** (QRIS & rekening bank). Bisa ditambah dan dikurangi oleh Platform Admin.

```typescript
export const platformPaymentMethods = pgTable("platform_payment_methods", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(),
  // "bank_transfer" | "qris"
  // (payment gateway dikonfigurasi terpisah via API Key Vault)

  // Untuk type "bank_transfer":
  bankName: text("bank_name"),           // e.g. "BCA", "Mandiri", "BNI"
  accountNumber: text("account_number"), // No. rekening
  accountName: text("account_name"),     // Nama pemilik rekening

  // Untuk type "qris":
  qrisImage: text("qris_image"),         // URL gambar QRIS (dari Media Library platform)
  qrisProvider: text("qris_provider"),   // e.g. "GoPay", "OVO", "DANA", "Universal"

  label: text("label"),                  // Label tampilan, e.g. "BCA Utama", "QRIS Gopay"
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
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

  // Metode pembayaran yang digunakan
  paymentMethod: text("payment_method"),
  // "bank_transfer" | "qris" | "gateway"
  paymentMethodId: text("payment_method_id"),
  // → FK ke platform_payment_methods.id (untuk bank/qris)
  // → null jika gateway (dilacak via gatewayRef)
  gatewayProvider: text("gateway_provider"),  // "midtrans" | "xendit" | null
  gatewayRef: text("gateway_ref"),            // ID transaksi dari gateway

  // Status & bukti
  status: text("status").notNull().default("PENDING"),
  // "PENDING" | "AWAITING_VERIFICATION" | "PAID" | "EXPIRED" | "CANCELLED"
  paymentProof: text("payment_proof"),        // URL screenshot/bukti transfer
  paymentNotes: text("payment_notes"),        // Catatan admin saat verifikasi

  // Timestamps
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by"),              // userId platform admin
});
```

**Status Flow:**
```
PENDING → tenant pilih metode bayar
       ↓
AWAITING_VERIFICATION → tenant upload bukti (bank/QRIS)
       ↓                   ATAU gateway menunggu konfirmasi
  PAID (admin verif manual, atau webhook gateway)
       ↓
  tenant.subscriptionStatus → "ACTIVE"
```

#### 8.2.3 Perluasan `schemaConfig` JSONB di tabel `tenants`

Tidak perlu kolom baru — semua data ekstensif masuk `schemaConfig` (JSONB yang sudah ada).

```typescript
type TenantSchemaConfig = {
  // === IDENTITAS ===
  logo: string;             // URL gambar logo (dari Media Library)
  slogan: string;           // Tagline singkat situs
  description: string;      // Deskripsi panjang / "Tentang Kami"
  favicon: string;          // URL favicon (sudah ada)
  themeColor: string;       // Primary color hex, e.g. "#2563EB"

  // === KONTAK ===
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;

  // === SOSIAL MEDIA ===
  socialInstagram: string;  // Handle atau URL profil
  socialX: string;          // (Twitter/X)
  socialFacebook: string;
  socialYoutube: string;
  socialTiktok: string;
  socialLinkedin: string;

  // === PEMBAYARAN TENANT → READER (donasi/langganan konten) ===
  businessName: string;     // Nama badan usaha / PT / CV
  npwp: string;             // NPWP opsional
  // Rekening tenant (untuk terima donasi dari pembaca):
  tenantBankAccounts: Array<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    label?: string;         // e.g. "Rekening Donasi"
  }>;
  tenantQrisImage: string;  // URL QRIS tenant (terima dari pembaca)

  // === TEKNIS (sudah ada, dipertahankan) ===
  timezone: string;         // e.g. "Asia/Jakarta" (sudah ada)
  maintenanceMode: boolean; // (sudah ada)
  seoIndexing: boolean;
  footerText: string;       // (sudah ada)
  language: string;         // "id" | "en"
};
```

---

### 8.3 Area A — Platform Admin: Tenant Onboarding & Transaksi

#### 8.3.1 Manajemen Metode Pembayaran Platform (`/platform/payment-methods`)

**Halaman baru** — Platform Admin kelola rekening bank dan QRIS yang ditampilkan ke tenant saat membayar.

**UI:**
- List semua metode aktif (bank transfer & QRIS) dengan drag-to-reorder
- Tombol "Tambah Rekening Bank" → modal form
- Tombol "Upload QRIS Baru" → modal image picker (dari Media Library)
- Toggle aktif/nonaktif per item
- Tombol hapus (dengan konfirmasi)

**Modal Tambah Rekening Bank:**
```
· Nama Bank   : dropdown (BCA, Mandiri, BNI, BRI, BSI, CIMB, dll + "Lainnya")
· No. Rekening: text input
· Atas Nama   : text input
· Label       : text input (e.g. "Rekening Utama", "Rekening Cadangan")
```

**Modal Tambah QRIS:**
```
· Provider QRIS: text (e.g. "GoPay", "OVO", "DANA", "Universal QRIS")
· Gambar QRIS  : image picker → URL dari Media Library
· Label        : text (e.g. "QRIS Gopay Jala Warta")
```

**Server Actions:**
```typescript
getPlatformPaymentMethods()
addPlatformPaymentMethod(data: {
  type: "bank_transfer" | "qris";
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  qrisImage?: string;
  qrisProvider?: string;
  label: string;
})
updatePlatformPaymentMethod(id, data)
togglePlatformPaymentMethod(id, isActive)
deletePlatformPaymentMethod(id)
reorderPlatformPaymentMethods(orderedIds: string[])
```

---

#### 8.3.2 Form Registrasi Tenant Baru (`/platform/tenants/new`)

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

Catatan Internal (opsional)
```

**Alur Server Action `createTenant()`:**
1. Validasi subdomain unik (query DB)
2. Hash password dengan bcrypt
3. Insert `user` (role: TENANT_OWNER)
4. Insert `tenant` (ownerId = userId baru)
5. Insert `tenantMembers` (role: SUPER_ADMIN)
6. Jika paket dipilih → buat `transaction` (status: PENDING) otomatis
7. `revalidatePath("/platform/tenants")`

---

#### 8.3.3 Manajemen Transaksi (`/platform/transactions`)

Halaman daftar semua tagihan & transaksi lintas tenant.

**UI:**
- Tabel: Invoice No, Tenant, Paket, Jumlah, Metode, Status, Jatuh Tempo, Aksi
- Filter: status (PENDING / AWAITING_VERIFICATION / PAID / EXPIRED / CANCELLED)
- Filter: per tenant (dropdown)
- Tombol "Buat Tagihan" → modal (pilih tenant, paket, durasi, metode yang diharapkan)
- Per baris: tombol "Verifikasi" (jika AWAITING_VERIFICATION) atau "Detail"

**Detail / Verifikasi Transaksi (`/platform/transactions/[id]`):**
- Tampilkan info tagihan lengkap
- Tampilkan bukti bayar yang diupload tenant (jika ada)
- Tombol "Tandai Lunas" → set `status = "PAID"`, `paidAt = now()`, update `tenant.subscriptionStatus = "ACTIVE"`
- Tombol "Batalkan" → set `status = "CANCELLED"`
- Input catatan verifikasi

**Server Actions:**
```typescript
getTransactions(filter?: { status?: string; tenantId?: string })
getTransactionDetail(id: string)
createTransaction(data: {
  tenantId: string;
  packageId: string;
  periodMonths: number;
  paymentMethod: "bank_transfer" | "qris" | "gateway";
  paymentMethodId?: string;  // FK ke platform_payment_methods
})
markTransactionPaid(id: string, notes?: string)
cancelTransaction(id: string)
```

---

#### 8.3.4 Payment Gateway — Fase Lanjut

Integrasi **Midtrans** atau **Xendit** untuk pembayaran otomatis (tidak perlu verifikasi manual).

- API Key disimpan di API Key Vault (kategori: `payment_gateway`, provider: `midtrans` / `xendit`)
- Saat tenant memilih "Bayar via Gateway" → hit Midtrans/Xendit API → redirect ke halaman bayar
- Webhook dari gateway → `markTransactionPaid()` otomatis
- Status transaction: PENDING → langsung PAID (tanpa AWAITING_VERIFICATION)

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

Digunakan untuk keperluan tampilan di frontend publik (footer, halaman donasi, konten premium). **Ini adalah rekening milik tenant untuk menerima dari pembaca** — bukan pembayaran subscription ke platform.

| Field | Tipe | Keterangan |
|---|---|---|
| Nama Badan Usaha | text | `schemaConfig.businessName` |
| NPWP | text | `schemaConfig.npwp` (opsional) |
| Rekening Bank | list + modal | `schemaConfig.tenantBankAccounts[]` — bisa tambah / hapus per rekening |
| QRIS Tenant | image picker | `schemaConfig.tenantQrisImage` (dari Media Library) |

**Rekening bank bersifat list** — tenant bisa punya lebih dari satu rekening (misalnya BCA, Mandiri, BSI). Setiap entri memiliki:
```
· Nama Bank     : text (BCA, Mandiri, BNI, BSI, dll)
· No. Rekening  : text
· Atas Nama     : text
· Label         : text opsional (e.g. "Rekening Donasi", "Rekening Utama")
```
Lihat struktur `tenantBankAccounts` di Section 8.2.3.

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
| `/platform/payment-methods` | `PaymentMethodsClient` | CRUD rekening bank & QRIS milik platform |

#### Tenant CMS (`app.localhost`)

| Rute | Komponen | Keterangan |
|---|---|---|
| `/settings` | `ClientSettings` (refactor) | Tab-based: 5 tab |
| `/settings/billing` | `BillingClient` (baru) | Riwayat tagihan tenant sendiri, upload bukti |

---

### 8.6 Urutan Eksekusi (Prioritas)

| | Fase | Scope | Effort |
|---|---|---|---|
| ✅ | **F1 — DB Migration** | Tambah tabel `transactions` + `platform_payment_methods` ke Drizzle schema + push | XS |
| ✅ | **F2 — Tenant Settings Tab** | Refactor `/settings` jadi 5 tab, simpan semua field baru ke `schemaConfig` JSONB | M |
| ✅ | **F3 — Create Tenant Form** | `/platform/tenants/new` + `createTenant()` action (buat user + tenant + member sekaligus) | M |
| ✅ | **F4 — Transactions & Payment Methods** | `/platform/payment-methods` CRUD + `/platform/transactions` + verifikasi manual | L |
| ✅ | **F5 — Billing Tenant** | `/settings/billing` — tenant lihat tagihan sendiri & upload bukti bayar | M |
| 🟡 | **F6 — QRIS Dynamic Nominal** | EMV payload inject, QR generator, billing UI — tanpa payment gateway. **Baca [`docs/24-arsitektur-qris.md`]** sebelum eksekusi. | M |
| ⬜ | **F7 — Payment Gateway** | Integrasi Midtrans atau Xendit — webhook otomatis, API Key via Vault | XL |

**Dependency F4:** Platform Admin harus set up minimal 1 metode pembayaran (`/platform/payment-methods`) sebelum bisa buat transaksi yang mengarahkan tenant ke metode bayar yang tepat.

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
