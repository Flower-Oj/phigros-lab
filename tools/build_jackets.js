/**
 * 生成 data/jackets.json —— 曲绘文件名索引
 *
 * 只存「文件名」，不存图片：曲绘是南京鸽游的资源，本项目不分发，
 * 导出 B30 图片时才由服务端按需去第三方镜像取缩略图。
 * 存索引是为了不依赖 GitHub API 的限流，也能离线做模糊匹配。
 *
 * 用法：node tools/build_jackets.js
 */
const fs = require('fs');
const path = require('path');

const SOURCES = [
  {
    name: 'Shell-chen/phigros-illustration',
    repo: 'Shell-chen/phigros-illustration',
    ref: 'main',
    dir: 'illustration',
    base: 'https://raw.githubusercontent.com/Shell-chen/phigros-illustration/main/illustration/'
  },
  {
    name: 'NanLiang-Works-Inc/Phigros_Resource',
    repo: 'NanLiang-Works-Inc/Phigros_Resource',
    ref: 'main',
    dir: 'ILLUSTRATION',
    base: 'https://raw.githubusercontent.com/NanLiang-Works-Inc/Phigros_Resource/main/ILLUSTRATION/'
  }
];

const IMG = /\.(png|jpe?g|webp)$/i;

async function listing(s) {
  const url = `https://api.github.com/repos/${s.repo}/contents/${s.dir}?ref=${s.ref}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'phigros-lab' } });
  if (!res.ok) throw new Error(`${s.name} -> HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error(`${s.name} -> unexpected payload`);
  return json.filter(x => x.type === 'file' && IMG.test(x.name)).map(x => x.name);
}

(async () => {
  const out = { generated: new Date().toISOString().slice(0, 10), sources: [] };
  for (const s of SOURCES) {
    try {
      const files = await listing(s);
      files.sort();
      out.sources.push({ name: s.name, base: s.base, files });
      console.log(s.name.padEnd(36), files.length, '个文件');
    } catch (e) {
      console.log(s.name.padEnd(36), 'FAIL', e.message);
    }
  }
  if (!out.sources.length) { console.error('一个源都没拿到，放弃'); process.exit(1); }

  const dst = path.join(__dirname, '..', 'data', 'jackets.json');
  fs.writeFileSync(dst, JSON.stringify(out) + '\n', 'utf8');
  console.log('wrote', dst, (fs.statSync(dst).size / 1024).toFixed(1) + 'KB');
})();
