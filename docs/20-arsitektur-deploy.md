# Arsitektur Deploy Server & Migrasi Database — Jalawarta

Dokumen ini adalah panduan operasional untuk deploy Jalawarta ke server. Fokusnya: server baru, database PostgreSQL, `.env`, migrasi Drizzle, build Next.js, dan service production yang bisa diulang setiap kali pull update.

## 1. Ringkasan Keputusan Deploy

Jalawarta memakai stack berikut:

- **Runtime aplikasi**: Bun.
- **Framework**: Next.js App Router.
- **Database wajib**: PostgreSQL.
- **ORM dan migration**: Drizzle ORM + Drizzle Kit.
- **Session**: JWT custom cookie `jw_session` memakai `AUTH_SECRET`.
- **API Key Vault**: AES-256-GCM memakai `APP_ENCRYPTION_KEY`.
- **File upload lokal**: `public/uploads/`.

Jangan pakai MySQL atau SQLite untuk production. Skema, migration, dan query proyek ini didesain untuk PostgreSQL.

## 2. Pilihan Database

### Opsi A — PostgreSQL Lokal di VPS

Direkomendasikan untuk awal deploy karena sederhana dan murah. Cocok jika aplikasi dan database berada di satu server.

Kelebihan:

- Setup cepat.
- Latensi rendah.
- Biaya lebih ringan.

Kekurangan:

- Backup, monitoring, dan tuning harus dikelola sendiri.
- Jika VPS rusak, database ikut terdampak jika backup tidak disiplin.

### Opsi B — Managed PostgreSQL

Direkomendasikan jika server aplikasi akan lebih dari satu, butuh backup otomatis, atau ingin maintenance database lebih aman.

Contoh: Supabase, Neon, Railway PostgreSQL, DigitalOcean Managed Database, AWS RDS.

Kelebihan:

- Backup dan reliability lebih baik.
- Mudah dipakai oleh beberapa server aplikasi.

Kekurangan:

- Biaya lebih tinggi.
- Perlu perhatikan region agar latensi rendah.

Untuk kedua opsi, aplikasi hanya membutuhkan `DATABASE_URL`.

## 3. Prasyarat Server

Asumsi panduan ini:

- OS: Ubuntu 22.04 atau 24.04.
- User deploy: `deploy`.
- Folder aplikasi: `/var/www/jalawarta-platform`.
- Port aplikasi lokal: `3000`.
- Domain contoh: `jalawarta.com`.
- Subdomain:
  - `jalawarta.com`
  - `app.jalawarta.com`
  - `platform.jalawarta.com`
  - `*.jalawarta.com` untuk tenant publik.

Ganti `jalawarta.com` dan password database sesuai server masing-masing.

## 4. Install Paket Dasar Server

Jalankan di server:

```bash
sudo apt update
sudo apt install -y curl git unzip build-essential ca-certificates openssl
```

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
bun --version
```

## 5. Setup PostgreSQL Lokal

Lewati bagian ini jika memakai managed PostgreSQL. Jika database berada di VPS yang sama, install PostgreSQL:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Buat user dan database. Ganti `CHANGE_ME_STRONG_PASSWORD` dengan password yang kuat.

```bash
sudo -u postgres psql <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jalawarta') THEN
    CREATE ROLE jalawarta LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
  ELSE
    ALTER ROLE jalawarta LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
  END IF;
END
$$;

SELECT 'CREATE DATABASE jalawarta OWNER jalawarta'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jalawarta')\gexec

GRANT ALL PRIVILEGES ON DATABASE jalawarta TO jalawarta;
SQL

sudo -u postgres psql -d jalawarta -c "GRANT ALL ON SCHEMA public TO jalawarta;"
```

Test koneksi:

```bash
psql "postgresql://jalawarta:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/jalawarta" -c "select current_database(), current_user;"
```

## 6. Clone Repository

Buat folder deploy:

```bash
sudo mkdir -p /var/www
sudo chown -R "$USER":"$USER" /var/www
cd /var/www
git clone https://github.com/webaneid/jalawarta-platform.git
cd /var/www/jalawarta-platform
```

Jika repository private, login GitHub dulu atau pakai deploy key.

## 7. Install Dependency

```bash
cd /var/www/jalawarta-platform
bun install --frozen-lockfile
```

Jika `--frozen-lockfile` gagal karena lockfile belum sinkron, jalankan sekali:

```bash
bun install
```

Lalu commit perubahan `bun.lock` dari mesin development, bukan dari server production.

## 8. Contoh File `.env`

Proyek ini memakai `.env`. File `.env` lokal memang ada, tetapi **di-ignore oleh Git** karena berisi secret. Belum ada `.env.example` di repository saat dokumen ini dibuat.

Variabel yang terdeteksi dari kode:

- `DATABASE_URL` — wajib, koneksi PostgreSQL.
- `AUTH_SECRET` — wajib, secret JWT cookie `jw_session`.
- `APP_ENCRYPTION_KEY` — wajib, 32-byte hex untuk AES-256-GCM API Key Vault.
- `NEXT_PUBLIC_ROOT_DOMAIN` — wajib untuk routing domain production.
- `NEXTAUTH_URL` — disarankan tetap diset karena route NextAuth legacy masih ada.
- `NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX` — opsional, hanya jika deploy di Vercel preview.
- `NODE_ENV` — diset `production` di server.
- `PORT` — dipakai `next start`, default kita pakai `3000`.

Buat `.env` production. Ganti domain dan password database dulu:

```bash
cd /var/www/jalawarta-platform

