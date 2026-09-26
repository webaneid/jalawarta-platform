# Workflow Modes — Kapan Pakai Apa

> Ini soal CARA PAKAI Claude Code (mode, subagent, hemat token) — beda dari
> `docs/SOP.md` yang ngatur PROSES per fitur. Baca sebelum mulai kerjaan apa pun.

---

## Decision Table — Pilih Mode

| Situasi | Mode / Cara |
|---|---|
| Task besar, belum familiar, atau berisiko | **Plan Mode** dulu |
| Auth, session, enkripsi, migration DB, apa pun susah di-rollback | **Plan Mode** dulu |
| Task jelas scope-nya, kecil-menengah, ada git checkpoint | **Auto Mode** |
| Kerjaan rutin yang polanya sudah terbukti aman | **Auto Mode** |
| Eksplorasi/riset codebase besar, cukup butuh ringkasan | **Subagent** |
| Audit banyak file sekaligus, independen satu sama lain | **Subagent** (bisa paralel) |
| Task kecil tapi detail hasilnya perlu dilihat langsung | **Eksekusi langsung** |
| Debugging yang butuh iterasi cepat bolak-balik | **Eksekusi langsung** |

---

## Kenapa Subagent Bukan Selalu Lebih Hemat

Tiap subagent reload system prompt + tool definitions dari nol — bisa sampai ~7x
lebih mahal dibanding kerjakan langsung di sesi utama untuk task kecil.

**Subagent worth it hanya kalau:**
1. Task butuh baca banyak file besar (>3-4 file) yang akan bikin context bengkak, DAN
2. Kamu cuma butuh hasil ringkasannya, bukan raw detail tiap file

Kalau dua syarat itu tidak terpenuhi → kerjakan langsung, lebih murah dan cepat.

**Subagent yang tersedia di Jalawarta:**
- `security-auditor` (`.claude/agents/security-auditor.md`) — audit menyeluruh
  sebelum release atau setelah sprint fitur sensitif. Read-only.

---

## Aturan Sebelum Mulai Kerjaan

1. Task ini "familiar & jelas" atau "besar & berisiko"? → tentukan Plan Mode vs Auto Mode.
2. Butuh eksplorasi berat (banyak file) dan cukup ringkasan? → subagent.
   Kalau tidak → eksekusi langsung.
3. Ragu antara subagent vs langsung untuk task medium? → **langsung dulu**.
   Pindah ke subagent hanya kalau context sesi utama mulai berat.

---

## Hemat Token — Kebiasaan Harian

**Dua kebiasaan boros paling sering:**
1. Baca/scan file yang tidak relevan sama task "buat mastiin" — padahal scope sudah jelas.
2. Nulis kode lebih panjang dari yang perlu — abstraksi/opsi/fallback yang belum diminta.

Keduanya kelihatan kecil per-kejadian tapi numpuk jadi mahal.

**Kebiasaan lain:**
- Jangan paste file/log besar ke chat — kasih path-nya, biarkan Claude baca sendiri.
- `/clear` antar task yang topiknya tidak nyambung — jangan bawa histori lama terus.
- `/compact` kalau sesi sudah panjang tapi masih task yang sama.
- CLAUDE.md jangan sering diedit di tengah sesi — bikin prompt cache invalid,
  kehilangan diskon token dari cache hit.

---

## Referensi
- Plan/Auto mode: `Shift+Tab` di terminal, atau `/plan` untuk sekali pakai.
- Subagent: `.claude/agents/security-auditor.md`.
- Alur kerja per fitur: `docs/SOP.md`.
