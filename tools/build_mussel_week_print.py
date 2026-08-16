from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/Users/edwardole/.codex/generated_images/019fe5a0-4a1a-7513-a311-19dc088ff297/exec-8b24f4e0-87f0-4c8d-93cd-995055517cac.png")
QR = ROOT / "site-v2/public/assets/img/qr/mussel-week-qr-850305.png"
OUTPUT = ROOT / "artifacts/mussel-week-a4-landscape-print-300dpi.png"

# A4 landscape at 300 dpi. A 3 mm bleed surrounds the trim, and another
# 3 mm white printer margin carries the crop marks.
TRIM_W, TRIM_H = 3508, 2480
BLEED = 35
MARK_MARGIN = 35
TRIM_X = BLEED + MARK_MARGIN
TRIM_Y = BLEED + MARK_MARGIN
CANVAS_W = TRIM_W + 2 * (BLEED + MARK_MARGIN)
CANVAS_H = TRIM_H + 2 * (BLEED + MARK_MARGIN)


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    source = Image.open(SOURCE).convert("RGB")
    source = ImageEnhance.Contrast(source).enhance(1.025)
    source = source.filter(ImageFilter.UnsharpMask(radius=1.4, percent=115, threshold=3))

    bleed_size = (TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED)
    artwork = cover(source, bleed_size)

    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), "white")
    canvas.paste(artwork, (MARK_MARGIN, MARK_MARGIN))

    # The QR is placed where the wine glass was removed. Its own quiet zone is
    # preserved on a warm ivory patch sampled to match the poster background.
    qr = Image.open(QR).convert("RGBA").resize((520, 520), Image.Resampling.NEAREST)
    qr_x = TRIM_X + 2640
    qr_y = TRIM_Y + 145
    patch_pad = 15
    patch_color = (248, 245, 240)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (qr_x - patch_pad, qr_y - patch_pad, qr_x + 520 + patch_pad, qr_y + 520 + 76),
        radius=18,
        fill=patch_color,
    )
    canvas.paste(qr, (qr_x, qr_y), qr)

    address = "Brīvības iela 37, Rīgā"
    font = ImageFont.truetype(
        "/System/Library/Fonts/Supplemental/Didot.ttc",
        34,
        index=0,
    )
    bbox = draw.textbbox((0, 0), address, font=font)
    address_x = qr_x + 260 - (bbox[2] - bbox[0]) / 2
    address_y = qr_y + 535
    draw.text((address_x, address_y), address, font=font, fill=(133, 3, 5))

    # Crop marks align to the final A4 trim box and stay outside the bleed.
    mark = 25
    gap = 7
    line = (35, 35, 35)
    width = 2
    x0, y0 = TRIM_X, TRIM_Y
    x1, y1 = TRIM_X + TRIM_W, TRIM_Y + TRIM_H
    for x, direction in ((x0, -1), (x1, 1)):
        draw.line((x, y0 - BLEED - gap, x, y0 - BLEED - gap - mark), fill=line, width=width)
        draw.line((x, y1 + BLEED + gap, x, y1 + BLEED + gap + mark), fill=line, width=width)
        draw.line((x, y0 - BLEED - gap, x + direction * mark, y0 - BLEED - gap), fill=line, width=width)
        draw.line((x, y1 + BLEED + gap, x + direction * mark, y1 + BLEED + gap), fill=line, width=width)
    for y, direction in ((y0, -1), (y1, 1)):
        draw.line((x0 - BLEED - gap, y, x0 - BLEED - gap - mark, y), fill=line, width=width)
        draw.line((x1 + BLEED + gap, y, x1 + BLEED + gap + mark, y), fill=line, width=width)
        draw.line((x0 - BLEED - gap, y, x0 - BLEED - gap, y + direction * mark), fill=line, width=width)
        draw.line((x1 + BLEED + gap, y, x1 + BLEED + gap, y + direction * mark), fill=line, width=width)

    # An indexed adaptive palette keeps the press-ready PNG below 5 MB while
    # retaining photographic gradients and crisp QR modules.
    indexed = canvas.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    indexed.save(OUTPUT, format="PNG", optimize=True, compress_level=9, dpi=(300, 300))
    print(OUTPUT)


if __name__ == "__main__":
    main()
