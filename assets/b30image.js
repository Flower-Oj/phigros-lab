/* ============================================================
   Phigros Lab · B30 分享图
   纯 SVG 拼版 → canvas 栅格化 → PNG 下载
   不用 foreignObject / 外部字体 / 外链图片，保证 canvas 不被污染
   ============================================================ */
(function () {
'use strict';

const PL = window.PL;
const t = (k, v) => (PL.t ? PL.t(k, v) : k);
const { S, esc, r2, r4, analysis, dateStr } = PL;

/* 与 --sans / --mono 对齐的字体栈；canvas 量宽度和 SVG 渲染必须用同一套 */
const FAM = "'Segoe UI','PingFang SC','Microsoft YaHei UI','Microsoft YaHei',system-ui,sans-serif";
const MONO = "'JetBrains Mono','Cascadia Mono',Consolas,ui-monospace,monospace";

const SITE = 'github.com/Flower-Oj/phigros-lab';

/* ---------- 文本量宽（用 canvas 精确量，不靠估算） ---------- */
let mctx = null;
function measure(text, size, opts) {
  const o = opts || {};
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  mctx.font = `${o.weight || 400} ${size}px ${o.mono ? MONO : FAM}`;
  return mctx.measureText(String(text == null ? '' : text)).width;
}

/** 超宽就截断加省略号，保证不越界 */
function fit(text, maxW, size, opts) {
  let s = String(text == null ? '' : text);
  if (measure(s, size, opts) <= maxW) return s;
  const dots = '…';
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(s.slice(0, mid) + dots, size, opts) <= maxW) lo = mid; else hi = mid - 1;
  }
  return s.slice(0, Math.max(1, lo)) + dots;
}

/* ---------- 从 CSS 变量取当前主题色，保证和页面一致 ---------- */
function pal() {
  const cs = getComputedStyle(document.documentElement);
  const g = n => cs.getPropertyValue(n).trim();
  return {
    bg: g('--bg'), panel: g('--panel'), panel2: g('--panel-2'), panel3: g('--panel-3'),
    line: g('--line'), text: g('--text'), text2: g('--text-2'), text3: g('--text-3'),
    accent: g('--accent'), accent2: g('--accent-2'), mint: g('--mint'),
    rose: g('--rose'), amber: g('--amber'), sky: g('--sky')
  };
}

const DIFF_COLOR = { AT: 'rose', HD: 'amber', EZ: 'mint', IN: 'accent2' };

function hexA(hex, a) {
  const h = String(hex).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(h);
  if (!m) return h;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* 深色底还是浅色字，按底色亮度自动选，别让难度标签在曲绘上看不清 */
function contrastOn(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
  return L > 0.42 ? '#0b0d12' : '#ffffff';
}

/* ---------- 拼版 ---------- */
/* 版式：顶部信息条 + 5 列卡片墙（每格一张谱）+ 页脚，参照社区常见的评级出图 */
const W = 900;
const PAD = 32;
const RIGHT = W - PAD;
const COLS = 5;
const GAP = 10;
const CARD_W = (RIGHT - PAD - GAP * (COLS - 1)) / COLS;
const CARD_H = 158;
const COVER_H = 90;          /* 曲绘区高度，没有曲绘时这块就是难度色块 */
const HEAD_H = 174;

/** 按宽度折行，超过行数就把最后一行截断加省略号 */
function wrap(text, maxW, size, maxLines, opts) {
  const src = String(text == null ? '' : text).trim();
  const out = [];
  let rest = src;
  while (rest && out.length < maxLines) {
    if (measure(rest, size, opts) <= maxW) { out.push(rest); rest = ''; break; }
    let lo = 1, hi = rest.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (measure(rest.slice(0, mid), size, opts) <= maxW) lo = mid; else hi = mid - 1;
    }
    /* 断点落在单词中间时，回退到最近的空格/连字符，别把 Rework 劈成 R|ework */
    if (lo < rest.length && !/[\s\-–—/,.)]/.test(rest.charAt(lo))) {
      const seg = rest.slice(0, lo);
      const sp = Math.max(seg.lastIndexOf(' '), seg.lastIndexOf('-'), seg.lastIndexOf('/'));
      if (sp >= Math.max(3, Math.floor(lo * 0.45))) lo = sp + 1;
    }
    out.push(rest.slice(0, lo).replace(/\s+$/, ''));
    rest = rest.slice(lo).replace(/^\s+/, '');
  }
  if (rest && out.length) {
    const last = out[out.length - 1];
    out[out.length - 1] = fit(last.replace(/\s+$/, '') + '…', maxW, size, opts);
  }
  return out.length ? out : [''];
}

