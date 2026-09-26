#!/bin/bash
# .claude/hooks/post-edit-lint.sh
# PostToolUse (Edit/Write) — auto-fix lint issue tiap file TS/TSX diedit.
# Warning (exit 1), bukan hard-block — lint gagal tidak boleh stop kerja.
# Skip diam-diam kalau eslint config belum ada (awal setup project).

FILE_PATH=$(cat | jq -r '.tool_input.file_path // empty')
[[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]] && exit 0
[ -f "$FILE_PATH" ] || exit 0
command -v bunx >/dev/null 2>&1 || exit 0

# Skip kalau eslint config belum ada
ls eslint.config.* .eslintrc* >/dev/null 2>&1 || exit 0

LINT_OUTPUT=$(bunx eslint "$FILE_PATH" --fix 2>&1)
if [ $? -ne 0 ]; then
  echo "⚠️  Lint issue di $FILE_PATH (auto-fix sudah dicoba, sisanya manual):" >&2
  echo "$LINT_OUTPUT" | tail -15 >&2
  exit 1
fi
exit 0
