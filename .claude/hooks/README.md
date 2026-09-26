# Hooks — Enforcement Otomatis

CLAUDE.md sifatnya *advisory* (Claude ikuti sebagian besar waktu, tidak 100%).
Hooks ini enforce aturan secara deterministik — jalan otomatis lewat event,
hasilnya via exit code, selalu konsisten tanpa tergantung ingatan Claude.

## Daftar Hook

### secret-scan.sh (PostToolUse: Edit/Write)
**Hard block (exit 2)** — deteksi secret ter-hardcode di file yang diedit.
Cakupan: `.ts`, `.tsx`, `.env*`, `.json`, `.yml`, `.yaml`, `.md`, `.sh`.
Skip file `.example`. Pola yang dideteksi: AWS key, private key, GitHub PAT,
Slack/Google token, connection string dengan password, dan gaya assignment
`password="val"` maupun object literal `password: "val"`.

### security-review-reminder.sh (PostToolUse: Edit/Write)
**Warning (exit 1)** — ingatkan jalankan `/code-review` atau skill `security-review`
tiap file security-sensitive diedit di luar alur phase normal. File sensitif
Jalawarta: `actions/login*`, `actions/auth*`, `actions/apikeys*`, `lib/session*`,
`lib/encryption*`, `lib/auth/*`, `proxy.ts`, `api/*`, upload handler.

### post-edit-lint.sh (PostToolUse: Edit/Write)
**Warning (exit 1)** — auto-fix lint via `bunx eslint --fix` tiap file `.ts/.tsx`
diedit. Skip diam-diam kalau `bunx` tidak tersedia atau eslint config belum ada.

### pre-commit-guard.sh (PreToolUse: Bash)
**Hard block (exit 2)** — cegah `git commit` langsung ke branch `main`.
Cuma aktif kalau command-nya benar-benar `git commit` (tidak block semua Bash).

### dependency-audit.sh (PostToolUse: Bash)
**Warning (exit 1)** — jalankan `bun audit` tiap `bun add <package>` baru.
Tidak hard-block karena hasil audit bisa noisy/false-positive.

---

## Lapis Kedua (Independen dari Claude Code)

Hook di atas hanya aktif saat Claude yang menulis file lewat Claude Code.
Edit manual + `git commit` langsung di terminal tidak ke-trigger.

Untuk proteksi yang benar-benar independen:

```bash
# Install gitleaks untuk secret scanning di level git hook
brew install gitleaks
echo '#!/bin/sh
gitleaks protect --staged --verbose' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Untuk proteksi branch `main`: aktifkan **branch protection di GitHub**
(Settings → Branches → Add rule: require PR + status checks lolos sebelum merge,
block force push, block branch deletion).

---

## Aturan Hooks
- Jangan taruh logic bisnis di hooks — hooks untuk *enforcement*, bukan business logic.
- Hard block (exit 2): aturan biner yang tidak butuh judgment — secret hardcode, commit ke main.
- Warning (exit 1): butuh judgment manusia — hasil audit, lint, security reminder.
