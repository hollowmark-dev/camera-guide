"""診断タブ用の、Exif付きテストJPEGを作る。

使い方:  python tools/make_test_jpegs.py <出力ディレクトリ>
Pillow が必要（Exifは Pillow の Image.Exif で組む。piexif は不要）。
出力ディレクトリに a_*.jpg 〜 e_*.jpg と、明るさ統計を入れた stats.json を書く。
docs/ には置かないこと（公開物に入れない）。
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from PIL.TiffImagePlugin import IFDRational

# (ファイル名, 秒, 焦点距離mm, ISO, F, ExposureProgram, 補正, 画像の種類)
CASES = [
    ("a_dark_food_1-15", (1, 15), 60, 800, 5.6, 2, 0.0, "dark"),
    ("b_highiso_f8", (1, 60), 28, 12800, 8.0, 3, 0.0, "mid"),
    ("c_bright_landscape_ok", (1, 1000), 35, 100, 8.0, 3, 0.0, "bright"),
    ("d_moving_1-100", (1, 100), 60, 3200, 5.6, 4, 0.0, "mid"),
    ("e_blown_plus1", (1, 250), 35, 200, 5.6, 3, 1.0, "blown"),
]


def make_image(kind: str) -> Image.Image:
    size = (600, 400)
    base = {"dark": (38, 30, 26), "mid": (120, 112, 100), "bright": (150, 170, 195), "blown": (225, 225, 220)}[kind]
    img = Image.new("RGB", size, base)
    d = ImageDraw.Draw(img)
    if kind == "dark":
        d.ellipse((200, 120, 400, 300), fill=(90, 60, 40))
    elif kind == "bright":
        d.rectangle((0, 250, 600, 400), fill=(90, 130, 80))
        d.polygon([(0, 250), (200, 110), (400, 250)], fill=(110, 110, 120))
    elif kind == "blown":
        d.rectangle((0, 0, 600, 190), fill=(255, 255, 255))
        d.ellipse((220, 200, 380, 360), fill=(150, 120, 100))
    else:
        d.ellipse((220, 120, 380, 300), fill=(160, 100, 80))
        d.rectangle((0, 300, 600, 400), fill=(70, 80, 70))
    return img.filter(ImageFilter.GaussianBlur(2))


def luma_stats(img: Image.Image) -> dict:
    small = img.copy()
    small.thumbnail((256, 256))
    px = list(small.convert("RGB").getdata())
    ys = [(0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 for r, g, b in px]
    n = len(ys)
    return {"mean": sum(ys) / n, "hi": sum(y > 0.97 for y in ys) / n, "lo": sum(y < 0.03 for y in ys) / n}


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    all_stats = {}
    for name, (n, dn), mm, iso, f, prog, bias, kind in CASES:
        img = make_image(kind)
        exif = Image.Exif()
        exif[0x010F] = "SONY"
        exif[0x0110] = "ILCE-7CM2"
        exif[0x0112] = 1
        sub = exif.get_ifd(0x8769)
        sub[0x9003] = "2026:10:17 12:00:00"
        sub[0x829A] = IFDRational(n, dn)
        sub[0x829D] = IFDRational(int(f * 10), 10)
        sub[0x8822] = prog
        sub[0x8827] = iso
        sub[0x9204] = IFDRational(int(bias * 10), 10)
        sub[0x920A] = IFDRational(mm, 1)
        sub[0xA405] = mm
        sub[0xA434] = "FE 28-60mm F4-5.6"
        path = out / f"{name}.jpg"
        img.save(path, "JPEG", quality=88, exif=exif)
        all_stats[path.name] = luma_stats(img)
        print("wrote", path)
    (out / "stats.json").write_text(json.dumps(all_stats, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
