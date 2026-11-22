/* ============================================================
   Phigros Lab · 界面与交互
   ============================================================ */
(function () {
'use strict';

const PL = window.PL;
const t = (k, v) => (PL.t ? PL.t(k, v) : k);

const {
  $, $$, esc, r2, r3, r4, signed, timeAgo, dateStr, S, K, isNum,
  analysis, ratings, diffCounts, pushRows, planFor, ceiling,
  loadLibrary, coverage, composerOf, diagItems, saveLS, loadLS,
  importText, exportJSON, pushSnapshot, buildPrompt, offlineReport, PRESETS, clientId,
  chartOf
} = PL;

/* ---------------- 全局界面状态 ---------------- */
const ui = {
  theme: localStorage.getItem(K.theme) || 'dark',
  push: { target: 99.5, diff: 'all', q: '', includeOut: false, sort: 'gain', limit: 40 },
  dataQ: '',
  aborter: null,
  tour: 0,
  streaming: false
};

/* ---------------- 基础工具 ---------------- */
function toast(msg, type) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, type === 'err' ? 4200 : 2600);
}

function initials(name) {
  if (!name) return 'PG';
  const s = String(name).trim();
  return /[a-zA-Z0-9]/.test(s[0]) ? s.slice(0, 2).toUpperCase() : s.slice(0, 1);
}

const srcLabel = k => (k ? t('src.' + (k === 'text' || k === 'json' ? 'manual' : k)) : t('src.none'));

function pillCls(d) {
  return 'pill' + (d === 'AT' ? ' at' : d === 'HD' ? ' hd' : d === 'EZ' ? ' ez' : '');
}

/** 只有内容超出且没滚到底时才给表格加底部渐隐 */
function updateFades() {
  $$('.table-wrap').forEach(w => {
    const overflow = w.scrollHeight - w.clientHeight > 6;
    const atEnd = w.scrollTop + w.clientHeight >= w.scrollHeight - 6;
    w.classList.toggle('fade-b', overflow && !atEnd);
  });
}

function statusCell(st) {
  if (st === 'in') return '<span class="up">' + esc(t('st.in')) + '</span>';
  if (st === 'can') return '<span style="color:var(--amber)">' + esc(t('st.can')) + '</span>';
  return '<span class="muted">' + esc(t('st.out')) + '</span>';
}

/* ---------------- 语言 ---------------- */
function syncLangLabel() {
  const el = $('#langLabel');
  if (!el) return;
  const cur = PL.getLang ? PL.getLang() : 'zh';
  const row = (PL.LANGS || []).find(l => l.code === cur);
  el.textContent = row ? row.label : '中';
}

function toggleLang() {
  const next = (PL.getLang ? PL.getLang() : 'zh') === 'zh' ? 'en' : 'zh';
  PL.setLang(next);   // applyStatic + 通知订阅者
  syncLangLabel();
  renderAll();
  if (S.data.length) runPlan();
}

/* ---------------- 主题 ---------------- */
function applyTheme(t, silent) {
  ui.theme = t === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = ui.theme;
  localStorage.setItem(K.theme, ui.theme);
  if (!silent) { renderCharts(); renderTrendCard(); }
}

/* ---------------- 概览 ---------------- */
function renderHero() {
  const A = analysis();
  const snaps = S.snapshots;
  const last = snaps.length ? snaps[snaps.length - 1] : null;
  const prev = snaps.length > 1 ? snaps[snaps.length - 2] : null;
  const delta = last && prev ? last.rks - prev.rks : (last ? 0 : null);

  const srcBadge = S.source
    ? `<span class="badge ${S.source === 'cloud' ? 'mint' : S.source === 'demo' ? 'amber' : 'accent'}">${esc(srcLabel(S.source))}</span>`
    : '<span class="badge rose">' + esc(t('src.none')) + '</span>';

  const deltaBadge = delta == null ? '' :
    `<span class="badge ${delta > 0.00005 ? 'mint' : delta < -0.00005 ? 'rose' : ''}">
       <span class="up">${delta > 0.00005 ? '▲' : delta < -0.00005 ? '▼' : '·'} ${Math.abs(delta).toFixed(3)}</span> ${esc(t('ov.vsLast'))}
     </span>`;

  const sumAll = A.hasOff ? S.official * 30 : A.sum27 + A.cutoff * 3;

  $('#hero').innerHTML = `
    <div class="hero-main">
      <div class="hero-label">${esc(t('ov.rks'))}</div>
      <div class="hero-value">${A.list.length ? r4(A.eff) : '—'}</div>
      <div class="hero-meta">
        ${srcBadge}
        ${A.hasOff ? '<span class="badge accent">' + esc(t('ov.official')) + '</span>' : '<span class="badge">' + esc(t('ov.estimate')) + '</span>'}
        ${deltaBadge}
        <span>${S.nick ? esc(S.nick) + ' · ' : ''}${timeAgo(S.updatedAt)}</span>
      </div>
    </div>
    <div class="hero-side">
      <div class="mini"><span>${esc(t('ov.localEst'))}</span><b>${A.list.length ? r4(A.rks) : '—'}</b></div>
      <div class="mini"><span>${esc(t('ov.cutoff'))}</span><b>${r2(A.cutoff)}</b></div>
      <div class="mini"><span>${esc(t('ov.sum30'))}</span><b>${sumAll ? r2(sumAll) : '—'}</b></div>
    </div>`;
}

function renderBanner() {
  const box = $('#dataBanner');
  if (!S.data.length) {
    box.innerHTML = `<div class="banner"><b>${esc(t('banner.emptyTitle'))}</b>${esc(t('banner.emptyBody'))}
      <button class="btn tiny" data-goto="data">${esc(t('banner.emptyBtn'))}</button></div>`;
    return;
  }
  if (S.source === 'demo') {
    box.innerHTML = `<div class="banner"><b>${esc(t('banner.demoTitle'))}</b>${esc(t('banner.demoBody'))}
      <button class="btn tiny" data-goto="data">${esc(t('banner.demoBtn'))}</button></div>`;
    return;
  }
  box.innerHTML = '';
}

function renderStats() {
  const A = analysis();
  const cov = coverage();
  const top = A.sorted[0];
  const cards = [
    {
      k: t('stat.acc'),
      v: r2(A.avgAcc30), unit: '%',
      s: t('stat.accSub', { n: A.n, c: r2(A.cutoff) })
    },
    {
      k: t('stat.const'),
      v: r2(A.avgC30),
      s: top ? t('stat.constSub', { rk: r2(top.rk), name: top.n }) : t('stat.noData')
    },
    {
      k: t('stat.conv'),
      v: r2(A.conv), unit: '%',
      s: A.conv >= 96 ? t('stat.convGood') : A.conv >= 93 ? t('stat.convMid') : t('stat.convBad'),
      meter: Math.min(100, A.conv)
    },
    cov ? {
      k: t('stat.cover'),
      v: `${cov.played}<small>/${cov.total}</small>`,
      s: cov.hot.length ? t('stat.coverSub', { c: r2(cov.hot[0].max) }) : t('stat.coverSub2', { n: cov.unplayed.length }),
      meter: Math.round(cov.played / cov.total * 100)
    } : {
      k: t('stat.best'),
      v: top ? r2(top.rk) : '—',
      s: top ? t('stat.bestSub', { d: top.d, c: r2(top.c) }) : t('stat.noData')
    }
  ];

  $('#statGrid').innerHTML = cards.slice(0, 4).map((c, i) => `
    <div class="stat${i === 0 ? ' accent' : ''}">
      <div class="k">${c.k}</div>
      <div class="v">${c.v}${c.unit ? `<small>${c.unit}</small>` : ''}</div>
      <div class="s" title="${esc(c.s)}">${esc(c.s)}</div>
      ${c.meter != null ? `<div class="meter"><i style="width:${c.meter}%"></i></div>` : ''}

    </div>`).join('');
}

