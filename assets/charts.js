/* ============================================================
   Phigros Lab · 图表
   全部手写 SVG，无第三方依赖，跟随主题取色
   ============================================================ */
(function () {
'use strict';

const PL = window.PL;
const { isNum, mean, r2, esc } = PL;
const t = (k, v) => (PL.t ? PL.t(k, v) : k);

let uid = 0;
const nextId = () => 'pg' + (++uid);

function pal() {
  const light = document.documentElement.dataset.theme === 'light';
  return light ? {
    text: '#161922', sub: '#8890a3', grid: 'rgba(16,24,40,.09)',
    accent: '#6d4aff', accent2: '#5333e0', mint: '#0f9e86',
    rose: '#e0366a', amber: '#bf7a00', sky: '#1a7fd4',
    track: '#eef0f6', axis: '#8890a3'
  } : {
    text: '#eef1f9', sub: '#727a8e', grid: 'rgba(255,255,255,.07)',
    accent: '#8b6cff', accent2: '#b6a4ff', mint: '#2fe0be',
    rose: '#ff5d8f', amber: '#ffb02e', sky: '#58b6ff',
    track: '#1b1f2c', axis: '#727a8e'
  };
}

const f = v => (Math.round(v * 10) / 10).toString();

function empty(msg) {
  return `<div class="chart-empty">${esc(msg)}</div>`;
}

/* ---------------- 散点：定数 — 准确率 ---------------- */
function chartAcc(input) {
  const rows = (input && input.list) || input;
  if (!rows || rows.length < 2) return empty(t('chart.tooFew'));
  const P = pal();
  const W = 560, H = 300;
  const pad = { l: 40, r: 14, t: 18, b: 32 };
  const q = (arr, p) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.max(0, Math.floor(s.length * p)))];
  };
  const cs = rows.map(r => r.c), as = rows.map(r => r.a);
  // 低难度高准度、以及打崩了的记录会把坐标轴拉爆：以「上榜平均定数」为基准裁出有意义的一段
  const center = (input && input.avgC30) || mean(cs);
  const maxC = Math.max(...cs);
  const x0 = Math.max(0, Math.floor(Math.max(center - 3.2, maxC - 6.5) * 2) / 2);
  const x1 = maxC + 0.3;
  const y0 = Math.max(85, Math.floor(q(as, 0.06) - 0.6));
  const y1 = 100.4;
  const shown = rows.filter(r => r.c >= x0 - 0.01 && r.a >= y0 && r.c <= x1 && r.a <= y1);
  const hidden = rows.length - shown.length;

  const X = v => pad.l + (v - x0) / (x1 - x0) * (W - pad.l - pad.r);
  const Y = v => H - pad.b - (v - y0) / (y1 - y0) * (H - pad.t - pad.b);

  let g = '';
  for (let i = 0; i <= 5; i++) {
    const v = y0 + (y1 - y0) * i / 5, y = Y(v);
    g += `<line class="gridline" x1="${pad.l}" y1="${f(y)}" x2="${W - pad.r}" y2="${f(y)}"/>`;
    g += `<text class="axis" x="${pad.l - 7}" y="${f(y + 3.4)}" text-anchor="end">${v.toFixed(1)}</text>`;
  }

  if (16 > x0 && 16 < x1) {
    g += `<line x1="${f(X(16))}" y1="${pad.t}" x2="${f(X(16))}" y2="${H - pad.b}" stroke="${P.rose}" stroke-opacity=".26" stroke-dasharray="3 4"/>`;
    g += `<text class="axis" x="${f(X(16) + 5)}" y="${pad.t + 9}" fill="${P.rose}" fill-opacity=".7">16+</text>`;
  }

  const bins = new Map();
  shown.forEach(r => {
    const b = Math.floor(r.c * 2) / 2;
    if (!bins.has(b)) bins.set(b, []);
    bins.get(b).push(r.a);
  });
  const pts = [...bins.entries()].sort((a, b) => a[0] - b[0])
    .map(([b, arr]) => [b + 0.25, mean(arr), arr.length])
    .filter(p => p[2] >= 2);

  const big = shown.length > 240;
  const light = document.documentElement.dataset.theme === 'light';
  shown.forEach(r => {
    const hi = r.c >= 16;
    g += `<g class="pt-wrap"><title>${esc(r.n)} · ${r.d} ${r2(r.c)} · ${r2(r.a)}% · RKS ${r2(PL.rksOf(r.c, r.a))}</title>` +
      `<circle class="pt" cx="${f(X(r.c))}" cy="${f(Y(r.a))}" r="${hi ? (big ? 3 : 3.9) : (big ? 2.1 : 3)}" fill="${hi ? P.rose : P.accent}" opacity="${hi ? (light ? .8 : .85) : (light ? .62 : .45)}"/></g>`;
  });

  if (pts.length > 1) {
    const path = pts.map(p => `${f(X(p[0]))},${f(Y(p[1]))}`).join(' ');
    g += `<polyline points="${path}" fill="none" stroke="${P.mint}" stroke-width="1.7" stroke-dasharray="5 4" stroke-linejoin="round" opacity=".9"/>`;
    pts.forEach(p => {
      g += `<g><title>${esc(t('chart.binTip', { c: p[0].toFixed(1), a: r2(p[1]), n: p[2] }))}</title>` +
        `<circle cx="${f(X(p[0]))}" cy="${f(Y(p[1]))}" r="3.2" fill="${P.mint}" stroke="${P.mint}" stroke-opacity=".3" stroke-width="4"/></g>`;
    });
  }

  const span = x1 - x0;
  const step = span <= 4 ? 0.5 : span <= 8 ? 1 : 2;
  for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) {
    g += `<text class="axis" x="${f(X(v))}" y="${H - 12}" text-anchor="middle">${v.toFixed(1)}</text>`;
  }
  if (hidden > 0) {
    g += `<text class="axis" x="${pad.l}" y="${H - 1}" opacity=".55">${esc(t('chart.hidden', { x: x0.toFixed(1), y: y0, n: hidden }))}</text>`;
  }
  g += `<text class="axis" x="${W - pad.r}" y="${H - 1}" text-anchor="end" opacity=".7">${esc(t('chart.axisDiff'))}</text>`;

  return `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

/* ---------------- 柱状：B30 ---------------- */
function chartB30(rows) {
  if (!rows || !rows.length) return empty(t('chart.noB30'));
  const P = pal();
  const W = 560, H = 300;
  const pad = { l: 36, r: 12, t: 18, b: 28 };
  const d = rows.slice(0, 30);
  const max = Math.max(...d.map(r => r.rk));
  const min = Math.min(...d.map(r => r.rk));
  const lo = Math.max(0, min - (max - min) * 0.35 - 0.15);
  const hi = max + (max - min) * 0.12 + 0.05;
  const Y = v => H - pad.b - (v - lo) / (hi - lo) * (H - pad.t - pad.b);
  const bw = (W - pad.l - pad.r) / Math.max(d.length, 1);
  const gid = nextId();

  let g = `<defs>
    <linearGradient id="${gid}a" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.accent}" stop-opacity=".95"/>
      <stop offset="1" stop-color="${P.accent}" stop-opacity=".28"/>
    </linearGradient>
    <linearGradient id="${gid}b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.rose}" stop-opacity=".95"/>
      <stop offset="1" stop-color="${P.rose}" stop-opacity=".28"/>
    </linearGradient>
    <linearGradient id="${gid}c" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.mint}" stop-opacity="1"/>
      <stop offset="1" stop-color="${P.mint}" stop-opacity=".35"/>
    </linearGradient>
  </defs>`;

  // 刻度
  [lo, (lo + hi) / 2, hi].forEach(v => {
    const y = Y(v);
    g += `<line class="gridline" x1="${pad.l}" y1="${f(y)}" x2="${W - pad.r}" y2="${f(y)}" stroke-dasharray="2 5"/>`;
    g += `<text class="axis" x="${pad.l - 7}" y="${f(y + 3.4)}" text-anchor="end">${v.toFixed(1)}</text>`;
  });

  d.forEach((r, i) => {
    const x = pad.l + i * bw + bw * 0.16;
    const w = Math.max(2, bw * 0.68);
    const y = Y(r.rk);
    const h = Math.max(1.5, H - pad.b - y);
    const fill = i < 3 ? `url(#${gid}c)` : (r.c >= 16 ? `url(#${gid}b)` : `url(#${gid}a)`);
    g += `<g><title>#${i + 1} ${esc(r.n)} · ${r.d} ${r2(r.c)} · ${r2(r.a)}% · RKS ${r2(r.rk)}</title>` +
      `<rect class="bar" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="2" fill="${fill}" style="animation-delay:${i * 12}ms"/></g>`;
    if (i === 0) {
      g += `<text class="axis" x="${f(x + w / 2)}" y="${f(y - 6)}" text-anchor="middle" fill="${P.mint}" font-size="10">${r.rk.toFixed(2)}</text>`;
    }
  });

  // 平均线
  const avg = mean(d, 'rk');
  const ay = Y(avg);
  g += `<line x1="${pad.l}" y1="${f(ay)}" x2="${W - pad.r}" y2="${f(ay)}" stroke="${P.sub}" stroke-width="1" stroke-dasharray="4 4" opacity=".8"/>`;
  g += `<text class="axis" x="${W - pad.r}" y="${f(ay - 5)}" text-anchor="end" fill="${P.sub}">${esc(t('chart.avg', { v: avg.toFixed(2) }))}</text>`;

  // x 标签
  g += `<text class="axis" x="${pad.l}" y="${H - 10}">#1</text>`;
  g += `<text class="axis" x="${W - pad.r}" y="${H - 10}" text-anchor="end">#${d.length}</text>`;
  if (d.length > 20) {
    const mid = pad.l + Math.round(d.length / 2) * bw;
    g += `<text class="axis" x="${f(mid)}" y="${H - 10}" text-anchor="middle" opacity=".65">#${Math.round(d.length / 2) + 1}</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

/* ---------------- 档位分布 ---------------- */
const RATING_COLORS = { Phi: 'mint', FC: 'sky', V: 'accent', S: 'amber', A: 'sub', B: 'track' };
const RATING_ORDER = ['Phi', 'FC', 'V', 'S', 'A', 'B'];
const RATING_LABEL = { Phi: 'Phi', FC: 'FC', V: 'V', S: 'S', A: 'A' };
const ratingLabel = k => (k === 'B' ? t('grade.bLow') : (RATING_LABEL[k] || k));

function chartRating(counts, total) {
  const P = pal();
  const W = 320, H = 168;
  const rows = RATING_ORDER.map(k => [k, counts[k] || 0]);
  const max = Math.max(1, ...rows.map(r => r[1]));
  const top = 10, rowH = (H - top - 4) / rows.length;
  let g = '';
  rows.forEach(([k, v], i) => {
    const y = top + i * rowH;
    const color = P[RATING_COLORS[k]] || P.sub;
    const w = (W - 96) * (v / max);
    g += `<text class="axis" x="0" y="${f(y + 11)}" font-size="9.5">${esc(ratingLabel(k))}</text>`;
    g += `<rect x="54" y="${f(y + 3)}" width="${f(Math.max(2, w))}" height="9" rx="4.5" fill="${color}" opacity="${k === 'B' ? .35 : .85}"/>
          <title>${esc(t('chart.gradeTip', { g: ratingLabel(k), n: v, p: total ? ' · ' + (v / total * 100).toFixed(1) + '%' : '' }))}</title>`;
    g += `<text class="axis" x="${W}" y="${f(y + 11)}" text-anchor="end" fill="${P.text}" font-size="9.5">${v}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

/* ---------------- 难度分布 ---------------- */
function chartDiff(counts) {
  const P = pal();
  const W = 320, H = 168;
  const pad = { l: 6, r: 6, t: 16, b: 22 };
  const rows = PL.RANKS.map(k => [k, counts[k] || 0]);
  const max = Math.max(1, ...rows.map(r => r[1]));
  const bw = (W - pad.l - pad.r) / rows.length;
  const gid = nextId();
  const colorOf = { EZ: P.mint, HD: P.amber, IN: P.accent, AT: P.rose };
  let g = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${P.text}" stop-opacity=".85"/><stop offset="1" stop-color="${P.text}" stop-opacity=".12"/></linearGradient></defs>`;
  rows.forEach(([k, v], i) => {
    const h = (H - pad.t - pad.b) * (v / max);
    const x = pad.l + i * bw + bw * 0.26;
    const w = bw * 0.48;
    const y = H - pad.b - h;
    g += `<g><title>${esc(t('chart.lvTip', { k, n: v }))}</title>
      <rect class="bar" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(Math.max(2, h))}" rx="4" fill="${colorOf[k]}" opacity=".85" style="animation-delay:${i * 60}ms"/>
      <text class="axis" x="${f(x + w / 2)}" y="${f(y - 5)}" text-anchor="middle" fill="${P.text}" font-size="10">${v}</text>
      <text class="axis" x="${f(x + w / 2)}" y="${H - 8}" text-anchor="middle" font-size="9.5">${k}</text></g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

/* ---------------- RKS 趋势 ---------------- */
function chartTrend(snaps) {
  if (!snaps || snaps.length < 2) {
    return `<div class="chart-empty">${esc(t('chart.trendEmpty'))}<br><span style="font-size:11px">${esc(t('chart.trendHint'))}</span></div>`;
  }
  const P = pal();
  const W = 320, H = 168;
  const pad = { l: 8, r: 8, t: 22, b: 22 };
  const vals = snaps.map(s => s.rks);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(0.02, hi - lo);
  lo -= span * 0.25; hi += span * 0.22;
  const X = i => pad.l + (i / (snaps.length - 1)) * (W - pad.l - pad.r);
  const Y = v => H - pad.b - (v - lo) / (hi - lo) * (H - pad.t - pad.b);
  const gid = nextId();
  const pts = snaps.map((s, i) => [X(i), Y(s.rks)]);
  const line = pts.map(p => `${f(p[0])},${f(p[1])}`).join(' ');
  const area = `${f(pts[0][0])},${H - pad.b} ${line} ${f(pts[pts.length - 1][0])},${H - pad.b}`;
  const last = snaps[snaps.length - 1];
  const first = snaps[0];
  const delta = last.rks - first.rks;
  const color = delta >= 0 ? P.mint : P.rose;

  let g = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${color}" stop-opacity=".28"/>
    <stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  g += `<polygon points="${area}" fill="url(#${gid})"/>`;
  g += `<polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  pts.forEach((p, i) => {
    const s = snaps[i];
    g += `<g><title>${PL.dateStr(s.t)} · RKS ${s.rks.toFixed(4)}</title>
      <circle cx="${f(p[0])}" cy="${f(p[1])}" r="${i === pts.length - 1 ? 3.4 : 2.2}" fill="${color}" opacity="${i === pts.length - 1 ? 1 : .55}"/></g>`;
  });
  g += `<text class="axis" x="${pad.l}" y="12" fill="${P.text}" font-size="10">${last.rks.toFixed(3)}</text>`;
  g += `<text class="axis" x="${pad.l + 46}" y="12" fill="${color}" font-size="9.5">${delta >= 0 ? '+' : ''}${delta.toFixed(3)}</text>`;
  g += `<text class="axis" x="${W - pad.r}" y="${H - 6}" text-anchor="end" font-size="9">${PL.dateStr(last.t)}</text>`;
  g += `<text class="axis" x="${pad.l}" y="${H - 6}" font-size="9" opacity=".7">${esc(t('chart.times', { n: snaps.length }))}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

/* ---------------- 迷你走势（卡片内） ---------------- */
function sparkline(vals, w, h, color) {
  if (!vals || vals.length < 2) return '';
  const P = pal();
  const c = color || P.accent;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 2) - 1;
    return `${f(x)},${f(y)}`;
  }).join(' ');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

Object.assign(PL, { pal, chartAcc, chartB30, chartRating, chartDiff, chartTrend, sparkline, chartEmpty: empty });
})();
