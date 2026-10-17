// 小さなExifパーサー。JPEGの APP1 から、診断に使うタグだけを読む。
// 写真のデータはどこにも送らない。範囲外を指すオフセットは無視して、落ちずに null か空を返す。
(function (root) {
  const IFD0 = { 0x010f: "make", 0x0110: "model", 0x0112: "orientation" };
  const EXIF = {
    0x9003: "date", 0x829a: "exposureTime", 0x829d: "fNumber", 0x8822: "program", 0x8827: "iso",
    0x9204: "bias", 0x9207: "metering", 0x9209: "flash", 0x920a: "focalLength",
    0xa405: "focal35", 0xa406: "sceneType", 0xa403: "whiteBalance", 0xa434: "lens",
  };
  const SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

  function readExif(buf) {
    try {
      const dv = new DataView(buf);
      const len = dv.byteLength;
      if (len < 4 || dv.getUint16(0) !== 0xffd8) return null;
      let p = 2;
      while (p + 4 <= len) {
        if (dv.getUint8(p) !== 0xff) return null;
        const marker = dv.getUint8(p + 1);
        if (marker === 0xda || marker === 0xd9) return null; // 画像データに入った
        if (marker === 0xff) { p++; continue; }
        const size = dv.getUint16(p + 2);
        if (marker === 0xe1 && p + 10 <= len && dv.getUint32(p + 4) === 0x45786966 && dv.getUint16(p + 8) === 0) {
          return parseTiff(dv, p + 10, Math.min(len, p + 2 + size));
        }
        p += 2 + size;
      }
    } catch (e) {}
    return null;
  }

  function parseTiff(dv, base, end) {
    if (base + 8 > end) return null;
    const bom = dv.getUint16(base);
    if (bom !== 0x4949 && bom !== 0x4d4d) return null;
    const le = bom === 0x4949;
    const ok = (o, n) => o >= base && o + n <= end;
    const u16 = (o) => (ok(o, 2) ? dv.getUint16(o, le) : 0);
    const u32 = (o) => (ok(o, 4) ? dv.getUint32(o, le) : 0);
    const s32 = (o) => (ok(o, 4) ? dv.getInt32(o, le) : 0);
    if (u16(base + 2) !== 42) return null;

    function value(type, count, entry) {
      const unit = SIZE[type];
      if (!unit || count < 1 || count > 4096) return undefined;
      const total = unit * count;
      const at = total <= 4 ? entry + 8 : base + u32(entry + 8);
      if (!ok(at, total)) return undefined;
      if (type === 2) {
        let s = "";
        for (let i = 0; i < count; i++) { const c = dv.getUint8(at + i); if (c === 0) break; s += String.fromCharCode(c); }
        return s.trim();
      }
      const one = (i) => {
        const o = at + i * unit;
        if (type === 1 || type === 7) return dv.getUint8(o);
        if (type === 3) return u16(o);
        if (type === 4) return u32(o);
        if (type === 9) return s32(o);
        const num = type === 10 ? s32(o) : u32(o), den = type === 10 ? s32(o + 4) : u32(o + 4);
        return den ? num / den : null;
      };
      return count === 1 ? one(0) : Array.from({ length: Math.min(count, 8) }, (_, i) => one(i));
    }

    function readIfd(off, names, out) {
      const at = base + off;
      if (!ok(at, 2)) return null;
      const n = u16(at);
      let exifPtr = null;
      for (let i = 0; i < n && i < 256; i++) {
        const e = at + 2 + i * 12;
        if (!ok(e, 12)) break;
        const tag = u16(e);
        if (tag === 0x8769) { exifPtr = u32(e + 8); continue; }
        const name = names[tag];
        if (!name) continue;
        const v = value(u16(e + 2), u32(e + 4), e);
        if (v !== undefined) out[name] = Array.isArray(v) ? v[0] : v;
      }
      return exifPtr;
    }

    const out = {};
    const ptr = readIfd(u32(base + 4), IFD0, out);
    if (ptr) readIfd(ptr, EXIF, out);
    return Object.keys(out).length ? out : null;
  }

  root.readExif = readExif;
})(typeof window !== "undefined" ? window : globalThis);
