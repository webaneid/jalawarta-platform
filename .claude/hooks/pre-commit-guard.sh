#!/bin/bash
# .claude/hooks/pre-commit-guard.sh
# PreToolUse (Bash) — block commit langsung ke branch main.
# Kerja harian wajib lewat feature branch → PR ke develop/main.
# Hotfix urgent production boleh langsung ke main (pengecualian eksplisit).

COMMAND=$(cat | jq -r '.tool_input.command // empty')

# Cuma cek command git commit sungguhan
echo "$COMMAND" | grep -qE '(^|[;&|]|\s)git\s+commit(\s|$)' || exit 0

BRANCH=$(git branch --show-current 2>/dev/null)
if [ "$BRANCH" = "main" ]; then
  echo "⛔ Jangan commit langsung ke branch 'main'." >&2
  echo "Buat feature branch (feat/..., fix/...) → PR ke main." >&2
  echo "Pengecualian: hotfix urgent production boleh langsung — pastikan" >&2
  echo "typecheck + security review tetap dijalankan meski lewat hotfix." >&2
  exit 2
fi
exit 0
