# 数据库迁移规范（P0-5）

本项目支持 PostgreSQL / MySQL 双数据源，`schema.prisma` 的 `provider` 由 `scripts/set-db-provider.mjs` 依据 `DB_PROVIDER` 动态改写。为兼顾多 provider 与版本化迁移，约定如下。

## 两种模式

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 快速同步（推荐用于多 provider / 容器初始化） | `pnpm db:push` | `prisma db push`，按 schema 直接同步表结构，不产生迁移文件。Docker 镜像默认使用此方式。 |
| 版本化迁移（推荐用于单一 provider 的生产） | `pnpm --filter @nice-admin/api prisma:migrate` | 生成 `prisma/migrations/*` 版本文件，可审计、可回滚。 |

> 注意：Prisma 迁移文件包含具体方言 SQL，**与某个 provider 绑定**。若团队固定使用 PostgreSQL（或 MySQL），推荐走版本化迁移；若需同时支持两种数据库，使用 `db push`。

## CI 校验

`.github/workflows/ci.yml` 在 PR/Push 时执行：

1. `node scripts/set-db-provider.mjs` 固定为 `DB_PROVIDER=postgresql`；
2. `prisma validate` 校验 schema 合法性；
3. `prisma generate` 校验客户端可生成；
4. （PR）`prisma migrate diff` 比对 `prisma/migrations` 与 `schema.prisma` 是否同步，不一致则提示生成迁移；
5. lint + 构建 shared / api / web。

## 生成首个迁移（单 provider 团队）

```bash
# 确保 DB_PROVIDER 与 DATABASE_URL 指向目标库
cd apps/api
node scripts/set-db-provider.mjs
npx prisma migrate dev --name init
```

提交 `prisma/migrations/` 目录后，生产部署使用：

```bash
npx prisma migrate deploy
```

## 二期新增表/字段

二期新增：`sys_tenant`、`sys_message*`、`wf_*`、`sys_i18n`、`sys_dashboard`，以及 `sys_user.tenantId`、`sys_file.storage`。
升级已有库：执行 `pnpm db:push`（快速）或生成新迁移（版本化）。新菜单仅在空库种子时写入，已有库需在「菜单管理」手动补充或单独编写补丁脚本。
