# Arsitektur Add-on: AI Insights — Jalawarta

Dokumen ini merinci rancangan arsitektur dan spesifikasi teknis ekosistem add-on **AI Insights** (meliputi **News Insight** dan **Social Insight**) yang dirombak khusus untuk platform Jalawarta (Next.js, Drizzle ORM, multi-tenant).

---

## 1. Identitas Add-on

| Atribut | Nilai |
|---|---|
| **Plugin ID** | `ai-insights` |
| **Nama** | AI Content Insights |
| **Deskripsi** | Mesin pencari tren berita dan sosial media cerdas yang otomatis membuat artikel langsung dari sumbernya. |
| **Kategori** | `ai_text_generation` & `web_scraping` (Kombinasi) |
| **Integrasi UI** | Dashboard Menu `/app/insights` (Tab: News & Social) |
| **Dependency** | Add-on ini mewajibkan Platform Vault menyimpan kredensial API `Serper`, `Firecrawl`, dan `RapidAPI`. |

---

## 2. Konsep Dasar & Sub-Modul

Secara garis besar, **Insight** adalah "inbox" tempat content writer dan AI mengantrikan topik trending atau berita lama untuk disusun sebagai artikel baru secara terpusat dan terotomatisasi.

### 2.1 News Insight (Riset Berita Kompetitor)
Sistem pencarian dan pengeruk berita dari domain situs lain:
- Memasukkan parameter domain (contoh: `cnnindonesia.com`) dan pilihan rentang waktu/keyword.
- Menggunakan **Serper API** untuk mendapatkan daftar berita mentah (Google News backend).
- Artikel yang sekiranya menarik akan diunduh isi teks aslinya via **Firecrawl API**.
- Teks super detail tadi selanjutnya ditembakkan ke AI Provider (Gemini/OpenAI) untuk ditulis ulang tanpa melanggar *copyright* (Plagiarism-free rewriting).

### 2.2 Social Insight (Riset Tren Sosial)
Mesin pengepul tren viral sosmed lintas platform (TikTok, Twitter/X, Google Trends):
- Menggunakan layanan dari **RapidAPI** Hub.
- Mendukung fitur AI **Content Strategy**: Mampu menangkap massal Topik Tren secara bersaman lalu menugaskan AI merangkai semuanya sebagai:
  - *Roundup Articles* (Merangkum SEMUA yang viral ke dalam 1 Postingan).
  - *Deep Dive All* (Mengekstrak 10 Trends dan menjadikannya 10 Postingan terpisah secara otomatis).

---

## 3. Komponen Sistem & Struktur File

Kerangka kerja dirancang berbasis pendekatan *App Router* dan *Server Actions* mutakhir:

```text
src/
├── app/app/insights/                  # Halaman UI Dashboard Tenant (URL: /insights)
│   ├── page.tsx                       # Halaman utama (Daftar Saved Insights)
│   ├── layout.tsx                     # Kerangka UI Navigasi modul Insight
│   ├── news/page.tsx                  # Dashboard pencarian (Serper) News
│   └── social/page.tsx                # Dashboard pencarian Social Media Tren
├── app/actions/
│   ├── insights-news.ts               # Server Action: Endpoint Serper & Riwayat DB
│   ├── insights-social.ts             # Server Action: Endpoint RapidAPI & DB
│   └── insights-generate.ts           # Server Action: logic Firecrawl & integrasi AI Generator
├── lib/
│   └── insight-providers/             # Modul Eksekutor Pihak Ketiga Independen
│       ├── serper.ts                  # Fetcher google.serper.dev
│       ├── firecrawl.ts               # Fetcher Firecrawl Web Scraper
│       └── rapidapi.ts                # Endpoint TikTok, Twitter, Google Trends
```

---

## 4. Alur Kerja Integrasi Data

### 4.1 Data Retrieval (Penarikan Tren & Berita)
1. Klien mengirim form pencarian via Server Action.
2. Server mengontak Platform Vault (`getDecryptedCredential`) untuk kunci rahasia Serper/RapidAPI, terisolasi penuh dari client-side browser.
3. Mencari respons mentah, lalu JSON di-*parse* dan langsung dimasukkan ke tabel riwayat *Searches* dan *Results* Drizzle-ORM (tersambung pada otorisasi kepemilikan tenant saat ini).
4. Hasil render *Results* ditampilkan ulang ke layar Browser.

