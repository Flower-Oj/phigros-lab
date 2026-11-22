/* ============================================================
   Phigros Lab · 核心
   状态 / 存储 / RKS 计算 / 曲库 / 导入导出 / 本地诊断
   纯前端，无依赖。以 window.PL 命名空间对外暴露。
   ============================================================ */
(function () {
'use strict';

const PL = (window.PL = window.PL || {});

/* 文案走 i18n.js 的词典；i18n 未加载时退回 key 本身，不至于崩 */
const t = (k, v) => (PL.t ? PL.t(k, v) : k);
const isZh = () => !PL.getLang || PL.getLang() === 'zh';
const SEP = () => (isZh() ? '、' : ', ');
/* 中文句子用句号自带停顿，英文需要显式空格，否则 ".You" 连在一起 */
const SP = () => (isZh() ? '' : ' ');

/* ---------------- 小工具 ---------------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sum = (arr, k) => arr.reduce((s, x) => s + (k ? x[k] : x), 0);
const mean = (arr, k) => arr.length ? sum(arr, k) / arr.length : 0;
const isNum = v => typeof v === 'number' && isFinite(v);

const r4 = v => isNum(v) ? v.toFixed(4) : '—';
const r2 = v => isNum(v) ? v.toFixed(2) : '—';
const r3 = v => isNum(v) ? v.toFixed(3) : '—';
const signed = (v, d) => (v > 0 ? '+' : '') + v.toFixed(d == null ? 3 : d);

const timeAgo = ms => {
  if (!ms) return t('time.none');
  const d = Date.now() - ms;
  if (d < 60000) return t('time.justNow');
  if (d < 3600000) return t('time.min', { n: Math.floor(d / 60000) });
  if (d < 86400000) return t('time.hour', { n: Math.floor(d / 3600000) });
  return t('time.day', { n: Math.floor(d / 86400000) });
};
const dateStr = ms => {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/* ---------------- 公式 ---------------- */
const RANKS = ['EZ', 'HD', 'IN', 'AT'];

/** 单曲 RKS：(acc − 55) / 45 的平方 × 定数；100% 直接等于定数 */
function rksOf(c, a) {
  if (!isNum(c) || !isNum(a)) return 0;
  if (a >= 99.995) return c;
  if (a < 55) return 0;
  return clamp(c * Math.pow((a - 55) / 45, 2), 0, c);
}

/** 想拿到某个单曲 RKS 需要的 acc */
function accFor(c, rks) {
  if (!(c > 0)) return 100;
  if (rks >= c) return 100;
  if (rks <= 0) return 55;
  return clamp(55 + 45 * Math.sqrt(rks / c), 55, 100);
}

/* ---------------- 示例数据 ---------------- */
const DEMO = [
  { n: '雪降り、雪が降っている', d: 'AT', c: 14.0, s: 1000000, a: 100.00 },
  { n: 'cryout', d: 'IN', c: 13.6, s: 1000000, a: 100.00 },
  { n: '神話', d: 'IN', c: 13.5, s: 1000000, a: 100.00 },
  { n: 'DESTRUCTION 3,2,1', d: 'IN', c: 16.3, s: 923763, a: 98.41 },
  { n: "Rrhar'il", d: 'IN', c: 16.1, s: 925862, a: 98.60 },
  { n: '百鬼夜行', d: 'IN', c: 15.8, s: 940764, a: 98.99 },
  { n: 'True Home, True World (Rework)', d: 'IN', c: 15.8, s: 951940, a: 98.98 },
  { n: 'BANGING STRIKE', d: 'IN', c: 15.9, s: 947588, a: 98.71 },
  { n: 'Chronomia', d: 'IN', c: 15.4, s: 988312, a: 99.34 },
  { n: '蝸虎天体 -Lacertid-', d: 'IN', c: 15.5, s: 965089, a: 99.13 },
  { n: 'Cryogenic', d: 'IN', c: 15.1, s: 997037, a: 99.67 },
  { n: '星拂云锦 feat. koi', d: 'IN', c: 15.5, s: 945579, a: 98.96 },
  { n: 'インフェルノシティ', d: 'IN', c: 15.7, s: 925349, a: 98.65 },
  { n: 'Message', d: 'IN', c: 15.6, s: 938363, a: 98.77 },
  { n: 'Fractured Angel', d: 'IN', c: 16.3, s: 924460, a: 97.82 },
  { n: 'Xenophobia', d: 'IN', c: 14.9, s: 971818, a: 99.76 },
  { n: 'Feast远东之宴', d: 'IN', c: 15.6, s: 960725, a: 98.72 },
  { n: 'Silence is Golden, Speech is Silver', d: 'IN', c: 15.7, s: 938091, a: 98.52 },
  { n: 'Dance with Silence', d: 'IN', c: 15.2, s: 945093, a: 99.20 },
  { n: 'Distorted Fate', d: 'IN', c: 16.3, s: 906053, a: 97.67 },
  { n: 'Hydra', d: 'IN', c: 15.4, s: 947751, a: 98.89 },
  { n: 'Implexrough', d: 'IN', c: 15.3, s: 962918, a: 99.03 },
  { n: 'Ametrine', d: 'IN', c: 15.0, s: 993023, a: 99.42 },
  { n: 'Evanescent', d: 'IN', c: 15.7, s: 950868, a: 98.39 },
  { n: '风屿', d: 'AT', c: 15.1, s: 970307, a: 99.19 },
  { n: '青芽', d: 'IN', c: 15.2, s: 936502, a: 99.02 },
  { n: 'Leave All Behind', d: 'AT', c: 15.0, s: 975668, a: 99.23 },
  { n: '[PRAW]', d: 'IN', c: 15.1, s: 942575, a: 99.06 },
  { n: "Don't Never Around", d: 'IN', c: 15.5, s: 946804, a: 98.48 },
  { n: 'Re: End of a Dream', d: 'IN', c: 15.9, s: 913887, a: 97.83 },
  { n: '千紫万红', d: 'IN', c: 15.5, s: 934583, a: 99.08 }
];

/* ---------------- 状态 ---------------- */
const S = {
  key: '', model: 'deepseek-chat', preset: 'all',
  data: [], official: null, nick: '', tk: '', source: '', notes: '',
  server: 'cn',   // 'cn' 国服 / 'global' 国际服：两边是两套 TapTap 应用和两套云存档，token 不通用
  snapshots: [], msgs: [], updatedAt: 0, sum3: null,
  library: null, libById: new Map(), libByName: new Map()
};

const K = {
  key: 'pglab_key', notes: 'pglab_notes', data: 'pglab_data', meta: 'pglab_meta',
  snap: 'pglab_snap', model: 'pglab_model', preset: 'pglab_preset', theme: 'pglab_theme',
  cid: 'pglab_cid', tour: 'pglab_tour'
};

/**
 * 匿名客户端 id：只用来给「免费额度」分桶。
 * 服务端同时记 IP 和这个 id 两个桶，取两者的**较大值**——只换其中一个还要换另一个，
 * 所以它不承担安全职责，也拦不住铁了心刷的人；真正的上限是服务端的全局每日额度。
 */
function clientId() {
  let id = '';
  try { id = localStorage.getItem(K.cid) || ''; } catch (e) {}
  if (!id) {
    id = 'c' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(K.cid, id); } catch (e) {}
  }
  return id;
}

function saveLS() {
  try {
    localStorage.setItem(K.key, S.key);
    localStorage.setItem(K.notes, S.notes);
    localStorage.setItem(K.model, S.model);
    localStorage.setItem(K.preset, S.preset);
    localStorage.setItem(K.data, JSON.stringify(S.data));
    localStorage.setItem(K.meta, JSON.stringify({
      official: S.official, nick: S.nick, tk: S.tk, source: S.source,
      server: S.server, updatedAt: S.updatedAt, sum3: S.sum3
    }));
    localStorage.setItem(K.snap, JSON.stringify(S.snapshots));
  } catch (e) {
    // 记录太多时 localStorage 可能写满，至少保证元数据落盘
    try { localStorage.setItem(K.meta, JSON.stringify({ official: S.official, nick: S.nick, tk: S.tk, source: S.source, updatedAt: S.updatedAt })); } catch (_) {}
  }
}

function loadLS() {
  S.key = localStorage.getItem(K.key) || '';
  S.notes = localStorage.getItem(K.notes) || '';
  S.model = localStorage.getItem(K.model) || 'deepseek-chat';
  S.preset = localStorage.getItem(K.preset) || 'all';
  try {
    const m = JSON.parse(localStorage.getItem(K.meta) || 'null');
    if (m) {
      S.official = isNum(m.official) ? m.official : null;
      S.nick = m.nick || '';
      S.tk = m.tk || '';
      S.source = m.source || '';
      S.server = m.server === 'global' ? 'global' : 'cn';
      S.updatedAt = m.updatedAt || 0;
      S.sum3 = isNum(m.sum3) ? m.sum3 : null;
    }
  } catch (e) {}
  try {
    const s = JSON.parse(localStorage.getItem(K.snap) || 'null');
    S.snapshots = Array.isArray(s) ? s.filter(x => x && isNum(x.rks)) : [];
  } catch (e) { S.snapshots = []; }
  // 只有「从来没导入过」才铺示例数据；用户主动清空后必须保持空
  const raw = localStorage.getItem(K.data);
  try {
    if (raw === null) throw new Error('empty');
    const d = JSON.parse(raw);
    S.data = Array.isArray(d) ? d : [];
  } catch (e) {
    S.data = DEMO.map(x => ({ ...x }));
    S.source = 'demo';
  }
}

/* ---------------- 分析 ---------------- */
function analysis() {
  const list = (S.data || [])
    .filter(r => r && isNum(r.c) && isNum(r.a))
    .map(r => ({ ...r, rk: rksOf(r.c, r.a) }));
  const sorted = list.slice().sort((x, y) => y.rk - x.rk || y.a - x.a);
  const best27 = sorted.slice(0, 27);
  const top30 = sorted.slice(0, 30);
  const cutoff = best27.length ? best27[best27.length - 1].rk : 0;
  const sum27 = sum(best27, 'rk');

  // 30 格总和 = 官方 RKS × 30 是唯一可精确反解的等式
  const hasOff = isNum(S.official) && best27.length >= 27;
  // 官方值缺失时退回「前 3 个 Phi」近似，与 phi.js / lib/rks.js 口径保持一致，
  // 否则同一份存档在命令行和网页上会给出两个不同的 RKS。
  const phi3 = sorted.filter(r => r.a >= 99.995).slice(0, 3);
  const sum3 = hasOff
    ? clamp(S.official * 30 - sum27, 0, Infinity)
    : (phi3.length >= 3 ? sum(phi3, 'rk') : null);

  let rks;
  if (best27.length >= 27) rks = (sum27 + (sum3 != null ? sum3 : cutoff * 3)) / 30;
  else rks = best27.length ? sum27 / best27.length : 0;

  const avgAcc30 = mean(top30, 'a');
  const avgC30 = mean(top30, 'c');
  const avgRk30 = mean(top30, 'rk');
  const conv = avgC30 ? (avgRk30 / avgC30) * 100 : 0;

  return {
    list, sorted, best27, top30, cutoff, sum27, sum3, sum3Exact: hasOff, phi3,
    rks, eff: hasOff ? S.official : rks, hasOff,
    avgAcc30, avgC30, avgRk30, conv,
    n: list.length,
    c16: list.filter(r => r.c >= 16),
    lo: list.filter(r => r.c < 15.2)
  };
}

/** 档位统计（Phi / FC / V / S / A / B） */
function ratings(A) {
  const g = { Phi: 0, FC: 0, V: 0, S: 0, A: 0, B: 0 };
  for (const r of A.list) {
    if (r.a >= 99.995) g.Phi++;
    else if (r.fc) g.FC++;
    else if (r.s >= 960000) g.V++;
    else if (r.s >= 920000) g.S++;
    else if (r.s >= 880000) g.A++;
    else g.B++;
  }
  return g;
}

function diffCounts(A) {
  const g = { EZ: 0, HD: 0, IN: 0, AT: 0 };
  for (const r of A.list) if (g[r.d] != null) g[r.d]++;
  return g;
}

/**
 * 推分候选
 * @param {{target?:number, diff?:string, q?:string, includeOut?:boolean, sort?:string}} o
 */
function pushRows(o) {
  o = o || {};
  const A = analysis();
  const target = o.target || 99.5;
  const q = norm(o.q || '');
  const minAcc = o.minAcc == null ? 89.5 : o.minAcc;
  const rows = [];
  for (const r of A.list) {
    // 准度太低（还没真正打过的谱）推上去不现实，排除掉免得噪声占满榜单
    if (r.a < minAcc) continue;
    const tgtRk = rksOf(r.c, target);
    const gain = tgtRk - r.rk;
    if (gain <= 0.004) continue;
    const status = r.rk >= A.cutoff ? 'in' : tgtRk >= A.cutoff ? 'can' : 'out';
    if (!o.includeOut && status === 'out') continue;
    if (o.diff && o.diff !== 'all' && r.d !== o.diff) continue;
    if (q && !norm(r.n).includes(q)) continue;
    rows.push({
      ...r, target, tgtRk, gain,
      need: Math.max(0, target - r.a),
      total: gain / 30, status
    });
  }
  const sort = o.sort || 'gain';
  if (sort === 'const') rows.sort((a, b) => b.c - a.c || b.gain - a.gain);
  else if (sort === 'gap') rows.sort((a, b) => b.need - a.need);
  else if (sort === 'need') rows.sort((a, b) => a.need - b.need || b.gain - a.gain);
  else rows.sort((a, b) => b.gain - a.gain || a.need - b.need);
  return rows;
}

/**
 * 目标反推：涨 delta 点 RKS，用 slots 张谱最省力地做到
 */
function planFor(delta, slots) {
  const A = analysis();
  const cur = A.eff;
  const target = cur + delta;
  const need = delta * 30;
  const per = need / Math.max(1, slots);
  const pool = A.list.map(r => {
    const wantRk = r.rk + per;
    const tgtAcc = accFor(r.c, wantRk);
    return { ...r, wantRk, tgtAcc, dAcc: tgtAcc - r.a, feasible: wantRk <= r.c + 1e-9 };
  }).filter(r => r.feasible && r.dAcc > 0.005 && r.dAcc <= 6 && r.a >= 89.5);
  pool.sort((a, b) => a.dAcc - b.dAcc || b.c - a.c);
  const picks = pool.slice(0, slots);
  const got = sum(picks.map(r => r.wantRk - r.rk)) / 30;
  return { cur, target, need, per, picks, got, reach: cur + got, short: Math.max(0, delta - got) };
}

/** 30 格全部推到某档位后的 RKS */
function ceiling(level) {
  const A = analysis();
  if (!A.list.length) return null;
  const boosted = A.list.map(r => rksOf(r.c, Math.max(r.a, level))).sort((a, b) => b - a).slice(0, 30);
  return sum(boosted) / Math.max(1, boosted.length);
}

/* ---------------- 版本 ---------------- */
const VERSION = '2.2.3';

/* ---------------- 曲库 ---------------- */
const VARIANTS = { '红': '紅', '万': '萬', '龙': '龍', '灵': '靈', '梦': '夢', '乐': '樂', '华': '華', '会': '會', '战': '戰', '亚': '亞', '与': '與' };
function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '')
    .replace(/[红万龙灵梦乐华会战亚与]/g, ch => VARIANTS[ch] || ch)
    .replace(/[：:·・\-–—_'"“”‘’()（）\[\]【】!！?？.,，、]/g, '');
}

async function loadLibrary() {
  if (S.library) return S.library;
  try {
    const res = await fetch('data/info.csv');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    const head = lines[0].split('\t').map(h => h.trim());
    const idx = {};
    head.forEach((h, i) => (idx[h] = i));
    const list = [];
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split('\t');
      const id = (c[idx.id] || '').trim();
      if (!id) continue;
      const e = {
        id,
        song: (c[idx.song] || '').trim(),
        composer: (c[idx.composer] || '').trim(),
        illustrator: (c[idx.illustrator] || '').trim(),
        charter: {
          EZ: (c[idx.EZC] || '').trim(), HD: (c[idx.HDC] || '').trim(),
          IN: (c[idx.INC] || '').trim(), AT: (c[idx.ATC] || '').trim()
        },
        const: {}
      };
      RANKS.forEach(rk => {
        const v = parseFloat(c[idx[rk]]);
        if (isNum(v)) e.const[rk] = v;
      });
      list.push(e);
    }
    S.library = list;
    S.libById = new Map(list.map(e => [e.id, e]));
    S.libByName = new Map(list.map(e => [norm(e.song), e]));
    await loadChartStats();
    return list;
  } catch (e) {
    S.library = [];
    S.statsLoaded = true; // 曲库都没了，别再让预览等统计
    return [];
  }
}

