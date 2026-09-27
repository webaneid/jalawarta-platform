#!/bin/bash
# .claude/hooks/dependency-audit.sh
# PostToolUse (Bash) — jalankan audit tiap `bun add <package>` baru.
# Warning (exit 1), bukan hard-block — audit bisa noisy/false-positive,
# butuh judgment manusia untuk keputusan lanjut/tidak.

COMMAND=$(cat | jq -r '.tool_input.command // empty')

if [[ "$COMMAND" == *"bun add"* ]]; then
  echo "📦 Dependency baru terdeteksi, menjalankan audit..." >&2
  bun audit 2>&1 | tee /tmp/bun-audit-jalawarta.txt

  if grep -qi "vulnerabilit" /tmp/bun-audit-jalawarta.txt; then
    echo "⚠️  Ditemukan potensi vulnerability. Review sebelum lanjut." >&2
    exit 1
  fi
fi

exit 0
