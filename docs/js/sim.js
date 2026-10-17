// 露出シミュレーター。F値・シャッター・ISOの組み合わせで、
// 背景のボケ／走る犬のブレ／手ブレ／ノイズ／明るさがどう変わるかを絵で見せる。
// 計算は EV（露出値）で行う: 必要な明るさ = 場面のEV + log2(ISO/100)、設定の明るさ = log2(F²/t)
(function () {
  const F_STEPS = [4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 16, 22];
  const T_STEPS = [1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1];
  const ISO_STEPS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200];
  const SCENES = {
    day: { label: "曇りの屋外", ev: 12 },
    indoor: { label: "室内", ev: 7 },
    night: { label: "夜のパーク", ev: 4 },
  };

  const fmtT = (t) => (t >= 1 ? t + "秒" : "1/" + Math.round(1 / t));
  const nearest = (arr, v, log) => {
    let best = 0;
    arr.forEach((x, i) => {
      const d = log ? Math.abs(Math.log2(x) - Math.log2(v)) : Math.abs(x - v);
      const db = log ? Math.abs(Math.log2(arr[best]) - Math.log2(v)) : Math.abs(arr[best] - v);
      if (d < db) best = i;
    });
    return best;
  };

  function svg() {
    return `
<svg viewBox="0 0 320 190" role="img" aria-label="設定による写り方の変化">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop id="sky1" offset="0" stop-color="#9fb6c8"/><stop id="sky2" offset="1" stop-color="#dfe3e0"/>
    </linearGradient>
    <filter id="fBg" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="bgBlur" stdDeviation="2"/></filter>
    <filter id="fDog" x="-40%" y="-10%" width="180%" height="120%"><feGaussianBlur id="dogBlur" stdDeviation="0 0"/></filter>
    <filter id="fAll" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur id="shake" stdDeviation="0"/>
      <feComponentTransfer><feFuncR id="br" type="linear" slope="1"/><feFuncG id="bg" type="linear" slope="1"/><feFuncB id="bb" type="linear" slope="1"/></feComponentTransfer>
    </filter>
    <filter id="fNoise"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="3"/><feColorMatrix type="saturate" values="0.3"/></filter>
  </defs>
  <g filter="url(#fAll)">
    <g filter="url(#fBg)">
      <rect width="320" height="190" fill="url(#sky)"/>
      <path id="mtn" d="M0 120 L50 70 L95 105 L150 55 L210 100 L255 72 L320 110 L320 190 L0 190Z" fill="#7d8e86"/>
      <g id="castle" fill="#5e6b74">
        <rect x="196" y="78" width="40" height="45"/><rect x="190" y="70" width="10" height="53"/><rect x="232" y="70" width="10" height="53"/>
        <path d="M189 70 L195 56 L201 70Z M231 70 L237 56 L243 70Z M208 78 L216 52 L224 78Z"/>
      </g>
      <g id="lights" fill="#ffd27a" opacity="0">
        <circle cx="200" cy="90" r="1.6"/><circle cx="216" cy="70" r="1.6"/><circle cx="232" cy="90" r="1.6"/><circle cx="216" cy="100" r="1.6"/>
        <circle cx="40" cy="128" r="1.4"/><circle cx="70" cy="122" r="1.4"/><circle cx="280" cy="125" r="1.4"/><circle cx="120" cy="126" r="1.4"/>
      </g>
      <rect y="128" width="320" height="62" fill="#8a9a7c" id="ground"/>
      <g fill="#566b4e"><circle cx="28" cy="122" r="16"/><circle cx="58" cy="126" r="12"/><circle cx="290" cy="120" r="18"/></g>
    </g>
    <g id="person">
      <circle cx="110" cy="96" r="11" fill="#e2b99a"/>
      <path d="M104 89 Q110 80 118 88 L119 94 Q111 86 102 95Z" fill="#3b2f2a"/>
      <path d="M94 160 L97 116 Q110 106 123 116 L126 160Z" fill="#b8431f"/>
      <rect x="99" y="160" width="8" height="22" fill="#33383f"/><rect x="113" y="160" width="8" height="22" fill="#33383f"/>
    </g>
    <g filter="url(#fDog)">
      <g id="dog" fill="#c79a62">
        <ellipse cx="225" cy="160" rx="22" ry="10"/>
        <circle cx="250" cy="150" r="9"/><path d="M253 142 L262 138 L258 148Z" fill="#8a6440"/>
        <rect x="208" y="166" width="5" height="14" transform="rotate(25 210 166)"/><rect x="236" y="166" width="5" height="14" transform="rotate(-25 238 166)"/>
        <path d="M203 156 Q192 146 195 140" stroke="#c79a62" stroke-width="4" fill="none"/>
        <circle cx="253" cy="149" r="1.4" fill="#222"/>
      </g>
    </g>
  </g>
  <rect id="noise" width="320" height="190" filter="url(#fNoise)" opacity="0"/>
</svg>`;
  }

  function mount(root) {
    const st = { scene: "day", mode: "A", focal: 28, f: 3, t: 6, iso: 0 };
    root.innerHTML = `
<div class="sim">
  ${svg()}
  <div class="sim-ctrl">
    <div class="seg" data-k="scene">${Object.entries(SCENES).map(([k, v]) => `<button data-v="${k}">${v.label}</button>`).join("")}</div>
    <div class="seg" data-k="mode"><button data-v="A">Aモード</button><button data-v="S">Sモード</button><button data-v="M">Mモード</button></div>
    <div class="seg" data-k="focal"><button data-v="28">28mm</button><button data-v="60">60mm</button></div>
    <div class="sim-row"><label>F値</label><input type="range" min="0" max="${F_STEPS.length - 1}" data-k="f"><output data-o="f"></output></div>
    <div class="sim-row"><label>シャッター</label><input type="range" min="0" max="${T_STEPS.length - 1}" data-k="t"><output data-o="t"></output></div>
    <div class="sim-row"><label>ISO</label><input type="range" min="0" max="${ISO_STEPS.length - 1}" data-k="iso"><output data-o="iso"></output></div>
  </div>
  <p class="sim-read" data-o="read"></p>
</div>`;
    const $ = (s) => root.querySelector(s);
    const minF = () => (st.focal === 60 ? 3 : 0); // 60mm は F5.6 から

    function solve() {
      const need = SCENES[st.scene].ev + Math.log2(ISO_STEPS[st.iso] / 100);
      if (st.f < minF()) st.f = minF();
      if (st.mode === "A") st.t = nearest(T_STEPS, F_STEPS[st.f] ** 2 / 2 ** need, true);
      if (st.mode === "S") st.f = Math.max(minF(), nearest(F_STEPS, Math.sqrt(T_STEPS[st.t] * 2 ** need), true));
      const set = Math.log2(F_STEPS[st.f] ** 2 / T_STEPS[st.t]);
      return need - set; // +なら明るすぎ、-なら暗すぎ
    }

    function render() {
      const diff = solve();
      const N = F_STEPS[st.f], t = T_STEPS[st.t], iso = ISO_STEPS[st.iso];
      root.querySelectorAll(".seg").forEach((g) => g.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === String(st[g.dataset.k]))));
      $('[data-k="f"]').value = st.f; $('[data-k="t"]').value = st.t; $('[data-k="iso"]').value = st.iso;
      $('[data-k="f"]').disabled = st.mode === "S"; $('[data-k="t"]').disabled = st.mode === "A";
      $('[data-o="f"]').textContent = "F" + N; $('[data-o="t"]').textContent = fmtT(t); $('[data-o="iso"]').textContent = iso;
      $('[data-o="f"]').classList.toggle("locked", st.mode === "S"); $('[data-o="t"]').classList.toggle("locked", st.mode === "A");

      const night = st.scene === "night", indoor = st.scene === "indoor";
      $("#sky1").setAttribute("stop-color", night ? "#0d1530" : indoor ? "#8c7a66" : "#9fb6c8");
      $("#sky2").setAttribute("stop-color", night ? "#2b2f4a" : indoor ? "#c9b79c" : "#dfe3e0");
      $("#mtn").setAttribute("fill", night ? "#1c2233" : indoor ? "#7a6a58" : "#7d8e86");
      $("#ground").setAttribute("fill", night ? "#22262b" : indoor ? "#9c8b74" : "#8a9a7c");
      $("#castle").setAttribute("fill", night ? "#3a3550" : "#5e6b74");
      $("#lights").setAttribute("opacity", night ? 1 : 0);

      const bg = Math.pow(st.focal / 28, 1.5) * (4 / N) * 3.5;
      const dog = Math.min(30, 600 * t);
      const limit = 1 / (st.focal / 4); // 手ブレ補正込みのおおまかな限界（28mm≒1/7、60mm≒1/15）
      const shake = t > limit ? Math.min(6, 1.5 * Math.log2(t / limit) + 0.8) : 0;
      const slope = Math.max(0.05, Math.min(4, Math.pow(2, diff)));
      const noise = Math.max(0, Math.min(0.6, (Math.log2(iso / 100) - 3) / 5));
      $("#bgBlur").setAttribute("stdDeviation", bg.toFixed(2));
      $("#dogBlur").setAttribute("stdDeviation", `${dog.toFixed(2)} 0`);
      $("#shake").setAttribute("stdDeviation", shake.toFixed(2));
      ["#br", "#bg", "#bb"].forEach((id) => $(id).setAttribute("slope", slope.toFixed(3)));
      $("#noise").setAttribute("opacity", noise.toFixed(2));

      const notes = [];
      if (diff > 0.7) notes.push(`明るすぎ（+${diff.toFixed(1)}段）。${st.mode === "A" ? "シャッターが最速でも追いつかない。ISOを下げる" : "F値を大きく、またはシャッターを速く"}`);
      else if (diff < -0.7) notes.push(`暗すぎ（${diff.toFixed(1)}段）。ISOを上げるか、${st.mode === "M" ? "シャッターを遅く／F値を小さく" : "限界に達している"}`);
      else notes.push("明るさはちょうどいい");
      notes.push(bg > 5 ? "背景がよくぼけている" : bg < 1.5 ? "背景までくっきり" : "背景は少しぼける");
      notes.push(dog < 1.2 ? "走る犬も止まっている" : dog < 6 ? "犬が少しブレる" : "犬が大きく流れている");
      if (shake > 0) notes.push("手ブレしている（シャッターが遅すぎる）");
      if (noise > 0.25) notes.push("ノイズが目立つ");
      $('[data-o="read"]').textContent = notes.join("。") + "。";
    }

    root.addEventListener("click", (e) => {
      const b = e.target.closest(".seg button");
      if (!b) return;
      const k = b.parentElement.dataset.k;
      st[k] = k === "focal" ? Number(b.dataset.v) : b.dataset.v;
      if (k === "scene") st.iso = st.scene === "day" ? 0 : st.scene === "indoor" ? 5 : 7;
      render();
    });
    root.addEventListener("input", (e) => {
      const k = e.target.dataset.k;
      if (k) { st[k] = Number(e.target.value); render(); }
    });
    render();
  }

  window.Sim = { mount };
})();
