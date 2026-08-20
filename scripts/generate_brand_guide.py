from pathlib import Path
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand" / "euno"
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
PDF = OUT / "euno-logo-guidelines.pdf"

W, H = A4
BLUE = HexColor("#3B82F6")
INK = HexColor("#111827")
MUTED = HexColor("#64748B")
PAPER = HexColor("#F8FAFC")


def icon(c, x, y, size, mode="orbit", blue=BLUE):
    s = size / 256
    c.saveState()
    c.translate(x, y)
    c.scale(s, s)
    c.setLineCap(1)
    c.setLineJoin(1)
    if mode == "orbit":
        c.setFillColor(blue)
        c.circle(128, 128, 112, fill=1, stroke=0)
        c.setStrokeColor(white); c.setLineWidth(22)
        for yy, end in ((78, 150), (128, 128), (178, 150)):
            c.line(75, yy, end, yy)
        c.setFillColor(white); c.circle(174, 128, 17, fill=1, stroke=0)
    elif mode == "converge":
        c.setStrokeColor(blue); c.setLineWidth(27)
        c.line(48, 61, 110, 61); c.bezier(110, 61, 136, 61, 142, 89, 162, 100)
        c.line(48, 128, 128, 128)
        c.line(48, 195, 110, 195); c.bezier(110, 195, 136, 195, 142, 167, 162, 156)
        c.setFillColor(blue); c.circle(187, 128, 28, fill=1, stroke=0)
        c.setFillColor(white); c.circle(187, 128, 10, fill=1, stroke=0)
    else:
        c.setStrokeColor(blue); c.setLineWidth(27)
        p = c.beginPath(); p.moveTo(177, 62); p.lineTo(95, 62); p.curveTo(65, 62, 45, 87, 45, 128); p.curveTo(45, 169, 65, 194, 95, 194); p.lineTo(177, 194); c.drawPath(p)
        c.line(76, 128, 158, 128)
        c.setFillColor(blue); c.circle(181, 128, 24, fill=1, stroke=0)
        c.setFillColor(white); c.circle(181, 128, 8, fill=1, stroke=0)
    c.restoreState()


def heading(c, text, y, size=24):
    c.setFillColor(INK); c.setFont("Helvetica-Bold", size); c.drawString(48, y, text)


c = canvas.Canvas(str(PDF), pagesize=A4)
c.setTitle("Euno Logo Guidelines")
c.setFillColor(PAPER); c.rect(0, 0, W, H, fill=1, stroke=0)
icon(c, 48, H - 180, 108)
c.setFillColor(INK); c.setFont("Helvetica-Bold", 34); c.drawString(174, H - 110, "Euno")
c.setFillColor(MUTED); c.setFont("Helvetica", 12); c.drawString(176, H - 132, "Logo system / 2026")
c.setStrokeColor(HexColor("#E2E8F0")); c.line(48, H - 208, W - 48, H - 208)
heading(c, "Three concept directions", H - 250, 19)
cards = [("A / ORBIT", "orbit", "Recommended - strongest at 16px"), ("B / CONVERGE", "converge", "Routes meet at one destination"), ("C / LOOP", "loop", "Most abstract continuous route")]
for i, (name, mode, note) in enumerate(cards):
    x = 48 + i * 168
    c.setFillColor(white); c.roundRect(x, H - 458, 148, 176, 16, fill=1, stroke=0)
    icon(c, x + 39, H - 390, 70, mode)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 10); c.drawString(x + 14, H - 414, name)
    c.setFillColor(MUTED); c.setFont("Helvetica", 7.5); c.drawString(x + 14, H - 432, note)
heading(c, "Production rules", H - 505, 19)
rules = ["Primary blue  #3B82F6", "Dark ink  #111827", "Clear space  25% of icon diameter", "Minimum icon  16px / 6mm", "Minimum lockup  120px / 32mm", "No arrows, sharp corners, shadows or distortion"]
for i, rule in enumerate(rules):
    x = 50 + (i % 2) * 255; y = H - 535 - (i // 2) * 28
    c.setFillColor(BLUE); c.circle(x, y + 2, 3, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("Helvetica", 9.5); c.drawString(x + 11, y - 1, rule)
c.setFillColor(HexColor("#0B1020")); c.roundRect(48, 58, W - 96, 142, 18, fill=1, stroke=0)
icon(c, 70, 82, 92)
c.setFillColor(white); c.setFont("Helvetica-Bold", 28); c.drawString(186, 123, "Euno")
c.setFont("Helvetica", 9); c.setFillColor(HexColor("#94A3B8")); c.drawString(187, 103, "Reverse lockup for dark navigation surfaces")
c.setFillColor(MUTED); c.setFont("Helvetica", 8); c.drawRightString(W - 48, 30, "Euno / Logo guidelines / 01")
c.showPage(); c.save()
print(PDF)
