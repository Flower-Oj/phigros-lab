// Phigros Lab - local helper server
// 用法: node proxy.js  ->  http://localhost:8787
// 作用: 静态托管 index.html + 两个转发接口（DeepSeek / Phigros 云存档）

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8787);
// 托管到公网时平台会注入 PORT，此时必须监听 0.0.0.0 才能被反代到；
// 本地手跑不设 PORT，保持只听环回，别把 AI 转发接口暴露给整个局域网。
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const ROOT = __dirname;

const saveLib = require('./lib/save');
const infoLib = require('./lib/info');
const rksLib = require('./lib/rks');
const taptapLib = require('./lib/taptap');
const crypto = require('crypto');
const cache = new Map();
const logins = new Map();

// Phigros 官方客户端使用的 LeanCloud 凭据（公开的客户端常量）
const LC = {
  host: 'rak3ffdi.cloud.tds1.tapapis.cn',
  id: 'rAK3FfdieFob2Nn8Am',
  key: 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0'
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Id, X-User-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

// ---------- 免费额度 ----------
// Key 只从环境变量或 data/.freekey 读，绝不写进代码：这个仓库是公开的。
// 前端只会请求 /api/ai，拿不到 Key，也就不可能被扒走。
const FREE_PER_IP = Math.max(0, Number(process.env.FREE_PER_IP || 3));
const FREE_GLOBAL = Math.max(1, Number(process.env.FREE_GLOBAL || 200));

function readFreeKey() {
  try {
    const p = path.join(__dirname, 'data', '.freekey');
    return fs.readFileSync(p, 'utf8').split('\n')[0].trim();
  } catch (e) {
    return '';
  }
}

/**
 * 文件优先于环境变量：部署到托管平台时，环境里可能已经有一个来路不明的
 * FREE_KEY，那种情况下以仓库里我们自己的文件为准，免得免费额度用到别人的 key。
 */
function pickFreeKey() {
  const fromFile = readFreeKey();
  if (fromFile) return { key: fromFile, src: 'file' };
  const fromEnv = String(process.env.FREE_KEY || '').trim();
  if (fromEnv) return { key: fromEnv, src: 'env' };
  return { key: '', src: 'none' };
}

const _fk = pickFreeKey();
const FREE_KEY = _fk.key;
const FREE_KEY_SRC = _fk.src;

const quota = { day: '', buckets: new Map(), total: 0 };
// 额度落盘：平台重启沙箱时内存会清空，不能让「每天 3 次」被重启刷掉
const QUOTA_FILE = path.join(__dirname, 'data', '.quota.json');

function quotaDay() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function saveQuota() {
  try {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    const buckets = {};
    for (const [k, v] of quota.buckets) buckets[k] = v;
    const tmp = QUOTA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ day: quota.day, total: quota.total, buckets }));
    fs.renameSync(tmp, QUOTA_FILE);
  } catch (e) {}
}

function loadQuota() {
  try {
    const j = JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf8'));
    if (!j || !j.day) return;
    quota.day = String(j.day);
    quota.total = Number(j.total) || 0;
    for (const k of Object.keys(j.buckets || {})) {
      quota.buckets.set(k, Number(j.buckets[k]) || 0);
    }
  } catch (e) {}
}

function rollQuota() {
  const k = quotaDay();
  if (quota.day !== k) {
    quota.day = k;
    quota.buckets.clear();
    quota.total = 0;
    saveQuota();
  }
}

/**
 * 真实客户端 IP。
 * 取最右一跳：代理追加的那一项才是真实对端，客户端自己塞的伪造值在最左边——
 * 取最左等于把额度交给攻击者自己说了算。
 */