/**
 * 谱面统计（BPM / 时长 / 物量 / 章节）：data/charts.csv 由 tools/build_charts.py 生成。
 * 拿不到就静默跳过——谱面预览只显示存档里已有的定数与你的成绩，不能让曲库整体挂掉。
 */
async function loadChartStats() {
  try {
    const res = await fetch('data/charts.csv');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    const head = lines[0].split(',').map(h => h.trim());
    const idx = {};
    head.forEach((h, i) => (idx[h] = i));
    for (let i = 1; i < lines.length; i++) {
      // 章节名里可能有逗号，只按前 4 列切，后面的定数物量一定是数字
      const c = lines[i].split(',');
      const id = (c[idx.id] || '').trim();
      const e = S.libById.get(id);
      if (!e) continue;
      const combo = {};
      RANKS.forEach(rk => {
        const v = parseInt(c[idx[rk]], 10);
        if (isNum(v) && v > 0) combo[rk] = v;
      });
      e.stats = {
        bpm: (c[idx.bpm] || '').trim(),
        len: parseInt(c[idx.len], 10) || 0,
        chapter: head.indexOf('chapter') > -1
          ? c.slice(idx.chapter, c.length - 4).join(',').replace(/^"|"$/g, '').trim()
          : '',
        combo
      };
    }
  } catch (err) {
  } finally {
    S.statsLoaded = true;
    (S.statsWaiters || []).forEach(fn => { try { fn(); } catch (e) {} });
    S.statsWaiters = [];
  }
}

