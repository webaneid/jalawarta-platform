# Conventions — Penamaan, Branch, Commit

## Naming

### Database (Drizzle/PostgreSQL)
- Tabel: `snake_case` plural — `posts`, `post_categories`, `tenant_plugins`
- Kolom: `snake_case` — `tenant_id`, `created_at`, `is_active`
- Foreign key: `{tabel_referensi}_id` — `tenant_id`, `user_id`, `post_id`

### TypeScript
- Variable & function: `camelCase` — `tenantId`, `getSession`, `fetchPosts`
- Type/Interface/Class: `PascalCase` — `SessionPayload`, `TenantPlugin`
- Konstanta global: `UPPER_SNAKE_CASE` — `API_CATEGORIES`, `MAX_UPLOAD_SIZE`
- File Server Action: `{resource}.ts` di `src/app/actions/`
- File komponen: `PascalCase.tsx` — `MediaLibrary.tsx`, `SeoPanel.tsx`

### Route & URL
- Segment URL: `kebab-case` — `/app/api-keys`, `/platform/addons`
- Dynamic segment: `[id]`, `[slug]`, `[domain]`

---

## Branch & PR

```
main  — production, protected
        hanya nerima merge dari feature/fix branch via PR
```

- Feature branch: `feat/{nama-fitur}` — misal `feat/block-patterns-gutenberg`
- Bug fix: `fix/{nama-bug}` — misal `fix/cross-tenant-insight-query`
- Hotfix urgent: `hotfix/{deskripsi}` — boleh langsung PR ke `main`
  (lihat pengecualian di `docs/SOP.md`)
- Branch Claude Code: prefix `claude/` (otomatis dari worktree)

### Enforcement di GitHub (Branch Protection)
Hook `.claude/hooks/pre-commit-guard.sh` cuma aktif saat Claude yang commit
lewat Claude Code. Untuk proteksi sungguhan yang independen:

**Settings → Branches → Add branch protection rule untuk `main`:**
- Require pull request before merging
- Require status checks to pass (minimal typecheck/lint dari CI kalau sudah ada)
- Block force pushes
- Block branch deletion

---

## Commit Message

Format **Conventional Commits**:
```
type(scope): deskripsi singkat
```

| Type | Kapan dipakai |
|---|---|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `refactor` | Restruktur kode tanpa ubah perilaku |
| `docs` | Update dokumentasi |
| `chore` | Konfigurasi, dependency, setup |
| `test` | Tambah/perbaiki test |
| `perf` | Optimasi performa |

Contoh:
```
feat(insights): tambah dispatchInsight untuk topik dari URL eksternal
fix(auth): deteksi PLATFORM_ADMIN sebelum query tenant di login.ts
chore(hooks): tambah secret-scan dan pre-commit-guard
docs(sop): buat SOP alur kerja per fase
```

---

## TypeScript
- Strict mode wajib (`tsconfig.json` sudah dikonfigurasi)
- Hindari `any` — kalau terpaksa, kasih komentar alasan di baris yang sama
- Jangan export konstanta dari file `"use server"` — runtime error Next.js 15
  (lihat `CLAUDE.md` standar #3)

## Environment Variables
- Semua secret di `.env`, sudah ada di `.gitignore`
- Template tanpa nilai asli di `.env.example` — update kalau tambah variable baru
- Prefix `NEXT_PUBLIC_` HANYA untuk variable yang memang boleh exposed ke client-side JS
- Jangan taruh API key, JWT secret, atau encryption key di `NEXT_PUBLIC_`
