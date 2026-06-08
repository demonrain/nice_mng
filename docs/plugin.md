# 插件机制与微前端（P2-2）

## 后端：可插拔模块

NestJS 天然以模块组织功能。二期业务模块（租户、消息、国际化、工作流、报表）已注册为「可选模块」，可通过环境变量按需启停，实现轻量特性开关：

```bash
# 禁用工作流与租户模块
DISABLED_MODULES=WorkflowModule,TenantModule
```

实现见 `apps/api/src/app.module.ts`：

```ts
const OPTIONAL_MODULES = [TenantModule, MessageModule, I18nModule, WorkflowModule, DashboardModule];
const DISABLED = (process.env.DISABLED_MODULES || '').split(',').map(s => s.trim()).filter(Boolean);
const ENABLED_OPTIONAL = OPTIONAL_MODULES.filter(m => !DISABLED.includes(m.name));
```

### 新增一个“插件模块”的约定

1. 在 `src/modules/<name>/` 下新建 `*.module.ts`（控制器 + 服务 + 模块，单文件即可）；
2. 控制器使用 `@RequirePermissions(...)` 声明权限点，`@OperLog(...)` 记录操作日志；
3. 在 `OPTIONAL_MODULES` 中登记，即可被 `DISABLED_MODULES` 控制；
4. 在种子或菜单管理中补充菜单与权限。

## 前端：微前端（Module Federation）

前端采用 Vite，推荐使用 `@module-federation/vite` 实现微前端，将子应用作为远程模块按需加载：

1. 主应用（host）在 `vite.config.ts` 配置 `federation({ remotes: { sub: 'http://sub.example.com/assets/remoteEntry.js' } })`；
2. 子应用（remote）`exposes` 暴露页面组件；
3. 动态菜单中以约定 `component` 指向远程模块（可扩展 `resolvePageComponent` 支持 `remote:sub/Page` 形式的解析）；
4. 共享依赖（react/antd）通过 `shared` 配置去重。

> 当前仓库为 monorepo 单体前端；如需拆分团队独立交付，再引入 Module Federation。`src/router/lazy-pages.ts` 的 `resolvePageComponent` 是接入远程组件的扩展点。
