from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Storage backend: "cos" (Tencent COS) or "minio"
    storage_backend: str = "cos"

    # Tencent COS settings
    cos_secret_id: str = ""
    cos_secret_key: str = ""
    cos_region: str = "ap-guangzhou"
    cos_bucket: str = "leehwui-photo-dev-1253272222"
    cos_cdn_url: str = ""  # e.g. https://cdn-leehwui-photo.tangerinesoft.cn

    # MinIO settings
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "tangerine-photos"
    minio_secure: bool = False

    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = "mysql_root_secret"
    db_name: str = "tangerine_photo"

    secret_key: str = "tangerine-photo-secret-key-change-in-production"
    admin_username: str = "admin"
    admin_password: str = "admin123"

    host: str = "0.0.0.0"
    port: int = 8090

    access_token_expire_minutes: int = 60 * 24  # 24 hours

    @property
    def public_url(self) -> str:
        """Return the base public URL for serving uploaded files."""
        if self.storage_backend == "minio":
            protocol = "https" if self.minio_secure else "http"
            return f"{protocol}://{self.minio_endpoint}/{self.minio_bucket}"
        # COS: prefer CDN if configured
        if self.cos_cdn_url:
            return self.cos_cdn_url.rstrip("/")
        return f"https://{self.cos_bucket}.cos.{self.cos_region}.myqcloud.com"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            "?charset=utf8mb4"
        )

    class Config:
        env_file = ".env"


settings = Settings()
