# Milestone & Roadmap Pengembangan Jala Warta

Dokumen ini secara komprehensif melacak rekam jejak penyelesaian fitur dan berfungsi sebagai kompas untuk tahapan pengembangan sistem *Software-as-a-Service* (SaaS) Jala Warta selanjutnya.

---

## 🟢 MILESTONE 1: Fondasi Arsitektur & Database (Selesai)
*Fase merakit kerangka server, basis relasional, dan keamanan identitas aplikasi.*

- **Inisialisasi Teknologi:** Menyetel Next.js 16 (App Router) dengan Bun *runtime* untuk kecepatan maksimal.
- **Topologi Database relasional:** Setup PostgreSQL dengan Drizzle ORM.
- **Desain Skema SaaS:** Pembuatan skema kunci meliputi `users`, `tenants`, `posts`, `categories`, `tags`, `pages`, `media`, serta relasi *many-to-many* (`post_categories` & `post_tags`).
- **Proxy Middleware (Edge):** Mengatur perutean lalu lintas cerdas di level server. Permintaan ke `app.domain.com` diarahkan ke Admin, sementara subdomain lain dialihkan ke tampilan laman publik.
- **Autentikasi Stateless:** Pembuatan sistem login khusus menggunakan JSON Web Token (library `jose`) untuk enkripsi keamanan cookie sesi yang cepat tanpa terus-menerus *query* basis data.

---

## 🟢 MILESTONE 2: Dasbor Admin & CMS Core (Selesai)
*Fase membangun "Dapur Redaksi" bagi pengelola konten tenant.*

- **Interface Modern:** Membangun tatap muka dasbor responsif (dukungan Dark/Light mode) menggunakan Tailwind CSS v4.
- **Sistem Navigasi Dinamis (Sidebar):** Struktur hierarki berbahasa Inggris utuh mencakup (Dashboard, Posts, Pages, Media Library, Add-Ons).
- **Isolation Data Tenant:** Penerapan 100% *Dynamic Session*. Filter kueri Drizzle membaca dari JWT `session.tenantId` untuk menjaga privasi data agar tidak ada percampuran konten antar-tenant.
- **Pengelola Kategori & Tag (Taxonomy):** Sistem CRUD tabel rapi dengan generator *slug* otomatis.
- **Tiptap Post Editor (`/posts`):** 
  - Editor narasi *Rich Text* penuh.
  - Komponen sidebar dinamis mendata `checkbox` relasi Tag & Kategori dari database.
  - Pemilihan gambar *Featured Image* yang aman menyalin relasi.
- **Page Editor (`/pages`):** Penyesuaian editor untuk entitas *flat content* (Kontak, Profil Perusahaan, dll).
- **Media Library Central Hub (`/media`):**
  - Mengunggah berkas via *Drag & Drop*.
  - Penyimpanan fisik otomatis dengan sanitasi `crypto.randomUUID()`.
  - Panel Rincian Metadata, visual grid gallery, serta mekanisme *Hapus Permanen*.
  - **[NEW] Smart Metadata & Auto-save:** Implementasi kolom `alt_text`, `caption`, dan `description` dengan mekanisme *auto-save (debounce)* serta fitur **Pencarian instan** berbasis teks di tingkat galeri.
- **[NEW] Global Site Settings:**
  - Panel pengaturan mandiri bagi tenant: Judul situs, Slogan, Favicon (Picker Terintegrasi), dan Teks Footer.
  - Slot **Custom Domain** untuk pemetaan identitas web profesional.
  - Sakelar kontrol: **Mode Pemeliharaan (Maintenance)** dan **Visibilitas Mesin Pencari (SEO Indexing)**.
- **[NEW] Dynamic Localization:** Sistem pemformatan tanggal dinamis yang merespons secara otomatis terhadap pilihan **Zona Waktu** (WIB, WITA, WIT, dll) dan preferensi bahasa yang disetel di dasbor.
- **[NEW] Advanced Taxonomy (Wordpress Logic):** Transformasi modul Tag dari kotak centang statis menjadi input **Auto-complete Pill-based** yang mendukung fitur *Auto-create* tag baru secara instan saat artikel disimpan.

---

## ✅ Add-on: AI Insights (Selesai — 18 Apr 2026)

*Seluruh alur riset konten & generate artikel via AI telah berjalan end-to-end.*

- **Saved Insights → Jadikan Artikel**: `dispatchInsightGeneration` scrape URL sumber, kirim ke AI, ekstrak `<h1>` sebagai judul post, simpan `{ html: bodyHtml }` ke DB, redirect ke editor. Judul yang tampil di editor = judul buatan AI, bukan topik insight.
- **News Insight & Competitor Monitor → Buat Artikel**: `scrapeAndGenerateArticle` scrape URL via Firecrawl REST API, generate AI, ekstrak `<h1>` server-side, simpan ke `sessionStorage`, redirect ke editor baru. Judul & konten terisi otomatis.
- **Perbaikan Firecrawl**: Dua implementasi Firecrawl yang inkonsisten (SDK vs REST) dikonsolidasi — `src/lib/scraper/firecrawl.ts` diubah ke raw `fetch` sehingga konsisten dengan `src/lib/insight-providers/firecrawl.ts`.
- **Error handling**: `scrapeAndGenerateArticle` kini punya `try/catch` penuh — error dikembalikan sebagai `{ success: false, error }` bukan throw (eliminasi 500).
- **Content normalizer editor**: `posts/editor/page.tsx` handle format lama `{ id: html, en: '' }` dan format insight `{ html: string }` agar Tiptap tidak tampilkan "Invalid content".

---

## 🟡 MILESTONE 3: Front-End Publik (Fokus Saat Ini)
*Fase mendesain paras website. Mengonversi data mentah dari mesin CMS menjadi portal berita yang dapat dinikmati pengunjung.*

- **Arsitektur Front-End Wildcard:** Implementasi direktori `src/app/(public)/[domain]` untuk menangani render *website tenant*.
- **Portal Peraih Perhatian (Premium UI):** Mendesain tata letak situs elegan untuk berita (Hero Layout, Grid, Sidebar Trending) memastikan standar estetika premium dan tinggi asimilasi SEO.
- **Halaman Artikel Statis (SSR):** Parameter Server-Side Rendering untuk indeksasi mulus bagi mesin pencari raksasa saat membaca halaman artikel detail `/post/[slug]`.
- **Integrasi Metadata & SEO Dinamis:** Menyuntikkan meta tags otomatis berdasarkan data `title`, `excerpt`, dan `featuredImage` artikel/halaman.

---

## 🔴 MILESTONE 4: SaaS Billing & Add-On Manajemen (Rencana Masa Depan)
*Fase mendulang pundi-pundi. Mewujudkan elemen langganan (Subscription) murni.*

- **Sistem *Tiering* Paket:** Membatasi kuota batas unggah *Media Library* & batasan penambahan anggota jurnalis pada *tenant* bergantung paket (Free/Pro/Enterprise).
- **Billing Gateway:** Integrasi gerbang pembayaran otomatis (Midtrans/Xendit/Stripe) via *webhook*.
- **Sistem Modul Ekstensi (Add-On):** Aktivasi fitur ekstra premium seperti analitik detail, plugin optimasi iklan spesifik, hingga export PDF/Reporting bagi tenant terpilih.
