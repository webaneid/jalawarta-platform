# Arsitektur Database & Struktur Platform

Dokumen ini menjelaskan struktur arsitektur sistem dan database PostgreSQL untuk platform Jala Warta v0.0.1. Kombinasi **Next.js (Framework)** yang berjalan di atas **BUN (Runtime/Engine)** memastikan performa server yang sangat ringan, cepat, dan hemat memori, sangat cocok untuk arsitektur multi-tenant.

## 1. Topologi Multi-Tenant

Sistem ini menganut model **Single Database, Shared Schema**. Opsi terbaik dari sisi memori dan koneksi database di PostgreSQL ketika menampung ratusan hingga ribuan tenant.
Setiap tabel data yang berhubungan dengan tenant akan memiliki kolom pengunci `tenant_id`.
Middleware Next.js App Router akan bertugas mengekstraksi `domain` atau `subdomain` dari request pengunjung, lalu meneruskannya secara internal.

### Contoh Routing:
- Pengunjung akses -> `tenant-a.jalawarta.com` -> Middleware Next.js mencari `tenant_id` berdasarkan domain tersebut -> Load UI Next.js wilayah tenant -> Load artikel dengan filter `where tenant_id = 'X'`.

## 2. Struktur Tabel Database (Drizzle ORM)

Untuk versi 0.0.1, skema kita dirancang minimalis tanpa entitas berlebihan:

### Tabel `users`
Menyimpan akun pengguna. Semua pengguna (termasuk superadmin platform atau pemilik tenant) masuk di sini.
- `id` (UUID)
- `email` (String, Unique)
- `password_hash` (String)
- `role` (Enum: SUPERADMIN, TENANT_OWNER)

### Tabel `tenants`
Mengelola informasi dan profil setiap tenant web.
- `id` (UUID)
- `owner_id` (Relasi ke `users.id`)
- `subdomain` (String, Unique) -> misal: `berita-hits`
- `custom_domain` (String, Nullable, Unique) -> misal: `beritahits.com`
- `site_name` (String)
- `theme_id` (String) -> Penanda opsi 2 template front-end.
- `analytics_script` (Text, Nullable) -> Injeksi GTAG/GTM.
- `schema_config` (JSONB) -> Setting warna custom, lokalisasi bahasa, dll.

### Tabel `posts`
Artikel milik tenant. Terhubung ke tenant.
- `id` (UUID)
- `tenant_id` (Relasi mutlak ke `tenants.id`)
- `slug` (String, Unique per tenant_id)
- `title` (JSONB) -> Mendukung `{ "en": "Post Title", "id": "Judul Post" }` tanpa hardcode.
- `content` (JSONB) -> Sama seperti title, berisi tag HTML.
- `featured_image` (String, Nullable)
- `status` (Enum: DRAFT, PUBLISHED)
- `created_at` (Timestamp)

### Tabel `pages`
Mirip dengan posts, tetapi tidak memiliki struktur arsip waktu. Murni statik per tenant.
- `id` (UUID)
- `tenant_id` (Relasi mutlak ke `tenants.id`)
- `slug` (String, Unique per tenant_id)
- `title` (JSONB)
- `content` (JSONB)

## 3. Strategi Lokalisasi (i18n)

Untuk mewujudkan *Zero Hardcoding*, setiap entitas dengan teks akan menggunakan tipe kolom **JSONB**. Format default pengikatan bahasanya:
```json
{
  "en": "Ini konten bahasa inggris (default)",
  "id": "Ini konten bahasa indonesia"
}
```
Front-end akan mengecek bahasa yang sedang aktif di Next.js (seperti format `/en/` atau `/id/`), untuk mencocokkan struktur JSON saat di-*render*.

_Dicatat secara profesional oleh Jala Warta AI Assistant, April 2026_
