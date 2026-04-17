# Arsitektur Firecrawl — Web Scraping Engine

**Dokumen**: `23-arsitektur-firecrawl.md`  
**Status**: Perencanaan — Siap Implementasi  
**Kategori API Vault**: `web_scraping` → provider: `firecrawl`

---

## 1. Tujuan & Konteks

Firecrawl adalah **layer scraping konten** yang bekerja di belakang layar sebelum AI menghasilkan artikel. Alur utamanya:

```
URL Berita (dari Insight News / Kompetitor Monitor)
  → Firecrawl scrape → Konten bersih (Markdown)
  → AI Generator → Artikel baru
```

### Mengapa diperlukan?

- **Kualitas AI Output**: AI yang hanya diberi URL judul berita menghasilkan artikel generik. AI yang diberi **konten lengkap artikel asli** menghasilkan artikel yang kaya fakta dan kontekstual.
- **Anti-hallucination**: Konten faktual dari sumber asli menjadi grounding reference sehingga AI tidak mengarang fakta.
- **Reusable**: Firecrawl tidak terikat ke satu fitur — bisa dipakai oleh Insight News, Kompetitor Monitor, AI Generator editor, dan fitur masa depan.
- **Multi-URL**: Bisa scrape beberapa sumber sekaligus → AI synthesize menjadi satu artikel.

---

## 2. Posisi dalam Ekosistem Jalawarta

```
Platform API Vault (AES-256-GCM)
└── category: web_scraping
    └── provider: firecrawl
        └── API Key terenkripsi

src/lib/scraper/
└── firecrawl.ts          ← Satu-satunya titik akses Firecrawl

src/app/actions/
├── insights-news.ts      ← Pakai scraper sebelum kirim ke AI
├── insights-scrape.ts    ← (Baru) Server Action khusus scraping
└── ai-generate.ts        ← Terima konten ter-scrape sebagai context

src/app/app/
├── insights/news/        ← Tombol "Buat Artikel" → trigger scrape + AI
├── insights/competitor/  ← Tombol "Buat Artikel" → trigger scrape + AI
└── posts/editor/         ← Paste URL → scrape → AI di dalam editor
```

---

## 3. Integrasi API Key Vault

Sesuai protokol SP-05, API Key Firecrawl **tidak pernah di-hardcode** dan hanya didekripsi di sisi server:

```typescript
// src/lib/scraper/firecrawl.ts
import { getDecryptedCredential } from "@/app/actions/apikeys";

async function getFirecrawlClient() {
  const apiKey = await getDecryptedCredential("web_scraping", "firecrawl");
  if (!apiKey) throw new Error("API Key Firecrawl belum dikonfigurasi di Platform Vault.");
  
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  return new Firecrawl({ apiKey });
}
```

Platform Admin mendaftarkan API Key di `/platform/api-keys` → kategori **"Web Scraper Engine"** → provider **firecrawl**.

---

## 4. Instalasi

```bash
bun add @mendable/firecrawl-js
```

Package: `@mendable/firecrawl-js`

---

## 5. API yang Digunakan

### 5.1 `scrapeUrl()` — Single URL (Primary)

Digunakan untuk scrape satu artikel berita sebelum masuk AI.

```typescript
const client = await getFirecrawlClient();

const result = await client.scrapeUrl(url, {
  formats: ["markdown"],    // Cukup markdown untuk AI context
});

// result.markdown → string konten bersih siap dikirim ke AI
// result.metadata → { title, description, sourceURL, statusCode }
```

**Return structure:**
```typescript
{
  markdown: string,       // Konten artikel dalam format Markdown
  metadata: {
    title: string,
    description: string,
    sourceURL: string,
    statusCode: number,
  }
}
```

### 5.2 `scrapeUrl()` — Multiple URLs (Batch)

Untuk scrape beberapa sumber sekaligus (multi-referensi), gunakan `Promise.allSettled`:

```typescript
async function scrapeMultipleUrls(urls: string[]) {
  const client = await getFirecrawlClient();
  
  const results = await Promise.allSettled(
    urls.map(url => client.scrapeUrl(url, { formats: ["markdown"] }))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map(r => ({
      url: r.value.metadata?.sourceURL,
      title: r.value.metadata?.title,
      content: r.value.markdown,
    }));
}
```

> **Catatan**: Tidak menggunakan `crawlUrl()` karena kita hanya butuh satu halaman artikel, bukan seluruh website.

---

## 6. File Struktur Implementasi

```
src/lib/scraper/
└── firecrawl.ts
    ├── getFirecrawlClient()       → inisialisasi client dari Vault
    ├── scrapeArticle(url)         → scrape single URL → { title, content, sourceUrl }
    └── scrapeArticles(urls[])     → scrape multiple → array of above

src/app/actions/
└── insights-scrape.ts            → Server Actions (expose ke UI)
    ├── scrapeAndPrepareContext(urls: string[])
    │     → scrape semua URL → return combined markdown context
    └── scrapeForArticleGeneration(urls: string[], topic: string)
          → scrape → kirim ke AI → return draft artikel
```

---

## 7. Fungsi Inti — `firecrawl.ts`

