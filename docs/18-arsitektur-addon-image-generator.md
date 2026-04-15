# Arsitektur Add-on: AI Image Generator — Jalawarta

Dokumen ini menjelaskan spesifikasi teknis untuk Add-on **AI Image Generator**. Fitur ini memungkinkan tenant untuk menciptakan gambar unik secara otomatis berdasarkan prompt teks atau konten artikel yang sedang diedit, langsung dari dalam Media Library.

---

## 1. Identitas Add-on

| Atribut | Nilai |
|---|---|
| **Plugin ID** | `ai-image-generator` |
| **Nama** | AI Image Generator |
| **Deskripsi** | Buat gambar visual premium secara instan dari teks menggunakan AI (DALL-E 3, Midjourney, Imagen 3). |
| **Kategori** | `ai_image_generation` |
| **Integrasi UI** | Tab "Generate AI" di Media Library |
| **Kredit Default** | **10 Kredit** (1 Kredit = 1 Gambar High-Res) |

---

## 2. Alur Kerja (Workflow)

### 2.1 Pembuatan Prompt Otomatis (Smart Prompting)
User tidak perlu mahir menulis prompt teknis yang panjang. Sistem menyediakan tombol **"Generate Prompt"**:
1. **Context-Aware**: Jika dipanggil dari editor artikel, sistem mengambil judul dan cuplikan konten (snippet) sebagai basis.
2. **Expansion**: Menggunakan API AI Text (Gemini Flash atau GPT-4o-mini melalui akses `ai_text_generation` di Vault) untuk mengubah input pendek (misal: "berita banjir jakarta") menjadi prompt visual terperinci dalam Bahasa Inggris secara otomatis.

### 2.2 Proses Generasi Gambar
1. **Kredit Check**: Memastikan sisa kredit tenant mencukupi berdasarkan `aiImageCreditsUsed` dan limit dari `aiImageCreditsLimit` yang melekat pada `tenant_plugins.config`.
2. **Provider Route**: Menggunakan API Key dari Vault dengan kategori `ai_image_generation`.
3. **External Call**: Memanggil API provider secara dinamis (mendukung penuh **OpenAI DALL-E** dan **Fal.ai**, dengan interface siap untuk *Ideogram* dan *Google Imagen*).
4. **Local Persistence**:
   - Gambar dari AI tidak persisten (berumur pendek pada server provider).
   - **WAJIB**: Sistem mengunduh buffer gambar secara server-side, menyimpannya di direktori lokal (`/public/uploads/[tenantId]/`), mendaftarkannya ke tabel `media` bersama fallback alt text/description, dan mengembalikan public URL baru.

---

## 3. Integrasi UI (Media Library)

Tab **"Generate AI"** (`AiImageTab.tsx`) menampilkan struktur form yang interaktif dengan komponen berikut:
- **Textarea Prompt**: Untuk user menginput teks awal dan hasil dari "Generate Prompt" AI.
- **Selector Bahasa**: Memungkinkan user mentargetkan style bahasa sebelum digenerate (ID, EN, AR, JP).
- **Selector AI Provider & Model**: Menyediakan dropdown provider dinamis (OpenAI DALL-E, Ideogram, Fal.ai Flux, dll) sesuai data Vault platform aktif, serta model turunannya (Flux Schnell, Dev, Pro / DALL-E 2, 3).
- **Selector Gaya (Style)**: Photorealistic, Digital Art, Painting, Anime Style, Pencil Sketch, dan 3D Render.
- **Selector Ukuran (Aspect Ratio)**: 16:9, 4:3, 1:1, 9:16.
- **Preview Panel**: Card responsif di sebelah kanan yang menampilkan progres loading pulse serta preview final. Setelah berhasil, memunculkan opsi "Simpan & Gunakan Gambar" untuk mem-bypass gambar ke komponen Editor.

---

## 4. Skema Kredit & Biaya

Sama seperti AI Generator lainnya, batasan penggunaan dikontrol di satu tempat sentral:
- **1 Gambar = 1 Kredit**.
- Diatur dan diubah oleh Platform Admin via **Manajemen Paket**.
- Increment penggunaan disimpan langsung di field konfigurasi JSON `tenantPlugins`.
- Pengecekan dilakukan di tahapan Server Action `deductImageCredit()` agar tak tembus secara frontend.

---

## 5. Struktur File Baru

```
src/
├── app/
│   └── actions/
│       └── ai-image.ts             # Server Actions: getActivePlatformImageProviders, expandImagePrompt, generateAiImageAction, saveGeneratedImageAction
├── components/
│   └── addons/
│       └── ai-image/
│           └── AiImageTab.tsx      # Komponen utama UI, memuat Logic Form dan Prompt Enhancement via Server Action.
└── lib/
    └── ai-generator/
        └── image-providers.ts      # API Connectors, mapping model config, AI text expander, logic call spesifik per engine.
```

---

## 6. Keamanan & Performa

- **[SP-05] API Vault**: API Key sepenuhnya server-side, didekripsi secara on-the-fly via Action / Handler, menghindari kebocoran kredensial di client.
- **Auto Storage Mapping**: Aset generatif dilokalisasi untuk meminimalisasi latensi saat gambar ditayangkan pada aplikasi portal pembaca. Revalidasi path (`app/media`) dieksekusi secara instan.