function buildSVG(jackets) {
  const A = analysis();
  const rows = A.sorted.slice(0, 30);
  if (!rows.length) throw new Error(t('toast.needData'));
  const arts = jackets || new Map();

  const p = pal();
  /* 浅色主题下 7~8px 的小字用 text-3 太淡，改吃 text-2 */
  const dark = document.documentElement.dataset.theme !== 'light';
  const small = dark ? p.text3 : p.text2;

  const gridRows = Math.ceil(rows.length / COLS);
  const gridH = gridRows * CARD_H + (gridRows - 1) * GAP;
  const FOOT_Y = HEAD_H + gridH + 24;
  const H = Math.round(FOOT_Y + 60);

  const L = [];
  L.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FAM}">`);

  /* --- defs --- */
  L.push('<defs>');
  L.push(`<linearGradient id="rks" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.mint}"/></linearGradient>`);
  /* 用绝对坐标，短图时不会把整张糊成一块渐变 */
  L.push(`<radialGradient id="g1" gradientUnits="userSpaceOnUse" cx="120" cy="10" r="${Math.min(700, Math.round(H * 0.7))}">
    <stop offset="0" stop-color="${p.accent}" stop-opacity="0.18"/>
    <stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>`);
  L.push(`<radialGradient id="g2" gradientUnits="userSpaceOnUse" cx="${W - 40}" cy="${H}" r="${Math.min(600, Math.round(H * 0.55))}">
    <stop offset="0" stop-color="${p.mint}" stop-opacity="0.10"/>
    <stop offset="1" stop-color="${p.mint}" stop-opacity="0"/></radialGradient>`);
  /* 曲绘下沿压暗，和正文区衔接 */
  L.push(`<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${p.panel2 || p.panel}" stop-opacity="0"/>
    <stop offset="1" stop-color="${p.panel2 || p.panel}" stop-opacity="0.9"/></linearGradient>`);
  L.push('</defs>');

  /* --- 背景 --- */
  L.push(`<rect width="${W}" height="${H}" fill="${p.bg}"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#g1)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#g2)"/>`);

  /* --- 顶栏：品牌 + 数据来源徽章 --- */
  L.push(`<text x="${PAD}" y="38" font-size="11" letter-spacing="3.2" fill="${p.accent}"
    font-family="${MONO}">PHIGROS LAB</text>`);

  let bx = RIGHT;
  const badges = [];
  if (S.source === 'demo') badges.push({ txt: 'DEMO', fg: p.amber, bg: hexA(p.amber, .16) });
  badges.push(A.hasOff
    ? { txt: t('ov.official'), fg: p.accent2, bg: hexA(p.accent, .16) }
    : { txt: t('ov.estimate'), fg: small, bg: hexA(small, .16) });

  badges.reverse().forEach(b => {
    const tw = measure(b.txt, 10.5, { weight: 600 });
    const bw = tw + 18;
    bx -= bw;
    L.push(`<rect x="${bx}" y="22" width="${bw}" height="20" rx="10" fill="${b.bg}"/>`);
    L.push(`<text x="${bx + bw / 2}" y="36" font-size="10.5" font-weight="600" fill="${b.fg}"
      text-anchor="middle">${esc(b.txt)}</text>`);
    bx -= 8;
  });

  /* --- 玩家名 + 三项小指标 --- */
  const nick = (S.nick || '').trim() || t('poster.noName');
  L.push(`<text x="${PAD}" y="80" font-size="26" font-weight="600" fill="${p.text}">${esc(fit(nick, 460, 26, { weight: 600 }))}</text>`);

  const meta = `${t('stat.acc')} ${r2(A.avgAcc30)}%   ·   ${t('ov.cutoff')} ${r2(A.cutoff)}   ·   ${t('poster.records')} ${A.n}`;
  L.push(`<text x="${PAD}" y="104" font-size="10.5" fill="${small}">${esc(fit(meta, 460, 10.5))}</text>`);

  /* --- 右侧大号 RKS + B27/B3 拆分 --- */
  L.push(`<text x="${RIGHT}" y="68" font-size="10" letter-spacing="1.6" fill="${small}"
    text-anchor="end" font-family="${MONO}">RKS</text>`);
  L.push(`<text x="${RIGHT + 2}" y="120" font-size="48" font-weight="700" fill="url(#rks)"
    font-family="${MONO}" text-anchor="end" letter-spacing="-1">${r4(A.eff)}</text>`);
  const b3avg = A.sum3 != null ? r2(A.sum3 / 3) : '—';
  const split = `${t('poster.b27')} ${A.best27.length >= 27 ? r2(A.sum27 / 27) : '—'}   +   ${t('poster.b3')} ${b3avg}`;
  L.push(`<text x="${RIGHT}" y="140" font-size="10" fill="${small}" text-anchor="end"
    font-family="${MONO}">${esc(split)}</text>`);

  /* --- 分隔线 --- */
  L.push(`<line x1="${PAD}" y1="158" x2="${RIGHT}" y2="158" stroke="${p.line}" stroke-width="1"/>`);

  /* --- 卡片墙 --- */
  rows.forEach((r, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (CARD_W + GAP);
    const y = HEAD_H + row * (CARD_H + GAP);
    const top3 = i < 3;

    const dcol = p[DIFF_COLOR[r.d] || 'accent2'];
    /* 成绩段染色：金 → 橙 → 蓝 → 灰，卡片边框和底色跟着走 */
    const tier = r.a >= 99.995 ? p.mint : r.a >= 99 ? p.amber : r.a >= 98 ? p.sky : small;

    const X = x.toFixed(2);
    const Wd = CARD_W.toFixed(2);
    const TX = (x + 12).toFixed(2);
    const TR = (x + CARD_W - 12).toFixed(2);
    const art = arts.get(artKey(r));

    /* 卡底 + 成绩段淡染 + 曲绘，统一裁进圆角 */
    L.push(`<clipPath id="cw${i}"><rect x="${X}" y="${y}" width="${Wd}" height="${CARD_H}" rx="10"/></clipPath>`);
    L.push(`<g clip-path="url(#cw${i})">`);
    L.push(`<rect x="${X}" y="${y}" width="${Wd}" height="${CARD_H}" fill="${p.panel2 || p.panel}"/>`);
    L.push(`<rect x="${X}" y="${y}" width="${Wd}" height="${CARD_H}" fill="${hexA(tier, dark ? .07 : .03)}"/>`);
    if (art) {
      L.push(`<image x="${X}" y="${y}" width="${Wd}" height="${COVER_H}"
        preserveAspectRatio="xMidYMid slice" href="${art}"/>`);
      L.push(`<rect x="${X}" y="${y + COVER_H - 26}" width="${Wd}" height="26" fill="url(#fade)"/>`);
    } else {
      /* 没曲绘（下架曲 / 新曲 / 离线）就用难度色块顶上，版式保持一致 */
      L.push(`<rect x="${X}" y="${y}" width="${Wd}" height="${COVER_H}" fill="${hexA(dcol, dark ? .34 : .2)}"/>`);
      L.push(`<text x="${(x + CARD_W - 12).toFixed(2)}" y="${y + COVER_H - 16}" font-size="44" font-weight="700"
        text-anchor="end" font-family="${MONO}" fill="${dcol}" opacity="0.26">${esc(r.d)}</text>`);
    }
    L.push(`<rect x="${X}" y="${y + COVER_H - 2}" width="${Wd}" height="2" fill="${dcol}" opacity="0.65"/>`);
    L.push('</g>');
    L.push(`<rect x="${X}" y="${y}" width="${Wd}" height="${CARD_H}" rx="10" fill="none"
      stroke="${top3 ? hexA(p.mint, .6) : hexA(tier, .24)}" stroke-width="1"/>`);

    /* 序号：压在曲绘上，用半透明黑底保证任何图上都读得清 */
    const idx = String(i + 1).padStart(2, '0');
    const iw = measure(idx, 8.5, { mono: true, weight: 600 });
    L.push(`<rect x="${(x + 8).toFixed(2)}" y="${y + 9}" width="${(iw + 11).toFixed(2)}" height="15" rx="4"
      fill="rgba(0,0,0,.52)"/>`);
    L.push(`<text x="${(x + 8 + (iw + 11) / 2).toFixed(2)}" y="${y + 19.6}" font-size="8.5" font-weight="600"
      text-anchor="middle" font-family="${MONO}" fill="${top3 ? p.mint : '#ffffff'}">${idx}</text>`);

    /* Phi / FC 角标跟在序号后面 */
    const tag = r.a >= 99.995 ? 'PHI' : (r.fc ? 'FC' : '');
    if (tag) {
      const tw = measure(tag, 7.5, { weight: 700 }) + 9;
      const tx = x + 8 + iw + 11 + 4;
      if (tx + tw < x + CARD_W - 62) {
        L.push(`<rect x="${tx.toFixed(2)}" y="${y + 9.5}" width="${tw.toFixed(2)}" height="14" rx="3.5"
          fill="rgba(0,0,0,.52)"/>`);
        L.push(`<text x="${(tx + tw / 2).toFixed(2)}" y="${y + 19.5}" font-size="7.5" font-weight="700"
          text-anchor="middle" fill="${tag === 'PHI' ? p.mint : '#ffffff'}">${tag}</text>`);
      }
    }

    /* 难度标签 */
    const dl = `${r.d} ${r2(r.c)}`;
    const dw = measure(dl, 8.5, { mono: true }) + 12;
    L.push(`<rect x="${(x + CARD_W - 8 - dw).toFixed(2)}" y="${y + 9}" width="${dw.toFixed(2)}" height="15"
      rx="4" fill="${hexA(dcol, .94)}"/>`);
    L.push(`<text x="${(x + CARD_W - 8 - dw / 2).toFixed(2)}" y="${y + 19.6}" font-size="8.5" fill="${contrastOn(dcol)}"
      text-anchor="middle" font-family="${MONO}" font-weight="600">${esc(dl)}</text>`);

    /* 曲名：最多两行 */
    const lines = wrap(r.n, CARD_W - 24, 11.5, 2);
    lines.forEach((ln, k) => {
      L.push(`<text x="${TX}" y="${y + 108 + k * 14}" font-size="11.5" fill="${p.text}">${esc(ln)}</text>`);
    });

    /* 达成率 / 单曲 RKS：小标签在上，数值在下 */
    L.push(`<text x="${TX}" y="${y + 136}" font-size="7" letter-spacing="1" fill="${small}"
      font-family="${MONO}">${esc(t('poster.accShort'))}</text>`);
    L.push(`<text x="${TX}" y="${y + 151}" font-size="13.5" font-weight="700" font-family="${MONO}"
      fill="${r.a >= 99.995 ? p.mint : p.text}">${esc(r2(r.a) + '%')}</text>`);

    L.push(`<text x="${TR}" y="${y + 136}" font-size="7" letter-spacing="1" fill="${small}"
      text-anchor="end" font-family="${MONO}">RKS</text>`);
    L.push(`<text x="${TR}" y="${y + 151}" font-size="13" font-weight="600" font-family="${MONO}"
      text-anchor="end" fill="${top3 ? p.mint : p.accent2}">${r2(r.rk)}</text>`);
  });

  /* --- 页脚 --- */
  L.push(`<line x1="${PAD}" y1="${FOOT_Y}" x2="${RIGHT}" y2="${FOOT_Y}" stroke="${p.line}" stroke-width="1"/>`);
  L.push(`<text x="${PAD}" y="${FOOT_Y + 22}" font-size="10" fill="${small}">${esc(t('footer.formula'))}</text>`);

  /* 难度配色图例，右对齐，从右往左排 */
  const lg = [
    { c: p[DIFF_COLOR.EZ], s: 'EZ' },
    { c: p[DIFF_COLOR.HD], s: 'HD' },
    { c: p[DIFF_COLOR.IN], s: 'IN' },
    { c: p[DIFF_COLOR.AT], s: 'AT' }
  ];
  let lx = RIGHT;
  lg.slice().reverse().forEach(it => {
    const tw = measure(it.s, 9, { mono: true });
    lx -= tw;
    L.push(`<text x="${lx.toFixed(2)}" y="${FOOT_Y + 22}" font-size="9" fill="${small}"
      font-family="${MONO}">${esc(it.s)}</text>`);
    lx -= 4 + 6;
    L.push(`<rect x="${(lx).toFixed(2)}" y="${FOOT_Y + 16}" width="6" height="6" rx="1.5" fill="${it.c}"/>`);
    lx -= 12;
  });

  L.push(`<text x="${PAD}" y="${FOOT_Y + 44}" font-size="10.5" fill="${p.accent}">${esc(t('poster.madeBy'))}</text>`);
  L.push(`<text x="${RIGHT}" y="${FOOT_Y + 44}" font-size="10" fill="${small}" text-anchor="end"
    font-family="${MONO}">${esc(SITE + ' · ' + dateStr(Date.now()))}</text>`);

  L.push('</svg>');
  return { svg: L.join(''), w: W, h: H, count: rows.length };
}

