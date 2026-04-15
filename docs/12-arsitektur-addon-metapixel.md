# Arsitektur Add-on: Meta Pixel Advanced

Dokumen ini memaparkan rancangan teknis integrasi Meta Pixel (Facebook Pixel) ke dalam ekosistem Jala Warta, difokuskan pada analitik audiens untuk penerbit berita/portal artikel.

## 1. Visi & Fungsionalitas
Meta Pixel bukan sekadar alat pelacak jumlah pengunjung, melainkan sumber data utama bagi pengiklan (tenant) untuk membangun jaring retargeting dan lookalike audiences. 

Dalam arsitektur "Advanced" ini, Add-on tidak hanya akan menyuntikkan script dasar `PageView`, melainkan:
- **`ViewContent`**: Terpicu secara otomatis saat pengguna membaca artikel tertentu, diiringi parameter metadata artikel (Kategori, Penulis, Judul).
- **`Contact`**: Terpicu otomatis jika tenant menggunakan Add-on *Contact Form Advanced*.

## 2. Struktur Data Konfigurasi
Sama halnya dengan Google Analytics, konfigurasi akan disimpan di kolom `config` pada `tenant_plugins`:

```json
{
  "pixelId": "123456789012345",
  "enableAdvancedMatching": true,
  "trackArticleViews": true
}
```

## 3. Komponen Sistem

### A. Core Injector (`src/plugins/meta-pixel/index.tsx`)
Komponen yang akan dirender oleh `<PluginSlot position="header" />`. Bertugas memuat script dasar Facebook Pixel dan menembakkan event `PageView`.
Berisi noscript iframe (image pixel fallback) untuk pengguna yang menonaktifkan Javascript.

### B. Event Tracker Hook / Helper
Sistem membutuhkan *Client Component Helper* (misal: `<MetaPixelEvents />`) yang dapat disisipkan ke layout publik atau laman artikel (`/posts/[slug]`).
Helper ini akan membaca perubahan path (`next/navigation` -> `usePathname`, `useSearchParams`) dan secara otonom memancarkan event lanjutan seperti `ViewContent` bermodalkan data JSON-LD bawaan artikel.

### C. Dashboard Konfigurasi Admin
Laman di `/app/addons/meta-pixel` bagi admin untuk:
1. Memasukkan `pixelId`.
2. Menghidupkan/mematikan fitur *Advanced Matching* (mengirim data email yang disamarkan dari user login).

## 4. Rencana Implementasi Bertahap

- **Pendaftaran Add-on**: Menambah `meta-pixel` ke dalam `PLUGIN_REGISTRY`.
- **Integrasi UI**: Membuat laman pengaturan Pixel ID beserta instruksi pencarian ID dari Facebook Business Manager.
- **Injeksi Render**: Membangun skrip standar yang aman dari pemblokiran *stric-mode* SSR Next.js menggunakan *Script Component*.

---
*Status: Dalam Fase Perencanaan.*
