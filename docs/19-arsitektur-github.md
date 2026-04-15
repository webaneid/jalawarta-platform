# Arsitektur GitHub & Standar Push — Jalawarta

Dokumen ini menjadi standar kerja Git untuk proyek Jalawarta agar kode, dokumentasi, dan perubahan arsitektur mudah disinkronkan oleh semua anggota tim dan server deployment.

## 1. Repository Utama

Repository GitHub resmi:

```bash
https://github.com/webaneid/jalawarta-platform.git
```

Branch utama yang dipakai untuk deployment awal:

```bash
main
```

Semua perintah di dokumen ini dijalankan dari root proyek:

```bash
cd /Users/webane/sites/jalawarta
```

## 2. Inisialisasi Repository Baru

Gunakan langkah ini hanya jika folder proyek belum memiliki folder `.git`.

```bash
git init
git branch -M main
git remote add origin https://github.com/webaneid/jalawarta-platform.git
```

Jika repository sudah memiliki remote yang salah, cek dulu:

```bash
git remote -v
```

Lalu ubah remote `origin`:

```bash
git remote set-url origin https://github.com/webaneid/jalawarta-platform.git
```

## 3. Standar File yang Wajib Ikut Git

File berikut wajib ikut versioning:

- Semua source code di `src/`.
- Semua konfigurasi proyek seperti `package.json`, `bun.lock`, `drizzle.config.ts`, `next.config.ts`, dan `tsconfig.json`.
- Semua dokumentasi `.md`, termasuk `README.md`, `AGENTS.md`, `ANTIGRAVITI.md`, `CLAUDE.md`, dan seluruh isi folder `docs/`.
- Script operasional di `scripts/`.
- Asset publik di `public/`, kecuali file sementara yang memang sengaja di-ignore.

Kebijakan Jalawarta saat ini: dokumentasi tidak boleh di-ignore agar developer lain dapat memahami arsitektur, standar keamanan, dan roadmap sebelum mengubah kode.

## 4. File yang Tetap Tidak Boleh Dipush

Walaupun dokumentasi harus ikut Git, artefak berikut tetap tidak boleh dipush karena bersifat lokal, besar, atau sensitif:

- `.env` dan variasinya, karena berisi secret seperti database URL, JWT secret, dan encryption key.
- `node_modules/`, karena dependency dipasang ulang dari lockfile.
- `.next/`, `out/`, dan `build/`, karena hasil build dapat dibuat ulang.
- `*.tsbuildinfo` dan cache lokal.
- File debug log seperti `npm-debug.log*`, `yarn-debug.log*`, dan `.pnpm-debug.log*`.

Jika server membutuhkan environment variable, salin nilainya melalui mekanisme deployment/server secret, bukan melalui Git.

## 5. Alur Push Harian

Sebelum push, cek status:

```bash
git status --short --branch
```

Stage semua file yang tidak di-ignore:

```bash
git add -A
```

Pastikan dokumentasi dan source code masuk ke stage:

```bash
git status --short
```

Buat commit dengan pesan ringkas dan jelas:

```bash
git commit -m "Update Jalawarta platform architecture"
```

Push ke GitHub:

```bash
git push -u origin main
```

Untuk push berikutnya, cukup:

```bash
git push origin main
```

## 6. Alur Pull di Server

Pada server deployment baru:

```bash
git clone https://github.com/webaneid/jalawarta-platform.git
cd jalawarta-platform
```

Pada server yang sudah pernah clone:

```bash
git pull origin main
```

Setelah pull, install dependency dan jalankan proses database/build sesuai environment server:

```bash
bun install
bun run build
```

Jika ada perubahan skema database Drizzle, jalankan migrasi/push skema sesuai prosedur deployment yang berlaku.

## 7. Standar Commit

Gunakan pesan commit yang menjelaskan hasil kerja, bukan aktivitas mentah.

Contoh yang disarankan:

```bash
git commit -m "Add AI generator addon architecture"
git commit -m "Implement tenant media library"
git commit -m "Document platform API key vault"
```

Hindari pesan yang terlalu umum:

```bash
git commit -m "update"
git commit -m "fix"
git commit -m "changes"
```

## 8. Pemeriksaan Sebelum Push

Minimal lakukan pemeriksaan ini sebelum push besar:

```bash
git status --short
git diff --cached --stat
```

Untuk perubahan kode yang menyentuh Next.js App Router, auth, database, atau tenant isolation, wajib pastikan:

- `params` dan `searchParams` Next.js 15 diperlakukan sebagai Promise.
- Query tenant selalu memfilter `tenantId`.
- Secret tidak pernah dikirim ke Client Component.
- API Key hanya didekripsi server-side melalui vault resmi.
- Dokumentasi terkait diperbarui jika arsitektur berubah.

## 9. Catatan Untuk Kolaborator

Sebelum mulai kerja, baca dokumen berikut:

```bash
ANTIGRAVITI.md
docs/01-perencanaan-jalawarta.md
docs/02-arsitektur-database.md
docs/15-arsitektur-domain-topologi.md
docs/16-arsitektur-platform-apikey.md
```

Untuk modul tertentu, baca dokumen arsitektur sesuai area yang disentuh. Setiap perubahan besar wajib memperbarui dokumentasi terkait agar project memory tetap sinkron dengan implementasi.
