import asyncio
import os
import tempfile
from io import BytesIO
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont
from app.utils.time_utils import sg_time_now
from loguru import logger

W, H = 1080, 1920

BG = (13, 17, 23)
PRIMARY = (255, 255, 255)
MUTED = (139, 148, 158)
ACCENT = (88, 166, 255)
GREEN = (63, 185, 80)
RED = (248, 81, 73)

# font paths
_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def _font(path: str, size: int) -> ImageFont.FreeTypeFont:
    fallbacks = [
        path,  # Linux / Railway (DejaVu)
        "C:/Windows/Fonts/arialbd.ttf",  # Windows Bold
        "C:/Windows/Fonts/arial.ttf",  # Windows Regular
        "C:/Windows/Fonts/calibrib.ttf",  # Windows Bold alt
        "C:/Windows/Fonts/calibri.ttf",  # Windows Regular alt
    ]
    for p in fallbacks:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    logger.warning("[VIDEO_BUILDER] No TrueType font found, text will be tiny")
    return ImageFont.load_default()
    """
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        logger.warning(f"[VIDEO_BUILDER] Font not found at {path}, using default")
        return ImageFont.load_default()
    """


def _build_graphic(
    ticker: str,
    price: float | None,
    change_pct: float | None,
) -> bytes:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw.rectangle([(0, 0), (W, 8)], fill=ACCENT)

    draw.text((60, 70), "MarketBuddy", font=_font(_REG, 42), fill=MUTED)

    date_str = sg_time_now().strftime("%b %d, %Y")
    draw.text((W - 60, 70), date_str, font=_font(_REG, 42), fill=MUTED, anchor="ra")

    draw.text(
        (W // 2, H // 2 - 160),
        ticker.upper(),
        font=_font(_BOLD, 200),
        fill=PRIMARY,
        anchor="mm",
    )

    if price is not None:
        draw.text(
            (W // 2, H // 2 + 40),
            f"Opening Price: ${price:,.2f}",
            font=_font(_BOLD, 90),
            fill=PRIMARY,
            anchor="mm",
        )

    # change %
    if change_pct is not None:
        sign = "+" if change_pct >= 0 else ""
        colour = GREEN if change_pct >= 0 else RED
        draw.text(
            (W // 2, H // 2 + 180),
            f"Change: {sign}{change_pct:.2f}% today",
            font=_font(_REG, 60),
            fill=colour,
            anchor="mm",
        )

    draw.text(
        (W // 2, H - 100),
        "Daily Summary",
        font=_font(_REG, 44),
        fill=MUTED,
        anchor="mm",
    )

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _run_ffmpeg(image_bytes: bytes, audio_bytes: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        img_path = os.path.join(tmp, "card.png")
        audio_path = os.path.join(tmp, "audio.mp3")
        out_path = os.path.join(tmp, "output.mp4")

        Path(img_path).write_bytes(image_bytes)
        Path(audio_path).write_bytes(audio_bytes)

        def _run():
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-loop",
                    "1",
                    "-i",
                    img_path,
                    "-i",
                    audio_path,
                    "-c:v",
                    "libx264",
                    "-c:a",
                    "aac",
                    "-pix_fmt",
                    "yuv420p",
                    "-shortest",
                    out_path,
                ],
                capture_output=True,
            )
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg failed:\n{result.stderr.decode()}")
            return Path(out_path).read_bytes()

        return await asyncio.to_thread(_run)


async def build_video(
    ticker: str,
    audio_bytes: bytes,
    price: float | None = None,
    change_pct: float | None = None,
) -> bytes:
    """
    Full pipeline: Pillow card → FFmpeg encode → mp4 bytes.
    price and change_pct are optional — card still renders without them.
    """
    logger.info(f"[VIDEO_BUILDER] Building video for {ticker}")
    image_bytes = await asyncio.to_thread(_build_graphic, ticker, price, change_pct)
    video_bytes = await _run_ffmpeg(image_bytes, audio_bytes)
    logger.success(f"[VIDEO_BUILDER] {ticker} done — {len(video_bytes):,} bytes")
    return video_bytes
