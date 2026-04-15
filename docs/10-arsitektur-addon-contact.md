# Arsitektur Add-on: Contact Form Advanced

Dokumen ini menjelaskan desain teknis untuk add-on formulir kontak dinamis yang memungkinkan setiap tenant membangun formulir kustom dengan antarmuka drag-and-drop.

## 1. Konsep & Filosofi
Add-on ini dirancang untuk menjadi versi "Advance" dari formulir standar, memungkinkan:
- **Modularitas**: Bisa diaktifkan/dinonaktifkan per tenant.
- **Dinamis**: Struktur form disimpan sebagai JSON, bukan kolom tabel statis.
- **User Friendly**: Editor visual untuk menyusun form tanpa kode.

## 2. Struktur Database

Kita akan menambahkan dua tabel utama untuk mendukung add-on ini:

### `contact_forms` (Definisi Formulir)
| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key. |
| `tenantId` | UUID | Relasi ke penyewa (tenant). |
| `title` | Text | Nama formulir (misal: "Kontak Kerja Sama"). |
| `fields` | JSONB | Array objek yang mendefinisikan field form. |
| `settings` | JSONB | Konfigurasi (Email tujuan, pesan sukses, redirect URL). |
| `shortcode` | Text | Kode unik untuk menempelkan form di artikel (misal: `[contact-form id="xxx"]`). |

**Contoh Skema `fields` (JSONB):**
```json
[
  { "id": "f1", "type": "text", "label": "Nama Lengkap", "required": true },
  { "id": "f2", "type": "phone", "label": "No. WhatsApp", "includeCountry": true },
  { "id": "f3", "type": "textarea", "label": "Pesan Anda" }
]
```

### `contact_submissions` (Data Masuk)
| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key. |
| `formId` | UUID | Relasi ke formulir terkait. |
| `tenantId` | UUID | Relasi ke tenant. |
| `data` | JSONB | Key-value pair hasil input user. |
| `status` | Enum | `UNREAD`, `READ`, `SPAM`, `ARCHIVED`. |
| `createdAt` | Timestamp | Waktu pengiriman. |

## 3. Komponen Utama & Alur Kerja

### A. Dashboard Builder (Admin)
- **Field Toolbox**: Daftar komponen yang tersedia (Text, Textarea, Number, Phone).
- **Canvas Layout**: Area drag-and-drop untuk menyusun ulang field.
- **Settings Panel**: Mengatur notifikasi email dan integrasi.

### B. Frontend Renderer (Public)
- Komponen React yang secara rekursif merender input berdasarkan JSON di kolom `fields`.
- Validasi otomatis sisi klien & server (Server Actions).
- Khusus **Phone Number**: Integrasi dengan library kode negara (tipe `phone`).

### C. Inbox Management
- Laman untuk melihat daftar pesan masuk yang difilter per formulir.

## 4. Rencana Implementasi

1. **Pendaftaran Add-on**: Menambahkan `contact-form` ke dalam `PLUGIN_REGISTRY`.
2. **Schema Update**: Melakukan push tabel database baru menggunakan Drizzle.
3. **Add-on Manager UI**: Membuat laman `/app/addons` untuk mengelola aktivasi plugin.
4. **Form Builder Engine**: Membangun antarmuka manajemen formulir dan editor visualnya.
5. **Shortcode/Block Integration**: Memungkinkan form dimasukkan ke dalam konten berita.

---
*Dokumen ini merupakan bagian dari Arsitektur Strategis Jalawarta v0.2.0*
