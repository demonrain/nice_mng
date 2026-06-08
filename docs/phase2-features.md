# 二期功能说明（Phase 2）

本文档汇总二期实现的全部功能、数据模型、接口与使用方式。二期分支：`feature/phase2`。

> 提示：二期新增了多张数据表与字段，部署前请先执行 `pnpm db:generate` 与 `pnpm db:push`（或迁移），并重新执行种子以注册新菜单（仅空库生效，已有库需手动补菜单）。

## 模块总览

| 编号 | 模块 | 后端路径 | 前端菜单 | 状态 |
| --- | --- | --- | --- | --- |
| P0-1~5 | 安全基线 / 迁移规范 | `modules/auth`、CI | 个人中心 | ✅ |
| P1-1 | 多租户 | `modules/tenant` + `common/tenant` | 系统管理→租户管理 | ✅ |
| P1-2 | 工作流 | `modules/workflow` | 工作流程 | ✅ |
| P1-3 | 消息中心 | `modules/message` | 系统管理→消息中心 | ✅ |
| P1-4 | 文件存储抽象 | `modules/file/storage.service.ts` | 系统管理→文件管理 | ✅ |
| P1-5 | 国际化运营 | `modules/i18n` | 系统管理→国际化 | ✅ |
| P1-6 | 数据导入导出 | `common/utils/excel.util.ts` | 用户管理→导入/导出 | ✅ |
| P2-1 | 可观测性 | `modules/observability` | `/metrics` | ✅ |
| P2-2 | 插件/模块开关 | `app.module.ts` | — | ✅ |
| P2-3 | 代码生成落盘 | `modules/gen` | 系统工具→代码生成 | ✅ |
| P2-4 | OpenAPI / SDK | `scripts/gen-sdk.mjs` | — | ✅ |
| P2-5 | BI 报表 | `modules/dashboard` | 数据报表 / 数据大屏 | ✅ |
| P2-6 | 主题与布局增强 | `layout/SettingsDrawer` | 顶部齿轮 | ✅ |

---

## P1-1 多租户

- 模型：`sys_tenant`；`sys_user.tenantId` 关联租户。
- 上下文：`common/tenant/tenant.context.ts` 基于 `AsyncLocalStorage`，`TenantInterceptor` 将登录用户的 `tenantId` 注入上下文。
- 行级隔离：业务表在查询时拼接 `tenantWhere()` 即可按当前租户过滤（超管/未启用时不过滤）。
- 启用：`TENANT_ENABLED=true`。
- 管理接口：`/api/system/tenant`（list/add/edit/delete）。

> 设计取舍：未强制为所有历史表加 `tenantId`（避免破坏既有逻辑）。新业务表建议加 `tenantId Int?` 并在 service 中使用 `tenantWhere()`。

## P1-2 工作流

- 模型：`wf_def`（流程定义，`nodes` 为节点 JSON）、`wf_instance`（实例）、`wf_task`（任务）。
- 节点格式：`[{ "key":"lead","name":"主管审批","assigneeId":1 }, ...]`，顺序审批。
- 接口：
  - 定义：`/api/workflow/def`
  - 发起：`POST /api/workflow/start` `{ defCode, title, formData, businessKey }`
  - 我的待办：`GET /api/workflow/task/mine`
  - 审批：`POST /api/workflow/task/:id/act` `{ approve, comment }`
  - 实例：`GET /api/workflow/instance`、`/instance/:id`
- 审批流转：通过→下一个节点/结束；驳回→实例 REJECTED。每步通过 WebSocket 通知相关人。

## P1-3 消息中心

- 模型：`sys_message_template`（模板，支持 `{{var}}`）、`sys_message`、`sys_message_receipt`（站内信回执）。
- 通道：`INTERNAL`（站内信+WS 实时推送）、`EMAIL`（nodemailer）、`WEBHOOK`（fetch）、`SMS`（预留）。未配置通道安全降级。
- 接口：
  - 模板：`/api/system/message/template`
  - 发送：`POST /api/system/message/send` `{ title|templateCode, content, channel, userIds[] }`（userIds 为空=全员）
  - 收件箱：`GET /api/system/message/mine`、未读 `GET /unread`、已读 `PUT /read/:id`、全部已读 `PUT /read-all`
- 前端：顶栏铃铛实时展示未读与消息列表。

## P1-4 文件存储抽象

- `StorageService` 按 `STORAGE_DRIVER` 选择适配器：`local`（默认，已实现）、`oss/s3/minio`（占位，接入 SDK 后实现 `persist`）。
- `sys_file.storage` 记录文件所在存储后端。
- 扩展：在 `storage.service.ts` 的 `ObjectStorageAdapter.persist` 中读取 `file.path` 上传到对象存储并返回 URL。

## P1-5 国际化运营

- 模型：`sys_i18n`（`lang + namespace + key` 唯一）。
- 接口：CRUD `/api/system/i18n`；动态资源 `GET /api/system/i18n/resources?lang=zh`（公开）；语言列表 `/langs`。
- 前端：`loadRemoteI18n(lang)` 在切换语言时合并后端词条到 i18next（失败降级到内置词条）。

## P1-6 数据导入导出

- 通用工具：`common/utils/excel.util.ts`（`exportToExcel` / `buildTemplate` / `parseExcel` 必填校验+错误行回显）。
- 用户模块示例：
  - 导出：`GET /api/system/user/export`
  - 模板：`GET /api/system/user/import/template`
  - 导入：`POST /api/system/user/import`（multipart，默认初始密码 123456）

## P2-1 可观测性

- 结构化日志：`common/logger/json.logger.ts`，生产环境（`NODE_ENV=production`）输出单行 JSON，便于 ELK/Loki 采集。
- 指标：`prom-client`，`GET /api/metrics`（Prometheus 文本格式，公开，建议网关/白名单保护），含默认进程指标 + HTTP 请求计数/耗时直方图。
- 概览：`GET /api/monitor/metrics/summary`（健康看板用）。

## P2-2 插件 / 模块开关

- 二期业务模块可通过 `DISABLED_MODULES=TenantModule,WorkflowModule` 按需禁用（见 `app.module.ts`）。
- 微前端方案见 [plugin.md](./plugin.md)。

## P2-3 代码生成落盘

- `POST /api/tool/gen/:id/generate` 将生成代码写入工程 `generated/<module>_<business>/` 目录。
- 出于安全不自动覆盖 `src` 与自动注册路由，由开发者复制并接线（见扩展指南）。

## P2-4 OpenAPI / SDK

- 非生产启动时自动导出 `apps/api/openapi.json`，并提供 Swagger JSON：`/api/docs-json`。
- 生成轻量 TS SDK：`pnpm --filter @nice-admin/api gen:sdk` → 产物 `packages/shared/src/sdk.generated.ts`。

## P2-5 BI 报表

- 模型：`sys_dashboard`（`layout` 为组件卡片 JSON，支持 `isDefault`）。
- 配置：系统管理→数据报表（CRUD）。
- 展示：数据大屏（`/bi`）渲染默认仪表盘，支持 `stat/line/bar/pie` 组件。
- 默认配置接口（登录可用）：`GET /api/system/dashboard/default`。

## P2-6 主题与布局增强

- 顶栏齿轮打开「系统设置」抽屉：暗黑模式、主题色预设、导航布局（侧边/顶部/混合）、紧凑模式。
- 偏好持久化在 `nice-admin-app`（zustand persist）。
