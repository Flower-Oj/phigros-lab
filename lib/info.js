'use strict';
// 曲库与定数表（data/info.csv，来自 phi-plugin 的 resources/info/info.csv）
const fs = require('fs');
const path = require('path');

const CSV = path.join(__dirname, '..', 'data', 'info.csv');
const RANKS = ['EZ', 'HD', 'IN', 'AT'];

let cache = null;

function load() {
  if (cache) return cache;
  const text = fs.readFileSync(CSV, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const head = lines[0].split('\t');
  const idx = {};
  head.forEach((h, i) => { idx[h.trim()] = i; });
  const byId = new Map();
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split('\t');
    const id = (c[idx.id] || '').trim();
    if (!id) continue;
    const e = {
      id,
      song: (c[idx.song] || '').trim(),
      composer: (c[idx.composer] || '').trim(),
      illustrator: (c[idx.illustrator] || '').trim(),
      const: {}
    };
    RANKS.forEach(r => {
      const v = parseFloat(c[idx[r]]);
      if (!isNaN(v)) e.const[r] = v;
    });
    byId.set(id, e);
  }
  cache = { list: [...byId.values()], byId };
  return cache;
}

function get(id) {
  return load().byId.get(id) || null;
}

function constOf(id, rank) {
  const e = get(id);
  return e && e.const[rank] != null ? e.const[rank] : null;
}

// 常见简繁/异体差异，避免「千紫万红」搜不到「千紫万紅」
const VARIANTS = { '红': '紅', '万': '萬', '龙': '龍', '灵': '靈', '梦': '夢', '乐': '樂', '华': '華', '会': '會', '战': '戰' };

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '').replace(/[红万龙灵梦乐华会战]/g, ch => VARIANTS[ch] || ch);
}

function search(q) {
  const t = norm(q);
  if (!t) return [];
  const all = load().list;
  const exact = all.filter(e => norm(e.song) === t);
  if (exact.length) return exact;
  return all.filter(e => norm(e.song).includes(t) || norm(e.composer).includes(t)).slice(0, 12);
}

function songName(id) {
  const e = get(id);
  return e ? e.song : id;
}

function total() { return load().list.length; }

module.exports = { load, get, constOf, search, songName, total, RANKS };
