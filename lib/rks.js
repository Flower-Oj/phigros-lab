'use strict';
// RKS 计算、B30 组装、推分建议
const info = require('./info');

const RANKS = ['EZ', 'HD', 'IN', 'AT'];

/** 单曲 RKS：(acc − 55) / 45 的平方 × 定数，100% 时等于定数 */
function rksOf(diff, acc) {
  if (diff == null || acc == null) return 0;
  if (acc >= 99.995) return diff;
  if (acc < 55) return 0; // 低于 55% 时公式没有意义，按 0 计
  const v = diff * Math.pow((acc - 55) / 45, 2);
  return Math.min(diff, v > 0 ? v : 0);
}

/** 想要拿到某单曲 RKS 所需的 acc */
function accFor(diff, rks) {
  if (rks >= diff) return 100;
  return 55 + 45 * Math.sqrt(rks / diff);
}

function enrich(records) {
  const out = [];
  for (const r of records) {
    const meta = info.get(r.songId);
    const diff = meta && meta.const[r.rank] != null ? meta.const[r.rank] : null;
    if (diff == null) continue;
    out.push({
      songId: r.songId,
      song: meta.song,
      composer: meta.composer,
      rank: r.rank,
      difficulty: diff,
      score: r.score,
      acc: r.acc,
      fc: r.fc,
      rating: r.acc >= 99.995 ? 'phi' : (r.fc ? 'FC' : (r.score >= 960000 ? 'V' : (r.score >= 920000 ? 'S' : (r.score >= 880000 ? 'A' : 'B')))),
      rks: rksOf(diff, r.acc)
    });
  }
  return out.sort((a, b) => b.rks - a.rks);
}

/**
 * 最佳 27 + 最近 3 = 官方 (最近3 + 最佳27) / 30。
 * 存档没有逐曲时间戳，「最近 3」本地不可还原；但只要拿到官方 RKS，
 * 就有唯一能精确反解的等式：sum3 = 官方 × 30 − sum27（云存档给的就是 Top30，
 * 因此 sum27 精确）。拿不到官方值时退回「前 3 个 Phi」这个偏乐观的近似。
 */
function computeB30(entries, official) {
  const best27 = entries.slice(0, 27);
  const phi3 = entries.filter(e => e.acc >= 99.995).slice(0, 3);
  const sum27 = best27.reduce((s, e) => s + e.rks, 0);
  const hasOff = official != null && !isNaN(official) && best27.length >= 27;
  const sum3 = hasOff
    ? Math.max(0, official * 30 - sum27)
    : phi3.reduce((s, e) => s + e.rks, 0);
  // 不足 27 条时按实际条数平均，绝不能把 27 项之和除以 30
  const est = best27.length >= 27
    ? (sum27 + sum3) / 30
    : (best27.length ? sum27 / best27.length : 0);
  return {
    best27,
    phi3,
    sum27,
    sum3,
    est,
    calibrated: hasOff,
    official: official != null && !isNaN(official) ? official : null,
    cutoff: best27.length ? best27[best27.length - 1].rks : 0
  };
}

function stats(entries) {
  const n = entries.length || 1;
  const avgAcc = entries.reduce((s, e) => s + e.acc, 0) / n;
  const avgDiff = entries.reduce((s, e) => s + e.difficulty, 0) / n;
  const avgRks = entries.reduce((s, e) => s + e.rks, 0) / n;
  const byRank = {};
  RANKS.forEach(r => { byRank[r] = entries.filter(e => e.rank === r).length; });
  return { count: entries.length, avgAcc, avgDiff, avgRks, conv: avgDiff ? avgRks / avgDiff * 100 : 0, byRank };
}

/**
 * 推分建议：把每张谱的 acc 推到目标值后能提升多少单曲 RKS
 * @param {object[]} entries
 * @param {{target?:number, cutoff?:number, limit?:number}} opts
 */
function suggest(entries, opts = {}) {
  const target = opts.target || 99.5;
  const cutoff = opts.cutoff != null ? opts.cutoff : 0;
  const limit = opts.limit || 15;
  const minAcc = opts.minAcc != null ? opts.minAcc : 95;
  const rows = [];
  for (const e of entries) {
    if (e.acc >= target || e.acc < minAcc) continue;
    const tgtRks = rksOf(e.difficulty, target);
    const gain = tgtRks - e.rks;
    if (gain <= 0.004) continue;
    rows.push({
      song: e.song,
      rank: e.rank,
      difficulty: e.difficulty,
      acc: e.acc,
      target,
      rks: e.rks,
      tgtRks,
      gain,
      total: gain / 30,
      needed: e.acc + (target - e.acc),
      inBoard: e.rks >= cutoff,
      canBoard: tgtRks >= cutoff
    });
  }
  rows.sort((a, b) => b.gain - a.gain);
  return rows.slice(0, limit);
}

/** 要达到目标 RKS，需要几张谱把单曲 RKS 推到多少 */
function planFor(entries, delta, slots) {
  const b = computeB30(entries);
  const n = slots || 3;
  const need = (b.est + delta) * 30 - (b.sum27 + b.sum3);
  const targetRks = b.cutoff + need / n;
  const pool = entries
    .filter(e => e.rks < targetRks && e.acc >= 90)
    .map(e => ({ ...e, wantAcc: Math.min(100, accFor(e.difficulty, targetRks)) }))
    .filter(p => p.wantAcc < 100 || p.acc < 99.995)
    .sort((a, b2) => b2.difficulty - a.difficulty || b2.acc - a.acc)
    .slice(0, 12);
  return { need, slots: n, targetRks, pool, cutoff: b.cutoff };
}

module.exports = { rksOf, accFor, enrich, computeB30, stats, suggest, planFor, RANKS };
