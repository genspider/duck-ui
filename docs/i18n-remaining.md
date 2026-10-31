# 剩余 i18n 工作跟踪

## 已完成

- routes.ts + CommandPalette
- 连接模块 (ConnectionForm/QuackAttachments/ConnectionSwitcher)
- AI 模块 (BrainResultActions/DuckBrainPanel/AISettings)
- 通用组件 (Lazy/ProfilePicker/ProfileEditor/SaveQueryDialog等~10个)
- HomeTab 首页 quickStart
- collaboration 协作全套（前端开发已做）
- zh.json: 439 → 627 keys

## 剩余按模块

### P0 - store slices toast（纯 .ts 文件，用 tr()）

文件: connectionSlice, dashboardSlice, duckBrainSlice, fileSystemSlice, quackSlice, sessionSlice, tabSlice, schemaSlice

### P0 - lib/ toast（纯 .ts 文件）

文件: urlLoaders, tableExport, fileImporter/*, projectTransfer

### P1 - charts

文件: ChartView.svelte（图表类型/聚合/排序 label 对象数组 ~20条）
文件: BoxPlotChart, HeatmapChart, PieChart（少量文本）

### P1 - dashboard

文件: DashboardsPage, AddToDashboardDialog, ShareDashboardDialog, DashboardShareLoader, DashboardTab, DashboardBlock

### P1 - workspace

文件: TableTab, SqlTab

### P1 - notebooks

文件: AddCellMenu, CellResults, NotebookCell, NotebookToolbar

### P2 - share

文件: ShareDialog, DeepLinkLoader

### P2 - folders / explorer / importer

文件: FileNode, FolderBrowser, MountedFolderNode, SchemaTree, ExplorerPanel, CsvOptionsPanel, FileImporter, etc

### P2 - layout

文件: TabBar

## 分配

- 主管：P0 两块纯 ts toast
- 前端开发：P1 全部（charts/dashboard/workspace/notebooks）
- 前端测试：每改完一批补 zh.json key + 回归验证
