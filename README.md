# 撮影ノート（camera-guide）

α7C II とキットレンズ（ズーム）で、シーン別の撮影設定を見られるようにし、撮り方を学べる静的アプリです。
シーンごとの設定の目安と、なぜその設定にするのかの解説を載せています。

- 配信: `docs/` を GitHub Pages で公開します（オフライン対応の Service Worker 同梱）。
- 公開前に `python tools/bump-sw.py` を実行し、`docs/sw.js` のキャッシュ版数を上げてください。
- アイコン PNG を作り直すときは `python tools/make_icons.py`（Pillow が必要）。
