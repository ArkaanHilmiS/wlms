# DevOps Runbook & Production Deployment SOP

## Workload & Learning Management System (WLMS)

**Target Environment:** Ubuntu 22.04 / 24.04 LTS  
**Runtime:** PHP 8.2+ (PHP-FPM) + Nginx + PostgreSQL 15+ + Redis 7+ + Node.js 20+

---

## 1. Spesifikasi Server & Prasyarat Infrastruktur

### 1.1 Rekomendasi Sizing Hardware

| Skala Pengguna                    | CPU / vCPU |  RAM  |   Storage   | Keterangan                                               |
| --------------------------------- | :--------: | :---: | :---------: | -------------------------------------------------------- |
| **Staging / Small** (< 100 User)  |   2 vCPU   | 4 GB  | 50 GB NVMe  | Shared server (Web, DB, Redis dalam 1 node)              |
| **Production** (100 - 1.000 User) |   4 vCPU   | 8 GB  | 120 GB NVMe | Disarankan memisahkan node Database (Managed PostgreSQL) |
| **Enterprise** (> 1.000 User)     |   8 vCPU   | 16 GB | 250 GB NVMe | Multi-node load balancing + Redis Cluster + Managed S3   |

### 1.2 Paket Dependensi Sistem Operasi

```bash
# Update repository & install tool dasar
sudo apt update && sudo apt install -y curl git unzip supervisor nginx redis-server

# Repository PHP 8.2 (Ondrej PPA)
sudo add-apt-repository -y ppa:ondrej/php
sudo apt update
sudo apt install -y php8.2-fpm php8.2-cli php8.2-pgsql php8.2-mbstring \
    php8.2-xml php8.2-curl php8.2-zip php8.2-gd php8.2-intl php8.2-redis

# Composer 2
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2. Standard Operating Procedure (SOP) Deployment

Setiap rilis versi baru ke server produksi wajib mengikuti langkah-langkah _zero-downtime_ berikut:

### 2.1 Alur Skrip Deployment Otomatis (`deploy.sh`)

```bash
#!/bin/bash
set -e

echo "🚀 Starting WLMS Production Deployment..."

# 1. Pindah ke direktori aplikasi
cd /var/www/wlms

# 2. Aktifkan maintenance mode (bypass untuk IP pengembang)
php artisan down --secret="wlms-bypass-key-2026" --render="errors::503"

# 3. Tarik source code terbaru dari Git branch release / main
git fetch origin
git checkout main
git pull origin main

# 4. Instal dependensi Composer (mode produksi, teroptimasi)
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction

# 5. Build aset frontend React 19 / Inertia
npm ci
npm run build

# 6. Jalankan migrasi database
php artisan migrate --force

# 7. Hangatkan cache konfigurasi, rute, dan view
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 8. Restart proses antrean background & websocket daemon
sudo supervisorctl restart wlms-worker:*
sudo supervisorctl restart wlms-reverb:*

# 9. Matikan maintenance mode
php artisan up

echo "✅ WLMS Deployment Successfully Completed!"
```

---

## 3. Konfigurasi Supervisor (Background Process Daemon)

### 3.1 Worker Antrean (`/etc/supervisor/conf.d/wlms-worker.conf`)

Menjalankan pemrosesan impor Excel dan pengiriman email asinkron:

```ini
[program:wlms-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/wlms/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --queue=default,imports,notifications
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/supervisor/wlms-worker.log
```

### 3.2 WebSocket Daemon Reverb (`/etc/supervisor/conf.d/wlms-reverb.conf`)

Menjalankan server WebSocket real-time:

```ini
[program:wlms-reverb]
command=php /var/www/wlms/artisan reverb:start --host=127.0.0.1 --port=8080
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/supervisor/wlms-reverb.log
```

---

## 4. Konfigurasi Virtual Host Nginx (`/etc/nginx/sites-available/wlms.conf`)

```nginx
server {
    listen 80;
    server_name wlms.company.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wlms.company.com;

    root /var/www/wlms/public;
    index index.php;

    ssl_certificate /etc/letsencrypt/live/wlms.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wlms.company.com/privkey.pem;

    # Gzip / Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Max upload size (untuk upload Excel / Dokumen)
    client_max_body_size 25M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Proxy WebSocket Reverb
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

---

## 5. Prosedur Backup & Disaster Recovery

### 5.1 Skrip Otomatisasi Backup Basis Data (`/usr/local/bin/backup-wlms.sh`)

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/wlms"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/wlms_db_$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR
pg_dump -U postgres -h localhost wlms | gzip > $FILENAME

# Retensi 30 hari (hapus backup yang lebih tua dari 30 hari)
find $BACKUP_DIR -type f -name "wlms_db_*.sql.gz" -mtime +30 -exec rm {} \;
```

Jadwalkan via crontab root setiap pukul 02:00 pagi:
`0 2 * * * /usr/local/bin/backup-wlms.sh > /dev/null 2>&1`

### 5.2 Rencana Pemulihan (_Rollback Plan_)

Bila terjadi kegagalan fatal pada versi rilis baru:

1. **Rollback Git & Cache**:
    ```bash
    git checkout <commit_hash_stabil_sebelumnya>
    composer install --no-dev -o
    npm run build
    php artisan optimize:clear
    php artisan config:cache && php artisan route:cache && php artisan view:cache
    sudo supervisorctl restart all
    ```
2. **Rollback Migrasi (Jika Ada Perubahan Skema DDL)**:
    ```bash
    php artisan migrate:rollback --step=1
    ```
3. **Restore Database dari Snapshot**:
    ```bash
    gunzip -c /var/backups/wlms/wlms_db_<timestamp>.sql.gz | psql -U postgres -d wlms
    ```

---

## 6. Pemantauan & Health Check

- **Health Check Endpoint**: `GET https://wlms.company.com/up` (Native Laravel 11 endpoint, mengembalikan HTTP 200 jika aplikasi siap menerima traffic).
- **Inspeksi Antrean Gagal**:
    ```bash
    php artisan queue:failed            # Melihat antrean yang error
    php artisan queue:retry all         # Mencoba ulang seluruh antrean yang gagal
    ```
