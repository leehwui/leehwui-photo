# Tangerine Photo

A minimal, professional photography portfolio website.

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI (Python) + SQLAlchemy
- **Database**: MySQL 8
- **Storage**: MinIO (S3-compatible object storage)
- **Auth**: JWT (python-jose)
- **i18n**: EN / ZH (custom React Context)

## Project Structure

```
tangerine-photo/
├── frontend/              # Next.js frontend
│   ├── app/               # Pages (gallery + admin)
│   ├── components/        # UI components (Footer, GalleryGrid, Lightbox)
│   └── lib/               # API client + i18n
├── backend/               # FastAPI backend
│   ├── main.py            # App & routes
│   ├── models.py          # SQLAlchemy models
│   ├── database.py        # DB engine & session
│   ├── auth.py            # JWT auth
│   ├── storage.py         # MinIO client
│   └── config.py          # Settings (pydantic-settings)
├── DEPLOYMENT.md          # Production deployment guide (Ubuntu)
└── README.md
```

## Quick Start

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Edit .env with your MySQL & MinIO credentials
uvicorn main:app --host 0.0.0.0 --port 8090 --reload
```

Backend runs at http://localhost:8090

### 2. Frontend

```bash
cd frontend
npm install
npx next dev --port 3001
```

Frontend runs at http://localhost:3001

## Pages

- **Gallery** (`/`): Masonry photo grid, category filters, lightbox viewer, language switcher
- **Admin** (`/admin`): Login, drag & drop upload, photo management (edit/delete) with pagination, category management, site settings

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Login | No |
| GET | `/api/photos` | List photos | No |
| POST | `/api/photos` | Upload photo | Yes |
| PUT | `/api/photos/{id}` | Update photo | Yes |
| DELETE | `/api/photos/{id}` | Delete photo | Yes |
| GET | `/api/categories` | List categories | No |
| POST | `/api/categories` | Create category | Yes |
| DELETE | `/api/categories/{id}` | Delete category | Yes |
| GET | `/api/settings` | Get site settings | No |
| PUT | `/api/settings` | Update settings | Yes |
| GET | `/api/health` | Health check | No |

## Default Credentials

- Username: `admin`
- Password: `admin123`

> Change these in `backend/.env` before deploying to production. See `DEPLOYMENT.md` for the full production setup guide.
