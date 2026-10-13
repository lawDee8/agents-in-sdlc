"""Print-ready QR code and table cards for Tagliato Fine.

Developer tool only (never upload tools/ or qr/ to the site).

    python3 tools/make-qr.py https://example.fr/

Needs: pip install segno reportlab fonttools brotli
Writes to qr/:
    qr-code.svg                     vector QR, black on white, for any designer or printer
    qr-code.png                     same, 2400 px, for Word/Canva
    cartes-table-A4-clair.pdf       4 table cards per A4, cream (ink-saving)
    cartes-table-A4-sombre.pdf      4 table cards per A4, black and gold (brand screens)

The URL inside a printed QR can never change. Use the final address only.
"""

import sys
import tempfile
from pathlib import Path

import segno
from fontTools.ttLib import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "qr"

# Card trim size, bleed and layout on A4 (2 x 2).
CARD_W, CARD_H = 95 * mm, 138 * mm
BLEED = 2 * mm
QR_SIZE = 46 * mm           # modules only; the cream panel adds the quiet zone
PANEL = 60 * mm
ERROR_LEVEL = "h"           # 30 % damage tolerance: coffee stains, scratches

GOLD = HexColor("#C9A44C")
THEMES = {
    "clair": {"bg": HexColor("#F7F3EC"), "text": HexColor("#2B2418"), "muted": HexColor("#5C5243"),
              "accent": HexColor("#7A5E1F"), "panel": HexColor("#FFFFFF"), "ink": HexColor("#000000")},
    "sombre": {"bg": HexColor("#0F0E0D"), "text": HexColor("#EFE6CF"), "muted": HexColor("#B5AC98"),
               "accent": HexColor("#E6CF8A"), "panel": HexColor("#FFFFFF"), "ink": HexColor("#000000")},
}


def register_fonts(tmp):
    """reportlab needs TTF: convert the site's self-hosted woff2 (OFL allows embedding)."""
    fonts = {
        "Cormorant-Medium": "cormorant-garamond-latin-500-normal.woff2",
        "Cormorant-Italic": "cormorant-garamond-latin-500-italic.woff2",
        "Cormorant-SemiBold": "cormorant-garamond-latin-600-normal.woff2",
        "Pinyon": "pinyon-script-latin-400-normal.woff2",
    }
    for name, file in fonts.items():
        font = TTFont(str(ROOT / "fonts" / file))
        font.flavor = None
        ttf = Path(tmp) / f"{name}.ttf"
        font.save(str(ttf))
        pdfmetrics.registerFont(RLFont(name, str(ttf)))


def draw_qr(c, qr, x, y, size, color):
    """Draw QR modules as vector squares (no quiet zone; caller supplies it)."""
    matrix = [list(row) for row in qr.matrix]
    n = len(matrix)
    m = size / n
    c.setFillColor(color)
    for r, row in enumerate(matrix):
        col = 0
        while col < n:
            if row[col] & 1:
                start = col
                while col < n and row[col] & 1:
                    col += 1
                # Merge horizontal runs; tiny overlap avoids hairline gaps in some RIPs.
                c.rect(x + start * m, y + size - (r + 1) * m, (col - start) * m, m + 0.01, stroke=0, fill=1)
            else:
                col += 1


