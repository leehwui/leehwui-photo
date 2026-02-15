import uuid
from typing import Optional, List

from fastapi import (
    FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Query,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from config import settings
from database import engine, get_db, Base
from models import Photo, Category, SiteSettings, SiteStats
from storage import get_storage_client
from auth import authenticate_user, create_access_token, get_current_user, Token

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Tangerine Photo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize storage (MinIO or Tencent COS, depending on STORAGE_BACKEND)
storage = get_storage_client()

# Create tables
Base.metadata.create_all(bind=engine)

# Seed default categories + settings on first run
def _seed(db: Session):
    if db.query(Category).count() == 0:
        for i, name in enumerate(["landscape", "portrait", "street"]):
            db.add(Category(name=name, display_name=name.title(), sort_order=i))
        db.commit()
    defaults = {
        "site_title": "TANGERINE",
        "site_subtitle": "",
        "contact_email": "",
        "weibo_url": "",
        "wechat_id": "",
        "xiaohongshu_url": "",
        "bilibili_url": "",
        "douyin_url": "",
    }
    for k, v in defaults.items():
        if not db.query(SiteSettings).filter_by(key=k).first():
            db.add(SiteSettings(key=k, value=v))
    db.commit()

with next(get_db()) as db:
    _seed(db)


# ---------------------------------------------------------------------------
# EXIF extraction helper
# ---------------------------------------------------------------------------
def _extract_exif(file_data: bytes) -> dict:
    """Extract basic EXIF metadata from image bytes. Returns a dict of fields."""
    result: dict = {}
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, IFD
        from io import BytesIO

        img = Image.open(BytesIO(file_data))
        result["width"] = img.width
        result["height"] = img.height

        exif_data = img.getexif()
        if not exif_data:
            return result

        # Camera make/model are in the top-level IFD
        result["camera_make"] = str(exif_data.get(271, "")).strip() or None   # Make
        result["camera_model"] = str(exif_data.get(272, "")).strip() or None  # Model

        # ISO, aperture, shutter, focal length are in the Exif sub-IFD
        ifd_exif = exif_data.get_ifd(IFD.Exif)
        if not ifd_exif:
            return result

        # ISO
        iso = ifd_exif.get(34855)  # ISOSpeedRatings
        if iso:
            result["iso"] = int(iso)

        # Aperture (FNumber)
        fnumber = ifd_exif.get(33437)  # FNumber
        if fnumber is not None:
            result["aperture"] = round(float(fnumber), 1)

        # Shutter speed (ExposureTime)
        exposure = ifd_exif.get(33434)  # ExposureTime
        if exposure is not None:
            val = float(exposure)
            if val > 0 and val < 1:
                result["shutter_speed"] = f"1/{int(round(1 / val))}"
            elif val >= 1:
                result["shutter_speed"] = f"{round(val, 1)}"

        # Focal length
        fl = ifd_exif.get(37386)  # FocalLength
        if fl is not None:
            result["focal_length"] = round(float(fl), 1)

    except Exception as e:
        print(f"EXIF extraction warning: {e}")
    return result


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class PhotoOut(BaseModel):
    id: str
    filename: str
    url: str
    category: str
    title: Optional[str] = None
    description: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    sort_order: int = 0
    view_count: int = 0
    download_count: int = 0
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    iso: Optional[int] = None
    aperture: Optional[float] = None
    shutter_speed: Optional[str] = None
    focal_length: Optional[float] = None

    class Config:
        from_attributes = True


class PaginatedPhotos(BaseModel):
    items: List[PhotoOut]
    total: int


class CategoryOut(BaseModel):
    id: str
    name: str
    display_name: Optional[str] = None
    sort_order: int = 0

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str
    display_name: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None


class CategoryReorder(BaseModel):
    ids: List[str]  # ordered list of category IDs


class SiteSettingsOut(BaseModel):
    site_title: str = "TANGERINE"
    site_subtitle: str = ""
    contact_email: str = ""
    weibo_url: str = ""
    wechat_id: str = ""
    xiaohongshu_url: str = ""
    bilibili_url: str = ""
    douyin_url: str = ""


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if not authenticate_user(form_data.username, form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": form_data.username})
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Public: Photos
# ---------------------------------------------------------------------------
@app.get("/api/photos", response_model=PaginatedPhotos)
def list_photos(
    category: Optional[str] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=10000),
    db: Session = Depends(get_db),
):
    q = db.query(Photo).filter(Photo.is_visible == True)
    if category:
        q = q.filter(Photo.category == category)
    q = q.order_by(Photo.sort_order.asc(), Photo.created_at.desc())
    total = q.count()
    items = q.offset(skip).limit(limit).all()
    return PaginatedPhotos(items=items, total=total)


@app.get("/api/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return (
        db.query(Category)
        .filter(Category.is_visible == True)
        .order_by(Category.sort_order.asc())
        .all()
    )


@app.get("/api/settings", response_model=SiteSettingsOut)
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(SiteSettings).all()
    data = {r.key: r.value for r in rows}
    return SiteSettingsOut(**{k: data.get(k, v) for k, v in SiteSettingsOut().dict().items()})


# ---------------------------------------------------------------------------
# Admin: Photos
# ---------------------------------------------------------------------------
@app.post("/api/photos", response_model=PhotoOut)
async def upload_photo(
    file: UploadFile = File(...),
    category: str = Form(default="uncategorized"),
    title: Optional[str] = Form(default=None),
    description: Optional[str] = Form(default=None),
    sort_order: int = Form(default=0),
    _user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    photo_id = str(uuid.uuid4())
    object_key = f"{category}/{photo_id}.{ext}"

    file_data = await file.read()
    file_size = len(file_data)

    # Extract EXIF metadata
    exif = _extract_exif(file_data)

    storage.put_object(object_key, file_data, file.content_type or "image/jpeg")

    url = f"{settings.public_url}/{object_key}"

    # Ensure category exists
    cat_row = db.query(Category).filter_by(name=category).first()
    if not cat_row:
        cat_row = Category(name=category, display_name=category.title())
        db.add(cat_row)
        db.flush()

    photo = Photo(
        id=photo_id,
        filename=f"{photo_id}.{ext}",
        original_filename=file.filename,
        object_key=object_key,
        url=url,
        category=category,
        title=title,
        description=description,
        sort_order=sort_order,
        file_size=file_size,
        content_type=file.content_type,
        width=exif.get("width"),
        height=exif.get("height"),
        camera_make=exif.get("camera_make"),
        camera_model=exif.get("camera_model"),
        iso=exif.get("iso"),
        aperture=exif.get("aperture"),
        shutter_speed=exif.get("shutter_speed"),
        focal_length=exif.get("focal_length"),
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@app.put("/api/photos/{photo_id}")
def update_photo(
    photo_id: str,
    title: Optional[str] = Form(default=None),
    description: Optional[str] = Form(default=None),
    category: Optional[str] = Form(default=None),
    sort_order: Optional[int] = Form(default=None),
    is_visible: Optional[bool] = Form(default=None),
    _user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo = db.query(Photo).filter_by(id=photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if title is not None:
        photo.title = title
    if description is not None:
        photo.description = description
    if category is not None:
        photo.category = category
    if sort_order is not None:
        photo.sort_order = sort_order
    if is_visible is not None:
        photo.is_visible = is_visible
    db.commit()
    db.refresh(photo)
    return {"id": photo.id, "message": "updated"}


@app.delete("/api/photos/{photo_id}")
def delete_photo(
    photo_id: str,
    _user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo = db.query(Photo).filter_by(id=photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Remove from storage
    try:
        storage.delete_object(photo.object_key)
    except Exception:
        pass

    db.delete(photo)
    db.commit()
    return {"message": "deleted"}


# ---------------------------------------------------------------------------
# Admin: Categories
# ---------------------------------------------------------------------------
@app.post("/api/categories", response_model=CategoryOut)
def create_category(
    body: CategoryCreate,
    _user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Category).filter_by(name=body.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = Category(
        name=body.name,
        display_name=body.display_name or body.name.title(),
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@app.delete("/api/categories/{category_id}")
def delete_category(
    category_id: str,
    _user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cat = db.query(Category).filter_by(id=category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return {"message": "deleted"}


@app.put("/api/categories/reorder")
def reorder_categories(
    body: CategoryReorder,
    _user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for index, cat_id in enumerate(body.ids):
        cat = db.query(Category).filter_by(id=cat_id).first()
        if cat:
            cat.sort_order = index
    db.commit()
    return {"message": "reordered"}


@app.put("/api/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: str,
    body: CategoryUpdate,
    _user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cat = db.query(Category).filter_by(id=category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if body.name is not None:
        # Check unique
        existing = db.query(Category).filter(
            Category.name == body.name, Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Category name already exists")
        cat.name = body.name
    if body.display_name is not None:
        cat.display_name = body.display_name
    db.commit()
    db.refresh(cat)
    return cat


# ---------------------------------------------------------------------------
# Admin: Settings
# ---------------------------------------------------------------------------
@app.put("/api/settings")
def update_settings(
    settings_data: dict,
    _user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for key, value in settings_data.items():
        row = db.query(SiteSettings).filter_by(key=key).first()
        if row:
            row.value = str(value)
        else:
            db.add(SiteSettings(key=key, value=str(value)))
    db.commit()
    return {"message": "updated"}


# ---------------------------------------------------------------------------
# Public: View / download tracking
# ---------------------------------------------------------------------------
@app.post("/api/photos/{photo_id}/view")
def track_photo_view(photo_id: str, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter_by(id=photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    photo.view_count = (photo.view_count or 0) + 1
    db.commit()
    return {"view_count": photo.view_count}


@app.post("/api/photos/{photo_id}/download")
def track_photo_download(photo_id: str, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter_by(id=photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    photo.download_count = (photo.download_count or 0) + 1
    db.commit()
    return {"download_count": photo.download_count}


@app.post("/api/site/view")
def track_site_view(db: Session = Depends(get_db)):
    row = db.query(SiteStats).filter_by(key="total_views").first()
    if not row:
        row = SiteStats(key="total_views", value=1)
        db.add(row)
    else:
        row.value = (row.value or 0) + 1
    db.commit()
    return {"total_views": row.value}


@app.get("/api/stats")
def get_stats(
    _user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site_views_row = db.query(SiteStats).filter_by(key="total_views").first()
    total_photos = db.query(Photo).count()
    total_photo_views = db.query(Photo).with_entities(
        sa_func.coalesce(sa_func.sum(Photo.view_count), 0)
    ).scalar()
    total_downloads = db.query(Photo).with_entities(
        sa_func.coalesce(sa_func.sum(Photo.download_count), 0)
    ).scalar()
    return {
        "site_views": site_views_row.value if site_views_row else 0,
        "total_photos": total_photos,
        "total_photo_views": total_photo_views,
        "total_downloads": total_downloads,
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "tangerine-photo-api"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
