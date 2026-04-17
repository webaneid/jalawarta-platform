@AGENTS.md

# Jalawarta — Panduan AI Assistant

Platform berita multi-tenant modern berbasis Next.js (App Router), Bun, Drizzle ORM, dan PostgreSQL. Dokumen ini adalah sumber kebenaran utama bagi AI assistant saat bekerja di repositori ini.

---

## Arsitektur & Dokumentasi

Selalu baca dokumen arsitektur relevan **sebelum** mengimplementasikan atau mengubah fitur. Semua file ada di folder [`/docs/`](./docs/):

| File | Topik |
|---|---|
| [`01-perencanaan-jalawarta.md`](./docs/01-perencanaan-jalawarta.md) | Visi, tujuan, fitur MVP, standar pengembangan |
| [`02-arsitektur-database.md`](./docs/02-arsitektur-database.md) | Topologi database, overview skema |
| [`03-arsitektur-addon-contact.md`](./docs/03-arsitektur-addon-contact.md) | Desain Contact Form Advanced addon |
| [`04-milestone-dan-progress.md`](./docs/04-milestone-dan-progress.md) | Progress tracker & roadmap milestone |
| [`05-arsitektur-seo.md`](./docs/05-arsitektur-seo.md) | Arsitektur SEO dinamis |
| [`06-arsitektur-tools.md`](./docs/06-arsitektur-tools.md) | Integrasi tools |
| [`07-arsitektur-user.md`](./docs/07-arsitektur-user.md) | Manajemen user & role system |
| [`08-arsitektur-ui.md`](./docs/08-arsitektur-ui.md) | Arsitektur UI |
| [`09-arsitektur-pengembangan.md`](./docs/09-arsitektur-pengembangan.md) | Standar pengembangan |
| [`10-arsitektur-addon-contact.md`](./docs/10-arsitektur-addon-contact.md) | Form builder, dynamic fields, submission tracking |
| [`11-arsitektur-addon-google-analitycs.md`](./docs/11-arsitektur-addon-google-analitycs.md) | Google Analytics addon |
| [`12-arsitektur-addon-metapixel.md`](./docs/12-arsitektur-addon-metapixel.md) | Meta Pixel tracking addon |
| [`13-arsitektur-tiptap-editor.md`](./docs/13-arsitektur-tiptap-editor.md) | Tiptap editor (rich text, Gutenberg-style blocks) |
| [`14-arsitektur-platform-web.md`](./docs/14-arsitektur-platform-web.md) | Filosofi & model bisnis SaaS Platform Admin |
| [`15-arsitektur-domain-topologi.md`](./docs/15-arsitektur-domain-topologi.md) | **WAJIB BACA** — Network segregation, 4 pilar subdomain, API terdistribusi |
| [`16-arsitektur-platform-apikey.md`](./docs/16-arsitektur-platform-apikey.md) | **WAJIB BACA** — API Key Vault, AES-256-GCM, alur enkripsi/dekripsi |
| [`17-arsitektur-addon-ai-generator.md`](./docs/17-arsitektur-addon-ai-generator.md) | AI text generation addon |
| [`18-arsitektur-addon-image-generator.md`](./docs/18-arsitektur-addon-image-generator.md) | AI image generation addon |
| [`18-arsitektur-addon-insights.md`](./docs/18-arsitektur-addon-insights.md) | Analytics insights addon (news & social) |
| [`19-arsitektur-github.md`](./docs/19-arsitektur-github.md) | GitHub integration |
| [`20-arsitektur-deploy.md`](./docs/20-arsitektur-deploy.md) | Deployment architecture |
| [`21-arsitektur-platform-implementasi.md`](./docs/21-arsitektur-platform-implementasi.md) | **WAJIB BACA** — Implementasi aktual platform: status fitur, skema DB, gap, learning log |
| [`22-arsitektur-addon-standar.md`](./docs/22-arsitektur-addon-standar.md) | **WAJIB BACA** — Blueprint standar membangun add-on baru (Inject & Feature), checklist lengkap |
| [`23-arsitektur-firecrawl.md`](./docs/23-arsitektur-firecrawl.md) | **WAJIB BACA** — Web Scraping Engine: Firecrawl integration, alur URL→scrape→AI, API Vault |

---

## Peta Sistem

