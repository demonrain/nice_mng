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

export interface JwtUserPayload {
  /** user id */
  sub: number;
  username: string;
  /** 是否超级管理员 */
  isSuperAdmin: boolean;
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
