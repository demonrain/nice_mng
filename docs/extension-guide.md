# 扩展开发指南

nice-admin 以「模块解耦 + 插件式菜单 + 代码生成」三层保证极强扩展性。新增一个业务功能通常只需以下步骤。

## 一、用代码生成器快速搭建（最快）

1. 进入 `系统工具 → 代码生成`，新增一张生成表，填写表名、实体类名(如 `Product`)、模块名(如 `business`)、业务名(如 `product`)、功能名(如 `商品`)，并编辑字段。
2. 点击「预览代码」，得到：
   - Prisma `model`
   - 后端 `dto.ts` / `service.ts` / `controller.ts`
   - 前端 `api/xxx.ts` / `XxxPage.tsx`
3. 复制生成代码到对应位置，按下文「手动新增模块」接线即可。

## 二、手动新增后端模块

以新增 `product` 为例：

1. 在 `apps/api/prisma/schema.prisma` 添加 model，执行 `pnpm db:migrate`。
2. 在 `apps/api/src/modules/product/` 下创建 `product.dto.ts`、`product.service.ts`、`product.controller.ts`、`product.module.ts`。
3. controller 用 `@RequirePermissions('business:product:list')` 等声明权限，用 `@OperLog({ title: '商品管理' })` 记录操作日志。
4. 在 `apps/api/src/app.module.ts` 的 `imports` 注册 `ProductModule`。

> 全局响应包装、异常处理、JWT 鉴权、权限校验、操作日志均由全局拦截器/守卫自动生效，新模块无需重复实现。

## 三、接入前端页面（插件式菜单）

页面无需修改路由表，路由由后端菜单动态生成：

1. 在 `apps/web/src/pages/business/product/index.tsx` 编写页面。
2. 在 `apps/web/src/api/endpoints.ts` 添加 `productApi`。
3. 进入 `系统管理 → 菜单管理`，新增一个 `MENU` 菜单，`组件路径` 填 `business/product/index`，`路由路径` 填 `/business/product`，并添加 `BUTTON` 子项维护 `business:product:add` 等权限标识。
4. 在 `角色管理` 中给角色勾选该菜单与按钮权限。重新登录或刷新即可看到菜单。

前端动态路由实现见 `apps/web/src/router/lazy-pages.ts`（`import.meta.glob` 收集 `pages/**` 并按 component 路径懒加载）与 `apps/web/src/store/menu.ts`。

## 四、新增定时任务

1. 在 `apps/api/src/modules/job/job.handlers.ts` 用 `this.register('myTask', async () => {...})` 注册处理器。
2. 进入 `系统监控 → 定时任务`，新增任务并选择该处理器、填写 cron 表达式。
3. 支持「执行一次」「暂停/运行」「查看执行日志」。

## 五、新增低代码表单

进入 `系统工具 → 表单设计器`，拖拉组件配置字段并保存。运行时可通过 `formApi.byCode(code)` 获取 schema，用 `<FormRenderer schema={schema} />` 渲染。

## 六、按钮级权限约定

权限标识统一格式 `模块:业务:动作`，例如 `system:user:add`。前端 `<Access perm="...">`，后端 `@RequirePermissions('...')`。超级管理员自动拥有全部权限。
