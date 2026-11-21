**We provide English**
---
# Phigros Lab

本地运行的 Phigros 成绩工具：**自己解析云存档**。
可以分析你的成绩，给出下一步建议。
---

## 在线用 / 装安卓版

不想装 Node 的话，直接打开在线版，后端也跑在云上，云存档拉取、上传 `.save` 解析、AI 教练都能用：

**https://phigros-lab.app.workbuddy.host/?sharecode=MKTEW4KJWC**

安卓安装包见 **Releases** 页面的 `phigros-lab-2.1.0.apk`（Android 8.0+，自签名，安装时需允许未知来源）。APK 内置了同一套后端，装完即可离线解析存档。

> APK 完全跑在手机上，没有服务端的免费额度，AI 教练需要自己在右上角填 DeepSeek API Key。

> 在线版是公开实例：`proxy.js` 会把你的 sessionToken 转发给 LeanCloud、把 API Key 转发给 DeepSeek。
> 转发过程不落盘、不打日志（自己的 API Key 走 `X-User-Key` 请求头透传），但对凭证特别敏感的话，建议本地跑一份。

### 免费 AI 额度（每个 IP 每天 3 次）

在线版不填 API Key 也能生成分析，额度每天 3 次，第四次会被拦下来并提示填自己的 Key。

实现要点：**免费 Key 只存在服务端**，浏览器永远拿不到它。

- Key 的读法：优先 `data/.freekey`（单行，已 gitignore），没有才读环境变量 `FREE_KEY`
- 额度参数：`FREE_PER_IP`（默认 3）、`FREE_GLOBAL`（全局每日上限，默认 200）
- 计数只在真正调通上游（HTTP 200）之后才加，失败的请求不白吃额度
- 计数落盘在 `data/.quota.json`，进程重启不清零，跨天自动重置
- 静态路由拦截所有点开头的路径，`/data/.freekey`、`/data/.quota.json`、`/.git` 都是 404

自己部署时想开这个功能：

```bash
echo 'sk-你的key' > data/.freekey      # 或者 export FREE_KEY=sk-...
FREE_PER_IP=3 FREE_GLOBAL=200 node proxy.js
```

不想开就不放这个文件，`/api/ai` 会直接回 503 并让用户填自己的 Key。

> 额度同时记在**两个桶**上：客户端 IP 和浏览器的匿名 id（`localStorage` 里的 `pglab_cid`），按用得多的那个算。
> 只按 IP 会被「换网/换代理」绕过，只按 id 会被「清缓存」绕过，两个都记才需要两样一起换。
> IP 取 `X-Real-IP` 或 `X-Forwarded-For` 的**最右一跳**（最左边是客户端自己塞的，不可信）。
> 反代既不给 IP 也不给 `X-Client-Id` 时退化成 socket 地址，这时同机房用户可能共用一个桶。
>
> 另外，托管平台会往每个请求注入它自己的 `Authorization`，所以**用户自己的 Key 一律走 `X-User-Key`**，
> 不能拿 `Authorization` 判断「用户带没带 Key」——否则免费额度永远不生效，上游还会按注入的 Key 报 401。


---

## 功能一览

| 页面 | 能干什么 |
| --- | --- |
| 概览 | RKS / 定数—准确率散点 / B30 单曲 RKS / 档位与趋势，附不依赖 AI 的本地诊断 |
| 推分 | 按「推到目标 acc 的净增益」排序，告诉你先打哪几张 |
| 目标 | 给定目标 RKS 反推最省力的改谱方案，并给出理论上限 |
| AI 教练 | DeepSeek 流式诊断；不填 Key 也有站点免费额度，或用离线规则报告 |
| 数据 | 扫码拉云存档 / 拖 `.save` 解析 / 手动粘贴导入，快照与全部记录 |

### 谱面预览

**点任意谱面行**（推分表、目标建议表、全部记录表都行）打开谱面预览：

- 曲名、章节、曲师、曲绘师
- 四个难度切换：定数、物量、谱师、你的最好成绩
- BPM、时长、**每秒音符密度**，以及四个难度物量的横向对比
- 这张谱的物量在同定数（±0.3）谱面里的百分位

数据来自 `data/charts.csv`（生成方式见 `tools/build_charts.py`）。没收录的曲目会明确显示「这首还没收录谱面统计」，
定数和你的成绩照常显示，不会编造数字。

### 设置与著作权声明

右上角齿轮：

- 外观：主题（深/浅）、语言（中/英）
- AI：管理 API Key、重看新手教程
- 数据：导出 JSON、清空本地数据
- 关于：版本、**著作权声明**、数据来源、隐私、开源许可

声明全文也写在 `NOTICE.md` 与 `LICENSE` 里：本项目是非官方粉丝工具，不内置也不分发任何游戏资源。

### 新手教程

首次进入自动走一遍 5 步引导（导入成绩 → 概览 → 推分 → AI 教练 → 设置与声明），
可以随时跳过，看完记在 `localStorage`，之后不再打扰；想重看就到设置里点「重看新手教程」。

---

## 快速开始

```bash
cd phigros-lab
node proxy.js          # 打开 http://localhost:8787
```

也可以直接双击 `index.html`（本地分析全都能用，只有云存档拉取和 AI 调用需要本地服务）。

零依赖：不需要 `npm install`，Node 18+ 即可。`npm start` 等价于 `node proxy.js`。

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

**B30 分享图** — 概览页 B30 卡片和「数据」页各有一个「导出图片」按钮，把前 30 首拼成一张 900×1484 的竖版海报（导出 2 倍图 1800×2968 PNG），含玩家名、综合 RKS、三项指标、30 行「曲名 / 难度 / 准度 / 单曲 RKS / 相对条」以及配色图例。拼版是纯 SVG —— 不用 `foreignObject`、不引外部图片和字体，所以 canvas 不会被污染，直接双击 `index.html` 也能导出。跟随当前明暗主题和界面语言；数据来自示例时会自动打 `DEMO` 水印。

**推分** — 全部记录里按「推到 99.5% 能拿多少」排序，可搜索、按难度筛选、换目标准度（99 / 99.5 / 99.9 / 100）、切换排序，并标出「已进榜 / 可进榜 / 榜外」。准度低于 90% 的谱不参与，避免把打崩的记录算成机会。

**目标** — 输入目标 RKS 与「准备改几张谱」，反解出每张要打到多少 acc、准度差多少，最小的排前面；同时列出 2/3/4/5/8 张的可行性对比、理论上限（全部 99.5% / 全部 Phi）和还没打过的高定数曲目。

**AI 教练** — 结构化数据交给 DeepSeek，五种关注点（全面诊断 / 一周计划 / 手法设置 / 单曲攻克 / 只要推分顺序），支持流式输出、追问、停止、复制、下载 md。没有 API Key 时用「离线生成报告」，本地规则引擎直接出诊断。

**数据** — 扫码登录或粘 token 拉取云存档；也可以把 `.save` 文件拖进页面（本地服务解析）；或手动粘贴文本 / JSON。快照记录 RKS 变化，支持导出 JSON。

> **多语言**：界面文案、图表 tooltip、离线报告、B30 分享图、AI 提示词全部走 `assets/i18n.js` 的词典（中英各约 250 条），曲名与作曲家人名保持原文不翻译。加第三门语言只需在词典每行数组后追加一项、并在 `LANGS` 里登记。

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
│  ├─ b30image.js    B30 分享图：SVG 拼版 → canvas → PNG
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

项目由workbuddy(DS V4 Flash)完成，人工参与度不少于10%>

---

