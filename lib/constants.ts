// 应用常量配置

/**
 * 默认头像URL
 * 用于邮箱注册用户的默认头像 环境变量里配置DEFAULT_AVATAR_URL  （否则使用dicebear生成的随机头像）"https://api.dicebear.com/7.x/avataaars/svg?seed=美女"
 */
export const DEFAULT_AVATAR_URL = process.env.DEFAULT_AVATAR_URL || "https://cdn4.winhlb.com/2025/06/17/68513a2e4c217.jpg";

/**
 * 邮箱验证码配置
 */
export const EMAIL_VERIFICATION = {
  // 验证码长度
  CODE_LENGTH: 6,
  // 验证码有效期（分钟）
  EXPIRE_MINUTES: 15,
  // 最大验证尝试次数
  MAX_ATTEMPTS: 5,
  // 发送频率限制（每分钟最多发送次数）
  RATE_LIMIT_PER_MINUTE: 3,
} as const;

/**
 * 密码配置
 */
export const PASSWORD_CONFIG = {
  // 最小长度（符合安全标准）
  MIN_LENGTH: 8,
  // bcrypt 盐值轮数
  SALT_ROUNDS: 12,
  // 密码复杂度要求（可选）
  REQUIRE_UPPERCASE: false, // 是否要求大写字母
  REQUIRE_LOWERCASE: false, // 是否要求小写字母
  REQUIRE_NUMBERS: false,   // 是否要求数字
  REQUIRE_SYMBOLS: false,   // 是否要求特殊字符
} as const;

/**
 * 用户配置
 */
export const USER_CONFIG = {
  // 昵称最小长度
  NICKNAME_MIN_LENGTH: 1,
  // 昵称最大长度
  NICKNAME_MAX_LENGTH: 50,
} as const;

/**
 * 邮件模板配置
 */
export const EMAIL_TEMPLATES = {
  // 验证码邮件主题前缀
  VERIFICATION_SUBJECT_PREFIX: "邮箱验证",
  // 欢迎邮件主题前缀
  WELCOME_SUBJECT_PREFIX: "欢迎加入",
} as const;
