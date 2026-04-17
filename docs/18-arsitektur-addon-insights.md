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

### 2.1 News Source Insight — Kompetitor Monitor *(Baru — Direncanakan)*
Sistem pemantauan berita dari domain sumber spesifik yang dipilih tenant (kompetitor):
- Tenant mendaftarkan daftar sumber berita (contoh: `antaranews.com`, `tempo.co`, `republika.co.id`).
- Opsional: filter tambahan berupa keyword/topik dan rentang waktu.
- Menggunakan **Serper API** dengan operator `site:` — contoh query: `site:tempo.co OR site:antaranews.com ekonomi`.
- Hasil menampilkan artikel terbaru yang diindeks Google dari sumber tersebut.
- Artikel menarik disimpan sebagai Insight untuk ditulis ulang oleh AI (via Firecrawl + AI Generator).
- Tujuan utama: **duplikasi konten kompetitor** — pantau apa yang mereka publikasikan, replikasi dengan sudut pandang berbeda.

### 2.2 Search Engine Insight — Riset Topik *(Sudah Ada)*
Sistem pencarian berita berbasis keyword/topik global:
- Tenant memasukkan query bebas (topik, tren, peristiwa).
- Menggunakan **Serper API** `/news` endpoint tanpa filter domain.
- Hasil menampilkan berita dari berbagai sumber yang relevan dengan query.
- Route: `/insights/news` | Action: `insights-news.ts`

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

---

## 7. Riset Serper API (Live — 17 Apr 2026)

Pengujian langsung ke `https://google.serper.dev/news` menggunakan key aktif menghasilkan temuan berikut:

### 7.1 Parameter Request

| Parameter | Tipe | Deskripsi | Contoh |
|---|---|---|---|
| `q` | string | Query pencarian. Mendukung semua Google Search Operators | `"site:tempo.co ekonomi"` |
| `num` | number | Jumlah hasil (maks ~10 per page default) | `10` |
| `gl` | string | Kode negara (Google country) | `"id"` untuk Indonesia |
| `hl` | string | Kode bahasa hasil | `"id"` untuk Bahasa Indonesia |
| `tbs` | string | Filter rentang waktu | lihat tabel di bawah |
| `page` | number | Halaman paginasi | `1` |

### 7.2 Nilai `tbs` (Time Range)

| Nilai | Deskripsi |
|---|---|
| `qdr:h` | 1 jam terakhir |
| `qdr:d` | 24 jam terakhir |
| `qdr:w` | 1 minggu terakhir |
| `qdr:m` | 1 bulan terakhir |
| `qdr:y` | 1 tahun terakhir |
| *(kosong)* | Semua waktu |

### 7.3 Struktur Response Per Item

```json
{
  "title": "Judul artikel",
  "link": "https://tempo.co/...",
  "snippet": "Ringkasan isi artikel...",
  "date": "3 jam yang lalu",
  "source": "Tempo.co",
  "imageUrl": "data:image/jpeg;base64,..."
}
```

### 7.4 Cara Filter Per Domain (Site Operator)

```
// Satu sumber
q: "site:tempo.co"

// Satu sumber + keyword
q: "site:tempo.co ekonomi digital"

// Multiple sumber (OR)
q: "site:antaranews.com OR site:republika.co.id"

// Multiple sumber + keyword
q: "site:antaranews.com OR site:tempo.co ekonomi"
```

Semua variasi di atas **terbukti bekerja** dan mengembalikan hasil yang benar dari sumber yang dimaksud.

---

## 8. Arsitektur Fitur: News Source Insight (Kompetitor Monitor)

### 8.1 Konsep & Tujuan

Tenant mendaftarkan **daftar domain kompetitor** yang ingin dipantau. Sistem secara on-demand mencari artikel terbaru dari domain-domain tersebut menggunakan Serper, menampilkan hasilnya, dan mengizinkan tenant menyimpan artikel menarik sebagai Insight untuk ditulis ulang oleh AI.

**User flow:**
```
Tenant tambah sumber → [antaranews.com, tempo.co]
Pilih keyword (opsional) + rentang waktu
Klik "Cari Berita Kompetitor"
    → Serper: q="site:antaranews.com OR site:tempo.co [keyword]"
    → Tampilkan hasil (title, snippet, date, source, link)
Tenant centang artikel menarik
    → "Simpan sebagai Insight" → DB insights (status: PENDING)
    → Opsional: "Generate Sekarang" → Firecrawl scrape → AI rewrite → Draft post
```

### 8.2 Struktur Database Tambahan

