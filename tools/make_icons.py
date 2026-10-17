"""撮影ノートのアイコン（PNG）を生成する。

docs/icon.svg と同じ絵柄（背景・黒い円環・朱色の点）を Pillow で描き、
docs/icon-180.png / icon-192.png / icon-512.png に書き出す。
絵柄を変えたら icon.svg 側も合わせて直すこと。

使い方:  python tools/make_icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

# icon.svg（viewBox 512）の座標系での値
BG = (0xF4, 0xF1, 0xEA)
INK = (0x1F, 0x1E, 0x1B)
ACCENT = (0xB8, 0x43, 0x1F)
RING_CENTER_R = 160
RING_WIDTH = 64
DOT_R = 40
VIEW = 512

SS = 4  # スーパーサンプリング倍率（円のアンチエイリアス用）

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "docs"
SIZES = [180, 192, 512]


def draw(size: int) -> Image.Image:
    big = size * SS
    k = big / VIEW
    img = Image.new("RGB", (big, big), BG)
    d = ImageDraw.Draw(img)
    c = big / 2
    outer = (RING_CENTER_R + RING_WIDTH / 2) * k
    inner = (RING_CENTER_R - RING_WIDTH / 2) * k
    # 円環は外円を黒で塗り、内円を背景色で抜く
    d.ellipse([c - outer, c - outer, c + outer, c + outer], fill=INK)
    d.ellipse([c - inner, c - inner, c + inner, c + inner], fill=BG)
    r = DOT_R * k
    d.ellipse([c - r, c - r, c + r, c + r], fill=ACCENT)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for s in SIZES:
        path = OUT_DIR / f"icon-{s}.png"
        draw(s).save(path, format="PNG", optimize=True)
        print(f"wrote {path.name} ({s}x{s})")


if __name__ == "__main__":
    main()
