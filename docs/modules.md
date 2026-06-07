# 模块清单

## 后端模块（apps/api/src/modules）

| 模块 | 路由前缀 | 说明 |
| --- | --- | --- |
| auth | `/auth` | 登录、登出、刷新令牌、验证码、个人信息与权限；含 `PermissionService`、`JwtStrategy` |
| user | `/system/user` | 用户 CRUD、重置密码、状态切换、个人中心(改资料/改密)、数据权限过滤 |
| role | `/system/role` | 角色 CRUD、菜单授权、数据范围、自定义部门 |
| menu | `/system/menu` | 菜单树 CRUD、动态路由生成 `/routes` |
| dept | `/system/dept` | 部门树 CRUD |
| post | `/system/post` | 岗位 CRUD |
| dict | `/system/dict` | 字典类型/数据 CRUD，按类型取值(带缓存) |
| config | `/system/config` | 参数配置 CRUD，按键取值 |
| notice | `/system/notice` | 通知公告 CRUD、最近公告 |
| log | `/system/log` | 操作日志、登录日志查询与删除 |
| file | `/system/file` | 文件上传(multer 磁盘存储)、列表、删除 |
| gen | `/tool/gen` | 代码生成器：表元数据 CRUD + 代码预览 |
| form | `/tool/form` | 低代码表单 schema CRUD、按编码取 schema |
| monitor | `/monitor` | 服务器指标、Redis 缓存、在线用户、强制下线 |
| job | `/monitor/job` | 定时任务 CRUD、执行一次、状态切换、执行日志、处理器列表 |
| notification | `/notification` + WS | WebSocket 网关：在线统计、广播通知、强退 |

## 前端页面（apps/web/src/pages）

| 路径 | 页面 |
| --- | --- |
| `/dashboard` | 仪表盘（统计卡片 + ECharts + 公告） |
| `/system/user` | 用户管理 |
| `/system/role` | 角色管理（菜单授权树） |
| `/system/menu` | 菜单管理（树形 + 类型/按钮权限） |
| `/system/dept` | 部门管理 |
| `/system/post` | 岗位管理 |
| `/system/dict` | 字典管理（类型 + 数据双表） |
| `/system/config` | 参数配置 |
| `/system/notice` | 通知公告（可广播） |
| `/system/file` | 文件管理（上传） |
| `/log/oper` `/log/login` | 操作/登录日志 |
| `/monitor/server` | 服务监控（CPU/内存/磁盘/Redis） |
| `/monitor/online` | 在线用户（强退） |
| `/monitor/job` | 定时任务（执行/日志） |
| `/tool/gen` | 代码生成器（字段编辑 + 代码预览） |
| `/tool/form` | 表单设计器（组件面板 + 画布 + 属性 + 实时预览） |
| `/profile` | 个人中心 |

## 按钮级权限

前端通过 `<Access perm="system:user:add">...</Access>` 控制按钮显隐；后端通过 `@RequirePermissions('system:user:add')` 校验接口。权限标识在菜单管理中以 `BUTTON` 类型维护，并通过角色授权。

## 数据模型

见 `apps/api/prisma/schema.prisma`。核心表：`sys_user`、`sys_role`、`sys_menu`、`sys_dept`、`sys_post` 及关联表，系统表 `sys_dict_*`、`sys_config`、`sys_oper_log`、`sys_login_log`、`sys_file`、`sys_notice`，高级表 `sys_job`、`sys_job_log`、`gen_table`、`sys_form_schema`。
