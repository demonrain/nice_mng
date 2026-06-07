# ============ 构建阶段 ============
FROM node:20-alpine AS builder
WORKDIR /app

# 数据库类型：postgresql(默认) | mysql，在生成 Prisma Client 前写入 schema
ARG DB_PROVIDER=postgresql
ENV DB_PROVIDER=${DB_PROVIDER}

RUN npm install -g pnpm@9.1.0

# 仅复制依赖清单以利用缓存
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile=false

# 复制源码
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# 构建共享包 + 生成 Prisma Client + 构建 API
RUN pnpm --filter @nice-admin/shared build \
  && pnpm --filter @nice-admin/api prisma:generate \
  && pnpm --filter @nice-admin/api build

# 仅保留生产依赖
RUN pnpm --filter @nice-admin/api deploy --prod /app/deploy

# ============ 运行阶段 ============
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache tini

COPY --from=builder /app/deploy/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json
# Prisma 引擎
COPY --from=builder /app/apps/api/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
# 启动前：用 db push 按 schema 建表（provider 无关，适合多数据库切换）+ 种子，再拉起服务
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/prisma/seed.js || true; node dist/main.js"]