function clientIp(req) {
  const real = String(req.headers['x-real-ip'] || '').trim();
  if (real) return real;
  const xf = String(req.headers['x-forwarded-for'] || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (xf.length) return xf[xf.length - 1];
  return '';
}

/**
 * 一次请求同时落在两个桶上：IP 和浏览器匿名 id。
 * 只按 IP 会被「换网/换代理」绕过，只按 id 会被「清 localStorage」绕过；
 * 两个都记、按大的那个算，任何一种绕过都还需要另一种也换掉。
 */
function quotaKeys(req) {
  const keys = [];
  const ip = clientIp(req);
  if (ip) keys.push('ip:' + ip);
  const cid = String(req.headers['x-client-id'] || '').trim().slice(0, 64);
  if (cid) keys.push('cid:' + cid);
  if (!keys.length) keys.push('sock:' + ((req.socket && req.socket.remoteAddress) || 'unknown'));
  return keys;
}

function quotaUsed(req) {
  rollQuota();
  let n = 0;
  for (const k of quotaKeys(req)) n = Math.max(n, quota.buckets.get(k) || 0);
  return n;
}

/** 只在真正调通上游之后才计数，避免失败的请求白吃额度 */
function quotaTake(req) {
  rollQuota();
  for (const k of quotaKeys(req)) {
    quota.buckets.set(k, (quota.buckets.get(k) || 0) + 1);
  }
  quota.total += 1;
  saveQuota();
}

function readBody(req, limit = 32 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---------- DeepSeek 转发（流式） ----------
// 带了 Authorization 就用调用者自己的 Key（不限额）；
// 没带就用服务端那把免费 Key，按 IP 每天 FREE_PER_IP 次。
function proxyAI(req, res, body) {
  let parsed;
  try {
    parsed = JSON.parse(body.toString('utf8') || '{}');
  } catch (e) {
    return sendJson(res, 400, { error: '请求体不是合法 JSON' });
  }
  const payload = JSON.stringify({ ...parsed, stream: true });

  // 只认 X-User-Key：托管平台会往每个请求里注入它自己的 Authorization，
  // 拿 Authorization 判断「用户带没带 Key」会被那条注入的头骗过去——
  // 结果就是免费额度永远不走，上游还按注入的 Key 回 401。
  const userKey = String(req.headers['x-user-key'] || '').trim();
  const own = userKey ? 'Bearer ' + userKey : '';
  const useFree = !own;

  if (useFree) {
    rollQuota();
    if (!FREE_KEY) {
      return sendJson(res, 503, {
        error: '服务端没有配置免费额度，点右上角钥匙填自己的 API Key',
        code: 'FREE_UNAVAILABLE'
      });
    }
    if (quota.total >= FREE_GLOBAL) {
      return sendJson(res, 429, {
        error: '今天的免费额度已被全部用完，填自己的 Key 可以继续',
        code: 'FREE_GLOBAL'
      });
    }
    if (quotaUsed(req) >= FREE_PER_IP) {
      return sendJson(res, 429, {
        error: '免费额度每天 ' + FREE_PER_IP + ' 次，今天已经用完；填自己的 Key 可以继续',
        code: 'FREE_QUOTA'
      });
    }
  }

  const r = https.request({
    host: 'api.deepseek.com',
    path: '/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': useFree ? 'Bearer ' + FREE_KEY : own,
      'Content-Length': Buffer.byteLength(payload)
    }
  }, up => {
    // 免费 Key 失效时不能把 401 原样透给前端——用户会以为自己的 Key 坏了
    if (useFree && (up.statusCode === 401 || up.statusCode === 402)) {
      up.resume();
      return sendJson(res, 503, {
        error: '站点的免费额度暂时不可用，点右上角钥匙填自己的 API Key',
        code: 'FREE_KEY_BAD'
      });
    }
    if (useFree && up.statusCode === 200) quotaTake(req);
    res.writeHead(up.statusCode || 502, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    up.pipe(res);
  });
  r.on('error', e => {
    if (res.headersSent) return res.end();
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'upstream: ' + e.message }));
  });
  r.end(payload);
}

// ---------- 云存档转发 ----------
function proxyCloud(req, res, url) {
  const tk = url.searchParams.get('tk') || '';
  const sub = url.pathname.replace(/^\/api\/cloud/, '') || '/users/me';
  const qs = new URLSearchParams(url.searchParams);
  qs.delete('tk');
  const tail = qs.toString();
  const target = '/1.1' + sub + (tail ? '?' + tail : '');
  const r = https.request({
    host: LC.host,
    path: target,
    method: 'GET',
    headers: {
      'X-LC-Id': LC.id,
      'X-LC-Key': LC.key,
      'X-LC-Session': tk,
      'User-Agent': 'LeanCloud-CSharp-SDK/1.0.3',
      'Accept': 'application/json'
    }
  }, up => {
    const chunks = [];
    up.on('data', c => chunks.push(c));
    up.on('end', () => {
      cors(res);
      res.writeHead(up.statusCode || 502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(Buffer.concat(chunks));
    });
  });
  r.on('error', e => {
    cors(res);
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'upstream: ' + e.message }));
  });
  r.end();
}