/* ---------- 栅格化 ---------- */
function rasterize(svg, w, h, scale) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = Math.round(w * scale);
        cv.height = Math.round(h * scale);
        const cx = cv.getContext('2d');
        cx.imageSmoothingQuality = 'high';
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG rasterize failed')); };
    img.src = url;
  });
}

function safeName(s) {
  return String(s || 'player').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 24);
}

/* ---------- 曲绘 ---------- */
/* 走本站 /api/jacket/<曲名.曲师>：服务端已经把原图缩成 320px 的 webp 并落盘缓存，
   所以这里拿到的都是十几 KB 的小图。曲绘本项目不分发，导出时按需取，
   取不到（下架曲 / 新曲 / 离线 / 双击打开的 file://）就跳过，版式退回难度色块。
   图片必须内联成 dataURL —— SVG 经 Blob → <img> → canvas 这条路不会去加载外链。 */
const ART_CACHE = new Map();   // id -> dataURL（只缓存成功的）
/* 曲绘 URL 带版本号：老版本曾经把 404 缓存住，换个版本号让浏览器重新取一次 */
const ART_VER = 2;

/* 曲绘的键：优先用曲库 id，查不到的（示例曲 / 新曲）退回曲名，
   服务端还有一级「只按曲名」的兜底匹配 */
