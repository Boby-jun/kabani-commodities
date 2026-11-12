"""One-off helper: turns Natural Earth TopoJSON (public domain, via the `world-atlas` npm
package, ISC licence) into projected SVG country paths for the sourcing map.

Usage:  python3 -I make_map.py path/to/countries-50m.json

Writes map_paths.json next to this file. You only need to re-run it to change the map
geometry; adding sourcing countries is done in sources.json (see build.py).
"""
import json, math, os, sys

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "map_paths.json")
WIDTH = 1000.0
A1, A2, A3, A4 = 1.340264, -0.081106, 0.000893, 0.003796


def equal_earth(lon, lat):
    lam, phi = math.radians(lon), math.radians(lat)
    th = math.asin(math.sqrt(3) / 2 * math.sin(phi))
    t2, t6 = th * th, th ** 6
    x = 2 * math.sqrt(3) * lam * math.cos(th) / (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1))
    y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
    return x, y


topo = json.load(open(SRC))
sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]

# decode arcs (delta-encoded, quantised) to lon/lat
arcs = []
for arc in topo["arcs"]:
    x = y = 0
    pts = []
    for dx, dy in arc:
        x += dx
        y += dy
        pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)


def ring(idx):
    pts = []
    for i in idx:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts


geoms = topo["objects"]["countries"]["geometries"]
skip = {"Antarctica"}

# projection bounds from everything we keep (so the viewBox hugs the inhabited world)
raw = []
for g in geoms:
    name = g["properties"]["name"]
    if name in skip or g.get("type") is None:
        continue
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
    raw.append((g, name, [[[equal_earth(*p) for p in ring(r)] for r in poly] for poly in polys]))

xs = [p[0] for _, _, polys in raw for poly in polys for r in poly for p in r]
ys = [p[1] for _, _, polys in raw for poly in polys for r in poly for p in r]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
k = WIDTH / (maxx - minx)
H = (maxy - miny) * k


def to_view(p):
    return round((p[0] - minx) * k, 1), round((maxy - p[1]) * k, 1)


def area(r):
    return abs(sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r)))) / 2


out = {}
for g, name, polys in raw:
    d = []
    best, best_area = None, -1
    for poly in polys:
        for ri, r in enumerate(poly):
            pts = []
            for p in r:
                q = to_view(p)
                if not pts or q != pts[-1]:
                    pts.append(q)
            if len(pts) < 3:
                continue
            if max(p[0] for p in pts) - min(p[0] for p in pts) > WIDTH / 2:
                continue  # ring wraps the antimeridian (e.g. Fiji); drawing it would streak across the map
            d.append("M" + "L".join(f"{x:g} {y:g}" for x, y in pts) + "Z")
            if ri == 0:
                a = area(pts)
                if a > best_area:
                    best_area, best = a, pts
    if not d:
        continue
    bx = [p[0] for p in best]
    by = [p[1] for p in best]
    out[name] = {"id": str(g.get("id", "")), "d": "".join(d), "bbox": [min(bx), min(by), max(bx), max(by)]}

json.dump({"width": WIDTH, "height": round(H, 1), "countries": out}, open(OUT, "w"), separators=(",", ":"))
print(f"{len(out)} countries, viewBox 0 0 {WIDTH:g} {H:.1f}, {os.path.getsize(OUT)//1024} KB -> {OUT}")