function renderCharts() {
  const A = analysis();
  const set = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
  set('#chartAcc', PL.chartAcc(A));
  set('#chartB30', PL.chartB30(A.sorted));
  set('#chartRating', PL.chartRating(ratings(A), A.n));
  set('#chartDiff', PL.chartDiff(diffCounts(A)));
  renderTrendCard();
}

function renderTrendCard() {
  const el = $('#chartTrend');
  if (!el) return;
  el.innerHTML = PL.chartTrend(S.snapshots);
}

function renderDiag() {
  const items = diagItems();
  $('#diag').innerHTML = items.map(it => `
    <div class="diag">
      <span class="sev ${it.tone}"></span>
      <div class="body">
        <div class="t">${it.tag ? `<em>${esc(it.tag)}</em>` : ''}${esc(it.title)}</div>
        <div class="d">${it.desc}</div>
      </div>
    </div>`).join('');
}

function renderPlayerChip() {
  const chip = $('#playerChip');
  if (!S.data.length) { chip.hidden = true; return; }
  const A = analysis();
  chip.hidden = false;
  chip.innerHTML = `<span class="av">${esc(initials(S.nick || 'PG'))}</span>
    <span class="nm">${esc(S.nick || t('ui.avatar'))}</span>
    <span class="rk">${r2(A.eff)}</span>`;
}

/* ---------------- 推分 ---------------- */
function renderPush() {
  const A = analysis();
  const rows = pushRows(ui.push);
  const shown = rows.slice(0, ui.push.limit);

  if (!shown.length) {
    $('#pushTable').innerHTML = `<tbody><tr><td class="empty-row">${esc(t('push.empty'))}</td></tr></tbody>`;
    $('#pushFoot').innerHTML = '';
    updateFades();
    return;
  }

  const body = shown.map((r, i) => `
    <tr class="clk" data-song="${esc(r.n)}" data-diff="${r.d}" tabindex="0" title="${esc(t('cp.title'))}">
      <td class="idx">${String(i + 1).padStart(2, '0')}</td>
      <td class="song">
        <span class="nm">${esc(r.n)}<span class="${pillCls(r.d)}">${r.d} ${r2(r.c)}</span></span>
        <span class="by">${esc(composerOf(r) || (r.a >= 99.995 ? 'Phi' : ''))}</span>
      </td>
      <td class="n">${r2(r.a)}%
        <div class="acc-cell" style="margin-top:3px"><span class="track"><i class="${r.a >= 97 ? 'hi' : ''}" style="width:${Math.max(4, (r.a - 90) / 10 * 100)}%"></i></span></div>
      </td>
      <td class="n ${r.need <= 1 ? 'up' : 'muted'}">${r.need > 0 ? '+' + r2(r.need) : '—'}</td>
      <td class="n muted">${r2(r.rk)} <span style="opacity:.55">→</span> ${r2(r.tgtRk)}</td>
      <td class="n up">+${r2(r.gain)}</td>
      <td class="n up">+${(r.gain / 30).toFixed(3)}</td>
      <td>${statusCell(r.status)}</td>
    </tr>`).join('');

  $('#pushTable').innerHTML = `<thead><tr>
      <th>#</th><th>${esc(t('th.song'))}</th><th class="n">${esc(t('th.accNow'))}</th><th class="n">${esc(t('th.need'))}</th>
      <th class="n">${esc(t('th.rks'))}</th><th class="n">${esc(t('th.gain'))}</th><th class="n">${esc(t('th.total'))}</th><th>${esc(t('th.status'))}</th>
    </tr></thead><tbody>${body}</tbody>`;

  const gainSum = rows.reduce((s, r) => s + r.gain, 0) / 30;
  $('#pushFoot').innerHTML = `<span>${esc(t('push.footShown', { a: shown.length, b: rows.length }))}</span>
    <span>${esc(t('push.footGain', { v: gainSum.toFixed(3) }))}</span>
    <span>${esc(t('push.footMin'))}</span>
    ${rows.length > shown.length ? '<button class="btn tiny ghost" id="pushMore">' + esc(t('push.more')) + '</button>' : ''}`;
  updateFades();
}

/* ---------------- 目标规划 ---------------- */
function renderPlanSide() {
  const A = analysis();
  const c50 = ceiling(99.5), c100 = ceiling(100);
  const rows = [
    { lb: t('plan.rowNow'), v: A.eff, hl: true },
    { lb: t('plan.row995'), v: c50, small: t('plan.row995Sub') },
    { lb: t('plan.rowPhi'), v: c100, small: t('plan.rowPhiSub') }
  ];
  $('#ceiling').innerHTML = rows.map(r => `
    <div class="ceil-row${r.hl ? ' hl' : ''}">
      <div class="lb">${r.lb}${r.small ? `<small>${r.small}</small>` : ''}</div>
      <div class="vv">${r.v ? r4(r.v) : '—'}</div>
    </div>`).join('') +
    (c100 ? `<div class="hint" style="margin-top:8px">${t('plan.room', { v: '<b style="color:var(--mint)">+' + (c50 - A.eff).toFixed(3) + '</b>' })}</div>` : '');

  const cov = coverage();
  const pot = $('#potential');
  if (!cov) {
    pot.innerHTML = `<div class="hint">${esc(t('plan.notLoaded'))}</div>`;
  } else if (!cov.hot.length) {
    pot.innerHTML = `<div class="hint">${esc(t('plan.allDone'))}</div>`;
  } else {
    pot.innerHTML = `<div class="pot-list">${cov.hot.map(e => `
      <div class="pot-row">
        <span class="nm">${esc(e.song)}</span>
        <span class="c">${PL.RANKS.filter(k => e.const[k]).map(k => `${k} ${r2(e.const[k])}`).slice(-2).join(' · ')}</span>
      </div>`).join('')}</div>
    <div class="hint" style="margin-top:8px">${esc(t('plan.unplayed', { n: cov.unplayed.length }))}</div>`;
  }
}

