# NOTICE · 第三方数据与商标

Phigros Lab 是非官方粉丝工具，与 Pigeon Games 无任何关联。

## 游戏内容

《Phigros》游戏本体、曲目、曲绘、谱面及相关素材的版权归 **Pigeon Games** 及各曲师、曲绘师、谱师所有。
本仓库**不包含**任何游戏资源（音频、曲绘图片、谱面文件），也不提供下载。

## data/info.csv

社区整理的 Phigros 曲目表（曲名、曲师、曲绘师、谱师、各难度定数），用于本地曲库匹配。

## data/charts.csv

由 `tools/build_charts.py` 从
[sakimidare/Phigros](https://github.com/sakimidare/Phigros) 的 `Phigros.json` 生成。

- 该仓库通过 GitHub Actions 自动抓取**萌娘百科**「Phigros/谱面信息」页面。
- 萌娘百科内容遵循 **CC BY-NC-SA 3.0**（署名-非商业性使用-相同方式共享）。
- 本仓库只取其中的 **BPM / 时长 / 物量 / 章节** 四项事实性数据，重新整理为 CSV。
- 因此 `data/charts.csv` 亦按 **CC BY-NC-SA 3.0** 使用：署名 sakimidare/Phigros 与萌娘百科，
  不得用于商业用途；转载或再分发时请保留本段说明。
- 若上游数据更新导致曲目变动，重新运行 `python tools/build_charts.py` 即可。

## 代码

本项目代码以 **MIT** 许可开源，见 `LICENSE`。