**Tabel baru: `newsSourceWatchlists`** — daftar domain yang disimpan per tenant:
```typescript
newsSourceWatchlists = pgTable("news_source_watchlists", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:  text("tenant_id").notNull().references(() => tenants.id),
  domain:    text("domain").notNull(),        // "tempo.co", "antaranews.com"
  label:     text("label"),                   // "Tempo", "Antara News" (nama tampilan)
  isActive:  boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
})
// Unique constraint: (tenantId, domain)
```

**Modifikasi tabel `newsSearches`** — tambah kolom untuk bedakan tipe search:
```typescript
// Tambah kolom:
searchType: text("search_type").default("topic"),  // "topic" | "source"
sources:    jsonb("sources"),                       // ["tempo.co", "antaranews.com"] jika type=source
```

### 8.3 File yang Perlu Dibuat/Dimodifikasi

```
src/
├── app/app/insights/
│   └── competitor/
│       ├── page.tsx                    ← Halaman Kompetitor Monitor (Server Component)
│       └── CompetitorClient.tsx        ← Form pencarian + hasil + watchlist manager
├── app/actions/
│   └── insights-news.ts               ← Tambah: searchNewsBySource(), manageWatchlist()
├── lib/insight-providers/
│   └── serper.ts                       ← Tambah: searchNewsBySite(domains, keyword, tbs, gl, hl)
└── db/schema.ts                        ← Tambah: newsSourceWatchlists, kolom di newsSearches
```

### 8.4 Server Actions Baru

```typescript
// insights-news.ts — tambahan

// Cari berita dari domain spesifik
export async function searchNewsBySource(params: {
  domains: string[];      // ["tempo.co", "antaranews.com"]
  keyword?: string;       // opsional filter topik
  tbs?: string;           // "qdr:d" | "qdr:w" | "qdr:m"
  gl?: string;            // "id"
  hl?: string;            // "id"
})

// Kelola watchlist domain kompetitor
export async function addSourceToWatchlist(domain: string, label: string)
export async function removeSourceFromWatchlist(domain: string)
export async function getWatchlist()                   // ambil daftar domain tenant
```

### 8.5 Modifikasi `serper.ts`

```typescript
// Fungsi baru di src/lib/insight-providers/serper.ts

export async function searchNewsBySite(params: {
  domains: string[];
  keyword?: string;
  tbs?: string;
  gl?: string;
  hl?: string;
  num?: number;
}) {
  const apiKey = await getDecryptedCredential("news_insight", "serper");
  if (!apiKey) throw new Error("API Key Serper belum dikonfigurasi.");

  // Bangun query: "site:d1.com OR site:d2.com keyword"
  const siteQuery = params.domains.map(d => `site:${d}`).join(" OR ");
  const q = params.keyword ? `${siteQuery} ${params.keyword}` : siteQuery;

  const payload = {
    q,
    num: params.num ?? 10,
    gl: params.gl ?? "id",
    hl: params.hl ?? "id",
    ...(params.tbs && { tbs: params.tbs }),
  };

  const response = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Serper error: ${response.status}`);
  const data = await response.json();
  return data.news || [];
}
```

### 8.6 Navigasi — Tambah Sub-Menu di Insights

```typescript
// SidebarNav.tsx — tambah child di group Insights
{ label: "Kompetitor Monitor", href: "/insights/competitor" },
```

Dan di `insights/layout.tsx` — tambah tab navigasi:
```tsx
<Link href="/insights/competitor">Kompetitor Monitor</Link>
```

### 8.7 UI Halaman Kompetitor Monitor

**Dua section utama:**

**Section A — Watchlist Manager:**
- Input tambah domain: `[antaranews.com] [+ Tambah]`
- Daftar domain tersimpan dengan tombol hapus
- Saved ke DB `newsSourceWatchlists`

**Section B — Form Pencarian:**
- Checkbox pilih domain dari watchlist (pre-fill)
- Input keyword opsional
- Select rentang waktu (Hari ini / Minggu ini / Bulan ini)
- Tombol "Cari Berita Kompetitor"
- Hasil: kartu artikel (source badge, judul, snippet, tanggal, link)
- Per artikel: tombol "Simpan sebagai Insight" + "Generate Langsung"

### 8.8 Perbedaan Dua Fitur News (Ringkasan)

| Aspek | Search Engine Insight | News Source Insight |
|---|---|---|
| **Route** | `/insights/news` | `/insights/competitor` |
| **Query basis** | Keyword/topik bebas | Domain kompetitor spesifik |
| **Serper query** | `"ekonomi digital"` | `"site:tempo.co OR site:antaranews.com"` |
| **Tujuan** | Riset tren umum | Pantau + duplikasi kompetitor |
| **Watchlist** | Tidak ada | Ada (domain tersimpan per tenant) |
| **DB** | `newsSearches` (type=topic) | `newsSearches` (type=source) + `newsSourceWatchlists` |