function runPlan() {
  const A = analysis();
  const target = parseFloat($('#planTarget').value);
  const slots = parseInt($('#planSlots').value, 10) || 3;
  if (!isFinite(target) || target <= 0) return toast(t('toast.targetEmpty'), 'err');
  const delta = target - A.eff;
  if (Math.abs(delta) < 0.0005) {
    $('#planSummary').innerHTML = `<div class="hint">${esc(t('toast.targetSame'))}</div>`;
    return;
  }
  if (delta < 0) return toast(t('toast.targetDown'), 'err');

  const p = planFor(delta, slots);

  const opts = [2, 3, 4, 5, 8];
  if (!opts.includes(slots)) opts.push(slots);
  const cmp = opts.sort((a, b) => a - b).map(n => {
    const q = planFor(delta, n);
    const avg = q.picks.length ? q.picks.reduce((s, r) => s + r.dAcc, 0) / q.picks.length : null;
    return { n, per: q.per, avg, ok: q.short <= 0.005, got: q.got };
  });

  $('#planSummary').innerHTML = `
    <div class="plan-hero">
      <div class="num">${r2(A.eff)}</div>
      <span class="arrow">→</span>
      <div class="num" style="color:var(--accent-2)">${r2(target)}</div>
      <div class="txt">
        ${t('plan.needLine', { d: delta.toFixed(3), s: (delta * 30).toFixed(2) })}<br>
        ${p.picks.length
          ? t('plan.spread', { n: p.picks.length, p: p.per.toFixed(2) })
          : esc(t('plan.infeasible'))}
      </div>
    </div>
    ${p.picks.length === 0
      ? `<div class="hint" style="margin-top:10px;color:var(--amber)">${t('plan.ceilingMsg', { v: '<b>' + r4(ceiling(99.5)) + '</b>' })}</div>`
      : p.short > 0.004
        ? `<div class="hint" style="margin-top:10px;color:var(--amber)">${t('plan.shortMsg', { g: p.got.toFixed(3), s: p.short.toFixed(3) })}</div>`
        : ''}
    <div class="field-label">${esc(t('plan.cmpTitle'))}</div>
    <div class="plan-cmp">
      ${cmp.map(c => `<button class="cmp-row${c.n === slots ? ' on' : ''}" data-slots="${c.n}">
        <span class="n">${esc(t('plan.slotsN', { n: c.n }))}</span>
        <span class="t">${esc(c.avg != null ? t('plan.cmpRow', { p: c.per.toFixed(2), a: c.avg.toFixed(2) }) : t('plan.cmpRowBare', { p: c.per.toFixed(2) }))}</span>
        <span class="v ${c.ok ? 'up' : 'muted'}">${esc(c.ok ? t('plan.cmpOk') : t('plan.cmpNo'))}</span>
      </button>`).join('')}
    </div>`;

  const rows = p.picks.map((r, i) => `
    <tr class="clk" data-song="${esc(r.n)}" data-diff="${r.d}" tabindex="0" title="${esc(t('cp.title'))}">
      <td class="idx">${String(i + 1).padStart(2, '0')}</td>
      <td class="song"><span class="nm">${esc(r.n)}<span class="${pillCls(r.d)}">${r.d} ${r2(r.c)}</span></span>
        <span class="by">${esc(composerOf(r))}</span></td>
      <td class="n">${r2(r.a)}%</td>
      <td class="n" style="color:var(--accent-2)">${r2(r.tgtAcc)}%</td>
      <td class="n ${r.dAcc <= 1 ? 'up' : 'muted'}">+${r2(r.dAcc)}</td>
      <td class="n muted">${r2(r.rk)} <span style="opacity:.55">→</span> ${r2(r.wantRk)}</td>
      <td class="n up">+${(r.wantRk - r.rk).toFixed(2)}</td>
    </tr>`).join('');

  $('#planTable').innerHTML = rows
    ? `<thead><tr><th>#</th><th>${esc(t('th.song'))}</th><th class="n">${esc(t('th.now'))}</th><th class="n">${esc(t('th.reach'))}</th>
        <th class="n">${esc(t('th.accGap'))}</th><th class="n">${esc(t('th.rks'))}</th><th class="n">${esc(t('th.contribution'))}</th></tr></thead><tbody>${rows}</tbody>`
    : `<tbody><tr><td class="empty-row">${esc(t('plan.emptyTable'))}</td></tr></tbody>`;

  $('#planHint').textContent = t('plan.hintDone', { t: r2(target), n: p.picks.length });
  updateFades();
}

/* ---------------- 数据表 / 快照 ---------------- */
function renderDataTable() {
  const A = analysis();
  const q = PL.norm(ui.dataQ);
  const rows = A.sorted.filter(r => !q || PL.norm(r.n).includes(q) || PL.norm(composerOf(r)).includes(q));
  const shown = rows.slice(0, 200);

  $('#dataTable').innerHTML = `<thead><tr>
      <th class="n" style="width:44px">#</th><th>${esc(t('th.song'))}</th><th class="n">${esc(t('th.diff'))}</th>
      <th class="n">${esc(t('th.score'))}</th><th class="n">${esc(t('th.acc'))}</th><th class="n">${esc(t('th.rks'))}</th><th>${esc(t('th.grade'))}</th>
    </tr></thead><tbody>${shown.map((r, i) => `
      <tr class="clk" data-song="${esc(r.n)}" data-diff="${r.d}" tabindex="0" title="${esc(t('cp.title'))}">
        <td class="idx n">${i + 1}</td>
        <td class="song"><span class="nm">${esc(r.n)}</span>${composerOf(r) ? `<span class="by">${esc(composerOf(r))}</span>` : ''}</td>
        <td class="n">${r.d} ${r2(r.c)}</td>
        <td class="n muted">${r.s ? r.s.toLocaleString('en-US') : '—'}</td>
        <td class="n">${r2(r.a)}%</td>
        <td class="n up">${r2(r.rk)}</td>
        <td>${r.a >= 99.995 ? '<span class="badge mint">Phi</span>' : r.fc ? '<span class="badge accent">FC</span>' : `<span class="muted">${r.s >= 960000 ? 'V' : r.s >= 920000 ? 'S' : r.s >= 880000 ? 'A' : r.s ? 'B' : '—'}</span>`}</td>
      </tr>`).join('')}</tbody>`;

  if (!shown.length) {
    $('#dataTable').innerHTML = `<tbody><tr><td class="empty-row">${esc(t('data.noMatch', { q: ui.dataQ }))}</td></tr></tbody>`;
  }
  $('#dataMeta').textContent = t('data.meta', {
    n: rows.length,
    more: rows.length > 200 ? t('data.metaMore') : '',
    o: S.official != null ? r4(S.official) : '—',
    r: r4(A.rks)
  });
  updateFades();
}

function renderSnapshots() {
  const box = $('#snapList');
  const list = S.snapshots.slice().reverse();
  if (!list.length) {
    box.innerHTML = `<div class="hint">${esc(t('snap.empty'))}</div>`;
    return;
  }
  box.innerHTML = list.slice(0, 12).map((s, i) => {
    const prev = list[i + 1];
    const d = prev ? s.rks - prev.rks : null;
    return `<div class="snap-row">
      <span class="when">${dateStr(s.t)}</span>
      <span class="rk">${s.rks.toFixed(4)}</span>
      <span class="delta ${d == null ? 'muted' : d > 0 ? 'up' : d < 0 ? 'down' : 'muted'}">
        ${d == null ? esc(t('snap.first')) : (d >= 0 ? '+' : '') + d.toFixed(4)}</span>
      <span class="meta">${esc(t('snap.meta', { a: r2(s.acc), p: s.phi, n: s.n }))}</span>
    </div>`;
  }).join('');
}

/* ---------------- 谱面预览 ---------------- */
function mmss(sec) {
  const m = Math.floor(sec / 60);
  return m + ':' + String(Math.round(sec % 60)).padStart(2, '0');
}

function gradeOf(r) {
  if (!r) return '—';
  if (r.a >= 99.995) return 'Phi';
  if (r.fc) return 'FC';
  if (r.s >= 960000) return 'V';
  if (r.s >= 920000) return 'S';
  if (r.s >= 880000) return 'A';
  return r.s ? 'B' : '—';
}

/** 这张谱的物量在同定数（±0.3）谱面里的百分位；样本太少就不给 */
function comboPct(rk, constVal, notes) {
  const lib = S.library || [];
  if (!notes || !lib.length || !isNum(constVal)) return null;
  const peers = lib.filter(e => e.stats && e.stats.combo[rk] && isNum(e.const[rk]) &&
    Math.abs(e.const[rk] - constVal) <= 0.3);
  if (peers.length < 8) return null;
  const below = peers.filter(e => e.stats.combo[rk] <= notes).length;
  return Math.round(below / peers.length * 100);
}

/** 数据源用 {…} 标谱师组，展示时去掉外层大括号 */
function plainCharter(s) {
  const v = String(s || '').trim();
  const m = v.match(/^\{(.*)\}$/);
  return m ? m[1] : (v || '—');
}

