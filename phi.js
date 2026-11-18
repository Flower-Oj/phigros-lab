#!/usr/bin/env node
'use strict';
// phi.js — 本地版 phi-plugin 核心指令
//   node phi.js rks <token>
//   node phi.js b30 <token>            (-n 30)
//   node phi.js suggest <token>
//   node phi.js plan <token> 0.1
//   node phi.js song <曲名>
//   node phi.js file <存档路径.save>
//   末尾加 --global 走国际服，--json 输出原始数据
const save = require('./lib/save');
const info = require('./lib/info');
const rks = require('./lib/rks');
const taptap = require('./lib/taptap');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const SESSION_FILE = path.join(__dirname, 'data', '.session');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--')));
const args = argv.filter(a => !a.startsWith('--'));
const server = flags.has('--global') ? 'global' : 'cn';
const asJson = flags.has('--json');
const optN = (() => {
  const i = argv.findIndex(a => a === '-n');
  return i >= 0 ? parseInt(argv[i + 1], 10) || 30 : 30;
})();

const C = {
  dim: s => `\x1b[90m${s}\x1b[0m`,
  b: s => `\x1b[1m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`
};

const w = s => [...String(s)].reduce((n, ch) => n + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 2 : 1), 0);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - w(s)));
const padStart = (s, n) => ' '.repeat(Math.max(0, n - w(s))) + String(s);
const f2 = n => n.toFixed(2);
const f3 = n => n.toFixed(3);

function readSession() {
  try { return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')); } catch (e) { return null; }
}

function writeSession(obj) {
  try { fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 1)); } catch (e) {}
}

function resolveToken() {
  const arg = args[1];
  if (arg && /^[A-Za-z0-9]{25}$/.test(arg)) return arg;
  const s = readSession();
  if (s && s.token) return s.token;
  return arg || '';
}

function openUrl(u) {
  try {
    if (process.platform === 'win32') exec(`start "" "${u}"`, { shell: 'cmd.exe' });
    else if (process.platform === 'darwin') exec(`open "${u}"`);
    else exec(`xdg-open "${u}"`);
  } catch (e) {}
}

async function cmdLogin() {
  console.log('');
  console.log('  ' + C.dim('正在向 TapTap 申请登录码…'));
  const code = await taptap.requestCode(server);
  console.log('');
  console.log('  ' + C.b('用手机 TapTap 扫码，或打开链接输入字符码'));
  console.log('');
  console.log('    字符码   ' + C.b(C.cyan(code.userCode)));
  console.log('    链接     ' + C.cyan(code.url));
  console.log('');
  if (!flags.has('--no-open')) openUrl(code.url);
  console.log('  ' + C.dim(`有效期 ${Math.round(code.expiresIn / 60)} 分钟，Ctrl+C 可取消`));

  const deadline = Date.now() + code.expiresIn * 1000;
  let scannedShown = false, dots = 0;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, (code.interval || 1) * 1000));
    const st = await taptap.pollToken(code.deviceCode, code.deviceId, server);
    if (st.status === 'ok') {
      process.stdout.write('\r  ' + C.green('已授权，正在换取 sessionToken…') + '\n');
      const profile = await taptap.getProfile(st.data, server);
      const acc = await taptap.exchangeSession(profile, st.data, server);
      writeSession({ token: acc.sessionToken, nickname: profile.name || profile.nickname || '', server, at: Date.now() });
      console.log('');
      console.log('  ' + C.green('✓ 登录成功') + (profile.name ? C.dim('  账号：' + profile.name) : ''));
      console.log('  ' + C.dim('sessionToken  ') + C.b(acc.sessionToken));
      console.log('');
      console.log('  ' + C.dim('已保存到 data/.session，之后直接 node phi.js b30 即可，不用再带 token'));
      console.log('');
      return;
    }
    if (st.status === 'scanned' && !scannedShown) {
      scannedShown = true;
      process.stdout.write('\r  ' + C.cyan('已扫码，请在手机上确认…') + '        \n');
    }
    if (st.status === 'expired') throw new Error('二维码过期了，重新执行一次');
    if (!scannedShown && dots++ % 5 === 0) process.stdout.write('\r  ' + C.dim('等待扫码' + '.'.repeat(dots % 4 + 1) + '    '));
  }
  throw new Error('等待超时，重新执行一次');
}

