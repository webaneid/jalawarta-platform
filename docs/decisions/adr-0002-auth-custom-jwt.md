# ADR-0002 — Autentikasi: Custom JWT (jose) Bukan NextAuth

**Status:** Accepted

**Tanggal:** 2026-04-09

---

## Konteks

Platform multi-tenant Jalawarta memiliki 3 jenis user dengan routing berbeda:
- `PLATFORM_ADMIN` login di `platform.localhost` — tidak terikat tenant manapun
- Tenant member (SUPER_ADMIN, EDITOR, WRITER, SUBSCRIBER) login di `app.localhost`
- Pembaca publik di `*.localhost` / custom domain — tidak perlu auth

Next.js middleware (`src/proxy.ts`) perlu membaca session di setiap request untuk routing dan auth guard, termasuk membedakan subdomain.

## Opsi yang Dipertimbangkan

1. **Custom JWT dengan library `jose`** — session disimpan di httpOnly cookie `jw_session`, payload mencakup `userId`, `tenantId`, `subdomain`, `role`
2. **NextAuth (Auth.js)** — library auth paling populer di ekosistem Next.js
3. **Lucia Auth** — auth library modern yang lebih ringan dari NextAuth

## Keputusan

**Opsi 1: Custom JWT dengan `jose`, cookie `jw_session`.**

NextAuth dicoba dan menghasilkan bug kritis "tenant-hopping" — session dari satu
tenant bisa dibaca oleh tenant lain karena NextAuth menyimpan dan membaca cookie
tanpa mempertimbangkan subdomain konteks multi-tenant. Bug ini sulit di-fix karena
model session NextAuth tidak dirancang untuk payload custom multi-tenant (tenantId,
subdomain) yang perlu dibaca di Middleware sebelum request sampai ke handler.

Custom JWT memberikan kontrol penuh atas:
- Payload yang dimasukkan ke token
- Cara token dibaca di Middleware
- Logika deteksi `PLATFORM_ADMIN` di awal login sebelum query tenant

## Konsekuensi

**Positif:**
- Full control atas payload JWT — `tenantId`, `subdomain`, `role` tersedia di semua layer (Middleware, Server Component, Server Action) tanpa query DB tambahan
- Deteksi `PLATFORM_ADMIN` di `login.ts` terjadi sebelum query tenant — menghindari redirect loop yang pernah terjadi
- Tidak ada dependency berat — `jose` sangat ringan

**Negatif / Trade-off:**
- Tidak ada refresh token rotation — token expire 7 hari, setelah itu user harus login ulang
- Tidak ada built-in session invalidation (logout invalidate cookie di client, tapi token masih valid secara kriptografi sampai expire)
- Semua fitur auth harus diimplementasikan manual (password reset, email verification jika dibutuhkan)

**Netral:**
- Cookie name: `jw_session`, httpOnly, 7 hari
- File: `src/lib/session.ts`
- Payload: `{ userId, tenantId, subdomain, name, email, role, expiresAt }`

---

> Keputusan ini diambil setelah incident pada 2026-04-09. Detail bug dan
> resolusinya ada di `ANTIGRAVITI.md` bagian "NextAuth tenant-hopping".