function chartHTML(c) {
  const lib = c.lib;
  const st = (lib && lib.stats) || null;
  const cur = c.diff;
  const curMine = cur ? c.mine[cur] : null;
  const A = analysis();
  // 定数优先用曲库里的官方值，取不到才退回你自己那条记录里的定数
  const curConst = (lib && isNum(lib.const[cur])) ? lib.const[cur] : (curMine ? curMine.c : null);

  const sub = [];
  if (st && st.chapter) sub.push(esc(st.chapter));
  if (lib && lib.composer) sub.push(esc(lib.composer));
  if (lib && lib.illustrator) sub.push(esc(t('cp.illu')) + ' ' + esc(lib.illustrator));

  const diffs = c.diffs.length ? c.diffs : [];
  const diffBtns = diffs.map(rk => {
    const cn = lib && lib.const[rk];
    const has = !!c.mine[rk];
    const n = st && st.combo[rk];
    return `<button class="cp-diff${has ? ' hit' : ''}${rk === cur ? ' on' : ''}" data-cdiff="${rk}">
      <b>${rk}</b>
      <strong>${isNum(cn) ? r2(cn) : '—'}</strong>
      <em>${n ? n + ' ' + esc(t('cp.notes')) : '—'}</em>
    </button>`;
  }).join('');

  const notes = st && cur ? st.combo[cur] : null;
  const density = notes && st.len ? notes / st.len : null;

  const facts = [
    [t('cp.const'), isNum(curConst) ? r2(curConst) : '—', false],
    [t('cp.notes'), notes ? String(notes) : '—', false],
    ['BPM', st && st.bpm ? st.bpm : '—', false],
    [t('cp.length'), st && st.len ? mmss(st.len) : '—', false],
    [t('cp.density'), density ? t('cp.densityV', { v: density.toFixed(2) }) : '—', false],
    [t('cp.charter'), plainCharter((lib && lib.charter && lib.charter[cur]) || ''), true]
  ];

  const maxCombo = Math.max(1, ...diffs.map(rk => (st && st.combo[rk]) || 0));
  const bars = diffs.map(rk => {
    const n = (st && st.combo[rk]) || 0;
    const d = n && st.len ? n / st.len : null;
    return `<div class="cp-bar-row${rk === cur ? ' on' : ''}">
      <span class="lb">${rk}</span>
      <span class="cp-bar-track"><i style="width:${Math.max(3, n / maxCombo * 100)}%"></i></span>
      <span class="vv">${n ? n : '—'}${d ? ' <s>· ' + d.toFixed(1) + '/s</s>' : ''}</span>
    </div>`;
  }).join('');

  const pct = cur ? comboPct(cur, curConst, notes) : null;
  const best = curMine
    ? `<div class="cp-best">
        <span class="big">${r2(curMine.a)}%</span>
        <span class="m">${curMine.s ? curMine.s.toLocaleString('en-US') : '—'}</span>
        <span class="badge ${curMine.a >= 99.995 ? 'mint' : curMine.fc ? 'accent' : ''}">${gradeOf(curMine)}</span>
        <span class="m">RKS ${r2(curMine.rk)}</span>
        ${curMine.rk >= (A.cutoff || 0) ? '<span class="m" style="color:var(--mint)">B30</span>' : ''}
        <span class="m" style="color:var(--text-3)">${esc(t('cp.best'))}</span>
      </div>`
    : `<div class="cp-best"><span class="none">${esc(t('cp.notPlayed'))} · ${esc(t('cp.notPlayedHint'))}</span></div>`;

  return `
    <div class="card-head">
      <div class="cp-title">
        <h3>${esc(c.song)}</h3>
        <div class="cp-sub">${sub.map(x => `<span>${x}</span>`).join('<i></i>')}</div>
      </div>
      <button class="icon-btn" id="chartClose" aria-label="${esc(t('cp.close'))}">✕</button>
    </div>

    ${diffs.length ? `<div class="cp-diffs">${diffBtns}</div>` : ''}

    ${st && notes ? `
      <div class="cp-facts">${facts.map(([k, v, sm]) =>
        `<div class="cp-fact"><span>${esc(k)}</span><b class="${sm ? 'sm' : ''}">${esc(v)}</b></div>`).join('')}</div>
      <div class="cp-bars">${bars}</div>
      ${pct != null ? `<p class="hint" style="margin:-6px 0 10px">${esc(t('cp.percentile', { p: pct }))}</p>` : ''}
    ` : `
      <div class="cp-facts">${facts.slice(0, 1).concat(facts.slice(5)).map(([k, v, sm]) =>
        `<div class="cp-fact"><span>${esc(k)}</span><b class="${sm ? 'sm' : ''}">${esc(v)}</b></div>`).join('')}</div>
      <p class="hint" style="margin:2px 0 12px"><b>${esc(t('cp.noStats'))}</b> — ${esc(t('cp.noStatsHint'))}</p>
    `}

    ${best}
    <p class="cp-foot">${esc(t('cp.dataNote'))}</p>`;
}

function openChart(name, diff) {
  const card = $('#chartCard');
  const draw = d => {
    const c = chartOf(name, d || diff);
    if (!c.lib && !c.diffs.length) return false;
    card.dataset.song = c.lib ? c.song : name;
    card.dataset.diff = c.diff || '';
    card.innerHTML = chartHTML(c);
    const close = $('#chartClose');
    if (close) close.addEventListener('click', closeChart);
    return true;
  };
  if (!draw(diff)) return toast(t('toast.unknownSong'), 'err');
  ui.chartName = name;
  $('#chartModal').hidden = false;
  // 曲库先到、谱面统计后到，赶在中间点开会误判「未收录」——统计到了再重画一次
  if (PL.statsReady()) return;
  PL.onStats(() => {
    if ($('#chartModal').hidden || ui.chartName !== name) return;
    draw(card.dataset.diff || diff);
  });
}

function closeChart() { $('#chartModal').hidden = true; }

/* ---------------- 设置 ---------------- */
function syncSet() {
  const k = $('#setKeyState');
  if (k) k.textContent = S.key ? t('set.keyOwn') : t('set.keyFree');
  $$('#setTheme .chip').forEach(b => b.classList.toggle('on', b.dataset.theme === ui.theme));
  if (PL.getLang) $$('#setLang .chip').forEach(b => b.classList.toggle('on', b.dataset.lang === PL.getLang()));
  const v = $('#setVer');
  if (v) v.textContent = PL.VERSION || '2.2.0';
}

function openSet() {
  syncSet();
  $('#setModal').hidden = false;
  if (PL.applyStatic) PL.applyStatic($('#setModal'));
}
function closeSet() { $('#setModal').hidden = true; }

