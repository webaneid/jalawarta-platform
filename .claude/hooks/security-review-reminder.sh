#!/bin/bash
# .claude/hooks/security-review-reminder.sh
# PostToolUse (Edit/Write) — ingatkan (WARNING, bukan block) supaya skill
# `security-review` tidak kelupaan dipanggil saat edit file security-sensitive.
#
# Jalawarta: file sensitif adalah Server Actions auth/login, API route, file
# enkripsi, session, dan middleware proxy.

FILE_PATH=$(cat | jq -r '.tool_input.file_path // empty')

# Hanya kode TypeScript, bukan config/doc
[[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]] && exit 0
# Skip test dan type declaration
case "$FILE_PATH" in
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*.d.ts) exit 0 ;;
esac

# Pola file security-sensitive di Jalawarta:
# - Server Actions auth/login/session
# - lib/session.ts, lib/encryption.ts, lib/auth/
# - src/proxy.ts (middleware multi-tenant routing)
# - API routes
# - upload handlers
case "$FILE_PATH" in
  */actions/login*|*/actions/auth*|*/actions/apikeys*|\
  */lib/session*|*/lib/encryption*|*/lib/auth/*|\
  *proxy.ts|\
  */api/*|\
  *[Uu]pload*|*[Ww]ebhook*) ;;
  *) exit 0 ;;
esac

echo "🔒 File security-sensitive diedit: $FILE_PATH" >&2
echo "Sebelum task ini dianggap selesai, jalankan skill 'security-review'" >&2
echo "— checklist lengkap ada di docs/architecture/architecture-security.md" >&2
echo "(jika belum ada, periksa docs/09-arsitektur-pengembangan.md)." >&2
echo "Kalau banyak file berubah sekaligus, delegasikan ke subagent" >&2
echo "'security-auditor' di .claude/agents/ untuk audit menyeluruh." >&2
exit 1
