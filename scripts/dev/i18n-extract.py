#!/usr/bin/env python3
"""
扫描 .svelte 文件中的硬编码英文 UI 文本，自动生成 zh.json 条目建议。
增量更新：已存在的翻译值不会重复生成，避免重复劳动。

用法:
  cd studio && python3 scripts/dev/i18n-extract.py

输出:
  scripts/dev/i18n-suggested.json  — 新增翻译建议（人工审查后合并到 zh.json）
  scripts/dev/i18n-report.txt      — 扫描报告（按文件列出未翻译文本）
"""
import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
SRC_DIR = PROJECT_ROOT / "src"
ZH_PATH = PROJECT_ROOT / "src/lib/i18n/locales/zh.json"
OUT_DIR = Path(__file__).parent

# 忽略的模式（保留英文的）
SKIP_RE = [re.compile(p, re.I) for p in [
    r'^https?://',
    r'^SQL\b', r'^SELECT\b', r'^FROM\b', r'^WHERE\b',
    r'^CREATE\b', r'^INSERT\b', r'^DELETE\b', r'^UPDATE\b',
    r'^DROP\b', r'^SHOW\b', r'^DESCRIBE\b', r'^EXPLAIN\b',
    r'^COPY\b', r'^ATTACH\b', r'^LOAD\b', r'^INSTALL\b',
    r'^PRAGMA\b', r'^ DuckDB\b', r'^WASM\b', r'^OPFS\b',
    r'^API\b', r'^URL\b', r'^CSV\b', r'^JSON\b', r'^Parquet\b',
    r'^Markdown\b', r'^Python\b', r'^Pyodide\b', r'^WebLLM\b',
    r'^AI\b', r'^Ollama\b', r'^OpenAI\b', r'^Anthropic\b',
    r'^GPT\b', r'^DuckLake\b', r'^HTTP\b', r'^HTTPS\b',
    r'^CORS\b', r'^DOM\b', r'^UI\b', r'^CSS\b', r'^HTML\b',
    r'^TCP\b', r'^MB\b', r'^GB\b', r'^KB\b', r'^px\b',
    r'^ms\b', r'^npm\b', r'^MIT\b', r'^Apache',
    r'^GitHub', r'^GitLab', r'^Docker',
    r'^S3\b', r'^GCS\b', r'^Azure\b', r'^R2\b', r'^MinIO\b',
    r'^OSM\b', r'^EPSG:\d+', r'^ST_\w+', r'^\d+$',
    r'^[A-Z]{2,}$', r'^[a-z]+://', r'\$\w+',
    r'^true$', r'^false$', r'^null$', r'^undefined$',
    r'^[\d\s\W]+$',  # 纯符号/数字
]]

def should_skip(text: str) -> bool:
    t = text.strip()
    if len(t) < 2:
        return True
    for r in SKIP_RE:
        if r.match(t):
            return True
    return bool(not re.search(r'[a-zA-Z]{2,}', t))

def extract_from_svelte(filepath: Path):
    text = filepath.read_text(encoding='utf-8')
    finds = []
    for m in re.finditer(r'>([^<]{2,80})<', text):
        t = m.group(1).strip()
        if not should_skip(t):
            finds.append((m.start(), 'text', t))
    for m in re.finditer(r'placeholder="([^"]{2,60})"', text):
        t = m.group(1)
        if not should_skip(t):
            finds.append((m.start(), 'placeholder', t))
    for m in re.finditer(r'title="([^"$]{2,60})"', text):
        t = m.group(1)
        if not should_skip(t):
            finds.append((m.start(), 'title', t))
    for m in re.finditer(r'description="([^"]{2,120})"', text):
        t = m.group(1)
        if not should_skip(t):
            finds.append((m.start(), 'desc', t))
    for m in re.finditer(r'label="([^"]{2,40})"', text):
        t = m.group(1)
        if not should_skip(t):
            finds.append((m.start(), 'label', t))
    for m in re.finditer(r'aria-label="([^"]{2,60})"', text):
        t = m.group(1)
        if not should_skip(t):
            finds.append((m.start(), 'aria', t))
    return finds

def main():
    if not ZH_PATH.exists():
        print(f"❌ zh.json 不存在: {ZH_PATH}")
        sys.exit(1)

    with open(ZH_PATH, encoding='utf-8') as f:
        zh = json.load(f)
    existing_values = set(zh.values())

    svelte_files = sorted(SRC_DIR.rglob("*.svelte"))
    print(f"扫描 {len(svelte_files)} 个 .svelte 文件...")

    all_finds = []
    for fp in svelte_files:
        rel = str(fp.relative_to(PROJECT_ROOT))
        finds = extract_from_svelte(fp)
        for _pos, typ, text in finds:
            all_finds.append((rel, typ, text))

    seen = set()
    unique = []
    for f, t, txt in all_finds:
        key = (f, t, txt)
        if key not in seen:
            seen.add(key)
            unique.append((f, t, txt))

    new_items = [(f, t, txt) for f, t, txt in unique if txt not in existing_values]

    # 生成报告
    report_lines = [f"发现 {len(unique)} 处硬编码英文，其中 {len(new_items)} 处尚未翻译", "=" * 60]
    by_file = {}
    for f, t, txt in new_items:
        by_file.setdefault(f, []).append((t, txt))
    for f in sorted(by_file):
        report_lines.append(f"\n📄 {f}")
        for t, txt in by_file[f]:
            report_lines.append(f"   [{t}] {txt[:60]}")

    report_path = OUT_DIR / "i18n-report.txt"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
    print(f"✓ 报告保存到: {report_path}")

    # 生成建议（增量：只包含真正新的）
    suggested = {}
    count = 0
    for f, t, txt in new_items:
        if txt in existing_values:
            continue
        safe = re.sub(r'[^a-zA-Z0-9]', '_', txt[:20].lower()).strip('_')
        key = f"auto.{t}.{safe}_{count}"
        suggested[key] = txt
        count += 1

    suggested_path = OUT_DIR / "i18n-suggested.json"
    with open(suggested_path, 'w') as f:
        json.dump(suggested, f, ensure_ascii=False, indent=2)
    print(f"✓ 新增翻译建议保存到: {suggested_path} ({len(suggested)} 条)")

if __name__ == "__main__":
    main()
