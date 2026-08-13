#!/usr/bin/env python3
"""Apply TechSerenia brand icon + splash into resources/ and android/res."""
from __future__ import annotations
import base64, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent

def write_bytes(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    print("wrote", path.relative_to(ROOT), len(data), "bytes")

def main():
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        os.system(f"{sys.executable} -m pip install pillow -q")
        from PIL import Image, ImageDraw

    icon_b64 = (HERE / "icon.b64").read_text().strip()
    splash_b64 = (HERE / "splash.b64").read_text().strip()
    icon_raw = base64.b64decode(icon_b64)
    splash_raw = base64.b64decode(splash_b64)
    write_bytes(ROOT / "resources" / "icon.png", icon_raw)
    write_bytes(ROOT / "resources" / "splash.png", splash_raw)
    write_bytes(ROOT / "resources" / "logo.png", icon_raw)

    src = Image.open(ROOT / "resources" / "icon.png").convert("RGBA")

    def fit_logo(logo, canvas_size, logo_ratio=0.66):
        canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        target = int(canvas_size * logo_ratio)
        lr = logo.copy()
        lr.thumbnail((target, target), Image.Resampling.LANCZOS)
        x = (canvas_size - lr.size[0]) // 2
        y = (canvas_size - lr.size[1]) // 2
        canvas.paste(lr, (x, y), lr)
        return canvas

    def with_white_bg(logo, size):
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        lr = logo.copy()
        target = int(size * 0.78)
        lr.thumbnail((target, target), Image.Resampling.LANCZOS)
        x = (size - lr.size[0]) // 2
        y = (size - lr.size[1]) // 2
        canvas.paste(lr, (x, y), lr)
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
        fg = fit_logo(src, sz, 0.66)
        fg.save(folder / "ic_launcher_foreground.png")
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
        print("android/res not found yet — resources only")

    print("branding applied OK")

if __name__ == "__main__":
    main()
