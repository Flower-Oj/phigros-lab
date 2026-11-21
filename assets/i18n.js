/* ============================================================
   Phigros Lab · 多语言
   D[key] = [中文, English]
   加新语言：在每个数组后面追加一项，并在 LANGS 里登记。
   ============================================================ */
(function () {
'use strict';

const PL = (window.PL = window.PL || {});

const LANGS = [
  { code: 'zh', label: '中' },
  { code: 'en', label: 'EN' }
];

const D = {
  /* ---------- 框架 ---------- */
  'brand.sub': ['B30 · 推分 · AI COACH', 'B30 · PUSH · AI COACH'],
  'nav.overview': ['概览', 'Overview'],
  'nav.push': ['推分', 'Push'],
  'nav.plan': ['目标', 'Target'],
  'nav.ai': ['AI 教练', 'AI Coach'],
  'nav.data': ['数据', 'Data'],
  'ui.theme': ['切换明暗主题', 'Toggle theme'],
  'ui.lang': ['切换语言', 'Switch language'],
  'ui.key': ['DeepSeek API Key', 'DeepSeek API Key'],
  'ui.close': ['关闭', 'Close'],
  'ui.avatar': ['本地数据', 'Local data'],

  /* ---------- 概览 ---------- */
  'ov.rks': ['综合 RKS', 'Overall RKS'],
  'ov.localEst': ['本地估算', 'Local estimate'],
  'ov.cutoff': ['B30 截断线', 'B30 cutoff'],
  'ov.sum30': ['30 格合计', 'Sum of 30'],
  'ov.official': ['官方值', 'Official'],
  'ov.estimate': ['本地估算', 'Estimated'],
  'ov.vsLast': ['较上次', 'vs last'],
  'ov.accChart': ['定数 — 准确率', 'Difficulty vs Accuracy'],
  'ov.accSub': ['每个点是一张谱；虚线是每 0.5 定数的平均准度，越陡说明高定数掉准越狠', 'One dot per chart; the dashed line is the mean accuracy per 0.5 difficulty. A steeper slope means accuracy drops off on harder charts.'],
  'ov.b30Chart': ['B30 单曲 RKS', 'B30 per-chart RKS'],
  'ov.b30Export': ['导出图片', 'Export image'],
  'ov.b30ExportHint': ['把前 30 首导出成一张可直接分享的 PNG', 'Export your top 30 as a shareable PNG'],
  'ov.b30Sub': ['虚线是平均单曲 RKS，右侧断崖处就是天花板', 'Dashed line is the mean chart RKS; the cliff on the right is your ceiling.'],
  'ov.rating': ['成绩档位', 'Grade mix'],
  'ov.diff': ['难度分布', 'Difficulty mix'],
  'ov.trend': ['RKS 趋势', 'RKS trend'],
  'ov.snapshot': ['记录快照', 'Snapshot'],
  'ov.diag': ['本地诊断', 'Local diagnosis'],
  'ov.diagSub': ['不依赖 AI 的规则引擎，先给出确定性结论', 'Rule-based checks that run before any AI call.'],
  'legend.below16': ['16 级以下', 'Below 16'],
  'legend.above16': ['16 级以上', '16 and above'],
  'legend.binMean': ['分箱均值', 'Bin mean'],
  'legend.top3': ['前三', 'Top 3'],

  /* ---------- 统计卡 ---------- */
  'stat.acc': ['B30 平均准度', 'B30 avg accuracy'],
  'stat.const': ['上榜平均定数', 'Avg difficulty of B30'],
  'stat.conv': ['定数转化率', 'Difficulty conversion'],
  'stat.cover': ['曲库覆盖', 'Song coverage'],
  'stat.best': ['最高单曲', 'Best chart'],
  'stat.accSub': ['{n} 条记录 · 截断线 {c}', '{n} records · cutoff {c}'],
  'stat.constSub': ['最高单曲 {rk} · {name}', 'Best {rk} · {name}'],
  'stat.noData': ['暂无成绩', 'No scores yet'],
  'stat.convGood': ['成绩跟得上定数', 'Scores keep up with difficulty'],
  'stat.convMid': ['略有折扣', 'Slightly lagging'],
  'stat.convBad': ['定数虚高，准度没跟上', 'Difficulty outruns accuracy'],
  'stat.coverSub': ['未游玩最高定数 {c}', 'Highest unplayed {c}'],
  'stat.coverSub2': ['还有 {n} 首没碰', '{n} songs untouched'],
  'stat.bestSub': ['{d} {c}', '{d} {c}'],

  /* ---------- 状态 / 通用 ---------- */
  'src.demo': ['示例数据', 'Demo data'],
  'src.cloud': ['云存档', 'Cloud save'],
  'src.file': ['存档文件', 'Save file'],
  'src.manual': ['手动导入', 'Imported'],
  'src.none': ['未导入', 'No data'],
  'st.in': ['已进榜', 'On board'],
  'st.can': ['可进榜', 'Can enter'],
  'st.out': ['榜外', 'Off board'],
  'grade.bLow': ['B 及以下', 'B or below'],
  'grade.phi': ['Phi', 'Phi'],
  'th.song': ['曲目', 'Song'],
  'th.accNow': ['当前 acc', 'Current acc'],
  'th.need': ['需要涨', 'To gain'],
  'th.rks': ['单曲 RKS', 'Chart RKS'],
  'th.gain': ['增益', 'Gain'],
  'th.total': ['总 RKS', 'Total RKS'],
  'th.status': ['状态', 'Status'],
  'th.diff': ['难度', 'Difficulty'],
  'th.score': ['分数', 'Score'],
  'th.acc': ['acc', 'acc'],
  'th.grade': ['档位', 'Grade'],
  'th.now': ['当前', 'Now'],
  'th.reach': ['需要打到', 'Target acc'],
  'th.accGap': ['准度差', 'Acc gap'],
  'th.contribution': ['贡献', 'Contributes'],

  /* ---------- 横幅 ---------- */
  'banner.emptyTitle': ['还没有成绩', 'No scores yet'],
  'banner.emptyBody': ['去「数据」页扫码登录或拖一个 .save 文件进来，分析会自动生成。', 'Scan to log in or drop a .save file on the Data tab — analysis appears automatically.'],
  'banner.demoTitle': ['正在看示例数据', 'Viewing demo data'],
  'banner.demoBody': ['下面所有数字都是假的，导入你自己的成绩后会自动覆盖。', 'Every number below is fake. Import your own scores and it will be replaced.'],
  'banner.emptyBtn': ['去导入', 'Import'],
  'banner.demoBtn': ['导入我的成绩', 'Import my scores'],

  /* ---------- 推分 ---------- */
  'push.title': ['推分候选', 'Push candidates'],
  'push.search': ['搜索曲名…', 'Search song…'],
  'push.all': ['全部', 'All'],
  'push.targetOpt': ['推到 {p}%', 'Push to {p}%'],
  'push.sortGain': ['按增益排序', 'Sort by gain'],
  'push.sortNeed': ['按所需准度排序', 'Sort by accuracy needed'],
  'push.sortConst': ['按定数排序', 'Sort by difficulty'],
  'push.sortGap': ['按差距排序', 'Sort by gap'],
  'push.target99': ['推到 99%', 'Push to 99%'],
  'push.target995': ['推到 99.5%', 'Push to 99.5%'],
  'push.target999': ['推到 99.9%', 'Push to 99.9%'],
  'push.target100': ['推到 100%', 'Push to 100%'],
  'plan.slots2': ['2 张', '2 charts'],
  'plan.slots3': ['3 张', '3 charts'],
  'plan.slots4': ['4 张', '4 charts'],
  'plan.slots5': ['5 张', '5 charts'],
  'plan.slots8': ['8 张', '8 charts'],
  'push.includeOut': ['含榜外', 'Off-board'],
  'push.empty': ['没有符合条件的候选。试试打开「含榜外」，或换一个目标准度。', 'No candidates. Try enabling "Off-board" or changing the target accuracy.'],
  'push.footShown': ['显示 {a} / 共 {b} 首', '{a} of {b} shown'],
  'push.footGain': ['候选合计潜在涨幅 +{v} RKS', 'Total potential +{v} RKS'],
  'push.footMin': ['准度低于 90% 的记录不参与计算', 'Records under 90% accuracy are excluded'],
  'push.more': ['展开全部', 'Show all'],
  'push.howto': ['怎么用这张表', 'How to read this table'],
  'push.noteGainT': ['增益', 'Gain'],
  'push.noteGain': ['把这张谱的 acc 推到目标档位后，单曲 RKS 的净增值。综合 RKS 的涨幅约等于 ', 'Net gain in chart RKS once this chart reaches the target accuracy. Overall RKS moves roughly '],
  'push.noteGainTail': ' ÷ 30。',
  'push.noteNeedT': ['需要涨', 'To gain'],
  'push.noteNeed': ['为了达标还要提升多少准度，数字越小越容易做。', 'How much accuracy is still missing. Smaller is easier.'],
  'push.noteStatusT': ['状态', 'Status'],
  'push.noteStatus': ['「已进榜」提升直接计入最佳 27；「可进榜」表示推上去能挤掉第 27 名；「榜外」需先超过截断线才有意义。', '"On board" gains count toward your best 27 directly; "Can enter" means it would push out the 27th; "Off board" needs to beat the cutoff first.'],

  /* ---------- 目标 ---------- */
  'plan.title': ['目标反推', 'Target planner'],
  'plan.sub': ['给定目标 RKS，算出最省力的打法：改哪几张谱、各推到多少 acc', 'Give a target RKS and get the cheapest route: which charts to improve, and to what accuracy.'],
  'plan.target': ['目标 RKS', 'Target RKS'],
  'plan.slots': ['准备改几张', 'Charts to improve'],
  'plan.slotsN': ['{n} 张', '{n} charts'],
  'plan.run': ['计算方案', 'Calculate'],
  'plan.ceiling': ['理论上限', 'Ceiling'],
  'plan.ceilingSub': ['把已经打过的谱全部推上去，能到多少', 'How high you could get by pushing charts you already own'],
  'plan.rowNow': ['当前', 'Now'],
  'plan.row995': ['全部推到 99.5%', 'All charts at 99.5%'],
  'plan.row995Sub': ['打过的谱都到 99.5% acc', 'Every played chart at 99.5% acc'],
  'plan.rowPhi': ['全部 Phi', 'All Phi'],
  'plan.rowPhiSub': ['理论天花板，不现实但能看空间', 'Theoretical ceiling — unrealistic, but shows the headroom'],
  'plan.room': ['距离「全部 99.5%」还有 +{v} 的空间。', 'Still +{v} of headroom up to "all charts at 99.5%".'],
  'plan.potential': ['曲库潜力', 'Untapped library'],
  'plan.potentialSub': ['还没碰过的高定数谱，是涨分最直接的增量', 'High-difficulty charts you have never played are the easiest gains'],
  'plan.notLoaded': ['曲库未加载（需要通过本地服务打开网页）。', 'Library not loaded (open the page through the local server).'],
  'plan.allDone': ['14.5 级以上的谱都碰过了，剩下的是准度问题而不是曲池问题。', 'You have touched every 14.5+ chart — what is left is accuracy, not song pool.'],
  'plan.unplayed': ['还有 {n} 首没打过。', '{n} songs still unplayed.'],
  'plan.suggest': ['建议攻克的谱面', 'Suggested charts'],
  'plan.hintIdle': ['先在上面设一个目标', 'Set a target above'],
  'plan.hintDone': ['目标 {t} · {n} 张谱 · 按「准度差最小」排序', 'Target {t} · {n} charts · sorted by smallest accuracy gap'],
  'plan.needLine': ['需要 <b>+{d}</b> 综合 RKS ＝ 30 格合计 <b>+{s}</b>。', 'Needs <b>+{d}</b> overall RKS = <b>+{s}</b> across the 30 slots.'],
  'plan.spread': ['拆到 {n} 张谱上，每张单曲 RKS 提 <b>+{p}</b> 就够。', 'Spread over {n} charts that is <b>+{p}</b> chart RKS each.'],
  'plan.infeasible': ['没有可行的谱能吃到这个目标，说明卡在定数上限了。', 'No owned chart can reach this target — you are capped by your song pool.'],
  'plan.ceilingMsg': ['以现在打过的谱，全部推到 99.5% 也只能到 <b>{v}</b>。这个目标已经超出现有曲池，得去打新谱。', 'Even with every played chart at 99.5% you would only reach <b>{v}</b>. This target needs new charts.'],
  'plan.shortMsg': ['这几张最多只能拿到 +{g}，还差 {s}：把张数调大，或者先打新谱扩曲池。', 'These charts only give +{g}, still {s} short. Raise the chart count or play new songs first.'],
  'plan.cmpTitle': ['换个张数看可行性', 'Compare chart counts'],
  'plan.cmpRow': ['每张 +{p} 单曲 RKS · 平均要涨 {a}% 准度', '+{p} chart RKS each · {a}% accuracy needed on average'],
  'plan.cmpRowBare': ['每张 +{p} 单曲 RKS', '+{p} chart RKS each'],
  'plan.cmpOk': ['可行', 'Feasible'],
  'plan.cmpNo': ['不够', 'Not enough'],
  'plan.emptyTable': ['没有符合条件的谱面。', 'No charts match.'],

  /* ---------- 诊断 ---------- */
  'diag.noneT': ['还没有成绩', 'No scores yet'],
  'diag.noneD': ['去「数据」页扫码登录或拖一个 .save 文件进来，所有分析会自动生成。', 'Scan to log in or drop a .save file on the Data tab — all analysis is generated automatically.'],
  'diag.gapT': ['定数与成绩差', 'Difficulty vs performance'],
  'diag.gapD': ['上榜平均定数 <b>{c}</b>，平均单曲 RKS 只有 <b>{r}</b>。', 'Average difficulty of your B30 is <b>{c}</b>, but average chart RKS is only <b>{r}</b>.'],
  'diag.gapWarn': ['选谱偏难、分数没跟上，优先补准度而不是继续抬定数。', 'You are picking charts above your level — build accuracy instead of raising difficulty.'],
  'diag.gapOk': ['定数与成绩匹配得比较健康。', 'Difficulty and performance are well matched.'],
  'diag.dropT': ['高定数掉准', 'Accuracy drop'],
  'diag.dropD': ['15.2 以下平均 <b>{lo}%</b>，16 级以上只有 <b>{hi}%</b>。', 'Below 15.2 you average <b>{lo}%</b>; at 16+ only <b>{hi}%</b>.'],
  'diag.dropWarn': ['典型难度抗性问题：读谱跟不上，不是纯准度问题。', 'A classic difficulty-endurance problem: reading falls behind, not raw accuracy.'],
  'diag.dropOk': ['跨定数的准度保持得不错。', 'Accuracy holds up well across difficulties.'],
  'diag.recT': ['最近 3 格', 'Recent 3 slots'],
  'diag.recD': ['由官方 RKS 反解：最近 3 格合计 <b>{s}</b>，平均每格 <b>{p}</b>，', 'Solved from the official RKS: the last 3 slots sum to <b>{s}</b>, about <b>{p}</b> each, '],
  'diag.recWarn': ['低于综合值 {r}。这 3 格是纯负担，换成高定数成绩 RKS 会立刻涨。', 'below your overall {r}. These slots drag you down — replacing them with high-difficulty plays raises RKS immediately.'],
  'diag.recOk': ['高于综合值，说明最近在打难的谱。', 'above your overall value, so you have been playing hard charts lately.'],
  'diag.phiT': ['低定数 Phi 占位', 'Low-difficulty Phi padding'],
  'diag.phiD': ['{list} 这类低定数 Phi 只在计数上好看，不涨分。', 'Phi on charts like {list} looks good in counters but adds no RKS.'],
  'diag.c16T': ['16 级以上谱面', 'Charts at 16+'],
  'diag.c16Has': ['有 {n} 张，最高准度 <b>{a}%</b>。高定数成绩决定了 B27 的上沿，收尾空间就在这里。', '{n} charts, best accuracy <b>{a}%</b>. High-difficulty scores set the upper edge of your best 27 — this is where the room is.'],
  'diag.c16None': ['一张 16+ 都没有，天花板被自己的选谱锁死了。', 'Not a single 16+ chart — your song choices are capping you.'],
  'diag.candT': ['{n} 张谱可一次拿到 +0.5 以上', '{n} charts can each give +0.5 or more'],
  'diag.candD': ['最划算的是 <b>{name}</b>（{d} {c}，{a}% → 推到 99.5% 可得 {t}）。', 'Best value is <b>{name}</b> ({d} {c}, {a}% → {t} at 99.5%).'],
  'diag.covT': ['曲库还没打完', 'Library not finished'],
  'diag.covD': ['还有 <b>{n}</b> 首没碰过，其中 {hot} 定数最高，是明确的增量。', '<b>{n}</b> songs untouched; {hot} are the highest and the clearest gains.'],
  'diag.covD2': ['还有 <b>{n}</b> 首没碰过，高定数的基本都打过了。', '<b>{n}</b> songs untouched, but you have played most of the hard ones.'],

  /* ---------- 快照 / 数据 ---------- */
  'snap.first': ['首个快照', 'First snapshot'],
  'snap.meta': ['准度 {a}% · Phi {p} · {n} 条', 'acc {a}% · Phi {p} · {n} records'],
  'snap.empty': ['还没有快照。拉取一次成绩或点上面的「记录当前快照」。', 'No snapshots yet. Fetch your scores, or press "Snapshot" above.'],
  'data.meta': ['{n} 条{more} · 官方 {o} · 估算 {r}', '{n} records{more} · official {o} · estimate {r}'],
  'data.metaMore': ['（显示前 200）', ' (first 200)'],
  'data.search': ['搜索曲名 / 作曲…', 'Search song / composer…'],
  'data.noMatch': ['没有匹配「{q}」的记录。', 'No records match "{q}".'],

  /* ---------- 数据页 ---------- */
  'data.cloud': ['云存档', 'Cloud save'],
  'data.cloudSub': ['本地解析，不需要任何 QQ 机器人', 'Parsed locally, no third-party bot involved'],
  'data.step1': ['点「扫码登录」，手机 TapTap 扫码', 'Tap "Scan to log in" and scan with TapTap on your phone'],
  'data.step2': ['授权后自动填入 token 并拉取', 'After approval the token is filled in and scores are fetched'],
  'data.step3': ['已有 token 也可以直接粘进来', 'Or paste an existing token'],
  'data.tokenPh': ['sessionToken（25 位）', 'sessionToken (25 chars)'],
  'data.login': ['扫码登录', 'Scan to log in'],
  'data.bind': ['验证账号', 'Verify account'],
  'data.pull': ['拉取成绩', 'Fetch scores'],
  'data.file': ['存档文件', 'Save file'],
  'data.fileSub': ['直接拖游戏存档（.save / zip）进来，不上传', 'Drop a game save (.save / .zip) here — nothing is uploaded'],
  'data.dropTitle': ['拖放 .save 到这里', 'Drop a .save file here'],
  'data.dropSub': ['或点击选择文件', 'or click to choose a file'],
  'data.localTitle': ['解析在本地完成', 'Parsing happens locally'],
  'data.localBody': ['解 zip → AES-256 解密 → 按二进制格式读成绩，全程不写盘、不上传。', 'Unzip → AES-256 decrypt → read the binary records. Nothing is written to disk or uploaded.'],
  'data.manual': ['手动导入', 'Manual import'],
  'data.manualSub': ['JSON，或每行一条文本', 'JSON, or one line per record'],
  'data.pastePh': ['曲名 | 难度 | 定数 | acc | 分数(可选)\n例：Distorted Fate | IN | 16.3 | 97.67 | 906053\n\n也可以直接粘贴 Phi-Plugin / philib 导出的 JSON', 'Song | Difficulty | Const | acc | Score (optional)\nExample: Distorted Fate | IN | 16.3 | 97.67 | 906053\n\nYou can also paste JSON exported by Phi-Plugin / philib'],
  'data.import': ['解析导入', 'Import'],
  'data.demo': ['示例数据', 'Demo data'],
  'data.clear': ['清空', 'Clear'],
  'data.snapshot': ['快照', 'Snapshots'],
  'data.snapshotSub': ['每次拉取会自动留一个快照，用来观察 RKS 的实际变化', 'Every fetch leaves a snapshot so you can watch RKS actually move'],
  'data.snapNow': ['记录当前快照', 'Snapshot now'],
  'data.export': ['导出 JSON', 'Export JSON'],
  'data.records': ['全部记录', 'All records'],

  /* ---------- AI ---------- */
  'ai.title': ['生成分析', 'Generate analysis'],
  'ai.sub': ['把结构化数据交给 DeepSeek，输出诊断与训练计划', 'Hand the structured data to DeepSeek for a diagnosis and training plan'],
  'ai.focus': ['关注点', 'Focus'],
  'ai.presetAll': ['全面诊断', 'Full diagnosis'],
  'ai.presetWeek': ['一周计划', 'Weekly plan'],
  'ai.presetHand': ['手法与设置', 'Technique & setup'],
  'ai.presetSong': ['单曲攻克', 'Chart attack'],
  'ai.presetPush': ['只要推分顺序', 'Push order only'],
  'ai.notes': ['补充说明（选填）', 'Notes (optional)'],
  'ai.notesPh': ['例：iPad 双指，中后段容易 early，慢速段常断连', 'e.g. iPad, two fingers, tend to hit early in the second half, break on slow sections'],
  'ai.model': ['模型', 'Model'],
  'ai.modelChat': ['deepseek-chat · 快', 'deepseek-chat · fast'],
  'ai.modelReason': ['deepseek-reasoner · 更深', 'deepseek-reasoner · deeper'],
  'ai.gen': ['生成分析', 'Generate'],
  'ai.stop': ['停止', 'Stop'],
  'ai.offline': ['离线生成报告', 'Offline report'],
  'ai.copy': ['复制', 'Copy'],
  'ai.download': ['下载 .md', 'Download .md'],
  'ai.hint': ['调用 DeepSeek 官方接口，流式输出。Key 只存在你自己的浏览器里，除 DeepSeek 外不发往任何地方。没有 Key 也可以用「离线生成报告」，由本地规则引擎直接产出诊断。', 'Calls the official DeepSeek API with streaming. Your key stays in this browser and goes nowhere except DeepSeek. No key? Use "Offline report" — the local rule engine writes the diagnosis.'],
  'ai.empty': ['还没有分析结果。点「生成分析」让 AI 基于你的成绩给出诊断、推分顺序和训练安排，或者先用「离线生成报告」看本地结论。', 'No analysis yet. Hit "Generate" for an AI diagnosis, push order and training plan — or try "Offline report" for the local verdict.'],
  'ai.chatPh': ['追问，例如：慢流速怎么练？', 'Ask a follow-up, e.g. how do I practise slow streams?'],
  'ai.send': ['发送', 'Send'],
  'ai.you': ['你', 'You'],
  'ai.generating': ['生成中…', 'Generating…'],
  'ai.done': ['完成 · {n} 字', 'Done · {n} chars'],
  'ai.offlineState': ['本地规则引擎 · 未调用 AI', 'Local rule engine · AI not called'],
  'ai.stopped': ['（已停止）', '(stopped)'],
  'ai.fail': ['调用失败：{e}', 'Request failed: {e}'],
  'ai.cors': ['如果是 CORS 或网络错误，先运行 ', 'If this is a CORS or network error, run '],
  'ai.corsTail': ' 再从 http://localhost:8787 打开本页。也可以直接用「离线生成报告」。',
  'ai.needKey': ['先配置 DeepSeek API Key', 'Set your DeepSeek API Key first'],

  /* ---------- Key 弹窗 ---------- */
  'key.title': ['DeepSeek API Key', 'DeepSeek API Key'],
  'key.desc': ['只保存在本机 localStorage。不填也能用：站点每天赠送 3 次免费额度，填自己的 Key 则不限次数、不排队。', 'Stored only in this browser\u2019s localStorage. Not required: the site gives 3 free runs per day. Add your own key for unlimited use.'],
  'key.save': ['保存', 'Save'],
  'key.clear': ['清除', 'Clear'],
  'key.saved': ['已保存', 'Saved'],
  'key.cleared': ['已清除', 'Cleared'],
  'key.saveToast': ['Key 已保存', 'Key saved'],
  'key.clearToast': ['Key 已清空', 'Key cleared'],

  /* ---------- 提示 / 报错 ---------- */
  'toast.noData': ['没有数据', 'No data'],
  'toast.snapshot': ['已记录快照', 'Snapshot saved'],
  'toast.imported': ['已导入 {n} 条', 'Imported {n} records'],
  'toast.parseDone': ['存档解析完成：{n} 条', 'Save parsed: {n} records'],
  'toast.parseFail': ['解析失败', 'Parsing failed'],
  'toast.pullFail': ['拉取失败', 'Fetch failed'],
  'toast.copied': ['已复制到剪贴板', 'Copied to clipboard'],
  'toast.copyFail': ['复制失败，手动选吧', 'Copy failed — select it manually'],
  'toast.nothing': ['还没有内容', 'Nothing to copy'],
  'toast.offlineDone': ['已生成离线报告', 'Offline report generated'],
  'toast.needData': ['先导入成绩', 'Import some scores first'],
  'toast.needToken': ['先填 sessionToken', 'Enter a sessionToken first'],
  'toast.targetEmpty': ['先填一个目标 RKS', 'Enter a target RKS'],
  'toast.targetSame': ['目标就是当前值，换个更高的数字。', 'That is your current RKS. Pick something higher.'],
  'toast.targetDown': ['目标低于当前 RKS，这个工具只做向上规划', 'Target is below your current RKS; this tool only plans upwards'],
  'login.requesting': ['正在申请登录码…', 'Requesting a login code…'],
  'login.waiting': ['等待扫码 · {m} 分钟内有效', 'Waiting for scan · valid for {m} min'],
  'login.ok': ['登录成功{nick}，正在拉取成绩…', 'Logged in{nick}, fetching scores…'],
  'login.okNick': ['：{n}', ': {n}'],
  'login.scanned': ['已扫码，请在手机上确认授权', 'Scanned — confirm on your phone'],
  'login.expired': ['登录码已过期，重新点「扫码登录」', 'Code expired — tap "Scan to log in" again'],
  'login.fail': ['申请失败：{e}（需要先 node proxy.js）', 'Request failed: {e} (run node proxy.js first)'],
  'msg.pulling': ['拉取中…', 'Fetching…'],
  'msg.pulled': ['已拉取 {n} 条 · 官方 RKS {v}', 'Fetched {n} records · official RKS {v}'],
  'msg.pullFail': ['拉取失败：{e}（需要先 node proxy.js）', 'Fetch failed: {e} (run node proxy.js first)'],
  'msg.connecting': ['连接中…', 'Connecting…'],
  'msg.connected': ['已连接：{w}', 'Connected: {w}'],
  'msg.bindFail': ['连接失败：{e}（需要先 node proxy.js）', 'Connection failed: {e} (run node proxy.js first)'],
  'msg.parsing': ['正在解析 {f}…', 'Parsing {f}…'],
  'msg.parsed': ['已解析 {n} 条成绩', 'Parsed {n} records'],
  'msg.parseFail': ['解析失败：{e}（需要先 node proxy.js）', 'Parsing failed: {e} (run node proxy.js first)'],
  'msg.importedN': ['已导入 {n} 条记录。', 'Imported {n} records.'],
  'msg.demoLoaded': ['已载入示例数据。', 'Demo data loaded.'],
  'msg.cleared': ['已清空。', 'Cleared.'],
  'msg.tooFew': ['只解析出 {n} 条成绩，至少需要 3 条才能做分析。', 'Only {n} records parsed — at least 3 are needed for analysis.'],
  'msg.badParse': ['没能解析出成绩。用「曲名 | 难度 | 定数 | acc」每行一条，或粘贴标准 JSON。', 'Could not parse any score. Use "Song | Difficulty | Const | acc" one per line, or paste standard JSON.'],
  'msg.emptyInput': ['内容是空的。', 'Input is empty.'],

  /* ---------- 图表内部 ---------- */
  'chart.axisDiff': ['定数', 'Difficulty'],
  'chart.avg': ['平均 {v}', 'avg {v}'],
  'chart.hidden': ['只显示定数 {x}+ / 准度 {y}%+ 的谱，已隐藏 {n} 条', 'Showing difficulty {x}+ / accuracy {y}%+ only, {n} hidden'],
  'chart.tooFew': ['成绩太少，导入更多记录后再看曲线', 'Not enough scores — import more records'],
  'chart.noB30': ['还没有上榜成绩', 'No ranked charts yet'],
  'chart.trendEmpty': ['至少记录两次快照才能看趋势', 'At least two snapshots are needed'],
  'chart.trendHint': ['拉取成绩会自动留一次快照', 'Fetching scores saves a snapshot automatically'],
  'chart.binTip': ['定数 {c} 左右 · 平均 {a}% · {n} 张', 'Difficulty ~{c} · avg {a}% · {n} charts'],
  'chart.lvTip': ['{k}：{n} 张', '{k}: {n} charts'],
  'chart.gradeTip': ['{g}：{n} 条{p}', '{g}: {n} records{p}'],
  'chart.times': ['{n} 次', '{n} times'],

  /* ---------- 离线报告 ---------- */
  'rep.overview': ['数据概览', 'Overview'],
  'rep.rks': ['综合 RKS：**{v}**{src}', 'Overall RKS: **{v}**{src}'],
  'rep.official': ['（官方值）', ' (official)'],
  'rep.estimate': ['（本地估算）', ' (local estimate)'],
  'rep.records': ['记录 {n} 条 · 其中 Phi {p} 个 · B30 平均准度 **{a}%**', '{n} records · {p} Phi · B30 avg accuracy **{a}%**'],
  'rep.avg': ['上榜平均定数 {c}，平均单曲 RKS {r}，转化率 **{v}%**', 'Avg B30 difficulty {c}, avg chart RKS {r}, conversion **{v}%**'],
  'rep.cover': ['曲库 {p}/{t} 首已游玩，还有 {n} 首没碰', 'Library {p}/{t} played, {n} untouched'],
  'rep.conclusion': ['结论', 'Findings'],
  'rep.next': ['接下来打什么', 'What to play next'],
  'rep.colIdx': ['#', '#'],
  'rep.colSong': ['曲目', 'Song'],
  'rep.colDiff': ['难度', 'Difficulty'],
  'rep.colNow': ['当前', 'Now'],
  'rep.colTarget': ['目标', 'Target'],
  'rep.colGain': ['增益', 'Gain'],
  'rep.colTotal': ['总 RKS', 'Total RKS'],
  'rep.noCand': ['没有可推的谱，考虑开发新谱面', 'No push candidates — consider new charts'],
  'rep.howto': ['怎么练', 'How to practise'],
  'rep.tipGap': ['定数与成绩差偏大：**降一档打准**。选 14.5–15.5 的谱刷到 99%+，把准度地基补回来。', 'Difficulty outruns performance: **drop one tier and play clean**. Grind 14.5–15.5 charts to 99%+ and rebuild the accuracy base.'],
  'rep.tipC16': ['16+ 平均只有 {a}%：读谱跟不上。用 0.9 倍速分解中段，只练前 30 秒开局的稳定度。', '16+ charts average only {a}%: reading is the bottleneck. Slow to 0.9× and drill the first 30 seconds for stability.'],
  'rep.tipWorst': ['垫底的 {n} 张（{list}）先别碰，收尾难度太高。', 'Skip the bottom {n} ({list}) for now — too much cleanup work.'],
  'rep.tipPhi': ['Phi 数量少：先挑 3 首熟练的 13–14 级谱打到 100 万，稳定手感比追高定数有效。', 'Few Phi scores: take 3 comfortable 13–14 charts to 1,000,000. Stable execution beats chasing difficulty.'],
  'rep.tipWarmup': ['每次练琴前 10 分钟只打慢速段，把 early/late 分布压窄，再上速度。', 'Spend the first 10 minutes of every session on slow sections, tightening the early/late spread before raising speed.'],
  'rep.expect': ['预期', 'Outlook'],
  'rep.expectLine': ['按上面 {n} 首的顺序推进，两周内 **+0.2 RKS 是保守目标**：{plan}', 'Following those {n} charts, **+0.2 RKS in two weeks is a conservative goal**: {plan}'],
  'rep.expectPlan': ['{list} 即可达成。', '{list} is enough.'],
  'rep.expectNone': ['需要先扩展曲池。', 'you need to expand your song pool first.'],
  /* ---------- 补充 ---------- */
  'footer.local': ['本地运行，数据不上传', 'Runs locally, data is never uploaded'],
  'footer.formula': ['单曲 RKS = 定数 × ((acc − 55) / 45)²　玩家 RKS = (最佳 27 + 最近 3) / 30', 'Chart RKS = difficulty × ((acc − 55) / 45)²　Player RKS = (best 27 + last 3) / 30'],
  'data.loginTip': ['在 TapTap 里输入这个字符码，或点下面的链接扫码', 'Enter this code in TapTap, or open the link below to scan'],
  'push.noteGainFull': ['把这张谱的 acc 推到目标档位后，单曲 RKS 的净增值。综合 RKS 的涨幅约等于 <code>增益 ÷ 30</code>。', 'Net gain in chart RKS after pushing this chart to the target accuracy. Overall RKS moves about <code>gain ÷ 30</code>.'],

  'rep.footer': ['> 由本地规则引擎生成，未经 AI 润色。当前截断线 {c}，理论上限（全部 99.5%）{u}。', '> Generated by the local rule engine, not polished by AI. Current cutoff {c}, ceiling (all at 99.5%) {u}.'],

  /* ---------- 补充 ---------- */
  'ai.corsTail': [' 再从 http://localhost:8787 打开本页。也可以直接用「离线生成报告」。', ' then reopen this page at http://localhost:8787. You can also use "Offline report".'],
  'ai.err401': ['Key 无效或已失效', 'Invalid or expired API key'],
  'ai.err429': ['账户余额不足或限流（HTTP {c}）', 'Out of balance or rate-limited (HTTP {c})'],
  'ai.errReq': ['请求失败', 'Request failed'],
  'ai.freeQuota': ['免费额度今天还剩 {n} 次', 'Free quota: {n} left today'],
  'ai.freeNone': ['今天的免费额度用完了，点右上角钥匙填自己的 Key', "Today's free quota is used up — add your own key via the key button at top right"],
  'ai.freeHint': ['点右上角钥匙填入自己的 DeepSeek API Key 就能继续用；站点的免费额度每天重置。', 'Add your own DeepSeek API key via the top-right key button to keep going — the site free quota resets every day.'],
  'msg.noScores': ['没有取到成绩', 'No scores returned'],
  'msg.unknownAcct': ['未知账号', 'Unknown account'],
  'msg.needToken': ['先填 token', 'Enter a token first'],
  'msg.loginErr': ['出错', 'Error'],
  'msg.acctOk': ['账号有效：{w}', 'Account valid: {w}'],
  'msg.stopped': ['已停止', 'Stopped'],

  /* ---------- 分享图 ---------- */
  'poster.noName': ['匿名玩家', 'Anonymous'],
  'poster.records': ['记录数', 'Records'],
  'poster.b27': ['B27 均', 'B27 avg'],
  'poster.b3': ['B3 均', 'B3 avg'],
  'poster.accShort': ['达成率', 'ACC'],
  'poster.art': ['曲绘 {d}/{n}', 'Jacket {d}/{n}'],
  'poster.withArt': ['含 {n} 张曲绘', '{n} jackets'],
  'poster.madeBy': ['由 Phigros Lab 生成', 'Made with Phigros Lab'],
  'poster.exporting': ['生成中…', 'Rendering…'],
  'poster.done': ['B30 图片已保存', 'B30 image saved'],
  'poster.fail': ['图片生成失败：{e}', 'Image export failed: {e}'],

  /* ---------- 相对时间 ---------- */
  'time.none': ['未同步', 'not synced'],
  'time.justNow': ['刚刚', 'just now'],
  'time.min': ['{n} 分钟前', '{n}m ago'],
  'time.hour': ['{n} 小时前', '{n}h ago'],
  'time.day': ['{n} 天前', '{n}d ago'],

  /* ---------- 谱面预览 ---------- */
  'cp.title': ['谱面预览', 'Chart preview'],
  'toast.unknownSong': ['曲库里没有这首歌', 'Song not found in the library'],
  'cp.const': ['定数', 'Level'],
  'cp.notes': ['物量', 'Notes'],
  'cp.charter': ['谱师', 'Charter'],
  'cp.illu': ['曲绘', 'Art'],
  'cp.length': ['时长', 'Length'],
  'cp.density': ['密度', 'Density'],
  'cp.densityV': ['{v} / 秒', '{v}/s'],
  'cp.noStats': ['这首还没收录谱面统计', 'No chart stats for this song yet'],
  'cp.noStatsHint': ['BPM、物量来自社区整理的谱面库，这一首还没有收录。下面的定数和你的成绩仍然可以看。', 'BPM and note counts come from a community chart dataset that has not covered this song yet. Level and your score below still work.'],
  'cp.diffChart': ['四个难度的物量对比', 'Note count by difficulty'],
  'cp.best': ['你的最好成绩', 'Your best'],
  'cp.notPlayed': ['还没打过这张谱', 'Not played yet'],
  'cp.notPlayedHint': ['游戏里打一次，或者拉取最新成绩之后就会出现在这里。', 'Play it once in game, or pull your latest scores, and it shows up here.'],
  'cp.percentile': ['物量在全库同定数（±0.3）里排第 {p} 百分位', 'Note count sits at the {p}th percentile among charts within ±0.3 level'],
  'cp.percentileFew': ['同定数谱面样本太少，不给百分位', 'Too few charts at this level for a percentile'],
  'cp.rank': ['全库按定数排第 {r} / {n}', '#{r} of {n} by level'],
  'cp.dataNote': ['BPM / 时长 / 物量来自社区谱面统计（CC BY-NC-SA 3.0），详见设置 → 数据来源。', 'BPM, length and note counts come from a community dataset (CC BY-NC-SA 3.0). See Settings → Data sources.'],
  'cp.tapHint': ['点任意谱面行看谱面数据', 'Click any chart row for its stats'],
  'cp.close': ['关闭', 'Close'],

  /* ---------- 设置 ---------- */
  'set.title': ['设置', 'Settings'],
  'set.appearance': ['外观', 'Appearance'],
  'set.theme': ['主题', 'Theme'],
  'set.themeDark': ['深色', 'Dark'],
  'set.themeLight': ['浅色', 'Light'],
  'set.lang': ['语言', 'Language'],
  'set.keyLabel': ['API Key', 'API key'],
  'set.keyOwn': ['已填自己的 Key', 'Using your own key'],
  'set.keyFree': ['未填，走站点免费额度', 'Not set, using site quota'],
  'set.keyOpen': ['管理 API Key', 'Manage API key'],
  'set.tour': ['重看新手教程', 'Replay tour'],
  'set.data': ['数据', 'Data'],
  'set.export': ['导出 JSON', 'Export JSON'],
  'set.clear': ['清空本地数据', 'Clear local data'],
  'set.clearAsk': ['清空所有本地成绩、快照和 Key？此操作不可撤销。', 'Clear all local scores, snapshots and key? This cannot be undone.'],
  'set.clearDone': ['本地数据已清空', 'Local data cleared'],
  'set.dataHint': ['成绩、快照和 API Key 都只存在这台设备的浏览器里，清空后不可恢复。', 'Scores, snapshots and the API key live only in this browser. Clearing cannot be undone.'],
  'set.about': ['关于', 'About'],
  'set.app': ['安卓客户端', 'Android app'],
  'set.appBtn': ['下载安装包', 'Download APK'],
  'footer.app': ['下载安卓客户端', 'Android app'],
  'set.version': ['版本', 'Version'],
  'set.legal': ['著作权声明', 'Copyright notice'],
  'set.legalBody': ['Phigros Lab 是<b>非官方</b>粉丝工具，与 Pigeon Games 无任何关联。《Phigros》游戏、曲目、曲绘、谱面及相关素材的版权归 Pigeon Games 及各曲师、曲绘师、谱师所有。本工具<b>不内置、不分发任何游戏资源</b>（音频、曲绘、谱面文件），只解析你自己账号的成绩数据。若权利方认为本项目有不妥之处，请联系我们立即处理。', 'Phigros Lab is an <b>unofficial</b> fan tool with no affiliation to Pigeon Games. Phigros, its songs, illustrations, charts and related assets are copyright Pigeon Games and the respective composers, illustrators and charters. This tool <b>ships and distributes no game assets</b> (audio, artwork, chart files) and only parses your own account data. Rights holders may contact us and we will act immediately.'],
  'set.credits': ['数据来源', 'Data sources'],
  'set.creditsBody': ['曲库与定数来自社区整理的曲目表（<code>data/info.csv</code>）；BPM / 时长 / 物量来自 <a href="https://github.com/sakimidare/Phigros" target="_blank" rel="noreferrer">sakimidare/Phigros</a>（抓取自萌娘百科，遵循 CC BY-NC-SA 3.0），只取这四项事实数据；成绩来自你自己的 TapTap 云存档。', 'Song list and levels come from a community-maintained table (<code>data/info.csv</code>). BPM, length and note counts come from <a href="https://github.com/sakimidare/Phigros" target="_blank" rel="noreferrer">sakimidare/Phigros</a> (scraped from Moegirlpedia, CC BY-NC-SA 3.0) and use only those four factual fields. Scores come from your own TapTap cloud save.'],
  'set.privacy': ['隐私', 'Privacy'],
  'set.privacyBody': ['成绩只在本机浏览器解析，不上传。不填 API Key 时，AI 请求经本站后端转发（服务端持有免费额度，按 IP 与浏览器匿名 id 每天 3 次）；填了自己的 Key 则直连 api.deepseek.com。除此之外没有统计埋点，不收集任何数据。', 'Scores are parsed locally and never uploaded. Without your own API key, AI requests go through this site backend (the server holds a free quota, 3 per day per IP and browser id); with your own key they go straight to api.deepseek.com. No analytics, no data collection.'],
  'set.license': ['开源许可', 'License'],
  'set.licenseBody': ['本站代码以 MIT 许可开源：<a href="https://github.com/Flower-Oj/phigros-lab" target="_blank" rel="noreferrer">Flower-Oj/phigros-lab</a>。第三方数据按各自许可使用，详见仓库的 LICENSE 与 NOTICE。', 'The code is open source under MIT: <a href="https://github.com/Flower-Oj/phigros-lab" target="_blank" rel="noreferrer">Flower-Oj/phigros-lab</a>. Third-party data follows its own licenses; see LICENSE and NOTICE in the repo.'],

  /* ---------- 新手教程 ---------- */
  'tour.kicker': ['第 {n} / {t} 步', 'Step {n} of {t}'],
  'tour.skip': ['跳过', 'Skip'],
  'tour.prev': ['上一步', 'Back'],
  'tour.next': ['下一步', 'Next'],
  'tour.done': ['开始使用', 'Get started'],
  'tour.go': ['去导入成绩', 'Import scores'],
  'tour.s1t': ['先把自己的成绩导进来', 'Start by loading your scores'],
  'tour.s1b': ['三种方式任选：手机 TapTap 扫码登录、把游戏存档（<code>.save</code> / zip）拖进来、或者直接粘一段文本。解析全在这台设备上完成，不会上传。', 'Three ways in: scan the QR with TapTap, drop your save file (<code>.save</code> / zip), or paste plain text. Parsing happens entirely on this device.'],
  'tour.s1tip': ['没有存档也能玩：点「示例数据」先看看效果。', 'No save handy? Hit "Sample data" to explore first.'],
  'tour.s2t': ['概览：先看清自己的位置', 'Overview: know where you stand'],
  'tour.s2b': ['RKS、定数—准确率散点、B30 单曲 RKS、成绩档位和趋势都在这一页。下方「本地诊断」是不依赖 AI 的规则结论，几秒就能读完。', 'RKS, level-vs-accuracy scatter, B30 chart RKS, grade mix and trend all live here. The local diagnosis below is rule-based, no AI needed.'],
  'tour.s2tip': ['点「记录快照」可以把当前 RKS 存下来，之后看真实的涨幅。', 'Hit "Snapshot" to store the current RKS and watch real progress later.'],
  'tour.s3t': ['推分：先打哪几张', 'Push: what to grind next'],
  'tour.s3b': ['表格按「推到目标 acc 后的净增益」排序。每行的状态告诉你它已进榜、可进榜还是榜外。', 'The table is sorted by net gain after pushing to your target accuracy. Each row shows whether it is already ranked, can enter, or sits outside.'],
  'tour.s3tip': ['<b>点任意一行可以打开谱面预览</b>：定数、物量、BPM、谱师和你的成绩一目了然。', '<b>Click any row to open the chart preview</b>: level, note count, BPM, charter and your score in one place.'],
  'tour.s4t': ['AI 教练：不填 Key 也能用', 'AI coach: works without a key'],
  'tour.s4b': ['不填 API Key 时走站点免费额度（每天 3 次）；填了自己的 DeepSeek Key 就不限量，请求直连官方接口。不想联网也能用「离线生成报告」。', 'Without an API key you get the site free quota (3 per day). Add your own DeepSeek key for unlimited use straight to the official API. "Offline report" works with no network at all.'],
  'tour.s4tip': ['追问会沿用同一份成绩上下文，不用重复说明背景。', 'Follow-up questions reuse the same score context, so no need to re-explain.'],
  'tour.s5t': ['设置与著作权声明', 'Settings and credits'],
  'tour.s5b': ['右上角齿轮里可以切换主题与语言、管理 API Key、导出或清空本地数据，也能随时重看这份教程。著作权声明、数据来源和隐私说明都放在那里。', 'The gear at top right holds theme and language, API key management, export or clear local data, and this tour. The copyright notice, data sources and privacy notes live there too.'],
  'tour.s5tip': ['本项目是非官方粉丝工具，不内置任何游戏资源。', 'This is an unofficial fan tool and bundles no game assets.']
};

/* ---------- 运行时 ---------- */
let lang = 'zh';
const listeners = [];

function detect() {
  let saved = null;
  try { saved = localStorage.getItem('pglab_lang'); } catch (e) {}
  if (saved && LANGS.some(l => l.code === saved)) return saved;
  const nav = (navigator.language || 'zh').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

function t(key, vars) {
  const row = D[key];
  let s = row ? (row[langIndex()] != null ? row[langIndex()] : row[0]) : key;
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : ''));
  }
  return s;
}

function langIndex() {
  const i = LANGS.findIndex(l => l.code === lang);
  return i < 0 ? 0 : i;
}

function applyStatic(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  scope.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  scope.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPh));
  });
  scope.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
    el.setAttribute('aria-label', t(el.dataset.i18nTitle));
  });
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
}

function setLang(code, silent) {
  lang = LANGS.some(l => l.code === code) ? code : 'zh';
  try { localStorage.setItem('pglab_lang', lang); } catch (e) {}
  applyStatic();
  if (!silent) listeners.forEach(fn => fn(lang));
}

function onLangChange(fn) { listeners.push(fn); }

Object.assign(PL, {
  LANGS, t, setLang, applyStatic, onLangChange,
  getLang: () => lang,
  initLang: () => { lang = detect(); return lang; }
});
})();