/** 设置里的「清空本地数据」：成绩、快照、备注、API Key 一起清掉 */
function clearAll() {
  S.data = []; S.official = null; S.nick = ''; S.sum3 = null;
  S.source = ''; S.updatedAt = 0; S.snapshots = []; S.notes = ''; S.key = '';
  try {
    [K.key, K.notes, K.data, K.meta, K.snap].forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  const notes = $('#notes');
  if (notes) notes.value = '';
  const apiKey = $('#apiKey');
  if (apiKey) apiKey.value = '';
  syncKeyDot();
  renderAll();
}

/* ---------------- 新手教程 ---------------- */
const TOUR = [
  { t: 'tour.s1t', b: 'tour.s1b', tip: 'tour.s1tip', go: 'data', goLabel: 'tour.go' },
  { t: 'tour.s2t', b: 'tour.s2b', tip: 'tour.s2tip', go: 'overview' },
  { t: 'tour.s3t', b: 'tour.s3b', tip: 'tour.s3tip', go: 'push' },
  { t: 'tour.s4t', b: 'tour.s4b', tip: 'tour.s4tip', go: 'ai' },
  { t: 'tour.s5t', b: 'tour.s5b', tip: 'tour.s5tip' }
];

function renderTour(i) {
  const step = TOUR[i];
  const last = i === TOUR.length - 1;
  $('#tourDots').innerHTML = TOUR.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  $('#tourBody').innerHTML = `
    <div class="tour-kicker">${esc(t('tour.kicker', { n: i + 1, t: TOUR.length }))}</div>
    <h3>${esc(t(step.t))}</h3>
    <p>${t(step.b)}</p>
    <div class="tour-tip">${t(step.tip)}</div>
    ${step.go && step.goLabel ? `<div class="tour-go"><button class="btn tiny ghost" data-tour-go="${step.go}">${esc(t(step.goLabel))}</button></div>` : ''}`;
  $('#tourPrev').disabled = i === 0;
  $('#tourNext').textContent = last ? t('tour.done') : t('tour.next');
  ui.tour = i;
}

function openTour() {
  ui.tour = 0;
  renderTour(0);
  $('#tour').hidden = false;
}

function closeTour() {
  $('#tour').hidden = true;
  try { localStorage.setItem(K.tour, '1'); } catch (e) {}
}

/* ---------------- AI ---------------- */
function md(src) {
  const lines = esc(String(src || '')).split('\n');
  const inline = s => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  let html = '', i = 0;
  const flushList = (tag, items) => `<${tag}>${items.map(x => `<li>${inline(x)}</li>`).join('')}</${tag}>`;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (!t) { i++; continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { html += '<hr>'; i++; continue; }

    const h = /^(#{1,4})\s+(.*)$/.exec(t);
    if (h) {
      const lv = Math.min(3, h[1].length);
      html += `<h${lv}>${inline(h[2])}</h${lv}>`;
      i++; continue;
    }

    if (/^>\s?/.test(t)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
      html += `<blockquote>${inline(buf.join('<br>'))}</blockquote>`;
      continue;
    }

    if (/^\|.*\|$/.test(t) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(t);
      i += 2;
      const body = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { body.push(cells(lines[i].trim())); i++; }
      html += '<table><thead><tr>' + head.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        body.map(row => '<tr>' + row.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
      continue;
    }

    if (/^[-*+]\s+/.test(t)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*+]\s+/, '')); i++; }
      html += flushList('ul', items);
      continue;
    }

    if (/^\d+[.)]\s+/.test(t)) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+[.)]\s+/, '')); i++; }
      html += flushList('ol', items);
      continue;
    }

    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|[-*+]\s|\d+[.)]\s|>|\||-{3,})/.test(lines[i].trim())) {
      buf.push(lines[i].trim()); i++;
    }
    if (buf.length) html += `<p>${buf.map(inline).join('<br>')}</p>`;
    else i++;
  }
  return html;
}

function outScroll() {
  const out = $('#out');
  out.scrollTop = out.scrollHeight;
}

async function callAI(messages, onDelta, model, signal) {
  const body = { model: model || 'deepseek-chat', messages, stream: true, temperature: 0.55, max_tokens: 2200 };

  // 自己的 Key 优先直连 DeepSeek；没有 Key 就只走后端，用站点的免费额度。
  const attempts = [];
  if (S.key) {
    attempts.push(() => fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.key },
      body: JSON.stringify(body)
    }));
  }
  const gw = { 'Content-Type': 'application/json', 'X-Client-Id': clientId() };
  // 走自己的 Key 时用 X-User-Key 传：托管平台会往每个请求塞它自己的 Authorization，
  // 用那个头传 Key 会被覆盖掉，后端也没法靠它判断「用户带没带 Key」。
  if (S.key) gw['X-User-Key'] = S.key;
  attempts.push(() => fetch('/api/ai', {
    method: 'POST', signal, headers: gw, body: JSON.stringify(body)
  }));

  let res = null, lastErr = null;
  for (const fn of attempts) {
    try {
      res = await fn();
      if (res.ok) break;
      if (res.status === 401) throw new Error(t('ai.err401'));
      if (res.status === 402 || res.status === 429 || res.status === 503) {
        // 后端会给出人话（免费额度用完 / 没配 Key / 免费 Key 失效），优先用它
        let detail = '', code = '';
        try { const j = await res.json(); detail = (j && j.error) || ''; code = (j && j.code) || ''; } catch (e) {}
        const err = new Error(detail || t('ai.err429', { c: res.status }));
        err.code = code; // FREE_* 时不提示「先跑 node proxy.js」，那不是网络问题
        throw err;
      }
      lastErr = new Error('HTTP ' + res.status);
      res = null;
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      lastErr = e; res = null;
    }
  }
  if (!res || !res.ok) throw (lastErr || new Error(t('ai.errReq')));

  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop();
    for (const ln of parts) {
      const t = ln.trim();
      if (!t.startsWith('data:')) continue;
      const p = t.slice(5).trim();
      if (p === '[DONE]') continue;
      try {
        const j = JSON.parse(p);
        const d = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
        if (d) onDelta(d);
      } catch (e) {}
    }
  }
}

function setBusy(on) {
  ui.streaming = on;
  $('#genBtn').disabled = on;
  $('#sendBtn').disabled = on;
  $('#stopBtn').disabled = !on;
  $('#localBtn').disabled = on;
}

async function generate() {
  if (!S.data.length) return toast(t('toast.needData'), 'err');
  // 没有自己的 Key 也能跑：后端有免费额度，用完了后端会给出明确提示
  const out = $('#out');
  setBusy(true);
  setState(t('ai.generating'));
  const prompt = buildPrompt(S.preset);
  S.msgs = [{ role: 'user', content: prompt }];
  let acc = '';
  out.innerHTML = '<span class="cursor"></span>';
  ui.aborter = new AbortController();

  try {
    await callAI(S.msgs, d => {
      acc += d;
      out.innerHTML = md(acc) + '<span class="cursor"></span>';
      outScroll();
    }, S.model, ui.aborter.signal);
    S.msgs.push({ role: 'assistant', content: acc });
    out.innerHTML = md(acc);
    setState(t('ai.done', { n: acc.length }));
  } catch (e) {
    if (e.name === 'AbortError') {
      out.innerHTML = md(acc) + '<p class="hint">' + esc(t('ai.stopped')) + '</p>';
    } else {
      // 额度类的错误跟网络无关，别甩一句「先运行 node proxy.js」误导人
      const isFree = /^FREE_/.test(e.code || '');
      out.innerHTML = `<p style="color:var(--rose)">${esc(t('ai.fail', { e: e.message || e }))}</p>
        <p class="hint">${isFree ? esc(t('ai.freeHint'))
          : esc(t('ai.cors')) + '<code>node proxy.js</code>' + esc(t('ai.corsTail'))}</p>`;
      // 报错本身就把原因说清楚了，别再追一句「额度用完了」
      setState('');
      $('#aiState').dataset.quota = '1';
    }
  }
  setBusy(false);
  ui.aborter = null;
  syncQuota();
}

/**
 * 状态行统一入口：记住「主文案」，免费额度作为副文案追加在后面。
 * 各处直接写 textContent 会把追加的额度冲掉，所以状态行只从这里写。
 */
function setState(txt) {
  const el = $('#aiState');
  if (!el) return;
  el.dataset.base = txt || '';
  el.textContent = txt || '';
  el.dataset.quota = '';
  syncQuota();
}

/**
 * 没填自己的 Key 时，把「今天还剩几次免费额度」拼到状态行后面。
 * 只在状态行有主文案时追加，避免覆盖「生成中…」或者报错信息。
 */
