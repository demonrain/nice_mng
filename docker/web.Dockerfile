# ============ 构建阶段 ============
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9.1.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile=false

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# 生产构建：API 通过 nginx 反代到 /api
ENV VITE_API_BASE_URL=/api
ENV VITE_WS_URL=/socket.io
RUN pnpm --filter @nice-admin/web build

# ============ 运行阶段 ============
FROM nginx:1.27-alpine AS runner
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
