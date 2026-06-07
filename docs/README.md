# nice-admin 文档索引

| 文档 | 内容 |
| --- | --- |
| [design.md](./design.md) | 整体工程设计：目标、架构、分层、鉴权、扩展点、关键决策 |
| [architecture.md](./architecture.md) | 技术栈、目录结构、数据流、认证鉴权链路、数据权限 |
| [modules.md](./modules.md) | 后端模块清单、前端页面清单、按钮级权限、数据模型 |
| [database.md](./database.md) | 多数据源 / MySQL 支持、provider 切换、跨库兼容、额外数据源扩展 |
| [tutorial.md](./tutorial.md) | 使用教程：登录、各功能操作、低代码/代码生成、二次开发速查 |
| [deployment.md](./deployment.md) | Docker 一键部署、本地开发、常见问题 |
| [extension-guide.md](./extension-guide.md) | 代码生成器、新增模块/页面/定时任务/低代码表单的完整流程 |
| [PROJECT_MEMORY.md](./PROJECT_MEMORY.md) | 工程记忆：约定、目录地图、坑位与维护要点（便于后续修改） |

## 项目概览

nice-admin 是一个企业级全栈后台管理系统，目标是：**UI/交互出色、极强扩展性、部署便捷、性能出色**。

- 全栈：React 18 + NestJS 10 + PostgreSQL + Redis，pnpm monorepo。
- 安全：JWT(access+refresh) + RBAC(用户/角色/菜单/按钮/数据权限) + 图形验证码 + 操作/登录日志。
- 体验：动态菜单与路由、面包屑、亮/暗主题、多语言 i18n、ECharts 仪表盘、WebSocket 实时通知。
- 扩展：代码生成器、低代码表单设计器、模块化后端、插件式菜单。
- 运维：系统监控、Redis 缓存监控、在线用户管理、定时任务调度。
- 部署：Docker Compose 一键拉起，Nginx 反代，自动迁移与种子数据。

## 默认账号

`admin / admin123`（可在 `.env` 中通过 `ADMIN_USERNAME / ADMIN_PASSWORD` 配置）。
