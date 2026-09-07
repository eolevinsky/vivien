from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFilter
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/img/events-slider/chanterelle-week-2026.jpeg"
QR = ROOT / "public/assets/img/qr/chanterelle-week-2026-850305.svg"
OUTPUT = ROOT.parent / "output/pdf"
POSTER_PNG = OUTPUT / "chanterelle-week-2026-a5-300dpi.png"
POSTER_PDF = OUTPUT / "chanterelle-week-2026-a5-300dpi.pdf"
RASTERIZED_QR = ROOT.parent / "tmp/pdfs/chanterelle-week-2026-svg-render.png"

WIDTH, HEIGHT = 1748, 2480  # ISO A5 at 300 dpi (rounded to whole pixels)
BURGUNDY = "#850305"
CREAM = "#F3E9DC"


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def rasterize_svg(source: Path) -> Image.Image:
    """Render the supplied SVG verbatim; no QR regeneration or module editing."""
    RASTERIZED_QR.parent.mkdir(parents=True, exist_ok=True)
    chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    subprocess.run(
        [
            chrome,
            "--headless",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-sandbox",
            "--force-device-scale-factor=1",
            f"--screenshot={RASTERIZED_QR}",
            "--window-size=1800,1800",
            source.resolve().as_uri(),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    rendered = Image.open(RASTERIZED_QR).convert("RGBA")
    pixels = rendered.load()
    for y in range(rendered.height):
        for x in range(rendered.width):
            red, green, blue, alpha = pixels[x, y]
            if red > 250 and green > 250 and blue > 250:
                pixels[x, y] = (red, green, blue, 0)
            else:
                pixels[x, y] = (red, green, blue, alpha)
    return rendered


def add_crop_marks(poster: Image.Image) -> None:
    draw = ImageDraw.Draw(poster)
    offset = round(3 / 25.4 * 300)
    length = offset
    width = 4
    corners = [
        ((offset, offset), (offset + length, offset), (offset, offset + length)),
        ((WIDTH - offset, offset), (WIDTH - offset - length, offset), (WIDTH - offset, offset + length)),
        ((offset, HEIGHT - offset), (offset + length, HEIGHT - offset), (offset, HEIGHT - offset - length)),
        ((WIDTH - offset, HEIGHT - offset), (WIDTH - offset - length, HEIGHT - offset), (WIDTH - offset, HEIGHT - offset - length)),
    ]
    for corner, horizontal_end, vertical_end in corners:
        draw.line((corner, horizontal_end), fill=CREAM, width=width)
        draw.line((corner, vertical_end), fill=CREAM, width=width)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    poster = cover(Image.open(SOURCE).convert("RGB"), (WIDTH, HEIGHT)).convert("RGBA")

    # About 22% smaller overall than the previous card; this is the smallest
    # reliable size at which the supplied decorative SVG remains scannable.
    qr = rasterize_svg(QR).resize((420, 420), Image.Resampling.LANCZOS)
    card_margin = 17  # 30% less than the previous 24 px; equal on all sides.
    card = Image.new("RGBA", (qr.width + card_margin * 2, qr.height + card_margin * 2), CREAM)
    card.alpha_composite(qr, (card_margin, card_margin))

    x = 55
    y = 55
    shadow = Image.new("RGBA", poster.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rectangle(
        (x + 8, y + 10, x + card.width + 8, y + card.height + 10),
        fill=(0, 0, 0, 78),
    )
    poster.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))
    poster.alpha_composite(card, (x, y))
    add_crop_marks(poster)

    final = poster.convert("RGB")
    final.save(POSTER_PNG, dpi=(300, 300), optimize=True)

    pdf = canvas.Canvas(str(POSTER_PDF), pagesize=A5, pageCompression=1)
    pdf.setTitle("Brasserie Vivien - Chanterelle Week - 5-11 September 2026")
    pdf.setAuthor("Brasserie Vivien")
    pdf.drawImage(str(POSTER_PNG), 0, 0, width=A5[0], height=A5[1], mask="auto")
    pdf.showPage()
    pdf.save()


if __name__ == "__main__":
    main()
