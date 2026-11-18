'use strict';
// Phigros 云存档读取：LeanCloud 拉取 → 解 zip → AES 解密 → 解析二进制
// 二进制格式参考 phi-plugin (GPL-3.0) 的 lib/GameRecord.js，本文件为独立实现。
const zlib = require('zlib');
const crypto = require('crypto');
const fs = require('fs');

const SERVERS = {
  cn: {
    base: 'https://rak3ffdi.cloud.tds1.tapapis.cn/1.1',
    id: 'rAK3FfdieFob2Nn8Am',
    key: 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0'
  },
  global: {
    base: 'https://kviehlel.cloud.ap-sg.tapapis.com/1.1',
    id: 'kviehleldgxsagpozb',
    key: 'tG9CTm0LDD736k9HMM9lBZrbeBGRmUkjSfNLDNib'
  }
};

const AES_KEY = Buffer.from('6Jaa0qVAJZuXkZCLiOa/Ax5tIZVu+taKUN1V1nqwkks=', 'base64');
const AES_IV = Buffer.from('Kk/wisgNYwcAV8WVGMgyUw==', 'base64');
const RANKS = ['EZ', 'HD', 'IN', 'AT'];

class ByteReader {
  constructor(buf, pos = 0) { this.buf = Buffer.from(buf); this.pos = pos; }
  left() { return this.buf.length - this.pos; }
  byte() { return this.buf[this.pos++]; }
  short() {
    this.pos += 2;
    return (this.buf[this.pos - 1] << 8) ^ (this.buf[this.pos - 2] & 0xff);
  }
  int() {
    this.pos += 4;
    return (this.buf[this.pos - 1] << 24) ^ ((this.buf[this.pos - 2] & 0xff) << 16) ^
      ((this.buf[this.pos - 3] & 0xff) << 8) ^ (this.buf[this.pos - 4] & 0xff);
  }
  float() { this.pos += 4; return this.buf.readFloatLE(this.pos - 4); }
  varint() {
    if (this.buf[this.pos] > 127) {
      this.pos += 2;
      return (0x7f & this.buf[this.pos - 2]) ^ (this.buf[this.pos - 1] << 7);
    }
    return this.buf[this.pos++];
  }
  skipVarint() { this.pos += this.buf[this.pos] > 127 ? 2 : 1; }
  str() {
    const len = this.varint();
    this.pos += len;
    return this.buf.toString('utf8', this.pos - len, this.pos);
  }
}

const bit = (v, i) => (v & (1 << i)) ? 1 : 0;

function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('存档不是有效的 zip 文件');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(lho + 26);
    const lelen = buf.readUInt16LE(lho + 28);
    const start = lho + 30 + lnlen + lelen;
    const raw = buf.subarray(start, start + csize);
    out[name] = method === 0 ? raw : zlib.inflateRawSync(raw);
    p += 46 + nlen + elen + clen;
  }
  return out;
}

function decrypt(raw) {
  const reader = new ByteReader(raw);
  reader.byte();
  const payload = reader.buf.subarray(reader.pos).toString('base64');
  const d = crypto.createDecipheriv('aes-256-cbc', AES_KEY, AES_IV);
  return Buffer.concat([d.update(Buffer.from(payload, 'base64')), d.final()]);
}

function parseSummary(b64) {
  if (!b64) return null;
  const r = new ByteReader(Buffer.from(b64, 'base64'));
  const out = {
    saveVersion: r.byte(),
    challengeModeRank: r.short(),
    rankingScore: r.float(),
    gameVersion: r.varint(),
    avatar: r.str(),
    cleared: [], fullCombo: [], phi: []
  };
  for (let i = 0; i < 4; i++) {
    out.cleared.push(r.short());
    out.fullCombo.push(r.short());
    out.phi.push(r.short());
  }
  return out;
}

function parseGameRecord(raw) {
  const buf = decrypt(raw);
  const r = new ByteReader(buf);
  const declared = r.varint();
  const list = [];
  let guard = 0;
  while (r.left() > 0 && guard++ < 10000) {
    const key = r.str();
    r.skipVarint();
    const lenMask = r.byte();
    const fcMask = r.byte();
    for (let lv = 0; lv < 5; lv++) {
      if (!bit(lenMask, lv)) continue;
      const score = r.int();
      const acc = r.float();
      if (lv > 3) continue; // 第 5 个槽位是旧版谱面数据，不参与 B30
      const fc = (score === 1000000 && Math.abs(acc - 100) < 1e-6) ? true : !!bit(fcMask, lv);
      list.push({
        songId: key.replace(/\.[0-9]+$/, ''),
        rank: RANKS[lv],
        lv,
        score,
        acc: Math.round(acc * 10000) / 10000,
        fc
      });
    }
  }
  return { declared, list };
}

// ---------- 网络 ----------

async function req(url, headers) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.text()).slice(0, 200); } catch (e) {}
    if (res.status === 400 || res.status === 401 || res.status === 404) {
      throw new Error(`token 无效或已过期（${res.status}）${detail ? ' · ' + detail : ''}`);
    }
    throw new Error(`请求失败 ${res.status} ${detail}`);
  }
  return res;
}

function leancloud(server) {
  const s = SERVERS[server] || SERVERS.cn;
  return {
    ...s,
    headers(tk) {
      return {
        'X-LC-Id': s.id,
        'X-LC-Key': s.key,
        'X-LC-Session': tk,
        'User-Agent': 'LeanCloud-CSharp-SDK/1.0.3',
        Accept: 'application/json'
      };
    }
  };
}

function checkToken(tk) {
  if (!tk || typeof tk !== 'string') throw new Error('缺少 sessionToken');
  if (!/[a-z0-9A-Z]{25}/.test(tk)) throw new Error('sessionToken 格式不对（应为 25 位字母数字）');
}

async function getUser(tk, server) {
  checkToken(tk);
  const lc = leancloud(server);
  const res = await req(lc.base + '/users/me', lc.headers(tk));
  return res.json();
}

async function listSaves(tk, objectId, server) {
  const lc = leancloud(server);
  const where = encodeURIComponent(JSON.stringify({
    user: { __type: 'Pointer', className: '_User', objectId }
  }));
  const url = `${lc.base}/gamesaves/?skip=0&limit=20&where=${where}&include=cover,gameFile`;
  const res = await req(url, lc.headers(tk));
  const json = await res.json();
  return (json.results || []).filter(x => x && x.gameFile);
}

async function loadFromToken(tk, opts = {}) {
  const server = opts.server || 'cn';
  const user = await getUser(tk, server);
  const saves = await listSaves(tk, user.objectId, server);
  if (!saves.length) throw new Error('这个账号下没有云存档，先在游戏里同步一次');
  saves.sort((a, b) => new Date(b.updatedAt || b.modifiedAt) - new Date(a.updatedAt || a.modifiedAt));
  const save = saves[0];
  const res = await req(save.gameFile.url);
  const buf = Buffer.from(await res.arrayBuffer());
  const parsed = parseSave(buf);
  return { player: user, summary: parseSummary(save.summary), saveCount: saves.length, ...parsed };
}

function parseSave(buf) {
  const files = unzip(buf);
  if (!files.gameRecord) throw new Error('存档里没有 gameRecord，可能是过旧的存档版本');
  const { declared, list } = parseGameRecord(files.gameRecord);
  return { declared, records: list };
}

function loadFromFile(file) {
  return parseSave(fs.readFileSync(file));
}

module.exports = { getUser, loadFromToken, loadFromFile, parseSave, parseSummary, unzip, SERVERS };
