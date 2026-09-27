# Arsitektur Custom Domain — Perencanaan Implementasi

> **Status**: Draft — menunggu persetujuan sebelum eksekusi  
> **Terkait**: `docs/15-arsitektur-domain-topologi.md`, `src/proxy.ts`, `src/db/schema.ts`  
> **Referensi**: jalajogja `apps/web/middleware.ts` (audited 2026-07-16)

---

## 1. Situasi Saat Ini — Apa yang Broken

### Bug Kritis di `src/proxy.ts` (baris 96)

```typescript
// BUGGY — hostname dipakai langsung sebagai slug path
return NextResponse.rewrite(new URL(`/${hostname}${path}`, req.url));
```

**Konsekuensi nyata:**

| Tipe akses | hostname | Rewrite ke | DB query di `[domain]/layout.tsx` | Hasil |
|---|---|---|---|---|
| Subdomain tenant | `namaberita.localhost` | `/namaberita.localhost/...` | `customDomain = 'namaberita.localhost'` | ❌ 404 (tidak ada di DB) |
| Custom domain | `ikpmjogja.com` | `/ikpmjogja.com/...` | `customDomain = 'ikpmjogja.com'` | ⚠️ Kebetulan match, tapi slug-path inkonsisten |
| Subdomain prod | `namaberita.jalawarta.com` | `/namaberita.jalawarta.com/...` | `customDomain = 'namaberita.jalawarta.com'` | ❌ 404 |

**Root cause**: Middleware tidak melakukan lookup DB sama sekali — langsung embed hostname ke URL path. Padahal `[domain]` segment seharusnya berisi **slug** (dari kolom `subdomain`), bukan hostname.

### Masalah Sekunder