```
src/
├── app/
│   ├── (utama)/          # Landing page jalawarta.com
│   ├── app/              # CMS Dashboard (app.jalawarta.com)
│   │   ├── addons/       # Manajemen plugin per-tenant
│   │   ├── posts/        # Editor artikel (Tiptap)
│   │   ├── pages/        # Editor halaman statis
│   │   ├── media/        # Media library
│   │   ├── categories/   # Manajemen taksonomi
│   │   ├── tags/         # Manajemen tag
│   │   ├── users/        # Manajemen anggota redaksi
│   │   ├── settings/     # Konfigurasi tenant
│   │   └── insights/     # Analitik & riset konten
│   ├── platform/         # Super Admin (platform.jalawarta.com)
│   │   ├── addons/       # Global addon marketplace
│   │   ├── api-keys/     # API Key Vault
│   │   ├── modules/      # Katalog core modules
│   │   └── packages/     # SaaS package management
│   ├── [domain]/         # Frontend publik tenant (reader view)
│   ├── app-login/        # Shared login form
│   └── actions/          # Server Actions (27 file, tanpa centralized API)
├── lib/
│   ├── session.ts        # JWT session (jose) — cookie jw_session
│   ├── encryption.ts     # AES-256-GCM untuk API Key Vault
│   ├── auth/             # Guards & capabilities (role-based)
│   ├── plugins/registry.ts # Plugin registry & slot system
│   └── ai-generator/     # Integrasi Anthropic, Google, OpenAI
├── components/           # React components (Editor, MediaLibrary, SeoPanel, dll)
├── db/                   # Drizzle schema & migrations
├── plugins/              # Plugin implementations (GA, Meta Pixel)
└── proxy.ts              # Next.js Middleware — multi-tenant routing
```

### Routing Multi-Tenant (src/proxy.ts)

| Hostname | Tujuan | Auth Required |
|---|---|---|
| `localhost` / `jalawarta.com` | `/` (landing) | Tidak |
| `platform.localhost` | `/platform` (Super Admin) | Ya — `PLATFORM_ADMIN` |
| `app.localhost` | `/app` (CMS Tenant) | Ya — tenant member |
| `*.localhost` / custom domain | `/[domain]/` (reader publik) | Tidak |

---

## Standar Koding WAJIB

### 1. Next.js 15 — Async Params
```typescript
// ✅ BENAR
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// ❌ SALAH — runtime error di Next.js 15
export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params.id; // TypeError!
}
```

### 2. Multi-Tenant Database Isolation (WAJIB setiap query)
```typescript
// ✅ BENAR — selalu filter tenantId
await db.select().from(posts)
  .where(and(eq(posts.tenantId, tenantId), eq(posts.id, postId)));

// ❌ SALAH — Cross-tenant vulnerability (SP-01)
await db.select().from(posts).where(eq(posts.id, postId));
```

### 3. File "use server" — Hanya async function
```typescript
// ✅ BENAR — konstanta di lib/ terpisah
// src/lib/api-categories.ts
export const API_CATEGORIES = { AI: "ai", ... };

// ❌ SALAH — runtime error Next.js
"use server";
export const API_CATEGORIES = { AI: "ai" }; // Non-async export dilarang!
```

### 4. JSONB untuk Data Dinamis
Fitur modular (form config, plugin settings, SEO metadata) gunakan kolom `JSONB` di PostgreSQL. Hindari bloat kolom di schema Drizzle.

### 5. No Hardcoding UI
Semua teks antarmuka harus dari dictionary i18n. Tidak ada string literal UI dalam JSX.

### 6. API Terdistribusi (Bukan Centralized API)
Gunakan Server Actions per route — **tidak ada** sub-domain `api.jalawarta.com` untuk web internal. Lihat [`15-arsitektur-domain-topologi.md`](./docs/15-arsitektur-domain-topologi.md).

### 7. Tailwind v4 + Heroicons
Zero-overhead CSS. Jangan pakai `@import` SCSS/SASS lama. Gunakan PostCSS.

### 8. Template Literals untuk Shortcode di JSX
```tsx
// ✅ BENAR
<span>{`[contact-form id="${form.id}"]`}</span>

// ❌ SALAH — render sebagai teks literal mentah
<span>[contact-form id="{form.id}"]</span>
```

---

## Protokol Keamanan

### SP-01: Anti Cross-Tenant Leakage
Setiap Server Action yang memodifikasi data **wajib** memverifikasi `session.tenantId` sesuai dengan entitas yang dimanipulasi. Jangan pernah percaya ID dari client request saja.

### SP-02: Safe-Delete (Soft Deactivation)
**Dilarang keras** `DELETE` pada entitas dengan dependensi (users, posts). Gunakan `isActive: boolean` (soft-deactivate) untuk menjaga integritas foreign key.

### SP-03: Password Hashing
Kolom `password` selalu gunakan `bcrypt`. Server Action **wajib** hash ulang sebelum insert/update, meski admin reset ke string plain.

### SP-04: Auth di Middleware & Root Layout
Pengecekan autentikasi harus di level `src/proxy.ts` (Middleware) dan Root Layout — mencegah flash unauthenticated content.

### SP-05: API Key Vault — AES-256-GCM
- Enkripsi: `APP_ENCRYPTION_KEY` (32-byte hex), terpisah dari `AUTH_SECRET` JWT
- Format cipher: `iv:authTag:cipherHex`
- Dekripsi **hanya** di Server Actions/Components — plaintext TIDAK BOLEH dikirim ke Client Component
- Satu-satunya antarmuka resmi: `getDecryptedCredential(category, provider)` di `src/app/actions/apikeys.ts`
- Detail skema: [`16-arsitektur-platform-apikey.md`](./docs/16-arsitektur-platform-apikey.md)

---

## Session & Auth

**Custom JWT Session** (bukan next-auth — sudah dipensiunkan karena bug tenant-hopping):
- Library: `jose`
- Cookie: `jw_session` (httpOnly, 7 hari)
- Payload: `{ userId, tenantId, subdomain, name, email, role, expiresAt }`
- File: `src/lib/session.ts`

