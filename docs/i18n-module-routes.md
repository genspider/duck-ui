# i18n 模块: routes.ts + CommandPalette

## routes.ts 静态英文

### PAGE_ROUTES label/description

原始 key 通过 `$t('page.' + item)` 引用（ContextPanel.svelte），item 是 camelCase 转换后的 route name。

| Route | 翻译 key | 中文 |
| -------- | --------- | ------ |
| dashboards | page.dashboards | 已存在 |
| saved-queries | page.savedQueries | 已存在 |
| history | page.history | 已存在 |
| connections | page.connections | 已存在 |
| extensions | page.extensions | 已存在 |
| live | page.liveSession | 已存在 → **需改为 page.live** |
| settings | page.settings | 缺少，需新增 |

### PAGE_SECTIONS label（settings 页面）

原始 key 通过 `$t('section.' + s.id)` 引用。

| Section | 翻译 key | 中文 |
| --------- | --------- | ------ |
| profile | section.profile | 已存在 |
| general | section.general | 已存在 |
| ai | section.ai | 已存在 |
| performance | section.performance | 已存在 |
| project | section.project | 已存在 |

### NAV_GROUPS label

原始 key 通过 `$t('nav.' + group.id)` 引用。

| Group | 翻译 key | 当前状态 |
| ------- | --------- | --------- |
| query | nav.query | 已存在 |
| library | nav.library | 已存在 |
| data | nav.data | 已存在 |
| share | nav.shareLive | 已存在但 key 是 `nav.shareLive`，引用是 `nav.sha.re`（group.id = 'share'）→ **引用 key 不对应，需要改成 nav.share** |
| settings | nav.settings | 已存在（但 context panel 和 sidebar 都引用 `nav.settings` → 实际引用的是 `$t('settings.title')`）→ **不一致** |

**关键修复：**

- Sidebar.svelte 中 group.id='share' 使用 `$t('nav.' + group.id)` 会变成 `nav.share`，所以需要新增 `nav.share` key
- `nav.shareLive` 只在 CommandPalette 中硬编码引用，已废弃

## CommandPalette 硬编码英文

### GROUP_LABEL

| 字段 | 中文 | i18n key |
| ------ | ------ | --------- |
| actions: 'Quick actions' | 快速操作 | palette.group.actions |
| pages: 'Pages' | 页面 | palette.group.pages |
| tabs: 'Open tabs' | 打开的标签页 | palette.group.tabs |
| saved: 'Saved queries' | 已保存的查询 | palette.group.saved |
| dashboards: 'Dashboards' | 仪表盘 | palette.group.dashboards |
| tables: 'Tables' | 表 | palette.group.tables |
| history: 'Recent queries' | 最近查询 | palette.group.history |

### 命令项 label 硬编码

| id | 原始 label | 中文 | i18n key |
| ---- | ----------- | ------ | --------- |
| new-query | New query | 新建查询 | palette.newQuery |
| new-notebook | New notebook | 新建笔记本 | pallete.newNotebook |
| home | Home | 首页 | palette.home |
| explorer | Toggle explorer | 切换浏览器 | palette.toggleExplorer |
| refresh | Refresh schema | 刷新结构 | palette.refreshSchema |
| theme | Switch to light/dark theme | 切换主题 | palette.toggleTheme |

### 页面命令 label（通过 PAGE_ROUTES/NAV_GROUPS 间接引用）

这些从 routes.ts 的 label/description 读进来，不是独立硬编码。routes 改好就自动好了。

### 其他硬编码文本

| 位置 | 原文 | 中文 | i18n key |
| ------ | ------ | ------ | --------- |
| 无匹配提示 | No match for "{query}" | 无匹配 | palette.noMatch |
| 底部提示 | navigate · run · close | 导航 · 执行 · 关闭 | palette.footerHint |
