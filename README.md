# Phigros Lab

本地运行的 Phigros 成绩工具：**自己解析云存档**，不依赖任何 QQ 机器人；把数据变成 RKS 结构诊断、推分清单和 AI 训练计划。

不联网存储、不上传。API Key 只存在浏览器 localStorage 里。

---

## 快速开始

```bash
cd phigros-lab
node proxy.js          # 打开 http://localhost:8787
```

也可以直接双击 `index.html`（本地分析全都能用，只有云存档拉取和 AI 调用需要本地服务）。

零依赖：不需要 `npm install`，Node 18+ 即可。`npm start` 等价于 `node proxy.js`。

**部署到 GitHub Pages**：启用 Pages 指向仓库根目录就行。导入成绩、B30 分析、推分、目标规划、离线报告全是纯前端，能直接在 Pages 上跑；扫码登录、拉取云存档、AI 调用依赖本地 `proxy.js`，这几个功能会提示需要本地服务。

---

## 一、先拿 sessionToken（扫码，30 秒）

```bash
node phi.js login
```

终端会打印一个 5 位字符码和一个链接，并自动打开浏览器：

```
    字符码   deepf
    链接     https://accounts.taptap.cn/device?qrcode=1&user_code=deepf
```

手机 TapTap 扫码（或在浏览器里登录后确认），终端会自动收尾并打印 token，存到 `data/.session`。**之后所有指令都不必再带 token。**

网页里也一样：「数据源 → 扫码登录」→ 显示字符码和链接 → 授权后自动填 token 并拉取 B30。

也可以手动拿：在 Phi-Plugin 等机器人里发 `#phi tk help`，按提示扫码复制。

> token 是 25 位临时凭证，不是账号密码，约一个月后过期，过期就重新 `login` 一次。它明文存在 `data/.session`，别把这个文件传到公开仓库。

---

## 二、命令行（本地版 phi-plugin 核心）

```bash
node phi.js rks                # 综合 RKS + 各难度通关/FC/Phi 统计
node phi.js b30                # 最佳成绩列表（-n 50 改条数）
node phi.js suggest            # 推分建议，按单曲增益排序
node phi.js plan 0.1           # 想涨 0.1，哪些谱要打到多少 acc
node phi.js song 千紫万红      # 查定数
node phi.js file save.save     # 直接解析本地存档文件（不需要 token）
```

登录后可以省略 token；也可以临时追加一个 token 覆盖：`node phi.js b30 <token>`。

选项：`--global` 国际服，`--json` 输出 JSON。

`file` 模式可加 `--suggest` / `--plan` 复用上面两个分析：

```bash
node phi.js file data/sample.save --suggest
```

输出长这样：

```
  本地存档   327 首曲库 · 817 条成绩 · 6ms
  ──────────────────────────────────────────────
  #   曲目                                定数      acc    RKS  档
  1   Re：End of a Dre…                 AT 16.9    99.60  16.60  FC
  2   祈 -我ら神祖と共に歩む者なり-     IN 16.4    99.57  16.09  V
  3   Ad astra per as…                  IN 16.3    99.53  15.96  V
```

---

## 三、网页（Phigros Lab）

五个标签页，键盘 `1`–`5` 直接切换，右上角可以切明暗主题和中英文（`中` / `EN`，选择记在 localStorage）。

**概览** — 综合 RKS（官方值优先）+ 与上次快照的涨跌；B30 平均准度、上榜平均定数、定数转化率、曲库覆盖；定数–准确率散点（带 0.5 定数的分箱均值曲线和 16+ 分界）、B30 单曲分布、成绩档位 / 难度分布、RKS 走势；本地规则诊断。

**推分** — 全部记录里按「推到 99.5% 能拿多少」排序，可搜索、按难度筛选、换目标准度（99 / 99.5 / 99.9 / 100）、切换排序，并标出「已进榜 / 可进榜 / 榜外」。准度低于 90% 的谱不参与，避免把打崩的记录算成机会。

