# Tangerine Photo - Deployment Guide

> Repository: `git@github.com:leehwui/leehwui-photo.git`

Deploying to an Ubuntu server that already hosts other Next.js and FastAPI applications.

This guide assumes:
- Ubuntu 22.04 / 24.04 LTS
- Nginx already installed and serving other sites
- Node.js 20+ already installed (via nvm or apt)
- Python 3.9+ already available
- MySQL 8.x already running
- MinIO already running (or will be deployed alongside)
- You have root or sudo access

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prepare the Server](#2-prepare-the-server)
3. [Deploy MinIO (if not already running)](#3-deploy-minio)
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
              ┌────────▼─┐ ┌─▼──────────┐
              │  MySQL   │ │   MinIO    │
              │  :3306   │ │   :9000    │
              └──────────┘ └────────────┘
```

Port assignments (choose ports that don't conflict with your existing services):

| Service   | Port  | Notes                       |
|-----------|-------|-----------------------------|
| Nginx     | 80/443| Public-facing               |
| FastAPI   | 8090  | Internal only               |
| Next.js   | 3001  | Internal only               |
| MySQL     | 3306  | Internal only               |
| MinIO API | 9000  | Internal (or proxied)       |
| MinIO Console | 9001 | Admin panel (optional)   |

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

## 3. Deploy MinIO

If MinIO is not already running on the server:

### Option A: Docker (recommended)

```bash
docker run -d \
  --name tangerine-minio \
  --restart unless-stopped \
  -p 9000:9000 \
  -p 9001:9001 \
  -v /data/minio:/data \
  -e MINIO_ROOT_USER=minio_user \
  -e MINIO_ROOT_PASSWORD=minio_password \
  minio/minio server /data --console-address ":9001"
```

### Option B: Binary

```bash
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/minio.service > /dev/null <<EOF
[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
User=minio-user
Group=minio-user
Environment="MINIO_ROOT_USER=your_minio_access_key"
Environment="MINIO_ROOT_PASSWORD=your_minio_secret_key"
ExecStart=/usr/local/bin/minio server /data/minio --console-address ":9001"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable minio
sudo systemctl start minio
```

### Verify MinIO

```bash
curl -s http://localhost:9000/minio/health/live
# Should return OK
```

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
# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_BUCKET=tangerine-photos
MINIO_SECURE=false

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=tangerine
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
NEXT_PUBLIC_MINIO_URL=https://your-domain.com/storage
EOF
```

> **Important:** `NEXT_PUBLIC_API_URL` should be your public domain because API calls are made from the browser. If you proxy MinIO through Nginx (recommended), set `NEXT_PUBLIC_MINIO_URL` to the proxied path.

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

    # MinIO storage proxy (so images are served from the same domain)
    location /storage/ {
        rewrite ^/storage/(.*) /leehwui-photos/$1 break;
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_hide_header X-Amz-Request-Id;
        proxy_hide_header X-Amz-Id-2;

        # Cache static images
        proxy_cache_valid 200 30d;
        expires 30d;
        add_header Cache-Control "public, immutable";
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

### If you proxy MinIO images

When proxying MinIO images through Nginx (recommended for production), you need to update the backend to generate URLs pointing to your proxy instead of the raw MinIO endpoint.

In `backend/.env.production`, add:

```env
MINIO_PUBLIC_URL=https://photo.tangerinesoft.cn/storage
```

Then update `backend/config.py` to include:

```python
minio_public_url: str = ""  # e.g. https://photo.your-domain.com/storage
```

And update the URL generation in `backend/main.py` (the `upload_photo` endpoint):

```python
if settings.minio_public_url:
    url = f"{settings.minio_public_url}/{object_key}"
else:
    protocol = "https" if settings.minio_secure else "http"
    url = f"{protocol}://{settings.minio_endpoint}/{settings.minio_bucket}/{object_key}"
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
sudo systemctl restart tangerine-api

# Frontend
cd ../frontend
npm ci
npm run build
sudo systemctl restart tangerine-web   # or: pm2 restart tangerine-web
```

### Database backup

```bash
# Add to crontab: crontab -e
0 3 * * * mysqldump -u tangerine -pCHANGE_THIS_PASSWORD tangerine_photo | gzip > /backups/tangerine_photo_$(date +\%Y\%m\%d).sql.gz
```

### MinIO backup

If using Docker volume:

```bash
# The data lives at /data/minio (or wherever you mounted the volume)
# Back up the directory periodically
rsync -az /data/minio/ /backups/minio/
```

---

## 11. Environment Variables Reference

### Backend (`backend/.env`)

| Variable       | Default                    | Description                    |
|----------------|----------------------------|--------------------------------|
| `MINIO_ENDPOINT` | `localhost:9000`          | MinIO server address           |
| `MINIO_ACCESS_KEY` | `minioadmin`            | MinIO access key               |
| `MINIO_SECRET_KEY` | `minioadmin`            | MinIO secret key               |
| `MINIO_BUCKET` | `tangerine-photos`         | S3 bucket name                 |
| `MINIO_SECURE` | `false`                    | Use HTTPS for MinIO            |
| `MINIO_PUBLIC_URL` | (empty)                 | Public proxy URL for images    |
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
| `NEXT_PUBLIC_MINIO_URL`| `http://localhost:9000`   | MinIO URL (for images)     |

---

## 12. Troubleshooting

### Backend won't start

```bash
# Check logs
sudo journalctl -u tangerine-api -n 50 --no-pager

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
# If using MinIO proxy through Nginx:
# 1. Check the MinIO proxy location in nginx config
# 2. Verify MINIO_PUBLIC_URL in backend .env
# 3. Check MinIO is accessible: curl http://localhost:9000/minio/health/live

# If images show as broken:
# The photo URLs stored in the database may point to the old MinIO endpoint.
# You may need to update them after changing the public URL scheme.
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
- [ ] Ensure MinIO is running on port 9000
- [ ] Configure `backend/.env` with production credentials
- [ ] Set up Python venv and install deps
- [ ] Create and start `tangerine-api.service`
- [ ] Configure `frontend/.env.production`
- [ ] Build frontend: `npm ci && npm run build`
- [ ] Start frontend with PM2 or systemd
- [ ] Create Nginx site config and enable it
- [ ] Run `certbot` for SSL
- [ ] Change default admin password
- [ ] Set up database backups
- [ ] Restrict CORS origins in production
