(function () {
  const view = document.getElementById("view");
  const backBtn = document.getElementById("back");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 端末内の記録（読んだ講座・問題の成績・選んだカテゴリ）。保存できない環境でも動くようにする
  const store = {
    get(k, d) { try { const v = localStorage.getItem("cg." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("cg." + k, JSON.stringify(v)); } catch (e) {} },
  };

  const lessonById = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
  const sceneById = Object.fromEntries(SCENES.map((s) => [s.id, s]));
  const pad = (n) => String(n).padStart(2, "0");

  function setTab(name, showBack) {
    document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.tab === name));
    backBtn.hidden = !showBack;
  }

  // ---------- 現場 ----------
  function fieldList() {
    setTab("field", false);
    let cat = store.get("cat", CATEGORIES[0].id);
    const draw = () => {
      const items = SCENES.filter((s) => s.cat === cat);
      view.innerHTML = `
        <div class="cats" role="tablist">${CATEGORIES.map((c) => `<button data-cat="${c.id}" class="${c.id === cat ? "on" : ""}">${c.label}</button>`).join("")}</div>
        <ul class="list">${items.map((s, i) => `
          <li><a href="#/scene/${s.id}">
            <span class="no">${pad(i + 1)}</span><span class="t">${esc(s.title)}</span>
            ${s.mr ? `<span class="mark">ダイヤル ${s.mr}</span>` : ""}
            <span class="s">${esc(s.sub)}</span>
          </a></li>`).join("")}
        </ul>
        <p class="foot">設定は最初の1枚の目安です。撮ったら液晶で見て、明るさは露出補正で直してください。</p>`;
    };
    draw();
    view.onclick = (e) => {
      const b = e.target.closest("[data-cat]");
      if (!b) return;
      cat = b.dataset.cat; store.set("cat", cat); draw();
    };
  }

  // 液晶ふうの帯に出す短い値。表に無い項目はカメラ任せ（AUTO）
  function short(scene, key) {
    const row = scene.s.find((r) => r[0] === key || (key === "シャッター" && r[0] === "シャッター"));
    if (!row) return null;
    return row[1].split(/[（ ＋]/)[0];
  }
  function lcd(scene) {
    const cell = (label, v) => `<div><small>${label}</small><b class="${v ? (v.length > 5 ? "long" : "") : "auto"}">${v ? esc(v).replace("〜", "〜<wbr>") : "AUTO"}</b></div>`;
    return `<div class="lcd">${cell("MODE", short(scene, "モード"))}${cell("F", short(scene, "F値"))}${cell("SHUTTER", short(scene, "シャッター"))}${cell("ISO", short(scene, "ISO"))}</div>`;
  }

  function sceneDetail(id) {
    const s = sceneById[id];
    if (!s) return fieldList();
    setTab("field", true);
    view.onclick = null;
    view.innerHTML = `
      <div class="page-head"><h1>${esc(s.title)}</h1><p>${esc(s.sub)}</p></div>
      ${lcd(s)}
      <p class="lcd-note">AUTO の項目はカメラが自動で決めます</p>
      ${s.mr ? `<div class="dial"><b>${s.mr}</b>登録しておけば、モードダイヤルを ${s.mr} に回すだけ</div>` : ""}
      <h2 class="sec">設定</h2>
      <table class="settings">${s.s.map(([k, v, why]) => `<tr><th>${esc(k)}</th><td><span class="v">${esc(v)}</span>${why ? `<span class="why">${esc(why)}</span>` : ""}</td></tr>`).join("")}</table>
      <h2 class="sec">撮り方のコツ</h2>
      <ul class="plain">${s.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <h2 class="sec">このレンズで撮るとき</h2>
      <p class="lens">${esc(s.lens)}</p>
      <h2 class="sec">なぜこの設定？</h2>
      <div class="links">${s.lessons.map((l) => `<a href="#/lesson/${l}">${esc(lessonById[l].title)}</a>`).join("")}</div>`;
  }

  // ---------- 学ぶ ----------
  function learnList() {
    setTab("learn", false);
    view.onclick = null;
    const read = store.get("read", {});
    const n = LESSONS.filter((l) => read[l.id]).length;
    view.innerHTML = `
      <div class="page-head"><h1>学ぶ</h1><p>上から順に読むと、AUTOからAモードに移れます。${n} / ${LESSONS.length} 読了</p></div>
      <ul class="list">${LESSONS.map((l, i) => `
        <li><a href="#/lesson/${l.id}">
          <span class="no">${pad(i + 1)}</span><span class="t">${esc(l.title)}</span>
          <span class="mark ${read[l.id] ? "done" : ""}">${read[l.id] ? "読了" : ""}</span>
          <span class="s">${esc(l.lead)}</span>
        </a></li>`).join("")}
      </ul>`;
  }

  function renderBody(body) {
    return body.map(([type, v]) => {
      if (type === "p") return `<p>${v}</p>`;
      if (type === "h") return `<h3>${esc(v)}</h3>`;
      if (type === "tip") return `<div class="tip">${v}</div>`;
      if (type === "ol") return `<ol class="plain">${v.map((x) => `<li>${x}</li>`).join("")}</ol>`;
      if (type === "table") return `<table>${v.map((r, i) => `<tr>${r.map((c) => (i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join("")}</tr>`).join("")}</table>`;
      return "";
    }).join("");
  }

  function lessonDetail(id) {
    const l = lessonById[id];
    if (!l) return learnList();
    setTab("learn", true);
    const read = store.get("read", {});
    const idx = LESSONS.indexOf(l);
    const next = LESSONS[idx + 1];
    view.innerHTML = `
      <div class="page-head"><h1>${esc(l.title)}</h1><p>${esc(l.lead)}</p></div>
      <div class="body">${renderBody(l.body)}</div>
      ${l.sim ? `<div id="sim"></div>` : ""}
      <button class="read-btn ${read[id] ? "done" : ""}" id="readBtn">${read[id] ? "読了済み" : "読んだ"}</button>
      ${next ? `<h2 class="sec">次</h2><div class="links"><a href="#/lesson/${next.id}">${esc(next.title)}</a></div>` : ""}`;
    if (l.sim) Sim.mount(document.getElementById("sim"));
    view.onclick = (e) => {
      if (e.target.id !== "readBtn") return;
      const r = store.get("read", {});
      r[id] = !r[id]; store.set("read", r);
      e.target.classList.toggle("done", r[id]);
      e.target.textContent = r[id] ? "読了済み" : "読んだ";
    };
  }

  // ---------- 問題 ----------
  // 間違えた問題は3問後にもう一度出す。正解した問題は後回し
  function quiz() {
    setTab("quiz", false);
    const stats = store.get("quiz", {}); // { index: { ok, ng } }
    let queue = QUIZ.map((_, i) => i).sort((a, b) => {
      const sa = stats[a] || { ok: 0, ng: 0 }, sb = stats[b] || { ok: 0, ng: 0 };
      return (sa.ok - sa.ng) - (sb.ok - sb.ng) || Math.random() - 0.5;
    });
    let done = 0, right = 0;

    const draw = () => {
      const qi = queue[0];
      const q = QUIZ[qi];
      const order = q.c.map((_, i) => i).sort(() => Math.random() - 0.5);
      view.innerHTML = `
        <div class="quiz-meta"><span>${done} 問目まで ／ 正解 ${right}</span><span>全${QUIZ.length}問</span></div>
        <div class="quiz-q">${esc(q.q)}</div>
        <div class="choices">${order.map((ci, k) => `<button data-c="${ci}"><span>${"ABCD"[k]}</span>${esc(q.c[ci])}</button>`).join("")}</div>
        <div id="ans"></div>`;
      view.onclick = (e) => {
        const b = e.target.closest("[data-c]");
        if (b && !b.disabled) {
          const ok = Number(b.dataset.c) === q.a;
          view.querySelectorAll("[data-c]").forEach((x) => {
            x.disabled = true;
            if (Number(x.dataset.c) === q.a) x.classList.add("right");
          });
          if (!ok) b.classList.add("wrong");
          const s = stats[qi] || { ok: 0, ng: 0 };
          ok ? s.ok++ : s.ng++;
          stats[qi] = s; store.set("quiz", stats);
          done++; if (ok) right++;
          queue.shift();
          if (ok) queue.push(qi); else queue.splice(Math.min(3, queue.length), 0, qi);
          document.getElementById("ans").innerHTML = `
            <div class="answer">
              <div class="verdict ${ok ? "" : "ng"}">${ok ? "正解" : "不正解"}</div>
              <p>${esc(q.e)}</p>
              <div class="links"><a href="#/lesson/${q.l}">講座：${esc(lessonById[q.l].title)}</a></div>
              <button class="next-btn" id="next">次の問題</button>
            </div>`;
          return;
        }
        if (e.target.id === "next") { draw(); window.scrollTo(0, 0); }
      };
    };
    draw();
  }

  // ---------- 登録 ----------
  function mrPage() {
    setTab("mr", false);
    view.onclick = null;
    view.innerHTML = `
      <div class="page-head"><h1>ダイヤル 1・2・3</h1><p>よく使う設定を登録しておけば、現場では回すだけ。</p></div>
      <h2 class="sec">登録のしかた</h2>
      <ol class="plain">
        <li>下の表のとおりに設定する</li>
        <li>MENU → 撮影 → ［撮影モード］ → ［撮影設定登録］</li>
        <li>番号を選んで、コントロールホイールの中央で決定</li>
      </ol>
      ${MR_PRESETS.map((m) => `
        <section class="mr">
          <div class="mr-head"><div class="mr-no">${m.no}</div><div><h3>${esc(m.name)}</h3><p>${esc(m.use)}</p></div></div>
          <table class="settings">${m.s.map(([k, v]) => `<tr><th>${esc(k)}</th><td><span class="v">${esc(v)}</span></td></tr>`).join("")}</table>
        </section>`).join("")}
      <p class="foot">メニューの場所はソニー公式ヘルプガイド（α7C II）で確認したものです。本体のソフトウェアのバージョンで表記が少し違うことがあります。</p>`;
  }

  // ---------- 診断 ----------
  const CHECK_SCENES = [["none", "指定なし"], ["landscape", "風景"], ["people", "人"], ["pet", "ペット"], ["food", "料理"], ["parade", "動くもの"], ["night", "夜／室内"]];
  let checkUrl = null;

  // 縮小した絵から明るさの統計を取る（写真そのものは保存も送信もしない）
  function lumaStats(img) {
    const k = 256 / Math.max(img.naturalWidth, img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * Math.min(1, k))), h = Math.max(1, Math.round(img.naturalHeight * Math.min(1, k)));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let sum = 0, hi = 0, lo = 0;
    const n = w * h;
    for (let i = 0; i < d.length; i += 4) {
      const y = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      sum += y;
      if (y > 0.97) hi++;
      if (y < 0.03) lo++;
    }
    return { mean: sum / n, hi: hi / n, lo: lo / n };
  }

  function checkPage() {
    setTab("check", false);
    let scene = store.get("checkScene", "none");
    let exif = null, stats = null, state = "empty"; // empty | noexif | ready
    view.innerHTML = `
      <div class="page-head"><h1>写真から振り返る</h1><p>写真は端末の中で読むだけで、送信しません</p></div>
      <label class="read-btn pick">写真を選ぶ<input type="file" id="pick" accept="image/jpeg" hidden></label>
      <div id="result"></div>`;
    const result = document.getElementById("result");

    const info = (e) => {
      const v = (x) => (x == null ? null : x);
      const mode = diagnose.modeName(e);
      const cell = (label, val) => `<div><small>${label}</small><b class="${val ? "" : "auto"}">${val ? esc(val) : "—"}</b></div>`;
      const bias = typeof e.bias === "number" ? (e.bias > 0 ? "+" : "") + (Math.round(e.bias * 10) / 10) : null;
      const small = [
        e.focal35 || e.focalLength ? `焦点距離 ${Math.round(e.focal35 || e.focalLength)}mm` : null,
        bias != null ? `補正 ${bias}` : null,
        e.lens ? e.lens : null,
        e.date ? e.date.replace(/^(\d+):(\d+):(\d+)/, "$1/$2/$3") : null,
      ].filter(Boolean);
      return `<div class="lcd">${cell("MODE", mode)}${cell("F", v(e.fNumber) && diagnose.fmtF(e.fNumber))}${cell("SHUTTER", v(e.exposureTime) && diagnose.fmtT(e.exposureTime).replace("秒", ""))}${cell("ISO", v(e.iso) && String(e.iso))}</div>
        <p class="lcd-note">${small.map(esc).join("　／　")}</p>`;
    };

    const drawResult = () => {
      if (state === "empty") { result.innerHTML = ""; return; }
      const preview = checkUrl ? `<img class="check-img" src="${checkUrl}" alt="選んだ写真">` : "";
      if (state === "noexif") {
        result.innerHTML = `${preview}<p class="check-none">撮影情報が残っていません。カメラから直接取り込んだJPEGを選んでください。</p>`;
        return;
      }
      const items = diagnose(exif, stats, scene);
      result.innerHTML = `
        ${preview}${info(exif)}
        <h2 class="sec">撮ったもの</h2>
        <div class="cats chips" role="tablist">${CHECK_SCENES.map(([id, label]) => `<button data-scene="${id}" class="${id === scene ? "on" : ""}">${label}</button>`).join("")}</div>
        <h2 class="sec">診断</h2>
        <ul class="diag">${items.map((r) => `
          <li class="${r.level}">
            <div class="d-t">${r.level === "ok" ? "" : `<em>${r.level === "bad" ? "注意" : "確認"}</em>`}${esc(r.title)}</div>
            <p>${esc(r.body)}</p>
            ${r.lesson && lessonById[r.lesson] ? `<div class="links"><a href="#/lesson/${r.lesson}">講座：${esc(lessonById[r.lesson].title)}</a></div>` : ""}
          </li>`).join("")}
        </ul>
        <p class="foot">Exifは撮影時の設定の記録です。ピントの位置や構図までは分かりません。</p>`;
    };

    document.getElementById("pick").onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (checkUrl) URL.revokeObjectURL(checkUrl);
      checkUrl = URL.createObjectURL(file);
      exif = readExif(await file.arrayBuffer());
      stats = null;
      if (!exif) { state = "noexif"; drawResult(); return; }
      state = "ready";
      const img = new Image();
      img.onload = () => { try { stats = lumaStats(img); } catch (err) {} drawResult(); };
      img.onerror = () => drawResult();
      img.src = checkUrl;
    };
    view.onclick = (e) => {
      const b = e.target.closest("[data-scene]");
      if (!b) return;
      scene = b.dataset.scene; store.set("checkScene", scene); drawResult();
    };
  }

  // ---------- 画面の切り替え ----------
  function route() {
    const [, page, id] = (location.hash || "#/").split("/");
    if (page === "scene") sceneDetail(id);
    else if (page === "learn") learnList();
    else if (page === "lesson") lessonDetail(id);
    else if (page === "quiz") quiz();
    else if (page === "mr") mrPage();
    else if (page === "check") checkPage();
    else fieldList();
    window.scrollTo(0, 0);
  }
  backBtn.onclick = () => (history.length > 1 ? history.back() : (location.hash = "#/"));
  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