**目标** — 输入目标 RKS 与「准备改几张谱」，反解出每张要打到多少 acc、准度差多少，最小的排前面；同时列出 2/3/4/5/8 张的可行性对比、理论上限（全部 99.5% / 全部 Phi）和还没打过的高定数曲目。

**AI 教练** — 结构化数据交给 DeepSeek，五种关注点（全面诊断 / 一周计划 / 手法设置 / 单曲攻克 / 只要推分顺序），支持流式输出、追问、停止、复制、下载 md。没有 API Key 时用「离线生成报告」，本地规则引擎直接出诊断。

**数据** — 扫码登录或粘 token 拉取云存档；也可以把 `.save` 文件拖进页面（本地服务解析）；或手动粘贴文本 / JSON。快照记录 RKS 变化，支持导出 JSON。

> **多语言**：界面文案、图表 tooltip、离线报告、AI 提示词全部走 `assets/i18n.js` 的词典（中英各约 230 条），曲名与作曲家人名保持原文不翻译。加第三门语言只需在词典每行数组后追加一项、并在 `LANGS` 里登记。

---

## 四、成绩是怎么拿到的

Phigros 的成绩在 LeanCloud（`rak3ffdi.cloud.tds1.tapapis.cn`），流程完全在本地执行：

```
sessionToken
  → GET /1.1/users/me                      取账号 objectId
  → GET /1.1/gamesaves/?where={user:...}   列出该账号的存档（带 gameFile.url）
  → 下载 .save（一个 zip）
  → 解 zip：gameProgress / gameRecord / settings / user
  → 每个条目首字节为版本号，其余 base64 → AES-256-CBC 解密
  → 读二进制：varint 曲目数，逐条取 songId、难度位掩码、score(int32)、acc(float32)
  → 用 data/info.csv 的定数表算单曲 RKS
```

**验证情况**：用一份真实存档（281 首、817 条成绩）跑解析，与官方插件的结果逐条对比 —— **817 条中 0 条数值不符**。解析器行为可复现，不是猜的。

存档里有 2 首带第 5 个难度槽位（旧版谱面），不参与 B30，已跳过。

**没有做的事**：不解析 `summary` 之外的元数据、不写存档、不做上传、不做批量查分。请求只指向官方服务器。

---

## 五、RKS 口径

```
单曲 RKS = 定数 × ((acc − 55) / 45)²      （acc ≥ 100% 时直接等于定数，acc < 55 记 0）
玩家 RKS = (最佳 27 + 最近 3 次) / 30
```

**关于「最近 3 次」**：存档里没有每张谱的时间戳，所以这 3 格无法直接还原。网页端用官方值反解 —— `最近 3 格合计 = 官方 RKS × 30 − 最佳 27 之和`，这是唯一精确的等式；命令行的 `b30` 仍按「前 3 个 Phi」近似（philib / phi-plugin 的做法），因此两边会同时给出**官方 RKS**（存档 summary 里的真实值）和**本地估算**，差得多说明最近三次打的是低定数曲目。

---

## 六、文件

```
phigros-lab/
├─ index.html        网页骨架（无外部依赖）
├─ assets/
│  ├─ app.css        样式，明暗两套主题变量
│  ├─ i18n.js        中英文词典与 data-i18n 应用逻辑
│  ├─ core.js        状态 / 存储 / RKS 计算 / 曲库 / 导入导出 / 诊断
│  ├─ charts.js      手写 SVG 图表
│  └─ ui.js          渲染、交互、AI 流式输出
├─ phi.js            命令行工具
├─ proxy.js          本地服务：静态托管 + DeepSeek 转发 + 云存档接口
├─ lib/
│  ├─ save.js        LeanCloud 拉取 → 解 zip → AES 解密 → 二进制解析
│  ├─ info.js        曲库与定数表
│  ├─ rks.js         RKS / B30 / 推分 / 目标反推
│  └─ taptap.js      扫码登录（设备码 → token）
├─ data/
│  ├─ info.csv       327 首曲目定数表
│  └─ sample.save    真实存档，仅用于离线测试解析（可删）
├─ .gitignore        忽略 data/.session 等凭证文件
├─ package.json      只有 start / cli 两个脚本，无依赖
└─ README.md
```

