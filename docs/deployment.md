# 部署指南

> 本仓库不自动编译/运行，以下命令供你自行执行。

## 一、Docker 一键部署（推荐）

前置：已安装 Docker 与 Docker Compose。

```bash
# 1. 准备环境变量
cp .env.example .env
# 编辑 .env，至少修改：POSTGRES_PASSWORD、JWT_ACCESS_SECRET、JWT_REFRESH_SECRET、ADMIN_PASSWORD

# 2. 构建并启动（首次会自动迁移数据库 + 写入种子数据）
docker compose up -d --build

# 3. 查看状态/日志
docker compose ps
docker compose logs -f api
```

访问：

- 前端：`http://localhost:8080`
- 接口文档(Swagger)：`http://localhost:8080/api/docs`
- 默认账号：`admin / admin123`（由 `.env` 的 `ADMIN_USERNAME/ADMIN_PASSWORD` 决定）

停止 / 清理：

```bash
docker compose down            # 停止
docker compose down -v         # 停止并删除数据卷（会清空数据库）
```

### 组件说明

| 服务 | 镜像 | 端口 | 说明 |
| --- | --- | --- | --- |
| web | nginx:1.27-alpine | 8080→80 | 托管前端静态资源，反代 `/api` 与 `/socket.io` 到 api |
| api | node:20-alpine | 内部 3000 | NestJS 服务，启动时执行 `prisma db push` 建表 + seed |
| postgres | postgres:16-alpine | 内部 5432 | 数据库，数据卷 `docker/volumes/pgdata` |
| redis | redis:7-alpine | 内部 6379 | 缓存/验证码/权限缓存，数据卷 `docker/volumes/redisdata` |

### 使用 MySQL 部署

改用内置 mysql:8.0 的 compose 文件即可（详见 [database.md](./database.md)）：

```bash
docker compose -f docker-compose.mysql.yml up -d --build
```

> 两个 compose 文件不要同时启动（容器名冲突）。

## 二、本地开发

前置：Node ≥ 18.18、pnpm 9、本地或远程的 PostgreSQL 与 Redis。

```bash
# 1. 安装依赖
pnpm install

# 2. 环境变量（把 DATABASE_URL / REDIS_HOST 指向本机）
cp .env.example .env
# DATABASE_URL=postgresql://nice:nice_pwd_change_me@localhost:5432/nice_admin?schema=public
# REDIS_HOST=localhost

# 3. 数据库初始化（PostgreSQL 默认；切 MySQL 见 docs/database.md）
pnpm db:generate     # 生成 Prisma Client（按 DB_PROVIDER 自动写入 provider）
pnpm db:push         # 按 schema 建表（多 provider 推荐；或用 pnpm db:migrate）
pnpm db:seed         # 写入超管账号 + 默认菜单/字典

# 4. 启动（前端 5173 / 后端 3000）
pnpm dev             # 同时启动
# 或分别启动
pnpm dev:api
pnpm dev:web
```

前端开发服务器已配置代理：`/api`、`/socket.io`、`/uploads` 转发到 `http://localhost:3000`。

## 三、常见问题

- **数据库连接失败**：确认 `DATABASE_URL` 与 PostgreSQL 实际地址一致；容器内用服务名 `postgres`，本机用 `localhost`。
- **验证码不显示**：确认 Redis 可用（验证码存于 Redis）。若不需要验证码，登录时不传 `captchaId` 即可跳过。
- **WebSocket 不通**：检查 nginx 的 `/socket.io/` 反代配置与 token 是否有效。
- **表未创建**：容器启动命令包含 `prisma db push`；本地需手动执行 `pnpm db:push`（或 `pnpm db:migrate`）。
- **想换成 MySQL**：设 `DB_PROVIDER=mysql` 与对应 `DATABASE_URL`，重新 `pnpm db:generate && pnpm db:push`；Docker 用 `docker-compose.mysql.yml`。详见 [database.md](./database.md)。
