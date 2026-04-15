# Memory Bank Antigraviti

Ini adalah dokumen *living memory* (memori hidup) proyek Jalawarta. Dokumen ini wajib diperbarui oleh Antigraviti (AI Assistant) secara mandiri setiap kali ada fitur, bug, atau arsitektur baru yang diselesaikan. Dokumen ini menjadi sumber kebenaran tunggal untuk standar proyek, pencegahan bug berulang, dan protokol keamanan.

## Current State

**Proyek**: Jalawarta (Berita Multi-Tenant Modern)
**Fase MVP**: `v0.0.1` (Dalam Pengembangan Aktif)

**Status Saat Ini:**
- ✅ **Core Infra**: Next.js 15 (App Router), Bun, Drizzle ORM, PostgreSQL.
- ✅ **Multi-Tenant Auth**: Sistem login dan manajemen *custom session* (`jw_session`) berbasis JWT yang sukses mengisolasi token antar tenant. Akses dasbor sudah dilindungi.
- ✅ **Manajemen Pengguna (WP-Style)**: Fitur profil, aktivasi (`isActive`), proteksi penghapusan aman (*safe-delete*), role-based capability system.
- ✅ **Sistem Add-on Modular**: Registrasi plugin berbasis tenant. *Contact Form Advanced*, integrasi *Google Search/Analytics* terpadu, dan *Meta Pixel Tracking* telah selesai diimplementasikan.
- ✅ **Web Platform (Super Admin)**: Dasbor `platform.localhost` berjalan di subdomain terpisah via `src/proxy.ts`. Mencakup: Manajemen Paket SaaS (dengan Feature Bundling modul/add-on), Katalog Core Modules, Add-on Marketplace, dan **API Key Vault** (AES-256-GCM). Lihat `docs/14-arsitektur-platform-web.md` dan `docs/16-arsitektur-platform-apikey.md`.
- 🚧 **Fokus Saat Ini (Opsi A)**: Membangun ekosistem **Editor Block Patterns & Visual Shortcodes** di Tiptap (Gutenberg-style).
- 🔜 **Perencanaan Berikutnya (Sesuai Urutan)**:
  - **(Opsi B)** Media Library Terpusat: Membangun laman dasbor spesifik untuk manajemen aset visual per-tenant.
  - **(Opsi C)** Pembangunan Frontend Publik: Mendesain Template "The Reader" dengan performa mobile-first (pengganti AMP).
  - Multilingual (i18n) dan Integrasi Export/Import Data WXR (WordPress Migrator).

---

## Technical Standards

Standar koding ini diwajibkan oleh ekosistem Jalawarta berdasarkan [01-perencanaan-jalawarta.md]:

1. **Next.js 15 Asynchronous Props**: 
   - Di Next.js 15, `params` dan `searchParams` dalam Server Components / Pages **WAJIB** diperlakukan sebagai Promise. Selalu gunakan `const { id } = await params;`. Jangan pernah mengaksesnya secara langsung (akan menyebabkan runtime error).
2. **Multi-Tenant Database Queries (Drizzle)**: 
   - Setiap kali melakukan instruksi `select()`, `update()`, atau `delete()` pada tabel yang terhubung ke tenant, **selalu** sisipkan filter tenant: `.where(eq(tabel.tenantId, tenantId))`.
3. **Penyimpanan Data Dinamis (JSONB)**: 
   - Fitur-fitur modular (seperti konfigurasi tipe form kontak atau pengaturan analitik) harus menggunakan field database berjenis `JSONB` untuk menghindari bloat kolom pada arsitektur PostgreSQL.
4. **Tailwind & Heroicons Strictness**:
   - Gunakan pendekatan zero-overhead css. Jangan menggunakan sintaks CSS SASS/SCSS lama seperti `@import` yang sudah usang di Dart Sass 3.0. Selalu andalkan Tailwind v4 (PostCSS).
5. **No Hardcoding**:
   - Konten tata letak (UI) pada front-end tidak boleh diketik keras (hardcode). Harus dirancang menggunakan dictionary (`i18n`) sesuai panduan MVP awal (proses ini akan dimasifkan ke depannya).
6. **Pemisahan Jaringan (SaaS Network Segregation)**:
   - Sistem wajib berpusat pada 4 lapis pembatas domain (*Frontend Landing Page*, *Dasbor Platform*, *Dasbor CMS Tenant*, *Frontend Klien*).
   - DILARANG MERANCANG *Centralized API Server* (seperti sub-domain khusus `api.`) bila bukan untuk integrasi pihak ketiga mandiri (Mobile App). Web internal (Browser/Client Components) WAJIB dieksekusi secara **terdistribusi terbalik** ke Server Actions (Route Handlers lokal) demi menghindari pemblokiran batas ganda lintas negara dan konflik *CORS (Cross-Origin Resource Sharing)*. Lihat rujukannya di `docs/15-arsitektur-domain-topologi.md` secara utuh.

---

## Security Protocols

Saat menganalisa, membuat kode, atau memperbarui logika, saya (Antigraviti) wajib melakukan *cross-check* terhadap kerentanan berikut:

- **[SP-01] Kebocoran Lintas-Tenant (Cross-Tenant Leakage)**: 
  - Pastikan Server Actions yang memodifikasi data **selalu** memverifikasi bahwa ID entitas yang dimanipulasi sama dengan `session.tenantId` pengguna. Jangan pernah mempercayai parameter ID yang dikirim dari klien begitu saja.
