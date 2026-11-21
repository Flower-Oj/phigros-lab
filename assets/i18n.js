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
  'poster.madeBy': ['由 Phigros Lab 生成', 'Made with Phigros Lab'],
  'poster.exporting': ['生成中…', 'Rendering…'],
  'poster.done': ['B30 图片已保存', 'B30 image saved'],
  'poster.fail': ['图片生成失败：{e}', 'Image export failed: {e}'],

  /* ---------- 相对时间 ---------- */
  'time.none': ['未同步', 'not synced'],
  'time.justNow': ['刚刚', 'just now'],
  'time.min': ['{n} 分钟前', '{n}m ago'],
  'time.hour': ['{n} 小时前', '{n}h ago'],
  'time.day': ['{n} 天前', '{n}d ago']
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
