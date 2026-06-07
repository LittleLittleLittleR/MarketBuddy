import asyncio
import os
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path
import json
from datetime import date as date_type

import yfinance as yf
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.figure import Figure
import matplotlib.ticker as mticker
from PIL import Image, ImageDraw, ImageFont
from loguru import logger
from app.utils.time_utils import sg_time_now

W, H = 1080, 1920

PRIMARY = (255, 255, 255)
MUTED = (180, 180, 180)
ACCENT = (88, 166, 255)
GREEN = (63, 185, 80)
RED = (248, 81, 73)

ASSETS = Path(__file__).parent.parent / "assets"
BG_IMAGE = ASSETS / "bg.jpg"
FONTS_DIR = ASSETS / "fonts"


def _font(variant: str, size: int) -> ImageFont.FreeTypeFont:
    win_map = {
        "Bold": "C:/Windows/Fonts/arialbd.ttf",
        "SemiBold": "C:/Windows/Fonts/arialbd.ttf",
        "Regular": "C:/Windows/Fonts/arial.ttf",
    }
    for path in [FONTS_DIR / f"Montserrat-{variant}.ttf", win_map.get(variant, "")]:
        try:
            return ImageFont.truetype(str(path), size)
        except (OSError, TypeError):
            continue
    logger.warning(f"[VIDEO_BUILDER] Font {variant} not found! Using defaults...")
    return ImageFont.load_default()


def _load_bg(overlay_alpha: int = 140) -> Image.Image:
    try:
        bg = Image.open(BG_IMAGE).convert("RGBA").resize((W, H), Image.LANCZOS)
    except FileNotFoundError:
        logger.warning("[VIDEO_BUILDER] bg.jpg not found, using solid background")
        bg = Image.new("RGBA", (W, H), (10, 12, 18, 255))

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, overlay_alpha))
    return Image.alpha_composite(bg, overlay)


