"""Builds the browser-tab icons from the K-in-a-circle mark: favicon.svg, favicon.ico, apple-touch-icon.png, icon-192/512.png.
Run once (python3 -I make_favicon.py); needs Google Chrome for rasterising. Not part of build.py."""
import subprocess, os, struct, shutil, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
GREEN, CREAM = "#1F4D3A", "#F4F3EE"

def K(fg, cx, cy, h):
    sw = h * 0.2; top, bot = cy - h/2, cy + h/2; sx = cx - h*0.26; mid = cy + h*0.04
    ax, ay = cx + h*0.34, top + sw*0.15; lx, ly = cx + h*0.37, bot - sw*0.15
    segs = [(sx, top, sx, bot), (sx + sw*0.2, mid, ax, ay), (sx + sw*0.55, mid - sw*0.35, lx, ly)]
    d = "".join(f'<path d="M{a:.2f} {b:.2f}L{c:.2f} {e:.2f}"/>' for a, b, c, e in segs)
    return f'<g fill="none" stroke="{fg}" stroke-width="{sw:.2f}" stroke-linecap="butt" stroke-linejoin="miter">{d}</g>'

def svg(full_bleed=False):
    bg = f'<rect width="64" height="64" fill="{GREEN}"/>' if full_bleed else f'<circle cx="32" cy="32" r="32" fill="{GREEN}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{bg}'
            f'<circle cx="32" cy="32" r="24.5" fill="none" stroke="{CREAM}" stroke-width="3.6"/>' + K(CREAM, 32, 32, 27) + '</svg>')

open(os.path.join(HERE, "favicon.svg"), "w").write(svg())
tmp = tempfile.mkdtemp()
def raster(markup, size, out):
    page = os.path.join(tmp, "p.html")
    sized = markup.replace("<svg ", '<svg width="%d" height="%d" ' % (size, size))
    open(page, "w").write('<!doctype html><html><body style="margin:0;background:transparent"><div style="width:%dpx;height:%dpx">%s</div></body></html>' % (size, size, sized))
    subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--default-background-color=00000000", f"--window-size={size},{size}", f"--screenshot={out}", "file://" + page], capture_output=True, timeout=60)
big = os.path.join(tmp, "big.png")
raster(svg(), 512, big)
raster(svg(True), 512, os.path.join(tmp, "touch.png"))
def scaled(src, n, out): subprocess.run(["sips", "-z", str(n), str(n), src, "--out", out], capture_output=True)
scaled(big, 192, os.path.join(HERE, "icon-192.png")); scaled(big, 512, os.path.join(HERE, "icon-512.png"))
scaled(os.path.join(tmp, "touch.png"), 180, os.path.join(HERE, "apple-touch-icon.png"))
pngs = []
for n in (16, 32, 48):
    p = os.path.join(tmp, f"{n}.png"); scaled(big, n, p); pngs.append((n, open(p, "rb").read()))
# ICO container with embedded PNGs
head = struct.pack("<HHH", 0, 1, len(pngs)); off = 6 + 16 * len(pngs); entries = b""; body = b""
for n, data in pngs:
    entries += struct.pack("<BBBBHHII", n, n, 0, 0, 1, 32, len(data), off + len(body)); body += data
open(os.path.join(HERE, "favicon.ico"), "wb").write(head + entries + body)
shutil.rmtree(tmp)
print("ok")