async function syncQuota() {
  const el = $('#aiState');
  if (!el || S.key || ui.streaming || el.dataset.quota === '1') return;
  try {
    // 带上同一个 X-Client-Id：反代不给 XFF 时（比如本地直连），
    // 后端按这个 id 分桶，不带的话这里查到的份数和实际消耗的对不上
    const r = await fetch('/api/ai/quota', { headers: { 'X-Client-Id': clientId() } });
    if (!r.ok) return;
    const j = await r.json();
    if (!j.free || ui.streaming) return;
    const txt = j.left > 0 ? t('ai.freeQuota', { n: j.left }) : t('ai.freeNone');
    const base = el.dataset.base || '';
    el.dataset.quota = '1';
    el.textContent = base ? base + '　·　' + txt : txt;
  } catch (e) {}
}

async function chat() {
  const input = $('#chatIn');
  const q = input.value.trim();
  if (!q) return;
  if (!S.msgs.length) { await generate(); if (!S.msgs.length) return; }

  const out = $('#out');
  input.value = '';
  S.msgs.push({ role: 'user', content: q });

  const wrap = document.createElement('div');
  wrap.className = 'turn';
  wrap.innerHTML = `<div class="ltag">${esc(t('ai.you'))}</div><p>${esc(q)}</p><div class="ltag" style="margin-top:10px">AI</div><div class="ans"></div>`;
  out.appendChild(wrap);
  const ans = wrap.querySelector('.ans');

  setBusy(true);
  ui.aborter = new AbortController();
  let acc = '';
  try {
    await callAI(S.msgs, d => {
      acc += d;
      ans.innerHTML = md(acc);
      outScroll();
    }, S.model, ui.aborter.signal);
    S.msgs.push({ role: 'assistant', content: acc });
  } catch (e) {
    ans.innerHTML = `<p style="color:var(--rose)">${esc(e.name === 'AbortError' ? t('ai.stopped') : e.message || e)}</p>`;
  }
  setBusy(false);
  ui.aborter = null;
  outScroll();
  // 聊天同样吃免费额度，追问完把状态行的剩余次数刷新一下
  delete $('#aiState').dataset.quota;
  syncQuota();
}

function runOffline() {
  if (!S.data.length) return toast(t('toast.needData'), 'err');
  const report = offlineReport();
  const out = $('#out');
  out.innerHTML = md(report);
  S.msgs = [{ role: 'assistant', content: report }];
  setState(t('ai.offlineState'));
  toast(t('toast.offlineDone'));
}

function copyOut() {
  const last = S.msgs.filter(m => m.role === 'assistant').pop();
  const text = last ? last.content : $('#out').innerText;
  navigator.clipboard.writeText(text).then(
    () => toast(t('toast.copied')),
    () => toast(t('toast.copyFail'), 'err')
  );
}