async function load(which) {
  const t0 = Date.now();
  let data;
  if (args[0] === 'file') {
    data = save.loadFromFile(args[1]);
  } else {
    data = await save.loadFromToken(which, { server });
  }
  const entries = rks.enrich(data.records);
  const b = rks.computeB30(entries, data.summary ? data.summary.rankingScore : null);
  const st = rks.stats(entries);
  return { data, entries, b, st, ms: Date.now() - t0 };
}

function header(ctx) {
  const s = ctx.data.summary || {};
  const name = (ctx.data.player && (ctx.data.player.nickname || ctx.data.player.username)) || '本地存档';
  const line = '─'.repeat(46);
  console.log('');
  console.log(C.b('  ' + name) + C.dim(`   ${info.total()} 首曲库 · ${ctx.entries.length} 条成绩 · ${ctx.ms}ms`));
  if (s.saveVersion) {
    console.log(C.dim(`  存档 v${s.saveVersion} / 游戏 ${s.gameVersion} · 课题 ${s.challengeModeRank} · 头像 ${s.avatar}`));
    console.log(C.dim(`  官方 RKS ${C.b(s.rankingScore.toFixed(4))}`) + C.dim(`   本地估算 ${f3(ctx.b.est)}`));
  }
  console.log(C.dim('  ' + line));
}

function cmdRks(ctx) {
  const s = ctx.data.summary || {};
  const st = ctx.st;
  console.log(`  ${C.dim('综合 RKS')}   ${C.b(C.cyan((s.rankingScore || ctx.b.est).toFixed(4)))}`);
  console.log(`  ${C.dim('上榜平均定数')} ${f2(st.avgDiff)}   ${C.dim('平均单曲')} ${f2(st.avgRks)}   ${C.dim('转化率')} ${st.conv.toFixed(1)}%`);
  console.log(`  ${C.dim('平均准确率')}  ${st.avgAcc.toFixed(2)}%`);
  if (s.cleared) {
    console.log('');
    console.log('  ' + C.dim(pad('', 7) + pad('EZ', 8) + pad('HD', 8) + pad('IN', 8) + pad('AT', 8)));
    console.log('  ' + C.dim(pad('通关', 6)) + [0, 1, 2, 3].map(i => pad(s.cleared[i], 8)).join(''));
    console.log('  ' + C.dim(pad('FC', 6)) + [0, 1, 2, 3].map(i => pad(s.fullCombo[i], 8)).join(''));
    console.log('  ' + C.dim(pad('Phi', 6)) + [0, 1, 2, 3].map(i => pad(s.phi[i], 8)).join(''));
  }
}

function cmdB30(ctx) {
  const n = Math.min(optN, ctx.entries.length);
  console.log('  ' + C.dim(pad('#', 4) + pad('曲目', 34) + padStart('定数', 6) + padStart('acc', 9) + padStart('RKS', 7) + '  档'));
  for (let i = 0; i < n; i++) {
    const e = ctx.entries[i];
    const tag = e.rating === 'phi' ? C.cyan('Phi') : (e.rating === 'FC' ? C.green('FC') : C.dim(e.rating));
    const nm = e.song.length > 16 ? e.song.slice(0, 15) + '…' : e.song;
    console.log('  ' + C.dim(pad(i + 1, 4)) + pad(nm, 34) + padStart(e.rank + ' ' + e.difficulty.toFixed(1), 6) +
      padStart(e.acc.toFixed(2), 9) + padStart(f2(e.rks), 7) + '  ' + tag);
  }
  console.log('');
  console.log('  ' + C.dim(`最佳 27 合计 ${f2(ctx.b.sum27)} · 前 3 Phi ${f2(ctx.b.sum3)} · 估算 RKS ${f3(ctx.b.est)}`));
}

function cmdSuggest(ctx) {
  const rows = rks.suggest(ctx.entries, { cutoff: ctx.b.cutoff, limit: 15 });
  if (!rows.length) return console.log('  没有可推分的谱面。');
  console.log('  ' + C.dim(pad('#', 4) + pad('曲目', 30) + padStart('定数', 6) + padStart('当前', 8) + padStart('目标', 7) +
    padStart('增益', 8) + padStart('总RKS', 9) + '  状态'));
  rows.forEach((r, i) => {
    const nm = r.song.length > 14 ? r.song.slice(0, 13) + '…' : r.song;
    const state = r.inBoard ? C.green('已进榜') : (r.canBoard ? C.yellow('可进榜') : C.dim('榜外'));
    const gain = padStart('+' + f2(r.gain), 8);
    const total = padStart('+' + f3(r.total), 9);
    console.log('  ' + C.dim(pad(i + 1, 4)) + pad(nm, 30) + padStart(r.rank + ' ' + r.difficulty.toFixed(1), 6) +
      padStart(r.acc.toFixed(2), 8) + padStart(f2(r.target), 7) + C.green(gain) + C.green(total) + '  ' + state);
  });
  console.log('');
  console.log('  ' + C.dim('增益 = 单曲 RKS 净增，总 RKS 约等于增益 ÷ 30'));
}

