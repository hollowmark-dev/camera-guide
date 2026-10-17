"""docs/sw.js の キャッシュ名 cg-vN の N を1つ上げる。

使い方:  python tools/bump-sw.py
公開前に実行する。版数が変わると、利用者の端末で新しいキャッシュに切り替わる。
"""

import re
import sys
from pathlib import Path

SW = Path(__file__).resolve().parent.parent / "docs" / "sw.js"
PATTERN = re.compile(r"cg-v(\d+)")


def main() -> int:
    text = SW.read_text(encoding="utf-8")
    matches = PATTERN.findall(text)
    if len(matches) != 1:
        print(f"cg-vN の出現が {len(matches)} 回でした。手で確認してください。", file=sys.stderr)
        return 1
    old = int(matches[0])
    new = old + 1
    SW.write_text(PATTERN.sub(f"cg-v{new}", text, count=1), encoding="utf-8", newline="\n")
    print(f"sw.js: cg-v{old} -> cg-v{new}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
