# 工程记忆 PROJECT_MEMORY

> 给「未来的我 / AI 助手」看的长期记忆，便于后续修改时快速恢复上下文。改动工程时请同步更新本文件。

## 0. 用户硬性约束（务必遵守）

- ✅ 生成总结性 Markdown 文档
- ❌ 不要生成测试脚本
- ❌ 不要编译（用户自己编译）
- ❌ 不要运行（用户自己运行）
- 回复语言：简体中文

## 1. 项目定位

`nice-admin`：全栈后台管理系统模板。强调 UI/交互、极强扩展性、便捷部署、性能、多数据源。
方案选型：**React + NestJS + PostgreSQL/MySQL + Docker**，实现的是「高级版（方案 C）」全功能。

## 2. 技术栈

- Monorepo：pnpm workspace，`apps/web`(前端) + `apps/api`(后端) + `packages/shared`(共享类型/常量)。
- 前端：React18 + Vite + TS + Ant Design 5 + TailwindCSS + Zustand + TanStack Query + React Router v6 + ECharts + i18next + axios + socket.io-client。
- 后端：NestJS 10 + TS + Prisma + Redis(ioredis) + JWT(access+refresh) + class-validator + Swagger + @nestjs/schedule + socket.io + svg-captcha + systeminformation。
- 部署：Docker 多阶段构建 + docker-compose + Nginx。

## 3. 目录地图（关键文件）

```
package.json                 # 根脚本：dev/build/lint/format/db:*/docker:*
pnpm-workspace.yaml
docker-compose.yml           # PostgreSQL 版部署
docker-compose.mysql.yml     # MySQL 版部署（独立使用）
docker/api.Dockerfile        # 含 ARG DB_PROVIDER；CMD 用 prisma db push + seed
docker/web.Dockerfile
packages/shared/             # 共享类型/常量；编译到 dist(CommonJS) 供后端 require
apps/api/
  prisma/schema.prisma       # 含 DB_PROVIDER_LINE 标记 + 长文本 @db.Text
  prisma/seed.ts             # 种子：超管/角色/部门/岗位/菜单/字典/参数/公告
  scripts/set-db-provider.mjs# 按 DB_PROVIDER 改写 schema 的 provider 行
  tsconfig.json              # rootDir=src
  tsconfig.seed.json         # 单独编译 seed → dist/prisma/seed.js
  src/common/                # 守卫/拦截器/过滤器/装饰器/DTO/util
  src/modules/               # auth user role menu dept post dict config notice
                             # log file notification monitor job form gen
apps/web/
  src/router/                # lazy-pages.ts + AppRoutes.tsx 动态路由
  src/pages/                 # 页面按 component 路径懒加载
  src/components/Access.tsx  # 按钮级权限
  src/store/                 # auth/app(/menu)
docs/                        # README/design/architecture/modules/database/tutorial/deployment/extension-guide/本文件
```

## 4. 多数据源 / 数据库（本次新增重点）

- `DB_PROVIDER` 环境变量决定主库类型：`postgresql`(默认) | `mysql`。
- Prisma 不支持 env() 设 provider → `apps/api/scripts/set-db-provider.mjs` 在 generate/push/migrate 前改写 schema 里带 `DB_PROVIDER_LINE` 注释的那一行。**不要手改那一行。**
- 所有长文本字段已加 `@db.Text`（PostgreSQL/MySQL 双兼容；MySQL 普通 String=VARCHAR(191)）。
- 建表方式：容器与多 provider 场景统一用 `prisma db push`（无迁移文件、provider 无关）。固定单库生产可改用 `migrate`。
- Docker：PostgreSQL 用 `docker-compose.yml`；MySQL 用 `docker-compose.mysql.yml`（api 构建参数 `DB_PROVIDER=mysql`）。两者勿同时启动（容器名冲突）。
- 额外数据源（多库并存）方案见 `docs/database.md` 第二节（独立 schema + 独立 Client）。

## 5. 已知坑位与决策（改前必读）

1. **shared 包必须先编译**：后端运行时 require 其常量/枚举，根 build/dev 与 api.Dockerfile 已串联 `build:shared`。改 shared 后需重新构建。
2. **Nest 构建范围**：`rootDir=src`，否则 `dist/main.js` 路径会偏移；seed 走独立 `tsconfig.seed.json`。
3. **prisma 是 runtime 依赖**（不在 devDependencies），保证容器内能 `db push`。
4. **响应信封**：`{code,message,data,timestamp}`，`code=0` 成功（见 packages/shared 的 BizCode）。
5. **权限缓存**：用户/角色/菜单变更要清 `user:auth:*`（Redis）。
6. **动态路由**：新增页面 = 建 `apps/web/src/pages/<path>/index.tsx` + 菜单管理配置 component（如 `system/user/index`），无需改路由表。
7. **按钮权限**：菜单加 BUTTON(perm=`模块:业务:动作`) + 角色授权；前端 `<Access perm>`，后端 `@RequirePermissions`。
8. **MCP `寸止`/`记忆` 在当前环境不可用**：本记忆以文件形式落库于此；若日后 MCP 可用，可把要点同步进去。

## 6. 常用命令（用户自行执行）

```bash
pnpm install
pnpm db:generate && pnpm db:push && pnpm db:seed   # 初始化（按 DB_PROVIDER）
pnpm dev                                           # 前 5173 / 后 3000
docker compose up -d --build                       # PostgreSQL 部署
docker compose -f docker-compose.mysql.yml up -d --build  # MySQL 部署
```

## 7. 扩展速查

- 加后端模块：`apps/api/src/modules/<name>/` → 注册 `app.module.ts`。
- 加前端页面：`apps/web/src/pages/` + 菜单管理配置 component。
- 加定时任务：`src/modules/job/job.handlers.ts` 注册 handler + 后台配 cron。
- 加数据源：见 `docs/database.md`。
- 代码生成器/表单设计器：`系统工具` 菜单下。

## 8. 待办 / 可改进

- 暂无版本化迁移文件（用 db push）；若要 CI 严格迁移，按单一 provider 引入 `prisma/migrations`。
- 额外数据源为文档方案，未内置实际第二 Client（避免空 client 破坏构建）。