1. **Tidak ada domain status machine** — `customDomain` tersimpan di DB tapi tidak ada status verification (pending/active/failed). Domain yang belum terbukti aktif bisa ter-resolve.
2. **Tidak ada www normalization** — `www.namaberita.com` dan `namaberita.com` dianggap dua tenant berbeda.
3. **Tidak ada guard path /app/* dan /platform/* pada custom domain** — secara teori custom domain bisa dipakai sebagai pintu masuk dashboard CMS (belum dikunci).
4. **Logika isOwnHost tersebar inline** — pengujian "apakah ini host milik platform?" diulang-ulang tanpa helper.

---

## 2. Solusi yang Direncanakan

### Gambaran Besar (dari referensi jalajogja)

```
Request masuk
    │
    ▼
proxy.ts (Middleware)
    │
    ├─ isOwnHost? → routing biasa (root/platform/app)
    │
    └─ bukan isOwnHost → ini tenant domain
           │
           ▼
       normalize host (strip www, strip port)
           │
           ▼
       fetch /api/internal/resolve-domain?domain={host}
           │
           ├─ 404 → tenant tidak ditemukan → NextResponse.next() (biarkan 404)
           │
           └─ 200 { slug } → rewrite ke /{slug}{path}
```

---

## 3. Komponen yang Akan Dibuat / Diubah

### 3.1. Internal API: `src/app/api/internal/resolve-domain/route.ts` (BARU)

**Fungsi**: DB lookup — cari tenant berdasarkan hostname, kembalikan slug.

**Logika query** (prioritas bertingkat):
1. Cek apakah `domain` cocok dengan pola subdomain platform → extract slug, verify `tenants.subdomain`
2. Cek apakah `domain` cocok dengan `tenants.customDomain` **dan** `custom_domain_status = 'active'`

**Response**:
```typescript
// 200 OK
{ slug: string, tenantId: string }

// 404 Not Found  
{ error: "domain_not_found" }
```

**Keamanan**: Route ini hanya dipanggil dari Middleware (server-internal). Tidak perlu auth header, tapi idealnya dibatasi hanya dari `127.0.0.1`/loop back (atau via `x-internal-secret` header sederhana di masa depan).

---

### 3.2. Schema Migration: Tambah Domain Status Columns (BARU)

**File**: `src/db/migrations/XXXX_tenant_domain_routing.sql`

Kolom baru di tabel `tenants`:
```sql
ALTER TABLE tenants
  ADD COLUMN custom_domain_status text NOT NULL DEFAULT 'none'
    CHECK (custom_domain_status IN ('none','pending','active','failed')),
  ADD COLUMN custom_domain_verified_at timestamptz,
  ADD COLUMN domain_last_check_at timestamptz,
  ADD COLUMN domain_last_check_error text;
```

**Drizzle schema update** (`src/db/schema.ts`):
```typescript
customDomainStatus: text("custom_domain_status")
  .$type<"none" | "pending" | "active" | "failed">()
  .default("none").notNull(),
customDomainVerifiedAt: timestamp("custom_domain_verified_at", { withTimezone: true }),
domainLastCheckAt: timestamp("domain_last_check_at", { withTimezone: true }),
domainLastCheckError: text("domain_last_check_error"),
```

**Implikasi pada [domain] layout.tsx**: setelah ini, layout sudah tidak perlu query berdasarkan hostname — slug datang dari path. Query menjadi:
```typescript
eq(tenants.subdomain, slug) // slug dari [domain] param
```
(bukan lagi `eq(tenants.customDomain, decodedDomain)`)

---

### 3.3. Helper: `src/lib/is-own-host.ts` (BARU)

```typescript
export function isOwnHost(hostname: string): boolean {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "jalawarta.com";
  return (
    hostname === "localhost" ||
    hostname === root ||
    hostname === `app.localhost` ||
    hostname === `app.${root}` ||
    hostname === `platform.localhost` ||
    hostname === `platform.${root}`
  );
}
```

---

### 3.4. Helper: `src/lib/normalize-host.ts` (BARU)

```typescript
export function normalizeHost(rawHost: string): string {
  return rawHost
    .split(":")[0]        // strip port
    .replace(/^www\./, ""); // strip www prefix
}
```

---

### 3.5. Refactor `src/proxy.ts` (DIUBAH)

Perubahan pada section `// ── TENANT DOMAIN ──`:

```typescript
// SEBELUM (buggy):
return NextResponse.rewrite(new URL(`/${hostname}${path}`, req.url));

// SESUDAH:
const resolveUrl = new URL(`/api/internal/resolve-domain?domain=${hostname}`, req.url);
const resolveRes = await fetch(resolveUrl);

if (!resolveRes.ok) {
  // Domain tidak dikenal — biarkan 404 atau redirect ke root
  return NextResponse.next();
}

const { slug } = await resolveRes.json() as { slug: string };
return NextResponse.rewrite(new URL(`/${slug}${path}`, req.url));
```

Tambahan guard sebelum lookup — blok akses `/app/*` dan `/platform/*` dari custom domain:
```typescript
if (url.pathname.startsWith("/app") || url.pathname.startsWith("/platform")) {
  return NextResponse.redirect(
    new URL("/", `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`)
  );
}
```

---

### 3.6. Update `src/app/[domain]/layout.tsx` (DIUBAH)

Query yang sekarang: `eq(tenants.customDomain, decodedDomain)`  
Query setelah refactor: `eq(tenants.subdomain, slug)` karena `[domain]` param sekarang selalu berisi slug.

---

## 4. Alur Data Lengkap (Setelah Implementasi)

```
Browser request: namaberita.jalawarta.com/post/artikel-xyz
                        │
                  proxy.ts middleware
                        │
              normalizeHost() → "namaberita.jalawarta.com"
                        │
              isOwnHost() → false
                        │
        fetch /api/internal/resolve-domain?domain=namaberita.jalawarta.com
                        │
            resolve-domain route: pattern match subdomain
              → SELECT * FROM tenants WHERE subdomain='namaberita'
              → return { slug: "namaberita", tenantId: "..." }
                        │
        rewrite → /namaberita/post/artikel-xyz
                        │
              [domain]/layout.tsx
              params.domain = "namaberita"
              SELECT * FROM tenants WHERE subdomain='namaberita'
                        │
              Render reader view ✅

---

Browser request: ikpmjogja.com/post/artikel-xyz
                        │
                  proxy.ts middleware
                        │
              normalizeHost() → "ikpmjogja.com"
                        │
              isOwnHost() → false
                        │
        fetch /api/internal/resolve-domain?domain=ikpmjogja.com
                        │
            resolve-domain route: custom domain lookup
              → SELECT * FROM tenants 
                WHERE custom_domain='ikpmjogja.com' 
                AND custom_domain_status='active'
              → return { slug: "ikpmjogja", tenantId: "..." }
                        │
        rewrite → /ikpmjogja/post/artikel-xyz
                        │
              [domain]/layout.tsx
              params.domain = "ikpmjogja"
              SELECT * FROM tenants WHERE subdomain='ikpmjogja'
                        │
              Render reader view ✅
```

---

## 5. Urutan Eksekusi (jika disetujui)

> **Penting**: setiap langkah harus typecheck + lint lolos sebelum lanjut ke langkah berikutnya.

| # | Langkah | File | Catatan |
|---|---|---|---|
| 1 | Tambah kolom schema + migration | `src/db/schema.ts`, `src/db/migrations/XXXX_...sql` | Drizzle generate + push |
| 2 | Buat `isOwnHost()` + `normalizeHost()` helpers | `src/lib/is-own-host.ts`, `src/lib/normalize-host.ts` | Pure functions, mudah di-test |
| 3 | Buat internal resolve-domain API | `src/app/api/internal/resolve-domain/route.ts` | Baru, tidak breaking |
| 4 | Refactor `proxy.ts` | `src/proxy.ts` | Bagian kritis — security-review-reminder akan trigger |
| 5 | Update `[domain]/layout.tsx` + `feed/route.ts` + `sitemap.xml/route.ts` | Semua route di `src/app/[domain]/` | Ganti query customDomain → subdomain |
| 6 | Update `ClientSettings.tsx` + `settings.ts` action | Settings form | Tambah status indicator custom domain |
| 7 | Typecheck + Lint seluruh codebase | — | Gate wajib sebelum commit |
| 8 | Manual test di browser (localhost + custom domain) | — | Golden path + edge case |

---

## 6. Scope Batas — Apa yang TIDAK Masuk Fase Ini

- **Domain verification flow** (cron job DNS check, CNAME validation) — buat ADR terpisah
- **Verifikasi HTTPS/SSL otomatis** — out of scope, perlu Let's Encrypt integration
- **UI status domain di settings** — hanya update query/schema; UI indicator bisa fase berikutnya
- **Migration data existing** — existing `customDomain` rows: `custom_domain_status` akan default `'none'`, artinya tidak akan ter-resolve sampai diset manual ke `'active'` (backward-safe, tidak break existing)
- **Fix pre-existing TypeScript errors** (`next-auth/adapters`, `@mendable/firecrawl-js`) — masalah terpisah, tidak terkait domain

---

## 7. Pertimbangan Keamanan

- **SP-01 (Anti Cross-Tenant Leakage)**: `resolve-domain` API mengembalikan slug; semua query di `[domain]/layout.tsx` tetap harus filter `tenantId` sesuai session jika ada
- **SP-02 (Safe-Delete)**: tidak ada entitas yang dihapus dalam perubahan ini
- Slug double-path prevention: proxy harus cek bahwa path belum mengandung `/{slug}/` sebelum rewrite (mencegah `/namaberita/namaberita/post/...`)
- Custom domain yang belum `active` tidak akan ter-resolve → tenant tidak bisa diakses via custom domain sampai admin platform set status ke active

---

## 8. ADR Baru yang Perlu Dibuat

Setelah implementasi selesai, dokumentasikan keputusan ini sebagai:
- `docs/decisions/adr-0004-custom-domain-routing.md` — keputusan menggunakan internal resolve-domain API pattern (vs. langsung query DB dari middleware)

---

*Dokumen ini adalah output SOP Step 1 (Perencanaan). Tidak ada kode yang diubah. Tunggu persetujuan sebelum eksekusi.*