// ---------- 扫码登录 ----------
function sendJson(res, code, obj) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// ---------- 曲绘缩略图（B30 分享图用） ----------
// 曲绘是南京鸽游的游戏资源，本项目不分发。导出图片时按需从第三方镜像取缩略图，
// 由本服务落盘缓存后转发——这样浏览器只跟同源通信，不用管对方有没有 CORS，
// 也不至于为了 30 张图传 90MB 原图（单张原图 1.5~3.4MB）。
// data/jackets.json 只存文件名清单（tools/build_jackets.js 生成），不含图片本体。
const JACKET_DIR = path.join(__dirname, 'data', 'jackets');
const JACKET_INDEX = path.join(__dirname, 'data', 'jackets.json');
// 两个都是同一家（wsrv.nl 是 images.weserv.nl 的新域名）的免费缩图服务，互为备份
const JACKET_RESIZERS = ['https://wsrv.nl/?url=', 'https://images.weserv.nl/?url='];
const JACKET_Q = '&w=320&h=320&fit=cover&output=webp&q=76';
const JACKET_TTL = 30 * 24 * 3600 * 1000;   // 缓存 30 天
const JACKET_MISS_TTL = 6 * 3600 * 1000;    // 取不到（网络问题）记 6 小时
const jacketMiss = new Map();               // id -> 时间戳
const jacketInflight = new Map();           // id -> Promise，避免并发重复拉

/* 曲名.曲师 这种 id 各家用得不一样：有的写 `Evanescent.LeaF`，有的写
   `Evanescent - LeaF`，还有只写曲名的。统一去掉标点空格再比。 */
function jNorm(s) {
  return String(s || '').toLowerCase().replace(/[^0-9a-z\u3040-\u30ff\u4e00-\u9fff]/g, '');
}

let jacketTable = null;
function jacketLookup() {
  if (jacketTable) return jacketTable;
  jacketTable = [];
  let json = null;
  try { json = JSON.parse(fs.readFileSync(JACKET_INDEX, 'utf8')); } catch (e) { return jacketTable; }
  for (const src of (json.sources || [])) {
    const exact = new Map(), norm = new Map(), nameOnly = new Map();
    for (const f of (src.files || [])) {
      const stem = String(f).replace(/\.(png|jpe?g|webp)$/i, '');
      exact.set(stem, f);
      if (!norm.has(jNorm(stem))) norm.set(jNorm(stem), f);
      const nm = jNorm(stem.split('.')[0]);
      if (!nm) continue;
      /* 同名多首（Another Me 之类）就别猜了，宁可留空 */
      if (!nameOnly.has(nm)) nameOnly.set(nm, f);
      else if (nameOnly.get(nm) !== f) nameOnly.set(nm, null);
    }
    jacketTable.push({ base: src.base, count: exact.size, exact, norm, nameOnly });
  }
  return jacketTable;
}

/** 精确 → 去标点归一化 → 只按曲名（唯一时）。任何一级命中都返回 {base, file} */
function jacketFileFor(id) {
  const raw = String(id || '').trim().replace(/\.(png|jpe?g|webp)$/i, '');
  const norm = jNorm(raw);
  const nameKey = jNorm(raw.split('.')[0]);
  if (!norm) return null;
  for (const src of jacketLookup()) {
    const f = src.exact.get(raw) || src.norm.get(norm) || src.nameOnly.get(nameKey);
    if (f) return { base: src.base, file: f };
  }
  return null;
}

function jacketKey(id) {
  return crypto.createHash('sha1').update(id).digest('hex').slice(0, 16);
}

async function jacketDownload(id) {
  const found = jacketFileFor(id);
  if (!found) throw Object.assign(new Error('not in index'), { code: 'noart' });
  const src = found.base + encodeURIComponent(found.file);
  let last = '';
  for (const host of JACKET_RESIZERS) {
    try {
      const r = await fetch(host + encodeURIComponent(src) + JACKET_Q, {
        signal: AbortSignal.timeout(12000)
      });
      if (!r.ok) { last = 'upstream ' + r.status; continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 600) { last = 'too small (' + buf.length + 'B)'; continue; }
      return buf;
    } catch (e) {
      last = e.name === 'TimeoutError' ? 'timeout' : (e.message || String(e));
    }
  }
  throw new Error(last || 'fetch failed');
}

