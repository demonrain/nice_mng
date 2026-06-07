export interface PasswordPolicy {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

/**
 * 校验密码是否满足强度策略。
 * @returns 不满足时返回错误信息数组；满足返回空数组。
 */
export function validatePasswordStrength(pwd: string, policy: PasswordPolicy): string[] {
  const errors: string[] = [];
  if (!pwd || pwd.length < policy.minLength) {
    errors.push(`密码长度至少 ${policy.minLength} 位`);
  }
  if (policy.requireUpper && !/[A-Z]/.test(pwd)) errors.push('需包含大写字母');
  if (policy.requireLower && !/[a-z]/.test(pwd)) errors.push('需包含小写字母');
  if (policy.requireNumber && !/[0-9]/.test(pwd)) errors.push('需包含数字');
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(pwd)) errors.push('需包含特殊字符');
  return errors;
}