function downloadMd() {
  const last = S.msgs.filter(m => m.role === 'assistant').pop();
  const text = last ? last.content : '';
  if (!text) return toast(t('toast.nothing'), 'err');
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `phigros-report-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------------- 数据源 ---------------- */
function applyPayload(j, source) {
  const list = (j.all && j.all.length ? j.all : j.b30) || [];
  if (!list.length) throw new Error(t('msg.noScores'));
  S.data = list.map(x => ({
    n: x.song,
    d: x.rank,
    c: x.difficulty,
    a: typeof x.acc === 'number' ? x.acc : Number(x.acc) || 0,   // 保留原始精度，四舍五入会让 RKS 与命令行差 0.0003
    s: x.score || 0,
    id: x.id || undefined,
    fc: x.fc ? 1 : 0,
    phi: x.phi ? 1 : 0
  }));
  S.official = j.rks && j.rks.official != null ? j.rks.official
    : j.summary && j.summary.rankingScore != null ? j.summary.rankingScore : null;
  S.nick = j.player || S.nick || '';
  S.source = source;
  S.updatedAt = Date.now();
  saveLS();
}

async function pullToken(tk) {
  const m = $('#bindMsg');
  m.className = 'msg';
  m.textContent = t('msg.pulling');
  try {
    // token 走请求头：query string 会被反代/CDN 的访问日志整行记下来
    // lean=1：不回 b30（它就是 all 的前 30 条）
    const r = await fetch('/api/phi/all?lean=1', { headers: { 'X-Session-Token': tk } });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    applyPayload(j, 'cloud');
    S.tk = tk;
    saveLS();
    pushSnapshot(false);
    renderAll();
    switchTab('overview');
    m.className = 'msg ok';
    m.textContent = t('msg.pulled', { n: S.data.length, v: S.official != null ? r4(S.official) : '—' });
    toast(t('toast.imported', { n: S.data.length }));
  } catch (e) {
    m.className = 'msg err';
    m.textContent = t('msg.pullFail', { e: e.message || e });
    toast(t('toast.pullFail'), 'err');
  }
}

async function pull() {
  const tk = $('#token').value.trim();
  if (!tk) { toast(t('toast.needToken'), 'err'); return; }
  await pullToken(tk);
}

async function bind() {
  const tk = $('#token').value.trim();
  const m = $('#bindMsg');
  m.className = 'msg';
  if (!tk) { m.textContent = t('msg.needToken'); m.className = 'msg err'; return; }
  m.textContent = t('msg.connecting');
  try {
    const r = await fetch('/api/cloud/users/me', { headers: { 'X-Session-Token': tk } });
    const j = await r.json();
    if (!r.ok) throw new Error((j && (j.error || j.message)) || ('HTTP ' + r.status));
    const who = j.nickname || j.username || j.objectId || t('msg.unknownAcct');
    m.className = 'msg ok';
    m.textContent = t('msg.connected', { w: who });
    toast(t('msg.acctOk', { w: who }));
  } catch (e) {
    m.className = 'msg err';
    m.textContent = t('msg.bindFail', { e: e.message || e });
  }
}

/* 把 TapTap 给的 qrcode_url 画成二维码。官方要求接入端自己按 qrcode_url 出码，
   链接里带着 ?qrcode=1&user_code=，扫到就能直接授权，不用手填短码。 */
function drawLoginQR(url) {
  const wrap = $('#loginQrWrap'), box = $('#loginQr');
  if (!wrap || !box) return;
  if (!url || !window.PLQR) { wrap.hidden = true; box.innerHTML = ''; return; }
  try {
    /* 二维码固定黑码白底：跟随主题反而会降低识别率 */
    box.innerHTML = PLQR.toSVG(PLQR.encode(url), { margin: 2, dark: '#000000', light: '#ffffff' });
    wrap.hidden = false;
  } catch (e) {
    wrap.hidden = true;
    box.innerHTML = '';
  }
}

async function startLogin() {
  const box = $('#loginBox'), st = $('#loginStatus');
  box.hidden = false;
  st.className = 'msg';
  st.textContent = t('login.requesting');
  $('#loginCode').textContent = '·····';
  drawLoginQR('');
  try {
    const r = await fetch('/api/phi/login');
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    $('#loginCode').textContent = j.userCode;
    const a = $('#loginLink');
    a.textContent = j.url;
    a.href = j.url;
    drawLoginQR(j.url);
    st.textContent = t('login.waiting', { m: Math.round(j.expiresIn / 60) });
    pollLogin(j.id);
  } catch (e) {
    st.className = 'msg err';
    st.textContent = t('login.fail', { e: e.message || e });
  }
}

async function pollLogin(id) {
  const st = $('#loginStatus');
  for (let i = 0; i < 250; i++) {
    await new Promise(r => setTimeout(r, 1200));
    try {
      const r = await fetch('/api/phi/login/poll?id=' + encodeURIComponent(id));
      const j = await r.json();
      if (j.status === 'ok') {
        $('#token').value = j.token;
        S.nick = j.nickname || S.nick;
        st.className = 'msg ok';
        st.textContent = t('login.ok', { nick: j.nickname ? t('login.okNick', { n: j.nickname }) : '' });
        setTimeout(() => { $('#loginBox').hidden = true; }, 1600);
        return pullToken(j.token);
      }
      if (j.status === 'scanned') { st.textContent = t('login.scanned'); st.className = 'msg'; }
      if (j.status === 'expired') {
        st.className = 'msg err';
        st.textContent = t('login.expired');
        drawLoginQR('');
        return;
      }
      if (!r.ok) { st.className = 'msg err'; st.textContent = j.error || t('msg.loginErr'); return; }
    } catch (e) {}
  }
}

async function uploadFile(file) {
  const m = $('#fileMsg');
  if (!file) return;
  m.className = 'msg';
  m.textContent = t('msg.parsing', { f: file.name });
  try {
    const buf = await file.arrayBuffer();
    const r = await fetch('/api/phi/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: buf
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    applyPayload(j, 'file');
    pushSnapshot(false);
    renderAll();
    switchTab('overview');
    m.className = 'msg ok';
    m.textContent = t('msg.parsed', { n: S.data.length });
    toast(t('toast.parseDone', { n: S.data.length }));
  } catch (e) {
    m.className = 'msg err';
    m.textContent = t('msg.parseFail', { e: e.message || e });
    toast(t('toast.parseFail'), 'err');
  }
}

/* ---------------- 弹窗 ---------------- */
function openKeyModal() {
  $('#keyModal').hidden = false;
  $('#apiKey').value = S.key;
  setTimeout(() => $('#apiKey').focus(), 60);
}
function closeKeyModal() { $('#keyModal').hidden = true; }

function syncKeyDot() {
  $('#keyDot').classList.toggle('on', !!S.key);
}

/* ---------------- 标签页 ---------------- */
const TABS = ['overview', 'push', 'plan', 'ai', 'data'];

function switchTab(name) {
  if (!TABS.includes(name)) name = 'overview';
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  $$('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + name));
  if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  if (name === 'plan') renderPlanSide();
  if (name === 'ai' && !$('#out').dataset.init) {
    $('#out').dataset.init = '1';
    syncQuota();
  }
}

/* ---------------- 渲染总控 ---------------- */
function renderAll() {
  renderBanner();
  renderHero();
  renderStats();
  renderCharts();
  renderDiag();
  renderPlayerChip();
  renderPush();
  renderPlanSide();
  renderDataTable();
  renderSnapshots();

  if (!$('#planTarget').value) {
    const A = analysis();
    $('#planTarget').value = (Math.round((A.eff + 0.1) * 100) / 100).toFixed(2);
  }
  if (S.data.length) {
    runPlan();
  } else {
    $('#planSummary').innerHTML = '';
    $('#planTable').innerHTML = '';
    $('#planHint').textContent = t('plan.hintIdle');
  }
}

/* ---------------- 事件绑定 ---------------- */
function bindEvents() {
  // 顶栏
  $('#themeBtn').addEventListener('click', () => applyTheme(ui.theme === 'dark' ? 'light' : 'dark'));
  $('#langBtn').addEventListener('click', toggleLang);
  $('#keyBtn').addEventListener('click', openKeyModal);
  $('#modalClose').addEventListener('click', closeKeyModal);
  $('#keyModal').addEventListener('click', e => { if (e.target.id === 'keyModal') closeKeyModal(); });

  // 设置
  $('#setBtn').addEventListener('click', openSet);
  $('#setClose').addEventListener('click', closeSet);
  $('#setModal').addEventListener('click', e => { if (e.target.id === 'setModal') closeSet(); });
  $('#setTheme').addEventListener('click', e => {
    const b = e.target.closest('[data-theme]');
    if (!b) return;
    applyTheme(b.dataset.theme);
    syncSet();
  });
  $('#setLang').addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (!b || b.dataset.lang === (PL.getLang ? PL.getLang() : 'zh')) return;
    toggleLang();
    syncSet();
  });
  $('#setKeyBtn').addEventListener('click', () => { closeSet(); openKeyModal(); });
  $('#setExport').addEventListener('click', () => $('#exportBtn').click());
  $('#setClear').addEventListener('click', () => {
    if (!confirm(t('set.clearAsk'))) return;
    clearAll();
    closeSet();
    toast(t('set.clearDone'));
  });
  $('#setTourBtn').addEventListener('click', () => { closeSet(); openTour(); });

  // 谱面预览
  $('#chartModal').addEventListener('click', e => { if (e.target.id === 'chartModal') closeChart(); });
  $('#chartCard').addEventListener('click', e => {
    const b = e.target.closest('[data-cdiff]');
    if (!b) return;
    const card = $('#chartCard');
    openChart(card.dataset.song, b.dataset.cdiff);
  });
  ['#pushTable', '#dataTable', '#planTable'].forEach(sel => {
    const tb = $(sel);
    if (!tb) return;
    tb.addEventListener('click', e => {
      const tr = e.target.closest('tr.clk');
      if (!tr) return;
      openChart(tr.dataset.song, tr.dataset.diff);
    });
    tb.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const tr = e.target.closest('tr.clk');
      if (!tr) return;
      e.preventDefault();
      openChart(tr.dataset.song, tr.dataset.diff);
    });
  });

  // 新手教程
  $('#tourNext').addEventListener('click', () => {
    if (ui.tour >= TOUR.length - 1) return closeTour();
    renderTour(ui.tour + 1);
  });
  $('#tourPrev').addEventListener('click', () => { if (ui.tour > 0) renderTour(ui.tour - 1); });
  $('#tourSkip').addEventListener('click', closeTour);
  $('#tourBody').addEventListener('click', e => {
    const b = e.target.closest('[data-tour-go]');
    if (!b) return;
    closeTour();
    switchTab(b.dataset.tourGo);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#chartModal').hidden) return closeChart();
    if (!$('#setModal').hidden) return closeSet();
    if (!$('#tour').hidden) return closeTour();
  });
  $('#saveKeyBtn').addEventListener('click', () => {
    S.key = $('#apiKey').value.trim();
    localStorage.setItem(K.key, S.key);
    syncKeyDot();
    $('#keyState').className = 'msg ok';
    $('#keyState').textContent = S.key ? t('key.saved') : t('key.cleared');
    toast(S.key ? t('key.saveToast') : t('key.clearToast'));
    if (S.key) setTimeout(closeKeyModal, 400);
  });
  $('#clearKeyBtn').addEventListener('click', () => {
    S.key = '';
    localStorage.setItem(K.key, '');
    $('#apiKey').value = '';
    syncKeyDot();
    $('#keyState').className = 'msg';
    $('#keyState').textContent = t('key.cleared');
  });

  // 标签
  $$('#tabs button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g) switchTab(g.dataset.goto);
  });

  // 顶栏吸顶边框
  window.addEventListener('scroll', () => {
    $('.topbar').classList.toggle('stuck', window.scrollY > 6);
  }, { passive: true });

  // 快捷快照
  const snap = () => {
    if (!S.data.length) return toast(t('toast.noData'), 'err');
    pushSnapshot(true);
    renderSnapshots();
    renderCharts();
    renderHero();
    toast(t('toast.snapshot'));
  };
  $('#snapQuick').addEventListener('click', snap);
  $('#snapBtn').addEventListener('click', snap);

  // 推分
  const rerenderPush = () => renderPush();
  $('#pushSearch').addEventListener('input', e => { ui.push.q = e.target.value; rerenderPush(); });
  $('#pushTarget').addEventListener('change', e => {
    ui.push.target = parseFloat(e.target.value) || 99.5;
    rerenderPush();
  });
  $('#pushSort').addEventListener('change', e => { ui.push.sort = e.target.value; rerenderPush(); });
  $('#pushOut').addEventListener('change', e => { ui.push.includeOut = e.target.checked; rerenderPush(); });
  $('#pushFoot').addEventListener('click', e => {
    if (!e.target.closest('#pushMore')) return;
    ui.push.limit = 1000;
    renderPush();
  });
  document.addEventListener('scroll', updateFades, { passive: true, capture: true });
  window.addEventListener('resize', updateFades);
  $('#pushDiff').addEventListener('click', e => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    ui.push.diff = b.dataset.d;
    $$('#pushDiff .chip').forEach(c => c.classList.toggle('on', c === b));
    rerenderPush();
  });

  // 目标
  $('#planBtn').addEventListener('click', runPlan);
  $('#planPresets').addEventListener('click', e => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const A = analysis();
    const v = Math.round((A.eff + parseFloat(b.dataset.add)) * 100) / 100;
    $('#planTarget').value = v.toFixed(2);
    $$('#planPresets .chip').forEach(c => c.classList.toggle('on', c === b));
    runPlan();
  });
  $('#planSlots').addEventListener('change', () => { if ($('#planSummary').innerHTML.trim()) runPlan(); });
  $('#planSummary').addEventListener('click', e => {
    const b = e.target.closest('[data-slots]');
    if (!b) return;
    $('#planSlots').value = b.dataset.slots;
    runPlan();
  });

  // AI
  $('#aiPresets').addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    S.preset = b.dataset.p;
    localStorage.setItem(K.preset, S.preset);
    $$('#aiPresets .chip').forEach(c => c.classList.toggle('on', c === b));
  });
  let notesTimer;
  $('#notes').addEventListener('input', e => {
    S.notes = e.target.value;
    clearTimeout(notesTimer);
    notesTimer = setTimeout(saveLS, 400);
  });
  $('#aiModel').addEventListener('change', e => { S.model = e.target.value; localStorage.setItem(K.model, S.model); });
  $('#genBtn').addEventListener('click', generate);
  $('#stopBtn').addEventListener('click', () => { if (ui.aborter) ui.aborter.abort(); });
  $('#localBtn').addEventListener('click', runOffline);
  $('#copyBtn').addEventListener('click', copyOut);
  $('#dlBtn').addEventListener('click', downloadMd);
  $('#sendBtn').addEventListener('click', chat);
  $('#chatIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) chat(); });
  $('#apiKey').addEventListener('keydown', e => { if (e.key === 'Enter') $('#saveKeyBtn').click(); });
  $('#token').addEventListener('keydown', e => { if (e.key === 'Enter') pull(); });
  $('#planTarget').addEventListener('keydown', e => { if (e.key === 'Enter') runPlan(); });

  // 数据
  $('#loginBtn').addEventListener('click', startLogin);
  $('#bindBtn').addEventListener('click', bind);
  $('#pullBtn').addEventListener('click', pull);
  $('#token').addEventListener('input', e => { S.tk = e.target.value.trim(); });

  $('#importBtn').addEventListener('click', () => {
    const res = importText($('#paste').value);
    const m = $('#importMsg');
    m.className = 'msg ' + (res.ok ? 'ok' : 'err');
    if (!res.ok) { m.textContent = res.msg; return; }
    m.textContent = t('msg.importedN', { n: res.count });
    pushSnapshot(false);
    renderAll();
    toast(t('toast.imported', { n: res.count }));
  });
  $('#demoBtn').addEventListener('click', () => {
    S.data = PL.DEMO.map(x => ({ ...x }));
    S.official = null; S.nick = ''; S.sum3 = null; S.source = 'demo'; S.updatedAt = Date.now();
    saveLS(); renderAll();
    $('#importMsg').className = 'msg ok';
    $('#importMsg').textContent = t('msg.demoLoaded');
  });
  $('#clearBtn').addEventListener('click', () => {
    S.data = []; S.official = null; S.nick = ''; S.sum3 = null; S.source = ''; S.updatedAt = 0;
    saveLS(); renderAll();
    $('#importMsg').className = 'msg';
    $('#importMsg').textContent = t('msg.cleared');
  });
  // 导出 B30 分享图（概览页 + 数据页各一个入口）
  const exportPoster = async btn => {
    if (!S.data.length) return toast(t('toast.needData'), 'err');
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = t('poster.exporting');
    try {
      const res = await PL.exportB30Image({
        /* 首次导出要抓 30 张曲绘（之后走缓存），顺手把进度显示在按钮上 */
        onProgress: (d, n) => { btn.textContent = t('poster.art', { d, n }); }
      });
      const art = res.art ? t('poster.withArt', { n: res.art }) : '';
      toast(t('poster.done') + ' · ' + res.width + '×' + res.height + (art ? ' · ' + art : ''));
    } catch (e) {
      toast(t('poster.fail', { e: e.message || e }), 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  };
  ['#b30Export', '#b30Export2'].forEach(sel => {
    const b = $(sel);
    if (b) b.addEventListener('click', () => exportPoster(b));
  });

  $('#exportBtn').addEventListener('click', () => {
    if (!S.data.length) return toast(t('toast.noData'), 'err');
    const blob = new Blob([exportJSON()], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `phigros-scores-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('#dataSearch').addEventListener('input', e => { ui.dataQ = e.target.value; renderDataTable(); });

  // 拖拽
  const drop = $('#drop');
  const fileIn = $('#fileIn');
  drop.addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => { uploadFile(fileIn.files[0]); fileIn.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault();
    if (ev === 'dragleave' && drop.contains(e.relatedTarget)) return;
    drop.classList.remove('over');
  }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) uploadFile(f);
  });
  // 整页也允许拖
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /\.(save|zip)$/i.test(f.name)) {
      switchTab('data');
      uploadFile(f);
    }
  });

  // 键盘
  document.addEventListener('keydown', e => {
    // e.target 可能是 document 本身（脚本派发的事件），没有 matches，别直接调
    const tag = e.target && e.target.matches ? e.target : null;
    if (tag && tag.matches('input,textarea,select')) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.key === 'Escape') { closeKeyModal(); return; }
    const idx = '12345'.indexOf(e.key);
    if (idx >= 0) switchTab(TABS[idx]);
  });
}