```typescript
// src/lib/scraper/firecrawl.ts

import { getDecryptedCredential } from "@/app/actions/apikeys";

type ScrapeResult = {
  sourceUrl: string;
  title: string;
  content: string;  // Markdown
};

async function getFirecrawlClient() {
  const apiKey = await getDecryptedCredential("web_scraping", "firecrawl");
  if (!apiKey) throw new Error("API Key Firecrawl belum dikonfigurasi di Platform Vault.");
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  return new Firecrawl({ apiKey });
}

export async function scrapeArticle(url: string): Promise<ScrapeResult> {
  const client = await getFirecrawlClient();
  const result = await client.scrapeUrl(url, { formats: ["markdown"] });
  
  if (!result?.markdown) throw new Error(`Gagal scrape konten dari: ${url}`);

  return {
    sourceUrl: result.metadata?.sourceURL ?? url,
    title: result.metadata?.title ?? "",
    content: result.markdown,
  };
}

export async function scrapeArticles(urls: string[]): Promise<ScrapeResult[]> {
  const client = await getFirecrawlClient();

  const settled = await Promise.allSettled(
    urls.map(url => client.scrapeUrl(url, { formats: ["markdown"] }))
  );

  return settled
    .map((r, i) => ({ r, url: urls[i] }))
    .filter(({ r }) => r.status === "fulfilled")
    .map(({ r, url }) => {
      const val = (r as PromiseFulfilledResult<any>).value;
      return {
        sourceUrl: val.metadata?.sourceURL ?? url,
        title: val.metadata?.title ?? "",
        content: val.markdown ?? "",
      };
    })
    .filter(item => item.content.length > 0);
}

export function buildAIContext(scraped: ScrapeResult[]): string {
  return scraped
    .map((s, i) =>
      `## Referensi ${i + 1}: ${s.title}\nSumber: ${s.sourceUrl}\n\n${s.content}`
    )
    .join("\n\n---\n\n");
}
```

---

## 8. Server Action — `insights-scrape.ts`

```typescript
// src/app/actions/insights-scrape.ts
"use server";

import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import { scrapeArticles, buildAIContext } from "@/lib/scraper/firecrawl";

export async function scrapeAndPrepareContext(urls: string[]) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts"))
    throw new Error("Unauthorized");

  if (urls.length === 0) throw new Error("Tidak ada URL untuk di-scrape.");
  if (urls.length > 5) throw new Error("Maksimal 5 URL per request.");

  const scraped = await scrapeArticles(urls);
  if (scraped.length === 0) throw new Error("Semua URL gagal di-scrape.");

  return {
    success: true,
    context: buildAIContext(scraped),   // Combined markdown → siap kirim ke AI
    sources: scraped.map(s => ({ title: s.title, url: s.sourceUrl })),
    count: scraped.length,
  };
}
```

---

## 9. Alur Integrasi per Fitur

### 9.1 Dari Insight News / Kompetitor Monitor → Artikel

```
User klik "Buat Artikel" pada hasil berita
  → [Client] kirim array URL artikel terpilih
  → scrapeAndPrepareContext(urls)           ← Firecrawl
  → context: string (combined markdown)
  → AI Generator (ai_text_generation)
  → Draft artikel muncul di editor Tiptap
```

UI Flow:
1. Setiap kartu hasil berita: checkbox + tombol **"Buat Artikel dari Ini"**
2. Multi-select → tombol **"Buat Artikel dari X Sumber"**
3. Modal/loading state saat scraping + generating
4. Redirect ke `/posts/editor` dengan draft terisi

### 9.2 Dari Editor Tiptap — "Import dari URL"

```
User paste URL di dalam editor
  → scrapeArticle(url)                     ← Firecrawl single
  → Konten masuk sebagai referensi/context
  → AI rewrite/expand → masuk ke editor
```

---

## 10. Batasan & Error Handling

| Kondisi | Penanganan |
|---|---|
| API Key belum dikonfigurasi | Throw error jelas: "Firecrawl belum dikonfigurasi di Platform Vault" |
| URL tidak dapat diakses (404/403) | Skip URL tersebut, lanjut scrape yang lain |
| Semua URL gagal | Throw error, tidak panggil AI |
| Konten kosong setelah scrape | Filter dan skip |
| Melebihi 5 URL | Validasi di Server Action sebelum scrape |
| Timeout Firecrawl | SDK auto-retry — jika tetap gagal, throw error |

---

## 11. Keamanan (SP-05 Compliance)

- ✅ API Key diambil via `getDecryptedCredential("web_scraping", "firecrawl")` — satu-satunya titik akses
- ✅ Dekripsi **hanya** di Server Action / Server Component
- ✅ Plaintext API Key **tidak pernah** dikirim ke Client Component
- ✅ Semua fungsi scraping diproteksi dengan `getSession()` + `hasCapability()`
- ✅ Konten hasil scrape **tidak disimpan sebagai plaintext permanen** — hanya sebagai context sementara ke AI

---

## 12. Gap Platform yang Perlu Diisi

| Item | Status | Prioritas |
|---|---|---|
| Install `@mendable/firecrawl-js` | 🔴 Belum | P0 |
| `src/lib/scraper/firecrawl.ts` | 🔴 Belum | P0 |
| `src/app/actions/insights-scrape.ts` | 🔴 Belum | P0 |
| Tombol "Buat Artikel" di Insight News | 🔴 Belum | P1 |
| Tombol "Buat Artikel" di Kompetitor Monitor | 🔴 Belum | P1 |
| Multi-select + bulk generate di insight | 🔴 Belum | P2 |
| "Import dari URL" di editor Tiptap | 🔴 Belum | P2 |
| Firecrawl API Key terdaftar di Platform Vault | 🟡 Tersedia (kategori ada) | - |

---

## 13. Referensi

- SDK Docs: https://docs.firecrawl.dev/sdks/node
- API Key Vault: [`16-arsitektur-platform-apikey.md`](./16-arsitektur-platform-apikey.md)
- AI Generator: [`17-arsitektur-addon-ai-generator.md`](./17-arsitektur-addon-ai-generator.md)
- Insights Add-on: [`18-arsitektur-addon-insights.md`](./18-arsitektur-addon-insights.md)
- Standar Add-on: [`22-arsitektur-addon-standar.md`](./22-arsitektur-addon-standar.md)