/** 谱面统计是否已经加载完（曲库先到，统计后到，中间有个小窗口） */
function statsReady() { return !S.library || !!S.statsLoaded; }
function onStats(fn) {
  if (statsReady()) return fn();
  (S.statsWaiters = S.statsWaiters || []).push(fn);
}

/** 曲库覆盖与未游玩的高定数谱 */
function coverage() {
  const A = analysis();
  if (!S.library || !S.library.length) return null;
  const playedSongs = new Set();
  const seen = new Set();
  for (const r of A.list) {
    const id = resolveId(r);
    if (!id) continue;
    playedSongs.add(id);
    seen.add(id + '|' + r.d);
  }
  const songs = S.library;
  const played = songs.filter(e => playedSongs.has(e.id));
  const unplayed = songs
    .filter(e => !playedSongs.has(e.id))
    .map(e => ({ ...e, max: Math.max(...RANKS.map(k => e.const[k] || 0)) }))
    .sort((a, b) => b.max - a.max);
  return {
    total: songs.length,
    played: played.length,
    charts: seen.size,
    unplayed,
    hot: unplayed.filter(e => e.max >= 14.5).slice(0, 6)
  };
}

function resolveId(r) {
  if (r.id && S.libById.has(r.id)) return r.id;
  const hit = S.libByName.get(norm(r.n));
  return hit ? hit.id : (r.id || null);
}

