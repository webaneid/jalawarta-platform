# Sistem Modular & Model Langganan (SaaS)

Platform Jala Warta dirancang bukan sekadar *Multi-Tenant*, melainkan sebuah *Software as a Service (SaaS)* berbayar dengan arsitektur **Modular** (Add-ons/Plugins).

## 1. Arsitektur Modular (Sistem Add-on)
Seperti ekosistem WordPress, struktur dasar Jala Warta difokuskan sekecil dan seringan mungkin (`Core`). Fitur di luar *Post* dan *Page* akan diperlakukan sebagai Add-on.

### Cara Kerja Add-on di Next.js:
Karena kita tidak menggunakan PHP, arsitektur plugin/add-on di TypeScript (Next.js) umumnya menggunakan konsep **Feature Flags** (Toggles) atau **Dynamic Imports** berdasarkan paket tenant.
- **Tabel `plugins`**: Menyimpan daftar plugin resmi kita (misal: "SEO Tools", "AI Writer", "Google Analytics", "WooCommerce/Store").
- **Tabel `tenant_plugins`**: Menyimpan status instalasi/aktivasi plugin untuk suatu *tenant_id*.
- Di UI Admin, jika *tenant_plugins* statusnya aktif, Next.js akan me-*render* antarmuka (UI) dari komponen add-on tersebut. Bila tidak, kodenya bahkan tidak di-*load* ke *client browser* klien (Zero Overhead).

### Contoh Struktur Add-on:
- `/src/addons/google-analytics/`
- `/src/addons/ai-writer/` (Hanya aktif untuk tenant dengan paket pro)

## 2. Model Bisnis & Langganan (SaaS Billing)
Karena platform ini berbayar, arsitektur database akan diperluas untuk menangani siklus **Billing/Subscription**.

### Tabel `subscriptions` (Paket Berlangganan)
Menyimpan paket harga Jala Warta:
- `id` (UUID)
- `name` (String, jsonb) -> "Basic", "Pro", "Enterprise"
- `price` (Decimal)
- `max_storage_mb` (Int)
- `allowed_plugins` (JSONB) -> Array plugin yang boleh dipakai di paket ini.

### Modifikasi Tabel `tenants`
Ditambahkan penanda langganan:
- `subscription_id` (Relasi ke paket berlangganan)
- `subscription_status` (Enum: ACTIVE, EXPIRED, SUSPENDED)
- `subscription_end_date` (Timestamp)

## 3. Alur Pendaftaran (Flow)
1. **Landing Page (`jalawarta.com`)**: Pengunjung melihat fitur Jala Warta dan harga paket.
2. **Checkout/Register**: Melakukan pembayaran (misal via Midtrans/Stripe/Manual).
3. **Tenant Created**: Sistem membuat `tenant_id` unik, dan statusnya menjadi `ACTIVE`.
4. **Tenant Login**: Mengelola *Post*, *Page*, dan memasang *Add-ons*. Jika langganan habis, secara otomatis situs `subdomain.jalawarta.com` tenant tersebut dialihkan ke *suspended page* dan akses admin terkunci.

*Dicatat secara profesional oleh Jala Warta AI Assistant, April 2026*
