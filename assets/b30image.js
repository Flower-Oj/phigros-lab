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
    bg: g('--bg'), panel: g('--panel'), panel3: g('--panel-3'),
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
const W = 900;
const PAD = 40;
const RIGHT = W - PAD;

function buildSVG() {
  const A = analysis();
  const rows = A.sorted.slice(0, 30);
  if (!rows.length) throw new Error(t('toast.needData'));

  const p = pal();
  const s = soft(p);

  const rkAll = rows.map(r => r.rk);
  const maxRk = Math.max(...rkAll);
  const minRk = Math.min(...rkAll);
  const span = maxRk - minRk;

  const HEAD = 252;          // 表头以下开始画行
  const ROW_H = 38;
  const rowsH = rows.length * ROW_H;
  const FOOT_Y = HEAD + rowsH + 8;
  const H = Math.round(FOOT_Y + 84);

  const L = [];
  L.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FAM}">`);

  /* --- defs --- */
  L.push('<defs>');
  L.push(`<linearGradient id="rks" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.mint}"/></linearGradient>`);
  /* 用绝对坐标，短图时不会把整张糊成一块渐变 */
  L.push(`<radialGradient id="g1" gradientUnits="userSpaceOnUse" cx="150" cy="30" r="${Math.min(640, Math.round(H * 0.75))}">
    <stop offset="0" stop-color="${p.accent}" stop-opacity="0.20"/>
    <stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>`);
  L.push(`<radialGradient id="g2" gradientUnits="userSpaceOnUse" cx="840" cy="${H}" r="${Math.min(520, Math.round(H * 0.6))}">
    <stop offset="0" stop-color="${p.mint}" stop-opacity="0.12"/>
    <stop offset="1" stop-color="${p.mint}" stop-opacity="0"/></radialGradient>`);
  L.push('</defs>');

  /* --- 背景 --- */
  L.push(`<rect width="${W}" height="${H}" fill="${p.bg}"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#g1)"/>`);
  L.push(`<rect width="${W}" height="${H}" fill="url(#g2)"/>`);

  /* --- 顶栏：品牌 + 数据来源徽章 --- */
  L.push(`<text x="${PAD}" y="58" font-size="11" letter-spacing="3.2" fill="${p.accent}"
    font-family="${MONO}">PHIGROS LAB</text>`);

  let bx = RIGHT;
  const badges = [];
  if (S.source === 'demo') badges.push({ txt: 'DEMO', fg: p.amber, bg: hexA(p.amber, .16) });
  badges.push(A.hasOff
    ? { txt: t('ov.official'), fg: p.accent2, bg: hexA(p.accent, .16) }
    : { txt: t('ov.estimate'), fg: p.text3, bg: hexA(p.text3, .16) });

  badges.reverse().forEach(b => {
    const tw = measure(b.txt, 10.5, { weight: 600 });
    const bw = tw + 18;
    bx -= bw;
    L.push(`<rect x="${bx}" y="44" width="${bw}" height="20" rx="10" fill="${b.bg}"/>`);
    L.push(`<text x="${bx + bw / 2}" y="58" font-size="10.5" font-weight="600" fill="${b.fg}"
      text-anchor="middle">${esc(b.txt)}</text>`);
    bx -= 8;
  });

  /* --- 玩家名 --- */
  const nick = (S.nick || '').trim() || t('poster.noName');
  L.push(`<text x="${PAD}" y="106" font-size="25" font-weight="600" fill="${p.text}">${esc(fit(nick, 420, 25, { weight: 600 }))}</text>`);

  /* --- 大号 RKS --- */
  L.push(`<text x="${PAD}" y="140" font-size="11" letter-spacing="1.4" fill="${p.text3}">${esc(t('ov.rks'))}</text>`);
  L.push(`<text x="${PAD - 2}" y="198" font-size="50" font-weight="700" fill="url(#rks)"
    font-family="${MONO}" letter-spacing="-1">${r4(A.eff)}</text>`);

  /* --- 右侧三项小指标 --- */
  const stats = [
    [t('stat.acc'), r2(A.avgAcc30) + '%'],
    [t('ov.cutoff'), r2(A.cutoff)],
    [t('poster.records'), String(A.n)]
  ];
  stats.forEach((row, i) => {
    const y = 136 + i * 26;
    const vw = measure(row[1], 12.5, { mono: true });
    L.push(`<text x="${RIGHT}" y="${y}" font-size="12.5" fill="${p.text2}" text-anchor="end" font-family="${MONO}">${esc(row[1])}</text>`);
    L.push(`<text x="${RIGHT - vw - 10}" y="${y}" font-size="11" fill="${p.text3}" text-anchor="end">${esc(row[0])}</text>`);
  });

  /* --- 分隔线 --- */
  L.push(`<line x1="${PAD}" y1="216" x2="${RIGHT}" y2="216" stroke="${p.line}" stroke-width="1"/>`);

  /* --- 表头 --- */
  const hY = 240;
  const hd = (x, label, anchor) => `<text x="${x}" y="${hY}" font-size="10" letter-spacing="0.8" fill="${p.text3}"
    text-anchor="${anchor || 'start'}">${esc(label)}</text>`;
  L.push(hd(PAD, '#'));
  L.push(hd(76, t('th.song')));
  L.push(hd(404, t('th.diff')));
  L.push(hd(736, t('th.acc'), 'end'));
  L.push(hd(RIGHT, t('th.rks'), 'end'));

  /* --- 30 行 --- */
  const BAR_X = 76;
  const BAR_W = RIGHT - BAR_X;

  rows.forEach((r, i) => {
    const y = HEAD + i * ROW_H;
    const top3 = i < 3;
    const col = top3 ? p.mint : (r.c >= 16 ? p.rose : p.accent);
    const ratio = span > 0.0001 ? 0.08 + 0.92 * (r.rk - minRk) / span : 0.5;

    /* 序号 */
    L.push(`<text x="${PAD}" y="${y + 18}" font-size="11.5" fill="${top3 ? p.mint : p.text3}"
      font-family="${MONO}" font-weight="${top3 ? 600 : 400}">${String(i + 1).padStart(2, '0')}</text>`);

    /* 曲名 */
    L.push(`<text x="${BAR_X}" y="${y + 18}" font-size="13.5" fill="${p.text}">${esc(fit(r.n, 310, 13.5))}</text>`);

    /* 难度标签 */
    const dl = `${r.d} ${r2(r.c)}`;
    const dw = measure(dl, 9.5, { mono: true }) + 12;
    const dcol = p[DIFF_COLOR[r.d] || 'accent2'];
    const dsoft = s[DIFF_SOFT[r.d] || 'accentSoft'];
    L.push(`<rect x="404" y="${y + 6}" width="${dw}" height="16" rx="4" fill="${dsoft}"/>`);
    L.push(`<text x="${404 + dw / 2}" y="${y + 17.5}" font-size="9.5" fill="${dcol}" text-anchor="middle"
      font-family="${MONO}">${esc(dl)}</text>`);

    /* 准度 */
    L.push(`<text x="736" y="${y + 18}" font-size="12.5" fill="${r.a >= 99.995 ? p.mint : p.text2}"
      text-anchor="end" font-family="${MONO}">${r2(r.a)}%</text>`);

    /* 单曲 RKS */
    L.push(`<text x="${RIGHT}" y="${y + 18}" font-size="13.5" fill="${col}" text-anchor="end"
      font-family="${MONO}" font-weight="600">${r2(r.rk)}</text>`);

    /* 进度条 */
    L.push(`<rect x="${BAR_X}" y="${y + 28}" width="${BAR_W}" height="3" rx="1.5" fill="${p.line}"/>`);
    L.push(`<rect x="${BAR_X}" y="${y + 28}" width="${(BAR_W * ratio).toFixed(2)}" height="3" rx="1.5"
      fill="${col}" opacity="0.85"/>`);
  });

  /* --- 页脚 --- */
  L.push(`<line x1="${PAD}" y1="${FOOT_Y}" x2="${RIGHT}" y2="${FOOT_Y}" stroke="${p.line}" stroke-width="1"/>`);
  L.push(`<text x="${PAD}" y="${FOOT_Y + 26}" font-size="10.5" fill="${p.text3}">${esc(t('footer.formula'))}</text>`);
  L.push(`<text x="${PAD}" y="${FOOT_Y + 50}" font-size="10.5" fill="${p.accent}">${esc(t('poster.madeBy'))}</text>`);
  L.push(`<text x="${RIGHT}" y="${FOOT_Y + 50}" font-size="10.5" fill="${p.text3}" text-anchor="end"
    font-family="${MONO}">${esc(SITE + ' · ' + dateStr(Date.now()))}</text>`);

  /* 柱子配色图例，右对齐，从右往左排 */
  const lg = [
    { c: p.mint, s: t('legend.top3') },
    { c: p.accent, s: t('legend.below16') },
    { c: p.rose, s: t('legend.above16') }
  ];
  let lx = RIGHT;
  lg.slice().reverse().forEach(it => {
    const tw = measure(it.s, 10);
    lx -= tw;
    L.push(`<text x="${lx}" y="${FOOT_Y + 26}" font-size="10" fill="${p.text3}">${esc(it.s)}</text>`);
    lx -= 5 + 7;
    L.push(`<circle cx="${lx + 3.5}" cy="${FOOT_Y + 22.5}" r="3.2" fill="${it.c}"/>`);
    lx -= 13;
  });

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
