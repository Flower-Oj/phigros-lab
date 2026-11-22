/* ============================================================
   Phigros Lab · 成绩单分享（纯 URL fragment，无后端、无存储）

   为什么要无状态：
     - fragment（# 之后）浏览器根本不会发给服务器，成绩不出用户设备，也不进平台日志；
     - 没有存储就没有「过期 / 撤销 / 清理 / 被刷」这四件事要扛；
     - payload 是自描述协议，将来要短链/统计，后端只存 payload → 短 id 的映射，
       前端解析代码一行都不用改。反过来先做短链，是拆不掉的。
   代价：链接较长，所以主入口是二维码（assets/qrcode.js 现成）。

   位布局（大端，MSB first）：
     version  8bit  目前固定 1
     count    8bit  条目数（≤ 100）
     entry    26bit 每首：index(10) + rank(2) + acc(14)
       index  → data/share-songs.json 里的下标（那张表冻结，不许动）
       rank   → EZ=0 HD=1 IN=2 AT=3
       acc    → round(acc×100)，0..10000 表示 0.00%..100.00%
     crc24    24bit  crc32 取低 24 位，编成 4 个字符追加在末尾
   30 首：16 + 780 + 24 = 820bit → 137 个 base64url 字符。
   ============================================================ */
(function () {
'use strict';

const PL = (window.PL = window.PL || {});
const RANKS = ['EZ', 'HD', 'IN', 'AT'];
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_INV = (() => {
  const m = new Map();
  for (let i = 0; i < B64.length; i++) m.set(B64[i], i);
  return m;
})();

const VERSION = 1;
const MAX_ITEMS = 100;

/* CRC32（多项式 0xEDB88320），只用来发现「链接被 IM 截断/多空格」这类损坏 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---- 位写入器：按位累积，最后补零到整字节 ---- */
function BitWriter() {
  this.bytes = [];
  this.acc = 0;
  this.n = 0;
}
BitWriter.prototype.put = function (value, bits) {
  for (let i = bits - 1; i >= 0; i--) {
    this.acc = (this.acc << 1) | ((value >>> i) & 1);
    this.n++;
    if (this.n === 8) {
      this.bytes.push(this.acc & 0xFF);
      this.acc = 0;
      this.n = 0;
    }
  }
};
BitWriter.prototype.done = function () {
  if (this.n > 0) this.bytes.push((this.acc << (8 - this.n)) & 0xFF);
  return Uint8Array.from(this.bytes);
};

function BitReader(bytes) {
  this.bytes = bytes;
  this.pos = 0;   // 位偏移
}
BitReader.prototype.get = function (bits) {
  let v = 0;
  for (let i = 0; i < bits; i++) {
    const byteIdx = this.pos >> 3;
    if (byteIdx >= this.bytes.length) throw new Error('分享数据不完整');
    const bit = (this.bytes[byteIdx] >>> (7 - (this.pos & 7))) & 1;
    v = (v << 1) | bit;
    this.pos++;
  }
  return v;
};

function b64encode(bytes) {
  let out = '';
  let acc = 0, n = 0;
  for (let i = 0; i < bytes.length; i++) {
    acc = ((acc << 8) | bytes[i]) & 0xFFFFFF;
    n += 8;
    while (n >= 6) {
      n -= 6;
      out += B64[(acc >>> n) & 0x3F];
    }
  }
  if (n > 0) out += B64[(acc << (6 - n)) & 0x3F];
  return out;
}

function b64decode(str) {
  const out = [];
  let acc = 0, n = 0;
  for (const ch of str) {
    const v = B64_INV.get(ch);
    if (v === undefined) throw new Error('分享链接里有非法字符');
    acc = ((acc << 6) | v) & 0xFFFFFF;
    n += 6;
    while (n >= 8) {
      n -= 8;
      out.push((acc >>> n) & 0xFF);
    }
  }
  return Uint8Array.from(out);
}

/* 曲目表：id ↔ 下标。表是冻结的，所以老链接永远解得回同一首歌。 */
let TABLE = null, TABLE_MAP = null;
function setTable(json) {
  if (!json || !Array.isArray(json.ids)) return false;
  TABLE = json.ids;
  TABLE_MAP = new Map(TABLE.map((id, i) => [id, i]));
  return true;
}
function tableReady() { return !!(TABLE && TABLE_MAP); }

/**
 * 编码。entries: [{ id, rank, acc }]，取前 n 首。
 * 不在曲目表里的歌（表冻结之后新加的）会被跳过并计数，让上层能提示，而不是悄悄少几首。
 */
function encode(entries, opts) {
  if (!tableReady()) throw new Error('曲目表还没加载');
  const limit = Math.min((opts && opts.limit) || 30, MAX_ITEMS);
  const rows = [];
  let skipped = 0;
  for (const e of entries) {
    if (rows.length >= limit) break;
    const i = TABLE_MAP.get(e.id);
    const r = RANKS.indexOf(e.rank);
    if (i == null || r < 0 || !(e.acc >= 0)) { skipped++; continue; }
    rows.push({ i, r, a: Math.max(0, Math.min(10000, Math.round(e.acc * 100))) });
  }
  if (!rows.length) {
    // 不抛错：上层要按「有多少首没进表」给出人话，抛异常只会得到一句无用信息
    return { code: '', count: 0, skipped };
  }

  const w = new BitWriter();
  w.put(VERSION, 8);
  w.put(rows.length, 8);
  for (const row of rows) {
    w.put(row.i, 10);
    w.put(row.r, 2);
    w.put(row.a, 14);
  }
  const body = w.done();
  const crc = crc32(body) & 0xFFFFFF;
  const tail = B64[(crc >>> 18) & 0x3F] + B64[(crc >>> 12) & 0x3F] +
               B64[(crc >>> 6) & 0x3F] + B64[crc & 0x3F];
  return { code: b64encode(body) + tail, count: rows.length, skipped };
}

/** 解码。任何异常都收敛成一句人话，界面上不会出现半截错数据。 */
function decode(code) {
  if (!tableReady()) throw new Error('曲目表还没加载');
  const s = String(code || '').trim();
  if (s.length < 8) throw new Error('分享数据太短');
  const body = b64decode(s.slice(0, -4));
  const tail = s.slice(-4);
  const crc = crc32(body) & 0xFFFFFF;
  const want = (B64_INV.get(tail[0]) << 18) | (B64_INV.get(tail[1]) << 12) |
               (B64_INV.get(tail[2]) << 6) | B64_INV.get(tail[3]);
  if (want !== crc) throw new Error('分享数据校验失败（链接可能被截断了）');

  const r = new BitReader(body);
  const ver = r.get(8);
  if (ver !== VERSION) throw new Error('分享数据版本 ' + ver + '，这个前端还不认识');
  const count = r.get(8);
  if (count < 1 || count > MAX_ITEMS) throw new Error('分享的曲目数不合理');

  const rows = [];
  for (let k = 0; k < count; k++) {
    const idx = r.get(10);
    const rank = RANKS[r.get(2)];
    const acc = r.get(14) / 100;
    const id = TABLE[idx];
    if (!id) throw new Error('曲目索引越界（分享数据比当前版本新）');
    rows.push({ id, rank, acc });
  }
  return rows;
}

/* ---------------- 链接拼装 ----------------
   只放 #d= 和可选的 &n=（昵称）。token、账号、设备信息一律不进链接。 */
function buildHash(code, nick) {
  let h = '#d=' + code;
  if (nick) h += '&n=' + encodeURIComponent(String(nick).slice(0, 20));
  return h;
}

function parseHash(hash) {
  const h = String(hash || '').replace(/^#/, '');
  if (!h) return null;
  const q = new URLSearchParams(h);
  const d = q.get('d');
  if (!d) return null;
  const n = q.get('n') || '';
  return { code: d, nick: n.slice(0, 20) };
}

PL.share = {
  setTable, tableReady, encode, decode, buildHash, parseHash,
  crc32, b64encode, b64decode, VERSION, MAX_ITEMS, RANKS
};
})();