function cmdPlan(ctx) {
  const delta = parseFloat(args[2] || '0.1') || 0.1;
  const p = rks.planFor(ctx.entries, delta);
  console.log(`  想把 RKS 抬 ${delta}，需要 ${p.slots} 张谱的单曲 RKS 达到 ${f2(p.targetRks)}（当前第 27 名 ${f2(p.cutoff)}）。`);
  console.log('');
  console.log('  ' + C.dim(pad('曲目', 32) + padStart('定数', 6) + padStart('现在', 8) + padStart('需要', 9)));
  p.pool.forEach(r => {
    const nm = r.song.length > 15 ? r.song.slice(0, 14) + '…' : r.song;
    const want = padStart(f2(r.wantAcc), 9);
    console.log('  ' + pad(nm, 32) + padStart(r.rank + ' ' + r.difficulty.toFixed(1), 6) +
      padStart(r.acc.toFixed(2), 8) + C.yellow(want));
  });
}

function cmdSong() {
  const q = args.slice(1).join(' ');
  const hits = info.search(q);
  if (!hits.length) return console.log('  没找到：' + q);
  hits.slice(0, 6).forEach(h => {
    console.log('  ' + C.b(h.song) + C.dim('  ' + h.composer));
    console.log('  ' + C.dim('  ') + ['EZ', 'HD', 'IN', 'AT'].filter(r => h.const[r] != null)
      .map(r => `${r} ${h.const[r].toFixed(1)}`).join('  '));
  });
}

function help() {
  console.log(`
  ${C.b('phi.js')}  ${C.dim('本地 Phigros 成绩工具（不需要 QQ 机器人）')}

  ${C.cyan('node phi.js login')}                扫码登录，自动保存 sessionToken
  ${C.cyan('node phi.js rks')}                  综合 RKS 与各难度统计
  ${C.cyan('node phi.js b30')}                  最佳成绩列表（-n 50 可改条数）
  ${C.cyan('node phi.js suggest')}              推分建议，按单曲增益排序
  ${C.cyan('node phi.js plan 0.1')}             要涨 0.1 需要哪些谱打到多少 acc
  ${C.cyan('node phi.js file <x.save>')}        直接解析本地存档文件
  ${C.cyan('node phi.js song <曲名>')}          查定数

  ${C.dim('登录后指令不必再带 token；也可手动追加 <token> 覆盖')}
  ${C.dim('选项：--global 国际服　--json 输出 JSON')}
`);
}

(async () => {
  if (!args.length || args[0] === 'help' || args[0] === '-h') return help();
  const cmd = args[0];
  if (cmd === 'song') return cmdSong();
  if (cmd === 'file' && !args[1]) return console.log('  用法：node phi.js file <path/to/.save>');
  try {
    if (cmd === 'login') return await cmdLogin();
    const ctx = await load(resolveToken());
    if (asJson) {
      return console.log(JSON.stringify({
        summary: ctx.data.summary, stats: ctx.st,
        b30: ctx.entries.slice(0, optN).map(e => ({ song: e.song, rank: e.rank, difficulty: e.difficulty, acc: e.acc, score: e.score, rks: e.rks }))
      }, null, 1));
    }
    header(ctx);
    if (cmd === 'rks') cmdRks(ctx);
    else if (cmd === 'b30') cmdB30(ctx);
    else if (cmd === 'suggest') cmdSuggest(ctx);
    else if (cmd === 'plan') cmdPlan(ctx);
    else if (cmd === 'file') {
      if (flags.has('--suggest')) cmdSuggest(ctx);
      else if (flags.has('--plan')) cmdPlan(ctx);
      else cmdB30(ctx);
    } else console.log('  未知指令，试试 node phi.js help');
    console.log('');
  } catch (e) {
    console.error('  ' + C.red('✕ ' + (e.message || e)));
    if (/fetch failed|ENOTFOUND|timeout/i.test(String(e.message))) {
      console.error('  ' + C.dim('  检查网络，或确认 token 没有过期'));
    }
    process.exitCode = 1;
  }
})();
