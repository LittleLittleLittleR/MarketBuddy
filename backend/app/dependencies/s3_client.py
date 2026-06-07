import aioboto3
from loguru import logger
from app.config import settings

s3_session = aioboto3.Session()


async def upload_bytes(data: bytes, s3_key: str, content_type: str) -> str:
    """
    url = await upload_bytes(audio_bytes, "daily/AAPL/2026-06-03.mp3", "audio/mpeg")
    url = await upload_bytes(video_bytes, "daily/AAPL/2026-06-03.mp4", "video/mp4")
    """
    async with s3_session.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    ) as s3:
        await s3.put_object(
            Bucket=settings.S3_BUCKET,
            Key=s3_key,
            Body=data,
            ContentType=content_type,
        )

    logger.success(f"[S3] Uploaded → {s3_key}")
    return s3_key


async def get_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    """
    generate a temporary signed URL for a S3 vid.
    expires_in is in seconds — 3600 = valid for 1 hour.
    """
    async with s3_session.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    ) as s3:
        url = await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": s3_key},
            ExpiresIn=expires_in,
        )
    return url