### 4.2 Auto Generation (Peluncuran Pasukan AI tanpa Redundansi)
Demi efisiensi kode, modul ini **TIDAK** membuat mesin AI baru. Ia melainkan membonceng fungsi `generateArticle` yang sudah jadi di dalam `src/app/actions/ai-generate.ts`.

1. Klien memilih (centang) beberapa hasil judul URL yang dituju serta strategi mode yang diinginkan.
2. Server mencegat limit batas kredit `aiCreditsUsed` sebelum memulai iterasi komputasional berbobot ini.
3. Untuk News, aksi server akan memanggil *Firecrawl* terhadap URL target, menghasilkan teks Markdown/Content mentah web berukuran mega.
4. Teks hasil pengerukan (*Scraping*) tadi akan di-inject ke properti parameter `referenceContent` menuju fungsi `generateArticle(...)`. Modul generator artikel dasar ini sudah sangat canggih menangani formatting otomatis, tag, dan perhitungan token (termasuk pemotongan kredit `tenantPlugins` agar aman dari fraud).
5. Artikel sukses yang diproses tidak butuh peninjauan manual, ia mendapat kembalian `text` HTML dan meledak menjadi perintah instan `db.insert(posts)` sebagai DRAFT atau PUBLISHED.

> **Mekanisme Background Multi-Process (Non-blocking):**
> Alih-alih antrian Queue rumit bawaan Laravel, kita memanfaatkan kekuatan asinkron generasi Vercel/NextJS dengan menyebarnya ke dalam `async` tanpa menggunakan `await` ketat untuk memanggil endpoint generasi secara paralel (atau sekadar `Promise.all`), menyajikan progres bar ringan bagi pengguna di halaman tunggu yang di-*polling* menggunakan teknik Server Action refetching atau `React Use()`.

---

## 5. Desain Database Drizzle ORM (`src/db/schema.ts`)

Struktur ini menyokong arsitektur Multi-Tenant yang terpusat:

### Tabel Master: `insights`
Mengawasi semua insight dan antrian:
- `id` (uuid)
- `tenantId` (varchar) (Menjamin privasi portal CMS)
- `topic` (text)
- `sourceUrl` (text)
- `sourceType` (varchar: 'manual', 'news_insight', 'social_insight')
- `status` (varchar: 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')

### Tabel Extension: *News*
- **`newsSearches`**: Riwayat pencarian Serper (parameter domain custom, range tanggal pencarian).
- **`newsResults`**: Berisi URL, judul panjang sumber, snippet ringkas konten yang tergenerasi dari Serper. Diambil (FK `searchId`).

### Tabel Extension: *Social*
- **`socialSearches`**: Filter param platform (`tiktok` atau `twitter`).
- **`socialResults`**: Topik trending per wilayah demografis.
- **`contentStrategies`**: Menyimpan referensi AI logic yang digunakan (`roundup`, `deep-dive`) dengan lacakan sejauh mana artikel massal tersebut beroperasi agar *UI Status Bar* sinkron.

---

## 6. Sinkronisasi Kredit dan Pembayaran

Fitur canggih ini hanyalah sebuah sarana untuk menjembatani ide menjadi teks AI. Oleh karenanya, **ia tidak menggunakan batasan kredit stand-alone**. Ia numpang hidup pada lisensi **AI Article Generator**.

Tiap kali satu artikel pecah dari proses keruk Firecrawl dan siap dikirim ke Gemini/OpenAI di dalam module ini:
1. Ia menggunakan proteksi standar `getPluginConfig(tenantId)`.
2. Ia membidik response metadata untuk mendapatkan nilai aktual `tokensUsed`.
3. Ia membebani saldo limit user yang terekam pada properti `tenantPlugins(aiCreditsUsed)` menggunakan function `updateCreditsUsed(tenantId, config, cost)`.
 
Arsitektur perampingan lisensi ini menguntungkan Super Admin karena memelihara satu saja produk SaaS paket kuota Text Generation.
