// 写真の設定（Exif）と明るさから、「なぜそう写ったか」を短く解説する。純関数なので node でも試せる。
// diagnose(exif, stats, scene) → [{ level: "ok"|"warn"|"bad", title, body, lesson }]
(function (root) {
  const fmtT = (t) => (t >= 1 ? (Math.round(t * 10) / 10) + "秒" : "1/" + Math.round(1 / t) + "秒");
  const fmtF = (f) => "F" + (Math.round(f * 10) / 10);
  const ORDER = { bad: 0, warn: 1, ok: 2 };

  // キットレンズ（28-60mm F4-5.6）の開放F値。焦点距離に合わせて線形に補間する
  function openF(f) {
    const x = Math.min(60, Math.max(28, f));
    return 4 + ((x - 28) / 32) * 1.6;
  }

  function modeName(e) {
    if (!e) return null;
    const p = e.program;
    if (p === 1) return "M";
    if (p === 3) return "A";
    if (p === 4) return "S";
    if (p === 2) return "P";
    return "AUTO";
  }

  function diagnose(exif, stats, scene) {
    if (!exif) return [];
    scene = scene || "none";
    const out = [];
    const add = (level, title, body, lesson) => out.push({ level, title, body, lesson });
    const t = exif.exposureTime, F = exif.fNumber, iso = exif.iso;
    const f = exif.focal35 || exif.focalLength;
    const bias = typeof exif.bias === "number" ? exif.bias : 0;
    const fmtBias = (b) => (b > 0 ? "+" : "") + (Math.round(b * 10) / 10).toFixed(1);
    const mm = f ? Math.round(f) + "mm" : "";

    // 手ブレ（目安：ボディ内補正があるので、1/焦点距離の4倍まで遅くても多くは粘れる）
    if (t && f) {
      const r = t * f;
      if (r > 16.001) {
        add("bad", fmtT(t) + "・" + mm + "：手ブレしやすい速さ",
          "手ブレ補正があっても、この遅さでは止まりにくいです。ISOを上げてシャッターを " + fmtT(1 / f) + " に近づけるか、脇を締めて息を止め、連写で当たりを拾ってください。",
          "shutter");
      } else if (r > 4.001) {
        add("warn", fmtT(t) + "・" + mm + "：手ブレの境目",
          "手ブレ補正があっても、動く人や手の揺れでぶれることがあります。ISOを上げて " + fmtT(1 / f) + " に近づけるのが次の一手です。脇を締めて撮る、連写する、でも効きます。",
          "shutter");
      }
    }

    // 被写体ブレ
    if (t && (scene === "pet" || scene === "parade" || scene === "people") && t > 1 / 250 + 1e-9) {
      add("warn", fmtT(t) + "：動く被写体には遅め",
        "手ブレがなくても、動くものは写り込みでブレます。Sモードにして 1/500 秒に固定してみてください。",
        "shutter");
    }

    // ISO
    const openedF = f ? openF(f) : null;
    const stopped = F && openedF ? F > openedF * 1.15 : false;
    const openTxt = openedF ? "開放側（F4〜5.6、ズーム位置による）" : "";
    if (iso >= 12800) {
      add("bad", "ISO" + iso + "：ノイズが目立ちます",
        "スマホの画面で見る分には許容範囲ですが、拡大するとざらつきます。" +
        (stopped ? fmtF(F) + "は開放より絞っているので、F値を" + openTxt + "へ開けるのが先です。" : "明るい場所へ寄るか、手ブレが許す範囲でシャッターを遅くしてください。"),
        "iso");
    } else if (iso >= 6400) {
      add("warn", "ISO" + iso + "：少しざらつきます",
        stopped ? fmtF(F) + "は開放より絞っています。F値を" + openTxt + "へ開ければISOを下げられます。" : "暗い場所では仕方のない数字です。拡大して見なければ気になりません。",
        "iso");
    } else if (iso >= 3200 && stopped) {
      add("warn", "ISO" + iso + "：F値を開放に",
        fmtF(F) + "は開放より絞っています。F値を" + openTxt + "へ開けるとISOを下げられます。",
        "iso");
    }

    // 明るさ
    if (stats) {
      if (stats.mean < 0.33 && bias <= 0) {
        if (scene === "night") {
          add("ok", "暗いのは夜景として自然です", "明かりの部分が白く飛んでいなければ、このままで大丈夫です。", "exposure");
        } else {
          const rng = scene === "food" || scene === "people" ? "+0.7〜+1.0" : "+0.3〜+0.7";
          add("warn", "全体に暗めに写っています",
            "露出補正を " + rng + " にして撮り直してください。液晶で見て、暗ければもう一段足します。",
            "comp");
        }
      }
      if (stats.hi > 0.06 && scene !== "night") {
        add("warn", "白く飛んでいる部分があります",
          (bias > 0
            ? "露出補正が " + fmtBias(bias) + " になっています。0 に戻して撮り直してください。"
            : "露出補正を -0.3〜-0.7 にしてください。") + "空や白い服など、明るい所の模様が残る位置が目安です。",
          "comp");
      }
    }

    // ボケ
    if (F && F >= 8 && (scene === "people" || scene === "pet" || scene === "food")) {
      add("warn", fmtF(F) + "：背景がぼけにくい設定",
        "被写体を浮かせたいなら、F値を開放側に。キットレンズは60mm側にして、被写体に近づき、背景を遠ざけると効きます。",
        "aperture");
    }

    // 撮影モード
    const p = exif.program;
    const autoish = p === undefined || p === 0 || p === 2 || p >= 5;
    if (autoish) {
      add("ok", "撮影モード：" + modeName(exif),
        "カメラ任せで撮れています。次は A モードにして、F値だけ自分で決めてみてください。",
        "start");
    }

    if (!out.some((r) => r.level !== "ok")) {
      out.unshift({ level: "ok", title: "この設定で問題なさそうです", body: "シャッター・ISO・明るさに目立つ問題は見当たりません。", lesson: "exposure" });
    }
    return out
      .map((r, i) => [r, i])
      .sort((a, b) => ORDER[a[0].level] - ORDER[b[0].level] || a[1] - b[1])
      .map((x) => x[0]);
  }

  diagnose.modeName = modeName;
  diagnose.fmtT = fmtT;
  diagnose.fmtF = fmtF;
  root.diagnose = diagnose;
})(typeof window !== "undefined" ? window : globalThis);
