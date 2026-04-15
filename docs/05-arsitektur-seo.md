# Arsitektur SEO Jala Warta: Membangun Platform "AI-Ready" & Google Compliant

Dokumen ini merinci strategi dan implementasi teknis SEO untuk Jalawarta, yang dirancang khusus untuk portal berita modern dengan standar performa 2026. Fokus kita bukan hanya peringkat di pencarian organik (Google), tetapi juga menjadi sumber otoritas bagi mesin cerdas (Generative Engine Optimization - GEO).

---

## 🏗️ 1. Pilar Utama: Entity-Based SEO & Schema.org

Robot AI (Gemini, ChatGPT, Perplexity) memahami dunia melalui "Entitas", bukan sekadar kata kunci. Jalawarta akan menyuntikkan **JSON-LD Structured Data** secara otomatis pada setiap halaman.

### A. NewsArticle Schema (Wajib untuk Berita)
Setiap artikel akan memiliki skema `NewsArticle` yang sangat detail:
*   `headline`: Judul berita.
*   `image`: URL Gambar Unggulan.
*   `datePublished` & `dateModified`: Transparansi kesegaran konten (penting untuk Google News).
*   `author`: Tertaut ke profil penulis (membangun sinyal E-E-A-T).
*   `publisher`: Data tenant sebagai organisasi legal.

### B. Organization & Person Schema (E-E-A-T Signal)
Untuk membangun kredibilitas (Trust):
*   **Organization**: Menyertakan `logo`, `url`, dan `sameAs` (tautan ke media sosial resmi).
*   **Person (Penulis)**: Skema penulis yang mencakup kredibilitas, biografi singkat, dan tautan portofolio eksternal.

---

## 🔍 2. Modul Audit Konten (Yoast-Style Analyser)

Kita akan membangun "Mesin Audit" yang berjalan secara *real-time* di Sidebar Editor Berita.

### A. Analisis SEO (Lampu Indikator)
| Kriteria | Standard Audit |
| :--- | :--- |
| **Focus Keyword** | Memeriksa keberadaan kata kunci di: Judul (H1), Paragraf Pertama, Slug URL, Meta Description, dan Alt-Text Gambar. |
| **Keyphrase Density** | Memastikan kata kunci muncul secara natural (tidak terlalu jarang, tidak *spamming*). |
| **Text Length** | Minimum 300 kata untuk berita, 600+ untuk artikel mendalam. |
| **Outbound Links** | Mendorong adanya referensi ke sumber luar terpercaya. |
| **Internal Links** | Mendorong tautan ke berita terkait di dalam portal sendiri (membangun *Link Juice*). |

### B. Analisis Keterbacaan (*Readability*)
Audit ini memastikan robot AI bisa merangkum konten dengan mudah:
*   **Kalimat Pasif**: Membatasi penggunaan kalimat pasif agar teks lebih lugas.
*   **Panjang Kalimat**: Menandai kalimat yang terlalu panjang (>20 kata).
*   **Sub-heading Distribution**: Memastikan ada judul-judul kecil untuk memudahkan pemindaian (*skimming*).

---

## 🖼️ 3. Meta Meta & Social Graph (Rich Previews)

Agar artikel tampil premium saat dibagikan ke platform sosial:
*   **Automated Tags**: Injeksi otomatis `<title>`, `<meta name="description">`, dan `<link rel="canonical">`.
*   **OpenGraph (OG)**: Spesifik untuk Facebook dan WhatsApp (Image, Title, Description).
*   **X (Twitter) Cards**: Spesifik untuk platform X dengan format foto besar (*summary_large_image*).

---

## 🤖 4. AI-Ready Accessibility (GEO Optimization)

Strategi agar konten dikutip oleh AI Chatbot:
1.  **Direct Answer First**: Pola penulisan piramida terbalik, di mana inti jawaban berada di paragraf pertama (mudah diekstraksi oleh AI).
2.  **Modular Formatting**: Penggunaan bullet points dan tabel untuk data padat (AI sangat menyukai data terstruktur).
3.  **AI Crawl Permission**: Menyetel `robots.txt` agar tidak memblokir generator AI terkemuka, namun tetap menjaga beban server.

