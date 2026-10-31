# i18n 国际化机制

## 技术栈

[`svelte-i18n`](https://github.com/kaisermann/svelte-i18n) — Svelte 生态的标准 i18n 库。

## 初始化

`src/lib/i18n/index.ts`:

- 固定中文，不跟随浏览器语言
- 所有翻译条目集中在一个文件：`src/lib/i18n/locales/zh.json`
- fallback 也是中文

## 两种翻译方式

### 1. `.svelte` 组件中使用 `$t()`

```svelte
<script>
  import { t } from 'svelte-i18n'
</script>

<!-- 简单文本 -->
<button>{$t('common.cancel')}</button>

<!-- 带插值变量 -->
<p>{$t('compare.description', { values: { limit: 1000 } })}</p>

<!-- 属性绑定 -->
<Input placeholder={$t('connection.type')} />
<Button title={$t('explorer.refresh')} aria-label={$t('explorer.refresh')} />

<!-- 三元表达式 -->
{isEditing ? $t('common.done') : $t('common.edit')}

<!-- 对象数组（用 $derived 保持响应式） -->
const items = $derived([
  { id: 'a', label: $t('tab.rename') },
  { id: 'b', label: $t('tab.close') },
])
```

> ⚠️ **`$t()` 只能在 `.svelte` 文件的模板或 `$derived` 表达式中使用**，因为它依赖 Svelte 的编译时处理。在 `<script>` 顶层的 `const` 或 `let` 初始化中直接用 `$t()` 会**失去响应式**（locale 变了也不更新）。

### 2. 纯 `.ts` 文件中使用 `tr()`

```typescript
import { tr } from '@/lib/i18n/translate'

// 简单 key
toast.success(tr('connection.added', { name: conn.name }))

// 无变量的 key
toast.error(tr('error.connectionFailed'))
```

`tr()` 在 `svelte-i18n` 未初始化时会安全回退到 key 本身。推荐用于：

- store/slices 中的 toast 消息
- 工具函数中的用户可见文本
- lib/ 目录下的纯逻辑文件

> ⚠️ **插值参数形式不同：`$t()` 用 `{ values: {...} }` 包装，`tr()` 用扁平 `{...}`。**
>
> ```svelte
> <!-- ✅ $t：values 包装 -->
> <p>{$t('compare.description', { values: { limit: 1000 } })}</p>
> ```
>
> ```typescript
> // ✅ tr：扁平
> toast.success(tr('connection.added', { name: conn.name }))
> ```
>
> ❌ 别在 `$t()` 里写扁平 `{ name }`——svelte-i18n 会报 `'name' does not exist in type 'Omit<MessageObject, "id">'`（因为 `$t` 的第二参被识别为 MessageObject）。也别在 `tr()` 里写 `{ values: {...} }` 包装，`tr()` 直接透传给 `get(t)(key, vars)`，包装后类型不匹配。

## 翻译文件格式

`src/lib/i18n/locales/zh.json`：

```json
{
  "common.cancel": "取消",
  "common.confirm": "确认",
  "common.save": "保存",
  "connection.type": "连接类型",
  "connection.hostUrl": "主机地址",
  "connection.hostUrl.hint": "完整 URL，包含协议 (http/https)",
  "dashboard.deleteTitle": "删除「{name}」？",
  "nav.connectionStatus": "{name}: {status}"
}
```

- 点号分隔的 key 路径，无层级嵌套（扁平 JSON）
- 变量用 `{name}` 大括号语法
- zh.json 必须有该 key，页面才显示中文；缺少则显示 key 名字符串本身

## Key 命名惯例

```
模块.具体含义[.子含义]
```

常见前缀：

| 前缀 | 模块 |
| ------ | ------ |
| `common.` | 通用（cancel/save/delete/edit/loading 等） |
| `nav.` | 导航栏、侧边栏 |
| `page.` | 页面路由标题 |
| `section.` | 设置页小节 |
| `palette.` | 命令面板 |
| `connection.` | 连接管理 |
| `quack.` | Quack 远程连接 |
| `editor.` | SQL 编辑器 |
| `result.` | 查询结果 |
| `compare.` | 结果比对 |
| `result.` | 结果数据 |
| `grid.` | 数据表格视图 |
| `explorer.` | 结构浏览器 |
| `table.` | 表详情 |
| `nav.` | 导航 |
| `chart.` | 图表 |
| `dashboard.` | 仪表盘 |
| `share.` | 分享 |
| `live.` / `liveSession.` | 实时协作 |
| `notebook.` | 笔记本 |
| `tab.` | 标签页 |
| `diff.` | 数据比对 |
| `upload.` | 文件上传 |
| `csv.` | CSV 导入选项 |
| `export.` | 导出 |
| `filter.` | 筛选 |
| `profile.` | 配置 |
| `settings.` | 设置 |
| `theme.` | 主题 |
| `ai.` | AI 设置 |
| `brain.` | Duck Brain（AI 助手） |
| `perf.` | 性能设置 |
| `ext.` | 扩展 |
| `history.` | 查询历史 |
| `saved.` | 保存的查询 |
| `params.` | 查询参数 |
| `fileImporter.` | 文件导入 |
| `folders.` | 文件系统文件夹 |
| `project.` | 项目导入导出 |
| `toast.` | toast 消息（store/slices） |
| `error.` | 错误消息 |
| `schema.` | 数据库结构 |
| `home.` | 首页 |
| `session.` | 会话 |

## 扫描工具

`scripts/dev/i18n-scan.sh`：扫描项目中未翻译的硬编码英文文本。

```bash
bash scripts/dev/i18n-scan.sh         # 扫描全部文本非常长
bash scripts/dev/i18n-scan.sh > report.txt  # 输出到文件
```

需要安装 ripgrep (`rg`)。扫描类别：

1. `title="..."` 属性
2. `description/subtitle="..."` 属性
3. `aria-label="..."` 属性
4. `placeholder="..."` 属性
5. 可见按钮/标签文本（>English<）
6. toast 消息（`toast.success/error/info/warning`）
7. 对象属性 `label: 'English'` 等
8. Svelte 三元表达式 `{cond ? 'English' : 'English'}`
9. `new Error('English')` 等
10. `{@render row('English', ...)}` 等独立文本节点

## 新增 key 的批量追加脚本

`scripts/dev/i18n-add.py`：向 zh.json 追加新 key（不覆盖已有）。

```python
# 用法：在 scripts/dev/i18n-add.py 的 new_keys 字典中添加条目后运行
python scripts/dev/i18n-add.py
```

或用行内 Python 追加少量 key：

```bash
python -c "
import json
d = json.loads(open('src/lib/i18n/locales/zh.json').read())
d['new.key'] = '翻译'
open('src/lib/i18n/locales/zh.json', 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
"
```

## 注意事项

### ⚠️ `$t()` 在 `<script>` 顶层初始化中无法响应式更新

```svelte
<!-- ❌ 错误：locale 切换后不会更新 -->
<script>
  const label = $t('common.cancel')
</script>

<!-- ✅ 正确：在模板中直接使用 $t -->
<button>{$t('common.cancel')}</button>

<!-- ✅ 正确：用 $derived 保持响应式 -->
<script>
  const items = $derived([{ label: $t('common.cancel') }])
</script>
```

### ⚠️ tsconfig 路径别名

项目使用 `@/` 指向 `src/`，在 `.ts` 文件中：

```typescript
import { tr } from '@/lib/i18n/translate'  // ✅ 推荐
import { tr } from '../../i18n/translate'   // 也可以用相对路径
```

### ⚠️ `$t()` vs `tr()` 的选择

| 场景 | 用哪个 |
| ------ | -------- |
| .svelte 模板中 | `$t()` |
| .svelte `<script>` 的 `$derived` 中 | `$t()` |
| .svelte `<script>` 的普通 `let/const` 中 | **两者皆可**，但注意响应性 |
| 纯 .ts 文件 | `tr()` |
| toast 消息 | `tr()` |
| store/slices | `tr()` |
| 工具函数 / lib | `tr()` |

### ⚠️ `import { t }` 必须加

任何使用 `$t()` 的 `.svelte` 文件都必须在 `<script>` 中 import：

```svelte
<script>
  import { t } from 'svelte-i18n'
</script>
```

否则会报 `Cannot find name '$t'`。

### 枚举/常量数组的翻译

常量数组中的 `label` 属性，如果放在模块顶层（`const` / `let`），不会随 locale 响应。需要用 `$derived`（Svelte 5）包裹：

```svelte
<script>
  const items = $derived([
    { value: 'bar', label: $t('chart.type.bar') },
    { value: 'line', label: $t('chart.type.line') },
  ])
</script>
```

### ⚠️ 开发者向的诊断错误信息保留英文

仅供开发者 / 调试看的错误消息**不翻译**，保留英文当扫描底噪。典型：

- API 兜底错误：`API error: ${status}` / `Connection failed: ${status}` 这类含状态码、内部类型名的诊断文本，多数被上游 `error.error?.message` 覆盖
- `Unknown provider type: ${type}` 等内部断言

这些消息即便显示给用户，也常作为 `{message}` 参数内嵌在**已翻译**的环绕文本里（如 `ai.connectionFailed`），翻译固定前缀的收益低于成本，故保留。翻译判断以「是否直接面向最终用户」为准：**用户会直接读的 UI 文案要翻，开发者诊断信息不翻**。

## 覆盖率检查

```bash
# 统计 zh.json key 数
python -c "import json; d=json.load(open('src/lib/i18n/locales/zh.json')); print(len(d))"

# 统计代码中 $t() 引用数
grep -roh '\$t(' src/ --include="*.svelte" | wc -l

# 统计 tr() 引用数
grep -roh 'tr(' src/ --include="*.svelte" --include="*.ts" | wc -l

# 扫描硬编码英文
bash scripts/dev/i18n-scan.sh
```
