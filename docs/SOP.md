# SOP — Alur Kerja Per Fitur/Fase

> Ini aturan PROSES, bukan aturan teknis (teknis ada di architecture-*.md).
> Dibaca sebelum mulai fitur atau fase baru. Tiap langkah WAJIB selesai
> sebelum pindah ke langkah berikutnya — jangan skip meski kelihatan sepele.

## Kenapa per-fase (bukan langsung ngoding semua)

Tiap fase = satu unit kerja yang bisa didokumentasikan, di-review, dan di-rollback
sendiri kalau ada masalah. Fase besar susah dilacak kalau ada bug muncul belakangan —
tidak jelas dari perubahan mana asalnya.

---

## Alur Wajib (5 Langkah)

### 1. Perencanaan
- Tentukan scope: apa yang mau dibangun, kenapa, gimana desainnya.
- Kalau fitur ini punya implikasi arsitektur baru (pola baru, library baru,
  keputusan besar yang nanti susah di-rollback) → buat atau update doc arsitektur
  yang relevan di `docs/` sebelum mulai ngoding.
- Kalau ada keputusan teknis besar → buat ADR baru di `docs/decisions/`
  (begitu folder itu ada — lihat `docs/conventions.md`).
- Pastikan scope task tidak "melar" diam-diam di tengah eksekusi. Kalau nemu
  kebutuhan baru di luar scope, catat sebagai task/fase terpisah, jangan diperluas.

### 2. Eksekusi
- Kerjakan HANYA scope yang didefinisikan di langkah 1.
- Catat keputusan kecil yang diambil di tengah eksekusi yang relevan untuk
  dipahami di masa depan (langsung di PR description, atau di doc arsitektur).
- Untuk fitur multi-tenant: WAJIB selalu sertakan filter `tenantId` di setiap
  query DB — lihat SP-01 di `CLAUDE.md` bagian "Protokol Keamanan".

### 3. Type Check & Lint
```bash
bunx tsc --noEmit      # wajib nol error
bun run lint           # wajib nol warning/error baru
```
Jangan lanjut ke langkah 4 sebelum keduanya bersih. Kalau ada error yang
"sengaja" dibiarkan (edge case belum ditangani), tulis eksplisit di PR
description sebagai known limitation — bukan didiamkan atau di-suppress tanpa catatan.

### 4. Security Check
- Jalankan `/code-review` (skill `security-review`) untuk file yang diubah di fase ini.
- Kalau fase ini besar (banyak file/endpoint), gunakan subagent `security-auditor`
  (`.claude/agents/security-auditor.md`) untuk audit lebih menyeluruh.
- Temuan **Critical/High** WAJIB diperbaiki sebelum task dianggap selesai.
- Temuan **Medium/Low** boleh dicatat sebagai technical debt di `ANTIGRAVITI.md`
  dan dilanjut nanti — tapi harus tercatat, bukan hilang.

### 5. Tutup & Catat
- Kalau fase ini mengandung bug signifikan yang ditemukan + diperbaiki → tambahkan
  ke `ANTIGRAVITI.md` supaya pola yang sama tidak berulang di sesi berikutnya.
- Kalau ada keputusan arsitektur yang perlu diingat → update doc arsitektur terkait
  di `docs/`.
- Update `docs/04-milestone-dan-progress.md` kalau fase ini menyelesaikan atau
  memajukan satu milestone.

---

## Kapan Boleh Menyimpang

**Hotfix production urgent** — boleh skip langkah 1 (tidak perlu doc baru), dan
boleh PR langsung ke `main`. Tapi langkah 3 (typecheck + lint) dan langkah 4
(security check) tetap WAJIB — bahkan lebih kritis karena langsung ke production.
Catat di `ANTIGRAVITI.md` sesudahnya.

**Eksplorasi/prototype** yang belum tentu dipakai — boleh di branch terpisah tanpa
ikut SOP ini secara penuh. Tapi begitu diputuskan dipakai, harus masuk ulang lewat
langkah 1 sebelum di-merge.

---

## Referensi
- Protokol keamanan detail → `CLAUDE.md` bagian "Protokol Keamanan" (SP-01..SP-05)
- Standar koding → `CLAUDE.md` bagian "Standar Koding WAJIB"
- Bug & lesson → `ANTIGRAVITI.md`
- Milestone & roadmap → `docs/04-milestone-dan-progress.md`
- Pilih cara kerja & hemat token → `docs/WORKFLOW-MODES.md`
- Naming, branch, commit → `docs/conventions.md`
