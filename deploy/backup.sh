#!/usr/bin/env bash
# Cadangkan database SQLite (named volume "app-data") ke file .tar.gz.
# Pakai: ./deploy/backup.sh [folder-tujuan]
# Contoh cron harian 02:00:
#   0 2 * * * /opt/muhasabah-harian/deploy/backup.sh /opt/backups >> /var/log/mh-backup.log 2>&1
set -euo pipefail

DEST="${1:-./backups}"
mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M%S)"

# Nama volume mengikuti prefix proyek compose (folder). Sesuaikan bila perlu.
VOLUME="$(docker volume ls --format '{{.Name}}' | grep -E 'app-data$' | head -n1)"
if [ -z "$VOLUME" ]; then
  echo "Volume app-data tidak ditemukan." >&2
  exit 1
fi

docker run --rm -v "$VOLUME":/data -v "$(realpath "$DEST")":/backup alpine \
  tar czf "/backup/muhasabah-$STAMP.tar.gz" -C /data .

echo "Backup tersimpan: $DEST/muhasabah-$STAMP.tar.gz"

# Simpan 14 backup terbaru saja.
ls -1t "$DEST"/muhasabah-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