function composerOf(r) {
  const id = resolveId(r);
  const e = id && S.libById.get(id);
  return e ? e.composer : '';
}

/**
 * 谱面预览用的合并数据：曲库条目（定数 / 曲绘师 / 谱师 / 物量）+ 你在这首歌上的成绩。
 * 只认存档里真有的难度，没打过的难度不虚构数字。
 */
function chartOf(nameOrId, wantDiff) {
  const A = analysis();
  const id = (S.libById && (S.libById.has(nameOrId) ? nameOrId : null)) ||
    (S.libByName && (S.libByName.get(norm(nameOrId)) || {}).id) || null;
  const lib = (id && S.libById.get(id)) || null;

  const mine = {};
  for (const r of A.list) {
    const same = id ? resolveId(r) === id : norm(r.n) === norm(nameOrId);
    if (!same) continue;
    const cur = mine[r.d];
    if (!cur || r.rk > cur.rk) mine[r.d] = r; // 同名同难度留最好的一次
  }

  const diffs = RANKS.filter(rk => (lib && isNum(lib.const[rk])) || mine[rk]);
  let diff = wantDiff && diffs.includes(wantDiff) ? wantDiff
    : diffs.find(rk => mine[rk]) || diffs[diffs.length - 1] || null;

  return { id, lib, song: lib ? lib.song : String(nameOrId), mine, diffs, diff };
}

