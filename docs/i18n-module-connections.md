# i18n 模块: Connections + Quack + Common

## ConnectionForm.svelte

| 位置 | 原文 | i18n key | 中文 |
| ------ | ------ | --------- | ------ |
| Connection Type label | Connection Type | connection.type | 连接类型 |
| Start HTTP server hint | Start HTTP server in DuckDB: | connection.startServer | 在 DuckDB 中启动 HTTP 服务器： |
| Host URL label | Host URL | connection.hostUrl | 主机地址 |
| Host URL hint | Full URL including protocol (http/https) | connection.hostUrl.hint | 完整 URL，包含协议 (http/https) |
| Host placeholder | <http://localhost:9999> | connection.hostUrl.placeholder | <http://localhost:9999> |
| Database label | Database (optional) | connection.database | 数据库 (可选) |
| Database placeholder | my_database | connection.database.placeholder | my_database |
| Authentication label | Authentication | connection.authentication | 认证方式 |
| Username label | Username | connection.username | 用户名 |
| Password label | Password | connection.password | 密码 |
| API Key label | API Key | connection.apiKey | API 密钥 |
| API Key placeholder | Enter API key | connection.apiKey.placeholder | 输入 API 密钥 |
| OPFS hint | Data persists in your browser across sessions. | connection.opfsHint | 数据在浏览器中跨会话持久化保存。 |
| Database File label | Database File | connection.databaseFile | 数据库文件 |
| Database File hint | Filename for your database (e.g., data.db) | connection.databaseFile.hint | 数据库文件名 (如 data.db) |
| DB file placeholder | my_data.db | connection.databaseFile.placeholder | my_data.db |
| Connecting button | Connecting... | common.connecting | 连接中… |
| Update button | Update | common.update | 更新 |
| Connect button | Connect | common.connect | 连接 |

## ConnectionSwitcher.svelte

| 位置 | 原文 | i18n key | 中文 |
| ------ | ------ | --------- | ------ |
| Switch Connection | Switch Connection | connection.switch | 切换连接 |
| Manage Connections | Manage Connections | connection.manage | 管理连接 |

## QuackAttachments.svelte

| 原文 | i18n key | 中文 |
| ------ | --------- | ------ |
| Panel title: Remote DuckDB (Quack) | quack.title | 远程 DuckDB (Quack) |
| Panel desc: Databases on a DuckDB server... | quack.description | DuckDB 服务器上的数据库，附加到本地数据旁，一条查询可连接两者 |
| Button: Attach | quack.attach | 附加 |
| Empty: Nothing attached. Start... | quack.empty | 未附加任何数据库。使用 quack_serve 启动服务器后在此处附加。 |
| Table header: Database | quack.table.database | 数据库 |
| Table header: Host | quack.table.host | 主机 |
| Table header: Status | quack.table.status | 状态 |
| Table header: Actions | quack.table.actions | 操作 |
| Badge: Attached | quack.attached | 已连接 |
| Badge: Failed | quack.failed | 失败 |
| Sheet title: Attach remote DuckDB | quack.attachTitle | 附加远程 DuckDB |
| Sheet desc: Over Quack, DuckDB's... | quack.attachDesc | 通过 Quack，DuckDB 的客户端-服务器协议。令牌在此浏览器中加密存储。 |
| Server hint: On the server... | quack.serverHint | 在服务器端 (DuckDB 1.5.2 或更高版本)： |
| Server note: Anything beyond... | quack.httpsNote | 超出 localhost 的范围需要 HTTPS 代理，例如 nginx 或 Caddy。 |
| Label: Name | quack.name | 名称 |
| Name hint: How the database is called... | quack.nameHint | 数据库在 SQL 和资源浏览器中的名称 |
| Name placeholder: remote | quack.name.placeholder | remote |
| Label: Host | quack.host | 主机 |
| Host hint: host or host:port... | quack.hostHint | host 或 host:port，如 quack:host:port |
| Host placeholder: localhost:9494 | quack.host.placeholder | localhost:9494 |
| Label: Token | quack.token | 令牌 |
| Cancel button | common.cancel | 取消 |
| Attach button (busy) | Attaching... | quack.attaching | 附加中… |
| Attach button (idle) | Attach | quack.attach | 附加 |
| Detach dialog title: Detach database | quack.detachTitle | 分离数据库 |
| Detach dialog desc: Detach "{alias}"... | quack.detachDesc | 分离「{alias}」并忘记其令牌？数据保留在服务器上。 |
| Detach button | Detach | quack.detach | 分离 |
| Button: Invite someone else | quack.inviteAnother | 邀请其他人 |

## Common / General

| 位置 | 原文 | i18n key | 中文 |
| ------ | ------ | --------- | ------ |
| Lazy | This screen could not be loaded. | common.loadError | 此画面无法加载。 |
| Lazy button | Try again | common.tryAgain | 已存在 |
| DataTable | Actions | common.actions | 操作 |
| ConnectionsList | Name / Scope / Host / Database / Environment / Actions | connection.table.* | 名称 / 范围 / 主机 / 数据库 / 环境 / 操作 |

## EmbedFilters.svelte

| 原文 | i18n key | 中文 |
| ------ | --------- | ------ |
| Contains... | filter.contains | 包含… |
| Min (placeholder) | filter.min | 最小 |
| Max (placeholder) | filter.max | 最大 |
| Clear button | common.clear | 清除 |
| Apply button | common.apply | 应用 |
| Reset button | common.reset | 重置 |

## FilterPopover.svelte

| 原文 | i18n key | 中文 |
| ------ | --------- | ------ |
| Value (placeholder) | filter.value | 值 |
| Close (title/aria-label) | common.close | 关闭 |
| Clear button | common.clear | 清除 |
| Apply button | common.apply | 应用 |

## Share / DeepLinkLoader

| 原文 | i18n key | 中文 |
| ------ | --------- | ------ |
| Cancel | common.cancel | 取消 |
| Load only | share.loadOnly | 仅加载 |
| Not now (DashboardShareLoader) | common.notNow | 稍后 |
| Open (DashboardShareLoader) | common.open | 打开 |