/* ---------------- 初始化 ---------------- */
function init() {
  loadLS();
  if (PL.initLang) PL.initLang();
  if (PL.applyStatic) PL.applyStatic();
  syncLangLabel();
  applyTheme(ui.theme, true);

  $('#notes').value = S.notes || '';
  $('#aiModel').value = S.model || 'deepseek-chat';
  $('#token').value = S.tk || '';
  $('#planSlots').value = '3';
  $$('#aiPresets .chip').forEach(c => c.classList.toggle('on', c.dataset.p === (S.preset || 'all')));
  syncKeyDot();

  bindEvents();
  renderAll();

  const h = location.hash.slice(1);
  if (TABS.includes(h)) switchTab(h);

  // 安卓客户端跑的是同一套页面，但没有 download/ 目录，别摆一个点了 404 的入口
  if (window.PhigrosAndroid) {
    ['#appLink', '#setAppRow'].forEach(sel => { const el = $(sel); if (el) el.remove(); });
  }

  // 首次进入走一遍教程。看过一次就记下来，之后不再打扰（设置里可以重看）
  let seen = '1';
  try { seen = localStorage.getItem(K.tour) || ''; } catch (e) {}
  if (!seen) setTimeout(openTour, 400);

  // 曲库异步加载后刷新依赖它的部分
  loadLibrary().then(() => {
    if (!S.library || !S.library.length) return;
    renderStats();
    renderPlanSide();
    renderPush();
    renderDataTable();
    renderDiag();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