/* ---------------- 诊断 ---------------- */
function diagItems() {
  const A = analysis();
  const out = [];
  if (!A.list.length) {
    out.push({ tone: 'info', tag: '—', title: t('diag.noneT'), desc: t('diag.noneD') });
    return out;
  }
  const gap = A.avgC30 - A.avgRk30;
  out.push({
    tone: gap > 0.7 ? 'warn' : 'good',
    tag: gap.toFixed(2),
    title: t('diag.gapT'),
    desc: t('diag.gapD', { c: r2(A.avgC30), r: r2(A.avgRk30) }) + SP() +
      (gap > 0.7 ? t('diag.gapWarn') : t('diag.gapOk'))
  });

  const hi = A.c16, lo = A.lo;
  if (hi.length && lo.length) {
    const hiAcc = mean(hi, 'a'), loAcc = mean(lo, 'a'), drop = loAcc - hiAcc;
    out.push({
      tone: drop > 1 ? 'warn' : 'good',
      tag: drop.toFixed(2) + '%',
      title: t('diag.dropT'),
      desc: t('diag.dropD', { lo: r2(loAcc), hi: r2(hiAcc) }) + SP() +
        (drop > 1 ? t('diag.dropWarn') : t('diag.dropOk'))
    });
  }

  if (A.hasOff && A.sum3 != null) {
    const per3 = A.sum3 / 3;
    out.push({
      tone: per3 < A.rks - 0.15 ? 'warn' : 'info',
      tag: r2(per3),
      title: t('diag.recT'),
      desc: t('diag.recD', { s: r2(A.sum3), p: r2(per3) }) + SP() +
        (per3 < A.rks - 0.15 ? t('diag.recWarn', { r: r2(A.rks) }) : t('diag.recOk'))
    });
  }

  const phi = A.list.filter(r => r.a >= 99.995);
  const lowPhi = phi.filter(r => r.c < 15).sort((a, b) => a.c - b.c);
  if (lowPhi.length) {
    out.push({
      tone: 'warn',
      tag: String(lowPhi.length),
      title: t('diag.phiT'),
      desc: t('diag.phiD', { list: lowPhi.slice(0, 3).map(r => esc(r.n)).join(SEP()) })
    });
  }

  out.push({
    tone: A.c16.length >= 3 ? 'good' : 'warn',
    tag: String(A.c16.length),
    title: t('diag.c16T'),
    desc: A.c16.length
      ? t('diag.c16Has', { n: A.c16.length, a: r2(Math.max(...A.c16.map(r => r.a))) })
      : t('diag.c16None')
  });

  const cand = pushRows({ target: 99.5 }).filter(r => r.gain >= 0.5);
  if (cand.length) {
    const best = cand[0];
    out.push({
      tone: 'info',
      tag: '+' + best.gain.toFixed(2),
      title: t('diag.candT', { n: cand.length }),
      desc: t('diag.candD', {
        name: esc(best.n), d: best.d, c: r2(best.c), a: r2(best.a), t: r2(best.tgtRk)
      })
    });
  }

  const cov = coverage();
  if (cov && cov.unplayed.length) {
    const hot = cov.hot.slice(0, 2).map(e => `${esc(e.song)} (${r2(e.max)})`).join(SEP());
    out.push({
      tone: 'info',
      tag: `${cov.played}/${cov.total}`,
      title: t('diag.covT'),
      desc: cov.hot.length ? t('diag.covD', { n: cov.unplayed.length, hot }) : t('diag.covD2', { n: cov.unplayed.length })
    });
  }
  return out;
}

/* ---------------- 导入 ---------------- */
function num(v) {
  if (isNum(v)) return v;
  const f = parseFloat(String(v == null ? '' : v).replace(/[^\d.\-]/g, ''));
  return isNaN(f) ? null : f;
}

const KEYMAP = {
  n: ['name', 'song', 'songname', 'title', '曲名', '歌曲', 'songtitle', 'musicname'],
  c: ['const', 'difficultyconst', 'ds', '定数', 'levelconst', 'rating', 'chartconst', 'difficultyvalue'],
  a: ['acc', 'accuracy', 'accuracypercent', 'accpercent', '准确率', 'accrate'],
  s: ['score', '分数', '得分', 'points'],
  d: ['diff', 'difficulty', 'rank', 'level', '难度', 'difficultyname', 'difficultyindex']
};

function mapObj(o) {
  if (!o || typeof o !== 'object') return null;
  const low = {};
  Object.keys(o).forEach(k => { low[k.toLowerCase().replace(/[\s_\-.]/g, '')] = o[k]; });
  const pick = arr => {
    for (const k of arr) if (low[k] !== undefined && low[k] !== null && low[k] !== '') return low[k];
    return null;
  };
  const name = pick(KEYMAP.n);
  const c = num(pick(KEYMAP.c));
  const a0 = num(pick(KEYMAP.a));
  if (!name || c == null || a0 == null) return null;
  if (c < 5 || c > 20) return null;
  let a = a0 <= 1.001 ? a0 * 100 : a0;
  if (a < 30 || a > 100.001) return null;
  const dRaw = pick(KEYMAP.d);
  let d = 'IN';
  if (typeof dRaw === 'string') {
    const up = dRaw.trim().toUpperCase();
    if (/^(EZ|HD|IN|AT)$/.test(up)) d = up;
    else if (up.length >= 2) d = up.slice(0, 2);
  } else if (isNum(dRaw)) {
    d = RANKS[clamp(dRaw, 0, 3)] || 'IN';
  }
  const sc = num(pick(KEYMAP.s));
  return {
    n: String(name).trim(),
    d,
    c: Math.round(c * 10) / 10,
    a: Math.round(clamp(a, 0, 100) * 100) / 100,
    s: sc != null && sc > 0 ? Math.round(sc) : 0
  };
}

function findArray(node, depth) {
  depth = depth || 0;
  if (depth > 7 || !node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    const mapped = node.map(mapObj).filter(Boolean);
    if (mapped.length >= 3) return mapped;
    for (const it of node) {
      const r = findArray(it, depth + 1);
      if (r) return r;
    }
    return null;
  }
  for (const k of Object.keys(node)) {
    const r = findArray(node[k], depth + 1);
    if (r) return r;
  }
  return null;
}

function parseLines(text) {
  const out = [];
  text.split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || /^[#/]/.test(t)) return;
    const p = t.split(/\s*[|,\t;]\s*/).filter(x => x !== '');
    if (p.length < 3) return;
    const name = p[0];
    let c = null, a = null, d = 'IN', s = 0;
    p.slice(1).forEach(tok => {
      if (/^(EZ|HD|IN|AT)$/i.test(tok)) { d = tok.toUpperCase(); return; }
      const v = num(tok);
      if (v == null) return;
      if (v > 300000) { s = Math.round(v); return; }
      if (v >= 5 && v <= 20 && c == null) { c = v; return; }
      if (v >= 30 && v <= 100.01 && a == null) { a = v; return; }
    });
    if (c == null || a == null) return;
    out.push({ n: name, d, c, a, s });
  });
  return out;
}

