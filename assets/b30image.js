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
const DIFF_SOFT = { AT: 'roseSoft', HD: 'amberSoft', EZ: 'mintSoft', IN: 'accentSoft' };

function soft(p) {
  /* 把基础色转成同色系的低透明度版本，用在难度标签底色上 */
  const out = {};
  out.roseSoft = hexA(p.rose, .14);
  out.amberSoft = hexA(p.amber, .14);
  out.mintSoft = hexA(p.mint, .14);
  out.accentSoft = hexA(p.accent, .14);
  return out;
}

function hexA(hex, a) {
  const h = String(hex).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(h);
  if (!m) return h;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---------- 拼版 ---------- */
/* 版式：顶部信息条 + 5 列卡片墙（每格一张谱）+ 页脚，参照社区常见的评级出图 */
const W = 900;
const PAD = 32;
const RIGHT = W - PAD;
const COLS = 5;
const GAP = 10;
const CARD_W = (RIGHT - PAD - GAP * (COLS - 1)) / COLS;
const CARD_H = 112;
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

function buildSVG() {
  const A = analysis();
  const rows = A.sorted.slice(0, 30);
  if (!rows.length) throw new Error(t('toast.needData'));

  const p = pal();
  const s = soft(p);
  /* 浅色主题下 7~8px 的小字用 text-3 太淡，改吃 text-2 */
  const dark = document.documentElement.dataset.theme !== 'light';
  const small = dark ? p.text3 : p.text2;

  const rkAll = rows.map(r => r.rk);
  const maxRk = Math.max(...rkAll);
  const minRk = Math.min(...rkAll);
  const span = Math.max(0.0001, maxRk - minRk);

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
    const ratio = 0.06 + 0.94 * (r.rk - minRk) / span;

    const dcol = p[DIFF_COLOR[r.d] || 'accent2'];
    const dsoft = s[DIFF_SOFT[r.d] || 'accentSoft'];
    /* 成绩段染色：金 → 橙 → 蓝 → 灰，卡片边框和底色跟着走 */
    const tier = r.a >= 99.995 ? p.mint : r.a >= 99 ? p.amber : r.a >= 98 ? p.accent2 : small;

    const X = x.toFixed(2);
    const Wd = CARD_W.toFixed(2);
    const TX = (x + 14).toFixed(2);          /* 文字左边线，让开左侧色条 */
    const TR = (x + CARD_W - 12).toFixed(2); /* 文字右边线 */

    /* 卡底 + 成绩段淡染 + 左侧难度色条，统一裁进圆角 */
    L.push(`<clipPath id="cw${i}"><rect x="${X}" y="${y}" width="${Wd}" height="${CARD_H}" rx="10"/></clipPath>`);
    L.push(`<g clip-path="url(#cw${i})">`);
    L.push(`<rect x="${X}" y="${y}" width="${Wd}" height="${CARD_H}" fill="${p.panel2 || p.panel}"/>`);
    L.push(`<rect x="${X}" y="${y}" width="${Wd}" height="${CARD_H}" fill="${hexA(tier, dark ? .07 : .05)}"/>`);
    L.push(`<rect x="${X}" y="${y}" width="4" height="${CARD_H}" fill="${dcol}"/>`);
    L.push('</g>');
    L.push(`<rect x="${X}" y="${y}" width="${Wd}" height="${CARD_H}" rx="10" fill="none"
      stroke="${top3 ? hexA(p.mint, .55) : hexA(tier, dark ? .22 : .34)}" stroke-width="1"/>`);

    /* 序号 + Phi/FC 角标 */
    L.push(`<text x="${TX}" y="${y + 24}" font-size="9" fill="${top3 ? p.mint : small}"
      font-family="${MONO}" font-weight="${top3 ? 600 : 400}">${String(i + 1).padStart(2, '0')}</text>`);
    const tag = r.a >= 99.995 ? 'PHI' : (r.fc ? 'FC' : '');
    if (tag) {
      const iw = measure(String(i + 1).padStart(2, '0'), 9, { mono: true });
      const tw = measure(tag, 7.5, { weight: 700 }) + 8;
      const tx = x + 14 + iw + 5;
      if (tx + tw < x + CARD_W - 62) {
        L.push(`<rect x="${tx.toFixed(2)}" y="${y + 13}" width="${tw.toFixed(2)}" height="14" rx="3.5"
          fill="${tag === 'PHI' ? s.mintSoft : s.accentSoft}"/>`);
        L.push(`<text x="${(tx + tw / 2).toFixed(2)}" y="${y + 23}" font-size="7.5" font-weight="700"
          text-anchor="middle" fill="${tag === 'PHI' ? p.mint : p.accent2}">${tag}</text>`);
      }
    }

    /* 难度标签 */
    const dl = `${r.d} ${r2(r.c)}`;
    const dw = measure(dl, 8.5, { mono: true }) + 12;
    L.push(`<rect x="${(x + CARD_W - 12 - dw).toFixed(2)}" y="${y + 13}" width="${dw.toFixed(2)}" height="15"
      rx="4" fill="${dsoft}"/>`);
    L.push(`<text x="${(x + CARD_W - 12 - dw / 2).toFixed(2)}" y="${y + 23.5}" font-size="8.5" fill="${dcol}"
      text-anchor="middle" font-family="${MONO}">${esc(dl)}</text>`);

    /* 曲名：最多两行 */
    const lines = wrap(r.n, CARD_W - 26, 11.5, 2);
    lines.forEach((ln, k) => {
      L.push(`<text x="${TX}" y="${y + 46 + k * 14}" font-size="11.5" fill="${p.text}">${esc(ln)}</text>`);
    });

    /* 左下达成率 / 右下单曲 RKS：小标签在上，数值在下 */
    L.push(`<text x="${TX}" y="${y + 76}" font-size="7" letter-spacing="1" fill="${small}"
      font-family="${MONO}">${esc(t('poster.accShort'))}</text>`);
    L.push(`<text x="${TX}" y="${y + 89}" font-size="14" font-weight="700" font-family="${MONO}"
      fill="${r.a >= 99.995 ? p.mint : p.text}">${esc(r2(r.a) + '%')}</text>`);

    L.push(`<text x="${TR}" y="${y + 76}" font-size="7" letter-spacing="1" fill="${small}"
      text-anchor="end" font-family="${MONO}">RKS</text>`);
    L.push(`<text x="${TR}" y="${y + 89}" font-size="13" font-weight="600" font-family="${MONO}"
      text-anchor="end" fill="${top3 ? p.mint : p.accent2}">${r2(r.rk)}</text>`);

    /* 底部强度条：同批曲目之间的相对强弱 */
    const bw = CARD_W - 26;
    L.push(`<rect x="${TX}" y="${y + 100}" width="${bw.toFixed(2)}" height="3" rx="1.5" fill="${p.line}"/>`);
    L.push(`<rect x="${TX}" y="${y + 100}" width="${(bw * ratio).toFixed(2)}" height="3"
      rx="1.5" fill="${dcol}" opacity="0.9"/>`);
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

/**
 * 生成并下载 B30 图片
 * @param {{scale?:number, download?:boolean}} opts
 * @returns {Promise<{blob:Blob, filename:string}>}
 */
async function exportB30Image(opts) {
  const o = opts || {};
  const pack = buildSVG();
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

  return { blob, filename, width: Math.round(pack.w * scale), height: Math.round(pack.h * scale) };
}

Object.assign(PL, { buildB30SVG: buildSVG, exportB30Image, rasterizeSVG: rasterize });
})();
