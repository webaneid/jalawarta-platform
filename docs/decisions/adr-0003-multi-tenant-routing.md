# ADR-0003 — Routing Multi-Tenant via Next.js Middleware (proxy.ts)

**Status:** Accepted

**Tanggal:** 2026-04-05

---

## Konteks

Jalawarta melayani 4 jenis traffic dengan domain/subdomain berbeda dari satu
deployment Next.js:
- `jalawarta.com` / `localhost` → landing page
- `platform.localhost` / `platform.jalawarta.com` → Super Admin dashboard
- `app.localhost` / `app.jalawarta.com` → CMS tenant dashboard
- `*.localhost` / custom domain tenant → Frontend publik pembaca

Dibutuhkan mekanisme yang intercept setiap request, deteksi subdomain/domain, dan
route ke path Next.js yang tepat — sebelum request sampai ke halaman manapun.

## Opsi yang Dipertimbangkan

1. **Next.js Middleware (`src/proxy.ts`)** — intercept di Edge Runtime, URL rewrite ke path yang tepat berdasarkan hostname
2. **Reverse proxy eksternal (Nginx/Caddy)** — routing di level infra sebelum sampai ke Next.js
3. **Multiple Next.js deployment** — satu app per subdomain (platform, app, public)

## Keputusan

**Opsi 1: Next.js Middleware di `src/proxy.ts` sebagai single entry point.**

- Routing dan auth guard di satu tempat — tidak ada yang "kelewat" karena Middleware jalan di setiap request
- Rewrite URL transparan ke user — `app.jalawarta.com/posts` sebenarnya serve `/app/posts` tapi user tidak tahu
- Custom domain tenant: Middleware baca hostname, match ke tenant di DB (atau lewat header dari reverse proxy), forward ke `/[domain]/` route
- Auth check langsung di Middleware — unauthenticated request ke protected route langsung redirect ke login tanpa perlu load halaman dulu

## Konsekuensi

**Positif:**
- Satu deployment Next.js melayani semua subdomain + custom domain
- Auth guard terpusat — tidak ada flash of unauthenticated content
- Logic routing mudah di-extend untuk custom domain baru tanpa infra change

**Negatif / Trade-off:**
- Middleware jalan di Edge Runtime — tidak bisa akses Node.js APIs, tidak bisa import library yang tidak Edge-compatible
- Query DB di Middleware harus menggunakan driver yang Edge-compatible
- Kompleksitas meningkat kalau aturan routing bertambah — `proxy.ts` bisa jadi bottleneck kalau tidak dijaga tetap sederhana

**Netral:**
- File: `src/proxy.ts`
- Hostname mapping: `localhost`/`jalawarta.com` → `/`, `platform.*` → `/platform`, `app.*` → `/app`, `*` → `/[domain]/`
- Detail lengkap → `docs/15-arsitektur-domain-topologi.md`