function artKey(r) {
  return PL.resolveId(r) || String((r && r.n) || '').trim();
}

function blobDataURL(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error('read failed'));
    fr.readAsDataURL(blob);
  });
}

async function loadJackets(rows, onProgress) {
  const out = new Map();
  /* 双击 index.html 打开时没有服务端，直接跳过，别发一堆必然失败的请求 */
  if (location.protocol === 'file:') return out;

  const ids = [];
  for (const r of rows) {
    const id = artKey(r);
    if (id && ids.indexOf(id) < 0) ids.push(id);
  }
  let done = 0;
  const tick = () => {
    done += 1;
    if (onProgress) { try { onProgress(done, ids.length); } catch (e) {} }
  };

  let cursor = 0;
  const worker = async () => {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      if (ART_CACHE.has(id)) { out.set(id, ART_CACHE.get(id)); tick(); continue; }
      try {
        /* 走默认缓存策略：命中过的图服务端带 immutable，浏览器自然会留；
           不能写 force-cache，否则会把以前那次 404 当结果一直用下去 */
        const res = await fetch('/api/jacket/' + encodeURIComponent(id) + '?v=' + ART_VER);
        if (!res.ok) throw new Error('http ' + res.status);
        const url = await blobDataURL(await res.blob());
        ART_CACHE.set(id, url);
        out.set(id, url);
      } catch (e) {
        /* 这次的失败不进缓存：可能是瞬时网络问题，下次导出再试一遍 */
      }
      tick();
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, ids.length) }, worker));
  return out;
}

/**
 * 生成并下载 B30 图片
 * @param {{scale?:number, download?:boolean, art?:boolean, onProgress?:Function}} opts
 * @returns {Promise<{blob:Blob, filename:string}>}
 */
async function exportB30Image(opts) {
  const o = opts || {};
  const rows = analysis().sorted.slice(0, 30);
  let jackets = new Map();
  if (o.art !== false && rows.length) {
    try { jackets = await loadJackets(rows, o.onProgress); } catch (e) { jackets = new Map(); }
  }
  const pack = buildSVG(jackets);
  const scale = o.scale || 2;
  const blob = await rasterize(pack.svg, pack.w, pack.h, scale);

  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const filename = `phigros-b30-${safeName(S.nick)}-${stamp}.png`;

  if (o.download !== false) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return {
    blob, filename, width: Math.round(pack.w * scale), height: Math.round(pack.h * scale),
    cards: pack.count, art: jackets.size
  };
}

Object.assign(PL, {
  buildB30SVG: jackets => buildSVG(jackets),
  exportB30Image,
  rasterizeSVG: rasterize,
  loadJackets
});
})();
