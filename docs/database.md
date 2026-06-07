# 数据库与多数据源指南

nice-admin 通过 Prisma 访问数据库，**主数据源支持在 PostgreSQL 与 MySQL 之间切换**，并提供添加额外数据源（多数据源）的扩展方案。

## 一、主数据源：PostgreSQL / MySQL 切换

### 原理

Prisma 的 `datasource.provider` 不能用 `env()` 动态设置，因此项目用脚本 `apps/api/scripts/set-db-provider.mjs` 在 `generate / push / migrate` 前，根据环境变量 `DB_PROVIDER` 自动改写 `schema.prisma` 中带 `DB_PROVIDER_LINE` 标记的那一行。

所有 Prisma 脚本已串联该步骤，无需手动执行：

```jsonc
"prisma:generate": "node scripts/set-db-provider.mjs && prisma generate",
"prisma:push":     "node scripts/set-db-provider.mjs && prisma db push",
"prisma:migrate":  "node scripts/set-db-provider.mjs && prisma migrate dev",
```

> 应用层代码与 Prisma Client API 在两种数据库下完全一致，业务代码无需改动。

### 跨库兼容已做的处理

- 所有长文本字段统一标注 `@db.Text`（MySQL 下普通 `String` 默认 `VARCHAR(191)`，长内容会被截断/报错；`@db.Text` 在 PostgreSQL 与 MySQL 均有效）。
- 未使用数据库特有类型/枚举，状态等用 `Int`/`String` 表示，保证可移植。

### 本地切换到 MySQL

```bash
# 1. 设置环境变量（.env）
DB_PROVIDER=mysql
DATABASE_URL=mysql://nice:nice_pwd_change_me@localhost:3306/nice_admin

# 2. 生成 client 并建表
pnpm db:generate
pnpm db:push        # 多 provider 场景推荐用 db push（按 schema 建表，免迁移文件）
pnpm db:seed

# 3. 启动
pnpm dev
```

切回 PostgreSQL：把 `DB_PROVIDER=postgresql` 与 `DATABASE_URL=postgresql://...` 改回，重新 `db:generate && db:push` 即可。

### Docker 部署到 MySQL

使用独立的 compose 文件（内置 mysql:8.0 服务，并把 api 的构建参数 `DB_PROVIDER=mysql`）：

```bash
cp .env.example .env   # 配置 MYSQL_* 变量
docker compose -f docker-compose.mysql.yml up -d --build
```

PostgreSQL 部署仍用默认 `docker-compose.yml`。

> 注意：两个 compose 文件不要同时启动（容器名相同会冲突）。

### push vs migrate

| 方式 | 命令 | 适用 |
| --- | --- | --- |
| `db push` | `pnpm db:push` | 多 provider / 快速原型；按 schema 直接建表，不产生迁移文件（容器启动默认用此方式） |
| `migrate` | `pnpm db:migrate` | 固定单一 provider 的生产环境；生成版本化迁移文件。注意迁移文件是 provider 特定的，切换数据库需重建迁移 |

## 二、扩展：接入额外数据源（多数据源）

当需要同时连接「主库 + 另一个外部库」（如对接遗留系统、读写分离的只读库、数据仓库）时，可新增一个独立的 Prisma Client。

### 步骤

1. **新建第二套 schema**：`apps/api/prisma/secondary/schema.prisma`，自定义其 `generator`（指定独立输出目录）与 `datasource`（独立 `env("SECONDARY_DATABASE_URL")`）：

   ```prisma
   generator client {
     provider = "prisma-client-js"
     output   = "../../node_modules/.prisma/secondary"
   }
   datasource db {
     provider = "mysql"
     url      = env("SECONDARY_DATABASE_URL")
   }
   model LegacyOrder { /* ... */ }
   ```

2. **生成第二个 client**：

   ```bash
   pnpm --filter @nice-admin/api exec prisma generate --schema prisma/secondary/schema.prisma
   ```

3. **封装 NestJS 服务**（参考 `src/prisma/prisma.service.ts`）：

   ```ts
   import { PrismaClient } from '.prisma/secondary';
   @Injectable()
   export class SecondaryPrismaService extends PrismaClient implements OnModuleInit {
     async onModuleInit() { await this.$connect(); }
   }
   ```

   在对应模块的 `providers` 注册并注入使用即可。

4. **环境变量**：在 `.env` 增加 `SECONDARY_DATABASE_URL=...`。

> 这样主库与外部库相互独立、互不影响；主库仍可在 PostgreSQL/MySQL 间切换。

### 进阶：读写分离

若只需主库的读写分离，可用 Prisma 的 `$extends` 或在 `PrismaService` 内维护读/写两个 client 并按操作路由；本项目预留了集中式 `PrismaService`，扩展时只改这一处即可。

## 三、常见问题

- **切换 provider 后报类型/迁移错误**：先 `pnpm db:generate` 重新生成 client，再 `pnpm db:push`。
- **MySQL 中文乱码**：确保库为 `utf8mb4`（compose 已配置 `--character-set-server=utf8mb4`）。
- **MySQL 报 VARCHAR 过长**：检查新增的长文本字段是否加了 `@db.Text`。