async function handleJacket(req, res, url) {
  let id = '';
  try { id = decodeURIComponent(url.pathname.replace(/^\/api\/jacket\/?/, '')); } catch (e) {}
  id = String(id).trim().slice(0, 120);
  if (!id || /[\\/]/.test(id)) return sendJson(res, 400, { error: 'bad id' });
  /* 404 必须显式 no-store：不然浏览器会按启发式把「这首没图」缓存住，
     之后前端就算带 force-cache 也永远拿那次的 404 */
  const miss = (obj) => {
    cors(res);
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
  };

  const file = path.join(JACKET_DIR, jacketKey(id) + '.webp');
  const hit = t => { try { res.writeHead(200, { 'Content-Type': 'image/webp', 'Content-Length': t.length, 'Cache-Control': 'public, max-age=2592000, immutable', 'Access-Control-Allow-Origin': '*' }); res.end(t); } catch (e) {} };

  try {
    const st = fs.statSync(file);
    if (Date.now() - st.mtimeMs < JACKET_TTL) return hit(fs.readFileSync(file));
  } catch (e) {}

  /* 索引里就没有这首（下架曲 / 太新的曲）——不必去打扰上游，直接 404 */
  if (!jacketFileFor(id)) return miss({ error: 'no jacket', code: 'noart' });

  const missAt = jacketMiss.get(id);
  if (missAt && Date.now() - missAt < JACKET_MISS_TTL) return miss({ error: 'no jacket', code: 'miss' });

  let job = jacketInflight.get(id);
  if (!job) {
    job = jacketDownload(id).finally(() => jacketInflight.delete(id));
    jacketInflight.set(id, job);
  }

  try {
    const buf = await job;
    try {
      fs.mkdirSync(JACKET_DIR, { recursive: true });
      fs.writeFileSync(file, buf);
    } catch (e) {}
    return hit(buf);
  } catch (e) {
    jacketMiss.set(id, Date.now());
    if (jacketMiss.size > 2000) jacketMiss.clear();
    return miss({ error: 'no jacket', code: 'miss', detail: e.message });
  }
}

async function handleLoginStart(res, url) {
  const server = url.searchParams.get('server') === 'global' ? 'global' : 'cn';
  const code = await taptapLib.requestCode(server);
  const id = crypto.randomUUID();
  logins.set(id, { ...code, server, at: Date.now() });
  for (const [k, v] of logins) if (Date.now() - v.at > 600000) logins.delete(k);
  return sendJson(res, 200, { id, userCode: code.userCode, url: code.url, expiresIn: code.expiresIn });
}

async function handleLoginPoll(res, url) {
  const id = url.searchParams.get('id') || '';
  const s = logins.get(id);
  if (!s) return sendJson(res, 400, { error: '登录会话不存在或已过期' });
  const r = await taptapLib.pollToken(s.deviceCode, s.deviceId, s.server);
  if (r.status !== 'ok') return sendJson(res, 200, { status: r.status });
  const profile = await taptapLib.getProfile(r.data, s.server);
  const acc = await taptapLib.exchangeSession(profile, r.data, s.server);
  logins.delete(id);
  cache.delete(s.server + ':' + acc.sessionToken);
  return sendJson(res, 200, { status: 'ok', token: acc.sessionToken, nickname: profile.name || '' });
}

// ---------- 云存档成绩（本地版 phi-plugin） ----------
function mapEntry(e) {
  return {
    song: e.song,
    id: e.songId,
    rank: e.rank,
    difficulty: e.difficulty,
    acc: e.acc,
    score: e.score,
    fc: !!e.fc,
    rating: e.rating,
    rks: Number(e.rks.toFixed(3)),
    phi: e.acc >= 99.995
  };
}

/**
 * 统一响应：b30 是前 30，all 是全部记录。
 * 存档里没有逐曲时间戳，「最近 3 次游玩」无法还原，只回传合计值 sum3，
 * 前端用 official × 30 − sum27 精确反解。
 */
function buildPayload(data, entries, n) {
  const b = rksLib.computeB30(entries, data.summary ? data.summary.rankingScore : null);
  const st = rksLib.stats(entries);
  return {
    player: data.player && (data.player.nickname || data.player.username),
    summary: data.summary,
    stats: st,
    rks: { official: b.official, est: b.est, cutoff: b.cutoff, sum27: b.sum27, sum3: b.sum3 },
    songs: infoLib.total(),
    recent3: [],
    recent3Sum: b.sum3 == null ? null : Number(b.sum3.toFixed(3)),
    b30: entries.slice(0, n).map(mapEntry),
    all: entries.map(mapEntry)
  };
}