---

## 🗺️ 5. Otomatisasi Teknis

*   **Dynamic XML Sitemap**: Menghasilkan daftar URL terbaru secara otomatis (`/sitemap.xml`) yang dipisahkan antara Berita Terbaru, Halaman, dan Kategori.
*   **BreadcrumbList Schema**: Navigasi hirarkis yang membantu Google memahami arsitektur situs.
*   **Image Optimization**: Otomatisasi penambahan tag `alt` dari pustaka Media Library jika user lupa mengisinya secara manual di editor.

---

## 🎨 6. UI/UX: Modul SEO Sidebar

Untuk mempermudah manajemen, antarmuka SEO akan disisipkan langsung pada **Editor Berita/Halaman** dengan desain menyerupai Yoast SEO.

### A. Komponen Visual
*   **Focus Keyphrase Input**: Kotak masukan utama untuk target SEO.
*   **Google Snippet Preview**: Tampilan hasil pencarian Google (Desktop & Mobile) yang responsif terhadap judul dan deskripsi.
*   **Audit Metrics (Indikator Lampu)**: Daftar poin audit dengan warna merah, oranye, dan hijau sebagai petunjuk optimasi.

### B. Mockup Rancangan
![SEO Sidebar Mockup](/Users/webane/.gemini/antigravity/brain/051bcfa6-b18a-4f6e-bc68-eaf28b4b954d/jalawarta_seo_sidebar_mockup_1775548001445.png)

---

## ✅ 7. Status Implementasi & Milestone

Berikut adalah rekam jejak fitur SEO yang telah berhasil diimplementasikan ke dalam ekosistem Jalawarta:

### 🟢 Milestone A: Fondasi & Skema (Selesai)
- [x] **Database Schema**: Implementasi kolom `seo_config` (JSONB) pada tabel `posts` dan `pages`.
- [x] **Data Persistence**: Alur penyimpanan terpusat melalui Server Actions (`cms.ts` & `pages.ts`).

### 🟢 Milestone B: Editorial SEO Engine (Selesai)
- [x] **SeoPanel Component**: Sidebar khusus di Editor Berita/Laman.
- [x] **Real-time Audit**:
    - Deteksi kata kunci di Judul, Slug, dan Paragraf Pembuka.
    - Analisis kepadatan kata kunci (*Keyword Density*).
    - Perhitungan jumlah kata (*Word Count*) otomatis.
- [x] **Content Scanner**: Audit Alt-Text gambar dan ketersediaan Link (Internal/Eksternal) langsung dari data Tiptap.
- [x] **Snippet Preview**: Simulasi tampilan hasil pencarian Google dengan pilihan mode **Mobile** & **Desktop**.

### 🟢 Milestone C: Social Graph & Metadata (Selesai di Sisi Admin)
- [x] **Social Preview Card**: Visualisasi tampilan artikel saat dibagikan ke Facebook/WhatsApp/X.
- [x] **Custom Social Tags**: Input khusus untuk override Judul, Deskripsi, dan Gambar Sosial (OpenGraph/X Cards).

### 🟡 Milestone D: Front-End Rendering (Tahap Selanjutnya)
- [ ] **Dynamic Metadata API**: Integrasi `generateMetadata` Next.js untuk membaca `seoConfig` dari database.
- [ ] **JSON-LD Injection**: Otomatisasi skema `NewsArticle` di halaman publik.
- [ ] **Automated Sitemap**: Generator `/sitemap.xml` dinamis.

---

> [!IMPORTANT]
> **Catatan Perubahan:** Implementasi saat ini difokuskan pada **Editorial Experience**, memastikan penulis memiliki panduan optimasi yang kuat sebelum artikel diterbitkan. Fokus berikutnya adalah sinkronisasi data ini ke tampilan publik.

