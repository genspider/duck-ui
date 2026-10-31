#!/usr/bin/env bash
# i18n-scan.sh — 扫描项目中未做 i18n 转换的硬编码英文文本
# 用法: ./i18n-scan.sh [src目录路径] [rg排除参数...]
# 依赖: rg (ripgrep)
set -e

SRC="${1:-src}"
shift 2>/dev/null || true

EXCLUDE=(
  --glob '!node_modules/**'
  --glob '!dist/**'
  --glob '!*__tests__*'
  --glob '!*.test.*'
  --glob '!*.spec.*'
)
for arg in "$@"; do EXCLUDE+=("$arg"); done

RG=(-n "${EXCLUDE[@]}")
count_all=0

section()  { echo; echo "━━━ $1 ━━━"; }
count_out() {
  local c
  c=$(echo "$1" | sed -n '/^$/!p' | wc -l 2>/dev/null)
  c=${c:-0}
  count_all=$((count_all + c))
  echo "   → $c 处"
}

echo "========================================"
echo " i18n 硬编码文本扫描报告"
echo " 扫描路径: $SRC"
echo " 时间: $(date '+%Y-%m-%d %H:%M')"
echo "========================================"

# ── 1. title 属性 ──
section "1. title 属性"
r=$(rg "${RG[@]}" 'title="[A-Za-z][^"]*"' "$SRC" | grep -v '\$t\|tr(' || true)
echo "$r"; count_out "$r"

# ── 2. description / subtitle 属性 ──
section "2. description / subtitle 属性"
r=$(rg "${RG[@]}" '(description|subtitle)="[A-Za-z][^"]{3,}"' "$SRC" | grep -v '\$t\|tr(' || true)
echo "$r"; count_out "$r"

# ── 3. aria-label 属性 ──
section "3. aria-label 属性"
r=$(rg "${RG[@]}" 'aria-label="[A-Za-z][^"]*"' "$SRC" | grep -v '\$t\|tr(' || true)
echo "$r"; count_out "$r"

# ── 4. placeholder 属性 ──
section "4. placeholder 属性"
r=$(rg "${RG[@]}" 'placeholder="[A-Za-z][^"]*"' "$SRC" | grep -v '\$t\|tr(' || true)
echo "$r"; count_out "$r"

# ── 5. >可见按钮/标签文本< ──
section "5. >可见按钮/标签文本<"
r=$(rg "${RG[@]}" -g '*.svelte' '>[A-Z][a-zA-Z0-9 .,:;!?()/-]{3,80}<' "$SRC" \
    | grep -v '\$t\|{#\|{:\|data-\|loading=' || true)
echo "$r"; count_out "$r"

# ── 6. toast 消息 ──
section "6. toast 消息"
r=$(rg "${RG[@]}" -g '*.ts' -g '*.svelte.ts' 'toast\.(success|error|warning|info)\("[A-Z]' "$SRC" | grep -v '\$t\|tr(' || true)
echo "$r"; count_out "$r"

# ── 7. 模板字面量 ──
section "7. 模板字面量 \`...\${...}\` 中的英文"
r=$(rg "${RG[@]}" -g '*.svelte' -g '*.ts' '\`[A-Z][a-zA-Z .,:;!?()/-]{3,}\$\{' "$SRC" | grep -v '\$t\|tr(' || true)
echo "$r"; count_out "$r"

# ── 8. 对象属性 title/label/description/name/rows/source ──
section "8. 对象属性中的硬编码英文（单/双引号）"
r=$(rg "${RG[@]}" -g '*.svelte' -g '*.ts' '(title|label|description|name|rows|source): "[A-Z][^"]{2,}"' "$SRC" \
    | grep -v '\$t\|tr(\|import \|from \|require \|export \|// ' || true)
echo "$r"; count_out "$r"
r=$(rg "${RG[@]}" -g '*.svelte' -g '*.ts' "(title|label|description|name|rows|source): '[A-Z][^']{2,}'" "$SRC" \
    | grep -v '\$t\|tr(\|import \|from \|require \|export \|// ' || true)
echo "$r"; count_out "$r"

# ── 9. Svelte 三元表达式 ──
section "9. Svelte 三元/条件表达式中的英文"
r=$(rg "${RG[@]}" -g '*.svelte' "\{[^}]*'[A-Z][a-zA-Z .,:;!?()/-]{3,80}'[^}]*\}" "$SRC" | grep -v '\$t\|tr(' || true)
echo "$r"; count_out "$r"

# ── 10. new Error ──
section "10. new Error('\''英文'\'')"
r=$(rg "${RG[@]}" -g '*.ts' -g '*.svelte' "new Error\('[A-Z][^']{3,}" "$SRC" | grep -v '\$t\|tr(' || true)
echo "$r"; count_out "$r"

# ── 11. 独立行英文文本（跨行文本节点） ──
section "11. 独立行英文文本（跨行文本节点）"
r=$(rg "${RG[@]}" -g '*.svelte' '^[[:space:]]+[A-Z][a-zA-Z .,:;!?()/:;'\''"-]{10,}' "$SRC" \
    | grep -v '\$t\|{#\|{:\|{/\|@html\|class="\|href="\|src="\|type="\|role="\|style="\|rel="\|id="\|name="\|value="\|alt="\|for="\|data-\|loading=\|// ' || true)
echo "$r"; count_out "$r"

# ── 12. 别名 toast 函数: success('...') / error('...') / toastError('...') ──
section "12. 别名 toast 函数（success/error/warning/info/toastError）"
r=$(rg "${RG[@]}" -g '*.svelte' -g '*.ts' -P '(?:^|[^a-zA-Z.])(?:success|error|warning|info|toastError)\s*\(\s*['\"][A-Z][^'\"]{3,}' "$SRC" \
    | grep -v '\$t\|tr(\|toast\.\|console\.\|JSON\.\|import \|from \|// ' || true)
echo "$r"; count_out "$r"

echo
echo "========================================"
echo " 扫描完成 · 共 $count_all 处可疑位置"
echo "========================================"
echo " 提示: 保存报告 → ../scripts/dev/i18n-scan.sh > report.txt"
echo "========================================"
