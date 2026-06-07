# nice-admin

企业级全栈后台管理系统。开箱即用、UI 出色、极强扩展性、一键部署、高性能。

技术栈：**React 18 + Vite + TypeScript + Ant Design 5 + TailwindCSS**（前端） / **NestJS 10 + Prisma + PostgreSQL + Redis**（后端） / **Docker Compose**（部署），pnpm monorepo 管理。

## 目录结构

```
nice-admin/
├─ apps/
│  ├─ web/            # React 前端
│  └─ api/            # NestJS 后端
├─ packages/
│  └─ shared/         # 前后端共享类型/常量
├─ docker/            # Dockerfile / nginx / 部署相关
├─ docs/              # 项目文档（架构 / 模块 / 部署 / 扩展指南）
├─ docker-compose.yml
├─ pnpm-workspace.yaml
└─ .env.example
```

## 功能特性（方案 C 高级版）

- 认证：JWT access+refresh、图形验证码、登录/登出
- RBAC：用户 / 角色 / 菜单 / 部门 / 岗位 / 按钮级权限 / 数据权限
- 系统：字典、参数配置、操作日志、登录日志、文件上传、个人中心
- 高级：代码生成器、低代码表单设计器、系统监控、定时任务调度、WebSocket 实时通知
- 体验：动态菜单与路由、面包屑、亮/暗主题、i18n 多语言、ECharts 仪表盘

## 快速开始

> 以下命令供你自行执行（本仓库不自动编译/运行）。

### 方式一：Docker 一键部署（推荐）

```bash
cp .env.example .env        # 按需修改密钥
docker compose up -d --build
# 前端: http://localhost:8080   后端文档: http://localhost:8080/api/docs
```

### 方式二：本地开发

```bash
pnpm install
cp .env.example .env        # 本地把 DATABASE_URL/REDIS_HOST 改成 localhost
pnpm db:generate            # 生成 Prisma Client
pnpm db:migrate             # 执行数据库迁移
pnpm db:seed                # 初始化超管账号与默认菜单
pnpm dev                    # 同时启动前后端
```

默认超级管理员：`admin / admin123`（见 `.env` 的 `ADMIN_USERNAME / ADMIN_PASSWORD`）。

## 文档

详见 [`docs/`](./docs)：

- [架构说明](./docs/architecture.md)
- [模块清单](./docs/modules.md)
- [部署指南](./docs/deployment.md)
- [扩展开发指南](./docs/extension-guide.md)

## 许可证

MIT
