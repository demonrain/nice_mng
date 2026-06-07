export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3000', 10),
  prefix: process.env.API_PREFIX || '/api',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '2h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '20', 10),
  },
  security: {
    // 登录失败锁定
    loginMaxFail: parseInt(process.env.SEC_LOGIN_MAX_FAIL || '5', 10),
    loginFailWindowMin: parseInt(process.env.SEC_LOGIN_FAIL_WINDOW_MIN || '15', 10),
    loginLockMin: parseInt(process.env.SEC_LOGIN_LOCK_MIN || '15', 10),
    // 密码策略
    pwdMinLength: parseInt(process.env.SEC_PWD_MIN_LENGTH || '8', 10),
    pwdRequireUpper: process.env.SEC_PWD_REQUIRE_UPPER !== 'false',
    pwdRequireLower: process.env.SEC_PWD_REQUIRE_LOWER !== 'false',
    pwdRequireNumber: process.env.SEC_PWD_REQUIRE_NUMBER !== 'false',
    pwdRequireSpecial: process.env.SEC_PWD_REQUIRE_SPECIAL === 'true',
    pwdExpireDays: parseInt(process.env.SEC_PWD_EXPIRE_DAYS || '0', 10), // 0=不过期
    // MFA 挑战令牌有效期
    mfaChallengeExpires: process.env.SEC_MFA_CHALLENGE_EXPIRES || '5m',
    mfaIssuer: process.env.SEC_MFA_ISSUER || 'nice-admin',
    // 限流默认值(每窗口请求数 / 窗口秒数)
    rateLimitDefault: parseInt(process.env.SEC_RATE_LIMIT_DEFAULT || '0', 10), // 0=默认不限流
    rateLimitWindowSec: parseInt(process.env.SEC_RATE_LIMIT_WINDOW_SEC || '60', 10),
  },
});