def _build_info_scene(
    ticker: str,
    open_p: float | None,
    close_p: float | None,
    high_p: float | None,
    low_p: float | None,
    change_pct: float | None,
    trading_date: date_type | None,  # last trading day
) -> bytes:
    img = _load_bg(overlay_alpha=130)
    shapes = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shapes)

    badge = None
    if change_pct is not None:
        sign = "+" if change_pct >= 0 else ""
        colour = GREEN if change_pct >= 0 else RED
        bw, bh = 260, 64
        bx, by = (W - bw) // 2, H // 2 - 190
        sdraw.rounded_rectangle(
            [(bx, by), (bx + bw, by + bh)],
            radius=32,
            fill=(*colour, 40),
            outline=(*colour, 200),
            width=2,
        )
        badge = (by, bh, sign, colour)

    gx1, gx2 = 70, W - 70
    gy1, gy2 = H // 2 - 80, H // 2 + 380
    mid_x, mid_y = W // 2, (gy1 + gy2) // 2
    cells = [
        ("OPEN", open_p, gx1, gy1, mid_x, mid_y, PRIMARY),
        ("CLOSE", close_p, mid_x, gy1, gx2, mid_y, PRIMARY),
        ("HIGH", high_p, gx1, mid_y, mid_x, gy2, GREEN),
        ("LOW", low_p, mid_x, mid_y, gx2, gy2, RED),
    ]
    pad = 10
    for _l, _v, x1, y1, x2, y2, _c in cells:
        sdraw.rounded_rectangle(
            [(x1 + pad, y1 + pad), (x2 - pad, y2 - pad)],
            radius=20,
            fill=(255, 255, 255, 18),
            outline=(255, 255, 255, 40),
            width=1,
        )

    img = Image.alpha_composite(img, shapes)

    # for all the opaque texts
    draw = ImageDraw.Draw(img)

    draw.text(
        (W // 2, 110),
        "MarketBuddy",
        font=_font("Regular", 38),
        fill=(*MUTED, 200),
        anchor="mm",
    )

    # show the actual trading date, not today, indicate if stale
    if trading_date is not None:
        today = sg_time_now().date()
        date_str = trading_date.strftime("%b %d, %Y")
        is_stale = trading_date < today
        draw.text(
            (W // 2, 165),
            date_str,
            font=_font("Regular", 30),
            fill=(*MUTED, 140),
            anchor="mm",
        )
        if is_stale:
            draw.text(
                (W // 2, 205),
                "(last trading session)",
                font=_font("Regular", 24),
                fill=(*MUTED, 90),
                anchor="mm",
            )
    else:
        draw.text(
            (W // 2, 165),
            sg_time_now().strftime("%b %d, %Y"),
            font=_font("Regular", 30),
            fill=(*MUTED, 140),
            anchor="mm",
        )

    draw.text(
        (W // 2, H // 2 - 290),
        ticker.upper(),
        font=_font("Bold", 160),
        fill=(*PRIMARY, 255),
        anchor="mm",
    )

    if badge is not None:
        by, bh, sign, colour = badge
        draw.text(
            (W // 2, by + bh // 2),
            f"{sign}{change_pct:.2f}%",
            font=_font("SemiBold", 34),
            fill=(*colour, 255),
            anchor="mm",
        )

    for label, value, x1, y1, x2, y2, val_colour in cells:
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        draw.text(
            (cx, cy - 35),
            label,
            font=_font("Regular", 28),
            fill=(*MUTED, 170),
            anchor="mm",
        )
        val_str = f"${value:,.2f}" if value is not None else "—"
        draw.text(
            (cx, cy + 32),
            val_str,
            font=_font("Bold", 54),
            fill=(*val_colour, 255),
            anchor="mm",
        )

    buf = BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


def _build_chart_scene(
    df,
    ticker: str,
    subtitle: str,  # for date string
    is_positive: bool,
) -> bytes:
    img = _load_bg(overlay_alpha=155)
    draw = ImageDraw.Draw(img)

    draw.text(
        (W // 2, 120),
        ticker.upper(),
        font=_font("Bold", 80),
        fill=(*PRIMARY, 255),
        anchor="mm",
    )
    draw.text(
        (W // 2, 210),
        subtitle,
        font=_font("Regular", 38),
        fill=(*MUTED, 200),
        anchor="mm",
    )

    if df is not None and not df.empty:
        line_col = "#3fb950" if is_positive else "#f85149"
        fill_col = "#3fb95020" if is_positive else "#f8514920"

        chart_w = W - 80
        chart_h = H - 340 - 160
        dpi = 100

        fig = Figure(figsize=(chart_w / dpi, chart_h / dpi), dpi=dpi)
        canvas = FigureCanvasAgg(fig)
        ax = fig.add_subplot(111)

        fig.patch.set_alpha(0)
        ax.set_facecolor("none")

        prices = df["Close"].dropna()
        xs = range(len(prices))
        ax.plot(prices.values, color=line_col, linewidth=3.5, zorder=3)
        ax.fill_between(
            xs, prices.values, prices.values.min(), color=fill_col, zorder=2
        )

        for spine in ax.spines.values():
            spine.set_visible(False)
        ax.tick_params(colors="white", labelsize=24, length=0)
        ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("$%.0f"))
        ax.set_xticks([])
        ax.yaxis.tick_right()

        fig.tight_layout(pad=0.4)
        canvas.draw()

        chart_buf = BytesIO()
        fig.savefig(
            chart_buf,
            format="png",
            transparent=True,
            bbox_inches="tight",
            pad_inches=0.15,
        )
        chart_buf.seek(0)

        chart_img = (
            Image.open(chart_buf)
            .convert("RGBA")
            .resize((chart_w, chart_h), Image.LANCZOS)
        )
        img.paste(chart_img, (40, 270), chart_img)
        draw = ImageDraw.Draw(img)

    else:
        draw.text(
            (W // 2, H // 2),
            "Chart unavailable",
            font=_font("Regular", 40),
            fill=(*MUTED, 160),
            anchor="mm",
        )

    draw.text(
        (W // 2, H - 80),
        "MarketBuddy · Daily Brief",
        font=_font("Regular", 30),
        fill=(*MUTED, 120),
        anchor="mm",
    )

    buf = BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


async def _fetch_stock_data(ticker: str) -> dict:
    def _pull():
        t = yf.Ticker(ticker)
        return (
            t.history(period="5d"),
            t.history(period="5d", interval="5m"),
            t.history(period="5d", interval="1h"),
        )

    result = {
        "open": None,
        "high": None,
        "low": None,
        "close": None,
        "change_pct": None,
        "chart_1d": None,
        "chart_5d": None,
        "trading_date": None,
        "chart_1d_date": None,
        "chart_5d_range": None,
    }

    try:
        daily, chart_1d, chart_5d = await asyncio.to_thread(_pull)

        # filter chart_1d to the last available trading session only.
        # with period="5d" this always reaches Friday even on weekends/Monday.
        if not chart_1d.empty:
            last_date = chart_1d.index[-1].date()
            chart_1d = chart_1d[chart_1d.index.date == last_date]
            result["chart_1d_date"] = last_date  # e.g. date(2026, 6, 6)

        result["chart_1d"] = chart_1d

        if not chart_5d.empty:
            first_date = chart_5d.index[0].date()
            last_date_5d = chart_5d.index[-1].date()
            if first_date == last_date_5d:
                result["chart_5d_range"] = first_date.strftime("%b %d")
            else:
                result["chart_5d_range"] = (
                    f"{first_date.strftime('%b %d')} – {last_date_5d.strftime('%b %d')}"
                )

        result["chart_5d"] = chart_5d

        if not daily.empty:
            valid = daily.dropna(subset=["Open", "Close"])
            if not valid.empty:
                row = valid.iloc[-1]
                result["open"] = float(row["Open"])
                result["high"] = float(row["High"])
                result["low"] = float(row["Low"])
                result["close"] = float(row["Close"])
                result["trading_date"] = valid.index[
                    -1
                ].date()  # <-- actual trading day
                if result["open"] > 0:
                    result["change_pct"] = round(
                        (result["close"] - result["open"]) / result["open"] * 100, 2
                    )

    except Exception as e:
        logger.warning(f"[VIDEO_BUILDER] yfinance fetch failed for {ticker}: {e}")

    return result


async def _run_ffmpeg(s1: bytes, s2: bytes, s3: bytes, audio: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        paths = {
            "s1": os.path.join(tmp, "s1.png"),
            "s2": os.path.join(tmp, "s2.png"),
            "s3": os.path.join(tmp, "s3.png"),
            "audio": os.path.join(tmp, "audio.mp3"),
            "out": os.path.join(tmp, "output.mp4"),
        }
        Path(paths["s1"]).write_bytes(s1)
        Path(paths["s2"]).write_bytes(s2)
        Path(paths["s3"]).write_bytes(s3)
        Path(paths["audio"]).write_bytes(audio)

        def _run():
            probe = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "quiet",
                    "-print_format",
                    "json",
                    "-show_format",
                    paths["audio"],
                ],
                capture_output=True,
            )
            duration = float(json.loads(probe.stdout)["format"]["duration"])

            offset1 = round(duration / 3, 2)
            offset2 = round(2 * duration / 3, 2)
            t_each = int(duration / 3) + 10

            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-loop",
                    "1",
                    "-t",
                    str(t_each),
                    "-i",
                    paths["s1"],
                    "-loop",
                    "1",
                    "-t",
                    str(t_each),
                    "-i",
                    paths["s2"],
                    "-loop",
                    "1",
                    "-t",
                    str(t_each),
                    "-i",
                    paths["s3"],
                    "-i",
                    paths["audio"],
                    "-filter_complex",
                    f"[0:v][1:v]xfade=transition=fade:duration=1:offset={offset1}[v01];"
                    f"[v01][2:v]xfade=transition=fade:duration=1:offset={offset2}[v]",
                    "-map",
                    "[v]",
                    "-map",
                    "3:a",
                    "-c:v",
                    "libx264",
                    "-c:a",
                    "aac",
                    "-pix_fmt",
                    "yuv420p",
                    "-shortest",
                    paths["out"],
                ],
                capture_output=True,
            )

            if result.returncode != 0:
                raise RuntimeError(
                    f"[VIDEO_BUILDER] FFmpeg failed:\n{result.stderr.decode()}"
                )
            return Path(paths["out"]).read_bytes()

        return await asyncio.to_thread(_run)


async def build_video(ticker: str, audio_bytes: bytes) -> bytes:
    """
    pipeline:
      - Fetches OHLC + chart data from yfinance
      - Scene 1: professional OHLC info card     (0–6s)
      - Scene 2: day chart (5m interval)         (7–13s)
      - Scene 3: week chart (1h interval)        (13–20s)
      - FFmpeg composes with xfade transitions
    """
    logger.info(f"[VIDEO_BUILDER] Starting {ticker}")

    data = await _fetch_stock_data(ticker)
    is_positive = (data["change_pct"] or 0) >= 0

    td = data["trading_date"]
    d1 = data["chart_1d_date"]
    d5 = data["chart_5d_range"]

    subtitle_1d = d1.strftime("%b %d") if d1 else "Today"
    subtitle_5d = d5 if d5 else "This Week"

    scene1 = await asyncio.to_thread(
        _build_info_scene,
        ticker,
        data["open"],
        data["close"],
        data["high"],
        data["low"],
        data["change_pct"],
        td,  # trading_date
    )
    scene2 = await asyncio.to_thread(
        _build_chart_scene,
        data["chart_1d"],
        ticker,
        subtitle_1d,
        is_positive,
    )
    scene3 = await asyncio.to_thread(
        _build_chart_scene,
        data["chart_5d"],
        ticker,
        subtitle_5d,
        is_positive,
    )

    video_bytes = await _run_ffmpeg(scene1, scene2, scene3, audio_bytes)
    logger.success(f"[VIDEO_BUILDER] {ticker} done — {len(video_bytes):,} bytes")
    return video_bytes
