"""
Unified storage abstraction — supports both Tencent COS and MinIO.

Set STORAGE_BACKEND=cos  (production) or STORAGE_BACKEND=minio (local dev)
in your .env file.
"""

from __future__ import annotations

import json
from io import BytesIO
from typing import Protocol

from config import settings


# ---------------------------------------------------------------------------
# Common interface
# ---------------------------------------------------------------------------
class StorageClient(Protocol):
    """Minimal duck-type interface used by the rest of the application."""

    def put_object(self, key: str, data: bytes, content_type: str) -> None: ...
    def delete_object(self, key: str) -> None: ...


# ---------------------------------------------------------------------------
# Tencent COS adapter
# ---------------------------------------------------------------------------
class CosStorageClient:
    def __init__(self):
        from qcloud_cos import CosConfig, CosS3Client

        config = CosConfig(
            Region=settings.cos_region,
            SecretId=settings.cos_secret_id,
            SecretKey=settings.cos_secret_key,
            Scheme="https",
        )
        self._client = CosS3Client(config)
        self._bucket = settings.cos_bucket
        self._bucket_ready = False

    def _ensure_bucket(self):
        if self._bucket_ready:
            return
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except Exception:
            self._client.create_bucket(Bucket=self._bucket)
        self._bucket_ready = True

    def put_object(self, key: str, data: bytes, content_type: str) -> None:
        self._ensure_bucket()
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    def delete_object(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)


# ---------------------------------------------------------------------------
# MinIO adapter
# ---------------------------------------------------------------------------
class MinioStorageClient:
    def __init__(self):
        from minio import Minio

        self._client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        self._bucket = settings.minio_bucket
        self._bucket_ready = False

    def _ensure_bucket(self):
        if self._bucket_ready:
            return
        if not self._client.bucket_exists(self._bucket):
            self._client.make_bucket(self._bucket)
            # Public-read policy
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": ["*"]},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{self._bucket}/*"],
                    }
                ],
            }
            self._client.set_bucket_policy(self._bucket, json.dumps(policy))
        self._bucket_ready = True

    def put_object(self, key: str, data: bytes, content_type: str) -> None:
        self._ensure_bucket()
        self._client.put_object(
            self._bucket,
            key,
            BytesIO(data),
            length=len(data),
            content_type=content_type,
        )

    def delete_object(self, key: str) -> None:
        self._client.remove_object(self._bucket, key)


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------
def get_storage_client() -> StorageClient:
    """Return the storage client configured by STORAGE_BACKEND."""
    backend = settings.storage_backend.lower()
    if backend == "minio":
        return MinioStorageClient()
    if backend == "cos":
        return CosStorageClient()
    raise ValueError(f"Unknown STORAGE_BACKEND: {backend!r}  (use 'cos' or 'minio')")
