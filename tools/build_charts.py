#!/usr/bin/env python3
"""生成 data/charts.csv —— 谱面统计（BPM / 时长 / 物量）

数据来源
--------
sakimidare/Phigros（自动抓取萌娘百科 Phigros/谱面信息，每日构建）
  https://github.com/sakimidare/Phigros/blob/main/Phigros.json
内容来自萌娘百科，遵循 CC BY-NC-SA 3.0；本文件只取其中的
BPM / 时长 / 物量 / 章节 四项事实性数据，不含音频与曲绘。

用法
----
  python tools/build_charts.py                 # 从 GitHub 拉最新 Phigros.json
  python tools/build_charts.py Phigros.json    # 用本地已下载的副本

输出的 CSV 以 id 为主键（id 来自 data/info.csv），前端按 id 直接查表。
"""

import csv
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = 'https://raw.githubusercontent.com/sakimidare/Phigros/main/Phigros.json'
RANKS = ['EZ', 'HD', 'IN', 'AT']


def norm(s):
    """曲名归一：忽略大小写、空格、标点，用来把两边的曲名对上。"""
    s = unicodedata.normalize('NFKC', s or '').lower()
    return re.sub(r'[\s\W_]+', '', s)


def length_sec(t):
    m = re.match(r'^(\d+):(\d+)$', (t or '').strip())
    return int(m.group(1)) * 60 + int(m.group(2)) if m else ''


def load_src(path):
    if path:
        return json.load(io.open(path, encoding='utf-8'))
    with urllib.request.urlopen(SRC, timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def main():
    src = load_src(sys.argv[1] if len(sys.argv) > 1 else None)
    by_norm = {norm(k): v for k, v in src.items()}

    info = list(csv.DictReader(
        io.open(os.path.join(ROOT, 'data', 'info.csv'), encoding='utf-8'), delimiter='\t'))

    rows, miss = [], []
    for r in info:
        d = by_norm.get(norm(r['song']))
        if not d:
            miss.append(r['song'])
            continue
        ch = d.get('chart') or {}

        def combo(rk):
            v = str((ch.get(rk) or {}).get('combo') or '').replace(',', '').strip()
            return v if v.isdigit() else ''

        rows.append([
            r['id'],
            str(d.get('bpm') or '').strip(),
            length_sec(d.get('length')),
            str(d.get('chapter') or '').strip(),
        ] + [combo(rk) for rk in RANKS])

    out = os.path.join(ROOT, 'data', 'charts.csv')
    with io.open(out, 'w', encoding='utf-8', newline='\n') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['id', 'bpm', 'len', 'chapter'] + RANKS)
        w.writerows(rows)

    print('曲库 %d 首，匹配到谱面统计 %d 首，未收录 %d 首' % (len(info), len(rows), len(miss)))
    if miss:
        print('未收录：' + '、'.join(miss[:20]) + ('…' if len(miss) > 20 else ''))
    print('已写出 ' + out + '（%d 字节）' % os.path.getsize(out))


if __name__ == '__main__':
    main()
