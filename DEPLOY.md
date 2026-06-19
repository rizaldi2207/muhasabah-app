# Panduan Deploy ke VPS (Ubuntu + Docker + Nginx + HTTPS)

Panduan ini mendeploy **Muhasabah Harian** ke VPS menggunakan Docker Compose,
dengan **Nginx host** sebagai reverse proxy dan **Let's Encrypt** untuk HTTPS.

```
Internet ──HTTPS──▶ Nginx host (TLS) ──▶ 127.0.0.1:8080
                                         └─ container "web" (Nginx: SPA + proxy /api)
                                                              └─ container "api" (Express + SQLite)
```

## Prasyarat

- VPS Ubuntu 22.04 / 24.04 (RAM 1 GB cukup).
- Sebuah **domain** (mis. `muhasabah.example.com`) dengan **A record** mengarah ke IP VPS.
- Akses SSH ke VPS.

---

## 1. Persiapan server & pengguna

Login sebagai root, lalu buat pengguna non-root:

```bash
adduser deploy
usermod -aG sudo deploy
# salin kunci SSH agar bisa login sebagai 'deploy'
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Login ulang sebagai `deploy`, lalu perbarui sistem:

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Firewall

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # buka port 80 & 443
sudo ufw enable
sudo ufw status
```

> Port aplikasi (8080) **tidak** dibuka — hanya diakses lokal oleh Nginx.

## 3. Install Docker + Compose plugin

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker          # aktifkan grup tanpa logout
docker --version
docker compose version
```

Docker sudah otomatis `enabled` saat boot.

## 4. Ambil kode & konfigurasi rahasia

```bash
sudo mkdir -p /opt/muhasabah-harian && sudo chown $USER:$USER /opt/muhasabah-harian
git clone <URL_REPO_ANDA> /opt/muhasabah-harian
cd /opt/muhasabah-harian

cp .env.example .env
```

Edit `.env` dan isi nilai produksi:

```bash
# hasilkan JWT secret acak yang kuat:
echo "JWT_SECRET=$(openssl rand -hex 32)" 

nano .env
```

Pastikan minimal:

```ini
NODE_ENV=production
DB_PATH=/data/app.db
WEB_PORT=8080

JWT_SECRET=<hasil openssl rand -hex 32>
ADMIN_NAME=Administrator
ADMIN_EMAIL=admin@domainanda.com
ADMIN_PASSWORD=<kata-sandi-kuat>
```

> `ADMIN_*` hanya dipakai untuk membuat admin pertama saat database masih kosong.
> Setelah login pertama, sebaiknya ganti kata sandinya dari dalam aplikasi/panel.

## 5. Jalankan stack (mode produksi)

Container `web` akan di-bind ke `127.0.0.1:8080` saja (lihat `docker-compose.prod.yml`):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose ps                 # pastikan api "healthy" & web "Up"
curl -I http://127.0.0.1:8080     # harus mengembalikan 200 dari container web
```

`restart: always` membuat container otomatis hidup lagi setelah reboot.

> **Jika port 8080 sudah dipakai servis lain di VPS**, ganti ke port lokal yang bebas
> (mis. 8090) di **dua tempat** yang harus sama:
> 1. `.env` → `WEB_PORT=8090`
> 2. `deploy/nginx/muhasabah-harian.conf` → blok `upstream muhasabah_web { server 127.0.0.1:8090; }`
>
> Cek port yang bebas: `sudo ss -ltnp | grep :8090` (kosong = bebas). Lalu jalankan ulang
> stack (`docker compose ... up -d`) dan `sudo nginx -t && sudo systemctl reload nginx`.
> Port internal container tetap 80/3001 (di jaringan Docker) — tidak perlu diubah.

## 6. Pasang Nginx reverse proxy

```bash
sudo apt install -y nginx
sudo cp deploy/nginx/muhasabah-harian.conf /etc/nginx/sites-available/muhasabah-harian.conf

# GANTI domain placeholder dengan domain Anda:
sudo sed -i 's/muhasabah.example.com/muhasabah.domainanda.com/g' \
  /etc/nginx/sites-available/muhasabah-harian.conf

sudo ln -s /etc/nginx/sites-available/muhasabah-harian.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default     # nonaktifkan situs default

sudo nginx -t        # uji konfigurasi
sudo systemctl reload nginx
```

Sekarang `http://muhasabah.domainanda.com` sudah bisa diakses (belum HTTPS).

## 7. Aktifkan HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d muhasabah.domainanda.com
```

Ikuti wizard (masukkan email, setujui TOS, pilih redirect HTTP→HTTPS).
Certbot otomatis menyunting konfigurasi Nginx menambahkan TLS, dan memasang
timer perpanjangan otomatis. Uji perpanjangan:

```bash
sudo certbot renew --dry-run
```

## 8. Verifikasi akhir

- Buka `https://muhasabah.domainanda.com` → muncul halaman **Masuk**.
- Login dengan `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Coba daftar akun user baru, pastikan dapat 14 kegiatan default.
- HTTPS aktif (gembok hijau) → notifikasi PWA & service worker berfungsi.

---

## Operasional

### Update aplikasi (deploy versi baru)

```bash
cd /opt/muhasabah-harian
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker image prune -f
```

Data (volume `app-data`) tetap aman saat rebuild.

### Lihat log

```bash
docker compose logs -f api
docker compose logs -f web
```

### Backup & restore database

Backup (cadangkan volume SQLite):

```bash
chmod +x deploy/backup.sh          # sekali saja
./deploy/backup.sh /opt/backups
```

Jadwalkan harian via cron:

```bash
crontab -e
# tambahkan:
0 2 * * * /opt/muhasabah-harian/deploy/backup.sh /opt/backups >> /var/log/mh-backup.log 2>&1
```

Restore dari sebuah backup:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
VOLUME=$(docker volume ls --format '{{.Name}}' | grep -E 'app-data$' | head -n1)
docker run --rm -v "$VOLUME":/data -v /opt/backups:/backup alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/muhasabah-YYYYMMDD-HHMMSS.tar.gz -C /data"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

| Gejala | Pemeriksaan |
| --- | --- |
| `502 Bad Gateway` | `docker compose ps` — apakah `web` Up? `curl -I http://127.0.0.1:8080` |
| `api` unhealthy | `docker compose logs api` (cek error DB / env) |
| Domain belum terhubung | `dig +short muhasabah.domainanda.com` harus = IP VPS |
| Certbot gagal | Pastikan port 80 terbuka & A record benar sebelum menjalankan certbot |
| Lupa sandi admin | Set ulang lewat shell (lihat di bawah) |

Reset sandi admin secara manual (darurat):

```bash
docker compose exec api node -e "
const db=require('./server/db');const {hashPassword}=require('./server/lib/auth');
db.prepare('UPDATE users SET password_hash=? WHERE email=?')
  .run(hashPassword('SandiBaru123'),'admin@domainanda.com');
console.log('Sandi admin direset.');"
```