async function handlePhi(req, res, url) {
  const tk = url.searchParams.get('tk') || '';
  const server = url.searchParams.get('server') === 'global' ? 'global' : 'cn';
  const n = Math.min(Number(url.searchParams.get('n')) || 30, 100);
  const key = server + ':' + tk;

  const reply = (code, obj) => {
    cors(res);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };

  try {
    let hit = cache.get(key);
    if (!hit || Date.now() - hit.at > 90000) {
      const data = await saveLib.loadFromToken(tk, { server });
      const entries = rksLib.enrich(data.records);
      hit = {
        at: Date.now(),
        data,
        entries,
        b: rksLib.computeB30(entries, data.summary ? data.summary.rankingScore : null),
        st: rksLib.stats(entries)
      };
      cache.set(key, hit);
    }
    const { data, entries, b, st } = hit;

    if (url.pathname.endsWith('/rks')) {
      return reply(200, { player: data.player && data.player.nickname, summary: data.summary, stats: st });
    }
    if (url.pathname.endsWith('/suggest')) {
      return reply(200, { player: data.player && data.player.nickname, rks: b.est, cutoff: b.cutoff,
        suggest: rksLib.suggest(entries, { cutoff: b.cutoff, limit: 20 }) });
    }

    return reply(200, buildPayload(data, entries, n));
  } catch (e) {
    return reply(400, { error: e.message || String(e) });
  }
}

// ---------- 直接上传 .save 解析 ----------
async function handleParseUpload(req, res) {
  const reply = (code, obj) => {
    cors(res);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };
  try {
    const body = await readBody(req);
    if (!body.length) throw new Error('没有收到文件内容');
    const parsed = saveLib.parseSave(body);
    const entries = rksLib.enrich(parsed.records);
    if (!entries.length) throw new Error('存档里没有可识别的成绩');
    return reply(200, buildPayload({ player: null, summary: null }, entries, 30));
  } catch (e) {
    return reply(400, { error: e.message || String(e) });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    return res.end();
  }

  // 免费额度查询：前端拿来显示「今天还剩几次」，不返回 Key 本身
  if (url.pathname === '/api/ai/quota') {
    const used = quotaUsed(req);
    return sendJson(res, 200, {
      free: !!FREE_KEY, perIp: FREE_PER_IP, used,
      left: FREE_KEY ? Math.max(0, FREE_PER_IP - used) : 0,
      keySrc: FREE_KEY_SRC
    });
  }

  if (url.pathname === '/api/ai' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      return proxyAI(req, res, body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  if (url.pathname.startsWith('/api/cloud')) {
    return proxyCloud(req, res, url);
  }

  if (url.pathname === '/api/phi/login') {
    try { return await handleLoginStart(res, url); }
    catch (e) { return sendJson(res, 400, { error: e.message || String(e) }); }
  }

  if (url.pathname === '/api/phi/login/poll') {
    try { return await handleLoginPoll(res, url); }
    catch (e) { return sendJson(res, 400, { error: e.message || String(e) }); }
  }

  // 直接上传 .save（zip）解析：原始字节 POST 过来即可
  if (url.pathname === '/api/phi/parse' && req.method === 'POST') {
    return handleParseUpload(req, res);
  }

  // 曲绘缩略图：/api/jacket/<曲名.曲师>
  if (url.pathname.startsWith('/api/jacket/')) {
    return handleJacket(req, res, url);
  }

  // 曲库：前端用来算覆盖率 / 未游玩的高定数谱
  if (url.pathname === '/api/library') {
    const lib = infoLib.load().list.map(e => ({
      id: e.id, song: e.song, composer: e.composer, const: e.const
    }));
    return sendJson(res, 200, { total: lib.length, songs: lib });
  }

  if (url.pathname.startsWith('/api/phi/')) {
    return handlePhi(req, res, url);
  }

  // 静态文件
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  // 任何以 . 开头的路径段都不给访问：data/.freekey 里的免费 Key、.git、.session 全在这儿
  if (/(^|[\\/])\./.test(rel)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404');
  }
  const file = path.join(ROOT, path.normalize(rel).replace(/^([\\/])+/, ''));
  const inRoot = file === ROOT || file.startsWith(ROOT + path.sep);
  if (!inRoot) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

loadQuota();

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Phigros Lab 已启动');
  console.log('  http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT);
  console.log('');
  console.log('  DeepSeek 转发:  /api/ai');
  console.log('  免费额度    :  ' + (FREE_KEY
    ? '已启用，每人每天 ' + FREE_PER_IP + ' 次（全局上限 ' + FREE_GLOBAL + '）'
    : '未配置（放一把到 data/.freekey，或设 FREE_KEY 环境变量）'));
  console.log('  云存档成绩  :  /api/phi/b30?tk=<token>');
  console.log('  上传存档    :  POST /api/phi/parse');
  console.log('  云存档转发  :  /api/cloud/users/me?tk=<sessionToken>');
  console.log('');
  console.log('  Ctrl+C 停止');
});
