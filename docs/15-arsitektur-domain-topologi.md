# Arsitektur Topologi Domain & Taktik API Jala Warta

Dokumen ini adalah referensi definitif mengenai pembagian jaringan (Network Segregation) di dalam proyek B2B SaaS Jala Warta, memetakan secara presisi apa yang melayani apa, dan pendekatan API yang kita tetapkan untuk mengakomodasi fase skala maksimal (Custom Domains).

## 1. Konfigurasi 4 Pilar Sub-Domain

Keseluruhan repositori Jala Warta beroperasi secara *monolitik* di dalam Next.js App Router, namun secara logikal dan trafik akan dialihkan (_rewritten_) melalui kapabilitas **Next.js Middleware** menuju direktori antarmuka spesifik (Route Groups). 

Skema utamanya terdiri dari:
1. **`jalawarta.com`** (Marketing & Landing Page)
   - Pilar penawaran konversi. Menampilkan daftar harga paket, edukasi platform, pemasaran untuk calon pelanggan (Tenant).
2. **`platform.jalawarta.com`** (Dasbor Super Admin / Web Platform)
   - Kendali manajemen SaaS. Tempat mendaftarkan Paket (Plans), merekap pendapatan langganan tenant, mensentralisasi pengaturan Global Addon & API Keys aplikasi pihak ketiga.
3. **`app.jalawarta.com`** (Dasbor Resolusi Tenant / Klien)
   - Area operasi utama (CMS) klien Anda. Tempat penulis/editor login, membuat postingan Tiptap, mengatur *metadata SEO*, dan mempublikasikan konten ke domain terdistribusi.
4. **`[nama-tenant].jalawarta.com`** (Frontend Terdistribusi / Reader View)
   - Portal berita _Customer-Facing_. Menampilkan HTML akhir artikel dan laman klien.

## 2. Fase Kelayakan Infrastruktur Jaringan (Custom Domain Roadmap)

Pendekatan resolusi DNS (*Domain Name Server*) dicanangkan mengikuti aliran kematangan standar tingkat Vercel:

1. **Fase 1 (Inisial)**: Pendekatan Berbasis Path (`jalawarta.com/namatenant`). Instan dan langsung bekerja pada konfigurasi localhost pertama.
2. **Fase 2 (Sub-Domain)**: Resolusi DNS Wildcard (`*.jalawarta.com`). Membutuhkan 1 lapisan SSL terpadu. Memisahkan isolasi merek klien secara dasar (`namatenant.jalawarta.com`).
3. **Fase 3 (Custom Domain Penuh)**: Menangani topologi `domain-tenant.or.id` tanpa membutuhkan konfigurasi *Custom Name Server (NS)* yang rumit.
   - Pihak tenant cukup melakukan *pointing A Record* domain milik mereka ke alamat IP VPS utama Jala Warta.
   - Server internal kita mendelegasikan provisi SSL On-Demand melalui _Reverse Proxy_ terotomatisasi (seperti **Caddy**).

## 3. Resolusi Desain API Terdistribusi (Opsi Mandatori: Tipe A)

Untuk mendukung **Fase 3 (Custom Domain)**, Jala Warta secara radikal **menolak** skenario sentralisasi JSON Gateway tunggal (`api.jalawarta.com`) sebagai pembawa muatan dinamis aplikasi. Kami memilih **Gaya API Terdistribusi (Integrasi Tipe A)**.

### Apa itu Pendekatan API Terdistribusi?
Artinya, setiap komunikasi pengambilan/pengiriman data (GET/POST/PUT) dilakukan **secara konvensional dan relatif** oleh domain yang sedang aktif. 
- *Frontend* `domain-klien.or.id` akan memanggil Server Components/Server Actions Next.js atau *Route Handlers* nya sendiri (`/api/v1/posts`).
- Dasbor CMS `app.jalawarta.com` menembak *Server Actions*-nya sendiri.

### Alasan Strategis Penolakan API Terpusat (`api.jalawarta.com`) untuk SaaS Web:
1. **Pemusnahan Intervensi CORS**: Ketika `domain-klien.or.id` perlu melakukan request AJAX via klien, meminta data memintas origin ke `api.jalawarta.com` akan tertahan kebijakan CORS, merepotkan *Platform Admin* untuk mendalami sistem _Whitelist_ domain secaram dinamis. Metode API lokal (Tipe A) beroperasi di origin yang sama (Relatif URL), menyapu bersih kendala CORS.
2. **Kestabilan Sesi Lintas Domain (Auth Cookies)**: ITP Safari dan Google Chrome memagari *third-party cookie*. Jika sistem rely pada `api.` terpusat, pengiriman _session credentials_ dari Frontend ke API dipastikan dihilangkan oleh peramban modern. Pendekatan lokal menjamin stabilitas login (*subscribers auth*).

*(Pengecualian: Sebuah endpoint khusus Gateway tunggal bisa saja dibuat khusus untuk integrasi Mobile Native App / Webhooks External di masa jauh, namun struktur utama Web selalu relatif pada domain host nya).*
