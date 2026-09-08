from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
EVENTS = ROOT / "public/assets/img/events-slider"
QR = ROOT / "public/assets/img/qr"
OUTPUT = ROOT.parent / "output/print"

DPI = 300
TRIM_WIDTH = 3543  # 30 cm at 300 dpi
OUTER_MARGIN = 236  # doubled 1 cm print field: 2 cm on every side
BURGUNDY = "#850305"
PAPER = "#F8F4ED"
CHEESE_TRIM_BACKGROUND = "#430D0C"
SAINTS_TRIM_BACKGROUND = "#B5C6D6"


def add_shadowed_qr(
    poster: Image.Image,
    qr_name: str,
    card_size: int,
    position: tuple[int, int],
) -> None:
    # The old 23 px card padding is halved. The encoder's own quiet zone is
    # retained because it is required for reliable scanning.
    padding = 12
    qr_size = card_size - padding * 2
    qr = Image.open(QR / qr_name).convert("RGBA").resize(
        (qr_size, qr_size), Image.Resampling.NEAREST
    )

    card = Image.new("RGBA", (card_size, card_size), PAPER)
    card.alpha_composite(qr, (padding, padding))

    shadow_pad = 42
    shadow = Image.new("RGBA", (card_size + shadow_pad * 2, card_size + shadow_pad * 2))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rectangle(
        (shadow_pad, shadow_pad, shadow_pad + card_size, shadow_pad + card_size),
        fill=(35, 18, 13, 105),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))

    x, y = position
    poster.alpha_composite(shadow, (x - shadow_pad + 14, y - shadow_pad + 18))
    poster.alpha_composite(card, (x, y))


def add_crop_marks(
    sheet: Image.Image,
    trim_width: int,
    trim_height: int,
    mark_color: str,
) -> None:
    draw = ImageDraw.Draw(sheet)
    left = OUTER_MARGIN
    top = OUTER_MARGIN
    right = left + trim_width
    bottom = top + trim_height
    gap = 24
    length = 118
    line_width = 4

    for x, direction in ((left, -1), (right, 1)):
        for y in (top, bottom):
            draw.line(
                (x + direction * gap, y, x + direction * (gap + length), y),
                fill=mark_color,
                width=line_width,
            )
    for y, direction in ((top, -1), (bottom, 1)):
        for x in (left, right):
            draw.line(
                (x, y + direction * gap, x, y + direction * (gap + length)),
                fill=mark_color,
                width=line_width,
            )


def print_sheet(
    poster: Image.Image,
    output_name: str,
    trim_background: str,
    mark_color: str,
) -> None:
    trim_width, trim_height = poster.size
    sheet = Image.new(
        "RGB",
        (trim_width + OUTER_MARGIN * 2, trim_height + OUTER_MARGIN * 2),
        trim_background,
    )
    sheet.paste(poster.convert("RGB"), (OUTER_MARGIN, OUTER_MARGIN))
    add_crop_marks(sheet, trim_width, trim_height, mark_color)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT / output_name, dpi=(DPI, DPI), quality=96, subsampling=0)


def cheese_week() -> None:
    source = Image.open(EVENTS / "cheese-week-2026.png").convert("RGBA")
    trim_height = round(TRIM_WIDTH * source.height / source.width)
    poster = source.resize((TRIM_WIDTH, trim_height), Image.Resampling.LANCZOS)

    # 18.5% of the trimmed poster height. The card starts near the centre of
    # the lowest glass sphere and covers its lower-right sector.
    card_size = round(trim_height * 0.185)
    card_x = TRIM_WIDTH - card_size - 92
    # Align the card's lower edge with the poster's lower thin cream frame.
    lower_inner_frame_y = round(trim_height * (1415 / 1450))
    card_y = lower_inner_frame_y - card_size
    add_shadowed_qr(
        poster,
        "cheese-week-2026-850305.png",
        card_size,
        (card_x, card_y),
    )
    print_sheet(
        poster,
        "cheese-week-2026-poster-300dpi.png",
        CHEESE_TRIM_BACKGROUND,
        PAPER,
    )


def saints_days() -> None:
    source = Image.open(EVENTS / "saints-cosmas-damian-days-2026.jpeg").convert("RGBA")
    trim_height = round(TRIM_WIDTH * source.height / source.width)
    poster = source.resize((TRIM_WIDTH, trim_height), Image.Resampling.LANCZOS)

    # The card sits to the right of the final sentence. Its right edge follows
    # the frame while the soft shadow crosses the frame and corner ornament.
    card_size = round(trim_height * 0.15)
    card_x = TRIM_WIDTH - card_size - 30
    card_y = trim_height - card_size - 42
    add_shadowed_qr(
        poster,
        "saints-cosmas-damian-days-2026-850305.png",
        card_size,
        (card_x, card_y),
    )
    print_sheet(
        poster,
        "saints-cosmas-damian-days-2026-poster-300dpi.png",
        SAINTS_TRIM_BACKGROUND,
        BURGUNDY,
    )


if __name__ == "__main__":
    cheese_week()
    saints_days()
