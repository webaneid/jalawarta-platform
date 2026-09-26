# ADR-0001 — Stack Teknologi Inti Jalawarta

**Status:** Accepted

**Tanggal:** 2026-04-05

---

## Konteks

Jalawarta adalah platform berita multi-tenant SaaS. Dibutuhkan stack yang:
- Mendukung monolith yang bisa scale (tidak butuh microservice dari awal)
- Type-safe end-to-end — frontend + server actions + database query
- Runtime modern dengan performa tinggi
- ORM yang aman dari SQL injection dan mendukung schema-as-code
- Styling modern tanpa runtime CSS overhead

## Opsi yang Dipertimbangkan

1. **Next.js + Bun + Drizzle + PostgreSQL + Tailwind v4** — monolith modern, semua ekosistem TypeScript-first
2. **Next.js + Node.js + Prisma + PostgreSQL + Tailwind** — setup lebih mainstream
3. **Remix + Bun + Drizzle + PostgreSQL** — lebih opinionated soal routing, ekosistem lebih kecil

## Keputusan

**Opsi 1: Next.js 15+ (App Router) + Bun + Drizzle ORM + PostgreSQL + Tailwind v4.**

- **Next.js App Router** dipilih karena Server Components + Server Actions mengeliminasi kebutuhan API layer terpisah untuk kebutuhan web internal, mengurangi boilerplate dan latency
- **Bun** sebagai runtime dan package manager karena performa signifikan lebih baik dari Node.js/npm, dan kompatibilitas TypeScript native
- **Drizzle ORM** dipilih karena schema-as-code dengan type-safety penuh, query builder yang parameterized otomatis (aman SQL injection), dan overhead runtime minimal vs Prisma
- **PostgreSQL** untuk JSONB support (plugin config, SEO metadata, form builder — data modular tanpa schema bloat), dan reliabilitas untuk multi-tenant
- **Tailwind v4** untuk zero-runtime CSS, PostCSS-native, tanpa @import SCSS legacy

## Konsekuensi

**Positif:**
- Server Actions menggantikan REST API untuk komunikasi internal — tidak ada `api.jalawarta.com` subdomain untuk web
- Type-safety dari schema Drizzle sampai ke komponen React lewat inference TypeScript
- Bun jalankan Next.js, migration Drizzle, dan scripts dalam satu runtime

**Negatif / Trade-off:**
- Bun ekosistemnya lebih kecil dari Node.js — beberapa package bisa butuh workaround
- App Router + Server Actions masih relatif baru, pola-pola yang optimal masih berkembang
- Tailwind v4 breaking changes dari v3 — tidak bisa copy-paste setup lama

**Netral:**
- Semua dependency dikelola lewat `bun install` di root — tidak pakai npm/yarn/pnpm
