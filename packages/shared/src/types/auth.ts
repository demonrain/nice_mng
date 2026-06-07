export interface LoginPayload {
  username: string;
  password: string;
  captchaId?: string;
  captcha?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** 登录结果：直接发 token，或要求二次验证(MFA) */
export type LoginResult =
  | (TokenPair & { mfaRequired?: false })
  | { mfaRequired: true; mfaToken: string };

export interface JwtUserPayload {
  /** user id */
  sub: number;
  username: string;
  /** 是否超级管理员 */
  isSuperAdmin: boolean;
  /** 会话版本号，与用户 tokenVersion 比对，不一致即失效 */
  ver?: number;
}

/** MFA 绑定信息 */
export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  /** 二维码 dataURL(image/png) */
  qrcode: string;
}

export interface MfaStatus {
  enabled: boolean;
}

export interface ProfileInfo {
  id: number;
  username: string;
  nickname: string;
  avatar?: string | null;
  email?: string | null;
  phone?: string | null;
  deptId?: number | null;
  deptName?: string | null;
  roles: string[];
  /** 权限标识集合，如 ['system:user:add'] */
  permissions: string[];
}
