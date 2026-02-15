# Tangerine Photo - Deployment Guide

> Repository: `git@github.com:leehwui/leehwui-photo.git`

Deploying to an Ubuntu server that already hosts other Next.js and FastAPI applications.

This guide assumes:
- Ubuntu 22.04 / 24.04 LTS
- Nginx already installed and serving other sites
- Node.js 20+ already installed (via nvm or apt)
- Python 3.9+ already available
- MySQL 8.x already running
- Tencent COS bucket created (for photo storage)
- You have root or sudo access

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prepare the Server](#2-prepare-the-server)
3. [Configure Tencent COS](#3-configure-tencent-cos)
4. [Deploy MySQL Database](#4-deploy-mysql-database)
5. [Deploy Backend (FastAPI)](#5-deploy-backend-fastapi)
6. [Deploy Frontend (Next.js)](#6-deploy-frontend-nextjs)
7. [Configure Nginx Reverse Proxy](#7-configure-nginx-reverse-proxy)
8. [SSL with Let's Encrypt](#8-ssl-with-lets-encrypt)
9. [Firewall Rules](#9-firewall-rules)
10. [Monitoring & Maintenance](#10-monitoring--maintenance)
11. [Environment Variables Reference](#11-environment-variables-reference)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Architecture Overview

```
                         ┌─────────────────────┐
                         │       Nginx          │
                         │  (reverse proxy)     │
                         │  :80 / :443          │
                         └────┬──────────┬──────┘
                              │          │
                    /api/*    │          │  /*
                              │          │
                    ┌─────────▼──┐  ┌────▼──────────┐
                    │  FastAPI   │  │   Next.js      │
                    │  :8090     │  │   :3001        │
                    └──┬─────┬──┘  └────────────────┘
                       │     │
              ┌────────▼─┐ ┌─▼──────────────┐
              │  MySQL   │ │  Tencent COS   │
              │  :3306   │ │  (cloud)       │
              └──────────┘ └────────────────┘
```

Port assignments (choose ports that don't conflict with your existing services):

| Service   | Port  | Notes                       |
|-----------|-------|-----------------------------|
| Nginx     | 80/443| Public-facing               |
| FastAPI   | 8090  | Internal only               |
| Next.js   | 3001  | Internal only               |
| MySQL     | 3306  | Internal only               |

> **Important:** If these ports conflict with existing services on your server, change them in the respective config files and update the Nginx proxy config accordingly.

---

## 2. Prepare the Server

### 2.1 Create a dedicated user (optional but recommended)

```bash
sudo adduser tangerine --disabled-password --gecos ""
sudo usermod -aG sudo tangerine
```

### 2.2 Clone the project

```bash
sudo mkdir -p /var/www/tangerine-photo
sudo chown $USER:$USER /var/www/tangerine-photo
cd /var/www
git clone git@github.com:leehwui/leehwui-photo.git tangerine-photo
```

### 2.3 Verify prerequisites

```bash
node --version    # Should be v20+
python3 --version # Should be 3.9+
nginx -v
mysql --version
```

---

## 3. Configure Tencent COS

Photo storage uses [Tencent Cloud Object Storage (COS)](https://cloud.tencent.com/product/cos). No self-hosted object storage is required.

### 3.1 Create a bucket

1. Log in to the [Tencent COS Console](https://console.cloud.tencent.com/cos)
2. Create a bucket (e.g. `leehwui-photo-1253272222`)
3. Set the bucket access permission to **Public Read, Private Write**
4. Note down the **Region** (e.g. `ap-guangzhou`)

### 3.2 Create API credentials

1. Go to [CAM Console → API Keys](https://console.cloud.tencent.com/cam/capi)
2. Create a SecretId / SecretKey pair
3. Store them securely — you'll put them in the backend `.env`

### 3.3 Configure CDN (recommended)

1. Go to [Tencent CDN Console](https://console.cloud.tencent.com/cdn)
2. Add a domain (e.g. `cdn-leehwui-photo.tangerinesoft.cn`)
3. Set the origin to the COS bucket (`leehwui-photo-1253272222.cos.ap-beijing.myqcloud.com`)
4. Enable HTTPS and configure your SSL certificate
5. Add a CNAME DNS record pointing your CDN domain to the CDN-provided CNAME
6. Set `COS_CDN_URL` in `backend/.env` to your CDN domain

### 3.4 CORS configuration (optional)

If the frontend loads images directly from COS/CDN, configure CORS on the bucket:

- Allowed Origin: `https://your-domain.com`
- Allowed Methods: `GET`
- Allowed Headers: `*`

> **Image URL format (CDN):** `https://cdn-leehwui-photo.tangerinesoft.cn/{key}`
> **Image URL format (direct COS):** `https://{bucket}.cos.{region}.myqcloud.com/{key}`

---

## 4. Deploy MySQL Database

If MySQL is already running, just create the database:

```bash
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS leehwui_photo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Optional: create a dedicated user instead of using root
CREATE USER IF NOT EXISTS 'leehwui'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON leehwui_photo.* TO 'leehwui'@'localhost';
FLUSH PRIVILEGES;
EOF
```

> Tables are created automatically on first backend startup via SQLAlchemy.

---

## 5. Deploy Backend (FastAPI)

### 5.1 Set up Python virtual environment

```bash
cd /var/www/leehwui-photo/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 5.2 Configure environment variables

```bash
cp .env .env.production
nano .env.production
```

Edit `.env.production`:

```env
# Storage backend: "cos" for production, "minio" for local dev
STORAGE_BACKEND=cos

# Tencent COS
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_REGION=ap-beijing
COS_BUCKET=leehwui-photo-1253272222
COS_CDN_URL=https://cdn-leehwui-photo.tangerinesoft.cn

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=leehwui
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_NAME=tangerine_photo

# Auth - CHANGE THESE IN PRODUCTION
SECRET_KEY=GENERATE_A_RANDOM_64_CHAR_STRING
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_THIS_ADMIN_PASSWORD

# Server
HOST=0.0.0.0
PORT=8090
```

Generate a secret key:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 5.3 Rename .env for production

The app reads from `.env` by default. Either rename or symlink:

```bash
ln -sf .env.production .env
```

### 5.4 Test the backend

```bash
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8090
# Visit http://your-server:8090/api/health
# Ctrl+C to stop
```

### 5.5 Create systemd service

```bash
sudo tee /etc/systemd/system/leehwui-photo-api.service > /dev/null <<EOF
[Unit]
Description=Leehwui Photo API (FastAPI)
After=network.target mysql.service

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=/var/www/leehwui-photo/backend
Environment="PATH=/var/www/leehwui-photo/backend/venv/bin:/usr/bin"
ExecStart=/var/www/leehwui-photo/backend/venv/bin/uvicorn main:app \
    --host 127.0.0.1 \
    --port 8090 \
    --workers 2 \
    --log-level info
Restart=always
RestartSec=5
StandardOutput=append:/var/log/leehwui-photo-api.log
StandardError=append:/var/log/leehwui-photo-api.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable leehwui-photo-api
sudo systemctl start leehwui-photo-api
sudo systemctl status leehwui-photo-api
```

> **Note:** In production, use `--host 127.0.0.1` (not `0.0.0.0`) since Nginx will proxy requests. This prevents direct external access.

---

## 6. Deploy Frontend (Next.js)

### 6.1 Install dependencies and build

```bash
cd /var/www/leehwui-photo/frontend
npm ci --production=false   # install all deps including devDeps for build
```

### 6.2 Configure environment

```bash
cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://your-domain.com
EOF
```

> **Important:** `NEXT_PUBLIC_API_URL` should be your public domain because API calls are made from the browser. Images are served directly from Tencent COS CDN — no proxy needed.

### 6.3 Build for production

```bash
npm run build
```

### 6.4 Option A: Run with PM2 (recommended if you already use PM2)

```bash
# Install PM2 globally if not already installed
sudo npm install -g pm2

cd /var/www/leehwui-photo/frontend
pm2 start npm --name "leehwui-photo-web" -- start -- --port 3003
pm2 save
pm2 startup  # follow the instructions it prints
```

### 6.4 Option B: Run with systemd

```bash
sudo tee /etc/systemd/system/tangerine-web.service > /dev/null <<EOF
[Unit]
Description=Tangerine Photo Web (Next.js)
After=network.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=/var/www/tangerine-photo/frontend
ExecStart=/usr/bin/npx next start --port 3001
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001
StandardOutput=append:/var/log/tangerine-web.log
StandardError=append:/var/log/tangerine-web.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tangerine-web
sudo systemctl start tangerine-web
sudo systemctl status tangerine-web
```

> If you use `nvm`, replace `/usr/bin/npx` with the full path: `$(which npx)`.

---

## 7. Configure Nginx Reverse Proxy

Create a new site config (do **not** modify your existing site configs):

```bash
sudo nano /etc/nginx/sites-available/leehwui-photo
```

```nginx
server {
    listen 80;
    server_name photo.tangerinesoft.cn;   # change to your domain

    client_max_body_size 50M;  # allow large photo uploads

    # API backend
    location /api/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout for large uploads
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Next.js frontend (catch-all, must be last)
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site and reload:

```bash
sudo ln -s /etc/nginx/sites-available/leehwui-photo /etc/nginx/sites-enabled/
sudo nginx -t          # test config
sudo systemctl reload nginx
```

---

## 8. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d photo.your-domain.com
```

Certbot will automatically modify the Nginx config to add SSL. Auto-renewal is set up by default via a systemd timer:

```bash
sudo systemctl status certbot.timer
```

---

## 9. Firewall Rules

If using `ufw`:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Do NOT expose 8090, 3001, 9000, 3306 externally
sudo ufw status
```

---

## 10. Monitoring & Maintenance

### View logs

```bash
# Backend
sudo journalctl -u leehwui-photo-api -f
# or
tail -f /var/log/leehwui-photo-api.log

# Frontend
sudo journalctl -u tangerine-web -f
# or (if using PM2)
pm2 logs leehwui-photo-web

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Restart services

```bash
sudo systemctl restart leehwui-photo-api
sudo systemctl restart leehwui-photo-web
```

### Update deployment

```bash
cd /var/www/leehwui-photo
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart leehwui-photo-api

# Frontend
cd ../frontend
npm ci
npm run build
sudo systemctl restart leehwui-photo-web   # or: pm2 restart leehwui-photo-web
```

### Database migrations

SQLAlchemy `create_all()` only creates **new tables** — it does not add columns to existing tables. When the schema adds new columns, run the following SQL manually:

```bash
mysql -u root -p tangerine_photo
```

#### Migration: View counters + EXIF metadata (2026-02)

```sql
-- View / download counters
ALTER TABLE photos ADD COLUMN view_count INT NOT NULL DEFAULT 0;
ALTER TABLE photos ADD COLUMN download_count INT NOT NULL DEFAULT 0;

-- EXIF metadata
ALTER TABLE photos ADD COLUMN camera_make VARCHAR(100) NULL;
ALTER TABLE photos ADD COLUMN camera_model VARCHAR(100) NULL;
ALTER TABLE photos ADD COLUMN iso INT NULL;
ALTER TABLE photos ADD COLUMN aperture FLOAT NULL COMMENT 'f-number, e.g. 2.8';
ALTER TABLE photos ADD COLUMN shutter_speed VARCHAR(50) NULL COMMENT 'e.g. 1/250';
ALTER TABLE photos ADD COLUMN focal_length FLOAT NULL COMMENT 'mm';

-- Site-wide stats table
CREATE TABLE IF NOT EXISTS site_stats (
  `key` VARCHAR(100) PRIMARY KEY,
  value INT NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

> **Note:** Always back up the database before running migrations.

### Database backup

```bash
# Add to crontab: crontab -e
0 3 * * * mysqldump -u tangerine -pCHANGE_THIS_PASSWORD tangerine_photo | gzip > /backups/tangerine_photo_$(date +\%Y\%m\%d).sql.gz
```

### Photo backup

Photos are stored in Tencent COS. COS provides built-in redundancy and durability. For extra safety, enable [COS Cross-Region Replication](https://cloud.tencent.com/document/product/436/19237) or use [COSCMD](https://cloud.tencent.com/document/product/436/10976) for local backups:

```bash
pip install coscmd
coscmd config -a <SecretId> -s <SecretKey> -b <bucket> -r <region>
coscmd download -r / /backups/cos/
```

---

## 11. Environment Variables Reference

### Backend (`backend/.env`)

| Variable       | Default                    | Description                    |
|----------------|----------------------------|--------------------------------|
| `STORAGE_BACKEND` | `cos`                   | Storage backend: `cos` (Tencent COS) or `minio` (local MinIO) |
| `COS_SECRET_ID` | (empty)                   | Tencent COS SecretId           |
| `COS_SECRET_KEY` | (empty)                  | Tencent COS SecretKey          |
| `COS_REGION`   | `ap-guangzhou`              | COS bucket region              |
| `COS_BUCKET`   | `leehwui-photo-dev-1253272222` | COS bucket name             |
| `COS_CDN_URL`  | (empty)                    | CDN domain for serving images (e.g. `https://cdn-leehwui-photo.tangerinesoft.cn`). Falls back to direct COS URL if empty. |
| `MINIO_ENDPOINT` | `localhost:9000`          | MinIO server endpoint (used when `STORAGE_BACKEND=minio`) |
| `MINIO_ACCESS_KEY` | `minioadmin`            | MinIO access key              |
| `MINIO_SECRET_KEY` | `minioadmin`            | MinIO secret key              |
| `MINIO_BUCKET` | `tangerine-photos`          | MinIO bucket name             |
| `MINIO_SECURE` | `false`                     | Use HTTPS for MinIO           |
| `DB_HOST`      | `127.0.0.1`                | MySQL host                     |
| `DB_PORT`      | `3306`                     | MySQL port                     |
| `DB_USER`      | `root`                     | MySQL user                     |
| `DB_PASSWORD`  | `mysql_root_secret`        | MySQL password                 |
| `DB_NAME`      | `tangerine_photo`          | MySQL database name            |
| `SECRET_KEY`   | (default dev key)          | JWT signing key (change this!) |
| `ADMIN_USERNAME` | `admin`                  | Admin login username           |
| `ADMIN_PASSWORD` | `admin123`               | Admin login password           |
| `HOST`         | `0.0.0.0`                  | Bind address                   |
| `PORT`         | `8090`                     | Bind port                      |

### Frontend (`frontend/.env.local` or `.env.production`)

| Variable               | Default                    | Description                |
|------------------------|----------------------------|----------------------------|
| `NEXT_PUBLIC_API_URL`  | `http://localhost:8090`    | Backend API base URL       |

---

## 12. Troubleshooting

### Backend won't start

```bash
# Check logs
sudo journalctl -u leehwui-photo-api -n 50 --no-pager

# Common issues:
# - MySQL not reachable: check DB_HOST, ensure MySQL is running
# - Port in use: change PORT in .env or stop conflicting service
# - Python deps missing: re-run pip install -r requirements.txt
```

### Frontend build fails

```bash
# Check Node.js version
node --version  # Must be 20+

# Clear cache and rebuild
rm -rf .next
npm ci
npm run build
```

### Images not loading

```bash
# Photos are served via Tencent CDN → COS:
# 1. Verify COS credentials in backend .env (COS_SECRET_ID, COS_SECRET_KEY)
# 2. Check bucket exists and is set to public-read
# 3. Verify COS_REGION matches the bucket's region
# 4. Verify COS_CDN_URL points to your CDN domain
# 5. Test the CDN URL: curl https://cdn-leehwui-photo.tangerinesoft.cn/<key>
# 6. Test direct COS: curl https://<bucket>.cos.<region>.myqcloud.com/<key>
#
# If CDN fails but direct COS works:
# - Check CDN domain CNAME DNS record
# - Check CDN origin is set to the correct COS bucket
# - Check CDN SSL certificate
#
# If images show as broken:
# The photo URLs stored in the database may need updating after changing
# COS_CDN_URL. Run a SQL UPDATE to replace the old URL prefix.
```

### 502 Bad Gateway

```bash
# Check if the backend/frontend services are running
sudo systemctl status tangerine-api
sudo systemctl status tangerine-web

# Check if the ports match your nginx config
ss -tlnp | grep -E '8090|3001'
```

### CORS errors in browser

The backend allows all origins by default (`allow_origins=["*"]`). In production, restrict this in `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://photo.your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Quick Start Checklist

- [ ] Clone repo to `/var/www/tangerine-photo`
- [ ] Create MySQL database `tangerine_photo`
- [ ] Create Tencent COS bucket with public-read access
- [ ] Configure `backend/.env` with COS credentials and production settings
- [ ] Set up Python venv and install deps
- [ ] Create and start `leehwui-photo-api.service`
- [ ] Configure `frontend/.env.production`
- [ ] Build frontend: `npm ci && npm run build`
- [ ] Start frontend with PM2 or systemd
- [ ] Create Nginx site config and enable it
- [ ] Run `certbot` for SSL
- [ ] Change default admin password
- [ ] Set up database backups
- [ ] Restrict CORS origins in production
