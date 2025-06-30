/**
 * 统一的邮箱验证工具
 * 提供一致的邮箱格式验证逻辑
 */

/**
 * 验证邮箱格式是否有效
 * @param email 要验证的邮箱地址
 * @returns 是否为有效的邮箱格式
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // 标准邮箱格式正则表达式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * 标准化邮箱地址（转小写并去除空格）
 * @param email 原始邮箱地址
 * @returns 标准化后的邮箱地址
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.toLowerCase().trim();
}

/**
 * 验证邮箱格式并抛出错误（如果无效）
 * @param email 要验证的邮箱地址
 * @param context 错误上下文信息（用于日志记录）
 * @throws Error 如果邮箱格式无效
 */
export function validateEmailOrThrow(email: string, context?: string): void {
  if (!isValidEmail(email)) {
    const errorMessage = context 
      ? `Invalid email format in ${context}` 
      : 'Invalid email format';
    throw new Error(errorMessage);
  }
}

/**
 * 验证邮箱格式并返回标准化的邮箱地址
 * @param email 要验证的邮箱地址
 * @returns 标准化后的邮箱地址，如果格式无效则返回 null
 */
export function validateAndNormalizeEmail(email: string): string | null {
  if (!isValidEmail(email)) {
    return null;
  }
  return normalizeEmail(email);
}
