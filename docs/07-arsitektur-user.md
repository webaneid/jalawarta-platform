# Arsitektur User & Roles Jala Warta (WordPress compatible)

Dokumen ini merincikan struktur manajemen pengguna dan peran (roles) berbasis multi-tenant yang meniru model WordPress untuk Jala Warta.

## Tujuan
- Menyediakan tingkatan akses yang jelas antar pengguna dalam satu tenant.
- Mendukung kolaborasi tim redaksi (Editor, Writer).
- Memisahkan hak akses administratif (Owner/Super Admin) dari manajemen konten.
- Menjaga isolasi data antar tenant (User Role terikat pada `tenantId`).

## Definisi Peran (Roles) & Kapabilitas

Berdasarkan struktur WordPress, berikut adalah peran yang diimplementasikan di Jala Warta:

| Peran | Deskripsi | Kapabilitas Utama |
| :--- | :--- | :--- |
| **Super Admin** | Pemilik Tenant (Owner). | Kontrol penuh atas tenant (Site Settings, Analytics, Themes, Billing, Manajemen User, dan semua konten). |
| **Editor** | Manajer Konten. | Mengelola & menerbitkan SEMUA artikel/laman/media (termasuk milik orang lain). Mengelola Kategori & Tag. |
| **Writer** | Penulis (Author). | Membuat & menerbitkan artikel MILIK SENDIRI saja. Tidak bisa mengedit milik orang lain atau mengelola kategori/tag global. |
| **Subscriber** | Pembaca Terdaftar. | Manajemen Profil sendiri. Akses ke konten premium (jika ada di masa depan). |

## Struktur Profil Pengguna (WP-Style)

Untuk menunjang profesionalitas portal berita, entitas `user` memiliki kolom tambahan:

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `username` | Text (Unique) | Digunakan untuk login dan slug URL profil penulis (misal: `@admin`). |
| `name` | Text | Nama Lengkap (administratif). |
| `displayName` | Text | Nama Publik yang muncul di setiap artikel. |
| `password` | Text | Hash password (bcrypt) untuk Direct Login. |
| `bio` | Text | Penjelasan singkat mengenai latar belakang penulis. |
| `isActive` | Boolean | Status akun (**Aktif** atau **Non-aktif**). Akun non-aktif tidak bisa login. |
| `socialLinks` | JSONB | Menyimpan link media sosial (X, Facebook, dll) untuk Author Box. |

## Kebijakan Integritas & Penghapusan

Jala Warta menerapkan kebijakan **Safe-Delete** untuk menjaga konsistensi data redaksi:
1. **Proteksi Konten**: Akun pengguna yang memiliki keterkaitan dengan **Artikel** atau **Halaman** tidak dapat dihapus secara permanen dari database.
2. **Soft-Deactivation**: Sebagai alternatif penghapusan, Super Admin dapat menonaktifkan akun (`isActive: false`). Akun tersebut kehilangan hak akses login, namun nama penulis tetap terjaga pada konten historis.
3. **Pembersihan**: Penghapusan permanen hanya diizinkan jika kontribusi konten kosong dan pengguna bukan merupakan *Owner* utama dari sebuah tenant.

## Alur Autentikasi & Manajemen

### 1. Login & Keamanan
Aplikasi melakukan validasi ganda saat login:
- Memastikan kredensial (Email/Username & Password) cocok.
- Memastikan status `isActive` bernilai `true`. User yang dinonaktifkan akan menerima pesan penolakan akses.

### 2. Manajemen Anggota & Reset Password
Super Admin memiliki kontrol administratif penuh melalui dashboard:
- **Edit Profil**: Mengubah nama, username, email, dan biografi anggota tim.
- **Master Reset**: Admin dapat memperbarui password pengguna secara langsung melalui sistem backend tanpa memerlukan password lama pengguna tersebut.

## Status Implementasi (Milestones)

### Fase 1: Database & Skema
1. Update `src/db/schema.ts` dengan tabel `tenant_members` dan profil user lengkap. [DONE]
2. Tambahkan relasi `authorId` di tabel `posts` dan `pages`. [DONE]
3. Implementasikan kolom `isActive` untuk aktivasi akun. [DONE]

### Fase 2: Auth Integration
1. Unifikasi sistem sesi ke *Unified Custom Session* (`jw_session`). [DONE]
2. Integrasi validasi `isActive` pada level server actions login. [DONE]

### Fase 3: User Management UI
1. Buat antarmuka Daftar Anggota Tenant di `/app/users`. [DONE]
2. Implementasikan Fitur View/Edit Detail Pengguna di `/app/users/[id]`. [DONE]
3. Integrasi status badges (Aktif/Non-aktif) dan aksi Toggle Status. [DONE]

### Fase 4: Filtering & Access Control
1. Filter artikel di dashboard berdasarkan `authorId` (khusus Writer). [DONE]
2. Sembunyikan menu administratif di sidebar berdasarkan `role` & `capabilities`. [DONE]
3. Implementasikan validasi perizinan di Server Actions. [DONE]

---

> [!IMPORTANT]
> **Keputusan Desain**: `username` bersifat unik di tingkat global. Hal ini memudahkan penulis untuk memiliki satu identitas tunggal meskipun mereka berkontribusi di banyak portal berita (tenant) di dalam platform Jala Warta.