**Role System** (WordPress-style):
- `PLATFORM_ADMIN` — Super Admin platform (login di `platform.localhost`)
- `SUPER_ADMIN` — Admin tenant
- `EDITOR`, `WRITER`, `SUBSCRIBER` — Anggota redaksi

**KRITIS**: Login `PLATFORM_ADMIN` dideteksi **lebih awal** di `login.ts` sebelum query tenant. Jangan ubah urutan ini.

---

## Plugin System

Registry di `src/lib/plugins/registry.ts`. Plugin slots: `header`, `footer`, `sidebar`, `content`.

Plugin aktif saat ini:
- `meta-pixel` — Meta Pixel Advanced (slot: header)
- `google-search-analytics` — GA4 + Search Console (slot: header)
- `advanced-contact-form` — Dynamic form builder (slot: content)

Config per-tenant disimpan di tabel `tenantPlugins` (kolom `config` JSONB).

---

## Komponen Arsitektur Kritis

### Editor (Tiptap)
- `src/components/Editor.tsx` — wrapper utama
- `src/components/editor/` — extensions, block patterns
- Pola: **Slot-based / Decoupled** — `UniversalEditor` terpisah dari panel relasi (Tag/Kategori dikirim sebagai `children`)

### Media Library
- `src/components/MediaLibrary.tsx`, `MediaManagerClient.tsx`
- Upload via drag & drop, sanitasi UUID, metadata auto-save dengan debounce

### SEO Panel
- `src/components/SeoPanel.tsx` (~20KB) — panel pengaturan SEO per artikel/halaman

---

## Environment Variables Kunci

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | JWT signing key (`jw_session`) |
| `APP_ENCRYPTION_KEY` | AES-256-GCM key (32-byte hex) untuk API Key Vault |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Root domain (e.g. `jalawarta.com`) |
| `NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX` | Vercel preview suffix |

---

## Learning Log — Bug Kritis Yang Pernah Terjadi

Pelajaran dari `ANTIGRAVITI.md` yang harus dicegah berulang:

| Tanggal | Bug | Pelajaran |
|---|---|---|
| 09 Apr 2026 | NextAuth tenant-hopping | Gunakan custom JWT `jose` + `jw_session`, bukan next-auth |
| 10 Apr 2026 | `params.id` diakses langsung | Selalu `const { id } = await params` di Next.js 15 |
| 10 Apr 2026 | Shortcode jadi teks literal | Gunakan template literals `` {`[form id="${id}"]`} `` |
| 12 Apr 2026 | `PostEditorClient` terlalu monolitik | Pola Slot/Nested: `UniversalEditor` + children untuk panel relasi |
| 14 Apr 2026 | Export konstanta dari `"use server"` | File `"use server"` hanya boleh export `async function` |
| 15 Apr 2026 | Cross-tenant leakage di `insights-generate.ts` | Query **wajib** gabung `eq(id, ...)` + `eq(tenantId, session.tenantId)` |
| 15 Apr 2026 | Login `platform.localhost` loop redirect (3 bug berantai) | (1) Deteksi `PLATFORM_ADMIN` di `login.ts` **sebelum** query tenant; (2) Redirect pakai `window.location.href=callbackUrl` bukan `router.push`; (3) Seed admin via `scripts/seed-platform-admin.ts` |

Untuk log lengkap dan detail resolusi, lihat [`ANTIGRAVITI.md`](./ANTIGRAVITI.md).

---

## Gap Platform — Belum Diimplementasikan

Fitur berikut **ada di UI sidebar tapi belum ada implementasinya** (akan 404 jika dibuka):

| Rute | Keterangan | Prioritas |
|---|---|---|
| `/platform/tenants` | Menu "Semua Tenants" di sidebar — folder tidak ada | 🔴 Tinggi |
| `/platform/addons/[id]` | Tombol "Detail & Config" di add-on card — stub | 🟠 Sedang |
| `/platform/modules/[id]` | Tombol "Setup Config" di module card — stub | 🟡 Rendah |
| `/platform/addons` → Register | Tombol "Daftarkan Plugin Baru" — stub | 🟠 Sedang |

Detail scope dan Server Actions yang dibutuhkan: [`21-arsitektur-platform-implementasi.md`](./docs/21-arsitektur-platform-implementasi.md) bagian 8.

---

## Status Proyek (per April 2026)

- ✅ **Milestone 1**: Fondasi arsitektur & database
- ✅ **Milestone 2**: CMS Dashboard (posts, pages, media, users, settings, taxonomy)
- ✅ **Platform Web**: packages, API Key Vault, modules, addon marketplace
- ✅ **Add-ons**: Contact Form Advanced, Google Analytics/Search, Meta Pixel, AI Generator, Insights
- 🚧 **Fokus Saat Ini**: Editor Block Patterns & Visual Shortcodes (Tiptap, Gutenberg-style)
- 🔜 **Berikutnya**: Media Library dashboard, Frontend "The Reader" template, i18n, WXR import/export
