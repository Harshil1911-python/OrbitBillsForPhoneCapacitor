#!/usr/bin/env python3
"""Apply TechSerenia brand icon + splash into resources/ and android/res.

Looks for the master logo in this order:
  1) resources/icon.png
  2) scripts/icon.png
  3) concatenated scripts/icon.b64.* (optional)

Generates all Android mipmap sizes + splash (logo on brand blue #0b3d91).
"""
from __future__ import annotations
import base64, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent
BRAND = (11, 61, 145)  # #0b3d91

def write_bytes(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    print("wrote", path.relative_to(ROOT), len(data), "bytes")

def load_master_png() -> bytes:
    for p in (ROOT / "resources" / "icon.png", HERE / "icon.png", ROOT / "icon.png"):
        if p.is_file() and p.stat().st_size > 1000:
            print("using master icon:", p)
            return p.read_bytes()
    parts = []
    i = 0
    while True:
        c = HERE / f"icon.b64.{i}"
        if not c.is_file():
            break
        parts.append(c.read_text().strip())
        i += 1
    if parts:
        print("using scripts/icon.b64.* chunks")
        return base64.b64decode("".join(parts))
    single = HERE / "icon.b64"
    if single.is_file():
        return base64.b64decode(single.read_text().strip())
    raise SystemExit(
        "ERROR: No icon found.\n"
        "Upload your 1024x1024 PNG to: resources/icon.png\n"
        "GitHub → OrbitBillsForPhoneCapacitor → Add file → Upload files"
    )

def main():
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        os.system(f"{sys.executable} -m pip install pillow -q")
        from PIL import Image, ImageDraw

    import io
    raw = load_master_png()
    src = Image.open(io.BytesIO(raw)).convert("RGBA")
    src = src.resize((1024, 1024), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    src.save(buf, format="PNG", optimize=True)
    write_bytes(ROOT / "resources" / "icon.png", buf.getvalue())
    write_bytes(ROOT / "resources" / "logo.png", buf.getvalue())

    splash_size = 2048
    splash = Image.new("RGBA", (splash_size, splash_size), BRAND + (255,))
    logo = src.copy()
    px = logo.load()
    w, h = logo.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 235 and g > 235 and b > 235:
                px[x, y] = (r, g, b, 0)
    logo.thumbnail((int(splash_size * 0.42), int(splash_size * 0.42)), Image.Resampling.LANCZOS)
    x = (splash_size - logo.size[0]) // 2
    y = (splash_size - logo.size[1]) // 2
    splash.paste(logo, (x, y), logo)
    sbuf = io.BytesIO()
    splash.convert("RGB").save(sbuf, format="PNG", optimize=True)
    write_bytes(ROOT / "resources" / "splash.png", sbuf.getvalue())

    def fit_logo(logo_img, canvas_size, logo_ratio=0.66):
        canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        target = int(canvas_size * logo_ratio)
        lr = logo_img.copy()
        lr.thumbnail((target, target), Image.Resampling.LANCZOS)
        xx = (canvas_size - lr.size[0]) // 2
        yy = (canvas_size - lr.size[1]) // 2
        canvas.paste(lr, (xx, yy), lr)
        return canvas

    def with_white_bg(logo_img, size):
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        lr = logo_img.copy()
        target = int(size * 0.78)
        lr.thumbnail((target, target), Image.Resampling.LANCZOS)
        xx = (size - lr.size[0]) // 2
        yy = (size - lr.size[1]) // 2
        canvas.paste(lr, (xx, yy), lr)
        return canvas

    def round_mask(size):
        m = Image.new("L", (size, size), 0)
        d = ImageDraw.Draw(m)
        d.ellipse((0, 0, size - 1, size - 1), fill=255)
        return m

    sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for density, sz in sizes.items():
        folder = ROOT / "resources" / "android" / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)
        icon = with_white_bg(src, sz)
        icon.save(folder / "ic_launcher.png")
        rounded = icon.copy()
        rounded.putalpha(round_mask(sz))
        rounded.save(folder / "ic_launcher_round.png")
        fit_logo(src, sz, 0.66).save(folder / "ic_launcher_foreground.png")
        print("mipmap", density, sz)

    android_res = ROOT / "android" / "app" / "src" / "main" / "res"
    if android_res.is_dir():
        for density in sizes:
            src_dir = ROOT / "resources" / "android" / f"mipmap-{density}"
            dst_dir = android_res / f"mipmap-{density}"
            dst_dir.mkdir(parents=True, exist_ok=True)
            for name in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"):
                (dst_dir / name).write_bytes((src_dir / name).read_bytes())
            print("copied to", dst_dir)

        splash_img = Image.open(ROOT / "resources" / "splash.png").convert("RGB")
        drawable = android_res / "drawable"
        drawable.mkdir(parents=True, exist_ok=True)
        splash_img.resize((1080, 1080), Image.Resampling.LANCZOS).save(drawable / "splash.png")
        for dens, sz in (("mdpi", 320), ("hdpi", 480), ("xhdpi", 720), ("xxhdpi", 960), ("xxxhdpi", 1280)):
            ddir = android_res / f"drawable-{dens}"
            ddir.mkdir(parents=True, exist_ok=True)
            splash_img.resize((sz, sz), Image.Resampling.LANCZOS).save(ddir / "splash.png")
            print("splash drawable", dens, sz)

        anydpi = android_res / "mipmap-anydpi-v26"
        anydpi.mkdir(parents=True, exist_ok=True)
        adaptive = """<?xml version=\"1.0\" encoding=\"utf-8\"?>
<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">
    <background android:drawable=\"@color/ic_launcher_background\"/>
    <foreground android:drawable=\"@mipmap/ic_launcher_foreground\"/>
</adaptive-icon>
"""
        (anydpi / "ic_launcher.xml").write_text(adaptive)
        (anydpi / "ic_launcher_round.xml").write_text(adaptive)
        values = android_res / "values"
        values.mkdir(parents=True, exist_ok=True)
        (values / "ic_launcher_background.xml").write_text("""<?xml version=\"1.0\" encoding=\"utf-8\"?>
<resources>
    <color name=\"ic_launcher_background\">#FFFFFF</color>
</resources>
""")
        print("adaptive icon xml ok")
    else:
        print("android/res not found yet — resources generated; run after cap sync")

    print("branding applied OK")

if __name__ == "__main__":
    main()
