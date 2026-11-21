/* ============================================================
   Phigros Lab · 极简 QR 编码器（零依赖）
   byte 模式 / 纠错等级 M / 版本 1–10，足够放 TapTap 的扫码链接。
   只做「编码成 0/1 矩阵」，渲染交给调用方（浏览器画 SVG，Node 侧做测试）。
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PLQR = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------- GF(256) ---------- */
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

  function polyMul(a, b) {
    const out = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) {
      if (!a[i]) continue;
      for (let j = 0; j < b.length; j++) if (b[j]) out[i + j] ^= mul(a[i], b[j]);
    }
    return out;
  }

  /** 生成多项式 ∏(x - α^i)，降幂排列，首项为 1 */
  function genPoly(n) {
    let g = [1];
    for (let i = 0; i < n; i++) g = polyMul(g, [1, EXP[i]]);
    return g;
  }

  /** 多项式除法取余，得到 ecLen 个纠错码字 */
  function reedSolomon(data, ecLen) {
    const gen = genPoly(ecLen);
    const buf = data.concat(new Array(ecLen).fill(0));
    for (let i = 0; i < data.length; i++) {
      const factor = buf[i];
      if (!factor) continue;
      for (let j = 0; j < gen.length; j++) buf[i + j] ^= mul(gen[j], factor);
    }
    return buf.slice(data.length);
  }

  /* ---------- 规格表（纠错等级 M） ---------- */
  /* [总数据码字, 组1块数, 组1每块数据码字, 组2块数, 组2每块数据码字, 每块纠错码字] */
  const SPEC_M = {
    1: [16, 1, 16, 0, 0, 10],
    2: [28, 1, 28, 0, 0, 16],
    3: [44, 1, 44, 0, 0, 26],
    4: [64, 2, 32, 0, 0, 18],
    5: [86, 2, 43, 0, 0, 24],
    6: [108, 4, 27, 0, 0, 16],
    7: [124, 4, 31, 0, 0, 18],
    8: [154, 2, 38, 2, 39, 22],
    9: [182, 3, 36, 2, 37, 22],
    10: [216, 4, 43, 1, 44, 26]
  };

  const ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  const EC_BITS_M = 0;   // M = 00

  /** 6 位版本号 → 18 位 BCH（版本 ≥ 7 才写），生成多项式 0x1F25 */
  function versionBits(v) {
    let rem = v << 12;
    for (let i = 17; i >= 12; i--) {
      if ((rem >>> i) & 1) rem ^= 0x1f25 << (i - 12);
    }
    return (v << 12) | (rem & 0xfff);
  }

  /** 纠错等级 + 掩码 → 15 位格式信息 */
  function formatBits(mask) {
    const data = (EC_BITS_M << 3) | mask;   // 5 位
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) {
      if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
    }
    return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
  }

  const MASKS = [
    (i, j) => (i + j) % 2 === 0,
    (i) => i % 2 === 0,
    (i, j) => j % 3 === 0,
    (i, j) => (i + j) % 3 === 0,
    (i, j) => (((i / 2) | 0) + ((j / 3) | 0)) % 2 === 0,
    (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
    (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
    (i, j) => (((i + j) % 2) + ((i * j) % 3)) % 2 === 0
  ];

  /* ---------- 位流 ---------- */
  function dataBits(bytes, version) {
    const bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4);                                    // byte 模式
    push(bytes.length, version <= 9 ? 8 : 16);     // 字符数
    bytes.forEach(b => push(b, 8));
    return bits;
  }

  function toBytes(str) {
    const out = [];
    for (const ch of Array.from(String(str))) {
      const cp = ch.codePointAt(0);
      if (cp < 0x80) out.push(cp);
      else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
      else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    }
    return out;
  }

  function pickVersion(byteLen) {
    for (let v = 1; v <= 10; v++) {
      const cap = SPEC_M[v][0];
      const need = Math.ceil((4 + (v <= 9 ? 8 : 16) + byteLen * 8) / 8);
      if (need <= cap) return v;
    }
    throw new Error('内容过长，超出 10 版容量');
  }

  /** 位数 → 码字，补齐终止符与填充字节 */
  function bitsToCodewords(bits, cap) {
    const out = bits.slice(0, cap * 8);
    for (let i = 0; i < 4 && out.length < cap * 8; i++) out.push(0);
    while (out.length % 8) out.push(0);
    const cw = [];
    for (let i = 0; i < out.length; i += 8) {
      let b = 0;
      for (let k = 0; k < 8; k++) b = (b << 1) | out[i + k];
      cw.push(b);
    }
    const pads = [0xec, 0x11];
    let p = 0;
    while (cw.length < cap) cw.push(pads[p++ % 2]);
    return cw;
  }

  /** 按块切分、算纠错、交织 */
  function interleave(codewords, version) {
    const [, n1, d1, n2, d2, ecLen] = SPEC_M[version];
    const blocks = [];
    let p = 0;
    for (let i = 0; i < n1; i++) { blocks.push(codewords.slice(p, p + d1)); p += d1; }
    for (let i = 0; i < n2; i++) { blocks.push(codewords.slice(p, p + d2)); p += d2; }

    const ecs = blocks.map(b => reedSolomon(b, ecLen));
    const out = [];
    const maxData = Math.max(...blocks.map(b => b.length));
    for (let i = 0; i < maxData; i++) {
      for (const b of blocks) if (i < b.length) out.push(b[i]);
    }
    for (let i = 0; i < ecLen; i++) {
      for (const e of ecs) out.push(e[i]);
    }
    return out;
  }

  /* ---------- 矩阵 ---------- */
  function buildMatrix(version, codewords) {
    const size = version * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(0));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false)); // 功能模块占位

    const set = (r, c, v) => { if (r >= 0 && r < size && c >= 0 && c < size) { m[r][c] = v ? 1 : 0; fn[r][c] = true; } };

    /* 定位图案 + 分隔符 */
    const finder = (r0, c0) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = r0 + r, cc = c0 + c;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
          const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          set(rr, cc, inRing || inCore ? 1 : 0);
        }
      }
    };
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

    /* 定时图案 */
    for (let i = 8; i < size - 8; i++) {
      set(6, i, i % 2 === 0 ? 1 : 0);
      set(i, 6, i % 2 === 0 ? 1 : 0);
    }

    /* 校正图案 */
    const al = ALIGN[version];
    for (const r of al) {
      for (const c of al) {
        if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const ring = Math.max(Math.abs(dr), Math.abs(dc));
            set(r + dr, c + dc, ring === 2 || ring === 0 ? 1 : 0);
          }
        }
      }
    }

    /* 预留格式信息区（先占位，最后统一写） */
    for (let i = 0; i < 9; i++) {
      if (!fn[8][i]) { set(8, i, 0); }
      if (!fn[i][8]) { set(i, 8, 0); }
    }
    for (let i = 0; i < 8; i++) {
      set(8, size - 1 - i, 0);
      set(size - 1 - i, 8, 0);
    }
    /* 固定的暗模块 */
    set(size - 8, 8, 1);

    /* 版本信息（v≥7） */
    if (version >= 7) {
      const vb = versionBits(version);
      /* 两块 3×6：高 6 位在前，块内按列铺开，另一块是它的转置 */
      for (let i = 0; i < 18; i++) {
        const bit = (vb >>> i) & 1;
        const row = size - 11 + (i % 3);
        const col = Math.floor(i / 3);
        set(row, col, bit);
        set(col, row, bit);
      }
    }

    /* 数据放置：右下角起，两列一组蛇形 */
    let bitIdx = 0;
    const totalBits = codewords.length * 8;
    const nextBit = () => {
      if (bitIdx >= totalBits) return 0;
      const b = (codewords[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1;
      bitIdx++;
      return b;
    };
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;                       // 跳过竖直定时列
      for (let k = 0; k < size; k++) {
        const row = upward ? size - 1 - k : k;
        for (let t = 0; t < 2; t++) {
          const c = col - t;
          if (fn[row][c]) continue;
          m[row][c] = nextBit();
        }
      }
      upward = !upward;
    }

    return { m, fn, size };
  }

  function applyMask(m, fn, size, mask) {
    const test = MASKS[mask];
    const out = m.map(r => r.slice());
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (!fn[i][j] && test(i, j)) out[i][j] ^= 1;
      }
    }
    return out;
  }

  function writeFormat(m, size, mask) {
    const bits = formatBits(mask);
    const at = k => (bits >>> k) & 1;   // POS[0] 放最低位，与标准摆放顺序一致

    /* 第一份：竖着走左上角的第 8 列、再横着走第 8 行（跳过第 6 列/行） */
    const POS = [
      [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8],
      [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0]
    ];
    for (let i = 0; i < 15; i++) m[POS[i][0]][POS[i][1]] = at(i);

    /* 第二份：右上角横排 8 位 + 左下角竖排 7 位 */
    for (let i = 0; i < 8; i++) m[8][size - 1 - i] = at(i);
    for (let i = 8; i < 15; i++) m[size - 7 + (i - 8)][8] = at(i);
    return m;
  }

  /** 遮罩罚分，选最优 */
  function penalty(m, size) {
    let score = 0;
    const line = arr => {
      let run = 1, sum = 0;
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] === arr[i - 1]) run++;
        else { if (run >= 5) sum += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) sum += 3 + (run - 5);
      return sum;
    };
    for (let i = 0; i < size; i++) {
      score += line(m[i]);
      score += line(m.map(r => r[i]));
    }
    for (let i = 0; i < size - 1; i++) {
      for (let j = 0; j < size - 1; j++) {
        const v = m[i][j];
        if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) score += 3;
      }
    }
    const finderLike = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const seqScore = arr => {
      let s = 0;
      for (let i = 0; i + 11 <= arr.length; i++) {
        let same = true;
        for (let k = 0; k < 11; k++) if (arr[i + k] !== finderLike[k]) { same = false; break; }
        if (same) s += 40;
        same = true;
        for (let k = 0; k < 11; k++) if (arr[i + k] !== finderLike[10 - k]) { same = false; break; }
        if (same) s += 40;
      }
      return s;
    };
    for (let i = 0; i < size; i++) {
      score += seqScore(m[i]);
      score += seqScore(m.map(r => r[i]));
    }
    let dark = 0;
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) dark += m[i][j];
    const pct = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  /**
   * 编码成矩阵
   * @param {string} text
   * @returns {{size:number, version:number, mask:number, modules:number[][]}}
   */
  function encode(text) {
    const bytes = toBytes(text);
    const version = pickVersion(bytes.length);
    const cap = SPEC_M[version][0];
    const bits = dataBits(bytes, version);
    const cw = bitsToCodewords(bits, cap);
    const inter = interleave(cw, version);
    const { m, fn, size } = buildMatrix(version, inter);

    let best = null, bestMask = 0, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const masked = writeFormat(applyMask(m, fn, size, mask), size, mask);
      const sc = penalty(masked, size);
      if (sc < bestScore) { bestScore = sc; best = masked; bestMask = mask; }
    }
    return { size, version, mask: bestMask, modules: best };
  }

  /** 画成 SVG（一条 path，省体积） */
  function toSVG(qr, opts) {
    const o = opts || {};
    const margin = o.margin == null ? 4 : o.margin;
    const dark = o.dark || '#000000';
    const light = o.light || '#ffffff';
    const dim = qr.size + margin * 2;
    const d = [];
    for (let r = 0; r < qr.size; r++) {
      let c = 0;
      while (c < qr.size) {
        if (!qr.modules[r][c]) { c++; continue; }
        let run = 1;
        while (c + run < qr.size && qr.modules[r][c + run]) run++;
        d.push(`M${c + margin} ${r + margin}h${run}v1h-${run}z`);
        c += run;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
      `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
      `<path d="${d.join('')}" fill="${dark}"/></svg>`;
  }

  return { encode, toSVG };
});
