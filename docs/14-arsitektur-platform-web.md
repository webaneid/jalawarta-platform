# Arsitektur Web Platform (Platform Services)

Dokumen ini menjelaskan strategi perancangan model bisnis SaaS (*Software as a Service*) pada Jala Warta, menempatkan sistem aplikasi bukan sekadar "CMS Multi-Blog", melainkan layanan penyedia infrastruktur *multi-tenant* yang komersial.

## 1. Filosofi Platform / Super Admin
Pada infrastruktur modern Jala Warta, kita membagi kendali manajemen hierarki menjadi tiga level piramida utama:
1. **Level Platform (`PLATFORM_ADMIN`)**: Mengendalikan bisnis, menetapkan batasan kuota *tenant*, membuat Skema Paket Berlangganan (Pricing Tiers), dan meregistrasi komponen Global Add-ons (misal: Payment Gateway, Meta Pixel).
2. **Level Tenant (`TENANT_OWNER`)**: Mengeksekusi konfigurasi pada portal media masing-masing dan membuat pengguna administratif lokal (Penulis, Editor).
3. **Level Staff (`WRITER / EDITOR`)**: Membuat artikel konten dalam domain spesifik *tenant*.

*(Lihat **[15-arsitektur-domain-topologi.md]** untuk penjelasan konkrit mengenai bagaimana ke-tiga level piramida manajemen hierarki ini dihidupkan melalui segresi 4 Pilar Resolusi Sub-Domain pada Next.js Middleware.)*

## 2. Model Relasional Tabel `packages`
Infrastruktur Super Admin sangat bertumpu pada manajemen batasan kuota. Skema basis data telah diperluas untuk mendefinisikan batasan tersebut.

```tsx
export const packages = pgTable("packages", {
  id: text("id").primaryKey(), // misal: "pro-plan", "enterprise"
  name: text("name").notNull(),
  price: integer("price").notNull(), // Harga langganan (Rupiah)
  limits: jsonb("limits"), // Konfigurasi batasan kuota, co: { maxUsers: 5, maxStorage: 52428800 } // dalam Bytes
  isActive: boolean("is_active").default(true),
});
```

Kemudian `subscriptionId` yang sebelumnya bersifat teks bebas di tabel `tenants` diikat kuat secara relasional (`references`) menuju `packages.id`.
Artinya sebuah Tenant "Tribun News" tidak bisa diciptakan tanpa menetapkan jenis Paket dasar (misalnya *Free*), yang akan mewarisi *limits*.

## 3. Topologi dan Keamanan Rute `/platform`
Semua rute berdasar domain aplikasi di dalam path `/platform` terisolasi dan dilindungi hak cipta eksklusif.

- **`src/app/platform/layout.tsx`**: Middle layer otentikasi. Semua kunjungan ke rute *platform* akan dicek *session JSON Web Token*(JWT). Jika tabel `user` menunjukkan bahwa pengguna bukan merupakan `PLATFORM_ADMIN`, maka mereka dilempar aksesnya.
- **Server Actions Isolated**: Skrip API eksekutor database platform diamankan secara ganda menggunakan fungsi wajib:
  ```ts
  async function verifySuperAdmin() {
    const session = await getSession();
    // ... logic cek tabel user == PLATFORM_ADMIN
  }
  ```

## 4. Antarmuka Manajemen (Dasbor Pusat Kendali)

Saat pengguna mendarat di *Platform Dashboard*, terdapat menu-menu sentralisasi:
1. **Ikhtisar Platform (Overview)**: Membaca agregrat total *tenants* terdaftar, *users* yang tersebar di beragam sub-domain, serta entitas transaksi dan sistem paket.
2. **Manajemen Paket SaaS**: Modul mandiri yang menyeimbangkan logika *Client* (menampung formulir modal berbasis *State*) dengan tindakan UPSERT *Server Action*. Memfasilitasi Super Admin untuk mendefinisikan Harga, Kuota Postingan, dan Penyimpanan secara ringkas.
3. **Manajemen Add-ons Global**: Portal untuk mensyaratkan izin atau menghubungkan Plugin secara menyeluruh ke seluruh sistem anak/tenant.

---
*Dengan sistem ini, pengembangan ke arah sistem Tagihan (Billing) dan Peringatan Kouta akan menjadi sangat terstruktur dan dapat difasilitasi dengan mudah.*