HTTP 接口（`proxy.js` 启动后）：

| 路由                            | 说明                                 |
| ----------------------------- | ---------------------------------- |
| `GET /api/phi/b30?tk=&n=30`   | 账号、summary、统计、B30，同时带全部记录 `all`    |
| `GET /api/phi/all?tk=`        | 同上，取全部成绩                           |
| `GET /api/phi/rks?tk=`        | 只取 RKS 与统计                         |
| `GET /api/phi/suggest?tk=`    | 推分建议                               |
| `POST /api/phi/parse`         | 直接把 `.save` 原始字节 POST 过来，本地解析后返回成绩 |
| `GET /api/library`            | 曲库与定数表（网页用它算覆盖率）                   |
| `GET /api/phi/login` · `poll` | 扫码登录                               |
| `POST /api/ai`                | DeepSeek 转发（绕开 CORS）               |
| `GET /api/cloud/*`            | LeanCloud 转发                       |

API Key、成绩和快照只写进浏览器 localStorage；`.save` 上传给本地服务解析，不落盘。

---

## 七、关于 token

`sessionToken` 是 25 位字母数字，用 Phi-Plugin 等工具扫码登录云存档后可以拿到。它是**临时凭证**，不是账号密码；过期就重新扫一次。

本工具不做账号密码登录、不代管 token、不落盘。

---

## 八、声明

定数表与二进制格式的解析逻辑参考了 [phi-plugin](https://github.com/Catrong/phi-plugin)（GPL-3.0），`lib/` 下的代码为独立实现。曲目数据来自其 `resources/info/info.csv`，版权归原项目与 Pigeon Games 所有。

`data/sample.save` 是一份真实玩家的存档，只用于验证解析器（`node phi.js file data/sample.save`）。不想公开自己的成绩就删掉它，解析逻辑本身不依赖这个文件。

本项目与 Pigeon Games 无关，仅供个人成绩分析。请勿用于批量查询或对官方服务器施压。

---

## 九、发布到 GitHub

仓库结构已经是可直接推送的形态，没有构建步骤、没有 `node_modules`。

```bash
cd phigros-lab
git init
git add .
git commit -m "Phigros Lab: B30 analysis, push planner, AI coach"
git branch -M main
git remote add origin git@github.com:<你的账号>/phigros-lab.git
git push -u origin main
```

**开启 Pages**：仓库 `Settings → Pages → Source: Deploy from a branch → Branch: main / (root)`，等一两分钟即可访问 `https://<账号>.github.io/phigros-lab/`。

**推送前的检查清单**

- [ ] `data/sample.save` 是真实玩家存档 —— 不想公开就删掉，并同步删掉 README 里相关段落。
- [ ] `git status` 确认没有 `data/.session`（`.gitignore` 已排除，但换过机器后请再确认一次）。
- [ ] 本地 `node proxy.js` 跑一遍，五个标签页都没有控制台报错。
- [ ] 想在仓库页展示截图，把 `docs/preview.png` 放进去并在 README 顶部引用（可选）。

**Pages 上能用的功能**：导入成绩（手动粘贴 / 拖 `.save` 需要本地服务）、B30 分析、推分、目标规划、离线报告、中英切换、主题切换 —— 全部是纯前端。

**Pages 上用不了的功能**：扫码登录、拉取云存档、AI 调用（都依赖本机 `proxy.js` 转发，绕过 CORS 和跨域限制）。这些按钮会提示需要先运行本地服务。想在线上也能用，需要自己部署一个转发服务（Cloudflare Workers / Vercel 均可），把 `proxy.js` 里的三段转发逻辑搬过去。
