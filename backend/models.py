import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, Float
from sqlalchemy.sql import func

from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Photo(Base):
    __tablename__ = "photos"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    object_key = Column(String(512), nullable=False, comment="COS object key")
    url = Column(String(1024), nullable=False)
    category = Column(String(100), nullable=False, default="uncategorized", index=True)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0, comment="Lower number = shown first")
    is_visible = Column(Boolean, default=True, index=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True, comment="File size in bytes")
    content_type = Column(String(100), nullable=True)

    # View / download counters
    view_count = Column(Integer, default=0, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)

    # EXIF metadata
    camera_make = Column(String(100), nullable=True)
    camera_model = Column(String(100), nullable=True)
    iso = Column(Integer, nullable=True)
    aperture = Column(Float, nullable=True, comment="f-number, e.g. 2.8")
    shutter_speed = Column(String(50), nullable=True, comment="e.g. 1/250")
    focal_length = Column(Float, nullable=True, comment="mm")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(100), nullable=True, comment="Friendly display name")
    sort_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class SiteSettings(Base):
    __tablename__ = "site_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SiteStats(Base):
    __tablename__ = "site_stats"

    key = Column(String(100), primary_key=True)
    value = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
