from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
EVENTS = ROOT / "public/assets/img/events-slider"
QR = ROOT / "public/assets/img/qr"


def fitted_qr(path: Path, size: int, hole: int = 0) -> Image.Image:
    qr = Image.open(path).convert("RGBA").resize((size, size), Image.Resampling.NEAREST)
    if hole:
        mask = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(mask)
        center = size // 2
        draw.ellipse((center - hole // 2, center - hole // 2, center + hole // 2, center + hole // 2), fill=255)
        qr.putalpha(Image.composite(Image.new("L", (size, size), 0), qr.getchannel("A"), mask))
    return qr


def summer_farewell() -> None:
    poster = Image.open(EVENTS / "summer-farewell-2026-base.png").convert("RGBA")
    # The QR covers roughly one third of the central label's area. Its small
    # transparent spindle hole stays well inside the Q-level error budget.
    qr = fitted_qr(QR / "summer-farewell-2026-f3e9dc.png", 300, hole=18)
    x = (poster.width - qr.width) // 2
    y = (poster.height - qr.height) // 2
    poster.alpha_composite(qr, (x, y))
    poster.save(EVENTS / "summer-farewell-2026.png", optimize=True)


def knowledge_day() -> None:
    poster = Image.open(EVENTS / "knowledge-day-2026-base.jpeg").convert("RGBA")
    qr = fitted_qr(QR / "knowledge-day-2026-850305.png", 214)
    pad = 14
    card = Image.new("RGBA", (qr.width + pad * 2, qr.height + pad * 2), "#F3E9DC")
    card.alpha_composite(qr, (pad, pad))
    poster.alpha_composite(card, (poster.width - card.width - 28, 205))
    poster.convert("RGB").save(EVENTS / "knowledge-day-2026.jpeg", quality=94, optimize=True)


if __name__ == "__main__":
    summer_farewell()
    knowledge_day()
