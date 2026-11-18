'use strict';
// TapTap 扫码授权 → LeanCloud sessionToken
// 流程参考 phi-plugin 的 lib/TapTap（GPL-3.0），本文件为独立实现，零依赖。
const crypto = require('crypto');

const CLIENT_ID = 'rAK3FfdieFob2Nn8Am';
const WEB_HOST = 'https://accounts.tapapis.com';
const WEB_HOST_CN = 'https://accounts.tapapis.cn';
const API_HOST = 'https://open.tapapis.com';
const API_HOST_CN = 'https://open.tapapis.cn';

const LC = {
  cn: { base: 'https://rak3ffdi.cloud.tds1.tapapis.cn/1.1', key: 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0', id: CLIENT_ID },
  global: { base: 'https://kviehlel.cloud.ap-sg.tapapis.com/1.1', key: 'tG9CTm0LDD736k9HMM9lBZrbeBGRmUkjSfNLDNib', id: 'kviehleldgxsagpozb' }
};

function form(obj) {
  const f = new FormData();
  Object.entries(obj).forEach(([k, v]) => f.append(k, String(v)));
  return f;
}

/** 生成一段二维码登录会话 */
async function requestCode(server) {
  const deviceId = crypto.randomUUID().replace(/-/g, '');
  const host = server === 'global' ? WEB_HOST : WEB_HOST_CN;
  const res = await fetch(host + '/oauth2/v1/device/code', {
    method: 'POST',
    body: form({
      client_id: CLIENT_ID,
      response_type: 'device_code',
      scope: 'public_profile',
      version: '2.1',
      platform: 'unity',
      info: JSON.stringify({ device_id: deviceId })
    }),
    signal: AbortSignal.timeout(15000)
  });
  const json = await res.json();
  if (!json.data) throw new Error('申请二维码失败：' + JSON.stringify(json).slice(0, 160));
  return {
    deviceId,
    deviceCode: json.data.device_code,
    userCode: json.data.user_code,
    url: json.data.qrcode_url || json.data.verification_url,
    verifyUrl: json.data.verification_url,
    expiresIn: json.data.expires_in,
    interval: json.data.interval || 1
  };
}

/**
 * 轮询扫码结果
 * @returns {{status:'pending'|'scanned'|'ok'|'expired', data?:object, raw?:object}}
 */
async function pollToken(deviceCode, deviceId, server) {
  const host = server === 'global' ? WEB_HOST : WEB_HOST_CN;
  const res = await fetch(host + '/oauth2/v1/token', {
    method: 'POST',
    body: form({
      grant_type: 'device_token',
      client_id: CLIENT_ID,
      secret_type: 'hmac-sha-1',
      code: deviceCode,
      version: '1.0',
      platform: 'unity',
      info: JSON.stringify({ device_id: deviceId })
    }),
    signal: AbortSignal.timeout(15000)
  });
  const json = await res.json();
  // TapTap 把结果包在 data 里：成功是 {data:{access_token,...}}，失败是 {data:{error:'authorization_pending'}}
  const d = (json && json.data) || json || {};
  if (d.access_token) return { status: 'ok', data: d };
  const err = String(d.error || d.error_description || json.error || json.error_description || d.msg || json.msg || '');
  if (/expired|invalid_grant|timeout/i.test(err)) return { status: 'expired', raw: json };
  if (/pending|slow_down/i.test(err)) return { status: 'pending', raw: json };
  if (/scan|confirm|waiting|authorized/i.test(err)) return { status: 'scanned', raw: json };
  return { status: 'pending', raw: json };
}

function macHeader(url, method, kid, macKey) {
  const u = new URL(url);
  const ts = String(Math.floor(Date.now() / 1000)).padStart(10, '0');
  const nonce = crypto.randomBytes(16).toString('base64');
  const port = u.port || (u.protocol === 'https:' ? '443' : '80');
  const base = `${ts}\n${nonce}\n${method}\n${u.pathname}${u.search}\n${u.hostname}\n${port}\n\n`;
  const mac = crypto.createHmac('sha1', macKey).update(base).digest('base64');
  return `MAC id="${kid}", ts="${ts}", nonce="${nonce}", mac="${mac}"`;
}

async function getProfile(token, server) {
  const host = server === 'global' ? API_HOST : API_HOST_CN;
  const url = `${host}/account/profile/v1?client_id=${CLIENT_ID}`;
  const res = await fetch(url, {
    headers: { Authorization: macHeader(url, 'GET', token.kid, token.mac_key) },
    signal: AbortSignal.timeout(15000)
  });
  const json = await res.json();
  return json.data || json;
}

/** 用 TapTap 资料 + token 换 LeanCloud sessionToken */
async function exchangeSession(profileData, tokenData, server) {
  const lc = LC[server] || LC.cn;
  const ts = Math.floor(Date.now() / 1000);
  const sign = crypto.createHash('md5').update(`${ts}${lc.key}`).digest('hex') + ',' + ts;
  const res = await fetch(lc.base + '/users', {
    method: 'POST',
    headers: { 'X-LC-Id': lc.id, 'X-LC-Sign': sign, 'Content-Type': 'application/json' },
    body: JSON.stringify({ authData: { taptap: { ...profileData, ...tokenData } } }),
    signal: AbortSignal.timeout(20000)
  });
  const json = await res.json();
  if (!json.sessionToken) {
    throw new Error('换取 sessionToken 失败：' + (json.error || json.message || JSON.stringify(json).slice(0, 160)));
  }
  return json;
}

/** 一把梭：轮询到授权后直接拿 token */
async function login(server, onCode) {
  const code = await requestCode(server);
  if (onCode) onCode(code);
  const deadline = Date.now() + (code.expiresIn || 300) * 1000;
  let scanned = false;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, (code.interval || 1) * 1000));
    const r = await pollToken(code.deviceCode, code.deviceId, server);
    if (r.status === 'ok') {
      const profile = await getProfile(r.data, server);
      const acc = await exchangeSession(profile, r.data, server);
      return { sessionToken: acc.sessionToken, nickname: profile.name || profile.nickname, userCode: code.userCode };
    }
    if (r.status === 'scanned' && !scanned) { scanned = true; if (onCode) onCode({ ...code, scanned: true }); }
    if (r.status === 'expired') throw new Error('二维码已过期，重新执行一次');
  }
  throw new Error('等待超时，重新执行一次');
}

module.exports = { requestCode, pollToken, getProfile, exchangeSession, login };
