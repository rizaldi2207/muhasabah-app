# Muhasabah Harian — Tracking Kegiatan Harian

Aplikasi web pribadi untuk melacak kegiatan ibadah/harian, dengan pengingat, rekap harian
berbasis hadits perbandingan amal, serta dashboard harian, bulanan, dan tahunan.

> "Barang siapa yang hari ini lebih baik dari hari kemarin, maka ia tergolong orang yang
> beruntung. Barang siapa yang hari ini sama dengan hari kemarin, maka ia merugi.
> Barang siapa yang hari ini lebih buruk, maka ia celaka."

## Fitur

- **Login & Registrasi** — autentikasi dengan 2 role (admin & user), pendaftaran mandiri terbuka, JWT.
- **Hari Ini** — checklist kegiatan: tandai "sudah?" + jam dilakukan + catatan, indikator warna tepat waktu / terlambat / terlewat.
- **Kelola Kegiatan** — CRUD penuh (nama, kategori, jam target, harian/mingguan, bobot, aktif/nonaktif).
- **Rekap** — status hadits (Beruntung / Merugi / Celaka) membandingkan skor hari ini vs kemarin.
- **Dashboard** — indikator & grafik harian, bulanan, tahunan; perbandingan antar bulan & antar tahun.
- **Panel Admin** — kelola pengguna (tambah/role/aktif/reset sandi/hapus) & pantau progres tiap pengguna (read-only).
- **Pengingat** — notifikasi browser pada jam kegiatan (aktif saat aplikasi terbuka, PWA).

Setiap pengguna memiliki daftar kegiatan & riwayat sendiri (terisolasi). Akun baru otomatis
mendapat 14 kegiatan ibadah default yang bisa diedit.

## Peran (roles)

- **user** — mengelola kegiatan & mencatat amal hariannya sendiri.
- **admin** — semua kemampuan user, plus Panel Admin untuk mengelola akun & memantau progres pengguna lain.

## Akun admin awal

Saat database masih kosong, satu admin dibuat otomatis (kredensial dari variabel `ADMIN_*`):

```
Email    : admin@muhasabah.local   (ADMIN_EMAIL)
Sandi    : admin123                (ADMIN_PASSWORD)
```

> Ganti kata sandi & `JWT_SECRET` sebelum dipakai di produksi. Salin `.env.example` ke `.env`.

## Stack

- Backend: Node.js + Express + SQLite (better-sqlite3), JWT + bcryptjs
- Frontend: React + Vite + Tailwind CSS + Recharts
- Container: Docker + Docker Compose (Nginx menyajikan frontend & mem-proxy `/api`)

## Menjalankan dengan Docker (disarankan)

```bash
docker compose up --build
```

Buka http://localhost:8080

Data SQLite tersimpan di named volume `app-data` sehingga tetap ada walau container dihapus.

## Menjalankan untuk pengembangan (tanpa Docker)

Prasyarat: Node.js 20+.

```bash
# instal dependensi
npm install
npm --prefix client install

# jalankan backend (:3001) + frontend dev (:5173)
npm run dev
```

Buka http://localhost:5173 (Vite mem-proxy `/api` ke backend).

## Struktur

- `server/` — API Express + SQLite
- `client/` — aplikasi React (Vite)
- `data/` — file database SQLite (lokal; di Docker memakai volume)
