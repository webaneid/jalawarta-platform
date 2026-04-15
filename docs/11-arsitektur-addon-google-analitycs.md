# Arsitektur Add-on: Google Search & Analytics

Dokumen ini menjelaskan integrasi Google Analytics 4 (GA4) dan Google Search Console (GSC) sebagai satu kesatuan Add-on untuk membantu tenant dalam pemantauan trafik dan SEO.

## 1. Konsep Add-on
Add-on ini berfungsi sebagai "Bridge" antara situs Jalawarta dengan ekosistem Google.
- **GA4**: Digunakan untuk melacak perilaku pengunjung, asal trafik, dan konversi.
- **GSC Verification**: Digunakan untuk mempermudah proses verifikasi kepemilikan situs oleh Google tanpa harus mengunggah file HTML manual ke server.

## 2. Struktur Data Konfigurasi
Data konfigurasi disimpan dalam kolom `config` pada tabel `tenant_plugins` dengan struktur sebagai berikut:

```json
{
  "gaMeasurementId": "G-XXXXXXXXXX",
  "gscVerificationId": "XXXXXXXXX-XXXXXXXXX-XXXXXXXXX",
  "anonymizeIp": true
}
```

## 3. Alur Kerja (Workflows)

### A. Konfigurasi Admin
- Admin mengaktifkan Add-on di Katalog.
- Admin memasukkan **Measurement ID** (didapat dari Google Analytics) dan **Verification Tag ID** (didapat dari Search Console).
- Konfigurasi divalidasi dan disimpan di database.

### B. Injeksi Sisi Publik (Frontend)
- Saat situs publik dimuat, sistem akan mengambil data plugin aktif untuk tenant tersebut.
- Plugin akan me-render komponen yang menyuntikkan script GA4 dan meta-tag GSC ke dalam tag `<head>` sebelum konten utama di-render.

## 4. Rencana Implementasi

1. **Update Registry**: Mengubah definisi `google-analytics` menjadi `google-search-analytics` dengan skema konfigurasi yang mencakup field Search Console.
2. **Settings UI**: Membangun antarmuka pengaturan yang user-friendly di dashboard tenant untuk menginput kredensial Google.
3. **Optimasi Script**: Menggunakan komponen `next/script` untuk memastikan pemuatan tag Google tidak menghambat performa (Lighthouse score) situs utama.
4. **Verification Helper**: Memberikan instruksi singkat kepada user di dashboard tentang cara mendapatkan ID tersebut dari dashboard Google.

---
*Dokumen ini merupakan standar resmi untuk integrasi layanan pihak ketiga di Jalawarta.*
