from qcloud_cos import CosConfig, CosS3Client
from config import settings


def get_cos_client() -> CosS3Client:
    config = CosConfig(
        Region=settings.cos_region,
        SecretId=settings.cos_secret_id,
        SecretKey=settings.cos_secret_key,
        Scheme="https",
    )
    return CosS3Client(config)


def ensure_bucket(client: CosS3Client):
    """Check if the COS bucket exists; create if missing."""
    try:
        client.head_bucket(Bucket=settings.cos_bucket)
    except Exception:
        client.create_bucket(Bucket=settings.cos_bucket)