AUTH_SECRET_VALUE="$(openssl rand -base64 32)"
APP_ENCRYPTION_KEY_VALUE="$(openssl rand -hex 32)"

cat > .env <<EOF
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://jalawarta:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/jalawarta

AUTH_SECRET=${AUTH_SECRET_VALUE}
APP_ENCRYPTION_KEY=${APP_ENCRYPTION_KEY_VALUE}

NEXT_PUBLIC_ROOT_DOMAIN=jalawarta.com
NEXTAUTH_URL=https://app.jalawarta.com

# Opsional. Isi hanya jika memakai Vercel preview deployment.
# NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX=
EOF

chmod 600 .env
```

Cek nama variabel tanpa membocorkan nilai:

```bash
awk -F= '/^[A-Za-z_][A-Za-z0-9_]*=/{print $1}' .env | sort
```

Jika memakai managed PostgreSQL, ubah `DATABASE_URL` menjadi URL dari provider database:

```bash
nano .env
```

## 9. Load `.env` di Terminal

Sebelum menjalankan migration, seed, atau command yang membaca `process.env`, load `.env`:

```bash
cd /var/www/jalawarta-platform
set -a
source .env
set +a
```

Test:

```bash
echo "$NEXT_PUBLIC_ROOT_DOMAIN"
psql "$DATABASE_URL" -c "select current_database(), current_user;"
```

## 10. Migrasi Database Pertama Kali

Migration Jalawarta berada di:

```bash
src/db/migrations/
```

Jalankan migration Drizzle:

```bash
cd /var/www/jalawarta-platform
set -a
source .env
set +a

bun x drizzle-kit migrate --config drizzle.config.ts
```

Cek tabel berhasil dibuat:

```bash
psql "$DATABASE_URL" -c "\dt"
```

## 11. Seed Data Awal

Seed plugin resmi:

```bash
cd /var/www/jalawarta-platform
set -a
source .env
set +a

bun run scripts/seed-plugins.ts
```

Seed admin demo hanya untuk development atau staging:

```bash
cd /var/www/jalawarta-platform
set -a
source .env
set +a

bun run scripts/seed-admin.ts
```

Catatan penting: `scripts/seed-admin.ts` membuat akun demo:

```text
Email: admin@jalawarta.local
Password: password123
Tenant: demo
```

Untuk production publik, segera ganti password setelah login, atau buat seed admin production khusus sebelum server dibuka.

## 12. Build Production

```bash
cd /var/www/jalawarta-platform
set -a
source .env
set +a

bun run build
```

Build saat ini berhasil, tetapi masih menampilkan warning Sass:

```text
Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.
```

Warning ini tidak memblokir deploy. Nanti perlu cleanup `src/styles/main.scss` agar sesuai standar Tailwind/Sass modern.

## 13. Jalankan Manual Untuk Test

```bash
cd /var/www/jalawarta-platform
set -a
source .env
set +a

bun run start
```

Test dari server:

```bash
curl -I http://127.0.0.1:3000
```

Jika sudah OK, hentikan proses manual dengan `Ctrl+C`, lalu lanjut systemd.

## 14. Setup systemd Service

Buat service:

```bash
sudo tee /etc/systemd/system/jalawarta.service > /dev/null <<'EOF'
[Unit]
Description=Jalawarta Next.js Platform
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/var/www/jalawarta-platform
EnvironmentFile=/var/www/jalawarta-platform/.env
ExecStart=/home/deploy/.bun/bin/bun run start
Restart=always
RestartSec=5
User=deploy
Group=deploy

[Install]
WantedBy=multi-user.target
EOF
```

Jika user server bukan `deploy`, ubah bagian ini:

```bash
sudo sed -i "s/User=deploy/User=$USER/" /etc/systemd/system/jalawarta.service
sudo sed -i "s/Group=deploy/Group=$USER/" /etc/systemd/system/jalawarta.service
sudo sed -i "s|/home/deploy/.bun/bin/bun|$HOME/.bun/bin/bun|" /etc/systemd/system/jalawarta.service
```

Aktifkan service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable jalawarta
sudo systemctl start jalawarta
sudo systemctl status jalawarta --no-pager
```

Lihat log:

```bash
journalctl -u jalawarta -f
```

## 15. Reverse Proxy Dengan Caddy

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Buat konfigurasi awal untuk root, app, dan platform:

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
jalawarta.com, app.jalawarta.com, platform.jalawarta.com {
  reverse_proxy 127.0.0.1:3000
}
EOF

sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Untuk tenant wildcard `*.jalawarta.com`, tambahkan wildcard DNS ke IP server. TLS wildcard biasanya butuh DNS challenge. Untuk tahap awal, subdomain tenant bisa diarahkan satu per satu atau disiapkan nanti sesuai topologi domain production.

## 16. DNS Production

Set DNS minimal:

```text
A     jalawarta.com           -> IP_SERVER
A     app.jalawarta.com       -> IP_SERVER
A     platform.jalawarta.com  -> IP_SERVER
A     *.jalawarta.com         -> IP_SERVER
```

Jika belum memakai wildcard tenant, minimal set root, `app`, dan `platform` dulu.

## 17. Alur Pull Update di Server

Gunakan ini setiap kali ada commit baru di GitHub:

```bash
cd /var/www/jalawarta-platform

git pull origin main
bun install --frozen-lockfile

set -a
source .env
set +a

bun x drizzle-kit migrate --config drizzle.config.ts
bun run build

sudo systemctl restart jalawarta
sudo systemctl status jalawarta --no-pager
```

Cek log setelah restart:

```bash
journalctl -u jalawarta -n 100 --no-pager
```

## 18. Step-by-Step Migrasi Database Saat Ada Perubahan Skema

### Di Mesin Development

Setelah mengubah `src/db/schema.ts`, buat migration baru:

```bash
cd /Users/webane/sites/jalawarta
set -a
source .env
set +a

bun x drizzle-kit generate --config drizzle.config.ts
```

Cek file migration baru:

```bash
git status --short src/db/migrations src/db/schema.ts
```

Commit dan push:

```bash
git add src/db/schema.ts src/db/migrations
git commit -m "Add database migration"
git push origin main
```

### Di Server Production

Backup database dulu:

```bash
cd /var/www/jalawarta-platform
set -a
source .env
set +a

mkdir -p backups
pg_dump "$DATABASE_URL" > "backups/jalawarta-$(date +%Y%m%d-%H%M%S).sql"
```

Pull kode dan jalankan migration:

```bash
cd /var/www/jalawarta-platform
git pull origin main

set -a
source .env
set +a

bun x drizzle-kit migrate --config drizzle.config.ts
```

Build dan restart:

```bash
bun run build
sudo systemctl restart jalawarta
```

Verifikasi:

```bash
sudo systemctl status jalawarta --no-pager
journalctl -u jalawarta -n 100 --no-pager
psql "$DATABASE_URL" -c "\dt"
```

## 19. Command Cepat Deploy Server Baru

Blok ini adalah ringkasan copy-paste untuk server baru. Ganti `CHANGE_ME_STRONG_PASSWORD` dan `jalawarta.com` sebelum menjalankan.

```bash
sudo apt update
sudo apt install -y curl git unzip build-essential ca-certificates openssl postgresql postgresql-contrib

curl -fsSL https://bun.sh/install | bash
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

sudo systemctl enable postgresql
sudo systemctl start postgresql

sudo -u postgres psql <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jalawarta') THEN
    CREATE ROLE jalawarta LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
  ELSE
    ALTER ROLE jalawarta LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
  END IF;
END
$$;

SELECT 'CREATE DATABASE jalawarta OWNER jalawarta'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jalawarta')\gexec

GRANT ALL PRIVILEGES ON DATABASE jalawarta TO jalawarta;
SQL
sudo -u postgres psql -d jalawarta -c "GRANT ALL ON SCHEMA public TO jalawarta;"

sudo mkdir -p /var/www
sudo chown -R "$USER":"$USER" /var/www
cd /var/www
git clone https://github.com/webaneid/jalawarta-platform.git
cd /var/www/jalawarta-platform

AUTH_SECRET_VALUE="$(openssl rand -base64 32)"
APP_ENCRYPTION_KEY_VALUE="$(openssl rand -hex 32)"

cat > .env <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://jalawarta:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/jalawarta
AUTH_SECRET=${AUTH_SECRET_VALUE}
APP_ENCRYPTION_KEY=${APP_ENCRYPTION_KEY_VALUE}
NEXT_PUBLIC_ROOT_DOMAIN=jalawarta.com
NEXTAUTH_URL=https://app.jalawarta.com
EOF
chmod 600 .env

bun install --frozen-lockfile

set -a
source .env
set +a

bun x drizzle-kit migrate --config drizzle.config.ts
bun run scripts/seed-plugins.ts
bun run build
```

Lalu pasang systemd dari bagian 14.

## 20. Catatan Keamanan

- Jangan commit `.env`.
- Jangan mengganti `APP_ENCRYPTION_KEY` setelah API Key Vault berisi data, karena kunci lama diperlukan untuk dekripsi.
- `AUTH_SECRET` boleh dirotasi, tetapi semua sesi login lama akan invalid.
- Backup database sebelum migration production.
- Pastikan `public/uploads/` ikut backup jika masih memakai storage lokal.
- Untuk multi-server, pindahkan upload ke shared storage atau object storage. Jika tidak, file upload hanya ada di server yang menerima upload tersebut.
