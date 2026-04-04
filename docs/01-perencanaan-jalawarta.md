# Perencanaan Platform Jala Warta v0.0.1

Dokumentasi ini adalah referensi asli perencanaan proyek Jala Warta v0.0.1, sebuah platform berita multi-tenant berbasis TypeScript.

## Visi & Tujuan
Membangun platform *multi-tenant* yang ringan, berfokus pada kecepatan (Core Web Vitals), SEO dinamis, dukungan multi-bahasa, serta kompatibel dengan WordPress (migrasi WXR XML).

## Konsep Arsitektur Utama
1. **Runtime & Backend:** Menggunakan **BUN** sebagai ekosistem utama untuk performa maksimal.
2. **Framework Web:** Memanfaatkan **Next.js (App Router)**. Sangat diperlukan untuk kebutuhan me-routing *wildcard subdomain* (contoh: `tenant.jalawarta.com`) dan integrasi *custom domain* seperti halnya wordpress.com menggunakan Next.js Middleware.
3. **Database:** PostgreSQL dengan **Drizzle ORM**. Tipe database relasional paling stabil untuk model multi-tenant (menyimpan `tenant_id` pada tiap tabel, atau skema terpisah).
4. **Styling & UI:** **Tailwind CSS** dipadukan dengan **Heroicons** untuk menjaga ukuran HTML/CSS seminimal mungkin. Tanpa memuat ribuan class atau properties yang tak terpakai.

## Fitur (MVP v0.0.1)
- **Multi-Tenant System:** Login tenant terpusat di `jalawarta.com`, dengan halaman pembaca berada di subdomain/domain-custom tenant.
- **Multilanguage (i18n):** Default bahasa adalah English (`en`). Skema tabel di desain agar mendukung lokalisasi (jsonb fallback atau entity terpisah). Tanpa menggunakan hardcode di view.
- **Post & Page:** Manajemen artikel berita modern untuk menghasilkan struktur XML sitemap dan JSON-LD yang ramah AI dan Google.
- **Settings:** Konfigurasi metatag, penamaan situs, injeksi script pihak ketiga secara profesional (GTM, Analytics).
- **Template Berita:** Pengembangan awal mencakup 2 (dua) opsi template berdesain cerah, ultra-cepat, dan difokuskan pada mobile-first experience pengganti AMP tradisional.
- **Export/Import XML:** Tool khusus untuk *parsing* format XML WXR buatan WordPress agar mudah memindahkan data.

## Standar Pengembangan
- **Zero Hardcoding**: Semua teks UI wajib diambil dari dictionary localization.
- **Strict TypeScript**: Semua variabel harus bertipe (type-safe).
- **Clean Architecture**: Pemisahan jelas antara layer *database (ORM)*, *logic/service*, dan *presentation (UI)*.
- **SEO & Google Ecosystem**: URL canonical otomatis, sitemap.xml otomatis dari sisi server, serta injeksi Google Analytics/Search Console.

*Dokumen ini akan terus diperbarui secara historis seiring perkembangan framework.*