- **[SP-02] Proteksi Integritas Relasi (Safe-Delete)**:
  - Dilarang keras melakukan perintah `delete` pada entitas yang memiliki dependensi ekstensif, contohnya: pengguna (yang memiliki artikel/halaman). Sebagai ganti, gunakan pola aktivasi `isActive: boolean` (Soft-deactivate) agar tidak merusak _Foreign Key_ pada DB.
- **[SP-03] Enkripsi Kredensial**:
  - Kolom `password` di entitas `users` harus selalu menggunakan hashing (`bcrypt`). Super Admin dapat mereset milik anggotanya ke string plain, tetapi Server Action **wajib** melakukan hashing ulang sebelum proses insert/update Drizzle.
- **[SP-04] Pengamanan Endpoint Autentikasi**:
  - Pengecekan autentikasi harus berada di tingkat Middleware dan/atau Root Layout untuk mencegah kebocoran antarmuka statis (*flash of unauthenticated content*).
- **[SP-05] Keamanan API Key Vault (Platform Credentials)**:
  - Seluruh API Key pihak ketiga dienkripsi dengan **AES-256-GCM** menggunakan `APP_ENCRYPTION_KEY` (terpisah dari `AUTH_SECRET` JWT).
  - Dekripsi **HANYA** boleh terjadi di sisi server (Server Actions/Components). Plaintext tidak boleh dikirim ke Client Component.
  - Fungsi `getDecryptedCredential(category, provider)` di `src/app/actions/apikeys.ts` adalah satu-satunya antarmuka resmi untuk Add-on mengambil API Key.
  - Lihat `docs/16-arsitektur-platform-apikey.md` untuk detail skema dan alur eksekusi.

---

## Learning Log

*Log pembelajaran adaptif Antigraviti selama pengembangan proyek Jalawarta.*

| Tanggal | Masalah / Error yang Dihadapi | Pelajaran (Self-Correction & Resolusi) |
| :--- | :--- | :--- |
| **09 Apr 2026** | Bug NextAuth Tenant-Hopping: Admin terdeteksi sebagai `SUBSCRIBER` karena bentrok konteks routing antar tenant di NextAuth. | **Solusi**: Kita "pensiunkan" `next-auth` untuk manajemen sesi backend portal tenant. Beralih menggunakan JWT manual (`jose`) dan kuki `jw_session` yang disematkan langsung ID tenant, rolenya, dsb. Lebih ringan dan *bug-free*. |
| **10 Apr 2026** | Error PostgreSQL: `relation comments does not exist` saat inisiasi skema Drizzle | **Solusi**: Error tipografi/relasi di `schema.ts`. Perbaiki dan selalu pantau proses *push* secara manual apabila mendapati relasi multi-tabel. Gunakan Bun x drizzle-kit push dengan seksama. |
| **10 Apr 2026** | Bug Next.js Runtime: `TypeError` karena properti `params.id` pada `/users/[id]` diakses secara langsung. | **Self-Correction**: Framework baru (Next 15) mewajibkan `await params`. Mulai detik ini, setiap pembuatan halaman dinamis, saya wajib mengingat instruksi `await params` atau `await searchParams`. |
| **10 Apr 2026** | Re-render fail: JSX string literal `[contact-form id="{form.id}"]` menjadi teks literal mentah. | **Solusi**: Pembuatan syntax khusus di dalam React tak bisa memakai brackets string. Wajib dibungkus dengan Template Literals: `` {`[contact-form id="${form.id}"]`} ``. |
| **12 Apr 2026** | Evaluasi Monolithic API: `PostEditorClient` terlalu lekat dengan *Post* (Kategori/Tag) sehingga sulit di *reuse* untuk Tipe Laman lain. | **Solusi**: Refactoring ke Pola Komponen Keranjang (Nested/Slot). Komponen EditorInti (`UniversalEditor`) dipisah dari komponen API Server. Panel relasi seperti Tag/Kategori dikirim sebagai `children` (slots). Konsep *Decoupling* CMS tingkat tinggi berhasil dipraktikkan. |
| **14 Apr 2026** | Kolom non-async (`API_CATEGORIES`) di-export dari file `"use server"` menyebabkan runtime error Next.js. | **Pelajaran**: File `"use server"` hanya boleh meng-export `async function`. Konstanta/object statis WAJIB dipindahkan ke file `lib/` terpisah yang bebas dari direktif tersebut. |
| **15 Apr 2026** | Vulerability *Cross-Tenant Leakage* di `insights-generate.ts` | **Pelajaran Keamanan**: Pemanggilan UUID Record pada arsitektur Drizzle Multi-Tenant tidak cukup dengan sekadar `where: eq(id, ...)`! WAJIB selalu digabung dengan `eq(tenantId, session.tenantId)` untuk mencegah satu penyewa bisa mengeksekusi konten lintas penyewa lainnya. SP-01 Proteksi diperketat. |
| **15 Apr 2026** | Login di `platform.localhost` loop redirect tanpa pernah masuk. | **3 Bug Chained**: (1) `login.ts` tidak mengenali `PLATFORM_ADMIN` — selalu cari tenant yang tidak ada, hasilkan role `SUBSCRIBER`; (2) `platform/layout.tsx` cek `dbUser.role === "PLATFORM_ADMIN"` dan redirect ke `/` jika gagal; (3) `app-login/page.tsx` setelah sukses `router.push("/")` tanpa baca `callbackUrl`. **Solusi**: Deteksi `PLATFORM_ADMIN` lebih awal di `login.ts` sebelum query tenant, set role di session JWT. Redirect pakai `window.location.href = callbackUrl`. Buat `scripts/seed-platform-admin.ts` terpisah. |
