#!/bin/bash
# .claude/hooks/adr-guard.sh
# PreToolUse (Edit/Write) — block edit ke file ADR yang statusnya sudah "Accepted".
# Aturan: ADR TIDAK diedit setelah Accepted. Kalau keputusan berubah, buat ADR
# baru dan tulis "Supersedes ADR-XXXX" di file baru itu.
# Hard block (exit 2) karena ini aturan biner — tidak butuh judgment.

FILE_PATH=$(cat | jq -r '.tool_input.file_path // empty')

case "$FILE_PATH" in
  *docs/decisions/adr-*.md) ;;
  *) exit 0 ;;
esac

# Template sendiri boleh diedit
[[ "$FILE_PATH" == *adr-template.md ]] && exit 0

# File belum ada = ADR baru yang lagi ditulis, boleh
[ -f "$FILE_PATH" ] || exit 0

if grep -q '^\*\*Status:\*\* Accepted' "$FILE_PATH"; then
  echo "⛔ ADR ini statusnya 'Accepted' — TIDAK BOLEH diedit langsung." >&2
  echo "Kalau keputusan berubah: buat ADR BARU dengan nomor urut berikutnya" >&2
  echo "(jalankan: bash scripts/next-adr-number.sh untuk cek nomor berikutnya)," >&2
  echo "tulis 'Supersedes ADR-XXXX' di file baru dan update status file lama" >&2
  echo "menjadi 'Superseded by ADR-XXXX'." >&2
  echo "(lihat docs/decisions/adr-template.md)" >&2
  exit 2
fi
exit 0