function importText(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, msg: t('msg.emptyInput') };
  let arr = null, jsonOk = false;
  if (/^[[{]/.test(raw)) {
    try { arr = findArray(JSON.parse(raw)); jsonOk = !!arr; } catch (e) {}
  }
  if (!arr || arr.length < 3) arr = parseLines(raw);
  if (!arr || arr.length < 3) {
    if (arr && arr.length) return { ok: false, msg: t('msg.tooFew', { n: arr.length }) };
    return { ok: false, msg: t('msg.badParse') };
  }
  // 同名同难度去重，保留 best
  const map = new Map();
  arr.forEach(r => {
    const k = norm(r.n) + '|' + r.d;
    const old = map.get(k);
    if (!old || r.a > old.a) map.set(k, r);
  });
  const list = [...map.values()];
  S.data = list;
  S.official = null;
  S.nick = '';
  S.sum3 = null;
  S.source = jsonOk ? 'json' : 'text';
  S.updatedAt = Date.now();
  saveLS();
  return { ok: true, count: list.length, json: jsonOk };
}

function exportJSON() {
  const A = analysis();
  return JSON.stringify({
    app: 'phigros-lab',
    version: 2,
    exportedAt: new Date().toISOString(),
    player: S.nick || null,
    officialRks: S.official,
    localRks: Number(A.rks.toFixed(4)),
    records: S.data.map(r => ({ song: r.n, difficulty: r.d, const: r.c, acc: r.a, score: r.s || 0 }))
  }, null, 2);
}

/* ---------------- 快照 ---------------- */
function pushSnapshot(force) {
  const A = analysis();
  if (!A.list.length) return false;
  const last = S.snapshots[S.snapshots.length - 1];
  if (!force && last && Math.abs(last.rks - A.eff) < 0.00005 && Date.now() - last.t < 36e5) return false;
  S.snapshots.push({
    t: Date.now(),
    rks: Number(A.eff.toFixed(4)),
    off: A.hasOff ? Number(S.official.toFixed(4)) : null,
    acc: Number(A.avgAcc30.toFixed(2)),
    phi: A.list.filter(r => r.a >= 99.995).length,
    n: A.n,
    /* 逐曲成绩：只存「单曲 rk 前 60 条」的 id|难度|acc，用来算这一周哪几首推上去了。
       60 × ~20 字节 ≈ 1.2KB 一条，80 条 ≈ 100KB，localStorage 放得下。
       存 acc 而不是 rk：定数可能随版本改，acc 是玩家真正打出来的东西。 */
    l: A.sorted.slice(0, 60).map(r => [r.id || r.n, r.d, Number(r.a.toFixed(3))])
  });
  if (S.snapshots.length > 80) S.snapshots = S.snapshots.slice(-80);
  saveLS();
  return true;
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

/**
 * 逐曲对比：拿最新快照和「7 天前最近的一条」比，算本周涨分榜。
 * 不到 7 天就退化成和最早那条比，天数会一起返回，界面上照实写。
 * 老版本快照没有 l 字段，返回 stale，让界面提示「再攒一条」而不是报错。
 */
function snapshotDiff() {
  const snaps = S.snapshots;
  if (snaps.length < 2) return null;
  const cur = snaps[snaps.length - 1];
  let base = null;
  for (let i = snaps.length - 2; i >= 0; i--) {
    if (cur.t - snaps[i].t >= WEEK_MS) { base = snaps[i]; break; }
  }
  if (!base) base = snaps[0];
  if (!base || base === cur) return null;

  const days = Math.max(1, Math.round((cur.t - base.t) / 86400000));
  const dRks = cur.rks - base.rks;
  if (!Array.isArray(base.l) || !Array.isArray(cur.l)) {
    return { base, cur, days, dRks, items: [], stale: true };
  }

  const prev = new Map(base.l.map(([id, d, a]) => [id + '|' + d, a]));
  const items = [];
  for (const [id, d, a] of cur.l) {
    const from = prev.get(id + '|' + d);
    if (!isNum(from)) continue;              // 新进前 60 的没得比，不算进榜
    const delta = a - from;
    if (Math.abs(delta) < 0.005) continue;   // 0.005 以下基本是判定抖动，不入榜
    items.push({ id, d, from, to: a, delta });
  }
  items.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return { base, cur, days, dRks, items: items.slice(0, 12), total: items.length, stale: false };
}

/* ---------------- AI 提示词 ---------------- */
const PRESETS = {
  all: {
    label: 'ai.presetAll',
    ask: () => isZh()
      ? '先诊断整体水平与最大瓶颈，再给推分顺序和训练建议。'
      : 'First diagnose my overall level and biggest bottleneck, then give a push order and training advice.'
  },
  week: {
    label: 'ai.presetWeek',
    ask: () => isZh()
      ? '重点给一份可执行的 7 天训练安排：每天练什么谱、练多久、目标是什么，并说明理由。'
      : 'Focus on an actionable 7-day schedule: what to play each day, for how long, the goal for each session, and why.'
  },
  hand: {
    label: 'ai.presetHand',
    ask: () => isZh()
      ? '重点分析手法与设备设置层面的问题（指法、流速、判定延迟、握持姿势），给出具体调整值和验证方法。'
      : 'Focus on technique and setup (finger layout, note speed, input offset, grip), with concrete values to try and how to verify them.'
  },
  song: {
    label: 'ai.presetSong',
    ask: () => isZh()
      ? '重点给出「卡住的谱怎么啃」：从读谱、分段练习、失误点拆解入手，选 3 首最值得攻的谱具体讲。'
      : 'Focus on how to break through stuck charts: reading, section practice, error isolation. Pick the 3 most worthwhile charts and be specific.'
  },
  push: {
    label: 'ai.presetPush',
    ask: () => isZh()
      ? '只回答推分：按性价比给出 6-8 首的攻克顺序，每首注明当前 acc、目标准度、能涨多少 RKS，不要讲训练方法。'
      : 'Only answer push order: 6-8 charts ranked by value, each with current acc, target accuracy and the RKS gain. Skip training methods.'
  }
};

function buildPrompt(preset) {
  const A = analysis();
  const p = PRESETS[preset] || PRESETS.all;
  const zh = isZh();
  const bins = {};
  S.data.forEach(r => {
    const b = (Math.floor(r.c * 2) / 2).toFixed(1);
    (bins[b] = bins[b] || []).push(r.a);
  });
  const binTxt = Object.keys(bins).sort((a, b) => b - a)
    .map(b => zh
      ? `${b}: ${r2(mean(bins[b]))}%（${bins[b].length} 张）`
      : `${b}: ${r2(mean(bins[b]))}% (${bins[b].length} charts)`).join('\n');
  const top = A.sorted.slice(0, 8).map((r, i) => `${i + 1}. ${r.n} [${r.d} ${r.c}] ${r2(r.a)}% · RKS ${r2(r.rk)}`).join('\n');
  const low = A.sorted.slice(-8).reverse().map((r, i) => `${i + 1}. ${r.n} [${r.d} ${r.c}] ${r2(r.a)}% · RKS ${r2(r.rk)}`).join('\n');
  const stTag = r => ' | ' + t(r.status === 'in' ? 'st.in' : r.status === 'can' ? 'st.can' : 'st.out');
  const cand = pushRows({ target: 99.5 }).slice(0, 10)
    .map((r, i) => zh
      ? `${i + 1}. ${r.n} [${r.d} ${r.c}] ${r2(r.a)}% → 99.5% 可得 ${r2(r.tgtRk)}（+${r.gain.toFixed(2)}，总 RKS +${(r.gain / 30).toFixed(3)}）${stTag(r)}`
      : `${i + 1}. ${r.n} [${r.d} ${r.c}] ${r2(r.a)}% → 99.5% yields ${r2(r.tgtRk)} (+${r.gain.toFixed(2)}, total RKS +${(r.gain / 30).toFixed(3)})${stTag(r)}`).join('\n');
  const rating = ratings(A);
  const rc = `Phi ${rating.Phi} · FC ${rating.FC} · V ${rating.V} · S ${rating.S} · A ${rating.A} · ${t('grade.bLow')} ${rating.B}`;
  const cov = coverage();
  const covTxt = cov
    ? (zh
      ? `已游玩 ${cov.played}/${cov.total} 首，未游玩里定数最高的是 ${cov.hot.slice(0, 3).map(e => `${e.song}(${r2(e.max)})`).join('、') || '无'}`
      : `played ${cov.played}/${cov.total}; highest-constant unplayed: ${cov.hot.slice(0, 3).map(e => `${e.song}(${r2(e.max)})`).join(', ') || 'none'}`)
    : (zh ? '未知' : 'unknown');

  const L = [];
  if (zh) {
    L.push(`你是 Phigros 资深教练。下面是玩家的成绩数据（${new Date().toLocaleDateString('zh-CN')}），请做精确诊断和可执行计划。`);
    L.push('');
    L.push('【核心指标】');
    L.push(`综合 RKS：${A.hasOff ? r4(S.official) + '（云存档官方值）' : r4(A.rks) + '（本地估算）'}`);
    L.push(`本地估算 RKS：${r4(A.rks)}`);
    L.push(`记录数：${A.n}，其中 Phi ${rating.Phi} 个`);
    L.push(`B30 平均准确率：${r2(A.avgAcc30)}%`);
    L.push(`上榜平均定数：${r2(A.avgC30)}，平均单曲 RKS：${r2(A.avgRk30)}，转化率 ${r2(A.conv)}%`);
    L.push(`最佳 27 截断线：${r2(A.cutoff)}`);
    if (A.sum3 != null) L.push(`最近 3 格合计：${r2(A.sum3)}（平均 ${r2(A.sum3 / 3)}）${A.sum3Exact ? '' : '（前 3 个 Phi 近似）'}`);
    L.push(`16 级以上：${A.c16.length} 张${A.c16.length ? `，平均 ${r2(mean(A.c16, 'a'))}%` : ''}`);
    L.push(`15.2 以下平均：${A.lo.length ? r2(mean(A.lo, 'a')) + '%' : '—'}`);
    L.push(`成绩档位：${rc}`);
    L.push(`曲库覆盖：${covTxt}`);
    L.push('');
    L.push('【定数分箱 → 平均准确率】');
    L.push(binTxt);
    L.push('');
    L.push('【Top 8 单曲】');
    L.push(top);
    L.push('');
    L.push('【垫底 8 张】');
    L.push(low);
    L.push('');
    L.push('【按收益排序的推分候选】');
    L.push(cand);
    L.push('');
    L.push('【玩家自述】');
    L.push(S.notes || '无');
    L.push('');
    L.push('【关注点】');
    L.push(p.ask());
    L.push('');
    L.push('通用要求：');
    L.push('1. 不要套话，直接给判断；有数据就引用数据。');
    L.push('2. 提到具体曲目时用「曲名（难度 定数）」格式。');
    L.push('3. 用中文 markdown，控制在 700 字以内。');
  } else {
    L.push(`You are a veteran Phigros coach. Below is a player's score data (${new Date().toLocaleDateString('en-US')}). Give a precise diagnosis and an actionable plan.`);
    L.push('');
    L.push('[Core metrics]');
    L.push(`Overall RKS: ${A.hasOff ? r4(S.official) + ' (official, from cloud save)' : r4(A.rks) + ' (local estimate)'}`);
    L.push(`Local estimate RKS: ${r4(A.rks)}`);
    L.push(`Records: ${A.n}, of which ${rating.Phi} are Phi`);
    L.push(`B30 average accuracy: ${r2(A.avgAcc30)}%`);
    L.push(`B30 average constant: ${r2(A.avgC30)}, average chart RKS: ${r2(A.avgRk30)}, conversion ${r2(A.conv)}%`);
    L.push(`Best-27 cutoff: ${r2(A.cutoff)}`);
    if (A.sum3 != null) L.push(`Recent-3 total: ${r2(A.sum3)} (avg ${r2(A.sum3 / 3)})${A.sum3Exact ? '' : ' — approximated by top 3 Phi'}`);
    L.push(`Charts at lv.16+: ${A.c16.length}${A.c16.length ? `, average ${r2(mean(A.c16, 'a'))}%` : ''}`);
    L.push(`Average below 15.2: ${A.lo.length ? r2(mean(A.lo, 'a')) + '%' : '—'}`);
    L.push(`Grade buckets: ${rc}`);
    L.push(`Song coverage: ${covTxt}`);
    L.push('');
    L.push('[Constant bins → average accuracy]');
    L.push(binTxt);
    L.push('');
    L.push('[Top 8 charts]');
    L.push(top);
    L.push('');
    L.push('[Bottom 8 charts]');
    L.push(low);
    L.push('');
    L.push('[Push candidates sorted by gain]');
    L.push(cand);
    L.push('');
    L.push('[Player notes]');
    L.push(S.notes || 'none');
    L.push('');
    L.push('[Focus]');
    L.push(p.ask());
    L.push('');
    L.push('Requirements:');
    L.push('1. No filler — state the judgement, cite data when you have it.');
    L.push('2. Refer to charts as "Title (Difficulty Constant)".');
    L.push('3. Answer in English markdown, under 700 words.');
  }
  return L.join('\n');
}

/** markdown 单元格/纯文本里的曲名：转义会露出 &#39; 这类实体，这里只处理会破坏结构的字符 */
const mdCell = x => String(x == null ? '' : x).replace(/\|/g, '\\|');

/* ---------------- 离线报告 ---------------- */
function offlineReport() {
  const A = analysis();
  const items = diagItems();
  const cands = pushRows({ target: 99.5 }).slice(0, 8);
  const rating = ratings(A);
  const cov = coverage();
  const L = [];
  L.push('## ' + t('rep.overview'));
  L.push('');
  L.push('- ' + t('rep.rks', { v: r4(A.eff), src: A.hasOff ? t('rep.official') : t('rep.estimate') }));
  L.push('- ' + t('rep.records', { n: A.n, p: rating.Phi, a: r2(A.avgAcc30) }));
  L.push('- ' + t('rep.avg', { c: r2(A.avgC30), r: r2(A.avgRk30), v: r2(A.conv) }));
  if (cov) L.push('- ' + t('rep.cover', { p: cov.played, t: cov.total, n: cov.unplayed.length }));
  L.push('');
  L.push('## ' + t('rep.conclusion'));
  L.push('');
  const unesc = x => String(x)
    .replace(/<\/?b>/g, '').replace(/<\/?code>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const dash = isZh() ? '｜' : ' | ';
  items.forEach(it => {
    L.push(`- **${unesc(it.title)}${dash}${unesc(it.tag)}** — ${unesc(it.desc)}`);
  });
  L.push('');
  L.push('## ' + t('rep.next'));
  L.push('');
  L.push(`| ${t('rep.colIdx')} | ${t('rep.colSong')} | ${t('rep.colDiff')} | ${t('rep.colNow')} | ${t('rep.colTarget')} | ${t('rep.colGain')} | ${t('rep.colTotal')} |`);
  L.push('|---|---|---|---|---|---|---|');
  cands.forEach((r, i) => {
    L.push(`| ${i + 1} | ${mdCell(r.n)} | ${r.d} ${r2(r.c)} | ${r2(r.a)}% | 99.5% | +${r2(r.gain)} | +${(r.gain / 30).toFixed(3)} |`);
  });
  if (!cands.length) L.push(`| — | ${t('rep.noCand')} | | | | | |`);
  L.push('');
  L.push('## ' + t('rep.howto'));
  L.push('');
  const worst = A.sorted.slice(-5).reverse();
  const gap = A.avgC30 - A.avgRk30;
  if (gap > 0.7) L.push('- ' + t('rep.tipGap'));
  if (A.c16.length && mean(A.c16, 'a') < 97) {
    L.push('- ' + t('rep.tipC16', { a: r2(mean(A.c16, 'a')) }));
  }
  L.push('- ' + t('rep.tipWorst', { n: worst.length, list: worst.map(r => mdCell(r.n)).join(SEP()) }));
  if (rating.Phi < 5) L.push('- ' + t('rep.tipPhi'));
  L.push('- ' + t('rep.tipWarmup'));
  L.push('');
  L.push('## ' + t('rep.expect'));
  L.push('');
  const pl = planFor(0.2, 3);
  const planTxt = pl.picks.length
    ? t('rep.expectPlan', { list: pl.picks.map(p => `${mdCell(p.n)} → ${r2(p.tgtAcc)}%`).join(SEP()) })
    : t('rep.expectNone');
  L.push(t('rep.expectLine', { n: cands.length, plan: planTxt }));
  L.push('');
  L.push(t('rep.footer', { c: r2(A.cutoff), u: r2(ceiling(99.5)) }));
  return L.join('\n');
}

/* ---------------- 导出命名空间 ---------------- */
Object.assign(PL, {
  $, $$, esc, clamp, sum, mean, isNum, r2, r3, r4, signed, timeAgo, dateStr,
  RANKS, rksOf, accFor, norm, DEMO, S, K,
  saveLS, loadLS, analysis, ratings, diffCounts, pushRows, planFor, ceiling,
  loadLibrary, coverage, resolveId, composerOf, chartOf, diagItems,
  importText, parseLines, exportJSON, pushSnapshot, snapshotDiff,
  buildPrompt, offlineReport, PRESETS, clientId, VERSION, statsReady, onStats
});
})();