def draw_card(c, qr, x, y, t):
    """Card trim box at (x, y), bleed drawn around it."""
    c.setFillColor(t["bg"])
    c.rect(x - BLEED, y - BLEED, CARD_W + 2 * BLEED, CARD_H + 2 * BLEED, stroke=0, fill=1)

    # Double gold frame, a nod to the Art-Nouveau frames of the screens.
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.rect(x + 5 * mm, y + 5 * mm, CARD_W - 10 * mm, CARD_H - 10 * mm, stroke=1, fill=0)
    c.setLineWidth(0.4)
    c.rect(x + 6.5 * mm, y + 6.5 * mm, CARD_W - 13 * mm, CARD_H - 13 * mm, stroke=1, fill=0)

    cx = x + CARD_W / 2

    # TF monogram
    box = 13 * mm
    by = y + CARD_H - 13 * mm - box
    c.setFillColor(HexColor("#0F0E0D"))
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.7)
    c.rect(cx - box / 2, by, box, box, stroke=1, fill=1)
    c.setLineWidth(0.35)
    c.rect(cx - box / 2 + 1.1 * mm, by + 1.1 * mm, box - 2.2 * mm, box - 2.2 * mm, stroke=1, fill=0)
    c.setFillColor(HexColor("#E6CF8A"))
    c.setFont("Cormorant-SemiBold", 17)
    c.drawCentredString(cx, by + 4.1 * mm, "TF")

    c.setFillColor(t["text"])
    c.setFont("Cormorant-SemiBold", 24)
    c.drawCentredString(cx, by - 9 * mm, "Tagliato Fine")
    c.setFillColor(t["muted"])
    c.setFont("Cormorant-Italic", 12)
    c.drawCentredString(cx, by - 15 * mm, "Charcuterie · Pizzicheria")

    # QR on a white panel: dark-on-light is the only polarity every phone reads.
    py = y + 30 * mm
    c.setFillColor(t["panel"])
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    c.rect(cx - PANEL / 2, py, PANEL, PANEL, stroke=1, fill=1)
    draw_qr(c, qr, cx - QR_SIZE / 2, py + (PANEL - QR_SIZE) / 2, QR_SIZE, t["ink"])

    # Call to action: script accent + FR, then EN / IT.
    ty = py - 9 * mm
    c.setFillColor(t["accent"])
    c.setFont("Pinyon", 20)
    script = "Scannez"
    sw = pdfmetrics.stringWidth(script, "Pinyon", 20)
    rest = "pour voir la carte"
    rw = pdfmetrics.stringWidth(rest, "Cormorant-Medium", 14)
    space = 2.2 * mm  # the script "z" swash runs past its advance width
    start = cx - (sw + space + rw) / 2
    c.drawString(start, ty, script)
    c.setFillColor(t["text"])
    c.setFont("Cormorant-Medium", 14)
    c.drawString(start + sw + space, ty, rest)
    c.setFillColor(t["muted"])
    c.setFont("Cormorant-Italic", 10.5)
    c.drawCentredString(cx, ty - 6.5 * mm, "Scan for the menu · Inquadra per il menu")


def crop_marks(c, xs, ys):
    """Trim marks in the page margins, aligned to every trim line."""
    pw, ph = A4
    c.setStrokeColor(HexColor("#000000"))
    c.setLineWidth(0.25)
    for x in xs:
        c.line(x, 0.5 * mm, x, min(ys) - BLEED - 1 * mm)
        c.line(x, max(ys) + BLEED + 1 * mm, x, ph - 0.5 * mm)
    for y in ys:
        c.line(0.5 * mm, y, min(xs) - BLEED - 1 * mm, y)
        c.line(max(xs) + BLEED + 1 * mm, y, pw - 0.5 * mm, y)


def make_pdf(qr, url, theme, path):
    pw, ph = A4
    gap = 2 * BLEED
    total_w = 2 * CARD_W + gap
    total_h = 2 * CARD_H + gap
    x0 = (pw - total_w) / 2
    y0 = (ph - total_h) / 2
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle("Tagliato Fine — cartes de table QR")
    c.setAuthor("Tagliato Fine")
    c.setSubject(f"QR: {url} — imprimer à 100 % (taille réelle), couper sur les traits")
    for col in range(2):
        for row in range(2):
            draw_card(c, qr, x0 + col * (CARD_W + gap), y0 + row * (CARD_H + gap), THEMES[theme])
    xs = [x0, x0 + CARD_W, x0 + CARD_W + gap, x0 + 2 * CARD_W + gap]
    ys = [y0, y0 + CARD_H, y0 + CARD_H + gap, y0 + 2 * CARD_H + gap]
    crop_marks(c, xs, ys)
    c.showPage()
    c.save()


def main():
    if len(sys.argv) != 2 or not sys.argv[1].startswith("https://"):
        sys.exit("usage: python3 tools/make-qr.py https://final-address/")
    url = sys.argv[1]
    OUT.mkdir(exist_ok=True)
    qr = segno.make_qr(url, error=ERROR_LEVEL, boost_error=False)
    qr.save(str(OUT / "qr-code.svg"), scale=10, border=4, dark="#000000", light="#FFFFFF",
            title="Tagliato Fine", desc=url)
    n = qr.symbol_size(scale=1, border=4)[0]
    qr.save(str(OUT / "qr-code.png"), scale=max(1, 2400 // n), border=4)
    with tempfile.TemporaryDirectory() as tmp:
        register_fonts(tmp)
        for theme in THEMES:
            make_pdf(qr, url, theme, OUT / f"cartes-table-A4-{theme}.pdf")
    (OUT / "URL.txt").write_text(url + "\n")
    print(f"{url} -> version {qr.version}, level {qr.error}, {len(qr.matrix)} modules, "
          f"{QR_SIZE / mm / len(qr.matrix):.2f} mm/module on cards")


if __name__ == "__main__":
    main()
