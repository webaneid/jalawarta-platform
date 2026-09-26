#!/bin/bash
# .claude/hooks/secret-scan.sh
# PostToolUse (Edit/Write) — deteksi secret ter-hardcode di file yang diedit.
# Hard block (exit 2): Claude wajib benerin sebelum lanjut.
# Catatan: ini lapisan pertama. Untuk proteksi independen dari Claude, tambahkan
# gitleaks sebagai git pre-commit hook — lihat README.md di folder ini.

FILE_PATH=$(cat | jq -r '.tool_input.file_path // empty')

# Cakupan: kode, config, env, CI yml, docs/script (secret sering bocor lewat contoh di docs)
case "$FILE_PATH" in
  *.ts|*.tsx|*.env*|*.json|*.yml|*.yaml|*.md|*.sh) ;;
  *) exit 0 ;;
esac

# Jangan scan file example/template
[[ "$FILE_PATH" == *.example ]] && exit 0

if [ -f "$FILE_PATH" ]; then
  # Pattern: AWS key, private key, live tokens, GitHub PAT, Slack, Google API key,
  # dan gaya assignment/object literal: password="val" MAUPUN password: "val"
  PATTERNS='(AKIA[0-9A-Z]{16}'\
'|-----BEGIN [A-Z ]*PRIVATE KEY-----'\
'|sk_live_[0-9a-zA-Z]{20,}'\
'|gh[ps]_[0-9A-Za-z]{20,}'\
'|github_pat_[0-9A-Za-z_]{20,}'\
'|xox[baprs]-[0-9A-Za-z-]{10,}'\
'|AIza[0-9A-Za-z_-]{35}'\
'|(password|secret|api[_-]?key|token)"?[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{6,}["'"'"']'\
'|:\/\/[^\/[:space:]:]+:[^\/[:space:]@]{6,}@)'

  if grep -Ei "$PATTERNS" "$FILE_PATH" > /dev/null 2>&1; then
    echo "⚠️  Terdeteksi kemungkinan secret ter-hardcode di $FILE_PATH" >&2
    echo "Pindahkan ke .env dan akses via process.env — jangan hardcode." >&2
    echo "(Kalau ini positif palsu — mis. contoh di docs yang memang perlu" >&2
    echo "menunjukkan format — ganti nilainya jadi placeholder seperti" >&2
    echo "\"<nilai>\" atau \"xxx\" dulu.)" >&2
    exit 2
  fi
fi

exit 0
