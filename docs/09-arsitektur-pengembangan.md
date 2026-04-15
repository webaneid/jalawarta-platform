# Arsitektur & Strategi Pengembangan (Jalawarta)

Dokumen ini mendokumentasikan standar arsitektur platform Jalawarta, evolusi fitur, serta evaluasi teknis untuk menjaga konsistensi pengembangan di lingkungan Multi-Tenant.

## 1. Perbandingan Fitur (Benchmarking)

| Pilar Fitur | Kemampuan Kunci WordPress | Status Jalawarta |
| :--- | :--- | :--- |
| **Editor** | Gutenberg Blocks, Patterns | Tiptap Editor & Block Patterns |
| **Workflow** | Post Revisions, Presence | **Native Support** (Database Heartbeat) |
| **Media** | Auto-responsive (srcset) | Async Modern Processor (WebP/AVIF) |
| **SEO** | Native Sitemaps, Permalinks | Auto-generated XML & RSS |
| **Keamanan** | Cap-based Roles, Auth System | Unified Custom Session (`jw_session`) |

## 2. Arsitektur Inti (Source of Truth)

### 2.1 Autentikasi Terpadu (Unified Session)
Untuk menghindari konflik antara NextAuth dan sistem routing Proxy, Jalawarta menggunakan **Unified Custom Session**:
- **Cookie Name**: `jw_session` (JWT).
- **Gatekeeper**: `src/proxy.ts` memvalidasi sesi ini di level Middleware untuk semua domain (`app.*` dan tenant).
- **Auth Wrapper**: Fungsi `auth()` di `src/auth.ts` telah dialihkan untuk membaca dari sesi kustom ini, sehingga Dashboard dan Server Components memiliki data sesi yang konsisten.
- **Role System**: Menggunakan sistem *Capabilities* di `src/lib/auth/capabilities.ts`.

### 2.2 Collaboration & Presence Indicator
Fitur kolaborasi real-time diimplementasikan dengan strategi **Database Heartbeat**:
- **Sinkronisasi**: Editor mengirimkan *ping* setiap 15 detik melalui Server Actions (`pingPresence`).
- **Cleanup**: Data kehadiran yang lebih tua dari 30 detik dianggap tidak aktif oleh query pengambilan data.
- **Skalabilitas**: Strategi ini dipilih untuk mendukung skalabilitas multi-tenant tanpa beban infrastruktur WebSocket tambahan.

## 3. Log Evaluasi & Mitigasi Bug (Post-Mortem)

Bagian ini mencatat kesalahan kritis yang ditemukan selama sesi pengembangan untuk menjadi referensi bagi pengembang berikutnya.

### 🔴 Bug: "Split-Brain" Authentication
- **Masalah**: Login menggunakan sistem kustom, tapi Dashboard menggunakan NextAuth. Hal ini menyebabkan sesi tidak terbaca di Dashboard dan memicu *redirect loop*.
- **Pelajaran**: Dalam aplikasi multi-tenant yang menggunakan Proxy/Rewrite di Middleware, sangat disarankan menggunakan **satu sistem sesi terpadu**. Pencampuran format cookie akan menyebabkan kegagalan otorisasi antar domain.

### 🟠 Bug: Data Integrity in Query Select
- **Masalah**: Query `tenants` pada proses login lupa memuat kolom `ownerId`.
- **Dampak**: Logika kalkulasi role gagal mencocokkan pemilik tenant, sehingga Admin "turun pangkat" menjadi Subscriber secara otomatis (menu hilang).
- **Pelajaran**: Selalu sertakan kolom identitas kunci (kunci asing atau ID pemilik) dalam query autentikasi dan otorisasi.

### 🟡 Bug: Database & Schema Out-of-Sync
- **Masalah**: Perubahan pada `schema.ts` tidak langsung dpush ke database PostgreSQL, menyebabkan error "Relation does not exist".
- **Mitigasi**: Selalu jalankan `bun x drizzle-kit push` segera setelah memodifikasi tabel database. Jangan mengasumsikan database otomatis sinkron hanya dengan mengubah kode TypeScript.

### 🔵 Bug: Semantik Kolom (Image vs Password)
- **Masalah**: Hashed password sebelumnya disimpan di kolom `image`.
- **Pelajaran**: Konsistensi penamaan kolom sangat penting. Jangan gunakan kolom "cadangan" atau kolom semantik lain (seperti image) untuk menyimpan kredensial. Gunakan kolom `password` yang memang didesain untuk itu.

## 4. Prioritas Selanjutnya
1. **Block Patterns**: Mengembangkan pustaka layout siap pakai (misal: "Breaking News Alert", "Gallery Grid").
2. **Global Search**: Pencarian cerdas lintas tenant bagi administrator utama.

---
*Terakhir diperbarui: 10 April 2026 | Tim Engineering Jalawarta*
