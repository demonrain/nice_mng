# 安全基线（P0）

二期首批落地的安全能力，覆盖登录防护、二次验证、密码与会话策略、接口限流。所有阈值均可通过环境变量配置（见 `.env.example` 的「安全」段）。

## 1. 接口限流

- 装饰器：`@RateLimit({ limit, windowSec, keyBy })`，`keyBy ∈ ip | user | ip-user`。
- 守卫：`RateLimitGuard`（全局 `APP_GUARD`，最先执行），基于 Redis 计数器，超限返回 HTTP 429。
- 已对敏感接口限流：登录(10/60s, ip-user)、MFA 登录(10/60s)、验证码(30/60s)、刷新(30/60s)、MFA 管理(10/60s, user)。
- 全局兜底：`SEC_RATE_LIMIT_DEFAULT`>0 时对未显式标注的接口也限流（默认 0=关闭）。

实现：`common/decorators/rate-limit.decorator.ts`、`common/guards/rate-limit.guard.ts`。

## 2. 登录失败锁定 + 异地检测

- 失败计数 `login:fail:{username}`（窗口 `SEC_LOGIN_FAIL_WINDOW_MIN` 分钟）。
- 达到 `SEC_LOGIN_MAX_FAIL` 次 → 写锁 `login:lock:{username}`，锁定 `SEC_LOGIN_LOCK_MIN` 分钟；登录成功清空计数与锁。
- 异地检测：本次 IP 与 `user.lastLoginIp` 不一致时，登录日志标注「异地登录提醒」。
- 全程写入 `sys_login_log`（含失败原因 / 锁定提示 / 异地提示）。

实现：`modules/auth/auth.service.ts`。

## 3. 二次验证 MFA（TOTP）

- 算法：TOTP（otplib），兼容 Google / Microsoft Authenticator；绑定时生成二维码（qrcode dataURL）。
- 备用码：启用时生成 8 个一次性备用码（bcrypt 哈希存储，明文仅展示一次）；验证时 TOTP 或备用码均可，备用码命中后消费删除。
- 接口：
  - `POST /auth/mfa/setup` 生成密钥+二维码（绑定第一步）
  - `POST /auth/mfa/enable` 校验验证码并启用，返回备用码
  - `POST /auth/mfa/disable` 校验后关闭
  - `GET /auth/mfa/status` 查询状态
- 登录两步流程：
  1. `POST /auth/login` 密码校验通过且已开启 MFA → 返回 `{ mfaRequired: true, mfaToken }`（短期挑战令牌，`SEC_MFA_CHALLENGE_EXPIRES`）。
  2. `POST /auth/login/mfa` 提交 `{ mfaToken, code }` → 校验通过签发正式令牌。

实现：`modules/auth/mfa.service.ts`；前端：登录页二步、个人中心「二次验证」页签。

## 4. 密码强度策略

- 策略项：最小长度、大写/小写/数字/特殊字符要求，均可配（`SEC_PWD_*`）。
- 生效位置：个人中心修改密码（`ProfileService.changePassword`）。
- 工具：`common/utils/password.util.ts` 的 `validatePasswordStrength`。

> 注意：默认种子管理员密码 `admin123` 不满足新策略（缺大写），首次登录后请尽快改密；改密时需满足策略。种子写入走 Prisma 直写，不受策略拦截。

## 5. 会话策略（令牌失效）

- 用户表新增 `tokenVersion`，签发的 access/refresh 令牌内含 `ver`。
- `JwtStrategy` 校验 `payload.ver === user.tokenVersion`，不一致即 401（`tokenVersion` 随权限缓存一起缓存，避免额外查询）。
- 触发 `tokenVersion +1`（旧令牌全部失效）的场景：
  - 修改密码（`ProfileService.changePassword`）
  - 管理员强制下线（`MonitorService.forceLogout`，同时断开 WebSocket）
- 实现：`modules/auth/permission.service.ts` 的 `invalidateUserSessions`。

## 6. 配置项一览

见 `.env.example`「安全(P0 安全基线)」段：`SEC_LOGIN_*`、`SEC_PWD_*`、`SEC_MFA_*`、`SEC_RATE_LIMIT_*`。

## 7. 数据库变更

`sys_user` 新增字段：`mfaEnabled`、`mfaSecret`、`mfaBackupCodes`、`tokenVersion`、`pwdUpdatedAt`。
应用前需重新生成 Client 并同步表结构：

```bash
pnpm db:generate
pnpm db:push      # 或 pnpm db:migrate
```
